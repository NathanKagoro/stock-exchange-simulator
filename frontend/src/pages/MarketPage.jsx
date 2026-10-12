// Market explorer: searchable list of every stock beside the selected stock's chart.

import { MainChart } from "../components/MainChart";
import { RecommendationPanel } from "../components/RecommendationPanel";
import { StockList } from "../components/StockList";

export function MarketPage({ onTrade }) {
	return (
		<div className="market-layout">
			<StockList onTrade={onTrade} />
			<div className="market-layout__main">
				<MainChart onTrade={onTrade} />
				<RecommendationPanel />
			</div>
		</div>
	);
}
