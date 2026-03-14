const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const postcss = require("postcss");
const USE_HEAD_SOURCE = process.argv.includes("--from-head");

const COMPONENT_FILES = [
	"src/App.svelte",
	"src/lib/components/Civ5ModZiper.svelte",
	"src/lib/components/CivIconMaker.svelte",
	"src/lib/components/CommunityLinks.svelte",
	"src/lib/components/DdsConverter.svelte",
	"src/lib/components/GuidedPlanner.svelte",
	"src/lib/components/HomePage.svelte",
	"src/lib/components/LuaApiExplorer.svelte",
	"src/lib/components/MapViewer.svelte",
	"src/lib/components/ModInfoBuilder.svelte",
	"src/lib/components/Navbar.svelte",
	"src/lib/components/PatternLibrary.svelte",
	"src/lib/components/SchemaBrowser.svelte",
	"src/lib/components/SnippetExample.svelte",
	"src/lib/components/TemplateGenerators.svelte",
	"src/lib/components/UnitFlagPreviewer.svelte",
	"src/lib/components/WizardExamplePreview.svelte",
	"src/lib/components/WorkshopUploader.svelte",
];

const PROPERTY_GROUPS = [
	["position", ["position", "inset", "inset-block", "inset-inline", "inset-block-start", "inset-block-end", "inset-inline-start", "inset-inline-end", "top", "right", "bottom", "left", "z-index"]],
	[
		"size",
		[
			"inline-size",
			"block-size",
			"min-inline-size",
			"min-block-size",
			"max-inline-size",
			"max-block-size",
			"width",
			"height",
			"min-width",
			"min-height",
			"max-width",
			"max-height",
			"aspect-ratio",
		],
	],
	[
		"display",
		[
			"display",
			"visibility",
			"container",
			"contain",
			"place-content",
			"place-items",
			"place-self",
			"grid",
			"grid-area",
			"grid-template",
			"grid-template-areas",
			"grid-template-columns",
			"grid-template-rows",
			"grid-auto-flow",
			"grid-auto-columns",
			"grid-auto-rows",
			"grid-column",
			"grid-row",
			"flex",
			"flex-flow",
			"flex-direction",
			"flex-wrap",
			"flex-grow",
			"flex-shrink",
			"flex-basis",
			"justify-content",
			"justify-items",
			"justify-self",
			"align-content",
			"align-items",
			"align-self",
			"order",
			"gap",
			"row-gap",
			"column-gap",
		],
	],
	[
		"color",
		["color", "opacity", "fill", "stroke", "text-decoration", "text-decoration-line", "text-decoration-color", "text-decoration-style", "text-underline-offset", "accent-color", "caret-color"],
	],
	[
		"font",
		[
			"font",
			"font-family",
			"font-size",
			"font-style",
			"font-weight",
			"font-variation-settings",
			"font-feature-settings",
			"line-height",
			"letter-spacing",
			"text-align",
			"text-transform",
			"text-wrap",
			"white-space",
		],
	],
	[
		"background",
		[
			"background",
			"background-color",
			"background-image",
			"background-size",
			"background-position",
			"background-repeat",
			"background-origin",
			"background-clip",
			"background-attachment",
			"box-shadow",
			"filter",
			"backdrop-filter",
		],
	],
	[
		"border",
		[
			"border",
			"border-block",
			"border-inline",
			"border-block-start",
			"border-block-end",
			"border-inline-start",
			"border-inline-end",
			"border-width",
			"border-style",
			"border-color",
			"border-radius",
			"outline",
			"outline-offset",
			"object-fit",
		],
	],
	["padding", ["padding", "padding-block", "padding-inline", "padding-block-start", "padding-block-end", "padding-inline-start", "padding-inline-end"]],
	["margin", ["margin", "margin-block", "margin-inline", "margin-block-start", "margin-block-end", "margin-inline-start", "margin-inline-end"]],
	["overflow", ["overflow", "overflow-block", "overflow-inline", "overflow-x", "overflow-y", "overscroll-behavior", "overflow-anchor"]],
	[
		"transition",
		[
			"transition",
			"transition-property",
			"transition-duration",
			"transition-timing-function",
			"transition-delay",
			"transform",
			"transform-origin",
			"animation",
			"animation-name",
			"animation-duration",
			"animation-timing-function",
			"animation-delay",
			"animation-fill-mode",
			"animation-direction",
			"animation-iteration-count",
			"animation-play-state",
			"will-change",
			"cursor",
		],
	],
];

const PROPERTY_INDEX = new Map();
for (const [groupIndex, [, props]] of PROPERTY_GROUPS.entries()) {
	for (const [propIndex, prop] of props.entries()) {
		PROPERTY_INDEX.set(prop, [groupIndex, propIndex]);
	}
}

function splitSelectors(selector) {
	const parts = [];
	let current = "";
	let depth = 0;
	for (const char of selector) {
		if (char === "(" || char === "[") depth += 1;
		if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
		if (char === "," && depth === 0) {
			parts.push(current.trim());
			current = "";
			continue;
		}
		current += char;
	}
	if (current.trim()) parts.push(current.trim());
	return parts;
}

function firstMatch(regex, text) {
	const match = regex.exec(text);
	return match ? match[1] : "";
}

function tokenizeMarkupOrder(source) {
	const styleStart = source.indexOf("<style");
	const markup = styleStart >= 0 ? source.slice(0, styleStart) : source;
	const order = new Map();
	let index = 0;
	const tagRegex = /<([a-zA-Z][\w:-]*)([\s\S]*?)>/g;
	let tagMatch;
	while ((tagMatch = tagRegex.exec(markup))) {
		const tag = tagMatch[1].toLowerCase();
		if (!order.has(tag)) order.set(tag, index++);
		const attrs = tagMatch[2];
		for (const attr of attrs.matchAll(/(?:class|className)=["']([^"']+)["']/g)) {
			for (const className of attr[1].split(/\s+/).filter(Boolean)) {
				if (!order.has(`.${className}`)) order.set(`.${className}`, index++);
			}
		}
		const idValue = firstMatch(/id=["']([^"']+)["']/, attrs);
		if (idValue && !order.has(`#${idValue}`)) order.set(`#${idValue}`, index++);
	}
	return order;
}

function selectorOrder(selector, order) {
	const parts = splitSelectors(selector);
	let best = Number.MAX_SAFE_INTEGER;
	for (const part of parts) {
		for (const token of part.matchAll(/(\.[_a-zA-Z]+[\w-]*|#[_a-zA-Z]+[\w-]*|(^|[\s>+~])([a-zA-Z][\w-]*))/g)) {
			const value = token[1]?.startsWith(".") || token[1]?.startsWith("#") ? token[1] : token[3]?.toLowerCase();
			if (!value) continue;
			const rank = order.get(value);
			if (rank !== undefined) best = Math.min(best, rank);
		}
	}
	return best;
}

function toLogical(prop, value) {
	if (prop === "padding" || prop === "margin" || prop === "border-width" || prop === "border-style" || prop === "border-color") {
		const parts = value.trim().split(/\s+/);
		if (parts.length === 2)
			return [
				[`${prop}-block`, parts[0]],
				[`${prop}-inline`, parts[1]],
			];
		if (parts.length === 3)
			return [
				[`${prop}-block-start`, parts[0]],
				[`${prop}-inline`, parts[1]],
				[`${prop}-block-end`, parts[2]],
			];
	}
	if (prop === "padding" || prop === "margin") {
		const parts = value.trim().split(/\s+/);
		if (parts.length === 4) {
			return [
				[`${prop}-block-start`, parts[0]],
				[`${prop}-inline-end`, parts[1]],
				[`${prop}-block-end`, parts[2]],
				[`${prop}-inline-start`, parts[3]],
			];
		}
	}
	if (prop === "border-radius") {
		const normalized = value.trim();
		if (/^9999?px$/.test(normalized)) {
			return [["border-radius", "999px"]];
		}
	}
	return null;
}

function declSortKey(prop) {
	const exact = PROPERTY_INDEX.get(prop);
	if (exact) return exact;
	for (const [known, position] of PROPERTY_INDEX) {
		if (prop.startsWith(`${known}-`)) return position;
	}
	return [PROPERTY_GROUPS.length, prop];
}

function normalizeDecls(rule) {
	const replacements = [];
	rule.each((node) => {
		if (node.type !== "decl") return;
		const logical = toLogical(node.prop, node.value);
		if (logical && logical.length > 1) {
			replacements.push({ node, logical });
		}
	});
	for (const { node, logical } of replacements) {
		for (const [prop, value] of logical.reverse()) {
			node.cloneBefore({ prop, value });
		}
		node.remove();
	}
	const decls = [];
	const others = [];
	rule.each((node) => {
		if (node.type === "decl") decls.push(node);
		else others.push(node);
	});
	decls.sort((a, b) => {
		const [ag, ap] = declSortKey(a.prop);
		const [bg, bp] = declSortKey(b.prop);
		if (ag !== bg) return ag - bg;
		if (ap !== bp) return String(ap).localeCompare(String(bp));
		return a.prop.localeCompare(b.prop);
	});
	rule.removeAll();
	for (const decl of decls) rule.append(decl);
	for (const node of others) {
		if (node.type === "rule") normalizeRule(node);
		rule.append(node);
	}
}

function normalizeRule(rule) {
	normalizeDecls(rule);
}

function cleanupFile(filePath) {
	const source = fs.readFileSync(filePath, "utf8");
	const styleSource = USE_HEAD_SOURCE ? readHeadFile(filePath) : source;
	const match = styleSource.match(/<style>([\s\S]*?)<\/style>/);
	const currentMatch = source.match(/<style>([\s\S]*?)<\/style>/);
	if (!match) return false;
	const css = match[1];
	const order = tokenizeMarkupOrder(source);
	const root = postcss.parse(css, { from: filePath });
	for (const node of root.nodes) {
		if (node.type === "rule") normalizeRule(node);
	}
	root.nodes.sort((a, b) => {
		if (a.type !== "rule" && b.type !== "rule") return 0;
		if (a.type !== "rule") return 1;
		if (b.type !== "rule") return -1;
		const aOrder = selectorOrder(a.selector, order);
		const bOrder = selectorOrder(b.selector, order);
		if (aOrder !== bOrder) return aOrder - bOrder;
		return a.selector.localeCompare(b.selector);
	});
	const formatted = root
		.toString()
		.replace(/^\s*\n/, "")
		.trimEnd();
	const updated = source.replace(currentMatch[0], `<style>\n${formatted}\n</style>`);
	if (updated !== source) {
		fs.writeFileSync(filePath, updated);
		return true;
	}
	return false;
}

let changed = 0;
for (const file of COMPONENT_FILES) {
	const absolute = path.resolve(file);
	if (cleanupFile(absolute)) {
		changed += 1;
		console.log(`updated ${file}`);
	}
}
console.log(`changed ${changed} files`);

function readHeadFile(filePath) {
	try {
		return execFileSync("git", ["show", `HEAD:${path.relative(process.cwd(), filePath)}`], { encoding: "utf8" });
	} catch {
		return fs.readFileSync(filePath, "utf8");
	}
}
