<svelte:options runes={true} />

<script>
	import { onMount, tick } from "svelte";
	import schemaData from "../data/civ-schema.json";
	import civTextEnUs from "../data/civ-text-en-us.json";
	import enlightenmentEraData from "../data/enlightenment-era-tech-tree.json";

	const TABLE_BY_NAME = new Map(schemaData.tables.map((table) => [table.name, table]));
	const BASE_ROWS_BY_TABLE = new Map(schemaData.tables.map((table) => [table.name, table.rows || []]));
	const BASE_TECHNOLOGY_ROWS = BASE_ROWS_BY_TABLE.get("Technologies") || [];
	const BASE_ERA_ROWS = BASE_ROWS_BY_TABLE.get("Eras") || [];
	const BASE_TEXT_ROWS = BASE_ROWS_BY_TABLE.get("Language_en_US") || [];
	const BASE_PREREQ_ROWS = BASE_ROWS_BY_TABLE.get("Technology_PrereqTechs") || [];
	const OR_PREREQ_ROWS = BASE_ROWS_BY_TABLE.get("Technology_ORPrereqTechs") || [];
	const numberFormatter = new Intl.NumberFormat("en-US");
	const DISPLAY_LIMITS = {
		effects: 5,
		previewItems: 10,
	};
	const searchableCategoryFields = ["label", "detail", "rawType"];
	const SUPPORT_EFFECT_DEFS = [
		{ key: "AllowsEmbarking", label: "Embark" },
		{ key: "AllowsDefensiveEmbarking", label: "Defensive embark" },
		{ key: "EmbarkedAllWaterPassage", label: "Ocean crossing" },
		{ key: "AllowsBarbarianBoats", label: "Barbarian boats" },
		{ key: "MapTrading", label: "Map trading" },
		{ key: "TechTrading", label: "Tech trading" },
		{ key: "GoldTrading", label: "Gold trading" },
		{ key: "AllowEmbassyTradingAllowed", label: "Embassy trading" },
		{ key: "OpenBordersTradingAllowed", label: "Open borders" },
		{ key: "DefensivePactTradingAllowed", label: "Defensive pacts" },
		{ key: "ResearchAgreementTradingAllowed", label: "Research agreements" },
		{ key: "TradeAgreementTradingAllowed", label: "Trade agreements" },
		{ key: "PermanentAllianceTradingAllowed", label: "Permanent alliances" },
		{ key: "BridgeBuilding", label: "Bridge building" },
		{ key: "WaterWork", label: "Water work" },
		{ key: "TriggersArchaeologicalSites", label: "Archaeology" },
		{ key: "AllowsWorldCongress", label: "World Congress" },
		{ key: "MapVisible", label: "Map visible" },
		{ key: "Trade", label: "Tradable" },
		{ key: "GoodyTech", label: "Ruins tech" },
		{ key: "Repeat", label: "Repeatable" },
		{ key: "EndsGame", label: "Ends game" },
	];
	const BASE_TEXT_BY_TAG = new Map([...Object.entries(civTextEnUs || {}), ...buildTextLookup(BASE_TEXT_ROWS).entries()]);

	let searchQuery = $state("");
	let selectedEras = $state([]);
	let eraFlow = $state("horizontal");
	let includeEnlightenmentEra = $state(false);

	const TEXT_BY_TAG = $derived.by(() => (includeEnlightenmentEra ? new Map([...BASE_TEXT_BY_TAG.entries(), ...Object.entries(enlightenmentEraData.textByTag || {})]) : BASE_TEXT_BY_TAG));
	const OVERLAY_ROWS_BY_TABLE = $derived(new Map(Object.entries(enlightenmentEraData.tables || {})));
	const TECHNOLOGY_ROWS = $derived(includeEnlightenmentEra ? enlightenmentEraData.technologies || [] : BASE_TECHNOLOGY_ROWS);
	const ERA_ROWS = $derived(includeEnlightenmentEra ? enlightenmentEraData.eras || [] : BASE_ERA_ROWS);
	const PREREQ_ROWS = $derived(includeEnlightenmentEra ? enlightenmentEraData.prereqs || [] : BASE_PREREQ_ROWS);
	const TECH_ROW_BY_TYPE = $derived(new Map(TECHNOLOGY_ROWS.map((row) => [row.Type, row])));
	const ERA_BY_TYPE = $derived(new Map(ERA_ROWS.map((row, index) => [row.Type, { ...row, index }])));
	const TECH_GRAPH = $derived(buildTechGraph());
	const ERA_GROUPS = $derived(buildEraGroups(TECH_GRAPH));
	const totalUnlockEntries = $derived(TECH_GRAPH.reduce((sum, tech) => sum + tech.unlockCount, 0));
	const totalSupportEntries = $derived(TECH_GRAPH.reduce((sum, tech) => sum + tech.supportCount, 0));

	const normalizedSearch = $derived(normalizeText(searchQuery));
	const hasEraFilter = $derived(selectedEras.length > 0);
	const filteredTechs = $derived.by(() => {
		const eraScoped = hasEraFilter ? TECH_GRAPH.filter((tech) => selectedEras.includes(tech.eraType)) : TECH_GRAPH;
		if (!normalizedSearch) {
			return eraScoped;
		}
		return eraScoped.filter((tech) => matchesTechSearch(tech, normalizedSearch));
	});
	const visibleTechTypes = $derived.by(() => filteredTechs.map((tech) => tech.type));
	const visibleEraGroups = $derived.by(() => ERA_GROUPS.map((era) => buildVisibleEra(era, visibleTechTypes)).filter((era) => era.techs.length));

	function clearEraFilter() {
		selectedEras = [];
	}

	function toggleEraFilter(eraType) {
		selectedEras = selectedEras.includes(eraType) ? selectedEras.filter((entry) => entry !== eraType) : [...selectedEras, eraType];
	}

	onMount(() => {
		if (typeof window === "undefined") {
			return;
		}

		const handleHashNavigation = async () => {
			const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
			if (!hash) {
				return;
			}

			await tick();
			const target = document.getElementById(hash);
			target?.scrollIntoView({ block: "start", behavior: "smooth" });
		};

		void handleHashNavigation();
		window.addEventListener("hashchange", handleHashNavigation);
		return () => window.removeEventListener("hashchange", handleHashNavigation);
	});

	function buildTextLookup(rows) {
		const lookup = new Map();
		for (const row of rows) {
			const tag = String(row?.Tag || row?.tag || row?.Type || "").trim();
			const textValue = extractTextValue(row);
			if (!tag || !textValue) {
				continue;
			}
			lookup.set(tag, String(textValue).trim());
		}
		return lookup;
	}

	function extractTextValue(row) {
		if (!row || typeof row !== "object") {
			return "";
		}
		for (const key of ["Text", "text", "Value", "value", "Description"]) {
			const candidate = row[key];
			if (typeof candidate === "string" && candidate.trim()) {
				return candidate;
			}
		}
		return "";
	}

	function buildTechGraph() {
		const prereqMap = new Map();
		const orPrereqMap = new Map();

		for (const row of PREREQ_ROWS) {
			pushToMapArray(prereqMap, row.TechType, row.PrereqTech);
		}
		for (const row of OR_PREREQ_ROWS) {
			pushToMapArray(orPrereqMap, row.TechType, row.PrereqTech);
		}

		return TECHNOLOGY_ROWS.map((row) => {
			const era = ERA_BY_TYPE.get(row.Era);
			const unlockGroups = buildUnlockGroups(row);
			const supportGroups = buildSupportGroups(row);
			const notableEffects = collectNotableEffects(row);
			return {
				id: row.ID,
				type: row.Type,
				row,
				title: resolveDisplayName(row, "Type"),
				description: resolveText(row.Description),
				help: resolveText(row.Help),
				quote: resolveText(row.Quote),
				descriptionKey: row.Description || "",
				eraType: row.Era || "ERA_UNKNOWN",
				eraLabel: era ? resolveDisplayName(era, "Type") : formatIdentifier(row.Era, ["ERA_"]),
				eraIndex: era?.index ?? Number.MAX_SAFE_INTEGER,
				gridX: Number(row.GridX || 0),
				gridY: Number(row.GridY || 0),
				cost: Number(row.Cost || 0),
				prereqs: (prereqMap.get(row.Type) || []).map((techType) => toTechRef(techType)),
				orPrereqs: (orPrereqMap.get(row.Type) || []).map((techType) => toTechRef(techType)),
				notableEffects,
				unlockGroups,
				supportGroups,
				unlockCount: unlockGroups.reduce((sum, group) => sum + group.items.length, 0),
				supportCount: supportGroups.reduce((sum, group) => sum + group.items.length, 0),
				schemaHref: schemaRowHref("Technologies", row.Type),
			};
		}).sort((left, right) => {
			if (left.eraIndex !== right.eraIndex) {
				return left.eraIndex - right.eraIndex;
			}
			if (left.gridX !== right.gridX) {
				return left.gridX - right.gridX;
			}
			if (left.gridY !== right.gridY) {
				return left.gridY - right.gridY;
			}
			return left.cost - right.cost || left.title.localeCompare(right.title);
		});
	}

	function buildEraGroups(techs) {
		const eras = new Map();
		for (const tech of techs) {
			if (!eras.has(tech.eraType)) {
				eras.set(tech.eraType, {
					eraType: tech.eraType,
					eraLabel: tech.eraLabel,
					eraIndex: tech.eraIndex,
					techs: [],
				});
			}
			eras.get(tech.eraType).techs.push(tech);
		}

		return [...eras.values()]
			.sort((left, right) => left.eraIndex - right.eraIndex)
			.map((era) => ({
				...era,
				columns: [...new Set(era.techs.map((tech) => tech.gridX))].sort((left2, right2) => left2 - right2),
				rows: [...new Set(era.techs.map((tech) => tech.gridY))].sort((left2, right2) => left2 - right2),
			}));
	}

	function buildVisibleEra(era, visibleTypes) {
		const techs = era.techs.filter((tech) => visibleTypes.includes(tech.type));
		if (!techs.length) {
			return { ...era, techs: [], connectors: [] };
		}

		const columns = [...new Set(techs.map((tech) => tech.gridX))].sort((left, right) => left - right);
		const rows = [...new Set(techs.map((tech) => tech.gridY))].sort((left, right) => left - right);
		const columnIndexByGridX = new Map(columns.map((gridX, index) => [gridX, index + 1]));
		const rowIndexByGridY = new Map(rows.map((gridY, index) => [gridY, index + 1]));
		const techByType = new Map(techs.map((tech) => [tech.type, tech]));
		const placedTechs = techs.map((tech) => {
			const sameEraPrereqs = tech.prereqs.filter((prereq) => techByType.has(prereq.type));
			const priorEraPrereqs = tech.prereqs.filter((prereq) => !techByType.has(prereq.type));
			return {
				...tech,
				columnIndex: columnIndexByGridX.get(tech.gridX) || 1,
				rowIndex: rowIndexByGridY.get(tech.gridY) || 1,
				sameEraPrereqs,
				priorEraPrereqs,
				unlockPreview: buildGroupPreview(tech.unlockGroups),
				supportPreview: buildGroupPreview(tech.supportGroups.filter((group) => group.items.length)),
				effectPreview: buildEffectPreview(tech.notableEffects),
			};
		});

		return {
			...era,
			columns,
			rows,
			gridColumns: Math.max(1, columns.length),
			gridRows: Math.max(1, rows.length),
			techs: placedTechs,
			connectors: buildEraConnectors(placedTechs, techByType),
			unlockCount: placedTechs.reduce((sum, tech) => sum + tech.unlockCount, 0),
			supportCount: placedTechs.reduce((sum, tech) => sum + tech.supportCount, 0),
			costMin: Math.min(...placedTechs.map((tech) => tech.cost)),
			costMax: Math.max(...placedTechs.map((tech) => tech.cost)),
		};
	}

	function buildEraConnectors(techs, techByType) {
		const connectors = [];
		for (const tech of techs) {
			for (const prereq of tech.sameEraPrereqs) {
				const source = techByType.get(prereq.type);
				if (!source) {
					continue;
				}
				connectors.push({
					id: `${source.type}-${tech.type}`,
					path: buildConnectorPath(source.columnIndex, source.rowIndex, tech.columnIndex, tech.rowIndex),
				});
			}
		}
		return connectors;
	}

	function buildConnectorPath(sourceColumn, sourceRow, targetColumn, targetRow) {
		const cellWidth = 100;
		const cellHeight = 100;
		const startX = (sourceColumn - 0.08) * cellWidth;
		const startY = (sourceRow - 0.5) * cellHeight;
		const endX = (targetColumn - 0.92) * cellWidth;
		const endY = (targetRow - 0.5) * cellHeight;
		const midX = startX + Math.max(18, (endX - startX) * 0.48);
		return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
	}

	function buildUnlockGroups(tech) {
		return [
			buildEntityGroup({
				id: "units",
				label: "Units",
				tableName: "Units",
				techField: "PrereqTech",
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeUnit(row),
					preview: buildEntityPreview("Units", row),
					href: schemaRowHref("Units", row.Type),
				}),
			}),
			buildEntityGroup({
				id: "buildings",
				label: "Buildings",
				tableName: "Buildings",
				techField: "PrereqTech",
				techValue: tech.Type,
				filter: (row) => Number(row.MaxGlobalInstances || 0) <= 0 && !row.WonderSplashImage,
				buildItem: (row) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeBuilding(row),
					preview: buildEntityPreview("Buildings", row),
					href: schemaRowHref("Buildings", row.Type),
				}),
			}),
			buildEntityGroup({
				id: "world-wonders",
				label: "Wonders",
				tableName: "Buildings",
				techField: "PrereqTech",
				techValue: tech.Type,
				filter: (row) => Number(row.MaxGlobalInstances || 0) > 0 || Boolean(row.WonderSplashImage),
				buildItem: (row) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeBuilding(row),
					preview: buildEntityPreview("Buildings", row),
					href: schemaRowHref("Buildings", row.Type),
				}),
			}),
			buildEntityGroup({
				id: "projects",
				label: "Projects",
				tableName: "Projects",
				techField: "TechPrereq",
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeProject(row),
					preview: buildEntityPreview("Projects", row),
					href: schemaRowHref("Projects", row.Type),
				}),
			}),
			buildEntityGroup({
				id: "processes",
				label: "Processes",
				tableName: "Processes",
				techField: "TechPrereq",
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeProcess(row),
					preview: buildEntityPreview("Processes", row),
					href: schemaRowHref("Processes", row.Type),
				}),
			}),
			buildBuildDerivedGroup(
				tech,
				"improvements",
				"Improvements",
				(build) => build.ImprovementType,
				"Improvements",
				(row, build) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeImprovement(row, build),
					preview: buildEntityPreview("Improvements", row, build),
					href: schemaRowHref("Improvements", row.Type),
				}),
			),
			buildBuildDerivedGroup(
				tech,
				"routes",
				"Routes",
				(build) => build.RouteType,
				"Routes",
				(row, build) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeRoute(row, build),
					preview: buildEntityPreview("Routes", row, build),
					href: schemaRowHref("Routes", row.Type),
				}),
			),
			buildEntityGroup({
				id: "actions",
				label: "Actions",
				tableName: "Builds",
				techField: "PrereqTech",
				techValue: tech.Type,
				filter: (row) => !row.ImprovementType && !row.RouteType,
				buildItem: (row) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeBuild(row),
					preview: buildEntityPreview("Builds", row),
					href: schemaRowHref("Builds", row.Type),
				}),
			}),
			buildEntityGroup({
				id: "promotions",
				label: "Promotions",
				tableName: "UnitPromotions",
				techField: "TechPrereq",
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizePromotion(row),
					preview: buildEntityPreview("UnitPromotions", row),
					href: schemaRowHref("UnitPromotions", row.Type),
				}),
			}),
			buildEntityGroup({
				id: "resources-reveal",
				label: "Reveal",
				tableName: "Resources",
				techField: "TechReveal",
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeResource(row, "Reveal"),
					preview: buildEntityPreview("Resources", row),
					href: schemaRowHref("Resources", row.Type),
				}),
			}),
			buildEntityGroup({
				id: "resources-trade",
				label: "Trade",
				tableName: "Resources",
				techField: "TechCityTrade",
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveDisplayName(row, "Type"),
					rawType: row.Type,
					detail: summarizeResource(row, "City trade"),
					preview: buildEntityPreview("Resources", row),
					href: schemaRowHref("Resources", row.Type),
				}),
			}),
		];
	}

	function buildSupportGroups(tech) {
		return [
			buildDeltaGroup({
				id: "improvement-yields",
				label: "Imp yields",
				rows: [
					...tableRows("Improvement_TechYieldChanges").map((row) => ({ ...row, condition: "Base" })),
					...tableRows("Improvement_TechFreshWaterYieldChanges").map((row) => ({ ...row, condition: "Fresh water" })),
					...tableRows("Improvement_TechNoFreshWaterYieldChanges").map((row) => ({ ...row, condition: "No fresh water" })),
				],
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveTypeName("Improvements", row.ImprovementType),
					rawType: row.ImprovementType,
					detail: `${formatSignedNumber(row.Yield)} ${formatYieldName(row.YieldType)}${row.condition ? ` ${row.condition}` : ""}`,
					preview: buildEntityPreview("Improvements", findRowByType("Improvements", row.ImprovementType), row),
					href: schemaRowHref("Improvements", row.ImprovementType),
				}),
			}),
			buildDeltaGroup({
				id: "route-movement",
				label: "Route move",
				rows: tableRows("Route_TechMovementChanges"),
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveTypeName("Routes", row.RouteType),
					rawType: row.RouteType,
					detail: `${formatSignedNumber(row.MovementChange)} cost`,
					preview: buildEntityPreview("Routes", findRowByType("Routes", row.RouteType), row),
					href: schemaRowHref("Routes", row.RouteType),
				}),
			}),
			buildDeltaGroup({
				id: "trade-range",
				label: "Trade range",
				rows: tableRows("Technology_TradeRouteDomainExtraRange"),
				techValue: tech.Type,
				buildItem: (row) => ({
					label: formatIdentifier(row.DomainType, ["DOMAIN_"]),
					rawType: row.DomainType,
					detail: `${formatSignedNumber(row.Range)} range`,
					preview: buildEntityPreview("Technologies", tech, row),
					href: schemaRowHref("Technologies", row.TechType),
				}),
			}),
			buildDeltaGroup({
				id: "domain-moves",
				label: "Domain moves",
				rows: tableRows("Technology_DomainExtraMoves"),
				techValue: tech.Type,
				buildItem: (row) => ({
					label: formatIdentifier(row.DomainType, ["DOMAIN_"]),
					rawType: row.DomainType,
					detail: `${formatSignedNumber(row.Moves)} moves`,
					preview: buildEntityPreview("Technologies", tech, row),
					href: schemaRowHref("Technologies", row.TechType),
				}),
			}),
			buildDeltaGroup({
				id: "free-promotions",
				label: "Free promos",
				rows: tableRows("Technology_FreePromotions"),
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveTypeName("UnitPromotions", row.PromotionType),
					rawType: row.PromotionType,
					detail: "Granted on research",
					preview: buildEntityPreview("UnitPromotions", findRowByType("UnitPromotions", row.PromotionType), row),
					href: schemaRowHref("UnitPromotions", row.PromotionType),
				}),
			}),
			// buildDeltaGroup({
			// 	id: "free-tech-civs",
			// 	label: "Start civs",
			// 	rows: TABLE_BY_NAME.get("Civilization_FreeTechs")?.rows || [],
			// 	techValue: tech.Type,
			// 	buildItem: (row) => ({
			// 		label: formatIdentifier(row.CivilizationType, ["CIVILIZATION_"]),
			// 		rawType: row.CivilizationType,
			// 		detail: " Starts with tech",
			// 		href: schemaRowHref("Civilization_FreeTechs", row.CivilizationType),
			// 	}),
			// }),
			buildDeltaGroup({
				id: "disabled-civs",
				label: "Disabled civs",
				rows: tableRows("Civilization_DisableTechs"),
				techValue: tech.Type,
				buildItem: (row) => ({
					label: resolveTypeName("Civilizations", row.CivilizationType),
					rawType: row.CivilizationType,
					detail: "Cannot research",
					preview: buildEntityPreview("Civilizations", findRowByType("Civilizations", row.CivilizationType), row),
					href: schemaRowHref("Civilizations", row.CivilizationType),
				}),
			}),
		];
	}

	function buildEntityGroup({ id, label, tableName, techField, techValue, filter = null, buildItem }) {
		const rows = tableRows(tableName).filter((row) => row?.[techField] === techValue && (!filter || filter(row)));
		return finalizeGroup(id, label, rows.map(buildItem));
	}

	function buildBuildDerivedGroup(tech, id, label, refField, targetTableName, buildItem) {
		const buildRows = tableRows("Builds").filter((row) => row.PrereqTech === tech.Type && refField(row));
		const targetByType = new Map(tableRows(targetTableName).map((row) => [row.Type, row]));
		return finalizeGroup(
			id,
			label,
			buildRows
				.map((build) => {
					const targetType = refField(build);
					const target = targetByType.get(targetType);
					return target ? buildItem(target, build) : null;
				})
				.filter(Boolean),
		);
	}

	function buildDeltaGroup({ id, label, rows, techValue, buildItem }) {
		return finalizeGroup(id, label, rows.filter((row) => row.TechType === techValue).map(buildItem));
	}

	function finalizeGroup(id, label, items) {
		return {
			id,
			label,
			items: dedupeItems(items),
		};
	}

	function dedupeItems(items) {
		const seen = new Set();
		const output = [];
		for (const item of items) {
			const key = `${item.rawType}|${item.label}|${item.detail}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			output.push(item);
		}
		return output.sort((left, right) => left.label.localeCompare(right.label) || left.detail.localeCompare(right.detail));
	}

	function buildGroupPreview(groups) {
		return groups
			.filter((group) => group.items.length)
			.map((group) => ({
				...group,
				previewItems: group.items.slice(0, DISPLAY_LIMITS.previewItems),
				remainingCount: Math.max(0, group.items.length - DISPLAY_LIMITS.previewItems),
			}));
	}

	function buildEffectPreview(effects) {
		return {
			items: effects.slice(0, DISPLAY_LIMITS.effects),
			remainingCount: Math.max(0, effects.length - DISPLAY_LIMITS.effects),
		};
	}

	function collectNotableEffects(tech) {
		const effects = [];
		for (const effect of SUPPORT_EFFECT_DEFS) {
			if (Number(tech[effect.key] || 0) > 0) {
				effects.push(effect.label);
			}
		}
		if (Number(tech.WorkerSpeedModifier || 0) !== 0) effects.push(`${formatSignedNumber(tech.WorkerSpeedModifier)}% worker speed`);
		if (Number(tech.UnitFortificationModifier || 0) !== 0) effects.push(`${formatSignedNumber(tech.UnitFortificationModifier)} fortify`);
		if (Number(tech.UnitBaseHealModifier || 0) !== 0) effects.push(`${formatSignedNumber(tech.UnitBaseHealModifier)} heal`);
		if (Number(tech.InternationalTradeRoutesChange || 0) !== 0) effects.push(`${formatSignedNumber(tech.InternationalTradeRoutesChange)} intl routes`);
		if (Number(tech.EmbarkedMoveChange || 0) !== 0) effects.push(`${formatSignedNumber(tech.EmbarkedMoveChange)} embarked move`);
		if (Number(tech.ExtraVotesPerDiplomat || 0) !== 0) effects.push(`${formatSignedNumber(tech.ExtraVotesPerDiplomat)} votes/diplomat`);
		if (Number(tech.InfluenceSpreadModifier || 0) !== 0) effects.push(`${formatSignedNumber(tech.InfluenceSpreadModifier)} influence spread`);
		if (Number(tech.FeatureProductionModifier || 0) !== 0) effects.push(`${formatSignedNumber(tech.FeatureProductionModifier)}% feature production`);
		if (Number(tech.ExtraWaterSeeFrom || 0) !== 0) effects.push(`${formatSignedNumber(tech.ExtraWaterSeeFrom)} water sight`);
		return effects;
	}

	function matchesTechSearch(tech, query) {
		const fields = [
			tech.title,
			tech.type,
			tech.eraLabel,
			tech.description,
			tech.help,
			...tech.prereqs.map((prereq) => prereq.label),
			...tech.orPrereqs.map((prereq) => prereq.label),
			...tech.notableEffects,
			...tech.unlockGroups.flatMap((group) => group.items.flatMap((item) => searchableCategoryFields.map((field) => item[field] || ""))),
			...tech.supportGroups.flatMap((group) => group.items.flatMap((item) => searchableCategoryFields.map((field) => item[field] || ""))),
		];
		return normalizeText(fields.join(" ")).includes(query);
	}

	function toTechRef(techType) {
		const row = TECH_ROW_BY_TYPE.get(techType);
		return {
			type: techType,
			label: row ? resolveDisplayName(row, "Type") : formatIdentifier(techType, ["TECH_"]),
		};
	}

	function resolveDisplayName(row, fallbackField = "Type") {
		const description = String(row?.Description || row?.ShortDescription || "").trim();
		return description ? resolveText(description) : formatIdentifier(row?.[fallbackField] || "Unknown");
	}

	function resolveText(value) {
		const text = String(value || "").trim();
		if (!text) {
			return "";
		}
		if (text.startsWith("TXT_KEY_")) {
			const localized = TEXT_BY_TAG.get(text);
			if (localized) {
				return cleanLocalizedText(localized);
			}
			return formatTextKey(text);
		}
		return cleanLocalizedText(text);
	}

	function tableRows(tableName) {
		return includeEnlightenmentEra ? OVERLAY_ROWS_BY_TABLE.get(tableName) || BASE_ROWS_BY_TABLE.get(tableName) || [] : BASE_ROWS_BY_TABLE.get(tableName) || [];
	}

	function findRowByType(tableName, typeValue) {
		return tableRows(tableName).find((entry) => entry.Type === typeValue);
	}

	function resolveTypeName(tableName, typeValue) {
		const row = findRowByType(tableName, typeValue);
		return row ? resolveDisplayName(row, "Type") : formatIdentifier(typeValue);
	}

	function cleanLocalizedText(value) {
		return String(value || "")
			.replace(/\[NEWLINE\]/g, " ")
			.replace(/\[LINK=[^\]]+\]/gi, "")
			.replace(/\[\/LINK\]/gi, "")
			.replace(/\[\\LINK\]/gi, "")
			.replace(/\[LINK\]/gi, "")
			.replace(/\[[A-Z0-9_]+\]/g, "")
			.replace(/\s+/g, " ")
			.trim();
	}

	function formatTextKey(value) {
		return formatIdentifier(
			String(value || "")
				.replace(/^TXT_KEY_/, "")
				.replace(/_(TITLE|DESC|HELP|SHORT|STRATEGY|PEDIA|TEXT|QUOTE)$/, ""),
		);
	}

	function formatIdentifier(value, prefixes = []) {
		let output = String(value || "").trim();
		for (const prefix of prefixes) {
			if (output.startsWith(prefix)) {
				output = output.slice(prefix.length);
			}
		}
		output = output
			.replace(/^TXT_KEY_/, "")
			.replace(/^(TECH|BUILDING|UNIT|PROJECT|PROCESS|ROUTE|RESOURCE|PROMOTION|IMPROVEMENT|ERA|DOMAIN|YIELD|CIVILIZATION|RESOURCECLASS|UNITCLASS|BUILDINGCLASS|VICTORY)_/, "")
			.replace(/_/g, " ")
			.toLowerCase();
		return output.replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unknown";
	}

	function normalizeText(value) {
		return String(value || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	function pushToMapArray(map, key, value) {
		if (!map.has(key)) {
			map.set(key, []);
		}
		map.get(key).push(value);
	}

	function schemaRowHref(table, rowFilter) {
		const params = new URLSearchParams({ table, tab: "rows", rowFilter });
		return `/schema-browser?${params.toString()}`;
	}

	function formatSignedNumber(value) {
		const number = Number(value || 0);
		return `${number > 0 ? "+" : ""}${number}`;
	}

	function formatYieldName(yieldType) {
		return formatIdentifier(yieldType, ["YIELD_"]);
	}

	function collectTypeYieldLines(tableName, typeField, typeValue, label = "Yields") {
		const rows = tableRows(tableName).filter((entry) => entry[typeField] === typeValue && Number(entry.Yield || entry.YieldChange || 0) !== 0);
		if (!rows.length) {
			return "";
		}
		const values = rows.map((entry) => `${formatSignedNumber(entry.Yield ?? entry.YieldChange)} ${formatYieldName(entry.YieldType)}`);
		return `${label}: ${values.join(", ")}`;
	}

	function collectResourceRequirementLine(unitType) {
		const rows = tableRows("Unit_ResourceQuantityRequirements").filter((entry) => entry.UnitType === unitType);
		if (!rows.length) {
			return "";
		}
		return `Requires: ${rows.map((entry) => `${resolveTypeName("Resources", entry.ResourceType)}${Number(entry.Cost || 0) > 1 ? ` x${entry.Cost}` : ""}`).join(", ")}`;
	}

	function collectProcessYieldLine(processType) {
		const rows = tableRows("Process_ProductionYields").filter((entry) => entry.ProcessType === processType && Number(entry.Yield || 0) !== 0);
		if (!rows.length) {
			return "";
		}
		return `Converts: ${rows.map((entry) => `${formatSignedNumber(entry.Yield)} ${formatYieldName(entry.YieldType)}`).join(", ")}`;
	}

	function buildPreviewFallback(preview) {
		if (!preview) {
			return "";
		}
		return [preview.title, preview.rawType, ...preview.stats, preview.description].filter(Boolean).join("\n");
	}

	function buildEntityPreview(tableName, row, contextRow = null) {
		if (!row) {
			return null;
		}

		const displayName = resolveDisplayName(row, "Type");
		const stats = [];
		let description = "";

		switch (tableName) {
			case "Units":
				if (row.Class) stats.push(`Class: ${formatIdentifier(row.Class, ["UNITCLASS_"])}`);
				if (row.Domain) stats.push(`Domain: ${formatIdentifier(row.Domain, ["DOMAIN_"])}`);
				if (Number(row.Cost || 0) > 0) stats.push(`Cost: ${row.Cost}`);
				if (Number(row.FaithCost || 0) > 0) stats.push(`Faith: ${row.FaithCost}`);
				if (Number(row.Combat || 0) > 0) stats.push(`Combat: ${row.Combat}`);
				if (Number(row.RangedCombat || 0) > 0) stats.push(`Ranged: ${row.RangedCombat}`);
				if (Number(row.Range || 0) > 0) stats.push(`Range: ${row.Range}`);
				if (Number(row.Moves || 0) > 0) stats.push(`Moves: ${row.Moves}`);
				if (row.CombatClass) stats.push(`Role: ${formatIdentifier(row.CombatClass, ["UNITCOMBAT_"])}`);
				const unitRequirementLine = collectResourceRequirementLine(row.Type);
				if (unitRequirementLine) stats.push(unitRequirementLine);
				break;
			case "Buildings":
				if (row.BuildingClass) stats.push(`Class: ${formatIdentifier(row.BuildingClass, ["BUILDINGCLASS_"])}`);
				if (Number(row.Cost || 0) > 0) stats.push(`Cost: ${row.Cost}`);
				if (Number(row.GoldMaintenance || 0) > 0) stats.push(`Maintenance: ${row.GoldMaintenance}`);
				if (Number(row.FaithCost || 0) > 0) stats.push(`Faith: ${row.FaithCost}`);
				if (Number(row.MaxGlobalInstances || 0) > 0 || row.WonderSplashImage) stats.push("World Wonder");
				if (Number(row.MaxPlayerInstances || 0) > 0) stats.push("National Wonder");
				if (Number(row.Happiness || 0) !== 0) stats.push(`Happiness: ${formatSignedNumber(row.Happiness)}`);
				if (Number(row.CultureRateModifier || 0) !== 0) stats.push(`Culture mod: ${formatSignedNumber(row.CultureRateModifier)}%`);
				if (Number(row.GreatPeopleRateModifier || 0) !== 0) stats.push(`Great people: ${formatSignedNumber(row.GreatPeopleRateModifier)}%`);
				if (row.SpecialistType) stats.push(`Specialist: ${formatIdentifier(row.SpecialistType, ["SPECIALIST_"])}`);
				const buildingYieldLine = collectTypeYieldLines("Building_YieldChanges", "BuildingType", row.Type);
				if (buildingYieldLine) stats.push(buildingYieldLine);
				break;
			case "Projects":
				if (Number(row.Cost || 0) > 0) stats.push(`Cost: ${row.Cost}`);
				if (row.VictoryPrereq) stats.push(`Victory: ${formatIdentifier(row.VictoryPrereq, ["VICTORY_"])}`);
				if (Number(row.MaxGlobalInstances || 0) > 0) stats.push(`Global cap: ${row.MaxGlobalInstances}`);
				if (Number(row.MaxTeamInstances || 0) > 0) stats.push(`Team cap: ${row.MaxTeamInstances}`);
				break;
			case "Processes":
				const processYieldLine = collectProcessYieldLine(row.Type);
				if (processYieldLine) stats.push(processYieldLine);
				break;
			case "Builds":
				if (Number(row.Time || 0) > 0) stats.push(`Time: ${row.Time}`);
				if (row.FeatureType) stats.push(`Feature: ${resolveTypeName("Features", row.FeatureType)}`);
				if (row.ImprovementType) stats.push(`Improvement: ${resolveTypeName("Improvements", row.ImprovementType)}`);
				if (row.RouteType) stats.push(`Route: ${resolveTypeName("Routes", row.RouteType)}`);
				if (row.ResourceType) stats.push(`Resource: ${resolveTypeName("Resources", row.ResourceType)}`);
				if (row.RemoveRoute) stats.push("Removes route");
				if (row.Repair) stats.push("Repairs tile");
				break;
			case "Improvements":
				if (contextRow?.YieldType && Number(contextRow.Yield || 0) !== 0) stats.push(`Yield: ${formatSignedNumber(contextRow.Yield)} ${formatYieldName(contextRow.YieldType)}`);
				if (Number(contextRow?.Time || 0) > 0) stats.push(`Build time: ${contextRow.Time}`);
				if (row.CivilizationType) stats.push(`Civ: ${formatIdentifier(row.CivilizationType, ["CIVILIZATION_"])}`);
				if (row.CreatedByGreatPerson) stats.push("Great person improvement");
				const improvementYieldLine = collectTypeYieldLines("Improvement_Yields", "ImprovementType", row.Type, "Base yields");
				if (improvementYieldLine) stats.push(improvementYieldLine);
				break;
			case "Routes":
				if (Number(contextRow?.MovementChange || 0) !== 0) stats.push(`Move change: ${formatSignedNumber(contextRow.MovementChange)}`);
				if (Number(contextRow?.Time || 0) > 0) stats.push(`Build time: ${contextRow.Time}`);
				if (Number(row.Movement || 0) !== 0) stats.push(`Base movement: ${row.Movement}`);
				if (Number(row.GoldMaintenance || 0) > 0) stats.push(`Maintenance: ${row.GoldMaintenance}`);
				const routeYieldLine = collectTypeYieldLines("Route_Yields", "RouteType", row.Type);
				if (routeYieldLine) stats.push(routeYieldLine);
				break;
			case "UnitPromotions":
				if (Number(row.CombatPercent || 0) !== 0) stats.push(`Combat: ${formatSignedNumber(row.CombatPercent)}%`);
				if (Number(row.CityAttack || 0) !== 0) stats.push(`City attack: ${formatSignedNumber(row.CityAttack)}%`);
				if (Number(row.CityDefense || 0) !== 0) stats.push(`City defense: ${formatSignedNumber(row.CityDefense)}%`);
				if (Number(row.MovesChange || 0) !== 0) stats.push(`Moves: ${formatSignedNumber(row.MovesChange)}`);
				if (Number(row.RangeChange || 0) !== 0) stats.push(`Range: ${formatSignedNumber(row.RangeChange)}`);
				if (Number(row.VisibilityChange || 0) !== 0) stats.push(`Sight: ${formatSignedNumber(row.VisibilityChange)}`);
				break;
			case "Resources":
				if (row.ResourceClassType) stats.push(`Class: ${formatIdentifier(row.ResourceClassType, ["RESOURCECLASS_"])}`);
				if (row.TechReveal) stats.push(`Reveal: ${resolveTypeName("Technologies", row.TechReveal)}`);
				if (row.TechCityTrade) stats.push(`Trade: ${resolveTypeName("Technologies", row.TechCityTrade)}`);
				if (Number(row.Happiness || 0) !== 0) stats.push(`Happiness: ${formatSignedNumber(row.Happiness)}`);
				break;
			case "Technologies":
				if (contextRow?.DomainType) stats.push(`Domain: ${formatIdentifier(contextRow.DomainType, ["DOMAIN_"])}`);
				if (Number(contextRow?.Range || 0) !== 0) stats.push(`Range: ${formatSignedNumber(contextRow.Range)}`);
				if (Number(contextRow?.Moves || 0) !== 0) stats.push(`Moves: ${formatSignedNumber(contextRow.Moves)}`);
				if (contextRow?.CivilizationType) stats.push(`Civ: ${formatIdentifier(contextRow.CivilizationType, ["CIVILIZATION_"])}`);
				break;
			case "Civilizations":
				if (row.ShortDescription) stats.push(`Short: ${resolveText(row.ShortDescription)}`);
				if (row.Adjective) stats.push(`Adjective: ${resolveText(row.Adjective)}`);
				if (row.DefaultPlayerColor) stats.push(`Color: ${formatIdentifier(row.DefaultPlayerColor, ["PLAYERCOLOR_"])}`);
				if (row.ArtStyleType) stats.push(`Art style: ${formatIdentifier(row.ArtStyleType, ["ARTSTYLE_"])}`);
				if (contextRow?.TechType) stats.push(`Blocked tech: ${resolveTypeName("Technologies", contextRow.TechType)}`);
				break;
		}

		if (row.Help) {
			description = resolveText(row.Help);
		}

		return {
			title: displayName || formatIdentifier(row.Type || "Unknown"),
			rawType: row.Type || "",
			stats: stats.filter(Boolean),
			description,
		};
	}

	function summarizeUnit(row) {
		const bits = [];
		if (Number(row.Combat || 0) > 0) bits.push(`C${row.Combat}`);
		if (Number(row.RangedCombat || 0) > 0) bits.push(`R${row.RangedCombat}`);
		if (Number(row.Range || 0) > 0) bits.push(`Rg${row.Range}`);
		if (Number(row.Moves || 0) > 0) bits.push(`Mv${row.Moves}`);
		if (row.Class) bits.push(formatIdentifier(row.Class, ["UNITCLASS_"]));
		return bits.join(" · ");
	}

	function summarizeBuilding(row) {
		const bits = [];
		if (Number(row.Cost || 0) > 0) bits.push(`Cost ${row.Cost}`);
		if (Number(row.GoldMaintenance || 0) > 0) bits.push(`Maint ${row.GoldMaintenance}`);
		if (row.BuildingClass) bits.push(formatIdentifier(row.BuildingClass, ["BUILDINGCLASS_"]));
		if (Number(row.FaithCost || 0) > 0) bits.push(`Faith ${row.FaithCost}`);
		return bits.join(" · ");
	}

	function summarizeProject(row) {
		const bits = [];
		if (Number(row.Cost || 0) > 0) bits.push(`Cost ${row.Cost}`);
		if (row.VictoryPrereq) bits.push(formatIdentifier(row.VictoryPrereq, ["VICTORY_"]));
		if (Number(row.MaxTeamInstances || 0) > 0) bits.push(`Team ${row.MaxTeamInstances}`);
		return bits.join(" · ");
	}

	function summarizeProcess(row) {
		return row.Help ? resolveText(row.Help) : "City process";
	}

	function summarizeBuild(row) {
		const bits = [];
		if (Number(row.Time || 0) > 0) bits.push(`Time ${row.Time}`);
		if (row.Repair) bits.push("Repair");
		if (row.RemoveRoute) bits.push("Remove route");
		return bits.join(" · ") || "Tile action";
	}

	function summarizeImprovement(row, build) {
		const bits = [];
		if (Number(build.Time || 0) > 0) bits.push(`Build ${build.Time}`);
		if (row.CreatedByGreatPerson) bits.push("Great person");
		if (row.CivilizationType) bits.push(formatIdentifier(row.CivilizationType, ["CIVILIZATION_"]));
		return bits.join(" · ") || "Improvement";
	}

	function summarizeRoute(row, build) {
		const bits = [];
		if (Number(build.Time || 0) > 0) bits.push(`Build ${build.Time}`);
		if (Number(row.GoldMaintenance || 0) > 0) bits.push(`Maint ${row.GoldMaintenance}`);
		if (Number(row.Movement || 0) > 0) bits.push(`Move ${row.Movement}`);
		return bits.join(" · ");
	}

	function summarizePromotion(row) {
		const bits = [];
		if (Number(row.CombatPercent || 0) !== 0) bits.push(`${formatSignedNumber(row.CombatPercent)}% combat`);
		if (Number(row.CityAttack || 0) !== 0) bits.push(`${formatSignedNumber(row.CityAttack)}% city atk`);
		if (Number(row.CityDefense || 0) !== 0) bits.push(`${formatSignedNumber(row.CityDefense)}% city def`);
		if (Number(row.MovesChange || 0) !== 0) bits.push(`${formatSignedNumber(row.MovesChange)} moves`);
		if (Number(row.RangeChange || 0) !== 0) bits.push(`${formatSignedNumber(row.RangeChange)} range`);
		return bits.join(" · ") || (row.Help ? resolveText(row.Help) : "Promotion");
	}

	function summarizeResource(row, modeLabel) {
		const bits = [modeLabel];
		if (row.ResourceClassType) bits.push(formatIdentifier(row.ResourceClassType, ["RESOURCECLASS_"]));
		return bits.join(" · ");
	}
</script>

<section class="hero tech-tree-hero margin-block-end">
	<div class="hero-copy">
		<p class="eyebrow">Reference Viewer</p>
		<h1>Tech Tree Viewer</h1>
		<p>Compact era-separated view of tech placement, prerequisites, unlocks, reveals, and secondary tech effects.</p>
	</div>
</section>

<section class="viewer-toolbar panel-surface margin-block-end" aria-label="Viewer controls">
	<label class="search-field">
		<span>Search Techs, Unlocks, Effects</span>
		<input bind:value={searchQuery} type="search" placeholder="archery, farm, congress, longswordsman, reveal, ocean..." />
	</label>

	<div class="toolbar-section inline align-start" style="gap: 2rem">
		<div class="toolbar-section-head">
			<span class="toolbar-label">Era Filter</span>
			<p class="toolbar-copy">Toggle any combination of eras, or reset to the full tree.</p>
			<div class="toolbar-row">
				<div class="chip-group" role="list" aria-label="Era filter">
					<button class:selected={!hasEraFilter} type="button" onclick={clearEraFilter}>All</button>
					{#each ERA_GROUPS as era (era.eraType)}
						<button class:selected={selectedEras.includes(era.eraType)} type="button" onclick={() => toggleEraFilter(era.eraType)}>{era.eraLabel}</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="toolbar-section-head">
			<span class="toolbar-label">Visual Flow</span>
			<p class="toolbar-copy">Choose the full tree layout.</p>
			<div class="toggle-row" role="list" aria-label="Era layout">
				<button class:selected={eraFlow === "vertical"} type="button" onclick={() => (eraFlow = "vertical")}>Vertical</button>
				<button class:selected={eraFlow === "horizontal"} type="button" onclick={() => (eraFlow = "horizontal")}>Horizontal</button>
			</div>
		</div>

		<div class="toolbar-section-head">
			<span class="toolbar-label">Era Overlay</span>
			<p class="toolbar-copy">Toggle Enlightenment Era modded tree changes.</p>
			<div class="toggle-row" role="list" aria-label="Enlightenment Era overlay">
				<button class:selected={!includeEnlightenmentEra} type="button" onclick={() => (includeEnlightenmentEra = false)}>Base Game</button>
				<button class:selected={includeEnlightenmentEra} type="button" onclick={() => (includeEnlightenmentEra = true)}>Enlightenment Era</button>
			</div>
		</div>
	</div>
</section>

{#if !filteredTechs.length}
	<p class="status">No technologies matched that search.</p>
{:else}
	<div class:horizontal={eraFlow === "horizontal"} class="era-stack">
		{#each visibleEraGroups as era (era.eraType)}
			<section class="era-panel panel-surface" id={era.eraType} aria-labelledby={`${era.eraType}-heading`}>
				<header class="era-header">
					<div class="era-heading">
						<h2 id={`${era.eraType}-heading`}>{era.eraLabel}</h2>
						<p>
							{era.techs.length} techs · {numberFormatter.format(era.costMin)}-{numberFormatter.format(era.costMax)} science · {numberFormatter.format(era.unlockCount)} unlocks
						</p>
					</div>
					<!-- <div class="era-key"><span>Cols {era.gridColumns}</span><span>Rows {era.gridRows}</span></div> -->
				</header>

				<div class="era-grid-wrap" style={`--grid-columns:${era.gridColumns}; --grid-rows:${era.gridRows};`}>
					{#if era.connectors.length}
						<svg class="era-connectors" viewBox={`0 0 ${era.gridColumns * 100} ${era.gridRows * 100}`} preserveAspectRatio="none" aria-hidden="true">
							{#each era.connectors as connector (connector.id)}
								<path d={connector.path}></path>
							{/each}
						</svg>
					{/if}

					<div class="era-grid">
						{#each era.techs as tech (tech.type)}
							<article class:near-top={tech.rowIndex <= 2} class="tech-card" id={tech.type} style={`grid-column:${tech.columnIndex}; grid-row:${tech.rowIndex};`}>
								<header class="tech-head">
									<div class="tech-title">
										<h3>{tech.title}</h3>
										<!-- <div class="tech-meta"><span>{numberFormatter.format(tech.cost)}</span><span>G {tech.gridX},{tech.gridY}</span></div> -->
									</div>
									<a class="schema-link" href={tech.schemaHref} target="_blank" rel="noopener noreferrer">Schema</a>
								</header>

								<div class="tech-prereqs">
									{#if tech.prereqs.length}
										<span class="text-sm">Prereqs:</span>
										{#each tech.prereqs as prereq (prereq.type)}
											<a class:current-era={tech.sameEraPrereqs.some((entry) => entry.type === prereq.type)} class="mini-pill" href={`/tech-tree-viewer#${prereq.type}`}>
												{prereq.label}
											</a>
										{/each}
									{:else}
										<span class="mini-pill muted">Start tech</span>
									{/if}
								</div>

								{#if tech.effectPreview.items.length}
									<div class="dense-line effects-line">
										<strong>Effects</strong><span
											>{tech.effectPreview.items.join(" · ")}{#if tech.effectPreview.remainingCount}
												+{tech.effectPreview.remainingCount} more{/if}</span
										>
									</div>
								{/if}

								{#if tech.unlockPreview.length}
									<div class="group-preview-grid">
										{#each tech.unlockPreview as group (group.id)}
											<div class="dense-group">
												<strong>{group.label} {group.items.length}</strong>
												<span
													>{#each group.previewItems as item, index (`${group.id}-${item.rawType}-${index}`)}<a
															href={item.href}
															target="_blank"
															rel="noopener noreferrer"
															class:has-preview={Boolean(item.preview)}
														>
															{item.label}
															{#if item.preview}
																<span class="dense-preview" role="tooltip">
																	<strong>{item.preview.title}</strong>
																	{#if item.preview.rawType}
																		<code>{item.preview.rawType}</code>
																	{/if}
																	{#if item.preview.stats.length}
																		<ul>
																			{#each item.preview.stats as stat (`${item.rawType}-${stat}`)}
																				<li>{stat}</li>
																			{/each}
																		</ul>
																	{/if}
																	{#if item.preview.description}
																		<p>{item.preview.description}</p>
																	{/if}
																</span>
															{/if}</a
														>{index < group.previewItems.length - 1 ? ", " : ""}{/each}{#if group.remainingCount}
														+{group.remainingCount}{/if}</span
												>
											</div>
										{/each}
									</div>
								{/if}

								{#if tech.supportPreview.length}
									<div class="group-preview-grid support-grid">
										{#each tech.supportPreview as group (group.id)}
											<div class="dense-group support">
												<strong>{group.label} {group.items.length}</strong>
												<span>
													{#each group.previewItems as item, index (`${group.id}-${item.rawType}-${index}`)}
														<a href={item.href} target="_blank" rel="noopener noreferrer" class:has-preview={Boolean(item.preview)}>
															{item.label}
															{#if item.preview}
																<span class="dense-preview" role="tooltip">
																	<strong>{item.preview.title}</strong>
																	{#if item.preview.rawType}
																		<code>{item.preview.rawType}</code>
																	{/if}
																	{#if item.preview.stats.length}
																		<ul>
																			{#each item.preview.stats as stat (`${item.rawType}-${stat}`)}
																				<li>{stat}</li>
																			{/each}
																		</ul>
																	{/if}
																	{#if item.preview.description}
																		<p>{item.preview.description}</p>
																	{/if}
																</span>
															{/if}
														</a>
														{#if item.detail}
															{item.detail}
														{/if}
														{index < group.previewItems.length - 1 ? ", " : ""}{/each}
													{#if group.remainingCount}
														+{group.remainingCount}
													{/if}
												</span>
											</div>
										{/each}
									</div>
								{/if}

								{#if tech.help || tech.description || tech.priorEraPrereqs.length || tech.orPrereqs.length}
									<details class="tech-details">
										<summary>More</summary>
										<div class="stack half">
											<!-- {#if tech.priorEraPrereqs.length}<div class="detail-row">
													<strong>Earlier era prereqs</strong><span>{tech.priorEraPrereqs.map((prereq) => prereq.label).join(", ")}</span>
												</div>{/if} -->
											<!-- {#if tech.orPrereqs.length}<div class="detail-row">
													<strong>OR prereqs</strong><span>{tech.orPrereqs.map((prereq) => prereq.label).join(", ")}</span>
												</div>{/if} -->
											{#if tech.help}<div class="detail-row"><strong>Help</strong><span>{tech.help}</span></div>{/if}
											{#if tech.description && tech.description !== tech.title}<div class="detail-row"><strong>Description</strong><span>{tech.description}</span></div>{/if}
											<div class="detail-row"><strong>Type</strong><code>{tech.type}</code></div>
											{#if tech.descriptionKey}<div class="detail-row"><strong>Text key</strong><code>{tech.descriptionKey}</code></div>{/if}
										</div>
									</details>
								{/if}
							</article>
						{/each}
					</div>
				</div>
			</section>
		{/each}
	</div>
{/if}

<style>
	.tech-tree-hero {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(15rem, 0.75fr);
		gap: 0.6rem;
	}

	.hero-copy {
		display: grid;
		gap: 0.45rem;
	}

	.panel-surface {
		border-radius: 0.85rem;
		border: 1px solid color-mix(in oklch, var(--surface-tool-border) 72%, var(--panel-border));
		background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 30%), color-mix(in oklch, var(--surface-tool-panel) 72%, var(--panel-bg) 28%);
		box-shadow: 0 14px 24px var(--shadow-soft);
	}

	.toolbar-copy,
	.era-header p,
	.dense-group span,
	.dense-line span,
	.detail-row span {
		color: var(--muted-ink);
	}

	.viewer-toolbar,
	.era-panel {
		padding: 1.25rem 1rem;
	}

	.viewer-toolbar {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
	}

	.toolbar-section {
		padding: 0.85rem 0.9rem;
		border-radius: 0.85rem;
		border: 1px solid color-mix(in oklch, var(--surface-tool-border) 70%, var(--panel-border));
		background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent) 7%, transparent) 0%, transparent 34%), color-mix(in oklch, var(--control-bg) 76%, var(--panel-bg) 24%);
	}

	.toolbar-section-head {
		display: grid;
		gap: 0.15rem;
	}

	.toolbar-label {
		font-size: 0.73rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--accent-soft) 58%, var(--ink));
	}

	.search-field {
		display: grid;
		gap: 0.35rem;
	}

	.search-field span {
		font-size: 0.73rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted-ink);
	}

	.search-field input {
		appearance: none;
		inline-size: 100%;
		padding: 0.58rem 0.72rem;
		border-radius: 0.7rem;
		border: 1px solid color-mix(in oklch, var(--surface-tool-border) 70%, var(--panel-border));
		background: var(--input-bg);
		color: var(--ink);
	}

	.toolbar-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		align-items: center;
		margin-block-start: 0.25rem;
	}

	.chip-group,
	.toggle-row,
	.tech-prereqs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.chip-group button,
	.toggle-row button,
	.mini-pill {
		border-radius: 999px;
		border: 1px solid color-mix(in oklch, var(--surface-tool-border) 75%, var(--panel-border));
		background: color-mix(in oklch, var(--control-bg) 86%, var(--panel-bg) 14%);
		color: var(--ink);
		text-decoration: none;
		font-size: 0.72rem;
		line-height: 1.2;
	}

	.chip-group button {
		padding: 0.4rem 0.7rem;
	}

	.toggle-row button {
		padding: 0.4rem 0.7rem;
	}

	.chip-group button.selected,
	.toggle-row button.selected {
		background: color-mix(in oklch, var(--accent) 26%, var(--control-bg));
		border-color: color-mix(in oklch, var(--accent) 66%, var(--surface-tool-border));
	}

	.toggle-row {
		font-size: 0.78rem;
		margin-block-start: 0.25rem;
	}

	.era-stack {
		display: grid;
		gap: 0.8rem;
	}

	.era-stack.horizontal {
		max-inline-size: calc(100vw - 4rem);
		grid-auto-flow: column;
		grid-auto-columns: max-content;
		overflow-x: auto;
		overflow-y: visible;
		align-items: start;
		/*border-inline-end: 1px solid color-mix(in oklch, var(--surface-tool-border) 72%, var(--panel-border));*/
		border-radius: 0.85rem;
		padding-block-end: 0.2rem;
	}

	.era-panel {
		display: grid;
		gap: 0.6rem;
		scroll-margin-top: 5rem;
	}

	.era-stack.horizontal .era-panel {
		inline-size: max-content;
		min-inline-size: 22rem;
	}

	.era-stack.horizontal .era-grid-wrap {
		inline-size: max-content;
		min-inline-size: max-content;
	}

	.era-stack.horizontal .era-grid {
		grid-template-columns: repeat(var(--grid-columns), minmax(12rem, 25rem));
	}

	.era-header {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 1rem;
	}

	.era-heading h2,
	.tech-title h3 {
		font-size: 2rem;
		font-family: "Rockwell", "Palatino Linotype", serif;
		text-box: trim-both cap alphabetic;
	}

	.era-heading {
		display: grid;
		gap: 0.5rem;
	}

	.era-grid-wrap {
		position: relative;
		inline-size: 100%;
		min-inline-size: 0;
	}

	.era-grid {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
		grid-template-rows: repeat(var(--grid-rows), minmax(9.4rem, auto));
		grid-auto-flow: dense;
		gap: 0.45rem;
		align-items: stretch;
	}

	.era-connectors {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		z-index: 0;
		pointer-events: none;
		overflow: visible;
	}

	.era-connectors path {
		fill: none;
		stroke: color-mix(in oklch, var(--accent) 48%, var(--panel-border));
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-dasharray: 4 4;
		opacity: 0.8;
	}

	.tech-card {
		--surface-border: var(--surface-schema-border);
		--surface-highlight: var(--surface-schema-highlight);
		--surface-highlight-strong: var(--surface-schema-highlight-strong);
		--surface-panel: var(--surface-schema-panel);

		min-inline-size: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border: 1px solid color-mix(in oklch, var(--surface-border) 80%, var(--panel-border));
		border-radius: 0.85rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight) 10%, transparent) 0%, transparent 35%), color-mix(in oklch, var(--surface-panel) 90%, var(--panel-bg) 20%);
		padding: 1.25rem 1rem;
	}

	.tech-head {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		align-items: center;
	}

	.tech-title {
		display: grid;
		gap: 0.25rem;
		min-inline-size: 0;
	}

	.tech-title h3 {
		font-size: 1.25rem;
		line-height: 1.05;
		text-wrap: balance;
	}

	.schema-link {
		color: var(--surface-highlight-strong);
		font-size: 0.85rem;
		text-decoration: none;
		text-box: trim-both cap alphabetic;
	}

	.mini-pill {
		text-box: trim-both cap alphabetic;
		padding: 0.35rem 0.5rem 0.5rem;
	}

	.mini-pill.current-era {
		border-color: color-mix(in oklch, var(--surface-highlight) 95%, var(--surface-tool-border));
		background: color-mix(in oklch, var(--surface-panel) 70%, var(--control-bg));
	}

	.mini-pill.muted {
		opacity: 0.78;
	}

	.dense-line,
	.detail-row {
		display: grid;
		gap: 0.15rem;
	}

	.dense-line strong,
	.dense-group strong,
	.detail-row strong {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink);
	}

	.dense-line span,
	.dense-group span,
	.detail-row span {
		font-size: 0.8rem;
		line-height: 1.24;
	}

	.group-preview-grid {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
	}

	.dense-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem;
		border-radius: 0.6rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight, var(--surface-highlight)) 10%, transparent) 0%, transparent 34%),
			linear-gradient(165deg, color-mix(in srgb, var(--surface-panel, var(--control-bg)) 88%, var(--control-bg)) 0%, color-mix(in srgb, var(--control-bg) 88%, #16110f 12%) 100%);
		border: 1px solid color-mix(in srgb, var(--surface-highlight, var(--surface-border, var(--surface-highlight))) 44%, var(--surface-border, var(--home-muted-border)));
		min-inline-size: 0;
	}

	.dense-group.support {
		border-style: dashed;
	}

	.dense-group a {
		position: relative;
		color: var(--ink);
		font-size: 1rem;
		text-decoration: none;
		overflow-wrap: anywhere;

		&:hover {
			color: var(--accent-soft);
		}
	}

	.dense-preview {
		position: absolute;
		inset-block-end: calc(100% + 0.45rem);
		inset-inline-start: 0;
		min-inline-size: 14rem;
		inline-size: fit-content;
		max-inline-size: min(24rem, 50vw);
		display: grid;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: 0.65rem;
		border: 1px solid color-mix(in oklch, var(--surface-highlight) 58%, var(--panel-border));
		background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight) 12%, transparent) 0%, transparent 36%), color-mix(in oklch, var(--panel-bg) 94%, black 6%);
		box-shadow: 0 10px 24px var(--shadow-soft);
		color: var(--ink);
		line-height: 1.35;
		opacity: 0;
		transform: translateY(0.2rem);
		pointer-events: none;
		transition:
			opacity 130ms ease,
			transform 130ms ease;
		z-index: 10;
	}

	.tech-card.near-top .dense-preview {
		inset-block-start: calc(100% + 0.45rem);
		inset-block-end: auto;
		transform: translateY(-0.2rem);
	}

	.dense-group a.has-preview:hover .dense-preview,
	.dense-group a.has-preview:focus-visible .dense-preview {
		opacity: 1;
		transform: translateY(0);
	}

	.dense-preview strong {
		font-size: 1.125rem;
		font-weight: 700;
		letter-spacing: 0;
		text-transform: none;
		line-height: 1.05;
	}

	.dense-preview code {
		color: var(--muted-ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.75rem;
		overflow-wrap: anywhere;
	}

	.dense-preview ul {
		display: grid;
		gap: 0.25rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.dense-preview li {
		font-size: 0.9rem;
		line-height: 1.32;
	}

	.dense-preview li::before {
		content: "•";
		color: var(--accent-soft);
		margin-inline-end: 0.45rem;
	}

	.dense-preview p {
		margin: 0;
		padding-top: 0.45rem;
		border-top: 1px solid color-mix(in oklch, var(--panel-border) 82%, transparent);
		color: var(--muted-ink);
		font-size: 0.88rem;
		line-height: 1.4;
	}

	.tech-details {
		border-top: 1px dashed color-mix(in oklch, var(--panel-border) 86%, transparent);
		padding-top: 0.35rem;
	}

	.tech-details summary {
		color: var(--accent-soft);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}

	.tech-details[open] {
		display: grid;
		gap: 0.5rem;
	}

	.tech-details code,
	.detail-row code {
		color: var(--ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.75rem;
		overflow-wrap: anywhere;
	}

	@media (max-width: 1100px) {
		.tech-tree-hero {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 900px) {
		.era-header,
		.toolbar-row {
			flex-direction: column;
			align-items: stretch;
		}

		.group-preview-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.era-stack.horizontal {
			grid-auto-columns: max-content;
		}

		.era-stack.horizontal .era-panel {
			inline-size: max-content;
			min-inline-size: 19rem;
		}
	}

	@media (max-width: 760px) {
		.viewer-toolbar {
			padding: 0.85rem;
		}

		.toolbar-section {
			padding: 0.75rem;
		}

		.era-grid {
			grid-template-columns: 1fr;
			grid-template-rows: none;
		}

		.era-connectors {
			display: none;
		}

		.tech-card {
			grid-column: auto !important;
			grid-row: auto !important;
		}

		.group-preview-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
