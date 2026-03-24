const FANDOM_BASE_URL = "https://civilization-v-customisation.fandom.com";

function cleanValue(value) {
	return String(value || "").trim();
}

function templateUrl(template) {
	const normalized = cleanValue(template).replace(/^Template:/i, "");
	return normalized ? `${FANDOM_BASE_URL}/wiki/Template:${normalized.replace(/\s+/g, "_")}` : "";
}

function fileRedirectUrl(fileName) {
	const normalized = cleanValue(fileName);
	return normalized ? `${FANDOM_BASE_URL}/wiki/Special:Redirect/file/${encodeURIComponent(normalized)}` : "";
}

function normalizeTemplateName(value) {
	return cleanValue(value).replace(/^Template:/i, "");
}

function normalizeLookupKey(value) {
	return cleanValue(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function compactWords(value) {
	return cleanValue(value)
		.replace(/^Template:/i, "")
		.replace(/\bicon\b/gi, "")
		.replace(/[^a-z0-9]+/gi, " ")
		.trim()
		.split(/\s+/)
		.filter(Boolean);
}

function titleCaseWords(words) {
	return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}

function sentenceCaseWordRun(words) {
	const joined = titleCaseWords(words);
	return joined ? joined.charAt(0).toUpperCase() + joined.slice(1).toLowerCase() : "";
}

function uniqueValues(values) {
	return Array.from(new Set(values.map((value) => cleanValue(value)).filter(Boolean)));
}

function candidateFileNames(definition) {
	const explicitFileNames = [definition.fileName, ...(Array.isArray(definition.fileNames) ? definition.fileNames : [])];
	const generatedFileNames = [];
	for (const source of [definition.label, ...(definition.templates || [])]) {
		const words = compactWords(source);
		if (!words.length) {
			continue;
		}
		const titleCase = titleCaseWords(words);
		const sentenceCase = sentenceCaseWordRun(words);
		generatedFileNames.push(`${titleCase}.png`, `${titleCase}Icon.png`, `${sentenceCase}.png`, `${sentenceCase}Icon.png`);
	}
	return uniqueValues([...explicitFileNames, ...generatedFileNames]);
}

function buildImageUrls(definition) {
	return uniqueValues([definition.imageUrl, ...(Array.isArray(definition.imageUrls) ? definition.imageUrls : []), ...candidateFileNames(definition).map((fileName) => fileRedirectUrl(fileName))]);
}

const PEDIA_INLINE_ICON_DEFINITIONS = [
	{ templates: ["Citizen", "Citizen Icon"], label: "Citizens", fileName: "Citizen.png" },
	{ templates: ["Border Growth", "Border Growth Icon"], label: "Border Growth", fileName: "Bordergrowth.png" },
	{ templates: ["City Icon"], label: "City", fileName: "City.png" },
	{ templates: ["City-State Icon", "City State Icon"], label: "City-State", fileName: "Citystate.png" },
	{ templates: ["Culture Icon"], label: "Culture", fileName: "CultureIcon.png" },
	{ templates: ["Defense Icon", "Defence Icon"], label: "Defense", fileNames: ["Defense.png", "Defence.png"] },
	{ templates: ["Diplomat", "Diplomat Icon"], label: "Diplomats", fileName: "Diplomat.png" },
	{ templates: ["Faith Icon"], label: "Faith", fileName: "FaithIcon.png" },
	{
		templates: ["Food Icon"],
		label: "Food",
		fileName: "Food.png",
		imageUrl: "https://static.wikia.nocookie.net/civilization-v-customisation/images/c/c6/Food.png",
	},
	{ templates: ["Golden Age", "Golden Age Icon", "Golden Age Points"], label: "Golden Age", fileName: "Goldenage.png" },
	{ templates: ["Gold Icon"], label: "Gold", fileName: "Gold.png" },
	{ templates: ["Great Admiral Icon"], label: "Great Admiral", fileName: "Greatadmiral.png" },
	{ templates: ["Great Artist Icon"], label: "Great Artist", fileName: "Greatartist.png" },
	{ templates: ["Great Engineer Icon"], label: "Great Engineer", fileName: "Greatengineer.png" },
	{ templates: ["Great General Icon"], label: "Great General", fileName: "Greatgeneral.png" },
	{ templates: ["Great Merchant Icon"], label: "Great Merchant", fileName: "Greatmerchant.png" },
	{ templates: ["Great Musician Icon"], label: "Great Musician", fileName: "Greatmusician.png" },
	{ templates: ["Great Person Icon", "Great People Icon"], label: "Great People", fileName: "Greatperson.png" },
	{ templates: ["Great Scientist Icon"], label: "Great Scientist", fileName: "Greatscientist.png" },
	{
		templates: ["Great Work Icon"],
		label: "Great Work",
		fileName: "Greatwork.png",
		imageUrl: "https://static.wikia.nocookie.net/civilization-v-customisation/images/6/67/Greatwork.png",
	},
	{ templates: ["Great Writer Icon"], label: "Great Writer", fileName: "Greatwriter.png" },
	{ templates: ["Happiness Icon", "Happiness"], label: "Happiness", fileName: "Happiness.png" },
	{ templates: ["Influence Icon", "Influence"], label: "Influence", fileName: "Influence.png" },
	{ templates: ["International Trade", "International Trade Icon"], label: "International Trade", fileName: "Internationaltrade.png" },
	{ templates: ["Capital", "Capital Icon"], label: "Capital", fileName: "Capital.png" },
	{ templates: ["Horse", "Horse Icon"], label: "Horse", fileName: "Horses.png" },
	{ templates: ["Connection", "Connection Icon"], label: "Connection", fileName: "Connection.png" },
	{ templates: ["Moves Icon", "Move Icon", "Movement Icon"], label: "Movement", fileName: "Moves.png" },
	{ templates: ["Occupied Icon"], label: "Occupied", fileName: "Occupied.png" },
	{ templates: ["Population Icon"], label: "Population", fileName: "Population.png" },
	{ templates: ["Production Icon"], label: "Production", fileName: "Production.png" },
	{ templates: ["Puppet Icon"], label: "Puppet", fileName: "Puppet.png" },
	{ templates: ["Range Strength Icon", "Ranged Strength Icon"], label: "Ranged Strength", fileName: "Rangestrength.png" },
	{ templates: ["Religion Icon"], label: "Religion", fileName: "Religion.png" },
	{ templates: ["Religious Pressure Icon"], label: "Religious Pressure", fileName: "Religiouspressure.png" },
	{ templates: ["Resistance Icon"], label: "Resistance", fileName: "Resistance.png" },
	{ templates: ["Science Icon", "Research Icon"], label: "Science", fileName: "Science.png" },
	{ templates: ["Spy", "Spy Icon"], label: "Spy", fileName: "Spy.png" },
	{ templates: ["Strength Icon", "Combat Strength Icon"], label: "Strength", fileName: "Strength.png" },
	{ templates: ["Tourism Icon"], label: "Tourism", fileName: "Tourism.png" },
	{ templates: ["Happiness Icon"], label: "Happiness", fileName: "Happy.png" },
	{ templates: ["Trade Route Icon", "Trade Routes Icon"], label: "Trade Routes", fileName: "Traderoute.png" },
];

export const PEDIA_INLINE_ICONS = PEDIA_INLINE_ICON_DEFINITIONS.flatMap((definition) =>
	definition.templates.map((template) => {
		const fileNames = candidateFileNames(definition);
		const imageUrls = buildImageUrls(definition);
		return {
			template,
			label: definition.label,
			fileName: fileNames[0] || "",
			fileNames,
			href: templateUrl(template),
			imageUrl: imageUrls[0] || "",
			imageUrls,
		};
	}),
);

const ICONS_BY_TEMPLATE = new Map(PEDIA_INLINE_ICONS.map((icon) => [normalizeLookupKey(icon.template), icon]));
const ICONS_BY_LABEL = new Map(PEDIA_INLINE_ICONS.map((icon) => [normalizeLookupKey(icon.label), icon]));

export function getPediaInlineIconByTemplate(templateName) {
	return ICONS_BY_TEMPLATE.get(normalizeLookupKey(normalizeTemplateName(templateName))) || null;
}

export function getPediaInlineIconByLabel(label) {
	return ICONS_BY_LABEL.get(normalizeLookupKey(label)) || null;
}

export function resolvePediaInlineIconRef(ref) {
	const byTemplate = getPediaInlineIconByTemplate(ref?.template);
	if (byTemplate) {
		return {
			label: byTemplate.label,
			template: byTemplate.template,
			href: byTemplate.href,
			imageUrl: byTemplate.imageUrl,
			imageUrls: byTemplate.imageUrls,
		};
	}

	const byLabel = getPediaInlineIconByLabel(ref?.label);
	if (byLabel) {
		return {
			label: byLabel.label,
			template: byLabel.template,
			href: byLabel.href,
			imageUrl: byLabel.imageUrl,
			imageUrls: byLabel.imageUrls,
		};
	}

	const label = cleanValue(ref?.label);
	const template = normalizeTemplateName(ref?.template);
	return {
		label,
		template,
		href: cleanValue(ref?.href) || templateUrl(template),
		imageUrl: cleanValue(ref?.imageUrl),
		imageUrls: uniqueValues([ref?.imageUrl, ...(Array.isArray(ref?.imageUrls) ? ref.imageUrls : [])]),
	};
}

export function segmentPediaInlineText(text, refs) {
	const source = String(text || "");
	const icons = (Array.isArray(refs) ? refs : []).map((ref) => resolvePediaInlineIconRef(ref)).filter((icon) => icon?.label || icon?.template);

	if (!source) {
		return source ? [{ type: "text", text: source }] : [];
	}
	const iconByToken = new Map();
	for (const icon of icons) {
		const templateKey = normalizeLookupKey(icon.template);
		const labelKey = normalizeLookupKey(icon.label);
		if (templateKey && !iconByToken.has(templateKey)) {
			iconByToken.set(templateKey, icon);
		}
		if (labelKey && !iconByToken.has(labelKey)) {
			iconByToken.set(labelKey, icon);
		}
	}
	const tokenPattern = /\{\{\s*([^}|]+?)\s*}}/g;
	const segments = [];
	let lastIndex = 0;
	let match = tokenPattern.exec(source);

	while (match) {
		const start = match.index;
		if (start > lastIndex) {
			segments.push({
				type: "text",
				text: source.slice(lastIndex, start),
			});
		}
		const rawToken = String(match[1] || "").trim();
		const resolved = iconByToken.get(normalizeLookupKey(rawToken)) || getPediaInlineIconByTemplate(rawToken) || null;
		if (resolved) {
			segments.push({
				type: "icon",
				text: rawToken,
				icon: resolved,
			});
		} else {
			segments.push({
				type: "text",
				text: match[0],
			});
		}
		lastIndex = tokenPattern.lastIndex;
		match = tokenPattern.exec(source);
	}

	if (lastIndex < source.length) {
		segments.push({
			type: "text",
			text: source.slice(lastIndex),
		});
	}

	return segments.length ? segments : [{ type: "text", text: source }];
}
