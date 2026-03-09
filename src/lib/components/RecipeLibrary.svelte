<script>
	const launchRecipes = [
		{
			title: "Event Bucket Chooser",
			focus: "Lua hook routing",
			status: "First Batch",
			copy: "Start with the right event surface instead of debugging the wrong callback family after the fact.",
			deliverables: [
				"Quick chooser for GameEvents, Events, and LuaEvents by context and return behavior.",
				"Starter handler signatures using named parameters instead of mystery positional arguments.",
				"Notes on where a hook belongs: gameplay logic, UI reaction, or custom cross-context messaging.",
			],
			internalTargets: ["Hook family docs", "Lua API Explorer", "GameEvents workbook mapping"],
		},
		{
			title: "Persistent Data Helper",
			focus: "Save data",
			status: "First Batch",
			copy: "Package a safe persistence pattern with namespaced keys, cache wrappers, and a clear choice between game and user scope.",
			deliverables: [
				"OpenSaveData and OpenUserData starter snippets with consistent key naming.",
				"Read-through cache helpers so mods stop hammering persistence APIs every turn.",
				"Example serialization patterns for booleans, counters, and small tables.",
			],
			internalTargets: ["Persistence docs", "Lua API Explorer", "Debug playbook"],
		},
		{
			title: "Localization + Markup Pack",
			focus: "Text keys",
			status: "First Batch",
			copy: "Generate a clean localization scaffold with working text keys and safe markup examples for UI, notifications, and civilopedia text.",
			deliverables: [
				"Language file starter with `TXT_KEY_` naming conventions and key grouping.",
				"Markup examples for `ICON`, `COLOR`, `LINK`, and `NEWLINE` usage.",
				"Copy blocks for summary text, help text, and notification text that stay easy to extend.",
			],
			internalTargets: ["Localization docs", "Text markup guide", "Notification recipes"],
		},
		{
			title: "VFS / UI Include Setup",
			focus: "Project wiring",
			status: "First Batch",
			copy: "Turn the VFS rules into a checklist so art, UI XML, and Lua includes land in the correct content actions the first time.",
			deliverables: [
				"Checklist for files that should be imported into VFS versus loaded through content actions.",
				"UI include patterns and filename guardrails for Lua include chains.",
				"Notes on common VFS-related failure cases that look like gameplay bugs but are project setup bugs.",
			],
			internalTargets: ["Project wiring docs", "Schema Browser", "ModInfo Builder"],
		},
		{
			title: "Debug Triage Checklist",
			focus: "Logs and tooling",
			status: "First Batch",
			copy: "Give newer modders a repeatable order of operations when a building does not appear, text keys fail, or Lua silently stops firing.",
			deliverables: [
				"Config and FireTuner reminders before testing begins.",
				"Log-first checklist for XML, SQL, Lua, VFS, and localization failures.",
				"Known symptom map for 'loads without errors' versus 'loaded into the wrong context'.",
			],
			internalTargets: ["Debug playbook", "Schema Browser", "Lua API Explorer"],
		},
		{
			title: "GameInfoTypes Lookup Pattern",
			focus: "Lua data access",
			status: "First Batch",
			copy: "Give recipes a standard way to resolve type names, validate rows, and stop hard-coding integer IDs into Lua.",
			deliverables: [
				"Type-to-ID lookups for units, buildings, promotions, and yields.",
				"Guard clauses for missing custom rows so bad content fails loudly during testing.",
				"Companion notes showing where the Methods workbook helps find the right API after the lookup.",
			],
			internalTargets: ["Schema Browser", "Lua API Explorer", "Methods workbook mapping"],
		},
	];

	const internalDocLanes = [
		{
			title: "Gameplay Hook Docs",
			copy: "Internal docs for event families, callback signatures, return behavior, and when to use GameEvents, Events, or LuaEvents.",
			links: [
				{ label: "Recipe Library", href: "/recipe-library" },
				{ label: "Lua API Explorer", href: "/lua-api-explorer" },
				{ label: "Wizard Generators", href: "/wizard-generators" },
			],
			planned: ["GameEvents workbook import", "Events import"],
		},
		{
			title: "Data Model Docs",
			copy: "Internal docs for table relationships, common side-table dependencies, and type lookups that should eventually cross-link straight into the Schema Browser.",
			links: [
				{ label: "Schema Browser", href: "/schema-browser" },
				{ label: "ModInfo Builder", href: "/modinfo-builder" },
				{ label: "Community Links", href: "/community-links" },
			],
			planned: ["Methods workbook import", "Type constant index"],
		},
		{
			title: "Text and UI Docs",
			copy: "Internal guides for localization, text markup, notifications, and UI include patterns so the team can keep examples up to date in one place.",
			links: [
				{ label: "Recipe Library", href: "/recipe-library" },
				{ label: "Community Links", href: "/community-links" },
			],
			planned: ["Localization docs", "Markup guide"],
		},
		{
			title: "Project Setup Docs",
			copy: "Internal guides for VFS, project actions, debug logging, and common failure patterns that can reference both recipes and future first-party browsers.",
			links: [
				{ label: "ModInfo Builder", href: "/modinfo-builder" },
				{ label: "Wizard Generators", href: "/wizard-generators" },
			],
			planned: ["Debug playbook", "VFS guide"],
		},
	];

	const researchBasisLinks = [
		{ label: "Civ5 XML Reference", href: "https://modiki.civfanatics.com/index.php/Civ5_XML_Reference" },
		{ label: "Debugging (Civ5)", href: "https://modiki.civfanatics.com/index.php/Debugging_%28Civ5%29" },
		{ label: "VFS (Civ5)", href: "https://modiki.civfanatics.com/index.php/VFS_%28Civ5%29" },
		{ label: "Localization Tutorial", href: "https://modiki.civfanatics.com/index.php/Localization_Tutorial_%28Civ5%29" },
		{ label: "Text icons and markups", href: "https://modiki.civfanatics.com/index.php/Text_icons_and_markups_%28Civ5%29" },
		{ label: "Persisting data", href: "https://modiki.civfanatics.com/index.php/Persisting_data_%28Civ5%29" },
	];

	const authoringDatasets = [
		{
			title: "GameEvents workbook",
			value: "89 entries",
			copy: "Local authoring workbook used as the definitive callback list while building the event-selection recipes.",
		},
		{
			title: "Methods workbook",
			value: "2,310 signatures",
			copy: "Local API index spanning 12 method families: Area, City, Deal, Fractal, Game, League, Map, Player, Plot, Team, TeamTech, and Unit.",
		},
	];

	const firstShipPrinciples = [
		"Ship recipes that reduce repeated setup work before building giant end-to-end project wizards.",
		"Move the durable knowledge into first-party docs so the team can revise examples without depending on external sites.",
		"Bias toward generators that help modders verify correctness: event routing, VFS wiring, localization, persistence, and logging.",
	];
</script>

<section class="recipe-page">
	<header class="hero recipe-hero">
		<p class="eyebrow">Research-Backed Buildout</p>
		<h1>Recipe Library</h1>
		<p>
			This page is no longer just a placeholder. It is the staging ground for small, trustworthy Civ V generators backed by Modiki references, Kael's guide, and the local workbooks you provided
			for GameEvents and API methods.
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
			<p>These are the compact generators with the highest leverage. Each one maps to a source-backed problem area where Civ V modders routinely lose time to wiring or syntax mistakes.</p>
		</div>

		<div class="recipe-grid recipe-grid--feature">
			{#each launchRecipes as recipe (recipe.title)}
				<article class="recipe-card">
					<div class="recipe-card-head">
						<div class="recipe-card-title-wrap">
							<span class="recipe-chip">{recipe.focus}</span>
							<h3>{recipe.title}</h3>
						</div>
						<span class="recipe-status">{recipe.status}</span>
					</div>

					<p>{recipe.copy}</p>

					<div class="recipe-block">
						<h4>Outputs</h4>
						<ul class="recipe-list">
							{#each recipe.deliverables as item (item)}
								<li>{item}</li>
							{/each}
						</ul>
					</div>

					<div class="recipe-block">
						<h4>Planned Internal Links</h4>
						<div class="recipe-tags">
							{#each recipe.internalTargets as target (target)}
								<span class="recipe-tag">{target}</span>
							{/each}
						</div>
					</div>
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
		gap: 1rem;
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
		gap: 1rem;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, transparent);
		border-radius: 1rem;
		box-shadow: 0 10px 28px var(--shadow-soft);
		padding: 1.35rem;
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
	.recipe-list li {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
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

	.recipe-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.9rem;
	}

	.recipe-grid--feature {
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
	}

	.recipe-card {
		display: grid;
		gap: 0.8rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 72%, transparent) 0%, color-mix(in oklch, var(--panel-bg) 86%, transparent) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 34%, var(--panel-border));
		border-radius: 0.9rem;
		padding: 1rem;
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

	.recipe-card-title-wrap {
		display: grid;
		gap: 0.45rem;
	}

	.recipe-chip,
	.recipe-status {
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

	.recipe-block {
		display: grid;
		gap: 0.45rem;
	}

	.recipe-block h4 {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in oklch, white 82%, var(--ink));
	}

	.recipe-list {
		display: grid;
		gap: 0.55rem;
		margin: 0;
		padding-inline-start: 1.1rem;
	}

	.recipe-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.recipe-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
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

	.recipe-link:hover {
		border-color: color-mix(in oklch, var(--accent) 42%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 12%, var(--control-bg));
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
