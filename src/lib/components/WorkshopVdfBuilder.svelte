<script>
	const DEFAULT_STATE = {
		appid: "8930",
		publishedfileid: "0",
		title: "",
		description: "",
		changenote: "",
		contentfolder: "",
		previewfile: "",
		visibility: "2",
		tags: "",
		vdfPath: "workshopitem.vdf",
	};

	const VISIBILITY_OPTIONS = [
		{ value: "0", label: "Public" },
		{ value: "1", label: "Friends-only" },
		{ value: "2", label: "Hidden" },
		{ value: "3", label: "Unlisted" },
	];

	const COMMON_TAG_OPTIONS = ["Other", "BraveNewWorld", "Civilizations", "Leaders", "GodsAndKings", "Units", "Maps", "Fictional", "Historic", "Buildings", "Gameplay", "Wonders"];

	let form = $state({ ...DEFAULT_STATE });
	let copyStatus = $state("");

	const isUpdateMode = $derived.by(() => {
		const value = String(form.publishedfileid || "").trim();
		return value !== "" && value !== "0";
	});

	const preflightIssues = $derived.by(() => {
		const issues = [];
		if (!String(form.appid || "").trim()) {
			issues.push("appid is required (Civ V is 8930).");
		}
		if (!String(form.title || "").trim()) {
			issues.push("title is required.");
		}
		if (!String(form.description || "").trim()) {
			issues.push("description is required.");
		}
		if (!String(form.contentfolder || "").trim()) {
			issues.push("contentfolder is required and must be an absolute path.");
		}
		if (!String(form.previewfile || "").trim()) {
			issues.push("previewfile is required and must point to an image file.");
		}
		return issues;
	});
	const requiredChecks = $derived.by(() => [
		{ id: "title", label: "Title", done: Boolean(String(form.title || "").trim()) },
		{ id: "description", label: "Description", done: Boolean(String(form.description || "").trim()) },
		{ id: "contentfolder", label: "Content Folder", done: Boolean(String(form.contentfolder || "").trim()) },
		{ id: "previewfile", label: "Preview Image", done: Boolean(String(form.previewfile || "").trim()) },
	]);
	const completedRequiredChecks = $derived.by(() => requiredChecks.filter((item) => item.done).length);

	const tagsList = $derived.by(() =>
		String(form.tags || "")
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean),
	);
	const normalizedTags = $derived.by(() => tagsList.map((tag) => tag.toLowerCase()));
	const tagIssues = $derived.by(() => {
		const issues = [];
		const rawEntries = String(form.tags || "").split(",");
		if (rawEntries.length > 1 && rawEntries.some((entry) => !entry.trim())) {
			issues.push("Found empty tag entries (for example trailing commas).");
		}
		const duplicates = [];
		const seen = new Set();
		for (const tag of tagsList) {
			const normalized = tag.toLowerCase();
			if (seen.has(normalized)) {
				if (!duplicates.includes(tag)) {
					duplicates.push(tag);
				}
				continue;
			}
			seen.add(normalized);
		}
		if (duplicates.length) {
			issues.push(`Duplicate tags: ${duplicates.join(", ")}`);
		}
		if (tagsList.some((tag) => tag.length > 32)) {
			issues.push("Some tags are long (>32 chars) and may be less effective.");
		}
		return issues;
	});
	const parsedPublishedFileId = $derived.by(() => extractPublishedFileId(String(form.publishedfileid || "")));
	const publishedFileIdHelp = $derived.by(() => {
		const raw = String(form.publishedfileid || "").trim();
		if (!raw || raw === "0") {
			return { tone: "info", text: 'Use "0" for new upload. For updates, paste a numeric ID or a full Workshop URL.' };
		}
		if (/^\d+$/.test(raw)) {
			return { tone: "ok", text: "Numeric ID detected. This will update an existing Workshop item." };
		}
		if (parsedPublishedFileId) {
			return { tone: "info", text: `Detected ID ${parsedPublishedFileId} from URL. Click "Use Detected ID" to apply.` };
		}
		return { tone: "warn", text: 'Could not detect a valid ID. Use a number like "1234567890" or a Workshop URL containing "?id=".' };
	});

	const vdfText = $derived.by(() => buildWorkshopVdf(form, tagsList));

	const steamCmdSnippet = $derived.by(() => {
		const vdfPath = String(form.vdfPath || "workshopitem.vdf").trim() || "workshopitem.vdf";
		return `steamcmd +login <steam_username> +workshop_build_item "${vdfPath}" +quit`;
	});

	function escapeVdf(value) {
		return String(value ?? "")
			.replace(/\\/g, "\\\\")
			.replace(/\"/g, '\\\"')
			.replace(/\r\n/g, "\\n")
			.replace(/\n/g, "\\n")
			.replace(/\r/g, "\\n");
	}

	function vdfLine(key, value, indent = "\t") {
		return `${indent}"${key}"\t\t"${escapeVdf(value)}"`;
	}

	function buildWorkshopVdf(state, tags) {
		const lines = ['"workshopitem"', "{"];
		lines.push(vdfLine("appid", state.appid || "8930"));
		lines.push(vdfLine("publishedfileid", state.publishedfileid || "0"));
		lines.push(vdfLine("contentfolder", state.contentfolder || ""));
		lines.push(vdfLine("previewfile", state.previewfile || ""));
		lines.push(vdfLine("visibility", state.visibility || "0"));
		lines.push(vdfLine("title", state.title || ""));
		lines.push(vdfLine("description", state.description || ""));
		lines.push(vdfLine("changenote", state.changenote || ""));

		if (tags.length) {
			lines.push('\t\"tags\"');
			lines.push("\t{");
			tags.forEach((tag, index) => {
				lines.push(vdfLine(String(index), tag, "\t\t"));
			});
			lines.push("\t}");
		}

		lines.push("}");
		return lines.join("\n");
	}

	async function copyVdf() {
		if (typeof navigator === "undefined" || !navigator.clipboard) {
			copyStatus = "Clipboard API unavailable in this browser.";
			return;
		}
		try {
			await navigator.clipboard.writeText(vdfText);
			copyStatus = "VDF copied.";
		} catch {
			copyStatus = "Unable to copy VDF right now.";
		}

		setTimeout(() => (copyStatus = ""), 2000);
	}

	function downloadVdf() {
		if (typeof document === "undefined") {
			return;
		}
		const blob = new Blob([vdfText], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "workshopitem.vdf";
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function resetForm() {
		form = { ...DEFAULT_STATE };
		copyStatus = "";
	}

	function isCommonTagSelected(tag) {
		const normalized = String(tag || "")
			.trim()
			.toLowerCase();
		if (!normalized) {
			return false;
		}
		return normalizedTags.includes(normalized);
	}

	function toggleCommonTag(tag, enabled) {
		const target = String(tag || "").trim();
		if (!target) {
			return;
		}
		const normalized = target.toLowerCase();
		const next = [...tagsList];
		const existingIndex = next.findIndex((entry) => entry.toLowerCase() === normalized);
		if (enabled && existingIndex < 0) {
			next.push(target);
		}
		if (!enabled && existingIndex >= 0) {
			next.splice(existingIndex, 1);
		}
		form.tags = next.join(", ");
	}

	function extractPublishedFileId(value) {
		const input = String(value || "").trim();
		if (!input) {
			return "";
		}
		const fromQuery = input.match(/[?&]id=(\d+)/i);
		if (fromQuery?.[1]) {
			return fromQuery[1];
		}
		const fromPath = input.match(/filedetails\/\?id=(\d+)/i);
		if (fromPath?.[1]) {
			return fromPath[1];
		}
		return "";
	}
</script>

<section class="workshop-vdf-page">
	<header class="hero workshop-vdf-hero">
		<p class="eyebrow">Steam Workshop Upload Helper</p>
		<h1>Civ V VDF Builder</h1>
		<p>Generate a ready-to-use VDF for "steamcmd +workshop_build_item" without ModBuddy. Set "publishedfileid" to "0" for a new upload.</p>
	</header>

	<div class="workshop-vdf-guide-row">
		<section class="workshop-vdf-guide">
			<h2>How It Works</h2>
			<ol>
				<li>Fill required fields: "title", "description", "contentfolder", "previewfile".</li>
				<li>Use "publishedfileid = 0" to create a new Workshop item, or set your existing ID to update.</li>
				<li>Copy/download the generated "workshopitem.vdf" and save it locally.</li>
				<li>Run the shown "steamcmd" command from your terminal.</li>
			</ol>
		</section>

		<section class="workshop-vdf-guide">
			<h2>Install SteamCMD First</h2>
			<p>
				Install SteamCMD from Valve docs:
				<a href="https://developer.valvesoftware.com/wiki/SteamCMD" target="_blank" rel="noopener noreferrer">developer.valvesoftware.com/wiki/SteamCMD</a>
			</p>
			<ul>
				<li>Windows: extract SteamCMD and run "steamcmd.exe" once.</li>
				<li>macOS/Linux: install/download SteamCMD and run "steamcmd" and login at least once.</li>
				<li>Then use the command shown below with your generated VDF file.</li>
			</ul>
		</section>
	</div>

	<section class="workshop-vdf-panel">
		<div class="workshop-vdf-grid">
			<div class="workshop-vdf-top-row">
				<label>
					App ID
					<input type="text" value={form.appid} oninput={(event) => (form.appid = event.currentTarget.value)} readonly />
					<span class="workshop-vdf-hint">Civilization V is "8930" but can edit manually later if you want for another game, tho.</span>
				</label>
				<label>
					Published File ID
					<input type="text" value={form.publishedfileid} oninput={(event) => (form.publishedfileid = event.currentTarget.value)} />
					<span class="workshop-vdf-hint">"0" creates a new item. Any other numeric ID updates that item.</span>
					<span class="workshop-vdf-hint">For updates, open your Workshop mod page and copy the number from the URL (for example: "...?id=1234567890").</span>
				</label>
				<label>
					Title
					<input type="text" value={form.title} oninput={(event) => (form.title = event.currentTarget.value)} />
					<span class="workshop-vdf-hint">Required. Keep it short and recognizable in Workshop search. This can be changed in Steam after uploading.</span>
				</label>
				<label>
					Visibility
					<select value={form.visibility} onchange={(event) => (form.visibility = event.currentTarget.value)}>
						{#each VISIBILITY_OPTIONS as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<span class="workshop-vdf-hint">Start with "Hidden" for testing, switch to "Public" when ready. This can be changed in Steam after uploading.</span>
				</label>
			</div>

			<div class="workshop-vdf-path-row">
				<section class="workshop-vdf-guide">
					<h2>About “.civ5mod” Files</h2>
					<ul>
						<li>Civ V can load mods from a normal folder in "MODS" if a valid ".modinfo" file is present.</li>
						<li>A ".civ5mod" is typically just a zipped mod package with a different extension.</li>
						<li>Prepare folder > zip contents > rename ".zip" to ".civ5mod".</li>
						<li>Important: keep the ".modinfo" at the package root, not nested inside another top-level folder.</li>
					</ul>
				</section>

				<div class="workshop-vdf-path-fields">
					<label>
						Content Folder (absolute path)
						<input type="text" value={form.contentfolder} placeholder="path/to/your/MyCivMod" oninput={(event) => (form.contentfolder = event.currentTarget.value)} />
						<span class="workshop-vdf-hint">Required. Needs to point to directory containg the .Civ5mod file, not the file itself. Use an absolute local folder path.</span>
					</label>
					<label>
						Preview Image (absolute path)
						<input type="text" value={form.previewfile} placeholder="path/to/your/preview.png" oninput={(event) => (form.previewfile = event.currentTarget.value)} />
						<span class="workshop-vdf-hint">Required. Must be below 1 MB. Use an absolute local image path (PNG/JPG/GIF/WEBP).</span>
					</label>
				</div>
			</div>
			<label class="workshop-vdf-span-2">
				Description
				<textarea rows="6" value={form.description} oninput={(event) => (form.description = event.currentTarget.value)}></textarea>
				<span class="workshop-vdf-hint">Required. Plain text is safest for first upload.</span>
			</label>
			<label class="workshop-vdf-span-2">
				Change Note
				<textarea rows="3" value={form.changenote} oninput={(event) => (form.changenote = event.currentTarget.value)}></textarea>
				<span class="workshop-vdf-hint">Optional, but recommended when updating an existing item.</span>
			</label>
			<label class="workshop-vdf-span-2">
				Tags (comma-separated)
				<input type="text" value={form.tags} placeholder="Civilizations, Map, Balance" oninput={(event) => (form.tags = event.currentTarget.value)} />
				<span class="workshop-vdf-hint">Optional. Commas split tags into Workshop tag entries.</span>
				{#if tagIssues.length}
					<span class="workshop-vdf-hint workshop-vdf-helper workshop-vdf-helper-warn">{tagIssues.join(" ")}</span>
				{/if}
				{#if tagsList.length}
					<span class="workshop-vdf-hint">Parsed tags ({tagsList.length}): {tagsList.join(", ")}</span>
				{/if}
			</label>
			<div class="workshop-vdf-span-2 workshop-vdf-tag-picks">
				<span class="workshop-vdf-label">Common Civ V Tags</span>
				<div class="workshop-vdf-tag-grid" role="group" aria-label="Common workshop tags">
					{#each COMMON_TAG_OPTIONS as option (option)}
						<label class="workshop-vdf-tag-chip">
							<input type="checkbox" checked={isCommonTagSelected(option)} onchange={(event) => toggleCommonTag(option, event.currentTarget.checked)} />
							<span>{option}</span>
						</label>
					{/each}
				</div>
				<span class="workshop-vdf-hint">Checkboxes update the comma-separated tag input above. You can still type tags manually.</span>
			</div>
			<label class="workshop-vdf-span-2">
				VDF file path for command example
				<input type="text" value={form.vdfPath} oninput={(event) => (form.vdfPath = event.currentTarget.value)} />
				<span class="workshop-vdf-hint">Path used only for the sample command shown below. You can rename the VDF file (for example "my-mod-upload.vdf").</span>
			</label>
		</div>

		<div class={`workshop-vdf-preflight ${preflightIssues.length ? "has-issues" : "is-ok"}`}>
			<h2>Required Fields Checklist ({completedRequiredChecks}/{requiredChecks.length})</h2>
			<div class="workshop-vdf-checklist" role="list" aria-label="Required fields status">
				{#each requiredChecks as check (check.id)}
					<span class={`workshop-vdf-check-item ${check.done ? "is-done" : "is-missing"}`} role="listitem">
						{check.done ? "✓" : "•"}
						{check.label}
					</span>
				{/each}
			</div>
			{#if preflightIssues.length}
				<ul>
					{#each preflightIssues as issue (issue)}
						<li>{issue}</li>
					{/each}
				</ul>
			{:else}
				<p>All required fields are set.</p>
			{/if}
		</div>

		<div class="workshop-vdf-actions">
			<span class="workshop-vdf-tooltip-wrap">
				<button type="button" onclick={downloadVdf} disabled={completedRequiredChecks !== requiredChecks.length} style="padding-inline: 5rem">Download VDF</button>
				{#if completedRequiredChecks !== requiredChecks.length}
					<span class="workshop-vdf-tooltip">Complete all required fields in the checklist before downloading.</span>
				{/if}
			</span>
			<!-- <button type="button" class="ghost" onclick={resetForm}>Reset</button> -->
		</div>

		<div class="workshop-vdf-output">
			<div class="workshop-vdf-output-head">
				<h2>Generated "workshopitem.vdf"</h2>
				{#if copyStatus}
					<p class="workshop-vdf-status">{copyStatus}</p>
				{/if}
			</div>
			<div class="workshop-vdf-pre-wrap">
				<button type="button" class="workshop-vdf-copy-icon-button" onclick={copyVdf} aria-label="Copy VDF" title="Copy VDF">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" aria-hidden="true">
						<path
							d="M480 400L288 400C279.2 400 272 392.8 272 384L272 128C272 119.2 279.2 112 288 112L421.5 112C425.7 112 429.8 113.7 432.8 116.7L491.3 175.2C494.3 178.2 496 182.3 496 186.5L496 384C496 392.8 488.8 400 480 400zM288 448L480 448C515.3 448 544 419.3 544 384L544 186.5C544 169.5 537.3 153.2 525.3 141.2L466.7 82.7C454.7 70.7 438.5 64 421.5 64L288 64C252.7 64 224 92.7 224 128L224 384C224 419.3 252.7 448 288 448zM160 192C124.7 192 96 220.7 96 256L96 512C96 547.3 124.7 576 160 576L352 576C387.3 576 416 547.3 416 512L416 496L368 496L368 512C368 520.8 360.8 528 352 528L160 528C151.2 528 144 520.8 144 512L144 256C144 247.2 151.2 240 160 240L176 240L176 192L160 192z"
						/>
					</svg>
				</button>
				<pre>{vdfText}</pre>
			</div>
		</div>

		<div class="workshop-vdf-output">
			<div class="workshop-vdf-output-head">
				<h2>steamcmd Command</h2>
			</div>
			<pre>{steamCmdSnippet}</pre>
			<span class="workshop-vdf-hint">Your steam_username is not your current name but your login name.</span>
		</div>

		<div class="workshop-vdf-output">
			<div class="workshop-vdf-output-head">
				<h2>Confirm + Wrap Up</h2>
			</div>
			<span class="workshop-vdf-hint"
				>Check your Workshop items on Steam. If succesfull, your new / updated item will be there. Wrap up with uploading your screenshots, description edits, credits list, and changing
				visibility to public. Give me (Coiot) a shoutout if you'd like {"<3"}</span
			>
		</div>
	</section>
</section>

<style>
	.workshop-vdf-page {
		display: grid;
		gap: 1rem;
	}

	.workshop-vdf-guide-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.workshop-vdf-path-row {
		grid-column: span 2;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.workshop-vdf-path-fields {
		display: grid;
		gap: 0.8rem;
	}

	.workshop-vdf-path-fields label {
		display: grid;
		gap: 0.5rem;
		font-size: 0.84rem;
		color: var(--muted-ink);
	}

	.workshop-vdf-guide {
		display: grid;
		gap: 0.6rem;
		padding: 1rem 1.1rem;
		border-radius: 0.9rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 74%, transparent);
		background: color-mix(in oklch, var(--panel-bg) 92%, var(--accent) 4%);
	}

	.workshop-vdf-guide h2 {
		margin: 0;
		font-size: 0.95rem;
		font-family: "Rockwell", "Palatino Linotype", serif;
	}

	.workshop-vdf-guide ol {
		margin: 0;
		padding-inline-start: 1.1rem;
		display: grid;
		gap: 0.5rem;
		color: var(--muted-ink);
		font-size: 0.82rem;
	}

	.workshop-vdf-guide p {
		margin: 0;
		font-size: 0.82rem;
		color: var(--muted-ink);
	}

	.workshop-vdf-guide ul {
		margin: 0;
		padding-inline-start: 1.1rem;
		display: grid;
		gap: 0.5rem;
		color: var(--muted-ink);
		font-size: 0.82rem;
	}

	.workshop-vdf-hero {
		background: var(--panel-bg);
		border-color: color-mix(in oklch, var(--accent) 16%, var(--panel-border));
	}

	.workshop-vdf-panel {
		display: grid;
		gap: 1rem;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--panel-border) 78%, transparent);
		border-radius: 1rem;
		padding: 1rem;
		box-shadow: 0 10px 26px var(--shadow-soft);
	}

	.workshop-vdf-preflight {
		display: grid;
		gap: 0.5rem;
		padding: 0.9rem 1rem;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 70%, transparent);
		background: color-mix(in oklch, var(--panel-bg) 90%, var(--control-bg) 10%);
	}

	.workshop-vdf-preflight h2 {
		margin: 0;
		font-size: 0.9rem;
	}

	.workshop-vdf-preflight ul,
	.workshop-vdf-preflight p {
		margin: 0;
		font-size: 0.8rem;
		color: var(--muted-ink);
	}

	.workshop-vdf-preflight ul {
		padding-inline-start: 1rem;
		display: grid;
		gap: 0.5rem;
	}

	.workshop-vdf-preflight.has-issues {
		border-color: color-mix(in oklch, oklch(0.7 0.18 30) 48%, var(--panel-border));
	}

	.workshop-vdf-preflight.is-ok {
		border-color: color-mix(in oklch, oklch(0.74 0.16 150) 46%, var(--panel-border));
	}

	.workshop-vdf-mode {
		padding-block-start: 0.5rem;
	}

	.workshop-vdf-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
	}

	.workshop-vdf-top-row {
		grid-column: span 2;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.8rem;
		align-items: flex-start;
	}

	.workshop-vdf-grid label:not(.workshop-vdf-tag-chip) {
		display: grid;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--muted-ink);
	}

	.workshop-vdf-checklist {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.workshop-vdf-check-item {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.55rem;
		border-radius: 999px;
		font-size: 0.75rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 80%, transparent);
	}

	.workshop-vdf-check-item.is-done {
		background: color-mix(in oklch, oklch(0.74 0.16 150) 20%, var(--panel-bg));
		color: var(--ink);
	}

	.workshop-vdf-check-item.is-missing {
		background: color-mix(in oklch, oklch(0.7 0.18 30) 10%, var(--panel-bg));
		color: var(--muted-ink);
	}

	.workshop-vdf-label {
		font-size: 0.85rem;
		color: var(--muted-ink);
	}

	.workshop-vdf-hint {
		font-size: 0.75rem;
		line-height: 1.3;
		color: color-mix(in oklch, var(--muted-ink) 88%, var(--ink) 12%);
	}

	.workshop-vdf-helper {
		padding: 0.5rem;
		border-radius: 0.55rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 78%, transparent);
		background: color-mix(in oklch, var(--control-bg) 85%, var(--panel-bg) 15%);
	}

	.workshop-vdf-helper-ok {
		border-color: color-mix(in oklch, oklch(0.74 0.16 150) 46%, var(--panel-border));
	}

	.workshop-vdf-helper-warn {
		border-color: color-mix(in oklch, oklch(0.7 0.18 30) 48%, var(--panel-border));
	}

	.workshop-vdf-mini-button {
		justify-self: start;
		font: inherit;
		font-size: 0.75rem;
		color: var(--ink);
		background: color-mix(in oklch, var(--control-bg) 90%, var(--panel-bg) 10%);
		border: 1px solid color-mix(in oklch, var(--panel-border) 82%, transparent);
		border-radius: 0.5rem;
		padding: 0.35rem 0.55rem;
		cursor: pointer;
	}

	.workshop-vdf-tag-picks {
		display: grid;
		gap: 0.5rem;
	}

	.workshop-vdf-tag-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.5rem;
	}

	.workshop-vdf-grid .workshop-vdf-tag-chip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.6rem;
		border-radius: 0.55rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 80%, transparent);
		background: color-mix(in oklch, var(--control-bg) 86%, var(--panel-bg) 14%);
		cursor: pointer;
	}

	.workshop-vdf-tag-chip input[type="checkbox"] {
		margin: 0;
	}

	.workshop-vdf-tag-chip span {
		font-size: 0.79rem;
		color: var(--ink);
	}

	.workshop-vdf-grid input:not([type="checkbox"]):not([type="radio"]),
	.workshop-vdf-grid select,
	.workshop-vdf-grid textarea {
		inline-size: 100%;
		font: inherit;
		color: var(--ink);
		background: var(--input-bg);
		border: 1px solid var(--panel-border);
		border-radius: 0.6rem;
		padding-block: 0.48rem;
		padding-inline: 0.58rem;
	}

	.workshop-vdf-grid textarea {
		resize: vertical;
	}

	.workshop-vdf-span-2 {
		grid-column: span 2;
	}

	.workshop-vdf-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.workshop-vdf-actions button {
		font: inherit;
		color: var(--ink);
		background: linear-gradient(145deg, var(--accent), var(--accent-strong));
		border: 1px solid color-mix(in oklch, var(--accent) 56%, var(--panel-border));
		border-radius: 0.62rem;
		padding-block: 0.44rem;
		padding-inline: 0.76rem;
		cursor: pointer;
	}

	.workshop-vdf-actions button:disabled {
		cursor: not-allowed;
		color: color-mix(in oklch, var(--muted-ink) 88%, var(--ink) 12%);
		background: color-mix(in oklch, var(--control-bg) 92%, var(--panel-bg) 8%);
		border-color: color-mix(in oklch, var(--panel-border) 86%, transparent);
		box-shadow: none;
	}

	.workshop-vdf-actions button.ghost {
		background: var(--control-bg);
	}

	.workshop-vdf-tooltip-wrap {
		position: relative;
		display: inline-flex;
	}

	.workshop-vdf-tooltip {
		position: absolute;
		inset-block-end: calc(100% + 0.4rem);
		inset-inline-start: 50%;
		transform: translateX(-50%);
		inline-size: max-content;
		max-inline-size: 20rem;
		padding: 0.45rem 0.55rem;
		border-radius: 0.45rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 82%, transparent);
		background: color-mix(in oklch, var(--panel-bg) 92%, var(--control-bg) 8%);
		color: var(--ink);
		font-size: 0.73rem;
		line-height: 1.25;
		opacity: 0;
		pointer-events: none;
		transition: opacity 120ms ease;
		z-index: 4;
	}

	.workshop-vdf-tooltip::after {
		content: "";
		position: absolute;
		inset-block-start: 100%;
		inset-inline-start: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-block-start-color: color-mix(in oklch, var(--panel-border) 82%, transparent);
	}

	.workshop-vdf-tooltip-wrap:hover .workshop-vdf-tooltip {
		opacity: 1;
	}

	.workshop-vdf-status {
		margin: 0;
		color: color-mix(in oklch, var(--accent) 70%, var(--ink));
		font-size: 0.84rem;
	}

	.workshop-vdf-output {
		display: grid;
		gap: 0.6rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 78%, transparent);
		border-radius: 0.8rem;
		padding: 0.9rem;
		background: color-mix(in oklch, var(--panel-bg) 90%, var(--control-bg) 10%);
	}

	.workshop-vdf-output-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.workshop-vdf-output h2 {
		margin: 0;
		font-size: 0.95rem;
		font-family: "Rockwell", "Palatino Linotype", serif;
		color: var(--ink);
	}

	.workshop-vdf-output pre {
		margin: 0;
		padding: 0.68rem;
		border-radius: 0.65rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, transparent);
		background: color-mix(in oklch, var(--input-bg) 88%, black 12%);
		color: var(--ink);
		overflow: auto;
		white-space: pre;
		font-size: 0.79rem;
		line-height: 1.35;
		font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;
	}

	.workshop-vdf-pre-wrap {
		position: relative;
	}

	.workshop-vdf-copy-icon-button {
		position: absolute;
		inset-block-start: 0.55rem;
		inset-inline-end: 0.55rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.85rem;
		block-size: 1.85rem;
		border-radius: 0.5rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 78%, transparent);
		background: color-mix(in oklch, var(--panel-bg) 88%, var(--control-bg) 12%);
		color: var(--ink);
		cursor: pointer;
		z-index: 2;
	}

	.workshop-vdf-copy-icon-button:hover {
		background: color-mix(in oklch, var(--control-bg) 86%, var(--panel-bg) 14%);
	}

	.workshop-vdf-copy-icon-button svg {
		inline-size: 0.95rem;
		block-size: 0.95rem;
		fill: currentColor;
	}

	@media (max-width: 900px) {
		.workshop-vdf-guide-row {
			grid-template-columns: 1fr;
		}

		.workshop-vdf-path-row {
			grid-column: span 1;
			grid-template-columns: 1fr;
		}

		.workshop-vdf-grid {
			grid-template-columns: 1fr;
		}

		.workshop-vdf-top-row {
			grid-column: span 1;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.workshop-vdf-span-2 {
			grid-column: span 1;
		}
	}

	@media (max-width: 640px) {
		.workshop-vdf-top-row {
			grid-template-columns: 1fr;
		}
	}
</style>
