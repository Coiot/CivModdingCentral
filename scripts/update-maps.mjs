import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { maps as existingMaps } from "../src/lib/config/maps.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMMUNITY_DIR = path.resolve(__dirname, "../static/community");
const MAPS_FILE = path.resolve(__dirname, "../src/lib/config/maps.js");

const DEFAULT_MAP_CONFIG = {
	viewWidth: 1400,
	viewHeight: 840,
	hexSize: 14,
	maxScale: 3,
};

function slugify(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function deriveTitle(baseName) {
	const withSpaces = String(baseName || "")
		.replace(/_/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/\s+/g, " ")
		.trim();
	return withSpaces || String(baseName || "");
}

function formatMapEntry(mapItem) {
	const lines = [];
	lines.push("\t{");
	lines.push(`\t\tid: "${mapItem.id}",`);
	lines.push(`\t\ttitle: "${mapItem.title}",`);
	lines.push("\t\tmapConfig: {");
	lines.push(`\t\t\tviewWidth: ${mapItem.mapConfig.viewWidth},`);
	lines.push(`\t\t\tviewHeight: ${mapItem.mapConfig.viewHeight},`);
	lines.push(`\t\t\thexSize: ${mapItem.mapConfig.hexSize},`);
	lines.push(`\t\t\tsourceUrl: "${mapItem.mapConfig.sourceUrl}",`);
	lines.push(`\t\t\tbaseCacheUrl: "${mapItem.mapConfig.baseCacheUrl}",`);
	lines.push(`\t\t\tmaxScale: ${mapItem.mapConfig.maxScale},`);
	lines.push("\t\t},");
	lines.push(`\t\tpinsUrl: "${mapItem.pinsUrl}",`);
	if (mapItem.labelsUrl) {
		lines.push(`\t\tlabelsUrl: "${mapItem.labelsUrl}",`);
	}
	lines.push("\t},");
	return lines.join("\n");
}

async function loadCommunityPairs() {
	const entries = await readdir(COMMUNITY_DIR);
	const lowerLookup = new Map(entries.map((name) => [name.toLowerCase(), name]));
	const civFiles = entries.filter((name) => name.toLowerCase().endsWith(".civ5map"));
	const pairs = [];

	for (const civFile of civFiles) {
		const baseName = civFile.replace(/\.civ5map$/i, "");
		const baseJsonName = `${baseName}.base.json`;
		const baseJsonFile = lowerLookup.get(baseJsonName.toLowerCase());
		if (!baseJsonFile) {
			continue;
		}
		pairs.push({
			baseName,
			civFile,
			baseJsonFile,
		});
	}

	return pairs;
}

async function main() {
	const existingById = new Map(existingMaps.map((mapItem) => [mapItem.id, mapItem]));
	const pairs = await loadCommunityPairs();
	const additions = [];

	for (const pair of pairs) {
		const title = deriveTitle(pair.baseName);
		const id = slugify(title);
		if (!id || existingById.has(id)) {
			continue;
		}

		additions.push({
			id,
			title,
			mapConfig: {
				...DEFAULT_MAP_CONFIG,
				sourceUrl: `/community/${pair.civFile}`,
				baseCacheUrl: `/community/${pair.baseJsonFile}`,
			},
			pinsUrl: `/maps/${id}.pins.json`,
		});
	}

	additions.sort((a, b) => a.title.localeCompare(b.title));

	const nextMaps = [...existingMaps, ...additions];
	const output = ["export const maps = [", nextMaps.map(formatMapEntry).join("\n"), "];", ""].join("\n");
	await writeFile(MAPS_FILE, output, "utf8");

	console.log(`Added ${additions.length} new map(s).`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
