import test from "node:test";
import assert from "node:assert/strict";
import { buildHexVertices, computeMapMetrics, tileCenter } from "../src/lib/map/hex.js";
import { findTileAtPoint, pointInPolygon } from "../src/lib/map/hit-testing.js";

function createTileLookup(width, height, hexSize, mapMetrics) {
	const lookup = new Map();
	for (let sourceRow = 0; sourceRow < height; sourceRow += 1) {
		const displayRow = height - 1 - sourceRow;
		for (let col = 0; col < width; col += 1) {
			const center = tileCenter(col, sourceRow, height, hexSize);
			const key = `${col},${displayRow}`;
			lookup.set(key, {
				key,
				col,
				sourceRow,
				row: displayRow,
				x: center.x - mapMetrics.minX,
				y: center.y - mapMetrics.minY,
			});
		}
	}
	return lookup;
}

test("pointInPolygon identifies inside/outside points", () => {
	const polygon = buildHexVertices(14);
	assert.equal(pointInPolygon(0, 0, polygon), true);
	assert.equal(pointInPolygon(100, 100, polygon), false);
});

test("findTileAtPoint resolves tile center hits", () => {
	const width = 3;
	const height = 2;
	const hexSize = 14;
	const mapMetrics = computeMapMetrics(width, height, hexSize);
	const tileLookup = createTileLookup(width, height, hexSize, mapMetrics);
	const target = tileLookup.get("1,1");

	const hit = findTileAtPoint({
		worldX: target.x,
		worldY: target.y,
		baseWidth: width,
		baseHeight: height,
		mapMetrics,
		hexSize,
		tileLookup,
	});

	assert.ok(hit);
	assert.equal(hit.key, "1,1");
});

test("findTileAtPoint returns null for out-of-bounds points", () => {
	const width = 3;
	const height = 2;
	const hexSize = 14;
	const mapMetrics = computeMapMetrics(width, height, hexSize);
	const tileLookup = createTileLookup(width, height, hexSize, mapMetrics);

	const hit = findTileAtPoint({
		worldX: -10,
		worldY: -4,
		baseWidth: width,
		baseHeight: height,
		mapMetrics,
		hexSize,
		tileLookup,
	});

	assert.equal(hit, null);
});
