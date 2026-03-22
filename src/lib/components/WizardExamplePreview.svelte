<svelte:options runes={true} />

<script>
	import { get } from "svelte/store";
	import { buildZipBlob } from "../map/zip.js";
	import { civIconPreferences, ddsPreferences } from "../stores/toolPreferences.js";
	import SnippetExample from "./SnippetExample.svelte";

	let { example, activeLanguage = "all" } = $props();

	const LEADER_PERSONALITY_FIELDS = [
		{ key: "VictoryCompetitiveness", label: "Victory competitiveness", defaultValue: 7, note: "Weights how strongly the CPU suspects and contests competing victory plans." },
		{ key: "WonderCompetitiveness", label: "Wonder competitiveness", defaultValue: 4, note: "Raises irritation when another civ beats this leader to wonders." },
		{ key: "MinorCivCompetitiveness", label: "City-state competitiveness", defaultValue: 6, note: "Pushes rivalry around city-state influence and protection." },
		{ key: "Boldness", label: "Boldness", defaultValue: 9, note: "Strong driver for conquest posture and aggressive demands." },
		{ key: "DiploBalance", label: "Diplo balance", defaultValue: 6, note: "Nominally balance-of-power focused; often underused in base behavior." },
		{ key: "WarmongerHate", label: "Warmonger hate", defaultValue: 3, note: "Controls how sharply the CPU reacts to wars and eliminated civs." },
		{ key: "DenounceWillingness", label: "Denounce willingness", defaultValue: 8, note: "Raises the chance that the CPU denounces rivals." },
		{ key: "DoFWillingness", label: "DoF willingness", defaultValue: 4, note: "Raises the weight for declarations of friendship." },
		{ key: "Loyalty", label: "Loyalty", defaultValue: 3, note: "Makes the CPU less likely to turn on current DoF partners." },
		{ key: "Neediness", label: "Neediness", defaultValue: 4, note: "Pushes denounce-pressure behavior when others refuse requests." },
		{ key: "Forgiveness", label: "Forgiveness", defaultValue: 3, note: "Counterweight to neediness when relationships get strained." },
		{ key: "Chattiness", label: "Chattiness", defaultValue: 6, note: "Controls how often the leader surfaces diplomatic chatter." },
		{ key: "Meanness", label: "Meanness", defaultValue: 7, note: "Raises the chance of smug or hostile diplomatic callouts." },
	];

	const LEADER_MAJOR_APPROACH_FIELDS = [
		{ key: "MAJOR_CIV_APPROACH_WAR", label: "War", defaultValue: 7 },
		{ key: "MAJOR_CIV_APPROACH_HOSTILE", label: "Hostile", defaultValue: 6 },
		{ key: "MAJOR_CIV_APPROACH_DECEPTIVE", label: "Deceptive", defaultValue: 7 },
		{ key: "MAJOR_CIV_APPROACH_GUARDED", label: "Guarded", defaultValue: 4 },
		{ key: "MAJOR_CIV_APPROACH_AFRAID", label: "Afraid", defaultValue: 2 },
		{ key: "MAJOR_CIV_APPROACH_FRIENDLY", label: "Friendly", defaultValue: 5 },
		{ key: "MAJOR_CIV_APPROACH_NEUTRAL", label: "Neutral", defaultValue: 6 },
	];

	const LEADER_MINOR_APPROACH_FIELDS = [
		{ key: "MINOR_CIV_APPROACH_IGNORE", label: "Ignore", defaultValue: 4 },
		{ key: "MINOR_CIV_APPROACH_FRIENDLY", label: "Friendly", defaultValue: 3 },
		{ key: "MINOR_CIV_APPROACH_PROTECTIVE", label: "Protective", defaultValue: 4 },
		{ key: "MINOR_CIV_APPROACH_CONQUEST", label: "Conquest", defaultValue: 7 },
		{ key: "MINOR_CIV_APPROACH_BULLY", label: "Bully", defaultValue: 8 },
	];

	const LEADER_FLAVOR_FIELDS = [
		{ key: "FLAVOR_OFFENSE", label: "Offense", defaultValue: 4 },
		{ key: "FLAVOR_DEFENSE", label: "Defense", defaultValue: 5 },
		{ key: "FLAVOR_CITY_DEFENSE", label: "City defense", defaultValue: 5 },
		{ key: "FLAVOR_MILITARY_TRAINING", label: "Military training", defaultValue: 4 },
		{ key: "FLAVOR_RECON", label: "Recon", defaultValue: 5 },
		{ key: "FLAVOR_RANGED", label: "Ranged", defaultValue: 4 },
		{ key: "FLAVOR_MOBILE", label: "Mobile", defaultValue: 5 },
		{ key: "FLAVOR_NAVAL", label: "Naval", defaultValue: 2 },
		{ key: "FLAVOR_NAVAL_RECON", label: "Naval recon", defaultValue: 2 },
		{ key: "FLAVOR_NAVAL_GROWTH", label: "Naval growth", defaultValue: 2 },
		{ key: "FLAVOR_NAVAL_TILE_IMPROVEMENT", label: "Naval tile improvement", defaultValue: 2 },
		{ key: "FLAVOR_AIR", label: "Air", defaultValue: 3 },
		{ key: "FLAVOR_EXPANSION", label: "Expansion", defaultValue: 4 },
		{ key: "FLAVOR_GROWTH", label: "Growth", defaultValue: 7 },
		{ key: "FLAVOR_TILE_IMPROVEMENT", label: "Tile improvement", defaultValue: 6 },
		{ key: "FLAVOR_INFRASTRUCTURE", label: "Infrastructure", defaultValue: 6 },
		{ key: "FLAVOR_PRODUCTION", label: "Production", defaultValue: 6 },
		{ key: "FLAVOR_GOLD", label: "Gold", defaultValue: 5 },
		{ key: "FLAVOR_SCIENCE", label: "Science", defaultValue: 5 },
		{ key: "FLAVOR_CULTURE", label: "Culture", defaultValue: 9 },
		{ key: "FLAVOR_HAPPINESS", label: "Happiness", defaultValue: 7 },
		{ key: "FLAVOR_GREAT_PEOPLE", label: "Great people", defaultValue: 10 },
		{ key: "FLAVOR_WONDER", label: "Wonder", defaultValue: 8 },
		{ key: "FLAVOR_RELIGION", label: "Religion", defaultValue: 9 },
		{ key: "FLAVOR_DIPLOMACY", label: "Diplomacy", defaultValue: 6 },
		{ key: "FLAVOR_SPACESHIP", label: "Spaceship", defaultValue: 3 },
		{ key: "FLAVOR_WATER_CONNECTION", label: "Water connection", defaultValue: 2 },
		{ key: "FLAVOR_NUKE", label: "Nuke", defaultValue: 1 },
		{ key: "FLAVOR_USE_NUKE", label: "Use nuke", defaultValue: 1 },
		{ key: "FLAVOR_ESPIONAGE", label: "Espionage", defaultValue: 4 },
		{ key: "FLAVOR_AIRLIFT", label: "Airlift", defaultValue: 3 },
		{ key: "FLAVOR_I_TRADE_DESTINATION", label: "Trade destination", defaultValue: 5 },
		{ key: "FLAVOR_I_TRADE_ORIGIN", label: "Trade origin", defaultValue: 5 },
		{ key: "FLAVOR_I_SEA_TRADE_ROUTE", label: "Sea trade route", defaultValue: 3 },
		{ key: "FLAVOR_I_LAND_TRADE_ROUTE", label: "Land trade route", defaultValue: 6 },
		{ key: "FLAVOR_ARCHAEOLOGY", label: "Archaeology", defaultValue: 8 },
		{ key: "FLAVOR_AIR_CARRIER", label: "Air carrier", defaultValue: 3 },
	];

	const LEADER_FLAVOR_GROUPS = [
		{
			key: "military",
			label: "military pressure",
			description: "military buildup, deterrence, and force projection",
			flavors: ["FLAVOR_OFFENSE", "FLAVOR_DEFENSE", "FLAVOR_CITY_DEFENSE", "FLAVOR_MILITARY_TRAINING", "FLAVOR_RANGED", "FLAVOR_MOBILE", "FLAVOR_AIR"],
		},
		{
			key: "naval",
			label: "naval reach",
			description: "coastal positioning, sea control, and maritime mobility",
			flavors: ["FLAVOR_NAVAL", "FLAVOR_NAVAL_RECON", "FLAVOR_NAVAL_GROWTH", "FLAVOR_NAVAL_TILE_IMPROVEMENT", "FLAVOR_WATER_CONNECTION", "FLAVOR_AIR_CARRIER"],
		},
		{
			key: "expansion",
			label: "empire build-out",
			description: "growth, expansion, land development, and infrastructure",
			flavors: ["FLAVOR_EXPANSION", "FLAVOR_GROWTH", "FLAVOR_TILE_IMPROVEMENT", "FLAVOR_INFRASTRUCTURE", "FLAVOR_PRODUCTION", "FLAVOR_HAPPINESS"],
		},
		{
			key: "science",
			label: "science pacing",
			description: "science growth and long-term tech acceleration",
			flavors: ["FLAVOR_SCIENCE", "FLAVOR_SPACESHIP"],
		},
		{
			key: "culture",
			label: "culture pressure",
			description: "wonders, great people, archaeology, and cultural snowballing",
			flavors: ["FLAVOR_CULTURE", "FLAVOR_GREAT_PEOPLE", "FLAVOR_WONDER", "FLAVOR_ARCHAEOLOGY"],
		},
		{
			key: "religion",
			label: "religious pressure",
			description: "founding, faith output, and religious leverage",
			flavors: ["FLAVOR_RELIGION"],
		},
		{
			key: "diplomacy",
			label: "diplomatic leverage",
			description: "trade, gold flow, espionage, and diplomatic positioning",
			flavors: ["FLAVOR_DIPLOMACY", "FLAVOR_GOLD", "FLAVOR_ESPIONAGE", "FLAVOR_I_TRADE_DESTINATION", "FLAVOR_I_TRADE_ORIGIN", "FLAVOR_I_SEA_TRADE_ROUTE", "FLAVOR_I_LAND_TRADE_ROUTE"],
		},
	];

	const SCAFFOLD_SECOND_UNIQUE_OPTIONS = [
		{ value: "unit", label: "Second Unique Unit" },
		{ value: "building", label: "Unique Building" },
		{ value: "improvement", label: "Unique Improvement" },
	];

	const SCAFFOLD_CITY_PLACEHOLDER_COUNT = 30;
	const SCAFFOLD_SPY_PLACEHOLDER_COUNT = 10;
	const DEFAULT_ICON_ATLAS_SIZES = [256, 128, 80, 64, 45, 32];
	const DEFAULT_ALPHA_ATLAS_SIZES = [128, 64, 48, 45, 32, 24];
	const DEFAULT_UNIT_FLAG_ATLAS_SIZES = [32];
	const DEFAULT_ART_DEFINE_UNIT_INFO_OPTIONS = ["ART_DEF_UNIT_WW1_INFANTRY"];
	const DEFAULT_ART_DEFINE_UNIT_MEMBER_INFO_OPTIONS = ["ART_DEF_UNIT_MEMBER_WW1_INFANTRY"];

	let lastPreviewKey = $state("");
	let scaffoldCivilizationName = $state("Shambhala");
	let scaffoldLeaderName = $state("Maitreya");
	let scaffoldPrimaryUniqueUnitName = $state("");
	let scaffoldSecondUniqueType = $state("building");
	let scaffoldSecondUniqueName = $state("");
	let scaffoldDownloadUrl = $state("");
	let scaffoldDownloadName = $state("");
	let namingCivilizationType = $state("CIVILIZATION_SHAMBHALA");
	let namingCityList = $state("Kalapa");
	let namingSpyList = $state("Lhamo");
	let leaderType = $state("LEADER_MAITREYA");
	let leaderPersonalityValues = $state(createValueMap(LEADER_PERSONALITY_FIELDS));
	let leaderMajorBiasValues = $state(createValueMap(LEADER_MAJOR_APPROACH_FIELDS));
	let leaderMinorBiasValues = $state(createValueMap(LEADER_MINOR_APPROACH_FIELDS));
	let leaderFlavorValues = $state(createValueMap(LEADER_FLAVOR_FIELDS));
	let artCivilizationName = $state("Shambhala");
	let artLeaderName = $state("Maitreya");
	let artPrimaryColor = $state("#1f4f99");
	let artSecondaryColor = $state("#f4de9a");
	let artPrimaryColorHexInput = $state("#1f4f99");
	let artSecondaryColorHexInput = $state("#f4de9a");
	let artIconAtlasRows = $state("2");
	let artIconAtlasCols = $state("2");
	let artIconAtlasSizes = $state(DEFAULT_ICON_ATLAS_SIZES.join(", "));
	let artAlphaAtlasSizes = $state(DEFAULT_ALPHA_ATLAS_SIZES.join(", "));
	let artUnitFlagAtlasSizes = $state(DEFAULT_UNIT_FLAG_ATLAS_SIZES.join(", "));
	let artPeaceTrackFile = $state("Shambhala_Maitreya_Peace");
	let artWarTrackFile = $state("Shambhala_Maitreya_War");
	let artIncludeUiAtlas = $state(false);
	let artUiAtlasSizes = $state("45, 64");
	let artIncludeUnitArt = $state(true);
	let artUnitName = $state("Lotus Guard");
	let artUnitBaseArtType = $state("ART_DEF_UNIT_WW1_INFANTRY");
	let artUnitBaseMemberType = $state("ART_DEF_UNIT_MEMBER_WW1_INFANTRY");
	let artUnitModelFile = $state("shambhala_lotus_guard.fxsxml");
	let artUnitStrategicAsset = $state("Shambhala_UnitFlagAtlas_128.dds");
	let artIncludeLandmarkArt = $state(false);
	let artLandmarkKind = $state("improvement");
	let artLandmarkName = $state("Lotus Sanctuary");
	let artLandmarkModelFile = $state("shambhala_lotus_sanctuary.fxsxml");
	let artLandmarkStrategicAsset = $state("shambhala_lotus_sanctuary_sref.dds");
	let artLandmarkScale = $state("0.12");
	let artUnitInfoOptions = $state(DEFAULT_ART_DEFINE_UNIT_INFO_OPTIONS);
	let artUnitMemberInfoOptions = $state(DEFAULT_ART_DEFINE_UNIT_MEMBER_INFO_OPTIONS);

	const preview = $derived(example?.preview);
	const isInteractiveCivScaffold = $derived(preview?.interactiveKind === "civilization-scaffold");
	const isInteractiveArtBundle = $derived(preview?.interactiveKind === "art-audio-bundle");
	const isInteractiveNamingPack = $derived(preview?.interactiveKind === "naming-pack");
	const isInteractiveLeaderBuilder = $derived(preview?.interactiveKind === "leader-personality");
	const previewKey = $derived(
		JSON.stringify({
			title: example?.title ?? "",
			interactiveKind: preview?.interactiveKind ?? "",
			formDefaults: preview?.formDefaults ?? null,
		}),
	);
	const normalizedCivilizationType = $derived(normalizeKey(namingCivilizationType, "CIVILIZATION_", "CUSTOM_CIV"));
	const civilizationSuffix = $derived(stripPrefix(normalizedCivilizationType, "CIVILIZATION_") || "CUSTOM_CIV");
	const cityNames = $derived(parseNameList(namingCityList));
	const spyNames = $derived(parseNameList(namingSpyList));
	const cityEntries = $derived(cityNames.map((name, index) => buildCityEntry(name, index)));
	const spyEntries = $derived(spyNames.map((name, index) => buildSpyEntry(name, index)));
	const duplicateCityTags = $derived(findDuplicates(cityEntries.map((entry) => entry.tag)));
	const duplicateSpyTags = $derived(findDuplicates(spyEntries.map((entry) => entry.tag)));
	const normalizedLeaderType = $derived(normalizeKey(leaderType, "LEADER_", "CUSTOM_LEADER"));
	const leaderSuffix = $derived(stripPrefix(normalizedLeaderType, "LEADER_") || "CUSTOM_LEADER");
	const normalizedLeaderPersonalityValues = $derived(normalizeValueMap(LEADER_PERSONALITY_FIELDS, leaderPersonalityValues));
	const normalizedLeaderMajorBiasValues = $derived(normalizeValueMap(LEADER_MAJOR_APPROACH_FIELDS, leaderMajorBiasValues));
	const normalizedLeaderMinorBiasValues = $derived(normalizeValueMap(LEADER_MINOR_APPROACH_FIELDS, leaderMinorBiasValues));
	const normalizedLeaderFlavorValues = $derived(normalizeValueMap(LEADER_FLAVOR_FIELDS, leaderFlavorValues));
	const leaderFlavorEntries = $derived(LEADER_FLAVOR_FIELDS.map((field) => ({ type: field.key, value: normalizedLeaderFlavorValues[field.key] })));
	const leaderPlaystyleSummary = $derived(isInteractiveLeaderBuilder ? buildLeaderPlaystyleSummary() : null);
	const artPrimaryColorDisplay = $derived(buildArtColorDisplay(artPrimaryColor, "#1f4f99"));
	const artSecondaryColorDisplay = $derived(buildArtColorDisplay(artSecondaryColor, "#f4de9a"));
	const stepValidationMap = $derived.by(() => buildStepValidationMap());
	const displayExample = $derived.by(() =>
		isInteractiveCivScaffold
			? buildInteractiveCivilizationScaffoldExample()
			: isInteractiveArtBundle
				? buildInteractiveArtBundleExample()
				: isInteractiveNamingPack
					? buildInteractiveNamingPackExample()
					: isInteractiveLeaderBuilder
						? buildInteractiveLeaderExample()
						: example,
	);

	$effect(() => {
		if (previewKey !== lastPreviewKey) {
			lastPreviewKey = previewKey;
			resetInteractiveState();
		}
	});

	$effect(() => {
		if (typeof window === "undefined") {
			return;
		}

		if (!isInteractiveCivScaffold || !displayExample?.zipEntries?.length) {
			scaffoldDownloadUrl = "";
			scaffoldDownloadName = "";
			return;
		}

		const archiveBlob = buildZipBlob(displayExample.zipEntries);
		const nextUrl = URL.createObjectURL(archiveBlob);

		scaffoldDownloadUrl = nextUrl;
		scaffoldDownloadName = `${sanitizeFileSegment(buildCivilizationScaffoldArchiveBaseName(), "CivilizationScaffold")}.zip`;

		return () => {
			URL.revokeObjectURL(nextUrl);
		};
	});

	$effect(() => {
		if (typeof window === "undefined" || !isInteractiveArtBundle) {
			return;
		}

		let cancelled = false;

		async function loadArtDefineOptions() {
			const module = await import("../data/civ-schema.json");
			if (cancelled) {
				return;
			}

			const schema = module.default;
			const nextUnitInfoOptions = getSchemaRowValues(schema, "ArtDefine_UnitInfos", "Type");
			const nextUnitMemberInfoOptions = getSchemaRowValues(schema, "ArtDefine_UnitMemberInfos", "Type");

			artUnitInfoOptions = nextUnitInfoOptions.length ? nextUnitInfoOptions : DEFAULT_ART_DEFINE_UNIT_INFO_OPTIONS;
			artUnitMemberInfoOptions = nextUnitMemberInfoOptions.length ? nextUnitMemberInfoOptions : DEFAULT_ART_DEFINE_UNIT_MEMBER_INFO_OPTIONS;
		}

		loadArtDefineOptions();

		return () => {
			cancelled = true;
		};
	});

	function resetInteractiveState() {
		const defaults = preview?.formDefaults || {};
		const sharedColors = get(civIconPreferences);
		const sharedDds = get(ddsPreferences);

		scaffoldCivilizationName = defaults.civilizationName || "Shambhala";
		scaffoldLeaderName = defaults.leaderName || "Maitreya";
		scaffoldPrimaryUniqueUnitName = defaults.primaryUniqueUnitName || "";
		scaffoldSecondUniqueType = defaults.secondUniqueType || "building";
		scaffoldSecondUniqueName = defaults.secondUniqueName || "";

		namingCivilizationType = defaults.civilizationType || "CIVILIZATION_SHAMBHALA";
		namingCityList = Array.isArray(defaults.cityNames) ? defaults.cityNames.join("\n") : defaults.cityNames || "Kalapa";
		namingSpyList = Array.isArray(defaults.spyNames) ? defaults.spyNames.join("\n") : defaults.spyNames || "Lhamo";
		leaderType = defaults.leaderType || "LEADER_MAITREYA";
		leaderPersonalityValues = createValueMap(LEADER_PERSONALITY_FIELDS, defaults.personality);
		leaderMajorBiasValues = createValueMap(LEADER_MAJOR_APPROACH_FIELDS, defaults.majorBiases);
		leaderMinorBiasValues = createValueMap(LEADER_MINOR_APPROACH_FIELDS, defaults.minorBiases);
		leaderFlavorValues = createLeaderFlavorMap(defaults.flavorValues, defaults.flavorLines);
		artCivilizationName = defaults.civilizationName || "Shambhala";
		artLeaderName = defaults.leaderName || "Maitreya";
		artPrimaryColor = sharedColors?.primaryColor || "#1f4f99";
		artSecondaryColor = sharedColors?.iconColor || "#f4de9a";
		artPrimaryColorHexInput = artPrimaryColor;
		artSecondaryColorHexInput = artSecondaryColor;
		artIconAtlasRows = String(defaults.iconAtlasRows || sharedDds?.atlasRows || 2);
		artIconAtlasCols = String(defaults.iconAtlasCols || sharedDds?.atlasCols || 2);
		artIconAtlasSizes = Array.isArray(sharedDds?.atlasSelectedSizes) && sharedDds.atlasSelectedSizes.length ? sharedDds.atlasSelectedSizes.join(", ") : DEFAULT_ICON_ATLAS_SIZES.join(", ");
		artAlphaAtlasSizes = Array.isArray(defaults.alphaAtlasSizes) ? defaults.alphaAtlasSizes.join(", ") : DEFAULT_ALPHA_ATLAS_SIZES.join(", ");
		artUnitFlagAtlasSizes = Array.isArray(defaults.unitFlagAtlasSizes) ? defaults.unitFlagAtlasSizes.join(", ") : DEFAULT_UNIT_FLAG_ATLAS_SIZES.join(", ");
		artPeaceTrackFile = defaults.peaceTrackFile || `${buildFileStem(defaults.civilizationName || "Shambhala")}_${buildFileStem(defaults.leaderName || "Maitreya")}_Peace`;
		artWarTrackFile = defaults.warTrackFile || `${buildFileStem(defaults.civilizationName || "Shambhala")}_${buildFileStem(defaults.leaderName || "Maitreya")}_War`;
		artIncludeUiAtlas = defaults.includeUiAtlas === true;
		artUiAtlasSizes = Array.isArray(defaults.uiAtlasSizes) ? defaults.uiAtlasSizes.join(", ") : "45, 64";
		artIncludeUnitArt = defaults.includeUnitArt !== false;
		artUnitName = defaults.unitName || "Lotus Guard";
		artUnitBaseArtType = defaults.unitBaseArtType || "ART_DEF_UNIT_WW1_INFANTRY";
		artUnitBaseMemberType = defaults.unitBaseMemberType || "ART_DEF_UNIT_MEMBER_WW1_INFANTRY";
		artUnitModelFile = defaults.unitModelFile || "shambhala_lotus_guard.fxsxml";
		artUnitStrategicAsset = defaults.unitStrategicAsset || "Shambhala_UnitFlagAtlas_128.dds";
		artIncludeLandmarkArt = defaults.includeLandmarkArt === true;
		artLandmarkKind = defaults.landmarkKind || "improvement";
		artLandmarkName = defaults.landmarkName || "Lotus Sanctuary";
		artLandmarkModelFile = defaults.landmarkModelFile || "shambhala_lotus_sanctuary.fxsxml";
		artLandmarkStrategicAsset = defaults.landmarkStrategicAsset || "shambhala_lotus_sanctuary_sref.dds";
		artLandmarkScale = String(defaults.landmarkScale || "0.12");
	}

	function updateArtColorFromPicker(which, value) {
		const fallback = which === "primary" ? "#1f4f99" : "#f4de9a";
		const normalized = normalizeHexColorValue(value, fallback);
		if (which === "primary") {
			artPrimaryColor = normalized;
			artPrimaryColorHexInput = normalized;
			return;
		}
		artSecondaryColor = normalized;
		artSecondaryColorHexInput = normalized;
	}

	function updateArtColorFromHex(which, draft) {
		if (which === "primary") {
			artPrimaryColorHexInput = draft;
			const parsed = parseHexColorValue(draft);
			if (parsed) {
				artPrimaryColor = parsed;
			}
			return;
		}
		artSecondaryColorHexInput = draft;
		const parsed = parseHexColorValue(draft);
		if (parsed) {
			artSecondaryColor = parsed;
		}
	}

	function resetArtColorDraft(which) {
		if (which === "primary") {
			artPrimaryColorHexInput = artPrimaryColorDisplay.hex;
			return;
		}
		artSecondaryColorHexInput = artSecondaryColorDisplay.hex;
	}

	function stripPrefix(value, prefix) {
		return String(value || "").startsWith(prefix) ? String(value).slice(prefix.length) : String(value || "");
	}

	function normalizeIdentifier(value, fallback) {
		const normalized = String(value ?? "")
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "")
			.replace(/_+/g, "_");

		return normalized || fallback;
	}

	function normalizeKey(value, prefix, fallbackSuffix) {
		const normalized = normalizeIdentifier(value, fallbackSuffix);
		return normalized.startsWith(prefix) ? normalized : `${prefix}${normalized}`;
	}

	function createValueMap(definitions, overrides = {}) {
		return Object.fromEntries(definitions.map((definition) => [definition.key, normalizeRangeInteger(overrides?.[definition.key], definition.defaultValue)]));
	}

	function buildFileStem(value) {
		const raw = String(value || "")
			.split("_")
			.filter(Boolean)
			.map((part) => part.charAt(0) + part.slice(1).toLowerCase())
			.join("");

		return raw || "CustomCiv";
	}

	function normalizeDisplayName(value, fallback) {
		const normalized = String(value ?? "")
			.trim()
			.replace(/\s+/g, " ");

		return normalized || fallback;
	}

	function parseIntegerList(value, fallback = []) {
		const parsed = String(value || "")
			.split(",")
			.map((entry) => Number.parseInt(entry.trim(), 10))
			.filter((entry) => Number.isFinite(entry) && entry > 0);
		return parsed.length ? parsed : fallback;
	}

	function getSchemaRowValues(schema, tableName, columnName) {
		const table = schema?.tables?.find((entry) => entry.name === tableName);
		if (!table?.rows?.length) {
			return [];
		}

		return table.rows
			.map((row) => row?.[columnName])
			.filter((value, index, values) => typeof value === "string" && value && values.indexOf(value) === index)
			.sort((left, right) => left.localeCompare(right));
	}

	function hexToRgbFraction(color, fallback = "#000000") {
		const normalized = String(color || fallback)
			.trim()
			.replace(/^#/, "");
		const expanded =
			normalized.length === 3
				? normalized
						.split("")
						.map((part) => `${part}${part}`)
						.join("")
				: normalized;
		if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
			return hexToRgbFraction(fallback, "#000000");
		}

		const value = Number.parseInt(expanded, 16);
		return {
			red: Number((((value >> 16) & 255) / 255).toFixed(2)),
			green: Number((((value >> 8) & 255) / 255).toFixed(2)),
			blue: Number(((value & 255) / 255).toFixed(2)),
		};
	}

	function rgbFractionToHsl({ red, green, blue }) {
		const max = Math.max(red, green, blue);
		const min = Math.min(red, green, blue);
		const lightness = (max + min) / 2;
		const delta = max - min;

		if (delta === 0) {
			return { hue: 0, saturation: 0, lightness: Math.round(lightness * 100) };
		}

		const saturation = delta / (1 - Math.abs(2 * lightness - 1));
		let hue;

		if (max === red) {
			hue = ((green - blue) / delta) % 6;
		} else if (max === green) {
			hue = (blue - red) / delta + 2;
		} else {
			hue = (red - green) / delta + 4;
		}

		return {
			hue: Math.round((hue * 60 + 360) % 360),
			saturation: Math.round(saturation * 100),
			lightness: Math.round(lightness * 100),
		};
	}

	function parseHexColorValue(value) {
		const normalized = String(value || "")
			.trim()
			.replace(/^#/, "");
		if (!normalized) {
			return null;
		}
		const expanded =
			normalized.length === 3
				? normalized
						.split("")
						.map((part) => `${part}${part}`)
						.join("")
				: normalized;
		if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
			return null;
		}
		return `#${expanded.toLowerCase()}`;
	}

	function normalizeHexColorValue(value, fallback = "#000000") {
		return parseHexColorValue(value) || parseHexColorValue(fallback) || "#000000";
	}

	function buildArtColorDisplay(value, fallback) {
		const hex = normalizeHexColorValue(value, fallback);
		const rgb = hexToRgbFraction(hex, fallback);
		const hsl = rgbFractionToHsl(rgb);
		return {
			hex,
			rgb: `rgb(${Math.round(rgb.red * 255)}, ${Math.round(rgb.green * 255)}, ${Math.round(rgb.blue * 255)})`,
			hsl: `hsl(${hsl.hue} ${hsl.saturation}% ${hsl.lightness}%)`,
		};
	}

	function sanitizeFileSegment(value, fallback) {
		const normalized = String(value ?? "")
			.replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
			.trim();

		return normalized || fallback;
	}

	function parseNameList(value) {
		return String(value ?? "")
			.split(/\r?\n/g)
			.map((line) => line.trim())
			.filter(Boolean);
	}

	function normalizeRangeInteger(value, fallback, min = 0, max = 10) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isNaN(parsed)) {
			return fallback;
		}
		return Math.max(min, Math.min(max, parsed));
	}

	function normalizeValueMap(definitions, values) {
		return Object.fromEntries(definitions.map((definition) => [definition.key, normalizeRangeInteger(values?.[definition.key], definition.defaultValue)]));
	}

	function findDuplicates(values) {
		const counts = new Map();
		for (const value of values) {
			counts.set(value, (counts.get(value) || 0) + 1);
		}
		return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
	}

	function buildScaffoldIdentity() {
		const civilizationName = normalizeDisplayName(scaffoldCivilizationName, "Custom Civilization");
		const leaderName = normalizeDisplayName(scaffoldLeaderName, "Custom Leader");
		const civType = normalizeKey(civilizationName, "CIVILIZATION_", "CUSTOM_CIV");
		const leaderType = normalizeKey(leaderName, "LEADER_", "CUSTOM_LEADER");
		const civSuffix = stripPrefix(civType, "CIVILIZATION_") || "CUSTOM_CIV";
		const leaderSuffix = stripPrefix(leaderType, "LEADER_") || "CUSTOM_LEADER";
		const civStem = buildFileStem(civSuffix);
		const leaderStem = buildFileStem(leaderSuffix);
		const fileStem = `${civStem}_${leaderStem}`;
		const folderName = `${sanitizeFileSegment(civilizationName, civStem)} (${sanitizeFileSegment(leaderName, leaderStem)})`;
		const traitType = `TRAIT_${civSuffix}_UA`;
		const mapStem = `${civStem}_${leaderStem}`;

		return {
			civilizationName,
			leaderName,
			civType,
			leaderType,
			civSuffix,
			leaderSuffix,
			civStem,
			leaderStem,
			fileStem,
			folderName,
			traitType,
			traitNameKey: `TXT_KEY_TRAIT_${civSuffix}_UA`,
			traitShortKey: `TXT_KEY_TRAIT_${civSuffix}_UA_SHORT`,
			civDescKey: `TXT_KEY_CIVILIZATION_${civSuffix}_DESC`,
			civShortKey: `TXT_KEY_CIVILIZATION_${civSuffix}_SHORT_DESC`,
			civAdjectiveKey: `TXT_KEY_CIVILIZATION_${civSuffix}_ADJECTIVE`,
			leaderNameKey: `TXT_KEY_LEADER_${leaderSuffix}`,
			leaderPediaKey: `TXT_KEY_LEADER_${leaderSuffix}_PEDIA`,
			leaderCivilopediaTag: `TXT_KEY_CIVILOPEDIA_LEADERS_${leaderSuffix}`,
			dawnOfManKey: `TXT_KEY_CIV5_DAWN_${civSuffix}_TEXT`,
			peaceMusic: `${civStem}_${leaderStem}_Peace`,
			warMusic: `${civStem}_${leaderStem}_War`,
			iconAtlas: `${civSuffix}_ICON_ATLAS`,
			alphaAtlas: `${civSuffix}_ALPHA_ATLAS`,
			unitFlagAtlas: `${civSuffix}_UNIT_FLAG_ATLAS`,
			playerColor: `PLAYERCOLOR_${civSuffix}`,
			primaryColor: `COLOR_PLAYER_${civSuffix}_BACKGROUND`,
			secondaryColor: `COLOR_PLAYER_${civSuffix}_ICON`,
			leaderSceneFile: `${leaderStem}_Scene.xml`,
			leaderFallbackImage: `${leaderStem}_Diplo.dds`,
			mapImage: `Art/Maps/Map_${mapStem}.dds`,
		};
	}

	function buildScaffoldUnitRecord(kind, displayName, civSuffix) {
		const safeName = normalizeDisplayName(displayName, kind === "primary" ? "Unique Unit" : "Second Unique Unit");
		const nameSuffix = normalizeIdentifier(safeName, kind === "primary" ? "UNIQUE_UNIT" : "SECOND_UNIQUE_UNIT");
		const type = `UNIT_${civSuffix}_${nameSuffix}`;
		const defaults = kind === "primary" ? { baseType: "UNIT_SWORDSMAN", unitClassType: "UNITCLASS_SWORDSMAN" } : { baseType: "UNIT_ARCHER", unitClassType: "UNITCLASS_ARCHER" };

		return {
			kind: "unit",
			displayName: safeName,
			type,
			baseType: defaults.baseType,
			unitClassType: defaults.unitClassType,
			nameKey: `TXT_KEY_${type}`,
			helpKey: `TXT_KEY_${type}_HELP`,
			strategyKey: `TXT_KEY_${type}_STRATEGY`,
			pediaKey: `TXT_KEY_CIV5_${type}_TEXT`,
		};
	}

	function buildScaffoldSecondaryUnique(identity) {
		if (scaffoldSecondUniqueType === "unit") {
			return buildScaffoldUnitRecord("secondary", scaffoldSecondUniqueName, identity.civSuffix);
		}

		const safeName = normalizeDisplayName(scaffoldSecondUniqueName, "Second Unique");
		const nameSuffix = normalizeIdentifier(safeName, "SECOND_UNIQUE");

		if (scaffoldSecondUniqueType === "building") {
			const type = `BUILDING_${identity.civSuffix}_${nameSuffix}`;
			return {
				kind: "building",
				displayName: safeName,
				type,
				baseType: "BUILDING_MONUMENT",
				buildingClassType: "BUILDINGCLASS_MONUMENT",
				nameKey: `TXT_KEY_${type}`,
				helpKey: `TXT_KEY_${type}_HELP`,
				strategyKey: `TXT_KEY_${type}_STRATEGY`,
				pediaKey: `TXT_KEY_CIV5_${type}_TEXT`,
			};
		}

		const type = `IMPROVEMENT_${identity.civSuffix}_${nameSuffix}`;
		return {
			kind: "improvement",
			displayName: safeName,
			type,
			baseType: "IMPROVEMENT_TRADING_POST",
			buildType: `BUILD_${identity.civSuffix}_${nameSuffix}`,
			baseBuildType: "BUILD_TRADING_POST",
			nameKey: `TXT_KEY_${type}`,
			helpKey: `TXT_KEY_${type}_HELP`,
			pediaKey: `TXT_KEY_CIV5_${type}_TEXT`,
		};
	}

	function buildNumberedTags(prefix, count) {
		return Array.from({ length: count }, (_, index) => `${prefix}_${String(index + 1).padStart(2, "0")}`);
	}

	function buildCivilizationScaffoldArchiveBaseName() {
		const identity = buildScaffoldIdentity();
		return `${identity.fileStem}_Skeleton`;
	}

	function buildCivilizationScaffoldDirectoryEntries(identity) {
		const root = identity.folderName;
		const directories = [
			`${root}/`,
			`${root}/Core/`,
			`${root}/Lua/`,
			`${root}/UI/`,
			`${root}/Audio/`,
			`${root}/Art/`,
			`${root}/Art/Features/`,
			`${root}/Art/Icons/`,
			`${root}/Art/Leaderscene/`,
			`${root}/Art/Maps/`,
			`${root}/Art/Models/`,
		];

		return directories.map((name) => ({ name, content: "" }));
	}

	function buildCivilizationScaffoldZipEntries(identity, primaryUnit, secondaryUnique) {
		const root = identity.folderName;
		return [
			...buildCivilizationScaffoldDirectoryEntries(identity),
			{
				name: `${root}/Core/${identity.fileStem}_GameDefines.sql`,
				content: buildCivilizationScaffoldGameDefinesSql(identity, primaryUnit, secondaryUnique),
			},
			{
				name: `${root}/Core/${identity.fileStem}_GameText.xml`,
				content: buildCivilizationScaffoldGameTextXml(identity, primaryUnit, secondaryUnique),
			},
			{
				name: `${root}/Core/${identity.fileStem}_ArtDefines.sql`,
				content: buildCivilizationScaffoldArtSql(identity),
			},
			{
				name: `${root}/Core/${identity.fileStem}_ModSupport.sql`,
				content: buildCivilizationScaffoldModSupportSql(identity),
			},
			{
				name: `${root}/Lua/${identity.fileStem}_Functions.lua`,
				content: buildCivilizationScaffoldLua(identity, primaryUnit, secondaryUnique),
			},
			{
				name: `${root}/Art/Leaderscene/${identity.leaderSceneFile}`,
				content: buildCivilizationScaffoldLeaderSceneXml(identity),
			},
		];
	}

	function buildCityEntry(name, index) {
		const text = String(name ?? "").trim() || `City ${index + 1}`;
		const slug = normalizeIdentifier(text, `CITY_${index + 1}`);
		const tagSuffix = slug.startsWith(`${civilizationSuffix}_`) ? slug : `${civilizationSuffix}_${slug}`;
		return {
			text,
			tag: `TXT_KEY_CITY_NAME_${tagSuffix}`,
		};
	}

	function buildSpyEntry(name, index) {
		const text = String(name ?? "").trim() || `Spy ${index + 1}`;
		return {
			text,
			tag: `TXT_KEY_SPY_NAME_${civilizationSuffix}_${index}`,
		};
	}

	function escapeXml(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");
	}

	function escapeSqlLiteral(value) {
		return String(value ?? "").replace(/'/g, "''");
	}

	function buildInsertBlock(tableName, columnName, entries) {
		if (!entries.length) {
			return `-- Add ${columnName === "CityName" ? "city" : "spy"} names in the wizard to emit ${tableName} rows.`;
		}

		const lines = [`INSERT INTO ${tableName} (CivilizationType, ${columnName})`, "VALUES"];
		lines.push(entries.map((entry, index) => `\t('${escapeSqlLiteral(normalizedCivilizationType)}', '${escapeSqlLiteral(entry.tag)}')${index === entries.length - 1 ? ";" : ","}`).join("\n"));
		return lines.join("\n");
	}

	function buildInteractiveNamingPackExample() {
		const scaffoldStemLabel = "<Civ_Leader>";
		const textLines = ['<?xml version="1.0" encoding="utf-8" ?>', "<GameData>", "\t<Language_en_US>"];
		if (!cityEntries.length && !spyEntries.length) {
			textLines.push("\t\t<!--City Names-->");
			textLines.push("\t\t<!-- Add names in the generator to emit localization rows. -->");
			textLines.push("\t\t<!--Spy Names-->");
			textLines.push("\t\t<!-- Add names in the generator to emit localization rows. -->");
		} else {
			textLines.push("\t\t<!--City Names-->");
			for (const entry of cityEntries) {
				textLines.push(`\t\t<Row Tag="${escapeXml(entry.tag)}" Text="${escapeXml(entry.text)}" />`);
			}

			textLines.push("\t\t<!--Spy Names-->");
			for (const entry of spyEntries) {
				textLines.push(`\t\t<Row Tag="${escapeXml(entry.tag)}" Text="${escapeXml(entry.text)}" />`);
			}
		}

		textLines.push("\t</Language_en_US>", "</GameData>");

		return {
			...example,
			title: `Interactive ${civilizationSuffix} naming pack`,
			summary: `${cityEntries.length} city names and ${spyEntries.length} spy names for ${normalizedCivilizationType}.`,
			files: [
				{
					label: `${scaffoldStemLabel}_GameDefines.sql`,
					path: `Core/${scaffoldStemLabel}_GameDefines.sql`,
					language: "sql",
					code: [
						"-- City names",
						buildInsertBlock("Civilization_CityNames", "CityName", cityEntries),
						"",
						"-- Spy names",
						buildInsertBlock("Civilization_SpyNames", "SpyName", spyEntries),
					].join("\n"),
					note: "Replace these naming inserts in the generated GameDefines.sql file, or your own.",
				},
				{
					label: `${scaffoldStemLabel}_GameText.xml`,
					path: `Core/${scaffoldStemLabel}_GameText.xml`,
					language: "xml",
					code: textLines.join("\n"),
					note: "Replace these Language_en_US rows in the generated GameText.xml file, or your own.",
				},
			],
		};
	}

	function buildScaffoldCityInsertBlock(identity) {
		const tags = buildNumberedTags(`TXT_KEY_CITY_NAME_${identity.civSuffix}`, SCAFFOLD_CITY_PLACEHOLDER_COUNT);
		return [
			"INSERT INTO Civilization_CityNames (CivilizationType, CityName)",
			"VALUES",
			tags.map((tag, index) => `\t('${escapeSqlLiteral(identity.civType)}', '${tag}')${index === tags.length - 1 ? ";" : ","}`).join("\n"),
		].join("\n");
	}

	function buildScaffoldSpyInsertBlock(identity) {
		const tags = buildNumberedTags(`TXT_KEY_SPY_NAME_${identity.civSuffix}`, SCAFFOLD_SPY_PLACEHOLDER_COUNT);
		return [
			"INSERT INTO Civilization_SpyNames (CivilizationType, SpyName)",
			"VALUES",
			tags.map((tag, index) => `\t('${escapeSqlLiteral(identity.civType)}', '${tag}')${index === tags.length - 1 ? ";" : ","}`).join("\n"),
		].join("\n");
	}

	function buildScaffoldPrimaryUnitSql(identity, primaryUnit) {
		return [
			"-- Unit Unique",
			"INSERT INTO",
			"\tUnits (Type, Class, CombatClass, PrereqTech, Combat, RangedCombat, Range, Cost, Moves, DefaultUnitAI, Domain, Description, Help, Civilopedia, Strategy, MilitarySupport, MilitaryProduction, Pillage, ObsoleteTech, GoodyHutUpgradeUnitClass, XPValueAttack, XPValueDefense, UnitArtInfo, UnitFlagAtlas, UnitFlagIconOffset, IconAtlas, PortraitIndex)",
			"SELECT",
			`\t'${primaryUnit.type}', Class, CombatClass, PrereqTech, Combat, RangedCombat, Range, Cost, Moves, DefaultUnitAI, Domain,`,
			`\t'${primaryUnit.nameKey}', '${primaryUnit.helpKey}', '${primaryUnit.pediaKey}', '${primaryUnit.strategyKey}',`,
			"\tMilitarySupport, MilitaryProduction, Pillage, ObsoleteTech, GoodyHutUpgradeUnitClass, XPValueAttack, XPValueDefense,",
			`\tUnitArtInfo, '${identity.unitFlagAtlas}', 0, '${identity.iconAtlas}', 0`,
			"FROM Units",
			`WHERE Type = '${primaryUnit.baseType}';`,
			"",
			"INSERT INTO Civilization_UnitClassOverrides (CivilizationType, UnitClassType, UnitType)",
			"VALUES",
			`\t('${identity.civType}', '${primaryUnit.unitClassType}', '${primaryUnit.type}');`,
			"",
			"INSERT INTO Unit_AITypes (UnitType, UnitAIType)",
			"SELECT",
			`\t'${primaryUnit.type}', UnitAIType`,
			"FROM Unit_AITypes",
			`WHERE UnitType = '${primaryUnit.baseType}';`,
			"",
			"INSERT INTO Unit_ClassUpgrades (UnitType, UnitClassType)",
			"SELECT",
			`\t'${primaryUnit.type}', UnitClassType`,
			"FROM Unit_ClassUpgrades",
			`WHERE UnitType = '${primaryUnit.baseType}';`,
			"",
			"INSERT INTO Unit_Flavors (UnitType, FlavorType, Flavor)",
			"SELECT",
			`\t'${primaryUnit.type}', FlavorType, Flavor`,
			"FROM Unit_Flavors",
			`WHERE UnitType = '${primaryUnit.baseType}';`,
			"",
			`-- TODO: Add promotions, stats, and any class-specific tables for ${primaryUnit.displayName}.`,
		].join("\n");
	}

	function buildScaffoldSecondaryUniqueSql(identity, unique) {
		if (!unique) {
			return "-- Optional second unique not selected.";
		}

		if (unique.kind === "unit") {
			return [
				"-- Unit Unique",
				"INSERT INTO",
				"\tUnits (Type, Class, CombatClass, PrereqTech, Combat, RangedCombat, Range, Cost, Moves, DefaultUnitAI, Domain, Description, Help, Civilopedia, Strategy, MilitarySupport, MilitaryProduction, Pillage, ObsoleteTech, GoodyHutUpgradeUnitClass, XPValueAttack, XPValueDefense, UnitArtInfo, UnitFlagAtlas, UnitFlagIconOffset, IconAtlas, PortraitIndex)",
				"SELECT",
				`\t'${unique.type}', Class, CombatClass, PrereqTech, Combat, RangedCombat, Range, Cost, Moves, DefaultUnitAI, Domain,`,
				`\t'${unique.nameKey}', '${unique.helpKey}', '${unique.pediaKey}', '${unique.strategyKey}',`,
				"\tMilitarySupport, MilitaryProduction, Pillage, ObsoleteTech, GoodyHutUpgradeUnitClass, XPValueAttack, XPValueDefense,",
				`\tUnitArtInfo, '${identity.unitFlagAtlas}', 1, '${identity.iconAtlas}', 1`,
				"FROM Units",
				`WHERE Type = '${unique.baseType}';`,
				"",
				"INSERT INTO Civilization_UnitClassOverrides (CivilizationType, UnitClassType, UnitType)",
				"VALUES",
				`\t('${identity.civType}', '${unique.unitClassType}', '${unique.type}');`,
				"",
				"INSERT INTO Unit_AITypes (UnitType, UnitAIType)",
				"SELECT",
				`\t'${unique.type}', UnitAIType`,
				"FROM Unit_AITypes",
				`WHERE UnitType = '${unique.baseType}';`,
				"",
				"INSERT INTO Unit_ClassUpgrades (UnitType, UnitClassType)",
				"SELECT",
				`\t'${unique.type}', UnitClassType`,
				"FROM Unit_ClassUpgrades",
				`WHERE UnitType = '${unique.baseType}';`,
				"",
				"INSERT INTO Unit_Flavors (UnitType, FlavorType, Flavor)",
				"SELECT",
				`\t'${unique.type}', FlavorType, Flavor`,
				"FROM Unit_Flavors",
				`WHERE UnitType = '${unique.baseType}';`,
				"",
				`-- TODO: Add promotions and bespoke effects for ${unique.displayName}.`,
			].join("\n");
		}

		if (unique.kind === "building") {
			return [
				"-- Building Unique",
				"INSERT INTO",
				"\tBuildings (Type, BuildingClass, Cost, GoldMaintenance, PrereqTech, Description, Help, Civilopedia, Strategy, ArtDefineTag, MinAreaSize, NeverCapture, NukeImmune, ConquestProb, IconAtlas, PortraitIndex)",
				"SELECT",
				`\t'${unique.type}', BuildingClass, Cost, GoldMaintenance, PrereqTech, '${unique.nameKey}', '${unique.helpKey}', '${unique.pediaKey}', '${unique.strategyKey}',`,
				"\tArtDefineTag, MinAreaSize, NeverCapture, NukeImmune, ConquestProb,",
				`\t'${identity.iconAtlas}', 2`,
				"FROM Buildings",
				`WHERE Type = '${unique.baseType}';`,
				"",
				"INSERT INTO Civilization_BuildingClassOverrides (CivilizationType, BuildingClassType, BuildingType)",
				"VALUES",
				`\t('${identity.civType}', '${unique.buildingClassType}', '${unique.type}');`,
				"",
				"INSERT INTO Building_Flavors (BuildingType, FlavorType, Flavor)",
				"SELECT",
				`\t'${unique.type}', FlavorType, Flavor`,
				"FROM Building_Flavors",
				`WHERE BuildingType = '${unique.baseType}';`,
				"",
				`-- TODO: Add any yield, specialist, or dummy-building tables for ${unique.displayName}.`,
			].join("\n");
		}

		return [
			"-- Improvement Unique",
			"INSERT INTO",
			"\tImprovements (Type, Description, Civilopedia, ArtDefineTag, PillageGold, CreatedByGreatPerson, SpecificCivRequired, RequiredCivilization)",
			"SELECT",
			`\t'${unique.type}', '${unique.nameKey}', '${unique.pediaKey}', ArtDefineTag, PillageGold, CreatedByGreatPerson, 1, '${identity.civType}'`,
			"FROM Improvements",
			`WHERE Type = '${unique.baseType}';`,
			"",
			"INSERT INTO",
			"\tBuilds (Type, PrereqTech, Time, ImprovementType, Description, Help, Recommendation)",
			"SELECT",
			`\t'${unique.buildType}', PrereqTech, Time, '${unique.type}', '${unique.nameKey}', '${unique.helpKey}', Recommendation`,
			"FROM Builds",
			`WHERE Type = '${unique.baseBuildType}';`,
			"",
			"INSERT INTO Improvement_Flavors (ImprovementType, FlavorType, Flavor)",
			"SELECT",
			`\t'${unique.type}', FlavorType, Flavor`,
			"FROM Improvement_Flavors",
			`WHERE ImprovementType = '${unique.baseType}';`,
			"",
			`-- TODO: Decide which unit or trait should unlock ${unique.buildType} and add any resource or terrain tables it needs.`,
		].join("\n");
	}

	function buildCivilizationScaffoldGameDefinesSql(identity, primaryUnit, secondaryUnique) {
		const templateCivilizationType = "CIVILIZATION_AZTEC";
		return [
			"-- Civilization Starter generated by CMC",
			"-- Replace template rows, art references, and placeholder values before shipping.",
			`-- Template civ for cloning: ${templateCivilizationType}`,
			"",
			"INSERT INTO Traits (Type, Description, ShortDescription)",
			"VALUES",
			`\t('${identity.traitType}', '${identity.traitNameKey}', '${identity.traitShortKey}');`,
			"",
			"INSERT INTO Leaders (Type, Description, Civilopedia, CivilopediaTag, ArtDefineTag, IconAtlas, PortraitIndex)",
			"VALUES",
			`\t('${identity.leaderType}', '${identity.leaderNameKey}', '${identity.leaderPediaKey}', '${identity.leaderCivilopediaTag}', '${identity.leaderSceneFile}', '${identity.iconAtlas}', 0);`,
			"",
			"INSERT INTO Leader_Traits (LeaderType, TraitType)",
			"VALUES",
			`\t('${identity.leaderType}', '${identity.traitType}');`,
			"",
			"INSERT INTO",
			"\tCivilizations (Type, Description, ShortDescription, Adjective, CivilopediaTag, DefaultPlayerColor, ArtDefineTag, ArtStyleType, ArtStyleSuffix, ArtStylePrefix, PortraitIndex, IconAtlas, AlphaIconAtlas, MapImage, DawnOfManQuote, DawnOfManImage, DawnOfManAudio, SoundtrackTag)",
			"SELECT",
			`\t'${identity.civType}', '${identity.civDescKey}', '${identity.civShortKey}', '${identity.civAdjectiveKey}', CivilopediaTag, '${identity.playerColor}', ArtDefineTag, ArtStyleType, ArtStyleSuffix, ArtStylePrefix,`,
			`\t0, '${identity.iconAtlas}', '${identity.alphaAtlas}', '${identity.mapImage}', '${identity.dawnOfManKey}', DawnOfManImage, DawnOfManAudio, '${identity.civStem.toUpperCase()}'`,
			"FROM Civilizations",
			`WHERE Type = '${templateCivilizationType}';`,
			"",
			"INSERT INTO Civilization_Leaders (CivilizationType, LeaderheadType)",
			"VALUES",
			`\t('${identity.civType}', '${identity.leaderType}');`,
			"",
			"-- Starter free rows copied from a normal civ shell",
			"INSERT INTO",
			"\tCivilization_FreeBuildingClasses (CivilizationType, BuildingClassType)",
			"SELECT",
			`\t'${identity.civType}',`,
			"\tBuildingClassType",
			"FROM",
			"\tCivilization_FreeBuildingClasses",
			"WHERE",
			`\tCivilizationType = '${templateCivilizationType}';`,
			"",
			"INSERT INTO",
			"\tCivilization_FreeTechs (CivilizationType, TechType)",
			"SELECT",
			`\t'${identity.civType}',`,
			"\tTechType",
			"FROM",
			"\tCivilization_FreeTechs",
			"WHERE",
			`\tCivilizationType = '${templateCivilizationType}';`,
			"",
			"INSERT INTO",
			"\tCivilization_FreeUnits (CivilizationType, UnitClassType, Count, UnitAIType)",
			"SELECT",
			`\t'${identity.civType}',`,
			"\tUnitClassType,",
			"\tCount,",
			"\tUnitAIType",
			"FROM",
			"\tCivilization_FreeUnits",
			"WHERE",
			`\tCivilizationType = '${templateCivilizationType}';`,
			"",
			buildScaffoldCityInsertBlock(identity),
			"",
			buildScaffoldSpyInsertBlock(identity),
			"",
			buildScaffoldPrimaryUnitSql(identity, primaryUnit),
			"",
			buildScaffoldSecondaryUniqueSql(identity, secondaryUnique),
		].join("\n");
	}

	function buildCivilizationScaffoldArtSql(identity) {
		return [
			"-- Placeholder art and color registration",
			"-- Add the DDS files later; the starter only registers the expected names.",
			"",
			"INSERT INTO Colors (Type, Red, Green, Blue, Alpha)",
			"VALUES",
			`\t('${identity.primaryColor}', 0.25, 0.25, 0.25, 1.0),`,
			`\t('${identity.secondaryColor}', 0.85, 0.85, 0.85, 1.0);`,
			"",
			"INSERT INTO PlayerColors (Type, PrimaryColor, SecondaryColor, TextColor)",
			"VALUES",
			`\t('${identity.playerColor}', '${identity.primaryColor}', '${identity.secondaryColor}', 'COLOR_PLAYER_WHITE_TEXT');`,
			"",
			"INSERT INTO IconTextureAtlases (Atlas, IconSize, Filename, IconsPerRow, IconsPerColumn)",
			"VALUES",
			`\t('${identity.iconAtlas}', 256, '${identity.civStem}_IconAtlas_256.dds', 1, 1),`,
			`\t('${identity.iconAtlas}', 128, '${identity.civStem}_IconAtlas_128.dds', 1, 1),`,
			`\t('${identity.iconAtlas}', 80, '${identity.civStem}_IconAtlas_80.dds', 1, 1),`,
			`\t('${identity.iconAtlas}', 64, '${identity.civStem}_IconAtlas_64.dds', 1, 1),`,
			`\t('${identity.iconAtlas}', 48, '${identity.civStem}_IconAtlas_48.dds', 1, 1),`,
			`\t('${identity.iconAtlas}', 32, '${identity.civStem}_IconAtlas_32.dds', 1, 1),`,
			`\t('${identity.iconAtlas}', 24, '${identity.civStem}_IconAtlas_24.dds', 1, 1),`,
			`\t('${identity.alphaAtlas}', 128, '${identity.civStem}_AlphaAtlas_128.dds', 1, 1),`,
			`\t('${identity.alphaAtlas}', 80, '${identity.civStem}_AlphaAtlas_80.dds', 1, 1),`,
			`\t('${identity.alphaAtlas}', 64, '${identity.civStem}_AlphaAtlas_64.dds', 1, 1),`,
			`\t('${identity.alphaAtlas}', 48, '${identity.civStem}_AlphaAtlas_48.dds', 1, 1),`,
			`\t('${identity.alphaAtlas}', 32, '${identity.civStem}_AlphaAtlas_32.dds', 1, 1),`,
			`\t('${identity.alphaAtlas}', 24, '${identity.civStem}_AlphaAtlas_24.dds', 1, 1),`,
			`\t('${identity.unitFlagAtlas}', 32, '${identity.civStem}_UnitFlagAtlas_32.dds', 1, 1),`,
			`\t('${identity.unitFlagAtlas}', 128, '${identity.civStem}_UnitFlagAtlas_128.dds', 1, 1);`,
		].join("\n");
	}

	function buildCivilizationScaffoldModSupportSql(identity) {
		const templateCivilizationType = "CIVILIZATION_AZTEC";
		return [
			"-- Optional, but recommended, mod support scaffold",
			"-- Civilization_JFD_ColonialCityNames",
			"CREATE TABLE",
			"\tIF NOT EXISTS Civilization_JFD_ColonialCityNames (CivilizationType, ColonyName, LinguisticType);",
			"",
			"INSERT INTO",
			"\tCivilization_JFD_ColonialCityNames (CivilizationType, ColonyName)",
			"VALUES",
			`\t('${identity.civType}', 'TXT_KEY_COLONY_NAME_${identity.civSuffix}_01');`,
			"",
			"-- Civilizations_YnAEMP",
			"CREATE TABLE",
			"\tIF NOT EXISTS Civilizations_YnAEMP (CivilizationType, MapPrefix, X, Y, CapitalName, AltX, AltY, AltCapitalName);",
			"",
			"INSERT INTO",
			"\tCivilizations_YnAEMP (CivilizationType, MapPrefix, X, Y, AltX, AltY, AltCapitalName)",
			"VALUES",
			`\t('${identity.civType}', 'AfriAsiaAust', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'AfricaLarge', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'AfriSouthEuro', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Americas', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Apennine', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Asia', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'BritishIsles', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Caribbean', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Cordiform', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'EarthMk3', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'EastAsia', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'EuroLarge', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'EuroLargeNew', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'GreatestEarth', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'IndianOcean', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Mediterranean', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Mesopotamia', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'NorthAtlantic', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'NorthEastAsia', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'NorthWestEurope', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Orient', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'SouthPacific', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Yagem', 0, 0, null, null, null),`,
			`\t('${identity.civType}', 'Yahem', 0, 0, null, null, null);`,
			"",
			"-- Civilizations_YnAEMPRequestedResources",
			"CREATE TABLE",
			"\tIF NOT EXISTS Civilizations_YnAEMPRequestedResources (CivilizationType, MapPrefix, Req1, Yield1, Req2, Yield2, Req3, Yield3, Req4, Yield4, Req5, Yield5, Req6, Yield6);",
			"",
			"INSERT INTO",
			"\tCivilizations_YnAEMPRequestedResources (CivilizationType, MapPrefix, Req1, Yield1, Req2, Yield2, Req3, Yield3, Req4, Yield4, Req5, Yield5, Req6, Yield6)",
			"SELECT",
			`\t'${identity.civType}',`,
			"\tMapPrefix,",
			"\tReq1,",
			"\tYield1,",
			"\tReq2,",
			"\tYield2,",
			"\tReq3,",
			"\tYield3,",
			"\tReq4,",
			"\tYield4,",
			"\tReq5,",
			"\tYield5,",
			"\tReq6,",
			"\tYield6",
			"FROM",
			"\tCivilizations_YnAEMPRequestedResources",
			"WHERE",
			`\tCivilizationType = '${templateCivilizationType}';`,
			"",
			"-- Civilization_JFD_CultureTypes",
			"CREATE TABLE",
			"\tIF NOT EXISTS Civilization_JFD_CultureTypes (CivilizationType, CultureType, SubCultureType, ArtDefineTag, DecisionsTag, DefeatScreenEarlyTag, DefeatScreenMidTag, DefeatScreenLateTag, IdealsTag, SplashScreenTag, SoundtrackTag, UnitDialogueTag);",
			"",
			"INSERT INTO",
			"\tCivilization_JFD_CultureTypes (CivilizationType, CultureType, SplashScreenTag, SoundtrackTag)",
			"VALUES",
			`\t('${identity.civType}', 'JFD_Himalayan', 'JFD_Himalayan', 'JFD_Himalayan');`,
			"",
			"-- Civilization_JFD_Governments",
			"CREATE TABLE",
			"\tIF NOT EXISTS Civilization_JFD_Governments (CivilizationType, GovernmentType, Weight);",
			"",
			"INSERT INTO",
			"\tCivilization_JFD_Governments (CivilizationType, GovernmentType, Weight)",
			"VALUES",
			`\t('${identity.civType}', 'GOVERNMENT_JFD_MONARCHY', 80);`,
			"",
			"-- Civilization_Religions",
			"UPDATE Civilization_Religions",
			"SET",
			"\tReligionType = 'RELIGION_VAJRAYANA'",
			"WHERE",
			`\tCivilizationType = '${identity.civType}'`,
			"\tAND EXISTS (",
			"\t\tSELECT",
			"\t\t\t*",
			"\t\tFROM",
			"\t\t\tReligions",
			"\t\tWHERE",
			"\t\t\tType = 'RELIGION_VAJRAYANA'",
			"\t);",
		].join("\n");
	}

	function buildArtBundleIdentity() {
		const civilizationName = normalizeDisplayName(artCivilizationName, "Shambhala");
		const leaderName = normalizeDisplayName(artLeaderName, "Maitreya");
		const civSuffix = normalizeIdentifier(civilizationName, "CUSTOM_CIV");
		const leaderSuffix = normalizeIdentifier(leaderName, "CUSTOM_LEADER");
		const civStem = buildFileStem(civilizationName);
		const leaderStem = buildFileStem(leaderName);
		return {
			civilizationName,
			leaderName,
			civSuffix,
			leaderSuffix,
			fileStem: `${civStem}_${leaderStem}`,
			iconAtlas: `${civSuffix}_ICON_ATLAS`,
			alphaAtlas: `${civSuffix}_ALPHA_ATLAS`,
			unitFlagAtlas: `${civSuffix}_UNIT_FLAG_ATLAS`,
			uiAtlas: `${civSuffix}_UI_ATLAS`,
			playerColor: `PLAYERCOLOR_${civSuffix}`,
			primaryColorType: `COLOR_PLAYER_${civSuffix}_ICON`,
			secondaryColorType: `COLOR_PLAYER_${civSuffix}_BACKGROUND`,
			peaceSoundId: `SND_LEADER_MUSIC_${civSuffix}_${leaderSuffix}_PEACE`,
			warSoundId: `SND_LEADER_MUSIC_${civSuffix}_${leaderSuffix}_WAR`,
			peaceScriptId: `AS2D_LEADER_MUSIC_${civSuffix}_${leaderSuffix}_PEACE`,
			warScriptId: `AS2D_LEADER_MUSIC_${civSuffix}_${leaderSuffix}_WAR`,
		};
	}

	function buildArtUnitRecord() {
		const displayName = normalizeDisplayName(artUnitName, "Lotus Guard");
		const suffix = normalizeIdentifier(displayName, "CUSTOM_UNIT");
		return {
			displayName,
			artDefType: `ART_DEF_UNIT_${suffix}`,
			memberType: `ART_DEF_UNIT_MEMBER_${suffix}`,
			baseArtType: normalizeIdentifier(artUnitBaseArtType, "ART_DEF_UNIT_CUSTOM_BASE"),
			baseMemberType: normalizeIdentifier(artUnitBaseMemberType, "ART_DEF_UNIT_MEMBER_CUSTOM_BASE"),
			modelFile: normalizeDisplayName(artUnitModelFile, "custom_unit.fxsxml"),
			strategicAsset: normalizeDisplayName(artUnitStrategicAsset, "Custom_UnitFlagAtlas_128.dds"),
		};
	}

	function buildArtLandmarkRecord() {
		const displayName = normalizeDisplayName(artLandmarkName, "Lotus Sanctuary");
		const suffix = normalizeIdentifier(displayName, "CUSTOM_LANDMARK");
		return {
			displayName,
			kind: artLandmarkKind === "feature" ? "feature" : "improvement",
			type: artLandmarkKind === "feature" ? `ART_DEF_FEATURE_${suffix}` : `ART_DEF_IMPROVEMENT_${suffix}`,
			modelFile: normalizeDisplayName(artLandmarkModelFile, "custom_landmark.fxsxml"),
			strategicAsset: normalizeDisplayName(artLandmarkStrategicAsset, "custom_landmark_sref.dds"),
			scale: Number.parseFloat(artLandmarkScale) || 0.12,
		};
	}

	function buildArtIdentitySql(identity) {
		const primary = hexToRgbFraction(artPrimaryColor, "#1f4f99");
		const secondary = hexToRgbFraction(artSecondaryColor, "#f4de9a");
		const iconSizes = parseIntegerList(artIconAtlasSizes, DEFAULT_ICON_ATLAS_SIZES);
		const alphaSizes = parseIntegerList(artAlphaAtlasSizes, DEFAULT_ALPHA_ATLAS_SIZES);
		const unitFlagSizes = parseIntegerList(artUnitFlagAtlasSizes, DEFAULT_UNIT_FLAG_ATLAS_SIZES);
		const uiSizes = parseIntegerList(artUiAtlasSizes, [45, 64]);
		const atlasRows = Math.max(1, Number.parseInt(artIconAtlasRows, 10) || 2);
		const atlasCols = Math.max(1, Number.parseInt(artIconAtlasCols, 10) || 2);
		const lines = [
			"-- Audio_Sounds",
			"INSERT INTO",
			"\tAudio_Sounds (SoundID, Filename, LoadType)",
			"VALUES",
			`\t('${identity.peaceSoundId}', '${escapeSqlLiteral(normalizeDisplayName(artPeaceTrackFile, `${identity.fileStem}_Peace`))}', 'DynamicResident'),`,
			`\t('${identity.warSoundId}', '${escapeSqlLiteral(normalizeDisplayName(artWarTrackFile, `${identity.fileStem}_War`))}', 'DynamicResident');`,
			"",
			"-- Audio_2DSounds",
			"INSERT INTO",
			"\tAudio_2DSounds (ScriptID, SoundID, SoundType, TaperSoundtrackVolume, MinVolume, MaxVolume, IsMusic, Looping)",
			"VALUES",
			`\t('${identity.peaceScriptId}', '${identity.peaceSoundId}', 'GAME_MUSIC', -1.0, 50, 50, 1, 0),`,
			`\t('${identity.warScriptId}', '${identity.warSoundId}', 'GAME_MUSIC', -1.0, 50, 50, 1, 0);`,
			"",
			"-- Colors",
			"INSERT INTO",
			"\tColors (Type, Red, Green, Blue, Alpha)",
			"VALUES",
			`\t('${identity.primaryColorType}', ${primary.red}, ${primary.green}, ${primary.blue}, 1),`,
			`\t('${identity.secondaryColorType}', ${secondary.red}, ${secondary.green}, ${secondary.blue}, 1);`,
			"",
			"-- PlayerColors",
			"INSERT INTO",
			"\tPlayerColors (Type, PrimaryColor, SecondaryColor, TextColor)",
			"VALUES",
			`\t('${identity.playerColor}', '${identity.primaryColorType}', '${identity.secondaryColorType}', 'COLOR_PLAYER_WHITE_TEXT');`,
			"",
			"-- IconTextureAtlases",
			"INSERT INTO",
			"\tIconTextureAtlases (Atlas, IconSize, Filename, IconsPerRow, IconsPerColumn)",
			"VALUES",
		];

		const atlasRowsSql = [
			...alphaSizes.map((size) => `\t('${identity.alphaAtlas}', ${size}, '${identity.fileStem}_AlphaAtlas_${size}.dds', 1, 1)`),
			...iconSizes.map((size) => `\t('${identity.iconAtlas}', ${size}, '${identity.fileStem}_IconAtlas_${size}.dds', ${atlasRows}, ${atlasCols})`),
			...unitFlagSizes.map((size) => `\t('${identity.unitFlagAtlas}', ${size}, '${identity.fileStem}_UnitFlagAtlas_${size}.dds', 1, 1)`),
			...(artIncludeUiAtlas ? uiSizes.map((size) => `\t('${identity.uiAtlas}', ${size}, '${identity.fileStem}_UIAtlas_${size}.dds', 1, 1)`) : []),
		];
		lines.push(`${atlasRowsSql.map((row, index) => `${row}${index === atlasRowsSql.length - 1 ? ";" : ","}`).join("\n")}`);
		return lines.join("\n");
	}

	function buildArtUnitSql(unit) {
		return [
			"-- ArtDefine_UnitInfos",
			"INSERT INTO",
			"\tArtDefine_UnitInfos (Type, DamageStates, Formation)",
			"SELECT",
			`\t'${unit.artDefType}',`,
			"\tDamageStates,",
			"\tFormation",
			"FROM",
			"\tArtDefine_UnitInfos",
			"WHERE",
			`\tType = '${unit.baseArtType}';`,
			"",
			"-- ArtDefine_UnitInfoMemberInfos",
			"INSERT INTO",
			"\tArtDefine_UnitInfoMemberInfos (UnitInfoType, UnitMemberInfoType, NumMembers)",
			"SELECT",
			`\t'${unit.artDefType}',`,
			`\t'${unit.memberType}',`,
			"\tNumMembers",
			"FROM",
			"\tArtDefine_UnitInfoMemberInfos",
			"WHERE",
			`\tUnitInfoType = '${unit.baseArtType}';`,
			"",
			"-- ArtDefine_UnitMemberCombats",
			"INSERT INTO",
			"\tArtDefine_UnitMemberCombats (UnitMemberType, EnableActions, DisableActions, MoveRadius, ShortMoveRadius, ChargeRadius, AttackRadius, RangedAttackRadius, MoveRate, ShortMoveRate, TurnRateMin, TurnRateMax, TurnFacingRateMin, TurnFacingRateMax, RollRateMin, RollRateMax, PitchRateMin, PitchRateMax, LOSRadiusScale, TargetRadius, TargetHeight, HasShortRangedAttack, HasLongRangedAttack, HasLeftRightAttack, HasStationaryMelee, HasStationaryRangedAttack, HasRefaceAfterCombat, ReformBeforeCombat, HasIndependentWeaponFacing, HasOpponentTracking, HasCollisionAttack, AttackAltitude, AltitudeDecelerationDistance, OnlyTurnInMovementActions, RushAttackFormation)",
			"SELECT",
			`\t'${unit.memberType}',`,
			"\tEnableActions, DisableActions, MoveRadius, ShortMoveRadius, ChargeRadius, AttackRadius, RangedAttackRadius, MoveRate, ShortMoveRate, TurnRateMin, TurnRateMax, TurnFacingRateMin, TurnFacingRateMax, RollRateMin, RollRateMax, PitchRateMin, PitchRateMax, LOSRadiusScale, TargetRadius, TargetHeight, HasShortRangedAttack, HasLongRangedAttack, HasLeftRightAttack, HasStationaryMelee, HasStationaryRangedAttack, HasRefaceAfterCombat, ReformBeforeCombat, HasIndependentWeaponFacing, HasOpponentTracking, HasCollisionAttack, AttackAltitude, AltitudeDecelerationDistance, OnlyTurnInMovementActions, RushAttackFormation",
			"FROM",
			"\tArtDefine_UnitMemberCombats",
			"WHERE",
			`\tUnitMemberType = '${unit.baseMemberType}';`,
			"",
			"-- ArtDefine_UnitMemberCombatWeapons",
			"INSERT INTO",
			'\tArtDefine_UnitMemberCombatWeapons (UnitMemberType, "Index", SubIndex, ID, VisKillStrengthMin, VisKillStrengthMax, ProjectileSpeed, ProjectileTurnRateMin, ProjectileTurnRateMax, HitEffect, HitEffectScale, HitRadius, ProjectileChildEffectScale, AreaDamageDelay, ContinuousFire, WaitForEffectCompletion, TargetGround, IsDropped, WeaponTypeTag, WeaponTypeSoundOverrideTag)',
			"SELECT",
			`\t'${unit.memberType}',`,
			'\t"Index", SubIndex, ID, VisKillStrengthMin, VisKillStrengthMax, ProjectileSpeed, ProjectileTurnRateMin, ProjectileTurnRateMax, HitEffect, HitEffectScale, HitRadius, ProjectileChildEffectScale, AreaDamageDelay, ContinuousFire, WaitForEffectCompletion, TargetGround, IsDropped, WeaponTypeTag, WeaponTypeSoundOverrideTag',
			"FROM",
			"\tArtDefine_UnitMemberCombatWeapons",
			"WHERE",
			`\tUnitMemberType = '${unit.baseMemberType}';`,
			"",
			"-- ArtDefine_UnitMemberInfos",
			"INSERT INTO",
			"\tArtDefine_UnitMemberInfos (Type, Scale, ZOffset, Domain, Model, MaterialTypeTag, MaterialTypeSoundOverrideTag)",
			"SELECT",
			`\t'${unit.memberType}',`,
			"\tScale, ZOffset, Domain,",
			`\t'${unit.modelFile}',`,
			"\tMaterialTypeTag, MaterialTypeSoundOverrideTag",
			"FROM",
			"\tArtDefine_UnitMemberInfos",
			"WHERE",
			`\tType = '${unit.baseMemberType}';`,
			"",
			"-- ArtDefine_StrategicView",
			"INSERT OR REPLACE INTO ArtDefine_StrategicView",
			"\t\t(StrategicViewType, TileType, Asset)",
			"VALUES",
			`\t('${unit.memberType}', 'Unit', '${unit.strategicAsset}');`,
		].join("\n");
	}

	function buildArtLandmarkSql(landmark) {
		if (landmark.kind === "feature") {
			return [
				"-- ArtDefine_Landmarks",
				"INSERT INTO ArtDefine_Landmarks (Era, State, Scale, ImprovementType, LayoutHandler, ResourceType, Model, TerrainContour)",
				"VALUES",
				`('Any', 'Any', ${landmark.scale}, 'ART_DEF_IMPROVEMENT_NONE', 'SNAPSHOT', '${landmark.type}', '${landmark.modelFile}', 1);`,
				"",
				"-- ArtDefine_LandmarkTypes",
				"INSERT INTO ArtDefine_LandmarkTypes (Type, LandmarkType, FriendlyName)",
				"VALUES",
				`('${landmark.type}', 'Feature', '${landmark.displayName}');`,
				"",
				"-- ArtDefine_StrategicView",
				"INSERT INTO ArtDefine_StrategicView (StrategicViewType, TileType, Asset)",
				"VALUES",
				`('${landmark.type}', 'Feature', '${landmark.strategicAsset}');`,
			].join("\n");
		}

		return [
			"-- ArtDefine_Landmarks",
			"INSERT INTO ArtDefine_Landmarks (Era, State, Scale, ImprovementType, LayoutHandler, ResourceType, Model, TerrainContour)",
			"VALUES",
			`('Any', 'UnderConstruction', ${landmark.scale}, '${landmark.type}', 'SNAPSHOT', 'ART_DEF_RESOURCE_ALL', '${landmark.modelFile}', 1),`,
			`('Any', 'Constructed', ${landmark.scale}, '${landmark.type}', 'SNAPSHOT', 'ART_DEF_RESOURCE_ALL', '${landmark.modelFile}', 1),`,
			`('Any', 'Pillaged', ${landmark.scale}, '${landmark.type}', 'SNAPSHOT', 'ART_DEF_RESOURCE_ALL', '${landmark.modelFile}', 1);`,
			"",
			"-- ArtDefine_LandmarkTypes",
			"INSERT INTO ArtDefine_LandmarkTypes (Type, LandmarkType, FriendlyName)",
			"VALUES",
			`('${landmark.type}', 'Improvement', '${landmark.displayName}');`,
			"",
			"-- ArtDefine_StrategicView",
			"INSERT INTO ArtDefine_StrategicView (StrategicViewType, TileType, Asset)",
			"VALUES",
			`('${landmark.type}', 'Improvement', '${landmark.strategicAsset}');`,
		].join("\n");
	}

	function buildArtBundleSql(identity, unit, landmark) {
		return [buildArtIdentitySql(identity), ...(artIncludeUnitArt ? [buildArtUnitSql(unit)] : []), ...(artIncludeLandmarkArt ? [buildArtLandmarkSql(landmark)] : [])].join("\n\n");
	}

	function buildInteractiveArtBundleExample() {
		const identity = buildArtBundleIdentity();
		const unit = buildArtUnitRecord();
		const landmark = buildArtLandmarkRecord();
		return {
			...example,
			title: `Interactive ${identity.civilizationName} art bundle`,
			summary: `Starter-aligned ArtDefines output for ${identity.civilizationName}, with shared colors${artIncludeUnitArt ? `, ${unit.displayName} unit art` : ""}${artIncludeLandmarkArt ? `, and ${landmark.displayName} ${landmark.kind} art` : ""}.`,
			files: [
				{
					label: "<Civ_Leader>_ArtDefines.sql",
					path: "Core/<Civ_Leader>_ArtDefines.sql",
					language: "sql",
					code: buildArtBundleSql(identity, unit, landmark),
					note: "Append this art, audio, and atlas registration block to the template generator's ArtDefines.sql file.",
				},
			],
		};
	}

	function buildCivilizationScaffoldLua(identity, primaryUnit, secondaryUnique) {
		const primaryUniqueComment = `${primaryUnit.displayName} unique unit`;
		const secondaryUniqueComment = `${secondaryUnique.displayName} ${secondaryUnique.kind} unique`;
		const uniqueLines = [
			`local civilizationType = GameInfoTypes.${identity.civType}`,
			`local leaderType = GameInfoTypes.${identity.leaderType}`,
			`local traitType = GameInfoTypes.${identity.traitType}`,
			`local primaryUniqueUnitType = GameInfoTypes.${primaryUnit.type}`,
		];

		if (secondaryUnique?.kind === "unit") {
			uniqueLines.push(`local secondaryUniqueUnitType = GameInfoTypes.${secondaryUnique.type}`);
		} else if (secondaryUnique?.kind === "building") {
			uniqueLines.push(`local secondaryUniqueBuildingType = GameInfoTypes.${secondaryUnique.type}`);
		} else if (secondaryUnique?.kind === "improvement") {
			uniqueLines.push(`local secondaryUniqueImprovementType = GameInfoTypes.${secondaryUnique.type}`);
			uniqueLines.push(`local secondaryUniqueBuildType = GameInfoTypes.${secondaryUnique.buildType}`);
		}

		return [
			"-- Utility function to check if player has trait",
			"function HasTrait(player, traitID)",
			"\tif Player.HasTrait then",
			"\t\treturn player:HasTrait(traitID)",
			"\telse",
			"\t\tlocal leaderRow = GameInfo.Leaders[player:GetLeaderType()]",
			"\t\tlocal leaderTypeName = leaderRow and leaderRow.Type",
			"\t\tlocal traitTypeName = GameInfo.Traits[traitID] and GameInfo.Traits[traitID].Type",
			"\t\tif leaderTypeName and traitTypeName then",
			'\t\t\tfor row in GameInfo.Leader_Traits("LeaderType = \'" .. leaderTypeName .. "\' AND TraitType = \'" .. traitTypeName .. "\'") do',
			"\t\t\t\treturn true",
			"\t\t\tend",
			"\t\tend",
			"\tend",
			"\treturn false",
			"end",
			"",
			...uniqueLines,
			"",
			"local function isActive(player)",
			"\treturn player and player:IsAlive() and player:GetCivilizationType() == civilizationType",
			"end",
			"",
			"local function isTraitActive(player)",
			"\treturn player and HasTrait(player, traitType)",
			"end",
			"",
			"-- TODO: Add the civilization ability logic here.",
			`-- TODO: Add the ${primaryUniqueComment} hooks here.`,
			secondaryUnique ? `-- TODO: Add the ${secondaryUniqueComment} hooks here.` : "-- TODO: Add a second unique later if the design changes.",
			"",
			"GameEvents.PlayerDoTurn.Add(function(iPlayer)",
			"\tlocal player = Players[iPlayer]",
			"\tif not isActive(player) or not isTraitActive(player) then",
			"\t\treturn",
			"\tend",
			"",
			"\t-- Placeholder execution point for UA logic.",
			"end)",
		].join("\n");
	}

	function buildCivilizationScaffoldGameTextXml(identity, primaryUnit, secondaryUnique) {
		const primaryComment = `FIRST UNIQUE UNIT: ${primaryUnit.displayName.toUpperCase()}`;
		const secondaryCommentLabel = secondaryUnique.kind === "unit" ? "SECOND UNIQUE UNIT" : secondaryUnique.kind === "building" ? "SECOND UNIQUE BUILDING" : "SECOND UNIQUE IMPROVEMENT";
		const secondaryComment = `${secondaryCommentLabel}: ${secondaryUnique.displayName.toUpperCase()}`;
		const sections = [
			{
				comment: "CIVILIZATION",
				rows: [identity.civAdjectiveKey, identity.civDescKey, identity.civShortKey],
			},
			{
				comment: "TRAIT",
				rows: [identity.traitNameKey, identity.traitShortKey],
			},
			{
				comment: "LEADER",
				rows: [identity.leaderNameKey, identity.leaderPediaKey, identity.leaderCivilopediaTag],
			},
			{
				comment: "LEADER CIVILOPEDIA",
				rows: [
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_NAME`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_LIVED`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_SUBTITLE`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_TITLES_1`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_HEADING_1`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_TEXT_1`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_HEADING_2`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_TEXT_2`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_HEADING_3`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_TEXT_3`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_HEADING_4`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_TEXT_4`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_HEADING_5`,
					`TXT_KEY_CIVILOPEDIA_LEADERS_${identity.leaderSuffix}_TEXT_5`,
				],
			},
			{
				comment: primaryComment,
				rows: [primaryUnit.nameKey, primaryUnit.helpKey, primaryUnit.strategyKey, primaryUnit.pediaKey],
			},
			{
				comment: secondaryComment,
				rows: [secondaryUnique.nameKey, secondaryUnique.helpKey, ...(secondaryUnique.strategyKey ? [secondaryUnique.strategyKey] : []), secondaryUnique.pediaKey],
			},
			{
				comment: "CITY NAMES",
				rows: buildNumberedTags(`TXT_KEY_CITY_NAME_${identity.civSuffix}`, SCAFFOLD_CITY_PLACEHOLDER_COUNT),
			},
			{
				comment: "COLONIAL CITY NAMES",
				rows: [`TXT_KEY_COLONY_NAME_${identity.civSuffix}_01`],
			},
			{
				comment: "SPY NAMES",
				rows: buildNumberedTags(`TXT_KEY_SPY_NAME_${identity.civSuffix}`, SCAFFOLD_SPY_PLACEHOLDER_COUNT),
			},
			{
				comment: "DOM",
				rows: [identity.dawnOfManKey],
			},
			{
				comment: "RESPONSES",
				rows: [
					`TXT_KEY_LEADER_${identity.leaderSuffix}_FIRSTGREETING_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_DEFEATED_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_ATTACKED_HOSTILE_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_DEC_FRIENDSHIP_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_DENOUNCE_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_DENOUNCE_FRIEND_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_DOW_GENERIC_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_EXPANSION_SERIOUS_WARNING_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_GREETING_HOSTILE_HELLO_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_GREETING_NEUTRAL_HELLO_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_GREETING_POLITE_HELLO_1`,
					`TXT_KEY_LEADER_${identity.leaderSuffix}_HOSTILE_AGGRESSIVE_MILITARY_WARNING_1`,
				],
			},
		];

		const lines = ['<?xml version="1.0" encoding="utf-8" ?>', "<GameData>", "    <Language_en_US>"];
		for (const section of sections) {
			lines.push(`        <!--${section.comment}-->`);
			for (const tag of section.rows) {
				lines.push(`        <Row Tag="${escapeXml(tag)}">`);
				lines.push("            <Text></Text>");
				lines.push("        </Row>");
			}
		}
		lines.push("    </Language_en_US>", "</GameData>");

		return lines.join("\n");
	}

	function buildCivilizationScaffoldLeaderSceneXml(identity) {
		return `<LeaderScene FallbackImage="${escapeXml(identity.leaderFallbackImage)}"/>`;
	}

	function buildInteractiveCivilizationScaffoldExample() {
		const identity = buildScaffoldIdentity();
		const primaryUnit = buildScaffoldUnitRecord("primary", scaffoldPrimaryUniqueUnitName, identity.civSuffix);
		const secondaryUnique = buildScaffoldSecondaryUnique(identity);
		const secondarySummary = `${secondaryUnique.kind}: ${secondaryUnique.displayName}`;
		const root = identity.folderName;
		const gameDefinesCode = buildCivilizationScaffoldGameDefinesSql(identity, primaryUnit, secondaryUnique);
		const gameTextCode = buildCivilizationScaffoldGameTextXml(identity, primaryUnit, secondaryUnique);
		const artDefinesCode = buildCivilizationScaffoldArtSql(identity);
		const modSupportCode = buildCivilizationScaffoldModSupportSql(identity);
		const luaCode = buildCivilizationScaffoldLua(identity, primaryUnit, secondaryUnique);

		return {
			...example,
			title: `${identity.civilizationName} starter bundle`,
			summary: `${identity.civType} with one mandatory unique unit${secondaryUnique ? ` plus one ${secondaryUnique.kind}` : ""}, packaged as a starter ZIP.`,
			zipEntries: buildCivilizationScaffoldZipEntries(identity, primaryUnit, secondaryUnique),
			files: [
				{
					label: `${identity.fileStem}_GameDefines.sql`,
					path: `${root}/Core/${identity.fileStem}_GameDefines.sql`,
					language: "sql",
					code: gameDefinesCode,
					note: "Core civ shell, leader and trait joins, naming lists, and unique row scaffolding.",
				},
				{
					label: `${identity.fileStem}_GameText.xml`,
					path: `${root}/Core/${identity.fileStem}_GameText.xml`,
					language: "xml",
					code: gameTextCode,
					note: "Blank text rows for civ, leader, trait, uniques, city names, and spy names.",
				},
				{
					label: `${identity.fileStem}_ArtDefines.sql`,
					path: `${root}/Core/${identity.fileStem}_ArtDefines.sql`,
					language: "sql",
					code: artDefinesCode,
					note: "Placeholder colors and icon atlas registration matching the expected DDS filenames.",
				},
				{
					label: `${identity.fileStem}_ModSupport.sql`,
					path: `${root}/Core/${identity.fileStem}_ModSupport.sql`,
					language: "sql",
					code: modSupportCode,
					note: "Reserved compatibility file for YnAEMP, RtP, CulDiv, or other ecosystem-specific support later.",
				},
				{
					label: `${identity.fileStem}_Functions.lua`,
					path: `${root}/Lua/${identity.fileStem}_Functions.lua`,
					language: "lua",
					code: luaCode,
					note: "Starter Lua shell with civ, leader, trait, and unique references plus active civ safety checks.",
				},
			],
			preview: {
				...preview,
				steps: [
					{
						title: "Civilization identity",
						copy: "Set the civ and leader names that drive the generated keys.",
						fields: [
							{ label: "Civilization name", value: identity.civilizationName },
							{ label: "Leader name", value: identity.leaderName },
						],
					},
					{
						title: "Unique loadout",
						copy: "Pick the mandatory unique unit and the optional second unique.",
						fields: [
							{ label: "Primary unique", value: `Unit: ${primaryUnit.displayName}` },
							{ label: "Second unique", value: secondarySummary },
						],
					},
					{
						title: "Output bundle",
						copy: "Emit the base file tree and package it as a ZIP download.",
						fields: [
							{ label: "Root folder", value: root },
							{ label: "Archive name", value: `${buildCivilizationScaffoldArchiveBaseName()}.zip` },
						],
					},
				],
			},
		};
	}

	function createLeaderFlavorMap(overrides = {}, legacyLines = []) {
		const normalizedOverrides = { ...(overrides || {}) };

		if (Array.isArray(legacyLines)) {
			for (const rawLine of legacyLines) {
				const match = String(rawLine || "")
					.trim()
					.match(/^([A-Za-z0-9_]+)\s*[:=]\s*(-?\d+)$/);
				if (!match) {
					continue;
				}
				normalizedOverrides[normalizeKey(match[1], "FLAVOR_", "CUSTOM")] = match[2];
			}
		}

		return createValueMap(LEADER_FLAVOR_FIELDS, normalizedOverrides);
	}

	function titleFromKey(value) {
		return String(value || "")
			.split("_")
			.filter(Boolean)
			.map((part) => part.charAt(0) + part.slice(1).toLowerCase())
			.join(" ");
	}

	function buildLeaderSqlCode() {
		const majorEntries = LEADER_MAJOR_APPROACH_FIELDS.map((field) => ({ type: field.key, value: normalizedLeaderMajorBiasValues[field.key] }));
		const minorEntries = LEADER_MINOR_APPROACH_FIELDS.map((field) => ({ type: field.key, value: normalizedLeaderMinorBiasValues[field.key] }));

		return [
			"UPDATE Leaders",
			"SET",
			`\tVictoryCompetitiveness = ${normalizedLeaderPersonalityValues.VictoryCompetitiveness},`,
			`\tWonderCompetitiveness = ${normalizedLeaderPersonalityValues.WonderCompetitiveness},`,
			`\tMinorCivCompetitiveness = ${normalizedLeaderPersonalityValues.MinorCivCompetitiveness},`,
			`\tBoldness = ${normalizedLeaderPersonalityValues.Boldness},`,
			`\tDiploBalance = ${normalizedLeaderPersonalityValues.DiploBalance},`,
			`\tWarmongerHate = ${normalizedLeaderPersonalityValues.WarmongerHate},`,
			`\tDenounceWillingness = ${normalizedLeaderPersonalityValues.DenounceWillingness},`,
			`\tDoFWillingness = ${normalizedLeaderPersonalityValues.DoFWillingness},`,
			`\tLoyalty = ${normalizedLeaderPersonalityValues.Loyalty},`,
			`\tNeediness = ${normalizedLeaderPersonalityValues.Neediness},`,
			`\tForgiveness = ${normalizedLeaderPersonalityValues.Forgiveness},`,
			`\tChattiness = ${normalizedLeaderPersonalityValues.Chattiness},`,
			`\tMeanness = ${normalizedLeaderPersonalityValues.Meanness}`,
			"WHERE",
			`\tType = '${escapeSqlLiteral(normalizedLeaderType)}';`,
			"",
			"-- Leader_MajorCivApproachBiases",
			"INSERT INTO",
			"\tLeader_MajorCivApproachBiases (LeaderType, MajorCivApproachType, Bias)",
			"VALUES",
			majorEntries
				.map((entry, index) => `\t('${escapeSqlLiteral(normalizedLeaderType)}', '${escapeSqlLiteral(entry.type)}', ${entry.value})${index === majorEntries.length - 1 ? ";" : ","}`)
				.join("\n"),
			"",
			"-- Leader_MinorCivApproachBiases",
			"INSERT INTO",
			"\tLeader_MinorCivApproachBiases (LeaderType, MinorCivApproachType, Bias)",
			"VALUES",
			minorEntries
				.map((entry, index) => `\t('${escapeSqlLiteral(normalizedLeaderType)}', '${escapeSqlLiteral(entry.type)}', ${entry.value})${index === minorEntries.length - 1 ? ";" : ","}`)
				.join("\n"),
			"",
			"-- Leader_Flavors",
			"INSERT INTO",
			"\tLeader_Flavors (LeaderType, FlavorType, Flavor)",
			"VALUES",
			leaderFlavorEntries
				.map((entry, index) => `\t('${escapeSqlLiteral(normalizedLeaderType)}', '${escapeSqlLiteral(entry.type)}', ${entry.value})${index === leaderFlavorEntries.length - 1 ? ";" : ","}`)
				.join("\n"),
		].join("\n");
	}

	function strongestValue(definitions, values) {
		return definitions.reduce((best, definition) => {
			const candidate = { label: definition.label, value: values[definition.key] };
			if (!best || candidate.value > best.value) {
				return candidate;
			}
			return best;
		}, null);
	}

	function strongestFlavor(entries) {
		return entries.reduce((best, entry) => {
			if (!best || entry.value > best.value) {
				return entry;
			}
			return best;
		}, null);
	}

	function rankEntries(entries) {
		return [...entries].sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
	}

	function joinPlainEnglish(values) {
		if (!values.length) {
			return "";
		}
		if (values.length === 1) {
			return values[0];
		}
		if (values.length === 2) {
			return `${values[0]} and ${values[1]}`;
		}
		return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
	}

	function buildLeaderPlaystyleSummary() {
		const personality = normalizedLeaderPersonalityValues;
		const majorApproaches = rankEntries(LEADER_MAJOR_APPROACH_FIELDS.map((field) => ({ key: field.key, label: field.label.toLowerCase(), value: normalizedLeaderMajorBiasValues[field.key] })));
		const minorApproaches = rankEntries(LEADER_MINOR_APPROACH_FIELDS.map((field) => ({ key: field.key, label: field.label.toLowerCase(), value: normalizedLeaderMinorBiasValues[field.key] })));
		const topFlavors = rankEntries(LEADER_FLAVOR_FIELDS.map((field) => ({ key: field.key, label: field.label.toLowerCase(), value: normalizedLeaderFlavorValues[field.key] })))
			.filter((entry) => entry.value >= 6)
			.slice(0, 4);
		const flavorGroups = rankEntries(
			LEADER_FLAVOR_GROUPS.map((group) => ({
				...group,
				value: group.flavors.reduce((total, key) => total + (normalizedLeaderFlavorValues[key] || 0), 0),
			})),
		);
		const topGroups = flavorGroups.slice(0, 2);

		const diplomacyScores = [
			{
				key: "aggressive",
				value:
					personality.Boldness +
					personality.DenounceWillingness +
					(normalizedLeaderMajorBiasValues.MAJOR_CIV_APPROACH_WAR || 0) +
					(normalizedLeaderMajorBiasValues.MAJOR_CIV_APPROACH_HOSTILE || 0),
			},
			{
				key: "opportunistic",
				value:
					personality.Boldness +
					personality.Neediness +
					personality.Meanness +
					(normalizedLeaderMajorBiasValues.MAJOR_CIV_APPROACH_DECEPTIVE || 0) +
					(normalizedLeaderMajorBiasValues.MAJOR_CIV_APPROACH_GUARDED || 0),
			},
			{
				key: "cooperative",
				value:
					personality.DoFWillingness +
					personality.Loyalty +
					personality.Forgiveness +
					(normalizedLeaderMajorBiasValues.MAJOR_CIV_APPROACH_FRIENDLY || 0) +
					(normalizedLeaderMajorBiasValues.MAJOR_CIV_APPROACH_NEUTRAL || 0),
			},
			{
				key: "guarded",
				value:
					personality.DenounceWillingness +
					Math.max(0, 10 - personality.DoFWillingness) +
					(normalizedLeaderMajorBiasValues.MAJOR_CIV_APPROACH_GUARDED || 0) +
					(normalizedLeaderMajorBiasValues.MAJOR_CIV_APPROACH_NEUTRAL || 0),
			},
		].sort((left, right) => right.value - left.value)[0];

		let overview = "This civilization will usually stay guarded and transactional, watching rivals closely before committing to either friendship or open conflict.";
		if (diplomacyScores.key === "aggressive") {
			overview =
				"This civilization will usually approach other majors from a position of pressure. High boldness and war or hostile bias make it more willing to convert tension into actual conflict.";
		} else if (diplomacyScores.key === "opportunistic") {
			overview = "This civilization will usually act opportunistically. A strong deceptive or guarded lean means it may posture one way diplomatically while keeping harsher options in reserve.";
		} else if (diplomacyScores.key === "cooperative") {
			overview = "This civilization will usually try to keep workable friendships alive. High friendship, loyalty, and forgiveness values make it steadier once relations are established.";
		}

		const topMajorLabels = majorApproaches.slice(0, 2).map((entry) => entry.label);
		if (topMajorLabels.length) {
			overview += ` Its clearest major-civ lean is ${joinPlainEnglish(topMajorLabels)} behavior.`;
		}
		overview +=
			" In practice, the strongest direct gameplay drivers here are boldness, the approach biases, and the flavor spread; most other personality values mostly tune diplomatic weighting rather than the core plan.";

		const rivalryParts = [];
		if (personality.WarmongerHate >= 7) {
			rivalryParts.push("It reacts sharply to warmongers and conquest-heavy neighbors");
		} else if (personality.WarmongerHate <= 3) {
			rivalryParts.push("it is comparatively tolerant of conquest and less likely to care about warmongering");
		}
		if (personality.VictoryCompetitiveness >= 7) {
			rivalryParts.push("it assigns more rivalry weight to civs it thinks are chasing the same victory route, even though that value does not strongly drive decisions by itself");
		}
		if (personality.WonderCompetitiveness >= 7) {
			rivalryParts.push("it takes losing wonders personally and will care more when another civ beats it to them");
		}

		let diplomacy = "";
		if (rivalryParts.length) {
			diplomacy = `${rivalryParts[0].charAt(0).toUpperCase()}${rivalryParts[0].slice(1)}`;
			if (rivalryParts.length > 1) {
				diplomacy += `, and ${joinPlainEnglish(rivalryParts.slice(1))}`;
			}
			diplomacy += ".";
		}

		let cityStates = "With city-states, it mostly treats them as secondary unless they become strategically useful.";
		const topMinor = minorApproaches[0];
		if (topMinor?.key === "MINOR_CIV_APPROACH_CONQUEST" || topMinor?.key === "MINOR_CIV_APPROACH_BULLY") {
			cityStates = "With city-states, it is more likely to pressure, bully, or absorb them than invest in long-term protection.";
		} else if (topMinor?.key === "MINOR_CIV_APPROACH_PROTECTIVE" || topMinor?.key === "MINOR_CIV_APPROACH_FRIENDLY") {
			cityStates = "With city-states, it prefers protection, influence, and alliance leverage over outright conquest.";
		}
		if (personality.MinorCivCompetitiveness >= 7 && topMinor?.key !== "MINOR_CIV_APPROACH_IGNORE") {
			cityStates += " It will also compete actively when another civ starts dominating that space.";
		}

		let priorities = "On the map, its decisions are fairly mixed rather than dominated by one clear theme.";
		if (topGroups.length) {
			priorities = `On the map, its strongest gameplay priorities are ${joinPlainEnglish(topGroups.map((group) => group.description))}.`;
		}
		if (topFlavors.length) {
			priorities += ` The sharpest individual pulls are ${joinPlainEnglish(topFlavors.map((entry) => entry.label))}.`;
		}

		const toneParts = [];
		if (personality.Neediness >= 7) {
			toneParts.push("it is more likely to care about denounce-request politics");
		}
		if (personality.Forgiveness >= 7) {
			toneParts.push("it is somewhat less likely to punish you for refusing those denounce requests");
		}
		if (personality.Chattiness >= 7) {
			toneParts.push("it will surface diplomatic chatter more often");
		}
		if (personality.Meanness >= 7) {
			toneParts.push("it is more likely to gloat rivals in diplomatic popups");
		}
		if (personality.DiploBalance >= 7) {
			toneParts.push("its diplo-balance entry is high, though that field has little practical impact in the base CPU settings");
		}

		let tone = "";
		if (toneParts.length) {
			tone = `Outside the main strategy, ${joinPlainEnglish(toneParts)}.`;
		}

		return [overview, diplomacy, cityStates, priorities, tone].filter(Boolean);
	}

	function buildInteractiveLeaderExample() {
		const topMajor = strongestValue(LEADER_MAJOR_APPROACH_FIELDS, normalizedLeaderMajorBiasValues);
		const topFlavor = strongestFlavor(leaderFlavorEntries);
		const activeFlavorCount = leaderFlavorEntries.filter((entry) => entry.value > 0).length;

		return {
			...example,
			title: `Interactive ${normalizedLeaderType} CPU values`,
			summary: `${normalizedLeaderType} with ${activeFlavorCount} flavor row${activeFlavorCount === 1 ? "" : "s"}${topMajor ? ` and ${topMajor.label.toLowerCase()}-leaning diplomacy` : ""}${topFlavor ? `, led by ${titleFromKey(topFlavor.type).toLowerCase()}` : ""}.`,
			files: [
				{
					label: "<Civ_Leader>_GameDefines.sql",
					path: "Core/<Civ_Leader>_GameDefines.sql",
					language: "sql",
					code: buildLeaderSqlCode(),
					note: "Append this leader-tuning block to the template generator's, or your own, GameDefines.sql file.",
				},
			],
		};
	}

	function buildStepValidationMap() {
		if (isInteractiveCivScaffold) {
			return {
				"Civilization identity": [
					...(!String(scaffoldCivilizationName || "").trim() ? ["Enter a civilization name."] : []),
					...(!String(scaffoldLeaderName || "").trim() ? ["Enter a leader name."] : []),
				],
				"Unique loadout": [
					...(!String(scaffoldPrimaryUniqueUnitName || "").trim() ? ["Enter a primary unique unit name."] : []),
					...(!String(scaffoldSecondUniqueName || "").trim() ? ["Enter a name for the selected second unique."] : []),
				],
				"Output bundle": ["ZIP includes the skeleton files only."],
			};
		}

		if (isInteractiveArtBundle) {
			return {
				"Identity assets": [
					...(!String(artCivilizationName || "").trim() ? ["Enter a civilization name."] : []),
					...(!String(artLeaderName || "").trim() ? ["Enter a leader name."] : []),
					...(parseIntegerList(artIconAtlasSizes, []).length ? [] : ["Add at least one icon atlas size."]),
					...(parseIntegerList(artAlphaAtlasSizes, []).length ? [] : ["Add at least one alpha atlas size."]),
					...(parseIntegerList(artUnitFlagAtlasSizes, []).length ? [] : ["Add at least one unit flag atlas size."]),
					...(artIncludeUiAtlas && !parseIntegerList(artUiAtlasSizes, []).length ? ["Add at least one UI atlas size or disable the UI atlas rows."] : []),
				],
				"Leader audio": [
					...(!String(artPeaceTrackFile || "").trim() ? ["Enter a peace track filename."] : []),
					...(!String(artWarTrackFile || "").trim() ? ["Enter a war track filename."] : []),
				],
				"Unit art": artIncludeUnitArt
					? [
							...(!String(artUnitName || "").trim() ? ["Enter a unit display name."] : []),
							...(!String(artUnitBaseArtType || "").trim() ? ["Enter a base unit art define to clone from."] : []),
							...(!String(artUnitBaseMemberType || "").trim() ? ["Enter a base unit member art define to clone from."] : []),
							...(!String(artUnitModelFile || "").trim() ? ["Enter the unit model filename."] : []),
							...(!String(artUnitStrategicAsset || "").trim() ? ["Enter the unit strategic-view asset filename."] : []),
						]
					: ["Unit art clone disabled; only identity, atlas, and audio rows will be generated."],
				"Landmark / feature art": artIncludeLandmarkArt
					? [
							...(!String(artLandmarkName || "").trim() ? ["Enter a landmark or feature display name."] : []),
							...(!String(artLandmarkModelFile || "").trim() ? ["Enter the landmark or feature model filename."] : []),
							...(!String(artLandmarkStrategicAsset || "").trim() ? ["Enter the landmark or feature strategic-view asset filename."] : []),
						]
					: ["Landmark or feature rows disabled; unit and identity rows only."],
			};
		}

		if (!isInteractiveNamingPack) {
			if (!isInteractiveLeaderBuilder) {
				return {};
			}

			return {
				"Leader Name": [...(!String(leaderType || "").trim() ? ["Enter a Leader Name."] : [])],
				"Leader Personality": [],
				"Approach Biases": [],
				"Flavor Priorities": [],
			};
		}

		return {
			"Civilization identity": [...(!String(namingCivilizationType || "").trim() ? ["Enter a civilization type."] : [])],
			"City list": [
				...(!cityEntries.length ? ["Add at least one city name."] : []),
				...(cityEntries.length > 0 && cityEntries.length < 30 ? ["Aim for at least 30 city names so the civ has enough coverage across longer games."] : []),
				...(duplicateCityTags.length ? [`Duplicate city tags: ${duplicateCityTags.join(", ")}.`] : []),
			],
			"Spy list": [
				...(!spyEntries.length ? ["Add at least one spy name."] : []),
				...(spyEntries.length > 0 && spyEntries.length < 10 ? ["Add at least 10 spy names. Civ V can break if the civ runs out of spy names."] : []),
				...(duplicateSpyTags.length ? [`Duplicate spy tags: ${duplicateSpyTags.join(", ")}.`] : []),
			],
		};
	}
</script>

<div class="wizard-example-preview">
	{#if preview?.steps?.length}
		<section class="wizard-intake-preview" aria-label="Sample wizard inputs">
			<div class="wizard-preview-steps" class:wizard-preview-steps--leader-builder={isInteractiveLeaderBuilder} class:wizard-preview-steps--art-bundle={isInteractiveArtBundle}>
				{#each preview.steps as step, index (`${example.title}-${step.title}-${index}`)}
					<article
						class={`wizard-preview-step ${isInteractiveLeaderBuilder && step.title === "Leader Name" ? "wizard-preview-step--leader-key" : ""} ${isInteractiveLeaderBuilder && step.title === "Leader Personality" ? "wizard-preview-step--leader-personality" : ""} ${isInteractiveLeaderBuilder && step.title === "Approach Biases" ? "wizard-preview-step--leader-approach" : ""} ${isInteractiveLeaderBuilder && step.title === "Flavor Priorities" ? "wizard-preview-step--leader-flavors" : ""} ${isInteractiveArtBundle && step.title === "Identity assets" ? "wizard-preview-step--art-identity" : ""} ${isInteractiveArtBundle && step.title === "Leader audio" ? "wizard-preview-step--art-audio" : ""} ${isInteractiveArtBundle && step.title === "Unit art" ? "wizard-preview-step--art-unit" : ""} ${isInteractiveArtBundle && step.title === "Landmark / feature art" ? "wizard-preview-step--art-landmark" : ""}`}
					>
						<div class="wizard-preview-step-head inline half flex-wrap">
							<span class="wizard-preview-step-index">Step {index + 1}</span>
							<strong>{step.title}</strong>
						</div>

						<!-- {#if step.copy}
							<p>{step.copy}</p>
						{/if} -->

						{#if isInteractiveCivScaffold && step.title === "Civilization identity"}
							<div class="wizard-form-grid wizard-form-grid--scaffold-identity">
								<label class="wizard-form-field">
									<span>Civilization name</span>
									<input type="text" bind:value={scaffoldCivilizationName} placeholder="Shambhala" />
								</label>
								<label class="wizard-form-field">
									<span>Leader name</span>
									<input type="text" bind:value={scaffoldLeaderName} placeholder="Maitreya" />
								</label>
							</div>
						{:else if isInteractiveCivScaffold && step.title === "Unique loadout"}
							<div class="wizard-form-grid wizard-form-grid--scaffold-uniques">
								<label class="wizard-form-field">
									<span>Unique Unit</span>
									<input type="text" bind:value={scaffoldPrimaryUniqueUnitName} placeholder="" />
								</label>
								<label class="wizard-form-field">
									<span>Second Unique</span>
									<select bind:value={scaffoldSecondUniqueType}>
										{#each SCAFFOLD_SECOND_UNIQUE_OPTIONS as option (option.value)}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
								</label>
								<label class="wizard-form-field">
									<span>Second Unique Name</span>
									<input type="text" bind:value={scaffoldSecondUniqueName} placeholder="" />
								</label>
							</div>
						{:else if isInteractiveCivScaffold && step.title === "Output bundle"}
							<div class="wizard-form-grid wizard-form-grid--scaffold-output">
								<label class="wizard-form-field">
									<span>Root folder</span>
									<input type="text" value={buildScaffoldIdentity().folderName} readonly />
								</label>
								<label class="wizard-form-field">
									<span>Archive name</span>
									<input type="text" value={`${buildCivilizationScaffoldArchiveBaseName()}.zip`} readonly />
								</label>
							</div>
						{:else if isInteractiveNamingPack && step.title === "Civilization identity"}
							<div class="wizard-form-grid">
								<label class="wizard-form-field">
									<span>Civilization type</span>
									<input type="text" bind:value={namingCivilizationType} placeholder="CIVILIZATION_SHAMBHALA" />
								</label>
							</div>
						{:else if isInteractiveNamingPack && step.title === "City list"}
							<div class="wizard-form-grid">
								<label class="wizard-form-field wizard-form-field--full">
									<span>One city per line</span>
									<textarea bind:value={namingCityList} rows="6" placeholder="Kalapa&#10;Meru Gate&#10;Lotus Terrace"></textarea>
								</label>
							</div>
						{:else if isInteractiveNamingPack && step.title === "Spy list"}
							<div class="wizard-form-grid">
								<label class="wizard-form-field wizard-form-field--full">
									<span>One spy per line</span>
									<textarea bind:value={namingSpyList} rows="5" placeholder="Tenzin&#10;Pema&#10;Dorje"></textarea>
								</label>
							</div>
						{:else if isInteractiveArtBundle && step.title === "Identity assets"}
							<div class="wizard-form-stack wizard-form-stack--art">
								<div class="wizard-form-section wizard-form-section-inner-panel">
									<strong>Identity</strong>
									<div class="wizard-form-grid wizard-form-grid--art-identity-core">
										<label class="wizard-form-field">
											<span>Civilization name</span>
											<input type="text" bind:value={artCivilizationName} placeholder="Shambhala" />
										</label>
										<label class="wizard-form-field">
											<span>Leader name</span>
											<input type="text" bind:value={artLeaderName} placeholder="Maitreya" />
										</label>
									</div>
									<div class="wizard-color-row" style="margin-block-start: 0.5rem">
										<div class="wizard-color-field">
											<label class="wizard-form-field">
												<span>Primary color</span>
												<div class="wizard-color-picker-row">
													<div class="wizard-color-swatch-control relative overflow-hidden">
														<input type="color" value={artPrimaryColorDisplay.hex} oninput={(event) => updateArtColorFromPicker("primary", event.currentTarget.value)} />
														<span class="wizard-color-preview" style={`--preview:${artPrimaryColorDisplay.hex}`} aria-hidden="true"></span>
													</div>
													<input
														class="wizard-color-hex-input uppercase"
														type="text"
														value={artPrimaryColorHexInput}
														placeholder="#1f4f99"
														oninput={(event) => updateArtColorFromHex("primary", event.currentTarget.value)}
														onblur={() => resetArtColorDraft("primary")}
													/>
												</div>
											</label>
											<div class="wizard-color-values">
												<span class="wizard-color-value">{artPrimaryColorDisplay.hex.toUpperCase()}</span>
												<span class="wizard-color-value">{artPrimaryColorDisplay.rgb}</span>
												<span class="wizard-color-value">{artPrimaryColorDisplay.hsl}</span>
											</div>
										</div>
										<div class="wizard-color-field">
											<label class="wizard-form-field">
												<span>Secondary color</span>
												<div class="wizard-color-picker-row">
													<div class="wizard-color-swatch-control relative overflow-hidden">
														<input
															type="color"
															value={artSecondaryColorDisplay.hex}
															oninput={(event) => updateArtColorFromPicker("secondary", event.currentTarget.value)}
														/>
														<span class="wizard-color-preview" style={`--preview:${artSecondaryColorDisplay.hex}`} aria-hidden="true"></span>
													</div>
													<input
														class="wizard-color-hex-input uppercase"
														type="text"
														value={artSecondaryColorHexInput}
														placeholder="#f4de9a"
														oninput={(event) => updateArtColorFromHex("secondary", event.currentTarget.value)}
														onblur={() => resetArtColorDraft("secondary")}
													/>
												</div>
											</label>
											<div class="wizard-color-values">
												<span class="wizard-color-value">{artSecondaryColorDisplay.hex.toUpperCase()}</span>
												<span class="wizard-color-value">{artSecondaryColorDisplay.rgb}</span>
												<span class="wizard-color-value">{artSecondaryColorDisplay.hsl}</span>
											</div>
										</div>
									</div>
								</div>

								<div class="wizard-form-section wizard-form-section-inner-panel">
									<strong>Atlas setup</strong>
									<div class="wizard-form-grid wizard-form-grid--art-atlases">
										<label class="wizard-form-field">
											<span>Icon atlas rows</span>
											<input type="number" min="1" bind:value={artIconAtlasRows} />
										</label>
										<label class="wizard-form-field">
											<span>Icon atlas columns</span>
											<input type="number" min="1" bind:value={artIconAtlasCols} />
										</label>
										<label class="wizard-form-field">
											<span>Icon atlas sizes</span>
											<input type="text" bind:value={artIconAtlasSizes} placeholder="256, 128, 80, 64, 45, 32" />
										</label>
										<label class="wizard-form-field">
											<span>Alpha atlas sizes</span>
											<input type="text" bind:value={artAlphaAtlasSizes} placeholder="128, 64, 48, 45, 32, 24" />
										</label>
										<label class="wizard-form-field">
											<span>Unit flag sizes</span>
											<input type="text" bind:value={artUnitFlagAtlasSizes} placeholder="32" />
										</label>
									</div>
									<div class="wizard-toggle-card">
										<label class="wizard-toggle-option">
											<input type="checkbox" bind:checked={artIncludeUiAtlas} />
											<span class="wizard-toggle-copy">
												<span class="wizard-toggle-label">Include UI atlas</span>
												<span class="wizard-toggle-help">Add optional UI atlas rows when this civ also needs custom UI button assets.</span>
											</span>
										</label>
									</div>
									{#if artIncludeUiAtlas}
										<div class="wizard-form-grid wizard-form-grid--art-toggle-details">
											<label class="wizard-form-field">
												<span>UI atlas sizes</span>
												<input type="text" bind:value={artUiAtlasSizes} placeholder="45, 64" />
											</label>
										</div>
									{/if}
								</div>
							</div>
						{:else if isInteractiveArtBundle && step.title === "Leader audio"}
							<div class="wizard-form-section wizard-form-section-inner-panel">
								<div class="wizard-form-grid wizard-form-grid--art-audio">
									<label class="wizard-form-field">
										<span>Peace track filename</span>
										<input type="text" bind:value={artPeaceTrackFile} placeholder="Shambhala_Maitreya_Peace" />
									</label>
									<label class="wizard-form-field">
										<span>War track filename</span>
										<input type="text" bind:value={artWarTrackFile} placeholder="Shambhala_Maitreya_War" />
									</label>
								</div>
							</div>
						{:else if isInteractiveArtBundle && step.title === "Unit art"}
							<div class="wizard-form-stack">
								<div class="wizard-toggle-card">
									<label class="wizard-toggle-option">
										<input type="checkbox" bind:checked={artIncludeUnitArt} />
										<span class="wizard-toggle-copy">
											<span class="wizard-toggle-label">Include unit art clone</span>
											<span class="wizard-toggle-help">Turn on the full ArtDefine unit clone chain for one unique unit.</span>
										</span>
									</label>
								</div>
								{#if artIncludeUnitArt}
									<div class="wizard-form-section wizard-form-section-inner-panel">
										<div class="wizard-form-grid wizard-form-grid--art-unit">
											<label class="wizard-form-field">
												<span>Unit display name</span>
												<input type="text" bind:value={artUnitName} placeholder="Lotus Guard" />
											</label>
											<label class="wizard-form-field">
												<span>Base art define</span>
												<select bind:value={artUnitBaseArtType}>
													{#each artUnitInfoOptions as option (option)}
														<option value={option}>{option}</option>
													{/each}
												</select>
											</label>
											<label class="wizard-form-field">
												<span>Base member art define</span>
												<select bind:value={artUnitBaseMemberType}>
													{#each artUnitMemberInfoOptions as option (option)}
														<option value={option}>{option}</option>
													{/each}
												</select>
											</label>
											<label class="wizard-form-field">
												<span>Model filename</span>
												<input type="text" bind:value={artUnitModelFile} placeholder="shambhala_lotus_guard.fxsxml" />
											</label>
											<label class="wizard-form-field">
												<span>Strategic view asset</span>
												<input type="text" bind:value={artUnitStrategicAsset} placeholder="Shambhala_UnitFlagAtlas_128.dds" />
											</label>
										</div>
									</div>
								{/if}
							</div>
						{:else if isInteractiveArtBundle && step.title === "Landmark / feature art"}
							<div class="wizard-form-stack">
								<div class="wizard-toggle-card">
									<label class="wizard-toggle-option">
										<input type="checkbox" bind:checked={artIncludeLandmarkArt} />
										<span class="wizard-toggle-copy">
											<span class="wizard-toggle-label">Include landmark or feature art</span>
											<span class="wizard-toggle-help">Turn this on only if the civ needs improvement or feature-side art rows beyond the typical bundle.</span>
										</span>
									</label>
								</div>
								{#if artIncludeLandmarkArt}
									<div class="wizard-form-section wizard-form-section-inner-panel">
										<div class="wizard-form-grid wizard-form-grid--art-landmark">
											<label class="wizard-form-field">
												<span>Landmark kind</span>
												<select bind:value={artLandmarkKind}>
													<option value="improvement">Improvement</option>
													<option value="feature">Feature</option>
												</select>
											</label>
											<label class="wizard-form-field">
												<span>Display name</span>
												<input type="text" bind:value={artLandmarkName} placeholder="Lotus Sanctuary" />
											</label>
											<label class="wizard-form-field">
												<span>Model filename</span>
												<input type="text" bind:value={artLandmarkModelFile} placeholder="shambhala_lotus_sanctuary.fxsxml" />
											</label>
											<label class="wizard-form-field">
												<span>Strategic view asset</span>
												<input type="text" bind:value={artLandmarkStrategicAsset} placeholder="shambhala_lotus_sanctuary_sref.dds" />
											</label>
											<label class="wizard-form-field">
												<span>Scale</span>
												<input type="number" min="0.01" max="5" step="0.01" bind:value={artLandmarkScale} />
											</label>
										</div>
									</div>
								{/if}
							</div>
						{:else if isInteractiveLeaderBuilder && step.title === "Leader Name"}
							<div class="wizard-form-grid wizard-form-grid--leader-key">
								<label class="wizard-form-field wizard-form-field--inline wizard-form-field--leader-key">
									<span>Leader Name</span>
									<input type="text" bind:value={leaderType} placeholder="LEADER_CUSTOM_NAVARCH" />
								</label>
							</div>
						{:else if isInteractiveLeaderBuilder && step.title === "Leader Personality"}
							<div class="wizard-form-grid wizard-form-grid--leader-compact">
								{#each LEADER_PERSONALITY_FIELDS as field (field.key)}
									<label class="wizard-form-field wizard-form-field--inline">
										<span>{field.label}</span>
										<input type="number" min="0" max="10" bind:value={leaderPersonalityValues[field.key]} />
									</label>
								{/each}
							</div>
						{:else if isInteractiveLeaderBuilder && step.title === "Approach Biases"}
							<div class="wizard-form-stack">
								<div class="wizard-form-section">
									<strong>Major civ approaches</strong>
									<div class="wizard-form-grid wizard-form-grid--leader-compact">
										{#each LEADER_MAJOR_APPROACH_FIELDS as field (field.key)}
											<label class="wizard-form-field wizard-form-field--inline">
												<span>{field.label}</span>
												<input type="number" min="0" max="10" bind:value={leaderMajorBiasValues[field.key]} />
											</label>
										{/each}
									</div>
								</div>
								<div class="wizard-form-section">
									<strong>City-state approaches</strong>
									<div class="wizard-form-grid wizard-form-grid--leader-compact">
										{#each LEADER_MINOR_APPROACH_FIELDS as field (field.key)}
											<label class="wizard-form-field wizard-form-field--inline">
												<span>{field.label}</span>
												<input type="number" min="0" max="10" bind:value={leaderMinorBiasValues[field.key]} />
											</label>
										{/each}
									</div>
								</div>
							</div>
						{:else if isInteractiveLeaderBuilder && step.title === "Flavor Priorities"}
							<div class="wizard-form-grid wizard-form-grid--leader-compact wizard-form-grid--leader-flavors">
								{#each LEADER_FLAVOR_FIELDS as field (field.key)}
									<label class="wizard-form-field wizard-form-field--inline">
										<span>{field.label}</span>
										<input type="number" min="0" max="10" bind:value={leaderFlavorValues[field.key]} />
									</label>
								{/each}
							</div>
						{:else}
							<div class="wizard-preview-fields">
								{#each step.fields as field (`${step.title}-${field.label}`)}
									<div class="wizard-preview-field">
										<span class="wizard-preview-field-label">{field.label}</span>
										{#if field.values?.length}
											<div class="wizard-preview-value-list inline half flex-wrap">
												{#each field.values as value (`${field.label}-${value}`)}
													<span class="wizard-preview-value-chip">{value}</span>
												{/each}
											</div>
										{:else}
											<span class="wizard-preview-field-value">{field.value}</span>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						{#if stepValidationMap[step.title]?.length}
							<ul class="wizard-validation-list">
								{#each stepValidationMap[step.title] as item (`${step.title}-${item}`)}
									<li>{item}</li>
								{/each}
							</ul>
						{/if}
					</article>
				{/each}
			</div>
		</section>
	{/if}

	{#if isInteractiveLeaderBuilder && leaderPlaystyleSummary?.length}
		<section class="wizard-analysis-preview" aria-label="Leader behavior summary">
			<div class="wizard-analysis-card">
				<span class="wizard-analysis-eyebrow uppercase">How This CPU May Play Like</span>
				<span class="wizard-analysis-note">Note: This is a simplified plain output based on the numbers, not a full simulation of the game’s behavior code.</span>
				{#each leaderPlaystyleSummary as paragraph (`leader-playstyle-${paragraph}`)}
					<p>{paragraph}</p>
				{/each}
			</div>
		</section>
	{/if}

	{#if isInteractiveCivScaffold && scaffoldDownloadUrl}
		<section class="wizard-download-preview" aria-label="Starter download">
			<div class="wizard-download-card">
				<div class="wizard-download-copy">
					<span class="wizard-analysis-eyebrow uppercase">Your First Step</span>
					<h3>Get started with your new Civilization</h3>
					<p>ZIP export the current civilization bundled with folders and generated core files.</p>
				</div>

				<a class="wizard-scaffold-download-link relative" href={scaffoldDownloadUrl} download={scaffoldDownloadName}>
					<div class="wizard-scaffold-download-link-copy">
						<span class="wizard-scaffold-download-link-kicker uppercase">Civilization Starter Export</span>
						<strong>Download Starter ZIP</strong>
						<span class="wizard-scaffold-download-link-meta">{scaffoldDownloadName}</span>
					</div>
				</a>
			</div>
		</section>
	{/if}

	<section class="wizard-generated-preview" aria-label="Generated files">
		<SnippetExample example={displayExample} {activeLanguage} showSummary={false} variant="wizard" />
	</section>
</div>

<style>
	.wizard-example-preview {
		display: grid;
		gap: 0.75rem;
		--wizard-highlight: color-mix(in oklch, var(--surface-generator-highlight, #d4b2ff) 76%, var(--accent) 24%);
		--wizard-strong-highlight: color-mix(in oklch, var(--surface-generator-highlight-strong, #f4e8ff) 82%, white 18%);
		--wizard-touchpoint-border: color-mix(in oklch, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, oklch(0.56 0.14 301) 28%);
		--wizard-touchpoint-panel: color-mix(in oklch, var(--surface-color, rgba(14, 18, 24, 0.94)) 60%, oklch(0.31 0.06 302) 20%);
	}

	.wizard-intake-preview,
	.wizard-generated-preview {
		display: grid;
		gap: 0.75rem;
		padding-block-start: 1rem;
	}

	.wizard-preview-steps {
		inline-size: 100%;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
		align-items: start;
		gap: 1rem;
	}

	.wizard-preview-step-head {
		align-items: baseline;
		gap: 0.45rem;

		& strong {
			color: color-mix(in oklch, white 88%, var(--ink));
			font-size: 0.92rem;
		}
	}

	.wizard-preview-step-index {
		inline-size: fit-content;
		color: var(--muted-ink);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.wizard-form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.75rem;
	}

	.wizard-form-grid--scaffold-identity,
	.wizard-form-grid--scaffold-output {
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.wizard-form-field {
		display: grid;
		gap: 0.35rem;

		& > span {
			color: var(--muted-ink);
			text-transform: uppercase;
			font-size: 0.8rem;
			font-weight: 700;
			letter-spacing: 0.02em;
		}

		& input,
		& select,
		& textarea {
			min-inline-size: 0;
			min-block-size: 3.25rem;
			color: color-mix(in oklch, white 86%, var(--ink));
			font: inherit;
			background: color-mix(in oklch, var(--wizard-touchpoint-panel) 40%, var(--control-bg)) !important;
			border: 1px solid color-mix(in oklch, var(--wizard-touchpoint-border) 40%, transparent) !important;
			border-radius: 0.7rem;
			padding-block: 0.7rem;
			padding-inline: 0.8rem;
		}

		& select {
			block-size: 3.25rem;
			font-size: inherit;
			line-height: 1.2;
			background-image:
				linear-gradient(45deg, transparent 50%, color-mix(in oklch, white 82%, var(--ink)) 50%), linear-gradient(135deg, color-mix(in oklch, white 82%, var(--ink)) 50%, transparent 50%);
			background-size:
				0.4rem 0.4rem,
				0.4rem 0.4rem;
			background-position:
				calc(100% - 1.1rem) calc(50% - 0.18rem),
				calc(100% - 0.75rem) calc(50% - 0.18rem);
			background-repeat: no-repeat;
			padding-inline-end: 2.6rem;
			-moz-appearance: none;
			-webkit-appearance: none;
			appearance: none;
		}

		& textarea {
			min-block-size: 10rem;
			resize: vertical;
		}
	}

	.wizard-form-grid--scaffold-uniques,
	.wizard-form-grid--art-identity,
	.wizard-form-grid--art-toggle-details,
	.wizard-form-grid--art-unit,
	.wizard-form-grid--art-landmark {
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
	}

	.wizard-form-field--full {
		grid-column: 1 / -1;
	}

	.wizard-form-stack {
		display: grid;
		gap: 0.85rem;
	}

	.wizard-form-stack--art {
		gap: 1rem;
	}

	.wizard-form-section {
		display: grid;
		gap: 0.55rem;

		& strong {
			color: color-mix(in oklch, white 84%, var(--ink));
			text-transform: uppercase;
			font-size: 0.8rem;
			font-weight: 700;
			letter-spacing: 0.06em;
		}
	}

	.wizard-form-section-inner-panel {
		background: color-mix(in oklch, var(--wizard-touchpoint-panel) 5%, transparent);
		border: 1px solid color-mix(in oklch, var(--wizard-touchpoint-border) 20%, transparent);
		border-radius: 0.9rem;

		padding-block: 1.25rem;
		padding-inline: 1.25rem;
	}

	.wizard-form-grid--art-identity-core {
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
	}

	.wizard-color-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem;
	}

	.wizard-color-field {
		display: grid;
		align-content: start;
		gap: 0.45rem;
	}

	.wizard-color-picker-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.7rem;
	}

	.wizard-color-swatch-control {
		inline-size: 3rem;
		block-size: 3rem;

		background: color-mix(in oklch, var(--panel-bg) 86%, var(--control-bg));
		box-shadow: inset 0 1px 0 color-mix(in oklch, white 6%, transparent);
		border: 1px solid color-mix(in oklch, var(--panel-border) 44%, transparent);
		border-radius: 0.9rem;

		& input[type="color"] {
			position: absolute;
			inset: 0;

			inline-size: 100%;
			block-size: 100%;

			opacity: 0;

			padding: 0;

			cursor: pointer;
		}
	}

	.wizard-color-preview {
		inline-size: 100%;
		block-size: 100%;

		display: block;

		background: var(--preview, #000000);
	}

	.wizard-color-hex-input {
		font-family: inherit;
	}

	.wizard-color-values {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, max-content));
		align-items: start;
		gap: 0.5rem;

		margin-block-start: 0.25rem;
	}

	.wizard-color-value {
		color: color-mix(in oklch, white 80%, var(--ink));
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.02em;

		background: color-mix(in oklch, var(--panel-bg) 80%, var(--wizard-touchpoint-panel));
		border: 1px solid color-mix(in oklch, var(--wizard-touchpoint-border) 80%, transparent);
		border-radius: 0.5rem;

		padding-block: 0.4rem;
		padding-inline: 0.65rem;
	}

	.wizard-form-grid--art-atlases {
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
	}

	.wizard-toggle-card {
		display: grid;
		gap: 0.6rem;

		background: color-mix(in oklch, var(--panel-bg) 80%, var(--accent-panel));
		border: 1px solid color-mix(in oklch, var(--panel-border) 34%, transparent);
		border-radius: 0.85rem;

		padding-block: 0.8rem;
		padding-inline: 0.9rem;
	}

	.wizard-toggle-option {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		gap: 0.75rem;

		cursor: pointer;

		& input {
			inline-size: 1rem;
			block-size: 1rem;

			accent-color: var(--wizard-strong-highlight);

			padding: 0;
			margin-block-start: 0.1rem;
		}
	}

	.wizard-toggle-copy {
		display: grid;
		gap: 0.28rem;
	}

	.wizard-toggle-label {
		color: color-mix(in oklch, white 88%, var(--ink));
		text-transform: none;
		font-size: 0.86rem;
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.wizard-toggle-help {
		color: var(--muted-ink);
		text-transform: none;
		font-size: 0.88rem;
		font-weight: 500;
		line-height: 1.5;
		letter-spacing: normal;
	}

	.wizard-form-grid--art-audio {
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.wizard-form-grid--leader-key {
		grid-template-columns: minmax(0, 1fr);
	}

	.wizard-form-field--inline {
		display: grid;
		grid-template-columns: minmax(8rem, 1fr) 3.5rem;
		align-items: center;
		gap: 0.7rem;

		& input {
			inline-size: 100%;

			padding-block: 0.45rem;
			padding-inline: 0.65rem;
		}
	}

	.wizard-form-field--leader-key {
		grid-template-columns: max-content minmax(0, 1fr);
	}

	.wizard-form-grid--leader-compact {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.5rem 0.9rem;
	}

	.wizard-form-grid--leader-flavors {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem 1.5rem;
	}

	.wizard-preview-fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.75rem;
	}

	.wizard-preview-field {
		display: grid;
		gap: 0.35rem;
	}

	.wizard-preview-field-label {
		color: var(--muted-ink);
		text-transform: uppercase;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.wizard-preview-value-list {
		gap: 0.25rem 0.65rem;
	}

	.wizard-preview-value-chip {
		color: color-mix(in oklch, white 80%, var(--ink));
		font-size: 0.78rem;
		font-weight: 600;
	}

	.wizard-preview-field-value {
		color: color-mix(in oklch, white 82%, var(--ink));
		font-size: 0.9rem;
		font-weight: 600;
	}

	.wizard-validation-list {
		display: grid;
		gap: 0.45rem;
		color: var(--muted-ink);
		line-height: 1.55;
		padding-inline-start: 1.1rem;
		margin: 0;
	}

	.wizard-analysis-preview {
		display: grid;
		gap: 0.75rem;
		padding-block-start: 1rem;
	}

	.wizard-analysis-card {
		display: grid;
		gap: 0.75rem;
		background: linear-gradient(140deg, color-mix(in oklch, var(--wizard-highlight) 30%, transparent), transparent 65%), color-mix(in oklch, var(--accent-panel) 80%, var(--panel-bg));
		border: 1px solid color-mix(in oklch, var(--panel-border) 44%, transparent);
		border-radius: 1rem;
		padding-block: 1.25rem;
		padding-inline: 1.25rem;

		& p {
			color: var(--muted-ink);
			font-size: 1.125rem;
			line-height: 1.55;
			margin: 0;
		}
	}

	.wizard-analysis-eyebrow {
		color: var(--wizard-strong-highlight);
		font-size: 1.125rem;
		font-weight: 800;
		letter-spacing: 0.12em;
	}

	.wizard-analysis-note {
		color: color-mix(in oklch, white 70%, var(--muted-ink)) !important;
		font-size: 0.9rem;
		line-height: 1.5;
		background: color-mix(in oklch, var(--panel-bg) 88%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--panel-border) 40%, transparent);
		border-radius: 0.75rem;
		padding-block: 0.65rem;
		padding-inline: 0.75rem;
		margin-block: 0.5rem;
	}

	.wizard-download-preview {
		display: grid;
		gap: 0.75rem;
		padding-block-start: 1rem;
	}

	.wizard-download-card {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
		align-items: center;
		gap: 1rem;
		background: linear-gradient(140deg, color-mix(in oklch, var(--wizard-highlight) 24%, transparent), transparent 68%), color-mix(in oklch, var(--accent-panel) 74%, var(--panel-bg));
		border: 1px solid color-mix(in oklch, var(--panel-border) 44%, transparent);
		border-radius: 1rem;
		padding-block: 1.1rem;
		padding-inline: 1.25rem;
		overflow: clip;
	}

	.wizard-download-copy {
		display: grid;
		gap: 0.5rem;

		& p {
			color: var(--muted-ink);
			line-height: 1.55;
			margin: 0;
		}
	}

	.wizard-scaffold-download-link {
		inline-size: 100%;
		max-inline-size: 100%;
		display: grid;
		justify-items: start;
		justify-self: end;
		gap: 0.18rem;
		color: color-mix(in oklch, white 96%, var(--wizard-strong-highlight));
		text-decoration: none;
		font-weight: 700;
		background: linear-gradient(135deg, #1f0f22 0%, #2c1330 24%, #381943 50%, #34205b 76%, #23153e 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 40%, transparent),
			inset 0 -1px 0 color-mix(in oklch, #2a0f4d 42%, transparent),
			0 10px 18px color-mix(in oklch, black 44%, transparent),
			0 0 0 1px color-mix(in oklch, white 12%, #ff9de4),
			0 0 26px color-mix(in oklch, #cf84ff 24%, transparent);
		border: 1px solid color-mix(in oklch, white 18%, #ffaceb);
		border-radius: 1rem;
		padding-block: 1rem;
		padding-inline: 1.15rem;
		overflow: clip;
		transition:
			border-color 140ms ease,
			background 140ms ease,
			box-shadow 140ms ease,
			transform 140ms ease,
			filter 140ms ease;
		cursor: pointer;
		isolation: isolate;

		&:focus-visible {
			outline: 2px solid color-mix(in oklch, white 26%, var(--wizard-strong-highlight));
			outline-offset: 3px;
		}

		&:hover {
			background: linear-gradient(180deg, color-mix(in oklch, white 8%, transparent), transparent 26%), linear-gradient(135deg, #261229 0%, #35163a 24%, #462051 50%, #432772 76%, #2c1a4a 100%);
			filter: saturate(1.08) brightness(1.03);
			box-shadow:
				inset 0 1px 0 color-mix(in oklch, white 48%, transparent),
				inset 0 -1px 0 color-mix(in oklch, #2a0f4d 48%, transparent),
				0 14px 24px color-mix(in oklch, black 44%, transparent),
				0 0 0 1px color-mix(in oklch, white 16%, #ffb2ec),
				0 0 16px color-mix(in oklch, #d58fff 34%, transparent);
			border-color: color-mix(in oklch, white 12%, #ffb6ed);

			transform: translateY(-2px);

			&::before {
				opacity: 1;
				transform: translateX(10%);
			}
		}

		& strong {
			font-size: 1.75rem;
			line-height: 1.2;
			filter: drop-shadow(0 1px 0 color-mix(in oklch, black 24%, transparent)) drop-shadow(0 2px 8px color-mix(in oklch, black 16%, transparent));
			background-clip: text;
			-webkit-background-clip: text;
		}
	}

	.wizard-scaffold-download-link-copy {
		min-inline-size: 0;
		display: grid;
		gap: 0.18rem;
	}

	.wizard-scaffold-download-link-kicker {
		color: color-mix(in oklch, white 74%, #ffdff7);
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-shadow: 0 1px 1px color-mix(in oklch, black 24%, transparent);
	}

	.wizard-scaffold-download-link-meta {
		color: color-mix(in oklch, white 82%, #ffebfc);
		font-size: 0.9rem;
		font-weight: 600;
		text-shadow: 0 1px 1px color-mix(in oklch, black 42%, transparent);
		word-break: break-word;
	}

	.wizard-form-field--checkbox {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.9rem;

		& input {
			inline-size: 1rem;
			block-size: 1rem;
			accent-color: var(--wizard-strong-highlight);
			padding: 0;
		}
	}

	.wizard-preview-step {
		display: grid;
		gap: 0.75rem;

		background: color-mix(in oklch, var(--panel-bg) 90%, var(--accent-panel));
		box-shadow: inset 0 1px 0 color-mix(in oklch, white 6%, transparent);
		border: 1px solid color-mix(in oklch, var(--panel-border) 36%, transparent);
		border-radius: 1rem;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
		padding-block: 1rem;
		padding-inline: 1.05rem;
	}

	.wizard-preview-step--art-identity,
	.wizard-preview-step--art-audio,
	.wizard-preview-step--art-unit,
	.wizard-preview-step--art-landmark {
		gap: 0.95rem;
	}

	.wizard-preview-step--art-identity,
	.wizard-preview-step--art-audio,
	.wizard-preview-step--art-unit,
	.wizard-preview-step--art-landmark,
	.wizard-preview-step--leader-flavors {
		min-inline-size: 0;
	}

	.wizard-preview-step--leader-key {
		grid-column: 1 / -1;
	}

	.wizard-preview-steps--art-bundle {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}

	@media (width <= 720px) {
		.wizard-download-card {
			grid-template-columns: 1fr;
		}

		.wizard-preview-fields,
		.wizard-form-grid,
		.wizard-color-row {
			grid-template-columns: 1fr;
		}
	}

	@media (width <= 1100px) {
		.wizard-preview-steps {
			grid-template-columns: repeat(2, minmax(16rem, 1fr));
		}

		.wizard-preview-steps--leader-builder {
			grid-template-columns: repeat(2, minmax(10rem, 1fr));
		}

		.wizard-preview-step--leader-flavors,
		.wizard-preview-step--art-identity,
		.wizard-preview-step--art-unit,
		.wizard-preview-step--art-landmark {
			grid-column: 1 / -1;
		}

		.wizard-form-grid--leader-flavors {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (width > 1100px) {
		.wizard-preview-steps {
			grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
		}

		.wizard-preview-steps--leader-builder {
			grid-template-columns: minmax(10rem, 1fr) minmax(10rem, 1fr) minmax(40rem, 1.25fr);
		}

		.wizard-preview-step--leader-personality {
			grid-column: 1;
		}

		.wizard-preview-step--leader-approach {
			grid-column: 2;
		}

		.wizard-preview-step--leader-flavors {
			grid-column: 3;
		}
	}
</style>
