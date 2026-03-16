<script>
	import { onMount, tick } from "svelte";

	import luaData from "../data/civ-lua-api.json";
	import { CURATED_EVENT_NAMES, CURATED_METHOD_NAMES } from "../data/luaQuickStarts.js";

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
	];
	const DOC_SECTION_SCROLL_OFFSET = 132;
	const docSectionElements = new Map();
	let detailPanelElement = $state(null);
	const LUA_PATTERN_SEE_ALSO = {
		"game-events:game-event-playerdoturn-72": [
			{
				type: "pattern",
				label: "Per-Turn City Scanner",
				note: "High-signal recipe companion when the hook is driving a recurring city loop or civ effect.",
				href: "/pattern-library?pattern=per-turn-city-scanner",
			},
			{
				type: "pattern",
				label: "SaveData Cooldown / Once-Per-City / Once-Per-Player",
				note: "Use this when the turn hook needs guards instead of firing the payload every pass.",
				href: "/pattern-library?pattern=savedata-cooldown-once-per-city-once-per-player",
			},
		],
		"game-events:game-event-canhavepromotion-5": [
			{
				type: "pattern",
				label: "Promotion Chain Setup",
				note: "Natural follow-up when the event is vetoing or staging a gated promotion chain.",
				href: "/pattern-library?pattern=promotion-chain-setup",
			},
		],
		"game-events:game-event-cityboughtplot-17": [
			{
				type: "pattern",
				label: "City Bought Plot Trigger",
				note: "Direct recipe companion for one-time rewards or tile payloads on purchased plots.",
				href: "/pattern-library?pattern=city-bought-plot-trigger",
			},
		],
		"methods:city-getnumbuilding-178": [
			{
				type: "pattern",
				label: "Dummy Building Scaffold",
				note: "Useful next read when the method is checking hidden marker buildings on a city.",
				href: "/pattern-library?pattern=dummy-building-scaffold",
			},
		],
		"methods:player-getcapitalcity-141": [
			{
				type: "pattern",
				label: "Holy City / Largest City Reward Resolver",
				note: "Good follow-up when capital lookup is only one fallback inside a wider reward-destination helper.",
				href: "/pattern-library?pattern=holy-city-largest-city-reward-resolver",
			},
		],
		"game-events:game-event-citycanconstruct-22": [
			{
				type: "pattern",
				label: "Requirements Gate Pattern",
				note: "Recipe companion for city-scoped construction veto logic and stacked eligibility checks.",
				href: "/pattern-library?pattern=requirements-gate-pattern",
			},
		],
		"game-events:game-event-playercanconstruct-62": [
			{
				type: "pattern",
				label: "Requirements Gate Pattern",
				note: "Recipe companion for empire-level construction gates and shared unlock checks.",
				href: "/pattern-library?pattern=requirements-gate-pattern",
			},
		],
	};
	const METHOD_SEARCH_EXAMPLES = ["AddNotification", "CanTrain", "UnitPromotions", "TechTypes", "Player"];
	const EVENT_SEARCH_EXAMPLES = ["BuildFinished", "PlayerCanTrain", "UnitPromotions", "Hook", "TechTypes"];

	const METHODS = luaData.methods.map((entry) => buildMethodEntry(entry));
	const GAME_EVENTS = luaData.gameEvents.map((entry) => buildGameEventEntry(entry));
	const METHOD_BY_ID = new Map(METHODS.map((entry) => [entry.id, entry]));
	const GAME_EVENT_BY_ID = new Map(GAME_EVENTS.map((entry) => [entry.id, entry]));
	const ENTRY_BY_KEY = new Map([...METHODS, ...GAME_EVENTS].map((entry) => [entry.entryKey, entry]));
	const CURATED_ENTRY_LINKS = [...new Set(CURATED_METHOD_NAMES.map((name) => `methods:${name}`)), ...new Set(CURATED_EVENT_NAMES.map((name) => `game-events:${name}`))]
		.map((key) => {
			const [datasetId, name] = key.split(":");
			const entry = datasetId === "methods" ? METHODS.find((item) => item.methodName === name) : GAME_EVENTS.find((item) => item.name === name);
			if (!entry) {
				return null;
			}
			return {
				id: `${entry.datasetId}:${entry.id}`,
				entryId: entry.id,
				datasetId: entry.datasetId,
				title: entry.heading,
				meta: entry.datasetId === "methods" ? entry.family : entry.scope || "GameEvent",
				supporting: entry.secondaryLabel,
				paramLabel: `${entry.parameterCount} ${entry.parameterCount === 1 ? "param" : "params"}`,
				schemaLabel: entry.schemaTables.length ? `${entry.schemaTables.length} schema` : "",
			};
		})
		.filter(Boolean);
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
	let pendingLuaDetailScroll = $state(false);
	let pendingLuaHistoryPush = $state(false);
	let luaHydrating = $state(true);
	let luaSearchInputEl = $state(null);

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
	const selectedCounterpartEntries = $derived.by(() => {
		if (!selectedEntry) {
			return [];
		}

		const matches =
			selectedEntry.entryKind === "method" ? GAME_EVENTS.filter((entry) => entry.name === selectedEntry.methodName) : METHODS.filter((entry) => entry.methodName === selectedEntry.name);

		return matches
			.filter((entry) => entry.id !== selectedEntry.id)
			.map((entry) => ({
				...entry,
				authoredFlags: buildEntryAuthoredFlags(entry),
			}))
			.sort((left, right) => right.authoredFlags.length - left.authoredFlags.length || left.title.localeCompare(right.title));
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
		const items = [...selectedEntry.seeAlso, ...(LUA_PATTERN_SEE_ALSO[selectedEntry.entryKey] || [])];
		const seenKeys = new Set();
		return items
			.map((item, index) => resolveSeeAlsoItem(item, index))
			.filter((item) => {
				if (!item) {
					return false;
				}
				const key = item.entryId ? `entry:${item.entryId}` : `href:${item.href}`;
				if (seenKeys.has(key)) {
					return false;
				}
				seenKeys.add(key);
				return true;
			});
	});
	const selectedEntryQuickLinks = $derived.by(() => {
		if (!selectedEntry) {
			return [];
		}
		const links = [];
		const seenHrefs = new Set();

		const appendLink = (link) => {
			if (!link?.href || seenHrefs.has(link.href)) {
				return;
			}
			seenHrefs.add(link.href);
			links.push(link);
		};

		for (const item of selectedSchemaTouchpoints.slice(0, 4)) {
			appendLink({
				id: `schema-${item.table}`,
				label: item.table,
				copy: item.sourceLabels[0] || item.notes[0] || "Schema table",
				href: item.href,
			});
		}

		for (const item of selectedSeeAlsoItems.slice(0, 2)) {
			appendLink({
				id: `link-${item.id}`,
				label: item.label,
				copy: item.copy,
				href: item.href,
			});
		}

		return links;
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
		return items;
	});
	const selectedEntryContentMeta = $derived.by(() => {
		if (!selectedEntry) {
			return [];
		}
		return [
			{ label: "Summary", value: selectedEntry.summary ? "Present" : "None" },
			{ label: "Gotchas", value: selectedEntry.gotchas.length ? String(selectedEntry.gotchas.length) : "None" },
			{ label: "See also", value: selectedSeeAlsoItems.length ? String(selectedSeeAlsoItems.length) : "None" },
		];
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
			if (section.id === "notes") {
				return selectedEntry.notes.length > 0;
			}
			if (section.id === "gotchas") {
				return selectedEntry.gotchas.length > 0;
			}
			if (section.id === "example") {
				return Boolean(selectedEntry.exampleCode);
			}
			if (section.id === "schema") {
				return selectedSchemaTouchpoints.length > 0;
			}
			if (section.id === "see-also") {
				return selectedSeeAlsoItems.length > 0;
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

		void (async () => {
			try {
				await applyLuaUrlStateFromLocation();
			} finally {
				luaUrlSyncReady = true;
				luaHydrating = false;
			}
		})();

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
			if (pendingLuaDetailScroll) {
				detailPanelElement?.scrollIntoView({
					behavior: "auto",
					block: "start",
				});
				pendingLuaDetailScroll = false;
			}
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
			exampleSummary: typeof entry.example?.summary === "string" ? entry.example.summary.trim() : "",
			exampleCode: typeof entry.example?.code === "string" ? entry.example.code.trim() : "",
			exampleLanguage: entry.example?.code ? entry.example?.language || "lua" : "",
			notes: normalizeStringList(entry.notes),
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
			exampleSummary: typeof entry.example?.summary === "string" ? entry.example.summary.trim() : "",
			exampleCode: typeof entry.example?.code === "string" ? entry.example.code.trim() : "",
			exampleLanguage: entry.example?.code ? entry.example?.language || "lua" : "",
			notes: normalizeStringList(entry.notes),
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
		const lines = ["-- Placeholder example. Replace with a snippet."];
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
		return ["-- Placeholder example. Replace with a listener.", `GameEvents.${entry.name}.Add(function(${args})`, `\t-- handle ${entry.name}`, "end)"].join("\n");
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
				for (const key of ["entryId", "entryKey", "ref", "label", "note"]) {
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

	function selectEntry(entryId, datasetId = activeDataset) {
		activeDataset = datasetId;
		selectedEntryId = entryId;
	}

	function revealEntry(entryId, datasetId = activeDataset) {
		searchQuery = "";
		searchMode = "all";
		familyFilter = "all";
		scopeFilter = "all";
		activeDataset = datasetId;
		selectedEntryId = entryId;
	}

	async function revealEntryAndScroll(entryId, datasetId = activeDataset) {
		revealEntry(entryId, datasetId);
		await tick();
		detailPanelElement?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
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

	function isTypingTarget(target) {
		return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
	}

	function focusPrimaryLuaSearch() {
		luaSearchInputEl?.focus();
		luaSearchInputEl?.select?.();
	}

	function handleWindowKeyDown(event) {
		if (isTypingTarget(event.target)) {
			return;
		}

		if (event.key === "f" || event.key === "F") {
			event.preventDefault();
			focusPrimaryLuaSearch();
			return;
		}

		if (event.key === "[") {
			event.preventDefault();
			selectAdjacentEntry(-1);
			return;
		}

		if (event.key === "]") {
			event.preventDefault();
			selectAdjacentEntry(1);
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

	function buildLuaEntryHref(entry) {
		if (!entry) {
			return "#";
		}
		if (typeof window === "undefined") {
			return `?dataset=${entry.datasetId}&entry=${entry.id}`;
		}
		return buildLuaUrl({
			...snapshotLuaUrlState(),
			dataset: entry.datasetId,
			entry: entry.id,
			section: "signature",
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

		const referencedEntry = resolveEntryReference(item.entryId || item.entryKey || item.ref);
		if (referencedEntry) {
			return {
				id: `entry-${referencedEntry.id}-${index}`,
				type: "entry",
				label: item.label || referencedEntry.title,
				copy: item.note || referencedEntry.secondaryLabel,
				entryId: referencedEntry.id,
				datasetId: referencedEntry.datasetId,
				href: buildLuaEntryHref(referencedEntry),
				surface: "entry",
			};
		}
		if (!item.href) {
			return null;
		}
		return {
			id: `${item.type || "link"}-${index}-${item.href}`,
			type: item.type || "link",
			label: item.label || item.href,
			copy: item.note || "Related reference",
			href: item.href,
			surface: item.type === "pattern" || item.href.startsWith("/pattern-library") ? "pattern" : "link",
		};
	}

	function buildEntryAuthoredFlags(entry) {
		const flags = [];
		if (entry.summary) {
			flags.push("Summary");
		}
		if (entry.gotchas.length > 0) {
			flags.push(`Gotchas ${entry.gotchas.length}`);
		}
		if (entry.seeAlso.length > 0) {
			flags.push(`See also ${entry.seeAlso.length}`);
		}
		return flags;
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
		pendingLuaDetailScroll = params.has("entry") || Boolean(nextSection);

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

<svelte:window onkeydown={handleWindowKeyDown} />

<section class="lua-page">
	<header class="lua-hero">
		<p class="lua-eyebrow">Scripting Reference</p>
		<h1>Lua API Explorer</h1>
		<p>Browse Civ V Lua methods and GameEvents, inspect signatures, parameters, notes, examples, and jump into related schema tables.</p>
	</header>

	{#if luaHydrating}
		<p class="status status-loading" role="status" aria-live="polite">
			<span class="status-spinner" aria-hidden="true"></span>
			<span>Loading Lua explorer...</span>
		</p>
	{:else}
		<section class="lua-panel">
			<div class="lua-section-head">
				<span class="lua-kicker">Quick Starts</span>
				<h2>Jump into the Lua entries modders use most often</h2>
				<p>These are some of the most used hooks so are great starting points for exploring the Lua API and wiring up your own mods.</p>
			</div>
			<div class="lua-launcher-grid">
				{#each CURATED_ENTRY_LINKS as entry (entry.id)}
					<button
						type="button"
						class={`lua-launcher-card ${selectedEntry?.id === entry.entryId && activeDataset === entry.datasetId ? "is-active" : ""}`}
						onclick={() => revealEntryAndScroll(entry.entryId, entry.datasetId)}
					>
						<div class="lua-launcher-card-head">
							<h3>{entry.title}</h3>
							<span class="lua-launcher-card-meta">{entry.meta}</span>
						</div>
					</button>
				{/each}
			</div>
		</section>

		<section class="lua-panel lua-panel--explorer">
			<div class="lua-toolbar">
				<div class="lua-toolbar-primary">
					<div class="lua-tab-row" role="tablist" aria-label="Lua datasets">
						{#each DATASET_TABS as tab (tab.id)}
							<button
								type="button"
								role="tab"
								aria-selected={activeDataset === tab.id}
								class={`lua-tab ${activeDataset === tab.id ? "is-active" : ""}`}
								onclick={() => setDataset(tab.id)}
							>
								{tab.label}
							</button>
						{/each}
					</div>

					<label class="lua-search-field">
						<span>Search the lua references</span>
						<input bind:this={luaSearchInputEl} type="search" bind:value={searchQuery} onkeydown={handleSearchKeyDown} placeholder={searchPlaceholder} />
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
							<button type="button" class={`lua-filter-chip lua-filter-chip--toggle ${familyFilter === "all" ? "is-active" : ""}`} onclick={() => (familyFilter = "all")}>
								All
								<span>{methodResults.filter((entry) => entry.matchesQuery).length}</span>
							</button>
							{#each familyCounts as family (family.name)}
								<button type="button" class={`lua-filter-chip lua-filter-chip--toggle ${familyFilter === family.name ? "is-active" : ""}`} onclick={() => (familyFilter = family.name)}>
									{family.name}
									<span>{family.count}</span>
								</button>
							{/each}
						</div>
					{:else}
						<div class="lua-filter-group" role="group" aria-label="GameEvent scopes">
							<button type="button" class={`lua-filter-chip lua-filter-chip--toggle ${scopeFilter === "all" ? "is-active" : ""}`} onclick={() => (scopeFilter = "all")}>
								All scopes
								<span>{gameEventResults.filter((entry) => entry.matchesQuery).length}</span>
							</button>
							{#each scopeCounts as scope (scope.name)}
								<button type="button" class={`lua-filter-chip lua-filter-chip--toggle ${scopeFilter === scope.name ? "is-active" : ""}`} onclick={() => (scopeFilter = scope.name)}>
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
									<button type="button" class="lua-link lua-link--inline" onclick={() => revealEntry(entry.id, entry.datasetId)}>{entry.heading}</button>
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
									<!-- <p class="lua-entry-card-copy">{entry.secondaryLabel}</p>
								{#if entry.summary}
									<p class="lua-entry-summary">{entry.summary}</p>
								{/if} -->
									<!-- {#if entry.summary || entry.gotchas.length > 0 || entry.seeAlso.length > 0}
									<div class="lua-entry-property-strip" aria-label="Entry fields">
										{#if entry.summary}
											<span class="lua-entry-property">Summary</span>
										{/if}
										{#if entry.gotchas.length > 0}
											<span class="lua-entry-property">Gotchas {entry.gotchas.length}</span>
										{/if}
										{#if entry.seeAlso.length > 0}
											<span class="lua-entry-property">See also {entry.seeAlso.length}</span>
										{/if}
									</div>
								{/if} -->
								</button>
							{/each}
						{/if}
					</div>
				</aside>

				{#if selectedEntry}
					<section class="lua-detail-panel" bind:this={detailPanelElement} aria-label="Selected entry details">
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
								{#if selectedEntry.summary}
									<span class="lua-metric-chip lua-metric-chip--authored">summary</span>
								{/if}
								{#if selectedEntry.gotchas.length > 0}
									<span class="lua-metric-chip lua-metric-chip--authored">gotchas</span>
								{/if}
								<!-- {#if selectedSeeAlsoItems.length > 0}
								<span class="lua-metric-chip lua-metric-chip--authored">see also {selectedSeeAlsoItems.length}</span>
							{/if} -->
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

								{#if selectedEntry.notes.length > 0}
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
								{/if}

								{#if selectedEntry.gotchas.length > 0}
									<section id="lua-doc-gotchas" class="lua-detail-card lua-doc-section" use:trackDocSection={"gotchas"}>
										<div class="lua-detail-card-head">
											<h3>Gotchas</h3>
											<!-- <span>{selectedEntry.gotchas.length}</span> -->
										</div>
										<ul class="lua-note-list">
											{#each selectedEntry.gotchas as gotcha (`${selectedEntry.entryKey}-${gotcha}`)}
												<li>{gotcha}</li>
											{/each}
										</ul>
									</section>
								{/if}

								{#if selectedEntry.exampleCode}
									<section id="lua-doc-example" class="lua-detail-card lua-doc-section" use:trackDocSection={"example"}>
										<div class="lua-detail-card-head">
											<h3>Example</h3>
										</div>
										{#if selectedEntry.exampleSummary}
											<p class="lua-card-copy">{selectedEntry.exampleSummary}</p>
										{/if}
										<pre class="lua-doc-example"><code>{selectedEntry.exampleCode}</code></pre>
									</section>
								{/if}

								{#if selectedSchemaTouchpoints.length > 0}
									<section id="lua-doc-schema" class="lua-detail-card lua-doc-section" use:trackDocSection={"schema"}>
										<div class="lua-detail-card-head">
											<h3>Schema touchpoints</h3>
											<span>{selectedSchemaTouchpoints.length}</span>
										</div>
										<p class="lua-card-copy">These tables are the strongest schema-side matches for the current signature, with parameter context and any notes when available.</p>
										<div class="lua-schema-grid">
											{#each selectedSchemaTouchpoints as touchpoint (touchpoint.table)}
												<a class="lua-schema-card lua-schema-card--link" href={touchpoint.href}>
													<div class="lua-schema-card-head">
														<span class="lua-link lua-link--inline lua-schema-pill">{touchpoint.table}</span>
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
												</a>
											{/each}
										</div>
									</section>
								{/if}

								{#if selectedSeeAlsoItems.length > 0}
									<section id="lua-doc-see-also" class="lua-detail-card lua-doc-section" use:trackDocSection={"see-also"}>
										<div class="lua-detail-card-head">
											<h3>See also</h3>
											<!-- <span>{selectedSeeAlsoItems.length}</span> -->
										</div>
										<div class="lua-see-also-grid">
											{#each selectedSeeAlsoItems as item (item.id)}
												{#if item.entryId}
													<button type="button" class="lua-see-also-card" onclick={() => revealEntry(item.entryId, item.datasetId)}>
														<div class="lua-see-also-head">
															<strong>{item.label}</strong>
														</div>
														<p>{item.copy}</p>
													</button>
												{:else}
													<a class={`lua-see-also-card lua-see-also-card--link ${item.surface === "pattern" ? "is-pattern" : ""}`} href={item.href}>
														<div class="lua-see-also-head">
															<strong>{item.label}</strong>
															{#if item.surface === "pattern"}
																<span class="lua-see-also-kind">Pattern</span>
															{/if}
														</div>
														<p>{item.copy}</p>
													</a>
												{/if}
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
								{#if selectedCounterpartEntries.length > 0}
									<div class="lua-docs-nav-card">
										<span class="lua-kicker">Other Surfaces</span>
										<div class="lua-surface-list">
											{#each selectedCounterpartEntries as entry (entry.entryKey)}
												<button type="button" class="lua-see-also-card" onclick={() => revealEntry(entry.id, entry.datasetId)}>
													<div class="lua-see-also-head">
														<strong>{entry.title}</strong>
														<span class="lua-see-also-kind">{entry.entryKind === "method" ? "Method" : "GameEvents"}</span>
													</div>
													<p>{entry.secondaryLabel}</p>
												</button>
											{/each}
										</div>
									</div>
								{/if}
								<!-- {#if selectedEntryContentMeta.length > 0}
								<div class="lua-docs-nav-card">
									<span class="lua-kicker">Authored Fields</span>
									<dl class="lua-quick-meta">
										{#each selectedEntryContentMeta as item (item.label)}
											<div>
												<dt>{item.label}</dt>
												<dd>{item.value}</dd>
											</div>
										{/each}
									</dl>
								</div>
							{/if} -->
								<!-- {#if selectedEntryQuickMeta.length > 0}
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
							{/if} -->
								{#if selectedEntryQuickLinks.length > 0}
									<div class="lua-docs-nav-card">
										<span class="lua-kicker">Quick Links</span>
										<div class="lua-docs-nav-links">
											{#each selectedEntryQuickLinks as link (link.id)}
												<a class="lua-link lua-link--inline" href={link.href} title={link.copy}>{link.label}</a>
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
	{/if}
</section>

<style>
	:global(:root[data-theme="light"]) .lua-page {
		--lua-bg: linear-gradient(180deg, rgba(241, 248, 236, 0.95) 0%, rgba(247, 250, 243, 0.98) 100%);
		--lua-border: rgba(56, 85, 42, 0.16);
		--lua-copy: rgba(38, 51, 31, 0.82);
		--lua-highlight: #3f6f27;
		--lua-highlight-strong: #22430f;
		--lua-panel: rgba(255, 255, 255, 0.96);
		--lua-schema-border: rgba(37, 67, 96, 0.16);
		--lua-schema-highlight: #1c5a8f;
		--lua-schema-highlight-strong: #123a59;
		--lua-schema-panel: rgba(255, 255, 255, 0.96);
	}
	.lua-page {
		display: grid;
		gap: 1.15rem;
		--lua-bg: linear-gradient(145deg, color-mix(in srgb, var(--panel-bg) 82%, black) 0%, color-mix(in srgb, var(--panel-bg) 40%, #20301b 40%) 100%);
		--lua-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #638f4f 28%);
		--lua-copy: color-mix(in srgb, currentColor 72%, transparent);
		--lua-highlight: #b7ef84;
		--lua-highlight-strong: #ebffd6;
		--lua-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.88)) 86%, #20301b 14%);
		--lua-schema-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #35658c 28%);
		--lua-schema-highlight: #8dc7ff;
		--lua-schema-highlight-strong: #d6ecff;
		--lua-schema-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, #11263a 10%);
		--scrollbar-corner: color-mix(in srgb, var(--lua-panel) 88%, #11180e 12%);
		--scrollbar-thumb: color-mix(in srgb, var(--lua-highlight) 78%, #11180e 22%);
		--scrollbar-thumb-hover: color-mix(in srgb, var(--lua-highlight) 88%, white 12%);
		--scrollbar-track: color-mix(in srgb, var(--lua-panel) 82%, #11180e 18%);
	}

	.lua-hero {
		background: var(--lua-bg);
	}

	.lua-hero h1,
	.lua-section-head h2,
	.lua-launcher-card h3,
	.lua-entry-card h3,
	.lua-detail-card h3,
	.lua-detail-hero h2,
	.lua-list-head h2 {
		margin: 0;
	}

	.lua-hero p,
	.lua-section-head p,
	.lua-entry-card p,
	.lua-card-copy,
	.lua-empty,
	.lua-parameter-row p,
	.lua-note-list li,
	.lua-see-also-card p {
		color: var(--lua-copy);
		line-height: 1.45;
		text-align: left;
		margin: 0;
	}

	.lua-hero,
	.lua-panel {
		padding-block: 1.3rem;
		padding-inline: 1.3rem;
	}

	.lua-hero,
	.lua-panel,
	.lua-docs-nav-card {
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
		border: 1px solid var(--lua-border);
		border-radius: 1.5rem;
	}

	.lua-panel,
	.lua-docs-nav-card {
		background: var(--lua-panel);
	}

	.lua-empty-note,
	.lua-parameter-row p,
	.lua-card-copy {
		font-size: 0.88rem;
	}

	.lua-see-also-card.is-pattern p,
	.lua-see-also-card.is-pattern .lua-see-also-kind {
		color: color-mix(in srgb, #f5d36a 82%, white 18%);
	}

	.lua-eyebrow,
	.lua-kicker {
		color: var(--lua-highlight);
		text-transform: uppercase;
		font-size: 0.76rem;
		letter-spacing: 0.16em;
		margin-inline: 0;
		margin-block-start: 0;
		margin-block-end: 0.45rem;
	}

	.lua-filter-chip span {
		inline-size: fit-content;
		min-inline-size: 2rem;
		height: 1.7rem;
		display: inline-grid;
		place-items: center;
		font-size: 0.8rem;
		text-box: trim-both;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		padding-inline: 0.5rem;
	}

	.lua-launcher-card-meta,
	.lua-detail-card-head span,
	.lua-list-head span {
		color: var(--lua-copy);
		white-space: nowrap;
	}

	.lua-launcher-foot span {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 999px;
		padding-block: 0.16rem;
		padding-inline: 0.45rem;
	}

	.lua-recent-group span {
		text-transform: uppercase;
	}

	.lua-schema-card-head span {
		color: color-mix(in srgb, var(--lua-schema-highlight) 66%, var(--lua-copy) 34%);
		font-size: 0.76rem;
	}

	.lua-signature-meta li > span:first-child {
		color: var(--lua-copy);
	}

	.lua-signature-meta li > span:first-child,
	.lua-signature-meta li > strong,
	.lua-signature-meta li > span:last-child {
		border-block-start: 1px solid rgba(255, 255, 255, 0.08);
		padding-block-start: 0.45rem;
	}

	.lua-signature-meta li > span:last-child {
		inline-size: 100%;
		justify-self: start;
		color: var(--lua-copy);
		text-align: left;
	}

	.lua-signature-meta li:first-child > span:first-child,
	.lua-signature-meta li:first-child > strong,
	.lua-signature-meta li:first-child > span:last-child {
		border-block-start: none;
		padding-block-start: 0;
	}

	.lua-toolbar-label,
	.lua-search-field span,
	.lua-sort-field span {
		color: var(--lua-copy);
		font-size: 0.9rem;
	}

	.lua-entry-card-top > div:first-child {
		min-inline-size: 0;
		display: block;
	}

	.lua-section-head {
		margin-block-end: 0.75rem;
	}

	.lua-launcher-grid,
	.lua-see-also-grid {
		display: grid;
		gap: 0.85rem;
	}

	.lua-launcher-grid,
	.lua-see-also-grid {
		grid-template-columns: repeat(5, minmax(6rem, 1fr));
	}

	.lua-launcher-card-head,
	.lua-detail-card-head,
	.lua-list-head {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.lua-launcher-card-head,
	.lua-see-also-head {
		inline-size: 100%;
		justify-content: space-between;
		align-items: center;
	}

	.lua-entry-card h3 {
		white-space: nowrap;
		font-size: 1.05rem;
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lua-launcher-card h3 {
		font-size: 0.9rem;
		text-box: trim-both cap alphabetic;
	}

	.lua-launcher-card h3,
	.lua-entry-card h3,
	.lua-detail-card h3,
	.lua-see-also-card strong {
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.lua-launcher-card-meta {
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
	}

	.lua-toolbar {
		display: grid;
		gap: 0.8rem;
		margin-block-end: 0.85rem;
	}

	.lua-toolbar-primary {
		grid-template-columns: auto minmax(0, 1fr) minmax(13rem, 15rem);
		align-items: end;
	}

	.lua-toolbar-primary,
	.lua-toolbar-secondary {
		display: grid;
		gap: 0.8rem;
	}

	.lua-tab-row {
		display: inline-flex;
		flex-wrap: nowrap;
		align-items: stretch;
		gap: 0;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--lua-border);
		border-radius: 1.25rem;
		overflow: hidden;
	}

	.lua-tab-row,
	.lua-filter-group,
	.lua-entry-tags,
	.lua-detail-chips,
	.lua-parameter-flags,
	.lua-recent-list,
	.lua-docs-nav-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	:global(:root[data-theme="light"]) .lua-link,
	:global(:root[data-theme="light"]) .lua-list-panel,
	:global(:root[data-theme="light"]) .lua-detail-card,
	:global(:root[data-theme="light"]) .lua-launcher-card,
	:global(:root[data-theme="light"]) .lua-entry-card,
	:global(:root[data-theme="light"]) .lua-tab,
	:global(:root[data-theme="light"]) .lua-filter-chip,
	:global(:root[data-theme="light"]) .lua-docs-nav-card,
	:global(:root[data-theme="light"]) .lua-see-also-card,
	:global(:root[data-theme="light"]) .lua-search-field input,
	:global(:root[data-theme="light"]) .lua-sort-field select {
		background: rgba(255, 255, 255, 0.96);
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

	.lua-search-field,
	.lua-sort-field,
	.lua-recent-group {
		display: grid;
		gap: 0.45rem;
	}

	.lua-link {
		display: inline-flex;
		align-items: center;
		color: var(--lua-highlight-strong);
		text-decoration: none;
		font: inherit;
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

	.lua-link,
	.lua-tab,
	.lua-filter-chip,
	.lua-launcher-card,
	.lua-entry-card,
	.lua-see-also-card {
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease;
	}

	.lua-schema-card .lua-link {
		color: var(--lua-schema-highlight-strong);
		background: color-mix(in srgb, var(--lua-schema-panel) 76%, transparent);
		border-color: var(--lua-schema-border);
	}

	.lua-schema-card .lua-link:hover {
		color: white;
		background: color-mix(in srgb, var(--lua-schema-highlight) 16%, var(--lua-schema-panel) 84%);
		border-color: color-mix(in srgb, var(--lua-schema-highlight) 74%, white 26%);
	}

	.lua-link--inline {
		padding-block: 0.42rem;
		padding-inline: 0.68rem;
	}

	.lua-explorer-grid {
		display: grid;
		grid-template-columns: minmax(17rem, 20rem) minmax(0, 1fr);
		gap: 0.85rem;
	}

	.lua-launcher-card,
	.lua-entry-card,
	.lua-detail-card,
	.lua-list-panel,
	.lua-see-also-card,
	.lua-docs-nav-card {
		border-radius: 1.2rem;
	}

	.lua-launcher-card,
	.lua-entry-card,
	.lua-detail-card,
	.lua-list-panel,
	.lua-see-also-card,
	.lua-docs-nav-card {
		padding-block: 0.95rem;
		padding-inline: 0.95rem;
	}

	.lua-list-panel {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid var(--lua-border);
	}

	.lua-list-panel {
		position: sticky;
		inset-block-start: 1rem;
		min-block-size: 0;
		max-block-size: calc(100dvh - 2rem);
		align-self: stretch;
		overflow: hidden;
	}

	.lua-entry-list {
		min-block-size: 0;
		flex: 1 1 auto;
		align-content: start;
		gap: 0.5rem;
		padding-block-start: 0.5rem;
		padding-inline-end: 0.15rem;
		overflow: auto;
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

	.lua-empty-state {
		display: grid;
		justify-items: start;
		align-content: start;
		gap: 0.55rem;
	}

	.lua-empty-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.lua-entry-card-top {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.55rem;
	}

	.lua-entry-path {
		color: var(--lua-copy);
		font-size: 0.76rem;
		line-height: 1.3;
		margin: 0;
	}

	.lua-entry-path {
		opacity: 0.9;
		font-family: "SFMono-Regular", "JetBrains Mono", ui-monospace, monospace;
		white-space: nowrap;
		font-size: 0.7rem;
		margin-block-start: 0.12rem;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lua-entry-card-metrics {
		display: flex;
		flex: 0 0 auto;
		flex-direction: column;
		justify-items: end;
		gap: 0.16rem;
		color: var(--lua-copy);
		white-space: nowrap;
		font-size: 0.72rem;
	}

	.lua-entry-summary {
		display: -webkit-box;
		color: var(--lua-highlight-strong);
		font-size: 0.77rem;
		line-height: 1.35;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	.lua-entry-property-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.lua-entry-property {
		display: inline-flex;
		align-items: center;
		font-size: 0.69rem;
		background: rgba(183, 239, 132, 0.12);
		border: 1px solid rgba(183, 239, 132, 0.18);
		border-radius: 999px;
		padding-block: 0.2rem;
		padding-inline: 0.48rem;
	}

	.lua-detail-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.lua-detail-hero {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.8rem;
		background: linear-gradient(135deg, rgba(183, 239, 132, 0.11), rgba(255, 255, 255, 0.02));
		border-radius: 1.2rem;
		padding-block: 0.95rem;
		padding-inline: 1rem;
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

	.lua-detail-hero-copy {
		display: grid;
		gap: 0.7rem;
	}

	.lua-detail-match-summary {
		display: grid;
		gap: 0.3rem;
	}

	.lua-detail-chips,
	.lua-parameter-flags,
	.lua-entry-tags {
		align-items: start;
	}

	.lua-entry-tags {
		gap: 0.35rem;
	}

	.lua-metric-chip,
	.lua-tag {
		display: inline-flex;
		align-items: center;
		font-size: 0.74rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		padding-block: 0.3rem;
		padding-inline: 0.54rem;
	}

	.lua-detail-chips {
		align-content: start;
		align-self: start;
	}

	.lua-metric-chip--authored {
		color: var(--lua-highlight-strong);
		background: rgba(183, 239, 132, 0.14);
	}

	.lua-docs-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(15rem, 18rem);
		gap: 0.85rem;
	}

	.lua-docs-article {
		display: grid;
		gap: 1.15rem;
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

	.lua-doc-section {
		scroll-margin-block-start: 1.5rem;
	}

	.lua-signature-meta {
		display: grid;
		grid-template-columns: minmax(10rem, 1fr) minmax(8rem, 9rem) minmax(10rem, max-content);
		row-gap: 0.45rem;
		column-gap: 1rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.lua-signature-meta li {
		display: contents;
	}

	.lua-signature-meta li > strong {
		inline-size: 100%;
		justify-self: start;
		color: var(--lua-highlight-strong);
		font-size: 0.98rem;
		font-weight: 700;
		text-align: left;
	}

	.lua-parameter-row,
	.lua-note-list li {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.8rem;
		border-block-start: 1px solid rgba(255, 255, 255, 0.08);
		padding-block-start: 0.45rem;

		&:first-child {
			border-block-start: none;
			padding-block-start: 0;
		}
	}

	.lua-see-also-card.is-pattern strong {
		color: #fff1bc;
	}

	.lua-see-also-head strong {
		margin: 0;
	}

	.lua-tag--optional {
		color: var(--lua-highlight-strong);
		background: rgba(183, 239, 132, 0.14);
	}

	.lua-doc-example {
		color: var(--lua-highlight-strong);
		white-space: pre-wrap;
		font-size: 0.88rem;
		line-height: 1.55;
		background: rgba(0, 0, 0, 0.22);
		border-radius: 1rem;
		padding-block: 0.9rem;
		padding-inline: 1rem;
		margin: 0;
		overflow: auto;
	}

	.lua-schema-grid {
		display: grid;
		gap: 0.75rem;
	}

	.lua-schema-card {
		display: grid;
		gap: 0.45rem;
		background: color-mix(in srgb, var(--lua-schema-panel) 86%, transparent);
		box-shadow: inset 0 1px 0 color-mix(in srgb, var(--lua-schema-highlight) 12%, transparent);
		border: 1px solid var(--lua-schema-border);
		border-radius: 1rem;
		padding-block: 0.8rem;
		padding-inline: 0.85rem;
	}

	.lua-schema-card--link {
		color: inherit;
		text-decoration: none;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease;
	}

	.lua-schema-card--link:hover {
		background: color-mix(in srgb, var(--lua-schema-highlight) 10%, var(--lua-schema-panel) 90%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--lua-schema-highlight) 18%, transparent),
			0 12px 28px rgba(0, 0, 0, 0.16);
		border-color: color-mix(in srgb, var(--lua-schema-highlight) 74%, white 26%);
		transform: translateY(-1px);
	}

	.lua-schema-card-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.55rem;
	}

	.lua-schema-pill {
		font-size: 0.95rem !important;
		cursor: inherit;
		pointer-events: none;
	}

	.lua-see-also-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.lua-launcher-card,
	.lua-entry-card,
	.lua-tab,
	.lua-filter-chip,
	.lua-see-also-card {
		font: inherit;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--lua-border);
		cursor: pointer;
	}

	.lua-launcher-card,
	.lua-see-also-card {
		display: grid;
		justify-items: start;
		align-content: start;
		gap: 0.75rem;
		text-align: left;
	}

	.lua-launcher-card.is-active,
	.lua-entry-card.is-active,
	.lua-tab.is-active,
	.lua-filter-chip.is-active,
	.lua-launcher-card:hover,
	.lua-entry-card:hover,
	.lua-see-also-card:hover {
		background: rgba(183, 239, 132, 0.11) !important;
		border-color: color-mix(in srgb, var(--lua-highlight) 70%, white 30%) !important;
		transform: translateY(-1px);
	}

	.lua-see-also-card {
		display: grid;
		gap: 0.55rem;
		text-align: left;
	}

	.lua-see-also-card.is-pattern {
		color: #f5d36a;
		background: color-mix(in srgb, var(--lua-panel) 80%, #3b2810 20%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #f5d36a 10%, transparent),
			0 12px 30px color-mix(in srgb, black 82%, transparent);
		border-color: color-mix(in srgb, var(--lua-border) 58%, #b48922 42%);
	}

	.lua-see-also-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.65rem;
	}

	.lua-see-also-kind {
		color: var(--lua-copy);
		white-space: nowrap;
		font-size: 0.7rem;
		background: rgba(255, 255, 255, 0.07);
		border-radius: 999px;
		padding-block: 0.2rem;
		padding-inline: 0.5rem;
	}

	.lua-docs-nav {
		position: sticky;
		inset-block-start: 1rem;
		max-block-size: calc(100dvh - 2rem);
		display: grid;
		align-self: start;
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

	.lua-docs-nav-link:hover {
		color: white;
		background: rgba(183, 239, 132, 0.09);
		border-color: color-mix(in srgb, var(--lua-highlight) 56%, white 24%);
	}

	.lua-entry-card {
		block-size: fit-content;
		min-inline-size: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		text-align: left;
		border-radius: 0.8rem;
		padding-block: 0.5rem;
		padding-inline: 0.75rem;
		overflow: hidden;
	}

	.lua-filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.88rem;
		border-radius: 999px;
		padding-block: 0.48rem;
		padding-inline: 0.72rem;
	}

	.lua-filter-chip--toggle {
		background: transparent;
		border: 1px solid transparent;
		border-radius: 999px;
		padding-block: 0.42rem;
		padding-inline: 0.7rem;
		transform: none;

		&:hover {
			background: rgba(141, 199, 255, 0.08);
			border-color: transparent;
			transform: none;
		}

		&.is-active {
			background: rgba(141, 199, 255, 0.14);
			border-color: color-mix(in srgb, var(--lua-highlight) 70%, white 30%);
			transform: none;
		}

		& span {
			background: rgba(255, 255, 255, 0.06);
		}

		&.is-active span {
			background: rgba(141, 199, 255, 0.18);
		}
	}

	.lua-launcher-card {
		min-inline-size: 0;
		gap: 0.55rem;
		text-align: left;
		background: linear-gradient(180deg, color-mix(in srgb, rgba(255, 255, 255, 0.03) 70%, #10271d 30%) 0%, rgba(255, 255, 255, 0.02) 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
		border-radius: 0.95rem;
		border-color: color-mix(in srgb, var(--lua-border) 72%, #2f6b53 28%);
		padding-block: 0.82rem;
		padding-inline: 0.82rem;
	}

	.lua-launcher-foot {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		color: var(--lua-copy);
		font-size: 0.75rem;
	}

	.lua-launcher-kind {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		color: var(--lua-highlight-strong);
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: color-mix(in srgb, rgba(0, 0, 0, 0.3) 72%, #173526 28%);
		border: 1px solid color-mix(in srgb, var(--lua-highlight) 44%, rgba(255, 255, 255, 0.18));
		border-radius: 999px;
		padding-block: 0.2rem;
		padding-inline: 0.5rem;
	}

	.lua-launcher-kind.is-event {
		background: color-mix(in srgb, rgba(0, 0, 0, 0.3) 76%, #24301b 24%);
		border-color: color-mix(in srgb, var(--lua-border) 72%, #8aa85a 28%);
	}

	.lua-see-also-card--link {
		color: inherit;
		text-decoration: none;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease,
			color 140ms ease;
	}

	.lua-see-also-card--link.is-pattern:hover {
		background: color-mix(in srgb, #f5d36a 10%, color-mix(in srgb, var(--lua-panel) 80%, #3b2810 20%) 90%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #fff1bc 18%, transparent),
			0 18px 38px color-mix(in srgb, black 78%, transparent);
		border-color: color-mix(in srgb, var(--lua-border-strong) 48%, #ffd976 52%);
		transform: translateY(-1px);
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

	@media (max-width: 1180px) {
		.lua-launcher-grid {
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
			max-height: none;
			inset-block-start: auto;
		}
	}

	@media (max-width: 760px) {
		.lua-hero,
		.lua-panel {
			padding-block: 1.1rem;
			padding-inline: 1.1rem;
		}

		.lua-launcher-grid,
		.lua-see-also-grid {
			grid-template-columns: 1fr;
		}

		.lua-launcher-card-head,
		.lua-detail-card-head,
		.lua-list-head,
		.lua-parameter-row,
		.lua-detail-hero {
			display: flex;
			flex-direction: column;
		}

		.lua-launcher-card-meta,
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
</style>
