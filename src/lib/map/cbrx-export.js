const DEFAULT_TABLE_NAME = "Civilization_TSLs";

function normalizeCivKey(value) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function buildDefaultGameDefineName(value) {
	const trimmed = String(value || "").trim();
	if (!trimmed) {
		return "";
	}
	const normalized = trimmed
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
	return `CIVILIZATION_${normalized}`;
}

function md5Hex(input) {
	const data = new TextEncoder().encode(String(input || ""));
	const bytes = Array.from(data);
	const toHex = (value) => value.toString(16).padStart(2, "0");

	const rotateLeft = (value, shift) => ((value << shift) | (value >>> (32 - shift))) >>> 0;
	const add32 = (a, b) => (a + b) >>> 0;

	const s = [
		7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21,
		6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
	];

	const k = new Array(64).fill(0).map((_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);

	const originalBitLen = bytes.length * 8;
	bytes.push(0x80);
	while (bytes.length % 64 !== 56) {
		bytes.push(0);
	}
	for (let i = 0; i < 8; i += 1) {
		bytes.push((originalBitLen >>> (8 * i)) & 0xff);
	}

	let a0 = 0x67452301;
	let b0 = 0xefcdab89;
	let c0 = 0x98badcfe;
	let d0 = 0x10325476;

	for (let offset = 0; offset < bytes.length; offset += 64) {
		const m = new Array(16).fill(0);
		for (let i = 0; i < 16; i += 1) {
			const start = offset + i * 4;
			m[i] = bytes[start] | (bytes[start + 1] << 8) | (bytes[start + 2] << 16) | (bytes[start + 3] << 24);
		}

		let a = a0;
		let b = b0;
		let c = c0;
		let d = d0;

		for (let i = 0; i < 64; i += 1) {
			let f = 0;
			let g = 0;

			if (i < 16) {
				f = (b & c) | (~b & d);
				g = i;
			} else if (i < 32) {
				f = (d & b) | (~d & c);
				g = (5 * i + 1) % 16;
			} else if (i < 48) {
				f = b ^ c ^ d;
				g = (3 * i + 5) % 16;
			} else {
				f = c ^ (b | ~d);
				g = (7 * i) % 16;
			}

			const temp = d;
			d = c;
			c = b;
			const sum = add32(add32(a, f), add32(k[i], m[g]));
			b = add32(b, rotateLeft(sum, s[i]));
			a = temp;
		}

		a0 = add32(a0, a);
		b0 = add32(b0, b);
		c0 = add32(c0, c);
		d0 = add32(d0, d);
	}

	const result = [a0, b0, c0, d0]
		.map((value) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff])
		.flat()
		.map(toHex)
		.join("")
		.toUpperCase();

	return result;
}

function parseIslandFlag(value) {
	if (value === true) {
		return true;
	}
	if (value === false || value === null || value === undefined) {
		return false;
	}
	if (typeof value === "number") {
		return value === 1;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
	}
	return false;
}

function sqlEscape(value) {
	return String(value || "").replace(/'/g, "''");
}

function sortPins(pins, sortMode) {
	const mode = String(sortMode || "")
		.trim()
		.toLowerCase();
	if (mode === "coords") {
		return [...pins].sort((a, b) => {
			if (a.col !== b.col) {
				return a.col - b.col;
			}
			if (a.row !== b.row) {
				return a.row - b.row;
			}
			return a.civ.localeCompare(b.civ);
		});
	}
	if (mode === "none") {
		return [...pins];
	}
	return [...pins].sort((a, b) => {
		const civCompare = a.civ.localeCompare(b.civ);
		if (civCompare !== 0) {
			return civCompare;
		}
		if (a.col !== b.col) {
			return a.col - b.col;
		}
		return a.row - b.row;
	});
}

export function normalizePinsForExport(input) {
	if (!Array.isArray(input)) {
		return [];
	}

	const seen = new Set();
	const pins = [];

	for (let index = 0; index < input.length; index += 1) {
		const candidate = input[index];
		if (!candidate || typeof candidate !== "object") {
			continue;
		}

		const civ = String(candidate.civ || "").trim();
		if (!civ) {
			continue;
		}

		const gameDefineName = String(candidate.gameDefineName || "").trim() || buildDefaultGameDefineName(civ);
		const col = Number(candidate.col);
		const row = Number(candidate.row);
		if (!Number.isFinite(col) || !Number.isFinite(row)) {
			continue;
		}

		const normalizedCol = Math.floor(col);
		const normalizedRow = Math.floor(row);
		const civKey = normalizeCivKey(civ);
		const dedupeKey = `${normalizedCol},${normalizedRow}:${civKey}`;
		if (seen.has(dedupeKey)) {
			continue;
		}
		seen.add(dedupeKey);

		pins.push({
			civ,
			gameDefineName,
			col: normalizedCol,
			row: normalizedRow,
			isIsland: parseIslandFlag(candidate.isIsland),
		});
	}

	return pins;
}

export function findDuplicateCivs(pins) {
	if (!Array.isArray(pins)) {
		return [];
	}

	const counts = new Map();
	for (const pin of pins) {
		const key = normalizeCivKey(pin?.civ || "");
		if (!key) {
			continue;
		}
		if (!counts.has(key)) {
			counts.set(key, { civ: String(pin.civ || ""), count: 1 });
			continue;
		}
		const entry = counts.get(key);
		entry.count += 1;
	}

	return Array.from(counts.values())
		.filter((entry) => entry.count > 1)
		.sort((a, b) => a.civ.localeCompare(b.civ));
}

export function buildCbrxTslSql(options = {}) {
	const tableName = String(options.tableName || DEFAULT_TABLE_NAME).trim() || DEFAULT_TABLE_NAME;
	const normalizedPins = normalizePinsForExport(options.pins || []);
	const sortedPins = sortPins(normalizedPins, options.sortMode);
	const lines = [];

	lines.push(`-- ${tableName} SQL`);
	lines.push("CREATE TABLE IF NOT EXISTS");
	lines.push(`${tableName} (`);
	lines.push("    CivilizationType\ttext\t\tdefault null,");
	lines.push("\tX\t\t\t\t\tinteger\t\tdefault -1,");
	lines.push("\tY\t\t\t\t\tinteger\t\tdefault -1,");
	lines.push("\tIsIsland\t\tboolean\t\tdefault 0);");

	if (!sortedPins.length) {
		lines.push("-- No civilization pins available for export.");
		return lines.join("\n");
	}

	lines.push("\n");
	lines.push(`INSERT INTO ${tableName} `);
	lines.push("\t(CivilizationType,\tX,\tY,\tIsIsland)");
	lines.push("VALUES");

	sortedPins.forEach((pin, index) => {
		const isLast = index === sortedPins.length - 1;
		const suffix = isLast ? ";" : ",";
		const islandValue = pin.isIsland ? 1 : 0;
		const comment = index === 0 ? " --0 (default) = false, 1 = true" : "";
		lines.push(`\t('${sqlEscape(pin.gameDefineName || buildDefaultGameDefineName(pin.civ))}',\t${pin.col},\t${pin.row},\t${islandValue})${suffix}${comment}`);
	});

	lines.push("\n");
	lines.push("INSERT INTO Technologies");
	lines.push("\t\t(Type,\t\t\t\t\tCost,\tDescription,\t\t\t\t\t\t\tEra,\t\t\tGridX,\tGridY,\tPortraitIndex,\tIconAtlas,\t\t\t\tDisable,\tCivilopedia,\t\t\t\t\t\t\tHelp,\t\t\t\t\t\t\t\tQuote)");
	lines.push(
		"VALUES  ('TECH_CBR_OBSERVER',\t-1,\t\t'TXT_KEY_TECH_CBR_OBSERVER_TITLE',\t\t'ERA_ANCIENT',\t-1,\t\t-1,\t\t0,\t\t\t\t'NEB_CIV_COLOR_ATLAS',\t1,\t\t\t'TXT_KEY_TECH_CBR_OBSERVER_DESC',\t'TXT_KEY_TECH_CBR_OBSERVER_HELP',\t'TXT_KEY_TECH_CBR_OBSERVER_QUOTE');",
	);

	return lines.join("\n");
}

const LUA_TEMPLATE = `--g_Civilization_CBRX_TSLs_Table
local g_Civilization_CBRX_TSLs_Table = {}
local g_Civilization_CBRX_TSLs_Count = 1
local g_Civilization_CBRX_TerrainChanges_Table = {}
local g_Civilization_CBRX_Visibilities_Table = {}
for row in DB.Query("SELECT * FROM __TSL_TABLE__;") do
\tg_Civilization_CBRX_TSLs_Table[g_Civilization_CBRX_TSLs_Count] = row
\tg_Civilization_CBRX_TSLs_Count = g_Civilization_CBRX_TSLs_Count + 1
end

local Units = {
\tWorker = GameInfoTypes["UNIT_WORKER"],
\tWarrior = GameInfoTypes["UNIT_WARRIOR"],
\tArcher = GameInfoTypes["UNIT_ARCHER"],
\tWorkBoat = GameInfoTypes["UNIT_WORKBOAT"],
\tTrireme = GameInfoTypes["UNIT_TRIREME"],
\tNuclearSubmarine = GameInfoTypes["UNIT_NUCLEAR_SUBMARINE"],
\tCybersub = GameInfoTypes["UNIT_FW_CYBERSUB"],
}

local Optics = GameInfoTypes["TECH_OPTICS"]

local observerTechs = {
\tGameInfoTypes["TECH_SAILING"],
\tGameInfoTypes["TECH_POTTERY"],
\tGameInfoTypes["TECH_TRAPPING"],
\tGameInfoTypes["TECH_MINING"],
\tGameInfoTypes["TECH_AGRICULTURE"],
\tGameInfoTypes["TECH_ARCHERY"]
}

local observerTech = GameInfoTypes["TECH_CBR_OBSERVER"]

local fwModID = "d9ece224-6cd8-4519-a27a-c417b59cdf35"

function setTSLs()
\tlocal iMapWidth, iMapHeight = __MAP_WIDTH__, __MAP_HEIGHT__
\tlocal currentMapWidth, currentMapHeight = Map.GetGridSize()
\tlocal isUsingFW = false

\tif currentMapWidth ~= iMapWidth or currentMapHeight ~= iMapHeight then
\t\tprint("TSLs will not be set: Map dimensions do not match requirements.")
\t\treturn
\tend

\tif Game.GetGameTurn() > 2 then
\t\tprint("Game has already started. TSLs will not be set.")
\t\treturn
\tend

\tif Game.CountKnownTechNumTeams(observerTech) > 0 then
\t\tprint("Observer has sentience, all done.")
\t\treturn
\tend

\tfor currentPlayer = 0, GameDefines.MAX_MAJOR_CIVS - 1, 1 do
\t\tlocal player = Players[currentPlayer]
\t\tif not player then return end

\t\tlocal civType = GameInfo.Civilizations[player:GetCivilizationType()].Type
\t\tlocal Team = Teams[player:GetTeam()]
\t\t
\t\tlocal hasTSL = false
\t\tlocal startX = -1
\t\tlocal startY = -1
\t\tlocal isIsland = false
\t\t
\t\t--g_Civilization_CBRX_TSLs_Table
\t\tlocal civTSLTable = g_Civilization_CBRX_TSLs_Table
\t\tfor index = 1, #civTSLTable do
\t\t\tlocal row = civTSLTable[index]
\t\t\tif row.CivilizationType == civType then
\t\t\t\thasTSL = true
\t\t\t\tstartX = row.X
\t\t\t\tstartY = row.Y
\t\t\t\tisIsland = row.IsIsland\t
\t\t\tend
\t\tend
\t\t
\t\tif hasTSL then
\t\t\tprint("TSL Set: " .. civType)

\t\t\t-- local startX = cbrxTSLs[civType].X
\t\t\t-- local startY = cbrxTSLs[civType].Y

\t\t\t-- Give starting base techs
\t\t\tfor _, tech in ipairs(observerTechs) do
\t\t\t\tTeam:SetHasTech(tech, true)
\t\t\tend
\t\t\t
\t\t\t-- Spawn default extra units
\t\t\tlocal unitList = { Units.Worker, Units.Archer, Units.Archer }
\t\t\tfor _, unit in ipairs(unitList) do
\t\t\t\tplayer:InitUnit(unit, startX, startY)
\t\t\tend

\t\t\t-- Handle Island Civilizations
\t\t\tif isIsland then
\t\t\t\tTeam:SetHasTech(Optics, true)

\t\t\t\t-- Replace Warriors with Triremes
\t\t\t\tfor unit in player:Units() do
\t\t\t\t\tif unit:GetUnitType() == Units.Warrior then
\t\t\t\t\t\tlocal newTrireme = player:InitUnit(Units.Trireme, unit:GetX(), unit:GetY())
\t\t\t\t\t\tnewTrireme:JumpToNearestValidPlot()
\t\t\t\t\t\tunit:Kill(-1)
\t\t\t\t\tend
\t\t\t\tend
\t\t\t\t
\t\t\t\t-- for _ = 1, 2 do
\t\t\t\t\t-- local warrior = player:InitUnit(Units.Warrior, startX, startY)
\t\t\t\t\t-- local newTrireme = player:InitUnit(Units.Trireme, warrior:GetX(), warrior:GetY())
\t\t\t\t\t-- newTrireme:JumpToNearestValidPlot()
\t\t\t\t\t-- warrior:Kill(-1)
\t\t\t\t-- end

\t\t\t\t-- Replace Workers with Workboats
\t\t\t\tfor unit in player:Units() do
\t\t\t\t\tif unit:GetUnitType() == Units.Worker then
\t\t\t\t\t\tlocal newWorkBoat = player:InitUnit(Units.WorkBoat, unit:GetX(), unit:GetY())
\t\t\t\t\t\tnewWorkBoat:JumpToNearestValidPlot()
\t\t\t\t\t\tunit:Kill(-1)
\t\t\t\t\t\tbreak
\t\t\t\t\tend
\t\t\t\tend
\t\t\tend

\t\t\t-- Move all units to TSL coordinates
\t\t\tlocal isFirstSettler = false
\t\t\tfor unit in player:Units() do
\t\t\t\tunit:SetXY(startX, startY)
\t\t\tend

\t\t\t-- Hide pre-TSL plot visibility
\t\t\tlocal startingPlot = player:GetStartingPlot()
\t\t\tif startingPlot then
\t\t\t\tlocal visibilityRange = 4
\t\t\t\tfor dx = -visibilityRange, visibilityRange do
\t\t\t\t\tfor dy = -visibilityRange, visibilityRange do
\t\t\t\t\t\tlocal plot = Map.GetPlotXY(startingPlot:GetX(), startingPlot:GetY(), dx, dy)
\t\t\t\t\t\tif plot then
\t\t\t\t\t\t\tplot:ChangeVisibilityCount(Team:GetID(), -1, -1, true, true)
\t\t\t\t\t\t\tplot:SetRevealed(Team:GetID(), false)
\t\t\t\t\t\t\tplot:UpdateFog()
\t\t\t\t\t\tend
\t\t\t\t\tend
\t\t\t\tend
\t\t\tend
\t\t\t
\t\t\t--Gib new Visibilities
\t\t\t--g_Civilization_CBRX_Visibilities_Table
\t\t\tlocal civVisibTable = g_Civilization_CBRX_Visibilities_Table[civType]
\t\t\tfor index = 1, #civVisibTable do
\t\t\t\tlocal row = civVisibTable[index]
\t\t\t\tif row.CivilizationType == civType then
\t\t\t\t\tlocal plot = Map.GetPlot(row.X, row.Y)
\t\t\t\t\tif plot and (not plot:IsVisible(Team:GetID())) then
\t\t\t\t\t\tplot:ChangeVisibilityCount(Team:GetID(), 1, -1, true, true)
\t\t\t\t\t\tplot:SetRevealed(Team:GetID(), true)
\t\t\t\t\t\tplot:UpdateFog()
\t\t\t\t\tend
\t\t\t\tend
\t\t\tend

\t\t\t-- Remove Observer units + full map reveal
\t\t\tif civType == "CIVILIZATION_BABYLON" then
\t\t\t\tfor _, mod in pairs(Modding.GetActivatedMods()) do
\t\t\t\t\tif (mod.ID == fwModID) then
\t\t\t\t\t\tisUsingFW = true
\t\t\t\t\t\tbreak
\t\t\t\t\tend
\t\t\t\tend

\t\t\t\tlocal unitNOTToKill = Units.NuclearSubmarine
\t\t\t\tif isUsingFW then
\t\t\t\t\tunitNOTToKill = Units.Cybersub
\t\t\t\t\tplayer:InitUnit(unitNOTToKill, startX, startY)
\t\t\t\telse
\t\t\t\t\tplayer:InitUnit(unitNOTToKill, startX, startY)
\t\t\t\tend

\t\t\t\tfor unit in player:Units() do
\t\t\t\t\tif unit:GetUnitType() ~= unitNOTToKill then
\t\t\t\t\t\tunit:Kill(-1)
\t\t\t\t\tend
\t\t\t\tend

\t\t\t\t-- for plotIndex = 0, Map.GetNumPlots() - 1 do
\t\t\t\t-- \tlocal plot = Map.GetPlotByIndex(plotIndex)
\t\t\t\t-- \tplot:ChangeVisibilityCount(Team:GetID(), 1, -1, true, true)
\t\t\t\t-- \tplot:SetRevealed(Team:GetID(), true)
\t\t\t\t-- end
\t\t\tend

\t\t\t--Give the Observer the Observer Dummy Tech
\t\t\tlocal teamTechs = Team:GetTeamTechs()
\t\t\tteamTechs:SetHasTech(observerTech, true)
\t\tend
\tend

\t-- Update the game visibility for all civs
\tGame.UpdateFOW(true)
\tUI.RequestMinimapBroadcast()
end
if Game.CountKnownTechNumTeams(observerTech) == 0 then
\tEvents.SequenceGameInitComplete.Add(setTSLs)
end

`;

export function buildCbrxTslLua(options = {}) {
	const width = Number.isFinite(Number(options.width)) ? Math.floor(Number(options.width)) : 0;
	const height = Number.isFinite(Number(options.height)) ? Math.floor(Number(options.height)) : 0;
	const tableName = String(options.tableName || DEFAULT_TABLE_NAME).trim() || DEFAULT_TABLE_NAME;
	return LUA_TEMPLATE.replace(/__MAP_WIDTH__/g, String(width))
		.replace(/__MAP_HEIGHT__/g, String(height))
		.replace(/__TSL_TABLE__/g, tableName);
}

export function buildTslModInfo(options = {}) {
	const modId = String(options.modId || "").trim() || "00000000-0000-0000-0000-000000000000";
	const modVersion = Number.isFinite(Number(options.version)) ? Math.floor(Number(options.version)) : 1;
	const name = String(options.name).trim();
	const teaser = String(options.teaser).trim();
	const description = String(options.description).trim();
	const authors = String(options.authors).trim();
	const sqlFile = String(options.sqlFile || "TSLs.sql").trim();
	const luaFile = String(options.luaFile || "TSLs_updated.lua").trim();
	const sqlContent = String(options.sqlContent || "");
	const luaContent = String(options.luaContent || "");
	const sqlMd5 = md5Hex(sqlContent);
	const luaMd5 = md5Hex(luaContent);

	return [
		'<?xml version="1.0" encoding="utf-8"?>',
		`<Mod id="${modId}" version="${modVersion}">`,
		"  <Properties>",
		`    <Name>${name}</Name>`,
		`    <Teaser>${teaser}</Teaser>`,
		`    <Description>${description}</Description>`,
		`    <Authors>${authors}</Authors>`,
		"    <HideSetupGame>0</HideSetupGame>",
		"    <AffectsSavedGames>1</AffectsSavedGames>",
		"    <SupportsSinglePlayer>1</SupportsSinglePlayer>",
		"    <SupportsMultiplayer>1</SupportsMultiplayer>",
		"    <SupportsHotSeat>1</SupportsHotSeat>",
		"    <SupportsMac>1</SupportsMac>",
		"  </Properties>",
		"  <Files>",
		`    <File md5="${sqlMd5}" import="0">${sqlFile}</File>`,
		`    <File md5="${luaMd5}" import="0">${luaFile}</File>`,
		"  </Files>",
		"  <Actions>",
		"    <OnModActivated>",
		`      <UpdateDatabase>${sqlFile}</UpdateDatabase>`,
		"    </OnModActivated>",
		"  </Actions>",
		"  <EntryPoints>",
		`    <EntryPoint type="InGameUIAddin" file="${luaFile}">`,
		`      <Name>${luaFile}</Name>`,
		"    </EntryPoint>",
		"  </EntryPoints>",
		"</Mod>",
	].join("\n");
}
