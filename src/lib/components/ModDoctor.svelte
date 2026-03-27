<script>
	import { tick } from "svelte";
	import HelpfulLinksPanel from "./HelpfulLinksPanel.svelte";
	import { isTextLikeDoctorFile, normalizeDoctorPath } from "../utils/modDoctor.js";

	const MAX_READ_BYTES = 1024 * 1024 * 2;
	const MOD_DOCTOR_LINKS = [
		{
			label: "Schema Browser",
			description: "Open tables mentioned by the scanner and confirm row names, columns, and patch targets.",
			href: "/schema-browser",
		},
		{
			label: "Lua API Explorer",
			description: "Cross-check methods and GameEvents when Lua log lines point at hook or API mistakes.",
			href: "/lua-api-explorer",
		},
		{
			label: "Pattern Library",
			description: "Jump to implementation recipes when the scanner flags missing safety checks or risky overrides.",
			href: "/pattern-library",
		},
		{
			label: ".modinfo Builder",
			description: "Use the builder if the scan shows missing References, Dependencies, or conflict blocks.",
			href: "/modinfo-builder",
		},
	];

	let folderInputEl;
	let beforeFolderInputEl;
	let logInputEl;
	let statusMessage = "";
	let busy = false;
	let analysis = null;
	let beforeSnapshot = null;
	let compareMode = false;
	let scannedProjectName = "";
	let skippedFiles = [];
	let scannedTextFileCount = 0;
	let resultsSectionEl;
	let doctorWorker = null;
	let summaryCopyMessage = "";
	let currentFolderFiles = [];
	let currentLogFiles = [];
	let beforeFolderFiles = [];

	function triggerFolderUpload() {
		folderInputEl?.click();
	}

	function triggerBeforeFolderUpload() {
		beforeFolderInputEl?.click();
	}

	function triggerLogUpload() {
		logInputEl?.click();
	}

	function setCompareMode(enabled) {
		compareMode = Boolean(enabled);
		if (compareMode) {
			return;
		}
		beforeSnapshot = null;
		beforeFolderFiles = [];
	}

	function ensureDoctorWorker() {
		if (doctorWorker) {
			return doctorWorker;
		}
		doctorWorker = new Worker(new URL("../workers/mod-doctor.worker.js", import.meta.url), {
			type: "module",
		});
		return doctorWorker;
	}

	function analyzeRecordsInWorker(records) {
		return new Promise((resolve, reject) => {
			const worker = ensureDoctorWorker();

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
					statusMessage = payload.message || statusMessage;
					return;
				}
				if (payload.type === "result") {
					cleanup();
					resolve(payload.analysis);
					return;
				}
				if (payload.type === "error") {
					cleanup();
					reject(new Error(payload.message || "Unable to analyze the uploaded files in this browser worker."));
				}
			};

			const onError = () => {
				cleanup();
				reject(new Error("The browser worker failed while analyzing the uploaded files."));
			};

			worker.addEventListener("message", onMessage);
			worker.addEventListener("error", onError);
			worker.postMessage({
				type: "analyze",
				records,
			});
		});
	}

	async function handleFolderChange(event) {
		currentFolderFiles = Array.from(event.currentTarget.files || []);
		await runCurrentScan();
		event.currentTarget.value = "";
	}

	async function handleBeforeFolderChange(event) {
		beforeFolderFiles = Array.from(event.currentTarget.files || []);
		await runBeforeScan();
		event.currentTarget.value = "";
	}

	async function handleLogChange(event) {
		currentLogFiles = dedupeFiles([...currentLogFiles, ...Array.from(event.currentTarget.files || [])]);
		await runCurrentScan();
		event.currentTarget.value = "";
	}

	function dedupeFiles(files) {
		const seen = new Set();
		const output = [];
		for (const file of files || []) {
			const key = [normalizeDoctorPath(file.webkitRelativePath || file.name || ""), String(file.size || 0), String(file.lastModified || 0)].join("|");
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			output.push(file);
		}
		return output;
	}

	async function scanUploadedFiles(folderFilesLike, looseLogFilesLike, label) {
		const folderFiles = Array.from(folderFilesLike || []);
		const looseLogFiles = Array.from(looseLogFilesLike || []);
		if (!folderFiles.length && !looseLogFiles.length) {
			throw new Error(`No files were added for the ${label} scan.`);
		}

		const records = [];
		const skipped = [];
		const folderName = inferFolderName(folderFiles);
		const allFiles = [...folderFiles, ...looseLogFiles];

		for (let index = 0; index < allFiles.length; index += 1) {
			const file = allFiles[index];
			const path = normalizeDoctorPath(file.webkitRelativePath || file.name || "");
			if (!isTextLikeDoctorFile(path)) {
				if (index > 0 && index % 100 === 0) {
					await yieldToBrowser();
				}
				continue;
			}
			if (index === 0 || index % 25 === 0 || index === allFiles.length - 1) {
				statusMessage = `Reading ${label} files (${Math.min(index + 1, allFiles.length)}/${allFiles.length})...`;
				await tick();
				await yieldToBrowser();
			}
			if (Number(file.size || 0) > MAX_READ_BYTES) {
				skipped.push(`${path} skipped because it is larger than 2 MB.`);
				continue;
			}
			const text = await file.text();
			records.push({
				name: file.name,
				path,
				size: file.size || 0,
				text,
			});
		}

		if (!records.length) {
			throw new Error("No readable .modinfo, .sql, .xml, .lua, or supported log files were found in the upload.");
		}

		statusMessage = `Analyzing ${label} files (${records.length})...`;
		await tick();
		const nextAnalysis = await analyzeRecordsInWorker(records);
		return {
			analysis: nextAnalysis,
			folderName,
			skipped,
			recordsCount: records.length,
		};
	}

	async function runBeforeScan() {
		if (!beforeFolderFiles.length) {
			return;
		}
		busy = true;
		statusMessage = "";
		summaryCopyMessage = "";
		try {
			const result = await scanUploadedFiles(beforeFolderFiles, [], "before");
			beforeSnapshot = {
				analysis: result.analysis,
				projectName: result.folderName || "Before upload",
				scannedTextFileCount: result.recordsCount,
				skippedFiles: result.skipped,
			};
			statusMessage = `Loaded baseline scan from ${beforeSnapshot.projectName}. Upload the current folder to compare what changed.`;
		} catch (error) {
			statusMessage = error?.message || "Unable to analyze the baseline files.";
		} finally {
			busy = false;
		}
	}

	async function runCurrentScan() {
		if (!currentFolderFiles.length && !currentLogFiles.length) {
			return;
		}

		busy = true;
		statusMessage = "";
		analysis = null;
		summaryCopyMessage = "";
		skippedFiles = [];
		scannedTextFileCount = 0;

		try {
			const result = await scanUploadedFiles(currentFolderFiles, currentLogFiles, "current");
			analysis = result.analysis;
			scannedProjectName = result.folderName || scannedProjectName;
			scannedTextFileCount = result.recordsCount;
			skippedFiles = result.skipped;
			const findingCount = totalFindingCount(analysis);
			statusMessage =
				findingCount > 0
					? `Scanned ${result.recordsCount} text file${result.recordsCount === 1 ? "" : "s"}${result.folderName ? ` from ${result.folderName}` : ""} and found ${findingCount} thing${findingCount === 1 ? "" : "s"} to review.${beforeSnapshot ? ` Compared against ${beforeSnapshot.projectName}.` : ""}`
					: `Scanned ${result.recordsCount} text file${result.recordsCount === 1 ? "" : "s"}${result.folderName ? ` from ${result.folderName}` : ""} and did not find any obvious problems in this pass.${beforeSnapshot ? ` Compared against ${beforeSnapshot.projectName}.` : ""}`;
			await tick();
			resultsSectionEl?.scrollIntoView({ behavior: "smooth", block: "start" });
		} catch (error) {
			statusMessage = error?.message || "Unable to analyze the uploaded files.";
		} finally {
			busy = false;
		}
	}

	function clearScan() {
		analysis = null;
		beforeSnapshot = null;
		statusMessage = "";
		scannedProjectName = "";
		summaryCopyMessage = "";
		skippedFiles = [];
		scannedTextFileCount = 0;
		currentFolderFiles = [];
		currentLogFiles = [];
		beforeFolderFiles = [];
	}

	function inferFolderName(files) {
		for (const file of files || []) {
			const relative = normalizeDoctorPath(file.webkitRelativePath || "");
			if (relative.includes("/")) {
				return relative.split("/")[0];
			}
		}
		return "";
	}

	function yieldToBrowser() {
		return new Promise((resolve) => setTimeout(resolve, 0));
	}

	function totalFindingCount(currentAnalysis) {
		if (!currentAnalysis) {
			return 0;
		}
		return (
			currentAnalysis.logTriage.issues.length +
			currentAnalysis.compatibility.duplicateTypes.length +
			currentAnalysis.compatibility.modpackCollisions.length +
			currentAnalysis.compatibility.unwiredFiles.length +
			currentAnalysis.compatibility.listedOnlyFiles.length +
			currentAnalysis.compatibility.missingProjectFiles.length +
			currentAnalysis.compatibility.weakLuaBindings.length +
			currentAnalysis.compatibility.actionOrderIssues.length +
			currentAnalysis.compatibility.missingTextKeys.length +
			currentAnalysis.compatibility.riskyOverrides.length +
			currentAnalysis.compatibility.artAudioIssues.length +
			currentAnalysis.compatibility.modinfoReasoning.length +
			currentAnalysis.compatibility.ecosystemNotes.length +
			currentAnalysis.dll.findings.length
		);
	}

	function isCleanScan(currentAnalysis) {
		return Boolean(currentAnalysis) && totalFindingCount(currentAnalysis) === 0;
	}

	function uniqueValues(values) {
		return Array.from(new Set((values || []).filter(Boolean)));
	}

	function groupedRiskyOverrides(currentAnalysis) {
		if (!currentAnalysis?.compatibility?.riskyOverrides?.length) {
			return [];
		}
		const groups = new Map();
		for (const entry of currentAnalysis.compatibility.riskyOverrides) {
			const key = [entry.packageName || "", entry.path || "", entry.summary || "", entry.severity || "", entry.needsGuard ? "1" : "0"].join("::");
			const existing = groups.get(key);
			if (existing) {
				existing.count += 1;
				existing.links = uniqueValues([...(existing.links || []), ...(entry.links || []).map((link) => `${link.label}|${link.href}`)]);
				continue;
			}
			groups.set(key, {
				...entry,
				count: 1,
				links: uniqueValues((entry.links || []).map((link) => `${link.label}|${link.href}`)),
			});
		}
		return Array.from(groups.values()).map((entry) => ({
			...entry,
			links: (entry.links || []).map((value) => {
				const [label, href] = value.split("|");
				return { label, href };
			}),
		}));
	}

	function groupedGenericEntries(entries, signatureBuilder) {
		const groups = new Map();
		for (const entry of entries || []) {
			const key = signatureBuilder(entry);
			const existing = groups.get(key);
			if (existing) {
				existing.count += entry.count || 1;
				continue;
			}
			groups.set(key, {
				...entry,
				count: entry.count || 1,
			});
		}
		return Array.from(groups.values());
	}

	function scanCounts(currentAnalysis) {
		if (!currentAnalysis) {
			return [];
		}
		return [
			["Root causes", currentAnalysis.overview.rootCauses.length],
			["Log issues", currentAnalysis.logTriage.issues.length],
			["Art and audio issues", currentAnalysis.compatibility.artAudioIssues.length],
			["Modinfo wiring notes", currentAnalysis.compatibility.modinfoReasoning.length],
			["Duplicate types", currentAnalysis.compatibility.duplicateTypes.length],
			["Cross package collisions", currentAnalysis.compatibility.modpackCollisions.length],
			["Missing project files", currentAnalysis.compatibility.missingProjectFiles.length],
			["Files not wired into modinfo", currentAnalysis.compatibility.unwiredFiles.length],
			["Listed but not set to load", currentAnalysis.compatibility.listedOnlyFiles.length],
			["Weak Lua bindings", currentAnalysis.compatibility.weakLuaBindings.length],
			["Load order issues", currentAnalysis.compatibility.actionOrderIssues.length],
			["Missing text keys", currentAnalysis.compatibility.missingTextKeys.length],
			["Risky overrides", groupedRiskyOverrides(currentAnalysis).length],
			["Ecosystem notes", currentAnalysis.compatibility.ecosystemNotes.length],
			["DLL findings", currentAnalysis.dll.findings.length],
		];
	}

	function compareScans(beforeAnalysis, afterAnalysis) {
		if (!beforeAnalysis || !afterAnalysis) {
			return null;
		}
		const beforeCounts = new Map(scanCounts(beforeAnalysis));
		const afterCounts = new Map(scanCounts(afterAnalysis));
		const countLines = scanCounts(afterAnalysis).map(([label, afterCount]) => {
			const beforeCount = beforeCounts.get(label) || 0;
			const delta = afterCount - beforeCount;
			const direction = delta > 0 ? `up ${delta}` : delta < 0 ? `down ${Math.abs(delta)}` : "no change";
			return `${label}: before ${beforeCount}, after ${afterCount}, ${direction}`;
		});

		const beforeRootCauseMap = new Map((beforeAnalysis.overview.rootCauses || []).map((entry) => [entry.signature || entry.title, entry]));
		const afterRootCauseMap = new Map((afterAnalysis.overview.rootCauses || []).map((entry) => [entry.signature || entry.title, entry]));
		const newRootCauses = [];
		const resolvedRootCauses = [];
		const persistentRootCauses = [];

		for (const [key, entry] of afterRootCauseMap.entries()) {
			if (!beforeRootCauseMap.has(key)) {
				newRootCauses.push(entry);
				continue;
			}
			persistentRootCauses.push(entry);
		}
		for (const [key, entry] of beforeRootCauseMap.entries()) {
			if (!afterRootCauseMap.has(key)) {
				resolvedRootCauses.push(entry);
			}
		}

		return {
			countLines,
			newRootCauses,
			resolvedRootCauses,
			persistentRootCauses,
		};
	}

	function summaryListLines(title, entries, formatter) {
		if (!entries?.length) {
			return [`${title}: none`];
		}
		const lines = [`${title}:`];
		for (const entry of entries) {
			lines.push(`- ${formatter(entry)}`);
		}
		return lines;
	}

	function llmSummaryText(currentAnalysis) {
		if (!currentAnalysis) {
			return "";
		}
		const groupedArtAudioIssues = groupedGenericEntries(currentAnalysis.compatibility.artAudioIssues, (entry) => `${entry.summary || ""}|${entry.path || ""}`);
		const groupedModinfoReasoning = groupedGenericEntries(currentAnalysis.compatibility.modinfoReasoning, (entry) => `${entry.summary || ""}|${entry.path || ""}`);
		const comparison = compareScans(beforeSnapshot?.analysis, currentAnalysis);
		const lines = [
			"MOD DOCTOR SUMMARY",
			`Project: ${scannedProjectName || "Uploaded files"}`,
			`Text files scanned: ${scannedTextFileCount}`,
			...(beforeSnapshot ? [`Compared against: ${beforeSnapshot.projectName}`, `Baseline text files scanned: ${beforeSnapshot.scannedTextFileCount}`] : []),
			`Packages: ${currentAnalysis.overview.packageCount}`,
			`Detected ecosystems: ${currentAnalysis.overview.detectedEcosystems.length ? currentAnalysis.overview.detectedEcosystems.map((entry) => entry.label).join(", ") : "none"}`,
			"",
			"Counts",
			...scanCounts(currentAnalysis).map(([label, count]) => `- ${label}: ${count}`),
			"",
			...summaryListLines(
				"Likely root causes",
				currentAnalysis.overview.rootCauses,
				(entry) => `${entry.title} | ${entry.copy}${entry.evidence?.length ? ` | ${entry.evidence.join(" | ")}` : ""}`,
			),
			"",
			...(comparison
				? [
						"Compare before to after",
						...comparison.countLines.map((line) => `- ${line}`),
						"",
						...summaryListLines("New root causes", comparison.newRootCauses, (entry) => `${entry.title} | ${entry.copy}`),
						"",
						...summaryListLines("Resolved root causes", comparison.resolvedRootCauses, (entry) => `${entry.title} | ${entry.copy}`),
						"",
						...summaryListLines("Still present root causes", comparison.persistentRootCauses, (entry) => `${entry.title} | ${entry.copy}`),
						"",
					]
				: []),
			"",
			...summaryListLines("Packages", currentAnalysis.overview.packages, (entry) => {
				const ecosystems = entry.detectedEcosystems?.length ? ` | ecosystems: ${entry.detectedEcosystems.map((item) => item.label).join(", ")}` : "";
				const modTitles = entry.modTitles?.length ? ` | mod names: ${entry.modTitles.join(", ")}` : "";
				return `${entry.name} | ${entry.rootPath} | modinfo ${entry.modinfoFiles}, SQL ${entry.sqlFiles}, XML ${entry.xmlFiles}, Lua ${entry.luaFiles}${modTitles}${ecosystems}`;
			}),
			"",
			"Fix first",
			...(currentAnalysis.overview.prioritySummary?.length ? currentAnalysis.overview.prioritySummary.map((item) => `- ${item}`) : ["- No priority items were generated"]),
			"",
			...summaryListLines("Detected ecosystems", currentAnalysis.overview.detectedEcosystems, (entry) => `${entry.label} | ${uniqueValues(entry.files).join(" | ")}`),
			"",
			...summaryListLines(
				"Log issues",
				currentAnalysis.logTriage.issues,
				(entry) =>
					`${entry.title} | ${entry.logName}${entry.relatedPackages?.length ? ` | mods: ${entry.relatedPackages.join(", ")}` : entry.packageName ? ` | ${entry.packageName}` : ""}${entry.count > 1 ? ` | repeated ${entry.count} times` : ""}${entry.relatedPaths?.length ? ` | ${uniqueValues(entry.relatedPaths).join(" | ")}` : ""}`,
			),
			"",
			...summaryListLines(
				"Art and audio issues",
				groupedArtAudioIssues,
				(entry) => `${entry.summary}${entry.count > 1 ? ` | repeated ${entry.count} times` : ""}${entry.path ? ` | ${entry.path}` : ""}`,
			),
			"",
			...summaryListLines(
				"Modinfo wiring notes",
				groupedModinfoReasoning,
				(entry) => `${entry.summary}${entry.count > 1 ? ` | repeated ${entry.count} times` : ""}${entry.path ? ` | ${entry.path}` : ""}`,
			),
			"",
			...summaryListLines("Files not wired into modinfo", currentAnalysis.compatibility.unwiredFiles, (entry) => `${entry.summary} | ${entry.path}`),
			"",
			...summaryListLines("Listed but not set to load", currentAnalysis.compatibility.listedOnlyFiles, (entry) => `${entry.summary} | ${entry.path}`),
			"",
			...summaryListLines("Weak Lua bindings", currentAnalysis.compatibility.weakLuaBindings, (entry) => `${entry.summary} | ${entry.path}`),
			"",
			...summaryListLines("Load order issues", currentAnalysis.compatibility.actionOrderIssues, (entry) => `${entry.summary} | ${entry.path}`),
			"",
			...summaryListLines("Missing project files", currentAnalysis.compatibility.missingProjectFiles, (entry) => `${entry.path} (${entry.packageName || "unknown package"})`),
			"",
			...summaryListLines("Risky overrides", groupedRiskyOverrides(currentAnalysis), (entry) => `${entry.summary} | ${entry.path}${entry.count > 1 ? ` | repeated ${entry.count} times` : ""}`),
			"",
			...summaryListLines(
				"Duplicate types",
				currentAnalysis.compatibility.duplicateTypes,
				(entry) =>
					`${entry.type} | defined ${entry.count} times | first file ${uniqueValues(entry.entries?.map((item) => item.path))[0] || "unknown"} | all files ${uniqueValues(entry.entries?.map((item) => item.path)).join(" | ")}`,
			),
			"",
			...summaryListLines("Missing text keys", currentAnalysis.compatibility.missingTextKeys, (entry) => `${entry.key} | ${uniqueValues(entry.paths).join(" | ")}`),
			"",
			...summaryListLines("Ecosystem notes", currentAnalysis.compatibility.ecosystemNotes, (entry) => `${entry.title} | ${entry.copy}`),
			"",
			...summaryListLines("DLL findings", currentAnalysis.dll.findings, (entry) => entry.title),
		];
		return lines.join("\n");
	}

	async function copySummaryReport() {
		if (!analysis || !navigator?.clipboard?.writeText) {
			summaryCopyMessage = "Copy is not available in this browser.";
			return;
		}
		try {
			await navigator.clipboard.writeText(llmSummaryText(analysis));
			summaryCopyMessage = "Summary copied.";
		} catch {
			summaryCopyMessage = "Unable to copy the summary.";
		}
	}
</script>

<section class="mod-doctor-page stack">
	<header class="hero mod-doctor-hero">
		<div class="stack half">
			<p class="eyebrow">Error Finder</p>
			<h1>Mod Doctor</h1>
			<p>Upload a mod folder, optionally add Civ V logs, and get a first-pass read on likely errors, compatibility risks, and CP / VMC / VP support details.</p>
		</div>
	</header>

	<section class="surface-panel surface-panel--compact mod-doctor-upload">
		<div class="stack half">
			<p class="eyebrow">Upload</p>
			<h2 class="section-title">Scan a project folder and optional logs</h2>
			<p class="card-copy">Best results come from a mod folder plus any of Database.log, xml.log, Lua.log, Modding.log, and stopwatch.log if you have them.</p>
		</div>

		<div class="inline half flex-wrap">
			{#if compareMode}
				<button type="button" class="mod-doctor-button" onclick={triggerBeforeFolderUpload} disabled={busy}>Upload Before Folder</button>
			{/if}
			<button type="button" class="mod-doctor-button mod-doctor-button-primary" onclick={triggerFolderUpload} disabled={busy}>Upload Current Folder</button>
			<button type="button" class="mod-doctor-button" onclick={triggerLogUpload} disabled={busy || (!currentFolderFiles.length && !analysis)}>Add Current Logs</button>
			<button type="button" class="mod-doctor-button" onclick={clearScan} disabled={busy || (!analysis && !beforeSnapshot && !statusMessage)}>Clear</button>

			<button type="button" class:selected={compareMode} class="mod-doctor-button margin-inline-start-auto" onclick={() => setCompareMode(!compareMode)} disabled={busy}>
				{compareMode ? "Turn Off Compare" : "Turn On Compare"}
			</button>
		</div>

		<input bind:this={beforeFolderInputEl} class="mod-doctor-hidden-input" type="file" webkitdirectory multiple onchange={handleBeforeFolderChange} />
		<input bind:this={folderInputEl} class="mod-doctor-hidden-input" type="file" webkitdirectory multiple onchange={handleFolderChange} />
		<input bind:this={logInputEl} class="mod-doctor-hidden-input" type="file" multiple accept=".log,text/plain" onchange={handleLogChange} />

		{#if compareMode && beforeSnapshot}
			<p class="card-copy">Baseline loaded: <strong>{beforeSnapshot.projectName}</strong> with {beforeSnapshot.scannedTextFileCount} text files.</p>
		{/if}

		{#if busy}
			<p class="status status-loading" role="status" aria-live="polite">
				<span class="status-spinner" aria-hidden="true"></span>
				<span>{statusMessage || "Scanning uploaded files..."}</span>
			</p>
		{:else if statusMessage}
			<p class="status" role="status" aria-live="polite">{statusMessage}</p>
		{/if}

		{#if skippedFiles.length}
			<div class="mod-doctor-chip-row">
				{#each skippedFiles as item (item)}
					<span class="mod-doctor-chip">{item}</span>
				{/each}
			</div>
		{/if}

		{#if analysis}
			<section class="mod-doctor-results stack">
				<section bind:this={resultsSectionEl} class="surface-panel surface-panel--compact mod-doctor-summary-panel">
					<div class="inline between flex-wrap half align-start">
						<div class="stack quarter">
							<p class="eyebrow">Results</p>
							<h2 class="section-title">Mod Doctor Report</h2>
							<p class="card-copy">This is the full plain report of issues found. It is meant to be readable by both people and other tools.</p>
						</div>
						<div class="stack quarter align-start">
							<button type="button" class="mod-doctor-button" onclick={copySummaryReport}>Copy Summary</button>
							{#if summaryCopyMessage}
								<p class="card-copy">{summaryCopyMessage}</p>
							{/if}
						</div>
					</div>
					<pre class="mod-doctor-code mod-doctor-summary-code"><code>{llmSummaryText(analysis)}</code></pre>
				</section>
			</section>
		{/if}
	</section>

	<HelpfulLinksPanel ariaLabel="Related mod doctor tools" links={MOD_DOCTOR_LINKS} tone="support" />
</section>

<style>
	.mod-doctor-page {
		gap: 1rem;
	}

	.mod-doctor-hero {
		--page-hero-border: color-mix(in oklch, var(--surface-support-highlight) 62%, var(--surface-support-border));
	}

	.mod-doctor-upload,
	.mod-doctor-summary-panel {
		border-color: color-mix(in oklch, var(--surface-support-border) 64%, var(--panel-border));
		background: color-mix(in oklch, var(--surface-support-panel) 42%, var(--panel-bg));
	}

	.mod-doctor-hidden-input {
		display: none;
	}

	.mod-doctor-results {
		gap: 0.8rem;
	}

	.mod-doctor-button {
		border: 1px solid color-mix(in oklch, var(--surface-support-border) 70%, var(--panel-border));
		background: color-mix(in oklch, var(--control-bg) 90%, var(--surface-support-panel));
		color: var(--ink);
		border-radius: 0.8rem;
		padding: 0.8rem 1rem;
		font: inherit;
		font-weight: 700;
	}

	.mod-doctor-button-primary {
		background: color-mix(in oklch, var(--surface-support-highlight) 24%, var(--control-bg));
	}

	.mod-doctor-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1px solid color-mix(in oklch, var(--surface-support-border) 60%, var(--panel-border));
		background: color-mix(in oklch, var(--control-bg) 92%, var(--surface-support-panel));
		color: var(--muted-ink);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		padding: 0.25rem 0.55rem;
	}

	.mod-doctor-chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.mod-doctor-code {
		margin: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.84rem;
		line-height: 1.55;
		overflow-wrap: anywhere;
	}

	.mod-doctor-code {
		padding: 0.9rem 1rem;
		border-radius: 0.85rem;
		background: color-mix(in oklch, black 18%, var(--input-bg));
		border: 1px solid color-mix(in oklch, var(--surface-support-border) 40%, var(--panel-border));
		white-space: pre-wrap;
	}

	.mod-doctor-summary-panel {
		gap: 0.75rem;
	}

	.mod-doctor-summary-code {
		max-block-size: 42rem;
		overflow: auto;
		font-size: 0.8rem;
		line-height: 1.45;
	}

	:global(.mod-doctor-upload.surface-panel) {
		--surface-panel-padding: 1rem;
	}
</style>
