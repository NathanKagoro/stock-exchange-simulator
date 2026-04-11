// Main user page (default landing page)
// Shows:
// - portfolio value
// - holdings
// - trade panel
// - recommendations

import { PortfolioChart } from "../components/PortfolioChart";
import { RecommendationPanel } from "../components/RecommendationPanel";
import { TradePanel } from "../components/TradePanel";

export function PortfolioPage({
	portfolio,
	marketStocks,
	selectedTicker,
	onSelectTicker,
	onTrade,
	recommendations,
}) {
	return (
		<div className="page-shell portfolio-shell">
			<section className="metrics-grid">
				<article className="glass-card metric-card">
					<p className="eyebrow">Portfolio Value</p>
					<h2>£{portfolio.totalValue.toFixed(2)}</h2>
				</article>
				<article className="glass-card metric-card">
					<p className="eyebrow">Cash</p>
					<h2>£{portfolio.cash.toFixed(2)}</h2>
				</article>
				<article className="glass-card metric-card">
					<p className="eyebrow">P&L</p>
					<h2 className={portfolio.pnl >= 0 ? "positive-text" : "negative-text"}>
						{portfolio.pnl >= 0 ? "+" : ""}£{portfolio.pnl.toFixed(2)}
					</h2>
				</article>
			</section>
			<section className="portfolio-layout">
				<div className="portfolio-layout__main">
					<section className="glass-card holdings-panel">
						<div className="panel-header">
							<div>
								<p className="eyebrow">Holdings</p>
								<h2>Current Positions</h2>
							</div>
						</div>
						<div className="table-wrapper">
							<table>
								<thead>
									<tr>
										<th>Stock</th>
										<th>Shares</th>
										<th>Avg Price</th>
										<th>Current Price</th>
										<th>P&amp;L</th>
									</tr>
								</thead>
								<tbody>
									{portfolio.holdings.map((holding) => (
										<tr key={holding.ticker}>
											<td>
												<strong>{holding.ticker}</strong>
												<span>{holding.name}</span>
											</td>
											<td>{holding.shares}</td>
											<td>£{holding.averagePrice.toFixed(2)}</td>
											<td>£{holding.currentPrice.toFixed(2)}</td>
											<td className={holding.pnl >= 0 ? "positive-text" : "negative-text"}>
												{holding.pnl >= 0 ? "+" : ""}£{holding.pnl.toFixed(2)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
					<PortfolioChart history={portfolio.history} />
				</div>
				<div className="portfolio-layout__side">
					<TradePanel
						stocks={marketStocks}
						selectedTicker={selectedTicker}
						onSelectTicker={onSelectTicker}
						onTrade={onTrade}
					/>
					<RecommendationPanel recommendations={recommendations} onSelect={onSelectTicker} />
				</div>
			</section>
		</div>
	);
}
