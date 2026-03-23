import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT_DIR = resolve(new URL(".", import.meta.url).pathname, "..");
const SITE_URL = "https://civmoddingcentral.dev";
const STATIC_DIR = resolve(ROOT_DIR, "static");
const PEDIA_DIR = resolve(ROOT_DIR, "src/lib/data/modded-civs-pedia");
const PEDIA_COLLECTIONS_FILE = resolve(ROOT_DIR, "src/lib/data/pediaCollections.js");
const PEDIA_AUTHOR_PROFILES_FILE = resolve(ROOT_DIR, "src/lib/data/pediaAuthorProfiles.json");

const TOP_LEVEL_PAGES = [
	{ path: "/", changefreq: "monthly", priority: "1.0" },
	{ path: "/modded-civs-pedia", changefreq: "weekly", priority: "0.9" },
	{ path: "/map-viewer", changefreq: "weekly", priority: "0.9" },
	{ path: "/guided-planner", changefreq: "weekly", priority: "0.95" },
	{ path: "/template-generators", changefreq: "weekly", priority: "0.9" },
	{ path: "/pattern-library", changefreq: "weekly", priority: "0.9" },
	{ path: "/schema-browser", changefreq: "weekly", priority: "0.9" },
	{ path: "/lua-api-explorer", changefreq: "weekly", priority: "0.9" },
	{ path: "/religion-support", changefreq: "weekly", priority: "0.85" },
	{ path: "/tech-tree-viewer", changefreq: "weekly", priority: "0.85" },
	{ path: "/civ-icon-maker", changefreq: "monthly", priority: "0.85" },
	{ path: "/dds-converter", changefreq: "monthly", priority: "0.8" },
	{ path: "/modinfo-builder", changefreq: "monthly", priority: "0.8" },
	{ path: "/civ5mod-ziper", changefreq: "monthly", priority: "0.8" },
	{ path: "/workshop-uploader", changefreq: "monthly", priority: "0.9" },
	{ path: "/community-links", changefreq: "monthly", priority: "0.7" },
];

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

function escapeXml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function dedupeRoutesByPath(routes) {
	const byPath = new Map();
	for (const route of routes) {
		const existing = byPath.get(route.path);
		if (!existing) {
			byPath.set(route.path, route);
			continue;
		}
		byPath.set(route.path, {
			...existing,
			...route,
			lastmod: [existing.lastmod, route.lastmod].filter(Boolean).sort().at(-1) || existing.lastmod || route.lastmod,
		});
	}
	return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
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

async function buildSeoDiscoveryFiles() {
	const entries = await loadEntries();
	const collections = await loadCollections();
	const authorProfiles = await loadAuthorProfiles();
	const knownAuthorNames = uniqueNonEmpty([...authorProfiles.map((profile) => profile?.name), ...entries.flatMap((entry) => entryAuthors(entry))]);
	const today = new Date().toISOString().slice(0, 10);
	const entryRoutes = dedupeRoutesByPath(
		entries.map((entry) => ({
			path: `/modded-civs-pedia/${slugify(entry?.slug || entry?.title)}`,
			lastmod: parseLastUpdatedDate(entry?.source?.lastUpdated) || today,
			changefreq: "monthly",
			priority: "0.72",
			entry,
		})),
	);

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
			path: `/modded-civs-pedia/collection/${slugify(collection.id || collection.title)}`,
			lastmod:
				collection.entries
					.map((entry) => parseLastUpdatedDate(entry?.source?.lastUpdated))
					.filter(Boolean)
					.sort()
					.at(-1) || today,
			changefreq: "weekly",
			priority: "0.76",
			collection,
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
			path: `/modded-civs-pedia/category/${category.id}`,
			lastmod:
				category.entries
					.map((entry) => parseLastUpdatedDate(entry?.source?.lastUpdated))
					.filter(Boolean)
					.sort()
					.at(-1) || today,
			changefreq: "weekly",
			priority: "0.7",
			category,
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
				links: Array.isArray(profile?.links) ? profile.links : [],
				entries: [],
			};
			existing.entries.push(entry);
			authorMap.set(key, existing);
		}
	}
	const authorRoutes = [...authorMap.values()]
		.map((author) => ({
			path: `/modded-civs-pedia/author/${author.id}`,
			lastmod:
				author.entries
					.map((entry) => parseLastUpdatedDate(entry?.source?.lastUpdated))
					.filter(Boolean)
					.sort()
					.at(-1) || today,
			changefreq: "weekly",
			priority: "0.68",
			author,
		}))
		.sort((left, right) => left.path.localeCompare(right.path));

	const hubLastmod =
		entryRoutes
			.map((route) => route.lastmod)
			.filter(Boolean)
			.sort()
			.at(-1) || today;
	const sitemapRoutes = dedupeRoutesByPath([
		...TOP_LEVEL_PAGES.map((page) => ({
			...page,
			lastmod: page.path === "/modded-civs-pedia" ? hubLastmod : today,
		})),
		...entryRoutes,
		...collectionRoutes,
		...categoryRoutes,
		...authorRoutes,
	]);

	const sitemapXml = `<?xml version="1.0" encoding="UTF-8" ?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes
		.map(
			(route) =>
				`  <url>\n    <loc>${escapeXml(`${SITE_URL}${route.path}`)}</loc>\n    <lastmod>${route.lastmod}</lastmod>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`,
		)
		.join("\n")}\n</urlset>\n`;

	const llmsText = `# Civ Modding Central

> Civilization V modding workspace with guided planning, generators, references, art tools, packaging helpers, publishing support, and a growing Modded Civs Pedia.

Civ Modding Central provides guided planning, template generators, a pattern library, schema and Lua references, art helpers, packaging tools, community resources, the standalone CMC Workshop Uploader, and a Modded Civs Pedia for custom civ entries, collections, categories, and creators.

## Main pages

${TOP_LEVEL_PAGES.map((page) => `- ${page.path === "/" ? "Home" : page.path.slice(1).replace(/-/g, " ")}: ${SITE_URL}${page.path}`).join("\n")}

## Modded Civs Pedia

- Hub: ${SITE_URL}/modded-civs-pedia

### Collections

${collectionRoutes.map((route) => `- ${route.collection.title}: ${SITE_URL}${route.path}`).join("\n")}

### Authors

${authorRoutes.map((route) => `- ${route.author.name}: ${SITE_URL}${route.path}`).join("\n")}

### Entry pages

${entryRoutes.map((route) => `- ${route.entry?.leader ? `${route.entry.title} (${route.entry.leader})` : route.entry.title}: ${SITE_URL}${route.path}`).join("\n")}

## Discovery

- Sitemap: ${SITE_URL}/sitemap.xml
- Robots: ${SITE_URL}/robots.txt
- AI index: ${SITE_URL}/ai.txt
`;

	await writeFile(resolve(STATIC_DIR, "sitemap.xml"), sitemapXml, "utf8");
	await writeFile(resolve(STATIC_DIR, "llms.txt"), llmsText, "utf8");
}

await buildSeoDiscoveryFiles();
