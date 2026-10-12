// Buy / sell the selected stock at the current replay day's close.

import { useId, useMemo, useState } from "react";
import { formatMoney, formatPrice } from "../engine/format";
import { stockIndex } from "../engine/market";
import { searchStocks } from "../engine/search";
import { useValuation } from "../state/hooks";
import { actions, useAppStore } from "../state/store";

function StockPicker() {
	const market = useAppStore((s) => s.market);
	const selectedTicker = useAppStore((s) => s.selectedTicker);
	const [query, setQuery] = useState("");
	const listId = useId();
	const options = useMemo(() => (market ? searchStocks(market, query, 50) : []), [market, query]);

	const commit = (value) => {
		const text = value.trim();
		if (!market || !text) return;
		const exact = text.split(" · ")[0].toUpperCase();
		if (market.indexByTicker.has(exact)) {
			actions.selectTicker(exact);
			setQuery("");
			return;
		}
		const [best] = searchStocks(market, text, 1);
		if (best !== undefined) {
			actions.selectTicker(market.tickers[best]);
			setQuery("");
		}
	};

	const selectedName = market ? market.names[stockIndex(market, selectedTicker)] : "";

	return (
		<label className="field">
			<span>Stock</span>
			<input
				type="text"
				list={listId}
				value={query}
				placeholder={selectedTicker ? `${selectedTicker} · ${selectedName}` : "Search ticker or name"}
				onChange={(event) => {
					setQuery(event.target.value);
					if (market?.indexByTicker.has(event.target.value.split(" · ")[0])) commit(event.target.value);
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						commit(query);
					}
				}}
				onBlur={() => commit(query)}
				autoComplete="off"
				spellCheck="false"
			/>
			<datalist id={listId}>
				{options.map((i) => (
					<option key={i} value={`${market.tickers[i]} · ${market.names[i]}`} />
				))}
			</datalist>
		</label>
	);
}

export function TradePanel() {
	const market = useAppStore((s) => s.market);
	const day = useAppStore((s) => s.day);
	const selectedTicker = useAppStore((s) => s.selectedTicker);
	const ledger = useAppStore((s) => s.ledger);
	const valuation = useValuation();
	const [quantity, setQuantity] = useState("10");
	const inputId = useId();
	const hintId = useId();

	// Recomputed whenever the day, holdings or quantity change.
	const buy = useMemo(() => actions.validate("buy", quantity), [quantity, day, ledger, selectedTicker, market]);
	const sell = useMemo(() => actions.validate("sell", quantity), [quantity, day, ledger, selectedTicker, market]);

	if (!market || !valuation) return null;
	const index = stockIndex(market, selectedTicker);
	const price = index >= 0 ? market.prices[index][day] : 0;
	const held = valuation.holdings.find((h) => h.ticker === selectedTicker)?.shares ?? 0;
	const validQuantity = /^\d+$/.test(quantity.trim()) && Number(quantity) > 0;
	const previewTotal = validQuantity ? buy.total || sell.total : 0;

	const submit = (side) => {
		if (actions.trade(side, quantity)) setQuantity("10");
	};

	return (
		<section className="glass-card trade-panel" aria-label="Trade" id="trade">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Trade</p>
					<h2>
						{selectedTicker} <span className="muted num">at {formatPrice(price)}</span>
					</h2>
				</div>
			</div>
			<StockPicker />
			<div className="field">
				<label htmlFor={inputId}>Quantity (shares)</label>
				<div className="quantity-row">
					<input
						id={inputId}
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						value={quantity}
						aria-describedby={hintId}
						aria-invalid={!validQuantity}
						onChange={(event) => setQuantity(event.target.value.replace(/[^\d]/g, "").slice(0, 9))}
					/>
					<button
						type="button"
						className="ghost-button"
						onClick={() => setQuantity(String(Math.max(1, buy.max)))}
						disabled={buy.max < 1}
						title="Most shares your cash can buy"
					>
						Max buy
					</button>
					<button
						type="button"
						className="ghost-button"
						onClick={() => setQuantity(String(held))}
						disabled={held < 1}
						title="Sell your whole position"
					>
						All held
					</button>
				</div>
			</div>
			<dl className="trade-summary num" id={hintId}>
				<div>
					<dt>Estimated {validQuantity ? "cost / proceeds" : "total"}</dt>
					<dd>{validQuantity ? formatMoney(previewTotal) : "—"}</dd>
				</div>
				<div>
					<dt>Cash available</dt>
					<dd>{formatMoney(valuation.cash)}</dd>
				</div>
				<div>
					<dt>You hold</dt>
					<dd>{held.toLocaleString("en-GB")} shares</dd>
				</div>
			</dl>
			<div className="trade-panel__actions">
				<button type="button" className="buy-button" disabled={!buy.ok} onClick={() => submit("buy")}>
					Buy
				</button>
				<button type="button" className="sell-button" disabled={!sell.ok} onClick={() => submit("sell")}>
					Sell
				</button>
			</div>
			<ul className="trade-reasons" aria-live="polite">
				{!buy.ok && !sell.ok && buy.reason === sell.reason ? (
					<li>{buy.reason}</li>
				) : (
					<>
						{!buy.ok ? <li>Can't buy: {buy.reason}</li> : null}
						{!sell.ok ? <li>Can't sell: {sell.reason}</li> : null}
					</>
				)}
			</ul>
		</section>
	);
}
