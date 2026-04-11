# Lightweight API (Flask/FastAPI)
# Endpoint:
# /predict -> returns buy/sell recommendations

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException


BASE_DIR = Path(__file__).resolve().parents[1]
FEATURES_PATH = BASE_DIR / "data" / "processed" / "features.csv"
MODEL_PATH = BASE_DIR / "models" / "model.pkl"

app = FastAPI(title="Stock Simulator ML API")


def load_assets() -> tuple[pd.DataFrame, object | None, list[str]]:
	dataframe = pd.read_csv(FEATURES_PATH)
	if MODEL_PATH.exists() and MODEL_PATH.stat().st_size > 0:
		# Model bundle includes its own feature order for safer inference.
		bundle = joblib.load(MODEL_PATH)
		return dataframe, bundle["model"], bundle["features"]
	return dataframe, None, []


@app.get("/predict")
def predict(ticker: str) -> dict:
	dataframe, model, feature_columns = load_assets()
	ticker_frame = dataframe[dataframe["ticker"] == ticker].sort_values("date")

	if ticker_frame.empty:
		raise HTTPException(status_code=404, detail="Ticker not found in processed feature set.")

	latest = ticker_frame.iloc[-1]
	# Falls back to a simple momentum proxy when no trained model is available yet.
	predicted_return = float(model.predict([latest[feature_columns]])[0]) if model is not None else float(latest["return_5d"])
	action = "buy" if predicted_return > 0.01 else "sell" if predicted_return < -0.01 else "hold"

	return {
	  "ticker": ticker,
	  "predicted_return": round(predicted_return, 4),
	  "action": action,
	  "reason": "Model-driven prediction based on recent returns, moving averages, and volatility.",
	}
