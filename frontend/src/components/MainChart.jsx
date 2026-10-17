// Price chart for the selected stock. Only shows history up to the current replay day
// (no peeking at the future) and is downsampled to ~400 points so playback stays smooth.

import { memo, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { lttb } from "../engine/downsample";
import { formatDate, formatPercent, formatPrice, formatShortDate } from "../engine/format";
import { useSelectedStock } from "../state/hooks";
import { actions, useAppStore } from "../state/store";
import { Delta, StarIcon } from "./ui";

const MAX_POINTS = 400;
const RANGES = [
	{ id: "3m", label: "3M", days: 63 },
	{ id: "1y", label: "1Y", days: 252 },
	{ id: "all", label: "All", days: Infinity },
];

function ChartTooltip({ active, payload, dates }) {
	if (!active || !payload?.length) return null;
	const point = payload[0].payload;
	return (
		<div className="chart-tooltip">
			<span>{formatDate(dates[point.x])}</span>
			<strong className="num">{formatPrice(point.units)}</strong>
		</div>
	);
}

const PriceChart = memo(function PriceChart({ data, dates, up }) {
	const colour = up ? "var(--positive)" : "var(--negative)";
	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
				<defs>
					<linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#b388ff" stopOpacity={0.35} />
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
					dataKey="units"
					domain={["auto", "auto"]}
					tickFormatter={(units) => formatPrice(units)}
					tick={{ fill: "var(--muted)", fontSize: 12 }}
					tickLine={false}
					axisLine={false}
					width={78}
				/>
				<Tooltip content={<ChartTooltip dates={dates} />} cursor={{ stroke: "rgba(179,136,255,0.4)" }} isAnimationActive={false} />
				<Area
					type="linear"
					dataKey="units"
					stroke="#b388ff"
					strokeWidth={2}
					fill="url(#priceFill)"
					dot={false}
					activeDot={{ r: 4, fill: colour, stroke: "#0b0b0f" }}
					isAnimationActive={false}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
});

export function MainChart({ onTrade }) {
	const market = useAppStore((s) => s.market);
	const day = useAppStore((s) => s.day);
	const watched = useAppStore((s) => s.watchlist.includes(s.selectedTicker));
	const stock = useSelectedStock();
	const [range, setRange] = useState("1y");

	const data = useMemo(() => {
		if (!market || !stock) return [];
		const series = market.prices[stock.index];
		const span = RANGES.find((r) => r.id === range)?.days ?? Infinity;
		const from = Number.isFinite(span) ? Math.max(0, day - span + 1) : 0;
		const points = [];
		for (let x = from; x <= day; x += 1) points.push({ x, units: series[x] });
		return lttb(points, MAX_POINTS);
	}, [market, stock, day, range]);

	if (!market || !stock) return null;
	const series = market.prices[stock.index];
	const price = series[day];
	const first = data[0]?.units ?? price;
	const rangeChange = first ? ((price - first) / first) * 100 : 0;
	const dayChange = day > 0 && series[day - 1] ? ((price - series[day - 1]) / series[day - 1]) * 100 : 0;

	return (
		<section className="glass-card chart-panel" aria-label={`${stock.name} price chart`}>
			<div className="chart-panel__head">
				<div className="chart-panel__title">
					<p className="eyebrow">{stock.ticker}</p>
					<h2>{stock.name}</h2>
				</div>
				<div className="chart-panel__actions">
					<button
						type="button"
						className={`star-button ${watched ? "is-on" : ""}`}
						aria-pressed={watched}
						aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
						onClick={() => actions.toggleWatch(stock.ticker)}
					>
						<StarIcon filled={watched} />
					</button>
					{onTrade ? (
						<button type="button" className="primary-button" onClick={() => onTrade(stock.ticker)}>
							Trade {stock.ticker}
						</button>
					) : null}
				</div>
			</div>
			<div className="chart-panel__stats">
				<strong className="chart-panel__price num">{formatPrice(price)}</strong>
				<Delta value={dayChange}>
					<span className="num">{formatPercent(Math.abs(dayChange), { showPlus: false })}</span> today
				</Delta>
				<Delta value={rangeChange}>
					<span className="num">{formatPercent(Math.abs(rangeChange), { showPlus: false })}</span> over{" "}
					{range === "all" ? "replay" : RANGES.find((r) => r.id === range).label}
				</Delta>
				<div className="segmented" role="radiogroup" aria-label="Chart range">
					{RANGES.map((option) => (
						<button
							key={option.id}
							type="button"
							role="radio"
							aria-checked={range === option.id}
							className={range === option.id ? "is-active" : ""}
							onClick={() => setRange(option.id)}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>
			<div className="chart-area">
				{data.length > 1 ? (
					<PriceChart data={data} dates={market.dates} up={rangeChange >= 0} />
				) : (
					<p className="empty-state">Press play to start the replay. The chart fills in as the days pass.</p>
				)}
			</div>
		</section>
	);
}
