import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PEDIA_ENTRIES_DIR = resolve(ROOT, "src/lib/data/modded-civs-pedia");
const PEDIA_COLLECTIONS_FILE = resolve(ROOT, "src/lib/data/pediaCollections.js");
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_PEDIA_ENTRIES_TABLE = process.env.SUPABASE_PEDIA_ENTRIES_TABLE || "cmc_pedia_entries";
const SUPABASE_PEDIA_COLLECTIONS_TABLE = process.env.SUPABASE_PEDIA_COLLECTIONS_TABLE || "cmc_pedia_collections";

function cleanText(value) {
	return String(value || "").trim();
}

function normalizeSlug(value) {
	return cleanText(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function normalizeCollectionRecord(collection) {
	const title = cleanText(collection?.title);
	return {
		id: cleanText(collection?.id) || normalizeSlug(title),
		title,
		sourceTemplate: cleanText(collection?.sourceTemplate),
		imageURL: cleanText(collection?.imageURL),
		blurb: cleanText(collection?.blurb),
		aliases: [...new Set((Array.isArray(collection?.aliases) ? collection.aliases : []).map((alias) => cleanText(alias)).filter(Boolean))],
		links: Array.isArray(collection?.links)
			? collection.links
					.map((link) => ({
						label: cleanText(link?.label),
						href: cleanText(link?.href),
					}))
					.filter((link) => link.label && link.href)
			: [],
		colors: {
			background: cleanText(collection?.colors?.background),
			accent: cleanText(collection?.colors?.accent),
		},
	};
}

async function loadCollections() {
	const module = await import(`${pathToFileURL(PEDIA_COLLECTIONS_FILE).href}?t=${Date.now()}`);
	return Array.isArray(module?.PEDIA_COLLECTIONS) ? module.PEDIA_COLLECTIONS.map((collection) => normalizeCollectionRecord(collection)) : [];
}

async function loadEntries() {
	const files = (await readdir(PEDIA_ENTRIES_DIR)).filter((file) => file.endsWith(".json")).sort();
	const entries = [];

	for (const file of files) {
		const jsonPath = resolve(PEDIA_ENTRIES_DIR, file);
		const wikiPath = resolve(PEDIA_ENTRIES_DIR, file.replace(/\.json$/i, ".wiki.txt"));
		const entry = JSON.parse(await readFile(jsonPath, "utf8"));
		let wikiMarkup = "";

		try {
			wikiMarkup = await readFile(wikiPath, "utf8");
		} catch {
			wikiMarkup = "";
		}

		entries.push({
			id: cleanText(entry?.id),
			slug: cleanText(entry?.slug) || normalizeSlug(entry?.title),
			title: cleanText(entry?.title),
			summary: cleanText(entry?.summary),
			entry_state: entry,
			wiki_markup: wikiMarkup,
			is_deleted: false,
		});
	}

	return entries;
}

async function main() {
	if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before syncing the pedia.");
	}

	const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});

	const [entries, collections] = await Promise.all([loadEntries(), loadCollections()]);

	if (entries.length) {
		const { error } = await client.from(SUPABASE_PEDIA_ENTRIES_TABLE).upsert(entries, { onConflict: "id" });
		if (error) {
			throw error;
		}
	}

	if (collections.length) {
		const collectionRows = collections.map((collection) => ({
			id: collection.id,
			title: collection.title,
			collection_state: collection,
		}));
		const { error } = await client.from(SUPABASE_PEDIA_COLLECTIONS_TABLE).upsert(collectionRows, { onConflict: "id" });
		if (error) {
			throw error;
		}
	}

	console.log(`Synced ${entries.length} pedia entries and ${collections.length} pedia collections.`);
}

main().catch((error) => {
	console.error(error?.message || error);
	process.exitCode = 1;
});
