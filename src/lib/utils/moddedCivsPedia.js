import { MODDED_CIVS_PEDIA_FORMAT_VERSION } from "../data/moddedCivsPedia.js";

const FANDOM_TEMPLATE_NAMES = {
	infobox: ["Infobox civs"],
	modSupport: ["Template:Mod Support Infobox", "Mod Support Infobox"],
};

const VANILLA_RELIGION_TYPES = new Set([
	"RELIGION_BUDDHISM",
	"RELIGION_CHRISTIANITY",
	"RELIGION_CONFUCIANISM",
	"RELIGION_HINDUISM",
	"RELIGION_ISLAM",
	"RELIGION_JUDAISM",
	"RELIGION_ORTHODOXY",
	"RELIGION_PROTESTANTISM",
	"RELIGION_SHINTO",
	"RELIGION_SIKHISM",
	"RELIGION_TAOISM",
	"RELIGION_ZOROASTRIANISM",
]);

const DEFAULT_ENTRY = {
	id: "",
	slug: "",
	kind: "civilization",
	title: "",
	leader: "",
	authors: [],
	summary: "",
	source: {
		type: "",
		wikiPageTitle: "",
		wikiUrl: "",
		workshopUrl: "",
		version: "",
		lastUpdated: "",
		modFolderName: "",
	},
	identity: {
		empireName: "",
		adjectives: "",
		capital: "",
		bias: "",
		religion: [],
		government: "",
		culture: "",
		mapLabelsLanguage: "",
		requiredContent: [],
	},
	presentation: {
		mapImage: "",
		mapImageUrl: "",
		mapImageCaption: "",
		iconImage: "",
		iconImageUrl: "",
		leaderSceneImage: "",
		leaderSceneImageUrl: "",
		leaderSceneArtCredit: "",
		colors: {
			background: "",
			icon: "",
		},
	},
	overview: {
		civilization: {
			title: "",
			url: "",
			body: "",
		},
		leader: {
			title: "",
			body: "",
		},
	},
	dawnOfMan: {
		blessing: "",
		introduction: "",
		defeat: "",
	},
	uniques: [],
	nameLists: [],
	music: {
		peace: {
			title: "",
			credit: "",
		},
		war: {
			title: "",
			credit: "",
		},
	},
	modSupport: {},
	credits: [],
	categories: [],
	navTemplate: "",
	issues: [],
};

export function slugifyPediaValue(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function formatIdentifier(value) {
	return String(value || "")
		.trim()
		.replace(/^TXT_KEY_/, "")
		.replace(/^CIVILIZATION_/, "")
		.replace(/^LEADER_/, "")
		.replace(/^TRAIT_/, "")
		.replace(/^UNIT_/, "")
		.replace(/^BUILDING_/, "")
		.replace(/^IMPROVEMENT_/, "")
		.replace(/_/g, " ")
		.toLowerCase()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stripCivFormatting(value) {
	return cleanText(
		String(value || "")
			.replace(/\\r\\n/g, "\n")
			.replace(/\\n/g, "\n")
			.replace(/\\r/g, "\n")
			.replace(/\[COLOR_[^\]]+]\]?/gi, "")
			.replace(/\[ENDCOLOR]/gi, "")
			.replace(/\[NEWLINE]/gi, "\n")
			.replace(/\s+\n/g, "\n")
			.replace(/\n{3,}/g, "\n\n"),
	);
}

function cloneDefaultEntry() {
	return JSON.parse(JSON.stringify(DEFAULT_ENTRY));
}

function withIssues(entry, issues) {
	entry.issues = [...new Set((issues || []).filter(Boolean))];
	return entry;
}

function ensureArray(value) {
	if (Array.isArray(value)) {
		return value;
	}
	if (value === null || value === undefined || value === "") {
		return [];
	}
	return [value];
}

function cleanText(value) {
	return String(value || "")
		.replace(/\r/g, "")
		.trim();
}

function stripWikiMarkup(value) {
	return cleanText(
		String(value || "")
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/\{\{([^}|]+?) Icon\}\}/g, " $1 ")
			.replace(/\{\{Citizen}}/g, " Citizens ")
			.replace(/\{\{Golden Age}}/g, " Golden Age ")
			.replace(/\{\{Diplomat}}/g, "Diplomat ")
			.replace(/\{\{!}}/g, "|")
			.replace(/\{\{[^}]+}}/g, " ")
			.replace(/\[\[File:[^\]]+]]/gi, "")
			.replace(/\[\[([^|\]]+)\|([^\]]+)]]/g, "$2")
			.replace(/\[\[([^\]]+)]]/g, "$1")
			.replace(/\[(https?:\/\/[^\s]+)\s+([^\]]+)]/g, "$2")
			.replace(/'''([^']+)'''/g, "$1")
			.replace(/''([^']+)''/g, "$1")
			.replace(/&nbsp;/gi, " ")
			.replace(/&ndash;/gi, "-")
			.replace(/&#160;/g, " ")
			.replace(/<[^>]+>/g, "")
			.replace(/[ \t]{2,}/g, " ")
			.replace(/\s+\n/g, "\n")
			.replace(/\n{3,}/g, "\n\n"),
	);
}

function stripLeadingInfoboxTemplate(source) {
	const raw = String(source || "");
	const block = extractTemplateBlock(raw, FANDOM_TEMPLATE_NAMES.infobox);
	if (!block) {
		return raw;
	}
	const startIndex = raw.indexOf(block);
	if (startIndex === -1) {
		return raw;
	}
	return raw.slice(0, startIndex) + raw.slice(startIndex + block.length);
}

function stripLeadingWikiNoise(value) {
	return cleanText(
		String(value || "")
			.replace(/^\s*\{\{Infobox civs[\s\S]*?\}\}\s*/i, "")
			.replace(/^\s*\{\{[^}]+}}\s*/g, "")
			.replace(/^\s*\|[^\n]*\n?/gm, "")
			.replace(/^\s*Adds the\s+/i, "Adds the ")
			.replace(/\n{3,}/g, "\n\n"),
	);
}

export function sanitizePediaProse(value) {
	return stripWikiMarkup(stripLeadingWikiNoise(stripCivFormatting(value)));
}

function stripSqlString(value) {
	return cleanText(
		String(value || "")
			.replace(/^N?'/, "")
			.replace(/'$/, "")
			.replace(/''/g, "'"),
	);
}

function escapeRegex(value) {
	return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fandomBaseUrl(wikiUrl) {
	try {
		const parsed = new URL(cleanText(wikiUrl) || "https://civilization-v-customisation.fandom.com");
		return `${parsed.protocol}//${parsed.host}`;
	} catch {
		return "https://civilization-v-customisation.fandom.com";
	}
}

function buildFandomFileRedirectUrl(fileName, wikiUrl = "") {
	const normalized = cleanText(fileName);
	if (!normalized || !/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(normalized)) {
		return "";
	}
	return `${fandomBaseUrl(wikiUrl)}/wiki/Special:Redirect/file/${encodeURIComponent(normalized)}`;
}

function extractTemplateBlock(source, templateNames) {
	const names = ensureArray(templateNames);
	for (const templateName of names) {
		const needle = `{{${templateName}`;
		const startIndex = source.indexOf(needle);
		if (startIndex === -1) {
			continue;
		}
		let depth = 0;
		for (let index = startIndex; index < source.length - 1; index += 1) {
			const pair = source.slice(index, index + 2);
			if (pair === "{{") {
				depth += 1;
				index += 1;
				continue;
			}
			if (pair === "}}") {
				depth -= 1;
				index += 1;
				if (depth === 0) {
					return source.slice(startIndex, index + 1);
				}
			}
		}
	}
	return "";
}

function parseTemplateParams(block) {
	const body = cleanText(block)
		.replace(/^\{\{[^|\n]+/, "")
		.replace(/}}$/, "");
	const normalizedBody = body.replace(/\|(?=\s*[a-z_][a-z0-9_ ]*\s*=)/gi, "\n|");
	const lines = normalizedBody.split("\n");
	const params = {};
	let currentKey = "";
	for (const rawLine of lines) {
		const line = rawLine.trimEnd();
		const match = line.match(/^\|([^=]+?)\s*=\s*(.*)$/);
		if (match) {
			currentKey = cleanText(match[1]).toLowerCase();
			params[currentKey] = cleanText(match[2]);
			continue;
		}
		if (currentKey) {
			params[currentKey] = cleanText(`${params[currentKey]}\n${line}`);
		}
	}
	return params;
}

function extractSection(source, title) {
	const pattern = new RegExp(`==\\s*${escapeRegex(title)}\\s*==([\\s\\S]*?)(?=\\n==[^=]|$)`, "i");
	return cleanText(source.match(pattern)?.[1] || "");
}

function parseNamedOverviewBlocks(section) {
	const blocks = [];
	const pattern = /===\s*([\s\S]*?)\s*===([\s\S]*?)(?=\n===(?![=])|\n====|\n==[^=]|$)/g;
	let match = pattern.exec(section);
	while (match) {
		const heading = cleanText(match[1]);
		const url = cleanText(heading.match(/\[(https?:\/\/[^\s\]]+)/i)?.[1] || "");
		blocks.push({
			url,
			title: stripWikiMarkup(heading),
			body: stripWikiMarkup(match[2]),
		});
		match = pattern.exec(section);
	}
	return blocks;
}

function parseDawnOfMan(section, wikiUrl = "") {
	const dawnBlock = section.match(/={3,4}\s*(?:'''|''|)?\s*Dawn of Man\s*(?:'''|''|)?\s*={3,4}([\s\S]*?)(?=\n={2,4}\s*[^=\n][^\n]*={2,4}|\n\{\||$)/i)?.[1] || "";
	const image = dawnBlock.match(/\[\[File:([^|\]]+)/i)?.[1] || "";
	const artCredit = cleanText(dawnBlock.match(/\|([^|\]]+)\]\]/)?.[1] || "");
	const withoutFiles = cleanText(dawnBlock.replace(/\[\[File:[\s\S]*?\]\]\s*/gi, ""));
	const introductionMatch = withoutFiles.match(/'''?\s*Introduction\s*:?\s*'''?\s*([\s\S]*?)(?=\n\s*'''?\s*Defeat\s*:?\s*'''?|$)/i);
	const defeatMatch = withoutFiles.match(/'''?\s*Defeat\s*:?\s*'''?\s*([\s\S]*?)$/i);
	const blessingSource = cleanText(withoutFiles.replace(/'''?\s*Introduction\s*:?\s*'''?\s*[\s\S]*$/i, "").replace(/'''?\s*Defeat\s*:?\s*'''?\s*[\s\S]*$/i, ""));
	return {
		image: cleanText(image),
		imageUrl: buildFandomFileRedirectUrl(image, wikiUrl),
		artCredit,
		blessing: stripWikiMarkup(blessingSource),
		introduction: stripWikiMarkup(introductionMatch?.[1] || ""),
		defeat: stripWikiMarkup(defeatMatch?.[1] || ""),
	};
}

function parseStandaloneIconImage(source, wikiUrl = "", excludedFiles = []) {
	const excluded = new Set(
		ensureArray(excludedFiles)
			.map((file) => cleanText(file).toLowerCase())
			.filter(Boolean),
	);
	const strategySection = extractSection(source, "Strategy");
	const strategyImage = cleanText(strategySection.match(/\[\[File:([^|\]]+)/i)?.[1] || "");
	if (strategyImage && !excluded.has(strategyImage.toLowerCase())) {
		return {
			file: strategyImage,
			url: buildFandomFileRedirectUrl(strategyImage, wikiUrl),
		};
	}

	const standaloneMatches = [...source.matchAll(/^\s*\[\[File:([^|\]]+)(?:[^\]]*)\]\]\s*$/gim)];
	for (const match of standaloneMatches) {
		const file = cleanText(match[1]);
		if (!file || excluded.has(file.toLowerCase())) {
			continue;
		}
		return {
			file,
			url: buildFandomFileRedirectUrl(file, wikiUrl),
		};
	}

	return {
		file: "",
		url: "",
	};
}

function parseCollapsibleLists(section) {
	const pattern = /\|\s*class="mw-collapsible[\s\S]*?\|\s*'''([^']+)'''[\s\S]*?<div class="mw-collapsible-content">([\s\S]*?)<\/div>/g;
	const lists = [];
	let match = pattern.exec(section);
	while (match) {
		const items = match[2]
			.split("\n")
			.map((line) => cleanText(line.replace(/^[:*#]\s*/, "")))
			.filter(Boolean);
		lists.push({
			title: cleanText(match[1]),
			items,
		});
		match = pattern.exec(section);
	}
	return lists;
}

function parseMusic(section) {
	const titles = [...section.matchAll(/\|\s*"?(?:'''|''')?([^'\n|]+?)(?:'''|''')?"?\s+by\s+([^\n|]+)/gi)].map((match) => ({
		title: stripWikiMarkup(match[1]),
		credit: stripWikiMarkup(match[2]),
	}));
	return {
		peace: titles[0] || { title: "", credit: "" },
		war: titles[1] || { title: "", credit: "" },
	};
}

function parseCredits(section) {
	const credits = [];
	for (const rawLine of String(section || "").split("\n")) {
		const line = cleanText(rawLine.replace(/\u00a0/g, " "));
		if (!line.startsWith("*")) {
			continue;
		}
		const match = line.match(/^\*\s*''([^']+?)'':?\s*(.*)$/);
		if (!match) {
			continue;
		}
		const name = cleanText(match[1].replace(/:$/, ""));
		const role = stripWikiMarkup(match[2].replace(/,$/, ""));
		if (!name || !role) {
			continue;
		}
		credits.push({ name, role });
	}
	return mergeCreditsByName(credits);
}

function parseWorkshopTable(section) {
	return {
		workshopUrl: cleanText(section.match(/\[(https?:\/\/steamcommunity\.com[^\s\]]+)[^\]]*Steam Workshop[^\]]*]/i)?.[1] || ""),
		version: stripWikiMarkup(section.match(/\|\s*Latest Version:\s*\n\|\s*([^\n]+)/i)?.[1] || ""),
		lastUpdated: stripWikiMarkup(section.match(/\|\s*Last Updated:\s*\n\|\s*([^\n]+)/i)?.[1] || ""),
	};
}

function parseCategories(source) {
	return [...source.matchAll(/\[\[Category:([^\]]+)]]/g)].map((match) => cleanText(match[1]));
}

function parseRequirements(source) {
	return [...source.matchAll(/This mod requires ([^.]+)\./gi)].map((match) => stripWikiMarkup(match[1]));
}

function parseSupportFlags(templateParams) {
	const flags = {};
	for (const [key, value] of Object.entries(templateParams || {})) {
		if (!key) {
			continue;
		}
		const normalized = cleanText(value).toLowerCase();
		flags[key] = normalized === "yes" || normalized === "true";
	}
	return flags;
}

function parseAuthorSummary(source) {
	const cleanedSource = stripLeadingInfoboxTemplate(source);
	const summaryMatch = cleanedSource.match(/^([\s\S]*?)\n\n/);
	const summary = sanitizePediaProse(summaryMatch?.[1] || "");
	const authoredBy = summary.match(/\b(?:is|are)\s+a\s+custom\s+civilization(?:\s+mod)?\s+by\s+([^.]+?)(?=,?\s+with contributions from|\.|$)/i)?.[1] || "";
	const contributorLine = summary.match(/with contributions from ([^.]+)\./i)?.[1] || "";
	return {
		summary,
		authors: cleanText(authoredBy)
			.replace(/\band\b/gi, ",")
			.split(",")
			.map((part) => cleanText(part))
			.filter(Boolean),
		contributors: contributorLine
			.replace(/\band\b/gi, ",")
			.split(",")
			.map((part) => cleanText(part))
			.filter(Boolean),
	};
}

function summaryCredits(authorSummary) {
	const credits = [...(authorSummary?.authors || []).map((name) => ({ name, role: "Author" })), ...(authorSummary?.contributors || []).map((name) => ({ name, role: "Contributor" }))];
	return mergeCreditsByName(credits);
}

function parseCreditsText(text) {
	const credits = [];
	const lines = String(text || "").split("\n");
	let currentName = "";

	for (const rawLine of lines) {
		const line = cleanText(rawLine);
		if (!line || /^-+$/.test(line) || /^--\s*credits/i.test(line) || /^(DateCreated|Author):/i.test(line) || /^https?:\/\//i.test(line)) {
			continue;
		}

		const nameMatch = line.match(/^([^:]+):$/);
		if (nameMatch) {
			currentName = cleanText(nameMatch[1]);
			continue;
		}

		if (!currentName) {
			continue;
		}

		credits.push({
			name: currentName,
			role: line,
		});
	}

	return mergeCreditsByName(credits);
}

function parseSpecialThanksCredits(value) {
	return mergeCreditsByName(
		cleanText(value)
			.split(/,(?![^()]*\))/)
			.map((part) => cleanText(part.replace(/\band\b/gi, ",")))
			.flatMap((part) =>
				part
					.split(",")
					.map((item) => cleanText(item))
					.filter(Boolean)
					.map((item) => ({
						name: item,
						role: "Special Thanks",
					})),
			),
	);
}

function mergeCreditsByName(credits) {
	const merged = new Map();

	for (const credit of credits || []) {
		const name = cleanText(credit?.name);
		const role = cleanText(credit?.role);
		if (!name || !role) {
			continue;
		}

		if (!merged.has(name)) {
			merged.set(name, []);
		}

		const roles = merged.get(name);
		if (!roles.includes(role)) {
			roles.push(role);
		}
	}

	return [...merged.entries()].map(([name, roles]) => ({
		name,
		role: roles.join(", "),
	}));
}

function buildEntryId(title, leader) {
	const base = slugifyPediaValue(`${title}-${leader}`) || slugifyPediaValue(title) || "modded-civ";
	return `civ-${base}`;
}

function deriveAuthorsFromCredits(credits) {
	const normalizedCredits = ensureArray(credits);
	const explicitAuthors = normalizedCredits
		.filter((credit) => /\bauthor\b/i.test(cleanText(credit?.role)))
		.map((credit) => cleanText(credit?.name))
		.filter(Boolean);

	if (explicitAuthors.length) {
		return [...new Set(explicitAuthors)];
	}

	if (normalizedCredits.length === 1) {
		const onlyCreditName = cleanText(normalizedCredits[0]?.name);
		return onlyCreditName ? [onlyCreditName] : [];
	}

	return [];
}

function buildFolderEntryIdentity({ title, leader, civType, leaderType, modId, folderName }) {
	const baseSlug = slugifyPediaValue(`${title}-${leader}`) || slugifyPediaValue(title) || slugifyPediaValue(civType) || slugifyPediaValue(folderName) || "modded-civ";

	const identitySeed = cleanText(civType) || cleanText(modId) || cleanText(leaderType) || `${title}-${leader}`;

	return {
		id: `civ-${slugifyPediaValue(identitySeed) || baseSlug}`,
		slug: baseSlug,
	};
}

function normalizeReplacementLabel(value) {
	return cleanText(
		String(value || "")
			.replace(/^TXT_KEY_/, "")
			.replace(/[_-]+/g, " ")
			.toLowerCase(),
	);
}

function buildReplacementKindLookup(schema) {
	const lookup = new Map();
	const slotByTableName = new Map([
		["Units", "unique unit"],
		["Buildings", "unique building"],
		["Improvements", "unique improvement"],
	]);

	for (const [tableName, slot] of slotByTableName.entries()) {
		const table = schema?.tables?.find((entry) => entry?.name === tableName);
		for (const row of table?.rows || []) {
			const type = cleanText(row?.Type);
			if (!type) {
				continue;
			}
			for (const candidate of [type, formatIdentifier(type)]) {
				const normalized = normalizeReplacementLabel(candidate);
				if (normalized && !lookup.has(normalized)) {
					lookup.set(normalized, slot);
				}
			}
		}
	}

	return lookup;
}

let replacementKindLookupPromise;

async function getReplacementKindLookup() {
	if (!replacementKindLookupPromise) {
		replacementKindLookupPromise = import("../data/civ-schema.json").then((module) => buildReplacementKindLookup(module.default || module)).catch(() => new Map());
	}
	return replacementKindLookupPromise;
}

async function parseUniqueAttributes(section, wikiUrl = "") {
	const replacementKindLookup = await getReplacementKindLookup();
	const inferUniqueSlot = (index, replaces) => {
		if (index === 0) {
			return "unique ability";
		}
		return replacementKindLookup.get(normalizeReplacementLabel(replaces)) || "unique unit";
	};

	const uniqueTable = cleanText(section.match(/\{\|\s*class="article-table"[\s\S]*?\n\|\}/i)?.[0] || "");
	const rowPattern = /\n\|-\s*\n([\s\S]*?)(?=\n\|-\s*\n|\n\|\}\s*$)/g;
	const uniques = [];
	let match = rowPattern.exec(uniqueTable);
	let index = 0;
	while (match) {
		const rawBlock = cleanText(match[1]);
		const art = cleanText(rawBlock.match(/\[\[File:([^|\]]+)/i)?.[1] || "");
		const artCredit = cleanText(rawBlock.match(/\[\[File:[^\]]*?\|([^|\]]+)\]\]/i)?.[1] || "");
		const headingMatch = rawBlock.match(/'''([\s\S]*?)'''(?:\s*\(\[\[([^|\]]+)(?:\|[^\]]+)?]])?\)?/i);
		const name = stripWikiMarkup(headingMatch?.[1] || "");
		const replaces = stripWikiMarkup(headingMatch?.[2] || "");
		const withoutFile = rawBlock.replace(/\[\[File:[\s\S]*?\]\]\s*/gi, "");
		const withoutHeading = headingMatch ? withoutFile.replace(headingMatch[0], "") : withoutFile;
		const withoutCellMarkup = withoutHeading
			.replace(/^\|[^\n]*\|/gm, "")
			.replace(/^\|/gm, "")
			.replace(/<br\s*\/?>/gi, "\n");
		const content = stripWikiMarkup(withoutCellMarkup);
		const lines = content
			.split("\n")
			.map((line) => cleanText(line))
			.filter(Boolean);
		const bulletLines = lines.filter((line) => /^[-*]/.test(line)).map((line) => cleanText(line.replace(/^[-*]+\s*/, "")));
		const bullets = bulletLines;
		const nonBulletLines = lines.filter((line) => !/^[-*]/.test(line));
		const textBody = nonBulletLines.join(" ");
		if (!name && !art && !textBody && !bullets.length) {
			match = rowPattern.exec(uniqueTable);
			continue;
		}
		uniques.push({
			slot: inferUniqueSlot(index, replaces),
			name,
			replaces,
			art,
			artUrl: buildFandomFileRedirectUrl(art, wikiUrl),
			artCredit,
			body: textBody,
			bullets,
		});
		index += 1;
		match = rowPattern.exec(uniqueTable);
	}
	return uniques;
}

export async function createPediaEntryFromWikiMarkup(markup, options = {}) {
	const source = cleanText(markup);
	const issues = [];
	const entry = cloneDefaultEntry();

	if (!source) {
		return withIssues(entry, ["Paste fandom wiki markup before converting."]);
	}

	const civInfoParams = parseTemplateParams(extractTemplateBlock(source, FANDOM_TEMPLATE_NAMES.infobox));
	const modSupportParams = parseTemplateParams(extractTemplateBlock(source, FANDOM_TEMPLATE_NAMES.modSupport));
	const overviewSection = extractSection(source, "Overview");
	const uniqueAttributesSection = extractSection(source, "Unique Attributes");
	const musicSection = extractSection(source, "Music");
	const creditsSection = extractSection(source, "Full Credits List");
	const overviewBlocks = parseNamedOverviewBlocks(overviewSection);
	const dawnOfMan = parseDawnOfMan(source, options.wikiUrl || "");
	const authorSummary = parseAuthorSummary(source);
	const workshopTable = parseWorkshopTable(creditsSection);

	const standaloneIcon = parseStandaloneIconImage(source, options.wikiUrl || "", [civInfoParams.image, dawnOfMan.image]);

	entry.title = stripWikiMarkup(civInfoParams.title || overviewBlocks[0]?.title || options.title || "");
	entry.leader = stripWikiMarkup(civInfoParams.leader || overviewBlocks[1]?.title || options.leader || "");
	entry.id = buildEntryId(entry.title, entry.leader);
	entry.slug = slugifyPediaValue(entry.title || entry.id);
	entry.summary = authorSummary.summary;
	entry.source = {
		...entry.source,
		type: "wiki",
		wikiPageTitle: entry.title,
		wikiUrl: options.wikiUrl || "",
		workshopUrl: workshopTable.workshopUrl,
		version: workshopTable.version,
		lastUpdated: workshopTable.lastUpdated,
	};
	entry.identity = {
		...entry.identity,
		empireName: stripWikiMarkup(civInfoParams.empire_name),
		adjectives: stripWikiMarkup(civInfoParams.adjectives),
		capital: stripWikiMarkup(civInfoParams.capital),
		bias: stripWikiMarkup(civInfoParams.bias),
		religion: stripWikiMarkup(civInfoParams.religion)
			.split("\n")
			.map((item) => cleanText(item))
			.filter(Boolean),
		government: stripWikiMarkup(civInfoParams.government),
		culture: stripWikiMarkup(civInfoParams.culture),
		mapLabelsLanguage: stripWikiMarkup(civInfoParams.maplabelslanguage),
		requiredContent: parseRequirements(source),
	};
	entry.presentation = {
		...entry.presentation,
		mapImage: cleanText(civInfoParams.image),
		mapImageUrl: buildFandomFileRedirectUrl(civInfoParams.image, options.wikiUrl || ""),
		mapImageCaption: stripWikiMarkup(civInfoParams.imagecaption),
		iconImage: cleanText(source.match(/\[\[File:([^|\]]+)\|frameless/i)?.[1] || standaloneIcon.file),
		iconImageUrl: buildFandomFileRedirectUrl(source.match(/\[\[File:([^|\]]+)\|frameless/i)?.[1] || standaloneIcon.file, options.wikiUrl || ""),
		leaderSceneImage: dawnOfMan.image,
		leaderSceneImageUrl: dawnOfMan.imageUrl,
		leaderSceneArtCredit: dawnOfMan.artCredit,
		colors: {
			background: cleanText(civInfoParams.bgcolour),
			icon: cleanText(civInfoParams.iconcolour),
		},
	};
	entry.overview = {
		civilization: overviewBlocks[0] || entry.overview.civilization,
		leader: overviewBlocks[1] || entry.overview.leader,
	};
	entry.dawnOfMan = {
		blessing: dawnOfMan.blessing,
		introduction: dawnOfMan.introduction,
		defeat: dawnOfMan.defeat,
	};
	entry.uniques = await parseUniqueAttributes(uniqueAttributesSection, options.wikiUrl || "");
	entry.nameLists = parseCollapsibleLists(uniqueAttributesSection);
	entry.music = parseMusic(musicSection);
	entry.modSupport = parseSupportFlags(modSupportParams);
	entry.credits = parseCredits(creditsSection);
	if (!entry.credits.length) {
		entry.credits = summaryCredits(authorSummary);
	}
	entry.authors = authorSummary.authors?.length ? authorSummary.authors : deriveAuthorsFromCredits(entry.credits);
	entry.categories = parseCategories(source);
	entry.navTemplate = cleanText(source.match(/\{\{([^{}]+Nav)}}/i)?.[1] || "");

	if (!entry.presentation.iconImage && entry.uniques[0]?.art) {
		entry.presentation.iconImage = entry.uniques[0].art;
		entry.presentation.iconImageUrl = buildFandomFileRedirectUrl(entry.uniques[0].art, options.wikiUrl || "");
	}

	if (!entry.title) {
		issues.push("Could not resolve the civilization title from the wiki markup.");
	}
	if (!entry.leader) {
		issues.push("Could not resolve the leader name from the wiki markup.");
	}
	if (!entry.uniques.length) {
		issues.push("Unique Attributes table was not parsed cleanly. Check the wiki markup format.");
	}
	if (!entry.nameLists.length) {
		issues.push("No collapsible name lists were found in the wiki markup.");
	}

	return withIssues(entry, issues);
}

function findTextForTag(textByTag, value) {
	if (!value) {
		return "";
	}
	return cleanText(textByTag.get(value) || value);
}

function parseXmlRows(text) {
	const parser = new DOMParser();
	const documentNode = parser.parseFromString(text, "text/xml");
	if (documentNode.querySelector("parsererror")) {
		return null;
	}

	const tables = new Map();
	const root = documentNode.documentElement;
	for (const tableNode of root.children) {
		if (!tableNode?.tagName) {
			continue;
		}
		const rows = tables.get(tableNode.tagName) || [];
		for (const rowNode of tableNode.children) {
			if (!rowNode?.tagName) {
				continue;
			}
			if (rowNode.tagName !== "Row") {
				continue;
			}
			const row = {};
			for (const attribute of rowNode.attributes) {
				row[attribute.name] = attribute.value;
			}
			for (const childNode of rowNode.children) {
				if (!childNode?.tagName) {
					continue;
				}
				row[childNode.tagName] = cleanText(childNode.textContent);
			}
			rows.push(row);
		}
		tables.set(tableNode.tagName, rows);
	}
	return tables;
}

function appendTableRows(tableRows, tableName, rows) {
	if (!tableName || !rows?.length) {
		return;
	}
	const mergedRows = tableRows.get(tableName) || [];
	mergedRows.push(...rows);
	tableRows.set(tableName, mergedRows);
}

function stripSqlComments(text) {
	let next = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;

	for (let index = 0; index < text.length; index += 1) {
		const current = text[index];
		const nextChar = text[index + 1];

		if (!inDoubleQuote && current === "'" && text[index - 1] !== "\\") {
			if (inSingleQuote && nextChar === "'") {
				next += "''";
				index += 1;
				continue;
			}
			inSingleQuote = !inSingleQuote;
			next += current;
			continue;
		}

		if (!inSingleQuote && current === '"' && text[index - 1] !== "\\") {
			inDoubleQuote = !inDoubleQuote;
			next += current;
			continue;
		}

		if (!inSingleQuote && !inDoubleQuote && current === "-" && nextChar === "-") {
			while (index < text.length && text[index] !== "\n") {
				index += 1;
			}
			if (index < text.length) {
				next += "\n";
			}
			continue;
		}

		next += current;
	}

	return next;
}

function splitSqlTopLevel(value, separator = ",") {
	const parts = [];
	let current = "";
	let depth = 0;
	let inSingleQuote = false;
	let inDoubleQuote = false;

	for (let index = 0; index < value.length; index += 1) {
		const character = value[index];
		const nextCharacter = value[index + 1];

		if (!inDoubleQuote && character === "'" && value[index - 1] !== "\\") {
			if (inSingleQuote && nextCharacter === "'") {
				current += "''";
				index += 1;
				continue;
			}
			inSingleQuote = !inSingleQuote;
			current += character;
			continue;
		}

		if (!inSingleQuote && character === '"' && value[index - 1] !== "\\") {
			inDoubleQuote = !inDoubleQuote;
			current += character;
			continue;
		}

		if (!inSingleQuote && !inDoubleQuote) {
			if (character === "(") {
				depth += 1;
			} else if (character === ")") {
				depth = Math.max(0, depth - 1);
			} else if (depth === 0 && character === separator) {
				parts.push(cleanText(current));
				current = "";
				continue;
			}
		}

		current += character;
	}

	if (cleanText(current)) {
		parts.push(cleanText(current));
	}

	return parts;
}

function splitSqlTopLevelKeyword(value, keyword = "AND") {
	const parts = [];
	let current = "";
	let depth = 0;
	let inSingleQuote = false;
	let inDoubleQuote = false;
	const upperKeyword = String(keyword || "").toUpperCase();

	for (let index = 0; index < value.length; index += 1) {
		const character = value[index];
		const nextCharacter = value[index + 1];

		if (!inDoubleQuote && character === "'" && value[index - 1] !== "\\") {
			if (inSingleQuote && nextCharacter === "'") {
				current += "''";
				index += 1;
				continue;
			}
			inSingleQuote = !inSingleQuote;
			current += character;
			continue;
		}

		if (!inSingleQuote && character === '"' && value[index - 1] !== "\\") {
			inDoubleQuote = !inDoubleQuote;
			current += character;
			continue;
		}

		if (!inSingleQuote && !inDoubleQuote) {
			if (character === "(") {
				depth += 1;
			} else if (character === ")") {
				depth = Math.max(0, depth - 1);
			} else if (depth === 0) {
				const slice = value.slice(index, index + upperKeyword.length);
				if (
					slice.toUpperCase() === upperKeyword &&
					(index === 0 || !/[A-Za-z0-9_]/.test(value[index - 1])) &&
					(index + upperKeyword.length >= value.length || !/[A-Za-z0-9_]/.test(value[index + upperKeyword.length]))
				) {
					if (cleanText(current)) {
						parts.push(cleanText(current));
					}
					current = "";
					index += upperKeyword.length - 1;
					continue;
				}
			}
		}

		current += character;
	}

	if (cleanText(current)) {
		parts.push(cleanText(current));
	}

	return parts;
}

function splitSqlStatements(text) {
	return splitSqlTopLevel(stripSqlComments(text), ";").filter(Boolean);
}

function unwrapSqlExpression(value) {
	let next = cleanText(value);
	while (next.startsWith("(") && next.endsWith(")")) {
		let depth = 0;
		let balanced = true;
		for (let index = 0; index < next.length; index += 1) {
			const character = next[index];
			if (character === "(") {
				depth += 1;
			} else if (character === ")") {
				depth -= 1;
				if (depth === 0 && index < next.length - 1) {
					balanced = false;
					break;
				}
			}
		}
		if (!balanced) {
			break;
		}
		next = cleanText(next.slice(1, -1));
	}
	return next;
}

function stripSqlQuotes(value) {
	const unwrapped = unwrapSqlExpression(value);
	if (/^N?'.*'$/s.test(unwrapped)) {
		return stripSqlString(unwrapped);
	}
	if (/^".*"$/s.test(unwrapped)) {
		return cleanText(unwrapped.slice(1, -1).replace(/""/g, '"'));
	}
	return "";
}

function extractSqlQuotedLiterals(value) {
	return [...String(value || "").matchAll(/N?'((?:''|[^'])*)'|"((?:""|[^"])*)"/g)].map((match) => cleanText((match[1] ?? match[2] ?? "").replace(/''/g, "'").replace(/""/g, '"'))).filter(Boolean);
}

function parseSqlValue(value, whereEquals = new Map()) {
	const unwrapped = unwrapSqlExpression(value);
	if (!unwrapped || /^null$/i.test(unwrapped)) {
		return "";
	}
	const quoted = stripSqlQuotes(unwrapped);
	if (quoted) {
		return quoted;
	}
	if (/^-?\d+(?:\.\d+)?$/i.test(unwrapped)) {
		return unwrapped;
	}
	if (/^case\b/i.test(unwrapped)) {
		return extractSqlQuotedLiterals(unwrapped)[0] || "";
	}
	if (/^select\b/i.test(unwrapped)) {
		return "";
	}
	if (/^[A-Za-z_][A-Za-z0-9_]*$/i.test(unwrapped) && whereEquals.has(unwrapped)) {
		return whereEquals.get(unwrapped);
	}
	if (/^[A-Za-z_][A-Za-z0-9_]*$/i.test(unwrapped)) {
		return "";
	}
	return unwrapped;
}

function parseSqlWhereEquals(whereClause) {
	const equals = new Map();
	for (const clause of splitSqlTopLevelKeyword(String(whereClause || ""), "AND")) {
		const match = clause.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(N?'(?:''|[^'])*'|"(?:""|[^"])*")\s*$/s);
		if (!match) {
			continue;
		}
		equals.set(match[1], stripSqlQuotes(match[2]));
	}
	return equals;
}

function parseSqlAssignments(setClause, whereEquals = new Map()) {
	const assignments = new Map();
	for (const part of splitSqlTopLevel(setClause)) {
		const equalIndex = part.indexOf("=");
		if (equalIndex === -1) {
			continue;
		}
		const column = cleanText(part.slice(0, equalIndex));
		const rawValue = cleanText(part.slice(equalIndex + 1));
		if (!column) {
			continue;
		}
		const normalized = parseSqlValue(rawValue, whereEquals);
		if (normalized !== "") {
			assignments.set(column, normalized);
		}
	}
	return assignments;
}

function parseSqlTuples(valuesClause) {
	const tuples = [];
	let current = "";
	let depth = 0;
	let inSingleQuote = false;
	let inDoubleQuote = false;

	for (let index = 0; index < valuesClause.length; index += 1) {
		const character = valuesClause[index];
		const nextCharacter = valuesClause[index + 1];

		if (!inDoubleQuote && character === "'" && valuesClause[index - 1] !== "\\") {
			if (inSingleQuote && nextCharacter === "'") {
				current += "''";
				index += 1;
				continue;
			}
			inSingleQuote = !inSingleQuote;
			current += character;
			continue;
		}

		if (!inSingleQuote && character === '"' && valuesClause[index - 1] !== "\\") {
			inDoubleQuote = !inDoubleQuote;
			current += character;
			continue;
		}

		if (!inSingleQuote && !inDoubleQuote) {
			if (character === "(") {
				if (depth > 0) {
					current += character;
				}
				depth += 1;
				continue;
			}
			if (character === ")") {
				depth -= 1;
				if (depth === 0) {
					tuples.push(cleanText(current));
					current = "";
					continue;
				}
			}
		}

		if (depth > 0) {
			current += character;
		}
	}

	return tuples;
}

function parseSqlInsertStatement(statement) {
	const match = statement.match(/^INSERT(?:\s+OR\s+\w+)?\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*?)\)\s*([\s\S]+)$/i);
	if (!match) {
		return null;
	}

	const tableName = cleanText(match[1]);
	const columns = splitSqlTopLevel(match[2]).map((column) => cleanText(column));
	const remainder = cleanText(match[3]);

	if (/^VALUES\b/i.test(remainder)) {
		const tupleRows = parseSqlTuples(remainder.replace(/^VALUES\b/i, ""))
			.map((tuple) => {
				const values = splitSqlTopLevel(tuple);
				const row = {};
				columns.forEach((column, index) => {
					row[column] = parseSqlValue(values[index]);
				});
				return row;
			})
			.filter((row) => Object.keys(row).length);
		return { tableName, rows: tupleRows };
	}

	if (/^SELECT\b/i.test(remainder)) {
		const selectMatch = remainder.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+WHERE\s+([\s\S]+))?$/i);
		if (!selectMatch) {
			return { tableName, rows: [] };
		}
		const whereEquals = parseSqlWhereEquals(selectMatch[3] || "");
		const expressions = splitSqlTopLevel(selectMatch[1]);
		const row = {};
		columns.forEach((column, index) => {
			row[column] = parseSqlValue(expressions[index], whereEquals);
		});
		return { tableName, rows: [row] };
	}

	return { tableName, rows: [] };
}

function applySqlUpdateStatement(statement, tableRows) {
	const match = statement.match(/^UPDATE\s+([A-Za-z_][A-Za-z0-9_]*)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
	if (!match) {
		return;
	}

	const tableName = cleanText(match[1]);
	const rows = tableRows.get(tableName) || [];
	if (!rows.length) {
		return;
	}

	const whereEquals = parseSqlWhereEquals(match[3] || "");
	const assignments = parseSqlAssignments(match[2], whereEquals);
	if (!assignments.size) {
		return;
	}

	for (const row of rows) {
		let matches = true;
		for (const [column, value] of whereEquals.entries()) {
			if (row?.[column] !== value) {
				matches = false;
				break;
			}
		}
		if (!matches) {
			continue;
		}
		for (const [column, value] of assignments.entries()) {
			if (row[column] && row[column] !== value) {
				row.__history ??= {};
				row.__history[column] ??= [];
				if (!row.__history[column].includes(row[column])) {
					row.__history[column].push(row[column]);
				}
			}
			row[column] = value;
		}
	}
}

function parseSqlTables(text) {
	const tableRows = new Map();
	for (const statement of splitSqlStatements(text)) {
		if (/^INSERT\b/i.test(statement)) {
			const parsedInsert = parseSqlInsertStatement(statement);
			if (parsedInsert?.rows?.length) {
				appendTableRows(tableRows, parsedInsert.tableName, parsedInsert.rows);
			}
			continue;
		}
		if (/^UPDATE\b/i.test(statement)) {
			applySqlUpdateStatement(statement, tableRows);
		}
	}
	return tableRows;
}

function findFirstRow(rows, predicate) {
	for (const row of rows || []) {
		if (predicate(row)) {
			return row;
		}
	}
	return null;
}

function mapRowsByKey(rows, key) {
	const mapped = new Map();
	for (const row of rows || []) {
		if (row?.[key]) {
			mapped.set(row[key], row);
		}
	}
	return mapped;
}

function buildUniqueFromOverride(unitOrBuildingRow, replacementName, slot, textByTag) {
	if (!unitOrBuildingRow) {
		return null;
	}
	const name = findTextForTag(textByTag, unitOrBuildingRow.Description) || formatIdentifier(unitOrBuildingRow.Type);
	return {
		slot,
		name,
		replaces: replacementName,
		art: "",
		artUrl: "",
		artCredit: "",
		body: findTextForTag(textByTag, unitOrBuildingRow.Help) || "",
		civilopedia: resolveCivilopediaText(unitOrBuildingRow, textByTag),
		bullets: [],
	};
}

function sentenceBullets(value) {
	return cleanText(value)
		.split(/(?<=[.!?])\s+/)
		.map((sentence) => cleanText(sentence.replace(/^[*-]\s*/, "")))
		.filter(Boolean);
}

function formatSqlIdentifier(value) {
	const normalized = String(value || "")
		.trim()
		.replace(/^JFD_/, "")
		.replace(/^CULTURE_JFD_/, "")
		.replace(/^CULTURE_/, "")
		.replace(/^SUBCULTURE_JFD_/, "")
		.replace(/^SUBCULTURE_/, "")
		.replace(/^RELIGION_/, "")
		.replace(/^GOVERNMENT_JFD_/, "")
		.replace(/^GOVERNMENT_/, "")
		.replace(/^REGION_/, "")
		.replace(/^UNITCLASS_/, "")
		.replace(/^BUILDINGCLASS_/, "")
		.replace(/^CIVILIZATION_/, "")
		.replace(/^TXT_KEY_/, "");

	if (normalized === "THEOCRATIC") {
		return "Theocracy";
	}

	return normalized
		.replace(/_/g, " ")
		.toLowerCase()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clampColorChannel(value) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) {
		return 0;
	}
	if (numeric <= 1) {
		return Math.max(0, Math.min(255, Math.round(numeric * 255)));
	}
	return Math.max(0, Math.min(255, Math.round(numeric)));
}

function toHexChannel(value) {
	return clampColorChannel(value).toString(16).padStart(2, "0");
}

function colorRowToHex(row) {
	if (!row) {
		return "";
	}
	return `#${toHexChannel(row.Red)}${toHexChannel(row.Green)}${toHexChannel(row.Blue)}`;
}

function resolvePresentationColors(civRow, tableRows) {
	const playerColors = mapRowsByKey(tableRows.get("PlayerColors") || [], "Type");
	const colors = mapRowsByKey(tableRows.get("Colors") || [], "Type");
	const defaultPlayerColor = cleanText(civRow?.DefaultPlayerColor);
	const fallbackPlayerColor = defaultPlayerColor || `PLAYERCOLOR_${cleanText(civRow?.Type).replace(/^CIVILIZATION_/, "")}`;
	const playerColorRow = playerColors.get(fallbackPlayerColor);
	if (!playerColorRow) {
		return { background: "", icon: "" };
	}

	return {
		background: colorRowToHex(colors.get(playerColorRow.SecondaryColor)),
		icon: colorRowToHex(colors.get(playerColorRow.PrimaryColor)),
	};
}

function resolveReligionLabel(religionType, modSupport = {}) {
	if (!religionType) {
		return "";
	}
	if (religionType === "RELIGION_CHRISTIANITY" && modSupport.histreligions) {
		return "Catholicism";
	}
	const label = formatSqlIdentifier(religionType);
	if (modSupport.histreligions && !VANILLA_RELIGION_TYPES.has(religionType)) {
		return `${label} ([[HR]])`;
	}
	return label;
}

function collectRowColumnValues(row, column) {
	const values = [];
	for (const value of row?.__history?.[column] || []) {
		values.push(value);
	}
	if (row?.[column]) {
		values.push(row[column]);
	}
	return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
}

function textSeriesForPrefix(textByTag, prefix) {
	const normalizedPrefix = cleanText(prefix);
	if (!normalizedPrefix) {
		return [];
	}
	return [...textByTag.entries()]
		.filter(([tag]) => tag.startsWith(normalizedPrefix))
		.sort((left, right) => left[0].localeCompare(right[0], undefined, { numeric: true }))
		.map(([, text]) => cleanText(text))
		.filter(Boolean);
}

function firstExistingText(textByTag, candidates) {
	for (const candidate of candidates || []) {
		const resolved = findTextForTag(textByTag, candidate);
		if (resolved && resolved !== candidate) {
			return resolved;
		}
	}
	return "";
}

function resolveCivilopediaText(row, textByTag) {
	const directText = firstExistingText(textByTag, [row?.Civilopedia, row?.CivilopediaTag]);
	if (directText) {
		return directText;
	}

	const prefixes = [cleanText(row?.CivilopediaTag), cleanText(row?.Civilopedia).replace(/\d+$/, "")].filter(Boolean);

	for (const prefix of prefixes) {
		const series = textSeriesForPrefix(textByTag, `${prefix}_TEXT_`);
		if (series.length) {
			return series.join("\n\n");
		}

		const fallbackSeries = textSeriesForPrefix(textByTag, prefix);
		if (fallbackSeries.length) {
			return fallbackSeries.join("\n\n");
		}
	}

	return "";
}

function buildUniqueBullets(helpText) {
	const normalized = cleanText(helpText)
		.replace(/^[^.]*Replacement[.,]?\s*/i, "")
		.replace(/^\s*May\s+/i, "May ")
		.replace(/\[NEWLINE]/gi, " ");
	const bullets = sentenceBullets(normalized);
	return bullets.length > 1 ? bullets : [];
}

function inferReplacementNameFromText(strategyText, fallbackReplacement) {
	const match = cleanText(strategyText).match(/\b(?:a|an)\s+unique\s+([^.,]+?)\s+for\b/i);
	if (match?.[1]) {
		return cleanText(match[1]);
	}
	return fallbackReplacement;
}

function buildUniqueFromClassOverride(row, typeRow, slot, textByTag) {
	if (!row?.UnitType && !row?.BuildingType) {
		return null;
	}
	const resolvedType = row.UnitType || row.BuildingType;
	const fallbackReplacement = formatSqlIdentifier(row.UnitClassType || row.BuildingClassType);
	const helpText = findTextForTag(textByTag, typeRow?.Help);
	const strategyText = findTextForTag(textByTag, typeRow?.Strategy);
	const bullets = buildUniqueBullets(helpText);
	return {
		slot,
		name: findTextForTag(textByTag, typeRow?.Description) || formatSqlIdentifier(resolvedType),
		replaces: inferReplacementNameFromText(strategyText, fallbackReplacement),
		art: "",
		artUrl: "",
		artCredit: "",
		body: bullets.length ? "" : helpText || strategyText,
		civilopedia: resolveCivilopediaText(typeRow, textByTag),
		bullets,
	};
}

function inferSupportFlags(modinfo, tableRows) {
	const flags = {};
	const referenceTitles = (modinfo.references || []).map((reference) => cleanText(reference.title).toLowerCase());
	const hasReference = (needle) => referenceTitles.some((title) => title.includes(needle));

	flags.culdiv = hasReference("cultural diversity") || Boolean(tableRows.get("Civilization_JFD_CultureTypes")?.length);
	flags.histreligions = hasReference("historical religions");
	flags.ynaemp = hasReference("earth maps") || Boolean(tableRows.get("Civilizations_YnAEMP")?.length);
	flags.piety = Boolean(tableRows.get("Civilization_Religions")?.length);
	flags.claimscoloniescrimes = Boolean(tableRows.get("Civilization_JFD_ColonialCityNames")?.length);

	return flags;
}

function inferMapImage(modinfo, civRow) {
	const mapImage = cleanText(civRow?.MapImage || "");
	if (mapImage) {
		return mapImage;
	}
	return (
		modinfo.files
			?.find((file) => /map\.(dds|png)$/i.test(file.split("/").pop() || ""))
			?.split("/")
			.pop() || ""
	);
}

function inferLeaderSceneImage(modinfo, civRow) {
	const leaderSceneImage = cleanText(civRow?.DawnOfManImage || "");
	if (leaderSceneImage) {
		return leaderSceneImage;
	}
	return (
		modinfo.files
			?.find((file) => /dom\.(dds|png)$/i.test(file.split("/").pop() || ""))
			?.split("/")
			.pop() || ""
	);
}

function inferIconImage(modinfo) {
	const candidates = (modinfo.files || []).map((file) => file.split("/").pop()).filter(Boolean);
	return (
		candidates.find((file) => /atlas256\.(dds|png)$/i.test(file)) ||
		candidates.find((file) => /atlas128\.(dds|png)$/i.test(file)) ||
		candidates.find((file) => /atlas\d+\.(dds|png)$/i.test(file)) ||
		""
	);
}

function parseModinfoProperties(text) {
	const parser = new DOMParser();
	const documentNode = parser.parseFromString(text, "text/xml");
	if (documentNode.querySelector("parsererror")) {
		return {};
	}
	return {
		id: cleanText(documentNode.documentElement?.getAttribute("id") || ""),
		version: cleanText(documentNode.documentElement?.getAttribute("version") || ""),
		name: cleanText(documentNode.querySelector("Properties > Name")?.textContent || ""),
		authors: cleanText(documentNode.querySelector("Properties > Authors")?.textContent || ""),
		specialThanks: cleanText(documentNode.querySelector("Properties > SpecialThanks")?.textContent || ""),
		description: cleanText(documentNode.querySelector("Properties > Description")?.textContent || ""),
		teaser: cleanText(documentNode.querySelector("Properties > Teaser")?.textContent || ""),
		references: [...documentNode.querySelectorAll("References > Mod")].map((node) => ({
			id: cleanText(node.getAttribute("id")),
			title: cleanText(node.getAttribute("title")),
		})),
		files: [...documentNode.querySelectorAll("Files > File")].map((node) => cleanText(node.textContent)),
	};
}

export async function createPediaEntryFromModFolderFiles(fileList) {
	const files = Array.from(fileList || []);
	const entry = cloneDefaultEntry();
	const issues = [];

	if (!files.length) {
		return withIssues(entry, ["Choose a mod folder before converting it into a pedia entry."]);
	}

	const textByTag = new Map();
	const tableRows = new Map();
	let modinfo = {};
	let folderName = "";
	let creditsText = "";

	for (const file of files) {
		const relativePath = cleanText(file.webkitRelativePath || file.name);
		if (!folderName) {
			folderName = relativePath.split("/")[0] || "";
		}
		if (!/\.(xml|modinfo|sql|txt)$/i.test(relativePath)) {
			continue;
		}

		const text = await file.text();
		if (/\.modinfo$/i.test(relativePath)) {
			modinfo = parseModinfoProperties(text);
			continue;
		}

		if (/credits\.txt$/i.test(relativePath)) {
			creditsText = text;
			continue;
		}

		if (/\.sql$/i.test(relativePath)) {
			const parsedSqlTables = parseSqlTables(text);
			for (const [tableName, rows] of parsedSqlTables.entries()) {
				appendTableRows(tableRows, tableName, rows);
			}
			continue;
		}

		const parsedTables = parseXmlRows(text);
		if (!parsedTables) {
			continue;
		}

		for (const [tableName, rows] of parsedTables.entries()) {
			appendTableRows(tableRows, tableName, rows);
			if (tableName.startsWith("Language_")) {
				for (const row of rows) {
					if (row.Tag && row.Text) {
						textByTag.set(row.Tag, row.Text);
					}
				}
			}
		}
	}

	const civilizations = tableRows.get("Civilizations") || [];
	const leaders = tableRows.get("Leaders") || [];
	const civilizationLeaders = tableRows.get("Civilization_Leaders") || [];
	const leaderTraits = tableRows.get("Leader_Traits") || [];
	const traits = mapRowsByKey(tableRows.get("Traits") || [], "Type");
	const units = mapRowsByKey(tableRows.get("Units") || [], "Type");
	const buildings = mapRowsByKey(tableRows.get("Buildings") || [], "Type");
	const unitOverrides = tableRows.get("Civilization_UnitClassOverrides") || [];
	const buildingOverrides = tableRows.get("Civilization_BuildingClassOverrides") || [];
	const cityNames = tableRows.get("Civilization_CityNames") || [];
	const spyNames = tableRows.get("Civilization_SpyNames") || [];
	const uniqueNames = tableRows.get("Unit_UniqueNames") || [];
	const biasRows = tableRows.get("Civilization_Start_Region_Priority") || [];
	const governmentRows = tableRows.get("Civilization_JFD_Governments") || [];
	const religionRows = tableRows.get("Civilization_Religions") || [];
	const cultureRows = tableRows.get("Civilization_JFD_CultureTypes") || [];
	const modSupport = inferSupportFlags(modinfo, tableRows);

	const civRow = civilizations[0] || null;
	if (!civRow) {
		return withIssues(entry, ["No Civilization row was found in the uploaded folder."]);
	}

	const civLink = findFirstRow(civilizationLeaders, (row) => row.CivilizationType === civRow.Type);
	const leaderRow = findFirstRow(leaders, (row) => row.Type === civLink?.LeaderheadType) || leaders[0] || null;
	const leaderTraitLink = findFirstRow(leaderTraits, (row) => row.LeaderType === leaderRow?.Type);
	const traitRow = traits.get(leaderTraitLink?.TraitType);
	const cityList = cityNames
		.filter((row) => row.CivilizationType === civRow.Type)
		.map((row) => findTextForTag(textByTag, row.CityName))
		.filter(Boolean);
	const spyList = spyNames
		.filter((row) => row.CivilizationType === civRow.Type)
		.map((row) => findTextForTag(textByTag, row.SpyName))
		.filter(Boolean);
	const religionList = [
		...new Set(
			religionRows
				.filter((row) => row.CivilizationType === civRow.Type)
				.flatMap((row) => collectRowColumnValues(row, "ReligionType"))
				.map((type) => resolveReligionLabel(type, modSupport))
				.filter(Boolean),
		),
	];
	const governmentType = governmentRows.find((row) => row.CivilizationType === civRow.Type)?.GovernmentType || "";
	const biasType = biasRows.find((row) => row.CivilizationType === civRow.Type)?.RegionType || "";
	const cultureType = cultureRows.find((row) => row.CivilizationType === civRow.Type)?.CultureType || "";
	const civOverviewBody =
		firstExistingText(textByTag, [civRow.Civilopedia]) || textSeriesForPrefix(textByTag, cleanText(civRow.Civilopedia).replace(/\d+$/, "")).join("\n\n") || modinfo.description || "";
	const leaderOverviewBody =
		textSeriesForPrefix(textByTag, leaderRow?.Type ? `TXT_KEY_CIVILOPEDIA_LEADERS_${leaderRow.Type.replace(/^LEADER_/, "")}_TEXT_` : "").join("\n\n") ||
		firstExistingText(textByTag, [leaderRow?.Civilopedia]) ||
		"";
	const dawnQuote = firstExistingText(textByTag, [civRow.DawnOfManQuote]);
	const leaderTypeSuffix = cleanText(leaderRow?.Type || "").replace(/^LEADER_/, "");
	const introductionText = textSeriesForPrefix(textByTag, leaderTypeSuffix ? `TXT_KEY_LEADER_${leaderTypeSuffix}_FIRSTGREETING_` : "")[0] || "";
	const defeatText = textSeriesForPrefix(textByTag, leaderTypeSuffix ? `TXT_KEY_LEADER_${leaderTypeSuffix}_DEFEATED_` : "")[0] || "";
	const authorNames = [
		...new Set(
			(modinfo.authors || "")
				.split(",")
				.map((name) => cleanText(name))
				.filter(Boolean),
		),
	];
	const specialThanksCredits = parseSpecialThanksCredits(modinfo.specialThanks);
	const fileCredits = parseCreditsText(creditsText);

	entry.title = findTextForTag(textByTag, civRow.ShortDescription) || findTextForTag(textByTag, civRow.Description) || modinfo.name || formatIdentifier(civRow.Type);
	entry.leader = findTextForTag(textByTag, leaderRow?.Description) || formatIdentifier(leaderRow?.Type);
	const folderIdentity = buildFolderEntryIdentity({
		title: entry.title,
		leader: entry.leader,
		civType: civRow?.Type,
		leaderType: leaderRow?.Type,
		modId: modinfo?.id,
		folderName,
	});
	entry.id = folderIdentity.id;
	entry.slug = folderIdentity.slug;
	entry.summary = stripCivFormatting(modinfo.teaser || modinfo.description || "");
	entry.source = {
		...entry.source,
		type: "folder",
		modId: modinfo.id || "",
		version: modinfo.version || "",
		modFolderName: folderName,
	};
	entry.identity = {
		...entry.identity,
		empireName: findTextForTag(textByTag, civRow.Description) || entry.title,
		adjectives: findTextForTag(textByTag, civRow.Adjective),
		capital: cityList[0] || findTextForTag(textByTag, cityNames.find((row) => row.CivilizationType === civRow.Type)?.CityName),
		bias: formatSqlIdentifier(biasType),
		religion: religionList,
		government: formatSqlIdentifier(governmentType),
		culture: formatSqlIdentifier(cultureType),
		requiredContent: [],
	};
	entry.presentation = {
		...entry.presentation,
		mapImage: "",
		mapImageUrl: "",
		mapImageCaption: "",
		leaderSceneImage: "",
		leaderSceneImageUrl: "",
		leaderSceneArtCredit: "",
		iconImage: "",
		iconImageUrl: "",
		colors: {
			...entry.presentation.colors,
			...resolvePresentationColors(civRow, tableRows),
		},
	};
	entry.overview.civilization = {
		title: entry.title,
		url: "",
		body: stripCivFormatting(civOverviewBody),
	};
	entry.overview.leader = {
		title: entry.leader,
		url: "",
		body: stripCivFormatting(leaderOverviewBody),
	};
	entry.dawnOfMan = {
		...entry.dawnOfMan,
		blessing: stripCivFormatting(dawnQuote),
		introduction: stripCivFormatting(introductionText),
		defeat: stripCivFormatting(defeatText),
	};
	entry.modSupport = modSupport;
	entry.credits = mergeCreditsByName(
		fileCredits.length
			? fileCredits
			: [
					...authorNames.map((name, index) => ({
						name,
						role: index === 0 ? "Author" : "Co-Author",
					})),
					...specialThanksCredits,
				],
	);
	if (!entry.credits.length) {
		entry.credits = [
			{
				name: "Credits Pending",
				role: "Add authors, art, code, and advisors after reviewing the mod page or release notes.",
			},
		];
	}
	entry.authors = deriveAuthorsFromCredits(entry.credits);

	if (traitRow) {
		entry.uniques.push({
			slot: "unique ability",
			name: findTextForTag(textByTag, traitRow.ShortDescription) || formatIdentifier(traitRow.Type),
			replaces: "",
			art: "",
			artCredit: "",
			body: findTextForTag(textByTag, traitRow.Description),
			civilopedia: resolveCivilopediaText(traitRow, textByTag),
			bullets: [],
		});
	}

	for (const row of unitOverrides.filter((item) => item.CivilizationType === civRow.Type)) {
		const unitRow = units.get(row.UnitType);
		const unique = buildUniqueFromClassOverride(row, unitRow, "unique unit", textByTag);
		if (unique) {
			entry.uniques.push(unique);
		}
	}

	for (const row of buildingOverrides.filter((item) => item.CivilizationType === civRow.Type)) {
		const buildingRow = buildings.get(row.BuildingType);
		const unique = buildUniqueFromClassOverride(row, buildingRow, "unique building", textByTag);
		if (unique) {
			entry.uniques.push(unique);
		}
	}

	if (cityList.length) {
		entry.nameLists.push({
			title: "City List",
			items: cityList,
		});
	}

	if (spyList.length) {
		entry.nameLists.push({
			title: "Spy List",
			items: spyList,
		});
	}

	for (const row of unitOverrides.filter((item) => item.CivilizationType === civRow.Type)) {
		const matchingNames = uniqueNames
			.filter((item) => item.UnitType === row.UnitType)
			.map((item) => findTextForTag(textByTag, item.UniqueName))
			.filter(Boolean);
		if (!matchingNames.length) {
			continue;
		}
		const unitName = findTextForTag(textByTag, units.get(row.UnitType)?.Description) || formatSqlIdentifier(row.UnitType);
		entry.nameLists.push({
			title: `${unitName} List`,
			items: matchingNames,
		});
	}

	if (!entry.uniques.length) {
		issues.push("No uniques were resolved from trait or civilization override tables.");
	}
	if (!entry.nameLists[0]?.items?.length) {
		issues.push("No civilization city names were resolved from Civilization_CityNames.");
	}
	if (!textByTag.size) {
		issues.push("No localization rows were resolved from the uploaded XML files.");
	}

	return withIssues(entry, issues);
}

function renderWikiList(title, items) {
	const lines = (items || []).map((item, index) => `${title === "City List" ? "#" : "*"}${item}`);
	return `| class="mw-collapsible mw-collapsed" data-collapsetext="Collapse" data-expandtext="Expand"|'''${title}'''\n\n<div class="mw-collapsible-content">\n${lines.join("\n")}\n</div>`;
}

function renderUniqueRow(unique, index) {
	const heading = unique.replaces ? `'''${unique.name}''' ([[${unique.replaces}]])<br />` : `'''${unique.name}'''<br />`;
	const description = unique.bullets.length ? unique.bullets.map((bullet) => `* ${bullet}`).join("\n") : unique.body;
	return `|-\n|[[File:${unique.art || "Placeholder.png"}|left|thumb|145px|${unique.artCredit || "Art credit pending"}]]\n|style="vertical-align:top;" |${heading}\n${description}`;
}

export function renderWikiMarkupFromEntry(entryInput) {
	const entry = normalizePediaEntry(entryInput);
	const religion = ensureArray(entry.identity.religion).join("<br>");
	const supportLines = Object.entries(entry.modSupport || {})
		.map(([key, value]) => `|${key}=${value ? "Yes" : "No"}`)
		.join("\n");
	const uniqueRows = entry.uniques.map((unique, index) => renderUniqueRow(unique, index)).join("\n");
	const listBlocks = entry.nameLists.length
		? `{| border="0" cellpadding="1" cellspacing="1" class="article-table" style="width: 300px;"\n|-\n${entry.nameLists.map((list) => renderWikiList(list.title, list.items)).join("\n|-\n")}\n|}`
		: "";
	const creditLines = mergeCreditsByName(entry.credits)
		.map((credit) => `* ''${credit.name}'': ${credit.role}`)
		.join("\n");
	const categoryLines = entry.categories.map((category) => `[[Category:${category}]]`).join("\n");
	const workshopUrl = entry.source.workshopUrl || "https://steamcommunity.com/sharedfiles/filedetails/?id=";
	const civOverviewTitle = entry.overview.civilization.title || entry.title;
	const civOverviewUrl = cleanText(entry.overview.civilization.url);
	const leaderOverviewUrl = cleanText(entry.overview.leader.url);

	return `{{Infobox civs
|title = ${entry.title}
|image = ${entry.presentation.mapImage}
|imagecaption = ${entry.presentation.mapImageCaption}
|bgcolour = ${entry.presentation.colors.background}
|iconcolour = ${entry.presentation.colors.icon}
|leader = ${entry.leader}
|bias = ${entry.identity.bias}
|religion = ${religion}
|empire_name = ${entry.identity.empireName}
|adjectives = ${entry.identity.adjectives}
|capital = ${entry.identity.capital}
|government = ${entry.identity.government}
|maplabelslanguage = ${entry.identity.mapLabelsLanguage}
|mercenaries =
|religiousintolerance =
|slavery =
|traits =
|culture= ${entry.identity.culture}}${entry.summary}

${entry.identity.requiredContent.length ? `This mod requires ${entry.identity.requiredContent.join(", ")}.` : ""}

== Overview ==
=== ${civOverviewUrl ? `[${civOverviewUrl} ` : ""}'''${civOverviewTitle}'''${civOverviewUrl ? "]" : ""} ===
${entry.overview.civilization.body}

=== ${leaderOverviewUrl ? `[${leaderOverviewUrl} ` : ""}'''${entry.leader}'''${leaderOverviewUrl ? "]" : ""} ===
${entry.overview.leader.body}

==== '''Dawn of Man''' ====
[[File:${entry.presentation.leaderSceneImage}|thumb|left|290x290px|${entry.presentation.leaderSceneArtCredit}]]
${entry.dawnOfMan.blessing}

'''Introduction: ''' ${entry.dawnOfMan.introduction}

'''Defeat:''' ${entry.dawnOfMan.defeat}

== Unique Attributes ==
{| class="article-table"
! colspan="2" style="border-color:${entry.presentation.colors.icon};background-color:${entry.presentation.colors.background};"|<div style="font-size:12pt;color:${entry.presentation.colors.icon};">${entry.title} (${entry.leader})</div>
${uniqueRows}
|}
${listBlocks}

[[File:${entry.presentation.iconImage}|frameless|thumb|right|172px]]

==Music==
{| border="0" cellpadding="1" cellspacing="1" class="article-table article-table-selected" style="width: 700px;"
|-
! scope="col"|Peace Theme
! scope="col"|War Theme
|-
|'''${entry.music.peace.title}''' by ${entry.music.peace.credit}
|'''${entry.music.war.title}''' by ${entry.music.war.credit}
|}

== Mod Support ==
{{Template:Mod Support Infobox
${supportLines}}}

== Full Credits List ==
{| class="wikia-infobox"
|-
| class="wikia-infobox-image" colspan="2"| [${workshopUrl} '''Steam Workshop''']
|-
|Latest Version:
|${entry.source.version}
|-
|Last Updated:
|${entry.source.lastUpdated}
|}
${creditLines}

${entry.navTemplate ? `{{${entry.navTemplate}}}` : ""}
${categoryLines}`.trim();
}

export function normalizePediaEntry(entryInput) {
	const entry = cloneDefaultEntry();
	const source = entryInput || {};

	entry.id = cleanText(source.id) || buildEntryId(source.title, source.leader);
	entry.slug = cleanText(source.slug) || slugifyPediaValue(source.title || entry.id);
	entry.kind = cleanText(source.kind) || "civilization";
	entry.title = cleanText(source.title);
	entry.leader = cleanText(source.leader);
	entry.authors = ensureArray(source.authors)
		.map((author) => cleanText(author))
		.filter(Boolean);
	entry.summary = sanitizePediaProse(source.summary);
	entry.source = { ...entry.source, ...(source.source || {}) };
	entry.identity = {
		...entry.identity,
		...(source.identity || {}),
		religion: ensureArray(source?.identity?.religion)
			.map((item) => cleanText(item))
			.filter(Boolean),
		requiredContent: ensureArray(source?.identity?.requiredContent)
			.map((item) => cleanText(item))
			.filter(Boolean),
	};
	entry.presentation = {
		...entry.presentation,
		...(source.presentation || {}),
		colors: {
			...entry.presentation.colors,
			...(source?.presentation?.colors || {}),
		},
	};
	entry.overview = {
		civilization: {
			...entry.overview.civilization,
			...(source?.overview?.civilization || {}),
			title: cleanText(source?.overview?.civilization?.title),
			url: cleanText(source?.overview?.civilization?.url),
			body: sanitizePediaProse(source?.overview?.civilization?.body),
		},
		leader: {
			...entry.overview.leader,
			...(source?.overview?.leader || {}),
			title: cleanText(source?.overview?.leader?.title),
			url: cleanText(source?.overview?.leader?.url),
			body: sanitizePediaProse(source?.overview?.leader?.body),
		},
	};
	entry.dawnOfMan = {
		...entry.dawnOfMan,
		...(source.dawnOfMan || {}),
		blessing: sanitizePediaProse(source?.dawnOfMan?.blessing),
		introduction: sanitizePediaProse(source?.dawnOfMan?.introduction),
		defeat: sanitizePediaProse(source?.dawnOfMan?.defeat),
	};
	entry.uniques = ensureArray(source.uniques).map((unique) => ({
		slot: cleanText(unique?.slot),
		name: cleanText(unique?.name),
		replaces: cleanText(unique?.replaces),
		art: cleanText(unique?.art),
		artUrl: cleanText(unique?.artUrl),
		artCredit: cleanText(unique?.artCredit),
		body: sanitizePediaProse(unique?.body),
		civilopedia: sanitizePediaProse(unique?.civilopedia),
		bullets: ensureArray(unique?.bullets)
			.map((bullet) => sanitizePediaProse(bullet))
			.filter(Boolean),
	}));
	entry.nameLists = ensureArray(source.nameLists).map((list) => ({
		title: cleanText(list?.title),
		items: ensureArray(list?.items)
			.map((item) => cleanText(item))
			.filter(Boolean),
	}));
	entry.music = {
		peace: { ...entry.music.peace, ...(source?.music?.peace || {}) },
		war: { ...entry.music.war, ...(source?.music?.war || {}) },
	};
	entry.modSupport = { ...(source.modSupport || {}) };
	entry.credits = ensureArray(source.credits).map((credit) => ({
		name: cleanText(credit?.name),
		role: cleanText(credit?.role),
	}));
	if (!entry.authors.length) {
		entry.authors = deriveAuthorsFromCredits(entry.credits);
	}
	entry.categories = ensureArray(source.categories)
		.map((item) => cleanText(item))
		.filter(Boolean);
	entry.navTemplate = cleanText(source.navTemplate);
	entry.issues = ensureArray(source.issues)
		.map((item) => cleanText(item))
		.filter(Boolean);
	entry.meta = {
		formatVersion: MODDED_CIVS_PEDIA_FORMAT_VERSION,
		createdAt: source?.meta?.createdAt || new Date().toISOString(),
	};
	return entry;
}
