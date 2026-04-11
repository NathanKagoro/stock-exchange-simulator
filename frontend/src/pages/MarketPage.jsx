// Market overview page
// Displays multiple StockCards and main chart
// Allows user to explore stocks and navigate to trading

import { MainChart } from "../components/MainChart";
import { StockCard } from "../components/StockCard";

export function MarketPage({
	marketStocks,
	marketSeries,
	selectedTicker,
	simulation,
	onSelectTicker,
	onTradeTicker,
}) {
	const selectedStock = marketStocks.find((stock) => stock.ticker === selectedTicker) ?? null;

	return (
		<div className="page-shell">
			<section className="stock-grid">
				{/* Long rail keeps discovery broad while preserving compact card size. */}
				{marketStocks.slice(0, 24).map((stock) => (
					<StockCard
						key={stock.ticker}
						stock={stock}
						active={stock.ticker === selectedTicker}
						onSelect={onSelectTicker}
						onTrade={onTradeTicker}
					/>
				))}
			</section>
			<MainChart
				series={marketSeries}
				selectedStock={selectedStock}
				currentIndex={simulation.currentIndex}
			/>
		</div>
	);
}
