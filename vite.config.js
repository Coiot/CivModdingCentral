import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const MODDED_CIVS_PEDIA_DIR = resolve(__dirname, "src/lib/data/modded-civs-pedia");

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
