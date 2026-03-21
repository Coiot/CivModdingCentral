<script>
	import SurfaceLinkCard from "./SurfaceLinkCard.svelte";
	import { linkSurfaceClass, linkSurfaceLabel } from "../utils/siteLinks.js";

	export let ariaLabel = "Helpful links";
	export let eyebrow = "Helpful Links";
	export let links = [];
	export let tone = "tool";
</script>

<section class={`helpful-links-panel helpful-links-panel--${tone}`} aria-label={ariaLabel}>
	<div class="helpful-links-head">
		<p class="eyebrow">{eyebrow}</p>
	</div>

	<div class="helpful-links-grid">
		{#each links as link (link.href)}
			<SurfaceLinkCard
				title={link.label}
				description={link.description}
				kind={link.kind || linkSurfaceLabel(link.href)}
				href={link.href}
				target={link.target ?? "_self"}
				rel={link.rel}
				surfaceClass={link.surfaceClass || linkSurfaceClass(link.href)}
				className="helpful-links-card"
			/>
		{/each}
	</div>
</section>

<style>
	.helpful-links-panel {
		--panel-border-tone: var(--surface-tool-border);
		--panel-highlight-tone: var(--surface-tool-highlight);
		--panel-surface-tone: var(--surface-tool-panel);

		display: grid;
		gap: 0.8rem;
		border: 1px solid color-mix(in oklch, var(--panel-border-tone) 72%, var(--panel-border));
		border-radius: 0.9rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--panel-highlight-tone) 11%, transparent) 0%, transparent 30%),
			color-mix(in oklch, var(--panel-surface-tone) 74%, var(--panel-bg) 26%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--panel-highlight-tone) 10%, transparent),
			0 8px 12px color-mix(in oklch, var(--shadow-soft) 64%, transparent);
		padding-block: 1.05rem;
		padding-inline: 1rem;
	}

	.helpful-links-panel--support {
		--panel-border-tone: var(--surface-support-border);
		--panel-highlight-tone: var(--surface-support-highlight);
		--panel-surface-tone: var(--surface-support-panel);
	}

	.helpful-links-panel--ui {
		--panel-border-tone: var(--surface-ui-border);
		--panel-highlight-tone: var(--surface-ui-highlight);
		--panel-surface-tone: var(--surface-ui-panel);
	}

	.helpful-links-panel--tool {
		--panel-border-tone: var(--surface-tool-border);
		--panel-highlight-tone: var(--surface-tool-highlight);
		--panel-surface-tone: var(--surface-tool-panel);
	}

	.helpful-links-head,
	.helpful-links-grid {
		display: grid;
		gap: 0.8rem;
	}

	.helpful-links-grid {
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
	}
</style>
