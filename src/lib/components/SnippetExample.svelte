<script>
	import { onDestroy } from "svelte";
	import { normalizeSnippetLanguage } from "../data/generatorPageData.js";

	export let example;
	export let activeLanguage = "all";
	export let showSummary = true;

	let copiedKey = "";
	let resetTimeout;
	let normalizedFiles = [];
	let filteredFiles = [];
	let selectedFileKey = "";
	let selectedFile;

	$: normalizedFiles = (example?.files?.length ? example.files : [example]).filter(Boolean).map((file, index) => ({
		key: file.key || file.path || file.label || `${example?.title || "snippet"}-${index}`,
		label: file.label || file.path || `Snippet ${index + 1}`,
		path: file.path || "",
		language: normalizeSnippetLanguage(file.language || example?.language || "text"),
		code: file.code || "",
		note: file.note || "",
	}));
	$: filteredFiles = activeLanguage === "all" ? normalizedFiles : normalizedFiles.filter((file) => normalizeSnippetLanguage(file.language) === activeLanguage);
	$: if (!filteredFiles.find((file) => file.key === selectedFileKey)) {
		selectedFileKey = filteredFiles[0]?.key || "";
	}
	$: selectedFile = filteredFiles.find((file) => file.key === selectedFileKey) || filteredFiles[0];

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
			<div class="snippet-tabs" role="tablist" aria-label="Snippet files">
				{#each filteredFiles as file (file.key)}
					<button
						type="button"
						role="tab"
						aria-selected={selectedFile?.key === file.key}
						class={`snippet-tab ${selectedFile?.key === file.key ? "is-active" : ""}`}
						onclick={() => (selectedFileKey = file.key)}
					>
						{file.label}
					</button>
				{/each}
			</div>
		{/if}

		{#if selectedFile}
			<div class="snippet-file-list">
				<article class="snippet-file-card">
					<div class="snippet-file-head">
						<div class="snippet-file-meta">
							<strong>{selectedFile.label}</strong>
							{#if selectedFile.path}
								<span>{selectedFile.path}</span>
							{/if}
						</div>
						<div class="snippet-file-actions">
							<span class="snippet-file-language">{selectedFile.language}</span>
							<button type="button" class="snippet-copy-button" onclick={() => copySnippet(selectedFile)}>
								{copiedKey === selectedFile.key ? "Copied" : "Copy"}
							</button>
						</div>
					</div>

					{#if selectedFile.note}
						<p class="snippet-file-note">{selectedFile.note}</p>
					{/if}

					<pre class="snippet-code-block"><code>{selectedFile.code}</code></pre>
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
		gap: 0.55rem;
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
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.snippet-tab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem 0.65rem;
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		border-radius: 999px;
		background: color-mix(in oklch, var(--panel-bg) 80%, var(--control-bg));
		color: var(--muted-ink);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
	}

	.snippet-tab.is-active,
	.snippet-tab:hover {
		border-color: color-mix(in oklch, var(--accent) 42%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 14%, var(--control-bg));
		color: color-mix(in oklch, white 84%, var(--ink));
	}

	.snippet-file-card {
		padding: 0.95rem;
		border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--panel-border));
		border-radius: 1rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--panel-bg) 86%, var(--control-bg)) 0%, color-mix(in oklch, var(--panel-bg) 78%, var(--control-bg)) 100%);
	}

	.snippet-file-head,
	.snippet-file-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem;
	}

	.snippet-file-head {
		align-items: start;
	}

	.snippet-file-meta {
		display: grid;
		gap: 0.2rem;
	}

	.snippet-file-meta strong {
		color: color-mix(in oklch, white 84%, var(--ink));
		font-size: 0.9rem;
	}

	.snippet-file-language,
	.snippet-copy-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 0.24rem 0.55rem;
	}

	.snippet-file-language {
		color: var(--muted-ink);
		background: color-mix(in oklch, var(--panel-bg) 78%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
	}

	.snippet-copy-button {
		color: var(--ink);
		cursor: pointer;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 22%, var(--panel-border));
	}

	.snippet-copy-button:hover {
		border-color: color-mix(in oklch, var(--accent) 42%, var(--panel-border));
		background: color-mix(in oklch, var(--accent) 12%, var(--control-bg));
	}

	.snippet-code-block {
		margin: 0;
		padding: 0.95rem;
		overflow: auto;
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		border-radius: 0.85rem;
		background: color-mix(in oklch, black 28%, var(--panel-bg));
		color: color-mix(in oklch, white 88%, var(--ink));
		font-size: 0.84rem;
		line-height: 1.55;
	}

	.snippet-code-block code {
		font-family: "Iosevka Web", "SFMono-Regular", Consolas, monospace;
	}

	@media (width <= 720px) {
		.snippet-file-head,
		.snippet-file-actions {
			flex-direction: column;
			align-items: start;
		}
	}
</style>
