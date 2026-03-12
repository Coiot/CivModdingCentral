<script>
	import { onDestroy, onMount, tick } from "svelte";
	import { parseHexInput as parseHexInputUtil, sanitizeHexColor as sanitizeHexColorUtil } from "../map/pins.js";
	import { syncCivIconPreferences } from "../stores/toolPreferences.js";

	const OUTPUT_SIZE = 256;
	const PREVIEW_SIZE = 768;
	const CENTER = OUTPUT_SIZE / 2;
	const INNER_DIAMETER = 172;
	const INNER_RADIUS = INNER_DIAMETER / 2;
	const RENDER_SCALE = 16;
	const RENDER_SIZE = OUTPUT_SIZE * RENDER_SCALE;
	const RENDER_CENTER = CENTER * RENDER_SCALE;
	const RENDER_INNER_RADIUS = INNER_RADIUS * RENDER_SCALE;
	const SWIATLO_SCALE = 1.0025;
	const SWIATLO_OFFSET_X = 0.65;
	const SWIATLO_OFFSET_Y = -0.25;
	const SWIATLO_PIXEL_SNAP = true;
	const SWIATLO_SHARPEN_CONTRAST = 1.1;
	const FIT_GUARD_PX = 15;
	const FIT_DIAMETER = Math.max(1, INNER_DIAMETER - FIT_GUARD_PX * 2);
	const CIRCLE_EDGE_AA_PX = 1;
	const ALPHA_BOUNDS_MIN_ALPHA = 8;
	const STABLE_FILTER_STEP_PX = 1;
	const STABLE_OFFSET_STEP_PX = 1;
	const ICON_EFFECT_FORCE_SOURCE_OVER_BLEND = false;
	const CANVAS_COLOR_SPACE = "srgb";
	const MIN_OFFSET = -25;
	const MAX_OFFSET = 25;
	const DEFAULT_PRIMARY_COLOR = "#1F4F99";
	const DEFAULT_ICON_COLOR = "#F4DE9A";
	const COLOR_PICKER_DEBOUNCE_MS = 180;
	const INTERACTION_SETTLE_MS = 180;
	const STATE_PERSIST_DEBOUNCE_MS = 220;
	const RENDER_PERF_HISTORY_LIMIT = 12;
	const REDUCED_BEVEL_HIGHLIGHT_OPACITY_MULTIPLIER = 0.5;
	const SAFARI_CORE_SHADOW_OPACITY_MULTIPLIER = 1.75;
	const SAFARI_CORE_SHADOW_DISTANCE_MULTIPLIER = 0.7;
	const SAFARI_SHADOW_OPACITY_MULTIPLIER = 1.5;
	const SAFARI_SHADOW_BLUR_MULTIPLIER = 5;
	const SAFARI_SHADOW_DISTANCE_MULTIPLIER = 1.2;
	const SAFARI_FALLOFF_SHADOW_DISTANCE_MULTIPLIER = 1.5;
	const SAFARI_SHADOW_FALLOFF_OPACITY_MULTIPLIER = 1.95;
	const SAFARI_SHADOW_FALLOFF_BLUR_MULTIPLIER = 3;
	const SAFARI_SHADOW_PUNCHOUT_BLUR_MULTIPLIER = 0.55;
	const SETTINGS_STORAGE_KEY = "cmc:civ-icon-maker:settings:v2";
	const SOURCE_STORAGE_KEY = "cmc:civ-icon-maker:source:v2";
	const LEGACY_STORAGE_KEY = "cmc:civ-icon-maker:v1";
	const STORAGE_VERSION = 2;
	const ICON_EFFECT_SETTINGS = {
		outerShadow: {
			enabled: true,
			color: "#000000",
			opacity: 0.4,
			blur: 0.25,
			distance: 1.75,
			angleDeg: 300,
			coreBlendMode: "multiply",
			coreOpacity: 0.45,
			coreBlurMultiplier: 1,
			falloffBlendMode: "overlay",
			falloffOpacity: 0.3,
			falloffBlurMultiplier: 0.25,
			falloffDistanceMultiplier: 1.1,
		},
		bevel: {
			enabled: true,
			angleDeg: 285,
			highlight: {
				color: "#ffffff",
				opacity: 0.925,
				distance: 0.9,
				samples: 16,
				soften: 0.5,
				blendMode: "source-over",
			},
			shadow: {
				color: "#000000",
				opacity: 0.36,
				distance: 0.85,
				samples: 16,
				blendMode: "source-over",
			},
		},
	};
	const ICON_EDGE_SOFTEN_PX = 1;
	const SWIATLO_LAYER_DEFS = [
		{ id: "blik", label: "Top Glint", file: "blik.png", blendMode: "source-over", opacity: 1 },
		{ id: "overlay_flash_3", label: "Arc Highlight", file: "overlay flash 3.png", blendMode: "screen", opacity: 1 },
		{ id: "overlay_flash_2", label: "Main Flash", file: "overlay flash 2.png", blendMode: "overlay", opacity: 1 },
		{ id: "overlay_flash_copy", label: "Upper Sweep", file: "overlay flash copy.png", blendMode: "overlay", opacity: 1 },
		{ id: "overlay_flash_copy_2", label: "Lower Sweep", file: "overlay flash copy 2.png", blendMode: "soft-light", opacity: 1 },
		{ id: "overlay_flash", label: "Soft Flash", file: "overlay flash.png", blendMode: "hard-light", opacity: 1 },
		{ id: "overlay_light_2", label: "Crown Glow", file: "overlay light 2.png", blendMode: "hard-light", opacity: 0.8 },
		{ id: "overlay_light", label: "Face Glow", file: "overlay light.png", blendMode: "overlay", opacity: 0.75 },
		{ id: "overlay_shadow_2", label: "Edge Shade", file: "overlay shadow 2.png", blendMode: "soft-light", opacity: 1 },
		{ id: "overlay_blue", label: "Cyan Shade", file: "overlay blue.png", blendMode: "hard-light", opacity: 1 },
		{
			id: "overlay_shadow_copy_2_kopia",
			label: "Mid Shade",
			file: "overlay shadow copy 2 kopia.png",
			blendMode: "soft-light",
			opacity: 1,
		},
		{ id: "overlay_shadow_copy_2", label: "Deep Rim Shade", file: "overlay shadow copy 2.png", blendMode: "soft-light", opacity: 1 },
		{ id: "overlay_shadow_copy", label: "Inner Shade", file: "overlay shadow copy.png", blendMode: "soft-light", opacity: 1 },
		{ id: "overlay_shadow", label: "Weak Shade", file: "overlay shadow.png", blendMode: "hard-light", opacity: 1 },
	];
	const SWIATLO_PRESETS = [
		{
			id: "auto_flash_2",
			label: "Standard",
			selectedLayerId: "overlay_flash_2",
			visibility: {
				blik: true,
				overlay_flash_3: false,
				overlay_flash_2: true,
				overlay_flash_copy: false,
				overlay_flash_copy_2: false,
				overlay_flash: false,
				overlay_light_2: true,
				overlay_light: true,
				overlay_shadow_2: false,
				overlay_blue: false,
				overlay_shadow_copy_2_kopia: false,
				overlay_shadow_copy_2: true,
				overlay_shadow_copy: true,
				overlay_shadow: false,
			},
		},
		{
			id: "auto_flash_2_blue",
			label: "Blue Shade",
			selectedLayerId: "overlay_blue",
			visibility: {
				blik: true,
				overlay_flash_3: false,
				overlay_flash_2: true,
				overlay_flash_copy: false,
				overlay_flash_copy_2: false,
				overlay_flash: false,
				overlay_light_2: true,
				overlay_light: true,
				overlay_shadow_2: false,
				overlay_blue: true,
				overlay_shadow_copy_2_kopia: false,
				overlay_shadow_copy_2: false,
				overlay_shadow_copy: false,
				overlay_shadow: false,
			},
		},
		{
			id: "soft_badge",
			label: "Soft Badge",
			selectedLayerId: "overlay_light",
			visibility: {
				blik: true,
				overlay_flash_3: false,
				overlay_flash_2: false,
				overlay_flash_copy: false,
				overlay_flash_copy_2: false,
				overlay_flash: false,
				overlay_light_2: true,
				overlay_light: true,
				overlay_shadow_2: false,
				overlay_blue: false,
				overlay_shadow_copy_2_kopia: false,
				overlay_shadow_copy_2: true,
				overlay_shadow_copy: false,
				overlay_shadow: false,
			},
		},
	];
	const DEFAULT_SWIATLO_PRESET_ID = "auto_flash_2";
	const DEFAULT_SWIATLO_ACTIVE_LAYER_ID = "overlay_flash_2";

	let renderCanvas = null;
	let effectCanvasA = null;
	let effectCanvasB = null;
	let effectCanvasC = null;
	let circleEdgeMaskCanvas = null;
	let tintVersionCounter = 0;
	let tintedColorCache = new Map();
	let scaledTintCache = new Map();
	let swiatloImageCache = new Map();
	let swiatloProcessedCache = new Map();
	let swiatloAssetsVersion = $state(0);

	let sourceName = $state("");
	let sourceUrl = $state("");
	let sourceCanvas = $state(null);
	let tintedCanvas = $state(null);
	let tintVersion = $state(0);
	let alphaBounds = $state(null);

	let previewCanvasEl = $state();
	let compareCanvasEl = $state();
	let outputCanvasEl = $state();

	let isDragOver = $state(false);
	let isDragging = $state(false);
	let dragPointerId = $state(-1);
	let dragLastClientX = $state(0);
	let dragLastClientY = $state(0);

	let primaryColor = $state(DEFAULT_PRIMARY_COLOR);
	let iconColor = $state(DEFAULT_ICON_COLOR);
	let primaryColorHexInput = $state(DEFAULT_PRIMARY_COLOR);
	let iconColorHexInput = $state(DEFAULT_ICON_COLOR);

	let iconOffsetX = $state(0);
	let iconOffsetY = $state(0);
	let iconScale = $state(1);
	let minScale = $state(0.05);
	let maxScale = $state(2);
	let swiatloEnabled = $state(true);
	let swiatloPresetId = $state(DEFAULT_SWIATLO_PRESET_ID);
	let swiatloActiveLayerId = $state(DEFAULT_SWIATLO_ACTIVE_LAYER_ID);
	let swiatloLayerVisibility = $state(normalizeSwiatloVisibility({}, DEFAULT_SWIATLO_PRESET_ID));

	let statusMessage = $state("");
	let errorMessage = $state("");
	let persistedSourceDataUrl = $state("");
	let storageReady = $state(false);
	let skipPersist = false;
	let suggestionBasePrimary = $state(DEFAULT_PRIMARY_COLOR);
	let suggestionBaseIcon = $state(DEFAULT_ICON_COLOR);
	let suggestionBaseLocked = $state(false);
	let suggestionLockHue = $state(false);
	let suggestionLockSaturation = $state(false);
	let suggestionGeneratedCount = $state(3);
	let suggestionSeed = $state(1);
	let compareEnabled = $state(false);
	let compareReference = $state(null);
	let historyEntries = $state([]);
	let redoEntries = $state([]);
	let historyBaselineSignature = "";
	let historyBaselineSnapshot = null;
	let historySuspended = false;
	let primaryColorPickerDebounceId = 0;
	let iconColorPickerDebounceId = 0;
	let interactionPreviewTimeoutId = 0;
	let persistStateTimeoutId = 0;
	let historyCommitTimeoutId = 0;
	let renderFrameId = 0;
	let pendingRenderOutput = false;
	let pendingRenderCompare = false;
	let pendingFastPreview = false;
	let interactivePreviewMode = $state(false);
	let renderBusy = $state(false);
	let renderBusyLabel = $state("");
	let exportBusy = $state(false);
	let usesReducedBevelHighlightOpacity = false;
	let isSafariShadowProfile = $state(false);
	let comparePreviewSignature = "";
	let comparePreviewSourceCanvas = null;
	let compositeRenderSignature = "";
	let compositeRenderSourceCanvas = null;
	let perfInstrumentationEnabled = $state(false);
	let renderPerfSamples = $state([]);

	const hasSource = $derived(Boolean(sourceCanvas));
	const sourceWidth = $derived(sourceCanvas?.width || 0);
	const sourceHeight = $derived(sourceCanvas?.height || 0);
	const alphaPixelWidth = $derived(alphaBounds?.width || 0);
	const alphaPixelHeight = $derived(alphaBounds?.height || 0);
	const outputName = $derived(buildOutputName(sourceName));
	const primaryColorDisplay = $derived(formatColorDisplay(primaryColor, DEFAULT_PRIMARY_COLOR));
	const iconColorDisplay = $derived(formatColorDisplay(iconColor, DEFAULT_ICON_COLOR));
	const colorLegibilityWarning = $derived(buildColorLegibilityWarning(primaryColor, iconColor));
	const canUndo = $derived(historyEntries.length > 0);
	const canRedo = $derived(redoEntries.length > 0);
	const activityMessage = $derived(exportBusy ? "Exporting PNG..." : renderBusy ? renderBusyLabel || "Loading effects..." : "");
	const latestRenderPerfSample = $derived(renderPerfSamples[renderPerfSamples.length - 1] || null);
	const latestRenderPerfStageRows = $derived.by(() => (latestRenderPerfSample ? buildRenderPerfStageRows(latestRenderPerfSample) : []));
	const latestRenderPerfOverlayRows = $derived.by(() => (latestRenderPerfSample ? buildRenderPerfOverlayRows(latestRenderPerfSample) : []));
	const suggestedColorSchemes = $derived(
		buildColorSuggestions(primaryColor, iconColor, suggestionBaseLocked ? suggestionBasePrimary : primaryColor, suggestionBaseLocked ? suggestionBaseIcon : iconColor, {
			lockHue: suggestionLockHue,
			lockSaturation: suggestionLockSaturation,
			generatedCount: suggestionGeneratedCount,
			seed: suggestionSeed,
		}).map((scheme) => ({
			...scheme,
			primaryDisplay: formatColorDisplay(scheme.primary, DEFAULT_PRIMARY_COLOR),
			iconDisplay: formatColorDisplay(scheme.icon, DEFAULT_ICON_COLOR),
		})),
	);

	$effect(() => {
		sourceCanvas;
		iconColor;
		refreshTintedCanvas();
	});

	$effect(() => {
		previewCanvasEl;
		compareCanvasEl;
		tintedCanvas;
		tintVersion;
		sourceCanvas;
		primaryColor;
		iconOffsetX;
		iconOffsetY;
		iconScale;
		swiatloEnabled;
		swiatloLayerVisibility;
		swiatloAssetsVersion;
		compareEnabled;
		compareReference;
		isDragging;
		interactivePreviewMode;
		const previewOnly = isDragging || interactivePreviewMode;
		scheduleCanvasRender({
			includeOutput: false,
			includeCompare: !previewOnly,
			fastPreview: previewOnly,
			label: isDragging ? "Updating position..." : previewOnly ? "Applying changes..." : "Loading effects...",
		});
	});

	$effect(() => {
		primaryColor;
		iconColor;
		iconOffsetX;
		iconOffsetY;
		iconScale;
		sourceName;
		swiatloEnabled;
		swiatloPresetId;
		swiatloActiveLayerId;
		swiatloLayerVisibility;
		suggestionBasePrimary;
		suggestionBaseIcon;
		suggestionBaseLocked;
		suggestionLockHue;
		suggestionLockSaturation;
		suggestionGeneratedCount;
		suggestionSeed;
		compareEnabled;
		compareReference;
		if (!storageReady) {
			return;
		}
		if (skipPersist) {
			skipPersist = false;
			return;
		}
		schedulePersistState();
		return () => {
			clearPersistStateTimeout();
		};
	});

	$effect(() => {
		hasSource;
		historySuspended;
		interactivePreviewMode;
		primaryColor;
		iconColor;
		iconOffsetX;
		iconOffsetY;
		iconScale;
		swiatloEnabled;
		swiatloPresetId;
		swiatloActiveLayerId;
		swiatloLayerVisibility;
		if (!hasSource || historySuspended) {
			return;
		}
		if (interactivePreviewMode) {
			scheduleHistoryCheckpoint();
			return () => {
				clearHistoryCommitTimeout();
			};
		}
		commitHistoryCheckpoint();
	});

	$effect(() => {
		primaryColor;
		iconColor;
		syncCivIconPreferences({
			primaryColor: sanitizeHexColor(primaryColor, DEFAULT_PRIMARY_COLOR),
			iconColor: sanitizeHexColor(iconColor, DEFAULT_ICON_COLOR),
		});
	});

	onMount(() => {
		const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
		usesReducedBevelHighlightOpacity = /firefox|chrom(e|ium)|edg|opr/i.test(userAgent);
		isSafariShadowProfile = /safari/i.test(userAgent) && !/firefox|chrom(e|ium)|edg|opr/i.test(userAgent);
		void restorePersistedState();
		primeSwiatloAssets();
	});

	onDestroy(() => {
		if (primaryColorPickerDebounceId) {
			clearTimeout(primaryColorPickerDebounceId);
		}
		if (iconColorPickerDebounceId) {
			clearTimeout(iconColorPickerDebounceId);
		}
		clearInteractionPreviewTimeout();
		clearPersistStateTimeout();
		clearHistoryCommitTimeout();
		if (storageReady && !skipPersist) {
			persistState();
		}
		if (renderFrameId) {
			cancelAnimationFrame(renderFrameId);
		}
		revokeSourceUrl();
	});

	function buildOutputName(filename) {
		const base =
			String(filename || "civ_icon")
				.replace(/\\/g, "/")
				.split("/")
				.pop()
				?.replace(/\.[^.]+$/, "") || "civ_icon";
		return `${base}_civ5_icon_256.png`;
	}

	function parseNumber(value, fallback = 0) {
		const next = Number.parseFloat(String(value || "").trim());
		if (!Number.isFinite(next)) {
			return fallback;
		}
		return next;
	}

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function quantize(value, step = 1, fallback = 0) {
		const next = Number(value);
		if (!Number.isFinite(next)) {
			return fallback;
		}
		if (!Number.isFinite(step) || step <= 0) {
			return next;
		}
		return Math.round(next / step) * step;
	}

	function toStableOffsetPx(value) {
		return quantize(value, STABLE_OFFSET_STEP_PX, 0);
	}

	function toStableBlurPx(value) {
		return Math.max(0, quantize(value, STABLE_FILTER_STEP_PX, 0));
	}

	function blurFilter(valuePx) {
		const stable = toStableBlurPx(valuePx);
		return stable > 0 ? `blur(${stable}px)` : "none";
	}

	function resolveIconBlendMode(mode) {
		if (ICON_EFFECT_FORCE_SOURCE_OVER_BLEND) {
			return "source-over";
		}
		return mode || "source-over";
	}

	function clampScale(value) {
		const next = Number.parseFloat(String(value || 0));
		if (!Number.isFinite(next)) {
			return minScale;
		}
		return clamp(next, minScale, maxScale);
	}

	function clampOffset(value, fallback = 0) {
		const next = parseNumber(value, fallback);
		return clamp(next, MIN_OFFSET, MAX_OFFSET);
	}

	function resolveSwiatloPreset(presetId) {
		return SWIATLO_PRESETS.find((preset) => preset.id === presetId) || SWIATLO_PRESETS[0];
	}

	function normalizeSwiatloVisibility(input, presetId) {
		const preset = resolveSwiatloPreset(presetId);
		const next = {};
		for (const layer of SWIATLO_LAYER_DEFS) {
			const fallback = Boolean(preset.visibility?.[layer.id]);
			next[layer.id] = typeof input?.[layer.id] === "boolean" ? input[layer.id] : fallback;
		}
		return next;
	}

	function isSwiatloLayerVisible(layerId) {
		return Boolean(swiatloLayerVisibility?.[layerId]);
	}

	function selectSwiatloLayer(layerId) {
		swiatloActiveLayerId = layerId;
	}

	function toggleSwiatloLayer(layerId) {
		swiatloLayerVisibility = {
			...swiatloLayerVisibility,
			[layerId]: !isSwiatloLayerVisible(layerId),
		};
	}

	function applySwiatloPreset(presetId) {
		const preset = resolveSwiatloPreset(presetId);
		swiatloPresetId = preset.id;
		swiatloActiveLayerId = preset.selectedLayerId;
		swiatloLayerVisibility = normalizeSwiatloVisibility(preset.visibility, preset.id);
		resetMessages();
		statusMessage = `Applied Light preset: ${preset.label}.`;
	}

	function swiatloThumbStyle(layerId) {
		const layer = SWIATLO_LAYER_DEFS.find((entry) => entry.id === layerId);
		if (!layer) {
			return "background: radial-gradient(ellipse at 30% 12%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%);";
		}
		const path = swiatloAssetPath(layer.file);
		return `background-image: url(\"${path}\"); background-size: cover; background-position: center;`;
	}

	function sanitizeHexColor(color, fallback) {
		return sanitizeHexColorUtil(color, fallback).toLowerCase();
	}

	function parseHexInput(value) {
		const parsed = parseHexInputUtil(value);
		return parsed ? parsed.toLowerCase() : null;
	}

	function createEditorSnapshot() {
		return {
			primaryColor: sanitizeHexColor(primaryColor, DEFAULT_PRIMARY_COLOR),
			iconColor: sanitizeHexColor(iconColor, DEFAULT_ICON_COLOR),
			iconOffsetX: clampOffset(iconOffsetX, 0),
			iconOffsetY: clampOffset(iconOffsetY, 0),
			iconScale: clampScale(iconScale),
			swiatloEnabled: Boolean(swiatloEnabled),
			swiatloPresetId: resolveSwiatloPreset(swiatloPresetId).id,
			swiatloActiveLayerId,
			swiatloLayerVisibility: normalizeSwiatloVisibility(swiatloLayerVisibility, swiatloPresetId),
		};
	}

	function buildSnapshotSignature(snapshot) {
		return JSON.stringify(snapshot);
	}

	function resetHistoryTracking() {
		clearHistoryCommitTimeout();
		historyEntries = [];
		redoEntries = [];
		historyBaselineSignature = "";
		historyBaselineSnapshot = null;
	}

	function syncHistoryBaselineToCurrent() {
		if (!hasSource) {
			resetHistoryTracking();
			return;
		}
		clearHistoryCommitTimeout();
		const snapshot = createEditorSnapshot();
		historyBaselineSnapshot = snapshot;
		historyBaselineSignature = buildSnapshotSignature(snapshot);
	}

	function commitHistoryCheckpoint() {
		if (!hasSource || historySuspended) {
			return;
		}
		const snapshot = createEditorSnapshot();
		const signature = buildSnapshotSignature(snapshot);
		if (!historyBaselineSignature) {
			historyBaselineSignature = signature;
			historyBaselineSnapshot = snapshot;
			return;
		}
		if (signature === historyBaselineSignature) {
			return;
		}
		historyEntries = [...historyEntries, historyBaselineSnapshot].slice(-5);
		redoEntries = [];
		historyBaselineSignature = signature;
		historyBaselineSnapshot = snapshot;
	}

	function applyEditorSnapshot(snapshot, message) {
		if (!snapshot) {
			return;
		}
		historySuspended = true;
		try {
			const nextPrimary = sanitizeHexColor(snapshot.primaryColor, DEFAULT_PRIMARY_COLOR);
			const nextIcon = sanitizeHexColor(snapshot.iconColor, DEFAULT_ICON_COLOR);
			primaryColor = nextPrimary;
			iconColor = nextIcon;
			primaryColorHexInput = nextPrimary;
			iconColorHexInput = nextIcon;
			iconOffsetX = clampOffset(snapshot.iconOffsetX, 0);
			iconOffsetY = clampOffset(snapshot.iconOffsetY, 0);
			iconScale = clampScale(snapshot.iconScale);
			swiatloEnabled = snapshot.swiatloEnabled !== false;
			swiatloPresetId = resolveSwiatloPreset(snapshot.swiatloPresetId).id;
			swiatloActiveLayerId = SWIATLO_LAYER_DEFS.some((layer) => layer.id === snapshot.swiatloActiveLayerId)
				? snapshot.swiatloActiveLayerId
				: resolveSwiatloPreset(swiatloPresetId).selectedLayerId;
			swiatloLayerVisibility = normalizeSwiatloVisibility(snapshot.swiatloLayerVisibility, swiatloPresetId);
		} finally {
			historySuspended = false;
		}
		syncHistoryBaselineToCurrent();
		resetMessages();
		statusMessage = message;
	}

	function undoChange() {
		if (!historyEntries.length) {
			return;
		}
		const previous = historyEntries[historyEntries.length - 1];
		const current = createEditorSnapshot();
		historyEntries = historyEntries.slice(0, -1);
		redoEntries = [...redoEntries, current].slice(-5);
		applyEditorSnapshot(previous, "Undid last change.");
	}

	function redoChange() {
		if (!redoEntries.length) {
			return;
		}
		const next = redoEntries[redoEntries.length - 1];
		const current = createEditorSnapshot();
		redoEntries = redoEntries.slice(0, -1);
		historyEntries = [...historyEntries, current].slice(-5);
		applyEditorSnapshot(next, "Redid change.");
	}

	function captureCompareReference() {
		compareReference = createEditorSnapshot();
		comparePreviewSignature = "";
		resetMessages();
		statusMessage = "Captured compare reference.";
	}

	function onCompareToggle(checked) {
		compareEnabled = checked;
		if (checked && !compareReference) {
			compareReference = createEditorSnapshot();
		}
	}

	function persistSourceState() {
		try {
			if (!persistedSourceDataUrl) {
				localStorage.removeItem(SOURCE_STORAGE_KEY);
				return;
			}
			localStorage.setItem(
				SOURCE_STORAGE_KEY,
				JSON.stringify({
					version: STORAGE_VERSION,
					sourceName,
					sourceDataUrl: persistedSourceDataUrl,
				}),
			);
		} catch {
			// Ignore localStorage write failures.
		}
	}

	function persistState() {
		const normalizedCompareReference = compareReference
			? {
					...compareReference,
					swiatloLayerVisibility: normalizeSwiatloVisibility(compareReference.swiatloLayerVisibility, compareReference.swiatloPresetId),
				}
			: null;
		const payload = {
			version: STORAGE_VERSION,
			primaryColor: sanitizeHexColor(primaryColor, DEFAULT_PRIMARY_COLOR),
			iconColor: sanitizeHexColor(iconColor, DEFAULT_ICON_COLOR),
			iconOffsetX: clampOffset(iconOffsetX, 0),
			iconOffsetY: clampOffset(iconOffsetY, 0),
			iconScale: clampScale(iconScale),
			swiatloEnabled: Boolean(swiatloEnabled),
			swiatloPresetId,
			swiatloActiveLayerId,
			swiatloLayerVisibility: normalizeSwiatloVisibility(swiatloLayerVisibility, swiatloPresetId),
			suggestionBasePrimary,
			suggestionBaseIcon,
			suggestionBaseLocked: Boolean(suggestionBaseLocked),
			suggestionLockHue: Boolean(suggestionLockHue),
			suggestionLockSaturation: Boolean(suggestionLockSaturation),
			suggestionGeneratedCount: clamp(Math.round(suggestionGeneratedCount), 0, 24),
			suggestionSeed: Math.max(1, Math.round(suggestionSeed || 1)),
			compareEnabled: Boolean(compareEnabled),
			compareReference: normalizedCompareReference,
		};
		try {
			localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
		} catch {
			// Ignore localStorage write failures.
		}
	}

	function clearPersistStateTimeout() {
		if (persistStateTimeoutId) {
			clearTimeout(persistStateTimeoutId);
			persistStateTimeoutId = 0;
		}
	}

	function schedulePersistState() {
		clearPersistStateTimeout();
		persistStateTimeoutId = setTimeout(() => {
			persistStateTimeoutId = 0;
			persistState();
		}, STATE_PERSIST_DEBOUNCE_MS);
	}

	function clearHistoryCommitTimeout() {
		if (historyCommitTimeoutId) {
			clearTimeout(historyCommitTimeoutId);
			historyCommitTimeoutId = 0;
		}
	}

	function scheduleHistoryCheckpoint() {
		clearHistoryCommitTimeout();
		historyCommitTimeoutId = setTimeout(() => {
			historyCommitTimeoutId = 0;
			commitHistoryCheckpoint();
		}, INTERACTION_SETTLE_MS);
	}

	function readPerfNow() {
		if (typeof performance !== "undefined" && typeof performance.now === "function") {
			return performance.now();
		}
		return Date.now();
	}

	function recordRenderPerfSample(sample) {
		if (!perfInstrumentationEnabled || !sample) {
			return;
		}
		renderPerfSamples = [...renderPerfSamples, sample].slice(-RENDER_PERF_HISTORY_LIMIT);
	}

	function clearRenderPerfSamples() {
		renderPerfSamples = [];
	}

	function formatTimingMs(value) {
		const normalized = Number.isFinite(value) ? value : 0;
		return `${normalized.toFixed(normalized >= 10 ? 1 : 2)} ms`;
	}

	function buildRenderPerfStageRows(sample) {
		return Object.entries(sample?.stages || {})
			.map(([id, durationMs]) => ({
				id,
				label:
					{
						fillBase: "Fill base",
						rasterizeIcon: "Rasterize icon",
						outerShadow: "Outer shadow",
						iconBase: "Icon base",
						bevel: "Bevel",
						swiatloOverlays: "Light overlays",
						edgeAA: "Edge AA",
						present: "Present",
						guides: "Guides",
					}[id] || id,
				durationMs,
			}))
			.filter((row) => row.durationMs > 0)
			.sort((left, right) => right.durationMs - left.durationMs);
	}

	function buildRenderPerfOverlayRows(sample) {
		return [...(sample?.overlayStages || [])].sort((left, right) => right.durationMs - left.durationMs);
	}

	function onPerfInstrumentationToggle(checked) {
		perfInstrumentationEnabled = checked;
		if (!checked) {
			clearRenderPerfSamples();
		}
	}

	async function restorePersistedState() {
		try {
			const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
			const legacyRaw = raw ? "" : localStorage.getItem(LEGACY_STORAGE_KEY);
			const sourceRaw = localStorage.getItem(SOURCE_STORAGE_KEY);
			const payload = raw ? JSON.parse(raw) : legacyRaw ? JSON.parse(legacyRaw) : null;
			const isLegacyPayload = !raw && Boolean(legacyRaw);
			if (payload && typeof payload === "object" && (isLegacyPayload || payload.version === STORAGE_VERSION)) {
				primaryColor = sanitizeHexColor(payload.primaryColor, DEFAULT_PRIMARY_COLOR);
				iconColor = sanitizeHexColor(payload.iconColor, DEFAULT_ICON_COLOR);
				primaryColorHexInput = primaryColor;
				iconColorHexInput = iconColor;
				iconOffsetX = clampOffset(payload.iconOffsetX, 0);
				iconOffsetY = clampOffset(payload.iconOffsetY, 0);
				iconScale = clampScale(payload.iconScale);
				swiatloEnabled = payload.swiatloEnabled !== false;
				swiatloPresetId = resolveSwiatloPreset(payload.swiatloPresetId).id;
				swiatloActiveLayerId = SWIATLO_LAYER_DEFS.some((layer) => layer.id === payload.swiatloActiveLayerId)
					? payload.swiatloActiveLayerId
					: resolveSwiatloPreset(swiatloPresetId).selectedLayerId;
				swiatloLayerVisibility = normalizeSwiatloVisibility(payload.swiatloLayerVisibility, swiatloPresetId);
				suggestionBasePrimary = sanitizeHexColor(payload.suggestionBasePrimary, primaryColor);
				suggestionBaseIcon = sanitizeHexColor(payload.suggestionBaseIcon, iconColor);
				suggestionBaseLocked = payload.suggestionBaseLocked === true;
				suggestionLockHue = payload.suggestionLockHue === true;
				suggestionLockSaturation = payload.suggestionLockSaturation === true;
				suggestionGeneratedCount = clamp(parseNumber(payload.suggestionGeneratedCount, 3), 0, 24);
				suggestionSeed = Math.max(1, Math.round(parseNumber(payload.suggestionSeed, 1)));
				compareEnabled = payload.compareEnabled === true;
				compareReference = payload.compareReference && typeof payload.compareReference === "object" ? payload.compareReference : null;
			}

			const sourcePayload = sourceRaw ? JSON.parse(sourceRaw) : null;
			const storedDataUrl = typeof sourcePayload?.sourceDataUrl === "string" ? sourcePayload.sourceDataUrl : typeof payload?.sourceDataUrl === "string" ? payload.sourceDataUrl : "";
			const storedName = typeof sourcePayload?.sourceName === "string" ? sourcePayload.sourceName : typeof payload?.sourceName === "string" ? payload.sourceName : "";
			if (storedDataUrl) {
				const image = await loadImage(storedDataUrl);
				const restoredCanvas = buildCanvasFromImage(image);
				const restoredBounds = computeAlphaBounds(restoredCanvas);
				if (restoredBounds) {
					clearTintCache();
					sourceName = storedName || "restored_icon.png";
					sourceCanvas = restoredCanvas;
					alphaBounds = restoredBounds;
					persistedSourceDataUrl = storedDataUrl;
					captureSuggestionBase();
					if (!compareReference) {
						compareReference = createEditorSnapshot();
					}
					syncHistoryBaselineToCurrent();
					statusMessage = "Restored saved icon session.";
					if (!sourceRaw) {
						persistSourceState();
					}
				}
			}
		} catch {
			// Ignore bad saved data.
		} finally {
			storageReady = true;
		}
	}

	function buildCanvasFromImage(image) {
		const nextCanvas = document.createElement("canvas");
		nextCanvas.width = image.naturalWidth;
		nextCanvas.height = image.naturalHeight;
		const nextCtx = getCanvas2dContext(nextCanvas, { willReadFrequently: true });
		if (!nextCtx) {
			throw new Error("Unable to initialize PNG canvas.");
		}
		nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
		nextCtx.drawImage(image, 0, 0);
		return nextCanvas;
	}

	function clearTintCache() {
		tintedColorCache.clear();
		scaledTintCache.clear();
		resetCompositeRenderCache();
	}

	function resetCompositeRenderCache() {
		compositeRenderSignature = "";
		compositeRenderSourceCanvas = null;
	}

	function buildCompositeRenderSignature(resolvedSnapshot) {
		return JSON.stringify({
			snapshot: resolvedSnapshot,
			tintVersion,
			swiatloAssetsVersion,
		});
	}

	function getCanvas2dContext(canvas, options) {
		if (!canvas) {
			return null;
		}
		const requested = {
			alpha: true,
			colorSpace: CANVAS_COLOR_SPACE,
			...(options || {}),
		};
		const ctx = canvas.getContext("2d", requested);
		if (ctx) {
			return ctx;
		}
		if (options) {
			const fallbackWithOptions = canvas.getContext("2d", options);
			if (fallbackWithOptions) {
				return fallbackWithOptions;
			}
		}
		return canvas.getContext("2d");
	}

	function configureImageSmoothing(ctx) {
		ctx.imageSmoothingEnabled = true;
		if ("imageSmoothingQuality" in ctx) {
			ctx.imageSmoothingQuality = "high";
		}
	}

	function ensureRenderCanvas() {
		if (!renderCanvas || renderCanvas.width !== RENDER_SIZE || renderCanvas.height !== RENDER_SIZE) {
			renderCanvas = document.createElement("canvas");
			renderCanvas.width = RENDER_SIZE;
			renderCanvas.height = RENDER_SIZE;
		}
		return renderCanvas;
	}

	function ensureEffectCanvasA() {
		if (!effectCanvasA || effectCanvasA.width !== RENDER_SIZE || effectCanvasA.height !== RENDER_SIZE) {
			effectCanvasA = document.createElement("canvas");
			effectCanvasA.width = RENDER_SIZE;
			effectCanvasA.height = RENDER_SIZE;
		}
		return effectCanvasA;
	}

	function ensureEffectCanvasB() {
		if (!effectCanvasB || effectCanvasB.width !== RENDER_SIZE || effectCanvasB.height !== RENDER_SIZE) {
			effectCanvasB = document.createElement("canvas");
			effectCanvasB.width = RENDER_SIZE;
			effectCanvasB.height = RENDER_SIZE;
		}
		return effectCanvasB;
	}

	function ensureEffectCanvasC() {
		if (!effectCanvasC || effectCanvasC.width !== RENDER_SIZE || effectCanvasC.height !== RENDER_SIZE) {
			effectCanvasC = document.createElement("canvas");
			effectCanvasC.width = RENDER_SIZE;
			effectCanvasC.height = RENDER_SIZE;
		}
		return effectCanvasC;
	}

	function ensureCircleEdgeMaskCanvas() {
		if (CIRCLE_EDGE_AA_PX <= 0) {
			return null;
		}
		if (circleEdgeMaskCanvas && circleEdgeMaskCanvas.width === RENDER_SIZE && circleEdgeMaskCanvas.height === RENDER_SIZE) {
			return circleEdgeMaskCanvas;
		}
		circleEdgeMaskCanvas = document.createElement("canvas");
		circleEdgeMaskCanvas.width = RENDER_SIZE;
		circleEdgeMaskCanvas.height = RENDER_SIZE;
		const maskCtx = getCanvas2dContext(circleEdgeMaskCanvas, { willReadFrequently: true });
		if (!maskCtx) {
			return null;
		}
		const feather = Math.max(0, CIRCLE_EDGE_AA_PX * RENDER_SCALE);
		const innerRadius = Math.max(0, RENDER_INNER_RADIUS - feather);
		const outerRadius = RENDER_INNER_RADIUS + feather;
		const radiusSpan = Math.max(0.0001, outerRadius - innerRadius);
		const imageData = maskCtx.createImageData(RENDER_SIZE, RENDER_SIZE);
		const data = imageData.data;
		let index = 0;

		for (let y = 0; y < RENDER_SIZE; y += 1) {
			const dy = y + 0.5 - RENDER_CENTER;
			for (let x = 0; x < RENDER_SIZE; x += 1) {
				const dx = x + 0.5 - RENDER_CENTER;
				const distance = Math.sqrt(dx * dx + dy * dy);
				let alpha = 0;
				if (distance <= innerRadius) {
					alpha = 1;
				} else if (distance < outerRadius) {
					const t = (outerRadius - distance) / radiusSpan;
					alpha = t * t * (3 - 2 * t);
				}
				data[index + 3] = Math.round(alpha * 255);
				index += 4;
			}
		}

		maskCtx.putImageData(imageData, 0, 0);
		return circleEdgeMaskCanvas;
	}

	function angleToVector(angleDeg) {
		const radians = (angleDeg * Math.PI) / 180;
		return {
			x: Math.cos(radians),
			// Photoshop-style angles are defined in a coordinate space where positive Y points upward.
			// Canvas coordinates are inverted on Y, so we flip the sign for closer visual parity.
			y: -Math.sin(radians),
		};
	}

	function colorToRgba(color, opacity) {
		const rgb = hexToRgb(color);
		return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(opacity, 0, 1)})`;
	}

	function swiatloAssetPath(filename) {
		return `/light/${encodeURIComponent(filename)}`;
	}

	function applyContrastToRgbaBuffer(data, contrast) {
		if (Math.abs(contrast - 1) < 0.0001) {
			return;
		}
		for (let index = 0; index < data.length; index += 4) {
			const nextRed = ((data[index] / 255 - 0.5) * contrast + 0.5) * 255;
			const nextGreen = ((data[index + 1] / 255 - 0.5) * contrast + 0.5) * 255;
			const nextBlue = ((data[index + 2] / 255 - 0.5) * contrast + 0.5) * 255;
			data[index] = clamp(Math.round(nextRed), 0, 255);
			data[index + 1] = clamp(Math.round(nextGreen), 0, 255);
			data[index + 2] = clamp(Math.round(nextBlue), 0, 255);
		}
	}

	function getSwiatloRenderableSource(layer, image) {
		const parsedContrast = Number(SWIATLO_SHARPEN_CONTRAST);
		const contrast = Number.isFinite(parsedContrast) ? Math.max(0, parsedContrast) : 1;
		if (Math.abs(contrast - 1) < 0.0001) {
			return image;
		}
		const cached = swiatloProcessedCache.get(layer.id);
		if (cached && cached.width === image.naturalWidth && cached.height === image.naturalHeight && cached.contrast === contrast) {
			return cached.canvas;
		}
		const canvas = document.createElement("canvas");
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const ctx = getCanvas2dContext(canvas, { willReadFrequently: true });
		if (!ctx) {
			return image;
		}
		configureImageSmoothing(ctx);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(image, 0, 0);
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		applyContrastToRgbaBuffer(imageData.data, contrast);
		ctx.putImageData(imageData, 0, 0);
		swiatloProcessedCache.set(layer.id, {
			canvas,
			width: image.naturalWidth,
			height: image.naturalHeight,
			contrast,
		});
		return canvas;
	}

	function getSwiatloImage(layer) {
		const cached = swiatloImageCache.get(layer.id);
		if (cached) {
			return cached;
		}
		const image = new Image();
		image.decoding = "async";
		image.onload = () => {
			swiatloProcessedCache.delete(layer.id);
			swiatloAssetsVersion += 1;
		};
		image.src = swiatloAssetPath(layer.file);
		swiatloImageCache.set(layer.id, image);
		return image;
	}

	function primeSwiatloAssets() {
		for (const layer of SWIATLO_LAYER_DEFS) {
			getSwiatloImage(layer);
		}
	}

	function revokeSourceUrl() {
		if (sourceUrl) {
			URL.revokeObjectURL(sourceUrl);
			sourceUrl = "";
		}
	}

	function resetMessages() {
		errorMessage = "";
		statusMessage = "";
	}

	function resetTransform() {
		iconOffsetX = 0;
		iconOffsetY = 0;
		iconScale = 1;
		resetMessages();
	}

	function resetToUpload() {
		revokeSourceUrl();
		clearTintCache();
		sourceName = "";
		sourceCanvas = null;
		tintedCanvas = null;
		alphaBounds = null;
		persistedSourceDataUrl = "";
		isDragOver = false;
		isDragging = false;
		dragPointerId = -1;
		dragLastClientX = 0;
		dragLastClientY = 0;
		compareReference = null;
		compareEnabled = false;
		suggestionBaseLocked = false;
		resetHistoryTracking();
		resetMessages();
		statusMessage = "Ready for another PNG. Current settings were kept.";
		persistSourceState();
	}

	function resetAll() {
		revokeSourceUrl();
		clearTintCache();
		sourceName = "";
		sourceCanvas = null;
		tintedCanvas = null;
		alphaBounds = null;
		persistedSourceDataUrl = "";
		isDragOver = false;
		isDragging = false;
		dragPointerId = -1;
		dragLastClientX = 0;
		dragLastClientY = 0;
		primaryColor = DEFAULT_PRIMARY_COLOR;
		iconColor = DEFAULT_ICON_COLOR;
		primaryColorHexInput = DEFAULT_PRIMARY_COLOR;
		iconColorHexInput = DEFAULT_ICON_COLOR;
		iconOffsetX = 0;
		iconOffsetY = 0;
		iconScale = 1;
		compareReference = null;
		compareEnabled = false;
		suggestionBasePrimary = DEFAULT_PRIMARY_COLOR;
		suggestionBaseIcon = DEFAULT_ICON_COLOR;
		suggestionBaseLocked = false;
		suggestionLockHue = false;
		suggestionLockSaturation = false;
		suggestionGeneratedCount = 3;
		suggestionSeed = 1;
		swiatloEnabled = true;
		swiatloPresetId = DEFAULT_SWIATLO_PRESET_ID;
		swiatloActiveLayerId = DEFAULT_SWIATLO_ACTIVE_LAYER_ID;
		swiatloLayerVisibility = normalizeSwiatloVisibility({}, DEFAULT_SWIATLO_PRESET_ID);
		resetHistoryTracking();
		resetMessages();
		statusMessage = "Reset all settings and cleared saved session.";
		skipPersist = true;
		try {
			localStorage.removeItem(SETTINGS_STORAGE_KEY);
			localStorage.removeItem(SOURCE_STORAGE_KEY);
			localStorage.removeItem(LEGACY_STORAGE_KEY);
		} catch {
			// Ignore localStorage write failures.
		}
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
		void onFileChange(event.dataTransfer?.files || null);
	}

	async function onFileChange(fileList) {
		const file = fileList?.[0];
		if (!file) {
			return;
		}

		resetMessages();
		if (file.type && file.type !== "image/png") {
			errorMessage = "Upload a PNG file.";
			return;
		}

		let nextUrl = "";
		try {
			nextUrl = URL.createObjectURL(file);
			const image = await loadImage(nextUrl);
			const nextCanvas = buildCanvasFromImage(image);

			const nextBounds = computeAlphaBounds(nextCanvas);
			if (!nextBounds) {
				throw new Error("PNG has no visible alpha pixels.");
			}

			revokeSourceUrl();
			clearTintCache();
			sourceUrl = nextUrl;
			sourceName = file.name;
			sourceCanvas = nextCanvas;
			alphaBounds = nextBounds;
			persistedSourceDataUrl = nextCanvas.toDataURL("image/png");
			persistSourceState();
			applyFitScale();
			autoCenterFromAlpha();
			captureSuggestionBase();
			compareReference = createEditorSnapshot();
			resetHistoryTracking();
			syncHistoryBaselineToCurrent();
			statusMessage = "PNG loaded and centered by alpha bounds.";
		} catch (error) {
			if (nextUrl) {
				URL.revokeObjectURL(nextUrl);
			}
			errorMessage = error?.message || "Unable to load PNG.";
		}
	}

	function loadImage(url) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error("Image decode failed."));
			img.src = url;
		});
	}

	function computeAlphaBounds(canvas) {
		const ctx = getCanvas2dContext(canvas, { willReadFrequently: true });
		if (!ctx) {
			return null;
		}
		const { width, height } = canvas;
		const imageData = ctx.getImageData(0, 0, width, height);
		const alpha = imageData.data;
		let minX = width;
		let minY = height;
		let maxX = -1;
		let maxY = -1;

		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				const alphaIndex = (y * width + x) * 4 + 3;
				if (alpha[alphaIndex] < ALPHA_BOUNDS_MIN_ALPHA) {
					continue;
				}
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}

		if (maxX < 0 || maxY < 0) {
			return null;
		}

		return {
			minX,
			minY,
			maxX,
			maxY,
			width: maxX - minX + 1,
			height: maxY - minY + 1,
			centerX: (minX + maxX + 1) / 2,
			centerY: (minY + maxY + 1) / 2,
		};
	}

	function applyFitScale() {
		if (!alphaBounds) {
			iconScale = 1;
			return;
		}
		const fitByBounds = FIT_DIAMETER / Math.max(alphaBounds.width, alphaBounds.height);
		iconScale = clampScale(fitByBounds);
	}

	function autoCenterFromAlpha() {
		if (!sourceCanvas || !alphaBounds) {
			return;
		}
		const sourceMidX = sourceCanvas.width / 2;
		const sourceMidY = sourceCanvas.height / 2;
		iconOffsetX = clampOffset(-((alphaBounds.centerX - sourceMidX) * iconScale), iconOffsetX);
		iconOffsetY = clampOffset(-((alphaBounds.centerY - sourceMidY) * iconScale), iconOffsetY);
		resetMessages();
		statusMessage = "Icon recentered from alpha bounds.";
	}

	function refreshTintedCanvas() {
		if (!sourceCanvas) {
			tintedCanvas = null;
			clearTintCache();
			tintVersionCounter += 1;
			tintVersion = tintVersionCounter;
			return;
		}
		if (!tintedCanvas || tintedCanvas.width !== sourceCanvas.width || tintedCanvas.height !== sourceCanvas.height) {
			tintedCanvas = document.createElement("canvas");
			tintedCanvas.width = sourceCanvas.width;
			tintedCanvas.height = sourceCanvas.height;
		}

		const tintCtx = getCanvas2dContext(tintedCanvas);
		if (!tintCtx) {
			tintedCanvas = null;
			return;
		}

		configureImageSmoothing(tintCtx);
		tintCtx.clearRect(0, 0, tintedCanvas.width, tintedCanvas.height);
		tintCtx.drawImage(sourceCanvas, 0, 0);
		tintCtx.globalCompositeOperation = "source-in";
		tintCtx.fillStyle = iconColor;
		tintCtx.fillRect(0, 0, tintedCanvas.width, tintedCanvas.height);
		tintCtx.globalCompositeOperation = "source-over";
		tintVersionCounter += 1;
		tintVersion = tintVersionCounter;
	}

	function scheduleCanvasRender(options = {}) {
		pendingRenderOutput = pendingRenderOutput || options.includeOutput !== false;
		pendingRenderCompare = pendingRenderCompare || options.includeCompare !== false;
		pendingFastPreview = options.fastPreview === true;
		renderBusy = true;
		renderBusyLabel = options.label || (options.fastPreview ? "Updating preview..." : "Loading effects...");
		if (renderFrameId) {
			return;
		}
		renderFrameId = requestAnimationFrame(() => {
			renderFrameId = requestAnimationFrame(() => {
				renderFrameId = 0;
				const includeOutput = pendingRenderOutput;
				const includeCompare = pendingRenderCompare;
				const fastPreview = pendingFastPreview;
				pendingRenderOutput = false;
				pendingRenderCompare = false;
				pendingFastPreview = false;
				try {
					renderCanvases({ includeOutput, includeCompare, fastPreview });
				} finally {
					renderBusy = false;
					renderBusyLabel = "";
				}
			});
		});
	}

	function waitForPaint() {
		return new Promise((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(resolve);
			});
		});
	}

	function clearInteractionPreviewTimeout() {
		if (interactionPreviewTimeoutId) {
			clearTimeout(interactionPreviewTimeoutId);
			interactionPreviewTimeoutId = 0;
		}
	}

	function queueInteractivePreview() {
		interactivePreviewMode = true;
		clearInteractionPreviewTimeout();
		interactionPreviewTimeoutId = setTimeout(() => {
			interactionPreviewTimeoutId = 0;
			interactivePreviewMode = false;
		}, INTERACTION_SETTLE_MS);
	}

	function cancelScheduledCanvasRender() {
		if (renderFrameId) {
			cancelAnimationFrame(renderFrameId);
			renderFrameId = 0;
		}
		pendingRenderOutput = false;
		pendingRenderCompare = false;
		pendingFastPreview = false;
		renderBusy = false;
		renderBusyLabel = "";
	}

	function flushRender(options = {}) {
		clearInteractionPreviewTimeout();
		interactivePreviewMode = false;
		cancelScheduledCanvasRender();
		renderBusy = true;
		renderBusyLabel = options.label || (options.includeOutput === true ? "Preparing export..." : "Loading effects...");
		try {
			renderCanvases({
				includeOutput: options.includeOutput === true,
				includeCompare: options.includeCompare ?? compareEnabled,
				fastPreview: false,
			});
		} finally {
			renderBusy = false;
			renderBusyLabel = "";
		}
	}

	function renderCanvases(options = {}) {
		const currentState = createEditorSnapshot();
		if (options.fastPreview) {
			drawFastPreview(previewCanvasEl, true, PREVIEW_SIZE, currentState);
		} else {
			drawComposite(previewCanvasEl, true, PREVIEW_SIZE, currentState, "preview");
		}
		if (options.includeOutput !== false) {
			drawComposite(outputCanvasEl, false, OUTPUT_SIZE, currentState, "output");
		}
		if (options.includeCompare !== false && compareEnabled && compareCanvasEl && compareReference) {
			const nextCompareSignature = JSON.stringify(resolveRenderSnapshot(compareReference));
			if (comparePreviewSignature !== nextCompareSignature || comparePreviewSourceCanvas !== sourceCanvas || compareCanvasEl.width !== PREVIEW_SIZE || compareCanvasEl.height !== PREVIEW_SIZE) {
				drawComposite(compareCanvasEl, true, PREVIEW_SIZE, compareReference, "compare");
				comparePreviewSignature = nextCompareSignature;
				comparePreviewSourceCanvas = sourceCanvas;
			}
		} else if (compareCanvasEl && !compareEnabled) {
			const ctx = getCanvas2dContext(compareCanvasEl);
			if (ctx) {
				ctx.clearRect(0, 0, compareCanvasEl.width, compareCanvasEl.height);
			}
			comparePreviewSignature = "";
			comparePreviewSourceCanvas = null;
		}
	}

	function buildTintedCanvasForColor(color) {
		if (!sourceCanvas) {
			return null;
		}
		const tint = document.createElement("canvas");
		tint.width = sourceCanvas.width;
		tint.height = sourceCanvas.height;
		const tintCtx = getCanvas2dContext(tint);
		if (!tintCtx) {
			return null;
		}
		configureImageSmoothing(tintCtx);
		tintCtx.clearRect(0, 0, tint.width, tint.height);
		tintCtx.drawImage(sourceCanvas, 0, 0);
		tintCtx.globalCompositeOperation = "source-in";
		tintCtx.fillStyle = color;
		tintCtx.fillRect(0, 0, tint.width, tint.height);
		tintCtx.globalCompositeOperation = "source-over";
		return tint;
	}

	function getTintedCanvasForColor(color) {
		const normalized = sanitizeHexColor(color, DEFAULT_ICON_COLOR);
		if (normalized === sanitizeHexColor(iconColor, DEFAULT_ICON_COLOR) && tintedCanvas) {
			return tintedCanvas;
		}
		const cached = tintedColorCache.get(normalized);
		if (cached) {
			return cached;
		}
		const built = buildTintedCanvasForColor(normalized);
		if (!built) {
			return null;
		}
		tintedColorCache.set(normalized, built);
		return built;
	}

	function buildProgressiveScaledTintCanvas(source, targetWidth, targetHeight) {
		if (source.width === targetWidth && source.height === targetHeight) {
			return source;
		}
		let currentCanvas = source;
		let currentWidth = source.width;
		let currentHeight = source.height;

		while (currentWidth * 0.5 >= targetWidth || currentHeight * 0.5 >= targetHeight) {
			const nextWidth = Math.max(targetWidth, Math.round(currentWidth * 0.5));
			const nextHeight = Math.max(targetHeight, Math.round(currentHeight * 0.5));
			const nextCanvas = document.createElement("canvas");
			nextCanvas.width = nextWidth;
			nextCanvas.height = nextHeight;
			const nextCtx = getCanvas2dContext(nextCanvas);
			if (!nextCtx) {
				break;
			}
			configureImageSmoothing(nextCtx);
			nextCtx.clearRect(0, 0, nextWidth, nextHeight);
			nextCtx.drawImage(currentCanvas, 0, 0, currentWidth, currentHeight, 0, 0, nextWidth, nextHeight);
			currentCanvas = nextCanvas;
			currentWidth = nextWidth;
			currentHeight = nextHeight;
		}

		if (currentWidth === targetWidth && currentHeight === targetHeight) {
			return currentCanvas;
		}

		const finalCanvas = document.createElement("canvas");
		finalCanvas.width = targetWidth;
		finalCanvas.height = targetHeight;
		const finalCtx = getCanvas2dContext(finalCanvas);
		if (!finalCtx) {
			return currentCanvas;
		}
		configureImageSmoothing(finalCtx);
		finalCtx.clearRect(0, 0, targetWidth, targetHeight);
		finalCtx.drawImage(currentCanvas, 0, 0, currentWidth, currentHeight, 0, 0, targetWidth, targetHeight);
		return finalCanvas;
	}

	function getScaledTintCanvas(tintCanvas, color, targetWidth, targetHeight) {
		const normalizedColor = sanitizeHexColor(color, DEFAULT_ICON_COLOR);
		const key = `${normalizedColor}:${targetWidth}x${targetHeight}:v${tintVersion}`;
		const cached = scaledTintCache.get(key);
		if (cached) {
			return cached;
		}
		const built = buildProgressiveScaledTintCanvas(tintCanvas, targetWidth, targetHeight);
		scaledTintCache.set(key, built);
		return built;
	}

	function resolveIconRaster(tintCanvas, color, drawXRaw, drawYRaw, drawWidthRaw, drawHeightRaw) {
		const rasterWidth = Math.max(1, Math.round(drawWidthRaw));
		const rasterHeight = Math.max(1, Math.round(drawHeightRaw));
		const rasterCanvas = getScaledTintCanvas(tintCanvas, color, rasterWidth, rasterHeight);
		return {
			canvas: rasterCanvas,
			x: drawXRaw,
			y: drawYRaw,
			width: drawWidthRaw,
			height: drawHeightRaw,
		};
	}

	function drawIconOuterShadow(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight) {
		if (!tintCanvas || !ICON_EFFECT_SETTINGS.outerShadow.enabled) {
			return;
		}

		const maskCanvas = ensureEffectCanvasA();
		const maskCtx = getCanvas2dContext(maskCanvas);
		const shadowCanvas = ensureEffectCanvasC();
		const shadowCtx = getCanvas2dContext(shadowCanvas);
		if (!maskCtx || !shadowCtx) {
			return;
		}

		const settings = ICON_EFFECT_SETTINGS.outerShadow;
		const shadowCoreOpacityMultiplier = isSafariShadowProfile ? SAFARI_CORE_SHADOW_OPACITY_MULTIPLIER : 1;
		const shadowCoreDistanceMultiplier = isSafariShadowProfile ? SAFARI_CORE_SHADOW_DISTANCE_MULTIPLIER : 1;
		const shadowFalloffDistanceMultiplier = isSafariShadowProfile ? SAFARI_FALLOFF_SHADOW_DISTANCE_MULTIPLIER : 1;
		const shadowOpacityMultiplier = isSafariShadowProfile ? SAFARI_SHADOW_OPACITY_MULTIPLIER : 1;
		const shadowBlurMultiplier = isSafariShadowProfile ? SAFARI_SHADOW_BLUR_MULTIPLIER : 1;
		const shadowDistanceMultiplier = isSafariShadowProfile ? SAFARI_SHADOW_DISTANCE_MULTIPLIER : 1;
		const shadowFalloffOpacityMultiplier = isSafariShadowProfile ? SAFARI_SHADOW_FALLOFF_OPACITY_MULTIPLIER : 1;
		const shadowFalloffBlurMultiplier = isSafariShadowProfile ? SAFARI_SHADOW_FALLOFF_BLUR_MULTIPLIER : 1;
		const shadowPunchoutBlurMultiplier = isSafariShadowProfile ? SAFARI_SHADOW_PUNCHOUT_BLUR_MULTIPLIER : 1;
		const vector = angleToVector(settings.angleDeg);
		const offsetX = toStableOffsetPx(vector.x * settings.distance * shadowCoreDistanceMultiplier * RENDER_SCALE);
		const offsetY = toStableOffsetPx(vector.y * settings.distance * shadowCoreDistanceMultiplier * RENDER_SCALE);
		const baseBlur = toStableBlurPx(settings.blur * shadowBlurMultiplier * RENDER_SCALE);
		const coreOpacity = clamp((settings.coreOpacity ?? 1) * settings.opacity * shadowOpacityMultiplier * shadowCoreOpacityMultiplier, 0, 1);
		const coreBlur = toStableBlurPx(baseBlur * (settings.coreBlurMultiplier ?? 1));
		const falloffOpacity = clamp((settings.falloffOpacity ?? 0.4) * settings.opacity * shadowOpacityMultiplier * shadowFalloffOpacityMultiplier, 0, 1);
		const falloffBlur = toStableBlurPx(baseBlur * (settings.falloffBlurMultiplier ?? 2) * shadowFalloffBlurMultiplier);
		const falloffDistance = (settings.falloffDistanceMultiplier ?? 1) * shadowDistanceMultiplier * shadowFalloffDistanceMultiplier;
		const punchoutBlur = toStableBlurPx(Math.max(1, baseBlur * 0.8 * shadowPunchoutBlurMultiplier));
		const falloffOffsetX = toStableOffsetPx(offsetX * falloffDistance);
		const falloffOffsetY = toStableOffsetPx(offsetY * falloffDistance);

		configureImageSmoothing(maskCtx);
		maskCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
		maskCtx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
		maskCtx.globalCompositeOperation = "source-in";
		maskCtx.fillStyle = colorToRgba(settings.color, 1);
		maskCtx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE);
		maskCtx.globalCompositeOperation = "source-over";

		configureImageSmoothing(shadowCtx);
		const renderShadowPass = (alpha, blurPx, passOffsetX, passOffsetY, blendMode) => {
			if (alpha <= 0) {
				return;
			}
			shadowCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
			if (isSafariShadowProfile) {
				shadowCtx.save();
				shadowCtx.globalAlpha = alpha;
				shadowCtx.filter = "none";
				shadowCtx.shadowColor = colorToRgba(settings.color, 1);
				shadowCtx.shadowBlur = blurPx;
				shadowCtx.shadowOffsetX = passOffsetX;
				shadowCtx.shadowOffsetY = passOffsetY;
				shadowCtx.drawImage(maskCanvas, 0, 0);
				shadowCtx.restore();
			} else {
				shadowCtx.save();
				shadowCtx.globalAlpha = alpha;
				shadowCtx.filter = blurFilter(blurPx);
				shadowCtx.drawImage(maskCanvas, passOffsetX, passOffsetY);
				shadowCtx.restore();
			}
			shadowCtx.save();
			shadowCtx.globalCompositeOperation = "destination-out";
			shadowCtx.filter = isSafariShadowProfile ? "none" : blurFilter(punchoutBlur);
			shadowCtx.drawImage(maskCanvas, 0, 0);
			shadowCtx.restore();

			ctx.save();
			ctx.globalCompositeOperation = blendMode || "source-over";
			ctx.drawImage(shadowCanvas, 0, 0);
			ctx.restore();
		};

		renderShadowPass(coreOpacity, coreBlur, offsetX, offsetY, settings.coreBlendMode);
		renderShadowPass(falloffOpacity, falloffBlur, falloffOffsetX, falloffOffsetY, settings.falloffBlendMode);
	}

	function drawInnerBevelPass(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight, options) {
		if (!tintCanvas) {
			return;
		}

		const resultCanvas = ensureEffectCanvasA();
		const resultCtx = getCanvas2dContext(resultCanvas);
		const sampleCanvas = ensureEffectCanvasB();
		const sampleCtx = getCanvas2dContext(sampleCanvas);
		if (!resultCtx || !sampleCtx) {
			return;
		}

		const opacity = clamp(options.opacity ?? 0, 0, 1);
		const sampleCount = Math.max(1, Math.round(Number(options.samples) || 1));
		const distancePx = Math.max(0, Number(options.distance) || 0) * RENDER_SCALE;
		const softenPx = toStableOffsetPx(Math.max(0, Number(options.soften) || 0) * RENDER_SCALE);
		if (opacity <= 0 || distancePx <= 0) {
			return;
		}

		const vector = angleToVector(options.angleDeg);
		const direction = options.invertDirection ? -1 : 1;
		const baseShiftX = vector.x * distancePx * direction;
		const baseShiftY = vector.y * distancePx * direction;
		const totalWeight = (sampleCount * (sampleCount + 1)) / 2;
		const quantizedSamples = new Map();
		let quantizedWeightTotal = 0;

		for (let index = 0; index < sampleCount; index += 1) {
			const step = (index + 1) / sampleCount;
			const weight = (index + 1) / totalWeight;
			const shiftX = toStableOffsetPx(baseShiftX * step);
			const shiftY = toStableOffsetPx(baseShiftY * step);
			if (shiftX === 0 && shiftY === 0) {
				continue;
			}
			const key = `${shiftX}:${shiftY}`;
			quantizedSamples.set(key, {
				shiftX,
				shiftY,
				weight: (quantizedSamples.get(key)?.weight || 0) + weight,
			});
			quantizedWeightTotal += weight;
		}

		if (quantizedSamples.size === 0 || quantizedWeightTotal <= 0) {
			return;
		}

		configureImageSmoothing(resultCtx);
		resultCtx.globalAlpha = 1;
		resultCtx.globalCompositeOperation = "source-over";
		resultCtx.filter = "none";
		resultCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);

		configureImageSmoothing(sampleCtx);

		// Quantize and merge the sample offsets so different canvas engines do not
		// over-accentuate the same fractional rim in slightly different ways.
		for (const { shiftX, shiftY, weight } of quantizedSamples.values()) {
			sampleCtx.globalAlpha = 1;
			sampleCtx.globalCompositeOperation = "source-over";
			sampleCtx.filter = "none";
			sampleCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
			sampleCtx.drawImage(tintCanvas, drawX + shiftX, drawY + shiftY, drawWidth, drawHeight);
			sampleCtx.globalCompositeOperation = "destination-in";
			sampleCtx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
			sampleCtx.globalCompositeOperation = "destination-out";
			sampleCtx.drawImage(tintCanvas, drawX - shiftX, drawY - shiftY, drawWidth, drawHeight);
			sampleCtx.globalCompositeOperation = "source-in";
			sampleCtx.fillStyle = colorToRgba(options.color, opacity * (weight / quantizedWeightTotal));
			sampleCtx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE);
			sampleCtx.globalCompositeOperation = "source-over";

			if (softenPx > 0) {
				resultCtx.save();
				resultCtx.globalAlpha = 0.5;
				resultCtx.drawImage(sampleCanvas, 0, 0);
				resultCtx.globalAlpha = 0.125;
				resultCtx.drawImage(sampleCanvas, softenPx, 0);
				resultCtx.drawImage(sampleCanvas, -softenPx, 0);
				resultCtx.drawImage(sampleCanvas, 0, softenPx);
				resultCtx.drawImage(sampleCanvas, 0, -softenPx);
				resultCtx.restore();
			} else {
				resultCtx.drawImage(sampleCanvas, 0, 0);
			}
		}

		ctx.save();
		ctx.globalCompositeOperation = resolveIconBlendMode(options.blendMode);
		ctx.drawImage(resultCanvas, 0, 0);
		ctx.restore();
	}

	function drawIconBevelEffects(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight) {
		if (!ICON_EFFECT_SETTINGS.bevel.enabled) {
			return;
		}

		const bevel = ICON_EFFECT_SETTINGS.bevel;
		drawInnerBevelPass(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight, {
			angleDeg: bevel.angleDeg,
			distance: bevel.shadow?.distance,
			samples: bevel.shadow?.samples,
			color: bevel.shadow?.color,
			opacity: bevel.shadow?.opacity,
			blendMode: bevel.shadow?.blendMode,
			invertDirection: false,
		});
		drawInnerBevelPass(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight, {
			angleDeg: bevel.angleDeg,
			distance: bevel.highlight?.distance,
			samples: bevel.highlight?.samples,
			soften: bevel.highlight?.soften,
			color: bevel.highlight?.color,
			opacity: (bevel.highlight?.opacity ?? 0) * (usesReducedBevelHighlightOpacity ? REDUCED_BEVEL_HIGHLIGHT_OPACITY_MULTIPLIER : 1),
			blendMode: bevel.highlight?.blendMode,
			invertDirection: true,
		});
	}

	function drawIconBase(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight) {
		if (!tintCanvas) {
			return;
		}
		const blurPx = toStableBlurPx(ICON_EDGE_SOFTEN_PX * RENDER_SCALE);
		if (blurPx <= 0) {
			ctx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
			return;
		}
		ctx.save();
		configureImageSmoothing(ctx);
		ctx.filter = blurFilter(blurPx);
		ctx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
		ctx.filter = "none";
		ctx.restore();
	}

	function drawSwiatloLayer(ctx, layer) {
		const image = getSwiatloImage(layer);
		if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
			return;
		}
		const source = getSwiatloRenderableSource(layer, image);
		let drawSize = RENDER_SIZE * SWIATLO_SCALE;
		let drawX = (RENDER_SIZE - drawSize) * 0.5 + SWIATLO_OFFSET_X * RENDER_SCALE;
		let drawY = (RENDER_SIZE - drawSize) * 0.5 + SWIATLO_OFFSET_Y * RENDER_SCALE;
		if (SWIATLO_PIXEL_SNAP) {
			drawSize = Math.round(drawSize);
			drawX = Math.round(drawX);
			drawY = Math.round(drawY);
		}
		ctx.save();
		configureImageSmoothing(ctx);
		ctx.drawImage(source, drawX, drawY, drawSize, drawSize);
		ctx.restore();
	}

	function drawSwiatloOverlays(ctx, options = {}) {
		if (options.enabled === false) {
			return;
		}
		const visibility = options.visibility || swiatloLayerVisibility;
		const perfSample = options.perfSample || null;

		for (const layer of SWIATLO_LAYER_DEFS) {
			if (!visibility?.[layer.id]) {
				continue;
			}
			const layerStart = perfSample ? readPerfNow() : 0;
			ctx.save();
			ctx.globalCompositeOperation = layer.blendMode || "source-over";
			ctx.globalAlpha = layer.opacity ?? 1;
			drawSwiatloLayer(ctx, layer);
			ctx.restore();
			if (perfSample) {
				perfSample.overlayStages.push({
					id: layer.id,
					label: layer.label,
					mode: layer.blendMode || "source-over",
					durationMs: readPerfNow() - layerStart,
				});
			}
		}
	}

	function applyCircleEdgeAntiAliasing(ctx) {
		const maskCanvas = ensureCircleEdgeMaskCanvas();
		if (!maskCanvas) {
			return;
		}
		ctx.save();
		ctx.globalCompositeOperation = "destination-in";
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(maskCanvas, 0, 0);
		ctx.restore();
	}

	function resolveRenderSnapshot(snapshot = createEditorSnapshot()) {
		return {
			primaryColor: sanitizeHexColor(snapshot?.primaryColor, primaryColor),
			iconColor: sanitizeHexColor(snapshot?.iconColor, iconColor),
			iconOffsetX: clampOffset(snapshot?.iconOffsetX, iconOffsetX),
			iconOffsetY: clampOffset(snapshot?.iconOffsetY, iconOffsetY),
			iconScale: clampScale(snapshot?.iconScale),
			swiatloEnabled: snapshot?.swiatloEnabled !== false,
			swiatloPresetId: resolveSwiatloPreset(snapshot?.swiatloPresetId || swiatloPresetId).id,
			swiatloLayerVisibility: normalizeSwiatloVisibility(snapshot?.swiatloLayerVisibility, snapshot?.swiatloPresetId || swiatloPresetId),
		};
	}

	function drawFastPreview(canvas, includeGuides, size = PREVIEW_SIZE, snapshot = createEditorSnapshot()) {
		if (!canvas) {
			return;
		}
		if (canvas.width !== size) {
			canvas.width = size;
		}
		if (canvas.height !== size) {
			canvas.height = size;
		}

		const targetCtx = getCanvas2dContext(canvas);
		if (!targetCtx) {
			return;
		}

		const resolvedSnapshot = resolveRenderSnapshot(snapshot);
		const scale = size / OUTPUT_SIZE;
		const center = size / 2;
		const radius = INNER_RADIUS * scale;
		const tintCanvas = getTintedCanvasForColor(resolvedSnapshot.iconColor);

		configureImageSmoothing(targetCtx);
		targetCtx.globalAlpha = 1;
		targetCtx.globalCompositeOperation = "source-over";
		targetCtx.filter = "none";
		targetCtx.clearRect(0, 0, size, size);

		targetCtx.save();
		targetCtx.beginPath();
		targetCtx.arc(center, center, radius, 0, Math.PI * 2);
		targetCtx.closePath();
		targetCtx.clip();
		targetCtx.fillStyle = resolvedSnapshot.primaryColor;
		targetCtx.fillRect(0, 0, size, size);

		if (tintCanvas) {
			const drawWidth = tintCanvas.width * resolvedSnapshot.iconScale * scale;
			const drawHeight = tintCanvas.height * resolvedSnapshot.iconScale * scale;
			const drawX = center - drawWidth / 2 + resolvedSnapshot.iconOffsetX * scale;
			const drawY = center - drawHeight / 2 + resolvedSnapshot.iconOffsetY * scale;
			targetCtx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
		}
		targetCtx.restore();

		if (includeGuides) {
			drawGuides(targetCtx, size);
		}
	}

	function drawComposite(canvas, includeGuides, size = OUTPUT_SIZE, snapshot = createEditorSnapshot(), targetLabel = "preview") {
		if (!canvas) {
			return;
		}
		if (canvas.width !== size) {
			canvas.width = size;
		}
		if (canvas.height !== size) {
			canvas.height = size;
		}

		const targetCtx = getCanvas2dContext(canvas);
		if (!targetCtx) {
			return;
		}

		const renderTarget = ensureRenderCanvas();
		const renderCtx = getCanvas2dContext(renderTarget);
		if (!renderCtx) {
			return;
		}
		const resolvedSnapshot = resolveRenderSnapshot(snapshot);
		const nextCompositeSignature = buildCompositeRenderSignature(resolvedSnapshot);
		const canReuseComposite = compositeRenderSignature === nextCompositeSignature && compositeRenderSourceCanvas === sourceCanvas;
		const perfSample = perfInstrumentationEnabled
			? {
					targetLabel,
					size,
					totalMs: 0,
					stages: {},
					overlayStages: [],
				}
			: null;
		const totalStart = perfSample ? readPerfNow() : 0;
		const measureStage = (stageId, callback) => {
			if (!perfSample) {
				return callback();
			}
			const stageStart = readPerfNow();
			const result = callback();
			perfSample.stages[stageId] = (perfSample.stages[stageId] || 0) + (readPerfNow() - stageStart);
			return result;
		};

		if (!canReuseComposite) {
			configureImageSmoothing(renderCtx);
			renderCtx.globalAlpha = 1;
			renderCtx.globalCompositeOperation = "source-over";
			renderCtx.filter = "none";
			renderCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
			measureStage("fillBase", () => {
				renderCtx.fillStyle = resolvedSnapshot.primaryColor;
				renderCtx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE);
			});

			const tintCanvas = getTintedCanvasForColor(resolvedSnapshot.iconColor);
			if (tintCanvas) {
				const drawWidthRaw = tintCanvas.width * resolvedSnapshot.iconScale * RENDER_SCALE;
				const drawHeightRaw = tintCanvas.height * resolvedSnapshot.iconScale * RENDER_SCALE;
				const drawXRaw = RENDER_CENTER - drawWidthRaw / 2 + resolvedSnapshot.iconOffsetX * RENDER_SCALE;
				const drawYRaw = RENDER_CENTER - drawHeightRaw / 2 + resolvedSnapshot.iconOffsetY * RENDER_SCALE;
				const iconRaster = measureStage("rasterizeIcon", () => resolveIconRaster(tintCanvas, resolvedSnapshot.iconColor, drawXRaw, drawYRaw, drawWidthRaw, drawHeightRaw));

				measureStage("outerShadow", () => {
					drawIconOuterShadow(renderCtx, iconRaster.canvas, iconRaster.x, iconRaster.y, iconRaster.width, iconRaster.height);
				});
				measureStage("iconBase", () => {
					drawIconBase(renderCtx, iconRaster.canvas, iconRaster.x, iconRaster.y, iconRaster.width, iconRaster.height);
				});
				measureStage("bevel", () => {
					drawIconBevelEffects(renderCtx, iconRaster.canvas, iconRaster.x, iconRaster.y, iconRaster.width, iconRaster.height);
				});
			}
			measureStage("swiatloOverlays", () => {
				drawSwiatloOverlays(renderCtx, {
					enabled: resolvedSnapshot.swiatloEnabled,
					visibility: resolvedSnapshot.swiatloLayerVisibility,
					perfSample,
				});
			});
			measureStage("edgeAA", () => {
				applyCircleEdgeAntiAliasing(renderCtx);
			});
			compositeRenderSignature = nextCompositeSignature;
			compositeRenderSourceCanvas = sourceCanvas;
		}

		configureImageSmoothing(targetCtx);
		targetCtx.globalAlpha = 1;
		targetCtx.globalCompositeOperation = "source-over";
		targetCtx.filter = "none";
		measureStage("present", () => {
			targetCtx.clearRect(0, 0, size, size);
			targetCtx.drawImage(renderTarget, 0, 0, size, size);
		});

		if (includeGuides) {
			measureStage("guides", () => {
				drawGuides(targetCtx, size);
			});
		}

		if (perfSample) {
			perfSample.totalMs = readPerfNow() - totalStart;
			recordRenderPerfSample(perfSample);
		}
	}

	function drawGuides(ctx, size = OUTPUT_SIZE) {
		const scale = size / OUTPUT_SIZE;
		const center = size / 2;
		const innerRadius = INNER_RADIUS * scale;
		ctx.save();
		const outerLineWidth = Math.max(1, Math.round(scale));
		ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
		ctx.beginPath();
		ctx.rect(0, 0, size, size);
		ctx.rect(outerLineWidth, outerLineWidth, size - outerLineWidth * 2, size - outerLineWidth * 2);
		ctx.fill("evenodd");

		ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
		ctx.beginPath();
		ctx.moveTo(center, 0);
		ctx.lineTo(center, size);
		ctx.moveTo(0, center);
		ctx.lineTo(size, center);
		ctx.stroke();
		ctx.restore();
	}

	function onPreviewPointerDown(event) {
		if (!hasSource) {
			return;
		}
		const canvas = previewCanvasEl;
		if (!canvas) {
			return;
		}
		isDragging = true;
		dragPointerId = event.pointerId;
		dragLastClientX = event.clientX;
		dragLastClientY = event.clientY;
		historySuspended = true;
		canvas.setPointerCapture(event.pointerId);
		resetMessages();
	}

	function onPreviewPointerMove(event) {
		if (!isDragging || event.pointerId !== dragPointerId || !previewCanvasEl) {
			return;
		}
		const rect = previewCanvasEl.getBoundingClientRect();
		if (!rect.width || !rect.height) {
			return;
		}

		const deltaClientX = event.clientX - dragLastClientX;
		const deltaClientY = event.clientY - dragLastClientY;
		const scaledX = deltaClientX * (OUTPUT_SIZE / rect.width);
		const scaledY = deltaClientY * (OUTPUT_SIZE / rect.height);
		iconOffsetX = clampOffset(iconOffsetX + scaledX, iconOffsetX);
		iconOffsetY = clampOffset(iconOffsetY + scaledY, iconOffsetY);
		dragLastClientX = event.clientX;
		dragLastClientY = event.clientY;
	}

	function endPreviewDrag(event) {
		if (!isDragging || event.pointerId !== dragPointerId || !previewCanvasEl) {
			return;
		}
		isDragging = false;
		previewCanvasEl.releasePointerCapture(event.pointerId);
		dragPointerId = -1;
		historySuspended = false;
		commitHistoryCheckpoint();
		statusMessage = "Icon position updated.";
	}

	function onPreviewKeyDown(event) {
		if (!hasSource) {
			return;
		}
		const step = event.shiftKey ? 10 : 1;
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			iconOffsetX = clampOffset(iconOffsetX - step, iconOffsetX);
			return;
		}
		if (event.key === "ArrowRight") {
			event.preventDefault();
			iconOffsetX = clampOffset(iconOffsetX + step, iconOffsetX);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			iconOffsetY = clampOffset(iconOffsetY - step, iconOffsetY);
			return;
		}
		if (event.key === "ArrowDown") {
			event.preventDefault();
			iconOffsetY = clampOffset(iconOffsetY + step, iconOffsetY);
		}
	}

	function onScaleInput(value) {
		iconScale = clampScale(value);
		queueInteractivePreview();
	}

	function onOffsetXInput(value) {
		iconOffsetX = clampOffset(value, iconOffsetX);
		queueInteractivePreview();
	}

	function onOffsetYInput(value) {
		iconOffsetY = clampOffset(value, iconOffsetY);
		queueInteractivePreview();
	}

	function applyColorFromPicker(kind, normalized) {
		if (kind === "primary") {
			primaryColor = normalized;
			primaryColorHexInput = normalized;
		} else {
			iconColor = normalized;
			iconColorHexInput = normalized;
		}
		queueInteractivePreview();
	}

	function clearColorPickerDebounce(kind) {
		if (kind === "primary") {
			if (primaryColorPickerDebounceId) {
				clearTimeout(primaryColorPickerDebounceId);
				primaryColorPickerDebounceId = 0;
			}
			return;
		}
		if (iconColorPickerDebounceId) {
			clearTimeout(iconColorPickerDebounceId);
			iconColorPickerDebounceId = 0;
		}
	}

	function updateColorFromPicker(kind, value, immediate = false) {
		const fallback = kind === "primary" ? DEFAULT_PRIMARY_COLOR : DEFAULT_ICON_COLOR;
		const normalized = sanitizeHexColor(value, fallback);
		clearColorPickerDebounce(kind);
		if (immediate) {
			applyColorFromPicker(kind, normalized);
			return;
		}
		const nextId = setTimeout(() => {
			applyColorFromPicker(kind, normalized);
			if (kind === "primary") {
				primaryColorPickerDebounceId = 0;
			} else {
				iconColorPickerDebounceId = 0;
			}
		}, COLOR_PICKER_DEBOUNCE_MS);
		if (kind === "primary") {
			primaryColorPickerDebounceId = nextId;
		} else {
			iconColorPickerDebounceId = nextId;
		}
	}

	function updateColorFromHex(kind, value) {
		const draft = String(value || "");
		if (kind === "primary") {
			primaryColorHexInput = draft;
		} else {
			iconColorHexInput = draft;
		}

		const parsed = parseHexInput(draft);
		if (!parsed) {
			return;
		}

		if (kind === "primary") {
			primaryColor = parsed;
		} else {
			iconColor = parsed;
		}
		queueInteractivePreview();
	}

	function syncColorHexDraft(kind) {
		if (kind === "primary") {
			primaryColorHexInput = sanitizeHexColor(primaryColor, DEFAULT_PRIMARY_COLOR);
			return;
		}
		iconColorHexInput = sanitizeHexColor(iconColor, DEFAULT_ICON_COLOR);
	}

	function formatColorDisplay(color, fallback) {
		const hex = sanitizeHexColor(color, fallback);
		const rgb = hexToRgb(hex);
		const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
		return {
			hex: hex.toUpperCase(),
			rgb: `(${rgb.r}, ${rgb.g}, ${rgb.b})`,
			hsl: `(${hsl.h}deg ${hsl.s}% ${hsl.l}%)`,
		};
	}

	function relativeLuminanceChannel(channel) {
		const normalized = clamp(channel, 0, 255) / 255;
		return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
	}

	function relativeLuminance(hex) {
		const rgb = hexToRgb(hex);
		return 0.2126 * relativeLuminanceChannel(rgb.r) + 0.7152 * relativeLuminanceChannel(rgb.g) + 0.0722 * relativeLuminanceChannel(rgb.b);
	}

	function contrastRatio(hexA, hexB) {
		const luminanceA = relativeLuminance(hexA);
		const luminanceB = relativeLuminance(hexB);
		const lighter = Math.max(luminanceA, luminanceB);
		const darker = Math.min(luminanceA, luminanceB);
		return (lighter + 0.05) / (darker + 0.05);
	}

	function hueDistance(hueA, hueB) {
		const delta = Math.abs(Number(hueA || 0) - Number(hueB || 0));
		return Math.min(delta, 360 - delta);
	}

	function buildColorLegibilityWarning(backgroundColor, foregroundColor) {
		const backgroundHex = sanitizeHexColor(backgroundColor, DEFAULT_PRIMARY_COLOR);
		const foregroundHex = sanitizeHexColor(foregroundColor, DEFAULT_ICON_COLOR);
		const contrast = contrastRatio(backgroundHex, foregroundHex);
		const backgroundRgb = hexToRgb(backgroundHex);
		const foregroundRgb = hexToRgb(foregroundHex);
		const backgroundHsl = rgbToHsl(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b);
		const foregroundHsl = rgbToHsl(foregroundRgb.r, foregroundRgb.g, foregroundRgb.b);
		const lightnessGap = Math.abs(backgroundHsl.l - foregroundHsl.l);
		const saturationGap = Math.abs(backgroundHsl.s - foregroundHsl.s);
		const hueGap = hueDistance(backgroundHsl.h, foregroundHsl.h);

		if (contrast < 1.45 || (lightnessGap < 8 && saturationGap < 18 && hueGap < 20)) {
			return {
				tone: "error",
				text: `Warning: these colors are extremely close (${contrast.toFixed(2)}:1 contrast). The icon may disappear against the background.`,
			};
		}

		if (contrast < 2.1 && lightnessGap < 18) {
			return {
				tone: "warn",
				text: `Low contrast (${contrast.toFixed(2)}:1). Consider separating the background and icon colors more.`,
			};
		}

		return null;
	}

	function captureSuggestionBase() {
		suggestionBasePrimary = sanitizeHexColor(primaryColor, DEFAULT_PRIMARY_COLOR);
		suggestionBaseIcon = sanitizeHexColor(iconColor, DEFAULT_ICON_COLOR);
		suggestionBaseLocked = true;
	}

	function onSuggestionGeneratedCountInput(value) {
		suggestionGeneratedCount = clamp(Math.round(parseNumber(value, suggestionGeneratedCount)), 0, 24);
	}

	function regenerateSuggestions() {
		suggestionSeed = Math.max(1, Math.round(suggestionSeed + 1));
	}

	function wrapHue(value) {
		const mod = value % 360;
		return mod < 0 ? mod + 360 : mod;
	}

	function rgbToHex(r, g, b) {
		const toHex = (channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	}

	function hslToRgb(h, s, l) {
		const hue = wrapHue(h);
		const sat = clamp(s, 0, 100) / 100;
		const light = clamp(l, 0, 100) / 100;
		if (sat === 0) {
			const value = Math.round(light * 255);
			return { r: value, g: value, b: value };
		}
		const c = (1 - Math.abs(2 * light - 1)) * sat;
		const hp = hue / 60;
		const x = c * (1 - Math.abs((hp % 2) - 1));
		let r1 = 0;
		let g1 = 0;
		let b1 = 0;
		if (hp >= 0 && hp < 1) {
			r1 = c;
			g1 = x;
		} else if (hp >= 1 && hp < 2) {
			r1 = x;
			g1 = c;
		} else if (hp >= 2 && hp < 3) {
			g1 = c;
			b1 = x;
		} else if (hp >= 3 && hp < 4) {
			g1 = x;
			b1 = c;
		} else if (hp >= 4 && hp < 5) {
			r1 = x;
			b1 = c;
		} else {
			r1 = c;
			b1 = x;
		}
		const m = light - c / 2;
		return {
			r: Math.round((r1 + m) * 255),
			g: Math.round((g1 + m) * 255),
			b: Math.round((b1 + m) * 255),
		};
	}

	function transformColor(hex, options = {}) {
		const rgb = hexToRgb(hex);
		const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
		const nextH = wrapHue(hsl.h + (options.hShift || 0));
		const nextS = clamp(hsl.s * (options.sMult ?? 1) + (options.sAdd || 0), 0, 100);
		const nextL = clamp(hsl.l * (options.lMult ?? 1) + (options.lAdd || 0), 0, 100);
		const nextRgb = hslToRgb(nextH, nextS, nextL);
		return rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
	}

	function applyColorLocks(baseHex, candidateHex, options = {}) {
		if (!options.lockHue && !options.lockSaturation) {
			return sanitizeHexColor(candidateHex, baseHex);
		}
		const baseRgb = hexToRgb(baseHex);
		const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
		const candidateRgb = hexToRgb(candidateHex);
		const candidateHsl = rgbToHsl(candidateRgb.r, candidateRgb.g, candidateRgb.b);
		const lockedH = options.lockHue ? baseHsl.h : candidateHsl.h;
		const lockedS = options.lockSaturation ? baseHsl.s : candidateHsl.s;
		const nextRgb = hslToRgb(lockedH, lockedS, candidateHsl.l);
		return rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
	}

	function createRng(seed) {
		let value = seed >>> 0;
		return () => {
			value += 0x6d2b79f5;
			let t = value;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function buildColorSuggestions(primary, icon, originalPrimary, originalIcon, options = {}) {
		const outer = sanitizeHexColor(primary, DEFAULT_PRIMARY_COLOR);
		const inner = sanitizeHexColor(icon, DEFAULT_ICON_COLOR);
		const originalOuter = sanitizeHexColor(originalPrimary, DEFAULT_PRIMARY_COLOR);
		const originalInner = sanitizeHexColor(originalIcon, DEFAULT_ICON_COLOR);
		const lockOptions = {
			lockHue: options.lockHue === true,
			lockSaturation: options.lockSaturation === true,
		};
		const withLocks = (base, candidate) => applyColorLocks(base, candidate, lockOptions);
		const rows = [
			{ id: "original", label: "Original", primary: originalOuter, icon: originalInner },
			{ id: "current", label: "Current", primary: outer, icon: inner },
			{ id: "swap", label: "Swap", primary: inner, icon: outer },
			{
				id: "complement-pop",
				label: "Complement Pop",
				primary: withLocks(outer, transformColor(outer, { hShift: 24, sAdd: 7, lAdd: -5 })),
				icon: withLocks(inner, transformColor(inner, { hShift: -24, sAdd: -6, lAdd: 10 })),
			},
			{
				id: "split-contrast-a",
				label: "Split Contrast A",
				primary: withLocks(outer, transformColor(outer, { hShift: 18, sAdd: 5, lAdd: -3 })),
				icon: withLocks(inner, transformColor(inner, { hShift: -18, sAdd: -8, lAdd: 9 })),
			},
			{
				id: "split-contrast-b",
				label: "Split Contrast B",
				primary: withLocks(outer, transformColor(outer, { hShift: -18, sAdd: 5, lAdd: -4 })),
				icon: withLocks(inner, transformColor(inner, { hShift: 18, sAdd: -7, lAdd: 10 })),
			},
			{
				id: "deep-contrast",
				label: "Deep Contrast",
				primary: withLocks(outer, transformColor(outer, { hShift: 10, lAdd: -12, sAdd: 8 })),
				icon: withLocks(inner, transformColor(inner, { hShift: -10, lAdd: 14, sAdd: -5 })),
			},
			{
				id: "analogous-wide",
				label: "Analogous Wide",
				primary: withLocks(outer, transformColor(outer, { hShift: 14, sAdd: 4, lAdd: -2 })),
				icon: withLocks(inner, transformColor(inner, { hShift: -14, sAdd: -5, lAdd: 8 })),
			},
		];
		const generatedCount = clamp(Math.round(parseNumber(options.generatedCount, 0)), 0, 24);
		const seed = Math.max(1, Math.round(parseNumber(options.seed, 1)));
		const random = createRng(seed);
		for (let index = 0; index < generatedCount; index += 1) {
			const hueA = (random() > 0.5 ? 1 : -1) * (8 + random() * 28);
			const hueB = (random() > 0.5 ? 1 : -1) * (8 + random() * 28);
			const satA = (random() - 0.5) * 14;
			const satB = (random() - 0.5) * 14;
			const lightA = (random() - 0.5) * 14;
			const lightB = (random() - 0.5) * 16;
			rows.push({
				id: `generated-${seed}-${index}`,
				label: `Suggested ${index + 1}`,
				primary: withLocks(outer, transformColor(outer, { hShift: hueA, sAdd: satA, lAdd: lightA })),
				icon: withLocks(inner, transformColor(inner, { hShift: hueB, sAdd: satB, lAdd: lightB })),
			});
		}
		const unique = [];
		const seen = new Set();
		for (const row of rows) {
			const key = `${row.primary}|${row.icon}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			unique.push(row);
		}
		return unique;
	}

	function applyColorScheme(scheme) {
		const nextPrimary = sanitizeHexColor(scheme?.primary, DEFAULT_PRIMARY_COLOR);
		const nextIcon = sanitizeHexColor(scheme?.icon, DEFAULT_ICON_COLOR);
		primaryColor = nextPrimary;
		iconColor = nextIcon;
		primaryColorHexInput = nextPrimary;
		iconColorHexInput = nextIcon;
		queueInteractivePreview();
		resetMessages();
		statusMessage = `Applied color scheme: ${scheme?.label || "Custom"}.`;
	}

	function hexToRgb(hex) {
		const value = sanitizeHexColor(hex, "#000000").replace("#", "");
		return {
			r: Number.parseInt(value.slice(0, 2), 16),
			g: Number.parseInt(value.slice(2, 4), 16),
			b: Number.parseInt(value.slice(4, 6), 16),
		};
	}

	function rgbToHsl(r, g, b) {
		const red = clamp(r, 0, 255) / 255;
		const green = clamp(g, 0, 255) / 255;
		const blue = clamp(b, 0, 255) / 255;

		const max = Math.max(red, green, blue);
		const min = Math.min(red, green, blue);
		const delta = max - min;

		let hue = 0;
		if (delta > 0) {
			if (max === red) {
				hue = ((green - blue) / delta) % 6;
			} else if (max === green) {
				hue = (blue - red) / delta + 2;
			} else {
				hue = (red - green) / delta + 4;
			}
		}

		hue = Math.round((hue * 60 + 360) % 360);
		const lightness = (max + min) / 2;
		const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

		return {
			h: hue,
			s: Math.round(saturation * 100),
			l: Math.round(lightness * 100),
		};
	}

	async function downloadPng() {
		if (exportBusy) {
			return;
		}
		if (!outputCanvasEl) {
			errorMessage = "Preview is not ready.";
			return;
		}
		exportBusy = true;
		errorMessage = "";
		await tick();
		await waitForPaint();
		try {
			flushRender({ includeOutput: true, includeCompare: false, label: "Preparing export..." });
			const blob = await new Promise((resolve, reject) => {
				outputCanvasEl.toBlob((nextBlob) => {
					if (!nextBlob) {
						reject(new Error("PNG export failed."));
						return;
					}
					resolve(nextBlob);
				}, "image/png");
			});
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = outputName;
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 0);
			resetMessages();
			statusMessage = `Exported ${outputName}.`;
		} catch (error) {
			errorMessage = error?.message || "PNG export failed.";
		} finally {
			exportBusy = false;
		}
	}
</script>

<section class="civ-icon-maker-page">
	{#if !hasSource}
		<section class="civ-icon-upload-panel">
			<h1 class="civ-icon-title">Civ Icon Maker</h1>
			<p class="civ-icon-copy">Upload a transparent PNG at least 256 x 256 in size to start.</p>

			<label
				class="civ-icon-dropzone"
				class:is-drag-over={isDragOver}
				ondragenter={onDropzoneDragEnter}
				ondragover={onDropzoneDragOver}
				ondragleave={onDropzoneDragLeave}
				ondrop={onDropzoneDrop}
			>
				<span class="civ-icon-dropzone-copy">
					{#if isDragOver}
						Drop PNG here
					{:else}
						Drag and drop a PNG here, or click to upload
					{/if}
				</span>
				<input type="file" accept="image/png" onchange={(event) => onFileChange(event.currentTarget.files)} />
			</label>

			{#if errorMessage}
				<p class="civ-icon-status civ-icon-error">{errorMessage}</p>
			{/if}
			{#if statusMessage}
				<p class="civ-icon-status civ-icon-success">{statusMessage}</p>
			{/if}
		</section>
	{:else}
		<section class="civ-icon-workspace">
			<div class="civ-icon-preview-column">
				<h1 class="civ-icon-title">Civ Icon Maker</h1>
				<p class="civ-icon-copy">
					{sourceName} - {sourceWidth} x {sourceHeight} px - alpha {alphaPixelWidth} x {alphaPixelHeight} px
				</p>

				<div class="civ-icon-preview-wrap">
					<p class="civ-icon-preview-note" role="note">Web Preview is approximate styling. Download PNG for accurate post-processing.</p>
					{#if activityMessage}
						<div class="civ-icon-activity-overlay" role="status" aria-live="polite">
							<p class="civ-icon-activity">
								<span class="civ-icon-spinner" aria-hidden="true"></span>
								{activityMessage}
							</p>
						</div>
					{/if}
					<div class={`civ-icon-preview-stack ${compareEnabled ? "is-compare" : ""}`}>
						<div class="civ-icon-preview-pane">
							<span class="civ-icon-preview-pane-label">Current</span>
							<canvas
								class={`civ-icon-preview ${isDragging ? "is-dragging" : ""}`}
								bind:this={previewCanvasEl}
								tabindex="0"
								aria-label="Civ icon preview canvas"
								onpointerdown={onPreviewPointerDown}
								onpointermove={onPreviewPointerMove}
								onpointerup={endPreviewDrag}
								onpointercancel={endPreviewDrag}
								onkeydown={onPreviewKeyDown}
							></canvas>
						</div>
						{#if compareEnabled}
							<div class="civ-icon-preview-pane">
								<span class="civ-icon-preview-pane-label">Reference</span>
								<canvas class="civ-icon-preview civ-icon-preview-reference" bind:this={compareCanvasEl} tabindex="-1" aria-label="Reference compare preview"></canvas>
							</div>
						{/if}
					</div>
				</div>

				<p class="civ-icon-copy">Drag to move icon. Arrow keys nudge by 1px, Shift+Arrow nudges by 10px.</p>

				<div class="civ-icon-action-row">
					<button type="button" class="civ-icon-button civ-icon-button-subtle" onclick={undoChange} disabled={!canUndo}>Undo</button>
					<button type="button" class="civ-icon-button civ-icon-button-subtle" onclick={redoChange} disabled={!canRedo}>Redo</button>
				</div>

				<p class="civ-icon-copy">Undo stores up to 5 recent edits.</p>
			</div>

			<aside class="civ-icon-controls-panel" aria-label="Icon controls">
				<section class="civ-icon-control-group">
					<h2 class="civ-icon-subtitle">Colors</h2>
					<div class="color-row">
						<div class="color-field">
							<label class="civ-icon-input-label">
								Background (Circle)
								<div class="color-picker-row">
									<div class="color-swatch-control">
										<input
											type="color"
											value={primaryColor}
											oninput={(event) => updateColorFromPicker("primary", event.currentTarget.value)}
											onchange={(event) => updateColorFromPicker("primary", event.currentTarget.value, true)}
											aria-label="Primary color"
										/>
										<span class="color-preview" style={`--preview:${primaryColorDisplay.hex}`} aria-hidden="true"></span>
									</div>
									<input
										type="text"
										class="color-hex-input"
										inputmode="text"
										spellcheck="false"
										placeholder={DEFAULT_PRIMARY_COLOR}
										value={primaryColorHexInput}
										oninput={(event) => updateColorFromHex("primary", event.currentTarget.value)}
										onblur={() => syncColorHexDraft("primary")}
									/>
								</div>
							</label>
							<div class="color-values">
								<span class="color-value">HEX {primaryColorDisplay.hex}</span>
								<span class="color-value">RGB {primaryColorDisplay.rgb}</span>
								<span class="color-value">HSL {primaryColorDisplay.hsl}</span>
							</div>
						</div>

						<div class="color-field">
							<label class="civ-icon-input-label">
								Icon (Alpha)
								<div class="color-picker-row">
									<div class="color-swatch-control">
										<input
											type="color"
											value={iconColor}
											oninput={(event) => updateColorFromPicker("icon", event.currentTarget.value)}
											onchange={(event) => updateColorFromPicker("icon", event.currentTarget.value, true)}
											aria-label="Icon color"
										/>
										<span class="color-preview" style={`--preview:${iconColorDisplay.hex}`} aria-hidden="true"></span>
									</div>
									<input
										type="text"
										class="color-hex-input"
										inputmode="text"
										spellcheck="false"
										placeholder={DEFAULT_ICON_COLOR}
										value={iconColorHexInput}
										oninput={(event) => updateColorFromHex("icon", event.currentTarget.value)}
										onblur={() => syncColorHexDraft("icon")}
									/>
								</div>
							</label>
							<div class="color-values">
								<span class="color-value">HEX {iconColorDisplay.hex}</span>
								<span class="color-value">RGB {iconColorDisplay.rgb}</span>
								<span class="color-value">HSL {iconColorDisplay.hsl}</span>
							</div>
						</div>
					</div>
					{#if colorLegibilityWarning}
						<p class={`civ-icon-status civ-icon-legibility-warning civ-icon-legibility-warning-${colorLegibilityWarning.tone}`}>
							{colorLegibilityWarning.text}
						</p>
					{/if}
					<div class="civ-icon-action-row">
						<button type="button" class="civ-icon-button civ-icon-button-ghost" onclick={captureCompareReference} disabled={!hasSource}>Set Reference</button>
						<label class="civ-icon-inline-toggle">
							<input type="checkbox" checked={compareEnabled} onchange={(event) => onCompareToggle(event.currentTarget.checked)} />
							<span>A/B Compare</span>
						</label>
					</div>
				</section>

				<section class="civ-icon-control-group">
					<h2 class="civ-icon-subtitle">Transform</h2>
					<label class="civ-icon-input-label">
						Scale
						<div class="civ-icon-scale-row">
							<input type="range" min={String(minScale)} max={String(maxScale)} step="0.01" value={String(iconScale)} oninput={(event) => onScaleInput(event.currentTarget.value)} />
							<input type="number" min={String(minScale)} max={String(maxScale)} step="0.01" value={String(iconScale)} oninput={(event) => onScaleInput(event.currentTarget.value)} />
						</div>
					</label>

					<div class="civ-icon-offset-row">
						<label class="civ-icon-input-label">
							Offset X
							<input
								type="number"
								min={String(MIN_OFFSET)}
								max={String(MAX_OFFSET)}
								step="0.25"
								value={String(iconOffsetX)}
								oninput={(event) => onOffsetXInput(event.currentTarget.value)}
							/>
						</label>
						<label class="civ-icon-input-label">
							Offset Y
							<input
								type="number"
								min={String(MIN_OFFSET)}
								max={String(MAX_OFFSET)}
								step="0.25"
								value={String(iconOffsetY)}
								oninput={(event) => onOffsetYInput(event.currentTarget.value)}
							/>
						</label>
					</div>
					<div class="civ-icon-actions">
						<div class="civ-icon-action-row">
							<button type="button" class="civ-icon-button civ-icon-button-subtle" onclick={autoCenterFromAlpha}>Auto Center</button>
							<button type="button" class="civ-icon-button civ-icon-button-subtle" onclick={applyFitScale}>Fit Scale</button>
							<button type="button" class="civ-icon-button civ-icon-button-subtle" onclick={resetTransform}>Reset Transform</button>
						</div>
					</div>
					<p class="civ-icon-copy">Fit Scale keeps an inner guard.</p>
				</section>

				<section class="civ-icon-control-group civ-icon-swiatlo-group">
					<div class="civ-icon-swiatlo-head">
						<h2 class="civ-icon-subtitle">Light Overlays</h2>
						<label class="civ-icon-swiatlo-toggle">
							<input type="checkbox" checked={swiatloEnabled} onchange={(event) => (swiatloEnabled = event.currentTarget.checked)} />
							<span>{swiatloEnabled ? "Enabled" : "Disabled"}</span>
						</label>
					</div>
					<details class="civ-icon-swiatlo-accordion">
						<summary>Preset and Mix</summary>
						<div class="civ-icon-swiatlo-accordion-body">
							<label class="civ-icon-input-label">
								Preset
								<select value={swiatloPresetId} onchange={(event) => applySwiatloPreset(event.currentTarget.value)}>
									{#each SWIATLO_PRESETS as preset (preset.id)}
										<option value={preset.id}>{preset.label}</option>
									{/each}
								</select>
							</label>
							<details class="civ-icon-swiatlo-layers-accordion">
								<summary>Layer Visibility</summary>
								<div class="civ-icon-swiatlo-list" role="list" aria-label="Light layers">
									{#each SWIATLO_LAYER_DEFS as layer (layer.id)}
										<div class={`civ-icon-swiatlo-row ${swiatloActiveLayerId === layer.id ? "is-active" : ""}`} role="listitem">
											<button type="button" class="civ-icon-swiatlo-main" onclick={() => selectSwiatloLayer(layer.id)}>
												<span class="civ-icon-swiatlo-thumb" style={swiatloThumbStyle(layer.id)} aria-hidden="true"></span>
												<span>{layer.label}</span>
											</button>
											<button
												type="button"
												class={`civ-icon-swiatlo-eye ${isSwiatloLayerVisible(layer.id) ? "is-visible" : ""}`}
												onclick={() => toggleSwiatloLayer(layer.id)}
												aria-label={`Toggle ${layer.label}`}
											>
												{isSwiatloLayerVisible(layer.id) ? "◉" : "○"}
											</button>
										</div>
									{/each}
								</div>
							</details>
							<p class="civ-icon-copy">Auto preset starts with <strong>Main Flash</strong>, matching the layered glossy badge look.</p>
						</div>
					</details>
				</section>

				<!-- <section class="civ-icon-control-group">
					<div class="civ-icon-suggestions-head">
						<h2 class="civ-icon-subtitle">Render Timings</h2>
						<p class="civ-icon-copy">Measure full composite passes and overlay timings to find the dominant hot path.</p>
					</div>
					<div class="civ-icon-action-row">
						<label class="civ-icon-inline-toggle">
							<input type="checkbox" checked={perfInstrumentationEnabled} onchange={(event) => onPerfInstrumentationToggle(event.currentTarget.checked)} />
							<span>Instrument composite renders</span>
						</label>
						<button type="button" class="civ-icon-button civ-icon-button-subtle" onclick={clearRenderPerfSamples} disabled={renderPerfSamples.length === 0}> Clear Samples </button>
					</div>
					{#if perfInstrumentationEnabled && latestRenderPerfSample}
						<div class="civ-icon-perf-summary">
							<span>Latest {latestRenderPerfSample.targetLabel} render</span>
							<strong>{formatTimingMs(latestRenderPerfSample.totalMs)}</strong>
						</div>
						<ul class="civ-icon-perf-list" aria-label="Render stage timings">
							{#each latestRenderPerfStageRows as row (row.id)}
								<li>
									<span>{row.label}</span>
									<strong>{formatTimingMs(row.durationMs)}</strong>
								</li>
							{/each}
						</ul>
						{#if latestRenderPerfOverlayRows.length > 0}
							<p class="civ-icon-copy">Overlay passes</p>
							<ul class="civ-icon-perf-list civ-icon-perf-list--compact" aria-label="Overlay layer timings">
								{#each latestRenderPerfOverlayRows as row (`${row.id}-${row.mode}`)}
									<li>
										<span>{row.label} <code>{row.mode}</code></span>
										<strong>{formatTimingMs(row.durationMs)}</strong>
									</li>
								{/each}
							</ul>
						{/if}
					{:else if perfInstrumentationEnabled}
						<p class="civ-icon-copy">Adjust scale, colors, overlays, or compare state to capture timings.</p>
					{/if}
				</section> -->

				<div class="civ-icon-actions">
					<div class="civ-icon-action-row">
						<button type="button" class="civ-icon-button civ-icon-button-primary" onclick={downloadPng} disabled={exportBusy}>
							{exportBusy ? "Exporting..." : "Download"}
						</button>
						<button type="button" class="civ-icon-button civ-icon-button-ghost" onclick={resetToUpload}>Upload New</button>
						<button type="button" class="civ-icon-button civ-icon-button-danger" onclick={resetAll}>Reset Settings</button>
					</div>
				</div>

				{#if errorMessage}
					<strong class="civ-icon-status civ-icon-error">{errorMessage}</strong>
				{/if}
				{#if statusMessage}
					<strong class="civ-icon-status civ-icon-success">{statusMessage}</strong>
				{/if}
			</aside>

			<canvas class="civ-icon-output-hidden" bind:this={outputCanvasEl} aria-hidden="true"></canvas>
		</section>

		<section class="civ-icon-suggestions">
			<div class="civ-icon-suggestions-head">
				<h2 class="civ-icon-subtitle">Color Scheme Suggestions</h2>
				<p class="civ-icon-copy">Click a pair to apply it to the icon. Outer color maps to circle, inner color maps to alpha.</p>
			</div>
			<div class="civ-icon-suggestion-controls">
				<label class="civ-icon-inline-toggle">
					<input type="checkbox" checked={suggestionLockHue} onchange={(event) => (suggestionLockHue = event.currentTarget.checked)} />
					<span>Lock Hue</span>
				</label>
				<label class="civ-icon-inline-toggle">
					<input type="checkbox" checked={suggestionLockSaturation} onchange={(event) => (suggestionLockSaturation = event.currentTarget.checked)} />
					<span>Lock Saturation</span>
				</label>
				<label class="civ-icon-inline-number">
					<span>Generated</span>
					<input type="number" min="0" max="24" step="1" value={String(suggestionGeneratedCount)} oninput={(event) => onSuggestionGeneratedCountInput(event.currentTarget.value)} />
				</label>
				<button type="button" class="civ-icon-button civ-icon-button-subtle" onclick={regenerateSuggestions}>Generate Again</button>
			</div>
			<ul class="civ-icon-scheme-grid" aria-label="Color scheme suggestions">
				{#each suggestedColorSchemes as scheme (scheme.id)}
					<li class="civ-icon-scheme-item">
						<button
							type="button"
							class="civ-icon-scheme-card"
							onclick={() => applyColorScheme(scheme)}
							style={`--scheme-outer:${scheme.primary};--scheme-inner:${scheme.icon};`}
							aria-label={`Apply ${scheme.label} scheme`}
						>
							<span class="civ-icon-scheme-title">{scheme.label}</span>
							<span class="civ-icon-scheme-preview" aria-hidden="true">
								<span class="civ-icon-scheme-inner-square"></span>
							</span>
							<span class="civ-icon-scheme-values">
								<span class="civ-icon-scheme-color-title">Background</span>
								<span class="color-value">HEX {scheme.primaryDisplay.hex}</span>
								<span class="color-value">RGB {scheme.primaryDisplay.rgb}</span>
								<span class="color-value">HSL {scheme.primaryDisplay.hsl}</span>
							</span>
							<span class="civ-icon-scheme-values">
								<span class="civ-icon-scheme-color-title">Icon</span>
								<span class="color-value">HEX {scheme.iconDisplay.hex}</span>
								<span class="color-value">RGB {scheme.iconDisplay.rgb}</span>
								<span class="color-value">HSL {scheme.iconDisplay.hsl}</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</section>

<style>
	.civ-icon-maker-page {
		display: grid;
	}

	.civ-icon-upload-panel,
	.civ-icon-workspace,
	.civ-icon-suggestions {
		display: grid;
		gap: 1rem;
		background: var(--panel-bg);
		box-shadow: 0 2px 4px var(--shadow-soft);
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 1rem;
		padding: 1rem;
	}

	.civ-icon-upload-panel {
		max-inline-size: 760px;
	}

	.civ-icon-workspace {
		align-items: start;
		grid-template-columns: minmax(0, 1fr) minmax(300px, 400px);
	}

	.civ-icon-suggestions {
		margin-top: 0.95rem;
	}

	.civ-icon-suggestions-head {
		display: grid;
		gap: 0.35rem;
	}

	.civ-icon-suggestion-controls {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
	}

	.civ-icon-inline-toggle {
		align-items: center;
		display: inline-flex;
		gap: 0.35rem;
		color: var(--muted-ink);
		font-size: 0.82rem;
	}

	.civ-icon-inline-number {
		align-items: center;
		display: inline-flex;
		gap: 0.38rem;
		color: var(--muted-ink);
		font-size: 0.82rem;
	}

	.civ-icon-inline-number input[type="number"] {
		inline-size: 72px;
	}

	.civ-icon-scheme-grid {
		display: grid;
		gap: 0.65rem;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.civ-icon-scheme-item {
		min-inline-size: 0;
	}

	.civ-icon-scheme-card {
		cursor: pointer;
		inline-size: 100%;
		display: grid;
		gap: 0.5rem;
		color: var(--ink);
		text-align: left;
		background: color-mix(in oklch, var(--panel-bg) 90%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 0.7rem;
		padding: 1.25rem;
		transition:
			transform 0.12s ease,
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}

	.civ-icon-scheme-card:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 10px color-mix(in oklch, var(--shadow-soft) 70%, transparent);
		border-color: color-mix(in oklch, var(--accent) 44%, var(--panel-border));
	}

	.civ-icon-scheme-title {
		font-size: 1.125rem;
		font-weight: 620;
	}

	.civ-icon-scheme-preview {
		position: relative;
		block-size: 12rem;
		inline-size: 12rem;
		display: block;
		background: var(--scheme-outer);
		border-radius: 0.35rem;
		overflow: hidden;
	}

	.civ-icon-scheme-inner-square {
		inset-block-start: 3rem;
		inset-inline-start: 3rem;
		position: absolute;
		block-size: 6rem;
		inline-size: 6rem;
		border-left: 6rem solid var(--scheme-inner);
	}

	.civ-icon-scheme-values {
		display: grid;
		gap: 0.1rem;
	}

	.civ-icon-scheme-color-title {
		color: var(--ink);
		opacity: 0.88;
		font-size: 0.72rem;
		font-weight: 600;
	}

	.civ-icon-title {
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: clamp(1.08rem, 1.4vw, 1.35rem);
		text-box: trim-both cap alphabetic;
		margin: 0;
	}

	.civ-icon-subtitle {
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 0.98rem;
		margin: 0;
	}

	.civ-icon-copy {
		color: var(--muted-ink);
		font-size: 0.88rem;
		line-height: 1.35;
		margin: 0;
	}

	.civ-icon-dropzone {
		display: grid;
		place-items: center;
		position: relative;
		border-radius: 0.8rem;
		padding: 1rem;
		min-block-size: 132px;
		cursor: pointer;
		background: color-mix(in oklch, var(--accent) 8%, var(--control-bg));
		border: 2px dashed color-mix(in oklch, var(--accent) 35%, var(--panel-border));
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease;

		&.is-drag-over {
			background: color-mix(in oklch, var(--accent) 18%, var(--control-bg));
			border-color: color-mix(in oklch, var(--accent) 62%, var(--panel-border));
		}
	}

	.civ-icon-dropzone-copy {
		color: var(--muted-ink);
		font-size: 0.95rem;
		text-align: center;
	}

	.civ-icon-dropzone input[type="file"] {
		inset: 0;
		position: absolute;
		cursor: pointer;
		opacity: 0;
	}

	.civ-icon-preview-column {
		display: grid;
		gap: 0.75rem;
	}

	.civ-icon-preview-wrap {
		display: grid;
		gap: 0.6rem;
		place-items: center;
		position: relative;
		background-size: 26px 26px;
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		border-radius: 0.7rem;
		padding: 1rem;
		background:
			linear-gradient(45deg, color-mix(in oklch, var(--control-bg) 70%, black) 25%, transparent 25%, transparent 75%, color-mix(in oklch, var(--control-bg) 70%, black) 75%),
			linear-gradient(45deg, color-mix(in oklch, var(--control-bg) 90%, black) 25%, transparent 25%, transparent 75%, color-mix(in oklch, var(--control-bg) 90%, black) 75%);
		background-position:
			0 0,
			13px 13px;
	}

	.civ-icon-preview-note {
		color: color-mix(in oklch, white 88%, var(--ink));
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		line-height: 1.2;
		background: color-mix(in oklch, var(--panel-bg) 62%, black 38%);
		box-shadow: 0 1px 2px color-mix(in oklch, black 30%, transparent);
		border: 1px solid color-mix(in oklch, white 16%, var(--panel-border));
		border-radius: 999px;
		padding: 0.24rem 0.62rem;
		margin: 0;
	}

	.civ-icon-activity-overlay {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: color-mix(in oklch, var(--panel-bg) 34%, transparent);
		backdrop-filter: blur(2px);
		border-radius: inherit;
		z-index: 2;
		pointer-events: none;
	}

	.civ-icon-activity {
		align-items: center;
		display: inline-flex;
		gap: 0.5rem;
		color: color-mix(in oklch, white 92%, var(--ink));
		font-size: 0.78rem;
		font-weight: 600;
		line-height: 1.2;
		background: color-mix(in oklch, var(--accent) 18%, var(--panel-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 42%, var(--panel-border));
		box-shadow:
			0 10px 30px color-mix(in oklch, black 28%, transparent),
			0 0 0 1px color-mix(in oklch, white 8%, transparent) inset;
		border-radius: 999px;
		padding: 0.6rem 0.95rem;
		margin: 0;
	}

	.civ-icon-spinner {
		inline-size: 0.8rem;
		block-size: 0.8rem;
		border: 2px solid color-mix(in oklch, white 18%, transparent);
		border-top-color: color-mix(in oklch, white 88%, var(--ink));
		border-radius: 999px;
		animation: civ-icon-spin 0.8s linear infinite;
		flex: 0 0 auto;
	}

	.civ-icon-preview-stack {
		inline-size: 100%;
		display: grid;
		gap: 0.6rem;
		grid-template-columns: minmax(0, 1fr);
	}

	.civ-icon-preview-stack.is-compare {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.civ-icon-preview-pane {
		display: grid;
		gap: 0.35rem;
		justify-items: center;
	}

	.civ-icon-preview-pane-label {
		color: var(--muted-ink);
		font-size: 0.74rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.civ-icon-preview {
		inline-size: min(72vw, 560px);
		block-size: min(72vw, 560px);
		max-inline-size: 100%;
		aspect-ratio: 1;
		border-radius: 0.5rem;
		background: transparent;
		outline: none;
		touch-action: none;
		cursor: grab;

		&.is-dragging {
			cursor: grabbing;
		}
	}

	.civ-icon-preview-reference {
		cursor: default;
	}

	.civ-icon-preview-stack.is-compare .civ-icon-preview {
		block-size: min(34vw, 280px);
		inline-size: min(34vw, 280px);
	}

	.civ-icon-preview:focus-visible {
		box-shadow: 0 0 0 2px color-mix(in oklch, var(--accent) 60%, white 10%);
	}

	.civ-icon-controls-panel {
		display: grid;
		gap: 1.25rem;
		background: color-mix(in oklch, var(--panel-bg) 88%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 16%, var(--panel-border));
		border-radius: 0.8rem;
		padding: 1rem;
	}

	.civ-icon-control-group {
		display: grid;
		gap: 0.45rem;
	}

	.civ-icon-perf-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.72rem 0.82rem;
		border-radius: 0.82rem;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, transparent);
		color: color-mix(in oklch, white 82%, var(--ink));
	}

	.civ-icon-perf-summary strong {
		font-size: 0.95rem;
		color: color-mix(in oklch, var(--accent) 52%, white 28%);
	}

	.civ-icon-perf-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.32rem;
	}

	.civ-icon-perf-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.48rem 0.1rem;
		border-top: 1px solid color-mix(in oklch, var(--panel-border) 56%, transparent);
		font-size: 0.86rem;
	}

	.civ-icon-perf-list li:first-child {
		border-top: 0;
		padding-top: 0.1rem;
	}

	.civ-icon-perf-list li span {
		min-inline-size: 0;
		color: color-mix(in oklch, white 78%, var(--ink));
	}

	.civ-icon-perf-list li strong {
		flex: 0 0 auto;
		color: color-mix(in oklch, var(--accent) 44%, white 36%);
	}

	.civ-icon-perf-list--compact li {
		font-size: 0.8rem;
	}

	.civ-icon-controls-panel .civ-icon-input-label {
		display: grid;
		gap: 0.35rem;
		color: var(--muted-ink);
		font-size: 0.86rem;
	}

	.civ-icon-controls-panel input[type="number"],
	.civ-icon-controls-panel input[type="text"],
	.civ-icon-controls-panel input[type="range"] {
		inline-size: 100%;
	}

	.civ-icon-controls-panel input[type="number"],
	.civ-icon-controls-panel input[type="text"] {
		color: var(--ink);
		background: var(--input-bg);
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 0.5rem;
		padding: 0.42rem 0.58rem;
	}

	.civ-icon-controls-panel select {
		color: var(--ink);
		background: var(--input-bg);
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 0.5rem;
		padding: 0.42rem 0.58rem;
	}

	.civ-icon-scale-row {
		align-items: center;
		display: grid;
		gap: 0.45rem;
		grid-template-columns: minmax(0, 1fr) 86px;
	}

	.civ-icon-offset-row {
		display: grid;
		gap: 0.45rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.civ-icon-actions {
		display: grid;
		gap: 0.5rem;
	}

	.civ-icon-action-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.civ-icon-button {
		align-items: center;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		color: var(--ink);
		font-size: 0.84rem;
		font-weight: 550;
		text-decoration: none;
		background: color-mix(in oklch, var(--accent) 10%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 28%, var(--panel-border));
		border-radius: 0.6rem;
		padding: 0.5rem 0.75rem;
		transition:
			transform 0.12s ease,
			background-color 0.12s ease,
			border-color 0.12s ease;
	}

	.civ-icon-button:hover {
		transform: translateY(-1px);
	}

	.civ-icon-button:disabled {
		transform: none;
		cursor: not-allowed;
		opacity: 0.55;
	}

	.civ-icon-button-primary {
		font-weight: 640;
		background: color-mix(in oklch, var(--accent) 28%, var(--control-bg));
		border-color: color-mix(in oklch, var(--accent) 44%, var(--panel-border));
	}

	.civ-icon-button-subtle {
		background: color-mix(in oklch, var(--accent) 11%, var(--control-bg));
	}

	.civ-icon-button-ghost {
		background: color-mix(in oklch, var(--panel-bg) 86%, var(--control-bg));
	}

	.civ-icon-button-danger {
		background: color-mix(in oklch, oklch(0.7 0.14 25) 14%, var(--control-bg));
		border-color: color-mix(in oklch, oklch(0.68 0.16 25) 36%, var(--panel-border));
	}

	@keyframes civ-icon-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.civ-icon-swiatlo-group {
		background: linear-gradient(180deg, hsl(220deg 10% 20% / 0.9), hsl(220deg 10% 13% / 0.92)), color-mix(in oklch, var(--panel-bg) 85%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 0.68rem;
		padding: 1rem;
	}

	.civ-icon-swiatlo-head {
		align-items: center;
		display: flex;
		gap: 0.45rem;
		justify-content: space-between;
	}

	.civ-icon-swiatlo-head .civ-icon-subtitle {
		color: color-mix(in oklch, white 80%, var(--ink));
	}

	.civ-icon-swiatlo-toggle {
		align-items: center;
		display: inline-flex;
		gap: 0.35rem;
		color: color-mix(in oklch, white 72%, var(--ink));
		font-size: 0.78rem;
	}

	.civ-icon-swiatlo-accordion,
	.civ-icon-swiatlo-layers-accordion {
		background: hsl(220deg 10% 14% / 0.88);
		border: 1px solid hsl(0deg 0% 100% / 0.09);
		border-radius: 0.55rem;
	}

	.civ-icon-swiatlo-accordion > summary,
	.civ-icon-swiatlo-layers-accordion > summary {
		cursor: pointer;
		color: color-mix(in oklch, white 78%, var(--ink));
		font-size: 0.82rem;
		font-weight: 600;
		padding: 0.45rem 0.58rem;
	}

	.civ-icon-swiatlo-accordion-body {
		display: grid;
		gap: 0.52rem;
		padding: 0 0.58rem 0.58rem;
	}

	.civ-icon-swiatlo-layers-accordion > summary {
		padding-inline: 0.48rem;
	}

	.civ-icon-swiatlo-list {
		display: grid;
		border: 1px solid hsl(0deg 0% 100% / 0.08);
		border-radius: 0.52rem;
		overflow: hidden;
	}

	.civ-icon-swiatlo-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		background: hsl(220deg 10% 18% / 0.95);
		border-top: 1px solid hsl(0deg 0% 100% / 0.04);
	}

	.civ-icon-swiatlo-row:first-child {
		border-top: 0;
	}

	.civ-icon-swiatlo-row.is-active {
		background: color-mix(in oklch, var(--accent) 62%, hsl(220deg 10% 18%));
	}

	.civ-icon-swiatlo-main {
		align-items: center;
		cursor: pointer;
		display: flex;
		gap: 0.46rem;
		color: color-mix(in oklch, white 82%, var(--ink));
		text-align: left;
		background: transparent;
		border: 0;
		padding: 0.42rem 0.45rem;
	}

	.civ-icon-swiatlo-thumb {
		block-size: 1.35rem;
		inline-size: 2.1rem;
		display: block;
		background-position: center;
		background-repeat: no-repeat;
		background-size: cover;
		box-shadow: inset 0 0 0 1px hsl(0deg 0% 100% / 0.04);
		border: 1px solid hsl(0deg 0% 100% / 0.15);
		border-radius: 0.42rem;
	}

	.civ-icon-swiatlo-eye {
		inline-size: 2rem;
		cursor: pointer;
		color: hsl(0deg 0% 74%);
		font-size: 0.8rem;
		background: hsl(220deg 10% 14% / 0.95);
		border: 0;
		border-left: 1px solid hsl(0deg 0% 100% / 0.08);
	}

	.civ-icon-swiatlo-eye.is-visible {
		color: color-mix(in oklch, var(--accent) 58%, white 22%);
	}

	.civ-icon-output-hidden {
		display: none;
	}

	.civ-icon-status {
		font-size: 0.88rem;
		margin: 0;
	}

	.civ-icon-error {
		color: oklch(0.72 0.17 23);
	}

	.civ-icon-success {
		color: oklch(0.82 0.14 145);
	}

	.civ-icon-legibility-warning {
		padding: 0.7rem 0.85rem;
		border-radius: 0.7rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, transparent);
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.civ-icon-legibility-warning-warn {
		color: oklch(0.82 0.09 82);
		background: color-mix(in oklch, oklch(0.46 0.08 80) 18%, transparent);
		border-color: color-mix(in oklch, oklch(0.72 0.09 82) 45%, var(--panel-border));
	}

	.civ-icon-legibility-warning-error {
		color: oklch(0.77 0.14 28);
		background: color-mix(in oklch, oklch(0.55 0.14 28) 16%, transparent);
		border-color: color-mix(in oklch, oklch(0.72 0.16 28) 48%, var(--panel-border));
	}

	.color-row {
		min-inline-size: 0;
		display: grid;
		gap: 0.5rem;
		grid-template-columns: minmax(0, 1fr);
	}

	.color-field {
		display: grid;
		gap: 0.3rem;
	}

	.color-values {
		display: grid;
		gap: 0.12rem;
		user-select: text;
	}

	.color-picker-row {
		min-inline-size: 0;
		align-items: center;
		display: flex;
		gap: 0.45rem;
	}

	.color-swatch-control {
		position: relative;
		z-index: 0;
		display: block;
		flex: 0 0 2rem;
		inline-size: 2rem;
		block-size: 2rem;
		min-inline-size: 2rem;
		min-block-size: 2rem;
		overflow: hidden;
		border-radius: 0.45rem;

		& input[type="color"] {
			inset: 0;
			position: absolute;
			z-index: 2;
			block-size: 100%;
			inline-size: 100%;
			cursor: pointer;
			opacity: 0;
			background: transparent;
			border: 0;
			padding: 0;
			margin: 0;
			-webkit-appearance: none;
			appearance: none;
		}

		& .color-preview {
			inset: 0;
			position: absolute;
			z-index: 1;
			block-size: 100%;
			inline-size: 100%;
			display: block;
			pointer-events: none;
			background: var(--preview, hsl(0deg 0% 0%));
			box-shadow: inset 0 0 0 1px hsl(0deg 0% 100% / 0.3);
			border: 1px solid var(--panel-border);
			border-radius: inherit;
		}
	}

	.color-hex-input {
		min-inline-size: 0;
		flex: 1;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		text-transform: uppercase;
	}

	.color-value {
		color: var(--muted-ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.74rem;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	:global(:root[data-theme="light"]) .civ-icon-maker-page {
		.civ-icon-preview-wrap {
			border-color: color-mix(in oklch, var(--accent) 12%, var(--panel-border));
			background:
				linear-gradient(45deg, color-mix(in oklch, white 40%, var(--control-bg)) 25%, transparent 25%, transparent 75%, color-mix(in oklch, white 40%, var(--control-bg)) 75%),
				linear-gradient(45deg, color-mix(in oklch, white 95%, var(--panel-border)) 25%, transparent 25%, transparent 75%, color-mix(in oklch, white 90%, var(--panel-border)) 75%);
			background-position:
				0 0,
				13px 13px;
		}

		.civ-icon-preview-note {
			color: color-mix(in oklch, var(--ink) 78%, black 8%);
			background: color-mix(in oklch, white 90%, var(--panel-bg));
			box-shadow: 0 1px 2px color-mix(in oklch, var(--shadow-soft) 50%, transparent);
			border-color: color-mix(in oklch, var(--accent) 14%, var(--panel-border));
		}

		.civ-icon-swiatlo-group {
			background: linear-gradient(180deg, color-mix(in oklch, white 88%, var(--panel-bg)), color-mix(in oklch, white 72%, var(--control-bg)));
			border-color: color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		}

		.civ-icon-swiatlo-head .civ-icon-subtitle,
		.civ-icon-swiatlo-toggle,
		.civ-icon-swiatlo-group .civ-icon-input-label {
			color: color-mix(in oklch, var(--ink) 84%, black 10%);
		}

		.civ-icon-swiatlo-accordion,
		.civ-icon-swiatlo-layers-accordion {
			background: color-mix(in oklch, white 90%, var(--panel-bg));
			border-color: color-mix(in oklch, var(--accent) 14%, var(--panel-border));
		}

		.civ-icon-swiatlo-accordion > summary,
		.civ-icon-swiatlo-layers-accordion > summary {
			color: color-mix(in oklch, var(--ink) 86%, black 8%);
		}

		.civ-icon-swiatlo-list {
			border-color: color-mix(in oklch, var(--accent) 12%, var(--panel-border));
		}

		.civ-icon-swiatlo-row {
			background: color-mix(in oklch, white 86%, var(--panel-bg));
			border-top-color: color-mix(in oklch, var(--accent) 10%, var(--panel-border));
		}

		.civ-icon-swiatlo-row.is-active {
			background: color-mix(in oklch, var(--accent) 24%, white 76%);
		}

		.civ-icon-swiatlo-main {
			color: color-mix(in oklch, var(--ink) 88%, black 6%);
		}

		.civ-icon-swiatlo-eye {
			color: color-mix(in oklch, var(--ink) 64%, black 20%);
			background: color-mix(in oklch, white 82%, var(--control-bg));
			border-left-color: color-mix(in oklch, var(--accent) 14%, var(--panel-border));
		}

		.civ-icon-swiatlo-eye.is-visible {
			color: color-mix(in oklch, var(--accent) 60%, white 18%);
		}

		.civ-icon-preview-pane-label,
		.civ-icon-inline-toggle,
		.civ-icon-inline-number,
		.civ-icon-scheme-color-title,
		.color-value {
			color: color-mix(in oklch, var(--ink) 78%, black 12%);
		}

		.civ-icon-preview-pane-label {
			color: color-mix(in oklch, var(--ink) 86%, black 8%);
			line-height: 1.2;
			background: color-mix(in oklch, white 86%, var(--panel-bg));
			box-shadow: 0 1px 2px color-mix(in oklch, black 8%, transparent);
			border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
			border-radius: 999px;
			padding: 0.12rem 0.48rem;
		}

		.civ-icon-preview-note {
			color: color-mix(in oklch, var(--ink) 88%, black 12%);
			background: color-mix(in oklch, white 92%, var(--panel-bg));
			box-shadow: 0 1px 2px color-mix(in oklch, black 8%, transparent);
			border-color: color-mix(in oklch, var(--accent) 24%, var(--panel-border));
		}

		.civ-icon-scheme-card {
			background: color-mix(in oklch, var(--panel-bg) 94%, white 6%);
			border-color: color-mix(in oklch, var(--accent) 26%, var(--panel-border));
		}

		.civ-icon-scheme-card:hover {
			box-shadow: 0 4px 10px color-mix(in oklch, black 10%, transparent);
			border-color: color-mix(in oklch, var(--accent) 46%, var(--panel-border));
		}

		.civ-icon-success {
			color: oklch(0.56 0.13 145);
		}

		.civ-icon-error {
			color: oklch(0.56 0.2 24);
		}

		.civ-icon-legibility-warning-warn {
			color: oklch(0.45 0.11 82);
			background: color-mix(in oklch, white 76%, oklch(0.78 0.1 84) 24%);
			border-color: color-mix(in oklch, oklch(0.68 0.1 84) 38%, var(--panel-border));
		}

		.civ-icon-legibility-warning-error {
			color: oklch(0.43 0.16 28);
			background: color-mix(in oklch, white 78%, oklch(0.76 0.12 28) 22%);
			border-color: color-mix(in oklch, oklch(0.68 0.14 28) 40%, var(--panel-border));
		}
	}

	@media (max-width: 980px) {
		.civ-icon-workspace {
			grid-template-columns: minmax(0, 1fr);
		}

		.civ-icon-preview {
			block-size: min(86vw, 560px);
			inline-size: min(86vw, 560px);
		}

		.civ-icon-preview-stack.is-compare {
			grid-template-columns: minmax(0, 1fr);
		}

		.civ-icon-preview-stack.is-compare .civ-icon-preview {
			block-size: min(86vw, 560px);
			inline-size: min(86vw, 560px);
		}
	}

	@media (max-width: 700px) {
		.civ-icon-offset-row {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
