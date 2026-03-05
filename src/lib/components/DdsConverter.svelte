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
		screen: {
			label: "Screen / Splash",
			description: "Uses fixed screen dimensions from your reference sheet.",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		icon_bundle: {
			label: "Icon Atlas Bundle",
			description: "Generate one ZIP containing DDS icon sheets for multiple icon sizes.",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		unit_alpha_bundle: {
			label: "Unit Alpha Atlas",
			description: "Unit alpha atlas output.",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		civ_alpha_bundle: {
			label: "Civ Icon Alpha Atlas",
			description: "Civ icon alpha atlas output.",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		religion_alpha_bundle: {
			label: "Religion Alpha Atlas",
			description: "Religion alpha atlas output.",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		// ui_bundle: {
		// 	label: "UI Atlas Bundle",
		// 	description: "Generate UI atlas DDS outputs with the same bundle features.",
		// 	backendAssetType: "ui",
		// 	compressionOptions: ["DXT3"],
		// },
		icon_sheet: {
			label: "Single Icon Sheet",
			description: "Single icon-sheet export for one chosen icon size",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		sv: {
			label: "Strategic View (SV)",
			description: "Single-file SV output with mipmaps. Input and output stay the same fixed size",
			backendAssetType: "ui",
			compressionOptions: ["RGBA8"],
		},
		unit: {
			label: "Unit Texture",
			description: "Unit textures use DXT3",
			backendAssetType: "unit",
			compressionOptions: ["DXT3"],
		},
		terrain: {
			label: "Terrain Texture",
			description: "Terrain textures can use DXT1 (opaque/simple alpha) or DXT5 (smoother alpha)",
			backendAssetType: "terrain",
			compressionOptions: ["DXT1", "DXT5"],
		},
		ui: {
			label: "UI Texture",
			description: "UI and Icon textures use DXT3",
			backendAssetType: "ui",
			compressionOptions: ["DXT3"],
		},
		// portraits: {
		// 	label: "Portrait / Icon Texture",
		// 	description: "Portraits and icon atlases commonly",
		// 	backendAssetType: "portraits",
		// 	compressionOptions: ["DXT5"],
		// },
	};

	const SCREEN_PRESETS = [
		{ id: "diplo-wide", label: "Leaderscene", width: 1600, height: 900 },
		{ id: "map-load", label: "Map", width: 360, height: 412 },
		{ id: "dom-standard", label: "Dawn of Man (DOM)", width: 1024, height: 768 },
		{ id: "wonder-splash", label: "Wonder", width: 972, height: 568 },
		{ id: "city-state-bg", label: "City-State", width: 523, height: 300 },
		{ id: "era-change", label: "Era Change", width: 924, height: 472 },
		{ id: "ideology-tab", label: "Ideology Tab", width: 964, height: 668 },
		{ id: "policy-panel", label: "Policy Panel", width: 192, height: 292 },
		{ id: "victory", label: "Victory", width: 956, height: 532 },
	];

	const ICON_PRESETS = [
		{ id: "buildings", label: "Buildings", sizes: [256, 128, 80, 64, 45], mipmapSizes: [] },
		{ id: "techs", label: "Techs", sizes: [256, 214, 128, 80, 64, 45], mipmapSizes: [] },
		{ id: "units", label: "Units", sizes: [256, 128, 80, 64, 45], mipmapSizes: [] },
		{ id: "civs", label: "Civs", sizes: [256, 128, 80, 64, 45, 32], mipmapSizes: [] },
		{ id: "leaders", label: "Leaders", sizes: [256, 128, 64], mipmapSizes: [] },
		{ id: "resources", label: "Resources", sizes: [256, 80, 64, 45], mipmapSizes: [] },
	];
	const SV_PRESETS = [
		{ id: "unit-sv", label: "Unit SV", size: 128 },
		{ id: "improvement-sv", label: "Improvement SV", size: 256 },
		{ id: "resource-sv", label: "Resource SV", size: 256 },
	];

	const ICON_ATLAS_SIZE_OPTIONS = [16, 22, 24, 32, 45, 48, 64, 80, 128, 214, 256];
	const ICON_SOURCE_SIZE = 256;
	const ICON_BUNDLE_ENCODER_PRESET = {
		backend: "native",
		resampleMode: "lanczos3",
		alphaAware: true,
		nativeQuality: 1,
		preBlurAmount: 0.25,
		ditherAmount: 0.25,
		alphaSmoothAmount: 0.25,
		sharpenAmount: 0,
		colorBoost: 1,
		detailBoost: 0,
		encoderMode: "iterative",
		colorMetric: "uniform",
		weightColorByAlpha: false,
	};

	const ICON_ATLAS_PRESETS = [
		{
			id: "mixed-core",
			label: "All",
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
	const BUNDLE_WORKFLOW_SETTINGS = {
		icon_bundle: { atlasType: "icon", sourceSize: 256, sizeOptions: ICON_ATLAS_SIZE_OPTIONS, fixedSizes: false, showPreset: true, showSizePicker: true, minSelected: 1 },
		ui_bundle: { atlasType: "ui", sourceSize: 256, sizeOptions: ICON_ATLAS_SIZE_OPTIONS, fixedSizes: false, showPreset: true, showSizePicker: true, minSelected: 1 },
		unit_alpha_bundle: { atlasType: "alpha", sourceSize: 32, sizeOptions: [32], fixedSizes: true, showPreset: false, showSizePicker: false, defaultRows: 1, defaultCols: 1, minSelected: 1 },
		civ_alpha_bundle: {
			atlasType: "alpha",
			sourceSize: 32,
			sizeOptions: [24, 32, 48, 64, 128, 256],
			fixedSizes: false,
			showPreset: false,
			showSizePicker: true,
			defaultRows: 1,
			defaultCols: 1,
			minSelected: 2,
			preselectAll: true,
		},
		religion_alpha_bundle: {
			atlasType: "alpha",
			sourceSize: 32,
			sizeOptions: [16, 24, 32, 48, 64, 80, 128],
			fixedSizes: false,
			showPreset: false,
			showSizePicker: true,
			defaultRows: 1,
			defaultCols: 1,
			minSelected: 2,
			preselectAll: true,
		},
	};
	const SV_NAMING_CONFIG = {
		"unit-sv": { label: "Unit SV", atlasSuffix: "UNIT_SV_ATLAS", fileSuffix: "UnitSV" },
		"improvement-sv": { label: "Improvement SV", atlasSuffix: "IMPROVEMENT_SV_ATLAS", fileSuffix: "ImprovementSV" },
		"resource-sv": { label: "Resource SV", atlasSuffix: "RESOURCE_SV_ATLAS", fileSuffix: "ResourceSV" },
	};

	const SQL_HISTORY_STORAGE_KEY = "cmc_dds_sql_history_v1";

	function buildSizeSelection(selectedSizes = []) {
		const selection = {};
		for (const size of ICON_ATLAS_SIZE_OPTIONS) {
			selection[size] = selectedSizes.includes(size);
		}
		return selection;
	}

	let workflow = $state("icon_bundle");
	let compressionChoice = $state("");
	let selectedScreenPresetId = $state(SCREEN_PRESETS[0].id);
	let selectedSvPresetId = $state(SV_PRESETS[0].id);

	let selectedIconPresetId = $state(ICON_PRESETS[0].id);

	let selectedAtlasPresetId = $state(ICON_ATLAS_PRESETS[0].id);
	let atlasRowsInput = $state(String(ICON_ATLAS_PRESETS[0].rows));
	let atlasColsInput = $state(String(ICON_ATLAS_PRESETS[0].cols));
	let atlasSelectedSizesMap = $state(buildSizeSelection(ICON_ATLAS_PRESETS[0].defaultSizes));
	let atlasExportName = $state("");
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
	let sourcePreviewUrl = $state("");
	let conversionMeta = $state(null);
	let sqlHistoryEntries = $state([]);

	const workflowConfig = $derived(WORKFLOWS[workflow] || WORKFLOWS.unit);
	const compressionOptions = $derived(workflowConfig.compressionOptions || ["DXT3"]);
	const activeCompression = $derived(resolveStringOption(compressionChoice, compressionOptions));

	const activeScreenPreset = $derived(resolvePresetById(SCREEN_PRESETS, selectedScreenPresetId));
	const activeSvPreset = $derived(resolvePresetById(SV_PRESETS, selectedSvPresetId));

	const activeIconPreset = $derived(resolvePresetById(ICON_PRESETS, selectedIconPresetId));
	const iconSizeOptions = $derived(activeIconPreset?.sizes || []);
	const activeIconMipmapSizes = $derived(activeIconPreset?.mipmapSizes || []);
	const iconSheetRows = $derived(1);
	const iconSheetCols = $derived(1);

	const activeAtlasPreset = $derived(resolvePresetById(ICON_ATLAS_PRESETS, selectedAtlasPresetId));
	const activeBundleWorkflowSettings = $derived(BUNDLE_WORKFLOW_SETTINGS[workflow] || null);
	const isAtlasBundleWorkflow = $derived(Boolean(activeBundleWorkflowSettings));
	const showBundlePreset = $derived(Boolean(activeBundleWorkflowSettings?.showPreset !== false));
	const showBundleSizePicker = $derived(Boolean(activeBundleWorkflowSettings?.showSizePicker !== false));
	const bundleMinSelectedSizes = $derived(Number(activeBundleWorkflowSettings?.minSelected || 1));
	const activeBundleSizeOptions = $derived(activeBundleWorkflowSettings?.sizeOptions || ICON_ATLAS_SIZE_OPTIONS);
	const activeBundleSourceSize = $derived(activeBundleWorkflowSettings?.sourceSize || ICON_SOURCE_SIZE);
	const atlasRows = $derived(parseGridCount(atlasRowsInput));
	const atlasCols = $derived(parseGridCount(atlasColsInput));
	const atlasSelectedSizes = $derived(
		activeBundleWorkflowSettings?.fixedSizes ? activeBundleSizeOptions : activeBundleSizeOptions.filter((size) => Boolean(atlasSelectedSizesMap[size])).sort((a, b) => a - b),
	);
	const activeBundleAtlasType = $derived(activeBundleWorkflowSettings?.atlasType || "icon");
	const activeAtlasTypeConfig = $derived(BUNDLE_ATLAS_TYPES[activeBundleAtlasType] || BUNDLE_ATLAS_TYPES.icon);
	const activeSvNamingConfig = $derived(SV_NAMING_CONFIG[activeSvPreset?.id] || SV_NAMING_CONFIG["unit-sv"]);
	const activeSqlAtlasConfig = $derived(isAtlasBundleWorkflow ? activeAtlasTypeConfig : workflow === "icon_sheet" ? BUNDLE_ATLAS_TYPES.icon : workflow === "sv" ? activeSvNamingConfig : null);
	const activeNativeOutputMode = $derived(activeBundleAtlasType === "unit_flag" ? "dxt3" : "rgba8");
	const atlasSqlToken = $derived(normalizeAtlasSqlToken(atlasExportName));
	const atlasFilePrefix = $derived(buildAtlasFilePrefix(atlasSqlToken));
	const sqlWorkflowEnabled = $derived(isAtlasBundleWorkflow || workflow === "icon_sheet" || workflow === "sv");
	const activeWorkflowSizes = $derived(isAtlasBundleWorkflow ? atlasSelectedSizes : workflow === "icon_sheet" ? iconSizeOptions : workflow === "sv" && activeSvPreset ? [activeSvPreset.size] : []);
	const atlasSqlName = $derived(activeSqlAtlasConfig ? `${atlasSqlToken}_${activeSqlAtlasConfig.atlasSuffix}` : "");
	const atlasPreviewFileNames = $derived(
		activeWorkflowSizes.map((size) =>
			buildAtlasDdsFilename({
				filePrefix: atlasFilePrefix,
				fileSuffix: activeSqlAtlasConfig?.fileSuffix || "IconAtlas",
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
			svPreset: activeSvPreset,
			iconSize: ICON_SOURCE_SIZE,
			iconRows: iconSheetRows,
			iconCols: iconSheetCols,
			atlasCurrentSize: activeBundleSourceSize,
			atlasRows,
			atlasCols,
		}),
	);
	const hasDimensionMismatch = $derived(
		Boolean(expectedDimensions && selectedFileInfo && (expectedDimensions.width !== selectedFileInfo.width || expectedDimensions.height !== selectedFileInfo.height)),
	);
	const canConvertWithDimensions = $derived(Boolean(!expectedDimensions || (selectedFileInfo && !hasDimensionMismatch)));
	const canSubmit = $derived(Boolean(selectedFile && canConvertWithDimensions && (!isAtlasBundleWorkflow || atlasSelectedSizes.length >= bundleMinSelectedSizes)));

	onDestroy(() => {
		revokeSourcePreviewUrl();
		revokeDownloadUrl();
	});

	onMount(() => {
		sqlHistoryEntries = loadSqlHistory();
	});

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

	function parseGridCount(value) {
		const parsed = Number.parseInt(String(value || "").trim(), 10);
		if (!Number.isFinite(parsed) || parsed < 1) {
			return 1;
		}
		return Math.min(parsed, 64);
	}

	function computeExpectedDimensions({ workflow: nextWorkflow, screenPreset, svPreset, iconSize, iconRows, iconCols, atlasCurrentSize, atlasRows: rows, atlasCols: cols }) {
		if (nextWorkflow === "screen" && screenPreset) {
			return {
				width: Number(screenPreset.width),
				height: Number(screenPreset.height),
			};
		}
		if (nextWorkflow === "sv" && svPreset) {
			return {
				width: Number(svPreset.size),
				height: Number(svPreset.size),
			};
		}
		if (nextWorkflow === "icon_sheet" && iconSize) {
			return {
				width: Number(iconSize) * Number(iconCols || 1),
				height: Number(iconSize) * Number(iconRows || 1),
			};
		}
		if (
			(nextWorkflow === "icon_bundle" ||
				nextWorkflow === "ui_bundle" ||
				nextWorkflow === "unit_alpha_bundle" ||
				nextWorkflow === "civ_alpha_bundle" ||
				nextWorkflow === "religion_alpha_bundle") &&
			atlasCurrentSize
		) {
			return {
				width: Number(atlasCurrentSize) * Number(cols || 1),
				height: Number(atlasCurrentSize) * Number(rows || 1),
			};
		}
		return null;
	}

	function onWorkflowChange(nextWorkflow) {
		workflow = WORKFLOWS[nextWorkflow] ? nextWorkflow : "unit";
		if (BUNDLE_WORKFLOW_SETTINGS[workflow]) {
			const preset = resolvePresetById(ICON_ATLAS_PRESETS, selectedAtlasPresetId);
			const workflowSizes = BUNDLE_WORKFLOW_SETTINGS[workflow].sizeOptions || ICON_ATLAS_SIZE_OPTIONS;
			const defaultSizes = BUNDLE_WORKFLOW_SETTINGS[workflow].preselectAll
				? workflowSizes
				: BUNDLE_WORKFLOW_SETTINGS[workflow].fixedSizes
					? workflowSizes
					: (preset?.defaultSizes || []).filter((size) => workflowSizes.includes(size));
			atlasSelectedSizesMap = buildSizeSelection(defaultSizes);
			atlasRowsInput = String(BUNDLE_WORKFLOW_SETTINGS[workflow].defaultRows || atlasRowsInput || 1);
			atlasColsInput = String(BUNDLE_WORKFLOW_SETTINGS[workflow].defaultCols || atlasColsInput || 1);
		}
		errorMessage = "";
		successMessage = "";
		conversionMeta = null;
	}

	function onAtlasPresetChange(nextPresetId) {
		const preset = resolvePresetById(ICON_ATLAS_PRESETS, nextPresetId);
		selectedAtlasPresetId = preset.id;
		atlasRowsInput = String(preset.rows);
		atlasColsInput = String(preset.cols);
		const workflowSizes = activeBundleSizeOptions;
		const defaultSizes = activeBundleWorkflowSettings?.fixedSizes ? workflowSizes : (preset.defaultSizes || []).filter((size) => workflowSizes.includes(size));
		atlasSelectedSizesMap = buildSizeSelection(defaultSizes);
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
		atlasSelectedSizesMap = buildSizeSelection(enabled ? activeBundleSizeOptions : []);
		errorMessage = "";
		successMessage = "";
	}

	function onFileChange(fileList) {
		selectedFile = fileList?.[0] || null;
		errorMessage = "";
		successMessage = "";
		conversionMeta = null;
		revokeDownloadUrl();
		revokeSourcePreviewUrl();

		if (!selectedFile) {
			selectedFileInfo = null;
			return;
		}
		sourcePreviewUrl = URL.createObjectURL(selectedFile);

		if ((isAtlasBundleWorkflow || workflow === "icon_sheet" || workflow === "sv") && (!atlasExportName || atlasExportName === "IconAtlas")) {
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

	function revokeSourcePreviewUrl() {
		if (sourcePreviewUrl) {
			URL.revokeObjectURL(sourcePreviewUrl);
			sourcePreviewUrl = "";
		}
	}

	function backendAssetType() {
		return workflowConfig.backendAssetType || "ui";
	}

	function activePresetSummary() {
		if (workflow === "screen" && activeScreenPreset) {
			return activeScreenPreset.label;
		}
		if (workflow === "sv" && activeSvPreset) {
			return activeSvPreset.label;
		}
		if (workflow === "icon_sheet" && activeIconPreset) {
			return activeIconPreset.label;
		}
		if (isAtlasBundleWorkflow && showBundlePreset && activeAtlasPreset) {
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
		if (isAtlasBundleWorkflow && atlasSelectedSizes.length < bundleMinSelectedSizes) {
			errorMessage = bundleMinSelectedSizes > 1 ? `Select at least ${bundleMinSelectedSizes} output icon sizes.` : "Select at least one output icon size.";
			return;
		}
		busy = true;
		errorMessage = "";
		successMessage = "";

		try {
			const form = new FormData();
			form.append("file", selectedFile, selectedFile.name);
			form.append("assetType", backendAssetType());
			const workflowForRequest = workflow === "icon_sheet" || isAtlasBundleWorkflow ? "icon_bundle" : workflow;
			form.append("compressionFormat", workflow === "icon_sheet" ? "RGBA8" : activeCompression);
			form.append("workflow", workflowForRequest);
			form.append("preset", activePresetSummary());
			if (expectedDimensions) {
				form.append("targetWidth", String(expectedDimensions.width));
				form.append("targetHeight", String(expectedDimensions.height));
			}

			if (workflow === "icon_sheet") {
				form.append("selectedSizes", iconSizeOptions.join(","));
				if (activeIconMipmapSizes.length) {
					form.append("mipmapSizes", activeIconMipmapSizes.join(","));
				}
				form.append("currentIconSize", String(ICON_SOURCE_SIZE));
				form.append("encoderBackend", ICON_BUNDLE_ENCODER_PRESET.backend);
				form.append("nativeOutputMode", "rgba8");
				form.append("nativeQuality", String(ICON_BUNDLE_ENCODER_PRESET.nativeQuality));
				form.append("resampleMode", ICON_BUNDLE_ENCODER_PRESET.resampleMode);
				form.append("alphaAware", ICON_BUNDLE_ENCODER_PRESET.alphaAware ? "1" : "0");
				form.append("sharpenAmount", String(ICON_BUNDLE_ENCODER_PRESET.sharpenAmount));
				form.append("preBlurAmount", String(ICON_BUNDLE_ENCODER_PRESET.preBlurAmount));
				form.append("colorBoost", String(ICON_BUNDLE_ENCODER_PRESET.colorBoost));
				form.append("ditherAmount", String(ICON_BUNDLE_ENCODER_PRESET.ditherAmount));
				form.append("alphaSmoothAmount", String(ICON_BUNDLE_ENCODER_PRESET.alphaSmoothAmount));
				form.append("detailBoost", String(ICON_BUNDLE_ENCODER_PRESET.detailBoost));
				form.append("encoderMode", ICON_BUNDLE_ENCODER_PRESET.encoderMode);
				form.append("colorMetric", ICON_BUNDLE_ENCODER_PRESET.colorMetric);
				form.append("weightColorByAlpha", ICON_BUNDLE_ENCODER_PRESET.weightColorByAlpha ? "1" : "0");
				form.append("gridRows", String(iconSheetRows));
				form.append("gridCols", String(iconSheetCols));
				form.append("resizeSheet", "1");
				form.append("padToMultipleOf4", "1");
				form.append("exportName", sanitizeExportBase(atlasExportName));
				form.append("atlasType", "icon");
				form.append("atlasToken", atlasSqlToken);
				form.append("filePrefix", atlasFilePrefix);
			}
			if (workflow === "sv") {
				form.append("encoderBackend", ICON_BUNDLE_ENCODER_PRESET.backend);
				form.append("nativeOutputMode", "rgba8");
				form.append("nativeQuality", String(ICON_BUNDLE_ENCODER_PRESET.nativeQuality));
				form.append("colorMetric", ICON_BUNDLE_ENCODER_PRESET.colorMetric);
				form.append("generateMipmaps", "1");
				form.append("outputSize", String(activeSvPreset?.size || 256));
				form.append("filePrefix", atlasFilePrefix);
				form.append("fileSuffix", activeSvNamingConfig.fileSuffix);
			}

			if (isAtlasBundleWorkflow) {
				form.append("selectedSizes", atlasSelectedSizes.join(","));
				form.append("currentIconSize", String(activeBundleSourceSize));
				form.append("gridRows", String(atlasRows));
				form.append("gridCols", String(atlasCols));
				form.append("resizeSheet", "1");
				form.append("padToMultipleOf4", "1");
				form.append("encoderBackend", ICON_BUNDLE_ENCODER_PRESET.backend);
				form.append("nativeOutputMode", activeNativeOutputMode);
				form.append("nativeQuality", String(ICON_BUNDLE_ENCODER_PRESET.nativeQuality));
				form.append("resampleMode", ICON_BUNDLE_ENCODER_PRESET.resampleMode);
				form.append("alphaAware", ICON_BUNDLE_ENCODER_PRESET.alphaAware ? "1" : "0");
				form.append("sharpenAmount", String(ICON_BUNDLE_ENCODER_PRESET.sharpenAmount));
				form.append("preBlurAmount", String(ICON_BUNDLE_ENCODER_PRESET.preBlurAmount));
				form.append("colorBoost", String(ICON_BUNDLE_ENCODER_PRESET.colorBoost));
				form.append("ditherAmount", String(ICON_BUNDLE_ENCODER_PRESET.ditherAmount));
				form.append("alphaSmoothAmount", String(ICON_BUNDLE_ENCODER_PRESET.alphaSmoothAmount));
				form.append("detailBoost", String(ICON_BUNDLE_ENCODER_PRESET.detailBoost));
				form.append("encoderMode", ICON_BUNDLE_ENCODER_PRESET.encoderMode);
				form.append("colorMetric", ICON_BUNDLE_ENCODER_PRESET.colorMetric);
				form.append("weightColorByAlpha", ICON_BUNDLE_ENCODER_PRESET.weightColorByAlpha ? "1" : "0");
				form.append("exportName", sanitizeExportBase(atlasExportName));
				form.append("atlasType", activeBundleAtlasType);
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
			const isBundleWorkflow = isAtlasBundleWorkflow || workflow === "icon_sheet";
			const suggestedName = parseDownloadName(contentDisposition) || buildFallbackName(selectedFile.name, activeCompression, isBundleWorkflow);

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
				preBlurAmount: response.headers.get("x-pre-blur-amount") || "",
				ditherAmount: response.headers.get("x-dither-amount") || "",
				alphaSmoothAmount: response.headers.get("x-alpha-smooth-amount") || "",
				encoderMode: response.headers.get("x-encoder-mode") || "",
				colorMetric: response.headers.get("x-color-metric") || "",
				encoderBackend: response.headers.get("x-encoder-backend") || "",
				nativeQuality: response.headers.get("x-native-quality") || "",
				nativeOutputMode: response.headers.get("x-native-output-mode") || "",
				mipmapSizes: response.headers.get("x-mipmap-sizes") || "",
				mipmapEnabled: response.headers.get("x-mipmap-enabled") || "",
			};

			if (isAtlasBundleWorkflow) {
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
						strategicViewType: activeBundleAtlasType === "unit_flag" ? String(strategicViewTypeInput || "").trim() : "",
						strategicTileType: activeBundleAtlasType === "unit_flag" ? String(strategicTileTypeInput || "Unit").trim() : "",
						strategicAsset: activeBundleAtlasType === "unit_flag" && strategicViewTypeInput ? strategicAsset : "",
					})),
				);
				successMessage = `Bundle generated with ${conversionMeta.bundleCount || atlasSelectedSizes.length} DDS sheets.`;
			} else if (workflow === "icon_sheet") {
				mergeSqlHistory(
					iconSizeOptions.map((size) => ({
						atlas: atlasSqlName,
						iconSize: size,
						filename: buildAtlasDdsFilename({
							filePrefix: atlasFilePrefix,
							fileSuffix: BUNDLE_ATLAS_TYPES.icon.fileSuffix,
							size,
						}),
						iconsPerRow: iconSheetCols,
						iconsPerColumn: iconSheetRows,
						strategicViewType: "",
						strategicTileType: "",
						strategicAsset: "",
					})),
				);
				successMessage = `Bundle generated with ${conversionMeta.bundleCount || iconSizeOptions.length} DDS sheets.`;
			} else if (workflow === "sv") {
				const svSize = Number(activeSvPreset?.size || 256);
				mergeSqlHistory([
					{
						atlas: atlasSqlName,
						iconSize: svSize,
						filename: buildAtlasDdsFilename({
							filePrefix: atlasFilePrefix,
							fileSuffix: activeSvNamingConfig.fileSuffix,
							size: svSize,
						}),
						iconsPerRow: 1,
						iconsPerColumn: 1,
						strategicViewType: "",
						strategicTileType: "",
						strategicAsset: "",
					},
				]);
				successMessage = `${activePresetSummary()} converted successfully.`;
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
</script>

<section class="dds-page">
	<header class="hero dds-hero">
		<h1>PNG to DDS Converter</h1>
		<p>Choose a workflow and export Civ5-ready DDS outputs.</p>
	</header>

	<section class="dds-panel">
		<section class="dds-section">
			<div class="dds-section-head">
				<h2 class="dds-section-title">1. Configure Workflow</h2>
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

				{#if workflow === "sv"}
					<label>
						SV Type
						<select value={activeSvPreset?.id || ""} onchange={(event) => (selectedSvPresetId = event.currentTarget.value)}>
							{#each SV_PRESETS as preset (preset.id)}
								<option value={preset.id}>{preset.label} ({preset.size}x{preset.size})</option>
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
				{/if}

				{#if isAtlasBundleWorkflow}
					{#if showBundlePreset}
						<label>
							Atlas Preset
							<select value={activeAtlasPreset?.id || ""} onchange={(event) => onAtlasPresetChange(event.currentTarget.value)}>
								{#each ICON_ATLAS_PRESETS as preset (preset.id)}
									<option value={preset.id}>{preset.label}</option>
								{/each}
							</select>
						</label>
					{/if}

					<label>
						Icons per Row
						<input type="number" min="1" max="64" step="1" value={String(atlasCols)} oninput={(event) => (atlasColsInput = event.currentTarget.value)} />
					</label>

					<label>
						Icons per Column
						<input type="number" min="1" max="64" step="1" value={String(atlasRows)} oninput={(event) => (atlasRowsInput = event.currentTarget.value)} />
					</label>

					{#if showBundleSizePicker}
						<div class="atlas-size-block">
							<div class="atlas-size-header">
								<span>Icon Sizes</span>
								<div class="atlas-size-actions">
									<button type="button" class="tiny-action" onclick={() => setAllAtlasSizes(true)}>All</button>
									<button type="button" class="tiny-action" onclick={() => setAllAtlasSizes(false)}>None</button>
								</div>
							</div>
							<div class="atlas-size-grid">
								{#each activeBundleSizeOptions as size (size)}
									<label class="atlas-size-check">
										<input type="checkbox" checked={Boolean(atlasSelectedSizesMap[size])} onchange={(event) => toggleAtlasSize(size, event.currentTarget.checked)} />
										<span>{size}</span>
									</label>
								{/each}
							</div>
						</div>
					{/if}
				{/if}

				{#if workflow !== "screen" && workflow !== "icon_sheet" && workflow !== "sv" && (!isAtlasBundleWorkflow || activeNativeOutputMode !== "rgba8")}
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
				{/if}
			</div>
		</section>

		<section class="dds-section">
			<div class="dds-section-head">
				<h2 class="dds-section-title">2. Upload PNG</h2>
				<p class="dds-section-copy">Drop your file here or click to upload.</p>
			</div>
			<div class="dds-meta">
				{#if expectedDimensions}
					<span>Required PNG: {expectedDimensions.width} x {expectedDimensions.height}</span>
				{/if}
			</div>
			<label
				class="dds-file-dropzone"
				class:is-drag-over={isDragOver}
				ondragenter={onDropzoneDragEnter}
				ondragover={onDropzoneDragOver}
				ondragleave={onDropzoneDragLeave}
				ondrop={onDropzoneDrop}
			>
				<span class="dds-file-dropzone-copy">
					{#if isDragOver}
						Drop PNG here
					{:else if selectedFile}
						Loaded: {selectedFile.name}
					{:else}
						Drag and drop PNG here, or click to Upload
					{/if}
				</span>
				{#if sourcePreviewUrl}
					<img class="dds-file-preview" src={sourcePreviewUrl} alt="Selected PNG preview" />
				{/if}
				<input type="file" accept="image/png" onchange={(event) => onFileChange(event.currentTarget.files)} />
			</label>
		</section>

		<section class="dds-section">
			<div class="dds-section-head">
				<h2 class="dds-section-title">3. Review and Generate</h2>
				<p class="dds-section-copy">{workflowConfig.description}</p>
			</div>

			<div class="dds-meta">
				{#if isAtlasBundleWorkflow}
					<span>Selected sizes: {atlasSelectedSizes.join(", ") || "none"}</span>
				{/if}
				{#if workflow === "icon_sheet"}
					<span>Selected sizes: {iconSizeOptions.join(", ") || "none"}</span>
					{#if activeIconMipmapSizes.length}
						<span>MipMap sizes: {activeIconMipmapSizes.join(", ")}</span>
					{/if}
				{/if}
				{#if workflow === "sv" && activeSvPreset}
					<span>SV size: {activeSvPreset.size}</span>
					<span>MipMap</span>
				{/if}
				{#if selectedFileInfo}
					<span>Uploaded PNG: {selectedFileInfo.width} x {selectedFileInfo.height}</span>
				{/if}
			</div>

			{#if sqlWorkflowEnabled}
				<div class="dds-preview-block">
					<label>
						Export Name
						<input type="text" value={atlasExportName} oninput={(event) => (atlasExportName = event.currentTarget.value)} />
					</label>
					<p class="dds-preview-title">Standard: `EXPORT_NAME` -> `EXPORT_NAME_{activeSqlAtlasConfig?.atlasSuffix}` and `{atlasFilePrefix}_{activeSqlAtlasConfig?.fileSuffix}_SIZE.dds`</p>
					<div class="dds-meta">
						<span>Atlas SQL Name: {atlasSqlName}</span>
						<span>Filename Prefix: {atlasFilePrefix}</span>
						<!-- <span>Atlas Kind: {activeSqlAtlasConfig?.label}</span> -->
					</div>
					{#if isAtlasBundleWorkflow && activeBundleAtlasType === "unit_flag"}
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

			{#if isAtlasBundleWorkflow && atlasSelectedSizes.length < bundleMinSelectedSizes}
				<p class="dds-warning">Select at least {bundleMinSelectedSizes} output icon size{bundleMinSelectedSizes === 1 ? "" : "s"} for bundle export.</p>
			{/if}

			{#if hasDimensionMismatch && expectedDimensions && selectedFileInfo}
				<p class="dds-warning">
					Selected preset requires {expectedDimensions.width}x{expectedDimensions.height}, but PNG is {selectedFileInfo.width}x{selectedFileInfo.height}. Conversion is blocked until
					dimensions match.
				</p>
			{/if}

			<div class="dds-actions">
				<button type="button" onclick={convertToDds} disabled={busy || !canSubmit}>
					{busy ? "Converting..." : isAtlasBundleWorkflow || workflow === "icon_sheet" ? "Generate DDS Bundle" : "Convert to DDS"}
				</button>
				{#if downloadUrl}
					<a class="dds-download" href={downloadUrl} download={downloadName}>Download {downloadName}</a>
				{/if}
			</div>

			{#if conversionMeta}
				<div class="dds-meta">
					<!-- <span>Input: {conversionMeta.sourceWidth}x{conversionMeta.sourceHeight}</span> -->
					{#if conversionMeta.outputWidth && conversionMeta.outputHeight}
						<span>Output: {conversionMeta.outputWidth}x{conversionMeta.outputHeight}</span>
					{/if}
					<!-- <span>Format: {conversionMeta.format}</span> -->
					{#if conversionMeta.bundleCount}
						<span>Sheets: {conversionMeta.bundleCount}</span>
					{/if}
					{#if conversionMeta.resampleMode}
						<span>Resample: {conversionMeta.resampleMode}</span>
					{/if}
					{#if conversionMeta.alphaAware}
						<span>Alpha-aware: {conversionMeta.alphaAware === "1" ? "on" : "off"}</span>
					{/if}
					{#if conversionMeta.preBlurAmount}
						<span>Pre-blur: {conversionMeta.preBlurAmount}</span>
					{/if}
					{#if conversionMeta.ditherAmount}
						<span>Dither: {conversionMeta.ditherAmount}</span>
					{/if}
					{#if conversionMeta.alphaSmoothAmount}
						<span>Alpha smooth: {conversionMeta.alphaSmoothAmount}</span>
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
					{#if conversionMeta.nativeOutputMode}
						<span>Native output: {conversionMeta.nativeOutputMode}</span>
					{/if}
					{#if conversionMeta.colorMetric}
						<span>Metric: {conversionMeta.colorMetric}</span>
					{/if}
					{#if conversionMeta.mipmapSizes}
						<span>MipMap sizes: {conversionMeta.mipmapSizes}</span>
					{/if}
					{#if conversionMeta.mipmapEnabled}
						<span>MipMaps: {conversionMeta.mipmapEnabled === "1" ? "enabled" : "disabled"}</span>
					{/if}
					{#if expectedDimensions && conversionMeta.outputWidth && conversionMeta.outputHeight && (Number(conversionMeta.outputWidth) > Number(expectedDimensions.width || 0) || Number(conversionMeta.outputHeight) > Number(expectedDimensions.height || 0))}
						<span>Sheet dimensions were upscaled to a multiple of 4.</span>
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
		inline-size: 100%;
		display: grid;
		gap: 1rem;
	}

	.dds-hero {
		background: var(--panel-bg);
	}

	.dds-panel {
		inline-size: 100%;
		display: grid;
		gap: 1rem;
		color: var(--ink);
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 1rem;
		background: var(--panel-bg);
		box-shadow: 0 8px 20px var(--shadow-soft);
		padding-block: 1.1rem;
		padding-inline: 1.1rem;

		& label {
			display: grid;
			gap: 0.15rem;
			font-size: 1rem;
		}

		& select,
		& input[type="file"],
		& input[type="text"],
		& input[type="number"] {
			min-block-size: 3ch;
			color: var(--ink);
			font-size: 0.95rem;
			background: var(--input-bg);
			border: 1px solid var(--panel-border);
			border-radius: 0.65rem;
			padding-block: 0.35rem;
			padding-inline: 0.65rem;
		}

		& input[readonly] {
			opacity: 0.8;
		}
	}

	.dds-section {
		inline-size: 100%;
		display: grid;
		gap: 0.75rem;
		border: 1px solid color-mix(in oklch, var(--accent) 16%, var(--panel-border));
		border-radius: 0.9rem;
		background: color-mix(in oklch, var(--panel-bg) 86%, var(--control-bg));
		padding-block: 0.8rem;
		padding-inline: 0.8rem;
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
		color: var(--muted-ink);
		font-size: 0.9rem;
		margin: 0;
	}

	.dds-form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.85rem;
	}

	.dds-file-dropzone {
		grid-column: 1 / -1;
		min-block-size: 150px;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 0.5rem;
		color: var(--ink);
		background: color-mix(in oklch, var(--accent) 8%, var(--control-bg));
		border: 2px dashed color-mix(in oklch, var(--accent) 35%, var(--panel-border));
		border-radius: 0.85rem;
		text-align: center;
		cursor: pointer;
		padding-block: 0.8rem;
		padding-inline: 0.8rem;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			transform 0.15s ease;

		&.is-drag-over {
			background: color-mix(in oklch, var(--accent) 18%, var(--control-bg));
			border-color: color-mix(in oklch, var(--accent) 62%, var(--panel-border));
			transform: translateY(-1px);
		}

		& input[type="file"] {
			display: none;
		}
	}

	.dds-file-dropzone-copy {
		color: var(--muted-ink);
		font-size: 1.05rem;
	}

	.dds-file-preview {
		inline-size: min(320px, 100%);
		block-size: auto;
		object-fit: contain;
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 0.65rem;
		margin-block-start: 0.5rem;
	}

	.atlas-size-block {
		grid-column: 1 / -1;
		min-inline-size: 30rem;
		inline-size: fit-content;
		display: grid;
		gap: 0.6rem;
		color: var(--ink);
		background: var(--control-bg);
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 0.75rem;
		padding-block: 0.65rem;
		padding-inline: 0.65rem;
	}

	.atlas-size-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		color: var(--ink);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.atlas-size-actions {
		display: inline-flex;
		gap: 0.5rem;

		> button {
			min-inline-size: 4rem;
		}
	}

	.tiny-action {
		color: var(--ink);
		font-size: 0.78rem;
		background: var(--panel-bg);
		border: 1px solid color-mix(in oklch, var(--accent) 30%, var(--panel-border));
		border-radius: 0.5rem;
		padding-block: 0.2rem;
		padding-inline: 0.45rem;
		cursor: pointer;
	}

	.atlas-size-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4rem, 1fr));
		gap: 0.35rem;
	}

	.atlas-size-grid > .atlas-size-check {
		inline-size: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--ink);
		font-size: 0.85rem;
	}

	.atlas-size-grid > .atlas-size-check input[type="checkbox"] {
		inline-size: auto;
		padding-block: 0;
		padding-inline: 0;
	}

	.dds-actions {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-wrap: wrap;
	}

	.dds-actions button,
	.dds-download {
		color: var(--ink);
		text-decoration: none;
		background: var(--control-bg);
		border: 1px solid color-mix(in oklch, var(--accent) 30%, var(--panel-border));
		border-radius: 0.65rem;
		padding-block: 0.54rem;
		padding-inline: 0.82rem;
	}

	.dds-actions button {
		cursor: pointer;

		&:disabled {
			opacity: 0.55;
			cursor: not-allowed;
		}
	}

	.dds-download {
		background: color-mix(in oklch, var(--accent) 12%, var(--control-bg));
	}

	.dds-meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;

		& span {
			font-size: 0.85rem;
			color: var(--ink);
			background: var(--control-bg);
			border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
			border-radius: 0.55rem;
			padding-block: 0.34rem;
			padding-inline: 0.5rem;
		}
	}

	.dds-warning {
		color: var(--ink);
		font-size: 0.9rem;
		background: color-mix(in oklch, oklch(0.93 0.08 100) 35%, var(--control-bg));
		border: 1px solid color-mix(in oklch, oklch(0.9 0.15 95) 50%, var(--panel-border));
		border-radius: 0.65rem;
		padding-block: 0.55rem;
		padding-inline: 0.65rem;
		margin: 0;
	}

	.dds-preview-block {
		display: grid;
		gap: 0.6rem;
		color: var(--ink);
		background: var(--control-bg);
		inline-size: 100%;
		max-inline-size: 100%;
		overflow: hidden;
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 0.75rem;
		padding-block: 0.65rem;
		padding-inline: 0.65rem;

		input {
			min-inline-size: 12rem;
			inline-size: fit-content;
			field-sizing: content;
		}
	}

	.dds-preview-list-wrap {
		display: grid;
		gap: 0.35rem;
	}

	.dds-preview-title {
		color: var(--muted-ink);
		font-size: 0.86rem;
		margin: 0;
	}

	.dds-preview-list {
		display: grid;
		gap: 0.2rem;
		font-size: 0.86rem;
		padding-inline-start: 1rem;
		margin: 0;
	}

	.dds-preview-empty {
		color: var(--muted-ink);
		font-size: 0.86rem;
		margin: 0;
	}

	.dds-sql-textarea {
		inline-size: 100%;
		block-size: auto;
		max-inline-size: 100%;
		resize: vertical;
		color: var(--ink);
		font-family: "Courier New", "SFMono-Regular", Menlo, monospace;
		font-size: 0.8rem;
		background: var(--input-bg);
		border: 1px solid var(--panel-border);
		border-radius: 0.65rem;
		padding-block: 0.6rem;
		padding-inline: 0.7rem;
	}

	.danger-action {
		border-color: color-mix(in oklch, oklch(0.72 0.2 25) 50%, var(--panel-border)) !important;
	}

	.dds-status {
		font-size: 0.92rem;
		margin: 0;
	}

	.dds-error {
		color: oklch(0.72 0.17 23);
	}

	.dds-success {
		color: oklch(0.82 0.14 145);
	}
</style>
