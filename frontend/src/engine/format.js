// Money / number formatting. All money in the engine is held as integer pennies.

const MINUS = "−";

const gbp = new Intl.NumberFormat("en-GB", {
	style: "currency",
	currency: "GBP",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const gbpCompact = new Intl.NumberFormat("en-GB", {
	style: "currency",
	currency: "GBP",
	notation: "compact",
	maximumFractionDigits: 1,
});
const pence = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function withSign(text, value, { showPlus = false } = {}) {
	if (value < 0) return `${MINUS}${text}`;
	if (showPlus && value > 0) return `+${text}`;
	return text;
}

/** £1,234.56 / −£5.00 from integer pennies. */
export function formatMoney(pennies, options = {}) {
	const pounds = pennies / 100;
	return withSign(gbp.format(Math.abs(pounds)), Math.round(pennies), options);
}

export function formatMoneyCompact(pennies) {
	const pounds = pennies / 100;
	return withSign(gbpCompact.format(Math.abs(pounds)), pennies);
}

/**
 * Share prices. Source data is quoted in pence (LSE convention). Prices of £1 or more
 * are shown in pounds; sub-£1 prices are shown in pence so penny stocks don't all read £0.00.
 * @param {number} units price in 1/100 pence
 */
export function formatPrice(units) {
	const pencePrice = units / 100;
	if (Math.abs(pencePrice) >= 100) {
		return withSign(gbp.format(Math.abs(pencePrice) / 100), pencePrice);
	}
	return withSign(`${pence.format(Math.abs(pencePrice))}p`, pencePrice);
}

export function formatPercent(value, options = { showPlus: true }) {
	if (!Number.isFinite(value)) return "—";
	return withSign(`${percent.format(Math.abs(value))}%`, Number(value.toFixed(2)), options);
}

export function formatInteger(value) {
	return integer.format(value);
}

export function trendArrow(value) {
	if (value > 0) return "▲";
	if (value < 0) return "▼";
	return "■";
}

export function trendClass(value) {
	if (value > 0) return "up";
	if (value < 0) return "down";
	return "flat";
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthOnly = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

export function formatDate(iso) {
	if (!iso) return "";
	return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}

/** "Aug ’16" — unambiguous month + year for axis ticks. */
export function formatShortDate(iso) {
	if (!iso) return "";
	return `${monthOnly.format(new Date(`${iso}T00:00:00Z`))} \u2019${iso.slice(2, 4)}`;
}
