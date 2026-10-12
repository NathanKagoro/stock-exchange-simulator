// Portfolio value over time, up to the current replay day.

import { memo, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { lttb } from "../engine/downsample";
import { formatDate, formatMoney, formatMoneyCompact, formatShortDate } from "../engine/format";
import { INITIAL_CASH_PENNIES } from "../engine/portfolio";
import { useEquityCurve } from "../state/hooks";
import { useAppStore } from "../state/store";

const MAX_POINTS = 400;

function EquityTooltip({ active, payload, dates }) {
	if (!active || !payload?.length) return null;
	const point = payload[0].payload;
	return (
		<div className="chart-tooltip">
			<span>{formatDate(dates[point.x])}</span>
			<strong className="num">{formatMoney(point.value)}</strong>
		</div>
	);
}

const EquityChart = memo(function EquityChart({ data, dates }) {
	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
				<defs>
					<linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#b388ff" stopOpacity={0.45} />
						<stop offset="100%" stopColor="#b388ff" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid stroke="rgba(179, 136, 255, 0.08)" vertical={false} />
				<XAxis
					dataKey="x"
					type="number"
					domain={["dataMin", "dataMax"]}
					tickFormatter={(x) => formatShortDate(dates[x])}
					tick={{ fill: "var(--muted)", fontSize: 12 }}
					tickLine={false}
					axisLine={false}
					minTickGap={56}
				/>
				<YAxis
					domain={["auto", "auto"]}
					tickFormatter={formatMoneyCompact}
					tick={{ fill: "var(--muted)", fontSize: 12 }}
					tickLine={false}
					axisLine={false}
					width={64}
				/>
				<ReferenceLine y={INITIAL_CASH_PENNIES} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" />
				<Tooltip content={<EquityTooltip dates={dates} />} cursor={{ stroke: "rgba(179,136,255,0.4)" }} isAnimationActive={false} />
				<Area type="linear" dataKey="value" stroke="#b388ff" strokeWidth={2} fill="url(#equityFill)" isAnimationActive={false} />
			</AreaChart>
		</ResponsiveContainer>
	);
});

export function PortfolioChart() {
	const market = useAppStore((s) => s.market);
	const day = useAppStore((s) => s.day);
	const curve = useEquityCurve();

	const data = useMemo(() => {
		const last = Math.min(day, curve.length - 1);
		const points = [];
		for (let x = 0; x <= last; x += 1) points.push({ x, value: curve[x] });
		return lttb(points, MAX_POINTS);
	}, [curve, day]);

	return (
		<section className="glass-card chart-panel" aria-label="Portfolio value over time">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Performance</p>
					<h2>Portfolio value</h2>
				</div>
				<span className="legend-note">
					<span className="legend-dash" aria-hidden="true" /> £100,000 start
				</span>
			</div>
			<div className="chart-area chart-area--short">
				{data.length > 1 && market ? (
					<EquityChart data={data} dates={market.dates} />
				) : (
					<p className="empty-state">Your equity curve appears once the replay moves past day one.</p>
				)}
			</div>
		</section>
	);
}
