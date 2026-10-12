# LSE Replay — Stock Exchange simulator

Replay ten years of London Stock Exchange daily closes (Apr 2015 – Mar 2025, 1,277 companies)
with £100,000 of virtual cash. Buy and sell at each replay day's close and watch your portfolio
value change. Live at [nathankagoro.com/stock](https://nathankagoro.com/stock/).

The whole simulation runs **in the browser**. There is no backend: price data ships as small
static files and the replay, portfolio and momentum signals are computed client-side.

## How it works

```
data/raw/historical_stock_prices_2015_2025.csv   41 MB wide CSV (source of truth, not shipped)
        │  scripts/build-data.mjs  (runs automatically before `vite` / `vite build`, ~5 s)
        ▼
frontend/public/data/meta.json        dates, tickers, names, chunk index   (~72 KB, ~20 KB gzipped)
frontend/public/data/prices-YYYY.bin  one gzip chunk per calendar year      (75–330 KB each, 2.8 MB total)
        │  frontend/src/engine/loader.js  (meta + first year first, later years stream in the background)
        ▼
frontend/src/engine/*   market, portfolio ledger, momentum signals, search, formatting
frontend/src/state/     Zustand store + requestAnimationFrame playback loop
```

- **Parsing rules** (`scripts/lib/parseCsv.mjs`) are a straight port of the old backend's
  `dataService.js`: same ticker derivation, forward-fill and ≥50-point filter, so tickers and names
  are unchanged. Trading dates now come from the CSV header (real LSE sessions) rather than a
  synthetic weekday calendar.
- **Encoding** (`frontend/src/engine/codec.js`): prices are integers in 1/100 pence (exact for the
  2dp source), delta-encoded per stock, zigzag + varint, then gzipped. The browser inflates with
  `DecompressionStream` (with an `fflate` fallback).
- **Units**: the CSV quotes prices in **pence**. Money is held as integer pennies; share prices are
  shown in £ (or in p when under £1).
- **Portfolio**: an append-only ledger of trades stamped with their replay day. The portfolio at any
  day is a fold of the ledger up to that day, so scrubbing backwards hides later trades, and trading
  after rewinding discards the "future" trades. Starting portfolio: same rule as before (first three
  stocks, ~£10,000 / £12,500 / £15,000 at day-0 prices), now priced correctly in pounds.
- **Persistence**: trades, replay position, pace, selection and watchlist go to `localStorage`
  (best-effort; the app works without it).
- Generated data is **git-ignored** because it rebuilds in ~5 s from the committed CSV.

## Develop

```bash
npm install
npm run dev      # builds data if stale, then Vite on http://localhost:5173
npm test         # vitest: engine maths, codec, CSV round-trip
npm run build    # -> frontend/dist (base path /stock/)
node scripts/serve-dist.mjs 4173   # serve dist at http://localhost:4173/stock/
```

`npm run data -- --force` regenerates `frontend/public/data/`.

## Controls

- **Space** play/pause · **← / →** step one day (ignored while typing in a field)
- Pace: each tick (200 ms) advances 1 day, 1 week (5 sessions) or 1 month (21 sessions)
- Drag the timeline to scrub; no network requests are made during replay.

## Deploying inside nathankagoro.com

This repo is a git submodule of the portfolio site. The old Express API and Netlify Function are
gone, so the parent site only needs to copy `frontend/dist` to `/stock/` with an SPA fallback
(`/stock/* → /stock/index.html`). Any `/api/*` redirect or function config for this app can be removed.

Momentum signals are a simple 7-day % change rule for a game, not investment advice.
