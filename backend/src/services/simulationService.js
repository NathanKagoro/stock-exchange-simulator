// Core simulation engine
// Advances time and retrieves correct price slice

const dataService = require("./dataService");

const marketDataset = dataService.loadMarketDataset();
const DEFAULT_SESSION_ID = "default";
const simulationStatesBySession = new Map();

function getSessionId(sessionId) {
	return sessionId || DEFAULT_SESSION_ID;
}

function getSimulationStateForSession(sessionId) {
	const safeSessionId = getSessionId(sessionId);

	if (!simulationStatesBySession.has(safeSessionId)) {
		simulationStatesBySession.set(safeSessionId, {
			currentIndex: 0,
		});
	}

	return simulationStatesBySession.get(safeSessionId);
}

function clampIndex(index) {
	// Guards against invalid jumps and keeps replay in known bounds.
	return Math.max(0, Math.min(index, marketDataset.dates.length - 1));
}

function getSimulationState(sessionId) {
	const simulationState = getSimulationStateForSession(sessionId);

	return {
		currentIndex: simulationState.currentIndex,
		currentDate: marketDataset.dates[simulationState.currentIndex],
		totalDays: marketDataset.dates.length,
		isAtEnd: simulationState.currentIndex >= marketDataset.dates.length - 1,
	};
}

function advanceSimulation(sessionId, steps = 1) {
	const simulationState = getSimulationStateForSession(sessionId);
	simulationState.currentIndex = clampIndex(simulationState.currentIndex + Math.max(1, steps));
	return getSimulationState(sessionId);
}

function jumpToIndex(sessionId, index) {
	const simulationState = getSimulationStateForSession(sessionId);
	simulationState.currentIndex = clampIndex(index);
	return getSimulationState(sessionId);
}

function resetSimulation(sessionId) {
	const simulationState = getSimulationStateForSession(sessionId);
	simulationState.currentIndex = 0;
	return getSimulationState(sessionId);
}

function getCurrentPrice(sessionId, ticker) {
	const simulationState = getSimulationStateForSession(sessionId);
	const stock = dataService.getStockByTicker(ticker);
	if (!stock) {
		return null;
	}

	return stock.series[simulationState.currentIndex]?.close ?? null;
}

function getSeriesForTicker(sessionId, ticker) {
	const simulationState = getSimulationStateForSession(sessionId);
	const stock = dataService.getStockByTicker(ticker);
	if (!stock) {
		return null;
	}

	return {
		ticker: stock.ticker,
		name: stock.name,
		currentIndex: simulationState.currentIndex,
		series: stock.series,
		// Used when the UI wants chart data only up to "current replay time".
		visibleSeries: stock.series.slice(0, simulationState.currentIndex + 1),
	};
}

function getMarketSummary(sessionId) {
	const simulationState = getSimulationStateForSession(sessionId);
	return dataService.getAllStocks().map((stock) => {
		const currentPoint = stock.series[simulationState.currentIndex];
		const previousPoint = stock.series[Math.max(0, simulationState.currentIndex - 1)] ?? currentPoint;
		const change = currentPoint.close - previousPoint.close;
		const changePct = previousPoint.close === 0 ? 0 : (change / previousPoint.close) * 100;
		const sparklineStart = Math.max(0, simulationState.currentIndex - 6);

		return {
			ticker: stock.ticker,
			name: stock.name,
			currentPrice: currentPoint.close,
			previousClose: previousPoint.close,
			change: Number(change.toFixed(2)),
			changePct: Number(changePct.toFixed(2)),
			sparkline: stock.series.slice(sparklineStart, simulationState.currentIndex + 1),
		};
	});
}

module.exports = {
	advanceSimulation,
	getCurrentPrice,
	getMarketSummary,
	getSeriesForTicker,
	getSimulationState,
	jumpToIndex,
	resetSimulation,
};
