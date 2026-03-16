<script>
	import { tick } from "svelte";
	import { fade } from "svelte/transition";

	let { currentPath = "/", onJump = () => {} } = $props();

	const MAX_RESULTS = 15;
	const DEFAULT_RESULTS = 6;
	const ROW_SEARCH_MIN_LENGTH = 3;
	const COLUMN_SEARCH_MIN_LENGTH = 3;
	const PRIMARY_ROW_KEYS = ["Type", "Tag", "Name", "Description", "ShortDescription", "CivilizationType", "LeaderheadType", "BuildingType", "UnitType", "TraitType", "PolicyType", "PromotionType"];

	function normalizeText(value) {
		return String(value || "")
			.toLowerCase()
			.replace(/[^a-z0-9.+#]+/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	function patternSlug(title) {
		return String(title || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	function generatorSlug(title) {
		return String(title || "")
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	function schemaTableHref(table, tab = "rows") {
		const params = new URLSearchParams({
			table,
			tab,
		});
		return `/schema-browser?${params.toString()}`;
	}

	function schemaColumnHref(table, columnName) {
		const params = new URLSearchParams({
			table,
			tab: "columns",
			columnFilter: columnName,
		});
		return `/schema-browser?${params.toString()}`;
	}

	function schemaRowHref(table, rowIndex, rowFilter) {
		const params = new URLSearchParams({
			table,
			tab: "rows",
			rowIndex: String(rowIndex),
		});
		if (rowFilter) {
			params.set("rowFilter", rowFilter);
		}
		return `/schema-browser?${params.toString()}`;
	}

	function luaEntryHref(datasetId, entryId, query = "", section = "signature") {
		const params = new URLSearchParams({
			dataset: datasetId,
			entry: entryId,
		});
		if (query) {
			params.set("q", query);
		}
		return `/lua-api-explorer?${params.toString()}${section ? `#lua-doc-${section}` : ""}`;
	}

	function compactText(value, maxLength = 120) {
		const text = String(value || "").trim();
		return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
	}

	function stringifyValue(value) {
		if (value === null || value === undefined) {
			return "";
		}
		if (typeof value === "string") {
			return value;
		}
		if (typeof value === "number" || typeof value === "boolean") {
			return String(value);
		}
		return JSON.stringify(value);
	}

	function rowPrimaryValue(row) {
		for (const key of PRIMARY_ROW_KEYS) {
			const value = stringifyValue(row?.[key]);
			if (value) {
				return value;
			}
		}
		return (
			Object.values(row || {})
				.map((value) => stringifyValue(value))
				.find(Boolean) || "Row"
		);
	}

	function rowSecondaryValue(row, primaryValue) {
		for (const [key, rawValue] of Object.entries(row || {})) {
			const value = stringifyValue(rawValue);
			if (!value || value === primaryValue) {
				continue;
			}
			return `${key}: ${compactText(value, 72)}`;
		}
		return "";
	}

	function rowSearchText(tableName, row) {
		return [tableName, ...Object.entries(row || {}).flatMap(([key, value]) => [key, stringifyValue(value)])].join(" ");
	}

	function withSearchIndex(item) {
		const titleIndex = normalizeText(item.title);
		const subtitleIndex = normalizeText(item.subtitle);
		const typeIndex = normalizeText(item.type);
		const keywordIndex = normalizeText((item.keywords || []).join(" "));
		const searchIndex = normalizeText([item.title, item.subtitle, item.type, ...(item.keywords || [])].join(" "));
		return {
			priority: 0,
			featured: false,
			...item,
			titleIndex,
			subtitleIndex,
			typeIndex,
			keywordIndex,
			searchIndex,
		};
	}

	function buildPreviewMeta(...parts) {
		return parts.filter(Boolean).map((part) => String(part));
	}

	const PAGE_ITEMS = [
		{
			id: "page-guided-planner",
			type: "Planner",
			title: "Guided Planner",
			subtitle: "Lane-by-lane civ planning from concept to release.",
			href: "/guided-planner",
			keywords: ["planner", "campaign", "workflow", "checklist", "release"],
			featured: true,
			priority: 12,
			preview: {
				copy: "Plan a civ mod in smaller steps, keep project progress saved, and move from blueprint to release without losing focus.",
				meta: buildPreviewMeta("Workflow", "Project tracking", "Cloud-ready"),
				details: ["Tracks deliverables by type", "Exports projects and checklists"],
			},
		},
		{
			id: "page-template-generators",
			type: "Generator",
			title: "Template Generators",
			subtitle: "Starter builders and reusable mod setup bundles.",
			href: "/template-generators",
			keywords: ["template generators", "generator", "new civ", "starter"],
			featured: true,
			priority: 11,
			preview: {
				copy: "Open the generator backlog and jump into reusable starters for common setup work.",
				meta: buildPreviewMeta("Scaffold builders", "Preset outputs"),
				details: ["Civilization starter bundle", "Naming, art, and tuning generators"],
			},
		},
		{
			id: "page-pattern-library",
			type: "Pattern",
			title: "Pattern Library",
			subtitle: "Repeatable setup recipes for Civ V data and Lua work.",
			href: "/pattern-library",
			keywords: ["pattern library", "recipes", "lua patterns", "data patterns"],
			featured: true,
			priority: 11,
			preview: {
				copy: "Browse repeatable recipes for dummy buildings, civ wiring, triggers, rewards, and common Civ V implementation patterns.",
				meta: buildPreviewMeta("Cookbook", "Data + Lua"),
				details: ["Core data patterns", "Lua gameplay patterns", "Setup and debug playbooks"],
			},
		},
		{
			id: "page-schema-browser",
			type: "Schema",
			title: "Schema Browser",
			subtitle: "Inspect Civ V tables, columns, and row data.",
			href: "/schema-browser",
			keywords: ["schema browser", "database", "tables", "rows", "columns"],
			featured: true,
			priority: 11,
			preview: {
				copy: "Inspect the Civ V database with searchable tables, columns, row data, and relationship views.",
				meta: buildPreviewMeta("367 tables", "Rows and columns"),
				details: ["Quick filters for tables and row data", "Row inspector and relationship panels", "Deep links to individual rows and columns"],
			},
		},
		{
			id: "page-lua-api-explorer",
			type: "Lua API",
			title: "Lua API Explorer",
			subtitle: "Browse methods, GameEvents, schema touchpoints, and examples.",
			href: "/lua-api-explorer",
			keywords: ["lua api", "methods", "gameevents", "hooks"],
			featured: true,
			priority: 11,
			preview: {
				copy: "Browse Civ V methods and GameEvents with signatures, notes, schema touchpoints, and authored examples.",
				meta: buildPreviewMeta("Methods", "GameEvents"),
				details: ["Filter by family or scope", "Jump to exact doc sections", "See related schema tables and patterns"],
			},
		},
		{
			id: "page-upload-mod",
			type: "Publish",
			title: "Workshop Uploader",
			subtitle: "Publish or update a mod on Steam Workshop.",
			href: "/workshop-uploader",
			keywords: ["upload mod", "upload", "publish", "steam workshop", "workshop uploader"],
			featured: true,
			priority: 10,
			preview: {
				copy: "Use our desktop upload flow for new Workshop releases and mod updates.",
				meta: buildPreviewMeta("Publish", "Steam Workshop"),
				details: ["Upload or update a mod", "Works on macOS and Linux"],
			},
		},
		{
			id: "page-modinfo-builder",
			type: "Publish",
			title: ".modinfo Builder",
			subtitle: "Create and edit the manifest before packaging or upload.",
			href: "/modinfo-builder",
			keywords: ["modinfo", "manifest", "actions", "dependencies"],
			preview: {
				copy: "Build a modinfo manifest for your Workshop upload.",
				meta: buildPreviewMeta("Publish", "Steam Workshop"),
				details: ["Presets for common modinfo fields", "Auto-fills fields from your mod’s directory"],
			},
			priority: 9,
		},
		{
			id: "page-civ5mod-ziper",
			type: "Publish",
			title: ".civ5mod Ziper",
			subtitle: "Package a proper Civ V archive before upload handoff.",
			href: "/civ5mod-ziper",
			keywords: ["civ5mod", "7z", "package", "archive", "ziper"],
			preview: {
				copy: "Package a proper Civ V archive for your Workshop upload.",
				meta: buildPreviewMeta("Publish", "Steam Workshop"),
				details: ["Formats properly for Civ V Workshop uploads"],
			},
			priority: 9,
		},
		{
			id: "page-dds-converter",
			type: "Art & UI",
			title: "DDS Converter",
			subtitle: "Convert PNG files into Civ V-ready DDS outputs.",
			href: "/dds-converter",
			keywords: ["dds", "texture", "atlas", "convert png"],
			preview: {
				copy: "Convert PNGs to DDS with Civ V mipmaps and formats.",
				meta: buildPreviewMeta("Convert", "PNG to DDS"),
				details: ["Presets for common batch conversions"],
			},
			priority: 8,
		},
		{
			id: "page-civ-icon-maker",
			type: "Art & UI",
			title: "Civ Icon Maker",
			subtitle: "Build civ icons and alpha-ready exports for UI surfaces.",
			href: "/civ-icon-maker",
			keywords: ["icon maker", "civ icon", "alpha atlas", "leader icon"],
			priority: 8,
		},
		{
			id: "page-community-links",
			type: "Community",
			title: "Community Links",
			subtitle: "Jump to Discords, hubs, and shared Civ V modding references.",
			href: "/community-links",
			keywords: ["community", "discord", "links", "resources"],
			priority: 7,
		},
	].map(withSearchIndex);

	function buildGeneratorItems(wizardCards) {
		return wizardCards.map((card) =>
			withSearchIndex({
				id: `generator-${generatorSlug(card.title)}`,
				type: "Generator",
				title: card.title,
				subtitle: compactText(card.copy, 120),
				href: `/template-generators?generator=${generatorSlug(card.title)}`,
				keywords: [card.stage, ...(card.asks || []), ...(card.outputs || [])],
				priority: 8,
				featured: card.title === "Civilization Starter",
				preview: {
					copy: compactText(card.copy, 180),
					meta: buildPreviewMeta(card.stage, `${card.asks?.length || 0} inputs`, `${card.outputs?.length || 0} outputs`),
					details: [...(card.asks || []).slice(0, 2), ...(card.outputs || []).slice(0, 2)].map((item) => compactText(item, 96)),
				},
			}),
		);
	}

	function buildPatternItems(recipeLaunchRecipes) {
		return recipeLaunchRecipes.map((recipe) =>
			withSearchIndex({
				id: `pattern-${patternSlug(recipe.title)}`,
				type: "Pattern",
				title: recipe.title,
				subtitle: compactText(recipe.focus || recipe.copy, 120),
				href: `/pattern-library?pattern=${patternSlug(recipe.title)}`,
				keywords: [recipe.focus, recipe.status, recipe.copy, ...(recipe.deliverables || [])],
				priority: 8,
				featured: recipe.title === "Dummy Building Scaffold" || recipe.title === "Trait / Leader / Civ Wiring",
				preview: {
					copy: compactText(recipe.copy, 180),
					meta: buildPreviewMeta(recipe.focus, recipe.status),
					details: (recipe.deliverables || []).slice(0, 3).map((item) => compactText(item, 96)),
				},
			}),
		);
	}

	function buildLuaMethodItems(luaData) {
		return luaData.methods.map((entry) =>
			withSearchIndex({
				id: `lua-method-${entry.id}`,
				type: "Lua Method",
				title: entry.methodName,
				subtitle: compactText(entry.summary || entry.displaySignature, 120),
				href: luaEntryHref("methods", entry.id, entry.methodName),
				keywords: [
					entry.family,
					entry.callSurface,
					entry.returnType,
					entry.displaySignature,
					...(entry.schemaTables || []),
					...(entry.parameters || []).flatMap((param) => [param.name, param.type, param.raw]),
				],
				priority: 7,
				preview: {
					copy: compactText(entry.displaySignature, 180),
					meta: buildPreviewMeta(entry.family, entry.returnType, `${entry.parameterCount} params`),
					details: [compactText(entry.summary, 96), ...(entry.schemaTables || []).slice(0, 2).map((table) => `Schema: ${table}`)].filter(Boolean),
				},
			}),
		);
	}

	function buildLuaEventItems(luaData) {
		return luaData.gameEvents.map((entry) =>
			withSearchIndex({
				id: `lua-event-${entry.id}`,
				type: "GameEvent",
				title: `GameEvents.${entry.name}`,
				subtitle: compactText(entry.summary || entry.displaySignature, 120),
				href: luaEntryHref("game-events", entry.id, `GameEvents.${entry.name}`),
				keywords: [entry.scope, entry.displaySignature, ...(entry.schemaTables || []), ...(entry.parameters || []).flatMap((param) => [param.name, param.type, param.raw])],
				priority: 7,
				preview: {
					copy: compactText(entry.displaySignature, 180),
					meta: buildPreviewMeta(entry.scope, `${entry.parameterCount} params`, `${entry.schemaTables?.length || 0} schema links`),
					details: [compactText(entry.summary, 96), ...(entry.schemaTables || []).slice(0, 2).map((table) => `Schema: ${table}`)].filter(Boolean),
				},
			}),
		);
	}

	function buildSchemaTableItems(schemaData) {
		return schemaData.tables.map((table) =>
			withSearchIndex({
				id: `schema-table-${table.name}`,
				type: "Schema Table",
				title: table.name,
				subtitle: `${table.rowCount} rows · ${table.columnCount} columns`,
				href: schemaTableHref(table.name),
				keywords: [...(table.columns || []).map((column) => column.name)],
				priority: 6,
				featured: table.name === "Traits" || table.name === "Buildings" || table.name === "Civilizations",
				preview: {
					copy: `${table.name} has ${table.rowCount} rows, ${table.columnCount} columns, and ${table.foreignKeyCount} outgoing foreign keys in the local snapshot.`,
					meta: buildPreviewMeta(`${table.rowCount} rows`, `${table.columnCount} columns`, `${table.foreignKeyCount} refs`),
					details: (table.columns || []).slice(0, 4).map((column) => `${column.name} · ${column.type}`),
				},
			}),
		);
	}

	function buildSchemaColumnItems(schemaData) {
		return schemaData.tables.flatMap((table) =>
			(table.columns || []).map((column) =>
				withSearchIndex({
					id: `schema-column-${table.name}-${column.name}`,
					type: "Schema Column",
					title: `${table.name}.${column.name}`,
					subtitle: `${column.type}${column.primaryKey ? " · primary key" : column.notNull ? " · not null" : ""}`,
					href: schemaColumnHref(table.name, column.name),
					keywords: [table.name, column.name, column.type, column.defaultValue, column.primaryKey ? "primary key" : "", column.notNull ? "not null" : ""],
					priority: 4,
					preview: {
						copy: `${column.name} is a ${column.type} column on ${table.name}.`,
						meta: buildPreviewMeta(table.name, column.primaryKey ? "Primary key" : "", column.notNull ? "Not null" : ""),
						details: [column.defaultValue !== null && column.defaultValue !== undefined && column.defaultValue !== "" ? `Default: ${column.defaultValue}` : ""].filter(Boolean),
					},
				}),
			),
		);
	}

	function buildSchemaRowItems(schemaData) {
		return schemaData.tables.flatMap((table) =>
			(table.rows || []).map((row, index) => {
				const primaryValue = rowPrimaryValue(row);
				const secondaryValue = rowSecondaryValue(row, primaryValue);
				return withSearchIndex({
					id: `schema-row-${table.name}-${index}`,
					type: "Schema Row",
					title: `${table.name} · ${compactText(primaryValue, 72)}`,
					subtitle: secondaryValue || `Row ${index + 1} in ${table.name}`,
					href: schemaRowHref(table.name, index, primaryValue),
					keywords: [table.name, rowSearchText(table.name, row)],
					priority: 2,
					preview: {
						copy: `${primaryValue} in ${table.name}.`,
						meta: buildPreviewMeta(table.name, `Row ${index + 1}`),
						details: Object.entries(row || {})
							.filter(([, value]) => stringifyValue(value))
							.slice(0, 4)
							.map(([key, value]) => `${key}: ${compactText(stringifyValue(value), 72)}`),
					},
				});
			}),
		);
	}

	let isOpen = $state(false);
	let query = $state("");
	let activeIndex = $state(0);
	let searchInputEl = $state();
	let indexLoading = $state(false);
	let indexReady = $state(false);
	let indexError = $state("");
	let coreJumpItems = $state(PAGE_ITEMS);
	let extendedJumpItems = $state(PAGE_ITEMS);

	function isTypingTarget(target) {
		return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
	}

	function shortcutLabel() {
		if (typeof navigator === "undefined") {
			return "Ctrl K";
		}
		return /mac|iphone|ipad/i.test(navigator.platform) ? "Cmd K" : "Ctrl K";
	}

	function scoreItem(item, normalizedQuery) {
		if (!normalizedQuery) {
			return item.featured ? 100 : 0;
		}

		const terms = normalizedQuery.split(" ").filter(Boolean);
		let score = 0;

		if (item.titleIndex === normalizedQuery || item.keywordIndex.includes(normalizedQuery)) score += 120;
		if (item.titleIndex.startsWith(normalizedQuery)) score += 80;
		if (item.titleIndex.includes(normalizedQuery)) score += 55;
		if (item.keywordIndex.startsWith(normalizedQuery)) score += 45;
		if (item.subtitleIndex.includes(normalizedQuery)) score += 28;
		if (item.typeIndex.includes(normalizedQuery)) score += 18;
		if (item.searchIndex.includes(normalizedQuery)) score += 14;

		for (const term of terms) {
			if (item.titleIndex.includes(term)) score += 18;
			if (item.keywordIndex.includes(term)) score += 14;
			if (item.subtitleIndex.includes(term)) score += 8;
			if (item.searchIndex.includes(term)) score += 5;
		}

		return score + (item.priority || 0);
	}

	const results = $derived.by(() => {
		const normalizedQuery = normalizeText(query);
		const shouldIncludeColumns = normalizedQuery.length >= COLUMN_SEARCH_MIN_LENGTH;
		const shouldIncludeRows = normalizedQuery.length >= ROW_SEARCH_MIN_LENGTH;
		const activeItems = normalizedQuery
			? shouldIncludeRows
				? extendedJumpItems
				: shouldIncludeColumns
					? extendedJumpItems.filter((item) => item.type !== "Schema Row")
					: coreJumpItems
			: coreJumpItems;

		return activeItems
			.map((item) => ({ item, score: scoreItem(item, normalizedQuery) }))
			.filter((entry) => entry.score > 0)
			.sort(
				(left, right) =>
					right.score - left.score ||
					(right.item.priority || 0) - (left.item.priority || 0) ||
					Number(right.item.featured) - Number(left.item.featured) ||
					left.item.title.localeCompare(right.item.title),
			)
			.slice(0, normalizedQuery ? MAX_RESULTS : DEFAULT_RESULTS)
			.map((entry) => entry.item);
	});

	const resolvedActiveIndex = $derived(results.length ? Math.min(activeIndex, results.length - 1) : 0);
	const activePreviewItem = $derived(results[resolvedActiveIndex] ?? null);

	async function focusSearch() {
		await tick();
		searchInputEl?.focus();
		searchInputEl?.select?.();
	}

	async function ensureIndexLoaded() {
		if (indexReady || indexLoading) {
			return;
		}

		indexLoading = true;
		indexError = "";

		try {
			const [generatorModule, schemaModule, luaModule] = await Promise.all([import("../data/generatorPageData.js"), import("../data/civ-schema.json"), import("../data/civ-lua-api.json")]);
			const generatorItems = buildGeneratorItems(generatorModule.wizardCards || []);
			const patternItems = buildPatternItems(generatorModule.recipeLaunchRecipes || []);
			const luaMethodItems = buildLuaMethodItems(luaModule.default);
			const luaEventItems = buildLuaEventItems(luaModule.default);
			const schemaTableItems = buildSchemaTableItems(schemaModule.default);
			const schemaColumnItems = buildSchemaColumnItems(schemaModule.default);
			const schemaRowItems = buildSchemaRowItems(schemaModule.default);

			coreJumpItems = [...PAGE_ITEMS, ...generatorItems, ...patternItems, ...luaMethodItems, ...luaEventItems, ...schemaTableItems];
			extendedJumpItems = [...coreJumpItems, ...schemaColumnItems, ...schemaRowItems];
			indexReady = true;
		} catch (error) {
			indexError = error?.message || "Unable to load the full quick-jump index.";
		} finally {
			indexLoading = false;
		}
	}

	function openPalette(initialQuery = "") {
		query = initialQuery;
		activeIndex = 0;
		isOpen = true;
		void ensureIndexLoaded();
		void focusSearch();
	}

	function closePalette() {
		isOpen = false;
	}

	function setActiveIndex(index) {
		activeIndex = index;
	}

	function activateItem(item) {
		if (!item) return;
		closePalette();
		onJump(item.href);
	}

	function selectAdjacent(delta) {
		if (!results.length) return;
		activeIndex = (resolvedActiveIndex + delta + results.length) % results.length;
	}

	function handlePaletteKeyDown(event) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			selectAdjacent(1);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			selectAdjacent(-1);
			return;
		}
		if (event.key === "Enter") {
			event.preventDefault();
			activateItem(results[resolvedActiveIndex]);
		}
	}

	function handleWindowKeyDown(event) {
		const lowerKey = event.key.toLowerCase();
		const wantsShortcut = (event.metaKey || event.ctrlKey) && lowerKey === "k";
		const wantsSlash = event.key === "/";

		if (!isOpen && (wantsShortcut || (wantsSlash && !isTypingTarget(event.target)))) {
			event.preventDefault();
			openPalette();
			return;
		}

		if (!isOpen) return;
		if (event.key === "Escape") {
			event.preventDefault();
			closePalette();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeyDown} />

<div class="quick-jump">
	<button type="button" class="quick-jump-trigger" aria-label="Open quick jump" onclick={() => openPalette()}>
		<svg class="quick-jump-trigger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
			<path
				d="M208 80C137.3 80 80 137.3 80 208s57.3 128 128 128s128-57.3 128-128S278.7 80 208 80zM0 208C0 93.1 93.1 0 208 0s208 93.1 208 208c0 45.1-14.3 86.8-38.6 120.9l124.9 124.9c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L332.1 374.2C298.8 398.7 255.8 416 208 416C93.1 416 0 322.9 0 208z"
			/>
		</svg>
		<span class="quick-jump-trigger-label">Search</span>
		<kbd class="quick-jump-trigger-shortcut">{shortcutLabel()}</kbd>
	</button>

	{#if isOpen}
		<div class="quick-jump-overlay" role="presentation" onclick={(event) => event.target === event.currentTarget && closePalette()} transition:fade={{ duration: 140 }}>
			<div class="quick-jump-dialog" role="dialog" aria-modal="true" aria-label="Quick jump">
				<div class="quick-jump-input-wrap">
					<input
						bind:this={searchInputEl}
						class="quick-jump-input"
						type="search"
						bind:value={query}
						placeholder="Search through everything on the site"
						autocomplete="off"
						onkeydown={handlePaletteKeyDown}
					/>
				</div>
				<div class="quick-jump-hint">
					Press <kbd>Enter</kbd> to jump, <kbd>Esc</kbd> to close, <kbd>{shortcutLabel()}</kbd> to reopen.
				</div>
				{#if indexLoading}
					<div class="quick-jump-hint">Loading the full index for Lua, schema rows, patterns, and generators…</div>
				{:else if indexError}
					<div class="quick-jump-hint">{indexError}</div>
				{/if}
				<div class="quick-jump-body">
					<ul class="quick-jump-results">
						{#if results.length}
							{#each results as item, index (item.id)}
								<li class="quick-jump-item">
									<button
										type="button"
										class={["quick-jump-item-button", index === resolvedActiveIndex && "is-active", currentPath === item.href.split("?")[0] && "is-current"]}
										onmouseenter={() => setActiveIndex(index)}
										onfocus={() => setActiveIndex(index)}
										onclick={() => activateItem(item)}
									>
										<span class="quick-jump-item-meta">{item.type}</span>
										<span class="quick-jump-item-title">{item.title}</span>
										<span class="quick-jump-item-subtitle">{item.subtitle}</span>
									</button>
								</li>
							{/each}
						{:else}
							<li class="quick-jump-empty">No matching pages or shortcuts.</li>
						{/if}
					</ul>

					{#if activePreviewItem}
						<aside class="quick-jump-preview" aria-label="Selected result preview">
							<span class="quick-jump-preview-kicker">{activePreviewItem.type}</span>
							<h3 class="quick-jump-preview-title">{activePreviewItem.title}</h3>
							<p class="quick-jump-preview-copy">{activePreviewItem.preview?.copy || activePreviewItem.subtitle}</p>

							{#if activePreviewItem.preview?.meta?.length}
								<div class="quick-jump-preview-meta">
									{#each activePreviewItem.preview.meta as meta (`${activePreviewItem.id}-${meta}`)}
										<span>{meta}</span>
									{/each}
								</div>
							{/if}

							{#if activePreviewItem.preview?.details?.length}
								<ul class="quick-jump-preview-list">
									{#each activePreviewItem.preview.details as detail (`${activePreviewItem.id}-${detail}`)}
										<li>{detail}</li>
									{/each}
								</ul>
							{/if}
						</aside>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.quick-jump {
		position: relative;
	}

	.quick-jump-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		block-size: 2.2rem;
		color: var(--ink);
		background: transparent;
		border: 1px solid color-mix(in oklch, var(--ink) 22%, transparent);
		border-radius: 999px;
		padding: 0.25rem 0.55rem;
		cursor: pointer;
		transition:
			border-color 0.2s ease,
			color 0.2s ease,
			background 0.2s ease;
	}

	.quick-jump-trigger:hover {
		color: var(--accent);
		border-color: color-mix(in oklch, var(--accent) 70%, transparent);
		background: color-mix(in oklch, var(--accent) 12%, transparent);
	}

	.quick-jump-trigger-icon {
		inline-size: 0.9rem;
		block-size: 0.9rem;
		fill: currentColor;
	}

	.quick-jump-trigger-label {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-box: trim-both cap alphabetic;
	}

	.quick-jump-trigger-shortcut {
		border: 1px solid color-mix(in oklch, var(--ink) 24%, transparent);
		border-radius: 6px;
		color: color-mix(in oklch, var(--muted-ink) 78%, white 22%);
		background: color-mix(in oklch, var(--control-bg) 90%, black 10%);
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.08rem 0.35rem;
	}

	.quick-jump-overlay {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		background: color-mix(in oklch, black 68%, transparent);
		padding: 12vh 1rem 1rem;
	}

	.quick-jump-dialog {
		inline-size: min(720px, 100%);
		max-block-size: 76vh;
		overflow: auto;
		color: var(--ink);
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--panel-border) 88%, black 12%);
		border-radius: 14px;
		box-shadow: 0 22px 56px rgb(0 0 0 / 30%);
		padding: 0.8rem;
	}

	.quick-jump-input-wrap {
		display: flex;
	}

	.quick-jump-input {
		inline-size: 100%;
		color: var(--ink);
		background: var(--control-bg);
		border: 1px solid var(--panel-border);
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 700;
		padding: 0.7rem 0.8rem;
	}

	.quick-jump-input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.quick-jump-hint {
		color: color-mix(in oklch, var(--muted-ink) 76%, white 24%);
		font-size: 0.76rem;
		margin-block: 0.55rem 0.35rem;
	}

	.quick-jump-hint kbd {
		border: 1px solid var(--panel-border);
		border-radius: 5px;
		background: var(--control-bg);
		color: var(--ink);
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.05rem 0.35rem;
	}

	.quick-jump-results {
		display: grid;
		gap: 0.34rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.quick-jump-body {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(250px, 0.8fr);
		gap: 0.8rem;
		align-items: start;
	}

	.quick-jump-item-button {
		inline-size: 100%;
		display: grid;
		text-align: left;
		gap: 0.08rem;
		border: 1px solid transparent;
		border-radius: 9px;
		background: color-mix(in oklch, var(--control-bg) 94%, black 6%);
		padding: 0.55rem 0.65rem;
		cursor: pointer;
	}

	.quick-jump-item-button:hover,
	.quick-jump-item-button.is-active {
		border-color: var(--accent);
		background: color-mix(in oklch, var(--accent) 12%, transparent);
	}

	.quick-jump-item-button.is-current .quick-jump-item-meta {
		color: color-mix(in oklch, var(--accent) 68%, white 32%);
	}

	.quick-jump-item-meta {
		color: color-mix(in oklch, var(--muted-ink) 74%, white 26%);
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.quick-jump-item-title {
		color: var(--ink);
		font-size: 0.94rem;
		font-weight: 800;
	}

	.quick-jump-item-subtitle {
		color: color-mix(in oklch, var(--muted-ink) 82%, white 18%);
		font-size: 0.78rem;
	}

	.quick-jump-empty {
		color: color-mix(in oklch, var(--muted-ink) 76%, white 24%);
		font-size: 0.86rem;
		margin: 0.5rem 0 0.2rem;
		padding: 0.4rem 0.1rem;
	}

	.quick-jump-preview {
		position: sticky;
		top: 0;
		display: grid;
		gap: 0.55rem;
		background: radial-gradient(circle at top right, color-mix(in oklch, var(--accent) 12%, transparent), transparent 52%), color-mix(in oklch, var(--control-bg) 96%, black 4%);
		border: 1px solid color-mix(in oklch, var(--panel-border) 88%, black 12%);
		border-radius: 12px;
		padding: 0.8rem;
	}

	.quick-jump-preview-kicker {
		color: color-mix(in oklch, var(--muted-ink) 72%, white 28%);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}

	.quick-jump-preview-title {
		margin: 0;
		color: var(--ink);
		font-size: 1rem;
		font-weight: 900;
	}

	.quick-jump-preview-copy {
		margin: 0;
		color: color-mix(in oklch, var(--muted-ink) 84%, white 16%);
		font-size: 0.82rem;
		line-height: 1.45;
	}

	.quick-jump-preview-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.38rem;
	}

	.quick-jump-preview-meta span {
		border: 1px solid color-mix(in oklch, var(--panel-border) 86%, black 14%);
		border-radius: 999px;
		padding: 0.18rem 0.48rem;
		color: var(--ink);
		font-size: 0.7rem;
		font-weight: 700;
		background: color-mix(in oklch, var(--panel-bg) 84%, transparent);
	}

	.quick-jump-preview-list {
		margin: 0;
		padding: 0 0 0 1rem;
		display: grid;
		gap: 0.38rem;
		color: color-mix(in oklch, var(--muted-ink) 82%, white 18%);
		font-size: 0.76rem;
		line-height: 1.45;
	}

	@media (max-width: 799px) {
		.quick-jump-trigger {
			inline-size: 2.2rem;
			justify-content: center;
			padding: 0.25rem;
			border-color: transparent;
		}

		.quick-jump-trigger-label,
		.quick-jump-trigger-shortcut {
			display: none;
		}

		.quick-jump-overlay {
			padding-block-start: 4.8rem;
		}

		.quick-jump-dialog {
			max-block-size: calc(100vh - 5.4rem);
		}

		.quick-jump-body {
			grid-template-columns: 1fr;
		}

		.quick-jump-preview {
			position: static;
		}
	}
</style>
