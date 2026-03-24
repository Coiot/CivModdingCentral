import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPediaRouteManifest } from "./lib/pediaRouteManifest.mjs";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = resolve(ROOT_DIR, "dist");
const DIST_INDEX_FILE = resolve(DIST_DIR, "index.html");

const SITE_URL = "https://civmoddingcentral.dev";
const SITE_NAME = "Civ Modding Central";
const SITE_IMAGE = `${SITE_URL}/brand/CMC-logo.jpg`;
const SITE_LOGO = `${SITE_URL}/icons/apple-touch-icon.png`;
const DEFAULT_ROBOTS = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
const MODDED_CIVS_PEDIA_PATH = "/modded-civs-pedia";
const PEDIA_HUB_TITLE = "Modded Civs Pedia for Civilization V Custom Civilizations | Civ Modding Central";
const PEDIA_HUB_PARENT_NAME = "Modded Civs Pedia";
const SAME_AS_URLS = ["https://discord.gg/yf8jUXf", "https://old.reddit.com/r/civmoddingcentral/"];

function compactText(value) {
	return String(value || "")
		.replace(/\s+/g, " ")
		.trim();
}

function truncateDescription(value, maxLength = 175) {
	const text = compactText(value);
	if (!text || text.length <= maxLength) {
		return text;
	}
	const truncated = text.slice(0, maxLength - 1);
	const lastSpace = truncated.lastIndexOf(" ");
	return `${(lastSpace > 96 ? truncated.slice(0, lastSpace) : truncated).trim()}...`;
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
	return new Date(parsed).toISOString();
}

function entryAuthors(entry) {
	const authors = uniqueNonEmpty(entry?.authors);
	if (authors.length) {
		return authors;
	}
	const creditAuthors = uniqueNonEmpty((entry?.credits || []).filter((credit) => /\bauthor\b/i.test(credit?.role || "")).map((credit) => credit?.name));
	if (creditAuthors.length) {
		return creditAuthors;
	}
	const fallback = compactText((entry?.credits || [])[0]?.name);
	return fallback ? [fallback] : [];
}

function entryPath(entry) {
	return `${MODDED_CIVS_PEDIA_PATH}/civilizations/${compactText(entry?.slug || entry?.title)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")}`;
}

function collectionPath(collection) {
	return `${MODDED_CIVS_PEDIA_PATH}/collection/${compactText(collection?.id || collection?.title)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")}`;
}

function categoryPath(category) {
	return `${MODDED_CIVS_PEDIA_PATH}/category/${compactText(category?.id || category?.title)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")}`;
}

function authorPath(authorName) {
	return `${MODDED_CIVS_PEDIA_PATH}/author/${compactText(authorName)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")}`;
}

function imageForEntry(entry) {
	return entry?.presentation?.mapImageUrl || entry?.presentation?.iconImageUrl || SITE_IMAGE;
}

function entryPreviewFacts(entry) {
	return uniqueNonEmpty([
		entry?.leader ? `Leader: ${entry.leader}` : "",
		entry?.identity?.capital ? `Capital: ${entry.identity.capital}` : "",
		entry?.identity?.culture ? `Culture: ${entry.identity.culture}` : "",
		entryAuthors(entry).length ? `Author: ${entryAuthors(entry).join(", ")}` : "",
	]);
}

function entryPreviewDescription(entry) {
	const base = compactText(entry?.summary || entry?.overview?.civilization?.body || `Browse the ${entry?.title || "custom civilization"} entry in the Modded Civs Pedia on Civ Modding Central.`);
	const facts = entryPreviewFacts(entry).slice(0, 3);
	return truncateDescription(facts.length ? `${base} ${facts.join(". ")}.` : base);
}

function imageForCollection(collection) {
	return collection?.imageURL || collection?.entries?.[0]?.presentation?.mapImageUrl || collection?.entries?.[0]?.presentation?.iconImageUrl || SITE_IMAGE;
}

function entryAbout(entry) {
	return uniqueNonEmpty([
		entry?.title,
		entry?.leader,
		entry?.identity?.culture,
		entry?.identity?.empireName,
		...(entry?.identity?.religion || []),
		...(entry?.collections || []).map((collection) => collection?.title),
	]);
}

function dedupeRoutesByPath(routes) {
	const seen = new Set();
	return routes.filter((route) => {
		if (seen.has(route.path)) {
			return false;
		}
		seen.add(route.path);
		return true;
	});
}

function stripSeoTitleSuffix(title) {
	return String(title || "")
		.replace(/\s+\|\s+Civ Modding Central$/, "")
		.replace(/\s+\|\s+Modded Civs Pedia$/, "");
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
	return escapeHtml(value).replace(/"/g, "&quot;");
}

function listMarkup(items, hrefForItem, labelForItem) {
	if (!items.length) {
		return "<p>No entries yet.</p>";
	}
	return `<ul>\n${items.map((item) => `\t<li><a href="${escapeAttribute(hrefForItem(item))}">${escapeHtml(labelForItem(item))}</a></li>`).join("\n")}\n</ul>`;
}

function basePediaHubSeo(manifest) {
	return {
		title: PEDIA_HUB_TITLE,
		description: truncateDescription(
			`Browse ${manifest.entryRoutes.length} structured custom civilization entries, ${manifest.collectionRoutes.length} collections, ${manifest.categoryRoutes.length} categories, and ${manifest.authorRoutes.length} authors in the Modded Civs Pedia on Civ Modding Central.`,
		),
		keywords: "Civilization V modded civs pedia, Civ 5 custom civilizations database, Civ 5 custom civ collections, Civ 5 mod authors, Civilization V modding reference",
		pageType: "CollectionPage",
		openGraphType: "website",
		canonical: `${SITE_URL}${MODDED_CIVS_PEDIA_PATH}`,
		image: SITE_IMAGE,
		imageAlt: "Modded Civs Pedia on Civ Modding Central",
		robots: DEFAULT_ROBOTS,
		authorName: SITE_NAME,
		pathname: MODDED_CIVS_PEDIA_PATH,
	};
}

function getPediaSeo(route, manifest) {
	if (route.kind === "hub") {
		return basePediaHubSeo(manifest);
	}

	if (route.kind === "entry") {
		const { entry } = route;
		const titleBase = entry?.leader ? `${entry.title} (${entry.leader})` : entry.title;
		const articleTags = uniqueNonEmpty([
			entry?.identity?.culture,
			entry?.identity?.capital,
			...entryAuthors(entry),
			...(entry?.identity?.religion || []),
			...(entry?.collections || []).map((collection) => collection?.title),
		]).slice(0, 8);
		return {
			title: `${titleBase} | Modded Civs Pedia | Civ Modding Central`,
			description: entryPreviewDescription(entry),
			keywords: uniqueNonEmpty([
				entry?.title,
				entry?.leader,
				...entryAuthors(entry),
				entry?.identity?.culture,
				...(entry?.collections || []).map((collection) => collection?.title),
				"Civilization V custom civilization",
				"Civ 5 modded civs pedia",
			]).join(", "),
			pageType: "Article",
			openGraphType: "article",
			canonical: `${SITE_URL}${route.path}`,
			image: imageForEntry(entry),
			imageAlt: `${titleBase} custom civilization map and entry artwork`,
			robots: DEFAULT_ROBOTS,
			dateModified: parseLastUpdatedDate(entry?.source?.lastUpdated),
			authorName: entryAuthors(entry).join(", "),
			articleAuthor: entryAuthors(entry).join(", "),
			articleSection: "Custom Civilizations",
			articleTags,
			twitterLabel1: "Leader",
			twitterData1: entry?.leader || "",
			twitterLabel2: entry?.identity?.capital ? "Capital" : "Culture",
			twitterData2: entry?.identity?.capital || entry?.identity?.culture || "",
			pathname: route.path,
			parentPath: MODDED_CIVS_PEDIA_PATH,
			parentName: PEDIA_HUB_PARENT_NAME,
			entry,
		};
	}

	if (route.kind === "collection") {
		const { collection } = route;
		return {
			title: `${collection.title} | Modded Civs Pedia | Civ Modding Central`,
			description: truncateDescription(
				collection?.blurb ||
					`${collection.entries.length} member civ${collection.entries.length === 1 ? "" : "s"} in the ${collection.title} collection from the Modded Civs Pedia on Civ Modding Central.`,
			),
			keywords: uniqueNonEmpty([
				collection?.title,
				...(collection?.aliases || []),
				...collection.entries.slice(0, 8).flatMap((entry) => [entry?.title, entry?.leader]),
				"Civilization V custom civilization collection",
				"Civ 5 modded civs pedia",
			]).join(", "),
			pageType: "CollectionPage",
			openGraphType: "website",
			canonical: `${SITE_URL}${route.path}`,
			image: imageForCollection(collection),
			imageAlt: `${collection.title} collection artwork`,
			robots: DEFAULT_ROBOTS,
			authorName: SITE_NAME,
			pathname: route.path,
			parentPath: MODDED_CIVS_PEDIA_PATH,
			parentName: PEDIA_HUB_PARENT_NAME,
			collection,
		};
	}

	if (route.kind === "category") {
		const { category } = route;
		return {
			title: `${category.title} | Modded Civs Pedia | Civ Modding Central`,
			description: truncateDescription(
				`${category.entries.length} civ${category.entries.length === 1 ? "" : "s"} tagged with ${category.title} in the Modded Civs Pedia on Civ Modding Central.`,
			),
			keywords: uniqueNonEmpty([
				category?.title,
				...category.entries.slice(0, 8).flatMap((entry) => [entry?.title, entry?.leader]),
				"Civilization V custom civilization category",
				"Civ 5 modded civs pedia",
			]).join(", "),
			pageType: "CollectionPage",
			openGraphType: "website",
			canonical: `${SITE_URL}${route.path}`,
			image: category.entries[0]?.presentation?.mapImageUrl || category.entries[0]?.presentation?.iconImageUrl || SITE_IMAGE,
			imageAlt: `${category.title} category artwork`,
			robots: DEFAULT_ROBOTS,
			authorName: SITE_NAME,
			pathname: route.path,
			parentPath: MODDED_CIVS_PEDIA_PATH,
			parentName: PEDIA_HUB_PARENT_NAME,
			category,
		};
	}

	const { author } = route;
	return {
		title: `${author.name} | Modded Civs Pedia | Civ Modding Central`,
		description: truncateDescription(
			author.blurb || `Browse ${author.entries.length} modded Civilization V civ${author.entries.length === 1 ? "" : "s"} by ${author.name} in the Modded Civs Pedia on Civ Modding Central.`,
		),
		keywords: uniqueNonEmpty([author.name, ...author.entries.slice(0, 8).flatMap((entry) => [entry?.title, entry?.leader]), "Civilization V mod author", "Civ 5 modded civs pedia"]).join(", "),
		pageType: "ProfilePage",
		openGraphType: "profile",
		canonical: `${SITE_URL}${route.path}`,
		image: author.entries[0]?.presentation?.iconImageUrl || author.entries[0]?.presentation?.mapImageUrl || SITE_IMAGE,
		imageAlt: `${author.name} author page`,
		robots: DEFAULT_ROBOTS,
		authorName: author.name,
		pathname: route.path,
		parentPath: MODDED_CIVS_PEDIA_PATH,
		parentName: PEDIA_HUB_PARENT_NAME,
		authorPage: author,
	};
}

function buildStructuredData(seo) {
	const pageName = stripSeoTitleSuffix(seo.title);
	const pageId = `${seo.canonical}#webpage`;
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
			description:
				"Start learning Civilization V modding with Civ Modding Central's guided planner, template generators, schema and Lua references, art helpers, packaging tools, and Workshop publishing app.",
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
				name: pageName,
				item: seo.canonical,
			});
		} else {
			breadcrumbItems.push({
				"@type": "ListItem",
				position: 2,
				name: pageName,
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
		"@id": pageId,
		name: pageName,
		url: seo.canonical,
		description: seo.description,
		isPartOf: { "@id": `${SITE_URL}/#website` },
		about: "Civilization V modding",
		image: seo.image,
		inLanguage: "en",
		keywords: seo.keywords,
		mainEntityOfPage: seo.canonical,
	};

	if (seo.pageType === "Article" && seo.entry) {
		pageObject.author = entryAuthors(seo.entry).map((name) => ({
			"@type": "Person",
			name,
		}));
		pageObject.headline = pageName;
		pageObject.about = entryAbout(seo.entry);
		if (seo.dateModified) {
			pageObject.dateModified = seo.dateModified;
		}
	}

	if (seo.collection) {
		const itemListId = `${seo.canonical}#itemlist`;
		graph.push({
			"@type": "ItemList",
			"@id": itemListId,
			name: `${seo.collection.title} civ entries`,
			itemListOrder: "https://schema.org/ItemListOrderAscending",
			numberOfItems: seo.collection.entries.length,
			itemListElement: seo.collection.entries.map((entry, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: entry?.leader ? `${entry.title} (${entry.leader})` : entry.title,
				url: `${SITE_URL}${entryPath(entry)}`,
			})),
		});
		pageObject.mainEntity = { "@id": itemListId };
		pageObject.about = uniqueNonEmpty([seo.collection.title, "Civilization V custom civilization collection"]);
	}

	if (seo.category) {
		const itemListId = `${seo.canonical}#itemlist`;
		graph.push({
			"@type": "ItemList",
			"@id": itemListId,
			name: `${seo.category.title} civ entries`,
			itemListOrder: "https://schema.org/ItemListOrderAscending",
			numberOfItems: seo.category.entries.length,
			itemListElement: seo.category.entries.map((entry, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: entry?.leader ? `${entry.title} (${entry.leader})` : entry.title,
				url: `${SITE_URL}${entryPath(entry)}`,
			})),
		});
		pageObject.mainEntity = { "@id": itemListId };
		pageObject.about = uniqueNonEmpty([seo.category.title, "Civilization V custom civilization category"]);
	}

	if (seo.authorPage) {
		const personId = `${seo.canonical}#person`;
		const itemListId = `${seo.canonical}#itemlist`;
		graph.push({
			"@type": "Person",
			"@id": personId,
			name: seo.authorPage.name,
			description: seo.authorPage.blurb || undefined,
			image: seo.image,
			sameAs: seo.authorPage.links.map((link) => link.href),
		});
		graph.push({
			"@type": "ItemList",
			"@id": itemListId,
			name: `${seo.authorPage.name} civ entries`,
			itemListOrder: "https://schema.org/ItemListOrderAscending",
			numberOfItems: seo.authorPage.entries.length,
			itemListElement: seo.authorPage.entries.map((entry, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: entry?.leader ? `${entry.title} (${entry.leader})` : entry.title,
				url: `${SITE_URL}${entryPath(entry)}`,
			})),
		});
		pageObject.mainEntity = { "@id": personId };
		pageObject.hasPart = { "@id": itemListId };
		pageObject.about = uniqueNonEmpty([seo.authorPage.name, "Civilization V mod author"]);
	}

	graph.push(pageObject);
	return JSON.stringify(
		{
			"@context": "https://schema.org",
			"@graph": graph,
		},
		null,
		2,
	);
}

function renderNoscriptContent(route, seo, manifest) {
	if (route.kind === "hub") {
		return `<main>
\t<h1>${escapeHtml(stripSeoTitleSuffix(seo.title))}</h1>
\t<p>${escapeHtml(seo.description)}</p>
\t<p>${manifest.entryRoutes.length} entries, ${manifest.collectionRoutes.length} collections, ${manifest.categoryRoutes.length} categories, and ${manifest.authorRoutes.length} author pages.</p>
\t<h2>Featured Collections</h2>
\t${listMarkup(
			manifest.collectionRoutes.slice(0, 12).map((routeItem) => routeItem.collection),
			collectionPath,
			(collection) => collection.title,
		)}
\t<h2>Browse Authors</h2>
\t${listMarkup(
			manifest.authorRoutes.slice(0, 12).map((routeItem) => routeItem.author),
			(author) => authorPath(author.name),
			(author) => author.name,
		)}
</main>`;
	}

	if (route.kind === "entry") {
		const { entry } = route;
		const collections = Array.isArray(entry?.collections) ? entry.collections : [];
		const uniqueMarkup =
			Array.isArray(entry?.uniques) && entry.uniques.length
				? `<h2>Unique Attributes</h2>\n\t<ul>\n${entry.uniques
						.slice(0, 4)
						.map((unique) => `\t\t<li>${escapeHtml(unique?.name || "Unique")}</li>`)
						.join("\n")}\n\t</ul>`
				: "";
		return `<main>
\t<p><a href="${MODDED_CIVS_PEDIA_PATH}">Back to Modded Civs Pedia</a></p>
\t<h1>${escapeHtml(stripSeoTitleSuffix(seo.title))}</h1>
\t<p>${escapeHtml(seo.description)}</p>
\t<ul>
\t\t<li><strong>Leader:</strong> ${escapeHtml(entry?.leader || "Unknown")}</li>
\t\t<li><strong>Authors:</strong> ${escapeHtml(entryAuthors(entry).join(", ") || "Unknown")}</li>
\t\t${entry?.capital ? `<li><strong>Capital:</strong> ${escapeHtml(entry.capital)}</li>` : ""}
\t\t${collections.length ? `<li><strong>Collections:</strong> ${collections.map((collection) => `<a href="${escapeAttribute(collectionPath(collection))}">${escapeHtml(collection.title || collection.id)}</a>`).join(", ")}</li>` : ""}
\t</ul>
\t${uniqueMarkup}
</main>`;
	}

	if (route.kind === "collection") {
		const { collection } = route;
		return `<main>
\t<p><a href="${MODDED_CIVS_PEDIA_PATH}">Back to Modded Civs Pedia</a></p>
\t<h1>${escapeHtml(collection.title)}</h1>
\t<p>${escapeHtml(collection.blurb || seo.description)}</p>
\t${collection?.links?.length ? `<p>${collection.links.map((link) => `<a href="${escapeAttribute(link.href)}">${escapeHtml(link.label)}</a>`).join(" | ")}</p>` : ""}
\t<h2>Entries</h2>
\t${listMarkup(collection.entries, entryPath, (entry) => (entry?.leader ? `${entry.title} (${entry.leader})` : entry.title))}
</main>`;
	}

	if (route.kind === "category") {
		const { category } = route;
		return `<main>
\t<p><a href="${MODDED_CIVS_PEDIA_PATH}">Back to Modded Civs Pedia</a></p>
\t<h1>${escapeHtml(category.title)}</h1>
\t<p>${escapeHtml(seo.description)}</p>
\t<h2>Entries</h2>
\t${listMarkup(category.entries, entryPath, (entry) => (entry?.leader ? `${entry.title} (${entry.leader})` : entry.title))}
</main>`;
	}

	const { author } = route;
	return `<main>
\t<p><a href="${MODDED_CIVS_PEDIA_PATH}">Back to Modded Civs Pedia</a></p>
\t<h1>${escapeHtml(author.name)}</h1>
\t<p>${escapeHtml(author.blurb || seo.description)}</p>
\t${author?.links?.length ? `<p>${author.links.map((link) => `<a href="${escapeAttribute(link.href)}">${escapeHtml(link.label)}</a>`).join(" | ")}</p>` : ""}
\t<h2>Entries</h2>
\t${listMarkup(author.entries, entryPath, (entry) => (entry?.leader ? `${entry.title} (${entry.leader})` : entry.title))}
</main>`;
}

function replaceTitle(html, value) {
	return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(value)}</title>`);
}

function replaceMetaContent(html, id, value) {
	return html.replace(new RegExp(`(<meta[^>]*id="${id}"[^>]*content=")([^"]*)("[\\s\\S]*?>)`, "i"), (_, start, _current, end) => `${start}${escapeAttribute(value)}${end}`);
}

function replaceCanonicalHref(html, value) {
	return html.replace(/(<link[^>]*id="canonical-url"[^>]*href=")([^"]*)("[\s\S]*?>)/i, (_, start, _current, end) => `${start}${escapeAttribute(value)}${end}`);
}

function replaceStructuredData(html, value) {
	return html.replace(/(<script[^>]*id="structured-data"[^>]*>)[\s\S]*?(<\/script>)/i, `$1\n${value}\n\t\t$2`);
}

function replaceNoscript(html, value) {
	return html.replace(/<noscript>[\s\S]*?<\/noscript>/i, `<noscript>\n\t\t\t${value.replace(/\n/g, "\n\t\t\t")}\n\t\t</noscript>`);
}

function routeOutputFile(pathname) {
	const relativePath = pathname.replace(/^\/+/, "");
	return resolve(DIST_DIR, relativePath, "index.html");
}

function applySeoToHtml(template, seo, noscriptContent) {
	let html = template;
	html = replaceTitle(html, seo.title);
	html = replaceMetaContent(html, "meta-description", seo.description);
	html = replaceMetaContent(html, "meta-keywords", seo.keywords || "");
	html = replaceMetaContent(html, "meta-author", seo.authorName || SITE_NAME);
	html = replaceMetaContent(html, "meta-robots", seo.robots || DEFAULT_ROBOTS);
	html = replaceMetaContent(html, "meta-og-type", seo.openGraphType || "website");
	html = replaceMetaContent(html, "meta-og-url", seo.canonical);
	html = replaceMetaContent(html, "meta-og-title", seo.title);
	html = replaceMetaContent(html, "meta-og-description", seo.description);
	html = replaceMetaContent(html, "meta-og-image", seo.image);
	html = replaceMetaContent(html, "meta-og-image-alt", seo.imageAlt || "");
	html = replaceMetaContent(html, "meta-article-author", seo.articleAuthor || "");
	html = replaceMetaContent(html, "meta-article-section", seo.articleSection || "");
	html = replaceMetaContent(html, "meta-article-tag", Array.isArray(seo.articleTags) ? seo.articleTags.join(", ") : "");
	html = replaceMetaContent(html, "meta-article-modified-time", seo.dateModified || "");
	html = replaceMetaContent(html, "meta-twitter-title", seo.title);
	html = replaceMetaContent(html, "meta-twitter-description", seo.description);
	html = replaceMetaContent(html, "meta-twitter-image", seo.image);
	html = replaceMetaContent(html, "meta-twitter-image-alt", seo.imageAlt || "");
	html = replaceMetaContent(html, "meta-twitter-label1", seo.twitterLabel1 || "");
	html = replaceMetaContent(html, "meta-twitter-data1", seo.twitterData1 || "");
	html = replaceMetaContent(html, "meta-twitter-label2", seo.twitterLabel2 || "");
	html = replaceMetaContent(html, "meta-twitter-data2", seo.twitterData2 || "");
	html = replaceCanonicalHref(html, seo.canonical);
	html = replaceStructuredData(html, buildStructuredData(seo));
	html = replaceNoscript(html, noscriptContent);
	return html;
}

async function buildStaticPediaPages() {
	const template = await readFile(DIST_INDEX_FILE, "utf8");
	const manifest = await buildPediaRouteManifest();
	const routes = dedupeRoutesByPath(manifest.pediaRoutes);

	for (const route of routes) {
		const seo = getPediaSeo(route, manifest);
		const noscriptContent = renderNoscriptContent(route, seo, manifest);
		const html = applySeoToHtml(template, seo, noscriptContent);
		const outputFile = routeOutputFile(route.path);
		await mkdir(dirname(outputFile), { recursive: true });
		await writeFile(outputFile, html, "utf8");
	}
}

await buildStaticPediaPages();
