import luaDocs from "./civ-lua-api-docs.json";

const methodDocs = luaDocs.methods;
const gameEventDocs = luaDocs.gameEvents;

export const snippetLanguageFilters = [
	{ id: "all", label: "All" },
	{ id: "lua", label: "Lua" },
	{ id: "xml", label: "XML" },
	{ id: "text", label: "Text" },
	{ id: "ini", label: "INI" },
];

export const normalizeSnippetLanguage = (language = "text") => {
	const normalized = String(language).trim().toLowerCase();
	if (normalized === "txt") {
		return "text";
	}
	return normalized || "text";
};

export const exampleSupportsLanguage = (example, activeLanguage = "all") => {
	if (!example || activeLanguage === "all") {
		return Boolean(example);
	}

	const files = example.files?.length ? example.files : [example];
	return files.some((file) => normalizeSnippetLanguage(file?.language || example.language) === activeLanguage);
};

const schemaHref = (table, tab = "columns") => `/schema-browser?table=${encodeURIComponent(table)}&tab=${encodeURIComponent(tab)}`;
const luaHref = (entryId, dataset = "methods", hash = "") => {
	const params = new URLSearchParams({ dataset, entry: entryId });
	const nextHash = hash ? `#${hash}` : "";
	return `/lua-api-explorer?${params.toString()}${nextHash}`;
};

const linkToSchema = (table, note, tab = "columns") => ({
	label: table,
	href: schemaHref(table, tab),
	note,
});

const linkToLua = (label, entryId, dataset, note, hash = "") => ({
	label,
	href: luaHref(entryId, dataset, hash),
	note,
});

const snippetFile = (path, language, code, note = "", label = "") => ({
	path,
	language,
	code,
	note,
	label,
});

export const recipeLaunchRecipes = [
	{
		title: "Event Bucket Chooser",
		focus: "Lua hook routing",
		status: "First Batch",
		copy: "Start with the right hook family and the right callback signature instead of discovering too late that the effect belongs in a different event surface.",
		deliverables: [
			"Chooser logic for GameEvents, Events, and LuaEvents by gameplay effect, UI reaction, and return behavior.",
			"Starter callbacks with named parameters and a clear return contract.",
			"Cross-links into the Lua API Explorer and schema touchpoints when a hook uses typed rows.",
		],
		example: {
			title: "Production veto hook",
			summary: gameEventDocs["game-event-playercantrain-70"].example.summary,
			files: [
				snippetFile(
					"Lua/Gameplay/PlayerCanTrain.lua",
					gameEventDocs["game-event-playercantrain-70"].example.language,
					gameEventDocs["game-event-playercantrain-70"].example.code,
					"Gameplay-side veto hook for unit production.",
				),
				snippetFile(
					"Lua/Gameplay/CanDeclareWar.lua",
					gameEventDocs["game-event-candeclarewar-2"].example.language,
					gameEventDocs["game-event-candeclarewar-2"].example.code,
					"Second bucket example showing a diplomacy veto hook with a different callback surface.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerCanTrain", "game-event-playercantrain-70", "gameEvents", "Empire-wide production veto hook with a real callback signature."),
			linkToLua("Player:CanTrain", "player-cantrain-42", "methods", "Method-side validation that complements the event hook."),
			linkToLua("GameEvents.CanDeclareWar", "game-event-candeclarewar-2", "gameEvents", "Different hook bucket for diplomacy-side veto logic."),
			linkToLua("GameEvents.CityBoughtPlot", "game-event-cityboughtplot-17", "gameEvents", "Hook-style callback that resolves map coordinates after border growth."),
			linkToSchema("Units", "Inspect unit rows behind the enum passed into the hook."),
			linkToSchema("UnitClasses", "Check class replacements when civ uniques swap base units."),
		],
	},
	{
		title: "Persistent Data Helper",
		focus: "Save data",
		status: "First Batch",
		copy: "Package a safe persistence pattern with namespaced keys, read-through caching, and explicit player or game scope so mods stop scattering save logic across multiple files.",
		deliverables: [
			"Namespaced key helpers for game and player scope.",
			"Tiny cache wrapper so turn hooks do not hammer persistence APIs on every lookup.",
			"Starter read, write, and increment patterns for counters and booleans.",
		],
		example: {
			title: "Namespaced player counter",
			summary: "Persist a per-player counter and cache the resolved value in Lua for the current session.",
			files: [
				snippetFile(
					"Lua/Shared/Persistence.lua",
					"lua",
					'local ModData = Modding.OpenSaveData()\nlocal Cache = {}\nlocal KEY_PREFIX = "CMC_MyMod_"\n\nlocal function playerKey(iPlayer, suffix)\n\treturn string.format("%sP%d_%s", KEY_PREFIX, iPlayer, suffix)\nend\n\nlocal function getCounter(iPlayer)\n\tif Cache[iPlayer] ~= nil then\n\t\treturn Cache[iPlayer]\n\tend\n\tlocal key = playerKey(iPlayer, "Counter")\n\tlocal value = ModData.GetValue(key) or 0\n\tCache[iPlayer] = value\n\treturn value\nend\n\nlocal function setCounter(iPlayer, value)\n\tlocal key = playerKey(iPlayer, "Counter")\n\tCache[iPlayer] = value\n\tModData.SetValue(key, value)\nend\n\nreturn {\n\tgetCounter = getCounter,\n\tsetCounter = setCounter,\n}',
					"Shared helper file that a generator can reuse across multiple gameplay hooks.",
				),
				snippetFile(
					"Lua/Gameplay/TrackTurns.lua",
					"lua",
					'local Persistence = include("Persistence")\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal current = Persistence.getCounter(iPlayer)\n\tPersistence.setCounter(iPlayer, current + 1)\n\tprint("Processed turn", Game.GetGameTurn(), "for player", iPlayer)\nend)',
					"Gameplay-side consumer that pairs persistence with turn timing.",
				),
			],
		},
		touchpoints: [
			linkToLua("Game.GetActivePlayer", "game-getactiveplayer-44", "methods", "Resolve the current player when the helper is driven from UI code."),
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Typical place to update cached counters once per turn."),
			linkToLua("Game.GetGameTurn", "game-getgameturn-80", "methods", "Useful for turn-based cooldowns and last-processed markers."),
		],
	},
	{
		title: "Localization + Markup Pack",
		focus: "Text keys",
		status: "First Batch",
		copy: "Generate a working localization scaffold with grouped text keys, safe markup, and notification-ready copy instead of leaving strings hard-coded in Lua or XML.",
		deliverables: [
			"Language file starter with `TXT_KEY_` naming conventions.",
			"Examples for `ICON`, `COLOR`, `NEWLINE`, and Civilopedia-safe copy blocks.",
			"Notification summary and help text seeds that align with gameplay rows.",
		],
		example: {
			title: "Localized notification text",
			summary: "Seed the text keys first, then pass localized strings into gameplay or UI notifications.",
			files: [
				snippetFile(
					"XML/Text/FloatingArchivesText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_BUILDING_FLOATING_ARCHIVES" Text="Floating Archives" />\n\t\t<Row Tag="TXT_KEY_BUILDING_FLOATING_ARCHIVES_HELP" Text="[COLOR_POSITIVE_TEXT]+2[ENDCOLOR] [ICON_RESEARCH] Science from the main building row.[NEWLINE]Extra text can be layered in later." />\n\t\t<Row Tag="TXT_KEY_NOTIFICATION_FLOATING_ARCHIVES" Text="Your capital completed the [COLOR_CYAN_TEXT]Floating Archives[ENDCOLOR]." />\n\t</Language_en_US>\n</GameData>',
					"Localization pack with grouped text keys for the building and notification copy.",
				),
				snippetFile(
					"Lua/Gameplay/NotifyFloatingArchives.lua",
					"lua",
					'local iPlayer = Game.GetActivePlayer()\nlocal pPlayer = Players[iPlayer]\nlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\nif pCapital then\n\tpPlayer:AddNotification(\n\t\tNotificationTypes.NOTIFICATION_GENERIC,\n\t\tLocale.ConvertTextKey("TXT_KEY_NOTIFICATION_FLOATING_ARCHIVES"),\n\t\tLocale.ConvertTextKey("TXT_KEY_BUILDING_FLOATING_ARCHIVES"),\n\t\tpCapital:GetX(),\n\t\tpCapital:GetY(),\n\t\t0,\n\t\t-1\n\t)\nend',
					"Gameplay notification call site consuming the localized text keys.",
				),
			],
		},
		touchpoints: [
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Notification call site that consumes localized strings."),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Convenient way to anchor notification coordinates to the capital."),
			linkToSchema("Buildings", "Keep gameplay text aligned with the actual building row that owns the description and help keys."),
		],
	},
	{
		title: "VFS / UI Include Setup",
		focus: "Project wiring",
		status: "First Batch",
		copy: "Turn VFS and content actions into a repeatable setup recipe so XML, UI Lua, and icon assets land in the correct project actions the first time.",
		deliverables: [
			"Checklist for files that belong in VFS versus database updates.",
			"UI include patterns and file placement guardrails.",
			"A starter action split that prevents common 'it loaded into the wrong context' mistakes.",
		],
		example: {
			title: "Mod action split",
			summary: "Database updates and VFS imports should be explicit instead of hidden behind one catch-all action.",
			files: [
				snippetFile(
					"ModBuddy/Actions.xml",
					"xml",
					"<Actions>\n\t<OnModActivated>\n\t\t<UpdateDatabase>XML/Buildings/FloatingArchives.xml</UpdateDatabase>\n\t\t<UpdateDatabase>XML/Text/FloatingArchivesText.xml</UpdateDatabase>\n\t</OnModActivated>\n\t<OnModActivated>\n\t\t<ImportIntoVFS>UI/CMC_StatusPanel.lua</ImportIntoVFS>\n\t\t<ImportIntoVFS>UI/CMC_StatusPanel.xml</ImportIntoVFS>\n\t\t<ImportIntoVFS>Art/CMC_Atlas256.dds</ImportIntoVFS>\n\t</OnModActivated>\n</Actions>",
					"Project action split that separates database updates from files that must exist in VFS.",
				),
				snippetFile(
					"UI/CMC_StatusPanel.lua",
					"lua",
					'include("IconSupport")\n\nfunction RefreshStatusPanel()\n\tprint("[CMC_StatusPanel] UI file loaded through VFS")\nend',
					"Minimal UI-side include target that proves the VFS import path is working.",
				),
			],
		},
		touchpoints: [linkToSchema("IconTextureAtlases", "Atlas registration rows only work if the textures are imported correctly.")],
	},
	{
		title: "Debug Triage Checklist",
		focus: "Logs and tooling",
		status: "First Batch",
		copy: "Give modders a repeatable order of operations when Lua stops firing, text keys fail to resolve, or XML appears to load but never affects gameplay.",
		deliverables: [
			"Config and FireTuner reminders before testing begins.",
			"Log-first checks for Lua, XML, SQL, localization, and VFS.",
			"A symptom map that separates bad data from bad load context.",
		],
		example: {
			title: "Minimal debug baseline",
			summary: "Enable logs first and print explicit mod-prefixed traces before trying to reason about game state.",
			files: [
				snippetFile(
					"Config/config.ini",
					"ini",
					"; config.ini\nLoggingEnabled = 1\nEnableLuaDebugLibrary = 1\nEnableTuner = 1",
					"Baseline logging switches before troubleshooting any gameplay or UI issue.",
				),
				snippetFile(
					"Lua/Gameplay/TraceHooks.lua",
					"lua",
					'print("[CMC_MyMod] Loaded gameplay hook file on turn", Game.GetGameTurn())\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tprint("[CMC_MyMod] PlayerDoTurn", iPlayer, Game.GetGameTurn())\nend)',
					"Minimal recurring trace file for proving gameplay Lua is loading and firing.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Simple recurring hook for proving that gameplay Lua is actually loading."),
			linkToLua("Game.GetGameTurn", "game-getgameturn-80", "methods", "Small timing helper that makes logs much easier to compare across turns."),
		],
	},
	{
		title: "GameInfoTypes Lookup Pattern",
		focus: "Lua data access",
		status: "First Batch",
		copy: "Standardize how Lua resolves row names, validates missing content, and hands the result into method or GameEvent calls without hard-coded integers.",
		deliverables: [
			"Type-name-to-ID lookups for units, buildings, promotions, and yields.",
			"Guard clauses that fail loudly when a custom row is absent.",
			"Small method-side examples that show what to do after the lookup succeeds.",
		],
		example: {
			title: "Lookup before calling player methods",
			summary: methodDocs["player-cantrain-42"].example.summary,
			files: [
				snippetFile(
					"Lua/Shared/ResolveTypes.lua",
					"lua",
					'local function requireType(name)\n\tlocal id = GameInfoTypes[name]\n\tif not id then\n\t\terror("Missing GameInfoType: " .. tostring(name))\n\tend\n\treturn id\nend\n\nreturn {\n\trequireType = requireType,\n}',
					"Shared lookup helper that fails loudly when a custom row is missing.",
				),
				snippetFile(
					"Lua/Gameplay/CanTrainArcher.lua",
					methodDocs["player-cantrain-42"].example.language,
					methodDocs["player-cantrain-42"].example.code,
					"Method-side usage after the unit enum has been resolved cleanly.",
				),
			],
		},
		touchpoints: [
			linkToLua("Player:CanTrain", "player-cantrain-42", "methods", "Method-side example that already uses a typed unit lookup."),
			linkToLua("Team:IsHasTech", "team-ishastech-110", "methods", "Common follow-up when type checks are gated by team-level tech ownership."),
			linkToSchema("Units", "Resolve and inspect the row the enum is pointing at."),
			linkToSchema("Buildings", "The same lookup pattern applies to building types and other gameplay enums."),
		],
	},
];

export const wizardCards = [
	{
		title: "Building / Wonder Wizard",
		stage: "First Wave",
		copy: "Start with the content family modders create most often and generate the main row, common side tables, localization keys, and validation hints in one pass.",
		asks: ["Type keys and class relationship", "Cost, prerequisites, yields, flavors, and specialist data", "Civilopedia and gameplay text keys"],
		outputs: ["Core building row plus common side-table inserts", "Localization scaffold and database action split", "Optional follow-up hook stubs for dummy building and notification patterns"],
		example: {
			title: "Starter XML output",
			summary: "A first-pass generator should emit a playable building row plus at least one companion side-table insert.",
			preview: {
				resultNote: "The wizard starts with row identity, gameplay rules, and optional script extras before it writes database and text files.",
				steps: [
					{
						title: "Identity",
						copy: "Define the row keys and player-facing text first.",
						validation: "Validation: type and class keys should be unique, uppercase, and aligned before the wizard writes any companion rows.",
						fields: [
							{ label: "Building type", value: "BUILDING_FLOATING_ARCHIVES" },
							{ label: "Building class", value: "BUILDINGCLASS_FLOATING_ARCHIVES" },
							{ label: "Display name", value: "Floating Archives" },
						],
					},
					{
						title: "Gameplay rules",
						copy: "The wizard maps these answers directly into the core building row and common side tables.",
						validation: "Validation: prerequisite techs and yield types should resolve to real schema rows before the generator emits XML.",
						fields: [
							{ label: "Cost", value: "120" },
							{ label: "Prereq tech", value: "TECH_WRITING" },
							{ label: "Yield changes", values: ["YIELD_SCIENCE +2"] },
						],
					},
					{
						title: "Optional extras",
						copy: "Follow-up scaffolds stay explicit instead of being buried in a giant opaque export.",
						validation: "Validation: optional Lua hooks should only be emitted when the building actually needs script-side behavior.",
						fields: [
							{ label: "Emit text keys", value: "Yes" },
							{ label: "Emit Lua gate", value: "CityCanConstruct + tech check" },
							{ label: "Emit notifications", value: "No" },
						],
					},
				],
			},
			files: [
				snippetFile(
					"XML/Buildings/FloatingArchives.xml",
					"xml",
					'<GameData>\n\t<Buildings>\n\t\t<Row Type="BUILDING_FLOATING_ARCHIVES" BuildingClass="BUILDINGCLASS_FLOATING_ARCHIVES" Cost="120" FaithCost="-1" PrereqTech="TECH_WRITING" Description="TXT_KEY_BUILDING_FLOATING_ARCHIVES" Civilopedia="TXT_KEY_CIV5_FLOATING_ARCHIVES_TEXT" Help="TXT_KEY_BUILDING_FLOATING_ARCHIVES_HELP" ArtDefineTag="TEMPLE" MinAreaSize="-1" ConquestProb="66" HurryCostModifier="25" />\n\t</Buildings>\n\t<Building_YieldChanges>\n\t\t<Row BuildingType="BUILDING_FLOATING_ARCHIVES" YieldType="YIELD_SCIENCE" Yield="2" />\n\t</Building_YieldChanges>\n</GameData>',
					"Core gameplay rows plus a common yield companion table.",
				),
				snippetFile(
					"XML/Text/FloatingArchivesText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_BUILDING_FLOATING_ARCHIVES" Text="Floating Archives" />\n\t\t<Row Tag="TXT_KEY_BUILDING_FLOATING_ARCHIVES_HELP" Text="Provides [ICON_RESEARCH] Science and can anchor custom capital-side effects." />\n\t</Language_en_US>\n</GameData>',
					"Baseline localization block that should ship with the building row, not later.",
				),
				snippetFile(
					"Lua/Gameplay/FloatingArchivesHooks.lua",
					"lua",
					"local iTech = GameInfoTypes.TECH_WRITING\nlocal iBuilding = GameInfoTypes.BUILDING_FLOATING_ARCHIVES\n\nGameEvents.CityCanConstruct.Add(function(iPlayer, iCity, eBuilding)\n\tif eBuilding ~= iBuilding then\n\t\treturn true\n\tend\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pTeam = pPlayer and Teams[pPlayer:GetTeam()]\n\treturn pTeam and pTeam:IsHasTech(iTech)\nend)",
					"Optional gameplay hook a generator can emit when the building needs script-side gating or extras.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Buildings", "Primary gameplay row for the generated building."),
			linkToSchema("BuildingClasses", "Keep class wiring explicit for uniques and wonders."),
			linkToSchema("Building_YieldChanges", "Common companion table the wizard should emit automatically."),
			linkToLua("City:GetNumBuilding", "city-getnumbuilding-178", "methods", "Handy follow-up method for city-side checks and dummy building patterns."),
			linkToLua("Team:IsHasTech", "team-ishastech-110", "methods", "Useful when the wizard emits optional tech-gated Lua checks."),
			linkToLua("GameEvents.CityCanConstruct", "game-event-citycanconstruct-22", "gameEvents", "Useful when the generator also emits a city-level restriction hook."),
		],
	},
	{
		title: "Unique Unit Wizard",
		stage: "First Wave",
		copy: "Generate a real unit package that handles class replacement, upgrades, promotions, localization, and civ overrides instead of stopping at the main unit row.",
		asks: ["Base class replacement or standalone class", "Combat role, movement profile, and promotions", "Icon references, prereqs, and localization"],
		outputs: ["Unit row plus upgrade and promotion stubs", "Civilization override rows for uniques", "Localization and icon registration placeholders"],
		example: {
			title: "Starter XML output",
			summary: "A unit wizard should generate the unit row and the class wiring that makes it usable by a specific civ.",
			preview: {
				resultNote: "A useful unit wizard needs answers about class replacement, art, and civ ownership before it can emit valid rows.",
				steps: [
					{
						title: "Unit identity",
						copy: "Start with the replacement target and the owning civilization.",
						validation: "Validation: replacement units need both the unit class target and the owning civilization wired explicitly.",
						fields: [
							{ label: "Unit type", value: "UNIT_ATLAS_GUARD" },
							{ label: "Replaces", value: "UNITCLASS_PIKEMAN" },
							{ label: "Civilization", value: "CIVILIZATION_ATLAS" },
						],
					},
					{
						title: "Combat profile",
						copy: "These answers drive the unit row instead of leaving core values to post-generation edits.",
						validation: "Validation: combat role, moves, and upgrade class should all be coherent before the unit row is emitted.",
						fields: [
							{ label: "Combat", value: "17" },
							{ label: "Moves", value: "2" },
							{ label: "Upgrade path", value: "UNITCLASS_LANCER" },
						],
					},
					{
						title: "Presentation",
						copy: "The wizard should keep art and text wiring in the same run as the gameplay row.",
						validation: "Validation: atlas names and text keys should be emitted in the same package so the unit is testable immediately.",
						fields: [
							{ label: "Icon atlas", value: "CMC_UNIT_ATLAS" },
							{ label: "Flag atlas", value: "CMC_UNIT_FLAG_ATLAS" },
							{ label: "Emit text keys", value: "Yes" },
						],
					},
				],
			},
			files: [
				snippetFile(
					"XML/Units/AtlasGuard.xml",
					"xml",
					'<GameData>\n\t<Units>\n\t\t<Row Type="UNIT_ATLAS_GUARD" Class="UNITCLASS_PIKEMAN" CombatClass="UNITCOMBAT_MELEE" PrereqTech="TECH_CIVIL_SERVICE" Cost="100" Combat="17" Moves="2" Description="TXT_KEY_UNIT_ATLAS_GUARD" Civilopedia="TXT_KEY_CIV5_UNIT_ATLAS_GUARD_TEXT" Help="TXT_KEY_UNIT_ATLAS_GUARD_HELP" UnitArtInfo="ART_DEF_UNIT_PIKEMAN" UnitFlagAtlas="CMC_UNIT_FLAG_ATLAS" PortraitIndex="0" IconAtlas="CMC_UNIT_ATLAS" />\n\t</Units>\n\t<Unit_ClassUpgrades>\n\t\t<Row UnitType="UNIT_ATLAS_GUARD" UnitClassType="UNITCLASS_LANCER" />\n\t</Unit_ClassUpgrades>\n\t<Civilization_UnitClassOverrides>\n\t\t<Row CivilizationType="CIVILIZATION_ATLAS" UnitClassType="UNITCLASS_PIKEMAN" UnitType="UNIT_ATLAS_GUARD" />\n\t</Civilization_UnitClassOverrides>\n</GameData>',
					"Primary unit package rows with upgrade and civ override wiring.",
				),
				snippetFile(
					"XML/Text/AtlasGuardText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_UNIT_ATLAS_GUARD" Text="Atlas Guard" />\n\t\t<Row Tag="TXT_KEY_UNIT_ATLAS_GUARD_HELP" Text="A disciplined replacement for the Pikeman with stronger formation duty." />\n\t</Language_en_US>\n</GameData>',
					"Localization scaffold that should ship with the unit definition.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Units", "Primary gameplay row for the generated unit."),
			linkToSchema("Unit_ClassUpgrades", "Upgrade chain wiring should not be left to manual edits."),
			linkToSchema("Civilization_UnitClassOverrides", "Unique units need civ override rows, not just a custom unit row."),
			linkToLua("PlayerCanTrain hook", "game-event-playercantrain-70", "gameEvents", "Useful when a wizard emits optional Lua-side train restrictions."),
			linkToLua("GameEvents.CanHavePromotion", "game-event-canhavepromotion-5", "gameEvents", "Optional hook when a unit wizard also scaffolds promotion restrictions."),
			linkToLua("GameEvents.CanHaveUpgrade", "game-event-canhaveupgrade-6", "gameEvents", "Optional hook for custom upgrade gating around the generated unit line."),
		],
	},
	{
		title: "Lua Hook Wizard",
		stage: "First Wave",
		copy: "Guide modders to the correct hook family and generate a starter file that already respects callback signature, return behavior, and optional persistence or notification needs.",
		asks: ["Gameplay effect versus UI reaction", "Expected inputs and return behavior", "Persistence and notification needs"],
		outputs: ["Correct hook family starter file", "Optional save-data helper", "Optional debug and notification blocks"],
		example: {
			title: "Generated gameplay hook",
			summary: gameEventDocs["game-event-playercantrain-70"].example.summary,
			preview: {
				interactiveKind: "lua-hook",
				formDefaults: {
					callback: "PlayerCanTrain",
					targetType: "UNIT_ATLAS_GUARD",
					requiredTech: "TECH_WRITING",
					turnCache: true,
					debug: true,
					notification: false,
				},
				resultNote: "This preview is closer to an actual hook wizard: pick the event surface, the rule, and the optional extras, then emit the starter files.",
				steps: [
					{
						title: "Choose hook surface",
						copy: "The first decision is where the effect belongs.",
						validation: "Validation: choose a callback family that matches the gameplay surface and return behavior you actually need.",
						fields: [
							{ label: "Surface", value: "GameEvents" },
							{ label: "Callback", value: "PlayerCanTrain" },
							{ label: "Return behavior", value: "Boolean veto" },
						],
					},
					{
						title: "Define the rule",
						copy: "These answers drive the generated condition block inside the callback.",
						validation: "Validation: the generated condition should point at real GameInfoTypes keys instead of guessed integer IDs.",
						fields: [
							{ label: "Restrict unit", value: "UNIT_ATLAS_GUARD" },
							{ label: "Required tech", value: "TECH_WRITING" },
							{ label: "Scope", value: "Gameplay Lua" },
						],
					},
					{
						title: "Optional scaffolds",
						copy: "The wizard can emit supporting helpers without forcing them into every hook by default.",
						validation: "Validation: helper files should stay opt-in so a small hook does not turn into an oversized scaffold.",
						fields: [
							{ label: "Add turn cache", value: "Yes" },
							{ label: "Add debug trace", value: "Yes" },
							{ label: "Add notification", value: "No" },
						],
					},
				],
			},
			files: [
				snippetFile(
					"Lua/Gameplay/PlayerCanTrain.lua",
					gameEventDocs["game-event-playercantrain-70"].example.language,
					`${gameEventDocs["game-event-playercantrain-70"].example.code}\n\nlocal iActivePlayer = Game.GetActivePlayer()\nif iActivePlayer ~= -1 then\n\tprint(\"[CMC_LuaHookWizard] Active player is\", iActivePlayer)\nend`,
					"Primary gameplay callback file emitted from the wizard.",
				),
				snippetFile(
					"Lua/Shared/TurnCache.lua",
					"lua",
					"local TurnCache = {}\n\nlocal function markTurnProcessed(key)\n\tTurnCache[key] = Game.GetGameTurn()\nend\n\nlocal function processedThisTurn(key)\n\treturn TurnCache[key] == Game.GetGameTurn()\nend\n\nreturn {\n\tmarkTurnProcessed = markTurnProcessed,\n\tprocessedThisTurn = processedThisTurn,\n}",
					"Optional helper file when the generated hook needs lightweight per-turn caching.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerCanTrain", "game-event-playercantrain-70", "gameEvents", "Real callback signature and veto behavior."),
			linkToLua("Game.GetActivePlayer", "game-getactiveplayer-44", "methods", "Common helper when the generated file also services UI code."),
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Optional follow-up block when the wizard emits player feedback."),
			linkToLua("GameEvents.CityBoughtPlot", "game-event-cityboughtplot-17", "gameEvents", "Alternative hook family example for map-coordinate post-action callbacks."),
		],
	},
	{
		title: "Atlas / Art Registration Builder",
		stage: "First Wave",
		copy: "Tie the DDS and icon workflow to generated XML so portrait indices, atlas rows, and import expectations stop living in a separate manual checklist.",
		asks: ["Atlas sizes, filenames, and portrait indices", "VFS expectations and content action placement", "Flag atlas and portrait atlas naming"],
		outputs: ["IconTextureAtlases rows", "Import reminders and file placement hints", "Text-key placeholders for UI surfaces that consume the art"],
		example: {
			title: "Starter XML output",
			summary: "The wizard should emit atlas rows that line up with the filenames handed off from the art tools already on the site.",
			preview: {
				resultNote: "The wizard should feel like an intake form for atlas names, sizes, and import expectations, not just a static XML example.",
				steps: [
					{
						title: "Atlas identity",
						copy: "Name the atlas once and keep the file family aligned.",
						validation: "Validation: atlas names and portrait ranges should be stable before the generator writes registration rows.",
						fields: [
							{ label: "Atlas name", value: "CMC_UNIT_ATLAS" },
							{ label: "Flag atlas", value: "CMC_UNIT_FLAG_ATLAS" },
							{ label: "Portrait index start", value: "0" },
						],
					},
					{
						title: "Texture files",
						copy: "The builder should map multiple output sizes from the art tools into registration rows.",
						validation: "Validation: every registered atlas size should have a matching DDS file in the generated handoff.",
						fields: [
							{ label: "Main sizes", values: ["256", "64"] },
							{ label: "Flag size", value: "32" },
							{ label: "Base filename", value: "CMC_UnitAtlas" },
						],
					},
					{
						title: "Import expectations",
						copy: "The generator should make VFS and file-placement expectations visible.",
						validation: "Validation: the output should state import expectations clearly enough that art bugs do not masquerade as gameplay bugs.",
						fields: [
							{ label: "Import into VFS", value: "If UI consumer requires it" },
							{ label: "Emit checklist", value: "Yes" },
							{ label: "Art handoff", value: "DDS Converter + Civ Icon Maker" },
						],
					},
				],
			},
			files: [
				snippetFile(
					"XML/Art/AtlasRegistration.xml",
					"xml",
					'<GameData>\n\t<IconTextureAtlases>\n\t\t<Row Atlas="CMC_UNIT_ATLAS" IconSize="256" Filename="CMC_UnitAtlas256.dds" IconsPerRow="2" IconsPerColumn="2" />\n\t\t<Row Atlas="CMC_UNIT_ATLAS" IconSize="64" Filename="CMC_UnitAtlas64.dds" IconsPerRow="2" IconsPerColumn="2" />\n\t\t<Row Atlas="CMC_UNIT_FLAG_ATLAS" IconSize="32" Filename="CMC_UnitFlag32.dds" IconsPerRow="1" IconsPerColumn="1" />\n\t</IconTextureAtlases>\n</GameData>',
					"Database rows that register the atlas filenames generated by the art pipeline.",
				),
				snippetFile(
					"ModBuddy/ArtImportChecklist.txt",
					"text",
					"1. Import DDS files into the project.\\n2. Mark atlas textures for VFS if the target UI path requires it.\\n3. Keep atlas names aligned with the XML rows above.\\n4. Reuse portrait indices consistently across unit, building, or civ rows.",
					"Small handoff checklist that a generator can emit alongside the XML.",
				),
			],
		},
		touchpoints: [
			linkToSchema("IconTextureAtlases", "Atlas registration rows the generator should own."),
			{ label: "DDS Converter", href: "/dds-converter", note: "Existing tool that should hand off generated filenames into the wizard." },
			{ label: "Civ Icon Maker", href: "/civ-icon-maker", note: "Existing icon tool that can feed atlas art into the registration output." },
		],
	},
	{
		title: "Civilization + Leader Package Wizard",
		stage: "Second Wave",
		copy: "Bundle the smaller generators into a real civ package only after the building, unit, art, and text pieces are individually stable and reusable.",
		asks: ["Civilization identity, colors, traits, uniques, and city names", "Leader text, diplomacy, biases, and icons", "Which sub-generators to include in the package"],
		outputs: ["Baseline civilization and leader rows", "Localization packs and art registration stubs", "Expandable folder structure instead of one monolithic blob"],
		example: {
			title: "Starter XML output",
			summary: "Large package generators should still produce clean, separable rows instead of one giant opaque export.",
			preview: {
				resultNote: "A civilization package wizard should look like a sequence of grouped inputs that fan out into separable files, not one monolithic text dump.",
				steps: [
					{
						title: "Civilization identity",
						copy: "The package starts with civ keys, colors, and broad visual identity.",
						validation: "Validation: civ keys, colors, and art style should be coherent before the package wizard composes downstream pieces.",
						fields: [
							{ label: "Civilization type", value: "CIVILIZATION_ATLAS" },
							{ label: "Primary color", value: "PLAYERCOLOR_ATLAS" },
							{ label: "Art style", value: "ARTSTYLE_EUROPEAN" },
						],
					},
					{
						title: "Leader package",
						copy: "Leader rows need their own personality, art, and text inputs.",
						validation: "Validation: leader art, personality values, and text keys should be complete before the bridge rows are emitted.",
						fields: [
							{ label: "Leader type", value: "LEADER_NADIA" },
							{ label: "Scene file", value: "Nadia_Scene.xml" },
							{ label: "Leader atlas", value: "CMC_LEADER_ATLAS" },
						],
					},
					{
						title: "Included sub-generators",
						copy: "The package wizard should explicitly declare what it is composing.",
						validation: "Validation: large package generators should list included sub-generators explicitly instead of hiding scope in one opaque export.",
						fields: [
							{ label: "Include", values: ["Leader rows", "Localization", "Art atlases"] },
							{ label: "Skip for now", value: "Trait and uniques" },
						],
					},
				],
			},
			files: [
				snippetFile(
					"XML/Civilizations/AtlasCivilization.xml",
					"xml",
					'<GameData>\n\t<Civilizations>\n\t\t<Row Type="CIVILIZATION_ATLAS" Description="TXT_KEY_CIV_ATLAS_DESC" ShortDescription="TXT_KEY_CIV_ATLAS_SHORT_DESC" Adjective="TXT_KEY_CIV_ATLAS_ADJECTIVE" DefaultPlayerColor="PLAYERCOLOR_ATLAS" ArtDefineTag="ART_DEF_CIVILIZATION_ATLAS" ArtStyleType="ARTSTYLE_EUROPEAN" PortraitIndex="0" IconAtlas="CMC_CIV_ATLAS" />\n\t</Civilizations>\n\t<Civilization_Leaders>\n\t\t<Row CivilizationType="CIVILIZATION_ATLAS" LeaderheadType="LEADER_NADIA" />\n\t</Civilization_Leaders>\n</GameData>',
					"Civilization rows kept separate from leader and text data.",
				),
				snippetFile(
					"XML/Leaders/NadiaLeader.xml",
					"xml",
					'<GameData>\n\t<Leaders>\n\t\t<Row Type="LEADER_NADIA" Description="TXT_KEY_LEADER_NADIA" Civilopedia="TXT_KEY_CIV5_LEADER_NADIA_TEXT" ArtDefineTag="Nadia_Scene.xml" VictoryCompetitiveness="7" WonderCompetitiveness="5" Boldness="6" Loyalty="8" PortraitIndex="0" IconAtlas="CMC_LEADER_ATLAS" />\n\t</Leaders>\n</GameData>',
					"Leader-specific personality and art rows in a dedicated file.",
				),
				snippetFile(
					"XML/Text/AtlasPackText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_CIV_ATLAS_DESC" Text="Atlas Confederacy" />\n\t\t<Row Tag="TXT_KEY_LEADER_NADIA" Text="Nadia" />\n\t</Language_en_US>\n</GameData>',
					"Separate localization output so the generated package remains editable by hand.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Civilizations", "Primary civilization row set."),
			linkToSchema("Leaders", "Leader personality and art metadata."),
			linkToSchema("Civilization_Leaders", "Bridge table that ties the civ package together."),
			linkToSchema("Traits", "Trait rows are a natural companion generator once the package wizard grows."),
		],
	},
];

export const guardrails = [
	{
		title: "Event family correctness",
		copy: "The wizard layer should never force modders to memorize the difference between GameEvents, Events, and LuaEvents. That routing belongs in the generator.",
		source: "Internal hook docs + Lua API Explorer",
	},
	{
		title: "VFS is explicit",
		copy: "Generators should state which files belong in VFS and which belong in content actions, especially for UI Lua, XML includes, and art registration.",
		source: "Internal setup docs + Schema Browser",
	},
	{
		title: "Localization always ships",
		copy: "Every gameplay wizard should emit text keys as part of the baseline package, not as an optional later step.",
		source: "Internal localization docs",
	},
	{
		title: "No magic IDs",
		copy: "Lua-oriented generators should prefer GameInfoTypes lookup patterns and safe guards instead of raw integer assumptions.",
		source: "Schema Browser + Lua API Explorer",
	},
	{
		title: "Persistence is namespaced",
		copy: "When a wizard adds save data, it should also add key naming and lightweight caching so the generated code remains maintainable.",
		source: "Internal persistence docs",
	},
];

export const implementationStages = [
	{
		label: "Stage 1",
		title: "Recipe-backed helpers first",
		copy: "Use the Recipe Library to prove the small patterns: localization, event routing, persistence, VFS wiring, and debug helpers.",
	},
	{
		label: "Stage 2",
		title: "Single-domain wizards",
		copy: "Ship building, unit, Lua hook, and atlas builders once the shared helper logic is stable.",
	},
	{
		label: "Stage 3",
		title: "Large package generators",
		copy: "Only then combine the smaller pieces into civilization, leader, or project-level builders.",
	},
];

export const internalCrossLinks = [
	{
		title: "Recipe Library",
		copy: "Recipes should own the compact patterns that the larger generators compose, especially the code that needs to stay easy to audit by hand.",
		links: [{ label: "Open Recipe Library", href: "/recipe-library" }],
		planned: ["Event docs", "Persistence docs", "Localization docs"],
	},
	{
		title: "Lua API Explorer",
		copy: "Browser for authored examples, callback signatures, parameter hints, notes, and code snippets that can be injected directly into wizard output.",
		links: [{ label: "Open Lua API Explorer", href: "/lua-api-explorer" }],
		planned: ["Callback signatures", "Entry summaries", "Events + LuaEvents imports"],
	},
	{
		title: "Schema Browser",
		copy: "Browser for gameplay tables, side-table relationships, and enum targets that can drive generator validation and richer starter output.",
		links: [{ label: "Open Schema Browser", href: "/schema-browser" }],
		planned: ["Side-table hints", "Type lookup cross-links", "Generator validation rules"],
	},
	{
		title: "Existing Build Tools",
		copy: "Generators should hand work off to the site's working tools instead of inventing disconnected workflows for icons, DDS conversion, or modinfo wiring.",
		links: [
			{ label: "ModInfo Builder", href: "/modinfo-builder" },
			{ label: "DDS Converter", href: "/dds-converter" },
			{ label: "Civ Icon Maker", href: "/civ-icon-maker" },
		],
		planned: ["Atlas handoff", "Project wiring handoff"],
	},
];

export const researchLinks = [
	{ label: "Civ5 XML Reference", href: "https://modiki.civfanatics.com/index.php/Civ5_XML_Reference" },
	{ label: "Debugging (Civ5)", href: "https://modiki.civfanatics.com/index.php/Debugging_%28Civ5%29" },
	{ label: "VFS (Civ5)", href: "https://modiki.civfanatics.com/index.php/VFS_%28Civ5%29" },
	{ label: "GameInfoTypes (Civ5 Type)", href: "https://modiki.civfanatics.com/index.php/GameInfoTypes_%28Civ5_Type%29" },
	{ label: "Persisting data (Civ5)", href: "https://modiki.civfanatics.com/index.php/Persisting_data_%28Civ5%29" },
];

export const datasetNotes = [
	"GameEvents authoring workbook: 89 callback entries available for generator validation and signature hints.",
	"Methods authoring workbook: 2,310 method signatures across 12 object families available for API lookup support.",
];

export const internalDocLanes = [
	{
		title: "Gameplay Hook Docs",
		copy: "Internal docs for event families, callback signatures, return behavior, and when to use GameEvents, Events, or LuaEvents.",
		links: [
			{ label: "Recipe Library", href: "/recipe-library" },
			{ label: "Lua API Explorer", href: "/lua-api-explorer" },
			{ label: "Wizard Generators", href: "/wizard-generators" },
		],
		planned: ["GameEvents workbook import", "Events import"],
	},
	{
		title: "Data Model Docs",
		copy: "Internal docs for table relationships, common side-table dependencies, and type lookups that should cross-link directly into the Schema Browser.",
		links: [
			{ label: "Schema Browser", href: "/schema-browser" },
			{ label: "ModInfo Builder", href: "/modinfo-builder" },
			{ label: "Community Links", href: "/community-links" },
		],
		planned: ["Methods workbook import", "Type constant index"],
	},
	{
		title: "Text and UI Docs",
		copy: "Internal guides for localization, text markup, notifications, and UI include patterns so the team can keep examples up to date in one place.",
		links: [
			{ label: "Recipe Library", href: "/recipe-library" },
			{ label: "Community Links", href: "/community-links" },
		],
		planned: ["Localization docs", "Markup guide"],
	},
	{
		title: "Project Setup Docs",
		copy: "Internal guides for VFS, project actions, debug logging, and common failure patterns that can reference both recipes and first-party browsers.",
		links: [
			{ label: "ModInfo Builder", href: "/modinfo-builder" },
			{ label: "Wizard Generators", href: "/wizard-generators" },
		],
		planned: ["Debug playbook", "VFS guide"],
	},
];

export const researchBasisLinks = [
	{ label: "Civ5 XML Reference", href: "https://modiki.civfanatics.com/index.php/Civ5_XML_Reference" },
	{ label: "Debugging (Civ5)", href: "https://modiki.civfanatics.com/index.php/Debugging_%28Civ5%29" },
	{ label: "VFS (Civ5)", href: "https://modiki.civfanatics.com/index.php/VFS_%28Civ5%29" },
	{ label: "Localization Tutorial", href: "https://modiki.civfanatics.com/index.php/Localization_Tutorial_%28Civ5%29" },
	{ label: "Text icons and markups", href: "https://modiki.civfanatics.com/index.php/Text_icons_and_markups_%28Civ5%29" },
	{ label: "Persisting data", href: "https://modiki.civfanatics.com/index.php/Persisting_data_%28Civ5%29" },
];

export const authoringDatasets = [
	{
		title: "GameEvents workbook",
		value: "89 entries",
		copy: "Local authoring workbook used as the definitive callback list while building event-selection recipes and starter hook generators.",
	},
	{
		title: "Methods workbook",
		value: "2,310 signatures",
		copy: "Local API index spanning 12 method families available for example snippets, parameter hints, and method-side generator output.",
	},
];

export const firstShipPrinciples = [
	"Ship recipes that reduce repeated setup work before building giant end-to-end project wizards.",
	"Move the durable knowledge into first-party docs so the team can revise examples without depending on external sites.",
	"Bias toward generators that help modders verify correctness: event routing, VFS wiring, localization, persistence, and logging.",
];
