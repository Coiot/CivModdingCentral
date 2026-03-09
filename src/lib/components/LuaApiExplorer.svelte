<script>
	import { onMount, tick } from "svelte";

	import luaData from "../generated/civ-lua-api.json";

	const numberFormatter = new Intl.NumberFormat("en-US");
	const DATASET_TABS = [
		{ id: "methods", label: "Methods" },
		{ id: "game-events", label: "GameEvents" },
	];
	const SEARCH_MODE_DEFS = [
		{ id: "all", label: "All" },
		{ id: "names", label: "Names" },
		{ id: "signatures", label: "Signatures" },
		{ id: "parameters", label: "Params" },
		{ id: "schema", label: "Schema" },
	];
	const SORT_MODE_DEFS = [
		{ id: "relevance", label: "Best match" },
		{ id: "alpha", label: "A-Z" },
		{ id: "params", label: "Most params" },
		{ id: "schema", label: "Most schema links" },
	];
	const DOC_SECTION_DEFS = [
		{ id: "summary", label: "Summary" },
		{ id: "signature", label: "Signature" },
		{ id: "parameters", label: "Parameters" },
		{ id: "notes", label: "Notes" },
		{ id: "gotchas", label: "Gotchas" },
		{ id: "example", label: "Example" },
		{ id: "schema", label: "Schema" },
		{ id: "see-also", label: "See also" },
		{ id: "related", label: "Related" },
	];
	const PLACEHOLDER_NOTES = [
		"Placeholder summary. Replace this with entry specific notes from the JSON.",
		"Use this section for what the entry does, when to call it, and any important side effects or assumptions.",
		"Keep the final authored notes grounded in actual gameplay behavior.",
	];
	const DOC_SECTION_SCROLL_OFFSET = 132;
	const docSectionElements = new Map();
	const FAMILY_QUICK_START_COPY = {
		Player: "Notifications, policy checks, diplomacy hooks, yields, and most civ-level gameplay scripting.",
		Unit: "Combat behavior, promotions, movement, damage state, upgrades, and per-unit ability logic.",
		City: "Buildings, production, specialists, growth, local yields, resistance, and city-stateful logic.",
		Game: "Global turn flow, active-player context, randomization, speed settings, and session-wide helpers.",
		Plot: "Terrain, ownership, routes, resources, improvements, visibility, and map tile inspection.",
		Team: "Tech progress, war state, embassies, shared visibility, and team-scoped diplomacy checks.",
	};
	const METHOD_SEARCH_EXAMPLES = ["AddNotification", "CanTrain", "UnitPromotions", "TechTypes", "Player"];
	const EVENT_SEARCH_EXAMPLES = ["BuildFinished", "PlayerCanTrain", "UnitPromotions", "Hook", "TechTypes"];

	const METHODS = luaData.methods.map((entry) => buildMethodEntry(entry));
	const GAME_EVENTS = luaData.gameEvents.map((entry) => buildGameEventEntry(entry));
	const METHOD_BY_ID = new Map(METHODS.map((entry) => [entry.id, entry]));
	const GAME_EVENT_BY_ID = new Map(GAME_EVENTS.map((entry) => [entry.id, entry]));
	const ENTRY_BY_KEY = new Map([...METHODS, ...GAME_EVENTS].map((entry) => [entry.entryKey, entry]));
	const FEATURED_FAMILIES = [...luaData.families]
		.sort((left, right) => right.methodCount - left.methodCount)
		.slice(0, 6)
		.map((family) => ({
			...family,
			quickStartCopy: FAMILY_QUICK_START_COPY[family.name] || `${family.methodCount} indexed methods in the current workbook snapshot.`,
		}));
	const DEFAULT_METHOD_ID = METHODS.find((entry) => entry.family === "Player" && entry.methodName === "AddNotification")?.id || METHODS[0]?.id || "";
	const DEFAULT_EVENT_ID = GAME_EVENTS.find((entry) => entry.name === "BuildFinished")?.id || GAME_EVENTS[0]?.id || "";

	let searchQuery = $state("");
	let activeDataset = $state("methods");
	let familyFilter = $state("all");
	let scopeFilter = $state("all");
	let searchMode = $state("all");
	let sortMode = $state("relevance");
	let selectedEntryId = $state(DEFAULT_METHOD_ID);
	let recentEntryKeys = $state([]);
	let luaUrlSyncReady = $state(false);
	let applyingLuaUrlState = $state(false);
	let lastLuaUrlState = $state("");
	let lastLuaUrlSnapshot = $state(null);
	let copyFeedbackTimeout = $state(null);
	let signatureCopied = $state(false);
	let activeDocSectionId = $state("signature");
	let pendingDocSectionId = $state("");
	let pendingLuaHistoryPush = $state(false);

	const normalizedQuery = $derived(searchQuery.trim().toLowerCase());
	const emptySearchExamples = $derived.by(() => (activeDataset === "methods" ? METHOD_SEARCH_EXAMPLES : EVENT_SEARCH_EXAMPLES));
	const searchPlaceholder = $derived.by(() => {
		switch (searchMode) {
			case "names":
				return activeDataset === "methods" ? "Search method names like AddNotification or CanTrain..." : "Search event names like BuildFinished or UnitCreated...";
			case "signatures":
				return "Search display signatures, return types, call surfaces, or scopes...";
			case "parameters":
				return "Search parameter names, enum types, defaults, or raw signatures...";
			case "schema":
				return "Search schema-linked tables like UnitPromotions, TechTypes, or Buildings...";
			default:
				return "Search AddNotification, BuildFinished, TechTypes, UnitPromotions, or Player...";
		}
	});

	const methodResults = $derived.by(() => METHODS.map((entry) => buildLuaSearchResult(entry, normalizedQuery, searchMode)));
	const gameEventResults = $derived.by(() => GAME_EVENTS.map((entry) => buildLuaSearchResult(entry, normalizedQuery, searchMode)));
	const familyCounts = $derived.by(() =>
		luaData.families
			.filter((family) => family.name.toLowerCase() !== "fractal")
			.map((family) => ({
				name: family.name,
				count: methodResults.filter((entry) => entry.matchesQuery && entry.family === family.name).length,
			})),
	);
	const scopeCounts = $derived.by(() =>
		luaData.gameEventScopes.map((scope) => ({
			name: scope.name,
			count: gameEventResults.filter((entry) => entry.matchesQuery && entry.scope === scope.name).length,
		})),
	);
	const filteredEntries = $derived.by(() => {
		if (activeDataset === "methods") {
			const matches = methodResults.filter((entry) => entry.matchesQuery && (familyFilter === "all" || entry.family === familyFilter));
			return sortLuaEntries(matches, sortMode, normalizedQuery);
		}
		const matches = gameEventResults.filter((entry) => entry.matchesQuery && (scopeFilter === "all" || entry.scope === scopeFilter));
		return sortLuaEntries(matches, sortMode, normalizedQuery);
	});
	const selectedEntry = $derived.by(() => {
		return filteredEntries.find((entry) => entry.id === selectedEntryId) || filteredEntries[0] || null;
	});
	const recentEntries = $derived.by(() => recentEntryKeys.map((key) => ENTRY_BY_KEY.get(key)).filter((entry) => entry && entry.datasetId === activeDataset));
	const selectedEntrySummary = $derived.by(() => selectedEntry?.summary || "");
	const selectedMatchReasons = $derived.by(() => {
		if (!selectedEntry || !normalizedQuery) {
			return [];
		}
		const reasons = [];
		if (selectedEntry.nameMatch) {
			reasons.push("Name");
		}
		if (selectedEntry.signatureMatch) {
			reasons.push("Signature");
		}
		if (selectedEntry.parameterMatch) {
			reasons.push("Parameters");
		}
		if (selectedEntry.schemaMatch) {
			reasons.push("Schema touchpoints");
		}
		return reasons;
	});
	const relatedEntries = $derived.by(() => {
		if (!selectedEntry) {
			return [];
		}
		if (selectedEntry.entryKind === "method") {
			return METHODS.filter((entry) => entry.id !== selectedEntry.id && entry.family === selectedEntry.family)
				.sort((left, right) => right.parameterCount - left.parameterCount || left.methodName.localeCompare(right.methodName))
				.slice(0, 6);
		}
		return GAME_EVENTS.filter((entry) => entry.id !== selectedEntry.id && entry.scope === selectedEntry.scope)
			.sort((left, right) => left.name.localeCompare(right.name))
			.slice(0, 6);
	});
	const selectedSchemaTouchpoints = $derived.by(() => {
		if (!selectedEntry) {
			return [];
		}

		const byTable = new Map();
		const ensureTouchpoint = (table) => {
			if (!byTable.has(table)) {
				byTable.set(table, {
					table,
					href: schemaTableHref(table),
					sourceLabels: new Set(),
					notes: new Set(),
				});
			}
			return byTable.get(table);
		};

		for (const table of selectedEntry.schemaTables) {
			ensureTouchpoint(table);
		}

		for (const parameter of selectedEntry.parameters) {
			if (!Array.isArray(parameter.schemaTables)) {
				continue;
			}
			for (const table of parameter.schemaTables) {
				const touchpoint = ensureTouchpoint(table);
				const sourceLabel = [parameter.name || parameter.raw, parameter.type].filter(Boolean).join(" · ");
				if (sourceLabel) {
					touchpoint.sourceLabels.add(sourceLabel);
				}
			}
		}

		for (const item of selectedEntry.relatedSchemaNotes) {
			if (!item?.table) {
				continue;
			}
			const touchpoint = ensureTouchpoint(item.table);
			if (item.note) {
				touchpoint.notes.add(item.note);
			}
		}

		return [...byTable.values()]
			.map((item) => ({
				...item,
				sourceLabels: [...item.sourceLabels],
				notes: [...item.notes],
			}))
			.sort((left, right) => left.table.localeCompare(right.table));
	});
	const selectedSeeAlsoItems = $derived.by(() => {
		if (!selectedEntry) {
			return [];
		}
		return selectedEntry.seeAlso.map((item, index) => resolveSeeAlsoItem(item, index)).filter(Boolean);
	});
	const selectedEntryQuickLinks = $derived.by(() => {
		if (!selectedEntry) {
			return [];
		}
		return [
			...selectedSchemaTouchpoints.slice(0, 4).map((item) => ({
				id: `schema-${item.table}`,
				label: item.table,
				copy: item.sourceLabels[0] || item.notes[0] || "Schema table",
				href: item.href,
			})),
			...selectedSeeAlsoItems
				.filter((item) => item.href)
				.slice(0, 2)
				.map((item) => ({
					id: `link-${item.id}`,
					label: item.label,
					copy: item.copy,
					href: item.href,
				})),
		];
	});
	const selectedEntryQuickMeta = $derived.by(() => {
		if (!selectedEntry) {
			return [];
		}

		const items = [];
		if (selectedEntry.entryKind === "method") {
			items.push({ label: "Family", value: selectedEntry.family });
			items.push({ label: "Return", value: selectedEntry.returnType || "unknown" });
		} else {
			items.push({ label: "Scope", value: selectedEntry.scope || "unscoped" });
			items.push({ label: "Surface", value: "GameEvents" });
		}
		items.push({ label: "Params", value: String(selectedEntry.parameterCount) });
		if (selectedSchemaTouchpoints.length > 0) {
			items.push({ label: "Schema", value: String(selectedSchemaTouchpoints.length) });
		}
		if (selectedSeeAlsoItems.length > 0) {
			items.push({ label: "See also", value: String(selectedSeeAlsoItems.length) });
		}
		return items;
	});
	const selectedEntrySections = $derived.by(() => {
		if (!selectedEntry) {
			return [];
		}
		return DOC_SECTION_DEFS.filter((section) => {
			if (section.id === "summary") {
				return Boolean(selectedEntrySummary);
			}
			if (section.id === "parameters") {
				return selectedEntry.parameters.length > 0;
			}
			if (section.id === "gotchas") {
				return selectedEntry.gotchas.length > 0;
			}
			if (section.id === "schema") {
				return selectedSchemaTouchpoints.length > 0;
			}
			if (section.id === "see-also") {
				return selectedSeeAlsoItems.length > 0;
			}
			if (section.id === "related") {
				return relatedEntries.length > 0;
			}
			return true;
		}).map((section) => ({
			...section,
			href: buildLuaSectionHref(section.id),
		}));
	});

	$effect(() => {
		if (!filteredEntries.some((entry) => entry.id === selectedEntryId)) {
			selectedEntryId = filteredEntries[0]?.id ?? (activeDataset === "methods" ? DEFAULT_METHOD_ID : DEFAULT_EVENT_ID);
		}
	});

	$effect(() => {
		const entry = selectedEntry;
		if (!entry) {
			return;
		}
		const key = entry.entryKey;
		const next = [key, ...recentEntryKeys.filter((item) => item !== key)].slice(0, 8);
		if (next.length === recentEntryKeys.length && next.every((item, index) => item === recentEntryKeys[index])) {
			return;
		}
		recentEntryKeys = next;
	});

	$effect(() => {
		const availableSectionIds = selectedEntrySections.map((section) => section.id);
		if (!availableSectionIds.length) {
			activeDocSectionId = "";
			return;
		}

		const preferredSectionId =
			pendingDocSectionId && availableSectionIds.includes(pendingDocSectionId)
				? pendingDocSectionId
				: availableSectionIds.includes(activeDocSectionId)
					? activeDocSectionId
					: availableSectionIds[0];
		if (preferredSectionId !== activeDocSectionId) {
			activeDocSectionId = preferredSectionId;
		}
	});

	onMount(() => {
		if (typeof window === "undefined") {
			return;
		}

		applyLuaUrlStateFromLocation();
		luaUrlSyncReady = true;

		const handlePopState = () => {
			applyLuaUrlStateFromLocation();
		};

		const handleViewportChange = () => {
			updateActiveDocSectionFromScroll();
		};

		window.addEventListener("popstate", handlePopState);
		window.addEventListener("scroll", handleViewportChange, { passive: true });
		window.addEventListener("resize", handleViewportChange);
		return () => {
			window.removeEventListener("popstate", handlePopState);
			window.removeEventListener("scroll", handleViewportChange);
			window.removeEventListener("resize", handleViewportChange);
			if (copyFeedbackTimeout) {
				clearTimeout(copyFeedbackTimeout);
			}
		};
	});

	$effect(() => {
		const entryKey = selectedEntry?.entryKey || "";
		const sectionKey = selectedEntrySections.map((section) => section.id).join("|");
		if (!entryKey || !sectionKey || typeof window === "undefined") {
			return;
		}

		tick().then(() => {
			const targetSectionId = pendingDocSectionId && selectedEntrySections.some((section) => section.id === pendingDocSectionId) ? pendingDocSectionId : "";
			if (targetSectionId) {
				scrollDocSectionIntoView(targetSectionId, "auto");
				pendingDocSectionId = "";
				return;
			}
			updateActiveDocSectionFromScroll();
		});
	});

	$effect(() => {
		if (typeof window === "undefined" || !luaUrlSyncReady || applyingLuaUrlState) {
			return;
		}

		const nextSnapshot = snapshotLuaUrlState();
		const nextSerialized = serializeLuaUrlState(nextSnapshot);
		if (nextSerialized === lastLuaUrlState) {
			return;
		}

		const nextUrl = buildLuaUrl(nextSnapshot);
		const shouldPush = pendingLuaHistoryPush || shouldPushLuaHistoryEntry(lastLuaUrlSnapshot, nextSnapshot);
		window.history[shouldPush ? "pushState" : "replaceState"]({}, document.title, nextUrl);
		lastLuaUrlSnapshot = nextSnapshot;
		lastLuaUrlState = nextSerialized;
		pendingLuaHistoryPush = false;
	});

	function buildMethodEntry(entry) {
		const nameTarget = [entry.family, entry.methodName, entry.callSurface].filter(Boolean).join(" ").toLowerCase();
		const signatureTarget = [entry.displaySignature, entry.returnType, entry.callKind].filter(Boolean).join(" ").toLowerCase();
		const parameterTarget = entry.parameters
			.flatMap((parameter) => [parameter.raw, parameter.type, parameter.name, parameter.defaultValue])
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		const schemaTarget = entry.schemaTables.join(" ").toLowerCase();
		return {
			...entry,
			entryKind: "method",
			datasetId: "methods",
			entryKey: `methods:${entry.id}`,
			title: `${entry.family}${entry.callSurface}`,
			heading: entry.methodName,
			secondaryLabel: `${entry.returnType || "unknown"} return`,
			summary: typeof entry.summary === "string" ? entry.summary.trim() : "",
			exampleSummary: entry.example?.summary || "Placeholder example. Replace this with a real snippet in the generated JSON once authored usage examples are available.",
			exampleCode: entry.example?.code || buildMethodExampleCode(entry),
			exampleLanguage: entry.example?.language || "lua",
			notes: normalizeStringList(entry.notes, PLACEHOLDER_NOTES),
			gotchas: normalizeStringList(entry.gotchas),
			relatedSchemaNotes: normalizeRelatedSchemaNotes(entry.relatedSchemaNotes),
			seeAlso: normalizeSeeAlsoItems(entry.seeAlso),
			nameTarget,
			signatureTarget,
			parameterTarget,
			schemaTarget,
			allTarget: [nameTarget, signatureTarget, parameterTarget, schemaTarget].filter(Boolean).join(" "),
			prefixTargets: [`${entry.family}${entry.callSurface}`.toLowerCase(), entry.methodName.toLowerCase(), entry.family.toLowerCase()],
		};
	}

	function buildGameEventEntry(entry) {
		const nameTarget = [entry.name, `GameEvents.${entry.name}`, entry.scope].filter(Boolean).join(" ").toLowerCase();
		const signatureTarget = [entry.displaySignature, entry.scope, "callback"].filter(Boolean).join(" ").toLowerCase();
		const parameterTarget = entry.parameters
			.flatMap((parameter) => [parameter.raw, parameter.type, parameter.name, parameter.defaultValue])
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		const schemaTarget = entry.schemaTables.join(" ").toLowerCase();
		return {
			...entry,
			entryKind: "game-event",
			datasetId: "game-events",
			entryKey: `game-events:${entry.id}`,
			title: `GameEvents.${entry.name}`,
			heading: entry.name,
			secondaryLabel: `${entry.scope || "unscoped"} callback`,
			summary: typeof entry.summary === "string" ? entry.summary.trim() : "",
			exampleSummary: entry.example?.summary || "Placeholder example. Replace this with a real listener snippet in the generated JSON once authored usage examples are available.",
			exampleCode: entry.example?.code || buildGameEventExampleCode(entry),
			exampleLanguage: entry.example?.language || "lua",
			notes: normalizeStringList(entry.notes, PLACEHOLDER_NOTES),
			gotchas: normalizeStringList(entry.gotchas),
			relatedSchemaNotes: normalizeRelatedSchemaNotes(entry.relatedSchemaNotes),
			seeAlso: normalizeSeeAlsoItems(entry.seeAlso),
			nameTarget,
			signatureTarget,
			parameterTarget,
			schemaTarget,
			allTarget: [nameTarget, signatureTarget, parameterTarget, schemaTarget].filter(Boolean).join(" "),
			prefixTargets: [`gameevents.${entry.name}`.toLowerCase(), entry.name.toLowerCase(), (entry.scope || "").toLowerCase()],
		};
	}

	function buildMethodExampleCode(entry) {
		const args = entry.parameters.map((parameter) => parameter.name).join(", ");
		const receiver = `some${entry.family}`;
		const invocation = entry.callKind === "static" ? `${entry.family}.${entry.methodName}(${args})` : `${receiver}:${entry.methodName}(${args})`;
		const hasReturnValue = entry.returnType && !["void", "nil"].includes(entry.returnType.toLowerCase());
		const lines = ["-- Placeholder example. Replace with a real authored snippet."];
		if (hasReturnValue) {
			lines.push(`local result = ${invocation}`);
			lines.push("print(result)");
		} else {
			lines.push(invocation);
		}
		return lines.join("\n");
	}

	function buildGameEventExampleCode(entry) {
		const args = entry.parameters.map((parameter) => parameter.name).join(", ");
		return ["-- Placeholder example. Replace with a real authored listener.", `GameEvents.${entry.name}.Add(function(${args})`, `\t-- handle ${entry.name}`, "end)"].join("\n");
	}

	function normalizeStringList(value, fallback = []) {
		const normalized = Array.isArray(value)
			? value
					.filter((item) => typeof item === "string")
					.map((item) => item.trim())
					.filter(Boolean)
			: [];
		return normalized.length > 0 ? normalized : [...fallback];
	}

	function normalizeRelatedSchemaNotes(value) {
		if (!Array.isArray(value)) {
			return [];
		}
		return value
			.map((item) => {
				if (!item || typeof item !== "object") {
					return null;
				}
				const table = typeof item.table === "string" ? item.table.trim() : "";
				const note = typeof item.note === "string" ? item.note.trim() : "";
				if (!table) {
					return null;
				}
				return {
					table,
					note,
				};
			})
			.filter(Boolean);
	}

	function normalizeSeeAlsoItems(value) {
		if (!Array.isArray(value)) {
			return [];
		}
		return value
			.map((item) => {
				if (typeof item === "string") {
					const trimmed = item.trim();
					return trimmed ? { ref: trimmed } : null;
				}
				if (!item || typeof item !== "object") {
					return null;
				}
				const normalized = {};
				for (const key of ["entryId", "entryKey", "ref", "href", "table", "label", "note"]) {
					if (typeof item[key] === "string" && item[key].trim()) {
						normalized[key] = item[key].trim();
					}
				}
				return Object.keys(normalized).length > 0 ? normalized : null;
			})
			.filter(Boolean);
	}

	function buildLuaSearchResult(entry, query, mode) {
		const nameMatch = query ? entry.nameTarget.includes(query) : false;
		const signatureMatch = query ? entry.signatureTarget.includes(query) : false;
		const parameterMatch = query ? entry.parameterTarget.includes(query) : false;
		const schemaMatch = query ? entry.schemaTarget.includes(query) : false;
		const prefixMatch = query ? entry.prefixTargets.some((target) => target.startsWith(query)) : false;

		let matchesQuery = !query;
		if (query) {
			switch (mode) {
				case "names":
					matchesQuery = nameMatch;
					break;
				case "signatures":
					matchesQuery = signatureMatch;
					break;
				case "parameters":
					matchesQuery = parameterMatch;
					break;
				case "schema":
					matchesQuery = schemaMatch;
					break;
				default:
					matchesQuery = nameMatch || signatureMatch || parameterMatch || schemaMatch;
			}
		}

		const score = (prefixMatch ? 6 : 0) + (nameMatch ? 4 : 0) + (signatureMatch ? 3 : 0) + (parameterMatch ? 2 : 0) + (schemaMatch ? 1 : 0);
		return {
			...entry,
			nameMatch,
			signatureMatch,
			parameterMatch,
			schemaMatch,
			prefixMatch,
			score,
			matchesQuery,
		};
	}

	function sortLuaEntries(entries, sortId, query) {
		const next = [...entries];
		switch (sortId) {
			case "alpha":
				return next.sort((left, right) => left.heading.localeCompare(right.heading));
			case "params":
				return next.sort((left, right) => right.parameterCount - left.parameterCount || left.heading.localeCompare(right.heading));
			case "schema":
				return next.sort((left, right) => right.schemaTables.length - left.schemaTables.length || left.heading.localeCompare(right.heading));
			default:
				return next.sort((left, right) => {
					if (query && right.score !== left.score) {
						return right.score - left.score;
					}
					if (left.entryKind === "method" && right.entryKind === "method" && left.family !== right.family) {
						return left.family.localeCompare(right.family);
					}
					return left.heading.localeCompare(right.heading);
				});
		}
	}

	function formatNumber(value) {
		return numberFormatter.format(value || 0);
	}

	function setDataset(datasetId) {
		activeDataset = datasetId;
	}

	function selectFamily(family) {
		activeDataset = "methods";
		familyFilter = family;
	}

	function setSearchExample(value) {
		searchQuery = value;
	}

	function clearLuaFilters() {
		searchQuery = "";
		searchMode = "all";
		sortMode = "relevance";
		familyFilter = "all";
		scopeFilter = "all";
	}

	function selectEntry(entryId) {
		selectedEntryId = entryId;
	}

	function selectAdjacentEntry(delta) {
		if (!filteredEntries.length) {
			return;
		}
		const currentIndex = Math.max(
			0,
			filteredEntries.findIndex((entry) => entry.id === selectedEntry?.id),
		);
		const nextIndex = Math.min(filteredEntries.length - 1, Math.max(0, currentIndex + delta));
		selectedEntryId = filteredEntries[nextIndex].id;
	}

	function handleSearchKeyDown(event) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			selectAdjacentEntry(1);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			selectAdjacentEntry(-1);
		}
	}

	function schemaTableHref(table) {
		const params = new URLSearchParams({
			table,
			tab: "columns",
		});
		return `/schema-browser?${params.toString()}`;
	}

	function buildLuaSectionHref(sectionId) {
		if (typeof window === "undefined") {
			return `#lua-doc-${sectionId}`;
		}
		return buildLuaUrl({
			...snapshotLuaUrlState(),
			section: sectionId,
		});
	}

	async function copyEntrySignature() {
		if (!selectedEntry || typeof navigator === "undefined" || !navigator.clipboard) {
			return;
		}
		await navigator.clipboard.writeText(selectedEntry.displaySignature);
		signatureCopied = true;
		if (copyFeedbackTimeout) {
			clearTimeout(copyFeedbackTimeout);
		}
		copyFeedbackTimeout = window.setTimeout(() => {
			signatureCopied = false;
			copyFeedbackTimeout = null;
		}, 1600);
	}

	function schemaTableCountLabel(entry) {
		return entry.schemaTables.length === 1 ? "schema table" : "schema tables";
	}

	function normalizeDocSectionId(hash) {
		const normalized = (hash || "").replace(/^#lua-doc-/, "").trim();
		return normalized || "";
	}

	function resolveEntryReference(reference) {
		if (!reference) {
			return null;
		}
		return (
			ENTRY_BY_KEY.get(reference) ||
			METHOD_BY_ID.get(reference) ||
			GAME_EVENT_BY_ID.get(reference) ||
			[...ENTRY_BY_KEY.values()].find((entry) => entry.displaySignature === reference || entry.title === reference || entry.heading === reference) ||
			null
		);
	}

	function resolveSeeAlsoItem(item, index) {
		if (!item) {
			return null;
		}

		if (item.table) {
			return {
				id: `schema-${item.table}-${index}`,
				type: "schema",
				label: item.label || item.table,
				copy: item.note || "Schema table",
				href: schemaTableHref(item.table),
			};
		}

		if (item.href) {
			return {
				id: `link-${index}`,
				type: "link",
				label: item.label || item.href,
				copy: item.note || "External reference",
				href: item.href,
			};
		}

		const referencedEntry = resolveEntryReference(item.entryId || item.entryKey || item.ref);
		if (!referencedEntry) {
			return null;
		}
		return {
			id: `entry-${referencedEntry.id}-${index}`,
			type: "entry",
			label: item.label || referencedEntry.title,
			copy: item.note || referencedEntry.secondaryLabel,
			entryId: referencedEntry.id,
		};
	}

	function trackDocSection(node, sectionId) {
		docSectionElements.set(sectionId, node);
		return {
			destroy() {
				docSectionElements.delete(sectionId);
			},
		};
	}

	function scrollDocSectionIntoView(sectionId, behavior = "smooth") {
		const node = docSectionElements.get(sectionId);
		if (!node) {
			return;
		}
		node.scrollIntoView({
			block: "start",
			inline: "nearest",
			behavior,
		});
	}

	function updateActiveDocSectionFromScroll() {
		if (typeof window === "undefined" || !selectedEntrySections.length) {
			return;
		}

		let nextSectionId = selectedEntrySections[0]?.id || "";
		for (const section of selectedEntrySections) {
			const node = docSectionElements.get(section.id);
			if (!node) {
				continue;
			}
			if (node.getBoundingClientRect().top <= DOC_SECTION_SCROLL_OFFSET) {
				nextSectionId = section.id;
				continue;
			}
			break;
		}

		if (nextSectionId && nextSectionId !== activeDocSectionId) {
			activeDocSectionId = nextSectionId;
		}
	}

	function handleDocSectionClick(event, sectionId) {
		event.preventDefault();
		pendingLuaHistoryPush = true;
		activeDocSectionId = sectionId;
		scrollDocSectionIntoView(sectionId);
	}

	function snapshotLuaUrlState() {
		return {
			q: searchQuery.trim(),
			dataset: activeDataset,
			family: familyFilter,
			scope: scopeFilter,
			mode: searchMode,
			sort: sortMode,
			entry: selectedEntry?.id || selectedEntryId || "",
			section: activeDocSectionId || "",
		};
	}

	function serializeLuaUrlState(snapshot) {
		return JSON.stringify(snapshot);
	}

	function buildLuaUrl(snapshot) {
		const url = new URL(window.location.href);
		const params = new URLSearchParams(url.search);
		const managedKeys = ["q", "dataset", "family", "scope", "mode", "sort", "entry"];
		for (const key of managedKeys) {
			params.delete(key);
		}
		if (snapshot.q) {
			params.set("q", snapshot.q);
		}
		if (snapshot.dataset && snapshot.dataset !== "methods") {
			params.set("dataset", snapshot.dataset);
		}
		if (snapshot.family && snapshot.family !== "all") {
			params.set("family", snapshot.family);
		}
		if (snapshot.scope && snapshot.scope !== "all") {
			params.set("scope", snapshot.scope);
		}
		if (snapshot.mode && snapshot.mode !== "all") {
			params.set("mode", snapshot.mode);
		}
		if (snapshot.sort && snapshot.sort !== "relevance") {
			params.set("sort", snapshot.sort);
		}
		if (snapshot.entry && snapshot.entry !== (snapshot.dataset === "methods" ? DEFAULT_METHOD_ID : DEFAULT_EVENT_ID)) {
			params.set("entry", snapshot.entry);
		}
		const query = params.toString();
		const hash = snapshot.section ? `#lua-doc-${snapshot.section}` : "";
		return `${url.pathname}${query ? `?${query}` : ""}${hash}`;
	}

	async function applyLuaUrlStateFromLocation() {
		if (typeof window === "undefined") {
			return;
		}

		applyingLuaUrlState = true;
		const params = new URLSearchParams(window.location.search);
		const validDatasets = new Set(DATASET_TABS.map((tab) => tab.id));
		const validSearchModes = new Set(SEARCH_MODE_DEFS.map((mode) => mode.id));
		const validSortModes = new Set(SORT_MODE_DEFS.map((mode) => mode.id));
		const nextDataset = validDatasets.has(params.get("dataset") || "") ? params.get("dataset") : "methods";
		const nextFamily = params.get("family") || "all";
		const nextScope = params.get("scope") || "all";
		const nextEntry = params.get("entry") || (nextDataset === "methods" ? DEFAULT_METHOD_ID : DEFAULT_EVENT_ID);
		const nextSection = normalizeDocSectionId(window.location.hash);

		searchQuery = params.get("q") || "";
		activeDataset = nextDataset;
		familyFilter = nextFamily;
		scopeFilter = nextScope;
		searchMode = validSearchModes.has(params.get("mode") || "") ? params.get("mode") : "all";
		sortMode = validSortModes.has(params.get("sort") || "") ? params.get("sort") : "relevance";
		selectedEntryId = nextEntry;
		activeDocSectionId = nextSection || "signature";
		pendingDocSectionId = nextSection;

		const nextSnapshot = snapshotLuaUrlState();
		lastLuaUrlSnapshot = nextSnapshot;
		lastLuaUrlState = serializeLuaUrlState(nextSnapshot);
		applyingLuaUrlState = false;
	}

	function shouldPushLuaHistoryEntry(previous, next) {
		if (!previous) {
			return false;
		}
		return previous.dataset !== next.dataset || previous.family !== next.family || previous.scope !== next.scope || previous.entry !== next.entry || previous.sort !== next.sort;
	}
</script>

<section class="lua-page">
	<header class="lua-hero">
		<p class="lua-eyebrow">Scripting Reference</p>
		<h1>Lua API Explorer</h1>
		<p>Browse Civ V Lua methods and GameEvents, inspect signatures, parameters, notes, examples, and jump into related schema tables.</p>
	</header>

	<section class="lua-panel">
		<div class="lua-section-head">
			<span class="lua-kicker">Quick Starts</span>
			<h2>Start with the lua hooks modders hit most often</h2>
			<p>These are the most useful starting points for exploring the Lua API and wiring up your modding projects.</p>
		</div>
		<div class="lua-family-grid">
			{#each FEATURED_FAMILIES as family (family.name)}
				<button type="button" class={`lua-family-card ${activeDataset === "methods" && familyFilter === family.name ? "is-active" : ""}`} onclick={() => selectFamily(family.name)}>
					<div class="lua-family-card-head">
						<h3>{family.name}</h3>
						<span>{family.methodCount}</span>
					</div>
					<p>{family.quickStartCopy}</p>
				</button>
			{/each}
		</div>
	</section>

	<section class="lua-panel lua-panel--explorer">
		<div class="lua-toolbar">
			<div class="lua-toolbar-primary">
				<div class="lua-tab-row" role="tablist" aria-label="Lua datasets">
					{#each DATASET_TABS as tab (tab.id)}
						<button type="button" role="tab" aria-selected={activeDataset === tab.id} class={`lua-tab ${activeDataset === tab.id ? "is-active" : ""}`} onclick={() => setDataset(tab.id)}>
							{tab.label}
						</button>
					{/each}
				</div>

				<label class="lua-search-field">
					<span>Search the lua references</span>
					<input type="search" bind:value={searchQuery} onkeydown={handleSearchKeyDown} placeholder={searchPlaceholder} />
				</label>

				<label class="lua-sort-field">
					<span>Sort entries</span>
					<select bind:value={sortMode}>
						{#each SORT_MODE_DEFS as option (option.id)}
							<option value={option.id}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="lua-toolbar-secondary">
				<!-- <div class="lua-mode-group" role="group" aria-label="Search scope">
					{#each SEARCH_MODE_DEFS as mode (mode.id)}
						<button type="button" class={`lua-filter-chip ${searchMode === mode.id ? "is-active" : ""}`} onclick={() => (searchMode = mode.id)}>{mode.label}</button>
					{/each}
				</div> -->

				{#if activeDataset === "methods"}
					<div class="lua-filter-group" role="group" aria-label="Method families">
						<button type="button" class={`lua-filter-chip ${familyFilter === "all" ? "is-active" : ""}`} onclick={() => (familyFilter = "all")}>
							All
							<span>{methodResults.filter((entry) => entry.matchesQuery).length}</span>
						</button>
						{#each familyCounts as family (family.name)}
							<button type="button" class={`lua-filter-chip ${familyFilter === family.name ? "is-active" : ""}`} onclick={() => (familyFilter = family.name)}>
								{family.name}
								<span>{family.count}</span>
							</button>
						{/each}
					</div>
				{:else}
					<div class="lua-filter-group" role="group" aria-label="GameEvent scopes">
						<button type="button" class={`lua-filter-chip ${scopeFilter === "all" ? "is-active" : ""}`} onclick={() => (scopeFilter = "all")}>
							All scopes
							<span>{gameEventResults.filter((entry) => entry.matchesQuery).length}</span>
						</button>
						{#each scopeCounts as scope (scope.name)}
							<button type="button" class={`lua-filter-chip ${scopeFilter === scope.name ? "is-active" : ""}`} onclick={() => (scopeFilter = scope.name)}>
								{scope.name}
								<span>{scope.count}</span>
							</button>
						{/each}
					</div>
				{/if}

				{#if recentEntries.length > 0}
					<div class="lua-recent-group" aria-label="Recent Searches">
						<span class="lua-toolbar-label">Recent Searches</span>
						<div class="lua-recent-list">
							{#each recentEntries as entry (entry.entryKey)}
								<button type="button" class="lua-link lua-link--inline" onclick={() => selectEntry(entry.id)}>{entry.heading}</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div class="lua-explorer-grid">
			<aside class="lua-list-panel" aria-label="Lua entries">
				<div class="lua-list-head">
					<h2>{activeDataset === "methods" ? "Methods" : "GameEvents"}</h2>
					<span>{filteredEntries.length} matches</span>
				</div>
				<div class="lua-entry-list">
					{#if filteredEntries.length === 0}
						<div class="lua-empty-state">
							<p class="lua-empty">No entries match the current search.</p>
							<p class="lua-empty-note">Try one of these examples or clear the current dataset filters.</p>
							<div class="lua-empty-actions">
								{#each emptySearchExamples as example (example)}
									<button type="button" class="lua-link lua-link--inline" onclick={() => setSearchExample(example)}>{example}</button>
								{/each}
								<button type="button" class="lua-link lua-link--inline" onclick={clearLuaFilters}>Clear search</button>
							</div>
						</div>
					{:else}
						{#each filteredEntries as entry (entry.entryKey)}
							<button type="button" class={`lua-entry-card ${selectedEntry?.entryKey === entry.entryKey ? "is-active" : ""}`} onclick={() => selectEntry(entry.id)}>
								<div class="lua-entry-card-top">
									<div>
										<h3>{entry.heading}</h3>
										<p class="lua-entry-path">{entry.title}</p>
									</div>
									<div class="lua-entry-card-metrics">
										<span>{entry.parameterCount} params</span>
										{#if entry.schemaTables.length > 0}
											<span>{entry.schemaTables.length} schema</span>
										{/if}
									</div>
								</div>
								<p class="lua-entry-card-copy">{entry.secondaryLabel}</p>
								<!-- <div class="lua-entry-card-footer">
									{#if normalizedQuery && (entry.nameMatch || entry.signatureMatch || entry.parameterMatch || entry.schemaMatch)}
										<div class="lua-entry-tags">
											{#if entry.nameMatch}
												<span class="lua-tag">Name</span>
											{/if}
											{#if entry.signatureMatch}
												<span class="lua-tag">Signature</span>
											{/if}
											{#if entry.parameterMatch}
												<span class="lua-tag">Params</span>
											{/if}
											{#if entry.schemaMatch}
												<span class="lua-tag">Schema</span>
											{/if}
										</div>
									{/if}
									{#if entry.schemaTables.length > 0}
										<p class="lua-entry-schema-preview">
											{entry.schemaTables.slice(0, 3).join(" · ")}
											{#if entry.schemaTables.length > 3}
												<span>+{entry.schemaTables.length - 3} more</span>
											{/if}
										</p>
									{/if}
								</div> -->
							</button>
						{/each}
					{/if}
				</div>
			</aside>

			{#if selectedEntry}
				<section class="lua-detail-panel" aria-label="Selected entry details">
					<div class="lua-detail-hero">
						<div class="lua-detail-hero-copy">
							<p class="lua-kicker">Selected entry</p>
							<h2>{selectedEntry.heading}</h2>
							<code>{selectedEntry.displaySignature}</code>
							{#if normalizedQuery && selectedMatchReasons.length > 0}
								<div class="lua-detail-match-summary">
									<p class="lua-card-copy">Matched in</p>
									<div class="lua-entry-tags">
										{#each selectedMatchReasons as reason (reason)}
											<span class="lua-tag">{reason}</span>
										{/each}
									</div>
								</div>
							{/if}
							<!-- <div class="lua-detail-actions">
								<button type="button" class="lua-link lua-link--inline" onclick={copyEntrySignature}>{signatureCopied ? "Copied" : "Copy signature"}</button>
							</div> -->
						</div>
						<div class="lua-detail-chips">
							{#if selectedEntry.entryKind === "method"}
								<span class="lua-metric-chip">{selectedEntry.family}</span>
								<span class="lua-metric-chip">{selectedEntry.callKind}</span>
								<span class="lua-metric-chip">returns {selectedEntry.returnType || "unknown"}</span>
							{:else}
								<span class="lua-metric-chip">GameEvents</span>
								<span class="lua-metric-chip">{selectedEntry.scope || "unscoped"}</span>
							{/if}
							<span class="lua-metric-chip">{selectedEntry.parameterCount} params</span>
							<!-- <span class="lua-metric-chip">{selectedEntry.schemaTables.length} schema links</span> -->
						</div>
					</div>

					<div class="lua-docs-layout">
						<article class="lua-docs-article">
							{#if selectedEntrySummary}
								<section id="lua-doc-summary" class="lua-detail-card lua-doc-section" use:trackDocSection={"summary"}>
									<div class="lua-detail-card-head">
										<h3>Summary</h3>
									</div>
									<p class="lua-card-copy">{selectedEntrySummary}</p>
								</section>
							{/if}

							<section id="lua-doc-signature" class="lua-detail-card lua-doc-section" use:trackDocSection={"signature"}>
								<div class="lua-detail-card-head">
									<h3>Signature</h3>
									<span>{selectedEntry.entryKind === "method" ? selectedEntry.family : selectedEntry.scope || "GameEvents"}</span>
								</div>
								<code class="lua-doc-signature">{selectedEntry.displaySignature}</code>
								<ul class="lua-signature-meta" role="list">
									{#if selectedEntry.entryKind === "method"}
										<li role="listitem">
											<span>Call surface</span>
											<strong>{selectedEntry.family}</strong>
											<span>{selectedEntry.callKind} method</span>
										</li>
										<li role="listitem">
											<span>Return type</span>
											<strong>{selectedEntry.returnType || "unknown"}</strong>
											<span>workbook snapshot</span>
										</li>
									{:else}
										<li role="listitem">
											<span>Event surface</span>
											<strong>GameEvents</strong>
											<span>callback</span>
										</li>
										<li role="listitem">
											<span>Scope</span>
											<strong>{selectedEntry.scope || "unscoped"}</strong>
											<span>workbook label</span>
										</li>
									{/if}
								</ul>
							</section>

							{#if selectedEntry.parameters.length > 0}
								<section id="lua-doc-parameters" class="lua-detail-card lua-doc-section" use:trackDocSection={"parameters"}>
									<div class="lua-detail-card-head">
										<h3>Parameters</h3>
										<span>{selectedEntry.parameters.length}</span>
									</div>
									<div class="lua-parameter-list" role="list">
										{#each selectedEntry.parameters as parameter (parameter.raw)}
											<div class="lua-parameter-row" role="listitem">
												<div>
													<strong>{parameter.name || parameter.raw}</strong>
													<p>{parameter.type || "untyped"}</p>
												</div>
												<div class="lua-parameter-flags">
													{#if parameter.optional}
														<span class="lua-tag lua-tag--optional">Optional</span>
													{/if}
													{#if parameter.defaultValue}
														<span class="lua-tag">Default {parameter.defaultValue}</span>
													{/if}
													<span class="lua-tag">{parameter.raw}</span>
												</div>
											</div>
										{/each}
									</div>
								</section>
							{/if}

							<section id="lua-doc-notes" class="lua-detail-card lua-doc-section" use:trackDocSection={"notes"}>
								<div class="lua-detail-card-head">
									<h3>Notes</h3>
								</div>
								<ul class="lua-note-list">
									{#each selectedEntry.notes as note (`${selectedEntry.entryKey}-${note}`)}
										<li>{note}</li>
									{/each}
								</ul>
							</section>

							{#if selectedEntry.gotchas.length > 0}
								<section id="lua-doc-gotchas" class="lua-detail-card lua-doc-section" use:trackDocSection={"gotchas"}>
									<div class="lua-detail-card-head">
										<h3>Gotchas</h3>
										<span>{selectedEntry.gotchas.length}</span>
									</div>
									<ul class="lua-note-list">
										{#each selectedEntry.gotchas as gotcha (`${selectedEntry.entryKey}-${gotcha}`)}
											<li>{gotcha}</li>
										{/each}
									</ul>
								</section>
							{/if}

							<section id="lua-doc-example" class="lua-detail-card lua-doc-section" use:trackDocSection={"example"}>
								<div class="lua-detail-card-head">
									<h3>Example</h3>
									<span>{selectedEntry.exampleLanguage}</span>
								</div>
								<p class="lua-card-copy">{selectedEntry.exampleSummary}</p>
								<pre class="lua-doc-example"><code>{selectedEntry.exampleCode}</code></pre>
							</section>

							{#if selectedSchemaTouchpoints.length > 0}
								<section id="lua-doc-schema" class="lua-detail-card lua-doc-section" use:trackDocSection={"schema"}>
									<div class="lua-detail-card-head">
										<h3>Schema touchpoints</h3>
										<span>{selectedSchemaTouchpoints.length}</span>
									</div>
									<p class="lua-card-copy">
										These tables are the strongest schema-side matches for the current signature, with parameter context and any authored notes when available.
									</p>
									<div class="lua-schema-grid">
										{#each selectedSchemaTouchpoints as touchpoint (touchpoint.table)}
											<article class="lua-schema-card">
												<div class="lua-schema-card-head">
													<a class="lua-link lua-link--inline" href={touchpoint.href} target="_blank" rel="noopener noreferrer">{touchpoint.table}</a>
													{#if touchpoint.sourceLabels.length > 0}
														<span>{touchpoint.sourceLabels.length} source{touchpoint.sourceLabels.length === 1 ? "" : "s"}</span>
													{/if}
												</div>
												{#if touchpoint.sourceLabels.length > 0}
													<p class="lua-card-copy">From {touchpoint.sourceLabels.join(" · ")}</p>
												{/if}
												{#if touchpoint.notes.length > 0}
													<ul class="lua-note-list">
														{#each touchpoint.notes as note (`${touchpoint.table}-${note}`)}
															<li>{note}</li>
														{/each}
													</ul>
												{/if}
											</article>
										{/each}
									</div>
									<p class="lua-card-copy">{selectedSchemaTouchpoints.length} {schemaTableCountLabel({ schemaTables: selectedSchemaTouchpoints })} line up with this entry.</p>
								</section>
							{/if}

							{#if selectedSeeAlsoItems.length > 0}
								<section id="lua-doc-see-also" class="lua-detail-card lua-doc-section" use:trackDocSection={"see-also"}>
									<div class="lua-detail-card-head">
										<h3>See also</h3>
										<span>{selectedSeeAlsoItems.length}</span>
									</div>
									<div class="lua-related-grid">
										{#each selectedSeeAlsoItems as item (item.id)}
											{#if item.entryId}
												<button type="button" class="lua-related-card" onclick={() => selectEntry(item.entryId)}>
													<strong>{item.label}</strong>
													<span>{item.copy}</span>
												</button>
											{:else}
												<a class="lua-related-card lua-related-card--link" href={item.href} target="_blank" rel="noopener noreferrer">
													<strong>{item.label}</strong>
													<span>{item.copy}</span>
												</a>
											{/if}
										{/each}
									</div>
								</section>
							{/if}

							{#if relatedEntries.length > 0}
								<section id="lua-doc-related" class="lua-detail-card lua-doc-section" use:trackDocSection={"related"}>
									<div class="lua-detail-card-head">
										<h3>Related entries</h3>
										<span>{relatedEntries.length}</span>
									</div>
									<div class="lua-related-grid">
										{#each relatedEntries as entry (entry.entryKey)}
											<button type="button" class="lua-related-card" onclick={() => selectEntry(entry.id)}>
												<strong>{entry.title}</strong>
												<span>{entry.parameterCount} params{entry.schemaTables.length ? ` · ${entry.schemaTables.length} schema` : ""}</span>
											</button>
										{/each}
									</div>
								</section>
							{/if}
						</article>

						<aside class="lua-docs-nav">
							<div class="lua-docs-nav-card">
								<span class="lua-kicker">On This Page</span>
								<div class="lua-docs-nav-links">
									{#each selectedEntrySections as section (section.id)}
										<a
											class={`lua-link lua-link--inline lua-docs-nav-link ${activeDocSectionId === section.id ? "is-active" : ""}`}
											href={section.href}
											aria-current={activeDocSectionId === section.id ? "location" : undefined}
											onclick={(event) => handleDocSectionClick(event, section.id)}
										>
											{section.label}
										</a>
									{/each}
								</div>
							</div>
							{#if selectedEntryQuickMeta.length > 0}
								<div class="lua-docs-nav-card">
									<span class="lua-kicker">Entry Facts</span>
									<dl class="lua-quick-meta">
										{#each selectedEntryQuickMeta as item (item.label)}
											<div>
												<dt>{item.label}</dt>
												<dd>{item.value}</dd>
											</div>
										{/each}
									</dl>
								</div>
							{/if}
							{#if selectedEntryQuickLinks.length > 0}
								<div class="lua-docs-nav-card">
									<span class="lua-kicker">Quick Links</span>
									<div class="lua-docs-nav-links">
										{#each selectedEntryQuickLinks as link (link.id)}
											<a class="lua-link lua-link--inline" href={link.href} target="_blank" rel="noopener noreferrer" title={link.copy}>{link.label}</a>
										{/each}
									</div>
								</div>
							{/if}
						</aside>
					</div>
				</section>
			{/if}
		</div>
	</section>
</section>

<style>
	.lua-page {
		--lua-bg: linear-gradient(180deg, color-mix(in srgb, var(--page-background, #0f1014) 86%, #24381d 14%) 0%, color-mix(in srgb, var(--page-background, #0f1014) 94%, #11180e 6%) 100%);
		--lua-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #638f4f 28%);
		--lua-copy: color-mix(in srgb, currentColor 72%, transparent);
		--lua-highlight: #b7ef84;
		--lua-highlight-strong: #ebffd6;
		--lua-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.88)) 86%, #20301b 14%);
		display: grid;
		gap: 1.15rem;
	}

	.lua-hero,
	.lua-panel,
	.lua-stat-card,
	.lua-docs-nav-card {
		background: var(--lua-panel);
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
		border: 1px solid var(--lua-border);
		border-radius: 1.5rem;
	}

	.lua-hero,
	.lua-panel,
	.lua-stat-card {
		padding-block: 1.3rem;
		padding-inline: 1.3rem;
	}

	.lua-hero {
		background: var(--lua-bg);
	}

	.lua-eyebrow,
	.lua-kicker {
		color: var(--lua-highlight);
		font-size: 0.76rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		margin: 0 0 0.45rem;
	}

	.lua-hero h1,
	.lua-section-head h2,
	.lua-family-card h3,
	.lua-entry-card h3,
	.lua-detail-card h3,
	.lua-planned-card h3,
	.lua-detail-hero h2,
	.lua-list-head h2 {
		margin: 0;
	}

	.lua-hero p,
	.lua-section-head p,
	.lua-stat-card p,
	.lua-family-card p,
	.lua-entry-card p,
	.lua-card-copy,
	.lua-empty,
	.lua-parameter-row p,
	.lua-planned-card p,
	.lua-note-list li,
	.lua-related-card span {
		color: var(--lua-copy);
		text-align: left;
		line-height: 1.45;
		margin: 0;
	}

	.lua-hero-links,
	.lua-tab-row,
	.lua-filter-group,
	.lua-entry-tags,
	.lua-detail-chips,
	.lua-parameter-flags,
	.lua-schema-links,
	.lua-mode-group,
	.lua-recent-list,
	.lua-detail-actions,
	.lua-docs-nav-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.lua-link,
	.lua-tab,
	.lua-filter-chip,
	.lua-family-card,
	.lua-entry-card,
	.lua-related-card {
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease;
	}

	.lua-link {
		align-items: center;
		display: inline-flex;
		color: var(--lua-highlight-strong);
		font: inherit;
		text-decoration: none;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--lua-border);
		border-radius: 999px;
		padding-block: 0.72rem;
		padding-inline: 0.95rem;
		cursor: pointer;

		&:hover {
			color: white;
		}
	}

	.lua-link--inline {
		padding-block: 0.42rem;
		padding-inline: 0.68rem;
	}

	.lua-stats,
	.lua-family-grid,
	.lua-planned-grid,
	.lua-related-grid {
		display: grid;
		gap: 0.85rem;
	}

	.lua-stats {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.lua-family-grid,
	.lua-planned-grid,
	.lua-related-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.lua-stat-value {
		display: block;
		color: var(--lua-highlight-strong);
		font-size: clamp(1.6rem, 4vw, 2.5rem);
		font-weight: 700;
		margin-block-end: 0.45rem;
	}

	.lua-section-head {
		margin-block-end: 0.9rem;
	}

	.lua-family-card,
	.lua-entry-card,
	.lua-tab,
	.lua-filter-chip,
	.lua-related-card {
		font: inherit;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--lua-border);
		cursor: pointer;
	}

	.lua-family-card,
	.lua-entry-card,
	.lua-detail-card,
	.lua-list-panel,
	.lua-planned-card,
	.lua-related-card,
	.lua-docs-nav-card {
		border-radius: 1.2rem;
	}

	.lua-family-card,
	.lua-entry-card,
	.lua-detail-card,
	.lua-list-panel,
	.lua-planned-card,
	.lua-related-card,
	.lua-docs-nav-card {
		padding-block: 0.95rem;
		padding-inline: 0.95rem;
	}

	.lua-family-card.is-active,
	.lua-entry-card.is-active,
	.lua-tab.is-active,
	.lua-filter-chip.is-active,
	.lua-family-card:hover,
	.lua-entry-card:hover,
	.lua-related-card:hover {
		background: rgba(183, 239, 132, 0.11);
		border-color: color-mix(in srgb, var(--lua-highlight) 70%, white 30%);
		transform: translateY(-1px);
	}

	.lua-entry-card {
		min-block-size: 6ch;
		block-size: fit-content;
		min-inline-size: 0;
		display: flex;
		flex-direction: column;
		gap: 0.32rem;
		text-align: left;
		border-radius: 0.8rem;
		padding-block: 0.68rem;
		padding-inline: 0.76rem;
		overflow: hidden;
	}

	.lua-family-card-head,
	.lua-entry-card-head,
	.lua-detail-card-head,
	.lua-list-head {
		display: flex;
		gap: 0.8rem;
		justify-content: space-between;
	}

	.lua-family-card-head span,
	.lua-entry-card-head span,
	.lua-detail-card-head span,
	.lua-list-head span {
		color: var(--lua-copy);
		white-space: nowrap;
	}

	.lua-entry-card-top {
		align-items: start;
		display: flex;
		gap: 0.55rem;
		justify-content: space-between;
	}

	.lua-entry-card-top > div:first-child {
		min-inline-size: 0;
		display: block;
	}

	.lua-entry-card-metrics {
		display: flex;
		flex: 0 0 auto;
		flex-direction: column;
		gap: 0.16rem;
		justify-items: end;
		color: var(--lua-copy);
		font-size: 0.72rem;
		white-space: nowrap;
	}

	.lua-family-card h3,
	.lua-entry-card h3,
	.lua-detail-card h3,
	.lua-planned-card h3,
	.lua-related-card strong {
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.lua-entry-card h3 {
		font-size: 1.05rem;
		line-height: 1.15;
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}

	.lua-entry-path,
	.lua-entry-card-copy,
	.lua-entry-schema-preview {
		color: var(--lua-copy);
		font-size: 0.76rem;
		line-height: 1.3;
		margin: 0;
	}

	.lua-entry-path {
		opacity: 0.9;
		font-family: "SFMono-Regular", "JetBrains Mono", ui-monospace, monospace;
		font-size: 0.7rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-block-start: 0.12rem;
		overflow: hidden;
	}

	.lua-entry-card-footer {
		display: grid;
		gap: 0.28rem;
	}

	.lua-entry-tags {
		gap: 0.35rem;
	}

	.lua-entry-card-copy,
	.lua-entry-schema-preview {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}

	.lua-entry-schema-preview span {
		opacity: 0.8;
	}

	.lua-toolbar {
		display: grid;
		gap: 0.8rem;
		margin-block-end: 0.85rem;
	}

	.lua-toolbar-primary,
	.lua-toolbar-secondary {
		display: grid;
		gap: 0.8rem;
	}

	.lua-toolbar-primary {
		align-items: end;
		grid-template-columns: auto minmax(0, 1fr) minmax(13rem, 15rem);
	}

	.lua-toolbar-label,
	.lua-search-field span,
	.lua-sort-field span {
		color: var(--lua-copy);
		font-size: 0.8rem;
	}

	.lua-search-field,
	.lua-sort-field,
	.lua-recent-group {
		display: grid;
		gap: 0.45rem;
	}

	.lua-recent-group span {
		text-transform: uppercase;
	}

	.lua-search-field input,
	.lua-sort-field select {
		inline-size: 100%;
		color: inherit;
		font: inherit;
		background: rgba(0, 0, 0, 0.24);
		border: 1px solid var(--lua-border);
		border-radius: 0.95rem;
		padding-block: 0.78rem;
		padding-inline: 0.88rem;
	}

	.lua-tab-row {
		align-items: stretch;
		display: inline-flex;
		flex-wrap: nowrap;
		gap: 0;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--lua-border);
		border-radius: 1.25rem;
		overflow: hidden;
	}

	.lua-tab {
		position: relative;
		background: transparent;
		border: 0;
		border-radius: 0;
		padding-block: 0.62rem;
		padding-inline: 1.15rem;

		& + .lua-tab {
			border-inline-start: 1px solid var(--lua-border);
		}
	}

	.lua-filter-chip {
		align-items: center;
		display: inline-flex;
		gap: 0.45rem;
		font-size: 0.88rem;
		border-radius: 999px;
		padding-block: 0.48rem;
		padding-inline: 0.72rem;
	}

	.lua-filter-chip span {
		height: 1.7rem;
		display: inline-grid;
		place-items: center;
		inline-size: fit-content;
		min-inline-size: 2rem;
		font-size: 0.8rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		text-box: trim-both;
	}

	.lua-explorer-grid {
		display: grid;
		gap: 0.85rem;
		grid-template-columns: minmax(17rem, 20rem) minmax(0, 1fr);
	}

	.lua-list-panel,
	.lua-planned-card {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid var(--lua-border);
	}

	.lua-list-panel {
		position: sticky;
		inset-block-start: 1rem;
		max-block-size: calc(100dvh - 2rem);
		min-block-size: 0;
		align-self: stretch;
		overflow: hidden;
	}

	.lua-entry-list,
	.lua-parameter-list,
	.lua-note-list {
		display: grid;
		gap: 0.5rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.lua-entry-list {
		min-block-size: 0;
		align-content: start;
		flex: 1 1 auto;
		gap: 0.5rem;
		padding-block-start: 0.5rem;
		padding-inline-end: 0.15rem;
		overflow: auto;
	}

	.lua-empty-state {
		align-content: start;
		display: grid;
		gap: 0.55rem;
		justify-items: start;
	}

	.lua-empty-note,
	.lua-parameter-row p,
	.lua-card-copy {
		font-size: 0.88rem;
	}

	.lua-empty-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.lua-detail-panel {
		display: grid;
		gap: 0.85rem;
	}

	.lua-detail-hero {
		align-items: start;
		display: flex;
		gap: 0.8rem;
		justify-content: space-between;
		background: linear-gradient(135deg, rgba(183, 239, 132, 0.11), rgba(255, 255, 255, 0.02));
		border-radius: 1.2rem;
		padding-block: 0.95rem;
		padding-inline: 1rem;
	}

	.lua-detail-hero-copy {
		display: grid;
		gap: 0.7rem;
	}

	.lua-detail-hero code,
	.lua-doc-signature {
		display: block;
		color: var(--lua-highlight-strong);
		font-size: 0.92rem;
		background: rgba(0, 0, 0, 0.22);
		border-radius: 1rem;
		padding-block: 0.9rem;
		padding-inline: 1rem;
		overflow: auto;
	}

	.lua-detail-card {
		display: grid;
		gap: 0.7rem;
		background: transparent;
		border: 0;
		border-radius: 0;
		padding-block: 0.35rem;
		padding-inline: 0;
	}

	.lua-detail-match-summary {
		display: grid;
		gap: 0.3rem;
	}

	.lua-detail-chips,
	.lua-parameter-flags,
	.lua-entry-tags,
	.lua-schema-links {
		align-items: start;
	}

	.lua-detail-chips {
		align-content: start;
		align-self: start;
	}

	.lua-metric-chip,
	.lua-tag {
		align-items: center;
		display: inline-flex;
		font-size: 0.74rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		padding-block: 0.3rem;
		padding-inline: 0.54rem;
	}

	.lua-tag--optional {
		color: var(--lua-highlight-strong);
		background: rgba(183, 239, 132, 0.14);
	}

	.lua-docs-layout {
		display: grid;
		gap: 0.85rem;
		grid-template-columns: minmax(0, 1fr) minmax(15rem, 18rem);
	}

	.lua-docs-article {
		display: grid;
		gap: 1.15rem;
	}

	.lua-doc-section {
		scroll-margin-block-start: 1.5rem;
	}

	.lua-signature-meta {
		column-gap: 1rem;
		display: grid;
		row-gap: 0.45rem;
		grid-template-columns: minmax(10rem, 1fr) minmax(8rem, 9rem) minmax(10rem, max-content);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.lua-signature-meta li {
		display: contents;
	}

	.lua-signature-meta li > span:first-child,
	.lua-signature-meta li > strong,
	.lua-signature-meta li > span:last-child {
		padding-block-start: 0.45rem;
		border-block-start: 1px solid rgba(255, 255, 255, 0.08);
	}

	.lua-signature-meta li:first-child > span:first-child,
	.lua-signature-meta li:first-child > strong,
	.lua-signature-meta li:first-child > span:last-child {
		padding-block-start: 0;
		border-block-start: none;
	}

	.lua-signature-meta li > span:first-child {
		color: var(--lua-copy);
	}

	.lua-signature-meta li > strong {
		color: var(--lua-highlight-strong);
		font-size: 0.98rem;
		font-weight: 700;
		inline-size: 100%;
		justify-self: start;
		text-align: left;
	}

	.lua-signature-meta li > span:last-child {
		color: var(--lua-copy);
		inline-size: 100%;
		justify-self: start;
		text-align: left;
	}

	.lua-doc-example {
		color: var(--lua-highlight-strong);
		font-size: 0.88rem;
		line-height: 1.55;
		background: rgba(0, 0, 0, 0.22);
		border-radius: 1rem;
		padding-block: 0.9rem;
		padding-inline: 1rem;
		margin: 0;
		overflow: auto;
		white-space: pre-wrap;
	}

	.lua-schema-grid {
		display: grid;
		gap: 0.75rem;
	}

	.lua-schema-card {
		display: grid;
		gap: 0.45rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		padding-block: 0.8rem;
		padding-inline: 0.85rem;
	}

	.lua-schema-card-head {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		justify-content: space-between;
	}

	.lua-schema-card-head span {
		color: var(--lua-copy);
		font-size: 0.76rem;
	}

	.lua-parameter-row,
	.lua-note-list li {
		align-items: start;
		display: flex;
		gap: 0.8rem;
		justify-content: space-between;
		border-block-start: 1px solid rgba(255, 255, 255, 0.08);
		padding-block-start: 0.45rem;

		&:first-child {
			border-block-start: none;
			padding-block-start: 0;
		}
	}

	.lua-docs-nav {
		position: sticky;
		inset-block-start: 1rem;
		max-block-size: calc(100dvh - 2rem);
		align-self: start;
		display: grid;
		gap: 0.85rem;
	}

	.lua-docs-nav-card {
		display: grid;
		gap: 0.6rem;
		padding-block: 0.95rem;
		padding-inline: 0.95rem;
	}

	.lua-docs-nav-links {
		align-items: stretch;
	}

	.lua-docs-nav-link.is-active {
		color: white;
		background: rgba(183, 239, 132, 0.13);
		border-color: color-mix(in srgb, var(--lua-highlight) 70%, white 30%);
	}

	.lua-quick-meta {
		display: grid;
		gap: 0.55rem;
		margin: 0;
	}

	.lua-quick-meta div {
		align-items: baseline;
		display: flex;
		gap: 0.6rem;
		justify-content: space-between;
	}

	.lua-quick-meta dt,
	.lua-quick-meta dd {
		margin: 0;
	}

	.lua-quick-meta dt {
		color: var(--lua-copy);
		font-size: 0.82rem;
	}

	.lua-quick-meta dd {
		color: var(--lua-highlight-strong);
		font-weight: 600;
	}

	.lua-related-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.lua-related-card {
		display: block;
		text-align: left;
	}

	.lua-related-card--link {
		text-decoration: none;
	}

	.lua-related-card strong {
		display: block;
		margin-block-end: 0.2rem;
	}

	@media (max-width: 1180px) {
		.lua-stats,
		.lua-planned-grid,
		.lua-family-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.lua-toolbar-primary,
		.lua-docs-layout,
		.lua-explorer-grid {
			grid-template-columns: 1fr;
		}

		.lua-list-panel,
		.lua-docs-nav {
			position: static;
			inset-block-start: auto;
			max-height: none;
		}
	}

	@media (max-width: 760px) {
		.lua-hero,
		.lua-panel,
		.lua-stat-card {
			padding-block: 1.1rem;
			padding-inline: 1.1rem;
		}

		.lua-stats,
		.lua-family-grid,
		.lua-planned-grid,
		.lua-related-grid {
			grid-template-columns: 1fr;
		}

		.lua-family-card-head,
		.lua-detail-card-head,
		.lua-list-head,
		.lua-parameter-row,
		.lua-detail-hero {
			display: flex;
			flex-direction: column;
		}

		.lua-family-card-head span,
		.lua-detail-card-head span,
		.lua-list-head span {
			white-space: normal;
		}

		.lua-entry-card-top {
			flex-direction: column;
		}

		.lua-entry-card-metrics {
			justify-items: start;
		}

		.lua-signature-meta li {
			display: grid;
			gap: 0.2rem;
			grid-column: 1 / -1;
			grid-template-columns: 1fr;
		}

		.lua-signature-meta li > span:first-child,
		.lua-signature-meta li > strong,
		.lua-signature-meta li > span:last-child {
			padding-block-start: 0;
			border-block-start: none;
		}

		.lua-signature-meta li:first-child {
			padding-block-start: 0;
		}

		.lua-signature-meta li > strong,
		.lua-signature-meta li > span:last-child {
			text-align: left;
		}
	}

	:global(:root[data-theme="light"]) .lua-page {
		--lua-bg: linear-gradient(180deg, rgba(241, 248, 236, 0.95) 0%, rgba(247, 250, 243, 0.98) 100%);
		--lua-border: rgba(56, 85, 42, 0.16);
		--lua-copy: rgba(38, 51, 31, 0.82);
		--lua-highlight: #3f6f27;
		--lua-highlight-strong: #22430f;
		--lua-panel: rgba(255, 255, 255, 0.96);
	}

	:global(:root[data-theme="light"]) .lua-link,
	:global(:root[data-theme="light"]) .lua-list-panel,
	:global(:root[data-theme="light"]) .lua-detail-card,
	:global(:root[data-theme="light"]) .lua-planned-card,
	:global(:root[data-theme="light"]) .lua-family-card,
	:global(:root[data-theme="light"]) .lua-entry-card,
	:global(:root[data-theme="light"]) .lua-tab,
	:global(:root[data-theme="light"]) .lua-filter-chip,
	:global(:root[data-theme="light"]) .lua-docs-nav-card,
	:global(:root[data-theme="light"]) .lua-related-card,
	:global(:root[data-theme="light"]) .lua-search-field input,
	:global(:root[data-theme="light"]) .lua-sort-field select {
		background: rgba(255, 255, 255, 0.96);
	}
</style>
