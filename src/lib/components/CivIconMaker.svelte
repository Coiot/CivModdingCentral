<script>
	import { onDestroy, onMount } from "svelte";
	import { parseHexInput as parseHexInputUtil, sanitizeHexColor as sanitizeHexColorUtil } from "../map/pins.js";

	const OUTPUT_SIZE = 256;
	const PREVIEW_SIZE = 768;
	const CENTER = OUTPUT_SIZE / 2;
	const INNER_DIAMETER = 172;
	const INNER_RADIUS = INNER_DIAMETER / 2;
	const RENDER_SCALE = 8;
	const RENDER_SIZE = OUTPUT_SIZE * RENDER_SCALE;
	const RENDER_CENTER = CENTER * RENDER_SCALE;
	const RENDER_INNER_RADIUS = INNER_RADIUS * RENDER_SCALE;
	const SWIATLO_SCALE = 1;
	const SWIATLO_OFFSET_X = 0.65;
	const SWIATLO_OFFSET_Y = -0.25;
	const SWIATLO_PIXEL_SNAP = true;
	const SWIATLO_SHARPEN_CONTRAST = 2;
	const FIT_GUARD_PX = 15;
	const FIT_DIAMETER = Math.max(1, INNER_DIAMETER - FIT_GUARD_PX * 2);
	const CIRCLE_EDGE_AA_PX = 2;
	const MIN_OFFSET = -25;
	const MAX_OFFSET = 25;
	const DEFAULT_PRIMARY_COLOR = "#1F4F99";
	const DEFAULT_ICON_COLOR = "#F4DE9A";
	const COLOR_PICKER_DEBOUNCE_MS = 180;
	const STORAGE_KEY = "cmc:civ-icon-maker:v1";
	const STORAGE_VERSION = 1;
	const ICON_EFFECT_SETTINGS = {
		outerShadow: {
			enabled: true,
			color: "#000000",
			opacity: 1,
			blur: 0.1,
			distance: 1,
			angleDeg: 300,
			blendMode: "multiply",
			coreOpacity: 0.5,
			coreBlurMultiplier: 3,
			falloffOpacity: 0.85,
			falloffBlurMultiplier: 2,
			falloffDistanceMultiplier: 2,
			tintFromIcon: true,
			tintOpacity: 0.5,
			tintBlurMultiplier: 0.25,
			tintDistanceMultiplier: 0.5,
			tintSaturationMultiplier: 1,
			tintSaturationAdd: 0,
			tintLightnessAdd: 20,
		},
		bevel: {
			enabled: true,
			angleDeg: 300,
			distance: 0.75,
			blur: 2,
			edgeSoftenPx: 0.5,
			highlightColor: "#FFFFFF",
			highlightOpacity: 0.9,
			highlightBlend: "source-over",
			shadowColor: "#000000",
			shadowOpacity: 1,
			shadowBlend: "multiply",
		},
	};
	const ICON_EDGE_SOFTEN_PX = 0.1;
	const SWIATLO_LAYER_DEFS = [
		{ id: "blik", label: "Top Glint", file: "blik.png", blendMode: "source-over", opacity: 1 },
		{ id: "overlay_flash_3", label: "Arc Highlight", file: "overlay flash 3.png", blendMode: "screen", opacity: 1 },
		{ id: "overlay_flash_2", label: "Main Flash", file: "overlay flash 2.png", blendMode: "overlay", opacity: 1 },
		{ id: "overlay_flash_copy", label: "Upper Sweep", file: "overlay flash copy.png", blendMode: "overlay", opacity: 1 },
		{ id: "overlay_flash_copy_2", label: "Lower Sweep", file: "overlay flash copy 2.png", blendMode: "soft-light", opacity: 1 },
		{ id: "overlay_flash", label: "Soft Flash", file: "overlay flash.png", blendMode: "hard-light", opacity: 1 },
		{ id: "overlay_light_2", label: "Crown Glow", file: "overlay light 2.png", blendMode: "hard-light", opacity: 0.75 },
		{ id: "overlay_light", label: "Face Glow", file: "overlay light.png", blendMode: "overlay", opacity: 1 },
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
	let tintVersionCounter = 0;
	let tintedColorCache = new Map();
	let scaledTintCache = new Map();
	let swiatloImageCache = new Map();
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

	const hasSource = $derived(Boolean(sourceCanvas));
	const sourceWidth = $derived(sourceCanvas?.width || 0);
	const sourceHeight = $derived(sourceCanvas?.height || 0);
	const alphaPixelWidth = $derived(alphaBounds?.width || 0);
	const alphaPixelHeight = $derived(alphaBounds?.height || 0);
	const outputName = $derived(buildOutputName(sourceName));
	const primaryColorDisplay = $derived(formatColorDisplay(primaryColor, DEFAULT_PRIMARY_COLOR));
	const iconColorDisplay = $derived(formatColorDisplay(iconColor, DEFAULT_ICON_COLOR));
	const canUndo = $derived(historyEntries.length > 0);
	const canRedo = $derived(redoEntries.length > 0);
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
		outputCanvasEl;
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
		renderCanvases();
	});

	$effect(() => {
		primaryColor;
		iconColor;
		iconOffsetX;
		iconOffsetY;
		iconScale;
		sourceName;
		persistedSourceDataUrl;
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
		persistState();
	});

	$effect(() => {
		hasSource;
		primaryColor;
		iconColor;
		iconOffsetX;
		iconOffsetY;
		iconScale;
		swiatloEnabled;
		swiatloPresetId;
		swiatloActiveLayerId;
		swiatloLayerVisibility;
		commitHistoryCheckpoint();
	});

	onMount(() => {
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
		resetMessages();
		statusMessage = "Captured compare reference.";
	}

	function onCompareToggle(checked) {
		compareEnabled = checked;
		if (checked && !compareReference) {
			compareReference = createEditorSnapshot();
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
			sourceName,
			sourceDataUrl: persistedSourceDataUrl,
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
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
		} catch {
			// Ignore localStorage write failures.
		}
	}

	async function restorePersistedState() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) {
				storageReady = true;
				return;
			}

			const payload = JSON.parse(raw);
			if (!payload || typeof payload !== "object" || payload.version !== STORAGE_VERSION) {
				storageReady = true;
				return;
			}

			primaryColor = sanitizeHexColor(payload.primaryColor, DEFAULT_PRIMARY_COLOR);
			iconColor = sanitizeHexColor(payload.iconColor, DEFAULT_ICON_COLOR);
			primaryColorHexInput = primaryColor;
			iconColorHexInput = iconColor;
			iconOffsetX = clampOffset(payload.iconOffsetX, 0);
			iconOffsetY = clampOffset(payload.iconOffsetY, 0);
			iconScale = clampScale(payload.iconScale);
			swiatloEnabled = payload.swiatloEnabled !== false;
			swiatloPresetId = resolveSwiatloPreset(payload.swiatloPresetId).id;
			swiatloActiveLayerId = SWIATLO_LAYER_DEFS.some((layer) => layer.id === payload.swiatloActiveLayerId) ? payload.swiatloActiveLayerId : resolveSwiatloPreset(swiatloPresetId).selectedLayerId;
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

			const storedDataUrl = typeof payload.sourceDataUrl === "string" ? payload.sourceDataUrl : "";
			const storedName = typeof payload.sourceName === "string" ? payload.sourceName : "";
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
		const nextCtx = nextCanvas.getContext("2d", { willReadFrequently: true });
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
	}

	function configureImageSmoothing(ctx) {
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";
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

	function deriveShadowTintColor(iconHex, settings) {
		const rgb = hexToRgb(iconHex);
		const hsl = rgbToHsl(rgb);
		const saturation = clamp(hsl.s * (settings.tintSaturationMultiplier ?? 1.2) + (settings.tintSaturationAdd ?? 0), 0, 100);
		const lightness = clamp(hsl.l + (settings.tintLightnessAdd ?? -24), 0, 100);
		return rgbToHex(hslToRgb({ h: hsl.h, s: saturation, l: lightness }));
	}

	function swiatloAssetPath(filename) {
		return `/light/${encodeURIComponent(filename)}`;
	}

	function getSwiatloImage(layer) {
		const cached = swiatloImageCache.get(layer.id);
		if (cached) {
			return cached;
		}
		const image = new Image();
		image.decoding = "async";
		image.onload = () => {
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
			localStorage.removeItem(STORAGE_KEY);
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
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
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
				if (alpha[alphaIndex] <= 0) {
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

		const tintCtx = tintedCanvas.getContext("2d");
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

	function renderCanvases() {
		const currentState = createEditorSnapshot();
		drawComposite(outputCanvasEl, false, OUTPUT_SIZE, currentState);
		drawComposite(previewCanvasEl, true, PREVIEW_SIZE, currentState);
		if (compareEnabled && compareCanvasEl && compareReference) {
			drawComposite(compareCanvasEl, true, PREVIEW_SIZE, compareReference);
		} else if (compareCanvasEl) {
			const ctx = compareCanvasEl.getContext("2d");
			if (ctx) {
				ctx.clearRect(0, 0, compareCanvasEl.width, compareCanvasEl.height);
			}
		}
	}

	function buildTintedCanvasForColor(color) {
		if (!sourceCanvas) {
			return null;
		}
		const tint = document.createElement("canvas");
		tint.width = sourceCanvas.width;
		tint.height = sourceCanvas.height;
		const tintCtx = tint.getContext("2d");
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
			const nextCtx = nextCanvas.getContext("2d");
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
		const finalCtx = finalCanvas.getContext("2d");
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
		const rasterX = Math.round((drawXRaw + (drawWidthRaw - rasterWidth) * 0.5) * 2) / 2;
		const rasterY = Math.round((drawYRaw + (drawHeightRaw - rasterHeight) * 0.5) * 2) / 2;
		const rasterCanvas = getScaledTintCanvas(tintCanvas, color, rasterWidth, rasterHeight);
		return {
			canvas: rasterCanvas,
			x: rasterX,
			y: rasterY,
			width: rasterWidth,
			height: rasterHeight,
		};
	}

	function drawIconOuterShadow(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight, iconHexColor) {
		if (!tintCanvas || !ICON_EFFECT_SETTINGS.outerShadow.enabled) {
			return;
		}

		const maskCanvas = ensureEffectCanvasA();
		const maskCtx = maskCanvas.getContext("2d");
		const tintMaskCanvas = ensureEffectCanvasB();
		const tintMaskCtx = tintMaskCanvas.getContext("2d");
		const shadowCanvas = ensureEffectCanvasC();
		const shadowCtx = shadowCanvas.getContext("2d");
		if (!maskCtx || !tintMaskCtx || !shadowCtx) {
			return;
		}

		const settings = ICON_EFFECT_SETTINGS.outerShadow;
		const vector = angleToVector(settings.angleDeg);
		const offsetX = vector.x * settings.distance * RENDER_SCALE;
		const offsetY = vector.y * settings.distance * RENDER_SCALE;
		const baseBlur = Math.max(0, settings.blur * RENDER_SCALE);
		const coreOpacity = clamp((settings.coreOpacity ?? 1) * settings.opacity, 0, 1);
		const coreBlur = Math.max(0, baseBlur * (settings.coreBlurMultiplier ?? 1));
		const falloffOpacity = clamp((settings.falloffOpacity ?? 0.4) * settings.opacity, 0, 1);
		const falloffBlur = Math.max(0, baseBlur * (settings.falloffBlurMultiplier ?? 2));
		const falloffDistance = settings.falloffDistanceMultiplier ?? 1;
		const tintedColor = settings.tintFromIcon === false ? settings.color : deriveShadowTintColor(iconHexColor, settings);
		const tintOpacity = clamp((settings.tintOpacity ?? 0.42) * settings.opacity, 0, 1);
		const tintBlur = Math.max(0, baseBlur * (settings.tintBlurMultiplier ?? 3.2));
		const tintDistance = settings.tintDistanceMultiplier ?? 1.24;

		configureImageSmoothing(maskCtx);
		maskCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
		maskCtx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
		maskCtx.globalCompositeOperation = "source-in";
		maskCtx.fillStyle = colorToRgba(settings.color, 1);
		maskCtx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE);
		maskCtx.globalCompositeOperation = "source-over";

		configureImageSmoothing(tintMaskCtx);
		tintMaskCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
		tintMaskCtx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
		tintMaskCtx.globalCompositeOperation = "source-in";
		tintMaskCtx.fillStyle = colorToRgba(tintedColor, 1);
		tintMaskCtx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE);
		tintMaskCtx.globalCompositeOperation = "source-over";

		configureImageSmoothing(shadowCtx);
		shadowCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);

		shadowCtx.save();
		shadowCtx.globalAlpha = coreOpacity;
		shadowCtx.filter = coreBlur > 0 ? `blur(${coreBlur}px)` : "none";
		shadowCtx.drawImage(maskCanvas, offsetX, offsetY);
		shadowCtx.restore();

		shadowCtx.save();
		shadowCtx.globalAlpha = falloffOpacity;
		shadowCtx.filter = falloffBlur > 0 ? `blur(${falloffBlur}px)` : "none";
		shadowCtx.drawImage(maskCanvas, offsetX * falloffDistance, offsetY * falloffDistance);
		shadowCtx.restore();

		shadowCtx.save();
		shadowCtx.globalAlpha = tintOpacity;
		shadowCtx.filter = tintBlur > 0 ? `blur(${tintBlur}px)` : "none";
		shadowCtx.drawImage(tintMaskCanvas, offsetX * tintDistance, offsetY * tintDistance);
		shadowCtx.restore();

		shadowCtx.globalCompositeOperation = "destination-out";
		shadowCtx.drawImage(maskCanvas, 0, 0);
		shadowCtx.globalCompositeOperation = "source-over";

		ctx.save();
		ctx.globalCompositeOperation = settings.blendMode || "source-over";
		ctx.drawImage(shadowCanvas, 0, 0);
		ctx.restore();
	}

	function drawInnerBevelPass(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight, options) {
		if (!tintCanvas) {
			return;
		}

		const passCanvas = ensureEffectCanvasB();
		const passCtx = passCanvas.getContext("2d");
		if (!passCtx) {
			return;
		}

		const vector = angleToVector(options.angleDeg);
		const direction = options.invertDirection ? -1 : 1;
		const shiftX = vector.x * options.distance * RENDER_SCALE * direction;
		const shiftY = vector.y * options.distance * RENDER_SCALE * direction;
		const blurPx = Math.max(0, options.blur * RENDER_SCALE);
		const edgeSoftenPx = Math.max(0, (options.edgeSoftenPx ?? 0) * RENDER_SCALE);
		const edgeSoftenFilter = edgeSoftenPx > 0 ? `blur(${edgeSoftenPx}px)` : "none";

		configureImageSmoothing(passCtx);
		passCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
		passCtx.filter = `blur(${blurPx}px)`;
		passCtx.drawImage(tintCanvas, drawX + shiftX, drawY + shiftY, drawWidth, drawHeight);
		passCtx.filter = "none";
		passCtx.globalCompositeOperation = "destination-in";
		passCtx.filter = edgeSoftenFilter;
		passCtx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
		passCtx.globalCompositeOperation = "destination-out";
		passCtx.filter = edgeSoftenFilter;
		passCtx.drawImage(tintCanvas, drawX - shiftX, drawY - shiftY, drawWidth, drawHeight);
		passCtx.filter = "none";
		passCtx.globalCompositeOperation = "source-in";
		passCtx.fillStyle = colorToRgba(options.color, options.opacity);
		passCtx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE);
		passCtx.globalCompositeOperation = "source-over";

		ctx.save();
		ctx.globalCompositeOperation = options.blendMode;
		ctx.drawImage(passCanvas, 0, 0);
		ctx.restore();
	}

	function drawIconBevelEffects(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight) {
		if (!ICON_EFFECT_SETTINGS.bevel.enabled) {
			return;
		}

		const bevel = ICON_EFFECT_SETTINGS.bevel;
		drawInnerBevelPass(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight, {
			angleDeg: bevel.angleDeg,
			distance: bevel.distance,
			blur: bevel.blur,
			edgeSoftenPx: bevel.edgeSoftenPx,
			color: bevel.highlightColor,
			opacity: bevel.highlightOpacity,
			blendMode: bevel.highlightBlend,
			invertDirection: true,
		});
		drawInnerBevelPass(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight, {
			angleDeg: bevel.angleDeg,
			distance: bevel.distance,
			blur: bevel.blur,
			edgeSoftenPx: bevel.edgeSoftenPx,
			color: bevel.shadowColor,
			opacity: bevel.shadowOpacity,
			blendMode: bevel.shadowBlend,
			invertDirection: false,
		});
	}

	function drawIconBase(ctx, tintCanvas, drawX, drawY, drawWidth, drawHeight) {
		if (!tintCanvas) {
			return;
		}
		const blurPx = Math.max(0, ICON_EDGE_SOFTEN_PX * RENDER_SCALE);
		if (blurPx <= 0) {
			ctx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
			return;
		}
		ctx.save();
		configureImageSmoothing(ctx);
		ctx.filter = `blur(${blurPx}px)`;
		ctx.drawImage(tintCanvas, drawX, drawY, drawWidth, drawHeight);
		ctx.filter = "none";
		ctx.restore();
	}

	function drawSwiatloLayer(ctx, layer) {
		const image = getSwiatloImage(layer);
		if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
			return;
		}
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
		ctx.filter = `contrast(${SWIATLO_SHARPEN_CONTRAST})`;
		ctx.drawImage(image, drawX, drawY, drawSize, drawSize);
		ctx.restore();
	}

	function drawSwiatloOverlays(ctx, options = {}) {
		if (options.enabled === false) {
			return;
		}
		const visibility = options.visibility || swiatloLayerVisibility;

		for (const layer of SWIATLO_LAYER_DEFS) {
			if (!visibility?.[layer.id]) {
				continue;
			}
			ctx.save();
			ctx.globalCompositeOperation = layer.blendMode || "source-over";
			ctx.globalAlpha = layer.opacity ?? 1;
			drawSwiatloLayer(ctx, layer);
			ctx.restore();
		}
	}

	function applyCircleEdgeAntiAliasing(ctx) {
		const feather = Math.max(0, CIRCLE_EDGE_AA_PX * RENDER_SCALE);
		if (feather <= 0) {
			return;
		}
		const innerRadius = Math.max(0, RENDER_INNER_RADIUS - feather);
		const outerRadius = RENDER_INNER_RADIUS + feather;
		const edgeMask = ctx.createRadialGradient(RENDER_CENTER, RENDER_CENTER, innerRadius, RENDER_CENTER, RENDER_CENTER, outerRadius);
		edgeMask.addColorStop(0, "rgba(0, 0, 0, 1)");
		edgeMask.addColorStop(1, "rgba(0, 0, 0, 0)");

		ctx.save();
		ctx.globalCompositeOperation = "destination-in";
		ctx.fillStyle = edgeMask;
		ctx.beginPath();
		ctx.arc(RENDER_CENTER, RENDER_CENTER, outerRadius + 1, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	function drawComposite(canvas, includeGuides, size = OUTPUT_SIZE, snapshot = createEditorSnapshot()) {
		if (!canvas) {
			return;
		}
		if (canvas.width !== size) {
			canvas.width = size;
		}
		if (canvas.height !== size) {
			canvas.height = size;
		}

		const targetCtx = canvas.getContext("2d");
		if (!targetCtx) {
			return;
		}

		const renderTarget = ensureRenderCanvas();
		const renderCtx = renderTarget.getContext("2d");
		if (!renderCtx) {
			return;
		}
		const resolvedSnapshot = {
			primaryColor: sanitizeHexColor(snapshot?.primaryColor, primaryColor),
			iconColor: sanitizeHexColor(snapshot?.iconColor, iconColor),
			iconOffsetX: clampOffset(snapshot?.iconOffsetX, iconOffsetX),
			iconOffsetY: clampOffset(snapshot?.iconOffsetY, iconOffsetY),
			iconScale: clampScale(snapshot?.iconScale),
			swiatloEnabled: snapshot?.swiatloEnabled !== false,
			swiatloPresetId: resolveSwiatloPreset(snapshot?.swiatloPresetId || swiatloPresetId).id,
			swiatloLayerVisibility: normalizeSwiatloVisibility(snapshot?.swiatloLayerVisibility, snapshot?.swiatloPresetId || swiatloPresetId),
		};

		configureImageSmoothing(renderCtx);
		renderCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
		renderCtx.fillStyle = resolvedSnapshot.primaryColor;
		renderCtx.beginPath();
		renderCtx.arc(RENDER_CENTER, RENDER_CENTER, RENDER_INNER_RADIUS, 0, Math.PI * 2);
		renderCtx.fill();

		renderCtx.save();
		renderCtx.beginPath();
		renderCtx.arc(RENDER_CENTER, RENDER_CENTER, RENDER_INNER_RADIUS, 0, Math.PI * 2);
		renderCtx.clip();
		const tintCanvas = getTintedCanvasForColor(resolvedSnapshot.iconColor);
		if (tintCanvas) {
			const drawWidthRaw = tintCanvas.width * resolvedSnapshot.iconScale * RENDER_SCALE;
			const drawHeightRaw = tintCanvas.height * resolvedSnapshot.iconScale * RENDER_SCALE;
			const drawXRaw = RENDER_CENTER - drawWidthRaw / 2 + resolvedSnapshot.iconOffsetX * RENDER_SCALE;
			const drawYRaw = RENDER_CENTER - drawHeightRaw / 2 + resolvedSnapshot.iconOffsetY * RENDER_SCALE;
			const iconRaster = resolveIconRaster(tintCanvas, resolvedSnapshot.iconColor, drawXRaw, drawYRaw, drawWidthRaw, drawHeightRaw);

			drawIconOuterShadow(renderCtx, tintCanvas, drawXRaw, drawYRaw, drawWidthRaw, drawHeightRaw, resolvedSnapshot.iconColor);
			drawIconBase(renderCtx, iconRaster.canvas, iconRaster.x, iconRaster.y, iconRaster.width, iconRaster.height);
			drawIconBevelEffects(renderCtx, iconRaster.canvas, iconRaster.x, iconRaster.y, iconRaster.width, iconRaster.height);
		}
		drawSwiatloOverlays(renderCtx, {
			enabled: resolvedSnapshot.swiatloEnabled,
			visibility: resolvedSnapshot.swiatloLayerVisibility,
		});
		renderCtx.restore();
		applyCircleEdgeAntiAliasing(renderCtx);

		configureImageSmoothing(targetCtx);
		targetCtx.clearRect(0, 0, size, size);
		targetCtx.drawImage(renderTarget, 0, 0, size, size);

		if (includeGuides) {
			drawGuides(targetCtx, size);
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
	}

	function onOffsetXInput(value) {
		iconOffsetX = clampOffset(value, iconOffsetX);
	}

	function onOffsetYInput(value) {
		iconOffsetY = clampOffset(value, iconOffsetY);
	}

	function applyColorFromPicker(kind, normalized) {
		if (kind === "primary") {
			primaryColor = normalized;
			primaryColorHexInput = normalized;
			return;
		}
		iconColor = normalized;
		iconColorHexInput = normalized;
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

	function downloadPng() {
		if (!outputCanvasEl) {
			errorMessage = "Preview is not ready.";
			return;
		}
		outputCanvasEl.toBlob((blob) => {
			if (!blob) {
				errorMessage = "PNG export failed.";
				return;
			}
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = outputName;
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 0);
			resetMessages();
			statusMessage = `Exported ${outputName}.`;
		}, "image/png");
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
								Primary (Circle)
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

				<div class="civ-icon-actions">
					<div class="civ-icon-action-row">
						<button type="button" class="civ-icon-button civ-icon-button-primary" onclick={downloadPng}>Download</button>
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
			<div class="civ-icon-scheme-grid" role="list" aria-label="Color scheme suggestions">
				{#each suggestedColorSchemes as scheme (scheme.id)}
					<button
						type="button"
						role="listitem"
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
							<span class="civ-icon-scheme-color-title">Outer</span>
							<span class="color-value">HEX {scheme.primaryDisplay.hex}</span>
							<span class="color-value">RGB {scheme.primaryDisplay.rgb}</span>
							<span class="color-value">HSL {scheme.primaryDisplay.hsl}</span>
						</span>
						<span class="civ-icon-scheme-values">
							<span class="civ-icon-scheme-color-title">Inner</span>
							<span class="color-value">HEX {scheme.iconDisplay.hex}</span>
							<span class="color-value">RGB {scheme.iconDisplay.rgb}</span>
							<span class="color-value">HSL {scheme.iconDisplay.hsl}</span>
						</span>
					</button>
				{/each}
			</div>
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
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
	}

	.civ-icon-scheme-card {
		cursor: pointer;
		display: grid;
		gap: 0.44rem;
		color: var(--ink);
		text-align: left;
		background: color-mix(in oklch, var(--panel-bg) 90%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 0.7rem;
		padding: 0.62rem;
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
		font-size: 0.85rem;
		font-weight: 620;
	}

	.civ-icon-scheme-preview {
		position: relative;
		block-size: 8rem;
		inline-size: 8rem;
		display: block;
		background: var(--scheme-outer);
		border: 1px solid color-mix(in oklch, var(--accent) 14%, var(--panel-border));
		border-radius: 0.35rem;
		overflow: hidden;
	}

	.civ-icon-scheme-inner-square {
		inset-block-start: 2rem;
		inset-inline-start: 2rem;
		position: absolute;
		block-size: 4rem;
		inline-size: 4rem;
		border-left: 4rem solid var(--scheme-inner);
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
		background-size: 26px 26px;
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		border-radius: 0.7rem;
		padding: 1rem;
		background:
			linear-gradient(45deg, color-mix(in oklch, var(--control-bg) 78%, black) 25%, transparent 25%, transparent 75%, color-mix(in oklch, var(--control-bg) 78%, black) 75%),
			linear-gradient(45deg, color-mix(in oklch, var(--control-bg) 86%, black) 25%, transparent 25%, transparent 75%, color-mix(in oklch, var(--control-bg) 86%, black) 75%);
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
