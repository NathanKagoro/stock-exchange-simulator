#!/usr/bin/env node
// Build-time data step: turns the 41 MB wide CSV into small static files the browser
// can stream (frontend/public/data/). Runs automatically before `vite build` / `vite`.
//
//   meta.json          dates, tickers, names, chunk index (~40 KB gzipped)
//   prices-YYYY.bin    gzip(varint delta-encoded prices) for one calendar year
//
// Outputs are git-ignored: generation takes ~5 s so it is cheaper to rebuild than to
// commit binary blobs. Pass --force to regenerate even when outputs look fresh.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { encodeChunk, penceToUnits } from "../frontend/src/engine/codec.js";
import { parseMarketCsv } from "./lib/parseCsv.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
export const CSV_PATH = path.join(root, "data/raw/historical_stock_prices_2015_2025.csv");
export const OUT_DIR = path.join(root, "frontend/public/data");
export const FORMAT_VERSION = 1;

export function buildDataset(csvText) {
	const { dates, stocks } = parseMarketCsv(csvText);
	const units = stocks.map((stock) => stock.closes.map(penceToUnits));

	// Group trading days by calendar year so the first chunk (2015) is tiny.
	const chunks = [];
	dates.forEach((date, index) => {
		const year = Number(date.slice(0, 4));
		const last = chunks[chunks.length - 1];
		if (last && last.year === year) {
			last.count += 1;
		} else {
			chunks.push({ year, start: index, count: 1 });
		}
	});

	const files = chunks.map((chunk) => {
		const raw = encodeChunk(units.map((series) => series.slice(chunk.start, chunk.start + chunk.count)));
		const gz = zlib.gzipSync(raw, { level: 9 });
		const hash = crypto.createHash("sha1").update(gz).digest("hex").slice(0, 10);
		return { ...chunk, file: `prices-${chunk.year}.bin`, hash, bytes: gz.length, data: gz };
	});

	const meta = {
		format: FORMAT_VERSION,
		unitsPerPound: 10000,
		currency: "GBP",
		source: "London Stock Exchange daily closes (quoted in pence)",
		dates,
		tickers: stocks.map((stock) => stock.ticker),
		names: stocks.map((stock) => stock.name),
		chunks: files.map(({ data: _data, ...chunk }) => chunk),
	};

	return { meta, files, stocks };
}

function isFresh() {
	const metaPath = path.join(OUT_DIR, "meta.json");
	if (!fs.existsSync(metaPath)) return false;
	const builtAt = fs.statSync(metaPath).mtimeMs;
	const inputs = [CSV_PATH, fileURLToPath(import.meta.url), path.join(here, "lib/parseCsv.mjs"), path.join(root, "frontend/src/engine/codec.js")];
	if (inputs.some((input) => fs.statSync(input).mtimeMs > builtAt)) return false;
	try {
		const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
		return meta.format === FORMAT_VERSION && meta.chunks.every((chunk) => fs.existsSync(path.join(OUT_DIR, chunk.file)));
	} catch {
		return false;
	}
}

function main() {
	const force = process.argv.includes("--force");
	if (!force && isFresh()) {
		console.log("[build-data] frontend/public/data is up to date");
		return;
	}
	if (!fs.existsSync(CSV_PATH)) {
		throw new Error(`Missing source CSV at ${CSV_PATH}`);
	}

	const startedAt = Date.now();
	const { meta, files } = buildDataset(fs.readFileSync(CSV_PATH, "utf8"));

	fs.rmSync(OUT_DIR, { recursive: true, force: true });
	fs.mkdirSync(OUT_DIR, { recursive: true });
	for (const file of files) {
		fs.writeFileSync(path.join(OUT_DIR, file.file), file.data);
	}
	fs.writeFileSync(path.join(OUT_DIR, "meta.json"), JSON.stringify(meta));

	const total = files.reduce((sum, file) => sum + file.bytes, 0);
	console.log(
		`[build-data] ${meta.tickers.length} stocks x ${meta.dates.length} days -> ${files.length} chunks, ` +
			`${(total / 1024).toFixed(0)} KB prices + ${(fs.statSync(path.join(OUT_DIR, "meta.json")).size / 1024).toFixed(0)} KB meta ` +
			`in ${((Date.now() - startedAt) / 1000).toFixed(1)} s`
	);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
