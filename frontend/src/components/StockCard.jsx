// Small UI card showing a stock summary
// Includes: ticker, current price, % change, mini sparkline
// Clicking this updates the main chart or navigates user

export function StockCard({ stock, active, onSelect, onTrade }) {
	const trendClass = stock.change > 0 ? "stock-card--positive" : stock.change < 0 ? "stock-card--negative" : "stock-card--flat";
	const sparklinePoints = stock.sparkline
		.map((point, index) => `${index === 0 ? "M" : "L"}${index * 20},${40 - point.close / 25}`)
		.join(" ");

	return (
		<button
			type="button"
			className={`glass-card stock-card ${trendClass} ${active ? "active" : ""}`}
			onClick={() => onSelect(stock.ticker)}
		>
			<div className="stock-card__header">
				<div>
					<p className="eyebrow">{stock.ticker}</p>
					<h3>{stock.name}</h3>
				</div>
				<span className={`pill ${stock.changePct >= 0 ? "pill--positive" : "pill--negative"}`}>
					{stock.changePct >= 0 ? "+" : ""}
					{stock.changePct}%
				</span>
			</div>
			<div className="stock-card__price">£{stock.currentPrice.toFixed(2)}</div>
			<svg className="stock-card__sparkline" viewBox="0 0 120 40" aria-hidden="true">
				<path d={sparklinePoints} />
			</svg>
			<div className="stock-card__actions">
				<span>{stock.change >= 0 ? "+" : ""}£{stock.change.toFixed(2)} today</span>
				<span className="linkish" onClick={(event) => {
					event.stopPropagation();
					onTrade(stock.ticker);
				}}>
					Trade
				</span>
			</div>
		</button>
	);
}
