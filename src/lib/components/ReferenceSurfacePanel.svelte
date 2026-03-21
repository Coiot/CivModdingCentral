<script>
	import SurfaceLinkCard from "./SurfaceLinkCard.svelte";

	export let title = "References";
	export let ariaLabel = "Reference links";
	export let items = [];
	export let tone = "schema";
	export let className = "";

	function handleCardClick(event, item) {
		item?.onClick?.(event, item);
	}
</script>

<section class={`reference-surface-panel reference-surface-panel--${tone} ${className}`.trim()} aria-label={ariaLabel}>
	<div class="reference-surface-head">
		<h4>{title}</h4>
	</div>

	<div class="reference-surface-grid">
		{#each items as item (item.key || `${item.href}:${item.label}`)}
			<SurfaceLinkCard
				title={item.label}
				description={item.description}
				kind={item.kind}
				href={item.href}
				target={item.target ?? "_blank"}
				rel={item.rel ?? "noreferrer"}
				surfaceClass={item.surfaceClass || "is-tool"}
				className="reference-surface-card"
				disabled={item.disabled}
				onClick={(event) => handleCardClick(event, item)}
			/>
		{/each}
	</div>
</section>

<style>
	.reference-surface-panel {
		--panel-border-tone: var(--surface-schema-border);
		--panel-highlight-tone: var(--surface-schema-highlight);
		--panel-panel-tone: var(--surface-schema-panel);

		display: grid;
		gap: 0.75rem;
	}

	.reference-surface-panel--schema {
		--panel-border-tone: var(--surface-schema-border);
		--panel-highlight-tone: var(--surface-schema-highlight);
		--panel-panel-tone: var(--surface-schema-panel);
	}

	.reference-surface-panel--pattern {
		--panel-border-tone: var(--surface-pattern-border);
		--panel-highlight-tone: var(--surface-pattern-highlight);
		--panel-panel-tone: var(--surface-pattern-panel);
	}

	.reference-surface-head h4 {
		font-size: 1.125rem;
		margin: 0;
	}

	.reference-surface-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1rem;
	}
</style>
