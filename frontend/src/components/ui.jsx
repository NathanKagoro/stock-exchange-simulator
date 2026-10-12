// Small presentational helpers shared across panels.

import { trendArrow, trendClass } from "../engine/format";

/** Up/down value with arrow + colour (never colour alone). */
export function Delta({ value, children, className = "" }) {
	const direction = trendClass(value);
	const label = direction === "up" ? "up" : direction === "down" ? "down" : "unchanged";
	return (
		<span className={`delta delta--${direction} ${className}`}>
			<span aria-hidden="true" className="delta__arrow">
				{trendArrow(value)}
			</span>
			<span className="sr-only">{label} </span>
			{children}
		</span>
	);
}

/** Sparkline scaled to its own min/max so small moves are visible. */
export function Sparkline({ values, className = "", width = 120, height = 36 }) {
	if (!values || values.length < 2) {
		return <svg className={`sparkline ${className}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" />;
	}
	let min = Infinity;
	let max = -Infinity;
	for (const v of values) {
		if (v < min) min = v;
		if (v > max) max = v;
	}
	const span = max - min || 1;
	const pad = 3;
	const step = (width - pad * 2) / (values.length - 1);
	let d = "";
	for (let i = 0; i < values.length; i += 1) {
		const x = pad + i * step;
		const y = max === min ? height / 2 : pad + (1 - (values[i] - min) / span) * (height - pad * 2);
		d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
	}
	const direction = trendClass(values[values.length - 1] - values[0]);
	return (
		<svg
			className={`sparkline sparkline--${direction} ${className}`}
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path d={d} vectorEffect="non-scaling-stroke" />
		</svg>
	);
}

export function StarIcon({ filled }) {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6-4.5-4.2 6.1-.8z"
				fill={filled ? "currentColor" : "none"}
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
