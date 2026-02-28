import { tileCenter } from "./hex.js";

const PRIORITY_WEIGHT = {
	major: 3,
	standard: 2,
	minor: 1,
};

const PRIORITY_DEFAULT_MIN_ZOOM = {
	major: 0.85,
	standard: 1.05,
	minor: 1.3,
};

const DENSITY_MIN_PRIORITY = {
	minimal: 3,
	standard: 2,
	detailed: 1,
};
const DENSITY_ZOOM_UNLOCK = {
	minimal: {
		standard: 1.35,
		minor: Number.POSITIVE_INFINITY,
	},
	standard: {
		minor: 1.35,
	},
	detailed: {},
};

export function normalizeMapLabels(input) {
	if (!Array.isArray(input)) {
		return [];
	}

	const labels = [];
	for (let index = 0; index < input.length; index += 1) {
		const candidate = input[index];
		if (!candidate || typeof candidate !== "object") {
			continue;
		}
		const normalized = normalizeLabel(candidate, index);
		if (normalized) {
			labels.push(normalized);
		}
	}
	return labels;
}

function normalizeLabel(candidate, index) {
	const type = normalizeLabelType(candidate.type || candidate.kind);
	if (!type) {
		return null;
	}

	const name = String(candidate.name || "").trim();
	if (!name) {
		return null;
	}

	const priority = normalizePriority(candidate.priority);
	const minZoom = normalizeZoomBound(candidate.minZoom);
	const maxZoom = normalizeZoomBound(candidate.maxZoom);
	const id = String(candidate.id || `${type}-${slugifyLabelName(name)}-${index}`).trim();
	if (!id) {
		return null;
	}

	const base = {
		id,
		name,
		type,
		priority,
		variant: normalizeVariant(candidate.variant, type),
		size: normalizeSize(candidate.size),
		densityUnlock: normalizeDensityUnlock(candidate.densityUnlock || candidate.unlockZoom),
		minZoom,
		maxZoom,
	};

	if (type === "river") {
		const points = normalizeTilePoints(candidate.points);
		const anchor = normalizeTilePoint(candidate.anchor);
		if (points.length < 2 && !anchor) {
			return null;
		}
		return {
			...base,
			points,
			anchor,
			rotation: Number.isFinite(Number(candidate.rotation)) ? Number(candidate.rotation) : 0,
		};
	}

	const anchor = normalizeTilePoint(candidate.anchor);
	if (!anchor) {
		return null;
	}

	return {
		...base,
		anchor,
		rotation: Number.isFinite(Number(candidate.rotation)) ? Number(candidate.rotation) : 0,
	};
}

function normalizeLabelType(value) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (normalized === "river") {
		return "river";
	}
	if (normalized === "region") {
		return "region";
	}
	return "";
}

function normalizePriority(value) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (normalized === "major" || normalized === "minor") {
		return normalized;
	}
	return "standard";
}

function normalizeVariant(value, type) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (normalized === "water" || normalized === "land") {
		return normalized;
	}
	return type === "river" ? "water" : "land";
}

function normalizeSize(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return 1;
	}
	return clampNumber(parsed, 0.6, 2.4);
}

function normalizeDensityUnlock(value) {
	const numeric = Number(value);
	if (Number.isFinite(numeric)) {
		const clamped = clampNumber(numeric, 0, 10);
		return {
			minimal: clamped,
			standard: clamped,
			detailed: clamped,
		};
	}

	if (!value || typeof value !== "object") {
		return null;
	}
	const result = {};
	for (const key of ["minimal", "standard", "detailed"]) {
		const parsed = Number(value[key]);
		if (Number.isFinite(parsed)) {
			result[key] = clampNumber(parsed, 0, 10);
		}
	}
	return Object.keys(result).length ? result : null;
}

function normalizeTilePoint(point) {
	if (!point || typeof point !== "object") {
		return null;
	}
	const col = Number(point.col);
	const row = Number(point.row);
	if (!Number.isFinite(col) || !Number.isFinite(row)) {
		return null;
	}
	return {
		col: Math.floor(col),
		row: Math.floor(row),
	};
}

function normalizeTilePoints(input) {
	if (!Array.isArray(input)) {
		return [];
	}
	const points = [];
	for (const entry of input) {
		const point = normalizeTilePoint(entry);
		if (point) {
			points.push(point);
		}
	}
	return points;
}

function numberOrNull(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeZoomBound(value) {
	const parsed = numberOrNull(value);
	if (!Number.isFinite(parsed)) {
		return null;
	}
	// Backward compatibility: some stored labels used percent values (e.g. 120 for 1.2x).
	const normalized = parsed > 10 ? parsed / 100 : parsed;
	return clampNumber(normalized, 0, 10);
}

function slugifyLabelName(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function materializeMapLabels(labels, { baseData, mapMetrics, hexSize }) {
	if (!Array.isArray(labels) || !baseData || !mapMetrics) {
		return [];
	}

	const height = Number(baseData.height || 0);
	const size = Number(hexSize || 14);
	if (!height || !size) {
		return [];
	}

	const materialized = [];
	for (const label of labels) {
		if (label.type === "river") {
			const typography = computeLabelTypography(label);
			const worldPoints = label.points.map((point) => tilePointToWorld(point, { height, size, mapMetrics })).filter(Boolean);
			const hasPath = worldPoints.length >= 2;
			const midpoint = hasPath ? midpointAlongPolyline(worldPoints) : tilePointToWorld(label.anchor, { height, size, mapMetrics });
			if (!midpoint || !Number.isFinite(midpoint.x) || !Number.isFinite(midpoint.y)) {
				continue;
			}
			const fontSize = typography.fontSize;
			const width = estimateLabelWidth(label.name, fontSize, typography.letterSpacing);
			const heightEstimate = fontSize * 1.3;
			materialized.push({
				...label,
				points: hasPath ? worldPoints : [],
				pathD: hasPath ? pointsToPathD(worldPoints) : "",
				hasPath,
				fontSize,
				letterSpacing: typography.letterSpacing,
				x: midpoint.x,
				y: midpoint.y,
				bbox: centeredBox(midpoint.x, midpoint.y, width, heightEstimate),
			});
			continue;
		}

		const worldAnchor = tilePointToWorld(label.anchor, { height, size, mapMetrics });
		if (!worldAnchor) {
			continue;
		}
		const typography = computeLabelTypography(label);
		const fontSize = typography.fontSize;
		const letterSpacing = typography.letterSpacing;
		const width = estimateLabelWidth(label.name, fontSize, letterSpacing);
		const heightEstimate = fontSize * 1.25;
		materialized.push({
			...label,
			fontSize,
			letterSpacing,
			x: worldAnchor.x,
			y: worldAnchor.y,
			bbox: centeredBox(worldAnchor.x, worldAnchor.y, width, heightEstimate),
		});
	}

	return materialized;
}

function tilePointToWorld(point, { height, size, mapMetrics }) {
	if (!point) {
		return null;
	}
	const center = tileCenter(point.col, point.row, height, size);
	return {
		x: center.x - mapMetrics.minX,
		y: center.y - mapMetrics.minY,
	};
}

function midpointAlongPolyline(points) {
	if (!Array.isArray(points) || points.length < 2) {
		return null;
	}

	const segments = [];
	let totalLength = 0;
	for (let index = 0; index < points.length - 1; index += 1) {
		const a = points[index];
		const b = points[index + 1];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (!length) {
			continue;
		}
		segments.push({ a, b, length });
		totalLength += length;
	}

	if (!segments.length || totalLength <= 0) {
		return null;
	}

	let target = totalLength / 2;
	for (const segment of segments) {
		if (target <= segment.length) {
			const ratio = target / segment.length;
			return {
				x: segment.a.x + (segment.b.x - segment.a.x) * ratio,
				y: segment.a.y + (segment.b.y - segment.a.y) * ratio,
			};
		}
		target -= segment.length;
	}

	const last = segments[segments.length - 1];
	return { x: last.b.x, y: last.b.y };
}

export function pointsToPathD(points) {
	if (!Array.isArray(points) || points.length < 2) {
		return "";
	}
	return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function computeLabelTypography(label) {
	const length = String(label?.name || "").trim().length;
	const type = label?.type === "river" ? "river" : "region";
	const priority = label?.priority === "major" || label?.priority === "minor" ? label.priority : "standard";
	const sizeMultiplier = Number.isFinite(Number(label?.size)) ? Number(label.size) : 1;

	const baseFontByType = {
		river: {
			major: 16.5,
			standard: 14.8,
			minor: 13.2,
		},
		region: {
			major: 21,
			standard: 18,
			minor: 15.8,
		},
	};
	const baseSpacingByType = {
		river: {
			major: 0.28,
			standard: 0.24,
			minor: 0.2,
		},
		region: {
			major: 2.1,
			standard: 1.4,
			minor: 1.1,
		},
	};

	let baseFont = baseFontByType[type][priority];
	let letterSpacing = baseSpacingByType[type][priority];

	const lengthPenalty = clampNumber(Math.max(0, length - 10) * 0.22, 0, type === "region" ? 4.2 : 2.8);
	const lengthBonus = length <= 7 ? (type === "region" ? 0.8 : 0.45) : 0;
	baseFont = baseFont - lengthPenalty + lengthBonus;
	letterSpacing = clampNumber(letterSpacing + (type === "region" ? length * 0.02 : length * 0.005), 0.14, 3.2);

	return {
		fontSize: clampNumber(baseFont * clampNumber(sizeMultiplier, 0.6, 2.4), 9, 38),
		letterSpacing,
	};
}

function estimateLabelWidth(name, fontSize, letterSpacing = 0) {
	const text = String(name || "");
	if (!text) {
		return 0;
	}
	const characterWidth = fontSize * 0.58;
	return text.length * characterWidth + Math.max(0, text.length - 1) * letterSpacing;
}

function centeredBox(x, y, width, height) {
	return {
		left: x - width / 2,
		top: y - height / 2,
		right: x + width / 2,
		bottom: y + height / 2,
	};
}

export function selectVisibleMapLabels(labels, options = {}) {
	if (!Array.isArray(labels) || !labels.length || !options.showLabels) {
		return {
			rivers: [],
			regions: [],
		};
	}

	const density = normalizeDensity(options.density);
	const zoomRatio = Number.isFinite(Number(options.zoomRatio)) ? Number(options.zoomRatio) : 1;
	const shouldAutoHide = options.autoHide !== false;
	const showRivers = options.showRiverLabels !== false;
	const showRegions = options.showRegionLabels !== false;

	const candidates = labels
		.filter((label) => {
			if (label.type === "river" && !showRivers) {
				return false;
			}
			if (label.type === "region" && !showRegions) {
				return false;
			}

			if (!isPriorityVisibleForDensity(label, density, zoomRatio)) {
				return false;
			}

			const minZoom = Number.isFinite(label.minZoom) ? label.minZoom : shouldAutoHide ? PRIORITY_DEFAULT_MIN_ZOOM[label.priority] || PRIORITY_DEFAULT_MIN_ZOOM.standard : 0;
			const maxZoom = Number.isFinite(label.maxZoom) ? label.maxZoom : Number.POSITIVE_INFINITY;
			return zoomRatio >= minZoom && zoomRatio <= maxZoom;
		})
		.sort((a, b) => {
			const aWeight = PRIORITY_WEIGHT[a.priority] || PRIORITY_WEIGHT.standard;
			const bWeight = PRIORITY_WEIGHT[b.priority] || PRIORITY_WEIGHT.standard;
			if (aWeight !== bWeight) {
				return bWeight - aWeight;
			}
			if (a.type !== b.type) {
				return a.type === "river" ? -1 : 1;
			}
			return a.name.localeCompare(b.name);
		});

	const accepted = [];
	const occupied = [];

	for (const label of candidates) {
		if (!label.bbox) {
			accepted.push(label);
			continue;
		}
		const padded = expandBox(label.bbox, label.type === "region" ? 6 : 4);
		if (occupied.some((box) => intersectsBox(padded, box))) {
			continue;
		}
		accepted.push(label);
		occupied.push(padded);
	}

	return {
		rivers: accepted.filter((entry) => entry.type === "river"),
		regions: accepted.filter((entry) => entry.type === "region"),
	};
}

function normalizeDensity(value) {
	const normalized = String(value || "standard")
		.trim()
		.toLowerCase();
	if (normalized === "minimal" || normalized === "detailed") {
		return normalized;
	}
	return "standard";
}

function expandBox(box, padding) {
	return {
		left: box.left - padding,
		top: box.top - padding,
		right: box.right + padding,
		bottom: box.bottom + padding,
	};
}

function intersectsBox(a, b) {
	return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function clampNumber(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function isPriorityVisibleForDensity(label, density, zoomRatio) {
	const normalizedPriority = label?.priority === "major" || label?.priority === "minor" ? label.priority : "standard";
	const priorityWeight = PRIORITY_WEIGHT[normalizedPriority] || PRIORITY_WEIGHT.standard;
	const minPriorityWeight = DENSITY_MIN_PRIORITY[density] || DENSITY_MIN_PRIORITY.standard;

	if (priorityWeight >= minPriorityWeight) {
		return true;
	}

	const unlock = DENSITY_ZOOM_UNLOCK[density] || {};
	const overrideThreshold = label?.densityUnlock && Number.isFinite(Number(label.densityUnlock[density])) ? Number(label.densityUnlock[density]) : null;
	const threshold = Number.isFinite(overrideThreshold) ? overrideThreshold : unlock[normalizedPriority];
	if (!Number.isFinite(threshold)) {
		return false;
	}
	return zoomRatio >= threshold;
}
