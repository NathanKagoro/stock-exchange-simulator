// Converts daily prices into minute-level simulated data
// Implements interpolation + noise logic

function interpolateDailyToIntraday(points, intervalsPerDay = 6) {
	if (!Array.isArray(points) || points.length < 2) {
		return points ?? [];
	}

	const intradaySeries = [];

	for (let index = 0; index < points.length - 1; index += 1) {
		const currentPoint = points[index];
		const nextPoint = points[index + 1];

		for (let step = 0; step < intervalsPerDay; step += 1) {
			const progress = step / intervalsPerDay;
			const baseline = currentPoint.close + (nextPoint.close - currentPoint.close) * progress;
			const deterministicNoise = Math.sin(index + step) * 0.003 * currentPoint.close;

			intradaySeries.push({
				date: currentPoint.date,
				close: Number((baseline + deterministicNoise).toFixed(2)),
			});
		}
	}

	intradaySeries.push(points[points.length - 1]);
	return intradaySeries;
}

module.exports = {
	interpolateDailyToIntraday,
};
