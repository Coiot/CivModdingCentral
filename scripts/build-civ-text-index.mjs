import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const schemaPath = path.join(projectRoot, "src/lib/data/civ-schema.json");
const outputPath = path.join(projectRoot, "src/lib/data/civ-text-en-us.json");
const defaultXmlRoot = "/Users/coiot/Library/Application Support/Steam/steamapps/common/Sid Meier's Civilization V/Civilization V.app/Contents/Assets/Assets";
const xmlRoot = process.argv[2] || defaultXmlRoot;

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const neededTags = collectTextTags(schema);
const xmlFiles = await collectXmlFiles(xmlRoot);
const textIndex = {};

for (const filePath of xmlFiles) {
	const content = stripBom(await readFile(filePath, "utf8"));
	for (const [tag, text] of extractRows(content)) {
		if (!neededTags.has(tag) || textIndex[tag]) {
			continue;
		}
		textIndex[tag] = decodeXml(text);
	}
}

const sorted = Object.fromEntries(Object.entries(textIndex).sort(([left], [right]) => left.localeCompare(right)));
await writeFile(outputPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

console.log(`Wrote ${Object.keys(sorted).length} localized strings to ${outputPath}`);

function collectTextTags(schemaData) {
	const tags = new Set();
	for (const table of schemaData.tables || []) {
		for (const row of table.rows || []) {
			for (const value of Object.values(row || {})) {
				if (typeof value === "string" && value.startsWith("TXT_KEY_")) {
					tags.add(value.trim());
				}
			}
		}
	}
	return tags;
}

async function collectXmlFiles(rootDir) {
	const entries = await readdir(rootDir, { withFileTypes: true, recursive: true });
	return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".xml")).map((entry) => path.join(entry.parentPath, entry.name));
}

function extractRows(content) {
	const rows = [];
	const languageBlocks = [...content.matchAll(/<Language_en_US\b[^>]*>([\s\S]*?)<\/Language_en_US>/gi)];
	for (const [, block] of languageBlocks) {
		const rowRegex = /<Row\b[^>]*\bTag="([^"]+)"[^>]*>([\s\S]*?)<\/Row>/g;
		for (const match of block.matchAll(rowRegex)) {
			const [, tag, body] = match;
			const textMatch = body.match(/<Text>([\s\S]*?)<\/Text>/);
			if (!textMatch) {
				continue;
			}
			rows.push([tag, cleanText(textMatch[1])]);
		}

		const inlineRowRegex = /<Row\b[^>]*\bTag="([^"]+)"[^>]*\bText="([^"]*)"[^>]*\/>/g;
		for (const match of block.matchAll(inlineRowRegex)) {
			const [, tag, text] = match;
			rows.push([tag, cleanText(text)]);
		}
	}

	return rows;
}

function cleanText(text) {
	return String(text || "")
		.replace(/\r/g, "")
		.replace(/\n+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function decodeXml(text) {
	return String(text || "")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

function stripBom(value) {
	return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
