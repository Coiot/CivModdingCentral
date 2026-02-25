import test from "node:test";
import assert from "node:assert/strict";
import { canPushCloudPins, hasCloudPinSyncConfig, resolveCloudSyncAction } from "../src/lib/map/sync.js";

test("hasCloudPinSyncConfig requires all required fields", () => {
	assert.equal(
		hasCloudPinSyncConfig({
			supabaseUrl: "https://example.supabase.co",
			supabaseAnonKey: "anon-key",
			supabasePinsTable: "cmc_map_pins",
			mapId: "cbrx",
		}),
		true
	);

	assert.equal(
		hasCloudPinSyncConfig({
			supabaseUrl: "",
			supabaseAnonKey: "anon-key",
			supabasePinsTable: "cmc_map_pins",
			mapId: "cbrx",
		}),
		false
	);
});

test("canPushCloudPins enforces auth and edit state", () => {
	assert.equal(
		canPushCloudPins({
			hasConfig: true,
			authAccessToken: "jwt",
			authUserEmail: "user@example.com",
			canEdit: true,
		}),
		true
	);

	assert.equal(
		canPushCloudPins({
			hasConfig: true,
			authAccessToken: "",
			authUserEmail: "user@example.com",
			canEdit: true,
		}),
		false
	);
});

test("resolveCloudSyncAction chooses push, pull, or none", () => {
	assert.equal(
		resolveCloudSyncAction({
			hasConfig: false,
			visibilityState: "visible",
			isDirty: true,
		}),
		"none"
	);

	assert.equal(
		resolveCloudSyncAction({
			hasConfig: true,
			visibilityState: "hidden",
			isDirty: true,
		}),
		"none"
	);

	assert.equal(
		resolveCloudSyncAction({
			hasConfig: true,
			visibilityState: "visible",
			isDirty: true,
		}),
		"push"
	);

	assert.equal(
		resolveCloudSyncAction({
			hasConfig: true,
			visibilityState: "visible",
			isDirty: false,
		}),
		"pull"
	);
});
