<script>
	import { onDestroy } from "svelte";

	let fileInputEl = $state(null);
	let sourceFiles = $state([]);
	let outputFileName = $state("my-mod.civ5mod");
	let buildBusy = $state(false);
	let buildStatus = $state("");
	let dragOver = $state(false);
	let buildWorker = null;

	const fileCount = $derived.by(() => sourceFiles.length);
	const totalSourceBytes = $derived.by(() => sourceFiles.reduce((sum, file) => sum + Number(file?.size || 0), 0));
	const rootModinfoFound = $derived.by(() => sourceFiles.map((file) => deriveArchivePath(file)).some((path) => path && !path.includes("/") && path.toLowerCase().endsWith(".modinfo")));
	const requiredIssues = $derived.by(() => {
		const issues = [];
		if (!fileCount) {
			issues.push("Select a source folder (or files) first.");
		}
		if (!String(outputFileName || "").trim()) {
			issues.push("Output file name is required.");
		}
		return issues;
	});
	const canBuild = $derived.by(() => !buildBusy && requiredIssues.length === 0);

	function normalizeOutputFileName(value) {
		const trimmed = String(value || "").trim();
		const safe = trimmed || "my-mod.civ5mod";
		return safe.toLowerCase().endsWith(".civ5mod") ? safe : `${safe}.civ5mod`;
	}

	function sanitizeArchiveSegment(value, fallback = "mod") {
		const raw = String(value || "")
			.replace(/[\\/]+/g, " ")
			.trim();
		const next = raw
			.replace(/[^a-zA-Z0-9._ -]+/g, "_")
			.replace(/\s+/g, " ")
			.trim();
		if (!next || next === "." || next === "..") {
			return fallback;
		}
		return next;
	}

	function deriveArchivePath(file) {
		const raw = String(file?.webkitRelativePath || file?.name || "").replace(/\\/g, "/");
		if (!raw) {
			return "";
		}

		const parts = raw.split("/").filter(Boolean);
		if (parts.length === 0) {
			return "";
		}

		if (String(file?.webkitRelativePath || "").trim() && parts.length > 1) {
			return parts.slice(1).join("/");
		}

		return parts.join("/");
	}

	function deriveTopLevelFolderName(filesList, archiveName) {
		const first = filesList[0];
		const relative = String(first?.webkitRelativePath || "").replace(/\\/g, "/");
		const fromSource = relative.split("/").filter(Boolean)[0];
		if (fromSource) {
			return sanitizeArchiveSegment(fromSource, "mod");
		}
		const fromArchive = String(archiveName || "")
			.replace(/\.civ5mod$/i, "")
			.trim();
		return sanitizeArchiveSegment(fromArchive || "mod", "mod");
	}

	function suggestOutputName(filesList) {
		const first = filesList[0];
		if (!first) {
			return "my-mod.civ5mod";
		}
		const relative = String(first.webkitRelativePath || "").replace(/\\/g, "/");
		const rootName = relative.split("/").filter(Boolean)[0] || "my-mod";
		const normalizedRoot = rootName.replace(/\.civ5mod$/i, "").trim() || "my-mod";
		return `${normalizedRoot}.civ5mod`;
	}

	function setSelectedFiles(fileList) {
		const next = Array.from(fileList || []);
		sourceFiles = next;
		if (!String(outputFileName || "").trim() || String(outputFileName || "").trim() === "my-mod.civ5mod") {
			outputFileName = suggestOutputName(next);
		}
		buildStatus = "";
	}

	function openPicker() {
		fileInputEl?.click?.();
	}

	function onFileInputChange(event) {
		setSelectedFiles(event.currentTarget.files);
	}

	function onDropzoneDragOver(event) {
		event.preventDefault();
	}

	function onDropzoneDragEnter(event) {
		event.preventDefault();
		dragOver = true;
	}

	function onDropzoneDragLeave(event) {
		event.preventDefault();
		dragOver = false;
	}

	function onDropzoneDrop(event) {
		event.preventDefault();
		dragOver = false;
		setSelectedFiles(event.dataTransfer?.files);
	}

	function clearSelectedFiles() {
		sourceFiles = [];
		buildStatus = "";
		if (fileInputEl) {
			fileInputEl.value = "";
		}
	}

	function onDropzoneActivate() {
		openPicker();
	}

	function onDropzoneKeydown(event) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			openPicker();
		}
	}

	function ensureBuildWorker() {
		if (buildWorker) {
			return buildWorker;
		}

		buildWorker = new Worker(new URL("../workers/civ5mod-7z.worker.js", import.meta.url), {
			type: "module",
		});

		return buildWorker;
	}

	function buildCiv5modBlob(entries, archiveName, rootFolderName) {
		return new Promise((resolve, reject) => {
			const worker = ensureBuildWorker();

			const cleanup = () => {
				worker.removeEventListener("message", onMessage);
				worker.removeEventListener("error", onError);
			};

			const onMessage = (event) => {
				const payload = event?.data;
				if (!payload || typeof payload !== "object") {
					return;
				}

				if (payload.type === "status") {
					buildStatus = payload.message || "";
					return;
				}

				if (payload.type === "result") {
					cleanup();
					resolve(new Blob([payload.archiveBytes], { type: "application/x-7z-compressed" }));
					return;
				}

				if (payload.type === "error") {
					cleanup();
					reject(new Error(payload.message || "Unable to build the archive in this browser."));
				}
			};

			const onError = () => {
				cleanup();
				reject(new Error("The browser worker failed while building the archive."));
			};

			worker.addEventListener("message", onMessage);
			worker.addEventListener("error", onError);
			worker.postMessage({
				type: "build",
				archiveName,
				rootFolderName,
				entries: entries.map((entry) => ({
					path: entry.name,
					file: entry.file,
				})),
			});
		});
	}

	async function buildCiv5mod() {
		if (!canBuild) {
			return;
		}

		buildBusy = true;
		buildStatus = "Preparing files...";
		try {
			const entries = [];
			for (const file of sourceFiles) {
				const name = deriveArchivePath(file);
				if (!name) {
					continue;
				}
				entries.push({ name, file });
			}

			if (!entries.length) {
				buildStatus = "No valid files found to pack.";
				return;
			}

			const archiveName = normalizeOutputFileName(outputFileName);
			const rootFolderName = deriveTopLevelFolderName(sourceFiles, archiveName);
			buildStatus = "Starting local 7z build...";
			const archiveBlob = await buildCiv5modBlob(entries, archiveName, rootFolderName);
			const url = URL.createObjectURL(archiveBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = archiveName;
			link.click();
			URL.revokeObjectURL(url);
			buildStatus = `Built ${archiveName} locally with ${entries.length} files (7z format).`;
		} catch (error) {
			buildStatus = error?.message || "Unable to build .civ5mod archive right now.";
		} finally {
			buildBusy = false;
		}
	}

	onDestroy(() => {
		buildWorker?.terminate?.();
		buildWorker = null;
	});
</script>

<section class="civ5mod-page">
	<header class="hero civ5mod-hero">
		<h1>.civ5mod Ziper</h1>
		<p>Pack a local mod folder into a true <code>7z</code>-format <code>.civ5mod</code> archive, built directly in your browser.</p>
	</header>

	<div class="civ5mod-guide-row">
		<section class="civ5mod-guide">
			<h2>How It Works</h2>
			<ol>
				<li>Select your source mod folder using the picker (folder upload).</li>
				<li>Confirm your .modinfo is at the package root (not inside a nested folder).</li>
				<li>Click Build .civ5mod to download the archive.</li>
				<li>Use the output with our tools or in your Civ V MODS directory.</li>
			</ol>
		</section>
		<section class="civ5mod-guide">
			<h2>About .civ5mod Files</h2>
			<ul>
				<li>A ".civ5mod" is just a compressed 7z archives package with a unique extension name.</li>
				<li>The generated file can be used directly in this uploader’s <strong>New Upload</strong> or <strong>Update Existing</strong> tabs.</li>
				<li>The game reads ".civ5mod" files in your "MODS" directory and any directory with a valid ".modinfo" file.</li>
			</ul>
		</section>
		<section class="civ5mod-guide">
			<h2>Browser Version Notes</h2>
			<ul>
				<li>Directory selection uses browser support for folder uploads.</li>
				<li>If your browser blocks folder upload, pick individual files as a fallback.</li>
				<li>The archive is built locally on your device, so large mods are no longer limited by Netlify upload size.</li>
				<li>This page does not upload to Steam directly. It only builds the archive file.</li>
				<li>You can download and use our custom Workshop Uploader to share your mod.</li>
			</ul>
		</section>
	</div>

	<section class="civ5mod-panel">
		<div
			class={`civ5mod-dropzone ${dragOver ? "is-drag-over" : ""}`}
			role="button"
			tabindex="0"
			aria-label="Choose source folder or drop files"
			onclick={onDropzoneActivate}
			onkeydown={onDropzoneKeydown}
			ondragover={onDropzoneDragOver}
			ondragenter={onDropzoneDragEnter}
			ondragleave={onDropzoneDragLeave}
			ondrop={onDropzoneDrop}
		>
			<p class="civ5mod-drop-title">Drop files here or choose a source folder</p>
			<input bind:this={fileInputEl} class="civ5mod-hidden-input" type="file" multiple webkitdirectory onchange={onFileInputChange} />
			<p class="civ5mod-hint">Selected files: {fileCount}</p>
			<p class="civ5mod-hint">Total size: {(totalSourceBytes / (1024 * 1024)).toFixed(2)} MB</p>
		</div>

		<label class="civ5mod-output-name">
			<span>Output File Name</span>
			<input type="text" value={outputFileName} oninput={(event) => (outputFileName = event.currentTarget.value)} placeholder="my-mod.civ5mod" />
		</label>

		<div class="civ5mod-checks">
			<span class={`civ5mod-check ${rootModinfoFound ? "ok" : "warn"}`}>{rootModinfoFound ? "✓" : "•"} Root .modinfo detected</span>
			<span class={`civ5mod-check ${fileCount ? "ok" : "warn"}`}>{fileCount ? "✓" : "•"} Source files loaded</span>
		</div>

		<div class="civ5mod-build-row">
			<span class="civ5mod-tooltip-wrap">
				<button type="button" class="civ5mod-btn" disabled={!canBuild} onclick={buildCiv5mod}>{buildBusy ? "Building..." : "Build .civ5mod"}</button>
				{#if !canBuild}
					<span class="civ5mod-tooltip">{requiredIssues.join(" ")}</span>
				{/if}
			</span>
			{#if buildStatus}
				<p class="civ5mod-status">{buildStatus}</p>
			{/if}
		</div>
	</section>
</section>

<style>
	.civ5mod-page {
		display: grid;
		gap: 1rem;
	}

	.civ5mod-hero {
		background: var(--panel-bg);
		border-color: color-mix(in oklch, var(--accent) 16%, var(--panel-border));
	}

	.civ5mod-guide-row {
		display: grid;
		gap: 0.8rem;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.civ5mod-guide {
		display: grid;
		gap: 0.5rem;
		background: color-mix(in oklch, var(--panel-bg) 92%, var(--accent) 4%);
		border: 1px solid color-mix(in oklch, var(--panel-border) 74%, transparent);
		border-radius: 0.9rem;
		padding: 0.9rem 1rem;
	}

	.civ5mod-guide h2 {
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 0.96rem;
		margin: 0;
	}

	.civ5mod-guide ol,
	.civ5mod-guide ul {
		display: grid;
		gap: 0.35rem;
		color: var(--muted-ink);
		font-size: 0.83rem;
		padding-inline-start: 1.1rem;
		margin: 0;
	}

	.civ5mod-panel {
		display: grid;
		gap: 0.8rem;
		background: var(--panel-bg);
		box-shadow: 0 10px 26px var(--shadow-soft);
		border: 1px solid color-mix(in oklch, var(--panel-border) 78%, transparent);
		border-radius: 1rem;
		padding: 1rem;
	}

	.civ5mod-dropzone {
		display: grid;
		gap: 0.55rem;
		background: color-mix(in oklch, var(--panel-bg) 90%, var(--control-bg) 10%);
		border: 1px dashed color-mix(in oklch, var(--panel-border) 75%, transparent);
		border-radius: 0.8rem;
		padding: 0.9rem;
	}

	.civ5mod-dropzone.is-drag-over {
		background: color-mix(in oklch, var(--accent) 10%, var(--panel-bg));
		border-color: color-mix(in oklch, var(--accent) 68%, var(--panel-border));
	}

	.civ5mod-drop-title {
		font-weight: 600;
		margin: 0;
	}

	.civ5mod-hint {
		color: color-mix(in oklch, var(--muted-ink) 88%, var(--ink) 12%);
		font-size: 0.79rem;
		margin: 0;
	}

	.civ5mod-actions-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.civ5mod-hidden-input {
		display: none;
	}

	.civ5mod-output-name {
		display: grid;
		gap: 0.45rem;
		color: var(--muted-ink);
		font-size: 0.84rem;
	}

	.civ5mod-checks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.civ5mod-check {
		align-items: center;
		display: inline-flex;
		gap: 0.35rem;
		font-size: 0.78rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 80%, transparent);
		border-radius: 0.55rem;
		padding: 0.35rem 0.45rem;
	}

	.civ5mod-check.ok {
		background: color-mix(in oklch, oklch(0.72 0.12 150) 18%, transparent);
	}

	.civ5mod-check.warn {
		background: color-mix(in oklch, oklch(0.72 0.12 35) 14%, transparent);
	}

	.civ5mod-build-row {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.civ5mod-status {
		color: color-mix(in oklch, var(--accent) 70%, var(--ink));
		font-size: 0.82rem;
		margin: 0;
	}

	.civ5mod-btn {
		cursor: pointer;
		color: var(--ink);
		font: inherit;
		background: linear-gradient(145deg, var(--accent), var(--accent-strong));
		border: 1px solid color-mix(in oklch, var(--accent) 56%, var(--panel-border));
		border-radius: 0.62rem;
		padding-block: 0.42rem;
		padding-inline: 0.72rem;
	}

	.civ5mod-btn.ghost {
		background: var(--control-bg);
	}

	.civ5mod-btn:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.civ5mod-tooltip-wrap {
		position: relative;
		display: inline-flex;
	}

	.civ5mod-tooltip {
		inset-block-end: calc(100% + 0.45rem);
		inset-inline-start: 50%;
		position: absolute;
		transform: translateX(-50%);
		max-inline-size: 24rem;
		min-inline-size: 15rem;
		pointer-events: none;
		color: var(--ink);
		opacity: 0;
		font-size: 0.76rem;
		background: oklch(0.2 0 0 / 0.96);
		border: 1px solid color-mix(in oklch, var(--accent) 45%, var(--panel-border));
		border-radius: 0.55rem;
		padding: 0.45rem 0.6rem;
		transition: opacity 120ms ease-in-out;
	}

	.civ5mod-tooltip-wrap:hover .civ5mod-tooltip {
		opacity: 1;
	}

	.civ5mod-panel input {
		inline-size: 100%;
		color: var(--ink);
		font: inherit;
		background: var(--input-bg);
		border: 1px solid var(--panel-border);
		border-radius: 0.6rem;
		padding-block: 0.46rem;
		padding-inline: 0.58rem;
	}

	@media (max-width: 900px) {
		.civ5mod-guide-row {
			grid-template-columns: 1fr;
		}
	}
</style>
