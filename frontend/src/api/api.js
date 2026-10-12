// Handles all communication with the backend API
// Example: fetching stock prices, executing trades, getting recommendations

const API_BASE_URL =
	import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "/api" : "http://localhost:4000");
const SESSION_STORAGE_KEY = "stock-simulator-session-id";

let requestQueue = Promise.resolve();

function createSessionId() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId() {
	if (typeof window === "undefined") {
		return "default";
	}

	let sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
	if (!sessionId) {
		sessionId = createSessionId();
		window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
	}

	return sessionId;
}

function enqueueRequest(task) {
	const run = requestQueue.then(task, task);

	requestQueue = run.catch(() => {
		// Keep queue alive after failures so subsequent requests are not blocked.
	});

	return run;
}

function buildErrorDetails({ path, response, responseText, cause }) {
	const requestUrl = `${API_BASE_URL}${path}`;

	if (response) {
		const statusLabel = `${response.status} ${response.statusText}`.trim();
		return [
			`Request failed for ${requestUrl}`,
			`Status: ${statusLabel}`,
			responseText ? `Response: ${responseText}` : null,
		]
			.filter(Boolean)
			.join("\n");
	}

	return [
		`Network request failed for ${requestUrl}`,
		cause?.message ? `Cause: ${cause.message}` : null,
	]
		.filter(Boolean)
		.join("\n");
}

async function request(path, options = {}) {
	return enqueueRequest(async () => {
		try {
		// Centralized fetch wrapper keeps error handling consistent across all screens.
		const response = await fetch(`${API_BASE_URL}${path}`, {
			headers: {
				"Content-Type": "application/json",
				"x-session-id": getSessionId(),
				...(options.headers ?? {}),
			},
			...options,
		});

		const responseText = await response.text();
		let parsedPayload = null;

		if (responseText) {
			try {
				parsedPayload = JSON.parse(responseText);
			} catch (_parseError) {
				const snippet = responseText.slice(0, 300);
				const error = new Error(
					buildErrorDetails({ path, response, responseText: `${snippet}${responseText.length > 300 ? "..." : ""}` })
				);
				error.requestUrl = `${API_BASE_URL}${path}`;
				error.status = response.status;
				error.statusText = response.statusText;
				error.responseText = snippet;
				throw error;
			}
		}

		if (!response.ok) {
			const error = new Error(
				parsedPayload?.message || buildErrorDetails({ path, response, responseText })
			);
			error.requestUrl = `${API_BASE_URL}${path}`;
			error.status = response.status;
			error.statusText = response.statusText;
			error.responseText = responseText;
			throw error;
		}

		return parsedPayload;
		} catch (error) {
			if (error.requestUrl || error.status) {
				throw error;
			}

			throw new Error(buildErrorDetails({ path, cause: error }));
		}
	});
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
