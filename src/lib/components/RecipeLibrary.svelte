<script>
	import SnippetExample from "./SnippetExample.svelte";
	import { authoringDatasets, exampleSupportsLanguage, firstShipPrinciples, internalDocLanes, recipeLaunchRecipes, researchBasisLinks, snippetLanguageFilters } from "../data/generatorPageData.js";

	let activeSnippetLanguage = "all";
</script>

<section class="recipe-page">
	<header class="hero recipe-hero">
		<p class="eyebrow">Research-Backed Buildout</p>
		<h1>Recipe Library</h1>
		<p>
			This page has moved past planning copy. It now starts to show the actual snippet patterns these recipes should ship: real Lua callbacks, type lookups, XML starters, and schema-backed
			touchpoints that can feed future generators.
		</p>
	</header>

	<section class="recipe-stats" aria-label="Recipe library stats">
		{#each authoringDatasets as item (item.title)}
			<article class="recipe-stat">
				<span class="recipe-stat-value">{item.value}</span>
				<h2>{item.title}</h2>
				<p>{item.copy}</p>
			</article>
		{/each}
	</section>

	<section class="recipe-panel">
		<div class="recipe-section-head">
			<span class="recipe-kicker">First Recipes</span>
			<h2>Initial patterns worth shipping before full wizards</h2>
			<p>
				These are the compact generators with the highest leverage. Each one now carries a concrete snippet and direct touchpoints into the Lua API Explorer or Schema Browser so the page can
				act like a working reference instead of a static backlog.
			</p>
		</div>

		<div class="recipe-filter-toolbar" aria-label="Snippet language filters">
			<div class="recipe-filter-copy">
				<span class="recipe-toolbar-kicker">Snippet Filter</span>
				<p>Show only Lua, XML, Text, or INI examples while reviewing the cards.</p>
			</div>
			<div class="recipe-filter-group" role="group" aria-label="Snippet languages">
				{#each snippetLanguageFilters as filter (filter.id)}
					<button type="button" class={`recipe-filter-chip ${activeSnippetLanguage === filter.id ? "is-active" : ""}`} onclick={() => (activeSnippetLanguage = filter.id)}>
						{filter.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="recipe-grid recipe-grid--feature">
			{#each recipeLaunchRecipes as recipe (recipe.title)}
				<article class="recipe-card">
					<div class="recipe-card-head">
						<div class="recipe-card-title-wrap">
							<span class="recipe-chip">{recipe.focus}</span>
							<h3>{recipe.title}</h3>
						</div>
						<span class="recipe-status">{recipe.status}</span>
					</div>

					<p>{recipe.copy}</p>

					{#if exampleSupportsLanguage(recipe.example, activeSnippetLanguage)}
						<div class="recipe-block recipe-block--example">
							<h4>{recipe.example.title}</h4>
							<SnippetExample example={recipe.example} activeLanguage={activeSnippetLanguage} />
						</div>
					{/if}

					<details class="recipe-block recipe-block--collapsed">
						<summary class="recipe-block-summary">
							<h4>Outputs</h4>
							<span>{recipe.deliverables.length}</span>
						</summary>
						<ul class="recipe-list">
							{#each recipe.deliverables as item (item)}
								<li>{item}</li>
							{/each}
						</ul>
					</details>

					<details class="recipe-block recipe-block--collapsed recipe-block--references">
						<summary class="recipe-block-summary">
							<h4>Reference touchpoints</h4>
							<span>{recipe.touchpoints.length}</span>
						</summary>
						<div class="recipe-reference-list">
							{#each recipe.touchpoints as touchpoint (touchpoint.href)}
								<a class="recipe-reference-card" href={touchpoint.href}>
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

	<section class="recipe-panel">
		<div class="recipe-section-head">
			<span class="recipe-kicker">Internal Documentation Lanes</span>
			<h2>Build inward-facing content before leaning on outbound links</h2>
			<p>
				These lanes define the internal docs and browser integrations the team can keep updating over time. The public references stay useful, but they should sit behind the first-party
				content rather than replace it.
			</p>
		</div>

		<div class="recipe-grid">
			{#each internalDocLanes as lane (lane.title)}
				<article class="recipe-card recipe-card--compact">
					<h3>{lane.title}</h3>
					<p>{lane.copy}</p>
					<div class="recipe-links">
						{#each lane.links as link (link.href)}
							<a class="recipe-link" href={link.href}>{link.label}</a>
						{/each}
					</div>
					<div class="recipe-tags">
						{#each lane.planned as item (item)}
							<span class="recipe-tag recipe-tag--planned">{item}</span>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="recipe-panel">
		<div class="recipe-section-head">
			<span class="recipe-kicker">Research Basis</span>
			<h2>Compact external reference set</h2>
			<p>These links still matter, but they should support the internal docs rather than dominate the page.</p>
		</div>
		<div class="recipe-links">
			{#each researchBasisLinks as link (link.href)}
				<a class="recipe-link" href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
			{/each}
		</div>
	</section>

	<section class="recipe-panel recipe-panel--summary">
		<div class="recipe-section-head">
			<span class="recipe-kicker">Build Direction</span>
			<h2>How this page should evolve</h2>
		</div>

		<ul class="recipe-list">
			{#each firstShipPrinciples as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	</section>
</section>

<style>
	.recipe-page {
		display: grid;
		gap: 1.25rem;
	}

	.recipe-hero {
		border-color: color-mix(in oklch, var(--accent) 56%, var(--panel-border));
		background:
			radial-gradient(circle at top right, color-mix(in oklch, var(--accent) 26%, transparent), transparent 34%),
			radial-gradient(circle at left 18%, color-mix(in oklch, white 8%, transparent), transparent 22%),
			linear-gradient(145deg, color-mix(in oklch, var(--panel-bg) 82%, black) 0%, color-mix(in oklch, var(--panel-bg) 90%, var(--accent) 8%) 100%);
	}

	.recipe-stats,
	.recipe-panel {
		display: grid;
		gap: 1.2rem;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, transparent);
		border-radius: 1rem;
		box-shadow: 0 10px 28px var(--shadow-soft);
		padding: 1.5rem;
	}

	.recipe-stats {
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.recipe-stat {
		display: grid;
		gap: 0.35rem;
		padding: 0.2rem;
	}

	.recipe-stat h2,
	.recipe-section-head h2,
	.recipe-card h3,
	.recipe-block h4 {
		margin: 0;
	}

	.recipe-stat-value {
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1.4rem;
		font-weight: 700;
		color: color-mix(in oklch, var(--accent) 72%, white 10%);
	}

	.recipe-stat p,
	.recipe-section-head p,
	.recipe-card p,
	.recipe-list li,
	.recipe-reference-card span {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
	}

	.recipe-section-head {
		display: grid;
		gap: 0.45rem;
	}

	.recipe-kicker {
		color: var(--muted-ink);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.recipe-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.recipe-grid--feature {
		grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
	}

	.recipe-card {
		display: grid;
		align-content: start;
		gap: 1rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 72%, transparent) 0%, color-mix(in oklch, var(--panel-bg) 86%, transparent) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 34%, var(--panel-border));
		border-radius: 0.9rem;
		padding: 1.15rem;
	}

	.recipe-card--compact {
		align-content: start;
	}

	.recipe-card-head {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.recipe-card-title-wrap,
	.recipe-block {
		display: grid;
		gap: 0.55rem;
	}

	.recipe-block summary {
		list-style: none;
	}

	.recipe-block summary::-webkit-details-marker {
		display: none;
	}

	.recipe-chip,
	.recipe-status,
	.recipe-filter-chip {
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

	.recipe-chip {
		color: color-mix(in oklch, white 84%, var(--ink));
		background: color-mix(in oklch, var(--accent) 26%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 44%, var(--panel-border));
	}

	.recipe-status {
		flex: 0 0 auto;
		color: var(--muted-ink);
		border: 1px solid color-mix(in oklch, var(--panel-border) 76%, var(--accent) 24%);
	}

	.recipe-filter-toolbar {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--panel-bg) 88%, var(--control-bg)) 0%, color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg)) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 1rem;
	}

	.recipe-filter-copy {
		display: grid;
		gap: 0.3rem;
	}

	.recipe-filter-copy p {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
	}

	.recipe-toolbar-kicker {
		color: color-mix(in oklch, white 82%, var(--ink));
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.recipe-filter-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.recipe-filter-chip {
		color: var(--muted-ink);
		cursor: pointer;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
	}

	.recipe-filter-chip.is-active,
	.recipe-filter-chip:hover {
		color: color-mix(in oklch, white 84%, var(--ink));
		background: color-mix(in oklch, var(--accent) 16%, var(--control-bg));
		border-color: color-mix(in oklch, var(--accent) 40%, var(--panel-border));
	}

	.recipe-block h4 {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in oklch, white 82%, var(--ink));
	}

	.recipe-block {
		padding: 0.95rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--panel-bg) 88%, var(--control-bg)) 0%, color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg)) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 16%, var(--panel-border));
		border-radius: 1rem;
	}

	.recipe-block--collapsed {
		gap: 0.8rem;
	}

	.recipe-block-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		cursor: pointer;
	}

	.recipe-block-summary span {
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

	.recipe-block--collapsed:not([open]) {
		gap: 0;
	}

	.recipe-block--collapsed:not([open]) .recipe-block-summary {
		margin: 0;
	}

	.recipe-block--example {
		border-color: color-mix(in oklch, var(--accent) 28%, var(--panel-border));
		box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--accent) 10%, transparent);
	}

	.recipe-list {
		display: grid;
		gap: 0.6rem;
		margin: 0;
		padding-inline-start: 1.1rem;
	}

	.recipe-links,
	.recipe-tags,
	.recipe-reference-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.recipe-reference-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	}

	.recipe-reference-card {
		display: grid;
		gap: 0.35rem;
		text-decoration: none;
		background: color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 22%, var(--panel-border));
		border-radius: 0.8rem;
		padding: 0.85rem;
	}

	.recipe-reference-card strong {
		color: color-mix(in oklch, white 84%, var(--ink));
		font-size: 0.86rem;
	}

	.recipe-reference-card:hover,
	.recipe-link:hover {
		border-color: color-mix(in oklch, var(--accent) 42%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 12%, var(--control-bg));
	}

	.recipe-tag {
		color: color-mix(in oklch, white 82%, var(--ink));
		font-size: 0.72rem;
		font-weight: 600;
		background: color-mix(in oklch, var(--accent) 14%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 28%, var(--panel-border));
		border-radius: 999px;
		padding: 0.28rem 0.55rem;
	}

	.recipe-tag--planned {
		color: var(--muted-ink);
		background: color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg));
	}

	.recipe-link {
		color: var(--ink);
		font-size: 0.76rem;
		font-weight: 600;
		text-decoration: none;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 22%, var(--panel-border));
		border-radius: 999px;
		padding: 0.34rem 0.6rem;
	}

	:global(:root[data-theme="light"]) .recipe-card {
		background: linear-gradient(180deg, color-mix(in oklch, white 76%, var(--control-bg)) 0%, color-mix(in oklch, white 88%, var(--panel-bg)) 100%);
	}

	@media (width <= 720px) {
		.recipe-stats,
		.recipe-panel {
			padding: 1rem;
		}

		.recipe-card-head {
			flex-direction: column;
			align-items: start;
		}
	}
</style>
