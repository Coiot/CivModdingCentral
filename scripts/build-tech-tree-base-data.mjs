import fs from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve("src/lib/data/civ-schema.json");
const TEXT_PATH = path.resolve("src/lib/data/civ-text-en-us.json");
const OUTPUT_PATH = path.resolve("src/lib/data/tech-tree-base-data.json");

const TABLE_NAMES = [
	"Technologies",
	"Eras",
	"Technology_PrereqTechs",
	"Technology_ORPrereqTechs",
	"Units",
	"Buildings",
	"Projects",
	"Processes",
	"Builds",
	"Improvements",
	"Routes",
	"UnitPromotions",
	"Resources",
	"Civilizations",
	"Features",
	"Improvement_TechYieldChanges",
	"Improvement_TechFreshWaterYieldChanges",
	"Improvement_TechNoFreshWaterYieldChanges",
	"Route_TechMovementChanges",
	"Technology_TradeRouteDomainExtraRange",
	"Technology_DomainExtraMoves",
	"Technology_FreePromotions",
	"Civilization_DisableTechs",
	"Building_YieldChanges",
	"Improvement_Yields",
	"Route_Yields",
	"Unit_ResourceQuantityRequirements",
	"Process_ProductionYields",
];

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectTextRefs(value, refs) {
	if (typeof value === "string" && value.startsWith("TXT_KEY_")) {
		refs.add(value);
	}
}

function main() {
	const schemaData = readJson(SCHEMA_PATH);
	const textByTag = readJson(TEXT_PATH);
	const selectedTables = schemaData.tables.filter((table) => TABLE_NAMES.includes(table.name));
	const refs = new Set();

	for (const table of selectedTables) {
		for (const row of table.rows || []) {
			for (const value of Object.values(row || {})) {
				collectTextRefs(value, refs);
			}
		}
	}

	const filteredText = Object.fromEntries([...refs].map((tag) => [tag, textByTag[tag]]).filter(([, text]) => typeof text === "string" && text.trim()));
	const payload = {
		generatedAt: new Date().toISOString(),
		tableCount: selectedTables.length,
		rowCount: selectedTables.reduce((sum, table) => sum + (table.rows?.length || 0), 0),
		textCount: Object.keys(filteredText).length,
		tables: Object.fromEntries(selectedTables.map((table) => [table.name, table.rows || []])),
		textByTag: filteredText,
	};

	fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
	console.log(`Wrote tech tree base data with ${payload.rowCount} rows and ${payload.textCount} text entries to ${OUTPUT_PATH}`);
}

main();
