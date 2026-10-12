// Stock discovery: search, sort, watchlist filter and a windowed list so all ~1,300
// stocks are reachable while only the rows on screen are rendered.

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { formatPercent, formatPrice, trendClass } from "../engine/format";
import { SORTS, searchStocks, sortStocks } from "../engine/search";
import { useSnapshot } from "../state/hooks";
import { actions, useAppStore } from "../state/store";
import { Delta, Sparkline, StarIcon } from "./ui";

const ROW_HEIGHT = 68;
const OVERSCAN = 6;
const SPARK_WINDOW = 30;

const StockRow = memo(function StockRow({ index, top, market, day, price, changePct, selected, watched, onTrade }) {
	const ticker = market.tickers[index];
	const name = market.names[index];
	const series = market.prices[index];
	const from = Math.max(0, day - SPARK_WINDOW + 1);
	const spark = Array.from(series.subarray(from, day + 1));
	return (
		<li
			className={`stock-row stock-row--${trendClass(changePct)} ${selected ? "is-selected" : ""}`}
			style={{ transform: `translateY(${top}px)` }}
		>
			<button
				type="button"
				className={`star-button ${watched ? "is-on" : ""}`}
				aria-pressed={watched}
				aria-label={watched ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
				onClick={() => actions.toggleWatch(ticker)}
			>
				<StarIcon filled={watched} />
			</button>
			<button
				type="button"
				className="stock-row__main"
				aria-current={selected ? "true" : undefined}
				onClick={() => actions.selectTicker(ticker)}
				title={`Show ${name} on the chart`}
			>
				<span className="stock-row__id">
					<strong>{ticker}</strong>
					<span className="stock-row__name">{name}</span>
				</span>
				<Sparkline values={spark} className="stock-row__spark" width={72} height={28} />
				<span className="stock-row__nums num">
					<span className="stock-row__price">{formatPrice(price)}</span>
					<Delta value={changePct}>{formatPercent(Math.abs(changePct), { showPlus: false })}</Delta>
				</span>
			</button>
			<button type="button" className="ghost-button stock-row__trade" onClick={() => onTrade(ticker)}>
				Trade
			</button>
		</li>
	);
});

export function StockList({ onTrade }) {
	const market = useAppStore((s) => s.market);
	const day = useAppStore((s) => s.day);
	const selectedTicker = useAppStore((s) => s.selectedTicker);
	const watchlist = useAppStore((s) => s.watchlist);
	const snapshot = useSnapshot();
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState("az");
	const [onlyWatched, setOnlyWatched] = useState(false);
	const viewportRef = useRef(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(480);

	const watchSet = useMemo(() => new Set(watchlist), [watchlist]);

	// Search results only change when the query does; sorting depends on the day.
	const matches = useMemo(() => (market ? searchStocks(market, query) : []), [market, query]);
	const rows = useMemo(() => {
		if (!market || !snapshot) return [];
		let list = onlyWatched ? matches.filter((i) => watchSet.has(market.tickers[i])) : matches.slice();
		// Keep relevance order while searching alphabetically; otherwise apply the chosen sort.
		if (!(query.trim() && sort === "az")) list = sortStocks(list, sort, snapshot, market);
		return list;
	}, [market, snapshot, matches, onlyWatched, watchSet, sort, query]);

	useEffect(() => {
		const element = viewportRef.current;
		if (!element) return undefined;
		const observer = new ResizeObserver(([entry]) => setViewportHeight(entry.contentRect.height));
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		viewportRef.current?.scrollTo({ top: 0 });
		setScrollTop(0);
	}, [query, sort, onlyWatched]);

	const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
	const last = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);

	return (
		<section className="glass-card stock-list" aria-label="Stocks">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Market</p>
					<h2>
						Stocks <span className="muted num">{rows.length.toLocaleString("en-GB")}</span>
					</h2>
				</div>
				<button
					type="button"
					className={`chip ${onlyWatched ? "is-active" : ""}`}
					aria-pressed={onlyWatched}
					onClick={() => setOnlyWatched((v) => !v)}
				>
					<StarIcon filled={onlyWatched} /> Watchlist <span className="num">{watchlist.length}</span>
				</button>
			</div>
			<div className="stock-list__tools">
				<label className="search-field">
					<span className="sr-only">Search stocks</span>
					<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
						<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
						<path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
					</svg>
					<input
						type="search"
						placeholder="Search ticker or name"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						autoComplete="off"
						spellCheck="false"
					/>
				</label>
				<label className="select-field">
					<span className="sr-only">Sort stocks</span>
					<select value={sort} onChange={(event) => setSort(event.target.value)}>
						{SORTS.map((option) => (
							<option key={option.id} value={option.id}>
								{option.label}
							</option>
						))}
					</select>
				</label>
			</div>
			<div
				className="stock-list__viewport"
				ref={viewportRef}
				onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
				tabIndex={-1}
			>
				{rows.length === 0 ? (
					<p className="empty-state">
						{onlyWatched && !query ? "Star a stock to add it to your watchlist." : "No stocks match that search."}
					</p>
				) : (
					<ul className="stock-list__rows" style={{ height: rows.length * ROW_HEIGHT }}>
						{rows.slice(first, last).map((index, offset) => (
							<StockRow
								key={index}
								index={index}
								top={(first + offset) * ROW_HEIGHT}
								market={market}
								day={day}
								price={snapshot.price[index]}
								changePct={snapshot.changePct[index]}
								selected={market.tickers[index] === selectedTicker}
								watched={watchSet.has(market.tickers[index])}
								onTrade={onTrade}
							/>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
