# Creates ML features:
# - moving averages
# - returns
# - volatility

from __future__ import annotations

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[1]
INPUT_PATH = BASE_DIR / "data" / "processed" / "clean_prices.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "features.csv"


def main() -> None:
	dataframe = pd.read_csv(INPUT_PATH, parse_dates=["date"])
	dataframe = dataframe.sort_values(["ticker", "date"]).copy()

	grouped = dataframe.groupby("ticker", group_keys=False)
	dataframe["return_1d"] = grouped["close"].pct_change()
	dataframe["return_5d"] = grouped["close"].pct_change(periods=5)
	dataframe["sma_5"] = grouped["close"].transform(lambda series: series.rolling(5, min_periods=1).mean())
	dataframe["sma_20"] = grouped["close"].transform(lambda series: series.rolling(20, min_periods=1).mean())
	dataframe["volatility_10d"] = grouped["return_1d"].transform(
		lambda series: series.rolling(10, min_periods=2).std()
	)
	dataframe["momentum_5d"] = dataframe["close"] - dataframe["sma_5"]
	dataframe["next_return"] = grouped["return_1d"].shift(-1)

	dataframe = dataframe.dropna(subset=["return_1d", "return_5d", "volatility_10d", "next_return"])
	OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
	dataframe.to_csv(OUTPUT_PATH, index=False)
	print(f"Wrote {len(dataframe)} feature rows to {OUTPUT_PATH}")


if __name__ == "__main__":
	main()
