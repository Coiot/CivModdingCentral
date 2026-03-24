import test from "node:test";
import assert from "node:assert/strict";
import { segmentPediaInlineText } from "../src/lib/data/pediaInlineIcons.js";

test("segmentPediaInlineText resolves known icons without stored template refs", () => {
	const segments = segmentPediaInlineText("Does not require {{Horse Icon}} Horses", []);
	assert.equal(segments.length, 3);
	assert.equal(segments[0].type, "text");
	assert.equal(segments[0].text, "Does not require ");
	assert.equal(segments[1].type, "icon");
	assert.equal(segments[1].icon?.template, "Horse Icon");
	assert.equal(segments[1].icon?.label, "Horse");
	assert.equal(segments[2].text, " Horses");
});
