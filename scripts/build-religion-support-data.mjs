import fs from "node:fs";
import path from "node:path";

const DEFAULT_SOURCE_ROOT = "/Users/coiot/Downloads/religion mods";
const OUTPUT_PATH = path.resolve("src/lib/data/religion-support.json");
const GLOBAL_TEXT_PATH = path.resolve("src/lib/data/civ-text-en-us.json");
const PACK_ORDER = [
	"historical-religions-complete-bnw-or-gk-v-45",
	"grant-s-heathen-religions-v-1",
	"lungora-s-religions-v-1",
	"australian-religions-v-1",
	"orangechrisy-s-california-religions-v-1",
	"homusubi-s-japanese-religions-v-1",
	"tibetan-choluk-pack",
];
const GLOBAL_TEXT_BY_TAG = loadGlobalTextMap();

function loadGlobalTextMap() {
	if (!fs.existsSync(GLOBAL_TEXT_PATH)) {
		return new Map();
	}

	const raw = JSON.parse(fs.readFileSync(GLOBAL_TEXT_PATH, "utf8"));
	return new Map(Object.entries(raw || {}));
}

function walkFiles(rootDir) {
	const entries = fs.readdirSync(rootDir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		if (entry.name.startsWith(".DS_Store")) {
			continue;
		}
		const fullPath = path.join(rootDir, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkFiles(fullPath));
			continue;
		}
		files.push(fullPath);
	}
	return files;
}

function decodeXmlText(value = "") {
	return String(value)
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/\[NEWLINE\]/g, "\n")
		.replace(/\r/g, "")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function escapeRegex(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value = "") {
	return String(value)
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function formatPackTitle(folderName) {
	return String(folderName)
		.replace(/\s*\(v\s*\d+\)\s*$/i, "")
		.replace(/\s*\(BNW or GK\)\s*/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function formatSummary(text = "", maxLength = 220) {
	const normalized = String(text).replace(/\s+/g, " ").trim();
	if (!normalized) {
		return "";
	}
	if (normalized.length <= maxLength) {
		return normalized;
	}
	return `${normalized.slice(0, maxLength).replace(/[ ,;:.-]+$/g, "")}...`;
}

function stripSqlComments(sql) {
	return String(sql)
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split("\n")
		.map((line) => line.replace(/--.*$/g, ""))
		.join("\n");
}

function parseXmlTextRows(xmlText) {
	const rows = new Map();
	const textWithRows = String(xmlText);

	const nestedRowPattern = /<Row\b([^>]*)>([\s\S]*?)<\/Row>/gi;
	for (const match of textWithRows.matchAll(nestedRowPattern)) {
		const attrs = match[1] || "";
		const body = match[2] || "";
		const tagMatch = attrs.match(/\bTag=(["'])(.*?)\1/i);
		if (!tagMatch) {
			continue;
		}
		const textMatch = body.match(/<Text\b[^>]*>([\s\S]*?)<\/Text>/i);
		if (!textMatch) {
			continue;
		}
		rows.set(tagMatch[2], decodeXmlText(textMatch[1]));
	}

	const selfClosingPattern = /<Row\b([^>]*\bTag=(["'])(.*?)\2[^>]*)\/>/gi;
	for (const match of textWithRows.matchAll(selfClosingPattern)) {
		const attrs = match[1] || "";
		const tag = match[3] || "";
		const textMatch = attrs.match(/\bText=(["'])(.*?)\1/i);
		if (!tag || !textMatch) {
			continue;
		}
		rows.set(tag, decodeXmlText(textMatch[2]));
	}

	return rows;
}

function parseIconAtlasDefs(sqlText) {
	const cleaned = stripSqlComments(sqlText);
	const atlasMap = new Map();
	const blockPattern = /INSERT\s+INTO\s+IconTextureAtlases\s*\(([\s\S]*?)\)\s*VALUES\s*([\s\S]*?);/gi;

	for (const match of cleaned.matchAll(blockPattern)) {
		const valuesText = match[2] || "";
		const rowPattern = /\(\s*'((?:[^']|'')*)'\s*,\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
		for (const rowMatch of valuesText.matchAll(rowPattern)) {
			const atlas = rowMatch[1].replace(/''/g, "'");
			const size = Number(rowMatch[2]);
			const filename = rowMatch[3].replace(/''/g, "'");
			const iconsPerRow = Number(rowMatch[4]);
			const iconsPerColumn = Number(rowMatch[5]);
			if (!atlasMap.has(atlas)) {
				atlasMap.set(atlas, []);
			}
			atlasMap.get(atlas).push({
				size,
				filename,
				iconsPerRow,
				iconsPerColumn,
			});
		}
	}

	for (const entries of atlasMap.values()) {
		entries.sort((left, right) => left.size - right.size);
	}

	return atlasMap;
}

function parseReligionRows(sqlText) {
	const cleaned = stripSqlComments(sqlText);
	const rows = [];
	const blockPattern = /INSERT\s+INTO\s+Religions\s*\(([\s\S]*?)\)\s*VALUES\s*([\s\S]*?);/gi;

	for (const match of cleaned.matchAll(blockPattern)) {
		const columnList = (match[1] || "").replace(/\s+/g, "");
		if (!/Type,Description,Civilopedia,IconAtlas,PortraitIndex,IconString/i.test(columnList)) {
			continue;
		}
		const valuesText = match[2] || "";
		const rowPattern = /\(\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*\)/g;

		for (const rowMatch of valuesText.matchAll(rowPattern)) {
			rows.push({
				type: rowMatch[1].replace(/''/g, "'"),
				descriptionKey: rowMatch[2].replace(/''/g, "'"),
				civilopediaKey: rowMatch[3].replace(/''/g, "'"),
				iconAtlas: rowMatch[4].replace(/''/g, "'"),
				portraitIndex: Number(rowMatch[5]),
				iconString: rowMatch[6].replace(/''/g, "'"),
			});
		}
	}

	return rows;
}

function buildPackData(packDir) {
	const folderName = path.basename(packDir);
	const packTitle = formatPackTitle(folderName);
	const files = walkFiles(packDir);
	const xmlFiles = files.filter((filePath) => /\.xml$/i.test(filePath));
	const sqlFiles = files.filter((filePath) => /\.(sql)$/i.test(filePath));
	const ddsFiles = files.filter((filePath) => /\.dds$/i.test(filePath)).map((filePath) => path.basename(filePath));
	const textByTag = new Map();
	const iconAtlasMap = new Map();
	const religionRows = [];

	for (const xmlFile of xmlFiles) {
		const xmlText = fs.readFileSync(xmlFile, "utf8");
		for (const [tag, text] of parseXmlTextRows(xmlText)) {
			if (text && !textByTag.has(tag)) {
				textByTag.set(tag, text);
			}
		}
	}

	for (const sqlFile of sqlFiles) {
		const sqlText = fs.readFileSync(sqlFile, "utf8");
		for (const [atlas, entries] of parseIconAtlasDefs(sqlText)) {
			if (!iconAtlasMap.has(atlas)) {
				iconAtlasMap.set(atlas, []);
			}
			iconAtlasMap.get(atlas).push(...entries);
		}
		religionRows.push(
			...parseReligionRows(sqlText).map((row) => ({
				...row,
				sourceFile: path.relative(packDir, sqlFile).replace(/\\/g, "/"),
			})),
		);
	}

	for (const entries of iconAtlasMap.values()) {
		entries.sort((left, right) => left.size - right.size || left.filename.localeCompare(right.filename));
	}

	const iconAtlases = [...iconAtlasMap.entries()]
		.map(([atlas, entries]) => ({
			atlas,
			files: entries.map((entry) => ({
				size: entry.size,
				filename: entry.filename,
				iconsPerRow: entry.iconsPerRow,
				iconsPerColumn: entry.iconsPerColumn,
			})),
		}))
		.sort((left, right) => left.atlas.localeCompare(right.atlas));

	const uniqueReligionRows = [];
	const seenReligionTypes = new Set();
	const rankedReligionRows = [...religionRows].sort((left, right) => {
		const leftScore = /religion/i.test(left.sourceFile) ? 2 : /core/i.test(left.sourceFile) ? 1 : 0;
		const rightScore = /religion/i.test(right.sourceFile) ? 2 : /core/i.test(right.sourceFile) ? 1 : 0;
		return rightScore - leftScore || left.sourceFile.localeCompare(right.sourceFile);
	});
	for (const row of rankedReligionRows) {
		if (seenReligionTypes.has(row.type)) {
			continue;
		}
		seenReligionTypes.add(row.type);
		uniqueReligionRows.push(row);
	}

	const religions = uniqueReligionRows
		.map((row) => {
			const atlasEntries = iconAtlasMap.get(row.iconAtlas) || [];
			const atlasGrid = atlasEntries[0] || null;
			const portraitColumn = atlasGrid ? row.portraitIndex % atlasGrid.iconsPerRow : null;
			const portraitRow = atlasGrid ? Math.floor(row.portraitIndex / atlasGrid.iconsPerRow) : null;
			const name = textByTag.get(row.descriptionKey) || GLOBAL_TEXT_BY_TAG.get(row.descriptionKey) || row.descriptionKey;
			const civilopedia = textByTag.get(row.civilopediaKey) || GLOBAL_TEXT_BY_TAG.get(row.civilopediaKey) || "";
			return {
				id: slugify(`${folderName}-${row.type}`),
				type: row.type,
				name,
				descriptionKey: row.descriptionKey,
				civilopediaKey: row.civilopediaKey,
				civilopedia,
				summary: formatSummary(civilopedia),
				iconAtlas: row.iconAtlas,
				portraitIndex: row.portraitIndex,
				iconString: row.iconString,
				iconFiles: atlasEntries.map((entry) => entry.filename),
				iconCell:
					portraitColumn !== null && portraitRow !== null
						? {
								row: portraitRow + 1,
								column: portraitColumn + 1,
							}
						: null,
				usesBaseGameAtlas: row.iconAtlas === "RELIGION_ATLAS_WHITE",
				sourceFile: row.sourceFile,
			};
		})
		.sort((left, right) => left.name.localeCompare(right.name) || left.type.localeCompare(right.type));

	return {
		id: slugify(folderName),
		title: packTitle,
		folderName,
		religionCount: religions.length,
		customAtlasCount: iconAtlases.filter((atlas) => atlas.atlas !== "RELIGION_ATLAS_WHITE").length,
		iconAtlases,
		artFiles: ddsFiles.sort((left, right) => left.localeCompare(right)),
		religions,
	};
}

function comparePackOrder(left, right) {
	const leftIndex = PACK_ORDER.indexOf(left.id);
	const rightIndex = PACK_ORDER.indexOf(right.id);
	const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
	const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
	return normalizedLeftIndex - normalizedRightIndex || left.title.localeCompare(right.title);
}

function main() {
	const sourceRoot = path.resolve(process.argv[2] || DEFAULT_SOURCE_ROOT);
	if (!fs.existsSync(sourceRoot)) {
		throw new Error(`Religion source directory not found: ${sourceRoot}`);
	}

	const packDirs = fs
		.readdirSync(sourceRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(sourceRoot, entry.name))
		.sort((left, right) => path.basename(left).localeCompare(path.basename(right)));

	const packs = packDirs
		.map((packDir) => buildPackData(packDir))
		.filter((pack) => pack.religions.length > 0)
		.sort(comparePackOrder);
	const payload = {
		sourceRoot,
		generatedAt: new Date().toISOString(),
		packCount: packs.length,
		religionCount: packs.reduce((sum, pack) => sum + pack.religionCount, 0),
		packs,
	};

	fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
	console.log(`Wrote ${payload.religionCount} religions across ${payload.packCount} packs to ${OUTPUT_PATH}`);
}

main();
