import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPediaRouteManifest } from "./lib/pediaRouteManifest.mjs";

const ROOT_DIR = resolve(new URL(".", import.meta.url).pathname, "..");
const SITE_URL = "https://civmoddingcentral.dev";
const STATIC_DIR = resolve(ROOT_DIR, "static");

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

async function buildSeoDiscoveryFiles() {
	const { today, hubLastmod, entryRoutes: rawEntryRoutes, collectionRoutes: rawCollectionRoutes, categoryRoutes: rawCategoryRoutes, authorRoutes: rawAuthorRoutes } = await buildPediaRouteManifest();
	const entryRoutes = dedupeRoutesByPath(
		rawEntryRoutes.map((route) => ({
			...route,
			changefreq: "monthly",
			priority: "0.72",
		})),
	);
	const collectionRoutes = rawCollectionRoutes.map((route) => ({
		...route,
		changefreq: "weekly",
		priority: "0.76",
	}));
	const categoryRoutes = rawCategoryRoutes.map((route) => ({
		...route,
		changefreq: "weekly",
		priority: "0.7",
	}));
	const authorRoutes = rawAuthorRoutes.map((route) => ({
		...route,
		changefreq: "weekly",
		priority: "0.68",
	}));
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
