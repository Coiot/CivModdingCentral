<script>
	import { CURRENT_VERSION, workshopUploaderDownloadCards as downloadCards } from "../data/workshopUploaderReleaseData.js";
	import ToolCompanionPanel from "./ToolCompanionPanel.svelte";

	const featureCards = [
		{
			title: "OS Agnostic",
			copy: "The app is cross-platform, offering access to uploading Civ V mods for the first time to macOS and Linux with a streamlined Steam Workshop upload process.",
		},
		{
			title: "New Uploads",
			copy: "Create a brand new Civilization V Workshop item with your own.civ5mod, preview image, title, description, visibility, and tags.",
		},
		{
			title: "Update Existing",
			copy: "Keep the same publishedfileid while replacing content, preview, metadata, tags, and change notes from one native workflow.",
		},
		{
			title: "My Workshop Items",
			copy: "Load your current Steam account's published items and prefill the update form from the item you want to maintain.",
		},
		{
			title: "Built-in Mod Tools",
			copy: "The desktop app includes Civ V-focused .modinfo and .civ5mod helpers so packaging and uploading is fast and in one place.",
		},
		{
			title: "Contemporary Steam Uploading",
			copy: "A faster and more feature-rich ModBuddy replacement for Workshop uploads now that the 2010-era tool is unsupported with no longer public components.",
		},
	];

	const requirements = [
		"Steam desktop client logged into the account that owns or will publish the mod.",
		"Steam copy of Civilization V installed.",
		"A ready .civ5mod file and preview image on your local disk.",
		"For updates, the correct publishedfileid selected from <strong>My Workshop Items</strong> or the mod's workshop id in its URL.",
	];

	const installSteps = [
		"Download the desktop package for your platform.",
		"Open the app and choose <strong>New Upload</strong> or <strong>Update Existing</strong>.",
		"If you are updating, use <strong>My Workshop Items</strong> to prefill the correct item and avoid editing the wrong publishedfileid.",
		"Select your .civ5mod file, preview image, and metadata, then commit the upload.",
		"Verify the resulting Workshop page in Steam after the upload completes.",
	];

	const companionTools = [
		{
			title: ".modinfo Builder",
			href: "/modinfo-builder",
			copy: "Generate file lists, MD5 hashes, actions, references, and dependencies before packaging.",
		},
		{
			title: ".civ5mod Ziper",
			href: "/civ5mod-ziper",
			copy: "Optionaly build a Civ V-compatible .civ5mod archive in the browser before handing it off to the desktop uploader.",
		},
		{
			title: "Community Links",
			href: "/community-links",
			copy: "Use the Discord and other community hubs for release announcements, troubleshooting, and upload help.",
		},
	];
</script>

<section class="workshop-app-page stack">
	<header class="page-hero page-hero--publish workshop-app-hero">
		<p class="eyebrow">Standalone Desktop App</p>
		<h1>CMC Workshop Uploader</h1>
		<p>Download the desktop uploader for Civilization V Workshop publishing and updates. The website handles prep tools; the standalone app handles the actual Steam upload workflow.</p>
	</header>

	<section class="surface-panel surface-panel--publish surface-panel--spacious workshop-app-panel">
		<div class="section-head section-head-tight">
			<span class="workshop-app-kicker uppercase">Use Cases</span>
			<h2 class="section-title">What the App Faciliates</h2>
		</div>

		<div class="workshop-app-feature-grid">
			{#each featureCards as card (card.title)}
				<article class="workshop-app-feature-card">
					<h3 class="card-title">{card.title}</h3>
					<p class="card-copy">{card.copy}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="surface-panel surface-panel--publish surface-panel--spacious workshop-app-panel">
		<div class="section-head section-head-tight">
			<h2 class="section-title">Download Status</h2>
			<p class="section-copy">Choose the finished desktop package for your platform.</p>
		</div>

		<div class="workshop-app-release-grid">
			{#each downloadCards as card (card.title)}
				{#if card.available}
					<a class="workshop-app-release-card workshop-app-release-link-card" href={card.href} target="_blank" rel="noopener noreferrer">
						<div class="workshop-app-release-head stack">
							<div class="workshop-app-release-title-row inline">
								<h3 class="card-title">{card.title}</h3>
								<span class="workshop-app-pill">{card.formats}</span>
							</div>
							<p class="card-copy">{card.copy}</p>
						</div>
						<span class="workshop-app-button is-full" aria-hidden="true">{card.actionLabel}</span>
					</a>
				{:else}
					<article class="workshop-app-release-card">
						<div class="workshop-app-release-head stack">
							<div class="workshop-app-release-title-row inline">
								<h3 class="card-title">{card.title}</h3>
								<span class="workshop-app-pill">{card.formats}</span>
							</div>
							<p class="card-copy">{card.copy}</p>
						</div>
						<span class="workshop-app-button is-full is-disabled" aria-disabled="true">{card.actionLabel}</span>
					</article>
				{/if}
			{/each}
		</div>

		<div class="workshop-app-meta-grid">
			<section class="workshop-app-meta-card">
				<h3 class="card-title">Requirements</h3>
				<ul>
					{#each requirements as item (item)}
						<li>{@html item}</li>
					{/each}
				</ul>
			</section>

			<section class="workshop-app-meta-card">
				<h3 class="card-title">Install and Upload Flow</h3>
				<ol class="workshop-app-step-list">
					{#each installSteps as step (step)}
						<li>{@html step}</li>
					{/each}
				</ol>
			</section>
		</div>
	</section>

	<ToolCompanionPanel copy="The app comes bundled with everything you need, but you can use the tools here independently." tools={companionTools} />
</section>

<style>
	.workshop-app-page {
		display: grid;
		gap: 1rem;
		--workshop-accent-border: var(--surface-publish-border);
		--workshop-accent-highlight: var(--surface-publish-highlight);
		--workshop-accent-highlight-strong: var(--surface-publish-highlight-strong);
		--workshop-accent-panel: var(--surface-publish-panel);
	}

	.workshop-app-hero {
		background:
			/*radial-gradient(120% 140% at 100% 0%, color-mix(in oklch, var(--workshop-accent-highlight) 16%, transparent) 0%, transparent 52%),*/ linear-gradient(
			135deg,
			color-mix(in oklch, var(--workshop-accent-panel) 92%, black 8%) 0%,
			color-mix(in oklch, var(--workshop-accent-panel) 95%, var(--workshop-accent-highlight) 5%) 100%
		);
		border-color: color-mix(in oklch, var(--workshop-accent-highlight) 64%, var(--workshop-accent-border));
	}

	.workshop-app-panel {
		background: color-mix(in oklch, var(--workshop-accent-panel) 20%, var(--panel-bg));
		border: 1px solid color-mix(in oklch, var(--workshop-accent-border) 40%, transparent);
	}

	.workshop-app-kicker {
		color: color-mix(in oklch, var(--workshop-accent-highlight) 90%, var(--ink));
		text-transform: uppercase;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		margin-block-end: 0.25rem;
	}

	.workshop-app-feature-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.workshop-app-feature-grid,
	.workshop-app-release-grid,
	.workshop-app-meta-grid {
		display: grid;
		gap: 1rem;
	}

	.workshop-app-feature-card {
		gap: 0.5rem;
	}

	.workshop-app-feature-card .card-title {
		font-size: 1.25rem;
	}

	.workshop-app-feature-card,
	.workshop-app-release-card,
	.workshop-app-meta-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		background: color-mix(in oklch, var(--workshop-accent-panel) 40%, var(--panel-bg));
		border: 1px solid color-mix(in oklch, var(--workshop-accent-border) 95%, transparent);
		border-radius: 0.9rem;
		box-shadow: 0 4px 6px #111;
		padding: 1.25rem;
	}

	.workshop-app-release-card .card-title {
		font-size: 1.5rem;
		text-shadow: 1px 1px 2px #000;
	}

	.workshop-app-release-title-row .card-title {
		text-box: trim-both cap alphabetic;
	}

	.workshop-app-release-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.workshop-app-release-card {
		position: relative;
		display: grid;
		gap: 0.8rem;
		background:
			radial-gradient(120% 95% at 100% 0%, color-mix(in oklch, var(--workshop-accent-highlight) 30%, transparent) 0%, transparent 58%),
			linear-gradient(
				135deg,
				color-mix(in oklch, var(--workshop-accent-panel) 90%, color-mix(in oklch, #1a100c 20%, var(--workshop-accent-highlight) 20%) 26%) 0%,
				color-mix(in oklch, var(--panel-bg) 85%, color-mix(in oklch, #2a140d 56%, #e67e23 44%) 10%) 24%,
				color-mix(in oklch, var(--panel-bg) 85%, color-mix(in oklch, #3c1a0f 40%, #f39c12 60%) 12%) 50%,
				color-mix(in oklch, var(--panel-bg) 90%, color-mix(in oklch, #4a2312 48%, #ff9f43 52%) 10%) 76%,
				color-mix(in oklch, var(--panel-bg) 95%, color-mix(in oklch, #24140d 66%, #d97706 34%) 16%) 100%
			);

		box-shadow:
			0 1px 0 color-mix(in oklch, var(--workshop-accent-highlight) 50%, transparent),
			0 4px 8px color-mix(in oklch, black 80%, var(--workshop-accent-highlight) 20%);
		border-color: color-mix(in oklch, var(--workshop-accent-highlight) 80%, var(--workshop-accent-border));
		overflow: clip;
		transition:
			transform 170ms ease,
			border-color 170ms ease,
			background 170ms ease,
			box-shadow 170ms ease;
	}

	.workshop-app-release-card::after {
		position: absolute;
		inset: auto -25% -42% auto;
		inline-size: 12rem;
		aspect-ratio: 1;
		opacity: 0.25;
		background: radial-gradient(circle, color-mix(in oklch, var(--workshop-accent-highlight) 10%, transparent) 0%, transparent 70%);
		transition: opacity 170ms ease;
		content: "";
		pointer-events: none;
	}

	.workshop-app-release-card:has(.workshop-app-button:hover) .workshop-app-pill,
	.workshop-app-release-card:has(.workshop-app-button:focus-visible) .workshop-app-pill {
		background: color-mix(in oklch, var(--workshop-accent-highlight) 22%, transparent);
		border-color: color-mix(in oklch, var(--workshop-accent-highlight) 90%, var(--workshop-accent-border));
	}

	.workshop-app-release-card:hover,
	.workshop-app-release-card:focus-within,
	.workshop-app-release-card:has(.workshop-app-button:hover),
	.workshop-app-release-card:has(.workshop-app-button:focus-visible) {
		background:
			radial-gradient(120% 95% at 100% 0%, color-mix(in oklch, var(--workshop-accent-highlight) 18%, transparent) 0%, transparent 60%),
			linear-gradient(
				135deg,
				color-mix(in oklch, var(--workshop-accent-panel) 80%, color-mix(in oklch, #1a100c 70%, var(--workshop-accent-highlight) 30%) 36%) 0%,
				color-mix(in oklch, var(--panel-bg) 75%, color-mix(in oklch, #2a140d 56%, #e67e23 44%) 20%) 24%,
				color-mix(in oklch, var(--panel-bg) 75%, color-mix(in oklch, #3c1a0f 40%, #f39c12 60%) 22%) 50%,
				color-mix(in oklch, var(--panel-bg) 80%, color-mix(in oklch, #4a2312 48%, #ff9f43 52%) 20%) 76%,
				color-mix(in oklch, var(--panel-bg) 85%, color-mix(in oklch, #24140d 66%, #d97706 34%) 26%) 100%
			);
		box-shadow:
			0 1px 0 color-mix(in oklch, var(--workshop-accent-highlight) 20%, transparent),
			0 6px 6px color-mix(in oklch, black 70%, var(--workshop-accent-highlight) 30%);
		border-color: color-mix(in oklch, var(--workshop-accent-highlight) 90%, var(--workshop-accent-border));
		transform: translateY(-2px);
	}

	.workshop-app-release-card:hover::after,
	.workshop-app-release-card:focus-within::after,
	.workshop-app-release-card:has(.workshop-app-button:hover)::after,
	.workshop-app-release-card:has(.workshop-app-button:focus-visible)::after {
		opacity: 0.5;
	}

	.workshop-app-release-link-card {
		color: var(--ink);
		text-decoration: none;
		cursor: pointer;
	}

	.workshop-app-release-head {
		display: grid;
		gap: 1rem;
	}

	.workshop-app-release-title-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.workshop-app-pill {
		display: inline-flex;
		flex: 0 0 auto;
		justify-content: center;
		align-items: center;
		color: var(--ink);
		white-space: nowrap;
		font-size: 0.76rem;
		font-weight: 700;
		background: color-mix(in oklch, var(--workshop-accent-highlight) 30%, transparent);
		border: 1px solid color-mix(in oklch, var(--workshop-accent-highlight) 90%, var(--workshop-accent-border));
		border-radius: 999px;
		padding-block: 0.22rem;
		padding-inline: 0.55rem;
		margin-inline-start: auto;
		text-shadow: 1px 1px 2px #000;
	}

	.workshop-app-button {
		min-block-size: 3rem;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 0.35rem;
		color: var(--ink);
		text-decoration: none;
		font-weight: 600;
		background: color-mix(in oklch, var(--workshop-accent-panel) 70%, black);
		border: 1px solid color-mix(in oklch, var(--workshop-accent-border) 80%, var(--workshop-accent-highlight));
		border-radius: 0.75rem;
		padding-inline: 1rem;
		margin-block-start: auto;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background 140ms ease;
	}

	.workshop-app-button:hover {
		background: color-mix(in oklch, var(--workshop-accent-highlight) 15%, #000) !important;
		box-shadow: 0 4px 12px color-mix(in oklch, var(--workshop-accent-highlight) 18%, transparent);
		border-color: color-mix(in oklch, var(--workshop-accent-highlight) 55%, var(--workshop-accent-border)) !important;
		transform: translateY(-1px);
	}

	.workshop-app-button.is-disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}

	.workshop-app-button.is-full {
		inline-size: 100%;
	}

	.workshop-app-meta-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.workshop-app-meta-card {
		& ul {
			display: grid;
			gap: 0.4rem;
			padding-inline-start: 1.1rem;
		}

		& li {
			color: var(--muted-ink);
		}
	}

	.workshop-app-step-list {
		display: grid;
		gap: 0.55rem;
		padding-inline-start: 1.2rem;

		& li {
			color: var(--muted-ink);
		}
	}

	@media (max-width: 980px) {
		.workshop-app-feature-grid,
		.workshop-app-release-grid,
		.workshop-app-meta-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.workshop-app-button {
			inline-size: 100%;
		}
	}
</style>
