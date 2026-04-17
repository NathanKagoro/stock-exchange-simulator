// Global state management with Zustand
// Stores:
// - current simulation time
// - selected stock
// - portfolio state (frontend copy)

import { create } from "zustand";
import { api } from "../api/api";

const defaultSimulation = {
	currentIndex: 0,
	currentDate: "",
	totalDays: 0,
	isAtEnd: false,
	isPlaying: false,
	speed: 1,
};

export const useAppStore = create((set, get) => ({
	loading: false,
	error: null,
	selectedTicker: "",
	marketStocks: [],
	marketSeries: [],
	portfolio: {
		cash: 0,
		initialCash: 0,
		totalValue: 0,
		pnl: 0,
		holdings: [],
		transactions: [],
		history: [],
	},
	recommendations: [],
	simulation: defaultSimulation,
	setError: (error) => set({ error }),
	setPlayback: (isPlaying) =>
		set((state) => ({
			simulation: {
				...state.simulation,
				isPlaying,
			},
		})),
	setSpeed: (speed) =>
		set((state) => ({
			simulation: {
				...state.simulation,
				speed,
			},
		})),
	initialize: async () => {
		set({ loading: true, error: null });

		try {
			// Prime all dashboard sections in parallel for quicker first paint.
			const [marketState, portfolio, recommendations] = await Promise.all([
				api.fetchMarketState(),
				api.fetchPortfolio(),
				api.fetchRecommendations(),
			]);

			const selectedTicker = marketState.market[0]?.ticker ?? "";
			const pricePayload = selectedTicker ? await api.fetchStockPrices(selectedTicker) : { series: [] };

			set({
				loading: false,
				selectedTicker,
				marketStocks: marketState.market,
				marketSeries: pricePayload.series ?? [],
				portfolio,
				recommendations,
				simulation: {
					...defaultSimulation,
					...marketState.simulation,
				},
			});
		} catch (error) {
			set({ loading: false, error: error.message });
		}
	},
	refreshDashboard: async (options = {}) => {
		const { keepSelection = true, overrideTicker } = options;

		try {
			const [marketState, portfolio, recommendations] = await Promise.all([
				api.fetchMarketState(),
				api.fetchPortfolio(),
				api.fetchRecommendations(),
			]);

			const currentTicker = get().selectedTicker;
			// Keeps user focus on the currently selected stock whenever possible.
			const selectedTicker =
				overrideTicker ??
				(keepSelection && marketState.market.some((stock) => stock.ticker === currentTicker)
					? currentTicker
					: marketState.market[0]?.ticker ?? "");

			const pricePayload = selectedTicker ? await api.fetchStockPrices(selectedTicker) : { series: [] };

			set((state) => ({
				selectedTicker,
				marketStocks: marketState.market,
				marketSeries: pricePayload.series ?? [],
				portfolio,
				recommendations,
				simulation: {
					...state.simulation,
					...marketState.simulation,
				},
			}));
		} catch (error) {
			set({ error: error.message, loading: false });
		}
	},
	selectTicker: async (ticker) => {
		try {
			const pricePayload = await api.fetchStockPrices(ticker);
			set({ selectedTicker: ticker, marketSeries: pricePayload.series ?? [], error: null });
		} catch (error) {
			set({ error: error.message });
		}
	},
	advanceSimulation: async (steps = 1) => {
		try {
			await api.advanceSimulation(steps);
			await get().refreshDashboard();
		} catch (error) {
			set({ error: error.message });
		}
	},
	jumpToIndex: async (index) => {
		try {
			await api.jumpSimulation(index);
			await get().refreshDashboard();
		} catch (error) {
			set({ error: error.message });
		}
	},
	resetSimulation: async () => {
		try {
			await api.resetSimulation();
			set((state) => ({
				simulation: {
					...state.simulation,
					isPlaying: false,
				},
			}));
			await get().refreshDashboard({ keepSelection: false });
		} catch (error) {
			set({ error: error.message });
		}
	},
	executeTrade: async (side, payload) => {
		try {
			if (side === "buy") {
				await api.buyStock(payload);
			} else {
				await api.sellStock(payload);
			}

			await get().refreshDashboard();
		} catch (error) {
			set({ error: error.message });
		}
	},
}));
