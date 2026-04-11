// Handles incoming requests related to stock data
// Example: get prices for a ticker on a given day

const simulationService = require("../services/simulationService");
const portfolioService = require("../services/portfolioService");

function getStatePayload() {
	return {
		simulation: simulationService.getSimulationState(),
		market: simulationService.getMarketSummary(),
	};
}

function getMarketState(_request, response) {
	response.json(getStatePayload());
}

function getTickers(_request, response) {
	response.json(simulationService.getMarketSummary());
}

function getPrices(request, response) {
	const { ticker } = request.query;
	const series = simulationService.getSeriesForTicker(ticker);

	if (!series) {
		response.status(404).json({ message: "Ticker not found." });
		return;
	}

	response.json(series);
}

function advanceSimulation(request, response) {
	const steps = Number.parseInt(request.body?.steps ?? 1, 10);
	simulationService.advanceSimulation(Number.isFinite(steps) ? steps : 1);
	portfolioService.recordSnapshot("advance");
	response.json(getStatePayload());
}

function jumpToDate(request, response) {
	const index = Number.parseInt(request.body?.index ?? 0, 10);
	simulationService.jumpToIndex(Number.isFinite(index) ? index : 0);
	portfolioService.recordSnapshot("jump");
	response.json(getStatePayload());
}

function resetSimulation(_request, response) {
	simulationService.resetSimulation();
	portfolioService.resetPortfolio();
	response.json(getStatePayload());
}

module.exports = {
	advanceSimulation,
	getMarketState,
	getPrices,
	getTickers,
	jumpToDate,
	resetSimulation,
};
