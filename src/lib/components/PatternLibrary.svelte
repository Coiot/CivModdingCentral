<script>
	import { tick } from "svelte";
	import SnippetExample from "./SnippetExample.svelte";
	import { recipeLaunchRecipes } from "../data/generatorPageData.js";

	const RECIPE_TOP_LEVEL_CATEGORY_DEFS = [
		// { id: "all", label: "All Recipes" },
		{ id: "core-data", label: "Core Data" },
		{ id: "lua-gameplay", label: "Lua Gameplay" },
		{ id: "setup-debug", label: "Setup & Debug" },
	];

	const RECIPE_FILTER_CATEGORY_DEFS = [
		// { id: "all", label: "All Recipes" },
		{ id: "core-data", label: "Core Data" },
		{ id: "state-safety", label: "State & Safety" },
		{ id: "rewards-feedback", label: "Rewards & Feedback" },
		{ id: "units-promotions", label: "Units & Promotions" },
		{ id: "city-event-hooks", label: "Cities & Event Hooks" },
		{ id: "map-targeting", label: "Map & Targeting" },
		{ id: "shared-helpers", label: "Shared Helpers" },
		{ id: "setup-debug", label: "Setup & Debug" },
	];

	const RECIPE_QUICK_START_DEFS = [
		{ title: "Log & Debug Triage", summary: "Turn on logs and read database, XML, and Lua errors in order." },
		{ title: "Dummy Building Scaffold", summary: "Use a hidden building to apply indirect city effects." },
		{ title: "Unit Spawn Workflow", summary: "Spawn a unit, place it safely, and finish setup." },
		{ title: "Unique Replacement Setup", summary: "Set up a UU, UB, or UI replacement cleanly without breaking the base class chain." },
		{ title: "Requirements Gate Pattern", summary: "Gate a reward, building, or trigger behind clear yes or no checks." },
		{ title: "City Capture / Found / Construct Hooks", summary: "React cleanly when cities are founded, captured, or finish important builds." },
	];

	let activeRecipeCategory = $state("core-data");
	let activeRecipeTitle = $state(recipeLaunchRecipes[0]?.title ?? "");
	let recipeDetailCard = $state();
	let urlSyncReady = false;
	let suppressUrlSync = false;
	let nextUrlSyncMode = "replace";

	function recipeSlug(title) {
		return String(title || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	function getRecipeBySlug(slug) {
		return recipeLaunchRecipes.find((recipe) => recipeSlug(recipe.title) === slug) || null;
	}

	function getFilteredRecipesForCategory(categoryId) {
		if (categoryId === "all") {
			return recipeLaunchRecipes;
		}

		if (RECIPE_TOP_LEVEL_CATEGORY_DEFS.some((category) => category.id === categoryId && category.id !== "all")) {
			return recipeLaunchRecipes.filter((recipe) => resolveTopLevelRecipeCategoryId(recipe) === categoryId);
		}

		return recipeLaunchRecipes.filter((recipe) => resolveRecipeCategoryId(recipe) === categoryId);
	}

	function applyRecipeSelection(recipe, options = {}) {
		if (!recipe) {
			return;
		}

		nextUrlSyncMode = options.urlMode ?? "push";
		const nextCategoryId = options.categoryId ?? resolveRecipeCategoryId(recipe);
		activeRecipeCategory = nextCategoryId;
		activeRecipeTitle = recipe.title;
	}

	function syncStateFromUrl(search) {
		const params = new URLSearchParams(search || "");
		const patternSlug = params.get("pattern");
		const categoryId = params.get("category");
		const recipe = patternSlug ? getRecipeBySlug(patternSlug) : null;
		const fallbackCategoryId = RECIPE_FILTER_CATEGORY_DEFS.some((category) => category.id === categoryId) ? categoryId : null;

		if (recipe) {
			applyRecipeSelection(recipe, { categoryId: fallbackCategoryId ?? resolveRecipeCategoryId(recipe) });
			return;
		}

		if (fallbackCategoryId) {
			const categoryRecipes = getFilteredRecipesForCategory(fallbackCategoryId);
			activeRecipeCategory = fallbackCategoryId;
			activeRecipeTitle = categoryRecipes[0]?.title ?? recipeLaunchRecipes[0]?.title ?? "";
		}
	}

	function writeRecipeUrl(mode = "replace") {
		if (typeof window === "undefined" || !activeRecipe) {
			return;
		}

		const params = new URLSearchParams(window.location.search);
		params.set("pattern", recipeSlug(activeRecipe.title));
		params.set("category", activeRecipeCategory);

		const query = params.toString();
		const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash || ""}`;
		const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
		if (nextUrl === currentUrl) {
			return;
		}

		const stateMethod = mode === "push" ? "pushState" : "replaceState";
		window.history[stateMethod]({}, "", nextUrl);
	}

	function resolveTopLevelRecipeCategoryId(recipe) {
		switch (recipe?.title) {
			case "Dummy Building Scaffold":
			case "Trait / Leader / Civ Wiring":
			case "Unique Replacement Setup":
			case "Promotion Chain Setup":
			case "Policy / Branch Attachment":
			case "SQL Merge / Delete Pattern":
			case "Building-Class Override Pattern":
			case "Civilopedia + Art Define Wiring":
			case "Dummy Policy / Dummy Building Tradeoff":
				return "core-data";
			case "Audio Hook Setup":
			case "Leader / Civ Music Setup":
			case "Log & Debug Triage":
			case "VFS / UI Include Setup":
			case "CityInfoStack UI Injection":
			case "UI Override Packaging":
			case "Compatibility Pack / Reference-Heavy ModInfo":
			case "Localized Building + Notification Text":
			case "UI Addin vs UI Override Decision Guide":
			case "Minimal New Civ File Checklist":
			case "Why My Mod Loaded But Did Nothing":
				return "setup-debug";
			default:
				return "lua-gameplay";
		}
	}

	function resolveRecipeCategoryId(recipe) {
		const topLevelCategoryId = resolveTopLevelRecipeCategoryId(recipe);
		return topLevelCategoryId === "lua-gameplay" ? resolveLuaGameplayGroupId(recipe) : topLevelCategoryId;
	}

	function recipeCategoryCount(categoryId) {
		if (categoryId === "all") {
			return recipeLaunchRecipes.length;
		}

		if (RECIPE_TOP_LEVEL_CATEGORY_DEFS.some((category) => category.id === categoryId && category.id !== "all")) {
			return recipeLaunchRecipes.filter((recipe) => resolveTopLevelRecipeCategoryId(recipe) === categoryId).length;
		}

		return recipeLaunchRecipes.filter((recipe) => resolveRecipeCategoryId(recipe) === categoryId).length;
	}

	function recipeCategoryLabel(categoryId) {
		return (
			RECIPE_FILTER_CATEGORY_DEFS.find((category) => category.id === categoryId)?.label ?? RECIPE_TOP_LEVEL_CATEGORY_DEFS.find((category) => category.id === categoryId)?.label ?? "All Recipes"
		);
	}

	function resolveLuaGameplayGroupId(recipe) {
		switch (recipe?.title) {
			case "SaveData Cooldown / Once-Per-City / Once-Per-Player":
			case "Once-Per-Trigger Guard":
			case "Unit Tracking Table":
			case "City Tracking Table":
			case "Mod Configuration Toggle":
			case "Mod Detection / Compatibility Toggle":
			case "Player / Team Lookup Safety":
			case "One-Time Initialization on First Turn":
			case "Table Saver / Loader for SaveData":
				return "state-safety";
			case "Decision / Event Reward":
			case "Yield Burst Helper":
			case "Cooldown + Notification Combo":
			case "Notification Utility Wrapper":
			case "Great Person Expended Reaction":
			case "Yield Reward With Scaled Era Output":
			case "War / Peace Transition Hooks":
			case "Minor Friends / Allies Change Trigger":
				return "rewards-feedback";
			case "Unit Spawn Helper":
			case "Unit Spawn Workflow":
			case "Unit Created Post-Spawn Setup":
			case "City Trained Trigger":
			case "Promotion Grant / Strip Logic":
			case "Promotion-On-Train / Promotion-On-Create":
			case "Fastest / Strongest Trainable Unit Resolver":
			case "Unit Upgrade Carryover":
			case "Religious Unit Handling":
			case "Great Person Spawn + Placement Fallback":
			case "Free Promotion From Building / Policy / Trait":
			case "Unit Promoted Trigger":
				return "units-promotions";
			case "Per-Turn City Scanner":
			case "Building Grant / Remove Lua Helper":
			case "Dynamic Dummy Building Updater":
			case "Trait Driven Lua Effect":
			case "City Founded Initialization":
			case "City Capture Follow-Up":
			case "City Capture / Found / Construct Hooks":
			case "Policy Adoption Trigger":
			case "Tech Unlock Listener":
			case "Build Finished Trigger":
			case "On City Growth Trigger":
			case "City Constructed / Project Created Trigger":
			case "Religion Founded / Conversion Hooks":
				return "city-event-hooks";
			case "Holy City / Largest City Reward Resolver":
			case "Requirements Gate Pattern":
			case "Religion / Belief Condition Check":
			case "Plot Search Pattern":
			case "Distance + Closest Resolver":
			case "Strategic / Luxury Resource Spawn":
			case "Unit Movement / Entered Tile Trigger":
			case "Plot Iterators / Radius Scan":
			case "Nearest Valid Plot Finder":
			case "City Bought Plot Trigger":
				return "map-targeting";
			case "Trait Helper / IsTraitActive":
			case "Great Person Rate Calculator":
			default:
				return "shared-helpers";
		}
	}

	function luaGameplayGroupLabel(groupId) {
		switch (groupId) {
			case "state-safety":
				return "State & Safety";
			case "rewards-feedback":
				return "Rewards & Feedback";
			case "units-promotions":
				return "Units & Promotions";
			case "city-event-hooks":
				return "Cities & Event Hooks";
			case "map-targeting":
				return "Map & Targeting";
			default:
				return "Shared Helpers";
		}
	}

	function setActiveRecipe(title) {
		nextUrlSyncMode = "push";
		activeRecipeTitle = title;
	}

	function selectAdjacentRecipe(direction) {
		if (!filteredRecipes.length) {
			return;
		}

		const currentIndex = activeRecipeIndex >= 0 ? activeRecipeIndex : 0;
		const nextIndex = (currentIndex + direction + filteredRecipes.length) % filteredRecipes.length;
		setActiveRecipe(filteredRecipes[nextIndex].title);
	}

	function setRecipeCategory(categoryId) {
		nextUrlSyncMode = "push";
		activeRecipeCategory = categoryId;
		const nextRecipes = getFilteredRecipesForCategory(categoryId);
		activeRecipeTitle = nextRecipes.some((recipe) => recipe.title === activeRecipeTitle) ? activeRecipeTitle : (nextRecipes[0]?.title ?? "");
	}

	async function scrollActiveRecipeIntoView() {
		await tick();
		recipeDetailCard?.scrollIntoView({ block: "start", behavior: "smooth" });
	}

	async function selectQuickStart(title) {
		const recipe = recipeLaunchRecipes.find((item) => item.title === title);
		if (!recipe) {
			return;
		}

		applyRecipeSelection(recipe, { urlMode: "push" });
		await scrollActiveRecipeIntoView();
	}

	function handleWindowPopState() {
		suppressUrlSync = true;
		nextUrlSyncMode = "replace";
		syncStateFromUrl(window.location.search);
	}

	function isTypingTarget(target) {
		return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
	}

	function handleWindowKeyDown(event) {
		if (isTypingTarget(event.target)) {
			return;
		}

		if (event.key === "[") {
			event.preventDefault();
			selectAdjacentRecipe(-1);
			return;
		}

		if (event.key === "]") {
			event.preventDefault();
			selectAdjacentRecipe(1);
		}
	}

	function isQuickStartActive(title) {
		return activeRecipe?.title === title;
	}

	function touchpointRecipe(touchpoint) {
		if (!touchpoint?.href?.startsWith("/pattern-library")) {
			return null;
		}
		return recipeLaunchRecipes.find((recipe) => recipe.title === touchpoint.label) || null;
	}

	function touchpointHref(touchpoint) {
		const recipe = touchpointRecipe(touchpoint);
		if (!recipe) {
			return touchpoint?.href || "#";
		}
		const params = new URLSearchParams({
			pattern: recipeSlug(recipe.title),
			category: resolveRecipeCategoryId(recipe),
		});
		return `/pattern-library?${params.toString()}`;
	}

	async function handleTouchpointClick(event, touchpoint) {
		const recipe = touchpointRecipe(touchpoint);
		if (!recipe) {
			return;
		}
		event.preventDefault();
		applyRecipeSelection(recipe, { urlMode: "push" });
		await scrollActiveRecipeIntoView();
	}

	function touchpointSurfaceLabel(touchpoint) {
		if (touchpointRecipe(touchpoint)) {
			return "Pattern";
		}
		const href = touchpoint?.href;
		if (href?.startsWith("/template-generators")) {
			return "Generator";
		}
		if (href?.startsWith("/schema-browser")) {
			return "Schema";
		}
		if (href?.startsWith("/lua-api-explorer")) {
			return "Lua API";
		}
		if (href?.startsWith("/workshop-uploader") || href?.startsWith("/modinfo-builder") || href?.startsWith("/civ5mod-ziper")) {
			return "Publish";
		}
		if (href?.startsWith("/dds-converter") || href?.startsWith("/civ-icon-maker") || href?.startsWith("/text-screen-viewer")) {
			return "UI";
		}
		return "Tool";
	}

	function touchpointSurfaceClass(touchpoint) {
		if (touchpointRecipe(touchpoint)) {
			return "is-pattern";
		}
		const href = touchpoint?.href;
		if (href?.startsWith("/template-generators")) {
			return "is-generator";
		}
		if (href?.startsWith("/schema-browser")) {
			return "is-schema";
		}
		if (href?.startsWith("/lua-api-explorer")) {
			return "is-lua";
		}
		if (href?.startsWith("/workshop-uploader") || href?.startsWith("/modinfo-builder") || href?.startsWith("/civ5mod-ziper")) {
			return "is-publish";
		}
		if (href?.startsWith("/dds-converter") || href?.startsWith("/civ-icon-maker") || href?.startsWith("/text-screen-viewer")) {
			return "is-ui";
		}
		return "is-tool";
	}

	const quickStartRecipes = $derived(
		RECIPE_QUICK_START_DEFS.map((item) => {
			const recipe = recipeLaunchRecipes.find((entry) => entry.title === item.title);
			return recipe
				? {
						...recipe,
						summary: item.summary,
						referenceCount: recipe.touchpoints?.length ?? 0,
					}
				: null;
		}).filter(Boolean),
	);
	const filteredRecipes = $derived.by(() => {
		if (activeRecipeCategory === "all") {
			return recipeLaunchRecipes;
		}

		if (RECIPE_TOP_LEVEL_CATEGORY_DEFS.some((category) => category.id === activeRecipeCategory && category.id !== "all")) {
			return recipeLaunchRecipes.filter((recipe) => resolveTopLevelRecipeCategoryId(recipe) === activeRecipeCategory);
		}

		return recipeLaunchRecipes.filter((recipe) => resolveRecipeCategoryId(recipe) === activeRecipeCategory);
	});
	const groupedFilteredRecipes = $derived.by(() => {
		if (activeRecipeCategory !== "all") {
			return [];
		}

		return RECIPE_TOP_LEVEL_CATEGORY_DEFS.filter((category) => category.id !== "all").flatMap((category) => {
			if (category.id !== "lua-gameplay") {
				const recipes = recipeLaunchRecipes.filter((recipe) => resolveTopLevelRecipeCategoryId(recipe) === category.id);
				return recipes.length > 0 ? [{ id: category.id, label: category.label, recipes }] : [];
			}

			return ["state-safety", "rewards-feedback", "units-promotions", "city-event-hooks", "map-targeting", "shared-helpers"]
				.map((groupId) => ({
					id: groupId,
					label: luaGameplayGroupLabel(groupId),
					recipes: recipeLaunchRecipes.filter((recipe) => resolveLuaGameplayGroupId(recipe) === groupId),
				}))
				.filter((group) => group.recipes.length > 0);
		});
	});
	const activeRecipe = $derived(filteredRecipes.find((recipe) => recipe.title === activeRecipeTitle) || filteredRecipes[0] || null);
	const activeRecipeIndex = $derived(activeRecipe ? filteredRecipes.findIndex((recipe) => recipe.title === activeRecipe.title) : -1);

	if (typeof window !== "undefined" && !urlSyncReady) {
		nextUrlSyncMode = "replace";
		syncStateFromUrl(window.location.search);
		urlSyncReady = true;
	}

	$effect(() => {
		if (!urlSyncReady || !activeRecipe) {
			return;
		}

		if (suppressUrlSync) {
			suppressUrlSync = false;
			return;
		}

		writeRecipeUrl(nextUrlSyncMode);
		nextUrlSyncMode = "replace";
	});
</script>

<svelte:window onpopstate={handleWindowPopState} onkeydown={handleWindowKeyDown} />

<section class="recipe-page">
	<header class="hero recipe-hero">
		<p class="eyebrow">Common Recipes</p>
		<h1>Pattern Library</h1>
		<p>Practical starter recipes and workflow guides for making your own mods.</p>
	</header>

	<section class="recipe-quick-starts" aria-label="Suggested recipes">
		<div class="recipe-quick-copy">
			<span class="recipe-kicker">Quick Starts</span>
			<h2>Jump into these starter recipes if you're new to scripting</h2>
			<p>These are the high impact starting points for learning how to begin scripting your own mods.</p>
		</div>

		<div class="recipe-quick-grid">
			{#each quickStartRecipes as recipe (recipe.title)}
				<button
					type="button"
					class={["recipe-quick-card", isQuickStartActive(recipe.title) && "is-active"]}
					aria-pressed={isQuickStartActive(recipe.title)}
					onclick={() => selectQuickStart(recipe.title)}
				>
					<div class="recipe-quick-head">
						<h3>{recipe.title}</h3>
						<span>{recipe.referenceCount}</span>
					</div>
					<p>{recipe.summary}</p>
				</button>
			{/each}
		</div>
	</section>

	<section class="recipe-panel">
		<div class="recipe-selection-shell">
			<div class="recipe-filter-toolbar" aria-label="Pattern categories">
				<div class="recipe-filter-copy">
					<span class="recipe-toolbar-kicker">Categories</span>
					<p>Filter by pattern type.</p>
				</div>
				<div class="recipe-filter-group" role="group" aria-label="Pattern categories">
					{#each RECIPE_FILTER_CATEGORY_DEFS as category (category.id)}
						<button type="button" class={`recipe-filter-chip ${activeRecipeCategory === category.id ? "is-active" : ""}`} onclick={() => setRecipeCategory(category.id)}>
							<span>{category.label}</span>
							<small>{recipeCategoryCount(category.id)}</small>
						</button>
					{/each}
				</div>
			</div>

			<div class="recipe-selector">
				<h3>{recipeCategoryLabel(activeRecipeCategory)}</h3>

				{#if activeRecipeCategory === "all"}
					<div class="recipe-group-list" aria-label="All pattern groups">
						{#each groupedFilteredRecipes as category (category.id)}
							<section class="recipe-group">
								<div class="recipe-group-head">
									<h3>{category.label}</h3>
									<span>{category.recipes.length} patterns</span>
								</div>
								<div class="recipe-tab-row" role="tablist" aria-label={`${category.label} recipes`}>
									{#each category.recipes as recipe (recipe.title)}
										<button
											type="button"
											role="tab"
											aria-selected={activeRecipe?.title === recipe.title}
											class={`recipe-tab ${activeRecipe?.title === recipe.title ? "is-active" : ""}`}
											onclick={() => setActiveRecipe(recipe.title)}
										>
											<span>{recipe.title}</span>
										</button>
									{/each}
								</div>
							</section>
						{/each}
					</div>
				{:else}
					<div class="recipe-tab-row" role="tablist" aria-label="Pattern backlog">
						{#each filteredRecipes as recipe (recipe.title)}
							<button
								type="button"
								role="tab"
								aria-selected={activeRecipe?.title === recipe.title}
								class={`recipe-tab ${activeRecipe?.title === recipe.title ? "is-active" : ""}`}
								onclick={() => setActiveRecipe(recipe.title)}
							>
								<span>{recipe.title}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if activeRecipe}
			<div class="recipe-grid recipe-grid--feature">
				<article class="recipe-card recipe-card--active" bind:this={recipeDetailCard}>
					<div class="recipe-card-head">
						<div class="recipe-card-heading">
							<span class="recipe-card-kicker">Selected Pattern</span>
							<h3>{activeRecipe.title}</h3>
							<p>{activeRecipe.copy}</p>
						</div>
						<div class="recipe-card-stats" aria-label="Pattern metadata">
							<span class="recipe-card-stat">{recipeCategoryLabel(activeRecipeCategory)}</span>
						</div>
					</div>

					<hr />

					{#if activeRecipe.example}
						<div class="recipe-block recipe-block--example">
							<h4>{activeRecipe.example.title}</h4>
							<SnippetExample example={activeRecipe.example} activeLanguage="all" variant="recipe" />
						</div>
					{/if}
				</article>
			</div>
		{/if}
	</section>

	<section class="recipe-block recipe-block--touchpoints margin-block-start" aria-label="Reference touchpoints">
		<div class="recipe-touchpoint-head">
			<h4>Pattern References</h4>
		</div>
		<!-- <p class="recipe-card-meta">Open the strongest schema or Lua surfaces for this recipe, with the entries most likely to guide implementation.</p> -->
		<div class="recipe-touchpoint-grid">
			{#each activeRecipe.touchpoints as touchpoint (`${touchpoint.href}-${touchpoint.label}`)}
				{#if touchpoint.disabled}
					<div class={`recipe-touchpoint-card ${touchpointSurfaceClass(touchpoint)}`} aria-disabled="true">
						<div class="recipe-touchpoint-card-head">
							<span class="recipe-touchpoint-pill">{touchpoint.label}</span>
							<span>{touchpoint.statusLabel || touchpointSurfaceLabel(touchpoint)}</span>
						</div>
						<p class="recipe-card-meta">{touchpoint.note}</p>
					</div>
				{:else}
					<a
						class={`recipe-touchpoint-card recipe-touchpoint-card--link ${touchpointSurfaceClass(touchpoint)}`}
						href={touchpointHref(touchpoint)}
						onclick={(event) => handleTouchpointClick(event, touchpoint)}
					>
						<div class="recipe-touchpoint-card-head">
							<span class="recipe-touchpoint-pill">{touchpoint.label}</span>
							<span>{touchpointSurfaceLabel(touchpoint)}</span>
						</div>
						<p class="recipe-card-meta">{touchpoint.note}</p>
					</a>
				{/if}
			{/each}
		</div>
	</section>
</section>

<style>
	.recipe-page {
		display: grid;
		gap: 1.25rem;
		--recipe-accent-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 70%, #a8861f 30%);
		--recipe-accent-highlight: #f5d36a;
		--recipe-accent-highlight-strong: #fff1bc;
		--recipe-accent-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, #352608 10%);
	}

	.recipe-hero {
		background: linear-gradient(145deg, color-mix(in srgb, var(--panel-bg) 82%, black) 0%, color-mix(in srgb, var(--panel-bg) 40%, #352608 40%) 100%);
		border-color: var(--recipe-accent-border);
	}

	.recipe-card p,
	.recipe-quick-card p {
		color: var(--muted-ink);
		line-height: 1.55;
		margin: 0;
	}

	.recipe-filter-copy p {
		color: var(--muted-ink);
		line-height: 1.55;
		margin: 0;
	}

	.recipe-quick-copy p {
		color: var(--muted-ink);
		line-height: 1.45;
		margin: 0;
	}

	.recipe-selector-copy p,
	.recipe-selector-position {
		color: var(--muted-ink);
		line-height: 1.55;
		margin: 0;
	}

	.recipe-quick-starts {
		display: grid;
		gap: 0.9rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 86%, #352608 14%) 100%);
		box-shadow: 0 24px 70px color-mix(in oklch, var(--shadow-soft) 54%, transparent);
		border: 1px solid var(--recipe-accent-border);
		border-radius: 1.5rem;
		padding-block: 1.3rem;
		padding-inline: 1.3rem;
	}

	.recipe-quick-copy {
		display: grid;
		gap: 0.4rem;
	}

	.recipe-quick-copy h2 {
		margin: 0;
	}

	.recipe-filter-chip span {
		font-size: 0.82rem;
		font-weight: 600;
	}

	.recipe-group-head span {
		color: color-mix(in srgb, var(--recipe-accent-highlight) 58%, var(--muted-ink) 42%);
		font-size: 0.76rem;
		font-weight: 600;
	}

	.recipe-quick-head span {
		color: var(--muted-ink);
		white-space: nowrap;
		font-size: 0.7rem;
		background: rgba(255, 255, 255, 0.07);
		border-radius: 999px;
		padding-block: 0.5rem;
		padding-inline: 0.6rem;
		text-box: trim-both cap alphabetic;
	}

	.recipe-touchpoint-card-head span {
		color: color-mix(in srgb, var(--recipe-touchpoint-highlight) 66%, var(--muted-ink) 34%);
		font-size: 0.76rem;
	}

	.recipe-kicker {
		color: var(--muted-ink);
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
	}

	.recipe-quick-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.recipe-quick-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.recipe-card h3,
	.recipe-quick-card h3,
	.recipe-block h4 {
		margin: 0;
	}

	.recipe-group-head h3 {
		color: color-mix(in oklch, white 88%, var(--ink));
		font-size: 0.92rem;
		font-weight: 700;
		margin: 0;
	}

	.recipe-panel {
		display: grid;
		gap: 1.25rem;
	}

	.recipe-selection-shell {
		display: grid;
		gap: 1rem;
	}

	.recipe-filter-toolbar {
		display: grid;
		gap: 0.75rem;
		background: color-mix(in srgb, var(--panel-bg) 90%, #201706 10%);
		border: 1px solid color-mix(in srgb, var(--recipe-accent-border) 54%, transparent);
		border-radius: 1rem;
		padding-block: 1rem;
		padding-inline: 1rem;
	}

	.recipe-filter-copy {
		display: grid;
		gap: 0.3rem;
	}

	.recipe-toolbar-kicker {
		color: var(--recipe-accent-highlight-strong);
		text-transform: uppercase;
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.recipe-filter-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.recipe-filter-chip small {
		min-inline-size: 1.6rem;
		display: inline-grid;
		place-items: center;
		color: color-mix(in srgb, var(--recipe-accent-highlight) 58%, var(--muted-ink) 42%);
		font-size: 0.7rem;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 999px;
		padding-block: 0.1rem;
		padding-inline: 0.35rem;
		text-box: trim-both cap alphabetic;
	}

	.recipe-filter-chip.is-active small,
	.recipe-filter-chip:hover small {
		color: var(--recipe-accent-highlight-strong);
	}

	.recipe-selector {
		gap: 1rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 92%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 84%, #352608 16%) 100%);
		border: 1px solid color-mix(in srgb, var(--recipe-accent-border) 48%, transparent);
		border-radius: 1rem;
		padding-block: 1rem;
		padding-inline: 1rem;
	}

	.recipe-selector,
	.recipe-selector-copy {
		display: grid;
		gap: 0.75rem;
	}

	.recipe-group-list {
		display: grid;
		gap: 1rem;
	}

	.recipe-group {
		display: grid;
		gap: 0.65rem;
	}

	.recipe-group + .recipe-group {
		padding-block-start: 1.2rem;
	}

	.recipe-group-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.recipe-tab-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 0.7rem;
	}

	.recipe-stage-grid,
	.recipe-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.recipe-grid--feature {
		grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
	}

	:global(:root[data-theme="light"]) .recipe-card,
	:global(:root[data-theme="light"]) .recipe-stage-card {
		background: transparent;
	}

	.recipe-stage-card,
	.recipe-card {
		display: grid;
		align-content: start;
		gap: 0.85rem;
		background: transparent;
		border: none;
		border-radius: 0;
		border-block-start: 1px solid color-mix(in oklch, var(--panel-border) 36%, transparent);
		padding-block: 1rem;
		padding-inline: 0;
	}

	.recipe-card--active {
		min-inline-size: 0;
		gap: 1.15rem;
		border-block-start: none;
		padding-block: 1.2rem 0.75rem;
	}

	.recipe-card--active {
		background: linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 96%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 86%, #352608 14%) 100%);
		box-shadow: 0 20px 40px color-mix(in oklch, var(--shadow-soft) 34%, transparent);
		border: 1px solid color-mix(in srgb, var(--recipe-accent-border) 54%, transparent);
		border-radius: 1.15rem;
		padding-block: 1.2rem 1rem;
		padding-inline: 1.15rem;
	}

	.recipe-card-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.75rem;
	}

	.recipe-card-heading {
		display: grid;
		gap: 0.5rem;
	}

	.recipe-card-kicker {
		color: var(--recipe-accent-highlight-strong);
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
	}

	.recipe-card-stats {
		display: flex;
		flex-wrap: wrap;
		justify-content: end;
		gap: 0.5rem;
	}

	.recipe-card-stat {
		color: var(--recipe-accent-highlight-strong);
		text-transform: uppercase;
		white-space: pre;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: color-mix(in srgb, var(--recipe-accent-highlight) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--recipe-accent-highlight) 30%, var(--panel-border));
		border-radius: 999px;
		padding-block: 0.5rem;
		padding-inline: 0.75rem;
		text-box: trim-both;
	}

	.recipe-block {
		display: grid;
		gap: 1.15rem;
		padding-block: 1.45rem;
		padding-inline: 0;
	}

	.recipe-block h4 {
		color: color-mix(in oklch, white 82%, var(--ink));
		text-transform: uppercase;
		font-size: 1.125rem;
		letter-spacing: 0.08em;
	}

	.recipe-block--example {
		background: color-mix(in srgb, var(--recipe-accent-panel) 14%, var(--panel-bg) 86%);
		border: none;
		border-radius: 0.9rem;
		padding-block: 0.25rem;
	}

	.recipe-block--touchpoints {
		gap: 1rem;
		padding-block: 0;
	}

	.recipe-touchpoint-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.recipe-card-meta {
		color: var(--muted-ink);
		line-height: 1.55;
		margin: 0;
	}

	.recipe-touchpoint-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1rem;
	}

	.recipe-touchpoint-card-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.55rem;
	}

	.recipe-touchpoint-pill {
		color: var(--recipe-touchpoint-highlight-strong);
		font-size: 0.95rem !important;
		font-weight: 700;
	}

	.recipe-card--compact {
		align-content: start;
	}

	.recipe-card-meta--muted {
		font-size: 0.86rem;
	}

	.recipe-detail-chip {
		inline-size: fit-content;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		color: var(--muted-ink);
		font: inherit;
		font-size: 0.74rem;
		font-weight: 600;
		background: transparent;
		border: none;
		border-block-end: 1px solid transparent;
		padding-block: 0.2rem;
		padding-inline: 0;
		cursor: pointer;
	}

	.recipe-filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--muted-ink);
		background: color-mix(in srgb, var(--panel-bg) 92%, #1a150d 8%);
		border: 1px solid color-mix(in srgb, var(--recipe-accent-border) 34%, transparent);
		border-radius: 999px;
		padding-block: 0.5rem;
		padding-inline: 0.75rem;
		transition:
			border-color 140ms ease,
			background-color 140ms ease,
			color 140ms ease;
		cursor: pointer;
	}

	.recipe-filter-chip.is-active,
	.recipe-filter-chip:hover,
	.recipe-detail-chip:hover {
		color: var(--recipe-accent-highlight-strong);
		background: color-mix(in srgb, var(--recipe-accent-highlight) 10%, transparent) !important;
		border-color: color-mix(in srgb, var(--recipe-accent-highlight) 52%, var(--panel-border)) !important;
	}

	.recipe-link {
		color: var(--ink);
		text-decoration-line: underline;
		text-decoration-color: color-mix(in oklch, var(--panel-border) 64%, transparent);
		text-underline-offset: 0.16em;
		font-size: 0.76rem;
		font-weight: 600;
		padding-block: 0.1rem;
		padding-inline: 0;
	}

	.recipe-link:hover {
		color: color-mix(in oklch, white 88%, var(--ink));
	}

	.recipe-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.recipe-list {
		display: grid;
		gap: 0.6rem;
		padding-inline-start: 1.1rem;
		margin: 0;
	}

	.recipe-nav-controls {
		gap: 0.5rem;
	}

	.recipe-panel--stats {
		background: linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 82%, #352608 16%) 100%);
	}

	.recipe-quick-card {
		display: grid;
		gap: 0.55rem;
		color: inherit;
		font: inherit;
		text-align: left;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--recipe-accent-border);
		border-radius: 1.2rem;
		padding-block: 0.95rem;
		padding-inline: 0.95rem;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease;
		cursor: pointer;
	}

	.recipe-quick-card.is-active,
	.recipe-quick-card:hover {
		background: color-mix(in srgb, var(--recipe-accent-highlight) 11%, transparent) !important;
		box-shadow: 0 10px 22px color-mix(in oklch, var(--shadow-soft) 52%, transparent);
		border-color: color-mix(in srgb, var(--recipe-accent-highlight) 70%, white 30%) !important;
		transform: translateY(-1px);
	}

	.recipe-section-head {
		display: grid;
		gap: 0.45rem;
	}

	.recipe-selector-footer {
		justify-content: space-between;
		align-items: center;
	}

	.recipe-selector-footer,
	.recipe-nav-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.recipe-stage-card {
		gap: 0.45rem;
	}

	.recipe-stage-value {
		color: var(--recipe-accent-highlight-strong);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1.35rem;
		font-weight: 700;
	}

	.recipe-stage-value,
	.recipe-filter-chip {
		inline-size: fit-content;
		font-size: 0.74rem;
		font-weight: 600;
	}

	.recipe-tab {
		min-inline-size: 0;
		display: grid;
		align-items: start;
		color: inherit;
		font: inherit;
		text-align: left;
		background: color-mix(in srgb, var(--panel-bg) 92%, #17120a 8%);
		border: 1px solid color-mix(in srgb, var(--recipe-accent-border) 42%, transparent);
		border-radius: 0.95rem;
		padding-block: 0.85rem;
		padding-inline: 0.95rem;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease;
		cursor: pointer;

		& span {
			color: color-mix(in oklch, white 86%, var(--ink));
			font-size: 0.88rem;
			font-weight: 600;
			line-height: 1.35;
			overflow-wrap: anywhere;
		}

		&.is-active,
		&:hover {
			background: color-mix(in srgb, var(--recipe-accent-highlight) 12%, transparent) !important;
			box-shadow: 0 10px 22px color-mix(in oklch, var(--shadow-soft) 38%, transparent);
			border-color: color-mix(in srgb, var(--recipe-accent-highlight) 60%, var(--panel-border)) !important;
			transform: translateY(-1px);

			& span {
				color: var(--recipe-accent-highlight-strong);
			}
		}
	}

	.recipe-touchpoint-card {
		display: grid;
		gap: 0.55rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--recipe-touchpoint-highlight) 10%, transparent) 0%, transparent 34%),
			linear-gradient(165deg, color-mix(in srgb, var(--recipe-touchpoint-panel) 88%, var(--control-bg)) 0%, color-mix(in srgb, var(--control-bg) 88%, #16110f 12%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--recipe-touchpoint-highlight) 8%, transparent),
			0 2px 4px color-mix(in srgb, var(--panel-bg) 70%, #000);
		border: 1px solid color-mix(in srgb, var(--recipe-touchpoint-border) 90%, transparent);
		border-radius: 1rem;
		padding-block: 1rem;
		padding-inline: 1rem;
		--recipe-touchpoint-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 70%, #a8861f 30%);
		--recipe-touchpoint-highlight: #f5d36a;
		--recipe-touchpoint-highlight-strong: #fff1bc;
		--recipe-touchpoint-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, #352608 10%);
	}

	.recipe-touchpoint-card--link {
		color: inherit;
		text-decoration: none;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease;
	}

	.recipe-touchpoint-card--link:hover {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--recipe-touchpoint-highlight) 16%, transparent) 0%, transparent 38%),
			linear-gradient(165deg, color-mix(in srgb, var(--recipe-touchpoint-panel) 84%, var(--control-bg)) 0%, color-mix(in srgb, var(--control-bg) 84%, #16110f 16%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--recipe-touchpoint-highlight) 14%, transparent),
			0 10px 22px color-mix(in oklch, var(--shadow-soft) 58%, transparent);
		border-color: color-mix(in srgb, var(--recipe-touchpoint-highlight) 52%, var(--recipe-touchpoint-border));
		transform: translateY(-1px);
	}

	.recipe-touchpoint-card.is-generator {
		--recipe-touchpoint-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #7b4bd1 28%);
		--recipe-touchpoint-highlight: #d4b2ff;
		--recipe-touchpoint-highlight-strong: #f4e8ff;
		--recipe-touchpoint-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 88%, #2b1740 12%);
	}

	.recipe-touchpoint-card.is-lua {
		--recipe-touchpoint-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #2f6b53 28%);
		--recipe-touchpoint-highlight: #7de0ae;
		--recipe-touchpoint-highlight-strong: #daf8e8;
		--recipe-touchpoint-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, #10271d 10%);
	}

	.recipe-touchpoint-card.is-pattern {
		--recipe-touchpoint-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 68%, #b48922 32%);
		--recipe-touchpoint-highlight: color-mix(in srgb, var(--recipe-accent-highlight) 88%, #ffd976 12%);
		--recipe-touchpoint-highlight-strong: color-mix(in srgb, white 90%, var(--recipe-accent-highlight) 10%);
		--recipe-touchpoint-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 78%, #3b2810 22%);
	}

	.recipe-touchpoint-card.is-publish {
		--recipe-touchpoint-border: var(--surface-publish-border);
		--recipe-touchpoint-highlight: var(--surface-publish-highlight);
		--recipe-touchpoint-highlight-strong: var(--surface-publish-highlight-strong);
		--recipe-touchpoint-panel: var(--surface-publish-panel);
	}

	.recipe-touchpoint-card.is-schema {
		--recipe-touchpoint-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #35658c 28%);
		--recipe-touchpoint-highlight: #8dc7ff;
		--recipe-touchpoint-highlight-strong: #d6ecff;
		--recipe-touchpoint-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, #11263a 10%);
	}

	.recipe-touchpoint-card.is-tool {
		--recipe-touchpoint-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #9a5a1e 28%);
		--recipe-touchpoint-highlight: color-mix(in srgb, var(--accent) 82%, #ffbf75 18%);
		--recipe-touchpoint-highlight-strong: color-mix(in srgb, white 84%, var(--accent) 16%);
		--recipe-touchpoint-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 82%, #2f1808 18%);
	}

	.recipe-touchpoint-card.is-ui {
		--recipe-touchpoint-border: var(--surface-ui-border);
		--recipe-touchpoint-highlight: var(--surface-ui-highlight);
		--recipe-touchpoint-highlight-strong: var(--surface-ui-highlight-strong);
		--recipe-touchpoint-panel: var(--surface-ui-panel);
	}

	@media (width <= 1100px) {
		.recipe-quick-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (width <= 720px) {
		.recipe-panel {
			padding-block: 1rem;
			padding-inline: 1rem;
		}

		.recipe-filter-toolbar,
		.recipe-selector,
		.recipe-quick-starts {
			padding-block: 1.05rem;
			padding-inline: 1.05rem;
		}

		.recipe-quick-grid {
			grid-template-columns: 1fr;
		}

		.recipe-quick-head,
		.recipe-group-head,
		.recipe-card-head {
			align-items: start;
			flex-direction: column;
		}

		.recipe-card-stats {
			justify-content: start;
		}

		.recipe-selector-footer,
		.recipe-nav-controls {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
