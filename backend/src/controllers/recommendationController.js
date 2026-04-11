// Calls ML service to generate recommendations
// Sends them to frontend

const simulationService = require("../services/simulationService");

function buildRecommendation(stock) {
	const { sparkline, ticker, name, currentPrice } = stock;
	const closes = sparkline.map((point) => point.close);
	const first = closes[0] ?? currentPrice;
	const last = closes[closes.length - 1] ?? currentPrice;
	const momentum = first === 0 ? 0 : ((last - first) / first) * 100;
	const avg = closes.reduce((total, close) => total + close, 0) / Math.max(1, closes.length);
	// Lightweight heuristic model: momentum thresholding plus mean-distance context.
	const action = momentum >= 4 ? "buy" : momentum <= -4 ? "sell" : "hold";
	const reason =
		action === "buy"
			? `${name} is showing strong short-term momentum.`
			: action === "sell"
				? `${name} has weakened versus its recent average.`
				: `${name} is trading near its recent mean; wait for a clearer signal.`;

	return {
		ticker,
		name,
		action,
		confidence: Number(Math.min(95, Math.max(55, Math.abs(momentum) * 6 + 50)).toFixed(0)),
		currentPrice,
		reason,
		metrics: {
			momentum: Number(momentum.toFixed(2)),
			meanGap: Number((currentPrice - avg).toFixed(2)),
		},
	};
}

function getRecommendations(_request, response) {
	const recommendations = simulationService
		.getMarketSummary()
		// Keep payload compact for the side panel UI.
		.slice(0, 8)
		.map(buildRecommendation)
		.sort((left, right) => right.confidence - left.confidence);

	response.json(recommendations);
}

module.exports = {
	getRecommendations,
};
