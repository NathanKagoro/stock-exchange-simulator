// Main landing page: portfolio summary, holdings, equity curve, trading and signals.

import { formatDate, formatMoney, formatPercent, formatPrice } from "../engine/format";
import { useValuation } from "../state/hooks";
import { useAppStore } from "../state/store";
import { PortfolioChart } from "../components/PortfolioChart";
import { RecommendationPanel } from "../components/RecommendationPanel";
import { TradePanel } from "../components/TradePanel";
import { Delta } from "../components/ui";

function Metrics() {
	const valuation = useValuation();
	if (!valuation) return null;
	return (
		<section className="metrics-grid" aria-label="Portfolio summary">
			<article className="glass-card metric-card metric-card--hero">
				<p className="eyebrow">Portfolio value</p>
				<p className="metric-card__value num">{formatMoney(valuation.totalValue)}</p>
				<Delta value={valuation.pnl} className="metric-card__sub">
					<span className="num">
						{formatMoney(Math.abs(valuation.pnl))} ({formatPercent(Math.abs(valuation.pnlPct), { showPlus: false })})
					</span>{" "}
					since start
				</Delta>
			</article>
			<article className="glass-card metric-card">
				<p className="eyebrow">Cash</p>
				<p className="metric-card__value num">{formatMoney(valuation.cash)}</p>
				<span className="metric-card__sub muted num">
					{formatPercent((valuation.cash / Math.max(1, valuation.totalValue)) * 100, { showPlus: false })} of portfolio
				</span>
			</article>
			<article className="glass-card metric-card">
				<p className="eyebrow">Invested</p>
				<p className="metric-card__value num">{formatMoney(valuation.holdingsValue)}</p>
				<span className="metric-card__sub muted num">
					{valuation.holdings.length} position{valuation.holdings.length === 1 ? "" : "s"}
				</span>
			</article>
		</section>
	);
}

function Holdings({ onTrade }) {
	const valuation = useValuation();
	if (!valuation) return null;
	return (
		<section className="glass-card holdings-panel" aria-label="Holdings">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Holdings</p>
					<h2>Current positions</h2>
				</div>
			</div>
			{valuation.holdings.length === 0 ? (
				<p className="empty-state">No positions. Pick a stock from the Market tab or the trade panel.</p>
			) : (
				<div className="table-wrapper">
					<table className="num">
						<thead>
							<tr>
								<th scope="col">Stock</th>
								<th scope="col" className="r">Shares</th>
								<th scope="col" className="r hide-sm">Avg cost</th>
								<th scope="col" className="r">Price</th>
								<th scope="col" className="r hide-sm">Value</th>
								<th scope="col" className="r">P&amp;L</th>
							</tr>
						</thead>
						<tbody>
							{valuation.holdings.map((holding) => (
								<tr key={holding.ticker}>
									<th scope="row">
										<button type="button" className="table-link" onClick={() => onTrade(holding.ticker)}>
											<strong>{holding.ticker}</strong>
											<span>{holding.name}</span>
										</button>
									</th>
									<td className="r">{holding.shares.toLocaleString("en-GB")}</td>
									<td className="r hide-sm">{formatPrice(holding.averagePriceUnits)}</td>
									<td className="r">{formatPrice(holding.priceUnits)}</td>
									<td className="r hide-sm">{formatMoney(holding.marketValue)}</td>
									<td className="r">
										<Delta value={holding.pnl}>{formatMoney(Math.abs(holding.pnl))}</Delta>
										<span className="cell-sub">{formatPercent(holding.pnlPct)}</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}

function Transactions() {
	const ledger = useAppStore((s) => s.ledger);
	const market = useAppStore((s) => s.market);
	const day = useAppStore((s) => s.day);
	if (!market) return null;
	const recent = ledger.filter((entry) => entry.index <= day).slice(-8).reverse();
	return (
		<section className="glass-card holdings-panel" aria-label="Recent transactions">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Activity</p>
					<h2>Recent trades</h2>
				</div>
			</div>
			<ul className="tx-list num">
				{recent.map((entry) => (
					<li key={entry.id}>
						<span className={`tx-tag tx-tag--${entry.type}`}>{entry.type === "seed" ? "start" : entry.type}</span>
						<span className="tx-main">
							<strong>
								{entry.quantity.toLocaleString("en-GB")} {entry.ticker}
							</strong>
							<span className="muted">
								@ {formatPrice(entry.priceUnits)} · {formatDate(market.dates[entry.index])}
							</span>
						</span>
						<span className="tx-total">
							{entry.type === "sell" ? "+" : "−"}
							{formatMoney(entry.total)}
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}

export function PortfolioPage({ onTrade }) {
	return (
		<div className="page-shell">
			<Metrics />
			<section className="portfolio-layout">
				<div className="portfolio-layout__main">
					<PortfolioChart />
					<Holdings onTrade={onTrade} />
					<Transactions />
				</div>
				<div className="portfolio-layout__side">
					<TradePanel />
					<RecommendationPanel />
				</div>
			</section>
		</div>
	);
}
