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
	import { personHighlightStyle } from "../utils/personHighlights.js";

	const PEDIA_BASE_PATH = "/modded-civs-pedia";

	let { routePath = PEDIA_BASE_PATH, navigate = null, canEdit = false } = $props();

	const TOC_SECTIONS = [
		{ id: "overview", label: "Overview" },
		{ id: "dawn-of-man", label: "Dawn of Man" },
		{ id: "unique-attributes", label: "Unique Attributes" },
		{ id: "name-lists", label: "Lists" },
		{ id: "music", label: "Music" },
		{ id: "mod-support", label: "Mod Support" },
		{ id: "credits", label: "Credits" },
		{ id: "more-by-author", label: "More by Author" },
	];

	let searchQuery = $state("");
	let authorFilterName = $state("");
	let selectedEntryId = $state("");
	let activeView = $state("catalog");
	let importedEntries = $state([]);
	let wikiMarkupInput = $state("");
	let convertedEntry = $state(null);
	let convertedEntrySource = $state("");
	let converterBusy = $state(false);
	let converterStatus = $state("");
	let converterIssues = $state([]);
	let entryEditorOpen = $state(false);
	let entryEditorDraft = $state("");
	let entryStatus = $state("");
	let deletedEntryIds = $state([]);
	let folderInputEl = $state();
	let failedImageUrls = $state([]);

	function normalizeSearch(value) {
		return String(value || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	function normalizeRoutePath(value) {
		const raw = String(value || "").trim();
		if (!raw) {
			return PEDIA_BASE_PATH;
		}
		const withoutQuery = raw.split("#")[0].split("?")[0] || PEDIA_BASE_PATH;
		return withoutQuery.replace(/\/+$/, "") || PEDIA_BASE_PATH;
	}

	function entrySearchText(entry) {
		return normalizeSearch(
			[
				entry.title,
				entry.leader,
				...(entry.authors || []),
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
		return sortModdedCivsEntries([...byId.values()]).filter((entry) => !deletedEntryIds.includes(entry.id));
	}

	function isAuthorCredit(credit) {
		return /\bauthor\b/i.test(credit?.role || "");
	}

	function entryAuthors(entry) {
		const explicitAuthors = (entry?.authors || []).map((author) => String(author || "").trim()).filter(Boolean);
		if (explicitAuthors.length) {
			return [...new Set(explicitAuthors)];
		}
		const creditAuthors = (entry?.credits || [])
			.filter((credit) => isAuthorCredit(credit))
			.map((credit) => String(credit?.name || "").trim())
			.filter(Boolean);
		if (creditAuthors.length) {
			return [...new Set(creditAuthors)];
		}
		const fallbackCredit = String(entry?.credits?.[0]?.name || "").trim();
		return fallbackCredit ? [fallbackCredit] : ["Unknown Author"];
	}

	function primaryAuthor(entry) {
		return entryAuthors(entry)[0] || "Unknown Author";
	}

	function authorFilterKey(value) {
		return normalizeSearch(value);
	}

	function entryAuthorKey(entry) {
		return entryAuthors(entry).map((author) => authorFilterKey(author));
	}

	function catalogComponent(entry, index) {
		const unique = entry?.uniques?.[index];
		if (!unique) {
			return "—";
		}
		return unique.replaces ? `${unique.name} (${unique.replaces})` : unique.name;
	}

	function catalogUnique(entry, index) {
		return entry?.uniques?.[index] || null;
	}

	function isValidHexColor(value) {
		return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "").trim());
	}

	function catalogRowStyle(entry) {
		const background = entry?.presentation?.colors?.background;
		const accent = entry?.presentation?.colors?.icon;
		const vars = [];
		if (isValidHexColor(background)) {
			vars.push(`--catalog-surface:${background}`);
		}
		if (isValidHexColor(accent)) {
			vars.push(`--catalog-accent:${accent}`);
		}
		return vars.join(";");
	}

	function creditCardStyle(name) {
		return personHighlightStyle(name);
	}

	function creditFilterTarget(entry, credit) {
		const creditName = String(credit?.name || "").trim();
		return entryAuthors(entry).includes(creditName) ? creditName : primaryAuthor(entry);
	}

	function catalogNotes(entry) {
		return sanitizePediaProse(entry?.summary) || entryDisplaySummary(entry);
	}

	function authorEntriesForName(authorName) {
		return allEntries.filter((candidate) => entryAuthors(candidate).includes(authorName)).sort((left, right) => left.title.localeCompare(right.title));
	}

	function proseNeedsDisclosure(value) {
		const text = sanitizePediaProse(value);
		return text.length > 420 || text.split("\n").filter(Boolean).length > 3;
	}

	function proseParagraphs(value) {
		const text = sanitizePediaProse(value).replace(/[\u2028\u2029]/g, "\n");
		return text
			.split(/\n+\s*/)
			.map((paragraph) => cleanParagraph(paragraph))
			.filter(Boolean);
	}

	function cleanParagraph(value) {
		return String(value || "")
			.replace(/[\u2028\u2029]/g, "\n")
			.trim();
	}

	function entryPath(entry) {
		return `${PEDIA_BASE_PATH}/${slugifyPediaValue(entry?.slug || entry?.title)}`;
	}

	function authorPath(name) {
		return `${PEDIA_BASE_PATH}/author/${slugifyPediaValue(name)}`;
	}

	function parseRouteState(pathname) {
		const normalized = normalizeRoutePath(pathname);
		if (normalized === PEDIA_BASE_PATH) {
			return { kind: "catalog", authorSlug: "" };
		}
		if (normalized.startsWith(`${PEDIA_BASE_PATH}/author/`)) {
			return {
				kind: "catalog",
				authorSlug: normalized.slice(`${PEDIA_BASE_PATH}/author/`.length),
			};
		}
		if (normalized.startsWith(`${PEDIA_BASE_PATH}/`)) {
			return {
				kind: "entry",
				entrySlug: normalized.slice(PEDIA_BASE_PATH.length + 1),
			};
		}
		return { kind: "catalog", authorSlug: "" };
	}

	const allEntries = $derived.by(() => mergeEntries(importedEntries));
	const normalizedQuery = $derived(normalizeSearch(searchQuery));
	const activeAuthorFilterKey = $derived(authorFilterKey(authorFilterName));
	const authorLookup = $derived.by(() => {
		const bySlug = new Map();
		for (const entry of allEntries) {
			for (const author of entryAuthors(entry)) {
				const slug = slugifyPediaValue(author);
				if (!bySlug.has(slug)) {
					bySlug.set(slug, author);
				}
			}
		}
		return bySlug;
	});
	const filteredEntries = $derived.by(() =>
		allEntries.filter((entry) => {
			const matchesQuery = !normalizedQuery || entrySearchText(entry).includes(normalizedQuery);
			const matchesAuthor = !activeAuthorFilterKey || entryAuthorKey(entry).includes(activeAuthorFilterKey);
			return matchesQuery && matchesAuthor;
		}),
	);
	const catalogGroups = $derived.by(() =>
		filteredEntries.reduce((groups, entry) => {
			const authors = activeAuthorFilterKey ? entryAuthors(entry).filter((author) => authorFilterKey(author) === activeAuthorFilterKey) : entryAuthors(entry);
			for (const author of authors) {
				if (!groups.has(author)) {
					groups.set(author, []);
				}
				groups.get(author).push(entry);
			}
			return groups;
		}, new Map()),
	);
	const groupedCatalogEntries = $derived.by(() =>
		[...catalogGroups.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([author, entries]) => ({
				author,
				entries: [...entries].sort((left, right) => left.title.localeCompare(right.title)),
			})),
	);
	const selectedEntry = $derived(allEntries.find((entry) => entry.id === selectedEntryId) || null);
	const convertedJsonText = $derived(convertedEntry ? JSON.stringify(convertedEntry, null, 2) : "");
	const convertedWikiText = $derived(convertedEntry ? renderWikiMarkupFromEntry(convertedEntry) : "");
	const routeState = $derived(parseRouteState(routePath));

	$effect(() => {
		if (allEntries.length && !allEntries.some((entry) => entry.id === selectedEntryId)) {
			selectedEntryId = "";
		}
	});

	$effect(() => {
		if (routeState.kind === "entry") {
			const routeEntry = allEntries.find((entry) => slugifyPediaValue(entry?.slug || entry?.title) === routeState.entrySlug);
			if (routeEntry) {
				selectedEntryId = routeEntry.id;
				activeView = "entry";
				authorFilterName = "";
				return;
			}
		}

		activeView = "catalog";
		selectedEntryId = "";
		authorFilterName = routeState.authorSlug ? (authorLookup.get(routeState.authorSlug) ?? "") : "";
	});

	$effect(() => {
		if (!canEdit && activeView === "converter") {
			activeView = "catalog";
		}
	});

	function openEntry(entry, options = {}) {
		if (!entry) {
			return;
		}
		selectedEntryId = entry.id;
		activeView = "entry";
		navigate?.(entryPath(entry), { replace: Boolean(options.replace) });
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	function selectEntry(entryId, options = {}) {
		const entry = allEntries.find((candidate) => candidate.id === entryId);
		if (!entry) {
			return;
		}
		openEntry(entry, options);
	}

	function setConvertedEntry(nextEntry, sourceLabel) {
		convertedEntry = nextEntry ? normalizePediaEntry(nextEntry) : null;
		convertedEntrySource = sourceLabel || "";
		converterIssues = convertedEntry?.issues || [];
	}

	function slugForEntry(entry) {
		return slugifyPediaValue(entry?.slug || entry?.title);
	}

	async function saveEntryToProject(entry, wikiMarkup, successMessage) {
		const response = await fetch("/__local-api/modded-civs-pedia/save", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				slug: slugForEntry(entry),
				entry,
				wikiMarkup,
			}),
		});

		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload?.ok) {
			throw new Error(payload?.message || "Unable to save pedia files.");
		}

		importedEntries = sortModdedCivsEntries([...importedEntries.filter((candidate) => candidate.id !== entry.id), entry]);
		deletedEntryIds = deletedEntryIds.filter((id) => id !== entry.id);
		if (successMessage) {
			entryStatus = successMessage;
		}
		return payload;
	}

	function startEditingEntry(entry) {
		if (!entry) {
			return;
		}
		entryEditorOpen = true;
		entryStatus = "";
		entryEditorDraft = `${JSON.stringify(entry, null, 2)}\n`;
	}

	function stopEditingEntry() {
		entryEditorOpen = false;
		entryEditorDraft = "";
		entryStatus = "";
	}

	function parseEntryEditorDraft() {
		return normalizePediaEntry(JSON.parse(entryEditorDraft || "{}"));
	}

	function previewEditedEntry() {
		try {
			const nextEntry = parseEntryEditorDraft();
			importedEntries = sortModdedCivsEntries([...importedEntries.filter((entry) => entry.id !== selectedEntry.id && entry.id !== nextEntry.id), nextEntry]);
			deletedEntryIds = deletedEntryIds.filter((id) => id !== nextEntry.id);
			entryStatus = `Previewing edits for ${nextEntry.title}.`;
			openEntry(nextEntry, { replace: true });
			entryEditorDraft = `${JSON.stringify(nextEntry, null, 2)}\n`;
		} catch (error) {
			entryStatus = error?.message || "Unable to parse entry JSON.";
		}
	}

	async function saveEditedEntryToProject() {
		try {
			const nextEntry = parseEntryEditorDraft();
			entryStatus = "Saving edited entry...";
			await saveEntryToProject(nextEntry, renderWikiMarkupFromEntry(nextEntry), `${nextEntry.title} saved to project data.`);
			openEntry(nextEntry, { replace: true });
			entryEditorDraft = `${JSON.stringify(nextEntry, null, 2)}\n`;
		} catch (error) {
			entryStatus = `${error?.message || "Unable to save entry."} This save flow only works while running the local Vite dev server.`;
		}
	}

	async function deleteSelectedEntry() {
		if (!selectedEntry) {
			return;
		}
		if (typeof window !== "undefined" && !window.confirm(`Delete ${selectedEntry.title} from src/lib/data/modded-civs-pedia?`)) {
			return;
		}

		entryStatus = "Deleting entry...";

		try {
			const response = await fetch("/__local-api/modded-civs-pedia/delete", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					slug: slugForEntry(selectedEntry),
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok || !payload?.ok) {
				throw new Error(payload?.message || "Unable to delete pedia files.");
			}

			deletedEntryIds = [...new Set([...deletedEntryIds, selectedEntry.id])];
			importedEntries = importedEntries.filter((entry) => entry.id !== selectedEntry.id);
			stopEditingEntry();
			showCatalog();
			entryStatus = `${selectedEntry.title} deleted from project data.`;
		} catch (error) {
			entryStatus = `${error?.message || "Unable to delete entry."} This delete flow only works while running the local Vite dev server.`;
		}
	}

	async function convertWikiMarkup() {
		converterBusy = true;
		converterStatus = "Converting fandom markup...";
		try {
			const nextEntry = await createPediaEntryFromWikiMarkup(wikiMarkupInput);
			setConvertedEntry(nextEntry, "Wiki markup");
			converterStatus = nextEntry?.title ? `Converted ${nextEntry.title} from fandom markup.` : "Wiki conversion finished with warnings.";
		} finally {
			converterBusy = false;
		}
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
			await saveEntryToProject(convertedEntry, convertedWikiText, "");
			openEntry(convertedEntry, { replace: true });
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
		stopEditingEntry();
		activeView = "catalog";
		selectedEntryId = "";
		authorFilterName = "";
		navigate?.(PEDIA_BASE_PATH);
	}

	function showConverter() {
		if (!canEdit) {
			return;
		}
		stopEditingEntry();
		activeView = "converter";
		selectedEntryId = "";
		navigate?.(PEDIA_BASE_PATH);
	}

	function clearAuthorFilter() {
		authorFilterName = "";
		selectedEntryId = "";
		activeView = "catalog";
		searchQuery = "";
		navigate?.(PEDIA_BASE_PATH);
	}

	function filterCatalogByAuthor(name) {
		const nextAuthor = String(name || "").trim();
		if (!nextAuthor) {
			return;
		}
		stopEditingEntry();
		authorFilterName = nextAuthor;
		searchQuery = "";
		activeView = "catalog";
		selectedEntryId = "";
		navigate?.(authorPath(nextAuthor));
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
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
			<p class="eyebrow">Civ Mod Pedia</p>
			<h1>Browse modded civilizations</h1>
			<p>Search a curated list of civs, gameplay mods, and convert your mod folders to add more civs to the catalog.</p>
		</div>
	</header>

	<section class="pedia-main">
		{#if activeView === "catalog"}
			<div class="pedia-toolbar">
				<div class="stack quarter">
					<p class="eyebrow">Catalog</p>
					<h2 class="section-title">Modded Civ Entries</h2>
					<p class="section-copy">{filteredEntries.length} visible of {allEntries.length} total entries.</p>
					{#if authorFilterName}
						<div class="pedia-link-row inline half flex-wrap">
							<button type="button" class="pedia-button pedia-button-secondary" onclick={clearAuthorFilter}>Main author: {authorFilterName || "Unknown"} · Clear</button>
						</div>
					{/if}
				</div>

				<div class="pedia-toolbar-actions">
					<input class="pedia-search" type="search" bind:value={searchQuery} placeholder="Search civs, leaders, uniques, authors..." />
					<!-- {#if canEdit}
						<div class="pedia-view-switch" role="tablist" aria-label="Pedia views">
							<button type="button" class="pedia-view-chip is-active" role="tab" aria-selected="true">Catalog</button>
							<button type="button" class="pedia-view-chip" role="tab" aria-selected="false" onclick={showConverter}>Converter</button>
						</div>
					{/if} -->
				</div>
			</div>

			<section class="pedia-catalog-shell stack overflow-hidden" aria-label="Modded civ catalog">
				<div class="pedia-catalog-groups stack overflow" role="list">
					{#each groupedCatalogEntries as group (group.author)}
						<section class="pedia-catalog-group stack half" aria-label={`Civs by ${group.author}`}>
							<div class="pedia-catalog-group-head">
								<h3 class="section-title">{group.author}</h3>
								<p class="card-copy text-lg">{group.entries.length} mod{group.entries.length === 1 ? "" : "s"}</p>
							</div>

							<div class="pedia-catalog-entry-list stack" role="list">
								{#each group.entries as entry (entry.id)}
									<div role="listitem">
										<button type="button" class="pedia-catalog-row" style={catalogRowStyle(entry)} onclick={() => selectEntry(entry.id)}>
											<div class="pedia-catalog-row-main">
												<div class="pedia-catalog-icon-wrap">
													<div class="pedia-catalog-icon">
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
												</div>

												<div class="pedia-catalog-identity fit-content stack quarter">
													<div class="stack quarter">
														<p class="eyebrow">Civilization</p>
														<h3 class="pedia-catalog-civ-title">{entry.title}</h3>
													</div>
													<div class="pedia-catalog-meta inline half flex-wrap">
														<span class="text-lg"><strong>Leader</strong> <span class="leader-name">{entry.leader || "Unknown"}</span></span>
														{#if entry.capital}
															<span><strong>Capital</strong> {entry.capital}</span>
														{/if}
														<!-- {#if entry.culture}
															<span><strong>Culture</strong> {entry.culture}</span>
														{/if} -->
													</div>
												</div>
											</div>

											<div class="pedia-catalog-row-details">
												<article class="pedia-catalog-detail-card stack quarter">
													<p class="eyebrow">Unique Ability</p>
													<strong class="text-nowrap">{catalogComponent(entry, 0)}</strong>
													{#if catalogUnique(entry, 0)?.body}
														<p class="card-copy">{catalogUnique(entry, 0).body}</p>
													{:else if catalogUnique(entry, 0)?.bullets?.length}
														<ul class="pedia-catalog-bullet-list">
															{#each catalogUnique(entry, 0).bullets as bullet (`${entry.id}-0-${bullet}`)}
																<li>{bullet}</li>
															{/each}
														</ul>
													{/if}
												</article>
												<article class="pedia-catalog-detail-card stack quarter">
													<p class="eyebrow">Unique 1</p>
													<strong class="text-nowrap">{catalogComponent(entry, 1)}</strong>
													{#if catalogUnique(entry, 1)?.body}
														<p class="card-copy">{catalogUnique(entry, 1).body}</p>
													{:else if catalogUnique(entry, 1)?.bullets?.length}
														<ul class="pedia-catalog-bullet-list">
															{#each catalogUnique(entry, 1).bullets as bullet (`${entry.id}-1-${bullet}`)}
																<li>{bullet}</li>
															{/each}
														</ul>
													{/if}
												</article>
												<article class="pedia-catalog-detail-card stack quarter">
													<p class="eyebrow">Unique 2</p>
													<strong class="text-nowrap">{catalogComponent(entry, 2)}</strong>
													{#if catalogUnique(entry, 2)?.body}
														<p class="card-copy">{catalogUnique(entry, 2).body}</p>
													{:else if catalogUnique(entry, 2)?.bullets?.length}
														<ul class="pedia-catalog-bullet-list">
															{#each catalogUnique(entry, 2).bullets as bullet (`${entry.id}-2-${bullet}`)}
																<li>{bullet}</li>
															{/each}
														</ul>
													{/if}
												</article>
												<article class="pedia-catalog-detail-card pedia-catalog-notes-card stack quarter">
													<p class="eyebrow">summary</p>
													<p class="card-copy">{entry.summary}</p>
												</article>
												{#if entry.notes}
													<article class="pedia-catalog-detail-card pedia-catalog-notes-card stack quarter">
														<p class="eyebrow">Notes</p>
														<p class="card-copy">{entry.notes}</p>
													</article>
												{/if}
											</div>
										</button>
									</div>
								{/each}
							</div>
						</section>
					{/each}
				</div>
			</section>
		{:else if activeView === "converter"}
			<div class="pedia-toolbar">
				<div class="stack quarter">
					<p class="eyebrow">Converter</p>
					<h2 class="section-title">Build Pedia Entries</h2>
					<p class="section-copy">Convert fandom markup or scan a mod folder, then save the entry into the database.</p>
				</div>

				<div class="pedia-toolbar-actions">
					<div class="pedia-view-switch" role="tablist" aria-label="Pedia views">
						<button type="button" class="pedia-view-chip" role="tab" aria-selected="false" onclick={showCatalog}>Catalog</button>
						<button type="button" class="pedia-view-chip is-active" role="tab" aria-selected="true">Converter</button>
					</div>
				</div>
			</div>

			<section class="pedia-converter-shell">
				<div class="pedia-converter-grid">
					<section class="pedia-converter-panel pedia-converter-panel-source stack">
						<div class="pedia-section-head">
							<div class="stack quarter">
								<p class="eyebrow">Source</p>
								<h3 class="section-title">Fandom Wiki Markup</h3>
								<p class="section-copy">Paste a full fandom wiki page block here to generate both site JSON and regenerated wiki output.</p>
							</div>
							<div class="pedia-action-row">
								<button type="button" class="pedia-button" onclick={convertWikiMarkup}>Convert Wiki Markup</button>
							</div>
						</div>

						<textarea
							class="pedia-markup-input"
							bind:value={wikiMarkupInput}
							rows="18"
							placeholder="Paste fandom wiki markup here. The converter will build site JSON and a regenerated fandom wiki block."
						></textarea>
					</section>

					<section class="pedia-converter-panel pedia-converter-panel-side stack">
						<div class="pedia-converter-side-card stack half">
							<p class="eyebrow">Folder Import</p>
							<h3 class="section-title">Scan Mod Folder</h3>
							<p class="section-copy">Read civ mod files directly and generate the same pedia entry shape from the folder contents.</p>
							<div class="pedia-action-row">
								<button type="button" class="pedia-button pedia-button-secondary" onclick={triggerFolderImport} disabled={converterBusy}>Import Mod Folder</button>
								<input bind:this={folderInputEl} class="pedia-hidden-input" type="file" webkitdirectory multiple onchange={handleFolderChange} />
							</div>
						</div>

						<div class="pedia-converter-side-card stack half">
							<p class="eyebrow">Workspace</p>
							<h3 class="section-title">Current Output</h3>
							<p class="section-copy">
								{convertedEntry ? `${convertedEntry.title} is ready for review and export.` : "No converted entry yet. Run a wiki or folder conversion to populate the output panels."}
							</p>
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
							{/if}
						</div>
					</section>
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

				{#if convertedEntry}
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
			</section>
		{:else if selectedEntry}
			<div class="pedia-entry-toolbar">
				<button type="button" class="pedia-button" onclick={showCatalog}>Back To Catalog</button>
				<div class="pedia-link-row inline half flex-wrap">
					<button type="button" class="pedia-button pedia-button-secondary" onclick={() => startEditingEntry(selectedEntry)}>Edit Entry</button>
					<button type="button" class="pedia-button pedia-button-danger" onclick={deleteSelectedEntry}>Delete Entry</button>
					{#each sourceLinks(selectedEntry) as link (link.href)}
						<a class="pedia-button pedia-button-secondary" href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
					{/each}
				</div>
			</div>

			<article class="pedia-wiki">
				<header class="pedia-wiki-header">
					<div class="inline">
						<div class="civ-icon">
							{#if hasWorkingImage(selectedEntry.presentation?.iconImageUrl)}
								<img
									src={selectedEntry.presentation.iconImageUrl}
									alt={`${selectedEntry.title} icon`}
									loading="lazy"
									referrerpolicy="no-referrer"
									onerror={() => markImageFailed(selectedEntry.presentation.iconImageUrl)}
								/>
							{:else}
								<div class="pedia-media-placeholder">
									<strong>Icon</strong>
									<span>{selectedEntry.presentation?.iconImage || "No icon yet"}</span>
								</div>
							{/if}
						</div>
						<div class="stack quarter">
							<!-- <p class="eyebrow">Entry</p> -->
							<h2 class="section-title">{selectedEntry.title}</h2>
							<p class="section-copy">{entryDisplaySummary(selectedEntry)}</p>
						</div>
					</div>
				</header>

				{#if entryEditorOpen}
					<section class="pedia-editor-panel stack half">
						<div class="inline between flex-wrap half align-start">
							<div class="stack quarter">
								<p class="eyebrow">Entry Editor</p>
								<h3 class="card-title">Edit {selectedEntry.title}</h3>
								<p class="card-copy">Adjust the raw pedia JSON, preview it live, then save it back into the project files.</p>
							</div>
							<div class="inline half flex-wrap">
								<button type="button" class="pedia-button" onclick={previewEditedEntry}>Preview Edits</button>
								<button type="button" class="pedia-button pedia-button-secondary" onclick={saveEditedEntryToProject}>Save Edits</button>
								<button type="button" class="pedia-button pedia-button-secondary" onclick={stopEditingEntry}>Close Editor</button>
							</div>
						</div>
						{#if entryStatus}
							<p class="pedia-status">{entryStatus}</p>
						{/if}
						<label class="stack half">
							<span class="eyebrow">Entry JSON</span>
							<textarea class="pedia-json-editor" bind:value={entryEditorDraft} rows="22" spellcheck="false"></textarea>
						</label>
					</section>
				{/if}

				<div class="pedia-wiki-layout">
					<div class="pedia-wiki-main">
						<!-- <nav class="pedia-toc" aria-label="Entry sections">
							<strong class="card-title">Contents</strong>
							<ol class="pedia-toc-list">
								{#each TOC_SECTIONS as section (section.id)}
									<li><a href={`#${section.id}`}>{section.label}</a></li>
								{/each}
							</ol>
						</nav> -->

						<section class="pedia-wiki-section" id="overview">
							<h3 class="section-title">Overview</h3>
							<div class="pedia-copy-grid">
								<article class="pedia-copy-card">
									<strong class="card-title">{selectedEntry.overview.civilization.title || selectedEntry.title}</strong>
									{#if proseNeedsDisclosure(selectedEntry.overview.civilization.body)}
										<details class="pedia-prose-disclosure">
											<summary class="pedia-prose-summary">
												<span class="card-copy pedia-prose-clamp">{sanitizePediaProse(selectedEntry.overview.civilization.body)}</span>
												<span class="pedia-prose-toggle-row">
													<span class="pedia-prose-toggle-more">More</span>
													<span class="pedia-prose-toggle-less">Less</span>
													<span class="pedia-prose-toggle-icon" aria-hidden="true">▾</span>
												</span>
											</summary>
											<div class="pedia-prose-expanded">
												<div class="pedia-prose-paragraphs">
													{#each proseParagraphs(selectedEntry.overview.civilization.body) as paragraph, index (`${selectedEntry.id}-overview-civ-${index}`)}
														<p class="card-copy">{paragraph}</p>
													{/each}
												</div>
											</div>
										</details>
									{:else}
										<div class="pedia-prose-paragraphs">
											{#if proseParagraphs(selectedEntry.overview.civilization.body).length}
												{#each proseParagraphs(selectedEntry.overview.civilization.body) as paragraph, index (`${selectedEntry.id}-overview-civ-short-${index}`)}
													<p class="card-copy">{paragraph}</p>
												{/each}
											{:else}
												<p class="card-copy">No civilization overview yet.</p>
											{/if}
										</div>
									{/if}
								</article>
								<article class="pedia-copy-card">
									<strong class="card-title">{selectedEntry.leader}</strong>
									{#if proseNeedsDisclosure(selectedEntry.overview.leader.body)}
										<details class="pedia-prose-disclosure">
											<summary class="pedia-prose-summary">
												<span class="card-copy pedia-prose-clamp">{sanitizePediaProse(selectedEntry.overview.leader.body)}</span>
												<span class="pedia-prose-toggle-row">
													<span class="pedia-prose-toggle-more">More</span>
													<span class="pedia-prose-toggle-less">Less</span>
													<span class="pedia-prose-toggle-icon" aria-hidden="true">▾</span>
												</span>
											</summary>
											<div class="pedia-prose-expanded">
												<div class="pedia-prose-paragraphs">
													{#each proseParagraphs(selectedEntry.overview.leader.body) as paragraph, index (`${selectedEntry.id}-overview-leader-${index}`)}
														<p class="card-copy">{paragraph}</p>
													{/each}
												</div>
											</div>
										</details>
									{:else}
										<div class="pedia-prose-paragraphs">
											{#if proseParagraphs(selectedEntry.overview.leader.body).length}
												{#each proseParagraphs(selectedEntry.overview.leader.body) as paragraph, index (`${selectedEntry.id}-overview-leader-short-${index}`)}
													<p class="card-copy">{paragraph}</p>
												{/each}
											{:else}
												<p class="card-copy">No leader overview yet.</p>
											{/if}
										</div>
									{/if}
								</article>
							</div>
						</section>

						<section class="pedia-wiki-section" id="dawn-of-man">
							<h3 class="section-title">Dawn of Man</h3>
							<div class="inline align-start">
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

								<div class="stack">
									{#if proseNeedsDisclosure(selectedEntry.dawnOfMan.blessing)}
										<details class="pedia-prose-disclosure">
											<summary class="pedia-prose-summary">
												<span class="card-copy pedia-prose-clamp">{sanitizePediaProse(selectedEntry.dawnOfMan.blessing)}</span>
												<span class="pedia-prose-toggle-row">
													<span class="pedia-prose-toggle-more">More</span>
													<span class="pedia-prose-toggle-less">Less</span>
													<span class="pedia-prose-toggle-icon" aria-hidden="true">▾</span>
												</span>
											</summary>
											<div class="pedia-prose-expanded">
												<div class="pedia-prose-paragraphs">
													{#each proseParagraphs(selectedEntry.dawnOfMan.blessing) as paragraph, index (`${selectedEntry.id}-dom-${index}`)}
														<p class="card-copy">{paragraph}</p>
													{/each}
												</div>
											</div>
										</details>
									{:else}
										<div class="pedia-prose-paragraphs">
											{#if proseParagraphs(selectedEntry.dawnOfMan.blessing).length}
												{#each proseParagraphs(selectedEntry.dawnOfMan.blessing) as paragraph, index (`${selectedEntry.id}-dom-short-${index}`)}
													<p class="card-copy">{paragraph}</p>
												{/each}
											{:else}
												<p class="card-copy">No blessing text yet.</p>
											{/if}
										</div>
									{/if}
									<p class="card-copy"><strong>Introduction:</strong> {sanitizePediaProse(selectedEntry.dawnOfMan.introduction) || "No introduction text yet."}</p>
									<p class="card-copy"><strong>Defeat:</strong> {sanitizePediaProse(selectedEntry.dawnOfMan.defeat) || "No defeat text yet."}</p>
								</div>
							</div>
						</section>

						<section class="pedia-wiki-section" id="unique-attributes">
							<h3 class="section-title">Unique Attributes</h3>
							<div class="pedia-unique-list margin-block-start">
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
											<div class="pedia-unique-head margin-block-end-half">
												<div class="inline half align-baseline">
													<strong class="card-title text-box-trim">{unique.name}</strong>
													{#if unique.replaces}
														<strong class="card-copy text-box-trim">({unique.replaces})</strong>
													{/if}
												</div>
												<span class="text-box-trim">{unique.slot}</span>
											</div>
											<!-- {#if unique.replaces}
												<p class="card-copy"><strong>Replaces:</strong> {unique.replaces}</p>
											{/if} -->
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
											{#if unique.civilopedia}
												<details class="pedia-unique-pedia">
													<summary class="pedia-unique-pedia-summary">
														<span>Civilopedia</span>
													</summary>
													<div class="pedia-unique-pedia-body">
														{#each proseParagraphs(unique.civilopedia) as paragraph, index (`${selectedEntry.id}-${unique.name}-pedia-${index}`)}
															<p class="card-copy">{paragraph}</p>
														{/each}
													</div>
												</details>
											{/if}
										</div>
									</article>
								{/each}
							</div>
						</section>

						<div class="inline align-start" style="gap: 2rem">
							<section class="pedia-wiki-section" id="name-lists">
								<h3 class="section-title">Lists</h3>
								<div class="pedia-name-lists inline align-start">
									{#each selectedEntry.nameLists as list (`${selectedEntry.id}-${list.title}`)}
										<details class="pedia-list-panel">
											<summary class="pedia-list-panel-summary">
												<strong class="card-title block padding-block-start-quarter">{list.title}</strong>
											</summary>
											<div class="pedia-list-panel-body">
												{#if list.items.length > 0}
													<ol class="pedia-name-list card-copy">
														{#each list.items as item, index (`${selectedEntry.id}-${list.title}-${index}`)}
															<li>{item}</li>
														{/each}
													</ol>
												{:else}
													<p class="card-copy">No names recorded.</p>
												{/if}
											</div>
										</details>
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
									{#each supportMatrix(selectedEntry).filter((support) => support.value) as support (support.key)}
										<div class="pedia-support-row" role="row">
											<strong>{support.label}</strong>
										</div>
									{/each}
								</div>
							</section>
						</div>

						<section class="pedia-wiki-section" id="credits">
							<h3 class="section-title">Credits</h3>
							<div class="pedia-credit-grid">
								{#each selectedEntry.credits as credit (`${selectedEntry.id}-${credit.name}-${credit.role}`)}
									<button
										type="button"
										class="pedia-credit-card pedia-credit-card-button"
										style={creditCardStyle(credit.name)}
										onclick={() => filterCatalogByAuthor(creditFilterTarget(selectedEntry, credit))}
									>
										<strong class="card-title">{credit.name}</strong>
										<p class="card-copy">{credit.role}</p>
									</button>
								{/each}
							</div>
						</section>

						<section class="pedia-wiki-section" id="more-by-author">
							<h3 class="section-title">More by Author</h3>
							<div class="stack half">
								{#each entryAuthors(selectedEntry) as authorName (`${selectedEntry.id}-${authorName}`)}
									<section class="pedia-author-section stack half">
										<div class="inline between flex-wrap half align-baseline">
											<h4 class="card-title">{authorName}</h4>
											<!-- <button type="button" class="pedia-button pedia-button-secondary" onclick={() => filterCatalogByAuthor(authorName)}>
												View {authorName} in Catalog
											</button> -->
										</div>
										<div class="pedia-author-works stack half" role="list">
											{#each authorEntriesForName(authorName) as entry (`${authorName}-${entry.id}`)}
												<div role="listitem">
													<button
														type="button"
														class="pedia-author-work"
														class:is-current={entry.id === selectedEntry.id}
														style={catalogRowStyle(entry)}
														onclick={() => selectEntry(entry.id)}
													>
														<div class="pedia-author-work-icon">
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
														<div class="pedia-author-work-copy stack quarter">
															<div class="inline between flex-wrap half align-start">
																<div class="stack quarter">
																	<div class="inline align-baseline flex-wrap half">
																		<strong class="card-title text-box-trim">{entry.title}</strong>
																		{#if entry.id === selectedEntry.id}
																			<span class="pedia-author-work-pill text-box-trim">Current Entry</span>
																		{/if}
																	</div>
																	<p class="card-copy">{entry.leader || "Unknown leader"}</p>
																</div>
															</div>
															<div class="pedia-author-work-meta inline half flex-wrap">
																<span>{catalogComponent(entry, 0)}</span>
																<span>{catalogComponent(entry, 1)}</span>
																<span>{catalogComponent(entry, 2)}</span>
																{#if entry.capital}
																	<span>Capital: {entry.capital}</span>
																{/if}
															</div>
														</div>
													</button>
												</div>
											{/each}
										</div>
									</section>
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

						<!-- {#if hasWorkingImage(selectedEntry.presentation?.iconImageUrl)}
							<div class="pedia-infobox-icon overflow-hidden">
								<img
									src={selectedEntry.presentation.iconImageUrl}
									alt={`${selectedEntry.title} icon`}
									loading="lazy"
									referrerpolicy="no-referrer"
									onerror={() => markImageFailed(selectedEntry.presentation.iconImageUrl)}
								/>
							</div>
						{/if} -->

						<div class="pedia-infobox-rows">
							{#each infoboxRows(selectedEntry) as row (row.label)}
								<div class="pedia-infobox-row">
									<strong>{row.label}</strong>
									<span>{row.value}</span>
								</div>
							{/each}
						</div>

						<!-- {#if selectedEntry.identity?.requiredContent?.length}
							<div class="pedia-required-note">
								<strong class="card-title">Requires</strong>
								<p class="card-copy">{selectedEntry.identity.requiredContent.join(", ")}</p>
							</div>
						{/if} -->
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
		--pedia-panel: color-mix(in srgb, var(--surface-color) 95%, oklch(0.3 0.04 240) 5%);
		--pedia-panel-soft: color-mix(in srgb, var(--surface-color) 95%, oklch(0.34 0.04 240) 5%);
		--pedia-shadow: 0 14px 32px color-mix(in srgb, black 78%, transparent);
		--pedia-shadow-soft: 0 4px 6px color-mix(in srgb, black 84%, transparent);
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

	.pedia-toolbar,
	.pedia-catalog-shell,
	.pedia-wiki {
		display: grid;
		gap: 1rem;
		background: var(--pedia-panel);
		box-shadow: var(--pedia-shadow);
		border: 1px solid var(--pedia-border);
		border-radius: 1rem;
		padding: 1.5rem;
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

	.pedia-view-switch {
		display: inline-flex;
		gap: 0.35rem;
		padding: 0.3rem;
		background: color-mix(in srgb, var(--pedia-panel-soft) 92%, black 8%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
		border-radius: 999px;
	}

	.pedia-view-chip {
		color: var(--muted-ink);
		font: inherit;
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: transparent;
		border: 0;
		border-radius: 999px;
		padding: 0.55rem 0.9rem;
	}

	.pedia-view-chip.is-active {
		color: var(--ink);
		background: color-mix(in srgb, var(--pedia-accent) 18%, var(--control-bg));
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 36%, var(--border-color)),
			0 4px 10px color-mix(in srgb, black 74%, transparent);
	}

	.pedia-unique-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.75rem;
	}

	.pedia-wiki-header h2 {
		font-size: 2.5rem;
	}

	.pedia-converter-shell {
		display: grid;
		gap: 1rem;
		background: var(--pedia-panel);
		box-shadow: var(--pedia-shadow);
		border: 1px solid var(--pedia-border);
		border-radius: 1rem;
		padding: 1.5rem;
	}

	.pedia-converter-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1.65fr) minmax(20rem, 0.95fr);
		align-items: start;
	}

	.pedia-converter-panel,
	.pedia-converter-side-card,
	.pedia-issues,
	.pedia-preview-panel {
		display: grid;
		gap: 0.85rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pedia-accent) 14%, transparent) 0%, transparent 40%),
			linear-gradient(165deg, color-mix(in srgb, var(--pedia-panel-soft) 98%, var(--control-bg)) 0%, color-mix(in srgb, var(--pedia-panel-soft) 94%, #16110f 8%) 100%);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-converter-panel-side {
		gap: 1rem;
	}

	.pedia-action-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		align-items: center;
	}

	.pedia-hidden-input {
		display: none;
	}

	.pedia-markup-input,
	.pedia-preview-panel textarea,
	.pedia-json-editor {
		inline-size: 100%;
		max-inline-size: 100%;
		min-block-size: 16rem;
		max-block-size: 34rem;
		color: var(--ink);
		font: inherit;
		line-height: 1.55;
		background: color-mix(in srgb, var(--input-bg) 94%, black 6%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 24%, var(--border-color));
		border-radius: 0.95rem;
		padding: 1rem;
		overflow: auto;
		resize: vertical;
	}

	.pedia-preview-actions {
		display: grid;
		gap: 0.75rem;
	}

	.pedia-preview-kicker {
		color: var(--pedia-accent-strong);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-status {
		color: var(--ink);
		background: color-mix(in srgb, var(--pedia-accent) 12%, var(--control-bg));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 20%, var(--border-color));
		border-radius: 0.9rem;
		padding: 0.9rem 1rem;
		margin: 0;
	}

	.pedia-preview-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.pedia-catalog-shell {
		block-size: 100%;
		max-block-size: 100%;
		overflow: hidden;
	}

	.pedia-catalog-groups {
		gap: 1.25rem;
		overflow: auto;
		padding-inline-end: 0.25rem;
	}

	.pedia-catalog-group-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.pedia-catalog-group-head .section-title {
		font-size: 2rem;
	}

	.pedia-catalog-row {
		position: relative;
		--catalog-accent: var(--pedia-accent);
		--catalog-surface: var(--pedia-panel-soft);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: stretch;
		inline-size: 100%;
		padding: 1.1rem;
		color: var(--ink);
		font: inherit;
		text-align: left;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--catalog-accent) 75%, transparent) 0%, transparent 30%),
			linear-gradient(145deg, color-mix(in srgb, var(--catalog-surface) 65%, var(--pedia-panel-soft)) 0%, color-mix(in srgb, var(--catalog-surface) 20%, #16110f) 100%);
		border: 2px solid color-mix(in srgb, var(--catalog-accent) 60%, var(--border-color));
		border-radius: 1.4rem;
		overflow: clip;
		cursor: pointer;
		transition:
			transform 150ms ease,
			background 150ms ease,
			border-color 150ms ease,
			box-shadow 150ms ease;
	}

	.pedia-catalog-row:hover {
		border-color: color-mix(in srgb, var(--catalog-accent) 75%, var(--border-color));
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--catalog-accent) 75%, transparent) 0%, transparent 30%),
			linear-gradient(145deg, color-mix(in srgb, var(--catalog-surface) 85%, var(--pedia-panel-soft)) 0%, color-mix(in srgb, var(--catalog-surface) 14%, #16110f) 100%);
	}

	.pedia-catalog-row-main {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 1rem;
		align-items: center;
		min-inline-size: 0;
	}

	.pedia-catalog-icon-wrap {
		display: grid;
		place-items: center;
	}

	.pedia-catalog-icon {
		display: grid;
		place-items: center;
		inline-size: 8rem;
		block-size: 8rem;
		overflow: clip;
		filter: drop-shadow(2px 2px 3px color-mix(in srgb, var(--catalog-accent) 30%, #000));
	}

	.pedia-catalog-icon img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: contain;
	}

	.pedia-catalog-icon span {
		color: color-mix(in srgb, var(--catalog-accent) 60%, white);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1.35rem;
	}

	.pedia-catalog-civ-title {
		color: color-mix(in srgb, white 95%, var(--catalog-accent));
		font-size: clamp(1.5rem, 2.2vw, 2.25rem);
		line-height: 1.05;
		text-wrap: balance;
		margin: 0;
	}

	.pedia-catalog-meta {
		color: var(--muted-ink);
	}

	.pedia-catalog-meta span {
		margin: 0;
	}

	.pedia-catalog-meta strong {
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		margin-inline-end: 0.35rem;
	}

	.leader-name {
		color: #fff;
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.pedia-catalog-row-details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
		gap: 0.9rem;
		align-items: stretch;
	}

	.pedia-catalog-identity * {
		text-shadow: 2px 2px 3px color-mix(in srgb, var(--catalog-accent) 40%, #000);
	}

	.pedia-catalog-detail-card {
		padding: 0.95rem 1rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--catalog-surface) 10%, var(--pedia-panel)) 0%, color-mix(in srgb, var(--catalog-surface) 10%, #111) 100%);
		box-shadow:
			inset 0 0 0 2px color-mix(in srgb, var(--catalog-accent) 80%, transparent),
			1px 2px 2px color-mix(in srgb, #000 60%, transparent);
		border-radius: 1rem;
	}

	.pedia-catalog-detail-card strong {
		color: color-mix(in srgb, white 95%, var(--ink));
		font-size: 1.125rem;
		line-height: 1.35;
	}

	.pedia-catalog-bullet-list {
		display: grid;
		gap: 0.3rem;
		margin: 0;
		padding-inline-start: 1rem;
	}

	.pedia-catalog-bullet-list li {
		color: var(--muted-ink);
		font-size: 0.92rem;
		line-height: 1.45;
	}

	.pedia-catalog-notes-card {
		min-inline-size: 0;
	}

	.pedia-catalog-notes-card .card-copy {
		margin: 0;
	}

	.pedia-search {
		inline-size: 100%;
		color: var(--ink);
		font: inherit;
		background: color-mix(in srgb, var(--input-bg) 90%, black 10%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 28%, var(--border-color));
		border-radius: 0.85rem;
		padding: 0.8rem 0.95rem;
	}

	.pedia-link-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pedia-credit-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		color: var(--ink);
		text-align: start;
		text-decoration: none;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 30%, transparent) 0%, transparent 45%),
			linear-gradient(165deg, color-mix(in srgb, var(--pedia-panel) 80%, var(--control-bg)) 0%, color-mix(in srgb, var(--pedia-panel-soft) 95%, #16110f 5%) 100%);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 40%, var(--border-color));
		border-radius: 1rem;
		padding: 2rem 1.5rem;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			background 150ms ease,
			box-shadow 150ms ease;
	}

	.pedia-credit-card:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--person-highlight, var(--pedia-accent)) 45%, var(--border-color));
		box-shadow: 0 6px 8px color-mix(in srgb, black 75%, transparent);
	}

	.pedia-unique-head span {
		color: var(--pedia-accent-strong);
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-unique-pedia {
		display: grid;
		gap: 0.7rem;
		margin-block-start: 0.85rem;
		padding-block-start: 0.85rem;
		border-top: 1px solid color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
	}

	/*.pedia-unique-pedia > summary {
		list-style: none;
		background: none;
		padding: 0;
	}*/

	/*.pedia-unique-pedia > summary::-webkit-details-marker {
		display: none;
	}*/

	/*.pedia-unique-pedia > summary::marker {
		content: "";
	}*/

	.pedia-unique-pedia-summary {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		color: var(--pedia-accent-strong);
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.pedia-unique-pedia-body {
		display: grid;
		gap: 0.75rem;
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

	.pedia-prose-disclosure {
		display: grid;
		gap: 0.45rem;
	}

	.pedia-prose-summary {
		display: grid;
		gap: 0.45rem;
		cursor: pointer;
		list-style: none;
		background: none;
		padding-inline-start: 0;
	}

	.pedia-prose-summary::marker {
		display: none;
		content: "";
	}

	.pedia-prose-disclosure[open] .pedia-prose-summary {
		background-image: none;
	}

	.pedia-prose-summary::-webkit-details-marker {
		display: none;
	}

	.pedia-prose-clamp {
		display: -webkit-box;
		overflow: hidden;
		-webkit-line-clamp: 6;
		-webkit-box-orient: vertical;
	}

	.pedia-prose-toggle-row {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		align-self: start;
	}

	.pedia-prose-toggle-more,
	.pedia-prose-toggle-less {
		color: var(--pedia-accent-strong);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.pedia-prose-toggle-less {
		display: none;
	}

	.pedia-prose-toggle-icon {
		color: var(--pedia-accent-strong);
		font-size: 0.9rem;
		line-height: 1;
		transform: translateY(-1px);
		transition: transform 150ms ease;
	}

	.pedia-prose-disclosure[open] .pedia-prose-clamp {
		display: none;
	}

	.pedia-prose-disclosure[open] .pedia-prose-toggle-more {
		display: none;
	}

	.pedia-prose-disclosure[open] .pedia-prose-toggle-less {
		display: inline;
	}

	.pedia-prose-disclosure[open] .pedia-prose-toggle-icon {
		transform: rotate(180deg);
	}

	.pedia-prose-expanded .card-copy {
		margin: 0;
	}

	.pedia-prose-paragraphs {
		display: grid;
		gap: 0.9rem;
	}

	.pedia-prose-paragraphs .card-copy {
		margin: 0;
	}

	.pedia-button {
		color: var(--ink);
		font: inherit;
		font-weight: 700;
		text-decoration: none;
		background: color-mix(in srgb, var(--pedia-accent) 18%, var(--control-bg));
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 40%, var(--border-color));
		border-radius: 0.8rem;
		padding: 0.7rem 1rem;
	}

	.pedia-button.pedia-button-secondary {
		background: color-mix(in srgb, var(--pedia-panel) 94%, black 6%);
	}

	.pedia-button.pedia-button-danger {
		background: color-mix(in srgb, oklch(0.56 0.16 24) 22%, var(--control-bg));
		border-color: color-mix(in srgb, oklch(0.66 0.18 24) 40%, var(--border-color));
	}

	.pedia-entry-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.pedia-editor-panel {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pedia-accent) 18%, transparent) 0%, transparent 42%),
			linear-gradient(165deg, color-mix(in srgb, var(--pedia-panel-soft) 98%, var(--control-bg)) 0%, color-mix(in srgb, var(--pedia-panel-soft) 93%, #16110f 7%) 100%);
		box-shadow: var(--pedia-shadow-soft);
		border: 1px solid color-mix(in srgb, var(--pedia-accent) 14%, var(--border-color));
		border-radius: 1rem;
		padding: 1rem;
	}

	.pedia-catalog-shell {
		block-size: auto;
		max-block-size: none;
		overflow: visible;
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
	.pedia-infobox,
	.pedia-infobox-rows,
	.pedia-credit-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		& .section-title {
			font-size: 1.75rem;
		}
	}

	.pedia-wiki-main {
		gap: 3rem;
	}

	.pedia-credit-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.65rem;
	}

	.pedia-copy-card,
	.pedia-list-panel,
	.pedia-credit-card,
	.pedia-infobox,
	.pedia-support-table,
	.pedia-figure-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		border-radius: 1rem;
		/*padding-block: 1rem;*/

		& .card-title {
			font-size: 1.25rem;
		}
	}

	.pedia-credit-card {
		padding: 0.8rem 0.95rem;
	}

	.pedia-credit-card-button {
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.pedia-credit-card .card-title {
		font-size: 1rem;
		color: color-mix(in srgb, var(--ink) 78%, var(--person-highlight, var(--pedia-accent)) 22%);
	}

	.pedia-credit-card .card-copy {
		font-size: 0.82rem;
	}

	.pedia-author-works {
		gap: 0.7rem;
	}

	.pedia-author-work {
		--catalog-accent: var(--pedia-accent);
		--catalog-surface: var(--pedia-panel-soft);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.85rem;
		align-items: center;
		inline-size: 100%;
		color: var(--ink);
		font: inherit;
		text-align: left;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--catalog-accent) 40%, transparent) 0%, transparent 35%),
			linear-gradient(145deg, color-mix(in srgb, var(--catalog-surface) 65%, var(--pedia-panel)) 0%, color-mix(in srgb, var(--catalog-surface) 20%, #121212) 100%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 35%, var(--border-color));
		border: 0;
		border-radius: 1rem;
		padding: 1.1rem 1rem;
		cursor: pointer;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background 150ms ease;
	}

	.pedia-author-work:hover {
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 60%, var(--border-color)),
			0 4px 6px color-mix(in srgb, black 80%, transparent);
	}

	.pedia-author-work.is-current {
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 28%, var(--border-color)),
			0 0 0 1px color-mix(in srgb, var(--catalog-accent) 18%, transparent);
	}

	.pedia-list-panel-summary {
		cursor: pointer;
		list-style: none;
	}

	.pedia-list-panel-summary::-webkit-details-marker {
		display: none;
	}

	.pedia-author-work-icon {
		display: grid;
		place-items: center;
		inline-size: 5rem;
		block-size: 5rem;
		flex: 0 0 auto;
	}

	.pedia-author-work-icon img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: contain;
		filter: drop-shadow(1px 1px 4px color-mix(in srgb, var(--catalog-accent) 20%, #000));
	}

	.pedia-author-work-icon span {
		color: color-mix(in srgb, var(--catalog-accent) 72%, white);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1rem;
	}

	.pedia-author-work-copy .card-title {
		font-size: 1.25rem;
		text-shadow: 1px 1px 2px color-mix(in srgb, var(--catalog-accent) 40%, #000);
	}

	.pedia-author-work-copy .card-copy {
		margin: 0;
		text-shadow: 1px 1px 2px color-mix(in srgb, var(--catalog-accent) 40%, #000);
	}

	.pedia-author-work-meta {
		color: var(--muted-ink);
		font-size: 0.9rem;
	}

	.pedia-author-work-meta span {
		font-weight: 500;
		text-box: trim-both cap alphabetic;
		text-shadow: 1px 1px 1px #000;
		background: color-mix(in srgb, var(--catalog-accent) 40%, transparent);
		border: 1px solid color-mix(in srgb, var(--catalog-accent) 90%, transparent);
		border-radius: 0.5rem;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--catalog-accent) 12%, transparent);
		padding: 0.4rem 0.5rem;
	}

	.pedia-author-work-pill {
		color: color-mix(in srgb, white 85%, var(--catalog-accent));
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-shadow: 1px 1px 1px color-mix(in srgb, var(--catalog-accent) 20%, #000);
	}

	.pedia-name-list {
		display: grid;
		gap: 0.35rem;
		padding-inline-start: 2rem;
		margin: 0;
	}

	.pedia-copy-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.pedia-figure-card {
		min-inline-size: 40rem;
		margin: 0;
	}

	.pedia-figure-card img {
		inline-size: 100%;
		border-radius: 0.8rem;
		object-fit: contain;
		align-self: flex-start;
	}

	.pedia-figure-card figcaption {
		color: var(--muted-ink);
		font-size: 0.88rem;
	}

	.pedia-unique-list {
		display: grid;
		gap: 1.5rem;
	}

	.pedia-unique-row {
		display: grid;
		gap: 1.5rem;
		grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
		align-items: start;
	}

	.pedia-unique-figure,
	.pedia-infobox-media {
		overflow: hidden;
		/*background: color-mix(in srgb, var(--pedia-panel) 84%, black 16%);*/
		/*box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));*/
		border-radius: 1rem;
	}

	.pedia-unique-figure {
		aspect-ratio: 1;
	}

	.pedia-unique-figure img,
	.pedia-infobox-media img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: contain;
		border-radius: 1.5rem;
		overflow: clip;
	}

	.pedia-infobox {
		position: sticky;
		inset-block-start: 1rem;
		background: color-mix(in srgb, var(--pedia-panel) 84%, black 16%);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent) 16%, var(--border-color));
		padding: 1rem;
	}

	.pedia-infobox-media {
		min-block-size: 13rem;
	}

	.pedia-infobox-caption {
		margin-block: 0;
	}

	.pedia-infobox-row {
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

	.pedia-infobox-row span {
		color: var(--muted-ink);
		text-align: end;
	}

	@media (max-width: 1100px) {
		.pedia-converter-grid,
		.pedia-copy-grid,
		.pedia-wiki-layout,
		.pedia-unique-row {
			grid-template-columns: 1fr;
		}

		.pedia-infobox {
			position: static;
		}

		.pedia-catalog-row {
			grid-template-columns: 1fr;
		}

		.pedia-catalog-row-details {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.pedia-catalog-notes-card {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 720px) {
		.pedia-entry-toolbar,
		.pedia-toolbar-actions {
			flex-direction: column;
		}

		.pedia-view-switch {
			inline-size: 100%;
			justify-content: stretch;
		}

		.pedia-view-chip {
			flex: 1 1 0;
			text-align: center;
		}

		.pedia-preview-grid {
			grid-template-columns: 1fr;
		}

		.pedia-catalog-group-head {
			flex-direction: column;
			align-items: start;
		}

		.pedia-catalog-row {
			padding: 0.95rem;
			gap: 0.85rem;
		}

		.pedia-catalog-row-main {
			grid-template-columns: 1fr;
			justify-items: start;
		}

		.pedia-catalog-icon {
			inline-size: 4.8rem;
			block-size: 4.8rem;
		}

		.pedia-catalog-row-details {
			grid-template-columns: 1fr;
		}
	}
</style>
