const COMMUNITY_PATCH_SHARED_ID = "d1b6328c-ff44-4b0d-aad7-c657f83610cd";
const COMMUNITY_BALANCE_PATCH_ID = "8411a7a8-dad3-4622-a18e-fcc18324c799";
const JFD_CULTURAL_DIVERSITY_ID = "31a31d1c-b9d7-45e1-842c-23232d66cd47";
const JFD_EVENTS_DECISIONS_ID = "1f941088-b185-4159-865c-472df81247b2";
const JFD_RTP_ID = "eea66053-7579-481a-bb8d-2f3959b59974";
const JFD_CID_ID = "10e9728f-d61c-4317-be4f-7d52d6bae6f4";

const LOG_FILE_NAMES = new Set(["database.log", "xml.log", "lua.log", "modding.log", "stopwatch.log"]);
const HIGH_CONFLICT_TABLES = new Set([
	"beliefs",
	"building_yieldchanges",
	"buildingclasses",
	"buildings",
	"civilization_unitclassoverrides",
	"civilizations",
	"defines",
	"eras",
	"leaders",
	"leader_traits",
	"policies",
	"policybranchtypes",
	"technologies",
	"traits",
	"unitpromotions",
	"units",
]);

const MODINFO_ACTION_TAGS = [
	"UpdateDatabase",
	"UpdateXML",
	"UpdateText",
	"UpdateAudio",
	"UpdateIcons",
	"ImportFiles",
	"ImportIntoVFS",
	"ReloadLandmarkSystem",
	"ReloadStrategicViewSystem",
	"ReloadUnitSystem",
	"ReloadUnitMemberSystem",
	"ReloadGameData",
	"ModLua",
	"Lua",
	"InGameUIAddin",
	"FrontEndUIAddin",
	"EntryPoint",
];

const DLL_TEMPLATE_BLOCKS = [
	{
		id: "community-patch-reference",
		title: "Optional Community Patch reference",
		copy: "Use when the mod can run without CP, but should advertise that it understands the CP path.",
		xml: `<References>\n\t<Mod id="${COMMUNITY_PATCH_SHARED_ID}" minversion="0" maxversion="999" title="Community Patch" />\n</References>`,
	},
	{
		id: "vmc-dependency",
		title: "Required VMC dependency",
		copy: "Use when the mod should refuse to load without Various Mod Components.",
		xml: `<Dependencies>\n\t<Mod id="${COMMUNITY_PATCH_SHARED_ID}" minversion="72" maxversion="999" title="Various Mod Components" />\n</Dependencies>`,
	},
	{
		id: "cbp-reference",
		title: "Optional Community Balance Patch reference",
		copy: "Use when the mod has a VP-aware branch, but that branch is still optional.",
		xml: `<References>\n\t<Mod id="${COMMUNITY_BALANCE_PATCH_ID}" minversion="0" maxversion="999" title="Community Balance Patch" />\n</References>`,
	},
];

const ECOSYSTEM_DEFS = [
	{
		key: "communityPatch",
		label: "Community Patch",
		patterns: [/community patch/i, /\bgame_iscpactive\b/i, new RegExp(COMMUNITY_PATCH_SHARED_ID, "i")],
		tablePatterns: [/\bCustomModOptions\b/i, /\bDefines\b/i, /\bPolicyBranchTypes\b/i],
	},
	{
		key: "vmc",
		label: "Various Mod Components",
		patterns: [/various mod components/i, /\bgame_isvmcactive\b/i],
		tablePatterns: [/\bCustomModOptions\b/i, /\bSaveUtils\b/i],
	},
	{
		key: "voxPopuli",
		label: "Vox Populi / CBP",
		patterns: [/vox populi/i, /community balance patch/i, new RegExp(COMMUNITY_BALANCE_PATCH_ID, "i")],
		tablePatterns: [/\bCommunityBalancePatch\b/i, /\bCommunity Patch\b/i],
	},
	{
		key: "jfd",
		label: "JFD ecosystem",
		patterns: [/rise to power/i, /cultural diversity/i, /cities in development/i, /\bJFD\b/i],
		tablePatterns: [/\bJFD_/i, /\bCID_/i, /\bDecisions_/i],
	},
];

export function normalizeDoctorPath(value) {
	return String(value || "")
		.replace(/\\/g, "/")
		.replace(/^\/+/, "")
		.trim();
}

export function isTextLikeDoctorFile(path) {
	const normalized = normalizeDoctorPath(path).toLowerCase();
	if (!normalized) {
		return false;
	}
	if (LOG_FILE_NAMES.has(baseName(normalized))) {
		return true;
	}
	return [".sql", ".xml", ".lua", ".modinfo", ".log", ".txt", ".md"].some((extension) => normalized.endsWith(extension));
}

export function analyzeModDoctorRecords(records) {
	const normalizedRecords = (records || []).map((record) => ({
		...record,
		path: normalizeDoctorPath(record.path || record.name || ""),
		lowerPath: normalizeDoctorPath(record.path || record.name || "").toLowerCase(),
		text: String(record.text || ""),
	}));

	const packages = buildPackages(normalizedRecords);
	const packageAnalyses = packages.map((pkg) => analyzePackage(pkg));
	const globalTouchedTables = mergeTouchedTables(packageAnalyses.map((pkg) => pkg.touchedTables));
	const packageNameByPath = buildPackageNameByPath(packageAnalyses);
	const logRecords = normalizedRecords.filter((record) => LOG_FILE_NAMES.has(baseName(record.lowerPath)));
	const projectRecords = normalizedRecords.filter((record) => !LOG_FILE_NAMES.has(baseName(record.lowerPath)));
	const allIssues = collectLogIssues(logRecords, projectRecords, globalTouchedTables, packageNameByPath);
	const allDuplicateTypes = packageAnalyses.flatMap((pkg) => pkg.duplicateTypes);
	const allOverrides = packageAnalyses.flatMap((pkg) => pkg.riskyOverrides);
	const allEcosystemNotes = packageAnalyses.flatMap((pkg) => pkg.ecosystemNotes);
	const allDllFindings = packageAnalyses.flatMap((pkg) => pkg.dllFindings);
	const allUnwiredFiles = packageAnalyses.flatMap((pkg) => pkg.unwiredFiles);
	const allListedOnlyFiles = packageAnalyses.flatMap((pkg) => pkg.listedOnlyFiles);
	const allMissingProjectFiles = packageAnalyses.flatMap((pkg) => pkg.missingProjectFiles);
	const allWeakLuaBindings = packageAnalyses.flatMap((pkg) => pkg.weakLuaBindings);
	const allActionOrderIssues = packageAnalyses.flatMap((pkg) => pkg.actionOrderIssues);
	const allMissingTextKeys = packageAnalyses.flatMap((pkg) => pkg.missingTextKeys);
	const allArtAudioIssues = packageAnalyses.flatMap((pkg) => pkg.artAudioIssues);
	const allModinfoReasoning = packageAnalyses.flatMap((pkg) => pkg.modinfoReasoning);
	const allDetectedEcosystems = uniqueByKey(
		packageAnalyses.flatMap((pkg) => pkg.detectedEcosystems),
		(entry) => entry.key,
	);
	const modpackCollisions = buildModpackCollisions(packageAnalyses);
	const rootCauses = buildLikelyRootCauses({
		logIssues: allIssues,
		riskyOverrides: allOverrides,
		missingProjectFiles: allMissingProjectFiles,
		actionOrderIssues: allActionOrderIssues,
		artAudioIssues: allArtAudioIssues,
		modinfoReasoning: allModinfoReasoning,
	});

	return {
		overview: {
			totalFiles: normalizedRecords.length,
			modinfoFiles: normalizedRecords.filter((record) => record.lowerPath.endsWith(".modinfo")).length,
			sqlFiles: normalizedRecords.filter((record) => record.lowerPath.endsWith(".sql")).length,
			xmlFiles: normalizedRecords.filter((record) => record.lowerPath.endsWith(".xml")).length,
			luaFiles: normalizedRecords.filter((record) => record.lowerPath.endsWith(".lua")).length,
			logFiles: normalizedRecords.filter((record) => LOG_FILE_NAMES.has(baseName(record.lowerPath))).length,
			packageCount: packageAnalyses.length,
			prioritySummary: buildPrioritySummary({
				issues: allIssues,
				riskyOverrides: allOverrides,
				unwiredFiles: allUnwiredFiles,
				listedOnlyFiles: allListedOnlyFiles,
				missingProjectFiles: allMissingProjectFiles,
				weakLuaBindings: allWeakLuaBindings,
				actionOrderIssues: allActionOrderIssues,
				missingTextKeys: allMissingTextKeys,
				artAudioIssues: allArtAudioIssues,
				modinfoReasoning: allModinfoReasoning,
				modpackCollisions,
				rootCauses,
			}),
			rootCauses,
			packages: packageAnalyses.map((pkg) => ({
				name: pkg.name,
				rootPath: pkg.rootPath,
				modTitles: pkg.modTitles,
				totalFiles: pkg.records.length,
				modinfoFiles: pkg.modinfoRecords.length,
				sqlFiles: pkg.sqlRecords.length,
				xmlFiles: pkg.xmlRecords.length,
				luaFiles: pkg.luaRecords.length,
				logFiles: pkg.logRecords.length,
				detectedEcosystems: pkg.detectedEcosystems,
			})),
			detectedEcosystems: allDetectedEcosystems,
		},
		logTriage: {
			issues: allIssues.sort((left, right) => severityRank(right.severity) - severityRank(left.severity) || right.count - left.count),
			logCount: normalizedRecords.filter((record) => LOG_FILE_NAMES.has(baseName(record.lowerPath))).length,
		},
		compatibility: {
			duplicateTypes: allDuplicateTypes,
			riskyOverrides: allOverrides,
			guardWarnings: allOverrides.filter((entry) => entry.needsGuard),
			ecosystemNotes: allEcosystemNotes,
			modpackCollisions,
			unwiredFiles: allUnwiredFiles,
			listedOnlyFiles: allListedOnlyFiles,
			missingProjectFiles: allMissingProjectFiles,
			weakLuaBindings: allWeakLuaBindings,
			actionOrderIssues: allActionOrderIssues,
			missingTextKeys: allMissingTextKeys,
			artAudioIssues: allArtAudioIssues,
			modinfoReasoning: allModinfoReasoning,
		},
		dll: {
			findings: allDllFindings,
			templates: DLL_TEMPLATE_BLOCKS,
			helperNotes: [
				"Use <References> when CP, CBP, or VMC support is optional.",
				"Use <Dependencies> only when the mod should refuse to load without the DLL mod present.",
				"If Lua behavior changes under CP, VMC, or VP, add an active mod safety check before the special path runs.",
			],
		},
	};
}

function analyzePackage(pkg) {
	const modinfoRelations = pkg.modinfoRecords.flatMap((record) => parseModinfoRelationships(record.text, record.path));
	const modinfoActionEntries = pkg.modinfoRecords.flatMap((record) => parseModinfoActionEntries(record.text, record.path));
	const modinfoLoadPaths = unique(pkg.modinfoRecords.flatMap((record) => parseModinfoLoadPaths(record.text, record.path)));
	const modinfoListedPaths = unique(pkg.modinfoRecords.flatMap((record) => parseModinfoListedPaths(record.text, record.path)));
	const touchedTables = collectTouchedTables(pkg.sqlRecords, pkg.xmlRecords);
	const typeDefinitions = collectTypeDefinitions(pkg.sqlRecords, pkg.xmlRecords);
	const textTagDefinitions = collectTextTagDefinitions(pkg.sqlRecords, pkg.xmlRecords);
	const unwiredFiles = collectUnwiredFiles(pkg, modinfoLoadPaths).map((entry) => ({
		...entry,
		packageName: pkg.name,
	}));
	const listedOnlyFiles = collectListedOnlyFiles(pkg, modinfoListedPaths, modinfoLoadPaths).map((entry) => ({
		...entry,
		packageName: pkg.name,
	}));
	const missingProjectFiles = collectMissingProjectFiles(pkg, modinfoActionEntries, modinfoListedPaths).map((entry) => ({
		...entry,
		packageName: pkg.name,
	}));
	const weakLuaBindings = collectWeakLuaBindings(pkg, modinfoActionEntries, modinfoListedPaths).map((entry) => ({
		...entry,
		packageName: pkg.name,
	}));
	const actionOrderIssues = collectActionOrderIssues(pkg, modinfoActionEntries).map((entry) => ({
		...entry,
		packageName: pkg.name,
	}));
	const modinfoReasoning = collectModinfoReasoning(pkg, modinfoActionEntries, modinfoListedPaths).map((entry) => ({
		...entry,
		packageName: pkg.name,
	}));
	const missingTextKeys = collectMissingTextKeys(pkg, textTagDefinitions).map((entry) => ({
		...entry,
		packageName: pkg.name,
	}));
	const duplicateTypes = [...typeDefinitions.values()]
		.filter((entries) => entries.length > 1)
		.map((entries) => ({
			type: entries[0].type,
			count: entries.length,
			packageName: pkg.name,
			entries,
		}))
		.sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));
	const riskyOverrides = [...collectSqlOverrides(pkg.sqlRecords), ...collectXmlOverrides(pkg.xmlRecords)].map((entry) => ({
		...entry,
		packageName: pkg.name,
	}));
	const detectedEcosystems = uniqueByKey([...detectEcosystems(pkg.records), ...detectEcosystemsFromRelations(modinfoRelations)], (entry) => entry.key).map((entry) => ({
		...entry,
		files: unique(entry.files || []).sort(),
	}));
	const logIssues = collectLogIssues(pkg.logRecords, pkg.records, touchedTables).map((issue) => ({
		...issue,
		packageName: pkg.name,
	}));
	const artAudioIssues = collectArtAudioIssues({
		packageName: pkg.name,
		sqlRecords: pkg.sqlRecords,
		xmlRecords: pkg.xmlRecords,
		logIssues,
	});
	const ecosystemNotes = buildEcosystemNotes({
		packageName: pkg.name,
		detectedEcosystems,
		modinfoRelations,
		sqlRecords: pkg.sqlRecords,
		xmlRecords: pkg.xmlRecords,
		luaRecords: pkg.luaRecords,
		riskyOverrides,
	});
	const dllFindings = buildDllFindings({
		packageName: pkg.name,
		detectedEcosystems,
		modinfoRelations,
		luaRecords: pkg.luaRecords,
		sqlRecords: pkg.sqlRecords,
	});

	return {
		...pkg,
		modinfoRelations,
		modinfoActionEntries,
		modinfoLoadPaths,
		modinfoListedPaths,
		touchedTables,
		textTagDefinitions,
		unwiredFiles,
		listedOnlyFiles,
		missingProjectFiles,
		weakLuaBindings,
		actionOrderIssues,
		modinfoReasoning,
		missingTextKeys,
		duplicateTypes,
		riskyOverrides,
		detectedEcosystems,
		logIssues,
		artAudioIssues,
		ecosystemNotes,
		dllFindings,
		typeDefinitions,
	};
}

function buildPackages(records) {
	const modinfoRoots = records
		.filter((record) => record.lowerPath.endsWith(".modinfo"))
		.map((record) => directoryName(record.path))
		.filter(Boolean)
		.sort((left, right) => right.length - left.length);

	const packageMap = new Map();
	for (const record of records) {
		const rootPath = findPackageRoot(record.path, modinfoRoots);
		const existing = packageMap.get(rootPath) || {
			name: baseName(rootPath) || "Root Upload",
			rootPath,
			records: [],
		};
		existing.records.push(record);
		packageMap.set(rootPath, existing);
	}

	return [...packageMap.values()]
		.map((pkg) => {
			const modinfoRecords = pkg.records.filter((record) => record.lowerPath.endsWith(".modinfo"));
			const modTitles = unique(modinfoRecords.map((record) => parseModinfoDisplayName(record.text, record.path)).filter(Boolean));
			return {
				...pkg,
				name: modTitles[0] || pkg.name,
				modTitles,
				modinfoRecords,
				sqlRecords: pkg.records.filter((record) => record.lowerPath.endsWith(".sql")),
				xmlRecords: pkg.records.filter((record) => record.lowerPath.endsWith(".xml")),
				luaRecords: pkg.records.filter((record) => record.lowerPath.endsWith(".lua")),
				logRecords: pkg.records.filter((record) => LOG_FILE_NAMES.has(baseName(record.lowerPath))),
			};
		})
		.sort((left, right) => left.name.localeCompare(right.name));
}

function mergeTouchedTables(touchedMaps) {
	const merged = new Map();
	for (const touchedMap of touchedMaps || []) {
		for (const [table, paths] of touchedMap?.entries?.() || []) {
			for (const path of paths || []) {
				pushToMapArray(merged, table, path);
			}
		}
	}
	return merged;
}

function buildPackageNameByPath(packageAnalyses) {
	const packageNameByPath = new Map();
	for (const pkg of packageAnalyses || []) {
		for (const record of pkg.records || []) {
			if (LOG_FILE_NAMES.has(baseName(record.lowerPath || ""))) {
				continue;
			}
			packageNameByPath.set(String(record.lowerPath || "").toLowerCase(), pkg.name);
		}
	}
	return packageNameByPath;
}

function findPackageRoot(path, modinfoRoots) {
	for (const root of modinfoRoots) {
		if (!root) {
			continue;
		}
		if (path === root || path.startsWith(`${root}/`)) {
			return root;
		}
	}
	const first = String(path || "").split("/")[0] || "";
	return first || "Root Upload";
}

function detectEcosystems(records) {
	const hits = new Map();
	for (const definition of ECOSYSTEM_DEFS) {
		for (const record of records) {
			const touchedTables = unique([...extractSqlTouchedTables(record.text), ...extractXmlTouchedTables(record.text)]);
			if (
				definition.patterns.some((pattern) => pattern.test(record.text) || pattern.test(record.path)) ||
				definition.tablePatterns.some((pattern) => touchedTables.some((table) => pattern.test(table)))
			) {
				const existing = hits.get(definition.key) || {
					key: definition.key,
					label: definition.label,
					files: [],
				};
				existing.files.push(record.path);
				hits.set(definition.key, existing);
			}
		}
	}
	return [...hits.values()].map((entry) => ({
		...entry,
		files: unique(entry.files).sort(),
	}));
}

function detectEcosystemsFromRelations(relations) {
	const hits = new Map();
	for (const relation of relations || []) {
		const title = String(relation.title || "");
		if (relation.id === COMMUNITY_PATCH_SHARED_ID || /community patch/i.test(title)) {
			const existing = hits.get("communityPatch") || { key: "communityPatch", label: "Community Patch", files: [] };
			existing.files.push(relation.path);
			hits.set("communityPatch", existing);
		}
		if ((relation.id === COMMUNITY_PATCH_SHARED_ID && Number(relation.minversion || 0) >= 72) || /various mod components/i.test(title) || /\bvmc\b/i.test(title)) {
			const existing = hits.get("vmc") || { key: "vmc", label: "Various Mod Components", files: [] };
			existing.files.push(relation.path);
			hits.set("vmc", existing);
		}
		if (relation.id === COMMUNITY_BALANCE_PATCH_ID || /community balance patch/i.test(title) || /vox populi/i.test(title) || /\bcbp\b/i.test(title)) {
			const existing = hits.get("voxPopuli") || { key: "voxPopuli", label: "Vox Populi / CBP", files: [] };
			existing.files.push(relation.path);
			hits.set("voxPopuli", existing);
		}
		if (
			[JFD_CULTURAL_DIVERSITY_ID, JFD_EVENTS_DECISIONS_ID, JFD_RTP_ID, JFD_CID_ID].includes(relation.id) ||
			/rise to power/i.test(title) ||
			/cultural diversity/i.test(title) ||
			/cities in development/i.test(title) ||
			/\bjfd\b/i.test(title)
		) {
			const existing = hits.get("jfd") || { key: "jfd", label: "JFD ecosystem", files: [] };
			existing.files.push(relation.path);
			hits.set("jfd", existing);
		}
	}
	return [...hits.values()].map((entry) => ({
		...entry,
		files: unique(entry.files || []).sort(),
	}));
}

function parseModinfoDisplayName(text, path) {
	const explicitName = String(text || "")
		.match(/<Name>\s*([^<]+?)\s*<\/Name>/i)?.[1]
		?.trim();
	if (explicitName) {
		return explicitName;
	}
	const titleAttr = String(text || "")
		.match(/\btitle="([^"]+)"/i)?.[1]
		?.trim();
	if (titleAttr) {
		return titleAttr;
	}
	return baseName(path)
		.replace(/\.modinfo$/i, "")
		.trim();
}

function parseModinfoRelationships(text, path) {
	const relationships = [];
	const sectionPattern = /<(Dependencies|References|Blocks)\b[^>]*>([\s\S]*?)<\/\1>/gi;
	let sectionMatch = sectionPattern.exec(text);
	while (sectionMatch) {
		const section = String(sectionMatch[1] || "");
		const body = String(sectionMatch[2] || "");
		const modPattern = /<Mod\b([^>]*)\/?>/gi;
		let modMatch = modPattern.exec(body);
		while (modMatch) {
			const attrs = parseXmlAttributes(modMatch[1] || "");
			relationships.push({
				section,
				path,
				id: attrs.id || "",
				title: attrs.title || "",
				minversion: attrs.minversion || "",
				maxversion: attrs.maxversion || "",
			});
			modMatch = modPattern.exec(body);
		}
		sectionMatch = sectionPattern.exec(text);
	}
	return relationships;
}

function parseModinfoActionEntries(text, modinfoPath) {
	const entries = [];
	const actionPattern = MODINFO_ACTION_TAGS.join("|");
	const tagPattern = new RegExp(`<(${actionPattern})\\b([^>]*)>([\\s\\S]*?)<\\/\\1>|<(${actionPattern})\\b([^>]*)\\/>`, "gi");
	let match = tagPattern.exec(text);
	while (match) {
		const tagName = String(match[1] || match[4] || "");
		const attrs = parseXmlAttributes(match[2] || match[5] || "");
		const body = String(match[3] || "")
			.replace(/<[^>]+>/g, "")
			.trim();
		const candidates = [attrs.file, attrs.path, body].filter(Boolean);
		for (const candidate of candidates) {
			const resolved = resolveModinfoRelativePath(candidate, modinfoPath);
			if (!resolved) {
				continue;
			}
			entries.push({
				tagName,
				path: resolved,
				mode: actionModeForTag(tagName),
			});
		}
		match = tagPattern.exec(text);
	}
	return entries;
}

function parseModinfoLoadPaths(text, modinfoPath) {
	const targets = [];
	for (const entry of parseModinfoActionEntries(text, modinfoPath)) {
		if (!/\.(sql|xml|lua)$/i.test(entry.path)) {
			continue;
		}
		targets.push(entry.path);
	}
	return unique(targets);
}

function parseModinfoListedPaths(text, modinfoPath) {
	const targets = [];
	const filesPattern = /<Files\b[^>]*>([\s\S]*?)<\/Files>/gi;
	let filesMatch = filesPattern.exec(text);
	while (filesMatch) {
		const body = String(filesMatch[1] || "");
		const filePattern = /<File\b([^>]*)>([\s\S]*?)<\/File>|<File\b([^>]*)\/>/gi;
		let fileMatch = filePattern.exec(body);
		while (fileMatch) {
			const fileBody = String(fileMatch[2] || "").trim();
			const attrs = parseXmlAttributes(fileMatch[1] || fileMatch[3] || "");
			const resolved = resolveModinfoRelativePath(fileBody || attrs.file || attrs.path, modinfoPath);
			if (resolved) {
				targets.push(resolved);
			}
			fileMatch = filePattern.exec(body);
		}
		filesMatch = filesPattern.exec(text);
	}
	return unique(targets);
}

function resolveModinfoRelativePath(target, modinfoPath) {
	const normalized = normalizeDoctorPath(target)
		.replace(/^\.\/+/, "")
		.trim();
	if (!normalized) {
		return "";
	}
	const baseDir = directoryName(modinfoPath);
	if (!baseDir) {
		return normalized;
	}
	if (normalized.startsWith(`${baseDir}/`)) {
		return normalized;
	}
	return normalizeDoctorPath(`${baseDir}/${normalized}`);
}

function collectUnwiredFiles(pkg, modinfoLoadPaths) {
	if (!pkg.modinfoRecords.length) {
		return [];
	}
	const loaded = new Set(modinfoLoadPaths.map((entry) => entry.toLowerCase()));
	return [...pkg.sqlRecords, ...pkg.xmlRecords, ...pkg.luaRecords]
		.filter((record) => !loaded.has(record.lowerPath))
		.filter((record) => !/\/(sql|xml|lua)\//i.test(record.lowerPath))
		.map((record) => ({
			path: record.path,
			kind: record.lowerPath.endsWith(".sql") ? "SQL" : record.lowerPath.endsWith(".xml") ? "XML" : "Lua",
			severity: record.lowerPath.endsWith(".lua") ? "medium" : "high",
			summary: `${baseName(record.path)} does not appear to be referenced by the uploaded .modinfo actions.`,
		}));
}

function collectListedOnlyFiles(pkg, modinfoListedPaths, modinfoLoadPaths) {
	if (!pkg.modinfoRecords.length) {
		return [];
	}
	const loaded = new Set(modinfoLoadPaths.map((entry) => entry.toLowerCase()));
	const recordByPath = new Map(pkg.records.map((record) => [record.lowerPath, record]));
	return modinfoListedPaths
		.filter((path) => /\.(sql|xml|lua)$/i.test(path))
		.filter((path) => !loaded.has(path.toLowerCase()))
		.map((path) => recordByPath.get(path.toLowerCase()))
		.filter(Boolean)
		.map((record) => ({
			path: record.path,
			kind: record.lowerPath.endsWith(".sql") ? "SQL" : record.lowerPath.endsWith(".xml") ? "XML" : "Lua",
			severity: "low",
			summary: `${baseName(record.path)} is listed in .modinfo, but it does not look like it ever loads or runs.`,
		}));
}

function collectMissingProjectFiles(pkg, modinfoActionEntries, modinfoListedPaths) {
	const knownPaths = new Set(pkg.records.map((record) => record.lowerPath));
	const referencedPaths = unique([...modinfoListedPaths, ...modinfoActionEntries.map((entry) => entry.path)]);
	return referencedPaths
		.filter((path) => /\.(sql|xml|lua)$/i.test(path))
		.filter((path) => !knownPaths.has(path.toLowerCase()))
		.map((path) => ({
			path,
			kind: path.toLowerCase().endsWith(".sql") ? "SQL" : path.toLowerCase().endsWith(".xml") ? "XML" : "Lua",
			severity: "medium",
			summary: `${baseName(path)} is named in .modinfo, but the file was not found in the uploaded folder.`,
		}));
}

function collectWeakLuaBindings(pkg, modinfoActionEntries, modinfoListedPaths) {
	if (!pkg.luaRecords.length) {
		return [];
	}
	const bindingMap = new Map();
	for (const entry of modinfoActionEntries) {
		if (!entry.path.toLowerCase().endsWith(".lua")) {
			continue;
		}
		pushToMapArray(bindingMap, entry.path, entry.mode);
	}
	const listedSet = new Set(modinfoListedPaths.map((entry) => entry.toLowerCase()));
	return pkg.luaRecords
		.filter((record) => {
			const modes = bindingMap.get(record.lowerPath) || [];
			if (modes.some((mode) => ["gameplay", "ui", "entry"].includes(mode))) {
				return false;
			}
			return listedSet.has(record.lowerPath) || modes.length > 0;
		})
		.map((record) => {
			const modes = bindingMap.get(record.lowerPath) || [];
			return {
				path: record.path,
				kind: "Lua",
				severity: "low",
				summary: modes.includes("import")
					? `${baseName(record.path)} is imported, but it does not look attached to gameplay, UI, or an entry point.`
					: `${baseName(record.path)} is present in .modinfo, but it does not look attached to gameplay, UI, or an entry point.`,
			};
		});
}

function collectActionOrderIssues(pkg, modinfoActionEntries) {
	if (!pkg.modinfoRecords.length || !modinfoActionEntries.length) {
		return [];
	}
	const issues = [];
	const actionEntries = modinfoActionEntries.filter((entry) => /\.(sql|xml|lua)$/i.test(entry.path));
	const firstTextIndex = actionEntries.findIndex((entry) => entry.tagName === "UpdateText");
	const firstDataIndex = actionEntries.findIndex((entry) => ["UpdateDatabase", "UpdateXML", "ReloadGameData"].includes(entry.tagName));
	if (firstTextIndex >= 0 && (firstDataIndex < 0 || firstTextIndex < firstDataIndex)) {
		issues.push({
			path: actionEntries[firstTextIndex].path,
			kind: "Order",
			severity: "low",
			summary: `${baseName(actionEntries[firstTextIndex].path)} loads text before the main data files seem to load.`,
		});
	}

	const baseDataIndices = actionEntries
		.map((entry, index) => ({ entry, index }))
		.filter(({ entry }) => ["UpdateDatabase", "UpdateXML", "ReloadGameData"].includes(entry.tagName) && !isCompatibilityPath(entry.path));
	const firstBaseDataIndex = baseDataIndices.length ? baseDataIndices[0].index : -1;

	for (const { entry, index } of actionEntries.map((entry, index) => ({ entry, index }))) {
		if (!isCompatibilityPath(entry.path)) {
			continue;
		}
		if (firstBaseDataIndex >= 0 && index < firstBaseDataIndex) {
			issues.push({
				path: entry.path,
				kind: "Order",
				severity: "medium",
				summary: `${baseName(entry.path)} looks like a compatibility file, but it seems to load before the base data files.`,
			});
		}
	}

	return uniqueByKey(issues, (entry) => `${entry.kind}|${entry.path}|${entry.summary}`);
}

function collectModinfoReasoning(pkg, modinfoActionEntries, modinfoListedPaths) {
	const issues = [];
	const actionByPath = new Map();
	for (const entry of modinfoActionEntries) {
		pushToMapArray(actionByPath, entry.path.toLowerCase(), entry);
	}

	for (const record of [...pkg.sqlRecords, ...pkg.xmlRecords, ...pkg.luaRecords]) {
		const entries = actionByPath.get(record.lowerPath) || [];
		const first = entries[0];
		if (record.lowerPath.endsWith(".lua") && first && first.mode === "data") {
			issues.push({
				path: record.path,
				kind: "Modinfo",
				severity: "medium",
				summary: `${baseName(record.path)} is Lua, but it is loaded through ${first.tagName}.`,
			});
		}
		if ((record.lowerPath.endsWith(".sql") || record.lowerPath.endsWith(".xml")) && first && ["gameplay", "ui", "entry"].includes(first.mode)) {
			issues.push({
				path: record.path,
				kind: "Modinfo",
				severity: "high",
				summary: `${baseName(record.path)} is data, but it is wired like Lua through ${first.tagName}.`,
			});
		}
		if ((record.lowerPath.endsWith(".sql") || record.lowerPath.endsWith(".xml")) && isLikelyTextDataRecord(record) && first && first.tagName !== "UpdateText") {
			issues.push({
				path: record.path,
				kind: "Modinfo",
				severity: "low",
				summary: `${baseName(record.path)} looks like text data, but it does not use UpdateText.`,
			});
		}
	}

	const listedSet = new Set(modinfoListedPaths.map((entry) => entry.toLowerCase()));
	for (const record of pkg.records) {
		if (!listedSet.has(record.lowerPath)) {
			continue;
		}
		if (!/\.(dds|gr2|fxsxml|ogg|wav|mp3|bnk)$/i.test(record.lowerPath)) {
			continue;
		}
		const actions = actionByPath.get(record.lowerPath) || [];
		if (actions.some((entry) => entry.mode === "import")) {
			continue;
		}
		issues.push({
			path: record.path,
			kind: "Modinfo",
			severity: "low",
			summary: `${baseName(record.path)} is listed in .modinfo, but it does not look imported into VFS.`,
		});
	}

	return uniqueByKey(issues, (entry) => `${entry.path}|${entry.summary}`);
}

function isLikelyTextDataRecord(record) {
	if (/\/(?:text|texts|language|locali[sz]ation)\//i.test(record.path)) {
		return true;
	}
	if (/^language_/i.test(extractFirstInsertedTable(record.text))) {
		return true;
	}
	return /\bTXT_KEY_[A-Z0-9_]+\b/.test(record.text);
}

function extractFirstInsertedTable(text) {
	return String(text || "").match(/\bINSERT(?:\s+OR\s+\w+)?\s+INTO\s+([A-Za-z_][\w]*)/i)?.[1] || "";
}

function collectArtAudioIssues({ packageName, sqlRecords, xmlRecords, logIssues }) {
	const issues = [
		...collectStrategicViewDataIssues(sqlRecords, xmlRecords).map((entry) => ({ ...entry, packageName })),
		...collectIconAtlasIssues(sqlRecords, xmlRecords).map((entry) => ({ ...entry, packageName })),
	];
	for (const issue of logIssues) {
		if (issue.kind === "Constraint failure" && /ArtDefine_StrategicView/i.test(issue.title)) {
			issues.push({
				kind: "Art",
				severity: "high",
				path: issue.relatedPaths?.[0] || "",
				summary: "Strategic view rows collide on StrategicViewType and TileType.",
				detail: "At least one strategic view entry is being inserted more than once.",
				count: issue.count || 1,
			});
		}
		if (issue.kind === "Invalid reference" && /ArtDefine_Landmarks/i.test(issue.title)) {
			const missingValue = issue.excerpt.match(/"([^"]+)"/)?.[1] || "";
			issues.push({
				kind: "Art",
				severity: "high",
				path: issue.relatedPaths?.[0] || "",
				summary: `ArtDefine_Landmarks points at a missing landmark type${missingValue ? `: ${missingValue}` : ""}.`,
				detail: "A landmark row uses a LayoutHandler value that is not present in ArtDefine_LandmarkTypes.",
				count: issue.count || 1,
			});
		}
		if (issue.kind === "Missing entry" && /^Missing entry: UNIT_/i.test(issue.title)) {
			issues.push({
				kind: "Audio",
				severity: "medium",
				path: issue.relatedPaths?.[0] || "",
				summary: `${issue.title} in UnitGameplay2DScripts.`,
				detail: "A unit is missing a UnitGameplay2DScripts entry. This often shows up as a validation problem during XML checks.",
				count: issue.count || 1,
			});
		}
	}
	return uniqueByKey(issues, (entry) => `${entry.kind}|${entry.summary}|${entry.path}`);
}

function collectStrategicViewDataIssues(sqlRecords, xmlRecords) {
	const byKey = new Map();
	for (const record of sqlRecords) {
		for (const statement of splitSqlStatements(record.text)) {
			const parsed = parseInsertStatement(statement);
			if (!parsed || parsed.table.toLowerCase() !== "artdefine_strategicview") {
				continue;
			}
			const strategicViewTypeIndex = parsed.columns.indexOf("strategicviewtype");
			const tileTypeIndex = parsed.columns.indexOf("tiletype");
			if (strategicViewTypeIndex < 0 || tileTypeIndex < 0) {
				continue;
			}
			for (const row of parsed.rows) {
				const strategicViewType = unwrapSqlString(row[strategicViewTypeIndex]);
				const tileType = unwrapSqlString(row[tileTypeIndex]);
				if (!strategicViewType || !tileType) {
					continue;
				}
				pushToMapArray(byKey, `${strategicViewType}|${tileType}`, record.path);
			}
		}
	}

	for (const record of xmlRecords) {
		const rowPattern = /<(?:Row|ArtDefine_StrategicView)\b([^>]*)\/?>/gi;
		let match = rowPattern.exec(record.text);
		while (match) {
			const attrs = parseXmlAttributes(match[1] || "");
			const strategicViewType = attrs.strategicviewtype || "";
			const tileType = attrs.tiletype || "";
			if (strategicViewType && tileType) {
				pushToMapArray(byKey, `${strategicViewType}|${tileType}`, record.path);
			}
			match = rowPattern.exec(record.text);
		}
	}

	return [...byKey.entries()]
		.filter(([, paths]) => unique(paths).length > 1)
		.map(([key, paths]) => {
			const [strategicViewType, tileType] = key.split("|");
			const uniquePaths = unique(paths);
			return {
				kind: "Art",
				severity: "medium",
				path: uniquePaths[0],
				summary: `Strategic view key ${strategicViewType} / ${tileType} appears more than once.`,
				detail: uniquePaths.join(" | "),
				count: uniquePaths.length,
			};
		});
}

function collectIconAtlasIssues(sqlRecords, xmlRecords) {
	const referenced = new Map();
	const defined = new Set();

	for (const record of xmlRecords) {
		const referencePattern = /\bIconAtlas="([^"]+)"/gi;
		let referenceMatch = referencePattern.exec(record.text);
		while (referenceMatch) {
			pushToMapArray(referenced, referenceMatch[1], record.path);
			referenceMatch = referencePattern.exec(record.text);
		}

		const rowPattern = /<(?:Row|IconTextureAtlases)\b([^>]*)\/?>/gi;
		let rowMatch = rowPattern.exec(record.text);
		while (rowMatch) {
			const attrs = parseXmlAttributes(rowMatch[1] || "");
			if (attrs.atlas) {
				defined.add(attrs.atlas);
			}
			rowMatch = rowPattern.exec(record.text);
		}
	}

	for (const record of sqlRecords) {
		for (const statement of splitSqlStatements(record.text)) {
			const parsed = parseInsertStatement(statement);
			if (!parsed) {
				continue;
			}
			if (parsed.table.toLowerCase() === "icontextureatlases") {
				const atlasIndex = parsed.columns.indexOf("atlas");
				if (atlasIndex >= 0) {
					for (const row of parsed.rows) {
						const atlas = unwrapSqlString(row[atlasIndex]);
						if (atlas) {
							defined.add(atlas);
						}
					}
				}
			}
			const iconAtlasIndex = parsed.columns.indexOf("iconatlas");
			if (iconAtlasIndex >= 0) {
				for (const row of parsed.rows) {
					const atlas = unwrapSqlString(row[iconAtlasIndex]);
					if (atlas) {
						pushToMapArray(referenced, atlas, record.path);
					}
				}
			}
		}
	}

	return [...referenced.entries()]
		.filter(([atlas]) => !defined.has(atlas))
		.map(([atlas, paths]) => ({
			kind: "Art",
			severity: "low",
			path: unique(paths)[0],
			summary: `Icon atlas ${atlas} is referenced, but no matching IconTextureAtlases row was found in the upload.`,
			detail: unique(paths).join(" | "),
			count: unique(paths).length,
		}));
}

function isCompatibilityPath(path) {
	return /(?:^|\/)(?:compat|compatibility|cp|cbp|vp|vox[ _-]?populi|vmc|jfd)(?:\/|[_-])/i.test(String(path || ""));
}

function actionModeForTag(tagName) {
	const value = String(tagName || "").toLowerCase();
	if (value === "modlua" || value === "lua") {
		return "gameplay";
	}
	if (value === "ingameuiaddin" || value === "frontenduiaddin") {
		return "ui";
	}
	if (value === "entrypoint") {
		return "entry";
	}
	if (value === "importfiles" || value === "importintovfs") {
		return "import";
	}
	return "data";
}

function parseXmlAttributes(source) {
	const attrs = {};
	const attrPattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
	let match = attrPattern.exec(source);
	while (match) {
		attrs[String(match[1] || "").toLowerCase()] = String(match[2] || "");
		match = attrPattern.exec(source);
	}
	return attrs;
}

function collectTextTagDefinitions(sqlRecords, xmlRecords) {
	const tags = new Set();
	for (const record of xmlRecords) {
		const tagPattern = /\bTag\s*=\s*"(TXT_KEY_[A-Z0-9_]+)"/g;
		let match = tagPattern.exec(record.text);
		while (match) {
			tags.add(match[1]);
			match = tagPattern.exec(record.text);
		}
	}

	for (const record of sqlRecords) {
		for (const statement of splitSqlStatements(record.text)) {
			const parsed = parseInsertStatement(statement);
			if (!parsed) {
				continue;
			}
			if (!/^language_/i.test(parsed.table)) {
				continue;
			}
			const tagIndex = parsed.columns.indexOf("tag");
			if (tagIndex < 0) {
				continue;
			}
			for (const row of parsed.rows) {
				const tag = unwrapSqlString(row[tagIndex]);
				if (/^TXT_KEY_[A-Z0-9_]+$/.test(tag)) {
					tags.add(tag);
				}
			}
		}
	}

	return tags;
}

function collectMissingTextKeys(pkg, textTagDefinitions) {
	const references = new Map();
	for (const record of [...pkg.sqlRecords, ...pkg.xmlRecords, ...pkg.luaRecords]) {
		const keyPattern = /\bTXT_KEY_[A-Z0-9_]+\b/g;
		let match = keyPattern.exec(record.text);
		while (match) {
			const key = String(match[0] || "");
			if (textTagDefinitions.has(key)) {
				match = keyPattern.exec(record.text);
				continue;
			}
			pushToMapArray(references, key, record.path);
			match = keyPattern.exec(record.text);
		}
	}

	return [...references.entries()]
		.filter(([, paths]) => paths.length)
		.map(([key, paths]) => ({
			key,
			paths,
			severity: "low",
			summary: `${key} is referenced, but no matching text entry was found in the uploaded files.`,
		}))
		.sort((left, right) => left.key.localeCompare(right.key));
}

function collectTouchedTables(sqlRecords, xmlRecords) {
	const touched = new Map();
	for (const record of sqlRecords) {
		for (const table of extractSqlTouchedTables(record.text)) {
			pushToMapArray(touched, table, record.path);
		}
	}
	for (const record of xmlRecords) {
		for (const table of extractXmlTouchedTables(record.text)) {
			pushToMapArray(touched, table, record.path);
		}
	}
	return touched;
}

function extractSqlTouchedTables(text) {
	const tables = [];
	const pattern = /\b(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|UPDATE|DELETE\s+FROM)\s+([A-Za-z_][\w]*)/gi;
	let match = pattern.exec(text);
	while (match) {
		tables.push(String(match[1] || ""));
		match = pattern.exec(text);
	}
	return unique(tables);
}

function extractXmlTouchedTables(text) {
	const tables = [];
	const tablePattern = /<(Table|Insert|Update|Delete)\b[^>]*table="([^"]+)"/gi;
	let match = tablePattern.exec(text);
	while (match) {
		tables.push(String(match[2] || ""));
		match = tablePattern.exec(text);
	}
	return unique(tables);
}

function collectTypeDefinitions(sqlRecords, xmlRecords) {
	const definitions = new Map();
	for (const record of xmlRecords) {
		const typePattern = /\bType\s*=\s*"([A-Z0-9_]+)"/g;
		let match = typePattern.exec(record.text);
		while (match) {
			pushTypeDefinition(definitions, {
				type: match[1],
				path: record.path,
				source: "XML",
			});
			match = typePattern.exec(record.text);
		}
	}

	for (const record of sqlRecords) {
		for (const definition of extractSqlTypeDefinitions(record.text, record.path)) {
			pushTypeDefinition(definitions, definition);
		}
	}
	return definitions;
}

function pushTypeDefinition(definitions, entry) {
	const key = String(entry.type || "");
	if (!key) {
		return;
	}
	const list = definitions.get(key) || [];
	list.push(entry);
	definitions.set(key, list);
}

function extractSqlTypeDefinitions(text, path) {
	const definitions = [];
	for (const statement of splitSqlStatements(text)) {
		const parsed = parseInsertStatement(statement);
		if (!parsed || parsed.typeIndex < 0) {
			continue;
		}
		for (const row of parsed.rows) {
			const rawValue = row[parsed.typeIndex];
			const direct = unwrapSqlString(rawValue);
			const fallbackMatch = String(rawValue || "").match(/'([A-Z0-9_]+)'/);
			const type = /^[A-Z0-9_]+$/.test(direct) ? direct : fallbackMatch?.[1] || "";
			if (!type) {
				continue;
			}
			definitions.push({
				type,
				path,
				source: "SQL",
				table: parsed.table,
			});
		}
	}
	return definitions;
}

function splitSqlStatements(source) {
	const statements = [];
	let current = "";
	let inString = false;
	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		const next = source[index + 1];
		current += char;
		if (inString) {
			if (char === "'" && next === "'") {
				current += next;
				index += 1;
				continue;
			}
			if (char === "'") {
				inString = false;
			}
			continue;
		}
		if (char === "'") {
			inString = true;
			continue;
		}
		if (char === ";") {
			const trimmed = current.trim();
			if (trimmed) {
				statements.push(trimmed);
			}
			current = "";
		}
	}
	if (current.trim()) {
		statements.push(current.trim());
	}
	return statements;
}

function parseInsertStatement(statement) {
	const headerMatch = statement.match(/INSERT(?:\s+OR\s+\w+)?\s+INTO\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*/i);
	if (!headerMatch) {
		return null;
	}
	const table = String(headerMatch[1] || "");
	const columns = String(headerMatch[2] || "")
		.split(",")
		.map((column) =>
			column
				.replace(/[\[\]`"' ]/g, "")
				.trim()
				.toLowerCase(),
		);
	const typeIndex = columns.indexOf("type");
	const afterHeader = statement.slice(headerMatch.index + headerMatch[0].length).trim();
	if (/^values\b/i.test(afterHeader)) {
		return {
			table,
			columns,
			typeIndex,
			rows: parseSqlTuples(afterHeader.replace(/^values\b/i, "").trim()),
		};
	}
	if (/^select\b/i.test(afterHeader)) {
		return {
			table,
			columns,
			typeIndex,
			rows: parseInsertSelectRows(afterHeader),
		};
	}
	return null;
}

function parseInsertSelectRows(source) {
	const rows = [];
	const segments = splitUnionSelectSegments(source);
	for (const segment of segments) {
		const clause = extractSelectClause(segment);
		if (!clause) {
			continue;
		}
		rows.push(splitTopLevelCsv(clause).map((entry) => entry.trim()));
	}
	return rows;
}

function splitUnionSelectSegments(source) {
	const segments = [];
	let current = "";
	let inString = false;
	let depth = 0;
	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		const next = source[index + 1];
		if (inString) {
			current += char;
			if (char === "'" && next === "'") {
				current += next;
				index += 1;
				continue;
			}
			if (char === "'") {
				inString = false;
			}
			continue;
		}
		if (char === "'") {
			inString = true;
			current += char;
			continue;
		}
		if (char === "(") {
			depth += 1;
			current += char;
			continue;
		}
		if (char === ")") {
			depth -= 1;
			current += char;
			continue;
		}
		if (depth === 0 && source.slice(index).match(/^UNION(?:\s+ALL)?\b/i)) {
			if (current.trim()) {
				segments.push(current.trim());
			}
			current = "";
			const unionMatch = source.slice(index).match(/^UNION(?:\s+ALL)?\b/i);
			index += unionMatch[0].length - 1;
			continue;
		}
		current += char;
	}
	if (current.trim()) {
		segments.push(current.trim());
	}
	return segments;
}

function extractSelectClause(segment) {
	const selectMatch = segment.match(/^SELECT\s+([\s\S]+)$/i);
	if (!selectMatch) {
		return "";
	}
	const content = selectMatch[1];
	let inString = false;
	let depth = 0;
	for (let index = 0; index < content.length; index += 1) {
		const char = content[index];
		const next = content[index + 1];
		if (inString) {
			if (char === "'" && next === "'") {
				index += 1;
				continue;
			}
			if (char === "'") {
				inString = false;
			}
			continue;
		}
		if (char === "'") {
			inString = true;
			continue;
		}
		if (char === "(") {
			depth += 1;
			continue;
		}
		if (char === ")") {
			depth -= 1;
			continue;
		}
		if (depth === 0 && content.slice(index).match(/^(FROM|WHERE|ORDER\s+BY|GROUP\s+BY|LIMIT)\b/i)) {
			return content.slice(0, index).trim();
		}
	}
	return content.trim();
}

function splitTopLevelCsv(source) {
	const values = [];
	let current = "";
	let inString = false;
	let depth = 0;
	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		const next = source[index + 1];
		if (inString) {
			current += char;
			if (char === "'" && next === "'") {
				current += next;
				index += 1;
				continue;
			}
			if (char === "'") {
				inString = false;
			}
			continue;
		}
		if (char === "'") {
			inString = true;
			current += char;
			continue;
		}
		if (char === "(") {
			depth += 1;
			current += char;
			continue;
		}
		if (char === ")") {
			depth -= 1;
			current += char;
			continue;
		}
		if (char === "," && depth === 0) {
			values.push(current.trim());
			current = "";
			continue;
		}
		current += char;
	}
	if (current.trim()) {
		values.push(current.trim());
	}
	return values;
}

function parseSqlTuples(source) {
	const tuples = [];
	let tuple = [];
	let value = "";
	let depth = 0;
	let inString = false;
	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		const next = source[index + 1];
		if (inString) {
			value += char;
			if (char === "'" && next === "'") {
				value += next;
				index += 1;
				continue;
			}
			if (char === "'") {
				inString = false;
			}
			continue;
		}
		if (char === "'") {
			inString = true;
			value += char;
			continue;
		}
		if (char === "(") {
			if (depth > 0) {
				value += char;
			}
			depth += 1;
			continue;
		}
		if (char === ")") {
			depth -= 1;
			if (depth === 0) {
				tuple.push(value.trim());
				tuples.push(tuple);
				tuple = [];
				value = "";
			} else {
				value += char;
			}
			continue;
		}
		if (char === "," && depth === 1) {
			tuple.push(value.trim());
			value = "";
			continue;
		}
		if (depth >= 1) {
			value += char;
		}
	}
	return tuples;
}

function unwrapSqlString(value) {
	const raw = String(value || "").trim();
	if (!raw) {
		return "";
	}
	if (raw.startsWith("N'") && raw.endsWith("'")) {
		return raw.slice(2, -1).replace(/''/g, "'");
	}
	if (raw.startsWith("'") && raw.endsWith("'")) {
		return raw.slice(1, -1).replace(/''/g, "'");
	}
	return raw;
}

function collectSqlOverrides(sqlRecords) {
	const issues = [];
	for (const record of sqlRecords) {
		for (const statement of splitSqlStatements(record.text)) {
			const match = statement.match(/^(UPDATE|DELETE\s+FROM)\s+([A-Za-z_][\w]*)\b([\s\S]*)$/i);
			if (!match) {
				continue;
			}
			const action = String(match[1] || "").toUpperCase();
			const table = String(match[2] || "");
			const tail = String(match[3] || "");
			const hasWhere = /\bWHERE\b/i.test(tail);
			const hasExists = /\bEXISTS\s*\(/i.test(statement);
			const riskyTable = HIGH_CONFLICT_TABLES.has(table.toLowerCase());
			const severity = !hasWhere ? "high" : riskyTable && !hasExists ? "medium" : "";
			if (!severity) {
				continue;
			}
			issues.push({
				kind: "SQL override",
				severity,
				path: record.path,
				table,
				action,
				needsGuard: riskyTable && hasWhere && !hasExists,
				summary: !hasWhere ? `${action} on ${table} runs without a WHERE clause.` : `${action} on ${table} has no EXISTS safety check.`,
				links: buildSchemaLink(table),
			});
		}
	}
	return issues;
}

function collectXmlOverrides(xmlRecords) {
	const issues = [];
	for (const record of xmlRecords) {
		const pattern = /<(Update|Delete)\b[^>]*>([\s\S]*?)<\/\1>/gi;
		let match = pattern.exec(record.text);
		while (match) {
			const action = String(match[1] || "");
			const body = String(match[2] || "");
			if (/<Where\b/i.test(body)) {
				match = pattern.exec(record.text);
				continue;
			}
			issues.push({
				kind: "XML override",
				severity: "medium",
				path: record.path,
				table: "",
				action,
				needsGuard: true,
				summary: `${action} block has no <Where> filter.`,
				links: [{ label: "Pattern Library", href: "/pattern-library" }],
			});
			match = pattern.exec(record.text);
		}
	}
	return issues;
}

function buildEcosystemNotes({ packageName, detectedEcosystems, modinfoRelations, sqlRecords, xmlRecords, luaRecords, riskyOverrides }) {
	const notes = [];
	const hasCpRelation = modinfoRelations.some((relation) => relation.id === COMMUNITY_PATCH_SHARED_ID || /community patch/i.test(relation.title));
	const hasVmcRelation = modinfoRelations.some((relation) => relation.id === COMMUNITY_PATCH_SHARED_ID && (Number(relation.minversion || 0) >= 72 || /various mod components/i.test(relation.title)));
	const hasCbpRelation = modinfoRelations.some((relation) => relation.id === COMMUNITY_BALANCE_PATCH_ID || /community balance patch|vox populi/i.test(relation.title));
	const hasJfdRelation = modinfoRelations.some(
		(relation) =>
			[JFD_CULTURAL_DIVERSITY_ID, JFD_EVENTS_DECISIONS_ID, JFD_RTP_ID, JFD_CID_ID].includes(relation.id) || /jfd|rise to power|cultural diversity|cities in development/i.test(relation.title),
	);
	const touchedTables = unique([...sqlRecords, ...xmlRecords].flatMap((record) => extractSqlTouchedTables(record.text))).filter(Boolean);

	if (touchedTables.some((table) => HIGH_CONFLICT_TABLES.has(String(table).toLowerCase()))) {
		notes.push({
			severity: riskyOverrides.some((entry) => entry.severity === "high") ? "high" : "medium",
			title: packageName ? `${packageName}: touches high-conflict core tables` : "Touches high-conflict core tables",
			copy: `This package edits shared core tables such as ${touchedTables
				.filter((table) => HIGH_CONFLICT_TABLES.has(String(table).toLowerCase()))
				.slice(0, 6)
				.join(", ")}${touchedTables.length > 6 ? ", and more" : ""}.`,
		});
	}

	if ((hasCpRelation || hasCbpRelation) && !luaRecords.some((record) => /\bModding\.GetActivatedMods\b|\bGame_IsCPActive\b|\bGame_IsVMCActive\b/i.test(record.text))) {
		notes.push({
			severity: "low",
			title: `${packageName}: DLL relation present, but no active mod check found`,
			copy: "This may be fine for SQL only support, but mixed Lua behavior usually benefits from an active mod safety check.",
		});
	}

	if (detectedEcosystems.some((entry) => entry.key === "jfd") && !hasJfdRelation) {
		notes.push({
			severity: "medium",
			title: `${packageName}: JFD-related code detected without modinfo signaling`,
			copy: "Files mention JFD ecosystem content, but the .modinfo does not clearly advertise the compatibility path.",
		});
	}

	if (detectedEcosystems.some((entry) => ["communityPatch", "vmc", "voxPopuli"].includes(entry.key)) && !hasCpRelation && !hasVmcRelation && !hasCbpRelation) {
		notes.push({
			severity: "medium",
			title: `${packageName}: DLL related code found without a matching modinfo relation`,
			copy: "The uploaded files mention CP, VMC, or VP behavior, but the .modinfo does not expose a matching dependency or reference.",
		});
	}

	if (hasVmcRelation && !modinfoRelations.some((relation) => Number(relation.minversion || 0) >= 72)) {
		notes.push({
			severity: "low",
			title: `${packageName}: VMC relation may be ambiguous`,
			copy: "VMC and Community Patch can share the same base mod ID. If you mean VMC, keep the minversion high enough to distinguish it.",
		});
	}

	return notes;
}

function collectLogIssues(logRecords, records, touchedTables, packageNameByPath = new Map()) {
	const issues = [];
	const seen = new Map();
	const correlationIndex = buildCorrelationIndex(records, touchedTables, packageNameByPath);
	for (const record of logRecords) {
		const lines = record.text.split(/\r?\n/);
		for (const line of lines) {
			const issue = parseLogLine(line, record.path, correlationIndex);
			if (!issue) {
				continue;
			}
			const key = issue.groupKey || `${issue.kind}|${issue.table || ""}|${issue.fileHint || ""}|${issue.excerpt}`;
			const existing = seen.get(key);
			if (existing) {
				existing.count += 1;
				existing.relatedPaths = unique([...(existing.relatedPaths || []), ...(issue.relatedPaths || [])]);
				existing.relatedPackages = unique([...(existing.relatedPackages || []), ...(issue.relatedPackages || [])]);
				continue;
			}
			const next = { ...issue, count: 1 };
			seen.set(key, next);
			issues.push(next);
		}
	}
	return issues;
}

function buildCorrelationIndex(records, touchedTables, packageNameByPath = new Map()) {
	const fileByBase = new Map();
	for (const record of records) {
		pushToMapArray(fileByBase, baseName(record.path).toLowerCase(), record.path);
	}
	return {
		fileByBase,
		touchedTables,
		packageNameByPath,
		knownPackageNames: unique([...packageNameByPath.values()]).sort(),
	};
}

function parseLogLine(line, path, correlationIndex) {
	const text = String(line || "").trim();
	if (!text) {
		return null;
	}

	if (baseName(path).toLowerCase() === "stopwatch.log") {
		return parseStopwatchLine(text);
	}

	const fileHint = extractFileHint(text);
	const fileMatches = correlateFileHint(fileHint, correlationIndex);
	const tableFromText = extractTableHint(text);
	const tableMatches = correlateTableHint(tableFromText, correlationIndex);

	const noTable = text.match(/no such table[:\s]+([A-Za-z_][\w]*)/i);
	if (noTable) {
		const table = noTable[1];
		return withCorrelatedPackages(
			{
				logName: baseName(path),
				severity: "high",
				kind: "Missing table",
				groupKey: `missing-table|${table}`,
				title: `Missing table: ${table}`,
				excerpt: text,
				table,
				fileHint,
				links: buildIssueLinks({ table, isLua: false }),
				nextSteps: [
					`Check whether ${table} is created by a required dependency or another SQL/XML file that is not loading yet.`,
					"Confirm the .modinfo action order so the file that creates the table runs before files that use it.",
				],
			},
			unique([...fileMatches, ...correlateTableHint(table, correlationIndex)]),
			correlationIndex,
		);
	}

	const noColumn = text.match(/(?:has no column named|no such column[:\s]+)([A-Za-z_][\w]*)/i);
	if (noColumn) {
		return withCorrelatedPackages(
			{
				logName: baseName(path),
				severity: "high",
				kind: "Missing column",
				groupKey: `missing-column|${tableFromText || ""}|${noColumn[1]}`,
				title: `Missing column: ${noColumn[1]}`,
				excerpt: text,
				table: tableFromText,
				fileHint,
				links: buildIssueLinks({ table: tableFromText, isLua: false }),
				nextSteps: [
					"Check the target table in Schema Browser and confirm the column name matches the current schema.",
					"If this column only exists under VP, CP, or VMC, move it into a guarded compatibility file.",
				],
			},
			unique([...fileMatches, ...tableMatches]),
			correlationIndex,
		);
	}

	const constraint = text.match(/constraint failed[:\s]+([A-Za-z_][\w.]*)/i);
	if (constraint) {
		return withCorrelatedPackages(
			{
				logName: baseName(path),
				severity: "high",
				kind: "Constraint failure",
				groupKey: `constraint|${constraint[1]}`,
				title: `Constraint failed: ${constraint[1]}`,
				excerpt: text,
				table: tableFromText,
				fileHint,
				links: buildIssueLinks({ table: tableFromText, isLua: false }),
				nextSteps: ["Check whether the row points at a Type or text key that does not exist yet.", "Confirm required parent rows load before the row that references them."],
			},
			unique([...fileMatches, ...tableMatches]),
			correlationIndex,
		);
	}

	const invalidReference = text.match(/Invalid Reference on\s+([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\s+-\s+"([^"]+)"\s+does not exist in\s+([A-Za-z_][\w]*)/i);
	if (invalidReference) {
		const [, sourceTable, sourceColumn, missingValue, targetTable] = invalidReference;
		return withCorrelatedPackages(
			{
				logName: baseName(path),
				severity: "high",
				kind: "Invalid reference",
				groupKey: `invalid-reference|${sourceTable}|${sourceColumn}|${missingValue}|${targetTable}`,
				title: `Invalid reference: ${sourceTable}.${sourceColumn}`,
				excerpt: text,
				table: sourceTable,
				fileHint,
				links: uniqueByKey([...buildSchemaLink(sourceTable), ...buildSchemaLink(targetTable), { label: "Pattern Library", href: "/pattern-library" }], (entry) => entry.href),
				nextSteps: [
					`If "${missingValue}" is meant to be custom, add it to ${targetTable} before ${sourceTable} rows load.`,
					`If "${missingValue}" should already exist, check the spelling in ${sourceTable}.${sourceColumn}.`,
					`If another file adds "${missingValue}" to ${targetTable}, load that parent file earlier in .modinfo.`,
				],
			},
			unique([...fileMatches, ...correlateTableHint(sourceTable, correlationIndex), ...correlateTableHint(targetTable, correlationIndex)]),
			correlationIndex,
		);
	}

	const missingEntry = text.match(/Missing Entry for\s+([A-Za-z_][\w]*)/i);
	if (missingEntry) {
		const entryType = missingEntry[1];
		return withCorrelatedPackages(
			{
				logName: baseName(path),
				severity: "medium",
				kind: "Missing entry",
				groupKey: `missing-entry|${entryType}`,
				title: `Missing entry: ${entryType}`,
				excerpt: text,
				table: "",
				fileHint,
				links: [{ label: "Pattern Library", href: "/pattern-library" }],
				nextSteps: [
					`Check whether ${entryType} is expected to exist in this mod setup or whether another mod removed or renamed it.`,
					"Look for art, audio, or gameplay support tables that still reference the missing entry.",
				],
			},
			fileMatches,
			correlationIndex,
		);
	}

	if (/validation failed/i.test(text)) {
		return withCorrelatedPackages(
			{
				logName: baseName(path),
				severity: "medium",
				kind: "Validation failed",
				groupKey: `validation-failed|${baseName(path)}`,
				title: "Game database validation failed",
				excerpt: text,
				table: "",
				fileHint,
				links: [{ label: "Pattern Library", href: "/pattern-library" }],
				nextSteps: [
					"Check the lines just above this one in Database.log or xml.log. That is usually where the real cause is shown.",
					"If stopwatch.log is present, compare the failure time against validation stages to see whether the break happens during foreign key checks or later DLL loading.",
				],
			},
			fileMatches,
			correlationIndex,
		);
	}

	if (/runtime error|stack traceback|attempt to (?:index|call)|nil value/i.test(text)) {
		return withCorrelatedPackages(
			{
				logName: baseName(path),
				severity: "high",
				kind: "Lua runtime error",
				groupKey: `lua-runtime|${fileHint || baseName(path)}`,
				title: "Lua runtime error",
				excerpt: text,
				table: "",
				fileHint,
				links: buildIssueLinks({ table: "", isLua: true }),
				nextSteps: [
					"Open the named Lua file first and look for nil access, missing methods, or bad event parameters near the failing line.",
					"If this path is only meant for CP, VP, or VMC, add an active mod safety check before it runs.",
				],
			},
			fileMatches,
			correlationIndex,
		);
	}

	if (/error|failed/i.test(text)) {
		return withCorrelatedPackages(
			{
				logName: baseName(path),
				severity: /warning/i.test(text) ? "medium" : "high",
				kind: "General log error",
				groupKey: `general|${tableFromText || ""}|${fileHint || ""}|${normalizeLogExcerpt(text)}`,
				title: "General log error",
				excerpt: text,
				table: tableFromText,
				fileHint,
				links: buildIssueLinks({ table: tableFromText, isLua: /lua/i.test(baseName(path)) }),
				nextSteps: ["Check the related files first, then compare the table or hook name against Schema Browser or Lua API Explorer."],
			},
			unique([...fileMatches, ...tableMatches]),
			correlationIndex,
		);
	}

	return null;
}

function parseStopwatchLine(text) {
	const match = text.match(/^\[\d+\.\d+\]\s*,\s*(.+?),\s*([\d.]+)\s*$/);
	if (!match) {
		return null;
	}
	const stage = String(match[1] || "")
		.replace(/\t+/g, " ")
		.trim();
	const duration = Number(match[2] || 0);
	const normalizedStage = stage.toLowerCase();

	if (normalizedStage.includes("validate fk constraints")) {
		return {
			logName: "stopwatch.log",
			severity: duration >= 1 ? "medium" : "low",
			kind: "Validation stage",
			groupKey: `stopwatch-validation-${stage}`,
			title: "Foreign key validation stage ran",
			excerpt: `${stage} took ${duration.toFixed(3)} seconds.`,
			table: "",
			fileHint: "",
			relatedPaths: [],
			links: [{ label: "Pattern Library", href: "/pattern-library" }],
			nextSteps: [
				"Check Database.log for invalid reference or constraint errors from the same run.",
				"If the game crashes near this point, the root cause is often a bad table reference rather than the stopwatch stage itself.",
			],
		};
	}

	if (normalizedStage.includes("loadunitlibraries via database") && duration >= 3) {
		return {
			logName: "stopwatch.log",
			severity: "medium",
			kind: "Slow load stage",
			groupKey: `stopwatch-unit-libraries-${stage}`,
			title: "Unit libraries took a long time to load",
			excerpt: `${stage} took ${duration.toFixed(3)} seconds.`,
			table: "",
			fileHint: "",
			relatedPaths: [],
			links: [{ label: "Pattern Library", href: "/pattern-library" }],
			nextSteps: [
				"Check art, unit, and strategic view changes if the game stalls or crashes after database loading.",
				"If Database.log also has art or duplicate row errors, fix those first before chasing the timing note.",
			],
		};
	}

	if ((normalizedStage.includes("reload gamecore dll") || normalizedStage.includes("setactivedlcandmods")) && duration >= 1.25) {
		return {
			logName: "stopwatch.log",
			severity: "low",
			kind: "DLL load stage",
			groupKey: `stopwatch-dll-stage-${stage}`,
			title: "DLL related load stage took noticeable time",
			excerpt: `${stage} took ${duration.toFixed(3)} seconds.`,
			table: "",
			fileHint: "",
			relatedPaths: [],
			links: [{ label: "Pattern Library", href: "/pattern-library" }],
			nextSteps: [
				"If the game crashes right after activation, compare this timing note with Database.log and xml.log errors from the same run.",
				"Mods that depend on CP, VMC, or VP often break here when the database is already in a bad state.",
			],
		};
	}

	return null;
}

function withCorrelatedPackages(issue, relatedPaths, correlationIndex) {
	const normalizedPaths = unique(relatedPaths || []);
	const relatedPackages = resolvePackageNames(normalizedPaths, correlationIndex);
	return {
		...issue,
		relatedPaths: normalizedPaths,
		relatedPackages,
		packageName: issue.packageName || (relatedPackages.length === 1 ? relatedPackages[0] : ""),
	};
}

function resolvePackageNames(paths, correlationIndex) {
	const relatedPackages = [];
	for (const path of paths || []) {
		const packageName = correlationIndex.packageNameByPath.get(normalizeDoctorPath(path).toLowerCase());
		if (packageName) {
			relatedPackages.push(packageName);
		}
	}
	if (!relatedPackages.length && correlationIndex.knownPackageNames.length === 1) {
		return correlationIndex.knownPackageNames;
	}
	return unique(relatedPackages).sort();
}

function normalizeLogExcerpt(text) {
	return String(text || "")
		.toLowerCase()
		.replace(/\d+/g, "#")
		.replace(/\s+/g, " ")
		.trim();
}

function buildIssueLinks({ table, isLua }) {
	const links = [];
	if (table) {
		links.push(...buildSchemaLink(table));
	}
	if (isLua) {
		links.push({ label: "Lua API Explorer", href: "/lua-api-explorer" });
	}
	links.push({ label: "Pattern Library", href: "/pattern-library" });
	return uniqueByKey(links, (entry) => entry.href);
}

function correlateFileHint(fileHint, correlationIndex) {
	if (!fileHint) {
		return [];
	}
	const hits = correlationIndex.fileByBase.get(baseName(fileHint).toLowerCase()) || [];
	return hits.slice(0, 4);
}

function correlateTableHint(table, correlationIndex) {
	const normalized = String(table || "").trim();
	if (!normalized) {
		return [];
	}
	return (correlationIndex.touchedTables.get(normalized.toLowerCase()) || []).slice(0, 4);
}

function extractFileHint(text) {
	const match = text.match(/([A-Za-z0-9_./\\-]+\.(?:sql|xml|lua|modinfo))/i);
	return match ? normalizeDoctorPath(match[1]) : "";
}

function extractTableHint(text) {
	const match = text.match(/\b(?:table|from|into|update)\s+([A-Za-z_][\w]*)/i);
	return match ? match[1] : "";
}

function buildDllFindings({ packageName, detectedEcosystems, modinfoRelations, luaRecords, sqlRecords }) {
	const findings = [];
	const cpRefs = modinfoRelations.filter((relation) => relation.id === COMMUNITY_PATCH_SHARED_ID || /community patch/i.test(relation.title));
	const vmcRefs = modinfoRelations.filter((relation) => (relation.id === COMMUNITY_PATCH_SHARED_ID && Number(relation.minversion || 0) >= 72) || /various mod components/i.test(relation.title));
	const cbpRefs = modinfoRelations.filter((relation) => relation.id === COMMUNITY_BALANCE_PATCH_ID || /community balance patch|vox populi/i.test(relation.title));
	const hasLuaChecks = luaRecords.some((record) => /\bModding\.GetActivatedMods\b|\bGame_IsCPActive\b|\bGame_IsVMCActive\b/i.test(record.text));
	const usesDllKeywords = detectedEcosystems.some((entry) => ["communityPatch", "vmc", "voxPopuli"].includes(entry.key));

	if (vmcRefs.length) {
		findings.push({
			severity: "low",
			title: `${packageName}: VMC relation detected`,
			copy: `Found ${vmcRefs.length} modinfo relation${vmcRefs.length === 1 ? "" : "s"} pointing at Various Mod Components.`,
		});
	}
	if (cpRefs.length) {
		findings.push({
			severity: "low",
			title: `${packageName}: Community Patch relation detected`,
			copy: `Found ${cpRefs.length} modinfo relation${cpRefs.length === 1 ? "" : "s"} pointing at Community Patch.`,
		});
	}
	if (cbpRefs.length) {
		findings.push({
			severity: "low",
			title: `${packageName}: Community Balance Patch / VP relation detected`,
			copy: `Found ${cbpRefs.length} modinfo relation${cbpRefs.length === 1 ? "" : "s"} pointing at Community Balance Patch or Vox Populi.`,
		});
	}
	if (usesDllKeywords && !hasLuaChecks) {
		findings.push({
			severity: "medium",
			title: `${packageName}: DLL related content, but no active mod safety check found`,
			copy: "The files mention VMC, CP, or VP, but no clear Modding.GetActivatedMods check was found in Lua.",
		});
	}
	if (!cpRefs.length && !vmcRefs.length && !cbpRefs.length) {
		findings.push({
			severity: "low",
			title: `${packageName}: no DLL relation found in .modinfo`,
			copy: "No VMC, Community Patch, or Community Balance Patch dependency or reference was found in uploaded .modinfo files.",
		});
	}
	if (sqlRecords.some((record) => /\b(Defines|Policies|Traits|Beliefs|Technologies|Units|Buildings)\b/i.test(record.text)) && !cpRefs.length && !cbpRefs.length) {
		findings.push({
			severity: "low",
			title: `${packageName}: shared balance tables touched`,
			copy: "This package edits tables that overhauls often rebalance. If a VP or CP compatibility file is planned, keep those edits isolated and guarded.",
		});
	}

	return findings;
}

function buildModpackCollisions(packageAnalyses) {
	const typeMap = new Map();
	for (const pkg of packageAnalyses) {
		for (const [type, entries] of pkg.typeDefinitions.entries()) {
			const bucket = typeMap.get(type) || [];
			for (const entry of entries) {
				bucket.push({
					...entry,
					packageName: pkg.name,
				});
			}
			typeMap.set(type, bucket);
		}
	}

	return [...typeMap.entries()]
		.map(([type, entries]) => ({
			type,
			entries,
			packageNames: unique(entries.map((entry) => entry.packageName)),
		}))
		.filter((entry) => entry.packageNames.length > 1)
		.sort((left, right) => right.packageNames.length - left.packageNames.length || left.type.localeCompare(right.type));
}

function buildLikelyRootCauses({ logIssues, riskyOverrides, missingProjectFiles, actionOrderIssues, artAudioIssues, modinfoReasoning }) {
	const causes = [];
	const validationStage = (logIssues || []).find((issue) => issue.kind === "Validation stage");
	const dllLoadStage = (logIssues || []).find((issue) => issue.kind === "DLL load stage");
	const invalidReferences = collapseCauseEntries(
		(logIssues || []).filter((issue) => issue.kind === "Invalid reference"),
		(issue) => issue.groupKey || issue.title,
	);
	const strategicViewConflicts = collapseCauseEntries(
		(artAudioIssues || []).filter((issue) => /strategic view/i.test(issue.summary || "")),
		(issue) => issue.summary || issue.detail || issue.path,
	);
	const landmarkTypeIssues = collapseCauseEntries(
		(artAudioIssues || []).filter((issue) => /ArtDefine_Landmarks points at a missing landmark type/i.test(issue.summary || "")),
		(issue) => issue.summary || issue.path,
	);
	const missingUnitAudio = collapseCauseEntries(
		(artAudioIssues || []).filter((issue) => /UnitGameplay2DScripts/i.test(issue.summary || "")),
		(issue) => issue.summary || issue.path,
	);
	const brokenAtlasIssues = collapseCauseEntries(
		(artAudioIssues || []).filter((issue) => /Icon atlas/i.test(issue.summary || "")),
		(issue) => issue.summary || issue.path,
	);
	const highOverrides = collapseCauseEntries(
		(riskyOverrides || []).filter((issue) => issue.severity === "high"),
		(issue) => issue.summary || issue.path,
	);
	const missingFiles = collapseCauseEntries(
		(missingProjectFiles || []).filter((issue) => issue.severity !== "low"),
		(issue) => issue.path,
	);
	const orderIssues = collapseCauseEntries(
		(actionOrderIssues || []).filter((issue) => issue.severity !== "low"),
		(issue) => issue.summary || issue.path,
	);
	const wrongModinfoWiring = collapseCauseEntries(
		(modinfoReasoning || []).filter((issue) => issue.severity !== "low"),
		(issue) => issue.summary || issue.path,
	);

	if (invalidReferences.length) {
		const top = invalidReferences[0];
		causes.push({
			signature: `root|invalid-reference|${top.summary}`,
			severity: "high",
			score: 160 + top.count * 4,
			title: "Broken table reference is the most likely crash cause",
			copy: `${top.count} invalid reference issue${top.count === 1 ? "" : "s"} point at missing parent rows. ${validationStage ? `The stopwatch log shows the break during foreign key validation.` : "This usually breaks during foreign key validation."}`,
			evidence: [top.summary, top.path ? `First file: ${top.path}` : "", top.packageNames.length ? `Likely mod: ${top.packageNames.join(", ")}` : ""].filter(Boolean),
		});
	}

	if (landmarkTypeIssues.length) {
		const top = landmarkTypeIssues[0];
		causes.push({
			signature: `root|landmark-type|${top.summary}`,
			severity: "high",
			score: 150 + top.count * 3,
			title: "Landmark art rows point at a missing landmark type",
			copy: `At least ${top.count} landmark rows use a LayoutHandler value that does not exist in ArtDefine_LandmarkTypes. Add the missing landmark type, fix the spelling, or load the parent art file earlier.`,
			evidence: [top.summary, top.path ? `First file: ${top.path}` : ""].filter(Boolean),
		});
	}

	if (strategicViewConflicts.length) {
		const top = strategicViewConflicts[0];
		causes.push({
			signature: `root|strategic-view|${top.summary}`,
			severity: "high",
			score: 145 + top.count * 3,
			title: "Strategic view rows are colliding",
			copy: `The scan found repeated strategic view keys or constraint failures. Remove duplicate ArtDefine_StrategicView rows so each StrategicViewType and TileType pair is only inserted once.`,
			evidence: [top.summary, top.path ? `First file: ${top.path}` : ""].filter(Boolean),
		});
	}

	if (missingUnitAudio.length) {
		const top = missingUnitAudio[0];
		causes.push({
			signature: `root|unit-audio|${top.summary}`,
			severity: "medium",
			score: 128 + top.count * 2,
			title: "A unit is missing gameplay audio support data",
			copy: `The XML validation pass found unit entries missing from UnitGameplay2DScripts. Add the missing support row or stop referencing the missing unit key.`,
			evidence: [top.summary, top.path ? `First file: ${top.path}` : ""].filter(Boolean),
		});
	}

	if (brokenAtlasIssues.length) {
		const top = brokenAtlasIssues[0];
		causes.push({
			signature: `root|icon-atlas|${top.summary}`,
			severity: "medium",
			score: 120 + top.count * 2,
			title: "One or more icon atlases look undefined",
			copy: `The scan found icon atlas names that are referenced but not defined in the uploaded data. Add the atlas row, fix the atlas name, or load the atlas file earlier.`,
			evidence: [top.summary, top.path ? `First file: ${top.path}` : ""].filter(Boolean),
		});
	}

	if (highOverrides.length) {
		const top = highOverrides[0];
		causes.push({
			signature: `root|override|${top.summary}`,
			severity: "medium",
			score: 105 + top.count * 2,
			title: "A broad data override may be breaking shared content",
			copy: `One or more UPDATE or DELETE statements run without a narrow safety check. These broad edits can break other mods, DLL paths, or base data assumptions.`,
			evidence: [top.summary, top.path ? `First file: ${top.path}` : ""].filter(Boolean),
		});
	}

	if (missingFiles.length) {
		const top = missingFiles[0];
		causes.push({
			signature: `root|missing-file|${top.path}`,
			severity: "medium",
			score: 96 + top.count,
			title: "A file named in .modinfo is missing from the upload",
			copy: `A file that .modinfo expects to load was not found in the uploaded folder. That often means the file was renamed, moved, or left out of the build.`,
			evidence: [top.path ? `First missing file: ${top.path}` : ""].filter(Boolean),
		});
	}

	if (orderIssues.length) {
		const top = orderIssues[0];
		causes.push({
			signature: `root|load-order|${top.summary}`,
			severity: "medium",
			score: 88 + top.count,
			title: "The .modinfo load order looks wrong",
			copy: `${dllLoadStage ? "The stopwatch log also shows a slow DLL or activation stage. " : ""}Text, compatibility, or parent files may be loading in the wrong order.`,
			evidence: [top.summary, top.path ? `First file: ${top.path}` : ""].filter(Boolean),
		});
	}

	if (wrongModinfoWiring.length) {
		const top = wrongModinfoWiring[0];
		causes.push({
			signature: `root|modinfo-wiring|${top.summary}`,
			severity: "medium",
			score: 82 + top.count,
			title: "One or more files are wired through the wrong .modinfo action",
			copy: `The scan found files that look like text, data, Lua, or VFS assets, but the .modinfo actions do not match how those files usually need to load.`,
			evidence: [top.summary, top.path ? `First file: ${top.path}` : ""].filter(Boolean),
		});
	}

	return causes.sort((left, right) => right.score - left.score || severityRank(right.severity) - severityRank(left.severity) || left.title.localeCompare(right.title)).slice(0, 8);
}

function collapseCauseEntries(entries, keySelector) {
	const groups = new Map();
	for (const entry of entries || []) {
		const key = String(keySelector(entry) || "").trim();
		if (!key) {
			continue;
		}
		const existing = groups.get(key);
		if (existing) {
			existing.count += entry.count || 1;
			existing.packageNames = unique([...(existing.packageNames || []), entry.packageName || "", ...(entry.relatedPackages || [])].filter(Boolean));
			continue;
		}
		groups.set(key, {
			summary: entry.summary || entry.title || key,
			path: entry.path || (entry.relatedPaths || [])[0] || "",
			packageNames: unique([entry.packageName || "", ...(entry.relatedPackages || [])].filter(Boolean)),
			count: entry.count || 1,
		});
	}
	return [...groups.values()].sort((left, right) => right.count - left.count || left.summary.localeCompare(right.summary));
}

function buildPrioritySummary({
	issues,
	riskyOverrides,
	unwiredFiles,
	listedOnlyFiles,
	missingProjectFiles,
	weakLuaBindings,
	actionOrderIssues,
	missingTextKeys,
	artAudioIssues,
	modinfoReasoning,
	modpackCollisions,
	rootCauses,
}) {
	const summary = [];
	const topRootCause = (rootCauses || [])[0];
	if (topRootCause) {
		summary.push(topRootCause.copy);
	}
	const topIssue = [...(issues || [])].sort((left, right) => severityRank(right.severity) - severityRank(left.severity) || right.count - left.count)[0];
	if (topIssue && !topRootCause) {
		summary.push(`Start with ${topIssue.title.toLowerCase()} in ${topIssue.packageName || topIssue.logName}.`);
	}
	const topArtAudio = [...(artAudioIssues || [])].sort((left, right) => severityRank(right.severity) - severityRank(left.severity) || (right.count || 1) - (left.count || 1))[0];
	if (topArtAudio) {
		summary.push(`Check ${baseName(topArtAudio.path || "") || "the art files"} because ${topArtAudio.summary.toLowerCase()}`);
	}
	const topOverride = (riskyOverrides || []).find((entry) => entry.severity === "high");
	if (topOverride) {
		summary.push(`Check ${baseName(topOverride.path)} next because it contains a broad override that may break other content.`);
	}
	const topUnwired = (unwiredFiles || []).find((entry) => entry.severity === "high");
	if (topUnwired) {
		summary.push(`Make sure ${baseName(topUnwired.path)} is actually loaded by the .modinfo actions.`);
	}
	const topListedOnly = (listedOnlyFiles || [])[0];
	if (topListedOnly) {
		summary.push(`Check whether ${baseName(topListedOnly.path)} should only be listed, or whether it should also be set to load or run.`);
	}
	const topMissingFile = (missingProjectFiles || [])[0];
	if (topMissingFile) {
		summary.push(`Check whether ${baseName(topMissingFile.path)} was renamed, moved, or left out of the uploaded folder.`);
	}
	const topLuaBinding = (weakLuaBindings || [])[0];
	if (topLuaBinding) {
		summary.push(`Check whether ${baseName(topLuaBinding.path)} is actually attached to gameplay, UI, or an entry point.`);
	}
	const topModinfoReasoning = (modinfoReasoning || []).find((entry) => entry.severity === "high" || entry.severity === "medium");
	if (topModinfoReasoning) {
		summary.push(`Check ${baseName(topModinfoReasoning.path)} because the .modinfo action does not match the file type.`);
	}
	const topOrderIssue = (actionOrderIssues || [])[0];
	if (topOrderIssue) {
		summary.push(`Check the .modinfo load order because ${baseName(topOrderIssue.path)} may be loading at the wrong time.`);
	}
	if ((modpackCollisions || []).length) {
		summary.push(`Review clashes between packages before combining these uploads into one mod pack.`);
	}
	if (!summary.length && (missingTextKeys || []).length) {
		summary.push(`The scan found missing text keys, so check whether your custom text rows are loaded and spelled correctly.`);
	}
	return unique(summary).slice(0, 6);
}

function buildSchemaLink(table) {
	const normalized = String(table || "").trim();
	if (!normalized) {
		return [{ label: "Schema Browser", href: "/schema-browser" }];
	}
	return [{ label: "Schema Browser", href: `/schema-browser?table=${encodeURIComponent(normalized)}&tab=rows` }];
}

function pushToMapArray(map, key, value) {
	const normalizedKey = String(key || "")
		.trim()
		.toLowerCase();
	if (!normalizedKey || !value) {
		return;
	}
	const list = map.get(normalizedKey) || [];
	list.push(value);
	map.set(normalizedKey, unique(list));
}

function directoryName(path) {
	const normalized = normalizeDoctorPath(path);
	const slash = normalized.lastIndexOf("/");
	return slash >= 0 ? normalized.slice(0, slash) : "";
}

function baseName(path) {
	return (
		String(path || "")
			.split("/")
			.pop() || ""
	);
}

function unique(values) {
	return [...new Set((values || []).filter(Boolean))];
}

function uniqueByKey(values, getKey) {
	const seen = new Set();
	const output = [];
	for (const value of values || []) {
		const key = getKey(value);
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		output.push(value);
	}
	return output;
}

function severityRank(severity) {
	if (severity === "high") {
		return 3;
	}
	if (severity === "medium") {
		return 2;
	}
	return 1;
}
