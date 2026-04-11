// Controls simulation playback
// Includes: play, pause, speed control, reset

const SPEED_OPTIONS = [1, 5, 10];

export function SimulationControls({
	currentIndex,
	totalDays,
	currentDate,
	speed,
	isPlaying,
	onToggle,
	onAdvance,
	onReset,
	onSpeedChange,
	onJump,
}) {
	return (
		<section className="glass-card simulation-controls">
			<div className="panel-header">
				<div>
					<p className="eyebrow">Replay Controls</p>
					<h2>{currentDate}</h2>
				</div>
				<div className="timeline-meta">
					Day {currentIndex + 1} / {totalDays}
				</div>
			</div>
			<input
				type="range"
				min="0"
				max={Math.max(0, totalDays - 1)}
				value={currentIndex}
				onChange={(event) => onJump(Number(event.target.value))}
			/>
			<div className="simulation-controls__actions">
				<button type="button" className="primary-button" onClick={onToggle}>
					{isPlaying ? "Pause" : "Play"}
				</button>
				<button type="button" className="secondary-button" onClick={() => onAdvance(1)}>
					Step
				</button>
				<button type="button" className="secondary-button" onClick={onReset}>
					Reset
				</button>
				<div className="speed-picker">
					{SPEED_OPTIONS.map((option) => (
						<button
							key={option}
							type="button"
							className={`speed-chip ${speed === option ? "active" : ""}`}
							onClick={() => onSpeedChange(option)}
						>
							{option}x
						</button>
					))}
				</div>
			</div>
		</section>
	);
}
