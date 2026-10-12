// Parses the wide historical CSV (one row per company, one column per trading day).
// These rules are a straight port of the old backend/src/services/dataService.js so
// tickers, names and forward-filled closes stay identical to what the API used to serve.

export const IGNORED_TOKENS = new Set([
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

const FALLBACK_START_DATE = "2015-01-02";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function splitCsvLine(line) {
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

export function buildTicker(name, index, usedTickers) {
	const cleanedTokens = name
		.toUpperCase()
		.replace(/[^A-Z0-9 ]+/g, " ")
		.split(/\s+/)
		.filter(Boolean)
		.filter((token) => !IGNORED_TOKENS.has(token));

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

// Synthetic weekday calendar, used only if the CSV header has no usable dates.
export function buildTradingDates(length, start = FALLBACK_START_DATE) {
	const dates = [];
	const current = new Date(`${start}T00:00:00Z`);

	while (dates.length < length) {
		const day = current.getUTCDay();
		if (day !== 0 && day !== 6) {
			dates.push(current.toISOString().slice(0, 10));
		}
		current.setUTCDate(current.getUTCDate() + 1);
	}

	return dates;
}

export function normalizeSeries(values) {
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

/**
 * Returns { dates, stocks: [{ ticker, name, closes: number[] }] } where closes are
 * pence rounded to 2dp (exactly what the old API returned as `close`).
 */
export function parseMarketCsv(rawCsv) {
	const lines = rawCsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
	const parsedRows = lines.map(splitCsvLine);
	const maxSeriesLength = parsedRows.reduce(
		(maxLength, row) => Math.max(maxLength, Math.max(0, row.length - 1)),
		0
	);

	// The header row carries the real LSE trading dates (bank holidays excluded), which
	// are more accurate than the old synthetic weekday calendar; fall back if absent.
	const header = parsedRows.find((row) => /^company\s*name$/i.test((row[0] || "").trim()));
	const headerDates = header ? header.slice(1, maxSeriesLength + 1).map((cell) => cell.trim()) : [];
	const dates =
		headerDates.length === maxSeriesLength && headerDates.every((cell) => ISO_DATE.test(cell))
			? headerDates
			: buildTradingDates(maxSeriesLength);

	const usedTickers = new Set();
	const stocks = parsedRows
		.map((row, index) => {
			const companyName = (row[0] || "").trim();
			if (!companyName || /^company\s*name$/i.test(companyName)) {
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
			return {
				ticker,
				name: companyName,
				closes: normalizedSeries.map((close) => Number(close.toFixed(2))),
			};
		})
		.filter(Boolean)
		.filter((stock) => stock.closes.length >= 50);

	return { dates, stocks };
}
