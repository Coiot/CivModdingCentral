<script>
	import { segmentPediaInlineText } from "../data/pediaInlineIcons.js";

	let { text = "", templateRefs = [], as = "span", className = "" } = $props();

	const segments = $derived(segmentPediaInlineText(text, templateRefs));
</script>

<svelte:element this={as} class={className}>
	{#each segments as segment, index (`${segment.type}-${index}-${segment.text}`)}
		{#if segment.type === "icon"}
			{#if segment.icon?.imageUrl}
				<img
					class="pedia-inline-icon"
					src={segment.icon.imageUrl}
					alt={segment.text}
					title={segment.icon.template || segment.icon.label || segment.text}
					loading="lazy"
					referrerpolicy="no-referrer"
					onerror={(event) => {
						event.currentTarget.hidden = true;
						const fallback = event.currentTarget.nextElementSibling;
						if (fallback) {
							fallback.hidden = false;
						}
					}}
				/>
			{/if}
		{:else}
			{segment.text}
		{/if}
	{/each}
</svelte:element>

<style>
	.pedia-inline-icon,
	.pedia-inline-icon-fallback {
		display: inline-block;
		inline-size: 1.25em;
		block-size: 1.25em;
		vertical-align: -0.12em;
	}

	.pedia-inline-icon {
		object-fit: contain;
	}

	.pedia-inline-icon-fallback {
		display: inline-grid;
		place-items: center;
		color: var(--pedia-accent-strong, currentColor);
		font-size: 0.75em;
		font-weight: 700;
		line-height: 1;
		border-radius: 999px;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pedia-accent, currentColor) 28%, transparent);
	}
</style>
