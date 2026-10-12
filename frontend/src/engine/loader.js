// Fetches the static price data produced by scripts/build-data.mjs.

import { createMarket, ingestChunk } from "./market.js";

const DATA_BASE = `${import.meta.env?.BASE_URL ?? "/"}data/`;

async function gunzip(buffer) {
	const bytes = new Uint8Array(buffer);
	// A CDN may already have removed the gzip layer; only inflate when the magic is present.
	if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
	if (typeof DecompressionStream === "function") {
		const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
		return new Uint8Array(await new Response(stream).arrayBuffer());
	}
	const { gunzipSync } = await import("fflate");
	return gunzipSync(bytes);
}

async function fetchChunk(chunk) {
	const response = await fetch(`${DATA_BASE}${chunk.file}?v=${chunk.hash}`);
	if (!response.ok) throw new Error(`Could not load ${chunk.file} (${response.status})`);
	return gunzip(await response.arrayBuffer());
}

/**
 * Loads meta plus every chunk needed to show `untilDay`, then streams the rest in the
 * background. `onProgress(market)` fires each time more days become available.
 */
export async function loadMarket({ untilDay = 0, onProgress } = {}) {
	const response = await fetch(`${DATA_BASE}meta.json`);
	if (!response.ok) throw new Error(`Could not load market data (${response.status})`);
	const meta = await response.json();
	const market = createMarket(meta);

	const target = Math.min(Math.max(0, untilDay), market.dayCount - 1);
	const firstChunks = meta.chunks.filter((chunk) => chunk.start <= target);
	const firstBytes = await Promise.all(firstChunks.map(fetchChunk));
	firstChunks.forEach((chunk, i) => ingestChunk(market, chunk, firstBytes[i]));

	const rest = meta.chunks.filter((chunk) => chunk.start > target);
	const background = (async () => {
		for (const chunk of rest) {
			const bytes = await fetchChunk(chunk);
			ingestChunk(market, chunk, bytes);
			onProgress?.(market);
		}
	})();

	return { market, background };
}
