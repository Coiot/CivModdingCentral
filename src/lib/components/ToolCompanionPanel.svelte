<script>
	import SurfaceLinkCard from "./SurfaceLinkCard.svelte";

	export let title = "Use alongside the other tools";
	export let copy = "";
	export let tools = [];
</script>

<section class="tool-companion-panel">
	<div class="tool-companion-head">
		<h2>{title}</h2>
		{#if copy}
			<p>{copy}</p>
		{/if}
	</div>

	<div class="tool-companion-grid">
		{#each tools as tool (tool.title)}
			<SurfaceLinkCard
				title={tool.title}
				description={tool.copy}
				href={tool.href}
				target={tool.target ?? "_self"}
				rel={tool.rel}
				surfaceClass={tool.isSiteAccent || tool.href === "/community-links" ? "is-tool" : "is-publish"}
				className="tool-companion-card"
				style={tool.isSiteAccent || tool.href === "/community-links"
					? "--surface-border: color-mix(in oklch, var(--accent) 26%, var(--panel-border)); --surface-highlight: var(--accent); --surface-highlight-strong: color-mix(in oklch, white 82%, var(--accent) 18%); --surface-panel: color-mix(in oklch, var(--panel-bg) 88%, black);"
					: ""}
			/>
		{/each}
	</div>
</section>

<style>
	.tool-companion-panel {
		display: grid;
		gap: 1rem;
		background: color-mix(in oklch, var(--surface-publish-panel) 20%, var(--panel-bg));
		box-shadow: 0 10px 26px var(--shadow-soft);
		border: 1px solid color-mix(in oklch, var(--surface-publish-border) 20%, var(--panel-border));
		border-radius: 1rem;
		padding: 1.25rem;
	}

	.tool-companion-head {
		display: grid;
		gap: 0.35rem;
	}

	.tool-companion-head h2 {
		font-family: "Rockwell", "Palatino Linotype", serif;
		margin: 0;
	}

	.tool-companion-head p {
		color: var(--muted-ink);
		margin: 0;
	}

	.tool-companion-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.8rem;
	}

	@media (max-width: 980px) {
		.tool-companion-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
