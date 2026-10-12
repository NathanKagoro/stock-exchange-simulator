// In-memory market: meta (dates/tickers/names) plus one Int32Array of prices per stock.
// Prices are integer units of 1/100 pence; 10,000 units = £1.

import { decodeChunk } from "./codec.js";

export const UNITS_PER_POUND = 10000;

export function createMarket(meta) {
	const dayCount = meta.dates.length;
	const stockCount = meta.tickers.length;
	const indexByTicker = new Map(meta.tickers.map((ticker, index) => [ticker, index]));
	return {
		dates: meta.dates,
		tickers: meta.tickers,
		names: meta.names,
		chunks: meta.chunks,
		dayCount,
		stockCount,
		indexByTicker,
		prices: Array.from({ length: stockCount }, () => new Int32Array(dayCount)),
		// Number of leading days whose prices have been decoded (chunks load in order).
		loadedDays: 0,
		loadedChunks: new Set(),
	};
}

/** Decodes an uncompressed chunk into the market and advances loadedDays when contiguous. */
export function ingestChunk(market, chunk, bytes) {
	decodeChunk(bytes, market.stockCount, chunk.count, market.prices, chunk.start);
	market.loadedChunks.add(chunk.start);
	let loaded = 0;
	for (const candidate of market.chunks) {
		if (!market.loadedChunks.has(candidate.start)) break;
		loaded = candidate.start + candidate.count;
	}
	market.loadedDays = loaded;
	return market.loadedDays;
}

export function stockIndex(market, ticker) {
	return market.indexByTicker.get(ticker) ?? -1;
}

export function priceUnits(market, stock, day) {
	return market.prices[stock][day];
}

/** Value in integer pennies of `quantity` shares at `units` per share. */
export function lineValuePennies(units, quantity) {
	return Math.round((units * quantity) / 100);
}

let snapshotCache = { market: null, day: -1, value: null };

/**
 * Per-stock figures at `day` for every stock (cheap: ~1.3k stocks).
 * Returns typed arrays indexed by stock.
 */
export function marketSnapshot(market, day) {
	if (snapshotCache.market === market && snapshotCache.day === day) {
		return snapshotCache.value;
	}
	const count = market.stockCount;
	const price = new Int32Array(count);
	const change = new Int32Array(count);
	const changePct = new Float64Array(count);
	const previousDay = Math.max(0, day - 1);
	for (let stock = 0; stock < count; stock += 1) {
		const series = market.prices[stock];
		const now = series[day];
		const before = series[previousDay];
		price[stock] = now;
		change[stock] = now - before;
		changePct[stock] = before === 0 ? 0 : ((now - before) / before) * 100;
	}
	const value = { day, price, change, changePct };
	snapshotCache = { market, day, value };
	return value;
}

/** Plain array of closes in £ for a stock between [from, to] inclusive. */
export function seriesPounds(market, stock, from, to) {
	const series = market.prices[stock];
	const out = [];
	for (let day = Math.max(0, from); day <= to; day += 1) {
		out.push(series[day] / UNITS_PER_POUND);
	}
	return out;
}
