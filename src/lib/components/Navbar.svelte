<script>
	import { onMount } from "svelte";

	let {
		themeMode = "light",
		onToggleTheme = () => {},
		onSetThemeMode = () => {},
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
	} = $props();

	let userOpen = $state(false);
	let helpOpen = $state(false);
	let userWrapEl = $state();
	let helpWrapEl = $state();
	let currentPath = $state("/");

	const REDDIT_URL = "https://old.reddit.com/r/civbattleroyale/";
	const DISCORD_URL = "https://discord.gg/565JwaMsuQ";

	onMount(() => {
		if (typeof window === "undefined") {
			return;
		}
		currentPath = window.location.pathname || "/";
	});

	function isActivePath(pathname) {
		return currentPath === pathname;
	}

	function isTypingTarget(target) {
		return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
	}

	function handleWindowKeyDown(event) {
		if (event.key === "Escape") {
			userOpen = false;
			helpOpen = false;
			return;
		}

		if (isTypingTarget(event.target)) {
			return;
		}

		if (event.key === "?") {
			event.preventDefault();
			helpOpen = !helpOpen;
			userOpen = false;
			return;
		}

		if (event.key.toLowerCase() === "u") {
			event.preventDefault();
			userOpen = !userOpen;
			helpOpen = false;
			return;
		}

		if (event.key.toLowerCase() === "t") {
			event.preventDefault();
			onToggleTheme();
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
	}
</script>

<svelte:window onkeydown={handleWindowKeyDown} onclick={handleWindowClick} />

<header class="navbar">
	<div class="brand">
		<img class="brand-logo" src="/brand/CMC-logo.jpg" alt="Civ Modding Central logo" width="256" height="256" />
		<div>
			<p class="brand-overline">Community Web Tools</p>
			<p class="brand-title">Civ Modding Central</p>
		</div>
	</div>

	<div class="nav-tools">
		<nav class="page-nav" aria-label="Primary navigation">
			<a class={`page-link ${isActivePath("/") ? "is-active" : ""}`} href="/" aria-current={isActivePath("/") ? "page" : undefined}>Map Viewer</a>
			<a class={`page-link ${isActivePath("/wiki") ? "is-active" : ""}`} href="/wiki" aria-current={isActivePath("/wiki") ? "page" : undefined}>Wiki Template</a>
		</nav>

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
			<button type="button" class="user-trigger" aria-label="User menu" aria-haspopup="true" aria-expanded={userOpen ? "true" : "false"} onclick={() => (userOpen = !userOpen)}>
				<svg class="user-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" aria-hidden="true">
					<path d="M18 20a6 6 0 0 0-12 0" />
					<circle cx="12" cy="10" r="4" />
					<circle cx="12" cy="12" r="10" />
				</svg>
			</button>

			{#if userOpen}
				<div class="user-dropdown">
					<div class="user-theme">
						<p class="user-label">Color Theme</p>
						<div class="user-toggle" role="group" aria-label="Theme mode">
							<button type="button" class={`user-chip ${themeMode === "light" ? "is-active" : ""}`} onclick={() => onSetThemeMode("light")}>Light</button>
							<button type="button" class={`user-chip ${themeMode === "dark" ? "is-active" : ""}`} onclick={() => onSetThemeMode("dark")}>Dark</button>
						</div>
					</div>

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
					<!--
					{#if authMessage}
						<p class="user-message">{authMessage}</p>
					{/if} -->

					{#if !authEnabled && authAccessDebug}
						<p class="user-message user-message--debug">Access checks: {authAccessDebug}</p>
					{/if}
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
							<li><kbd>U</kbd> Toggle user menu</li>
							<li><kbd>T</kbd> Toggle light/dark mode</li>
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
</header>

<style>
	.navbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.15rem;
		padding-block: 0.82rem;
		padding-inline: 1.05rem;
		border-radius: 0.85rem;
		background: var(--navbar-bg);
		border: 1px solid var(--panel-border);
		box-shadow: 0 2px 4px var(--shadow-soft);
		position: relative;
		z-index: 20;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.brand-logo {
		inline-size: 2.25rem;
		block-size: 2.25rem;
		border-radius: 0.4rem;
		object-fit: contain;
		flex: 0 0 auto;
	}

	.brand-overline,
	.brand-title {
		margin-block: 0;
		line-height: 1.15;
	}

	.brand-overline {
		color: var(--muted-ink);
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.brand-title {
		color: var(--ink);
		font-size: 1.125rem;
		font-weight: 700;
		padding-block-start: 0.5rem;
	}

	.nav-tools {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.user-dropdown input {
		border: 1px solid var(--panel-border);
		background: var(--input-bg);
		color: var(--ink);
		border-radius: 0.5rem;
		padding-block: 0.36rem;
		padding-inline: 0.45rem;
		font: inherit;
	}

	.page-nav {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.page-link {
		text-decoration: none;
		font-size: 0.79rem;
		color: var(--accent);
		background: color-mix(in oklch, var(--accent) 10%, transparent);
		padding-block: 0.4rem;
		padding-inline: 0.62rem;
		border-radius: 0.5rem;
		border: 1px dashed color-mix(in oklch, var(--accent) 44%, var(--panel-border));
	}

	.page-link:hover {
		background: color-mix(in oklch, var(--accent) 18%, transparent);
	}

	.page-link.is-active {
		color: color-mix(in oklch, var(--accent) 76%, var(--ink));
		background: color-mix(in oklch, var(--accent) 22%, var(--control-bg));
		border-style: solid;
	}

	.social-trigger,
	.help-trigger,
	.user-trigger,
	.user-actions button {
		border: 1px solid var(--panel-border);
		background: var(--control-bg);
		color: var(--ink);
		border-radius: 0.55rem;
		padding-block: 0.42rem;
		padding-inline: 0.62rem;
		font: inherit;
		cursor: pointer;
		transition:
			background 150ms ease,
			border-color 150ms ease,
			color 150ms ease;
	}

	.user-actions button:hover {
		border-color: color-mix(in oklch, var(--accent) 55%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 14%, var(--control-bg));
	}

	.social-trigger:hover,
	.help-trigger:hover,
	.user-trigger:hover {
		border-color: var(--panel-border);
		background: color-mix(in oklch, var(--ink) 8%, var(--control-bg));
	}

	.user-wrap,
	.help-wrap {
		position: relative;
	}

	.user-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding-inline: 0.48rem;
	}

	.help-trigger,
	.social-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding-inline: 0.48rem;
		text-decoration: none;
	}

	.user-icon {
		inline-size: 1rem;
		block-size: 1rem;
		color: var(--ink);
	}

	.social-icon,
	.help-icon {
		inline-size: 1rem;
		block-size: 1rem;
		fill: currentColor;
	}

	.social-trigger,
	.help-trigger,
	.user-trigger {
		color: var(--ink);
	}

	.user-dropdown {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		inline-size: min(330px, 88vw);
		padding-block: 0.65rem;
		padding-inline: 0.65rem;
		display: grid;
		gap: 0.45rem;
		border-radius: 0.75rem;
		border: 1px solid var(--panel-border);
		background: var(--panel-bg);
		box-shadow: 0 16px 34px var(--shadow-soft);
	}

	.user-theme {
		display: grid;
		gap: 0.25rem;
		padding-block-end: 0.2rem;
	}

	.user-label {
		margin-block: 0;
		font-size: 0.75rem;
		color: var(--muted-ink);
	}

	.user-toggle {
		display: inline-flex;
		gap: 0.5rem;
	}

	.user-chip {
		color: var(--ink);
		font: inherit;
		font-size: 0.85rem;
		background: var(--control-bg);
		border: 1px solid var(--panel-border);
		border-radius: 0.5rem;
		padding-block: 0.25rem;
		padding-inline: 1rem;
		cursor: pointer;
	}

	.user-chip.is-active {
		border-color: color-mix(in oklch, var(--accent) 65%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 18%, var(--control-bg));
	}

	.help-dropdown {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		inline-size: min(360px, 92vw);
		padding-block: 0.7rem;
		padding-inline: 0.7rem;
		display: grid;
		gap: 0.5rem;
		border-radius: 0.75rem;
		border: 1px solid var(--panel-border);
		background: var(--panel-bg);
		box-shadow: 0 16px 34px var(--shadow-soft);
	}

	.help-header {
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--ink);
	}

	.help-section h4 {
		margin-block: 0 0.3rem;
		font-size: 0.8rem;
		letter-spacing: 0.03em;
		color: var(--muted-ink);
	}

	.help-list {
		display: grid;
		gap: 0.5rem;
		color: var(--muted-ink);
		font-size: 0.76rem;
		list-style: none;
		padding: 0;
		margin-block: 0;
	}

	.help-list kbd {
		display: inline-block;
		color: var(--ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.75rem;
		border-radius: 0.25rem;
		border: 1px solid color-mix(in oklch, var(--accent) 80%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 25%, var(--control-bg));
		padding-block: 0.15rem;
		padding-inline: 0.5rem;
		margin-inline-end: 0.5rem;
	}

	.help-copy {
		color: var(--muted-ink);
		font-size: 0.78rem;
		line-height: 1.34;
		margin-block: 0;
	}

	.user-heading,
	.user-meta,
	.user-message {
		margin-block: 0;
	}

	.user-heading {
		color: var(--ink);
		font-size: 0.84rem;
		font-weight: 700;
		margin-block-start: 0.5rem;
	}

	.user-meta {
		font-size: 0.78rem;
		color: var(--muted-ink);
	}

	.user-access {
		margin-block: 0;
		font-size: 0.76rem;
		color: var(--muted-ink);
	}

	.user-access.is-enabled {
		color: color-mix(in oklch, var(--accent) 68%, var(--ink));
	}

	.user-access.is-denied {
		color: hsl(350deg 57% 53%);
	}

	.user-dropdown label {
		display: grid;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: var(--muted-ink);
	}

	.user-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.user-message {
		font-size: 0.76rem;
		color: var(--muted-ink);
	}

	.user-message--debug {
		font-size: 0.72rem;
		opacity: 0.8;
	}

	@media (max-width: 900px) {
		.navbar {
			flex-direction: column;
			align-items: stretch;
		}

		.nav-tools {
			justify-content: flex-start;
		}

		.page-nav {
			inline-size: 100%;
		}

		.page-link {
			flex: 1 1 auto;
			text-align: center;
		}

		.user-dropdown {
			left: 0;
			right: auto;
		}

		.help-dropdown {
			left: 0;
			right: auto;
		}
	}
</style>
