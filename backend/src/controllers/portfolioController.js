// Handles buy/sell requests
// Returns updated portfolio state

const portfolioService = require("../services/portfolioService");

function getPortfolio(_request, response) {
	response.json(portfolioService.getPortfolioState());
}

function buyStock(request, response) {
	try {
		const { ticker, quantity } = request.body ?? {};
		response.json(portfolioService.buyStock(ticker, quantity));
	} catch (error) {
		// Validation errors are user-facing trade issues, not server faults.
		response.status(400).json({ message: error.message });
	}
}

function sellStock(request, response) {
	try {
		const { ticker, quantity } = request.body ?? {};
		response.json(portfolioService.sellStock(ticker, quantity));
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
