// Derived, memoised views over the store. Each hook subscribes to the minimum slice.

import { useMemo } from "react";
import { marketSnapshot, stockIndex } from "../engine/market";
import { equityCurve, valuePortfolio } from "../engine/portfolio";
import { momentumSignals } from "../engine/signals";
import { useAppStore } from "./store";

export const useMarket = () => useAppStore((s) => s.market);
export const useDay = () => useAppStore((s) => s.day);
export const useSelectedTicker = () => useAppStore((s) => s.selectedTicker);
export const useLedger = () => useAppStore((s) => s.ledger);

export function useSnapshot() {
	const market = useMarket();
	const day = useDay();
	return useMemo(() => (market ? marketSnapshot(market, day) : null), [market, day]);
}

export function useValuation() {
	const market = useMarket();
	const day = useDay();
	const ledger = useLedger();
	return useMemo(() => (market ? valuePortfolio(market, ledger, day) : null), [market, ledger, day]);
}

/** Full equity curve over every loaded day; recomputed only when trades or data change. */
export function useEquityCurve() {
	const market = useMarket();
	const ledger = useLedger();
	const loadedDays = useAppStore((s) => s.loadedDays);
	return useMemo(
		() => (market && loadedDays ? equityCurve(market, ledger, loadedDays - 1) : new Float64Array(0)),
		[market, ledger, loadedDays]
	);
}

export function useSignals(limit = 5) {
	const market = useMarket();
	const day = useDay();
	return useMemo(() => (market ? momentumSignals(market, day, { limit }) : null), [market, day, limit]);
}

export function useSelectedStock() {
	const market = useMarket();
	const ticker = useSelectedTicker();
	return useMemo(() => {
		if (!market) return null;
		const index = stockIndex(market, ticker);
		return index < 0 ? null : { index, ticker, name: market.names[index] };
	}, [market, ticker]);
}
