// Round-trip test: the static data files decode back to exactly the values in the CSV.
// Parses the real CSV once (~4 s) and compares against a few hand-checked cells.

import fs from "node:fs";
import zlib from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { buildDataset, CSV_PATH } from "../scripts/build-data.mjs";
import { buildTicker } from "../scripts/lib/parseCsv.mjs";
import { createMarket, ingestChunk } from "../frontend/src/engine/market.js";

let dataset;
let market;

beforeAll(() => {
	dataset = buildDataset(fs.readFileSync(CSV_PATH, "utf8"));
	market = createMarket(dataset.meta);
	for (const file of dataset.files) {
		ingestChunk(market, file, zlib.gunzipSync(file.data));
	}
}, 60000);

describe("build-data", () => {
	it("keeps the same stock universe and calendar", () => {
		expect(dataset.meta.tickers).toHaveLength(1277);
		expect(dataset.meta.dates).toHaveLength(2525);
		expect(dataset.meta.dates[0]).toBe("2015-04-01");
		expect(dataset.meta.dates.at(-1)).toBe("2025-03-28");
		expect(new Set(dataset.meta.tickers).size).toBe(1277);
		expect(dataset.meta.chunks[0]).toMatchObject({ year: 2015, start: 0, count: 190 });
		expect(market.loadedDays).toBe(2525);
	});

	it("derives tickers with the original backend rule", () => {
		expect(dataset.meta.tickers.slice(0, 3)).toEqual(["1SP", "3II", "450"]);
		expect(dataset.meta.names[1]).toBe("3I INFRASTRUCTURE PLC");
		const used = new Set();
		expect(buildTicker("THE CITY OF LONDON INVESTMENT TRUST PLC", 0, used)).toBe("CITOL");
		expect(buildTicker("THE CITY OF LONDON INVESTMENT TRUST PLC", 0, used)).toBe("CITOL2");
	});

	it("decodes back to the exact CSV closes (pence, 2dp)", () => {
		// 3i Infrastructure: first raw cells 222.7194366..., 222.5792236...
		const infra = market.indexByTicker.get("3II");
		expect(market.prices[infra][0]).toBe(22272);
		expect(market.prices[infra][1]).toBe(22258);
		// Every stock, every day, matches the parsed CSV.
		for (let s = 0; s < dataset.stocks.length; s += 1) {
			const closes = dataset.stocks[s].closes;
			const decoded = market.prices[s];
			for (let d = 0; d < closes.length; d += 1) {
				if (decoded[d] !== Math.round(closes[d] * 100)) {
					throw new Error(`Mismatch ${dataset.stocks[s].ticker} day ${d}: ${decoded[d]} vs ${closes[d]}`);
				}
			}
		}
	});

	it("refuses to trade a stock whose rounded close is 0p", async () => {
		// The original 2dp rounding turns a few sub-0.005p quotes into 0; keep them, but never trade at £0.
		const { validateTrade } = await import("../frontend/src/engine/portfolio.js");
		let stock = -1;
		let day = -1;
		for (let s = 0; s < market.stockCount && stock < 0; s += 1) {
			const d = market.prices[s].indexOf(0);
			if (d >= 0) [stock, day] = [s, d];
		}
		expect(stock).toBeGreaterThanOrEqual(0);
		const check = validateTrade(market, [], { side: "buy", ticker: market.tickers[stock], quantity: "1", day });
		expect(check.ok).toBe(false);
		expect(check.reason).toMatch(/No price/);
	});
});
