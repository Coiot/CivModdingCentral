<script>
	import QuickJumpPalette from "./QuickJumpPalette.svelte";

	let {
		authEnabled = false,
		authUser = null,
		authEmail = "",
		authMessage = "",
		authAccessDebug = "",
		authLoading = false,
		authAccessAllowed = false,
		authAccessLoading = false,
		authAccessChecked = false,
		onAuthEmailInput = () => {},
		onSendMagicLink = () => {},
		onLogout = () => {},
		onQuickJump = () => {},
		currentPath = "/",
	} = $props();

	const NAV_GROUPS = [
		{
			id: "learn",
			kicker: "Learn",
			label: "Tutorials & Recipes",
			description: "Follow guided tutorials and starters to get started with Civ V modding.",
			panelTitle: "Learning Paths",
			panelCopy: "Use these when you need help getting started or inspiration for your next mod.",
			links: [
				{
					href: "/guided-planner",
					label: "Guided Planner",
					description: "Mod planner with progression tracking guide filled with advice, references, and tutorials.",
				},
				{
					href: "/template-generators",
					label: "Template Generators",
					description: "Step-by-step generators for setting up a new civ mod from a starter template.",
				},
				{
					href: "/pattern-library",
					label: "Pattern Library",
					description: "Curated set of coded patterns and repeatable setup recipes.",
				},
				{
					href: "/tutorials",
					label: "Tutorials",
					description: "Walkthroughs for setup, uniques, art, UI, and 3D assets.",
					disabled: true,
					statusLabel: "Coming Soon",
				},

				{
					href: "/community-links",
					label: "Community Links",
					description: "Civ V modding references, utilities, and community resources.",
				},
			],
		},

		{
			id: "reference",
			kicker: "Reference",
			label: "Reference & Viewers",
			description: "Inspect game data, modded content, and map systems.",
			panelTitle: "Data & Inspection",
			panelCopy: "Use these when you need schema lookup, visual inspection tools, or existing mod references.",
			links: [
				{
					href: "/schema-browser",
					label: "Schema Browser",
					description: "Search through the entire Civ V database. Inspect every column and row data with helpful filters.",
				},
				{
					href: "/lua-api-explorer",
					label: "Lua API Explorer",
					description: "Search all Method and GameEvents with curated documentation, gotchas, and sets of examples.",
				},
				{
					href: "/modded-civs-pedia",
					label: "Modded Civs Pedia",
					description: "Reference pedia for custom civilizations and gameplay mods",
					disabled: true,
					statusLabel: "Coming Soon",
				},
				{
					href: "/tech-tree-viewer",
					label: "Tech Tree Viewer",
					description: "Browse technologies, prerequisites, and progression layout to plot your civ uniques.",
				},
				{
					href: "/map-viewer",
					label: "Map Viewer",
					description: "Inspect community maps down to each tile visually for mod support or CPU-only game setup.",
				},
				{
					href: "/religion-support",
					label: "Religion Support",
					description: "Browse religion choices from Historical Religions and companion packs with pack grouping and icon metadata.",
				},
			],
		},
		{
			id: "assets",
			kicker: "Art & UI",
			label: "Visual Pipeline",
			description: "Prepare icons, textures, and interface assets.",
			panelTitle: "Prep & Design",
			panelCopy: "Use these when you need Civ V-ready DDS files, icon sheets, and UI-facing art assets.",
			links: [
				{
					href: "/dds-converter",
					label: "DDS Converter",
					description: "Convert icons, screens, and textures into game-ready DDS files using helpful presets.",
				},
				{
					href: "/civ-icon-maker",
					label: "Icon Maker",
					description: "Generate styled civ icons for atlas sheets and UI use.",
				},
				{
					href: "/ui-screen-viewer",
					label: "UI Screen Helper",
					description: "Test artwork, icons, and text across the various in-game screens.",
					disabled: true,
					statusLabel: "Coming Soon",
				},
			],
		},
		{
			id: "ship",
			kicker: "Publish",
			label: "Build & Publish",
			description: "Package, validate, and ship finished mods.",
			panelTitle: "Build Outputs",
			panelCopy: "Use these when your mod is ready for testing, packaging, and Workshop release.",
			links: [
				{
					href: "/workshop-uploader",
					label: "Workshop Uploader",
					description: "Desktop app for Steam Workshop publishing and updating.",
				},
				{
					href: "/modinfo-builder",
					label: ".modinfo Builder",
					description: "Build and edit `.modinfo` manifests directly, including actions and metadata.",
				},
				{
					href: "/civ5mod-ziper",
					label: ".civ5mod Ziper",
					description: "Package a mod folder into Civ V's distributable .civ5mod format.",
				},
			],
		},
	];

	const NAV_PAGE_COUNT = NAV_GROUPS.reduce((count, group) => count + group.links.length, 0);
	const REDDIT_URL = "https://old.reddit.com/r/civmoddingcentral/";
	const DISCORD_URL = "https://discord.gg/yf8jUXf";

	let userOpen = $state(false);
	let helpOpen = $state(false);
	let navMenuOpen = $state(false);
	let openNavGroupId = $state(null);
	let userWrapEl = $state();
	let helpWrapEl = $state();
	let navWrapEl = $state();

	$effect(() => {
		currentPath;
		closeNavMenus();
	});

	function isActivePath(pathname) {
		if (!pathname) {
			return false;
		}
		return currentPath === pathname;
	}

	function navLinkKey(groupId, link, index) {
		return `${groupId}-${link.href || link.label}-${index}`;
	}

	function navEntrySurfaceClass(href) {
		switch (href) {
			case "/template-generators":
				return "is-generator";
			case "/pattern-library":
				return "is-pattern";
			case "/schema-browser":
			case "/modded-civs-pedia":
				return "is-schema";
			case "/lua-api-explorer":
				return "is-lua";
			case "/workshop-uploader":
			case "/modinfo-builder":
			case "/civ5mod-ziper":
				return "is-publish";
			case "/dds-converter":
			case "/civ-icon-maker":
			case "/ui-screen-viewer":
				return "is-ui";
			case "/guided-planner":
				return "is-planner";
			case "/community-links":
			case "/tutorials":
				return "is-";
			case "/map-viewer":
			case "/religion-support":
				return "is-support";
			default:
				return "is-tool";
		}
	}

	function isTypingTarget(target) {
		return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
	}

	function isGroupActive(group) {
		return group.links.some((link) => isActivePath(link.href));
	}

	function getDefaultNavGroupId() {
		return NAV_GROUPS.find((group) => isGroupActive(group))?.id ?? NAV_GROUPS[0]?.id ?? null;
	}

	function openNavMenu(groupId = openNavGroupId ?? getDefaultNavGroupId()) {
		navMenuOpen = true;
		openNavGroupId = groupId;
		userOpen = false;
		helpOpen = false;
	}

	function closeNavMenus() {
		navMenuOpen = false;
		openNavGroupId = null;
	}

	function toggleNavMenu() {
		if (navMenuOpen) {
			closeNavMenus();
			return;
		}

		openNavMenu();
	}

	function toggleNavGroup(groupId) {
		if (openNavGroupId === groupId) {
			openNavGroupId = null;
			navMenuOpen = true;
			return;
		}

		openNavMenu(groupId);
	}

	function handleNavShellFocusOut(event) {
		const nextTarget = event.relatedTarget;
		if (nextTarget && navWrapEl?.contains(nextTarget)) {
			return;
		}
		closeNavMenus();
	}

	function handleWindowKeyDown(event) {
		if (event.key === "Escape") {
			userOpen = false;
			helpOpen = false;
			closeNavMenus();
			return;
		}

		if (isTypingTarget(event.target)) {
			return;
		}

		if (event.key === "?") {
			event.preventDefault();
			helpOpen = !helpOpen;
			userOpen = false;
			closeNavMenus();
			return;
		}

		if (event.key.toLowerCase() === "u") {
			event.preventDefault();
			userOpen = !userOpen;
			helpOpen = false;
			closeNavMenus();
			return;
		}
	}

	function handleWindowClick(event) {
		const target = event.target;
		if (userOpen && userWrapEl && !userWrapEl.contains(target)) {
			userOpen = false;
		}
		if (helpOpen && helpWrapEl && !helpWrapEl.contains(target)) {
			helpOpen = false;
		}
		if (navWrapEl && !navWrapEl.contains(target)) {
			closeNavMenus();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeyDown} onclick={handleWindowClick} />

<header class="navbar">
	<div class="brand">
		<a href="/" class="brand-link">
			<img class="brand-logo" src="/brand/cmc-navbar-logo.jpg" alt="Civ Modding Central logo" width="100" height="100" />
		</a>
		<div>
			<p class="brand-overline">Community Web Hub</p>
			<p class="brand-title">Civ Modding Central</p>
		</div>
	</div>

	<div class="nav-tools">
		<div class="page-nav-shell" bind:this={navWrapEl} role="group" aria-label="Tool navigation" onfocusout={handleNavShellFocusOut}>
			<button
				type="button"
				class={`nav-menu-trigger nav-menu-trigger-primary ${navMenuOpen ? "is-open" : ""}`}
				aria-expanded={navMenuOpen ? "true" : "false"}
				aria-controls="primary-navigation"
				onclick={toggleNavMenu}
			>
				<span class="nav-menu-label">Browse Tools & Resources</span>
				<span class="nav-menu-copy">{NAV_GROUPS.length} categories, {NAV_PAGE_COUNT} pages</span>
			</button>

			<nav id="primary-navigation" class={`page-nav ${navMenuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
				{#each NAV_GROUPS as group (group.id)}
					<section class={`nav-group ${openNavGroupId === group.id ? "is-open" : ""} ${isGroupActive(group) ? "is-active" : ""}`}>
						<button
							type="button"
							class="nav-group-trigger"
							aria-expanded={openNavGroupId === group.id ? "true" : "false"}
							aria-controls={`nav-panel-${group.id}`}
							onclick={() => toggleNavGroup(group.id)}
						>
							<span class="nav-group-kicker">{group.kicker}</span>
							<span class="nav-group-title-row">
								<span class="nav-group-title">{group.label}</span>
								<span class="nav-group-count">{group.links.length}</span>
							</span>
							<span class="nav-group-copy">{group.description}</span>
						</button>

						<div id={`nav-panel-${group.id}`} class="nav-group-panel">
							<div class="nav-group-panel-head">
								<p class="nav-group-panel-kicker">{group.kicker}</p>
								<p class="nav-group-panel-title">{group.panelTitle}</p>
								<p class="nav-group-panel-copy">{group.panelCopy}</p>
							</div>
							<div class="nav-group-links">
								{#each group.links as link, index (navLinkKey(group.id, link, index))}
									{#if link.disabled}
										<div class={`nav-entry ${navEntrySurfaceClass(link.href)} is-disabled`} aria-disabled="true">
											<span class="nav-entry-head">
												<span class="nav-entry-title">{link.label}</span>
												<span class="nav-entry-status">{link.statusLabel || "Coming Soon"}</span>
											</span>
											<span class="nav-entry-copy">{link.description}</span>
										</div>
									{:else}
										<a
											class={`nav-entry ${navEntrySurfaceClass(link.href)} ${isActivePath(link.href) ? "is-active" : ""}`}
											href={link.href}
											aria-current={isActivePath(link.href) ? "page" : undefined}
											onclick={closeNavMenus}
										>
											<span class="nav-entry-head">
												<span class="nav-entry-title">{link.label}</span>
											</span>
											<span class="nav-entry-copy">{link.description}</span>
										</a>
									{/if}
								{/each}
							</div>
						</div>
					</section>
				{/each}
			</nav>
		</div>

		<div class="nav-actions">
			<QuickJumpPalette {currentPath} onJump={onQuickJump} />

			<a class="social-trigger" href={REDDIT_URL} aria-label="Reddit" title="Reddit" target="_blank" rel="noopener noreferrer">
				<svg class="social-icon" viewBox="0 0 512 512" aria-hidden="true">
					<path
						d="M0 256C0 114.6 114.6 0 256 0S512 114.6 512 256 397.4 512 256 512L37.1 512c-13.7 0-20.5-16.5-10.9-26.2L75 437C28.7 390.7 0 326.7 0 256zM349.6 153.6c23.6 0 42.7-19.1 42.7-42.7s-19.1-42.7-42.7-42.7c-20.6 0-37.8 14.6-41.8 34-34.5 3.7-61.4 33-61.4 68.4l0 .2c-37.5 1.6-71.8 12.3-99 29.1-10.1-7.8-22.8-12.5-36.5-12.5-33 0-59.8 26.8-59.8 59.8 0 24 14.1 44.6 34.4 54.1 2 69.4 77.6 125.2 170.6 125.2s168.7-55.9 170.6-125.3c20.2-9.6 34.1-30.2 34.1-54 0-33-26.8-59.8-59.8-59.8-13.7 0-26.3 4.6-36.4 12.4-27.4-17-62.1-27.7-100-29.1l0-.2c0-25.4 18.9-46.5 43.4-49.9 4.4 18.8 21.3 32.8 41.5 32.8l.1 .2zM177.1 246.9c16.7 0 29.5 17.6 28.5 39.3s-13.5 29.6-30.3 29.6-31.4-8.8-30.4-30.5 15.4-38.3 32.1-38.3l.1-.1zm190.1 38.3c1 21.7-13.7 30.5-30.4 30.5s-29.3-7.9-30.3-29.6 11.8-39.3 28.5-39.3 31.2 16.6 32.1 38.3l.1 .1zm-48.1 56.7c-10.3 24.6-34.6 41.9-63 41.9s-52.7-17.3-63-41.9c-1.2-2.9 .8-6.2 3.9-6.5 18.4-1.9 38.3-2.9 59.1-2.9s40.7 1 59.1 2.9c3.1 .3 5.1 3.6 3.9 6.5z"
					/>
				</svg>
			</a>

			<a class="social-trigger" href={DISCORD_URL} aria-label="Discord" title="Discord" target="_blank" rel="noopener noreferrer">
				<svg class="social-icon" viewBox="0 0 640 640" aria-hidden="true">
					<path
						d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5zM417.9 401.5C388.9 401.5 365.1 374.9 365.1 342.3C365.1 309.7 388.5 283.1 417.9 283.1C447.6 283.1 471.2 309.9 470.7 342.3C470.7 375 447.5 401.5 417.9 401.5z"
					/>
				</svg>
			</a>

			<div class="user-wrap" bind:this={userWrapEl}>
				<button
					type="button"
					class="user-trigger"
					aria-label="User menu"
					aria-haspopup="true"
					aria-expanded={userOpen ? "true" : "false"}
					onclick={() => {
						userOpen = !userOpen;
						helpOpen = false;
						closeNavMenus();
					}}
				>
					<svg class="user-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" aria-hidden="true">
						<path d="M18 20a6 6 0 0 0-12 0" />
						<circle cx="12" cy="10" r="4" />
						<circle cx="12" cy="12" r="10" />
					</svg>
				</button>

				{#if userOpen}
					<div class="user-dropdown">
						{#if authUser}
							<p class="user-heading">Signed in</p>
							<p class="user-meta">{authUser.email}</p>
							<p class={`user-access ${authAccessLoading ? "is-loading" : authAccessAllowed ? "is-enabled" : authAccessChecked ? "is-denied" : ""}`}>
								{#if authAccessLoading}
									Checking editor access...
								{:else if authAccessAllowed}
									Editor access enabled
								{:else if authAccessChecked}
									Editor access not granted
								{:else}
									Editor access pending
								{/if}
							</p>
							<div class="user-actions">
								<button type="button" onclick={onLogout}>Sign Out</button>
							</div>
						{:else}
							<p class="user-heading">Login</p>
							<label>
								Email
								<input type="email" placeholder="you@example.com" value={authEmail} oninput={(event) => onAuthEmailInput(event.currentTarget.value)} />
							</label>
							<div class="user-actions">
								{#if authEnabled}
									<button type="button" onclick={onSendMagicLink} disabled={authLoading}>
										{authLoading ? "Sending..." : "Send Sign-In Link"}
									</button>
								{/if}
							</div>
							{#if !authEnabled}
								<p class="user-message">Supabase auth is not configured for this environment.</p>
							{/if}
						{/if}
						{#if authMessage}
							<p class="user-message" role="status" aria-live="polite">{authMessage}</p>
						{/if}

						{#if !authEnabled && authAccessDebug}
							<p class="user-message user-message--debug">Access checks: {authAccessDebug}</p>
						{/if}

						<p>Message Coiot for account registration.</p>
					</div>
				{/if}
			</div>

			<div class="help-wrap" bind:this={helpWrapEl}>
				<button
					type="button"
					class="help-trigger"
					aria-label="Help and keyboard shortcuts"
					aria-haspopup="true"
					aria-expanded={helpOpen ? "true" : "false"}
					onclick={() => {
						helpOpen = !helpOpen;
						userOpen = false;
						closeNavMenus();
					}}
				>
					<svg class="help-icon" viewBox="0 0 640 640" aria-hidden="true">
						<path
							d="M224 224C224 171 267 128 320 128C373 128 416 171 416 224C416 266.7 388.1 302.9 349.5 315.4C321.1 324.6 288 350.7 288 392L288 416C288 433.7 302.3 448 320 448C337.7 448 352 433.7 352 416L352 392C352 390.3 352.6 387.9 355.5 384.7C358.5 381.4 363.4 378.2 369.2 376.3C433.5 355.6 480 295.3 480 224C480 135.6 408.4 64 320 64C231.6 64 160 135.6 160 224C160 241.7 174.3 256 192 256C209.7 256 224 241.7 224 224zM320 576C342.1 576 360 558.1 360 536C360 513.9 342.1 496 320 496C297.9 496 280 513.9 280 536C280 558.1 297.9 576 320 576z"
						/>
					</svg>
				</button>

				{#if helpOpen}
					<div class="help-dropdown">
						<div class="help-header">Quick Help</div>
						<div class="help-section">
							<h4>Keyboard</h4>
							<ul class="help-list">
								<li><kbd>?</kbd> Toggle help menu</li>
								<li><kbd>Ctrl/Cmd K</kbd> Open quick jump</li>
								<li><kbd>F</kbd> Focus the main page search on schema and Lua pages</li>
								<li><kbd>U</kbd> Toggle user menu</li>
								<li><kbd>[</kbd> Previous result on supported pages</li>
								<li><kbd>]</kbd> Next result on supported pages</li>
								<li><kbd>Esc</kbd> Close open menus</li>
								<li><kbd>Mouse wheel</kbd> Zoom map</li>
								<li><kbd>Drag</kbd> Pan map</li>
							</ul>
						</div>
						<div class="help-section">
							<h4>Overview</h4>
							<p class="help-copy">Civ Modding Central is a knowledge base for Civ5 modding, including web based tools and archives of modding instructions.</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>

<style>
	.navbar {
		position: relative;
		z-index: 20;
		display: flex;
		container: navbar / inline-size;
		justify-content: space-between;
		align-items: center;
		gap: clamp(0.75rem, 1.5cqi, 1.15rem);
		background: var(--navbar-bg);
		box-shadow: 0 2px 4px var(--shadow-soft);
		border: 1px solid var(--panel-border);
		border-radius: 0.85rem;
		padding-block: 0.75rem 0.615rem;
		padding-inline: clamp(0.8rem, 1.75cqi, 1rem);
	}

	.brand {
		min-inline-size: 0;
		display: flex;
		flex: 0 1 auto;
		align-items: center;
		gap: 0.75rem;
	}

	.brand-link {
		display: flex;
		align-items: center;
	}

	.brand-logo {
		inline-size: 40px;
		block-size: 40px;
		min-inline-size: 40px;
		min-block-size: 40px;
		flex: 0 0 40px;
		border-radius: 0.5rem;
		object-fit: contain;
	}

	.brand-overline {
		color: var(--muted-ink);
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.12em;
	}

	.brand-overline,
	.brand-title {
		white-space: pre;
		line-height: 1.15;
		margin-block: 0;
	}

	.brand-title {
		color: var(--ink);
		font-size: 1.125rem;
		font-weight: 700;
		padding-block-start: 0.5rem;
	}

	.nav-tools {
		min-inline-size: 0;
		display: flex;
		flex: 1 1 auto;
		justify-content: flex-end;
		align-items: center;
		gap: clamp(0.45rem, 1cqi, 0.7rem);
	}

	.page-nav-shell {
		position: relative;
		z-index: 5;
		min-inline-size: 0;
		flex: 0 1 auto;
	}

	.nav-group-trigger:focus-visible,
	.nav-menu-trigger:focus-visible,
	.nav-entry:focus-visible,
	.social-trigger:focus-visible,
	.help-trigger:focus-visible,
	.user-trigger:focus-visible,
	.user-actions button:focus-visible,
	.user-dropdown input:focus-visible {
		outline: 2px solid color-mix(in oklch, white 78%, var(--accent));
		outline-offset: 2px;
		border-color: color-mix(in oklch, var(--accent) 60%, var(--panel-border));
	}

	.social-trigger,
	.help-trigger,
	.user-trigger,
	.user-actions button {
		color: var(--ink);
		font: inherit;
		background: var(--control-bg);
		border: 1px solid var(--panel-border);
		border-radius: 0.55rem;
		padding-block: 0.42rem;
		padding-inline: 0.62rem;
		transition:
			background 150ms ease,
			border-color 150ms ease,
			color 150ms ease;
		cursor: pointer;
	}

	.user-actions button:hover {
		background: color-mix(in oklch, var(--accent) 14%, var(--control-bg));
		border-color: color-mix(in oklch, var(--accent) 55%, var(--panel-border));
	}

	.nav-group-title,
	.nav-menu-label {
		white-space: pre;
		font-size: 0.95rem;
	}

	.nav-group-title,
	.nav-menu-label,
	.nav-group-panel-title,
	.nav-entry-title,
	.help-header,
	.user-heading {
		color: var(--ink);
		font-weight: 700;
	}

	.nav-group-kicker,
	.nav-group-panel-kicker,
	.nav-menu-copy {
		text-transform: uppercase;
		font-size: 0.8rem;
		letter-spacing: 0.12em;
	}

	.nav-group-kicker,
	.nav-menu-copy,
	.nav-group-copy,
	.nav-entry-copy,
	.nav-group-panel-kicker,
	.nav-group-panel-copy,
	.help-section h4,
	.user-meta,
	.user-message,
	.user-access,
	.help-copy,
	.help-list {
		color: color-mix(in oklch, var(--muted-ink) 72%, var(--ink));
	}

	.nav-group-trigger {
		inline-size: 100%;
		min-block-size: 7.5rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		color: var(--ink);
		font: inherit;
		text-align: left;
		background: color-mix(in oklch, var(--control-bg) 92%, black);
		border: 1px solid color-mix(in oklch, var(--accent) 30%, var(--panel-border));
		border-radius: 0.78rem;
		padding-block: 0.56rem;
		padding-inline: 0.72rem;
		transition:
			background 160ms ease,
			border-color 160ms ease,
			transform 160ms ease,
			box-shadow 160ms ease;
		cursor: pointer;

		&:hover {
			background: color-mix(in oklch, var(--control-bg) 88%, black);
			box-shadow: 0 8px 12px color-mix(in oklch, var(--shadow-soft) 80%, transparent);
			border-color: color-mix(in oklch, var(--accent) 68%, var(--panel-border));
			transform: translateY(-1px);
		}
	}

	.nav-group-title-row {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.nav-group-count {
		flex: 0 0 auto;
		color: color-mix(in oklch, var(--accent) 25%, var(--ink));
		font-size: 0.68rem;
		line-height: 1.2;
		background: color-mix(in oklch, var(--control-bg) 90%, black);
		border: 1px solid color-mix(in oklch, var(--accent) 58%, var(--panel-border));
		border-radius: 999px;
		padding-block: 0.04rem;
		padding-inline: 0.42rem;
	}

	.nav-group-copy,
	.nav-entry-copy,
	.nav-group-panel-copy {
		font-size: 0.77rem;
		line-height: 1.34;
		margin-block: 0;
	}

	.nav-group-panel {
		position: absolute;
		left: auto;
		z-index: 30;
		top: calc(100% + 0.45rem);
		right: 0;
		inline-size: min(36rem, calc(100cqi - 1rem));
		max-inline-size: calc(100cqi - 1rem);
		display: none;
		grid-template-columns: minmax(0, 13rem) minmax(0, 1fr);
		gap: 0.85rem;
		background: color-mix(in oklch, var(--panel-bg) 90%, black);
		box-shadow: 0 18px 36px color-mix(in oklch, var(--shadow-soft) 90%, transparent);
		border: 1px solid color-mix(in oklch, var(--accent) 54%, var(--panel-border));
		border-radius: 0.95rem;
		padding: 0.85rem;
	}

	.nav-group-panel-head {
		display: grid;
		align-content: start;
		gap: 0.35rem;
		padding-inline-end: 0.25rem;
	}

	.nav-group-panel-title,
	.nav-group-panel-kicker {
		margin-block: 0;
	}

	.nav-group-panel-title {
		font-size: 1rem;
	}

	.nav-group-links {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: 0.65rem;
	}

	.nav-entry-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.5rem;
	}

	.nav-entry-status {
		flex: 0 0 auto;
		color: var(--nav-entry-highlight-strong);
		text-transform: uppercase;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		background: color-mix(in srgb, var(--nav-entry-highlight) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--nav-entry-highlight) 32%, var(--nav-entry-border));
		border-radius: 999px;
		padding-block: 0.18rem;
		padding-inline: 0.46rem;
	}

	.nav-actions {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		gap: clamp(0.35rem, 0.8cqi, 0.5rem);
	}

	.help-trigger,
	.social-trigger {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		text-decoration: none;
		padding-inline: 0.48rem;
	}

	.social-trigger,
	.help-trigger,
	.user-trigger {
		color: var(--ink);
	}

	.social-trigger:hover,
	.help-trigger:hover,
	.user-trigger:hover {
		background: color-mix(in oklch, var(--ink) 8%, var(--control-bg));
		border-color: var(--panel-border);
	}

	.social-icon,
	.help-icon {
		inline-size: 1rem;
		block-size: 1rem;
		fill: currentColor;
	}

	.user-wrap,
	.help-wrap {
		position: relative;
	}

	.user-trigger {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		padding-inline: 0.48rem;
	}

	.user-icon {
		inline-size: 1rem;
		block-size: 1rem;
		color: var(--ink);
	}

	.user-dropdown {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		inline-size: min(330px, 88vw);
		display: grid;
		gap: 0.45rem;
		background: var(--panel-bg);
		box-shadow: 0 16px 34px var(--shadow-soft);
		border: 1px solid var(--panel-border);
		border-radius: 0.75rem;
		padding-block: 0.65rem;
		padding-inline: 0.65rem;
	}

	.user-dropdown input {
		color: var(--ink);
		font: inherit;
		background: var(--input-bg);
		border: 1px solid var(--panel-border);
		border-radius: 0.5rem;
		padding-block: 0.36rem;
		padding-inline: 0.45rem;
	}

	.user-dropdown label {
		display: grid;
		gap: 0.25rem;
		color: var(--muted-ink);
		font-size: 0.78rem;
	}

	.user-heading {
		font-size: 0.84rem;
		margin-block-start: 0.5rem;
	}

	.user-heading,
	.user-meta,
	.user-message {
		margin-block: 0;
	}

	.user-meta {
		font-size: 0.78rem;
	}

	.user-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.user-message {
		font-size: 0.76rem;
	}

	.user-message--debug {
		opacity: 0.8;
		font-size: 0.72rem;
	}

	.help-dropdown {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		inline-size: min(360px, 92vw);
		display: grid;
		gap: 0.5rem;
		background: var(--panel-bg);
		box-shadow: 0 16px 34px var(--shadow-soft);
		border: 1px solid var(--panel-border);
		border-radius: 0.75rem;
		padding-block: 0.7rem;
		padding-inline: 0.7rem;
	}

	.help-header {
		font-size: 0.84rem;
		letter-spacing: 0.02em;
	}

	.help-section h4 {
		font-size: 0.8rem;
		letter-spacing: 0.03em;
		margin-block: 0 0.3rem;
	}

	.help-list {
		display: grid;
		gap: 0.5rem;
		font-size: 0.76rem;
		padding: 0;
		margin-block: 0;
		list-style: none;
	}

	.help-list kbd {
		display: inline-block;
		color: var(--ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.75rem;
		background: color-mix(in oklch, var(--accent) 25%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 80%, var(--panel-border));
		border-radius: 0.25rem;
		padding-block: 0.15rem;
		padding-inline: 0.5rem;
		margin-inline-end: 0.5rem;
	}

	.help-copy {
		font-size: 0.78rem;
		line-height: 1.34;
		margin-block: 0;
	}

	.nav-entry {
		display: grid;
		gap: 0.3rem;
		color: var(--nav-entry-highlight-strong);
		text-decoration: none;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--nav-entry-highlight) 12%, transparent) 0%, transparent 36%),
			linear-gradient(145deg, color-mix(in srgb, var(--nav-entry-panel) 92%, var(--control-bg) 8%) 0%, color-mix(in srgb, var(--nav-entry-panel) 98%, black 2%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, white 6%, transparent),
			0 10px 24px color-mix(in oklch, black 28%, transparent);
		border: 1px solid color-mix(in srgb, var(--nav-entry-border) 82%, var(--panel-border));
		border-radius: 0.78rem;
		padding: 0.7rem;
		transition:
			background 160ms ease,
			border-color 160ms ease,
			box-shadow 160ms ease,
			transform 160ms ease;
		--nav-entry-border: color-mix(in srgb, var(--surface-tool-border) 76%, var(--panel-border));
		--nav-entry-highlight: var(--surface-tool-highlight);
		--nav-entry-highlight-strong: var(--surface-tool-highlight-strong);
		--nav-entry-panel: var(--surface-tool-panel);

		&:hover,
		&:focus-visible {
			background:
				radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--nav-entry-highlight) 18%, transparent) 0%, transparent 34%),
				linear-gradient(145deg, color-mix(in srgb, var(--nav-entry-panel) 88%, var(--control-bg) 12%) 0%, color-mix(in srgb, var(--nav-entry-panel) 96%, black 4%) 100%);
			box-shadow:
				inset 0 1px 0 color-mix(in srgb, var(--nav-entry-highlight-strong) 10%, transparent),
				0 14px 28px color-mix(in oklch, black 34%, transparent);
			border-color: color-mix(in srgb, var(--nav-entry-highlight) 56%, var(--nav-entry-border));
			transform: translateY(-1px);
		}

		&.is-active {
			background:
				radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--nav-entry-highlight) 18%, transparent) 0%, transparent 34%),
				linear-gradient(145deg, color-mix(in srgb, var(--nav-entry-panel) 86%, var(--control-bg) 14%) 0%, color-mix(in srgb, var(--nav-entry-panel) 95%, black 5%) 100%);
			border-color: color-mix(in srgb, var(--nav-entry-highlight) 68%, var(--nav-entry-border));
		}

		&.is-disabled {
			opacity: 0.82;
			background:
				radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--nav-entry-highlight) 8%, transparent) 0%, transparent 36%),
				linear-gradient(145deg, color-mix(in srgb, var(--nav-entry-panel) 88%, transparent) 0%, color-mix(in srgb, var(--nav-entry-panel) 96%, black 4%) 100%);
			border-color: color-mix(in srgb, var(--nav-entry-border) 72%, transparent);
			cursor: default;
		}

		&.is-generator {
			--nav-entry-border: var(--surface-generator-border);
			--nav-entry-highlight: var(--surface-generator-highlight);
			--nav-entry-highlight-strong: var(--surface-generator-highlight-strong);
			--nav-entry-panel: var(--surface-generator-panel);
		}

		&.is-pattern {
			--nav-entry-border: var(--surface-pattern-border);
			--nav-entry-highlight: var(--surface-pattern-highlight);
			--nav-entry-highlight-strong: var(--surface-pattern-highlight-strong);
			--nav-entry-panel: var(--surface-pattern-panel);
		}

		&.is-schema {
			--nav-entry-border: var(--surface-schema-border);
			--nav-entry-highlight: var(--surface-schema-highlight);
			--nav-entry-highlight-strong: var(--surface-schema-highlight-strong);
			--nav-entry-panel: var(--surface-schema-panel);
		}

		&.is-lua {
			--nav-entry-border: var(--surface-lua-border);
			--nav-entry-highlight: var(--surface-lua-highlight);
			--nav-entry-highlight-strong: var(--surface-lua-highlight-strong);
			--nav-entry-panel: var(--surface-lua-panel);
		}

		&.is-support {
			--nav-entry-border: var(--surface-support-border);
			--nav-entry-highlight: var(--surface-support-highlight);
			--nav-entry-highlight-strong: var(--surface-support-highlight-strong);
			--nav-entry-panel: var(--surface-support-panel);
		}

		&.is-planner {
			--nav-entry-border: var(--surface-planner-border);
			--nav-entry-highlight: var(--surface-planner-highlight);
			--nav-entry-highlight-strong: var(--surface-planner-highlight-strong);
			--nav-entry-panel: var(--surface-planner-panel);
		}

		&.is-publish {
			--nav-entry-border: var(--surface-publish-border);
			--nav-entry-highlight: var(--surface-publish-highlight);
			--nav-entry-highlight-strong: var(--surface-publish-highlight-strong);
			--nav-entry-panel: var(--surface-publish-panel);
		}

		&.is-ui {
			--nav-entry-border: var(--surface-ui-border);
			--nav-entry-highlight: var(--surface-ui-highlight);
			--nav-entry-highlight-strong: var(--surface-ui-highlight-strong);
			--nav-entry-panel: var(--surface-ui-panel);
		}
	}

	.nav-group {
		position: static;

		&.is-open .nav-group-trigger {
			background: color-mix(in oklch, var(--control-bg) 75%, black);
			box-shadow: 0 8px 12px color-mix(in oklch, var(--shadow-soft) 80%, transparent);
			border-color: color-mix(in oklch, var(--accent) 82%, var(--panel-border));
			transform: translateY(-1px);
		}

		&.is-open .nav-group-panel {
			display: grid;
		}

		&.is-active .nav-group-trigger {
			background: color-mix(in oklch, var(--control-bg) 99%, var(--accent));
			border-color: color-mix(in oklch, var(--accent) 90%, var(--panel-border));
		}
	}

	.nav-menu-trigger {
		inline-size: fit-content;
		min-inline-size: 0;
		max-inline-size: 100%;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		color: var(--ink);
		font: inherit;
		text-align: left;
		border-radius: 0.78rem;
		padding-block: 0.56rem;
		padding-inline: 0.72rem;
		transition:
			background 160ms ease,
			border-color 160ms ease,
			transform 160ms ease,
			box-shadow 160ms ease;
		cursor: pointer;

		.nav-menu-copy {
			display: inline;
			flex: 0 0 auto;
			white-space: nowrap;
			font-size: 0.63rem;
			letter-spacing: 0.1em;
		}

		&.nav-menu-trigger-primary {
			background: color-mix(in oklch, var(--control-bg) 82%, black);
			box-shadow: inset 0 1px 0 color-mix(in oklch, white 10%, transparent);
			border: 1px solid color-mix(in oklch, var(--accent) 80%, var(--panel-border));
			border-radius: 0.9rem;
		}

		&.nav-menu-trigger-primary:hover {
			background: color-mix(in oklch, var(--control-bg) 80%, black) !important;
			box-shadow:
				inset 0 1px 0 color-mix(in oklch, white 12%, transparent),
				0 8px 12px color-mix(in oklch, var(--shadow-soft) 80%, transparent);
			border-color: color-mix(in oklch, var(--accent) 80%, var(--panel-border));
			transform: translateY(0) !important;
		}

		&.nav-menu-trigger-primary.is-open {
			background: color-mix(in oklch, var(--control-bg) 70%, black);
			box-shadow:
				inset 0 1px 0 color-mix(in oklch, white 14%, transparent),
				0 8px 12px color-mix(in oklch, var(--shadow-soft) 80%, transparent);
			border-color: color-mix(in oklch, var(--accent) 90%, var(--panel-border));
			transform: translateY(-1px);
		}
	}

	.page-nav {
		position: absolute;
		left: auto;
		top: calc(100% + 0.65rem);
		right: 0;
		inline-size: min(36rem, calc(100cqi - 1rem));
		max-inline-size: calc(100cqi - 1rem);
		display: none;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		align-items: start;
		gap: 0.55rem;
		background: color-mix(in oklch, var(--panel-bg) 88%, black);
		box-shadow: 0 12px 24px color-mix(in oklch, var(--shadow-soft) 90%, transparent);
		border: 1px solid color-mix(in oklch, var(--accent) 52%, var(--panel-border));
		border-radius: 0.95rem;
		padding: 0.8rem;

		&.is-open {
			display: grid;
		}
	}

	.user-access {
		font-size: 0.76rem;
		margin-block: 0;
	}

	.user-access.is-denied {
		color: hsl(350deg 57% 53%);
	}

	.user-access.is-enabled {
		color: color-mix(in oklch, var(--accent) 68%, var(--ink));
	}

	@media (width <= 550px) {
		.navbar {
			padding: 0.5rem;
		}

		.nav-menu-copy {
			font-size: 0.55rem;
		}

		.nav-actions {
			gap: 0.25rem;

			.social-trigger {
				padding: 0.3rem;
			}
		}
	}

	@media (width <= 980px) {
		.navbar {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				"brand actions"
				"trigger trigger";
			align-items: start;
		}

		.brand {
			grid-area: brand;
			gap: clamp(0.55rem, 1.4vw, 0.75rem);
		}

		.brand-overline {
			font-size: clamp(0.68rem, 0.9vw, 0.75rem);
			letter-spacing: clamp(0.08em, 0.18vw, 0.12em);
		}

		.brand-title {
			font-size: clamp(1rem, 2.2vw, 1.125rem);
			padding-block-start: clamp(0.22rem, 0.6vw, 0.5rem);
		}

		.nav-tools {
			display: contents;
		}

		.page-nav-shell {
			inline-size: 100%;
			grid-area: trigger;
			justify-self: stretch;
		}

		.nav-menu-trigger {
			inline-size: 100%;
		}

		.nav-menu-trigger .nav-menu-copy {
			display: block;
		}

		.page-nav {
			position: static;
			inline-size: auto;
			max-inline-size: none;
			grid-template-columns: 1fr;
			box-shadow: none;
			padding: 0.75rem;
			margin-block-start: 0.55rem;
		}

		.nav-group-panel {
			position: static;
			inline-size: auto;
			max-inline-size: none;
			grid-template-columns: 1fr;
			box-shadow: none;
			padding: 0.75rem;
			margin-block-start: 0.5rem;
		}

		.nav-group-links {
			grid-template-columns: 1fr;
		}

		.nav-actions {
			grid-area: actions;
			justify-content: flex-end;
			flex-wrap: wrap;
			padding-block-start: 0.15rem;
		}
	}
</style>
