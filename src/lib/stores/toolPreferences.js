import { writable } from "svelte/store";

const CIV_ICON_SHARED_KEY = "cmc:shared:civ-icon-preferences:v1";
const CIV_ICON_MAKER_SETTINGS_KEY = "cmc:civ-icon-maker:settings:v2";
const DDS_SHARED_KEY = "cmc:shared:dds-preferences:v1";

const DEFAULT_CIV_ICON_PREFERENCES = {
	primaryColor: "#1f4f99",
	iconColor: "#f4de9a",
};

const DEFAULT_DDS_PREFERENCES = {
	workflow: "icon_bundle",
	selectedAtlasPresetId: "icon_2x2",
	atlasRows: 2,
	atlasCols: 2,
	atlasSelectedSizes: [256, 128, 80, 64, 45, 32],
};

function safeParse(raw) {
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
}

function readLocalStorageValue(key) {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return safeParse(window.localStorage.getItem(key));
	} catch {
		return null;
	}
}

function createPersistedPreferences(key, defaults, fallbackLoad) {
	const initial = typeof window === "undefined" ? defaults : { ...defaults, ...(fallbackLoad?.() || {}), ...(readLocalStorageValue(key) || {}) };
	const store = writable(initial);

	if (typeof window !== "undefined") {
		store.subscribe((value) => {
			try {
				window.localStorage.setItem(key, JSON.stringify(value));
			} catch {
				// Ignore localStorage write failures.
			}
		});

		window.addEventListener("storage", (event) => {
			if (event.key !== key) {
				return;
			}

			const next = safeParse(event.newValue);
			if (!next) {
				return;
			}

			store.set({ ...defaults, ...next });
		});
	}

	return store;
}

function loadCivIconFallback() {
	const payload = readLocalStorageValue(CIV_ICON_MAKER_SETTINGS_KEY);
	if (!payload) {
		return null;
	}

	return {
		primaryColor: typeof payload.primaryColor === "string" ? payload.primaryColor : DEFAULT_CIV_ICON_PREFERENCES.primaryColor,
		iconColor: typeof payload.iconColor === "string" ? payload.iconColor : DEFAULT_CIV_ICON_PREFERENCES.iconColor,
	};
}

export const civIconPreferences = createPersistedPreferences(CIV_ICON_SHARED_KEY, DEFAULT_CIV_ICON_PREFERENCES, loadCivIconFallback);
export const ddsPreferences = createPersistedPreferences(DDS_SHARED_KEY, DEFAULT_DDS_PREFERENCES);

export function syncCivIconPreferences(partial) {
	civIconPreferences.update((current) => ({ ...current, ...partial }));
}

export function syncDdsPreferences(partial) {
	ddsPreferences.update((current) => ({ ...current, ...partial }));
}
