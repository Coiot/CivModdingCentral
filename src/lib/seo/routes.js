export const SITE_URL = "https://civmoddingcentral.dev";
export const SITE_NAME = "Civ Modding Central";
export const SITE_IMAGE = `${SITE_URL}/brand/CMC-logo.jpg`;
export const SITE_LOGO = `${SITE_URL}/icons/apple-touch-icon.png`;
export const DEFAULT_ROBOTS = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

const SAME_AS_URLS = ["https://discord.gg/yf8jUXf", "https://old.reddit.com/r/civmoddingcentral/"];

const ROUTE_SEO = {
	"/": {
		title: "CMC Workshop Uploader and Civ V Modding Tools | Civ Modding Central",
		description:
			"Download the cross-platform CMC Workshop Uploader for Civilization V Steam Workshop uploads on Windows, macOS, and Linux, then use the site for DDS conversion, .modinfo authoring, .civ5mod packaging, map viewing, and modding resources.",
		keywords: "CMC Workshop Uploader, Civilization V, Civ 5, modding tools, workshop uploader, Windows, macOS, Linux, DDS converter, modinfo builder, civ5mod ziper, map viewer",
		pageType: "SoftwareApplication",
		applicationCategory: "DeveloperApplication",
		operatingSystem: "Windows, macOS, Linux",
		softwareVersion: "0.1.13",
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
		description: "Create and edit Civilization V .modinfo files with MD5 generation, file lists, actions, entry points, dependencies, and save-ready XML output.",
		keywords: "Civilization V modinfo builder, Civ 5 modinfo tool, md5 generator, mod packaging",
		pageType: "WebApplication",
		applicationCategory: "DeveloperApplication",
	},
	"/civ5mod-ziper": {
		title: ".civ5mod 7z Builder for Civilization V Mods | Civ Modding Central",
		description: "Build true .civ5mod archives in the browser for Civilization V mods, including .modinfo hash normalization and legacy 7z compatibility adjustments.",
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
	"/civ-icon-maker": {
		title: "Civ V Icon Maker and Alpha Atlas Tool | Civ Modding Central",
		description: "Create Civilization V-style icon renders with layered lighting, color controls, drag positioning, and export-ready alpha atlas styling.",
		keywords: "Civilization V icon maker, Civ 5 alpha atlas, civ icon tool",
		pageType: "WebApplication",
		applicationCategory: "DesignApplication",
	},
	"/workshop-uploader": {
		title: "CMC Workshop Uploader for Civilization V Steam Workshop | Civ Modding Central",
		description:
			"Learn about the standalone CMC Workshop Uploader desktop app for Civilization V Steam Workshop uploads, updates, item lookup, .modinfo preparation, and .civ5mod packaging across Windows, macOS, and Linux.",
		keywords: "CMC Workshop Uploader, Civilization V workshop uploader, Civ 5 Steam Workshop desktop app, Windows, macOS, Linux",
		pageType: "SoftwareApplication",
		applicationCategory: "DeveloperApplication",
		operatingSystem: "Windows, macOS, Linux",
		softwareVersion: "0.1.13",
	},
};

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
		graph.push({
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Home",
					item: `${SITE_URL}/`,
				},
				{
					"@type": "ListItem",
					position: 2,
					name: seo.title.replace(/\s+\|\s+Civ Modding Central$/, ""),
					item: seo.canonical,
				},
			],
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
