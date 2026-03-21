export function linkSurfaceClass(href) {
	const value = String(href || "");
	if (value.includes("/schema-browser")) return "is-schema";
	if (value.includes("/lua-api-explorer")) return "is-lua";
	if (value.includes("/pattern-library")) return "is-pattern";
	if (value.includes("/template-generators")) return "is-generator";
	if (value.includes("/guided-planner")) return "is-planner";
	if (value.includes("/workshop-uploader") || value.includes("/modinfo-builder") || value.includes("/civ5mod-ziper")) return "is-publish";
	if (value.includes("/dds-converter") || value.includes("/civ-icon-maker") || value.includes("/text-screen-viewer")) return "is-ui";
	if (value.includes("/religion-support") || value.includes("/map-viewer")) return "is-support";
	return "is-tool";
}

export function linkSurfaceLabel(href) {
	const value = String(href || "");
	if (value.includes("/schema-browser")) return "Schema";
	if (value.includes("/lua-api-explorer")) return "Lua";
	if (value.includes("/pattern-library")) return "Pattern";
	if (value.includes("/template-generators")) return "Generator";
	if (value.includes("/guided-planner")) return "Planner";
	if (value.includes("/workshop-uploader") || value.includes("/modinfo-builder") || value.includes("/civ5mod-ziper")) return "Publish";
	if (value.includes("/dds-converter") || value.includes("/civ-icon-maker") || value.includes("/text-screen-viewer")) return "UI";
	if (value.includes("/religion-support") || value.includes("/map-viewer")) return "Support";
	return "Tool";
}
