# Reads CSV data and cleans it
# Handles missing values, formatting, sorting by date

from __future__ import annotations

import csv
from datetime import date, timedelta
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[1]
RAW_CSV_PATH = BASE_DIR / "data" / "raw" / "historical_stock_prices_2015_2025.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "clean_prices.csv"
START_DATE = date(2015, 1, 2)
IGNORED_TOKENS = {"PLC", "GROUP", "HOLDINGS", "HOLDING", "LTD", "LIMITED", "ORD", "THE"}


def build_trading_dates(length: int) -> list[str]:
	# Reconstructs a synthetic trading calendar because source rows have no explicit date headers.
	dates: list[str] = []
	current = START_DATE

	while len(dates) < length:
		if current.weekday() < 5:
			dates.append(current.isoformat())
		current += timedelta(days=1)

	return dates


def build_ticker(company_name: str, index: int, seen: set[str]) -> str:
	tokens = [
		token
		for token in "".join(ch if ch.isalnum() or ch == " " else " " for ch in company_name.upper()).split()
		if token and token not in IGNORED_TOKENS
	]

	base = "".join(token[:3] if token_index == 0 else token[0] for token_index, token in enumerate(tokens[:4]))[:5]
	if not base:
		base = f"STK{index + 1}"

	candidate = base
	suffix = 2
	while candidate in seen:
	  candidate = f"{base}{suffix}"
	  suffix += 1

	seen.add(candidate)
	return candidate


def normalize_series(raw_values: list[str]) -> list[float] | None:
	parsed_values: list[float | None] = []
	for value in raw_values:
		if value is None or value == "":
			parsed_values.append(None)
			continue

		try:
			parsed_values.append(float(value))
		except ValueError:
			parsed_values.append(None)

	# First valid point anchors forward-fill of sparse cells.
	first_valid = next((value for value in parsed_values if value is not None), None)
	if first_valid is None:
		return None

	normalized: list[float] = []
	last_known = first_valid
	for value in parsed_values:
		if value is None:
			normalized.append(last_known)
		else:
			last_known = value
			normalized.append(value)

	return normalized


def main() -> None:
	rows = []
	seen_tickers: set[str] = set()

	with RAW_CSV_PATH.open("r", encoding="utf-8", newline="") as handle:
		reader = csv.reader(handle)
		parsed_rows = [row for row in reader if row]

	# Wide input may have uneven row lengths, so we normalize to the longest series.
	max_series_length = max(max(0, len(row) - 1) for row in parsed_rows)
	trading_dates = build_trading_dates(max_series_length)

	for index, row in enumerate(parsed_rows):
		company_name = row[0].strip()
		if not company_name:
			continue

		if company_name.lower() == "company name":
			continue

		series = normalize_series(row[1:] + [""] * (max_series_length - max(0, len(row) - 1)))
		if not series:
			continue

		ticker = build_ticker(company_name, index, seen_tickers)
		for day_index, close in enumerate(series):
			rows.append(
				{
					"ticker": ticker,
					"company_name": company_name,
					"date": trading_dates[day_index],
					"close": round(close, 2),
				}
			)

	dataframe = pd.DataFrame(rows).sort_values(["ticker", "date"]).reset_index(drop=True)
	OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
	dataframe.to_csv(OUTPUT_PATH, index=False)
	print(f"Wrote {len(dataframe)} cleaned rows to {OUTPUT_PATH}")


if __name__ == "__main__":
	main()
