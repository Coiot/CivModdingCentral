import test from "node:test";
import assert from "node:assert/strict";
import { computeMapMetrics } from "../src/lib/map/hex.js";
import { materializeMapLabels, normalizeMapLabels, pointsToPathD, selectVisibleMapLabels } from "../src/lib/map/labels.js";

test("normalizeMapLabels keeps valid river/region entries", () => {
	const labels = normalizeMapLabels([
		{
			id: "nile",
			name: "Nile",
			type: "river",
			priority: "major",
			size: 1.2,
			points: [
				{ col: 1, row: 2 },
				{ col: 2, row: 2 },
			],
		},
		{
			id: "sahara",
			name: "Sahara",
			type: "region",
			priority: "standard",
			anchor: { col: 3, row: 4 },
		},
		{
			name: "",
			type: "region",
			anchor: { col: 1, row: 1 },
		},
	]);

	assert.equal(labels.length, 2);
	assert.equal(labels[0].type, "river");
	assert.equal(labels[1].type, "region");
	assert.equal(labels[0].variant, "water");
	assert.equal(labels[1].variant, "land");
	assert.equal(labels[0].size, 1.2);
	assert.equal(labels[1].size, 1);
});

test("materializeMapLabels converts tile coords into world coords and paths", () => {
	const baseData = { width: 8, height: 8 };
	const mapMetrics = computeMapMetrics(baseData.width, baseData.height, 14);
	const labels = normalizeMapLabels([
		{
			name: "Nile",
			type: "river",
			points: [
				{ col: 2, row: 3 },
				{ col: 3, row: 3 },
				{ col: 4, row: 3 },
			],
		},
		{
			name: "Sahara",
			type: "region",
			anchor: { col: 3, row: 4 },
		},
	]);

	const materialized = materializeMapLabels(labels, {
		baseData,
		mapMetrics,
		hexSize: 14,
	});

	assert.equal(materialized.length, 2);
	const river = materialized.find((entry) => entry.type === "river");
	const region = materialized.find((entry) => entry.type === "region");
	assert.ok(river.pathD.startsWith("M"));
	assert.ok(region.x > 0 && region.y > 0);
});

test("materializeMapLabels supports anchor-only rivers", () => {
	const baseData = { width: 8, height: 8 };
	const mapMetrics = computeMapMetrics(baseData.width, baseData.height, 14);
	const labels = normalizeMapLabels([
		{
			name: "Nile",
			type: "river",
			anchor: { col: 3, row: 4 },
			rotation: -90,
		},
	]);

	const materialized = materializeMapLabels(labels, {
		baseData,
		mapMetrics,
		hexSize: 14,
	});

	assert.equal(materialized.length, 1);
	assert.equal(materialized[0].pathD, "");
	assert.equal(materialized[0].hasPath, false);
	assert.ok(materialized[0].x > 0 && materialized[0].y > 0);
});

test("pointsToPathD returns empty for insufficient points", () => {
	assert.equal(pointsToPathD([]), "");
	assert.equal(pointsToPathD([{ x: 1, y: 2 }]), "");
	assert.ok(
		pointsToPathD([
			{ x: 1, y: 2 },
			{ x: 3, y: 4 },
		]).includes("L"),
	);
});

test("selectVisibleMapLabels applies density, zoom filters, and collision removal", () => {
	const labels = [
		{
			id: "major-river",
			name: "Major River",
			type: "river",
			priority: "major",
			bbox: { left: 10, top: 10, right: 40, bottom: 30 },
		},
		{
			id: "minor-river",
			name: "Minor River",
			type: "river",
			priority: "minor",
			bbox: { left: 12, top: 10, right: 40, bottom: 30 },
		},
		{
			id: "minor-river-far",
			name: "Minor River Far",
			type: "river",
			priority: "minor",
			bbox: { left: 150, top: 8, right: 205, bottom: 24 },
		},
		{
			id: "region",
			name: "Region",
			type: "region",
			priority: "standard",
			minZoom: 1.2,
			bbox: { left: 70, top: 30, right: 130, bottom: 55 },
		},
	];

	const minimal = selectVisibleMapLabels(labels, {
		showLabels: true,
		showRiverLabels: true,
		showRegionLabels: true,
		density: "minimal",
		zoomRatio: 1,
		autoHide: true,
	});
	assert.equal(minimal.rivers.length, 1);
	assert.equal(minimal.regions.length, 0);
	assert.equal(minimal.rivers[0].id, "major-river");

	const minimalHighZoom = selectVisibleMapLabels(labels, {
		showLabels: true,
		showRiverLabels: true,
		showRegionLabels: true,
		density: "minimal",
		zoomRatio: 1.5,
		autoHide: true,
	});
	assert.equal(minimalHighZoom.rivers.length, 1);
	assert.equal(minimalHighZoom.rivers[0].id, "major-river");
	assert.equal(minimalHighZoom.regions.length, 1);

	const detailed = selectVisibleMapLabels(labels, {
		showLabels: true,
		showRiverLabels: true,
		showRegionLabels: true,
		density: "detailed",
		zoomRatio: 1.25,
		autoHide: true,
	});
	assert.equal(detailed.rivers.length, 1);
	assert.equal(detailed.regions.length, 1);

	const standardLowZoom = selectVisibleMapLabels(labels, {
		showLabels: true,
		showRiverLabels: true,
		showRegionLabels: true,
		density: "standard",
		zoomRatio: 1,
		autoHide: false,
	});
	assert.equal(standardLowZoom.rivers.length, 1);
	assert.equal(standardLowZoom.rivers[0].id, "major-river");

	const standardHighZoom = selectVisibleMapLabels(labels, {
		showLabels: true,
		showRiverLabels: true,
		showRegionLabels: true,
		density: "standard",
		zoomRatio: 1.5,
		autoHide: false,
	});
	assert.equal(standardHighZoom.rivers.length, 2);
	assert.ok(standardHighZoom.rivers.some((entry) => entry.id === "major-river"));
	assert.ok(standardHighZoom.rivers.some((entry) => entry.id === "minor-river-far"));
});

test("selectVisibleMapLabels supports per-label unlockZoom overrides", () => {
	const labels = [
		{
			id: "minor-default",
			name: "Minor Default",
			type: "region",
			priority: "minor",
			anchor: { col: 6, row: 6 },
			bbox: { left: 10, top: 10, right: 55, bottom: 30 },
		},
		{
			id: "minor-override",
			name: "Minor Override",
			type: "region",
			priority: "minor",
			densityUnlock: { standard: 1.1 },
			anchor: { col: 20, row: 6 },
			bbox: { left: 100, top: 10, right: 155, bottom: 30 },
		},
		{
			id: "minor-unlock-zoom-number",
			name: "Minor Number",
			type: "region",
			priority: "minor",
			unlockZoom: 1.15,
			anchor: { col: 34, row: 6 },
			bbox: { left: 190, top: 10, right: 245, bottom: 30 },
		},
	];

	const atStandardLowZoom = selectVisibleMapLabels(normalizeMapLabels(labels), {
		showLabels: true,
		showRiverLabels: true,
		showRegionLabels: true,
		density: "standard",
		zoomRatio: 1.2,
		autoHide: false,
	});

	assert.equal(atStandardLowZoom.regions.length, 2);
	assert.ok(atStandardLowZoom.regions.some((entry) => entry.id === "minor-override"));
	assert.ok(atStandardLowZoom.regions.some((entry) => entry.id === "minor-unlock-zoom-number"));
	assert.ok(!atStandardLowZoom.regions.some((entry) => entry.id === "minor-default"));
});
