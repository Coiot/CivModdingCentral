import { normalizeArchivePath, synchronizeModinfoMd5Entries, validateModinfoMd5Entries } from "../civ5mod/modinfo.js";

const SEVEN_ZIP_MODULE_URL = "https://cdn.jsdelivr.net/npm/7z-wasm@1.2.0/7zz.es6.js";
const SEVEN_ZIP_WASM_URL = "https://cdn.jsdelivr.net/npm/7z-wasm@1.2.0/7zz.wasm";

let sevenZipPromise = null;

function emitStatus(message) {
	self.postMessage({ type: "status", message });
}

function applyCiv5CompatibilityHeader(archiveBytes) {
	if (!(archiveBytes instanceof Uint8Array) || archiveBytes.length < 8) {
		return archiveBytes;
	}

	const isSevenZipSignature =
		archiveBytes[0] === 0x37 &&
		archiveBytes[1] === 0x7a &&
		archiveBytes[2] === 0xbc &&
		archiveBytes[3] === 0xaf &&
		archiveBytes[4] === 0x27 &&
		archiveBytes[5] === 0x1c &&
		archiveBytes[6] === 0x00;

	if (isSevenZipSignature && archiveBytes[7] === 0x04) {
		archiveBytes[7] = 0x03;
	}

	return archiveBytes;
}

async function loadSevenZip() {
	if (!sevenZipPromise) {
		sevenZipPromise = (async () => {
			const moduleFactoryNamespace = await import(/* @vite-ignore */ SEVEN_ZIP_MODULE_URL);
			const moduleFactory = moduleFactoryNamespace?.default ?? moduleFactoryNamespace;
			return await moduleFactory({
				locateFile(path) {
					if (String(path).endsWith(".wasm")) {
						return SEVEN_ZIP_WASM_URL;
					}
					return path;
				},
				noInitialRun: true,
				print() {},
				printErr() {},
			});
		})();
	}
	return await sevenZipPromise;
}

function ensureDirectory(fs, absolutePath) {
	const segments = String(absolutePath || "")
		.split("/")
		.filter(Boolean);

	let currentPath = "";
	for (const segment of segments) {
		currentPath += `/${segment}`;
		if (!fs.analyzePath(currentPath).exists) {
			fs.mkdir(currentPath);
		}
	}
}

function removeTree(fs, absolutePath) {
	if (!fs.analyzePath(absolutePath).exists) {
		return;
	}

	const stats = fs.stat(absolutePath);
	const isDirectory = typeof fs.isDir === "function" ? fs.isDir(stats.mode) : Boolean(stats.isFolder);
	if (!isDirectory) {
		fs.unlink(absolutePath);
		return;
	}

	for (const entry of fs.readdir(absolutePath)) {
		if (entry === "." || entry === "..") {
			continue;
		}
		removeTree(fs, `${absolutePath}/${entry}`);
	}
	fs.rmdir(absolutePath);
}

async function readArchiveEntries(entries) {
	const entriesByPath = new Map();

	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		const relativePath = normalizeArchivePath(entry?.path);
		if (!relativePath) {
			continue;
		}

		if (index === 0 || index % 10 === 0 || index === entries.length - 1) {
			emitStatus(`Loading files into archive workspace (${index + 1}/${entries.length})...`);
		}

		entriesByPath.set(relativePath, {
			path: relativePath,
			bytes: new Uint8Array(await entry.file.arrayBuffer()),
		});
	}

	return entriesByPath;
}

async function buildArchive({ archiveName, entries }) {
	const sevenZip = await loadSevenZip();
	const { FS } = sevenZip;
	const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const workspacePath = `/jobs/${jobId}`;
	const archivePath = `${workspacePath}/${archiveName}`;
	const previousCwd = FS.cwd();
	const topLevelNames = new Set();

	ensureDirectory(FS, workspacePath);

	try {
		emitStatus("Preparing browser 7z runtime...");
		const entriesByPath = await readArchiveEntries(entries);
		if (entriesByPath.size === 0) {
			throw new Error("No valid files found to pack.");
		}

		emitStatus("Synchronizing .modinfo md5 hashes...");
		synchronizeModinfoMd5Entries(entriesByPath);

		emitStatus("Validating .modinfo file hashes...");
		const validationIssues = validateModinfoMd5Entries(entriesByPath);
		if (validationIssues.length > 0) {
			throw new Error(validationIssues.slice(0, 6).join(" "));
		}

		for (const entry of entriesByPath.values()) {
			const relativePath = entry.path;
			const topLevelName = relativePath.split("/")[0];
			if (topLevelName) {
				topLevelNames.add(topLevelName);
			}

			const targetPath = `${workspacePath}/${relativePath}`;
			const targetDir = targetPath.slice(0, Math.max(0, targetPath.lastIndexOf("/")));
			if (targetDir) {
				ensureDirectory(FS, targetDir);
			}

			FS.writeFile(targetPath, entry.bytes);
		}

		emitStatus("Compressing .civ5mod locally in your browser...");
		FS.chdir(workspacePath);
		sevenZip.callMain(["a", "-t7z", "-m0=lzma", "-md=8m", "-mx=9", "-ms=on", "-bb0", "-bd", "-y", archiveName, ...topLevelNames]);

		if (!FS.analyzePath(archivePath).exists) {
			throw new Error("7z build completed without producing an archive.");
		}

		const archiveBytes = FS.readFile(archivePath, { encoding: "binary" });
		return applyCiv5CompatibilityHeader(archiveBytes);
	} finally {
		FS.chdir(previousCwd);
		removeTree(FS, workspacePath);
	}
}

self.onmessage = async (event) => {
	const payload = event?.data;
	if (!payload || payload.type !== "build") {
		return;
	}

	try {
		const archiveBytes = await buildArchive(payload);
		self.postMessage(
			{
				type: "result",
				archiveName: payload.archiveName,
				archiveBytes,
			},
			[archiveBytes.buffer],
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unable to build the archive in this browser.";
		self.postMessage({ type: "error", message });
	}
};
