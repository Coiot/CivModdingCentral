<script>
	const groups = [
		{
			title: "Civ Modding Central",
			items: [
				{
					name: "CMC Discord",
					url: "https://discordapp.com/invite/yf8jUXf",
					// image: "/directory/cmc-discord.jpg",
					tagline: "Mod help and project updates.",
				},
				{
					name: "CMC Reddit",
					url: "https://old.reddit.com/r/civmoddingcentral/",
					// image: "/directory/cmc-reddit.jpg",
					tagline: "Community releases and feedback threads.",
				},
			],
		},
		{
			title: "Modding Help & Resources",
			items: [
				{
					name: "Civ V Helpline",
					url: "https://discord.gg/XEsBCvz",
					// image: "/directory/civ5-helpline.jpg",
					tagline: "Get help with troubleshooting and modding.",
				},
				{
					name: "Modding Resource Library",
					url: "https://discordapp.com/invite/unVWuXy",
					// image: "/directory/modding-library.jpg",
					tagline: "Docs, assets, and shared mod resources.",
				},
				{
					name: "Commonwealth for Modding",
					url: "https://discordapp.com/invite/2GecFuXzHM",
					// image: "/directory/commonwealth-empire.jpg",
					tagline: "Legacy community hub.",
				},
				{
					name: "Civ Mod Google Map",
					url: "https://www.google.com/maps/d/u/0/viewer?mid=1bfxc1WS-cwFqfKmfeNcNir6z5Hs&ll=-3.81666561775622e-14%2C108.23139769111206&z=1",
					tagline: "Mapped modded civs.",
					kind: "map",
				},
				{
					name: "Civ Mod Fandom Wiki",
					url: "https://civilization-v-customisation.fandom.com/wiki/Custom_Historical_Civilizations",
					tagline: "Fandom wiki for modded civs.",
					kind: "fandom",
				},
				{
					name: "Civ Mod Designs",
					url: "https://docs.google.com/spreadsheets/d/1kop88EnlIpj_zeNBathtna7n8VWyDutJYWvpkLe3lmM/edit?gid=1361367536#gid=1361367536",
					tagline: "Civ design references.",
					kind: "spreadsheet",
				},
			],
		},
		{
			title: "Connected Communities",
			items: [
				{
					name: "Civ Battle Royale",
					url: "https://old.reddit.com/r/civbattleroyale/",
					// image: "/directory/cbr.jpg",
					tagline: "61 CPU Civilization Weekly Show",
				},
				{
					name: "Civ AI Games",
					url: "https://discordapp.com/invite/AcXd6UE",
					// image: "/directory/cag.jpg",
					tagline: "Civ AI games discussion and help.",
				},
				{
					name: "Fire Emblem Modding",
					url: "https://discordapp.com/invite/bCvvftW",
					// image: "/directory/fire-emblem-modding.jpg",
					tagline: "FE modding tools and collaboration.",
				},
			],
		},
	];

	function linkHost(url) {
		try {
			const parsed = new URL(url);
			return parsed.hostname.replace(/^www\./, "");
		} catch {
			return url;
		}
	}

	function linkKind(url, explicitKind = "") {
		const provided = String(explicitKind || "")
			.trim()
			.toLowerCase();
		if (provided) {
			return provided;
		}
		if (!url) {
			return "link";
		}
		const normalized = String(url).toLowerCase();
		if (normalized.includes("docs.google.com/spreadsheets")) {
			return "spreadsheet";
		}
		if (normalized.includes("google.com/maps")) {
			return "map";
		}
		if (normalized.includes("fandom.com")) {
			return "fandom";
		}
		if (normalized.includes("reddit.com")) {
			return "reddit";
		}
		if (normalized.includes("discord.gg") || normalized.includes("discordapp.com") || normalized.includes("discord.com")) {
			return "discord";
		}
		return "link";
	}
</script>

<section class="directory-page stack">
	<header class="hero directory-hero">
		<p class="eyebrow">Community Links</p>
		<h1>Find the right place to ask, share, or collaborate.</h1>
		<p>Quick links to support channels and related Civ communities.</p>
	</header>

	<div class="directory-grid stack">
		{#each groups as group}
			<section class="directory-group stack">
				<div class="directory-group-header">
					<h2>{group.title}</h2>
				</div>
				<div class="directory-cards">
					{#each group.items as item}
						{@const previewImage = item.image}
						{@const previewTagline = item.tagline || "Community link"}
						<a class="directory-card" href={item.url} target="_blank" rel="noopener noreferrer" data-kind={linkKind(item.url, item.kind)}>
							<div class="directory-card-preview overflow-hidden">
								{#if previewImage}
									<img src={previewImage} alt="" loading="lazy" />
								{:else}
									<div class="directory-card-fallback">
										<span class="directory-card-icon" aria-hidden="true">
											{#if linkKind(item.url, item.kind) === "discord"}
												<svg viewBox="0 0 640 640" aria-hidden="true">
													<path
														d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5zM417.9 401.5C388.9 401.5 365.1 374.9 365.1 342.3C365.1 309.7 388.5 283.1 417.9 283.1C447.6 283.1 471.2 309.9 470.7 342.3C470.7 375 447.5 401.5 417.9 401.5z"
													/>
												</svg>
											{:else if linkKind(item.url, item.kind) === "reddit"}
												<svg viewBox="0 0 512 512" aria-hidden="true">
													<path
														d="M0 256C0 114.6 114.6 0 256 0S512 114.6 512 256 397.4 512 256 512L37.1 512c-13.7 0-20.5-16.5-10.9-26.2L75 437C28.7 390.7 0 326.7 0 256zM349.6 153.6c23.6 0 42.7-19.1 42.7-42.7s-19.1-42.7-42.7-42.7c-20.6 0-37.8 14.6-41.8 34-34.5 3.7-61.4 33-61.4 68.4l0 .2c-37.5 1.6-71.8 12.3-99 29.1-10.1-7.8-22.8-12.5-36.5-12.5-33 0-59.8 26.8-59.8 59.8 0 24 14.1 44.6 34.4 54.1 2 69.4 77.6 125.2 170.6 125.2s168.7-55.9 170.6-125.3c20.2-9.6 34.1-30.2 34.1-54 0-33-26.8-59.8-59.8-59.8-13.7 0-26.3 4.6-36.4 12.4-27.4-17-62.1-27.7-100-29.1l0-.2c0-25.4 18.9-46.5 43.4-49.9 4.4 18.8 21.3 32.8 41.5 32.8l.1 .2z"
													/>
												</svg>
											{:else if linkKind(item.url, item.kind) === "spreadsheet"}
												<svg viewBox="0 0 640 640" aria-hidden="true">
													<path
														d="M480 144C488.8 144 496 151.2 496 160L496 296L344 296L344 144L480 144zM496 344L496 480C496 488.8 488.8 496 480 496L344 496L344 344L496 344zM296 296L144 296L144 160C144 151.2 151.2 144 160 144L296 144L296 296zM144 344L296 344L296 496L160 496C151.2 496 144 488.8 144 480L144 344zM160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96z"
													/>
												</svg>
											{:else if linkKind(item.url, item.kind) === "map"}
												<svg viewBox="0 0 640 640" aria-hidden="true">
													<path
														d="M576 112C576 103.7 571.7 96 564.7 91.6C557.7 87.2 548.8 86.8 541.4 90.5L416.5 152.1L244 93.4C230.3 88.7 215.3 89.6 202.1 95.7L77.8 154.3C69.4 158.2 64 166.7 64 176L64 528C64 536.2 68.2 543.9 75.1 548.3C82 552.7 90.7 553.2 98.2 549.7L225.5 489.8L396.2 546.7C409.9 551.3 424.7 550.4 437.8 544.2L562.2 485.7C570.6 481.7 576 473.3 576 464L576 112zM208 146.1L208 445.1L112 490.3L112 191.3L208 146.1zM256 449.4L256 148.3L384 191.8L384 492.1L256 449.4zM432 198L528 150.6L528 448.8L432 494L432 198z"
													/>
												</svg>
											{:else if linkKind(item.url, item.kind) === "fandom"}
												<svg viewBox="0 0 24 24" aria-hidden="true">
													<path
														d="M8.123 0.008a0.431 0.431 0 0 0 -0.512 0.42v9.746L4.104 6.666a0.432 0.432 0 0 0 -0.66 0.064 0.428 0.428 0 0 0 -0.071 0.239v10.064a2.387 2.387 0 0 0 0.701 1.694l4.565 4.57a2.4 2.4 0 0 0 1.693 0.703h3.34c0.635 0 1.242 -0.252 1.691 -0.701l4.565 -4.572a2.394 2.394 0 0 0 0.699 -1.694V13.41a2.39 2.39 0 0 0 -0.7 -1.693L8.343 0.125a0.427 0.427 0 0 0 -0.219 -0.117zM9.646 12.51a0.719 0.719 0 0 1 0.508 0.21l1.848 1.85 1.844 -1.85a0.714 0.714 0 0 1 1.015 0l1.32 1.321a0.724 0.724 0 0 1 0.212 0.508v1.406a0.72 0.72 0 0 1 -0.21 0.508l-3.68 3.7a0.72 0.72 0 0 1 -1.019 0l-3.668 -3.7a0.716 0.716 0 0 1 -0.209 -0.506v-1.408a0.71 0.71 0 0 1 0.211 -0.506l1.32 -1.322a0.713 0.713 0 0 1 0.508 -0.211Z"
													/>
												</svg>
											{:else}
												<svg viewBox="0 0 24 24" aria-hidden="true">
													<path d="M10 5a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2h-5.59l7.3 7.29a1 1 0 0 1-1.42 1.42L11 7.41V13a1 1 0 1 1-2 0V5z" />
													<path d="M5 6a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2H7v10h10v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6z" />
												</svg>
											{/if}
										</span>
									</div>
								{/if}
							</div>
							<div class="directory-card-top stack half">
								<span class="directory-title">{item.name}</span>
								<span class="directory-tagline">{previewTagline}</span>
							</div>
							<span class="directory-url">{linkHost(item.url)}</span>
						</a>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</section>

<style>
	.directory-page {
		gap: 1.25rem;
	}

	.directory-grid {
		gap: 1rem;
	}

	.directory-group {
		gap: 1rem;
		background: var(--panel-bg);
		box-shadow: 0 10px 26px var(--shadow-soft);
		border: 1px solid color-mix(in oklch, var(--panel-border) 70%, transparent);
		border-radius: 1rem;
		padding-block: 1.5rem;
		padding-inline: 1.25rem;
	}

	.directory-group-header h2 {
		color: var(--ink);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1.5rem;
		margin: 0;
	}

	.directory-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(25rem, 1fr));
		gap: 0.8rem;
	}

	.directory-card {
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		gap: 0.5rem;
		color: var(--ink);
		text-decoration: none;
		background: var(--control-bg);
		border: 1px solid color-mix(in oklch, var(--accent) 30%, var(--panel-border));
		border-radius: 0.85rem;
		box-shadow: 0 4px 6px #111;
		padding: 1rem;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease;
	}

	.directory-card:hover {
		box-shadow: 0 6px 8px var(--shadow-soft);
		border-color: color-mix(in oklch, var(--accent) 70%, var(--panel-border));
		transform: translateY(-2px);
	}

	.directory-card-preview {
		min-block-size: 120px;
		display: grid;
		place-items: center;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--accent) 10%, var(--panel-border));
		border-radius: 0.75rem;
	}

	.directory-card-preview img {
		inline-size: 100%;
		block-size: 100%;
		display: block;
		object-fit: cover;
	}

	.directory-card-fallback {
		inline-size: 100%;
		block-size: 100%;
		display: grid;
		gap: 0.55rem;
		place-items: center;
		background: var(--panel-bg);
		padding: 0.85rem;
	}

	.directory-card-icon {
		inline-size: 4.5rem;
		block-size: 4.5rem;
		display: grid;
		place-items: center;
		color: var(--ink);
		opacity: 0.95;
		padding: 0.25rem;
	}

	.directory-card-icon svg {
		inline-size: 100%;
		block-size: 100%;
		fill: currentColor;
	}

	.directory-card-top {
		margin-block-start: 0.5rem;
	}

	.directory-title {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.directory-tagline {
		color: var(--muted-ink);
		font-size: 0.95rem;
	}

	.directory-url {
		color: var(--muted-ink);
		font-size: 0.85rem;
	}

	@media (max-width: 720px) {
		.directory-group {
			padding: 0.85rem;
		}

		.directory-cards {
			grid-template-columns: 1fr;
		}
	}
</style>
