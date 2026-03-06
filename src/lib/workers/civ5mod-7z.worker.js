const SEVEN_ZIP_MODULE_URL = "https://cdn.jsdelivr.net/npm/7z-wasm@1.2.0/7zz.es6.js";
const SEVEN_ZIP_WASM_URL = "https://cdn.jsdelivr.net/npm/7z-wasm@1.2.0/7zz.wasm";

let sevenZipPromise = null;

function sanitizePathSegment(value) {
	return String(value || "")
		.replace(/\\/g, "/")
		.split("/")
		.filter(Boolean)
		.filter((segment) => segment !== "." && segment !== "..")
		.join("/");
}

function emitStatus(message) {
	self.postMessage({ type: "status", message });
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

async function buildArchive({ archiveName, rootFolderName, entries }) {
	const sevenZip = await loadSevenZip();
	const { FS } = sevenZip;
	const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const workspacePath = `/jobs/${jobId}`;
	const archivePath = `${workspacePath}/${archiveName}`;
	const rootPath = `${workspacePath}/${rootFolderName}`;
	const previousCwd = FS.cwd();

	ensureDirectory(FS, workspacePath);

	try {
		emitStatus("Preparing browser-side 7z runtime...");
		ensureDirectory(FS, rootPath);

		for (let index = 0; index < entries.length; index += 1) {
			const entry = entries[index];
			const relativePath = sanitizePathSegment(entry?.path);
			if (!relativePath) {
				continue;
			}

			if (index === 0 || index % 10 === 0 || index === entries.length - 1) {
				emitStatus(`Loading files into archive workspace (${index + 1}/${entries.length})...`);
			}

			const targetPath = `${rootPath}/${relativePath}`;
			const targetDir = targetPath.slice(0, Math.max(0, targetPath.lastIndexOf("/")));
			if (targetDir) {
				ensureDirectory(FS, targetDir);
			}

			const fileBytes = new Uint8Array(await entry.file.arrayBuffer());
			FS.writeFile(targetPath, fileBytes);
		}

		emitStatus("Compressing .civ5mod locally in your browser...");
		FS.chdir(workspacePath);
		sevenZip.callMain(["a", "-t7z", "-mx=9", "-bb0", "-bd", "-y", archiveName, rootFolderName]);

		if (!FS.analyzePath(archivePath).exists) {
			throw new Error("7z build completed without producing an archive.");
		}

		const archiveBytes = FS.readFile(archivePath, { encoding: "binary" });
		return archiveBytes;
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
			[archiveBytes.buffer]
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unable to build the archive in this browser.";
		self.postMessage({ type: "error", message });
	}
};
