<svelte:options runes={true} />

<script>
	import { onDestroy } from "svelte";
	import { normalizeSnippetLanguage } from "../data/generatorPageData.js";

	let { example, activeLanguage = "all", showSummary = true, variant = "default" } = $props();

	let copiedKey = $state("");
	let resetTimeout;
	let selectedFileKey = $state("");
	let selectedVariantKey = $state("");

	const isRecipeVariant = $derived(variant === "recipe");
	const isWizardVariant = $derived(variant === "wizard");

	function normalizeFiles(source, fallbackTitle = "snippet") {
		const seenKeys = new Map();
		return (source?.length ? source : []).filter(Boolean).map((file, index) => {
			const baseKey = file.key || file.path || file.label || `${fallbackTitle}-${index}`;
			const duplicateCount = seenKeys.get(baseKey) || 0;
			seenKeys.set(baseKey, duplicateCount + 1);

			return {
				key: duplicateCount ? `${baseKey}::${duplicateCount}` : baseKey,
				label: file.label || file.path || `Snippet ${index + 1}`,
				path: file.path || "",
				language: normalizeSnippetLanguage(file.language || "text"),
				code: file.code || "",
				note: file.note || "",
			};
		});
	}

	function filterByLanguage(files) {
		return activeLanguage === "all" ? files : files.filter((file) => normalizeSnippetLanguage(file.language) === activeLanguage);
	}

	function fileIdentity(file) {
		return `${file.path || file.label || ""}::${normalizeSnippetLanguage(file.language)}`;
	}

	function variantTargetMeta(files) {
		const identities = [...new Set(files.map(fileIdentity))];
		if (identities.length === 1 && files[0]?.path) {
			return `Use in ${files[0].path}`;
		}
		if (files.length === 1) {
			return `${files[0]?.language || "text"} file`;
		}
		return `${files.length} files`;
	}

	const normalizedFiles = $derived(normalizeFiles(example?.files?.length ? example.files : example ? [example] : [], example?.title || "snippet"));
	const filteredFiles = $derived(filterByLanguage(normalizedFiles));
	const explicitVariants = $derived(
		(example?.variants?.length ? example.variants : [])
			.map((entry, index) => {
				const files = normalizeFiles(entry?.files?.length ? entry.files : entry ? [entry] : [], entry?.title || entry?.label || `${example?.title || "snippet"}-${index}`);
				const visibleFiles = filterByLanguage(files);
				return {
					key: entry?.key || entry?.id || entry?.title || entry?.label || `variant-${index}`,
					label: entry?.label || entry?.title || `Example ${index + 1}`,
					note: entry?.note || entry?.summary || "",
					meta: variantTargetMeta(visibleFiles),
					files: visibleFiles,
				};
			})
			.filter((entry) => entry.files.length > 0),
	);
	const inferredVariants = $derived(
		!explicitVariants.length && isRecipeVariant && filteredFiles.length > 1 && new Set(filteredFiles.map(fileIdentity)).size === 1
			? filteredFiles.map((file, index) => ({
					key: `variant-${file.key}`,
					label: `Example ${index + 1}`,
					note: file.note || "",
					meta: `Use in ${file.path || file.label || "target file"}`,
					files: [file],
				}))
			: [],
	);
	const exampleVariants = $derived(explicitVariants.length ? explicitVariants : inferredVariants);
	const hasExampleVariants = $derived(exampleVariants.length > 0);
	const hasVisibleSnippets = $derived(Boolean(filteredFiles.length || exampleVariants.length));
	const displayFiles = $derived((hasExampleVariants ? exampleVariants.find((entry) => entry.key === selectedVariantKey) || exampleVariants[0] : null)?.files || filteredFiles);
	const selectedVariant = $derived((hasExampleVariants ? exampleVariants.find((entry) => entry.key === selectedVariantKey) || exampleVariants[0] : null) || null);
	const selectedFile = $derived(displayFiles.find((file) => file.key === selectedFileKey) || displayFiles[0]);
	const selectedFileNote = $derived(selectedFile?.note && selectedFile.note !== selectedVariant?.note ? selectedFile.note : "");

	async function copySnippet(file) {
		if (!file?.code || typeof navigator === "undefined" || !navigator.clipboard) {
			return;
		}

		try {
			await navigator.clipboard.writeText(file.code);
			copiedKey = file.key;
			clearTimeout(resetTimeout);
			resetTimeout = window.setTimeout(() => {
				copiedKey = "";
			}, 1600);
		} catch {
			// Ignore copy failures silently for now.
		}
	}

	onDestroy(() => {
		clearTimeout(resetTimeout);
	});
</script>

<div class="snippet-example">
	{#if showSummary && example?.summary}
		<p class="snippet-summary">{example.summary}</p>
	{/if}

	{#if !hasVisibleSnippets}
		<p class="snippet-empty">No {activeLanguage === "all" ? "" : activeLanguage.toUpperCase()} snippet is available for this example.</p>
	{:else}
		{#if hasExampleVariants}
			<div class={`snippet-tabs-shell ${isRecipeVariant ? "is-recipe" : ""} ${isWizardVariant ? "is-wizard" : ""}`}>
				<div class="snippet-tabs-copy">
					<span class="snippet-tabs-kicker">Example Variants</span>
					<p class="snippet-tabs-description">
						{isRecipeVariant
							? "These are alternative variants for the same type of example. Use the file switcher below only if that variant includes multiple files."
							: "These are alternative implementations of the same example. Pick the variant that matches what you want to build."}
					</p>
				</div>

				<div class="snippet-tabs snippet-tabs--variants" role="tablist" aria-label="Example variants">
					{#each exampleVariants as entry (entry.key)}
						<button
							type="button"
							role="tab"
							aria-selected={selectedVariant?.key === entry.key}
							class={`snippet-tab ${isRecipeVariant ? "is-recipe" : ""} ${isWizardVariant ? "is-wizard" : ""}`}
							class:is-active={selectedVariant?.key === entry.key}
							onclick={() => (selectedVariantKey = entry.key)}
						>
							<span class="snippet-tab-title">{entry.label}</span>
							<span class="snippet-tab-meta">{entry.meta}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if selectedVariant?.note}
			<p class="snippet-variant-note">{selectedVariant.note}</p>
		{/if}

		{#if displayFiles.length > 1}
			<div class={`snippet-tabs-shell ${isRecipeVariant ? "is-recipe" : ""} ${isWizardVariant ? "is-wizard" : ""}`}>
				<div class="snippet-tabs-copy">
					<span class="snippet-tabs-kicker">{isRecipeVariant ? "Recipe Files" : isWizardVariant ? "Generated Files" : "Included Files"}</span>
					<p class="snippet-tabs-description">
						{isRecipeVariant
							? "Switch between the files this recipe uses together."
							: isWizardVariant
								? "Switch between the files this generator preview is currently producing."
								: "Switch between the files included in this example."}
					</p>
				</div>

				<div class="snippet-tabs" role="tablist" aria-label="Snippet files">
					{#each displayFiles as file (file.key)}
						<button
							type="button"
							role="tab"
							aria-selected={selectedFile?.key === file.key}
							class={`snippet-tab ${selectedFile?.key === file.key ? "is-active" : ""} ${isRecipeVariant ? "is-recipe" : ""} ${isWizardVariant ? "is-wizard" : ""}`}
							onclick={() => (selectedFileKey = file.key)}
						>
							<span class="snippet-tab-title">{file.label}</span>
							<span class="snippet-tab-meta">{file.language} file</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if selectedFile}
			<div class="snippet-file-list">
				<article class="snippet-file-card">
					<div class="snippet-file-head">
						<div class="snippet-file-meta">
							<span class="snippet-file-label">{selectedFile.label}</span>
							<!-- {#if selectedFile.path}
									<span>{selectedFile.path}</span>
								{/if} -->
						</div>
					</div>

					{#if selectedFileNote}
						<p class="snippet-file-note">{selectedFileNote}</p>
					{/if}

					<div class="snippet-code-shell">
						<div class="snippet-file-actions">
							<span class="snippet-file-language">{selectedFile.language}</span>
							<button type="button" class="snippet-copy-button" onclick={() => copySnippet(selectedFile)}>
								{copiedKey === selectedFile.key ? "Copied" : "Copy"}
							</button>
						</div>

						<pre class="snippet-code-block"><code>{selectedFile.code}</code></pre>
					</div>
				</article>
			</div>
		{/if}
	{/if}
</div>

<style>
	.snippet-example,
	.snippet-file-list,
	.snippet-file-card {
		min-width: 0;
		display: grid;
		gap: 0.9rem;
	}

	.snippet-tabs-copy p {
		color: var(--muted-ink);
		font-size: 0.82rem;
		line-height: 1.45;
		margin: 0;
	}

	.snippet-summary,
	.snippet-file-note,
	.snippet-file-meta span,
	.snippet-empty {
		color: var(--muted-ink);
		line-height: 1.55;
		margin: 0;
	}

	.snippet-tabs-copy {
		display: grid;
		gap: 0.22rem;
	}

	.snippet-tab.is-recipe .snippet-tab-meta,
	.snippet-tabs-shell.is-recipe .snippet-tabs-kicker {
		color: #fff1bc;
	}

	.snippet-tab.is-wizard .snippet-tab-meta,
	.snippet-tabs-shell.is-wizard .snippet-tabs-kicker {
		color: #f0e2ff;
	}

	.snippet-tabs-kicker {
		color: color-mix(in oklch, white 78%, var(--ink));
		text-transform: uppercase;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.14em;
	}

	.snippet-tabs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: 0.55rem;
	}

	.snippet-tab-title {
		color: color-mix(in oklch, white 82%, var(--ink));
		font-size: 0.84rem;
		font-weight: 700;
		line-height: 1.3;
		overflow-wrap: anywhere;
	}

	.snippet-tab-title,
	.snippet-tab-meta {
		display: block;
	}

	.snippet-tab.is-recipe .snippet-tab-title {
		color: color-mix(in srgb, white 82%, var(--ink));
	}

	.snippet-tab.is-recipe.is-active .snippet-tab-title,
	.snippet-tab.is-recipe:hover .snippet-tab-title,
	.snippet-tab.is-recipe.is-active .snippet-tab-meta,
	.snippet-tab.is-recipe:hover .snippet-tab-meta {
		color: #fff1bc;
	}

	.snippet-tab.is-wizard.is-active .snippet-tab-title,
	.snippet-tab.is-wizard:hover .snippet-tab-title,
	.snippet-tab.is-wizard.is-active .snippet-tab-meta,
	.snippet-tab.is-wizard:hover .snippet-tab-meta {
		color: #f0e2ff;
	}

	.snippet-tab-meta {
		color: var(--muted-ink);
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.snippet-file-card {
		background: transparent;
		border: none;
		border-radius: 0;
		padding-inline: 0;
		padding-block-start: 0.55rem;
		padding-block-end: 0.2rem;
	}

	.snippet-file-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.65rem;
	}

	.snippet-file-head {
		align-items: start;
	}

	.snippet-file-meta {
		display: grid;
		gap: 0.2rem;
	}

	.snippet-file-label {
		color: color-mix(in oklch, white 84%, var(--ink));
		font-size: 0.9rem;
		font-weight: 700;
	}

	.snippet-code-shell {
		position: relative;
		max-width: 100%;
		min-width: 0;
	}

	.snippet-file-actions {
		position: absolute;
		z-index: 1;
		inset-block-start: 0.8rem;
		inset-inline-end: 0.8rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.snippet-file-language {
		color: var(--muted-ink);
		background: color-mix(in oklch, var(--panel-bg) 78%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 10%, var(--panel-border));
	}

	.snippet-file-language,
	.snippet-copy-button {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		text-transform: uppercase;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		border-radius: 999px;
		padding-block: 0.45rem;
		padding-inline: 0.55rem;
		text-box: trim-both cap alphabetic;
	}

	.snippet-copy-button {
		color: var(--ink);
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 12%, var(--panel-border));
		cursor: pointer;
	}

	.snippet-copy-button:hover {
		background: color-mix(in oklch, var(--accent) 12%, var(--control-bg));
		border-color: color-mix(in oklch, var(--accent) 28%, var(--panel-border));
	}

	.snippet-code-block {
		inline-size: 100%;
		min-inline-size: 0;
		min-block-size: 0;
		max-inline-size: 100%;
		display: block;
		color: color-mix(in oklch, white 88%, var(--ink));
		white-space: pre;
		font-size: 0.84rem;
		line-height: 1.55;
		background: color-mix(in oklch, black 24%, var(--panel-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 8%, var(--panel-border));
		border-radius: 0.85rem;
		box-shadow: 0 2px 6px #111;
		padding-block: 1.5rem;
		padding-inline: 1.15rem;
		margin: 0;
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior-inline: contain;
		scrollbar-color: #d8b24a color-mix(in srgb, var(--panel-bg) 78%, black 22%);
		scrollbar-width: thin;
	}

	.snippet-code-block code {
		inline-size: max-content;
		min-inline-size: 100%;
		display: block;
		font-family: "Iosevka Web", "SFMono-Regular", Consolas, monospace;
	}

	.snippet-code-block::-webkit-scrollbar {
		width: 0.75rem;
		height: 0.75rem;
	}

	.snippet-code-block::-webkit-scrollbar-thumb {
		background: linear-gradient(180deg, #f3d56f 0%, #c89a22 100%);
		border: 2px solid color-mix(in srgb, var(--panel-bg) 78%, black 22%);
		border-radius: 999px;
	}

	.snippet-code-block::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(180deg, #ffe59a 0%, #d7a92f 100%);
	}

	.snippet-code-block::-webkit-scrollbar-track {
		background: color-mix(in srgb, var(--panel-bg) 78%, black 22%);
		border-radius: 999px;
	}

	.snippet-tab {
		display: grid;
		justify-items: start;
		gap: 0.2rem;
		color: var(--muted-ink);
		font-size: 0.8rem;
		font-weight: 600;
		text-align: left;
		background: color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		border-radius: 0.95rem;
		box-shadow: 0 4px 6px #111;
		padding-block: 0.65rem;
		padding-inline: 0.8rem;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease,
			color 140ms ease;
		cursor: pointer;
	}

	.snippet-tab.is-active,
	.snippet-tab:hover {
		color: color-mix(in oklch, white 84%, var(--ink));
		background: color-mix(in oklch, var(--accent) 14%, var(--control-bg)) !important;
		border-color: color-mix(in oklch, var(--accent) 42%, var(--panel-border)) !important;
		transform: translateY(-1px);
	}

	.snippet-tab.is-recipe {
		background: color-mix(in srgb, var(--panel-bg) 90%, #352608 10%);
		border-color: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 70%, #a8861f 30%);
	}

	.snippet-tab.is-recipe.is-active,
	.snippet-tab.is-recipe:hover {
		background: linear-gradient(180deg, color-mix(in srgb, #f5d36a 18%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 72%, #352608 28%) 100%) !important;
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #fff1bc 22%, transparent),
			0 6px 8px color-mix(in oklch, var(--shadow-soft) 90%, transparent);
		border-color: color-mix(in srgb, #f5d36a 72%, white 28%) !important;
	}

	.snippet-tab.is-wizard {
		background: color-mix(in srgb, var(--panel-bg) 90%, #261735 10%);
		border-color: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #6d4bb1 28%);
	}

	.snippet-tab.is-wizard.is-active,
	.snippet-tab.is-wizard:hover {
		background: linear-gradient(180deg, color-mix(in srgb, #caa6ff 18%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 72%, #261735 28%) 100%) !important;
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #f0e2ff 22%, transparent),
			0 10px 22px color-mix(in oklch, var(--shadow-soft) 48%, transparent);
		border-color: color-mix(in srgb, #caa6ff 72%, white 28%) !important;
	}

	.snippet-tabs-shell {
		display: grid;
		gap: 0.7rem;
	}

	@media (width <= 720px) {
		.snippet-tabs {
			grid-template-columns: 1fr;
		}

		.snippet-file-head,
		.snippet-file-actions {
			flex-direction: column;
			align-items: start;
		}

		.snippet-file-actions {
			position: static;
			margin-block-end: 0.65rem;
		}

		.snippet-code-block {
			padding-block-start: 1.4rem;
		}
	}
</style>
