export function hasCloudPinSyncConfig({ supabaseUrl, supabaseAnonKey, supabasePinsTable, mapId }) {
	return Boolean(supabaseUrl && supabaseAnonKey && supabasePinsTable && mapId);
}

export function canPushCloudPins({ hasConfig, authAccessToken, authUserEmail, canEdit }) {
	return Boolean(hasConfig && authAccessToken && authUserEmail && canEdit);
}

export function resolveCloudSyncAction({ hasConfig, visibilityState, isDirty }) {
	if (!hasConfig) {
		return "none";
	}
	if (visibilityState === "hidden") {
		return "none";
	}
	if (isDirty) {
		return "push";
	}
	return "pull";
}
