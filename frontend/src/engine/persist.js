// localStorage persistence. Every access is guarded: storage can be missing, full or
// blocked (private mode, sandboxed iframes) and the app must still work without it.

const KEY = "lse-replay:v2";

export function loadSaved() {
	try {
		const raw = globalThis.localStorage?.getItem(KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
}

export function save(state) {
	try {
		globalThis.localStorage?.setItem(KEY, JSON.stringify(state));
	} catch {
		// Ignore quota / privacy errors; persistence is best-effort.
	}
}

export function clearSaved() {
	try {
		globalThis.localStorage?.removeItem(KEY);
	} catch {
		// ignore
	}
}

/** Keeps only well-formed user trades for tickers that still exist. */
export function sanitizeTrades(trades, market) {
	if (!Array.isArray(trades)) return [];
	return trades.filter(
		(t) =>
			t &&
			(t.type === "buy" || t.type === "sell") &&
			market.indexByTicker.has(t.ticker) &&
			Number.isSafeInteger(t.quantity) &&
			t.quantity > 0 &&
			Number.isSafeInteger(t.index) &&
			t.index >= 0 &&
			t.index < market.dayCount &&
			Number.isFinite(t.total) &&
			Number.isFinite(t.priceUnits)
	);
}
