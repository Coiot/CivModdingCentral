<script>
	import WizardExamplePreview from "./WizardExamplePreview.svelte";
	import { datasetNotes, exampleSupportsLanguage, guardrails, implementationStages, internalCrossLinks, researchLinks, snippetLanguageFilters, wizardCards } from "../data/generatorPageData.js";

	let activeSnippetLanguage = "all";
	let wizardBacklogGrid;

	function setAllWizardDetails(open) {
		wizardBacklogGrid?.querySelectorAll(".wizard-block--collapsed").forEach((detail) => {
			detail.open = open;
		});
	}
</script>

<section class="wizard-page">
	<header class="hero wizard-hero">
		<p class="eyebrow">Generator Planning Hub</p>
		<h1>Wizard Generators</h1>
		<p>
			This page can now start showing the kind of starter output the generators should actually emit. The goal is still disciplined scaffolding, but the backlog cards now point at concrete Lua
			hooks, schema tables, and starter XML or Lua blocks instead of staying purely conceptual.
		</p>
	</header>

	<section class="wizard-panel wizard-panel--timeline">
		<div class="wizard-section-head">
			<span class="wizard-kicker">Delivery Order</span>
			<h2>Implementation should move from small patterns to large packages</h2>
		</div>

		<div class="wizard-stage-grid">
			{#each implementationStages as stage (stage.label)}
				<article class="wizard-stage-card">
					<span class="wizard-stage-label">{stage.label}</span>
					<h3>{stage.title}</h3>
					<p>{stage.copy}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="wizard-panel">
		<div class="wizard-section-head">
			<span class="wizard-kicker">Wizard Backlog</span>
			<h2>Concrete generators worth building next</h2>
			<p>
				The first real wizards should replace tedious, error-prone setup work while still leaving generated files readable by hand. Each card now includes a starter output block and real
				touchpoints into the current internal tools.
			</p>
		</div>

		<div class="wizard-filter-toolbar" aria-label="Snippet language filters">
			<div class="wizard-filter-copy">
				<span class="wizard-toolbar-kicker">Snippet Filter</span>
				<p>Switch the backlog between Lua, XML, Text, and INI starter outputs so each generator card is easier to scan.</p>
			</div>
			<div class="wizard-filter-group" role="group" aria-label="Snippet languages">
				{#each snippetLanguageFilters as filter (filter.id)}
					<button type="button" class={`wizard-filter-chip ${activeSnippetLanguage === filter.id ? "is-active" : ""}`} onclick={() => (activeSnippetLanguage = filter.id)}>
						{filter.label}
					</button>
				{/each}
			</div>
			<div class="wizard-detail-controls" role="group" aria-label="Card detail controls">
				<button type="button" class="wizard-detail-chip" onclick={() => setAllWizardDetails(true)}>Expand all details</button>
				<button type="button" class="wizard-detail-chip" onclick={() => setAllWizardDetails(false)}>Collapse all details</button>
			</div>
		</div>

		<div class="wizard-grid wizard-grid--feature" bind:this={wizardBacklogGrid}>
			{#each wizardCards as card (card.title)}
				<article class="wizard-card">
					<div class="wizard-card-head">
						<h3>{card.title}</h3>
						<span class="wizard-status">{card.stage}</span>
					</div>

					<p>{card.copy}</p>

					{#if exampleSupportsLanguage(card.example, activeSnippetLanguage)}
						<div class="wizard-block wizard-block--example">
							<h4>Wizard Flow Preview</h4>
							<WizardExamplePreview example={card.example} activeLanguage={activeSnippetLanguage} />
						</div>
					{/if}

					<details class="wizard-block wizard-block--collapsed wizard-block--asks">
						<summary class="wizard-block-summary">
							<h4>Wizard asks</h4>
							<span>{card.asks.length}</span>
						</summary>
						<ul class="wizard-list">
							{#each card.asks as item (item)}
								<li>{item}</li>
							{/each}
						</ul>
					</details>

					<details class="wizard-block wizard-block--collapsed wizard-block--outputs">
						<summary class="wizard-block-summary">
							<h4>Wizard outputs</h4>
							<span>{card.outputs.length}</span>
						</summary>
						<ul class="wizard-list">
							{#each card.outputs as item (item)}
								<li>{item}</li>
							{/each}
						</ul>
					</details>

					<details class="wizard-block wizard-block--collapsed wizard-block--references">
						<summary class="wizard-block-summary">
							<h4>Reference touchpoints</h4>
							<span>{card.touchpoints.length}</span>
						</summary>
						<div class="wizard-reference-list">
							{#each card.touchpoints as touchpoint (touchpoint.href)}
								<a class="wizard-reference-card" href={touchpoint.href}>
									<strong>{touchpoint.label}</strong>
									<span>{touchpoint.note}</span>
								</a>
							{/each}
						</div>
					</details>
				</article>
			{/each}
		</div>
	</section>

	<section class="wizard-panel">
		<div class="wizard-section-head">
			<span class="wizard-kicker">Internal Cross-Links</span>
			<h2>These pages should point into first-party tools and docs</h2>
			<p>The generators should increasingly cross-link inside this site so the team can keep examples, docs, and browser data in sync.</p>
		</div>

		<div class="wizard-grid">
			{#each internalCrossLinks as item (item.title)}
				<article class="wizard-card wizard-card--compact">
					<h3>{item.title}</h3>
					<p>{item.copy}</p>
					{#if item.links.length > 0}
						<div class="wizard-links">
							{#each item.links as link (link.href)}
								<a class="wizard-link" href={link.href}>{link.label}</a>
							{/each}
						</div>
					{/if}
					<div class="wizard-tags">
						{#each item.planned as planned (planned)}
							<span class="wizard-tag">{planned}</span>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="wizard-panel">
		<div class="wizard-section-head">
			<span class="wizard-kicker">Guardrails</span>
			<h2>Rules the generators should encode by default</h2>
			<p>These are the research-backed constraints that should be visible in the page now and eventually enforced by the generators themselves.</p>
		</div>

		<div class="wizard-grid">
			{#each guardrails as item (item.title)}
				<article class="wizard-card wizard-card--compact">
					<h3>{item.title}</h3>
					<p>{item.copy}</p>
					<span class="wizard-source">{item.source}</span>
				</article>
			{/each}
		</div>
	</section>

	<section class="wizard-panel wizard-panel--notes">
		<div class="wizard-section-head">
			<span class="wizard-kicker">Research Basis</span>
			<h2>Compact external reference set</h2>
			<p>These sources still matter, but they should sit behind the internal docs, recipe pages, and future explorers.</p>
		</div>

		<div class="wizard-links">
			{#each researchLinks as link (link.href)}
				<a class="wizard-link" href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
			{/each}
		</div>

		<ul class="wizard-list">
			{#each datasetNotes as note (note)}
				<li>{note}</li>
			{/each}
		</ul>
	</section>
</section>

<style>
	.wizard-page {
		display: grid;
		gap: 1.25rem;
	}

	.wizard-hero {
		border-color: color-mix(in oklch, var(--accent) 54%, var(--panel-border));
		background:
			radial-gradient(circle at 12% 18%, color-mix(in oklch, var(--accent) 24%, transparent), transparent 32%),
			radial-gradient(circle at 88% 14%, color-mix(in oklch, white 8%, transparent), transparent 24%),
			linear-gradient(145deg, color-mix(in oklch, var(--panel-bg) 82%, black) 0%, color-mix(in oklch, var(--panel-bg) 90%, var(--accent) 7%) 100%);
	}

	.wizard-panel {
		display: grid;
		gap: 1.2rem;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, transparent);
		border-radius: 1rem;
		box-shadow: 0 10px 28px var(--shadow-soft);
		padding: 1.5rem;
	}

	.wizard-panel--timeline {
		background: linear-gradient(180deg, color-mix(in oklch, var(--panel-bg) 94%, transparent) 0%, color-mix(in oklch, var(--panel-bg) 82%, var(--accent) 6%) 100%);
	}

	.wizard-section-head {
		display: grid;
		gap: 0.45rem;
	}

	.wizard-kicker {
		color: var(--muted-ink);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.wizard-section-head h2,
	.wizard-card h3,
	.wizard-stage-card h3,
	.wizard-block h4 {
		margin: 0;
	}

	.wizard-section-head p,
	.wizard-card p,
	.wizard-stage-card p,
	.wizard-list li,
	.wizard-reference-card span {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
	}

	.wizard-stage-grid,
	.wizard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.wizard-grid--feature {
		grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
	}

	.wizard-stage-card,
	.wizard-card {
		display: grid;
		align-content: start;
		gap: 1rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 70%, transparent) 0%, color-mix(in oklch, var(--panel-bg) 88%, transparent) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 34%, var(--panel-border));
		border-radius: 0.9rem;
		padding: 1.15rem;
	}

	.wizard-card--compact {
		align-content: start;
	}

	.wizard-block summary {
		list-style: none;
	}

	.wizard-block summary::-webkit-details-marker {
		display: none;
	}

	.wizard-stage-label,
	.wizard-status,
	.wizard-source,
	.wizard-filter-chip {
		display: inline-flex;
		align-items: center;
		inline-size: fit-content;
		border-radius: 999px;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 0.24rem 0.55rem;
	}

	.wizard-stage-label {
		color: color-mix(in oklch, white 82%, var(--ink));
		background: color-mix(in oklch, var(--accent) 28%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 44%, var(--panel-border));
	}

	.wizard-card-head {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.wizard-status {
		flex: 0 0 auto;
		color: var(--muted-ink);
		border: 1px solid color-mix(in oklch, var(--panel-border) 76%, var(--accent) 24%);
	}

	.wizard-filter-toolbar {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--panel-bg) 88%, var(--control-bg)) 0%, color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg)) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 1rem;
	}

	.wizard-filter-copy {
		display: grid;
		gap: 0.3rem;
	}

	.wizard-filter-copy p {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
	}

	.wizard-toolbar-kicker {
		color: color-mix(in oklch, white 82%, var(--ink));
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.wizard-filter-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.wizard-detail-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.wizard-filter-chip {
		color: var(--muted-ink);
		cursor: pointer;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
	}

	.wizard-detail-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: fit-content;
		padding: 0.32rem 0.7rem;
		border-radius: 999px;
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		background: color-mix(in oklch, var(--panel-bg) 84%, var(--control-bg));
		color: var(--muted-ink);
		font: inherit;
		font-size: 0.74rem;
		font-weight: 600;
		cursor: pointer;
	}

	.wizard-filter-chip.is-active,
	.wizard-filter-chip:hover,
	.wizard-detail-chip:hover {
		color: color-mix(in oklch, white 84%, var(--ink));
		background: color-mix(in oklch, var(--accent) 16%, var(--control-bg));
		border-color: color-mix(in oklch, var(--accent) 40%, var(--panel-border));
	}

	.wizard-block {
		display: grid;
		gap: 0.55rem;
		padding: 0.95rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--panel-bg) 88%, var(--control-bg)) 0%, color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg)) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 16%, var(--panel-border));
		border-radius: 1rem;
	}

	.wizard-block--collapsed {
		gap: 0.8rem;
	}

	.wizard-block-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		cursor: pointer;
	}

	.wizard-block-summary span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 1.75rem;
		padding: 0.22rem 0.5rem;
		border-radius: 999px;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 16%, var(--panel-border));
		color: var(--muted-ink);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.wizard-block--collapsed:not([open]) {
		gap: 0;
	}

	.wizard-block h4 {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in oklch, white 82%, var(--ink));
	}

	.wizard-block--example {
		border-color: color-mix(in oklch, var(--accent) 28%, var(--panel-border));
		box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--accent) 10%, transparent);
	}

	.wizard-list {
		display: grid;
		gap: 0.6rem;
		margin: 0;
		padding-inline-start: 1.1rem;
	}

	.wizard-source {
		color: var(--muted-ink);
		background: color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
	}

	.wizard-links,
	.wizard-tags,
	.wizard-reference-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.wizard-reference-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	}

	.wizard-reference-card {
		display: grid;
		gap: 0.35rem;
		text-decoration: none;
		background: color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 22%, var(--panel-border));
		border-radius: 0.8rem;
		padding: 0.85rem;
	}

	.wizard-reference-card strong {
		color: color-mix(in oklch, white 84%, var(--ink));
		font-size: 0.86rem;
	}

	.wizard-tag {
		color: color-mix(in oklch, white 82%, var(--ink));
		font-size: 0.72rem;
		font-weight: 600;
		background: color-mix(in oklch, var(--accent) 14%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 28%, var(--panel-border));
		border-radius: 999px;
		padding: 0.28rem 0.55rem;
	}

	.wizard-link {
		color: var(--ink);
		font-size: 0.76rem;
		font-weight: 600;
		text-decoration: none;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 22%, var(--panel-border));
		border-radius: 999px;
		padding: 0.34rem 0.6rem;
	}

	.wizard-reference-card:hover,
	.wizard-link:hover {
		border-color: color-mix(in oklch, var(--accent) 42%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 12%, var(--control-bg));
	}

	:global(:root[data-theme="light"]) .wizard-card,
	:global(:root[data-theme="light"]) .wizard-stage-card {
		background: linear-gradient(180deg, color-mix(in oklch, white 76%, var(--control-bg)) 0%, color-mix(in oklch, white 88%, var(--panel-bg)) 100%);
	}

	@media (width <= 720px) {
		.wizard-panel {
			padding: 1rem;
		}

		.wizard-card-head {
			flex-direction: column;
			align-items: start;
		}
	}
</style>
