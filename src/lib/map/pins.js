const DEFAULT_PRIMARY_COLOR = "#243746";
const DEFAULT_SECONDARY_COLOR = "#f3d37f";

function normalizeIslandFlag(value) {
	if (value === true) {
		return true;
	}
	if (value === false || value === null || value === undefined) {
		return false;
	}
	if (typeof value === "number") {
		return value === 1;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
	}
	return false;
}

export function sanitizeHexColor(color, fallback) {
	if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
		return color;
	}
	return fallback;
}

export function parseHexInput(value) {
	const normalized = String(value || "")
		.trim()
		.replace(/^#/, "");
	if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
		return null;
	}
	return `#${normalized.toUpperCase()}`;
}

export function normalizeToken(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-");
}

export function normalizePins(input, options = {}) {
	if (!Array.isArray(input)) {
		return [];
	}

	const primaryFallback = options.defaultPrimary || DEFAULT_PRIMARY_COLOR;
	const secondaryFallback = options.defaultSecondary || DEFAULT_SECONDARY_COLOR;
	const seen = new Set();
	const pins = [];

	for (let index = 0; index < input.length; index += 1) {
		const candidate = input[index];
		if (!candidate || typeof candidate !== "object") {
			continue;
		}

		const civ = String(candidate.civ || "").trim();
		const source = String(candidate.source || "")
			.trim()
			.toLowerCase();
		const col = Number(candidate.col);
		const row = Number(candidate.row);
		if (!civ || !Number.isFinite(col) || !Number.isFinite(row)) {
			continue;
		}

		const normalizedCol = Math.floor(col);
		const normalizedRow = Math.floor(row);
		const civKey = normalizeToken(civ);
		const leader = String(candidate.leader || "").trim();
		const capital = String(candidate.capital || "").trim();
		const author = String(candidate.author || "").trim();
		const gameDefineName = String(candidate.gameDefineName || "").trim();
		const leaderKey = normalizeToken(leader);
		const capitalKey = normalizeToken(capital);
		const explicitId = String(candidate.id || "").trim();
		const fallbackId = `${civKey || "civ"}-${leaderKey || "leader"}-${capitalKey || "capital"}-${normalizedCol}-${normalizedRow}`;
		const pinId = explicitId || fallbackId;
		const sourceKey = source ? `:${source}` : "";
		const dedupeKey = explicitId ? `id:${explicitId}${sourceKey}` : `${normalizedCol},${normalizedRow}:${civKey}:${leaderKey}:${capitalKey}${sourceKey}`;
		if (seen.has(dedupeKey)) {
			continue;
		}
		seen.add(dedupeKey);

		pins.push({
			id: pinId,
			viewId: String(candidate.viewId || pinId),
			civ,
			source,
			gameDefineName,
			leader,
			capital,
			author,
			col: normalizedCol,
			row: normalizedRow,
			primary: sanitizeHexColor(candidate.primary, primaryFallback),
			secondary: sanitizeHexColor(candidate.secondary, secondaryFallback),
			isIsland: normalizeIslandFlag(candidate.isIsland),
		});
	}

	return pins;
}

export function buildPinsSignature(input) {
	return normalizePins(input)
		.map(
			(pin) =>
				`${pin.col}|${pin.row}|${normalizeToken(pin.civ)}|${normalizeToken(pin.gameDefineName)}|${normalizeToken(pin.leader)}|${normalizeToken(
					pin.capital,
				)}|${normalizeToken(pin.author)}|${pin.primary}|${pin.secondary}|${pin.isIsland ? "1" : "0"}|${String(pin.id || "")}`,
		)
		.sort((a, b) => a.localeCompare(b))
		.join(";");
}
