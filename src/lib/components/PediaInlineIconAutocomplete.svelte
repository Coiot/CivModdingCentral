<script>
	import PediaInlineText from "./PediaInlineText.svelte";

	let { visible = false, options = [], fieldLabel = "", fieldValue = "", activeIndex = 0, onSelect = () => {} } = $props();
</script>

{#if visible}
	<div class="pedia-inline-icon-popover">
		<div class="pedia-inline-icon-popover-head">
			<div class="stack quarter">
				<p class="eyebrow">Inline Icons</p>
				<p class="card-copy">
					{#if fieldLabel}
						Inserting into <strong>{fieldLabel}</strong>
					{:else}
						Choose an icon token
					{/if}
				</p>
			</div>
			<p class="card-copy">{options.length} option{options.length === 1 ? "" : "s"}</p>
		</div>
		<div class="pedia-inline-icon-popover-list" role="list" aria-label="Inline icon suggestions">
			{#each options as icon, index (icon.template)}
				<div role="listitem">
					<button
						type="button"
						class:active={index === activeIndex}
						class="pedia-inline-icon-popover-chip"
						onmousedown={(event) => event.preventDefault()}
						onclick={() => onSelect(icon.template)}
						title={`Insert {{${icon.template}}}`}
					>
						<span class="pedia-inline-icon-popover-media">
							{#if icon.imageUrl}
								<img
									src={icon.imageUrls?.[0] || icon.imageUrl}
									alt={icon.label}
									loading="lazy"
									referrerpolicy="no-referrer"
									onerror={(event) => {
										const imageUrls = icon.imageUrls || [];
										const currentIndex = Number(event.currentTarget.dataset.imageIndex || "0");
										const nextIndex = currentIndex + 1;
										if (imageUrls[nextIndex]) {
											event.currentTarget.dataset.imageIndex = String(nextIndex);
											event.currentTarget.src = imageUrls[nextIndex];
											return;
										}
										event.currentTarget.hidden = true;
									}}
								/>
							{:else}
								<span>{icon.label.slice(0, 2).toUpperCase()}</span>
							{/if}
						</span>
						<span class="pedia-inline-icon-popover-copy">
							<strong>{icon.label}</strong>
							<code>{`{{${icon.template}}}`}</code>
						</span>
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.pedia-inline-icon-popover {
		position: absolute;
		inset-inline: 0;
		inset-block-start: calc(100% + 0.45rem);
		z-index: 8;
		display: grid;
		gap: 0.75rem;
		padding: 0.9rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--pedia-panel-soft, #17202a) 94%, black 6%);
		border: 1px solid color-mix(in srgb, var(--pedia-accent, #c9a865) 18%, var(--border-color, rgba(255, 255, 255, 0.12)));
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.28);
	}

	.pedia-inline-icon-popover-head {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: space-between;
		align-items: start;
	}

	.pedia-inline-icon-popover-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0.6rem;
		max-block-size: 16rem;
		overflow: auto;
	}

	.pedia-inline-icon-popover-chip {
		inline-size: 100%;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.65rem;
		padding: 0.7rem;
		color: var(--ink, #f4f0e6);
		font: inherit;
		text-align: start;
		border-radius: 0.9rem;
		border: 1px solid color-mix(in srgb, var(--pedia-accent, #c9a865) 16%, var(--border-color, rgba(255, 255, 255, 0.12)));
		background: color-mix(in srgb, var(--pedia-panel, #10161d) 76%, var(--input-bg, #0f1419));
		cursor: pointer;
	}

	.pedia-inline-icon-popover-chip:hover,
	.pedia-inline-icon-popover-chip:focus-visible,
	.pedia-inline-icon-popover-chip.active {
		border-color: color-mix(in srgb, var(--pedia-accent, #c9a865) 34%, var(--border-color, rgba(255, 255, 255, 0.12)));
		background: color-mix(in srgb, var(--pedia-panel, #10161d) 70%, var(--input-bg, #0f1419));
	}

	.pedia-inline-icon-popover-media {
		inline-size: 2.1rem;
		block-size: 2.1rem;
		border-radius: 999px;
		display: grid;
		place-items: center;
		overflow: hidden;
		background: color-mix(in srgb, var(--pedia-panel-soft, #17202a) 72%, black 28%);
		border: 1px solid color-mix(in srgb, var(--pedia-accent, #c9a865) 18%, var(--border-color, rgba(255, 255, 255, 0.12)));
	}

	.pedia-inline-icon-popover-media img {
		inline-size: 100%;
		block-size: 100%;
		display: block;
		object-fit: cover;
	}

	.pedia-inline-icon-popover-copy {
		min-inline-size: 0;
		display: grid;
		gap: 0.15rem;
	}

	.pedia-inline-icon-popover-copy strong,
	.pedia-inline-icon-popover-copy code {
		overflow-wrap: anywhere;
	}
</style>
