<script>
	const CIV_WIKI_FILE_REDIRECT_BASE = "https://civilization.fandom.com/wiki/Special:Redirect/file";

	const defaults = {
		civName: "Ethiopia",
		leaderName: "Haile Selassie",
		empireName: "Ethiopian Empire",
		iconText: "ET",
		listHook: "Gain Influence with a Great Person gift to a City-State. Their friends gain +10% Great Person generation.",
		abilityName: "Spirit of Adwa",
		abilityText: "Combat bonus when fighting units from a Civilization with more Cities than Ethiopia.",
		unitName: "Mehal Sefari",
		combatUnitName: "Mehal Sefari",
		combatStrength: "16",
		combatMoves: "2",
		civilianUnitName: "Settler",
		civilianMoves: "2",
		buildingName: "Stele",
		cityName: "Harar",
		cityPopulation: "10",
		cityStrength: "62",
		cityFaith: "3",
		cityStatus: "Holy City",
		mapType: "Continents",
		mapSize: "Standard",
		difficulty: "Emperor",
		gamePace: "Standard",
		setupNote: "Faith opener with strong hill starts and a clear early cultural identity.",
		loadingTitle: "The Highlands Endure",
		loadingBody: "Hail stalwart ruler. Your people stand between mountain stone and desert wind, holding together a kingdom whose faith and pride outlast invasion and drought alike.",
		dawnBody: "Brave leader, your court looks to you for wise stewardship and a banner worthy of every hilltop church and market road. Can you build a civilization that stands the test of time?",
		diplomacyMood: "Neutral",
		diplomacyLine: "In truth, heaven has smiled upon us. Speak plainly, and let us see whether your words match your ambition.",
		iconUrl: "/Ethiopian_Civ_Icon.png",
		leaderArtUrl: "/Haile_Selassie_Leader.png",
		backdropUrl: "/Ethiopia_Map.png",
		accentColor: "#d8b15a",
		civBackgroundColor: "#8b2527",
		civIconColor: "#f3f0e5",
	};

	const comparisonRows = [
		{
			civName: "Sweden",
			leaderName: "Gustavus Adolphus",
			hook: "Gain Influence when gifting Great People and strengthen friendly Great Person generation.",
		},
		{
			civName: "Arabia",
			leaderName: "Harun al-Rashid",
			hook: "Caravans range farther and oil resources spread the home city's religion twice as effectively.",
		},
		{
			civName: "Iroquois",
			leaderName: "Hiawatha",
			hook: "Units move through Forest and Jungle as if they were Roads. Trade routes can use forest movement.",
		},
	];

	const diplomacyActions = ["Declare War", "Trade", "Demand", "Discuss", "Goodbye"];

	let form = { ...defaults };
	let uploadPreviews = {
		iconUrl: "",
		leaderArtUrl: "",
		backdropUrl: "",
		unitArtUrl: "",
		buildingArtUrl: "",
	};
	const uploadObjectUrls = {
		iconUrl: "",
		leaderArtUrl: "",
		backdropUrl: "",
		unitArtUrl: "",
		buildingArtUrl: "",
	};

	function resetForm() {
		form = { ...defaults };
		clearUploadPreviews();
	}

	function cleanText(value) {
		return String(value || "").trim();
	}

	function initials(value, limit = 2) {
		const words = cleanText(value).split(/\s+/).filter(Boolean);
		if (!words.length) {
			return "?";
		}
		return words
			.slice(0, limit)
			.map((word) => word[0])
			.join("")
			.toUpperCase();
	}

	function helperThemeStyle(values) {
		return `--ui-accent:${cleanText(values.accentColor) || defaults.accentColor};--ui-panel:#081113;--ui-civ-bg:${cleanText(values.civBackgroundColor) || defaults.civBackgroundColor};--ui-civ-icon:${cleanText(values.civIconColor) || defaults.civIconColor};`;
	}

	function cssUrl(value) {
		return `url("${cleanText(value).replace(/"/g, "%22")}")`;
	}

	function backgroundStyle(url, gradient) {
		const layers = [gradient];
		if (cleanText(url)) {
			layers.push(cssUrl(url));
		}
		return `background-image:${layers.join(",")};`;
	}

	function emblemText(values) {
		return cleanText(values.iconText) || initials(values.civName, 2);
	}

	function traitBadge(value) {
		return initials(value, 2);
	}

	function civSelectionRows(values) {
		return [
			comparisonRows[0],
			{
				civName: cleanText(values.civName) || "Custom Civilization",
				leaderName: cleanText(values.leaderName) || "Custom Leader",
				hook: cleanText(values.listHook) || cleanText(values.abilityText) || "Custom ability summary goes here.",
				active: true,
			},
			comparisonRows[1],
			comparisonRows[2],
		];
	}

	function wikiFileRedirectUrl(fileName, baseUrl = CIV_WIKI_FILE_REDIRECT_BASE) {
		const normalized = cleanText(fileName);
		return normalized ? `${baseUrl}/${encodeURIComponent(normalized)}` : "";
	}

	function condensedWikiName(value) {
		return cleanText(value).replace(/[^A-Za-z0-9]+/g, "");
	}

	function titleCaseType(value) {
		const normalized = cleanText(value).replace(/^[A-Z]+_/, "");
		if (!normalized) {
			return "";
		}
		return normalized
			.split("_")
			.filter(Boolean)
			.map((part) => part[0] + part.slice(1).toLowerCase())
			.join(" ");
	}

	function wikiImageCandidates(...parts) {
		const seen = [];
		const urls = [];
		for (const part of parts) {
			const normalized = cleanText(part);
			if (!normalized) {
				continue;
			}
			const compact = condensedWikiName(normalized);
			for (const fileName of [
				`${normalized} (Civ5).png`,
				`${normalized}.png`,
				`${normalized} (Civ5).jpg`,
				`${normalized}.jpg`,
				compact ? `${compact}.png` : "",
				compact ? `${compact}.jpg` : "",
			]) {
				if (!fileName || seen.includes(fileName)) {
					continue;
				}
				seen.push(fileName);
				urls.push(wikiFileRedirectUrl(fileName));
			}
		}
		return urls;
	}

	function typeKey(prefix, value) {
		const normalized = cleanText(value)
			.replace(/[^A-Za-z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "")
			.toUpperCase();
		return normalized ? `${prefix}${normalized}` : "";
	}

	function previewImageUrl(name, rawType = "") {
		return wikiImageCandidates(name, titleCaseType(rawType))[0] || "";
	}

	function unitImageUrl(name) {
		return previewImageUrl(name, typeKey("UNIT_", name));
	}

	function buildingImageUrl(name) {
		if (cleanText(name).toLowerCase() === defaults.buildingName.toLowerCase()) {
			return "/Stele.png";
		}
		return previewImageUrl(name, typeKey("BUILDING_", name));
	}

	function uniqueUnitImageUrl(name) {
		if (uploadPreviews.unitArtUrl) {
			return uploadPreviews.unitArtUrl;
		}
		if (cleanText(name).toLowerCase() === defaults.unitName.toLowerCase()) {
			return "/Mehal_Sefari.png";
		}
		return unitImageUrl(name);
	}

	function uniqueBuildingImageUrl(name) {
		if (uploadPreviews.buildingArtUrl) {
			return uploadPreviews.buildingArtUrl;
		}
		return buildingImageUrl(name);
	}

	function currentIconUrl() {
		return uploadPreviews.iconUrl || cleanText(form.iconUrl) || defaults.iconUrl;
	}

	function currentLeaderArtUrl() {
		return uploadPreviews.leaderArtUrl || cleanText(form.leaderArtUrl) || defaults.leaderArtUrl;
	}

	function currentBackdropUrl() {
		return uploadPreviews.backdropUrl || cleanText(form.backdropUrl) || defaults.backdropUrl;
	}

	function updateUploadPreview(key, event) {
		const file = event.currentTarget?.files?.[0];
		if (uploadObjectUrls[key]) {
			URL.revokeObjectURL(uploadObjectUrls[key]);
			uploadObjectUrls[key] = "";
		}
		if (!file) {
			uploadPreviews = { ...uploadPreviews, [key]: "" };
			return;
		}
		const objectUrl = URL.createObjectURL(file);
		uploadObjectUrls[key] = objectUrl;
		uploadPreviews = { ...uploadPreviews, [key]: objectUrl };
	}

	function clearUploadPreviews() {
		for (const key of Object.keys(uploadObjectUrls)) {
			if (uploadObjectUrls[key]) {
				URL.revokeObjectURL(uploadObjectUrls[key]);
				uploadObjectUrls[key] = "";
			}
		}
		uploadPreviews = {
			iconUrl: "",
			leaderArtUrl: "",
			backdropUrl: "",
			unitArtUrl: "",
			buildingArtUrl: "",
		};
	}
</script>

<section class="ui-helper-page">
	<header class="hero ui-helper-hero">
		<div class="ui-helper-hero-copy stack half">
			<p class="eyebrow">Art & UI Helper</p>
			<h1>UI Screen Helper</h1>
			<p>
				Test names, icons, leader art, and longer text across the main Civilization V style interface screens. Fill the fields on the left, then use the previews on the right to spot clipping,
				weak hierarchy, and art that does not sit well in the game UI.
			</p>
		</div>

		<div class="ui-helper-hero-note">
			<p class="eyebrow">What It Covers</p>
			<strong>Setup, civ select, city banner, loading, dawn intro, and diplomacy</strong>
			<p>Use this before atlas export or DDS conversion when you want to know whether your text and artwork still read once they are inside the game presentation.</p>
		</div>
	</header>

	<section class="ui-helper-workspace" style={helperThemeStyle(form)}>
		<aside class="ui-helper-controls stack">
			<div class="ui-helper-controls-head stack quarter">
				<p class="eyebrow">Inputs</p>
				<h2>Fill the mock screens</h2>
				<p>Keep the left side as your quick editing bench. The right side updates immediately.</p>
			</div>

			<div class="ui-helper-action-row">
				<button type="button" class="ui-helper-button" onclick={resetForm}>Reset Sample</button>
			</div>

			<section class="ui-helper-form-card stack half">
				<p class="eyebrow">Identity</p>
				<label class="stack quarter">
					<span>Civilization Name</span>
					<input bind:value={form.civName} type="text" />
				</label>
				<label class="stack quarter">
					<span>Leader Name</span>
					<input bind:value={form.leaderName} type="text" />
				</label>
				<label class="stack quarter">
					<span>Empire Name</span>
					<input bind:value={form.empireName} type="text" />
				</label>
				<label class="stack quarter">
					<span>Icon Letters</span>
					<input bind:value={form.iconText} type="text" />
				</label>
			</section>

			<section class="ui-helper-form-card stack half">
				<p class="eyebrow">Civ Select & Uniques</p>
				<label class="stack quarter">
					<span>Civ List Hook</span>
					<textarea bind:value={form.listHook} rows="4"></textarea>
				</label>
				<label class="stack quarter">
					<span>Ability Name</span>
					<input bind:value={form.abilityName} type="text" />
				</label>
				<label class="stack quarter">
					<span>Ability Text</span>
					<textarea bind:value={form.abilityText} rows="4"></textarea>
				</label>
				<label class="stack quarter">
					<span>Unique Unit</span>
					<input bind:value={form.unitName} type="text" />
				</label>
				<label class="stack quarter">
					<span>Unique Unit Icon File</span>
					<input type="file" accept="image/*" onchange={(event) => updateUploadPreview("unitArtUrl", event)} />
				</label>
				<label class="stack quarter">
					<span>Unique Building</span>
					<input bind:value={form.buildingName} type="text" />
				</label>
				<label class="stack quarter">
					<span>Unique Building Icon File</span>
					<input type="file" accept="image/*" onchange={(event) => updateUploadPreview("buildingArtUrl", event)} />
				</label>
			</section>

			<section class="ui-helper-form-card stack half">
				<p class="eyebrow">Units</p>
				<div class="ui-helper-two-up">
					<label class="stack quarter">
						<span>Combat Unit</span>
						<input bind:value={form.combatUnitName} type="text" />
					</label>
					<label class="stack quarter">
						<span>Civilian Unit</span>
						<input bind:value={form.civilianUnitName} type="text" />
					</label>
				</div>
				<div class="ui-helper-two-up">
					<label class="stack quarter">
						<span>Combat Strength</span>
						<input bind:value={form.combatStrength} type="text" />
					</label>
					<label class="stack quarter">
						<span>Combat Moves</span>
						<input bind:value={form.combatMoves} type="text" />
					</label>
				</div>
				<label class="stack quarter">
					<span>Civilian Moves</span>
					<input bind:value={form.civilianMoves} type="text" />
				</label>
			</section>

			<section class="ui-helper-form-card stack half">
				<p class="eyebrow">City Banner</p>
				<label class="stack quarter">
					<span>City Name</span>
					<input bind:value={form.cityName} type="text" />
				</label>
				<div class="ui-helper-two-up">
					<label class="stack quarter">
						<span>Population</span>
						<input bind:value={form.cityPopulation} type="text" />
					</label>
					<label class="stack quarter">
						<span>Strength</span>
						<input bind:value={form.cityStrength} type="text" />
					</label>
				</div>
				<div class="ui-helper-two-up">
					<label class="stack quarter">
						<span>Faith / Yield</span>
						<input bind:value={form.cityFaith} type="text" />
					</label>
					<label class="stack quarter">
						<span>Status Note</span>
						<input bind:value={form.cityStatus} type="text" />
					</label>
				</div>
			</section>

			<section class="ui-helper-form-card stack half">
				<p class="eyebrow">Setup & Story Text</p>
				<div class="ui-helper-two-up">
					<label class="stack quarter">
						<span>Map Type</span>
						<input bind:value={form.mapType} type="text" />
					</label>
					<label class="stack quarter">
						<span>Map Size</span>
						<input bind:value={form.mapSize} type="text" />
					</label>
				</div>
				<div class="ui-helper-two-up">
					<label class="stack quarter">
						<span>Difficulty</span>
						<input bind:value={form.difficulty} type="text" />
					</label>
					<label class="stack quarter">
						<span>Game Pace</span>
						<input bind:value={form.gamePace} type="text" />
					</label>
				</div>
				<label class="stack quarter">
					<span>Setup Note</span>
					<textarea bind:value={form.setupNote} rows="3"></textarea>
				</label>
				<label class="stack quarter">
					<span>Loading Title</span>
					<input bind:value={form.loadingTitle} type="text" />
				</label>
				<label class="stack quarter">
					<span>Loading Screen Body</span>
					<textarea bind:value={form.loadingBody} rows="5"></textarea>
				</label>
				<label class="stack quarter">
					<span>Dawn Intro Body</span>
					<textarea bind:value={form.dawnBody} rows="5"></textarea>
				</label>
			</section>

			<section class="ui-helper-form-card stack half">
				<p class="eyebrow">Diplomacy</p>
				<label class="stack quarter">
					<span>Mood Label</span>
					<input bind:value={form.diplomacyMood} type="text" />
				</label>
				<label class="stack quarter">
					<span>Diplomacy Line</span>
					<textarea bind:value={form.diplomacyLine} rows="4"></textarea>
				</label>
			</section>

			<section class="ui-helper-form-card stack half">
				<p class="eyebrow">Art & Color</p>
				<label class="stack quarter">
					<span>Icon URL</span>
					<input bind:value={form.iconUrl} type="url" placeholder="https://..." />
				</label>
				<label class="stack quarter">
					<span>Icon File</span>
					<input type="file" accept="image/*" onchange={(event) => updateUploadPreview("iconUrl", event)} />
				</label>
				<label class="stack quarter">
					<span>Leader Art URL</span>
					<input bind:value={form.leaderArtUrl} type="url" placeholder="https://..." />
				</label>
				<label class="stack quarter">
					<span>Leader Art File</span>
					<input type="file" accept="image/*" onchange={(event) => updateUploadPreview("leaderArtUrl", event)} />
				</label>
				<label class="stack quarter">
					<span>Backdrop URL</span>
					<input bind:value={form.backdropUrl} type="url" placeholder="https://..." />
				</label>
				<label class="stack quarter">
					<span>Backdrop File</span>
					<input type="file" accept="image/*" onchange={(event) => updateUploadPreview("backdropUrl", event)} />
				</label>
				<div class="ui-helper-two-up">
					<label class="stack quarter">
						<span>Accent</span>
						<input bind:value={form.accentColor} type="color" />
					</label>
					<label class="stack quarter">
						<span>Civ Background Color</span>
						<input bind:value={form.civBackgroundColor} type="color" />
					</label>
				</div>
				<label class="stack quarter">
					<span>Civ Icon Color</span>
					<input bind:value={form.civIconColor} type="color" />
				</label>
			</section>

			<section class="ui-helper-form-card stack half">
				<p class="eyebrow">Color Notes</p>
				<p>
					The city banner and unit flags use the civ background and icon colors. Ethiopia style red and light icon tones are loaded by default so you can tune from a familiar starting point.
				</p>
			</section>
		</aside>

		<div class="ui-helper-preview-column">
			<div class="ui-helper-preview-grid">
				<article class="ui-screen-card is-wide">
					<div class="ui-screen-card-head">
						<p class="eyebrow">Civilization Select</p>
						<h3>List row and hierarchy check</h3>
					</div>
					<div
						class="ui-screen ui-screen-select"
						style={backgroundStyle(
							currentBackdropUrl(),
							"radial-gradient(circle at top, rgba(197,158,79,0.28), transparent 34%), linear-gradient(180deg, rgba(11,15,14,0.82), rgba(8,12,15,0.95))",
						)}
					>
						<div class="ui-select-shell">
							<div class="ui-select-title">Select Civilization</div>
							<div class="ui-select-list">
								{#each civSelectionRows(form) as row, rowIndex (`${row.civName}-${rowIndex}`)}
									<div class:active-row={row.active} class="ui-select-row">
										<div class="ui-select-badge" style={currentIconUrl() && row.active ? `background-image:${cssUrl(currentIconUrl())};` : ""}>
											{#if !(currentIconUrl() && row.active)}
												<span>{row.active ? emblemText(form) : initials(row.civName, 2)}</span>
											{/if}
										</div>
										<div class="ui-select-copy">
											<strong>{row.leaderName} - {row.civName}</strong>
											<p>{row.hook}</p>
										</div>
										<div class="ui-select-icons">
											<span>{traitBadge(form.abilityName)}</span>
											<span class="ui-mini-icon">
												{#if uniqueUnitImageUrl(form.unitName)}
													<img src={uniqueUnitImageUrl(form.unitName)} alt={form.unitName} loading="lazy" />
												{:else}
													{traitBadge(form.unitName)}
												{/if}
											</span>
											<span class="ui-mini-icon">
												{#if uniqueBuildingImageUrl(form.buildingName)}
													<img src={uniqueBuildingImageUrl(form.buildingName)} alt={form.buildingName} loading="lazy" />
												{:else}
													{traitBadge(form.buildingName)}
												{/if}
											</span>
										</div>
									</div>
								{/each}
							</div>
							<div class="ui-select-footer">
								<button type="button">Back</button>
							</div>
						</div>
					</div>
				</article>

				<article class="ui-screen-card is-wide">
					<div class="ui-screen-card-head">
						<p class="eyebrow">Game Setup</p>
						<h3>Front loaded settings and cover art</h3>
					</div>
					<div class="ui-screen ui-screen-setup" style={backgroundStyle(currentBackdropUrl(), "linear-gradient(180deg, rgba(24,17,12,0.28), rgba(10,12,14,0.94))")}>
						<div class="ui-setup-shell">
							<div class="ui-setup-crown">Set Up Game</div>
							<div class="ui-setup-body">
								<div class="ui-setup-list">
									<div class="ui-setup-row">
										<div class="ui-setup-icon">{emblemText(form)}</div>
										<div>
											<strong>{form.leaderName} - {form.civName}</strong>
											<p>{form.setupNote}</p>
										</div>
									</div>
									<div class="ui-setup-row">
										<div class="ui-setup-icon">M</div>
										<div>
											<strong>Map Type: {form.mapType}</strong>
											<p>{form.empireName}</p>
										</div>
									</div>
									<div class="ui-setup-row">
										<div class="ui-setup-icon">S</div>
										<div>
											<strong>Map Size: {form.mapSize}</strong>
											<p>Check whether the label still fits on the main setup card.</p>
										</div>
									</div>
									<div class="ui-setup-row">
										<div class="ui-setup-icon">D</div>
										<div>
											<strong>Difficulty: {form.difficulty}</strong>
											<p>Use this to spot awkward wrapping or weak contrast in the summary area.</p>
										</div>
									</div>
									<div class="ui-setup-row">
										<div class="ui-setup-icon">P</div>
										<div>
											<strong>Game Pace: {form.gamePace}</strong>
											<p>Long names and modded paces should still read cleanly.</p>
										</div>
									</div>
								</div>
								<div class="ui-setup-poster" style={backgroundStyle(currentLeaderArtUrl() || currentBackdropUrl(), "linear-gradient(180deg, rgba(6,8,10,0.18), rgba(6,8,10,0.5))")}>
									{#if !(currentLeaderArtUrl() || currentBackdropUrl())}
										<span>{initials(form.civName, 1)}</span>
									{/if}
								</div>
							</div>
							<div class="ui-setup-footer">
								<button type="button">Back</button>
								<button type="button">Randomize</button>
								<button type="button">Advanced Setup</button>
								<button type="button" class="is-primary">Start Game</button>
							</div>
						</div>
					</div>
				</article>

				<article class="ui-screen-card">
					<div class="ui-screen-card-head">
						<p class="eyebrow">City Banner</p>
						<h3>In game city banner color and fit check</h3>
					</div>
					<div
						class="ui-screen ui-screen-city"
						style={backgroundStyle(
							currentBackdropUrl(),
							"linear-gradient(180deg, rgba(133,149,76,0.18), rgba(92,117,58,0.26)), linear-gradient(180deg, rgba(16,22,18,0.08), rgba(16,22,18,0.28))",
						)}
					>
						<div class="ui-city-stack">
							<div class="ui-city-topline">
								<div class="ui-city-icon" style={currentIconUrl() ? `background-image:${cssUrl(currentIconUrl())};` : ""}>
									{#if !currentIconUrl()}
										<span>{emblemText(form)}</span>
									{/if}
								</div>
								<div class="ui-city-defense">{form.cityStrength}</div>
							</div>
							<div class="ui-city-banner">
								<div class="ui-city-pop">{form.cityPopulation}</div>
								<div class="ui-city-nameplate">
									<div class="ui-city-growth">{form.cityFaith}</div>
									<div class="ui-city-name">
										<strong>{form.cityName}</strong>
										<span>{form.cityStatus}</span>
									</div>
									<div class="ui-city-cross" aria-hidden="true">✢</div>
								</div>
								<div class="ui-city-tail"></div>
							</div>
						</div>
					</div>
				</article>

				<article class="ui-screen-card">
					<div class="ui-screen-card-head">
						<p class="eyebrow">Combat Unit</p>
						<h3>Flag and lower unit panel</h3>
					</div>
					<div
						class="ui-screen ui-screen-unit"
						style={backgroundStyle(
							currentBackdropUrl(),
							"linear-gradient(180deg, rgba(186,154,88,0.18), rgba(112,93,43,0.18)), linear-gradient(180deg, rgba(10,14,16,0.05), rgba(10,14,16,0.18))",
						)}
					>
						<div class="ui-unit-flag is-combat">
							<div class="ui-unit-chevron" style="--flag-color:var(--ui-civ-bg)"></div>
							<div class="ui-unit-flag-ring" style={currentIconUrl() ? `background-image:${cssUrl(currentIconUrl())};` : ""}>
								{#if !currentIconUrl()}
									<span>{emblemText(form)}</span>
								{/if}
							</div>
						</div>
						<div class="ui-unit-orders">A Unit Needs Orders</div>
						<div class="ui-unit-panel">
							<div class="ui-unit-portrait" style={unitImageUrl(form.combatUnitName) ? `background-image:${cssUrl(unitImageUrl(form.combatUnitName))};` : ""}>
								{#if !unitImageUrl(form.combatUnitName)}
									<span>{traitBadge(form.combatUnitName)}</span>
								{/if}
							</div>
							<div class="ui-unit-panel-copy">
								<strong>{form.combatUnitName}</strong>
								<div class="ui-unit-stats">
									<span>Movement {form.combatMoves}</span>
									<span>Strength {form.combatStrength}</span>
								</div>
							</div>
						</div>
					</div>
				</article>

				<article class="ui-screen-card">
					<div class="ui-screen-card-head">
						<p class="eyebrow">Civilian Unit</p>
						<h3>Civilian banner and unit panel</h3>
					</div>
					<div
						class="ui-screen ui-screen-unit is-civilian-screen"
						style={backgroundStyle(
							currentBackdropUrl(),
							"radial-gradient(circle at top, rgba(255,255,255,0.16), rgba(255,255,255,0.86) 60%, rgba(255,255,255,0.95) 100%), linear-gradient(180deg, rgba(42,68,44,0.15), rgba(19,35,24,0.08))",
						)}
					>
						<div class="ui-unit-flag is-civilian">
							<div class="ui-unit-chevron" style="--flag-color:var(--ui-civ-bg)"></div>
							<div class="ui-unit-flag-ring is-civilian-ring" style={currentIconUrl() ? `background-image:${cssUrl(currentIconUrl())};` : ""}>
								{#if !currentIconUrl()}
									<span>{emblemText(form)}</span>
								{/if}
							</div>
						</div>
						<div class="ui-unit-orders">A Unit Needs Orders</div>
						<div class="ui-unit-panel is-civilian-panel">
							<div class="ui-unit-tabs">
								<span class="is-active">{traitBadge(form.civilianUnitName)}</span>
								<span>{traitBadge(form.unitName)}</span>
							</div>
							<div class="ui-unit-portrait" style={unitImageUrl(form.civilianUnitName) ? `background-image:${cssUrl(unitImageUrl(form.civilianUnitName))};` : ""}>
								{#if !unitImageUrl(form.civilianUnitName)}
									<span>{traitBadge(form.civilianUnitName)}</span>
								{/if}
							</div>
							<div class="ui-unit-panel-copy">
								<strong>{form.civilianUnitName}</strong>
								<div class="ui-unit-stats">
									<span>{form.civilianMoves}/{form.civilianMoves}</span>
									<span>Ready for orders</span>
								</div>
							</div>
						</div>
					</div>
				</article>

				<article class="ui-screen-card is-wide">
					<div class="ui-screen-card-head">
						<p class="eyebrow">Loading Screen</p>
						<h3>Leader art, body copy, and uniques</h3>
					</div>
					<div class="ui-screen ui-screen-loading" style={backgroundStyle(currentBackdropUrl(), "linear-gradient(90deg, rgba(18,14,10,0.42), rgba(8,10,11,0.8))")}>
						<div class="ui-loading-art" style={backgroundStyle(currentLeaderArtUrl(), "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.16))")}>
							{#if !currentLeaderArtUrl()}
								<span>{initials(form.leaderName, 1)}</span>
							{/if}
						</div>
						<div class="ui-loading-panel">
							<div class="ui-loading-head">
								<div class="ui-loading-emblem" style={currentIconUrl() ? `background-image:${cssUrl(currentIconUrl())};` : ""}>
									{#if !currentIconUrl()}
										<span>{emblemText(form)}</span>
									{/if}
								</div>
								<div>
									<strong>{form.leaderName}</strong>
									<p>{form.empireName}</p>
								</div>
							</div>
							<h4>{form.loadingTitle}</h4>
							<p>{form.loadingBody}</p>
							<div class="ui-loading-uniques">
								<div>
									<strong>{form.abilityName}</strong>
									<p>{form.abilityText}</p>
								</div>
								<div class="ui-loading-unique-icons">
									<span class="ui-mini-icon">
										{#if uniqueUnitImageUrl(form.unitName)}
											<img src={uniqueUnitImageUrl(form.unitName)} alt={form.unitName} loading="lazy" />
										{:else}
											{traitBadge(form.unitName)}
										{/if}
									</span>
									<span class="ui-mini-icon">
										{#if uniqueBuildingImageUrl(form.buildingName)}
											<img src={uniqueBuildingImageUrl(form.buildingName)} alt={form.buildingName} loading="lazy" />
										{:else}
											{traitBadge(form.buildingName)}
										{/if}
									</span>
								</div>
							</div>
						</div>
					</div>
				</article>

				<article class="ui-screen-card">
					<div class="ui-screen-card-head">
						<p class="eyebrow">Dawn of Man</p>
						<h3>Centered story card over the map</h3>
					</div>
					<div
						class="ui-screen ui-screen-dawn"
						style={backgroundStyle(currentBackdropUrl(), "radial-gradient(circle at center, rgba(255,255,255,0.16), rgba(255,255,255,0.84) 58%, rgba(255,255,255,0.96) 100%)")}
					>
						<div class="ui-dawn-panel">
							<div class="ui-dawn-head">
								<div class="ui-loading-emblem" style={currentIconUrl() ? `background-image:${cssUrl(currentIconUrl())};` : ""}>
									{#if !currentIconUrl()}
										<span>{emblemText(form)}</span>
									{/if}
								</div>
								<div>
									<strong>{form.leaderName}</strong>
									<p>{form.empireName}</p>
								</div>
							</div>
							<p>{form.dawnBody}</p>
							<div class="ui-dawn-divider"></div>
							<strong>{form.abilityName}</strong>
							<p>{form.abilityText}</p>
							<div class="ui-dawn-uniques">
								<span>{form.unitName}</span>
								<span>{form.buildingName}</span>
							</div>
							<button type="button">Begin Your Journey</button>
						</div>
					</div>
				</article>

				<article class="ui-screen-card is-wide">
					<div class="ui-screen-card-head">
						<p class="eyebrow">Diplomacy</p>
						<h3>Leader art and lower dialog bar</h3>
					</div>
					<div
						class="ui-screen ui-screen-diplomacy"
						style={backgroundStyle(
							currentBackdropUrl(),
							"linear-gradient(180deg, rgba(83,127,171,0.12), rgba(18,28,40,0.12)), linear-gradient(180deg, rgba(12,19,23,0.05), rgba(12,19,23,0.22))",
						)}
					>
						<div class="ui-diplomacy-leader" style={backgroundStyle(currentLeaderArtUrl(), "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.12))")}>
							{#if !currentLeaderArtUrl()}
								<span>{initials(form.leaderName, 1)}</span>
							{/if}
						</div>
						<div class="ui-diplomacy-actions">
							{#each diplomacyActions as action (action)}
								<button type="button">{action}</button>
							{/each}
						</div>
						<div class="ui-diplomacy-bar">
							<div class="ui-diplomacy-head">
								<div class="ui-diplomacy-emblem" style={currentIconUrl() ? `background-image:${cssUrl(currentIconUrl())};` : ""}>
									{#if !currentIconUrl()}
										<span>{emblemText(form)}</span>
									{/if}
								</div>
								<div>
									<strong>{form.leaderName} of {form.civName}</strong>
									<p>{form.diplomacyLine}</p>
								</div>
							</div>
							<div class="ui-diplomacy-mood">{form.diplomacyMood}</div>
						</div>
					</div>
				</article>
			</div>
		</div>
	</section>
</section>

<style>
	.ui-helper-page {
		display: grid;
		gap: 1.5rem;
	}

	.ui-helper-hero {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.8fr);
		gap: 1rem;
		align-items: stretch;
	}

	.ui-helper-hero-copy p,
	.ui-helper-hero-note p {
		margin: 0;
	}

	.ui-helper-hero-note {
		display: grid;
		gap: 0.5rem;
		padding: 1.2rem;
		border-radius: 1.25rem;
		background: radial-gradient(circle at top right, rgba(214, 171, 86, 0.2), transparent 42%), linear-gradient(160deg, rgba(7, 22, 28, 0.96), rgba(17, 14, 10, 0.94));
		border: 1px solid rgba(216, 177, 90, 0.22);
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.24);
	}

	.ui-helper-hero-note strong,
	.ui-screen-card h3,
	.ui-select-title,
	.ui-loading-panel strong,
	.ui-dawn-panel strong,
	.ui-diplomacy-bar strong,
	.ui-city-name strong,
	.ui-setup-row strong {
		font-family: "Alegreya SC", "Georgia", serif;
	}

	.ui-helper-workspace {
		--ui-accent: #d8b15a;
		--ui-panel: #081113;
		display: grid;
		grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}

	.ui-helper-controls,
	.ui-screen-card {
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--ui-accent) 14%, transparent), transparent 38%),
			linear-gradient(180deg, color-mix(in srgb, var(--ui-panel) 94%, black 6%), color-mix(in srgb, var(--ui-panel) 88%, black 12%));
		border: 1px solid color-mix(in srgb, var(--ui-accent) 24%, rgba(255, 255, 255, 0.14));
		border-radius: 1.25rem;
		box-shadow: 0 22px 56px rgba(0, 0, 0, 0.24);
	}

	.ui-helper-controls {
		position: sticky;
		max-block-size: calc(100vh - 6rem);
		padding: 1rem;
		inset-block-start: 5rem;
		overflow: auto;
		overscroll-behavior: contain;
	}

	.ui-helper-controls-head p,
	.ui-helper-controls-head h2,
	.ui-helper-controls-head p:last-child,
	.ui-helper-form-card p {
		margin: 0;
	}

	.ui-helper-action-row {
		position: sticky;
		inset-block-start: 0;
		z-index: 2;
		display: flex;
		justify-content: flex-start;
		padding-block: 0.15rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--ui-panel) 96%, black 4%), color-mix(in srgb, var(--ui-panel) 82%, transparent 18%));
	}

	.ui-helper-button,
	.ui-select-footer button,
	.ui-setup-footer button,
	.ui-dawn-panel button,
	.ui-diplomacy-actions button {
		border: 1px solid color-mix(in srgb, var(--ui-accent) 45%, white 12%);
		border-radius: 0.8rem;
		background: linear-gradient(180deg, color-mix(in srgb, #0f6b67 78%, white 22%), color-mix(in srgb, #0a3735 90%, black 10%));
		color: #f8efdb;
		font: inherit;
		padding: 0.6rem 0.9rem;
		cursor: pointer;
	}

	.ui-helper-button:hover,
	.ui-select-footer button:hover,
	.ui-setup-footer button:hover,
	.ui-dawn-panel button:hover,
	.ui-diplomacy-actions button:hover {
		filter: brightness(1.06);
	}

	.ui-helper-form-card {
		padding: 0.9rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.ui-helper-form-card label span,
	.ui-screen-card-head p,
	.ui-screen-card-head h3,
	.ui-select-row p,
	.ui-loading-panel p,
	.ui-dawn-panel p,
	.ui-diplomacy-bar p,
	.ui-setup-row p,
	.ui-city-name span {
		margin: 0;
	}

	.ui-helper-form-card input,
	.ui-helper-form-card textarea {
		inline-size: 100%;
		color: var(--ink);
		font: inherit;
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid rgba(216, 177, 90, 0.22);
		border-radius: 0.85rem;
		padding: 0.72rem 0.82rem;
	}

	.ui-helper-form-card textarea {
		min-block-size: 5rem;
		field-sizing: fixed;
		resize: vertical;
	}

	.ui-helper-two-up {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.ui-helper-preview-column {
		min-inline-size: 0;
		overflow: clip;
	}

	.ui-helper-preview-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.ui-screen-card {
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		min-inline-size: 0;
	}

	.ui-screen-card.is-wide {
		grid-column: 1 / -1;
	}

	.ui-screen-card-head {
		display: grid;
		gap: 0.2rem;
	}

	.ui-screen {
		position: relative;
		overflow: hidden;
		border-radius: 1rem;
		border: 1px solid rgba(240, 225, 187, 0.14);
		background-color: #111;
		background-position: center;
		background-size: cover;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
	}

	.ui-screen-select {
		aspect-ratio: 4 / 3;
		min-block-size: 30rem;
		padding: 1.5rem;
	}

	.ui-select-shell {
		inline-size: min(100%, 48rem);
		margin-inline: auto;
		padding: 1rem 1rem 0.9rem;
		border-radius: 1.2rem;
		background: linear-gradient(180deg, rgba(7, 15, 18, 0.94), rgba(7, 15, 18, 0.9));
		border: 2px solid color-mix(in srgb, var(--ui-accent) 70%, #0e6f66 30%);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.38);
	}

	.ui-select-title {
		padding-block-end: 0.75rem;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #efe1be;
	}

	.ui-select-list {
		display: grid;
		gap: 0.45rem;
	}

	.ui-select-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.7rem;
		border-radius: 999px;
		border: 1px solid rgba(216, 177, 90, 0.2);
		background: rgba(0, 0, 0, 0.42);
	}

	.ui-select-row.active-row {
		border-color: color-mix(in srgb, var(--ui-accent) 70%, #f5dfac 30%);
		box-shadow: inset 0 0 0 1px rgba(255, 250, 233, 0.2);
	}

	.ui-select-badge,
	.ui-loading-emblem,
	.ui-diplomacy-emblem {
		inline-size: 3.2rem;
		block-size: 3.2rem;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background:
			radial-gradient(circle at 30% 30%, rgba(255, 245, 205, 0.42), transparent 45%),
			linear-gradient(180deg, color-mix(in srgb, var(--ui-accent) 94%, white 6%), color-mix(in srgb, var(--ui-accent) 78%, black 22%));
		background-position: center;
		background-size: cover;
		color: #140f09;
		font-weight: 700;
		box-shadow: 0 0 0 2px rgba(245, 231, 182, 0.55);
	}

	.ui-select-copy {
		min-inline-size: 0;
	}

	.ui-select-copy strong,
	.ui-loading-head strong,
	.ui-dawn-head strong,
	.ui-diplomacy-head strong {
		display: block;
		color: #f5e6b8;
		font-size: 1rem;
	}

	.ui-select-copy p,
	.ui-loading-panel p,
	.ui-dawn-panel p,
	.ui-diplomacy-bar p,
	.ui-setup-row p {
		color: rgba(251, 245, 228, 0.82);
		font-size: 0.9rem;
		line-height: 1.35;
	}

	.ui-select-icons,
	.ui-loading-unique-icons,
	.ui-dawn-uniques {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.ui-select-icons span,
	.ui-loading-unique-icons span,
	.ui-dawn-uniques span {
		inline-size: 2rem;
		block-size: 2rem;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: rgba(255, 239, 192, 0.1);
		border: 1px solid rgba(255, 228, 171, 0.32);
		color: #f7e6b3;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.ui-mini-icon {
		overflow: hidden;
	}

	.ui-mini-icon img {
		inline-size: 100%;
		block-size: 100%;
		display: block;
		object-fit: cover;
	}

	.ui-select-footer,
	.ui-setup-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		justify-content: space-between;
		padding-block-start: 0.9rem;
	}

	.ui-setup-footer .is-primary {
		min-inline-size: 9.5rem;
	}

	.ui-screen-setup {
		min-block-size: 31rem;
		padding: 1.8rem;
	}

	.ui-setup-shell {
		inline-size: min(100%, 50rem);
		margin-inline: auto;
		padding: 1rem 1.2rem;
		border-radius: 1rem;
		background: rgba(5, 11, 13, 0.88);
		border: 2px solid rgba(213, 177, 91, 0.72);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.36);
	}

	.ui-setup-crown {
		padding-block-end: 0.8rem;
		text-align: center;
		color: #f5e6b6;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.ui-setup-body {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(12rem, 0.9fr);
		gap: 1rem;
	}

	.ui-setup-list {
		display: grid;
		gap: 0.8rem;
	}

	.ui-setup-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.8rem;
		align-items: start;
		padding-block-end: 0.8rem;
		border-block-end: 1px solid rgba(216, 177, 90, 0.18);
	}

	.ui-setup-icon {
		inline-size: 3rem;
		block-size: 3rem;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: linear-gradient(180deg, rgba(215, 185, 90, 0.95), rgba(150, 114, 26, 0.95));
		color: #20160a;
		font-weight: 700;
	}

	.ui-setup-poster {
		min-block-size: 18rem;
		border-radius: 0.9rem;
		background-position: center;
		background-size: cover;
		display: grid;
		place-items: center;
		color: rgba(255, 241, 196, 0.82);
		font-size: 3rem;
		font-family: "Alegreya SC", "Georgia", serif;
		border: 1px solid rgba(248, 226, 171, 0.38);
	}

	.ui-screen-city {
		min-block-size: 20rem;
		display: grid;
		place-items: center;
	}

	.ui-city-banner {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		inline-size: min(100%, 24rem);
		filter: drop-shadow(0 12px 22px rgba(0, 0, 0, 0.22));
	}

	.ui-city-stack {
		display: grid;
		gap: 0.45rem;
	}

	.ui-city-topline {
		display: flex;
		align-items: end;
		gap: 0.55rem;
		padding-inline-start: 1.2rem;
	}

	.ui-city-icon {
		inline-size: 2.9rem;
		block-size: 2.9rem;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.55), transparent 42%), var(--ui-civ-bg);
		background-position: center;
		background-size: cover;
		color: var(--ui-civ-icon);
		border: 3px solid rgba(244, 240, 221, 0.9);
		box-shadow: 0 0 0 1px rgba(67, 61, 46, 0.72);
		font-weight: 700;
	}

	.ui-city-defense {
		padding: 0.18rem 0.6rem;
		border-radius: 0.7rem;
		background: rgba(34, 37, 33, 0.76);
		color: #f3ecd2;
		font-family: "Alegreya SC", "Georgia", serif;
		font-size: 1.1rem;
		border: 1px solid rgba(226, 219, 184, 0.4);
	}

	.ui-city-pop,
	.ui-city-tail {
		inline-size: 4.15rem;
		block-size: 4.15rem;
		display: grid;
		place-items: center;
		background: linear-gradient(180deg, rgba(235, 232, 216, 0.98), rgba(198, 190, 164, 0.98));
		border: 2px solid rgba(81, 80, 61, 0.88);
	}

	.ui-city-pop {
		border-radius: 999px 0 0 999px;
		font-family: "Alegreya SC", "Georgia", serif;
		font-size: 1.9rem;
		color: #1b170f;
	}

	.ui-city-tail {
		border-radius: 0 999px 999px 0;
	}

	.ui-city-nameplate {
		min-inline-size: 0;
		block-size: 4.15rem;
		padding: 0.45rem 0.8rem;
		border-block: 2px solid rgba(81, 80, 61, 0.88);
		background:
			linear-gradient(90deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.08) 18%, rgba(255, 255, 255, 0.08) 82%, rgba(0, 0, 0, 0.2)),
			linear-gradient(180deg, rgba(240, 236, 220, 0.92), rgba(199, 195, 178, 0.88));
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.7rem;
		position: relative;
	}

	.ui-city-growth {
		color: #7ec93f;
		font-family: "Alegreya SC", "Georgia", serif;
		font-size: 1.75rem;
		line-height: 1;
	}

	.ui-city-cross {
		color: var(--ui-civ-icon);
		font-size: 1.8rem;
		line-height: 1;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.ui-city-name strong {
		display: block;
		color: var(--ui-civ-bg);
		font-size: 1.45rem;
	}

	.ui-city-name span {
		font-size: 0.8rem;
		color: rgba(45, 52, 30, 0.9);
	}

	.ui-screen-unit {
		min-block-size: 20rem;
		padding: 1rem;
	}

	.ui-screen-unit::before {
		content: "";
		position: absolute;
		inset: auto auto 4.8rem 50%;
		inline-size: 3.3rem;
		block-size: 3.3rem;
		border-radius: 999px;
		transform: translateX(-50%);
		background: radial-gradient(circle, rgba(255, 227, 92, 0.7), rgba(255, 227, 92, 0.08) 72%);
		filter: blur(0.6px);
	}

	.ui-unit-flag {
		position: absolute;
		inset-block-start: 3.3rem;
		inset-inline-start: 50%;
		transform: translateX(-50%);
		display: grid;
		justify-items: center;
		gap: 0.25rem;
		z-index: 2;
	}

	.ui-unit-chevron {
		inline-size: 1.8rem;
		block-size: 2rem;
		clip-path: polygon(50% 0, 100% 100%, 50% 82%, 0 100%);
		background: var(--flag-color, var(--ui-civ-bg));
		border: 2px solid rgba(245, 236, 214, 0.88);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
	}

	.ui-unit-flag-ring {
		inline-size: 2.65rem;
		block-size: 2.65rem;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.5), transparent 42%), var(--ui-civ-bg);
		background-position: center;
		background-size: cover;
		color: var(--ui-civ-icon);
		border: 3px solid rgba(245, 236, 214, 0.9);
		box-shadow: 0 0 0 1px rgba(56, 53, 41, 0.72);
		font-weight: 700;
	}

	.ui-unit-flag-ring.is-civilian-ring {
		border-radius: 0.7rem;
	}

	.ui-unit-orders {
		position: absolute;
		inset-inline-end: 1rem;
		inset-block-end: 5.1rem;
		padding: 0.55rem 1.1rem;
		border-radius: 0.8rem;
		background: linear-gradient(180deg, rgba(18, 107, 103, 0.94), rgba(8, 58, 56, 0.96));
		border: 1px solid rgba(238, 214, 154, 0.58);
		color: #f8efdb;
		font-family: "Alegreya SC", "Georgia", serif;
		font-size: 1.05rem;
	}

	.ui-unit-panel {
		position: absolute;
		inset-inline-start: 0.8rem;
		inset-block-end: 0.8rem;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.7rem;
		align-items: center;
		padding: 0.7rem 0.8rem;
		min-inline-size: 15rem;
		border-radius: 0.95rem;
		background: linear-gradient(180deg, rgba(22, 67, 67, 0.95), rgba(10, 43, 42, 0.98));
		border: 1px solid rgba(238, 214, 154, 0.5);
		color: #f6ecd3;
		box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
	}

	.ui-unit-panel.is-civilian-panel {
		grid-template-columns: auto auto minmax(0, 1fr);
		min-inline-size: 17rem;
	}

	.ui-unit-tabs {
		display: grid;
		gap: 0.3rem;
	}

	.ui-unit-tabs span {
		inline-size: 1.8rem;
		block-size: 1.8rem;
		border-radius: 0.45rem;
		display: grid;
		place-items: center;
		background: rgba(245, 234, 198, 0.14);
		border: 1px solid rgba(245, 234, 198, 0.32);
		font-size: 0.72rem;
	}

	.ui-unit-tabs .is-active {
		background: rgba(245, 234, 198, 0.26);
	}

	.ui-unit-portrait {
		inline-size: 3.35rem;
		block-size: 3.35rem;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.48), transparent 42%), var(--ui-civ-bg);
		background-position: center;
		background-size: cover;
		color: var(--ui-civ-icon);
		border: 2px solid rgba(245, 236, 214, 0.82);
		font-weight: 700;
	}

	.ui-unit-panel-copy strong {
		display: block;
		font-family: "Alegreya SC", "Georgia", serif;
		font-size: 1.05rem;
	}

	.ui-unit-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.8rem;
		font-size: 0.86rem;
		color: rgba(248, 238, 218, 0.82);
	}

	.ui-screen-loading {
		min-block-size: 36rem;
		aspect-ratio: 4 / 3;
		padding: 1.1rem;
	}

	.ui-loading-art,
	.ui-diplomacy-leader {
		background-position: center;
		background-size: cover;
		display: grid;
		place-items: center;
		color: rgba(255, 238, 202, 0.82);
		font-size: 4rem;
		font-family: "Alegreya SC", "Georgia", serif;
	}

	.ui-loading-art {
		position: absolute;
		inset: 0 47% 0 0;
		border-start-start-radius: 1rem;
		border-end-start-radius: 1rem;
	}

	.ui-loading-panel {
		position: absolute;
		inset: 1rem 1rem 3rem 53%;
		display: grid;
		align-content: start;
		gap: 0.8rem;
		padding: 1.15rem;
		background: rgba(5, 10, 12, 0.82);
		border: 1px solid rgba(247, 225, 169, 0.42);
		border-radius: 0.9rem;
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
	}

	.ui-loading-head,
	.ui-dawn-head,
	.ui-diplomacy-head {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.8rem;
		align-items: center;
	}

	.ui-loading-panel h4 {
		margin: 0;
		font-family: "Alegreya SC", "Georgia", serif;
		color: #f7e7ba;
		font-size: 1.6rem;
	}

	.ui-screen-loading::after {
		content: "Loading...";
		position: absolute;
		inset-inline-start: 50%;
		inset-block-end: 0.7rem;
		transform: translateX(-50%);
		min-inline-size: 10rem;
		padding: 0.35rem 1rem;
		border-radius: 999px;
		background: linear-gradient(180deg, rgba(17, 103, 99, 0.92), rgba(8, 49, 47, 0.96));
		border: 1px solid rgba(236, 212, 152, 0.56);
		color: #f8efdb;
		font-family: "Alegreya SC", "Georgia", serif;
		font-size: 1.15rem;
		text-align: center;
		letter-spacing: 0.04em;
	}

	.ui-loading-uniques {
		display: grid;
		gap: 0.6rem;
		padding-block-start: 0.5rem;
		border-block-start: 1px solid rgba(247, 225, 169, 0.16);
	}

	.ui-screen-dawn {
		min-block-size: 24rem;
		padding: 1.2rem;
		display: grid;
		place-items: center;
	}

	.ui-dawn-panel {
		inline-size: min(100%, 22rem);
		display: grid;
		gap: 0.8rem;
		padding: 1rem;
		border-radius: 0.95rem;
		background: rgba(8, 12, 15, 0.84);
		border: 1px solid rgba(245, 221, 164, 0.52);
		box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
	}

	.ui-dawn-divider {
		block-size: 1px;
		background: rgba(245, 221, 164, 0.22);
	}

	.ui-dawn-panel button {
		justify-self: center;
		min-inline-size: 12rem;
	}

	.ui-screen-diplomacy {
		aspect-ratio: 16 / 9;
		min-block-size: 29rem;
		padding: 1.2rem 1.2rem 5.2rem;
	}

	.ui-diplomacy-leader {
		position: absolute;
		inset: 0;
		inset-block-end: 3.9rem;
	}

	.ui-diplomacy-actions {
		position: absolute;
		inset-inline-end: 1rem;
		inset-block-start: 50%;
		transform: translateY(-50%);
		display: grid;
		gap: 0.5rem;
		z-index: 2;
	}

	.ui-diplomacy-actions button {
		inline-size: 8rem;
	}

	.ui-diplomacy-bar {
		position: absolute;
		inset-inline: 1.2rem 11rem;
		inset-block-end: 1rem;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1rem;
		align-items: center;
		padding: 0.75rem 0.95rem;
		border-radius: 0.9rem;
		background: rgba(3, 7, 9, 0.82);
		border: 1px solid rgba(247, 225, 169, 0.34);
		z-index: 2;
	}

	.ui-diplomacy-mood {
		align-self: start;
		padding: 0.3rem 0.6rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: #f7e7ba;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	@media (max-width: 1100px) {
		.ui-helper-hero,
		.ui-helper-workspace {
			grid-template-columns: 1fr;
		}

		.ui-helper-controls {
			position: static;
			max-block-size: none;
			padding: 0.9rem;
		}

		.ui-helper-preview-grid {
			grid-template-columns: 1fr;
		}

		.ui-screen-card.is-wide {
			grid-column: auto;
		}
	}

	@media (max-width: 760px) {
		.ui-helper-action-row {
			inset-block-start: 0.5rem;
			margin-block-end: 0.2rem;
		}

		.ui-helper-form-card textarea {
			min-block-size: 7rem;
		}

		.ui-helper-two-up,
		.ui-setup-body,
		.ui-diplomacy-bar,
		.ui-select-row {
			grid-template-columns: 1fr;
		}

		.ui-screen-select,
		.ui-screen-setup,
		.ui-screen-dawn,
		.ui-screen-diplomacy {
			padding: 1rem;
		}

		.ui-screen-select,
		.ui-screen-diplomacy {
			aspect-ratio: auto;
		}

		.ui-screen-loading {
			aspect-ratio: auto;
			min-block-size: 30rem;
			padding: 0;
		}

		.ui-screen-unit {
			min-block-size: 21rem;
		}

		.ui-loading-art,
		.ui-loading-panel {
			position: static;
			inset: auto;
		}

		.ui-loading-art {
			min-block-size: 14rem;
			border-radius: 1rem 1rem 0 0;
		}

		.ui-loading-panel {
			border-radius: 0 0 1rem 1rem;
			border: 0;
			border-block-start: 1px solid rgba(247, 225, 169, 0.22);
			box-shadow: none;
		}

		.ui-screen-loading::after {
			inset-block-end: 0.6rem;
		}

		.ui-city-banner {
			inline-size: min(100%, 20rem);
		}

		.ui-unit-orders {
			inset-inline: auto 0.8rem;
			inset-block-end: 5.4rem;
			max-inline-size: 12rem;
			text-align: center;
		}

		.ui-unit-panel,
		.ui-unit-panel.is-civilian-panel {
			inset-inline: 0.8rem;
			min-inline-size: 0;
			inline-size: calc(100% - 1.6rem);
			grid-template-columns: auto minmax(0, 1fr);
		}

		.ui-unit-tabs {
			display: none;
		}

		.ui-diplomacy-actions {
			position: static;
			transform: none;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			margin-block-start: 1rem;
		}

		.ui-diplomacy-bar {
			position: static;
			margin-block-start: 1rem;
		}
	}
</style>
