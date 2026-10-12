// Replay controls: play/pause, step, pace (days per tick), live timeline scrubbing.
// On phones this collapses into a compact bar pinned to the bottom of the screen.

import { formatDate, formatShortDate } from "../engine/format";
import { PACES, actions, useAppStore } from "../state/store";

function PlayIcon({ playing }) {
	return playing ? (
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
			<rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
		</svg>
	) : (
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
		</svg>
	);
}

function StepIcon({ back }) {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={back ? { transform: "scaleX(-1)" } : undefined}>
			<path d="M6 6v12l8.5-6z" fill="currentColor" />
			<rect x="16" y="6" width="2.4" height="12" rx="1" fill="currentColor" />
		</svg>
	);
}

export function SimulationControls() {
	const market = useAppStore((s) => s.market);
	const day = useAppStore((s) => s.day);
	const isPlaying = useAppStore((s) => s.isPlaying);
	const pace = useAppStore((s) => s.pace);
	const loadedDays = useAppStore((s) => s.loadedDays);

	const totalDays = market?.dayCount ?? 0;
	const date = market?.dates[day] ?? "";
	const loadedPct = totalDays ? (loadedDays / totalDays) * 100 : 0;
	const progressPct = totalDays > 1 ? (day / (totalDays - 1)) * 100 : 0;

	return (
		<section className="replay-bar glass-card" aria-label="Replay controls">
			<div className="replay-bar__date">
				<p className="eyebrow replay-bar__eyebrow">Replay date</p>
				<time dateTime={date} className="replay-bar__day">
					{formatDate(date)}
				</time>
				<span className="replay-bar__count num">
					Day {(day + 1).toLocaleString("en-GB")} of {totalDays.toLocaleString("en-GB")}
				</span>
			</div>

			<div className="replay-bar__timeline">
				<input
					type="range"
					className="timeline"
					min="0"
					max={Math.max(0, totalDays - 1)}
					value={day}
					disabled={!market}
					aria-label="Replay timeline"
					aria-valuetext={formatDate(date)}
					style={{ "--progress": `${progressPct}%`, "--loaded": `${loadedPct}%` }}
					onChange={(event) => actions.jump(Number(event.target.value))}
				/>
				<div className="timeline__labels" aria-hidden="true">
					<span>{formatShortDate(market?.dates[0])}</span>
					{loadedDays < totalDays ? <span className="timeline__loading">Loading later years…</span> : null}
					<span>{formatShortDate(market?.dates[totalDays - 1])}</span>
				</div>
			</div>

			<div className="replay-bar__buttons">
				<button
					type="button"
					className="icon-button"
					onClick={() => actions.step(-1)}
					disabled={!market || day === 0}
					aria-label="Back one day"
					title="Back one day (←)"
				>
					<StepIcon back />
				</button>
				<button
					type="button"
					className="play-button"
					onClick={actions.togglePlay}
					disabled={!market}
					aria-label={isPlaying ? "Pause replay" : "Play replay"}
					title={isPlaying ? "Pause (Space)" : "Play (Space)"}
				>
					<PlayIcon playing={isPlaying} />
				</button>
				<button
					type="button"
					className="icon-button"
					onClick={() => actions.step(1)}
					disabled={!market || day >= loadedDays - 1}
					aria-label="Forward one day"
					title="Forward one day (→)"
				>
					<StepIcon />
				</button>
			</div>

			<div className="replay-bar__pace" role="radiogroup" aria-label="Days per tick">
				<span className="replay-bar__pace-label">Each tick</span>
				{PACES.map((option) => (
					<button
						key={option.id}
						type="button"
						role="radio"
						aria-checked={pace === option.id}
						className={`chip ${pace === option.id ? "is-active" : ""}`}
						onClick={() => actions.setPace(option.id)}
						title={`Advance ${option.label} per tick`}
					>
						<span className="chip__long">{option.label}</span>
						<span className="chip__short" aria-hidden="true">
							{option.short}
						</span>
					</button>
				))}
			</div>

			<button type="button" className="ghost-button replay-bar__reset" onClick={actions.reset} disabled={!market}>
				Reset
			</button>
		</section>
	);
}
