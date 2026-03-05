<script lang="ts">
	interface ModReferenceRow {
		id: string;
		minversion: string;
		maxversion: string;
		title: string;
	}

	interface DependencyRow {
		type: "Dlc" | "Mod";
		id: string;
		minversion: string;
		maxversion: string;
		title: string;
	}

	interface ModinfoFileRow {
		relativePath: string;
		md5: string;
		import: boolean;
	}

	interface ModinfoActionRow {
		event: string;
		action: string;
		file: string;
	}

	interface ModinfoEntryPointRow {
		type: string;
		file: string;
		name: string;
		description: string;
	}

	type LogLevel = "info" | "warn" | "error";

	interface SteamActionResult<T = unknown> {
		ok: boolean;
		code?: string;
		message: string;
		data?: T;
	}

	interface ModPropertiesState {
		name: string;
		stability: string;
		teaser: string;
		description: string;
		authors: string;
		hideSetupGame: string;
		affectsSavedGames: string;
		minCompatibleSaveVersion: string;
		supportsSinglePlayer: boolean;
		supportsMultiplayer: boolean;
		supportsHotSeat: boolean;
		supportsMac: boolean;
		reloadAudioSystem: boolean;
		reloadLandmarkSystem: boolean;
		reloadStrategicViewSystem: boolean;
		reloadUnitSystem: boolean;
	}

	interface LoadModinfoResultData {
		modinfoFilePath: string;
		modId: string;
		version: string;
		properties: ModPropertiesState;
		files: ModinfoFileRow[];
		actions: ModinfoActionRow[];
		entryPoints: ModinfoEntryPointRow[];
		dependencies: DependencyRow[];
		references: ModReferenceRow[];
	}

	interface SaveModinfoInput {
		outputFilePath: string;
		xml: string;
	}

	const DEFAULT_PROPERTIES: ModPropertiesState = {
		name: "",
		stability: "Alpha",
		teaser: "",
		description: "",
		authors: "",
		hideSetupGame: "0",
		affectsSavedGames: "1",
		minCompatibleSaveVersion: "0",
		supportsSinglePlayer: true,
		supportsMultiplayer: true,
		supportsHotSeat: true,
		supportsMac: true,
		reloadAudioSystem: false,
		reloadLandmarkSystem: false,
		reloadStrategicViewSystem: false,
		reloadUnitSystem: false,
	};

	const ACTION_TYPES = ["UpdateDatabase", "UpdateText", "UpdateArt", "ImportFiles", "PlayAudio"];
	const ENTRYPOINT_TYPES = ["InGameUIAddin", "FrontEndUIAddin"];
	const STABILITY_OPTIONS = ["Experimental", "Alpha", "Beta", "Stable"] as const;
	const CIV5_COLOR_OPTIONS = [
		"COLOR_ADVISOR_HIGHLIGHT_TEXT",
		"COLOR_ALT_HIGHLIGHT_TEXT",
		"COLOR_BLACK",
		"COLOR_BLUE",
		"COLOR_BROWN_TEXT",
		"COLOR_BUILDING_TEXT",
		"COLOR_CITY_BLUE",
		"COLOR_CITY_BROWN",
		"COLOR_CITY_GREEN",
		"COLOR_CITY_GREY",
		"COLOR_CULTURE_STORED",
		"COLOR_CYAN",
		"COLOR_DARK_GREY",
		"COLOR_FONT_GREEN",
		"COLOR_FONT_RED",
		"COLOR_GREAT_PEOPLE_STORED",
		"COLOR_GREEN",
		"COLOR_GREY",
		"COLOR_HIGHLIGHT_TEXT",
		"COLOR_LIGHT_GREY",
		"COLOR_MAGENTA",
		"COLOR_MENU_BLUE",
		"COLOR_NEGATIVE_TEXT",
		"COLOR_POPUP_TEXT",
		"COLOR_POSITIVE_TEXT",
		"COLOR_PROJECT_TEXT",
		"COLOR_RESEARCH_STORED",
		"COLOR_SELECTED_TEXT",
		"COLOR_TECH_TEXT",
		"COLOR_UNIT_TEXT",
		"COLOR_WARNING_TEXT",
		"COLOR_WATER_TEXT",
		"COLOR_WHITE",
		"COLOR_XP_BLUE",
		"COLOR_YELLOW",
		"COLOR_YIELD_FOOD",
		"COLOR_YIELD_GOLD",
		"COLOR_YIELD_PRODUCTION",
	] as const;
	const CIV5_COLOR_HEX: Record<(typeof CIV5_COLOR_OPTIONS)[number], string> = {
		COLOR_ADVISOR_HIGHLIGHT_TEXT: "#ece93a",
		COLOR_ALT_HIGHLIGHT_TEXT: "#66f23e",
		COLOR_BLACK: "#000000",
		COLOR_BLUE: "#1717d9",
		COLOR_BROWN_TEXT: "#7a4a33",
		COLOR_BUILDING_TEXT: "#d6d6d6",
		COLOR_CITY_BLUE: "#1f77c8",
		COLOR_CITY_BROWN: "#bf7d1d",
		COLOR_CITY_GREEN: "#1f8a63",
		COLOR_CITY_GREY: "#6d5252",
		COLOR_CULTURE_STORED: "#9a20d8",
		COLOR_CYAN: "#20d9d9",
		COLOR_DARK_GREY: "#4e4e4e",
		COLOR_FONT_GREEN: "#18e63b",
		COLOR_FONT_RED: "#ff4a3a",
		COLOR_GREAT_PEOPLE_STORED: "#f2ea34",
		COLOR_GREEN: "#15f333",
		COLOR_GREY: "#8d8d8d",
		COLOR_HIGHLIGHT_TEXT: "#59d4df",
		COLOR_LIGHT_GREY: "#b8b8b8",
		COLOR_MAGENTA: "#e11adb",
		COLOR_MENU_BLUE: "#16bfd4",
		COLOR_NEGATIVE_TEXT: "#ff5252",
		COLOR_POPUP_TEXT: "#ffffff",
		COLOR_POSITIVE_TEXT: "#66ed36",
		COLOR_PROJECT_TEXT: "#c5c9d7",
		COLOR_RESEARCH_STORED: "#1fd5df",
		COLOR_SELECTED_TEXT: "#f2d08d",
		COLOR_TECH_TEXT: "#62e23a",
		COLOR_UNIT_TEXT: "#e9ef33",
		COLOR_WARNING_TEXT: "#ff5a4f",
		COLOR_WATER_TEXT: "#8b9de0",
		COLOR_WHITE: "#ffffff",
		COLOR_XP_BLUE: "#1f6ed9",
		COLOR_YELLOW: "#f0ea2f",
		COLOR_YIELD_FOOD: "#f39234",
		COLOR_YIELD_GOLD: "#efd93c",
		COLOR_YIELD_PRODUCTION: "#6b8dbd",
	};
	const COMMON_REFERENCE_PRESETS: ModReferenceRow[] = [
		{ id: "d1b6328c-ff44-4b0d-aad7-c657f83610cd", minversion: "72", maxversion: "999", title: "Various Mod Components" },
		{ id: "d1b6328c-ff44-4b0d-aad7-c657f83610cd", minversion: "0", maxversion: "999", title: "Community Patch" },
		{ id: "8411a7a8-dad3-4622-a18e-fcc18324c799", minversion: "0", maxversion: "999", title: "Community Balance Patch" },
		{ id: "36e88483-48fe-4545-b85f-bafc50dde315", minversion: "0", maxversion: "999", title: "Yet (not) Another Earth Map Pack" },
		{ id: "ce8aa614-7ef7-4a45-a179-5329869e8d6d", minversion: "0", maxversion: "999", title: "Enlightenment Era" },
		{ id: "d9ece224-6cd8-4519-a27a-c417b59cdf35", minversion: "0", maxversion: "999", title: "Future Worlds" },
		{ id: "31a31d1c-b9d7-45e1-842c-23232d66cd47", minversion: "0", maxversion: "999", title: "JFD's Cultural Diversity" },
		{ id: "01c131ef-2162-4a7b-b845-763a4e675940", minversion: "0", maxversion: "999", title: "Unique Cultural Influence" },
		{ id: "6010e6f6-918e-48b8-9332-d60783bd8fb5", minversion: "0", maxversion: "999", title: "Historical Religions Complete" },
		{ id: "670d093a-783f-4bfd-b3c5-6b57e331940c", minversion: "72", maxversion: "999", title: "Backup Religion Choices" },
		{ id: "1f941088-b185-4159-865c-472df81247b2", minversion: "0", maxversion: "999", title: "Sukritact's Events & Decisions" },
		{ id: "eea66053-7579-481a-bb8d-2f3959b59974", minversion: "0", maxversion: "999", title: "JFD’s Rise to Power" },
		{ id: "a19351c5-c0b3-4b07-8695-4affaa199949", minversion: "0", maxversion: "999", title: "JFD and Pouakai's Mercenaries" },
		{ id: "10e9728f-d61c-4317-be4f-7d52d6bae6f4", minversion: "0", maxversion: "999", title: "JFD’s Cities in Development" },
		{ id: "e576894a-ed2b-4033-be14-ed1c8ceb81d3", minversion: "0", maxversion: "999", title: "Map Labels" },
		{ id: "7fdd72a5-d4ae-441c-bc4e-2e3d2a26cff4", minversion: "0", maxversion: "999", title: "Ethnic Units" },
		{ id: "8670da15-d435-44ea-9758-7438cb321411", minversion: "0", maxversion: "999", title: "R.E.D. Modpack" },
		{ id: "432bc547-eb05-4189-9e46-232dbde8f09f", minversion: "0", maxversion: "999", title: "Additional Achievements" },
		{ id: "1153b26a-69fd-4cd5-899c-a8ba8e0e5e5d", minversion: "0", maxversion: "999", title: "Civ IV Leader Traits in Civ V" },
	];
	const COMMON_DEPENDENCY_PRESETS: DependencyRow[] = [
		{ type: "Mod", id: "d1b6328c-ff44-4b0d-aad7-c657f83610cd", minversion: "0", maxversion: "999", title: "Various Mod Components" },
		{ type: "Mod", id: "d1b6328c-ff44-4b0d-aad7-c657f83610cd", minversion: "0", maxversion: "999", title: "Community Patch" },
		{ type: "Mod", id: "aec5d10d-f00f-4fc7-b330-c3a1e86c91c3", minversion: "0", maxversion: "999", title: "InfoAddict" },
		{ type: "Dlc", id: "6DA07636-4123-4018-B643-6575B4EC336B", minversion: "0", maxversion: "999", title: "Gods and Kings" },
		{ type: "Dlc", id: "0E3751A1-F840-4e1b-9706-519BF484E59D", minversion: "0", maxversion: "999", title: "Brave New World" },
	];

	interface Props {
		onNotify?: (result: SteamActionResult<unknown>) => void;
		onLog?: (entry: { level: LogLevel; message: string; context?: Record<string, unknown> }) => void;
		onWorking?: (working: boolean) => void;
	}

	let { onNotify = () => {}, onLog = () => {}, onWorking = () => {} }: Props = $props();

	const api = typeof window !== "undefined" ? (window as Window & { workshopUploader?: any }).workshopUploader : undefined;

	let sourceDirectoryPath = $state("");
	let outputFilePath = $state("");
	let sourceDirectoryInputEl = $state<HTMLInputElement | null>(null);
	let importModinfoInputEl = $state<HTMLInputElement | null>(null);
	let selectedSourceFiles = $state<File[]>([]);
	let modId = $state(generateUuid());
	let version = $state("1");
	let properties = $state<ModPropertiesState>({ ...DEFAULT_PROPERTIES });
	let selectedColorTag = $state<(typeof CIV5_COLOR_OPTIONS)[number]>("COLOR_YIELD_FOOD");
	let teaserInputEl = $state<HTMLInputElement | null>(null);
	let descriptionTextareaEl = $state<HTMLTextAreaElement | null>(null);

	let files = $state<ModinfoFileRow[]>([]);
	let actions = $state<ModinfoActionRow[]>([]);
	let entryPoints = $state<ModinfoEntryPointRow[]>([]);
	let dependencies = $state<DependencyRow[]>([]);
	let references = $state<ModReferenceRow[]>([]);

	let localBusy = $state(false);
	let copyStatus = $state("");
	let requiredIssues = $derived(buildRequiredIssues());
	let canSave = $derived(!localBusy && requiredIssues.length === 0);
	let disableReason = $derived(localBusy ? "An operation is already running." : requiredIssues.join(" "));
	let modinfoXml = $derived(buildModinfoXml());
	let canScanSource = $derived(Boolean(api ? sourceDirectoryPath.trim() : selectedSourceFiles.length));

	function boolTo01(value: boolean): string {
		return value ? "1" : "0";
	}

	function generateUuid(): string {
		if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
			return crypto.randomUUID();
		}
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
			const r = Math.floor(Math.random() * 16);
			const v = ch === "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	function isValidUuid(value: string): boolean {
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
	}

	function escapeXml(value: string): string {
		return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
	}

	function xmlLine(level: number, text: string): string {
		return `${"\t".repeat(level)}${text}`;
	}

	function nonEmpty(value: string): boolean {
		return value.trim().length > 0;
	}

	function buildRequiredIssues(): string[] {
		const issues: string[] = [];
		if (!isValidUuid(modId)) {
			issues.push("Provide a valid Mod ID UUID.");
		}
		if (!nonEmpty(properties.name)) {
			issues.push("Name is required.");
		}
		if (!nonEmpty(outputFilePath)) {
			issues.push("Output .modinfo path is required.");
		}
		if (filteredFiles().length === 0) {
			issues.push("Scan a source directory or add at least one file.");
		}
		return issues;
	}

	function addEmptyFile(): void {
		files = [...files, { relativePath: "", md5: "", import: false }];
	}

	function normalizeImportFlag(value: unknown): boolean {
		if (value === true || value === 1) {
			return true;
		}
		if (value === false || value === 0 || value == null) {
			return false;
		}
		const normalized = String(value).trim().toLowerCase();
		return normalized === "1" || normalized === "true" || normalized === "yes";
	}

	function normalizeFileRows(rows: ModinfoFileRow[]): ModinfoFileRow[] {
		return (rows || []).map((row) => ({
			relativePath: String(row?.relativePath || ""),
			md5: String(row?.md5 || ""),
			import: normalizeImportFlag((row as unknown as { import?: unknown })?.import),
		}));
	}

	function normalizeRelativeFilePath(value: string): string {
		return String(value || "")
			.replace(/\\/g, "/")
			.trim()
			.toLowerCase();
	}

	function shouldImportFileByPath(path: string): boolean {
		const normalized = normalizeRelativeFilePath(path);
		if (!normalized) {
			return false;
		}
		if (normalized.endsWith(".sql")) {
			return false;
		}
		if (normalized.endsWith(".lua")) {
			return true;
		}

		const importExtensions = [".dds", ".tga", ".png", ".jpg", ".jpeg", ".gr2", ".fxsxml", ".ogg", ".wav", ".mp3", ".bnk"];
		if (importExtensions.some((ext) => normalized.endsWith(ext))) {
			return true;
		}

		const importFolders = ["/lua/", "/ui/", "/art/", "/audio/", "/icons/", "/textures/", "/models/"];
		if (importFolders.some((folder) => normalized.includes(folder))) {
			return true;
		}

		return false;
	}

	function applyAutoImportHints(fileRows: ModinfoFileRow[], actionRows: ModinfoActionRow[], entryPointRows: ModinfoEntryPointRow[]): ModinfoFileRow[] {
		const importByAction = new Set(
			(actionRows || [])
				.filter((row) => {
					const action = String(row?.action || "").trim().toLowerCase();
					return action === "importfiles" || action === "playaudio";
				})
				.map((row) => normalizeRelativeFilePath(row.file)),
		);
		const importByEntryPoint = new Set((entryPointRows || []).map((row) => normalizeRelativeFilePath(row.file)));

		return (fileRows || []).map((file) => {
			const normalizedPath = normalizeRelativeFilePath(file.relativePath);
			const inferred = importByAction.has(normalizedPath) || importByEntryPoint.has(normalizedPath) || shouldImportFileByPath(normalizedPath);
			return {
				...file,
				import: Boolean(normalizeImportFlag(file.import) || inferred),
			};
		});
	}

	function removeFile(index: number): void {
		files = files.filter((_, i) => i !== index);
	}

	function addAction(): void {
		actions = [...actions, { event: "OnModActivated", action: "UpdateDatabase", file: "" }];
	}

	function removeAction(index: number): void {
		actions = actions.filter((_, i) => i !== index);
	}

	function addEntryPoint(): void {
		entryPoints = [...entryPoints, { type: "InGameUIAddin", file: "", name: "", description: "" }];
	}

	function removeEntryPoint(index: number): void {
		entryPoints = entryPoints.filter((_, i) => i !== index);
	}

	function addDependency(type: "Dlc" | "Mod" = "Dlc"): void {
		dependencies = [...dependencies, { type, id: "", minversion: "0", maxversion: "999", title: "" }];
	}

	function removeDependency(index: number): void {
		dependencies = dependencies.filter((_, i) => i !== index);
	}

	function addReference(): void {
		references = [...references, { id: "", minversion: "0", maxversion: "999", title: "" }];
	}

	function removeReference(index: number): void {
		references = references.filter((_, i) => i !== index);
	}

	function addDependencyPreset(preset: DependencyRow): void {
		const exists = dependencies.some(
			(row) =>
				row.type === preset.type &&
				row.id === preset.id &&
				(row.minversion || "0") === (preset.minversion || "0") &&
				(row.maxversion || "999") === (preset.maxversion || "999") &&
				(row.title || "") === (preset.title || ""),
		);
		if (exists) {
			return;
		}
		dependencies = [...dependencies, { ...preset }];
	}

	function addReferencePreset(preset: ModReferenceRow): void {
		const exists = references.some(
			(row) =>
				row.id === preset.id &&
				(row.minversion || "0") === (preset.minversion || "0") &&
				(row.maxversion || "999") === (preset.maxversion || "999") &&
				(row.title || "") === (preset.title || ""),
		);
		if (exists) {
			return;
		}
		references = [...references, { ...preset }];
	}

	function filteredFiles(): ModinfoFileRow[] {
		return files.filter((file) => nonEmpty(file.relativePath) && nonEmpty(file.md5));
	}

	function setTextFieldValue(target: "teaser" | "description", value: string): void {
		if (target === "teaser") {
			properties.teaser = value;
			return;
		}
		properties.description = value;
	}

	function getTextFieldValue(target: "teaser" | "description"): string {
		return target === "teaser" ? properties.teaser : properties.description;
	}

	function getTextFieldElement(target: "teaser" | "description"): HTMLInputElement | HTMLTextAreaElement | null {
		return target === "teaser" ? teaserInputEl : descriptionTextareaEl;
	}

	function getColorHex(colorTag: (typeof CIV5_COLOR_OPTIONS)[number]): string {
		return CIV5_COLOR_HEX[colorTag] ?? "#cccccc";
	}

	function wrapSelectionWithColor(target: "teaser" | "description", colorTag: string): void {
		const element = getTextFieldElement(target);
		const source = getTextFieldValue(target);
		const openTag = `[${colorTag}]`;
		const closeTag = "[ENDCOLOR]";
		if (!element) {
			setTextFieldValue(target, `${source}${openTag}${closeTag}`);
			return;
		}

		const start = element.selectionStart ?? source.length;
		const end = element.selectionEnd ?? source.length;
		const before = source.slice(0, start);
		const selectedText = source.slice(start, end);
		const after = source.slice(end);
		const nextValue = `${before}${openTag}${selectedText}${closeTag}${after}`;
		setTextFieldValue(target, nextValue);

		queueMicrotask(() => {
			const active = getTextFieldElement(target);
			if (!active) {
				return;
			}
			const selectionStart = before.length + openTag.length;
			const selectionEnd = selectionStart + selectedText.length;
			active.focus();
			active.setSelectionRange(selectionStart, selectionEnd);
		});
	}

	function buildModinfoXml(): string {
		const lines: string[] = [];
		lines.push('<?xml version="1.0" encoding="utf-8"?>');
		lines.push(xmlLine(0, `<Mod id="${escapeXml(modId.trim())}" version="${escapeXml(version.trim() || "1")}">`));
		lines.push(xmlLine(1, "<Properties>"));
		lines.push(xmlLine(2, `<Name>${escapeXml(properties.name.trim())}</Name>`));
		lines.push(xmlLine(2, `<Stability>${escapeXml(properties.stability.trim() || "Alpha")}</Stability>`));
		lines.push(xmlLine(2, `<Teaser>${escapeXml(properties.teaser)}</Teaser>`));
		lines.push(xmlLine(2, `<Description>${escapeXml(properties.description)}</Description>`));
		lines.push(xmlLine(2, `<Authors>${escapeXml(properties.authors)}</Authors>`));
		lines.push(xmlLine(2, `<HideSetupGame>${escapeXml(properties.hideSetupGame.trim() || "0")}</HideSetupGame>`));
		lines.push(xmlLine(2, `<AffectsSavedGames>${escapeXml(properties.affectsSavedGames.trim() || "1")}</AffectsSavedGames>`));
		lines.push(xmlLine(2, `<MinCompatibleSaveVersion>${escapeXml(properties.minCompatibleSaveVersion.trim() || "0")}</MinCompatibleSaveVersion>`));
		lines.push(xmlLine(2, `<SupportsSinglePlayer>${boolTo01(properties.supportsSinglePlayer)}</SupportsSinglePlayer>`));
		lines.push(xmlLine(2, `<SupportsMultiplayer>${boolTo01(properties.supportsMultiplayer)}</SupportsMultiplayer>`));
		lines.push(xmlLine(2, `<SupportsHotSeat>${boolTo01(properties.supportsHotSeat)}</SupportsHotSeat>`));
		lines.push(xmlLine(2, `<SupportsMac>${boolTo01(properties.supportsMac)}</SupportsMac>`));
		lines.push(xmlLine(2, `<ReloadAudioSystem>${boolTo01(properties.reloadAudioSystem)}</ReloadAudioSystem>`));
		lines.push(xmlLine(2, `<ReloadLandmarkSystem>${boolTo01(properties.reloadLandmarkSystem)}</ReloadLandmarkSystem>`));
		lines.push(xmlLine(2, `<ReloadStrategicViewSystem>${boolTo01(properties.reloadStrategicViewSystem)}</ReloadStrategicViewSystem>`));
		lines.push(xmlLine(2, `<ReloadUnitSystem>${boolTo01(properties.reloadUnitSystem)}</ReloadUnitSystem>`));
		lines.push(xmlLine(1, "</Properties>"));

		const validDependencies = dependencies.filter((row) => nonEmpty(row.id));
		if (validDependencies.length === 0) {
			lines.push(xmlLine(1, "<Dependencies />"));
		} else {
			lines.push(xmlLine(1, "<Dependencies>"));
			for (const dep of validDependencies) {
				if (dep.type === "Mod") {
					lines.push(
						xmlLine(
							2,
							`<Mod id="${escapeXml(dep.id.trim())}" minversion="${escapeXml(dep.minversion.trim() || "0")}" maxversion="${escapeXml(dep.maxversion.trim() || "999")}" title="${escapeXml(dep.title?.trim() || "")}" />`,
						),
					);
					continue;
				}
				lines.push(
					xmlLine(
						2,
						`<Dlc id="${escapeXml(dep.id.trim())}" minversion="${escapeXml(dep.minversion.trim() || "0")}" maxversion="${escapeXml(dep.maxversion.trim() || "999")}" />`,
					),
				);
			}
			lines.push(xmlLine(1, "</Dependencies>"));
		}

		const validRefs = references.filter((row) => nonEmpty(row.id));
		if (validRefs.length === 0) {
			lines.push(xmlLine(1, "<References />"));
		} else {
			lines.push(xmlLine(1, "<References>"));
			for (const row of validRefs) {
				lines.push(
					xmlLine(
						2,
						`<Mod id="${escapeXml(row.id.trim())}" minversion="${escapeXml(row.minversion.trim() || "0")}" maxversion="${escapeXml(row.maxversion.trim() || "999")}" title="${escapeXml(row.title)}" />`,
					),
				);
			}
			lines.push(xmlLine(1, "</References>"));
		}

		lines.push(xmlLine(1, "<Blocks />"));

		const validFiles = filteredFiles();
		lines.push(xmlLine(1, "<Files>"));
		for (const file of validFiles) {
			lines.push(xmlLine(2, `<File md5="${escapeXml(file.md5.trim())}" import="${normalizeImportFlag(file.import) ? "1" : "0"}">${escapeXml(file.relativePath.trim())}</File>`));
		}
		lines.push(xmlLine(1, "</Files>"));

		const validActions = actions.filter((row) => nonEmpty(row.file));
		if (validActions.length === 0) {
			lines.push(xmlLine(1, "<Actions />"));
		} else {
			const grouped = new Map<string, ModinfoActionRow[]>();
			for (const row of validActions) {
				const event = row.event.trim() || "OnModActivated";
				const entries = grouped.get(event) ?? [];
				entries.push(row);
				grouped.set(event, entries);
			}
			lines.push(xmlLine(1, "<Actions>"));
			for (const [event, rows] of grouped.entries()) {
				lines.push(xmlLine(2, `<${escapeXml(event)}>`));
				for (const row of rows) {
					const action = row.action.trim() || "UpdateDatabase";
					lines.push(xmlLine(3, `<${escapeXml(action)}>${escapeXml(row.file.trim())}</${escapeXml(action)}>`));
				}
				lines.push(xmlLine(2, `</${escapeXml(event)}>`));
			}
			lines.push(xmlLine(1, "</Actions>"));
		}

		const validEntryPoints = entryPoints.filter((row) => nonEmpty(row.file));
		if (validEntryPoints.length === 0) {
			lines.push(xmlLine(1, "<EntryPoints />"));
		} else {
			lines.push(xmlLine(1, "<EntryPoints>"));
			for (const row of validEntryPoints) {
				lines.push(xmlLine(2, `<EntryPoint type="${escapeXml(row.type.trim() || "InGameUIAddin")}" file="${escapeXml(row.file.trim())}">`));
				lines.push(xmlLine(3, `<Name>${escapeXml(row.name.trim() || row.file.trim())}</Name>`));
				lines.push(xmlLine(3, `<Description>${escapeXml(row.description)}</Description>`));
				lines.push(xmlLine(2, "</EntryPoint>"));
			}
			lines.push(xmlLine(1, "</EntryPoints>"));
		}

		lines.push(xmlLine(0, "</Mod>"));
		return `${lines.join("\n")}\n`;
	}

	async function chooseSourceDirectory(): Promise<void> {
		if (localBusy) {
			return;
		}
		if (!api) {
			sourceDirectoryInputEl?.click();
			return;
		}
		const pathValue = await api.pickDirectoryPath("Select mod source directory");
		if (pathValue) {
			sourceDirectoryPath = pathValue;
			await scanSourceDirectory();
		}
	}

	async function chooseOutputPath(): Promise<void> {
		if (!api || localBusy) {
			return;
		}
		const pathValue = await api.pickModinfoSavePath();
		if (pathValue) {
			outputFilePath = pathValue;
		}
	}

	function applyImportedModinfo(data: LoadModinfoResultData): void {
		const importedDependencies = Array.isArray((data as { dependencies?: DependencyRow[] }).dependencies)
			? (data as { dependencies: DependencyRow[] }).dependencies
			: Array.isArray((data as { dlcDependencies?: Array<{ id: string; minversion: string; maxversion: string }> }).dlcDependencies)
				? (data as { dlcDependencies: Array<{ id: string; minversion: string; maxversion: string }> }).dlcDependencies.map((row) => ({
						type: "Dlc" as const,
						id: row.id,
						minversion: row.minversion,
						maxversion: row.maxversion,
						title: "",
					}))
				: [];
		sourceDirectoryPath = "";
		selectedSourceFiles = [];
		outputFilePath = data.modinfoFilePath;
		modId = data.modId || generateUuid();
		version = data.version || "1";
		properties = { ...data.properties };
		files = normalizeFileRows(data.files);
		actions = [...data.actions];
		entryPoints = [...data.entryPoints];
		dependencies = [...importedDependencies];
		references = [...data.references];
	}

	async function importExistingModinfo(): Promise<void> {
		if (localBusy) {
			return;
		}
		if (!api) {
			importModinfoInputEl?.click();
			return;
		}
		const selectedPath = await api.pickModinfoOpenPath();
		if (!selectedPath) {
			return;
		}

		localBusy = true;
		onWorking(true);
		try {
			const result = await api.loadModinfoFile({ modinfoFilePath: selectedPath });
			if (!result.ok || !result.data) {
				onNotify(result as SteamActionResult<unknown>);
				return;
			}
			applyImportedModinfo(result.data);
			onNotify({
				ok: true,
				message: "Imported .modinfo successfully.",
				data: {
					modinfoFilePath: result.data.modinfoFilePath,
					fileCount: result.data.files.length,
				},
			});
			onLog({
				level: "info",
				message: ".modinfo imported into builder.",
				context: {
					modinfoFilePath: result.data.modinfoFilePath,
					fileCount: result.data.files.length,
					actionCount: result.data.actions.length,
					entryPointCount: result.data.entryPoints.length,
				},
			});
		} finally {
			localBusy = false;
			onWorking(false);
		}
	}

	async function scanSourceDirectory(): Promise<void> {
		if (localBusy) {
			return;
		}
		if (api && !nonEmpty(sourceDirectoryPath)) {
			onNotify({
				ok: false,
				code: "VALIDATION",
				message: "Source directory is required before scanning.",
			});
			return;
		}
		if (!api && selectedSourceFiles.length === 0) {
			onNotify({
				ok: false,
				code: "VALIDATION",
				message: "Choose a source folder first.",
			});
			return;
		}

		localBusy = true;
		onWorking(true);
		try {
			if (!api) {
				const scannedFiles = await Promise.all(
					selectedSourceFiles.map(async (file) => {
						const md5 = await md5HexBytes(file);
						const relativePath = normalizeRelativePath(file.webkitRelativePath || file.name);
						const importByLeaderScene = await shouldImportLeaderSceneXml(file);
						return {
							relativePath,
							md5,
							import: importByLeaderScene,
						};
					}),
				);
				files = scannedFiles.filter((entry) => Boolean(entry.relativePath));
				actions = suggestActionsFromFiles(files);
				entryPoints = suggestEntryPointsFromFiles(files);
				files = applyAutoImportHints(files, actions, entryPoints);
				if (!nonEmpty(properties.name)) {
					properties.name = suggestNameFromWebFiles(selectedSourceFiles);
				}
				if (!nonEmpty(outputFilePath)) {
					outputFilePath = `${properties.name || "mod"}.modinfo`;
				}
				onNotify({
					ok: true,
					message: `Scanned ${files.length} file(s) in browser mode.`,
				});
				return;
			}

			const result = await api.scanModSourceDirectory({ sourceDirectoryPath });
			if (!result.ok || !result.data) {
				onNotify(result as SteamActionResult<unknown>);
				return;
			}

			sourceDirectoryPath = result.data.sourceDirectoryPath;
			files = normalizeFileRows(result.data.files);
			actions = result.data.suggestedActions;
			entryPoints = result.data.suggestedEntryPoints;
			files = applyAutoImportHints(files, actions, entryPoints);
			if (!nonEmpty(properties.name)) {
				properties.name = result.data.suggestedName;
			}
			if (!nonEmpty(outputFilePath)) {
				outputFilePath = `${sourceDirectoryPath}/${result.data.suggestedName}.modinfo`;
			}

			onNotify({
				ok: true,
				message: `Scanned ${result.data.files.length} file(s) and generated auto suggestions.`,
			});
			onLog({
				level: "info",
				message: "Mod source scan completed.",
				context: {
					sourceDirectoryPath: result.data.sourceDirectoryPath,
					fileCount: result.data.files.length,
					actionSuggestions: result.data.suggestedActions.length,
					entryPointSuggestions: result.data.suggestedEntryPoints.length,
				},
			});
			console.log("[ModInfo Builder] scanModSourceDirectory", result.data);
		} finally {
			localBusy = false;
			onWorking(false);
		}
	}

	async function saveModinfo(): Promise<void> {
		if (localBusy || !canSave) {
			return;
		}
		if (!api) {
			const rawPath = outputFilePath.trim();
			const fileName = sanitizeOutputFileName(rawPath.split(/[\\/]/).pop() || rawPath || "mod.modinfo");
			const blob = new Blob([modinfoXml], { type: "application/xml;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = fileName;
			anchor.click();
			URL.revokeObjectURL(url);
			onNotify({
				ok: true,
				message: "Downloaded .modinfo in browser mode.",
				data: { outputFilePath: fileName },
			});
			return;
		}
		localBusy = true;
		onWorking(true);
		try {
			const payload: SaveModinfoInput = {
				outputFilePath: outputFilePath.trim(),
				xml: modinfoXml,
			};
			const result = await api.saveModinfoFile(payload);
			if (!result.ok || !result.data) {
				onNotify(result as SteamActionResult<unknown>);
				return;
			}
			onNotify({
				ok: true,
				message: `Saved .modinfo successfully (${result.data.sizeBytes} bytes).`,
				data: {
					outputFilePath: result.data.outputFilePath,
				},
			});
			onLog({
				level: "info",
				message: ".modinfo file saved successfully.",
				context: {
					outputFilePath: result.data.outputFilePath,
					sizeBytes: result.data.sizeBytes,
				},
			});
		} finally {
			localBusy = false;
			onWorking(false);
		}
	}

	async function copyXml(): Promise<void> {
		try {
			await navigator.clipboard.writeText(modinfoXml);
			copyStatus = "Copied XML.";
			setTimeout(() => {
				copyStatus = "";
			}, 1400);
		} catch {
			copyStatus = "Copy failed.";
			setTimeout(() => {
				copyStatus = "";
			}, 1400);
		}
	}

	function sanitizeOutputFileName(value: string): string {
		const trimmed = String(value || "").trim();
		const safe = trimmed || "mod.modinfo";
		return safe.toLowerCase().endsWith(".modinfo") ? safe : `${safe}.modinfo`;
	}

	async function onSourceDirectoryInputChange(event: Event): Promise<void> {
		const target = event.currentTarget as HTMLInputElement;
		selectedSourceFiles = Array.from(target.files || []);
		const folderName = suggestNameFromWebFiles(selectedSourceFiles);
		sourceDirectoryPath = folderName;
		if (!nonEmpty(outputFilePath) && folderName) {
			outputFilePath = `${folderName}.modinfo`;
		}
	}

	async function onImportModinfoInputChange(event: Event): Promise<void> {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) {
			return;
		}
		const xml = await file.text();
		const parsed = parseImportedModinfoXml(xml, file.name);
		applyImportedModinfo(parsed);
		onNotify({
			ok: true,
			message: "Imported .modinfo successfully.",
			data: {
				modinfoFilePath: parsed.modinfoFilePath,
				fileCount: parsed.files.length,
			},
		});
	}

	function normalizeRelativePath(value: string): string {
		const normalized = String(value || "").replace(/\\/g, "/").trim();
		if (!normalized) {
			return "";
		}
		const parts = normalized.split("/").filter(Boolean);
		return parts.length > 1 ? parts.slice(1).join("/") : parts[0] || "";
	}

	async function shouldImportLeaderSceneXml(file: File): Promise<boolean> {
		const fileName = String(file?.name || "").toLowerCase();
		if (!fileName.endsWith(".xml")) {
			return false;
		}

		const header = await file.slice(0, 4096).text();
		const normalized = header.replace(/^\uFEFF/, "").trimStart().replace(/^<\?xml[^>]*>\s*/i, "");
		return /^<LeaderScene\s+FallbackImage=/.test(normalized);
	}

	async function md5HexBytes(file: File): Promise<string> {
		const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
		const toHex = (value: number) => value.toString(16).padStart(2, "0");
		const rotateLeft = (value: number, shift: number) => ((value << shift) | (value >>> (32 - shift))) >>> 0;
		const add32 = (a: number, b: number) => (a + b) >>> 0;
		const s = [
			7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
			15, 21, 6, 10, 15, 21,
		];
		const k = new Array(64).fill(0).map((_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);
		const originalBitLen = bytes.length * 8;
		bytes.push(0x80);
		while (bytes.length % 64 !== 56) {
			bytes.push(0);
		}
		for (let i = 0; i < 8; i += 1) {
			bytes.push((originalBitLen >>> (8 * i)) & 0xff);
		}
		let a0 = 0x67452301;
		let b0 = 0xefcdab89;
		let c0 = 0x98badcfe;
		let d0 = 0x10325476;
		for (let offset = 0; offset < bytes.length; offset += 64) {
			const m = new Array(16).fill(0);
			for (let i = 0; i < 16; i += 1) {
				const start = offset + i * 4;
				m[i] = bytes[start] | (bytes[start + 1] << 8) | (bytes[start + 2] << 16) | (bytes[start + 3] << 24);
			}
			let a = a0;
			let b = b0;
			let c = c0;
			let d = d0;
			for (let i = 0; i < 64; i += 1) {
				let f = 0;
				let g = 0;
				if (i < 16) {
					f = (b & c) | (~b & d);
					g = i;
				} else if (i < 32) {
					f = (d & b) | (~d & c);
					g = (5 * i + 1) % 16;
				} else if (i < 48) {
					f = b ^ c ^ d;
					g = (3 * i + 5) % 16;
				} else {
					f = c ^ (b | ~d);
					g = (7 * i) % 16;
				}
				const temp = d;
				d = c;
				c = b;
				const sum = add32(add32(a, f), add32(k[i], m[g]));
				b = add32(b, rotateLeft(sum, s[i]));
				a = temp;
			}
			a0 = add32(a0, a);
			b0 = add32(b0, b);
			c0 = add32(c0, c);
			d0 = add32(d0, d);
		}
		return [a0, b0, c0, d0]
			.map((value) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff])
			.flat()
			.map(toHex)
			.join("")
			.toUpperCase();
	}

	function suggestNameFromWebFiles(fileList: File[]): string {
		const first = fileList[0];
		if (!first) {
			return "";
		}
		const parts = String(first.webkitRelativePath || first.name || "")
			.replace(/\\/g, "/")
			.split("/")
			.filter(Boolean);
		return (parts[0] || "").trim();
	}

	function suggestActionsFromFiles(rows: ModinfoFileRow[]): ModinfoActionRow[] {
		const next: ModinfoActionRow[] = [];
		for (const row of rows) {
			const file = row.relativePath.toLowerCase();
			if (file.endsWith(".sql")) {
				next.push({ event: "OnModActivated", action: "UpdateDatabase", file: row.relativePath });
			} else if (file.endsWith(".xml") && (file.includes("/text/") || file.includes("language"))) {
				next.push({ event: "OnModActivated", action: "UpdateText", file: row.relativePath });
			}
		}
		return next;
	}

	function suggestEntryPointsFromFiles(rows: ModinfoFileRow[]): ModinfoEntryPointRow[] {
		return rows
			.filter((row) => row.relativePath.toLowerCase().endsWith(".lua"))
			.slice(0, 8)
			.map((row) => ({
				type: "InGameUIAddin",
				file: row.relativePath,
				name: row.relativePath.split("/").pop() || row.relativePath,
				description: "",
			}));
	}

	function parseImportedModinfoXml(xml: string, fileName: string): LoadModinfoResultData {
		const parser = new DOMParser();
		const doc = parser.parseFromString(xml, "application/xml");
		const modNode = doc.querySelector("Mod");
		const readText = (selector: string) => doc.querySelector(selector)?.textContent?.trim() || "";
		const propertiesNode = doc.querySelector("Properties");
		const data: LoadModinfoResultData = {
			modinfoFilePath: fileName || "imported.modinfo",
			modId: modNode?.getAttribute("id") || generateUuid(),
			version: modNode?.getAttribute("version") || "1",
			properties: {
				...DEFAULT_PROPERTIES,
				name: readText("Properties > Name"),
				stability: readText("Properties > Stability") || "Alpha",
				teaser: readText("Properties > Teaser"),
				description: readText("Properties > Description"),
				authors: readText("Properties > Authors"),
				hideSetupGame: readText("Properties > HideSetupGame") || "0",
				affectsSavedGames: readText("Properties > AffectsSavedGames") || "1",
				minCompatibleSaveVersion: readText("Properties > MinCompatibleSaveVersion") || "0",
				supportsSinglePlayer: readText("Properties > SupportsSinglePlayer") !== "0",
				supportsMultiplayer: readText("Properties > SupportsMultiplayer") !== "0",
				supportsHotSeat: readText("Properties > SupportsHotSeat") !== "0",
				supportsMac: readText("Properties > SupportsMac") !== "0",
				reloadAudioSystem: readText("Properties > ReloadAudioSystem") === "1",
				reloadLandmarkSystem: readText("Properties > ReloadLandmarkSystem") === "1",
				reloadStrategicViewSystem: readText("Properties > ReloadStrategicViewSystem") === "1",
				reloadUnitSystem: readText("Properties > ReloadUnitSystem") === "1",
			},
			files: Array.from(doc.querySelectorAll("Files > File")).map((node) => ({
				relativePath: (node.textContent || "").trim(),
				md5: node.getAttribute("md5") || "",
				import: node.getAttribute("import") === "1",
			})),
			actions: [],
			entryPoints: Array.from(doc.querySelectorAll("EntryPoints > EntryPoint")).map((node) => ({
				type: node.getAttribute("type") || "InGameUIAddin",
				file: node.getAttribute("file") || "",
				name: node.querySelector("Name")?.textContent?.trim() || "",
				description: node.querySelector("Description")?.textContent?.trim() || "",
			})),
			dependencies: [
				...Array.from(doc.querySelectorAll("Dependencies > Dlc")).map((node) => ({
					type: "Dlc" as const,
					id: node.getAttribute("id") || "",
					minversion: node.getAttribute("minversion") || "0",
					maxversion: node.getAttribute("maxversion") || "999",
					title: "",
				})),
				...Array.from(doc.querySelectorAll("Dependencies > Mod")).map((node) => ({
					type: "Mod" as const,
					id: node.getAttribute("id") || "",
					minversion: node.getAttribute("minversion") || "0",
					maxversion: node.getAttribute("maxversion") || "999",
					title: node.getAttribute("title") || "",
				})),
			],
			references: Array.from(doc.querySelectorAll("References > Mod")).map((node) => ({
				id: node.getAttribute("id") || "",
				minversion: node.getAttribute("minversion") || "0",
				maxversion: node.getAttribute("maxversion") || "999",
				title: node.getAttribute("title") || "",
			})),
		};
		for (const eventNode of Array.from(doc.querySelectorAll("Actions > *"))) {
			const event = eventNode.nodeName;
			for (const actionNode of Array.from(eventNode.children)) {
				data.actions.push({
					event,
					action: actionNode.nodeName,
					file: (actionNode.textContent || "").trim(),
				});
			}
		}
		if (!propertiesNode) {
			data.properties = { ...DEFAULT_PROPERTIES };
		}
		return data;
	}
</script>

<section class="modinfo-page">
<header class="hero">
		<h1>.modinfo Builder</h1>
		<p>Scan a directory, auto-fill files / actions / entry points, then manually review before saving a <code>.modinfo</code>.</p>
</header>

<section class="card">
	<div class="panel-content">
		<section class="block">
			<div class="row-head">
				<h3>Source Scan</h3>
				<button class="btn secondary small" type="button" disabled={localBusy} onclick={importExistingModinfo}>Import .modinfo</button>
			</div>
			<div class="path-row">
				<input class="input" bind:value={sourceDirectoryPath} placeholder="/path/to/mod/source" />
				<button class="btn secondary small" type="button" disabled={localBusy} onclick={chooseSourceDirectory}>Choose Folder</button>
				<button class="btn small" type="button" disabled={localBusy || !canScanSource} onclick={scanSourceDirectory}>
					{localBusy ? "Scanning..." : "Scan + Auto Fill"}
				</button>
			</div>
			<span class="field-hint">Includes recursive files and computes MD5 values automatically.</span>
			{#if !api}
				<span class="field-hint">Running in browser mode: choose folder/import uses local file inputs instead of desktop bridge.</span>
			{/if}
			<input bind:this={sourceDirectoryInputEl} class="hidden-file-input" type="file" webkitdirectory multiple onchange={onSourceDirectoryInputChange} />
			<input bind:this={importModinfoInputEl} class="hidden-file-input" type="file" accept=".modinfo,.xml,text/xml,application/xml" onchange={onImportModinfoInputChange} />
		</section>

		<section class="block">
			<div class="row-head">
				<h3>Properties</h3>
				<button class="btn secondary small" type="button" onclick={() => (modId = generateUuid())}>Generate Mod ID</button>
			</div>
			<div class="grid cols-2">
				<label><span class="label">Mod ID (UUID)</span><input class="input" bind:value={modId} /></label>
				<label><span class="label">Version</span><input class="input" bind:value={version} /></label>
				<label><span class="label">Name</span><input class="input" bind:value={properties.name} /></label>
				<label>
					<span class="label">Stability</span>
					<select class="input" bind:value={properties.stability}>
						{#each STABILITY_OPTIONS as option (option)}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</label>
				<label class="span-2"><span class="label">Teaser</span><input bind:this={teaserInputEl} class="input" bind:value={properties.teaser} /></label>
				<label class="span-2"><span class="label">Description</span>
				<textarea bind:this={descriptionTextareaEl} class="input area" rows="4" bind:value={properties.description}></textarea>
				<span class="field-hint span-2">Hint: Use [NEWLINE] for line breaks.</span>
				</label>
				<details class="span-2 color-helper-details">
					<summary>Color Markup Helper</summary>
					<div class="color-helper">
						<div class="color-helper-row">
							<select class="input" bind:value={selectedColorTag}>
								{#each CIV5_COLOR_OPTIONS as option (option)}
									<option value={option}>{option}</option>
								{/each}
							</select>
							<button class="btn secondary small" type="button" onclick={() => wrapSelectionWithColor("teaser", selectedColorTag)}>
								Wrap Teaser Selection
							</button>
							<button class="btn secondary small" type="button" onclick={() => wrapSelectionWithColor("description", selectedColorTag)}>
								Wrap Description Selection
							</button>
						</div>
						<div class="color-chip-grid">
							{#each CIV5_COLOR_OPTIONS as colorOption (colorOption)}
								<button
									class="color-chip"
									class:is-active={selectedColorTag === colorOption}
									type="button"
									onclick={() => (selectedColorTag = colorOption)}
								>
									<span class="color-swatch" style={`--swatch:${getColorHex(colorOption)}`}></span>
									<span>{colorOption}</span>
								</button>
							{/each}
						</div>
						<span class="field-hint">
							Select text first in Teaser or Description, then wrap with
							<code>[COLOR_*]</code> and <code>[ENDCOLOR]</code>.
						</span>
						<div class="selected-color-preview">
							<span class="color-swatch large" style={`--swatch:${getColorHex(selectedColorTag)}`}></span>
							<code class="color-example">[{selectedColorTag}]Your text[ENDCOLOR]</code>
						</div>
					</div>
				</details>
				<label><span class="label">Author(s)</span><input class="input" bind:value={properties.authors} /></label>
				<label><span class="label">Min Compatible Save Version</span><input class="input" bind:value={properties.minCompatibleSaveVersion} /></label>
			</div>
			<div class="check-grid">
				<label>
					<input
						type="checkbox"
						checked={properties.affectsSavedGames === "1"}
						onchange={(event) => (properties.affectsSavedGames = (event.currentTarget as HTMLInputElement).checked ? "1" : "0")}
					/>
					Affects Saved Games
				</label>
				<label><input type="checkbox" bind:checked={properties.supportsSinglePlayer} /> Supports Single Player</label>
				<label><input type="checkbox" bind:checked={properties.supportsMultiplayer} /> Supports Multiplayer</label>
				<label><input type="checkbox" bind:checked={properties.supportsHotSeat} /> Supports HotSeat</label>
				<label><input type="checkbox" bind:checked={properties.supportsMac} /> Supports Mac</label>
				<label><input type="checkbox" bind:checked={properties.reloadAudioSystem} /> Reload Audio System</label>
				<label><input type="checkbox" bind:checked={properties.reloadLandmarkSystem} /> Reload Landmark System</label>
				<label><input type="checkbox" bind:checked={properties.reloadStrategicViewSystem} /> Reload Strategic View System</label>
				<label><input type="checkbox" bind:checked={properties.reloadUnitSystem} /> Reload Unit System</label>
			</div>
		</section>

		<div class="builder-columns">
			<div class="builder-column builder-column-primary">
				<section class="block">
				<div class="row-head">
					<h3>Files</h3>
					<button class="btn secondary small" type="button" onclick={addEmptyFile}>Add File</button>
				</div>
				<div class="table-scroll">
					<table>
						<thead>
							<tr><th>Path</th><th>MD5</th><th>Import</th><th></th></tr>
						</thead>
						<tbody>
							{#each files as file, index (index)}
								<tr>
									<td><input class="input tight" bind:value={file.relativePath} /></td>
									<td><input class="input tight mono" bind:value={file.md5} /></td>
									<td class="center"><input type="checkbox" bind:checked={file.import} /></td>
									<td class="center"><button class="btn secondary tiny" type="button" onclick={() => removeFile(index)}>Remove</button></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				</section>

				<section class="block">
				<div class="row-head">
					<h3>Actions</h3>
					<button class="btn secondary small" type="button" onclick={addAction}>Add Action</button>
				</div>
				<div class="table-scroll">
					<table>
						<thead>
							<tr><th>Event</th><th>Action</th><th>File</th><th></th></tr>
						</thead>
						<tbody>
							{#each actions as row, index (index)}
								<tr>
									<td><input class="input tight" bind:value={row.event} placeholder="OnModActivated" /></td>
									<td>
										<select class="input tight" bind:value={row.action}>
											{#each ACTION_TYPES as value (value)}
												<option {value}>{value}</option>
											{/each}
										</select>
									</td>
									<td><input class="input tight" bind:value={row.file} list="modinfo-file-options" /></td>
									<td class="center"><button class="btn secondary tiny" type="button" onclick={() => removeAction(index)}>Remove</button></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				</section>

				<section class="block">
				<div class="row-head">
					<h3>Entry Points</h3>
					<button class="btn secondary small" type="button" onclick={addEntryPoint}>Add Entry Point</button>
				</div>
				<div class="table-scroll">
					<table>
						<thead>
							<tr><th>Type</th><th>File</th><th>Name</th><th>Description</th><th></th></tr>
						</thead>
						<tbody>
							{#each entryPoints as row, index (index)}
								<tr>
									<td>
										<select class="input tight" bind:value={row.type}>
											{#each ENTRYPOINT_TYPES as value (value)}
												<option {value}>{value}</option>
											{/each}
										</select>
									</td>
									<td><input class="input tight" bind:value={row.file} list="modinfo-file-options" /></td>
									<td><input class="input tight" bind:value={row.name} /></td>
									<td><input class="input tight" bind:value={row.description} /></td>
									<td class="center"><button class="btn secondary tiny" type="button" onclick={() => removeEntryPoint(index)}>Remove</button></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				</section>
			</div>

			<div class="builder-column builder-column-secondary">
				<section class="block">
				<div class="row-head">
					<h3>Dependencies (DLC + Mods)</h3>
					<div class="row-actions">
						<button class="btn secondary small" type="button" onclick={() => addDependency("Dlc")}>Add DLC</button>
						<button class="btn secondary small" type="button" onclick={() => addDependency("Mod")}>Add Mod</button>
					</div>
				</div>
				<details class="preset-details">
					<summary>Common Dependencies</summary>
					<div class="preset-chip-grid" role="group" aria-label="Common dependencies">
						{#each COMMON_DEPENDENCY_PRESETS as preset (`${preset.type}|${preset.id}|${preset.minversion}|${preset.maxversion}|${preset.title ?? ""}`)}
							<button class="preset-chip" type="button" onclick={() => addDependencyPreset(preset)}>
								<span class="preset-type">{preset.type}</span>
								<span>{preset.title || preset.id}</span>
							</button>
						{/each}
					</div>
				</details>
				<div class="table-scroll">
					<table>
						<thead>
							<tr><th>Type</th><th>ID</th><th>Min</th><th>Max</th><th>Title (Mods)</th><th></th></tr>
						</thead>
						<tbody>
							{#each dependencies as row, index (index)}
								<tr>
									<td>
										<select class="input tight" bind:value={row.type}>
											<option value="Dlc">Dlc</option>
											<option value="Mod">Mod</option>
										</select>
									</td>
									<td><input class="input tight mono" bind:value={row.id} /></td>
									<td><input class="input tight" bind:value={row.minversion} /></td>
									<td><input class="input tight" bind:value={row.maxversion} /></td>
									<td><input class="input tight" bind:value={row.title} disabled={row.type !== "Mod"} placeholder={row.type === "Mod" ? "Dependency title" : ""} /></td>
									<td class="center"><button class="btn secondary tiny" type="button" onclick={() => removeDependency(index)}>Remove</button></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				</section>

				<section class="block">
				<div class="row-head">
					<h3>References (Mods)</h3>
					<button class="btn secondary small" type="button" onclick={addReference}>Add Reference</button>
				</div>
				<details class="preset-details">
					<summary>Common References</summary>
					<div class="preset-chip-grid" role="group" aria-label="Common references">
						{#each COMMON_REFERENCE_PRESETS as preset (`${preset.id}|${preset.minversion}|${preset.maxversion}|${preset.title}`)}
							<button class="preset-chip" type="button" onclick={() => addReferencePreset(preset)}>
								<span>{preset.title}</span>
							</button>
						{/each}
					</div>
				</details>
				<div class="table-scroll">
					<table>
						<thead>
							<tr><th>ID</th><th>Min</th><th>Max</th><th>Title</th><th></th></tr>
						</thead>
						<tbody>
							{#each references as row, index (index)}
								<tr>
									<td><input class="input tight mono" bind:value={row.id} /></td>
									<td><input class="input tight" bind:value={row.minversion} /></td>
									<td><input class="input tight" bind:value={row.maxversion} /></td>
									<td><input class="input tight" bind:value={row.title} /></td>
									<td class="center"><button class="btn secondary tiny" type="button" onclick={() => removeReference(index)}>Remove</button></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				</section>
			</div>
		</div>

		<section class="block">
			<div class="row-head">
				<h3>Output</h3>
				{#if copyStatus}<span class="field-hint">{copyStatus}</span>{/if}
			</div>
				<div class="path-row">
					<input class="input" bind:value={outputFilePath} placeholder="/path/to/mod.modinfo" />
					<button class="btn secondary small" type="button" disabled={!api || localBusy} onclick={chooseOutputPath}>Choose Save Path</button>
					<button class="btn secondary small" type="button" onclick={copyXml}>Copy XML</button>
				</div>
			<div class="btn-row">
				<span class="tooltip-wrap">
					<button class="btn" type="button" disabled={!canSave} onclick={saveModinfo}>{localBusy ? "Saving..." : "Save .modinfo"}</button>
					{#if !canSave}
						<span class="tooltip">{disableReason}</span>
					{/if}
				</span>
			</div>
			<div class="issues">
				{#if requiredIssues.length > 0}
					{#each requiredIssues as issue (issue)}
						<p>{issue}</p>
					{/each}
				{:else}
					<p class="ok">Ready to save.</p>
				{/if}
			</div>
			<pre>{modinfoXml}</pre>
		</section>
	</div>
</section>
</section>

<datalist id="modinfo-file-options">
	{#each files as file, index (`${index}-${file.relativePath}-${file.md5}`)}
		<option value={file.relativePath}></option>
	{/each}
</datalist>

<style>
	.modinfo-page {
		display: grid;
		gap: 1rem;
	}

	.card {
		background: var(--panel-bg);
		box-shadow: 0 10px 26px var(--shadow-soft);
		border: 1px solid color-mix(in oklch, var(--panel-border) 80%, transparent);
		border-radius: 1rem;
	}

	.panel-content {
		display: grid;
		gap: 0.8rem;
		padding: 1rem;
	}

	.btn {
		cursor: pointer;
		color: var(--ink);
		font: inherit;
		background: linear-gradient(145deg, var(--accent), var(--accent-strong));
		border: 1px solid color-mix(in oklch, var(--accent) 56%, var(--panel-border));
		border-radius: 0.62rem;
		padding-block: 0.44rem;
		padding-inline: 0.76rem;
	}

	.btn.secondary {
		background: var(--control-bg);
		border-color: color-mix(in oklch, var(--panel-border) 80%, transparent);
	}

	.btn:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.input {
		inline-size: 100%;
		box-sizing: border-box;
		color: var(--ink);
		font: inherit;
		line-height: 1.25;
		background: var(--input-bg);
		border: 1px solid var(--panel-border);
		border-radius: 0.6rem;
		padding-block: 0.46rem;
		padding-inline: 0.58rem;
	}

	select.input {
		block-size: calc(1.25em + 0.92rem + 4px);
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		background-image:
			linear-gradient(45deg, transparent 50%, color-mix(in oklch, var(--muted-ink) 80%, var(--ink) 20%) 50%),
			linear-gradient(135deg, color-mix(in oklch, var(--muted-ink) 80%, var(--ink) 20%) 50%, transparent 50%);
		background-position:
			calc(100% - 0.95rem) 50%,
			calc(100% - 0.65rem) 50%;
		background-size:
			0.35rem 0.35rem,
			0.35rem 0.35rem;
		background-repeat: no-repeat;
		padding-inline-end: 1.55rem;
	}

	.hidden-file-input {
		display: none;
	}

	.label {
		display: inline-block;
		color: var(--muted-ink);
		font-size: 0.84rem;
		margin-block-end: 0.35rem;
	}

	.btn-row {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	h2 {
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1.4rem;
		margin: 0;
	}

	h3 {
		font-size: 1rem;
		margin: 0;
	}

	.hint {
		color: var(--muted-ink);
		margin-block: 0.5rem 0.9rem;
	}

	.block {
		display: grid;
		gap: 0.55rem;
		background: color-mix(in oklch, var(--control-bg) 62%, black);
		border: 1px solid var(--panel-border);
		border-radius: 0.78rem;
		padding: 0.75rem;
		margin-block-end: 0.8rem;
	}

	.builder-columns {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	}

	.builder-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.builder-column .block {
		margin-block-end: 0;
	}

	.row-head {
		align-items: center;
		display: flex;
		gap: 0.6rem;
		justify-content: space-between;
	}

	.row-actions {
		display: inline-flex;
		gap: 0.5rem;
	}

	.grid {
		display: grid;
		gap: 0.55rem;
	}

	.cols-2 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.span-2 {
		grid-column: span 2;
	}

	.check-grid {
		display: grid;
		gap: 0.4rem;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		font-size: 0.86rem;
	}

	.preset-details {
		background: color-mix(in oklch, var(--control-bg) 68%, black);
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, white);
		border-radius: 0.65rem;
		padding: 0.35rem 0.5rem 0.5rem;
	}

	.preset-details > summary {
		cursor: pointer;
		color: var(--muted-ink);
		font-size: 0.84rem;
		font-weight: 650;
		list-style-position: inside;
	}

	.preset-details[open] > summary {
		margin-block-end: 0.45rem;
	}

	.preset-chip-grid {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		max-block-size: 20rem;
		overflow: auto;
	}

	.preset-chip {
		cursor: pointer;
		display: grid;
		gap: 0.25rem;
		text-align: left;
		color: var(--muted-ink);
		font-size: 0.85rem;
		background: color-mix(in oklch, var(--panel-bg) 86%, black);
		border: 1px solid var(--panel-border);
		border-radius: 0.52rem;
		padding: 0.34rem 0.5rem;
	}

	.preset-chip:hover {
		color: var(--ink);
		background: color-mix(in oklch, var(--panel-bg) 90%, var(--accent));
		border-color: color-mix(in oklch, var(--accent) 65%, var(--panel-border));
	}

	.preset-type {
		inline-size: fit-content;
		max-block-size: 3.25ch;
		display: inline-flex;
		font-size: 0.66rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		border: 1px solid var(--panel-border);
		border-radius: 999px;
		padding: 0.1rem 0.35rem;
	}

	.color-helper {
		min-inline-size: 0;
		display: grid;
		gap: 0.45rem;
		background: color-mix(in oklch, var(--control-bg) 70%, black);
		border: 1px solid color-mix(in oklch, var(--panel-border) 76%, white);
		border-radius: 0.65rem;
		padding: 0.55rem;
		overflow-x: hidden;
	}

	.color-helper-details {
		min-inline-size: 0;
		background: color-mix(in oklch, var(--control-bg) 68%, black);
		border: 1px solid color-mix(in oklch, var(--panel-border) 72%, white);
		border-radius: 0.65rem;
		padding: 0.35rem 0.5rem 0.5rem;
		overflow-x: hidden;
	}

	.color-helper-details > summary {
		cursor: pointer;
		color: var(--muted-ink);
		font-size: 0.86rem;
		font-weight: 650;
		list-style-position: inside;
	}

	.color-helper-details[open] > summary {
		margin-block-end: 0.45rem;
	}

	.color-helper-row {
		min-inline-size: 0;
		display: grid;
		gap: 0.45rem;
		grid-template-columns: minmax(0, 1fr) auto auto;
	}

	.color-chip-grid {
		max-block-size: 20rem;
		min-inline-size: 0;
		display: grid;
		gap: 0.35rem;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		overflow: auto;
	}

	.color-chip {
		min-inline-size: 0;
		align-items: center;
		cursor: pointer;
		display: flex;
		gap: 0.45rem;
		color: var(--muted-ink);
		font-size: 0.74rem;
		text-align: left;
		background: color-mix(in oklch, var(--panel-bg) 86%, black);
		border: 1px solid var(--panel-border);
		border-radius: 0.5rem;
		padding: 0.26rem 0.5rem;
		overflow: hidden;
	}

	.color-chip span:last-child {
		min-inline-size: 0;
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}

	.color-chip.is-active {
		color: var(--ink);
		border-color: color-mix(in oklch, var(--accent) 70%, white);
	}

	.color-swatch {
		block-size: 1rem;
		inline-size: 1rem;
		flex: 0 0 auto;
		background: var(--swatch);
		border: 1px solid color-mix(in oklch, var(--panel-border) 55%, white);
		border-radius: 0.2rem;
	}

	.color-swatch.large {
		block-size: 1.15rem;
		inline-size: 1.15rem;
	}

	.selected-color-preview {
		max-inline-size: 100%;
		min-inline-size: 0;
		align-items: center;
		display: inline-flex;
		gap: 0.45rem;
	}

	.color-example {
		max-inline-size: 100%;
		display: inline-block;
		font-size: 0.78rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		background: color-mix(in oklch, var(--input-bg) 76%, black);
		border: 1px solid var(--panel-border);
		border-radius: 0.45rem;
		padding: 0.25rem 0.45rem;
		overflow: hidden;
	}

	@media (max-width: 980px) {
		.color-helper-row {
			grid-template-columns: 1fr;
	}
	}

	@media (max-width: 1240px) {
		.builder-columns {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.path-row {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: minmax(0, 1fr) auto auto;
	}

	.table-scroll {
		overflow: auto;
	}

	table {
		min-width: 780px;
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		text-align: left;
		border-bottom: 1px solid color-mix(in oklch, var(--panel-border) 70%, black);
		padding: 0.4rem;
		vertical-align: middle;
	}

	.center {
		text-align: center;
	}

	.tiny {
		font-size: 0.78rem;
		padding: 0.24rem 0.48rem;
	}

	.small {
		font-size: 0.84rem;
		padding: 0.45rem 0.7rem;
	}

	.tight {
		padding: 0.4rem 0.5rem;
	}

	.mono {
		font-family: "Menlo", "Monaco", "Consolas", monospace;
		font-size: 0.78rem;
	}

	.area {
		resize: vertical;
	}

	.field-hint {
		color: var(--muted-ink);
		font-size: 0.8rem;
	}

	.issues p {
		color: color-mix(in oklch, oklch(0.72 0.17 35) 90%, var(--ink));
		font-size: 0.85rem;
		margin: 0.1rem 0;
	}

	.issues p.ok {
		color: color-mix(in oklch, oklch(0.72 0.14 150) 85%, var(--ink));
	}

	pre {
		max-block-size: 52vh;
		font-size: 0.8rem;
		background: color-mix(in oklch, var(--input-bg) 75%, black);
		border: 1px solid var(--panel-border);
		border-radius: 0.6rem;
		padding: 0.65rem;
		margin: 0;
		overflow: auto;
	}

	.tooltip-wrap {
		position: relative;
		display: inline-flex;
	}

	.tooltip {
		inset-block-end: calc(100% + 0.45rem);
		inset-inline-start: 50%;
		position: absolute;
		transform: translateX(-50%);
		max-inline-size: 28rem;
		min-inline-size: 16rem;
		pointer-events: none;
		color: var(--ink);
		opacity: 0;
		font-size: 0.78rem;
		background: oklch(0.2 0 0 / 0.96);
		border: 1px solid color-mix(in oklch, var(--warn) 45%, var(--panel-border));
		border-radius: 0.55rem;
		padding: 0.5rem 0.65rem;
		transition: opacity 120ms ease-in-out;
	}

	.tooltip-wrap:hover .tooltip {
		opacity: 1;
	}

	@media (max-width: 980px) {
		.cols-2 {
			grid-template-columns: minmax(0, 1fr);
	}

		.span-2 {
			grid-column: span 1;
	}

		.path-row {
			grid-template-columns: minmax(0, 1fr);
	}
	}
</style>
