<svelte:options runes={true} />

<script>
	import { onMount, tick } from "svelte";
	import HelpfulLinksPanel from "./HelpfulLinksPanel.svelte";
	import religionSupportData from "../data/religion-support.json";

	const numberFormatter = new Intl.NumberFormat("en-US");
	const PACKS = religionSupportData.packs || [];
	const schemaHref = (table, tab = "rows") => `/schema-browser?table=${encodeURIComponent(table)}&tab=${encodeURIComponent(tab)}`;
	const luaHref = (entryId, dataset = "gameEvents") => `/lua-api-explorer?${new URLSearchParams({ dataset, entry: entryId }).toString()}`;
	const RELIGION_RELATED_TOOLS = [
		{
			label: "Religions Table",
			description: "Inspect religion rows, IDs, and text-key wiring.",
			href: schemaHref("Religions", "rows"),
		},
		{
			label: "Beliefs Table",
			description: "Cross check belief payload tables when a religion mechanic depends on founder, follower, or holy-city effects.",
			href: schemaHref("Beliefs", "rows"),
		},
		{
			label: "ReligionFounded Hook",
			description: "Useful Lua event pattern used for founder rewards, holy-city setup, and belief-aware religion logic.",
			href: luaHref("game-event-religionfounded-76"),
		},
		{
			label: "CityConvertsReligion Hook",
			description: "Use this when the mechanic needs to react to city majority religion changes instead of only the founding moment.",
			href: luaHref("game-event-cityconvertsreligion-29"),
		},
		{
			label: "Religion / Belief Pattern",
			description: "Pattern handoff for majority religion gates, dummy buildings, and belief rewards.",
			href: "/pattern-library?pattern=religion-belief-condition-check",
		},
		{
			label: "Text Screen Viewer",
			description: "Quick place to validate localized text output when religion names or pedia strings need UI checking.",
			href: "/text-screen-viewer",
		},
	];

	let searchQuery = $state("");
	let selectedPacks = $state([]);

	const normalizedSearch = $derived(normalizeText(searchQuery));
	const hasPackFilter = $derived(selectedPacks.length > 0);
	const filteredPacks = $derived.by(() =>
		PACKS.map((pack) => ({
			...pack,
			religions: pack.religions.filter((religion) => {
				if (hasPackFilter && !selectedPacks.includes(pack.id)) {
					return false;
				}
				if (!normalizedSearch) {
					return true;
				}
				return matchesReligionSearch(pack, religion, normalizedSearch);
			}),
		})).filter((pack) => pack.religions.length),
	);
	const visibleReligionCount = $derived(filteredPacks.reduce((sum, pack) => sum + pack.religions.length, 0));

	onMount(() => {
		if (typeof window === "undefined") {
			return;
		}

		const handleHashNavigation = async () => {
			const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
			if (!hash) {
				return;
			}

			await tick();
			const target = document.getElementById(hash);
			target?.scrollIntoView({ block: "start", behavior: "smooth" });
		};

		void handleHashNavigation();
		window.addEventListener("hashchange", handleHashNavigation);
		return () => window.removeEventListener("hashchange", handleHashNavigation);
	});

	function clearPackFilters() {
		selectedPacks = [];
	}

	function togglePackFilter(packId) {
		selectedPacks = selectedPacks.includes(packId) ? selectedPacks.filter((entry) => entry !== packId) : [...selectedPacks, packId];
	}

	function matchesReligionSearch(pack, religion, query) {
		const fields = [
			pack.title,
			pack.folderName,
			religion.name,
			religion.type,
			religion.iconAtlas,
			religion.iconString,
			religion.summary,
			religion.civilopedia,
			religion.sourceFile,
			...(religion.iconFiles || []),
		];
		return fields.some((field) => normalizeText(field).includes(query));
	}

	function normalizeText(value) {
		return String(value || "")
			.toLowerCase()
			.replace(/\s+/g, " ")
			.trim();
	}
</script>

<section class="hero religion-hero margin-block-end">
	<div class="hero-copy">
		<p class="eyebrow">Mod Support Reference</p>
		<h1>Religions Support</h1>
		<p>Browse religion choices from Historical Religions and companion packs, grouped by source mod with metadata and pedia text.</p>
	</div>
</section>

<section class="viewer-toolbar panel-surface margin-block-end" aria-label="Religion support controls">
	<label class="search-field stack quarter">
		<span>Search Religions, Packs, Or Text</span>
		<input bind:value={searchQuery} type="search" placeholder="shinto, australia, buddhism, mountain, dream..." />
	</label>

	<div class="toolbar-section">
		<div class="toolbar-section-head">
			<span class="toolbar-label uppercase">Pack Filter</span>
		</div>

		<div class="chip-group inline half flex-wrap" role="list" aria-label="Religion pack filter">
			<button class:selected={!hasPackFilter} type="button" onclick={clearPackFilters}>All packs</button>
			{#each PACKS as pack (pack.id)}
				<button class:selected={selectedPacks.includes(pack.id)} type="button" onclick={() => togglePackFilter(pack.id)}>{pack.title}</button>
			{/each}
		</div>
	</div>

	<p class="toolbar-copy">Showing {numberFormatter.format(visibleReligionCount)} religions across {filteredPacks.length} packs.</p>
</section>

{#if !visibleReligionCount}
	<p class="status">No religions matched that search or pack filter.</p>
{:else}
	<div class="pack-stack">
		{#each filteredPacks as pack (pack.id)}
			<section class="pack-panel panel-surface" id={pack.id} aria-labelledby={`${pack.id}-heading`}>
				<header class="pack-head inline half flex-wrap">
					<div class="pack-heading">
						<p class="eyebrow">Religion Pack</p>
						<h2 id={`${pack.id}-heading`}>{pack.title}</h2>
						<p>{numberFormatter.format(pack.religions.length)} religions · {pack.folderName}</p>
					</div>
				</header>

				<div class="religion-grid">
					{#each pack.religions as religion (religion.id)}
						<article class="religion-card" id={religion.type}>
							<div class="religion-card-head">
								<div class="icon-placeholder" aria-hidden="true">
									<span class="icon-placeholder-circle"></span>
								</div>

								<div class="religion-heading">
									<h3>{religion.name}</h3>
									<code>{religion.type}</code>
								</div>
							</div>

							{#if religion.summary}
								<p class="religion-summary">{religion.summary}</p>
							{/if}

							{#if religion.civilopedia || religion.descriptionKey || religion.civilopediaKey}
								<details class="religion-more">
									<summary>More</summary>

									<div class="detail-row">
										<strong>Description key</strong>
										<code>{religion.descriptionKey}</code>
									</div>
									<div class="detail-row">
										<strong>Pedia key</strong>
										<code>{religion.civilopediaKey}</code>
									</div>
									{#if religion.civilopedia}
										<div class="detail-row detail-row-copy">
											<strong>Civilopedia</strong>
											<p>{religion.civilopedia}</p>
										</div>
									{/if}
								</details>
							{/if}
						</article>
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/if}

<div class="margin-block-start">
	<HelpfulLinksPanel ariaLabel="Related religion support tools" links={RELIGION_RELATED_TOOLS} tone="support" />
</div>

<style>
	.religion-hero {
		display: grid;
		gap: 1rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-support-highlight) 18%, transparent) 0%, transparent 34%),
			linear-gradient(
				135deg,
				color-mix(in oklch, var(--surface-support-panel) 84%, var(--panel-bg) 16%) 0%,
				color-mix(in oklch, var(--surface-support-panel) 72%, var(--surface-support-highlight) 8%) 100%
			);
		border: 1px solid color-mix(in oklch, var(--surface-support-border) 78%, var(--panel-border));
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--surface-support-highlight) 12%, transparent),
			0 8px 20px color-mix(in oklch, var(--shadow-soft) 64%, transparent);
	}

	.panel-surface,
	.religion-card {
		--panel-surface-radius: 0.9rem;
		--panel-surface-border: color-mix(in oklch, var(--surface-support-border) 72%, var(--panel-border));
		--panel-surface-background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-support-highlight) 11%, transparent) 0%, transparent 30%),
			color-mix(in oklch, var(--surface-support-panel) 74%, var(--panel-bg) 26%);
		--panel-surface-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface-support-highlight) 10%, transparent), 0 8px 12px color-mix(in oklch, var(--shadow-soft) 64%, transparent);
	}

	.religion-card {
		border-radius: var(--panel-surface-radius);
		border: 1px solid var(--panel-surface-border);
		background: var(--panel-surface-background);
		box-shadow: var(--panel-surface-shadow);
	}

	.toolbar-copy,
	.pack-heading p,
	.religion-summary,
	.detail-row p {
		color: var(--muted-ink);
	}

	.viewer-toolbar,
	.pack-panel {
		padding: 1.05rem 1rem;
	}

	.viewer-toolbar {
		--viewer-toolbar-gap: 0.8rem;
	}

	.toolbar-section,
	.search-field {
		display: grid;
		gap: 0.4rem;
	}

	.toolbar-section-head {
		--toolbar-section-head-gap: 0.12rem;
	}

	.toolbar-label,
	.search-field span {
		color: color-mix(in oklch, var(--surface-support-highlight-strong) 72%, var(--ink));
	}

	.toolbar-label {
		--toolbar-label-color: color-mix(in oklch, var(--surface-support-highlight-strong) 72%, var(--ink));
	}

	.search-field span {
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}

	.search-field input {
		inline-size: 100%;
		padding: 0.66rem 0.8rem;
		border-radius: 0.78rem;
		border: 1px solid color-mix(in oklch, var(--surface-support-border) 74%, var(--panel-border));
		background: var(--input-bg);
		color: var(--ink);
	}

	.chip-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.chip-group button {
		padding: 0.4rem 0.65rem;
		border-radius: 999px;
		border: 1px solid color-mix(in oklch, var(--surface-support-border) 75%, var(--panel-border));
		background: color-mix(in oklch, var(--control-bg) 84%, var(--panel-bg) 16%);
		color: var(--ink);
		text-decoration: none;
		font-size: 0.74rem;
		line-height: 1.2;
	}

	.chip-group button.selected {
		background: color-mix(in oklch, var(--surface-support-highlight) 25%, var(--control-bg));
		border-color: color-mix(in oklch, var(--surface-support-highlight) 65%, var(--surface-support-border));
	}

	.pack-stack {
		display: grid;
		gap: 0.95rem;
	}

	.pack-head {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		justify-content: space-between;
		align-items: flex-start;
		margin-block-end: 0.9rem;
	}

	.pack-heading {
		display: grid;
		gap: 0.22rem;
	}

	.pack-heading h2,
	.religion-heading h3 {
		margin: 0;
		font-family: "Rockwell", "Palatino Linotype", serif;
	}

	.religion-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: 0.85rem;
	}

	.religion-card {
		padding: 0.9rem;
		display: grid;
		gap: 0.75rem;
	}

	.religion-card-head {
		display: grid;
		grid-template-columns: 4.4rem minmax(0, 1fr);
		gap: 1rem;
		align-items: center;
	}

	.icon-placeholder {
		inline-size: 4.4rem;
		block-size: 4.4rem;
		display: grid;
		place-items: center;
		border-radius: 999px;
		border: 1px dashed color-mix(in oklch, var(--surface-support-highlight) 58%, var(--panel-border));
		background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-support-highlight) 12%, transparent) 0%, transparent 42%), color-mix(in oklch, var(--panel-bg) 86%, black 14%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--surface-support-highlight) 8%, transparent),
			0 4px 8px color-mix(in oklch, var(--shadow-soft) 70%, transparent);
	}

	.icon-placeholder-circle {
		inline-size: 2.1rem;
		block-size: 2.1rem;
		border-radius: 999px;
		background:
			radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--surface-support-highlight-strong) 72%, white 28%) 0%, transparent 34%),
			color-mix(in oklch, var(--surface-support-highlight) 34%, var(--control-bg));
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, white 20%, transparent),
			0 0 0 1px color-mix(in oklch, var(--surface-support-border) 70%, var(--panel-border));
	}

	.religion-heading code,
	.detail-row code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	}

	.religion-heading {
		display: grid;
		gap: 0.15rem;
		min-inline-size: 0;

		& h3 {
			font-size: 1.35rem;
		}

		& code {
			font-size: 1rem;
		}
	}

	.religion-heading code,
	.detail-row code {
		overflow-wrap: anywhere;
		color: var(--surface-support-highlight-strong);
	}

	.religion-summary {
		margin: 0;
		line-height: 1.45;
	}

	.detail-row {
		display: grid;
		gap: 0.32rem;
	}

	.detail-row strong {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.religion-more {
		border-top: 1px dashed color-mix(in oklch, var(--panel-border) 86%, transparent);
		padding-top: 0.35rem;
	}

	.religion-more summary {
		cursor: pointer;
		color: var(--surface-support-highlight);
		font-weight: 600;
	}

	.detail-row-copy p {
		margin: 0;
		white-space: pre-line;
		line-height: 1.5;
	}

	.chip-group button:hover,
	.icon-placeholder:hover {
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--surface-support-highlight) 16%, transparent),
			0 8px 12px color-mix(in oklch, var(--shadow-soft) 80%, transparent);
	}

	@media (max-width: 900px) {
		.pack-head,
		.religion-card-head {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.religion-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
