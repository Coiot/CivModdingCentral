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
		loadPediaAuthorProfilesFromCloud,
		loadPediaCollectionsFromCloud,
		loadPediaEntriesFromCloud,
		markPediaEntryDeletedInCloud,
		savePediaAuthorProfileToCloud,
		savePediaCollectionToCloud,
		savePediaEntryToCloud,
	} from "../utils/pediaCloud.js";
	import { personHighlightStyle } from "../utils/personHighlights.js";
	import { comparePediaEntriesByTitle } from "../utils/pediaSorting.js";

	const PEDIA_BASE_PATH = "/modded-civs-pedia";
	const CATALOG_MAP_VIEW_URL = "https://www.google.com/maps/d/u/0/viewer?mid=1bfxc1WS-cwFqfKmfeNcNir6z5Hs&ll=-3.81666561775622e-14%2C108.23139769111205&z=1&client=safari";
	const CATALOG_MAP_EMBED_URL = "https://www.google.com/maps/d/embed?mid=1bfxc1WS-cwFqfKmfeNcNir6z5Hs&ll=-3.81666561775622e-14%2C108.23139769111205&z=1";

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
	let cloudAuthorProfiles = $state([]);
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
	let customAuthorProfiles = $state([]);
	let authorProfileEditorOriginalName = $state("");
	let authorProfileEditorName = $state("");
	let authorProfileBlurb = $state("");
	let authorProfileLinks = $state("");
	let authorProfileStatus = $state("");
	let authorProfileSavedAt = $state(0);
	let authorProfileBaseline = $state("");
	let customCollections = $state([]);
	let pediaCloudLoadKey = $state("");
	let newCollectionTitle = $state("");
	let newCollectionId = $state("");
	let newCollectionSourceTemplate = $state("");
	let newCollectionBackground = $state("");
	let newCollectionAccent = $state("");
	let newCollectionAliases = $state("");
	let entryStatus = $state("");
	let entrySavedAt = $state(0);
	let entryEditorBaseline = $state("");
	let deletedEntryIds = $state([]);
	let folderInputEl = $state();
	let jsonInputEl = $state();
	let activeMusicPreviewKey = $state("");
	let failedImageUrls = $state([]);
	let catalogMapLoaded = $state(false);
	let collectionEditorSavedAt = $state(0);
	let collectionEditorBaseline = $state("");
	let collectionMetadataSavedAt = $state(0);
	let collectionMetadataBaseline = $state("");
	let categoryEditorSavedAt = $state(0);
	let categoryEditorBaseline = $state("");
	let statusClock = $state(Date.now());
	const cloudPediaConfigured = $derived(Boolean(authEnabled) && hasPediaCloudConfig());
	const authUsernameKey = $derived(authorProfileKey(String(authUser?.username || "").trim()));

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

	function mergeEntries({ builtinEntries = [], cloudEntries = [], importedEntries = [] } = {}) {
		const byId = new Map();
		const isLocalEditorHost = typeof window !== "undefined" && ["localhost", "127.0.0.1", "::1"].includes(String(window.location.hostname || "").toLowerCase());
		const mergedSources = isLocalEditorHost
			? [...(cloudEntries || []).filter(Boolean), ...(builtinEntries || []).filter(Boolean), ...(importedEntries || []).filter(Boolean)]
			: [...(builtinEntries || []).filter(Boolean), ...(cloudEntries || []).filter(Boolean), ...(importedEntries || []).filter(Boolean)];
		for (const entry of mergedSources) {
			const normalized = normalizePediaEntry(entry);
			const existing = byId.get(normalized.id);
			if (existing) {
				normalized.meta = {
					...existing.meta,
					...normalized.meta,
					createdAt: String(normalized?.meta?.createdAt || existing?.meta?.createdAt || "").trim(),
					updatedAt: String(normalized?.meta?.updatedAt || existing?.meta?.updatedAt || "").trim(),
					createdByName: String(normalized?.meta?.createdByName || existing?.meta?.createdByName || "").trim(),
					updatedByName: String(normalized?.meta?.updatedByName || existing?.meta?.updatedByName || "").trim(),
					unresolvedTemplates: normalized?.meta?.unresolvedTemplates?.length > 0 ? normalized.meta.unresolvedTemplates : existing?.meta?.unresolvedTemplates || [],
				};
			}
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

	function normalizeMultilineText(value) {
		return String(value || "").replace(/\r\n?/g, "\n");
	}

	function serializeValue(value) {
		return JSON.stringify(value);
	}

	function serializeAuthorProfileDraft(name, blurb, linksText) {
		return serializeValue({
			name: String(name || "").trim(),
			blurb: normalizeMultilineText(blurb).trim(),
			links: normalizeMultilineText(linksText).trim(),
		});
	}

	function serializeCollectionDraft(collections) {
		return serializeValue((collections || []).map((collection) => String(collection?.id || "").trim()));
	}

	function serializeCategoryDraft(categories) {
		return serializeValue((categories || []).map((category) => normalizeCategoryValue(category)));
	}

	function serializeCollectionMetadataDraftValue(source = {}) {
		return serializeValue({
			title: String(source.title || "").trim(),
			id: String(source.id || "").trim(),
			sourceTemplate: String(source.sourceTemplate || "").trim(),
			blurb: normalizeMultilineText(source.blurb).trim(),
			imageURL: String(source.imageURL || "").trim(),
			background: String(source.background || "").trim(),
			accent: String(source.accent || "").trim(),
			aliases: normalizeMultilineText(source.aliases).trim(),
			links: normalizeMultilineText(source.links).trim(),
		});
	}

	function isValidHttpUrl(value) {
		try {
			const url = new URL(String(value || "").trim());
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}

	function isValidCollectionId(value) {
		return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || "").trim());
	}

	function collectionIdConflict(id, currentId = "") {
		const nextId = String(id || "").trim();
		const previousId = String(currentId || "").trim();
		return knownCollections.some((collection) => collection.id === nextId && collection.id !== previousId);
	}

	function validateCategoryName(value) {
		const normalized = normalizeCategoryValue(value);
		if (!normalized) {
			return "Category name is required.";
		}
		if (/[\r\n]/.test(String(value || ""))) {
			return "Category names must be a single line.";
		}
		if (!/[a-z0-9]/i.test(normalized)) {
			return "Category names must contain at least one letter or number.";
		}
		if (normalized.length > 80) {
			return "Category names should be 80 characters or fewer.";
		}
		return "";
	}

	function validateAuthorProfileLinksInput(value) {
		const lines = normalizeMultilineText(value)
			.split("\n")
			.map((line) => String(line || "").trim())
			.filter(Boolean);
		for (const line of lines) {
			const parts = line.split("|").map((part) => String(part || "").trim());
			if (parts.length < 2 || !parts[0] || !parts.slice(1).join(" | ")) {
				return 'Author links must use "Label | https://example.com".';
			}
			const href = parts.slice(1).join(" | ").trim();
			if (!isValidHttpUrl(href)) {
				return `Invalid author link URL: ${href}`;
			}
		}
		return "";
	}

	function validateCollectionLinksInput(value) {
		const lines = normalizeMultilineText(value)
			.split("\n")
			.map((line) => String(line || "").trim())
			.filter(Boolean);
		for (const line of lines) {
			const parts = line.split("|").map((part) => String(part || "").trim());
			if (parts.length < 2 || !parts[0] || !parts.slice(1).join(" | ")) {
				return 'Collection links must use "Label | https://example.com".';
			}
			const href = parts.slice(1).join(" | ").trim();
			if (!isValidHttpUrl(href)) {
				return `Invalid collection link URL: ${href}`;
			}
		}
		return "";
	}

	function formatSavedAtTime(value) {
		try {
			return new Intl.DateTimeFormat(undefined, {
				hour: "numeric",
				minute: "2-digit",
			}).format(new Date(value));
		} catch {
			return "";
		}
	}

	function relativeSavedAt(value) {
		const diff = Math.max(0, statusClock - value);
		if (diff < 45_000) {
			return "Saved just now";
		}
		const minutes = Math.round(diff / 60_000);
		if (minutes < 60) {
			return `Saved ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
		}
		const hours = Math.round(minutes / 60);
		if (hours < 24) {
			return `Saved ${hours} hour${hours === 1 ? "" : "s"} ago`;
		}
		const days = Math.round(hours / 24);
		return `Saved ${days} day${days === 1 ? "" : "s"} ago`;
	}

	function statusTimestampText(value) {
		if (!value) {
			return "";
		}
		const time = formatSavedAtTime(value);
		return time ? `${relativeSavedAt(value)} at ${time}.` : `${relativeSavedAt(value)}.`;
	}

	function timestampValue(value) {
		const timestamp = Date.parse(String(value || "").trim());
		return Number.isFinite(timestamp) ? timestamp : 0;
	}

	function entryCreatedTimestamp(entry) {
		return timestampValue(entry?.meta?.createdAt);
	}

	function entryUpdatedTimestamp(entry) {
		return timestampValue(entry?.meta?.updatedAt);
	}

	function formatCatalogTimestamp(value) {
		if (!value) {
			return "";
		}
		return new Intl.DateTimeFormat(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		}).format(new Date(value));
	}

	function buildRecentEntries(entries, getTimestamp, limit = 4) {
		return [...(entries || [])]
			.filter((entry) => getTimestamp(entry))
			.sort((left, right) => getTimestamp(right) - getTimestamp(left))
			.slice(0, limit);
	}

	function applyEntrySaveTimestamps(entry, previousEntry = null) {
		const timestamp = new Date().toISOString();
		const isLocalEditorHost = typeof window !== "undefined" && ["localhost", "127.0.0.1", "::1"].includes(String(window.location.hostname || "").toLowerCase());
		const editorName = String(authUser?.username || (isLocalEditorHost ? "Coiot" : "")).trim();
		return normalizePediaEntry({
			...entry,
			meta: {
				...(entry?.meta || {}),
				createdAt: String(entry?.meta?.createdAt || previousEntry?.meta?.createdAt || timestamp).trim(),
				updatedAt: timestamp,
				createdByName: String(entry?.meta?.createdByName || previousEntry?.meta?.createdByName || editorName).trim(),
				updatedByName: editorName || String(previousEntry?.meta?.updatedByName || "").trim(),
			},
		});
	}

	function recentEntryActorLabel(entry, kind = "updated") {
		const preferredName = String(kind === "created" ? entry?.meta?.createdByName || "" : entry?.meta?.updatedByName || "").trim();
		if (preferredName) {
			return preferredName;
		}

		const fallbackName = String(kind === "created" ? entry?.meta?.updatedByName || "" : entry?.meta?.createdByName || "").trim();
		if (fallbackName) {
			return fallbackName;
		}

		return "User unknown";
	}

	function isEntryEditorDirty() {
		return entryEditorOpen && normalizeMultilineText(entryEditorDraft).trim() !== normalizeMultilineText(entryEditorBaseline).trim();
	}

	function isAuthorProfileDirty() {
		return (
			Boolean(authorProfileEditorOriginalName || authorProfileEditorName) &&
			serializeAuthorProfileDraft(authorProfileEditorName, authorProfileBlurb, authorProfileLinks) !== authorProfileBaseline
		);
	}

	function isCollectionMembershipDirty() {
		return collectionEditorOpen && serializeCollectionDraft(collectionEditorDraft) !== collectionEditorBaseline;
	}

	function isCollectionMetadataDirty() {
		return (
			collectionMetadataEditorOpen &&
			serializeCollectionMetadataDraftValue({
				title: collectionMetadataTitle,
				id: collectionMetadataId,
				sourceTemplate: collectionMetadataSourceTemplate,
				blurb: collectionMetadataBlurb,
				imageURL: collectionMetadataImageURL,
				background: collectionMetadataBackground,
				accent: collectionMetadataAccent,
				aliases: collectionMetadataAliases,
				links: collectionMetadataLinks,
			}) !== collectionMetadataBaseline
		);
	}

	function isCollectionCreatorDirty() {
		return (
			collectionCreatorOpen &&
			Boolean(
				String(newCollectionTitle || "").trim() ||
				String(newCollectionId || "").trim() ||
				String(newCollectionSourceTemplate || "").trim() ||
				String(newCollectionBackground || "").trim() ||
				String(newCollectionAccent || "").trim() ||
				String(newCollectionAliases || "").trim(),
			)
		);
	}

	function isCategoryEditorDirty() {
		return categoryEditorOpen && serializeCategoryDraft(categoryEditorDraft) !== categoryEditorBaseline;
	}

	function dirtyEditorLabels() {
		const labels = [];
		if (isEntryEditorDirty()) {
			labels.push("entry JSON");
		}
		if (isAuthorProfileDirty()) {
			labels.push("author profile");
		}
		if (isCollectionMembershipDirty()) {
			labels.push("collection memberships");
		}
		if (isCollectionMetadataDirty()) {
			labels.push("collection metadata");
		}
		if (isCollectionCreatorDirty()) {
			labels.push("new collection");
		}
		if (isCategoryEditorDirty()) {
			labels.push("categories");
		}
		return labels;
	}

	function confirmDiscardUnsavedChanges() {
		if (typeof window === "undefined") {
			return true;
		}
		const labels = dirtyEditorLabels();
		if (!labels.length) {
			return true;
		}
		return window.confirm(`You have unsaved changes in ${labels.join(", ")}. Leave without saving?`);
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
		return allEntries.filter((candidate) => entryAuthors(candidate).includes(authorName)).sort(comparePediaEntriesByTitle);
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
		return `${PEDIA_BASE_PATH}/civilizations/${slugifyPediaValue(entry?.slug || entry?.title)}`;
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
		if (!options.bypassDirtyCheck && !confirmDiscardUnsavedChanges()) {
			event.preventDefault();
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

	function normalizeAuthorProfileRecord(profile) {
		const name = String(profile?.name || "").trim();
		return {
			id: String(profile?.id || "").trim() || slugifyPediaValue(name),
			name,
			blurb: String(profile?.blurb || "").trim(),
			links: Array.isArray(profile?.links)
				? profile.links
						.map((link) => ({
							label: String(link?.label || "").trim(),
							href: String(link?.href || "").trim(),
						}))
						.filter((link) => link.label && link.href)
				: [],
		};
	}

	function authorProfileLinksText(links = []) {
		return (Array.isArray(links) ? links : [])
			.map((link) => `${String(link?.label || "").trim()} | ${String(link?.href || "").trim()}`)
			.filter(Boolean)
			.join("\n");
	}

	function parseAuthorProfileLinks(value) {
		return String(value || "")
			.split("\n")
			.map((line) => String(line || "").trim())
			.filter(Boolean)
			.map((line) => {
				const parts = line.split(/\s+\|\s+/);
				if (parts.length >= 2) {
					return {
						label: String(parts.shift() || "").trim(),
						href: parts.join(" | ").trim(),
					};
				}
				const urlMatch = line.match(/https?:\/\/\S+/i);
				if (!urlMatch) {
					return { label: "", href: "" };
				}
				const href = urlMatch[0].trim();
				const label = line.slice(0, urlMatch.index).trim();
				return { label, href };
			})
			.filter((link) => link.label && link.href);
	}

	function isEditingAuthorProfile(authorName) {
		return authorProfileKey(authorProfileEditorName) === authorProfileKey(authorName);
	}

	function canEditAuthorProfile(authorName) {
		return Boolean(canEdit && authUsernameKey && authUsernameKey === authorProfileKey(authorName));
	}

	function startEditingAuthorProfile(authorName) {
		if (!canEditAuthorProfile(authorName)) {
			return;
		}
		const profile = normalizeAuthorProfileRecord(authorProfileLookup.get(authorProfileKey(authorName)) || { name: authorName });
		authorProfileEditorOriginalName = profile.name || authorName;
		authorProfileEditorName = profile.name || authorName;
		authorProfileBlurb = profile.blurb;
		authorProfileLinks = authorProfileLinksText(profile.links);
		authorProfileStatus = "";
		authorProfileSavedAt = 0;
		authorProfileBaseline = serializeAuthorProfileDraft(profile.name || authorName, profile.blurb, authorProfileLinksText(profile.links));
	}

	function stopEditingAuthorProfile() {
		authorProfileEditorOriginalName = "";
		authorProfileEditorName = "";
		authorProfileBlurb = "";
		authorProfileLinks = "";
		authorProfileStatus = "";
		authorProfileSavedAt = 0;
		authorProfileBaseline = "";
	}

	async function saveAuthorProfileToLocalProject(profile, options = {}) {
		const response = await fetch("/__local-api/modded-civs-pedia/authors/save", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				profile,
				previousName: options.previousName || "",
			}),
		});

		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload?.ok) {
			throw new Error(payload?.message || "Unable to save author profile.");
		}

		return normalizeAuthorProfileRecord(payload.profile);
	}

	async function saveAuthorProfileDraft() {
		if (!canEditAuthorProfile(authorProfileEditorOriginalName || authorProfileEditorName)) {
			authorProfileStatus = "Your username must match this author name to edit the profile.";
			authorProfileSavedAt = 0;
			return;
		}
		const profile = normalizeAuthorProfileRecord({
			name: authorProfileEditorOriginalName || authorProfileEditorName,
			blurb: authorProfileBlurb,
			links: parseAuthorProfileLinks(authorProfileLinks),
		});
		if (!profile.name) {
			authorProfileStatus = "Author name is required.";
			authorProfileSavedAt = 0;
			return;
		}
		const linksError = validateAuthorProfileLinksInput(authorProfileLinks);
		if (linksError) {
			authorProfileStatus = linksError;
			authorProfileSavedAt = 0;
			return;
		}

		try {
			authorProfileStatus = "Saving author profile...";
			authorProfileSavedAt = 0;
			const previousName = authorProfileEditorOriginalName || authorProfileEditorName;
			const previousProfile = authorProfileLookup.get(authorProfileKey(previousName)) || null;
			const savedProfile = pediaCloudWriteReady
				? await savePediaAuthorProfileToCloud(authAccessToken, profile, {
						previousId: previousProfile?.id || slugifyPediaValue(previousName),
					})
				: await saveAuthorProfileToLocalProject(profile, { previousName });
			if (pediaCloudWriteReady) {
				cloudAuthorProfiles = [...cloudAuthorProfiles.filter((item) => item?.id !== savedProfile.id && item?.id !== previousProfile?.id), savedProfile].sort((left, right) =>
					String(left?.name || "").localeCompare(String(right?.name || "")),
				);
			} else {
				customAuthorProfiles = [
					...customAuthorProfiles.filter((item) => authorProfileKey(item?.name) !== authorProfileKey(savedProfile.name) && authorProfileKey(item?.name) !== authorProfileKey(previousName)),
					savedProfile,
				];
			}
			authorProfileEditorOriginalName = savedProfile.name;
			authorProfileEditorName = savedProfile.name;
			authorProfileBlurb = savedProfile.blurb;
			authorProfileLinks = authorProfileLinksText(savedProfile.links);
			authorProfileStatus = `${savedProfile.name} profile saved.`;
			authorProfileSavedAt = Date.now();
			authorProfileBaseline = serializeAuthorProfileDraft(savedProfile.name, savedProfile.blurb, authorProfileLinksText(savedProfile.links));
		} catch (error) {
			authorProfileStatus = error?.message || "Unable to save author profile.";
			authorProfileSavedAt = 0;
		}
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
		if (normalized.startsWith(`${PEDIA_BASE_PATH}/civilizations/`)) {
			return {
				kind: "entry",
				entrySlug: normalized.slice(`${PEDIA_BASE_PATH}/civilizations/`.length),
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

	const allEntries = $derived.by(() =>
		mergeEntries({
			builtinEntries: BUILTIN_MODDED_CIVS,
			cloudEntries,
			importedEntries,
		}),
	);
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
		for (const profile of [...(Array.isArray(PEDIA_AUTHOR_PROFILES) ? PEDIA_AUTHOR_PROFILES : []), ...(cloudAuthorProfiles || []), ...(customAuthorProfiles || [])]) {
			const name = String(profile?.name || "").trim();
			const key = authorProfileKey(name);
			if (!key) {
				continue;
			}
			byKey.set(key, normalizeAuthorProfileRecord(profile));
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
	const recentAddedEntries = $derived.by(() => buildRecentEntries(filteredEntries, entryCreatedTimestamp));
	const recentUpdatedEntries = $derived.by(() => buildRecentEntries(filteredEntries, entryUpdatedTimestamp));
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
				entries: [...entries].sort(comparePediaEntriesByTitle),
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
		authUsernameKey;
		authorProfileEditorOriginalName;
		if (authorProfileEditorOriginalName && !canEditAuthorProfile(authorProfileEditorOriginalName)) {
			stopEditingAuthorProfile();
		}
	});

	$effect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const intervalId = window.setInterval(() => {
			statusClock = Date.now();
		}, 30_000);
		return () => window.clearInterval(intervalId);
	});

	$effect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const handleBeforeUnload = (event) => {
			if (!dirtyEditorLabels().length) {
				return;
			}
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	});

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
		collectionEditorBaseline = serializeCollectionDraft(selectedEntry?.collections || []);
		collectionEditorSelection = "";
		collectionEditorStatus = "";
		collectionEditorSavedAt = 0;
		newCollectionTitle = "";
		newCollectionId = "";
		newCollectionSourceTemplate = "";
		newCollectionBackground = "";
		newCollectionAccent = "";
		newCollectionAliases = "";
		categoryEditorEntryId = nextEntryId;
		categoryEditorOpen = false;
		categoryEditorDraft = (selectedEntry?.categories || []).map((category) => normalizeCategoryValue(category)).filter(Boolean);
		categoryEditorBaseline = serializeCategoryDraft((selectedEntry?.categories || []).map((category) => normalizeCategoryValue(category)).filter(Boolean));
		categoryEditorInput = "";
		categoryEditorStatus = "";
		categoryEditorSavedAt = 0;
	});

	$effect(() => {
		if (routeState.kind !== "collection" || !selectedCollection) {
			collectionMetadataEditorOpen = false;
			collectionMetadataStatus = "";
			collectionMetadataSavedAt = 0;
			collectionMetadataBaseline = "";
			return;
		}
		hydrateCollectionMetadataDraft(selectedCollection);
		collectionMetadataBaseline = serializeCollectionMetadataDraftValue({
			title: selectedCollection.title,
			id: selectedCollection.id,
			sourceTemplate: selectedCollection.sourceTemplate,
			blurb: selectedCollection.blurb,
			imageURL: selectedCollection.imageURL,
			background: selectedCollection.colors?.background,
			accent: selectedCollection.colors?.accent,
			aliases: (selectedCollection.aliases || []).join("\n"),
			links: serializeCollectionLinks(selectedCollection.links),
		});
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
		if (!options.bypassDirtyCheck && !confirmDiscardUnsavedChanges()) {
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
			const [entryResult, collections, authorProfiles] = await Promise.all([
				loadPediaEntriesFromCloud(authAccessToken),
				loadPediaCollectionsFromCloud(authAccessToken),
				loadPediaAuthorProfilesFromCloud(authAccessToken),
			]);
			cloudEntries = sortModdedCivsEntries(entryResult.entries || []);
			cloudDeletedEntryIds = [...new Set(entryResult.deletedEntryIds || [])];
			cloudCollections = [...(collections || [])].sort((left, right) => String(left?.title || "").localeCompare(String(right?.title || "")));
			cloudAuthorProfiles = [...(authorProfiles || [])].sort((left, right) => String(left?.name || "").localeCompare(String(right?.name || "")));
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
		const previousEntry = allEntries.find((candidate) => candidate.id === nextEntry.id) || null;
		const timestampedEntry = applyEntrySaveTimestamps(nextEntry, previousEntry);

		if (pediaCloudWriteReady) {
			const savedEntry = await savePediaEntryToCloud(authAccessToken, timestampedEntry, wikiMarkup);
			cloudEntries = sortModdedCivsEntries([...cloudEntries.filter((candidate) => candidate.id !== timestampedEntry.id && candidate.id !== savedEntry.id), savedEntry]);
			cloudDeletedEntryIds = cloudDeletedEntryIds.filter((id) => id !== savedEntry.id);
			importedEntries = sortModdedCivsEntries([...importedEntries.filter((candidate) => candidate.id !== timestampedEntry.id && candidate.id !== savedEntry.id), savedEntry]);
			deletedEntryIds = deletedEntryIds.filter((id) => id !== savedEntry.id);
			if (successMessage) {
				entryStatus = successMessage;
			}
			return { ok: true, entry: savedEntry };
		}

		const payload = await saveEntryToLocalProject(timestampedEntry, wikiMarkup);
		importedEntries = sortModdedCivsEntries([...importedEntries.filter((candidate) => candidate.id !== timestampedEntry.id), timestampedEntry]);
		deletedEntryIds = deletedEntryIds.filter((id) => id !== timestampedEntry.id);
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
		entrySavedAt = 0;
		entryEditorDraft = `${JSON.stringify(entry, null, 2)}\n`;
		entryEditorBaseline = entryEditorDraft;
	}

	function stopEditingEntry() {
		entryEditorOpen = false;
		entryEditorDraft = "";
		entryStatus = "";
		entrySavedAt = 0;
		entryEditorBaseline = "";
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
			entrySavedAt = 0;
			openEntry(nextEntry, { replace: true, bypassDirtyCheck: true });
			entryEditorDraft = `${JSON.stringify(nextEntry, null, 2)}\n`;
		} catch (error) {
			entryStatus = error?.message || "Unable to parse entry JSON.";
			entrySavedAt = 0;
		}
	}

	async function saveEditedEntryToProject() {
		try {
			const nextEntry = parseEntryEditorDraft();
			entryStatus = "Saving edited entry...";
			entrySavedAt = 0;
			await saveEntryToProject(nextEntry, renderWikiMarkupFromEntry(nextEntry), `${nextEntry.title} saved to project data.`);
			openEntry(nextEntry, { replace: true, bypassDirtyCheck: true });
			entryEditorDraft = `${JSON.stringify(nextEntry, null, 2)}\n`;
			entryEditorBaseline = entryEditorDraft;
			entrySavedAt = Date.now();
		} catch (error) {
			entryStatus = error?.message || "Unable to save entry.";
			entrySavedAt = 0;
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
			collectionEditorSavedAt = 0;
			await saveEntryToProject(nextEntry, renderWikiMarkupFromEntry(nextEntry), "");
			collectionEditorStatus = `${nextEntry.title} collection memberships saved.`;
			collectionEditorBaseline = serializeCollectionDraft(collectionEditorDraft);
			collectionEditorSavedAt = Date.now();
		} catch (error) {
			collectionEditorStatus = error?.message || "Unable to save collection memberships.";
			collectionEditorSavedAt = 0;
		}
	}

	function toggleCollectionEditor() {
		collectionEditorOpen = !collectionEditorOpen;
		if (collectionEditorOpen) {
			collectionEditorBaseline = serializeCollectionDraft(collectionEditorDraft);
			collectionEditorSavedAt = 0;
		}
		if (!collectionEditorOpen) {
			collectionCreatorOpen = false;
			collectionEditorSelection = "";
			collectionEditorStatus = "";
			collectionEditorSavedAt = 0;
			collectionEditorBaseline = "";
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
		const validationError = validateCategoryName(categoryEditorInput);
		if (validationError) {
			categoryEditorStatus = validationError;
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
			categoryEditorSavedAt = 0;
			await saveEntryToProject(nextEntry, renderWikiMarkupFromEntry(nextEntry), "");
			categoryEditorStatus = `${nextEntry.title} categories saved.`;
			categoryEditorBaseline = serializeCategoryDraft(categoryEditorDraft);
			categoryEditorSavedAt = Date.now();
		} catch (error) {
			categoryEditorStatus = error?.message || "Unable to save categories.";
			categoryEditorSavedAt = 0;
		}
	}

	function toggleCategoryEditor() {
		categoryEditorOpen = !categoryEditorOpen;
		if (categoryEditorOpen) {
			categoryEditorBaseline = serializeCategoryDraft(categoryEditorDraft);
			categoryEditorSavedAt = 0;
		}
		if (!categoryEditorOpen) {
			categoryEditorInput = "";
			categoryEditorStatus = "";
			categoryEditorSavedAt = 0;
			categoryEditorBaseline = "";
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
		if (collectionMetadataEditorOpen && selectedCollection) {
			collectionMetadataSavedAt = 0;
			collectionMetadataBaseline = serializeCollectionMetadataDraftValue({
				title: collectionMetadataTitle,
				id: collectionMetadataId,
				sourceTemplate: collectionMetadataSourceTemplate,
				blurb: collectionMetadataBlurb,
				imageURL: collectionMetadataImageURL,
				background: collectionMetadataBackground,
				accent: collectionMetadataAccent,
				aliases: collectionMetadataAliases,
				links: collectionMetadataLinks,
			});
		}
		if (!collectionMetadataEditorOpen) {
			collectionMetadataStatus = "";
			collectionMetadataSavedAt = 0;
			collectionMetadataBaseline = "";
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
		const rawId = String(collectionMetadataId || title).trim();
		const id = slugifyPediaValue(rawId);
		const background = String(collectionMetadataBackground || "").trim();
		const accent = String(collectionMetadataAccent || "").trim();
		const aliases = [
			title,
			...String(collectionMetadataAliases || "")
				.split(/\n|,/)
				.map((item) => String(item || "").trim())
				.filter(Boolean),
		].filter((value, index, array) => array.indexOf(value) === index);
		const collectionLinksError = validateCollectionLinksInput(collectionMetadataLinks);
		const links = String(collectionMetadataLinks || "")
			.split("\n")
			.map((line) => String(line || "").trim())
			.filter(Boolean)
			.map((line) => {
				const parts = line.split("|").map((part) => String(part || "").trim());
				return {
					label: parts[0],
					href: parts.slice(1).join(" | ").trim(),
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
		if (!isValidCollectionId(id)) {
			collectionMetadataStatus = "Collection ids must use lowercase letters, numbers, and hyphens only.";
			return;
		}
		if (collectionIdConflict(id, selectedCollection.id)) {
			collectionMetadataStatus = `${id} is already used by another collection.`;
			return;
		}
		if (!isValidHexColor(background) || !isValidHexColor(accent)) {
			collectionMetadataStatus = "Collection background and accent colors must be valid hex values.";
			return;
		}
		if (collectionLinksError) {
			collectionMetadataStatus = collectionLinksError;
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
			collectionMetadataSavedAt = 0;
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
			collectionMetadataSavedAt = Date.now();
			collectionMetadataBaseline = serializeCollectionMetadataDraftValue({
				title: savedCollection.title,
				id: savedCollection.id,
				sourceTemplate: savedCollection.sourceTemplate,
				blurb: savedCollection.blurb,
				imageURL: savedCollection.imageURL,
				background: savedCollection.colors?.background,
				accent: savedCollection.colors?.accent,
				aliases: (savedCollection.aliases || []).join("\n"),
				links: serializeCollectionLinks(savedCollection.links),
			});
			if (collection.id !== selectedCollection.id) {
				navigate?.(collectionPath(savedCollection), { replace: true });
			}
		} catch (error) {
			collectionMetadataStatus = error?.message || "Unable to save collection.";
			collectionMetadataSavedAt = 0;
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
		const rawId = String(newCollectionId || title).trim();
		const id = slugifyPediaValue(rawId);
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
		if (!isValidCollectionId(id)) {
			collectionEditorStatus = "Collection ids must use lowercase letters, numbers, and hyphens only.";
			return;
		}
		if (collectionIdConflict(id)) {
			collectionEditorStatus = `${id} is already used by another collection.`;
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
			collectionEditorSavedAt = 0;
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
			collectionEditorSavedAt = Date.now();
		} catch (error) {
			collectionEditorStatus = error?.message || "Unable to save collection.";
			collectionEditorSavedAt = 0;
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

	function showCatalog(options = {}) {
		if (!options.bypassDirtyCheck && !confirmDiscardUnsavedChanges()) {
			return;
		}
		stopEditingEntry();
		activeView = "catalog";
		selectedEntryId = "";
		authorFilterName = "";
		navigate?.(PEDIA_BASE_PATH);
	}

	function showConverter(options = {}) {
		if (!canEdit) {
			return;
		}
		if (!options.bypassDirtyCheck && !confirmDiscardUnsavedChanges()) {
			return;
		}
		stopEditingEntry();
		activeView = "converter";
		selectedEntryId = "";
		navigate?.(PEDIA_BASE_PATH);
	}

	function clearAuthorFilter(options = {}) {
		if (!options.bypassDirtyCheck && !confirmDiscardUnsavedChanges()) {
			return;
		}
		authorFilterName = "";
		selectedEntryId = "";
		activeView = "catalog";
		searchQuery = "";
		navigate?.(PEDIA_BASE_PATH);
	}

	function filterCatalogByAuthor(name, options = {}) {
		const nextAuthor = String(name || "").trim();
		if (!nextAuthor) {
			return;
		}
		if (!options.bypassDirtyCheck && !confirmDiscardUnsavedChanges()) {
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

	function entryPresentationColor(entry, key) {
		return String(entry?.presentation?.colors?.[key] || "")
			.trim()
			.toUpperCase();
	}

	function infoboxColorSwatch(value) {
		const match = String(value || "")
			.trim()
			.match(/(#[0-9A-F]{3,8})$/i);
		return match ? match[1].toUpperCase() : "";
	}

	function infoboxRows(entry) {
		const backgroundColor = entryPresentationColor(entry, "background");
		const iconColor = entryPresentationColor(entry, "icon");
		const colorValues = [...(backgroundColor ? [`Icon: ${iconColor}`] : []), ...(backgroundColor ? [`Background: ${backgroundColor}`] : [])];

		return [
			{ label: "Leader", value: entry?.leader || "Unknown" },
			{ label: "Capital", value: entry?.identity?.capital || "Unknown" },
			{ label: "Empire", value: entry?.identity?.empireName || "Unknown" },
			{ label: "Adjective", value: entry?.identity?.adjectives || "Unknown" },
			{ label: "Bias", value: entry?.identity?.bias || "Unknown" },
			{ label: "Religion", value: entryReligionLabel(entry), values: entryReligionValues(entry) },
			{ label: "Government", value: entry?.identity?.government || "Unknown" },
			{ label: "Culture", value: entry?.identity?.culture || "Unknown" },
			...(colorValues.length ? [{ label: "Colors", value: colorValues.join(", "), values: colorValues }] : []),
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
			<h1>Browse Community Mods</h1>
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
				{#if recentAddedEntries.length || recentUpdatedEntries.length}
					<section class="pedia-catalog-activity-grid" aria-label="Recent pedia activity">
						{#if recentAddedEntries.length}
							<article class="pedia-catalog-activity-panel stack quarter">
								<div class="pedia-catalog-group-head">
									<div class="stack quarter">
										<p class="eyebrow">Recently Added</p>
									</div>
								</div>

								<div class="pedia-catalog-activity-list" role="list">
									{#each recentAddedEntries as entry (entry.id)}
										<a
											class="pedia-catalog-activity-item"
											href={entryPath(entry)}
											style={catalogRowStyle(entry)}
											onclick={(event) => handleRouteAnchorClick(event, entryPath(entry))}
										>
											<div class="pedia-catalog-activity-main min-inline-size-0">
												<strong class="card-title text-box-trim">{entry.title}</strong>
												<p class="card-copy text-box-trim">{entry.leader}</p>
											</div>
											<div class="pedia-catalog-activity-meta">
												<strong class="pedia-catalog-activity-date">{formatCatalogTimestamp(entry.meta?.createdAt)}</strong>
												<p class="card-copy text-box-trim">{recentEntryActorLabel(entry, "created")}</p>
											</div>
										</a>
									{/each}
								</div>
							</article>
						{/if}

						{#if recentUpdatedEntries.length}
							<article class="pedia-catalog-activity-panel stack quarter">
								<div class="pedia-catalog-group-head">
									<div class="stack quarter">
										<p class="eyebrow">Recently Edited</p>
									</div>
								</div>

								<div class="pedia-catalog-activity-list" role="list">
									{#each recentUpdatedEntries as entry (entry.id)}
										<a
											class="pedia-catalog-activity-item"
											href={entryPath(entry)}
											style={catalogRowStyle(entry)}
											onclick={(event) => handleRouteAnchorClick(event, entryPath(entry))}
										>
											<div class="pedia-catalog-activity-main min-inline-size-0">
												<strong class="card-title text-box-trim">{entry.title}</strong>
												<p class="card-copy text-box-trim">{entry.leader}</p>
											</div>
											<div class="pedia-catalog-activity-meta">
												<strong class="pedia-catalog-activity-date">{formatCatalogTimestamp(entry.meta?.updatedAt)}</strong>
												<p class="card-copy text-box-trim">{recentEntryActorLabel(entry, "updated")}</p>
											</div>
										</a>
									{/each}
								</div>
							</article>
						{/if}
					</section>
				{/if}

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
							<article class="pedia-author-overview stack relative" style={creditCardStyle(group.author)}>
								<div class="inline between flex-wrap half align-start">
									<div class="stack quarter">
										<h3 class="section-title">{group.author}</h3>
										<p class="card-copy">{overview.blurb}</p>
									</div>
									{#if canEditAuthorProfile(group.author)}
										<button
											type="button"
											class="pedia-button pedia-button-secondary absolute"
											style="top: 1rem; right: 1rem;"
											onclick={() => (isEditingAuthorProfile(group.author) ? stopEditingAuthorProfile() : startEditingAuthorProfile(group.author))}
										>
											{isEditingAuthorProfile(group.author) ? "Close" : "Edit"}
										</button>
									{/if}
								</div>

								{#if canEditAuthorProfile(group.author) && isEditingAuthorProfile(group.author)}
									<div class="pedia-author-profile-editor stack">
										<!-- <label class="stack quarter">
											<span class="eyebrow">Author Name</span>
											<input class="pedia-field" type="text" bind:value={authorProfileEditorName} />
										</label> -->
										<label class="stack quarter">
											<span class="eyebrow">Blurb</span>
											<textarea class="pedia-json-editor pedia-author-profile-textarea" bind:value={authorProfileBlurb} rows="3"></textarea>
										</label>
										<label class="stack quarter">
											<span class="eyebrow">Links</span>
											<textarea
												class="pedia-json-editor pedia-author-profile-textarea"
												bind:value={authorProfileLinks}
												rows="5"
												placeholder="Steam Workshop | https://example.com&#10;Github | https://github.com/example"
											></textarea>
										</label>
										<div class="inline half flex-wrap">
											<button type="button" class="pedia-button pedia-button-secondary" onclick={stopEditingAuthorProfile}>Cancel</button>
											<button type="button" class="pedia-button" onclick={saveAuthorProfileDraft}>Save Profile</button>
										</div>
										{#if authorProfileStatus}
											<p class="pedia-status">
												<span>{authorProfileStatus}</span>
												{#if authorProfileSavedAt}
													<span class="pedia-status-time">{statusTimestampText(authorProfileSavedAt)}</span>
												{/if}
											</p>
										{/if}
									</div>
								{/if}

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

				<section class="pedia-catalog-map stack" aria-label="Civilization map">
					<div class="pedia-catalog-group-head">
						<div class="stack half margin-block-start-quarter">
							<p class="eyebrow">Modded Civ Distribution</p>
							<h3 class="section-title">Lacsiraxariscal's TSL Map</h3>
						</div>
						<a class="pedia-button pedia-button-secondary" href={CATALOG_MAP_VIEW_URL} target="_blank" rel="noreferrer">Open Externally</a>
					</div>
					<div class="pedia-catalog-map-frame">
						{#if catalogMapLoaded}
							<iframe title="Lacsiraxariscal's TSL Map" src={CATALOG_MAP_EMBED_URL} loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
						{:else}
							<button type="button" class="pedia-catalog-map-preview" onclick={() => (catalogMapLoaded = true)}>
								<img class="pedia-catalog-map-preview-image" src="/MapPreview.jpg" alt="Preview of Lacsiraxariscal's TSL map" loading="lazy" />
								<span class="pedia-catalog-map-preview-scrim" aria-hidden="true"></span>
								<span class="pedia-catalog-map-preview-copy stack quarter">
									<strong>Click anywhere to open the Goggle map</strong>
								</span>
							</button>
						{/if}
					</div>
				</section>
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
						<p class="pedia-status">
							<span>{collectionMetadataStatus}</span>
							{#if collectionMetadataSavedAt}
								<span class="pedia-status-time">{statusTimestampText(collectionMetadataSavedAt)}</span>
							{/if}
						</p>
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
					{#if canEdit}
						<button type="button" class="pedia-button pedia-button-secondary" onclick={() => startEditingEntry(selectedEntry)}>Edit Entry</button>
						<button type="button" class="pedia-button pedia-button-danger" onclick={deleteSelectedEntry}>Delete Entry</button>
					{/if}
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
							<p class="pedia-status">
								<span>{entryStatus}</span>
								{#if entrySavedAt}
									<span class="pedia-status-time">{statusTimestampText(entrySavedAt)}</span>
								{/if}
							</p>
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
												<p class="pedia-status">
													<span>{collectionEditorStatus}</span>
													{#if collectionEditorSavedAt}
														<span class="pedia-status-time">{statusTimestampText(collectionEditorSavedAt)}</span>
													{/if}
												</p>
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
												<p class="pedia-status">
													<span>{categoryEditorStatus}</span>
													{#if categoryEditorSavedAt}
														<span class="pedia-status-time">{statusTimestampText(categoryEditorSavedAt)}</span>
													{/if}
												</p>
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
												<span class="negative-margin pedia-infobox-value">
													<PediaInlineText text={value} templateRefs={infoboxRowTemplateRefs(selectedEntry, { ...row, value })} />
													{#if infoboxColorSwatch(value)}
														<span class="pedia-color-swatch-dot" style={`--swatch:${infoboxColorSwatch(value)}`} aria-hidden="true"></span>
													{/if}
												</span>
											{/each}
										</div>
									{:else}
										<span class="pedia-infobox-value">
											<PediaInlineText text={row.value} templateRefs={infoboxRowTemplateRefs(selectedEntry, row)} />
											{#if infoboxColorSwatch(row.value)}
												<span class="pedia-color-swatch-dot" style={`--swatch:${infoboxColorSwatch(row.value)}`} aria-hidden="true"></span>
											{/if}
										</span>
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
		display: grid;
		gap: 1rem;
		--pedia-accent: var(--surface-pedia-highlight);
		--pedia-accent-strong: var(--surface-pedia-highlight-strong);
		--pedia-border: var(--surface-pedia-border);
		--pedia-panel: var(--surface-pedia-panel);
		--pedia-panel-soft: var(--surface-pedia-panel-soft);
		--pedia-shadow: 0 14px 32px color-mix(in srgb, black 78%, transparent);
		--pedia-shadow-soft: 0 4px 6px color-mix(in srgb, black 84%, transparent);
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

	.pedia-author-civs-accordion[open] .pedia-author-civs-summary > div::before {
		content: "−";
	}

	.pedia-author-civs-summary > div {
		position: relative;
		font-size: 1.25rem;
		padding-inline-start: 1.45rem;
	}

	.pedia-author-civs-summary > div::before {
		position: absolute;
		inset-block-start: 50%;
		inset-inline-start: 0;
		color: var(--person-highlight, var(--pedia-accent-strong));
		font-size: 1.2rem;
		font-weight: 700;
		line-height: 1;
		transform: translateY(-50%);
		content: "+";
	}

	.pedia-main {
		min-inline-size: 0;
		display: grid;
		gap: 1rem;
	}

	.pedia-toolbar {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
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

	.pedia-wiki-header h2 {
		font-size: 2.5rem;
	}

	.pedia-catalog-group-head .section-title {
		font-size: 1.5rem;
	}

	.pedia-author-overview .pedia-link-row .pedia-button {
		background: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 12%, var(--control-bg));
		border-color: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 34%, var(--border-color));
	}

	.pedia-author-overview .pedia-link-row .pedia-button:hover,
	.pedia-author-overview .pedia-link-row .pedia-button:focus-visible {
		background: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 22%, var(--control-bg)) !important;
		box-shadow: 0 4px 10px color-mix(in srgb, black 76%, transparent);
		border-color: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 56%, var(--border-color)) !important;
	}

	.pedia-link-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pedia-button {
		color: var(--ink);
		text-decoration: none;
		font: inherit;
		text-wrap: nowrap;
		font-weight: 700;
		background: color-mix(in srgb, var(--pedia-accent) 18%, var(--control-bg));
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 40%, var(--border-color));
		border-radius: 0.8rem;
		padding-block: 0.7rem;
		padding-inline: 1rem;
	}

	.pedia-button:hover,
	.pedia-button:focus-visible {
		background: color-mix(in srgb, var(--pedia-accent) 24%, var(--control-bg));
		box-shadow: 0 2px 2px color-mix(in srgb, black 70%, transparent);
		border-color: color-mix(in srgb, var(--pedia-accent) 58%, var(--border-color));
		transform: translateY(-1px);
	}

	.pedia-button.pedia-button-danger {
		background: color-mix(in srgb, oklch(0.5 0.25 30) 20%, var(--control-bg));
		border-color: color-mix(in srgb, oklch(0.8 0.2 30) 60%, var(--border-color));
	}

	.pedia-button.pedia-button-secondary {
		background: color-mix(in srgb, var(--pedia-panel) 94%, black 6%);
	}

	.pedia-toolbar-actions {
		display: flex;
		justify-content: end;
		align-items: center;
		gap: 0.75rem;
	}

	.pedia-search {
		inline-size: 100%;
		color: var(--ink);
		font: inherit;
		background: color-mix(in srgb, var(--input-bg) 90%, black 10%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 28%, var(--border-color));
		border-radius: 0.85rem;
		padding-block: 0.8rem;
		padding-inline: 0.95rem;
	}

	.pedia-view-switch {
		display: inline-flex;
		gap: 0.35rem;
		background: color-mix(in srgb, var(--pedia-panel-soft) 92%, black 8%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
		border-radius: 999px;
		padding: 0.3rem;
	}

	.pedia-view-chip {
		color: var(--muted-ink);
		font: inherit;
		text-transform: uppercase;
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: transparent;
		border: 0;
		border-radius: 999px;
		padding-block: 0.55rem;
		padding-inline: 0.9rem;
	}

	.pedia-view-chip.is-active {
		color: var(--ink);
		background: color-mix(in srgb, var(--pedia-accent) 18%, var(--control-bg));
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 36%, var(--border-color)),
			0 4px 10px color-mix(in srgb, black 74%, transparent);
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

	.pedia-catalog-shell {
		block-size: auto;
		max-block-size: none;
		overflow: visible;
	}

	.pedia-catalog-accordion {
		background: color-mix(in srgb, var(--pedia-panel) 84%, black 16%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding-inline: 1rem;
		padding-block-start: 0.25rem;
		padding-block-end: 1rem;
	}

	.pedia-catalog-accordion[open] .pedia-catalog-group-head::before {
		content: "−";
	}

	.pedia-catalog-accordion-summary {
		background: none;
		padding-block: 0.75rem 0.45rem;
		padding-inline-start: 0;
		cursor: pointer;
		list-style: none;
	}

	.pedia-catalog-accordion-summary .pedia-catalog-group-head {
		position: relative;
		padding-inline-start: 1.55rem;
	}

	.pedia-catalog-accordion-summary .pedia-catalog-group-head::before {
		position: absolute;
		inset-block-start: 50%;
		inset-inline-start: 0;
		color: var(--pedia-accent-strong);
		font-size: 1.35rem;
		font-weight: 700;
		line-height: 1;
		transform: translateY(-50%);
		content: "+";
	}

	.pedia-catalog-accordion-summary::-webkit-details-marker {
		display: none;
	}

	.pedia-catalog-accordion-summary::marker {
		content: "";
	}

	.pedia-catalog-group-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.pedia-catalog-activity-grid {
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pedia-catalog-activity-panel {
		display: grid;
		gap: 0.45rem;
		background: color-mix(in srgb, var(--pedia-panel) 86%, black 14%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 0.75rem;
	}

	.pedia-catalog-activity-panel .eyebrow,
	.pedia-catalog-activity-panel .card-copy {
		margin: 0;
	}

	.pedia-catalog-activity-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.5rem;
	}

	.pedia-catalog-activity-item {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		color: var(--ink);
		text-decoration: none;
		background: linear-gradient(135deg, color-mix(in srgb, var(--catalog-accent) 18%, transparent) 0%, transparent 48%), color-mix(in srgb, var(--catalog-surface) 72%, var(--pedia-panel));
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 18%, var(--border-color)),
			0 2px 6px color-mix(in srgb, black 70%, transparent);
		border-radius: 0.5rem;
		padding: 0.75rem 0.65rem;
	}

	.pedia-catalog-activity-item:hover,
	.pedia-catalog-activity-item:focus-visible {
		transform: translateY(-1px);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 28%, var(--border-color)),
			0 4px 6px color-mix(in srgb, black 76%, transparent);
	}

	.pedia-catalog-activity-main {
		display: grid;
		gap: 0.5rem;
		min-inline-size: 0;
	}

	.pedia-catalog-activity-main .card-title {
		font-size: 1.05rem;
		line-height: 1;
	}

	.pedia-catalog-activity-main .card-copy,
	.pedia-catalog-activity-meta .card-copy {
		line-height: 1.05;
	}

	.pedia-catalog-activity-meta {
		display: grid;
		justify-items: end;
		gap: 0.08rem;
		min-inline-size: 7.25rem;
		text-align: end;
		white-space: nowrap;
	}

	.pedia-catalog-activity-date {
		font-size: 0.66rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.pedia-catalog-map {
		display: grid;
		gap: 1rem;
		background: color-mix(in srgb, var(--pedia-panel) 84%, black 16%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-catalog-map-frame {
		min-block-size: 32rem;
		background: color-mix(in srgb, var(--pedia-panel-soft) 92%, black 8%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 0.9rem;
		overflow: hidden;
	}

	.pedia-catalog-map-preview {
		position: relative;
		inline-size: 100%;
		min-block-size: 32rem;
		display: block;
		padding: 0;
		border: 0;
		background: color-mix(in srgb, var(--pedia-panel-soft) 92%, black 8%);
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.pedia-catalog-map-preview:hover,
	.pedia-catalog-map-preview:focus-visible {
		filter: brightness(1.03);
	}

	.pedia-catalog-map-preview-image,
	.pedia-catalog-map-preview-scrim {
		position: absolute;
		inset: 0;
	}

	.pedia-catalog-map-preview-image {
		inline-size: 100%;
		block-size: 100%;
		display: block;
		object-fit: cover;
		object-position: center center;
	}

	.pedia-catalog-map-preview-scrim {
		background: linear-gradient(180deg, rgba(6, 10, 16, 0.08), rgba(6, 10, 16, 0.34) 46%, rgba(6, 10, 16, 0.82)), linear-gradient(90deg, rgba(6, 10, 16, 0.72), rgba(6, 10, 16, 0.08) 58%);
	}

	.pedia-catalog-map-preview-copy {
		position: absolute;
		inset-inline-start: 1.5rem;
		inset-inline-end: 1.5rem;
		inset-block-end: 1.5rem;
		inline-size: fit-content;
		gap: 0.8rem;
		padding: 1.5rem;
		border-radius: 0.9rem;
		/*background: color-mix(in srgb, var(--pedia-panel) 76%, rgba(4, 7, 13, 0.24) 24%);*/
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 25%, var(--border-color));
		backdrop-filter: blur(0.25rem);
	}

	.pedia-catalog-map-frame iframe {
		inline-size: 100%;
		block-size: 100%;
		display: block;
		border: 0;
	}

	.pedia-author-work-copy .card-copy {
		margin: 0;
		text-shadow: 1px 1px 2px color-mix(in srgb, var(--catalog-accent) 40%, #000);
	}

	.pedia-credit-card .card-copy {
		font-size: 0.82rem;
	}

	.pedia-prose-expanded :global(.card-copy) {
		margin: 0;
	}

	.pedia-prose-paragraphs .card-copy {
		margin: 0;
	}

	.pedia-catalog-collections {
		padding-block-end: 0.25rem;
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
		display: grid;
		gap: 0.4rem;
		color: var(--ink);
		text-decoration: none;
		font: inherit;
		text-align: left;
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
		--collection-accent: var(--pedia-accent);
		--collection-background: var(--pedia-panel-soft);

		& .card-title {
			font-size: 1.15rem;
		}
	}

	.pedia-collection-card-catalog {
		align-content: start;
	}

	.pedia-catalog-detail-card strong {
		color: color-mix(in srgb, white 95%, var(--ink));
		font-size: 1rem;
		line-height: 1.35;
	}

	.pedia-catalog-meta strong {
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		margin-inline-end: 0.35rem;
	}

	.pedia-category-chip strong {
		color: var(--pedia-accent-strong);
		font-size: 0.76rem;
		letter-spacing: 0.08em;
	}

	.pedia-infobox-row strong,
	.pedia-support-row strong {
		color: color-mix(in srgb, var(--ink) 80%, var(--infobox-accent) 20%);
		text-transform: uppercase;
		font-size: 0.8rem;
		letter-spacing: 0.12em;
	}

	.pedia-media-placeholder strong {
		font-family: "Rockwell", "Palatino Linotype", serif;
	}

	.pedia-music-preview-copy strong {
		text-transform: uppercase;
		font-size: 0.8rem;
		letter-spacing: 0.12em;
	}

	.pedia-author-work-copy .card-title {
		font-size: 1.25rem;
		text-shadow: 1px 1px 2px color-mix(in srgb, var(--catalog-accent) 40%, #000);
	}

	.pedia-credit-card .card-title {
		color: color-mix(in srgb, var(--ink) 78%, var(--person-highlight, var(--pedia-accent)) 22%);
		font-size: 1rem;
	}

	.pedia-catalog-categories {
		padding-block-end: 0.25rem;
	}

	.pedia-category-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.pedia-category-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--ink);
		text-decoration: none;
		font: inherit;
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		background: color-mix(in srgb, var(--pedia-panel-soft) 88%, var(--control-bg));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 18%, var(--border-color));
		border: 0;
		border-radius: 999px;
		padding-block: 0.65rem;
		padding-inline: 0.9rem;
		cursor: pointer;
	}

	.pedia-category-chip.is-static {
		cursor: default;
	}

	.pedia-author-work-icon span {
		color: color-mix(in srgb, var(--catalog-accent) 72%, white);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1rem;
	}

	.pedia-author-work-meta span {
		font-weight: 500;
		background: color-mix(in srgb, var(--catalog-accent) 40%, transparent);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--catalog-accent) 90%, transparent);
		border-radius: 0.5rem;
		padding-block: 0.4rem;
		padding-inline: 0.5rem;
		text-box: trim-both cap alphabetic;
		text-shadow: 1px 1px 1px #000;
	}

	.pedia-catalog-icon span {
		color: color-mix(in srgb, var(--catalog-accent) 60%, white);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1.35rem;
	}

	.pedia-catalog-meta span {
		margin: 0;
	}

	.pedia-infobox-row span {
		color: var(--muted-ink);
		text-align: end;
	}

	.pedia-infobox-value {
		display: inline-flex;
		justify-content: flex-end;
		align-items: center;
		gap: 0.45rem;
	}

	.pedia-infobox-values span {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pedia-color-swatch-dot {
		inline-size: 1rem;
		block-size: 1rem;
		display: inline-block;
		flex: 0 0 auto;
		background: var(--swatch, transparent);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, white 35%, transparent),
			0 0 0 1px color-mix(in srgb, black 55%, transparent);
		border-radius: 999px;
		margin-block-end: 0.1rem;
	}

	.negative-margin {
		margin-block-start: -0.25rem;
	}

	.pedia-media-placeholder span {
		color: var(--pedia-accent-strong);
		text-transform: uppercase;
		font-size: 0.8rem;
		letter-spacing: 0.1em;
	}

	.pedia-music-preview-copy span {
		font-size: 0.88rem;
	}

	.pedia-unique-head span {
		color: var(--pedia-accent-strong);
		text-transform: uppercase;
		font-size: 0.85rem;
		letter-spacing: 0.12em;
	}

	.pedia-author-toc-grid {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		gap: 0.5rem;
	}

	.pedia-author-toc-chip {
		max-inline-size: 100%;
		flex: 0 1 auto;
		color: var(--ink);
		white-space: nowrap;
		text-align: start;
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
		text-box: trim-both cap alphabetic;

		&:hover {
			box-shadow: 0 8px 18px color-mix(in srgb, black 78%, transparent);
			border-color: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 38%, var(--border-color));
			transform: translateY(-1px);
		}
	}

	.pedia-catalog-groups {
		gap: 2rem;
		padding-inline-end: 0.25rem;
		overflow: auto;
	}

	.pedia-catalog-group {
		scroll-padding-block-start: 4rem;
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
		padding-inline: 1.25rem;
		padding-block-start: 1.5rem;
		padding-block-end: 0.75rem;

		& .section-title {
			font-size: 2rem;
		}
	}

	.pedia-author-profile-editor {
		background: color-mix(in srgb, var(--pedia-panel-soft) 88%, black 12%);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 18%, var(--border-color));
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-field,
	.pedia-select {
		inline-size: 100%;
		min-inline-size: min(100%, 18rem);
		max-inline-size: 100%;
		color: var(--ink);
		font: inherit;
		line-height: 1.4;
		background: color-mix(in srgb, var(--input-bg) 94%, black 6%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 24%, var(--border-color));
		border-radius: 0.95rem;
		padding-block: 0.7rem;
		padding-inline: 0.9rem;
	}

	.pedia-markup-input,
	.pedia-preview-panel textarea,
	.pedia-json-editor {
		inline-size: 100%;
		min-block-size: 16rem;
		max-inline-size: 100%;
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

	.pedia-author-profile-textarea {
		min-block-size: 4rem;
		max-block-size: 12rem;
	}

	.pedia-status {
		display: grid;
		gap: 0.25rem;
		color: var(--ink);
		background: color-mix(in srgb, var(--pedia-accent) 12%, var(--control-bg));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 20%, var(--border-color));
		border-radius: 0.9rem;
		padding-block: 0.9rem;
		padding-inline: 1rem;
		margin: 0;
	}

	.pedia-status-time {
		color: var(--muted-ink);
		font-size: 0.9rem;
	}

	.pedia-author-civs-accordion {
		display: grid;
		gap: 1rem;
		border-top: 1px solid color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 22%, var(--border-color));
		padding-block-start: 1.5rem;
		margin-block-start: 0.5rem;
	}

	.pedia-author-civs-summary {
		background: none;
		padding: 0;
		cursor: pointer;
		list-style: none;

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

	.pedia-catalog-row {
		position: relative;
		inline-size: 100%;
		display: grid;
		grid-template-columns: minmax(20rem, 26rem) minmax(0, 1fr);
		align-items: flex-end;
		gap: 2rem;
		color: var(--ink);
		text-decoration: none;
		font: inherit;
		text-align: left;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--catalog-accent) 75%, transparent) 0%, transparent 30%),
			linear-gradient(145deg, color-mix(in srgb, var(--catalog-surface) 65%, var(--pedia-panel-soft)) 0%, color-mix(in srgb, var(--catalog-surface) 20%, #16110f) 100%);
		border: 2px solid color-mix(in srgb, var(--catalog-accent) 60%, var(--border-color));
		border-radius: 1rem;
		padding: 1.25rem;
		overflow: clip;
		transition:
			transform 150ms ease,
			background 150ms ease,
			border-color 150ms ease,
			box-shadow 150ms ease;
		cursor: pointer;
		--catalog-accent: var(--pedia-accent);
		--catalog-backdrop-image: none;
		--catalog-surface: var(--pedia-panel-soft);
	}

	.pedia-catalog-row > * {
		position: relative;
		z-index: 1;
	}

	.pedia-catalog-row::before {
		position: absolute;
		inset: 0;
		z-index: 0;
		opacity: 0.38;
		filter: grayscale(0.3) saturate(0.75) brightness(0.38);
		background-image: var(--catalog-backdrop-image);
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		transform: scale(1.02);
		content: "";
		pointer-events: none;
	}

	.pedia-catalog-row:hover {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--catalog-accent) 75%, transparent) 0%, transparent 30%),
			linear-gradient(145deg, color-mix(in srgb, var(--catalog-surface) 85%, var(--pedia-panel-soft)) 0%, color-mix(in srgb, var(--catalog-surface) 14%, #16110f) 100%);
		border-color: color-mix(in srgb, var(--catalog-accent) 75%, var(--border-color));
	}

	.pedia-catalog-row-meta {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		display: flex;
		justify-content: flex-end;
	}

	.pedia-catalog-collection-pills {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.35rem;
	}

	.pedia-catalog-collection-pill {
		color: color-mix(in srgb, white 90%, var(--ink));
		text-transform: uppercase;
		white-space: nowrap;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		background: linear-gradient(160deg, color-mix(in srgb, var(--collection-background) 80%, black 20%) 0%, color-mix(in srgb, var(--collection-accent) 20%, var(--collection-background)) 100%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--collection-accent) 85%, transparent);
		border-radius: 999px;
		padding-block: 0.5rem;
		padding-inline: 0.65rem;
		--collection-accent: var(--pedia-accent);
		--collection-background: var(--pedia-panel-soft);
		text-box: trim-both cap alphabetic;
		text-overflow: ellipsis;
		text-shadow: 1px 1px 2px color-mix(in srgb, var(--collection-accent) 20%, #000);
	}

	.pedia-catalog-row-main {
		min-inline-size: 0;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 1rem;
	}

	.pedia-catalog-icon-wrap {
		display: grid;
		place-items: center;
	}

	.pedia-catalog-icon {
		inline-size: 7rem;
		block-size: 7rem;
		display: grid;
		place-items: center;
		overflow: clip;
		filter: drop-shadow(2px 2px 3px color-mix(in srgb, var(--catalog-accent) 30%, #000));
	}

	.pedia-catalog-icon img {
		inline-size: 100%;
		block-size: 100%;
		display: block;
		/*filter: drop-shadow(2px 2px 3px color-mix(in srgb, var(--catalog-accent) 30%, #000));*/
		object-fit: contain;
	}

	.civ-icon img {
		inline-size: 100%;
		block-size: 100%;
		display: block;
		filter: drop-shadow(2px 2px 4px rgb(0 0 0 / 0.5));
		object-fit: contain;
	}

	.pedia-author-work-icon img {
		inline-size: 100%;
		block-size: 100%;
		display: block;
		filter: drop-shadow(1px 1px 4px color-mix(in srgb, var(--catalog-accent) 20%, #000));
		object-fit: contain;
	}

	.pedia-figure-card img {
		inline-size: 100%;
		align-self: flex-start;
		border-radius: 0.8rem;
		object-fit: contain;
	}

	.pedia-music-preview img {
		inline-size: 100%;
		aspect-ratio: 16 / 9;
		display: block;
		opacity: 0.82;
		object-fit: cover;
	}

	.pedia-unique-figure img,
	.pedia-infobox-media img {
		inline-size: 100%;
		block-size: 100%;
		display: block;
		filter: drop-shadow(2px 2px 4px rgb(0 0 0 / 0.5));
		border-radius: 1.5rem;
		object-fit: contain;
		overflow: clip;
	}

	.pedia-catalog-identity * {
		text-shadow: 2px 2px 3px color-mix(in srgb, var(--catalog-accent) 40%, #000);
	}

	.pedia-catalog-civ-title {
		max-inline-size: 20rem;
		color: color-mix(in srgb, white 95%, var(--catalog-accent));
		text-wrap: balance;
		font-size: clamp(1.5rem, 2.2vw, 2.25rem);
		line-height: 1.05;
		margin: 0;
	}

	.pedia-catalog-meta {
		color: var(--muted-ink);
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
		align-items: stretch;
		gap: 1rem;
		margin-block-end: 1rem;
	}

	.pedia-catalog-detail-card {
		background: linear-gradient(180deg, color-mix(in srgb, var(--catalog-surface) 10%, var(--pedia-panel)) 0%, color-mix(in srgb, var(--catalog-surface) 10%, #111) 100%);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 80%, transparent),
			1px 2px 2px color-mix(in srgb, #000 60%, transparent);
		border-radius: 0.75rem;
		padding-block: 0.65rem;
		padding-inline: 0.75rem;
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
		grid-template-columns: minmax(0, 1.65fr) minmax(20rem, 0.95fr);
		align-items: start;
		gap: 1rem;
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

	.pedia-hidden-input {
		display: none;
	}

	.pedia-preview-actions {
		display: grid;
		gap: 0.75rem;
	}

	.pedia-preview-kicker {
		color: var(--pedia-accent-strong);
		text-transform: uppercase;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.pedia-list-copy {
		display: grid;
		gap: 0.45rem;
		padding-inline-start: 1rem;
	}

	.pedia-preview-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.pedia-entry-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
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

	.pedia-color-field {
		display: grid;
		gap: 0.35rem;
	}

	.pedia-color-picker-row {
		min-inline-size: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

	.pedia-textarea-compact {
		min-block-size: 6rem;
		max-block-size: 10rem;
		resize: vertical;
	}

	.pedia-collection-hero {
		position: relative;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--collection-accent) 26%, transparent) 0%, transparent 42%),
			linear-gradient(145deg, color-mix(in srgb, var(--collection-background) 82%, var(--pedia-panel-soft)) 0%, color-mix(in srgb, var(--collection-background) 28%, #16110f) 100%);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--collection-accent) 34%, var(--border-color)),
			var(--pedia-shadow-soft);
		border-radius: 1rem;
		padding-inline: 1.15rem;
		padding-block-start: 1rem;
		padding-block-end: 1.25rem;
		overflow: clip;
		--collection-accent: var(--pedia-accent);
		--collection-background: var(--pedia-panel-soft);
		--collection-hero-image: none;
	}

	.pedia-collection-hero > * {
		position: relative;
		z-index: 1;
	}

	.pedia-collection-link {
		background: color-mix(in srgb, var(--collection-background, var(--pedia-accent)) 20%, var(--collection-accent)) !important;
		border-color: color-mix(in srgb, var(--collection-accent, var(--pedia-accent)) 70%, var(--border-color)) !important;
		text-shadow: 2px 2px 2px rgb(0, 0, 0 / 0.7);
	}

	.pedia-collection-link:hover,
	.pedia-collection-link:focus-visible {
		background: color-mix(in srgb, var(--collection-background, var(--pedia-accent)) 40%, var(--collection-accent)) !important;
		box-shadow: 0x 1px 2px color-mix(in srgb, black 45%, transparent);
		border-color: color-mix(in srgb, var(--collection-accent, var(--pedia-accent)) 90%, var(--border-color)) !important;
	}

	.pedia-wiki {
		display: grid;
		gap: 1.25rem;
	}

	.pedia-wiki-header-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 1.5rem;
	}

	.civ-icon {
		inline-size: clamp(6rem, 10vw, 8rem);
		block-size: clamp(6rem, 10vw, 8rem);
		display: grid;
		place-items: center;
		overflow: hidden;
	}

	.pedia-media-placeholder {
		inline-size: 100%;
		block-size: 100%;
		display: grid;
		gap: 0.45rem;
		place-items: center;
		color: var(--pedia-accent-strong);
		text-align: center;
		padding: 1rem;
	}

	.pedia-wiki-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(17rem, 21rem);
		align-items: start;
		gap: 1.25rem;
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

	.pedia-copy-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
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

	.pedia-prose-disclosure {
		display: grid;
		gap: 0.45rem;
	}

	.pedia-prose-disclosure[open] .pedia-prose-summary {
		background-image: none;
	}

	.pedia-prose-disclosure[open] .pedia-prose-summary :global(.pedia-prose-clamp) {
		display: none;
	}

	.pedia-prose-disclosure[open] .pedia-prose-toggle-icon {
		transform: rotate(180deg);
	}

	.pedia-prose-disclosure[open] .pedia-prose-toggle-less {
		display: inline;
	}

	.pedia-prose-disclosure[open] .pedia-prose-toggle-more {
		display: none;
	}

	.pedia-prose-summary {
		display: grid;
		gap: 0.45rem;
		background: none;
		padding-inline-start: 0;
		cursor: pointer;
		list-style: none;
	}

	.pedia-prose-summary :global(.pedia-prose-clamp) {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 6;
	}

	.pedia-prose-summary::-webkit-details-marker {
		display: none;
	}

	.pedia-prose-summary::marker {
		display: none;
		content: "";
	}

	.pedia-prose-toggle-row {
		display: inline-flex;
		align-items: center;
		align-self: start;
		gap: 0.35rem;
	}

	.pedia-prose-toggle-more,
	.pedia-prose-toggle-less {
		color: var(--pedia-accent-strong);
		text-transform: uppercase;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.pedia-prose-toggle-less {
		display: none;
	}

	.pedia-prose-toggle-icon {
		color: var(--pedia-accent-strong);
		font-size: 0.9rem;
		line-height: 1;
		transition: transform 150ms ease;
		transform: translateY(-1px);
	}

	.pedia-prose-paragraphs {
		display: grid;
		gap: 0.9rem;
	}

	.pedia-dawn-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: start;
		gap: 1.5rem;
	}

	.pedia-figure-card {
		min-inline-size: 0;
		margin: 0;
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
		grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
		align-items: start;
		gap: 1.5rem;
	}

	.pedia-unique-figure {
		aspect-ratio: 1;
	}

	.pedia-unique-figure,
	.pedia-infobox-media {
		border-radius: 1rem;
		overflow: hidden;
		/*background: color-mix(in srgb, var(--pedia-panel) 84%, black 16%);*/
		/*box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));*/
	}

	.pedia-unique-art-credit {
		text-align: center;
		margin-block: 0;
	}

	.pedia-unique-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.75rem;
	}

	.pedia-unique-pedia {
		display: grid;
		gap: 0.7rem;
		border-top: 1px solid color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
		padding-block-start: 0.85rem;
		margin-block-start: 0.85rem;
	}

	.pedia-unique-pedia-summary {
		display: inline-flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		color: var(--pedia-accent-strong);
		text-transform: uppercase;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		cursor: pointer;
	}

	.pedia-unique-pedia-body {
		display: grid;
		gap: 0.75rem;
	}

	.pedia-template-ref-row {
		margin-block-start: 0.9rem;
	}

	.pedia-template-ref {
		color: var(--ink);
		text-decoration: none;
		text-transform: uppercase;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: color-mix(in srgb, var(--pedia-accent) 12%, var(--control-bg));
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 26%, var(--border-color));
		border-radius: 999px;
		padding-block: 0.45rem;
		padding-inline: 0.65rem;
	}

	.pedia-entry-support-grid {
		gap: 2rem;
	}

	.pedia-list-panel-summary {
		cursor: pointer;
		list-style: none;
	}

	.pedia-list-panel-summary::-webkit-details-marker {
		display: none;
	}

	.pedia-name-list {
		display: grid;
		gap: 0.35rem;
		padding-inline-start: 2rem;
		margin: 0;
	}

	.pedia-music-embed {
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
		border-radius: 0.9rem;
		overflow: hidden;
	}

	.pedia-music-embed iframe {
		inline-size: 100%;
		aspect-ratio: 16 / 9;
		display: block;
		border: 0;
	}

	.pedia-music-preview {
		position: relative;
		display: grid;
		background: color-mix(in srgb, var(--pedia-panel-soft) 90%, black 10%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 18%, var(--border-color));
		border: 0;
		border-radius: 0.9rem;
		padding: 0;
		overflow: hidden;
		cursor: pointer;
	}

	.pedia-music-preview-copy {
		position: absolute;
		inset: auto 0 0;
		display: grid;
		gap: 0.2rem;
		color: var(--ink);
		text-align: left;
		background: linear-gradient(180deg, transparent 0%, color-mix(in srgb, black 78%, transparent) 38%, color-mix(in srgb, black 88%, transparent) 100%);
		padding: 0.9rem;
	}

	.pedia-infobox-row:last-child,
	.pedia-support-row:last-child {
		border-block-end: 0;
		padding-block-end: 0;
	}

	.pedia-credit-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.65rem;
	}

	.pedia-credit-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		color: var(--ink);
		text-decoration: none;
		text-align: start;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 30%, transparent) 0%, transparent 45%),
			linear-gradient(165deg, color-mix(in srgb, var(--pedia-panel) 80%, var(--control-bg)) 0%, color-mix(in srgb, var(--pedia-panel-soft) 95%, #16110f 5%) 100%);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 40%, var(--border-color));
		border-radius: 1rem;
		padding-block: 2rem;
		padding-inline: 1.5rem;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			background 150ms ease,
			box-shadow 150ms ease;
	}

	.pedia-credit-card {
		padding-block: 0.8rem;
		padding-inline: 0.95rem;
	}

	.pedia-credit-card:hover {
		box-shadow: 0 6px 8px color-mix(in srgb, black 75%, transparent);
		border-color: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 45%, var(--border-color));
		transform: translateY(-2px);
	}

	.pedia-credit-card-button {
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.pedia-collection-editor {
		background: color-mix(in srgb, var(--pedia-panel-soft) 92%, black 8%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-action-row {
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}

	.pedia-category-editor-input-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
		gap: 0.8rem;
	}

	.pedia-author-works {
		gap: 0.7rem;
	}

	.pedia-author-work {
		inline-size: 100%;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.85rem;
		color: var(--ink);
		text-decoration: none;
		font: inherit;
		text-align: left;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--catalog-accent) 40%, transparent) 0%, transparent 35%),
			linear-gradient(145deg, color-mix(in srgb, var(--catalog-surface) 65%, var(--pedia-panel)) 0%, color-mix(in srgb, var(--catalog-surface) 20%, #121212) 100%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 35%, var(--border-color));
		border: 0;
		border-radius: 1rem;
		padding-block: 1.1rem;
		padding-inline: 1rem;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background 150ms ease;
		cursor: pointer;
		--catalog-accent: var(--pedia-accent);
		--catalog-surface: var(--pedia-panel-soft);
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

	.pedia-author-work-icon {
		inline-size: 5rem;
		block-size: 5rem;
		display: grid;
		flex: 0 0 auto;
		place-items: center;
	}

	.pedia-author-work-pill {
		color: color-mix(in srgb, white 85%, var(--catalog-accent));
		text-transform: uppercase;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-shadow: 1px 1px 1px color-mix(in srgb, var(--catalog-accent) 20%, #000);
	}

	.pedia-author-work-meta {
		color: var(--muted-ink);
		font-size: 0.9rem;
	}

	.pedia-infobox {
		position: sticky;
		inset-block-start: 1rem;
		max-block-size: calc(100dvh - 2rem);
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--infobox-accent) 30%, transparent) 0%, transparent 42%),
			linear-gradient(165deg, color-mix(in srgb, var(--infobox-surface) 40%, var(--pedia-panel)) 0%, color-mix(in srgb, var(--pedia-panel) 85%, black 15%) 100%);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--infobox-accent) 24%, var(--border-color)),
			0 4px 6px color-mix(in srgb, black 50%, transparent);
		border-radius: 1rem;
		padding: 1rem;
		overflow: auto;
		--infobox-accent: var(--pedia-accent);
		--infobox-surface: var(--pedia-panel-soft);
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
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.4rem;
		border-block-end: 1px solid color-mix(in srgb, var(--infobox-accent) 20%, var(--border-color));
		padding-block: 0.55rem;

		&:has(.pedia-infobox-values) {
			align-items: flex-start;
		}
	}

	.pedia-infobox-values {
		display: grid;
		justify-items: end;
		gap: 0.2rem;
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

		.pedia-entry-toolbar {
			gap: 0.6rem;
		}

		.pedia-entry-toolbar > .pedia-button,
		.pedia-entry-toolbar .pedia-link-row,
		.pedia-entry-toolbar .pedia-link-row .pedia-button {
			inline-size: 100%;
		}

		.pedia-entry-toolbar .pedia-link-row .pedia-button {
			justify-content: center;
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

		.pedia-catalog-activity-item {
			align-items: start;
			flex-direction: column;
		}

		.pedia-catalog-map-frame {
			min-block-size: 24rem;
		}

		.pedia-catalog-map-preview {
			min-block-size: 24rem;
		}

		.pedia-catalog-map-preview-copy {
			inset-inline-start: 1rem;
			inset-inline-end: 1rem;
			inset-block-end: 1rem;
			max-inline-size: none;
		}

		.pedia-wiki-header-row {
			grid-template-columns: 1fr;
			justify-items: start;
			gap: 0.85rem;
		}

		.pedia-wiki-header h2 {
			font-size: 1.8rem;
			line-height: 1.05;
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

		.pedia-wiki {
			gap: 1rem;
		}

		.pedia-wiki-main {
			gap: 2rem;
		}

		.pedia-wiki-section .section-title {
			font-size: 1.4rem;
		}

		.pedia-wiki-header :global(.section-copy) {
			font-size: 0.96rem;
			max-inline-size: 34rem;
		}

		.pedia-figure-card img {
			max-block-size: 22rem;
		}

		.pedia-dawn-layout,
		.pedia-unique-row,
		.pedia-entry-support-grid {
			gap: 1rem;
		}

		.pedia-entry-support-grid {
			display: grid;
			grid-template-columns: 1fr;
		}

		.pedia-unique-figure-stack {
			inline-size: min(100%, 14rem);
			justify-self: center;
		}

		.pedia-unique-head {
			flex-direction: column;
			align-items: start;
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

		.pedia-infobox {
			order: -1;
			max-block-size: none;
			overflow: visible;
			padding: 0.9rem;
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
			gap: 1.6rem;
		}

		.pedia-wiki-header-row {
			gap: 0.75rem;
		}

		.pedia-wiki-header h2 {
			font-size: 1.55rem;
		}

		.civ-icon {
			inline-size: 4.75rem;
			block-size: 4.75rem;
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
			gap: 0.8rem;
		}

		.pedia-template-ref-row {
			gap: 0.45rem;
		}

		.pedia-unique-figure {
			max-inline-size: 12rem;
		}

		.pedia-infobox-media {
			min-block-size: 10.5rem;
		}

		.pedia-infobox-values {
			justify-items: start;
		}

		.pedia-name-list {
			padding-inline-start: 1.4rem;
		}
	}
</style>
