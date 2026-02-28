<script>
	import { onDestroy, onMount } from "svelte";

	const CONVERTER_ENDPOINT = resolveConverterEndpoint();

	function resolveConverterEndpoint() {
		const configured = String(import.meta.env.VITE_DDS_CONVERTER_ENDPOINT || "").trim();
		if (configured) {
			return configured;
		}
		return "/.netlify/functions/convert-dds";
	}

	const WORKFLOWS = {
		unit: {
			label: "Unit Texture",
			description: "Unit textures use DXT3 (BC2 style explicit alpha).",
			backendAssetType: "unit",
			compressionOptions: ["DXT3"],
		},
		terrain: {
			label: "Terrain Texture",
			description: "Terrain textures can use DXT1 (opaque/simple alpha) or DXT5 (smoother alpha).",
			backendAssetType: "terrain",
			compressionOptions: ["DXT1", "DXT5"],
		},
		ui: {
			label: "UI / Icon Texture",
			description: "UI and icon textures use DXT3 by default in this converter.",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		portraits: {
			label: "Portrait / Icon Texture",
			description: "Portraits and icon atlases commonly use DXT5.",
			backendAssetType: "portraits",
			compressionOptions: ["DXT5"],
		},
		screen: {
			label: "Civ5 Screen Type",
			description: "Uses fixed screen dimensions from your reference sheet.",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		icon_sheet: {
			label: "Single Icon Sheet",
			description: "Single icon-sheet export for one chosen icon size.",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		icon_bundle: {
			label: "Icon Atlas Bundle",
			description: "Generate one ZIP containing DDS icon sheets for multiple icon sizes.",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
	};

	const SCREEN_PRESETS = [
		{ id: "era-change", label: "Era Change", width: 924, height: 472 },
		{ id: "victory", label: "Victory", width: 956, height: 532 },
		{ id: "policy-panel", label: "Policy Panel", width: 192, height: 292 },
		{ id: "map-load", label: "Map (Load)", width: 360, height: 412 },
		{ id: "diplo-wide", label: "Diplo (Widescreen)", width: 1600, height: 900 },
		{ id: "dom-standard", label: "DOM (Standard)", width: 1024, height: 768 },
		{ id: "wonder-splash", label: "Wonder Splash", width: 972, height: 568 },
		{ id: "ideology-tab", label: "Ideology Tab", width: 964, height: 668 },
		{ id: "city-state-bg", label: "City-State Bkgd.", width: 523, height: 300 },
	];

	const ALPHA_RADIUS_BY_SIZE = {
		16: 11,
		22: 18,
		24: 17,
		32: 22,
		45: 31,
		48: 33,
		64: 43,
		80: 52,
		128: 86,
		214: 144,
		256: 172,
	};

	const ICON_PRESETS = [
		{ id: "buildings", label: "Buildings", sizes: [256, 128, 80, 64, 45] },
		{ id: "techs", label: "Techs", sizes: [256, 214, 128, 80, 64, 45] },
		{ id: "units", label: "Units", sizes: [256, 128, 80, 64, 45] },
		{ id: "civs", label: "Civs", sizes: [256, 128, 80, 64, 45, 32] },
		{ id: "leaders", label: "Leaders", sizes: [256, 128, 64] },
		{ id: "religion-alpha", label: "Religion (Alpha)", sizes: [128, 80, 64, 48, 32, 24, 16] },
		{ id: "resources", label: "Resources", sizes: [256, 80, 64, 45] },
	];

	const ICON_ATLAS_SIZE_OPTIONS = [16, 22, 24, 32, 45, 48, 64, 80, 128, 214, 256];
	const RESAMPLE_MODE_OPTIONS = [
		{ id: "nearest", label: "Nearest (sharpest, hardest edges)" },
		{ id: "bilinear", label: "Bilinear (smoother)" },
		{ id: "bicubic", label: "Bicubic (balanced default)" },
		{ id: "lanczos3", label: "Lanczos3 (smoothest for downscale)" },
	];
	const ENCODER_BACKEND_OPTIONS = [
		{ id: "dxtjs", label: "Web encoder (dxt-js)" },
		{ id: "native", label: "Native encoder (CompressonatorCLI)" },
	];
	const ENCODER_MODE_OPTIONS = [
		{ id: "rangefit", label: "RangeFit (fast, lower quality)" },
		{ id: "clusterfit", label: "ClusterFit (high quality)" },
		{ id: "iterative", label: "Iterative ClusterFit (highest quality, slower)" },
	];
	const COLOR_METRIC_OPTIONS = [
		{ id: "uniform", label: "Uniform (GIMP-like for Civ5 icons)" },
		{ id: "perceptual", label: "Perceptual" },
	];

	const ICON_ATLAS_PRESETS = [
		{
			id: "mixed-core",
			label: "Buildings + Units + Civs + Leaders",
			defaultSizes: [32, 45, 64, 80, 128, 256],
			currentSize: 256,
			rows: 2,
			cols: 2,
		},
		{
			id: "buildings",
			label: "Buildings",
			defaultSizes: [45, 64, 80, 128, 256],
			currentSize: 256,
			rows: 2,
			cols: 2,
		},
		{
			id: "units",
			label: "Units",
			defaultSizes: [45, 64, 80, 128, 256],
			currentSize: 256,
			rows: 2,
			cols: 2,
		},
		{
			id: "civs",
			label: "Civs",
			defaultSizes: [32, 45, 64, 80, 128, 256],
			currentSize: 256,
			rows: 2,
			cols: 2,
		},
		{
			id: "leaders",
			label: "Leaders",
			defaultSizes: [64, 128, 256],
			currentSize: 256,
			rows: 2,
			cols: 2,
		},
	];

	const BUNDLE_ATLAS_TYPES = {
		icon: {
			label: "Icon Atlas",
			atlasSuffix: "ICON_ATLAS",
			fileSuffix: "IconAtlas",
		},
		alpha: {
			label: "Alpha Atlas",
			atlasSuffix: "ALPHA_ATLAS",
			fileSuffix: "AlphaAtlas",
		},
		ui: {
			label: "UI Atlas",
			atlasSuffix: "UI_ATLAS",
			fileSuffix: "ButtonUI",
		},
		unit_flag: {
			label: "Unit Flag Atlas",
			atlasSuffix: "UNIT_FLAG_ATLAS",
			fileSuffix: "UnitFlagAtlas",
		},
	};

	const SQL_HISTORY_STORAGE_KEY = "cmc_dds_sql_history_v1";

	function buildSizeSelection(selectedSizes = []) {
		const selection = {};
		for (const size of ICON_ATLAS_SIZE_OPTIONS) {
			selection[size] = selectedSizes.includes(size);
		}
		return selection;
	}

	let workflow = $state("unit");
	let compressionChoice = $state("");
	let selectedScreenPresetId = $state(SCREEN_PRESETS[0].id);

	let selectedIconPresetId = $state(ICON_PRESETS[0].id);
	let selectedIconSizeChoice = $state("");
	let iconSheetRowsInput = $state("1");
	let iconSheetColsInput = $state("1");

	let selectedAtlasPresetId = $state(ICON_ATLAS_PRESETS[0].id);
	let atlasCurrentIconSizeChoice = $state(String(ICON_ATLAS_PRESETS[0].currentSize));
	let atlasRowsInput = $state(String(ICON_ATLAS_PRESETS[0].rows));
	let atlasColsInput = $state(String(ICON_ATLAS_PRESETS[0].cols));
	let atlasSelectedSizesMap = $state(buildSizeSelection(ICON_ATLAS_PRESETS[0].defaultSizes));
	let atlasType = $state("icon");
	let atlasCompressionEnabled = $state(true);
	let atlasEncoderBackend = $state("dxtjs");
	let atlasNativeQualityInput = $state("1");
	let atlasResampleMode = $state("lanczos3");
	let atlasAlphaAware = $state(false);
	let atlasSharpenAmountInput = $state("0");
	let atlasPreBlurAmountInput = $state("0");
	let atlasEncoderMode = $state("clusterfit");
	let atlasColorMetric = $state("uniform");
	let atlasWeightColorByAlpha = $state(false);
	let atlasExportName = $state("IconAtlas");
	let strategicViewTypeInput = $state("");
	let strategicTileTypeInput = $state("Unit");

	let selectedFile = $state(null);
	let selectedFileInfo = $state(null);
	let isDragOver = $state(false);
	let busy = $state(false);
	let errorMessage = $state("");
	let successMessage = $state("");
	let downloadUrl = $state("");
	let downloadName = $state("");
	let conversionMeta = $state(null);
	let sqlHistoryEntries = $state([]);

	const workflowConfig = $derived(WORKFLOWS[workflow] || WORKFLOWS.unit);
	const compressionOptions = $derived(workflowConfig.compressionOptions || ["DXT3"]);
	const activeCompression = $derived(resolveStringOption(compressionChoice, compressionOptions));

	const activeScreenPreset = $derived(resolvePresetById(SCREEN_PRESETS, selectedScreenPresetId));

	const activeIconPreset = $derived(resolvePresetById(ICON_PRESETS, selectedIconPresetId));
	const iconSizeOptions = $derived(activeIconPreset?.sizes || []);
	const activeIconSize = $derived(resolveNumericOption(selectedIconSizeChoice, iconSizeOptions));
	const iconSheetRows = $derived(parseGridCount(iconSheetRowsInput));
	const iconSheetCols = $derived(parseGridCount(iconSheetColsInput));

	const activeAtlasPreset = $derived(resolvePresetById(ICON_ATLAS_PRESETS, selectedAtlasPresetId));
	const atlasCurrentIconSize = $derived(resolveNumericOption(atlasCurrentIconSizeChoice, ICON_ATLAS_SIZE_OPTIONS));
	const atlasRows = $derived(parseGridCount(atlasRowsInput));
	const atlasCols = $derived(parseGridCount(atlasColsInput));
	const atlasSelectedSizes = $derived(ICON_ATLAS_SIZE_OPTIONS.filter((size) => Boolean(atlasSelectedSizesMap[size])).sort((a, b) => a - b));
	const atlasHasSizeSelection = $derived(atlasSelectedSizes.length > 0);
	const activeAtlasTypeConfig = $derived(BUNDLE_ATLAS_TYPES[atlasType] || BUNDLE_ATLAS_TYPES.icon);
	const activeEncoderBackend = $derived(normalizeEncoderBackend(atlasEncoderBackend));
	const activeNativeQuality = $derived(parseBoundedFloat(atlasNativeQualityInput, 0, 1, 1));
	const activeAtlasResampleMode = $derived(normalizeResampleMode(atlasResampleMode));
	const atlasSharpenAmount = $derived(parseBoundedFloat(atlasSharpenAmountInput, 0, 1, 0));
	const atlasPreBlurAmount = $derived(parseBoundedFloat(atlasPreBlurAmountInput, 0, 2, 0));
	const activeAtlasEncoderMode = $derived(normalizeEncoderMode(atlasEncoderMode));
	const activeAtlasColorMetric = $derived(normalizeColorMetric(atlasColorMetric));
	const atlasSqlToken = $derived(normalizeAtlasSqlToken(atlasExportName));
	const atlasFilePrefix = $derived(buildAtlasFilePrefix(atlasSqlToken));
	const atlasSqlName = $derived(`${atlasSqlToken}_${activeAtlasTypeConfig.atlasSuffix}`);
	const atlasPreviewFileNames = $derived(
		atlasSelectedSizes.map((size) =>
			buildAtlasDdsFilename({
				filePrefix: atlasFilePrefix,
				fileSuffix: activeAtlasTypeConfig.fileSuffix,
				size,
			}),
		),
	);
	const sqlHistorySorted = $derived(
		[...sqlHistoryEntries].sort(
			(a, b) =>
				String(a.atlas || "").localeCompare(String(b.atlas || "")) || Number(b.iconSize || 0) - Number(a.iconSize || 0) || String(a.filename || "").localeCompare(String(b.filename || "")),
		),
	);
	const sqlIconTextureAtlasesText = $derived(buildIconTextureAtlasesSql(sqlHistorySorted));
	const sqlStrategicRowsText = $derived(buildStrategicViewSql(sqlHistorySorted));

	const expectedDimensions = $derived(
		computeExpectedDimensions({
			workflow,
			screenPreset: activeScreenPreset,
			iconSize: activeIconSize,
			iconRows: iconSheetRows,
			iconCols: iconSheetCols,
			atlasCurrentSize: atlasCurrentIconSize,
			atlasRows,
			atlasCols,
		}),
	);
	const hasDimensionMismatch = $derived(
		Boolean(expectedDimensions && selectedFileInfo && (expectedDimensions.width !== selectedFileInfo.width || expectedDimensions.height !== selectedFileInfo.height)),
	);
	const canConvertWithDimensions = $derived(Boolean(!expectedDimensions || (selectedFileInfo && !hasDimensionMismatch)));
	const canSubmit = $derived(Boolean(selectedFile && canConvertWithDimensions && (workflow !== "icon_bundle" || (atlasHasSizeSelection && atlasCompressionEnabled))));

	onDestroy(() => {
		revokeDownloadUrl();
	});

	onMount(() => {
		sqlHistoryEntries = loadSqlHistory();
	});

	function normalizeAtlasType(value) {
		return BUNDLE_ATLAS_TYPES[value] ? value : "icon";
	}

	function normalizeEncoderBackend(value) {
		const backend = String(value || "")
			.trim()
			.toLowerCase();
		return ENCODER_BACKEND_OPTIONS.some((option) => option.id === backend) ? backend : "dxtjs";
	}

	function normalizeResampleMode(value) {
		const mode = String(value || "")
			.trim()
			.toLowerCase();
		return RESAMPLE_MODE_OPTIONS.some((option) => option.id === mode) ? mode : "lanczos3";
	}

	function normalizeEncoderMode(value) {
		const mode = String(value || "")
			.trim()
			.toLowerCase();
		return ENCODER_MODE_OPTIONS.some((option) => option.id === mode) ? mode : "clusterfit";
	}

	function normalizeColorMetric(value) {
		const metric = String(value || "")
			.trim()
			.toLowerCase();
		return COLOR_METRIC_OPTIONS.some((option) => option.id === metric) ? metric : "uniform";
	}

	function normalizeAtlasSqlToken(value) {
		const token = String(value || "")
			.toUpperCase()
			.replace(/[^A-Z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "");
		return token || "CIV_NAME_LEADER_NAME";
	}

	function buildAtlasFilePrefix(token) {
		return String(token || "")
			.split("_")
			.filter(Boolean)
			.map((part) => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`)
			.join("_");
	}

	function buildAtlasDdsFilename({ filePrefix, fileSuffix, size }) {
		return `${filePrefix}_${fileSuffix}_${size}.dds`;
	}

	function loadSqlHistory() {
		try {
			const raw = localStorage.getItem(SQL_HISTORY_STORAGE_KEY);
			if (!raw) {
				return [];
			}
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) {
				return [];
			}
			return parsed.filter((entry) => entry && typeof entry === "object");
		} catch {
			return [];
		}
	}

	function persistSqlHistory(nextEntries) {
		sqlHistoryEntries = nextEntries;
		try {
			localStorage.setItem(SQL_HISTORY_STORAGE_KEY, JSON.stringify(nextEntries));
		} catch {
			// No-op if storage is unavailable.
		}
	}

	function mergeSqlHistory(entriesToMerge) {
		const current = [...sqlHistoryEntries];
		for (const incoming of entriesToMerge) {
			const key = `${incoming.atlas}|${incoming.iconSize}|${incoming.filename}`;
			const existingIndex = current.findIndex((entry) => `${entry.atlas}|${entry.iconSize}|${entry.filename}` === key);
			if (existingIndex >= 0) {
				current[existingIndex] = incoming;
			} else {
				current.push(incoming);
			}
		}
		persistSqlHistory(current);
	}

	function resetSqlHistory() {
		persistSqlHistory([]);
		successMessage = "Generated SQL history cleared.";
	}

	async function copySqlToClipboard() {
		const sqlText = [sqlIconTextureAtlasesText, sqlStrategicRowsText].filter(Boolean).join("\n\n");
		if (!sqlText.trim()) {
			errorMessage = "No SQL available to copy yet.";
			return;
		}
		try {
			await navigator.clipboard.writeText(sqlText);
			successMessage = "SQL copied to clipboard.";
		} catch {
			errorMessage = "Unable to copy SQL to clipboard.";
		}
	}

	function escapeSql(value) {
		return String(value || "").replace(/'/g, "''");
	}

	function buildIconTextureAtlasesSql(entries) {
		if (!entries.length) {
			return "";
		}
		const tuples = entries
			.map((entry) => `('${escapeSql(entry.atlas)}', ${Number(entry.iconSize)}, '${escapeSql(entry.filename)}', ${Number(entry.iconsPerRow)}, ${Number(entry.iconsPerColumn)})`)
			.join(",\n\t");
		return `-- IconTextureAtlases\nINSERT INTO\n\tIconTextureAtlases (Atlas, IconSize, Filename, IconsPerRow, IconsPerColumn)\nVALUES\n\t${tuples};`;
	}

	function buildStrategicViewSql(entries) {
		const strategicRows = entries
			.filter((entry) => entry.strategicViewType && entry.strategicAsset && entry.strategicTileType)
			.map((entry) => `('${escapeSql(entry.strategicViewType)}', '${escapeSql(entry.strategicTileType)}', '${escapeSql(entry.strategicAsset)}')`);
		if (!strategicRows.length) {
			return "";
		}
		return `-- ArtDefine_StrategicView\nINSERT INTO ArtDefine_StrategicView\n\t(StrategicViewType, TileType, Asset)\nVALUES\n\t${strategicRows.join(",\n\t")};`;
	}

	function resolvePresetById(list, presetId) {
		if (!Array.isArray(list) || !list.length) {
			return null;
		}
		const match = list.find((item) => item.id === presetId);
		return match || list[0];
	}

	function resolveStringOption(choice, options) {
		const normalizedChoice = String(choice || "").trim();
		if (normalizedChoice && options.includes(normalizedChoice)) {
			return normalizedChoice;
		}
		return options[0] || "";
	}

	function resolveNumericOption(choice, options) {
		const parsed = Number(choice);
		if (Number.isFinite(parsed) && options.includes(parsed)) {
			return parsed;
		}
		return options[0] || null;
	}

	function parseGridCount(value) {
		const parsed = Number.parseInt(String(value || "").trim(), 10);
		if (!Number.isFinite(parsed) || parsed < 1) {
			return 1;
		}
		return Math.min(parsed, 64);
	}

	function parseBoundedFloat(value, min, max, fallback) {
		const parsed = Number.parseFloat(String(value || "").trim());
		if (!Number.isFinite(parsed)) {
			return fallback;
		}
		if (parsed < min) {
			return min;
		}
		if (parsed > max) {
			return max;
		}
		return parsed;
	}

	function computeExpectedDimensions({ workflow: nextWorkflow, screenPreset, iconSize, iconRows, iconCols, atlasCurrentSize, atlasRows: rows, atlasCols: cols }) {
		if (nextWorkflow === "screen" && screenPreset) {
			return {
				width: Number(screenPreset.width),
				height: Number(screenPreset.height),
			};
		}
		if (nextWorkflow === "icon_sheet" && iconSize) {
			return {
				width: Number(iconSize) * Number(iconCols || 1),
				height: Number(iconSize) * Number(iconRows || 1),
			};
		}
		if (nextWorkflow === "icon_bundle" && atlasCurrentSize) {
			return {
				width: Number(atlasCurrentSize) * Number(cols || 1),
				height: Number(atlasCurrentSize) * Number(rows || 1),
			};
		}
		return null;
	}

	function onWorkflowChange(nextWorkflow) {
		workflow = WORKFLOWS[nextWorkflow] ? nextWorkflow : "unit";
		errorMessage = "";
		successMessage = "";
		conversionMeta = null;
	}

	function onAtlasPresetChange(nextPresetId) {
		const preset = resolvePresetById(ICON_ATLAS_PRESETS, nextPresetId);
		selectedAtlasPresetId = preset.id;
		atlasCurrentIconSizeChoice = String(preset.currentSize);
		atlasRowsInput = String(preset.rows);
		atlasColsInput = String(preset.cols);
		atlasSelectedSizesMap = buildSizeSelection(preset.defaultSizes);
		errorMessage = "";
		successMessage = "";
	}

	function toggleAtlasSize(size, checked) {
		atlasSelectedSizesMap = {
			...atlasSelectedSizesMap,
			[size]: Boolean(checked),
		};
		errorMessage = "";
		successMessage = "";
	}

	function setAllAtlasSizes(enabled) {
		atlasSelectedSizesMap = buildSizeSelection(enabled ? ICON_ATLAS_SIZE_OPTIONS : []);
		errorMessage = "";
		successMessage = "";
	}

	function onFileChange(fileList) {
		selectedFile = fileList?.[0] || null;
		errorMessage = "";
		successMessage = "";
		conversionMeta = null;
		revokeDownloadUrl();

		if (!selectedFile) {
			selectedFileInfo = null;
			return;
		}

		if (workflow === "icon_bundle" && (!atlasExportName || atlasExportName === "IconAtlas")) {
			atlasExportName = `${baseFileName(selectedFile.name)}_IconAtlas`;
		}

		void readPngDimensions(selectedFile)
			.then((dimensions) => {
				if (selectedFile !== fileList?.[0]) {
					return;
				}
				selectedFileInfo = dimensions;
			})
			.catch(() => {
				selectedFileInfo = null;
			});
	}

	function onDropzoneDragEnter(event) {
		event.preventDefault();
		isDragOver = true;
	}

	function onDropzoneDragOver(event) {
		event.preventDefault();
		isDragOver = true;
	}

	function onDropzoneDragLeave(event) {
		event.preventDefault();
		const nextTarget = event.relatedTarget;
		if (nextTarget && event.currentTarget?.contains?.(nextTarget)) {
			return;
		}
		isDragOver = false;
	}

	function onDropzoneDrop(event) {
		event.preventDefault();
		isDragOver = false;
		onFileChange(event.dataTransfer?.files || null);
	}

	async function readPngDimensions(file) {
		const buffer = await file.arrayBuffer();
		if (buffer.byteLength < 24) {
			throw new Error("Invalid PNG payload.");
		}
		const bytes = new Uint8Array(buffer);
		const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
		for (let i = 0; i < signature.length; i += 1) {
			if (bytes[i] !== signature[i]) {
				throw new Error("Not a PNG file.");
			}
		}
		const view = new DataView(buffer);
		const width = view.getUint32(16, false);
		const height = view.getUint32(20, false);
		if (!width || !height) {
			throw new Error("PNG dimensions are invalid.");
		}
		return { width, height };
	}

	function revokeDownloadUrl() {
		if (downloadUrl) {
			URL.revokeObjectURL(downloadUrl);
			downloadUrl = "";
			downloadName = "";
		}
	}

	function backendAssetType() {
		return workflowConfig.backendAssetType || "ui";
	}

	function activePresetSummary() {
		if (workflow === "screen" && activeScreenPreset) {
			return activeScreenPreset.label;
		}
		if (workflow === "icon_sheet" && activeIconPreset) {
			return activeIconPreset.label;
		}
		if (workflow === "icon_bundle" && activeAtlasPreset) {
			return activeAtlasPreset.label;
		}
		return workflowConfig.label;
	}

	function sanitizeExportBase(value) {
		const normalized = String(value || "")
			.replace(/\.[^.]+$/, "")
			.replace(/[^a-z0-9._-]+/gi, "-")
			.replace(/^-+|-+$/g, "");
		return normalized || "IconAtlas";
	}

	function baseFileName(filename) {
		const raw =
			String(filename || "texture.png")
				.replace(/\\/g, "/")
				.split("/")
				.pop() || "texture.png";
		return raw.replace(/\.[^.]+$/, "") || "texture";
	}

	async function convertToDds() {
		if (!selectedFile) {
			errorMessage = "Choose a PNG file first.";
			return;
		}
		if (!canConvertWithDimensions && expectedDimensions && selectedFileInfo) {
			errorMessage = `PNG must be exactly ${expectedDimensions.width}x${expectedDimensions.height}. Current file is ${selectedFileInfo.width}x${selectedFileInfo.height}.`;
			return;
		}
		if (!canConvertWithDimensions && expectedDimensions && !selectedFileInfo) {
			errorMessage = "Unable to verify PNG dimensions for this preset. Choose a valid PNG.";
			return;
		}
		if (workflow === "icon_bundle" && !atlasHasSizeSelection) {
			errorMessage = "Select at least one output icon size.";
			return;
		}
		if (workflow === "icon_bundle" && !atlasCompressionEnabled) {
			errorMessage = "DDS bundle export requires compression to remain enabled.";
			return;
		}

		busy = true;
		errorMessage = "";
		successMessage = "";

		try {
			const form = new FormData();
			form.append("file", selectedFile, selectedFile.name);
			form.append("assetType", backendAssetType());
			form.append("compressionFormat", activeCompression);
			form.append("workflow", workflow);
			form.append("preset", activePresetSummary());
			if (expectedDimensions) {
				form.append("targetWidth", String(expectedDimensions.width));
				form.append("targetHeight", String(expectedDimensions.height));
			}

			if (workflow === "icon_sheet") {
				form.append("gridRows", String(iconSheetRows));
				form.append("gridCols", String(iconSheetCols));
				form.append("iconCellSize", String(activeIconSize || ""));
			}

			if (workflow === "icon_bundle") {
				form.append("selectedSizes", atlasSelectedSizes.join(","));
				form.append("currentIconSize", String(atlasCurrentIconSize));
				form.append("gridRows", String(atlasRows));
				form.append("gridCols", String(atlasCols));
				form.append("resizeSheet", "1");
				form.append("padToMultipleOf4", "1");
				form.append("encoderBackend", activeEncoderBackend);
				form.append("nativeQuality", String(activeNativeQuality));
				form.append("resampleMode", activeAtlasResampleMode);
				form.append("alphaAware", atlasAlphaAware ? "1" : "0");
				form.append("sharpenAmount", String(atlasSharpenAmount));
				form.append("preBlurAmount", String(atlasPreBlurAmount));
				form.append("encoderMode", activeAtlasEncoderMode);
				form.append("colorMetric", activeAtlasColorMetric);
				form.append("weightColorByAlpha", atlasWeightColorByAlpha ? "1" : "0");
				form.append("exportName", sanitizeExportBase(atlasExportName));
				form.append("atlasType", normalizeAtlasType(atlasType));
				form.append("atlasToken", atlasSqlToken);
				form.append("filePrefix", atlasFilePrefix);
			}

			const response = await fetch(CONVERTER_ENDPOINT, {
				method: "POST",
				body: form,
			});

			if (!response.ok) {
				const payload = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
				throw new Error(payload?.error || `Conversion failed (${response.status}).`);
			}

			const blob = await response.blob();
			const contentDisposition = response.headers.get("content-disposition") || "";
			const suggestedName = parseDownloadName(contentDisposition) || buildFallbackName(selectedFile.name, activeCompression, workflow === "icon_bundle");

			revokeDownloadUrl();
			downloadUrl = URL.createObjectURL(blob);
			downloadName = suggestedName;
			conversionMeta = {
				sourceWidth: response.headers.get("x-source-width") || "",
				sourceHeight: response.headers.get("x-source-height") || "",
				outputWidth: response.headers.get("x-output-width") || "",
				outputHeight: response.headers.get("x-output-height") || "",
				format: response.headers.get("x-compression-format") || activeCompression,
				sizeBytes: blob.size,
				bundleCount: response.headers.get("x-bundle-count") || "",
				resampleMode: response.headers.get("x-resample-mode") || "",
				alphaAware: response.headers.get("x-alpha-aware") || "",
				sharpenAmount: response.headers.get("x-sharpen-amount") || "",
				preBlurAmount: response.headers.get("x-pre-blur-amount") || "",
				encoderMode: response.headers.get("x-encoder-mode") || "",
				colorMetric: response.headers.get("x-color-metric") || "",
				weightByAlpha: response.headers.get("x-weight-by-alpha") || "",
				encoderBackend: response.headers.get("x-encoder-backend") || "",
				nativeQuality: response.headers.get("x-native-quality") || "",
			};

			if (workflow === "icon_bundle") {
				const strategicAsset = buildAtlasDdsFilename({
					filePrefix: atlasFilePrefix,
					fileSuffix: BUNDLE_ATLAS_TYPES.unit_flag.fileSuffix,
					size: 128,
				});
				mergeSqlHistory(
					atlasSelectedSizes.map((size) => ({
						atlas: atlasSqlName,
						iconSize: size,
						filename: buildAtlasDdsFilename({
							filePrefix: atlasFilePrefix,
							fileSuffix: activeAtlasTypeConfig.fileSuffix,
							size,
						}),
						iconsPerRow: atlasCols,
						iconsPerColumn: atlasRows,
						strategicViewType: atlasType === "unit_flag" ? String(strategicViewTypeInput || "").trim() : "",
						strategicTileType: atlasType === "unit_flag" ? String(strategicTileTypeInput || "Unit").trim() : "",
						strategicAsset: atlasType === "unit_flag" && strategicViewTypeInput ? strategicAsset : "",
					})),
				);
				successMessage = `Bundle generated with ${conversionMeta.bundleCount || atlasSelectedSizes.length} DDS sheets.`;
			} else {
				successMessage = `${activePresetSummary()} converted successfully.`;
			}
		} catch (error) {
			errorMessage = error?.message || "Unable to convert PNG to DDS.";
		} finally {
			busy = false;
		}
	}

	function parseDownloadName(contentDisposition) {
		const match = /filename=\"?([^\";]+)\"?/i.exec(String(contentDisposition || ""));
		return match?.[1] ? String(match[1]).trim() : "";
	}

	function buildFallbackName(sourceName, format, isBundle = false) {
		const base = baseFileName(sourceName);
		if (isBundle) {
			return `${base}_dds_bundle.zip`;
		}
		return `${base}.${String(format || "dds").toLowerCase()}.dds`;
	}

	function formatBytes(bytes) {
		const value = Number(bytes || 0);
		if (!Number.isFinite(value) || value <= 0) {
			return "0 B";
		}
		if (value < 1024) {
			return `${value} B`;
		}
		const kb = value / 1024;
		if (kb < 1024) {
			return `${kb.toFixed(1)} KB`;
		}
		const mb = kb / 1024;
		return `${mb.toFixed(2)} MB`;
	}

	function iconSizeLabel(size) {
		const alphaRadius = ALPHA_RADIUS_BY_SIZE[size];
		if (alphaRadius) {
			return `${size}px (alpha ${alphaRadius})`;
		}
		return `${size}px`;
	}
</script>

<section class="dds-page">
	<header class="hero dds-hero">
		<p class="eyebrow">Texture Tools</p>
		<h1>PNG to DDS Converter</h1>
		<p>Choose a workflow, validate required dimensions locally, and export Civ5-ready DDS outputs.</p>
	</header>

	<section class="dds-panel">
		<section class="dds-section">
			<div class="dds-section-head">
				<h2 class="dds-section-title">1. Configure Export</h2>
				<p class="dds-section-copy">Choose workflow, atlas settings, and output options.</p>
			</div>
			<div class="dds-form-grid">
				<label>
					Workflow
					<select value={workflow} onchange={(event) => onWorkflowChange(event.currentTarget.value)}>
						{#each Object.entries(WORKFLOWS) as [workflowId, config] (workflowId)}
							<option value={workflowId}>{config.label}</option>
						{/each}
					</select>
				</label>

				{#if workflow === "screen"}
					<label>
						Screen Type
						<select value={activeScreenPreset?.id || ""} onchange={(event) => (selectedScreenPresetId = event.currentTarget.value)}>
							{#each SCREEN_PRESETS as preset (preset.id)}
								<option value={preset.id}>{preset.label} ({preset.width}x{preset.height})</option>
							{/each}
						</select>
					</label>
				{/if}

				{#if workflow === "icon_sheet"}
					<label>
						Icon Class
						<select value={activeIconPreset?.id || ""} onchange={(event) => (selectedIconPresetId = event.currentTarget.value)}>
							{#each ICON_PRESETS as preset (preset.id)}
								<option value={preset.id}>{preset.label}</option>
							{/each}
						</select>
					</label>

					{#if iconSizeOptions.length > 1}
						<label>
							Icon Size
							<select value={activeIconSize ? String(activeIconSize) : ""} onchange={(event) => (selectedIconSizeChoice = event.currentTarget.value)}>
								{#each iconSizeOptions as size (size)}
									<option value={String(size)}>{iconSizeLabel(size)}</option>
								{/each}
							</select>
						</label>
					{:else}
						<label>
							Icon Size
							<input type="text" value={activeIconSize ? iconSizeLabel(activeIconSize) : "N/A"} readonly disabled />
						</label>
					{/if}

					<label>
						Icons per Row
						<input type="number" min="1" max="64" step="1" value={String(iconSheetCols)} oninput={(event) => (iconSheetColsInput = event.currentTarget.value)} />
					</label>

					<label>
						Icons per Column
						<input type="number" min="1" max="64" step="1" value={String(iconSheetRows)} oninput={(event) => (iconSheetRowsInput = event.currentTarget.value)} />
					</label>
				{/if}

				{#if workflow === "icon_bundle"}
					<label>
						Atlas Preset
						<select value={activeAtlasPreset?.id || ""} onchange={(event) => onAtlasPresetChange(event.currentTarget.value)}>
							{#each ICON_ATLAS_PRESETS as preset (preset.id)}
								<option value={preset.id}>{preset.label}</option>
							{/each}
						</select>
					</label>

					<label>
						Current Icon Size
						<select value={String(atlasCurrentIconSize)} onchange={(event) => (atlasCurrentIconSizeChoice = event.currentTarget.value)}>
							{#each ICON_ATLAS_SIZE_OPTIONS as size (size)}
								<option value={String(size)}>{iconSizeLabel(size)}</option>
							{/each}
						</select>
					</label>

					<label>
						Atlas Type
						<select value={atlasType} onchange={(event) => (atlasType = normalizeAtlasType(event.currentTarget.value))}>
							{#each Object.entries(BUNDLE_ATLAS_TYPES) as [kindId, kind] (kindId)}
								<option value={kindId}>{kind.label}</option>
							{/each}
						</select>
					</label>

					<label>
						Icons per Row
						<input type="number" min="1" max="64" step="1" value={String(atlasCols)} oninput={(event) => (atlasColsInput = event.currentTarget.value)} />
					</label>

					<label>
						Icons per Column
						<input type="number" min="1" max="64" step="1" value={String(atlasRows)} oninput={(event) => (atlasRowsInput = event.currentTarget.value)} />
					</label>

					<div class="atlas-size-block">
						<div class="atlas-size-header">
							<span>Icon Sizes</span>
							<div class="atlas-size-actions">
								<button type="button" class="tiny-action" onclick={() => setAllAtlasSizes(true)}>All</button>
								<button type="button" class="tiny-action" onclick={() => setAllAtlasSizes(false)}>None</button>
							</div>
						</div>
						<div class="atlas-size-grid">
							{#each ICON_ATLAS_SIZE_OPTIONS as size (size)}
								<label class="atlas-size-check">
									<input type="checkbox" checked={Boolean(atlasSelectedSizesMap[size])} onchange={(event) => toggleAtlasSize(size, event.currentTarget.checked)} />
									<span>{size}</span>
								</label>
							{/each}
						</div>
					</div>

					<div class="atlas-advanced-block">
						<label class="check-row-inline">
							<input type="checkbox" checked={atlasCompressionEnabled} onchange={(event) => (atlasCompressionEnabled = event.currentTarget.checked)} />
							<span>Compress icon sheets (BC2 / DXT3)</span>
						</label>
						<label>
							Encoder Backend
							<select value={activeEncoderBackend} onchange={(event) => (atlasEncoderBackend = event.currentTarget.value)}>
								{#each ENCODER_BACKEND_OPTIONS as option (option.id)}
									<option value={option.id}>{option.label}</option>
								{/each}
							</select>
						</label>
						{#if activeEncoderBackend === "native"}
							<label>
								Native Quality
								<input type="number" min="0" max="1" step="0.05" value={String(activeNativeQuality)} oninput={(event) => (atlasNativeQualityInput = event.currentTarget.value)} />
							</label>
						{/if}
						<label>
							Resample Mode
							<select value={activeAtlasResampleMode} onchange={(event) => (atlasResampleMode = event.currentTarget.value)}>
								{#each RESAMPLE_MODE_OPTIONS as option (option.id)}
									<option value={option.id}>{option.label}</option>
								{/each}
							</select>
						</label>
						<label>
							DDS Encoder Mode
							<select value={activeAtlasEncoderMode} onchange={(event) => (atlasEncoderMode = event.currentTarget.value)}>
								{#each ENCODER_MODE_OPTIONS as option (option.id)}
									<option value={option.id}>{option.label}</option>
								{/each}
							</select>
						</label>
						<label>
							Color Metric
							<select value={activeAtlasColorMetric} onchange={(event) => (atlasColorMetric = event.currentTarget.value)}>
								{#each COLOR_METRIC_OPTIONS as option (option.id)}
									<option value={option.id}>{option.label}</option>
								{/each}
							</select>
						</label>
						<label class="check-row-inline">
							<input type="checkbox" checked={atlasAlphaAware} onchange={(event) => (atlasAlphaAware = event.currentTarget.checked)} />
							<span>Alpha-aware sampling</span>
						</label>
						<label class="check-row-inline">
							<input type="checkbox" checked={atlasWeightColorByAlpha} onchange={(event) => (atlasWeightColorByAlpha = event.currentTarget.checked)} />
							<span>Weight color by alpha in DDS fit</span>
						</label>
						<div class="atlas-quality-row">
							<label>
								Sharpen
								<input type="range" min="0" max="1" step="0.05" value={String(atlasSharpenAmount)} oninput={(event) => (atlasSharpenAmountInput = event.currentTarget.value)} />
							</label>
							<label>
								Sharpen Amount
								<input type="number" min="0" max="1" step="0.05" value={String(atlasSharpenAmount)} oninput={(event) => (atlasSharpenAmountInput = event.currentTarget.value)} />
							</label>
						</div>
						<div class="atlas-quality-row">
							<label>
								Pre-Blur
								<input type="range" min="0" max="2" step="0.05" value={String(atlasPreBlurAmount)} oninput={(event) => (atlasPreBlurAmountInput = event.currentTarget.value)} />
							</label>
							<label>
								Pre-Blur Amount
								<input type="number" min="0" max="2" step="0.05" value={String(atlasPreBlurAmount)} oninput={(event) => (atlasPreBlurAmountInput = event.currentTarget.value)} />
							</label>
						</div>
						<span class="check-row-note">Upscale sheet dimensions to multiple of 4: Always enabled</span>
						<span class="check-row-note">Resize icon sheet for selected output sizes: Always enabled</span>
					</div>
				{/if}

				{#if compressionOptions.length > 1}
					<label>
						Compression
						<select value={activeCompression} onchange={(event) => (compressionChoice = event.currentTarget.value)}>
							{#each compressionOptions as format (format)}
								<option value={format}>{format}</option>
							{/each}
						</select>
					</label>
				{:else}
					<label>
						Compression
						<input type="text" value={activeCompression} readonly disabled />
					</label>
				{/if}
			</div>
		</section>

		<section class="dds-section">
			<div class="dds-section-head">
				<h2 class="dds-section-title">2. Upload PNG</h2>
				<p class="dds-section-copy">Drop your file here or click to choose from disk.</p>
			</div>
			<label
				class="dds-file-dropzone"
				class:is-drag-over={isDragOver}
				ondragenter={onDropzoneDragEnter}
				ondragover={onDropzoneDragOver}
				ondragleave={onDropzoneDragLeave}
				ondrop={onDropzoneDrop}
			>
				<span class="dds-file-dropzone-title">PNG Source</span>
				<span class="dds-file-dropzone-copy">
					{#if isDragOver}
						Drop PNG here
					{:else if selectedFile}
						Loaded: {selectedFile.name}
					{:else}
						Drag and drop PNG here, or click to browse
					{/if}
				</span>
				<input type="file" accept="image/png" onchange={(event) => onFileChange(event.currentTarget.files)} />
			</label>
		</section>

		<section class="dds-section">
			<div class="dds-section-head">
				<h2 class="dds-section-title">3. Review and Generate</h2>
				<p class="dds-section-copy">{workflowConfig.description}</p>
			</div>

			<div class="dds-meta">
				<span>Preset: {activePresetSummary()}</span>
				{#if expectedDimensions}
					<span>Required PNG: {expectedDimensions.width}x{expectedDimensions.height}</span>
				{/if}
				{#if workflow === "icon_bundle"}
					<span>Selected sizes: {atlasSelectedSizes.join(", ") || "none"}</span>
				{/if}
				<span>Compression: {activeCompression}</span>
				{#if selectedFileInfo}
					<span>PNG: {selectedFileInfo.width}x{selectedFileInfo.height}</span>
				{/if}
			</div>

			{#if workflow === "icon_bundle"}
				<div class="dds-preview-block">
					<label>
						Export Name
						<input type="text" value={atlasExportName} oninput={(event) => (atlasExportName = event.currentTarget.value)} placeholder="IconAtlas" />
					</label>
					<p class="dds-preview-title">Standard: `EXPORT_NAME` -> `EXPORT_NAME_{activeAtlasTypeConfig.atlasSuffix}` and `{atlasFilePrefix}_{activeAtlasTypeConfig.fileSuffix}_SIZE.dds`</p>
					<div class="dds-meta">
						<span>Atlas SQL Name: {atlasSqlName}</span>
						<span>Filename Prefix: {atlasFilePrefix}</span>
						<span>Atlas Kind: {activeAtlasTypeConfig.label}</span>
					</div>
					{#if atlasType === "unit_flag"}
						<div class="dds-form-grid">
							<label>
								StrategicViewType (optional)
								<input type="text" value={strategicViewTypeInput} oninput={(event) => (strategicViewTypeInput = event.currentTarget.value)} placeholder="ART_DEF_UNIT_MEMBER_EXAMPLE" />
							</label>
							<label>
								Strategic TileType
								<input type="text" value={strategicTileTypeInput} oninput={(event) => (strategicTileTypeInput = event.currentTarget.value)} placeholder="Unit" />
							</label>
						</div>
					{/if}
					<div class="dds-preview-list-wrap">
						<p class="dds-preview-title">Generated DDS files</p>
						{#if atlasPreviewFileNames.length}
							<ul class="dds-preview-list">
								{#each atlasPreviewFileNames as fileName (fileName)}
									<li>{fileName}</li>
								{/each}
							</ul>
						{:else}
							<p class="dds-preview-empty">Select icon sizes to preview output filenames.</p>
						{/if}
					</div>
				</div>

				<div class="dds-preview-block">
					<div class="dds-preview-list-wrap">
						<p class="dds-preview-title">Generated SQL (saved in local storage)</p>
						<textarea class="dds-sql-textarea" rows="11" readonly value={[sqlIconTextureAtlasesText, sqlStrategicRowsText].filter(Boolean).join("\n\n")}></textarea>
					</div>
					<div class="dds-actions">
						<button type="button" onclick={copySqlToClipboard} disabled={!sqlIconTextureAtlasesText && !sqlStrategicRowsText}>Copy SQL</button>
						<button type="button" class="danger-action" onclick={resetSqlHistory} disabled={!sqlHistoryEntries.length}>Reset SQL History</button>
					</div>
				</div>
			{/if}

			{#if workflow === "icon_bundle" && !atlasHasSizeSelection}
				<p class="dds-warning">Select at least one output icon size for bundle export.</p>
			{/if}

			{#if workflow === "icon_bundle" && !atlasCompressionEnabled}
				<p class="dds-warning">Compression must stay enabled for DDS bundle export.</p>
			{/if}

			{#if hasDimensionMismatch && expectedDimensions && selectedFileInfo}
				<p class="dds-warning">
					Selected preset requires {expectedDimensions.width}x{expectedDimensions.height}, but PNG is {selectedFileInfo.width}x{selectedFileInfo.height}. Conversion is blocked until
					dimensions match.
				</p>
			{/if}

			<div class="dds-actions">
				<button type="button" onclick={convertToDds} disabled={busy || !canSubmit}>
					{busy ? "Converting..." : workflow === "icon_bundle" ? "Generate DDS Bundle" : "Convert to DDS"}
				</button>
				{#if downloadUrl}
					<a class="dds-download" href={downloadUrl} download={downloadName}>Download {downloadName}</a>
				{/if}
			</div>

			{#if conversionMeta}
				<div class="dds-meta">
					<span>Input: {conversionMeta.sourceWidth}x{conversionMeta.sourceHeight}</span>
					{#if conversionMeta.outputWidth && conversionMeta.outputHeight}
						<span>Output: {conversionMeta.outputWidth}x{conversionMeta.outputHeight}</span>
					{/if}
					<span>Format: {conversionMeta.format}</span>
					{#if conversionMeta.bundleCount}
						<span>Sheets: {conversionMeta.bundleCount}</span>
					{/if}
					{#if conversionMeta.resampleMode}
						<span>Resample: {conversionMeta.resampleMode}</span>
					{/if}
					{#if conversionMeta.alphaAware}
						<span>Alpha-aware: {conversionMeta.alphaAware === "1" ? "on" : "off"}</span>
					{/if}
					{#if conversionMeta.sharpenAmount}
						<span>Sharpen: {conversionMeta.sharpenAmount}</span>
					{/if}
					{#if conversionMeta.preBlurAmount}
						<span>Pre-blur: {conversionMeta.preBlurAmount}</span>
					{/if}
					{#if conversionMeta.encoderMode}
						<span>Encoder: {conversionMeta.encoderMode}</span>
					{/if}
					{#if conversionMeta.encoderBackend}
						<span>Backend: {conversionMeta.encoderBackend}</span>
					{/if}
					{#if conversionMeta.nativeQuality}
						<span>Native quality: {conversionMeta.nativeQuality}</span>
					{/if}
					{#if conversionMeta.colorMetric}
						<span>Metric: {conversionMeta.colorMetric}</span>
					{/if}
					{#if conversionMeta.weightByAlpha}
						<span>Weight-by-alpha: {conversionMeta.weightByAlpha === "1" ? "on" : "off"}</span>
					{/if}
					<span>Size: {formatBytes(conversionMeta.sizeBytes)}</span>
				</div>
			{/if}

			{#if errorMessage}
				<p class="dds-status dds-error">{errorMessage}</p>
			{/if}
			{#if successMessage}
				<p class="dds-status dds-success">{successMessage}</p>
			{/if}
		</section>
	</section>
</section>

<style>
	.dds-page {
		display: grid;
		gap: 1rem;
	}

	.dds-hero {
		background: var(--panel-bg);
	}

	.dds-panel {
		display: grid;
		gap: 1rem;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 1rem;
		padding: 1.1rem;
		box-shadow: 0 8px 20px var(--shadow-soft);
	}

	.dds-section {
		display: grid;
		gap: 0.75rem;
		padding: 0.8rem;
		border: 1px solid color-mix(in oklch, var(--accent) 16%, var(--panel-border));
		border-radius: 0.9rem;
		background: color-mix(in oklch, var(--panel-bg) 86%, var(--control-bg));
	}

	.dds-section-head {
		display: grid;
		gap: 0.25rem;
	}

	.dds-section-title {
		margin: 0;
		font-size: 1rem;
	}

	.dds-section-copy {
		margin: 0;
		color: var(--muted-ink);
		font-size: 0.9rem;
	}

	.dds-form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.85rem;
	}

	.dds-panel label {
		display: grid;
		gap: 0.45rem;
		font-size: 0.95rem;
	}

	.dds-panel select,
	.dds-panel input[type="file"],
	.dds-panel input[type="text"],
	.dds-panel input[type="number"] {
		border-radius: 0.65rem;
		border: 1px solid var(--panel-border);
		padding: 0.52rem 0.65rem;
		background: var(--input-bg);
		color: var(--ink);
	}

	.dds-panel input[readonly] {
		opacity: 0.8;
	}

	.dds-file-dropzone {
		grid-column: 1 / -1;
		min-height: 150px;
		border: 2px dashed color-mix(in oklch, var(--accent) 35%, var(--panel-border));
		border-radius: 0.85rem;
		background: color-mix(in oklch, var(--accent) 8%, var(--control-bg));
		padding: 0.8rem;
		display: grid;
		align-content: center;
		justify-items: center;
		text-align: center;
		gap: 0.5rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			transform 0.15s ease;
	}

	.dds-file-dropzone.is-drag-over {
		border-color: color-mix(in oklch, var(--accent) 62%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 18%, var(--control-bg));
		transform: translateY(-1px);
	}

	.dds-file-dropzone-title {
		font-size: 0.96rem;
		font-weight: 700;
	}

	.dds-file-dropzone-copy {
		color: var(--muted-ink);
		font-size: 0.92rem;
	}

	.dds-file-dropzone input[type="file"] {
		margin-top: 0.2rem;
		padding: 0.35rem;
		max-width: 100%;
	}

	.atlas-size-block,
	.atlas-advanced-block {
		grid-column: 1 / -1;
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 0.75rem;
		padding: 0.65rem;
		background: var(--control-bg);
		display: grid;
		gap: 0.6rem;
	}

	.atlas-size-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.atlas-size-actions {
		display: inline-flex;
		gap: 0.4rem;
	}

	.tiny-action {
		border: 1px solid color-mix(in oklch, var(--accent) 30%, var(--panel-border));
		background: var(--panel-bg);
		border-radius: 0.5rem;
		padding: 0.2rem 0.45rem;
		font-size: 0.78rem;
		cursor: pointer;
	}

	.atlas-size-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
		gap: 0.35rem;
	}

	.atlas-size-check {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
	}

	.check-row-inline {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.9rem;
	}

	.check-row-note {
		font-size: 0.86rem;
		color: var(--muted-ink);
	}

	.atlas-quality-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.55rem;
	}

	.dds-actions {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-wrap: wrap;
	}

	.dds-actions button {
		border: 1px solid color-mix(in oklch, var(--accent) 28%, var(--panel-border));
		background: var(--control-bg);
		color: var(--ink);
		border-radius: 0.65rem;
		padding: 0.54rem 0.82rem;
		cursor: pointer;
	}

	.dds-actions button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.dds-download {
		color: var(--ink);
		text-decoration: none;
		border: 1px solid color-mix(in oklch, var(--accent) 30%, var(--panel-border));
		border-radius: 0.65rem;
		padding: 0.54rem 0.82rem;
		background: color-mix(in oklch, var(--accent) 12%, var(--control-bg));
	}

	.dds-meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.dds-meta span {
		padding: 0.34rem 0.5rem;
		border-radius: 0.55rem;
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		background: var(--control-bg);
		font-size: 0.85rem;
	}

	.dds-warning {
		margin: 0;
		padding: 0.55rem 0.65rem;
		border-radius: 0.65rem;
		border: 1px solid color-mix(in oklch, oklch(0.9 0.15 95) 50%, var(--panel-border));
		background: color-mix(in oklch, oklch(0.93 0.08 100) 35%, var(--control-bg));
		font-size: 0.9rem;
	}

	.dds-preview-block {
		display: grid;
		gap: 0.6rem;
		padding: 0.65rem;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		background: var(--control-bg);
	}

	.dds-preview-list-wrap {
		display: grid;
		gap: 0.35rem;
	}

	.dds-preview-title {
		margin: 0;
		font-size: 0.86rem;
		color: var(--muted-ink);
	}

	.dds-preview-list {
		margin: 0;
		padding-left: 1rem;
		display: grid;
		gap: 0.2rem;
		font-size: 0.86rem;
	}

	.dds-preview-empty {
		margin: 0;
		font-size: 0.86rem;
		color: var(--muted-ink);
	}

	.dds-sql-textarea {
		width: 100%;
		border-radius: 0.65rem;
		border: 1px solid var(--panel-border);
		background: var(--input-bg);
		color: var(--ink);
		padding: 0.6rem 0.7rem;
		font-family: "Courier New", "SFMono-Regular", Menlo, monospace;
		font-size: 0.8rem;
	}

	.danger-action {
		border-color: color-mix(in oklch, oklch(0.72 0.2 25) 50%, var(--panel-border)) !important;
	}

	.dds-status {
		margin: 0;
		font-size: 0.92rem;
	}

	.dds-error {
		color: oklch(0.72 0.17 23);
	}

	.dds-success {
		color: oklch(0.82 0.14 145);
	}
</style>
