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

const PEDIA_INLINE_ICON_DEFINITIONS = [
	{ templates: ["Citizen", "Citizen Icon"], label: "Citizens", fileName: "Citizen.png" },
	{ templates: ["City-State Icon", "City State Icon"], label: "City-State", fileName: "Citystate.png" },
	{ templates: ["Culture Icon"], label: "Culture", fileName: "CultureIcon.png" },
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
	{ templates: ["Great General Icon"], label: "Great General", fileName: "Greatgeneral.png" },
	{ templates: ["Great Person Icon", "Great People Icon"], label: "Great People", fileName: "Greatperson.png" },
	{
		templates: ["Great Work Icon"],
		label: "Great Work",
		fileName: "Greatwork.png",
		imageUrl: "https://static.wikia.nocookie.net/civilization-v-customisation/images/6/67/Greatwork.png",
	},
	{ templates: ["Happiness Icon", "Happiness"], label: "Happiness", fileName: "Happiness.png" },
	{ templates: ["Influence Icon", "Influence"], label: "Influence", fileName: "Influence.png" },
	{ templates: ["International Trade", "International Trade Icon"], label: "International Trade", fileName: "Internationaltrade.png" },
	{ templates: ["Capital", "Capital Icon"], label: "Capital", fileName: "Capital.png" },
	{ templates: ["Connected", "Connected Icon"], label: "Connected", fileName: "Connected.png" },
	{ templates: ["Moves Icon", "Move Icon", "Movement Icon"], label: "Movement", fileName: "Moves.png" },
	{ templates: ["Production Icon"], label: "Production", fileName: "Production.png" },
	{ templates: ["Range Strength Icon", "Ranged Strength Icon"], label: "Ranged Strength", fileName: "Rangestrength.png" },
	{ templates: ["Science Icon", "Research Icon"], label: "Science", fileName: "Science.png" },
	{ templates: ["Spy", "Spy Icon"], label: "Spy", fileName: "Spy.png" },
	{ templates: ["Strength Icon", "Combat Strength Icon"], label: "Strength", fileName: "Strength.png" },
	{ templates: ["Tourism Icon"], label: "Tourism", fileName: "Tourism.png" },
	{ templates: ["Trade Route Icon", "Trade Routes Icon"], label: "Trade Routes", fileName: "Traderoute.png" },
];

export const PEDIA_INLINE_ICONS = PEDIA_INLINE_ICON_DEFINITIONS.flatMap((definition) =>
	definition.templates.map((template) => ({
		template,
		label: definition.label,
		fileName: definition.fileName,
		href: templateUrl(template),
		imageUrl: cleanValue(definition.imageUrl) || fileRedirectUrl(definition.fileName),
	})),
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
		};
	}

	const byLabel = getPediaInlineIconByLabel(ref?.label);
	if (byLabel) {
		return {
			label: byLabel.label,
			template: byLabel.template,
			href: byLabel.href,
			imageUrl: byLabel.imageUrl,
		};
	}

	const label = cleanValue(ref?.label);
	const template = normalizeTemplateName(ref?.template);
	return {
		label,
		template,
		href: cleanValue(ref?.href) || templateUrl(template),
		imageUrl: cleanValue(ref?.imageUrl),
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
		const resolved = iconByToken.get(normalizeLookupKey(rawToken)) || null;
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
