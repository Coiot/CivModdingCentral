<script>
	const patternCards = [
		{
			title: "Add yield to building",
			copy: "Generate the main Buildings row plus the usual side-table inserts for yield changes without forgetting the companion records.",
		},
		{
			title: "Create unique unit",
			copy: "Scaffold the unit row, class replacement, prerequisites, promotions, and localization stubs that usually travel together.",
		},
		{
			title: "Attach Lua to city event",
			copy: "Produce a starter event handler with guard clauses, player and city lookups, and the right event bucket already chosen.",
		},
		{
			title: "Store persistent setting",
			copy: "Output a namespaced persistence pattern so mod state survives reloads without turning save data into a junk drawer.",
		},
		{
			title: "Add custom notification",
			copy: "Build the notification call, payload parameters, and matching text keys from a known-good snippet.",
		},
	];

	const helperCards = [
		{
			title: "Dummy Building / Hidden Effect Helper",
			copy: "Create invisible helper buildings, classes, Lua glue, and naming conventions for one of the most common Civ V design patterns.",
		},
		{
			title: "Persistent Data Helper",
			copy: "Scaffold OpenUserData or OpenSaveData usage, namespaced keys, cache wrappers, and table serialization helpers.",
		},
		{
			title: "Notification Builder",
			copy: "Generate Player:AddNotification(...) snippets, preview notification kinds, payload parameters, and linked text keys.",
		},
		{
			title: "Text Markup Previewer",
			copy: "Preview ICON, COLOR, LINK, and NEWLINE markup, then flag broken or unknown localization tokens before they land in game.",
		},
	];

	const outcomes = [
		"Lower-friction copy-paste patterns for everyday Civ V modding tasks.",
		"Safer defaults around persistence, notifications, and Lua event wiring.",
		"Small tools that can ship quickly without requiring a full project wizard.",
	];
</script>

<section class="recipe-page">
	<header class="hero recipe-hero">
		<p class="eyebrow">Coming Soon</p>
		<h1>Recipe Library</h1>
		<p>A working library of small Civ V patterns and helper generators. The goal is fast, trustworthy snippets for the things modders repeat constantly.</p>
	</header>

	<section class="recipe-panel">
		<div class="recipe-section-head">
			<span class="recipe-kicker">Copy-Pasteable Patterns</span>
			<h2>Small recipes with immediate value</h2>
			<p>These are scoped below a full wizard. Each card is intended to output a compact, usable pattern you can paste into an existing mod with minimal cleanup.</p>
		</div>

		<div class="recipe-grid recipe-grid--patterns">
			{#each patternCards as card (card.title)}
				<article class="recipe-card">
					<div class="recipe-card-head">
						<h3>{card.title}</h3>
						<span class="recipe-status">Coming Soon</span>
					</div>
					<p>{card.copy}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="recipe-panel">
		<div class="recipe-section-head">
			<span class="recipe-kicker">Helper Modules</span>
			<h2>Focused generators for common pain points</h2>
			<p>These target the Civ V patterns that newer modders routinely misuse: hidden buildings, persistence, notifications, and text markup.</p>
		</div>

		<div class="recipe-grid">
			{#each helperCards as card (card.title)}
				<article class="recipe-card">
					<div class="recipe-card-head">
						<h3>{card.title}</h3>
						<span class="recipe-status">Coming Soon</span>
					</div>
					<p>{card.copy}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="recipe-panel recipe-panel--summary">
		<div class="recipe-section-head">
			<span class="recipe-kicker">Why This Ships Early</span>
			<h2>Lower complexity, high usefulness</h2>
		</div>

		<ul class="recipe-list">
			{#each outcomes as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	</section>
</section>

<style>
	.recipe-page {
		display: grid;
		gap: 1rem;
	}

	.recipe-hero {
		border-color: color-mix(in oklch, var(--accent) 56%, var(--panel-border));
		background:
			radial-gradient(circle at top right, color-mix(in oklch, var(--accent) 30%, transparent), transparent 34%),
			linear-gradient(145deg, color-mix(in oklch, var(--panel-bg) 82%, black) 0%, color-mix(in oklch, var(--panel-bg) 90%, var(--accent) 8%) 100%);
	}

	.recipe-panel {
		display: grid;
		gap: 1rem;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, transparent);
		border-radius: 1rem;
		box-shadow: 0 10px 28px var(--shadow-soft);
		padding: 1.35rem;
	}

	.recipe-section-head {
		display: grid;
		gap: 0.35rem;
	}

	.recipe-kicker {
		color: var(--muted-ink);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.recipe-section-head h2,
	.recipe-card h3 {
		margin: 0;
	}

	.recipe-section-head p,
	.recipe-card p {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
	}

	.recipe-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.9rem;
	}

	.recipe-grid--patterns {
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
	}

	.recipe-card {
		display: grid;
		gap: 0.7rem;
		background:
			linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 72%, transparent) 0%, color-mix(in oklch, var(--panel-bg) 86%, transparent) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 34%, var(--panel-border));
		border-radius: 0.9rem;
		padding: 1rem;
	}

	.recipe-card-head {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.recipe-status {
		flex: 0 0 auto;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted-ink);
		border: 1px solid color-mix(in oklch, var(--panel-border) 76%, var(--accent) 24%);
		border-radius: 999px;
		padding: 0.2rem 0.5rem;
	}

	.recipe-list {
		display: grid;
		gap: 0.6rem;
		margin: 0;
		padding-inline-start: 1.2rem;
	}

	.recipe-list li {
		color: var(--muted-ink);
		line-height: 1.5;
	}

	:global(:root[data-theme="light"]) .recipe-card {
		background: linear-gradient(180deg, color-mix(in oklch, white 76%, var(--control-bg)) 0%, color-mix(in oklch, white 88%, var(--panel-bg)) 100%);
	}

	@media (width <= 720px) {
		.recipe-panel {
			padding: 1rem;
		}

		.recipe-card-head {
			flex-direction: column;
			align-items: start;
		}
	}
</style>
