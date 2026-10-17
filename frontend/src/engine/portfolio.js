// Portfolio engine. The portfolio is an append-only ledger of transactions, each stamped
// with the replay day it happened on. The state at any replay day is a pure fold of the
// ledger entries up to that day, so scrubbing backwards "un-happens" later trades and
// scrubbing forward replays them. All money is integer pennies (no float drift).

import { lineValuePennies, stockIndex } from "./market.js";

export const INITIAL_CASH_PENNIES = 100000 * 100; // £100,000
const SEED_STOCK_COUNT = 3;

/**
 * Same starting-portfolio rule as the old backend: the first three stocks, buying
 * ~£10,000 / £12,500 / £15,000 at the day-0 close (minimum 10 shares each).
 * Prices are now correctly converted pence -> pounds first.
 */
export function createSeedLedger(market) {
	const ledger = [];
	let picked = 0;
	for (let stock = 0; stock < market.stockCount && picked < SEED_STOCK_COUNT; stock += 1) {
		const units = market.prices[stock][0];
		if (!(units > 0)) continue;
		const openingPricePounds = units / 10000;
		const targetSpend = 10000 + picked * 2500;
		const quantity = Math.max(10, Math.floor(targetSpend / openingPricePounds));
		ledger.push({
			id: `seed-${market.tickers[stock]}`,
			type: "seed",
			ticker: market.tickers[stock],
			quantity,
			priceUnits: units,
			total: lineValuePennies(units, quantity),
			index: 0,
		});
		picked += 1;
	}
	return ledger;
}

function applyEntry(state, entry) {
	const holding = state.holdings.get(entry.ticker) ?? { ticker: entry.ticker, shares: 0, cost: 0 };
	if (entry.type === "seed" || entry.type === "buy") {
		state.cash -= entry.total;
		holding.shares += entry.quantity;
		holding.cost += entry.total;
		state.holdings.set(entry.ticker, holding);
	} else if (entry.type === "sell") {
		const costPortion = holding.shares === 0 ? 0 : Math.round((holding.cost * entry.quantity) / holding.shares);
		state.cash += entry.total;
		state.realised += entry.total - costPortion;
		holding.shares -= entry.quantity;
		holding.cost -= costPortion;
		if (holding.shares <= 0) state.holdings.delete(entry.ticker);
		else state.holdings.set(entry.ticker, holding);
	}
}

/** Cash + holdings after every ledger entry with index <= day. */
export function portfolioAt(ledger, day) {
	const state = { cash: INITIAL_CASH_PENNIES, realised: 0, holdings: new Map() };
	for (const entry of ledger) {
		if (entry.index > day) continue;
		applyEntry(state, entry);
	}
	return state;
}

/** Full valuation at `day` (holdings priced at that day's close). */
export function valuePortfolio(market, ledger, day) {
	const state = portfolioAt(ledger, day);
	const holdings = [];
	let holdingsValue = 0;
	for (const holding of state.holdings.values()) {
		const stock = stockIndex(market, holding.ticker);
		const units = stock >= 0 ? market.prices[stock][day] : 0;
		const marketValue = lineValuePennies(units, holding.shares);
		holdingsValue += marketValue;
		holdings.push({
			ticker: holding.ticker,
			name: stock >= 0 ? market.names[stock] : holding.ticker,
			shares: holding.shares,
			cost: holding.cost,
			averagePriceUnits: holding.shares ? (holding.cost * 100) / holding.shares : 0,
			priceUnits: units,
			marketValue,
			pnl: marketValue - holding.cost,
			pnlPct: holding.cost ? ((marketValue - holding.cost) / holding.cost) * 100 : 0,
		});
	}
	holdings.sort((a, b) => b.marketValue - a.marketValue);
	const totalValue = state.cash + holdingsValue;
	return {
		cash: state.cash,
		holdingsValue,
		totalValue,
		initialCash: INITIAL_CASH_PENNIES,
		pnl: totalValue - INITIAL_CASH_PENNIES,
		pnlPct: ((totalValue - INITIAL_CASH_PENNIES) / INITIAL_CASH_PENNIES) * 100,
		realised: state.realised,
		holdings,
	};
}

/**
 * Checks whether a trade can execute at `day`. Returns { ok, reason, total, quantity, max }.
 */
export function validateTrade(market, ledger, { side, ticker, quantity, day }) {
	const stock = stockIndex(market, ticker);
	const state = portfolioAt(ledger, day);
	const units = stock >= 0 ? market.prices[stock][day] : 0;
	const held = state.holdings.get(ticker)?.shares ?? 0;
	const max =
		side === "buy" ? (units > 0 ? Math.floor((state.cash * 100) / units) : 0) : held;
	const fail = (reason) => ({ ok: false, reason, total: 0, quantity: 0, max, units });

	if (stock < 0) return fail("Choose a stock first.");
	if (side !== "buy" && side !== "sell") return fail("Unknown order side.");
	const text = String(quantity ?? "").trim();
	if (!/^\d+$/.test(text)) return fail("Enter a whole number of shares.");
	const qty = Number.parseInt(text, 10);
	if (!Number.isSafeInteger(qty) || qty <= 0) return fail("Quantity must be at least 1.");
	if (!(units > 0)) return fail("No price available for this stock today.");

	const total = lineValuePennies(units, qty);
	if (side === "buy" && total > state.cash) {
		return { ...fail(`Not enough cash. You can afford up to ${max.toLocaleString("en-GB")} shares.`), total };
	}
	if (side === "sell" && held === 0) return { ...fail(`You don't hold any ${ticker}.`), total };
	if (side === "sell" && qty > held) {
		return { ...fail(`You only hold ${held.toLocaleString("en-GB")} shares.`), total };
	}
	return { ok: true, reason: "", total, quantity: qty, max, units };
}

let tradeCounter = 0;

/**
 * Executes a trade at `day`. Entries dated after `day` belong to a timeline the user has
 * rewound past; they are discarded so the new trade can't be invalidated by them.
 * Returns { ledger, entry, discarded } or throws with a user-facing message.
 */
export function executeTrade(market, ledger, { side, ticker, quantity, day }) {
	const check = validateTrade(market, ledger, { side, ticker, quantity, day });
	if (!check.ok) throw new Error(check.reason);
	tradeCounter += 1;
	const entry = {
		id: `t-${Date.now().toString(36)}-${tradeCounter}`,
		type: side,
		ticker,
		quantity: check.quantity,
		priceUnits: check.units,
		total: check.total,
		index: day,
	};
	const kept = ledger.filter((item) => item.index <= day);
	return { ledger: [...kept, entry], entry, discarded: ledger.length - kept.length };
}

/** Portfolio value (pennies) for every day 0..day. Linear sweep over the ledger. */
export function equityCurve(market, ledger, day) {
	const entries = ledger
		.filter((entry) => entry.index <= day)
		.map((entry, order) => ({ entry, order }))
		.sort((a, b) => a.entry.index - b.entry.index || a.order - b.order)
		.map(({ entry }) => entry);
	const state = { cash: INITIAL_CASH_PENNIES, realised: 0, holdings: new Map() };
	const values = new Float64Array(day + 1);
	let pointer = 0;
	let positions = [];
	for (let d = 0; d <= day; d += 1) {
		let changed = false;
		while (pointer < entries.length && entries[pointer].index <= d) {
			applyEntry(state, entries[pointer]);
			pointer += 1;
			changed = true;
		}
		if (changed || d === 0) {
			positions = [...state.holdings.values()].map((holding) => ({
				series: market.prices[stockIndex(market, holding.ticker)],
				shares: holding.shares,
			}));
		}
		let total = state.cash;
		for (const position of positions) {
			if (position.series) total += lineValuePennies(position.series[d], position.shares);
		}
		values[d] = total;
	}
	return values;
}
