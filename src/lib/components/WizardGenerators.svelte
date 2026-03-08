<script>
	const contentFamilyCards = [
		{
			title: "Unit / Building Wizard",
			copy: "Generate the main row plus the common side tables and reference-safe stubs for the two content families modders reach for most often.",
		},
		{
			title: "New Resource Wizard",
			copy: "Create a new resource with the gameplay row, art hooks, reveal logic, improvements, and localization expected by the surrounding data model.",
		},
		{
			title: "Unique Tile Improvement Wizard",
			copy: "Build the improvement row, civilization hooks, art references, valid terrain rules, yields, and upgrade behavior without hand-stitching every table.",
		},
	];

	const packageCards = [
		{
			title: "Civilization + Leader Wizard",
			copy: "Generate the baseline XML or SQL, text keys, city names, unique replacements, start biases, colors, icon atlases, alpha atlases, Dawn of Man assets, and package stubs.",
		},
		{
			title: "Atlas / Art Registration Builder",
			copy: "Generate IconTextureAtlases rows, PortraitIndex usage, manifests, VFS flags, and art registration XML around DDS files you already have.",
		},
	];

	const principles = [
		"Output companion tables by default instead of pretending the main row is enough.",
		"Keep generated references namespaced and safe to extend by hand later.",
		"Fit the existing DDS and icon pipeline rather than inventing a separate art workflow.",
	];
</script>

<section class="wizard-page">
	<header class="hero wizard-hero">
		<p class="eyebrow">Coming Soon</p>
		<h1>Wizard Generators</h1>
		<p>Guided generators for the content families that cost the most setup time. The aim is not a flashy wizard, but a correct starter package with the usual side tables already wired.</p>
	</header>

	<section class="wizard-panel">
		<div class="wizard-section-head">
			<span class="wizard-kicker">Common Content</span>
			<h2>High-traffic generators for gameplay content</h2>
			<p>These focus on the custom content families modders create repeatedly and often wire incorrectly on the first pass.</p>
		</div>

		<div class="wizard-grid">
			{#each contentFamilyCards as card (card.title)}
				<article class="wizard-card">
					<div class="wizard-card-head">
						<h3>{card.title}</h3>
						<span class="wizard-status">Coming Soon</span>
					</div>
					<p>{card.copy}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="wizard-panel">
		<div class="wizard-section-head">
			<span class="wizard-kicker">Package Builders</span>
			<h2>Larger generators for faction and art registration work</h2>
			<p>These cover the wider packages where most of the effort is in getting the surrounding metadata, atlases, and localization structure right.</p>
		</div>

		<div class="wizard-grid wizard-grid--wide">
			{#each packageCards as card (card.title)}
				<article class="wizard-card">
					<div class="wizard-card-head">
						<h3>{card.title}</h3>
						<span class="wizard-status">Coming Soon</span>
					</div>
					<p>{card.copy}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="wizard-panel wizard-panel--notes">
		<div class="wizard-section-head">
			<span class="wizard-kicker">Design Direction</span>
			<h2>What these generators should optimize for</h2>
		</div>

		<ul class="wizard-list">
			{#each principles as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	</section>
</section>

<style>
	.wizard-page {
		display: grid;
		gap: 1rem;
	}

	.wizard-hero {
		border-color: color-mix(in oklch, var(--accent) 54%, var(--panel-border));
		background:
			radial-gradient(circle at 12% 18%, color-mix(in oklch, var(--accent) 24%, transparent), transparent 32%),
			linear-gradient(145deg, color-mix(in oklch, var(--panel-bg) 82%, black) 0%, color-mix(in oklch, var(--panel-bg) 90%, var(--accent) 7%) 100%);
	}

	.wizard-panel {
		display: grid;
		gap: 1rem;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, transparent);
		border-radius: 1rem;
		box-shadow: 0 10px 28px var(--shadow-soft);
		padding: 1.35rem;
	}

	.wizard-section-head {
		display: grid;
		gap: 0.35rem;
	}

	.wizard-kicker {
		color: var(--muted-ink);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.wizard-section-head h2,
	.wizard-card h3 {
		margin: 0;
	}

	.wizard-section-head p,
	.wizard-card p {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
	}

	.wizard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.9rem;
	}

	.wizard-grid--wide {
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
	}

	.wizard-card {
		display: grid;
		gap: 0.7rem;
		background:
			linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 70%, transparent) 0%, color-mix(in oklch, var(--panel-bg) 88%, transparent) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 34%, var(--panel-border));
		border-radius: 0.9rem;
		padding: 1rem;
	}

	.wizard-card-head {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.wizard-status {
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

	.wizard-list {
		display: grid;
		gap: 0.6rem;
		margin: 0;
		padding-inline-start: 1.2rem;
	}

	.wizard-list li {
		color: var(--muted-ink);
		line-height: 1.5;
	}

	:global(:root[data-theme="light"]) .wizard-card {
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
