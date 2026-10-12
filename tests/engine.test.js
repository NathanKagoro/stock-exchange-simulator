import { describe, expect, it } from "vitest";
import { decodeChunk, encodeChunk, penceToUnits } from "../frontend/src/engine/codec.js";
import { lttb } from "../frontend/src/engine/downsample.js";
import { formatMoney, formatPercent, formatPrice } from "../frontend/src/engine/format.js";
import { createMarket, ingestChunk, marketSnapshot } from "../frontend/src/engine/market.js";
import {
	INITIAL_CASH_PENNIES,
	createSeedLedger,
	equityCurve,
	executeTrade,
	validateTrade,
	valuePortfolio,
} from "../frontend/src/engine/portfolio.js";
import { searchStocks, sortStocks } from "../frontend/src/engine/search.js";
import { classifyMomentum, momentum, momentumSignals } from "../frontend/src/engine/signals.js";

/** Builds an in-memory market from pence price arrays (one per stock). */
function makeMarket(pricesPence, tickers) {
	const days = pricesPence[0].length;
	const dates = Array.from({ length: days }, (_, i) => `2020-01-${String(i + 1).padStart(2, "0")}`);
	const meta = {
		dates,
		tickers: tickers ?? pricesPence.map((_, i) => `S${i}`),
		names: (tickers ?? pricesPence.map((_, i) => `S${i}`)).map((t) => `${t} PLC`),
		chunks: [{ start: 0, count: days, file: "x" }],
	};
	const market = createMarket(meta);
	const bytes = encodeChunk(pricesPence.map((series) => series.map(penceToUnits)));
	ingestChunk(market, meta.chunks[0], bytes);
	return market;
}

describe("codec", () => {
	it("round-trips positive, negative, large and repeated values", () => {
		const series = [
			[22272, 22258, 22258, 22356, 1, 796874000, 0, 0],
			[5, 5, 5, 5, 5, 5, 5, 5],
			[1000000, 999999, 1000001, 3, 2812496, 0, 17, 18],
		];
		const decoded = decodeChunk(encodeChunk(series), 3, 8);
		expect(decoded.map((a) => Array.from(a))).toEqual(series);
	});

	it("decodes into an offset window of a larger buffer", () => {
		const out = [new Int32Array(6), new Int32Array(6)];
		decodeChunk(encodeChunk([[1, 2, 3], [4, 5, 6]]), 2, 3, out, 3);
		expect(Array.from(out[0])).toEqual([0, 0, 0, 1, 2, 3]);
		expect(Array.from(out[1])).toEqual([0, 0, 0, 4, 5, 6]);
	});

	it("rejects truncated input", () => {
		const bytes = encodeChunk([[300, 400, 500]]);
		expect(() => decodeChunk(bytes, 1, 2)).toThrow(/mismatch/);
	});

	it("converts pence to integer units exactly", () => {
		expect(penceToUnits(222.72)).toBe(22272);
		expect(penceToUnits(0.01)).toBe(1);
		expect(penceToUnits(1084.73)).toBe(108473);
	});
});

describe("portfolio", () => {
	// S0 = 200p (£2), S1 = 1000p (£10), S2 = 50p, S3 = 500p
	const market = makeMarket([
		[200, 210, 220, 180, 200, 200, 200, 230],
		[1000, 1000, 1100, 1200, 1200, 1200, 1200, 1200],
		[50, 50, 50, 50, 50, 50, 50, 50],
		[500, 400, 300, 200, 100, 100, 100, 100],
	]);

	it("seeds the first three stocks like the old backend, in pounds", () => {
		const seed = createSeedLedger(market);
		expect(seed.map((e) => e.ticker)).toEqual(["S0", "S1", "S2"]);
		// £10,000 / £2 = 5,000 shares; £12,500 / £10 = 1,250; £15,000 / £0.50 = 30,000
		expect(seed.map((e) => e.quantity)).toEqual([5000, 1250, 30000]);
		expect(seed.map((e) => e.total)).toEqual([1000000, 1250000, 1500000]);
		const v = valuePortfolio(market, seed, 0);
		expect(v.cash).toBe(INITIAL_CASH_PENNIES - 3750000);
		expect(v.totalValue).toBe(INITIAL_CASH_PENNIES);
		expect(v.pnl).toBe(0);
	});

	it("buys at the replay-day close and debits cash in pennies", () => {
		const { ledger, entry } = executeTrade(market, [], { side: "buy", ticker: "S3", quantity: "7", day: 2 });
		expect(entry.total).toBe(2100); // 7 x 300p = £21.00
		const v = valuePortfolio(market, ledger, 2);
		expect(v.cash).toBe(INITIAL_CASH_PENNIES - 2100);
		expect(v.holdings[0]).toMatchObject({ ticker: "S3", shares: 7, marketValue: 2100, pnl: 0 });
	});

	it("computes unrealised and realised P&L with average cost", () => {
		let ledger = [];
		ledger = executeTrade(market, ledger, { side: "buy", ticker: "S0", quantity: 100, day: 0 }).ledger; // £200
		ledger = executeTrade(market, ledger, { side: "buy", ticker: "S0", quantity: 100, day: 2 }).ledger; // £220
		let v = valuePortfolio(market, ledger, 3); // price 180p
		expect(v.holdings[0].cost).toBe(42000);
		expect(v.holdings[0].averagePriceUnits).toBe(21000); // 210p
		expect(v.holdings[0].pnl).toBe(36000 - 42000);
		expect(v.pnl).toBe(-6000);

		ledger = executeTrade(market, ledger, { side: "sell", ticker: "S0", quantity: 50, day: 7 }).ledger; // 230p
		v = valuePortfolio(market, ledger, 7);
		expect(v.realised).toBe(50 * 230 - 50 * 210);
		expect(v.holdings[0].shares).toBe(150);
		expect(v.holdings[0].cost).toBe(31500);
		expect(v.totalValue).toBe(INITIAL_CASH_PENNIES + 200 * (230 - 210));
	});

	it("rejects buys beyond available cash and reports the max", () => {
		const check = validateTrade(market, [], { side: "buy", ticker: "S1", quantity: "10001", day: 0 });
		expect(check.ok).toBe(false);
		expect(check.max).toBe(10000); // £100,000 / £10
		expect(check.reason).toMatch(/Not enough cash/);
		expect(() => executeTrade(market, [], { side: "buy", ticker: "S1", quantity: 10001, day: 0 })).toThrow(/Not enough cash/);
		expect(validateTrade(market, [], { side: "buy", ticker: "S1", quantity: "10000", day: 0 }).ok).toBe(true);
	});

	it("rejects selling shares you don't hold", () => {
		expect(validateTrade(market, [], { side: "sell", ticker: "S0", quantity: "1", day: 0 }).reason).toMatch(/don't hold/);
		const { ledger } = executeTrade(market, [], { side: "buy", ticker: "S0", quantity: 5, day: 0 });
		const check = validateTrade(market, ledger, { side: "sell", ticker: "S0", quantity: "6", day: 1 });
		expect(check.ok).toBe(false);
		expect(check.max).toBe(5);
		expect(check.reason).toMatch(/only hold 5/);
	});

	it("rejects non-integer and non-positive quantities", () => {
		for (const q of ["", "0", "-3", "1.5", "abc", "1e3"]) {
			expect(validateTrade(market, [], { side: "buy", ticker: "S0", quantity: q, day: 0 }).ok).toBe(false);
		}
	});

	it("ignores trades dated after the replay day and drops them when rewriting history", () => {
		let { ledger } = executeTrade(market, [], { side: "buy", ticker: "S0", quantity: 10, day: 5 });
		expect(valuePortfolio(market, ledger, 3).holdings).toHaveLength(0);
		const result = executeTrade(market, ledger, { side: "buy", ticker: "S1", quantity: 1, day: 2 });
		expect(result.discarded).toBe(1);
		expect(result.ledger.map((e) => e.ticker)).toEqual(["S1"]);
	});

	it("builds an equity curve that matches point valuations", () => {
		let ledger = createSeedLedger(market);
		ledger = executeTrade(market, ledger, { side: "buy", ticker: "S3", quantity: 10, day: 1 }).ledger;
		ledger = executeTrade(market, ledger, { side: "sell", ticker: "S0", quantity: 1000, day: 4 }).ledger;
		const curve = equityCurve(market, ledger, 7);
		for (let d = 0; d <= 7; d += 1) {
			expect(curve[d]).toBe(valuePortfolio(market, ledger, d).totalValue);
		}
	});
});

describe("momentum signals", () => {
	const market = makeMarket([
		[100, 100, 100, 100, 100, 100, 100, 100, 110], // +10% over 7 days at day 8 (from day 1)
		[100, 100, 100, 100, 100, 100, 100, 100, 95], // -5%
		[100, 100, 100, 100, 100, 100, 100, 100, 102], // +2% -> hold
		[2, 2, 2, 2, 2, 2, 2, 2, 3], // penny-stock noise (+50% on 2p), ignored
	]);

	it("computes N-day % change and classifies it", () => {
		expect(momentum(market.prices[0], 8)).toBeCloseTo(10);
		expect(momentum(market.prices[0], 3)).toBeNull();
		expect(classifyMomentum(10)).toBe("buy");
		expect(classifyMomentum(-5)).toBe("sell");
		expect(classifyMomentum(2)).toBe("hold");
		expect(classifyMomentum(null)).toBe("hold");
	});

	it("ranks risers and fallers across every stock", () => {
		const signals = momentumSignals(market, 8);
		expect(signals.rising.map((s) => s.ticker)).toEqual(["S0"]);
		expect(signals.falling.map((s) => s.ticker)).toEqual(["S1"]);
		expect(signals.rising[0].change).toBeCloseTo(10);
		expect(signals.scanned).toBe(3);
	});
});

describe("discovery", () => {
	const market = makeMarket(
		[
			[100, 110],
			[100, 90],
			[100, 101],
		],
		["BARC", "VOD", "AZN"]
	);

	it("searches ticker prefix before name substring", () => {
		expect(searchStocks(market, "vo").map((i) => market.tickers[i])).toEqual(["VOD"]);
		expect(searchStocks(market, "plc")).toHaveLength(3);
		expect(searchStocks(market, "zzz")).toHaveLength(0);
	});

	it("sorts by gainers, losers and movers", () => {
		const snap = marketSnapshot(market, 1);
		const order = (sort) => sortStocks([0, 1, 2], sort, snap, market).map((i) => market.tickers[i]);
		expect(order("gainers")).toEqual(["BARC", "AZN", "VOD"]);
		expect(order("losers")).toEqual(["VOD", "AZN", "BARC"]);
		expect(order("movers")[2]).toBe("AZN");
		expect(order("az")).toEqual(["AZN", "BARC", "VOD"]);
	});
});

describe("formatting", () => {
	it("formats money with separators and a true minus sign", () => {
		expect(formatMoney(10000000)).toBe("£100,000.00");
		expect(formatMoney(-500)).toBe("−£5.00");
		expect(formatMoney(123456, { showPlus: true })).toBe("+£1,234.56");
	});

	it("shows prices in pounds, or pence below £1", () => {
		expect(formatPrice(22272 * 1)).toBe("£2.23");
		expect(formatPrice(4550)).toBe("45.50p");
		expect(formatPrice(108473)).toBe("£10.85");
	});

	it("formats percentages", () => {
		expect(formatPercent(3.456)).toBe("+3.46%");
		expect(formatPercent(-1.2)).toBe("−1.20%");
	});
});

describe("lttb", () => {
	it("keeps endpoints and reduces to the threshold", () => {
		const points = Array.from({ length: 2000 }, (_, x) => ({ x, y: Math.sin(x / 50) }));
		const out = lttb(points, 400);
		expect(out).toHaveLength(400);
		expect(out[0]).toBe(points[0]);
		expect(out[399]).toBe(points[1999]);
	});

	it("returns short input unchanged", () => {
		const points = [{ x: 0, y: 1 }, { x: 1, y: 2 }];
		expect(lttb(points, 400)).toBe(points);
	});
});
