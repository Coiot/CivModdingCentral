<script>
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import Navbar from "./lib/components/Navbar.svelte";
	import DirectoryPage from "./lib/components/DirectoryPage.svelte";

	const THEME_STORAGE_KEY = "cmc-theme-mode";
	const AUTH_STORAGE_KEY = "cmc-auth-session";

	const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
	const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
	const SUPABASE_EDITOR_CHECK_FUNCTION = import.meta.env.VITE_SUPABASE_EDITOR_CHECK_FUNCTION || "check-kofi-subscriber";
	const SUPABASE_EDITOR_CHECK_MAP_ID = import.meta.env.VITE_SUPABASE_EDITOR_CHECK_MAP_ID || "cmc";
	const SUPABASE_EDITOR_ALLOWLIST_TABLE = import.meta.env.VITE_SUPABASE_EDITOR_ALLOWLIST_TABLE || "cmc_editor_access";
	const GOOGLE_SHEET_PUB_ID = import.meta.env.VITE_GOOGLE_SHEET_PUB_ID || "";
	const GOOGLE_SHEET_PUB_URL = import.meta.env.VITE_GOOGLE_SHEET_PUB_URL || "";
	const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

	let themeMode = $state("dark");
	let authUser = $state(null);
	let authEmail = $state("");
	let authMessage = $state("");
	let authLoading = $state(false);
	let authAccessAllowed = $state(false);
	let authAccessLoading = $state(false);
	let authAccessChecked = $state(false);
	let authAccessDebug = $state("");
	let currentPath = $state(typeof window !== "undefined" ? window.location.pathname || "/" : "/");
	let MapViewerComponent = $state(null);
	let mapViewerLoadError = $state("");
	let authRestoreStarted = $state(false);
	let authSession = $state({
		accessToken: "",
		refreshToken: "",
	});

	const canEdit = $derived(Boolean(authUser) && authAccessAllowed);

	function normalizePathname(value) {
		const path = String(value || "").trim();
		return path || "/";
	}

	function runPageTransition(update) {
		if (typeof document !== "undefined" && typeof document.startViewTransition === "function") {
			document.startViewTransition(update);
			return;
		}
		update();
	}

	function navigateTo(pathname, options = {}) {
		if (typeof window === "undefined") {
			return;
		}

		const normalizedPath = normalizePathname(pathname);
		const replace = Boolean(options.replace);
		if (normalizedPath === currentPath) {
			return;
		}

		runPageTransition(() => {
			if (replace) {
				window.history.replaceState({}, "", normalizedPath);
			} else {
				window.history.pushState({}, "", normalizedPath);
			}
			currentPath = normalizedPath;
		});
	}

	async function ensureMapViewerLoaded() {
		if (MapViewerComponent || mapViewerLoadError) {
			return;
		}
		try {
			const module = await import("./lib/components/MapViewer.svelte");
			MapViewerComponent = module.default;
		} catch (error) {
			mapViewerLoadError = error?.message || "Unable to load map viewer.";
		}
	}

	function isInternalNavClick(event) {
		if (event.defaultPrevented || event.button !== 0) {
			return null;
		}
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return null;
		}

		const anchor = event.target?.closest?.("a[href]");
		if (!anchor) {
			return null;
		}
		if (anchor.target && anchor.target !== "_self") {
			return null;
		}
		if (anchor.hasAttribute("download")) {
			return null;
		}

		const href = anchor.getAttribute("href") || "";
		if (!href || href.startsWith("#")) {
			return null;
		}

		try {
			const url = new URL(anchor.href, window.location.href);
			if (url.origin !== window.location.origin) {
				return null;
			}
			return url;
		} catch {
			return null;
		}
	}

	onMount(() => {
		restoreTheme();
		if (typeof window !== "undefined") {
			const handlePopState = () => {
				const nextPath = normalizePathname(window.location.pathname);
				if (nextPath === currentPath) {
					return;
				}
				runPageTransition(() => {
					currentPath = nextPath;
				});
			};
			const handleDocumentClick = (event) => {
				const url = isInternalNavClick(event);
				if (!url) {
					return;
				}
				const nextPath = normalizePathname(url.pathname);
				if (nextPath === currentPath) {
					return;
				}
				event.preventDefault();
				navigateTo(nextPath);
			};
			window.addEventListener("popstate", handlePopState);
			window.addEventListener("click", handleDocumentClick);
			return () => {
				window.removeEventListener("popstate", handlePopState);
				window.removeEventListener("click", handleDocumentClick);
			};
		}
	});

	$effect(() => {
		if (currentPath === "/directory") {
			return;
		}
		void ensureMapViewerLoaded();
	});

	$effect(() => {
		if (currentPath === "/directory" || authRestoreStarted) {
			return;
		}
		authRestoreStarted = true;
		void restoreAuth();
	});

	function onAuthEmailInput(value) {
		authEmail = value;
		authMessage = "";
	}

	function toggleTheme() {
		applyTheme(themeMode === "dark" ? "light" : "dark");
	}

	function setThemeMode(mode) {
		applyTheme(mode);
	}

	function restoreTheme() {
		if (typeof localStorage === "undefined") {
			applyTheme("dark");
			return;
		}

		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		const mode = stored === "light" ? "light" : "dark";
		applyTheme(mode);
	}

	function applyTheme(mode) {
		themeMode = mode === "dark" ? "dark" : "light";
		if (typeof document !== "undefined") {
			document.documentElement.dataset.theme = themeMode;
		}
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(THEME_STORAGE_KEY, themeMode);
		}
	}

	async function restoreAuth() {
		if (!AUTH_ENABLED) {
			return;
		}

		const hashTokens = parseHashTokens();
		const storedSession = loadStorageJson(AUTH_STORAGE_KEY, null);
		const nextSession = hashTokens || storedSession;
		if (!nextSession?.accessToken) {
			return;
		}

		authSession = {
			accessToken: nextSession.accessToken,
			refreshToken: nextSession.refreshToken || "",
		};
		saveStorageJson(AUTH_STORAGE_KEY, authSession);

		try {
			const user = await restoreAuthUserWithRefresh();
			authUser = user;
			await resolveUserEditorAccess(user, authSession.accessToken);
		} catch (error) {
			if (!error?.authInvalid) {
				authMessage = "Unable to restore session right now.";
				return;
			}
			clearAuthSession();
		}
	}

	async function restoreAuthUserWithRefresh() {
		try {
			return await fetchAuthUser(authSession.accessToken);
		} catch (error) {
			const status = Number(error?.status || 0);
			const canRefresh = Boolean(authSession.refreshToken);
			if ((status !== 401 && status !== 403) || !canRefresh) {
				throw error;
			}

			const refreshed = await refreshAuthSession(authSession.refreshToken);
			authSession = refreshed;
			saveStorageJson(AUTH_STORAGE_KEY, refreshed);
			return await fetchAuthUser(refreshed.accessToken);
		}
	}

	function parseHashTokens() {
		if (typeof window === "undefined" || !window.location.hash) {
			return null;
		}

		const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
		const params = new URLSearchParams(hash);
		const accessToken = params.get("access_token");
		if (!accessToken) {
			return null;
		}

		const refreshToken = params.get("refresh_token") || "";
		window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
		return { accessToken, refreshToken };
	}

	async function sendMagicLink() {
		if (!AUTH_ENABLED) {
			authMessage = "Supabase auth is not configured in this app.";
			return;
		}

		const email = String(authEmail || "").trim();
		if (!email) {
			authMessage = "Enter an email to continue.";
			return;
		}

		authLoading = true;
		authMessage = "";

		try {
			const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
				method: "POST",
				headers: {
					apikey: SUPABASE_ANON_KEY,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					create_user: true,
					email_redirect_to: `${window.location.origin}${window.location.pathname}`,
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload?.msg || payload?.error_description || payload?.error || "Unable to send sign-in link.");
			}

			authMessage = `Sign-in link sent to ${email}.`;
		} catch (error) {
			authMessage = error?.message || "Unable to send sign-in link.";
		} finally {
			authLoading = false;
		}
	}

	async function logout() {
		if (AUTH_ENABLED && authSession.accessToken) {
			try {
				await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
					method: "POST",
					headers: {
						apikey: SUPABASE_ANON_KEY,
						Authorization: `Bearer ${authSession.accessToken}`,
					},
				});
			} catch {
				// Ignore logout endpoint failures and clear local session.
			}
		}

		clearAuthSession();
		authMessage = "Signed out.";
	}

	function clearAuthSession() {
		authUser = null;
		authSession = { accessToken: "", refreshToken: "" };
		resetAuthAccessState();
		if (typeof localStorage !== "undefined") {
			localStorage.removeItem(AUTH_STORAGE_KEY);
		}
	}

	function resetAuthAccessState() {
		authAccessAllowed = false;
		authAccessLoading = false;
		authAccessChecked = false;
		authAccessDebug = "";
	}

	async function resolveUserEditorAccess(user, accessToken) {
		if (!user?.email || !accessToken) {
			resetAuthAccessState();
			return;
		}

		authAccessLoading = true;
		authAccessChecked = false;
		authAccessAllowed = false;

		try {
			const email = String(user.email || "")
				.trim()
				.toLowerCase();
			const checks = [];

			if (SUPABASE_EDITOR_ALLOWLIST_TABLE) {
				checks.push({ label: "table", run: () => checkEditorAccessWithTable(email, accessToken) });
			}

			if (GOOGLE_SHEET_PUB_ID || GOOGLE_SHEET_PUB_URL) {
				checks.push({ label: "sheet", run: () => checkEditorAccessWithSheet(email) });
			}

			if (!checks.length) {
				throw new Error("Editor access checks are not configured.");
			}

			const results = [];
			let allowed = false;
			let allErrored = true;

			for (const check of checks) {
				try {
					const ok = Boolean(await check.run());
					results.push({ label: check.label, ok });
					allErrored = false;
					if (ok && check.label === "table") {
						allowed = true;
						break;
					}
					allowed = allowed || ok;
				} catch (error) {
					results.push({ label: check.label, error });
				}
			}

			if (!allowed && SUPABASE_EDITOR_CHECK_FUNCTION) {
				try {
					const ok = Boolean(await checkEditorAccessWithFunction(email, accessToken));
					results.push({ label: "fn", ok });
					allErrored = false;
					allowed = allowed || ok;
				} catch (error) {
					results.push({ label: "fn", error });
				}
			}

			authAccessDebug = results
				.map((result) => {
					if (result.ok) {
						return `${result.label}=allow`;
					}
					if (result.error) {
						const message = String(result.error?.message || "error");
						return `${result.label}=error`;
					}
					return `${result.label}=deny`;
				})
				.join(" ");

			if (!allowed && allErrored) {
				throw results.find((result) => result.error)?.error;
			}

			authAccessAllowed = allowed;
			authAccessChecked = true;
			authMessage = authAccessAllowed ? "Signed in. Editor access enabled." : "Signed in, but this email is not on the editor allowlist.";
		} catch (error) {
			authAccessAllowed = false;
			authAccessChecked = true;
			authMessage = error?.message || "Signed in, but editor access could not be verified.";
		} finally {
			authAccessLoading = false;
		}
	}

	async function checkEditorAccessWithFunction(email, accessToken) {
		if (!SUPABASE_EDITOR_CHECK_FUNCTION) {
			throw new Error("Editor access function is not configured.");
		}

		const response = await fetch(`${SUPABASE_URL}/functions/v1/${SUPABASE_EDITOR_CHECK_FUNCTION}`, {
			method: "POST",
			headers: {
				apikey: SUPABASE_ANON_KEY,
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				map_id: SUPABASE_EDITOR_CHECK_MAP_ID,
				email,
			}),
		});

		const payload = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error(payload?.message || payload?.error || "Unable to verify editor access.");
		}
		if (typeof payload?.allowed !== "boolean") {
			throw new Error("Editor access function returned an invalid response.");
		}
		return payload.allowed;
	}

	async function checkEditorAccessWithTable(email, accessToken) {
		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			throw new Error("Supabase allowlist is not configured.");
		}
		const normalized = normalizeEmail(email);
		if (!normalized) {
			return false;
		}
		const params = new URLSearchParams();
		params.set("select", "email");
		params.set("email", `eq.${normalized}`);
		params.set("limit", "1");
		const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_EDITOR_ALLOWLIST_TABLE}?${params.toString()}`;

		const baseHeaders = {
			apikey: SUPABASE_ANON_KEY,
		};

		const fetchWithHeaders = async (headers) => {
			const response = await fetch(url, { headers });
			if (!response.ok) {
				const text = await response.text().catch(() => "");
				const error = new Error(text || `Allowlist lookup failed (${response.status}).`);
				error.status = response.status;
				throw error;
			}
			const payload = await response.json().catch(() => []);
			return Array.isArray(payload) && payload.length > 0;
		};

		if (accessToken) {
			try {
				return await fetchWithHeaders({
					...baseHeaders,
					Authorization: `Bearer ${accessToken}`,
				});
			} catch (error) {
				if (error?.status !== 401 && error?.status !== 403) {
					throw error;
				}
			}
		}

		return await fetchWithHeaders(baseHeaders);
	}

	async function checkEditorAccessWithSheet(email) {
		const url = GOOGLE_SHEET_PUB_URL || (GOOGLE_SHEET_PUB_ID ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(GOOGLE_SHEET_PUB_ID)}/gviz/tq?tqx=out:csv` : "");
		if (!url) {
			throw new Error("Google Sheet allowlist is not configured.");
		}

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Unable to read allowlist sheet (${response.status}).`);
		}

		const csvText = await response.text();
		const rows = parseCsv(csvText);
		const emails = rows.map((row) => normalizeEmail(row?.[0])).filter(Boolean);

		return emails.includes(normalizeEmail(email));
	}

	async function fetchAuthUser(accessToken) {
		const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
			headers: {
				apikey: SUPABASE_ANON_KEY,
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload?.id) {
			const message = payload?.error_description || payload?.msg || "Unable to restore user session.";
			const error = new Error(message);
			error.status = response.status;
			throw error;
		}

		return {
			id: payload.id,
			email: payload.email || "unknown",
		};
	}

	async function refreshAuthSession(refreshToken) {
		const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
			method: "POST",
			headers: {
				apikey: SUPABASE_ANON_KEY,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ refresh_token: refreshToken }),
		});

		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload?.access_token) {
			const message = payload?.error_description || payload?.msg || payload?.error || "Unable to refresh user session.";
			const error = new Error(message);
			error.status = response.status;
			error.authInvalid = response.status === 400 || response.status === 401 || response.status === 403;
			throw error;
		}

		return {
			accessToken: String(payload.access_token || ""),
			refreshToken: String(payload.refresh_token || refreshToken || ""),
		};
	}

	function loadStorageJson(key, fallback) {
		if (typeof localStorage === "undefined") {
			return fallback;
		}
		try {
			const raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : fallback;
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

	function normalizeEmail(input) {
		const value = String(input || "")
			.trim()
			.toLowerCase();
		if (!value || !value.includes("@")) {
			return "";
		}
		return value;
	}

	function parseCsv(input) {
		const rows = [];
		let row = [];
		let cell = "";
		let inQuotes = false;

		for (let index = 0; index < input.length; index += 1) {
			const char = input[index];
			const next = input[index + 1];

			if (inQuotes) {
				if (char === '"' && next === '"') {
					cell += '"';
					index += 1;
				} else if (char === '"') {
					inQuotes = false;
				} else {
					cell += char;
				}
				continue;
			}

			if (char === '"') {
				inQuotes = true;
				continue;
			}
			if (char === ",") {
				row.push(cell);
				cell = "";
				continue;
			}
			if (char === "\n") {
				row.push(cell);
				rows.push(row);
				row = [];
				cell = "";
				continue;
			}
			if (char === "\r") {
				continue;
			}
			cell += char;
		}

		row.push(cell);
		if (row.length > 1 || row[0] !== "") {
			rows.push(row);
		}

		return rows;
	}
</script>

<main class="page-shell">
	<Navbar
		{themeMode}
		{currentPath}
		{authUser}
		{authEmail}
		{authMessage}
		{authAccessDebug}
		{authLoading}
		{authAccessAllowed}
		{authAccessLoading}
		{authAccessChecked}
		authEnabled={AUTH_ENABLED}
		onToggleTheme={toggleTheme}
		onSetThemeMode={setThemeMode}
		{onAuthEmailInput}
		onSendMagicLink={sendMagicLink}
		onLogout={logout}
	/>

	{#key currentPath}
		<div class="route-shell" in:fade={{ duration: 180 }} out:fade={{ duration: 130 }}>
			{#if currentPath === "/directory"}
				<DirectoryPage />
			{:else if mapViewerLoadError}
				<p class="status error">{mapViewerLoadError}</p>
			{:else if MapViewerComponent}
				<MapViewerComponent {canEdit} {authUser} authAccessToken={authSession.accessToken} />
			{:else}
				<p class="status">Loading map viewer...</p>
			{/if}
		</div>
	{/key}
</main>

<style>
	.route-shell {
		view-transition-name: route-shell;
	}

	:global(::view-transition-old(route-shell)),
	:global(::view-transition-new(route-shell)) {
		animation-duration: 180ms;
		animation-timing-function: ease;
	}

	:global(::view-transition-old(route-shell)) {
		animation-name: app-route-fade-out;
	}

	:global(::view-transition-new(route-shell)) {
		animation-name: app-route-fade-in;
	}

	@keyframes app-route-fade-out {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	@keyframes app-route-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
