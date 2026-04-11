# Stock Simulator

Historical London Stock Exchange replay app built as a full-stack simulation MVP. The app replays historical daily price action from the bundled CSV, starts the user with a seeded portfolio, allows buy and sell decisions over the replay timeline, and produces lightweight AI-style recommendations from recent momentum.

## Architecture

- `frontend/`: React + Vite client with portfolio dashboard, market overview, charts, replay controls, and trade execution.
- `backend/`: Express API that parses the historical CSV, manages simulation state, computes portfolio value, and exposes recommendation endpoints.
- `data_pipeline/`: Python scripts for cleaning, feature generation, model training, and a FastAPI ML stub.
- `shared/`: Shared constants and configuration values.

## Features

- Historical daily market replay with generated trading dates.
- Portfolio landing page with equity curve, holdings table, and trade controls.
- Market overview with stock cards and a selectable main chart.
- Buy and sell simulation against historical prices.
- Rule-based recommendation feed.
- Reset, step, jump, and auto-play controls with speed options.

## How to run The App

1. Install workspace dependencies from the project root.
2. Start the backend and frontend together.

```bash
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.
Frontend runs on `http://localhost:5173`.

## Python Pipeline

The CSV in `data_pipeline/data/raw/` is stored in a wide format where each row is a company and each subsequent column is a price observation. The provided pipeline converts that format to a clean long dataset, engineers a few market features, and trains a baseline regression model.

```bash
cd data_pipeline
pip install -r requirements.txt
python scripts/clean_data.py
python scripts/generate_features.py
python scripts/train_model.py
uvicorn api.ml_api:app --reload --port 8000
```
