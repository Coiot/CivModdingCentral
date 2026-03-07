<script>
	const DISCORD_URL = "https://discord.gg/yf8jUXf";
	const REDDIT_URL = "https://old.reddit.com/r/civmoddingcentral/";
	const CURRENT_VERSION = "0.1.13";

	const featureCards = [
		{
			title: "New Upload",
			copy: "Create a brand new Civilization V legacy Workshop item with local .civ5mod content, preview image, title, description, visibility, and tags.",
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
		{
			title: "Logs and Validation",
			copy: "The uploader surfaces validation issues and Steam-side errors so you can see what happened during publish or update.",
		},
	];

	const downloadCards = [
		{
			title: "macOS",
			formats: "ZIP / DMG",
			status: "Available now",
			copy: `The current working release is the macOS build. Version ${CURRENT_VERSION} is the latest verified local package in the uploader project.`,
			actionLabel: "Download macOS Build",
			href: DISCORD_URL,
			available: true,
		},
		{
			title: "Linux",
			formats: "AppImage / DEB / TAR.GZ",
			status: "Coming soon",
			copy: "Linux downloads are currently being tested and are not ready to ship yet.",
			actionLabel: "Coming Soon",
			href: "",
			available: false,
		},
		{
			title: "Windows",
			formats: "EXE / ZIP",
			status: "Coming soon",
			copy: "Windows downloads are planned, but the release is still being tested and is not ready yet.",
			actionLabel: "Coming Soon",
			href: "",
			available: false,
		},
	];

	const requirements = [
		"Steam desktop client installed and logged into the account that owns or will publish the mod.",
		"Steam copy of Civilization V installed and configured.",
		"A ready .civ5mod file and preview image on local disk.",
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
			href: "/links",
			copy: "Use the Discord and other community hubs for release announcements, troubleshooting, and upload help.",
		},
	];
</script>

<section class="workshop-app-page">
	<header class="hero workshop-app-hero">
		<p class="eyebrow">Standalone Desktop App</p>
		<h1>CMC Workshop Uploader</h1>
		<p>Download the desktop uploader for Civilization V Workshop publishing and updates. The website handles prep tools; the standalone app handles the actual Steam upload workflow.</p>
	</header>

	<section class="workshop-app-panel">
		<div class="workshop-app-section-head">
			<span class="workshop-app-kicker">Use Cases</span>
			<h2>What the App Faciliates</h2>
		</div>

		<div class="workshop-app-feature-grid">
			{#each featureCards as card (card.title)}
				<article class="workshop-app-feature-card">
					<h3>{card.title}</h3>
					<p>{card.copy}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="workshop-app-panel">
		<div class="workshop-app-section-head">
			<h2>Download Status</h2>
			<p>Choose the finished desktop package for your platform.</p>
		</div>

		<div class="workshop-app-release-grid">
			{#each downloadCards as card (card.title)}
				<article class="workshop-app-release-card">
					<div class="workshop-app-release-head">
						<div>
							<h3>{card.title}</h3>
							<p>{card.copy}</p>
						</div>
						<span class="workshop-app-pill">{card.formats}</span>
					</div>
					<p class="workshop-app-release-status">{card.status}</p>
					{#if card.available}
						<a class="workshop-app-button is-full" href={card.href} target="_blank" rel="noopener noreferrer">{card.actionLabel}</a>
					{:else}
						<span class="workshop-app-button is-full is-disabled" aria-disabled="true">{card.actionLabel}</span>
					{/if}
				</article>
			{/each}
		</div>

		<div class="workshop-app-meta-grid">
			<section class="workshop-app-meta-card">
				<h3>Requirements</h3>
				<ul>
					{#each requirements as item (item)}
						<li>{@html item}</li>
					{/each}
				</ul>
			</section>

			<section class="workshop-app-meta-card">
				<h3>Install and Upload Flow</h3>
				<ol class="workshop-app-step-list">
					{#each installSteps as step (step)}
						<li>{@html step}</li>
					{/each}
				</ol>
			</section>
		</div>
	</section>

	<section class="workshop-app-panel">
		<div class="workshop-app-section-head">
			<h2>Use alongside the Web Tools</h2>
			<p>The app comes bundled with everything you need, but you can use some of the tools here independently.</p>
		</div>

		<div class="workshop-app-companion-grid">
			{#each companionTools as tool (tool.title)}
				<a class="workshop-app-companion-card" href={tool.href}>
					<h3>{tool.title}</h3>
					<p>{tool.copy}</p>
				</a>
			{/each}
		</div>
	</section>
</section>

<style>
	.workshop-app-page {
		display: grid;
		gap: 1rem;
	}

	.workshop-app-hero {
		border-color: color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		background: linear-gradient(135deg, color-mix(in oklch, var(--panel-bg) 90%, black) 0%, color-mix(in oklch, var(--panel-bg) 82%, var(--accent) 8%) 100%);
	}

	.workshop-app-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		min-block-size: 2.75rem;
		padding-inline: 0.95rem;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 80%, transparent);
		background: color-mix(in oklch, var(--control-bg) 72%, black);
		color: var(--ink);
		font-weight: 600;
		text-decoration: none;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background 140ms ease;
	}

	.workshop-app-button:hover {
		transform: translateY(-1px);
		border-color: color-mix(in oklch, var(--accent) 55%, var(--panel-border));
	}

	.workshop-app-button.is-full {
		inline-size: 100%;
	}

	.workshop-app-button.is-disabled {
		cursor: not-allowed;
		opacity: 0.6;
		pointer-events: none;
	}

	.workshop-app-panel {
		display: grid;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--panel-bg);
		box-shadow: 0 10px 26px var(--shadow-soft);
		border: 1px solid color-mix(in oklch, var(--panel-border) 78%, transparent);
		border-radius: 1rem;
	}

	.workshop-app-kicker {
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--accent) 68%, var(--ink));
	}

	.workshop-app-section-head {
		display: grid;
		gap: 0.35rem;

		& h2 {
			font-family: "Rockwell", "Palatino Linotype", serif;
		}

		& p {
			color: var(--muted-ink);
		}
	}

	.workshop-app-feature-grid,
	.workshop-app-release-grid,
	.workshop-app-companion-grid,
	.workshop-app-meta-grid {
		display: grid;
		gap: 0.8rem;
	}

	.workshop-app-feature-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.workshop-app-feature-card,
	.workshop-app-release-card,
	.workshop-app-meta-card,
	.workshop-app-companion-card {
		border-radius: 0.9rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 76%, transparent);
		background: color-mix(in oklch, var(--panel-bg) 88%, black);
		padding: 1.25rem;
	}

	.workshop-app-feature-card {
		display: grid;
		gap: 0.45rem;

		& h3 {
			font-family: "Rockwell", "Palatino Linotype", serif;
		}

		& p {
			color: var(--muted-ink);
		}
	}

	.workshop-app-release-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.workshop-app-release-card {
		display: grid;
		gap: 0.8rem;

		& h3 {
			font-family: "Rockwell", "Palatino Linotype", serif;
		}

		& p {
			color: var(--muted-ink);
		}
	}

	.workshop-app-release-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.workshop-app-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.22rem 0.55rem;
		border-radius: 999px;
		border: 1px solid color-mix(in oklch, var(--accent) 50%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 12%, transparent);
		color: var(--ink);
		font-size: 0.76rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.workshop-app-release-status {
		margin: 0;
		font-size: 0.82rem;
		color: color-mix(in oklch, var(--accent) 70%, var(--ink));
	}

	.workshop-app-meta-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.workshop-app-meta-card {
		& h3 {
			font-family: "Rockwell", "Palatino Linotype", serif;
		}

		& ul {
			margin-block-start: 0.8rem;
			padding-inline-start: 1.1rem;
			display: grid;
			gap: 0.4rem;
		}

		& li {
			color: var(--muted-ink);
		}
	}

	.workshop-app-step-list {
		padding-inline-start: 1.2rem;
		display: grid;
		gap: 0.55rem;

		& li {
			color: var(--muted-ink);
		}
	}

	.workshop-app-companion-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.workshop-app-companion-card {
		display: grid;
		gap: 0.45rem;
		color: var(--ink);
		text-decoration: none;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background 140ms ease;

		& h3 {
			font-family: "Rockwell", "Palatino Linotype", serif;
		}

		& p {
			color: var(--muted-ink);
		}
	}

	.workshop-app-companion-card:hover {
		transform: translateY(-1px);
		border-color: color-mix(in oklch, var(--accent) 55%, var(--panel-border));
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--accent) 6%);
	}

	:global(:root[data-theme="light"]) .workshop-app-page {
		.workshop-app-hero {
			background: linear-gradient(135deg, color-mix(in oklch, white 78%, var(--panel-bg)) 0%, color-mix(in oklch, white 70%, var(--accent) 8%) 100%);
			border-color: color-mix(in oklch, var(--panel-border) 84%, var(--accent) 16%);
		}

		.workshop-app-panel {
			background: color-mix(in oklch, white 86%, var(--panel-bg));
			border-color: color-mix(in oklch, var(--panel-border) 88%, var(--accent) 12%);
		}

		.workshop-app-feature-card,
		.workshop-app-release-card,
		.workshop-app-meta-card,
		.workshop-app-companion-card {
			background: color-mix(in oklch, white 82%, var(--panel-bg));
			border-color: color-mix(in oklch, var(--panel-border) 86%, var(--accent) 14%);
		}

		.workshop-app-button {
			background: color-mix(in oklch, white 76%, var(--control-bg));
			border-color: color-mix(in oklch, var(--panel-border) 86%, var(--accent) 14%);
		}

		.workshop-app-button.is-disabled {
			background: color-mix(in oklch, white 70%, var(--control-bg));
			color: color-mix(in oklch, var(--ink) 54%, white 46%);
		}

		.workshop-app-pill {
			background: color-mix(in oklch, var(--accent) 16%, white 84%);
			border-color: color-mix(in oklch, var(--accent) 34%, var(--panel-border));
		}

		.workshop-app-companion-card:hover {
			background: color-mix(in oklch, white 74%, var(--accent) 10%);
		}

		.workshop-app-section-head p,
		.workshop-app-feature-card p,
		.workshop-app-release-card p,
		.workshop-app-meta-card li,
		.workshop-app-companion-card p,
		.workshop-app-step-list li,
		.workshop-app-release-status {
			color: color-mix(in oklch, var(--ink) 58%, var(--muted-ink));
		}
	}

	@media (max-width: 980px) {
		.workshop-app-feature-grid,
		.workshop-app-release-grid,
		.workshop-app-meta-grid,
		.workshop-app-companion-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.workshop-app-release-head {
			flex-direction: column;
			align-items: start;
		}

		.workshop-app-button {
			inline-size: 100%;
		}
	}
</style>
