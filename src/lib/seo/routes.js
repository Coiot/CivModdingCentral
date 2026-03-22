export const SITE_URL = "https://civmoddingcentral.dev";
export const SITE_NAME = "Civ Modding Central";
export const SITE_IMAGE = `${SITE_URL}/brand/CMC-logo.jpg`;
export const SITE_LOGO = `${SITE_URL}/icons/apple-touch-icon.png`;
export const DEFAULT_ROBOTS = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
const MODDED_CIVS_PEDIA_PATH = "/modded-civs-pedia";

const SAME_AS_URLS = ["https://discord.gg/yf8jUXf", "https://old.reddit.com/r/civmoddingcentral/"];

import { BUILTIN_MODDED_CIVS } from "../data/moddedCivsPedia.js";
import { groupPediaCategories, groupPediaCollections, normalizePediaEntry } from "../utils/moddedCivsPedia.js";

const ROUTE_SEO = {
	"/": {
		title: "Learn, Build, and Publish Civilization V Mods | Civ Modding Central",
		description:
			"Start learning Civilization V modding with Civ Modding Central's guided planner, template generators, schema and Lua references, art helpers, packaging tools, and Workshop publishing app.",
		keywords: "Civilization V modding, Civ 5 mod tools, guided planner, template generators, schema browser, Lua API explorer, workshop uploader, Civ Modding Central",
		pageType: "WebPage",
	},
	"/dds-converter": {
		title: "DDS Converter for Civilization V Textures | Civ Modding Central",
		description: "Convert PNG files into Civilization V-ready DDS outputs for UI textures, icon atlases, strategic view sheets, unit textures, and terrain textures.",
		keywords: "Civilization V DDS converter, Civ 5 DDS tool, DXT3, DXT5, strategic view, icon atlas",
		pageType: "WebApplication",
		applicationCategory: "DesignApplication",
	},
	"/modinfo-builder": {
		title: ".modinfo Builder for Civilization V Mods | Civ Modding Central",
		description: "Create and edit Civilization V .modinfo files with auto-filled MD5 generation, file lists, actions, entry points, dependencies, and XML output.",
		keywords: "Civilization V modinfo builder, Civ 5 modinfo tool, md5 generator, mod packaging",
		pageType: "WebApplication",
		applicationCategory: "DeveloperApplication",
	},
	"/civ5mod-ziper": {
		title: ".civ5mod 7z Builder for Civilization V Mods | Civ Modding Central",
		description: "Build true .civ5mod archives in the browser for Civilization V mods, including .modinfo hash normalization and legacy 7z compatibility.",
		keywords: "Civilization V civ5mod builder, Civ 5 7z packer, mod archive maker, civ5mod ziper",
		pageType: "WebApplication",
		applicationCategory: "DeveloperApplication",
	},
	"/community-links": {
		title: "Civ V Modding Links and Community Resources | Civ Modding Central",
		description: "Browse community links for Civilization V modding, including Discord servers, Reddit communities, design references, and shared resource hubs.",
		keywords: "Civilization V modding links, Civ 5 Discord, Civ modding resources, community hubs",
		pageType: "CollectionPage",
	},
	"/map-viewer": {
		title: "Civ V Map Viewer and Community Map Browser | Civ Modding Central",
		description: "Browse Civilization V maps with an interactive map viewer for community scenarios, tile inspection, regional context, and shared map exploration.",
		keywords: "Civilization V map viewer, Civ 5 community maps, Civ 5 map browser, scenario maps, tile inspection",
		pageType: "CollectionPage",
	},
	"/tech-tree-viewer": {
		title: "Civ V Tech Tree Viewer and Unlock Reference | Civ Modding Central",
		description: "Browse Civilization V technologies by era with prerequisites, unlock lists, resource reveals, and support effects for planning uniques and progression gates.",
		keywords: "Civilization V tech tree viewer, Civ 5 technology unlocks, Civ 5 tech prerequisites, Civ 5 progression reference",
		pageType: "CollectionPage",
	},
	"/religion-support": {
		title: "Civ V Religion Support and Historical Religions Reference | Civ Modding Central",
		description: "Browse Historical Religions and companion religion packs for Civilization V with grouped religion entries, icon atlas metadata, and Civilopedia support text.",
		keywords: "Civilization V religion support, Civ 5 Historical Religions, Civ 5 religion packs, religion atlas reference, Civ 5 religion icons",
		pageType: "CollectionPage",
	},
	"/pattern-library": {
		title: "Pattern Library for Civ V Modding Workflows | Civ Modding Central",
		description: "Browse our Pattern Library for curated code examples covering the most common tasks and implementations.",
		keywords: "Civilization V pattern library, Civ 5 patterns, dummy building helper, notification builder, persistent data helper",
		pageType: "CollectionPage",
	},
	"/template-generators": {
		title: "Template Generators for Civ V Content Creation | Civ Modding Central",
		description: "Use our starter template to get started with brand new Civ V civ mod that is ready to customize and expand.",
		keywords: "Civilization V template generator, Civ 5 unit template, building template, civilization template, atlas registration builder",
		pageType: "CollectionPage",
	},
	"/guided-planner": {
		title: "Guided Planner for Civilization V Civ Mods and Release Workflow | Civ Modding Central",
		description: "Build a full Civilization V civ mod like a campaign instead of a flat checklist, with grouped lanes for design, gameplay, art, text, packaging, and workshop release.",
		keywords: "Civilization V guided planner, Civ 5 civ mod checklist, civ mod planner, Civ 5 mod workflow, Civilization V mod release planning, civ mod campaign workflow",
		pageType: "CollectionPage",
	},
	"/schema-browser": {
		title: "Civ V Schema Browser and Table Reference | Civ Modding Central",
		description: "Browse the Civilization V database schema with searchable tables, columns, foreign keys, incoming references, and companion table hints.",
		keywords: "Civilization V schema browser, Civ 5 database tables, Civ 5 foreign keys, Buildings table, Units table",
		pageType: "CollectionPage",
	},
	"/lua-api-explorer": {
		title: "Civ V Lua API Explorer and GameEvents Reference | Civ Modding Central",
		description: "Search through Civilization V Lua methods and GameEvents with parameter lists, examples, schema touchpoints, and known gotchas.",
		keywords: "Civilization V Lua API explorer, Civ 5 GameEvents, Civ 5 Lua methods, Player API, City API",
		pageType: "CollectionPage",
	},
	"/modded-civs-pedia": {
		title: "Modded Civs Pedia for Civilization V Custom Civilizations | Civ Modding Central",
		description: "Browse structured entries for custom Civilization V civilizations and convert fandom wiki markup or mod folders into reusable pedia JSON and wiki outputs.",
		keywords: "Civilization V modded civs pedia, Civ 5 custom civilizations database, fandom wiki converter, civ mod folder parser",
		pageType: "CollectionPage",
	},
	"/civ-icon-maker": {
		title: "Civ V Icon Maker and Alpha Atlas Tool | Civ Modding Central",
		description: "Create Civilization V style icon renders with layered lighting, color controls, drag positioning, and export-ready alpha atlas styling.",
		keywords: "Civilization V icon maker, Civ 5 alpha atlas, civ icon tool",
		pageType: "WebApplication",
		applicationCategory: "DesignApplication",
	},
	// "/unit-flag-previewer": {
	// 	title: "Unit Flag Previewer Concept for Civ V Art Checks | Civ Modding Central",
	// 	description: "Preview interface for testing banner readability, alpha edges, and battlefield contrast before DDS export.",
	// 	keywords: "Civilization V unit flag previewer, Civ 5 unit flag art, unit flag readability, Civ V banner helper",
	// 	pageType: "WebPage",
	// },
	"/workshop-uploader": {
		title: "CMC Workshop Uploader for Civilization V Steam Workshop | Civ Modding Central",
		description:
			"Download the standalone CMC Workshop Uploader desktop app for Civilization V Steam Workshop publishing and updates, with built-in .modinfo and .civ5mod helpers across Windows, macOS, and Linux.",
		keywords: "CMC Workshop Uploader, Civilization V workshop uploader, Civ 5 Steam Workshop desktop app, Windows, macOS, Linux",
		pageType: "SoftwareApplication",
		applicationCategory: "DeveloperApplication",
		operatingSystem: "Windows, macOS, Linux",
		softwareVersion: "0.1.13",
	},
};

function slugifySeoValue(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function primaryAuthor(entry) {
	return (entry?.credits || []).find((credit) => /\bauthor\b/i.test(credit?.role || ""))?.name || entry?.credits?.[0]?.name || "Unknown Author";
}

const BUILTIN_PEDIA_ENTRIES = BUILTIN_MODDED_CIVS.map((entry) => normalizePediaEntry(entry));
const BUILTIN_PEDIA_COLLECTIONS = groupPediaCollections(BUILTIN_PEDIA_ENTRIES);
const BUILTIN_PEDIA_CATEGORIES = groupPediaCategories(BUILTIN_PEDIA_ENTRIES);

function findPediaEntryByPath(pathname) {
	const normalizedPath = normalizeSeoPath(pathname);
	if (!normalizedPath.startsWith(`${MODDED_CIVS_PEDIA_PATH}/`)) {
		return null;
	}
	if (
		normalizedPath.startsWith(`${MODDED_CIVS_PEDIA_PATH}/author/`) ||
		normalizedPath.startsWith(`${MODDED_CIVS_PEDIA_PATH}/collection/`) ||
		normalizedPath.startsWith(`${MODDED_CIVS_PEDIA_PATH}/category/`)
	) {
		return null;
	}
	const slug = normalizedPath.slice(MODDED_CIVS_PEDIA_PATH.length + 1);
	if (!slug) {
		return null;
	}
	return BUILTIN_PEDIA_ENTRIES.find((entry) => slugifySeoValue(entry?.slug || entry?.title) === slug) || null;
}

function findPediaCollectionByPath(pathname) {
	const normalizedPath = normalizeSeoPath(pathname);
	if (!normalizedPath.startsWith(`${MODDED_CIVS_PEDIA_PATH}/collection/`)) {
		return null;
	}
	const slug = normalizedPath.slice(`${MODDED_CIVS_PEDIA_PATH}/collection/`.length);
	if (!slug) {
		return null;
	}
	return BUILTIN_PEDIA_COLLECTIONS.find((collection) => slugifySeoValue(collection?.id || collection?.title) === slug) || null;
}

function findPediaCategoryByPath(pathname) {
	const normalizedPath = normalizeSeoPath(pathname);
	if (!normalizedPath.startsWith(`${MODDED_CIVS_PEDIA_PATH}/category/`)) {
		return null;
	}
	const slug = normalizedPath.slice(`${MODDED_CIVS_PEDIA_PATH}/category/`.length);
	if (!slug) {
		return null;
	}
	return BUILTIN_PEDIA_CATEGORIES.find((category) => slugifySeoValue(category?.id || category?.title) === slug) || null;
}

function getPediaEntrySeo(pathname) {
	const entry = findPediaEntryByPath(pathname);
	if (!entry) {
		return null;
	}

	const normalizedPath = normalizeSeoPath(pathname);
	const titleBase = entry?.leader ? `${entry.title} (${entry.leader})` : entry.title;
	const description = entry?.summary || entry?.overview?.civilization?.body || `Browse the ${entry?.title || "custom civilization"} entry in the Modded Civs Pedia on Civ Modding Central.`;
	const keywords = [entry?.title, entry?.leader, primaryAuthor(entry), entry?.identity?.culture, "Civilization V custom civilization", "Civ 5 modded civs pedia"].filter(Boolean).join(", ");

	return {
		title: `${titleBase} | Modded Civs Pedia | Civ Modding Central`,
		description,
		keywords,
		pageType: "Article",
		pathname: normalizedPath,
		canonical: `${SITE_URL}${normalizedPath}`,
		image: entry?.presentation?.mapImageUrl || entry?.presentation?.iconImageUrl || SITE_IMAGE,
		robots: DEFAULT_ROBOTS,
		entry,
		parentPath: MODDED_CIVS_PEDIA_PATH,
		parentName: ROUTE_SEO[MODDED_CIVS_PEDIA_PATH].title.replace(/\s+\|\s+Civ Modding Central$/, ""),
	};
}

function getPediaCollectionSeo(pathname) {
	const collection = findPediaCollectionByPath(pathname);
	if (!collection) {
		return null;
	}

	const normalizedPath = normalizeSeoPath(pathname);
	const description = `${collection.entries.length} member civ${collection.entries.length === 1 ? "" : "s"} in the ${collection.title} collection from the Modded Civs Pedia on Civ Modding Central.`;

	return {
		title: `${collection.title} | Modded Civs Pedia | Civ Modding Central`,
		description,
		keywords: [collection.title, "Civilization V custom civilization collection", "Civ 5 modded civs pedia"].filter(Boolean).join(", "),
		pageType: "CollectionPage",
		pathname: normalizedPath,
		canonical: `${SITE_URL}${normalizedPath}`,
		image: collection.entries[0]?.presentation?.mapImageUrl || collection.entries[0]?.presentation?.iconImageUrl || SITE_IMAGE,
		robots: DEFAULT_ROBOTS,
		collection,
		parentPath: MODDED_CIVS_PEDIA_PATH,
		parentName: ROUTE_SEO[MODDED_CIVS_PEDIA_PATH].title.replace(/\s+\|\s+Civ Modding Central$/, ""),
	};
}

function getPediaCategorySeo(pathname) {
	const category = findPediaCategoryByPath(pathname);
	if (!category) {
		return null;
	}

	const normalizedPath = normalizeSeoPath(pathname);
	const description = `${category.entries.length} civ${category.entries.length === 1 ? "" : "s"} tagged with ${category.title} in the Modded Civs Pedia on Civ Modding Central.`;

	return {
		title: `${category.title} | Modded Civs Pedia | Civ Modding Central`,
		description,
		keywords: [category.title, "Civilization V custom civilization category", "Civ 5 modded civs pedia"].filter(Boolean).join(", "),
		pageType: "CollectionPage",
		pathname: normalizedPath,
		canonical: `${SITE_URL}${normalizedPath}`,
		image: category.entries[0]?.presentation?.mapImageUrl || category.entries[0]?.presentation?.iconImageUrl || SITE_IMAGE,
		robots: DEFAULT_ROBOTS,
		category,
		parentPath: MODDED_CIVS_PEDIA_PATH,
		parentName: ROUTE_SEO[MODDED_CIVS_PEDIA_PATH].title.replace(/\s+\|\s+Civ Modding Central$/, ""),
	};
}

export function normalizeSeoPath(value) {
	const raw = String(value || "").trim();
	if (!raw || raw === "/") {
		return "/";
	}

	const withoutQuery = raw.split("#")[0].split("?")[0] || "/";
	if (withoutQuery === "/") {
		return "/";
	}

	return withoutQuery.replace(/\/+$/, "") || "/";
}

export function getRouteSeo(pathname) {
	const normalizedPath = normalizeSeoPath(pathname);
	const pediaCollectionSeo = getPediaCollectionSeo(normalizedPath);
	if (pediaCollectionSeo) {
		return pediaCollectionSeo;
	}
	const pediaCategorySeo = getPediaCategorySeo(normalizedPath);
	if (pediaCategorySeo) {
		return pediaCategorySeo;
	}
	const pediaSeo = getPediaEntrySeo(normalizedPath);
	if (pediaSeo) {
		return pediaSeo;
	}
	const routeSeo = ROUTE_SEO[normalizedPath] || ROUTE_SEO["/"];
	const canonicalPath = normalizedPath === "/" ? "/" : normalizedPath;

	return {
		...routeSeo,
		pathname: normalizedPath,
		canonical: `${SITE_URL}${canonicalPath}`,
		image: SITE_IMAGE,
		robots: DEFAULT_ROBOTS,
	};
}

export function buildStructuredData(pathname) {
	const seo = typeof pathname === "string" ? getRouteSeo(pathname) : pathname;
	const graph = [
		{
			"@type": "Organization",
			"@id": `${SITE_URL}/#organization`,
			name: SITE_NAME,
			url: SITE_URL,
			logo: SITE_LOGO,
			sameAs: SAME_AS_URLS,
		},
		{
			"@type": "WebSite",
			"@id": `${SITE_URL}/#website`,
			name: SITE_NAME,
			url: SITE_URL,
			description: ROUTE_SEO["/"].description,
			publisher: { "@id": `${SITE_URL}/#organization` },
		},
	];

	if (seo.pathname !== "/") {
		const breadcrumbItems = [
			{
				"@type": "ListItem",
				position: 1,
				name: "Home",
				item: `${SITE_URL}/`,
			},
		];
		if (seo.parentPath && seo.parentName) {
			breadcrumbItems.push({
				"@type": "ListItem",
				position: 2,
				name: seo.parentName,
				item: `${SITE_URL}${seo.parentPath}`,
			});
			breadcrumbItems.push({
				"@type": "ListItem",
				position: 3,
				name: seo.title.replace(/\s+\|\s+Civ Modding Central$/, ""),
				item: seo.canonical,
			});
		} else {
			breadcrumbItems.push({
				"@type": "ListItem",
				position: 2,
				name: seo.title.replace(/\s+\|\s+Civ Modding Central$/, ""),
				item: seo.canonical,
			});
		}

		graph.push({
			"@type": "BreadcrumbList",
			itemListElement: breadcrumbItems,
		});
	}

	const pageObject = {
		"@type": seo.pageType,
		name: seo.title.replace(/\s+\|\s+Civ Modding Central$/, ""),
		url: seo.canonical,
		description: seo.description,
		isPartOf: { "@id": `${SITE_URL}/#website` },
		about: "Civilization V modding",
		image: seo.image,
	};

	if (seo.pageType === "WebApplication" || seo.pageType === "SoftwareApplication") {
		pageObject.applicationCategory = seo.applicationCategory || "DeveloperApplication";
		pageObject.operatingSystem = seo.operatingSystem || (seo.pageType === "WebApplication" ? "Any" : "Windows, macOS, Linux");
		pageObject.isAccessibleForFree = true;
		pageObject.offers = {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		};
		if (seo.softwareVersion) {
			pageObject.softwareVersion = seo.softwareVersion;
		}
		if (seo.pageType === "WebApplication") {
			pageObject.browserRequirements = "Requires a modern web browser and JavaScript.";
		}
	}

	if (seo.pageType === "Article" && seo.entry) {
		pageObject.author = {
			"@type": "Person",
			name: primaryAuthor(seo.entry),
		};
		pageObject.headline = seo.title.replace(/\s+\|\s+Civ Modding Central$/, "");
	}

	graph.push(pageObject);
	return {
		"@context": "https://schema.org",
		"@graph": graph,
	};
}

export function getStructuredDataJson(pathname) {
	return JSON.stringify(buildStructuredData(pathname), null, 2);
}

function updateMetaTag(id, content) {
	const element = typeof document !== "undefined" ? document.getElementById(id) : null;
	if (!element || typeof content !== "string") {
		return;
	}
	element.setAttribute("content", content);
}

export function applyDocumentSeo(pathname) {
	if (typeof document === "undefined") {
		return;
	}

	const seo = getRouteSeo(pathname);
	document.title = seo.title;
	updateMetaTag("meta-description", seo.description);
	updateMetaTag("meta-keywords", seo.keywords);
	updateMetaTag("meta-robots", seo.robots);
	updateMetaTag("meta-og-url", seo.canonical);
	updateMetaTag("meta-og-title", seo.title);
	updateMetaTag("meta-og-description", seo.description);
	updateMetaTag("meta-og-image", seo.image);
	updateMetaTag("meta-twitter-title", seo.title);
	updateMetaTag("meta-twitter-description", seo.description);
	updateMetaTag("meta-twitter-image", seo.image);

	const canonical = document.getElementById("canonical-url");
	if (canonical) {
		canonical.setAttribute("href", seo.canonical);
	}

	const structuredData = document.getElementById("structured-data");
	if (structuredData) {
		structuredData.textContent = getStructuredDataJson(seo);
	}
}
