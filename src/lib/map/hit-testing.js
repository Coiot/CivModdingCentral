import { buildHexVertices } from "./hex.js";

export function pointInPolygon(x, y, polygon) {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i].x;
		const yi = polygon[i].y;
		const xj = polygon[j].x;
		const yj = polygon[j].y;
		const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi;
		if (intersects) {
			inside = !inside;
		}
	}
	return inside;
}

export function findTileAtPoint({
	worldX,
	worldY,
	baseWidth,
	baseHeight,
	mapMetrics,
	hexSize,
	tileLookup,
}) {
	if (!mapMetrics || !Number.isFinite(worldX) || !Number.isFinite(worldY)) {
		return null;
	}

	if (worldX < 0 || worldY < 0 || worldX > mapMetrics.width || worldY > mapMetrics.height) {
		return null;
	}

	const mapWidth = Number(baseWidth);
	const mapHeight = Number(baseHeight);
	if (!Number.isFinite(mapWidth) || !Number.isFinite(mapHeight) || mapWidth <= 0 || mapHeight <= 0) {
		return null;
	}

	const size = Number(hexSize);
	const hexWidth = mapMetrics.hexWidth;
	const verticalStep = size * 1.5;
	const originX = hexWidth / 2 - mapMetrics.minX;
	const originY = size - mapMetrics.minY;

	const approxDisplayRow = (worldY - originY) / verticalStep;
	const rowBase = Math.round(approxDisplayRow);
	const candidates = [];

	for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
		const displayRow = rowBase + rowOffset;
		if (displayRow < 0 || displayRow >= mapHeight) {
			continue;
		}

		const rowShift = displayRow % 2 ? 0 : hexWidth / 2;
		const approxCol = (worldX - (originX + rowShift)) / hexWidth;
		const colBase = Math.round(approxCol);

		for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
			const col = colBase + colOffset;
			if (col < 0 || col >= mapWidth) {
				continue;
			}
			const key = `${col},${displayRow}`;
			const tile = tileLookup.get(key);
			if (tile) {
				candidates.push(tile);
			}
		}
	}

	if (!candidates.length) {
		return null;
	}

	let best = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const tile of candidates) {
		const dx = worldX - tile.x;
		const dy = worldY - tile.y;
		const distance = dx * dx + dy * dy;
		if (distance < bestDistance) {
			best = tile;
			bestDistance = distance;
		}
	}

	if (!best) {
		return null;
	}

	const polygon = buildHexVertices(size);
	const localX = worldX - best.x;
	const localY = worldY - best.y;
	return pointInPolygon(localX, localY, polygon) ? best : null;
}
