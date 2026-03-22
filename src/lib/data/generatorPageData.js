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

const linkToPage = (label, href, note, options = {}) => ({
	label,
	href,
	note,
	...options,
});

// const snippetRoleLead = (path, language) => {
// 	const normalizedLanguage = normalizeSnippetLanguage(language);
// 	const normalizedPath = String(path).toLowerCase();
// 	const extension = normalizedPath.split(".").pop() || "";

// 	if (normalizedLanguage === "sql") {
// 		if (normalizedPath.includes("/audio/")) {
// 			return "This SQL file registers the audio-side database rows and links.";
// 		}

// 		if (normalizedPath.includes("/art/")) {
// 			return "This SQL file registers the art-side rows that point at imported assets.";
// 		}

// 		if (normalizedPath.includes("/debug/")) {
// 			return "This SQL file is a minimal database probe for proving the file loaded.";
// 		}

// 		if (normalizedPath.includes("/compatibility/")) {
// 			return "This SQL file holds the compatibility patch rows for the external dependency.";
// 		}

// 		if (normalizedPath.includes("/civilizations/") || normalizedPath.includes("/leaders/")) {
// 			return "This SQL file wires the civ, leader, trait, or naming rows into the game database.";
// 		}

// 		if (normalizedPath.includes("/policies/")) {
// 			return "This SQL file defines the policy rows, joins, and payload tables for the unlock.";
// 		}

// 		if (normalizedPath.includes("/units/")) {
// 			return "This SQL file creates or patches the unit rows, class links, and promotions for the pattern.";
// 		}

// 		if (normalizedPath.includes("/buildings/")) {
// 			return "This SQL file creates the building-side rows and effect tables the pattern depends on.";
// 		}

// 		return "This SQL file is the database payload that creates or patches the gameplay rows.";
// 	}

// 	if (normalizedLanguage === "xml") {
// 		if (normalizedPath.includes("/text/")) {
// 			return "This XML file carries the localized strings the player sees in names, tooltips, and notifications.";
// 		}

// 		if (normalizedPath.includes("/art/")) {
// 			return "This XML file points Civ V at art defs, atlases, or scene assets referenced elsewhere.";
// 		}

// 		return "This XML file handles declarative data wiring that complements the recipe.";
// 	}

// 	if (normalizedLanguage === "lua") {
// 		if (normalizedPath.includes("/ui/") || normalizedPath.includes("/overrides/") || normalizedPath.startsWith("ui/")) {
// 			return "This Lua file runs in the UI context, so it controls panels, addins, or overrides.";
// 		}

// 		if (normalizedPath.includes("/shared/") || normalizedPath.includes("/utilities/")) {
// 			return "This Lua file is a reusable helper module other scripts include rather than a hook on its own.";
// 		}

// 		if (normalizedPath.includes("/config/")) {
// 			return "This Lua file centralizes feature flags or config lookups that other scripts branch on.";
// 		}

// 		if (normalizedPath.includes("/gameplay/")) {
// 			return "This Lua file is the gameplay execution layer: it listens for events and applies the scripted effect.";
// 		}

// 		return "This Lua file is the scripted logic layer for the recipe.";
// 	}

// 	if (extension === "modinfo") {
// 		return "This manifest file tells Civ V which files to import, expose through VFS, and load.";
// 	}

// 	if (normalizedLanguage === "ini" || extension === "ini") {
// 		return "This config file is where you flip the feature on, off, or into a safer debug mode.";
// 	}

// 	if (normalizedPath.includes("/logs/")) {
// 		return "This checklist helps you validate load order and read the right logs before changing code again.";
// 	}

// 	if (normalizedPath.includes("/docs/") || normalizedPath.includes("/project/") || normalizedLanguage === "text") {
// 		return "This reference note is a compact decision guide or checklist for the pattern.";
// 	}

// 	return "Use this file as the supporting reference for the pattern.";
// };

const friendlySnippetNote = (path, language, note = "") => {
	const cleanedNote = String(note).trim();
	if (!cleanedNote) {
		return "";
	}

	return `${cleanedNote}`;
};

const SCAFFOLD_STEM_PLACEHOLDER = "<Civ_Leader>";
const SCAFFOLD_GAME_DEFINES_PATH = `Core/${SCAFFOLD_STEM_PLACEHOLDER}_GameDefines.sql`;
const SCAFFOLD_GAME_TEXT_PATH = `Core/${SCAFFOLD_STEM_PLACEHOLDER}_GameText.xml`;
const SCAFFOLD_ART_DEFINES_PATH = `Core/${SCAFFOLD_STEM_PLACEHOLDER}_ArtDefines.sql`;
const SCAFFOLD_MOD_SUPPORT_PATH = `Core/${SCAFFOLD_STEM_PLACEHOLDER}_ModSupport.sql`;
const SCAFFOLD_FUNCTIONS_PATH = `Lua/${SCAFFOLD_STEM_PLACEHOLDER}_Functions.lua`;

const normalizeScaffoldSnippetPath = (path, language = "") => {
	const normalizedPath = String(path ?? "")
		.trim()
		.replace(/\\/g, "/");
	if (!normalizedPath) {
		return normalizedPath;
	}

	if (normalizedPath.includes("/Core/") || normalizedPath.includes("/Lua/") || normalizedPath.includes("/UI/") || normalizedPath.includes("/Audio/") || normalizedPath.includes("/Art/")) {
		return normalizedPath;
	}

	const fileName = normalizedPath.split("/").pop() ?? normalizedPath;
	const normalizedLanguage = String(language ?? "")
		.trim()
		.toLowerCase();
	const lowerPath = normalizedPath.toLowerCase();

	if (
		normalizedPath === SCAFFOLD_GAME_DEFINES_PATH ||
		normalizedPath === SCAFFOLD_GAME_TEXT_PATH ||
		normalizedPath === SCAFFOLD_ART_DEFINES_PATH ||
		normalizedPath === SCAFFOLD_MOD_SUPPORT_PATH ||
		normalizedPath === SCAFFOLD_FUNCTIONS_PATH
	) {
		return normalizedPath;
	}

	if (normalizedPath.startsWith("Core/")) {
		if (lowerPath.includes("gametext") || lowerPath.includes("text")) {
			return SCAFFOLD_GAME_TEXT_PATH;
		}
		if (lowerPath.includes("artdefine") || lowerPath.includes("art")) {
			return SCAFFOLD_ART_DEFINES_PATH;
		}
		if (lowerPath.includes("modsupport") || lowerPath.includes("support")) {
			return SCAFFOLD_MOD_SUPPORT_PATH;
		}
		return SCAFFOLD_GAME_DEFINES_PATH;
	}

	if (normalizedPath.startsWith("Lua/")) {
		if (normalizedPath.startsWith("Lua/UI/") || normalizedPath.startsWith("Lua/Overrides/")) {
			return `UI/${fileName}`;
		}
		return SCAFFOLD_FUNCTIONS_PATH;
	}

	if (normalizedPath.startsWith("UI/")) {
		return `UI/${fileName}`;
	}

	if (normalizedPath.startsWith("Audio/")) {
		return `Audio/${fileName}`;
	}

	if (normalizedPath.startsWith("Art/")) {
		return normalizedPath;
	}

	if (normalizedPath.startsWith("Project/")) {
		return fileName;
	}

	if (normalizedPath.startsWith("Lua/UI/") || normalizedPath.startsWith("Lua/Overrides/") || normalizedPath.startsWith("UI/")) {
		return `UI/${fileName}`;
	}

	if (normalizedPath.startsWith("Lua/")) {
		return SCAFFOLD_FUNCTIONS_PATH;
	}

	if (normalizedPath.startsWith("Audio/")) {
		return `Audio/${fileName}`;
	}

	if (normalizedPath.startsWith("XML/Art/")) {
		return SCAFFOLD_ART_DEFINES_PATH;
	}

	if (normalizedPath.startsWith("Art/")) {
		return `Art/${fileName}`;
	}

	if (normalizedPath.startsWith("SQL/")) {
		if (lowerPath.includes("art")) {
			return SCAFFOLD_ART_DEFINES_PATH;
		}
		if (lowerPath.includes("support")) {
			return SCAFFOLD_MOD_SUPPORT_PATH;
		}
		return SCAFFOLD_GAME_DEFINES_PATH;
	}

	if (normalizedPath.startsWith("XML/")) {
		return SCAFFOLD_GAME_TEXT_PATH;
	}

	if (normalizedPath.startsWith("Config/")) {
		return fileName;
	}

	if (normalizedLanguage === "lua") {
		return SCAFFOLD_FUNCTIONS_PATH;
	}

	if (normalizedLanguage === "sql") {
		return SCAFFOLD_GAME_DEFINES_PATH;
	}

	if (normalizedLanguage === "xml") {
		return SCAFFOLD_GAME_TEXT_PATH;
	}

	if (normalizedLanguage === "ini") {
		return fileName;
	}

	return normalizedPath;
};

const snippetFile = (path, language, code, note = "", label = "") => {
	const normalizedPath = normalizeScaffoldSnippetPath(path, language);
	return {
		key: `${normalizedPath}::${String(path ?? "").trim() || String(label ?? "").trim() || String(language ?? "").trim()}`,
		path: normalizedPath,
		language,
		code,
		note: friendlySnippetNote(path, language, note),
		label,
	};
};

export const recipeLaunchRecipes = [
	{
		title: "Dummy Building Scaffold",
		focus: "Hidden proxy setup",
		status: "First Batch",
		copy: "Dummy buildings are hidden proxies that modders grant indirectly to cities so the game can apply yields, prerequisites, and other building-driven effects to apply the desired effects for your civ. This recipe keeps that proxy on its own building class so class ensitive logic stays attached to the correct row instead of silently resolving against the wrong class member.",
		deliverables: [
			"Dedicated “BuildingClasses” and “Buildings” rows for an unbuildable dummy building.",
			"Optional effect rows such as “Building_YieldChanges” or other building-side tables.",
			"Small Lua-side validation pattern for checking whether the dummy proxy is present on a city.",
		],
		example: {
			title: "Hidden building scaffold",
			summary:
				"Modders use dummy buildings as invisible proxies: Lua, decisions, policies, or other gameplay rules add the building behind the scenes, then the game applies whatever effect tables are attached to that building row. Use a dedicated class, keep the row unbuildable, and only add text if the building appears to the player.",
			files: [
				snippetFile(
					"SQL/Buildings/DummyBuilding.sql",
					"sql",
					"INSERT INTO BuildingClasses (Type, DefaultBuilding, Description)\nVALUES\n\t('BUILDINGCLASS_CMC_DUMMY_GARRISON', 'BUILDING_CMC_DUMMY_GARRISON', 'TXT_KEY_BUILDING_CMC_DUMMY_GARRISON');\n\nINSERT INTO Buildings\n\t(Type, BuildingClass, Cost, FaithCost, GreatWorkCount, NeverCapture, NukeImmune, ConquestProb, Description, Help)\nVALUES\n\t('BUILDING_CMC_DUMMY_GARRISON', 'BUILDINGCLASS_CMC_DUMMY_GARRISON', -1, -1, -1, 1, 1, 0, 'TXT_KEY_BUILDING_CMC_DUMMY_GARRISON', 'TXT_KEY_BUILDING_CMC_DUMMY_GARRISON_HELP');\n\nINSERT INTO Building_YieldChanges (BuildingType, YieldType, Yield)\nVALUES\n\t('BUILDING_CMC_DUMMY_GARRISON', 'YIELD_PRODUCTION', 1);",
					"Dedicated building class plus the dummy building row in SQL. This keeps the structural database work in the format most mods prefer for inserts and patches.",
				),
				snippetFile(
					"XML/Text/DummyBuildingText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag=\"TXT_KEY_BUILDING_CMC_DUMMY_GARRISON\" Text=\"Hidden Garrison State\" />\n\t\t<Row Tag=\"TXT_KEY_BUILDING_CMC_DUMMY_GARRISON_HELP\" Text=\"Internal proxy building used for gated city effects.\" />\n\t</Language_en_US>\n</GameData>',
					"Only needed when the dummy row references description or help keys or when you want a visible debug label during testing.",
				),
				snippetFile(
					"Lua/Gameplay/DummyBuildingChecks.lua",
					"lua",
					"local iDummy = GameInfoTypes.BUILDING_CMC_DUMMY_GARRISON\nlocal iTarget = GameInfoTypes.BUILDING_BARRACKS\n\nGameEvents.CityCanConstruct.Add(function(iPlayer, iCity, eBuilding)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCity = pPlayer and pPlayer:GetCityByID(iCity)\n\tif pCity and eBuilding == iTarget then\n\t\treturn pCity:GetNumBuilding(iDummy) > 0\n\tend\n\treturn true\nend)",
					"Easy validation pattern that checks whether the hidden proxy is currently present on a city before another effect unlocks.",
				),
			],
		},
		touchpoints: [
			linkToSchema("BuildingClasses", "Dummy buildings with sensitive effects should usually own a dedicated class so the game resolves the intended hidden proxy row.", "rows"),
			linkToSchema("Buildings", "Keep the dummy row unbuildable and explicitly tied to its class so you add it indirectly instead of letting players construct it.", "rows"),
			linkToSchema("Building_YieldChanges", "One example payload table that turns the hidden proxy into a real city effect once the dummy building is present.", "rows"),
			linkToSchema("Civilization_BuildingClassOverrides", "Only use overrides when a civ needs a different member of the same dummy class.", "rows"),
			linkToLua("City:GetNumBuilding", "city-getnumbuilding-178", "methods", "Fast check for whether the hidden proxy is active on the city."),
			linkToLua("GameEvents.CityCanConstruct", "game-event-citycanconstruct-22", "gameEvents", "Typical gate hook for testing whether the hidden proxy should unlock another action."),
			linkToPage("Dynamic Dummy Building Updater", "/pattern-library", "Natural next step when the hidden proxy stops being static and starts syncing with changing city state."),
			linkToPage(
				"Dummy Policy / Dummy Building Tradeoff",
				"/pattern-library",
				"Good companion when the real question is whether this hidden effect should live on an empire-wide policy or a city-scoped dummy building.",
			),
		],
	},
	{
		title: "Trait / Leader / Civ Wiring",
		focus: "Core civ package joins",
		status: "First Batch",
		copy: "Wire a custom trait into the actual leader and civilization package instead of stopping at the “Traits” row. This is the repetitive join work almost every civ mod has to repeat before any trait effect actually reaches gameplay.",
		deliverables: [
			"Trait definition plus one starter trait effect table.",
			"“Leader_Traits” and “Civilization_Leaders” link rows that actually wire the trait into the civ package.",
			"Matching game text for the trait name and help copy.",
		],
		example: {
			title: "Trait + civ package scaffold",
			summary: "Define the trait, attach it to the leader, then attach the leader to the civilization so the effect chain is complete.",
			files: [
				snippetFile(
					"SQL/Civilizations/MaritimeCompactTrait.sql",
					"sql",
					"INSERT INTO Traits (Type, Description, ShortDescription)\nVALUES\n\t('TRAIT_CMC_MARITIME_COMPACT', 'TXT_KEY_TRAIT_CMC_MARITIME_COMPACT', 'TXT_KEY_TRAIT_CMC_MARITIME_COMPACT_SHORT');\n\nINSERT INTO Trait_YieldChanges (TraitType, YieldType, Yield)\nVALUES\n\t('TRAIT_CMC_MARITIME_COMPACT', 'YIELD_GOLD', 1);\n\nINSERT INTO Leader_Traits (LeaderType, TraitType)\nVALUES\n\t('LEADER_CMC_NAVARCH', 'TRAIT_CMC_MARITIME_COMPACT');\n\nINSERT INTO Civilization_Leaders (CivilizationType, LeaderheadType)\nVALUES\n\t('CIVILIZATION_CMC_ATLAS', 'LEADER_CMC_NAVARCH');",
					"Minimal trait package showing the row that defines the trait, one effect table, and the two joins that actually bind it to a civ.",
				),
				snippetFile(
					"XML/Text/MaritimeCompactTraitText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_TRAIT_CMC_MARITIME_COMPACT" Text="Maritime Compact" />\n\t\t<Row Tag="TXT_KEY_TRAIT_CMC_MARITIME_COMPACT_SHORT" Text="+1 [ICON_GOLD] Gold from coastal trade starters." />\n\t</Language_en_US>\n</GameData>',
					"Trait text companion file so the trait row does not ship with unresolved text keys.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Traits", "Core trait row where the trait key and text references start.", "rows"),
			linkToSchema("Trait_YieldChanges", "One of the common starter effect tables for custom trait bonuses.", "rows"),
			linkToSchema("Leader_Traits", "Join table that binds the trait to a leader.", "rows"),
			linkToSchema("Civilization_Leaders", "Join table that makes the civilization actually use the leader carrying the trait.", "rows"),
			linkToSchema("Leaders", "Validate that the target leader row already exists before wiring the trait.", "rows"),
			{
				label: "Civilization Starter",
				href: "/template-generators?generator=civilization-starter",
				note: "Use the template generator when you want these core trait, leader, and civ joins emitted as part of a full civ starter bundle instead of wiring them by hand.",
			},
		],
	},
	{
		title: "Unique Replacement Setup",
		focus: "UU / UB overrides",
		status: "First Batch",
		copy: "Clone a base unit or building, wire it into the civilization override table, and attach any free promotions or text keys in one pass. This is one of the most repeated bits of civ modding.",
		deliverables: [
			"Base row pattern for a unique unit or building.",
			"“Civilization_UnitClassOverrides” or “Civilization_BuildingClassOverrides” rows.",
			"Optional free promotion and text scaffolding for the replacement row.",
		],
		example: {
			title: "Unique unit replacement scaffold",
			summary: "Clone the base unit with SQL “SELECT”, then override the civ’s unit class link and attach any starter promotion rows.",
			files: [
				snippetFile(
					"SQL/Civilizations/AtlasLongbow.sql",
					"sql",
					"INSERT INTO Units\n\t(Type, Class, CombatClass, PrereqTech, Combat, RangedCombat, Range, Cost, Moves, DefaultUnitAI, Domain, Description, Help, Civilopedia, Strategy, MilitarySupport, MilitaryProduction, Pillage, ObsoleteTech, GoodyHutUpgradeUnitClass, XPValueAttack, XPValueDefense, UnitArtInfo, UnitFlagAtlas, UnitFlagIconOffset, IconAtlas, PortraitIndex)\nSELECT\n\t'UNIT_CMC_ATLAS_LONGBOW', Class, CombatClass, PrereqTech, Combat + 1, RangedCombat + 2, Range, Cost, Moves, DefaultUnitAI, Domain,\n\t'TXT_KEY_UNIT_CMC_ATLAS_LONGBOW', 'TXT_KEY_UNIT_CMC_ATLAS_LONGBOW_HELP', 'TXT_KEY_CIV5_UNIT_CMC_ATLAS_LONGBOW_TEXT', Strategy,\n\tMilitarySupport, MilitaryProduction, Pillage, ObsoleteTech, GoodyHutUpgradeUnitClass, XPValueAttack, XPValueDefense,\n\tUnitArtInfo, UnitFlagAtlas, UnitFlagIconOffset, IconAtlas, PortraitIndex\nFROM Units\nWHERE Type = 'UNIT_ARCHER';\n\nINSERT INTO Civilization_UnitClassOverrides (CivilizationType, UnitClassType, UnitType)\nVALUES\n\t('CIVILIZATION_CMC_ATLAS', 'UNITCLASS_ARCHER', 'UNIT_CMC_ATLAS_LONGBOW');\n\nINSERT INTO Unit_FreePromotions (UnitType, PromotionType)\nVALUES\n\t('UNIT_CMC_ATLAS_LONGBOW', 'PROMOTION_DRILL_1');",
					"Clone-from-base pattern for a unique unit, followed by the civ override and an optional free-promotion row.",
				),
				snippetFile(
					"XML/Text/AtlasLongbowText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_UNIT_CMC_ATLAS_LONGBOW" Text="Atlas Longbow" />\n\t\t<Row Tag="TXT_KEY_UNIT_CMC_ATLAS_LONGBOW_HELP" Text="A ranged replacement with stronger opening volleys." />\n\t\t<Row Tag="TXT_KEY_CIV5_UNIT_CMC_ATLAS_LONGBOW_TEXT" Text="TODO: Add Civilopedia entry." />\n\t</Language_en_US>\n</GameData>',
					"Text file for the replacement row after the SQL clone swaps the description and help keys.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Units", "Base table for cloning and retuning the replacement row.", "rows"),
			linkToSchema("UnitClasses", "Validate the class being overridden before attaching the unique row.", "rows"),
			linkToSchema("Civilization_UnitClassOverrides", "Core civ override table for unique units.", "rows"),
			linkToSchema("Civilization_BuildingClassOverrides", "Same pattern when the replacement is a unique building instead of a unit.", "rows"),
			linkToSchema("Unit_FreePromotions", "Starter place to attach a free promotion to the replacement unit.", "rows"),
			{
				label: "Civilization Starter",
				href: "/template-generators?generator=civilization-starter",
				note: "The template generator already lays out the civ-side unique base; use this recipe when you want to deepen or customize the replacement rows beyond the starter output.",
			},
		],
	},
	{
		title: "Promotion Chain Setup",
		focus: "Promotion trees",
		status: "First Batch",
		copy: "Define a custom promotion line, restrict it to the correct unit combats, optionally seed it onto a unit, and add a Lua gate when the normal promotion path needs extra rules.",
		deliverables: [
			"Promotion rows with text keys and basic metadata.",
			"“UnitPromotions_UnitCombats” and optional “Unit_FreePromotions” wiring.",
			"Lua veto pattern for promotions that need custom rules beyond the database tables.",
		],
		example: {
			title: "Two step promotion chain",
			summary: "Promotion rows live in SQL, unit-combat restrictions live in join tables, and Lua only steps in when the base rules are not enough.",
			files: [
				snippetFile(
					"SQL/Units/VolleyPromotionChain.sql",
					"sql",
					"INSERT INTO UnitPromotions (Type, Description, Help, Sound, CannotBeChosen)\nVALUES\n\t('PROMOTION_CMC_VOLLEY_I', 'TXT_KEY_PROMOTION_CMC_VOLLEY_I', 'TXT_KEY_PROMOTION_CMC_VOLLEY_I_HELP', 'AS2D_IF_LEVELUP', 0),\n\t('PROMOTION_CMC_VOLLEY_II', 'TXT_KEY_PROMOTION_CMC_VOLLEY_II', 'TXT_KEY_PROMOTION_CMC_VOLLEY_II_HELP', 'AS2D_IF_LEVELUP', 0);\n\nINSERT INTO UnitPromotions_UnitCombats (PromotionType, UnitCombatType)\nVALUES\n\t('PROMOTION_CMC_VOLLEY_I', 'UNITCOMBAT_ARCHER'),\n\t('PROMOTION_CMC_VOLLEY_II', 'UNITCOMBAT_ARCHER');\n\nINSERT INTO Unit_FreePromotions (UnitType, PromotionType)\nVALUES\n\t('UNIT_CMC_ATLAS_LONGBOW', 'PROMOTION_CMC_VOLLEY_I');",
					"Starter promotion chain with unit-combat restrictions and an optional free-promotion seed for a custom unit.",
				),
				snippetFile(
					"XML/Text/VolleyPromotionText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_PROMOTION_CMC_VOLLEY_I" Text="Volley I" />\n\t\t<Row Tag="TXT_KEY_PROMOTION_CMC_VOLLEY_I_HELP" Text="+10% ranged strength when attacking from open terrain." />\n\t\t<Row Tag="TXT_KEY_PROMOTION_CMC_VOLLEY_II" Text="Volley II" />\n\t\t<Row Tag="TXT_KEY_PROMOTION_CMC_VOLLEY_II_HELP" Text="+15% ranged strength when attacking from open terrain." />\n\t</Language_en_US>\n</GameData>',
					"Promotion text should ship with the promotion rows so help text is visible immediately in-game.",
				),
				snippetFile(
					"Lua/Gameplay/PromotionGate.lua",
					"lua",
					"GameEvents.CanHavePromotion.Add(function(iPlayer, iUnit, ePromotion)\n\tif ePromotion == GameInfoTypes.PROMOTION_CMC_VOLLEY_II then\n\t\tlocal pPlayer = Players[iPlayer]\n\t\tlocal pUnit = pPlayer and pPlayer:GetUnitByID(iUnit)\n\t\treturn pUnit and pUnit:GetExperience() >= 30\n\tend\n\treturn true\nend)",
					"Promotion veto hook for chains that need scenario or experience checks beyond the normal database links.",
				),
			],
		},
		touchpoints: [
			linkToSchema("UnitPromotions", "Core promotion rows, text keys, and visible metadata.", "rows"),
			linkToSchema("UnitPromotions_UnitCombats", "Restrict the promotion to the correct combat classes.", "rows"),
			linkToSchema("Unit_FreePromotions", "Seed the chain onto a specific unit when it should start with the first promotion.", "rows"),
			linkToLua("GameEvents.CanHavePromotion", "game-event-canhavepromotion-5", "gameEvents", "Gate promotions when the database rows alone are not enough."),
		],
	},
	{
		title: "SaveData Cooldown / Once-Per-City / Once-Per-Player",
		focus: "Persistent state",
		status: "First Batch",
		copy: "Persist turn markers and scoped keys so a reward, trigger, or scripted effect only fires once per turn, once per city, or once per player instead of retriggering every time the hook runs.",
		deliverables: [
			"Namespaced save keys for player and city scope.",
			"Turn-based cooldown checks using “Game.GetGameTurn()”.",
			"A starter gameplay consumer that demonstrates a once-per-turn or once-per-city reward path.",
		],
		example: {
			title: "Once-per-city turn reward",
			summary: "Store the last processed turn per city, then bail early if the effect already fired this turn.",
			files: [
				snippetFile(
					"Lua/Shared/Cooldowns.lua",
					"lua",
					'local ModData = Modding.OpenSaveData()\nlocal KEY_PREFIX = "CMC_MyMod_"\n\nlocal function cityKey(iPlayer, iCity, suffix)\n\treturn string.format("%sP%d_C%d_%s", KEY_PREFIX, iPlayer, iCity, suffix)\nend\n\nlocal function canProcessCityThisTurn(iPlayer, iCity, suffix)\n\tlocal turn = Game.GetGameTurn()\n\tlocal key = cityKey(iPlayer, iCity, suffix)\n\treturn (ModData.GetValue(key) or -1) ~= turn\nend\n\nlocal function markCityProcessed(iPlayer, iCity, suffix)\n\tModData.SetValue(cityKey(iPlayer, iCity, suffix), Game.GetGameTurn())\nend\n\nreturn {\n\tcanProcessCityThisTurn = canProcessCityThisTurn,\n\tmarkCityProcessed = markCityProcessed,\n}',
					"Shared persistence helper for once-per-city cooldown keys keyed by player, city, and turn.",
				),
				snippetFile(
					"Lua/Gameplay/CapitalTurnReward.lua",
					"lua",
					'local Cooldowns = include("Cooldowns")\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tif not pCapital then\n\t\treturn\n\tend\n\tif not Cooldowns.canProcessCityThisTurn(iPlayer, pCapital:GetID(), "CapitalReward") then\n\t\treturn\n\tend\n\n\tCooldowns.markCityProcessed(iPlayer, pCapital:GetID(), "CapitalReward")\n\tprint("[CMC_MyMod] Granted capital reward on turn", Game.GetGameTurn(), "for player", iPlayer)\nend)',
					"Gameplay-side consumer that demonstrates a once-per-turn capital reward path with a persisted cooldown marker.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Common recurring hook for once-per-turn checks."),
			linkToLua("Game.GetGameTurn", "game-getgameturn-80", "methods", "Turn stamp used for cooldown and last-processed markers."),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Typical city scope when the once-per-X effect is attached to the capital."),
			linkToPage("Once-Per-Trigger Guard", "/pattern-library", "Use this alongside saved cooldown keys when the same gameplay event can fire multiple times inside one broader action."),
			linkToPage("Table Saver / Loader for SaveData", "/pattern-library", "Step up to this when one or two flat keys turn into a real structured state bundle."),
		],
	},
	{
		title: "Policy / Branch Attachment",
		focus: "Policy package wiring",
		status: "High-Use Recipe",
		copy: "Attach a new policy to the right branch, wire its prereqs, and add the actual gameplay payload rows that make the policy matter once unlocked.",
		deliverables: [
			"Policy row with branch placement and text keys.",
			"Prereq links and starter effect rows such as coastal yields or free promotions.",
			"A compact pattern for attaching policies without hand-editing multiple policy tables every time.",
		],
		example: {
			title: "Coastal policy attachment",
			summary: "Start with the “Policies” row, wire it to a branch, then add the actual payload tables that the unlock should grant.",
			files: [
				snippetFile(
					"SQL/Policies/TidalDoctrine.sql",
					"sql",
					"INSERT INTO Policies (Type, Description, Civilopedia, Help, PolicyBranchType, GridX, GridY, CultureCost)\nVALUES\n\t('POLICY_CMC_TIDAL_DOCTRINE', 'TXT_KEY_POLICY_CMC_TIDAL_DOCTRINE', 'TXT_KEY_POLICY_CMC_TIDAL_DOCTRINE_PEDIA', 'TXT_KEY_POLICY_CMC_TIDAL_DOCTRINE_HELP', 'POLICY_BRANCH_EXPLORATION', 2, 1, -1);\n\nINSERT INTO Policy_PrereqPolicies (PolicyType, PrereqPolicy)\nVALUES\n\t('POLICY_CMC_TIDAL_DOCTRINE', 'POLICY_NAVIGATION_SCHOOL');\n\nINSERT INTO Policy_CoastalCityYieldChanges (PolicyType, YieldType, Yield)\nVALUES\n\t('POLICY_CMC_TIDAL_DOCTRINE', 'YIELD_GOLD', 2);\n\nINSERT INTO Policy_FreePromotionUnitCombats (PolicyType, PromotionType, UnitCombatType)\nVALUES\n\t('POLICY_CMC_TIDAL_DOCTRINE', 'PROMOTION_DRILL_1', 'UNITCOMBAT_MELEE');",
					"Branch placement, prereq, city yield payload, and optional promotion payload in one file.",
				),
				snippetFile(
					"XML/Text/TidalDoctrineText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_POLICY_CMC_TIDAL_DOCTRINE" Text="Tidal Doctrine" />\n\t\t<Row Tag="TXT_KEY_POLICY_CMC_TIDAL_DOCTRINE_HELP" Text="+2 [ICON_GOLD] Gold in coastal cities and free Drill I for melee recruits." />\n\t\t<Row Tag="TXT_KEY_POLICY_CMC_TIDAL_DOCTRINE_PEDIA" Text="TODO: Add policy history and strategy text." />\n\t</Language_en_US>\n</GameData>',
					"Text rows for the policy name, help text, and Civilopedia entry.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Policies", "Core policy row with branch placement, text keys, and grid position.", "rows"),
			linkToSchema("PolicyBranchTypes", "Validate the branch receiving the new policy.", "rows"),
			linkToSchema("Policy_PrereqPolicies", "Attach prerequisite policy links without editing the branch manually.", "rows"),
			linkToSchema("Policy_CoastalCityYieldChanges", "Starter payload table for coastal-city policy bonuses.", "rows"),
			linkToSchema("Policy_FreePromotionUnitCombats", "Attach a promotion payload to selected unit combats.", "rows"),
			linkToPage(
				"Free Promotion From Building / Policy / Trait",
				"/pattern-library",
				"Best follow-up when the policy payload is not just yields and needs combat-class or promotion-side wiring.",
			),
		],
	},
	{
		title: "Decision / Event Reward",
		focus: "Reward scripting",
		status: "High-Use Recipe",
		copy: "Bundle the common ‘if condition passes, grant X’ workflow: yields, units, hidden buildings, cooldown markers, and a notification so the player knows the reward actually fired.",
		deliverables: [
			"Starter reward hook with a clear trigger and release path.",
			"Payload pattern for gold, a spawned unit, and a hidden-building proxy.",
			"Cooldown persistence plus notification text in one repeatable scaffold.",
		],
		example: {
			title: "Tech reward payload",
			summary: "Use a tech trigger as the condition, then grant a mixed reward payload only once when the state flips on.",
			files: [
				snippetFile(
					"Lua/Gameplay/TechRewardPayload.lua",
					"lua",
					'local Cooldowns = include("Cooldowns")\nlocal iRewardUnit = GameInfoTypes.UNIT_ARCHER\nlocal iRewardBuilding = GameInfoTypes.BUILDING_CMC_DUMMY_GARRISON\nlocal iRewardTech = GameInfoTypes.TECH_WRITING\n\nGameEvents.TeamSetHasTech.Add(function(eTeam, eTech, bValue)\n\tif not bValue or eTech ~= iRewardTech then\n\t\treturn\n\tend\n\n\tfor iPlayer, pPlayer in ipairs(Players) do\n\t\tif pPlayer and pPlayer:IsAlive() and pPlayer:GetTeam() == eTeam then\n\t\t\tlocal pCapital = pPlayer:GetCapitalCity()\n\t\t\tif pCapital and Cooldowns.canProcessCityThisTurn(iPlayer, pCapital:GetID(), \"WritingReward\") then\n\t\t\t\tCooldowns.markCityProcessed(iPlayer, pCapital:GetID(), \"WritingReward\")\n\t\t\t\tpPlayer:ChangeGold(100)\n\t\t\t\tpCapital:SetNumRealBuilding(iRewardBuilding, 1)\n\t\t\t\tpPlayer:InitUnit(iRewardUnit, pCapital:GetX(), pCapital:GetY())\n\t\t\t\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, Locale.ConvertTextKey(\"TXT_KEY_NOTIFICATION_CMC_WRITING_REWARD\"), Locale.ConvertTextKey(\"TXT_KEY_NOTIFICATION_CMC_WRITING_REWARD_SHORT\"), pCapital:GetX(), pCapital:GetY())\n\t\t\tend\n\t\tend\n\tend\nend)',
					"Mixed reward payload showing a real trigger, persistent cooldown, dummy building grant, unit spawn, and player notification.",
				),
				snippetFile(
					"XML/Text/TechRewardPayloadText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_NOTIFICATION_CMC_WRITING_REWARD" Text="Writing unlocked your scripted reward package." />\n\t\t<Row Tag="TXT_KEY_NOTIFICATION_CMC_WRITING_REWARD_SHORT" Text="Scripted Reward" />\n\t</Language_en_US>\n</GameData>',
					"Notification text for the reward payload so the player can see the grant resolve in-game.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.TeamSetHasTech", "game-event-teamsethastech-81", "gameEvents", "Reliable trigger when the reward is tied to a tech unlock."),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Common anchor city when the reward resolves to one city."),
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Surface the resolved reward to the player."),
			linkToSchema("Buildings", "Hidden reward markers usually land through a dummy building row.", "rows"),
			linkToSchema("Units", "Spawned rewards still need valid unit rows and text.", "rows"),
			linkToPage("Cooldown + Notification Combo", "/pattern-library", "Use this when the payload mostly needs a clean persistence-plus-feedback wrapper around the trigger."),
			linkToPage("Unit Spawn Workflow", "/pattern-library", "Natural companion when the reward package includes a spawned unit that needs setup beyond one bare “InitUnit” call."),
			linkToPage(
				"Dummy Building Scaffold",
				"/pattern-library",
				"Use this first when the reward package includes a hidden building proxy and the building row itself still needs to be scaffolded.",
			),
		],
	},
	{
		title: "SQL Merge / Delete Pattern",
		focus: "Compatibility SQL",
		status: "High-Use Recipe",
		copy: "Use safe compatibility SQL patterns when you need to patch base game, DLC, or modded rows without assuming every referenced row exists in every load order.",
		deliverables: [
			"“UPDATE”, “DELETE”, and “INSERT OR REPLACE” starter patterns.",
			"“WHERE EXISTS” guards against missing rows or missing DLC content.",
			"A compact reference for compatibility edits that do not rely on blind row replacement.",
		],
		example: {
			title: "Compatibility patch block",
			summary: "Guard changes with “WHERE EXISTS”, patch existing rows with “UPDATE”, and remove conflicting rows explicitly when needed.",
			files: [
				snippetFile(
					"SQL/Compatibility/BalancePatch.sql",
					"sql",
					"UPDATE Buildings\nSET Cost = Cost + 15\nWHERE Type = 'BUILDING_WATERMILL';\n\nINSERT OR REPLACE INTO Building_YieldChanges (BuildingType, YieldType, Yield)\nSELECT 'BUILDING_WATERMILL', 'YIELD_FOOD', 3\nWHERE EXISTS (SELECT 1 FROM Buildings WHERE Type = 'BUILDING_WATERMILL');\n\nDELETE FROM Unit_FreePromotions\nWHERE UnitType = 'UNIT_ARCHER'\n\tAND PromotionType = 'PROMOTION_DRILL_1'\n\tAND EXISTS (SELECT 1 FROM Units WHERE Type = 'UNIT_ARCHER');\n\nINSERT INTO Civilization_UnitClassOverrides (CivilizationType, UnitClassType, UnitType)\nSELECT 'CIVILIZATION_CMC_ATLAS', 'UNITCLASS_ARCHER', 'UNIT_CMC_ATLAS_LONGBOW'\nWHERE EXISTS (SELECT 1 FROM Civilizations WHERE Type = 'CIVILIZATION_CMC_ATLAS')\n\tAND EXISTS (SELECT 1 FROM Units WHERE Type = 'UNIT_CMC_ATLAS_LONGBOW');",
					"Compact compatibility pattern showing guarded updates, deletes, and merge-style inserts.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Buildings", "Common first patch target for compatibility adjustments.", "rows"),
			linkToSchema("Building_YieldChanges", "Typical merge table when patching building effects.", "rows"),
			linkToSchema("Unit_FreePromotions", "Common delete target when compatibility requires removing inherited bonuses.", "rows"),
			linkToSchema("Civilization_UnitClassOverrides", "Guard civ override inserts so they only run when both the civ and replacement row exist.", "rows"),
		],
	},
	{
		title: "Unit Spawn Helper",
		focus: "Spawn + setup",
		status: "High-Use Recipe",
		copy: "Resolve the destination city or plot, spawn a unit, apply the starter setup, and notify the player. This pattern gets rewritten constantly in event rewards, decisions, scenarios, and unique mechanics.",
		deliverables: [
			"Spawn pattern anchored to a city or known plot.",
			"Optional setup steps for damage, experience, promotions, and naming.",
			"Notification stub so the spawned unit is visible to the player immediately.",
		],
		example: {
			title: "Spawn helper variants",
			summary: "Use the capital-anchor version when the destination is fixed, then switch to a chosen-plot version when the mechanic resolves a safer target tile first.",
			files: [
				snippetFile(
					"Lua/Gameplay/SpawnRewardUnit.lua",
					"lua",
					'local iUnitType = GameInfoTypes.UNIT_ARCHER\nlocal iPromotion = GameInfoTypes.PROMOTION_DRILL_1\nlocal iPlayer = Game.GetActivePlayer()\nlocal pPlayer = Players[iPlayer]\nlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\nif pPlayer and pCapital then\n\tlocal pUnit = pPlayer:InitUnit(iUnitType, pCapital:GetX(), pCapital:GetY())\n\tif pUnit then\n\t\tpUnit:SetExperience(15)\n\t\tpUnit:SetDamage(10)\n\t\tpUnit:SetHasPromotion(iPromotion, true)\n\t\tpUnit:SetName(\"Atlas Vanguard\")\n\t\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, \"A reward unit has been deployed in your capital.\", \"Reinforcements Arrived\", pCapital:GetX(), pCapital:GetY())\n\tend\nend',
					"One-pass spawn helper covering position, experience, promotion, name, and player-facing feedback.",
				),
				snippetFile(
					"Lua/Gameplay/SpawnRewardUnitOnPlot.lua",
					"lua",
					'local iUnitType = GameInfoTypes.UNIT_ARCHER\n\nlocal function spawnOnResolvedPlot(pPlayer, pPlot)\n\tif not pPlayer or not pPlot then\n\t\treturn nil\n\tend\n\tlocal pUnit = pPlayer:InitUnit(iUnitType, pPlot:GetX(), pPlot:GetY())\n\tif pUnit then\n\t\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, \"A reward unit arrived on the chosen plot.\", \"Reinforcements Arrived\", pPlot:GetX(), pPlot:GetY())\n\tend\n\treturn pUnit\nend',
					"Chosen-plot variant. Use this when some earlier helper already found the legal destination and the spawn helper should only handle creation plus feedback.",
				),
			],
		},
		touchpoints: [
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Stable city anchor for spawn helpers and reward units."),
			linkToLua("Player:InitUnit", "player-initunit-614", "methods", "Core spawn method behind both the city-anchor and chosen-plot variants."),
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Notify the player once the unit is actually spawned."),
			linkToSchema("Units", "Validate the spawned unit row and text keys.", "rows"),
			linkToSchema("UnitPromotions", "Promotion rows the helper may seed onto the spawned unit.", "rows"),
			linkToPage("Plot Search Pattern", "/pattern-library", "Useful companion when the spawn helper should consume a resolved legal plot instead of assuming the city tile is always safe."),
			{
				label: "Unit Created Post-Spawn Setup",
				href: "/pattern-library",
				note: "Natural follow-up when every spawned unit needs the same normalization pass for promotions, naming, or tracked state.",
			},
		],
	},
	{
		title: "Building Grant / Remove Lua Helper",
		focus: "City building state",
		status: "High-Use Recipe",
		copy: "Loop cities, decide whether a building proxy should be present, then add or remove it cleanly. This is the usual glue for capital-only, coastal, puppet, religion, and dummy-building mechanics.",
		deliverables: [
			"City loop pattern for syncing hidden or visible buildings.",
			"Clear condition block for grants versus removals.",
			"A city-state sync scaffold that avoids leaving stale building proxys behind.",
		],
		example: {
			title: "Grant or remove variants",
			summary: "Use the same city-sync shape whether the proxy comes from a positive condition like coastal access or a negative cleanup condition like occupation or puppet state.",
			files: [
				snippetFile(
					"Lua/Gameplay/SyncCoastalDummy.lua",
					"lua",
					"local iDummy = GameInfoTypes.BUILDING_CMC_DUMMY_GARRISON\n\nlocal function syncCity(pCity)\n\tif not pCity then\n\t\treturn\n\tend\n\tlocal shouldHave = pCity:IsCoastal(10) and not pCity:IsPuppet()\n\tpCity:SetNumRealBuilding(iDummy, shouldHave and 1 or 0)\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() then\n\t\treturn\n\tend\n\tfor pCity in pPlayer:Cities() do\n\t\tsyncCity(pCity)\n\tend\nend)",
					"Reusable city-loop helper for keeping building proxys in sync with changing city state.",
				),
				snippetFile(
					"Lua/Gameplay/ClearOccupiedDummy.lua",
					"lua",
					"local iDummy = GameInfoTypes.BUILDING_CMC_OCCUPATION_PROXY\n\nlocal function syncOccupiedState(pCity)\n\tif not pCity then\n\t\treturn\n\tend\n\tlocal shouldHave = pCity:IsOccupied() and not pCity:IsPuppet()\n\tpCity:SetNumRealBuilding(iDummy, shouldHave and 1 or 0)\nend",
					"Cleanup-oriented variant. Use this when the helper's real job is removing stale city proxies once occupation or ownership state changes.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Simple recurring sync hook when city state may change from turn to turn."),
			linkToLua("City:GetNumBuilding", "city-getnumbuilding-178", "methods", "Useful for validation checks before and after the sync runs."),
			linkToLua("City:SetNumRealBuilding", "city-setnumrealbuilding-355", "methods", "Direct write helper used by both the grant and cleanup variants."),
			linkToSchema("Buildings", "The granted or removed row still needs a valid building definition.", "rows"),
			linkToSchema("BuildingClasses", "Hidden proxies should still be classed correctly when they depend on class-sensitive effects.", "rows"),
			linkToPage("City Capture Follow-Up", "/pattern-library", "Useful companion when the remove-side example is really part of a broader conquest cleanup flow."),
		],
	},
	{
		title: "Requirements Gate Pattern",
		focus: "Eligibility checks",
		status: "High-Use Recipe",
		copy: "Package the common gate logic modders keep reusing: only in the capital, only in coastal cities, only after a tech, only during a special state, or only when another system already exists.",
		deliverables: [
			"A compact gate callback with early returns.",
			"City and team-level condition checks that can be swapped in and out.",
			"Touchpoints for the tables or hooks behind common capital, coastal, and tech gates.",
		],
		example: {
			title: "Gate variants by state type",
			summary: "Keep the shape the same, but swap the actual yes or no checks depending on whether the gate is city-state, religion-state, or player-state driven.",
			files: [
				snippetFile(
					"Lua/Gameplay/ConstructRequirements.lua",
					"lua",
					"local iTargetBuilding = GameInfoTypes.BUILDING_CMC_HARBOR_OFFICE\nlocal iRequiredTech = GameInfoTypes.TECH_COMPASS\n\nGameEvents.PlayerCanConstruct.Add(function(iPlayer, eBuilding)\n\tif eBuilding ~= iTargetBuilding then\n\t\treturn true\n\tend\n\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tlocal pTeam = pPlayer and Teams[pPlayer:GetTeam()]\n\tif not pCapital or not pCapital:IsCoastal(10) then\n\t\treturn false\n\tend\n\tif not pTeam or not pTeam:IsHasTech(iRequiredTech) then\n\t\treturn false\n\tend\n\treturn true\nend)",
					"Starter gate callback for a building that should only unlock once the capital is coastal and the team owns the required tech.",
				),
				snippetFile(
					"Lua/Gameplay/ReligionRequirements.lua",
					"lua",
					`local iTargetBuilding = GameInfoTypes.BUILDING_CMC_CONVERSION_SHRINE

GameEvents.CityCanConstruct.Add(function(iPlayer, iCity, eBuilding)
	if eBuilding ~= iTargetBuilding then
		return true
	end

	local pPlayer = Players[iPlayer]
	local pCity = pPlayer and pPlayer:GetCityByID(iCity)
	local eReligion = pCity and pCity:GetReligiousMajority()
	return eReligion and eReligion >= 0
end)`,
					"Religion-state variant. The shape is the same, but the gate now depends on whether the city already has a majority religion.",
				),
				snippetFile(
					"Lua/Gameplay/GoldenAgeRequirements.lua",
					"lua",
					`local iTargetUnit = GameInfoTypes.UNIT_CMC_FESTIVAL_GUARD

GameEvents.PlayerCanTrain.Add(function(iPlayer, eUnit)
	if eUnit ~= iTargetUnit then
		return true
	end

	local pPlayer = Players[iPlayer]
	return pPlayer and pPlayer:GetGoldenAgeTurns() > 0
end)`,
					"Player-state variant. Use the same early return gate shape when the requirement belongs to the player rather than a city or team.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerCanConstruct", "game-event-playercanconstruct-62", "gameEvents", "Empire-level building gate hook for custom construction rules."),
			linkToLua(
				"GameEvents.CityCanConstruct",
				"game-event-citycanconstruct-22",
				"gameEvents",
				"City-level gate surface used when the requirement depends on local city state like majority religion.",
			),
			linkToLua("GameEvents.PlayerCanTrain", "game-event-playercantrain-70", "gameEvents", "Useful when the gate variant applies to units instead of buildings."),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Common way to anchor a capital-only gate."),
			linkToLua("Team:IsHasTech", "team-ishastech-110", "methods", "Team-level tech gate for unlock checks."),
			linkToSchema("Buildings", "Validate the gated building row and its prerequisite keys.", "rows"),
			linkToSchema("Technologies", "Use the tech row behind the gate for display text and downstream unlock relationships.", "rows"),
			linkToPage(
				"Holy City / Largest City Reward Resolver",
				"/pattern-library",
				"Good companion when the gate starts by resolving a specific city target instead of only checking the active player.",
			),
			linkToPage("Religion / Belief Condition Check", "/pattern-library", "Add this when the gate grows beyond capital, coastal, and tech checks into religion requirements."),
		],
	},
	{
		title: "Audio Hook Setup",
		focus: "Sound pipeline",
		status: "High-Use Recipe",
		copy: "Register sound rows, wire the audio file into the project actions, and keep the modinfo import expectations clear so custom sound effects or music cues actually load.",
		deliverables: [
			"Starter audio database rows for sound IDs and 2D script hooks.",
			"A mod action split for database updates plus imported audio files.",
			"Touchpoints for the main Civ V audio tables involved in custom sound setup.",
		],
		example: {
			title: "Custom audio scaffold",
			summary: "Add the database rows first, then make sure the actual audio asset is imported and available to the game.",
			files: [
				snippetFile(
					"SQL/Audio/EventSting.sql",
					"sql",
					"INSERT INTO Audio_Sounds (SoundID, Filename, LoadType)\nVALUES\n\t('SND_CMC_EVENT_STING', 'CMC_Event_Sting', 'DynamicResident');\n\nINSERT INTO Audio_2DSounds (ScriptID, SoundID, SoundType, MinVolume, MaxVolume, IsMusic)\nVALUES\n\t('AS2D_CMC_EVENT_STING', 'SND_CMC_EVENT_STING', 'GAME_SFX', 45, 45, 0);",
					"Minimal audio rows for a custom scripted sound and its 2D script hook.",
				),
				snippetFile(
					".modinfo",
					"xml",
					'<Mod id="11111111-1111-1111-1111-111111111111" version="1">\n\t<Files>\n\t\t<File import="1">Audio/CMC_Event_Sting.ogg</File>\n\t\t<File import="0">SQL/Audio/EventSting.sql</File>\n\t</Files>\n\t<Actions>\n\t\t<OnModActivated>\n\t\t\t<UpdateDatabase>SQL/Audio/EventSting.sql</UpdateDatabase>\n\t\t</OnModActivated>\n\t\t<OnModActivated>\n\t\t\t<ImportFiles>Audio/CMC_Event_Sting.ogg</ImportFiles>\n\t\t\t<PlayAudio>Audio/CMC_Event_Sting.ogg</PlayAudio>\n\t\t</OnModActivated>\n\t</Actions>\n</Mod>',
					"Direct “.modinfo” version of the audio wiring: the SQL is updated once, and the sound file is imported from the same manifest instead of relying on a separate editor view.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Audio_Sounds", "Core sound row where the filename and load type are registered.", "rows"),
			linkToSchema("Audio_2DSounds", "2D script table that maps the sound row to a script ID the game can call.", "rows"),
			linkToSchema("Audio_ScriptTypes", "Useful when matching your custom sound to an existing script-type convention.", "rows"),
			{ label: ".modinfo Builder", href: "/modinfo-builder", note: "Use the builder when the audio file also needs matching import and action wiring." },
			{
				label: "Art + Audio Setup",
				href: "/template-generators?generator=art-audio-bundle",
				note: "Use the generator when the audio work is part of a civ identity pass with colors, atlases, and leader music rather than a one-off scripted sound.",
			},
			{
				label: "Leader / Civ Music Setup",
				href: "/pattern-library",
				note: "Read the music specific companion when your mod needs leader peace and war themes instead of a one-off sound effect.",
			},
		],
	},
	{
		title: "Leader / Civ Music Setup",
		focus: "Music pipeline",
		status: "High-Use Recipe",
		copy: "Add leader peace and war themes with the hardcoded “ScriptID” naming Civ V expects, then set a “SoundtrackTag” so the civ falls back to an appropriate generic music pool after those intro tracks finish.",
		deliverables: [
			"SQL rows for leader peace and war music in “Audio_Sounds” and “Audio_2DSounds”.",
			"A “SoundtrackTag” update so the civilization keeps using a matching background music family after the leader tracks end.",
			"A “.modinfo” reminder for importing both music files and marking them for VFS through either direct manifest edits or the “.modinfo Builder”.",
		],
		example: {
			title: "Leader music + soundtrack fallback",
			summary: "Register the peace and war files first, match the “ScriptID” to the leader name, then point the civ at an existing soundtrack family for its longer form in-game music.",
			files: [
				snippetFile(
					"SQL/Audio/NavarchMusic.sql",
					"sql",
					"INSERT INTO Audio_Sounds (SoundID, Filename, LoadType)\nVALUES\n\t('SND_LEADER_MUSIC_CMC_NAVARCH_PEACE', 'NavarchPeace', 'DynamicResident'),\n\t('SND_LEADER_MUSIC_CMC_NAVARCH_WAR', 'NavarchWar', 'DynamicResident');\n\nINSERT INTO Audio_2DSounds (ScriptID, SoundID, SoundType, MinVolume, MaxVolume, IsMusic)\nVALUES\n\t('AS2D_LEADER_MUSIC_CMC_NAVARCH_PEACE', 'SND_LEADER_MUSIC_CMC_NAVARCH_PEACE', 'GAME_MUSIC', 120, 120, 1),\n\t('AS2D_LEADER_MUSIC_CMC_NAVARCH_WAR', 'SND_LEADER_MUSIC_CMC_NAVARCH_WAR', 'GAME_MUSIC', 80, 80, 1);\n\nUPDATE Civilizations\nSET SoundtrackTag = 'England'\nWHERE Type = 'CIVILIZATION_CMC_ATLAS';",
					"Use the exact leader-type tail in the “ScriptID”: if the leader is “LEADER_CMC_NAVARCH”, the music hooks must be “AS2D_LEADER_MUSIC_CMC_NAVARCH_PEACE” and “_WAR” or the game will not connect them.",
				),
				snippetFile(
					".modinfo",
					"xml",
					'<Mod id="22222222-2222-2222-2222-222222222222" version="1">\n\t<Files>\n\t\t<File import="1">Audio/NavarchPeace.mp3</File>\n\t\t<File import="1">Audio/NavarchWar.mp3</File>\n\t\t<File import="0">SQL/Audio/NavarchMusic.sql</File>\n\t</Files>\n\t<Actions>\n\t\t<OnModActivated>\n\t\t\t<UpdateDatabase>SQL/Audio/NavarchMusic.sql</UpdateDatabase>\n\t\t</OnModActivated>\n\t</Actions>\n</Mod>',
					"Keep the manifest simple: import the music files through the “.modinfo” file, then let the SQL handle the peace and war “ScriptID” rows. The “Filename” values in SQL should still match the file names without path or extension.",
				),
				snippetFile(
					"Docs/MusicImportChecklist.txt",
					"text",
					"1. Add “Audio/NavarchPeace.mp3” and “Audio/NavarchWar.mp3” to your mod.\n2. In the “.modinfo” file, or in the “.modinfo Builder”, mark both files for import / VFS.\n3. Make sure the SQL “Filename” values match the file names without “.mp3” or “.ogg”.\n4. Rebuild, start a game with the civ, and test both peace and war states.",
					"Small checklist for the pieces that usually fail first: manifest import flags, filename matching, and war/peace testing.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Audio_Sounds", "Register the actual peace and war file names here before the game can play them.", "rows"),
			linkToSchema("Audio_2DSounds", "This is where the leader-specific “ScriptID” names are matched to the custom sound rows.", "rows"),
			linkToSchema("Civilizations", "Use “SoundtrackTag” when you want the civ to borrow an existing soundtrack family after the leader music ends.", "rows"),
			{ label: ".modinfo Builder", href: "/modinfo-builder", note: "Use the builder to keep the music file imports and manifest wiring aligned with the SQL setup." },
			{
				label: "Art + Audio Setup",
				href: "/template-generators?generator=art-audio-bundle",
				note: "Use the generator when you want the leader music rows emitted alongside civ colors, atlas registration, and the rest of the ArtDefines identity bundle.",
			},
			{
				label: "Audio Hook Setup",
				href: "/pattern-library",
				note: "Read the broader audio recipe first if the issue is still at the sound-row and import-action level rather than the leader-music naming rules.",
			},
		],
	},
	{
		title: "Per-Turn City Scanner",
		focus: "Recurring city loops",
		status: "Lua Pattern",
		copy: "Loop cities once per turn, bail early for dead or invalid players, and keep the city filters explicit so capital-only, coastal, occupied, or puppet logic stays readable.",
		deliverables: [
			"Safe “PlayerDoTurn” scaffold with alive and city checks.",
			"City filter block for capital, coastal, occupied, and puppet states.",
			"A clean place to apply yields, dummy buildings, or notifications once per turn.",
		],
		example: {
			title: "Turn-based city scan",
			summary: "Start with a safe player loop, then stack the city-state filters before applying the effect.",
			files: [
				snippetFile(
					"Lua/Gameplay/PerTurnCityScanner.lua",
					"lua",
					'GameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() or pPlayer:IsMinorCiv() or pPlayer:IsBarbarian() then\n\t\treturn\n\tend\n\n\tfor pCity in pPlayer:Cities() do\n\t\tlocal isCapital = pCity:IsCapital()\n\t\tlocal isCoastal = pCity:IsCoastal(10)\n\t\tlocal isOccupied = pCity:IsOccupied()\n\t\tlocal isPuppet = pCity:IsPuppet()\n\t\tif isCapital and isCoastal and not isOccupied and not isPuppet then\n\t\t\tprint("[CMC] Coastal capital passed turn scan", iPlayer, pCity:GetName())\n\t\tend\n\tend\nend)',
					"Baseline turn scanner with the most common city-state filters already named and separated.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Most common recurring hook for city-by-city maintenance logic."),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Often paired with scanners when one city needs special treatment."),
			linkToSchema("Buildings", "Per-turn scans often end by granting or syncing a building-side effect.", "rows"),
		],
	},
	{
		title: "Once-Per-Trigger Guard",
		focus: "Scoped persistence",
		status: "Lua Pattern",
		copy: "Wrap repetitive SaveData usage into small helpers so a trigger can fire once ever, once per era, once per player-turn, or once per city without rewriting key logic every time.",
		deliverables: [
			"Namespaced key helpers for player, city, and global scopes.",
			"Single-purpose guard functions that return early before the expensive gameplay work runs.",
			"Starter examples for once-ever and once-per-turn checks.",
		],
		example: {
			title: "Trigger guard variants",
			summary: "Centralize the key building once, then expose different scopes like once ever, once per player-turn, or once per city so callers do not keep rebuilding them.",
			files: [
				snippetFile(
					"Lua/Shared/TriggerGuards.lua",
					"lua",
					'local ModData = Modding.OpenSaveData()\nlocal PREFIX = "CMC_TRIGGER_"\n\nlocal function playerKey(iPlayer, suffix)\n\treturn string.format("%sP%d_%s", PREFIX, iPlayer, suffix)\nend\n\nlocal function onceEver(iPlayer, suffix)\n\tlocal key = playerKey(iPlayer, suffix)\n\tif ModData.GetValue(key) then\n\t\treturn false\n\tend\n\tModData.SetValue(key, 1)\n\treturn true\nend\n\nlocal function oncePerPlayerTurn(iPlayer, suffix)\n\tlocal key = playerKey(iPlayer, suffix)\n\tlocal turn = Game.GetGameTurn()\n\tif ModData.GetValue(key) == turn then\n\t\treturn false\n\tend\n\tModData.SetValue(key, turn)\n\treturn true\nend\n\nreturn {\n\tonceEver = onceEver,\n\toncePerPlayerTurn = oncePerPlayerTurn,\n}',
					"Small include file for the two most common trigger scopes: once ever and once per player-turn.",
				),
				snippetFile(
					"Lua/Shared/CityTriggerGuards.lua",
					"lua",
					'local ModData = Modding.OpenSaveData()\nlocal PREFIX = "CMC_TRIGGER_"\n\nlocal function cityKey(iPlayer, iCity, suffix)\n\treturn string.format("%sP%d_C%d_%s", PREFIX, iPlayer, iCity, suffix)\nend\n\nlocal function oncePerCity(iPlayer, iCity, suffix)\n\tlocal key = cityKey(iPlayer, iCity, suffix)\n\tif ModData.GetValue(key) then\n\t\treturn false\n\tend\n\tModData.SetValue(key, 1)\n\treturn true\nend\n\nreturn {\n\toncePerCity = oncePerCity,\n}',
					"Per-city variant. Use this when the mechanic should fire once for each city instead of once globally or once per turn.",
				),
			],
		},
		touchpoints: [
			linkToLua("Game.GetGameTurn", "game-getgameturn-80", "methods", "Turn stamp for per-turn and per-era trigger guards."),
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Typical consumer of a once-per-player-turn wrapper."),
			linkToPage("City Tracking Table", "/pattern-library", "Natural companion when the guard scope is per-city and the rest of the mechanic already tracks city-local runtime state."),
		],
	},
	{
		title: "Holy City / Largest City Reward Resolver",
		focus: "Reward destination selection",
		status: "Lua Pattern",
		copy: "Resolve the reward destination first, then hand that city to the effect logic. This keeps holy-city, largest-city, and fallback selection in one helper instead of scattering city-picking rules across multiple scripts.",
		deliverables: [
			"Helper that chooses between a holy city, the largest eligible city, or a final fallback city.",
			"Single return path for reward code, notifications, or building grants.",
			"Starter touchpoints for religion-aware targeting and reward-safe fallback selection.",
		],
		example: {
			title: "Resolver variants by fallback style",
			summary:
				"Keep the reward code separate and swap only the city-picking helper depending on whether the mechanic wants a religion anchor, the biggest stable city, or a capital or coastal fallback.",
			files: [
				snippetFile(
					"Lua/Gameplay/ResolveTargetCity.lua",
					"lua",
					"local function isReligionAnchorCity(pPlayer, pCity)\n\tlocal eReligion = pPlayer and pPlayer:GetReligionCreatedByPlayer()\n\treturn pCity and eReligion and eReligion >= 0 and pCity:IsHolyCityForReligion(eReligion)\nend\n\nlocal function resolveTargetCity(pPlayer)\n\tif not pPlayer then\n\t\treturn nil\n\tend\n\n\tfor pCity in pPlayer:Cities() do\n\t\tif isReligionAnchorCity(pPlayer, pCity) then\n\t\t\treturn pCity\n\t\tend\n\tend\n\n\tlocal pLargestCity = nil\n\tfor pCity in pPlayer:Cities() do\n\t\tif not pCity:IsOccupied() and (not pLargestCity or pCity:GetPopulation() > pLargestCity:GetPopulation()) then\n\t\t\tpLargestCity = pCity\n\t\tend\n\tend\n\tif pLargestCity then\n\t\treturn pLargestCity\n\tend\n\n\tfor pCity in pPlayer:Cities() do\n\t\treturn pCity\n\tend\n\treturn nil\nend\n\nreturn resolveTargetCity",
					"Single resolver that prefers a religion anchor, then the largest stable city, then the first valid fallback city.",
				),
				snippetFile(
					"Lua/Gameplay/ResolveLargestStableCity.lua",
					"lua",
					`local function resolveLargestStableCity(pPlayer)
	if not pPlayer then
		return nil
	end

	local pLargestCity = nil
	for pCity in pPlayer:Cities() do
		if not pCity:IsOccupied() and (not pLargestCity or pCity:GetPopulation() > pLargestCity:GetPopulation()) then
			pLargestCity = pCity
		end
	end
	return pLargestCity
end

return resolveLargestStableCity`,
					"Population first variant. Use this when the mechanic has nothing to do with religion and just wants the empire's biggest stable city.",
				),
				snippetFile(
					"Lua/Gameplay/ResolveCapitalOrCoastalCity.lua",
					"lua",
					`local function resolveCapitalOrCoastalCity(pPlayer)
	if not pPlayer then
		return nil
	end

	local pCapital = pPlayer:GetCapitalCity()
	if pCapital and not pCapital:IsOccupied() then
		return pCapital
	end

	for pCity in pPlayer:Cities() do
		if pCity:IsCoastal(10) and not pCity:IsOccupied() then
			return pCity
		end
	end

	for pCity in pPlayer:Cities() do
		return pCity
	end
	return nil
end

return resolveCapitalOrCoastalCity`,
					"Capital-or-coastal fallback. This is better when the effect should feel geographic or capital-centered instead of religion-centered.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Religions", "Religion-aware destination logic often starts from the founded religion or holy-city relationship.", "rows"),
			linkToSchema("Civilization_Religions", "Useful when the reward destination should line up with the civilization’s religion setup.", "rows"),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Useful for the capital-or-coastal fallback variant when the resolver starts with the capital check."),
			linkToPage(
				"Religion / Belief Condition Check",
				"/pattern-library",
				"Good companion when the first-choice destination depends on belief or religion state before the fallback city is chosen.",
			),
		],
	},
	{
		title: "Trade Route Conditional Reward Router",
		focus: "Route state as a trigger",
		status: "Lua Pattern",
		copy: "Use this when a trade route or city connection should unlock a reward only if extra conditions also hold. Common cases are internal sea connections, routes that carry religious pressure, or routes to specific foreign civs. Resolve the route or connection first, then route the effect into one small reward helper.",
		deliverables: [
			"A per-turn route scan that filters active trade routes instead of assuming the route still exists.",
			"A clean branch for internal versus international route logic and religion or diplomacy side conditions.",
			"A reusable reward helper for gold, faith, notifications, or city follow-up effects once the route qualifies.",
		],
		example: {
			title: "Reward internal sea routes that carry your religion",
			summary: "This example scans the active trade routes, checks for internal sea routes, then grants Faith if the destination city is adding pressure for the religion founded by the player.",
			files: [
				snippetFile(
					"Lua/Gameplay/TradeRouteConditionalReward.lua",
					"lua",
					'local TriggerGuards = include("TriggerGuards")\n\nlocal function rewardQualifiedRoute(pPlayer, pOriginCity, pDestCity)\n\tif not pPlayer or not pOriginCity or not pDestCity then\n\t\treturn\n\tend\n\tpPlayer:ChangeFaith(4)\n\tpPlayer:AddNotification(\n\t\tNotificationTypes.NOTIFICATION_GENERIC,\n\t\tstring.format("%s sent a qualified sea route to %s.", pOriginCity:GetName(), pDestCity:GetName()),\n\t\t"Trade Route Reward",\n\t\tpDestCity:GetX(),\n\t\tpDestCity:GetY()\n\t)\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal eReligion = pPlayer and pPlayer:GetReligionCreatedByPlayer()\n\tif not pPlayer or eReligion == -1 or not TriggerGuards.oncePerPlayerTurn(iPlayer, "TradeRouteFaith") then\n\t\treturn\n\tend\n\n\tfor _, route in ipairs(pPlayer:GetTradeRoutes()) do\n\t\tif route.FromID == iPlayer and route.ToID == iPlayer and route.Domain == DomainTypes.DOMAIN_SEA then\n\t\t\tlocal pOriginCity = pPlayer:GetCityByID(route.FromCity)\n\t\t\tlocal pDestCity = pPlayer:GetCityByID(route.ToCity)\n\t\t\tif pDestCity and pDestCity:GetNumTradeRoutesAddingPressure(eReligion) > 0 then\n\t\t\t\trewardQualifiedRoute(pPlayer, pOriginCity, pDestCity)\n\t\t\tend\n\t\tend\n\tend\nend)',
					"Route state recipe that turns an active route plus a religion-side condition into one reward handoff instead of scattering the checks across multiple files.",
				),
			],
		},
		touchpoints: [
			linkToLua("Player:GetTradeRoutes", "player-gettraderoutes-547", "methods", "Primary runtime surface for iterating the player's active trade routes."),
			linkToLua(
				"City:GetNumTradeRoutesAddingPressure",
				"city-getnumtraderoutesaddingpressure-194",
				"methods",
				"Useful when the route reward depends on religion pressure actually being added to the destination city.",
			),
			linkToLua(
				"Player:IsCapitalConnectedToCity",
				"player-iscapitalconnectedtocity-636",
				"methods",
				"Helpful companion when the mechanic really wants city-connection state instead of explicit caravan or cargo route records.",
			),
			linkToPage("Religion / Belief Condition Check", "/pattern-library", "Read this next when the route bonus depends on belief ownership or more detailed religion filters."),
		],
	},
	{
		title: "Great Work / Slot State Resolver",
		focus: "Great Work aware city logic",
		status: "Lua Pattern",
		copy: "Use this when a city bonus depends on whether a Great Work slot is filled, which building holds the work, or whether a theming bonus is active. Resolve the slot state in one helper and hand that result to the reward logic instead of scattering building-class checks throughout the mechanic.",
		deliverables: [
			"A helper that checks whether a target building class is holding Great Works and how many slots are filled.",
			"A branch for theming-bonus logic versus simple filled slot logic.",
			"A city reward or sync example that reacts only when the Great Work state is valid.",
		],
		example: {
			title: "Reward filled Great Work slots in a target building",
			summary: "This example checks whether the city's Writer's Guild is holding a Great Work and grants a small Culture reward only while the slot is filled.",
			files: [
				snippetFile(
					"Lua/Gameplay/GreatWorkSlotResolver.lua",
					"lua",
					"local iWritersGuildClass = GameInfoTypes.BUILDINGCLASS_WRITERS_GUILD\n\nlocal function resolveGreatWorkState(pCity, iBuildingClass)\n\tif not pCity then\n\t\treturn nil\n\tend\n\treturn {\n\t\tfilled = pCity:GetNumGreatWorksInBuilding(iBuildingClass),\n\t\thasAny = pCity:IsHoldingGreatWork(iBuildingClass),\n\t\ttheming = pCity:GetThemingBonus(iBuildingClass),\n\t}\nend\n\nlocal function rewardFilledGuild(pPlayer, pCity)\n\tlocal state = resolveGreatWorkState(pCity, iWritersGuildClass)\n\tif not state or not state.hasAny then\n\t\treturn\n\tend\n\tpPlayer:ChangeJONSCulture(2 + math.max(0, state.theming))\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() then\n\t\treturn\n\tend\n\tfor pCity in pPlayer:Cities() do\n\t\trewardFilledGuild(pPlayer, pCity)\n\tend\nend)",
					"Slot state resolver for mechanics that care about a specific Great Work building, filled-slot count, or theming bonus before they pay out.",
				),
			],
		},
		touchpoints: [
			linkToLua("City:GetNumGreatWorksInBuilding", "city-getnumgreatworksinbuilding-186", "methods", "Use this to count filled slots in one target building class."),
			linkToLua("City:IsHoldingGreatWork", "city-isholdinggreatwork-300", "methods", "Fast yes or no check when the mechanic only cares whether a building is currently holding any Great Work."),
			linkToLua("City:GetThemingBonus", "city-getthemingbonus-253", "methods", "Needed when the reward scales from the active theming bonus instead of only the filled-slot count."),
			linkToSchema("Buildings", "Keep the building-class lookup aligned with the building that owns the slot or theming mechanic.", "rows"),
		],
	},
	{
		title: "Worked vs Unworked Resource / Plot Scanner",
		focus: "City plot state differences",
		status: "Lua Pattern",
		copy: "Use this when a mechanic cares whether a resource or improvement is merely present in the city's workable ring, actually being worked by a citizen, or deliberately left idle. This is common for uniques that pay one reward when the plot is unworked and a different reward when the same plot is worked.",
		deliverables: [
			"A city-plot loop that resolves workable plots safely from the city index rather than map-wide scans.",
			"A clean split between worked and unworked counts for the same resource or improvement target.",
			"A city reward example that changes output depending on how those plots are being used right now.",
		],
		example: {
			title: "Count worked and unworked edible resources",
			summary: "This example counts Sheep, Cattle, and Deer in the city's ring, then pays one reward for worked plots and another for unworked plots.",
			files: [
				snippetFile(
					"Lua/Gameplay/WorkedUnworkedResourceScan.lua",
					"lua",
					"local TRACKED_RESOURCES = {\n\t[GameInfoTypes.RESOURCE_SHEEP] = true,\n\t[GameInfoTypes.RESOURCE_CATTLE] = true,\n\t[GameInfoTypes.RESOURCE_DEER] = true,\n}\n\nlocal function scanTrackedPlots(pCity)\n\tlocal worked = 0\n\tlocal unworked = 0\n\tfor i = 0, pCity:GetNumCityPlots() - 1 do\n\t\tlocal pPlot = pCity:GetCityIndexPlot(i)\n\t\tif pPlot and pCity:CanWork(pPlot) then\n\t\t\tlocal eResource = pPlot:GetResourceType(pCity:GetTeam())\n\t\t\tif TRACKED_RESOURCES[eResource] then\n\t\t\t\tif pCity:IsWorkingPlot(pPlot) then\n\t\t\t\t\tworked = worked + 1\n\t\t\t\telse\n\t\t\t\t\tunworked = unworked + 1\n\t\t\t\tend\n\t\t\tend\n\t\tend\n\tend\n\treturn worked, unworked\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() then\n\t\treturn\n\tend\n\tfor pCity in pPlayer:Cities() do\n\t\tlocal worked, unworked = scanTrackedPlots(pCity)\n\t\tif worked > 0 then\n\t\t\tpPlayer:ChangeJONSCulture(worked)\n\t\tend\n\t\tif unworked > 0 then\n\t\t\tpPlayer:ChangeGold(unworked * 2)\n\t\tend\n\tend\nend)",
					"City ring scanner for mechanics that pay one reward when a tracked plot is worked and a different reward when it is only present in range.",
				),
			],
		},
		touchpoints: [
			linkToLua("City:GetCityIndexPlot", "city-getcityindexplot-106", "methods", "Primary way to iterate a city's workable ring without a wider map scan."),
			linkToLua("City:IsWorkingPlot", "city-isworkingplot-330", "methods", "Core distinction when the reward changes based on whether a citizen is actually assigned to that plot."),
			linkToLua("City:CanWork", "city-canwork-26", "methods", "Useful early gate before counting a plot toward the mechanic."),
			linkToSchema("Resources", "Reference the concrete resource rows behind the tracked plot types.", "rows"),
		],
	},
	{
		title: "Nearby Improvement Threshold / Cluster Bonus",
		focus: "Nearby count unlocks",
		status: "Lua Pattern",
		copy: "Use this when a city or unit should gain something only after enough matching improvements or resources exist nearby. The pattern is to count qualifying plots in a radius, compare against a threshold, then hand the result into one reward or sync helper.",
		deliverables: [
			"A city centered scan that counts matching plots within a chosen radius.",
			"A threshold gate that switches a reward on only after the count is high enough.",
			"A reusable sync example for granting a city bonus when the nearby cluster is present and removing it when the cluster falls apart.",
		],
		example: {
			title: "Grant a city bonus for three nearby unique improvements",
			summary: "This example counts qualifying unique improvements within three tiles of the city and turns on a hidden bonus only when the threshold reaches three or more.",
			files: [
				snippetFile(
					"Lua/Gameplay/NearbyImprovementThreshold.lua",
					"lua",
					"local iImprovement = GameInfoTypes.IMPROVEMENT_CMC_ABBAIGH\nlocal iDummy = GameInfoTypes.BUILDING_CMC_ABBAIGH_CLUSTER_DUMMY\nlocal iRadius = 3\nlocal iThreshold = 3\n\nlocal function countNearbyImprovements(pCity)\n\tif not pCity then\n\t\treturn 0\n\tend\n\tlocal iCount = 0\n\tfor i = 0, pCity:GetNumCityPlots() - 1 do\n\t\tlocal pPlot = pCity:GetCityIndexPlot(i)\n\t\tif pPlot and pPlot:GetOwner() == pCity:GetOwner() and Map.PlotDistance(pCity:GetX(), pCity:GetY(), pPlot:GetX(), pPlot:GetY()) <= iRadius then\n\t\t\tif pPlot:GetImprovementType() == iImprovement and not pPlot:IsImprovementPillaged() then\n\t\t\t\tiCount = iCount + 1\n\t\t\tend\n\t\tend\n\tend\n\treturn iCount\nend\n\nlocal function syncClusterBonus(pCity)\n\tlocal iCount = countNearbyImprovements(pCity)\n\tpCity:SetNumRealBuilding(iDummy, iCount >= iThreshold and 1 or 0)\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() then\n\t\treturn\n\tend\n\tfor pCity in pPlayer:Cities() do\n\t\tsyncClusterBonus(pCity)\n\tend\nend)",
					"Threshold count recipe for uniques that unlock only after enough nearby matching improvements exist around the city.",
				),
			],
		},
		touchpoints: [
			linkToLua("City:GetCityIndexPlot", "city-getcityindexplot-106", "methods", "Use this to scan plots in the city's ring before applying the threshold rule."),
			linkToLua("City:GetNumCityPlots", "city-getnumcityplots-180", "methods", "Needed for safe city-ring iteration instead of a wider map scan."),
			linkToLua("Map.PlotDistance", "map-plotdistance-32", "methods", "Simple radius check when the mechanic wants a nearby threshold rather than any plot in the city's full workable ring."),
			linkToSchema("Improvements", "Reference the concrete improvement rows behind the threshold condition.", "rows"),
		],
	},
	{
		title: "Religious Pressure Scalar",
		focus: "Pressure as an input value",
		status: "Lua Pattern",
		copy: "Use this when religious pressure itself should be turned into yields, XP, training speed, or city-side effects. Instead of checking only majority religion, read the pressure numbers directly and convert that live amount into the bonus you want.",
		deliverables: [
			"A helper that resolves own religion and foreign religion pressure for a city.",
			"A scalar function that converts pressure into a reward amount or threshold result.",
			"A city example that treats pressure as a changing input instead of a simple yes or no religion gate.",
		],
		example: {
			title: "Convert foreign pressure into Faith and own pressure into Culture",
			summary: "This example reads the city's founded religion pressure, compares it with the majority religion pressure, and turns those values into different rewards each turn.",
			files: [
				snippetFile(
					"Lua/Gameplay/ReligiousPressureScalar.lua",
					"lua",
					"local function getPressureState(pPlayer, pCity)\n\tif not pPlayer or not pCity then\n\t\treturn nil\n\tend\n\tlocal eFoundedReligion = pPlayer:GetReligionCreatedByPlayer()\n\tlocal eMajorityReligion = pCity:GetReligiousMajority()\n\tlocal iOwnPressure = eFoundedReligion ~= -1 and pCity:GetPressurePerTurn(eFoundedReligion) or 0\n\tlocal iMajorityPressure = eMajorityReligion ~= -1 and pCity:GetPressurePerTurn(eMajorityReligion) or 0\n\tlocal iForeignPressure = eMajorityReligion ~= -1 and eMajorityReligion ~= eFoundedReligion and iMajorityPressure or 0\n\treturn {\n\t\town = iOwnPressure,\n\t\tforeign = iForeignPressure,\n\t}\nend\n\nlocal function applyPressureRewards(pPlayer, pCity)\n\tlocal pressure = getPressureState(pPlayer, pCity)\n\tif not pressure then\n\t\treturn\n\tend\n\tif pressure.own > 0 then\n\t\tpPlayer:ChangeJONSCulture(math.floor(pressure.own / 10))\n\tend\n\tif pressure.foreign > 0 then\n\t\tpPlayer:ChangeFaith(math.floor(pressure.foreign / 10))\n\tend\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() then\n\t\treturn\n\tend\n\tfor pCity in pPlayer:Cities() do\n\t\tapplyPressureRewards(pPlayer, pCity)\n\tend\nend)",
					"Pressure scaling recipe that treats own and foreign pressure as numeric inputs and converts them into different rewards.",
				),
			],
		},
		touchpoints: [
			linkToLua("City:GetPressurePerTurn", "city-getpressureperturn-204", "methods", "Primary way to read the actual pressure amount for one religion in a city."),
			linkToLua(
				"City:GetReligiousMajority",
				"city-getreligiousmajority-233",
				"methods",
				"Use this when the scalar should compare founded religion pressure against the city's current majority religion.",
			),
			linkToLua("Player:GetReligionCreatedByPlayer", "player-getreligioncreatedbyplayer-490", "methods", "Needed when the pressure scalar should key off the religion founded by the player."),
			linkToPage(
				"Religion / Belief Condition Check",
				"/pattern-library",
				"Read this first when the mechanic still needs a belief or founded religion gate before pressure is converted into value.",
			),
		],
	},
	{
		title: "Foreign Continent / Landmass Gate",
		focus: "Overseas and foreign-landmass checks",
		status: "Lua Pattern",
		copy: "Use this when a mechanic should behave differently on a foreign continent or overseas landmass. In Civ V Lua, the practical runtime gate is usually land area rather than a richer continent system, so the pattern is to compare the city or plot area against the capital's home area and treat different land areas as foreign landmass logic.",
		deliverables: [
			"A helper that resolves the player's home land area from the capital or first city.",
			"A city or plot gate that checks whether the target is on a different land area from the home core.",
			"A starter initialization example for overseas settles, foreign landmass rewards, or alternate spawn logic.",
		],
		example: {
			title: "Grant an overseas settle bonus on a foreign landmass",
			summary: "This example treats a newly founded city as overseas if it is on a different land area from the capital and grants a bonus only in that case.",
			files: [
				snippetFile(
					"Lua/Gameplay/ForeignLandmassGate.lua",
					"lua",
					'local function getHomeAreaID(pPlayer)\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tlocal pCapitalPlot = pCapital and pCapital:Plot()\n\treturn pCapitalPlot and pCapitalPlot:GetArea() or -1\nend\n\nlocal function isOnForeignLandmass(pPlayer, pCity)\n\tif not pPlayer or not pCity then\n\t\treturn false\n\tend\n\tlocal iHomeArea = getHomeAreaID(pPlayer)\n\tlocal pCityPlot = pCity:Plot()\n\treturn iHomeArea ~= -1 and pCityPlot and pCityPlot:GetArea() ~= iHomeArea\nend\n\nGameEvents.PlayerCityFounded.Add(function(iPlayer, iX, iY)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pPlot = Map.GetPlot(iX, iY)\n\tlocal pCity = pPlot and pPlot:GetPlotCity()\n\tif not pPlayer or not pCity or not isOnForeignLandmass(pPlayer, pCity) then\n\t\treturn\n\tend\n\tpPlayer:ChangeGold(100)\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "An overseas settlement triggered its foreign-landmass reward.", pCity:GetName(), iX, iY)\nend)',
					"Foreign landmass gate for overseas settles and other mechanics that should trigger only when the city is off the player's home land area.",
				),
			],
		},
		touchpoints: [
			linkToLua("Plot:GetArea", "plot-getarea-30", "methods", "Core runtime landmass proxy when the mechanic wants to know if two plots belong to different land areas."),
			linkToLua("City:Area", "city-area-5", "methods", "Useful city counterpart when the mechanic starts from the city instead of the plot."),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Common home area anchor for deciding whether a later city or plot is overseas."),
			linkToPage("City Founded Initialization", "/pattern-library", "Closest companion when the landmass gate should feed into city start bonuses or setup work right after founding."),
		],
	},
	{
		title: "Foreign City Effect Host",
		focus: "Placing or syncing effects inside another civ's city",
		status: "Lua Pattern",
		copy: "Use this when your civ's mechanic lives in somebody else's city instead of your own. The usual pattern is to scan foreign cities that meet an influence, tourism, religion, or diplomacy rule, then host the effect there through a dummy building, pressure pulse, resistance tweak, or some other local change.",
		deliverables: [
			"A foreign city scanner that resolves which outside cities are valid hosts for the effect.",
			"A sync helper that applies or removes the hosted city effect without leaving stale state behind.",
			"A starter example for influence, religion, or tourism foreign city mechanics.",
		],
		example: {
			title: "Place a hidden building in influential foreign cities",
			summary: "This example gives a civ a hosted effect in foreign cities once it becomes influential over that civ, then removes the effect if influence is lost later.",
			files: [
				snippetFile(
					"Lua/Gameplay/ForeignCityEffectHost.lua",
					"lua",
					"local iDummyBuilding = GameInfoTypes.BUILDING_CMC_FOREIGN_CITY_HOST\n\nlocal function shouldHostEffect(pOwner, iForeignPlayer)\n\treturn pOwner:GetInfluenceLevel(iForeignPlayer) >= InfluenceLevelTypes.INFLUENCE_LEVEL_INFLUENTIAL\nend\n\nlocal function syncHostedEffectForPair(pOwner, pForeignPlayer)\n\tlocal bHost = shouldHostEffect(pOwner, pForeignPlayer:GetID())\n\tfor pCity in pForeignPlayer:Cities() do\n\t\tpCity:SetNumRealBuilding(iDummyBuilding, bHost and 1 or 0)\n\tend\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pOwner = Players[iPlayer]\n\tif not pOwner or not pOwner:IsAlive() or pOwner:IsMinorCiv() or pOwner:IsBarbarian() then\n\t\treturn\n\tend\n\tfor iOtherPlayer, pForeignPlayer in ipairs(Players) do\n\t\tif pForeignPlayer and pForeignPlayer:IsAlive() and iOtherPlayer ~= iPlayer and pForeignPlayer:GetTeam() ~= pOwner:GetTeam() then\n\t\t\tsyncHostedEffectForPair(pOwner, pForeignPlayer)\n\t\tend\n\tend\nend)",
					"Foreign city host pattern. Replace the dummy building payload with the exact effect that should live inside qualifying outside cities.",
				),
			],
		},
		touchpoints: [
			linkToLua(
				"Player:GetInfluenceLevel",
				"player-getinfluencelevel-292",
				"methods",
				"Simple threshold gate when the hosted foreign city effect should turn on at a specific tourism influence level.",
			),
			linkToLua("Player:GetInfluenceOn", "player-getinfluenceon-294", "methods", "Use this if the hosted effect should scale from raw influence amount instead of a named level."),
			linkToLua(
				"Player:GetTourismModifierWith",
				"player-gettourismmodifierwith-544",
				"methods",
				"Useful when the foreign city host depends on route, religion, or open borders tourism context.",
			),
			linkToPage("Dynamic Dummy Building Updater", "/pattern-library", "Best companion when the hosted effect itself is implemented through a local dummy building sync."),
		],
	},
	{
		title: "Adjacency Aura / Shared Bonus Network",
		focus: "Spatial bonuses between nearby units or plots",
		status: "Lua Pattern",
		copy: "Use this when one unit, plot, or improvement should project a local bonus onto nearby recipients. The core loop is to detect qualifying neighbors, count or validate the aura source, then grant and strip the bonus cleanly as units move around the map.",
		deliverables: [
			"An adjacency resolver that checks whether a target is inside the aura network.",
			"A sync pass that grants the bonus only while the target remains in range of a valid source.",
			"A reusable scaffold for embarked movement auras, adjacent combat buffs, and networked support bonuses.",
		],
		example: {
			title: "Grant an aura promotion to adjacent friendly units",
			summary: "This example gives nearby friendly units a temporary promotion whenever they stand next to a qualifying aura source unit.",
			files: [
				snippetFile(
					"Lua/Gameplay/AdjacencyAuraNetwork.lua",
					"lua",
					"local iAuraSourcePromotion = GameInfoTypes.PROMOTION_CMC_AURA_SOURCE\nlocal iAuraBonusPromotion = GameInfoTypes.PROMOTION_CMC_AURA_BONUS\n\nlocal function hasAdjacentAuraSource(pUnit)\n\tlocal pPlot = pUnit and pUnit:GetPlot()\n\tif not pPlot then\n\t\treturn false\n\tend\n\tfor iDirection = 0, DirectionTypes.NUM_DIRECTION_TYPES - 1 do\n\t\tlocal pAdjacentPlot = Map.PlotDirection(pPlot:GetX(), pPlot:GetY(), iDirection)\n\t\tif pAdjacentPlot then\n\t\t\tfor i = 0, pAdjacentPlot:GetNumUnits() - 1 do\n\t\t\t\tlocal pAdjacentUnit = pAdjacentPlot:GetUnit(i)\n\t\t\t\tif pAdjacentUnit and pAdjacentUnit:GetOwner() == pUnit:GetOwner() and pAdjacentUnit:IsHasPromotion(iAuraSourcePromotion) then\n\t\t\t\t\treturn true\n\t\t\t\tend\n\t\t\tend\n\t\tend\n\tend\n\treturn false\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() then\n\t\treturn\n\tend\n\tfor pUnit in pPlayer:Units() do\n\t\tlocal bShouldHaveAura = hasAdjacentAuraSource(pUnit)\n\t\tpUnit:SetHasPromotion(iAuraBonusPromotion, bShouldHaveAura)\n\tend\nend)",
					"Adjacency aura sync that grants a shared bonus only while a friendly aura source remains next to the recipient unit.",
				),
			],
		},
		touchpoints: [
			linkToLua(
				"Unit:IsFriendlyUnitAdjacent",
				"unit-isfriendlyunitadjacent-276",
				"methods",
				"Fast builtin check when the aura only cares whether some friendly unit is adjacent, not which exact unit it is.",
			),
			linkToLua("Unit:GetAdjacentModifier", "unit-getadjacentmodifier-100", "methods", "Helpful reference for mechanics that want to mirror or inspect existing adjacency style combat bonuses."),
			linkToSchema("UnitPromotions", "Use promotions as the cleanest temporary carrier for adjacency aura effects on units.", "rows"),
			linkToPage("Promotion Grant / Strip Logic", "/pattern-library", "Natural companion when the aura network needs a reusable promotion sync helper."),
		],
	},
	{
		title: "Pillage Mechanics",
		focus: "Reading and reacting to damaged plots",
		status: "Lua Pattern",
		copy: "Use this when a mechanic keys off whether plots are pillaged. The common structure is to scan owned territory or a city ring, count pillaged improvements and routes, then convert that damage state into rewards, penalties, attrition, or restoration logic.",
		deliverables: [
			"A plot-state helper that detects pillaged improvements and routes.",
			"A city or territory scan that converts pillage count into a live effect.",
			"A starter example for pillage rewards, damaged land penalties, or repair mechanics.",
		],
		example: {
			title: "Turn pillaged plots into a city penalty and recovery hook",
			summary: "This example counts pillaged plots in a city's workable ring and mirrors that total into a dummy building penalty that shrinks as repairs are completed.",
			files: [
				snippetFile(
					"Lua/Gameplay/PillageStateMechanics.lua",
					"lua",
					"local iDummyBuilding = GameInfoTypes.BUILDING_CMC_PILLAGE_PRESSURE\n\nlocal function countPillagedPlots(pCity)\n\tlocal iCount = 0\n\tfor iPlot = 0, pCity:GetNumCityPlots() - 1 do\n\t\tlocal pPlot = pCity:GetCityIndexPlot(iPlot)\n\t\tif pPlot and (pPlot:IsImprovementPillaged() or pPlot:IsRoutePillaged()) then\n\t\t\tiCount = iCount + 1\n\t\tend\n\tend\n\treturn iCount\nend\n\nlocal function syncPillagePenalty(pCity)\n\tpCity:SetNumRealBuilding(iDummyBuilding, countPillagedPlots(pCity))\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() then\n\t\treturn\n\tend\n\tfor pCity in pPlayer:Cities() do\n\t\tsyncPillagePenalty(pCity)\n\tend\nend)",
					"Pillage scanner that turns damaged plots into a local effect and naturally updates as workers repair the land.",
				),
			],
		},
		touchpoints: [
			linkToLua("Plot:IsImprovementPillaged", "plot-isimprovementpillaged-122", "methods", "Primary improvement damage check for pillage mechanics."),
			linkToLua("Plot:IsRoutePillaged", "plot-isroutepillaged-147", "methods", "Needed when roads and railroads should count alongside improvements."),
			linkToLua("Unit:GetPillageChange", "unit-getpillagechange-202", "methods", "Useful when the recipe wants to scale rewards around pillage performance on the unit side too."),
			linkToPage(
				"Worked vs Unworked Resource / Plot Scanner",
				"/pattern-library",
				"Closest sibling when the mechanic needs a city ring plot scan, but the condition is damaged state instead of worked state.",
			),
		],
	},
	{
		title: "City Output Conversion Pattern",
		focus: "Turning one live city yield into another effect",
		status: "Lua Pattern",
		copy: "Use this when a city's current output should be partially converted into something else. Instead of hard coding a flat reward, read the city's live yield rate, scale it, then route the result into Production, Culture, Food, or some other destination each turn or on a trigger.",
		deliverables: [
			"A conversion helper that reads a city's current source yield and computes a scaled amount.",
			"A destination payload that spends or mirrors that value somewhere else without hard coded constants.",
			"A starter example for per-turn yield conversion, crosscity sharing, or threshold based remapping.",
		],
		example: {
			title: "Convert part of Culture output into Production",
			summary: "This example reads each city's live Culture output, converts 25% of it into Production, and pushes that amount into the city's current build each turn.",
			files: [
				snippetFile(
					"Lua/Gameplay/CityOutputConversion.lua",
					"lua",
					"local function getConvertedOutput(pCity)\n\tlocal iCultureRate = pCity:GetYieldRate(YieldTypes.YIELD_CULTURE)\n\treturn math.floor(iCultureRate * 0.25)\nend\n\nlocal function applyConversion(pCity)\n\tlocal iBonusProduction = getConvertedOutput(pCity)\n\tif iBonusProduction > 0 then\n\t\tpCity:ChangeProduction(iBonusProduction)\n\tend\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() then\n\t\treturn\n\tend\n\tfor pCity in pPlayer:Cities() do\n\t\tapplyConversion(pCity)\n\tend\nend)",
					"Live city output conversion pattern. Swap the source yield, ratio, and destination payload to build other remapping mechanics.",
				),
			],
		},
		touchpoints: [
			linkToLua("City:GetYieldRate", "city-getyieldrate-273", "methods", "Preferred runtime source when the conversion should read the city's current full output for a yield."),
			linkToLua("City:GetYieldRateTimes100", "city-getyieldratetimes100-275", "methods", "Use this instead when the recipe needs fractional precision before rounding the converted result."),
			linkToLua("City:GetBaseYieldRate", "city-getbaseyieldrate-83", "methods", "Useful when the mechanic should convert only base city output and ignore temporary modifiers."),
			linkToPage("Yield Burst Helper", "/pattern-library", "Good companion when the converted value should be routed outward as a reward instead of directly changing city production."),
		],
	},
	{
		title: "Tech Unlock Listener",
		focus: "Tech reactions",
		status: "Lua Pattern",
		copy: "React cleanly when a team gains a technology, then route that state change into a reward, a building sync, or a notification without duplicating the same unlock guard everywhere.",
		deliverables: [
			"“TeamTechResearched” listener with a single target tech check.",
			"Team-to-player resolution block for the civs on that team.",
			"A starter place to hang rewards, dummy buildings, or messages once the unlock lands.",
		],
		example: {
			title: "Tech listener variants",
			summary: "Use one version when a single named tech matters, then a second version when the real payload should branch by whole tech family or threshold.",
			files: [
				snippetFile(
					"Lua/Gameplay/TechUnlockListener.lua",
					"lua",
					'local iTargetTech = GameInfoTypes.TECH_COMPASS\n\nGameEvents.TeamTechResearched.Add(function(eTeam, eTech, iChange)\n\tif eTech ~= iTargetTech or (iChange or 0) <= 0 then\n\t\treturn\n\tend\n\tfor iPlayer, pPlayer in ipairs(Players) do\n\t\tif pPlayer and pPlayer:IsAlive() and pPlayer:GetTeam() == eTeam then\n\t\t\tprint("[CMC] Team researched target tech for player", iPlayer)\n\t\tend\n\tend\nend)',
					"Compact unlock listener that keys off “TeamTechResearched” and only runs the payload path when the chosen tech is newly added.",
				),
				snippetFile(
					"Lua/Gameplay/NavalTechUnlockListener.lua",
					"lua",
					'local NAVAL_TECHS = {\n\t[GameInfoTypes.TECH_COMPASS] = true,\n\t[GameInfoTypes.TECH_ASTRONOMY] = true,\n}\n\nGameEvents.TeamTechResearched.Add(function(eTeam, eTech, iChange)\n\tif not NAVAL_TECHS[eTech] or (iChange or 0) <= 0 then\n\t\treturn\n\tend\n\tprint("[CMC] Naval tech unlocked for team", eTeam, eTech)\nend)',
					"Family-based variant. Use this when multiple related techs should route into the same reward or unlock logic.",
				),
			],
		},
		touchpoints: [
			{ label: "GameEvents.TeamTechResearched", href: "/lua-api-explorer", note: "Preferred hook when a recipe should react right as a team researches a technology." },
			linkToLua("Team:IsHasTech", "team-ishastech-110", "methods", "Useful when the listener feeds into later gate checks."),
			linkToSchema("Technologies", "Validate the tech row and any downstream unlock text or prerequisites.", "rows"),
			linkToPage("Requirements Gate Pattern", "/pattern-library", "Natural companion when the researched tech should later open or close a gate instead of only firing an immediate reward."),
		],
	},
	{
		title: "Promotion Grant / Strip Logic",
		focus: "Dynamic promotions",
		status: "Lua Pattern",
		copy: "Add or remove promotions based on live state instead of assuming the database can express the whole rule. This is especially useful for terrain, religion, era, or nearby-building checks.",
		deliverables: [
			"Central helper that flips a promotion on or off from a boolean condition.",
			"Example unit loop or targeted unit update path.",
			"Schema touchpoints for the promotion rows and eligible unit combats.",
		],
		example: {
			title: "Promotion sync variants",
			summary: "Keep one small grant or strip helper, then swap the live condition depending on whether the promotion is terrain-based, city-state-based, or something else.",
			files: [
				snippetFile(
					"Lua/Gameplay/PromotionSync.lua",
					"lua",
					"local iPromotion = GameInfoTypes.PROMOTION_CMC_VOLLEY_I\n\nlocal function syncPromotion(pUnit, shouldHave)\n\tif not pUnit then\n\t\treturn\n\tend\n\tpUnit:SetHasPromotion(iPromotion, shouldHave and true or false)\nend\n\nlocal function refreshUnit(pUnit)\n\tlocal pPlot = pUnit and pUnit:GetPlot()\n\tlocal shouldHave = pPlot and not pPlot:IsHills()\n\tsyncPromotion(pUnit, shouldHave)\nend",
					"One helper for setting or stripping a promotion when a live condition changes.",
				),
				snippetFile(
					"Lua/Gameplay/GarrisonPromotionSync.lua",
					"lua",
					`local iPromotion = GameInfoTypes.PROMOTION_CMC_GARRISON_GUARD

local function refreshGarrisonPromotion(pUnit)
	if not pUnit then
		return
	end
	local pPlot = pUnit:GetPlot()
	local pCity = pPlot and pPlot:GetPlotCity()
	local shouldHave = pCity and pCity:GetOwner() == pUnit:GetOwner()
	pUnit:SetHasPromotion(iPromotion, shouldHave and true or false)
end`,
					"City-state variant. This uses the same grant or strip shape, but the condition now depends on whether the unit is actually garrisoned in a friendly city.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.CanHavePromotion", "game-event-canhavepromotion-5", "gameEvents", "Use the event when the game needs to veto the promotion path entirely."),
			linkToSchema("UnitPromotions", "Promotion rows that the Lua helper is toggling on or off.", "rows"),
			linkToSchema("UnitPromotions_UnitCombats", "Keep the dynamic promotion aligned with the unit combats it is meant to affect.", "rows"),
			linkToPage("Unit Promoted Trigger", "/pattern-library", "Useful companion when the promotion sync should feed a post-promotion reward or tracking reaction."),
		],
	},
	{
		title: "Dynamic Dummy Building Updater",
		focus: "Live building sync",
		status: "Lua Pattern",
		copy: "Recompute hidden building counts from current city state instead of granting them once and hoping they stay valid forever. This is the safer pattern for coastal, religion, and empire-state mechanics.",
		deliverables: [
			"Single sync function that calculates the correct building count.",
			"A recurring or event-driven caller that keeps the dummy row accurate.",
			"Schema touchpoints for the building class and effect rows attached to the dummy.",
		],
		example: {
			title: "Count-based dummy updater",
			summary: "Calculate the live count, then write that count directly so the hidden proxy stays in sync with the current city state.",
			files: [
				snippetFile(
					"Lua/Gameplay/DynamicDummyUpdater.lua",
					"lua",
					"local iDummy = GameInfoTypes.BUILDING_CMC_DUMMY_GARRISON\n\nlocal function updateDummy(pCity)\n\tif not pCity then\n\t\treturn\n\tend\n\tlocal count = 0\n\tif pCity:IsCoastal(10) then\n\t\tcount = count + 1\n\tend\n\tif pCity:IsCapital() then\n\t\tcount = count + 1\n\tend\n\tpCity:SetNumRealBuilding(iDummy, count)\nend",
					"Dummy building updater that derives the hidden count from current city state instead of static grants.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Buildings", "The hidden proxy row that is being dynamically synced.", "rows"),
			linkToSchema("BuildingClasses", "Keep the dummy row on the right class while its count changes.", "rows"),
			linkToSchema("Building_YieldChanges", "Effect table that actually turns the hidden proxy into gameplay value.", "rows"),
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Common recurring hook when the sync should refresh from changing city state each turn."),
			linkToLua("City:SetNumRealBuilding", "city-setnumrealbuilding-355", "methods", "Core write helper when the computed dummy count needs to be applied back onto the city."),
			linkToPage(
				"Dummy Building Scaffold",
				"/pattern-library?pattern=dummy-building-scaffold",
				"Useful companion when the updater is syncing a hidden building carrier you have not scaffolded yet.",
			),
		],
	},
	{
		title: "Trait Driven Lua Effect",
		focus: "Trait checks in code",
		status: "Lua Pattern",
		copy: "Check whether the current civ or leader carries the intended trait, then branch the Lua effect from that trait key instead of hardcoding one civilization type everywhere.",
		deliverables: [
			"Trait lookup block that keeps the gameplay logic trait-centered.",
			"A simple hook showing how to bail out for civs without the trait.",
			"Schema touchpoints for the trait and its leader wiring.",
		],
		example: {
			title: "Trait-gated turn effect",
			summary: "Trait checks make the mechanic portable if multiple civs or leaders may share the same scripted effect later.",
			files: [
				snippetFile(
					"Lua/Gameplay/TraitDrivenEffect.lua",
					"lua",
					"local TRAIT_TYPE = 'TRAIT_CMC_MARITIME_COMPACT'\n\nlocal function playerHasTrait(pPlayer)\n\tlocal leaderType = GameInfo.Leaders[pPlayer:GetLeaderType()] and GameInfo.Leaders[pPlayer:GetLeaderType()].Type\n\treturn leaderType and GameInfo.Leader_Traits{LeaderType = leaderType, TraitType = TRAIT_TYPE}() ~= nil\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() or not playerHasTrait(pPlayer) then\n\t\treturn\n\tend\n\tprint('[CMC] Trait-driven effect ran for player', iPlayer)\nend)",
					"Turn effect scaffold that branches from trait ownership instead of a hardcoded civilization type.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Traits", "Central trait row that the Lua logic should key off.", "rows"),
			linkToSchema("Leader_Traits", "Join table for resolving whether the current leader carries the trait.", "rows"),
			linkToSchema("Civilization_Leaders", "Useful when tracing the trait all the way back to the civilization package.", "rows"),
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Easy place to demonstrate a trait-gated recurring effect."),
		],
	},
	{
		title: "Unit Upgrade Carryover",
		focus: "Upgrade persistence",
		status: "Lua Pattern",
		copy: "Preserve promotions, names, or custom state across upgrades so special units do not silently lose their scripted identity when they advance to the next class.",
		deliverables: [
			"Pre-upgrade state capture idea for names, markers, or promotions.",
			"A “UnitUpgraded” reapply block for the new unit.",
			"Schema touchpoints for the upgrade class and promotion rows involved.",
		],
		example: {
			title: "Upgrade carryover note",
			summary: "Store the custom state before the upgrade resolves, then reapply it when “UnitUpgraded” hands you the new unit ID.",
			files: [
				snippetFile(
					"Lua/Gameplay/UnitUpgradeCarryover.lua",
					"lua",
					"local upgradeState = {}\n\nlocal function rememberUnit(pUnit)\n\tif not pUnit then\n\t\treturn\n\tend\n\tupgradeState[pUnit:GetID()] = {\n\t\tname = pUnit:GetNameNoDesc(),\n\t\txp = pUnit:GetExperience(),\n\t}\nend\n\nlocal function restoreUnit(pUnit, state)\n\tif not pUnit or not state then\n\t\treturn\n\tend\n\tif state.name and state.name ~= '' then\n\t\tpUnit:SetName(state.name)\n\tend\n\tpUnit:SetExperience(math.max(pUnit:GetExperience(), state.xp or 0))\nend\n\nGameEvents.UnitUpgraded.Add(function(iPlayer, iOldUnit, iNewUnit, bGoodyHut)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pUnit = pPlayer and pPlayer:GetUnitByID(iNewUnit)\n\tlocal state = upgradeState[iOldUnit]\n\tif not pUnit or not state then\n\t\treturn\n\tend\n\trestoreUnit(pUnit, state)\n\tupgradeState[iOldUnit] = nil\nend)",
					"Core pattern for remembering custom unit state and restoring it through the “UnitUpgraded” event once the new unit exists.",
				),
			],
		},
		touchpoints: [
			{ label: "GameEvents.UnitUpgraded", href: "/lua-api-explorer", note: "Preferred restore-side hook when the upgraded unit needs its custom state reapplied." },
			linkToSchema("Unit_ClassUpgrades", "Upgrade chain table to verify which target class the special unit is entering.", "rows"),
			linkToSchema("UnitPromotions", "Promotion rows that may need to be re-granted on the upgraded unit.", "rows"),
			linkToSchema("Units", "Validate both the source and upgraded unit rows.", "rows"),
		],
	},
	{
		title: "Religion / Belief Condition Check",
		focus: "Religion gates",
		status: "Lua Pattern",
		copy: "Centralize the most common religion checks: does the city follow a religion, is it the holy city, does the civ own a belief, or should a belief-specific reward path open at all.",
		deliverables: [
			"Starter city-level religion gate with explicit fallback behavior.",
			"Belief-side schema references for common city and holy-city payload tables.",
			"A clean place to hand off into rewards, dummy buildings, or restrictions.",
		],
		example: {
			title: "Belief-aware city gate",
			summary: "Check religion state first, then branch to the actual reward or restriction code once the city satisfies the belief-side condition.",
			files: [
				snippetFile(
					"Lua/Gameplay/ReligionGate.lua",
					"lua",
					"local function cityPassesReligionGate(pCity)\n\tif not pCity then\n\t\treturn false\n\tend\n\tlocal religion = pCity:GetReligiousMajority()\n\treturn religion ~= -1 and religion ~= nil\nend",
					"Starter gate for mechanics that should only run in cities with an active majority religion.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Religions", "Base religion table behind city and civ religion checks.", "rows"),
			linkToSchema("Beliefs", "Belief rows behind belief-aware reward or restriction logic.", "rows"),
			linkToSchema("Belief_HolyCityYieldChanges", "Typical holy-city payoff table for religion mechanics.", "rows"),
			linkToSchema("Belief_CityYieldChanges", "City-level belief payload table often mirrored by Lua checks.", "rows"),
			linkToLua("City:GetReligiousMajority", "city-getreligiousmajority-233", "methods", "Primary city-side helper for majority-religion gates and dummy-building sync checks."),
			linkToLua("GameEvents.ReligionFounded", "game-event-religionfounded-76", "gameEvents", "Use the founded hook when the condition gate should only open from the one-time founder moment."),
			linkToLua("GameEvents.CityConvertsReligion", "game-event-cityconvertsreligion-29", "gameEvents", "Use the city-conversion hook when the gate should re-evaluate on majority changes."),
			linkToPage("Religion Support", "/religion-support", "Useful reference when the gate logic needs a quick lookup for religion names, text keys, and support metadata."),
		],
	},
	{
		title: "Plot Search Pattern",
		focus: "Valid placement",
		status: "Lua Pattern",
		copy: "Search outward from a city or unit until you find a legal plot for a spawn, improvement, or map effect. This avoids the common bug where scripts try to place things on an invalid tile and silently fail.",
		deliverables: [
			"Radius-search scaffold with a clear validity predicate.",
			"A stable fallback order for plots around a city.",
			"Schema touchpoints for the units or improvements that will use the chosen plot.",
		],
		example: {
			title: "Plot search variants",
			summary: "Use one search shape for unit placement and another for improvement stamping so the validity rule stays tied to the actual job.",
			files: [
				snippetFile(
					"Lua/Gameplay/FindValidPlot.lua",
					"lua",
					"local function findNearestValidPlot(pCity, maxRadius)\n\tlocal pOrigin = pCity and Map.GetPlot(pCity:GetX(), pCity:GetY())\n\tif not pOrigin then\n\t\treturn nil\n\tend\n\tfor radius = 1, maxRadius do\n\t\tfor dx = -radius, radius do\n\t\t\tfor dy = -radius, radius do\n\t\t\t\tlocal pPlot = Map.PlotXYWithRangeCheck(pOrigin:GetX(), pOrigin:GetY(), dx, dy, radius)\n\t\t\t\tif pPlot and not pPlot:IsWater() and not pPlot:IsCity() and not pPlot:IsMountain() then\n\t\t\t\t\treturn pPlot\n\t\t\t\tend\n\t\t\tend\n\t\tend\n\tend\n\treturn nil\nend",
					"Radius based search pattern for the nearest legal non-city, non-water, non-mountain plot.",
				),
				snippetFile(
					"Lua/Gameplay/FindImprovementCandidate.lua",
					"lua",
					`local function findImprovementCandidate(pCity, maxRadius)
	local pOrigin = pCity and Map.GetPlot(pCity:GetX(), pCity:GetY())
	if not pOrigin then
		return nil
	end
	for radius = 1, maxRadius do
		for dx = -radius, radius do
			for dy = -radius, radius do
				local pPlot = Map.PlotXYWithRangeCheck(pOrigin:GetX(), pOrigin:GetY(), dx, dy, radius)
				if pPlot and not pPlot:IsWater() and not pPlot:IsCity() and not pPlot:IsMountain() and pPlot:GetImprovementType() == -1 and pPlot:GetResourceType(-1) == -1 then
					return pPlot
				end
			end
		end
	end
	return nil
end`,
					"Improvement-placement variant. This keeps the same search loop, but the validity rule now cares about empty, buildable land instead of just any spawnable plot.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Units", "Spawn helpers usually feed the resolved plot into a unit creation call.", "rows"),
			linkToSchema("Builds", "Improvement or worker patterns often pair the plot search with a build choice.", "rows"),
			linkToSchema("Improvements", "Useful for the improvement-candidate variant where the resolved tile must still be empty and valid for a follow-up improvement stamp.", "rows"),
			linkToPage(
				"Nearest Valid Plot Finder",
				"/pattern-library",
				"Use the stricter follow-up recipe when the placement rules need fallback ordering and failure handling instead of a tiny starter loop.",
			),
		],
	},
	{
		title: "Distance + Closest Resolver",
		focus: "Spatial queries",
		status: "Lua Pattern",
		copy: "Handle tile distance, city distance, and 'closest of X' lookups in one place so map-based effects do not keep reimplementing the same loops. This is useful for nearest city checks, nearest unit searches, radius gating, and tile-targeted rewards.",
		deliverables: [
			"Distance helper for plot-to-plot and city-to-plot checks.",
			"Nearest match loop for cities, units, or any other collection with coordinates.",
			"A reusable scaffold for 'closest valid X' queries with a filter callback.",
		],
		example: {
			title: "Distance and nearest-target helpers",
			summary: "Keep the raw distance math in small helpers, then reuse the same nearest match loop for cities, units, or filtered plots.",
			files: [
				snippetFile(
					"Lua/Gameplay/DistanceHelpers.lua",
					"lua",
					"local function distanceBetweenPlots(pPlotA, pPlotB)\n\tif not pPlotA or not pPlotB then\n\t\treturn nil\n\tend\n\treturn Map.PlotDistance(pPlotA:GetX(), pPlotA:GetY(), pPlotB:GetX(), pPlotB:GetY())\nend\n\nlocal function distanceFromPlotToCity(pPlot, pCity)\n\tif not pPlot or not pCity then\n\t\treturn nil\n\tend\n\treturn Map.PlotDistance(pPlot:GetX(), pPlot:GetY(), pCity:GetX(), pCity:GetY())\nend\n\nlocal function findClosestCity(pPlayer, pOriginPlot, predicate)\n\tlocal bestCity = nil\n\tlocal bestDistance = nil\n\tif not pPlayer or not pOriginPlot then\n\t\treturn nil, nil\n\tend\n\tfor pCity in pPlayer:Cities() do\n\t\tif not predicate or predicate(pCity) then\n\t\t\tlocal distance = distanceFromPlotToCity(pOriginPlot, pCity)\n\t\t\tif distance and (bestDistance == nil or distance < bestDistance) then\n\t\t\t\tbestCity = pCity\n\t\t\t\tbestDistance = distance\n\t\t\tend\n\t\tend\n\tend\n\treturn bestCity, bestDistance\nend\n\nlocal function findClosestUnit(pPlayer, pOriginPlot, predicate)\n\tlocal bestUnit = nil\n\tlocal bestDistance = nil\n\tif not pPlayer or not pOriginPlot then\n\t\treturn nil, nil\n\tend\n\tfor pUnit in pPlayer:Units() do\n\t\tif not predicate or predicate(pUnit) then\n\t\t\tlocal pUnitPlot = pUnit:GetPlot()\n\t\t\tlocal distance = distanceBetweenPlots(pOriginPlot, pUnitPlot)\n\t\t\tif distance and (bestDistance == nil or distance < bestDistance) then\n\t\t\t\tbestUnit = pUnit\n\t\t\t\tbestDistance = distance\n\t\t\tend\n\t\tend\n\t\tend\n\treturn bestUnit, bestDistance\nend\n\n-- Example usages:\n-- local pNearestCity, cityDistance = findClosestCity(pPlayer, pOriginPlot, function(pCity)\n-- \treturn pCity:IsCoastal(10)\n-- end)\n--\n-- local pNearestUnit, unitDistance = findClosestUnit(pPlayer, pOriginPlot, function(pUnit)\n-- \treturn pUnit:GetDomainType() == DomainTypes.DOMAIN_LAND\n-- end)\n\nreturn {\n\tdistanceBetweenPlots = distanceBetweenPlots,\n\tdistanceFromPlotToCity = distanceFromPlotToCity,\n\tfindClosestCity = findClosestCity,\n\tfindClosestUnit = findClosestUnit,\n}",
					"Reusable helper file for plot distance, distance to a city, nearest city, and nearest unit. Swap the predicate to turn 'closest of X' into 'closest coastal city', 'closest damaged unit', or any other filtered target.",
				),
				snippetFile(
					"Lua/Gameplay/DistanceExamples.lua",
					"lua",
					'local Distance = include("DistanceHelpers")\nlocal iPlayer = Game.GetActivePlayer()\nlocal pPlayer = Players[iPlayer]\nlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\nlocal pOriginPlot = pCapital and Map.GetPlot(pCapital:GetX(), pCapital:GetY())\n\nif pPlayer and pOriginPlot then\n\tlocal pCoastalCity, coastalDistance = Distance.findClosestCity(pPlayer, pOriginPlot, function(pCity)\n\t\treturn pCity:IsCoastal(10)\n\tend)\n\n\tlocal pLandUnit, unitDistance = Distance.findClosestUnit(pPlayer, pOriginPlot, function(pUnit)\n\t\treturn pUnit:GetDomainType() == DomainTypes.DOMAIN_LAND\n\tend)\n\n\tprint("[CMC] Closest coastal city", pCoastalCity and pCoastalCity:GetName(), coastalDistance)\n\tprint("[CMC] Closest land unit", pLandUnit and pLandUnit:GetName(), unitDistance)\nend',
					"Example consumer showing distance to the nearest coastal city and nearest land unit from the capital tile.",
				),
			],
		},
		touchpoints: [
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Convenient source city when the origin tile or comparison city is the capital."),
			linkToSchema("Units", "Useful when the closest target is a unit type or when the query should filter to specific units.", "rows"),
			linkToSchema("Civilization_CityNames", "City-side examples often start from a city collection even when the real goal is spatial filtering.", "rows"),
			{ label: "Lua API Explorer", href: "/lua-api-explorer", note: "Use the explorer to inspect nearby plot, unit, player, and city helpers that can feed into custom closest-target logic." },
		],
	},
	{
		title: "Strategic / Luxury Resource Spawn",
		focus: "Map resource placement",
		status: "Lua Pattern",
		copy: "Spawn a strategic or luxury resource onto a valid plot after you have already resolved the target tile. This is useful for event rewards, map scripts, improvement-driven mechanics, or one-off scripted discoveries.",
		deliverables: [
			"Plot-side resource placement scaffold.",
			"Optional improvement pairing when the resource should appear with worked infrastructure.",
			"A clean validity block before the resource is written to the map.",
		],
		example: {
			title: "Spawn iron on a resolved plot",
			summary: "Resolve the plot first, verify that it is legal, then write the resource and optional improvement in one place.",
			files: [
				snippetFile(
					"Lua/Gameplay/SpawnResource.lua",
					"lua",
					"local iIron = GameInfoTypes.RESOURCE_IRON\nlocal iMine = GameInfoTypes.IMPROVEMENT_MINE\n\nlocal function spawnResourceOnPlot(pPlot, iResource, quantity)\n\tif not pPlot or pPlot:IsCity() or pPlot:IsMountain() or pPlot:IsWater() then\n\t\treturn false\n\tend\n\tpPlot:SetResourceType(iResource, quantity or 1)\n\treturn true\nend\n\nlocal function grantIronDeposit(pPlot)\n\tif spawnResourceOnPlot(pPlot, iIron, 2) then\n\t\tpPlot:SetImprovementType(iMine)\n\t\treturn true\n\tend\n\treturn false\nend",
					"Resource-spawn scaffold for a resolved plot, with a basic legality check and an optional improvement paired to the resource.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Resources", "Validate the strategic or luxury resource row before writing it to the map.", "rows"),
			linkToSchema("ResourceClasses", "Useful when the reward should only target a strategic or luxury class of resource.", "rows"),
			linkToSchema("Resource_QuantityTypes", "Reference the normal quantity-side expectations for placed resources.", "rows"),
			linkToSchema("Improvements", "Often paired with resource placement when the script should also add the workable improvement.", "rows"),
			{ label: "Lua API Explorer", href: "/lua-api-explorer", note: "Use the explorer to inspect map, plot, and player helpers that feed into plot selection before the resource is placed." },
		],
	},
	{
		title: "Unit Spawn Workflow",
		focus: "Basic unit creation",
		status: "Lua Pattern",
		copy: "Spawn a unit from a known city or plot, then immediately do the usual follow-up work: damage, experience, promotions, custom naming, and player feedback. This is the smaller baseline pattern before more specialized unit reward scripts.",
		deliverables: [
			"“InitUnit” style creation scaffold from a city or chosen plot.",
			"Optional post-spawn setup block for promotions, damage, or names.",
			"A notification path so the player can see the created unit resolve.",
		],
		example: {
			title: "Spawn workflow variants",
			summary: "Show the clean city-anchor version first, then a fallback-placement version for cases where the origin tile may not be safe enough on its own.",
			files: [
				snippetFile(
					"Lua/Gameplay/SpawnUnitWorkflow.lua",
					"lua",
					'local iUnitType = GameInfoTypes.UNIT_SPEARMAN\nlocal iPromotion = GameInfoTypes.PROMOTION_DRILL_1\n\nlocal function spawnGuardUnit(pPlayer, pCity)\n\tif not pPlayer or not pCity then\n\t\treturn nil\n\tend\n\tlocal pUnit = pPlayer:InitUnit(iUnitType, pCity:GetX(), pCity:GetY())\n\tif not pUnit then\n\t\treturn nil\n\tend\n\tpUnit:SetHasPromotion(iPromotion, true)\n\tpUnit:SetDamage(5)\n\tpUnit:SetName(\"City Guard\")\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, \"A guard unit has been raised.\", \"Unit Spawned\", pCity:GetX(), pCity:GetY())\n\treturn pUnit\nend',
					"Baseline unit-spawn pattern with post-creation setup and a player-facing notification.",
				),
				snippetFile(
					"Lua/Gameplay/SpawnUnitWithFallbackPlot.lua",
					"lua",
					`local iUnitType = GameInfoTypes.UNIT_SPEARMAN

local function findSpawnPlotAroundCity(pCity, maxRadius)
	local pOrigin = pCity and Map.GetPlot(pCity:GetX(), pCity:GetY())
	if not pOrigin then
		return nil
	end
	for radius = 0, maxRadius do
		for dx = -radius, radius do
			for dy = -radius, radius do
				local pPlot = Map.PlotXYWithRangeCheck(pOrigin:GetX(), pOrigin:GetY(), dx, dy, radius)
				if pPlot and not pPlot:IsWater() and not pPlot:IsCity() and not pPlot:IsMountain() then
					return pPlot
				end
			end
		end
	end
	return pOrigin
end

local function spawnUnitWithFallback(pPlayer, pCity)
	local pSpawnPlot = findSpawnPlotAroundCity(pCity, 2)
	if not pPlayer or not pSpawnPlot then
		return nil
	end
	return pPlayer:InitUnit(iUnitType, pSpawnPlot:GetX(), pSpawnPlot:GetY())
end`,
					"Fallback-placement variant. Use this when the unit should appear near the city, but not blindly on the city tile every time.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Units", "Validate the unit row that the script will create.", "rows"),
			linkToSchema("UnitClasses", "Useful when the unit type is chosen from or compared against a class.", "rows"),
			linkToSchema("UnitPromotions", "Promotion rows commonly attached right after the unit spawns.", "rows"),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Common origin city when the spawn is capital-based."),
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Show the player where the spawned unit appeared."),
			linkToPage(
				"Plot Search Pattern",
				"/pattern-library",
				"Useful companion when the fallback spawn version should first resolve a legal nearby tile instead of always using the city coordinates.",
			),
			{
				label: "Unit Spawn Helper",
				href: "/pattern-library",
				note: "Use the focused companion when the same spawn pattern should be reduced to one reliable anchor and a tighter helper surface.",
			},
			{
				label: "Unit Created Post-Spawn Setup",
				href: "/pattern-library",
				note: "Use the post-create companion when every spawned unit should pass through the same normalization step afterward.",
			},
		],
	},
	{
		title: "Unit Tracking Table",
		focus: "Runtime unit state",
		status: "Lua Pattern",
		copy: "Track units in a Lua table keyed by owner and unit ID so custom state survives across repeated hook calls. This is useful for tagging scripted units, cooldown ownership, remembered promotions, or cleanup jobs.",
		deliverables: ["Composite unit key helper so rows do not collide across players.", "A tracking table for custom unit state.", "A cleanup pattern for dead or missing units."],
		example: {
			title: "Track scripted units by owner + id",
			summary: "Use a composite key instead of a bare unit ID, then clean dead entries during a recurring pass.",
			files: [
				snippetFile(
					"Lua/Gameplay/TrackedUnits.lua",
					"lua",
					"local trackedUnits = {}\n\nlocal function unitKey(iPlayer, iUnit)\n\treturn string.format('%d:%d', iPlayer, iUnit)\nend\n\nlocal function trackUnit(iPlayer, pUnit, data)\n\tif not pUnit then\n\t\treturn\n\tend\n\ttrackedUnits[unitKey(iPlayer, pUnit:GetID())] = data or {}\nend\n\nlocal function getTrackedUnit(iPlayer, iUnit)\n\treturn trackedUnits[unitKey(iPlayer, iUnit)]\nend\n\nlocal function pruneTrackedUnits()\n\tfor key, entry in pairs(trackedUnits) do\n\t\tlocal iPlayer, iUnit = string.match(key, '^(%d+):(%d+)$')\n\t\tlocal pPlayer = Players[tonumber(iPlayer)]\n\t\tlocal pUnit = pPlayer and pPlayer:GetUnitByID(tonumber(iUnit))\n\t\tif not pUnit then\n\t\t\ttrackedUnits[key] = nil\n\t\tend\n\tend\nend\n\nreturn {\n\ttrackUnit = trackUnit,\n\tgetTrackedUnit = getTrackedUnit,\n\tpruneTrackedUnits = pruneTrackedUnits,\n}",
					"Runtime unit-tracking table for custom flags, remembered state, and later cleanup.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Units", "Tracked runtime state usually refers back to a real unit row and type.", "rows"),
			linkToSchema("UnitPromotions", "Common companion data when tracked units gain or lose scripted promotion state.", "rows"),
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Convenient recurring hook for pruning dead tracked units or updating tracked state."),
		],
	},
	{
		title: "City Tracking Table",
		focus: "Runtime city state",
		status: "Lua Pattern",
		copy: "Track cities in a Lua table keyed by player and city ID when a mechanic needs remembered per-city state that does not belong in a database table. This is useful for once-per-city rules, city-stage progress, local scripted flags, or deferred cleanup.",
		deliverables: ["Composite city key helper.", "Tracking table for city-specific flags or state.", "A recurring cleanup or refresh pattern for removed or transferred cities."],
		example: {
			title: "Track city progression state",
			summary: "City IDs are player-scoped, so use a composite player:city key and resolve the city fresh when reading the tracked data back.",
			files: [
				snippetFile(
					"Lua/Gameplay/TrackedCities.lua",
					"lua",
					"local trackedCities = {}\n\nlocal function cityKey(iPlayer, iCity)\n\treturn string.format('%d:%d', iPlayer, iCity)\nend\n\nlocal function trackCity(iPlayer, pCity, data)\n\tif not pCity then\n\t\treturn\n\tend\n\ttrackedCities[cityKey(iPlayer, pCity:GetID())] = data or {}\nend\n\nlocal function getTrackedCity(iPlayer, iCity)\n\treturn trackedCities[cityKey(iPlayer, iCity)]\nend\n\nlocal function pruneTrackedCities()\n\tfor key in pairs(trackedCities) do\n\t\tlocal iPlayer, iCity = string.match(key, '^(%d+):(%d+)$')\n\t\tlocal pPlayer = Players[tonumber(iPlayer)]\n\t\tlocal pCity = pPlayer and pPlayer:GetCityByID(tonumber(iCity))\n\t\tif not pCity then\n\t\t\ttrackedCities[key] = nil\n\t\tend\n\tend\nend\n\nreturn {\n\ttrackCity = trackCity,\n\tgetTrackedCity = getTrackedCity,\n\tpruneTrackedCities = pruneTrackedCities,\n}",
					"Per-city runtime tracking helper for scripted state that needs to be keyed by both player and city ID.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Common place to refresh or prune tracked city state."),
			linkToSchema("Buildings", "Tracked city state often drives whether a city should receive a building-side effect.", "rows"),
			linkToSchema("Civilization_CityNames", "Useful when city-side scripts need to compare or report on known city identities.", "rows"),
		],
	},
	{
		title: "Religious Unit Handling",
		focus: "Faith unit gotchas",
		status: "Lua Pattern",
		copy: "Religious units need city context that already carries the intended religion. A common gotcha is that the unit only picks up the religion correctly if it is spawned in a city that already has that religion first, rather than being created on an arbitrary tile and expected to inherit it later.",
		deliverables: [
			"A spawn flow that resolves the source city before the unit is created.",
			"A clear gotcha note about religion inheritance on spawned religious units.",
			"Religion-side schema touchpoints for belief and religion setup behind the unit logic.",
		],
		example: {
			title: "Spawn in religion city, then relocate",
			summary: "Resolve a city that already has the intended religion, spawn the unit there first so it inherits the right religious state, then move it to the real destination plot afterward.",
			files: [
				snippetFile(
					"Lua/Gameplay/ReligiousUnitSpawn.lua",
					"lua",
					"local iMissionary = GameInfoTypes.UNIT_MISSIONARY\n\nlocal function findReligionCity(pPlayer)\n\tfor pCity in pPlayer:Cities() do\n\t\tlocal religion = pCity:GetReligiousMajority()\n\t\tif religion and religion ~= -1 then\n\t\t\treturn pCity, religion\n\t\tend\n\tend\n\treturn nil, nil\nend\n\nlocal function spawnMissionaryAtTarget(pPlayer, pTargetPlot)\n\tlocal pCity, religion = findReligionCity(pPlayer)\n\tif not pCity or not pTargetPlot then\n\t\treturn nil, nil\n\tend\n\n\t-- Important gotcha: spawn the religious unit in the city that already has the religion first.\n\t-- If you create it directly on an arbitrary target tile, you can end up with a unit that does not carry the intended religion state.\n\tlocal pUnit = pPlayer:InitUnit(iMissionary, pCity:GetX(), pCity:GetY())\n\tif not pUnit then\n\t\treturn nil, religion\n\tend\n\n\tpUnit:SetXY(pTargetPlot:GetX(), pTargetPlot:GetY())\n\treturn pUnit, religion\nend",
					"Religious-unit spawn scaffold that first creates the unit in a city with the religion, then moves it to the player’s intended destination plot.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Units", "Religious units still start from normal unit rows and type definitions.", "rows"),
			linkToSchema("Religions", "Religion rows behind the city-side religious context the unit should inherit.", "rows"),
			linkToSchema("Beliefs", "Belief-side mechanics often determine why the religious unit is being created in the first place.", "rows"),
			linkToSchema("Belief_EraFaithUnitPurchase", "Useful when the religious unit logic is tied to faith-purchase unlock rules.", "rows"),
			{ label: "Lua API Explorer", href: "/lua-api-explorer", note: "Use the explorer for player, city, and unit-side helpers that support religion-aware spawn flows." },
			{
				label: "Religion / Belief Condition Check",
				href: "/pattern-library",
				note: "Use the condition-check companion when the hard part is deciding which religion or belief state qualifies before the unit is spawned.",
			},
		],
	},
	{
		title: "Cooldown + Notification Combo",
		focus: "Safe player feedback",
		status: "Lua Pattern",
		copy: "Combine the two things that usually belong together: a persisted cooldown so the effect only fires on the intended cadence, and a notification so the player sees when it actually resolved.",
		deliverables: [
			"Cooldown guard plus notification call in the same scaffold.",
			"A clear place to stamp the turn before or after the reward path.",
			"Text and coordinate handling that can be reused across multiple mechanics.",
		],
		example: {
			title: "Turn-gated notification",
			summary: "Check the cooldown first, stamp it, then notify the player only when the gated effect really fires.",
			files: [
				snippetFile(
					"Lua/Gameplay/CooldownNotification.lua",
					"lua",
					'local Guards = include("TriggerGuards")\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tif not pCapital or not Guards.oncePerPlayerTurn(iPlayer, "CapitalPulse") then\n\t\treturn\n\tend\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "Your capital pulse resolved this turn.", "Capital Pulse", pCapital:GetX(), pCapital:GetY())\nend)',
					"Combined cooldown and notification scaffold for recurring player-facing mechanics.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Recurring hook for cooldown-plus-notification mechanics."),
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Show the player that the guarded effect actually resolved."),
			linkToLua("Game.GetGameTurn", "game-getgameturn-80", "methods", "Back the cooldown stamp with the current turn."),
			{
				label: "SaveData Cooldown / Once-Per-City / Once-Per-Player",
				href: "/pattern-library",
				note: "Use the dedicated persistence recipe when the guard needs explicit per-player or per-city keys instead of a compact combined example.",
			},
			{
				label: "Notification Utility Wrapper",
				href: "/pattern-library",
				note: "Pair it with the wrapper recipe when the same guarded effect needs reusable local, global, or met-only notification handling.",
			},
		],
	},
	{
		title: "City Capture / Found / Construct Hooks",
		focus: "City lifecycle hooks",
		status: "Lua Pattern",
		copy: "Keep city lifecycle logic grouped by when the city is being founded, captured, or asked to construct something. The safe data you can read varies by hook, so the recipe should make that explicit.",
		deliverables: [
			"A starter hook map for city creation, capture, and construct-time checks.",
			"Notes on when to use event-time guards versus turn-time follow-up syncs.",
			"Schema touchpoints for the building and city-side rows these hooks often affect.",
		],
		example: {
			title: "City lifecycle hook map",
			summary: "Split city lifecycle logic by when the game is asking a question, when a city is founded, and when ownership changes after capture.",
			files: [
				snippetFile(
					"Lua/Gameplay/CityLifecycleHooks.lua",
					"lua",
					"local iTarget = GameInfoTypes.BUILDING_CMC_HARBOR_OFFICE\n\nGameEvents.CityCanConstruct.Add(function(iPlayer, iCity, eBuilding)\n\tif eBuilding ~= iTarget then\n\t\treturn true\n\tend\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCity = pPlayer and pPlayer:GetCityByID(iCity)\n\treturn pCity and not pCity:IsOccupied()\nend)",
					"Construct-time gate example. This is the right place for a fast yes or no check before the building is allowed into production.",
				),
				snippetFile(
					"Lua/Gameplay/CityFoundedHooks.lua",
					"lua",
					'local iDummy = GameInfoTypes.BUILDING_CMC_FOUNDING_MARKER\n\nGameEvents.PlayerCityFounded.Add(function(iPlayer, iPlotX, iPlotY)\n\tlocal pPlot = Map.GetPlot(iPlotX, iPlotY)\n\tlocal pCity = pPlot and pPlot:GetPlotCity()\n\tif not pCity then\n\t\treturn\n\tend\n\tpCity:SetNumRealBuilding(iDummy, 1)\n\tprint("Initialized founded city:", pCity:GetName())\nend)',
					"Founded-city example. This is the safe moment for one-time setup on the new city after the city object actually exists on the map.",
				),
				snippetFile(
					"Lua/Gameplay/CityCaptureHooks.lua",
					"lua",
					'local iOccupiedDummy = GameInfoTypes.BUILDING_CMC_OCCUPATION_STATE\n\nGameEvents.CityCaptureComplete.Add(function(iOldPlayer, bCapital, iPlotX, iPlotY, iCity, iOldPop, bConquest)\n\tlocal pPlot = Map.GetPlot(iPlotX, iPlotY)\n\tlocal pCity = pPlot and pPlot:GetPlotCity()\n\tif not pCity then\n\t\treturn\n\tend\n\tif bConquest then\n\t\tpCity:SetNumRealBuilding(iOccupiedDummy, 0)\n\t\tprint("Post-capture cleanup for:", pCity:GetName(), bCapital, iOldPop)\n\tend\nend)',
					"Capture-complete example. Use the post-capture hook once the city has changed hands and can be restamped or cleaned up in its new state.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.CityCanConstruct", "game-event-citycanconstruct-22", "gameEvents", "Useful construct-time hook when the city state should veto a building."),
			linkToLua("GameEvents.PlayerCanConstruct", "game-event-playercanconstruct-62", "gameEvents", "Empire-level counterpart when the restriction is not city-specific."),
			linkToSchema("Buildings", "Most city lifecycle hooks eventually gate or react to a building row.", "rows"),
			linkToSchema("Civilization_CityNames", "Founding-time hooks often pair with city naming or city initialization logic.", "rows"),
			{
				label: "City Founded Initialization",
				href: "/pattern-library",
				note: "Read this next when the lifecycle branch you care about is immediate one-time setup right after founding.",
			},
			{
				label: "City Capture Follow-Up",
				href: "/pattern-library",
				note: "Use the conquest-specific companion when ownership changes and the real job is clearing or restamping city state.",
			},
			{
				label: "City Constructed / Project Created Trigger",
				href: "/pattern-library",
				note: "Use the completion-hook companion when the effect should happen after a building or project actually lands, not during construct-time gating.",
			},
		],
	},
	{
		title: "Yield Burst Helper",
		focus: "Immediate rewards",
		status: "Lua Pattern",
		copy: "Package the common reward burst logic for gold, culture, science, faith, or similar instant payouts so modders do not keep rebuilding the same reward-and-notification scaffolds from scratch.",
		deliverables: [
			"Single helper for awarding one or more burst yields.",
			"A starter notification path that reports the burst cleanly.",
			"Text-ready structure for scaling or conditional burst rewards later.",
		],
		example: {
			title: "Yield burst variants",
			summary: "Start with a one-yield helper, then branch into mixed-yield versions only when the mechanic actually needs them.",
			files: [
				snippetFile(
					"Lua/Gameplay/YieldBurst.lua",
					"lua",
					"local function grantGoldBurst(pPlayer, amount, pCity)\n\tif not pPlayer or amount <= 0 then\n\t\treturn\n\tend\n\tpPlayer:ChangeGold(amount)\n\tif pCity then\n\t\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, string.format('You gained %d [ICON_GOLD] Gold.', amount), 'Yield Burst', pCity:GetX(), pCity:GetY())\n\tend\nend",
					"Baseline burst helper for an immediate gold reward plus a simple notification path.",
				),
				snippetFile(
					"Lua/Gameplay/MixedYieldBurst.lua",
					"lua",
					"local function grantMixedBurst(pPlayer, goldAmount, cultureAmount, pCity)\n\tif not pPlayer then\n\t\treturn\n\tend\n\tif (goldAmount or 0) > 0 then\n\t\tpPlayer:ChangeGold(goldAmount)\n\tend\n\tif (cultureAmount or 0) > 0 then\n\t\tpPlayer:ChangeJONSCulture(cultureAmount)\n\tend\n\tif pCity then\n\t\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, string.format('You gained %d [ICON_GOLD] Gold and %d [ICON_CULTURE] Culture.', goldAmount or 0, cultureAmount or 0), 'Yield Burst', pCity:GetX(), pCity:GetY())\n\tend\nend",
					"Mixed-yield variant. Use this when one trigger should pay out more than one burst type instead of only gold.",
				),
			],
		},
		touchpoints: [
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Most burst rewards should still tell the player what just happened."),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Convenient coordinate anchor when the burst came from the capital."),
			linkToPage("Yield Reward With Scaled Era Output", "/pattern-library", "Use the scaled-yield companion when the mixed burst should grow by era instead of staying flat."),
		],
	},
	{
		title: "Player / Team Lookup Safety",
		focus: "Defensive Lua",
		status: "Lua Pattern",
		copy: "Put the nil checks, alive checks, team resolution, and player-type filters in one place so gameplay hooks do not fail on barbarians, minors, dead players, or missing team objects.",
		deliverables: [
			"Defensive player and team resolver block.",
			"Reusable filter rules for alive, minor-civ, barbarian, and observer-style cases.",
			"A template that can be pasted into any event before the actual mechanic runs.",
		],
		example: {
			title: "Lookup safety variants",
			summary: "Use one resolver for player plus team lookups, then a second resolver when the mechanic starts from a city and needs to validate the owner chain safely.",
			files: [
				snippetFile(
					"Lua/Gameplay/SafeLookups.lua",
					"lua",
					"local function getLiveMajorPlayerAndTeam(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() or pPlayer:IsMinorCiv() or pPlayer:IsBarbarian() then\n\t\treturn nil, nil\n\tend\n\tlocal pTeam = Teams[pPlayer:GetTeam()]\n\tif not pTeam then\n\t\treturn nil, nil\n\tend\n\treturn pPlayer, pTeam\nend\n\nreturn getLiveMajorPlayerAndTeam",
					"Drop-in resolver that protects most hooks from invalid player or team lookups before the actual mechanic starts.",
				),
				snippetFile(
					"Lua/Gameplay/SafeCityOwnerLookup.lua",
					"lua",
					"local function getSafeCityAndOwner(iPlayer, iCity)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() or pPlayer:IsMinorCiv() or pPlayer:IsBarbarian() then\n\t\treturn nil, nil\n\tend\n\tlocal pCity = pPlayer:GetCityByID(iCity)\n\tif not pCity then\n\t\treturn nil, nil\n\tend\n\treturn pPlayer, pCity\nend\n\nreturn getSafeCityAndOwner",
					"City-owner variant. Use this when the event payload starts with a city ID and the mechanic should not continue unless both the player and city resolve cleanly.",
				),
			],
		},
		touchpoints: [
			linkToLua("Team:IsHasTech", "team-ishastech-110", "methods", "One of the common team-side checks that benefits from a safe team resolver."),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Typical next step once the player lookup is confirmed safe."),
			linkToLua(
				"Player:GetCityByID",
				"player-getcitybyid-146",
				"methods",
				"Useful for the city-owner resolver variant when the safe lookup starts from a city payload instead of a bare player ID.",
			),
		],
	},
	{
		title: "Mod Configuration Toggle",
		focus: "Feature flags",
		status: "Lua Pattern",
		copy: "Read one config or saved option up front, then branch the feature behavior from that flag instead of scattering hardcoded booleans across multiple gameplay files.",
		deliverables: [
			"Single toggle read path for a feature flag.",
			"A guard that turns the mechanic on or off before any deeper work runs.",
			"A clear handoff point between mod setup and gameplay logic.",
		],
		example: {
			title: "Simple feature flag",
			summary: "Centralize the toggle, then exit early when the feature is off.",
			files: [
				snippetFile(
					"Lua/Config/FeatureToggle.lua",
					"lua",
					'local ModData = Modding.OpenSaveData()\nlocal KEY = "CMC_EnableCapitalPulse"\n\nlocal function isEnabled()\n\tlocal value = ModData.GetValue(KEY)\n\treturn value == nil and true or value == 1\nend\n\nreturn {\n\tisEnabled = isEnabled,\n}',
					"Simple feature-toggle helper backed by persisted mod state.",
				),
				snippetFile(
					"Lua/Gameplay/FeatureToggleConsumer.lua",
					"lua",
					'local Toggle = include("FeatureToggle")\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tif not Toggle.isEnabled() then\n\t\treturn\n\tend\n\tprint("[CMC] Feature toggle allowed the turn effect to run for player", iPlayer)\nend)',
					"Gameplay consumer that exits immediately when the feature is disabled.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Common consumer for a top-level feature toggle."),
			{ label: ".modinfo Builder", href: "/modinfo-builder", note: "Project setup and file wiring often need to stay in sync when a feature can be toggled on or off." },
			{ label: "Log & Debug Triage", href: "/pattern-library", note: "Feature flags are easier to validate when the logging and debug path is already in place." },
			{
				label: "Mod Detection / Compatibility Toggle",
				href: "/pattern-library",
				note: "Read the active-mod companion when the branch should depend on another mod being loaded instead of a local config or saved option.",
			},
		],
	},
	{
		title: "City Trained Trigger",
		focus: "Unit completion reactions",
		status: "Archive Pattern",
		copy: "Use this when you want something to happen right after a city trains a unit. Common uses are giving the unit a promotion, turning on a dummy building in the city, giving a small reward, or showing a notification.",
		deliverables: [
			"A “GameEvents.CityTrained” scaffold that resolves the city and unit safely.",
			"A post-train handoff point for promotions, dummy buildings, or reward bursts.",
			"Schema touchpoints for unit rows, promotions, and city-side payloads.",
		],
		example: {
			title: "Promote and notify on trained unit",
			summary: "This example watches for a newly trained Spearman, gives it Drill I, turns on a city dummy building, and notifies the player.",
			files: [
				snippetFile(
					"Lua/Gameplay/CityTrainedTrigger.lua",
					"lua",
					'local iTrackedUnit = GameInfoTypes.UNIT_SPEARMAN\nlocal iPromotion = GameInfoTypes.PROMOTION_DRILL_1\nlocal iDummy = GameInfoTypes.BUILDING_DUMMY_TRAINED_SPEARMAN\n\nGameEvents.CityTrained.Add(function(iPlayer, iCity, iUnit)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCity = pPlayer and pPlayer:GetCityByID(iCity)\n\tlocal pUnit = pPlayer and pPlayer:GetUnitByID(iUnit)\n\tif not pCity or not pUnit or pUnit:GetUnitType() ~= iTrackedUnit then\n\t\treturn\n\tend\n\tpUnit:SetHasPromotion(iPromotion, true)\n\tpCity:SetNumRealBuilding(iDummy, 1)\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "Your Spearman starts with Drill I.", "City Trained Trigger", pCity:GetX(), pCity:GetY())\nend)',
					"Starter “CityTrained” reaction that modifies the new unit, marks the city, and surfaces the result to the player.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.CityTrained", "game-event-citytrained-33", "gameEvents", "Primary hook for reacting right after a city completes unit training."),
			linkToSchema("Units", "Validate or filter the trained unit row before applying follow-up logic.", "rows"),
			linkToSchema("UnitPromotions", "Common follow-up payload when new units should start with or earn scripted promotions.", "rows"),
			linkToSchema("Buildings", "Useful when the trained unit should flip a city-side dummy building or other marker state.", "rows"),
			{
				label: "Promotion-On-Train / Promotion-On-Create",
				href: "/pattern-library",
				note: "Use the paired companion when the same promotion logic should also cover scripted spawns instead of only city-trained units.",
			},
		],
	},
	{
		title: "Unit Death / Prekill Payload",
		focus: "Death-trigger rewards",
		status: "Archive Pattern",
		copy: "Use this when you want something to happen before a unit is removed from the map. It is good for death rewards, cleanup, small area effects, or clearing tracked data.",
		deliverables: [
			"A “UnitPrekill” hook scaffold that only acts on the first callback while the dying unit still exists.",
			"A clean branch for yield bursts, spawned aftermath units, or cleanup of tracked data.",
			"Schema touchpoints for units, promotions, and any tables mirrored by the death effect.",
		],
		example: {
			title: "Death payout and cleanup",
			summary: "This example clears tracked state on the first callback only and only pays out if the reported killer player is usable.",
			files: [
				snippetFile(
					"Lua/Gameplay/UnitPrekillPayload.lua",
					"lua",
					'local trackedUnits = trackedUnits or {}\n\nGameEvents.UnitPrekill.Add(function(iPlayer, iUnit, iUnitType, iX, iY, bDelay, iByPlayer)\n\tif not bDelay then\n\t\treturn\n\tend\n\n\ttrackedUnits[string.format(\'%d:%d\', iPlayer, iUnit)] = nil\n\n\tif iByPlayer == -1 then\n\t\treturn\n\tend\n\n\tlocal pKiller = Players[iByPlayer]\n\tlocal pPlot = Map.GetPlot(iX, iY)\n\tif pKiller and pPlot then\n\t\tpKiller:ChangeGold(15)\n\t\tpKiller:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "A defeated enemy yielded spoils.", "Unit Prekill Payload", iX, iY)\n\tend\nend)',
					"Prekill scaffold that does its work on the live-unit callback, clears tracked state first, and treats killer resolution as optional rather than guaranteed.",
				),
			],
		},
		touchpoints: [
			linkToLua(
				"GameEvents.UnitPrekill",
				"game-event-unitprekill-86",
				"gameEvents",
				"Use prekill when the unit and its plot data still need to be resolved before removal, but gate your logic to the first callback.",
			),
			linkToSchema("Units", "Typical filter table when only some unit types should trigger the payload.", "rows"),
			linkToSchema("UnitPromotions", "Common companion table when the death logic depends on a promotion marker or death-state promotion removal.", "rows"),
			{ label: "Yield Burst Helper", href: "/pattern-library", note: "Use a small yield-burst helper when the prekill event should immediately pay out gold, culture, or similar rewards." },
		],
	},
	{
		title: "Unit Created Post-Spawn Setup",
		focus: "Spawn normalization",
		status: "Archive Pattern",
		copy: "Use this when any new unit should get setup work right after it appears. Good uses are adding a promotion, setting a name, or saving unit state for later.",
		deliverables: [
			"A “UnitCreated” hook scaffold for post-spawn setup.",
			"A safe place to seed promotions, names, and tracked state for any created unit.",
			"A handoff pattern to more specialized spawn logic when only some unit types matter.",
		],
		example: {
			title: "Normalize newly created unit state",
			summary: "This example gives every new unit Drill I and stores the turn when it was created.",
			files: [
				snippetFile(
					"Lua/Gameplay/UnitCreatedSetup.lua",
					"lua",
					"local iPromotion = GameInfoTypes.PROMOTION_DRILL_1\nlocal trackedUnits = trackedUnits or {}\n\nGameEvents.UnitCreated.Add(function(iPlayer, iUnit)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pUnit = pPlayer and pPlayer:GetUnitByID(iUnit)\n\tif not pUnit then\n\t\treturn\n\tend\n\tpUnit:SetHasPromotion(iPromotion, true)\n\ttrackedUnits[string.format('%d:%d', iPlayer, iUnit)] = { createdTurn = Game.GetGameTurn() }\nend)",
					"Shared post-spawn setup pass for newly created units before downstream gameplay logic depends on them.",
				),
			],
		},
		touchpoints: [
			{
				label: "GameEvents.UnitCreated",
				href: "/lua-api-explorer",
				note: "Use the Lua explorer to inspect the post-spawn event surface when you want a single setup pass for all created units.",
			},
			linkToSchema("Units", "Filter or compare unit rows before applying shared post-spawn setup.", "rows"),
			linkToSchema("UnitPromotions", "Common row family for the first scripted changes applied after creation.", "rows"),
			{ label: "Unit Tracking Table", href: "/pattern-library", note: "Useful companion when newly created units should be tracked for later cleanup or identity checks." },
			{
				label: "Promotion-On-Train / Promotion-On-Create",
				href: "/pattern-library",
				note: "Read this next when the same post-create promotion rules also need a training-side hook so both entry paths stay aligned.",
			},
		],
	},
	{
		title: "City Founded Initialization",
		focus: "New-city setup",
		status: "Archive Pattern",
		copy: "Use this when a new city should get setup right away. Common jobs are adding a free building, turning on a dummy proxy, or showing a first-turn notification.",
		deliverables: [
			"A “PlayerCityFounded” scaffold that resolves the founded city from the plot.",
			"Starter city-side payloads for buildings, notifications, or tracked flags.",
			"Schema touchpoints for city naming, buildings, and any founding-time tables that interact with the setup.",
		],
		example: {
			title: "Founded-city variants",
			summary: "Use one version for immediate dummy-building setup, then a second for founding-time reward initialization once the city object exists.",
			files: [
				snippetFile(
					"Lua/Gameplay/CityFoundedInit.lua",
					"lua",
					'local iDummy = GameInfoTypes.BUILDING_DUMMY_NEW_CITY_BONUS\n\nGameEvents.PlayerCityFounded.Add(function(iPlayer, iX, iY)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pPlot = Map.GetPlot(iX, iY)\n\tlocal pCity = pPlot and pPlot:GetPlotCity()\n\tif not pPlayer or not pCity then\n\t\treturn\n\tend\n\tpCity:SetNumRealBuilding(iDummy, 1)\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "Your new city starts with its bonus proxy.", pCity:GetName(), iX, iY)\nend)',
					"Founding-time initialization scaffold that stamps a city proxy and sends a setup notification immediately.",
				),
				snippetFile(
					"Lua/Gameplay/CityFoundedReward.lua",
					"lua",
					'GameEvents.PlayerCityFounded.Add(function(iPlayer, iX, iY)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pPlot = Map.GetPlot(iX, iY)\n\tlocal pCity = pPlot and pPlot:GetPlotCity()\n\tif not pPlayer or not pCity then\n\t\treturn\n\tend\n\tpPlayer:ChangeGold(25)\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "Your new city received a founding reward.", pCity:GetName(), iX, iY)\nend)',
					"Reward variant. Use this when founding should immediately pay out a one-time reward instead of only stamping persistent city state.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerCityFounded", "game-event-playercityfounded-71", "gameEvents", "Primary hook for one-time city initialization right after founding."),
			linkToSchema("Buildings", "Common city-side payload when founding should grant a dummy or free building.", "rows"),
			linkToSchema("Civilization_CityNames", "Useful when the founding setup also needs city-name aware logic or debugging.", "rows"),
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Straightforward way to surface founding-time setup to the player."),
			linkToPage("Yield Burst Helper", "/pattern-library", "Useful companion when the founding-time variant should pay out an immediate reward instead of only stamping city state."),
			{
				label: "City Capture / Found / Construct Hooks",
				href: "/pattern-library",
				note: "Go back to the lifecycle overview when the founding logic is only one branch of a wider city-event system.",
			},
		],
	},
	{
		title: "City Capture Follow-Up",
		focus: "Post-conquest cleanup",
		status: "Archive Pattern",
		copy: "Use this after a city is captured. It is a good place to remove old proxies, add new owner proxies, give a conquest reward, or show a message.",
		deliverables: [
			"A “CityCaptureComplete” scaffold that resolves the captured city from the conquest plot.",
			"A cleanup block for old owner state and a setup block for new owner state.",
			"Schema touchpoints for building proxys and city-side conquest payload tables.",
		],
		example: {
			title: "Capture follow-up variants",
			summary: "Use one version for city-state cleanup and restamping, then a second when the capture should immediately pay out a conquest reward to the new owner.",
			files: [
				snippetFile(
					"Lua/Gameplay/CityCaptureFollowUp.lua",
					"lua",
					'local iOldMarker = GameInfoTypes.BUILDING_DUMMY_OLD_OWNER_MARKER\nlocal iNewMarker = GameInfoTypes.BUILDING_DUMMY_NEW_OWNER_MARKER\n\nGameEvents.CityCaptureComplete.Add(function(iOldOwner, bIsCapital, iX, iY, iNewOwner)\n\tlocal pPlayer = Players[iNewOwner]\n\tlocal pPlot = Map.GetPlot(iX, iY)\n\tlocal pCity = pPlot and pPlot:GetPlotCity()\n\tif not pPlayer or not pCity then\n\t\treturn\n\tend\n\tpCity:SetNumRealBuilding(iOldMarker, 0)\n\tpCity:SetNumRealBuilding(iNewMarker, 1)\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "Your captured city was updated.", pCity:GetName(), iX, iY)\nend)',
					"Capture follow-up scaffold for clearing stale city proxies and applying the new owner’s conquest state.",
				),
				snippetFile(
					"Lua/Gameplay/CityCaptureReward.lua",
					"lua",
					'GameEvents.CityCaptureComplete.Add(function(iOldOwner, bIsCapital, iX, iY, iNewOwner)\n\tlocal pPlayer = Players[iNewOwner]\n\tlocal pPlot = Map.GetPlot(iX, iY)\n\tlocal pCity = pPlot and pPlot:GetPlotCity()\n\tif not pPlayer or not pCity then\n\t\treturn\n\tend\n\tpPlayer:ChangeGold(bIsCapital and 100 or 40)\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "Your conquest yielded an immediate reward.", pCity:GetName(), iX, iY)\nend)',
					"Reward variant. Use this when the important result is the conquest payout rather than only city-state cleanup.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.CityCaptureComplete", "game-event-citycapturecomplete-27", "gameEvents", "Ownership-swap hook for conquest cleanup and new-owner setup."),
			linkToSchema("Buildings", "Most post-capture cleanup uses dummy buildings or city-side state proxies.", "rows"),
			linkToSchema("BuildingClasses", "Useful when the capture logic must respect or reset a class-linked city proxy.", "rows"),
			linkToPage("Yield Burst Helper", "/pattern-library", "Useful companion when the capture follow-up includes a direct conquest payout instead of only city-state cleanup."),
			{ label: "Building Grant / Remove Lua Helper", href: "/pattern-library", note: "Useful companion when capture cleanup mostly consists of city-side building state changes." },
			{
				label: "City Capture / Found / Construct Hooks",
				href: "/pattern-library",
				note: "Go back to the lifecycle overview when capture cleanup is just one branch in a broader city hook package.",
			},
		],
	},
	{
		title: "Build Finished Trigger",
		focus: "Tile completion hooks",
		status: "Archive Pattern",
		copy: "Use this when something should happen after a worker finishes a build on a tile. Good uses are small rewards, resource reveals, or placing a follow-up effect nearby.",
		deliverables: [
			"A “BuildFinished” scaffold for plot-level improvement completion.",
			"A clear split between validating the finished improvement result and applying the resulting effect.",
			"Schema touchpoints for builds, improvements, and plot-side resources that the effect may touch.",
		],
		example: {
			title: "Reward a completed mine",
			summary: "This example dedupes the duplicate callback and gives 10 gold when a Mine improvement finishes.",
			files: [
				snippetFile(
					"Lua/Gameplay/BuildFinishedTrigger.lua",
					"lua",
					'local save = Modding.OpenSaveData()\nlocal iMine = GameInfoTypes.IMPROVEMENT_MINE\n\nGameEvents.BuildFinished.Add(function(iPlayer, iX, iY, eImprovement)\n\tif eImprovement ~= iMine then\n\t\treturn\n\tend\n\n\tlocal sKey = string.format("BuildFinished_%d_%d_%d_%d_%d", Game.GetGameTurn(), iPlayer, iX, iY, eImprovement)\n\tif save:GetValue(sKey) then\n\t\treturn\n\tend\n\tsave:SetValue(sKey, 1)\n\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pPlot = Map.GetPlot(iX, iY)\n\tif not pPlayer or not pPlot then\n\t\treturn\n\tend\n\tpPlayer:ChangeGold(10)\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "A finished build yielded a bonus.", "Build Finished Trigger", iX, iY)\nend)',
					"Tile-completion reaction that keys off the finished improvement row and defensively dedupes the hook before paying out the reward.",
				),
			],
		},
		touchpoints: [
			linkToLua(
				"GameEvents.BuildFinished",
				"game-event-buildfinished-1",
				"gameEvents",
				"Primary hook for reacting when a finished improvement result lands on the plot, but remember it can fire twice.",
			),
			linkToSchema("Builds", "Cross-check the originating worker action here when the finished improvement row alone is not enough context.", "rows"),
			linkToSchema("Improvements", "Primary filter table because the hook reports the finished improvement row now on the plot.", "rows"),
			linkToSchema("Resources", "Common follow-up when build completion should reveal or place a nearby resource.", "rows"),
			linkToLua("Plot:SetResourceType", "plot-setresourcetype-179", "methods", "Useful follow-up when the finished build should reveal or place a resource directly onto the plot."),
			linkToPage(
				"Plot Search Pattern",
				"/pattern-library?pattern=plot-search-pattern",
				"Best companion when the build reward needs to search for a nearby legal plot instead of mutating the finished tile directly.",
			),
			linkToPage("Map Viewer", "/map-viewer", "Helpful when the finished-build mechanic depends on terrain, features, resources, or start-region context."),
		],
	},
	{
		title: "Policy Adoption Trigger",
		focus: "Scripted policy rewards",
		status: "Archive Pattern",
		copy: "Use this when adopting a policy should do more than the database rows can handle. Good uses are one-time rewards, free units, cooldown stamps, or notifications.",
		deliverables: [
			"A “PlayerAdoptPolicy” and “PlayerAdoptPolicyBranch” scaffold with clean filtering.",
			"A one-time reward branch for units, dummy buildings, or yield bursts.",
			"Schema touchpoints for the policy, branch, and policy-side payload tables involved.",
		],
		example: {
			title: "Reward a specific policy adoption",
			summary: "Use the first handler for one policy row and the second when the reward should come from opening the branch itself.",
			files: [
				snippetFile(
					"Lua/Gameplay/PolicyAdoptionTrigger.lua",
					"lua",
					'local iPolicy = GameInfoTypes.POLICY_OLIGARCHY\n\nGameEvents.PlayerAdoptPolicy.Add(function(iPlayer, iPolicyType)\n\tif iPolicyType ~= iPolicy then\n\t\treturn\n\tend\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tif not pPlayer or not pCapital then\n\t\treturn\n\tend\n\tpPlayer:ChangeGold(50)\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "Oligarchy granted 50 gold.", "Policy Adopted", pCapital:GetX(), pCapital:GetY())\nend)',
					"Policy-adoption scaffold for one-time scripted rewards that complement the database-side policy tables.",
				),
				snippetFile(
					"Lua/Gameplay/PolicyBranchTrigger.lua",
					"lua",
					'local iHonorBranch = GameInfoTypes.POLICY_BRANCH_HONOR\n\nGameEvents.PlayerAdoptPolicyBranch.Add(function(iPlayer, iBranchType)\n\tif iBranchType ~= iHonorBranch then\n\t\treturn\n\tend\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tif not pPlayer or not pCapital then\n\t\treturn\n\tend\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "Honor opened a branch-level reward.", "Policy Branch Adopted", pCapital:GetX(), pCapital:GetY())\nend)',
					"Branch-level counterpart for the cases where the reward should fire from opening the policy tree rather than taking one specific policy row.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerAdoptPolicy", "game-event-playeradoptpolicy-58", "gameEvents", "Main hook for one-off scripted reactions to policy adoption."),
			linkToLua(
				"GameEvents.PlayerAdoptPolicyBranch",
				"game-event-playeradoptpolicybranch-59",
				"gameEvents",
				"Use the branch-level hook when the reward should fire from unlocking the branch rather than a specific policy.",
			),
			linkToSchema("Policies", "Core policy row to filter against before applying any scripted reward.", "rows"),
			linkToSchema("PolicyBranchTypes", "Branch table behind branch-level scripted rewards.", "rows"),
		],
	},
	{
		title: "Great Person Expended Reaction",
		focus: "GP aftermath",
		status: "Archive Pattern",
		copy: "Use this when spending a Great Person should also trigger a second effect. Good uses are extra rewards, saved state, or a follow-up notification that does not need the exact map tile.",
		deliverables: [
			"A “GreatPersonExpended” scaffold that resolves the expended unit row from the hook payload.",
			"A branch for post-expended rewards, notifications, or saved state updates.",
			"A reminder to pair the hook with UnitPrekill when the followup effect really needs map location.",
		],
		example: {
			title: "Reward a Great Person expenditure",
			summary: "This example gives Golden Age points when a Great Engineer is used and anchors the notification on the capital because the hook does not provide location data.",
			files: [
				snippetFile(
					"Lua/Gameplay/GreatPersonExpendedReaction.lua",
					"lua",
					'local iGreatEngineer = GameInfoTypes.UNIT_ENGINEER\n\nGameEvents.GreatPersonExpended.Add(function(iPlayer, eUnit)\n\tif eUnit ~= iGreatEngineer then\n\t\treturn\n\tend\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tif not pPlayer then\n\t\treturn\n\tend\n\tpPlayer:ChangeGoldenAgeProgressMeter(100)\n\tif pCapital then\n\t\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "A Great Person triggered a follow-up reward.", "Great Person Expended", pCapital:GetX(), pCapital:GetY())\n\tend\nend)',
					"Expended-unit reaction scaffold for one-time GP aftermath rewards that only need the player and expended unit row, not the consumed unit's exact tile.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.GreatPersonExpended", "game-event-greatpersonexpended-48", "gameEvents", "Primary hook for scripted aftermath once a Great Person is consumed."),
			linkToLua("GameEvents.UnitPrekill", "game-event-unitprekill-86", "gameEvents", "Pair this with prekill when the expended-unit effect truly needs plot or unit-instance data."),
			linkToSchema("Units", "Filter against the specific Great Person unit rows that should trigger the reaction.", "rows"),
			linkToSchema("UnitClasses", "Useful when the scripted reward should care about GP class rather than one exact unit row.", "rows"),
			linkToSchema("Specialists", "Companion surface when the GP mechanic also mirrors specialist-side rate or city-state logic.", "rows"),
		],
	},
	{
		title: "Golden Age Active Effect Sync",
		focus: "Golden Age only effects",
		status: "High-Use Recipe",
		copy: "Use this when a bonus should exist only while the player is currently inside a Golden Age. The common pattern is to check `GetGoldenAgeTurns() > 0`, sync a hidden city-side carrier while the state is active, and remove it cleanly as soon as the Golden Age ends.",
		deliverables: [
			"A recurring Golden Age state check with one clear helper that decides whether the effect should be on or off.",
			"A city-side sync loop that grants and removes the hidden payload without stacking duplicates.",
			"Schema touchpoints for the hidden building row and the effect tables that actually carry the temporary bonus.",
		],
		example: {
			title: "Turn on a Golden Age only city bonus",
			summary: "This example grants a hidden building to every owned city only while the player has Golden Age turns remaining.",
			files: [
				snippetFile(
					"SQL/Buildings/GoldenAgeCarrier.sql",
					"sql",
					"INSERT INTO BuildingClasses (Type, DefaultBuilding, Description)\nVALUES\n\t('BUILDINGCLASS_CMC_GOLDEN_AGE_STUDIO_DUMMY', 'BUILDING_CMC_GOLDEN_AGE_STUDIO_DUMMY', 'TXT_KEY_BUILDING_CMC_GOLDEN_AGE_STUDIO_DUMMY');\n\nINSERT INTO Buildings\n\t(Type, BuildingClass, Cost, FaithCost, GreatWorkCount, NeverCapture, NukeImmune, ConquestProb, Description, Help)\nVALUES\n\t('BUILDING_CMC_GOLDEN_AGE_STUDIO_DUMMY', 'BUILDINGCLASS_CMC_GOLDEN_AGE_STUDIO_DUMMY', -1, -1, -1, 1, 1, 0, 'TXT_KEY_BUILDING_CMC_GOLDEN_AGE_STUDIO_DUMMY', 'TXT_KEY_BUILDING_CMC_GOLDEN_AGE_STUDIO_DUMMY_HELP');\n\nINSERT INTO Building_YieldChanges (BuildingType, YieldType, Yield)\nVALUES\n\t('BUILDING_CMC_GOLDEN_AGE_STUDIO_DUMMY', 'YIELD_CULTURE', 2);",
					"Minimal hidden carrier for a Golden Age-only city bonus. Keep the class dedicated so the sync logic always resolves the intended row.",
				),
				snippetFile(
					"Lua/Gameplay/GoldenAgeEffectSync.lua",
					"lua",
					"local iDummy = GameInfoTypes.BUILDING_CMC_GOLDEN_AGE_STUDIO_DUMMY\n\nlocal function syncGoldenAgeCityEffects(pPlayer)\n\tif not pPlayer or not pPlayer:IsAlive() or pPlayer:IsMinorCiv() or pPlayer:IsBarbarian() then\n\t\treturn\n\tend\n\tlocal shouldHaveBonus = pPlayer:GetGoldenAgeTurns() > 0\n\tfor pCity in pPlayer:Cities() do\n\t\tpCity:SetNumRealBuilding(iDummy, shouldHaveBonus and 1 or 0)\n\tend\nend\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tsyncGoldenAgeCityEffects(Players[iPlayer])\nend)",
					"Recurring state sync for temporary Golden Age bonuses. This is the safe pattern when the effect must disappear immediately after the Golden Age ends.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Reliable recurring hook for checking whether the player is currently in a Golden Age."),
			linkToSchema("Buildings", "Hidden carriers for Golden Age-only city effects still need a valid building row.", "rows"),
			linkToSchema("Building_YieldChanges", "One example payload table for the temporary effect once the hidden carrier is present.", "rows"),
			linkToPage("Dynamic Dummy Building Updater", "/pattern-library", "Closest companion when the temporary bonus depends on more city state than only Golden Age status."),
		],
	},
	{
		title: "Golden Age Progress Meter Reward",
		focus: "Granting Golden Age points",
		status: "High-Use Recipe",
		copy: "Use this when a unique ability, building, or scripted trigger should add Golden Age points to the progress meter instead of directly starting a Golden Age. The key is to isolate one event as the reward handoff point and call `ChangeGoldenAgeProgressMeter` there.",
		deliverables: [
			"A narrow reward hook that filters the exact event or object that should pay out Golden Age points.",
			"A reusable helper for adding Golden Age meter progress and anchoring a notification to the relevant city or plot.",
			"Schema touchpoints for the building, unit, or other row that represents the unique reward source.",
		],
		example: {
			title: "Grant Golden Age points from a completed unique building",
			summary: "This example adds 75 Golden Age points when a tracked building finishes construction in one of your cities.",
			files: [
				snippetFile(
					"Lua/Gameplay/GoldenAgeProgressReward.lua",
					"lua",
					'local iRewardBuilding = GameInfoTypes.BUILDING_CMC_SOLAR_COURT\nlocal iRewardAmount = 75\n\nlocal function grantGoldenAgeProgress(pPlayer, pCity, amount)\n\tif not pPlayer or not pCity or amount <= 0 then\n\t\treturn\n\tend\n\tpPlayer:ChangeGoldenAgeProgressMeter(amount)\n\tpPlayer:AddNotification(\n\t\tNotificationTypes.NOTIFICATION_GENERIC,\n\t\tstring.format(\"%s granted %i Golden Age points.\", pCity:GetName(), amount),\n\t\t\"Golden Age Progress\",\n\t\tpCity:GetX(),\n\t\tpCity:GetY()\n\t)\nend\n\nGameEvents.CityConstructed.Add(function(iPlayer, iCity, eBuilding)\n\tif eBuilding ~= iRewardBuilding then\n\t\treturn\n\tend\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCity = pPlayer and pPlayer:GetCityByID(iCity)\n\tgrantGoldenAgeProgress(pPlayer, pCity, iRewardAmount)\nend)',
					"Focused Golden Age point reward pattern for uniques that should fill the meter when a tracked building, project, or other event resolves.",
				),
			],
		},
		touchpoints: [
			{ label: "GameEvents.CityConstructed", href: "/lua-api-explorer", note: "Preferred building-complete hook when a unique structure should award Golden Age progress." },
			linkToSchema("Buildings", "Track the exact building row that should award Golden Age points.", "rows"),
			linkToPage("Great Person Expended Reaction", "/pattern-library", "Closest companion when the reward source is a spent Great Person instead of a city-side event."),
			linkToPage("Notification Utility Wrapper", "/pattern-library", "Useful follow-up when multiple Golden Age progress sources should reuse the same notification helper."),
		],
	},
	{
		title: "Tourism Yield Wiring",
		focus: "YIELD_TOURISM effects",
		status: "High-Use Recipe",
		copy: "Use this when a building, improvement, or other content row should directly grant Tourism through the normal yield tables. Tourism does not need a dummy building just because it is a late-game yield; in many cases the regular building-side or improvement-side yield tables are the right place to start.",
		deliverables: [
			"A direct building Tourism example using `Building_YieldChanges`.",
			"A direct improvement Tourism example using `Improvement_Yields`.",
			"Schema touchpoints for the rows that own the Tourism output and the table that actually stores the yield payload.",
		],
		example: {
			title: "Tourism on a building and landmark-style improvement",
			summary: "This example adds Tourism directly through the yield tables instead of routing it through a separate hidden carrier.",
			files: [
				snippetFile(
					"SQL/Tourism/DirectTourismYields.sql",
					"sql",
					"INSERT INTO Building_YieldChanges (BuildingType, YieldType, Yield)\nVALUES\n\t('BUILDING_MUSEUM', 'YIELD_TOURISM', 2);\n\nINSERT INTO Improvement_Yields (ImprovementType, YieldType, Yield)\nVALUES\n\t('IMPROVEMENT_LANDMARK', 'YIELD_TOURISM', 1);",
					"Starter Tourism-yield patch showing the two most common places to attach direct Tourism output: buildings and improvements.",
				),
				snippetFile(
					"XML/Text/DirectTourismYieldsText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_BUILDING_CMC_MUSEUM_HELP" Text="[COLOR_POSITIVE_TEXT]+2[ENDCOLOR] [ICON_TOURISM] Tourism from the building itself." />\n\t\t<Row Tag="TXT_KEY_CMC_LANDMARK_TOURISM_NOTE" Text="[ICON_BULLET] Landmarks can also carry direct Tourism through Improvement_Yields." />\n\t</Language_en_US>\n</GameData>',
					"Optional text-side reminder that the player-facing help should match the Tourism rows you just added.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Building_YieldChanges", "Most direct building-side Tourism patches live here.", "rows"),
			linkToSchema("Improvement_Yields", "Most direct improvement-side Tourism patches live here.", "rows"),
			linkToSchema("Buildings", "The building row still owns the description, prerequisites, and the visible player-facing identity.", "rows"),
			linkToSchema("Improvements", "Use the improvement row when Tourism belongs on a tile itself rather than on a city building.", "rows"),
		],
	},
	{
		title: "Direct Tile Yield Tables",
		focus: "Plot yields without dummy buildings",
		status: "High-Use Recipe",
		copy: "Use this when the tile itself should change during gameplay and the effect should live on the plot rather than on a city dummy building. Database rows define the baseline improvement, but runtime changes need Lua. The main pattern is to resolve the plot, decide what its bonus should be right now, and write that value with `Game.SetPlotExtraYield`.",
		deliverables: [
			"A build finished scaffold for applying a new extra yield directly to the finished plot.",
			"A percent-based yield scaler that reads the tile's current output and writes an extra amount back onto the same plot.",
			"A resync pattern reminder so the plot bonus can be recalculated if the improvement is removed, pillaged, or otherwise changes state later.",
		],
		example: {
			title: "Apply runtime tile yields to a unique improvement",
			summary:
				"The first file adds a new Tourism yield directly to plots that finish your unique improvement. The second file scales the plot's current Culture yield by 50% and writes the extra amount back onto that same tile.",
			files: [
				snippetFile(
					"Lua/Gameplay/UniqueImprovementExtraYield.lua",
					"lua",
					"local iImprovement = GameInfoTypes.IMPROVEMENT_CMC_SUN_GARDEN\nlocal iTourism = YieldTypes.YIELD_TOURISM\nlocal iTourismBonus = 2\n\nlocal function applyUniqueImprovementBonus(pPlot)\n\tif not pPlot then\n\t\treturn\n\tend\n\n\tlocal iX = pPlot:GetX()\n\tlocal iY = pPlot:GetY()\n\tif pPlot:GetImprovementType() == iImprovement and not pPlot:IsImprovementPillaged() then\n\t\tGame.SetPlotExtraYield(iX, iY, iTourism, iTourismBonus)\n\telse\n\t\tGame.SetPlotExtraYield(iX, iY, iTourism, 0)\n\tend\nend\n\nGameEvents.BuildFinished.Add(function(iPlayer, iX, iY, eImprovement)\n\tif eImprovement ~= iImprovement then\n\t\treturn\n\tend\n\tapplyUniqueImprovementBonus(Map.GetPlot(iX, iY))\nend)",
					"Runtime plot-yield grant for a unique improvement that keys off the finished improvement row. The write is idempotent, so the duplicate callback just rewrites the same tile state safely.",
				),
				snippetFile(
					"Lua/Gameplay/UniqueImprovementPercentYield.lua",
					"lua",
					"local iImprovement = GameInfoTypes.IMPROVEMENT_CMC_SUN_GARDEN\nlocal iYield = YieldTypes.YIELD_CULTURE\nlocal iPercent = 50\n\nlocal function syncPercentYieldBonus(pPlot)\n\tif not pPlot then\n\t\treturn\n\tend\n\n\tlocal iX = pPlot:GetX()\n\tlocal iY = pPlot:GetY()\n\tGame.SetPlotExtraYield(iX, iY, iYield, 0)\n\n\tif pPlot:GetImprovementType() ~= iImprovement or pPlot:IsImprovementPillaged() then\n\t\treturn\n\tend\n\n\tlocal iBaseYield = pPlot:GetYield(iYield)\n\tlocal iExtraYield = math.floor(iBaseYield * iPercent / 100)\n\tGame.SetPlotExtraYield(iX, iY, iYield, iExtraYield)\nend\n\nGameEvents.BuildFinished.Add(function(iPlayer, iX, iY, eImprovement)\n\tif eImprovement == iImprovement then\n\t\tsyncPercentYieldBonus(Map.GetPlot(iX, iY))\n\tend\nend)\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tif not pPlayer or not pPlayer:IsAlive() then\n\t\treturn\n\tend\n\tfor pCity in pPlayer:Cities() do\n\t\tfor i = 0, pCity:GetNumCityPlots() - 1 do\n\t\t\tlocal pPlot = pCity:GetCityIndexPlot(i)\n\t\t\tif pPlot and pPlot:GetOwner() == iPlayer and pPlot:GetImprovementType() == iImprovement then\n\t\t\t\tsyncPercentYieldBonus(pPlot)\n\t\t\tend\n\t\tend\n\tend\nend)",
					"Percent-based plot-yield scaler that clears the previous extra yield first, reads the current Culture output, and then writes the recalculated bonus back onto the tile. The turn sync keeps it accurate if other effects change the underlying tile output later.",
				),
			],
		},
		touchpoints: [
			linkToLua("Game.SetPlotExtraYield", "game-setplotextrayield-251", "methods", "Primary runtime API for writing a plot-local extra yield directly onto the map tile."),
			linkToLua("Plot:GetYield", "plot-getyield-90", "methods", "Use this when the runtime bonus should scale from the tile's current output instead of using a flat amount."),
			linkToLua(
				"GameEvents.BuildFinished",
				"game-event-buildfinished-1",
				"gameEvents",
				"Natural first hook when the effect should appear as soon as the unique improvement result lands on the map.",
			),
			linkToSchema("Improvements", "The improvement row still defines which tile state should receive the scripted runtime yield.", "rows"),
			linkToSchema("Builds", "Cross check Builds only when the worker action matters separately from the finished improvement result.", "rows"),
		],
	},
	{
		title: "Unit Movement / Entered Tile Trigger",
		focus: "Movement-driven mechanics",
		status: "Archive Pattern",
		copy: "Use this when you want a unit entering a tile to trigger an effect. Good uses are terrain rewards, fort checks, border checks, discoveries, or scripted danger zones.",
		deliverables: [
			"A “UnitSetXY” scaffold with plot resolution and fast early exits.",
			"A clean predicate path for improvements, resources, owner checks, or region checks.",
			"A handoff pattern for movement rewards, discoveries, or status effects.",
		],
		example: {
			title: "Reward entering a target improvement",
			summary: "This example gives 5 gold when one of your units walks onto a Fort tile.",
			files: [
				snippetFile(
					"Lua/Gameplay/UnitSetXYTrigger.lua",
					"lua",
					'local iTargetImprovement = GameInfoTypes.IMPROVEMENT_FORT\n\nGameEvents.UnitSetXY.Add(function(iPlayer, iUnit, iX, iY)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pPlot = Map.GetPlot(iX, iY)\n\tif not pPlayer or not pPlot or pPlot:GetImprovementType() ~= iTargetImprovement then\n\t\treturn\n\tend\n\tpPlayer:ChangeGold(5)\n\tpPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "A unit entered a tracked tile.", "Entered Tile Trigger", iX, iY)\nend)',
					"Movement-trigger scaffold that keys off the entered plot and a specific improvement before applying the effect.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.UnitSetXY", "game-event-unitsetxy-88", "gameEvents", "Primary movement hook for tile-entry mechanics."),
			linkToSchema("Improvements", "Common filter table when movement effects care about forts, customs houses, or other improvements.", "rows"),
			linkToSchema("Resources", "Useful when a movement effect should only trigger on or near specific resource plots.", "rows"),
			{ label: "Distance + Closest Resolver", href: "/pattern-library", note: "Good companion when the movement effect also needs nearby-city or nearest-target checks." },
		],
	},
	{
		title: "Promotion-On-Train / Promotion-On-Create",
		focus: "New-unit promotion routing",
		status: "Archive Pattern",
		copy: "Use this when new units should start with the same scripted promotion whether they were trained in a city or spawned by Lua.",
		deliverables: [
			"A paired train/create promotion scaffold.",
			"A narrow place to resolve the promotion from unit type, combat class, or owner state.",
			"Schema touchpoints for promotion rows and unit-side free-promotion tables.",
		],
		example: {
			title: "Seed promotions on train or create",
			summary: "This example gives Drill I to new units from both city training and Lua-created spawns.",
			files: [
				snippetFile(
					"Lua/Gameplay/PromotionOnNewUnit.lua",
					"lua",
					"local iPromotion = GameInfoTypes.PROMOTION_DRILL_1\n\nlocal function applyNewUnitPromotion(pPlayer, pUnit)\n\tif not pPlayer or not pUnit then\n\t\treturn\n\tend\n\tpUnit:SetHasPromotion(iPromotion, true)\nend\n\nGameEvents.CityTrained.Add(function(iPlayer, iCity, iUnit)\n\tlocal pPlayer = Players[iPlayer]\n\tapplyNewUnitPromotion(pPlayer, pPlayer and pPlayer:GetUnitByID(iUnit))\nend)\n\nGameEvents.UnitCreated.Add(function(iPlayer, iUnit)\n\tlocal pPlayer = Players[iPlayer]\n\tapplyNewUnitPromotion(pPlayer, pPlayer and pPlayer:GetUnitByID(iUnit))\nend)",
					"Shared helper for seeding a promotion onto new units regardless of whether they were trained or scripted into existence.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.CityTrained", "game-event-citytrained-33", "gameEvents", "Training-side hook for new-unit promotion setup."),
			{ label: "GameEvents.UnitCreated", href: "/lua-api-explorer", note: "Creation-side hook when scripted units should receive the same starting promotion logic." },
			linkToSchema("UnitPromotions", "Core promotion rows referenced by the initial seeding logic.", "rows"),
			linkToSchema("Unit_FreePromotions", "Helpful comparison surface when the same effect could be handled in data instead of Lua.", "rows"),
			{
				label: "City Trained Trigger",
				href: "/pattern-library",
				note: "Read the training-only companion when the follow-up work should stay tied to city production instead of all creation paths.",
			},
			{
				label: "Unit Created Post-Spawn Setup",
				href: "/pattern-library",
				note: "Read the spawn-side companion when scripted units need the same normalization pass after they appear.",
			},
			{
				label: "Promotion Grant / Strip Logic",
				href: "/pattern-library",
				note: "Use the grant-or-strip companion when the promotion should depend on live state instead of being seeded once and left alone.",
			},
		],
	},
	{
		title: "Notification Utility Wrapper",
		focus: "Reusable player feedback",
		status: "Utility Pattern",
		copy: "Use one helper for notifications so your gameplay files do not repeat the same local-versus-global checks every time. It also helps with met-only messages and popup alerts.",
		deliverables: [
			"A local/global notification helper with met-only filtering.",
			"Optional serial message handling for more visible alerts.",
			"A clean call surface that gameplay files can reuse instead of duplicating notification boilerplate.",
		],
		example: {
			title: "Local or world notification helper",
			summary: "The first file is the shared helper. The second file shows a real use: telling the human player when the capital gets a free reward.",
			files: [
				snippetFile(
					"Lua/Utilities/NotificationUtils.lua",
					"lua",
					"function Player.SendNotification(player, notificationType, description, descriptionShort, global, data1, data2, unitID, data3, metOnly, includesSerialMessage)\n\tlocal notificationID = NotificationTypes[notificationType]\n\tlocal teamID = player:GetTeam()\n\tdata1 = data1 or -1\n\tdata2 = data2 or -1\n\tunitID = unitID or -1\n\tdata3 = data3 or -1\n\tif global then\n\t\tif (metOnly and Teams[Game.GetActiveTeam()]:IsHasMet(teamID)) or (not metOnly) then\n\t\t\tPlayers[Game.GetActivePlayer()]:AddNotification(notificationID, description, descriptionShort, data1, data2, unitID, data3)\n\t\t\tif includesSerialMessage and description then\n\t\t\t\tEvents.GameplayAlertMessage(description)\n\t\t\tend\n\t\tend\n\telse\n\t\tif not player:IsHuman() then\n\t\t\treturn\n\t\tend\n\t\tif (metOnly and Teams[Game.GetActiveTeam()]:IsHasMet(teamID)) or (not metOnly) then\n\t\t\tplayer:AddNotification(notificationID, description, descriptionShort, data1, data2, unitID, data3)\n\t\t\tif includesSerialMessage and description then\n\t\t\t\tEvents.GameplayAlertMessage(description)\n\t\t\tend\n\t\tend\n\tend\nend",
					"Archive-style wrapper that consolidates local notifications, world-style notifications, met-only visibility, and optional serial alert messages.",
				),
				snippetFile(
					"Lua/Gameplay/NotificationExample.lua",
					"lua",
					'include("NotificationUtils")\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tif not pPlayer or not pCapital or not pPlayer:IsHuman() then\n\t\treturn\n\tend\n\tPlayer.SendNotification(pPlayer, "NOTIFICATION_GENERIC", "Your capital got a small bonus this turn.", pCapital:GetName(), false, pCapital:GetX(), pCapital:GetY())\nend)',
					"Real use example: a turn-based capital message using the shared helper instead of calling “AddNotification” directly in every file.",
				),
			],
		},
		touchpoints: [
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Underlying notification call the wrapper should centralize."),
			{
				label: "Localized Building + Notification Text",
				href: "/pattern-library",
				note: "Notification helpers are much cleaner when their text keys, markup, and coordinates are already wired cleanly.",
			},
			{
				label: "Cooldown + Notification Combo",
				href: "/pattern-library",
				note: "Use the combined companion when the notification should only appear after a persisted cooldown or once-per-turn guard passes.",
			},
		],
	},
	{
		title: "Trait Helper / IsTraitActive",
		focus: "Trait-aware scripting",
		status: "Utility Pattern",
		copy: "Use one helper for trait checks so your gameplay files can simply ask if a player has a trait or if any civ in the game is using that trait.",
		deliverables: [
			"A per-player “HasTrait” helper.",
			"A game-wide “IsTraitActive” helper that scans major-civ slots.",
			"A single place to absorb CP-style “Player:HasTrait” support when present.",
		],
		example: {
			title: "Trait utility pair",
			summary: "The first file is the helper. The second file shows a real use: only players with a seafaring trait get a small coastal turn bonus.",
			files: [
				snippetFile(
					"Lua/Utilities/TraitUtils.lua",
					"lua",
					'function HasTrait(player, traitID)\n\tif player:IsMinorCiv() or player:IsBarbarian() then\n\t\treturn false\n\tend\n\tif Player.HasTrait then\n\t\treturn player:HasTrait(traitID)\n\tend\n\tlocal leaderType = GameInfo.Leaders[player:GetLeaderType()].Type\n\tlocal traitType = GameInfo.Traits[traitID].Type\n\tfor row in GameInfo.Leader_Traits("LeaderType = \'" .. leaderType .. "\' AND TraitType = \'" .. traitType .. "\'") do\n\t\treturn true\n\tend\n\treturn false\nend\n\nfunction IsTraitActive(traitID)\n\tfor slotID = 0, GameDefines.MAX_MAJOR_CIVS - 1 do\n\t\tlocal slotPlayer = Players[slotID]\n\t\tlocal slotStatus = PreGame.GetSlotStatus(slotID)\n\t\tif (slotStatus == SlotStatus.SS_TAKEN or slotStatus == SlotStatus.SS_COMPUTER) and HasTrait(slotPlayer, traitID) then\n\t\t\treturn true\n\t\tend\n\tend\n\treturn false\nend',
					"Archive-style trait helpers for local player checks and game-wide trait-presence checks.",
				),
				snippetFile(
					"Lua/Gameplay/TraitHelperExample.lua",
					"lua",
					'include("TraitUtils")\nlocal iTrait = GameInfoTypes.TRAIT_SEAFARING\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tif not pPlayer or not pCapital or not HasTrait(pPlayer, iTrait) or not pCapital:IsCoastal(10) then\n\t\treturn\n\tend\n\tpPlayer:ChangeGold(5)\nend)',
					"Real use example: a trait check that gives 5 gold when a civ with a seafaring-style trait has a coastal capital.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Traits", "Central trait rows that the helper resolves against.", "rows"),
			linkToSchema("Leader_Traits", "Join table behind fallback trait resolution when “Player:HasTrait” is unavailable.", "rows"),
			linkToSchema("Civilization_Leaders", "Useful when tracing the trait all the way through the civ package during debugging.", "rows"),
			{ label: "Trait Driven Lua Effect", href: "/pattern-library", note: "Use the helper recipe first, then plug it into recurring or event-driven trait mechanics." },
			{
				label: "Free Promotion From Building / Policy / Trait",
				href: "/pattern-library",
				note: "Use the promotion-source companion when the trait check is only one branch in a wider building, policy, or trait grant rule.",
			},
		],
	},
	{
		title: "Mod Detection / Compatibility Toggle",
		focus: "Active-mod awareness",
		status: "Utility Pattern",
		copy: "Use this when part of your mod should only run if another mod is active. It keeps compatibility code in one place and avoids silent failures.",
		deliverables: [
			"Helpers that scan “Modding.GetActivatedMods()” for known IDs.",
			"A clean branch point for compatibility-only SQL, Lua, or UI behavior.",
			"A safer alternative to assuming CP, VMC, or other ecosystem mods are always present.",
		],
		example: {
			title: "Activated-mod detection helpers",
			summary: "The first file checks if a mod is active. The second file shows a real use: only run a bonus if Community Patch is loaded.",
			files: [
				snippetFile(
					"Lua/Utilities/CompatibilityToggles.lua",
					"lua",
					"local function isModActive(modID)\n\tfor _, mod in pairs(Modding.GetActivatedMods()) do\n\t\tif mod.ID == modID then\n\t\t\treturn true\n\t\tend\n\tend\n\treturn false\nend\n\nfunction Game_IsCPActive()\n\treturn isModActive('d1b6328c-ff44-4b0d-aad7-c657f83610cd')\nend\n\nfunction Game_IsVMCActive()\n\treturn isModActive('d1b6328c-ff44-4b0d-aad7-c657f83610cd')\nend",
					"Archive-style compatibility toggle helper for activated-mod checks before integration logic runs.",
				),
				snippetFile(
					"Lua/Gameplay/CompatibilityExample.lua",
					"lua",
					'include("CompatibilityToggles")\n\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tif not Game_IsCPActive() then\n\t\treturn\n\tend\n\tlocal pPlayer = Players[iPlayer]\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tif pPlayer and pCapital then\n\t\tpPlayer:ChangeGold(1)\n\tend\nend)',
					"Real use example: only give the tiny turn bonus when Community Patch is active.",
				),
			],
		},
		touchpoints: [
			{ label: ".modinfo Builder", href: "/modinfo-builder", note: "Compatibility toggles should stay aligned with your declared dependencies and references." },
			{
				label: "Compatibility Pack / Reference-Heavy ModInfo",
				href: "/pattern-library",
				note: "Use a heavy “.modinfo” recipe when the compatibility layer also needs References, Dependencies, or Blocks.",
			},
			{
				label: "Mod Configuration Toggle",
				href: "/pattern-library",
				note: "Pair it with the config toggle companion when activation should depend on both another mod being present and a local feature flag being enabled.",
			},
		],
	},
	{
		title: "Fastest / Strongest Trainable Unit Resolver",
		focus: "Dynamic unit selection",
		status: "Utility Pattern",
		copy: "Use this when you want the game to pick the best unit the player can train right now instead of always using one fixed unit type.",
		deliverables: [
			"A “fastest” resolver keyed by “Moves” and “CanTrain”.",
			"A “strongest” resolver keyed by “Combat” and “CanTrain”.",
			"A shared pattern for filtering by one or more combat classes and optionally ignoring resources.",
		],
		example: {
			title: "Pick the best current military unit",
			summary: "The first file finds the best unit. The second file shows a real use: spawn the strongest melee unit in the capital.",
			files: [
				snippetFile(
					"Lua/Utilities/TrainableUnitResolvers.lua",
					"lua",
					'function GetFastestMilitaryUnit(pPlayer, bIgnoreResources, ...)\n\tlocal best = { Moves = 0 }\n\tfor _, combatType in pairs(arg) do\n\t\tfor row in GameInfo.Units("CombatClass = \'" .. combatType .. "\'") do\n\t\t\tif pPlayer:CanTrain(row.ID, bIgnoreResources) and row.Moves > best.Moves then\n\t\t\t\tbest = row\n\t\t\tend\n\t\tend\n\tend\n\treturn best.ID\nend\n\nfunction GetStrongestMilitaryUnit(pPlayer, bIgnoreResources, ...)\n\tlocal best = { Combat = 0 }\n\tfor _, combatType in pairs(arg) do\n\t\tfor row in GameInfo.Units("CombatClass = \'" .. combatType .. "\'") do\n\t\t\tif pPlayer:CanTrain(row.ID, bIgnoreResources) and row.Combat > best.Combat then\n\t\t\t\tbest = row\n\t\t\tend\n\t\tend\n\tend\n\treturn best.ID\nend',
					"Archive-style runtime resolver for fastest or strongest currently trainable military units by combat class.",
				),
				snippetFile(
					"Lua/Gameplay/TrainableUnitResolverExample.lua",
					"lua",
					'include("TrainableUnitResolvers")\n\nlocal function spawnBestMeleeUnit(pPlayer)\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tif not pCapital then\n\t\treturn\n\tend\n\tlocal iUnitType = GetStrongestMilitaryUnit(pPlayer, true, "UNITCOMBAT_MELEE")\n\tif iUnitType then\n\t\tpPlayer:InitUnit(iUnitType, pCapital:GetX(), pCapital:GetY())\n\tend\nend',
					"Real use example: choose the strongest trainable melee unit and spawn it in the capital.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerCanTrain", "game-event-playercantrain-70", "gameEvents", "Useful companion when the best trainable unit also depends on scripted veto or allowance logic."),
			linkToSchema("Units", "Primary candidate pool when resolving the best current unit.", "rows"),
			linkToSchema("UnitCombatInfos", "Useful when the resolver should stay scoped to specific combat classes.", "rows"),
			{ label: "Unit Spawn Workflow", href: "/pattern-library", note: "Natural consumer when the resolved unit should be spawned as a reward instead of only inspected." },
		],
	},
	{
		title: "Great Person Rate Calculator",
		focus: "GP modifier math",
		status: "Utility Pattern",
		copy: "Use one helper to add up Great Person rate bonuses instead of rebuilding that math in several files. This is useful when you want to inspect or display GP progress.",
		deliverables: [
			"A helper that gathers player-wide and city-wide GP rate modifiers.",
			"Branch points for GP type specific modifiers such as writers, engineers, or scientists.",
			"A cleaner base for later mechanics that need to inspect or display GP generation state.",
		],
		example: {
			title: "Summarize a GP rate modifier stack",
			summary: "The first file gathers the GP rate bonus. The second file shows a real use: print the Engineer rate bonus in the capital.",
			files: [
				snippetFile(
					"Lua/Utilities/GreatPersonRateCalculator.lua",
					"lua",
					"function City_GetGreatPeopleUnitRateModifier(pPlayer, pCity, pSpecialistInfo)\n\tlocal iPlayerMod = pPlayer:GetGreatPeopleRateModifier()\n\tlocal iPolicyMod = pPlayer:GetPolicyGreatPeopleRateModifier()\n\tlocal iCityMod = pCity:GetGreatPeopleRateModifier()\n\tlocal iWorldCongressMod = 0\n\tlocal iGoldenAgeMod = 0\n\tif pSpecialistInfo.GreatPeopleUnitClass == 'UNITCLASS_ENGINEER' then\n\t\tiPlayerMod = iPlayerMod + pPlayer:GetGreatEngineerRateModifier()\n\t\tiPolicyMod = iPolicyMod + pPlayer:GetPolicyGreatEngineerRateModifier()\n\tend\n\tif pPlayer:GetGoldenAgeTurns() > 0 and pPlayer.GetGoldenAgeGreatEngineerRateModifier then\n\t\tiGoldenAgeMod = pPlayer:GetGoldenAgeGreatEngineerRateModifier() or 0\n\tend\n\treturn iPlayerMod + iPolicyMod + iCityMod + iWorldCongressMod + iGoldenAgeMod\nend",
					"Condensed GP rate helper showing the same modifier-stack pattern used in the archive utilities.",
				),
				snippetFile(
					"Lua/Gameplay/GreatPersonRateExample.lua",
					"lua",
					'include("GreatPersonRateCalculator")\n\nlocal function printEngineerRate(pPlayer)\n\tlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\n\tlocal pSpecialistInfo = GameInfo.Specialists.SPECIALIST_ENGINEER\n\tif not pCapital or not pSpecialistInfo then\n\t\treturn\n\tend\n\tprint("Capital engineer rate bonus:", City_GetGreatPeopleUnitRateModifier(pPlayer, pCapital, pSpecialistInfo))\nend',
					"Real use example: inspect the capital’s Engineer rate bonus with the shared helper.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Specialists", "Great Person rate math usually starts from the specialist or GP class being examined.", "rows"),
			linkToSchema("Policies", "Policy-side GP modifiers often feed directly into the combined rate calculation.", "rows"),
			linkToSchema("Units", "Useful when translating specialist GP classes back into concrete Great Person unit rows.", "rows"),
		],
	},
	{
		title: "Plot Iterators / Radius Scan",
		focus: "Preferred area scanning utility",
		status: "Infrastructure Pattern",
		copy: "Prefer “PlotIterators.lua” when you need to scan tiles around a city or unit. It is a common Civ V utility, it reads more clearly than custom nested loops, and it gives a stable scan order.",
		deliverables: [
			"A “PlotAreaSpiralIterator” example for radius scanning around a city or unit.",
			"A clear note that “PlotIterators.lua” is the preferred shared utility for this pattern.",
			"A clean predicate branch for filtering water, mountains, cities, improvements, or owned tiles.",
		],
		example: {
			title: "Preferred spiral scan around a city",
			summary: "This example starts from a city and looks outward for the first valid land tile. It uses “PlotIterators.lua” instead of a custom radius loop.",
			files: [
				snippetFile(
					"Lua/Gameplay/PlotIteratorScan.lua",
					"lua",
					'include("PlotIterators")\n\nlocal function findNearestValidPlot(pCity, radius)\n\tlocal pOrigin = pCity and Map.GetPlot(pCity:GetX(), pCity:GetY())\n\tif not pOrigin then\n\t\treturn nil\n\tend\n\tfor pPlot in PlotAreaSpiralIterator(pOrigin, radius, SECTOR_NORTH, DIRECTION_CLOCKWISE, DIRECTION_OUTWARDS, CENTRE_EXCLUDE) do\n\t\tif pPlot and not pPlot:IsWater() and not pPlot:IsCity() and not pPlot:IsMountain() then\n\t\t\treturn pPlot\n\t\tend\n\tend\n\treturn nil\nend',
					"Preferred common utility for radius scans. Use the iterator helper instead of custom nested “dx”/“dy” loops whenever possible.",
				),
			],
		},
		touchpoints: [
			{ label: "Plot Search Pattern", href: "/pattern-library", note: "Use the older loop recipe only as a fallback; “PlotIterators.lua” is the cleaner shared utility for most radius scans." },
			{ label: "Distance + Closest Resolver", href: "/pattern-library", note: "Good companion when the radius scan also needs nearest-target or distance comparisons." },
			{ label: "Lua API Explorer", href: "/lua-api-explorer", note: "Use the explorer to inspect plot, map, city, and unit helpers that feed into the iterator’s filter predicate." },
		],
	},
	{
		title: "CityInfoStack UI Injection",
		focus: "Additive city-screen UI",
		status: "Setup Pattern",
		copy: "Use this when you want to add a small icon or panel to the city screen without replacing the whole screen. It is the safer choice when your UI should live beside other mods.",
		deliverables: [
			"A CityInfoStack registration flow that pushes addins through “LuaEvents.CityInfoStackDataRefresh”.",
			"A UI-side dirty/refresh pattern so the city screen re-renders when your data changes.",
			"A clearer separation between additive city UI and full UI overrides.",
		],
		example: {
			title: "Register a custom city-info addin",
			summary: "This example adds one small city marker to the shared CityInfoStack and refreshes it when the city screen updates.",
			files: [
				snippetFile(
					"Lua/UI/GenericCityInfoAddin.lua",
					"lua",
					'include("CityInfoStack")\n\nLuaEvents.CityInfoStackDataRefresh.Add(function(tCityInfoAddins, tEventsToHook)\n\ttable.insert(tCityInfoAddins, {\n\t\tKey = "GENERIC_CITY_MARKER",\n\t\tSortOrder = 25,\n\t})\n\ttable.insert(tEventsToHook, Events.SerialEventCityInfoDirty)\nend)\n\nLuaEvents.CityInfoStackDirty.Add(function(key, pInstance)\n\tif key ~= "GENERIC_CITY_MARKER" then\n\t\treturn\n\tend\n\tpInstance.IconFrame:SetHide(false)\n\tpInstance.Icon:SetTexture("GenericAtlas256.dds")\n\tpInstance.Icon:SetToolTipString("Example city marker from a modular CityInfoStack addin.")\nend)',
					"Minimal modular CityInfoStack addin wired through the shared refresh and dirty events instead of a full city-screen override.",
				),
			],
		},
		touchpoints: [
			{ label: "VFS / UI Include Setup", href: "/pattern-library", note: "You still need the UI files imported and loaded in the correct UI context before the CityInfoStack addin can render." },
			{
				label: ".modinfo Builder",
				href: "/modinfo-builder",
				note: "Use the builder to wire the UI files as “InGameUIAddin” or other appropriate entry points instead of guessing the load context.",
			},
		],
	},
	{
		title: "UI Override Packaging",
		focus: "Replacement UI files",
		status: "Setup Pattern",
		copy: "Use this when you are fully replacing a Firaxis UI file. Override files need the real Firaxis filenames, VFS import, and the correct context, so they should be packaged more carefully than normal UI addins.",
		deliverables: [
			"A replacement-file checklist: exact filenames, matching XML/Lua pairs, and VFS import expectations.",
			"A split between additive UI addins and full overrides so modders choose the right packaging model.",
			"A starter “.modinfo” action example for override files and paired textures.",
		],
		example: {
			title: "Override a Firaxis UI context",
			summary: "The first file shows the VFS packaging. The second file shows a simple real override of “CultureOverview.lua”.",
			files: [
				snippetFile(
					".modinfo",
					"xml",
					'<Mod id="33333333-3333-3333-3333-333333333333" version="1">\n\t<Files>\n\t\t<File import="1">Lua/Overrides/CultureOverview.lua</File>\n\t\t<File import="1">Lua/Overrides/CultureOverview.xml</File>\n\t\t<File import="1">Lua/Overrides/Images/CityStatePopupTop500.dds</File>\n\t</Files>\n\t<Actions>\n\t\t<OnModActivated>\n\t\t\t<ImportIntoVFS>Lua/Overrides/CultureOverview.lua</ImportIntoVFS>\n\t\t\t<ImportIntoVFS>Lua/Overrides/CultureOverview.xml</ImportIntoVFS>\n\t\t\t<ImportIntoVFS>Lua/Overrides/Images/CityStatePopupTop500.dds</ImportIntoVFS>\n\t\t</OnModActivated>\n\t</Actions>\n</Mod>',
					"Replacement UI files still need the real Firaxis filenames, but this version shows the wiring directly in the “.modinfo” manifest so you can edit the action rows in the file itself.",
				),
				snippetFile(
					"Lua/Overrides/CultureOverview.lua",
					"lua",
					'include("IconSupport")\nprint("Custom CultureOverview loaded")\n\nfunction RefreshData()\n\tprint("Culture overview refresh from override")\nend',
					"Simple real-use override file. In a real mod this would replace or extend the base Culture Overview screen behavior.",
				),
			],
		},
		touchpoints: [
			{ label: ".modinfo Builder", href: "/modinfo-builder", note: "Use the builder to wire replacement UI files with the right import and entry-point expectations." },
			{ label: "VFS / UI Include Setup", href: "/pattern-library", note: "Read the additive-VFS split first so you do not package a full override like an ordinary UI include." },
			{
				label: "Lua Override Examples",
				href: "/pattern-library",
				note: "The archive’s “Lua/Overrides” folder is a good reminder that override packaging owns the original filename and context.",
			},
		],
	},
	{
		title: "Compatibility Pack / Reference-Heavy ModInfo",
		focus: "Large integration “.modinfo”",
		status: "Setup Pattern",
		copy: "Use in “.modinfo” when your mod is really a compatibility layer. This lets you list required mods, optional companion mods, blocked conflicts, and any reload flags in one place.",
		deliverables: [
			"A compatibility-oriented “.modinfo” skeleton with “Dependencies”, “References”, and “Blocks”.",
			"Examples of reload flags for art- and UI-heavy integration packs.",
			"A cleaner pattern for documenting hard requirements, optional companions, and blocked conflicts in one manifest.",
		],
		example: {
			title: "Reference-heavy compatibility manifest",
			summary: "This example shows a compatibility pack that needs one art mod, supports Community Patch, and blocks one known conflict.",
			files: [
				snippetFile(
					".modinfo",
					"xml",
					'<Mod id="00000000-0000-0000-0000-000000000000" version="1">\n\t<Properties>\n\t\t<ReloadAudioSystem>1</ReloadAudioSystem>\n\t\t<ReloadLandmarkSystem>1</ReloadLandmarkSystem>\n\t\t<ReloadStrategicViewSystem>1</ReloadStrategicViewSystem>\n\t\t<ReloadUnitSystem>1</ReloadUnitSystem>\n\t</Properties>\n\t<Dependencies>\n\t\t<Mod id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" minversion="0" maxversion="999" title="Required Art Pack" />\n\t</Dependencies>\n\t<References>\n\t\t<Mod id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" minversion="0" maxversion="999" title="Community Patch" />\n\t\t<Mod id="cccccccc-cccc-cccc-cccc-cccccccccccc" minversion="0" maxversion="999" title="Optional Companion Pack" />\n\t</References>\n\t<Blocks>\n\t\t<Mod id="dddddddd-dddd-dddd-dddd-dddddddddddd" minversion="0" maxversion="999" title="Known Conflict Mod" />\n\t</Blocks>\n</Mod>',
					"Compact compatibility-pack manifest modeled on a reference-heavy archive “.modinfo” rather than a small standalone civ manifest.",
				),
			],
		},
		touchpoints: [
			{ label: ".modinfo Builder", href: "/modinfo-builder", note: "Use the builder to enter dependencies, references, file lists, and action rows instead of hand-editing the whole manifest." },
			{
				label: "Mod Detection / Compatibility Toggle",
				href: "/pattern-library",
				note: "Pair manifest-level compatibility declarations with runtime mod-detection helpers when optional integrations also change Lua behavior.",
			},
			{
				label: "Log & Debug Triage",
				href: "/pattern-library",
				note: "Heavy integration manifests are easier to validate when you already have the logging and baseline-comparison workflow in place.",
			},
		],
	},
	{
		title: "Log & Debug Triage",
		focus: "Logs and tooling",
		status: "Support Recipe",
		copy: "Give modders a repeatable order of operations when Lua stops firing, text keys fail to resolve, or XML appears to load but never affects gameplay. Start by turning on database validation and logging, then compare a baseline run without your mod against the first turn where your mod actually loads.",
		deliverables: [
			"Config and FireTuner reminders before testing begins, with what each switch actually does.",
			"Log-first checks for Lua, XML, SQL, localization, and VFS, plus which log to read first.",
			"A symptom map that separates bad data from bad load context.",
		],
		example: {
			title: "Minimal debug baseline",
			summary:
				"Enable validation and logs first, then do one baseline game load without your mod so you know which errors belong to Firaxis or DLC. After that, enable your mod, press Next so it loads, and only chase the new messages.",
			files: [
				snippetFile(
					"config.ini",
					"ini",
					"; config.ini\n; Validates the game database whenever XML or SQL changes it.\nValidateGameDatabase = 1\n\n; Turns on log file output in ...\\My Games\\Sid Meier's Civilization 5\\Logs.\nLoggingEnabled = 1\n\n; Exposes extra Lua debug helpers that make investigation easier.\nEnableLuaDebugLibrary = 1\n\n; Allows FireTuner / tuner-side inspection when you need live state checks.\nEnableTuner = 1",
					"Baseline switches before troubleshooting. “ValidateGameDatabase” catches bad references early, “LoggingEnabled” writes the log files, “EnableLuaDebugLibrary” helps Lua inspection, and “EnableTuner” opens live debugging tools.",
				),
				snippetFile(
					"Logs/DebugReadOrder.txt",
					"text",
					"1. Run Civ once with every required mod enabled except the mod you are debugging.\n2. Start a game, play the first turn, exit, and treat those log messages as baseline noise for your setup.\n3. Run Civ again, enable your mod, press Next so the mod loads, then compare the new log messages.\n4. Read database.log first for SQL/XML update failures and invalid references.\n5. Read xml.log next for XML parsing, localization tag, and validation issues.\n6. Read lua.log for runtime errors and your own print() traces.",
					"Short debugging loop adapted from the CivFanatics logging guide.",
				),
				snippetFile(
					"Lua/Gameplay/TraceHooks.lua",
					"lua",
					'print("[CMC_MyMod] Loaded gameplay hook file on turn", Game.GetGameTurn())\nGameEvents.PlayerDoTurn.Add(function(iPlayer)\n\tprint("[CMC_MyMod] PlayerDoTurn", iPlayer, Game.GetGameTurn())\nend)',
					"Minimal recurring trace file for proving gameplay Lua is loading and firing. These messages should show up in “lua.log” once “LoggingEnabled = 1” is active.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Simple recurring hook for proving that gameplay Lua is actually loading."),
			linkToLua("Game.GetGameTurn", "game-getgameturn-80", "methods", "Small timing helper that makes logs much easier to compare across turns."),
			linkToPage(".modinfo Builder", "/modinfo-builder", "Helpful when the real failure is bad file wiring or wrong load actions rather than broken SQL or Lua logic."),
			linkToPage(
				"Why My Mod Loaded But Did Nothing",
				"/pattern-library",
				"Natural follow-up when the logs stay quiet and the symptom is a mod that appears enabled but never actually changes gameplay.",
			),
		],
	},
	{
		title: "VFS / UI Include Setup",
		focus: "Project wiring",
		status: "Support Recipe",
		copy: "Turn SQL updates, localization files, UI Lua, and icon assets into a repeatable project-action split so each file lands in the correct load path the first time.",
		deliverables: [
			"Checklist for files that belong in VFS versus database updates.",
			"UI include patterns and file placement guardrails.",
			"A starter action split that prevents common ‘it loaded into the wrong context’ mistakes.",
		],
		example: {
			title: "Mod action split",
			summary: "SQL database updates, localization XML, and VFS imports should be explicit instead of hidden behind one catch-all action.",
			files: [
				snippetFile(
					"SQL/Buildings/FloatingArchives.sql",
					"sql",
					"INSERT INTO BuildingClasses (Type, DefaultBuilding, Description)\nVALUES\n\t('BUILDINGCLASS_FLOATING_ARCHIVES', 'BUILDING_FLOATING_ARCHIVES', 'TXT_KEY_BUILDING_FLOATING_ARCHIVES');\n\nINSERT INTO Buildings\n\t(Type, BuildingClass, Cost, GoldMaintenance, PrereqTech, Description, Help)\nVALUES\n\t('BUILDING_FLOATING_ARCHIVES', 'BUILDINGCLASS_FLOATING_ARCHIVES', 120, 0, 'TECH_WRITING', 'TXT_KEY_BUILDING_FLOATING_ARCHIVES', 'TXT_KEY_BUILDING_FLOATING_ARCHIVES_HELP');\n\nINSERT INTO Building_YieldChanges (BuildingType, YieldType, Yield)\nVALUES\n\t('BUILDING_FLOATING_ARCHIVES', 'YIELD_SCIENCE', 2);",
					"Starter SQL database file for the gameplay rows referenced by the mod actions below.",
				),
				snippetFile(
					".modinfo",
					"xml",
					'<Mod id="44444444-4444-4444-4444-444444444444" version="1">\n\t<Files>\n\t\t<File import="0">SQL/Buildings/FloatingArchives.sql</File>\n\t\t<File import="0">XML/Text/FloatingArchivesText.xml</File>\n\t\t<File import="1">UI/CMC_StatusPanel.lua</File>\n\t\t<File import="1">UI/CMC_StatusPanel.xml</File>\n\t\t<File import="1">Art/CMC_Atlas256.dds</File>\n\t</Files>\n\t<Actions>\n\t\t<OnModActivated>\n\t\t\t<UpdateDatabase>SQL/Buildings/FloatingArchives.sql</UpdateDatabase>\n\t\t\t<UpdateDatabase>XML/Text/FloatingArchivesText.xml</UpdateDatabase>\n\t\t</OnModActivated>\n\t\t<OnModActivated>\n\t\t\t<ImportIntoVFS>UI/CMC_StatusPanel.lua</ImportIntoVFS>\n\t\t\t<ImportIntoVFS>UI/CMC_StatusPanel.xml</ImportIntoVFS>\n\t\t\t<ImportIntoVFS>Art/CMC_Atlas256.dds</ImportIntoVFS>\n\t\t</OnModActivated>\n\t</Actions>\n</Mod>',
					"Manifest example that keeps the SQL update, localization XML, and VFS imports together in one “.modinfo” file. If you do not want to hand-edit this, the “.modinfo Builder” is the easier route.",
				),
				snippetFile(
					"UI/CMC_StatusPanel.lua",
					"lua",
					'include("IconSupport")\n\nfunction RefreshStatusPanel()\n\tprint("[CMC_StatusPanel] UI file loaded through VFS")\nend',
					"Minimal UI-side include target that proves the VFS import path is working.",
				),
			],
		},
		touchpoints: [
			linkToSchema("IconTextureAtlases", "Atlas registration rows only work if the textures are imported correctly."),
			{ label: ".modinfo Builder", href: "/modinfo-builder", note: "Use the builder to assemble the file list and action split when the manifest is doing SQL, text, and VFS work together." },
		],
	},
	{
		title: "Localized Building + Notification Text",
		focus: "Starter text + feedback",
		status: "High-Use Recipe",
		copy: "Start with one practical text pack that covers a building name, building help, and a matching notification. This gives you a reusable pattern for text keys, markup, and player-facing feedback without splitting the basics across multiple recipes.",
		deliverables: [
			"A grouped “Language_en_US” file with building and notification text keys.",
			"Examples for “ICON”, “COLOR”, “NEWLINE”, and parameter placeholders in real gameplay text.",
			"A notification call that turns those text keys into visible in-game feedback with map coordinates.",
		],
		example: {
			title: "Building text + completion notification",
			summary: "Write the building text keys first, then call them from Lua with a real city name and a real map anchor.",
			files: [
				snippetFile(
					"XML/Text/FloatingArchivesText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_BUILDING_FLOATING_ARCHIVES" Text="Floating Archives" />\n\t\t<Row Tag="TXT_KEY_BUILDING_FLOATING_ARCHIVES_HELP" Text="[COLOR_POSITIVE_TEXT]+2[ENDCOLOR] [ICON_RESEARCH] Science from the main building row.[NEWLINE]Extra text can be layered in later." />\n\t\t<Row Tag="TXT_KEY_NOTIFICATION_FLOATING_ARCHIVES" Text="[COLOR_CYAN_TEXT]{1_CityName}[ENDCOLOR] completed the [COLOR_POSITIVE_TEXT]Floating Archives[ENDCOLOR].[NEWLINE]{2_Num} [ICON_RESEARCH] Science is now available from the building." />\n\t\t<Row Tag="TXT_KEY_NOTIFICATION_FLOATING_ARCHIVES_SHORT" Text="Floating Archives completed" />\n\t\t<Row Tag="TXT_KEY_NOTIFICATION_FLOATING_ARCHIVES_TIP" Text="[ICON_BULLET] {1_CityName} now benefits from the archive.[NEWLINE][ICON_BULLET] Open the city screen to inspect the new science output." />\n\t</Language_en_US>\n</GameData>',
					"Single text pack that handles the building name, help text, and the notification copy a player will actually see in game.",
				),
				snippetFile(
					"Lua/Gameplay/NotifyFloatingArchives.lua",
					"lua",
					'local function notifyFloatingArchives(pPlayer, pCity, scienceYield)\n\tif not pPlayer or not pCity then\n\t\treturn\n\tend\n\n\tlocal summary = Locale.ConvertTextKey("TXT_KEY_NOTIFICATION_FLOATING_ARCHIVES_SHORT")\n\tlocal body = Locale.ConvertTextKey("TXT_KEY_NOTIFICATION_FLOATING_ARCHIVES", pCity:GetName(), scienceYield or 2)\n\tlocal tooltip = Locale.ConvertTextKey("TXT_KEY_NOTIFICATION_FLOATING_ARCHIVES_TIP", pCity:GetName())\n\n\tpPlayer:AddNotification(\n\t\tNotificationTypes.NOTIFICATION_GENERIC,\n\t\tbody .. "[NEWLINE][NEWLINE]" .. tooltip,\n\t\tsummary,\n\t\tpCity:GetX(),\n\t\tpCity:GetY(),\n\t\t0,\n\t\t-1\n\t)\nend\n\nlocal iPlayer = Game.GetActivePlayer()\nlocal pPlayer = Players[iPlayer]\nlocal pCapital = pPlayer and pPlayer:GetCapitalCity()\nnotifyFloatingArchives(pPlayer, pCapital, 2)',
					"Practical notification call that consumes localized strings, plugs in real values, and anchors the result to the relevant city.",
				),
			],
		},
		touchpoints: [
			linkToLua("Player:AddNotification", "player-addnotification-5", "methods", "Notification call site that consumes the localized strings."),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Convenient way to anchor notification coordinates to the relevant city."),
			linkToSchema("Buildings", "Keep the visible building text aligned with the gameplay row that owns the description and help keys."),
			linkToSchema("Language_en_US", "Every “TXT_KEY_” used by the building row or notification call needs a matching localized text row.", "rows"),
			linkToPage("Notification Utility Wrapper", "/pattern-library", "Use this next when the text is ready but the mod now wants a reusable notification helper instead of one inline call."),
		],
	},
	{
		title: "Building-Class Override Pattern",
		focus: "Safe class replacement",
		status: "High-Use Recipe",
		copy: "Replace a vanilla building through its class link instead of rewriting every downstream reference to a brand new type. The building class stays stable, the civilization points that class at the replacement row, and other tables that key off the class keep working.",
		deliverables: [
			"A clone-from-base building row that keeps the original class intact.",
			"A civilization override row that swaps the class member cleanly.",
			"Text rows for the replacement building’s name, help, and Civilopedia copy.",
		],
		example: {
			title: "Library-class replacement",
			summary: "Clone the base building first, keep the “BUILDINGCLASS_LIBRARY” link, then let the civilization override redirect only that civ to the new member.",
			files: [
				snippetFile(
					"SQL/Civilizations/AtlasArchivesOverride.sql",
					"sql",
					`INSERT INTO Buildings
	(Type, BuildingClass, Cost, GoldMaintenance, PrereqTech, SpecialistType, SpecialistCount, Description, Help, Civilopedia, ArtDefineTag, MinAreaSize, ConquestProb, HurryCostModifier, IconAtlas, PortraitIndex)
SELECT
	'BUILDING_CMC_ATLAS_ARCHIVES',
	BuildingClass,
	Cost,
	GoldMaintenance,
	PrereqTech,
	SpecialistType,
	SpecialistCount,
	'TXT_KEY_BUILDING_CMC_ATLAS_ARCHIVES',
	'TXT_KEY_BUILDING_CMC_ATLAS_ARCHIVES_HELP',
	'TXT_KEY_CIV5_BUILDINGS_CMC_ATLAS_ARCHIVES_TEXT',
	ArtDefineTag,
	MinAreaSize,
	ConquestProb,
	HurryCostModifier,
	'CMC_ATLAS_ARCHIVES_ATLAS',
	0
FROM Buildings
WHERE Type = 'BUILDING_LIBRARY';

INSERT INTO Building_YieldChanges (BuildingType, YieldType, Yield)
VALUES
	('BUILDING_CMC_ATLAS_ARCHIVES', 'YIELD_SCIENCE', 1);

INSERT INTO Civilization_BuildingClassOverrides (CivilizationType, BuildingClassType, BuildingType)
VALUES
	('CIVILIZATION_CMC_ATLAS', 'BUILDINGCLASS_LIBRARY', 'BUILDING_CMC_ATLAS_ARCHIVES');`,
					"Core override pattern: keep the library class stable, put the custom row in that class, then let the civ override point to it.",
				),
				snippetFile(
					"XML/Text/AtlasArchivesText.xml",
					"xml",
					`<GameData>
	<Language_en_US>
		<Row Tag="TXT_KEY_BUILDING_CMC_ATLAS_ARCHIVES" Text="Atlas Archives" />
		<Row Tag="TXT_KEY_BUILDING_CMC_ATLAS_ARCHIVES_HELP" Text="+1 [ICON_RESEARCH] Science and a stronger Civilopedia identity than the base Library." />
		<Row Tag="TXT_KEY_CIV5_BUILDINGS_CMC_ATLAS_ARCHIVES_TEXT" Text="A replacement for the Library that keeps the same class hook while changing the civ-facing payload." />
	</Language_en_US>
</GameData>`,
					"Replacement text file after the SQL clone swaps the visible strings away from the base building.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Buildings", "Base table for cloning the replacement row while keeping the original class relationship.", "rows"),
			linkToSchema("BuildingClasses", "The class is the stable contract other tables tend to depend on.", "rows"),
			linkToSchema("Civilization_BuildingClassOverrides", "Primary table for swapping the class member only for the intended civilization.", "rows"),
			linkToSchema("Building_YieldChanges", "One example payload table that can diverge from the base building once the override is in place.", "rows"),
		],
	},
	{
		title: "Civilopedia + Art Define Wiring",
		focus: "Unit presentation stack",
		status: "High-Use Recipe",
		copy: "Hook the visible side of a new unit together in one pass: gameplay row, text rows, portrait atlases, flag atlas references, and the art define records that decide which model and strategic view assets the game actually draws.",
		deliverables: [
			"A unit row with Civilopedia, strategy, icon atlas, and portrait references.",
			"Matching text rows so the gameplay row never ships with unresolved text keys.",
			"Art define and atlas records that make the unit show up correctly in UI and on the map.",
		],
		example: {
			title: "Unit row + art define bundle",
			summary: "Start from the unit row that references text and atlases, then add the icon and art define records that satisfy those references.",
			files: [
				snippetFile(
					"SQL/Units/AtlasSkirmisher.sql",
					"sql",
					`INSERT INTO Units
	(Type, Class, CombatClass, PrereqTech, Combat, RangedCombat, Range, Cost, Moves, DefaultUnitAI, Domain, Description, Help, Civilopedia, Strategy, UnitArtInfo, UnitFlagAtlas, UnitFlagIconOffset, IconAtlas, PortraitIndex)
SELECT
	'UNIT_CMC_ATLAS_SKIRMISHER',
	Class,
	CombatClass,
	PrereqTech,
	Combat,
	RangedCombat + 2,
	Range,
	Cost,
	Moves,
	DefaultUnitAI,
	Domain,
	'TXT_KEY_UNIT_CMC_ATLAS_SKIRMISHER',
	'TXT_KEY_UNIT_CMC_ATLAS_SKIRMISHER_HELP',
	'TXT_KEY_CIV5_UNIT_CMC_ATLAS_SKIRMISHER_TEXT',
	'TXT_KEY_UNIT_CMC_ATLAS_SKIRMISHER_STRATEGY',
	'ART_DEF_UNIT_CMC_ATLAS_SKIRMISHER',
	'CMC_ATLAS_UNIT_FLAG_ATLAS',
	0,
	'CMC_ATLAS_UNIT_ATLAS',
	0
FROM Units
WHERE Type = 'UNIT_CROSSBOWMAN';`,
					"Gameplay row with the exact text, icon, and art define references that the other files below need to satisfy.",
				),
				snippetFile(
					"XML/Art/AtlasSkirmisherArt.xml",
					"xml",
					`<GameData>
	<IconTextureAtlases>
		<Row Atlas="CMC_ATLAS_UNIT_ATLAS" IconSize="256" Filename="AtlasSkirmisher_256.dds" IconsPerRow="1" IconsPerColumn="1" />
		<Row Atlas="CMC_ATLAS_UNIT_FLAG_ATLAS" IconSize="32" Filename="AtlasSkirmisherFlag_32.dds" IconsPerRow="1" IconsPerColumn="1" />
	</IconTextureAtlases>
	<ArtDefine_UnitInfos>
		<Row Type="ART_DEF_UNIT_CMC_ATLAS_SKIRMISHER" DamageStates="1" Formation="DefaultCavalry" />
	</ArtDefine_UnitInfos>
	<ArtDefine_UnitInfoMemberInfos>
		<Row UnitInfoType="ART_DEF_UNIT_CMC_ATLAS_SKIRMISHER" UnitMemberInfoType="ART_DEF_UNIT_MEMBER_CMC_ATLAS_SKIRMISHER" NumMembers="2" />
	</ArtDefine_UnitInfoMemberInfos>
	<ArtDefine_StrategicView>
		<Row StrategicViewType="ART_DEF_UNIT_CMC_ATLAS_SKIRMISHER" TileType="Unit" Asset="sv_AtlasSkirmisher.dds" />
	</ArtDefine_StrategicView>
</GameData>`,
					"Atlas and art define bundle that backs the icon, flag, model, and strategic-view references from the unit row.",
				),
				snippetFile(
					"XML/Text/AtlasSkirmisherText.xml",
					"xml",
					`<GameData>
	<Language_en_US>
		<Row Tag="TXT_KEY_UNIT_CMC_ATLAS_SKIRMISHER" Text="Atlas Skirmisher" />
		<Row Tag="TXT_KEY_UNIT_CMC_ATLAS_SKIRMISHER_HELP" Text="A ranged field unit with stronger opening fire and cleaner art wiring than a placeholder clone." />
		<Row Tag="TXT_KEY_CIV5_UNIT_CMC_ATLAS_SKIRMISHER_TEXT" Text="Civilopedia copy for the Atlas Skirmisher." />
		<Row Tag="TXT_KEY_UNIT_CMC_ATLAS_SKIRMISHER_STRATEGY" Text="Use this as the strategy note shown in the Civilopedia and production picker." />
	</Language_en_US>
</GameData>`,
					"Text file for the strings most modders forget to wire until the unit already exists in the database.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Units", "Main gameplay row that references the visible text, atlas, and art define keys.", "rows"),
			linkToSchema("IconTextureAtlases", "Portrait and flag atlas registration must match the atlas names used by the unit row.", "rows"),
			linkToSchema("ArtDefine_UnitInfos", "Top-level art define record the unit points at through “UnitArtInfo”.", "rows"),
			linkToSchema("ArtDefine_UnitInfoMemberInfos", "Connects the unit art define to the actual member model definition.", "rows"),
			linkToSchema("ArtDefine_StrategicView", "Strategic-view icon row for the zoomed-out map presentation.", "rows"),
			{
				label: "Art + Audio Setup",
				href: "/template-generators?generator=art-audio-bundle",
				note: "Use the generator when you want the civ colors, atlas rows, leader audio, and unit art define scaffolding emitted together before refining the presentation by hand.",
			},
			linkToPage("Civ Icon Maker", "/civ-icon-maker", "Use it when the portrait-side source art or civ-color treatment still needs a cleaner icon render before atlas registration."),
			linkToPage("DDS Converter", "/dds-converter", "Natural handoff once the portrait, unit flag, and strategic-view source art is approved and ready for Civ V DDS export."),
			linkToPage("Unit Flag Previewer", "/unit-flag-previewer", "Check whether the unit flag actually reads well in-game before DDS conversion.", {
				disabled: true,
				statusLabel: "Tool",
			}),
		],
	},
	{
		title: "Dummy Policy / Dummy Building Tradeoff",
		focus: "Empirewide vs city-scoped hidden effects",
		status: "High-Use Recipe",
		copy: "Choose the hidden carrier that matches the mechanic before you write the effect tables. Dummy policies are better when the state is empirewide. Dummy buildings are better when the state belongs to one city, a subset of cities, or a live city count you expect to sync over time.",
		deliverables: [
			"A plain-language checklist for when a hidden policy or hidden building is the better carrier.",
			"A minimal dummy policy row for empirewide state.",
			"A minimal dummy building row plus a Lua grant path for city-scoped state.",
		],
		example: {
			title: "Empirewide flag vs city marker",
			summary: "Use the checklist first, then look at the two smallest possible examples side by side.",
			files: [
				snippetFile(
					"Docs/DummyPolicyVsDummyBuilding.txt",
					"text",
					`1. Use a dummy policy when the effect belongs to the whole player and should not vary by city.
2. Use a dummy building when the effect belongs to one city, some cities, or a city count that changes.
3. Use a dummy building when the effect table already hangs off Buildings.
4. Use a dummy policy when the mechanic really behaves like a hidden empirewide switch.
5. If you keep writing city loops to emulate a policy, it probably wants a building instead.`,
					"Quick decision guide for the fork modders hit all the time.",
				),
				snippetFile(
					"SQL/Policies/DummyPolicy.sql",
					"sql",
					`INSERT INTO Policies (Type, Description, Help, Civilopedia, PortraitIndex, IconAtlas)
VALUES
	('POLICY_CMC_DUMMY_NAVAL_STATE', 'TXT_KEY_POLICY_CMC_DUMMY_NAVAL_STATE', 'TXT_KEY_POLICY_CMC_DUMMY_NAVAL_STATE_HELP', 'TXT_KEY_POLICY_CMC_DUMMY_NAVAL_STATE_TEXT', 0, 'CMC_POLICY_ATLAS');`,
					"Minimal hidden policy row. The important part is the carrier choice, not the exact effect table attached afterward.",
				),
				snippetFile(
					"Lua/Gameplay/ApplyDummyBuilding.lua",
					"lua",
					`local iDummyBuilding = GameInfoTypes.BUILDING_CMC_DUMMY_HARBOR_STATE

local function syncHarborMarker(pCity)
	if not pCity then
		return
	end
	local shouldHave = pCity:IsCoastal(10) and not pCity:IsPuppet()
	pCity:SetNumRealBuilding(iDummyBuilding, shouldHave and 1 or 0)
end`,
					"City-scoped example that makes the building route clearly more natural than a hidden policy.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Policies", "Use a hidden policy when the state belongs to the player rather than a specific city.", "rows"),
			linkToSchema("Buildings", "Use a hidden building when the effect should live on a city and integrate with building-side tables.", "rows"),
			linkToSchema("BuildingClasses", "Dummy buildings usually want their own class so their hidden state resolves cleanly.", "rows"),
			{ label: "Dynamic Dummy Building Updater", href: "/pattern-library", note: "Read this next when the city-scoped state needs to stay in sync instead of being granted once." },
		],
	},
	{
		title: "One-Time Initialization on First Turn",
		focus: "Safe startup bootstrapping",
		status: "High-Use Recipe",
		copy: "Run your setup exactly once when the game actually starts instead of assuming a file load means gameplay state is ready. This is useful for seeding dummy buildings, scanning majors, caching map state, or granting the initial version of a civ mechanic.",
		deliverables: [
			"A one-time save key that survives reloads.",
			"A first-turn gate that waits until gameplay is actually live.",
			"A starter payload block for city markers, notifications, or cached values.",
		],
		example: {
			title: "First-turn bootstrap",
			summary: "Check the save key first, wait for turn zero, then perform the setup and mark it done immediately.",
			files: [
				snippetFile(
					"Lua/Gameplay/FirstTurnInit.lua",
					"lua",
					`local ModData = Modding.OpenSaveData()
local KEY = "CMC_FIRST_TURN_INIT_DONE"
local iDummy = GameInfoTypes.BUILDING_CMC_DUMMY_NEW_CITY_BONUS

local function runInitialSetup()
	for iPlayer = 0, GameDefines.MAX_MAJOR_CIVS - 1 do
		local pPlayer = Players[iPlayer]
		local pCapital = pPlayer and pPlayer:IsAlive() and pPlayer:GetCapitalCity()
		if pCapital then
			pCapital:SetNumRealBuilding(iDummy, 1)
		end
	end
	ModData.SetValue(KEY, 1)
end

GameEvents.PlayerDoTurn.Add(function(iPlayer)
	if iPlayer ~= Game.GetActivePlayer() or Game.GetGameTurn() > 0 then
		return
	end
	if ModData.GetValue(KEY) then
		return
	end
	runInitialSetup()
end)`,
					"One-time bootstrap that waits until the first real turn, seeds the starting state, and never runs again after the save key is set.",
				),
			],
		},
		touchpoints: [
			{ label: "SaveData Cooldown / Once-Per-City / Once-Per-Player", href: "/pattern-library", note: "Good companion when the one-time init grows into multiple scoped save keys." },
			linkToLua("GameEvents.PlayerDoTurn", "game-event-playerdoturn-72", "gameEvents", "Safe recurring hook for checking whether the live game state is ready."),
			linkToLua("Game.GetGameTurn", "game-getgameturn-80", "methods", "Simple way to gate the setup to the first playable turn."),
			linkToSchema("Buildings", "Common payload target when first-turn init seeds a hidden city proxy.", "rows"),
		],
	},
	{
		title: "Yield Reward With Scaled Era Output",
		focus: "Player-scaled rewards",
		status: "High-Use Recipe",
		copy: "Grant a yield with a formula that respects era, game speed, or empire size so the reward stays relevant beyond the Ancient Era. This is a practical pattern for decisions, events, unique powers, and quest-style effects.",
		deliverables: [
			"A reward helper that scales by current era and optional city count.",
			"A simple place to fold in game-speed compensation.",
			"A notification-friendly return value that tells the player exactly what they received.",
		],
		example: {
			title: "Era-scaled gold payout",
			summary: "Calculate the multiplier first, then grant the final yield in one place so the event hook stays readable.",
			files: [
				snippetFile(
					"Lua/Gameplay/ScaledYieldReward.lua",
					"lua",
					`local function getCityCount(pPlayer)
	local count = 0
	for _ in pPlayer:Cities() do
		count = count + 1
	end
	return count
end

local function grantScaledGold(pPlayer, baseAmount)
	local pTeam = pPlayer and Teams[pPlayer:GetTeam()]
	local era = pTeam and pTeam:GetCurrentEra() or 0
	local cityCount = pPlayer and getCityCount(pPlayer) or 1
	local speedRow = GameInfo.GameSpeeds[Game.GetGameSpeedType()]
	local speedScale = speedRow and (speedRow.TrainPercent / 100) or 1
	local total = math.floor((baseAmount + era * 15 + cityCount * 5) * speedScale)
	pPlayer:ChangeGold(total)
	return total
end

GameEvents.PlayerDoTurn.Add(function(iPlayer)
	local pPlayer = Players[iPlayer]
	if not pPlayer or not pPlayer:IsAlive() or pPlayer:IsMinorCiv() then
		return
	end
	local reward = grantScaledGold(pPlayer, 20)
	print("[CMC] Scaled gold reward granted:", iPlayer, reward)
end)`,
					"Simple era-plus-empire scaling helper that can be reused by decisions, turn hooks, or event payloads.",
				),
			],
		},
		touchpoints: [
			linkToSchema("GameSpeeds", "Use the game-speed multipliers when a flat reward feels too small on Marathon or too large on Quick.", "rows"),
			linkToSchema("Eras", "Current-era scaling is easier to reason about when the era rows and their order are visible.", "rows"),
			{ label: "Decision / Event Reward", href: "/pattern-library", note: "Use this recipe when the scaled yield is only one part of a larger reward bundle." },
		],
	},
	{
		title: "Great Person Spawn + Placement Fallback",
		focus: "Safe GP creation",
		status: "High-Use Recipe",
		copy: "Spawn a Great Person near the intended city, but keep a fallback path when the target plot is blocked. This avoids losing the reward just because the capital tile is full or the preferred plot is invalid.",
		deliverables: [
			"A preferred spawn attempt around the target city.",
			"A fallback path that walks nearby plots until it finds a safe tile.",
			"A clear return value so later reward code knows where the unit actually landed.",
		],
		example: {
			title: "Capital-biased Great Person spawn",
			summary: "Try the capital first, then search outward until you find a plot the unit can legally enter.",
			files: [
				snippetFile(
					"Lua/Gameplay/SpawnGreatPersonFallback.lua",
					"lua",
					`local iGreatArtist = GameInfoTypes.UNIT_ARTIST

local function findFallbackPlot(pPlayer, pCity)
	if not pPlayer or not pCity then
		return nil
	end
	local pOrigin = Map.GetPlot(pCity:GetX(), pCity:GetY())
	for radius = 0, 3 do
		for dx = -radius, radius do
			for dy = -radius, radius do
				local pPlot = Map.PlotXYWithRangeCheck(pOrigin:GetX(), pOrigin:GetY(), dx, dy, radius)
				if pPlot and not pPlot:IsMountain() and not pPlot:IsWater() then
					return pPlot
				end
			end
		end
	end
	return pOrigin
end

local function spawnGreatPerson(pPlayer)
	local pCapital = pPlayer and pPlayer:GetCapitalCity()
	local pTargetPlot = findFallbackPlot(pPlayer, pCapital)
	if not pCapital or not pTargetPlot then
		return nil, nil
	end
	local pUnit = pPlayer:InitUnit(iGreatArtist, pTargetPlot:GetX(), pTargetPlot:GetY())
	return pUnit, pTargetPlot
end`,
					"Minimal spawn helper that prefers the capital area but still returns a legal fallback tile when the ideal spot is occupied.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Units", "Use the unit row to confirm the Great Person type you are spawning and any special domain constraints.", "rows"),
			linkToLua("Player:GetCapitalCity", "player-getcapitalcity-141", "methods", "Most common anchor for a Great Person reward when no other city is specified."),
			{ label: "Nearest Valid Plot Finder", href: "/pattern-library", note: "Use the dedicated plot-search recipe when the fallback rules need to be stricter than the simple example here." },
		],
	},
	{
		title: "Free Promotion From Building / Policy / Trait",
		focus: "Condition-based promotions",
		status: "High-Use Recipe",
		copy: "Grant a promotion from the condition that actually matters: a city building, an adopted policy, or a civ trait. This keeps the unit logic readable when the database alone cannot express the whole rule cleanly.",
		deliverables: [
			"A helper that checks the promotion source once.",
			"A city-trained example that handles buildings, policies, and traits in one place.",
			"A promotion grant path that modders can expand without scattering the same checks across multiple files.",
		],
		example: {
			title: "Promotion from multiple sources",
			summary: "Resolve the source conditions first, then grant the promotion once when a city finishes training the unit.",
			files: [
				snippetFile(
					"Lua/Gameplay/PromotionFromSources.lua",
					"lua",
					`local iPromotion = GameInfoTypes.PROMOTION_DRILL_1
local iSourceBuilding = GameInfoTypes.BUILDING_BARRACKS
local iSourcePolicy = GameInfoTypes.POLICY_HONOR
local iTraitType = "TRAIT_CMC_MARITIME_COMPACT"

local function playerHasTrait(pPlayer)
	local leader = GameInfo.Leaders[pPlayer:GetLeaderType()]
	return leader and GameInfo.Leader_Traits{LeaderType = leader.Type, TraitType = iTraitType}() ~= nil
end

local function shouldGrantPromotion(pPlayer, pCity)
	return (pCity and pCity:GetNumBuilding(iSourceBuilding) > 0)
		or (pPlayer and pPlayer:HasPolicy and pPlayer:HasPolicy(iSourcePolicy))
		or (pPlayer and playerHasTrait(pPlayer))
end

GameEvents.CityTrained.Add(function(iPlayer, iCity, iUnit)
	local pPlayer = Players[iPlayer]
	local pCity = pPlayer and pPlayer:GetCityByID(iCity)
	local pUnit = pPlayer and pPlayer:GetUnitByID(iUnit)
	if not pUnit or not shouldGrantPromotion(pPlayer, pCity) then
		return
	end
	pUnit:SetHasPromotion(iPromotion, true)
end)`,
					"Single training-side helper that can answer ‘why does this unit get the promotion?’ without duplicating three different checks everywhere.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.CityTrained", "game-event-citytrained-33", "gameEvents", "Natural hook when the promotion should appear on units as soon as the city finishes them."),
			linkToSchema("UnitPromotions", "Promotion row the helper ultimately grants.", "rows"),
			linkToSchema("Buildings", "Building-side source when the promotion comes from a city structure.", "rows"),
			linkToSchema("Policies", "Policy-side source when the bonus turns on empirewide after adoption.", "rows"),
			linkToSchema("Leader_Traits", "Trait-side source when the bonus belongs to a civilization package rather than a building or policy.", "rows"),
			{
				label: "Promotion Grant / Strip Logic",
				href: "/pattern-library",
				note: "Use the stateful companion when the promotion should be refreshed, removed, or rechecked later instead of granted once at creation time.",
			},
			{
				label: "Trait Helper / IsTraitActive",
				href: "/pattern-library",
				note: "Use the helper companion when the trait branch should rely on a shared trait resolver instead of inline civ-package lookups.",
			},
		],
	},
	{
		title: "On City Growth Trigger",
		focus: "Population milestone reactions",
		status: "High-Use Recipe",
		copy: "React at the exact moment a city’s population changes instead of scanning every city every turn. This is the cleanest starting point for growth rewards, threshold checks, and city-scoped state updates.",
		deliverables: [
			"A “SetPopulation” listener that compares old and new values directly.",
			"A plot-to-city resolve block for the city that changed population.",
			"A clean place to attach rewards, notifications, or dummy building sync when the threshold is crossed.",
		],
		example: {
			title: "Growth hook variants",
			summary: "Keep the same population-change hook, but split the simple any-growth reward from the milestone-only version so the teaching examples do not blur together.",
			files: [
				snippetFile(
					"Lua/Gameplay/AnyGrowthTrigger.lua",
					"lua",
					`GameEvents.SetPopulation.Add(function(iX, iY, iOldValue, iNewValue)
	if iNewValue <= iOldValue then
		return
	end
	local pPlot = Map.GetPlot(iX, iY)
	local pCity = pPlot and pPlot:GetPlotCity()
	if not pCity then
		return
	end
	local iPlayer = pCity:GetOwner()
	local pPlayer = Players[iPlayer]
	if not pPlayer then
		return
	end
	pPlayer:ChangeGold(5)
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, pCity:GetName() .. " grew to population " .. iNewValue .. ".", "City Growth Trigger", iX, iY)
end)`,
					"Any-growth variant. Use this when every growth step should pay out a small reward or run a lightweight effect.",
				),
				snippetFile(
					"Lua/Gameplay/GrowthMilestoneTrigger.lua",
					"lua",
					`GameEvents.SetPopulation.Add(function(iX, iY, iOldValue, iNewValue)
	if iNewValue <= iOldValue or iNewValue % 5 ~= 0 then
		return
	end
	local pPlot = Map.GetPlot(iX, iY)
	local pCity = pPlot and pPlot:GetPlotCity()
	if not pCity then
		return
	end
	local pPlayer = Players[pCity:GetOwner()]
	if not pPlayer then
		return
	end
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, pCity:GetName() .. " reached population " .. iNewValue .. ".", "City Growth Trigger", iX, iY)
end)`,
					"Milestone variant. Use this when only threshold populations should matter, like every 5 population or a specific city-size breakpoint.",
				),
			],
		},
		touchpoints: [
			{ label: "GameEvents.SetPopulation", href: "/lua-api-explorer", note: "Preferred hook when the recipe should react at the exact moment a city’s population changes." },
			{ label: "Dynamic Dummy Building Updater", href: "/pattern-library", note: "Good companion when city growth should change a hidden building count rather than only print or notify." },
			linkToSchema("Buildings", "Common payload target when a growth threshold should turn on a dummy building or a real city reward.", "rows"),
			linkToPage("Yield Burst Helper", "/pattern-library", "Useful companion when the any-growth variant should pay out a small immediate reward instead of only toggling city state."),
		],
	},
	{
		title: "City Constructed / Project Created Trigger",
		focus: "Post-purchase and post-project city hooks",
		status: "High-Use Recipe",
		copy: "Use the city-side completion hooks that fire after a building or project actually lands. These are better teaching examples than generic lifecycle summaries because they show the city ID, the completed payload, and the easiest follow-up work in one place.",
		deliverables: [
			"A “CityConstructed” scaffold for building-finished reactions.",
			"A “CityCreated” scaffold for project completion reactions using the city ID from the hook.",
			"One city-resolve pattern based on “GetCityByID” so the same shape works in both handlers.",
		],
		example: {
			title: "Completion hook variants",
			summary: "Keep the same city-resolve shape, but show building completion and project completion as separate follow-up patterns instead of one combined example.",
			files: [
				snippetFile(
					"Lua/Gameplay/CityConstructedTrigger.lua",
					"lua",
					`local iGuildhall = GameInfoTypes.BUILDING_CMC_GUILDHALL

GameEvents.CityConstructed.Add(function(iPlayer, iCity, eBuilding, bGold, bFaithOrCulture)
	if eBuilding ~= iGuildhall then
		return
	end
	local pPlayer = Players[iPlayer]
	local pCity = pPlayer and pPlayer:GetCityByID(iCity)
	if not pCity then
		return
	end
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, pCity:GetName() .. " completed the Guildhall.", "City Constructed", pCity:GetX(), pCity:GetY())
end)`,
					"Building-complete variant. Use this when the reward should wait until the building actually lands in the city.",
				),
				snippetFile(
					"Lua/Gameplay/CityCreatedTrigger.lua",
					"lua",
					`local iApollo = GameInfoTypes.PROJECT_APOLLO_PROGRAM

GameEvents.CityCreated.Add(function(iPlayer, iCity, eProject, bGold, bFaithOrCulture)
	if eProject ~= iApollo then
		return
	end
	local pPlayer = Players[iPlayer]
	local pCity = pPlayer and pPlayer:GetCityByID(iCity)
	if not pCity then
		return
	end
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, pCity:GetName() .. " completed Apollo Program.", "Project Created", pCity:GetX(), pCity:GetY())
end)`,
					"Project-complete variant. This is the cleaner teaching example when the mechanic cares about a finished project rather than a building row.",
				),
			],
		},
		touchpoints: [
			{ label: "GameEvents.CityConstructed", href: "/lua-api-explorer", note: "Preferred building-complete hook when the reaction should happen after the city finishes construction." },
			{ label: "GameEvents.CityCreated", href: "/lua-api-explorer", note: "Companion hook for project completion that still provides the player and city IDs." },
			linkToLua("Player:GetCityByID", "player-getcitybyid-146", "methods", "The safest way to resolve the city from the hook payload before applying the follow-up effect."),
			linkToSchema("Buildings", "Useful for the building-complete variant when the follow-up logic keys off a specific building row instead of a project.", "rows"),
			linkToSchema("Projects", "Useful when the completion logic keys off a world or team project instead of a building row.", "rows"),
		],
	},
	{
		title: "War / Peace Transition Hooks",
		focus: "Diplomatic state changes",
		status: "High-Use Recipe",
		copy: "React when teams enter or leave war without polling diplomacy state every turn. This is a good starter pattern for temporary dummy markers, era-like war states, or notifications that only care about the transition itself.",
		deliverables: [
			"A paired “DeclareWar” and “MakePeace” scaffold.",
			"A team-to-player resolve block so team events can still reach major-civ payloads.",
			"A simple state flip example for when the mechanic should turn on at war and turn off at peace.",
		],
		example: {
			title: "War-start and peace-end variants",
			summary: "Teach the war-start payload and the peace cleanup payload separately so the transition logic reads like two clear jobs instead of one combined block.",
			files: [
				snippetFile(
					"Lua/Gameplay/DeclareWarHook.lua",
					"lua",
					`local iDummy = GameInfoTypes.BUILDING_CMC_DUMMY_WAR_STATE

local function getMajorPlayerForTeam(eTeam)
	for iPlayer = 0, GameDefines.MAX_MAJOR_CIVS - 1 do
		local pPlayer = Players[iPlayer]
		if pPlayer and pPlayer:IsAlive() and pPlayer:GetTeam() == eTeam then
			return pPlayer
		end
	end
	return nil
end

local function setCapitalMarker(pPlayer, amount)
	local pCapital = pPlayer and pPlayer:GetCapitalCity()
	if pCapital then
		pCapital:SetNumRealBuilding(iDummy, amount)
	end
end

GameEvents.DeclareWar.Add(function(eFromTeam, eToTeam)
	setCapitalMarker(getMajorPlayerForTeam(eFromTeam), 1)
	setCapitalMarker(getMajorPlayerForTeam(eToTeam), 1)
end)`,
					"War-start variant. Use this when a war-state proxy or notification should turn on exactly when the teams enter war.",
				),
				snippetFile(
					"Lua/Gameplay/MakePeaceHook.lua",
					"lua",
					`local iDummy = GameInfoTypes.BUILDING_CMC_DUMMY_WAR_STATE

local function getMajorPlayerForTeam(eTeam)
	for iPlayer = 0, GameDefines.MAX_MAJOR_CIVS - 1 do
		local pPlayer = Players[iPlayer]
		if pPlayer and pPlayer:IsAlive() and pPlayer:GetTeam() == eTeam then
			return pPlayer
		end
	end
	return nil
end

local function setCapitalMarker(pPlayer, amount)
	local pCapital = pPlayer and pPlayer:GetCapitalCity()
	if pCapital then
		pCapital:SetNumRealBuilding(iDummy, amount)
	end
end

GameEvents.MakePeace.Add(function(eFromTeam, eToTeam)
	setCapitalMarker(getMajorPlayerForTeam(eFromTeam), 0)
	setCapitalMarker(getMajorPlayerForTeam(eToTeam), 0)
end)`,
					"Peace-end variant. Use this when the mechanic should tear down the war-state payload only after peace is actually restored.",
				),
			],
		},
		touchpoints: [
			{ label: "GameEvents.DeclareWar", href: "/lua-api-explorer", note: "Use this to react exactly when the teams enter war." },
			{ label: "GameEvents.MakePeace", href: "/lua-api-explorer", note: "Use this companion hook to tear down the war-state payload cleanly." },
			linkToSchema("Buildings", "Common carrier when war or peace state should flip a hidden city proxy.", "rows"),
			{ label: "Player / Team Lookup Safety", href: "/pattern-library", note: "Useful companion when the team event needs a safer player resolver before applying the effect." },
		],
	},
	{
		title: "City Bought Plot Trigger",
		focus: "Border expansion reactions",
		status: "High-Use Recipe",
		copy: "React when a city buys a tile instead of trying to infer border expansion from later map state. This is a practical place for one-time rewards, improvement placement, or civ-specific plot purchase mechanics.",
		deliverables: [
			"A “CityBoughtPlot” scaffold with city resolution and defensive handling of the returned plot coordinates.",
			"A city lookup using “GetCityByID” so the purchase stays tied to the correct owner city.",
			"A split between safe reward logic for any purchase and direct tile mutation only when the coordinates are trustworthy.",
		],
		example: {
			title: "Purchased-plot variants",
			summary:
				"Use one version for non-gold purchases where the returned coordinates are safer to trust, then a second when every purchase should instead produce a city reward without mutating the terrain.",
			files: [
				snippetFile(
					"Lua/Gameplay/CityBoughtPlotTrigger.lua",
					"lua",
					`local iLandmark = GameInfoTypes.IMPROVEMENT_LANDMARK

GameEvents.CityBoughtPlot.Add(function(iPlayer, iCity, iPlotX, iPlotY, bGold, bFaithOrCulture)
	local pPlayer = Players[iPlayer]
	local pCity = pPlayer and pPlayer:GetCityByID(iCity)
	if bGold or not pPlayer or not pCity then
		return
	end
	local pPlot = Map.GetPlot(iPlotX, iPlotY)
	if not pPlot or pPlot:IsWater() or pPlot:GetImprovementType() ~= -1 then
		return
	end
	pPlot:SetImprovementType(iLandmark)
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, pCity:GetName() .. " improved its newly purchased tile.", "City Bought Plot", iPlotX, iPlotY)
end)`,
					"Practical border-purchase example that only mutates the plot on the non-gold yield, where the returned coordinates are less likely to be the city tile by mistake.",
				),
				snippetFile(
					"Lua/Gameplay/CityBoughtPlotReward.lua",
					"lua",
					`GameEvents.CityBoughtPlot.Add(function(iPlayer, iCity, iPlotX, iPlotY, bGold, bFaithOrCulture)
	local pPlayer = Players[iPlayer]
	local pCity = pPlayer and pPlayer:GetCityByID(iCity)
	if not pPlayer or not pCity then
		return
	end
	pPlayer:ChangeGold(15)
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, pCity:GetName() .. " earned a border-expansion reward.", "City Bought Plot", pCity:GetX(), pCity:GetY())
end)`,
					"Reward-only variant. Use this when the purchased tile itself should stay unchanged and the effect should remain safe even on gold bought plots.",
				),
			],
		},
		touchpoints: [
			linkToLua(
				"GameEvents.CityBoughtPlot",
				"game-event-cityboughtplot-17",
				"gameEvents",
				"Best hook when the effect should happen exactly on a tile purchase, but be careful with the returned plot coordinates on gold buys.",
			),
			linkToLua("Player:GetCityByID", "player-getcitybyid-146", "methods", "Resolve the owner city from the hook before attaching the reward or marker."),
			linkToLua("Plot:SetImprovementType", "plot-setimprovementtype-172", "methods", "Useful when a trusted purchased tile should immediately gain a scripted improvement or marker."),
			linkToSchema("Improvements", "Validate the improvement row used by the purchased-tile follow-up effect.", "rows"),
			linkToPage(
				"Yield Burst Helper",
				"/pattern-library?pattern=yield-burst-helper",
				"Useful companion when the purchased-plot variant should reward the player directly instead of changing the terrain.",
			),
			linkToPage("Map Viewer", "/map-viewer", "Helpful when the border-growth effect depends on terrain context or when you need to visually debug the purchased tile."),
		],
	},
	{
		title: "Religion Founded / Conversion Hooks",
		focus: "Religion-state reactions",
		status: "High-Use Recipe",
		copy: "Use the dedicated religion events when the mechanic cares about a founding moment or a city’s majority religion changing. This keeps the recipe closer to how real religion mods behave than a generic per-turn religion scan.",
		deliverables: [
			"A “ReligionFounded” scaffold for founder rewards or founder-state setup.",
			"A “CityConvertsReligion” scaffold for city-majority changes.",
			"A city-religion check using “GetReligiousMajority” so the follow-up effect can validate the current state before acting.",
		],
		example: {
			title: "Religion hook variants",
			summary: "Split the religion-wide founding moment from the repeatable city-conversion moment so beginners can see that these are different payloads, not one generic religion hook.",
			files: [
				snippetFile(
					"Lua/Gameplay/ReligionFoundedHook.lua",
					"lua",
					`GameEvents.ReligionFounded.Add(function(iPlayer, iCity, eReligion, eBelief1, eBelief2, eBelief3, eBelief4, eBelief5)
	local pPlayer = Players[iPlayer]
	local pCity = pPlayer and pPlayer:GetCityByID(iCity)
	if not pPlayer or not pCity then
		return
	end
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, pCity:GetName() .. " founded a religion.", "Religion Founded", pCity:GetX(), pCity:GetY())
end)`,
					"Religion-founded variant. Use this when the reward is tied to the one-time founder moment or the holy city itself.",
				),
				snippetFile(
					"Lua/Gameplay/CityConvertsReligionHook.lua",
					"lua",
					`GameEvents.CityConvertsReligion.Add(function(iPlayer, eReligion, iPlotX, iPlotY)
	local pPlayer = Players[iPlayer]
	local pPlot = Map.GetPlot(iPlotX, iPlotY)
	local pCity = pPlot and pPlot:GetPlotCity()
	if not pPlayer or not pCity or pCity:GetReligiousMajority() ~= eReligion then
		return
	end
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, pCity:GetName() .. " converted to a new majority religion.", "City Converts Religion", iPlotX, iPlotY)
end)`,
					"City-conversion variant. Use this when the effect should re-fire on local majority changes instead of only on founding.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.ReligionFounded", "game-event-religionfounded-76", "gameEvents", "Use this for the religion-wide founding moment and founder rewards."),
			linkToLua("GameEvents.CityConvertsReligion", "game-event-cityconvertsreligion-29", "gameEvents", "Use this when a city-level reaction should happen on majority religion change."),
			linkToLua("Player:GetCityByID", "player-getcitybyid-146", "methods", "Useful for the founding-side variant where the hook payload gives a city ID instead of direct city coordinates."),
			linkToLua("City:GetReligiousMajority", "city-getreligiousmajority-233", "methods", "Validate the city’s current majority religion before firing the city-side payload."),
			linkToSchema("Religions", "Reference row family for the religion IDs moving through the hook payload.", "rows"),
			linkToPage("Religion Support", "/religion-support", "Useful companion when the hook needs quick religion-name, text-key, or support-pack lookup help."),
			linkToPage(
				"Religion / Belief Condition Check",
				"/pattern-library?pattern=religion-belief-condition-check",
				"Strong companion when the hook needs belief-side or majority-religion eligibility checks before the city reward fires.",
			),
		],
	},
	{
		title: "Minor Friends / Allies Change Trigger",
		focus: "City-state relationship swings",
		status: "High-Use Recipe",
		copy: "React when a player becomes friends with or allies a city-state, or loses that status, without recomputing influence thresholds by hand. This is a practical hook for one-time influence rewards, notifications, or scripted CS support bonuses.",
		deliverables: [
			"A paired “MinorFriendsChanged” and “MinorAlliesChanged” scaffold.",
			"A transition-aware branch that distinguishes gained status from lost status.",
			"A city-state/player resolve pattern that can attach rewards to the player who crossed the threshold.",
		],
		example: {
			title: "Friend and ally threshold variants",
			summary: "Teach the friend-threshold reaction and the ally-threshold reaction separately so the difference in reward size and trigger surface stays obvious.",
			files: [
				snippetFile(
					"Lua/Gameplay/MinorFriendsChangedHook.lua",
					"lua",
					`GameEvents.MinorFriendsChanged.Add(function(iMinor, iPlayer, bGainedLost, iOldValue, iNewValue)
	local pPlayer = Players[iPlayer]
	local pMinor = Players[iMinor]
	if not pPlayer or not pMinor or not bGainedLost then
		return
	end
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "You became friends with " .. pMinor:GetName() .. ".", "Minor Friends Changed", -1, -1)
end)`,
					"Friend-threshold variant. This is the lighter-weight reward case that fires before a full alliance exists.",
				),
				snippetFile(
					"Lua/Gameplay/MinorAlliesChangedHook.lua",
					"lua",
					`GameEvents.MinorAlliesChanged.Add(function(iMinor, iPlayer, bGainedLost, iOldValue, iNewValue)
	local pPlayer = Players[iPlayer]
	local pMinor = Players[iMinor]
	if not pPlayer or not pMinor then
		return
	end
	if bGainedLost then
		pPlayer:ChangeGold(40)
		pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, "You are now allied with " .. pMinor:GetName() .. ".", "Minor Allies Changed", -1, -1)
	end
end)`,
					"Ally-threshold variant. Use this when the bigger relationship milestone should pay out a stronger or different reward.",
				),
			],
		},
		touchpoints: [
			linkToLua("GameEvents.MinorFriendsChanged", "game-event-minorfriendschanged-53", "gameEvents", "Use this for the friend-threshold transition and its one-time reward or message."),
			linkToLua("GameEvents.MinorAlliesChanged", "game-event-minorallieschanged-52", "gameEvents", "Use this for the ally-threshold version of the same relationship swing."),
			linkToSchema("MinorCivilizations", "Reference city-state rows when the reward logic should filter or classify the minor civ involved.", "rows"),
			linkToPage(
				"Notification Utility Wrapper",
				"/pattern-library?pattern=notification-utility-wrapper",
				"Useful companion when the city-state messages should respect local versus world-notification rules.",
			),
			linkToPage(
				"Yield Reward With Scaled Era Output",
				"/pattern-library?pattern=yield-reward-with-scaled-era-output",
				"Pair it with this when friendship or alliance should pay out a scaled yield instead of a flat reward.",
			),
		],
	},
	{
		title: "Unit Promoted Trigger",
		focus: "Promotion-earned reactions",
		status: "High-Use Recipe",
		copy: "React when a unit earns a promotion instead of trying to infer promotion state from later combat or movement hooks. This is a good starter pattern for follow-up rewards, chained promotions, or unit-state saves that only matter after the promotion lands.",
		deliverables: [
			"A “UnitPromoted” scaffold that resolves the promoted unit safely.",
			"A branch keyed off the exact promotion that was chosen.",
			"A follow-up effect that modifies the same unit after the promotion applies.",
		],
		example: {
			title: "Promotion trigger variants",
			summary: "Use one version for chained promotion rewards, then a second when the important reaction is saved state or a notification rather than another promotion.",
			files: [
				snippetFile(
					"Lua/Gameplay/UnitPromotedTrigger.lua",
					"lua",
					`local iTrackedPromotion = GameInfoTypes.PROMOTION_DRILL_1
local iBonusPromotion = GameInfoTypes.PROMOTION_MORALE

GameEvents.UnitPromoted.Add(function(iPlayer, iUnit, ePromotion)
	if ePromotion ~= iTrackedPromotion then
		return
	end
	local pPlayer = Players[iPlayer]
	local pUnit = pPlayer and pPlayer:GetUnitByID(iUnit)
	if not pUnit then
		return
	end
	pUnit:SetHasPromotion(iBonusPromotion, true)
	pPlayer:AddNotification(NotificationTypes.NOTIFICATION_GENERIC, pUnit:GetName() .. " earned a follow-up bonus.", "Unit Promoted", pUnit:GetX(), pUnit:GetY())
end)`,
					"Promotion-earned scaffold that waits for the actual promotion event before layering an extra reward onto the same unit.",
				),
				snippetFile(
					"Lua/Gameplay/UnitPromotedTracker.lua",
					"lua",
					"local promotedUnits = promotedUnits or {}\n\nGameEvents.UnitPromoted.Add(function(iPlayer, iUnit, ePromotion)\n\tpromotedUnits[string.format('%d:%d', iPlayer, iUnit)] = {\n\t\tpromotion = ePromotion,\n\t\tturn = Game.GetGameTurn(),\n\t}\nend)",
					"Tracking variant. Use this when the promotion event should mark runtime state for later logic instead of always granting another immediate bonus.",
				),
			],
		},
		touchpoints: [
			{ label: "GameEvents.UnitPromoted", href: "/lua-api-explorer", note: "Use this when the follow-up effect should happen only after a specific promotion is chosen." },
			linkToLua("Unit:SetHasPromotion", "unit-sethaspromotion-349", "methods", "Common follow-up method when the promoted unit should immediately gain a chained bonus promotion."),
			linkToSchema("UnitPromotions", "Reference the exact promotion rows used by the trigger and the follow-up effect.", "rows"),
			linkToPage(
				"Unit Tracking Table",
				"/pattern-library?pattern=unit-tracking-table",
				"Useful companion when the promotion event should mark runtime state for later mechanics instead of only granting an immediate bonus.",
			),
			{ label: "Promotion Grant / Strip Logic", href: "/pattern-library", note: "Useful companion when the post-promotion effect should be conditional rather than always on." },
		],
	},
	{
		title: "Nearest Valid Plot Finder",
		focus: "Placement resolution",
		status: "High-Use Recipe",
		copy: "Find the closest legal plot for a unit, improvement, or effect without sprinkling raw plot checks everywhere. This is the missing glue between ‘I know the origin city’ and ‘I have a safe target tile.’",
		deliverables: ["A reusable nearest-plot search helper.", "A filter predicate where the mod decides what ‘valid’ means.", "A result pattern that returns the best plot or “nil” cleanly."],
		example: {
			title: "Nearest non-water, non-mountain plot",
			summary: "Pass an origin plot and a predicate into one helper so the search rules stay reusable.",
			files: [
				snippetFile(
					"Lua/Utilities/NearestValidPlot.lua",
					"lua",
					`local function nearestValidPlot(pOrigin, maxRadius, predicate)
	if not pOrigin then
		return nil
	end
	for radius = 0, maxRadius do
		for dx = -radius, radius do
			for dy = -radius, radius do
				local pPlot = Map.PlotXYWithRangeCheck(pOrigin:GetX(), pOrigin:GetY(), dx, dy, radius)
				if pPlot and (not predicate or predicate(pPlot)) then
					return pPlot
				end
			end
		end
	end
	return nil
end

local function isSafeLandPlot(pPlot)
	return pPlot and not pPlot:IsWater() and not pPlot:IsMountain() and not pPlot:IsCity()
end`,
					"Reusable search helper plus one concrete filter predicate for a very common placement rule.",
				),
			],
		},
		touchpoints: [
			{ label: "Plot Search Pattern", href: "/pattern-library", note: "Read this first if the placement rule is still a custom one-off loop rather than a reusable helper." },
			{ label: "Distance + Closest Resolver", href: "/pattern-library", note: "Pair it with this when the search also needs distance comparison or tie-breaking logic." },
			{ label: "Map Viewer", href: "/map-viewer", note: "Use the viewer to sanity-check which plots your predicate should or should not accept." },
		],
	},
	{
		title: "Table Saver / Loader for SaveData",
		focus: "Structured persistence",
		status: "High-Use Recipe",
		copy: "Persist something more useful than a single number or boolean. This recipe gives you a minimal way to flatten and restore table-shaped state so modders can keep track of lists, thresholds, or per-player collections without scattering raw save keys all over the project.",
		deliverables: [
			"A serializer for a small numeric table shape.",
			"A loader that rebuilds the table from one SaveData value.",
			"A naming pattern that keeps the save key easy to inspect and migrate later.",
		],
		example: {
			title: "SaveData table wrapper",
			summary: "Serialize the table into one string, store it under one key, then rebuild it when the gameplay file loads again.",
			files: [
				snippetFile(
					"Lua/Utilities/TableSaveUtils.lua",
					"lua",
					`local ModData = Modding.OpenSaveData()

local function saveNumberTable(key, values)
	local chunks = {}
	for index, value in ipairs(values) do
		chunks[#chunks + 1] = string.format("%d:%d", index, value)
	end
	ModData.SetValue(key, table.concat(chunks, ";"))
end

local function loadNumberTable(key)
	local raw = ModData.GetValue(key)
	local values = {}
	if not raw or raw == "" then
		return values
	end
	for pair in string.gmatch(raw, "[^;]+") do
		local index, value = string.match(pair, "^(%d+):(%-?%d+)$")
		if index and value then
			values[tonumber(index)] = tonumber(value)
		end
	end
	return values
end

return {
	saveNumberTable = saveNumberTable,
	loadNumberTable = loadNumberTable,
}`,
					"Minimal serializer/loader pair for the common case where modders need a small ordered numeric table to survive reloads.",
				),
			],
		},
		touchpoints: [
			{ label: "SaveData Cooldown / Once-Per-City / Once-Per-Player", href: "/pattern-library", note: "Start there when a single key is enough and the data never needs table structure." },
			{ label: "Once-Per-Trigger Guard", href: "/pattern-library", note: "Good companion when the saved table is just one part of a wider trigger-management helper." },
			{ label: "On City Growth Trigger", href: "/pattern-library", note: "Natural consumer when growth tracking grows from one stored integer into a richer per-city state bundle." },
		],
	},
	{
		title: "UI Addin vs UI Override Decision Guide",
		focus: "UI packaging choices",
		status: "High-Use Recipe",
		copy: "Decide whether the feature should plug into an existing Firaxis screen or fully replace one. Many UI bugs come from choosing the wrong packaging model before the “.modinfo” or VFS wiring is even written.",
		deliverables: [
			"A short decision checklist for addins versus overrides.",
			"One “.modinfo” example using an “InGameUIAddin” entry point.",
			"One override example using VFS import and the original Firaxis filename path.",
		],
		example: {
			title: "Addin or override?",
			summary: "Use the checklist first, then compare the manifest shape of an addin with the manifest shape of a full override.",
			files: [
				snippetFile(
					"Docs/UIAddinVsOverride.txt",
					"text",
					`1. Use an addin when your feature can sit beside Firaxis UI without owning the whole screen.
2. Use an override when you must replace the actual Firaxis file and keep the original filename.
3. If another mod should be able to coexist with yours, prefer an addin first.
4. If the feature only needs one panel, icon, or hook, it probably is not an override.
5. If you need the original context to load your file automatically, you probably are in override territory.`,
					"Decision guide for the packaging choice that causes a lot of avoidable UI debugging later.",
				),
				snippetFile(
					".modinfo",
					"xml",
					`<Mod id="55555555-5555-5555-5555-555555555555" version="1">
	<Files>
		<File import="1">Lua/UI/GenericCityInfoAddin.lua</File>
	</Files>
	<EntryPoints>
		<EntryPoint type="InGameUIAddin" file="Lua/UI/GenericCityInfoAddin.lua">
			<Name>CMC City Info Addin</Name>
			<Description>Adds one extra city-info widget without replacing the whole screen.</Description>
		</EntryPoint>
	</EntryPoints>
</Mod>`,
					"Addin-shaped manifest: one file imported, one entry point declared, and no claim on the whole Firaxis context.",
				),
				snippetFile(
					".modinfo",
					"xml",
					`<Mod id="66666666-6666-6666-6666-666666666666" version="1">
	<Files>
		<File import="1">Lua/Overrides/CultureOverview.lua</File>
		<File import="1">Lua/Overrides/CultureOverview.xml</File>
	</Files>
	<Actions>
		<OnModActivated>
			<ImportIntoVFS>Lua/Overrides/CultureOverview.lua</ImportIntoVFS>
			<ImportIntoVFS>Lua/Overrides/CultureOverview.xml</ImportIntoVFS>
		</OnModActivated>
	</Actions>
</Mod>`,
					"Override-shaped manifest: the files go through VFS and the real Firaxis filename/context contract matters.",
				),
			],
		},
		touchpoints: [
			{ label: "CityInfoStack UI Injection", href: "/pattern-library", note: "Read this when the answer is ‘addin’ and the UI only needs to contribute one modular widget." },
			{ label: "UI Override Packaging", href: "/pattern-library", note: "Read this when the answer is ‘override’ and the original Firaxis filenames matter." },
			{ label: ".modinfo Builder", href: "/modinfo-builder", note: "Use the builder to wire the correct UI entry point or VFS imports instead of hand-editing the manifest." },
		],
	},
	{
		title: "Why My Mod Loaded But Did Nothing",
		focus: "Silent failure debugging",
		status: "High-Use Recipe",
		copy: "Debug the specific situation where the mod appears in-game, but none of the intended effects actually happen. The usual culprits are valid-looking data in the wrong file context, a Lua file that never loaded, or a database row that changed nothing because the wrong type key was targeted.",
		deliverables: [
			"A triage order for checking logs, load context, and wrong-key failures.",
			"A minimal proof file for gameplay Lua and a minimal proof row for database updates.",
			"A short symptom checklist that separates ‘loaded’ from ‘actually applied.’",
		],
		example: {
			title: "Loaded but inactive checklist",
			summary: "Start with proof-of-load snippets, then work outward into the real gameplay files once you know which layer is failing.",
			files: [
				snippetFile(
					"Logs/LoadedButInactiveChecklist.txt",
					"text",
					`1. Confirm the SQL or XML file is actually listed in the \`.modinfo\` actions you think it is.
2. Confirm the Lua file is imported into the right context instead of only sitting in the mod folder.
3. Compare the target type key in SQL/XML against the actual database row name.
4. Add one obvious debug notification or \`print()\` line to prove the file loaded.
5. If the mod loads but nothing changes, assume wrong context or wrong key before assuming the game ignored you.`,
					"Targeted checklist for the common ‘the mod is enabled but the mechanic never appears’ failure mode.",
				),
				snippetFile(
					"Lua/Gameplay/ProofOfLoad.lua",
					"lua",
					`print("[CMC] ProofOfLoad.lua executed")

GameEvents.PlayerDoTurn.Add(function(iPlayer)
	print("[CMC] PlayerDoTurn proof hook", iPlayer, Game.GetGameTurn())
end)`,
					"Minimal proof file that tells you whether gameplay Lua is loading at all before you debug the real mechanic.",
				),
				snippetFile(
					"SQL/Debug/ProofRow.sql",
					"sql",
					`UPDATE Buildings
SET Help = 'TXT_KEY_BUILDING_FLOATING_ARCHIVES_HELP'
WHERE Type = 'BUILDING_FLOATING_ARCHIVES';`,
					"Minimal proof row for the database side. If even this does not change anything, the file probably never applied or targeted the wrong key.",
				),
			],
		},
		touchpoints: [
			{ label: "Log & Debug Triage", href: "/pattern-library", note: "Read this first for the broader logging order, then come back here for the silent-failure-specific checks." },
			{ label: "VFS / UI Include Setup", href: "/pattern-library", note: "Use this when the failure is really a file-context problem rather than a bad gameplay row." },
			{ label: "Schema Browser", href: "/schema-browser", note: "Check the exact type keys and target rows when a SQL update looks valid but changes nothing." },
		],
	},
];

export const wizardCards = [
	{
		title: "Civilization Starter",
		stage: "Skeleton Kit",
		copy: "Build a new civ with this starter bundle. Includes the core setup for SQL, game text, Lua, mod-support, leader-scene XML, and the typical project folders. The files reacts to whether the second unique is a unit, building, or improvement.",
		asks: ["Civilization name", "Leader name", "Primary unique unit name", "Required second unique type + name"],
		outputs: [
			"ZIP bundle with “Core”, “Lua”, and “Art/Leaderscene” starter files",
			"“GameDefines”, “GameText”, “ArtDefines”, and “ModSupport” skeletons",
			"Dynamic second-unique SQL and text sections",
		],
		example: {
			title: "Civilization Starter",
			summary: "Starter bundle with generic scaffold of core files in a downloadable ZIP.",
			preview: {
				interactiveKind: "civilization-scaffold",
				formDefaults: {
					civilizationName: "Shambhala",
					leaderName: "Maitreya",
					primaryUniqueUnitName: "Lotus Guard",
					secondUniqueType: "building",
					secondUniqueName: "Kalachakra Hall",
				},
				resultNote: "One ZIP scaffold with the base file tree and generic placeholder content.",
				steps: [
					{
						title: "Civilization identity",
						copy: "Set the civ and leader names that drive the generated keys.",
						fields: [
							{ label: "Civilization name", value: "Shambhala" },
							{ label: "Leader name", value: "Maitreya" },
						],
					},
					{
						title: "Unique loadout",
						copy: "Pick the mandatory unique unit and the required second unique.",
						fields: [
							{ label: "Primary unique", value: "Unit: Lotus Guard" },
							{ label: "Second unique", value: "Building: Kalachakra Hall" },
						],
					},
					{
						title: "Output bundle",
						copy: "Package the core file tree for download.",
						fields: [
							{ label: "Root folder", value: "Shambhala (Maitreya)" },
							{ label: "Files", values: ["Core/*", "Lua/*", "Art/Leaderscene/*"] },
						],
					},
				],
			},
			files: [
				snippetFile(
					"Shambhala (Maitreya)/Core/Shambhala_Maitreya_GameDefines.sql",
					"sql",
					"INSERT INTO Traits (Type, Description, ShortDescription)\nVALUES\n\t('TRAIT_SHAMBHALA_UA', 'TXT_KEY_TRAIT_SHAMBHALA_UA', 'TXT_KEY_TRAIT_SHAMBHALA_UA_SHORT');\n\nINSERT INTO Leaders (Type, Description, Civilopedia, CivilopediaTag, ArtDefineTag, IconAtlas, PortraitIndex)\nVALUES\n\t('LEADER_MAITREYA', 'TXT_KEY_LEADER_MAITREYA', 'TXT_KEY_LEADER_MAITREYA_PEDIA', 'TXT_KEY_CIVILOPEDIA_LEADERS_MAITREYA', 'Maitreya_Scene.xml', 'SHAMBHALA_ICON_ATLAS', 0);\n\n-- Additional civ shell, unique rows, and naming lists generated in the scaffold bundle.",
					"Main core SQL file from the scaffold bundle.",
				),
				snippetFile(
					"Shambhala (Maitreya)/Core/Shambhala_Maitreya_GameText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_CIVILIZATION_ATLAS_EMPIRE_DESC"><Text></Text></Row>\n\t\t<Row Tag="TXT_KEY_LEADER_MAITREYA"><Text></Text></Row>\n\t\t<Row Tag="TXT_KEY_UNIT_ATLAS_EMPIRE_ATLAS_GUARD"><Text></Text></Row>\n\t</Language_en_US>\n</GameData>',
					"Blank text rows all the essential text keys for the civ.",
				),
				snippetFile(
					"Shambhala (Maitreya)/Lua/Shambhala_Maitreya_Functions.lua",
					"lua",
					"local civType = GameInfoTypes.CIVILIZATION_ATLAS_EMPIRE\nlocal leaderType = GameInfoTypes.LEADER_MAITREYA\nlocal traitType = GameInfoTypes.TRAIT_ATLAS_EMPIRE_UA\nlocal primaryUniqueUnitType = GameInfoTypes.UNIT_ATLAS_EMPIRE_ATLAS_GUARD\nlocal secondaryUniqueBuildingType = GameInfoTypes.BUILDING_ATLAS_EMPIRE_ATLAS_HALL\n\nlocal function isScaffoldCiv(player)\n\treturn player and player:IsAlive() and player:GetCivilizationType() == civType\nend\n\n-- TODO: Add civilization ability and unique behavior here.\n",
					"Starter Lua shell with civ, leader, trait, and unique references already wired.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Civilizations", "Core civ shell the scaffold clones and rewires around the generated civ keys.", "rows"),
			linkToSchema("Civilization_Leaders", "Binds the generated leader into the civ package.", "rows"),
			linkToSchema("Leader_Traits", "Attaches the generated trait to the generated leader.", "rows"),
			linkToSchema("Civilization_UnitClassOverrides", "Primary unique unit override table emitted by the scaffold.", "rows"),
			linkToSchema("Civilization_BuildingClassOverrides", "Used only when the optional second unique is a building.", "rows"),
			linkToSchema("Improvements", "Needed when the optional second unique is a tile improvement instead of a building or unit.", "rows"),
			linkToPage(
				"Trait / Leader / Civ Wiring",
				"/pattern-library",
				"Best pattern-library companion for understanding how the scaffold's civ, leader, trait, and text rows fit together once you move past the generated shell.",
			),
			linkToPage(
				"Unique Replacement Setup",
				"/pattern-library",
				"Useful follow-up when the starter's unit or building override rows need to turn into a proper UU or UB with the right class-replacement chain.",
			),
			linkToPage(
				"Dummy Building Scaffold",
				"/pattern-library",
				"Natural next step when the starter civ grows into a trait that needs a hidden building to carry city-level yields, flags, or modifiers.",
			),
			// { label: "Lua API Explorer", href: "/lua-api-explorer", note: "Use it to inspect the nearby player, city, plot, and team helpers the scaffold Lua will usually lean on first." },
			{ label: "Map Viewer", href: "/map-viewer", note: "Useful when the scaffold grows into start-position, region, or map-anchored setup work that needs a quick visual map check." },
		],
	},
	{
		title: "City + Spy Naming",
		stage: "List Builder",
		copy: "Take city and spy lists and emit SQL plus matching game text. In practice, the pack should ship with at least 10 spy names so the civ does not break, and you should usually aim for roughly 30 city names or more.",
		asks: ["Civilization type", "City names, ideally 30+", "Spy names, minimum 10"],
		outputs: [
			"SQL for “Civilization_CityNames” and “Civilization_SpyNames”",
			"“Language_en_US” XML text rows for every generated tag",
			"A naming pack that can drop into a civ project without manual key retyping",
		],
		example: {
			title: "City + Spy naming",
			summary: "Ordered SQL rows plus matching text keys.",
			preview: {
				interactiveKind: "naming-pack",
				formDefaults: {
					civilizationType: "CIVILIZATION_SHAMBHALA",
					cityNames: ["Kalapa"],
					spyNames: ["Lhamo"],
				},
				resultNote: "Append the generated rows into the template generator’s GameDefines and GameText files.",
				steps: [
					{
						title: "Civilization identity",
						copy: "Set the civ key.",
						fields: [
							{ label: "Civilization type", value: "CIVILIZATION_SHAMBHALA" },
							{ label: "Target starter files", value: "*_GameDefines.sql / *_GameText.xml" },
						],
					},
					{
						title: "City list",
						copy: "One city per line.",
						fields: [{ label: "Cities", values: ["Kalapa", "Meru Gate", "Lotus Terrace", "Snow Lion Hold"] }],
					},
					{
						title: "Spy list",
						copy: "One spy per line.",
						fields: [{ label: "Spies", values: ["Tenzin", "Pema", "Dorje", "Lhamo"] }],
					},
				],
			},
			files: [
				snippetFile(
					"Core/<Civ_Leader>_GameDefines.sql",
					"sql",
					"INSERT INTO Civilization_CityNames (CivilizationType, CityName)\nVALUES\n\t('CIVILIZATION_ATLAS', 'TXT_KEY_CITY_NAME_ATLAS_HARBOR'),\n\t('CIVILIZATION_ATLAS', 'TXT_KEY_CITY_NAME_ATLAS_STONEWATCH');\n\nINSERT INTO Civilization_SpyNames (CivilizationType, SpyName)\nVALUES\n\t('CIVILIZATION_ATLAS', 'TXT_KEY_SPY_NAME_ATLAS_0'),\n\t('CIVILIZATION_ATLAS', 'TXT_KEY_SPY_NAME_ATLAS_1');",
					"Append these naming inserts to the template generator’s GameDefines.sql file.",
				),
				snippetFile(
					"Core/<Civ_Leader>_GameText.xml",
					"xml",
					'<GameData>\n\t<Language_en_US>\n\t\t<Row Tag="TXT_KEY_CITY_NAME_ATLAS_HARBOR" Text="Atlas Harbor" />\n\t\t<Row Tag="TXT_KEY_CITY_NAME_ATLAS_STONEWATCH" Text="Stonewatch" />\n\t\t<Row Tag="TXT_KEY_SPY_NAME_ATLAS_0" Text="Mira" />\n\t\t<Row Tag="TXT_KEY_SPY_NAME_ATLAS_1" Text="Sable" />\n\t</Language_en_US>\n</GameData>',
					"Append these Language_en_US rows to the template generator’s GameText.xml file.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Civilization_CityNames", "Main city-name table the generator should populate.", "rows"),
			linkToSchema("Civilization_SpyNames", "Main spy-name table the generator should populate.", "rows"),
			linkToSchema("Language_en_US", "Every generated tag needs a matching localized text row.", "rows"),
			{
				label: "Civilization Starter",
				href: "/template-generators?generator=civilization-scaffold",
				note: "The naming rows are meant to drop into the starter’s GameDefines and GameText files rather than live as a standalone bundle.",
			},
			{
				label: "Text Screen Viewer",
				href: "/text-screen-viewer",
				note: "Useful for checking text-key output and in-game screen fit once the generated city and spy names are localized.",
			},
		],
	},
	{
		title: "Leader Behavior Tuning",
		stage: "Personality Tuning",
		copy: "Tune the leader’s behavior values to determine how the civ responds to in-game actions.",
		asks: ["Leader Name to update", "Leader personality scores", "Major and Minor civ approach biases", "Flavor score matrix"],
		outputs: [
			"“UPDATE Leaders” values for the leader personality fields",
			"“Leader_MajorCivApproachBiases” rows",
			"“Leader_MinorCivApproachBiases” rows",
			"“Leader_Flavors” rows for the full flavor matrix",
		],
		example: {
			title: "Leader CPU tuning bundle",
			summary: "One SQL patch for leader values, bias tables, and the full flavor matrix.",
			preview: {
				interactiveKind: "leader-personality",
				formDefaults: {
					leaderType: "LEADER_MAITREYA",
					personality: {
						VictoryCompetitiveness: 7,
						WonderCompetitiveness: 4,
						MinorCivCompetitiveness: 6,
						Boldness: 9,
						DiploBalance: 6,
						WarmongerHate: 3,
						DenounceWillingness: 8,
						DoFWillingness: 4,
						Loyalty: 3,
						Neediness: 4,
						Forgiveness: 3,
						Chattiness: 6,
						Meanness: 7,
					},
					majorBiases: {
						MAJOR_CIV_APPROACH_WAR: 7,
						MAJOR_CIV_APPROACH_HOSTILE: 6,
						MAJOR_CIV_APPROACH_DECEPTIVE: 7,
						MAJOR_CIV_APPROACH_GUARDED: 4,
						MAJOR_CIV_APPROACH_AFRAID: 2,
						MAJOR_CIV_APPROACH_FRIENDLY: 5,
						MAJOR_CIV_APPROACH_NEUTRAL: 6,
					},
					minorBiases: {
						MINOR_CIV_APPROACH_IGNORE: 4,
						MINOR_CIV_APPROACH_FRIENDLY: 3,
						MINOR_CIV_APPROACH_PROTECTIVE: 4,
						MINOR_CIV_APPROACH_CONQUEST: 7,
						MINOR_CIV_APPROACH_BULLY: 8,
					},
					flavorValues: {
						FLAVOR_OFFENSE: 4,
						FLAVOR_DEFENSE: 5,
						FLAVOR_CITY_DEFENSE: 5,
						FLAVOR_MILITARY_TRAINING: 4,
						FLAVOR_RECON: 5,
						FLAVOR_RANGED: 4,
						FLAVOR_MOBILE: 5,
						FLAVOR_NAVAL: 2,
						FLAVOR_NAVAL_RECON: 2,
						FLAVOR_NAVAL_GROWTH: 2,
						FLAVOR_NAVAL_TILE_IMPROVEMENT: 2,
						FLAVOR_AIR: 3,
						FLAVOR_EXPANSION: 4,
						FLAVOR_GROWTH: 7,
						FLAVOR_TILE_IMPROVEMENT: 6,
						FLAVOR_INFRASTRUCTURE: 6,
						FLAVOR_PRODUCTION: 6,
						FLAVOR_GOLD: 5,
						FLAVOR_SCIENCE: 5,
						FLAVOR_CULTURE: 9,
						FLAVOR_HAPPINESS: 7,
						FLAVOR_GREAT_PEOPLE: 10,
						FLAVOR_WONDER: 8,
						FLAVOR_RELIGION: 9,
						FLAVOR_DIPLOMACY: 6,
						FLAVOR_SPACESHIP: 3,
						FLAVOR_WATER_CONNECTION: 2,
						FLAVOR_NUKE: 1,
						FLAVOR_USE_NUKE: 1,
						FLAVOR_ESPIONAGE: 4,
						FLAVOR_AIRLIFT: 3,
						FLAVOR_I_TRADE_DESTINATION: 5,
						FLAVOR_I_TRADE_ORIGIN: 5,
						FLAVOR_I_SEA_TRADE_ROUTE: 3,
						FLAVOR_I_LAND_TRADE_ROUTE: 6,
						FLAVOR_ARCHAEOLOGY: 8,
						FLAVOR_AIR_CARRIER: 3,
					},
				},
				resultNote: "Append the leader-tuning block into the template generator’s GameDefines file.",
				steps: [
					{
						title: "Leader Name",
						copy: "Pick the leader row this CPU patch should update.",
						fields: [{ label: "Leader Name", value: "LEADER_MAITREYA" }],
					},
					{
						title: "Leader Personality",
						copy: "Tune the diplomacy weights.",
						fields: [
							{ label: "Boldness", value: "9" },
							{ label: "DoF vs Denounce", value: "4 / 8" },
							{ label: "Warmonger hate", value: "3" },
						],
					},
					{
						title: "Approach Biases",
						copy: "Set major-civ and city-state stances.",
						fields: [
							{ label: "Major civ top bias", value: "War" },
							{ label: "Minor civ top bias", value: "Bully" },
						],
					},
					{
						title: "Flavor Priorities",
						copy: "Set the full “Leader_Flavors” matrix the same way you set the bias tables.",
						fields: [{ label: "Highest flavors", values: ["FLAVOR_GREAT_PEOPLE=10", "FLAVOR_CULTURE=9", "FLAVOR_RELIGION=9"] }],
					},
				],
			},
			files: [
				snippetFile(
					"Core/<Civ_Leader>_GameDefines.sql",
					"sql",
					"UPDATE Leaders\nSET\n\tVictoryCompetitiveness = 7,\n\tWonderCompetitiveness = 4,\n\tMinorCivCompetitiveness = 6,\n\tBoldness = 9,\n\tDiploBalance = 6,\n\tWarmongerHate = 3,\n\tDenounceWillingness = 8,\n\tDoFWillingness = 4,\n\tLoyalty = 3,\n\tNeediness = 4,\n\tForgiveness = 3,\n\tChattiness = 6,\n\tMeanness = 7\nWHERE\n\tType = 'LEADER_MAITREYA';\n\n-- Leader_MajorCivApproachBiases\nINSERT INTO\n\tLeader_MajorCivApproachBiases (LeaderType, MajorCivApproachType, Bias)\nVALUES\n\t('LEADER_MAITREYA', 'MAJOR_CIV_APPROACH_WAR', 7),\n\t('LEADER_MAITREYA', 'MAJOR_CIV_APPROACH_HOSTILE', 6),\n\t('LEADER_MAITREYA', 'MAJOR_CIV_APPROACH_DECEPTIVE', 7),\n\t('LEADER_MAITREYA', 'MAJOR_CIV_APPROACH_GUARDED', 4),\n\t('LEADER_MAITREYA', 'MAJOR_CIV_APPROACH_AFRAID', 2),\n\t('LEADER_MAITREYA', 'MAJOR_CIV_APPROACH_FRIENDLY', 5),\n\t('LEADER_MAITREYA', 'MAJOR_CIV_APPROACH_NEUTRAL', 6);\n\n-- Leader_MinorCivApproachBiases\nINSERT INTO\n\tLeader_MinorCivApproachBiases (LeaderType, MinorCivApproachType, Bias)\nVALUES\n\t('LEADER_MAITREYA', 'MINOR_CIV_APPROACH_IGNORE', 4),\n\t('LEADER_MAITREYA', 'MINOR_CIV_APPROACH_FRIENDLY', 3),\n\t('LEADER_MAITREYA', 'MINOR_CIV_APPROACH_PROTECTIVE', 4),\n\t('LEADER_MAITREYA', 'MINOR_CIV_APPROACH_CONQUEST', 7),\n\t('LEADER_MAITREYA', 'MINOR_CIV_APPROACH_BULLY', 8);\n\n-- Leader_Flavors\nINSERT INTO\n\tLeader_Flavors (LeaderType, FlavorType, Flavor)\nVALUES\n\t('LEADER_MAITREYA', 'FLAVOR_OFFENSE', 4),\n\t('LEADER_MAITREYA', 'FLAVOR_DEFENSE', 5),\n\t('LEADER_MAITREYA', 'FLAVOR_CITY_DEFENSE', 5),\n\t('LEADER_MAITREYA', 'FLAVOR_MILITARY_TRAINING', 4),\n\t('LEADER_MAITREYA', 'FLAVOR_RECON', 5),\n\t('LEADER_MAITREYA', 'FLAVOR_RANGED', 4),\n\t('LEADER_MAITREYA', 'FLAVOR_MOBILE', 5),\n\t('LEADER_MAITREYA', 'FLAVOR_NAVAL', 2),\n\t('LEADER_MAITREYA', 'FLAVOR_NAVAL_RECON', 2),\n\t('LEADER_MAITREYA', 'FLAVOR_NAVAL_GROWTH', 2),\n\t('LEADER_MAITREYA', 'FLAVOR_NAVAL_TILE_IMPROVEMENT', 2),\n\t('LEADER_MAITREYA', 'FLAVOR_AIR', 3),\n\t('LEADER_MAITREYA', 'FLAVOR_EXPANSION', 4),\n\t('LEADER_MAITREYA', 'FLAVOR_GROWTH', 7),\n\t('LEADER_MAITREYA', 'FLAVOR_TILE_IMPROVEMENT', 6),\n\t('LEADER_MAITREYA', 'FLAVOR_INFRASTRUCTURE', 6),\n\t('LEADER_MAITREYA', 'FLAVOR_PRODUCTION', 6),\n\t('LEADER_MAITREYA', 'FLAVOR_GOLD', 5),\n\t('LEADER_MAITREYA', 'FLAVOR_SCIENCE', 5),\n\t('LEADER_MAITREYA', 'FLAVOR_CULTURE', 9),\n\t('LEADER_MAITREYA', 'FLAVOR_HAPPINESS', 7),\n\t('LEADER_MAITREYA', 'FLAVOR_GREAT_PEOPLE', 10),\n\t('LEADER_MAITREYA', 'FLAVOR_WONDER', 8),\n\t('LEADER_MAITREYA', 'FLAVOR_RELIGION', 9),\n\t('LEADER_MAITREYA', 'FLAVOR_DIPLOMACY', 6),\n\t('LEADER_MAITREYA', 'FLAVOR_SPACESHIP', 3),\n\t('LEADER_MAITREYA', 'FLAVOR_WATER_CONNECTION', 2),\n\t('LEADER_MAITREYA', 'FLAVOR_NUKE', 1),\n\t('LEADER_MAITREYA', 'FLAVOR_USE_NUKE', 1),\n\t('LEADER_MAITREYA', 'FLAVOR_ESPIONAGE', 4),\n\t('LEADER_MAITREYA', 'FLAVOR_AIRLIFT', 3),\n\t('LEADER_MAITREYA', 'FLAVOR_I_TRADE_DESTINATION', 5),\n\t('LEADER_MAITREYA', 'FLAVOR_I_TRADE_ORIGIN', 5),\n\t('LEADER_MAITREYA', 'FLAVOR_I_SEA_TRADE_ROUTE', 3),\n\t('LEADER_MAITREYA', 'FLAVOR_I_LAND_TRADE_ROUTE', 6),\n\t('LEADER_MAITREYA', 'FLAVOR_ARCHAEOLOGY', 8),\n\t('LEADER_MAITREYA', 'FLAVOR_AIR_CARRIER', 3);",
					"Append this leader-tuning block to the template generator’s GameDefines.sql file.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Leaders", "Core leader row with personality values and icon atlas reference.", "rows"),
			linkToSchema("Leader_MajorCivApproachBiases", "Major-civ diplomatic stance table.", "rows"),
			linkToSchema("Leader_MinorCivApproachBiases", "City-state diplomatic stance table.", "rows"),
			linkToSchema("Leader_Flavors", "Flavor weights that shape build and strategic priorities.", "rows"),
			linkToPage(
				"Trait Driven Lua Effect",
				"/pattern-library?pattern=trait-driven-lua-effect",
				"Useful companion when CPU tuning is only part of a broader leader mechanic that still needs scripted trait logic.",
			),
			linkToPage("Schema Browser", "/schema-browser?table=Leader_Flavors&tab=rows", "Best next stop when you want to inspect adjacent flavor rows and compare the tuning against base leaders."),
		],
	},
	{
		title: "Art + Audio Setup",
		stage: "Art Defines",
		copy: "Fill out the starter ArtDefines file with civ colors, atlas registration, leader music, unit art clones, and optional improvement or feature art rows.",
		asks: [
			"Civilization + leader names",
			"Saved civ colors from Civ Icon Maker",
			"Atlas settings carried over from DDS Converter",
			"Optional unit art clone setup",
			"Optional improvement or feature art setup",
		],
		outputs: [
			"Identity rows for “Colors”, “PlayerColors”, and “IconTextureAtlases”",
			"Leader music rows for “Audio_Sounds” and “Audio_2DSounds”",
			"Optional unit art clone rows for one unique unit",
			"Optional landmark or feature art rows with strategic-view support",
		],
		example: {
			title: "Art + audio identity bundle",
			summary: "Starter ArtDefines output with shared civ colors, atlas registration, leader music, and optional art rows.",
			preview: {
				interactiveKind: "art-audio-bundle",
				formDefaults: {
					civilizationName: "Shambhala",
					leaderName: "Maitreya",
					unitName: "Lotus Guard",
					unitBaseArtType: "ART_DEF_UNIT_WW1_INFANTRY",
					unitBaseMemberType: "ART_DEF_UNIT_MEMBER_WW1_INFANTRY",
					unitModelFile: "shambhala_lotus_guard.fxsxml",
					landmarkName: "Lotus Sanctuary",
					landmarkKind: "improvement",
					landmarkModelFile: "shambhala_lotus_sanctuary.fxsxml",
					landmarkStrategicAsset: "shambhala_lotus_sanctuary_sref.dds",
				},
				resultNote: "Append the generated sections into the template generator’s ArtDefines file. Civ colors and atlas shape defaults carry over from the other tools when available.",
				steps: [
					{
						title: "Identity assets",
						copy: "Set civ identity rows, atlas registration, and shared colors.",
						fields: [
							{ label: "Civilization name", value: "Shambhala" },
							{ label: "Leader name", value: "Maitreya" },
						],
					},
					{
						title: "Leader audio",
						copy: "Register peace and war tracks for the leader scene.",
						fields: [{ label: "Audio bundle", values: ["Audio_Sounds", "Audio_2DSounds"] }],
					},
					{
						title: "Unit art",
						copy: "Clone a base unit art define chain for one unique unit.",
						fields: [{ label: "Unit art clone", value: "WW1 Infantry -> Lotus Guard" }],
					},
					{
						title: "Landmark / feature art",
						copy: "Optionally scaffold improvement or feature art rows.",
						fields: [{ label: "Landmark type", value: "Improvement" }],
					},
				],
			},
			files: [
				snippetFile(
					"Core/<Civ_Leader>_ArtDefines.sql",
					"sql",
					"-- Colors\nINSERT INTO Colors (Type, Red, Green, Blue, Alpha)\nVALUES\n\t('COLOR_PLAYER_SHAMBHALA_ICON', 0.12, 0.31, 0.60, 1),\n\t('COLOR_PLAYER_SHAMBHALA_BACKGROUND', 0.96, 0.87, 0.60, 1);\n\n-- Audio_Sounds\nINSERT INTO Audio_Sounds (SoundID, Filename, LoadType)\nVALUES\n\t('SND_LEADER_MUSIC_SHAMBHALA_MAITREYA_PEACE', 'Shambhala_Maitreya_Peace', 'DynamicResident'),\n\t('SND_LEADER_MUSIC_SHAMBHALA_MAITREYA_WAR', 'Shambhala_Maitreya_War', 'DynamicResident');",
					"Append this generated block to the template generator’s ArtDefines.sql file.",
				),
			],
		},
		touchpoints: [
			linkToSchema("Colors", "Civ color rows that feed PlayerColors and icon tint usage.", "rows"),
			linkToSchema("PlayerColors", "Hooks the civ color pair into the main civ row.", "rows"),
			linkToSchema("IconTextureAtlases", "Atlas registration uses the same shapes chosen in the DDS converter.", "rows"),
			linkToSchema("Audio_Sounds", "Leader peace and war sound IDs and filenames.", "rows"),
			linkToSchema("Audio_2DSounds", "Leader music script rows that bind the sound IDs.", "rows"),
			linkToSchema("ArtDefine_UnitInfos", "Top-level unit art clone entry for a unique unit.", "rows"),
			linkToSchema("ArtDefine_Landmarks", "Improvement and feature art rows for landmark-style assets.", "rows"),
			linkToSchema("ArtDefine_StrategicView", "Strategic view rows for units, improvements, or features.", "rows"),
			linkToPage(
				"Civilopedia + Art Define Wiring",
				"/pattern-library",
				"Good companion when the generated art rows also need the supporting Civilopedia-facing art and icon registrations to stay in sync.",
			),
			linkToPage("Audio Hook Setup", "/pattern-library", "Use this when the art bundle's leader music rows need to expand into a fuller audio registration and playback workflow."),
			linkToPage("Leader / Civ Music Setup", "/pattern-library", "Best pattern-library match for carrying the generated peace and war music rows into a complete leader-scene music setup."),
			{ label: "Civ Icon Maker", href: "/civ-icon-maker", note: "Saved civ colors carry directly into the generated Colors and PlayerColors rows." },
			{ label: "DDS Converter", href: "/dds-converter", note: "Atlas rows, columns, and selected sizes seed the IconTextureAtlases output." },
			{ label: ".modinfo Builder", href: "/modinfo-builder", note: "Use it when the registered art or audio files also need import actions and manifest wiring." },
		],
	},
];

export const guardrails = [
	{
		title: "Real schema tables only",
		copy: "Generators should only emit rows for confirmed Civ V tables like ‘Civilization_CityNames’, ‘Civilization_SpyNames’, ‘Leaders’, ‘Leader_Traits’, and ‘IconTextureAtlases’, not guessed structures.",
		source: "Schema Browser",
	},
	{
		title: "Text keys ship with data",
		copy: "If a generator emits “TXT_KEY_” references, it should also emit the matching ‘Language_en_US’ rows in the same pass.",
		source: "Schema Browser + localization workflow",
	},
	{
		title: "Scaffolds should stay generic",
		copy: "Starter bundles should use generated keys, blank text rows, and obvious placeholder values so the output is safe to customize rather than pretending to be final content.",
		source: "Land of Snows scaffold pattern",
	},
	{
		title: "Leader behavior stays split cleanly",
		copy: "Leader builders should keep the “Leaders” row and “Leader_Traits” link in XML, then emit approach biases and flavor weights in separate SQL blocks that are easy to retune.",
		source: "Leaders + Leader_Traits + leader bias tables",
	},
	{
		title: "Starter ZIPs should skip mod packaging",
		copy: "The civ starter should stop at base project files and avoid bundling “.modinfo” or “Credits.txt”, since those are usually edited separately once the core shell is stable.",
		source: "Land of Snows project layout",
	},
];

export const implementationStages = [
	{
		label: "Stage 1",
		title: "Ship the civ starter first",
		copy: "The biggest time saver is one downloadable civ starter bundle that covers the folder layout, core SQL shell, blank text, and starter Lua all at once.",
	},
	{
		label: "Stage 2",
		title: "Keep leader tuning separate",
		copy: "Leader CPU values still deserve their own focused builder so behavior tuning can happen without touching the full civilization shell each time.",
	},
	{
		label: "Stage 3",
		title: "Expand into compatibility later",
		copy: "After the civ shell and leader tuning are stable, the next useful layer is dedicated compatibility or mod-support generation.",
	},
];

export const internalCrossLinks = [
	{
		title: "Schema Browser",
		copy: "Best source for validating that generated rows target real Civ V tables and columns before they ever leave the wizard.",
		links: [{ label: "Open Schema Browser", href: "/schema-browser" }],
		planned: ["Naming table hints", "Leader bias table cross-links", "Text-table cross-links"],
	},
	{
		title: "Civ Icon Maker",
		copy: "Existing art tool that should hand atlas filenames and portrait expectations directly into the registration builder.",
		links: [{ label: "Open Civ Icon Maker", href: "/civ-icon-maker" }],
		planned: ["Atlas handoff", "Portrait index handoff"],
	},
	{
		title: "DDS Converter",
		copy: "Existing converter that should stay in the art loop so generated atlas rows match the actual texture outputs users produce on-site.",
		links: [{ label: "Open DDS Converter", href: "/dds-converter" }],
		planned: ["File-size handoff", "Filename handoff"],
	},
	{
		title: "ModInfo Builder",
		copy: "Once the data and art packs are generated, packaging should continue into the site’s existing build and project wiring tools.",
		links: [{ label: "ModInfo Builder", href: "/modinfo-builder" }],
		planned: ["Generated-file handoff", "Split XML + SQL action reminders"],
	},
];

export const datasetNotes = [
	"Schema snapshot includes 1,663 “Civilization_CityNames” rows and 430 “Civilization_SpyNames” rows for pattern checking and output validation.",
	"Schema snapshot also includes 44 “Leaders”, 301 “Leader_MajorCivApproachBiases”, 215 “Leader_MinorCivApproachBiases”, and 1,659 “Leader_Flavors” rows for bias and flavor pattern checking.",
	"Archive mods in the local reference folder show both SQL and XML naming-pack styles, grouped atlas registration XML, and the common XML-plus-SQL split for custom leader setup.",
];

export const internalDocLanes = [
	{
		title: "Gameplay Hook Docs",
		copy: "Internal docs for event families, callback signatures, return behavior, and when to use GameEvents, Events, or LuaEvents.",
		links: [
			{ label: "Pattern Library", href: "/pattern-library" },
			{ label: "Lua API Explorer", href: "/lua-api-explorer" },
			{ label: "Template Generators", href: "/template-generators" },
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
			{ label: "Pattern Library", href: "/pattern-library" },
			{ label: "Community Links", href: "/community-links" },
		],
		planned: ["Localization docs", "Markup guide"],
	},
	{
		title: "Project Setup Docs",
		copy: "Internal guides for VFS, project actions, debug logging, and common failure patterns that can reference both recipes and first-party browsers.",
		links: [
			{ label: "ModInfo Builder", href: "/modinfo-builder" },
			{ label: "Template Generators", href: "/template-generators" },
		],
		planned: ["Debug playbook", "VFS guide"],
	},
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
