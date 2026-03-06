import Busboy from "busboy";
import { path7za } from "7zip-bin";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";

const MAX_TOTAL_UPLOAD_BYTES = 250 * 1024 * 1024;
const MAX_SINGLE_ENTRY_BYTES = 100 * 1024 * 1024;
const MAX_ENTRY_COUNT = 4096;
const OUTPUT_EXTENSION = ".civ5mod";
const ENTRY_PATH_FIELD_RE = /^entryPath_(\d+)$/;
const ENTRY_FILE_FIELD_RE = /^entryFile_(\d+)$/;

export async function handler(event) {
	if (event.httpMethod !== "POST") {
		return json(405, { error: "Method not allowed. Use POST." });
	}

	let parsed;
	try {
		parsed = await parseMultipartEntries(event);
	} catch (error) {
		const status = Number(error?.statusCode || 400);
		return json(status, { error: error?.message || "Invalid multipart request." });
	}

	const outputFileName = normalizeOutputFileName(parsed.outputFileName);
	const defaultRootName = outputFileName.replace(/\.civ5mod$/i, "") || "mod";
	const rootFolderName = sanitizePathSegment(parsed.rootFolderName, defaultRootName);

	let tempDir = "";
	try {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "civ5mod-build-"));
		const stagedRoot = path.join(tempDir, rootFolderName);
		await fs.mkdir(stagedRoot, { recursive: true });

		let writtenCount = 0;
		for (const entry of parsed.entries) {
			const relativePath = sanitizeRelativePath(entry.relativePath);
			if (!relativePath) {
				continue;
			}
			const outputPath = path.join(stagedRoot, relativePath);
			const rel = path.relative(stagedRoot, outputPath);
			if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
				throw createHttpError(400, `Invalid archive path: ${entry.relativePath}`);
			}
			await fs.mkdir(path.dirname(outputPath), { recursive: true });
			await fs.writeFile(outputPath, entry.buffer);
			writtenCount += 1;
		}

		if (!writtenCount) {
			throw createHttpError(400, "No valid files were provided for archive creation.");
		}

		const archivePath = path.join(tempDir, outputFileName);
		await build7zArchive({
			cwd: tempDir,
			rootFolderName,
			outputFileName,
		});
		const archiveBuffer = await fs.readFile(archivePath);

		return {
			statusCode: 200,
			isBase64Encoded: true,
			headers: {
				"Content-Type": "application/octet-stream",
				"Content-Disposition": `attachment; filename="${outputFileName}"`,
				"Cache-Control": "no-store",
				"X-Archive-Format": "7z",
				"X-Entry-Count": String(writtenCount),
				"X-Root-Folder": rootFolderName,
			},
			body: archiveBuffer.toString("base64"),
		};
	} catch (error) {
		console.error("build-civ5mod failed", error);
		const status = Number(error?.statusCode || 500);
		return json(status, { error: error?.message || "Unable to build .civ5mod archive." });
	} finally {
		if (tempDir) {
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	}
}

async function parseMultipartEntries(event) {
	const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"];
	if (!contentType || !contentType.toLowerCase().includes("multipart/form-data")) {
		throw createHttpError(415, "Content-Type must be multipart/form-data.");
	}

	const body = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "", "utf8");
	const busboy = Busboy({
		headers: { "content-type": contentType },
		limits: {
			files: MAX_ENTRY_COUNT,
			fileSize: MAX_SINGLE_ENTRY_BYTES,
			fields: MAX_ENTRY_COUNT * 2 + 20,
		},
	});

	return await new Promise((resolve, reject) => {
		const entryPaths = new Map();
		const entryFiles = new Map();
		let outputFileName = "";
		let rootFolderName = "";
		let totalUploadBytes = 0;
		let firstError = null;

		const fail = (error) => {
			if (!firstError) {
				firstError = error;
			}
		};

		busboy.on("field", (fieldName, value) => {
			if (fieldName === "outputFileName") {
				outputFileName = String(value || "");
				return;
			}
			if (fieldName === "rootFolderName") {
				rootFolderName = String(value || "");
				return;
			}
			const pathMatch = fieldName.match(ENTRY_PATH_FIELD_RE);
			if (pathMatch) {
				entryPaths.set(Number(pathMatch[1]), String(value || ""));
			}
		});

		busboy.on("file", (fieldName, file) => {
			const fileMatch = fieldName.match(ENTRY_FILE_FIELD_RE);
			if (!fileMatch) {
				file.resume();
				return;
			}
			const index = Number(fileMatch[1]);
			const chunks = [];
			let fileBytes = 0;
			let exceededLimits = false;

			file.on("data", (chunk) => {
				fileBytes += chunk.length;
				totalUploadBytes += chunk.length;
				if (fileBytes > MAX_SINGLE_ENTRY_BYTES || totalUploadBytes > MAX_TOTAL_UPLOAD_BYTES) {
					exceededLimits = true;
					fail(createHttpError(413, `Upload is too large. Maximum total upload size is ${Math.floor(MAX_TOTAL_UPLOAD_BYTES / (1024 * 1024))}MB.`));
					return;
				}
				chunks.push(chunk);
			});

			file.on("limit", () => {
				exceededLimits = true;
				fail(createHttpError(413, `A file exceeded the max size of ${Math.floor(MAX_SINGLE_ENTRY_BYTES / (1024 * 1024))}MB.`));
			});

			file.on("end", () => {
				if (exceededLimits) {
					return;
				}
				entryFiles.set(index, Buffer.concat(chunks));
			});
		});

		busboy.on("partsLimit", () => {
			fail(createHttpError(413, "Too many multipart parts were uploaded."));
		});

		busboy.on("filesLimit", () => {
			fail(createHttpError(413, "Too many files were uploaded."));
		});

		busboy.on("error", (error) => {
			reject(error);
		});

		busboy.on("close", () => {
			if (firstError) {
				reject(firstError);
				return;
			}
			const indices = Array.from(entryFiles.keys()).sort((a, b) => a - b);
			const entries = [];
			for (const index of indices) {
				const relativePath = entryPaths.get(index);
				const buffer = entryFiles.get(index);
				if (!relativePath || !buffer) {
					continue;
				}
				entries.push({ relativePath, buffer });
			}
			if (!entries.length) {
				reject(createHttpError(400, "No uploaded archive entries were provided."));
				return;
			}
			resolve({
				outputFileName,
				rootFolderName,
				entries,
			});
		});

		busboy.end(body);
	});
}

async function build7zArchive({ cwd, rootFolderName, outputFileName }) {
	if (!path7za) {
		throw createHttpError(500, "7zip binary is not available in this deployment.");
	}

	const args = ["a", "-t7z", "-mx=9", "-bd", outputFileName, rootFolderName];

	await new Promise((resolve, reject) => {
		const process = spawn(path7za, args, {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";

		process.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		process.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		process.on("error", (error) => {
			reject(createHttpError(500, `Unable to execute 7zip: ${error.message}`));
		});
		process.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(createHttpError(500, `7zip failed with code ${code}. ${stderr || stdout}`.trim()));
		});
	});
}

function normalizeOutputFileName(value) {
	const trimmed = String(value || "")
		.replace(/[\\/]/g, " ")
		.trim();
	const safeBase = sanitizePathSegment(trimmed.replace(/\.civ5mod$/i, ""), "my-mod");
	return `${safeBase}${OUTPUT_EXTENSION}`;
}

function sanitizePathSegment(value, fallback = "") {
	const cleaned = String(value || "")
		.replace(/[\\/]+/g, " ")
		.trim()
		.replace(/[^a-zA-Z0-9._ -]+/g, "_")
		.replace(/\s+/g, " ")
		.trim();
	if (!cleaned || cleaned === "." || cleaned === "..") {
		return fallback;
	}
	return cleaned;
}

function sanitizeRelativePath(value) {
	const parts = String(value || "")
		.replace(/\\/g, "/")
		.split("/")
		.filter(Boolean)
		.map((segment) => sanitizePathSegment(segment, ""))
		.filter(Boolean);
	return parts.join("/");
}

function createHttpError(statusCode, message) {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
}

function json(statusCode, payload) {
	return {
		statusCode,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
		body: JSON.stringify(payload),
	};
}
