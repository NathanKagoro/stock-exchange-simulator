// Handles buy/sell requests
// Returns updated portfolio state

const portfolioService = require("../services/portfolioService");

function getPortfolio(request, response) {
	response.json(portfolioService.getPortfolioState(request.sessionId));
}

function buyStock(request, response) {
	try {
		const { ticker, quantity } = request.body ?? {};
		response.json(portfolioService.buyStock(request.sessionId, ticker, quantity));
	} catch (error) {
		// Validation errors are user-facing trade issues, not server faults.
		response.status(400).json({ message: error.message });
	}
}

function sellStock(request, response) {
	try {
		const { ticker, quantity } = request.body ?? {};
		response.json(portfolioService.sellStock(request.sessionId, ticker, quantity));
	} catch (error) {
		// Validation errors are user-facing trade issues, not server faults.
		response.status(400).json({ message: error.message });
	}
}

module.exports = {
	buyStock,
	getPortfolio,
	sellStock,
};
