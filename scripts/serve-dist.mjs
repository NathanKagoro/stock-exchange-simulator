#!/usr/bin/env node
// Minimal static server that mounts frontend/dist at /stock/ (as on nathankagoro.com),
// with gzip and SPA fallback. Used for local checks and CI screenshots.
//   node scripts/serve-dist.mjs [port]

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/dist");
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const BASE = "/stock/";
const TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".svg": "image/svg+xml",
	".png": "image/png",
	".bin": "application/octet-stream",
};

http
	.createServer((req, res) => {
		const url = new URL(req.url, "http://localhost");
		if (url.pathname === "/" || url.pathname === "/stock") {
			res.writeHead(302, { location: BASE }).end();
			return;
		}
		if (!url.pathname.startsWith(BASE)) {
			res.writeHead(404).end("not found");
			return;
		}
		let file = path.join(root, decodeURIComponent(url.pathname.slice(BASE.length)));
		if (!file.startsWith(root)) {
			res.writeHead(403).end();
			return;
		}
		if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
		const ext = path.extname(file);
		let body = fs.readFileSync(file);
		const headers = { "content-type": TYPES[ext] ?? "application/octet-stream" };
		// .bin chunks are already gzip-compressed by the data step.
		if (ext !== ".bin" && ext !== ".png" && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
			body = zlib.gzipSync(body);
			headers["content-encoding"] = "gzip";
		}
		headers["content-length"] = body.length;
		res.writeHead(200, headers).end(body);
	})
	.listen(port, () => console.log(`Serving ${root} at http://localhost:${port}${BASE}`));
