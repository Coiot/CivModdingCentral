<script>
	const wizardCards = [
		{
			title: "Building / Wonder Wizard",
			stage: "First Wave",
			copy: "Start with the content family modders create most often and get the companion tables, text keys, and default validation in place from the first pass.",
			asks: ["Type keys and class relationship", "Cost, prerequisites, yields, flavors, and specialist data", "Civilopedia and gameplay text keys"],
			outputs: [
				"Core building row plus common side-table inserts",
				"Localization scaffold and mod action file split",
				"Optional hooks for free promotions, dummy building patterns, and notifications",
			],
		},
		{
			title: "Unique Unit Wizard",
			stage: "First Wave",
			copy: "Generate a unit package that respects class replacement, upgrade paths, promotions, art references, and localization instead of stopping at the main unit row.",
			asks: ["Base class replacement or standalone class", "Combat role, movement profile, and promotions", "Icon / atlas references and text keys"],
			outputs: ["Unit, Unit_ClassUpgrades, and related side tables", "Promotion and prerequisite stubs", "Localization and icon registration placeholders"],
		},
		{
			title: "Lua Hook Wizard",
			stage: "First Wave",
			copy: "Guide modders to the right hook family and emit a starter file that already uses the correct callback signature and context.",
			asks: ["Gameplay effect versus UI reaction", "Expected inputs and return behavior", "Persistence and notification needs"],
			outputs: ["GameEvents, Events, or LuaEvents starter file", "Namespaced save-data helper when needed", "Optional notification and debug logging blocks"],
		},
		{
			title: "Atlas / Art Registration Builder",
			stage: "First Wave",
			copy: "Tie the existing DDS and icon pipeline into generator output so art registration becomes repeatable instead of a manual checklist.",
			asks: ["Atlas sizes, filenames, and portrait indices", "VFS expectations and content action placement", "Alpha / icon sheet naming"],
			outputs: ["IconTextureAtlases rows and texture references", "VFS reminders and import flags", "Text-key placeholders for related UI surfaces"],
		},
		{
			title: "Civilization + Leader Package Wizard",
			stage: "Second Wave",
			copy: "This should come after the smaller pieces exist, because it is really a bundle of building, unit, art, text, and bias generators in one package.",
			asks: ["Civilization identity, colors, traits, uniques, and city names", "Leader text, diplomacy, start biases, and icons", "Which sub-generators to include in the package"],
			outputs: ["Baseline civilization and leader rows", "Localization packs and art registration stubs", "Expandable folder structure instead of a single giant output blob"],
		},
	];

	const guardrails = [
		{
			title: "Event family correctness",
			copy: "The wizard layer should never force modders to memorize the difference between GameEvents, Events, and LuaEvents. That routing belongs in the generator.",
			source: "Internal hook docs + Lua API Explorer",
		},
		{
			title: "VFS is explicit",
			copy: "Generators should state which files belong in VFS and which belong in content actions, especially for UI Lua, XML includes, and art registration.",
			source: "Internal setup docs + Schema Browser",
		},
		{
			title: "Localization always ships",
			copy: "Every gameplay wizard should emit text keys as part of the baseline package, not as an optional 'later' step.",
			source: "Internal localization docs",
		},
		{
			title: "No magic IDs",
			copy: "Lua-oriented generators should prefer `GameInfoTypes` lookup patterns and safe guards instead of raw integer assumptions.",
			source: "Schema Browser + Lua API Explorer",
		},
		{
			title: "Persistence is namespaced",
			copy: "When a wizard adds save data, it should also add key naming and lightweight caching so the generated code is sustainable.",
			source: "Internal persistence docs",
		},
	];

	const implementationStages = [
		{
			label: "Stage 1",
			title: "Recipe-backed helpers first",
			copy: "Use the Recipe Library to prove the small patterns: localization, event routing, persistence, VFS wiring, and debug helpers.",
		},
		{
			label: "Stage 2",
			title: "Single-domain wizards",
			copy: "Ship building, unit, Lua hook, and atlas builders once the shared helper logic is stable.",
		},
		{
			label: "Stage 3",
			title: "Large package generators",
			copy: "Only then combine the smaller pieces into civilization, leader, or project-level builders.",
		},
	];

	const internalCrossLinks = [
		{
			title: "Recipe Library",
			copy: "Recipes should own the compact patterns that the larger generators compose.",
			links: [{ label: "Open Recipe Library", href: "/recipe-library" }],
			planned: ["Event docs", "Persistence docs", "Localization docs"],
		},
		{
			title: "Lua API Explorer",
			copy: "Internal browser for workbook-backed methods and GameEvents that can feed signatures, parameter hints, and future code examples straight into wizard output.",
			links: [{ label: "Open Lua API Explorer", href: "/lua-api-explorer" }],
			planned: ["Callback signatures", "Cross-links from recipes", "Events + LuaEvents imports"],
		},
		{
			title: "Schema Browser",
			copy: "Internal browser for gameplay tables, foreign-key style relationships, and common companion rows used by content generators.",
			links: [{ label: "Open Schema Browser", href: "/schema-browser" }],
			planned: ["Side-table hints", "Type lookup cross-links", "Generator validation rules"],
		},
		{
			title: "Existing Build Tools",
			copy: "Generators should connect to the site's working tools instead of inventing disconnected workflows.",
			links: [
				{ label: "ModInfo Builder", href: "/modinfo-builder" },
				{ label: "DDS Converter", href: "/dds-converter" },
				{ label: "Civ Icon Maker", href: "/civ-icon-maker" },
			],
			planned: ["Atlas handoff", "Project wiring handoff"],
		},
	];

	const researchLinks = [
		{ label: "Civ5 XML Reference", href: "https://modiki.civfanatics.com/index.php/Civ5_XML_Reference" },
		{ label: "Debugging (Civ5)", href: "https://modiki.civfanatics.com/index.php/Debugging_%28Civ5%29" },
		{ label: "VFS (Civ5)", href: "https://modiki.civfanatics.com/index.php/VFS_%28Civ5%29" },
		{ label: "GameInfoTypes (Civ5 Type)", href: "https://modiki.civfanatics.com/index.php/GameInfoTypes_%28Civ5_Type%29" },
		{ label: "Persisting data (Civ5)", href: "https://modiki.civfanatics.com/index.php/Persisting_data_%28Civ5%29" },
	];

	const datasetNotes = [
		"GameEvents authoring workbook: 89 callback entries available for generator validation and signature hints.",
		"Methods authoring workbook: 2,310 method signatures across 12 object families available for API lookup support.",
	];
</script>

<section class="wizard-page">
	<header class="hero wizard-hero">
		<p class="eyebrow">Generator Planning Hub</p>
		<h1>Wizard Generators</h1>
		<p>
			This page now frames the generator roadmap around actual Civ V source material. The goal is not to rush a flashy wizard, but to build generators that encode the rules from VFS,
			localization, event routing, GameInfoTypes, persistence, and the local workbooks you supplied.
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
			<p>The first real wizards should be the ones that replace tedious, error-prone setup work while still staying understandable to edit by hand after generation.</p>
		</div>

		<div class="wizard-grid wizard-grid--feature">
			{#each wizardCards as card (card.title)}
				<article class="wizard-card">
					<div class="wizard-card-head">
						<h3>{card.title}</h3>
						<span class="wizard-status">{card.stage}</span>
					</div>

					<p>{card.copy}</p>

					<div class="wizard-block">
						<h4>Wizard asks</h4>
						<ul class="wizard-list">
							{#each card.asks as item (item)}
								<li>{item}</li>
							{/each}
						</ul>
					</div>

					<div class="wizard-block">
						<h4>Wizard outputs</h4>
						<ul class="wizard-list">
							{#each card.outputs as item (item)}
								<li>{item}</li>
							{/each}
						</ul>
					</div>
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
		gap: 1rem;
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
		gap: 1rem;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, transparent);
		border-radius: 1rem;
		box-shadow: 0 10px 28px var(--shadow-soft);
		padding: 1.35rem;
	}

	.wizard-panel--timeline {
		background: linear-gradient(180deg, color-mix(in oklch, var(--panel-bg) 94%, transparent) 0%, color-mix(in oklch, var(--panel-bg) 82%, var(--accent) 6%) 100%);
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
	.wizard-card h3,
	.wizard-stage-card h3,
	.wizard-block h4 {
		margin: 0;
	}

	.wizard-section-head p,
	.wizard-card p,
	.wizard-stage-card p,
	.wizard-list li {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
	}

	.wizard-stage-grid,
	.wizard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.9rem;
	}

	.wizard-grid--feature {
		grid-template-columns: repeat(auto-fit, minmax(21rem, 1fr));
	}

	.wizard-stage-card,
	.wizard-card {
		display: grid;
		gap: 0.75rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 70%, transparent) 0%, color-mix(in oklch, var(--panel-bg) 88%, transparent) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 34%, var(--panel-border));
		border-radius: 0.9rem;
		padding: 1rem;
	}

	.wizard-card--compact {
		align-content: start;
	}

	.wizard-stage-label,
	.wizard-status,
	.wizard-source {
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

	.wizard-block {
		display: grid;
		gap: 0.45rem;
	}

	.wizard-block h4 {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in oklch, white 82%, var(--ink));
	}

	.wizard-list {
		display: grid;
		gap: 0.55rem;
		margin: 0;
		padding-inline-start: 1.1rem;
	}

	.wizard-source {
		color: var(--muted-ink);
		background: color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
	}

	.wizard-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.wizard-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
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
