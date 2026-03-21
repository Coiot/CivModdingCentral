<script>
	import { BUILTIN_MODDED_CIVS, MOD_SUPPORT_LABELS, sortModdedCivsEntries } from "../data/moddedCivsPedia.js";
	import {
		createPediaEntryFromModFolderFiles,
		createPediaEntryFromWikiMarkup,
		normalizePediaEntry,
		renderWikiMarkupFromEntry,
		sanitizePediaProse,
		slugifyPediaValue,
	} from "../utils/moddedCivsPedia.js";

	const STORAGE_KEY = "cmc-modded-civs-pedia-session";

	const TOC_SECTIONS = [
		{ id: "overview", label: "Overview" },
		{ id: "dawn-of-man", label: "Dawn of Man" },
		{ id: "unique-attributes", label: "Unique Attributes" },
		{ id: "name-lists", label: "Lists" },
		{ id: "music", label: "Music" },
		{ id: "mod-support", label: "Mod Support" },
		{ id: "credits", label: "Credits" },
	];

	let searchQuery = "";
	let selectedEntryId = "";
	let activeView = "catalog";
	let importedEntries = restoreSessionEntries();
	let wikiMarkupInput = "";
	let convertedEntry = null;
	let convertedEntrySource = "";
	let converterBusy = false;
	let converterStatus = "";
	let converterIssues = [];
	let folderInputEl;
	let failedImageUrls = [];

	function normalizeSearch(value) {
		return String(value || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	function storageAvailable() {
		return typeof localStorage !== "undefined";
	}

	function saveSessionEntries(entries) {
		if (!storageAvailable()) {
			return;
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	}

	function restoreSessionEntries() {
		if (!storageAvailable()) {
			return [];
		}
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			const parsed = JSON.parse(raw || "[]");
			return Array.isArray(parsed) ? parsed.map((entry) => normalizePediaEntry(entry)) : [];
		} catch {
			return [];
		}
	}

	function entrySearchText(entry) {
		return normalizeSearch(
			[
				entry.title,
				entry.leader,
				entry.summary,
				entry.identity?.culture,
				entry.identity?.capital,
				...(entry.categories || []),
				...(entry.credits || []).map((credit) => `${credit.name} ${credit.role}`),
				...(entry.uniques || []).map((unique) => `${unique.name} ${unique.replaces} ${unique.body} ${(unique.bullets || []).join(" ")}`),
			].join(" "),
		);
	}

	function mergeEntries(entries) {
		const byId = new Map();
		for (const entry of [...BUILTIN_MODDED_CIVS, ...(entries || [])]) {
			const normalized = normalizePediaEntry(entry);
			byId.set(normalized.id, normalized);
		}
		return sortModdedCivsEntries([...byId.values()]);
	}

	$: allEntries = mergeEntries(importedEntries);
	$: normalizedQuery = normalizeSearch(searchQuery);
	$: filteredEntries = normalizedQuery ? allEntries.filter((entry) => entrySearchText(entry).includes(normalizedQuery)) : allEntries;
	$: if (allEntries.length && !allEntries.some((entry) => entry.id === selectedEntryId)) {
		selectedEntryId = "";
	}
	$: selectedEntry = allEntries.find((entry) => entry.id === selectedEntryId) || null;
	$: convertedJsonText = convertedEntry ? JSON.stringify(convertedEntry, null, 2) : "";
	$: convertedWikiText = convertedEntry ? renderWikiMarkupFromEntry(convertedEntry) : "";

	function selectEntry(entryId) {
		selectedEntryId = entryId;
		activeView = "entry";
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	function setConvertedEntry(nextEntry, sourceLabel) {
		convertedEntry = nextEntry ? normalizePediaEntry(nextEntry) : null;
		convertedEntrySource = sourceLabel || "";
		converterIssues = convertedEntry?.issues || [];
	}

	function convertWikiMarkup() {
		const nextEntry = createPediaEntryFromWikiMarkup(wikiMarkupInput);
		setConvertedEntry(nextEntry, "Wiki markup");
		converterStatus = nextEntry?.title ? `Converted ${nextEntry.title} from fandom markup.` : "Wiki conversion finished with warnings.";
	}

	async function handleFolderChange(event) {
		const files = event.currentTarget?.files;
		if (!files?.length) {
			return;
		}
		converterBusy = true;
		converterStatus = "Scanning mod folder...";
		try {
			const nextEntry = await createPediaEntryFromModFolderFiles(files);
			setConvertedEntry(nextEntry, "Mod folder");
			converterStatus = nextEntry?.title ? `Built ${nextEntry.title} from folder contents.` : "Folder conversion finished with warnings.";
		} finally {
			converterBusy = false;
		}
	}

	function triggerFolderImport() {
		folderInputEl?.click();
	}

	async function saveConvertedEntryToProject() {
		if (!convertedEntry) {
			return;
		}

		converterBusy = true;
		converterStatus = "Saving entry files into src/lib/data/modded-civs-pedia...";

		try {
			const response = await fetch("/__local-api/modded-civs-pedia/save", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					slug: slugifyPediaValue(convertedEntry.slug || convertedEntry.title),
					entry: convertedEntry,
					wikiMarkup: convertedWikiText,
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok || !payload?.ok) {
				throw new Error(payload?.message || "Unable to save pedia files.");
			}

			const nextEntries = [...importedEntries.filter((entry) => entry.id !== convertedEntry.id), convertedEntry];
			importedEntries = sortModdedCivsEntries(nextEntries);
			saveSessionEntries(importedEntries);
			selectedEntryId = convertedEntry.id;
			activeView = "entry";
			converterStatus = `${convertedEntry.title} saved to project data and added to the local pedia catalog.`;
		} catch (error) {
			converterStatus = `${error?.message || "Unable to save pedia files."} This save flow only works while running the local Vite dev server.`;
			return;
		} finally {
			converterBusy = false;
		}
	}

	function downloadTextFile(name, content, type) {
		if (typeof document === "undefined" || !content) {
			return;
		}
		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = name;
		link.click();
		URL.revokeObjectURL(url);
	}

	function downloadConvertedJson() {
		if (!convertedEntry) {
			return;
		}
		downloadTextFile(`${slugifyPediaValue(convertedEntry.slug || convertedEntry.title)}.json`, convertedJsonText, "application/json");
	}

	function downloadConvertedWiki() {
		if (!convertedEntry) {
			return;
		}
		downloadTextFile(`${slugifyPediaValue(convertedEntry.slug || convertedEntry.title)}.wiki.txt`, convertedWikiText, "text/plain");
	}

	function supportFlags(entry) {
		return Object.entries(entry?.modSupport || {})
			.filter(([, value]) => value)
			.map(([key]) => MOD_SUPPORT_LABELS[key] || key);
	}

	function hasWorkingImage(url) {
		return Boolean(url) && !failedImageUrls.includes(url);
	}

	function markImageFailed(url) {
		if (!url || failedImageUrls.includes(url)) {
			return;
		}
		failedImageUrls = [...failedImageUrls, url];
	}

	function sourceLinks(entry) {
		return [entry?.source?.wikiUrl ? { label: "Fandom Page", href: entry.source.wikiUrl } : null, entry?.source?.workshopUrl ? { label: "Workshop", href: entry.source.workshopUrl } : null].filter(
			Boolean,
		);
	}

	function entryMediaSlots(entry) {
		const slots = [
			{
				id: "map",
				label: "Map",
				file: entry?.presentation?.mapImage,
				url: entry?.presentation?.mapImageUrl,
				copy: entry?.presentation?.mapImageCaption || "Map image pending.",
			},
			{
				id: "leader",
				label: "Dawn of Man",
				file: entry?.presentation?.leaderSceneImage,
				url: entry?.presentation?.leaderSceneImageUrl,
				copy: entry?.presentation?.leaderSceneArtCredit || "Leader scene pending.",
			},
			{
				id: "icon",
				label: "Icon",
				file: entry?.presentation?.iconImage,
				url: entry?.presentation?.iconImageUrl,
				copy: entry?.presentation?.iconImage ? "Civilization icon asset." : "Icon asset pending.",
			},
		];
		return slots.filter((slot) => slot.file || slot.url);
	}

	function mediaCardClass(slotCount) {
		return slotCount === 1 ? "pedia-media-rail is-single" : "pedia-media-rail";
	}

	function showCatalog() {
		activeView = "catalog";
	}

	function entryDisplaySummary(entry) {
		return sanitizePediaProse(entry?.summary) || sanitizePediaProse(entry?.overview?.civilization?.body) || "No summary yet.";
	}

	function entryInitials(entry) {
		const source = `${entry?.title || ""}`.trim();
		if (!source) {
			return "MC";
		}
		const words = source.split(/\s+/).filter(Boolean);
		return words
			.slice(0, 2)
			.map((word) => word[0])
			.join("")
			.toUpperCase();
	}

	function entryReligionLabel(entry) {
		return entry?.identity?.religion?.join(", ") || "Unknown";
	}

	function infoboxRows(entry) {
		return [
			{ label: "Leader", value: entry?.leader || "Unknown" },
			{ label: "Capital", value: entry?.identity?.capital || "Unknown" },
			{ label: "Empire", value: entry?.identity?.empireName || "Unknown" },
			{ label: "Adjective", value: entry?.identity?.adjectives || "Unknown" },
			{ label: "Bias", value: entry?.identity?.bias || "Unknown" },
			{ label: "Religion", value: entryReligionLabel(entry) },
			{ label: "Government", value: entry?.identity?.government || "Unknown" },
			{ label: "Culture", value: entry?.identity?.culture || "Unknown" },
		];
	}

	function supportMatrix(entry) {
		const keys = [...new Set([...Object.keys(MOD_SUPPORT_LABELS), ...Object.keys(entry?.modSupport || {})])];
		return keys.map((key) => ({
			key,
			label: MOD_SUPPORT_LABELS[key] || key,
			value: Boolean(entry?.modSupport?.[key]),
		}));
	}
</script>

<section class="pedia-page stack">
	<header class="hero pedia-hero">
		<div class="stack half">
			<p class="eyebrow">Reference Database</p>
			<h1>Browse modded civilizations and convert fandom pages or mod folders into pedia entries.</h1>
			<p>Start with built-in sample entries, then grow the catalog by converting fandom markup into structured JSON or scanning civ mod folders directly.</p>
		</div>
	</header>

	<section class="pedia-main">
		{#if activeView === "catalog"}
			<div class="pedia-toolbar">
				<div class="stack quarter">
					<p class="eyebrow">Catalog</p>
					<h2 class="section-title">Modded Civ Entries</h2>
					<p class="section-copy">{filteredEntries.length} visible of {allEntries.length} total entries.</p>
				</div>

				<div class="pedia-toolbar-actions">
					<input class="pedia-search" type="search" bind:value={searchQuery} placeholder="Search civs, leaders, uniques, authors..." />
				</div>
			</div>

			<section class="pedia-catalog-shell stack overflow-hidden" aria-label="Modded civ catalog">
				<div class="pedia-catalog-grid overflow" role="list">
					{#each filteredEntries as entry (entry.id)}
						<button type="button" class="pedia-list-card" onclick={() => selectEntry(entry.id)}>
							<div class="pedia-list-card-top">
								<div class="pedia-list-card-icon">
									{#if hasWorkingImage(entry.presentation?.iconImageUrl)}
										<img
											src={entry.presentation.iconImageUrl}
											alt={`${entry.title} icon`}
											loading="lazy"
											referrerpolicy="no-referrer"
											onerror={() => markImageFailed(entry.presentation.iconImageUrl)}
										/>
									{:else}
										<span>{entryInitials(entry)}</span>
									{/if}
								</div>

								<div class="pedia-list-card-head">
									<h3 class="card-title">{entry.title}</h3>
									<span>{entry.leader}</span>
								</div>
							</div>

							<p class="card-copy">{entryDisplaySummary(entry)}</p>
						</button>
					{/each}
				</div>
			</section>

			<!-- <section class="pedia-converter">
				<div class="pedia-section-head">
					<div class="stack quarter">
						<p class="eyebrow">Converter</p>
						<h2 class="section-title">Fandom Wiki or Mod Folder to Pedia Entry</h2>
					</div>
					<div class="pedia-action-row">
						<button type="button" class="pedia-button" onclick={convertWikiMarkup}>Convert Wiki Markup</button>
						<button type="button" class="pedia-button pedia-button-secondary" onclick={triggerFolderImport} disabled={converterBusy}>Import Mod Folder</button>
						<input bind:this={folderInputEl} class="pedia-hidden-input" type="file" webkitdirectory multiple onchange={handleFolderChange} />
					</div>
				</div>

				<textarea
					class="pedia-markup-input"
					bind:value={wikiMarkupInput}
					rows="16"
					placeholder="Paste fandom wiki markup here. The converter will build site JSON and a regenerated fandom wiki block."
				></textarea>

				{#if converterStatus}
					<p class="pedia-status">{converterStatus}</p>
				{/if}

				{#if convertedEntry}
					<div class="pedia-preview-actions">
						<span class="pedia-preview-kicker">{convertedEntrySource}</span>
						<div class="pedia-action-row">
							<button type="button" class="pedia-button" onclick={saveConvertedEntryToProject} disabled={converterBusy}>Save To Project</button>
							<button type="button" class="pedia-button pedia-button-secondary" onclick={downloadConvertedJson}>Download JSON</button>
							<button type="button" class="pedia-button pedia-button-secondary" onclick={downloadConvertedWiki}>Download Wiki Markup</button>
						</div>
					</div>

					{#if converterIssues.length}
						<div class="pedia-issues">
							<h3 class="card-title">Conversion Notes</h3>
							<ul class="pedia-list-copy">
								{#each converterIssues as issue (issue)}
									<li>{issue}</li>
								{/each}
							</ul>
						</div>
					{/if}

					<div class="pedia-preview-grid">
						<label class="pedia-preview-panel stack half">
							<span class="eyebrow">Pedia JSON</span>
							<textarea rows="18" readonly>{convertedJsonText}</textarea>
						</label>
						<label class="pedia-preview-panel stack half">
							<span class="eyebrow">Fandom Wiki Output</span>
							<textarea rows="18" readonly>{convertedWikiText}</textarea>
						</label>
					</div>
				{/if}
			</section> -->
		{:else if selectedEntry}
			<div class="pedia-entry-toolbar">
				<button type="button" class="pedia-button pedia-button-secondary" onclick={showCatalog}>Back To Catalog</button>
				<div class="pedia-link-row inline half flex-wrap">
					{#each sourceLinks(selectedEntry) as link (link.href)}
						<a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
					{/each}
				</div>
			</div>

			<article class="pedia-wiki">
				<header class="pedia-wiki-header">
					<div class="stack quarter">
						<p class="eyebrow">Entry</p>
						<h2 class="section-title">{selectedEntry.title}</h2>
						<p class="section-copy">{entryDisplaySummary(selectedEntry)}</p>
					</div>
				</header>

				<div class="pedia-wiki-layout">
					<div class="pedia-wiki-main">
						<nav class="pedia-toc" aria-label="Entry sections">
							<strong class="card-title">Contents</strong>
							<ol class="pedia-toc-list">
								{#each TOC_SECTIONS as section (section.id)}
									<li><a href={`#${section.id}`}>{section.label}</a></li>
								{/each}
							</ol>
						</nav>

						<section class="pedia-wiki-section" id="overview">
							<h3 class="section-title">Overview</h3>
							<div class="pedia-copy-grid">
								<article class="pedia-copy-card">
									<strong class="card-title">{selectedEntry.overview.civilization.title || selectedEntry.title}</strong>
									<p class="card-copy">{sanitizePediaProse(selectedEntry.overview.civilization.body) || "No civilization overview yet."}</p>
								</article>
								<article class="pedia-copy-card">
									<strong class="card-title">{selectedEntry.leader}</strong>
									<p class="card-copy">{sanitizePediaProse(selectedEntry.overview.leader.body) || "No leader overview yet."}</p>
								</article>
							</div>
						</section>

						<section class="pedia-wiki-section" id="dawn-of-man">
							<h3 class="section-title">Dawn of Man</h3>
							<div class="pedia-dawn-layout">
								{#if hasWorkingImage(selectedEntry.presentation?.leaderSceneImageUrl)}
									<figure class="pedia-figure-card">
										<img
											src={selectedEntry.presentation.leaderSceneImageUrl}
											alt={`${selectedEntry.title} Dawn of Man art`}
											loading="lazy"
											referrerpolicy="no-referrer"
											onerror={() => markImageFailed(selectedEntry.presentation.leaderSceneImageUrl)}
										/>
										<figcaption>{selectedEntry.presentation.leaderSceneArtCredit || selectedEntry.presentation.leaderSceneImage || "Dawn of Man art"}</figcaption>
									</figure>
								{/if}

								<div class="pedia-copy-card">
									<p class="card-copy">{sanitizePediaProse(selectedEntry.dawnOfMan.blessing) || "No blessing text yet."}</p>
									<p class="card-copy"><strong>Introduction:</strong> {sanitizePediaProse(selectedEntry.dawnOfMan.introduction) || "No introduction text yet."}</p>
									<p class="card-copy"><strong>Defeat:</strong> {sanitizePediaProse(selectedEntry.dawnOfMan.defeat) || "No defeat text yet."}</p>
								</div>
							</div>
						</section>

						<section class="pedia-wiki-section" id="unique-attributes">
							<h3 class="section-title">Unique Attributes</h3>
							<div class="pedia-unique-list">
								{#each selectedEntry.uniques as unique (`${selectedEntry.id}-${unique.name}-${unique.slot}`)}
									<article class="pedia-unique-row">
										<div class="pedia-unique-figure">
											{#if hasWorkingImage(unique.artUrl)}
												<img src={unique.artUrl} alt={`${unique.name} artwork`} loading="lazy" referrerpolicy="no-referrer" onerror={() => markImageFailed(unique.artUrl)} />
											{:else}
												<div class="pedia-media-placeholder text-center">
													<strong>{unique.slot}</strong>
													<span>{unique.art || "Art pending"}</span>
												</div>
											{/if}
										</div>

										<div class="pedia-copy-card">
											<div class="pedia-unique-head">
												<strong class="card-title">{unique.name}</strong>
												<span>{unique.slot}</span>
											</div>
											{#if unique.replaces}
												<p class="card-copy"><strong>Replaces:</strong> {unique.replaces}</p>
											{/if}
											{#if unique.body}
												<p class="card-copy">{sanitizePediaProse(unique.body)}</p>
											{/if}
											{#if unique.bullets.length}
												<ul class="pedia-list-copy">
													{#each unique.bullets as bullet (`${unique.name}-${bullet}`)}
														<li>{sanitizePediaProse(bullet)}</li>
													{/each}
												</ul>
											{/if}
										</div>
									</article>
								{/each}
							</div>
						</section>

						<section class="pedia-wiki-section" id="name-lists">
							<h3 class="section-title">Lists</h3>
							<div class="pedia-name-lists">
								{#each selectedEntry.nameLists as list (`${selectedEntry.id}-${list.title}`)}
									<article class="pedia-list-panel">
										<strong class="card-title">{list.title}</strong>
										<p class="card-copy">{list.items.join(", ") || "No names recorded."}</p>
									</article>
								{/each}
							</div>
						</section>

						<section class="pedia-wiki-section" id="music">
							<h3 class="section-title">Music</h3>
							<div class="pedia-copy-grid">
								<article class="pedia-copy-card">
									<strong class="card-title">Peace Theme</strong>
									<p class="card-copy">{selectedEntry.music.peace.title || "Unknown"}</p>
									<p class="card-copy">{selectedEntry.music.peace.credit || "Credit pending"}</p>
								</article>
								<article class="pedia-copy-card">
									<strong class="card-title">War Theme</strong>
									<p class="card-copy">{selectedEntry.music.war.title || "Unknown"}</p>
									<p class="card-copy">{selectedEntry.music.war.credit || "Credit pending"}</p>
								</article>
							</div>
						</section>

						<section class="pedia-wiki-section" id="mod-support">
							<h3 class="section-title">Mod Support</h3>
							<div class="pedia-support-table" role="table" aria-label="Mod support matrix">
								{#each supportMatrix(selectedEntry) as support (support.key)}
									<div class="pedia-support-row" role="row">
										<strong>{support.label}</strong>
										<span>{support.value ? "Yes" : "No"}</span>
									</div>
								{/each}
							</div>
						</section>

						<section class="pedia-wiki-section" id="credits">
							<h3 class="section-title">Full Credits List</h3>
							<div class="pedia-credit-grid">
								{#each selectedEntry.credits as credit (`${selectedEntry.id}-${credit.name}-${credit.role}`)}
									<article class="pedia-credit-card">
										<strong class="card-title">{credit.name}</strong>
										<p class="card-copy">{credit.role}</p>
									</article>
								{/each}
							</div>
						</section>
					</div>

					<aside class="pedia-infobox" aria-label={`${selectedEntry.title} infobox`}>
						<div class="pedia-infobox-media overflow-hidden">
							{#if hasWorkingImage(selectedEntry.presentation?.mapImageUrl)}
								<img
									src={selectedEntry.presentation.mapImageUrl}
									alt={`${selectedEntry.title} map`}
									loading="lazy"
									referrerpolicy="no-referrer"
									onerror={() => markImageFailed(selectedEntry.presentation.mapImageUrl)}
								/>
							{:else}
								<div class="pedia-media-placeholder text-center">
									<strong>Map</strong>
									<span>{selectedEntry.presentation?.mapImage || "Map pending"}</span>
								</div>
							{/if}
						</div>

						{#if selectedEntry.presentation?.mapImageCaption}
							<p class="card-copy pedia-infobox-caption">{selectedEntry.presentation.mapImageCaption}</p>
						{/if}

						{#if hasWorkingImage(selectedEntry.presentation?.iconImageUrl)}
							<div class="pedia-infobox-icon overflow-hidden">
								<img
									src={selectedEntry.presentation.iconImageUrl}
									alt={`${selectedEntry.title} icon`}
									loading="lazy"
									referrerpolicy="no-referrer"
									onerror={() => markImageFailed(selectedEntry.presentation.iconImageUrl)}
								/>
							</div>
						{/if}

						<div class="pedia-infobox-rows">
							{#each infoboxRows(selectedEntry) as row (row.label)}
								<div class="pedia-infobox-row">
									<strong>{row.label}</strong>
									<span>{row.value}</span>
								</div>
							{/each}
						</div>

						{#if selectedEntry.identity?.requiredContent?.length}
							<div class="pedia-required-note">
								<strong class="card-title">Requires</strong>
								<p class="card-copy">{selectedEntry.identity.requiredContent.join(", ")}</p>
							</div>
						{/if}
					</aside>
				</div>
			</article>
		{/if}
	</section>
</section>

<style>
	.pedia-page {
		--pedia-accent: oklch(0.82 0.078 244);
		--pedia-accent-strong: oklch(0.9 0.04 244);
		--pedia-border: color-mix(in srgb, var(--border-color) 78%, var(--pedia-accent) 22%);
		--pedia-panel: color-mix(in srgb, var(--surface-color) 90%, oklch(0.3 0.04 240) 10%);
		--pedia-panel-soft: color-mix(in srgb, var(--surface-color) 95%, oklch(0.34 0.04 240) 5%);
		--pedia-shadow: 0 14px 32px color-mix(in srgb, black 78%, transparent);
		--pedia-shadow-soft: 0 10px 22px color-mix(in srgb, black 84%, transparent);
		display: grid;
		gap: 1rem;
	}

	.pedia-hero {
		display: grid;
		gap: 1rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pedia-accent) 24%, transparent) 0%, transparent 42%),
			linear-gradient(135deg, color-mix(in srgb, var(--pedia-panel) 96%, black 4%) 0%, color-mix(in srgb, var(--pedia-panel) 92%, var(--pedia-accent) 8%) 100%);
		box-shadow: var(--pedia-shadow);
		border: 1px solid var(--pedia-border);
	}

	.pedia-hero-metrics {
		display: grid;
		gap: 0.9rem;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.pedia-hero-metric,
	.pedia-toolbar,
	.pedia-converter,
	.pedia-catalog-shell,
	.pedia-wiki {
		display: grid;
		gap: 1rem;
		background: var(--pedia-panel);
		box-shadow: var(--pedia-shadow);
		border: 1px solid var(--pedia-border);
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-hero-metric strong {
		font-size: 1.45rem;
		font-family: "Rockwell", "Palatino Linotype", serif;
	}

	.pedia-main {
		display: grid;
		gap: 1rem;
		min-inline-size: 0;
	}

	.pedia-toolbar {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
	}

	.pedia-toolbar-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		justify-content: end;
	}

	.pedia-section-head,
	.pedia-list-card-top,
	.pedia-list-card-head,
	.pedia-unique-head,
	.pedia-preview-actions,
	.pedia-action-row {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.75rem;
	}

	.pedia-catalog-shell {
		block-size: 100%;
		max-block-size: 100%;
		overflow: hidden;
	}

	.pedia-catalog-grid {
		display: grid;
		gap: 0.85rem;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		overflow: auto;
		padding-inline-end: 0.25rem;
	}

	.pedia-search,
	.pedia-markup-input,
	.pedia-preview-panel textarea {
		inline-size: 100%;
		color: var(--ink);
		font: inherit;
		background: color-mix(in srgb, var(--input-bg) 90%, black 10%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 28%, var(--border-color));
		border-radius: 0.85rem;
		padding: 0.8rem 0.95rem;
	}

	.pedia-markup-input,
	.pedia-preview-panel textarea {
		max-block-size: 28rem;
		overflow: auto;
		resize: vertical;
	}

	.pedia-link-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pedia-list-card,
	.pedia-list-panel,
	.pedia-credit-card {
		display: grid;
		gap: 0.65rem;
		color: var(--ink);
		text-align: start;
		text-decoration: none;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pedia-accent) 18%, transparent) 0%, transparent 44%),
			linear-gradient(165deg, color-mix(in srgb, var(--pedia-panel-soft) 98%, var(--control-bg)) 0%, color-mix(in srgb, var(--pedia-panel-soft) 93%, #16110f 7%) 100%);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 1rem;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			background 150ms ease,
			box-shadow 150ms ease;
	}

	.pedia-list-card:hover,
	.pedia-credit-card:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--pedia-accent) 34%, var(--border-color));
		box-shadow: 0 12px 24px color-mix(in srgb, black 72%, transparent);
	}

	.pedia-list-card-head span,
	.pedia-unique-head span,
	.pedia-preview-kicker {
		color: var(--pedia-accent-strong);
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-list-card-top {
		align-items: center;
	}

	.pedia-list-card-icon {
		display: grid;
		place-items: center;
		overflow: hidden;
		background: color-mix(in srgb, var(--pedia-panel) 84%, black 16%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 18%, transparent);
		border-radius: 1rem;
	}

	.pedia-list-card-icon {
		inline-size: 3.4rem;
		block-size: 3.4rem;
		flex: 0 0 auto;
	}

	.pedia-list-card-icon img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
	}

	.pedia-list-card-icon span {
		color: var(--pedia-accent-strong);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1rem;
	}

	.pedia-media-placeholder {
		display: grid;
		place-items: center;
		gap: 0.45rem;
		inline-size: 100%;
		block-size: 100%;
		color: var(--pedia-accent-strong);
		text-align: center;
		padding: 1rem;
	}

	.pedia-media-placeholder strong {
		font-family: "Rockwell", "Palatino Linotype", serif;
	}

	.pedia-media-placeholder span {
		color: var(--pedia-accent-strong);
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.pedia-list-copy {
		display: grid;
		gap: 0.45rem;
		padding-inline-start: 1rem;
	}

	.pedia-button {
		color: var(--ink);
		font: inherit;
		font-weight: 700;
		background: color-mix(in srgb, var(--pedia-accent) 18%, var(--control-bg));
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 40%, var(--border-color));
		border-radius: 0.8rem;
		padding: 0.7rem 1rem;
	}

	.pedia-button.pedia-button-secondary {
		background: color-mix(in srgb, var(--pedia-panel) 94%, black 6%);
	}

	.pedia-hidden-input {
		display: none;
	}

	.pedia-status {
		color: var(--pedia-accent-strong);
		margin-block: 0;
	}

	.pedia-issues {
		display: grid;
		gap: 0.65rem;
		background: color-mix(in srgb, var(--pedia-accent) 10%, transparent);
		border: 1px dashed color-mix(in srgb, var(--pedia-accent) 42%, var(--border-color));
		border-radius: 0.9rem;
		padding: 0.9rem;
	}

	.pedia-preview-panel {
		display: grid;
		gap: 0.5rem;
	}

	.pedia-entry-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.pedia-catalog-shell {
		block-size: auto;
		max-block-size: none;
		overflow: visible;
	}

	.pedia-catalog-grid {
		grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
		overflow: visible;
		padding-inline-end: 0;
	}

	.pedia-wiki {
		display: grid;
		gap: 1.25rem;
	}

	.pedia-wiki-layout {
		display: grid;
		gap: 1.25rem;
		grid-template-columns: minmax(0, 1fr) minmax(17rem, 21rem);
		align-items: start;
	}

	.pedia-wiki-main,
	.pedia-wiki-section,
	.pedia-name-lists,
	.pedia-infobox,
	.pedia-infobox-rows,
	.pedia-credit-grid {
		display: grid;
		gap: 1rem;
	}

	.pedia-toc,
	.pedia-copy-card,
	.pedia-list-panel,
	.pedia-credit-card,
	.pedia-infobox,
	.pedia-support-table,
	.pedia-required-note,
	.pedia-figure-card {
		display: grid;
		gap: 0.75rem;
		background: var(--pedia-panel-soft);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-toc {
		/*position: sticky;*/
		inset-block-start: 1rem;
	}

	.pedia-toc-list {
		display: grid;
		gap: 0.45rem;
		padding-inline-start: 1.1rem;
		margin: 0;
	}

	.pedia-copy-grid,
	.pedia-preview-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.pedia-dawn-layout {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr);
		align-items: start;
	}

	.pedia-figure-card {
		margin: 0;
	}

	.pedia-figure-card img {
		inline-size: 100%;
		border-radius: 0.8rem;
		aspect-ratio: 1 / 1.08;
		object-fit: cover;
	}

	.pedia-figure-card figcaption {
		color: var(--muted-ink);
		font-size: 0.88rem;
	}

	.pedia-unique-list {
		display: grid;
		gap: 0.9rem;
	}

	.pedia-unique-row {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(9rem, 12rem) minmax(0, 1fr);
		align-items: start;
	}

	.pedia-unique-figure,
	.pedia-infobox-media,
	.pedia-infobox-icon {
		overflow: hidden;
		background: color-mix(in srgb, var(--pedia-panel) 84%, black 16%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
		border-radius: 1rem;
	}

	.pedia-unique-figure {
		aspect-ratio: 1;
	}

	.pedia-unique-figure img,
	.pedia-infobox-media img,
	.pedia-infobox-icon img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
	}

	.pedia-infobox {
		position: sticky;
		inset-block-start: 1rem;
	}

	.pedia-infobox-media {
		min-block-size: 13rem;
	}

	.pedia-infobox-icon {
		inline-size: 7.25rem;
		block-size: 7.25rem;
	}

	.pedia-infobox-caption {
		margin-block: 0;
	}

	.pedia-infobox-row,
	.pedia-support-row {
		display: grid;
		gap: 0.4rem;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		padding-block: 0.55rem;
		border-block-end: 1px solid color-mix(in srgb, var(--pedia-accent) 12%, var(--border-color));
	}

	.pedia-infobox-row:last-child,
	.pedia-support-row:last-child {
		padding-block-end: 0;
		border-block-end: 0;
	}

	.pedia-infobox-row strong,
	.pedia-support-row strong {
		color: var(--pedia-accent-strong);
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-infobox-row span,
	.pedia-support-row span {
		color: var(--muted-ink);
		text-align: end;
	}

	.pedia-support-table {
		padding-block: 0.5rem;
	}

	@media (max-width: 1100px) {
		.pedia-preview-grid,
		.pedia-copy-grid,
		.pedia-dawn-layout,
		.pedia-wiki-layout,
		.pedia-unique-row {
			grid-template-columns: 1fr;
		}

		.pedia-hero-metrics {
			grid-template-columns: 1fr;
		}

		.pedia-toc,
		.pedia-infobox {
			position: static;
		}
	}

	@media (max-width: 720px) {
		.pedia-entry-toolbar,
		.pedia-section-head,
		.pedia-toolbar-actions,
		.pedia-preview-actions,
		.pedia-action-row {
			flex-direction: column;
		}

		.pedia-catalog-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
