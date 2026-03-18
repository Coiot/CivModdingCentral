import fs from "node:fs";
import path from "node:path";

const DEFAULT_MOD_ROOT = "/Users/coiot/Downloads/Enlightenment Era (v 6)";
const SCHEMA_PATH = path.resolve("src/lib/data/civ-schema.json");
const OUTPUT_PATH = path.resolve("src/lib/data/enlightenment-era-tech-tree.json");

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
	return fs.readFileSync(filePath, "utf8");
}

function decodeXmlText(value = "") {
	return String(value)
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/\r/g, "")
		.trim();
}

function parseAttributes(input = "") {
	const attrs = {};
	const pattern = /([A-Za-z0-9_:-]+)\s*=\s*(["'])([\s\S]*?)\2/g;
	for (const match of String(input).matchAll(pattern)) {
		attrs[match[1]] = decodeXmlText(match[3]);
	}
	return attrs;
}

function normalizeScalar(value) {
	const text = decodeXmlText(value);
	if (/^(true|false)$/i.test(text)) {
		return /^true$/i.test(text) ? 1 : 0;
	}
	if (/^-?\d+(?:\.\d+)?$/.test(text)) {
		return Number(text);
	}
	return text;
}

function sectionContent(xml, sectionName) {
	const match = String(xml).match(new RegExp(`<${sectionName}>([\\s\\S]*?)</${sectionName}>`, "i"));
	return match?.[1] || "";
}

function parseRows(sectionXml) {
	const rows = [];
	const pattern = /<Row\b([^>]*)>([\s\S]*?)<\/Row>/gi;
	for (const match of String(sectionXml).matchAll(pattern)) {
		const row = parseAttributes(match[1]);
		const body = match[2] || "";
		const childPattern = /<([A-Za-z0-9_:-]+)\b[^>]*>([\s\S]*?)<\/\1>/g;
		for (const child of body.matchAll(childPattern)) {
			row[child[1]] = normalizeScalar(child[2]);
		}
		rows.push(row);
	}
	return rows;
}

function parseUpdates(sectionXml) {
	const updates = [];
	const pattern = /<Update>([\s\S]*?)<\/Update>/gi;
	for (const match of String(sectionXml).matchAll(pattern)) {
		const body = match[1] || "";
		const whereMatch = body.match(/<Where\b([^>]*)\/>/i);
		const setSelfClosing = body.match(/<Set\b([^>]*)\/>/i);
		const setBlock = body.match(/<Set>([\s\S]*?)<\/Set>/i);
		const where = parseAttributes(whereMatch?.[1] || "");
		const changes = {};

		for (const [key, value] of Object.entries(parseAttributes(setSelfClosing?.[1] || ""))) {
			changes[key] = normalizeScalar(value);
		}

		if (setBlock) {
			const childPattern = /<([A-Za-z0-9_:-]+)\b[^>]*>([\s\S]*?)<\/\1>/g;
			for (const child of setBlock[1].matchAll(childPattern)) {
				changes[child[1]] = normalizeScalar(child[2]);
			}
		}

		updates.push({ where, changes });
	}
	return updates;
}

function parseDeletes(sectionXml) {
	const deletes = [];
	const pattern = /<Delete\b([^>]*)\/>/gi;
	for (const match of String(sectionXml).matchAll(pattern)) {
		deletes.push(parseAttributes(match[1]));
	}
	return deletes;
}

function textRowsToMap(rows) {
	const map = new Map();
	for (const row of rows) {
		const tag = String(row.Tag || "").trim();
		const text = decodeXmlText(row.Text || "");
		if (!tag || !text) {
			continue;
		}
		map.set(tag, text);
	}
	return map;
}

function prereqKey(row) {
	return `${row.TechType}::${row.PrereqTech}`;
}

function assignMissingTechIds(technologies) {
	let nextId = Math.max(0, ...technologies.map((row) => Number(row.ID || 0))) + 1;
	for (const row of technologies) {
		if (row.ID === undefined || row.ID === null || row.ID === "") {
			row.ID = nextId;
			nextId += 1;
		}
	}
}

function sortPrereqs(rows) {
	return [...rows].sort((left, right) => left.TechType.localeCompare(right.TechType) || left.PrereqTech.localeCompare(right.PrereqTech));
}

function cloneRows(rows) {
	return rows.map((row) => ({ ...row }));
}

function normalizeCompareValue(value) {
	if (value === undefined || value === null) {
		return "";
	}
	return String(value).trim();
}

function rowMatchesWhere(row, where = {}) {
	return Object.entries(where).every(([key, value]) => normalizeCompareValue(row?.[key]) === normalizeCompareValue(value));
}

function rowIdentityFields(row) {
	const candidates = [
		["Type"],
		["Tag"],
		["TechType", "PrereqTech"],
		["TechType", "DomainType"],
		["TechType", "PromotionType"],
		["TechType", "CivilizationType"],
		["BuildingType", "YieldType", "ResourceType"],
		["BuildingType", "YieldType"],
		["BuildingType", "BuildingClassType"],
		["ImprovementType", "TechType", "YieldType"],
		["ImprovementType", "YieldType"],
		["UnitType", "ResourceType"],
		["ProcessType", "YieldType"],
		["RouteType", "YieldType"],
		["RouteType"],
		["ResourceType"],
	];

	for (const fields of candidates) {
		if (fields.every((field) => normalizeCompareValue(row?.[field]))) {
			return fields;
		}
	}

	const fallback = Object.keys(row || {}).filter((field) => field === "Type" || field === "Tag" || /Type$/.test(field) || field === "YieldType");
	return fallback.length ? fallback : [];
}

function findRowIndex(rows, candidate) {
	const fields = rowIdentityFields(candidate);
	if (!fields.length) {
		return -1;
	}
	return rows.findIndex((row) => fields.every((field) => normalizeCompareValue(row?.[field]) === normalizeCompareValue(candidate?.[field])));
}

function applyTableSection(rows, sectionXml) {
	let nextRows = cloneRows(rows);

	for (const predicate of parseDeletes(sectionXml)) {
		nextRows = nextRows.filter((row) => !rowMatchesWhere(row, predicate));
	}

	for (const update of parseUpdates(sectionXml)) {
		nextRows = nextRows.map((row) => (rowMatchesWhere(row, update.where) ? { ...row, ...update.changes } : row));
	}

	for (const row of parseRows(sectionXml)) {
		const nextRow = { ...row };
		const existingIndex = findRowIndex(nextRows, nextRow);
		if (existingIndex >= 0) {
			nextRows[existingIndex] = { ...nextRows[existingIndex], ...nextRow };
			continue;
		}
		nextRows.push(nextRow);
	}

	return nextRows;
}

function main() {
	const modRoot = path.resolve(process.argv[2] || DEFAULT_MOD_ROOT);
	const schemaData = readJson(SCHEMA_PATH);
	const baseTableByName = new Map(schemaData.tables.map((table) => [table.name, table.rows || []]));

	const baseEras = schemaData.tables.find((table) => table.name === "Eras")?.rows || [];
	const baseTechnologies = schemaData.tables.find((table) => table.name === "Technologies")?.rows || [];
	const basePrereqs = schemaData.tables.find((table) => table.name === "Technology_PrereqTechs")?.rows || [];

	const erasXml = readText(path.join(modRoot, "XML/GameInfo/Enlightenment_Eras.xml"));
	const technologiesXml = readText(path.join(modRoot, "XML/Technologies/Enlightenment_Technologies.xml"));
	const techTreeUpdatesXml = readText(path.join(modRoot, "XML/Technologies/Enlightenment_TechTreeUpdates.xml"));
	const textXml = readText(path.join(modRoot, "XML/Text/Enlightenment_Text.xml"));
	const buildingsXml = readText(path.join(modRoot, "XML/Buildings/Enlightenment_Buildings.xml"));
	const wondersXml = readText(path.join(modRoot, "XML/Buildings/Enlightenment_Wonders.xml"));
	const unitsXml = readText(path.join(modRoot, "XML/Units/Enlightenment_Units.xml"));
	const unitUpdatesXml = readText(path.join(modRoot, "XML/Units/Enlightenment_UnitUpdates.xml"));
	const improvementsXml = readText(path.join(modRoot, "XML/Terrain/Enlightenment_Improvements.xml"));

	const overlayXmlDocuments = [technologiesXml, techTreeUpdatesXml, buildingsXml, wondersXml, unitsXml, unitUpdatesXml, improvementsXml];

	const parsedEraRows = parseRows(sectionContent(erasXml, "Eras"));
	const technologiesSection = sectionContent(technologiesXml, "Technologies");
	const techTreeUpdatesSection = sectionContent(techTreeUpdatesXml, "Technologies");
	const prereqSection = sectionContent(technologiesXml, "Technology_PrereqTechs");
	const prereqUpdatesSection = sectionContent(techTreeUpdatesXml, "Technology_PrereqTechs");
	const languageSection = sectionContent(textXml, "Language_en_US");

	const technologyRows = baseTechnologies.map((row) => ({ ...row }));
	const technologyByType = new Map(technologyRows.map((row) => [row.Type, row]));

	for (const update of [...parseUpdates(technologiesSection), ...parseUpdates(techTreeUpdatesSection)]) {
		const type = String(update.where.Type || "").trim();
		if (!type || !technologyByType.has(type)) {
			continue;
		}
		Object.assign(technologyByType.get(type), update.changes);
	}

	for (const row of parseRows(technologiesSection)) {
		const type = String(row.Type || "").trim();
		if (!type) {
			continue;
		}
		if (technologyByType.has(type)) {
			Object.assign(technologyByType.get(type), row);
			continue;
		}
		const nextRow = { ...row };
		technologyRows.push(nextRow);
		technologyByType.set(type, nextRow);
	}

	assignMissingTechIds(technologyRows);

	const prereqByKey = new Map(basePrereqs.map((row) => [prereqKey(row), { ...row }]));
	for (const row of parseRows(prereqSection)) {
		if (!row.TechType || !row.PrereqTech) {
			continue;
		}
		prereqByKey.set(prereqKey(row), { TechType: row.TechType, PrereqTech: row.PrereqTech });
	}
	for (const row of parseDeletes(prereqUpdatesSection)) {
		if (!row.TechType || !row.PrereqTech) {
			continue;
		}
		prereqByKey.delete(prereqKey(row));
	}

	const textByTag = new Map();
	for (const [tag, text] of textRowsToMap(parseRows(languageSection))) {
		textByTag.set(tag, text);
	}
	for (const update of parseUpdates(languageSection)) {
		const tag = String(update.where.Tag || "").trim();
		const text = decodeXmlText(update.changes.Text || "");
		if (!tag || !text) {
			continue;
		}
		textByTag.set(tag, text);
	}

	const overlayTableNames = ["Units", "Buildings", "Builds", "Resources", "Building_YieldChanges", "Unit_ResourceQuantityRequirements", "Improvement_TechYieldChanges"];

	const overlayTables = {
		Eras: parsedEraRows.length ? parsedEraRows : cloneRows(baseEras),
		Technologies: technologyRows,
		Technology_PrereqTechs: sortPrereqs([...prereqByKey.values()]),
	};

	for (const tableName of overlayTableNames) {
		let rows = cloneRows(baseTableByName.get(tableName) || []);
		for (const xml of overlayXmlDocuments) {
			const sectionXml = sectionContent(xml, tableName);
			if (!sectionXml) {
				continue;
			}
			rows = applyTableSection(rows, sectionXml);
		}
		overlayTables[tableName] = rows;
	}

	const payload = {
		sourceRoot: modRoot,
		generatedAt: new Date().toISOString(),
		eraCount: parsedEraRows.length || baseEras.length,
		techCount: technologyRows.length,
		prereqCount: prereqByKey.size,
		eras: parsedEraRows.length ? parsedEraRows : baseEras,
		technologies: technologyRows,
		prereqs: sortPrereqs([...prereqByKey.values()]),
		textByTag: Object.fromEntries(textByTag),
		tables: overlayTables,
	};

	fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
	console.log(`Wrote Enlightenment overlay with ${payload.techCount} techs to ${OUTPUT_PATH}`);
}

main();
