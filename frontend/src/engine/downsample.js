// Largest-Triangle-Three-Buckets downsampling: keeps the visual shape of a long series
// with a fixed number of points so charts stay cheap during playback.

/**
 * @param {Array<{x:number,y:number}>} points sorted by x
 * @param {number} threshold target point count
 */
export function lttb(points, threshold) {
	const length = points.length;
	if (threshold >= length || threshold < 3) return points;

	const sampled = [points[0]];
	const bucketSize = (length - 2) / (threshold - 2);
	let a = 0;

	for (let bucket = 0; bucket < threshold - 2; bucket += 1) {
		const nextStart = Math.floor((bucket + 1) * bucketSize) + 1;
		const nextEnd = Math.min(Math.floor((bucket + 2) * bucketSize) + 1, length);
		let avgX = 0;
		let avgY = 0;
		for (let i = nextStart; i < nextEnd; i += 1) {
			avgX += points[i].x;
			avgY += points[i].y;
		}
		const span = Math.max(1, nextEnd - nextStart);
		avgX /= span;
		avgY /= span;

		const rangeStart = Math.floor(bucket * bucketSize) + 1;
		const rangeEnd = Math.floor((bucket + 1) * bucketSize) + 1;
		const pointA = points[a];
		let maxArea = -1;
		let chosen = rangeStart;
		for (let i = rangeStart; i < rangeEnd; i += 1) {
			const area = Math.abs(
				(pointA.x - avgX) * (points[i].y - pointA.y) - (pointA.x - points[i].x) * (avgY - pointA.y)
			);
			if (area > maxArea) {
				maxArea = area;
				chosen = i;
			}
		}
		sampled.push(points[chosen]);
		a = chosen;
	}

	sampled.push(points[length - 1]);
	return sampled;
}
