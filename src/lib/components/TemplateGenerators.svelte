<svelte:options runes={true} />

<script>
	import WizardExamplePreview from "./WizardExamplePreview.svelte";
	import { datasetNotes, exampleSupportsLanguage, guardrails, implementationStages, internalCrossLinks, wizardCards } from "../data/generatorPageData.js";

	let activeSnippetLanguage = $state("all");
	let activeWizardIndex = $state(0);
	let urlSyncReady = $state(false);
	let suppressUrlSync = $state(false);
	let nextUrlSyncMode = $state("replace");

	const activeWizardCard = $derived(wizardCards[activeWizardIndex] || wizardCards[0]);

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
		if (href?.startsWith("/map-viewer")) {
			return "Viewer";
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
		if (href?.startsWith("/schema-browser")) {
			return "is-schema";
		}
		if (href?.startsWith("/lua-api-explorer")) {
			return "is-lua";
		}
		if (href?.startsWith("/map-viewer")) {
			return "is-viewer";
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

<svelte:window onpopstate={handleWindowPopState} />

<section class="wizard-page">
	<header class="hero wizard-hero">
		<p class="eyebrow">Useful Starter + Presets</p>
		<h1>Template Generators</h1>
		<p>Each builder targets one repeatable slice of new setup work, from a new blank civilization to focused follow-ups.</p>
	</header>

	<section class="wizard-panel">
		<div class="wizard-selection-shell">
			<div class="wizard-selector wizard-selector--featured" aria-label="Generator backlog">
				<div class="wizard-quick-copy">
					<span class="wizard-kicker">Generators</span>
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
								<span class="wizard-card-kicker">Selected Generator</span>
								<h3>{activeWizardCard.title}</h3>
								<p>{activeWizardCard.copy}</p>
							</div>
							<div class="wizard-card-stats" aria-label="Generator metadata">
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

					<section class="wizard-block wizard-block--touchpoints" aria-label="Reference touchpoints">
						<div class="wizard-touchpoint-head">
							<h4>Generator References</h4>
						</div>
						<div class="wizard-touchpoint-grid">
							{#each activeWizardCard.touchpoints as touchpoint (`${touchpoint.href}:${touchpoint.label}`)}
								<a class={`wizard-touchpoint-card wizard-touchpoint-card--link ${touchpointSurfaceClass(touchpoint.href)}`} href={touchpoint.href} target="_blank" rel="noreferrer">
									<div class="wizard-touchpoint-card-head">
										<span class="wizard-touchpoint-pill">{touchpoint.label}</span>
										<span>{touchpointSurfaceLabel(touchpoint.href)}</span>
									</div>
									<p class="wizard-card-meta">{touchpoint.note}</p>
								</a>
							{/each}
						</div>
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
		--wizard-accent-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #6d4bb1 28%);
		--wizard-accent-highlight: #caa6ff;
		--wizard-accent-highlight-strong: #f0e2ff;
		--wizard-accent-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, #261735 10%);
	}

	.wizard-hero {
		background: linear-gradient(145deg, color-mix(in srgb, var(--panel-bg) 82%, black) 0%, color-mix(in srgb, var(--panel-bg) 90%, #261735 10%) 100%);
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
	}

	.wizard-selection-shell {
		display: grid;
		gap: 1rem;
	}

	.wizard-selector {
		display: grid;
		gap: 0.95rem;
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
		box-shadow: 0 8px 20px color-mix(in oklch, var(--shadow-soft) 52%, transparent);
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

	.wizard-touchpoint-card-head span {
		color: color-mix(in srgb, var(--wizard-touchpoint-highlight) 66%, var(--muted-ink) 34%);
		font-size: 0.76rem;
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
	.wizard-quick-card h3,
	.wizard-block h4 {
		margin: 0;
	}

	.wizard-quick-card--button.is-active h3,
	.wizard-quick-card--button:hover h3 {
		color: color-mix(in oklch, white 90%, var(--ink));
	}

	.wizard-grid--feature {
		grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
	}

	:global(:root[data-theme="light"]) .wizard-card,
	:global(:root[data-theme="light"]) .wizard-quick-card {
		background: transparent;
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
		background: linear-gradient(180deg, color-mix(in srgb, var(--wizard-accent-panel) 54%, var(--panel-bg) 46%) 0%, color-mix(in srgb, var(--panel-bg) 94%, transparent) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--wizard-accent-highlight) 12%, transparent),
			0 12px 28px color-mix(in oklch, var(--shadow-soft) 74%, transparent);
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
	}

	.wizard-brief-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: color-mix(in srgb, var(--wizard-accent-highlight) 5%, var(--panel-bg) 95%);
		border: 1px solid color-mix(in srgb, var(--wizard-accent-highlight) 14%, var(--panel-border));
		border-radius: 0.9rem;
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

	.wizard-block h4 {
		color: color-mix(in oklch, white 82%, var(--ink));
		text-transform: uppercase;
		font-size: 0.8rem;
		letter-spacing: 0.08em;
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
		border-block-start: 1px solid color-mix(in oklch, var(--panel-border) 40%, transparent);
		padding-block: 0.95rem;
		padding-inline: 0;
	}

	.wizard-block--example {
		background: color-mix(in srgb, var(--wizard-accent-panel) 36%, var(--panel-bg) 64%);
		border: 1px solid color-mix(in srgb, var(--wizard-accent-highlight) 18%, var(--panel-border));
		border-radius: 0.9rem;
		padding: 1rem;
	}

	.wizard-block--touchpoints {
		gap: 0.9rem;
	}

	.wizard-touchpoint-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.wizard-touchpoint-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 0.75rem;
	}

	.wizard-touchpoint-card-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.55rem;
	}

	.wizard-touchpoint-pill {
		color: var(--wizard-touchpoint-highlight-strong);
		font-size: 0.95rem !important;
		font-weight: 700;
	}

	.wizard-card-meta {
		color: var(--muted-ink);
		line-height: 1.55;
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
		width: 100%;
		grid-template-rows: auto minmax(0, 1fr) auto;
		align-items: start;
		color: inherit;
		font: inherit;
		text-align: left;
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
		background: color-mix(in srgb, var(--wizard-accent-panel) 42%, var(--panel-bg) 58%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--wizard-accent-highlight) 16%, transparent),
			0 12px 28px color-mix(in oklch, var(--shadow-soft) 68%, transparent);
		border-color: color-mix(in srgb, var(--wizard-accent-highlight) 36%, var(--panel-border));
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

	.wizard-section-head {
		display: grid;
		gap: 0.45rem;
	}

	.wizard-touchpoint-card {
		display: grid;
		gap: 0.45rem;
		background: var(--wizard-touchpoint-panel);
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--wizard-touchpoint-highlight) 12%, transparent);
		border: 1px solid var(--wizard-touchpoint-border);
		border-radius: 1rem;
		padding-block: 0.8rem;
		padding-inline: 0.85rem;
		--wizard-touchpoint-border: color-mix(in oklch, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, oklch(0.52 0.09 246) 28%);
		--wizard-touchpoint-highlight: oklch(0.82 0.1 243);
		--wizard-touchpoint-highlight-strong: oklch(0.93 0.04 243);
		--wizard-touchpoint-panel: color-mix(in oklch, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, oklch(0.29 0.05 244) 10%);
	}

	.wizard-touchpoint-card--link {
		color: inherit;
		text-decoration: none;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease;
	}

	.wizard-touchpoint-card--link:hover {
		background: color-mix(in srgb, var(--wizard-touchpoint-highlight) 10%, var(--wizard-touchpoint-panel) 90%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--wizard-touchpoint-highlight) 18%, transparent),
			0 12px 28px color-mix(in oklch, var(--shadow-soft) 68%, transparent);
		border-color: color-mix(in srgb, var(--wizard-touchpoint-highlight) 74%, white 26%);
		transform: translateY(-1px);
	}

	.wizard-touchpoint-card.is-generator {
		--wizard-touchpoint-border: color-mix(in oklch, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, oklch(0.56 0.14 301) 28%);
		--wizard-touchpoint-highlight: oklch(0.84 0.12 303);
		--wizard-touchpoint-highlight-strong: oklch(0.95 0.05 303);
		--wizard-touchpoint-panel: color-mix(in oklch, var(--surface-color, rgba(14, 18, 24, 0.94)) 88%, oklch(0.31 0.06 302) 12%);
	}

	.wizard-touchpoint-card.is-lua {
		--wizard-touchpoint-border: color-mix(in oklch, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, oklch(0.49 0.08 166) 28%);
		--wizard-touchpoint-highlight: oklch(0.84 0.11 161);
		--wizard-touchpoint-highlight-strong: oklch(0.95 0.04 161);
		--wizard-touchpoint-panel: color-mix(in oklch, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, oklch(0.28 0.04 165) 10%);
	}

	.wizard-touchpoint-card.is-pattern {
		--wizard-touchpoint-border: color-mix(in oklch, var(--border-color, rgba(255, 255, 255, 0.14)) 70%, oklch(0.74 0.14 86) 30%);
		--wizard-touchpoint-highlight: oklch(0.9 0.14 91);
		--wizard-touchpoint-highlight-strong: oklch(0.97 0.05 97);
		--wizard-touchpoint-panel: color-mix(in oklch, var(--surface-color, rgba(14, 18, 24, 0.94)) 88%, oklch(0.46 0.08 89) 12%);
	}

	.wizard-touchpoint-card.is-schema {
		--wizard-touchpoint-border: color-mix(in oklch, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, oklch(0.52 0.09 246) 28%);
		--wizard-touchpoint-highlight: oklch(0.82 0.1 243);
		--wizard-touchpoint-highlight-strong: oklch(0.93 0.04 243);
		--wizard-touchpoint-panel: color-mix(in oklch, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, oklch(0.29 0.05 244) 10%);
	}

	.wizard-touchpoint-card.is-tool {
		--wizard-touchpoint-border: color-mix(in oklch, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, oklch(0.55 0.11 55) 28%);
		--wizard-touchpoint-highlight: color-mix(in oklch, var(--accent) 82%, oklch(0.84 0.09 67) 18%);
		--wizard-touchpoint-highlight-strong: color-mix(in oklch, white 84%, var(--accent) 16%);
		--wizard-touchpoint-panel: color-mix(in oklch, var(--surface-color, rgba(14, 18, 24, 0.94)) 82%, oklch(0.29 0.05 55) 18%);
	}

	.wizard-touchpoint-card.is-viewer {
		--wizard-touchpoint-border: color-mix(in oklch, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, oklch(0.56 0.25 15) 28%);
		--wizard-touchpoint-highlight: oklch(0.8 0.25 15);
		--wizard-touchpoint-highlight-strong: oklch(0.9 0.2 15);
		--wizard-touchpoint-panel: color-mix(in oklch, var(--surface-color, rgba(14, 18, 24, 0.94)) 88%, oklch(0.35 0.1 15) 12%);
	}

	@media (width <= 1100px) {
		.wizard-quick-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (width <= 720px) {
		.wizard-panel {
			padding: 0;
		}

		.wizard-selector,
		.wizard-quick-starts {
			padding: 1rem;
		}

		.wizard-card-intro {
			padding: 1rem;
		}

		.wizard-quick-grid {
			grid-template-columns: 1fr;
		}

		.wizard-quick-head,
		.wizard-card-head {
			align-items: start;
			flex-direction: column;
		}

		.wizard-card-stats {
			justify-content: start;
		}
	}
</style>
