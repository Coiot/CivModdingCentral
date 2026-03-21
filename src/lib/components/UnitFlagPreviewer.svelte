<script>
	const previewScenes = [
		{
			id: "open-field",
			label: "Open Terrain",
			copy: "Check whether the emblem still reads when the banner sits against bright sand, grass, and warm daylight.",
			state: "Readable",
			tone: "is-sun",
			bannerTone: "is-crimson",
			emblem: "Spear",
		},
		{
			id: "forest",
			label: "Dense Forest",
			copy: "Check edge separation and silhouette clarity when the flag lives over darker greens and noisy backgrounds.",
			state: "Needs edge pass",
			tone: "is-forest",
			bannerTone: "is-emerald",
			emblem: "Oak",
		},
		{
			id: "snow",
			label: "Snow / Fog",
			copy: "Check light-on-light collisions, alpha fringing, and whether the shape survives low-contrast conditions.",
			state: "Check alpha",
			tone: "is-frost",
			bannerTone: "is-azure",
			emblem: "Crown",
		},
	];

	const plannedChecks = [
		{
			title: "Team Color Readability",
			copy: "Preview the unit flag under different cloth colors before you discover in-game that the emblem disappears into the banner.",
		},
		{
			title: "Alpha Edge Inspection",
			copy: "Spot fringe, haloing, and muddy edges from PNG or DDS preparation while the asset is still easy to fix.",
		},
		{
			title: "Distance + Clutter Check",
			copy: "See whether the mark still reads at actual gameplay scale instead of only in a clean art editor canvas.",
		},
		{
			title: "Atlas Slot Confidence",
			copy: "Verify that the crop, padding, and unit-flag framing feel correct before export and DDS conversion.",
		},
	];

	const toolPanels = [
		{
			title: "Planned Inputs",
			items: ["Drop in a unit emblem PNG", "Swap banner / cloth color", "Toggle dark and bright battlefield presets", "Compare alpha-on and alpha-off edges"],
		},
		{
			title: "Planned Output Checks",
			items: ["Readable at gameplay size", "No fuzzy or clipped edges", "Strong contrast against terrain", "Ready for atlas and DDS handoff"],
		},
	];

	const workflowSteps = [
		{
			kicker: "Step 1",
			title: "Load the emblem",
			copy: "Start from the alpha or source art you already intend to use for the unit flag. The tool should make weak silhouettes obvious immediately.",
		},
		{
			kicker: "Step 2",
			title: "Stress test the banner",
			copy: "Flip through multiple cloth colors and battlefield backgrounds to catch combinations that collapse visually.",
		},
		{
			kicker: "Step 3",
			title: "Export with confidence",
			copy: "Once the emblem survives bright, dark, and low-contrast checks, push it onward to DDS and atlas packaging.",
		},
	];

	const companionLinks = [
		{
			href: "/civ-icon-maker",
			label: "Icon Maker",
			copy: "Use it when the unit emblem still needs cleanup, color tuning, or a stronger source render.",
			tone: "is-tool",
		},
		{
			href: "/dds-converter",
			label: "DDS Converter",
			copy: "Move the approved flag art into Civ V-ready DDS outputs once the preview pass is complete.",
			tone: "is-tool",
		},
		{
			href: "/pattern-library",
			label: "Pattern Library",
			copy: "Pair the visual asset pass with the implementation patterns that wire unit content into the game.",
			tone: "is-pattern",
		},
	];
</script>

<section class="unit-flag-page">
	<header class="hero unit-flag-hero">
		<div class="unit-flag-hero-copy stack">
			<p class="eyebrow">Art & UI Helper</p>
			<h1>Unit Flag Previewer</h1>
			<p>
				Preview how unit flag art actually reads before export. This first pass is a visual design mock for a future helper focused on banner contrast, alpha edges, and battlefield
				readability.
			</p>
		</div>

		<div class="unit-flag-hero-meta stack">
			<article class="unit-flag-meta-card">
				<span>Status</span>
				<strong>Design Preview</strong>
				<p>Hidden route for shaping the tool before it joins the main site navigation.</p>
			</article>
			<article class="unit-flag-meta-card">
				<span>Focus</span>
				<strong>Unit Flag Readability</strong>
				<p>Built around the common Civ V problem of art that looks fine in isolation but weak in actual play.</p>
			</article>
		</div>
	</header>

	<section class="unit-flag-panel unit-flag-stage">
		<div class="unit-flag-stage-copy stack">
			<p class="eyebrow">Planned Interface</p>
			<h2>A mock workbench for testing banner strength before the DDS stage</h2>
			<p>The final tool should answer one question fast: will this unit flag still read once Civ V puts it on top of noisy terrain, team color, and gameplay scale?</p>

			<div class="unit-flag-check-grid">
				{#each plannedChecks as check (check.title)}
					<article class="unit-flag-check-card">
						<h3>{check.title}</h3>
						<p>{check.copy}</p>
					</article>
				{/each}
			</div>
		</div>

		<div class="unit-flag-preview-shell">
			<div class="unit-flag-preview-frame">
				<div class="unit-flag-preview-head inline">
					<div>
						<p class="eyebrow">Preview Presets</p>
						<h3>Readability Stress Test</h3>
					</div>
					<span class="unit-flag-preview-pill uppercase">Concept Layout</span>
				</div>

				<div class="unit-flag-scene-stack">
					{#each previewScenes as scene (scene.id)}
						<article class={["unit-flag-scene-card", scene.tone]}>
							<div class="unit-flag-scene-copy">
								<div class="unit-flag-scene-head inline">
									<strong>{scene.label}</strong>
									<span>{scene.state}</span>
								</div>
								<p>{scene.copy}</p>
							</div>
							<div class="unit-flag-scene-visual" aria-hidden="true">
								<div class="unit-token"></div>
								<div class={["unit-flag-banner", scene.bannerTone]}>
									<div class="unit-flag-emblem">{scene.emblem}</div>
								</div>
							</div>
						</article>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section class="unit-flag-panel unit-flag-plan-grid">
		<div class="unit-flag-column stack">
			<div class="section-heading">
				<p class="eyebrow">Tool Shape</p>
				<h2>What this helper should eventually do</h2>
				<p>This page is the first pass at the product shape: what the tool needs to inspect, and what confidence it should give before the asset leaves the art pipeline.</p>
			</div>

			<div class="unit-flag-tool-grid">
				{#each toolPanels as panel (panel.title)}
					<article class="unit-flag-tool-card">
						<h3>{panel.title}</h3>
						<ul>
							{#each panel.items as item (`${panel.title}-${item}`)}
								<li>{item}</li>
							{/each}
						</ul>
					</article>
				{/each}
			</div>
		</div>

		<div class="unit-flag-column stack">
			<div class="section-heading">
				<p class="eyebrow">Workflow</p>
				<h2>Where it would sit in the pipeline</h2>
				<p>It belongs after emblem creation and before final DDS/export work, acting as the quick “does this survive actual gameplay conditions?” checkpoint.</p>
			</div>

			<div class="unit-flag-step-list">
				{#each workflowSteps as step (step.title)}
					<article class="unit-flag-step-card">
						<span>{step.kicker}</span>
						<h3>{step.title}</h3>
						<p>{step.copy}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="unit-flag-panel unit-flag-companions">
		<div class="section-heading">
			<p class="eyebrow">Companion Surfaces</p>
			<h2>The other tools this page should hand off to</h2>
			<p>The previewer should not replace the rest of the art pipeline. It should sit between source art cleanup and final export, then pass work along cleanly.</p>
		</div>

		<div class="unit-flag-companion-grid">
			{#each companionLinks as link (link.href)}
				<a class={["unit-flag-companion-card", link.tone]} href={link.href}>
					<h3>{link.label}</h3>
					<p>{link.copy}</p>
				</a>
			{/each}
		</div>
	</section>
</section>

<style>
	.unit-flag-page {
		display: grid;
		gap: 1.8rem;
	}

	.unit-flag-page p,
	.unit-flag-page li,
	.unit-flag-preview-pill,
	.unit-flag-meta-card span,
	.unit-flag-step-card span,
	.unit-flag-scene-head span {
		color: rgba(239, 231, 222, 0.82);
		font-family: "Montserrat", "Trebuchet MS", sans-serif;
		line-height: 1.55;
		margin: 0;
	}

	.unit-flag-hero {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.8fr);
		align-items: stretch;
		gap: 1.25rem;
	}

	.unit-flag-hero,
	.unit-flag-panel {
		position: relative;
		background:
			radial-gradient(circle at top right, rgba(247, 123, 75, 0.16), transparent 34%), radial-gradient(circle at bottom left, rgba(61, 96, 186, 0.12), transparent 32%),
			linear-gradient(180deg, rgba(11, 15, 26, 0.94), rgba(8, 11, 18, 0.98));
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.06),
			0 20px 46px rgba(0, 0, 0, 0.34);
		border: 1px solid rgba(247, 123, 75, 0.28);
		border-radius: 30px;
		padding-inline: 2vw;
		padding-block-start: clamp(1.4rem, ; padding-block-end: 2rem);
	}

	.unit-flag-hero-copy h1 {
		max-width: 12ch;
		font-size: clamp(2.5rem, 5vw, 4.2rem);
	}

	.unit-flag-hero-copy h1,
	.unit-flag-panel h2,
	.unit-flag-preview-frame h3,
	.unit-flag-check-card h3,
	.unit-flag-tool-card h3,
	.unit-flag-step-card h3,
	.unit-flag-companion-card h3 {
		color: #fff7ef;
		font-family: "Roboto Slab", "Georgia", serif;
		line-height: 1.05;
		margin: 0;
	}

	.unit-flag-hero-copy,
	.unit-flag-hero-meta,
	.unit-flag-stage-copy,
	.unit-flag-preview-frame,
	.unit-flag-tool-card,
	.unit-flag-step-card,
	.unit-flag-companion-card,
	.unit-flag-meta-card,
	.unit-flag-check-card,
	.unit-flag-scene-card {
		gap: 0.75rem;
	}

	.unit-flag-hero-meta {
		align-content: start;
	}

	.unit-flag-meta-card {
		background: linear-gradient(180deg, rgba(22, 26, 39, 0.9), rgba(14, 18, 29, 0.95));
		border: 1px solid rgba(247, 123, 75, 0.24);
		border-radius: 24px;
		padding-block: 1rem;
		padding-inline: 1.05rem;
	}

	.unit-flag-meta-card span,
	.unit-flag-step-card span {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.16em;
	}

	.unit-flag-meta-card strong,
	.unit-flag-scene-head strong {
		color: #fff6ee;
		font-family: "Roboto Slab", "Georgia", serif;
		font-size: 1.1rem;
	}

	.unit-flag-stage {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(19rem, 0.92fr);
		gap: 1.25rem;
	}

	.unit-flag-check-grid,
	.unit-flag-tool-grid,
	.unit-flag-companion-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem;
	}

	.unit-flag-check-card,
	.unit-flag-tool-card,
	.unit-flag-step-card {
		background: linear-gradient(180deg, rgba(21, 25, 38, 0.92), rgba(13, 16, 25, 0.98));
		border: 1px solid rgba(247, 123, 75, 0.18);
		border-radius: 22px;
		padding-block: 1rem;
		padding-inline: 1.05rem;
	}

	.unit-flag-preview-shell {
		display: grid;
	}

	.unit-flag-preview-frame {
		background: radial-gradient(circle at top right, rgba(247, 123, 75, 0.18), transparent 30%), linear-gradient(180deg, rgba(15, 19, 31, 0.98), rgba(10, 13, 22, 1));
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.06),
			0 16px 34px rgba(0, 0, 0, 0.34);
		border: 1px solid rgba(247, 123, 75, 0.28);
		border-radius: 26px;
		padding: 1.05rem;
	}

	.unit-flag-preview-head,
	.unit-flag-scene-head {
		justify-content: space-between;
		gap: 1rem;
	}

	.unit-flag-preview-pill {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		background: rgba(247, 123, 75, 0.11);
		border: 1px solid rgba(247, 123, 75, 0.35);
		border-radius: 999px;
		padding-block: 0.35rem;
		padding-inline: 0.75rem;
	}

	.unit-flag-scene-stack,
	.unit-flag-step-list {
		display: grid;
		gap: 0.9rem;
	}

	.unit-flag-scene-visual {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.unit-token {
		width: 2.3rem;
		height: 2.3rem;
		background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.5), rgba(20, 25, 40, 0.9));
		box-shadow: 0 0 0 0.3rem rgba(255, 255, 255, 0.06);
		border: 2px solid rgba(255, 255, 255, 0.44);
		border-radius: 50%;
	}

	.unit-flag-emblem {
		min-width: 3.5rem;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		color: #fff4e8;
		font-family: "Roboto Slab", "Georgia", serif;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		background: rgba(10, 13, 18, 0.68);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 999px;
		padding-block: 0.18rem;
		padding-inline: 0.5rem;
	}

	.unit-flag-plan-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
	}

	.unit-flag-column {
		gap: 1rem;
	}

	.unit-flag-tool-card ul {
		display: grid;
		gap: 0.45rem;
		padding-left: 1.1rem;
		margin: 0;
	}

	.unit-flag-companion-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	a.unit-flag-companion-card:hover,
	a.unit-flag-companion-card:focus-visible {
		background: radial-gradient(circle at top right, rgba(247, 123, 75, 0.12), transparent 28%), linear-gradient(180deg, rgba(22, 27, 40, 0.96), rgba(14, 18, 29, 1));
		box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
		border-color: rgba(247, 123, 75, 0.4);
		transform: translateY(-2px);
	}

	.unit-flag-banner {
		position: relative;
		min-width: 6.6rem;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.16),
			0 10px 24px rgba(0, 0, 0, 0.28);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 16px 0 0 16px;
		padding-block-start: 0.55rem;
		padding-block-end: 0.55rem;
		padding-inline-start: 0.9rem;
		padding-inline-end: 1rem;
		clip-path: polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%);
	}

	.unit-flag-banner.is-azure {
		background: linear-gradient(135deg, #24548c, #5396d8);
	}

	.unit-flag-banner.is-crimson {
		background: linear-gradient(135deg, #8f321e, #cc5f2e);
	}

	.unit-flag-banner.is-emerald {
		background: linear-gradient(135deg, #176247, #2ea070);
	}

	.unit-flag-companion-card {
		text-decoration: none;
		background: linear-gradient(180deg, rgba(19, 23, 36, 0.92), rgba(12, 16, 25, 0.98));
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 22px;
		padding-block: 1rem;
		padding-inline: 1.05rem;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			box-shadow 160ms ease,
			background 160ms ease;
	}

	.unit-flag-companion-card.is-pattern {
		border-color: rgba(255, 205, 102, 0.25);
	}

	.unit-flag-scene-card {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 22px;
		padding: 1rem;
	}

	.unit-flag-scene-card.is-forest {
		background: radial-gradient(circle at right center, rgba(82, 188, 126, 0.2), transparent 32%), linear-gradient(135deg, rgba(21, 53, 38, 0.84), rgba(18, 24, 35, 0.95));
	}

	.unit-flag-scene-card.is-frost {
		background: radial-gradient(circle at right center, rgba(135, 190, 255, 0.2), transparent 32%), linear-gradient(135deg, rgba(57, 70, 98, 0.86), rgba(18, 23, 37, 0.96));
	}

	.unit-flag-scene-card.is-sun {
		background: radial-gradient(circle at right center, rgba(255, 190, 113, 0.24), transparent 32%), linear-gradient(135deg, rgba(79, 52, 31, 0.7), rgba(24, 29, 44, 0.94));
	}

	@media (max-width: 1024px) {
		.unit-flag-hero,
		.unit-flag-stage,
		.unit-flag-plan-grid {
			grid-template-columns: 1fr;
		}

		.unit-flag-companion-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.unit-flag-hero,
		.unit-flag-panel {
			padding: 1.1rem;
			border-radius: 24px;
		}

		.unit-flag-check-grid,
		.unit-flag-tool-grid {
			grid-template-columns: 1fr;
		}

		.unit-flag-scene-card {
			grid-template-columns: 1fr;
		}

		.unit-flag-preview-head,
		.unit-flag-scene-head {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
