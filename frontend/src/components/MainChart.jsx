// Central chart displaying selected stock price over time
// Uses simulated minute-level data from backend
// Updates in real-time as simulation runs

import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export function MainChart({ series, selectedStock, currentIndex }) {
	return (
		<section className="glass-card chart-panel">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Market Replay</p>
					<h2>{selectedStock?.name ?? "Select a stock"}</h2>
				</div>
				<div className="panel-metric">
					<span>Visible sessions</span>
					<strong>{Math.max(0, currentIndex + 1)}</strong>
				</div>
			</div>
			<div className="chart-area">
				<ResponsiveContainer width="100%" height="100%">
					{/* Reference line marks the current replay day on full historical series. */}
					<LineChart data={series} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
						<CartesianGrid stroke="rgba(179, 136, 255, 0.08)" vertical={false} />
						<XAxis dataKey="date" tick={{ fill: "#d8d8e2", fontSize: 12 }} minTickGap={48} />
						<YAxis tick={{ fill: "#d8d8e2", fontSize: 12 }} width={72} />
						<Tooltip
							contentStyle={{
								background: "rgba(11, 11, 15, 0.95)",
								border: "1px solid rgba(179, 136, 255, 0.3)",
								borderRadius: 16,
							}}
						/>
						<ReferenceLine
							x={series[Math.min(currentIndex, Math.max(0, series.length - 1))]?.date}
							stroke="#B388FF"
							strokeDasharray="4 4"
						/>
						<Line
							type="monotone"
							dataKey="close"
							stroke="#B388FF"
							strokeWidth={3}
							dot={false}
							activeDot={{ r: 6, fill: "#6A0DAD" }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</section>
	);
}
