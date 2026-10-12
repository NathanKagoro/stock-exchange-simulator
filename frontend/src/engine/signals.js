// Momentum signals: simple N-day % change computed across every stock.
// This is a toy rule for a replay game, not investment advice.

export const MOMENTUM_LOOKBACK = 7; // trading days
export const MOMENTUM_THRESHOLD = 4; // percent
// Ignore sub-5p quotes: one-tick moves on penny stocks swamp the list with noise.
export const MIN_PRICE_UNITS = 500;

export function momentum(series, day, lookback = MOMENTUM_LOOKBACK) {
	if (day < lookback) return null;
	const before = series[day - lookback];
	const now = series[day];
	if (!(before > 0)) return null;
	return ((now - before) / before) * 100;
}

export function classifyMomentum(change) {
	if (change === null || change === undefined) return "hold";
	if (change >= MOMENTUM_THRESHOLD) return "buy";
	if (change <= -MOMENTUM_THRESHOLD) return "sell";
	return "hold";
}

/**
 * Strongest rising and falling stocks at `day` across the whole market.
 * @returns {{ rising: Signal[], falling: Signal[], scanned: number }}
 */
export function momentumSignals(market, day, { limit = 5, lookback = MOMENTUM_LOOKBACK } = {}) {
	const all = [];
	for (let stock = 0; stock < market.stockCount; stock += 1) {
		const series = market.prices[stock];
		if (series[day] < MIN_PRICE_UNITS) continue;
		const change = momentum(series, day, lookback);
		if (change === null || change === 0) continue;
		all.push({
			ticker: market.tickers[stock],
			name: market.names[stock],
			change,
			priceUnits: series[day],
			action: classifyMomentum(change),
		});
	}
	const rising = all.filter((s) => s.action === "buy").sort((a, b) => b.change - a.change).slice(0, limit);
	const falling = all.filter((s) => s.action === "sell").sort((a, b) => a.change - b.change).slice(0, limit);
	return { rising, falling, scanned: all.length, lookback };
}
