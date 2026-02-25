import test from "node:test";
import assert from "node:assert/strict";
import { buildPinsSignature, normalizePins, normalizeToken, parseHexInput, sanitizeHexColor } from "../src/lib/map/pins.js";

test("sanitizeHexColor keeps valid hex and falls back for invalid values", () => {
	assert.equal(sanitizeHexColor("#A1b2C3", "#000000"), "#A1b2C3");
	assert.equal(sanitizeHexColor("A1b2C3", "#000000"), "#000000");
	assert.equal(sanitizeHexColor(null, "#123456"), "#123456");
});

test("parseHexInput normalizes 6-digit values", () => {
	assert.equal(parseHexInput("ff9900"), "#FF9900");
	assert.equal(parseHexInput("#abc123"), "#ABC123");
	assert.equal(parseHexInput("#abcd"), null);
});

test("normalizeToken creates predictable slug-style keys", () => {
	assert.equal(normalizeToken("  Rome (Julius Caesar)  "), "rome-julius-caesar-");
	assert.equal(normalizeToken("Songhai"), "songhai");
});

test("normalizePins deduplicates by civ+tile and applies defaults", () => {
	const pins = normalizePins([
		{ civ: "Rome", col: 10.8, row: 4.9, primary: "#102030", secondary: "#eeeeee" },
		{ civ: "Rome", col: 10, row: 4, primary: "#ffffff", secondary: "#111111" },
		{ civ: "Songhai", col: 3, row: 2, primary: "bad", secondary: "#00aa00" },
		{ civ: "", col: 5, row: 5 },
	]);

	assert.equal(pins.length, 2);
	assert.deepEqual(pins[0], {
		id: "rome-10-4",
		civ: "Rome",
		leader: "",
		author: "",
		col: 10,
		row: 4,
		primary: "#102030",
		secondary: "#eeeeee",
	});
	assert.deepEqual(pins[1], {
		id: "songhai-3-2",
		civ: "Songhai",
		leader: "",
		author: "",
		col: 3,
		row: 2,
		primary: "#243746",
		secondary: "#00aa00",
	});
});

test("buildPinsSignature is stable across input ordering", () => {
	const pinsA = [
		{ civ: "Rome", leader: "Caesar", author: "A", col: 1, row: 2, primary: "#111111", secondary: "#222222" },
		{ civ: "Songhai", leader: "Askia", author: "B", col: 3, row: 4, primary: "#333333", secondary: "#444444" },
	];
	const pinsB = [pinsA[1], pinsA[0]];

	assert.equal(buildPinsSignature(pinsA), buildPinsSignature(pinsB));
});
