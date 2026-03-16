export const CURATED_METHOD_NAMES = [
	"AddNotification",
	"GetActivePlayer",
	"GetGameTurn",
	"GetCapitalCity",
	"GetCityByID",
	"GetOwner",
	"GetNumBuilding",
	"SetNumRealBuilding",
	"GetReligiousMajority",
	"IsHasTech",
	"CanTrain",
	"CanAirliftAt",
	"InitUnit",
	"PushMission",
	"SetHasPromotion",
	"SetImprovementType",
	"SetResourceType",
	"PlotDistance",
];

export const CURATED_EVENT_NAMES = [
	"BuildFinished",
	"CityCanConstruct",
	"PlayerCanConstruct",
	"PlayerCanTrain",
	"CityConstructed",
	"CityTrained",
	"CityCreated",
	"PlayerCityFounded",
	"CityCaptureComplete",
	"CityBoughtPlot",
	"SetPopulation",
	"CityConvertsReligion",
	"ReligionFounded",
	"CanHavePromotion",
	"CanHaveUpgrade",
	"UnitPromoted",
	"UnitUpgraded",
	"UnitSetXY",
	"UnitPrekill",
	"PlayerDoTurn",
	"PlayerAdoptPolicy",
	"PlayerAdoptPolicyBranch",
	"TeamSetHasTech",
	"TeamTechResearched",
	"CanDeclareWar",
	"DeclareWar",
	"MakePeace",
	"GreatPersonExpended",
	"MinorAlliesChanged",
	"MinorFriendsChanged",
];

export const CURATED_LUA_EXAMPLES = {
	"methods:AddNotification": {
		summary: "Tell the active human player when a unique improvement grants a one-time reward.",
		code: `local player = Players[ePlayer]
local plot = Map.GetPlot(iPlotX, iPlotY)

if player:IsHuman() and plot then
\tplayer:AddNotification(
\t\tNotificationTypes.NOTIFICATION_GENERIC,
\t\t"Your Terrace Shrine granted [ICON_PEACE] Faith after finishing on a mountain tile.",
\t\t"Terrace Shrine Completed",
\t\tplot:GetX(),
\t\tplot:GetY(),
\t\t-1,
\t\t-1
\t)
end`,
	},
	"methods:GetActivePlayer": {
		summary: "Only show UI-facing feedback when the local player is the one who triggered the unique effect.",
		code: `local activePlayerID = Game.GetActivePlayer()

if activePlayerID ~= ePlayer then
\treturn
end

local activePlayer = Players[activePlayerID]
activePlayer:AddNotification(
\tNotificationTypes.NOTIFICATION_GENERIC,
\t"Your unique scout promotion unlocked a border warning pulse.",
\t"Frontier Watch",
\t-1,
\t-1,
\t-1,
\t-1
)`,
	},
	"methods:GetGameTurn": {
		summary: "Gate a one-time unique effect so it only starts after the opening turns are over.",
		code: `local turn = Game.GetGameTurn()

if turn < 30 then
\treturn
end

if not player:IsAlive() then
\treturn
end

-- Safe place to start a turn-based unique after early-game setup settles.`,
	},
	"methods:GetCapitalCity": {
		summary: "Resolve the capital when a trait or policy branch should apply a dummy building to one city only.",
		code: `local capital = player:GetCapitalCity()

if not capital then
\treturn
end

capital:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_ROYAL_ARCHIVE, 1)`,
	},
	"methods:GetCityByID": {
		summary: "Turn event IDs into a city object before applying a unique reward or construction rule.",
		code: `local player = Players[ePlayer]
local city = player:GetCityByID(iCity)

if not city then
\treturn
end

if city:GetNumBuilding(GameInfoTypes.BUILDING_MONUMENT) > 0 then
\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_FOUNDERS_PRIDE, 1)
end`,
	},
	"methods:GetOwner": {
		summary: "Resolve ownership from the affected object before applying bonuses or penalties.",
		code: `local plot = Map.GetPlot(iPlotX, iPlotY)
if not plot then
\treturn
end

local ownerID = plot:GetOwner()
if ownerID < 0 then
\treturn
end

local owner = Players[ownerID]
-- Apply your tile-based unique only to the actual owner.`,
	},
	"methods:GetNumBuilding": {
		summary: "Check whether a city already has the hidden marker building that powers a unique effect.",
		code: `local dummyBuildingID = GameInfoTypes.BUILDING_DUMMY_CARAVAN_HOUSE

if city:GetNumBuilding(dummyBuildingID) > 0 then
\treturn
end

city:SetNumRealBuilding(dummyBuildingID, 1)`,
	},
	"methods:SetNumRealBuilding": {
		summary: "Toggle a dummy building on a city to grant yields, slots, or specialist effects from Lua.",
		code: `local dummyBuildingID = GameInfoTypes.BUILDING_DUMMY_BORDER_GARRISON
local shouldEnable = city:IsHasBuilding(GameInfoTypes.BUILDING_WALLS)

city:SetNumRealBuilding(dummyBuildingID, shouldEnable and 1 or 0)`,
	},
	"methods:GetReligiousMajority": {
		summary: "Refresh a city-only bonus when the city follows your target religion.",
		code: `local religionID = city:GetReligiousMajority()
local dummyBuildingID = GameInfoTypes.BUILDING_DUMMY_PILGRIM_HOSTEL
local requiredReligionID = GameInfoTypes.RELIGION_ORTHODOXY

city:SetNumRealBuilding(dummyBuildingID, religionID == requiredReligionID and 1 or 0)`,
	},
	"methods:IsHasTech": {
		summary: "Check the team tech state before enabling a unique unit, dummy building, or mission effect.",
		code: `local team = Teams[player:GetTeam()]
local requiredTechID = GameInfoTypes.TECH_GUILDS

if not team:IsHasTech(requiredTechID) then
\treturn
end

city:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_MERCHANT_QUARTER, 1)`,
	},
	"methods:CanTrain": {
		summary: "Use the regular training rules before spawning or gifting a unit through a unique ability.",
		code: `local unitTypeID = GameInfoTypes.UNIT_GREAT_GENERAL

if not city:CanTrain(unitTypeID, false, false, true, false) then
\treturn
end

player:InitUnit(unitTypeID, city:GetX(), city:GetY())`,
	},
	"methods:CanAirliftAt": {
		summary: "Check whether a city pair qualifies before scripting a free redeploy effect for an airport-style unique.",
		code: `local fromCity = player:GetCityByID(iOriginCity)
local toCity = player:GetCityByID(iDestinationCity)

if not fromCity or not toCity then
\treturn
end

if fromCity:CanAirliftAt(toCity:GetX(), toCity:GetY()) then
\tfromCity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_AIRLIFT_BONUS, 1)
end`,
	},
	"methods:InitUnit": {
		summary: "Spawn a reward unit when a city finishes a unique building or a player hits a trigger condition.",
		code: `local spawnPlot = city:Plot()
local unit = player:InitUnit(GameInfoTypes.UNIT_SETTLER, spawnPlot:GetX(), spawnPlot:GetY())

if unit then
\tunit:SetHasPromotion(GameInfoTypes.PROMOTION_IGNORE_TERRAIN_COST, true)
end`,
	},
	"methods:PushMission": {
		summary: "Give a freshly spawned support unit an immediate move order so the reward feels intentional.",
		code: `local unit = player:InitUnit(GameInfoTypes.UNIT_WORKER, city:GetX(), city:GetY())
local plot = Map.GetPlot(iPlotX, iPlotY)

if unit and plot then
\tunit:PushMission(
\t\tMissionTypes.MISSION_MOVE_TO,
\t\tplot:GetX(),
\t\tplot:GetY(),
\t\t0,
\t\tfalse,
\t\ttrue,
\t\tMissionTypes.NO_MISSION,
\t\tplot,
\t\tunit
\t)
end`,
	},
	"methods:SetHasPromotion": {
		summary: "Grant a hidden or visible promotion when a unit is trained under your unique condition.",
		code: `local promotionID = GameInfoTypes.PROMOTION_HILL_FIGHTER

if unit:GetDomainType() == DomainTypes.DOMAIN_LAND then
\tunit:SetHasPromotion(promotionID, true)
end`,
	},
	"methods:SetImprovementType": {
		summary: "Replace the finished build with your custom improvement once the worker action resolves.",
		code: `local plot = Map.GetPlot(iPlotX, iPlotY)
if not plot then
\treturn
end

if plot:GetTerrainType() == GameInfoTypes.TERRAIN_DESERT then
\tplot:SetImprovementType(GameInfoTypes.IMPROVEMENT_KASBAH)
end`,
	},
	"methods:SetResourceType": {
		summary: "Place a temporary or permanent bonus resource on a tile when a unique trigger fires.",
		code: `local plot = Map.GetPlot(iPlotX, iPlotY)
if not plot or plot:GetResourceType() ~= -1 then
\treturn
end

plot:SetResourceType(GameInfoTypes.RESOURCE_HORSE, 1)`,
	},
	"methods:PlotDistance": {
		summary: "Keep a city or tile-based effect within a controlled radius of the capital or holy city.",
		code: `local capital = player:GetCapitalCity()
if not capital then
\treturn
end

local distance = Map.PlotDistance(capital:GetX(), capital:GetY(), iPlotX, iPlotY)
if distance <= 3 then
\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_CAPITAL_RING_BONUS, 1)
end`,
	},
	"game-events:BuildFinished": {
		summary: "Reward a specific finished improvement with yields, a swap, or a marker effect.",
		code: `GameEvents.BuildFinished.Add(function(ePlayer, iPlotX, iPlotY, eImprovement)
\tif eImprovement ~= GameInfoTypes.IMPROVEMENT_FARM then
\t\treturn
\tend

\tlocal player = Players[ePlayer]
\tlocal plot = Map.GetPlot(iPlotX, iPlotY)
\tif plot and plot:IsRiver() then
\t\tplot:SetImprovementType(GameInfoTypes.IMPROVEMENT_POLDER)
\t\tplayer:ChangeGoldenAgeProgressMeter(25)
\tend
end)`,
	},
	"game-events:CityCanConstruct": {
		summary: "Block a building in a specific city unless the local terrain or religion requirement is satisfied.",
		code: `GameEvents.CityCanConstruct.Add(function(ePlayer, iCity, eBuilding)
\tif eBuilding ~= GameInfoTypes.BUILDING_FLOATING_GARDENS then
\t\treturn true
\tend

\tlocal city = Players[ePlayer]:GetCityByID(iCity)
\treturn city and city:Plot():IsRiver()
end)`,
	},
	"game-events:PlayerCanConstruct": {
		summary: "Apply empire-wide build gates for national unique content tied to policy or tech state.",
		code: `GameEvents.PlayerCanConstruct.Add(function(ePlayer, eBuilding)
\tif eBuilding ~= GameInfoTypes.BUILDING_ROYAL_LIBRARY then
\t\treturn true
\tend

\tlocal player = Players[ePlayer]
\tlocal team = Teams[player:GetTeam()]
\treturn team:IsHasTech(GameInfoTypes.TECH_WRITING)
end)`,
	},
	"game-events:PlayerCanTrain": {
		summary: "Veto training unless the civ has unlocked the custom condition for that unique unit.",
		code: `GameEvents.PlayerCanTrain.Add(function(ePlayer, eUnit)
\tif eUnit ~= GameInfoTypes.UNIT_LONGBOAT_RAIDER then
\t\treturn true
\tend

\tlocal player = Players[ePlayer]
\treturn player:GetNumCities() >= 3
end)`,
	},
	"game-events:CityConstructed": {
		summary: "React to a completed building by applying a hidden follow-up effect in that city.",
		code: `GameEvents.CityConstructed.Add(function(ePlayer, iCity, eBuilding)
\tif eBuilding ~= GameInfoTypes.BUILDING_GRANARY then
\t\treturn
\tend

\tlocal city = Players[ePlayer]:GetCityByID(iCity)
\tif city then
\t\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_FOOD_STOREHOUSE, 1)
\tend
end)`,
	},
	"game-events:CityTrained": {
		summary: "Give trained units an automatic promotion if they match your unique filter.",
		code: `GameEvents.CityTrained.Add(function(ePlayer, iCity, iUnit, bGold, bFaith)
\tlocal player = Players[ePlayer]
\tlocal unit = player:GetUnitByID(iUnit)
\tif not unit or unit:GetUnitCombatType() ~= GameInfoTypes.UNITCOMBAT_ARCHER then
\t\treturn
\tend

\tunit:SetHasPromotion(GameInfoTypes.PROMOTION_RANGE, true)
end)`,
	},
	"game-events:CityCreated": {
		summary: "Initialize hidden buildings or counters as soon as a city object exists.",
		code: `GameEvents.CityCreated.Add(function(iCity, ePlayer)
\tlocal city = Players[ePlayer]:GetCityByID(iCity)
\tif city then
\t\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_NEW_CITY_BUFFER, 1)
\tend
end)`,
	},
	"game-events:PlayerCityFounded": {
		summary: "Handle city founding with direct access to the player and map coordinates.",
		code: `GameEvents.PlayerCityFounded.Add(function(ePlayer, iPlotX, iPlotY)
\tlocal player = Players[ePlayer]
\tlocal city = Map.GetPlot(iPlotX, iPlotY):GetPlotCity()

\tif city and player:GetNumCities() == 2 then
\t\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_SECOND_CITY_BONUS, 1)
\tend
end)`,
	},
	"game-events:CityCaptureComplete": {
		summary: "Clean up or reapply Lua-driven city effects when control changes hands.",
		code: `GameEvents.CityCaptureComplete.Add(function(iOldOwner, bIsCapital, iX, iY, iNewOwner)
\tlocal plot = Map.GetPlot(iX, iY)
\tlocal city = plot and plot:GetPlotCity()
\tif not city then
\t\treturn
\tend

\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_OCCUPATION_POLICY, 0)
\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_CONQUEST_BONUS, 1)
end)`,
	},
	"game-events:CityBoughtPlot": {
		summary: "Reward plot purchases that fit your unique expansion rule.",
		code: `GameEvents.CityBoughtPlot.Add(function(ePlayer, iCity, iPlotX, iPlotY)
\tlocal city = Players[ePlayer]:GetCityByID(iCity)
\tlocal plot = Map.GetPlot(iPlotX, iPlotY)

\tif city and plot and plot:IsResourceConnectedByImprovement(ePlayer) then
\t\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_LAND_GRAB_BONUS, 1)
\tend
end)`,
	},
	"game-events:SetPopulation": {
		summary: "Refresh city bonuses that depend on a population threshold whenever population changes.",
		code: `GameEvents.SetPopulation.Add(function(ePlayer, iCity, iNewPopulation)
\tlocal city = Players[ePlayer]:GetCityByID(iCity)
\tif not city then
\t\treturn
\tend

\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_BIG_CITY_BONUS, iNewPopulation >= 10 and 1 or 0)
end)`,
	},
	"game-events:CityConvertsReligion": {
		summary: "Update a religion-sensitive unique effect immediately when a city changes majority religion.",
		code: `GameEvents.CityConvertsReligion.Add(function(ePlayer, iCity, eReligion)
\tlocal city = Players[ePlayer]:GetCityByID(iCity)
\tif not city then
\t\treturn
\tend

\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_STATE_RELIGION, eReligion == GameInfoTypes.RELIGION_PROTESTANTISM and 1 or 0)
end)`,
	},
	"game-events:ReligionFounded": {
		summary: "Grant a one-time founder reward when the player establishes a religion.",
		code: `GameEvents.ReligionFounded.Add(function(ePlayer, eReligion, iHolyCityX, iHolyCityY)
\tlocal player = Players[ePlayer]
\tlocal holyCity = Map.GetPlot(iHolyCityX, iHolyCityY):GetPlotCity()

\tif holyCity then
\t\tholyCity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_FOUNDER_BONUS, 1)
\t\tplayer:ChangeGoldenAgeProgressMeter(100)
\tend
end)`,
	},
	"game-events:CanHavePromotion": {
		summary: "Stop a promotion from appearing unless your unique prerequisite is met.",
		code: `GameEvents.CanHavePromotion.Add(function(ePlayer, iUnit, ePromotion)
\tif ePromotion ~= GameInfoTypes.PROMOTION_COMMANDO then
\t\treturn true
\tend

\tlocal unit = Players[ePlayer]:GetUnitByID(iUnit)
\treturn unit and unit:GetExperience() >= 60
end)`,
	},
	"game-events:CanHaveUpgrade": {
		summary: "Control upgrade paths when a unique unit should preserve or block a branch.",
		code: `GameEvents.CanHaveUpgrade.Add(function(ePlayer, iUnit, eUpgradeUnit)
\tif eUpgradeUnit ~= GameInfoTypes.UNIT_RIFLEMAN then
\t\treturn true
\tend

\tlocal unit = Players[ePlayer]:GetUnitByID(iUnit)
\treturn unit and not unit:IsHasPromotion(GameInfoTypes.PROMOTION_NO_STANDARD_UPGRADE)
end)`,
	},
	"game-events:UnitPromoted": {
		summary: "Grant a chained reward or side-effect the moment a unit earns a promotion.",
		code: `GameEvents.UnitPromoted.Add(function(ePlayer, iUnit, ePromotion)
\tif ePromotion ~= GameInfoTypes.PROMOTION_DRILL_1 then
\t\treturn
\tend

\tlocal unit = Players[ePlayer]:GetUnitByID(iUnit)
\tif unit then
\t\tunit:SetHasPromotion(GameInfoTypes.PROMOTION_MORALE, true)
\tend
end)`,
	},
	"game-events:UnitUpgraded": {
		summary: "Reapply hidden promotions or identity markers after a unit upgrades.",
		code: `GameEvents.UnitUpgraded.Add(function(ePlayer, iOldUnit, iNewUnit, bGoodyHut)
\tlocal unit = Players[ePlayer]:GetUnitByID(iNewUnit)
\tif unit then
\t\tunit:SetHasPromotion(GameInfoTypes.PROMOTION_UNIQUE_LINEAGE, true)
\tend
end)`,
	},
	"game-events:UnitSetXY": {
		summary: "Check tile entry triggers for border, terrain, or region-based unique effects.",
		code: `GameEvents.UnitSetXY.Add(function(ePlayer, iUnit, iX, iY)
\tlocal player = Players[ePlayer]
\tlocal unit = player:GetUnitByID(iUnit)
\tlocal plot = Map.GetPlot(iX, iY)

\tif unit and plot and plot:GetOwner() == ePlayer and plot:IsHills() then
\t\tunit:SetHasPromotion(GameInfoTypes.PROMOTION_HILL_RUNNER, true)
\tend
end)`,
	},
	"game-events:UnitPrekill": {
		summary: "Catch a death event before the unit disappears so you can spawn a replacement or trigger a reward.",
		code: `GameEvents.UnitPrekill.Add(function(ePlayer, iUnit, eUnitType, iX, iY, bDelay, eByPlayer)
\tif eUnitType ~= GameInfoTypes.UNIT_GREAT_GENERAL then
\t\treturn
\tend

\tlocal player = Players[ePlayer]
\tplayer:InitUnit(GameInfoTypes.UNIT_SPEARMAN, iX, iY)
end)`,
	},
	"game-events:PlayerDoTurn": {
		summary: "Run a compact per-turn pass to refresh city or unit markers from your unique rules.",
		code: `GameEvents.PlayerDoTurn.Add(function(ePlayer)
\tlocal player = Players[ePlayer]
\tif not player:IsAlive() then
\t\treturn
\tend

\tfor city in player:Cities() do
\t\tlocal enabled = city:IsCoastal() and city:GetPopulation() >= 5
\t\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_COASTAL_GUILD, enabled and 1 or 0)
\tend
end)`,
	},
	"game-events:PlayerAdoptPolicy": {
		summary: "Give an immediate reward when a specific policy is adopted.",
		code: `GameEvents.PlayerAdoptPolicy.Add(function(ePlayer, ePolicy)
\tif ePolicy ~= GameInfoTypes.POLICY_TRADITION then
\t\treturn
\tend

\tlocal capital = Players[ePlayer]:GetCapitalCity()
\tif capital then
\t\tcapital:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_TRADITION_REWARD, 1)
\tend
end)`,
	},
	"game-events:PlayerAdoptPolicyBranch": {
		summary: "Use branch adoption or completion to unlock empire-wide uniques.",
		code: `GameEvents.PlayerAdoptPolicyBranch.Add(function(ePlayer, eBranch)
\tif eBranch ~= GameInfoTypes.POLICY_BRANCH_COMMERCE then
\t\treturn
\tend

\tlocal player = Players[ePlayer]
\tfor city in player:Cities() do
\t\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_BRANCH_UNLOCK, 1)
\tend
end)`,
	},
	"game-events:TeamSetHasTech": {
		summary: "Refresh tech-driven effects even when the tech is granted outside normal research flow.",
		code: `GameEvents.TeamSetHasTech.Add(function(eTeam, eTech, bAdopted)
\tif not bAdopted or eTech ~= GameInfoTypes.TECH_NAVIGATION then
\t\treturn
\tend

\tfor ePlayer = 0, GameDefines.MAX_MAJOR_CIVS - 1 do
\t\tlocal player = Players[ePlayer]
\t\tif player:IsAlive() and player:GetTeam() == eTeam then
\t\t\tlocal capital = player:GetCapitalCity()
\t\t\tif capital then
\t\t\t\tcapital:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_NAVAL_UNLOCK, 1)
\t\t\tend
\t\tend
\tend
end)`,
	},
	"game-events:TeamTechResearched": {
		summary: "Award a one-time bonus when a team finishes a key technology.",
		code: `GameEvents.TeamTechResearched.Add(function(eTeam, eTech, eChange)
\tif eTech ~= GameInfoTypes.TECH_WRITING then
\t\treturn
\tend

\tfor ePlayer = 0, GameDefines.MAX_MAJOR_CIVS - 1 do
\t\tlocal player = Players[ePlayer]
\t\tif player:IsAlive() and player:GetTeam() == eTeam then
\t\t\tlocal capital = player:GetCapitalCity()
\t\t\tif capital then
\t\t\t\tplayer:InitUnit(GameInfoTypes.UNIT_SCRIBE, capital:GetX(), capital:GetY())
\t\t\tend
\t\tend
\tend
end)`,
	},
	"game-events:CanDeclareWar": {
		summary: "Prevent war declarations while your custom diplomatic condition is active.",
		code: `GameEvents.CanDeclareWar.Add(function(eFromPlayer, eToPlayer)
\tlocal fromPlayer = Players[eFromPlayer]
\tlocal toPlayer = Players[eToPlayer]

\tif fromPlayer:IsDoF(eToPlayer) and toPlayer:IsMinorCiv() then
\t\treturn false
\tend

\treturn true
end)`,
	},
	"game-events:DeclareWar": {
		summary: "Trigger wartime mobilization when your civ enters a conflict.",
		code: `GameEvents.DeclareWar.Add(function(eTeam, eOtherTeam)
\tfor ePlayer = 0, GameDefines.MAX_MAJOR_CIVS - 1 do
\t\tlocal player = Players[ePlayer]
\t\tif player:IsAlive() and player:GetTeam() == eTeam then
\t\t\tfor city in player:Cities() do
\t\t\t\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_WARTIME_MOBILIZATION, 1)
\t\t\tend
\t\tend
\tend
end)`,
	},
	"game-events:MakePeace": {
		summary: "Clear temporary war-only effects when peace is signed.",
		code: `GameEvents.MakePeace.Add(function(eTeam, eOtherTeam)
\tfor ePlayer = 0, GameDefines.MAX_MAJOR_CIVS - 1 do
\t\tlocal player = Players[ePlayer]
\t\tif player:IsAlive() and player:GetTeam() == eTeam then
\t\t\tfor city in player:Cities() do
\t\t\t\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_WARTIME_MOBILIZATION, 0)
\t\t\tend
\t\tend
\tend
end)`,
	},
	"game-events:GreatPersonExpended": {
		summary: "Pay out a civ-specific reward when a Great Person is consumed.",
		code: `GameEvents.GreatPersonExpended.Add(function(ePlayer, eUnit, iUnitX, iUnitY)
\tif eUnit ~= GameInfoTypes.UNIT_GREAT_ENGINEER then
\t\treturn
\tend

\tlocal player = Players[ePlayer]
\tplayer:ChangeGoldenAgeProgressMeter(200)
end)`,
	},
	"game-events:MinorAlliesChanged": {
		summary: "Refresh city-state ally benefits whenever the ally count changes.",
		code: `GameEvents.MinorAlliesChanged.Add(function(ePlayer, eMinor, bNowAllied, iOldAlly)
\tlocal player = Players[ePlayer]
\tlocal capital = player:GetCapitalCity()
\tif capital then
\t\tcapital:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_ALLY_NETWORK, player:GetNumMinorCivsAllied() > 0 and 1 or 0)
\tend
end)`,
	},
	"game-events:MinorFriendsChanged": {
		summary: "Track city-state friendship thresholds for diplomacy-driven uniques.",
		code: `GameEvents.MinorFriendsChanged.Add(function(ePlayer, eMinor, bNowFriends, iOldFriend)
\tlocal player = Players[ePlayer]
\tfor city in player:Cities() do
\t\tcity:SetNumRealBuilding(GameInfoTypes.BUILDING_DUMMY_PATRONAGE_TRADE, player:GetNumMinorCivsFriends() >= 3 and 1 or 0)
\tend
end)`,
	},
};
