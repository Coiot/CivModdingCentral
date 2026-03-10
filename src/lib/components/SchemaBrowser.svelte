<script>
	import { onMount, tick } from "svelte";

	import schemaData from "../generated/civ-schema.json";

	const numberFormatter = new Intl.NumberFormat("en-US");
	const QUICK_STARTS = [
		{
			tableName: "Buildings",
			label: "Buildings",
			copy: "High-density gameplay table with a large companion surface for yields, classes, flavors, prerequisites, and free content hooks.",
		},
		{
			tableName: "Units",
			label: "Units",
			copy: "Strong place to inspect promotion links, class relationships, AI roles, art hooks, and prerequisite wiring before building generators.",
		},
		{
			tableName: "Civilizations",
			label: "Civilizations",
			copy: "Identity-level content entry point for colors, text keys, icons, and the side tables that make full civ packages actually work.",
		},
		{
			tableName: "Improvements",
			label: "Improvements",
			copy: "Useful for terrain-aware yields, route interactions, build actions, and the side tables that usually get touched with worker and tile changes.",
		},
		{
			tableName: "Technologies",
			label: "Technologies",
			copy: "Core progression surface for prerequisite chains, unlock tables, and common lookups used by both schema and Lua tooling.",
		},
		{
			tableName: "Traits",
			label: "Traits",
			copy: "Compact but high-value table for civilization package design, especially when cross-checking uniques and trait-driven effect buckets.",
		},
	];
	const TABLE_PREFIX_MAP = {
		Buildings: ["Building"],
		Units: ["Unit"],
		Civilizations: ["Civilization"],
		Leaders: ["Leader"],
		Policies: ["Policy"],
		Technologies: ["Tech", "Technology"],
		Traits: ["Trait"],
		Resources: ["Resource"],
		Improvements: ["Improvement"],
		Beliefs: ["Belief"],
		Resolutions: ["Resolution", "League"],
	};
	const CATEGORY_DEFS = [
		{
			id: "all",
			label: "All",
			match: () => true,
		},
		{
			id: "civs",
			label: "Civs & leaders",
			match: (name) => /^(Civilization|Leader|Trait|Policy|Belief|Religion|Minor)/.test(name),
		},
		{
			id: "economy",
			label: "Economy & growth",
			match: (name) => /^(Building|Improvement|Resource|Yield|Specialist|Process|Hurry|Route|Builds?$)/.test(name),
		},
		{
			id: "military",
			label: "Units & combat",
			match: (name) => /^(Unit|Promotion|UnitAI|UnitCombat|Domain|Formation|Mission|Operation|Automate|Command|SpecialUnit|MultiUnit)/.test(name),
		},
		{
			id: "world",
			label: "World & map",
			match: (name) => /^(Map|Terrain|Feature|Area|Plot|River|Natural|Goody|Climate)/.test(name),
		},
		{
			id: "diplomacy",
			label: "Diplomacy & victory",
			match: (name) => /^(AI|Diplomacy|League|Resolution|Deal|Attitude|Victory|Handicap)/.test(name),
		},
		{
			id: "presentation",
			label: "Art, UI, text",
			match: (name) => /^(ArtDefine|Audio|Animation|Icon|Color|PlayerColor|Language|Concept|Interface|Notification|Tutorial)/.test(name),
		},
		{
			id: "systems",
			label: "Tech & systems",
			match: (name) => /^(Tech|Technology|Era|GameSpeed|Calendar|GameOption|MPOption|Project|PolicyBranch|Flavor|Defines|Global)/.test(name),
		},
	];

	const SEARCH_MODE_DEFS = [
		{ id: "all", label: "All" },
		{ id: "tables", label: "Tables" },
		{ id: "rows", label: "Rows" },
		{ id: "columns", label: "Columns" },
		{ id: "relationships", label: "Refs" },
	];
	const TABLE_SORT_DEFS = [
		{ id: "best", label: "Best match" },
		{ id: "az", label: "A-Z" },
		{ id: "rows", label: "Most rows" },
		{ id: "columns", label: "Most columns" },
		{ id: "refs", label: "Most refs" },
	];
	const DETAIL_TAB_DEFS = [
		{ id: "rows", label: "Rows" },
		{ id: "columns", label: "Columns" },
		{ id: "relationships", label: "Relationships" },
		{ id: "companions", label: "Companions" },
	];
	const EMPTY_SEARCH_EXAMPLES = ["archer", "PrereqTech", "Language_en_US", "BuildingClass", "PROMOTION_DRILL_1"];
	const TABLES = schemaData.tables.map((table) => ({
		...table,
		categoryId: resolveCategoryId(table.name),
		companionPrefixes: TABLE_PREFIX_MAP[table.name] || [table.name.replace(/s$/, "")],
	}));
	const TABLE_BY_NAME = new Map(TABLES.map((table) => [table.name, table]));
	const AVERAGE_COLUMNS_PER_TABLE = schemaData.stats.tableCount ? Math.round((schemaData.stats.columnCount / schemaData.stats.tableCount) * 10) / 10 : 0;
	const AVERAGE_ROWS_PER_TABLE = schemaData.stats.tableCount ? Math.round((schemaData.stats.rowCount / schemaData.stats.tableCount) * 10) / 10 : 0;
	const LARGEST_TABLES = schemaData.highlights.largestTables.slice(0, 6);
	const WIDEST_TABLES = schemaData.highlights.widestTables.slice(0, 6);
	const LINKED_TABLES = schemaData.highlights.linkedTables.slice(0, 6);
	const ROW_MATCH_LIMIT = 3;
	const SECTION_LIMITS = {
		outgoing: 14,
		incoming: 14,
		companions: 8,
	};
	const QUERY_LOGIC_DEFS = [
		{ id: "and", label: "All conditions (AND)" },
		{ id: "or", label: "Any condition (OR)" },
	];
	const QUERY_OPERATOR_DEFS = [
		{ id: "contains", label: "contains" },
		{ id: "equals", label: "equals" },
		{ id: "notEquals", label: "does not equal" },
		{ id: "startsWith", label: "starts with" },
		{ id: "endsWith", label: "ends with" },
		{ id: "gt", label: ">" },
		{ id: "gte", label: ">=" },
		{ id: "lt", label: "<" },
		{ id: "lte", label: "<=" },
		{ id: "isEmpty", label: "is empty" },
		{ id: "isNotEmpty", label: "is not empty" },
	];
	const QUERY_LIMIT_DEFS = [
		{ id: "all", label: "All rows" },
		{ id: "50", label: "50 rows" },
		{ id: "100", label: "100 rows" },
		{ id: "250", label: "250 rows" },
		{ id: "500", label: "500 rows" },
		{ id: "1000", label: "1000 rows" },
	];
	const QUERY_SORT_DIRECTION_DEFS = [
		{ id: "asc", label: "Ascending" },
		{ id: "desc", label: "Descending" },
	];
	const QUERY_OPERATORS_WITHOUT_VALUE = new Set(["isEmpty", "isNotEmpty"]);
	const QUERY_OPERATOR_BY_ID = new Map(QUERY_OPERATOR_DEFS.map((operator) => [operator.id, operator]));
	const rowSearchBlobCache = new Map();
	const tableCardElements = new Map();

	let searchQuery = $state("");
	let searchMode = $state("all");
	let tableSort = $state("best");
	let categoryFilter = $state("all");
	let selectedTableName = $state("Buildings");
	let detailTab = $state("columns");
	let columnFilter = $state("");
	let rowFilter = $state("");
	let outgoingExpanded = $state(false);
	let incomingExpanded = $state(false);
	let companionsExpanded = $state(false);
	let selectedMatchCursor = $state(0);
	let selectedMatchScopeKey = $state("");
	let selectedRowTableIndex = $state(-1);
	let selectedRowScopeKey = $state("");
	let selectedTableScopeKey = $state("");
	let recentTableNames = $state([]);
	let queryLogic = $state("and");
	let querySortColumn = $state("");
	let querySortDirection = $state("asc");
	let queryLimit = $state("all");
	let queryConditions = $state([]);
	let schemaUrlSyncReady = $state(false);
	let applyingSchemaUrlState = $state(false);
	let lastSchemaUrlState = $state("");
	let lastSchemaUrlSnapshot = $state(null);
	let queryConditionSeed = 0;

	const normalizedQuery = $derived(searchQuery.trim().toLowerCase());
	const normalizedColumnFilter = $derived(columnFilter.trim().toLowerCase());
	const normalizedRowFilter = $derived(rowFilter.trim().toLowerCase());
	const activeRowSearchQuery = $derived(normalizedRowFilter || normalizedQuery);
	const searchPlaceholder = $derived.by(() => {
		switch (searchMode) {
			case "tables":
				return "Search table names like Buildings, Units, or Language_en_US...";
			case "columns":
				return "Search column names like PrereqTech, Type, Help, or PortraitIndex...";
			case "relationships":
				return "Search references like UnitClass, PrereqTech, or IconAtlas...";
			case "rows":
				return "Search row values like archer, TECH_ARCHERY, or TXT_KEY_UNIT_ARCHER...";
			default:
				return "Search Buildings, archer, PrereqTech, Language_en_US, or UnitPromotions...";
		}
	});
	const searchedTables = $derived.by(() => TABLES.map((table) => buildTableSearchResult(table, normalizedQuery, searchMode)));
	const CATEGORY_COUNTS = $derived.by(() =>
		CATEGORY_DEFS.map((category) => ({
			id: category.id,
			count: searchedTables.filter((table) => table.matchesQuery && (category.id === "all" || table.categoryId === category.id)).length,
		})),
	);
	const filteredTables = $derived.by(() => {
		const matchesCategory = searchedTables.filter((table) => table.matchesQuery && (categoryFilter === "all" || table.categoryId === categoryFilter));
		return sortTableResults(matchesCategory, tableSort, normalizedQuery);
	});
	const selectedTable = $derived.by(() => {
		return searchedTables.find((table) => table.name === selectedTableName) || filteredTables[0] || TABLES[0] || null;
	});
	const selectedCompanionTables = $derived.by(() => {
		if (!selectedTable) {
			return [];
		}
		return TABLES.filter((table) => table.name !== selectedTable.name && selectedTable.companionPrefixes.some((prefix) => table.name.startsWith(prefix))).slice(0, 18);
	});
	const visibleColumns = $derived.by(() => {
		if (!selectedTable) {
			return [];
		}
		if (!normalizedColumnFilter) {
			return selectedTable.columns;
		}
		return selectedTable.columns.filter((column) =>
			`${column.name} ${column.type || ""} ${column.defaultValue ?? ""} ${column.primaryKey ? "pk" : ""} ${column.notNull ? "not null" : ""}`.toLowerCase().includes(normalizedColumnFilter),
		);
	});
	const visibleOutgoingForeignKeys = $derived.by(() => {
		if (!selectedTable) {
			return [];
		}
		return outgoingExpanded ? selectedTable.foreignKeys : selectedTable.foreignKeys.slice(0, SECTION_LIMITS.outgoing);
	});
	const visibleIncomingForeignKeys = $derived.by(() => {
		if (!selectedTable) {
			return [];
		}
		return incomingExpanded ? selectedTable.incomingForeignKeys : selectedTable.incomingForeignKeys.slice(0, SECTION_LIMITS.incoming);
	});
	const visibleCompanionTables = $derived.by(() => {
		return companionsExpanded ? selectedCompanionTables : selectedCompanionTables.slice(0, SECTION_LIMITS.companions);
	});
	const selectedRows = $derived.by(() => selectedTable?.rows ?? []);
	const selectedColumnByName = $derived.by(() => new Map((selectedTable?.columns ?? []).map((column) => [column.name, column])));
	const visibleRowEntries = $derived.by(() => {
		const rows = queryFilteredRowEntries;
		if (!normalizedRowFilter) {
			return rows;
		}
		return rows.filter((entry) => rowMatchesQuery(entry.row, normalizedRowFilter));
	});
	const rowPreviewColumns = $derived.by(() => selectedTable?.columns.map((column) => column.name) ?? []);
	const selectedStickyRowColumns = $derived.by(() => resolveStickyRowColumns(selectedTable?.columns ?? []));
	const primaryStickyRowColumn = $derived.by(() => selectedStickyRowColumns[0] ?? null);
	const activeQueryConditions = $derived.by(() =>
		queryConditions.filter((condition) => {
			if (!selectedColumnByName.has(condition.column) || !QUERY_OPERATOR_BY_ID.has(condition.operator)) {
				return false;
			}
			if (QUERY_OPERATORS_WITHOUT_VALUE.has(condition.operator)) {
				return true;
			}
			return String(condition.value ?? "").trim() !== "";
		}),
	);
	const hasActiveSqlQuery = $derived.by(() => activeQueryConditions.length > 0 || Boolean(querySortColumn) || queryLimit !== "all");
	const queryFilteredRowEntries = $derived.by(() => {
		let rows = selectedRows.map((row, index) => ({ row, index }));
		if (activeQueryConditions.length > 0) {
			rows = rows.filter((entry) => rowMatchesStructuredQuery(entry.row, activeQueryConditions, queryLogic));
		}
		if (querySortColumn && selectedColumnByName.has(querySortColumn)) {
			rows = sortStructuredQueryRows(rows, querySortColumn, querySortDirection);
		}
		if (queryLimit !== "all") {
			const limit = Number.parseInt(queryLimit, 10);
			if (Number.isInteger(limit) && limit >= 0) {
				rows = rows.slice(0, limit);
			}
		}
		return rows;
	});
	const queryResultCount = $derived.by(() => queryFilteredRowEntries.length);
	const selectedMatchedRows = $derived.by(() => {
		if (!activeRowSearchQuery) {
			return [];
		}
		return visibleRowEntries.filter((entry) => rowMatchesQuery(entry.row, activeRowSearchQuery)).map((entry) => ({ index: entry.index, row: entry.row }));
	});
	const selectedMatchedRowCount = $derived.by(() => selectedMatchedRows.length);
	const selectedMatchedRowIndices = $derived.by(() => selectedMatchedRows.map((item) => item.index));
	const selectedMatchedRowIndexSet = $derived.by(() => new Set(selectedMatchedRowIndices));
	const selectedMatchReasons = $derived.by(() => {
		if (!selectedTable || !normalizedQuery) {
			return [];
		}
		const reasons = [];
		if (selectedTable.tableNameMatch) {
			reasons.push(`Table name matches "${searchQuery.trim()}"`);
		}
		if (selectedTable.matchedColumns.length) {
			reasons.push(
				`Columns: ${selectedTable.matchedColumns
					.slice(0, 3)
					.map((column) => column.name)
					.join(", ")}`,
			);
		}
		if (selectedTable.matchedRelations.length) {
			reasons.push(
				`References: ${selectedTable.matchedRelations
					.slice(0, 2)
					.map((link) => link.from || link.fromColumn || link.toTable)
					.join(", ")}`,
			);
		}
		if (selectedMatchedRowCount) {
			reasons.push(`${selectedMatchedRowCount} row hits in this table`);
		}
		return reasons;
	});
	const selectedActiveMatchedRow = $derived.by(() => {
		if (!selectedMatchedRows.length) {
			return null;
		}
		return selectedMatchedRows[Math.min(selectedMatchCursor, selectedMatchedRows.length - 1)] ?? null;
	});
	const selectedActiveMatchedRowDisplayIndex = $derived.by(() => (selectedMatchedRowCount ? Math.min(selectedMatchCursor, selectedMatchedRowCount - 1) + 1 : 0));
	const canGoToPreviousMatch = $derived.by(() => selectedMatchCursor > 0);
	const canGoToNextMatch = $derived.by(() => selectedMatchCursor < selectedMatchedRowCount - 1);
	const selectedOutgoingForeignKeyByColumn = $derived.by(() => {
		return new Map((selectedTable?.foreignKeys ?? []).map((link) => [link.from, link]));
	});
	const selectedInspectorRowEntry = $derived.by(() => {
		if (!visibleRowEntries.length) {
			return null;
		}
		return visibleRowEntries.find((entry) => entry.index === selectedRowTableIndex) || visibleRowEntries.find((entry) => entry.index === selectedActiveMatchedRow?.index) || visibleRowEntries[0];
	});
	const selectedInspectorFields = $derived.by(() => {
		if (!selectedTable || !selectedInspectorRowEntry) {
			return [];
		}
		return selectedTable.columns
			.map((column) => ({
				name: column.name,
				value: selectedInspectorRowEntry.row[column.name],
				link: selectedOutgoingForeignKeyByColumn.get(column.name) ?? null,
			}))
			.filter((field) => !isEmptyCell(field.value));
	});
	const recentTables = $derived.by(() => recentTableNames.map((name) => TABLE_BY_NAME.get(name)).filter(Boolean));
	const hasExtraOutgoingForeignKeys = $derived.by(() => Boolean(selectedTable && selectedTable.foreignKeys.length > SECTION_LIMITS.outgoing));
	const hasExtraIncomingForeignKeys = $derived.by(() => Boolean(selectedTable && selectedTable.incomingForeignKeys.length > SECTION_LIMITS.incoming));
	const hasExtraCompanionTables = $derived.by(() => selectedCompanionTables.length > SECTION_LIMITS.companions);
	const sqlQueryPreview = $derived.by(() => buildSqlLikePreview(selectedTable?.name || "", activeQueryConditions, queryLogic, querySortColumn, querySortDirection, queryLimit));

	$effect(() => {
		if (!filteredTables.some((table) => table.name === selectedTableName)) {
			resetSectionExpansion();
			selectedTableName = filteredTables[0]?.name ?? TABLES[0]?.name ?? "";
		}
	});

	$effect(() => {
		const nextTableScopeKey = selectedTable?.id ?? "";
		if (selectedTableScopeKey === nextTableScopeKey) {
			return;
		}
		selectedTableScopeKey = nextTableScopeKey;
		if (applyingSchemaUrlState) {
			return;
		}
		columnFilter = "";
		rowFilter = "";
		clearStructuredQuery();
		selectedRowTableIndex = -1;
	});

	$effect(() => {
		const name = selectedTable?.name;
		if (!name) {
			return;
		}
		const next = [name, ...recentTableNames.filter((item) => item !== name)].slice(0, 6);
		if (next.length === recentTableNames.length && next.every((item, index) => item === recentTableNames[index])) {
			return;
		}
		recentTableNames = next;
	});

	$effect(() => {
		const nextScopeKey = `${selectedTable?.id ?? ""}:${activeRowSearchQuery}`;
		if (selectedMatchScopeKey === nextScopeKey) {
			return;
		}
		selectedMatchScopeKey = nextScopeKey;
		selectedMatchCursor = 0;
	});

	$effect(() => {
		if (!selectedMatchedRowCount) {
			if (selectedMatchCursor !== 0) {
				selectedMatchCursor = 0;
			}
			return;
		}
		if (selectedMatchCursor >= selectedMatchedRowCount) {
			selectedMatchCursor = selectedMatchedRowCount - 1;
		}
	});

	$effect(() => {
		const nextRowScopeKey = `${selectedTable?.id ?? ""}:${normalizedRowFilter}:${activeRowSearchQuery}`;
		if (selectedRowScopeKey === nextRowScopeKey) {
			return;
		}
		selectedRowScopeKey = nextRowScopeKey;
		if (selectedActiveMatchedRow && visibleRowEntries.some((entry) => entry.index === selectedActiveMatchedRow.index)) {
			selectedRowTableIndex = selectedActiveMatchedRow.index;
			return;
		}
		selectedRowTableIndex = visibleRowEntries[0]?.index ?? -1;
	});

	$effect(() => {
		if (selectedRowTableIndex === -1) {
			return;
		}
		if (!visibleRowEntries.some((entry) => entry.index === selectedRowTableIndex)) {
			selectedRowTableIndex = visibleRowEntries[0]?.index ?? -1;
		}
	});

	$effect(() => {
		const tableId = selectedTable?.id;
		const activeMatchedRowIndex = selectedActiveMatchedRow?.index;
		if (!activeRowSearchQuery || !tableId || activeMatchedRowIndex === undefined) {
			return;
		}
		void scrollMatchedRowIntoView(tableId, activeMatchedRowIndex);
	});

	$effect(() => {
		const tableName = selectedTable?.name;
		if (!tableName) {
			return;
		}
		void scrollSelectedTableCardIntoView(tableName);
	});

	onMount(() => {
		if (typeof window === "undefined") {
			return;
		}

		applySchemaUrlStateFromLocation();
		schemaUrlSyncReady = true;

		const handlePopState = () => {
			applySchemaUrlStateFromLocation();
		};

		window.addEventListener("popstate", handlePopState);
		return () => {
			window.removeEventListener("popstate", handlePopState);
		};
	});

	$effect(() => {
		if (typeof window === "undefined" || !schemaUrlSyncReady || applyingSchemaUrlState) {
			return;
		}

		const nextSnapshot = snapshotSchemaUrlState();
		const nextSerialized = serializeSchemaUrlState(nextSnapshot);
		if (nextSerialized === lastSchemaUrlState) {
			return;
		}

		const nextUrl = buildSchemaUrl(nextSnapshot);
		const shouldPush = shouldPushSchemaHistoryEntry(lastSchemaUrlSnapshot, nextSnapshot);
		window.history[shouldPush ? "pushState" : "replaceState"]({}, document.title, nextUrl);
		lastSchemaUrlState = nextSerialized;
		lastSchemaUrlSnapshot = nextSnapshot;
	});

	function resolveCategoryId(tableName) {
		for (const category of CATEGORY_DEFS) {
			if (category.id !== "all" && category.match(tableName)) {
				return category.id;
			}
		}
		return "misc";
	}

	function formatNumber(value) {
		return numberFormatter.format(value || 0);
	}

	function buildTableSearchResult(table, query, mode) {
		const tableNameMatch = query ? table.name.toLowerCase().includes(query) : false;
		const matchedColumns = query ? table.columns.filter((column) => `${column.name} ${column.type}`.toLowerCase().includes(query)).slice(0, 4) : [];
		const matchedRelations = query
			? [...table.foreignKeys, ...table.incomingForeignKeys]
					.filter((link) => `${link.from || ""} ${link.toTable || ""} ${link.toColumn || ""} ${link.fromTable || ""} ${link.fromColumn || ""}`.toLowerCase().includes(query))
					.slice(0, 3)
			: [];
		const rowValuesMatch = query ? getRowSearchBlob(table).includes(query) : false;
		const matchedRows = rowValuesMatch ? findMatchingRows(table, query, ROW_MATCH_LIMIT) : [];
		const matchedRowSummaries = matchedRows.map((item) => summarizeMatchedRow(item.row, query));
		let matchesQuery = !query;
		if (query) {
			switch (mode) {
				case "tables":
					matchesQuery = tableNameMatch;
					break;
				case "columns":
					matchesQuery = matchedColumns.length > 0;
					break;
				case "relationships":
					matchesQuery = matchedRelations.length > 0;
					break;
				case "rows":
					matchesQuery = rowValuesMatch;
					break;
				default:
					matchesQuery = tableNameMatch || matchedColumns.length > 0 || matchedRelations.length > 0 || rowValuesMatch;
			}
		}
		const score = (tableNameMatch ? 5 : 0) + matchedColumns.length * 2 + matchedRelations.length * 2 + matchedRows.length * 3 + (rowValuesMatch ? 1 : 0);
		return {
			...table,
			tableNameMatch,
			matchedColumns,
			matchedRelations,
			matchedRows,
			matchedRowSummaries,
			score,
			matchesQuery,
		};
	}

	function sortTableResults(tables, sortId, query) {
		const next = [...tables];
		switch (sortId) {
			case "rows":
				return next.sort((left, right) => right.rowCount - left.rowCount || left.name.localeCompare(right.name));
			case "columns":
				return next.sort((left, right) => right.columnCount - left.columnCount || left.name.localeCompare(right.name));
			case "refs":
				return next.sort(
					(left, right) => right.foreignKeyCount + right.incomingForeignKeys.length - (left.foreignKeyCount + left.incomingForeignKeys.length) || left.name.localeCompare(right.name),
				);
			case "az":
				return next.sort((left, right) => left.name.localeCompare(right.name));
			default:
				return next.sort((left, right) => {
					if (query && right.score !== left.score) {
						return right.score - left.score;
					}
					return left.name.localeCompare(right.name);
				});
		}
	}

	function isQuickStartActive(tableName) {
		return selectedTable?.name === tableName;
	}

	function selectTable(tableName) {
		resetSectionExpansion();
		selectedTableName = tableName;
	}

	function registerTableCard(node, tableName) {
		tableCardElements.set(tableName, node);
		return {
			update(nextTableName) {
				if (nextTableName !== tableName) {
					tableCardElements.delete(tableName);
					tableName = nextTableName;
				}
				tableCardElements.set(tableName, node);
			},
			destroy() {
				tableCardElements.delete(tableName);
			},
		};
	}

	function selectAdjacentTable(delta) {
		if (!filteredTables.length) {
			return;
		}
		const currentIndex = Math.max(
			0,
			filteredTables.findIndex((table) => table.name === selectedTable?.name),
		);
		const nextIndex = Math.min(filteredTables.length - 1, Math.max(0, currentIndex + delta));
		selectTable(filteredTables[nextIndex].name);
	}

	function handleSearchKeyDown(event) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			selectAdjacentTable(1);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			selectAdjacentTable(-1);
			return;
		}
		if (event.key === "Enter" && activeRowSearchQuery && selectedMatchedRowCount > 0) {
			event.preventDefault();
			if (event.shiftKey) {
				goToPreviousMatch();
				return;
			}
			goToNextMatch();
		}
	}

	function setSearchExample(value) {
		searchQuery = value;
	}

	function setDetailTab(nextTab) {
		detailTab = nextTab;
	}

	function selectRow(index) {
		selectedRowTableIndex = index;
	}

	function nextQueryConditionId() {
		queryConditionSeed += 1;
		return `query-condition-${queryConditionSeed}`;
	}

	function getDefaultQueryColumnName() {
		const preferredName = primaryStickyRowColumn;
		if (preferredName && selectedColumnByName.has(preferredName)) {
			return preferredName;
		}
		return selectedTable?.columns.find((column) => String(column.name || "").toLowerCase() !== "id")?.name || selectedTable?.columns[0]?.name || "";
	}

	function createQueryConditionDraft(seed = {}) {
		return {
			id: nextQueryConditionId(),
			column: seed.column || getDefaultQueryColumnName(),
			operator: seed.operator || "contains",
			value: seed.value ?? "",
		};
	}

	function addQueryCondition() {
		queryConditions = [...queryConditions, createQueryConditionDraft()];
	}

	function removeQueryCondition(conditionId) {
		queryConditions = queryConditions.filter((condition) => condition.id !== conditionId);
	}

	function clearStructuredQuery() {
		queryConditions = [];
		queryLogic = "and";
		querySortColumn = "";
		querySortDirection = "asc";
		queryLimit = "all";
	}

	async function copyTableName() {
		if (!selectedTable || typeof navigator === "undefined" || !navigator.clipboard) {
			return;
		}
		await navigator.clipboard.writeText(selectedTable.name);
	}

	async function copySqlPreview() {
		if (!sqlQueryPreview || typeof navigator === "undefined" || !navigator.clipboard) {
			return;
		}
		await navigator.clipboard.writeText(sqlQueryPreview);
	}

	function goToPreviousMatch() {
		if (selectedMatchCursor <= 0) {
			return;
		}
		const nextCursor = selectedMatchCursor - 1;
		selectedMatchCursor = nextCursor;
		selectedRowTableIndex = selectedMatchedRows[nextCursor]?.index ?? selectedRowTableIndex;
	}

	function goToNextMatch() {
		if (selectedMatchCursor >= selectedMatchedRowCount - 1) {
			return;
		}
		const nextCursor = selectedMatchCursor + 1;
		selectedMatchCursor = nextCursor;
		selectedRowTableIndex = selectedMatchedRows[nextCursor]?.index ?? selectedRowTableIndex;
	}

	function relatedTableCount(tableName) {
		const table = TABLE_BY_NAME.get(tableName);
		if (!table) {
			return 0;
		}
		return TABLES.filter((candidate) => candidate.name !== table.name && table.companionPrefixes.some((prefix) => candidate.name.startsWith(prefix))).length;
	}

	function resetSectionExpansion() {
		outgoingExpanded = false;
		incomingExpanded = false;
		companionsExpanded = false;
	}

	function rowMatchesQuery(row, query) {
		if (!query) {
			return true;
		}
		return Object.entries(row).some((entry) => rowEntryMatchesQuery(entry, query));
	}

	function isEmptyCell(value) {
		return value === null || value === undefined || value === "";
	}

	function queryOperatorNeedsValue(operatorId) {
		return !QUERY_OPERATORS_WITHOUT_VALUE.has(operatorId);
	}

	function formatCellValue(value) {
		if (value === null || value === undefined) {
			return "NULL";
		}
		if (value === "") {
			return "''";
		}
		return String(value);
	}

	function resolveStickyRowColumns(columns) {
		if (!columns.length) {
			return [];
		}
		const ranked = columns
			.map((column, index) => ({
				name: column.name,
				score: identityColumnScore(column),
				index,
			}))
			.sort((left, right) => {
				if (right.score !== left.score) {
					return right.score - left.score;
				}
				return left.index - right.index;
			});
		const picked = ranked.filter((column) => column.score > 0 && !isIgnoredStickyColumn(column.name)).slice(0, 1);
		if (picked.length >= 1) {
			return picked.map((column) => column.name);
		}
		const fallback = columns
			.slice(0, 2)
			.map((column) => column.name)
			.filter((name, index, array) => array.indexOf(name) === index && !isIgnoredStickyColumn(name));
		return [...picked.map((column) => column.name), ...fallback.filter((name) => !picked.some((column) => column.name === name))].slice(0, 1);
	}

	function isIgnoredStickyColumn(columnName) {
		return String(columnName || "").toLowerCase() === "id";
	}

	function identityColumnScore(column) {
		const name = column.name;
		if (!name) {
			return 0;
		}
		const normalized = name.toLowerCase();
		let score = 0;
		if (column.primaryKey) {
			score += 120;
		}
		if (normalized === "type") {
			score += 110;
		}
		if (normalized === "id") {
			score += 105;
		}
		if (normalized === "description") {
			score += 92;
		}
		if (normalized === "name") {
			score += 88;
		}
		if (normalized === "tag") {
			score += 84;
		}
		if (normalized === "help" || normalized === "civilopedia") {
			score += 65;
		}
		if (normalized.endsWith("type")) {
			score += 78;
		}
		if (normalized.endsWith("id")) {
			score += 74;
		}
		if (normalized.endsWith("description") || normalized.endsWith("name") || normalized.endsWith("tag")) {
			score += 66;
		}
		if (normalized.includes("class")) {
			score += 58;
		}
		if (normalized.includes("key")) {
			score += 52;
		}
		if ((column.type || "").toLowerCase() === "text") {
			score += 8;
		}
		return score;
	}

	function isPrimaryStickyRowColumn(columnName) {
		return primaryStickyRowColumn === columnName;
	}

	function stickyRowColumnStyle(columnName) {
		if (isPrimaryStickyRowColumn(columnName)) {
			return "--schema-sticky-left: 0px;";
		}
		return "";
	}

	function truncateText(value, maxLength = 42) {
		const text = String(value);
		return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
	}

	function getRowSearchBlob(table) {
		const cached = rowSearchBlobCache.get(table.name);
		if (cached) {
			return cached;
		}
		const blob = table.rows
			.map((row) => Object.values(row).join(" "))
			.join(" ")
			.toLowerCase();
		rowSearchBlobCache.set(table.name, blob);
		return blob;
	}

	function rowEntryMatchesQuery([_key, value], query) {
		if (value === null || value === undefined || value === "") {
			return false;
		}
		return String(value).toLowerCase().includes(query);
	}

	function normalizeComparableValue(value) {
		if (value === null || value === undefined || value === "") {
			return {
				empty: true,
				text: "",
				normalized: "",
				number: Number.NaN,
				isNumber: false,
			};
		}
		const text = String(value);
		const trimmed = text.trim();
		const number = Number(trimmed);
		return {
			empty: false,
			text,
			normalized: text.toLowerCase(),
			number,
			isNumber: trimmed !== "" && Number.isFinite(number),
		};
	}

	function rowMatchesStructuredCondition(row, condition) {
		const value = row[condition.column];
		if (condition.operator === "isEmpty") {
			return isEmptyCell(value);
		}
		if (condition.operator === "isNotEmpty") {
			return !isEmptyCell(value);
		}
		if (isEmptyCell(value)) {
			return false;
		}

		const left = normalizeComparableValue(value);
		const right = normalizeComparableValue(condition.value);

		switch (condition.operator) {
			case "contains":
				return left.normalized.includes(right.normalized);
			case "equals":
				if (left.isNumber && right.isNumber) {
					return left.number === right.number;
				}
				return left.normalized === right.normalized;
			case "notEquals":
				if (left.isNumber && right.isNumber) {
					return left.number !== right.number;
				}
				return left.normalized !== right.normalized;
			case "startsWith":
				return left.normalized.startsWith(right.normalized);
			case "endsWith":
				return left.normalized.endsWith(right.normalized);
			case "gt":
				return left.isNumber && right.isNumber ? left.number > right.number : false;
			case "gte":
				return left.isNumber && right.isNumber ? left.number >= right.number : false;
			case "lt":
				return left.isNumber && right.isNumber ? left.number < right.number : false;
			case "lte":
				return left.isNumber && right.isNumber ? left.number <= right.number : false;
			default:
				return true;
		}
	}

	function rowMatchesStructuredQuery(row, conditions, logic) {
		if (!conditions.length) {
			return true;
		}
		if (logic === "or") {
			return conditions.some((condition) => rowMatchesStructuredCondition(row, condition));
		}
		return conditions.every((condition) => rowMatchesStructuredCondition(row, condition));
	}

	function compareStructuredQueryValues(left, right) {
		const normalizedLeft = normalizeComparableValue(left);
		const normalizedRight = normalizeComparableValue(right);
		if (normalizedLeft.empty && normalizedRight.empty) {
			return 0;
		}
		if (normalizedLeft.empty) {
			return 1;
		}
		if (normalizedRight.empty) {
			return -1;
		}
		if (normalizedLeft.isNumber && normalizedRight.isNumber) {
			return normalizedLeft.number - normalizedRight.number;
		}
		return normalizedLeft.normalized.localeCompare(normalizedRight.normalized);
	}

	function sortStructuredQueryRows(rows, columnName, direction) {
		const next = [...rows];
		const factor = direction === "desc" ? -1 : 1;
		return next.sort((left, right) => {
			const compared = compareStructuredQueryValues(left.row[columnName], right.row[columnName]);
			if (compared !== 0) {
				return compared * factor;
			}
			return left.index - right.index;
		});
	}

	function findMatchingRows(table, query, limit = Number.POSITIVE_INFINITY) {
		const matches = [];
		for (const [index, row] of table.rows.entries()) {
			const entries = Object.entries(row);
			if (entries.some((entry) => rowEntryMatchesQuery(entry, query))) {
				matches.push({ index, row });
				if (matches.length >= limit) {
					break;
				}
			}
		}
		return matches;
	}

	function summarizeMatchedRow(row, query) {
		const entries = Object.entries(row);
		if (entries.length === 0) {
			return "Empty row";
		}
		const primary = entries.find((entry) => rowEntryMatchesQuery(entry, query)) || entries[0];
		const secondary = entries.find(([key]) => key !== primary[0] && /(^Type$|Type$|Description$|Name$|Class$|ID$|Tag$)/.test(key)) || entries.find(([key]) => key !== primary[0]);
		if (!secondary) {
			return `${primary[0]}=${truncateText(primary[1])}`;
		}
		return `${primary[0]}=${truncateText(primary[1])} · ${secondary[0]}=${truncateText(secondary[1])}`;
	}

	function isRowCellMatch(value, query) {
		if (!query || value === null || value === undefined || value === "") {
			return false;
		}
		return String(value).toLowerCase().includes(query);
	}

	function escapeSqlIdentifier(value) {
		return `"${String(value).replaceAll('"', '""')}"`;
	}

	function escapeSqlLiteral(value) {
		return `'${String(value).replaceAll("'", "''")}'`;
	}

	function buildSqlCondition(condition) {
		const columnName = escapeSqlIdentifier(condition.column);
		const right = normalizeComparableValue(condition.value);
		switch (condition.operator) {
			case "contains":
				return `LOWER(${columnName}) LIKE LOWER('%${String(condition.value).replaceAll("'", "''")}%')`;
			case "equals":
				return right.isNumber ? `${columnName} = ${right.number}` : `LOWER(${columnName}) = LOWER(${escapeSqlLiteral(condition.value)})`;
			case "notEquals":
				return right.isNumber ? `${columnName} <> ${right.number}` : `LOWER(${columnName}) <> LOWER(${escapeSqlLiteral(condition.value)})`;
			case "startsWith":
				return `LOWER(${columnName}) LIKE LOWER('${String(condition.value).replaceAll("'", "''")}%')`;
			case "endsWith":
				return `LOWER(${columnName}) LIKE LOWER('%${String(condition.value).replaceAll("'", "''")}')`;
			case "gt":
				return `${columnName} > ${right.isNumber ? right.number : escapeSqlLiteral(condition.value)}`;
			case "gte":
				return `${columnName} >= ${right.isNumber ? right.number : escapeSqlLiteral(condition.value)}`;
			case "lt":
				return `${columnName} < ${right.isNumber ? right.number : escapeSqlLiteral(condition.value)}`;
			case "lte":
				return `${columnName} <= ${right.isNumber ? right.number : escapeSqlLiteral(condition.value)}`;
			case "isEmpty":
				return `(${columnName} IS NULL OR ${columnName} = '')`;
			case "isNotEmpty":
				return `(${columnName} IS NOT NULL AND ${columnName} <> '')`;
			default:
				return "1 = 1";
		}
	}

	function buildSqlLikePreview(tableName, conditions, logic, sortColumn, sortDirection, limit) {
		if (!tableName) {
			return "";
		}
		const lines = [`SELECT *`, `FROM ${escapeSqlIdentifier(tableName)}`];
		if (conditions.length > 0) {
			const joiner = logic === "or" ? "\n   OR " : "\n   AND ";
			lines.push(`WHERE ${conditions.map((condition) => buildSqlCondition(condition)).join(joiner)}`);
		}
		if (sortColumn) {
			lines.push(`ORDER BY ${escapeSqlIdentifier(sortColumn)} ${sortDirection === "desc" ? "DESC" : "ASC"}`);
		}
		if (limit !== "all") {
			const parsedLimit = Number.parseInt(limit, 10);
			if (Number.isInteger(parsedLimit) && parsedLimit >= 0) {
				lines.push(`LIMIT ${parsedLimit}`);
			}
		}
		return `${lines.join("\n")};`;
	}

	function buildStructuredQuerySnapshot() {
		return {
			logic: queryLogic,
			sortColumn: querySortColumn,
			sortDirection: querySortDirection,
			limit: queryLimit,
			conditions: queryConditions.map((condition) => ({
				column: condition.column,
				operator: condition.operator,
				value: condition.value ?? "",
			})),
		};
	}

	function hasStructuredQuerySnapshot(snapshot) {
		return Boolean(snapshot.sortColumn || snapshot.limit !== "all" || snapshot.logic !== "and" || snapshot.conditions.length > 0);
	}

	function parseStructuredQuerySnapshot(rawValue) {
		if (!rawValue) {
			return null;
		}
		try {
			const parsed = JSON.parse(rawValue);
			if (!parsed || typeof parsed !== "object") {
				return null;
			}
			const validLogicIds = new Set(QUERY_LOGIC_DEFS.map((item) => item.id));
			const validSortDirections = new Set(QUERY_SORT_DIRECTION_DEFS.map((item) => item.id));
			const validLimitIds = new Set(QUERY_LIMIT_DEFS.map((item) => item.id));
			return {
				logic: validLogicIds.has(parsed.logic) ? parsed.logic : "and",
				sortColumn: typeof parsed.sortColumn === "string" ? parsed.sortColumn : "",
				sortDirection: validSortDirections.has(parsed.sortDirection) ? parsed.sortDirection : "asc",
				limit: validLimitIds.has(parsed.limit) ? parsed.limit : "all",
				conditions: Array.isArray(parsed.conditions)
					? parsed.conditions
							.filter((condition) => condition && typeof condition === "object")
							.map((condition) => ({
								column: typeof condition.column === "string" ? condition.column : "",
								operator: QUERY_OPERATOR_BY_ID.has(condition.operator) ? condition.operator : "contains",
								value: typeof condition.value === "string" || typeof condition.value === "number" ? String(condition.value) : "",
							}))
					: [],
			};
		} catch {
			return null;
		}
	}

	function snapshotSchemaUrlState() {
		return {
			q: searchQuery.trim(),
			mode: searchMode,
			sort: tableSort,
			category: categoryFilter,
			table: selectedTable?.name || selectedTableName || "",
			tab: detailTab,
			columnFilter: columnFilter.trim(),
			rowFilter: rowFilter.trim(),
			rowIndex: selectedRowTableIndex,
			querySpec: buildStructuredQuerySnapshot(),
		};
	}

	function serializeSchemaUrlState(snapshot) {
		return JSON.stringify(snapshot);
	}

	function buildSchemaUrl(snapshot) {
		const url = new URL(window.location.href);
		const params = new URLSearchParams(url.search);
		const managedKeys = ["q", "mode", "sort", "category", "table", "tab", "columnFilter", "rowFilter", "rowIndex", "querySpec"];
		for (const key of managedKeys) {
			params.delete(key);
		}
		if (snapshot.q) {
			params.set("q", snapshot.q);
		}
		if (snapshot.mode && snapshot.mode !== "all") {
			params.set("mode", snapshot.mode);
		}
		if (snapshot.sort && snapshot.sort !== "best") {
			params.set("sort", snapshot.sort);
		}
		if (snapshot.category && snapshot.category !== "all") {
			params.set("category", snapshot.category);
		}
		if (snapshot.table && snapshot.table !== "Buildings") {
			params.set("table", snapshot.table);
		}
		if (snapshot.tab && snapshot.tab !== "columns") {
			params.set("tab", snapshot.tab);
		}
		if (snapshot.columnFilter) {
			params.set("columnFilter", snapshot.columnFilter);
		}
		if (snapshot.rowFilter) {
			params.set("rowFilter", snapshot.rowFilter);
		}
		if (snapshot.rowIndex >= 0) {
			params.set("rowIndex", String(snapshot.rowIndex));
		}
		if (hasStructuredQuerySnapshot(snapshot.querySpec)) {
			params.set("querySpec", JSON.stringify(snapshot.querySpec));
		}
		const query = params.toString();
		return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
	}

	async function applySchemaUrlStateFromLocation() {
		if (typeof window === "undefined") {
			return;
		}

		applyingSchemaUrlState = true;
		const params = new URLSearchParams(window.location.search);
		const validSearchModes = new Set(SEARCH_MODE_DEFS.map((item) => item.id));
		const validSortModes = new Set(TABLE_SORT_DEFS.map((item) => item.id));
		const validDetailTabs = new Set(DETAIL_TAB_DEFS.map((item) => item.id));
		const validCategories = new Set(CATEGORY_DEFS.map((item) => item.id));
		const parsedRowIndex = Number.parseInt(params.get("rowIndex") || "", 10);
		const nextTableName = params.get("table") || "Buildings";
		const parsedStructuredQuery = parseStructuredQuerySnapshot(params.get("querySpec"));

		searchQuery = params.get("q") || "";
		searchMode = validSearchModes.has(params.get("mode") || "") ? params.get("mode") : "all";
		tableSort = validSortModes.has(params.get("sort") || "") ? params.get("sort") : "best";
		categoryFilter = validCategories.has(params.get("category") || "") ? params.get("category") : "all";
		selectedTableName = TABLE_BY_NAME.has(nextTableName) ? nextTableName : "Buildings";
		detailTab = validDetailTabs.has(params.get("tab") || "") ? params.get("tab") : "rows";
		columnFilter = params.get("columnFilter") || "";
		rowFilter = params.get("rowFilter") || "";
		selectedRowTableIndex = Number.isInteger(parsedRowIndex) && parsedRowIndex >= 0 ? parsedRowIndex : -1;
		queryLogic = parsedStructuredQuery?.logic || "and";
		querySortColumn = parsedStructuredQuery?.sortColumn || "";
		querySortDirection = parsedStructuredQuery?.sortDirection || "asc";
		queryLimit = parsedStructuredQuery?.limit || "all";
		queryConditions = (parsedStructuredQuery?.conditions || []).map((condition) => createQueryConditionDraft(condition));

		await tick();
		const nextSnapshot = snapshotSchemaUrlState();
		lastSchemaUrlSnapshot = nextSnapshot;
		lastSchemaUrlState = serializeSchemaUrlState(nextSnapshot);
		applyingSchemaUrlState = false;
	}

	function shouldPushSchemaHistoryEntry(previous, next) {
		if (!previous) {
			return false;
		}
		return (
			previous.mode !== next.mode ||
			previous.sort !== next.sort ||
			previous.category !== next.category ||
			previous.table !== next.table ||
			previous.tab !== next.tab ||
			previous.rowIndex !== next.rowIndex
		);
	}

	async function scrollMatchedRowIntoView(tableId, rowIndex) {
		if (typeof document === "undefined") {
			return;
		}
		await tick();
		const row = document.getElementById(`schema-row-${tableId}-${rowIndex}`);
		row?.scrollIntoView({
			block: "center",
			inline: "nearest",
			behavior: "smooth",
		});
	}

	async function scrollSelectedTableCardIntoView(tableName) {
		if (typeof document === "undefined") {
			return;
		}
		await tick();
		const card = tableCardElements.get(tableName);
		card?.scrollIntoView({
			block: "nearest",
			inline: "nearest",
			behavior: "smooth",
		});
	}
</script>

<section class="schema-page">
	<header class="schema-hero">
		<p class="schema-eyebrow">Database Reference</p>
		<h1>Schema Browser</h1>
		<p>
			Search the Civilization V database for quick reference. This viewer is an exact copy of <code>Civ5DebugDatabase.db</code> when owning all DLC.
		</p>
	</header>

	<section class="schema-panel">
		<div class="schema-section-head">
			<span class="schema-kicker">Quick Starts</span>
			<h2>Jump into the tables modders use most often</h2>
			<p>These are the most useful starting points for documentation, planning, and debugging code for your mods.</p>
		</div>
		<div class="schema-quick-grid">
			{#each QUICK_STARTS as item (item.tableName)}
				<button type="button" class={`schema-quick-card ${isQuickStartActive(item.tableName) ? "is-active" : ""}`} onclick={() => selectTable(item.tableName)}>
					<div class="schema-quick-head">
						<h3>{item.label}</h3>
					</div>
					<p>{item.copy}</p>
				</button>
			{/each}
		</div>
	</section>

	<section class="schema-panel schema-panel--explorer">
		<div class="schema-toolbar">
			<div class="schema-toolbar-primary">
				<div class="schema-mode-group" role="group" aria-label="Search scope">
					{#each SEARCH_MODE_DEFS as mode (mode.id)}
						<button
							type="button"
							class={`schema-filter-chip schema-filter-chip--scope ${searchMode === mode.id ? "is-active" : ""}`}
							aria-pressed={searchMode === mode.id}
							onclick={() => (searchMode = mode.id)}
						>
							{mode.label}
						</button>
					{/each}
				</div>
				<label class="schema-search-field">
					<span>Search schema data</span>
					<input type="search" bind:value={searchQuery} onkeydown={handleSearchKeyDown} placeholder={searchPlaceholder} />
				</label>
				<label class="schema-sort-field">
					<span>Sort tables</span>
					<select bind:value={tableSort}>
						{#each TABLE_SORT_DEFS as option (option.id)}
							<option value={option.id}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>
			<div class="schema-toolbar-secondary">
				<div class="schema-filter-group" role="group" aria-label="Schema categories">
					{#each CATEGORY_DEFS as category (category.id)}
						<button
							type="button"
							class={`schema-filter-chip schema-filter-chip--toggle ${categoryFilter === category.id ? "is-active" : ""}`}
							aria-pressed={categoryFilter === category.id}
							onclick={() => (categoryFilter = category.id)}
						>
							{category.label}
							<span>{CATEGORY_COUNTS.find((item) => item.id === category.id)?.count ?? 0}</span>
						</button>
					{/each}
				</div>
			</div>
			{#if recentTables.length > 0}
				<div class="schema-recent-group" aria-label="Recent tables">
					<span class="schema-toolbar-label">Recent tables</span>
					<div class="schema-recent-list">
						{#each recentTables as table (table.name)}
							<button type="button" class="schema-inline-link schema-inline-link--chip" onclick={() => selectTable(table.name)}>{table.name}</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<div class="schema-explorer-grid">
			<aside class="schema-list-panel" aria-label="Schema tables">
				<div class="schema-list-head">
					<h2>Tables</h2>
					<span>{filteredTables.length} matches</span>
				</div>
				<div class="schema-table-list">
					{#if filteredTables.length === 0}
						<div class="schema-empty-state">
							<p class="schema-empty">No tables match the current search.</p>
							<p class="schema-empty-note">Try one of these examples or clear the current scope.</p>
							<div class="schema-empty-actions">
								{#each EMPTY_SEARCH_EXAMPLES as example (example)}
									<button type="button" class="schema-inline-link schema-inline-link--chip" onclick={() => setSearchExample(example)}>{example}</button>
								{/each}
								<button
									type="button"
									class="schema-inline-link schema-inline-link--chip"
									onclick={() => {
										searchQuery = "";
										searchMode = "all";
										categoryFilter = "all";
									}}>Clear search</button
								>
							</div>
						</div>
					{:else}
						{#each filteredTables as table (table.name)}
							<button
								type="button"
								class={`schema-table-card ${selectedTable?.name === table.name ? "is-active" : ""}`}
								onclick={() => selectTable(table.name)}
								use:registerTableCard={table.name}
							>
								<div class="schema-table-card-head">
									<h3 style="font-size: 1rem">{table.name}</h3>
								</div>
								<div class="schema-table-meta">
									<!-- <span>{table.foreignKeyCount} outgoing refs</span>
									<span>{table.incomingForeignKeys.length} incoming refs</span> -->
									<span>{table.columnCount} cols</span>
									<span>{formatNumber(table.rowCount)} rows</span>
								</div>
								{#if table.matchedColumns.length > 0}
									<div class="schema-table-tags">
										{#each table.matchedColumns as column (column.name)}
											<span class="schema-tag">{column.name}</span>
										{/each}
									</div>
								{/if}
								{#if table.matchedRowSummaries.length > 0}
									<ul class="schema-table-match-list" aria-label={`Matching rows in ${table.name}`}>
										{#each table.matchedRowSummaries as rowSummary (`${table.name}-${rowSummary}`)}
											<li>{rowSummary}</li>
										{/each}
									</ul>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			</aside>

			{#if selectedTable}
				<section class="schema-detail-panel" aria-label="Selected table details">
					<div class="schema-detail-hero">
						<div class="schema-detail-hero-copy">
							<p class="schema-kicker">Selected table</p>
							<h2>{selectedTable.name}</h2>
							{#if normalizedQuery && selectedMatchReasons.length > 0}
								<div class="schema-detail-match-summary">
									<p class="schema-section-note">Why this table matched</p>
									<div class="schema-table-tags">
										{#each selectedMatchReasons as reason (reason)}
											<span class="schema-tag">{reason}</span>
										{/each}
									</div>
								</div>
							{/if}
							<div class="schema-detail-actions">
								<div class="schema-detail-tabs" role="tablist" aria-label="Selected table views">
									{#each DETAIL_TAB_DEFS as tab (tab.id)}
										<button
											type="button"
											role="tab"
											class={`schema-tab-button ${detailTab === tab.id ? "is-active" : ""}`}
											aria-selected={detailTab === tab.id}
											onclick={() => setDetailTab(tab.id)}
										>
											{tab.label}
										</button>
									{/each}
								</div>
								<!-- <div class="schema-detail-quick-actions">
									<button type="button" class="schema-section-toggle" onclick={copyTableName}>Copy table name</button>
								</div> -->
							</div>
						</div>
						<div class="schema-detail-metrics">
							<span class="schema-metric-chip">
								<strong>{selectedTable.columnCount}</strong>
								<span>columns</span>
							</span>
							<span class="schema-metric-chip">
								<strong>{selectedTable.foreignKeyCount}</strong>
								<span>outgoing refs</span>
							</span>
							<span class="schema-metric-chip">
								<strong>{selectedTable.incomingForeignKeys.length}</strong>
								<span>incoming refs</span>
							</span>
							<span class="schema-metric-chip">
								<strong>{formatNumber(selectedTable.rowCount)}</strong>
								<span>rows</span>
							</span>
						</div>
					</div>

					{#if detailTab === "columns"}
						<article class="schema-detail-card schema-detail-card-exception">
							<div class="schema-detail-card-head">
								<div>
									<h3>Columns</h3>
									<p class="schema-section-note">Showing {visibleColumns.length} of {selectedTable.columns.length} columns in this table</p>
								</div>
								<div class="schema-card-tools">
									<label class="schema-local-filter">
										<span>Filter columns</span>
										<input type="search" bind:value={columnFilter} placeholder="Type, Help, PrereqTech..." />
									</label>
									<span>{selectedTable.columns.length}</span>
								</div>
							</div>
							{#if visibleColumns.length === 0}
								<p class="schema-empty">No columns match the current column filter.</p>
							{:else}
								<div class="schema-column-list" role="list">
									{#each visibleColumns as column (column.name)}
										<div class="schema-column-row" role="listitem">
											<div>
												<strong>{column.name}</strong>
												<p>{column.type || "untyped"}</p>
											</div>
											<div class="schema-column-flags">
												{#if column.primaryKey}
													<span class="schema-tag schema-tag--key">PK</span>
												{/if}
												{#if column.notNull}
													<span class="schema-tag">NOT NULL</span>
												{/if}
												{#if column.defaultValue !== null && column.defaultValue !== undefined && column.defaultValue !== ""}
													<span class="schema-tag">Default {column.defaultValue}</span>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</article>
					{:else if detailTab === "rows"}
						<div class="schema-rows-tab">
							<!-- <article class="schema-detail-card schema-detail-card--query-builder">
								<div class="schema-detail-card-head">
									<div>
										<h3>SQL-style query builder</h3>
										<p class="schema-section-note">Build a read-only <code>SELECT</code> query against the current table. The row grid and inspector below use these results.</p>
									</div>
									<div class="schema-query-builder-actions">
										<button type="button" class="schema-section-toggle" onclick={addQueryCondition}>Add condition</button>
										<button type="button" class="schema-section-toggle" onclick={clearStructuredQuery} disabled={!hasActiveSqlQuery && queryConditions.length === 0}
											>Clear query</button
										>
									</div>
								</div>
								<div class="schema-query-builder-grid">
									<label class="schema-local-filter">
										<span>Match rows</span>
										<select bind:value={queryLogic}>
											{#each QUERY_LOGIC_DEFS as option (option.id)}
												<option value={option.id}>{option.label}</option>
											{/each}
										</select>
									</label>
									<label class="schema-local-filter">
										<span>Sort by</span>
										<select bind:value={querySortColumn}>
											<option value="">Snapshot order</option>
											{#each selectedTable.columns as column (column.name)}
												<option value={column.name}>{column.name}</option>
											{/each}
										</select>
									</label>
									<label class="schema-local-filter">
										<span>Direction</span>
										<select bind:value={querySortDirection} disabled={!querySortColumn}>
											{#each QUERY_SORT_DIRECTION_DEFS as option (option.id)}
												<option value={option.id}>{option.label}</option>
											{/each}
										</select>
									</label>
									<label class="schema-local-filter">
										<span>Limit</span>
										<select bind:value={queryLimit}>
											{#each QUERY_LIMIT_DEFS as option (option.id)}
												<option value={option.id}>{option.label}</option>
											{/each}
										</select>
									</label>
								</div>
								{#if queryConditions.length === 0}
									<p class="schema-empty">No structured conditions yet. Add one to build a real <code>WHERE</code> clause.</p>
								{:else}
									<div class="schema-query-condition-list">
										{#each queryConditions as condition (condition.id)}
											<div class="schema-query-condition">
												<label class="schema-local-filter">
													<span>Column</span>
													<select bind:value={condition.column}>
														{#each selectedTable.columns as column (column.name)}
															<option value={column.name}>{column.name}</option>
														{/each}
													</select>
												</label>
												<label class="schema-local-filter">
													<span>Operator</span>
													<select bind:value={condition.operator}>
														{#each QUERY_OPERATOR_DEFS as operator (operator.id)}
															<option value={operator.id}>{operator.label}</option>
														{/each}
													</select>
												</label>
												{#if queryOperatorNeedsValue(condition.operator)}
													<label class="schema-local-filter">
														<span>Value</span>
														<input type="text" bind:value={condition.value} placeholder="Value to match..." />
													</label>
												{:else}
													<div class="schema-query-placeholder">
														<span>No value needed</span>
													</div>
												{/if}
												<button type="button" class="schema-section-toggle" onclick={() => removeQueryCondition(condition.id)}>Remove</button>
											</div>
										{/each}
									</div>
								{/if}
								<div class="schema-query-preview">
									<div class="schema-query-preview-head">
										<div>
												<h4 class="schema-query-preview-title">Generated SQL</h4>
											<p class="schema-section-note">Preview only. This page never writes back to the Civ V database.</p>
										</div>
										<button type="button" class="schema-section-toggle" onclick={copySqlPreview}>Copy SQL</button>
									</div>
									<pre class="schema-sql-preview"><code>{sqlQueryPreview}</code></pre>
								</div>
							</article> -->

							<div class="schema-rows-layout">
								<article class="schema-detail-card schema-detail-card-exception">
									<div class="schema-detail-card-head">
										<div>
											<h3>Row data</h3>
											<p class="schema-section-note">
												Showing {formatNumber(visibleRowEntries.length)} visible rows
												{#if hasActiveSqlQuery}
													· {formatNumber(queryResultCount)} query results
												{/if}
												· {formatNumber(selectedTable.rowCount)} total rows in the local snapshot
												{#if activeRowSearchQuery && selectedMatchedRowCount}
													· Match {selectedActiveMatchedRowDisplayIndex} of {selectedMatchedRowCount}
												{/if}
											</p>
										</div>
										<div class="schema-card-tools">
											<label class="schema-local-filter">
												<span>Quick filter rows</span>
												<input type="search" bind:value={rowFilter} placeholder="archer, TECH_ARCHERY, TXT_KEY..." />
											</label>
											<div class="schema-row-toolbar">
												{#if activeRowSearchQuery && selectedMatchedRowCount > 1}
													<div class="schema-match-nav" aria-label="Row match navigation">
														<button type="button" class="schema-section-toggle" onclick={goToPreviousMatch} disabled={!canGoToPreviousMatch}>Previous match</button>
														<button type="button" class="schema-section-toggle" onclick={goToNextMatch} disabled={!canGoToNextMatch}>Next match</button>
													</div>
												{/if}
												<!-- <span>{formatNumber(selectedTable.rowCount)}</span> -->
											</div>
										</div>
									</div>
									{#if visibleRowEntries.length === 0}
										<p class="schema-empty">
											{#if hasActiveSqlQuery && queryResultCount === 0}
												No rows match the current SQL-style query.
											{:else}
												No rows match the current row filter.
											{/if}
										</p>
									{:else}
										<div class="schema-row-preview-wrap">
											<table class="schema-row-preview-table">
												<thead>
													<tr>
														<th scope="col" class="schema-row-index-head">#</th>
														{#each rowPreviewColumns as columnName (columnName)}
															<th scope="col" class:is-sticky-primary={isPrimaryStickyRowColumn(columnName)} style={stickyRowColumnStyle(columnName)}>{columnName}</th>
														{/each}
													</tr>
												</thead>
												<tbody>
													{#each visibleRowEntries as entry (`${selectedTable.name}-row-${entry.index}`)}
														<tr
															id={`schema-row-${selectedTable.id}-${entry.index}`}
															class:is-row-match={selectedMatchedRowIndexSet.has(entry.index)}
															class:is-row-selected={selectedInspectorRowEntry?.index === entry.index}
															onclick={() => selectRow(entry.index)}
														>
															<td class="schema-row-index-cell">{entry.index + 1}</td>
															{#each rowPreviewColumns as columnName (columnName)}
																<td
																	class:is-sticky-primary={isPrimaryStickyRowColumn(columnName)}
																	class:is-empty-cell={isEmptyCell(entry.row[columnName])}
																	class:is-cell-match={isRowCellMatch(entry.row[columnName], activeRowSearchQuery)}
																	title={formatCellValue(entry.row[columnName])}
																	style={stickyRowColumnStyle(columnName)}
																>
																	{#if selectedOutgoingForeignKeyByColumn.get(columnName) && !isEmptyCell(entry.row[columnName])}
																		<button
																			type="button"
																			class="schema-cell-link"
																			onclick={(event) => {
																				event.stopPropagation();
																				selectTable(selectedOutgoingForeignKeyByColumn.get(columnName).toTable);
																			}}
																		>
																			{formatCellValue(entry.row[columnName])}
																		</button>
																	{:else}
																		{formatCellValue(entry.row[columnName])}
																	{/if}
																</td>
															{/each}
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{/if}
								</article>

								<article class="schema-detail-card schema-detail-card-inspector">
									<div class="schema-detail-card-head">
										<div>
											<h3>Row inspector</h3>
											<p class="schema-section-note">
												{#if selectedInspectorRowEntry}
													Selected row #{selectedInspectorRowEntry.index + 1} · {selectedInspectorFields.length} populated fields shown
												{:else}
													Choose a row to inspect its values
												{/if}
											</p>
										</div>
										<span>{selectedInspectorRowEntry ? selectedInspectorRowEntry.index + 1 : 0}</span>
									</div>
									{#if !selectedInspectorRowEntry}
										<p class="schema-empty">No visible row is selected.</p>
									{:else if selectedInspectorFields.length === 0}
										<p class="schema-empty">This row only contains empty values in the current sparse snapshot.</p>
									{:else}
										<dl class="schema-row-inspector">
											{#each selectedInspectorFields as field (field.name)}
												<div>
													<dt>{field.name}</dt>
													<dd>
														{#if field.link}
															<button type="button" class="schema-inline-link" onclick={() => selectTable(field.link.toTable)}>{formatCellValue(field.value)}</button>
														{:else}
															<span>{formatCellValue(field.value)}</span>
														{/if}
													</dd>
												</div>
											{/each}
										</dl>
									{/if}
								</article>
							</div>
						</div>
					{:else if detailTab === "relationships"}
						<div class="schema-detail-secondary-grid schema-detail-secondary-grid--relationships">
							<article class="schema-detail-card schema-detail-card-exception">
								<div class="schema-detail-card-head">
									<div>
										<h3>Outgoing foreign keys</h3>
										<p class="schema-section-note">Showing {visibleOutgoingForeignKeys.length} of {selectedTable.foreignKeys.length}</p>
									</div>
									{#if hasExtraOutgoingForeignKeys}
										<button type="button" class="schema-section-toggle" onclick={() => (outgoingExpanded = !outgoingExpanded)}>
											{outgoingExpanded ? `Show first ${SECTION_LIMITS.outgoing}` : `Show all ${selectedTable.foreignKeys.length}`}
										</button>
									{:else}
										<span>{selectedTable.foreignKeys.length}</span>
									{/if}
								</div>
								{#if selectedTable.foreignKeys.length === 0}
									<p class="schema-empty">No outgoing foreign keys in this snapshot.</p>
								{:else}
									<ul class="schema-link-list">
										{#each visibleOutgoingForeignKeys as link, index (`${link.from}-${link.toTable}-${index}`)}
											<li>
												<strong>{link.from}</strong>
												<span>references</span>
												<button type="button" class="schema-inline-link" onclick={() => selectTable(link.toTable)}>{link.toTable}.{link.toColumn}</button>
											</li>
										{/each}
									</ul>
								{/if}
							</article>

							<article class="schema-detail-card schema-detail-card-exception">
								<div class="schema-detail-card-head">
									<div>
										<h3>Incoming foreign keys</h3>
										<p class="schema-section-note">Showing {visibleIncomingForeignKeys.length} of {selectedTable.incomingForeignKeys.length}</p>
									</div>
									{#if hasExtraIncomingForeignKeys}
										<button type="button" class="schema-section-toggle" onclick={() => (incomingExpanded = !incomingExpanded)}>
											{incomingExpanded ? `Show first ${SECTION_LIMITS.incoming}` : `Show all ${selectedTable.incomingForeignKeys.length}`}
										</button>
									{:else}
										<span>{selectedTable.incomingForeignKeys.length}</span>
									{/if}
								</div>
								{#if selectedTable.incomingForeignKeys.length === 0}
									<p class="schema-empty">No incoming references in this snapshot.</p>
								{:else}
									<ul class="schema-link-list">
										{#each visibleIncomingForeignKeys as link, index (`${link.fromTable}-${link.fromColumn}-${index}`)}
											<li>
												<button type="button" class="schema-inline-link" onclick={() => selectTable(link.fromTable)}>{link.fromTable}.{link.fromColumn}</button>
												<span>targets</span>
												<strong>{selectedTable.name}.{link.toColumn}</strong>
											</li>
										{/each}
									</ul>
								{/if}
							</article>
						</div>
					{:else if detailTab === "companions"}
						<article class="schema-detail-card schema-detail-card-exception">
							<div class="schema-detail-card-head">
								<div>
									<h3>Companion tables</h3>
									<p class="schema-section-note">Showing {visibleCompanionTables.length} of {selectedCompanionTables.length}</p>
								</div>
								{#if hasExtraCompanionTables}
									<button type="button" class="schema-section-toggle" onclick={() => (companionsExpanded = !companionsExpanded)}>
										{companionsExpanded ? `Show first ${SECTION_LIMITS.companions}` : `Show all ${selectedCompanionTables.length}`}
									</button>
								{:else}
									<span>{selectedCompanionTables.length}</span>
								{/if}
							</div>
							{#if selectedCompanionTables.length === 0}
								<p class="schema-empty">No name-pattern companion tables matched this table.</p>
							{:else}
								<div class="schema-companion-grid">
									{#each visibleCompanionTables as table (table.name)}
										<button type="button" class="schema-companion-card" onclick={() => selectTable(table.name)}>
											<strong>{table.name}</strong>
											<span>{table.columnCount} cols · {table.foreignKeyCount} refs</span>
										</button>
									{/each}
								</div>
							{/if}
						</article>
					{/if}
				</section>
			{/if}
		</div>
	</section>

	<!-- <section class="schema-panel schema-panel--snapshot">
		<div class="schema-section-head">
			<h2>Database Overview</h2>
			<p>Just some neat stats about the database.</p>
		</div>
		<div class="schema-snapshot-stats" aria-label="Schema browser stats">
			<article class="schema-stat-card">
				<span class="schema-stat-value">{formatNumber(schemaData.stats.tableCount)}</span>
				<h2>Tables</h2>
				<p>Core Civ V tables captured in the schema graph.</p>
			</article>
			<article class="schema-stat-card">
				<span class="schema-stat-value">{formatNumber(schemaData.stats.columnCount)}</span>
				<h2>Columns</h2>
				<p>Total columns across all the tables.</p>
			</article>
			<article class="schema-stat-card">
				<span class="schema-stat-value">{formatNumber(schemaData.stats.foreignKeyCount)}</span>
				<h2>Foreign keys</h2>
				<p>Outgoing relationships tracked for companion-table and dependency inspection.</p>
			</article>
			<article class="schema-stat-card">
				<span class="schema-stat-value">{formatNumber(schemaData.stats.rowCount)}</span>
				<h2>Rows</h2>
				<p>Total data rows bundled from each table.</p>
			</article>
			<article class="schema-stat-card">
				<span class="schema-stat-value">{AVERAGE_COLUMNS_PER_TABLE}</span>
				<h2>Avg Columns / Table</h2>
				<p>Useful shorthand for how wide Civ V tables tend to be across the snapshot.</p>
			</article>
			<article class="schema-stat-card">
				<span class="schema-stat-value">{AVERAGE_ROWS_PER_TABLE}</span>
				<h2>Avg Rows / Table</h2>
				<p>Quick density read before you dive into full row data for a given table.</p>
			</article>
		</div>
		<div class="schema-summary-grid">
			<article class="schema-summary-card">
				<span class="schema-kicker">LE CHUNKS</span>
				<h3>Widest tables</h3>
				<ul class="schema-summary-list">
					{#each WIDEST_TABLES as item (item.name)}
						<li>
							<button type="button" class="schema-inline-link" onclick={() => selectTable(item.name)}>{item.name}</button>
							<span>{item.columnCount} columns</span>
						</li>
					{/each}
				</ul>
			</article>
			<article class="schema-summary-card">
				<span class="schema-kicker">SOCIAL BUTTERFLIES</span>
				<h3>Most linked tables</h3>
				<ul class="schema-summary-list">
					{#each LINKED_TABLES as item (item.name)}
						<li>
							<button type="button" class="schema-inline-link" onclick={() => selectTable(item.name)}>{item.name}</button>
							<span>{item.foreignKeyCount} foreign keys</span>
						</li>
					{/each}
				</ul>
			</article>
			<article class="schema-summary-card">
				<span class="schema-kicker">ABSOLUTE UNITS</span>
				<h3>Row-heavy tables</h3>
				<ul class="schema-summary-list">
					{#each LARGEST_TABLES as item (item.name)}
						<li>
							<button type="button" class="schema-inline-link" onclick={() => selectTable(item.name)}>{item.name}</button>
							<span>{formatNumber(item.rowCount)} rows</span>
						</li>
					{/each}
				</ul>
			</article>
		</div>
	</section> -->
</section>

<style>
	.schema-page {
		--schema-bg: linear-gradient(180deg, color-mix(in srgb, var(--page-background, #0f1014) 85%, #17304d 15%) 0%, color-mix(in srgb, var(--page-background, #0f1014) 92%, #08131f 8%) 100%);
		--schema-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #35658c 28%);
		--schema-copy: color-mix(in srgb, currentColor 80%, transparent);
		--schema-highlight: #8dc7ff;
		--schema-highlight-strong: #d6ecff;
		--schema-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 90%, #11263a 10%);
		--scrollbar-thumb: color-mix(in srgb, var(--schema-highlight) 78%, #08131f 22%);
		--scrollbar-thumb-hover: color-mix(in srgb, var(--schema-highlight) 88%, white 12%);
		--scrollbar-track: color-mix(in srgb, var(--schema-panel) 82%, #08131f 18%);
		--scrollbar-corner: color-mix(in srgb, var(--schema-panel) 88%, #08131f 12%);
		display: grid;
		gap: 1.15rem;
	}

	.schema-hero,
	.schema-panel,
	.schema-stat-card {
		background: var(--schema-panel);
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.25);
		border: 1px solid var(--schema-border);
		border-radius: 1.5rem;
	}

	.schema-hero,
	.schema-panel {
		padding-block: 1.3rem;
		padding-inline: 1.3rem;
	}

	.schema-hero {
		background: var(--schema-bg);
	}

	.schema-eyebrow,
	.schema-kicker {
		color: var(--schema-highlight);
		font-size: 0.76rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		margin: 0 0 0.45rem;
	}

	.schema-hero h1,
	.schema-section-head h2,
	.schema-detail-hero h2,
	.schema-stat-card h2,
	.schema-summary-card h3,
	.schema-detail-card h3,
	.schema-quick-card h3,
	.schema-table-card h3 {
		margin: 0;
	}

	.schema-hero p,
	.schema-section-head p,
	.schema-stat-card p,
	.schema-table-card p,
	.schema-detail-card p,
	.schema-quick-card p,
	.schema-summary-card span,
	.schema-empty,
	.schema-column-row p {
		color: var(--schema-copy);
		line-height: 1.45;
	}

	.schema-hero-links,
	.schema-filter-group,
	.schema-table-tags,
	.schema-column-flags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.schema-link,
	.schema-inline-link,
	.schema-filter-chip,
	.schema-companion-card,
	.schema-quick-card,
	.schema-table-card {
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease;
	}

	.schema-link,
	.schema-inline-link {
		color: var(--schema-highlight-strong);
		text-decoration: none;
	}

	.schema-link {
		align-items: center;
		display: inline-flex;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--schema-border);
		border-radius: 999px;
		padding-block: 0.75rem;
		padding-inline: 1rem;

		&:hover {
			color: white;
		}
	}

	.schema-inline-link:hover {
		color: white;
	}

	.schema-snapshot-stats {
		display: grid;
		gap: 0.85rem;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-block-end: 0.85rem;
	}

	.schema-stat-card {
		padding-block: 1rem;
		padding-inline: 1rem;
	}

	.schema-stat-value {
		display: block;
		color: var(--schema-highlight-strong);
		font-size: clamp(1.6rem, 4vw, 2.5rem);
		font-weight: 700;
		margin-block-end: 0.45rem;
	}

	.schema-section-head {
		margin-block-end: 0.9rem;
	}

	.schema-quick-grid,
	.schema-summary-grid {
		display: grid;
		gap: 0.8rem;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.schema-quick-card,
	.schema-companion-card,
	.schema-table-card,
	.schema-filter-chip,
	.schema-inline-link {
		font: inherit;
	}

	.schema-quick-card,
	.schema-companion-card,
	.schema-table-card,
	.schema-filter-chip,
	.schema-inline-link {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--schema-border);
		cursor: pointer;
	}

	.schema-quick-card,
	.schema-companion-card,
	.schema-table-card {
		text-align: left;
		border-radius: 1.1rem;
		padding-block: 0.85rem;
		padding-inline: 0.9rem;
	}

	.schema-quick-card.is-active,
	.schema-table-card.is-active,
	.schema-filter-chip.is-active,
	.schema-companion-card:hover,
	.schema-quick-card:hover,
	.schema-table-card:hover {
		background: rgba(141, 199, 255, 0.1);
		border-color: color-mix(in srgb, var(--schema-highlight) 70%, white 30%);
		transform: translateY(-1px);
	}

	.schema-quick-head,
	.schema-table-card-head,
	.schema-detail-card-head,
	.schema-list-head,
	.schema-column-row,
	.schema-summary-list li,
	.schema-link-list li {
		display: flex;
		gap: 0.8rem;
		justify-content: space-between;
	}

	.schema-quick-head span,
	.schema-table-card-head span,
	.schema-detail-card-head span,
	.schema-list-head span,
	.schema-summary-list span,
	.schema-link-list span {
		color: var(--schema-copy);
		white-space: nowrap;
	}

	.schema-quick-card h3,
	.schema-table-card h3,
	.schema-detail-card h3,
	.schema-summary-card h3,
	.schema-inline-link,
	.schema-companion-card strong {
		line-height: 1.12;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.schema-table-card p,
	.schema-quick-card p,
	.schema-summary-card span,
	.schema-link-list span,
	.schema-column-row p,
	.schema-table-match-list li {
		font-size: 0.9rem;
		word-break: break-word;
		margin-block-start: 0.18rem;
		margin-inline: 0;
	}

	.schema-table-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.55rem;
		color: var(--schema-copy);
		font-size: 0.84rem;
		margin-block-start: 0.18rem;
	}

	.schema-table-meta span {
		white-space: nowrap;
	}

	.schema-table-match-list {
		display: grid;
		gap: 0.22rem;
		color: var(--schema-copy);
		padding: 0;
		margin-block-start: 0.35rem;
		margin-inline: 0;
		margin-block-end: 0;
		list-style: none;
	}

	.schema-empty-state {
		align-content: start;
		display: grid;
		gap: 0.6rem;
		justify-items: start;
	}

	.schema-empty-note {
		color: var(--schema-copy);
		font-size: 0.86rem;
		margin: 0;
	}

	.schema-empty-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.schema-toolbar {
		display: grid;
		gap: 0.8rem;
		margin-block-end: 0.85rem;
	}

	.schema-toolbar-primary,
	.schema-toolbar-secondary {
		display: flex;
		gap: 0.8rem;
	}

	.schema-toolbar-primary {
		align-items: end;
		grid-template-columns: minmax(0, 1fr) minmax(13rem, 15rem);
	}

	.schema-toolbar-label {
		color: var(--schema-highlight);
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.schema-search-field {
		inline-size: 100%;
		display: grid;
		gap: 0.45rem;
	}

	.schema-search-field span {
		color: var(--schema-copy);
		font-size: 0.9rem;
	}

	.schema-search-field input {
		inline-size: 100%;
		color: inherit;
		background: rgba(0, 0, 0, 0.24);
		border: 1px solid var(--schema-border);
		border-radius: 0.95rem;
		padding-block: 0.82rem;
		padding-inline: 0.9rem;
	}

	.schema-sort-field,
	.schema-local-filter,
	.schema-recent-group {
		display: grid;
		gap: 0.45rem;
	}

	.schema-sort-field span,
	.schema-local-filter span {
		color: var(--schema-copy);
		font-size: 0.8rem;
	}

	.schema-sort-field select,
	.schema-local-filter input {
		inline-size: 100%;
		color: inherit;
		font: inherit;
		background: rgba(0, 0, 0, 0.24);
		border: 1px solid var(--schema-border);
		border-radius: 0.95rem;
		padding-block: 0.75rem;
		padding-inline: 0.85rem;
	}

	.schema-mode-group,
	.schema-recent-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.schema-mode-group {
		display: inline-flex;
		flex-wrap: nowrap;
		gap: 0;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--schema-border);
		border-radius: 999px;
	}

	.schema-mode-group:has(.schema-filter-chip--scope) {
		inline-size: fit-content;
	}

	.schema-filter-chip--scope {
		background: transparent;
		border: none;
		border-inline-end: 1px solid var(--schema-border);
		border-radius: 0;
		padding-block: 0.5rem;
		padding-inline: 0.85rem;
		transform: none;
	}

	.schema-filter-chip--scope:first-child {
		border-radius: 999px 0 0 999px;
	}

	.schema-filter-chip--scope:last-child {
		border-inline-end: none;
		border-radius: 0 999px 999px 0;
	}

	.schema-filter-chip--scope:hover {
		background: rgba(141, 199, 255, 0.08);
		border-color: transparent;
		transform: none;
	}

	.schema-filter-chip--scope.is-active {
		background: rgba(141, 199, 255, 0.16);
		border-color: transparent;
		transform: none;
	}

	.schema-filter-chip {
		align-items: center;
		display: inline-flex;
		gap: 0.5rem;
		font-size: 0.88rem;
		border-radius: 999px;
		padding-block: 0.5rem;
		padding-inline: 0.75rem;
	}

	.schema-filter-chip span {
		height: 1.75rem;
		display: inline-grid;
		place-items: center;
		min-inline-size: 2rem;
		font-size: 0.8rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		text-box: trim-both;
	}

	.schema-mode-group > .schema-filter-chip--scope {
		border-radius: 0;
	}

	.schema-mode-group > .schema-filter-chip--scope:first-child {
		border-radius: 999px 0 0 999px;
	}

	.schema-mode-group > .schema-filter-chip--scope:last-child {
		border-inline-end: none;
		border-radius: 0 999px 999px 0;
	}

	.schema-filter-group--toggle {
		align-items: center;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--schema-border);
		border-radius: 999px;
		display: inline-flex;
		gap: 0.35rem;
		padding: 0.3rem;
	}

	.schema-filter-chip--toggle {
		background: transparent;
		border: 1px solid transparent;
		border-radius: 999px;
		padding-block: 0.42rem;
		padding-inline: 0.7rem;
		transform: none;
	}

	.schema-filter-chip--toggle:hover {
		background: rgba(141, 199, 255, 0.08);
		border-color: transparent;
		transform: none;
	}

	.schema-filter-chip--toggle.is-active {
		background: rgba(141, 199, 255, 0.14);
		border-color: color-mix(in srgb, var(--schema-highlight) 70%, white 30%);
		transform: none;
	}

	.schema-filter-chip--toggle span {
		background: rgba(255, 255, 255, 0.06);
	}

	.schema-filter-chip--toggle.is-active span {
		background: rgba(141, 199, 255, 0.18);
	}

	.schema-explorer-grid {
		display: grid;
		gap: 0.85rem;
		grid-template-columns: minmax(17rem, 20rem) minmax(0, 1fr);
	}

	.schema-list-panel,
	.schema-detail-card,
	.schema-summary-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid var(--schema-border);
		border-radius: 1.2rem;
	}

	.schema-list-panel,
	.schema-summary-card,
	.schema-detail-card {
		padding-block: 0.9rem;
		padding-inline: 0.9rem;
	}

	.schema-list-panel {
		position: sticky;
		inset-block-start: 1rem;
		max-block-size: calc(100dvh - 2rem);
		min-block-size: 0;
		align-self: stretch;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.schema-table-list,
	.schema-column-list {
		display: grid;
		gap: 0.5rem;
	}

	.schema-table-list {
		min-block-size: 0;
		align-content: start;
		flex: 1 1 auto;
		padding-inline-end: 0.15rem;
		overflow: auto;
	}

	.schema-column-list {
		max-block-size: 44rem;
		padding-inline-end: 0.15rem;
		overflow: auto;
	}

	.schema-detail-panel {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.schema-detail-hero {
		display: flex;
		gap: 0.8rem;
		justify-content: space-between;
		background: linear-gradient(135deg, rgba(141, 199, 255, 0.12), rgba(255, 255, 255, 0.02));
		border: 1px solid var(--schema-border);
		border-radius: 1.2rem;
		padding-block: 0.9rem;
		padding-inline: 1rem;
	}

	.schema-detail-hero-copy {
		display: grid;
		gap: 0.75rem;
	}

	.schema-detail-match-summary {
		display: grid;
		gap: 0.35rem;
	}

	.schema-detail-actions {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
	}

	.schema-detail-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.schema-detail-quick-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.schema-tab-button {
		color: var(--schema-copy);
		font: inherit;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--schema-border);
		border-radius: 999px;
		padding-block: 0.46rem;
		padding-inline: 0.78rem;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			color 140ms ease;
		cursor: pointer;
	}

	.schema-tab-button.is-active,
	.schema-tab-button:hover {
		color: var(--schema-highlight-strong);
		background: rgba(141, 199, 255, 0.1);
		border-color: color-mix(in srgb, var(--schema-highlight) 70%, white 30%);
	}

	.schema-detail-metrics {
		align-self: start;
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.schema-metric-chip,
	.schema-tag {
		align-items: center;
		display: inline-flex;
		gap: 0.35rem;
		font-size: 0.74rem;
		background: rgba(255, 255, 255, 0.09);
		border-radius: 0.5rem;
		padding-block: 0.28rem;
		padding-inline: 0.52rem;
	}

	.schema-detail-metrics .schema-metric-chip {
		font-size: 0.82rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding-block: 0.52rem;
		padding-inline: 0.78rem;
	}

	.schema-detail-metrics .schema-metric-chip strong {
		color: var(--schema-highlight-strong);
		font-size: 0.98rem;
		line-height: 1.1;
	}

	.schema-detail-metrics .schema-metric-chip span {
		color: var(--schema-copy);
		font-size: 0.82rem;
		line-height: 1.1;
	}

	.schema-tag--key {
		color: var(--schema-highlight-strong);
		background: rgba(141, 199, 255, 0.14);
	}

	.schema-detail-primary-grid {
		display: grid;
		gap: 0.85rem;
		grid-template-columns: minmax(18rem, 0.92fr) minmax(0, 1.35fr);
	}

	.schema-detail-secondary-grid {
		display: grid;
		gap: 0.85rem;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.schema-detail-secondary-grid--relationships {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.schema-detail-card-head {
		align-items: start;
	}

	.schema-card-tools {
		display: grid;
		gap: 0.6rem;
		justify-items: end;
	}

	.schema-section-note {
		color: var(--schema-copy);
		font-size: 0.8rem;
		margin-block-start: 0.2rem;
		margin-inline: 0;
		margin-block-end: 0;
	}

	.schema-section-toggle {
		color: var(--schema-highlight-strong);
		font: inherit;
		white-space: nowrap;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--schema-border);
		border-radius: 999px;
		padding-block: 0.42rem;
		padding-inline: 0.7rem;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease;
		cursor: pointer;

		&:hover {
			background: rgba(141, 199, 255, 0.1);
			border-color: color-mix(in srgb, var(--schema-highlight) 70%, white 30%);
			transform: translateY(-1px);
		}

		&:disabled {
			opacity: 0.48;
			background: rgba(255, 255, 255, 0.03);
			border-color: var(--schema-border);
			cursor: default;
			transform: none;
		}
	}

	.schema-row-toolbar {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		justify-content: flex-end;
	}

	.schema-match-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		justify-content: flex-end;
	}

	.schema-rows-tab {
		display: grid;
		gap: 0.85rem;
	}

	.schema-query-builder-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.schema-query-builder-grid {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.schema-query-condition-list {
		display: grid;
		gap: 0.6rem;
	}

	.schema-query-condition {
		align-items: end;
		display: grid;
		gap: 0.7rem;
		grid-template-columns: minmax(12rem, 1.1fr) minmax(10rem, 0.9fr) minmax(12rem, 1fr) auto;
		border-block-start: 1px solid rgba(255, 255, 255, 0.08);
		padding-block-start: 0.6rem;

		&:first-child {
			border-block-start: none;
			padding-block-start: 0;
		}
	}

	.schema-query-placeholder {
		min-block-size: 3rem;
		align-items: center;
		display: grid;
		color: var(--schema-copy);
		font-size: 0.84rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed var(--schema-border);
		border-radius: 0.95rem;
		padding-block: 0.75rem;
		padding-inline: 0.85rem;
	}

	.schema-query-preview {
		display: grid;
		gap: 0.55rem;
	}

	.schema-query-preview-head {
		align-items: start;
		display: flex;
		gap: 0.8rem;
		justify-content: space-between;
	}

	.schema-query-preview-title {
		margin: 0;
	}

	.schema-sql-preview {
		color: var(--schema-highlight-strong);
		line-height: 1.5;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		padding-block: 0.85rem;
		padding-inline: 0.95rem;
		margin: 0;
		overflow: auto;
	}

	.schema-rows-layout {
		display: grid;
		gap: 0.85rem;
		grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
	}

	.schema-column-row,
	.schema-link-list li,
	.schema-summary-list li {
		align-items: start;
		border-block-start: 1px solid rgba(255, 255, 255, 0.08);
		padding-block-start: 0.45rem;
	}

	.schema-column-row:first-child,
	.schema-link-list li:first-child,
	.schema-summary-list li:first-child {
		border-block-start: none;
		padding-block-start: 0;
	}

	.schema-link-list,
	.schema-summary-list {
		display: grid;
		gap: 0.5rem;
		padding: 0.5rem 0 0;
		margin: 0;
		list-style: none;
	}

	.schema-link-list li {
		align-items: start;
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) auto minmax(0, 1fr);
	}

	.schema-inline-link {
		text-align: left;
		background: none;
		border: none;
		padding: 0;
	}

	.schema-inline-link--chip {
		align-items: center;
		display: inline-flex;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--schema-border);
		border-radius: 999px;
		padding-block: 0.42rem;
		padding-inline: 0.7rem;
	}

	.schema-row-preview-wrap {
		--schema-sticky-primary-width: 20rem;
		max-block-size: 44rem;
		background: rgba(0, 0, 0, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		overflow: auto;
	}

	.schema-row-preview-table {
		inline-size: max-content;
		min-inline-size: 100%;
		font-size: 0.83rem;
		border-collapse: separate;
		border-spacing: 0;
	}

	.schema-row-preview-table th,
	.schema-row-preview-table td {
		max-width: 13rem;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		border-block-end: 1px solid rgba(255, 255, 255, 0.08);
		padding-block: 0.55rem;
		padding-inline: 0.7rem;
		overflow: hidden;
	}

	.schema-row-preview-table thead th {
		position: sticky;
		inset-block-start: 0;
		z-index: 2;
		color: var(--schema-highlight-strong);
		background: color-mix(in srgb, var(--schema-panel) 88%, #102236 12%);
	}

	.schema-row-index-head,
	.schema-row-index-cell {
		inline-size: 3.2rem;
		min-inline-size: 3.2rem;
	}

	.schema-row-preview-table thead th.is-sticky-primary,
	.schema-row-preview-table tbody td.is-sticky-primary {
		position: sticky;
		inset-inline-start: var(--schema-sticky-left);
	}

	.schema-row-preview-table thead th.is-sticky-primary {
		z-index: 3;
	}

	.schema-row-preview-table tbody td.is-sticky-primary {
		z-index: 1;
		background: color-mix(in srgb, var(--schema-panel) 92%, #0a1622 8%);
	}

	.schema-row-preview-table th.is-sticky-primary,
	.schema-row-preview-table td.is-sticky-primary {
		inline-size: var(--schema-sticky-primary-width);
		max-inline-size: var(--schema-sticky-primary-width);
		min-inline-size: var(--schema-sticky-primary-width);
	}

	.schema-row-preview-table tbody tr.is-row-match td {
		background: rgba(141, 199, 255, 0.08);
	}

	.schema-row-preview-table tbody tr.is-row-selected td {
		background: rgba(141, 199, 255, 0.14);
	}

	.schema-row-preview-table tbody tr.is-row-match td.is-sticky-primary {
		background: color-mix(in srgb, var(--schema-panel) 78%, #19344f 22%);
	}

	.schema-row-preview-table tbody tr.is-row-selected td.is-sticky-primary {
		background: color-mix(in srgb, var(--schema-panel) 70%, #2a5375 30%);
	}

	.schema-row-preview-table td.is-cell-match {
		color: white;
		background: rgba(141, 199, 255, 0.14);
		box-shadow: inset 0 0 0 1px rgba(141, 199, 255, 0.24);
	}

	.schema-row-preview-table tbody tr:last-child td {
		border-block-end: none;
	}

	.schema-row-preview-table td.is-empty-cell {
		color: color-mix(in srgb, currentColor 54%, transparent);
		font-style: italic;
	}

	.schema-row-preview-table tbody tr {
		cursor: pointer;
	}

	.schema-cell-link {
		color: var(--schema-highlight-strong);
		font: inherit;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.schema-cell-link:hover {
		color: white;
	}

	.schema-row-inspector {
		min-block-size: 0;
		display: grid;
		gap: 0.35rem;
		padding-inline-end: 0.15rem;
		margin: 0;
		overflow: auto;
	}

	.schema-row-inspector div {
		display: grid;
		gap: 0.08rem;
		border-block-start: 1px solid rgba(255, 255, 255, 0.08);
		padding-block-start: 0.32rem;
	}

	.schema-row-inspector div:first-child {
		border-block-start: none;
		padding-block-start: 0;
	}

	.schema-row-inspector dt {
		color: var(--schema-copy);
		font-size: 0.72rem;
		letter-spacing: 0.02em;
		line-height: 1.15;
	}

	.schema-row-inspector dd {
		font-size: 0.88rem;
		line-height: 1.2;
		overflow-wrap: anywhere;
		word-break: break-word;
		margin: 0;
	}

	.schema-detail-card-exception {
		background: none;
		border: none;
		border-radius: 0;
	}

	.schema-detail-card-inspector .schema-detail-card-head {
		gap: 0.45rem;
	}

	.schema-detail-card-inspector .schema-detail-card-head h3 {
		font-size: 1.05rem;
		line-height: 1.1;
	}

	.schema-detail-card-inspector .schema-section-note {
		font-size: 0.74rem;
		line-height: 1.25;
		margin-block-start: 0.1rem;
	}

	.schema-detail-card-inspector .schema-detail-card-head > span {
		font-size: 0.82rem;
	}

	.schema-companion-grid {
		display: grid;
		gap: 0.6rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.schema-companion-card span {
		display: block;
		color: var(--schema-copy);
		font-size: 0.84rem;
		margin-block-start: 0.25rem;
	}

	.schema-detail-card-inspector {
		position: sticky;
		inset-block-start: 1rem;
		max-block-size: calc(100dvh - 2rem);
		min-block-size: 0;
		overflow: hidden;
	}

	code {
		font-family: "SFMono-Regular", "Consolas", "Liberation Mono", monospace;
		font-size: 0.92em;
	}

	@media (max-width: 1320px) {
		.schema-detail-primary-grid {
			grid-template-columns: 1fr;
		}

		.schema-detail-secondary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.schema-query-builder-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.schema-query-condition {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.schema-rows-layout {
			grid-template-columns: 1fr;
		}

		.schema-detail-card-inspector {
			position: static;
			inset-block-start: auto;
			max-height: none;
		}
	}

	@media (max-width: 1100px) {
		.schema-snapshot-stats,
		.schema-quick-grid,
		.schema-summary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.schema-explorer-grid {
			grid-template-columns: 1fr;
		}

		.schema-list-panel {
			position: static;
			inset-block-start: auto;
			max-height: none;
		}

		.schema-detail-metrics {
			min-inline-size: 0;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.schema-toolbar-primary {
			grid-template-columns: 1fr;
		}

		.schema-row-toolbar,
		.schema-match-nav {
			justify-content: flex-start;
		}

		.schema-card-tools {
			justify-items: stretch;
		}
	}

	@media (max-width: 720px) {
		.schema-hero,
		.schema-panel,
		.schema-stat-card {
			padding-block: 1.1rem;
			padding-inline: 1.1rem;
		}

		.schema-snapshot-stats,
		.schema-quick-grid,
		.schema-summary-grid,
		.schema-detail-primary-grid,
		.schema-detail-secondary-grid,
		.schema-companion-grid,
		.schema-detail-metrics,
		.schema-query-builder-grid,
		.schema-query-condition {
			grid-template-columns: 1fr;
		}

		.schema-detail-hero,
		.schema-column-row,
		.schema-link-list li,
		.schema-summary-list li,
		.schema-quick-head,
		.schema-table-card-head,
		.schema-detail-card-head,
		.schema-list-head {
			display: flex;
			flex-direction: column;
		}

		.schema-section-toggle {
			white-space: normal;
		}

		.schema-table-card-head span,
		.schema-quick-head span,
		.schema-detail-card-head span,
		.schema-list-head span,
		.schema-summary-list span,
		.schema-link-list span {
			white-space: normal;
		}
	}

	:global(:root[data-theme="light"]) .schema-page {
		--schema-bg: linear-gradient(180deg, rgba(231, 242, 252, 0.95) 0%, rgba(245, 248, 252, 0.98) 100%);
		--schema-border: rgba(37, 67, 96, 0.16);
		--schema-copy: rgba(32, 48, 62, 0.84);
		--schema-highlight: #1c5a8f;
		--schema-highlight-strong: #123a59;
		--schema-panel: rgba(255, 255, 255, 0.96);
	}

	:global(:root[data-theme="light"]) .schema-link,
	:global(:root[data-theme="light"]) .schema-list-panel,
	:global(:root[data-theme="light"]) .schema-detail-card,
	:global(:root[data-theme="light"]) .schema-summary-card,
	:global(:root[data-theme="light"]) .schema-search-field input,
	:global(:root[data-theme="light"]) .schema-sort-field select,
	:global(:root[data-theme="light"]) .schema-local-filter input,
	:global(:root[data-theme="light"]) .schema-table-card,
	:global(:root[data-theme="light"]) .schema-quick-card,
	:global(:root[data-theme="light"]) .schema-filter-chip,
	:global(:root[data-theme="light"]) .schema-companion-card,
	:global(:root[data-theme="light"]) .schema-inline-link--chip {
		background: rgba(255, 255, 255, 0.82);
	}
</style>
