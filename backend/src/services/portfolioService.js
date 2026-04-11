// Handles portfolio logic:
// - buy stock
// - sell stock
// - calculate portfolio value

const PortfolioModel = require("../models/portfolioModel");
const dataService = require("./dataService");
const simulationService = require("./simulationService");

const INITIAL_CASH = 100000;

let portfolio = createInitialPortfolio();

function createInitialPortfolio() {
	const starterStocks = dataService.getAllStocks().slice(0, 3);
	const holdings = {};
	const transactions = [];
	let cash = INITIAL_CASH;

	starterStocks.forEach((stock, index) => {
		const openingPrice = stock.series[0].close;
		const targetSpend = 10000 + index * 2500;
		const shares = Math.max(10, Math.floor(targetSpend / openingPrice));
		const cost = Number((shares * openingPrice).toFixed(2));

		cash -= cost;
		holdings[stock.ticker] = {
			ticker: stock.ticker,
			name: stock.name,
			shares,
			averagePrice: openingPrice,
		};
		transactions.push({
			type: "seed",
			ticker: stock.ticker,
			quantity: shares,
			price: openingPrice,
			total: cost,
			date: stock.series[0].date,
		});
	});

	const nextPortfolio = new PortfolioModel({
		cash: Number(cash.toFixed(2)),
		holdings,
		transactions,
		history: [],
	});

	recordSnapshotFor(nextPortfolio, "seed");
	return nextPortfolio;
}

function getPortfolioValue(targetPortfolio = portfolio) {
	const holdingsValue = Object.values(targetPortfolio.holdings).reduce((total, holding) => {
		const currentPrice = simulationService.getCurrentPrice(holding.ticker) ?? 0;
		return total + holding.shares * currentPrice;
	}, 0);

	return Number((targetPortfolio.cash + holdingsValue).toFixed(2));
}

function recordSnapshotFor(targetPortfolio, reason) {
	const simulation = simulationService.getSimulationState();
	const totalValue = getPortfolioValue(targetPortfolio);
	const lastEntry = targetPortfolio.history[targetPortfolio.history.length - 1];

	if (lastEntry && lastEntry.index === simulation.currentIndex && lastEntry.reason === reason) {
		return;
	}

	targetPortfolio.history.push({
		index: simulation.currentIndex,
		date: simulation.currentDate,
		totalValue,
		cash: targetPortfolio.cash,
		reason,
	});
}

function recordSnapshot(reason = "update") {
	recordSnapshotFor(portfolio, reason);
}

function resetPortfolio() {
	portfolio = createInitialPortfolio();
	return getPortfolioState();
}

function trade(side, ticker, quantity) {
	const numericQuantity = Number.parseInt(quantity, 10);
	if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
		throw new Error("Quantity must be a positive integer.");
	}

	const stock = dataService.getStockByTicker(ticker);
	if (!stock) {
		throw new Error("Unknown ticker.");
	}

	const currentPrice = simulationService.getCurrentPrice(ticker);
	const tradeValue = Number((currentPrice * numericQuantity).toFixed(2));
	const existingHolding = portfolio.getHolding(ticker);

	if (side === "buy") {
		if (portfolio.cash < tradeValue) {
			throw new Error("Insufficient cash to execute this trade.");
		}

		const nextShares = (existingHolding?.shares ?? 0) + numericQuantity;
		const investedCost = (existingHolding?.averagePrice ?? 0) * (existingHolding?.shares ?? 0);
		const newAveragePrice = (investedCost + tradeValue) / nextShares;

		portfolio.cash = Number((portfolio.cash - tradeValue).toFixed(2));
		portfolio.setHolding(ticker, {
			ticker,
			name: stock.name,
			shares: nextShares,
			averagePrice: Number(newAveragePrice.toFixed(2)),
		});
	}

	if (side === "sell") {
		if (!existingHolding || existingHolding.shares < numericQuantity) {
			throw new Error("Not enough shares to sell.");
		}

		const nextShares = existingHolding.shares - numericQuantity;
		portfolio.cash = Number((portfolio.cash + tradeValue).toFixed(2));

		if (nextShares === 0) {
			portfolio.removeHolding(ticker);
		} else {
			portfolio.setHolding(ticker, {
				...existingHolding,
				shares: nextShares,
			});
		}
	}

	portfolio.transactions.unshift({
		type: side,
		ticker,
		quantity: numericQuantity,
		price: currentPrice,
		total: tradeValue,
		date: simulationService.getSimulationState().currentDate,
	});

	recordSnapshot(side);
	return getPortfolioState();
}

function getPortfolioState() {
	const holdings = Object.values(portfolio.holdings).map((holding) => {
		const currentPrice = simulationService.getCurrentPrice(holding.ticker) ?? 0;
		const marketValue = Number((currentPrice * holding.shares).toFixed(2));
		const costBasis = Number((holding.averagePrice * holding.shares).toFixed(2));
		const pnl = Number((marketValue - costBasis).toFixed(2));

		return {
			...holding,
			currentPrice,
			marketValue,
			pnl,
		};
	});

	const totalValue = getPortfolioValue();
	const pnl = Number((totalValue - INITIAL_CASH).toFixed(2));

	return {
		cash: portfolio.cash,
		initialCash: INITIAL_CASH,
		totalValue,
		pnl,
		holdings,
		transactions: portfolio.transactions.slice(0, 20),
		history: portfolio.history,
	};
}

module.exports = {
	buyStock: (ticker, quantity) => trade("buy", ticker, quantity),
	getPortfolioState,
	recordSnapshot,
	resetPortfolio,
	sellStock: (ticker, quantity) => trade("sell", ticker, quantity),
};
