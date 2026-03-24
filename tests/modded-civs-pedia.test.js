import test from "node:test";
import assert from "node:assert/strict";
import { createPediaEntryFromWikiMarkup } from "../src/lib/utils/moddedCivsPedia.js";
import { sortPediaEntries } from "../src/lib/utils/pediaSorting.js";

test("sortPediaEntries ignores a leading 'The' in civ titles", () => {
	const sorted = sortPediaEntries([
		{ title: "Zulu", leader: "Shaka" },
		{ title: "The Aleut", leader: "Agugux" },
		{ title: "Babylon", leader: "Nebuchadnezzar II" },
	]);

	assert.deepEqual(
		sorted.map((entry) => entry.title),
		["The Aleut", "Babylon", "Zulu"],
	);
});

test("createPediaEntryFromWikiMarkup trims a leading colon from Dawn of Man intro and defeat text", async () => {
	const entry = await createPediaEntryFromWikiMarkup(`
{{Infobox civs
| title = The Aleut
| leader = Agugux
}}

=== Dawn of Man ===
'''Introduction:''' : Greetings from the islands.
'''Defeat:''' : Our fires fade into the sea.
`);

	assert.equal(entry.dawnOfMan.introduction, "Greetings from the islands.");
	assert.equal(entry.dawnOfMan.defeat, "Our fires fade into the sea.");
});
