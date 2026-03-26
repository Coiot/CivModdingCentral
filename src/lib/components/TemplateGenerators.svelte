<script>
	import ReferenceSurfacePanel from "./ReferenceSurfacePanel.svelte";
	import WizardExamplePreview from "./WizardExamplePreview.svelte";
	import { exampleSupportsLanguage, wizardCards } from "../data/generatorPageData.js";

	let activeSnippetLanguage = $state("all");
	let activeWizardIndex = $state(0);
	let urlSyncReady = $state(false);
	let suppressUrlSync = $state(false);
	let nextUrlSyncMode = $state("replace");

	const activeWizardCard = $derived(wizardCards[activeWizardIndex] || wizardCards[0]);
	const activeWizardReferences = $derived(
		(activeWizardCard?.touchpoints || []).map((touchpoint) => ({
			key: `${touchpoint.href}:${touchpoint.label}`,
			label: touchpoint.label,
			description: touchpoint.note,
			href: touchpoint.href,
			kind: touchpointSurfaceLabel(touchpoint.href),
			surfaceClass: touchpointSurfaceClass(touchpoint.href),
		})),
	);

	function generatorSlug(title) {
		return String(title || "")
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	function getWizardIndexBySlug(slug) {
		if (!slug) {
			return -1;
		}
		return wizardCards.findIndex((card) => generatorSlug(card.title) === slug);
	}

	function syncStateFromUrl(search) {
		const params = new URLSearchParams(search || "");
		const slug = params.get("generator");
		const nextIndex = getWizardIndexBySlug(slug);
		if (nextIndex >= 0) {
			activeWizardIndex = nextIndex;
		}
	}

	function writeWizardUrl(mode = "replace") {
		if (typeof window === "undefined" || !activeWizardCard) {
			return;
		}

		const params = new URLSearchParams(window.location.search);
		params.set("generator", generatorSlug(activeWizardCard.title));

		const query = params.toString();
		const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash || ""}`;
		const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
		if (nextUrl === currentUrl) {
			return;
		}

		const stateMethod = mode === "push" ? "pushState" : "replaceState";
		window.history[stateMethod]({}, "", nextUrl);
	}

	function setActiveWizard(index, options = {}) {
		const nextIndex = Math.max(0, Math.min(index, wizardCards.length - 1));
		nextUrlSyncMode = options.urlMode ?? "push";
		activeWizardIndex = nextIndex;
	}

	function handleWindowPopState() {
		suppressUrlSync = true;
		nextUrlSyncMode = "replace";
		syncStateFromUrl(window.location.search);
	}

	function isTypingTarget(target) {
		return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
	}

	function handleWindowKeyDown(event) {
		if (isTypingTarget(event.target)) {
			return;
		}

		if (event.key === "[") {
			event.preventDefault();
			setActiveWizard(activeWizardIndex - 1);
			return;
		}

		if (event.key === "]") {
			event.preventDefault();
			setActiveWizard(activeWizardIndex + 1);
		}
	}

	function touchpointSurfaceLabel(href) {
		if (href?.startsWith("/pattern-library")) {
			return "Pattern";
		}
		if (href?.startsWith("/template-generators")) {
			return "Generator";
		}
		if (href?.startsWith("/schema-browser")) {
			return "Schema";
		}
		if (href?.startsWith("/lua-api-explorer")) {
			return "Lua API";
		}
		if (href?.startsWith("/workshop-uploader") || href?.startsWith("/modinfo-builder") || href?.startsWith("/civ5mod-ziper")) {
			return "Publish";
		}
		if (href?.startsWith("/dds-converter") || href?.startsWith("/civ-icon-maker") || href?.startsWith("/text-screen-viewer")) {
			return "UI";
		}
		return "Tool";
	}

	function touchpointSurfaceClass(href) {
		if (href?.startsWith("/pattern-library")) {
			return "is-pattern";
		}
		if (href?.startsWith("/template-generators")) {
			return "is-generator";
		}
		if (href?.startsWith("/schema-browser") || href?.startsWith("/modded-civs-pedia")) {
			return "is-schema";
		}
		if (href?.startsWith("/lua-api-explorer")) {
			return "is-lua";
		}
		if (href?.startsWith("/workshop-uploader") || href?.startsWith("/modinfo-builder") || href?.startsWith("/civ5mod-ziper")) {
			return "is-publish";
		}
		if (href?.startsWith("/dds-converter") || href?.startsWith("/civ-icon-maker") || href?.startsWith("/text-screen-viewer")) {
			return "is-ui";
		}
		if (href?.startsWith("/guided-planner")) {
			return "is-planner";
		}
		if (href?.startsWith("/religion-support") || href?.startsWith("/map-viewer")) {
			return "is-support";
		}
		return "is-tool";
	}

	function countLabel(count, singular, plural) {
		return `${count} ${count === 1 ? singular : plural}`;
	}

	$effect(() => {
		if (typeof window === "undefined" || urlSyncReady) {
			return;
		}

		nextUrlSyncMode = "replace";
		syncStateFromUrl(window.location.search);
		urlSyncReady = true;
	});

	$effect(() => {
		if (!urlSyncReady || !activeWizardCard) {
			return;
		}

		if (suppressUrlSync) {
			suppressUrlSync = false;
			return;
		}

		writeWizardUrl(nextUrlSyncMode);
		nextUrlSyncMode = "replace";
	});
</script>

<svelte:window onpopstate={handleWindowPopState} onkeydown={handleWindowKeyDown} />

<section class="wizard-page">
	<header class="hero wizard-hero">
		<p class="eyebrow">Useful Starter + Presets</p>
		<h1>Template Generators</h1>
		<p>Each builder targets one repeatable slice of new setup work, from a new blank civilization to focused follow-ups.</p>
	</header>

	<section class="wizard-panel">
		<div class="wizard-selection-shell stack">
			<div class="wizard-selector wizard-selector--featured" aria-label="Generator backlog">
				<div class="wizard-quick-copy">
					<span class="wizard-kicker uppercase">Generators</span>
					<h2>Choose a Generator to preview and use</h2>
				</div>

				<div class="wizard-quick-grid" role="tablist" aria-label="Generator backlog">
					{#each wizardCards as card, index (card.title)}
						<button
							type="button"
							role="tab"
							aria-selected={activeWizardIndex === index}
							class={`wizard-quick-card wizard-quick-card--button ${activeWizardIndex === index ? "is-active" : ""}`}
							onclick={() => setActiveWizard(index)}
						>
							<div class="wizard-quick-head">
								<h3>{card.title}</h3>
								<span>{card.stage}</span>
							</div>
							<p>{card.copy}</p>
						</button>
					{/each}
				</div>
			</div>
		</div>

		{#if activeWizardCard}
			<div class="wizard-grid wizard-grid--feature">
				<article class="wizard-card wizard-card--active">
					<div class="wizard-card-intro">
						<div class="wizard-card-head">
							<div class="wizard-card-heading">
								<span class="wizard-card-kicker uppercase">Selected Generator</span>
								<h3>{activeWizardCard.title}</h3>
								<p>{activeWizardCard.copy}</p>
							</div>
							<div class="wizard-card-stats inline half flex-wrap" aria-label="Generator metadata">
								<span class="wizard-card-stat">{activeWizardCard.stage}</span>
							</div>
						</div>

						<div class="wizard-brief-grid" aria-label="Generator setup and output summary">
							<section class="wizard-brief-card">
								<h4>Needs</h4>
								<ul class="wizard-brief-list">
									{#each activeWizardCard.asks as ask (ask)}
										<li>{ask}</li>
									{/each}
								</ul>
							</section>

							<section class="wizard-brief-card">
								<h4>Produces</h4>
								<ul class="wizard-brief-list">
									{#each activeWizardCard.outputs as output (output)}
										<li>{output}</li>
									{/each}
								</ul>
							</section>
						</div>
					</div>

					{#if exampleSupportsLanguage(activeWizardCard.example, activeSnippetLanguage)}
						<div class="wizard-block wizard-block--example">
							<WizardExamplePreview example={activeWizardCard.example} activeLanguage={activeSnippetLanguage} />
						</div>
					{/if}

					<section class="wizard-block wizard-block--touchpoints" aria-label="Reference links">
						<ReferenceSurfacePanel title="Generator References" ariaLabel="Generator references" items={activeWizardReferences} tone="schema" />
					</section>
				</article>
			</div>
		{/if}
	</section>
</section>

<style>
	.wizard-page {
		display: grid;
		gap: 1.25rem;
		min-inline-size: 0;
		--wizard-accent-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #6d4bb1 28%);
		--wizard-accent-highlight: #caa6ff;
		--wizard-accent-highlight-strong: #f0e2ff;
		--wizard-accent-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, #261735 10%);
	}

	.wizard-hero {
		background: linear-gradient(145deg, color-mix(in srgb, var(--panel-bg) 82%, black) 0%, color-mix(in srgb, var(--panel-bg) 40%, #261735 40%) 100%);
		border-color: var(--wizard-accent-border);
	}

	.wizard-card p,
	.wizard-quick-card p {
		color: var(--muted-ink);
		line-height: 1.55;
		margin: 0;
	}

	.wizard-quick-card--button > p:first-of-type {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
	}

	.wizard-quick-card--button.is-active p,
	.wizard-quick-card--button:hover p {
		color: color-mix(in oklch, white 72%, var(--muted-ink));
	}

	.wizard-quick-copy p {
		color: var(--muted-ink);
		line-height: 1.55;
		margin: 0;
	}

	.wizard-panel {
		display: grid;
		gap: 1.25rem;
		min-inline-size: 0;
	}

	.wizard-selection-shell {
		display: grid;
		gap: 1rem;
		min-inline-size: 0;
	}

	.wizard-selector {
		display: grid;
		gap: 0.95rem;
		min-inline-size: 0;
		background: color-mix(in oklch, var(--panel-bg) 92%, transparent);
		border: 1px solid color-mix(in oklch, var(--panel-border) 46%, transparent);
		border-radius: 1rem;
		padding-block: 1rem;
		padding-inline: 1.1rem;
	}

	.wizard-selector h2 {
		margin: 0;
	}

	.wizard-selector--featured {
		gap: 1.15rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 86%, #261735 10%) 100%);
		box-shadow: 0 6px 8px color-mix(in oklch, var(--shadow-soft) 80%, transparent);
		border-color: color-mix(in srgb, var(--wizard-accent-border) 58%, var(--panel-border));
		padding: 1.35rem;
	}

	.wizard-selector--featured .wizard-quick-grid {
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		align-items: stretch;
	}

	.wizard-quick-copy {
		display: grid;
		gap: 0.3rem;
	}

	.wizard-quick-copy h2 {
		margin: 0;
	}

	.wizard-quick-head span {
		flex: none;
		color: var(--wizard-accent-highlight-strong);
		white-space: nowrap;
		font-size: 0.72rem;
		font-weight: 700;
		background: color-mix(in srgb, var(--wizard-accent-highlight) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--wizard-accent-highlight) 30%, var(--panel-border));
		border-radius: 999px;
		padding-block: 0.38rem;
		padding-inline: 0.7rem;
	}

	.wizard-kicker {
		color: var(--muted-ink);
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
	}

	.wizard-grid,
	.wizard-quick-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
		min-inline-size: 0;
	}

	.wizard-quick-head {
		min-block-size: 3rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: -0.5rem;

		& h3 {
			font-size: 1.25rem;
			text-box: trim-both cap alphabetic;
		}
	}

	.wizard-card h3,
	.wizard-quick-card h3 {
		margin: 0;
	}

	.wizard-quick-card--button.is-active h3,
	.wizard-quick-card--button:hover h3 {
		color: color-mix(in oklch, white 90%, var(--ink));
	}

	.wizard-grid--feature {
		grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
	}

	.wizard-quick-card,
	.wizard-card {
		display: grid;
		align-content: start;
		gap: 0.85rem;
		background: transparent;
		border: none;
		border-radius: 0;
		border-block-start: 1px solid color-mix(in oklch, var(--panel-border) 36%, transparent);
		padding-block: 1rem;
		padding-inline: 0;
	}

	.wizard-card--active {
		min-inline-size: 0;
		gap: 1.15rem;
		border-block-start: none;
		padding-block: 1.2rem 0.75rem;
	}

	.wizard-card-intro {
		display: grid;
		gap: 1rem;
		min-inline-size: 0;
		background: linear-gradient(180deg, color-mix(in srgb, var(--wizard-accent-panel) 54%, var(--panel-bg) 46%) 0%, color-mix(in srgb, var(--panel-bg) 94%, transparent) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--wizard-accent-highlight) 12%, transparent),
			0 8px 12px color-mix(in oklch, var(--shadow-soft) 80%, transparent);
		border: 1px solid color-mix(in srgb, var(--wizard-accent-highlight) 20%, var(--panel-border));
		border-radius: 1rem;
		padding-inline: 1.1rem;
		padding-block-start: 1.1rem;
		padding-block-end: 1rem;
	}

	.wizard-card-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.75rem;
	}

	.wizard-card-heading {
		max-inline-size: 56rem;
		display: grid;
		gap: 0.5rem;
		min-inline-size: 0;
	}

	.wizard-card-kicker {
		color: var(--wizard-accent-highlight-strong);
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
	}

	.wizard-card-stats {
		display: flex;
		flex-wrap: wrap;
		justify-content: end;
		gap: 0.5rem;
	}

	.wizard-card-stat {
		color: var(--wizard-accent-highlight-strong);
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: color-mix(in srgb, var(--wizard-accent-highlight) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--wizard-accent-highlight) 30%, var(--panel-border));
		border-radius: 999px;
		padding-block: 0.38rem;
		padding-inline: 0.7rem;
	}

	.wizard-brief-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.85rem;
		min-inline-size: 0;
	}

	.wizard-brief-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: color-mix(in srgb, var(--wizard-accent-highlight) 5%, var(--panel-bg) 95%);
		border: 1px solid color-mix(in srgb, var(--wizard-accent-highlight) 14%, var(--panel-border));
		border-radius: 0.9rem;
		box-shadow: 0 4px 8px #111;
		padding-block: 0.95rem;
		padding-inline: 1rem;
	}

	.wizard-brief-card h4 {
		color: var(--wizard-accent-highlight-strong);
		text-transform: uppercase;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		margin: 0;
	}

	.wizard-brief-list {
		display: grid;
		gap: 0.55rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.wizard-brief-list li {
		position: relative;
		color: color-mix(in oklch, white 82%, var(--ink));
		line-height: 1.5;
		padding-inline-start: 1rem;
	}

	.wizard-brief-list li::before {
		position: absolute;
		inset-block-start: 0.55rem;
		inset-inline-start: 0;
		inline-size: 0.38rem;
		block-size: 0.38rem;
		background: var(--wizard-accent-highlight);
		box-shadow: 0 0 0 0.22rem color-mix(in srgb, var(--wizard-accent-highlight) 12%, transparent);
		border-radius: 999px;
		content: "";
	}

	.wizard-block {
		display: grid;
		gap: 0.75rem;
		min-inline-size: 0;
		padding-block: 0.95rem;
		padding-inline: 0;
	}

	.wizard-block--example {
		background: color-mix(in srgb, var(--wizard-accent-panel) 36%, var(--panel-bg) 64%);
		border: 1px solid color-mix(in srgb, var(--wizard-accent-highlight) 18%, var(--panel-border));
		border-radius: 0.9rem;
		padding: 1rem;
	}

	.wizard-card-meta {
		color: var(--muted-ink);
		line-height: 1.4;
		margin: 0;
	}

	.wizard-card--compact {
		align-content: start;
	}

	.wizard-card-meta--muted {
		font-size: 0.86rem;
	}

	.wizard-link {
		color: var(--ink);
		text-decoration-line: underline;
		text-decoration-color: color-mix(in oklch, var(--panel-border) 64%, transparent);
		text-underline-offset: 0.16em;
		font-size: 0.76rem;
		font-weight: 600;
		padding-block: 0.1rem;
		padding-inline: 0;
	}

	.wizard-link:hover {
		color: color-mix(in oklch, white 88%, var(--ink));
	}

	.wizard-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.wizard-list {
		display: grid;
		gap: 0.6rem;
		padding-inline-start: 1.1rem;
		margin: 0;
	}

	.wizard-panel--notes {
		gap: 1rem;
	}

	.wizard-quick-card {
		gap: 0.75rem;
		background: color-mix(in srgb, var(--panel-bg) 94%, transparent);
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--wizard-accent-highlight) 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--wizard-accent-border) 34%, var(--panel-border));
		border-radius: 1rem;
		padding: 1rem;
	}

	.wizard-quick-card--button {
		min-block-size: 100%;
		min-inline-size: 0;
		width: 100%;
		grid-template-rows: auto minmax(0, 1fr) auto;
		align-items: start;
		color: inherit;
		font: inherit;
		text-align: left;
		box-shadow: 0 4px 8px #111;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease;
		cursor: pointer;
	}

	.wizard-quick-card--button.is-active {
		outline: 1px solid color-mix(in srgb, var(--wizard-accent-highlight) 30%, var(--panel-border));
	}

	.wizard-quick-card--button.is-active,
	.wizard-quick-card--button:hover {
		background: color-mix(in srgb, var(--wizard-accent-panel) 42%, var(--panel-bg) 58%) !important;
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--wizard-accent-highlight) 16%, transparent),
			0 8px 12px color-mix(in oklch, var(--shadow-soft) 80%, transparent);
		border-color: color-mix(in srgb, var(--wizard-accent-highlight) 36%, var(--panel-border)) !important;
		transform: translateY(-1px);
	}

	.wizard-quick-meta {
		color: color-mix(in srgb, var(--wizard-accent-highlight) 48%, var(--muted-ink) 52%) !important;
		text-transform: uppercase;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		padding-block-start: 0.2rem;
		margin-block-start: auto !important;
	}

	.wizard-quick-starts {
		display: grid;
		gap: 1.2rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 82%, #261735 16%) 100%);
		box-shadow: 0 8px 20px color-mix(in oklch, var(--shadow-soft) 64%, transparent);
		border: 1px solid color-mix(in srgb, var(--wizard-accent-border) 68%, var(--panel-border));
		border-radius: 1rem;
		padding: 1.35rem;
	}

	.wizard-block--touchpoints {
		padding-block: 1rem 0;
	}

	@media (width <= 1100px) {
		.wizard-quick-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (width <= 720px) {
		.wizard-page {
			gap: 1rem;
		}

		.wizard-hero {
			padding-block: 1rem;
			padding-inline: 1rem;
		}

		.wizard-panel {
			padding: 0;
			gap: 1rem;
		}

		.wizard-selector,
		.wizard-quick-starts {
			padding: 0.9rem;
			border-radius: 0.9rem;
		}

		.wizard-card-intro {
			padding: 0.9rem;
			gap: 0.85rem;
		}

		.wizard-quick-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.wizard-quick-head,
		.wizard-card-head {
			align-items: start;
			flex-direction: column;
		}

		.wizard-quick-head {
			min-block-size: 0;
			gap: 0.55rem;
		}

		.wizard-card h3,
		.wizard-quick-card h3 {
			font-size: 1.1rem;
		}

		.wizard-card-stats {
			justify-content: start;
		}

		.wizard-brief-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.wizard-brief-card,
		.wizard-block--example {
			padding: 0.85rem;
			border-radius: 0.85rem;
		}

		.wizard-quick-card {
			gap: 0.6rem;
			padding: 0.85rem;
		}

		.wizard-quick-head span,
		.wizard-card-stat {
			white-space: normal;
		}

		.wizard-block--touchpoints {
			padding-block-start: 0.75rem;
		}
	}
</style>
