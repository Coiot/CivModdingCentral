<script>
	import { tick } from "svelte";
	import { buildHexVertices, computeMapMetrics, tileCenter } from "../map/hex.js";
	import { resolveTerrainColor } from "../map/colors.js";
	import { computeTooltipBridgeRect, computeTooltipCoords } from "../map/tooltip.js";
	import { NOTE_PIN_PATHS } from "../map/glyphs.js";
	import { buildLikelyMapPrefetchQueue } from "../map/prefetch.js";
	import { findTileAtPoint } from "../map/hit-testing.js";
	import { materializeMapLabels, normalizeMapLabels, selectVisibleMapLabels } from "../map/labels.js";
	import { createClient } from "@supabase/supabase-js";
	import { maps as defaultMaps } from "../config/maps.js";
	import {
		buildPinsSignature as buildPinsSignatureUtil,
		normalizePins as normalizePinsUtil,
		normalizeToken as normalizeTokenUtil,
		parseHexInput as parseHexInputUtil,
		sanitizeHexColor as sanitizeHexColorUtil,
	} from "../map/pins.js";
	import { buildCbrxTslLua, buildCbrxTslSql, buildTslModInfo, findDuplicateCivs, normalizePinsForExport } from "../map/cbrx-export.js";
	import { buildZipBlob } from "../map/zip.js";
	import { canPushCloudPins as canPushCloudPinsUtil, hasCloudPinSyncConfig as hasCloudPinSyncConfigUtil, resolveCloudSyncAction } from "../map/sync.js";

	let { mapItem: providedMapItem = null, maps: providedMaps = defaultMaps, selectedMapId = "", onSelectMap = null, canEdit = false, authUser = null, authAccessToken = "" } = $props();

	const STORAGE_PREFIX = "cmc-map";
	const CBRX_PIN_RESET_VERSION = 1;
	const DEFAULT_TSL_TABLE_NAME = "Civilization_TSLs";
	const BASE_CACHE_VERSION = 1;
	const BASE_PREFETCH_LIMIT = 3;
	const LAST_MAP_STORAGE_KEY = `${STORAGE_PREFIX}:last-map-id`;
	const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
	const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
	const SUPABASE_PINS_TABLE = import.meta.env.VITE_SUPABASE_PINS_TABLE || "cmc_map_pins";
	const SUPABASE_LABELS_TABLE = import.meta.env.VITE_SUPABASE_LABELS_TABLE || "cmc_map_labels";
	const DEFAULT_GAME_DEFINE_PREFIX = "CIVILIZATION_";
	const PANEL_COLLAPSED_ICON_PATH =
		"M544 512C526.3 512 512 497.7 512 480L512 160C512 142.3 526.3 128 544 128C561.7 128 576 142.3 576 160L576 480C576 497.7 561.7 512 544 512zM71 337C61.6 327.6 61.6 312.4 71 303.1L215 159C221.9 152.1 232.2 150.1 241.2 153.8C250.2 157.5 256 166.3 256 176L256 256L400 256C426.5 256 448 277.5 448 304L448 336C448 362.5 426.5 384 400 384L256 384L256 464C256 473.7 250.2 482.5 241.2 486.2C232.2 489.9 221.9 487.9 215 481L71 337z";
	const PANEL_EXPANDED_ICON_PATH =
		"M96 128C113.7 128 128 142.3 128 160L128 480C128 497.7 113.7 512 96 512C78.3 512 64 497.7 64 480L64 160C64 142.3 78.3 128 96 128zM569 303C578.4 312.4 578.4 327.6 569 336.9L425 481C418.1 487.9 407.8 489.9 398.8 486.2C389.8 482.5 384 473.7 384 464L384 384L240 384C213.5 384 192 362.5 192 336L192 304C192 277.5 213.5 256 240 256L384 256L384 176C384 166.3 389.8 157.5 398.8 153.8C407.8 150.1 418.1 152.2 425 159L569 303z";
	const DEFAULT_SETTINGS = {
		showPins: true,
		showLabels: true,
		showRiverLabels: true,
		showRegionLabels: true,
		hideDecorations: false,
		flattenLandWater: false,
		grayscaleTerrain: false,
	};
	const PANEL_TAB_ORDER = ["edit", "labels", "notes", "export", "settings"];
	const KNOWN_NATURAL_WONDER_FEATURES = new Set([
		"FEATURE_CRATER",
		"FEATURE_FUJI",
		"FEATURE_MESA",
		"FEATURE_REEF",
		"FEATURE_VOLCANO",
		"FEATURE_GIBRALTAR",
		"FEATURE_GEYSER",
		"FEATURE_FOUNTAIN_YOUTH",
		"FEATURE_POTOSI",
		"FEATURE_EL_DORADO",
		"FEATURE_SRI_PADA",
		"FEATURE_MT_SINAI",
		"FEATURE_MT_KAILASH",
		"FEATURE_ULURU",
		"FEATURE_LAKE_VICTORIA",
		"FEATURE_KILIMANJARO",
		"FEATURE_SOLOMONS_MINES",
	]);

	let viewportEl = $state();
	let canvasEl = $state();
	let resizeObserver;

	let baseData = $state(null);
	let mapMetrics = $state(null);
	let mapTiles = $state([]);
	let tileLookup = $state(new Map());

	let loading = $state(true);
	let error = $state("");
	let debugInfo = $state("");

	let mapPins = $state([]);
	let localPins = $state([]);
	let sharedPins = $state([]);
	let mapLabels = $state([]);
	let staticMapLabelDefs = $state([]);
	let customMapLabelDefs = $state([]);
	let notesByKey = $state({});
	let settings = $state({ ...DEFAULT_SETTINGS });

	let pinViewMode = $state("combined");
	let pinEditTarget = $state("local");

	let panelTab = $state("edit");
	let panelCollapsed = $state(true);
	let panelCollapsedPreference = $state(true);
	let selectedTileKey = $state("");
	let hoveredTileKey = $state("");
	let hoverPointer = $state(null);

	let viewportWidth = $state(0);
	let viewportHeight = $state(0);
	let scale = $state(1);
	let minScale = $state(0.2);
	let maxScale = $state(4);
	let translateX = $state(0);
	let translateY = $state(0);

	let activePointerId = $state(null);
	let activePointers = new Map();
	let isDragging = $state(false);
	let dragMoved = $state(false);
	let wheelZoomRafId = null;
	let wheelZoomDelta = 0;
	let wheelZoomFocus = null;
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let dragTranslateX = $state(0);
	let dragTranslateY = $state(0);
	let isPinching = $state(false);
	let pinchStartDistance = $state(0);
	let pinchStartScale = $state(1);
	let pinchCenter = $state({ x: 0, y: 0 });
	let hasUserViewportInteraction = $state(false);

	let editPinCivInput = $state("");
	let editPinId = $state("");
	let editPinGameDefineInput = $state("");
	let editPinLeaderInput = $state("");
	let editPinCapitalInput = $state("");
	let editPinAuthorInput = $state("");
	let editPinPrimaryInput = $state("#243746");
	let editPinSecondaryInput = $state("#f3d37f");
	let editPinPrimaryHexInput = $state("#243746");
	let editPinSecondaryHexInput = $state("#f3d37f");
	let editPinIsIsland = $state(false);
	let editLabelId = $state("");
	let editLabelNameInput = $state("");
	let editLabelTypeInput = $state("region");
	let editLabelPriorityInput = $state("standard");
	let editLabelVariantInput = $state("land");
	let editLabelSizeInput = $state("1");
	let editLabelRotationInput = $state("0");
	let editLabelMinZoomInput = $state("");
	let editLabelMaxZoomInput = $state("");
	let pinStatus = $state("");
	let labelStatus = $state("");
	let notesDraft = $state("");
	let notesStatus = $state("");
	let exportSortMode = $state("civ");
	let exportSqlText = $state("");
	let exportLuaText = $state("");
	let exportModInfoText = $state("");
	let exportModId = $state("");
	let exportStatus = $state("");
	let exportWarnings = $state([]);
	let exportPinCount = $state(0);
	let exportPinScope = $state("all");
	let fitScaleLimit = $state(1);
	let pinCloudSyncDirty = $state(false);
	let pinCloudSyncBusy = $state(false);
	let pinCloudPullBusy = $state(false);
	let pinCloudSyncNeedsFeedback = $state(false);
	let labelCloudSyncDirty = $state(false);
	let labelCloudSyncBusy = $state(false);
	let labelCloudPullBusy = $state(false);
	let cloudSyncQueued = false;
	let cloudSyncVisibilityHandler = null;
	let cloudSyncFocusHandler = null;
	let realtimeClient = null;
	let realtimePinsChannel = null;
	let realtimeLabelsChannel = null;
	let realtimeSubscribedMapId = "";
	let mapPrefetchIdleHandle = null;
	let mapPrefetchTimeoutHandle = null;
	const notePinPathCache = new Map();
	const basePayloadMemoryCache = new Map();
	let lastInitializedMapId = "";
	let activeMapId = $state("");
	let mapPinCounts = $state({});

	const maps = $derived.by(() => (Array.isArray(providedMaps) && providedMaps.length ? providedMaps : defaultMaps));
	const mapsForSelect = $derived.by(() => {
		if (!maps.length) {
			return [];
		}

		return maps
			.map((entry, index) => {
				const rawCount = mapPinCounts?.[entry?.id];
				const hasCount = Number.isFinite(rawCount);
				return {
					entry,
					index,
					count: hasCount ? Number(rawCount) : -1,
					hasCount,
				};
			})
			.sort((a, b) => {
				if (a.hasCount && b.hasCount && a.count !== b.count) {
					return b.count - a.count;
				}
				if (a.hasCount !== b.hasCount) {
					return a.hasCount ? -1 : 1;
				}
				return a.index - b.index;
			})
			.map((item) => item.entry);
	});
	const preferredDefaultMapId = $derived.by(() => {
		if (!maps.length) {
			return "";
		}
		const cbrx = maps.find((entry) => entry?.id === "cbrx");
		return String(cbrx?.id || maps[0]?.id || "");
	});
	const currentMap = $derived.by(() => {
		const normalizedId = String(activeMapId || "").trim();
		if (normalizedId) {
			const byId = maps.find((entry) => entry?.id === normalizedId);
			if (byId) {
				return byId;
			}
		}
		if (providedMapItem?.id) {
			return providedMapItem;
		}
		const fallbackId = preferredDefaultMapId;
		if (fallbackId) {
			return maps.find((entry) => entry?.id === fallbackId) || maps[0] || null;
		}
		return maps[0] || null;
	});

	const selectedTile = $derived(selectedTileKey ? tileLookup.get(selectedTileKey) || null : null);
	const hoveredTile = $derived(hoveredTileKey ? tileLookup.get(hoveredTileKey) || null : null);
	const selectedTilePins = $derived.by(() => (selectedTile ? pinsForTile(selectedTile) : []));
	const selectedTileCustomLabels = $derived.by(() => (selectedTile ? labelsForTile(selectedTile) : []));
	const hoveredTilePins = $derived.by(() => (hoveredTile ? pinsForTile(hoveredTile) : []));
	const selectedCivToken = $derived.by(() => normalizeToken(editPinCivInput));
	const matchedSelectedPin = $derived.by(() => {
		if (!selectedTilePins.length || !editPinId) {
			return null;
		}
		return selectedTilePins.find((pin) => String(pin.id || "") === String(editPinId)) || null;
	});
	const pinEditorMode = $derived.by(() => {
		if (matchedSelectedPin) {
			return "edit";
		}
		if (selectedCivToken) {
			return "add";
		}
		return "idle";
	});
	const matchedSelectedCustomLabel = $derived.by(() => {
		if (!editLabelId) {
			return null;
		}
		return customMapLabelDefs.find((label) => label.id === editLabelId) || null;
	});
	const labelEditorMode = $derived.by(() => {
		if (matchedSelectedCustomLabel) {
			return "edit";
		}
		if (String(editLabelNameInput || "").trim()) {
			return "add";
		}
		return "idle";
	});
	const canEditPins = $derived.by(() => (pinEditTarget === "shared" ? canEdit : true));
	const pinEditorHint = $derived.by(() => (canEditPins ? "" : "Sign in from the user menu to edit shared pins."));
	const pinEditorBadge = $derived.by(() => (pinEditTarget === "shared" ? (canEdit ? "Editing shared pins" : "") : "Editing local pins"));
	const editorHint = $derived(canEdit ? "" : "Sign in from the user menu to make edits.");
	const canZoomIn = $derived(scale < maxScale - 0.0001);
	const canZoomOut = $derived(scale > minScale + 0.0001);
	const pinGroups = $derived.by(() => {
		const groups = new Map();
		for (const pin of mapPins) {
			const key = `${pin.col},${pin.row}`;
			if (!groups.has(key)) {
				groups.set(key, {
					key,
					col: pin.col,
					row: pin.row,
					pins: [],
				});
			}
			groups.get(key).pins.push(pin);
		}
		return Array.from(groups.values());
	});
	const primaryColorDisplay = $derived.by(() => formatColorDisplay(editPinPrimaryInput, "#243746"));
	const secondaryColorDisplay = $derived.by(() => formatColorDisplay(editPinSecondaryInput, "#f3d37f"));
	const upsertCivButtonLabel = $derived.by(() => (pinEditorMode === "edit" ? "Update Pin" : "Add Pin"));
	const upsertLabelButtonLabel = $derived.by(() => (labelEditorMode === "edit" ? "Update Label" : "Add Label"));
	const pinEditorStatus = $derived.by(() => {
		if (pinEditorMode === "edit" && matchedSelectedPin) {
			return `Editing "${pinDisplayName(matchedSelectedPin)}". Click "New Entry" to add another pin on this tile.`;
		}
		if (pinEditorMode === "add") {
			return `Ready to add "${String(editPinCivInput || "").trim()}". Click "Add Pin" to save.`;
		}
		return "Type a civilization name to add a pin, or load one below to edit it.";
	});
	const labelEditorStatus = $derived.by(() => {
		if (labelEditorMode === "edit" && matchedSelectedCustomLabel) {
			return `Editing "${matchedSelectedCustomLabel.name}" anchored on this tile.`;
		}
		if (labelEditorMode === "add") {
			return `Adding "${String(editLabelNameInput || "").trim()}" anchored on this tile.`;
		}
		return "Enter a label name to add to this tile.";
	});
	const zoomPercent = $derived.by(() => {
		if (!fitScaleLimit) {
			return 100;
		}
		return Math.round((scale / fitScaleLimit) * 100);
	});
	const zoomRatio = $derived.by(() => {
		if (!fitScaleLimit) {
			return 1;
		}
		return scale / fitScaleLimit;
	});
	const visibleMapLabels = $derived.by(() =>
		selectVisibleMapLabels(mapLabels, {
			showLabels: settings.showLabels,
			showRiverLabels: settings.showRiverLabels,
			showRegionLabels: settings.showRegionLabels,
			density: "detailed",
			zoomRatio,
			autoHide: false,
		}),
	);
	const tooltipLayout = $derived.by(() => {
		if (!hoveredTile || !hoverPointer || !viewportWidth || !viewportHeight) {
			return null;
		}

		const targetWidth = 268;
		const targetHeight = 214;

		const coords = computeTooltipCoords({
			viewportWidth,
			viewportHeight,
			tooltipWidth: targetWidth,
			tooltipHeight: targetHeight,
			position: hoverPointer,
		});

		if (!coords) {
			return null;
		}

		const bridge = computeTooltipBridgeRect({
			position: hoverPointer,
			tooltipCoords: coords,
		});

		return { coords, bridge };
	});

	$effect(() => {
		const incomingId = String(selectedMapId || providedMapItem?.id || "").trim();
		if (incomingId && incomingId !== activeMapId) {
			activeMapId = incomingId;
			return;
		}
		if (!incomingId && !activeMapId) {
			const storedId = String(loadStorageJson(LAST_MAP_STORAGE_KEY, "") || "").trim();
			if (storedId && maps.some((entry) => entry?.id === storedId)) {
				activeMapId = storedId;
				return;
			}
			const fallbackId = String(preferredDefaultMapId || maps[0]?.id || "");
			if (fallbackId) {
				activeMapId = fallbackId;
			}
		}
	});

	$effect(() => {
		if (!maps.length) {
			if (activeMapId) {
				activeMapId = "";
			}
			return;
		}
		const providedMapId = String(providedMapItem?.id || "");
		if (maps.some((entry) => entry?.id === activeMapId) || (providedMapId && activeMapId === providedMapId)) {
			return;
		}
		const fallbackId = String(preferredDefaultMapId || maps[0]?.id || "");
		if (fallbackId && fallbackId !== activeMapId) {
			activeMapId = fallbackId;
		}
	});

	$effect(() => {
		const mapId = String(activeMapId || currentMap?.id || "").trim();
		if (!mapId) {
			return;
		}
		saveStorageJson(LAST_MAP_STORAGE_KEY, mapId);
	});

	$effect(() => {
		if (!maps.length) {
			if (Object.keys(mapPinCounts || {}).length) {
				mapPinCounts = {};
			}
			return;
		}

		authAccessToken;
		let cancelled = false;

		void (async () => {
			const cloudCounts = await fetchCloudPinCountsByMap().catch(() => null);
			const nextCounts = {};

			for (const entry of maps) {
				const mapId = String(entry?.id || "").trim();
				if (!mapId) {
					continue;
				}

				const localCounts = loadStoredPinCountsForMap(mapId);
				const cloudCount = cloudCounts && Number.isFinite(cloudCounts[mapId]) ? Number(cloudCounts[mapId]) : 0;
				const sharedBase = localCounts.hasShared ? localCounts.shared : cloudCount;
				nextCounts[mapId] = Math.max(0, sharedBase + localCounts.local);
			}

			if (!cancelled) {
				mapPinCounts = nextCounts;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const mapId = String(currentMap?.id || "").trim();
		if (!mapId) {
			return;
		}
		const nextCount = Math.max(0, Number(localPins?.length || 0) + Number(sharedPins?.length || 0));
		if (Number(mapPinCounts?.[mapId]) === nextCount) {
			return;
		}
		mapPinCounts = {
			...(mapPinCounts || {}),
			[mapId]: nextCount,
		};
	});

	$effect(() => {
		if (maps.length) {
			return;
		}
		loading = false;
		error = "No maps are configured.";
		debugInfo = "";
	});

	$effect(() => {
		const mapId = currentMap?.id || "";
		if (!mapId) {
			return;
		}
		if (mapId === lastInitializedMapId) {
			return;
		}
		lastInitializedMapId = mapId;
		void initializeMap();
	});

	$effect(() => {
		authAccessToken;
		const mapId = String(currentMap?.id || "").trim();
		if (!mapId) {
			return;
		}
		if (realtimeClient && typeof realtimeClient?.realtime?.setAuth === "function" && authAccessToken) {
			realtimeClient.realtime.setAuth(authAccessToken);
		}
		if (cloudSyncFocusHandler || cloudSyncVisibilityHandler) {
			void startRealtimeSubscriptions();
		}
	});

	$effect(() => {
		if (canvasEl && mapMetrics && mapTiles.length) {
			drawMap();
		}
	});

	$effect(() => {
		if (!baseData) {
			exportSqlText = "";
			exportLuaText = "";
			exportModInfoText = "";
			exportStatus = "";
			exportWarnings = [];
			exportPinCount = 0;
			return;
		}
		exportSortMode;
		exportPinScope;
		localPins;
		sharedPins;
		rebuildExportPayload();
	});

	$effect(() => {
		if (!canEdit && pinEditTarget !== "local") {
			setPinEditTarget("local");
		}
	});

	$effect(() => {
		if (!viewportWidth) {
			return;
		}
		if (viewportWidth <= 640) {
			if (panelCollapsed) {
				setPanelCollapsed(false, { persist: false });
			}
			return;
		}
		if (panelCollapsed !== panelCollapsedPreference) {
			panelCollapsed = panelCollapsedPreference;
		}
	});

	$effect(() => {
		if (!mapMetrics || !viewportWidth || !viewportHeight || hasUserViewportInteraction) {
			return;
		}
		fitToView(true);
	});

	$effect(() => {
		return () => {
			stopPinCloudSyncLoop();
			clearPrefetchSchedule();
			clearWheelZoomFrame();
		};
	});

	async function initializeMap() {
		stopPinCloudSyncLoop();
		clearPrefetchSchedule();
		loading = true;
		error = "";
		debugInfo = "";
		selectedTileKey = "";
		hoveredTileKey = "";
		hoverPointer = null;
		panelTab = "edit";
		panelCollapsed = true;
		notesStatus = "";
		labelStatus = "";
		pinCloudSyncDirty = false;
		labelCloudSyncDirty = false;
		mapLabels = [];
		mapPins = [];
		localPins = [];
		sharedPins = [];
		staticMapLabelDefs = [];
		customMapLabelDefs = [];
		hasUserViewportInteraction = false;
		isDragging = false;
		dragMoved = false;
		activePointerId = null;
		activePointers = new Map();
		isPinching = false;
		pinchStartDistance = 0;
		pinchStartScale = scale;
		pinchCenter = { x: 0, y: 0 };

		try {
			if (!currentMap) {
				throw new Error("No maps are configured.");
			}

			if (typeof window !== "undefined" && window.location?.protocol === "file:") {
				throw new Error("Maps must be served over http(s). Run `npm run dev` and open that URL.");
			}

			const baseUrl = resolveAssetUrl(currentMap.mapConfig.baseCacheUrl);
			const pinsUrl = resolveAssetUrl(currentMap.pinsUrl);
			const labelsUrl = currentMap?.labelsUrl ? resolveAssetUrl(currentMap.labelsUrl) : "";
			debugInfo = `protocol=${window.location.protocol} base=${baseUrl} pins=${pinsUrl}${labelsUrl ? ` labels=${labelsUrl}` : ""}`;

			if (currentMap?.id === "cbrx" && typeof localStorage !== "undefined") {
				try {
					const resetKey = storageKey("pins-reset");
					const resetState = loadStorageJson(resetKey, null);
					const resetVersion = Number(resetState?.version || 0);
					if (resetVersion < CBRX_PIN_RESET_VERSION) {
						localStorage.removeItem(storageKey("pins"));
						localStorage.removeItem(storageKey("pins-local"));
						localStorage.removeItem(storageKey("pins-shared"));
						localStorage.setItem(resetKey, JSON.stringify({ version: CBRX_PIN_RESET_VERSION }));
					}
				} catch {
					// Ignore storage access failures.
				}
			}

			const localNotes = loadStorageJson(storageKey("notes"), {});
			const legacyPinsStored = loadStorageJson(storageKey("pins"), null);
			const localPinsStored = loadStorageJson(storageKey("pins-local"), null);
			const sharedPinsStored = loadStorageJson(storageKey("pins-shared"), null);
			const localLabels = loadStorageJson(storageKey("labels"), null);
			const localSettings = loadStorageJson(storageKey("settings"), {});
			const storedPinViewMode = loadStorageJson(storageKey("pin-view-mode"), null);
			const storedPinEditTarget = loadStorageJson(storageKey("pin-edit-target"), null);
			const storedPanelCollapsed = loadStorageJson(storageKey("panel-collapsed"), null);

			let basePayload = loadCachedBasePayload(currentMap?.id);
			if (!basePayload) {
				basePayload = await fetchJsonSafe(baseUrl, "base");
				saveCachedBasePayload(currentMap?.id, basePayload);
			}
			const pinsPayload = await fetchJsonSafe(pinsUrl, "pins").catch(() => ({}));
			const fetchedSharedPins = Array.isArray(pinsPayload) ? pinsPayload : Array.isArray(pinsPayload?.pins) ? pinsPayload.pins : [];
			const migratedSharedPins = Array.isArray(sharedPinsStored) ? sharedPinsStored : Array.isArray(legacyPinsStored) ? legacyPinsStored : [];
			const labelsPayload = labelsUrl ? await fetchJsonSafe(labelsUrl, "labels").catch(() => ({ labels: [] })) : { labels: [] };
			const normalizedStaticLabels = normalizeMapLabels(Array.isArray(labelsPayload) ? labelsPayload : labelsPayload?.labels);
			const normalizedCustomLabels = normalizeMapLabels(Array.isArray(localLabels) ? localLabels : []);
			const computedMetrics = computeMapMetrics(Number(basePayload.width), Number(basePayload.height), Number(currentMap.mapConfig.hexSize || 14));

			baseData = basePayload;
			mapMetrics = computedMetrics;
			notesByKey = isPlainObject(localNotes) ? localNotes : {};
			settings = sanitizeSettings({ ...DEFAULT_SETTINGS, ...(isPlainObject(localSettings) ? localSettings : {}) });
			pinViewMode = normalizePinViewMode(storedPinViewMode);
			saveStorageJson(storageKey("pin-view-mode"), pinViewMode);
			pinEditTarget = canEdit ? normalizePinEditTarget(storedPinEditTarget) : "local";
			saveStorageJson(storageKey("pin-edit-target"), pinEditTarget);
			panelCollapsedPreference = typeof storedPanelCollapsed === "boolean" ? storedPanelCollapsed : true;
			panelCollapsed = panelCollapsedPreference;
			localPins = normalizePins(Array.isArray(localPinsStored) ? localPinsStored : []);
			sharedPins = normalizePins(fetchedSharedPins.length ? fetchedSharedPins : migratedSharedPins);
			saveStorageJson(storageKey("pins-shared"), sharedPins);
			if (Array.isArray(legacyPinsStored) && typeof localStorage !== "undefined") {
				localStorage.removeItem(storageKey("pins"));
			}
			refreshVisiblePins({ syncEditors: false, draw: false });
			staticMapLabelDefs = normalizedStaticLabels;
			customMapLabelDefs = normalizedCustomLabels;
			refreshMapLabels();

			await pullCloudPins({ forceApply: true });
			await pullCloudLabels({ forceApply: true });

			rebuildTiles();

			await tick();
			await ensureViewportSizeReady();
			fitToView(true);
			drawMap();
			startPinCloudSyncLoop();
			scheduleBasePrefetch();
		} catch (loadError) {
			const name = loadError?.name ? `${loadError.name}: ` : "";
			error = `${name}${loadError?.message || "Unable to load map data."}`;
			if (loadError?.stack) {
				debugInfo = `${debugInfo}\n${loadError.stack}`;
			}
			baseData = null;
			mapMetrics = null;
			mapTiles = [];
			tileLookup = new Map();
			mapPins = [];
			localPins = [];
			sharedPins = [];
			staticMapLabelDefs = [];
			customMapLabelDefs = [];
			mapLabels = [];
			stopPinCloudSyncLoop();
		} finally {
			loading = false;
		}
	}

	function rebuildTiles() {
		if (!baseData || !mapMetrics) {
			mapTiles = [];
			tileLookup = new Map();
			return;
		}

		const hexSize = Number(currentMap.mapConfig.hexSize || 14);
		const built = [];
		const lookup = new Map();

		for (let sourceRow = 0; sourceRow < baseData.height; sourceRow += 1) {
			const displayRow = baseData.height - 1 - sourceRow;
			for (let col = 0; col < baseData.width; col += 1) {
				const index = sourceRow * baseData.width + col;
				const raw = normalizeRawTile(baseData.mapTiles[index]);
				const center = tileCenter(col, sourceRow, baseData.height, hexSize);
				const key = `${col},${displayRow}`;

				const entry = {
					key,
					index,
					col,
					sourceRow,
					row: displayRow,
					x: center.x - mapMetrics.minX,
					y: center.y - mapMetrics.minY,
					terrain: lookupString(baseData.terrainList, raw.terrainType),
					feature: lookupString(baseData.featureTerrainList, raw.featureTerrainType),
					naturalWonder: resolveNaturalWonder(baseData, raw),
					resource: lookupString(baseData.resourceList, raw.resourceType),
					improvement: raw && raw.improvementType !== undefined ? lookupString(baseData.improvementList, raw.improvementType) : null,
					riverSegments: buildRiverSegments(raw.riverData, hexSize),
					raw,
				};

				built.push(entry);
				lookup.set(key, entry);
			}
		}

		mapTiles = built;
		tileLookup = lookup;

		if (selectedTileKey && !lookup.has(selectedTileKey)) {
			selectedTileKey = "";
		}
		if (hoveredTileKey && !lookup.has(hoveredTileKey)) {
			hoveredTileKey = "";
		}
	}

	function drawMap() {
		if (!canvasEl || !mapMetrics || !mapTiles.length) {
			return;
		}

		const width = Math.max(1, Math.ceil(mapMetrics.width));
		const height = Math.max(1, Math.ceil(mapMetrics.height));
		const hexSize = Number(currentMap.mapConfig.hexSize || 14);
		const vertices = buildHexVertices(hexSize);
		const featureVertices = buildHexVertices(hexSize * 0.37);
		canvasEl.width = width;
		canvasEl.height = height;

		const ctx = canvasEl.getContext("2d");
		if (!ctx) {
			return;
		}

		ctx.clearRect(0, 0, width, height);
		ctx.lineWidth = 0.5;
		ctx.strokeStyle = "rgba(8, 23, 36, 0.22)";

		for (const tile of mapTiles) {
			const fill = adjustedTerrainColor(tile);

			ctx.beginPath();
			for (let vertex = 0; vertex < vertices.length; vertex += 1) {
				const point = vertices[vertex];
				if (vertex === 0) {
					ctx.moveTo(tile.x + point.x, tile.y + point.y);
				} else {
					ctx.lineTo(tile.x + point.x, tile.y + point.y);
				}
			}
			ctx.closePath();

			ctx.fillStyle = fill;
			ctx.fill();
			ctx.stroke();

			if (!settings.hideDecorations) {
				drawFeatureGlyph(ctx, tile, featureVertices, hexSize);
				drawElevationGlyph(ctx, tile, hexSize);
				drawNaturalWonderGlyph(ctx, tile, hexSize);

				if (tile.resource) {
					ctx.fillStyle = settings.grayscaleTerrain ? "hsl(0deg 0% 18% / 0.48)" : "hsl(204deg 31% 20% / 0.34)";
					ctx.beginPath();
					ctx.arc(tile.x + hexSize * 0.3, tile.y - hexSize * 0.25, hexSize * 0.1, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}

		if (!settings.hideDecorations) {
			drawRiverOverlay(ctx, hexSize);

			// Keep note pins above the river overlay.
			for (const tile of mapTiles) {
				if (notesByKey[tile.key]) {
					drawNotePinGlyph(ctx, tile, hexSize);
				}
			}
		}
	}

	function adjustedTerrainColor(tile) {
		const terrain = tile.terrain || "";
		const terrainUpper = terrain.toUpperCase();
		const feature = settings.hideDecorations ? "" : tile.feature || "";

		let fill = resolveTerrainColor(terrain, feature, tile.raw?.elevation ?? 0);

		if (settings.flattenLandWater) {
			fill = terrainUpper.includes("OCEAN") || terrainUpper.includes("COAST") ? "#6d96b7" : "#b9b08f";
		}

		if (settings.grayscaleTerrain) {
			fill = settings.flattenLandWater ? flattenedGrayscaleTerrainColor(terrainUpper) : grayscaleTerrainHex(tile, fill);
		}

		return sanitizeHexColor(fill, "#76848f");
	}

	function mountViewport(node) {
		viewportEl = node;
		resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) {
				return;
			}
			viewportWidth = Math.max(1, Math.floor(entry.contentRect.width));
			viewportHeight = Math.max(1, Math.floor(entry.contentRect.height));
			if (mapMetrics) {
				const fitScale = Math.min(viewportWidth / mapMetrics.width, viewportHeight / mapMetrics.height);
				fitScaleLimit = fitScale;
				minScale = fitScaleLimit;
				maxScale = fitScaleLimit * 6;
				scale = clamp(scale || fitScale, minScale, maxScale);
			}

			if (mapMetrics && !hasUserViewportInteraction) {
				fitToView(false);
			} else {
				clampTranslate();
			}
		});
		resizeObserver.observe(node);

		return {
			destroy() {
				resizeObserver?.disconnect();
				resizeObserver = undefined;
				if (viewportEl === node) {
					viewportEl = undefined;
				}
			},
		};
	}

	function mountCanvas(node) {
		canvasEl = node;
		drawMap();
		return {
			destroy() {
				if (canvasEl === node) {
					canvasEl = undefined;
				}
			},
		};
	}

	async function ensureViewportSizeReady() {
		if (viewportWidth > 0 && viewportHeight > 0) {
			return;
		}

		for (let attempt = 0; attempt < 3; attempt += 1) {
			await tick();
			if (viewportEl) {
				const rect = viewportEl.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					viewportWidth = Math.max(1, Math.floor(rect.width));
					viewportHeight = Math.max(1, Math.floor(rect.height));
					return;
				}
			}
		}
	}

	function fitToView(forceReset = false) {
		if (!mapMetrics || !viewportWidth || !viewportHeight) {
			return;
		}

		const fitScale = Math.min(viewportWidth / mapMetrics.width, viewportHeight / mapMetrics.height);
		fitScaleLimit = fitScale;
		minScale = fitScaleLimit;
		maxScale = fitScaleLimit * 6;
		scale = clamp(forceReset ? fitScale : scale || fitScale, minScale, maxScale);

		const scaledWidth = mapMetrics.width * scale;
		const scaledHeight = mapMetrics.height * scale;
		translateX = (viewportWidth - scaledWidth) / 2;
		translateY = (viewportHeight - scaledHeight) / 2;
		clampTranslate();
	}

	function resetView() {
		hasUserViewportInteraction = false;
		fitToView(true);
	}

	function zoomBy(multiplier, focusPoint = null) {
		if (!mapMetrics) {
			return;
		}

		const current = scale || 1;
		const nextScale = clamp(current * multiplier, minScale, maxScale);
		if (Math.abs(nextScale - current) < 0.0001) {
			return;
		}

		const focusX = focusPoint ? focusPoint.x : viewportWidth / 2;
		const focusY = focusPoint ? focusPoint.y : viewportHeight / 2;
		const worldX = (focusX - translateX) / current;
		const worldY = (focusY - translateY) / current;

		scale = nextScale;
		translateX = focusX - worldX * nextScale;
		translateY = focusY - worldY * nextScale;
		clampTranslate();
	}

	function clampTranslate() {
		if (!mapMetrics || !viewportWidth || !viewportHeight || !scale) {
			return;
		}

		const scaledWidth = mapMetrics.width * scale;
		const scaledHeight = mapMetrics.height * scale;

		if (scaledWidth <= viewportWidth) {
			translateX = (viewportWidth - scaledWidth) / 2;
		} else {
			const minX = viewportWidth - scaledWidth;
			translateX = clamp(translateX, minX, 0);
		}

		if (scaledHeight <= viewportHeight) {
			translateY = (viewportHeight - scaledHeight) / 2;
		} else {
			const minY = viewportHeight - scaledHeight;
			translateY = clamp(translateY, minY, 0);
		}
	}

	function onViewportWheel(event) {
		if (!mapMetrics) {
			return;
		}
		event.preventDefault();
		hasUserViewportInteraction = true;

		const rect = viewportEl.getBoundingClientRect();
		wheelZoomFocus = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		wheelZoomDelta += event.deltaY;
		scheduleWheelZoomFrame();
	}

	function scheduleWheelZoomFrame() {
		if (typeof window === "undefined" || wheelZoomRafId !== null) {
			return;
		}
		wheelZoomRafId = window.requestAnimationFrame(() => {
			wheelZoomRafId = null;
			flushWheelZoom();
		});
	}

	function clearWheelZoomFrame() {
		if (typeof window !== "undefined" && wheelZoomRafId !== null) {
			window.cancelAnimationFrame(wheelZoomRafId);
		}
		wheelZoomRafId = null;
		wheelZoomDelta = 0;
		wheelZoomFocus = null;
	}

	function flushWheelZoom() {
		if (!mapMetrics || !wheelZoomDelta) {
			wheelZoomDelta = 0;
			return;
		}

		const normalizedDelta = clamp(wheelZoomDelta / 120, -4, 4);
		const multiplier = Math.pow(1.12, -normalizedDelta);
		const focus = wheelZoomFocus || {
			x: viewportWidth / 2,
			y: viewportHeight / 2,
		};
		wheelZoomDelta = 0;
		zoomBy(multiplier, focus);
	}

	function onViewportPointerDown(event) {
		if (!viewportEl) {
			return;
		}
		if (event.pointerType === "mouse" && event.button !== 0) {
			return;
		}

		hasUserViewportInteraction = true;
		hoveredTileKey = "";
		hoverPointer = null;

		if (event.pointerType === "touch") {
			activePointers.set(event.pointerId, {
				x: event.clientX,
				y: event.clientY,
			});
			if (activePointers.size >= 2) {
				const points = Array.from(activePointers.values());
				const first = points[0];
				const second = points[1];
				isPinching = true;
				pinchStartDistance = Math.hypot(first.x - second.x, first.y - second.y);
				pinchStartScale = scale;
				const rect = viewportEl.getBoundingClientRect();
				pinchCenter = {
					x: (first.x + second.x) / 2 - rect.left,
					y: (first.y + second.y) / 2 - rect.top,
				};
				activePointerId = null;
				isDragging = false;
				dragMoved = true;
				return;
			}
		}

		activePointerId = event.pointerId;
		isDragging = true;
		dragMoved = false;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragTranslateX = translateX;
		dragTranslateY = translateY;
		if (event.currentTarget && event.currentTarget.setPointerCapture) {
			event.currentTarget.setPointerCapture(event.pointerId);
		}
	}

	function onViewportPointerMove(event) {
		if (!mapMetrics) {
			return;
		}

		if (event.pointerType === "touch" && activePointers.has(event.pointerId)) {
			activePointers.set(event.pointerId, {
				x: event.clientX,
				y: event.clientY,
			});
		}

		if (isPinching && activePointers.size >= 2) {
			const points = Array.from(activePointers.values());
			const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
			if (pinchStartDistance > 0 && Number.isFinite(distance)) {
				const nextScale = clamp((distance / pinchStartDistance) * pinchStartScale, minScale, maxScale);
				const worldX = (pinchCenter.x - translateX) / scale;
				const worldY = (pinchCenter.y - translateY) / scale;
				scale = nextScale;
				translateX = pinchCenter.x - worldX * nextScale;
				translateY = pinchCenter.y - worldY * nextScale;
				clampTranslate();
			}
			return;
		}

		if (isDragging && event.pointerId === activePointerId) {
			const dx = event.clientX - dragStartX;
			const dy = event.clientY - dragStartY;
			if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
				dragMoved = true;
			}
			translateX = dragTranslateX + dx;
			translateY = dragTranslateY + dy;
			clampTranslate();
			return;
		}

		if (isDragging || isPinching) {
			return;
		}

		const pointer = eventToWorldPoint(event);
		if (!pointer) {
			return;
		}

		const tile = findTileAt(pointer.worldX, pointer.worldY);
		hoveredTileKey = tile ? tile.key : "";
		hoverPointer = tile
			? {
					x: pointer.localX,
					y: pointer.localY,
				}
			: null;
	}

	function onViewportPointerUp(event) {
		if (event.pointerType === "touch") {
			activePointers.delete(event.pointerId);
			if (isPinching && activePointers.size < 2) {
				isPinching = false;
				pinchStartDistance = 0;
				activePointerId = null;
				isDragging = false;
				dragMoved = true;
				return;
			}
		}

		if (event.pointerId !== activePointerId || !viewportEl) {
			return;
		}

		if (viewportEl.hasPointerCapture && viewportEl.hasPointerCapture(event.pointerId)) {
			viewportEl.releasePointerCapture(event.pointerId);
		}
		isDragging = false;
		activePointerId = null;

		if (dragMoved) {
			return;
		}

		const pointer = eventToWorldPoint(event);
		if (!pointer) {
			return;
		}
		const tile = findTileAt(pointer.worldX, pointer.worldY);
		if (tile) {
			selectTile(tile.key);
			if (event.pointerType === "touch") {
				hoveredTileKey = tile.key;
				hoverPointer = {
					x: pointer.localX,
					y: pointer.localY,
				};
			}
		} else if (event.pointerType === "touch") {
			hoveredTileKey = "";
			hoverPointer = null;
		}
	}

	function onViewportLeave() {
		if (!isDragging && !isPinching) {
			hoveredTileKey = "";
			hoverPointer = null;
		}
	}

	function eventToWorldPoint(event) {
		if (!viewportEl || !scale) {
			return null;
		}

		const rect = viewportEl.getBoundingClientRect();
		const localX = event.clientX - rect.left;
		const localY = event.clientY - rect.top;
		return {
			localX,
			localY,
			worldX: (localX - translateX) / scale,
			worldY: (localY - translateY) / scale,
		};
	}

	function findTileAt(worldX, worldY) {
		return findTileAtPoint({
			worldX,
			worldY,
			baseWidth: Number(baseData?.width || 0),
			baseHeight: Number(baseData?.height || 0),
			mapMetrics,
			hexSize: Number(currentMap.mapConfig.hexSize || 14),
			tileLookup,
		});
	}

	function handleSelectMap(nextMapId) {
		const normalized = String(nextMapId || "").trim();
		if (!normalized || normalized === activeMapId) {
			return;
		}
		activeMapId = normalized;
		if (typeof onSelectMap === "function") {
			onSelectMap(normalized);
		}
	}

	function selectTile(tileKey) {
		if (selectedTileKey !== tileKey) {
			pinStatus = "";
		}
		selectedTileKey = tileKey;
		syncEditorsFromSelection();
	}

	function resetLabelEditor() {
		editLabelId = "";
		editLabelNameInput = "";
		editLabelTypeInput = "region";
		editLabelPriorityInput = "standard";
		editLabelVariantInput = "land";
		editLabelSizeInput = "1";
		editLabelRotationInput = "0";
		editLabelMinZoomInput = "";
		editLabelMaxZoomInput = "";
	}

	function createPinId(civ, leader, tile) {
		if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
			return `pin-${crypto.randomUUID()}`;
		}
		const civKey = normalizeToken(civ) || "civ";
		const leaderKey = normalizeToken(leader) || "leader";
		const stamp = Date.now().toString(36);
		const rand = Math.floor(Math.random() * 0xffffff)
			.toString(36)
			.padStart(4, "0");
		return `${civKey}-${leaderKey}-${tile.col}-${tile.sourceRow}-${stamp}-${rand}`;
	}

	function resetPinEditor(options = {}) {
		editPinId = "";
		editPinCivInput = "";
		editPinGameDefineInput = DEFAULT_GAME_DEFINE_PREFIX;
		editPinLeaderInput = "";
		editPinCapitalInput = "";
		editPinAuthorInput = "";
		editPinPrimaryInput = "#243746";
		editPinSecondaryInput = "#f3d37f";
		editPinPrimaryHexInput = "#243746";
		editPinSecondaryHexInput = "#f3d37f";
		editPinIsIsland = false;
		if (options.clearStatus !== false) {
			pinStatus = "";
		}
	}

	function applyPinToEditor(pin) {
		editPinId = String(pin.id || "");
		editPinCivInput = pin.civ || "";
		editPinGameDefineInput = pin.gameDefineName || DEFAULT_GAME_DEFINE_PREFIX;
		editPinLeaderInput = pin.leader || "";
		editPinCapitalInput = pin.capital || "";
		editPinAuthorInput = pin.author || "";
		editPinPrimaryInput = sanitizeHexColor(pin.primary, "#243746");
		editPinSecondaryInput = sanitizeHexColor(pin.secondary, "#f3d37f");
		editPinPrimaryHexInput = editPinPrimaryInput.toUpperCase();
		editPinSecondaryHexInput = editPinSecondaryInput.toUpperCase();
		editPinIsIsland = Boolean(pin.isIsland);
	}

	function pinDisplayName(pin) {
		if (!pin) {
			return "Civilization";
		}
		const civ = String(pin.civ || "").trim() || "Civilization";
		const leader = String(pin.leader || "").trim();
		return leader ? `${civ} (${leader})` : civ;
	}

	function startNewPinEntry() {
		if (!selectedTile || !canEditPins) {
			return;
		}
		resetPinEditor({ clearStatus: false });
		pinStatus = "Ready to add a new civilization pin on this tile.";
	}

	function syncEditorsFromSelection() {
		const tile = selectedTile;
		if (!tile) {
			resetPinEditor();
			notesDraft = "";
			resetLabelEditor();
			labelStatus = "";
			return;
		}

		notesDraft = notesByKey[tile.key] || "";

		const activePin = editPinId ? pinsForTile(tile).find((pin) => String(pin.id || "") === String(editPinId)) || null : null;
		if (activePin) {
			applyPinToEditor(activePin);
		} else {
			resetPinEditor({ clearStatus: false });
		}

		const label = labelsForTile(tile)[0] || null;
		if (label) {
			loadLabelIntoEditor(label);
		} else {
			resetLabelEditor();
		}
		labelStatus = "";
	}

	function saveNotes() {
		if (!canEdit) {
			return;
		}

		const tile = selectedTile;
		if (!tile) {
			return;
		}

		const trimmed = String(notesDraft || "").trim();
		const nextNotes = { ...notesByKey };
		if (trimmed) {
			nextNotes[tile.key] = trimmed;
		} else {
			delete nextNotes[tile.key];
		}

		notesByKey = nextNotes;
		saveStorageJson(storageKey("notes"), notesByKey);
		notesStatus = trimmed ? "Saved." : "Cleared.";
		drawMap();
	}

	function refreshMapLabels() {
		if (!baseData || !mapMetrics) {
			mapLabels = [];
			return;
		}
		const merged = normalizeMapLabels([...(Array.isArray(staticMapLabelDefs) ? staticMapLabelDefs : []), ...(Array.isArray(customMapLabelDefs) ? customMapLabelDefs : [])]);
		mapLabels = materializeMapLabels(merged, {
			baseData,
			mapMetrics,
			hexSize: Number(currentMap.mapConfig.hexSize || 14),
		});
	}

	function labelsForTile(tile) {
		if (!tile) {
			return [];
		}
		return customMapLabelDefs.filter((label) => label.anchor && Number(label.anchor.col) === tile.col && Number(label.anchor.row) === tile.sourceRow).sort((a, b) => a.name.localeCompare(b.name));
	}

	function setCustomLabels(nextLabels, options = {}) {
		const queueSync = options.queueSync !== false;
		customMapLabelDefs = normalizeMapLabels(Array.isArray(nextLabels) ? nextLabels : []);
		saveStorageJson(storageKey("labels"), customMapLabelDefs);
		refreshMapLabels();
		if (queueSync) {
			labelCloudSyncDirty = true;
			scheduleCloudSyncNow();
		}
	}

	function addOrUpdateLabel() {
		if (!canEdit) {
			return;
		}

		const tile = selectedTile;
		if (!tile) {
			return;
		}

		const name = String(editLabelNameInput || "").trim();
		if (!name) {
			return;
		}

		const type = normalizeLabelTypeInput(editLabelTypeInput);
		const priority = normalizeLabelPriorityInput(editLabelPriorityInput);
		const variant = normalizeLabelVariantInput(editLabelVariantInput, type);
		const size = parseNumberInput(editLabelSizeInput);
		const rotation = parseNumberInput(editLabelRotationInput);
		const minZoomPercent = parseNumberInput(editLabelMinZoomInput);
		const maxZoomPercent = parseNumberInput(editLabelMaxZoomInput);
		const minZoom = Number.isFinite(minZoomPercent) ? minZoomPercent / 100 : null;
		const maxZoom = Number.isFinite(maxZoomPercent) ? maxZoomPercent / 100 : null;

		const nextLabel = {
			id: editLabelId || `user-${slugifyLabelName(name)}-${type}-${tile.col}-${tile.sourceRow}-${Date.now().toString(36)}`,
			name,
			type,
			priority,
			variant,
			anchor: {
				col: tile.col,
				row: tile.sourceRow,
			},
			rotation: Number.isFinite(rotation) ? rotation : 0,
		};
		if (Number.isFinite(size)) {
			nextLabel.size = clamp(size, 0.6, 2.4);
		}
		if (Number.isFinite(minZoom)) {
			nextLabel.minZoom = clamp(minZoom, 0, 10);
		}
		if (Number.isFinite(maxZoom)) {
			nextLabel.maxZoom = clamp(maxZoom, 0, 10);
		}

		const existingIndex = customMapLabelDefs.findIndex((label) => label.id === nextLabel.id);
		const nextLabels = [...customMapLabelDefs];
		if (existingIndex >= 0) {
			nextLabels[existingIndex] = nextLabel;
		} else {
			nextLabels.push(nextLabel);
		}

		setCustomLabels(nextLabels, { queueSync: true });
		loadLabelIntoEditor(nextLabel);
		labelStatus = existingIndex >= 0 ? "Label updated." : "Label added.";
	}

	function removeLabel() {
		if (!canEdit || !editLabelId) {
			return;
		}
		removeLabelById(editLabelId);
	}

	function removeLabelById(labelId) {
		if (!canEdit || !labelId) {
			return;
		}
		const nextLabels = customMapLabelDefs.filter((label) => label.id !== labelId);
		setCustomLabels(nextLabels, { queueSync: true });
		if (editLabelId === labelId) {
			resetLabelEditor();
		}
		labelStatus = "Label removed.";
	}

	function loadLabelIntoEditor(label) {
		if (!label) {
			return;
		}
		editLabelId = String(label.id || "");
		editLabelNameInput = String(label.name || "");
		editLabelTypeInput = normalizeLabelTypeInput(label.type);
		editLabelPriorityInput = normalizeLabelPriorityInput(label.priority);
		editLabelVariantInput = normalizeLabelVariantInput(label.variant, editLabelTypeInput);
		editLabelSizeInput = Number.isFinite(Number(label.size)) ? Number(label.size).toString() : "1";
		editLabelRotationInput = Number.isFinite(Number(label.rotation)) ? Number(label.rotation).toString() : "0";
		editLabelMinZoomInput = formatZoomPercentInput(label.minZoom);
		editLabelMaxZoomInput = formatZoomPercentInput(label.maxZoom);
	}

	function addOrUpdatePin() {
		if (!canEditPins) {
			return;
		}

		const tile = selectedTile;
		if (!tile) {
			return;
		}

		const civ = String(editPinCivInput || "").trim();
		if (!civ) {
			return;
		}

		const gameDefineName = String(editPinGameDefineInput || "").trim() || DEFAULT_GAME_DEFINE_PREFIX;
		const leader = String(editPinLeaderInput || "").trim();
		const capital = String(editPinCapitalInput || "").trim();
		const author = String(editPinAuthorInput || "").trim();
		const primary = sanitizeHexColor(editPinPrimaryInput, "#243746");
		const secondary = sanitizeHexColor(editPinSecondaryInput, "#f3d37f");

		const editablePins = pinEditTarget === "shared" ? sharedPins : localPins;
		const nextPins = [...editablePins];
		const existingIndex = editPinId ? nextPins.findIndex((pin) => String(pin.id || "") === String(editPinId)) : -1;

		const nextPin = {
			id: existingIndex >= 0 ? String(nextPins[existingIndex].id || "") : createPinId(civ, leader, tile),
			civ,
			gameDefineName,
			leader,
			capital,
			author,
			col: tile.col,
			row: tile.sourceRow,
			primary,
			secondary,
			isIsland: Boolean(editPinIsIsland),
		};

		if (existingIndex >= 0) {
			nextPins[existingIndex] = nextPin;
		} else {
			nextPins.push(nextPin);
		}

		if (pinEditTarget === "shared") {
			setSharedPins(nextPins, { queueSync: true });
			const blocker = sharedPinSyncBlockerReason();
			if (blocker) {
				pinCloudSyncNeedsFeedback = false;
				pinStatus = `Shared pin not saved to cloud. ${blocker}`;
			} else {
				pinCloudSyncNeedsFeedback = true;
				pinStatus = existingIndex >= 0 ? "Pin updated. Saving shared pins to cloud..." : "Pin added. Saving shared pins to cloud...";
				void flushCloudPins();
			}
		} else {
			setLocalPins(nextPins);
		}
		if (existingIndex >= 0) {
			editPinId = nextPin.id;
			if (pinEditTarget !== "shared") {
				pinStatus = "Pin updated.";
			}
		} else {
			resetPinEditor({ clearStatus: false });
			if (pinEditTarget !== "shared") {
				pinStatus = "Pin added. Enter another civilization to add the next pin.";
			}
		}
	}

	function removePin() {
		if (!canEditPins || !editPinId) {
			return;
		}
		removePinById(editPinId, pinEditTarget);
	}

	function removePinById(pinId, source) {
		if (!pinId) {
			return;
		}
		const target = normalizePinEditTarget(source || pinEditTarget);
		if (target === "shared" && !canEdit) {
			return;
		}
		const editablePins = target === "shared" ? sharedPins : localPins;
		const nextPins = editablePins.filter((pin) => String(pin.id || "") !== String(pinId));
		if (target === "shared") {
			setSharedPins(nextPins, { queueSync: true });
			const blocker = sharedPinSyncBlockerReason();
			if (blocker) {
				pinCloudSyncNeedsFeedback = false;
				pinStatus = `Shared pin removal not saved to cloud. ${blocker}`;
			} else {
				pinCloudSyncNeedsFeedback = true;
				pinStatus = "Pin removed. Saving shared pins to cloud...";
				void flushCloudPins();
			}
		} else {
			setLocalPins(nextPins);
			pinStatus = "Pin removed.";
		}
		if (String(editPinId || "") === String(pinId)) {
			resetPinEditor({ clearStatus: false });
		}
	}

	function loadPinIntoEditor(pin, source) {
		if (!pin) {
			return;
		}
		const target = normalizePinEditTarget(source || resolvePinSource(pin));
		if (target === "local" || canEdit) {
			setPinEditTarget(target);
		}
		applyPinToEditor(pin);
		pinStatus = "";
	}

	function updatePinColorFromPicker(kind, value) {
		const normalized = sanitizeHexColor(value, kind === "primary" ? "#243746" : "#f3d37f").toUpperCase();
		if (kind === "primary") {
			editPinPrimaryInput = normalized;
			editPinPrimaryHexInput = normalized;
			return;
		}
		editPinSecondaryInput = normalized;
		editPinSecondaryHexInput = normalized;
	}

	function updatePinColorFromHex(kind, value) {
		const draft = String(value || "");
		if (kind === "primary") {
			editPinPrimaryHexInput = draft;
		} else {
			editPinSecondaryHexInput = draft;
		}

		const parsed = parseHexInput(draft);
		if (!parsed) {
			return;
		}

		if (kind === "primary") {
			editPinPrimaryInput = parsed;
		} else {
			editPinSecondaryInput = parsed;
		}
	}

	function syncPinHexDraft(kind) {
		if (kind === "primary") {
			editPinPrimaryHexInput = editPinPrimaryInput.toUpperCase();
			return;
		}
		editPinSecondaryHexInput = editPinSecondaryInput.toUpperCase();
	}

	function pinsForTile(tile) {
		if (!tile) {
			return [];
		}

		return mapPins
			.filter((pin) => Number(pin.col) === tile.col && Number(pin.row) === tile.sourceRow)
			.sort((a, b) => {
				const civCompare = String(a.civ || "").localeCompare(String(b.civ || ""));
				if (civCompare !== 0) {
					return civCompare;
				}
				const leaderCompare = String(a.leader || "").localeCompare(String(b.leader || ""));
				if (leaderCompare !== 0) {
					return leaderCompare;
				}
				return String(a.capital || "").localeCompare(String(b.capital || ""));
			});
	}

	function pinMatches(a, b) {
		if (!a || !b) {
			return false;
		}
		if (a.id && b.id && a.id === b.id) {
			return true;
		}
		return (
			Number(a.col) === Number(b.col) &&
			Number(a.row) === Number(b.row) &&
			normalizeToken(a.civ) === normalizeToken(b.civ) &&
			normalizeToken(a.leader) === normalizeToken(b.leader) &&
			normalizeToken(a.capital) === normalizeToken(b.capital)
		);
	}

	function resolvePinSource(pin) {
		if (!pin) {
			return pinEditTarget;
		}
		if (pin.source === "shared" || pin.source === "local") {
			return pin.source;
		}
		if (localPins.some((candidate) => pinMatches(candidate, pin))) {
			return "local";
		}
		if (sharedPins.some((candidate) => pinMatches(candidate, pin))) {
			return "shared";
		}
		return pinEditTarget;
	}

	function pinGroupPoint(group) {
		if (!mapMetrics || !baseData || !group) {
			return null;
		}

		const col = Number(group.col);
		const sourceRow = Number(group.row);
		if (!Number.isFinite(col) || !Number.isFinite(sourceRow)) {
			return null;
		}

		const center = tileCenter(col, sourceRow, baseData.height, Number(currentMap.mapConfig.hexSize || 14));

		return {
			x: center.x - mapMetrics.minX,
			y: center.y - mapMetrics.minY,
		};
	}

	function pinGroupStyle(group) {
		if (!group || !Array.isArray(group.pins) || !group.pins.length) {
			return pinStyle(null);
		}
		if (group.pins.length > 1) {
			return "--primary:#666; --secondary: #000";
		}
		return pinStyle(group.pins[0]);
	}

	function pinGroupLabel(group) {
		if (!group || !Array.isArray(group.pins) || !group.pins.length) {
			return "Pinned civilization location";
		}
		const civNames = group.pins.map((pin) => pinDisplayName(pin)).filter(Boolean);
		if (!civNames.length) {
			return "Pinned civilization location";
		}
		const preview = civNames.slice(0, 4).join(", ");
		const overflow = civNames.length - 4;
		return overflow > 0 ? `${preview}, +${overflow} more civilizations` : preview;
	}

	function pinSatelliteOffset(index, total) {
		if (!total) {
			return { x: 0, y: 0 };
		}
		const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
		const radius = 12;
		return {
			x: Math.cos(angle) * radius,
			y: Math.sin(angle) * radius,
		};
	}

	function selectedOutlinePoints() {
		if (!selectedTile || !mapMetrics) {
			return "";
		}
		const vertices = buildHexVertices(Number(currentMap.mapConfig.hexSize || 14));
		return vertices.map((v) => `${selectedTile.x + v.x},${selectedTile.y + v.y}`).join(" ");
	}

	function hoveredOutlinePoints() {
		if (!hoveredTile || !mapMetrics || hoveredTile.key === selectedTileKey) {
			return "";
		}
		const vertices = buildHexVertices(Number(currentMap.mapConfig.hexSize || 14));
		return vertices.map((v) => `${hoveredTile.x + v.x},${hoveredTile.y + v.y}`).join(" ");
	}

	function toggleSetting(key) {
		settings = sanitizeSettings({
			...settings,
			[key]: !settings[key],
		});
		saveStorageJson(storageKey("settings"), settings);
		drawMap();
	}

	function resetSettings() {
		settings = sanitizeSettings({ ...DEFAULT_SETTINGS });
		saveStorageJson(storageKey("settings"), settings);
		drawMap();
	}

	function normalizePinViewMode(value) {
		const mode = String(value || "")
			.trim()
			.toLowerCase();
		if (mode === "all" || mode === "local" || mode === "combined") {
			return mode;
		}
		return "combined";
	}

	function normalizePinEditTarget(value) {
		const mode = String(value || "")
			.trim()
			.toLowerCase();
		if (mode === "shared" || mode === "local") {
			return mode;
		}
		return "local";
	}

	function getVisiblePins() {
		if (pinViewMode === "local") {
			return localPins.map((pin) => ({
				...pin,
				source: "local",
				viewId: `local:${pin.id || `${pin.civ}-${pin.col}-${pin.row}`}`,
			}));
		}
		if (pinViewMode === "all") {
			return sharedPins.map((pin) => ({
				...pin,
				source: "shared",
				viewId: `shared:${pin.id || `${pin.civ}-${pin.col}-${pin.row}`}`,
			}));
		}
		return [
			...localPins.map((pin) => ({
				...pin,
				source: "local",
				viewId: `local:${pin.id || `${pin.civ}-${pin.col}-${pin.row}`}`,
			})),
			...sharedPins.map((pin) => ({
				...pin,
				source: "shared",
				viewId: `shared:${pin.id || `${pin.civ}-${pin.col}-${pin.row}`}`,
			})),
		];
	}

	function refreshVisiblePins(options = {}) {
		const shouldSync = options.syncEditors !== false;
		const shouldDraw = options.draw !== false;
		mapPins = normalizePins(getVisiblePins());
		if (shouldSync) {
			syncEditorsFromSelection();
		}
		if (shouldDraw) {
			drawMap();
		}
	}

	function setPinViewMode(nextMode) {
		pinViewMode = normalizePinViewMode(nextMode);
		saveStorageJson(storageKey("pin-view-mode"), pinViewMode);
		refreshVisiblePins({ syncEditors: false, draw: false });
	}

	function setPinEditTarget(nextTarget) {
		const normalized = normalizePinEditTarget(nextTarget);
		pinEditTarget = canEdit ? normalized : "local";
		saveStorageJson(storageKey("pin-edit-target"), pinEditTarget);
		syncEditorsFromSelection();
	}

	function normalizePanelTab(nextTab) {
		const normalized = String(nextTab || "")
			.trim()
			.toLowerCase();
		return PANEL_TAB_ORDER.includes(normalized) ? normalized : "edit";
	}

	function selectPanelTab(nextTab) {
		panelTab = normalizePanelTab(nextTab);
	}

	function focusPanelTab(tab) {
		if (typeof document === "undefined") {
			return;
		}
		const trigger = document.getElementById(`map-tools-tab-${normalizePanelTab(tab)}`);
		if (trigger instanceof HTMLButtonElement) {
			trigger.focus();
		}
	}

	function onPanelTabListKeydown(event) {
		const key = String(event.key || "");
		if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) {
			return;
		}

		event.preventDefault();
		const activeTab = normalizePanelTab(panelTab);
		const currentIndex = PANEL_TAB_ORDER.indexOf(activeTab);
		if (currentIndex < 0) {
			return;
		}

		let nextIndex = currentIndex;
		if (key === "ArrowRight") {
			nextIndex = (currentIndex + 1) % PANEL_TAB_ORDER.length;
		} else if (key === "ArrowLeft") {
			nextIndex = (currentIndex - 1 + PANEL_TAB_ORDER.length) % PANEL_TAB_ORDER.length;
		} else if (key === "Home") {
			nextIndex = 0;
		} else if (key === "End") {
			nextIndex = PANEL_TAB_ORDER.length - 1;
		}

		const nextTab = PANEL_TAB_ORDER[nextIndex];
		selectPanelTab(nextTab);
		focusPanelTab(nextTab);
	}

	function setPanelCollapsed(nextValue, options = {}) {
		panelCollapsed = Boolean(nextValue);
		if (options.persist !== false) {
			panelCollapsedPreference = panelCollapsed;
			saveStorageJson(storageKey("panel-collapsed"), panelCollapsedPreference);
		}
	}

	function setLocalPins(nextPins, options = {}) {
		localPins = normalizePins(nextPins);
		if (options.persist !== false) {
			saveStorageJson(storageKey("pins-local"), localPins);
		}
		if (options.refresh !== false) {
			refreshVisiblePins();
		}
	}

	function resetLocalPins() {
		setLocalPins([]);
		if (typeof localStorage !== "undefined") {
			localStorage.removeItem(storageKey("pins-local"));
		}
		syncEditorsFromSelection();
	}

	function setSharedPins(nextPins, options = {}) {
		sharedPins = normalizePins(nextPins);
		if (options.persist !== false) {
			saveStorageJson(storageKey("pins-shared"), sharedPins);
		}
		if (options.queueSync) {
			pinCloudSyncDirty = true;
			scheduleCloudSyncNow();
		}
		if (options.refresh !== false) {
			refreshVisiblePins();
		}
	}

	function hasCloudPinSyncConfig() {
		return hasCloudPinSyncConfigUtil({
			supabaseUrl: SUPABASE_URL,
			supabaseAnonKey: SUPABASE_ANON_KEY,
			supabasePinsTable: SUPABASE_PINS_TABLE,
			mapId: currentMap?.id,
		});
	}

	function hasCloudLabelSyncConfig() {
		return hasCloudPinSyncConfigUtil({
			supabaseUrl: SUPABASE_URL,
			supabaseAnonKey: SUPABASE_ANON_KEY,
			supabasePinsTable: SUPABASE_LABELS_TABLE,
			mapId: currentMap?.id,
		});
	}

	function canPushCloudPins() {
		return canPushCloudPinsUtil({
			hasConfig: hasCloudPinSyncConfig(),
			authAccessToken,
			authUserEmail: authUser?.email,
			canEdit,
		});
	}

	function sharedPinSyncBlockerReason() {
		if (!hasCloudPinSyncConfig()) {
			return "Cloud sync is not configured for this map.";
		}
		if (!canEdit) {
			return "Your account does not currently have shared edit access.";
		}
		if (!authUser?.email) {
			return "You are not signed in.";
		}
		if (!authAccessToken) {
			return "Your session token is missing or expired. Please sign in again.";
		}
		return "";
	}

	function canPushCloudLabels() {
		return canPushCloudPinsUtil({
			hasConfig: hasCloudLabelSyncConfig(),
			authAccessToken,
			authUserEmail: authUser?.email,
			canEdit,
		});
	}

	function buildPinsSignature(input) {
		return buildPinsSignatureUtil(input);
	}

	function buildLabelsSignature(input) {
		if (!Array.isArray(input) || !input.length) {
			return "[]";
		}

		return JSON.stringify(
			[...input]
				.map((label) => ({
					id: String(label?.id || ""),
					name: String(label?.name || ""),
					type: String(label?.type || ""),
					priority: String(label?.priority || ""),
					variant: String(label?.variant || ""),
					size: Number.isFinite(Number(label?.size)) ? Number(label.size) : null,
					rotation: Number.isFinite(Number(label?.rotation)) ? Number(label.rotation) : 0,
					minZoom: Number.isFinite(Number(label?.minZoom)) ? Number(label.minZoom) : null,
					maxZoom: Number.isFinite(Number(label?.maxZoom)) ? Number(label.maxZoom) : null,
					anchor: label?.anchor
						? {
								col: Number(label.anchor.col),
								row: Number(label.anchor.row),
							}
						: null,
					densityUnlock: label?.densityUnlock
						? {
								minimal: Number.isFinite(Number(label.densityUnlock.minimal)) ? Number(label.densityUnlock.minimal) : null,
								standard: Number.isFinite(Number(label.densityUnlock.standard)) ? Number(label.densityUnlock.standard) : null,
								detailed: Number.isFinite(Number(label.densityUnlock.detailed)) ? Number(label.densityUnlock.detailed) : null,
							}
						: null,
				}))
				.sort((a, b) => a.id.localeCompare(b.id)),
		);
	}

	function sanitizeExportFilename(value, fallback) {
		const trimmed = String(value || "").trim();
		const safe = trimmed.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
		return safe || fallback;
	}

	function generateModId() {
		if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
			return crypto.randomUUID();
		}
		const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
		return template.replace(/[xy]/g, (char) => {
			const rand = Math.floor(Math.random() * 16);
			const value = char === "x" ? rand : (rand & 0x3) | 0x8;
			return value.toString(16);
		});
	}

	function downloadTextFile(filename, content) {
		if (!content || typeof document === "undefined") {
			return;
		}
		const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		link.remove();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function rebuildExportPayload() {
		const exportSourcePins = exportPinScope === "local" ? localPins : [...localPins, ...sharedPins];
		const normalizedPins = normalizePinsForExport(exportSourcePins);
		const width = Number(baseData?.width || 0);
		const height = Number(baseData?.height || 0);
		const warnings = [];
		const baseName = "TSLs";
		const sqlFile = `${baseName}.sql`;
		const luaFile = `${baseName}_updated.lua`;
		const modinfoFile = `${baseName}.modinfo`;

		exportPinCount = normalizedPins.length;

		if (!exportModId) {
			exportModId = generateModId();
		}

		const duplicates = findDuplicateCivs(normalizedPins);
		if (duplicates.length) {
			warnings.push(`Duplicate civ entries: ${duplicates.map((entry) => `${entry.label || entry.civ} (${entry.count})`).join(", ")}`);
		}

		const normalizedTableName = DEFAULT_TSL_TABLE_NAME;

		if (width > 0 && height > 0) {
			const outOfBounds = normalizedPins.filter((pin) => pin.col < 0 || pin.col >= width || pin.row < 0 || pin.row >= height);
			if (outOfBounds.length) {
				warnings.push(`${outOfBounds.length} pin(s) are outside the map bounds (${width}x${height}).`);
			}
		} else {
			warnings.push("Map dimensions are unavailable; Lua export will use 0x0.");
		}

		exportWarnings = warnings;

		exportSqlText = buildCbrxTslSql({
			pins: normalizedPins,
			tableName: normalizedTableName,
			sortMode: exportSortMode,
		});
		exportLuaText = buildCbrxTslLua({ width, height, tableName: normalizedTableName });
		exportModInfoText = buildTslModInfo({
			modId: exportModId,
			name: "CMC True Starting Location Script",
			teaser: "TSL Bundle Mod",
			description: "Generated by the CMC Website",
			authors: "Coiot + JFD",
			sqlFile,
			luaFile,
			sqlContent: exportSqlText,
			luaContent: exportLuaText,
		});

		if (!normalizedPins.length) {
			exportStatus = "No pins available yet. Add civilization pins to generate rows.";
		} else {
			exportStatus = `Ready: ${normalizedPins.length} pin(s).`;
		}
	}

	function downloadExportSql() {
		rebuildExportPayload();
		const baseName = sanitizeExportFilename("TSLs", "TSLs");
		downloadTextFile(`${baseName}.sql`, exportSqlText);
	}

	function downloadExportZip() {
		rebuildExportPayload();
		const baseName = sanitizeExportFilename("TSLs", "TSLs");
		const zipBlob = buildZipBlob([
			{ name: `${baseName}.sql`, content: exportSqlText },
			{ name: `${baseName}.lua`, content: exportLuaText },
			{ name: `${baseName}.modinfo`, content: exportModInfoText },
		]);
		if (typeof document === "undefined") {
			return;
		}
		const url = URL.createObjectURL(zipBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `CMC-TSL-Script.zip`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function scheduleCloudSyncNow() {
		if (cloudSyncQueued) {
			return;
		}
		cloudSyncQueued = true;
		Promise.resolve().then(() => {
			cloudSyncQueued = false;
			void syncPinsCloudTick();
		});
	}

	async function ensureRealtimeClient() {
		if (realtimeClient || typeof window === "undefined" || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
			return realtimeClient;
		}
		try {
			realtimeClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
				auth: {
					persistSession: false,
					autoRefreshToken: false,
					detectSessionInUrl: false,
				},
			});
			if (authAccessToken && typeof realtimeClient?.realtime?.setAuth === "function") {
				realtimeClient.realtime.setAuth(authAccessToken);
			}
			return realtimeClient;
		} catch (error) {
			console.warn("Realtime subscriptions are unavailable; using manual sync triggers.", error);
			return null;
		}
	}

	async function startRealtimeSubscriptions() {
		const mapId = String(currentMap?.id || "").trim();
		if (!mapId || typeof window === "undefined") {
			return;
		}
		const wantsPins = hasCloudPinSyncConfig();
		const wantsLabels = hasCloudLabelSyncConfig();
		if (!wantsPins && !wantsLabels) {
			stopRealtimeSubscriptions();
			return;
		}
		if (realtimeSubscribedMapId === mapId) {
			return;
		}

		stopRealtimeSubscriptions();
		const client = await ensureRealtimeClient();
		if (!client) {
			return;
		}
		if (authAccessToken && typeof client?.realtime?.setAuth === "function") {
			client.realtime.setAuth(authAccessToken);
		}

		if (wantsPins) {
			realtimePinsChannel = client
				.channel(`cmc-pins:${mapId}`)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: SUPABASE_PINS_TABLE,
						filter: `map_id=eq.${mapId}`,
					},
					() => {
						void pullCloudPins({ forceApply: false });
					},
				)
				.subscribe();
		}

		if (wantsLabels) {
			realtimeLabelsChannel = client
				.channel(`cmc-labels:${mapId}`)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: SUPABASE_LABELS_TABLE,
						filter: `map_id=eq.${mapId}`,
					},
					() => {
						void pullCloudLabels({ forceApply: false });
					},
				)
				.subscribe();
		}

		realtimeSubscribedMapId = mapId;
	}

	function stopRealtimeSubscriptions() {
		if (realtimeClient && realtimePinsChannel) {
			realtimeClient.removeChannel(realtimePinsChannel);
		}
		if (realtimeClient && realtimeLabelsChannel) {
			realtimeClient.removeChannel(realtimeLabelsChannel);
		}
		realtimePinsChannel = null;
		realtimeLabelsChannel = null;
		realtimeSubscribedMapId = "";
	}

	function startPinCloudSyncLoop() {
		stopPinCloudSyncLoop();
		if ((!hasCloudPinSyncConfig() && !hasCloudLabelSyncConfig()) || typeof window === "undefined") {
			return;
		}

		cloudSyncVisibilityHandler = () => {
			if (typeof document === "undefined" || document.visibilityState === "visible") {
				scheduleCloudSyncNow();
			}
		};
		cloudSyncFocusHandler = () => {
			scheduleCloudSyncNow();
		};
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", cloudSyncVisibilityHandler);
		}
		window.addEventListener("focus", cloudSyncFocusHandler);
		void startRealtimeSubscriptions();
		scheduleCloudSyncNow();
	}

	function stopPinCloudSyncLoop() {
		if (typeof document !== "undefined" && cloudSyncVisibilityHandler) {
			document.removeEventListener("visibilitychange", cloudSyncVisibilityHandler);
		}
		if (typeof window !== "undefined" && cloudSyncFocusHandler) {
			window.removeEventListener("focus", cloudSyncFocusHandler);
		}
		cloudSyncVisibilityHandler = null;
		cloudSyncFocusHandler = null;
		stopRealtimeSubscriptions();
		cloudSyncQueued = false;
		pinCloudSyncBusy = false;
		pinCloudPullBusy = false;
		labelCloudSyncBusy = false;
		labelCloudPullBusy = false;
	}

	async function syncPinsCloudTick() {
		const visibilityState = typeof document !== "undefined" ? document.visibilityState : "visible";
		const pinAction = resolveCloudSyncAction({
			hasConfig: hasCloudPinSyncConfig(),
			visibilityState,
			isDirty: pinCloudSyncDirty,
		});
		if (pinAction === "push") {
			await flushCloudPins();
		} else if (pinAction === "pull") {
			await pullCloudPins({ forceApply: false });
		}

		const labelAction = resolveCloudSyncAction({
			hasConfig: hasCloudLabelSyncConfig(),
			visibilityState,
			isDirty: labelCloudSyncDirty,
		});
		if (labelAction === "push") {
			await flushCloudLabels();
		} else if (labelAction === "pull") {
			await pullCloudLabels({ forceApply: false });
		}
	}

	async function flushCloudPins() {
		if (!pinCloudSyncDirty || pinCloudSyncBusy || !canPushCloudPins()) {
			return;
		}

		pinCloudSyncBusy = true;
		try {
			const body = [
				{
					map_id: String(currentMap.id),
					pins: sharedPins,
					updated_by: String(authUser?.email || ""),
				},
			];
			const query = new URLSearchParams();
			query.set("on_conflict", "map_id");
			query.set("select", "map_id,updated_at");

			const response = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_PINS_TABLE)}?${query.toString()}`, {
				method: "POST",
				headers: {
					apikey: SUPABASE_ANON_KEY,
					Authorization: `Bearer ${authAccessToken}`,
					"Content-Type": "application/json",
					Prefer: "resolution=merge-duplicates,return=representation",
				},
				body: JSON.stringify(body),
			});

			const text = await response.text().catch(() => "");
			if (!response.ok) {
				throw new Error(`Unable to sync map pins (${response.status}). ${text}`);
			}
			let payload = [];
			if (text) {
				try {
					payload = JSON.parse(text);
				} catch {
					throw new Error("Supabase returned an invalid response while confirming the cloud write.");
				}
			}
			if (!Array.isArray(payload) || !payload.length) {
				throw new Error("Cloud write was not confirmed by Supabase (no row returned). Check table RLS policies.");
			}

			pinCloudSyncDirty = false;
			if (pinCloudSyncNeedsFeedback) {
				pinStatus = "Shared pins saved to cloud.";
				pinCloudSyncNeedsFeedback = false;
			}
		} catch (syncError) {
			if (pinCloudSyncNeedsFeedback) {
				pinStatus = `Shared pin sync failed. ${formatSyncErrorMessage(syncError, "Please try again.")}`;
			}
			console.error(syncError);
		} finally {
			pinCloudSyncBusy = false;
		}
	}

	async function pullCloudPins(options = {}) {
		if (pinCloudPullBusy || !hasCloudPinSyncConfig()) {
			return;
		}

		const forceApply = Boolean(options.forceApply);
		pinCloudPullBusy = true;
		try {
			const query = new URLSearchParams();
			query.set("select", "map_id,pins,updated_at");
			query.set("map_id", `eq.${String(currentMap.id)}`);
			query.set("limit", "1");

			const headers = {
				apikey: SUPABASE_ANON_KEY,
			};
			if (authAccessToken) {
				headers.Authorization = `Bearer ${authAccessToken}`;
			}

			const response = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_PINS_TABLE)}?${query.toString()}`, {
				headers,
			});

			if (!response.ok) {
				const text = await response.text().catch(() => "");
				throw new Error(`Unable to fetch cloud pins (${response.status}). ${text}`);
			}

			const rows = await response.json().catch(() => []);
			const row = Array.isArray(rows) && rows.length ? rows[0] : null;
			if (!row || !Array.isArray(row.pins)) {
				return;
			}
			if (!forceApply && pinCloudSyncDirty) {
				return;
			}

			const nextPins = normalizePins(row.pins);
			if (buildPinsSignature(nextPins) === buildPinsSignature(sharedPins)) {
				return;
			}

			setSharedPins(nextPins, { persist: true, refresh: true });
		} catch (pullError) {
			console.error(pullError);
		} finally {
			pinCloudPullBusy = false;
		}
	}

	async function flushCloudLabels() {
		if (!labelCloudSyncDirty || labelCloudSyncBusy || !canPushCloudLabels()) {
			return;
		}

		labelCloudSyncBusy = true;
		try {
			const body = [
				{
					map_id: String(currentMap.id),
					labels: customMapLabelDefs,
					updated_by: String(authUser?.email || ""),
				},
			];
			const query = new URLSearchParams();
			query.set("on_conflict", "map_id");

			const response = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_LABELS_TABLE)}?${query.toString()}`, {
				method: "POST",
				headers: {
					apikey: SUPABASE_ANON_KEY,
					Authorization: `Bearer ${authAccessToken}`,
					"Content-Type": "application/json",
					Prefer: "resolution=merge-duplicates,return=minimal",
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const text = await response.text().catch(() => "");
				throw new Error(`Unable to sync map labels (${response.status}). ${text}`);
			}

			labelCloudSyncDirty = false;
		} catch (syncError) {
			console.error(syncError);
		} finally {
			labelCloudSyncBusy = false;
		}
	}

	async function pullCloudLabels(options = {}) {
		if (labelCloudPullBusy || !hasCloudLabelSyncConfig()) {
			return;
		}

		const forceApply = Boolean(options.forceApply);
		labelCloudPullBusy = true;
		try {
			const query = new URLSearchParams();
			query.set("select", "map_id,labels,updated_at");
			query.set("map_id", `eq.${String(currentMap.id)}`);
			query.set("limit", "1");

			const headers = {
				apikey: SUPABASE_ANON_KEY,
			};
			if (authAccessToken) {
				headers.Authorization = `Bearer ${authAccessToken}`;
			}

			const response = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_LABELS_TABLE)}?${query.toString()}`, {
				headers,
			});

			if (!response.ok) {
				const text = await response.text().catch(() => "");
				throw new Error(`Unable to fetch cloud labels (${response.status}). ${text}`);
			}

			const rows = await response.json().catch(() => []);
			const row = Array.isArray(rows) && rows.length ? rows[0] : null;
			if (!row || !Array.isArray(row.labels)) {
				return;
			}
			if (!forceApply && labelCloudSyncDirty) {
				return;
			}

			const nextLabels = normalizeMapLabels(row.labels);
			if (buildLabelsSignature(nextLabels) === buildLabelsSignature(customMapLabelDefs)) {
				return;
			}

			customMapLabelDefs = nextLabels;
			saveStorageJson(storageKey("labels"), customMapLabelDefs);
			refreshMapLabels();
			syncEditorsFromSelection();
		} catch (pullError) {
			console.error(pullError);
		} finally {
			labelCloudPullBusy = false;
		}
	}

	function storageKey(type) {
		return `${STORAGE_PREFIX}:${currentMap?.id || "unknown"}:${type}`;
	}

	function storageKeyForMap(mapId, type) {
		return `${STORAGE_PREFIX}:${mapId || "unknown"}:${type}`;
	}

	function parsePinsArray(value) {
		if (Array.isArray(value)) {
			return value;
		}
		if (typeof value === "string") {
			try {
				const parsed = JSON.parse(value);
				return Array.isArray(parsed) ? parsed : [];
			} catch {
				return [];
			}
		}
		return [];
	}

	function loadStoredPinCountsForMap(mapId) {
		const localStored = loadStorageJson(storageKeyForMap(mapId, "pins-local"), null);
		const legacyStored = loadStorageJson(storageKeyForMap(mapId, "pins"), null);
		const sharedStored = loadStorageJson(storageKeyForMap(mapId, "pins-shared"), null);

		const localSource = Array.isArray(localStored) ? localStored : Array.isArray(legacyStored) ? legacyStored : [];
		const localCount = normalizePins(localSource).length;
		const sharedCount = normalizePins(Array.isArray(sharedStored) ? sharedStored : []).length;
		const hasShared = Array.isArray(sharedStored);

		return {
			local: localCount,
			shared: sharedCount,
			hasShared,
		};
	}

	async function fetchCloudPinCountsByMap() {
		if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_PINS_TABLE) {
			return null;
		}

		const query = new URLSearchParams();
		query.set("select", "map_id,pins");
		query.set("limit", "500");

		const headers = {
			apikey: SUPABASE_ANON_KEY,
		};
		if (authAccessToken) {
			headers.Authorization = `Bearer ${authAccessToken}`;
		}

		const response = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_PINS_TABLE)}?${query.toString()}`, {
			headers,
		});

		if (!response.ok) {
			const text = await response.text().catch(() => "");
			throw new Error(`Unable to fetch map pin counts (${response.status}). ${text}`);
		}

		const rows = await response.json().catch(() => []);
		if (!Array.isArray(rows)) {
			return {};
		}

		const counts = {};
		for (const row of rows) {
			const mapId = String(row?.map_id || "").trim();
			if (!mapId) {
				continue;
			}
			const count = normalizePins(parsePinsArray(row?.pins)).length;
			counts[mapId] = Math.max(Number(counts[mapId] || 0), count);
		}

		return counts;
	}

	function baseCacheKey(mapId) {
		return `${STORAGE_PREFIX}:base:${mapId || "unknown"}:v${BASE_CACHE_VERSION}`;
	}

	function isValidBasePayload(payload) {
		return Boolean(payload && typeof payload === "object" && Number.isFinite(Number(payload.width)) && Number.isFinite(Number(payload.height)) && Array.isArray(payload.mapTiles));
	}

	function loadCachedBasePayload(mapId) {
		if (!mapId) {
			return null;
		}

		const memoryCached = basePayloadMemoryCache.get(mapId);
		if (isValidBasePayload(memoryCached)) {
			return memoryCached;
		}

		const stored = loadStorageJson(baseCacheKey(mapId), null);
		if (!isValidBasePayload(stored)) {
			return null;
		}

		basePayloadMemoryCache.set(mapId, stored);
		return stored;
	}

	function saveCachedBasePayload(mapId, payload) {
		if (!mapId || !isValidBasePayload(payload)) {
			return;
		}

		basePayloadMemoryCache.set(mapId, payload);
		saveStorageJson(baseCacheKey(mapId), payload);
	}

	function clearPrefetchSchedule() {
		if (typeof window === "undefined") {
			return;
		}
		if (mapPrefetchIdleHandle !== null && typeof window.cancelIdleCallback === "function") {
			window.cancelIdleCallback(mapPrefetchIdleHandle);
		}
		if (mapPrefetchTimeoutHandle !== null) {
			window.clearTimeout(mapPrefetchTimeoutHandle);
		}
		mapPrefetchIdleHandle = null;
		mapPrefetchTimeoutHandle = null;
	}

	function scheduleBasePrefetch() {
		if (typeof window === "undefined") {
			return;
		}
		const queue = buildLikelyMapPrefetchQueue(maps, currentMap?.id, BASE_PREFETCH_LIMIT);
		if (!queue.length) {
			return;
		}

		clearPrefetchSchedule();
		const runPrefetch = () => {
			void prefetchBasePayloads(queue);
		};

		if (typeof window.requestIdleCallback === "function") {
			mapPrefetchIdleHandle = window.requestIdleCallback(
				() => {
					mapPrefetchIdleHandle = null;
					runPrefetch();
				},
				{ timeout: 1800 },
			);
			return;
		}

		mapPrefetchTimeoutHandle = window.setTimeout(() => {
			mapPrefetchTimeoutHandle = null;
			runPrefetch();
		}, 450);
	}

	async function prefetchBasePayloads(queue) {
		if (!Array.isArray(queue) || !queue.length) {
			return;
		}

		for (const candidateMapId of queue) {
			if (!candidateMapId || loadCachedBasePayload(candidateMapId)) {
				continue;
			}
			const candidateMap = maps.find((entry) => entry?.id === candidateMapId);
			const baseCacheUrl = candidateMap?.mapConfig?.baseCacheUrl;
			if (!baseCacheUrl) {
				continue;
			}
			try {
				const payload = await fetchJsonSafe(resolveAssetUrl(baseCacheUrl), "base prefetch");
				saveCachedBasePayload(candidateMapId, payload);
			} catch {
				// Ignore prefetch failures and keep user-visible map loading fast.
			}
		}
	}

	function resolveAssetUrl(path) {
		if (!path) {
			return path;
		}
		if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) {
			return path;
		}

		const raw = String(path);
		const normalized = raw.replace(/^\/+/, "");
		const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
		const encodedPath = normalized
			.split("/")
			.map((segment) => encodeURIComponent(segment))
			.join("/");

		return `${base}/${encodedPath}`;
	}

	async function fetchJsonSafe(url, label) {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Unable to load ${label} json (${response.status}) from ${url}`);
		}

		const raw = await response.text();
		const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

		try {
			return JSON.parse(text);
		} catch (parseError) {
			const snippet = text.slice(0, 180).replace(/\s+/g, " ");
			throw new Error(`Invalid ${label} json from ${url}. ${parseError?.message || "Parse error"}. Snippet: ${snippet}`);
		}
	}

	function loadStorageJson(key, fallback) {
		if (typeof localStorage === "undefined") {
			return fallback;
		}
		try {
			const raw = localStorage.getItem(key);
			if (!raw) {
				return fallback;
			}
			return JSON.parse(raw);
		} catch {
			return fallback;
		}
	}

	function saveStorageJson(key, value) {
		if (typeof localStorage === "undefined") {
			return;
		}
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Ignore write failures.
		}
	}

	function sanitizeHexColor(color, fallback) {
		return sanitizeHexColorUtil(color, fallback);
	}

	function parseHexInput(value) {
		return parseHexInputUtil(value);
	}

	function pinStyle(pin) {
		const primary = sanitizeHexColor(pin?.primary, "#243746");
		const secondary = sanitizeHexColor(pin?.secondary, "#f3d37f");
		return `--primary:${primary};--secondary:${secondary}`;
	}

	function lookupString(list, index) {
		if (!Array.isArray(list) || index === undefined || index === null || index === 0xff) {
			return null;
		}
		return index >= 0 && index < list.length ? list[index] : null;
	}

	function normalizeToken(value) {
		return normalizeTokenUtil(value);
	}

	function normalizePins(input) {
		return normalizePinsUtil(input, {
			defaultPrimary: "#243746",
			defaultSecondary: "#f3d37f",
		});
	}

	function formatColorDisplay(color, fallback) {
		const hex = sanitizeHexColor(color, fallback).toUpperCase();
		const rgb = hexToRgb(hex);
		const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
		return {
			hex,
			rgb: `(${rgb.r}, ${rgb.g}, ${rgb.b})`,
			hsl: `(${hsl.h}deg ${hsl.s}% ${hsl.l}%)`,
		};
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

	function normalizeRawTile(rawTile) {
		if (rawTile && typeof rawTile === "object") {
			return {
				terrainType: Number.isFinite(rawTile.terrainType) ? rawTile.terrainType : 0,
				resourceType: Number.isFinite(rawTile.resourceType) ? rawTile.resourceType : 0xff,
				featureTerrainType: Number.isFinite(rawTile.featureTerrainType) ? rawTile.featureTerrainType : 0xff,
				featureWonderType: Number.isFinite(rawTile.featureWonderType) ? rawTile.featureWonderType : 0xff,
				riverData: Number.isFinite(rawTile.riverData) ? rawTile.riverData : 0,
				elevation: Number.isFinite(rawTile.elevation) ? rawTile.elevation : 0,
				continent: Number.isFinite(rawTile.continent) ? rawTile.continent : 0,
				resourceAmount: Number.isFinite(rawTile.resourceAmount) ? rawTile.resourceAmount : 0,
				improvementType: Number.isFinite(rawTile.improvementType) ? rawTile.improvementType : 0xff,
			};
		}

		return {
			terrainType: 0,
			resourceType: 0xff,
			featureTerrainType: 0xff,
			featureWonderType: 0xff,
			riverData: 0,
			elevation: 0,
			continent: 0,
			resourceAmount: 0,
			improvementType: 0xff,
		};
	}

	function resolveNaturalWonder(payload, rawTile) {
		const fromWonderList = lookupString(payload?.featureWonderList, rawTile?.featureWonderType);
		if (fromWonderList) {
			return fromWonderList;
		}
		const fromFeature = lookupString(payload?.featureTerrainList, rawTile?.featureTerrainType);
		if (fromFeature && KNOWN_NATURAL_WONDER_FEATURES.has(String(fromFeature).toUpperCase())) {
			return fromFeature;
		}
		return "";
	}

	function drawNaturalWonderGlyph(ctx, tile, hexSize) {
		if (!tile?.naturalWonder) {
			return;
		}

		const spikes = 5;
		const outer = Math.max(2.7, hexSize * 0.4);
		const inner = outer * 0.5;
		const startAngle = -Math.PI / 2;

		ctx.save();
		ctx.beginPath();
		for (let index = 0; index < spikes * 2; index += 1) {
			const radius = index % 2 === 0 ? outer : inner;
			const angle = startAngle + (index * Math.PI) / spikes;
			const x = tile.x + Math.cos(angle) * radius;
			const y = tile.y + Math.sin(angle) * radius;
			if (index === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		}
		ctx.closePath();
		ctx.fillStyle = "hsl(49deg 96% 59% / 0.92)";
		ctx.strokeStyle = "hsl(31deg 92% 19% / 0.86)";
		ctx.lineWidth = Math.max(0.7, hexSize * 0.045);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

	function drawFeatureGlyph(ctx, tile, glyphVertices, hexSize) {
		const featureColor = featureGlyphColor(tile.feature);
		if (!featureColor) {
			return;
		}

		ctx.beginPath();
		for (let index = 0; index < glyphVertices.length; index += 1) {
			const point = glyphVertices[index];
			if (index === 0) {
				ctx.moveTo(tile.x + point.x, tile.y + point.y);
			} else {
				ctx.lineTo(tile.x + point.x, tile.y + point.y);
			}
		}
		ctx.closePath();
		ctx.fillStyle = featureColor.fill;
		ctx.strokeStyle = featureColor.stroke;
		ctx.lineWidth = Math.max(0.5, hexSize * 0.05);
		ctx.fill();
		ctx.stroke();
	}

	function drawRiverOverlay(ctx, hexSize) {
		const overlay = buildRiverOverlayFromTiles(mapTiles);
		if (!overlay.paths.length) {
			return;
		}
		ctx.save();
		ctx.lineJoin = "round";
		ctx.lineCap = "butt";
		const trimDistance = Math.max(0.6, hexSize * 0.08);
		for (const layer of ["back", "mid", "top"]) {
			const config = riverOverlayLayerConfig(layer, hexSize);
			ctx.lineWidth = config.width;
			ctx.strokeStyle = config.color;
			strokeRiverPathsOnCanvas(ctx, overlay.paths, trimDistance);
		}
		ctx.restore();
	}

	function riverOverlayLayerConfig(layer, hexSize) {
		const grayscale = !!settings.grayscaleTerrain;
		const layers = {
			back: {
				width: Math.max(2, hexSize * 0.35),
				color: grayscale ? "hsl(0deg 0% 12% / 0.72)" : "hsl(207deg 90% 15% / 0.72)",
			},
			mid: {
				width: Math.max(1.15, hexSize * 0.25),
				color: grayscale ? "hsl(0deg 0% 85% / 0.98)" : "hsl(202deg 95% 50% / 0.98)",
			},
			top: {
				width: Math.max(0.75, hexSize * 0.175),
				color: "hsl(200deg 100% 90% / 0.95)",
			},
		};
		return layers[layer] || layers.mid;
	}

	function buildRiverOverlayFromTiles(tiles) {
		const segments = [];
		for (const tile of tiles || []) {
			if (!tile || !Array.isArray(tile.riverSegments) || !tile.riverSegments.length) {
				continue;
			}
			for (const segment of tile.riverSegments) {
				segments.push({
					x1: tile.x + segment.x1,
					y1: tile.y + segment.y1,
					x2: tile.x + segment.x2,
					y2: tile.y + segment.y2,
				});
			}
		}
		if (!segments.length) {
			return { paths: [], endpoints: [] };
		}
		return buildRiverPaths(segments);
	}

	function buildRiverPaths(segments) {
		const pointByKey = new Map();
		const adjacency = new Map();
		const edges = [];
		const nodeRef = { nextId: 0 };
		(segments || []).forEach((segment, index) => {
			const a = resolveRiverNodeKey(pointByKey, segment.x1, segment.y1, 2.2, nodeRef);
			const b = resolveRiverNodeKey(pointByKey, segment.x2, segment.y2, 2.2, nodeRef);
			if (!adjacency.has(a)) {
				adjacency.set(a, new Set());
			}
			if (!adjacency.has(b)) {
				adjacency.set(b, new Set());
			}
			adjacency.get(a).add(index);
			adjacency.get(b).add(index);
			edges.push({ a, b });
		});

		const visited = new Set();
		const paths = [];
		const endpoints = [];
		adjacency.forEach((linked, key) => {
			if (linked.size !== 1) {
				return;
			}
			const point = pointByKey.get(key);
			if (point) {
				endpoints.push(point);
			}
		});

		const walkPath = (startEdgeIndex, startKey) => {
			const first = pointByKey.get(startKey);
			if (!first) {
				return null;
			}
			const path = [first];
			const keys = [startKey];
			let currentEdgeIndex = startEdgeIndex;
			let currentKey = startKey;
			while (Number.isInteger(currentEdgeIndex) && !visited.has(currentEdgeIndex)) {
				visited.add(currentEdgeIndex);
				const edge = edges[currentEdgeIndex];
				if (!edge) {
					break;
				}
				const nextKey = edge.a === currentKey ? edge.b : edge.a;
				const nextPoint = pointByKey.get(nextKey);
				if (!nextPoint) {
					break;
				}
				path.push(nextPoint);
				keys.push(nextKey);
				const nextOptions = [...(adjacency.get(nextKey) || [])].filter((candidate) => !visited.has(candidate));
				if (!nextOptions.length) {
					break;
				}
				currentEdgeIndex = pickRiverContinuationEdge(currentKey, nextKey, nextOptions, edges, pointByKey);
				currentKey = nextKey;
			}
			const endKey = keys[keys.length - 1];
			return {
				points: path,
				startKey,
				endKey,
				startIsEndpoint: (adjacency.get(startKey) || new Set()).size === 1,
				endIsEndpoint: (adjacency.get(endKey) || new Set()).size === 1,
			};
		};

		adjacency.forEach((linked, key) => {
			if (linked.size !== 1) {
				return;
			}
			const edgeIndex = [...linked][0];
			if (visited.has(edgeIndex)) {
				return;
			}
			const path = walkPath(edgeIndex, key);
			if (path && path.points.length >= 2) {
				paths.push(path);
			}
		});

		for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
			if (visited.has(edgeIndex)) {
				continue;
			}
			const path = walkPath(edgeIndex, edges[edgeIndex].a);
			if (path && path.points.length >= 2) {
				paths.push(path);
			}
		}

		return { paths, endpoints };
	}

	function pickRiverContinuationEdge(previousKey, currentKey, candidateEdgeIndexes, edges, pointByKey) {
		if (!Array.isArray(candidateEdgeIndexes) || !candidateEdgeIndexes.length) {
			return null;
		}
		if (candidateEdgeIndexes.length === 1) {
			return candidateEdgeIndexes[0];
		}

		const previous = pointByKey.get(previousKey);
		const current = pointByKey.get(currentKey);
		if (!previous || !current) {
			return candidateEdgeIndexes[0];
		}

		const inX = current.x - previous.x;
		const inY = current.y - previous.y;
		const inLength = Math.hypot(inX, inY) || 1;

		let bestEdge = candidateEdgeIndexes[0];
		let bestScore = -Infinity;
		for (const edgeIndex of candidateEdgeIndexes) {
			const edge = edges[edgeIndex];
			if (!edge) {
				continue;
			}
			const nextKey = edge.a === currentKey ? edge.b : edge.a;
			const next = pointByKey.get(nextKey);
			if (!next) {
				continue;
			}
			const outX = next.x - current.x;
			const outY = next.y - current.y;
			const outLength = Math.hypot(outX, outY) || 1;
			const score = (inX * outX + inY * outY) / (inLength * outLength);
			if (score > bestScore) {
				bestScore = score;
				bestEdge = edgeIndex;
			}
		}

		return bestEdge;
	}

	function riverPointKey(x, y) {
		return `${x.toFixed(2)}:${y.toFixed(2)}`;
	}

	function resolveRiverNodeKey(pointByKey, x, y, tolerance, nodeRef) {
		let bestKey = "";
		let bestDistanceSq = Infinity;
		pointByKey.forEach((point, key) => {
			const distanceSq = riverDistanceSq(point, { x, y });
			if (distanceSq > tolerance * tolerance) {
				return;
			}
			if (distanceSq < bestDistanceSq) {
				bestDistanceSq = distanceSq;
				bestKey = key;
			}
		});
		if (bestKey) {
			const existing = pointByKey.get(bestKey);
			if (existing) {
				existing.x = (existing.x + x) / 2;
				existing.y = (existing.y + y) / 2;
			}
			return bestKey;
		}
		const key = `river-${nodeRef.nextId}:${riverPointKey(x, y)}`;
		nodeRef.nextId += 1;
		pointByKey.set(key, { x, y });
		return key;
	}

	function riverDistanceSq(a, b) {
		const dx = (a && Number(a.x)) || 0;
		const dy = (a && Number(a.y)) || 0;
		const tx = (b && Number(b.x)) || 0;
		const ty = (b && Number(b.y)) || 0;
		const x = dx - tx;
		const y = dy - ty;
		return x * x + y * y;
	}

	function trimRiverPathPoint(points, index, towardIndex, trimDistance) {
		if (!Array.isArray(points) || index < 0 || towardIndex < 0 || index >= points.length || towardIndex >= points.length) {
			return;
		}
		const point = points[index];
		const toward = points[towardIndex];
		if (!point || !toward) {
			return;
		}
		const dx = toward.x - point.x;
		const dy = toward.y - point.y;
		const distance = Math.hypot(dx, dy) || 0;
		if (distance <= 0) {
			return;
		}
		const amount = Math.min(trimDistance, distance * 0.45);
		point.x += (dx / distance) * amount;
		point.y += (dy / distance) * amount;
	}

	function riverPathPointsForStroke(pathEntry, trimDistance = 0) {
		const rawPoints = Array.isArray(pathEntry) ? pathEntry : pathEntry && Array.isArray(pathEntry.points) ? pathEntry.points : [];
		if (!rawPoints.length) {
			return [];
		}
		const shouldTrimStart = !!(pathEntry && pathEntry.startIsEndpoint);
		const shouldTrimEnd = !!(pathEntry && pathEntry.endIsEndpoint);
		if (!trimDistance || (!shouldTrimStart && !shouldTrimEnd)) {
			return rawPoints;
		}
		const points = rawPoints.map((point) => ({ x: point.x, y: point.y }));
		if (shouldTrimStart && points.length > 1) {
			trimRiverPathPoint(points, 0, 1, trimDistance);
		}
		if (shouldTrimEnd && points.length > 1) {
			trimRiverPathPoint(points, points.length - 1, points.length - 2, trimDistance);
		}
		return points;
	}

	function strokeRiverPathsOnCanvas(ctx, paths, trimDistance = 0) {
		if (!ctx || !Array.isArray(paths) || !paths.length) {
			return;
		}
		paths.forEach((pathEntry) => {
			const path = riverPathPointsForStroke(pathEntry, trimDistance);
			if (!Array.isArray(path) || path.length < 2) {
				return;
			}
			ctx.beginPath();
			ctx.moveTo(path[0].x, path[0].y);
			if (path.length === 2) {
				ctx.lineTo(path[1].x, path[1].y);
				ctx.stroke();
				return;
			}
			for (let index = 1; index < path.length - 1; index += 1) {
				const current = path[index];
				const next = path[index + 1];
				const midX = (current.x + next.x) / 2;
				const midY = (current.y + next.y) / 2;
				ctx.quadraticCurveTo(current.x, current.y, midX, midY);
			}
			const last = path[path.length - 1];
			ctx.lineTo(last.x, last.y);
			ctx.stroke();
		});
	}

	function drawNotePinGlyph(ctx, tile, hexSize) {
		ctx.save();
		const offsetX = 0;
		const offsetY = hexSize * 0.14;
		const scale = (hexSize * 0.8) / 640;
		ctx.translate(tile.x + offsetX, tile.y + offsetY);
		ctx.scale(scale, scale);
		ctx.translate(-320, -576);

		ctx.fillStyle = settings.grayscaleTerrain ? "hsl(0deg 0% 78%)" : "#ffd25a";
		ctx.strokeStyle = settings.grayscaleTerrain ? "hsl(0deg 0% 10% / 0.86)" : "hsl(0deg 0% 0% / 0.8)";
		ctx.lineWidth = 22;
		for (const pinPath of NOTE_PIN_PATHS) {
			const path = notePinPathByData(pinPath.d);
			ctx.globalAlpha = Number.isFinite(pinPath.opacity) ? pinPath.opacity : 1;
			ctx.fill(path);
			ctx.stroke(path);
		}
		ctx.globalAlpha = 1;
		ctx.restore();
	}

	function notePinPathByData(pathData) {
		if (notePinPathCache.has(pathData)) {
			return notePinPathCache.get(pathData);
		}
		const path = new Path2D(pathData);
		notePinPathCache.set(pathData, path);
		return path;
	}

	function drawElevationGlyph(ctx, tile, hexSize) {
		const elevation = Number(tile?.raw?.elevation ?? 0);
		if (elevation <= 0) {
			return;
		}

		const yBase = tile.y + hexSize * 0.1;
		if (elevation === 1) {
			ctx.beginPath();
			ctx.moveTo(tile.x - hexSize * 0.24, yBase + hexSize * 0.14);
			ctx.lineTo(tile.x - hexSize * 0.12, yBase - hexSize * 0.14);
			ctx.lineTo(tile.x + hexSize * 0.12, yBase - hexSize * 0.14);
			ctx.lineTo(tile.x + hexSize * 0.24, yBase + hexSize * 0.14);
			ctx.closePath();
			ctx.fillStyle = settings.grayscaleTerrain ? "hsl(0deg 0% 86% / 0.48)" : "hsl(0deg 0% 100% / 0.32)";
			ctx.strokeStyle = settings.grayscaleTerrain ? "hsl(0deg 0% 18% / 0.62)" : "hsl(198deg 33% 17% / 0.48)";
			ctx.lineWidth = Math.max(0.4, hexSize * 0.04);
			ctx.fill();
			ctx.stroke();
			return;
		}

		ctx.beginPath();
		ctx.moveTo(tile.x - hexSize * 0.32, yBase + hexSize * 0.18);
		ctx.lineTo(tile.x, yBase - hexSize * 0.3);
		ctx.lineTo(tile.x + hexSize * 0.32, yBase + hexSize * 0.18);
		ctx.closePath();
		ctx.fillStyle = settings.grayscaleTerrain ? "hsl(0deg 0% 84% / 0.44)" : "hsl(0deg 0% 100% / 0.3)";
		ctx.strokeStyle = settings.grayscaleTerrain ? "hsl(0deg 0% 16% / 0.65)" : "hsl(198deg 33% 17% / 0.52)";
		ctx.lineWidth = Math.max(0.4, hexSize * 0.04);
		ctx.fill();
		ctx.stroke();
	}

	function featureGlyphColor(featureName) {
		const normalized = String(featureName || "").toUpperCase();
		if (!normalized) {
			return null;
		}
		if (settings.grayscaleTerrain) {
			if (normalized.includes("FOREST") || normalized.includes("JUNGLE")) {
				return {
					fill: "hsl(0deg 0% 26% / 0.55)",
					stroke: "hsl(0deg 0% 10% / 0.72)",
				};
			}
			if (normalized.includes("MARSH")) {
				return {
					fill: "hsl(0deg 0% 34% / 0.5)",
					stroke: "hsl(0deg 0% 12% / 0.68)",
				};
			}
			if (normalized.includes("FLOOD")) {
				return {
					fill: "hsl(0deg 0% 72% / 0.48)",
					stroke: "hsl(0deg 0% 25% / 0.66)",
				};
			}
			if (normalized.includes("ICE")) {
				return {
					fill: "hsl(0deg 0% 88% / 0.54)",
					stroke: "hsl(0deg 0% 45% / 0.7)",
				};
			}
			if (normalized.includes("OASIS")) {
				return {
					fill: "hsl(0deg 0% 68% / 0.48)",
					stroke: "hsl(0deg 0% 22% / 0.66)",
				};
			}
			return {
				fill: "hsl(0deg 0% 58% / 0.46)",
				stroke: "hsl(0deg 0% 18% / 0.62)",
			};
		}
		if (normalized.includes("FOREST") || normalized.includes("JUNGLE")) {
			return {
				fill: "hsl(130deg 43% 34% / 0.36)",
				stroke: "hsl(133deg 48% 20% / 0.56)",
			};
		}
		if (normalized.includes("MARSH")) {
			return {
				fill: "hsl(170deg 35% 34% / 0.34)",
				stroke: "hsl(178deg 36% 20% / 0.54)",
			};
		}
		if (normalized.includes("FLOOD")) {
			return {
				fill: "hsl(205deg 78% 68% / 0.32)",
				stroke: "hsl(208deg 61% 31% / 0.5)",
			};
		}
		if (normalized.includes("ICE")) {
			return {
				fill: "hsl(203deg 55% 87% / 0.4)",
				stroke: "hsl(203deg 42% 46% / 0.55)",
			};
		}
		if (normalized.includes("OASIS")) {
			return {
				fill: "hsl(165deg 61% 53% / 0.36)",
				stroke: "hsl(169deg 55% 28% / 0.52)",
			};
		}
		return {
			fill: "hsl(40deg 49% 56% / 0.28)",
			stroke: "hsl(30deg 45% 30% / 0.48)",
		};
	}

	function buildRiverSegments(riverData, hexSize) {
		if (!riverData) {
			return [];
		}
		const edges = [
			{ bit: 1, start: 1, end: 2 },
			{ bit: 2, start: 2, end: 3 },
			{ bit: 4, start: 3, end: 4 },
		];
		const vertices = buildHexVertices(hexSize);
		const inset = hexSize * 0.08;
		return edges
			.filter((edge) => riverData & edge.bit)
			.map((edge) => ({
				key: edge.bit,
				...insetSegment(vertices[edge.start], vertices[edge.end], inset),
			}));
	}

	function insetSegment(start, end, inset) {
		if (!inset) {
			return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
		}
		const midX = (start.x + end.x) / 2;
		const midY = (start.y + end.y) / 2;
		const length = Math.hypot(midX, midY) || 1;
		const offsetX = (-midX / length) * inset;
		const offsetY = (-midY / length) * inset;
		return {
			x1: start.x + offsetX,
			y1: start.y + offsetY,
			x2: end.x + offsetX,
			y2: end.y + offsetY,
		};
	}

	function grayscaleTerrainHex(tile, baseHex) {
		const terrain = String(tile?.terrain || "").toUpperCase();
		const feature = String(tile?.feature || "").toUpperCase();
		const elevation = Number(tile?.raw?.elevation ?? 0);
		const hasRiver = Boolean(tile?.raw?.riverData);

		let target = 56;

		if (terrain.includes("OCEAN")) {
			target = 24;
		} else if (terrain.includes("COAST")) {
			target = 36;
		} else if (terrain.includes("SNOW")) {
			target = 86;
		} else if (terrain.includes("TUNDRA")) {
			target = 66;
		} else if (terrain.includes("DESERT")) {
			target = 74;
		} else if (terrain.includes("PLAINS")) {
			target = 60;
		} else if (terrain.includes("GRASS")) {
			target = 52;
		}

		if (feature.includes("FOREST") || feature.includes("JUNGLE")) {
			target -= 10;
		}
		if (feature.includes("MARSH")) {
			target -= 7;
		}
		if (feature.includes("ICE")) {
			target += 7;
		}
		if (feature.includes("FLOOD") || feature.includes("OASIS")) {
			target += 4;
		}

		if (elevation === 1) {
			target += 6;
		} else if (elevation >= 2) {
			target -= 6;
		}

		if (hasRiver) {
			target += 2;
		}

		const color = sanitizeHexColor(baseHex, "#76848f").replace("#", "");
		const r = Number.parseInt(color.slice(0, 2), 16);
		const g = Number.parseInt(color.slice(2, 4), 16);
		const b = Number.parseInt(color.slice(4, 6), 16);
		const luma = Math.round(((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * 100);
		const value = clamp(Math.round(target * 0.72 + luma * 0.28), 16, 90);
		const channel = Math.round((value / 100) * 255);
		return `#${toHex(channel)}${toHex(channel)}${toHex(channel)}`;
	}

	function flattenedGrayscaleTerrainColor(terrainUpper) {
		const isWater = terrainUpper.includes("OCEAN") || terrainUpper.includes("COAST");
		return isWater ? "#4a4a4a" : "#9f9f9f";
	}

	function toHex(value) {
		return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function parseNumberInput(value) {
		const raw = String(value ?? "").trim();
		if (!raw) {
			return null;
		}
		const parsed = Number(raw);
		return Number.isFinite(parsed) ? parsed : null;
	}

	function formatSyncErrorMessage(error, fallback = "Request failed.") {
		const raw = String(error?.message || "")
			.replace(/\s+/g, " ")
			.trim();
		if (!raw) {
			return fallback;
		}
		if (raw.length > 220) {
			return `${raw.slice(0, 217)}...`;
		}
		return raw;
	}

	function formatZoomPercentInput(value) {
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) {
			return "";
		}
		const percent = parsed * 100;
		return percent
			.toFixed(2)
			.replace(/\.00$/, "")
			.replace(/(\.\d)0$/, "$1");
	}

	function normalizeLabelTypeInput(value) {
		return String(value || "")
			.trim()
			.toLowerCase() === "river"
			? "river"
			: "region";
	}

	function normalizeLabelPriorityInput(value) {
		const normalized = String(value || "")
			.trim()
			.toLowerCase();
		if (normalized === "major" || normalized === "minor") {
			return normalized;
		}
		return "standard";
	}

	function normalizeLabelVariantInput(value, type) {
		const normalized = String(value || "")
			.trim()
			.toLowerCase();
		if (normalized === "land" || normalized === "water") {
			return normalized;
		}
		return type === "river" ? "water" : "land";
	}

	function slugifyLabelName(value) {
		return String(value || "")
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	function labelSummary(label) {
		if (!label) {
			return "";
		}
		const type = normalizeLabelTypeInput(label.type);
		const priority = normalizeLabelPriorityInput(label.priority);
		return `${type} • ${priority}`;
	}

	function isPlainObject(value) {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}

	function sanitizeSettings(input) {
		const source = isPlainObject(input) ? input : {};
		return {
			showPins: Boolean(source.showPins),
			showLabels: Boolean(source.showLabels),
			showRiverLabels: Boolean(source.showRiverLabels),
			showRegionLabels: Boolean(source.showRegionLabels),
			hideDecorations: Boolean(source.hideDecorations),
			flattenLandWater: Boolean(source.flattenLandWater),
			grayscaleTerrain: Boolean(source.grayscaleTerrain),
		};
	}

	function worldTransform() {
		return `translate(${translateX}px, ${translateY}px) scale(${scale})`;
	}

	function tileLabel(tile) {
		return tile ? `${tile.col}, ${tile.sourceRow}` : "-";
	}

	function mapLabelPathId(labelId) {
		const mapId = String(currentMap?.id || "map").replace(/[^a-z0-9_-]/gi, "-");
		const suffix = String(labelId || "label").replace(/[^a-z0-9_-]/gi, "-");
		return `map-label-${mapId}-${suffix}`;
	}

	function elevationLabel(value) {
		if (value === 2) {
			return "Mountain";
		}
		if (value === 1) {
			return "Hill";
		}
		return "Flat";
	}

	function formatMapLabel(value, fallback = "None") {
		if (!value) {
			return fallback;
		}
		const raw = String(value)
			.trim()
			.replace(/^(TERRAIN|FEATURE_TERRAIN|FEATURE|RESOURCE|IMPROVEMENT|ROUTE)_/i, "");

		if (!raw) {
			return fallback;
		}

		return raw
			.split(/[_\s-]+/)
			.filter(Boolean)
			.map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
			.join(" ");
	}

	function formatNaturalWonderLabel(value) {
		if (!value) {
			return "None";
		}
		return formatMapLabel(String(value).replace(/^FEATURE_/, ""));
	}
</script>

<section class="viewer-page tile-map" aria-live="polite">
	<header class="hero">
		<h1>Interactive Map Viewer</h1>
		<p>Browse community Civ5 maps with modded Civilization starting location pins.</p>
	</header>

	{#if loading}
		<p class="status">Loading {currentMap?.title || "map"}...</p>
	{:else if error}
		<p class="status error">{error}</p>
		{#if debugInfo}
			<p class="status debug">{debugInfo}</p>
		{/if}
	{:else if baseData && mapMetrics}
		<div class="viewer-header">
			<div class="map-meta">
				<h2>{currentMap?.title || "Map Viewer"}</h2>
				<p class="meta-line">
					{baseData.width}x{baseData.height} tiles, {mapPins.length} Civilization pins
				</p>
			</div>

			<div class="tile-map-controls" role="toolbar" aria-label="Map zoom controls">
				<div class="tile-map-control-group">
					<span class="tile-map-control-label">Map</span>
					<select class="tile-map-select" value={activeMapId || currentMap?.id || ""} onchange={(event) => handleSelectMap(event.currentTarget.value)} aria-label="Select map">
						{#each mapsForSelect as option (option.id)}
							<option value={option.id}>{option.title}</option>
						{/each}
					</select>
				</div>
				<div class="tile-map-toolbar-divider" aria-hidden="true"></div>
				<div class="tile-map-control-group">
					<span class="tile-map-control-label">Zoom</span>
					<div class="tile-map-scale">
						<button type="button" class="tile-map-control tile-map-control-ghost" onclick={() => zoomBy(1 / 1.12)} disabled={!canZoomOut} aria-label="Zoom out"> - </button>
						<span class="tile-map-control-pill" aria-live="polite">{zoomPercent}%</span>
						<button type="button" class="tile-map-control tile-map-control-ghost" onclick={() => zoomBy(1.12)} disabled={!canZoomIn} aria-label="Zoom in"> + </button>
					</div>
				</div>
				<div class="tile-map-control-group">
					<button type="button" class="tile-map-control" onclick={resetView}>Fit</button>
				</div>
				<div class="tile-map-toolbar-divider" aria-hidden="true"></div>
				<div class="tile-map-control-group">
					<button
						type="button"
						class="tile-map-control tile-map-control-collapse"
						onclick={() => setPanelCollapsed(!panelCollapsed)}
						aria-expanded={!panelCollapsed}
						aria-controls="map-tools-panel"
						aria-label={panelCollapsed ? "Open editing interface" : "Collapse editing interface"}
						title={panelCollapsed ? "Open editing interface" : "Collapse editing interface"}
					>
						<svg class="tile-map-control-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" aria-hidden="true">
							<path d={panelCollapsed ? PANEL_COLLAPSED_ICON_PATH : PANEL_EXPANDED_ICON_PATH} />
						</svg>
					</button>
				</div>
			</div>
		</div>

		<div class="workspace" class:panel-collapsed={panelCollapsed}>
			<div class="stage-wrap">
				<div
					class="viewport"
					role="region"
					aria-label="Interactive hex map viewport"
					use:mountViewport
					onwheel={onViewportWheel}
					onpointerdown={onViewportPointerDown}
					onpointermove={onViewportPointerMove}
					onpointerup={onViewportPointerUp}
					onpointercancel={onViewportPointerUp}
					onmouseleave={onViewportLeave}
				>
					<div class="map-world" style={`width:${Math.ceil(mapMetrics.width)}px;height:${Math.ceil(mapMetrics.height)}px;transform:${worldTransform()}`}>
						<canvas class="map-layer" use:mountCanvas aria-label={`${currentMap?.title || "Map"} tile layer`}></canvas>

						<svg class="overlay-layer" viewBox={`0 0 ${Math.ceil(mapMetrics.width)} ${Math.ceil(mapMetrics.height)}`} preserveAspectRatio="none" aria-label="Map overlays">
							{#if hoveredOutlinePoints()}
								<polygon points={hoveredOutlinePoints()} class="outline-hover"></polygon>
							{/if}
							{#if selectedOutlinePoints()}
								<polygon points={selectedOutlinePoints()} class="outline-selected"></polygon>
							{/if}

							{#if settings.showLabels}
								<g class="label-layer" aria-hidden="true">
									<defs>
										{#each visibleMapLabels.rivers as label (label.id)}
											{#if label.pathD}
												<path id={mapLabelPathId(label.id)} d={label.pathD}></path>
											{/if}
										{/each}
									</defs>

									{#each visibleMapLabels.rivers as label (label.id)}
										{#if label.pathD}
											<text
												class={`map-label map-label-river map-label-${label.priority} map-label-variant-${label.variant}`}
												style={`font-size:${label.fontSize}px; letter-spacing:${label.letterSpacing}px;`}
											>
												<textPath href={`#${mapLabelPathId(label.id)}`} startOffset="50%" text-anchor="middle">{label.name}</textPath>
											</text>
										{:else}
											<text
												class={`map-label map-label-river map-label-${label.priority} map-label-variant-${label.variant}`}
												x={label.x}
												y={label.y}
												text-anchor="middle"
												dominant-baseline="middle"
												transform={label.rotation ? `rotate(${label.rotation} ${label.x} ${label.y})` : undefined}
												style={`font-size:${label.fontSize}px; letter-spacing:${label.letterSpacing}px;`}
											>
												{label.name}
											</text>
										{/if}
									{/each}

									{#each visibleMapLabels.regions as label (label.id)}
										<text
											class={`map-label map-label-region map-label-${label.priority} map-label-variant-${label.variant}`}
											x={label.x}
											y={label.y}
											text-anchor="middle"
											dominant-baseline="middle"
											transform={label.rotation ? `rotate(${label.rotation} ${label.x} ${label.y})` : undefined}
											style={`font-size:${label.fontSize}px; letter-spacing:${label.letterSpacing}px;`}
										>
											{label.name}
										</text>
									{/each}
								</g>
							{/if}

							{#if settings.showPins}
								{#each pinGroups as group (group.key)}
									{@const point = pinGroupPoint(group)}
									{@const isMulti = group.pins.length > 1}
									{#if point}
										<g
											class="pin pin-group"
											class:is-multi={isMulti}
											style={pinGroupStyle(group)}
											transform={`translate(${point.x} ${point.y})`}
											role="button"
											tabindex="0"
											aria-label={pinGroupLabel(group)}
											onclick={() => {
												const tile = findTileAt(point.x, point.y);
												if (tile) {
													selectTile(tile.key);
												}
											}}
											onkeydown={(event) => {
												if (event.key !== "Enter" && event.key !== " ") {
													return;
												}
												event.preventDefault();
												const tile = findTileAt(point.x, point.y);
												if (tile) {
													selectTile(tile.key);
												}
											}}
										>
											<circle r={isMulti ? 6 : 9} class="pin-core" />
											<circle r={isMulti ? 2.5 : 4} class="pin-center" />
											{#if isMulti}
												<circle r="10.5" class="pin-multi-ring" />
												{#each group.pins.slice(0, 8) as pin, index (pin.id)}
													{@const offset = pinSatelliteOffset(index, Math.min(group.pins.length, 8))}
													<circle class="pin-satellite" cx={offset.x} cy={offset.y} r="3.1" style={pinStyle(pin)} />
												{/each}
												<g class="pin-count" transform="translate(10 -10)">
													<circle r="6.5" class="pin-count-bg" />
													<text class="pin-count-text" text-anchor="middle" dominant-baseline="central">{group.pins.length}</text>
												</g>
											{/if}
										</g>
									{/if}
								{/each}
							{/if}
						</svg>
					</div>

					{#if tooltipLayout && hoveredTile}
						{#if tooltipLayout.bridge}
							<div
								class="tooltip-bridge"
								style={`left:${tooltipLayout.bridge.left}px;top:${tooltipLayout.bridge.top}px;width:${tooltipLayout.bridge.width}px;height:${tooltipLayout.bridge.height}px`}
							></div>
						{/if}
						<aside class="tile-tooltip" style={`left:${tooltipLayout.coords.left}px;top:${tooltipLayout.coords.top}px`}>
							<div class="tile-tooltip-title">Tile {hoveredTile.col}, {hoveredTile.sourceRow}</div>
							<div class="tile-tooltip-list">
								<div class="tile-info-row">
									<div class="tile-info-label">Terrain</div>
									<div class="tile-info-value">{formatMapLabel(hoveredTile.terrain, "Unknown")}</div>
								</div>
								<div class="tile-info-row">
									<div class="tile-info-label">Elevation</div>
									<div class="tile-info-value">{elevationLabel(hoveredTile.raw?.elevation ?? 0)}</div>
								</div>
								{#if hoveredTile.feature}
									<div class="tile-info-row">
										<div class="tile-info-label">Feature</div>
										<div class="tile-info-value">{formatMapLabel(hoveredTile.feature)}</div>
									</div>
								{/if}
								{#if hoveredTile.naturalWonder}
									<div class="tile-info-row">
										<div class="tile-info-label">Natural Wonder</div>
										<div class="tile-info-value">{formatNaturalWonderLabel(hoveredTile.naturalWonder)}</div>
									</div>
								{/if}
								<div class="tile-info-row">
									<div class="tile-info-label">Resource</div>
									<div class="tile-info-value">{formatMapLabel(hoveredTile.resource)}</div>
								</div>
								{#if hoveredTile.raw?.riverData}
									<div class="tile-info-row">
										<div class="tile-info-label">River</div>
										<div class="tile-info-value">Yes</div>
									</div>
								{/if}
								{#if settings.showPins && hoveredTilePins.length}
									<div class="tile-info-row">
										<div class="tile-info-label">Civilizations</div>
										<div class="tile-info-value">{hoveredTilePins.map((pin) => pin.civ).join(", ")}</div>
									</div>
								{/if}
								{#if notesByKey[hoveredTile.key]}
									<div class="tile-info-notes">
										<div class="tile-info-label">Notes</div>
										<div class="tile-info-notes-value">{notesByKey[hoveredTile.key]}</div>
									</div>
								{/if}
							</div>
						</aside>
					{/if}
				</div>
			</div>

			<aside id="map-tools-panel" class="side-panel" class:is-collapsed={panelCollapsed} aria-label="Map tools" aria-hidden={panelCollapsed}>
				<div class="tab-row" role="tablist" tabindex="0" aria-label="Map tool tabs" onkeydown={onPanelTabListKeydown}>
					<button
						id="map-tools-tab-edit"
						type="button"
						role="tab"
						class:active={panelTab === "edit"}
						aria-selected={panelTab === "edit"}
						aria-controls="map-tools-panel-edit"
						tabindex={panelTab === "edit" ? 0 : -1}
						onclick={() => selectPanelTab("edit")}
					>
						Pins
					</button>
					<button
						id="map-tools-tab-labels"
						type="button"
						role="tab"
						class:active={panelTab === "labels"}
						aria-selected={panelTab === "labels"}
						aria-controls="map-tools-panel-labels"
						tabindex={panelTab === "labels" ? 0 : -1}
						onclick={() => selectPanelTab("labels")}
					>
						Labels
					</button>
					<button
						id="map-tools-tab-notes"
						type="button"
						role="tab"
						class:active={panelTab === "notes"}
						aria-selected={panelTab === "notes"}
						aria-controls="map-tools-panel-notes"
						tabindex={panelTab === "notes" ? 0 : -1}
						onclick={() => selectPanelTab("notes")}
					>
						Notes
					</button>
					<button
						id="map-tools-tab-export"
						type="button"
						role="tab"
						class:active={panelTab === "export"}
						aria-selected={panelTab === "export"}
						aria-controls="map-tools-panel-export"
						tabindex={panelTab === "export" ? 0 : -1}
						onclick={() => selectPanelTab("export")}
					>
						Export
					</button>
					<button
						id="map-tools-tab-settings"
						type="button"
						role="tab"
						class:active={panelTab === "settings"}
						aria-selected={panelTab === "settings"}
						aria-controls="map-tools-panel-settings"
						tabindex={panelTab === "settings" ? 0 : -1}
						onclick={() => selectPanelTab("settings")}
					>
						Settings
					</button>
				</div>

				{#if panelTab === "edit"}
					<div id="map-tools-panel-edit" class="panel-body" role="tabpanel" aria-labelledby="map-tools-tab-edit">
						<h3>Civilization Pins</h3>
						<div class="pin-edit-target">
							<p class="pin-edit-title">Edit Target</p>
							<div class="pin-edit-buttons" role="group" aria-label="Pin edit target">
								<button type="button" class:active={pinEditTarget === "shared"} onclick={() => setPinEditTarget("shared")} disabled={!canEdit}>
									Shared
									{#if !canEdit}
										<span class="pin-edit-tooltip">Sign in to edit shared pins.</span>
									{/if}
								</button>
								<button type="button" class:active={pinEditTarget === "local"} onclick={() => setPinEditTarget("local")} disabled={!canEdit}> Local </button>
							</div>
						</div>
						{#if pinEditorBadge}
							<p class="auth-active">{pinEditorBadge}</p>
						{/if}
						{#if selectedTile}
							{#if !canEditPins}
								<p class="auth-hint">{pinEditorHint}</p>
							{/if}
							<p class="tile-id">Selected: {tileLabel(selectedTile)}</p>

							<p class="pin-editor-state" data-mode={pinEditorMode}>{pinEditorStatus}</p>
							<h4>Pin Colors</h4>
							<div class="pin-meta-row">
								<label class="pin-meta-field ui-tooltip-anchor">
									Civilization
									<input type="text" value={editPinCivInput} oninput={(event) => (editPinCivInput = event.currentTarget.value)} disabled={!canEditPins} />
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to Local edit target to edit pins.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Leader
									<input type="text" value={editPinLeaderInput} oninput={(event) => (editPinLeaderInput = event.currentTarget.value)} disabled={!canEditPins} />
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to Local edit target to edit pins.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Capital
									<input type="text" value={editPinCapitalInput} oninput={(event) => (editPinCapitalInput = event.currentTarget.value)} disabled={!canEditPins} />
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to Local edit target to edit pins.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Author(s)
									<input type="text" value={editPinAuthorInput} oninput={(event) => (editPinAuthorInput = event.currentTarget.value)} disabled={!canEditPins} />
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to Local edit target to edit pins.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Game Define Name
									<input
										type="text"
										value={editPinGameDefineInput}
										oninput={(event) => (editPinGameDefineInput = event.currentTarget.value)}
										placeholder="CIVILIZATION_..."
										spellcheck="false"
										disabled={!canEditPins}
									/>
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to Local edit target to edit pins.</span>
									{/if}
								</label>
								<label class="pin-meta-field pin-meta-check ui-tooltip-anchor">
									Island Start
									<span class="pin-meta-toggle">
										<input type="checkbox" checked={editPinIsIsland} onchange={(event) => (editPinIsIsland = event.currentTarget.checked)} disabled={!canEditPins} />
										<span class="pin-meta-hint">Grant Optics + Boats in Lua</span>
									</span>
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to Local edit target to edit pins.</span>
									{/if}
								</label>
							</div>
							<div class="color-row">
								<label class="ui-tooltip-anchor">
									Primary
									<div class="color-picker-row">
										<div class="color-swatch-control">
											<input
												type="color"
												value={editPinPrimaryInput}
												oninput={(event) => updatePinColorFromPicker("primary", event.currentTarget.value)}
												disabled={!canEditPins}
												aria-label="Primary color"
											/>
											<span class="color-preview" style={`--preview:${primaryColorDisplay.hex}`} aria-hidden="true"></span>
										</div>
										<input
											type="text"
											class="color-hex-input"
											inputmode="text"
											spellcheck="false"
											placeholder="#243746"
											value={editPinPrimaryHexInput}
											oninput={(event) => updatePinColorFromHex("primary", event.currentTarget.value)}
											onblur={() => syncPinHexDraft("primary")}
											disabled={!canEditPins}
										/>
									</div>
									<span class="color-value">HEX {primaryColorDisplay.hex}</span>
									<span class="color-value">RGB {primaryColorDisplay.rgb}</span>
									<span class="color-value">HSL {primaryColorDisplay.hsl}</span>
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to Local edit target to edit pins.</span>
									{/if}
								</label>
								<label class="ui-tooltip-anchor">
									Secondary
									<div class="color-picker-row">
										<div class="color-swatch-control">
											<input
												type="color"
												value={editPinSecondaryInput}
												oninput={(event) => updatePinColorFromPicker("secondary", event.currentTarget.value)}
												disabled={!canEditPins}
												aria-label="Secondary color"
											/>
											<span class="color-preview" style={`--preview:${secondaryColorDisplay.hex}`} aria-hidden="true"></span>
										</div>
										<input
											type="text"
											class="color-hex-input"
											inputmode="text"
											spellcheck="false"
											placeholder="#F3D37F"
											value={editPinSecondaryHexInput}
											oninput={(event) => updatePinColorFromHex("secondary", event.currentTarget.value)}
											onblur={() => syncPinHexDraft("secondary")}
											disabled={!canEditPins}
										/>
									</div>
									<span class="color-value">HEX {secondaryColorDisplay.hex}</span>
									<span class="color-value">RGB {secondaryColorDisplay.rgb}</span>
									<span class="color-value">HSL {secondaryColorDisplay.hsl}</span>
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to Local edit target to edit pins.</span>
									{/if}
								</label>
							</div>
							<div class="button-row pin-action-row">
								<span class="ui-tooltip-wrap">
									<button type="button" onclick={startNewPinEntry} disabled={!canEditPins}>New Pin</button>
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to Local edit target to edit pins.</span>
									{/if}
								</span>

								<span class="ui-tooltip-wrap">
									<button type="button" onclick={addOrUpdatePin} disabled={!canEditPins || pinEditorMode === "idle"}>{upsertCivButtonLabel}</button>
									{#if !canEditPins}
										<span class="ui-tooltip">Sign in or switch to local to edit pins.</span>
									{:else if pinEditorMode === "idle"}
										<span class="ui-tooltip">Enter a name before saving.</span>
									{/if}
								</span>

								<button
									type="button"
									class="danger-icon-button"
									style="flex-grow: 0; inline-size: fit-content;"
									onclick={removePin}
									disabled={!canEditPins || !matchedSelectedPin}
									aria-label="Remove civilization"
									title="Remove civilization"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<path d="M10 11v6" />
										<path d="M14 11v6" />
										<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
										<path d="M3 6h18" />
										<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
									</svg>
								</button>
							</div>
							{#if pinStatus}
								<p class="status-inline">{pinStatus}</p>
							{/if}
							{#if selectedTilePins.length}
								<div class="tile-pin-list">
									<p class="tile-pin-list-title">Civilizations on tile ({selectedTilePins.length})</p>
									{#each selectedTilePins as pin (pin.viewId || pin.id)}
										{@const source = resolvePinSource(pin)}
										{@const canEditSource = source === "shared" ? canEdit : true}
										<div class="tile-pin-item">
											<span class="ui-tooltip-wrap">
												<button type="button" class="tile-pin-load" onclick={() => loadPinIntoEditor(pin, source)} disabled={!canEditSource}>
													<span class="tile-pin-swatch" style={pinStyle(pin)}></span>
													<span>{pinDisplayName(pin)}</span>
													<span class="tile-pin-meta">{source === "shared" ? "Shared" : "Local"}</span>
												</button>
												{#if !canEditSource}
													<span class="ui-tooltip">Sign in to edit shared pins.</span>
												{/if}
											</span>
											<span class="ui-tooltip-wrap">
												<button
													type="button"
													class="tile-pin-remove danger-icon-button"
													onclick={() => removePinById(pin.id, source)}
													disabled={!canEditSource}
													aria-label={`Remove ${pinDisplayName(pin)}`}
													title={`Remove ${pinDisplayName(pin)}`}
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="15"
														height="15"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														aria-hidden="true"
													>
														<path d="M10 11v6" />
														<path d="M14 11v6" />
														<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
														<path d="M3 6h18" />
														<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
													</svg>
												</button>
												{#if !canEditSource}
													<span class="ui-tooltip">Sign in to edit shared pins.</span>
												{/if}
											</span>
										</div>
									{/each}
								</div>
							{/if}
						{:else}
							<p>Select a tile on the map to edit pin data.</p>
						{/if}
					</div>
				{/if}

				{#if panelTab === "labels"}
					<div id="map-tools-panel-labels" class="panel-body" role="tabpanel" aria-labelledby="map-tools-tab-labels">
						<h3>Map Labels</h3>
						<!-- <p class="panel-intro">Create labels anchored to the selected tile. Non-major labels use minZoom to control zoom reveal levels.</p> -->
						{#if canEdit}
							<p class="auth-active">{authUser?.email ? `Editing as ${authUser.email}` : "Editing enabled"}</p>
						{/if}
						{#if selectedTile}
							{#if !canEdit}
								<p class="auth-hint">{editorHint}</p>
							{/if}
							<p class="tile-id">Anchor: {tileLabel(selectedTile)}</p>
							<p class="pin-editor-state" data-mode={labelEditorMode}>{labelEditorStatus}</p>

							<div class="pin-meta-row">
								<label class="pin-meta-field ui-tooltip-anchor">
									Label Name
									<input
										type="text"
										placeholder="e.g. Congo Basin"
										value={editLabelNameInput}
										oninput={(event) => (editLabelNameInput = event.currentTarget.value)}
										disabled={!canEdit}
									/>
									{#if !canEdit}
										<span class="ui-tooltip">Sign in to edit labels.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Type
									<select
										value={editLabelTypeInput}
										onchange={(event) => {
											editLabelTypeInput = normalizeLabelTypeInput(event.currentTarget.value);
											editLabelVariantInput = normalizeLabelVariantInput("", editLabelTypeInput);
										}}
										disabled={!canEdit}
									>
										<option value="region">Region</option>
										<option value="river">River</option>
									</select>
									{#if !canEdit}
										<span class="ui-tooltip">Sign in to edit labels.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Priority
									<select value={editLabelPriorityInput} onchange={(event) => (editLabelPriorityInput = normalizeLabelPriorityInput(event.currentTarget.value))} disabled={!canEdit}>
										<option value="major">Major</option>
										<option value="standard">Standard</option>
										<option value="minor">Minor</option>
									</select>
									{#if !canEdit}
										<span class="ui-tooltip">Sign in to edit labels.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Region Variant
									<select
										value={editLabelVariantInput}
										onchange={(event) => (editLabelVariantInput = normalizeLabelVariantInput(event.currentTarget.value, editLabelTypeInput))}
										disabled={!canEdit}
									>
										<option value="land">Land</option>
										<option value="water">Water</option>
									</select>
									{#if !canEdit}
										<span class="ui-tooltip">Sign in to edit labels.</span>
									{/if}
								</label>
							</div>

							<div class="pin-meta-row">
								<label class="pin-meta-field ui-tooltip-anchor">
									Size
									<input
										type="number"
										step="0.05"
										min="0.6"
										max="2.4"
										value={editLabelSizeInput}
										oninput={(event) => (editLabelSizeInput = event.currentTarget.value)}
										disabled={!canEdit}
									/>
									{#if !canEdit}
										<span class="ui-tooltip">Sign in to edit labels.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Rotation
									<input
										type="number"
										step="1"
										min="-180"
										max="180"
										value={editLabelRotationInput}
										oninput={(event) => (editLabelRotationInput = event.currentTarget.value)}
										disabled={!canEdit}
									/>
									{#if !canEdit}
										<span class="ui-tooltip">Sign in to edit labels.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Min Zoom (%)
									<input
										type="number"
										step="1"
										min="0"
										max="1000"
										placeholder="auto"
										value={editLabelMinZoomInput}
										oninput={(event) => (editLabelMinZoomInput = event.currentTarget.value)}
										disabled={!canEdit}
									/>
									{#if !canEdit}
										<span class="ui-tooltip">Sign in to edit labels.</span>
									{/if}
								</label>
								<label class="pin-meta-field ui-tooltip-anchor">
									Max Zoom (%)
									<input
										type="number"
										step="1"
										min="0"
										max="1000"
										placeholder="none"
										value={editLabelMaxZoomInput}
										oninput={(event) => (editLabelMaxZoomInput = event.currentTarget.value)}
										disabled={!canEdit}
									/>
									{#if !canEdit}
										<span class="ui-tooltip">Sign in to edit labels.</span>
									{/if}
								</label>
							</div>

							<div class="button-row pin-action-row">
								<span class="ui-tooltip-wrap">
									<button type="button" onclick={addOrUpdateLabel} disabled={!canEdit || labelEditorMode === "idle"}>{upsertLabelButtonLabel}</button>
								</span>
								<span class="ui-tooltip-wrap">
									<button
										type="button"
										class="danger-icon-button"
										onclick={removeLabel}
										disabled={!canEdit || !matchedSelectedCustomLabel}
										aria-label="Remove label"
										title="Remove label"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M10 11v6" />
											<path d="M14 11v6" />
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
											<path d="M3 6h18" />
											<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
										</svg>
									</button>
								</span>
							</div>

							{#if labelStatus}
								<p class="status-inline">{labelStatus}</p>
							{/if}

							{#if selectedTileCustomLabels.length}
								<div class="tile-pin-list">
									<p class="tile-pin-list-title">Custom labels on tile ({selectedTileCustomLabels.length})</p>
									{#each selectedTileCustomLabels as label (label.id)}
										<div class="tile-pin-item">
											<span class="ui-tooltip-wrap">
												<button type="button" class="tile-pin-load" onclick={() => loadLabelIntoEditor(label)} disabled={!canEdit}>
													<span>{label.name}</span>
													<span class="tile-label-meta">{labelSummary(label)}</span>
												</button>
												{#if !canEdit}
													<span class="ui-tooltip">Sign in to edit labels.</span>
												{/if}
											</span>
											<span class="ui-tooltip-wrap">
												<button
													type="button"
													class="tile-pin-remove danger-icon-button"
													onclick={() => removeLabelById(label.id)}
													disabled={!canEdit}
													aria-label={`Remove ${label.name}`}
													title={`Remove ${label.name}`}
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="15"
														height="15"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														aria-hidden="true"
													>
														<path d="M10 11v6" />
														<path d="M14 11v6" />
														<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
														<path d="M3 6h18" />
														<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
													</svg>
												</button>
											</span>
										</div>
									{/each}
								</div>
							{/if}
						{:else}
							<p>Select a tile on the map to anchor a label.</p>
						{/if}
					</div>
				{/if}

				{#if panelTab === "notes"}
					<div id="map-tools-panel-notes" class="panel-body" role="tabpanel" aria-labelledby="map-tools-tab-notes">
						<h3>Tile Notes</h3>
						{#if selectedTile}
							{#if !canEdit}
								<p class="auth-hint">{editorHint}</p>
							{/if}
							<p class="tile-id">Tile: {tileLabel(selectedTile)}</p>
							<div class="ui-tooltip-wrap ui-tooltip-block">
								<textarea rows="7" placeholder="Write map notes for this tile..." value={notesDraft} oninput={(event) => (notesDraft = event.currentTarget.value)} disabled={!canEdit}
								></textarea>
								{#if !canEdit}
									<span class="ui-tooltip">Sign in to edit notes.</span>
								{/if}
							</div>
							<div class="button-row">
								<span class="ui-tooltip-wrap">
									<button type="button" onclick={saveNotes} disabled={!canEdit}>Save Notes</button>
								</span>
								<span class="ui-tooltip-wrap">
									<button
										type="button"
										disabled={!canEdit}
										onclick={() => {
											notesDraft = "";
											saveNotes();
										}}
									>
										Clear
									</button>
								</span>
							</div>
							{#if notesStatus}
								<p class="status-inline">{notesStatus}</p>
							{/if}
						{:else}
							<p>Select a tile first, then add notes here.</p>
						{/if}
					</div>
				{/if}

				{#if panelTab === "export"}
					<div id="map-tools-panel-export" class="panel-body" role="tabpanel" aria-labelledby="map-tools-tab-export">
						<h3>TSL Exporting</h3>
						<p class="panel-intro">Generate SQL or TSL mod from the map's pins.</p>
						<div class="export-summary">
							<div class="export-metric">
								<span class="export-label">Map Size</span>
								<span class="export-value">{baseData ? `${baseData.width} x ${baseData.height}` : "-"}</span>
							</div>
							<div class="export-metric">
								<span class="export-label">Pins</span>
								<span class="export-value">{exportPinCount}</span>
							</div>
						</div>
						<label>
							Export Pins
							<select value={exportPinScope} onchange={(event) => (exportPinScope = event.currentTarget.value)}>
								<option value="all">All pins (shared + local)</option>
								<option value="local">Local only</option>
							</select>
						</label>
						<label>
							Sort Order
							<select value={exportSortMode} onchange={(event) => (exportSortMode = event.currentTarget.value)}>
								<option value="civ">Civilization (A-Z)</option>
								<option value="coords">Coordinates (X,Y)</option>
								<option value="none">No Sorting</option>
							</select>
						</label>
						{#if exportWarnings.length}
							<div class="export-warnings">
								<p class="export-warning-title">Checks</p>
								<ul class="export-warning-list">
									{#each exportWarnings as warning}
										<li>{warning}</li>
									{/each}
								</ul>
							</div>
						{/if}
						{#if exportStatus}
							<p class="status-inline">{exportStatus}</p>
						{/if}
						<div class="export-actions button-row">
							<span class="ui-tooltip-wrap">
								<button type="button" onclick={downloadExportSql} disabled={!exportSqlText}>Download SQL</button>
								{#if !exportSqlText}
									<span class="ui-tooltip">Add pins to enable SQL export.</span>
								{/if}
							</span>
							<span class="ui-tooltip-wrap">
								<button type="button" onclick={downloadExportZip} disabled={!exportLuaText || !exportModInfoText}>Download Zip</button>
								{#if !exportLuaText || !exportModInfoText}
									<span class="ui-tooltip">Add pins to enable zip export.</span>
								{/if}
							</span>
						</div>
						<div class="export-preview">
							<label>
								SQL Preview
								<textarea class="export-textarea" rows="8" readonly value={exportSqlText} spellcheck="false"></textarea>
							</label>
							<label>
								Lua Preview
								<textarea class="export-textarea" rows="8" readonly value={exportLuaText} spellcheck="false"></textarea>
							</label>
							<label>
								Modinfo Preview
								<textarea class="export-textarea" rows="8" readonly value={exportModInfoText} spellcheck="false"></textarea>
							</label>
						</div>
					</div>
				{/if}

				{#if panelTab === "settings"}
					<div id="map-tools-panel-settings" class="panel-body" role="tabpanel" aria-labelledby="map-tools-tab-settings">
						<h3>Settings</h3>
						<p class="panel-intro">Adjust map visibility and rendering options for quick focus while reviewing tiles.</p>
						<div class="settings-group">
							<label class="check-row">
								<input type="checkbox" checked={settings.showPins} onchange={() => toggleSetting("showPins")} />
								<span class="check-row-copy">
									<span class="check-row-title">Show Civilization Pins</span>
									<span class="check-row-hint">Display pin markers and civ names on the map.</span>
								</span>
							</label>
							<div class="pin-mode-group">
								<p class="pin-mode-title">Pin Visibility</p>
								<div class="pin-mode-buttons" role="group" aria-label="Pin visibility">
									<button type="button" class:active={pinViewMode === "all"} onclick={() => setPinViewMode("all")}>Shared Pins</button>
									<button type="button" class:active={pinViewMode === "local"} onclick={() => setPinViewMode("local")}>Local Only</button>
									<button type="button" class:active={pinViewMode === "combined"} style="grid-column: span 2" onclick={() => setPinViewMode("combined")}>Local + Shared</button>
								</div>
								<p class="pin-mode-hint">Local pins are saved to this browser. Shared pins come from the map data/cloud.</p>
							</div>
							<label class="check-row">
								<input type="checkbox" checked={settings.showLabels} onchange={() => toggleSetting("showLabels")} />
								<span class="check-row-copy">
									<span class="check-row-title">Show Map Labels</span>
									<span class="check-row-hint">Display named rivers and geographic regions.</span>
								</span>
							</label>
							<label class="check-row ui-tooltip-anchor">
								<input type="checkbox" checked={settings.showRiverLabels} onchange={() => toggleSetting("showRiverLabels")} disabled={!settings.showLabels} />
								<span class="check-row-copy">
									<span class="check-row-title">River Labels</span>
									<span class="check-row-hint">Follow major river paths with text labels.</span>
								</span>
								{#if !settings.showLabels}
									<span class="ui-tooltip">Enable labels to toggle river labels.</span>
								{/if}
							</label>
							<label class="check-row ui-tooltip-anchor">
								<input type="checkbox" checked={settings.showRegionLabels} onchange={() => toggleSetting("showRegionLabels")} disabled={!settings.showLabels} />
								<span class="check-row-copy">
									<span class="check-row-title">Region Labels</span>
									<span class="check-row-hint">Show area names like deserts and mountain ranges.</span>
								</span>
								{#if !settings.showLabels}
									<span class="ui-tooltip">Enable labels to toggle region labels.</span>
								{/if}
							</label>
							<label class="check-row">
								<input type="checkbox" checked={settings.hideDecorations} onchange={() => toggleSetting("hideDecorations")} />
								<span class="check-row-copy">
									<span class="check-row-title">Hide Decorations</span>
									<span class="check-row-hint">Remove terrain glyphs and note indicators.</span>
								</span>
							</label>
							<label class="check-row">
								<input type="checkbox" checked={settings.flattenLandWater} onchange={() => toggleSetting("flattenLandWater")} />
								<span class="check-row-copy">
									<span class="check-row-title">Flatten Land/Water Colors</span>
									<span class="check-row-hint">Use simplified land and water color hexes.</span>
								</span>
							</label>
							<label class="check-row">
								<input type="checkbox" checked={settings.grayscaleTerrain} onchange={() => toggleSetting("grayscaleTerrain")} />
								<span class="check-row-copy">
									<span class="check-row-title">Grayscale Terrain</span>
									<span class="check-row-hint">Reduce terrain colors to grayscale tones.</span>
								</span>
							</label>
						</div>
						<div class="pin-reset-row">
							<span class="ui-tooltip-wrap">
								<button
									type="button"
									class="danger-text-button"
									onclick={() => {
										if (window.confirm(`Reset all local pins for ${currentMap?.title || "this map"}? This cannot be undone.`)) {
											resetLocalPins();
										}
									}}
									disabled={!localPins.length}
								>
									Reset Local Pins
								</button>
								{#if !localPins.length}
									<span class="ui-tooltip">No local pins to reset.</span>
								{/if}
							</span>
							<p class="pin-reset-hint">Clears locally saved pins for this map only.</p>
						</div>
						<!-- <div class="button-row">
							<button type="button" onclick={resetSettings}>Reset Settings</button>
						</div> -->
					</div>
				{/if}
			</aside>
		</div>
	{/if}
</section>

<style>
	.viewer-page {
		display: grid;
		gap: 1.25rem;
	}

	.status {
		margin-block: 0;
		padding-block: 0.8rem;
		padding-inline: 1rem;
		border-radius: 0.7rem;
		background: oklch(0.965 0.018 85 / 0.92);
		border: 1px solid oklch(0.79 0.05 82 / 0.38);
	}

	.status.error {
		color: oklch(0.49 0.17 27);
		border-color: oklch(0.63 0.14 28 / 0.45);
		background: oklch(0.94 0.04 25 / 0.95);
	}

	.status.debug {
		color: oklch(0.42 0.06 230);
		border-color: oklch(0.55 0.05 230 / 0.38);
		background: oklch(0.95 0.02 235 / 0.94);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.78rem;
		overflow-wrap: anywhere;
	}

	.viewer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.map-meta {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;

		& h2 {
			margin-block: 0;
			font-size: clamp(2rem, 2vw, 3rem);
			letter-spacing: 0.025em;
		}

		& p {
			margin-block: 0;
			color: var(--muted-ink);
		}
	}

	.meta-line {
		font-size: 0.9rem;
		color: var(--muted-ink);
	}

	.tile-map-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		border: 1px solid var(--panel-border);
		border-radius: 0.75rem;
		background: var(--control-bg);
		padding-block: 0.25rem;
		padding-inline: 0.5rem;
	}

	.tile-map-control-group {
		min-block-size: 3rem;
		display: inline-flex;
		gap: 0.4rem;
		align-items: center;
		padding-block: 0;
		padding-inline: 0;
	}

	.tile-map-select {
		border: 1px solid var(--panel-border);
		background: var(--input-bg);
		color: var(--ink);
		border-radius: 0.55rem;
		padding-block: 0.36rem;
		padding-inline: 0.5rem;
		font: inherit;
		max-inline-size: min(22rem, 48vw);
	}

	.tile-map-control-label {
		color: var(--muted-ink);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-box: trim-both cap alphabetic;
		padding-inline-start: 0.2rem;
	}

	.tile-map-scale {
		display: inline-flex;
		gap: 0.25rem;
		align-items: center;
	}

	.tile-map-toolbar-divider {
		inline-size: 1px;
		block-size: 1.8rem;
		background: color-mix(in oklch, var(--panel-border) 78%, transparent);
		margin-inline: 0.15rem;
	}

	.tile-map-control {
		color: var(--ink);
		font: inherit;
		line-height: 1;
		padding-block: 0.42rem;
		padding-inline: 0.7rem;
		border: 1px solid var(--panel-border);
		border-radius: 0.6rem;
		background: var(--control-bg);
		cursor: pointer;

		&:hover {
			background: color-mix(in oklch, var(--accent) 14%, var(--control-bg));
		}

		&:disabled {
			opacity: 0.48;
			cursor: not-allowed;
		}
	}

	.tile-map-control-ghost {
		min-inline-size: 2.2rem;
		font-size: 1rem;
		font-weight: 700;
		padding-inline: 0.45rem;
	}

	.tile-map-control-collapse {
		min-inline-size: 2.2rem;
		padding-inline: 0.45rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.tile-map-control-icon {
		width: 0.95rem;
		height: 0.95rem;
		fill: currentColor;
	}

	.tile-map-control-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 3.25rem;
		padding-block: 0.35rem;
		padding-inline: 0.55rem;
		border-radius: 999px;
		border: 1px solid color-mix(in oklch, var(--accent) 44%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 12%, var(--input-bg));
		color: var(--ink);
		font-size: 0.82rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.workspace {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: 1rem;
		min-height: 520px;
	}

	.workspace.panel-collapsed {
		grid-template-columns: minmax(0, 1fr);
	}

	.stage-wrap {
		min-inline-size: 0;
	}

	.viewport {
		position: relative;
		min-block-size: 40rem;
		border-radius: 1rem;
		overflow: hidden;
		border: 1px solid var(--panel-border);
		box-shadow: 0 10px 20px hsl(203deg 44% 14% / 0.2);
		background: oklch(0.45 0.005 300);
		outline: none;
		touch-action: none;
	}

	.viewport:focus-visible {
		box-shadow:
			0 0 0 2px oklch(0.84 0.15 80 / 0.92),
			0 10px 20px hsl(203deg 44% 14% / 0.24);
	}

	.map-world {
		position: absolute;
		inset-block-start: 0;
		inset-inline-start: 0;
		transform-origin: 0 0;
		will-change: transform;
	}

	.map-layer,
	.overlay-layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.overlay-layer {
		pointer-events: none;
	}

	.outline-selected {
		fill: color-mix(in oklch, var(--accent) 26%, transparent);
		stroke: color-mix(in oklch, var(--accent) 78%, white);
		stroke-width: 1.1;
	}

	.outline-hover {
		fill: hsl(199deg 100% 88% / 0.14);
		stroke: hsl(199deg 100% 88% / 0.75);
		stroke-width: 0.9;
	}

	.label-layer {
		pointer-events: none;
	}

	.map-label {
		pointer-events: none;
		paint-order: stroke fill;
		stroke-linejoin: round;
		text-rendering: geometricPrecision;
	}

	.map-label-river {
		fill: hsl(210deg 47% 24% / 0.96);
		stroke: hsl(196deg 36% 97% / 0.9);
		stroke-width: 2.6;
		font-weight: 600;
		font-style: italic;
		font-family: "Palatino Linotype", "Book Antiqua", serif;
	}

	.map-label-region {
		fill: hsl(30deg 27% 24% / 0.85);
		stroke: hsl(56deg 50% 98% / 0.75);
		stroke-width: 3.2;
		font-weight: 700;
		font-family: "Avenir Next", "Gill Sans", sans-serif;
		text-transform: uppercase;
	}

	.map-label-region.map-label-variant-water {
		fill: hsl(211deg 69% 34% / 0.95);
		stroke: hsl(208deg 100% 97% / 0.85);
		stroke-width: 2.8;
		font-weight: 600;
		font-style: italic;
		font-family: "Palatino Linotype", "Book Antiqua", serif;
		text-transform: none;
	}

	.map-label-major {
		opacity: 0.95;
	}

	.map-label-standard {
		opacity: 0.88;
	}

	.map-label-minor {
		opacity: 0.74;
	}

	.pin {
		pointer-events: auto;
		cursor: pointer;
	}

	.pin-group {
		transform-box: fill-box;
	}

	.pin-core {
		fill: var(--primary, hsl(204deg 33% 21%));
		stroke: var(--secondary, hsl(42deg 82% 72%));
		stroke-width: 3;
	}

	.pin-group.is-multi .pin-core {
		stroke-width: 2.4;
	}

	.pin-center {
		fill: var(--secondary, hsl(42deg 82% 72%));
	}

	.pin-group.is-multi .pin-center {
		fill: hsl(0deg 0% 100% / 0.95);
	}

	.pin-multi-ring {
		fill: none;
		stroke: hsl(197deg 46% 17% / 0.5);
		stroke-width: 1.2;
		stroke-dasharray: 2 2;
	}

	.pin-satellite {
		fill: var(--primary, hsl(204deg 33% 21%));
		stroke: var(--secondary, hsl(42deg 82% 72%));
		stroke-width: 1.2;
	}

	.pin-count-bg {
		fill: oklch(0.98 0.007 95 / 0.98);
		stroke: hsl(197deg 46% 17% / 0.5);
		stroke-width: 1;
	}

	.pin-count-text {
		fill: hsl(197deg 46% 17%);
		font-size: 7.5px;
		font-weight: 700;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-variant-numeric: tabular-nums;
		text-rendering: geometricPrecision;
		paint-order: stroke fill;
		stroke: hsl(0deg 0% 100% / 0.45);
		stroke-width: 0.55;
		pointer-events: none;
	}

	.tooltip-bridge {
		position: absolute;
		pointer-events: none;
	}

	.tile-tooltip {
		position: absolute;
		z-index: 5;
		min-inline-size: 12rem;
		max-inline-size: min(18rem, calc(100% - 24px));
		pointer-events: none;
		padding-block: 0.7rem;
		padding-inline: 0.85rem;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, white 10%);
		background: color-mix(in oklch, var(--panel-bg) 94%, black 6%);
		backdrop-filter: blur(6px);
		box-shadow: 0 14px 30px hsl(28deg 24% 8% / 0.38);
	}

	.tile-tooltip-title {
		color: color-mix(in oklch, var(--ink) 76%, white 24%);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-block-end: 0.35rem;
	}

	.tile-tooltip-list {
		display: grid;
		gap: 0.35rem;
	}

	.tile-info-row {
		display: grid;
		gap: 0.08rem;
		font-size: 0.78rem;
	}

	.tile-info-label {
		color: color-mix(in oklch, var(--ink) 68%, white 32%);
	}

	.tile-info-value {
		color: color-mix(in oklch, var(--ink) 88%, white 12%);
	}

	.tile-info-notes {
		display: grid;
		gap: 0.35rem;
		border-block-start: 1px solid color-mix(in oklch, var(--panel-border) 66%, white 18%);
		padding-block-start: 0.75rem;
		margin-block-start: 0.5rem;
	}

	.tile-info-notes .tile-info-label {
		color: color-mix(in oklch, var(--ink) 72%, white 28%);
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.tile-info-notes-value {
		max-block-size: 6rem;
		overflow: auto;
		color: color-mix(in oklch, var(--ink) 84%, white 16%);
		margin-block: 0;
		font-size: 0.75rem;
		line-height: 1.25;
		white-space: pre-wrap;
		padding-inline-end: 0.25rem;
	}

	.side-panel {
		display: grid;
		grid-template-rows: auto 1fr;
		border-radius: 1rem;
		border: 1px solid var(--panel-border);
		background: var(--panel-bg);
		min-height: 540px;
		overflow: hidden;
	}

	.side-panel.is-collapsed {
		display: none;
	}

	.tab-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(4.6rem, 1fr));
		gap: 0.25rem;
		padding: 0.35rem;
		background: var(--control-bg);

		& button {
			color: var(--ink);
			font: inherit;
			padding: 0.45rem 0.4rem;
			border: 1px solid var(--panel-border);
			border-radius: 0.55rem;
			background: var(--control-bg);
			cursor: pointer;

			&:not(:disabled):hover {
				border-color: color-mix(in oklch, var(--accent) 30%, var(--panel-border));
				background: color-mix(in oklch, var(--control-bg) 70%, var(--accent) 12%);
			}

			&.active {
				color: oklch(0.99 0.004 85);
				text-shadow: 0 1px 2px oklch(0.19 0.2 85);
				border-color: transparent;
				background: linear-gradient(145deg, var(--accent), var(--accent-strong));
			}
		}
	}

	.panel-body {
		display: grid;
		min-inline-size: 0;
		gap: 0.72rem;
		align-content: start;
		overflow: auto;
		padding-block: 0.9rem;
		padding-inline: 0.9rem;

		& h3,
		& h4 {
			margin-block: 0;
			color: var(--ink);
		}

		& label {
			display: grid;
			min-inline-size: 0;
			gap: 0.28rem;
			color: var(--muted-ink);
			font-size: 0.84rem;
		}

		& input,
		& textarea,
		& select {
			inline-size: 100%;
			color: var(--ink);
			font: inherit;
			padding-block: 0.44rem;
			padding-inline: 0.5rem;
			border: 1px solid var(--panel-border);
			border-radius: 0.55rem;
			background: var(--input-bg);
		}

		& button {
			min-inline-size: 0;
			color: var(--ink);
			font: inherit;
			padding-block: 0.42rem;
			padding-inline: 0.62rem;
			border: 1px solid var(--panel-border);
			border-radius: 0.55rem;
			background: var(--control-bg);
			cursor: pointer;

			&:not(:disabled):hover {
				border-color: color-mix(in oklch, var(--accent) 30%, var(--panel-border));
				background: color-mix(in oklch, var(--control-bg) 70%, var(--accent) 12%);
			}
		}
	}

	.panel-intro {
		margin-block: 0;
		color: var(--muted-ink);
		font-size: 0.84rem;
		line-height: 1.4;
	}

	.tile-id {
		margin-block: 0;
		color: var(--muted-ink);
		font-size: 0.86rem;
	}

	.pin-meta-row {
		display: grid;
		min-inline-size: 0;
		gap: 0.45rem;
		grid-template-columns: repeat(auto-fit, minmax(11.5rem, 1fr));
	}

	.pin-edit-target {
		display: grid;
		gap: 0.4rem;
		padding: 0.6rem;
		border: 1px solid var(--panel-border);
		border-radius: 0.65rem;
		background: color-mix(in oklch, var(--panel-bg) 86%, var(--accent) 6%);
	}

	.pin-reset-row {
		display: grid;
		gap: 0.35rem;
		margin-top: 0.65rem;
		margin-bottom: 0.75rem;
	}

	.pin-reset-hint {
		margin: 0;
		color: var(--muted-ink);
		font-size: 0.78rem;
	}

	.pin-edit-title {
		margin-block: 0;
		color: var(--muted-ink);
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.pin-edit-buttons {
		display: grid;
		gap: 0.4rem;
		grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));

		& button {
			position: relative;
			color: var(--ink);
			font: inherit;
			padding: 0.45rem 0.5rem;
			border: 1px solid var(--panel-border);
			border-radius: 0.55rem;
			background: var(--control-bg);
			cursor: pointer;

			&.active {
				color: oklch(0.99 0.004 85);
				text-shadow: 0 1px 2px oklch(0.19 0.2 85);
				border-color: transparent;
				background: linear-gradient(145deg, var(--accent), var(--accent-strong));
			}

			&:disabled:hover .pin-edit-tooltip {
				opacity: 1;
				transform: translate(-50%, -0.6rem);
			}
		}
	}

	.ui-tooltip-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;

		&.ui-tooltip-block {
			display: block;
		}

		&:hover .ui-tooltip {
			opacity: 1;
			transform: translate(-50%, -0.6rem);
		}
	}

	.ui-tooltip-anchor {
		position: relative;

		&:hover .ui-tooltip {
			opacity: 1;
			transform: translate(-50%, -0.6rem);
		}
	}

	.ui-tooltip {
		position: absolute;
		z-index: 10;
		inset-block-end: 100%;
		inset-inline-start: 50%;
		color: var(--ink);
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		padding-block: 0.45rem;
		padding-inline: 0.6rem;
		border-radius: 0.4rem;
		border: 1px solid color-mix(in oklch, var(--accent) 25%, var(--panel-border));
		background: var(--panel-bg);
		opacity: 0;
		pointer-events: none;
		transform: translate(-50%, -0.4rem);
		transition:
			opacity 0.2s ease,
			transform 0.2s ease;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);

		&::after {
			content: "";
			position: absolute;
			inset-block-start: 100%;
			inset-inline-start: 50%;
			inline-size: 0;
			block-size: 0;
			border-top: 5px solid var(--panel-bg);
			border-right: 5px solid transparent;
			border-left: 5px solid transparent;
			transform: translateX(-50%);
		}
	}

	.pin-edit-tooltip {
		position: absolute;
		z-index: 10;
		padding: 0.45rem 0.6rem;
		border-radius: 0.4rem;
		border: 1px solid color-mix(in oklch, var(--accent) 25%, var(--panel-border));
		background: var(--panel-bg);
		color: var(--ink);
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		inset-block-end: 100%;
		inset-inline-start: 50%;
		transform: translate(-50%, -0.4rem);
		transition:
			opacity 0.2s ease,
			transform 0.2s ease;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
	}

	.pin-edit-tooltip::after {
		content: "";
		position: absolute;
		inline-size: 0;
		block-size: 0;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-top: 5px solid var(--panel-bg);
		filter: drop-shadow(0 1px 0px color-mix(in oklch, var(--accent) 25%, var(--panel-border)));
		inset-block-start: 100%;
		inset-inline-start: 50%;
		transform: translateX(-50%);
	}

	.danger-text-button {
		border: 1px solid rgba(194, 68, 68, 0.55);
		color: #c24444;
		background: rgba(194, 68, 68, 0.1);
	}

	.danger-text-button:hover {
		background: rgba(194, 68, 68, 0.18);
	}

	.danger-text-button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.pin-meta-field {
		min-inline-size: 0;
	}

	.pin-meta-check {
		gap: 0.35rem;
	}

	.pin-meta-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.78rem;
		color: var(--muted-ink);
	}

	.pin-meta-toggle input {
		inline-size: 1rem;
		block-size: 1rem;
	}

	.pin-meta-hint {
		font-size: 0.74rem;
		color: var(--muted-ink);
	}

	.color-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.5rem;
		min-inline-size: 0;
	}

	.color-picker-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-inline-size: 0;
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
			position: absolute;
			z-index: 2;
			inset: 0;
			inline-size: 100%;
			block-size: 100%;
			margin: 0;
			padding: 0;
			border: 0;
			background: transparent;
			opacity: 0;
			cursor: pointer;
			appearance: none;
			-webkit-appearance: none;

			&:disabled {
				cursor: not-allowed;
			}
		}

		& .color-preview {
			position: absolute;
			z-index: 1;
			inset: 0;
			display: block;
			inline-size: 100%;
			block-size: 100%;
			border: 1px solid var(--panel-border);
			border-radius: inherit;
			background: var(--preview, hsl(0deg 0% 0%));
			box-shadow: inset 0 0 0 1px hsl(0deg 0% 100% / 0.3);
			pointer-events: none;
		}
	}

	.color-hex-input {
		flex: 1;
		min-inline-size: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		text-transform: uppercase;
	}

	.color-value {
		font-size: 0.74rem;
		color: var(--muted-ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.tile-pin-list {
		display: grid;
		gap: 0.35rem;
		padding-block: 0.5rem;
		padding-inline: 0.55rem;
		border: 1px solid var(--panel-border);
		border-radius: 0.55rem;
		background: oklch(0.98 0.007 95 / 0.66);
	}

	.export-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
		gap: 0.5rem;
		border: 1px solid var(--panel-border);
		border-radius: 0.6rem;
		padding: 0.6rem;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--accent) 6%);
	}

	.export-metric {
		display: grid;
		gap: 0.2rem;
	}

	.export-label {
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-ink);
	}

	.export-value {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--ink);
	}

	.export-toggle-row {
		display: grid;
		gap: 0.45rem;
	}

	.export-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.82rem;
		color: var(--ink);
	}

	.export-toggle input {
		inline-size: 1rem;
		block-size: 1rem;
	}

	.export-warnings {
		border: 1px solid color-mix(in oklch, oklch(0.62 0.2 28) 40%, var(--panel-border));
		background: color-mix(in oklch, oklch(0.8 0.18 30) 15%, var(--panel-bg));
		padding: 0.55rem 0.6rem;
		border-radius: 0.6rem;
		display: grid;
		gap: 0.4rem;
	}

	.export-warning-title {
		margin-block: 0;
		font-size: 0.78rem;
		font-weight: 700;
		color: oklch(0.5 0.17 28);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.export-warning-list {
		margin: 0;
		padding-inline-start: 1rem;
		color: var(--ink);
		font-size: 0.8rem;
	}

	.export-warning-list li + li {
		margin-top: 0.2rem;
	}

	.export-preview {
		display: grid;
		gap: 0.65rem;
	}

	.export-textarea {
		min-block-size: 8rem;
		resize: vertical;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.tile-pin-list-title {
		margin-block: 0;
		font-size: 0.78rem;
		color: var(--muted-ink);
	}

	.tile-pin-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
		min-inline-size: 0;
	}

	.tile-pin-load {
		flex: 1;
		min-inline-size: 0;
		max-inline-size: 100%;
		display: flex;
		align-items: center;
		justify-items: start;
		gap: 0.25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: normal;
	}

	.tile-pin-meta {
		font-size: 0.7rem;
		color: var(--muted-ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.tile-label-meta {
		font-size: 0.72rem;
		color: var(--muted-ink);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.tile-pin-swatch {
		display: inline-block;
		inline-size: 1rem;
		block-size: 1rem;
		border-radius: 999px;
		background: var(--primary, hsl(204deg 33% 21%));
		border: 2px solid var(--secondary, hsl(42deg 82% 72%));
		margin-inline-end: 0.2rem;
	}

	.tile-pin-remove {
		padding-inline: 0.5rem;
	}

	.button-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		min-inline-size: 0;
	}

	.pin-action-row {
		inline-size: stretch;
		display: flex;
		flex-wrap: wrap;
		align-items: center;

		.ui-tooltip-wrap {
			flex: 1;
		}

		button {
			flex: 1;
			text-wrap: nowrap;
		}
	}

	.pin-editor-state {
		margin-block: 0;
		padding-block: 0.42rem;
		padding-inline: 0.55rem;
		border-radius: 0.5rem;
		border: 1px solid var(--panel-border);
		font-size: 0.8rem;
		color: var(--muted-ink);
		background: color-mix(in oklch, var(--accent) 8%, var(--panel-bg));
	}

	.pin-editor-state[data-mode="edit"] {
		border-color: color-mix(in oklch, var(--accent) 48%, var(--panel-border));
		color: color-mix(in oklch, var(--accent) 62%, var(--ink));
		background: color-mix(in oklch, var(--accent) 16%, var(--panel-bg));
	}

	.danger-icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.2rem;
		padding-inline: 0;
		color: oklch(0.62 0.2 28);
		border-color: color-mix(in oklch, oklch(0.62 0.2 28) 55%, var(--panel-border));
		background: color-mix(in oklch, oklch(0.62 0.2 28) 9%, var(--control-bg));
	}

	.danger-icon-button:hover {
		color: oklch(0.56 0.22 28);
		border-color: color-mix(in oklch, oklch(0.56 0.22 28) 70%, var(--panel-border));
		background: color-mix(in oklch, oklch(0.56 0.22 28) 15%, var(--control-bg));
	}

	.settings-group {
		display: grid;
		gap: 0.5rem;
	}

	.pin-mode-group {
		display: grid;
		gap: 0.45rem;
		padding: 0.6rem;
		border: 1px solid var(--panel-border);
		border-radius: 0.65rem;
		background: color-mix(in oklch, var(--panel-bg) 86%, var(--accent) 6%);
	}

	.pin-mode-title {
		margin-block: 0;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted-ink);
	}

	.pin-mode-buttons {
		display: grid;
		gap: 0.4rem;
		grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));

		& button {
			color: var(--ink);
			font: inherit;
			padding: 0.45rem 0.5rem;
			border: 1px solid var(--panel-border);
			border-radius: 0.55rem;
			background: var(--control-bg);
			cursor: pointer;

			&:not(:disabled):hover {
				border-color: color-mix(in oklch, var(--accent) 30%, var(--panel-border));
				background: color-mix(in oklch, var(--control-bg) 70%, var(--accent) 12%);
			}

			&.active {
				color: oklch(0.99 0.004 85);
				text-shadow: 0 1px 2px oklch(0.19 0.2 85);
				border-color: transparent;
				background: linear-gradient(145deg, var(--accent), var(--accent-strong));
			}
		}
	}

	.pin-mode-hint {
		margin-block: 0;
		font-size: 0.78rem;
		color: var(--muted-ink);
	}

	.check-row {
		display: grid;
		align-items: start;
		gap: 0.65rem;
		grid-template-columns: auto minmax(0, 1fr);
		padding-block: 0.55rem;
		padding-inline: 0.6rem;
		color: var(--ink);
		font-size: 0.86rem;
		border-radius: 0.62rem;
		border: 1px solid var(--panel-border);
		background: color-mix(in oklch, var(--input-bg) 62%, var(--panel-bg));
		cursor: pointer;

		&:hover {
			border-color: color-mix(in oklch, var(--accent) 36%, var(--panel-border));
			background: color-mix(in oklch, var(--accent) 7%, var(--input-bg));
		}

		& input {
			align-self: center;
			inline-size: 1rem;
			block-size: 1rem;
			margin-inline-end: 0.5rem;
		}
	}

	.check-row-copy {
		display: grid;
		gap: 0.14rem;
		min-inline-size: 0;
	}

	.check-row-title {
		font-size: 0.86rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--ink);
	}

	.check-row-hint {
		font-size: 0.76rem;
		line-height: 1.35;
		color: var(--muted-ink);
	}

	.status-inline {
		margin-block: 0;
		color: var(--muted-ink);
		font-size: 0.8rem;
	}

	.auth-hint {
		margin-block: 0;
		padding-block: 0.45rem;
		padding-inline: 0.55rem;
		border-radius: 0.5rem;
		background: oklch(0.9 0.05 84 / 0.74);
		border: 1px solid oklch(0.64 0.06 80 / 0.33);
		color: oklch(0.46 0.07 76);
		font-size: 0.82rem;
	}

	.auth-active {
		margin-block: 0;
		padding-block: 0.35rem;
		padding-inline: 0.55rem;
		border-radius: 0.5rem;
		background: oklch(0.9 0.03 165 / 0.85);
		border: 1px solid oklch(0.63 0.07 165 / 0.32);
		color: oklch(0.45 0.08 165);
		font-size: 0.8rem;
	}

	:global(:root[data-theme="dark"]) .tile-map {
		& .viewport {
			background: oklch(0.25 0.005 200);
			box-shadow: 0 18px 32px hsl(35deg 22% 4% / 0.38);
		}

		& .tab-row button.active {
			color: oklch(0.98 0.004 85);
			text-shadow: 0 1px 2px oklch(0.19 0.2 85);
			background: linear-gradient(145deg, var(--accent), var(--accent-strong));
		}

		& .tile-map-control-group {
			border-color: transparent;
			background: transparent;
		}

		& .tile-map-controls {
			border-color: oklch(0.42 0.012 74 / 0.5);
			background: oklch(0.22 0.008 72 / 0.95);
		}

		& .tile-map-control {
			color: oklch(0.95 0.004 85);
			border-color: oklch(0.44 0.012 74 / 0.5);
			background: oklch(0.255 0.01 72 / 0.96);

			&:hover {
				background: oklch(0.3 0.012 72 / 0.98);
			}
		}

		& .tile-map-select {
			color: oklch(0.95 0.004 85);
			border-color: oklch(0.44 0.012 74 / 0.5);
			background: oklch(0.255 0.01 72 / 0.96);
		}

		& .tile-map-toolbar-divider {
			background: oklch(0.45 0.012 74 / 0.52);
		}

		& .tile-map-control-pill {
			color: oklch(0.97 0.006 85);
			border-color: oklch(0.63 0.04 78 / 0.5);
			background: oklch(0.34 0.016 74 / 0.98);
		}

		& .tile-tooltip {
			border-color: oklch(0.45 0.012 74 / 0.52);
			background: oklch(0.2 0.008 74 / 0.95);
			box-shadow: 0 14px 30px hsl(30deg 22% 5% / 0.45);
		}

		& .map-label-river {
			fill: oklch(0.9 0.03 222);
			stroke: oklch(0.19 0.01 72 / 0.92);
		}

		& .map-label-region {
			fill: oklch(0.84 0.03 82 / 0.9);
			stroke: oklch(0.17 0.007 72 / 0.9);
		}

		& .map-label-region.map-label-variant-water {
			fill: oklch(0.86 0.06 236 / 0.92);
			stroke: oklch(0.19 0.01 72 / 0.92);
		}

		& .tile-pin-list {
			background: oklch(0.24 0.01 74 / 0.78);
		}

		& .check-row {
			border-color: oklch(0.43 0.012 74 / 0.46);
			background: oklch(0.26 0.01 74 / 0.75);

			&:hover {
				border-color: oklch(0.57 0.045 78 / 0.52);
				background: oklch(0.29 0.014 74 / 0.82);
			}
		}
	}

	@media (max-width: 1024px) {
		.workspace {
			grid-template-columns: 1fr;
		}

		.side-panel {
			min-height: auto;
		}

		.viewport {
			min-block-size: 500px;
		}
	}

	@media (max-width: 640px) {
		.viewer-header {
			flex-direction: column;
			align-items: stretch;
		}

		.tile-map-controls {
			inline-size: 100%;
		}

		.viewport {
			min-block-size: 420px;
		}
	}
</style>
