<script>
	export let title = "";
	export let description = "";
	export let kind = "";
	export let href = "";
	export let target = "_blank";
	export let rel = "noreferrer";
	export let surfaceClass = "is-tool";
	export let className = "";
	export let style = "";
	export let disabled = false;
	export let onClick = undefined;

	function handleClick(event) {
		onClick?.(event);
	}
</script>

{#if disabled}
	<div class={`surface-link-card ${surfaceClass} ${className}`.trim()} aria-disabled="true" {style}>
		<div class="surface-link-card-head">
			<h3 class="surface-link-card-title">{title}</h3>
			{#if kind}
				<span class="surface-link-card-kind">{kind}</span>
			{/if}
		</div>
		{#if description}
			<p class="surface-link-card-copy">{description}</p>
		{/if}
	</div>
{:else}
	<a class={`surface-link-card surface-link-card--link ${surfaceClass} ${className}`.trim()} {href} {style} {target} {rel} onclick={handleClick}>
		<div class="surface-link-card-head">
			<h3 class="surface-link-card-title">{title}</h3>
			{#if kind}
				<span class="surface-link-card-kind">{kind}</span>
			{/if}
		</div>
		{#if description}
			<p class="surface-link-card-copy">{description}</p>
		{/if}
	</a>
{/if}

<style>
	.surface-link-card {
		--surface-border: var(--surface-tool-border);
		--surface-highlight: var(--surface-tool-highlight);
		--surface-highlight-strong: var(--surface-tool-highlight-strong);
		--surface-panel: var(--surface-tool-panel);

		display: flex;
		flex-direction: column;
		gap: 1rem;
		color: var(--ink);
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight) 20%, transparent) 0%, transparent 45%),
			linear-gradient(165deg, color-mix(in srgb, var(--surface-panel) 98%, var(--control-bg)) 0%, color-mix(in srgb, var(--surface-panel) 94%, #16110f 6%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--surface-highlight) 10%, transparent),
			0 6px 8px color-mix(in srgb, black 76%, transparent);
		border: 1px solid color-mix(in srgb, var(--surface-highlight) 44%, var(--surface-border));
		border-radius: 1rem;
		padding-block: 1rem;
		padding-inline: 0.95rem;
	}

	.surface-link-card--link {
		text-decoration: none;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			box-shadow 140ms ease;

		&:hover,
		&:focus-visible {
			background:
				radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight) 34%, transparent) 0%, transparent 40%),
				linear-gradient(165deg, color-mix(in srgb, var(--surface-panel) 95%, var(--control-bg)) 0%, color-mix(in srgb, var(--surface-panel) 92%, #16110f 8%) 100%);
			box-shadow:
				inset 0 1px 0 color-mix(in srgb, var(--surface-highlight) 16%, transparent),
				0 10px 16px color-mix(in oklch, var(--shadow-soft) 66%, transparent);
			border-color: color-mix(in srgb, var(--surface-highlight) 72%, var(--surface-border));
			transform: translateY(-2px);
		}
	}

	.surface-link-card-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.7rem;
	}

	.surface-link-card-title {
		margin: 0;
		color: var(--ink);
		font-family: "Rockwell", "Palatino Linotype", serif;
		font-size: 1.08rem;
		line-height: 1.15;
		text-wrap: wrap;
		word-break: break-word;
	}

	.surface-link-card-kind {
		flex: 0 0 auto;
		color: color-mix(in srgb, var(--surface-highlight-strong) 58%, var(--muted-ink) 42%);
		white-space: nowrap;
		font-size: 0.76rem;
		text-box: trim-both cap alphabetic;
	}

	.surface-link-card-copy {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.4;
	}

	.surface-link-card.is-generator {
		--surface-border: var(--surface-generator-border);
		--surface-highlight: var(--surface-generator-highlight);
		--surface-highlight-strong: var(--surface-generator-highlight-strong);
		--surface-panel: var(--surface-generator-panel);
	}

	.surface-link-card.is-lua {
		--surface-border: var(--surface-lua-border);
		--surface-highlight: var(--surface-lua-highlight);
		--surface-highlight-strong: var(--surface-lua-highlight-strong);
		--surface-panel: var(--surface-lua-panel);
	}

	.surface-link-card.is-pattern {
		--surface-border: var(--surface-pattern-border);
		--surface-highlight: var(--surface-pattern-highlight);
		--surface-highlight-strong: var(--surface-pattern-highlight-strong);
		--surface-panel: var(--surface-pattern-panel);
	}

	.surface-link-card.is-publish {
		--surface-border: var(--surface-publish-border);
		--surface-highlight: var(--surface-publish-highlight);
		--surface-highlight-strong: var(--surface-publish-highlight-strong);
		--surface-panel: var(--surface-publish-panel);
	}

	.surface-link-card.is-schema {
		--surface-border: var(--surface-schema-border);
		--surface-highlight: var(--surface-schema-highlight);
		--surface-highlight-strong: var(--surface-schema-highlight-strong);
		--surface-panel: var(--surface-schema-panel);
	}

	.surface-link-card.is-tool {
		--surface-border: var(--surface-tool-border);
		--surface-highlight: var(--surface-tool-highlight);
		--surface-highlight-strong: var(--surface-tool-highlight-strong);
		--surface-panel: var(--surface-tool-panel);
	}

	.surface-link-card.is-ui {
		--surface-border: var(--surface-ui-border);
		--surface-highlight: var(--surface-ui-highlight);
		--surface-highlight-strong: var(--surface-ui-highlight-strong);
		--surface-panel: var(--surface-ui-panel);
	}

	.surface-link-card.is-viewer,
	.surface-link-card.is-support {
		--surface-border: var(--surface-support-border);
		--surface-highlight: var(--surface-support-highlight);
		--surface-highlight-strong: var(--surface-support-highlight-strong);
		--surface-panel: var(--surface-support-panel);
	}

	.surface-link-card.is-planner {
		--surface-border: var(--surface-planner-border);
		--surface-highlight: var(--surface-planner-highlight);
		--surface-highlight-strong: var(--surface-planner-highlight-strong);
		--surface-panel: var(--surface-planner-panel);
	}
</style>
