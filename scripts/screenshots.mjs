#!/usr/bin/env node
// Phone + desktop screenshots of the built app (CI artifact). Requires `playwright`
// and a running `node scripts/serve-dist.mjs 4173`.
import fs from "node:fs";
import { chromium } from "playwright";

const URL = process.env.APP_URL ?? "http://localhost:4173/stock/";
const OUT = process.env.OUT ?? "screenshots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const viewports = {
	desktop: { viewport: { width: 1440, height: 900 } },
	phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
	phone360: { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
let failed = false;
for (const [name, options] of Object.entries(viewports)) {
	const page = await browser.newPage(options);
	page.on("pageerror", (error) => {
		console.error(name, error.message);
		failed = true;
	});
	await page.goto(URL, { waitUntil: "networkidle" });
	await page.waitForSelector(".metric-card__value");
	await page.screenshot({ path: `${OUT}/stock-${name}-portfolio.png` });
	await page.click('a[href$="/market"]');
	await page.waitForSelector(".stock-row");
	await page.screenshot({ path: `${OUT}/stock-${name}-market.png` });
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
	if (overflow > 0) {
		console.error(`${name}: ${overflow}px horizontal overflow`);
		failed = true;
	}
	await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
