// Compact price-chunk codec shared by the build script (Node) and the browser.
//
// Prices are stored as integer "units" of 1/100 pence (so 222.72p -> 22272), which is
// exact because the source data is rounded to 2dp. A chunk covers a run of trading days
// for every stock, stock-major. Within each stock the first value is absolute and the
// rest are day-on-day deltas; each value is zigzag-encoded and written as a LEB128
// varint. The result is gzip-compressed at build time (see scripts/build-data.mjs).

export const UNITS_PER_POUND = 10000; // 100 pence * 100 sub-units
export const UNITS_PER_PENNY = 100;

export function penceToUnits(pence) {
	return Math.round(pence * UNITS_PER_PENNY);
}

/** @param {ArrayLike<number>[]} seriesUnits one integer array per stock, all the same length */
export function encodeChunk(seriesUnits) {
	const bytes = [];
	for (const series of seriesUnits) {
		let previous = 0;
		for (let day = 0; day < series.length; day += 1) {
			const delta = series[day] - previous;
			previous = series[day];
			// Zigzag maps signed ints onto unsigned so small negatives stay small.
			let zig = delta >= 0 ? delta * 2 : -delta * 2 - 1;
			while (zig >= 0x80) {
				bytes.push((zig % 0x80) | 0x80);
				zig = Math.floor(zig / 0x80);
			}
			bytes.push(zig);
		}
	}
	return Uint8Array.from(bytes);
}

/**
 * Decodes a chunk into `out[stock]` starting at `offset` days.
 * @param {Uint8Array} bytes  uncompressed chunk bytes
 * @param {number} stockCount
 * @param {number} dayCount   days in this chunk
 * @param {Int32Array[]} [out] optional destination arrays (one per stock)
 * @param {number} [offset]   day index in `out` where this chunk starts
 */
export function decodeChunk(bytes, stockCount, dayCount, out, offset = 0) {
	const target = out ?? Array.from({ length: stockCount }, () => new Int32Array(dayCount));
	let position = 0;
	for (let stock = 0; stock < stockCount; stock += 1) {
		const series = target[stock];
		let value = 0;
		for (let day = 0; day < dayCount; day += 1) {
			let zig = 0;
			let scale = 1;
			let byte;
			do {
				byte = bytes[position];
				position += 1;
				zig += (byte & 0x7f) * scale;
				scale *= 0x80;
			} while (byte & 0x80);
			value += zig % 2 === 0 ? zig / 2 : -(zig + 1) / 2;
			series[offset + day] = value;
		}
	}
	if (position !== bytes.length) {
		throw new Error(`Chunk decode mismatch: consumed ${position} of ${bytes.length} bytes`);
	}
	return target;
}
