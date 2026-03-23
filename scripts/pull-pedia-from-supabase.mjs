import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const loadedEnv = loadEnv(process.env.NODE_ENV || "development", ROOT, "");
const runtimeEnv = {
	...loadedEnv,
	...process.env,
};
const PEDIA_ENTRIES_DIR = resolve(ROOT, "src/lib/data/modded-civs-pedia");
const PEDIA_COLLECTIONS_FILE = resolve(ROOT, "src/lib/data/pediaCollections.js");
const SUPABASE_URL = runtimeEnv.SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = runtimeEnv.SUPABASE_SERVICE_ROLE_KEY || runtimeEnv.SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_PEDIA_ENTRIES_TABLE = runtimeEnv.SUPABASE_PEDIA_ENTRIES_TABLE || runtimeEnv.VITE_SUPABASE_PEDIA_ENTRIES_TABLE || "cmc_pedia_entries";
const SUPABASE_PEDIA_COLLECTIONS_TABLE = runtimeEnv.SUPABASE_PEDIA_COLLECTIONS_TABLE || runtimeEnv.VITE_SUPABASE_PEDIA_COLLECTIONS_TABLE || "cmc_pedia_collections";

const args = new Set(process.argv.slice(2));
const shouldPrune = args.has("--prune");
const shouldSyncCollections = !args.has("--skip-collections");
const shouldWriteWiki = args.has("--with-wiki");

function cleanText(value) {
	return String(value || "").trim();
}

function slugify(value) {
	return cleanText(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function serializeCollections(collections) {
	return `export const PEDIA_COLLECTIONS = ${JSON.stringify(collections, null, 2)};\n`;
}

function normalizeCollectionRecord(collection) {
	const title = cleanText(collection?.title);
	return {
		id: cleanText(collection?.id) || slugify(title),
		title,
		sourceTemplate: cleanText(collection?.sourceTemplate),
		blurb: cleanText(collection?.blurb),
		imageURL: cleanText(collection?.imageURL),
		links: Array.isArray(collection?.links)
			? collection.links
					.map((link) => ({
						label: cleanText(link?.label),
						href: cleanText(link?.href),
					}))
					.filter((link) => link.label && link.href)
			: [],
		aliases: [...new Set((Array.isArray(collection?.aliases) ? collection.aliases : []).map((alias) => cleanText(alias)).filter(Boolean))],
		colors: {
			background: cleanText(collection?.colors?.background),
			accent: cleanText(collection?.colors?.accent),
		},
	};
}

async function loadLocalCollections() {
	const module = await import(`${pathToFileURL(PEDIA_COLLECTIONS_FILE).href}?t=${Date.now()}`);
	return Array.isArray(module?.PEDIA_COLLECTIONS) ? module.PEDIA_COLLECTIONS.map((collection) => normalizeCollectionRecord(collection)) : [];
}

async function fetchCloudEntries(client) {
	const { data, error } = await client.from(SUPABASE_PEDIA_ENTRIES_TABLE).select("id, slug, title, entry_state, wiki_markup, is_deleted").order("updated_at", { ascending: false });

	if (error) {
		throw error;
	}

	return (data || []).filter((row) => !row?.is_deleted);
}

async function fetchCloudCollections(client) {
	const { data, error } = await client.from(SUPABASE_PEDIA_COLLECTIONS_TABLE).select("id, title, collection_state").order("title", { ascending: true });

	if (error) {
		throw error;
	}

	return (data || []).map((row) =>
		normalizeCollectionRecord({
			...(row?.collection_state || {}),
			id: cleanText(row?.id) || row?.collection_state?.id,
			title: cleanText(row?.title) || row?.collection_state?.title,
		}),
	);
}

async function writeEntries(rows) {
	await mkdir(PEDIA_ENTRIES_DIR, { recursive: true });
	const writtenSlugs = new Set();

	for (const row of rows) {
		const entry = row?.entry_state && typeof row.entry_state === "object" ? row.entry_state : {};
		const slug = cleanText(row?.slug) || cleanText(entry?.slug) || slugify(entry?.title || row?.id);
		if (!slug) {
			continue;
		}

		const jsonPath = resolve(PEDIA_ENTRIES_DIR, `${slug}.json`);
		const wikiPath = resolve(PEDIA_ENTRIES_DIR, `${slug}.wiki.txt`);

		await writeFile(jsonPath, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
		if (shouldWriteWiki) {
			const wikiMarkup = String(row?.wiki_markup || "").trim();
			if (wikiMarkup) {
				await writeFile(wikiPath, `${wikiMarkup}\n`, "utf8");
			} else {
				await rm(wikiPath, { force: true });
			}
		}

		writtenSlugs.add(slug);
	}

	if (!shouldPrune) {
		return {
			writtenSlugs,
			prunedCount: 0,
		};
	}

	let prunedCount = 0;
	for (const file of await readdir(PEDIA_ENTRIES_DIR)) {
		const match = file.match(/^(.*)\.(json|wiki\.txt)$/i);
		if (!match) {
			continue;
		}
		const slug = match[1];
		if (writtenSlugs.has(slug)) {
			continue;
		}
		await rm(resolve(PEDIA_ENTRIES_DIR, file), { force: true });
		prunedCount += 1;
	}

	return {
		writtenSlugs,
		prunedCount,
	};
}

async function writeCollections(collections) {
	const localCollections = await loadLocalCollections();
	const byId = new Map(localCollections.map((collection) => [collection.id, collection]));

	for (const collection of collections) {
		byId.set(collection.id, collection);
	}

	const mergedCollections = [...byId.values()].sort((left, right) => left.title.localeCompare(right.title));
	await writeFile(PEDIA_COLLECTIONS_FILE, serializeCollections(mergedCollections), "utf8");
	return mergedCollections.length;
}

async function main() {
	if (args.has("--help")) {
		console.log(`Usage: node scripts/pull-pedia-from-supabase.mjs [--prune] [--skip-collections] [--with-wiki]

Pulls cloud pedia entries from Supabase into src/lib/data/modded-civs-pedia.
- --prune removes local entry files that are not present in Supabase
- --skip-collections leaves src/lib/data/pediaCollections.js untouched
- --with-wiki also writes .wiki.txt sidecar files`);
		return;
	}

	if (!SUPABASE_URL || !SUPABASE_KEY) {
		throw new Error("Set SUPABASE_URL (or VITE_SUPABASE_URL) and a Supabase key before pulling pedia data.");
	}

	const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});

	const [entryRows, collectionRows] = await Promise.all([fetchCloudEntries(client), shouldSyncCollections ? fetchCloudCollections(client) : Promise.resolve([])]);
	const entryResult = await writeEntries(entryRows);
	let collectionCount = 0;

	if (shouldSyncCollections) {
		collectionCount = await writeCollections(collectionRows);
	}

	console.log(
		[
			`Pulled ${entryResult.writtenSlugs.size} pedia entries from Supabase.`,
			shouldSyncCollections ? `Merged ${collectionRows.length} cloud collections into pediaCollections.js (${collectionCount} total local records).` : "Skipped collection export.",
			shouldPrune ? `Pruned ${entryResult.prunedCount} local pedia files not present in Supabase.` : "Left unrelated local pedia files untouched.",
		].join("\n"),
	);
}

main().catch((error) => {
	console.error(error?.message || error);
	process.exitCode = 1;
});
