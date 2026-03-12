<svelte:options runes={true} />

<script>
	import { onDestroy } from "svelte";
	import { normalizeSnippetLanguage } from "../data/generatorPageData.js";

	let { example, activeLanguage = "all", showSummary = true, variant = "default" } = $props();

	let copiedKey = $state("");
	let resetTimeout;
	let selectedFileKey = $state("");

	const isRecipeVariant = $derived(variant === "recipe");
	const isWizardVariant = $derived(variant === "wizard");

	const normalizedFiles = $derived(
		(example?.files?.length ? example.files : [example]).filter(Boolean).map((file, index) => ({
			key: file.key || file.path || file.label || `${example?.title || "snippet"}-${index}`,
			label: file.label || file.path || `Snippet ${index + 1}`,
			path: file.path || "",
			language: normalizeSnippetLanguage(file.language || example?.language || "text"),
			code: file.code || "",
			note: file.note || "",
		})),
	);
	const filteredFiles = $derived(activeLanguage === "all" ? normalizedFiles : normalizedFiles.filter((file) => normalizeSnippetLanguage(file.language) === activeLanguage));
	const selectedFile = $derived(filteredFiles.find((file) => file.key === selectedFileKey) || filteredFiles[0]);

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

	{#if filteredFiles.length === 0}
		<p class="snippet-empty">No {activeLanguage === "all" ? "" : activeLanguage.toUpperCase()} snippet is available for this example.</p>
	{:else}
		{#if filteredFiles.length > 1}
			<div class={`snippet-tabs-shell ${isRecipeVariant ? "is-recipe" : ""} ${isWizardVariant ? "is-wizard" : ""}`}>
				<div class="snippet-tabs-copy">
					<span class="snippet-tabs-kicker">{isRecipeVariant ? "Recipe Files" : isWizardVariant ? "Generated Files" : "Included Files"}</span>
					<!-- <p>
						{isRecipeVariant
							? "Switch between the files this recipe ships together."
							: isWizardVariant
								? "Switch between the files this generator preview is currently producing."
								: "Switch between the files included in this example."}
					</p> -->
				</div>

				<div class="snippet-tabs" role="tablist" aria-label="Snippet files">
					{#each filteredFiles as file (file.key)}
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

					{#if selectedFile.note}
						<p class="snippet-file-note">{selectedFile.note}</p>
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
		display: grid;
		gap: 0.9rem;
		min-width: 0;
	}

	.snippet-summary,
	.snippet-file-note,
	.snippet-file-meta span,
	.snippet-empty {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
	}

	.snippet-tabs {
		display: grid;
		gap: 0.55rem;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
	}

	.snippet-tabs-shell {
		display: grid;
		gap: 0.7rem;
	}

	.snippet-tabs-copy {
		display: grid;
		gap: 0.22rem;
	}

	.snippet-tabs-copy p {
		margin: 0;
		color: var(--muted-ink);
		font-size: 0.82rem;
		line-height: 1.45;
	}

	.snippet-tabs-kicker {
		color: color-mix(in oklch, white 78%, var(--ink));
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.snippet-tab {
		display: grid;
		gap: 0.2rem;
		justify-items: start;
		padding: 0.65rem 0.8rem;
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		border-radius: 0.95rem;
		background: color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg));
		color: var(--muted-ink);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		text-align: left;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease,
			color 140ms ease;
	}

	.snippet-tab-title,
	.snippet-tab-meta {
		display: block;
	}

	.snippet-tab-title {
		color: color-mix(in oklch, white 82%, var(--ink));
		font-size: 0.84rem;
		font-weight: 700;
		line-height: 1.3;
		overflow-wrap: anywhere;
	}

	.snippet-tab-meta {
		color: var(--muted-ink);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.snippet-tab.is-active,
	.snippet-tab:hover {
		border-color: color-mix(in oklch, var(--accent) 42%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 14%, var(--control-bg));
		color: color-mix(in oklch, white 84%, var(--ink));
		transform: translateY(-1px);
	}

	.snippet-tab.is-recipe {
		border-color: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 70%, #a8861f 30%);
		background: color-mix(in srgb, var(--panel-bg) 90%, #352608 10%);
	}

	.snippet-tab.is-wizard {
		border-color: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 72%, #6d4bb1 28%);
		background: color-mix(in srgb, var(--panel-bg) 90%, #261735 10%);
	}

	.snippet-tab.is-recipe .snippet-tab-title {
		color: color-mix(in srgb, white 82%, var(--ink));
	}

	.snippet-tab.is-recipe .snippet-tab-meta,
	.snippet-tabs-shell.is-recipe .snippet-tabs-kicker {
		color: #fff1bc;
	}

	.snippet-tab.is-wizard .snippet-tab-meta,
	.snippet-tabs-shell.is-wizard .snippet-tabs-kicker {
		color: #f0e2ff;
	}

	.snippet-tab.is-recipe.is-active,
	.snippet-tab.is-recipe:hover {
		background: linear-gradient(180deg, color-mix(in srgb, #f5d36a 18%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 72%, #352608 28%) 100%);
		border-color: color-mix(in srgb, #f5d36a 72%, white 28%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #fff1bc 22%, transparent),
			0 10px 22px color-mix(in oklch, var(--shadow-soft) 48%, transparent);
	}

	.snippet-tab.is-wizard.is-active,
	.snippet-tab.is-wizard:hover {
		background: linear-gradient(180deg, color-mix(in srgb, #caa6ff 18%, transparent) 0%, color-mix(in srgb, var(--panel-bg) 72%, #261735 28%) 100%);
		border-color: color-mix(in srgb, #caa6ff 72%, white 28%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #f0e2ff 22%, transparent),
			0 10px 22px color-mix(in oklch, var(--shadow-soft) 48%, transparent);
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

	.snippet-file-card {
		padding: 0.55rem 0 0.2rem;
		border: none;
		border-radius: 0;
		background: transparent;
	}

	.snippet-file-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem;
	}

	.snippet-file-head {
		align-items: start;
	}

	.snippet-code-shell {
		position: relative;
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
	}

	.snippet-file-actions {
		position: absolute;
		inset-block-start: 0.8rem;
		inset-inline-end: 0.8rem;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

	.snippet-file-language,
	.snippet-copy-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-box: trim-both cap alphabetic;
		padding: 0.45rem 0.55rem;
	}

	.snippet-file-language {
		color: var(--muted-ink);
		background: color-mix(in oklch, var(--panel-bg) 78%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 10%, var(--panel-border));
	}

	.snippet-copy-button {
		color: var(--ink);
		cursor: pointer;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 12%, var(--panel-border));
	}

	.snippet-copy-button:hover {
		border-color: color-mix(in oklch, var(--accent) 28%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 12%, var(--control-bg));
	}

	.snippet-code-block {
		margin: 0;
		inline-size: 100%;
		max-inline-size: 100%;
		min-inline-size: 0;
		padding: 1.5rem 1.15rem;
		overflow-x: auto;
		overflow-y: hidden;
		white-space: pre;
		border: 1px solid color-mix(in oklch, var(--accent) 8%, var(--panel-border));
		border-radius: 0.85rem;
		background: color-mix(in oklch, black 24%, var(--panel-bg));
		color: color-mix(in oklch, white 88%, var(--ink));
		font-size: 0.84rem;
		line-height: 1.55;
		scrollbar-color: #d8b24a color-mix(in srgb, var(--panel-bg) 78%, black 22%);
		scrollbar-width: thin;
	}

	.snippet-code-block::-webkit-scrollbar {
		height: 0.75rem;
		width: 0.75rem;
	}

	.snippet-code-block::-webkit-scrollbar-track {
		background: color-mix(in srgb, var(--panel-bg) 78%, black 22%);
		border-radius: 999px;
	}

	.snippet-code-block::-webkit-scrollbar-thumb {
		background: linear-gradient(180deg, #f3d56f 0%, #c89a22 100%);
		border: 2px solid color-mix(in srgb, var(--panel-bg) 78%, black 22%);
		border-radius: 999px;
	}

	.snippet-code-block::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(180deg, #ffe59a 0%, #d7a92f 100%);
	}

	.snippet-code-block code {
		display: block;
		inline-size: max-content;
		min-inline-size: 100%;
		font-family: "Iosevka Web", "SFMono-Regular", Consolas, monospace;
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
