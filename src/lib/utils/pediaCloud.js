import { normalizePediaEntry, slugifyPediaValue } from "./moddedCivsPedia.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_PEDIA_ENTRIES_TABLE = import.meta.env.VITE_SUPABASE_PEDIA_ENTRIES_TABLE || "cmc_pedia_entries";
const SUPABASE_PEDIA_COLLECTIONS_TABLE = import.meta.env.VITE_SUPABASE_PEDIA_COLLECTIONS_TABLE || "cmc_pedia_collections";
const SUPABASE_PEDIA_AUTHOR_PROFILES_TABLE = import.meta.env.VITE_SUPABASE_PEDIA_AUTHOR_PROFILES_TABLE || "cmc_pedia_author_profiles";

let pediaCloudClient = null;
let pediaCloudClientKey = "";

function cleanText(value) {
	return String(value || "").trim();
}

function cleanLinks(links) {
	return Array.isArray(links)
		? links
				.map((link) => ({
					label: cleanText(link?.label),
					href: cleanText(link?.href),
				}))
				.filter((link) => link.label && link.href)
		: [];
}

function normalizeCollectionRecord(collection) {
	const title = cleanText(collection?.title);
	const id = cleanText(collection?.id) || slugifyPediaValue(title);
	return {
		id,
		title,
		sourceTemplate: cleanText(collection?.sourceTemplate),
		imageURL: cleanText(collection?.imageURL),
		blurb: cleanText(collection?.blurb),
		aliases: [...new Set((Array.isArray(collection?.aliases) ? collection.aliases : []).map((alias) => cleanText(alias)).filter(Boolean))],
		links: cleanLinks(collection?.links),
		colors: {
			background: cleanText(collection?.colors?.background),
			accent: cleanText(collection?.colors?.accent),
		},
	};
}

function normalizeAuthorProfileRecord(profile) {
	const name = cleanText(profile?.name);
	return {
		id: cleanText(profile?.id) || slugifyPediaValue(name),
		name,
		blurb: cleanText(profile?.blurb),
		links: cleanLinks(profile?.links),
	};
}

function entryFromCloudRow(row) {
	const state = row?.entry_state && typeof row.entry_state === "object" ? row.entry_state : {};
	return normalizePediaEntry({
		...state,
		id: cleanText(row?.id) || state?.id,
		slug: cleanText(row?.slug) || state?.slug,
		title: cleanText(row?.title) || state?.title,
		summary: cleanText(row?.summary) || state?.summary,
		meta: {
			...(state?.meta || {}),
			createdAt: cleanText(state?.meta?.createdAt) || cleanText(row?.created_at),
			updatedAt: cleanText(row?.updated_at) || cleanText(state?.meta?.updatedAt),
			cloudUpdatedByEmail: cleanText(row?.updated_by_email),
			cloudCreatedByEmail: cleanText(row?.created_by_email),
		},
	});
}

function collectionFromCloudRow(row) {
	const state = row?.collection_state && typeof row.collection_state === "object" ? row.collection_state : {};
	return normalizeCollectionRecord({
		...state,
		id: cleanText(row?.id) || state?.id,
		title: cleanText(row?.title) || state?.title,
	});
}

function authorProfileFromCloudRow(row) {
	const state = row?.profile_state && typeof row.profile_state === "object" ? row.profile_state : {};
	return normalizeAuthorProfileRecord({
		...state,
		id: cleanText(row?.id) || state?.id,
		name: cleanText(row?.name) || state?.name,
	});
}

export function hasPediaCloudConfig() {
	return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_PEDIA_ENTRIES_TABLE && SUPABASE_PEDIA_COLLECTIONS_TABLE && SUPABASE_PEDIA_AUTHOR_PROFILES_TABLE);
}

export async function getPediaCloudClient(accessToken = "") {
	if (!hasPediaCloudConfig()) {
		throw new Error("Supabase pedia sync is not configured for this environment.");
	}

	const nextClientKey = `${SUPABASE_URL}:${accessToken}`;
	if (pediaCloudClient && pediaCloudClientKey === nextClientKey) {
		return pediaCloudClient;
	}

	const module = await import("@supabase/supabase-js");
	const options = {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	};

	if (accessToken) {
		options.global = {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		};
	}

	pediaCloudClient = module.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
	pediaCloudClientKey = nextClientKey;
	return pediaCloudClient;
}

export async function loadPediaEntriesFromCloud(accessToken = "") {
	const client = await getPediaCloudClient(accessToken);
	const { data, error } = await client
		.from(SUPABASE_PEDIA_ENTRIES_TABLE)
		.select("id, slug, title, summary, entry_state, wiki_markup, is_deleted, created_by_email, updated_by_email, created_at, updated_at")
		.order("updated_at", { ascending: false });

	if (error) {
		throw error;
	}

	const entries = [];
	const deletedEntryIds = [];

	for (const row of data || []) {
		if (row?.is_deleted) {
			const deletedId = cleanText(row?.id);
			if (deletedId) {
				deletedEntryIds.push(deletedId);
			}
			continue;
		}
		entries.push(entryFromCloudRow(row));
	}

	return {
		entries,
		deletedEntryIds: [...new Set(deletedEntryIds)],
	};
}

export async function loadPediaCollectionsFromCloud(accessToken = "") {
	const client = await getPediaCloudClient(accessToken);
	const { data, error } = await client
		.from(SUPABASE_PEDIA_COLLECTIONS_TABLE)
		.select("id, title, collection_state, created_by_email, updated_by_email, created_at, updated_at")
		.order("title", { ascending: true });

	if (error) {
		throw error;
	}

	return (data || []).map((row) => collectionFromCloudRow(row));
}

export async function loadPediaAuthorProfilesFromCloud(accessToken = "") {
	const client = await getPediaCloudClient(accessToken);
	const { data, error } = await client
		.from(SUPABASE_PEDIA_AUTHOR_PROFILES_TABLE)
		.select("id, name, profile_state, created_by_email, updated_by_email, created_at, updated_at")
		.order("name", { ascending: true });

	if (error) {
		throw error;
	}

	return (data || []).map((row) => authorProfileFromCloudRow(row));
}

export async function savePediaEntryToCloud(accessToken, entry, wikiMarkup = "") {
	const client = await getPediaCloudClient(accessToken);
	const normalizedEntry = normalizePediaEntry(entry);
	const timestamp = new Date().toISOString();
	const payload = {
		id: cleanText(normalizedEntry.id),
		slug: cleanText(normalizedEntry.slug) || slugifyPediaValue(normalizedEntry.title || normalizedEntry.id),
		title: cleanText(normalizedEntry.title),
		summary: cleanText(normalizedEntry.summary),
		entry_state: normalizePediaEntry({
			...normalizedEntry,
			meta: {
				...(normalizedEntry.meta || {}),
				createdAt: cleanText(normalizedEntry?.meta?.createdAt) || timestamp,
				updatedAt: timestamp,
			},
		}),
		wiki_markup: String(wikiMarkup || ""),
		is_deleted: false,
	};

	const { data, error } = await client
		.from(SUPABASE_PEDIA_ENTRIES_TABLE)
		.upsert(payload, { onConflict: "id" })
		.select("id, slug, title, summary, entry_state, wiki_markup, is_deleted, created_by_email, updated_by_email, created_at, updated_at")
		.single();

	if (error) {
		throw error;
	}

	return entryFromCloudRow(data);
}

export async function markPediaEntryDeletedInCloud(accessToken, entry) {
	const client = await getPediaCloudClient(accessToken);
	const normalizedEntry = normalizePediaEntry(entry);
	const timestamp = new Date().toISOString();
	const payload = {
		id: cleanText(normalizedEntry.id),
		slug: cleanText(normalizedEntry.slug) || slugifyPediaValue(normalizedEntry.title || normalizedEntry.id),
		title: cleanText(normalizedEntry.title),
		summary: cleanText(normalizedEntry.summary),
		entry_state: normalizePediaEntry({
			...normalizedEntry,
			meta: {
				...(normalizedEntry.meta || {}),
				createdAt: cleanText(normalizedEntry?.meta?.createdAt) || timestamp,
				updatedAt: timestamp,
			},
		}),
		is_deleted: true,
	};

	const { data, error } = await client
		.from(SUPABASE_PEDIA_ENTRIES_TABLE)
		.upsert(payload, { onConflict: "id" })
		.select("id, slug, title, summary, entry_state, wiki_markup, is_deleted, created_by_email, updated_by_email, created_at, updated_at")
		.single();

	if (error) {
		throw error;
	}

	return {
		id: cleanText(data?.id) || payload.id,
	};
}

export async function savePediaCollectionToCloud(accessToken, collection, options = {}) {
	const client = await getPediaCloudClient(accessToken);
	const normalizedCollection = normalizeCollectionRecord(collection);
	const previousId = cleanText(options?.previousId);
	const payload = {
		id: normalizedCollection.id,
		title: normalizedCollection.title,
		collection_state: normalizedCollection,
	};

	if (previousId && previousId !== normalizedCollection.id) {
		const updateResult = await client
			.from(SUPABASE_PEDIA_COLLECTIONS_TABLE)
			.update(payload)
			.eq("id", previousId)
			.select("id, title, collection_state, created_by_email, updated_by_email, created_at, updated_at")
			.maybeSingle();

		if (updateResult.error) {
			throw updateResult.error;
		}
		if (updateResult.data) {
			return collectionFromCloudRow(updateResult.data);
		}
	}

	const { data, error } = await client
		.from(SUPABASE_PEDIA_COLLECTIONS_TABLE)
		.upsert(payload, { onConflict: "id" })
		.select("id, title, collection_state, created_by_email, updated_by_email, created_at, updated_at")
		.single();

	if (error) {
		throw error;
	}

	return collectionFromCloudRow(data);
}

export async function deletePediaCollectionFromCloud(accessToken, collectionId) {
	const client = await getPediaCloudClient(accessToken);
	const { error } = await client.from(SUPABASE_PEDIA_COLLECTIONS_TABLE).delete().eq("id", cleanText(collectionId));

	if (error) {
		throw error;
	}

	return {
		id: cleanText(collectionId),
	};
}

export async function savePediaAuthorProfileToCloud(accessToken, profile, options = {}) {
	const client = await getPediaCloudClient(accessToken);
	const normalizedProfile = normalizeAuthorProfileRecord(profile);
	const previousId = cleanText(options?.previousId);
	const payload = {
		id: normalizedProfile.id,
		name: normalizedProfile.name,
		profile_state: normalizedProfile,
	};

	if (previousId && previousId !== normalizedProfile.id) {
		const updateResult = await client
			.from(SUPABASE_PEDIA_AUTHOR_PROFILES_TABLE)
			.update(payload)
			.eq("id", previousId)
			.select("id, name, profile_state, created_by_email, updated_by_email, created_at, updated_at")
			.maybeSingle();

		if (updateResult.error) {
			throw updateResult.error;
		}
		if (updateResult.data) {
			return authorProfileFromCloudRow(updateResult.data);
		}
	}

	const { data, error } = await client
		.from(SUPABASE_PEDIA_AUTHOR_PROFILES_TABLE)
		.upsert(payload, { onConflict: "id" })
		.select("id, name, profile_state, created_by_email, updated_by_email, created_at, updated_at")
		.single();

	if (error) {
		throw error;
	}

	return authorProfileFromCloudRow(data);
}
