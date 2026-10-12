// Handles incoming requests related to stock data
// Example: get prices for a ticker on a given day

const simulationService = require("../services/simulationService");
const portfolioService = require("../services/portfolioService");
const recommendationService = require("../services/recommendationService");

function getStatePayload(sessionId) {
	// Frontend syncs from this combined payload after most simulation actions.
	return {
		simulation: simulationService.getSimulationState(sessionId),
		market: simulationService.getMarketSummary(sessionId),
		portfolio: portfolioService.getPortfolioState(sessionId),
		recommendations: recommendationService.getRecommendationsForSession(sessionId),
	};
}

function getMarketState(request, response) {
	response.json(getStatePayload(request.sessionId));
}

function getTickers(request, response) {
	response.json(simulationService.getMarketSummary(request.sessionId));
}

function getPrices(request, response) {
	const { ticker } = request.query;
	const series = simulationService.getSeriesForTicker(request.sessionId, ticker);

	if (!series) {
		response.status(404).json({ message: "Ticker not found." });
		return;
	}

	response.json(series);
}

function advanceSimulation(request, response) {
	const steps = Number.parseInt(request.body?.steps ?? 1, 10);
	simulationService.advanceSimulation(request.sessionId, Number.isFinite(steps) ? steps : 1);
	// Persist a value point each time replay advances so the portfolio chart stays continuous.
	portfolioService.recordSnapshot(request.sessionId, "advance");
	response.json(getStatePayload(request.sessionId));
}

function jumpToDate(request, response) {
	const index = Number.parseInt(request.body?.index ?? 0, 10);
	simulationService.jumpToIndex(request.sessionId, Number.isFinite(index) ? index : 0);
	portfolioService.recordSnapshot(request.sessionId, "jump");
	response.json(getStatePayload(request.sessionId));
}

function resetSimulation(request, response) {
	simulationService.resetSimulation(request.sessionId);
	portfolioService.resetPortfolio(request.sessionId);
	response.json(getStatePayload(request.sessionId));
}

module.exports = {
	advanceSimulation,
	getMarketState,
	getPrices,
	getTickers,
	jumpToDate,
	resetSimulation,
};
