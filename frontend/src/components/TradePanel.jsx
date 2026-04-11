// UI for buying and selling stocks
// Lets user select stock, quantity, and execute trade
// Sends trade requests to backend

import { useState } from "react";

export function TradePanel({ stocks, selectedTicker, onSelectTicker, onTrade }) {
	const [quantity, setQuantity] = useState(10);

	return (
		<section className="glass-card trade-panel">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Trade Panel</p>
					<h2>Execute Orders</h2>
				</div>
			</div>
			<label className="field">
				<span>Stock</span>
				<select value={selectedTicker} onChange={(event) => onSelectTicker(event.target.value)}>
					{stocks.map((stock) => (
						<option key={stock.ticker} value={stock.ticker}>
							{stock.ticker} · {stock.name}
						</option>
					))}
				</select>
			</label>
			<label className="field">
				<span>Quantity</span>
				<input
					type="number"
					min="1"
					step="1"
					value={quantity}
					onChange={(event) => setQuantity(event.target.value)}
				/>
			</label>
			<div className="trade-panel__actions">
				<button type="button" className="primary-button" onClick={() => onTrade("buy", quantity)}>
					Buy
				</button>
				<button type="button" className="secondary-button" onClick={() => onTrade("sell", quantity)}>
					Sell
				</button>
			</div>
		</section>
	);
}
