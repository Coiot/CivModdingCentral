<script>
	import { onMount } from "svelte";
	import MapViewer from "./lib/components/MapViewer.svelte";
	import AppNavbar from "./lib/components/AppNavbar.svelte";
	import { maps } from "./lib/config/maps.js";

	const THEME_STORAGE_KEY = "cmc-theme-mode";
	const AUTH_STORAGE_KEY = "cmc-auth-session";

	const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
	const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
	const SUPABASE_EDITOR_CHECK_FUNCTION = import.meta.env.VITE_SUPABASE_EDITOR_CHECK_FUNCTION || "check-kofi-subscriber";
	const SUPABASE_EDITOR_CHECK_MAP_ID = import.meta.env.VITE_SUPABASE_EDITOR_CHECK_MAP_ID || "cmc";
	const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

	let selectedMapId = $state(maps[0]?.id || "");
	const selectedMap = $derived(maps.find((mapItem) => mapItem.id === selectedMapId) || maps[0] || null);

	let themeMode = $state("light");
	let authUser = $state(null);
	let authEmail = $state("");
	let authMessage = $state("");
	let authLoading = $state(false);
	let authAccessAllowed = $state(false);
	let authAccessLoading = $state(false);
	let authAccessChecked = $state(false);
	let authSession = $state({
		accessToken: "",
		refreshToken: "",
	});

	const canEdit = $derived(Boolean(authUser) && authAccessAllowed);

	onMount(() => {
		restoreTheme();
		void restoreAuth();
	});

	function onMapSelect(mapId) {
		selectedMapId = mapId;
	}

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
			applyTheme("light");
			return;
		}

		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		const mode = stored === "dark" ? "dark" : "light";
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
			const user = await fetchAuthUser(authSession.accessToken);
			authUser = user;
			await resolveUserEditorAccess(user, authSession.accessToken);
		} catch {
			clearAuthSession();
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
			const allowed = await checkEditorAccessWithFunction(email, accessToken);

			authAccessAllowed = Boolean(allowed);
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

	async function fetchAuthUser(accessToken) {
		const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
			headers: {
				apikey: SUPABASE_ANON_KEY,
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload?.id) {
			throw new Error(payload?.error_description || payload?.msg || "Unable to restore user session.");
		}

		return {
			id: payload.id,
			email: payload.email || "unknown",
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
</script>

<main class="page-shell">
	<AppNavbar
		{themeMode}
		{authUser}
		{authEmail}
		{authMessage}
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

	<header class="hero">
		<h1>Interactive Map Viewer</h1>
		<p>Browse community Civ5 maps with tile hover details, civilization starting location pins, and view settings.</p>
	</header>

	{#if selectedMap}
		<MapViewer mapItem={selectedMap} {maps} selectedMapId={selectedMap?.id || ""} onSelectMap={onMapSelect} {canEdit} {authUser} authAccessToken={authSession.accessToken} />
	{/if}
</main>
