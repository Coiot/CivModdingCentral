const DEFAULT_PRIMARY_COLOR = "#243746";
const DEFAULT_SECONDARY_COLOR = "#f3d37f";

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
		const col = Number(candidate.col);
		const row = Number(candidate.row);
		if (!civ || !Number.isFinite(col) || !Number.isFinite(row)) {
			continue;
		}

		const normalizedCol = Math.floor(col);
		const normalizedRow = Math.floor(row);
		const civKey = normalizeToken(civ);
		const dedupeKey = `${normalizedCol},${normalizedRow}:${civKey}`;
		if (seen.has(dedupeKey)) {
			continue;
		}
		seen.add(dedupeKey);

		pins.push({
			id: String(candidate.id || `${civKey}-${normalizedCol}-${normalizedRow}`),
			civ,
			leader: String(candidate.leader || "").trim(),
			author: String(candidate.author || "").trim(),
			col: normalizedCol,
			row: normalizedRow,
			primary: sanitizeHexColor(candidate.primary, primaryFallback),
			secondary: sanitizeHexColor(candidate.secondary, secondaryFallback),
		});
	}

	return pins;
}

export function buildPinsSignature(input) {
	return normalizePins(input)
		.map((pin) => `${pin.col}|${pin.row}|${normalizeToken(pin.civ)}|${normalizeToken(pin.leader)}|${normalizeToken(pin.author)}|${pin.primary}|${pin.secondary}`)
		.sort((a, b) => a.localeCompare(b))
		.join(";");
}
