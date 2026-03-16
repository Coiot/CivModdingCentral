<script>
	import { onMount } from "svelte";
	import { plannerDeliverables, plannerTracks, siteResourceGroups, siteResourcesById, tutorialById } from "../data/guidedPlannerData.js";
	import SiteResourceDirectory from "./SiteResourceDirectory.svelte";

	let { authUser = null, authAccessToken = "", authEnabled = false } = $props();

	const LEGACY_PLANNER_PROGRESS_STORAGE_KEY = "cmc-guided-planner-progress-v1";
	const PLANNER_PROJECTS_STORAGE_KEY = "cmc-guided-planner-projects-v2";
	const PLANNER_ACTIVE_PROJECT_STORAGE_KEY = "cmc-guided-planner-active-project-v2";
	const PLANNER_EXPORT_KIND = "cmc-guided-planner-export";
	const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
	const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
	const SUPABASE_PLANNER_PROJECTS_TABLE = import.meta.env.VITE_SUPABASE_PLANNER_PROJECTS_TABLE || "cmc_guided_planner_projects";
	const SUPABASE_PLANNER_ICONS_BUCKET = import.meta.env.VITE_SUPABASE_PLANNER_ICONS_BUCKET || "cmc-guided-planner-icons";
	const defaultTrackId = plannerTracks[0]?.id || "";
	const defaultDeliverableId = plannerTracks[0]?.deliverableIds[0] || "";
	const legacyDeliverableIdMap = {
		"misc-text": "full-test",
		"ua-test": "gameplay-test",
		"uu-test": "gameplay-test",
		"uc2-test": "gameplay-test",
	};
	const validDeliverableIds = new Set(plannerDeliverables.map((item) => item.id));
	const allResources = siteResourceGroups.flatMap((group) => group.items);
	const totalWeight = plannerDeliverables.reduce((sum, item) => sum + item.weight, 0);
	const liveSurfaceCount = allResources.filter((item) => !item.disabled).length;
	const comingSoonSurfaceCount = allResources.filter((item) => item.disabled).length;
	const hiddenSurfaceCount = allResources.filter((item) =>
		String(item.status || "")
			.toLowerCase()
			.includes("hidden"),
	).length;
	const criticalPath = [...plannerDeliverables].sort((left, right) => right.weight - left.weight).slice(0, 6);
	const trackWeightLookup = Object.fromEntries(
		plannerTracks.map((track) => [
			track.id,
			track.deliverableIds.reduce((sum, deliverableId) => {
				const deliverable = plannerDeliverables.find((item) => item.id === deliverableId);
				return sum + (deliverable?.weight || 0);
			}, 0),
		]),
	);
	const highestPressureTrack = plannerTracks.reduce((bestTrack, currentTrack) => {
		if (!bestTrack) {
			return currentTrack;
		}
		return (trackWeightLookup[currentTrack.id] || 0) > (trackWeightLookup[bestTrack.id] || 0) ? currentTrack : bestTrack;
	}, plannerTracks[0]);

	let plannerProjects = $state([]);
	let activeProjectId = $state("");
	let projectNameDraft = $state("");
	let collaboratorDraft = $state("");
	let projectNotice = $state("");
	let projectNoticeTone = $state("info");
	let projectDeskOpen = $state(false);
	let progressHydrated = $state(false);
	let cloudLoading = $state(false);
	let plannerImportInput = $state();
	let projectIconInput = $state();
	let cloudLoadKey = $state("");
	let plannerCloudClient = null;
	let plannerCloudClientKey = "";

	const signedInPlannerEmail = $derived(
		String(authUser?.email || "")
			.trim()
			.toLowerCase(),
	);
	const cloudSyncAvailable = $derived(Boolean(authEnabled && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_PLANNER_PROJECTS_TABLE));
	const cloudSyncReady = $derived(Boolean(cloudSyncAvailable && signedInPlannerEmail && authAccessToken));
	const orderedProjects = $derived(
		[...plannerProjects].sort((left, right) => {
			const rightTime = Date.parse(right.updatedAt || 0);
			const leftTime = Date.parse(left.updatedAt || 0);
			return rightTime - leftTime || left.name.localeCompare(right.name);
		}),
	);
	const activeProject = $derived(plannerProjects.find((project) => project.id === activeProjectId) ?? plannerProjects[0] ?? null);
	const activeTrackId = $derived(activeProject?.activeTrackId || defaultTrackId);
	const activeDeliverableId = $derived(activeProject?.activeDeliverableId || defaultDeliverableId);
	const completedDeliverableIds = $derived(activeProject?.completedDeliverableIds || []);
	const activeTrack = $derived(plannerTracks.find((track) => track.id === activeTrackId) ?? plannerTracks[0] ?? null);
	const activeTrackDeliverables = $derived((activeTrack?.deliverableIds || []).map((deliverableId) => plannerDeliverables.find((item) => item.id === deliverableId)).filter(Boolean));
	const activeDeliverable = $derived(activeTrackDeliverables.find((item) => item.id === activeDeliverableId) ?? activeTrackDeliverables[0] ?? null);
	const activeDeliverableIndex = $derived(activeTrackDeliverables.findIndex((item) => item.id === activeDeliverable?.id));
	const activeResources = $derived((activeDeliverable?.resourceIds || []).map((resourceId) => siteResourcesById[resourceId]).filter(Boolean));
	const activeTutorials = $derived((activeDeliverable?.tutorialIds || []).map((tutorialId) => tutorialById[tutorialId]).filter(Boolean));
	const activeDependencyDeliverables = $derived((activeDeliverable?.dependencies || []).map((dependencyId) => plannerDeliverables.find((item) => item.id === dependencyId)).filter(Boolean));
	const completedDeliverableSet = $derived(new Set(completedDeliverableIds));
	const activeTrackNextDeliverable = $derived(activeTrackDeliverables.find((item) => !completedDeliverableSet.has(item.id)) ?? activeTrackDeliverables[0] ?? null);
	const activeInstructionBlocks = $derived(buildDeliverableInstructionBlocks(activeDeliverable));
	const completedDeliverableCount = $derived(completedDeliverableIds.length);
	const overallCompletionPercent = $derived(plannerDeliverables.length ? (completedDeliverableIds.length / plannerDeliverables.length) * 100 : 0);
	const activeProjectShareLocked = $derived(Boolean(activeProject?.ownerEmail) && activeProject.ownerEmail !== signedInPlannerEmail);

	onMount(() => {
		const storedProjects = readStorageJson(PLANNER_PROJECTS_STORAGE_KEY);
		const storedActiveProjectId = typeof window !== "undefined" ? String(window.localStorage.getItem(PLANNER_ACTIVE_PROJECT_STORAGE_KEY) || "") : "";

		try {
			if (Array.isArray(storedProjects) && storedProjects.length) {
				commitProjects(storedProjects, storedActiveProjectId);
			} else {
				const legacyProgress = readStorageJson(LEGACY_PLANNER_PROGRESS_STORAGE_KEY);
				const seededCompletedIds = Array.isArray(legacyProgress) ? legacyProgress.filter((item) => validDeliverableIds.has(item)) : [];
				const initialProject = createPlannerProject({
					name: seededCompletedIds.length ? "Current Civ Mod" : "My First Civ Mod",
					completedDeliverableIds: seededCompletedIds,
				});
				commitProjects([initialProject], initialProject.id);
			}
		} catch {
			const initialProject = createPlannerProject();
			commitProjects([initialProject], initialProject.id);
		}

		progressHydrated = true;
	});

	$effect(() => {
		if (!progressHydrated) {
			return;
		}

		window.localStorage.setItem(PLANNER_PROJECTS_STORAGE_KEY, JSON.stringify(plannerProjects.map((project) => serializeProjectRecord(project))));
		window.localStorage.setItem(PLANNER_ACTIVE_PROJECT_STORAGE_KEY, activeProjectId);
	});

	$effect(() => {
		if (!progressHydrated) {
			return;
		}

		if (!cloudSyncReady) {
			cloudLoadKey = "";
			return;
		}

		const nextLoadKey = `${signedInPlannerEmail}:${authAccessToken}`;
		if (cloudLoadKey === nextLoadKey) {
			return;
		}

		cloudLoadKey = nextLoadKey;
		void loadCloudProjects({ silent: true });
	});

	function readStorageJson(storageKey) {
		if (typeof window === "undefined") {
			return null;
		}

		try {
			const raw = window.localStorage.getItem(storageKey);
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	function createProjectId() {
		if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
			return crypto.randomUUID();
		}

		const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`.padEnd(24, "0");
		return `${seed.slice(0, 8)}-${seed.slice(8, 12)}-4000-8000-${seed.slice(12, 24)}`;
	}

	function sanitizeProjectName(value) {
		return String(value || "")
			.trim()
			.replace(/\s+/g, " ");
	}

	function buildProjectName(baseName = "New Civ Mod", existingProjects = plannerProjects) {
		const cleanedBase = sanitizeProjectName(baseName) || "New Civ Mod";
		const existingNames = new Set(existingProjects.map((project) => project.name.toLowerCase()));
		if (!existingNames.has(cleanedBase.toLowerCase())) {
			return cleanedBase;
		}

		let suffix = 2;
		while (existingNames.has(`${cleanedBase} ${suffix}`.toLowerCase())) {
			suffix += 1;
		}
		return `${cleanedBase} ${suffix}`;
	}

	function normalizeCollaboratorEmails(value, ownerEmail = "") {
		const owner = String(ownerEmail || "")
			.trim()
			.toLowerCase();
		const parts = Array.isArray(value) ? value : String(value || "").split(/[\n,]/);
		return [
			...new Set(
				parts
					.map((item) =>
						String(item || "")
							.trim()
							.toLowerCase(),
					)
					.filter(Boolean),
			),
		]
			.filter((email) => email !== owner)
			.sort();
	}

	function normalizeProject(project = {}) {
		const nextTrackId = plannerTracks.some((track) => track.id === project.activeTrackId) ? project.activeTrackId : defaultTrackId;
		const nextTrack = plannerTracks.find((track) => track.id === nextTrackId) ?? plannerTracks[0] ?? null;
		const normalizedActiveDeliverableId = legacyDeliverableIdMap[project.activeDeliverableId] || project.activeDeliverableId;
		const normalizedCompletedDeliverableIds = [
			...new Set((project.completedDeliverableIds || []).map((item) => legacyDeliverableIdMap[item] || item).filter((item) => validDeliverableIds.has(item))),
		];
		const nextDeliverableId = nextTrack?.deliverableIds.includes(normalizedActiveDeliverableId) ? normalizedActiveDeliverableId : nextTrack?.deliverableIds[0] || defaultDeliverableId;
		const ownerEmail = String(project.ownerEmail || "")
			.trim()
			.toLowerCase();
		const createdAt = isFinite(Date.parse(project.createdAt || "")) ? project.createdAt : new Date().toISOString();
		const updatedAt = isFinite(Date.parse(project.updatedAt || "")) ? project.updatedAt : createdAt;

		return {
			id: String(project.id || createProjectId()),
			name: sanitizeProjectName(project.name) || "New Civ Mod",
			activeTrackId: nextTrackId,
			activeDeliverableId: nextDeliverableId,
			completedDeliverableIds: normalizedCompletedDeliverableIds,
			iconDataUrl: String(project.iconDataUrl || ""),
			iconFileName: String(project.iconFileName || ""),
			iconPath: String(project.iconPath || ""),
			iconUpdatedAt: isFinite(Date.parse(project.iconUpdatedAt || "")) ? project.iconUpdatedAt : "",
			collaboratorEmails: normalizeCollaboratorEmails(project.collaboratorEmails || [], ownerEmail),
			ownerEmail,
			cloudSyncedAt: isFinite(Date.parse(project.cloudSyncedAt || "")) ? project.cloudSyncedAt : "",
			createdAt,
			updatedAt,
		};
	}

	function createPlannerProject(seed = {}) {
		return normalizeProject({
			id: createProjectId(),
			name: buildProjectName(seed.name || "New Civ Mod"),
			activeTrackId: seed.activeTrackId || defaultTrackId,
			activeDeliverableId: seed.activeDeliverableId || defaultDeliverableId,
			completedDeliverableIds: seed.completedDeliverableIds || [],
			iconDataUrl: seed.iconDataUrl || "",
			iconFileName: seed.iconFileName || "",
			iconPath: seed.iconPath || "",
			iconUpdatedAt: seed.iconUpdatedAt || "",
			collaboratorEmails: seed.collaboratorEmails || [],
			ownerEmail: seed.ownerEmail || "",
			cloudSyncedAt: seed.cloudSyncedAt || "",
			createdAt: seed.createdAt || new Date().toISOString(),
			updatedAt: seed.updatedAt || new Date().toISOString(),
		});
	}

	function serializeProjectRecord(project) {
		return {
			id: project.id,
			name: project.name,
			activeTrackId: project.activeTrackId,
			activeDeliverableId: project.activeDeliverableId,
			completedDeliverableIds: [...project.completedDeliverableIds],
			iconDataUrl: project.iconDataUrl || "",
			iconFileName: project.iconFileName || "",
			iconPath: project.iconPath || "",
			iconUpdatedAt: project.iconUpdatedAt || "",
			collaboratorEmails: [...project.collaboratorEmails],
			ownerEmail: project.ownerEmail || "",
			cloudSyncedAt: project.cloudSyncedAt || "",
			createdAt: project.createdAt,
			updatedAt: project.updatedAt,
		};
	}

	function serializeProjectForCloud(project) {
		return {
			name: project.name,
			activeTrackId: project.activeTrackId,
			activeDeliverableId: project.activeDeliverableId,
			completedDeliverableIds: [...project.completedDeliverableIds],
			iconPath: project.iconPath || "",
			iconFileName: project.iconFileName || "",
			iconUpdatedAt: project.iconUpdatedAt || "",
			createdAt: project.createdAt,
			updatedAt: project.updatedAt,
		};
	}

	function projectFromCloudRow(row) {
		return normalizeProject({
			id: row.id,
			name: row.name || row.project_state?.name || "Shared Civ Mod",
			activeTrackId: row.project_state?.activeTrackId,
			activeDeliverableId: row.project_state?.activeDeliverableId,
			completedDeliverableIds: row.project_state?.completedDeliverableIds || [],
			iconPath: row.icon_path || row.project_state?.iconPath || "",
			iconFileName: row.project_state?.iconFileName || "",
			iconUpdatedAt: row.icon_updated_at || row.project_state?.iconUpdatedAt || "",
			collaboratorEmails: row.collaborator_emails || [],
			ownerEmail: row.owner_email || "",
			cloudSyncedAt: row.updated_at || "",
			createdAt: row.created_at || row.project_state?.createdAt,
			updatedAt: row.updated_at || row.project_state?.updatedAt,
		});
	}

	function commitProjects(nextProjects, preferredActiveProjectId = activeProjectId) {
		const normalizedProjects = nextProjects.map((project) => normalizeProject(project));
		const ensuredProjects = normalizedProjects.length ? normalizedProjects : [createPlannerProject()];
		const nextActiveProjectId = ensuredProjects.some((project) => project.id === preferredActiveProjectId) ? preferredActiveProjectId : ensuredProjects[0].id;
		const nextActiveProject = ensuredProjects.find((project) => project.id === nextActiveProjectId) ?? ensuredProjects[0];

		plannerProjects = ensuredProjects;
		activeProjectId = nextActiveProjectId;
		syncProjectDrafts(nextActiveProject);
	}

	function syncProjectDrafts(project) {
		projectNameDraft = project?.name || "";
		collaboratorDraft = (project?.collaboratorEmails || []).join(", ");
	}

	function updateActiveProject(transform) {
		if (!activeProject) {
			return;
		}

		const nextTimestamp = new Date().toISOString();
		const nextProjects = plannerProjects.map((project) => {
			if (project.id !== activeProject.id) {
				return project;
			}

			return normalizeProject({
				...project,
				...transform(project),
				updatedAt: nextTimestamp,
			});
		});

		commitProjects(nextProjects, activeProject.id);
	}

	function selectTrack(trackId) {
		const nextTrack = plannerTracks.find((track) => track.id === trackId);
		if (!nextTrack) {
			return;
		}

		updateActiveProject((project) => ({
			...project,
			activeTrackId: nextTrack.id,
			activeDeliverableId: nextTrack.deliverableIds[0] || defaultDeliverableId,
		}));
	}

	function selectDeliverable(deliverableId) {
		const nextDeliverable = plannerDeliverables.find((item) => item.id === deliverableId);
		if (!nextDeliverable) {
			return;
		}

		updateActiveProject((project) => ({
			...project,
			activeTrackId: nextDeliverable.track,
			activeDeliverableId: nextDeliverable.id,
		}));
	}

	function selectAdjacentDeliverable(offset) {
		const nextDeliverable = activeTrackDeliverables[activeDeliverableIndex + offset];
		if (!nextDeliverable) {
			return;
		}

		selectDeliverable(nextDeliverable.id);
	}

	function isTypingTarget(target) {
		return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
	}

	function handleWindowKeyDown(event) {
		if (isTypingTarget(event.target)) {
			return;
		}

		if (event.key === "[") {
			event.preventDefault();
			selectAdjacentDeliverable(-1);
			return;
		}

		if (event.key === "]") {
			event.preventDefault();
			selectAdjacentDeliverable(1);
		}
	}

	function isDeliverableDone(deliverableId) {
		return completedDeliverableSet.has(deliverableId);
	}

	function toggleDeliverableDone(deliverableId) {
		if (!validDeliverableIds.has(deliverableId)) {
			return;
		}

		updateActiveProject((project) => ({
			...project,
			completedDeliverableIds: completedDeliverableSet.has(deliverableId)
				? project.completedDeliverableIds.filter((item) => item !== deliverableId)
				: [...project.completedDeliverableIds, deliverableId],
		}));
	}

	function completedTrackCount(trackId) {
		const track = plannerTracks.find((item) => item.id === trackId);
		if (!track) {
			return 0;
		}

		return track.deliverableIds.filter((deliverableId) => completedDeliverableSet.has(deliverableId)).length;
	}

	function trackCompletionPercent(trackId) {
		const track = plannerTracks.find((item) => item.id === trackId);
		if (!track?.deliverableIds.length) {
			return 0;
		}

		return (completedTrackCount(trackId) / track.deliverableIds.length) * 100;
	}

	function isTrackComplete(trackId) {
		const track = plannerTracks.find((item) => item.id === trackId);
		return Boolean(track?.deliverableIds.length) && completedTrackCount(trackId) === track.deliverableIds.length;
	}

	function trackWeight(trackId) {
		return trackWeightLookup[trackId] || 0;
	}

	function weightPercent(weight) {
		return (weight / totalWeight) * 100;
	}

	function trackShare(trackId) {
		return weightPercent(trackWeight(trackId));
	}

	function formatPercent(value) {
		return `${value.toFixed(1)}%`;
	}

	function formatProjectDate(value) {
		if (!value || !isFinite(Date.parse(value))) {
			return "Just now";
		}

		return new Intl.DateTimeFormat(undefined, {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		}).format(new Date(value));
	}

	function projectInitials(project) {
		const source = sanitizeProjectName(project?.name || "Civ Mod");
		const words = source.split(" ").filter(Boolean);
		return (
			words
				.slice(0, 2)
				.map((word) => word[0]?.toUpperCase() || "")
				.join("") || "CM"
		);
	}

	function deliverableStepNumber(deliverableId) {
		const index = activeTrackDeliverables.findIndex((item) => item.id === deliverableId);
		return index >= 0 ? index + 1 : 0;
	}

	function deliverablePathState(deliverableId) {
		if (isDeliverableDone(deliverableId)) {
			return "Complete";
		}
		if (activeDeliverable?.id === deliverableId && activeTrackNextDeliverable?.id === deliverableId) {
			return "Current Step";
		}
		if (activeTrackNextDeliverable?.id === deliverableId) {
			return "Up Next";
		}
		if (activeDeliverable?.id === deliverableId) {
			return "Viewing";
		}
		return "Queued";
	}

	function deliverablePathClass(deliverableId) {
		if (isDeliverableDone(deliverableId)) {
			return "is-done";
		}
		if (activeDeliverable?.id === deliverableId && activeTrackNextDeliverable?.id === deliverableId) {
			return "is-current";
		}
		if (activeTrackNextDeliverable?.id === deliverableId) {
			return "is-next";
		}
		if (activeDeliverable?.id === deliverableId) {
			return "is-viewing";
		}
		return "is-queued";
	}

	function handleDeliverableCardKeydown(event, deliverableId) {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}
		event.preventDefault();
		selectDeliverable(deliverableId);
	}

	function priorityLabel(weight) {
		const percent = weightPercent(weight);
		if (percent >= 9) {
			return "Critical";
		}
		if (percent >= 4) {
			return "High";
		}
		if (percent >= 2) {
			return "Medium";
		}
		return "Low";
	}

	function priorityTone(weight) {
		const percent = weightPercent(weight);
		if (percent >= 9) {
			return "is-critical";
		}
		if (percent >= 4) {
			return "is-high";
		}
		if (percent >= 2) {
			return "is-medium";
		}
		return "is-support";
	}

	function resourceTone(resource) {
		if (resource?.disabled) {
			return "is-disabled";
		}
		return "is-live";
	}

	function resourceSurfaceLabel(resource) {
		const href = String(resource?.href || "");
		const kind = String(resource?.kind || "").toLowerCase();

		if (href.includes("/schema-browser")) return "Schema";
		if (href.includes("/lua-api-explorer")) return "Lua API";
		if (href.includes("/pattern-library")) return "Pattern";
		if (href.includes("/template-generators")) return "Generator";
		if (href.includes("/map-viewer")) return "Viewer";
		if (href.includes("/modinfo-builder") || href.includes("/civ5mod-ziper") || href.includes("/workshop-uploader")) return "Publish";
		if (href.includes("/dds-converter") || href.includes("/civ-icon-maker") || href.includes("/text-screen-viewer")) return "UI";
		if (kind === "directory") return "Directory";
		if (kind === "tutorial") return "Tutorial";
		if (kind === "viewer") return "Viewer";
		if (kind === "reference") return "Reference";
		return resource?.kind || "Tool";
	}

	function resourceAccentClass(resource) {
		const href = String(resource?.href || "");

		if (href.includes("/schema-browser")) return "is-schema";
		if (href.includes("/lua-api-explorer")) return "is-lua";
		if (href.includes("/pattern-library")) return "is-pattern";
		if (href.includes("/template-generators")) return "is-generator";
		if (href.includes("/workshop-uploader") || href.includes("/modinfo-builder") || href.includes("/civ5mod-ziper")) return "is-publish";
		if (href.includes("/dds-converter") || href.includes("/civ-icon-maker") || href.includes("/text-screen-viewer")) return "is-ui";
		if (href.includes("/map-viewer") || href.includes("/tech-tree-viewer")) return "is-viewer";
		if (href.includes("/religion-support") || href.includes("/modded-civs-pedia")) return "is-support";
		return "is-tool";
	}

	function trackAccentClass(trackId) {
		switch (trackId) {
			case "foundation":
				return "is-foundation";
			case "text":
				return "is-text";
			case "gameplay":
				return "is-gameplay";
			case "art":
				return "is-art";
			case "presentation":
				return "is-presentation";
			case "text-polish":
				return "is-text-polish";
			case "ship":
				return "is-ship";
			default:
				return "is-foundation";
		}
	}

	function formatCount(count, singular, plural) {
		return `${count} ${count === 1 ? singular : plural}`;
	}

	function projectCompletionPercent(project) {
		if (!plannerDeliverables.length) {
			return 0;
		}
		return ((project?.completedDeliverableIds?.length || 0) / plannerDeliverables.length) * 100;
	}

	function projectCurrentTrack(project) {
		return plannerTracks.find((track) => track.id === project?.activeTrackId) ?? plannerTracks[0] ?? null;
	}

	function projectCurrentDeliverable(project) {
		return plannerDeliverables.find((deliverable) => deliverable.id === project?.activeDeliverableId) ?? null;
	}

	function projectCloudTone(project) {
		if (project?.ownerEmail && project.ownerEmail !== signedInPlannerEmail) {
			return "is-shared";
		}
		if (project?.cloudSyncedAt) {
			return "is-cloud";
		}
		return "is-local";
	}

	function projectCloudLabel(project) {
		if (project?.ownerEmail && project.ownerEmail !== signedInPlannerEmail) {
			return `Shared by ${project.ownerEmail}`;
		}
		if (project?.cloudSyncedAt && project?.collaboratorEmails?.length) {
			return `Shared with ${formatCount(project.collaboratorEmails.length, "collaborator", "collaborators")}`;
		}
		if (project?.cloudSyncedAt) {
			return "Cloud synced";
		}
		return "Local only";
	}

	function setProjectNotice(message, tone = "info") {
		projectNotice = message;
		projectNoticeTone = tone;
	}

	function switchProject(projectId) {
		const nextProject = plannerProjects.find((project) => project.id === projectId);
		if (!nextProject) {
			return;
		}

		activeProjectId = nextProject.id;
		syncProjectDrafts(nextProject);
		setProjectNotice("", "info");
	}

	function createProjectFromScratch() {
		const nextProject = createPlannerProject({
			name: buildProjectName("New Civ Mod"),
		});
		commitProjects([nextProject, ...plannerProjects], nextProject.id);
		setProjectNotice(`Created ${nextProject.name}.`, "success");
	}

	function duplicateActiveProject() {
		if (!activeProject) {
			return;
		}

		const duplicatedProject = createPlannerProject({
			...serializeProjectRecord(activeProject),
			id: createProjectId(),
			name: buildProjectName(`${activeProject.name} Copy`),
			ownerEmail: "",
			cloudSyncedAt: "",
			collaboratorEmails: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		commitProjects([duplicatedProject, ...plannerProjects], duplicatedProject.id);
		setProjectNotice(`Duplicated ${activeProject.name}.`, "success");
	}

	function deleteActiveProject() {
		if (!activeProject || plannerProjects.length <= 1) {
			return;
		}

		if (typeof window !== "undefined" && !window.confirm(`Delete ${activeProject.name}? This only removes the local planner project.`)) {
			return;
		}

		const remainingProjects = plannerProjects.filter((project) => project.id !== activeProject.id);
		commitProjects(remainingProjects, remainingProjects[0]?.id || "");
		setProjectNotice(`Deleted ${activeProject.name}.`, "success");
	}

	function applyActiveProjectNameDraft() {
		if (!activeProject) {
			return;
		}

		const nextName = sanitizeProjectName(projectNameDraft) || activeProject.name;
		updateActiveProject((project) => ({
			...project,
			name: nextName,
		}));
		projectNameDraft = nextName;
	}

	function handleProjectNameKeydown(event) {
		if (event.key !== "Enter") {
			return;
		}

		event.preventDefault();
		applyActiveProjectNameDraft();
	}

	function applyCollaboratorDraft() {
		if (!activeProject) {
			return;
		}

		const nextCollaborators = normalizeCollaboratorEmails(collaboratorDraft, activeProject.ownerEmail || signedInPlannerEmail);
		updateActiveProject((project) => ({
			...project,
			collaboratorEmails: nextCollaborators,
		}));
		collaboratorDraft = nextCollaborators.join(", ");
		setProjectNotice(nextCollaborators.length ? "Updated collaborator list. Save to cloud to share the project." : "Cleared collaborator list.", "success");
	}

	function buildExportPayload(projectsToExport, nextActiveProjectId = activeProjectId) {
		return {
			kind: PLANNER_EXPORT_KIND,
			version: 2,
			exportedAt: new Date().toISOString(),
			activeProjectId: nextActiveProjectId,
			projects: projectsToExport.map((project) => serializeProjectRecord(project)),
		};
	}

	function triggerPlannerImport() {
		plannerImportInput?.click();
	}

	function triggerProjectIconUpload() {
		projectIconInput?.click();
	}

	function downloadExport(filename, payload) {
		if (typeof document === "undefined") {
			return;
		}

		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	function downloadTextFile(filename, content, contentType = "text/plain;charset=utf-8") {
		if (typeof document === "undefined") {
			return;
		}

		const blob = new Blob([content], {
			type: contentType,
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	function slugifyFilename(value) {
		return (
			String(value || "planner-project")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "")
				.slice(0, 64) || "planner-project"
		);
	}

	function exportActiveProject() {
		if (!activeProject) {
			return;
		}

		downloadExport(`${slugifyFilename(activeProject.name)}-planner.json`, buildExportPayload([activeProject], activeProject.id));
		setProjectNotice(`Exported ${activeProject.name}.`, "success");
	}

	function buildChecklistExport(project = activeProject) {
		if (!project) {
			return "";
		}

		const lines = [`${project.name} Checklist`, "", `Exported: ${new Date().toLocaleString()}`, `Completed: ${project.completedDeliverableIds.length}/${plannerDeliverables.length}`, ""];

		for (const track of plannerTracks) {
			lines.push(`${track.label}`);
			lines.push("-".repeat(track.label.length));

			for (const deliverableId of track.deliverableIds) {
				const deliverable = plannerDeliverables.find((item) => item.id === deliverableId);
				if (!deliverable) {
					continue;
				}

				const isDone = project.completedDeliverableIds.includes(deliverableId);
				lines.push(`${isDone ? "[x]" : "[ ]"} ${deliverable.label}`);
			}

			lines.push("");
		}

		return lines.join("\n");
	}

	function exportActiveChecklist() {
		if (!activeProject) {
			return;
		}

		downloadTextFile(`${slugifyFilename(activeProject.name)}-checklist.txt`, buildChecklistExport(activeProject));
		setProjectNotice(`Exported checklist for ${activeProject.name}.`, "success");
	}

	function exportAllProjects() {
		if (!plannerProjects.length) {
			return;
		}

		downloadExport("cmc-guided-planner-projects.json", buildExportPayload(plannerProjects));
		setProjectNotice(`Exported ${formatCount(plannerProjects.length, "project", "projects")}.`, "success");
	}

	function readFileAsDataUrl(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ""));
			reader.onerror = () => reject(new Error("Unable to read that file."));
			reader.readAsDataURL(file);
		});
	}

	function blobToDataUrl(blob) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ""));
			reader.onerror = () => reject(new Error("Unable to read the planner icon."));
			reader.readAsDataURL(blob);
		});
	}

	function dataUrlToBlob(dataUrl) {
		const [header, payload] = String(dataUrl || "").split(",", 2);
		if (!header || !payload) {
			throw new Error("Unable to decode that planner icon.");
		}

		const mimeMatch = header.match(/data:(.*?);base64/);
		const mimeType = mimeMatch?.[1] || "image/png";
		const binary = atob(payload);
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index);
		}
		return new Blob([bytes], {
			type: mimeType,
		});
	}

	function plannerProjectIconPath(project) {
		return `${project.id}/icon.png`;
	}

	async function fetchProjectIconDataUrl(client, project) {
		if (!project?.iconPath) {
			return "";
		}

		const { data, error } = await client.storage.from(SUPABASE_PLANNER_ICONS_BUCKET).download(project.iconPath);
		if (error) {
			throw error;
		}

		return blobToDataUrl(data);
	}

	async function hydrateCloudProjectIcons(client, projects) {
		return Promise.all(
			projects.map(async (project) => {
				if (!project.iconPath) {
					return project;
				}

				try {
					const iconDataUrl = await fetchProjectIconDataUrl(client, project);
					return normalizeProject({
						...project,
						iconDataUrl,
					});
				} catch {
					return project;
				}
			}),
		);
	}

	async function uploadPlannerProjectIcon(client, project, file) {
		const iconPath = plannerProjectIconPath(project);
		const { error } = await client.storage.from(SUPABASE_PLANNER_ICONS_BUCKET).upload(iconPath, file, {
			upsert: true,
			contentType: "image/png",
			cacheControl: "3600",
		});

		if (error) {
			throw error;
		}

		return iconPath;
	}

	async function removePlannerProjectIcon(client, project) {
		if (!project?.iconPath) {
			return;
		}

		const { error } = await client.storage.from(SUPABASE_PLANNER_ICONS_BUCKET).remove([project.iconPath]);
		if (error) {
			throw error;
		}
	}

	async function handleProjectIconChange(event) {
		const file = event.currentTarget?.files?.[0];
		if (!file || !activeProject) {
			return;
		}

		try {
			if (file.type && file.type !== "image/png") {
				throw new Error("Use a 256 x 256 PNG exported from the icon maker.");
			}

			const iconDataUrl = await readFileAsDataUrl(file);
			const iconUpdatedAt = new Date().toISOString();
			let iconPath = activeProject.iconPath || "";

			if (cloudSyncReady && activeProject.cloudSyncedAt) {
				const client = await getPlannerCloudClient();
				iconPath = await uploadPlannerProjectIcon(client, activeProject, file);
				const nextCloudState = {
					...activeProject,
					iconPath,
					iconFileName: file.name || "civ-icon.png",
					iconUpdatedAt,
				};
				const { error } = await client
					.from(SUPABASE_PLANNER_PROJECTS_TABLE)
					.update({
						name: nextCloudState.name,
						collaborator_emails: nextCloudState.collaboratorEmails,
						icon_path: iconPath,
						icon_updated_at: iconUpdatedAt,
						project_state: serializeProjectForCloud(nextCloudState),
					})
					.eq("id", activeProject.id);

				if (error) {
					throw error;
				}
			}

			updateActiveProject((project) => ({
				...project,
				iconDataUrl,
				iconFileName: file.name || "civ-icon.png",
				iconPath,
				iconUpdatedAt,
			}));
			setProjectNotice(
				iconPath
					? "Applied the civ icon preview and synced it for shared planner access."
					: "Applied the civ icon preview. It stays local and in JSON exports until the project is cloud-synced.",
				"success",
			);
		} catch (error) {
			setProjectNotice(error?.message || "Unable to apply that civ icon.", "error");
		} finally {
			event.currentTarget.value = "";
		}
	}

	function clearActiveProjectIcon() {
		if (!activeProject?.iconDataUrl) {
			return;
		}

		void (async () => {
			try {
				if (cloudSyncReady && activeProject.iconPath) {
					const client = await getPlannerCloudClient();
					await removePlannerProjectIcon(client, activeProject);
					const nextCloudState = {
						...activeProject,
						iconDataUrl: "",
						iconFileName: "",
						iconPath: "",
						iconUpdatedAt: "",
					};
					const { error } = await client
						.from(SUPABASE_PLANNER_PROJECTS_TABLE)
						.update({
							name: nextCloudState.name,
							collaborator_emails: nextCloudState.collaboratorEmails,
							icon_path: null,
							icon_updated_at: null,
							project_state: serializeProjectForCloud(nextCloudState),
						})
						.eq("id", activeProject.id);

					if (error) {
						throw error;
					}
				}

				updateActiveProject((project) => ({
					...project,
					iconDataUrl: "",
					iconFileName: "",
					iconPath: "",
					iconUpdatedAt: "",
				}));
				setProjectNotice("Cleared the civ icon preview from this project.", "success");
			} catch (error) {
				setProjectNotice(error?.message || "Unable to clear that civ icon.", "error");
			}
		})();
	}

	function parseImportedProjects(payload) {
		if (Array.isArray(payload) && payload.every((item) => typeof item === "string")) {
			return {
				projects: [
					createPlannerProject({
						name: buildProjectName("Imported Civ Mod"),
						completedDeliverableIds: payload,
					}),
				],
				activeId: "",
			};
		}

		if (payload?.kind === PLANNER_EXPORT_KIND && Array.isArray(payload.projects)) {
			return {
				projects: payload.projects.map((project) =>
					normalizeProject({
						...project,
						id: createProjectId(),
						name: buildProjectName(project.name || "Imported Civ Mod"),
						ownerEmail: "",
						cloudSyncedAt: "",
					}),
				),
				activeId: payload.activeProjectId || "",
			};
		}

		if (Array.isArray(payload?.projects)) {
			return {
				projects: payload.projects.map((project) =>
					normalizeProject({
						...project,
						id: createProjectId(),
						name: buildProjectName(project.name || "Imported Civ Mod"),
					}),
				),
				activeId: payload.activeProjectId || "",
			};
		}

		if (payload?.project) {
			return {
				projects: [
					normalizeProject({
						...payload.project,
						id: createProjectId(),
						name: buildProjectName(payload.project.name || "Imported Civ Mod"),
					}),
				],
				activeId: "",
			};
		}

		if (payload && typeof payload === "object") {
			return {
				projects: [
					normalizeProject({
						...payload,
						id: createProjectId(),
						name: buildProjectName(payload.name || "Imported Civ Mod"),
					}),
				],
				activeId: "",
			};
		}

		return {
			projects: [],
			activeId: "",
		};
	}

	async function handlePlannerImport(event) {
		const file = event.currentTarget?.files?.[0];
		if (!file) {
			return;
		}

		try {
			const payload = JSON.parse(await file.text());
			const imported = parseImportedProjects(payload);
			if (!imported.projects.length) {
				throw new Error("That file does not contain planner projects.");
			}

			const mergedProjects = [...imported.projects, ...plannerProjects];
			const nextActiveProjectId = imported.projects.find((project) => project.id === imported.activeId)?.id || imported.projects[0]?.id || activeProjectId;
			commitProjects(mergedProjects, nextActiveProjectId);
			setProjectNotice(`Imported ${formatCount(imported.projects.length, "project", "projects")}.`, "success");
		} catch (error) {
			setProjectNotice(error?.message || "Unable to import that planner file.", "error");
		} finally {
			event.currentTarget.value = "";
		}
	}

	async function getPlannerCloudClient() {
		if (!cloudSyncReady) {
			throw new Error("Sign in to use cloud planner sync.");
		}

		const nextClientKey = `${SUPABASE_URL}:${authAccessToken}`;
		if (plannerCloudClient && plannerCloudClientKey === nextClientKey) {
			return plannerCloudClient;
		}

		const module = await import("@supabase/supabase-js");
		plannerCloudClient = module.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
			},
			global: {
				headers: {
					Authorization: `Bearer ${authAccessToken}`,
				},
			},
		});
		plannerCloudClientKey = nextClientKey;
		return plannerCloudClient;
	}

	function mergeCloudProjects(nextProjects) {
		const currentById = new Map(plannerProjects.map((project) => [project.id, project]));
		const merged = [...plannerProjects];

		for (const project of nextProjects) {
			const existing = currentById.get(project.id);
			if (!existing) {
				merged.unshift(project);
				currentById.set(project.id, project);
				continue;
			}

			const remoteStamp = Date.parse(project.updatedAt || project.cloudSyncedAt || 0);
			const localStamp = Date.parse(existing.updatedAt || existing.cloudSyncedAt || 0);
			if (remoteStamp >= localStamp) {
				const nextProject = normalizeProject({
					...existing,
					...project,
				});
				const projectIndex = merged.findIndex((item) => item.id === project.id);
				merged[projectIndex] = nextProject;
				currentById.set(project.id, nextProject);
			}
		}

		return merged;
	}

	async function loadCloudProjects({ silent = false } = {}) {
		if (!cloudSyncAvailable) {
			if (!silent) {
				setProjectNotice("Cloud sync is not configured for this environment.", "error");
			}
			return;
		}

		if (!cloudSyncReady) {
			if (!silent) {
				setProjectNotice("Sign in to load planner projects from Supabase.", "error");
			}
			return;
		}

		cloudLoading = true;
		try {
			const client = await getPlannerCloudClient();
			const [ownedResult, sharedResult] = await Promise.all([
				client
					.from(SUPABASE_PLANNER_PROJECTS_TABLE)
					.select("id, name, owner_email, collaborator_emails, icon_path, icon_updated_at, project_state, created_at, updated_at")
					.eq("owner_email", signedInPlannerEmail),
				client
					.from(SUPABASE_PLANNER_PROJECTS_TABLE)
					.select("id, name, owner_email, collaborator_emails, icon_path, icon_updated_at, project_state, created_at, updated_at")
					.contains("collaborator_emails", [signedInPlannerEmail]),
			]);

			if (ownedResult.error) {
				throw ownedResult.error;
			}
			if (sharedResult.error) {
				throw sharedResult.error;
			}

			const cloudProjects = [...(ownedResult.data || []), ...(sharedResult.data || [])]
				.reduce((lookup, row) => {
					lookup.set(row.id, row);
					return lookup;
				}, new Map())
				.values();

			const remoteProjects = await hydrateCloudProjectIcons(
				client,
				[...cloudProjects].map((row) => projectFromCloudRow(row)),
			);
			if (remoteProjects.length) {
				commitProjects(mergeCloudProjects(remoteProjects), activeProjectId);
			}

			if (!silent) {
				setProjectNotice(remoteProjects.length ? `Loaded ${formatCount(remoteProjects.length, "cloud project", "cloud projects")}.` : "No cloud planner projects found yet.", "success");
			}
		} catch (error) {
			if (!silent) {
				setProjectNotice(error?.message || "Unable to load cloud planner projects.", "error");
			}
		} finally {
			cloudLoading = false;
		}
	}

	async function saveActiveProjectToCloud() {
		if (!activeProject) {
			return;
		}

		if (!cloudSyncAvailable) {
			setProjectNotice("Cloud sync is not configured for this environment.", "error");
			return;
		}

		if (!cloudSyncReady) {
			setProjectNotice("Sign in to save planner projects to Supabase.", "error");
			return;
		}

		cloudLoading = true;
		try {
			const client = await getPlannerCloudClient();
			const nextOwnerEmail = activeProject.ownerEmail || signedInPlannerEmail;
			const nextUpdatedAt = new Date().toISOString();
			let iconPath = activeProject.iconPath || "";
			let iconUpdatedAt = activeProject.iconUpdatedAt || "";

			if (activeProject.iconDataUrl && !iconPath) {
				const iconBlob = dataUrlToBlob(activeProject.iconDataUrl);
				const iconFile = new File([iconBlob], activeProject.iconFileName || "civ-icon.png", {
					type: iconBlob.type || "image/png",
				});
				iconPath = await uploadPlannerProjectIcon(client, activeProject, iconFile);
				iconUpdatedAt = nextUpdatedAt;
			}

			const basePayload = {
				name: activeProject.name,
				collaborator_emails: activeProject.collaboratorEmails,
				project_state: serializeProjectForCloud({
					...activeProject,
					iconPath,
					iconUpdatedAt,
					ownerEmail: nextOwnerEmail,
					updatedAt: nextUpdatedAt,
				}),
				icon_path: iconPath || null,
				icon_updated_at: iconUpdatedAt || null,
				updated_at: nextUpdatedAt,
			};

			const projectQuery = client.from(SUPABASE_PLANNER_PROJECTS_TABLE);
			const response =
				activeProject.ownerEmail || activeProject.cloudSyncedAt
					? await projectQuery
							.update(basePayload)
							.eq("id", activeProject.id)
							.select("id, name, owner_email, collaborator_emails, icon_path, icon_updated_at, project_state, created_at, updated_at")
							.single()
					: await projectQuery
							.upsert(
								{
									id: activeProject.id,
									owner_email: nextOwnerEmail,
									...basePayload,
								},
								{
									onConflict: "id",
								},
							)
							.select("id, name, owner_email, collaborator_emails, icon_path, icon_updated_at, project_state, created_at, updated_at")
							.single();

			const { data, error } = response;

			if (error) {
				throw error;
			}

			const remoteProject = projectFromCloudRow(data);
			commitProjects(mergeCloudProjects([remoteProject]), remoteProject.id);
			setProjectNotice(
				remoteProject.collaboratorEmails.length
					? `Saved to cloud and shared with ${formatCount(remoteProject.collaboratorEmails.length, "collaborator", "collaborators")}.`
					: "Saved planner project to cloud.",
				"success",
			);
		} catch (error) {
			setProjectNotice(error?.message || "Unable to save the planner project to Supabase.", "error");
		} finally {
			cloudLoading = false;
		}
	}

	function joinLabelList(items) {
		if (!items.length) {
			return "";
		}
		if (items.length === 1) {
			return items[0];
		}
		if (items.length === 2) {
			return `${items[0]} and ${items[1]}`;
		}
		return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
	}

	function buildDeliverableInstructionBlocks(deliverable) {
		if (!deliverable) {
			return [];
		}

		const dependencyLabels = deliverable.dependencies.map((dependencyId) => plannerDeliverables.find((item) => item.id === dependencyId)?.label).filter(Boolean);
		const resourceLabels = (deliverable.resourceIds || []).map((resourceId) => siteResourcesById[resourceId]?.label).filter(Boolean);
		const tutorialLabels = (deliverable.tutorialIds || []).map((tutorialId) => tutorialById[tutorialId]?.label).filter(Boolean);

		return [
			{
				title: "Start With",
				copy: dependencyLabels.length
					? `Lock ${joinLabelList(dependencyLabels)} first, then use this pass to do the specific work described here: ${deliverable.focus}`
					: `Use this pass to do the specific work described here: ${deliverable.focus}`,
			},
			{
				title: "While Building",
				copy: resourceLabels.length
					? `Keep ${joinLabelList(resourceLabels.slice(0, 4))} open while you work so you can check game context, references, and supporting files as you go.${tutorialLabels.length ? ` Planned tutorial coverage for this step includes ${joinLabelList(tutorialLabels.slice(0, 3))}.` : ""}`
					: tutorialLabels.length
						? `Use the linked planner surfaces as your main support, and treat ${joinLabelList(tutorialLabels.slice(0, 3))} as the future tutorial routes for this step.`
						: "Use the linked planner surfaces as your working support while you build, test, and verify the step.",
			},
			{
				title: "Do Not Move On Until",
				copy: `${deliverable.doneLabel} Watch for this failure mode while closing the step: ${deliverable.hint}`,
			},
		];
	}
</script>

<svelte:window onkeydown={handleWindowKeyDown} />

<section class="planner-page">
	<header class="hero planner-hero">
		<div class="planner-hero-layout">
			<div class="planner-hero-copy">
				<p class="eyebrow">Guided Planner</p>
				<h1>Build a civ mod like a campaign,<br /> not a flat checklist.</h1>
				<p>Work in grouped lanes, follow logical step progression, and keep progress saved while you move from design through workshop release.</p>

				<div class="planner-hero-map" aria-label="Planner campaign map preview">
					<p class="planner-hero-map-caption">Campaign route preview</p>

					<div class="planner-hero-route">
						{#each plannerTracks as track, index (track.id)}
							<article class={["planner-hero-route-card", trackAccentClass(track.id), activeTrack?.id === track.id && "is-active", isTrackComplete(track.id) && "is-complete"]}>
								<div class="planner-hero-route-top">
									<span class="planner-hero-route-index">{index + 1}</span>
									<strong class="planner-hero-route-label">{track.label}</strong>
								</div>
								<div class="planner-hero-route-meter" aria-hidden="true">
									<span style={`width: ${trackCompletionPercent(track.id)}%`}></span>
								</div>
							</article>
						{/each}
					</div>
				</div>

				<!-- <div class="planner-hero-summary" aria-label="Active planner summary">
					<article class="planner-hero-chip">
						<span class="planner-hero-chip-label">Active civ</span>
						<strong>{activeProject?.name || "New Civ Mod"}</strong>
					</article>
					<article class="planner-hero-chip">
						<span class="planner-hero-chip-label">Current lane</span>
						<strong>{activeTrack?.label || "Foundation"}</strong>
					</article>
					<article class="planner-hero-chip">
						<span class="planner-hero-chip-label">Next stop</span>
						<strong>{activeTrackNextDeliverable?.label || "Pick a step"}</strong>
					</article>
				</div> -->
			</div>

			<aside class="planner-hero-guide" aria-label="How to use the planner">
				<p class="eyebrow">How To Use</p>
				<h2 class="section-title">If you're new to the planner, here's how to get started</h2>
				<ol class="planner-hero-steps">
					<li>
						<strong>Choose your starting lane</strong>
						<span>If this will be your first civ mod, start with the first lane and work in the suggested order.</span>
					</li>
					<li>
						<strong>Go step-by-step or jump around</strong>
						<span>You can either follow the checklist sequentially or jump around to prioritize tasks you are comfortable with.</span>
					</li>
					<li>
						<strong>Track completion</strong>
						<span>Progress is saved locally so finished work fades back and blockers to release stay visible.</span>
					</li>
				</ol>
			</aside>
		</div>
	</header>

	<section class="project-hub" aria-label="Planner projects">
		<details class="project-hub-disclosure" bind:open={projectDeskOpen}>
			<summary class="project-hub-summary">
				<div class="project-hub-summary-copy">
					<p class="eyebrow">Project Desk</p>
					<h2 class="section-title">{activeProject?.name || "Planner projects"}</h2>
					<p class="project-hub-summary-note">Open your desk to access the civ switcher and export controls.</p>
				</div>
				<div class="project-hub-summary-meta">
					<span>{plannerProjects.length} civs</span>
					{#if activeProject}
						<!-- <span>{projectCurrentTrack(activeProject)?.label || "Foundation"} · {projectCurrentDeliverable(activeProject)?.label || "Choose a step"}</span> -->
						<span>Active: {completedDeliverableCount}/{plannerDeliverables.length} done</span>
					{/if}
					<span class="project-hub-summary-action">
						<strong>{projectDeskOpen ? "Close desk" : "Open desk"}</strong>
					</span>
				</div>
			</summary>

			<div class="project-hub-body">
				<!-- <div class="project-hub-overview">
					<div>
						<p class="eyebrow">Project Desk</p>
						<h2 class="section-title">Keep each civ in one focused lane.</h2>
						<p class="section-copy">Switch projects, check route position, export progress, and manage cloud sharing without the desk fighting for attention.</p>
					</div>
					<div class="project-hub-overview-meta" aria-label="Project desk summary">
						<span>{plannerProjects.length} civs</span>
						<span>{completedDeliverableCount}/{plannerDeliverables.length} steps done</span>
						<span>{formatPercent(overallCompletionPercent)} overall</span>
					</div>
				</div> -->

				<div class="project-hub-grid">
					<div class="project-rail">
						<div class="project-rail-head">
							<div class="stack half">
								<p class="eyebrow">Project Switcher</p>
								<h3 class="card-title">Choose the civ you are actively working.</h3>
							</div>
							<p class="card-copy">Each civ project preserves its current route, completion state, icon, and share setup.</p>
						</div>

						<div class="project-toolbar" aria-label="Planner project actions">
							<button type="button" class="project-tool-button" onclick={createProjectFromScratch}>New Project</button>
							<button type="button" class="project-tool-button" onclick={duplicateActiveProject} disabled={!activeProject}>Duplicate</button>
							<button type="button" class="project-tool-button" onclick={triggerPlannerImport}>Import JSON</button>
							<button type="button" class="project-tool-button" onclick={exportAllProjects} disabled={!plannerProjects.length}>Export All</button>
						</div>

						<div class="project-list" aria-label="Saved civ planner projects">
							{#each orderedProjects as project (project.id)}
								<button type="button" class={["project-row", projectCloudTone(project), activeProjectId === project.id && "is-active"]} onclick={() => switchProject(project.id)}>
									<span class="project-row-icon" aria-hidden="true">
										{#if project.iconDataUrl}
											<img src={project.iconDataUrl} alt="" />
										{:else}
											<span class="project-row-initials">{projectInitials(project)}</span>
										{/if}
									</span>

									<div class="project-row-copy">
										<div class="project-row-head">
											<div>
												<strong class="card-title">{project.name}</strong>
												<span>{projectCloudLabel(project)}</span>
											</div>
											<span class="project-row-share">{formatPercent(projectCompletionPercent(project))}</span>
										</div>
										<p class="project-row-route card-copy">
											{projectCurrentTrack(project)?.label || "Foundation"} · {projectCurrentDeliverable(project)?.label || "Choose a step"}
										</p>
										<div class="project-row-meter" aria-hidden="true">
											<span style={`width: ${projectCompletionPercent(project)}%`}></span>
										</div>
										<div class="project-row-meta">
											<span>{project.completedDeliverableIds.length}/{plannerDeliverables.length} done</span>
											<span>{formatProjectDate(project.updatedAt)}</span>
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>

					{#if activeProject}
						<aside class="project-inspector" aria-label={`${activeProject.name} project settings`}>
							<div class="project-inspector-hero">
								<button
									type="button"
									class={["project-icon-preview", "is-clickable", projectCloudTone(activeProject)]}
									aria-label={`Upload a new icon for ${activeProject.name}`}
									onclick={triggerProjectIconUpload}
								>
									{#if activeProject.iconDataUrl}
										<img src={activeProject.iconDataUrl} alt={`${activeProject.name} civ icon preview`} />
									{:else}
										<span class="project-icon-placeholder">{projectInitials(activeProject)}</span>
									{/if}
								</button>

								<div class="project-inspector-hero-copy">
									<p class="eyebrow">Active Project</p>
									<h3 class="card-title">{activeProject.name}</h3>
									<p class="card-copy">
										{projectCurrentTrack(activeProject)?.label || "Foundation"} lane, {projectCurrentDeliverable(activeProject)?.label || "Choose a deliverable"} selected.
									</p>
									{#if activeProject.iconFileName}
										<p class="project-icon-file">{activeProject.iconFileName}</p>
									{/if}
								</div>

								<span class={["project-sync-pill", projectCloudTone(activeProject)]}>{projectCloudLabel(activeProject)}</span>
							</div>

							<div class="project-inspector-stats">
								<article class="project-mini-card">
									<span>Progress</span>
									<strong class="card-title">{completedDeliverableCount}/{plannerDeliverables.length}</strong>
									<p class="card-copy">{formatPercent(overallCompletionPercent)} complete in this civ plan.</p>
								</article>
								<article class="project-mini-card">
									<span>Current Focus</span>
									<strong class="card-title">{projectCurrentTrack(activeProject)?.label || "Foundation"}</strong>
									<p class="card-copy">{projectCurrentDeliverable(activeProject)?.label || "Choose a deliverable"} is the current active step.</p>
								</article>
								<article class="project-mini-card">
									<span>Sync State</span>
									<strong class="card-title">{projectCloudLabel(activeProject)}</strong>
									<p class="card-copy">
										{activeProject.collaboratorEmails.length
											? `${formatCount(activeProject.collaboratorEmails.length, "collaborator", "collaborators")} attached.`
											: "No collaborators attached yet."}
									</p>
								</article>
							</div>

							<label class="project-field">
								<span>Project name</span>
								<input type="text" bind:value={projectNameDraft} onblur={applyActiveProjectNameDraft} onkeydown={handleProjectNameKeydown} placeholder="New Civ Mod" />
							</label>

							<div class="inline flex-wrap">
								<div class="project-toolbar project-toolbar--icon inline half start" aria-label="Civ icon actions">
									<label class="project-tool-button project-tool-button--file">
										<span>Upload Icon</span>
										<input bind:this={projectIconInput} type="file" accept="image/png" class="project-icon-input" onchange={handleProjectIconChange} />
									</label>
									<a class="project-tool-link" href="/civ-icon-maker" target="_blank" rel="noopener noreferrer">Open Icon Maker</a>
									<button type="button" class="project-tool-button" onclick={clearActiveProjectIcon} disabled={!activeProject.iconDataUrl}>Clear Icon</button>
								</div>
								|
								<div class="project-toolbar project-toolbar--primary inline half start" aria-label="Active project export actions">
									<button type="button" class="project-tool-button" onclick={exportActiveProject}>Export Project</button>
									<button type="button" class="project-tool-button" onclick={exportActiveChecklist} disabled={!activeProject}>Export Checklist</button>
									<button type="button" class="project-tool-button" onclick={duplicateActiveProject}>Duplicate</button>
									<button type="button" class="project-tool-button is-danger" onclick={deleteActiveProject} disabled={plannerProjects.length <= 1}>Delete</button>
								</div>
							</div>

							<section class="project-share-panel" aria-label="Cloud sync and sharing">
								<div class="section-heading">
									<p class="eyebrow">Sync & Share</p>
									<h3 class="section-title">Keep this civ local, export it, or share progrssion editing with others.</h3>
									<p class="section-copy">Shared projects can be pulled into another signed-in account and worked on collaboratively.</p>
								</div>

								{#if activeProjectShareLocked}
									<p class="project-share-note section-copy">
										This project belongs to {activeProject.ownerEmail}. You can edit the shared progress, but only the owner should manage collaborator emails.
									</p>
								{/if}

								<label class="project-field">
									<span>Collaborator emails</span>
									<textarea bind:value={collaboratorDraft} rows="3" placeholder="teammate@example.com, partner@example.com" disabled={activeProjectShareLocked}></textarea>
								</label>

								<div class="project-toolbar inline half start" aria-label="Cloud project actions">
									<button type="button" class="project-tool-button" onclick={applyCollaboratorDraft} disabled={activeProjectShareLocked}>Update Share List</button>
									<button type="button" class="project-tool-button" onclick={saveActiveProjectToCloud} disabled={!cloudSyncReady || cloudLoading}>
										{cloudLoading ? "Saving..." : activeProject.cloudSyncedAt ? "Save to Cloud" : "Create Cloud Save"}
									</button>
									<button type="button" class="project-tool-button" onclick={() => loadCloudProjects()} disabled={!cloudSyncReady || cloudLoading}>
										{cloudLoading ? "Refreshing..." : "Refresh Cloud"}
									</button>
								</div>

								{#if authUser}
									<p class="project-share-note section-copy">Signed in as {authUser.email}.</p>
								{:else if cloudSyncAvailable}
									<p class="project-share-note section-copy">Sign in from the nav to save projects to cloud and work on shared civs with other users.</p>
								{:else}
									<p class="project-share-note section-copy">Cloud sync is not configured in this environment. Local saves and JSON export/import still work.</p>
								{/if}
							</section>

							{#if projectNotice}
								<p class={["project-notice", `is-${projectNoticeTone}`]} role="status" aria-live="polite">{projectNotice}</p>
							{/if}
						</aside>
					{/if}
				</div>

				<input bind:this={plannerImportInput} type="file" accept="application/json" class="planner-import-input" onchange={handlePlannerImport} />
			</div>
		</details>
	</section>

	<section class="compass-panel" aria-label="Planning compass">
		<div class="section-heading compass-heading">
			<p class="eyebrow">New Modder Advice</p>
			<h2 class="section-title">Start smaller than you think, finish one clean idea, then build outward.</h2>
			<p class="section-copy">Most abandoned mods do not fail because the concept was weak. They fail because the first version tried to go beyond what the modder was prepared for.</p>
		</div>

		<div class="compass-grid">
			<article class="compass-card is-blueprint">
				<p class="eyebrow">First Win</p>
				<h3 class="card-title">Plan mechanics you can explain in a short sentence each.</h3>
				<p class="card-copy">
					A civilization with one solid unique ability, two working uniques, and clean / simple art is a better first release than an ambitious package full of half-finished systems.
				</p>
			</article>

			<article class="compass-card is-pressure">
				<p class="eyebrow">Scope Control</p>
				<h3 class="card-title">Work in small increments with clear wins along the way.</h3>
				<p class="card-copy">Get the database setup working first. Have uniques with maximum two abilities each or the number of things you need to code will compound.</p>
			</article>

			<article class="compass-card is-release">
				<p class="eyebrow">Learning Loop</p>
				<h3 class="card-title">Treat every bug as a clue to how Civ V actually works.</h3>
				<p class="card-copy">
					Check the tables you touched, read the logs, and test one change at a time. You improve fastest when each failure is treated as building your modding mental model.
				</p>
			</article>
		</div>
	</section>

	<section class="workbench-grid">
		<aside class="track-rail" aria-label="Planner tracks">
			<div class="section-heading">
				<p class="eyebrow">Focus Lanes</p>
				<h2 class="section-title">Tasks by Group</h2>
			</div>

			<div class="track-list">
				{#each plannerTracks as track (track.id)}
					<button
						type="button"
						class={["track-card", trackAccentClass(track.id), activeTrackId === track.id && "is-active", isTrackComplete(track.id) && "is-complete"]}
						onclick={() => selectTrack(track.id)}
					>
						<div class="track-card-head">
							<div>
								<span class="track-kicker">{track.kicker}</span>
								<h3 class="card-title">{track.label}</h3>
							</div>
							<strong>{formatPercent(trackShare(track.id))}</strong>
						</div>
						<p class="card-copy">{track.description}</p>
						<div class="track-meter" aria-hidden="true">
							<span style={`width: ${trackCompletionPercent(track.id)}%`}></span>
						</div>
						<div class="track-meta">
							<span>{completedTrackCount(track.id)} / {track.deliverableIds.length} done</span>
							<span>{formatPercent(trackShare(track.id))} Total</span>
						</div>
					</button>
				{/each}
			</div>
		</aside>

		<div class="focus-column">
			<section class="deliverable-strip-panel">
				<div class="section-heading">
					<p class="eyebrow">{activeTrack?.kicker}</p>
					<h2 class="section-title">{activeTrack?.label}</h2>
					<p class="section-copy">{activeTrack?.risk}</p>
				</div>

				<div class="deliverable-path-overview">
					<article class="path-overview-card">
						<span class="path-overview-kicker">Path Progress</span>
						<strong class="card-title">{completedTrackCount(activeTrack?.id)} of {activeTrackDeliverables.length} steps finished</strong>
						<p class="card-copy">Suggested to follow the numbered routes from top to bottom.</p>
					</article>

					<!-- {#if activeTrackNextDeliverable}
						<article class="path-overview-card is-next">
							<span class="path-overview-kicker">Next Stop</span>
							<strong class="card-title">Step {deliverableStepNumber(activeTrackNextDeliverable.id)}: {activeTrackNextDeliverable.label}</strong>
							<p class="card-copy">{activeTrackNextDeliverable.summary}</p>
							<button type="button" class="path-overview-action" onclick={() => selectDeliverable(activeTrackNextDeliverable.id)}> Jump to recommended step </button>
						</article>
					{/if} -->
				</div>

				<ol class="deliverable-path" aria-label={`${activeTrack?.label} deliverable path`}>
					{#each activeTrackDeliverables as item (item.id)}
						<li class={["deliverable-path-node", deliverablePathClass(item.id)]}>
							<div class="deliverable-step-marker" aria-hidden="true">
								<span>{deliverableStepNumber(item.id)}</span>
							</div>

							<div
								class={["deliverable-pill", priorityTone(item.weight), activeDeliverable?.id === item.id && "is-active", isDeliverableDone(item.id) && "is-complete"]}
								role="button"
								tabindex="0"
								aria-pressed={activeDeliverable?.id === item.id}
								onclick={() => selectDeliverable(item.id)}
								onkeydown={(event) => handleDeliverableCardKeydown(event, item.id)}
							>
								<div class="deliverable-step-head">
									<div>
										<span class="deliverable-step-number">Step {deliverableStepNumber(item.id)}</span>
										<h3 class="card-title">{item.label}</h3>
									</div>
									<div class="deliverable-step-meta">
										<span class="deliverable-step-state">{deliverablePathState(item.id)}</span>
										<span class="deliverable-step-share">{formatPercent(weightPercent(item.weight))}</span>
									</div>
								</div>

								<p class="deliverable-pill-kicker">{item.pillar}</p>
								<p class="deliverable-path-copy card-copy">{item.summary}</p>

								<div class="deliverable-node-actions">
									<button
										type="button"
										class={["deliverable-toggle", isDeliverableDone(item.id) && "is-complete"]}
										aria-pressed={isDeliverableDone(item.id)}
										onclick={(event) => {
											event.stopPropagation();
											toggleDeliverableDone(item.id);
										}}
										onkeydown={(event) => event.stopPropagation()}
									>
										{isDeliverableDone(item.id) ? "Mark incomplete" : "Mark complete"}
									</button>
								</div>
							</div>
						</li>
					{/each}
				</ol>
			</section>

			{#if activeDeliverable}
				<article class="deliverable-detail">
					<div class="deliverable-detail-head">
						<div class="deliverable-detail-title">
							<div class="pill-row inline start margin-block-end-half">
								<span class={["priority-pill", priorityTone(activeDeliverable.weight)]}>{priorityLabel(activeDeliverable.weight)} Priority</span>
								<span class="priority-pill is-neutral">{activeDeliverable.pillar}</span>
								<!-- <span class="priority-pill is-neutral">{formatPercent(weightPercent(activeDeliverable.weight))} share</span> -->
							</div>
							<h2 class="section-title">{activeDeliverable.label}</h2>
							<p class="section-copy">{activeDeliverable.summary}</p>
						</div>
						<div class="deliverable-detail-actions">
							<div class="deliverable-detail-nav" aria-label="Move between steps in this workstream">
								<button type="button" class="deliverable-open-button" onclick={() => selectAdjacentDeliverable(-1)} disabled={activeDeliverableIndex <= 0}> Previous step </button>
								<button
									type="button"
									class="deliverable-open-button"
									onclick={() => selectAdjacentDeliverable(1)}
									disabled={activeDeliverableIndex < 0 || activeDeliverableIndex >= activeTrackDeliverables.length - 1}
								>
									Next step
								</button>
							</div>
							<button
								type="button"
								class={["detail-progress-toggle", isDeliverableDone(activeDeliverable.id) && "is-complete"]}
								aria-pressed={isDeliverableDone(activeDeliverable.id)}
								onclick={() => toggleDeliverableDone(activeDeliverable.id)}
							>
								{isDeliverableDone(activeDeliverable.id) ? "Completed" : "Mark complete"}
							</button>
						</div>
					</div>

					{#if activeDeliverable.doneLabel || activeDeliverable.focus || activeDeliverable.hint}
						<div class="detail-grid">
							{#if activeDeliverable.doneLabel}
								<section class="detail-card">
									<p class="eyebrow">Definition Of Done</p>
									<h3 class="card-title">What finished looks like</h3>
									<p class="card-copy">{activeDeliverable.doneLabel}</p>
								</section>
							{/if}

							{#if activeDeliverable.focus}
								<section class="detail-card">
									<p class="eyebrow">Focus</p>
									<h3 class="card-title">Where to spend the effort</h3>
									<p class="card-copy">{activeDeliverable.focus}</p>
								</section>
							{/if}

							{#if activeDeliverable.hint}
								<section class="detail-card">
									<p class="eyebrow">Watch For</p>
									<h3 class="card-title">Common failure mode</h3>
									<p class="card-copy">{activeDeliverable.hint}</p>
								</section>
							{/if}
						</div>
					{/if}

					{#if activeInstructionBlocks.length}
						<section class="detail-playbook" aria-label="Execution notes">
							<div class="section-heading">
								<p class="eyebrow">Execution</p>
								<h3 class="section-title">How to complete this step</h3>
								<p class="section-copy">Use this as the working brief while you build, verify, and complete this step.</p>
							</div>

							<div class="instruction-grid">
								{#each activeInstructionBlocks as block, index (`${activeDeliverable.id}-${block.title}`)}
									<article class="instruction-card">
										<div class="instruction-card-head">
											<span class="instruction-step-index">0{index + 1}</span>
											<h3 class="card-title">{block.title}</h3>
										</div>
										<p class="card-copy">{block.copy}</p>
									</article>
								{/each}
							</div>
						</section>
					{/if}

					{#if activeDependencyDeliverables.length}
						<section class="dependency-panel" aria-label="Dependencies">
							<div class="section-heading">
								<p class="eyebrow">Depends On</p>
								<h3 class="section-title">Finish these prerequisites first</h3>
								<p class="section-copy">These are upstream steps that should be stable before this step is considered truly complete.</p>
							</div>
							<div class="dependency-grid">
								{#each activeDependencyDeliverables as dependency (dependency.id)}
									<button type="button" class={["dependency-card", isDeliverableDone(dependency.id) ? "is-complete" : "is-pending"]} onclick={() => selectDeliverable(dependency.id)}>
										<div class="dependency-card-head">
											<span class="dependency-kicker">Prerequisite</span>
											<span class="dependency-status">{isDeliverableDone(dependency.id) ? "Completed" : "Still Needed"}</span>
										</div>
										<strong class="card-title">{dependency.label}</strong>
										<p class="card-copy">{dependency.summary}</p>
									</button>
								{/each}
							</div>
						</section>
					{/if}

					{#if activeResources.length}
						<section class="support-panel">
							<div class="section-heading">
								<p class="eyebrow">References</p>
								<h3 class="section-title">Suggested site resources for this step</h3>
								<p class="section-copy">Use these tools, guides, and references to move the current step forward without losing your place in the planner.</p>
							</div>

							<div class="resource-grid">
								{#each activeResources as resource (resource.id)}
									{#if resource.disabled}
										<div class={["resource-card", resourceTone(resource), resourceAccentClass(resource)]} aria-disabled="true">
											<div class="resource-card-head">
												<span class="surface-badge">{resourceSurfaceLabel(resource)}</span>
												<strong>Coming Soon</strong>
											</div>
											<h4 class="card-title">{resource.label}</h4>
											<p class="card-copy">{resource.description}</p>
										</div>
									{:else}
										<a class={["resource-card", resourceTone(resource), resourceAccentClass(resource)]} href={resource.href} target="_blank" rel="noopener noreferrer">
											<div class="resource-card-head">
												<span class="surface-badge">{resourceSurfaceLabel(resource)}</span>
											</div>
											<h4 class="card-title">{resource.label}</h4>
											<p class="card-copy">{resource.description}</p>
										</a>
									{/if}
								{/each}
							</div>
						</section>
					{/if}

					{#if activeTutorials.length}
						<section class="support-panel">
							<div class="section-heading">
								<p class="eyebrow">Tutorials</p>
								<h3 class="section-title">Walkthroughs for this stage</h3>
								<p class="section-copy">
									Use these walkthroughs when you need a more guided and detailed explanation of the current stage with helpful visuals and step-by-step instructions.
								</p>
							</div>

							<div class="resource-grid">
								{#each activeTutorials as tutorial (tutorial.id)}
									<div class="resource-card is-disabled is-tutorial" aria-disabled="true">
										<div class="resource-card-head">
											<span class="surface-badge">Tutorial</span>
											<strong>{tutorial.status}</strong>
										</div>
										<h4 class="card-title">{tutorial.label}</h4>
										<p class="card-copy">{tutorial.description}</p>
									</div>
								{/each}
							</div>
						</section>
					{/if}
				</article>
			{/if}
		</div>
	</section>

	<section class="planner-progress-footer" aria-label="Planner progress controls">
		<div class="inline space-between">
			<div class="stack">
				<div class="planner-progress-summary">
					<p class="eyebrow">Project Progress</p>
					<h2 class="section-title">{activeProject?.name || "Current project"}</h2>
					<p class="section-copy">
						{completedDeliverableCount} of {plannerDeliverables.length} deliverables are marked done in this civ project.
					</p>
					<div class="planner-progress-meter" aria-hidden="true">
						<span style={`width: ${overallCompletionPercent}%`}></span>
					</div>
				</div>

				<div class="planner-progress-actions">
					<button type="button" class="planner-footer-button" onclick={exportActiveProject} disabled={!activeProject}>Export project</button>
					<button type="button" class="planner-footer-button" onclick={exportActiveChecklist} disabled={!activeProject}>Export checklist</button>
				</div>
			</div>

			<article class="ship-reminder">
				<p class="eyebrow">After Release</p>
				<h3 class="section-title">Add it to the wiki</h3>
				<p class="section-copy">Once the civ is shipped and in the workshop, add it to the wiki or mod index so players can find it and other modders can reference the finished release.</p>
			</article>
		</div>
	</section>

	<SiteResourceDirectory groups={siteResourceGroups} />
</section>

<style>
	:global(:root[data-theme="light"]) .planner-page {
		--planner-border: color-mix(in oklch, var(--panel-border) 64%, var(--accent) 36%);
		--planner-border-soft: color-mix(in oklch, var(--panel-border) 84%, white 16%);
		--planner-highlight-soft: color-mix(in oklch, var(--accent) 14%, white 86%);
		--planner-panel: color-mix(in oklch, white 90%, var(--panel-bg) 10%);
		--planner-panel-muted: color-mix(in oklch, white 90%, var(--control-bg) 10%);
		--planner-panel-soft: color-mix(in oklch, white 84%, var(--control-bg) 16%);
		--planner-panel-strong: color-mix(in oklch, white 82%, var(--panel-bg) 18%);
		--planner-shadow: 0 6px 12px color-mix(in oklch, black 15%, transparent);
		--planner-shadow-strong: 0 6px 14px color-mix(in oklch, black 25%, transparent);
	}
	.planner-page {
		display: grid;
		gap: 1.75rem;
		--planner-border: var(--surface-planner-border);
		--planner-border-soft: color-mix(in oklch, var(--surface-planner-border) 60%, white 40%);
		--planner-brass: color-mix(in oklch, var(--surface-planner-highlight) 82%, #d9c8a5 18%);
		--planner-clay: color-mix(in oklch, var(--surface-planner-highlight) 40%, #8d7350 60%);
		--planner-highlight: var(--surface-planner-highlight);
		--planner-highlight-soft: color-mix(in oklch, var(--surface-planner-highlight) 30%, transparent);
		--planner-panel: var(--surface-planner-panel);
		--planner-panel-muted: color-mix(in oklch, var(--surface-planner-panel) 95%, var(--control-bg) 5%);
		--planner-panel-soft: color-mix(in oklch, var(--surface-planner-panel) 90%, var(--control-bg) 10%);
		--planner-panel-strong: color-mix(in oklch, var(--surface-planner-panel) 82%, #18130e 18%);
		--planner-red: oklch(0.66 0.19 30);
		--planner-shadow: 0 6px 16px color-mix(in oklch, black 70%, transparent);
		--planner-shadow-strong: 0 6px 18px color-mix(in oklch, black 80%, transparent);
		--planner-sky: oklch(0.85 0.05 98);
	}

	.planner-hero {
		display: grid;
		gap: 1.25rem;
		background:
			radial-gradient(circle at top left, color-mix(in oklch, var(--planner-brass) 25%, transparent) 0%, transparent 38%),
			radial-gradient(circle at 82% 18%, color-mix(in oklch, var(--planner-sky) 30%, transparent) 0%, transparent 28%),
			linear-gradient(140deg, color-mix(in oklch, var(--planner-panel) 80%, black) 0%, color-mix(in oklch, var(--planner-panel-strong) 80%, #15110c 18%) 100%);
		box-shadow: var(--planner-shadow-strong);
		border-color: var(--planner-border);
	}

	.deliverable-step-head > div:first-child {
		display: grid;
		gap: 0.22rem;
	}

	.project-row-copy,
	.project-row-head > div,
	.project-mini-card,
	.project-icon-panel,
	.project-icon-copy {
		display: grid;
		gap: 0.3rem;
	}

	.planner-hero-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.85fr);
		align-items: start;
		gap: 2rem;
	}

	.planner-hero-copy {
		display: grid;
		gap: 1rem;
		text-shadow: 1px 1px 3px #000;
	}

	.planner-hero-map {
		display: grid;
		gap: 0.75rem;
		background:
			radial-gradient(circle at 0% 0%, color-mix(in oklch, var(--planner-highlight-soft) 18%, transparent) 0%, transparent 34%),
			linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 92%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 88%, #14100d 12%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 20%, transparent),
			0 6px 12px color-mix(in oklch, black 70%, transparent);
		/*border: 1px solid color-mix(in oklch, var(--planner-highlight) 18%, var(--planner-border-soft));*/
		border-radius: 1rem;
		padding: 1rem;
		margin-block-start: 0.5rem;
	}

	.planner-hero-map-caption {
		color: color-mix(in oklch, var(--muted-ink) 80%, white 20%);
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		margin: 0;
	}

	.planner-hero-route {
		position: relative;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.75rem;
	}

	.planner-hero-route-card {
		position: relative;
		display: grid;
		gap: 0.45rem;
		padding: 0.7rem 0.75rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 90%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 84%, #18120d 16%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 7%, transparent),
			0 6px 14px color-mix(in oklch, black 16%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-border-soft) 88%, white 12%);
		border-radius: 0.85rem;
		min-inline-size: 0;
		--hero-track-accent: var(--planner-brass);
		--hero-track-accent-soft: var(--planner-sky);
	}

	.planner-hero-route-card.is-foundation {
		--hero-track-accent: #d5a45f;
		--hero-track-accent-soft: #f2d39f;
	}

	.planner-hero-route-card.is-text {
		--hero-track-accent: #b48cd4;
		--hero-track-accent-soft: #e6d2f6;
	}

	.planner-hero-route-card.is-gameplay {
		--hero-track-accent: #c97d64;
		--hero-track-accent-soft: #f0c5b3;
	}

	.planner-hero-route-card.is-art {
		--hero-track-accent: #8fb96a;
		--hero-track-accent-soft: #d9edbb;
	}

	.planner-hero-route-card.is-presentation {
		--hero-track-accent: #d59652;
		--hero-track-accent-soft: #f0d1a0;
	}

	.planner-hero-route-card.is-text-polish {
		--hero-track-accent: #9b86c9;
		--hero-track-accent-soft: #ddd2f3;
	}

	.planner-hero-route-card.is-ship {
		--hero-track-accent: #78a9d5;
		--hero-track-accent-soft: #c9e3f8;
	}

	.planner-hero-route-card.is-active {
		transform: translateY(-1px);
		border-color: color-mix(in oklch, var(--hero-track-accent) 72%, white 28%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 9%, transparent),
			0 8px 18px color-mix(in oklch, black 22%, transparent);
	}

	.planner-hero-route-card.is-complete {
		opacity: 0.62;
		filter: saturate(0.4);
	}

	.planner-hero-route-top {
		display: flex;
		align-items: center;
		align-items: center;
		gap: 0.5rem;
		min-inline-size: 0;
	}

	.planner-hero-route-index {
		inline-size: 1.4rem;
		block-size: 1.4rem;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		flex: 0 0 auto;
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--ink);
		background: color-mix(in oklch, var(--hero-track-accent) 16%, var(--input-bg));
		border: 1px solid color-mix(in oklch, var(--hero-track-accent) 42%, white 12%);
		border-radius: 999px;
	}

	.planner-hero-route-label {
		min-inline-size: 0;
		font-size: 0.9rem;
		line-height: 1.15;
		color: var(--ink);
	}

	.planner-hero-route-meter {
		block-size: 0.32rem;
		background: color-mix(in oklch, var(--control-bg) 84%, #130f0b 16%);
		border-radius: 999px;
		overflow: hidden;
	}

	.planner-hero-route-meter span {
		display: block;
		block-size: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, color-mix(in oklch, var(--hero-track-accent) 82%, white 18%) 0%, color-mix(in oklch, var(--hero-track-accent-soft) 78%, white 22%) 100%);
	}

	.project-hub-summary-copy .eyebrow {
		margin: 0;
	}

	.planner-hero-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	.planner-hero-chip {
		min-inline-size: 12rem;
		display: grid;
		gap: 0.2rem;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 94%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 88%, #140e09 12%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 9%, transparent),
			var(--planner-shadow);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 28%, var(--planner-border-soft));
		border-radius: 0.95rem;
		padding-block: 0.75rem;
		padding-inline: 0.9rem;
	}

	.planner-hero-chip strong {
		color: var(--ink);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1rem;
	}

	.deliverable-path-node.is-done .deliverable-step-marker span {
		background: color-mix(in oklch, var(--planner-sky) 16%, var(--input-bg));
		border-color: color-mix(in oklch, var(--planner-sky) 54%, white 10%);
	}

	.deliverable-path-node.is-next .deliverable-step-marker span,
	.deliverable-path-node.is-current .deliverable-step-marker span {
		background: color-mix(in oklch, var(--planner-brass) 16%, var(--input-bg));
		border-color: color-mix(in oklch, var(--planner-brass) 64%, white 14%);
	}

	.deliverable-step-marker span {
		inline-size: 2rem;
		block-size: 2rem;
		display: grid;
		place-items: center;
		color: var(--ink);
		font-size: 0.86rem;
		font-weight: 800;
		background: color-mix(in oklch, var(--input-bg) 90%, #25170f 10%);
		border: 1px solid color-mix(in oklch, var(--planner-border-soft) 88%, white 12%);
		border-radius: 999px;
	}

	.planner-hero-steps span {
		font-size: 0.94rem;
		line-height: 1.45;
	}

	.project-hub-summary-meta span {
		display: inline-flex;
		align-items: center;
		color: var(--muted-ink);
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		background: color-mix(in oklch, var(--control-bg) 88%, #221912 12%);
		border: 1px solid color-mix(in oklch, var(--planner-border-soft) 88%, white 12%);
		border-radius: 999px;
		padding-block: 0.38rem;
		padding-inline: 0.68rem;
	}

	.project-row-head span,
	.project-row-meta span,
	.project-icon-file {
		color: var(--muted-ink);
	}

	.project-row-head span,
	.project-row-meta span,
	.project-sync-pill,
	.project-row-initials,
	.project-mini-card span,
	.project-field span,
	.project-share-note,
	.project-notice,
	.project-icon-file {
		font-size: 0.8rem;
		letter-spacing: 0.04em;
	}

	.project-row-head > span {
		font-size: 1rem;
		text-box: trim-both;
	}

	.project-row-meter span {
		block-size: 100%;
		display: block;
		background: linear-gradient(90deg, var(--planner-brass) 0%, var(--planner-sky) 100%);
		border-radius: inherit;
	}

	.resource-card-head span,
	.resource-card-head strong,
	.surface-card-top span,
	.surface-card-top strong,
	.track-kicker,
	.track-meta span,
	.priority-pill {
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
	}

	.track-card .track-meter span {
		background: linear-gradient(90deg, color-mix(in oklch, var(--track-accent) 82%, white 18%) 0%, color-mix(in oklch, var(--track-accent-soft) 76%, white 24%) 100%);
	}

	.track-meter span,
	.planner-progress-meter span {
		block-size: 100%;
		display: block;
		background: linear-gradient(90deg, color-mix(in oklch, var(--planner-brass) 88%, white 12%) 0%, color-mix(in oklch, var(--planner-sky) 62%, white 38%) 100%);
		border-radius: inherit;
	}

	.planner-hero-chip-label {
		color: var(--muted-ink);
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.14em;
	}

	.planner-hero-steps strong {
		color: var(--ink);
		font-size: 0.92rem;
	}

	.planner-hero-guide {
		display: grid;
		gap: 0.9rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--planner-sky) 14%, transparent) 0%, transparent 34%),
			linear-gradient(160deg, color-mix(in oklch, var(--planner-panel-soft) 92%, #21160f 8%) 0%, color-mix(in oklch, var(--planner-panel-muted) 86%, #14100d 14%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 40%, transparent),
			0 8px 16px color-mix(in oklch, black 90%, transparent);
		/*border: 1px solid color-mix(in oklch, var(--planner-highlight) 22%, var(--planner-border-soft));*/
		border-radius: 1rem;
		padding-block: 1rem;
		padding-inline: 1.05rem;
	}

	.planner-hero-guide .section-title {
		font-size: clamp(1.2rem, 1rem + 1vw, 1.6rem);
	}

	.planner-progress-summary .section-title {
		font-size: 2rem;
	}

	.project-hub-summary-copy .section-title {
		font-size: clamp(1.1rem, 2vw, 1.45rem);
	}

	.planner-hero-steps {
		display: grid;
		gap: 0.8rem;
		padding: 0;
		margin: 0;
		counter-reset: hero-step;
		list-style: none;
	}

	.planner-hero-steps li {
		position: relative;
		display: grid;
		gap: 0.25rem;
		color: var(--muted-ink);
		padding-inline-start: 2.2rem;
	}

	.planner-hero-steps li::before {
		position: absolute;
		inset-block-start: 0.05rem;
		inset-inline-start: 0;
		inline-size: 1.5rem;
		block-size: 1.5rem;
		display: grid;
		place-items: center;
		color: var(--ink);
		font-size: 0.74rem;
		font-weight: 800;
		background: color-mix(in oklch, var(--control-bg) 82%, #3d2a17 18%);
		border: 1px solid color-mix(in oklch, var(--planner-border-soft) 84%, var(--planner-brass) 16%);
		border-radius: 999px;
		content: counter(hero-step);
		counter-increment: hero-step;
	}

	.project-hub {
		padding: 1.5rem;
	}

	.project-hub,
	.project-rail,
	.project-inspector,
	.project-mini-card,
	.project-share-panel {
		display: grid;
		gap: 1.5rem;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel) 96%, transparent) 0%, color-mix(in oklch, var(--planner-panel-strong) 88%, #110e0b 12%) 100%);
		box-shadow: var(--planner-shadow);
		/*border: 1px solid color-mix(in oklch, var(--planner-highlight) 18%, var(--planner-border-soft));*/
		border-radius: 1rem;
	}

	.project-hub-disclosure {
		display: grid;
		gap: 1rem;
	}

	.project-hub-summary {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.85rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--planner-highlight) 14%, transparent) 0%, transparent 38%),
			linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 95%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 85%, #15110d 15%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 40%, transparent),
			0 8px 14px color-mix(in oklch, black 45%, transparent);
		/*border: 1px solid color-mix(in oklch, var(--planner-border-soft) 1%, transparent);*/
		border-radius: 1rem;
		padding: 1.05rem 1.15rem;
		cursor: pointer;
		list-style: none;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease,
			box-shadow 160ms ease;
	}

	.project-hub-summary::-webkit-details-marker {
		display: none;
	}

	.project-hub-summary:hover {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--planner-highlight) 20%, transparent) 0%, transparent 36%),
			linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 92%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 84%, #15110d 16%) 100%);
		border-color: color-mix(in oklch, var(--planner-highlight) 86%, var(--planner-border-soft));
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 60%, transparent),
			0 8px 14px color-mix(in oklch, black 60%, transparent);
		transform: translateY(-1px);
	}

	.project-hub-summary-copy,
	.project-hub-summary-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.project-hub-summary-copy {
		display: grid;
		gap: 0.5rem;
	}

	.project-hub-summary-note {
		color: color-mix(in oklch, var(--muted-ink) 76%, white 24%);
		font-size: 0.88rem;
		line-height: 1.4;
		margin: 0;
	}

	.project-hub-summary-action {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--ink);
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		background: color-mix(in oklch, var(--planner-panel-soft) 88%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 24%, var(--planner-border-soft));
		border-radius: 999px;
		padding-block: 0.42rem;
		padding-inline: 0.72rem;
	}

	.project-hub-summary-action span[aria-hidden="true"] {
		font-size: 1rem;
		font-weight: 800;
		line-height: 1;
	}

	.project-hub-disclosure[open] .project-hub-summary-action span[aria-hidden="true"] {
		transform: rotate(45deg);
	}

	.project-hub-body {
		display: grid;
		gap: 1rem;
	}

	.project-hub-overview {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: end;
		gap: 1rem;
	}

	.project-hub-overview > div:first-child {
		display: grid;
		gap: 0.45rem;
	}

	.project-hub-overview-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.65rem;
	}

	.project-hub-overview-meta span {
		display: inline-flex;
		align-items: center;
		color: color-mix(in oklch, var(--muted-ink) 68%, white 32%);
		background: color-mix(in oklch, var(--planner-panel-soft) 86%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 18%, var(--planner-border-soft));
		border-radius: 999px;
		padding-block: 0.34rem;
		padding-inline: 0.7rem;
	}

	.section-heading,
	.surface-group-head {
		display: grid;
		gap: 0.25rem;
	}

	.surface-directory .section-heading {
		display: grid;
		gap: 0.5rem;
	}

	.ship-reminder .section-copy,
	.surface-directory .card-copy,
	.surface-directory .section-copy {
		font-size: 0.92rem;
		line-height: 1.42;
	}

	.project-hub-grid {
		display: grid;
		grid-template-columns: minmax(17rem, 23rem) minmax(0, 1fr);
		gap: 1rem;
	}

	.project-rail {
		align-content: start;
	}

	.project-rail-head {
		display: grid;
		gap: 0.5rem;
	}

	.project-rail,
	.project-inspector,
	.project-share-panel {
		padding: 1.5rem;
	}

	.project-share-panel {
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 10%, transparent),
			0 4px 6px color-mix(in oklch, black 60%, transparent);
	}

	.project-toolbar {
		justify-content: flex-start;
	}

	.project-toolbar[aria-label="Planner project actions"] {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.project-toolbar,
	.project-inspector-head,
	.project-row-head,
	.project-row-meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.project-tool-button,
	.project-tool-link {
		gap: 0.45rem;
		color: var(--ink);
		text-decoration: none;
		font: inherit;
		font-weight: 700;
		text-box: trim-both cap alphabetic;
		background: color-mix(in oklch, var(--planner-panel-soft) 88%, var(--planner-highlight-soft));
		box-shadow: inset 0 1px 0 color-mix(in oklch, white 8%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 26%, var(--planner-border-soft));
		border-radius: 999px;
		padding-block: 0.75rem;
		padding-inline: 0.8rem;
		transition:
			transform 150ms ease,
			background 150ms ease,
			border-color 150ms ease,
			box-shadow 150ms ease;
		cursor: pointer;
	}

	.project-tool-button:disabled,
	.project-field input:disabled,
	.project-field textarea:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.project-tool-button.is-danger {
		background: color-mix(in oklch, var(--planner-red) 16%, var(--planner-panel-soft));
		border-color: color-mix(in oklch, var(--planner-red) 46%, var(--planner-border-soft));
	}

	.project-list {
		align-content: start;
	}

	.project-list,
	.project-identity-fields,
	.project-inspector-stats {
		display: grid;
		gap: 1.25rem;
	}

	.project-inspector {
		align-content: start;
		gap: 1.75rem;
	}

	.project-row-icon img,
	.project-icon-preview img {
		position: absolute;
		inset: 50% auto auto 50%;
		inline-size: calc(var(--project-icon-size) * var(--project-icon-crop-scale));
		block-size: calc(var(--project-icon-size) * var(--project-icon-crop-scale));
		object-fit: cover;
		transform: translate(-50%, -50%);
	}

	.project-row-icon,
	.project-icon-preview {
		position: relative;
		inline-size: var(--project-icon-size);
		block-size: var(--project-icon-size);
		display: grid;
		place-items: center;
		background: linear-gradient(160deg, color-mix(in oklch, var(--planner-panel-soft) 92%, #26170f 8%) 0%, color-mix(in oklch, var(--planner-panel-muted) 88%, #17100d 12%) 100%);
		box-shadow: 2px 4px 4px color-mix(in oklch, black 40%, transparent);
		border-radius: 50%;
		overflow: hidden;
		--project-icon-crop-scale: 1.471264368;
		--project-icon-size: 3.35rem;
	}

	.project-icon-preview.is-clickable {
		border: none;
		cursor: pointer;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			box-shadow 150ms ease;
	}

	.project-icon-preview.is-clickable:hover,
	.project-icon-preview.is-clickable:focus-visible {
		box-shadow: 2px 4px 6px color-mix(in oklch, black 80%, transparent);
	}

	.project-row.is-cloud .project-row-icon,
	.project-icon-preview.is-cloud {
		background: color-mix(in oklch, var(--control-bg) 82%, #12263a 18%);
		border-color: color-mix(in oklch, var(--planner-sky) 48%, var(--planner-border-soft));
	}

	.project-row.is-shared .project-row-icon,
	.project-icon-preview.is-shared {
		background: color-mix(in oklch, var(--control-bg) 84%, #381716 16%);
		border-color: color-mix(in oklch, var(--planner-red) 46%, var(--planner-border-soft));
	}

	.project-row-initials {
		font-size: 1rem;
		text-box: trim-both cap alphabetic;
	}

	.project-row-initials,
	.project-icon-placeholder {
		color: var(--ink);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-weight: 700;
	}

	.project-inspector-hero {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem;
	}

	.project-inspector-hero-copy {
		display: grid;
		gap: 0.35rem;
	}

	.compass-card .card-title {
		font-size: 1.15rem;
		line-height: 1.2;
	}

	.dependency-card .card-title {
		font-size: 1rem;
	}

	.path-overview-card .card-title {
		font-size: 1.125rem;
	}

	.project-row-share {
		color: var(--ink);
		font-weight: 800;
	}

	.project-row-route {
		line-height: 1.4;
	}

	.compass-card .card-copy {
		font-size: 0.95rem;
		line-height: 1.45;
	}

	.project-row-meter {
		inline-size: 100%;
		block-size: 0.45rem;
		background: color-mix(in oklch, black 70%, var(--planner-panel));
		border-radius: 999px;
		overflow: hidden;
	}

	.deliverable-pill.is-complete h3,
	.deliverable-pill.is-complete .deliverable-path-copy,
	.deliverable-pill.is-complete .deliverable-open-button {
		opacity: 0.75;
	}

	.project-icon-placeholder {
		font-size: 2.55rem;
		letter-spacing: 0.08em;
	}

	.project-tool-button--file {
		position: relative;
		overflow: hidden;
	}

	.project-toolbar--icon,
	.project-toolbar--primary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.project-field input,
	.project-field textarea {
		inline-size: 100%;
		color: var(--ink);
		font: inherit;
		background: color-mix(in oklch, var(--input-bg) 92%, var(--planner-panel-soft) 8%);
		box-shadow: inset 0 1px 0 color-mix(in oklch, white 7%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 18%, var(--planner-border-soft));
		border-radius: 0.85rem;
		padding-block: 0.75rem;
		padding-inline: 0.85rem;
	}

	.project-icon-input {
		display: none;
	}

	.surface-directory a.surface-card:hover,
	.surface-directory a.surface-card:focus-visible {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight, var(--accent)) 18%, transparent) 0%, transparent 34%),
			linear-gradient(165deg, color-mix(in srgb, var(--surface-panel, var(--control-bg)) 90%, var(--control-bg)) 0%, color-mix(in srgb, var(--control-bg) 84%, #16110f 16%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--surface-highlight, var(--accent)) 14%, transparent),
			0 18px 30px color-mix(in srgb, black 76%, transparent);
		border-color: color-mix(in srgb, var(--surface-highlight, var(--accent)) 74%, var(--planner-border-soft));
		transform: translateY(-2px);
	}

	a.resource-card:hover,
	a.resource-card:focus-visible,
	a.surface-card:hover,
	a.surface-card:focus-visible {
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, white 10%, transparent),
			0 16px 28px color-mix(in srgb, black 78%, transparent);
		transform: translateY(-2px);
	}

	a.resource-card.is-generator:hover,
	a.resource-card.is-generator:focus-visible,
	a.surface-card.is-generator:hover,
	a.surface-card.is-generator:focus-visible {
		background: linear-gradient(180deg, color-mix(in srgb, var(--control-bg) 80%, #382056 20%) 0%, color-mix(in srgb, var(--control-bg) 74%, #1f1230 26%) 100%);
		border-color: color-mix(in srgb, var(--planner-border-soft) 44%, #9b67ff 56%);
	}

	a.resource-card.is-lua:hover,
	a.resource-card.is-lua:focus-visible,
	a.surface-card.is-lua:hover,
	a.surface-card.is-lua:focus-visible {
		background: linear-gradient(180deg, color-mix(in srgb, var(--control-bg) 82%, #28421f 18%) 0%, color-mix(in srgb, var(--control-bg) 76%, #151f11 24%) 100%);
		border-color: color-mix(in srgb, var(--planner-border-soft) 48%, #8dcf63 52%);
	}

	a.resource-card.is-pattern:hover,
	a.resource-card.is-pattern:focus-visible,
	a.surface-card.is-pattern:hover,
	a.surface-card.is-pattern:focus-visible {
		background: linear-gradient(180deg, color-mix(in srgb, var(--control-bg) 82%, #47320b 18%) 0%, color-mix(in srgb, var(--control-bg) 76%, #221808 24%) 100%);
		border-color: color-mix(in srgb, var(--planner-border-soft) 42%, #d7ab2c 58%);
	}

	a.resource-card.is-schema:hover,
	a.resource-card.is-schema:focus-visible,
	a.surface-card.is-schema:hover,
	a.surface-card.is-schema:focus-visible {
		background: linear-gradient(180deg, color-mix(in srgb, var(--control-bg) 82%, #173654 18%) 0%, color-mix(in srgb, var(--control-bg) 76%, #0d1f31 24%) 100%);
		border-color: color-mix(in srgb, var(--planner-border-soft) 48%, #63aaf0 52%);
	}

	a.resource-card.is-tool:hover,
	a.resource-card.is-tool:focus-visible,
	a.surface-card.is-tool:hover,
	a.surface-card.is-tool:focus-visible {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 82%, #44220b 18%) 0%, color-mix(in oklch, var(--control-bg) 76%, #26150a 24%) 100%);
		border-color: color-mix(in oklch, var(--accent) 78%, var(--planner-border-soft));
	}

	a.resource-card.is-publish:hover,
	a.resource-card.is-publish:focus-visible,
	a.surface-card.is-publish:hover,
	a.surface-card.is-publish:focus-visible {
		background: linear-gradient(180deg, color-mix(in srgb, var(--control-bg) 82%, #4b2208 18%) 0%, color-mix(in srgb, var(--control-bg) 76%, #281408 24%) 100%);
		border-color: color-mix(in srgb, var(--surface-publish-highlight) 76%, var(--planner-border-soft));
	}

	a.resource-card.is-ui:hover,
	a.resource-card.is-ui:focus-visible,
	a.surface-card.is-ui:hover,
	a.surface-card.is-ui:focus-visible {
		background: linear-gradient(180deg, color-mix(in srgb, var(--control-bg) 82%, #4a1734 18%) 0%, color-mix(in srgb, var(--control-bg) 76%, #26101e 24%) 100%);
		border-color: color-mix(in srgb, var(--surface-ui-highlight) 76%, var(--planner-border-soft));
	}

	a.resource-card.is-viewer:hover,
	a.resource-card.is-viewer:focus-visible,
	a.surface-card.is-viewer:hover,
	a.surface-card.is-viewer:focus-visible,
	a.resource-card.is-support:hover,
	a.resource-card.is-support:focus-visible,
	a.surface-card.is-support:hover,
	a.surface-card.is-support:focus-visible {
		background: linear-gradient(180deg, color-mix(in srgb, var(--control-bg) 80%, #4a2019 20%) 0%, color-mix(in srgb, var(--control-bg) 74%, #28130f 26%) 100%);
		border-color: color-mix(in srgb, var(--planner-border-soft) 42%, #da765f 58%);
	}

	.project-inspector-stats {
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	}

	.project-mini-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: color-mix(in oklch, var(--control-bg) 92%, #35251a 8%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 20%, transparent),
			0 4px 6px color-mix(in oklch, black 60%, transparent);
		padding: 0.9rem;
	}

	.project-field {
		display: grid;
		gap: 0.45rem;
	}

	.project-field textarea {
		resize: vertical;
	}

	.planner-import-input {
		display: none;
	}

	.compass-panel {
		display: grid;
		gap: 1rem;
		background: linear-gradient(135deg, color-mix(in oklch, var(--control-bg) 92%, #2f1b0f 8%) 0%, color-mix(in oklch, var(--control-bg) 96%, #0f131a 4%) 100%);
		box-shadow: var(--planner-shadow);
		/*border: 1px solid color-mix(in oklch, var(--planner-highlight) 18%, var(--planner-border-soft));*/
		border-radius: 1rem;
		padding-block: 1.15rem;
		padding-inline: 1.2rem;
	}

	.compass-heading {
		gap: 0.5rem;
	}

	.compass-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.compass-grid {
		display: grid;
		gap: 1rem;
	}

	.compass-card {
		display: grid;
		align-content: start;
		gap: 0.55rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--compass-accent) 16%, transparent) 0%, transparent 34%),
			linear-gradient(180deg, color-mix(in oklch, var(--compass-panel) 96%, white 4%) 0%, color-mix(in oklch, var(--compass-panel) 88%, #130f0c 12%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 8%, transparent),
			var(--planner-shadow);
		border: 1px solid color-mix(in oklch, var(--compass-accent) 42%, var(--planner-border-soft));
		border-radius: 0.95rem;
		padding-block: 0.95rem;
		padding-inline: 1rem;
		--compass-accent: var(--planner-brass);
		--compass-panel: color-mix(in oklch, var(--control-bg) 92%, #2e2015 8%);
	}

	.compass-card.is-blueprint {
		--compass-accent: var(--surface-generator-highlight);
		--compass-panel: var(--surface-generator-panel);
	}

	.compass-card.is-pressure {
		--compass-accent: var(--surface-support-highlight);
		--compass-panel: var(--surface-support-panel);
	}

	.compass-card.is-release {
		--compass-accent: var(--surface-schema-highlight);
		--compass-panel: var(--surface-schema-panel);
	}

	.workbench-grid {
		display: grid;
		grid-template-columns: minmax(16rem, 22rem) minmax(16rem, 24rem) minmax(26rem, 1fr);
		align-items: start;
		gap: 1.25rem;
	}

	.deliverable-strip-panel,
	.deliverable-detail,
	.surface-directory,
	.track-rail,
	.surface-group {
		display: grid;
		gap: 1.15rem;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel) 94%, transparent) 0%, color-mix(in oklch, var(--planner-panel-strong) 88%, #110e0b 12%) 100%);
		box-shadow: var(--planner-shadow);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 10%, transparent),
			0 8px 12px color-mix(in oklch, black 80%, transparent);
		/*border: 1px solid color-mix(in oklch, var(--planner-highlight) 16%, var(--planner-border-soft));*/
		border-radius: 1rem;
		padding: 1.3rem;
	}

	.track-list {
		grid-template-columns: 1fr;
	}

	.track-list,
	.resource-grid,
	.surface-card-grid,
	.detail-grid {
		display: grid;
		gap: 1rem;
	}

	.resource-card-head,
	.surface-card-top,
	.track-card-head,
	.track-meta,
	.pill-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.55rem;
	}

	.track-kicker {
		color: color-mix(in oklch, var(--track-accent-soft) 72%, white 28%);
	}

	.track-meter,
	.planner-progress-meter {
		inline-size: 100%;
		block-size: 0.45rem;
		background: color-mix(in oklch, var(--input-bg) 88%, #000 12%);
		border-radius: 999px;
		overflow: hidden;
	}

	.focus-column {
		display: contents;
	}

	.deliverable-path-overview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.deliverable-step-head,
	.deliverable-step-meta,
	.deliverable-node-actions,
	.deliverable-path-overview,
	.planner-progress-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.path-overview-card {
		display: grid;
		gap: 0.5rem;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 92%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 88%, #17110d 12%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 30%, transparent),
			0 4px 8px color-mix(in oklch, black 70%, transparent);
		/*border: 1px solid color-mix(in oklch, var(--planner-highlight) 18%, var(--planner-border-soft));*/
		border-radius: 1rem;
		padding: 1rem;
	}

	.path-overview-card.is-next {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--planner-brass) 16%, transparent) 0%, transparent 34%),
			linear-gradient(180deg, color-mix(in oklch, var(--surface-tool-panel) 78%, var(--planner-panel-soft)) 0%, color-mix(in oklch, var(--planner-panel-muted) 82%, #20150d 18%) 100%);
		border-color: color-mix(in oklch, var(--planner-brass) 54%, white 12%);
	}

	.deliverable-step-number,
	.deliverable-step-state,
	.deliverable-step-share,
	.path-overview-kicker,
	.deliverable-pill-kicker {
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
	}

	.deliverable-path-node.is-next::after,
	.deliverable-path-node.is-current::after {
		background: linear-gradient(180deg, color-mix(in oklch, var(--planner-brass) 52%, transparent) 0%, color-mix(in oklch, var(--planner-border-soft) 62%, transparent) 100%);
	}

	.path-overview-action {
		inline-size: fit-content;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		color: var(--ink);
		text-transform: uppercase;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		background: color-mix(in oklch, var(--planner-brass) 16%, var(--input-bg));
		border: 1px solid color-mix(in oklch, var(--planner-brass) 52%, white 10%);
		border-radius: 999px;
		padding-block: 0.58rem;
		padding-inline: 0.85rem;
	}

	.deliverable-path {
		display: grid;
		gap: 0.9rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.deliverable-step-marker {
		position: relative;
		z-index: 1;
		padding-block-start: 0.25rem;
	}

	.deliverable-step-head {
		justify-content: space-between;
		align-items: start;
	}

	.deliverable-step-number {
		color: color-mix(in oklch, var(--muted-ink) 64%, white 36%);
	}

	.deliverable-step-meta {
		justify-content: end;
	}

	.deliverable-step-meta,
	.deliverable-node-actions {
		align-items: center;
	}

	.deliverable-step-state {
		background: color-mix(in oklch, var(--input-bg) 86%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-border-soft) 88%, white 12%);
		border-radius: 999px;
		padding-block: 0.18rem;
		padding-inline: 0.5rem;
	}

	.deliverable-step-share {
		color: color-mix(in oklch, var(--muted-ink) 54%, white 46%);
		font-weight: 700;
	}

	.deliverable-pill-kicker {
		color: color-mix(in oklch, var(--muted-ink) 76%, white 24%);
		margin: 0;
	}

	.deliverable-path-copy {
		color: var(--muted-ink);
		line-height: 1.45;
		margin: 0;
	}

	.deliverable-node-actions {
		justify-content: flex-start;
	}

	.deliverable-node-actions {
		justify-content: flex-start;
	}

	.deliverable-open-button {
		background: color-mix(in oklch, var(--planner-brass) 14%, var(--input-bg));
		border-color: color-mix(in oklch, var(--planner-brass) 40%, white 10%);
	}

	.deliverable-open-button,
	.deliverable-toggle,
	.detail-progress-toggle,
	.planner-footer-button {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		color: var(--ink);
		text-transform: uppercase;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		background: color-mix(in oklch, var(--input-bg) 88%, #241812 12%);
		border: 1px solid color-mix(in oklch, var(--planner-border-soft) 88%, white 12%);
		border-radius: 999px;
		padding-block: 0.58rem;
		padding-inline: 0.85rem;
	}

	.deliverable-detail {
		gap: 2rem;
	}

	.deliverable-detail-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: start;
		gap: 1rem;
	}

	.deliverable-detail-actions {
		display: grid;
		justify-items: end;
		gap: 0.75rem;
		flex: 0 1 auto;
	}

	.deliverable-detail-nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: end;
		gap: 0.6rem;
	}

	.deliverable-detail-title {
		display: grid;
		flex: 1 1 22rem;
		gap: 0.7rem;
	}

	.priority-pill {
		display: inline-flex;
		align-items: center;
		color: var(--ink);
		background: color-mix(in oklch, var(--input-bg) 82%, transparent);
		border: 1px solid var(--planner-border-soft);
		border-radius: 999px;
		padding-block: 0.32rem;
		padding-inline: 0.55rem;
	}

	.priority-pill.is-critical {
		background: color-mix(in oklch, var(--planner-red) 40%, var(--input-bg));
	}

	.priority-pill.is-high {
		background: color-mix(in oklch, var(--planner-brass) 40%, var(--input-bg));
	}

	.priority-pill.is-medium {
		background: color-mix(in oklch, var(--planner-sky) 40%, var(--input-bg));
	}

	.priority-pill.is-neutral {
		background: color-mix(in oklch, var(--input-bg) 70%, transparent);
	}

	.detail-grid {
		grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
	}

	.detail-card {
		display: grid;
		gap: 0.55rem;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 94%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 88%, #18120d 12%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 45%, transparent),
			0 2px 8px color-mix(in oklch, #000 60%, var(--planner-panel));
		/*border: 1px solid color-mix(in oklch, var(--planner-highlight) 16%, var(--planner-border-soft));*/
		border-radius: 0.95rem;
		padding: 1.1rem;
	}

	.detail-playbook {
		display: grid;
		gap: 0.9rem;
	}

	.instruction-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.instruction-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 92%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 88%, #17110d 12%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 30%, transparent),
			0 6px 8px color-mix(in oklch, black 80%, transparent);
		/*border: 1px solid color-mix(in oklch, var(--planner-highlight) 16%, var(--planner-border-soft));*/
		border-radius: 0.95rem;
		padding-block: 1rem;
		padding-inline: 1.05rem;
	}

	.instruction-card-head {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.instruction-step-index {
		inline-size: 2rem;
		block-size: 2rem;
		display: inline-grid;
		place-items: center;
		color: var(--ink);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		background: color-mix(in oklch, var(--planner-brass) 12%, var(--input-bg));
		border: 1px solid color-mix(in oklch, var(--planner-brass) 46%, white 10%);
		border-radius: 999px;
	}

	.dependency-panel,
	.support-panel {
		display: grid;
		gap: 0.8rem;
	}

	.dependency-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.resource-grid,
	.surface-card-grid,
	.dependency-grid {
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.dependency-card-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.6rem;
	}

	.dependency-kicker,
	.dependency-status {
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
	}

	.dependency-card.is-complete .dependency-status {
		background: color-mix(in oklch, var(--planner-sky) 10%, var(--input-bg));
		border-color: color-mix(in oklch, var(--planner-sky) 50%, white 10%);
	}

	.dependency-card.is-pending .dependency-status {
		background: color-mix(in oklch, var(--planner-brass) 14%, var(--input-bg));
		border-color: color-mix(in oklch, var(--planner-brass) 48%, white 10%);
	}

	.dependency-status {
		display: inline-flex;
		align-items: center;
		background: color-mix(in oklch, var(--input-bg) 86%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-border-soft) 88%, white 12%);
		border-radius: 999px;
		padding-block: 0.24rem;
		padding-inline: 0.55rem;
	}

	.resource-card.is-generator .surface-badge,
	.surface-card.is-generator .surface-badge {
		color: #d4b2ff;
	}

	.resource-card.is-lua .surface-badge,
	.surface-card.is-lua .surface-badge {
		color: #b7ef84;
	}

	.resource-card.is-pattern .surface-badge,
	.surface-card.is-pattern .surface-badge {
		color: #f5d36a;
	}

	.resource-card.is-schema .surface-badge,
	.surface-card.is-schema .surface-badge {
		color: #8dc7ff;
	}

	.resource-card.is-tool .surface-badge,
	.surface-card.is-tool .surface-badge {
		color: color-mix(in oklch, white 84%, var(--accent) 16%);
	}

	.resource-card.is-publish .surface-badge,
	.surface-card.is-publish .surface-badge {
		color: var(--surface-publish-highlight-strong);
	}

	.resource-card.is-ui .surface-badge,
	.surface-card.is-ui .surface-badge {
		color: var(--surface-ui-highlight-strong);
	}

	.resource-card.is-viewer .surface-badge,
	.surface-card.is-viewer .surface-badge,
	.resource-card.is-support .surface-badge,
	.surface-card.is-support .surface-badge {
		color: #f1afa4;
	}

	.surface-badge {
		display: inline-flex;
		align-items: center;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		border: 1px solid currentColor;
		border-radius: 999px;
		padding-block: 0.28rem;
		padding-inline: 0.55rem;
	}

	.surface-directory .surface-card .surface-badge {
		color: var(--surface-highlight-strong, var(--ink));
		background: color-mix(in srgb, var(--surface-highlight, var(--accent)) 14%, transparent);
		border-color: color-mix(in srgb, var(--surface-highlight, var(--accent)) 54%, var(--planner-border-soft));
	}

	.resource-card,
	.surface-card {
		display: grid;
		gap: 0.75rem;
		color: var(--ink);
		text-shadow: 1px 1px 3px #222;
		text-decoration: none;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight, var(--accent)) 20%, transparent) 0%, transparent 34%),
			linear-gradient(165deg, color-mix(in srgb, var(--surface-panel, var(--planner-panel-soft)) 80%, var(--control-bg)) 0%, color-mix(in srgb, var(--planner-panel-muted) 85%, #17110d 5%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, white 10%, transparent),
			0 12px 24px color-mix(in srgb, black 75%, transparent);
		border: 1px solid color-mix(in srgb, var(--surface-border, var(--planner-border-soft)) 60%, var(--planner-border-soft));
		border-radius: 1rem;
		padding: 1.1rem;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease,
			box-shadow 160ms ease;
	}

	.resource-card.is-disabled,
	.surface-card.is-disabled {
		opacity: 0.78;
		border-style: dashed;
	}

	.resource-card.is-generator,
	.surface-card.is-generator {
		--surface-border: var(--surface-generator-border);
		--surface-highlight: var(--surface-generator-highlight);
		--surface-panel: var(--surface-generator-panel);
	}

	.resource-card.is-live,
	.surface-card.is-live {
		border-color: color-mix(in oklch, var(--planner-sky) 30%, var(--planner-border-soft));
	}

	.resource-card.is-lua,
	.surface-card.is-lua {
		--surface-border: var(--surface-lua-border);
		--surface-highlight: var(--surface-lua-highlight);
		--surface-panel: var(--surface-lua-panel);
	}

	.resource-card.is-pattern,
	.surface-card.is-pattern {
		--surface-border: var(--surface-pattern-border);
		--surface-highlight: var(--surface-pattern-highlight);
		--surface-panel: var(--surface-pattern-panel);
	}

	.resource-card.is-schema,
	.surface-card.is-schema {
		--surface-border: var(--surface-schema-border);
		--surface-highlight: var(--surface-schema-highlight);
		--surface-panel: var(--surface-schema-panel);
	}

	.resource-card.is-tool,
	.surface-card.is-tool {
		--surface-border: var(--surface-tool-border);
		--surface-highlight: var(--surface-tool-highlight);
		--surface-panel: var(--surface-tool-panel);
	}

	.resource-card.is-publish,
	.surface-card.is-publish {
		--surface-border: var(--surface-publish-border);
		--surface-highlight: var(--surface-publish-highlight);
		--surface-panel: var(--surface-publish-panel);
	}

	.resource-card.is-ui,
	.surface-card.is-ui {
		--surface-border: var(--surface-ui-border);
		--surface-highlight: var(--surface-ui-highlight);
		--surface-panel: var(--surface-ui-panel);
	}

	.resource-card.is-viewer,
	.surface-card.is-viewer,
	.resource-card.is-support,
	.surface-card.is-support {
		--surface-border: var(--surface-support-border);
		--surface-highlight: var(--surface-support-highlight);
		--surface-panel: var(--surface-support-panel);
	}

	.planner-progress-footer {
		display: grid;
		gap: 1rem;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel) 96%, transparent) 0%, color-mix(in oklch, var(--planner-panel-strong) 88%, #110e0b 12%) 100%);
		box-shadow: var(--planner-shadow);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 16%, var(--planner-border-soft));
		border-radius: 1rem;
		padding-block: 1.2rem;
		padding-inline: 1.3rem;
	}

	.stack {
		display: grid;
	}

	.stack.half {
		gap: 0.5rem;
	}

	.planner-progress-summary {
		display: grid;
		gap: 0.7rem;
	}

	.planner-progress-actions {
		align-items: center;
	}

	.ship-reminder {
		display: grid;
		gap: 0.7rem;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 94%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 88%, #18120d 12%) 100%);
		box-shadow: var(--planner-shadow);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 16%, var(--planner-border-soft));
		border-radius: 1rem;
		padding: 1.15rem;
	}

	.surface-directory {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-schema-highlight) 10%, transparent) 0%, transparent 32%),
			linear-gradient(165deg, color-mix(in srgb, var(--planner-panel) 94%, var(--control-bg)) 0%, color-mix(in srgb, var(--planner-panel-strong) 88%, #100d0b 12%) 100%);
	}

	.surface-directory .surface-card {
		display: grid;
		gap: 0.7rem;
		color: var(--ink);
		text-decoration: none;
		padding: 1rem;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease,
			box-shadow 160ms ease;
	}

	.surface-directory .surface-card {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight, var(--accent)) 10%, transparent) 0%, transparent 34%),
			linear-gradient(165deg, color-mix(in srgb, var(--surface-panel, var(--control-bg)) 88%, var(--control-bg)) 0%, color-mix(in srgb, var(--control-bg) 88%, #16110f 12%) 100%);
		border-color: color-mix(in srgb, var(--surface-highlight, var(--surface-border, var(--accent))) 44%, var(--surface-border, var(--planner-border-soft)));
	}

	.surface-directory .surface-card-grid {
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.9rem;
	}

	.surface-directory .surface-card.is-featured {
		grid-column: span 2;
	}

	.surface-directory .surface-card.is-generator {
		--surface-border: #7b4bd1;
		--surface-highlight: #9b67ff;
		--surface-highlight-strong: #d4b2ff;
		--surface-panel: #2b1740;
	}

	.surface-directory .surface-card.is-lua {
		--surface-border: #638f4f;
		--surface-highlight: #8dcf63;
		--surface-highlight-strong: #b7ef84;
		--surface-panel: #20301b;
	}

	.surface-directory .surface-card.is-pattern {
		--surface-border: #b48922;
		--surface-highlight: #d7ab2c;
		--surface-highlight-strong: #f5d36a;
		--surface-panel: #352608;
	}

	.surface-directory .surface-card.is-schema {
		--surface-border: #35658c;
		--surface-highlight: #5fa8f0;
		--surface-highlight-strong: #8dc7ff;
		--surface-panel: #11263a;
	}

	.surface-directory .surface-card.is-tool {
		--surface-border: color-mix(in oklch, var(--accent) 58%, var(--planner-border-soft));
		--surface-highlight: color-mix(in oklch, var(--accent) 82%, white 18%);
		--surface-highlight-strong: color-mix(in oklch, white 84%, var(--accent) 16%);
		--surface-panel: #2f1808;
	}

	.surface-directory .surface-card.is-publish {
		--surface-border: var(--surface-publish-border);
		--surface-highlight: var(--surface-publish-highlight);
		--surface-highlight-strong: var(--surface-publish-highlight-strong);
		--surface-panel: var(--surface-publish-panel);
	}

	.surface-directory .surface-card.is-ui {
		--surface-border: var(--surface-ui-border);
		--surface-highlight: var(--surface-ui-highlight);
		--surface-highlight-strong: var(--surface-ui-highlight-strong);
		--surface-panel: var(--surface-ui-panel);
	}

	.surface-directory .surface-card.is-viewer,
	.surface-directory .surface-card.is-support {
		--surface-border: #c55c4a;
		--surface-highlight: #da765f;
		--surface-highlight-strong: #f1afa4;
		--surface-panel: #3a1814;
	}

	.surface-directory .surface-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 30%),
			radial-gradient(circle at 0% 100%, color-mix(in srgb, #8dc7ff 8%, transparent) 0%, transparent 34%),
			linear-gradient(165deg, color-mix(in srgb, var(--planner-panel) 72%, var(--control-bg)) 0%, color-mix(in srgb, var(--planner-panel-strong) 86%, #191310 14%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, white 8%, transparent),
			0 14px 26px color-mix(in srgb, black 78%, transparent);
		border-color: color-mix(in srgb, var(--planner-highlight) 18%, var(--planner-border-soft));
		padding: 1rem;
	}

	.surface-directory .surface-group-head {
		display: grid;
	}

	.surface-group-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.deliverable-path-node {
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		gap: 0.9rem;
	}

	.deliverable-path-node::after {
		position: absolute;
		inset-block-start: 2.6rem;
		inset-inline-start: 1.02rem;
		inline-size: 0.16rem;
		block-size: calc(100% + 0.5rem);
		background: color-mix(in oklch, var(--planner-border-soft) 72%, transparent);
		border-radius: 999px;
		content: "";
	}

	.deliverable-path-node:last-child::after {
		display: none;
	}

	.deliverable-path-node.is-done::after {
		background: color-mix(in oklch, var(--planner-sky) 42%, transparent);
	}

	.deliverable-pill {
		display: grid;
		gap: 0.8rem;
		color: var(--ink);
		text-align: left;
		text-shadow: 1px 1px 3px #222;
		cursor: pointer;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 90%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 86%, #18120d 14%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 7%, transparent),
			0 12px 22px color-mix(in oklch, black 16%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 18%, var(--planner-border-soft));
		border-radius: 1rem;
		padding: 1.1rem;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			box-shadow 150ms ease,
			opacity 150ms ease,
			filter 150ms ease;
	}

	.deliverable-pill {
		gap: 0.9rem;
	}

	.deliverable-pill:hover,
	.deliverable-pill:focus-visible {
		transform: translateY(-1px);
		border-color: color-mix(in oklch, var(--planner-brass) 52%, white 18%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 7%, transparent),
			0 14px 24px color-mix(in oklch, black 22%, transparent);
	}

	.deliverable-pill.is-complete {
		opacity: 0.68;
		filter: saturate(0.28);
	}

	.deliverable-toggle.is-complete,
	.detail-progress-toggle.is-complete {
		background: color-mix(in oklch, var(--planner-brass) 15%, var(--input-bg));
		border-color: color-mix(in oklch, var(--planner-brass) 55%, white 12%);
	}

	.dependency-card {
		display: grid;
		gap: 0.75rem;
		color: var(--ink);
		text-align: left;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 90%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 86%, #18120d 14%) 100%);
		box-shadow: inset 0 1px 0 color-mix(in oklch, white 7%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 16%, var(--planner-border-soft));
		border-radius: 1rem;
		padding-block: 1rem;
		padding-inline: 1.05rem;
	}

	.dependency-card.is-complete {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 86%, #163245 14%) 0%, color-mix(in oklch, var(--control-bg) 82%, #121c25 18%) 100%);
		border-color: color-mix(in oklch, var(--planner-sky) 46%, white 10%);
	}

	.dependency-card.is-pending {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 86%, #3a2815 14%) 0%, color-mix(in oklch, var(--control-bg) 82%, #21170f 18%) 100%);
		border-color: color-mix(in oklch, var(--planner-brass) 42%, white 10%);
	}

	.is-critical {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 80%, #51241f 20%) 0%, color-mix(in oklch, var(--control-bg) 75%, #2d1613 25%) 100%);
		border-color: color-mix(in oklch, var(--planner-red) 62%, var(--planner-border-soft));
	}

	.is-high {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 80%, #5b4320 20%) 0%, color-mix(in oklch, var(--control-bg) 75%, #2f2414 25%) 100%);
		border-color: color-mix(in oklch, var(--planner-brass) 56%, var(--planner-border-soft));
	}

	.is-medium {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 80%, #213b4f 20%) 0%, color-mix(in oklch, var(--control-bg) 75%, #16242e 25%) 100%);
		border-color: color-mix(in oklch, var(--planner-sky) 52%, var(--planner-border-soft));
	}

	.is-support {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 80%, #2d2622 20%) 0%, color-mix(in oklch, var(--control-bg) 75%, #1c1714 25%) 100%);
		border-color: var(--planner-border-soft);
	}

	.project-icon-preview {
		justify-self: start;
		--project-icon-size: 10.875rem;
	}

	.project-notice {
		background: color-mix(in oklch, var(--planner-panel-soft) 90%, transparent);
		box-shadow: inset 0 1px 0 color-mix(in oklch, white 7%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 18%, var(--planner-border-soft));
		border-radius: 0.85rem;
		padding-block: 0.75rem;
		padding-inline: 0.85rem;
		margin: 0;
	}

	.project-notice.is-error {
		color: color-mix(in oklch, white 82%, var(--planner-red));
		border-color: color-mix(in oklch, var(--planner-red) 42%, var(--planner-border-soft));
	}

	.project-notice.is-success {
		color: color-mix(in oklch, white 82%, var(--planner-sky));
		border-color: color-mix(in oklch, var(--planner-sky) 34%, var(--planner-border-soft));
	}

	.project-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 1rem;
		text-align: left;
		background: linear-gradient(165deg, color-mix(in oklch, var(--planner-panel-soft) 94%, transparent) 0%, color-mix(in oklch, var(--planner-panel-muted) 88%, #18120d 12%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 7%, transparent),
			0 4px 8px color-mix(in oklch, black 82%, transparent);
		border: 1px solid color-mix(in oklch, var(--planner-highlight) 16%, var(--planner-border-soft));
		border-radius: 1rem;
		padding: 1.5rem 1rem;
		transition:
			transform 130ms ease,
			border-color 130ms ease,
			background-color 130ms ease;
	}

	.project-row:hover,
	.project-row.is-active {
		border-color: color-mix(in oklch, var(--planner-border) 74%, white 14%);
		transform: translateY(-1px);
	}

	.project-row.is-cloud {
		background: color-mix(in oklch, var(--control-bg) 86%, #132232 14%);
		border-color: color-mix(in oklch, var(--planner-sky) 44%, var(--planner-border-soft));
	}

	.project-row.is-local {
		border-color: color-mix(in oklch, var(--planner-border-soft) 88%, white 12%);
	}

	.project-row.is-shared {
		background: color-mix(in oklch, var(--control-bg) 88%, #341714 12%);
		border-color: color-mix(in oklch, var(--planner-red) 44%, var(--planner-border-soft));
	}

	.project-sync-pill {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		color: var(--muted-ink);
		background: color-mix(in oklch, var(--control-bg) 86%, #221912 14%);
		border: 1px solid color-mix(in oklch, var(--planner-border-soft) 84%, white 16%);
		border-radius: 999px;
		padding-block: 0.35rem;
		padding-inline: 0.65rem;
	}

	.project-sync-pill.is-cloud {
		color: color-mix(in oklch, white 80%, var(--planner-sky));
		border-color: color-mix(in oklch, var(--planner-sky) 46%, var(--planner-border-soft));
	}

	.project-sync-pill.is-shared {
		color: color-mix(in oklch, white 80%, var(--planner-red));
		border-color: color-mix(in oklch, var(--planner-red) 46%, var(--planner-border-soft));
	}

	.track-card {
		display: grid;
		gap: 0.8rem;
		color: var(--ink);
		text-align: left;
		text-shadow: 1px 1px 3px #222;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--track-accent) 20%, transparent) 0%, transparent 32%),
			linear-gradient(180deg, color-mix(in oklch, var(--planner-panel-soft) 70%, var(--track-accent) 30%) 0%, color-mix(in oklch, var(--planner-panel-muted) 84%, #17110d 16%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in oklch, white 8%, transparent),
			0 6px 12px color-mix(in oklch, var(--shadow-soft) 85%, var(--track-accent) 5%);
		border: 1px solid color-mix(in oklch, var(--track-accent) 28%, var(--planner-border-soft));
		border-radius: 1rem;
		padding: 1.1rem;
		--track-accent: #d8b06f;
		--track-accent-soft: #f0d5a6;
	}

	.track-card.is-active {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 84%, var(--track-accent) 16%) 0%, color-mix(in oklch, var(--control-bg) 74%, #16110d 26%) 100%);
		box-shadow: 0 7px 14px color-mix(in oklch, var(--shadow-soft) 68%, var(--track-accent) 32%);
		border-color: color-mix(in oklch, var(--track-accent) 74%, white 26%);
	}

	.track-card.is-active,
	.deliverable-pill.is-active {
		box-shadow: 0 7px 14px color-mix(in oklch, var(--shadow-soft) 60%, #ba8a35 40%);
		border-color: color-mix(in oklch, var(--planner-brass) 20%, white 60%);
	}

	.track-card.is-active.is-critical,
	.deliverable-pill.is-active.is-critical {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 65%, #6a2b24 35%) 0%, color-mix(in oklch, var(--control-bg) 55%, #381512 45%) 100%);
	}

	.track-card.is-active.is-high,
	.deliverable-pill.is-active.is-high {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 65%, #6b5122 35%) 0%, color-mix(in oklch, var(--control-bg) 55%, #382912 45%) 100%);
	}

	.track-card.is-active.is-medium,
	.deliverable-pill.is-active.is-medium {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 65%, #284a62 35%) 0%, color-mix(in oklch, var(--control-bg) 55%, #162b39 45%) 100%);
	}

	.track-card.is-active.is-support,
	.deliverable-pill.is-active.is-support {
		background: linear-gradient(180deg, color-mix(in oklch, var(--control-bg) 60%, #38302a 40%) 0%, color-mix(in oklch, var(--control-bg) 60%, #201914 40%) 100%);
	}

	.track-card.is-art {
		--track-accent: #8fb96a;
		--track-accent-soft: #d9edbb;
	}

	.track-card.is-complete {
		opacity: 0.5;
		filter: saturate(0.25);
	}

	.track-card.is-foundation {
		--track-accent: #d5a45f;
		--track-accent-soft: #f2d39f;
	}

	.track-card.is-gameplay {
		--track-accent: #c97d64;
		--track-accent-soft: #f0c5b3;
	}

	.track-card.is-presentation {
		--track-accent: #d59652;
		--track-accent-soft: #f0d1a0;
	}

	.track-card.is-ship {
		--track-accent: #78a9d5;
		--track-accent-soft: #c9e3f8;
	}

	.track-card.is-text {
		--track-accent: #b48cd4;
		--track-accent-soft: #e6d2f6;
	}

	.track-card.is-text-polish {
		--track-accent: #9b86c9;
		--track-accent-soft: #ddd2f3;
	}

	@media (max-width: 1050px) {
		.planner-hero-layout {
			grid-template-columns: 1fr;
		}

		.compass-grid {
			grid-template-columns: 1fr;
		}

		.project-hub-grid,
		.project-inspector-stats {
			grid-template-columns: 1fr;
		}

		.workbench-grid {
			grid-template-columns: 1fr;
		}

		.focus-column {
			display: grid;
			gap: 1.25rem;
			min-inline-size: 0;
		}

		.surface-group-grid {
			grid-template-columns: 1fr;
		}

		.track-list {
			grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		}
	}

	@media (max-width: 720px) {
		.project-list,
		.resource-grid,
		.surface-card-grid,
		.detail-grid,
		.instruction-grid,
		.compass-grid,
		.planner-hero-route {
			grid-template-columns: 1fr;
		}

		.project-hub-overview,
		.project-inspector-hero,
		.project-toolbar[aria-label="Planner project actions"] {
			grid-template-columns: 1fr;
		}

		.planner-hero-guide {
			padding: 0.95rem;
		}

		.planner-hero-map {
			padding: 0.95rem;
		}

		.planner-hero-route::before {
			display: none;
		}

		.project-hub,
		.project-rail,
		.project-inspector,
		.project-share-panel {
			padding: 0.95rem;
		}

		.project-row {
			grid-template-columns: minmax(0, 1fr);
		}

		.project-row-icon,
		.project-icon-preview {
			justify-self: start;
		}

		.project-hub-overview-meta,
		.project-inspector-hero {
			align-items: start;
		}

		.surface-directory .surface-card.is-featured {
			grid-column: auto;
		}

		.compass-panel {
			padding: 1rem;
		}

		.deliverable-path-node {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.7rem;
		}

		.deliverable-path-node::after {
			display: none;
		}

		.deliverable-step-marker {
			padding-block-start: 0;
		}

		.deliverable-step-head,
		.deliverable-node-actions {
			flex-direction: column;
			align-items: start;
		}

		.deliverable-detail-actions,
		.deliverable-detail-nav {
			justify-items: start;
			justify-content: start;
		}
	}
</style>
