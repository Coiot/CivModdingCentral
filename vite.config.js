import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MODDED_CIVS_PEDIA_DIR = resolve(__dirname, "src/lib/data/modded-civs-pedia");
const PEDIA_COLLECTIONS_FILE = resolve(__dirname, "src/lib/data/pediaCollections.js");
const PEDIA_AUTHOR_PROFILES_FILE = resolve(__dirname, "src/lib/data/pediaAuthorProfiles.json");

function jsonResponse(res, statusCode, payload) {
	res.statusCode = statusCode;
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
	const chunks = [];
	for await (const chunk of req) {
		chunks.push(chunk);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function cleanValue(value) {
	return String(value || "").trim();
}

function samePediaEntry(left, right) {
	const leftId = cleanValue(left?.id);
	const rightId = cleanValue(right?.id);
	if (leftId && rightId) {
		return leftId === rightId;
	}

	const leftTitle = cleanValue(left?.title);
	const rightTitle = cleanValue(right?.title);
	const leftLeader = cleanValue(left?.leader);
	const rightLeader = cleanValue(right?.leader);
	return Boolean(leftTitle && rightTitle && leftLeader && rightLeader && leftTitle === rightTitle && leftLeader === rightLeader);
}

function normalizeCollectionId(value) {
	return cleanValue(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function normalizeHexColor(value) {
	const normalized = cleanValue(value);
	return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized) ? normalized : "";
}

function normalizeCollectionRecord(collection) {
	const title = cleanValue(collection?.title);
	return {
		id: normalizeCollectionId(collection?.id || title),
		title,
		sourceTemplate: cleanValue(collection?.sourceTemplate),
		blurb: cleanValue(collection?.blurb),
		imageURL: cleanValue(collection?.imageURL),
		links: [
			...new Map(
				(Array.isArray(collection?.links) ? collection.links : [])
					.map((link) => ({
						label: cleanValue(link?.label),
						href: cleanValue(link?.href),
					}))
					.filter((link) => link.label && link.href)
					.map((link) => [`${link.label}|${link.href}`, link]),
			).values(),
		],
		aliases: [...new Set((Array.isArray(collection?.aliases) ? collection.aliases : []).map((alias) => cleanValue(alias)).filter(Boolean))],
		colors: {
			background: normalizeHexColor(collection?.colors?.background),
			accent: normalizeHexColor(collection?.colors?.accent),
		},
	};
}

function normalizeAuthorProfile(profile) {
	const name = cleanValue(profile?.name);
	return {
		name,
		blurb: cleanValue(profile?.blurb),
		links: [
			...new Map(
				(Array.isArray(profile?.links) ? profile.links : [])
					.map((link) => ({
						label: cleanValue(link?.label),
						href: cleanValue(link?.href),
					}))
					.filter((link) => link.label && link.href)
					.map((link) => [`${link.label}|${link.href}`, link]),
			).values(),
		],
	};
}

async function loadPediaCollections() {
	const moduleUrl = `${pathToFileURL(PEDIA_COLLECTIONS_FILE).href}?t=${Date.now()}`;
	const module = await import(moduleUrl);
	return Array.isArray(module?.PEDIA_COLLECTIONS) ? module.PEDIA_COLLECTIONS : [];
}

async function loadPediaAuthorProfiles() {
	return JSON.parse(await readFile(PEDIA_AUTHOR_PROFILES_FILE, "utf8"));
}

function serializePediaCollections(collections) {
	return `export const PEDIA_COLLECTIONS = ${JSON.stringify(collections, null, 2)};\n`;
}

function serializePediaAuthorProfiles(profiles) {
	return `${JSON.stringify(profiles, null, 2)}\n`;
}

function localPediaSavePlugin() {
	return {
		name: "local-pedia-save",
		configureServer(server) {
			server.middlewares.use("/__local-api/modded-civs-pedia/save", async (req, res) => {
				if (req.method !== "POST") {
					return jsonResponse(res, 405, { ok: false, message: "Method not allowed." });
				}

				try {
					const payload = await readJsonBody(req);
					const slug = String(payload?.slug || "").trim();
					const entry = payload?.entry;

					if (!slug || !entry) {
						return jsonResponse(res, 400, { ok: false, message: "Missing slug or entry." });
					}

					if (!/^[a-z0-9-]+$/i.test(slug)) {
						return jsonResponse(res, 400, { ok: false, message: "Slug may only contain letters, numbers, and hyphens." });
					}

					await mkdir(MODDED_CIVS_PEDIA_DIR, { recursive: true });

					const jsonFilePath = resolve(MODDED_CIVS_PEDIA_DIR, `${slug}.json`);
					let existingEntry = null;

					try {
						existingEntry = JSON.parse(await readFile(jsonFilePath, "utf8"));
					} catch (error) {
						if (error?.code !== "ENOENT") {
							throw error;
						}
					}

					if (existingEntry && !samePediaEntry(existingEntry, entry)) {
						const existingLabel = [cleanValue(existingEntry?.title), cleanValue(existingEntry?.leader)].filter(Boolean).join(" led by ");
						return jsonResponse(res, 409, {
							ok: false,
							message: `Slug "${slug}" is already used by ${existingLabel || "another pedia entry"}. Change the slug before saving.`,
						});
					}

					await writeFile(jsonFilePath, `${JSON.stringify(entry, null, 2)}\n`, "utf8");

					return jsonResponse(res, 200, {
						ok: true,
						jsonFilePath,
					});
				} catch (error) {
					return jsonResponse(res, 500, {
						ok: false,
						message: error?.message || "Unable to save pedia files.",
					});
				}
			});

			server.middlewares.use("/__local-api/modded-civs-pedia/delete", async (req, res) => {
				if (req.method !== "DELETE") {
					return jsonResponse(res, 405, { ok: false, message: "Method not allowed." });
				}

				try {
					const payload = await readJsonBody(req);
					const slug = String(payload?.slug || "").trim();

					if (!slug) {
						return jsonResponse(res, 400, { ok: false, message: "Missing slug." });
					}

					if (!/^[a-z0-9-]+$/i.test(slug)) {
						return jsonResponse(res, 400, { ok: false, message: "Slug may only contain letters, numbers, and hyphens." });
					}

					const jsonFilePath = resolve(MODDED_CIVS_PEDIA_DIR, `${slug}.json`);
					const wikiFilePath = resolve(MODDED_CIVS_PEDIA_DIR, `${slug}.wiki.txt`);

					await rm(jsonFilePath, { force: true });
					await rm(wikiFilePath, { force: true });

					return jsonResponse(res, 200, {
						ok: true,
						jsonFilePath,
						wikiFilePath,
					});
				} catch (error) {
					return jsonResponse(res, 500, {
						ok: false,
						message: error?.message || "Unable to delete pedia files.",
					});
				}
			});

			server.middlewares.use("/__local-api/modded-civs-pedia/collections/save", async (req, res) => {
				if (req.method !== "POST") {
					return jsonResponse(res, 405, { ok: false, message: "Method not allowed." });
				}

				try {
					const payload = await readJsonBody(req);
					const collection = normalizeCollectionRecord(payload?.collection);
					const updateExisting = Boolean(payload?.updateExisting);
					const previousId = normalizeCollectionId(payload?.previousId);

					if (!collection.id || !collection.title) {
						return jsonResponse(res, 400, { ok: false, message: "Collection title is required." });
					}

					if (!collection.colors.background || !collection.colors.accent) {
						return jsonResponse(res, 400, { ok: false, message: "Collection background and accent colors must be valid hex values." });
					}

					const existingCollections = (await loadPediaCollections()).map((item) => normalizeCollectionRecord(item));
					if (!updateExisting && existingCollections.some((item) => item.id === collection.id)) {
						return jsonResponse(res, 409, { ok: false, message: `Collection "${collection.title}" already exists.` });
					}
					if (updateExisting && existingCollections.some((item) => item.id === collection.id && item.id !== previousId)) {
						return jsonResponse(res, 409, { ok: false, message: `Collection "${collection.title}" already exists.` });
					}

					const nextCollections = [...existingCollections.filter((item) => item.id !== previousId && item.id !== collection.id), collection].sort((left, right) =>
						left.title.localeCompare(right.title),
					);
					await writeFile(PEDIA_COLLECTIONS_FILE, serializePediaCollections(nextCollections), "utf8");

					return jsonResponse(res, 200, {
						ok: true,
						collection,
						filePath: PEDIA_COLLECTIONS_FILE,
					});
				} catch (error) {
					return jsonResponse(res, 500, {
						ok: false,
						message: error?.message || "Unable to save pedia collections.",
					});
				}
			});

			server.middlewares.use("/__local-api/modded-civs-pedia/collections/delete", async (req, res) => {
				if (req.method !== "DELETE") {
					return jsonResponse(res, 405, { ok: false, message: "Method not allowed." });
				}

				try {
					const payload = await readJsonBody(req);
					const collectionId = normalizeCollectionId(payload?.id);

					if (!collectionId) {
						return jsonResponse(res, 400, { ok: false, message: "Collection id is required." });
					}

					const existingCollections = (await loadPediaCollections()).map((item) => normalizeCollectionRecord(item));
					const nextCollections = existingCollections.filter((item) => item.id !== collectionId);
					await writeFile(PEDIA_COLLECTIONS_FILE, serializePediaCollections(nextCollections), "utf8");

					return jsonResponse(res, 200, {
						ok: true,
						id: collectionId,
						filePath: PEDIA_COLLECTIONS_FILE,
					});
				} catch (error) {
					return jsonResponse(res, 500, {
						ok: false,
						message: error?.message || "Unable to delete pedia collection.",
					});
				}
			});

			server.middlewares.use("/__local-api/modded-civs-pedia/authors/save", async (req, res) => {
				if (req.method !== "POST") {
					return jsonResponse(res, 405, { ok: false, message: "Method not allowed." });
				}

				try {
					const payload = await readJsonBody(req);
					const profile = normalizeAuthorProfile(payload?.profile);
					const previousName = cleanValue(payload?.previousName);

					if (!profile.name) {
						return jsonResponse(res, 400, { ok: false, message: "Author name is required." });
					}

					const existingProfiles = (await loadPediaAuthorProfiles()).map((item) => normalizeAuthorProfile(item));
					const nextProfiles = [...existingProfiles.filter((item) => item.name !== previousName && item.name !== profile.name), profile].sort((left, right) =>
						left.name.localeCompare(right.name),
					);
					await writeFile(PEDIA_AUTHOR_PROFILES_FILE, serializePediaAuthorProfiles(nextProfiles), "utf8");

					return jsonResponse(res, 200, {
						ok: true,
						profile,
						filePath: PEDIA_AUTHOR_PROFILES_FILE,
					});
				} catch (error) {
					return jsonResponse(res, 500, {
						ok: false,
						message: error?.message || "Unable to save pedia author profiles.",
					});
				}
			});
		},
	};
}

export default defineConfig({
	publicDir: "static",
	plugins: [svelte(), localPediaSavePlugin()],
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				ddsConverter: resolve(__dirname, "dds-converter/index.html"),
				modinfoBuilder: resolve(__dirname, "modinfo-builder/index.html"),
				civ5modZiper: resolve(__dirname, "civ5mod-ziper/index.html"),
				workshopUploader: resolve(__dirname, "workshop-uploader/index.html"),
				communityLinks: resolve(__dirname, "community-links/index.html"),
			},
		},
	},
});
