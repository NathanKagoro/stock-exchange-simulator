// Loads and parses CSV data
// Provides daily price data for stocks

const fs = require("fs");
const path = require("path");

const RAW_DATA_PATH = path.join(
	__dirname,
	"../../../data_pipeline/data/raw/historical_stock_prices_2015_2025.csv"
);
const START_DATE = new Date("2015-01-02T00:00:00Z");
const IGNORED_TOKENS = new Set([
	"PLC",
	"GROUP",
	"HOLDINGS",
	"HOLDING",
	"LTD",
	"LIMITED",
	"ORD",
	"INC",
	"THE",
	"CLASS",
]);

let cachedDataset = null;

function splitCsvLine(line) {
	const cells = [];
	let current = "";
	let insideQuotes = false;

	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];
		const nextChar = line[index + 1];

		if (char === '"') {
			if (insideQuotes && nextChar === '"') {
				current += '"';
				index += 1;
			} else {
				insideQuotes = !insideQuotes;
			}
			continue;
		}

		if (char === "," && !insideQuotes) {
			cells.push(current);
			current = "";
			continue;
		}

		current += char;
	}

	cells.push(current);
	return cells;
}

function buildTicker(name, index, usedTickers) {
	const cleanedTokens = name
		.toUpperCase()
		.replace(/[^A-Z0-9 ]+/g, " ")
		.split(/\s+/)
		.filter(Boolean)
		.filter((token) => !IGNORED_TOKENS.has(token));

	// Builds deterministic pseudo-tickers from company names in the wide CSV.
	let baseTicker = cleanedTokens
		.slice(0, 4)
		.map((token, tokenIndex) => (tokenIndex === 0 ? token.slice(0, 3) : token[0]))
		.join("")
		.slice(0, 5);

	if (!baseTicker) {
		baseTicker = `STK${index + 1}`;
	}

	let ticker = baseTicker;
	let duplicateIndex = 2;

	while (usedTickers.has(ticker)) {
		ticker = `${baseTicker}${duplicateIndex}`;
		duplicateIndex += 1;
	}

	usedTickers.add(ticker);
	return ticker;
}

function buildTradingDates(length) {
	const dates = [];
	const current = new Date(START_DATE);

	while (dates.length < length) {
		const day = current.getUTCDay();
		if (day !== 0 && day !== 6) {
			dates.push(current.toISOString().slice(0, 10));
		}
		current.setUTCDate(current.getUTCDate() + 1);
	}

	return dates;
}

function normalizeSeries(values) {
	const firstValid = values.find((value) => value !== null);

	if (firstValid === undefined) {
		return null;
	}

	const normalized = [];
	// Forward-fill sparse cells so the replay always has a usable close value.
	let lastKnown = firstValid;

	for (const value of values) {
		if (value !== null) {
			lastKnown = value;
			normalized.push(value);
		} else {
			normalized.push(lastKnown);
		}
	}

	return normalized;
}

function loadMarketDataset() {
	if (cachedDataset) {
		// CSV is static during runtime, so parsing once keeps API responses fast.
		return cachedDataset;
	}

	const rawCsv = fs.readFileSync(RAW_DATA_PATH, "utf8");
	const lines = rawCsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
	const parsedRows = lines.map(splitCsvLine);
	// Wide format: one row per company, remaining columns are sequential prices.
	const maxSeriesLength = parsedRows.reduce(
		(maxLength, row) => Math.max(maxLength, Math.max(0, row.length - 1)),
		0
	);
	const dates = buildTradingDates(maxSeriesLength);
	const usedTickers = new Set();

	const stocks = parsedRows
		.map((row, index) => {
			const companyName = (row[0] || "").trim();
			if (!companyName) {
				return null;
			}

			if (/^company\s*name$/i.test(companyName)) {
				return null;
			}

			const rawSeries = Array.from({ length: maxSeriesLength }, (_, dayIndex) => {
				const rawValue = row[dayIndex + 1];
				if (rawValue === undefined || rawValue === null || rawValue.trim() === "") {
					return null;
				}

				const parsedValue = Number.parseFloat(rawValue);
				return Number.isFinite(parsedValue) ? parsedValue : null;
			});

			const normalizedSeries = normalizeSeries(rawSeries);
			if (!normalizedSeries) {
				return null;
			}

			const ticker = buildTicker(companyName, index, usedTickers);
			const series = normalizedSeries.map((close, dayIndex) => ({
				date: dates[dayIndex],
				close: Number(close.toFixed(2)),
			}));

			return {
				ticker,
				name: companyName,
				series,
			};
		})
		.filter(Boolean)
		// Drops ultra-short rows that would be unusable on charts.
		.filter((stock) => stock.series.length >= 50);

	cachedDataset = {
		dates,
		stocks,
		byTicker: Object.fromEntries(stocks.map((stock) => [stock.ticker, stock])),
	};

	return cachedDataset;
}

function getAllStocks() {
	return loadMarketDataset().stocks;
}

function getStockByTicker(ticker) {
	return loadMarketDataset().byTicker[ticker] ?? null;
}

function getAvailableTickerList() {
	return getAllStocks().map((stock) => ({
		ticker: stock.ticker,
		name: stock.name,
	}));
}

module.exports = {
	getAllStocks,
	getAvailableTickerList,
	getStockByTicker,
	loadMarketDataset,
};
