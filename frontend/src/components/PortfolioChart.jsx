// Displays total portfolio value over time
// Updates as user buys/sells and simulation progresses

import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export function PortfolioChart({ history }) {
	return (
		<section className="glass-card chart-panel">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Portfolio Performance</p>
					<h2>Equity Curve</h2>
				</div>
			</div>
			<div className="chart-area">
				<ResponsiveContainer width="100%" height="100%">
					{/* Area chart emphasizes cumulative effect of trade decisions over time. */}
					<AreaChart data={history} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
						<defs>
							<linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#B388FF" stopOpacity={0.6} />
								<stop offset="95%" stopColor="#B388FF" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid stroke="rgba(179, 136, 255, 0.08)" vertical={false} />
						<XAxis dataKey="date" tick={{ fill: "#d8d8e2", fontSize: 12 }} minTickGap={48} />
						<YAxis tick={{ fill: "#d8d8e2", fontSize: 12 }} width={76} />
						<Tooltip
							contentStyle={{
								background: "rgba(11, 11, 15, 0.95)",
								border: "1px solid rgba(179, 136, 255, 0.3)",
								borderRadius: 16,
							}}
						/>
						<Area type="monotone" dataKey="totalValue" stroke="#B388FF" fill="url(#portfolioGradient)" />
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</section>
	);
}
