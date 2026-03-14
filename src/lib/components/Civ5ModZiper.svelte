<script>
	import { onDestroy } from "svelte";

	let fileInputEl = $state(null);
	let sourceFiles = $state([]);
	let outputFileName = $state("my-mod.civ5mod");
	let buildBusy = $state(false);
	let buildStatus = $state("");
	let dragOver = $state(false);
	let buildWorker = null;
	let lastSuggestedOutputFileName = $state("my-mod.civ5mod");
	const companionTools = [
		{
			title: ".modinfo Builder",
			href: "/modinfo-builder",
			copy: "Generate file lists, MD5 hashes, actions, references, and dependencies before packaging.",
		},
		{
			title: "Workshop Uploader",
			href: "/workshop-uploader",
			copy: "Use the standalone uploader once the archive is ready to publish a new mod or update an existing Workshop item.",
		},
		{
			title: "Community Links",
			href: "/community-links",
			copy: "Find Discord communities, troubleshooting help, and release channels for Civ V modding.",
		},
	];

	const fileCount = $derived.by(() => sourceFiles.length);
	const totalSourceBytes = $derived.by(() => sourceFiles.reduce((sum, file) => sum + Number(file?.size || 0), 0));
	const rootModinfoFound = $derived.by(() => sourceFiles.map((file) => deriveArchivePath(file)).some((path) => path && !path.includes("/") && path.toLowerCase().endsWith(".modinfo")));
	const requiredIssues = $derived.by(() => {
		const issues = [];
		if (!fileCount) {
			issues.push("Select a source folder (or files) first.");
		}
		if (fileCount && !rootModinfoFound) {
			issues.push("Add a .modinfo file at the package root.");
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
		const nextSuggestedOutputFileName = suggestOutputName(next);
		const currentOutputFileName = String(outputFileName || "").trim();
		const shouldRefreshSuggestedOutput = !currentOutputFileName || currentOutputFileName === "my-mod.civ5mod" || currentOutputFileName === lastSuggestedOutputFileName;

		sourceFiles = next;
		if (shouldRefreshSuggestedOutput) {
			outputFileName = nextSuggestedOutputFileName;
		}
		lastSuggestedOutputFileName = nextSuggestedOutputFileName;
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

	function buildCiv5modBlob(entries, archiveName) {
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
			buildStatus = "Starting local 7z build...";
			const archiveBlob = await buildCiv5modBlob(entries, archiveName);
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
		<p>Package a mod folder into a legacy <code>7z</code>-format <code>.civ5mod</code> archive.</p>
	</header>

	<div class="civ5mod-guide-row">
		<section class="civ5mod-guide">
			<h2>How It Works</h2>
			<ol>
				<li>Select your source mod folder using the input below.</li>
				<li>Confirm your .modinfo is at the package root (not inside a nested folder).</li>
				<li>Click <strong>Build .civ5mod</strong> to download the archive.</li>
				<li>Use the output with our tools or in your Civ V MODS directory.</li>
			</ol>
		</section>
		<section class="civ5mod-guide">
			<h2>About .civ5mod Files</h2>
			<ul>
				<li>A ".civ5mod" is just a compressed 7z archives package with a unique extension name.</li>
				<li>The game reads a correctly formatted ".civ5mod" file in your "MODS" directory, or any folder, with a valid ".modinfo" file.</li>
				<li>The generated file can be used directly in our <a href="/workshop-uploader">Workshop Uploader's</a> <strong>New Upload</strong> or <strong>Update Existing</strong> tabs.</li>
			</ul>
		</section>
		<section class="civ5mod-guide">
			<h2>Browser Version Notes</h2>
			<ul>
				<li>Directory selection uses browser support for folder uploads.</li>
				<li>If your browser blocks folder upload, pick individual files as a fallback.</li>
				<li>This page does not upload to Steam directly. It only builds the file with the correct settings.</li>
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
			<p class="civ5mod-drop-title">{dragOver ? "Release to add folder" : "Drop files here or choose a source folder"}</p>
			<input bind:this={fileInputEl} class="civ5mod-hidden-input" type="file" multiple webkitdirectory onchange={onFileInputChange} />
			<p class="civ5mod-drop-feedback">{dragOver ? "Drop now to load the folder into the builder." : ""}</p>
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

	<section class="civ5mod-panel">
		<div class="civ5mod-section-head">
			<h2>Use alongside the other Tools</h2>
			<p>This builder is one part of the Civ V workflow. Use the related tools before or after packaging as needed.</p>
		</div>

		<div class="civ5mod-companion-grid">
			{#each companionTools as tool (tool.title)}
				<a class="civ5mod-companion-card" href={tool.href}>
					<h3>{tool.title}</h3>
					<p>{tool.copy}</p>
				</a>
			{/each}
		</div>
	</section>
</section>

<style>
	:global(:root[data-theme="light"]) .civ5mod-page {
		.civ5mod-guide,
		.civ5mod-panel {
			border-color: color-mix(in oklch, var(--panel-border) 86%, var(--accent) 14%);
		}

		.civ5mod-guide,
		.civ5mod-dropzone {
			background: color-mix(in oklch, white 82%, var(--panel-bg));
		}

		.civ5mod-panel {
			background: color-mix(in oklch, white 88%, var(--panel-bg));
		}

		.civ5mod-dropzone:hover {
			background: color-mix(in oklch, white 76%, var(--accent) 8%);
		}

		.civ5mod-dropzone.is-drag-over {
			background: color-mix(in oklch, white 72%, var(--accent) 14%);
		}

		.civ5mod-drop-feedback {
			color: color-mix(in oklch, var(--accent) 56%, var(--ink));
		}

		.civ5mod-tooltip {
			color: var(--ink);
			background: color-mix(in oklch, white 94%, var(--panel-bg));
			box-shadow: 0 14px 28px var(--shadow-soft);
			border-color: color-mix(in oklch, var(--accent) 30%, var(--panel-border));
		}

		.civ5mod-companion-card {
			background: color-mix(in oklch, white 84%, var(--panel-bg));
			border-color: color-mix(in oklch, var(--panel-border) 84%, var(--accent) 16%);

			& p {
				color: color-mix(in oklch, var(--ink) 58%, var(--muted-ink));
			}

			&:hover {
				background: color-mix(in oklch, white 78%, var(--accent) 10%);
			}
		}
	}
	.civ5mod-page {
		display: grid;
		gap: 1rem;
	}

	.civ5mod-guide-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.civ5mod-guide {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: color-mix(in oklch, var(--panel-bg) 98%, var(--accent) 1%);
		border: 1px solid color-mix(in oklch, var(--panel-border) 95%, transparent);
		border-radius: 1rem;
		padding: 1.25rem;

		& h2 {
			align-self: start;
			font-family: "Rockwell", "Palatino Linotype", serif;
			font-size: 1.25rem;
			line-height: 1.05;
		}

		& ol,
		& ul {
			display: grid;
			gap: 0.35rem;
			color: var(--muted-ink);
			font-size: 0.83rem;
			padding-inline-start: 1.1rem;
			margin: 0;
		}
	}

	.civ5mod-panel {
		display: grid;
		gap: 1rem;
		background: color-mix(#000, var(--panel-bg) 90%);
		box-shadow: 0 10px 26px var(--shadow-soft);
		border: 1px solid color-mix(in oklch, var(--panel-border) 85%, transparent);
		border-radius: 1rem;
		padding: 1.25rem;

		& input {
			inline-size: 100%;
			color: var(--ink);
			font: inherit;
			background: var(--input-bg);
			border: 1px solid var(--panel-border);
			border-radius: 0.6rem;
			padding-block: 0.46rem;
			padding-inline: 0.58rem;
		}
	}

	.civ5mod-drop-title {
		font-weight: 600;
		margin: 0;
	}

	.civ5mod-hidden-input {
		display: none;
	}

	.civ5mod-drop-feedback {
		color: color-mix(in oklch, var(--accent) 90%, var(--muted-ink));
		font-size: 0.82rem;
		font-weight: 500;
		margin: 0;
	}

	.civ5mod-hint {
		color: color-mix(in oklch, var(--muted-ink) 88%, var(--ink) 12%);
		font-size: 0.79rem;
		margin: 0;
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

	.civ5mod-build-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.55rem;
	}

	.civ5mod-tooltip-wrap {
		position: relative;
		display: inline-flex;

		& .civ5mod-tooltip {
			position: absolute;
			inset-block-end: calc(100% + 0.45rem);
			inset-inline-start: 50%;
			min-inline-size: 15rem;
			max-inline-size: 24rem;
			color: var(--ink);
			opacity: 0;
			font-size: 0.76rem;
			background: oklch(0.2 0 0 / 0.96);
			border: 1px solid color-mix(in oklch, var(--accent) 45%, var(--panel-border));
			border-radius: 0.55rem;
			padding-block: 0.45rem;
			padding-inline: 0.6rem;
			transition: opacity 120ms ease-in-out;
			transform: translateX(-50%);
			pointer-events: none;
		}

		&:hover .civ5mod-tooltip {
			opacity: 1;
		}
	}

	.civ5mod-btn {
		color: var(--ink);
		font: inherit;
		background: linear-gradient(145deg, var(--accent), var(--accent-strong));
		border: 1px solid color-mix(in oklch, var(--accent) 56%, var(--panel-border));
		border-radius: 0.62rem;
		padding-block: 0.42rem;
		padding-inline: 0.72rem;
		cursor: pointer;

		&.ghost {
			background: var(--control-bg);
		}

		&:disabled {
			opacity: 0.55;
			cursor: not-allowed;
		}
	}

	.civ5mod-status {
		color: color-mix(in oklch, var(--accent) 70%, var(--ink));
		font-size: 0.82rem;
		margin: 0;
	}

	.civ5mod-section-head {
		display: grid;
		gap: 0.35rem;

		& h2 {
			font-family: "Rockwell", "Palatino Linotype", serif;
			margin: 0;
		}

		& p {
			color: var(--muted-ink);
			margin: 0;
		}
	}

	.civ5mod-companion-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.civ5mod-companion-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		color: var(--ink);
		text-decoration: none;
		background: color-mix(in oklch, var(--panel-bg) 88%, black);
		border: 1px solid color-mix(in oklch, var(--panel-border) 76%, transparent);
		border-radius: 0.9rem;
		padding: 1.25rem;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background 140ms ease;

		& h3 {
			font-family: "Rockwell", "Palatino Linotype", serif;
			margin: 0;
		}

		& p {
			color: var(--muted-ink);
			margin: 0;
		}

		&:hover {
			background: color-mix(in oklch, var(--panel-bg) 82%, var(--accent) 6%);
			border-color: color-mix(in oklch, var(--accent) 55%, var(--panel-border));
			transform: translateY(-1px);
		}
	}

	.civ5mod-actions-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.civ5mod-check {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.78rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 80%, transparent);
		border-radius: 0.55rem;
		padding-block: 0.35rem;
		padding-inline: 0.45rem;

		&.ok {
			background: color-mix(in oklch, oklch(0.72 0.12 150) 18%, transparent);
		}

		&.warn {
			background: color-mix(in oklch, oklch(0.72 0.12 35) 14%, transparent);
		}
	}

	.civ5mod-dropzone {
		display: grid;
		gap: 0.55rem;
		background: color-mix(in oklch, var(--panel-bg) 90%, var(--control-bg) 10%);
		border: 1px dashed color-mix(in oklch, var(--panel-border) 75%, transparent);
		border-radius: 0.8rem;
		padding: 0.9rem;
		transition:
			background 140ms ease,
			border-color 140ms ease,
			box-shadow 140ms ease,
			transform 140ms ease;
		cursor: pointer;

		& > p {
			pointer-events: none;
			user-select: none;
		}

		&:hover {
			background: color-mix(in oklch, var(--panel-bg) 90%, var(--accent) 5%);
			box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--accent) 80%, transparent);
			border-color: color-mix(in oklch, var(--accent) 80%, var(--panel-border));
			transform: translateY(-1px);
		}

		&:focus-visible {
			outline: 2px solid color-mix(in oklch, var(--accent) 72%, white);
			outline-offset: 2px;
		}

		&.is-drag-over {
			background: color-mix(in oklch, var(--accent) 5%, var(--panel-bg));
			box-shadow:
				0 0 0 1px color-mix(in oklch, var(--accent) 40%, transparent),
				0 10px 24px color-mix(in oklch, var(--accent) 10%, transparent);
			border-color: color-mix(in oklch, var(--accent) 90%, var(--panel-border));
			transform: translateY(-2px) scale(1.005);
		}
	}

	@media (max-width: 900px) {
		.civ5mod-guide-row {
			grid-template-columns: 1fr;
		}

		.civ5mod-companion-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
