# Trains ML model to predict next-day price movement
# Saves model to disk

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor


BASE_DIR = Path(__file__).resolve().parents[1]
FEATURES_PATH = BASE_DIR / "data" / "processed" / "features.csv"
MODEL_PATH = BASE_DIR / "models" / "model.pkl"

FEATURE_COLUMNS = [
	"close",
	"return_1d",
	"return_5d",
	"sma_5",
	"sma_20",
	"volatility_10d",
	"momentum_5d",
]


def main() -> None:
	dataframe = pd.read_csv(FEATURES_PATH)
	# Conservative tree depth keeps the baseline model stable on noisy market data.
	model = RandomForestRegressor(
		n_estimators=200,
		max_depth=8,
		min_samples_leaf=4,
		random_state=42,
		n_jobs=-1,
	)

	X_train = dataframe[FEATURE_COLUMNS]
	y_train = dataframe["next_return"]
	model.fit(X_train, y_train)

	MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
	# Save features with the model so prediction code can stay schema-safe.
	joblib.dump({"model": model, "features": FEATURE_COLUMNS}, MODEL_PATH)
	print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
	main()
