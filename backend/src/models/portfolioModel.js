// Defines portfolio structure:
// - cash
// - holdings
// - transaction history

class PortfolioModel {
	constructor({ cash = 0, holdings = {}, transactions = [], history = [] } = {}) {
		this.cash = cash;
		this.holdings = holdings;
		this.transactions = transactions;
		this.history = history;
	}

	getHolding(ticker) {
		return this.holdings[ticker] ?? null;
	}

	setHolding(ticker, holding) {
		this.holdings[ticker] = holding;
	}

	removeHolding(ticker) {
		delete this.holdings[ticker];
	}

	toJSON() {
		return {
			cash: this.cash,
			holdings: this.holdings,
			transactions: this.transactions,
			history: this.history,
		};
	}
}

module.exports = PortfolioModel;
