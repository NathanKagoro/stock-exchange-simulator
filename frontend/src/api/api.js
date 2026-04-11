// Handles all communication with the backend API
// Example: fetching stock prices, executing trades, getting recommendations

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers: {
			"Content-Type": "application/json",
			...(options.headers ?? {}),
		},
		...options,
	});

	if (!response.ok) {
		const errorPayload = await response.json().catch(() => ({ message: "Request failed." }));
		throw new Error(errorPayload.message || "Request failed.");
	}

	return response.json();
}

export const api = {
	fetchMarketState: () => request("/market/state"),
	fetchStockPrices: (ticker) => request(`/market/prices?ticker=${encodeURIComponent(ticker)}`),
	fetchPortfolio: () => request("/portfolio"),
	fetchRecommendations: () => request("/recommendations"),
	advanceSimulation: (steps = 1) =>
		request("/market/simulation/advance", {
			method: "POST",
			body: JSON.stringify({ steps }),
		}),
	jumpSimulation: (index) =>
		request("/market/simulation/jump", {
			method: "POST",
			body: JSON.stringify({ index }),
		}),
	resetSimulation: () =>
		request("/market/simulation/reset", {
			method: "POST",
			body: JSON.stringify({}),
		}),
	buyStock: ({ ticker, quantity }) =>
		request("/portfolio/buy", {
			method: "POST",
			body: JSON.stringify({ ticker, quantity }),
		}),
	sellStock: ({ ticker, quantity }) =>
		request("/portfolio/sell", {
			method: "POST",
			body: JSON.stringify({ ticker, quantity }),
		}),
};
