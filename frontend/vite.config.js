import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
	// Served from nathankagoro.com/stock/ in production; / in local development.
	base: command === "build" ? "/stock/" : "/",
	plugins: [react()],
	build: {
		rollupOptions: {
			output: {
				// Separate rarely-changing vendor code so app updates don't bust its cache.
				manualChunks(id) {
					if (!id.includes("node_modules")) return undefined;
					if (/recharts|d3-|victory-vendor|lodash|react-smooth|decimal\.js|eventemitter3/.test(id)) return "charts";
					if (/react|scheduler|zustand|@remix-run/.test(id)) return "react";
					return undefined;
				},
			},
		},
	},
}));
