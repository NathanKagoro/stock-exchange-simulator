// Global app state (Zustand). Components subscribe to small slices via selectors,
// e.g. `useAppStore((s) => s.day)`, and call the plain `actions` object for updates so
// they never re-render because an unrelated field changed.

import { create } from "zustand";
import { loadMarket } from "../engine/loader";
import { createSeedLedger, executeTrade, validateTrade } from "../engine/portfolio";
import { clearSaved, loadSaved, sanitizeTrades, save } from "../engine/persist";
import { formatMoney } from "../engine/format";

export const PACES = [
	{ id: "day", label: "1 day", short: "1D", days: 1 },
	{ id: "week", label: "1 week", short: "1W", days: 5 },
	{ id: "month", label: "1 month", short: "1M", days: 21 },
];
export const TICK_MS = 200;

export const useAppStore = create(() => ({
	status: "loading", // loading | ready | error
	error: null,
	market: null, // engine market; reference is stable once loaded
	loadedDays: 0, // bumps as background chunks arrive
	day: 0,
	isPlaying: false,
	pace: "day",
	selectedTicker: "",
	ledger: [], // seed entries + user trades, see engine/portfolio.js
	watchlist: [],
	toast: null, // { id, kind, message }
}));

const get = useAppStore.getState;
const set = useAppStore.setState;

function maxPlayableDay() {
	const { market, loadedDays } = get();
	if (!market) return 0;
	return Math.max(0, Math.min(market.dayCount, loadedDays) - 1);
}

let toastTimer;
function showToast(kind, message) {
	window.clearTimeout(toastTimer);
	const toast = { id: Date.now(), kind, message };
	set({ toast });
	toastTimer = window.setTimeout(() => {
		if (get().toast?.id === toast.id) set({ toast: null });
	}, 3500);
}

function persist() {
	const { status, day, pace, selectedTicker, ledger, watchlist } = get();
	if (status !== "ready") return;
	save({
		day,
		pace,
		selectedTicker,
		watchlist,
		trades: ledger.filter((entry) => entry.type !== "seed"),
	});
}

// Debounced so playback doesn't write to storage on every tick.
let persistTimer;
useAppStore.subscribe((state, previous) => {
	if (
		state.day === previous.day &&
		state.ledger === previous.ledger &&
		state.watchlist === previous.watchlist &&
		state.pace === previous.pace &&
		state.selectedTicker === previous.selectedTicker
	) {
		return;
	}
	window.clearTimeout(persistTimer);
	persistTimer = window.setTimeout(persist, state.isPlaying ? 1000 : 150);
});
if (typeof window !== "undefined") {
	window.addEventListener("pagehide", persist);
}

export const actions = {
	async init() {
		if (get().market) return;
		const saved = loadSaved();
		try {
			const { market, background } = await loadMarket({
				untilDay: Number.isSafeInteger(saved?.day) ? saved.day : 0,
				onProgress: (m) => set({ loadedDays: m.loadedDays }),
			});
			background.catch((error) => set({ error: `Some later years failed to load: ${error.message}` }));

			const trades = sanitizeTrades(saved?.trades, market);
			const day = Math.min(Math.max(0, saved?.day ?? 0), market.loadedDays - 1);
			const selectedTicker = market.indexByTicker.has(saved?.selectedTicker)
				? saved.selectedTicker
				: market.tickers[0];
			set({
				status: "ready",
				market,
				loadedDays: market.loadedDays,
				day,
				pace: PACES.some((p) => p.id === saved?.pace) ? saved.pace : "day",
				selectedTicker,
				ledger: [...createSeedLedger(market), ...trades],
				watchlist: Array.isArray(saved?.watchlist)
					? saved.watchlist.filter((t) => market.indexByTicker.has(t))
					: [],
			});
		} catch (error) {
			set({ status: "error", error: error.message });
		}
	},
	play() {
		if (get().day >= (get().market?.dayCount ?? 1) - 1) set({ day: 0 });
		set({ isPlaying: true });
	},
	pause() {
		set({ isPlaying: false });
	},
	togglePlay() {
		if (get().isPlaying) actions.pause();
		else actions.play();
	},
	setPace(pace) {
		set({ pace });
	},
	/** Moves by `delta` days, clamped to loaded data. Returns false when it couldn't move. */
	step(delta) {
		const { day } = get();
		const next = Math.max(0, Math.min(maxPlayableDay(), day + delta));
		if (next === day) return false;
		set({ day: next });
		return true;
	},
	jump(index) {
		const next = Math.max(0, Math.min(maxPlayableDay(), Math.round(index)));
		if (next !== get().day) set({ day: next });
	},
	reset() {
		const { market } = get();
		if (!market) return;
		set({ isPlaying: false, day: 0, ledger: createSeedLedger(market) });
		showToast("info", "Replay reset — back to day one with £100,000.");
	},
	selectTicker(ticker) {
		if (get().market?.indexByTicker.has(ticker)) set({ selectedTicker: ticker });
	},
	toggleWatch(ticker) {
		const { watchlist } = get();
		set({
			watchlist: watchlist.includes(ticker) ? watchlist.filter((t) => t !== ticker) : [...watchlist, ticker],
		});
	},
	validate(side, quantity) {
		const { market, ledger, day, selectedTicker } = get();
		if (!market) return { ok: false, reason: "Loading…", max: 0, total: 0 };
		return validateTrade(market, ledger, { side, ticker: selectedTicker, quantity, day });
	},
	trade(side, quantity) {
		const { market, ledger, day, selectedTicker } = get();
		try {
			const result = executeTrade(market, ledger, { side, ticker: selectedTicker, quantity, day });
			set({ ledger: result.ledger });
			const verb = side === "buy" ? "Bought" : "Sold";
			const extra = result.discarded
				? ` (${result.discarded} later trade${result.discarded === 1 ? "" : "s"} from the rewound future removed)`
				: "";
			showToast(
				"success",
				`${verb} ${result.entry.quantity.toLocaleString("en-GB")} ${selectedTicker} for ${formatMoney(result.entry.total)}${extra}`
			);
			return true;
		} catch (error) {
			showToast("error", error.message);
			return false;
		}
	},
	dismissToast() {
		set({ toast: null });
	},
	clearSavedData() {
		clearSaved();
	},
};

/** Fixed-rate playback driven by requestAnimationFrame (no timers piling up). */
export function startPlaybackLoop() {
	let frame = 0;
	let last = 0;
	let carry = 0;
	const loop = (now) => {
		const { isPlaying, pace, market, day } = get();
		if (isPlaying && market) {
			if (!last) last = now;
			carry += now - last;
			last = now;
			// Cap catch-up after a background tab so we don't leap months at once.
			carry = Math.min(carry, TICK_MS * 3);
			while (carry >= TICK_MS) {
				carry -= TICK_MS;
				const days = PACES.find((p) => p.id === pace)?.days ?? 1;
				const moved = actions.step(days);
				if (!moved) {
					// Either the end of the data, or waiting for the next year to stream in.
					if (day >= market.dayCount - 1) set({ isPlaying: false });
					carry = 0;
					break;
				}
			}
		} else {
			last = 0;
			carry = 0;
		}
		frame = requestAnimationFrame(loop);
	};
	frame = requestAnimationFrame(loop);
	return () => cancelAnimationFrame(frame);
}
