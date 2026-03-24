import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sortPediaEntries } from "../../src/lib/utils/pediaSorting.js";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PEDIA_DIR = resolve(ROOT_DIR, "src/lib/data/modded-civs-pedia");
const PEDIA_COLLECTIONS_FILE = resolve(ROOT_DIR, "src/lib/data/pediaCollections.js");
const PEDIA_AUTHOR_PROFILES_FILE = resolve(ROOT_DIR, "src/lib/data/pediaAuthorProfiles.json");

function compactText(value) {
	return String(value || "")
		.replace(/\s+/g, " ")
		.trim();
}

function slugify(value) {
	return compactText(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function uniqueNonEmpty(values) {
	return [...new Set((values || []).map((value) => compactText(value)).filter(Boolean))];
}

function parseLastUpdatedDate(value) {
	const raw = compactText(value);
	if (!raw) {
		return "";
	}
	const parsed = Date.parse(raw);
	if (Number.isNaN(parsed)) {
		return "";
	}
	return new Date(parsed).toISOString().slice(0, 10);
}

function entryAuthors(entry) {
	const explicit = uniqueNonEmpty(entry?.authors);
	if (explicit.length) {
		return explicit;
	}
	const authorCredits = uniqueNonEmpty((entry?.credits || []).filter((credit) => /\bauthor\b/i.test(credit?.role || "")).map((credit) => credit?.name));
	if (authorCredits.length) {
		return authorCredits;
	}
	const fallback = compactText((entry?.credits || [])[0]?.name);
	return fallback ? [fallback] : [];
}

function collectionAliasKeys(collection) {
	return uniqueNonEmpty([collection?.title, ...(collection?.aliases || [])]).map((value) => slugify(value));
}

function inferCollectionsForEntry(entry, collections) {
	const byId = new Map();
	for (const collection of entry?.collections || []) {
		const id = compactText(collection?.id || collection?.title);
		if (id) {
			byId.set(slugify(id), collection);
		}
	}

	const haystack = slugify([entry?.summary, ...(entry?.categories || []), entry?.source?.wikiPageTitle].filter(Boolean).join(" "));
	for (const collection of collections) {
		const matches = collectionAliasKeys(collection).some((alias) => alias && haystack.includes(alias));
		if (matches) {
			byId.set(slugify(collection.id || collection.title), collection);
		}
	}

	return [...byId.values()].map((collection) => ({
		id: compactText(collection?.id || collection?.title),
		title: compactText(collection?.title || collection?.id),
	}));
}

function inferBrowsableCategories(entry, collections, authorNames) {
	const collectionKeys = new Set(collections.flatMap((collection) => collectionAliasKeys(collection)));
	const authorKeys = new Set(authorNames.map((name) => slugify(name)));
	return uniqueNonEmpty(entry?.categories)
		.filter((title) => {
			const key = slugify(title);
			if (!key || key === "all-civilizations") {
				return false;
			}
			if (authorKeys.has(key)) {
				return false;
			}
			if (collectionKeys.has(key)) {
				return false;
			}
			return true;
		})
		.map((title) => ({
			id: slugify(title),
			title,
		}));
}

async function loadEntries() {
	const files = (await readdir(PEDIA_DIR)).filter((file) => file.endsWith(".json")).sort();
	const entries = [];
	for (const file of files) {
		const text = await readFile(resolve(PEDIA_DIR, file), "utf8");
		entries.push(JSON.parse(text));
	}
	return entries;
}

async function loadCollections() {
	const module = await import(`${pathToFileURL(PEDIA_COLLECTIONS_FILE).href}?t=${Date.now()}`);
	return Array.isArray(module?.PEDIA_COLLECTIONS) ? module.PEDIA_COLLECTIONS : [];
}

async function loadAuthorProfiles() {
	return JSON.parse(await readFile(PEDIA_AUTHOR_PROFILES_FILE, "utf8"));
}

export async function buildPediaRouteManifest() {
	const entries = await loadEntries();
	const collections = await loadCollections();
	const authorProfiles = await loadAuthorProfiles();
	const knownAuthorNames = uniqueNonEmpty([...authorProfiles.map((profile) => profile?.name), ...entries.flatMap((entry) => entryAuthors(entry))]);
	const today = new Date().toISOString().slice(0, 10);

	const entryRoutes = entries.map((entry) => ({
		kind: "entry",
		path: `/modded-civs-pedia/civilizations/${slugify(entry?.slug || entry?.title)}`,
		lastmod: parseLastUpdatedDate(entry?.source?.lastUpdated) || today,
		entry,
	}));

	const collectionMap = new Map();
	for (const collection of collections) {
		collectionMap.set(slugify(collection.id || collection.title), { ...collection, entries: [] });
	}
	for (const entry of entries) {
		for (const collection of inferCollectionsForEntry(entry, collections)) {
			const key = slugify(collection.id || collection.title);
			const target = collectionMap.get(key);
			if (target) {
				target.entries.push(entry);
			}
		}
	}
	const collectionRoutes = [...collectionMap.values()]
		.filter((collection) => collection.entries.length > 0)
		.map((collection) => ({
			kind: "collection",
			path: `/modded-civs-pedia/collection/${slugify(collection.id || collection.title)}`,
			lastmod:
				collection.entries
					.map((entry) => parseLastUpdatedDate(entry?.source?.lastUpdated))
					.filter(Boolean)
					.sort()
					.at(-1) || today,
			collection: {
				...collection,
				entries: sortPediaEntries(collection.entries),
			},
		}))
		.sort((left, right) => left.path.localeCompare(right.path));

	const categoryMap = new Map();
	for (const entry of entries) {
		for (const category of inferBrowsableCategories(entry, collections, knownAuthorNames)) {
			const existing = categoryMap.get(category.id) || { ...category, entries: [] };
			existing.entries.push(entry);
			categoryMap.set(category.id, existing);
		}
	}
	const categoryRoutes = [...categoryMap.values()]
		.map((category) => ({
			kind: "category",
			path: `/modded-civs-pedia/category/${category.id}`,
			lastmod:
				category.entries
					.map((entry) => parseLastUpdatedDate(entry?.source?.lastUpdated))
					.filter(Boolean)
					.sort()
					.at(-1) || today,
			category: {
				...category,
				entries: sortPediaEntries(category.entries),
			},
		}))
		.sort((left, right) => left.path.localeCompare(right.path));

	const authorMap = new Map();
	for (const entry of entries) {
		for (const authorName of entryAuthors(entry)) {
			const key = slugify(authorName);
			const profile = authorProfiles.find((candidate) => slugify(candidate?.name) === key) || null;
			const existing = authorMap.get(key) || {
				id: key,
				name: authorName,
				blurb: compactText(profile?.blurb),
				links: Array.isArray(profile?.links) ? profile.links.filter((link) => compactText(link?.href) && compactText(link?.label)) : [],
				entries: [],
			};
			existing.entries.push(entry);
			authorMap.set(key, existing);
		}
	}
	const authorRoutes = [...authorMap.values()]
		.map((author) => ({
			kind: "author",
			path: `/modded-civs-pedia/author/${author.id}`,
			lastmod:
				author.entries
					.map((entry) => parseLastUpdatedDate(entry?.source?.lastUpdated))
					.filter(Boolean)
					.sort()
					.at(-1) || today,
			author: {
				...author,
				entries: sortPediaEntries(author.entries),
			},
		}))
		.sort((left, right) => left.path.localeCompare(right.path));

	const hubLastmod =
		entryRoutes
			.map((route) => route.lastmod)
			.filter(Boolean)
			.sort()
			.at(-1) || today;

	return {
		today,
		hubLastmod,
		entryRoutes,
		collectionRoutes,
		categoryRoutes,
		authorRoutes,
		pediaRoutes: [
			{
				kind: "hub",
				path: "/modded-civs-pedia",
				lastmod: hubLastmod,
			},
			...entryRoutes,
			...collectionRoutes,
			...categoryRoutes,
			...authorRoutes,
		],
	};
}
