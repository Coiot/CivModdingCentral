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

test("createPediaEntryFromWikiMarkup canonicalizes inline icons and footnoted unique replacements", async () => {
	const entry = await createPediaEntryFromWikiMarkup(`
{{Infobox civs
| title = Nanzhao
| leader = Quanfengyou
}}

== Unique Attributes ==
{| class="article-table"
|-
| [[File:Wudao.png|Wudao]]
| '''Wudao'''<ref>Replacement source note.</ref> (Caravansary)
| +1 [ICON_FOOD] Food, {{GoldRes Icon}}, and {{Great Artist}} points.
|}
`);

	assert.equal(entry.uniques.length, 1);
	assert.equal(entry.uniques[0].name, "Wudao");
	assert.equal(entry.uniques[0].replaces, "Caravansary");
	assert.deepEqual(entry.uniques[0].footnotes, ["Replacement source note."]);
	assert.match(entry.uniques[0].body, /\{\{Food Icon}} Food/);
	assert.match(entry.uniques[0].body, /\{\{Gold Resource Icon}}/);
	assert.match(entry.uniques[0].body, /\{\{Great Artist Icon}}/);
	assert.equal(entry.meta.unresolvedTemplates.includes("GoldRes Icon"), false);
	assert.equal(entry.meta.unresolvedTemplates.includes("Great Artist"), false);
});
