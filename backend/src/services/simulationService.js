// Core simulation engine
// Advances time and retrieves correct price slice

const dataService = require("./dataService");

const marketDataset = dataService.loadMarketDataset();

const simulationState = {
	currentIndex: 0,
};

function clampIndex(index) {
	return Math.max(0, Math.min(index, marketDataset.dates.length - 1));
}

function getSimulationState() {
	return {
		currentIndex: simulationState.currentIndex,
		currentDate: marketDataset.dates[simulationState.currentIndex],
		totalDays: marketDataset.dates.length,
		isAtEnd: simulationState.currentIndex >= marketDataset.dates.length - 1,
	};
}

function advanceSimulation(steps = 1) {
	simulationState.currentIndex = clampIndex(simulationState.currentIndex + Math.max(1, steps));
	return getSimulationState();
}

function jumpToIndex(index) {
	simulationState.currentIndex = clampIndex(index);
	return getSimulationState();
}

function resetSimulation() {
	simulationState.currentIndex = 0;
	return getSimulationState();
}

function getCurrentPrice(ticker) {
	const stock = dataService.getStockByTicker(ticker);
	if (!stock) {
		return null;
	}

	return stock.series[simulationState.currentIndex]?.close ?? null;
}

function getSeriesForTicker(ticker) {
	const stock = dataService.getStockByTicker(ticker);
	if (!stock) {
		return null;
	}

	return {
		ticker: stock.ticker,
		name: stock.name,
		currentIndex: simulationState.currentIndex,
		series: stock.series,
		visibleSeries: stock.series.slice(0, simulationState.currentIndex + 1),
	};
}

function getMarketSummary() {
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
