// Momentum signals across the whole market: the strongest 7-trading-day risers and
// fallers as of the current replay day. A toy rule, clearly labelled as such.

import { formatPercent, formatPrice } from "../engine/format";
import { MOMENTUM_THRESHOLD } from "../engine/signals";
import { useSignals } from "../state/hooks";
import { actions } from "../state/store";
import { Delta } from "./ui";

function SignalList({ title, items, empty }) {
	return (
		<div className="signal-group">
			<h3>{title}</h3>
			{items.length === 0 ? (
				<p className="empty-state empty-state--inline">{empty}</p>
			) : (
				<ul className="signal-list">
					{items.map((item) => (
						<li key={item.ticker}>
							<button type="button" className="signal-item" onClick={() => actions.selectTicker(item.ticker)}>
								<span className="signal-item__id">
									<strong>{item.ticker}</strong>
									<span>{item.name}</span>
								</span>
								<span className="signal-item__nums num">
									<Delta value={item.change}>{formatPercent(Math.abs(item.change), { showPlus: false })}</Delta>
									<span className="muted">{formatPrice(item.priceUnits)}</span>
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function RecommendationPanel() {
	const signals = useSignals(5);
	if (!signals) return null;
	return (
		<section className="glass-card signals-panel" aria-label="Momentum signals">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Momentum signals</p>
					<h2>{signals.lookback}-day movers</h2>
				</div>
			</div>
			<p className="panel-note">
				Stocks moving more than {MOMENTUM_THRESHOLD}% over the last {signals.lookback} trading days, out of{" "}
				<span className="num">{signals.scanned.toLocaleString("en-GB")}</span> scanned. Past momentum is not a
				prediction.
			</p>
			<SignalList title="Rising" items={signals.rising} empty="Nothing up more than the threshold yet." />
			<SignalList title="Falling" items={signals.falling} empty="Nothing down more than the threshold yet." />
		</section>
	);
}
