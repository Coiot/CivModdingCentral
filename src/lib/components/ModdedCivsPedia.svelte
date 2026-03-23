<script>
	import PEDIA_AUTHOR_PROFILES from "../data/pediaAuthorProfiles.json";
	import PediaInlineText from "./PediaInlineText.svelte";
	import { PEDIA_INLINE_ICONS, resolvePediaInlineIconRef } from "../data/pediaInlineIcons.js";
	import { PEDIA_COLLECTIONS } from "../data/pediaCollections.js";
	import { BUILTIN_MODDED_CIVS, MOD_SUPPORT_LABELS, sortModdedCivsEntries } from "../data/moddedCivsPedia.js";
	import {
		createPediaEntryFromModFolderFiles,
		createPediaEntryFromWikiMarkup,
		groupPediaCategories,
		groupPediaCollections,
		inferBrowsableCategoriesForEntry,
		inferCollectionsForEntry,
		normalizePediaEntry,
		renderWikiMarkupFromEntry,
		sanitizePediaProse,
		slugifyPediaValue,
	} from "../utils/moddedCivsPedia.js";
	import {
		deletePediaCollectionFromCloud,
		hasPediaCloudConfig,
		loadPediaCollectionsFromCloud,
		loadPediaEntriesFromCloud,
		markPediaEntryDeletedInCloud,
		savePediaCollectionToCloud,
		savePediaEntryToCloud,
	} from "../utils/pediaCloud.js";
	import { personHighlightStyle } from "../utils/personHighlights.js";

	const PEDIA_BASE_PATH = "/modded-civs-pedia";

	let { routePath = PEDIA_BASE_PATH, navigate = null, canEdit = false, authUser = null, authAccessToken = "", authEnabled = false } = $props();

	const TOC_SECTIONS = [
		{ id: "overview", label: "Overview" },
		{ id: "dawn-of-man", label: "Dawn of Man" },
		{ id: "unique-attributes", label: "Unique Attributes" },
		{ id: "name-lists", label: "Lists" },
		{ id: "music", label: "Music" },
		{ id: "mod-support", label: "Mod Support" },
		{ id: "collections", label: "Part of Collection" },
		{ id: "categories", label: "Categories" },
		{ id: "credits", label: "Credits" },
		{ id: "more-by-author", label: "More by Author" },
	];

	let searchQuery = $state("");
	let authorFilterName = $state("");
	let selectedEntryId = $state("");
	let activeView = $state("catalog");
	let cloudEntries = $state([]);
	let cloudCollections = $state([]);
	let cloudDeletedEntryIds = $state([]);
	let importedEntries = $state([]);
	let wikiMarkupInput = $state("");
	let convertedEntry = $state(null);
	let convertedEntrySource = $state("");
	let converterBusy = $state(false);
	let converterStatus = $state("");
	let converterIssues = $state([]);
	let entryEditorOpen = $state(false);
	let entryEditorDraft = $state("");
	let collectionEditorOpen = $state(false);
	let collectionCreatorOpen = $state(false);
	let collectionMetadataEditorOpen = $state(false);
	let collectionEditorDraft = $state([]);
	let collectionEditorEntryId = $state("");
	let collectionEditorSelection = $state("");
	let collectionEditorStatus = $state("");
	let collectionMetadataStatus = $state("");
	let collectionMetadataTitle = $state("");
	let collectionMetadataId = $state("");
	let collectionMetadataSourceTemplate = $state("");
	let collectionMetadataBlurb = $state("");
	let collectionMetadataImageURL = $state("");
	let collectionMetadataBackground = $state("");
	let collectionMetadataAccent = $state("");
	let collectionMetadataAliases = $state("");
	let collectionMetadataLinks = $state("");
	let categoryEditorOpen = $state(false);
	let categoryEditorDraft = $state([]);
	let categoryEditorEntryId = $state("");
	let categoryEditorInput = $state("");
	let categoryEditorStatus = $state("");
	let customCollections = $state([]);
	let pediaCloudLoadKey = $state("");
	let newCollectionTitle = $state("");
	let newCollectionId = $state("");
	let newCollectionSourceTemplate = $state("");
	let newCollectionBackground = $state("");
	let newCollectionAccent = $state("");
	let newCollectionAliases = $state("");
	let entryStatus = $state("");
	let deletedEntryIds = $state([]);
	let folderInputEl = $state();
	let jsonInputEl = $state();
	let activeMusicPreviewKey = $state("");
	let failedImageUrls = $state([]);
	const cloudPediaConfigured = $derived(Boolean(authEnabled) && hasPediaCloudConfig());

	function normalizeSearch(value) {
		return String(value || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	function normalizeRoutePath(value) {
		const raw = String(value || "").trim();
		if (!raw) {
			return PEDIA_BASE_PATH;
		}
		const withoutQuery = raw.split("#")[0].split("?")[0] || PEDIA_BASE_PATH;
		return withoutQuery.replace(/\/+$/, "") || PEDIA_BASE_PATH;
	}

	function entrySearchText(entry) {
		return normalizeSearch(
			[
				entry.title,
				entry.leader,
				...(entry.authors || []),
				entry.summary,
				entry.identity?.culture,
				entry.identity?.capital,
				...(entry.categories || []),
				...(entry.credits || []).map((credit) => `${credit.name} ${credit.role}`),
				...(entry.uniques || []).map((unique) => `${unique.name} ${unique.replaces} ${unique.body} ${(unique.bullets || []).join(" ")}`),
			].join(" "),
		);
	}

	function mergeEntries(entries) {
		const byId = new Map();
		for (const entry of [...BUILTIN_MODDED_CIVS, ...(entries || [])]) {
			const normalized = normalizePediaEntry(entry);
			byId.set(normalized.id, normalized);
		}
		const hiddenEntryIds = new Set([...deletedEntryIds, ...cloudDeletedEntryIds]);
		return sortModdedCivsEntries([...byId.values()]).filter((entry) => !hiddenEntryIds.has(entry.id));
	}

	function isAuthorCredit(credit) {
		return /\bauthor\b/i.test(credit?.role || "");
	}

	function entryAuthors(entry) {
		const explicitAuthors = (entry?.authors || []).map((author) => String(author || "").trim()).filter(Boolean);
		if (explicitAuthors.length) {
			return [...new Set(explicitAuthors)];
		}
		const creditAuthors = (entry?.credits || [])
			.filter((credit) => isAuthorCredit(credit))
			.map((credit) => String(credit?.name || "").trim())
			.filter(Boolean);
		if (creditAuthors.length) {
			return [...new Set(creditAuthors)];
		}
		const fallbackCredit = String(entry?.credits?.[0]?.name || "").trim();
		return fallbackCredit ? [fallbackCredit] : ["Unknown Author"];
	}

	function primaryAuthor(entry) {
		return entryAuthors(entry)[0] || "Unknown Author";
	}

	function authorFilterKey(value) {
		return normalizeSearch(value);
	}

	function entryAuthorKey(entry) {
		return entryAuthors(entry).map((author) => authorFilterKey(author));
	}

	function catalogComponent(entry, index) {
		const unique = entry?.uniques?.[index];
		if (!unique) {
			return "—";
		}
		return unique.replaces ? `${unique.name} (${unique.replaces})` : unique.name;
	}

	function catalogUnique(entry, index) {
		return entry?.uniques?.[index] || null;
	}

	function catalogComponentTypeLabel(entry, index) {
		const unique = catalogUnique(entry, index);
		const slot = String(unique?.slot || "").trim();
		if (!slot) {
			return index === 0 ? "Unique Ability" : `Unique ${index}`;
		}
		return slot.replace(/\b\w/g, (character) => character.toUpperCase());
	}

	function isValidHexColor(value) {
		return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "").trim());
	}

	function sanitizeHexColor(value) {
		const normalized = String(value || "")
			.trim()
			.replace(/^#?/, "#");
		return normalized.toUpperCase();
	}

	function normalizeCategoryValue(value) {
		return String(value || "")
			.replace(/\s+/g, " ")
			.trim();
	}

	function colorInputValue(value, fallback = "#000000") {
		return isValidHexColor(value) ? String(value).toUpperCase() : fallback;
	}

	function hexToRgb(value) {
		const hex = colorInputValue(value).slice(1);
		const expanded =
			hex.length === 3
				? hex
						.split("")
						.map((part) => `${part}${part}`)
						.join("")
				: hex;
		return {
			r: Number.parseInt(expanded.slice(0, 2), 16),
			g: Number.parseInt(expanded.slice(2, 4), 16),
			b: Number.parseInt(expanded.slice(4, 6), 16),
		};
	}

	function rgbToHsl({ r, g, b }) {
		const red = r / 255;
		const green = g / 255;
		const blue = b / 255;
		const max = Math.max(red, green, blue);
		const min = Math.min(red, green, blue);
		const delta = max - min;
		let hue = 0;
		if (delta) {
			if (max === red) {
				hue = ((green - blue) / delta) % 6;
			} else if (max === green) {
				hue = (blue - red) / delta + 2;
			} else {
				hue = (red - green) / delta + 4;
			}
		}
		const lightness = (max + min) / 2;
		const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
		return {
			h: Math.round((hue * 60 + 360) % 360 || 0),
			s: Math.round(saturation * 100),
			l: Math.round(lightness * 100),
		};
	}

	function colorDisplay(value, fallback) {
		const hex = colorInputValue(value, fallback).toUpperCase();
		const rgb = hexToRgb(hex);
		const hsl = rgbToHsl(rgb);
		return {
			hex,
			rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
			hsl: `${hsl.h}deg ${hsl.s}% ${hsl.l}%`,
		};
	}

	function updateNewCollectionColor(field, value) {
		const next = sanitizeHexColor(value);
		if (field === "accent") {
			newCollectionAccent = next;
			return;
		}
		newCollectionBackground = next;
	}

	function updateCollectionMetadataColor(field, value) {
		const next = sanitizeHexColor(value);
		if (field === "accent") {
			collectionMetadataAccent = next;
			return;
		}
		collectionMetadataBackground = next;
	}

	function cssUrlValue(url) {
		const value = String(url || "").trim();
		if (!value) {
			return "";
		}
		return `url("${value.replaceAll('"', '\\"')}")`;
	}

	function catalogRowStyle(entry, backdropImageUrl = "") {
		const background = entry?.presentation?.colors?.background;
		const accent = entry?.presentation?.colors?.icon;
		const vars = [];
		if (isValidHexColor(background)) {
			vars.push(`--catalog-surface:${background}`);
		}
		if (isValidHexColor(accent)) {
			vars.push(`--catalog-accent:${accent}`);
		}
		if (String(backdropImageUrl || "").trim()) {
			vars.push(`--catalog-backdrop-image:${cssUrlValue(backdropImageUrl)}`);
		}
		return vars.join(";");
	}

	function infoboxStyle(entry) {
		const background = entry?.presentation?.colors?.background;
		const accent = entry?.presentation?.colors?.icon;
		const vars = [];
		if (isValidHexColor(background)) {
			vars.push(`--infobox-surface:${background}`);
		}
		if (isValidHexColor(accent)) {
			vars.push(`--infobox-accent:${accent}`);
		}
		return vars.join(";");
	}

	function creditCardStyle(name) {
		return personHighlightStyle(name);
	}

	function creditFilterTarget(entry, credit) {
		const creditName = String(credit?.name || "").trim();
		return entryAuthors(entry).includes(creditName) ? creditName : primaryAuthor(entry);
	}

	function entryCollections(entry) {
		return inferCollectionsForEntry(entry);
	}

	function entryCategories(entry) {
		return inferBrowsableCategoriesForEntry(entry);
	}

	function collectionCardStyle(collection) {
		const accent = collection?.colors?.accent;
		const background = collection?.colors?.background;
		const vars = [];
		if (isValidHexColor(accent)) {
			vars.push(`--collection-accent:${accent}`);
		}
		if (isValidHexColor(background)) {
			vars.push(`--collection-background:${background}`);
		}
		return vars.join(";");
	}

	function collectionHeroStyle(collection) {
		const vars = [collectionCardStyle(collection)];
		const imageUrl = String(collection?.imageURL || "").trim();
		if (imageUrl) {
			vars.push(`--collection-hero-image:${cssUrlValue(imageUrl)}`);
		}
		return vars.filter(Boolean).join(";");
	}

	function serializeCollectionLinks(collection) {
		return (Array.isArray(collection?.links) ? collection.links : [])
			.map((link) => {
				const label = String(link?.label || "").trim();
				const href = String(link?.href || "").trim();
				return label && href ? `${label} | ${href}` : "";
			})
			.filter(Boolean)
			.join("\n");
	}

	function hydrateCollectionMetadataDraft(collection) {
		collectionMetadataTitle = String(collection?.title || "").trim();
		collectionMetadataId = String(collection?.id || "").trim();
		collectionMetadataSourceTemplate = String(collection?.sourceTemplate || "").trim();
		collectionMetadataBlurb = String(collection?.blurb || "").trim();
		collectionMetadataImageURL = String(collection?.imageURL || "").trim();
		collectionMetadataBackground = String(collection?.colors?.background || "").trim();
		collectionMetadataAccent = String(collection?.colors?.accent || "").trim();
		collectionMetadataAliases = [...new Set([String(collection?.title || "").trim(), ...(collection?.aliases || []).map((alias) => String(alias || "").trim())].filter(Boolean))].join("\n");
		collectionMetadataLinks = serializeCollectionLinks(collection);
	}

	function entryCollectionPillStyle(collection) {
		return collectionCardStyle(collection);
	}

	function visibleEntryCollections(entry, hiddenCollectionId = "") {
		const hiddenId = String(hiddenCollectionId || "").trim();
		return entryCollections(entry).filter((collection) => String(collection?.id || "").trim() !== hiddenId);
	}

	function collectionLinkStyle(collection) {
		return collectionCardStyle(collection);
	}

	function collectionEntryCount(collection) {
		const collectionId = String(collection?.id || "").trim();
		if (!collectionId) {
			return 0;
		}
		return allCollections.find((candidate) => candidate.id === collectionId)?.entries?.length || 0;
	}

	function catalogNotes(entry) {
		return sanitizePediaProse(entry?.summary) || entryDisplaySummary(entry);
	}

	function unresolvedTemplateRefs(refs) {
		return (refs || []).filter((ref) => !ref?.imageUrl);
	}

	const sharedInlineTemplateRefs = (() => {
		const byKey = new Map();
		for (const icon of PEDIA_INLINE_ICONS) {
			const resolved = resolvePediaInlineIconRef(icon);
			const key = normalizeSearch(resolved?.label || resolved?.template || resolved?.href);
			if (!key || byKey.has(key)) {
				continue;
			}
			byKey.set(key, resolved);
		}
		return [...byKey.values()];
	})();

	function entryTemplateRefs(entry, scopedRefs = []) {
		const byKey = new Map();
		for (const ref of [...(scopedRefs || []), ...(entry?.templateRefs || []), ...sharedInlineTemplateRefs]) {
			const template = String(ref?.template || "").trim();
			const label = String(ref?.label || "").trim();
			const href = String(ref?.href || "").trim();
			const key = normalizeSearch(label || template || href);
			if (!key || byKey.has(key)) {
				continue;
			}
			byKey.set(key, ref);
		}
		return [...byKey.values()];
	}

	function authorEntriesForName(authorName) {
		return allEntries.filter((candidate) => entryAuthors(candidate).includes(authorName)).sort((left, right) => left.title.localeCompare(right.title));
	}

	function proseNeedsDisclosure(value) {
		const text = sanitizePediaProse(value);
		return text.length > 420 || text.split("\n").filter(Boolean).length > 3;
	}

	function proseParagraphs(value) {
		const text = sanitizePediaProse(value).replace(/[\u2028\u2029]/g, "\n");
		return text
			.split(/\n+\s*/)
			.map((paragraph) => cleanParagraph(paragraph))
			.filter(Boolean);
	}

	function cleanParagraph(value) {
		return String(value || "")
			.replace(/[\u2028\u2029]/g, "\n")
			.trim();
	}

	function entryPath(entry) {
		return `${PEDIA_BASE_PATH}/${slugifyPediaValue(entry?.slug || entry?.title)}`;
	}

	function collectionPath(collection) {
		return `${PEDIA_BASE_PATH}/collection/${slugifyPediaValue(collection?.id || collection?.title)}`;
	}

	function categoryPath(category) {
		return `${PEDIA_BASE_PATH}/category/${slugifyPediaValue(category?.id || category?.title)}`;
	}

	function authorPath(name) {
		return `${PEDIA_BASE_PATH}/author/${slugifyPediaValue(name)}`;
	}

	function authorHeadingId(name) {
		return `author-group-${slugifyPediaValue(name)}`;
	}

	function authorAccordionId(name) {
		return `author-civs-${slugifyPediaValue(name)}`;
	}

	function handleRouteAnchorClick(event, href, options = {}) {
		if (!navigate || !href) {
			return;
		}
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		const target = event.currentTarget;
		if (target instanceof HTMLAnchorElement && (target.target === "_blank" || target.hasAttribute("download"))) {
			return;
		}
		event.preventDefault();
		navigate(href, options);
	}

	function scrollToAuthorGroup(name) {
		if (typeof document === "undefined") {
			return;
		}
		const accordion = document.getElementById(authorAccordionId(name));
		if (accordion instanceof HTMLDetailsElement) {
			accordion.open = true;
		}
		document.getElementById(authorHeadingId(name))?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}

	function authorProfileKey(value) {
		return normalizeSearch(value);
	}

	function uniqueBy(items, getKey) {
		const byKey = new Map();
		for (const item of items || []) {
			const key = cleanParagraph(getKey(item));
			if (!key || byKey.has(key)) {
				continue;
			}
			byKey.set(key, item);
		}
		return [...byKey.values()];
	}

	function authorCollectionTarget(collection) {
		return allCollections.find((candidate) => candidate.id === collection?.id) || null;
	}

	function authorCategoryTarget(category) {
		return allCategories.find((candidate) => candidate.id === category?.id) || null;
	}

	function buildAuthorOverview(authorName, entries) {
		const profile = authorProfileLookup.get(authorProfileKey(authorName)) || {};
		const collections = uniqueBy(
			(entries || []).flatMap((entry) => entryCollections(entry)),
			(item) => item?.id || item?.title,
		)
			.sort((left, right) => String(left?.title || "").localeCompare(String(right?.title || "")))
			.slice(0, 6);
		const categories = uniqueBy(
			(entries || []).flatMap((entry) => entryCategories(entry)),
			(item) => item?.id || item?.title,
		)
			.sort((left, right) => String(left?.title || "").localeCompare(String(right?.title || "")))
			.slice(0, 8);
		const leaders = uniqueBy(
			(entries || []).map((entry) => ({ name: entry?.leader })),
			(item) => item?.name,
		).filter((item) => item?.name);
		const summary = String(profile?.blurb || "").trim();
		return {
			name: authorName,
			blurb: summary,
			links: Array.isArray(profile?.links) ? profile.links : [],
			collections,
			categories,
			stats: [
				{ label: "Mods", value: String(entries.length) },
				{ label: "Collections", value: String(collections.length) },
				{ label: "Leaders", value: String(leaders.length) },
			],
		};
	}

	function parseRouteState(pathname) {
		const normalized = normalizeRoutePath(pathname);
		if (normalized === PEDIA_BASE_PATH) {
			return { kind: "catalog", authorSlug: "" };
		}
		if (normalized.startsWith(`${PEDIA_BASE_PATH}/author/`)) {
			return {
				kind: "catalog",
				authorSlug: normalized.slice(`${PEDIA_BASE_PATH}/author/`.length),
			};
		}
		if (normalized.startsWith(`${PEDIA_BASE_PATH}/collection/`)) {
			return {
				kind: "collection",
				collectionSlug: normalized.slice(`${PEDIA_BASE_PATH}/collection/`.length),
			};
		}
		if (normalized.startsWith(`${PEDIA_BASE_PATH}/category/`)) {
			return {
				kind: "category",
				categorySlug: normalized.slice(`${PEDIA_BASE_PATH}/category/`.length),
			};
		}
		if (normalized.startsWith(`${PEDIA_BASE_PATH}/`)) {
			return {
				kind: "entry",
				entrySlug: normalized.slice(PEDIA_BASE_PATH.length + 1),
			};
		}
		return { kind: "catalog", authorSlug: "" };
	}

	const allEntries = $derived.by(() => mergeEntries([...cloudEntries, ...importedEntries]));
	const normalizedQuery = $derived(normalizeSearch(searchQuery));
	const activeAuthorFilterKey = $derived(authorFilterKey(authorFilterName));
	const authorLookup = $derived.by(() => {
		const bySlug = new Map();
		for (const entry of allEntries) {
			for (const author of entryAuthors(entry)) {
				const slug = slugifyPediaValue(author);
				if (!bySlug.has(slug)) {
					bySlug.set(slug, author);
				}
			}
		}
		return bySlug;
	});
	const authorProfileLookup = $derived.by(() => {
		const byKey = new Map();
		for (const profile of Array.isArray(PEDIA_AUTHOR_PROFILES) ? PEDIA_AUTHOR_PROFILES : []) {
			const name = String(profile?.name || "").trim();
			const key = authorProfileKey(name);
			if (!key || byKey.has(key)) {
				continue;
			}
			byKey.set(key, profile);
		}
		return byKey;
	});
	const filteredEntries = $derived.by(() =>
		allEntries.filter((entry) => {
			const matchesQuery = !normalizedQuery || entrySearchText(entry).includes(normalizedQuery);
			const matchesAuthor = !activeAuthorFilterKey || entryAuthorKey(entry).includes(activeAuthorFilterKey);
			return matchesQuery && matchesAuthor;
		}),
	);
	const catalogGroups = $derived.by(() =>
		filteredEntries.reduce((groups, entry) => {
			const authors = activeAuthorFilterKey ? entryAuthors(entry).filter((author) => authorFilterKey(author) === activeAuthorFilterKey) : entryAuthors(entry);
			for (const author of authors) {
				if (!groups.has(author)) {
					groups.set(author, []);
				}
				groups.get(author).push(entry);
			}
			return groups;
		}, new Map()),
	);
	const groupedCatalogEntries = $derived.by(() =>
		[...catalogGroups.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([author, entries]) => ({
				author,
				entries: [...entries].sort((left, right) => left.title.localeCompare(right.title)),
			})),
	);
	const allCollections = $derived(groupPediaCollections(allEntries));
	const allCategories = $derived(groupPediaCategories(allEntries));
	const knownCollections = $derived.by(() => {
		const byId = new Map();
		for (const collection of [...PEDIA_COLLECTIONS, ...cloudCollections, ...customCollections, ...allCollections]) {
			const id = String(collection?.id || "").trim();
			const title = String(collection?.title || "").trim();
			if (!id || !title || byId.has(id)) {
				continue;
			}
			byId.set(id, {
				id,
				title,
				sourceTemplate: String(collection?.sourceTemplate || "").trim(),
				imageURL: String(collection?.imageURL || "").trim(),
				blurb: String(collection?.blurb || "").trim(),
				links: Array.isArray(collection?.links)
					? collection.links
							.map((link) => ({
								label: String(link?.label || "").trim(),
								href: String(link?.href || "").trim(),
							}))
							.filter((link) => link.label && link.href)
					: [],
				colors: {
					background: String(collection?.colors?.background || "").trim(),
					accent: String(collection?.colors?.accent || "").trim(),
				},
			});
		}
		return [...byId.values()].sort((left, right) => left.title.localeCompare(right.title));
	});
	const knownCollectionLookup = $derived.by(() => {
		const bySlug = new Map();
		for (const collection of knownCollections) {
			const slug = slugifyPediaValue(collection?.id || collection?.title);
			if (slug && !bySlug.has(slug)) {
				bySlug.set(slug, collection);
			}
		}
		return bySlug;
	});
	const collectionLookup = $derived.by(() => {
		const bySlug = new Map();
		for (const collection of allCollections) {
			const slug = slugifyPediaValue(collection?.id || collection?.title);
			if (slug && !bySlug.has(slug)) {
				bySlug.set(slug, collection);
			}
		}
		return bySlug;
	});
	const categoryLookup = $derived.by(() => {
		const bySlug = new Map();
		for (const category of allCategories) {
			const slug = slugifyPediaValue(category?.id || category?.title);
			if (slug && !bySlug.has(slug)) {
				bySlug.set(slug, category);
			}
		}
		return bySlug;
	});
	const selectedEntry = $derived(allEntries.find((entry) => entry.id === selectedEntryId) || null);
	const convertedJsonText = $derived(convertedEntry ? JSON.stringify(convertedEntry, null, 2) : "");
	const convertedWikiText = $derived(convertedEntry ? renderWikiMarkupFromEntry(convertedEntry) : "");
	const routeState = $derived(parseRouteState(routePath));
	const selectedCollection = $derived.by(() => {
		if (routeState.kind !== "collection") {
			return null;
		}
		const grouped = collectionLookup.get(routeState.collectionSlug) ?? null;
		const known = knownCollectionLookup.get(routeState.collectionSlug) ?? null;
		if (!grouped && !known) {
			return null;
		}
		return {
			...(grouped || {}),
			...(known || {}),
			entries: grouped?.entries || [],
			links: known?.links || grouped?.links || [],
			aliases: known?.aliases || grouped?.aliases || [],
			colors: {
				background: known?.colors?.background || grouped?.colors?.background || "",
				accent: known?.colors?.accent || grouped?.colors?.accent || "",
			},
		};
	});
	const selectedCategory = $derived(routeState.kind === "category" ? (categoryLookup.get(routeState.categorySlug) ?? null) : null);
	const availableCollectionOptions = $derived.by(() => {
		const selectedIds = new Set((collectionEditorDraft || []).map((collection) => collection?.id).filter(Boolean));
		return knownCollections.filter((collection) => !selectedIds.has(collection.id));
	});
	const knownCategoryOptions = $derived.by(() => {
		const byKey = new Map();
		for (const entry of allEntries) {
			for (const category of entry?.categories || []) {
				const title = normalizeCategoryValue(category);
				if (!title) {
					continue;
				}
				const key = normalizeSearch(title);
				if (!byKey.has(key)) {
					byKey.set(key, title);
				}
			}
		}
		return [...byKey.values()].sort((left, right) => left.localeCompare(right));
	});
	const availableCategoryOptions = $derived.by(() => {
		const selectedKeys = new Set((categoryEditorDraft || []).map((category) => normalizeSearch(category)).filter(Boolean));
		return knownCategoryOptions.filter((category) => !selectedKeys.has(normalizeSearch(category)));
	});
	const newCollectionAccentDisplay = $derived(colorDisplay(newCollectionAccent, "#FAD587"));
	const newCollectionBackgroundDisplay = $derived(colorDisplay(newCollectionBackground, "#7E2222"));
	const collectionMetadataAccentDisplay = $derived(colorDisplay(collectionMetadataAccent, "#FAD587"));
	const collectionMetadataBackgroundDisplay = $derived(colorDisplay(collectionMetadataBackground, "#7E2222"));
	const pediaCloudWriteReady = $derived(Boolean(cloudPediaConfigured && authAccessToken && authUser?.email && canEdit));

	$effect(() => {
		if (allEntries.length && !allEntries.some((entry) => entry.id === selectedEntryId)) {
			selectedEntryId = "";
		}
	});

	$effect(() => {
		const nextEntryId = selectedEntry?.id || "";
		if (nextEntryId === collectionEditorEntryId) {
			if (nextEntryId !== categoryEditorEntryId) {
				categoryEditorEntryId = nextEntryId;
				categoryEditorOpen = false;
				categoryEditorDraft = (selectedEntry?.categories || []).map((category) => normalizeCategoryValue(category)).filter(Boolean);
				categoryEditorInput = "";
				categoryEditorStatus = "";
			}
			return;
		}
		collectionEditorEntryId = nextEntryId;
		collectionEditorOpen = false;
		collectionCreatorOpen = false;
		collectionEditorDraft = selectedEntry?.collections ? [...selectedEntry.collections] : [];
		collectionEditorSelection = "";
		collectionEditorStatus = "";
		newCollectionTitle = "";
		newCollectionId = "";
		newCollectionSourceTemplate = "";
		newCollectionBackground = "";
		newCollectionAccent = "";
		newCollectionAliases = "";
		categoryEditorEntryId = nextEntryId;
		categoryEditorOpen = false;
		categoryEditorDraft = (selectedEntry?.categories || []).map((category) => normalizeCategoryValue(category)).filter(Boolean);
		categoryEditorInput = "";
		categoryEditorStatus = "";
	});

	$effect(() => {
		if (routeState.kind !== "collection" || !selectedCollection) {
			collectionMetadataEditorOpen = false;
			collectionMetadataStatus = "";
			return;
		}
		hydrateCollectionMetadataDraft(selectedCollection);
	});

	$effect(() => {
		if (!cloudPediaConfigured) {
			pediaCloudLoadKey = "";
			return;
		}

		const nextLoadKey = `${authAccessToken || "anon"}:${Boolean(authUser?.email)}`;
		if (pediaCloudLoadKey === nextLoadKey) {
			return;
		}

		pediaCloudLoadKey = nextLoadKey;
		void loadCloudPediaState({ silent: true });
	});

	$effect(() => {
		if (routeState.kind === "collection" && selectedCollection) {
			activeView = "collection";
			selectedEntryId = "";
			authorFilterName = "";
			return;
		}

		if (routeState.kind === "category" && selectedCategory) {
			activeView = "category";
			selectedEntryId = "";
			authorFilterName = "";
			return;
		}

		if (routeState.kind === "entry") {
			const routeEntry = allEntries.find((entry) => slugifyPediaValue(entry?.slug || entry?.title) === routeState.entrySlug);
			if (routeEntry) {
				selectedEntryId = routeEntry.id;
				activeView = "entry";
				authorFilterName = "";
				return;
			}
		}

		activeView = "catalog";
		selectedEntryId = "";
		authorFilterName = routeState.authorSlug ? (authorLookup.get(routeState.authorSlug) ?? "") : "";
	});

	$effect(() => {
		if (!canEdit && activeView === "converter") {
			activeView = "catalog";
		}
	});

	function openEntry(entry, options = {}) {
		if (!entry) {
			return;
		}
		selectedEntryId = entry.id;
		activeView = "entry";
		navigate?.(entryPath(entry), { replace: Boolean(options.replace) });
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	function selectEntry(entryId, options = {}) {
		const entry = allEntries.find((candidate) => candidate.id === entryId);
		if (!entry) {
			return;
		}
		openEntry(entry, options);
	}

	function setConvertedEntry(nextEntry, sourceLabel) {
		convertedEntry = nextEntry ? normalizePediaEntry(nextEntry) : null;
		convertedEntrySource = sourceLabel || "";
		converterIssues = convertedEntry?.issues || [];
	}

	function slugForEntry(entry) {
		return slugifyPediaValue(entry?.slug || entry?.title);
	}

	async function loadCloudPediaState({ silent = false } = {}) {
		if (!cloudPediaConfigured) {
			return;
		}

		try {
			const [entryResult, collections] = await Promise.all([loadPediaEntriesFromCloud(authAccessToken), loadPediaCollectionsFromCloud(authAccessToken)]);
			cloudEntries = sortModdedCivsEntries(entryResult.entries || []);
			cloudDeletedEntryIds = [...new Set(entryResult.deletedEntryIds || [])];
			cloudCollections = [...(collections || [])].sort((left, right) => String(left?.title || "").localeCompare(String(right?.title || "")));
			if (!silent && entryStatus) {
				entryStatus = "Cloud pedia content refreshed.";
			}
		} catch (error) {
			if (!silent) {
				entryStatus = error?.message || "Unable to load pedia data from Supabase.";
			}
		}
	}

	async function saveEntryToLocalProject(entry, wikiMarkup) {
		const response = await fetch("/__local-api/modded-civs-pedia/save", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				slug: slugForEntry(entry),
				entry,
				wikiMarkup,
			}),
		});

		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload?.ok) {
			throw new Error(payload?.message || "Unable to save pedia files.");
		}

		return payload;
	}

	async function saveEntryToProject(entry, wikiMarkup, successMessage) {
		const nextEntry = normalizePediaEntry(entry);

		if (pediaCloudWriteReady) {
			const savedEntry = await savePediaEntryToCloud(authAccessToken, nextEntry, wikiMarkup);
			cloudEntries = sortModdedCivsEntries([...cloudEntries.filter((candidate) => candidate.id !== nextEntry.id && candidate.id !== savedEntry.id), savedEntry]);
			cloudDeletedEntryIds = cloudDeletedEntryIds.filter((id) => id !== savedEntry.id);
			importedEntries = sortModdedCivsEntries([...importedEntries.filter((candidate) => candidate.id !== nextEntry.id && candidate.id !== savedEntry.id), savedEntry]);
			deletedEntryIds = deletedEntryIds.filter((id) => id !== savedEntry.id);
			if (successMessage) {
				entryStatus = successMessage;
			}
			return { ok: true, entry: savedEntry };
		}

		const payload = await saveEntryToLocalProject(nextEntry, wikiMarkup);
		importedEntries = sortModdedCivsEntries([...importedEntries.filter((candidate) => candidate.id !== nextEntry.id), nextEntry]);
		deletedEntryIds = deletedEntryIds.filter((id) => id !== nextEntry.id);
		if (successMessage) {
			entryStatus = successMessage;
		}
		return payload;
	}

	function startEditingEntry(entry) {
		if (!entry) {
			return;
		}
		entryEditorOpen = true;
		entryStatus = "";
		entryEditorDraft = `${JSON.stringify(entry, null, 2)}\n`;
	}

	function stopEditingEntry() {
		entryEditorOpen = false;
		entryEditorDraft = "";
		entryStatus = "";
	}

	function parseEntryEditorDraft() {
		return normalizePediaEntry(JSON.parse(entryEditorDraft || "{}"));
	}

	function previewEditedEntry() {
		try {
			const nextEntry = parseEntryEditorDraft();
			importedEntries = sortModdedCivsEntries([...importedEntries.filter((entry) => entry.id !== selectedEntry.id && entry.id !== nextEntry.id), nextEntry]);
			deletedEntryIds = deletedEntryIds.filter((id) => id !== nextEntry.id);
			entryStatus = `Previewing edits for ${nextEntry.title}.`;
			openEntry(nextEntry, { replace: true });
			entryEditorDraft = `${JSON.stringify(nextEntry, null, 2)}\n`;
		} catch (error) {
			entryStatus = error?.message || "Unable to parse entry JSON.";
		}
	}

	async function saveEditedEntryToProject() {
		try {
			const nextEntry = parseEntryEditorDraft();
			entryStatus = "Saving edited entry...";
			await saveEntryToProject(nextEntry, renderWikiMarkupFromEntry(nextEntry), `${nextEntry.title} saved to project data.`);
			openEntry(nextEntry, { replace: true });
			entryEditorDraft = `${JSON.stringify(nextEntry, null, 2)}\n`;
		} catch (error) {
			entryStatus = error?.message || "Unable to save entry.";
		}
	}

	function previewCollectionMemberships(nextCollections) {
		if (!selectedEntry) {
			return;
		}
		const nextEntry = normalizePediaEntry({
			...selectedEntry,
			collections: nextCollections,
		});
		importedEntries = sortModdedCivsEntries([...importedEntries.filter((entry) => entry.id !== nextEntry.id), nextEntry]);
		collectionEditorDraft = [...nextEntry.collections];
		collectionEditorStatus = `Previewing collection memberships for ${nextEntry.title}. Save to persist.`;
	}

	function addCollectionToDraft() {
		const nextId = String(collectionEditorSelection || "").trim();
		if (!nextId) {
			return;
		}
		const nextCollection = knownCollections.find((collection) => collection.id === nextId);
		if (!nextCollection) {
			return;
		}
		previewCollectionMemberships([...collectionEditorDraft, nextCollection]);
		collectionEditorSelection = "";
	}

	function removeCollectionFromDraft(collectionId) {
		const nextCollections = collectionEditorDraft.filter((collection) => collection?.id !== collectionId);
		previewCollectionMemberships(nextCollections);
	}

	async function saveCollectionMemberships() {
		if (!selectedEntry) {
			return;
		}
		try {
			const nextEntry = normalizePediaEntry({
				...selectedEntry,
				collections: collectionEditorDraft,
			});
			collectionEditorStatus = "Saving collection memberships...";
			await saveEntryToProject(nextEntry, renderWikiMarkupFromEntry(nextEntry), "");
			collectionEditorStatus = `${nextEntry.title} collection memberships saved.`;
		} catch (error) {
			collectionEditorStatus = error?.message || "Unable to save collection memberships.";
		}
	}

	function toggleCollectionEditor() {
		collectionEditorOpen = !collectionEditorOpen;
		if (!collectionEditorOpen) {
			collectionCreatorOpen = false;
			collectionEditorSelection = "";
			collectionEditorStatus = "";
		}
	}

	function previewCategoryAssignments(nextCategories) {
		if (!selectedEntry) {
			return;
		}
		const nextEntry = normalizePediaEntry({
			...selectedEntry,
			categories: nextCategories,
		});
		importedEntries = sortModdedCivsEntries([...importedEntries.filter((entry) => entry.id !== nextEntry.id), nextEntry]);
		categoryEditorDraft = [...nextEntry.categories];
		categoryEditorStatus = `Previewing category assignments for ${nextEntry.title}. Save to persist.`;
	}

	function addCategoryToDraft() {
		const nextCategory = normalizeCategoryValue(categoryEditorInput);
		if (!nextCategory) {
			return;
		}
		if (categoryEditorDraft.some((category) => normalizeSearch(category) === normalizeSearch(nextCategory))) {
			categoryEditorStatus = `${nextCategory} is already attached to this entry.`;
			categoryEditorInput = "";
			return;
		}
		previewCategoryAssignments([...categoryEditorDraft, nextCategory]);
		categoryEditorInput = "";
	}

	function removeCategoryFromDraft(categoryTitle) {
		const nextCategories = categoryEditorDraft.filter((category) => normalizeSearch(category) !== normalizeSearch(categoryTitle));
		previewCategoryAssignments(nextCategories);
	}

	async function saveCategoryAssignments() {
		if (!selectedEntry) {
			return;
		}
		try {
			const nextEntry = normalizePediaEntry({
				...selectedEntry,
				categories: categoryEditorDraft,
			});
			categoryEditorStatus = "Saving categories...";
			await saveEntryToProject(nextEntry, renderWikiMarkupFromEntry(nextEntry), "");
			categoryEditorStatus = `${nextEntry.title} categories saved.`;
		} catch (error) {
			categoryEditorStatus = error?.message || "Unable to save categories.";
		}
	}

	function toggleCategoryEditor() {
		categoryEditorOpen = !categoryEditorOpen;
		if (!categoryEditorOpen) {
			categoryEditorInput = "";
			categoryEditorStatus = "";
		}
	}

	function toggleCollectionCreator() {
		collectionCreatorOpen = !collectionCreatorOpen;
		if (!collectionCreatorOpen) {
			newCollectionTitle = "";
			newCollectionId = "";
			newCollectionSourceTemplate = "";
			newCollectionBackground = "";
			newCollectionAccent = "";
			newCollectionAliases = "";
		}
	}

	function toggleCollectionMetadataEditor() {
		collectionMetadataEditorOpen = !collectionMetadataEditorOpen;
		if (!collectionMetadataEditorOpen) {
			collectionMetadataStatus = "";
			if (selectedCollection) {
				hydrateCollectionMetadataDraft(selectedCollection);
			}
		}
	}

	async function saveCollectionToLocalProject(collection, options = {}) {
		const response = await fetch("/__local-api/modded-civs-pedia/collections/save", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				collection,
				updateExisting: Boolean(options.updateExisting),
				previousId: String(options.previousId || "").trim(),
			}),
		});
		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload?.ok) {
			throw new Error(payload?.message || "Unable to save collection.");
		}
		return payload;
	}

	async function deleteCollectionFromLocalProject(collectionId) {
		const response = await fetch("/__local-api/modded-civs-pedia/collections/delete", {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id: collectionId,
			}),
		});
		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload?.ok) {
			throw new Error(payload?.message || "Unable to delete collection.");
		}
		return payload;
	}

	async function saveCollectionMetadata() {
		const title = String(collectionMetadataTitle || "").trim();
		const id = slugifyPediaValue(collectionMetadataId || title);
		const background = String(collectionMetadataBackground || "").trim();
		const accent = String(collectionMetadataAccent || "").trim();
		const aliases = [
			title,
			...String(collectionMetadataAliases || "")
				.split(/\n|,/)
				.map((item) => String(item || "").trim())
				.filter(Boolean),
		].filter((value, index, array) => array.indexOf(value) === index);
		const links = String(collectionMetadataLinks || "")
			.split("\n")
			.map((line) => String(line || "").trim())
			.filter(Boolean)
			.map((line) => {
				const [label, href] = line.split("|").map((part) => String(part || "").trim());
				return {
					label,
					href,
				};
			})
			.filter((link) => link.label && link.href);

		if (!selectedCollection) {
			collectionMetadataStatus = "No collection is selected.";
			return;
		}
		if (!title) {
			collectionMetadataStatus = "Collection title is required.";
			return;
		}
		if (!id) {
			collectionMetadataStatus = "Collection id is required.";
			return;
		}
		if (!isValidHexColor(background) || !isValidHexColor(accent)) {
			collectionMetadataStatus = "Collection background and accent colors must be valid hex values.";
			return;
		}

		const collection = {
			id,
			title,
			sourceTemplate: String(collectionMetadataSourceTemplate || "").trim(),
			blurb: String(collectionMetadataBlurb || "").trim(),
			imageURL: String(collectionMetadataImageURL || "").trim(),
			links,
			aliases,
			colors: {
				background,
				accent,
			},
		};

		try {
			collectionMetadataStatus = "Saving collection...";
			const savedCollection = pediaCloudWriteReady
				? await savePediaCollectionToCloud(authAccessToken, collection, { previousId: selectedCollection.id })
				: (await saveCollectionToLocalProject(collection, { updateExisting: true, previousId: selectedCollection.id })) && collection;
			customCollections = [...customCollections.filter((item) => item?.id !== selectedCollection.id && item?.id !== collection.id), savedCollection];
			if (pediaCloudWriteReady) {
				cloudCollections = [...cloudCollections.filter((item) => item?.id !== selectedCollection.id && item?.id !== savedCollection.id), savedCollection].sort((left, right) =>
					String(left?.title || "").localeCompare(String(right?.title || "")),
				);
			}
			collectionMetadataStatus = `${savedCollection.title} saved.`;
			if (collection.id !== selectedCollection.id) {
				navigate?.(collectionPath(savedCollection), { replace: true });
			}
		} catch (error) {
			collectionMetadataStatus = error?.message || "Unable to save collection.";
		}
	}

	async function deleteSelectedCollection() {
		if (!selectedCollection) {
			return;
		}

		const affectedEntries = [...selectedCollection.entries];
		const memberCountLabel = affectedEntries.length === 1 ? "1 entry" : `${affectedEntries.length} entries`;
		if (typeof window !== "undefined" && !window.confirm(`Delete ${selectedCollection.title} and remove it from ${memberCountLabel}?`)) {
			return;
		}

		collectionMetadataStatus = "Removing collection from entries...";

		try {
			for (const entry of affectedEntries) {
				const nextCollections = entryCollections(entry).filter((collection) => collection?.id !== selectedCollection.id);
				const nextEntry = normalizePediaEntry({
					...entry,
					collections: nextCollections,
				});
				await saveEntryToProject(nextEntry, renderWikiMarkupFromEntry(nextEntry), "");
			}

			if (pediaCloudWriteReady) {
				await deletePediaCollectionFromCloud(authAccessToken, selectedCollection.id);
				cloudCollections = cloudCollections.filter((collection) => collection?.id !== selectedCollection.id);
			} else {
				await deleteCollectionFromLocalProject(selectedCollection.id);
			}

			customCollections = customCollections.filter((collection) => collection?.id !== selectedCollection.id);
			collectionMetadataEditorOpen = false;
			collectionMetadataStatus = `${selectedCollection.title} deleted.`;
			showCatalog();
		} catch (error) {
			collectionMetadataStatus = error?.message || "Unable to delete collection.";
		}
	}

	async function createCollectionDefinition() {
		const title = String(newCollectionTitle || "").trim();
		const id = slugifyPediaValue(newCollectionId || title);
		const background = String(newCollectionBackground || "").trim();
		const accent = String(newCollectionAccent || "").trim();
		const aliases = [
			title,
			...String(newCollectionAliases || "")
				.split(/\n|,/)
				.map((item) => String(item || "").trim())
				.filter(Boolean),
		].filter((value, index, array) => array.indexOf(value) === index);

		if (!title) {
			collectionEditorStatus = "Collection title is required.";
			return;
		}
		if (!id) {
			collectionEditorStatus = "Collection id is required.";
			return;
		}
		if (!isValidHexColor(background) || !isValidHexColor(accent)) {
			collectionEditorStatus = "Collection background and accent colors must be valid hex values.";
			return;
		}

		const collection = {
			id,
			title,
			sourceTemplate: String(newCollectionSourceTemplate || "").trim(),
			aliases,
			colors: {
				background,
				accent,
			},
		};

		try {
			collectionEditorStatus = "Saving new collection...";
			const savedCollection = pediaCloudWriteReady ? await savePediaCollectionToCloud(authAccessToken, collection) : (await saveCollectionToLocalProject(collection)) && collection;
			customCollections = [...customCollections.filter((item) => item?.id !== savedCollection.id), savedCollection];
			if (pediaCloudWriteReady) {
				cloudCollections = [...cloudCollections.filter((item) => item?.id !== savedCollection.id), savedCollection].sort((left, right) =>
					String(left?.title || "").localeCompare(String(right?.title || "")),
				);
			}
			previewCollectionMemberships([...collectionEditorDraft, savedCollection]);
			collectionEditorStatus = `${savedCollection.title} created and added to this entry draft. Save memberships to persist it on this civ.`;
			collectionCreatorOpen = false;
			newCollectionTitle = "";
			newCollectionId = "";
			newCollectionSourceTemplate = "";
			newCollectionBackground = "";
			newCollectionAccent = "";
			newCollectionAliases = "";
		} catch (error) {
			collectionEditorStatus = error?.message || "Unable to save collection.";
		}
	}

	async function deleteSelectedEntry() {
		if (!selectedEntry) {
			return;
		}
		if (typeof window !== "undefined" && !window.confirm(`Delete ${selectedEntry.title} from src/lib/data/modded-civs-pedia?`)) {
			return;
		}

		entryStatus = "Deleting entry...";

		try {
			if (pediaCloudWriteReady) {
				const payload = await markPediaEntryDeletedInCloud(authAccessToken, selectedEntry);
				cloudDeletedEntryIds = [...new Set([...cloudDeletedEntryIds, payload.id])];
				cloudEntries = cloudEntries.filter((entry) => entry.id !== payload.id);
			} else {
				const response = await fetch("/__local-api/modded-civs-pedia/delete", {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						slug: slugForEntry(selectedEntry),
					}),
				});

				const payload = await response.json().catch(() => ({}));
				if (!response.ok || !payload?.ok) {
					throw new Error(payload?.message || "Unable to delete pedia files.");
				}
			}

			deletedEntryIds = [...new Set([...deletedEntryIds, selectedEntry.id])];
			importedEntries = importedEntries.filter((entry) => entry.id !== selectedEntry.id);
			stopEditingEntry();
			showCatalog();
			entryStatus = pediaCloudWriteReady ? `${selectedEntry.title} deleted from shared pedia data.` : `${selectedEntry.title} deleted from project data.`;
		} catch (error) {
			entryStatus = error?.message || "Unable to delete entry.";
		}
	}

	async function convertWikiMarkup() {
		converterBusy = true;
		converterStatus = "Converting fandom markup...";
		try {
			const nextEntry = await createPediaEntryFromWikiMarkup(wikiMarkupInput);
			setConvertedEntry(nextEntry, "Wiki markup");
			converterStatus = nextEntry?.title ? `Converted ${nextEntry.title} from fandom markup.` : "Wiki conversion finished with warnings.";
		} finally {
			converterBusy = false;
		}
	}

	async function handleFolderChange(event) {
		const files = event.currentTarget?.files;
		if (!files?.length) {
			return;
		}
		converterBusy = true;
		converterStatus = "Scanning mod folder...";
		try {
			const nextEntry = await createPediaEntryFromModFolderFiles(files);
			setConvertedEntry(nextEntry, "Mod folder");
			converterStatus = nextEntry?.title ? `Built ${nextEntry.title} from folder contents.` : "Folder conversion finished with warnings.";
		} finally {
			converterBusy = false;
		}
	}

	function triggerFolderImport() {
		folderInputEl?.click();
	}

	async function handleJsonImportChange(event) {
		const file = event.currentTarget?.files?.[0];
		if (!file) {
			return;
		}

		converterBusy = true;
		converterStatus = "Reading pedia JSON...";
		try {
			const rawText = await file.text();
			const payload = JSON.parse(rawText || "{}");
			const nextEntry = normalizePediaEntry(payload);
			if (!nextEntry?.id || !nextEntry?.title) {
				throw new Error("The imported JSON is missing required pedia entry fields.");
			}
			setConvertedEntry(nextEntry, "JSON import");
			converterStatus = `Loaded ${nextEntry.title} from JSON.`;
		} catch (error) {
			converterStatus = error?.message || "Unable to read that JSON file.";
		} finally {
			event.currentTarget.value = "";
			converterBusy = false;
		}
	}

	function triggerJsonImport() {
		jsonInputEl?.click();
	}

	async function saveConvertedEntryToProject() {
		if (!convertedEntry) {
			return;
		}

		converterBusy = true;
		converterStatus = "Saving entry files into src/lib/data/modded-civs-pedia...";

		try {
			await saveEntryToProject(convertedEntry, convertedWikiText, "");
			openEntry(convertedEntry, { replace: true });
			converterStatus = pediaCloudWriteReady
				? `${convertedEntry.title} saved to shared pedia data and added to the live catalog.`
				: `${convertedEntry.title} saved to project data and added to the local pedia catalog.`;
		} catch (error) {
			converterStatus = error?.message || "Unable to save pedia files.";
			return;
		} finally {
			converterBusy = false;
		}
	}

	function downloadTextFile(name, content, type) {
		if (typeof document === "undefined" || !content) {
			return;
		}
		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = name;
		link.click();
		URL.revokeObjectURL(url);
	}

	function downloadConvertedJson() {
		if (!convertedEntry) {
			return;
		}
		downloadTextFile(`${slugifyPediaValue(convertedEntry.slug || convertedEntry.title)}.json`, convertedJsonText, "application/json");
	}

	function downloadConvertedWiki() {
		if (!convertedEntry) {
			return;
		}
		downloadTextFile(`${slugifyPediaValue(convertedEntry.slug || convertedEntry.title)}.wiki.txt`, convertedWikiText, "text/plain");
	}

	function supportFlags(entry) {
		return Object.entries(entry?.modSupport || {})
			.filter(([, value]) => value)
			.map(([key]) => MOD_SUPPORT_LABELS[key] || key);
	}

	function hasWorkingImage(url) {
		return Boolean(url) && !failedImageUrls.includes(url);
	}

	function markImageFailed(url) {
		if (!url || failedImageUrls.includes(url)) {
			return;
		}
		failedImageUrls = [...failedImageUrls, url];
	}

	function sourceLinks(entry) {
		return [entry?.source?.wikiUrl ? { label: "Fandom Page", href: entry.source.wikiUrl } : null, entry?.source?.workshopUrl ? { label: "Workshop", href: entry.source.workshopUrl } : null].filter(
			Boolean,
		);
	}

	function entryMediaSlots(entry) {
		const slots = [
			{
				id: "map",
				label: "Map",
				file: entry?.presentation?.mapImage,
				url: entry?.presentation?.mapImageUrl,
				copy: entry?.presentation?.mapImageCaption || "Map image pending.",
			},
			{
				id: "leader",
				label: "Dawn of Man",
				file: entry?.presentation?.leaderSceneImage,
				url: entry?.presentation?.leaderSceneImageUrl,
				copy: entry?.presentation?.leaderSceneArtCredit || "Leader scene pending.",
			},
			{
				id: "icon",
				label: "Icon",
				file: entry?.presentation?.iconImage,
				url: entry?.presentation?.iconImageUrl,
				copy: entry?.presentation?.iconImage ? "Civilization icon asset." : "Icon asset pending.",
			},
		];
		return slots.filter((slot) => slot.file || slot.url);
	}

	function mediaCardClass(slotCount) {
		return slotCount === 1 ? "pedia-media-rail is-single" : "pedia-media-rail";
	}

	function showCatalog() {
		stopEditingEntry();
		activeView = "catalog";
		selectedEntryId = "";
		authorFilterName = "";
		navigate?.(PEDIA_BASE_PATH);
	}

	function showConverter() {
		if (!canEdit) {
			return;
		}
		stopEditingEntry();
		activeView = "converter";
		selectedEntryId = "";
		navigate?.(PEDIA_BASE_PATH);
	}

	function clearAuthorFilter() {
		authorFilterName = "";
		selectedEntryId = "";
		activeView = "catalog";
		searchQuery = "";
		navigate?.(PEDIA_BASE_PATH);
	}

	function filterCatalogByAuthor(name) {
		const nextAuthor = String(name || "").trim();
		if (!nextAuthor) {
			return;
		}
		stopEditingEntry();
		authorFilterName = nextAuthor;
		searchQuery = "";
		activeView = "catalog";
		selectedEntryId = "";
		navigate?.(authorPath(nextAuthor));
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	function entryDisplaySummary(entry) {
		return sanitizePediaProse(entry?.summary) || sanitizePediaProse(entry?.overview?.civilization?.body) || "No summary yet.";
	}

	function entryInitials(entry) {
		const source = `${entry?.title || ""}`.trim();
		if (!source) {
			return "MC";
		}
		const words = source.split(/\s+/).filter(Boolean);
		return words
			.slice(0, 2)
			.map((word) => word[0])
			.join("")
			.toUpperCase();
	}

	function entryReligionLabel(entry) {
		return entry?.identity?.religion?.join(", ") || "Unknown";
	}

	function entryReligionValues(entry) {
		const values = Array.isArray(entry?.identity?.religion) ? entry.identity.religion.map((item) => String(item || "").trim()).filter(Boolean) : [];
		return values.length ? values : ["Unknown"];
	}

	function infoboxRows(entry) {
		return [
			{ label: "Leader", value: entry?.leader || "Unknown" },
			{ label: "Capital", value: entry?.identity?.capital || "Unknown" },
			{ label: "Empire", value: entry?.identity?.empireName || "Unknown" },
			{ label: "Adjective", value: entry?.identity?.adjectives || "Unknown" },
			{ label: "Bias", value: entry?.identity?.bias || "Unknown" },
			{ label: "Religion", value: entryReligionLabel(entry), values: entryReligionValues(entry) },
			{ label: "Government", value: entry?.identity?.government || "Unknown" },
			{ label: "Culture", value: entry?.identity?.culture || "Unknown" },
		];
	}

	function uniqueFootnoteLines(value) {
		return String(value || "")
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
	}

	function youtubeEmbedUrl(value) {
		const source = String(value || "").trim();
		if (!source) {
			return "";
		}
		try {
			const url = new URL(source);
			if (url.hostname.includes("youtu.be")) {
				const id = url.pathname.replace(/^\/+/, "");
				return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
			}
			if (url.hostname.includes("youtube.com")) {
				if (url.pathname.startsWith("/embed/")) {
					return `https://www.youtube-nocookie.com${url.pathname}`;
				}
				const id = url.searchParams.get("v");
				return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
			}
		} catch {}
		return "";
	}

	function youtubeVideoId(value) {
		const source = String(value || "").trim();
		if (!source) {
			return "";
		}
		try {
			const url = new URL(source);
			if (url.hostname.includes("youtu.be")) {
				return url.pathname.replace(/^\/+/, "");
			}
			if (url.hostname.includes("youtube.com")) {
				if (url.pathname.startsWith("/embed/")) {
					return url.pathname.split("/").filter(Boolean).at(-1) || "";
				}
				return url.searchParams.get("v") || "";
			}
		} catch {}
		return "";
	}

	function entryMusicEmbedUrl(entry, variant) {
		return youtubeEmbedUrl(entry?.music?.[variant]?.url);
	}

	function entryMusicThumbnailUrl(entry, variant) {
		const videoId = youtubeVideoId(entry?.music?.[variant]?.url);
		return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
	}

	function musicPreviewKey(entry, variant) {
		return `${entry?.id || "entry"}:${variant}`;
	}

	function infoboxRowTemplateRefs(entry, row) {
		if (!row?.value) {
			return entryTemplateRefs(entry);
		}
		const lower = String(row.value).toLowerCase();
		const matches = entryTemplateRefs(entry).filter((ref) => lower.includes(String(ref?.label || "").toLowerCase()));
		return matches.length ? matches : entryTemplateRefs(entry);
	}

	function supportMatrix(entry) {
		const keys = [...new Set([...Object.keys(MOD_SUPPORT_LABELS), ...Object.keys(entry?.modSupport || {})])];
		return keys.map((key) => ({
			key,
			label: MOD_SUPPORT_LABELS[key] || key,
			value: Boolean(entry?.modSupport?.[key]),
		}));
	}
</script>

<section class="pedia-page stack">
	<header class="hero pedia-hero">
		<div class="stack half">
			<p class="eyebrow">Civ Mod Pedia</p>
			<h1>Browse modded civilizations</h1>
			<p>Search a curated list of civs, gameplay mods, and convert your mod folders to add more civs to the catalog.</p>
		</div>
	</header>

	<section class="pedia-main">
		{#if activeView === "catalog"}
			<div class="pedia-toolbar">
				<div class="stack half">
					<p class="eyebrow">Catalog</p>
					<h2 class="section-title">Modded Civ Entries</h2>
					<p class="section-copy">{filteredEntries.length} visible of {allEntries.length} total entries.</p>
					{#if authorFilterName}
						<div class="pedia-link-row inline half flex-wrap">
							<button type="button" class="pedia-button pedia-button-secondary" onclick={clearAuthorFilter}>Main author: {authorFilterName || "Unknown"} · Clear</button>
						</div>
					{/if}
				</div>

				<div class="pedia-toolbar-actions">
					<input class="pedia-search" type="search" bind:value={searchQuery} placeholder="Search civs, leaders, uniques, authors..." />
					{#if canEdit}
						<div class="pedia-view-switch" role="tablist" aria-label="Pedia views">
							<button type="button" class="pedia-view-chip is-active" role="tab" aria-selected="true">Catalog</button>
							<button type="button" class="pedia-view-chip" role="tab" aria-selected="false" onclick={showConverter}>Converter</button>
						</div>
					{/if}
				</div>
			</div>

			<section class="pedia-catalog-shell stack overflow-hidden" aria-label="Modded civ catalog">
				{#if allCollections.length}
					<details class="pedia-catalog-accordion">
						<summary class="pedia-catalog-accordion-summary">
							<div class="pedia-catalog-group-head">
								<div class="stack quarter">
									<p class="eyebrow">Collections</p>
									<h3 class="section-title">Browse Events and Packs</h3>
								</div>
								<p class="card-copy text-lg text-nowrap">{allCollections.length} collection{allCollections.length === 1 ? "" : "s"}</p>
							</div>
						</summary>

						<section class="pedia-catalog-collections stack half" aria-label="Browse collections">
							<div class="pedia-collection-grid pedia-collection-grid-catalog">
								{#each allCollections as collection (collection.id)}
									<a
										class="pedia-collection-card pedia-collection-card-catalog"
										href={collectionPath(collection)}
										style={collectionCardStyle(collection)}
										onclick={(event) => handleRouteAnchorClick(event, collectionPath(collection))}
									>
										<p class="eyebrow">Collection</p>
										<strong class="card-title">{collection.title}</strong>
										<!-- <p class="card-copy">{collection.entries.length} member{collection.entries.length === 1 ? "" : "s"}</p> -->
									</a>
								{/each}
							</div>
						</section>
					</details>
				{/if}

				{#if allCategories.length}
					<details class="pedia-catalog-accordion">
						<summary class="pedia-catalog-accordion-summary">
							<div class="pedia-catalog-group-head">
								<div class="stack quarter">
									<p class="eyebrow">Categories</p>
									<h3 class="section-title">Browse Tags and Themes</h3>
								</div>
								<p class="card-copy text-lg text-nowrap">{allCategories.length} categor{allCategories.length === 1 ? "y" : "ies"}</p>
							</div>
						</summary>

						<section class="pedia-catalog-categories stack half" aria-label="Browse categories">
							<div class="pedia-category-cloud">
								{#each allCategories as category (category.id)}
									<a class="pedia-category-chip" href={categoryPath(category)} onclick={(event) => handleRouteAnchorClick(event, categoryPath(category))}>
										<span>{category.title}</span>
										<strong>{category.entries.length}</strong>
									</a>
								{/each}
							</div>
						</section>
					</details>
				{/if}

				{#if groupedCatalogEntries.length > 1}
					<section class="pedia-catalog-authors stack half" aria-label="Browse authors">
						<div class="pedia-catalog-group-head">
							<div class="stack quarter">
								<p class="eyebrow">Authors</p>
								<h3 class="section-title">Scroll to Author</h3>
							</div>
							<p class="card-copy text-lg text-nowrap">{groupedCatalogEntries.length} author{groupedCatalogEntries.length === 1 ? "" : "s"}</p>
						</div>

						<div class="pedia-author-toc-grid">
							{#each groupedCatalogEntries as group (group.author)}
								<button type="button" class="pedia-author-toc-chip" style={creditCardStyle(group.author)} onclick={() => scrollToAuthorGroup(group.author)}>
									<strong class="card-title">{group.author}</strong>
								</button>
							{/each}
						</div>
					</section>
				{/if}

				<div class="pedia-catalog-groups stack overflow" role="list">
					{#each groupedCatalogEntries as group (group.author)}
						{@const overview = buildAuthorOverview(group.author, group.entries)}
						<section class="pedia-catalog-group stack" id={authorHeadingId(group.author)} aria-label={`Civs by ${group.author}`}>
							<article class="pedia-author-overview stack" style={creditCardStyle(group.author)}>
								<div class="inline between flex-wrap half align-start">
									<div class="stack quarter">
										<h3 class="section-title">{group.author}</h3>
										<p class="card-copy">{overview.blurb}</p>
									</div>
								</div>

								<!-- {#if overview.collections.length}
									<div class="stack quarter">
										<p class="eyebrow">Collections</p>
										<div class="pedia-category-cloud">
											{#each overview.collections as collection (collection.id)}
												{@const collectionTarget = authorCollectionTarget(collection)}
												{#if collectionTarget}
													<button type="button" class="pedia-category-chip" onclick={() => navigate?.(collectionPath(collectionTarget))}>
														<span>{collection.title}</span>
														<strong>{collectionEntryCount(collectionTarget)}</strong>
													</button>
												{:else}
													<span class="pedia-category-chip is-static">
														<span>{collection.title}</span>
													</span>
												{/if}
											{/each}
										</div>
									</div>
								{/if}

								{#if overview.categories.length}
									<div class="stack quarter">
										<p class="eyebrow">Themes</p>
										<div class="pedia-category-cloud">
											{#each overview.categories as category (category.id)}
												{@const categoryTarget = authorCategoryTarget(category)}
												{#if categoryTarget}
													<button type="button" class="pedia-category-chip" onclick={() => navigate?.(categoryPath(categoryTarget))}>
														<span>{category.title}</span>
														<strong>{categoryTarget.entries.length}</strong>
													</button>
												{:else}
													<span class="pedia-category-chip is-static">
														<span>{category.title}</span>
													</span>
												{/if}
											{/each}
										</div>
									</div>
								{/if} -->

								{#if overview.links.length}
									<div class="pedia-link-row inline half flex-wrap">
										{#each overview.links as link (`${group.author}-${link.href}`)}
											<a class="pedia-button pedia-button-secondary" href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
										{/each}
									</div>
								{/if}

								<details class="pedia-author-civs-accordion" id={authorAccordionId(group.author)}>
									<summary class="pedia-author-civs-summary">
										<div class="inline between flex-wrap half align-center">
											<strong class="card-title">Browse {group.author}'s Civs</strong>
											<span class="card-copy">{group.entries.length} mod{group.entries.length === 1 ? "" : "s"}</span>
										</div>
									</summary>

									<div class="pedia-catalog-entry-list stack margin-block-start-half" role="list">
										{#each group.entries as entry (entry.id)}
											{@const collections = entryCollections(entry)}
											<div role="listitem">
												<a
													class="pedia-catalog-row"
													href={entryPath(entry)}
													style={catalogRowStyle(entry)}
													onclick={(event) => handleRouteAnchorClick(event, entryPath(entry))}
												>
													{#if collections.length}
														<div class="pedia-catalog-row-meta">
															<div class="pedia-catalog-collection-pills">
																{#each collections as collection (`${entry.id}-${collection.id}-row`)}
																	<span class="pedia-catalog-collection-pill" style={entryCollectionPillStyle(collection)}>{collection.title}</span>
																{/each}
															</div>
														</div>
													{/if}
													<div class="pedia-catalog-row-main">
														<div class="pedia-catalog-icon-wrap">
															<div class="pedia-catalog-icon">
																{#if hasWorkingImage(entry.presentation?.iconImageUrl)}
																	<img
																		src={entry.presentation.iconImageUrl}
																		alt={`${entry.title} icon`}
																		loading="lazy"
																		referrerpolicy="no-referrer"
																		onerror={() => markImageFailed(entry.presentation.iconImageUrl)}
																	/>
																{:else}
																	<span>{entryInitials(entry)}</span>
																{/if}
															</div>
														</div>

														<div class="pedia-catalog-identity fit-content stack quarter">
															<div class="stack quarter">
																<p class="eyebrow">Civilization</p>
																<h3 class="pedia-catalog-civ-title">{entry.title}</h3>
															</div>
															<div class="pedia-catalog-meta inline half flex-wrap">
																<span class="text-lg"><strong>Leader</strong> <span class="leader-name">{entry.leader || "Unknown"}</span></span>
																{#if entry.capital}
																	<span><strong>Capital</strong> {entry.capital}</span>
																{/if}
															</div>
														</div>
													</div>

													<div class="pedia-catalog-row-details">
														<article class="pedia-catalog-detail-card stack quarter">
															<p class="eyebrow">Unique Ability</p>
															<strong class="nowrap">{catalogComponent(entry, 0)}</strong>
															<!-- {#if catalogUnique(entry, 0)?.body}
																<PediaInlineText
																	as="p"
																	className="card-copy"
																	text={catalogUnique(entry, 0).body}
																	templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 0)?.templateRefs || [])}
																/>
															{:else if catalogUnique(entry, 0)?.bullets?.length}
																<ul class="pedia-catalog-bullet-list">
																	{#each catalogUnique(entry, 0).bullets as bullet (`${entry.id}-0-${bullet}`)}
																		<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 0)?.templateRefs || [])} /></li>
																	{/each}
																</ul>
															{/if} -->
														</article>
														<article class="pedia-catalog-detail-card stack quarter">
															<p class="eyebrow">{catalogComponentTypeLabel(entry, 1)}</p>
															<strong class="nowrap">{catalogComponent(entry, 1)}</strong>
															<!-- {#if catalogUnique(entry, 1)?.body}
																<PediaInlineText
																	as="p"
																	className="card-copy"
																	text={catalogUnique(entry, 1).body}
																	templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 1)?.templateRefs || [])}
																/>
															{:else if catalogUnique(entry, 1)?.bullets?.length}
																<ul class="pedia-catalog-bullet-list">
																	{#each catalogUnique(entry, 1).bullets as bullet (`${entry.id}-1-${bullet}`)}
																		<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 1)?.templateRefs || [])} /></li>
																	{/each}
																</ul>
															{/if} -->
														</article>
														<article class="pedia-catalog-detail-card stack quarter">
															<p class="eyebrow">{catalogComponentTypeLabel(entry, 2)}</p>
															<strong class="nowrap">{catalogComponent(entry, 2)}</strong>
															<!-- {#if catalogUnique(entry, 2)?.body}
																<PediaInlineText
																	as="p"
																	className="card-copy"
																	text={catalogUnique(entry, 2).body}
																	templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 2)?.templateRefs || [])}
																/>
															{:else if catalogUnique(entry, 2)?.bullets?.length}
																<ul class="pedia-catalog-bullet-list">
																	{#each catalogUnique(entry, 2).bullets as bullet (`${entry.id}-2-${bullet}`)}
																		<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 2)?.templateRefs || [])} /></li>
																	{/each}
																</ul>
															{/if} -->
														</article>
														<!-- <article class="pedia-catalog-detail-card pedia-catalog-notes-card stack quarter">
															<p class="eyebrow">summary</p>
															<PediaInlineText as="p" className="card-copy" text={entry.summary} templateRefs={entryTemplateRefs(entry)} />
														</article>
														{#if entry.notes}
															<article class="pedia-catalog-detail-card pedia-catalog-notes-card stack quarter">
																<p class="eyebrow">Notes</p>
																<p class="card-copy">{entry.notes}</p>
															</article>
														{/if} -->
													</div>
												</a>
											</div>
										{/each}
									</div>
								</details>
							</article>
						</section>
					{/each}
				</div>
			</section>
		{:else if activeView === "converter"}
			<div class="pedia-toolbar">
				<div class="stack half">
					<p class="eyebrow">Converter</p>
					<h2 class="section-title">Build Pedia Entries</h2>
					<p class="section-copy">Convert fandom markup or scan a mod folder, then save the entry into the database.</p>
				</div>

				<div class="pedia-toolbar-actions">
					<div class="pedia-view-switch" role="tablist" aria-label="Pedia views">
						<button type="button" class="pedia-view-chip" role="tab" aria-selected="false" onclick={showCatalog}>Catalog</button>
						<button type="button" class="pedia-view-chip is-active" role="tab" aria-selected="true">Converter</button>
					</div>
				</div>
			</div>

			<section class="pedia-converter-shell">
				<div class="pedia-converter-grid">
					<section class="pedia-converter-panel pedia-converter-panel-source stack">
						<div class="pedia-section-head">
							<div class="stack half">
								<p class="eyebrow">Source</p>
								<h3 class="section-title">Fandom Wiki Markup</h3>
								<p class="section-copy">Paste a full fandom wiki page block here to generate both site JSON and regenerated wiki output.</p>
							</div>
							<div class="inline margin-block-start-half">
								<button type="button" class="pedia-button" onclick={convertWikiMarkup}>Convert Wiki Markup</button>
							</div>
						</div>

						<textarea
							class="pedia-markup-input"
							bind:value={wikiMarkupInput}
							rows="18"
							placeholder="Paste fandom wiki markup here. The converter will build site JSON and a regenerated fandom wiki block."
						></textarea>
					</section>

					<section class="pedia-converter-panel pedia-converter-panel-side stack">
						<div class="pedia-converter-side-card stack">
							<p class="eyebrow">File Import</p>
							<h3 class="section-title">Scan Mod Folder or Import JSON</h3>
							<p class="section-copy">Upload a mod folder or JSON file to auto-fill a pedia entry.</p>
							<div class="inline">
								<button type="button" class="pedia-button pedia-button-secondary" onclick={triggerFolderImport} disabled={converterBusy}>Import Mod Folder</button>
								<button type="button" class="pedia-button pedia-button-secondary" onclick={triggerJsonImport} disabled={converterBusy}>Import JSON</button>
								<input bind:this={folderInputEl} class="pedia-hidden-input" type="file" webkitdirectory multiple onchange={handleFolderChange} />
								<input bind:this={jsonInputEl} class="pedia-hidden-input" type="file" accept="application/json,.json" onchange={handleJsonImportChange} />
							</div>
						</div>

						<div class="pedia-converter-side-card stack half">
							<p class="eyebrow">Workspace</p>
							<h3 class="section-title">Current Output</h3>
							<p class="section-copy">
								{convertedEntry ? `${convertedEntry.title} is ready for review and export.` : "No converted entry yet. Run a wiki or folder conversion to populate the output panels."}
							</p>
							{#if converterStatus}
								<p class="pedia-status">{converterStatus}</p>
							{/if}
							{#if convertedEntry}
								<div class="pedia-preview-actions">
									<span class="pedia-preview-kicker">{convertedEntrySource}</span>
									<div class="inline">
										<button type="button" class="pedia-button" onclick={saveConvertedEntryToProject} disabled={converterBusy}>Upload</button>
										<button type="button" class="pedia-button pedia-button-secondary" onclick={downloadConvertedJson}>Export JSON</button>
										<button type="button" class="pedia-button pedia-button-secondary" onclick={downloadConvertedWiki}>Export Wiki Markup</button>
									</div>
								</div>
							{/if}
						</div>
					</section>
				</div>

				{#if converterIssues.length}
					<div class="pedia-issues">
						<h3 class="card-title">Conversion Notes</h3>
						<ul class="pedia-list-copy">
							{#each converterIssues as issue (issue)}
								<li>{issue}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if convertedEntry}
					<div class="pedia-preview-grid">
						<label class="pedia-preview-panel stack half">
							<span class="eyebrow">Pedia JSON</span>
							<textarea rows="18" readonly>{convertedJsonText}</textarea>
						</label>
						<label class="pedia-preview-panel stack half">
							<span class="eyebrow">Fandom Wiki Output</span>
							<textarea rows="18" readonly>{convertedWikiText}</textarea>
						</label>
					</div>
				{/if}
			</section>
		{:else if activeView === "collection" && selectedCollection}
			<div class="pedia-entry-toolbar">
				<button type="button" class="pedia-button" onclick={showCatalog}>Back To Catalog</button>
				<div class="pedia-link-row inline half flex-wrap">
					<button type="button" class="pedia-button pedia-button-secondary" style={collectionCardStyle(selectedCollection)}>
						{selectedCollection.title}
					</button>
					{#if canEdit}
						<button type="button" class="pedia-button pedia-button-secondary" onclick={toggleCollectionMetadataEditor}>
							{collectionMetadataEditorOpen ? "Hide Collection Editor" : "Edit Collection"}
						</button>
					{/if}
				</div>
			</div>

			{#if canEdit && collectionMetadataEditorOpen}
				<section class="pedia-editor-panel stack half">
					<div class="inline between flex-wrap half align-start">
						<div class="stack quarter">
							<p class="eyebrow">Collection Editor</p>
							<h3 class="card-title">Edit Collection Metadata</h3>
							<p class="card-copy">Update the collection title, colors, hero content, aliases, and external links.</p>
						</div>
					</div>

					<div class="pedia-preview-grid">
						<label class="stack quarter">
							<span class="eyebrow">Title</span>
							<input class="pedia-field" type="text" bind:value={collectionMetadataTitle} placeholder="Land of Snows" />
						</label>
						<label class="stack quarter">
							<span class="eyebrow">Id / Slug</span>
							<input class="pedia-field" type="text" bind:value={collectionMetadataId} placeholder="land-of-snows" />
						</label>
						<label class="stack quarter">
							<span class="eyebrow">Source Template</span>
							<input class="pedia-field" type="text" bind:value={collectionMetadataSourceTemplate} placeholder="LandofSnowsNav" />
						</label>
						<label class="stack quarter">
							<span class="eyebrow">Hero Image URL</span>
							<input class="pedia-field" type="url" bind:value={collectionMetadataImageURL} placeholder="https://..." />
						</label>
						<label class="stack quarter">
							<span class="eyebrow">Accent</span>
							<div class="pedia-color-field">
								<div class="pedia-color-picker-row">
									<div class="pedia-color-swatch-control relative overflow-hidden">
										<input
											type="color"
											value={colorInputValue(collectionMetadataAccentDisplay.hex)}
											oninput={(event) => updateCollectionMetadataColor("accent", event.currentTarget.value)}
										/>
										<span class="pedia-color-preview" style={`--preview:${collectionMetadataAccentDisplay.hex}`} aria-hidden="true"></span>
									</div>
									<input
										class="pedia-field pedia-color-hex-input"
										type="text"
										bind:value={collectionMetadataAccent}
										placeholder="#FAD587"
										oninput={(event) => (collectionMetadataAccent = sanitizeHexColor(event.currentTarget.value))}
									/>
								</div>
								<div class="pedia-color-values">
									<span class="pedia-color-value">HEX {collectionMetadataAccentDisplay.hex}</span>
									<span class="pedia-color-value">RGB {collectionMetadataAccentDisplay.rgb}</span>
									<span class="pedia-color-value">HSL {collectionMetadataAccentDisplay.hsl}</span>
								</div>
							</div>
						</label>
						<label class="stack quarter">
							<span class="eyebrow">Background</span>
							<div class="pedia-color-field">
								<div class="pedia-color-picker-row">
									<div class="pedia-color-swatch-control relative overflow-hidden">
										<input
											type="color"
											value={colorInputValue(collectionMetadataBackgroundDisplay.hex)}
											oninput={(event) => updateCollectionMetadataColor("background", event.currentTarget.value)}
										/>
										<span class="pedia-color-preview" style={`--preview:${collectionMetadataBackgroundDisplay.hex}`} aria-hidden="true"></span>
									</div>
									<input
										class="pedia-field pedia-color-hex-input"
										type="text"
										bind:value={collectionMetadataBackground}
										placeholder="#7E2222"
										oninput={(event) => (collectionMetadataBackground = sanitizeHexColor(event.currentTarget.value))}
									/>
								</div>
								<div class="pedia-color-values">
									<span class="pedia-color-value">HEX {collectionMetadataBackgroundDisplay.hex}</span>
									<span class="pedia-color-value">RGB {collectionMetadataBackgroundDisplay.rgb}</span>
									<span class="pedia-color-value">HSL {collectionMetadataBackgroundDisplay.hsl}</span>
								</div>
							</div>
						</label>
					</div>

					<label class="stack quarter">
						<span class="eyebrow">Blurb</span>
						<textarea class="pedia-field pedia-textarea-compact" rows="4" bind:value={collectionMetadataBlurb} placeholder="Short overview of the event or pack."></textarea>
					</label>
					<label class="stack quarter">
						<span class="eyebrow">Aliases</span>
						<textarea class="pedia-field pedia-textarea-compact" rows="4" bind:value={collectionMetadataAliases} placeholder="One alias per line"></textarea>
					</label>
					<label class="stack quarter">
						<span class="eyebrow">Links</span>
						<textarea class="pedia-field pedia-textarea-compact" rows="4" bind:value={collectionMetadataLinks} placeholder="Steam Workshop | https://steamcommunity.com/..."></textarea>
					</label>

					<div class="inline half flex-wrap margin-block-start-half">
						<button type="button" class="pedia-button pedia-button-secondary" onclick={toggleCollectionMetadataEditor}>Close</button>
						<button type="button" class="pedia-button" onclick={saveCollectionMetadata}>Save Collection</button>
						<button type="button" class="pedia-button pedia-button-danger margin-inline-start-auto" onclick={deleteSelectedCollection}>Delete Collection</button>
					</div>

					{#if collectionMetadataStatus}
						<p class="pedia-status">{collectionMetadataStatus}</p>
					{/if}
				</section>
			{/if}

			<section class="pedia-catalog-shell stack overflow-hidden" aria-label={`${selectedCollection.title} collection`}>
				<div class="pedia-collection-hero stack half" style={collectionHeroStyle(selectedCollection)}>
					<div class="inline between">
						<p class="eyebrow">Collection</p>
						<p class="section-copy">{selectedCollection.entries.length} member civ{selectedCollection.entries.length === 1 ? "" : "s"}</p>
					</div>
					<h2 class="section-title text-box-trim">{selectedCollection.title}</h2>
					{#if selectedCollection.blurb}
						<p class="section-copy text-bold">{selectedCollection.blurb}</p>
					{/if}
					{#if selectedCollection.links?.length}
						<div class="pedia-link-row inline half flex-wrap">
							{#each selectedCollection.links as link (`${selectedCollection.id}-${link.href}`)}
								<a class="pedia-button pedia-button-secondary pedia-collection-link" style={collectionLinkStyle(selectedCollection)} href={link.href} target="_blank" rel="noreferrer">
									{link.label}
								</a>
							{/each}
						</div>
					{/if}
				</div>

				<div class="pedia-catalog-entry-list stack" role="list">
					{#each selectedCollection.entries as entry (entry.id)}
						{@const collections = visibleEntryCollections(entry, selectedCollection.id)}
						<div role="listitem">
							<a class="pedia-catalog-row" href={entryPath(entry)} style={catalogRowStyle(entry)} onclick={(event) => handleRouteAnchorClick(event, entryPath(entry))}>
								{#if collections.length}
									<div class="pedia-catalog-row-meta">
										<div class="pedia-catalog-collection-pills">
											{#each collections as collection (`${entry.id}-${collection.id}-collection-row`)}
												<span class="pedia-catalog-collection-pill" style={entryCollectionPillStyle(collection)}>{collection.title}</span>
											{/each}
										</div>
									</div>
								{/if}
								<div class="pedia-catalog-row-main">
									<div class="pedia-catalog-icon-wrap">
										<div class="pedia-catalog-icon">
											{#if hasWorkingImage(entry.presentation?.iconImageUrl)}
												<img
													src={entry.presentation.iconImageUrl}
													alt={`${entry.title} icon`}
													loading="lazy"
													referrerpolicy="no-referrer"
													onerror={() => markImageFailed(entry.presentation.iconImageUrl)}
												/>
											{:else}
												<span>{entryInitials(entry)}</span>
											{/if}
										</div>
									</div>

									<div class="pedia-catalog-identity fit-content stack quarter">
										<div class="stack quarter">
											<p class="eyebrow">Civilization</p>
											<h3 class="pedia-catalog-civ-title">{entry.title}</h3>
										</div>
										<div class="pedia-catalog-meta inline half flex-wrap">
											<span class="text-lg"><strong>Leader</strong> <span class="leader-name">{entry.leader || "Unknown"}</span></span>
											{#if entry.capital}
												<span><strong>Capital</strong> {entry.capital}</span>
											{/if}
										</div>
									</div>
								</div>

								<div class="pedia-catalog-row-details">
									<article class="pedia-catalog-detail-card stack quarter">
										<p class="eyebrow">Unique Ability</p>
										<strong class="nowrap">{catalogComponent(entry, 0)}</strong>
										<!-- {#if catalogUnique(entry, 0)?.body}
											<PediaInlineText
												as="p"
												className="card-copy"
												text={catalogUnique(entry, 0).body}
												templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 0)?.templateRefs || [])}
											/>
										{:else if catalogUnique(entry, 0)?.bullets?.length}
											<ul class="pedia-catalog-bullet-list">
												{#each catalogUnique(entry, 0).bullets as bullet (`${entry.id}-collection-0-${bullet}`)}
													<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 0)?.templateRefs || [])} /></li>
												{/each}
											</ul>
										{/if} -->
									</article>
									<article class="pedia-catalog-detail-card stack quarter">
										<p class="eyebrow">{catalogComponentTypeLabel(entry, 1)}</p>
										<strong class="nowrap">{catalogComponent(entry, 1)}</strong>
										<!-- {#if catalogUnique(entry, 1)?.body}
											<PediaInlineText
												as="p"
												className="card-copy"
												text={catalogUnique(entry, 1).body}
												templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 1)?.templateRefs || [])}
											/>
										{:else if catalogUnique(entry, 1)?.bullets?.length}
											<ul class="pedia-catalog-bullet-list">
												{#each catalogUnique(entry, 1).bullets as bullet (`${entry.id}-collection-1-${bullet}`)}
													<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 1)?.templateRefs || [])} /></li>
												{/each}
											</ul>
										{/if} -->
									</article>
									<article class="pedia-catalog-detail-card stack quarter">
										<p class="eyebrow">{catalogComponentTypeLabel(entry, 2)}</p>
										<strong class="nowrap">{catalogComponent(entry, 2)}</strong>
										<!-- {#if catalogUnique(entry, 2)?.body}
											<PediaInlineText
												as="p"
												className="card-copy"
												text={catalogUnique(entry, 2).body}
												templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 2)?.templateRefs || [])}
											/>
										{:else if catalogUnique(entry, 2)?.bullets?.length}
											<ul class="pedia-catalog-bullet-list">
												{#each catalogUnique(entry, 2).bullets as bullet (`${entry.id}-collection-2-${bullet}`)}
													<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 2)?.templateRefs || [])} /></li>
												{/each}
											</ul>
										{/if} -->
									</article>
									<!-- <article class="pedia-catalog-detail-card pedia-catalog-notes-card stack quarter">
										<p class="eyebrow">summary</p>
										<PediaInlineText as="p" className="card-copy" text={entry.summary} templateRefs={entryTemplateRefs(entry)} />
									</article> -->
								</div>
							</a>
						</div>
					{/each}
				</div>
			</section>
		{:else if activeView === "category" && selectedCategory}
			<div class="pedia-entry-toolbar">
				<button type="button" class="pedia-button" onclick={showCatalog}>Back To Catalog</button>
				<div class="pedia-link-row inline half flex-wrap">
					<span class="pedia-category-chip is-static">
						<span>{selectedCategory.title}</span>
						<strong>{selectedCategory.entries.length}</strong>
					</span>
				</div>
			</div>

			<section class="pedia-catalog-shell stack overflow-hidden" aria-label={`${selectedCategory.title} category`}>
				<div class="stack half">
					<p class="eyebrow">Category</p>
					<h2 class="section-title">{selectedCategory.title}</h2>
					<p class="section-copy">{selectedCategory.entries.length} civ{selectedCategory.entries.length === 1 ? "" : "s"} tagged with this category.</p>
				</div>

				<div class="pedia-catalog-entry-list stack" role="list">
					{#each selectedCategory.entries as entry (entry.id)}
						{@const collections = entryCollections(entry)}
						<div role="listitem">
							<a class="pedia-catalog-row" href={entryPath(entry)} style={catalogRowStyle(entry)} onclick={(event) => handleRouteAnchorClick(event, entryPath(entry))}>
								{#if collections.length}
									<div class="pedia-catalog-row-meta">
										<div class="pedia-catalog-collection-pills">
											{#each collections as collection (`${entry.id}-${collection.id}-category-row`)}
												<span class="pedia-catalog-collection-pill" style={entryCollectionPillStyle(collection)}>{collection.title}</span>
											{/each}
										</div>
									</div>
								{/if}
								<div class="pedia-catalog-row-main">
									<div class="pedia-catalog-icon-wrap">
										<div class="pedia-catalog-icon">
											{#if hasWorkingImage(entry.presentation?.iconImageUrl)}
												<img
													src={entry.presentation.iconImageUrl}
													alt={`${entry.title} icon`}
													loading="lazy"
													referrerpolicy="no-referrer"
													onerror={() => markImageFailed(entry.presentation.iconImageUrl)}
												/>
											{:else}
												<span>{entryInitials(entry)}</span>
											{/if}
										</div>
									</div>

									<div class="pedia-catalog-identity fit-content stack quarter">
										<div class="stack quarter">
											<p class="eyebrow">Civilization</p>
											<h3 class="pedia-catalog-civ-title">{entry.title}</h3>
										</div>
										<div class="pedia-catalog-meta inline half flex-wrap">
											<span class="text-lg"><strong>Leader</strong> <span class="leader-name">{entry.leader || "Unknown"}</span></span>
											{#if entry.capital}
												<span><strong>Capital</strong> {entry.capital}</span>
											{/if}
										</div>
									</div>
								</div>

								<div class="pedia-catalog-row-details">
									<article class="pedia-catalog-detail-card stack quarter">
										<p class="eyebrow">Unique Ability</p>
										<strong class="nowrap">{catalogComponent(entry, 0)}</strong>
										<!-- {#if catalogUnique(entry, 0)?.body}
											<PediaInlineText
												as="p"
												className="card-copy"
												text={catalogUnique(entry, 0).body}
												templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 0)?.templateRefs || [])}
											/>
										{:else if catalogUnique(entry, 0)?.bullets?.length}
											<ul class="pedia-catalog-bullet-list">
												{#each catalogUnique(entry, 0).bullets as bullet (`${entry.id}-category-0-${bullet}`)}
													<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 0)?.templateRefs || [])} /></li>
												{/each}
											</ul>
										{/if} -->
									</article>
									<article class="pedia-catalog-detail-card stack quarter">
										<p class="eyebrow">{catalogComponentTypeLabel(entry, 1)}</p>
										<strong class="nowrap">{catalogComponent(entry, 1)}</strong>
										<!-- {#if catalogUnique(entry, 1)?.body}
											<PediaInlineText
												as="p"
												className="card-copy"
												text={catalogUnique(entry, 1).body}
												templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 1)?.templateRefs || [])}
											/>
										{:else if catalogUnique(entry, 1)?.bullets?.length}
											<ul class="pedia-catalog-bullet-list">
												{#each catalogUnique(entry, 1).bullets as bullet (`${entry.id}-category-1-${bullet}`)}
													<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 1)?.templateRefs || [])} /></li>
												{/each}
											</ul>
										{/if} -->
									</article>
									<article class="pedia-catalog-detail-card stack quarter">
										<p class="eyebrow">{catalogComponentTypeLabel(entry, 2)}</p>
										<strong class="nowrap">{catalogComponent(entry, 2)}</strong>
										<!-- {#if catalogUnique(entry, 2)?.body}
											<PediaInlineText
												as="p"
												className="card-copy"
												text={catalogUnique(entry, 2).body}
												templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 2)?.templateRefs || [])}
											/>
										{:else if catalogUnique(entry, 2)?.bullets?.length}
											<ul class="pedia-catalog-bullet-list">
												{#each catalogUnique(entry, 2).bullets as bullet (`${entry.id}-category-2-${bullet}`)}
													<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(entry, catalogUnique(entry, 2)?.templateRefs || [])} /></li>
												{/each}
											</ul>
										{/if} -->
									</article>
									<!-- <article class="pedia-catalog-detail-card pedia-catalog-notes-card stack quarter">
										<p class="eyebrow">Summary</p>
										<PediaInlineText as="p" className="card-copy" text={entry.summary} templateRefs={entryTemplateRefs(entry)} />
									</article> -->
								</div>
							</a>
						</div>
					{/each}
				</div>
			</section>
		{:else if selectedEntry}
			<div class="pedia-entry-toolbar">
				<button type="button" class="pedia-button" onclick={showCatalog}>Back To Catalog</button>
				<div class="pedia-link-row inline half flex-wrap">
					<button type="button" class="pedia-button pedia-button-secondary" onclick={() => startEditingEntry(selectedEntry)}>Edit Entry</button>
					<button type="button" class="pedia-button pedia-button-danger" onclick={deleteSelectedEntry}>Delete Entry</button>
					{#each sourceLinks(selectedEntry) as link (link.href)}
						<a class="pedia-button pedia-button-secondary" href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
					{/each}
				</div>
			</div>

			<article class="pedia-wiki">
				<header class="pedia-wiki-header">
					<div class="pedia-wiki-header-row inline">
						<div class="civ-icon">
							{#if hasWorkingImage(selectedEntry.presentation?.iconImageUrl)}
								<img
									src={selectedEntry.presentation.iconImageUrl}
									alt={`${selectedEntry.title} icon`}
									loading="lazy"
									referrerpolicy="no-referrer"
									onerror={() => markImageFailed(selectedEntry.presentation.iconImageUrl)}
								/>
							{:else}
								<div class="pedia-media-placeholder">
									<strong>Icon</strong>
									<span>{selectedEntry.presentation?.iconImage || "No icon yet"}</span>
								</div>
							{/if}
						</div>
						<div class="stack quarter">
							<!-- <p class="eyebrow">Entry</p> -->
							<h2 class="section-title">{selectedEntry.title}</h2>
							<PediaInlineText as="p" className="section-copy" text={entryDisplaySummary(selectedEntry)} templateRefs={entryTemplateRefs(selectedEntry)} />
						</div>
					</div>
				</header>

				{#if entryEditorOpen}
					<section class="pedia-editor-panel stack half">
						<div class="inline between flex-wrap half align-start">
							<div class="stack quarter">
								<p class="eyebrow">Entry Editor</p>
								<h3 class="card-title">Edit {selectedEntry.title}</h3>
								<p class="card-copy">Adjust the raw pedia JSON, preview it live, then save it back into the project files.</p>
							</div>
							<div class="inline half flex-wrap">
								<button type="button" class="pedia-button" onclick={previewEditedEntry}>Preview Edits</button>
								<button type="button" class="pedia-button pedia-button-secondary" onclick={saveEditedEntryToProject}>Save Edits</button>
								<button type="button" class="pedia-button pedia-button-secondary" onclick={stopEditingEntry}>Close Editor</button>
							</div>
						</div>
						{#if entryStatus}
							<p class="pedia-status">{entryStatus}</p>
						{/if}
						<label class="stack half">
							<span class="eyebrow">Entry JSON</span>
							<textarea class="pedia-json-editor" bind:value={entryEditorDraft} rows="22" spellcheck="false"></textarea>
						</label>
					</section>
				{/if}

				<div class="pedia-wiki-layout">
					<div class="pedia-wiki-main">
						<!-- <nav class="pedia-toc" aria-label="Entry sections">
							<strong class="card-title">Contents</strong>
							<ol class="pedia-toc-list">
								{#each TOC_SECTIONS as section (section.id)}
									<li><a href={`#${section.id}`}>{section.label}</a></li>
								{/each}
							</ol>
						</nav> -->

						<section class="pedia-wiki-section" id="overview">
							<h3 class="section-title">Overview</h3>
							<div class="pedia-copy-grid">
								<article class="pedia-copy-card">
									<strong class="card-title">{selectedEntry.overview.civilization.title || selectedEntry.title}</strong>
									{#if proseNeedsDisclosure(selectedEntry.overview.civilization.body)}
										<details class="pedia-prose-disclosure">
											<summary class="pedia-prose-summary">
												<PediaInlineText
													as="span"
													className="card-copy pedia-prose-clamp"
													text={sanitizePediaProse(selectedEntry.overview.civilization.body)}
													templateRefs={entryTemplateRefs(selectedEntry)}
												/>
												<span class="pedia-prose-toggle-row">
													<span class="pedia-prose-toggle-more">More</span>
													<span class="pedia-prose-toggle-less">Less</span>
													<span class="pedia-prose-toggle-icon" aria-hidden="true">▾</span>
												</span>
											</summary>
											<div class="pedia-prose-expanded">
												<div class="pedia-prose-paragraphs">
													{#each proseParagraphs(selectedEntry.overview.civilization.body) as paragraph, index (`${selectedEntry.id}-overview-civ-${index}`)}
														<PediaInlineText as="p" className="card-copy" text={paragraph} templateRefs={entryTemplateRefs(selectedEntry)} />
													{/each}
												</div>
											</div>
										</details>
									{:else}
										<div class="pedia-prose-paragraphs">
											{#if proseParagraphs(selectedEntry.overview.civilization.body).length}
												{#each proseParagraphs(selectedEntry.overview.civilization.body) as paragraph, index (`${selectedEntry.id}-overview-civ-short-${index}`)}
													<PediaInlineText as="p" className="card-copy" text={paragraph} templateRefs={entryTemplateRefs(selectedEntry)} />
												{/each}
											{:else}
												<p class="card-copy">No civilization overview yet.</p>
											{/if}
										</div>
									{/if}
								</article>
								<article class="pedia-copy-card">
									<strong class="card-title">{selectedEntry.leader}</strong>
									{#if proseNeedsDisclosure(selectedEntry.overview.leader.body)}
										<details class="pedia-prose-disclosure">
											<summary class="pedia-prose-summary">
												<PediaInlineText
													as="span"
													className="card-copy pedia-prose-clamp"
													text={sanitizePediaProse(selectedEntry.overview.leader.body)}
													templateRefs={entryTemplateRefs(selectedEntry)}
												/>
												<span class="pedia-prose-toggle-row">
													<span class="pedia-prose-toggle-more">More</span>
													<span class="pedia-prose-toggle-less">Less</span>
													<span class="pedia-prose-toggle-icon" aria-hidden="true">▾</span>
												</span>
											</summary>
											<div class="pedia-prose-expanded">
												<div class="pedia-prose-paragraphs">
													{#each proseParagraphs(selectedEntry.overview.leader.body) as paragraph, index (`${selectedEntry.id}-overview-leader-${index}`)}
														<PediaInlineText as="p" className="card-copy" text={paragraph} templateRefs={entryTemplateRefs(selectedEntry)} />
													{/each}
												</div>
											</div>
										</details>
									{:else}
										<div class="pedia-prose-paragraphs">
											{#if proseParagraphs(selectedEntry.overview.leader.body).length}
												{#each proseParagraphs(selectedEntry.overview.leader.body) as paragraph, index (`${selectedEntry.id}-overview-leader-short-${index}`)}
													<PediaInlineText as="p" className="card-copy" text={paragraph} templateRefs={entryTemplateRefs(selectedEntry)} />
												{/each}
											{:else}
												<p class="card-copy">No leader overview yet.</p>
											{/if}
										</div>
									{/if}
								</article>
							</div>
						</section>

						<section class="pedia-wiki-section" id="dawn-of-man">
							<h3 class="section-title">Dawn of Man</h3>
							<div class="pedia-dawn-layout inline align-start">
								{#if hasWorkingImage(selectedEntry.presentation?.leaderSceneImageUrl)}
									<figure class="pedia-figure-card">
										<img
											src={selectedEntry.presentation.leaderSceneImageUrl}
											alt={`${selectedEntry.title} Dawn of Man art`}
											loading="lazy"
											referrerpolicy="no-referrer"
											onerror={() => markImageFailed(selectedEntry.presentation.leaderSceneImageUrl)}
										/>
										<figcaption>{selectedEntry.presentation.leaderSceneArtCredit || selectedEntry.presentation.leaderSceneImage || "Dawn of Man art"}</figcaption>
									</figure>
								{/if}

								<div class="stack">
									{#if proseNeedsDisclosure(selectedEntry.dawnOfMan.blessing)}
										<details class="pedia-prose-disclosure">
											<summary class="pedia-prose-summary">
												<PediaInlineText
													as="span"
													className="card-copy pedia-prose-clamp"
													text={sanitizePediaProse(selectedEntry.dawnOfMan.blessing)}
													templateRefs={entryTemplateRefs(selectedEntry)}
												/>
												<span class="pedia-prose-toggle-row">
													<span class="pedia-prose-toggle-more">More</span>
													<span class="pedia-prose-toggle-less">Less</span>
													<span class="pedia-prose-toggle-icon" aria-hidden="true">▾</span>
												</span>
											</summary>
											<div class="pedia-prose-expanded">
												<div class="pedia-prose-paragraphs">
													{#each proseParagraphs(selectedEntry.dawnOfMan.blessing) as paragraph, index (`${selectedEntry.id}-dom-${index}`)}
														<PediaInlineText as="p" className="card-copy" text={paragraph} templateRefs={entryTemplateRefs(selectedEntry)} />
													{/each}
												</div>
											</div>
										</details>
									{:else}
										<div class="pedia-prose-paragraphs">
											{#if proseParagraphs(selectedEntry.dawnOfMan.blessing).length}
												{#each proseParagraphs(selectedEntry.dawnOfMan.blessing) as paragraph, index (`${selectedEntry.id}-dom-short-${index}`)}
													<PediaInlineText as="p" className="card-copy" text={paragraph} templateRefs={entryTemplateRefs(selectedEntry)} />
												{/each}
											{:else}
												<p class="card-copy">No blessing text yet.</p>
											{/if}
										</div>
									{/if}
									<p class="card-copy">
										<strong>Introduction:</strong>
										<PediaInlineText
											text={sanitizePediaProse(selectedEntry.dawnOfMan.introduction) || "No introduction text yet."}
											templateRefs={entryTemplateRefs(selectedEntry)}
										/>
									</p>
									<p class="card-copy">
										<strong>Defeat:</strong>
										<PediaInlineText text={sanitizePediaProse(selectedEntry.dawnOfMan.defeat) || "No defeat text yet."} templateRefs={entryTemplateRefs(selectedEntry)} />
									</p>
								</div>
							</div>
						</section>

						<section class="pedia-wiki-section" id="unique-attributes">
							<h3 class="section-title">Unique Attributes</h3>
							<div class="pedia-unique-list margin-block-start">
								{#each selectedEntry.uniques as unique (`${selectedEntry.id}-${unique.name}-${unique.slot}`)}
									<article class="pedia-unique-row">
										<div class="pedia-unique-figure-stack stack half">
											<div class="pedia-unique-figure">
												{#if hasWorkingImage(unique.artUrl)}
													<img
														src={unique.artUrl}
														alt={`${unique.name} artwork`}
														loading="lazy"
														referrerpolicy="no-referrer"
														onerror={() => markImageFailed(unique.artUrl)}
													/>
												{:else}
													<div class="pedia-media-placeholder text-center">
														<strong>{unique.slot}</strong>
														<span>{unique.art || "Art pending"}</span>
													</div>
												{/if}
											</div>
											{#if unique.artCredit}
												<p class="card-copy pedia-unique-art-credit">{unique.artCredit}</p>
											{/if}
										</div>

										<div class="pedia-copy-card">
											<div class="pedia-unique-head margin-block-end-half">
												<div class="inline half align-baseline">
													<strong class="card-title text-box-trim">{unique.name}</strong>
													{#if unique.replaces}
														<strong class="card-copy text-box-trim">({unique.replaces})</strong>
													{/if}
												</div>
												<span class="text-box-trim">{unique.slot}</span>
											</div>
											<!-- {#if unique.replaces}
												<p class="card-copy"><strong>Replaces:</strong> {unique.replaces}</p>
											{/if} -->
											{#if unique.body}
												<PediaInlineText
													as="p"
													className="card-copy"
													text={sanitizePediaProse(unique.body)}
													templateRefs={entryTemplateRefs(selectedEntry, unique.templateRefs || [])}
												/>
											{/if}
											{#if unique.bullets.length}
												<ul class="pedia-list-copy">
													{#each unique.bullets as bullet (`${unique.name}-${bullet}`)}
														<li><PediaInlineText text={sanitizePediaProse(bullet)} templateRefs={entryTemplateRefs(selectedEntry, unique.templateRefs || [])} /></li>
													{/each}
												</ul>
											{/if}
											{#if unique.civilopedia}
												<details class="pedia-unique-pedia">
													<summary class="pedia-unique-pedia-summary">
														<span>Civilopedia</span>
													</summary>
													<div class="pedia-unique-pedia-body">
														{#each proseParagraphs(unique.civilopedia) as paragraph, index (`${selectedEntry.id}-${unique.name}-pedia-${index}`)}
															<p class="card-copy">{paragraph}</p>
														{/each}
													</div>
												</details>
											{/if}
											{#if unique.footnotes?.length}
												<details class="pedia-unique-pedia">
													<summary class="pedia-unique-pedia-summary">
														<span>Notes{unique.footnotes.length > 1 ? ` (${unique.footnotes.length})` : ""}</span>
													</summary>
													<div class="pedia-unique-pedia-body">
														{#each unique.footnotes as footnote, noteIndex (`${selectedEntry.id}-${unique.name}-footnote-${noteIndex}`)}
															{@const noteLines = uniqueFootnoteLines(footnote)}
															{@const noteBullets = noteLines.filter((line) => /^[-*]/.test(line)).map((line) => line.replace(/^[-*]+\s*/, ""))}
															{@const noteParagraphs = noteLines.filter((line) => !/^[-*]/.test(line))}
															<div class="stack quarter">
																{#each noteParagraphs as paragraph (`${selectedEntry.id}-${unique.name}-footnote-paragraph-${paragraph}`)}
																	<PediaInlineText
																		as="p"
																		className="card-copy"
																		text={paragraph}
																		templateRefs={entryTemplateRefs(selectedEntry, unique.templateRefs || [])}
																	/>
																{/each}
																{#if noteBullets.length}
																	<ul class="pedia-list-copy">
																		{#each noteBullets as bullet (`${selectedEntry.id}-${unique.name}-footnote-bullet-${bullet}`)}
																			<li><PediaInlineText text={bullet} templateRefs={entryTemplateRefs(selectedEntry, unique.templateRefs || [])} /></li>
																		{/each}
																	</ul>
																{/if}
															</div>
														{/each}
													</div>
												</details>
											{/if}
											{#if unresolvedTemplateRefs(entryTemplateRefs(selectedEntry, unique.templateRefs || [])).length}
												<div class="pedia-template-ref-row inline half flex-wrap">
													{#each unresolvedTemplateRefs(entryTemplateRefs(selectedEntry, unique.templateRefs || [])) as reference (`${selectedEntry.id}-${unique.name}-${reference.href}`)}
														<a class="pedia-template-ref" href={reference.href} target="_blank" rel="noreferrer">
															{reference.label}
														</a>
													{/each}
												</div>
											{/if}
										</div>
									</article>
								{/each}
							</div>
						</section>

						<div class="pedia-entry-support-grid inline align-start">
							<section class="pedia-wiki-section" id="name-lists">
								<h3 class="section-title">Lists</h3>
								<div class="pedia-name-lists inline align-start">
									{#each selectedEntry.nameLists as list (`${selectedEntry.id}-${list.title}`)}
										<details class="pedia-list-panel">
											<summary class="pedia-list-panel-summary">
												<strong class="card-title block padding-block-start-quarter">{list.title}</strong>
											</summary>
											<div class="pedia-list-panel-body">
												{#if list.items.length > 0}
													<ol class="pedia-name-list card-copy">
														{#each list.items as item, index (`${selectedEntry.id}-${list.title}-${index}`)}
															<li>{item}</li>
														{/each}
													</ol>
												{:else}
													<p class="card-copy">No names recorded.</p>
												{/if}
											</div>
										</details>
									{/each}
								</div>
							</section>

							<section class="pedia-wiki-section" id="music">
								<h3 class="section-title">Music</h3>
								<div class="pedia-copy-grid">
									<article class="pedia-copy-card">
										<strong class="card-title">Peace Theme</strong>
										{#if entryMusicEmbedUrl(selectedEntry, "peace") && activeMusicPreviewKey === musicPreviewKey(selectedEntry, "peace")}
											<div class="pedia-music-embed">
												<iframe
													src={entryMusicEmbedUrl(selectedEntry, "peace")}
													title={`${selectedEntry.music.peace.title || selectedEntry.title} peace theme`}
													loading="lazy"
													referrerpolicy="strict-origin-when-cross-origin"
													allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
													allowfullscreen
												></iframe>
											</div>
										{:else if entryMusicThumbnailUrl(selectedEntry, "peace")}
											<button type="button" class="pedia-music-preview" onclick={() => (activeMusicPreviewKey = musicPreviewKey(selectedEntry, "peace"))}>
												<img src={entryMusicThumbnailUrl(selectedEntry, "peace")} alt={`${selectedEntry.music.peace.title || selectedEntry.title} preview`} loading="lazy" />
												<span class="pedia-music-preview-copy">
													<strong>Play Preview</strong>
													<span>Load peace theme video</span>
												</span>
											</button>
										{/if}
										<p class="card-copy">{selectedEntry.music.peace.title || "Unknown"}</p>
										<p class="card-copy">{selectedEntry.music.peace.credit || "Credit pending"}</p>
									</article>
									<article class="pedia-copy-card">
										<strong class="card-title">War Theme</strong>
										{#if entryMusicEmbedUrl(selectedEntry, "war") && activeMusicPreviewKey === musicPreviewKey(selectedEntry, "war")}
											<div class="pedia-music-embed">
												<iframe
													src={entryMusicEmbedUrl(selectedEntry, "war")}
													title={`${selectedEntry.music.war.title || selectedEntry.title} war theme`}
													loading="lazy"
													referrerpolicy="strict-origin-when-cross-origin"
													allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
													allowfullscreen
												></iframe>
											</div>
										{:else if entryMusicThumbnailUrl(selectedEntry, "war")}
											<button type="button" class="pedia-music-preview" onclick={() => (activeMusicPreviewKey = musicPreviewKey(selectedEntry, "war"))}>
												<img src={entryMusicThumbnailUrl(selectedEntry, "war")} alt={`${selectedEntry.music.war.title || selectedEntry.title} preview`} loading="lazy" />
												<span class="pedia-music-preview-copy">
													<strong>Play Preview</strong>
													<span>Load war theme video</span>
												</span>
											</button>
										{/if}
										<p class="card-copy">{selectedEntry.music.war.title || "Unknown"}</p>
										<p class="card-copy">{selectedEntry.music.war.credit || "Credit pending"}</p>
									</article>
								</div>
							</section>

							<section class="pedia-wiki-section" id="mod-support">
								<h3 class="section-title">Mod Support</h3>
								<div class="pedia-support-table" role="table" aria-label="Mod support matrix">
									{#each supportMatrix(selectedEntry).filter((support) => support.value) as support (support.key)}
										<div class="pedia-support-row" role="row">
											<strong>{support.label}</strong>
										</div>
									{/each}
								</div>
							</section>
						</div>

						<section class="pedia-wiki-section" id="credits">
							<h3 class="section-title">Credits</h3>
							<div class="pedia-credit-grid">
								{#each selectedEntry.credits as credit (`${selectedEntry.id}-${credit.name}-${credit.role}`)}
									<button
										type="button"
										class="pedia-credit-card pedia-credit-card-button"
										style={creditCardStyle(credit.name)}
										onclick={() => filterCatalogByAuthor(creditFilterTarget(selectedEntry, credit))}
									>
										<strong class="card-title">{credit.name}</strong>
										<p class="card-copy">{credit.role}</p>
									</button>
								{/each}
							</div>
						</section>

						{#if entryCollections(selectedEntry).length || canEdit}
							<section class="pedia-wiki-section" id="collections">
								<h3 class="section-title">Part of Collection</h3>
								{#if entryCollections(selectedEntry).length}
									<div class="pedia-collection-grid">
										{#each entryCollections(selectedEntry) as collection (`${selectedEntry.id}-${collection.id}`)}
											<a
												class="pedia-collection-card"
												href={collectionPath(collection)}
												style={collectionCardStyle(collection)}
												onclick={(event) => handleRouteAnchorClick(event, collectionPath(collection))}
											>
												<div class="inline between">
													<p class="eyebrow">Collection</p>
													<!-- <p class="card-copy">{collectionEntryCount(collection)} member{collectionEntryCount(collection) === 1 ? "" : "s"}</p> -->
												</div>
												<strong class="card-title text-xl">{collection.title}</strong>
											</a>
										{/each}
									</div>
								{:else}
									<p class="card-copy">No collection memberships listed yet.</p>
								{/if}

								{#if canEdit}
									<div class="pedia-link-row">
										<button type="button" class="pedia-button pedia-button-secondary" onclick={toggleCollectionEditor}>
											{collectionEditorOpen ? "Hide Editor" : "Edit Memberships"}
										</button>
									</div>

									{#if collectionEditorOpen}
										<div class="pedia-collection-editor stack half">
											<p class="eyebrow">Editor</p>
											<p class="card-copy">Manually add civ to existing or new collections.</p>

											{#if collectionEditorDraft.length}
												<div class="pedia-category-cloud">
													{#each collectionEditorDraft as collection (`${selectedEntry.id}-draft-${collection.id}`)}
														<button type="button" class="pedia-category-chip" onclick={() => removeCollectionFromDraft(collection.id)}>
															<span>{collection.title}</span>
															<strong>Remove</strong>
														</button>
													{/each}
												</div>
											{:else}
												<p class="card-copy">No saved collection overrides yet.</p>
											{/if}

											<div class="pedia-action-row">
												<select class="pedia-select" bind:value={collectionEditorSelection}>
													<option value="">Select collection…</option>
													{#each availableCollectionOptions as collection (collection.id)}
														<option value={collection.id}>{collection.title}</option>
													{/each}
												</select>
												<div class="width-full inline">
													<button type="button" class="pedia-button pedia-button-secondary" onclick={addCollectionToDraft} disabled={!collectionEditorSelection}>
														Add Collection
													</button>
													<button type="button" class="pedia-button" onclick={saveCollectionMemberships}>Save</button>
													<button type="button" class="pedia-button pedia-button-secondary margin-inline-start-auto" onclick={toggleCollectionCreator}>
														{collectionCreatorOpen ? "Cancel New Collection" : "Create New Collection"}
													</button>
												</div>
											</div>

											{#if collectionCreatorOpen}
												<div class="pedia-collection-editor stack margin-block-start">
													<div class="pedia-preview-grid">
														<label class="stack quarter">
															<span class="eyebrow">Title</span>
															<input class="pedia-field" type="text" bind:value={newCollectionTitle} placeholder="Land of Snows" />
														</label>
														<label class="stack quarter">
															<span class="eyebrow">Id</span>
															<input class="pedia-field" type="text" bind:value={newCollectionId} placeholder="land-of-snows" />
														</label>
														<label class="stack quarter">
															<span class="eyebrow">Accent</span>
															<div class="pedia-color-field">
																<div class="pedia-color-picker-row">
																	<div class="pedia-color-swatch-control relative overflow-hidden">
																		<input
																			type="color"
																			value={colorInputValue(newCollectionAccent, "#FAD587")}
																			oninput={(event) => updateNewCollectionColor("accent", event.currentTarget.value)}
																			onchange={(event) => updateNewCollectionColor("accent", event.currentTarget.value)}
																			aria-label="Collection accent color"
																		/>
																		<span class="pedia-color-preview" style={`--preview:${newCollectionAccentDisplay.hex}`} aria-hidden="true"></span>
																	</div>
																	<input
																		class="pedia-field pedia-color-hex-input uppercase"
																		type="text"
																		inputmode="text"
																		spellcheck="false"
																		bind:value={newCollectionAccent}
																		placeholder="#FAD587"
																		oninput={(event) => updateNewCollectionColor("accent", event.currentTarget.value)}
																	/>
																</div>
																<div class="pedia-color-values">
																	<span class="pedia-color-value">HEX {newCollectionAccentDisplay.hex}</span>
																	<span class="pedia-color-value">RGB {newCollectionAccentDisplay.rgb}</span>
																	<span class="pedia-color-value">HSL {newCollectionAccentDisplay.hsl}</span>
																</div>
															</div>
														</label>
														<label class="stack quarter">
															<span class="eyebrow">Background</span>
															<div class="pedia-color-field">
																<div class="pedia-color-picker-row">
																	<div class="pedia-color-swatch-control relative overflow-hidden">
																		<input
																			type="color"
																			value={colorInputValue(newCollectionBackground, "#7E2222")}
																			oninput={(event) => updateNewCollectionColor("background", event.currentTarget.value)}
																			onchange={(event) => updateNewCollectionColor("background", event.currentTarget.value)}
																			aria-label="Collection background color"
																		/>
																		<span class="pedia-color-preview" style={`--preview:${newCollectionBackgroundDisplay.hex}`} aria-hidden="true"></span>
																	</div>
																	<input
																		class="pedia-field pedia-color-hex-input uppercase"
																		type="text"
																		inputmode="text"
																		spellcheck="false"
																		bind:value={newCollectionBackground}
																		placeholder="#7E2222"
																		oninput={(event) => updateNewCollectionColor("background", event.currentTarget.value)}
																	/>
																</div>
																<div class="pedia-color-values">
																	<span class="pedia-color-value">HEX {newCollectionBackgroundDisplay.hex}</span>
																	<span class="pedia-color-value">RGB {newCollectionBackgroundDisplay.rgb}</span>
																	<span class="pedia-color-value">HSL {newCollectionBackgroundDisplay.hsl}</span>
																</div>
															</div>
														</label>
													</div>

													<label class="stack quarter">
														<span class="eyebrow">Source Template <span class="normal">(need same name for linking future Fandom imports)</span></span>
														<input class="pedia-field" type="text" bind:value={newCollectionSourceTemplate} placeholder="LandofSnowsNav" />
													</label>

													<label class="stack quarter">
														<span class="eyebrow">Aliases</span>
														<textarea
															class="pedia-field pedia-textarea-compact"
															bind:value={newCollectionAliases}
															rows="4"
															placeholder="One alias per line or comma separated"
														></textarea>
													</label>

													<div class="inline start">
														<button type="button" class="pedia-button pedia-button-secondary" onclick={toggleCollectionCreator}> Cancel </button>
														<button type="button" class="pedia-button" onclick={createCollectionDefinition}>Save New Collection</button>
													</div>
												</div>
											{/if}

											{#if collectionEditorStatus}
												<p class="pedia-status">{collectionEditorStatus}</p>
											{/if}
										</div>
									{/if}
								{/if}
							</section>
						{/if}

						{#if entryCategories(selectedEntry).length || canEdit}
							<section class="pedia-wiki-section" id="categories">
								<h3 class="section-title">Categories</h3>
								{#if entryCategories(selectedEntry).length}
									<div class="pedia-category-cloud">
										{#each entryCategories(selectedEntry) as category (`${selectedEntry.id}-${category.id}`)}
											<a class="pedia-category-chip" href={categoryPath(category)} onclick={(event) => handleRouteAnchorClick(event, categoryPath(category))}>
												<span>{category.title}</span>
											</a>
										{/each}
									</div>
								{:else}
									<p class="card-copy">No browsable categories listed yet.</p>
								{/if}

								{#if canEdit}
									<!-- <div class="pedia-link-row">
										<button type="button" class="pedia-button pedia-button-secondary" onclick={toggleCategoryEditor}>
											{categoryEditorOpen ? "Hide Editor" : "Edit Categories"}
										</button>
									</div> -->

									{#if categoryEditorOpen}
										<div class="pedia-collection-editor stack half">
											<p class="eyebrow">Editor</p>
											<p class="card-copy">
												Edit the raw category tags for this entry. Author tags, collection duplicates, and some generic tags may still stay hidden from the public category
												browser.
											</p>

											{#if categoryEditorDraft.length}
												<div class="pedia-category-cloud">
													{#each categoryEditorDraft as category (`${selectedEntry.id}-category-draft-${category}`)}
														<button type="button" class="pedia-category-chip" onclick={() => removeCategoryFromDraft(category)}>
															<span>{category}</span>
															<strong>Remove</strong>
														</button>
													{/each}
												</div>
											{:else}
												<p class="card-copy">No categories saved on this entry yet.</p>
											{/if}

											<div class="pedia-category-editor-input-row">
												<label class="stack quarter">
													<span class="eyebrow">Add Category</span>
													<input
														class="pedia-field"
														type="text"
														list="pedia-category-options"
														bind:value={categoryEditorInput}
														placeholder="Plains Cultures"
														onkeydown={(event) => {
															if (event.key === "Enter") {
																event.preventDefault();
																addCategoryToDraft();
															}
														}}
													/>
												</label>
												<div class="inline align-end half flex-wrap">
													<button
														type="button"
														class="pedia-button pedia-button-secondary"
														onclick={addCategoryToDraft}
														disabled={!normalizeCategoryValue(categoryEditorInput)}
													>
														Add Category
													</button>
													<button type="button" class="pedia-button" onclick={saveCategoryAssignments}>Save</button>
												</div>
											</div>

											{#if availableCategoryOptions.length}
												<datalist id="pedia-category-options">
													{#each availableCategoryOptions as category (category)}
														<option value={category}></option>
													{/each}
												</datalist>
											{/if}

											{#if categoryEditorStatus}
												<p class="pedia-status">{categoryEditorStatus}</p>
											{/if}
										</div>
									{/if}
								{/if}
							</section>
						{/if}

						<section class="pedia-wiki-section" id="more-by-author">
							<h3 class="section-title">More by Author</h3>
							<div class="stack half">
								{#each entryAuthors(selectedEntry) as authorName (`${selectedEntry.id}-${authorName}`)}
									<section class="pedia-author-section stack half">
										<div class="inline between flex-wrap half align-baseline">
											<h4 class="card-title">{authorName}</h4>
											<!-- <button type="button" class="pedia-button pedia-button-secondary" onclick={() => filterCatalogByAuthor(authorName)}>
												View {authorName} in Catalog
											</button> -->
										</div>
										<div class="pedia-author-works stack half" role="list">
											{#each authorEntriesForName(authorName) as entry (`${authorName}-${entry.id}`)}
												<div role="listitem">
													<a
														class="pedia-author-work"
														class:is-current={entry.id === selectedEntry.id}
														href={entryPath(entry)}
														style={catalogRowStyle(entry)}
														onclick={(event) => handleRouteAnchorClick(event, entryPath(entry))}
													>
														<div class="pedia-author-work-icon">
															{#if hasWorkingImage(entry.presentation?.iconImageUrl)}
																<img
																	src={entry.presentation.iconImageUrl}
																	alt={`${entry.title} icon`}
																	loading="lazy"
																	referrerpolicy="no-referrer"
																	onerror={() => markImageFailed(entry.presentation.iconImageUrl)}
																/>
															{:else}
																<span>{entryInitials(entry)}</span>
															{/if}
														</div>
														<div class="pedia-author-work-copy stack quarter">
															<div class="inline between flex-wrap half align-start">
																<div class="stack quarter">
																	<div class="inline align-baseline flex-wrap half">
																		<strong class="card-title text-box-trim">{entry.title}</strong>
																		{#if entry.id === selectedEntry.id}
																			<span class="pedia-author-work-pill text-box-trim">Current Entry</span>
																		{/if}
																	</div>
																	<p class="card-copy">{entry.leader || "Unknown leader"}</p>
																</div>
															</div>
															<div class="pedia-author-work-meta inline half flex-wrap">
																<span>{catalogComponent(entry, 0)}</span>
																<span>{catalogComponent(entry, 1)}</span>
																<span>{catalogComponent(entry, 2)}</span>
																{#if entry.capital}
																	<span>Capital: {entry.capital}</span>
																{/if}
															</div>
														</div>
													</a>
												</div>
											{/each}
										</div>
									</section>
								{/each}
							</div>
						</section>
					</div>

					<aside class="pedia-infobox" style={infoboxStyle(selectedEntry)} aria-label={`${selectedEntry.title} infobox`}>
						<div class="pedia-infobox-media overflow-hidden">
							{#if hasWorkingImage(selectedEntry.presentation?.mapImageUrl)}
								<img
									src={selectedEntry.presentation.mapImageUrl}
									alt={`${selectedEntry.title} map`}
									loading="lazy"
									referrerpolicy="no-referrer"
									onerror={() => markImageFailed(selectedEntry.presentation.mapImageUrl)}
								/>
							{:else}
								<div class="pedia-media-placeholder text-center">
									<strong>Map</strong>
									<span>{selectedEntry.presentation?.mapImage || "Map pending"}</span>
								</div>
							{/if}
						</div>

						{#if selectedEntry.presentation?.mapImageCaption}
							<p class="card-copy pedia-infobox-caption">{selectedEntry.presentation.mapImageCaption}</p>
						{/if}

						<!-- {#if hasWorkingImage(selectedEntry.presentation?.iconImageUrl)}
							<div class="pedia-infobox-icon overflow-hidden">
								<img
									src={selectedEntry.presentation.iconImageUrl}
									alt={`${selectedEntry.title} icon`}
									loading="lazy"
									referrerpolicy="no-referrer"
									onerror={() => markImageFailed(selectedEntry.presentation.iconImageUrl)}
								/>
							</div>
						{/if} -->

						<div class="pedia-infobox-rows">
							{#each infoboxRows(selectedEntry) as row (row.label)}
								<div class="pedia-infobox-row">
									<strong>{row.label}</strong>
									{#if row.values?.length > 1}
										<div class="pedia-infobox-values">
											{#each row.values as value (`${row.label}-${value}`)}
												<span><PediaInlineText text={value} templateRefs={infoboxRowTemplateRefs(selectedEntry, { ...row, value })} /></span>
											{/each}
										</div>
									{:else}
										<span><PediaInlineText text={row.value} templateRefs={infoboxRowTemplateRefs(selectedEntry, row)} /></span>
									{/if}
								</div>
							{/each}
						</div>

						<!-- {#if selectedEntry.identity?.requiredContent?.length}
							<div class="pedia-required-note">
								<strong class="card-title">Requires</strong>
								<p class="card-copy">{selectedEntry.identity.requiredContent.join(", ")}</p>
							</div>
						{/if} -->
					</aside>
				</div>
			</article>
		{/if}
	</section>
</section>

<style>
	.pedia-page {
		--pedia-accent: var(--surface-pedia-highlight);
		--pedia-accent-strong: var(--surface-pedia-highlight-strong);
		--pedia-border: var(--surface-pedia-border);
		--pedia-panel: var(--surface-pedia-panel);
		--pedia-panel-soft: var(--surface-pedia-panel-soft);
		--pedia-shadow: 0 14px 32px color-mix(in srgb, black 78%, transparent);
		--pedia-shadow-soft: 0 4px 6px color-mix(in srgb, black 84%, transparent);
		display: grid;
		gap: 1rem;
	}

	.pedia-hero {
		display: grid;
		gap: 1rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pedia-accent) 10%, transparent) 0%, transparent 35%),
			linear-gradient(135deg, color-mix(in srgb, var(--pedia-panel) 96%, black 4%) 0%, color-mix(in srgb, var(--pedia-panel) 92%, var(--pedia-accent) 8%) 100%);
		box-shadow: var(--pedia-shadow);
		border: 1px solid var(--pedia-border);
	}

	.pedia-toolbar,
	.pedia-catalog-shell,
	.pedia-wiki {
		display: grid;
		gap: 1rem;
		background: var(--pedia-panel);
		box-shadow: var(--pedia-shadow);
		border: 1px solid var(--pedia-border);
		border-radius: 1rem;
		padding: 1.5rem;
	}

	.pedia-main {
		display: grid;
		gap: 1rem;
		min-inline-size: 0;
	}

	.pedia-toolbar {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
	}

	.pedia-toolbar-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		justify-content: end;
	}

	.pedia-view-switch {
		display: inline-flex;
		gap: 0.35rem;
		padding: 0.3rem;
		background: color-mix(in srgb, var(--pedia-panel-soft) 92%, black 8%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
		border-radius: 999px;
	}

	.pedia-view-chip {
		color: var(--muted-ink);
		font: inherit;
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: transparent;
		border: 0;
		border-radius: 999px;
		padding: 0.55rem 0.9rem;
	}

	.pedia-view-chip.is-active {
		color: var(--ink);
		background: color-mix(in srgb, var(--pedia-accent) 18%, var(--control-bg));
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 36%, var(--border-color)),
			0 4px 10px color-mix(in srgb, black 74%, transparent);
	}

	.pedia-unique-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.75rem;
	}

	.pedia-wiki-header-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 1.5rem;
		align-items: center;
	}

	.civ-icon {
		display: grid;
		place-items: center;
		inline-size: clamp(6rem, 10vw, 8rem);
		block-size: clamp(6rem, 10vw, 8rem);
		overflow: hidden;
	}

	.civ-icon img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: contain;
		filter: drop-shadow(2px 2px 4px rgb(0 0 0 / 0.5));
	}

	.pedia-wiki-header h2 {
		font-size: 2.5rem;
	}

	.pedia-converter-shell {
		display: grid;
		gap: 1rem;
		background: var(--pedia-panel);
		box-shadow: var(--pedia-shadow);
		border: 1px solid var(--pedia-border);
		border-radius: 1rem;
		padding: 1.5rem;
	}

	.pedia-converter-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1.65fr) minmax(20rem, 0.95fr);
		align-items: start;
	}

	.pedia-converter-panel,
	.pedia-converter-side-card,
	.pedia-issues,
	.pedia-preview-panel {
		display: grid;
		gap: 0.85rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pedia-accent) 14%, transparent) 0%, transparent 40%),
			linear-gradient(165deg, color-mix(in srgb, var(--pedia-panel-soft) 98%, var(--control-bg)) 0%, color-mix(in srgb, var(--pedia-panel-soft) 94%, #16110f 8%) 100%);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-converter-panel-side {
		gap: 1rem;
	}

	.pedia-action-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.pedia-hidden-input {
		display: none;
	}

	.pedia-markup-input,
	.pedia-preview-panel textarea,
	.pedia-json-editor {
		inline-size: 100%;
		max-inline-size: 100%;
		min-block-size: 16rem;
		max-block-size: 34rem;
		color: var(--ink);
		font: inherit;
		line-height: 1.55;
		background: color-mix(in srgb, var(--input-bg) 94%, black 6%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 24%, var(--border-color));
		border-radius: 0.95rem;
		padding: 1rem;
		overflow: auto;
		resize: vertical;
	}

	.pedia-field,
	.pedia-select {
		inline-size: 100%;
		max-inline-size: 100%;
		color: var(--ink);
		font: inherit;
		line-height: 1.4;
		background: color-mix(in srgb, var(--input-bg) 94%, black 6%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 24%, var(--border-color));
		border-radius: 0.95rem;
		min-inline-size: min(100%, 18rem);
		padding: 0.7rem 0.9rem;
	}

	.pedia-textarea-compact {
		min-block-size: 6rem;
		max-block-size: 10rem;
		resize: vertical;
	}

	.pedia-color-field {
		display: grid;
		gap: 0.35rem;
	}

	.pedia-color-picker-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-inline-size: 0;
	}

	.pedia-color-swatch-control {
		inline-size: 2rem;
		block-size: 2rem;
		min-inline-size: 2rem;
		flex: 0 0 2rem;
		border-radius: 0.45rem;

		& input[type="color"] {
			position: absolute;
			inset: 0;
			z-index: 2;
			inline-size: 100%;
			block-size: 100%;
			opacity: 0;
			background: transparent;
			border: 0;
			padding: 0;
			margin: 0;
			cursor: pointer;
			-webkit-appearance: none;
			appearance: none;
		}
	}

	.pedia-color-preview {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: block;
		background: var(--preview, #000);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, white 30%, transparent);
		border: 1px solid var(--border-color);
		border-radius: inherit;
		pointer-events: none;
	}

	.pedia-color-hex-input {
		min-inline-size: 0;
		flex: 1;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	}

	.pedia-color-values {
		display: grid;
		gap: 0.12rem;
		user-select: text;
	}

	.pedia-color-value {
		color: var(--muted-ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.74rem;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.pedia-preview-actions {
		display: grid;
		gap: 0.75rem;
	}

	.pedia-preview-kicker {
		color: var(--pedia-accent-strong);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-status {
		color: var(--ink);
		background: color-mix(in srgb, var(--pedia-accent) 12%, var(--control-bg));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 20%, var(--border-color));
		border-radius: 0.9rem;
		padding: 0.9rem 1rem;
		margin: 0;
	}

	.pedia-preview-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.pedia-collection-hero {
		--collection-accent: var(--pedia-accent);
		--collection-background: var(--pedia-panel-soft);
		--collection-hero-image: none;
		position: relative;
		padding: 1rem 1.15rem 1.25rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--collection-accent) 26%, transparent) 0%, transparent 42%),
			linear-gradient(145deg, color-mix(in srgb, var(--collection-background) 82%, var(--pedia-panel-soft)) 0%, color-mix(in srgb, var(--collection-background) 28%, #16110f) 100%);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--collection-accent) 34%, var(--border-color)),
			var(--pedia-shadow-soft);
		border-radius: 1rem;
		overflow: clip;
	}

	/*.pedia-collection-hero::before {
		content: "";
		position: absolute;
		inset: 0;
		z-index: 0;
		background-image: var(--collection-hero-image);
		background-position: center;
		background-repeat: no-repeat;
		background-size: cover;
		filter: grayscale(0.5) saturate(0.8) brightness(0.2);
		opacity: 0.7;
		pointer-events: none;
	}*/

	.pedia-collection-hero > * {
		position: relative;
		z-index: 1;
	}

	.pedia-dawn-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 1.5rem;
		align-items: start;
	}

	.pedia-catalog-shell {
		block-size: 100%;
		max-block-size: 100%;
		gap: 2rem;
		overflow: hidden;

		& > * {
			text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
		}
	}

	.pedia-catalog-collections {
		padding-block-end: 0.25rem;
	}

	.pedia-catalog-categories {
		padding-block-end: 0.25rem;
	}

	.pedia-catalog-accordion {
		background: color-mix(in srgb, var(--pedia-panel) 84%, black 16%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 0.25rem 1rem 1rem;
	}

	.pedia-catalog-accordion-summary {
		cursor: pointer;
		list-style: none;
		background: none;
		padding-block: 0.75rem 0.45rem;
		padding-inline-start: 0;
	}

	.pedia-catalog-accordion-summary::-webkit-details-marker {
		display: none;
	}

	.pedia-catalog-accordion-summary::marker {
		content: "";
	}

	.pedia-catalog-accordion-summary .pedia-catalog-group-head {
		position: relative;
		padding-inline-start: 1.55rem;
	}

	.pedia-catalog-accordion-summary .pedia-catalog-group-head::before {
		content: "+";
		position: absolute;
		inset-inline-start: 0;
		inset-block-start: 50%;
		transform: translateY(-50%);
		color: var(--pedia-accent-strong);
		font-size: 1.35rem;
		font-weight: 700;
		line-height: 1;
	}

	.pedia-catalog-accordion[open] .pedia-catalog-group-head::before {
		content: "−";
	}

	.pedia-catalog-groups {
		gap: 2rem;
		overflow: auto;
		padding-inline-end: 0.25rem;
	}

	.pedia-catalog-group {
		scroll-padding-block-start: 4rem;
	}

	.pedia-catalog-group-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.pedia-catalog-group-head .section-title {
		font-size: 1.5rem;
	}

	.pedia-author-toc-grid {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		gap: 0.5rem;
	}

	.pedia-author-toc-chip {
		flex: 0 1 auto;
		max-inline-size: 100%;
		color: var(--ink);
		text-align: start;
		white-space: nowrap;
		text-box: trim-both cap alphabetic;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 25%, transparent) 0%, transparent 40%),
			linear-gradient(
				160deg,
				color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 10%, var(--pedia-panel) 70%) 0%,
				color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 5%, var(--pedia-panel-soft) 95%) 100%
			);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 24%, var(--border-color));
		border-radius: 0.95rem;
		padding: 1rem;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			box-shadow 150ms ease;

		&:hover {
			transform: translateY(-1px);
			border-color: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 38%, var(--border-color));
			box-shadow: 0 8px 18px color-mix(in srgb, black 78%, transparent);
		}
	}

	.pedia-author-overview {
		display: grid;
		gap: 1rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 25%, transparent) 0%, transparent 50%),
			linear-gradient(
				160deg,
				color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 10%, var(--pedia-panel) 70%) 0%,
				color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 5%, var(--pedia-panel-soft) 95%) 100%
			);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 34%, var(--border-color));
		border-radius: 1rem;
		padding: 1.5rem 1.25rem 0.75rem;

		& .section-title {
			font-size: 2rem;
		}
	}

	.pedia-author-civs-accordion {
		display: grid;
		gap: 1rem;
		border-top: 1px solid color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 22%, var(--border-color));
		padding-block-start: 1.5rem;
		margin-block-start: 0.5rem;
	}

	.pedia-author-civs-summary {
		cursor: pointer;
		list-style: none;
		background: none;
		padding: 0;

		& * {
			text-box: trim-both cap alphabetic;
		}
	}

	.pedia-author-civs-summary::-webkit-details-marker {
		display: none;
	}

	.pedia-author-civs-summary::marker {
		content: "";
	}

	.pedia-author-civs-summary > div {
		position: relative;
		font-size: 1.25rem;
		padding-inline-start: 1.45rem;
	}

	.pedia-author-civs-summary > div::before {
		content: "+";
		position: absolute;
		inset-inline-start: 0;
		inset-block-start: 50%;
		transform: translateY(-50%);
		color: var(--person-highlight, var(--pedia-accent-strong));
		font-size: 1.2rem;
		font-weight: 700;
		line-height: 1;
	}

	.pedia-author-civs-accordion[open] .pedia-author-civs-summary > div::before {
		content: "−";
	}

	.pedia-author-overview .pedia-link-row .pedia-button {
		background: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 12%, var(--control-bg));
		border-color: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 34%, var(--border-color));
	}

	.pedia-author-overview .pedia-link-row .pedia-button:hover,
	.pedia-author-overview .pedia-link-row .pedia-button:focus-visible {
		background: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 22%, var(--control-bg)) !important;
		border-color: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 56%, var(--border-color)) !important;
		box-shadow: 0 4px 10px color-mix(in srgb, black 76%, transparent);
	}

	.pedia-collection-link {
		text-shadow: 2px 2px 2px rgb(0, 0, 0 / 0.7);
		background: color-mix(in srgb, var(--collection-background, var(--pedia-accent)) 20%, var(--collection-accent)) !important;
		border-color: color-mix(in srgb, var(--collection-accent, var(--pedia-accent)) 70%, var(--border-color)) !important;
	}

	.pedia-collection-link:hover,
	.pedia-collection-link:focus-visible {
		background: color-mix(in srgb, var(--collection-background, var(--pedia-accent)) 40%, var(--collection-accent)) !important;
		border-color: color-mix(in srgb, var(--collection-accent, var(--pedia-accent)) 90%, var(--border-color)) !important;
		box-shadow: 0x 1px 2px color-mix(in srgb, black 45%, transparent);
	}

	.pedia-catalog-row {
		position: relative;
		--catalog-accent: var(--pedia-accent);
		--catalog-surface: var(--pedia-panel-soft);
		--catalog-backdrop-image: none;
		display: grid;
		grid-template-columns: minmax(20rem, 26rem) minmax(0, 1fr);
		gap: 2rem;
		align-items: flex-end;
		inline-size: 100%;
		padding: 1.25rem;
		color: var(--ink);
		font: inherit;
		text-align: left;
		text-decoration: none;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--catalog-accent) 75%, transparent) 0%, transparent 30%),
			linear-gradient(145deg, color-mix(in srgb, var(--catalog-surface) 65%, var(--pedia-panel-soft)) 0%, color-mix(in srgb, var(--catalog-surface) 20%, #16110f) 100%);
		border: 2px solid color-mix(in srgb, var(--catalog-accent) 60%, var(--border-color));
		border-radius: 1rem;
		overflow: clip;
		cursor: pointer;
		transition:
			transform 150ms ease,
			background 150ms ease,
			border-color 150ms ease,
			box-shadow 150ms ease;
	}

	.pedia-catalog-row::before {
		content: "";
		position: absolute;
		inset: 0;
		z-index: 0;
		background-image: var(--catalog-backdrop-image);
		background-position: center;
		background-repeat: no-repeat;
		background-size: cover;
		filter: grayscale(0.3) saturate(0.75) brightness(0.38);
		opacity: 0.38;
		transform: scale(1.02);
		pointer-events: none;
	}

	.pedia-catalog-row:hover {
		border-color: color-mix(in srgb, var(--catalog-accent) 75%, var(--border-color));
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--catalog-accent) 75%, transparent) 0%, transparent 30%),
			linear-gradient(145deg, color-mix(in srgb, var(--catalog-surface) 85%, var(--pedia-panel-soft)) 0%, color-mix(in srgb, var(--catalog-surface) 14%, #16110f) 100%);
	}

	.pedia-catalog-row > * {
		position: relative;
		z-index: 1;
	}

	.pedia-catalog-row-main {
		min-inline-size: 0;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 1rem;
		align-items: center;
	}

	.pedia-catalog-icon-wrap {
		display: grid;
		place-items: center;
	}

	.pedia-catalog-icon {
		display: grid;
		place-items: center;
		inline-size: 7rem;
		block-size: 7rem;
		overflow: clip;
		filter: drop-shadow(2px 2px 3px color-mix(in srgb, var(--catalog-accent) 30%, #000));
	}

	.pedia-catalog-icon img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: contain;
	}

	.pedia-catalog-icon span {
		color: color-mix(in srgb, var(--catalog-accent) 60%, white);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1.35rem;
	}

	.pedia-catalog-civ-title {
		max-inline-size: 20rem;
		color: color-mix(in srgb, white 95%, var(--catalog-accent));
		font-size: clamp(1.5rem, 2.2vw, 2.25rem);
		line-height: 1.05;
		text-wrap: balance;
		margin: 0;
	}

	.pedia-catalog-meta {
		color: var(--muted-ink);
	}

	.pedia-catalog-meta span {
		margin: 0;
	}

	.pedia-catalog-meta strong {
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		margin-inline-end: 0.35rem;
	}

	.leader-name {
		color: #fff;
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.pedia-catalog-row-details {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		align-items: stretch;
		margin-block-end: 1rem;
	}

	.pedia-catalog-row-meta {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		display: flex;
		justify-content: flex-end;
	}

	.pedia-catalog-identity * {
		text-shadow: 2px 2px 3px color-mix(in srgb, var(--catalog-accent) 40%, #000);
	}

	.pedia-catalog-detail-card {
		padding: 0.65rem 0.75rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--catalog-surface) 10%, var(--pedia-panel)) 0%, color-mix(in srgb, var(--catalog-surface) 10%, #111) 100%);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 80%, transparent),
			1px 2px 2px color-mix(in srgb, #000 60%, transparent);
		border-radius: 0.75rem;
	}

	.pedia-catalog-collection-pills {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.35rem;
	}

	.pedia-catalog-collection-pill {
		--collection-accent: var(--pedia-accent);
		--collection-background: var(--pedia-panel-soft);
		color: color-mix(in srgb, white 90%, var(--ink));
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-overflow: ellipsis;
		text-transform: uppercase;
		text-shadow: 1px 1px 2px color-mix(in srgb, var(--collection-accent) 20%, #000);
		text-box: trim-both cap alphabetic;
		white-space: nowrap;
		background: linear-gradient(160deg, color-mix(in srgb, var(--collection-background) 80%, black 20%) 0%, color-mix(in srgb, var(--collection-accent) 20%, var(--collection-background)) 100%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--collection-accent) 85%, transparent);
		border-radius: 999px;
		padding: 0.5rem 0.65rem;
	}

	.pedia-catalog-detail-card strong {
		color: color-mix(in srgb, white 95%, var(--ink));
		font-size: 1rem;
		line-height: 1.35;
	}

	.pedia-search {
		inline-size: 100%;
		color: var(--ink);
		font: inherit;
		background: color-mix(in srgb, var(--input-bg) 90%, black 10%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 28%, var(--border-color));
		border-radius: 0.85rem;
		padding: 0.8rem 0.95rem;
	}

	.pedia-link-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pedia-credit-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		color: var(--ink);
		text-align: start;
		text-decoration: none;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 30%, transparent) 0%, transparent 45%),
			linear-gradient(165deg, color-mix(in srgb, var(--pedia-panel) 80%, var(--control-bg)) 0%, color-mix(in srgb, var(--pedia-panel-soft) 95%, #16110f 5%) 100%);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 40%, var(--border-color));
		border-radius: 1rem;
		padding: 2rem 1.5rem;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			background 150ms ease,
			box-shadow 150ms ease;
	}

	.pedia-credit-card:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 45%, var(--border-color));
		box-shadow: 0 6px 8px color-mix(in srgb, black 75%, transparent);
	}

	.pedia-template-ref-row {
		margin-block-start: 0.9rem;
	}

	.pedia-template-ref {
		color: var(--ink);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-decoration: none;
		text-transform: uppercase;
		background: color-mix(in srgb, var(--pedia-accent) 12%, var(--control-bg));
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 26%, var(--border-color));
		border-radius: 999px;
		padding: 0.45rem 0.65rem;
	}

	.pedia-unique-head span {
		color: var(--pedia-accent-strong);
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-unique-pedia {
		display: grid;
		gap: 0.7rem;
		margin-block-start: 0.85rem;
		padding-block-start: 0.85rem;
		border-top: 1px solid color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
	}

	/*.pedia-unique-pedia > summary {
		list-style: none;
		background: none;
		padding: 0;
	}*/

	/*.pedia-unique-pedia > summary::-webkit-details-marker {
		display: none;
	}*/

	/*.pedia-unique-pedia > summary::marker {
		content: "";
	}*/

	.pedia-unique-pedia-summary {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		color: var(--pedia-accent-strong);
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.pedia-unique-pedia-body {
		display: grid;
		gap: 0.75rem;
	}

	.pedia-media-placeholder {
		display: grid;
		place-items: center;
		gap: 0.45rem;
		inline-size: 100%;
		block-size: 100%;
		color: var(--pedia-accent-strong);
		text-align: center;
		padding: 1rem;
	}

	.pedia-media-placeholder strong {
		font-family: "Rockwell", "Palatino Linotype", serif;
	}

	.pedia-media-placeholder span {
		color: var(--pedia-accent-strong);
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.pedia-list-copy {
		display: grid;
		gap: 0.45rem;
		padding-inline-start: 1rem;
	}

	.pedia-prose-disclosure {
		display: grid;
		gap: 0.45rem;
	}

	.pedia-prose-summary {
		display: grid;
		gap: 0.45rem;
		cursor: pointer;
		list-style: none;
		background: none;
		padding-inline-start: 0;
	}

	.pedia-prose-summary::marker {
		display: none;
		content: "";
	}

	.pedia-prose-disclosure[open] .pedia-prose-summary {
		background-image: none;
	}

	.pedia-prose-summary::-webkit-details-marker {
		display: none;
	}

	.pedia-prose-summary :global(.pedia-prose-clamp) {
		display: -webkit-box;
		overflow: hidden;
		-webkit-line-clamp: 6;
		-webkit-box-orient: vertical;
	}

	.pedia-prose-toggle-row {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		align-self: start;
	}

	.pedia-prose-toggle-more,
	.pedia-prose-toggle-less {
		color: var(--pedia-accent-strong);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-prose-toggle-less {
		display: none;
	}

	.pedia-prose-toggle-icon {
		color: var(--pedia-accent-strong);
		font-size: 0.9rem;
		line-height: 1;
		transform: translateY(-1px);
		transition: transform 150ms ease;
	}

	.pedia-prose-disclosure[open] .pedia-prose-summary :global(.pedia-prose-clamp) {
		display: none;
	}

	.pedia-prose-disclosure[open] .pedia-prose-toggle-more {
		display: none;
	}

	.pedia-prose-disclosure[open] .pedia-prose-toggle-less {
		display: inline;
	}

	.pedia-prose-disclosure[open] .pedia-prose-toggle-icon {
		transform: rotate(180deg);
	}

	.pedia-prose-expanded :global(.card-copy) {
		margin: 0;
	}

	.pedia-prose-paragraphs {
		display: grid;
		gap: 0.9rem;
	}

	.pedia-prose-paragraphs .card-copy {
		margin: 0;
	}

	.pedia-button {
		color: var(--ink);
		font: inherit;
		font-weight: 700;
		text-decoration: none;
		text-wrap: nowrap;
		background: color-mix(in srgb, var(--pedia-accent) 18%, var(--control-bg));
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 40%, var(--border-color));
		border-radius: 0.8rem;
		padding: 0.7rem 1rem;
	}

	.pedia-button:hover,
	.pedia-button:focus-visible {
		background: color-mix(in srgb, var(--pedia-accent) 24%, var(--control-bg));
		border-color: color-mix(in srgb, var(--pedia-accent) 58%, var(--border-color));
		box-shadow: 0 2px 2px color-mix(in srgb, black 70%, transparent);
		transform: translateY(-1px);
	}

	.pedia-button.pedia-button-secondary {
		background: color-mix(in srgb, var(--pedia-panel) 94%, black 6%);
	}

	.pedia-button.pedia-button-danger {
		background: color-mix(in srgb, oklch(0.5 0.25 30) 20%, var(--control-bg));
		border-color: color-mix(in srgb, oklch(0.8 0.2 30) 60%, var(--border-color));
	}

	.pedia-entry-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.pedia-editor-panel {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pedia-accent) 18%, transparent) 0%, transparent 42%),
			linear-gradient(165deg, color-mix(in srgb, var(--pedia-panel-soft) 98%, var(--control-bg)) 0%, color-mix(in srgb, var(--pedia-panel-soft) 93%, #16110f 7%) 100%);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-catalog-shell {
		block-size: auto;
		max-block-size: none;
		overflow: visible;
	}

	.pedia-wiki {
		display: grid;
		gap: 1.25rem;
	}

	.pedia-wiki-layout {
		display: grid;
		gap: 1.25rem;
		grid-template-columns: minmax(0, 1fr) minmax(17rem, 21rem);
		align-items: start;
	}

	.pedia-wiki-main,
	.pedia-wiki-section,
	.pedia-infobox,
	.pedia-infobox-rows,
	.pedia-credit-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		& .section-title {
			font-size: 1.75rem;
		}
	}

	.pedia-wiki-main {
		gap: 3rem;
	}

	.pedia-credit-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.65rem;
	}

	.pedia-copy-card,
	.pedia-list-panel,
	.pedia-credit-card,
	.pedia-infobox,
	.pedia-support-table,
	.pedia-figure-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		border-radius: 1rem;
		/*padding-block: 1rem;*/

		& .card-title {
			font-size: 1.25rem;
		}
	}

	.pedia-credit-card {
		padding: 0.8rem 0.95rem;
	}

	.pedia-credit-card-button {
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.pedia-credit-card .card-title {
		font-size: 1rem;
		color: color-mix(in srgb, var(--ink) 78%, var(--person-highlight, var(--pedia-accent)) 22%);
	}

	.pedia-credit-card .card-copy {
		font-size: 0.82rem;
	}

	.pedia-collection-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.75rem;
	}

	.pedia-collection-grid-catalog {
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
	}

	.pedia-collection-card {
		--collection-accent: var(--pedia-accent);
		--collection-background: var(--pedia-panel-soft);
		display: grid;
		gap: 0.4rem;
		color: var(--ink);
		font: inherit;
		text-align: left;
		text-decoration: none;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--collection-accent) 30%, transparent) 0%, transparent 42%),
			linear-gradient(150deg, color-mix(in srgb, var(--collection-background) 88%, var(--pedia-panel-soft)) 0%, color-mix(in srgb, var(--collection-background) 28%, #16110f) 100%);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--collection-accent) 32%, var(--border-color)),
			var(--pedia-shadow-soft);
		border: 0;
		border-radius: 1rem;
		padding: 1rem;
		cursor: pointer;

		& .card-title {
			font-size: 1.15rem;
		}
	}

	.pedia-collection-card-catalog {
		align-content: start;
	}

	.pedia-collection-editor {
		padding: 1rem;
		background: color-mix(in srgb, var(--pedia-panel-soft) 92%, black 8%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
	}

	.pedia-category-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.pedia-category-editor-input-row {
		display: grid;
		gap: 0.8rem;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
	}

	.pedia-category-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--ink);
		font: inherit;
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-decoration: none;
		background: color-mix(in srgb, var(--pedia-panel-soft) 88%, var(--control-bg));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 18%, var(--border-color));
		border: 0;
		border-radius: 999px;
		padding: 0.65rem 0.9rem;
		cursor: pointer;
	}

	.pedia-category-chip strong {
		color: var(--pedia-accent-strong);
		font-size: 0.76rem;
		letter-spacing: 0.08em;
	}

	.pedia-category-chip.is-static {
		cursor: default;
	}

	.pedia-author-works {
		gap: 0.7rem;
	}

	.pedia-author-work {
		--catalog-accent: var(--pedia-accent);
		--catalog-surface: var(--pedia-panel-soft);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.85rem;
		align-items: center;
		inline-size: 100%;
		color: var(--ink);
		font: inherit;
		text-align: left;
		text-decoration: none;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--catalog-accent) 40%, transparent) 0%, transparent 35%),
			linear-gradient(145deg, color-mix(in srgb, var(--catalog-surface) 65%, var(--pedia-panel)) 0%, color-mix(in srgb, var(--catalog-surface) 20%, #121212) 100%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 35%, var(--border-color));
		border: 0;
		border-radius: 1rem;
		padding: 1.1rem 1rem;
		cursor: pointer;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background 150ms ease;
	}

	.pedia-author-work:hover {
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 60%, var(--border-color)),
			0 4px 6px color-mix(in srgb, black 80%, transparent);
	}

	.pedia-author-work.is-current {
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 28%, var(--border-color)),
			0 0 0 1px color-mix(in srgb, var(--catalog-accent) 18%, transparent);
	}

	.pedia-list-panel-summary {
		cursor: pointer;
		list-style: none;
	}

	.pedia-list-panel-summary::-webkit-details-marker {
		display: none;
	}

	.pedia-author-work-icon {
		display: grid;
		place-items: center;
		inline-size: 5rem;
		block-size: 5rem;
		flex: 0 0 auto;
	}

	.pedia-author-work-icon img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: contain;
		filter: drop-shadow(1px 1px 4px color-mix(in srgb, var(--catalog-accent) 20%, #000));
	}

	.pedia-author-work-icon span {
		color: color-mix(in srgb, var(--catalog-accent) 72%, white);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1rem;
	}

	.pedia-author-work-copy .card-title {
		font-size: 1.25rem;
		text-shadow: 1px 1px 2px color-mix(in srgb, var(--catalog-accent) 40%, #000);
	}

	.pedia-author-work-copy .card-copy {
		margin: 0;
		text-shadow: 1px 1px 2px color-mix(in srgb, var(--catalog-accent) 40%, #000);
	}

	.pedia-author-work-meta {
		color: var(--muted-ink);
		font-size: 0.9rem;
	}

	.pedia-author-work-meta span {
		font-weight: 500;
		text-box: trim-both cap alphabetic;
		text-shadow: 1px 1px 1px #000;
		background: color-mix(in srgb, var(--catalog-accent) 40%, transparent);
		border: 1px solid color-mix(in srgb, var(--catalog-accent) 90%, transparent);
		border-radius: 0.5rem;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 12%, transparent);
		padding: 0.4rem 0.5rem;
	}

	.pedia-author-work-pill {
		color: color-mix(in srgb, white 85%, var(--catalog-accent));
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-shadow: 1px 1px 1px color-mix(in srgb, var(--catalog-accent) 20%, #000);
	}

	.pedia-name-list {
		display: grid;
		gap: 0.35rem;
		padding-inline-start: 2rem;
		margin: 0;
	}

	.pedia-entry-support-grid {
		gap: 2rem;
	}

	.pedia-copy-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.pedia-music-embed {
		overflow: hidden;
		border-radius: 0.9rem;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
	}

	.pedia-music-embed iframe {
		display: block;
		inline-size: 100%;
		aspect-ratio: 16 / 9;
		border: 0;
	}

	.pedia-music-preview {
		position: relative;
		display: grid;
		padding: 0;
		overflow: hidden;
		border: 0;
		border-radius: 0.9rem;
		cursor: pointer;
		background: color-mix(in srgb, var(--pedia-panel-soft) 90%, black 10%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 18%, var(--border-color));
	}

	.pedia-music-preview img {
		display: block;
		inline-size: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		opacity: 0.82;
	}

	.pedia-music-preview-copy {
		position: absolute;
		inset: auto 0 0;
		display: grid;
		gap: 0.2rem;
		padding: 0.9rem;
		color: var(--ink);
		text-align: left;
		background: linear-gradient(180deg, transparent 0%, color-mix(in srgb, black 78%, transparent) 38%, color-mix(in srgb, black 88%, transparent) 100%);
	}

	.pedia-music-preview-copy strong {
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-music-preview-copy span {
		font-size: 0.88rem;
	}

	.pedia-figure-card {
		min-inline-size: 0;
		margin: 0;
	}

	.pedia-figure-card img {
		inline-size: 100%;
		border-radius: 0.8rem;
		object-fit: contain;
		align-self: flex-start;
	}

	.pedia-figure-card figcaption {
		color: var(--muted-ink);
		font-size: 0.88rem;
	}

	.pedia-unique-list {
		display: grid;
		gap: 1.5rem;
	}

	.pedia-unique-row {
		display: grid;
		gap: 1.5rem;
		grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
		align-items: start;
	}

	.pedia-unique-figure,
	.pedia-infobox-media {
		overflow: hidden;
		/*background: color-mix(in srgb, var(--pedia-panel) 84%, black 16%);*/
		/*box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));*/
		border-radius: 1rem;
	}

	.pedia-unique-figure {
		aspect-ratio: 1;
	}

	.pedia-unique-art-credit {
		margin-block: 0;
		text-align: center;
	}

	.pedia-unique-figure img,
	.pedia-infobox-media img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: contain;
		border-radius: 1.5rem;
		filter: drop-shadow(2px 2px 4px rgb(0 0 0 / 0.5));
		overflow: clip;
	}

	.pedia-infobox {
		--infobox-accent: var(--pedia-accent);
		--infobox-surface: var(--pedia-panel-soft);
		position: sticky;
		inset-block-start: 1rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--infobox-accent) 30%, transparent) 0%, transparent 42%),
			linear-gradient(165deg, color-mix(in srgb, var(--infobox-surface) 40%, var(--pedia-panel)) 0%, color-mix(in srgb, var(--pedia-panel) 85%, black 15%) 100%);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--infobox-accent) 24%, var(--border-color)),
			0 4px 6px color-mix(in srgb, black 50%, transparent);
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-infobox-media {
		min-block-size: 13rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--infobox-accent) 22%, transparent) 0%, transparent 40%),
			linear-gradient(180deg, color-mix(in srgb, var(--infobox-surface) 22%, var(--pedia-panel)) 0%, color-mix(in srgb, var(--pedia-panel) 88%, black 12%) 100%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--infobox-accent) 22%, var(--border-color));
	}

	.pedia-infobox-caption {
		margin-block: 0;
	}

	.pedia-infobox-row {
		display: grid;
		gap: 0.4rem;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		padding-block: 0.55rem;
		border-block-end: 1px solid color-mix(in srgb, var(--infobox-accent) 20%, var(--border-color));

		&:has(.pedia-infobox-values) {
			align-items: flex-start;
		}
	}

	.pedia-infobox-row:last-child,
	.pedia-support-row:last-child {
		padding-block-end: 0;
		border-block-end: 0;
	}

	.pedia-infobox-row strong,
	.pedia-support-row strong {
		color: color-mix(in srgb, var(--ink) 80%, var(--infobox-accent) 20%);
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-infobox-row span {
		color: var(--muted-ink);
		text-align: end;
	}

	.pedia-infobox-values {
		display: grid;
		gap: 0.2rem;
		justify-items: end;
	}

	.pedia-infobox-values span {
		display: block;
	}

	@media (max-width: 1100px) {
		.pedia-converter-grid,
		.pedia-copy-grid,
		.pedia-wiki-layout,
		.pedia-unique-row,
		.pedia-dawn-layout {
			grid-template-columns: 1fr;
		}

		.pedia-infobox {
			position: static;
		}

		.pedia-catalog-row {
			grid-template-columns: 1fr;
		}

		.pedia-catalog-row-details {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.pedia-toolbar {
			grid-template-columns: 1fr;
			align-items: start;
		}

		.pedia-toolbar-actions {
			inline-size: 100%;
			justify-content: stretch;
		}

		.pedia-search {
			flex: 1 1 auto;
		}
	}

	@media (max-width: 720px) {
		.pedia-hero,
		.pedia-toolbar,
		.pedia-catalog-shell,
		.pedia-wiki,
		.pedia-converter-shell {
			padding: 1rem;
		}

		.pedia-entry-toolbar,
		.pedia-toolbar-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.pedia-view-switch {
			inline-size: 100%;
			justify-content: stretch;
		}

		.pedia-view-chip {
			flex: 1 1 0;
			text-align: center;
		}

		.pedia-preview-grid {
			grid-template-columns: 1fr;
		}

		.pedia-catalog-group-head {
			flex-direction: column;
			align-items: start;
		}

		.pedia-wiki-header-row {
			grid-template-columns: 1fr;
			justify-items: start;
		}

		.pedia-wiki-header h2 {
			font-size: 2rem;
		}

		.civ-icon {
			inline-size: 5.5rem;
			block-size: 5.5rem;
		}

		.pedia-catalog-row {
			padding: 0.95rem;
			gap: 0.85rem;
		}

		.pedia-catalog-row-main {
			grid-template-columns: 1fr;
			justify-items: start;
		}

		.pedia-catalog-icon {
			inline-size: 4.8rem;
			block-size: 4.8rem;
		}

		.pedia-catalog-civ-title {
			font-size: 1.7rem;
		}

		.leader-name {
			font-size: 1rem;
		}

		.pedia-catalog-row-details {
			grid-template-columns: 1fr;
		}

		.pedia-credit-grid,
		.pedia-name-lists,
		.pedia-support-table,
		.pedia-collection-grid {
			grid-template-columns: 1fr;
		}

		.pedia-figure-card img {
			max-block-size: 22rem;
		}

		.pedia-author-work {
			grid-template-columns: 1fr;
			justify-items: start;
			padding: 0.95rem;
		}

		.pedia-author-work-icon {
			inline-size: 4rem;
			block-size: 4rem;
		}

		.pedia-author-work-meta span {
			inline-size: 100%;
		}

		.pedia-infobox-row {
			grid-template-columns: 1fr;
			align-items: start;
		}

		.pedia-infobox-row span {
			text-align: start;
		}

		.pedia-markup-input,
		.pedia-preview-panel textarea,
		.pedia-json-editor {
			min-block-size: 12rem;
			max-block-size: 22rem;
			padding: 0.85rem;
		}

		.pedia-category-editor-input-row {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 560px) {
		.pedia-page {
			gap: 0.75rem;
		}

		.pedia-wiki-main {
			gap: 2.25rem;
		}

		.pedia-catalog-icon {
			inline-size: 4.25rem;
			block-size: 4.25rem;
		}

		.pedia-catalog-civ-title {
			font-size: 1.45rem;
		}

		.pedia-catalog-detail-card,
		.pedia-credit-card,
		.pedia-editor-panel,
		.pedia-converter-panel,
		.pedia-converter-side-card,
		.pedia-preview-panel,
		.pedia-issues {
			padding: 0.85rem;
		}

		.pedia-unique-row {
			gap: 1rem;
		}

		.pedia-template-ref-row {
			gap: 0.45rem;
		}

		.pedia-unique-figure {
			max-inline-size: 12rem;
		}

		.pedia-name-list {
			padding-inline-start: 1.4rem;
		}
	}
</style>
