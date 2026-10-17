// Stock discovery helpers: text search and sort orders over the whole market.

const lowerCache = new WeakMap();

function lowered(market) {
	let cached = lowerCache.get(market);
	if (!cached) {
		cached = {
			tickers: market.tickers.map((t) => t.toLowerCase()),
			names: market.names.map((n) => n.toLowerCase()),
		};
		lowerCache.set(market, cached);
	}
	return cached;
}

/** Stock indices matching `query` by ticker or name. Ticker-prefix matches rank first. */
export function searchStocks(market, query, limit = Infinity) {
	const q = query.trim().toLowerCase();
	const all = Array.from({ length: market.stockCount }, (_, i) => i);
	if (!q) return all.slice(0, limit);
	const { tickers, names } = lowered(market);
	const scored = [];
	for (const i of all) {
		let score = -1;
		if (tickers[i] === q) score = 0;
		else if (tickers[i].startsWith(q)) score = 1;
		else if (names[i].startsWith(q)) score = 2;
		else if (names[i].includes(` ${q}`)) score = 3;
		else if (names[i].includes(q) || tickers[i].includes(q)) score = 4;
		if (score >= 0) scored.push([score, i]);
	}
	scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	return scored.slice(0, limit).map(([, i]) => i);
}

export const SORTS = [
	{ id: "az", label: "A to Z" },
	{ id: "gainers", label: "Top gainers" },
	{ id: "losers", label: "Top losers" },
	{ id: "movers", label: "Biggest movers" },
];

/** Sorts stock indices in place by the chosen order using a market snapshot. */
export function sortStocks(indices, sort, snapshot, market) {
	const pct = snapshot.changePct;
	const byName = (a, b) => market.names[a].localeCompare(market.names[b]);
	switch (sort) {
		case "gainers":
			return indices.sort((a, b) => pct[b] - pct[a] || byName(a, b));
		case "losers":
			return indices.sort((a, b) => pct[a] - pct[b] || byName(a, b));
		case "movers":
			return indices.sort((a, b) => Math.abs(pct[b]) - Math.abs(pct[a]) || byName(a, b));
		default:
			return indices.sort(byName);
	}
}
