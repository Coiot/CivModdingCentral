import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { md5HexBytes, synchronizeModinfoMd5Entries, validateModinfoMd5Entries } from "../src/lib/civ5mod/modinfo.js";

test("md5HexBytes matches standard MD5 test vectors", () => {
	const vectors = [
		["", "D41D8CD98F00B204E9800998ECF8427E"],
		["a", "0CC175B9C0F1B6A831C399E269772661"],
		["abc", "900150983CD24FB0D6963F7D28E17F72"],
		["message digest", "F96B697D7CB7938D525A2F31AAF161D0"],
		["abcdefghijklmnopqrstuvwxyz", "C3FCD3D76192E4007DFB496CCA67E13B"],
	];

	for (const [input, expected] of vectors) {
		assert.equal(md5HexBytes(new TextEncoder().encode(input)), expected);
	}
});

test("md5HexBytes matches Node crypto for binary file bytes", () => {
	const fileBytes = new Uint8Array([0, 1, 2, 3, 127, 128, 129, 254, 255]);
	const expected = createHash("md5").update(fileBytes).digest("hex").toUpperCase();
	assert.equal(md5HexBytes(fileBytes), expected);
});

test("synchronizeModinfoMd5Entries rewrites md5 values from actual file bytes", () => {
	const sqlBytes = new TextEncoder().encode("SELECT 1;");
	const modinfoText = `<?xml version="1.0" encoding="utf-8"?>\n<Mod>\n  <Files>\n    <File import=\"0\" md5=\"BADBADBADBADBADBADBADBADBADBADBA\">Core/Test.sql</File>\n  </Files>\n</Mod>`;
	const entriesByPath = new Map([
		["Core/Test.sql", { path: "Core/Test.sql", bytes: sqlBytes }],
		["Test.modinfo", { path: "Test.modinfo", bytes: new TextEncoder().encode(modinfoText) }],
	]);

	synchronizeModinfoMd5Entries(entriesByPath);
	const updatedText = new TextDecoder().decode(entriesByPath.get("Test.modinfo").bytes);
	const expectedMd5 = md5HexBytes(sqlBytes);

	assert.match(updatedText, new RegExp(`md5="${expectedMd5}"`));
	assert.deepEqual(validateModinfoMd5Entries(entriesByPath), []);
});

test("validateModinfoMd5Entries reports unresolved file references", () => {
	const modinfoText = `<?xml version="1.0" encoding="utf-8"?>\n<Mod>\n  <Files>\n    <File md5=\"1234\">Missing/File.sql</File>\n  </Files>\n</Mod>`;
	const entriesByPath = new Map([["Test.modinfo", { path: "Test.modinfo", bytes: new TextEncoder().encode(modinfoText) }]]);

	const issues = validateModinfoMd5Entries(entriesByPath);
	assert.equal(issues.length, 1);
	assert.match(issues[0], /missing file entry/i);
});
