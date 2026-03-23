<script>
	let {
		groups = [],
		eyebrow = "All Site Resources",
		title = "Your full civ modding toolkit, for beginners and experts",
		copy = "Browse the references, tools, viewers, and helpers that make this site a one-stop workspace for learning and shipping a civ mod.",
		featuredIds = ["guided-planner", "workshop-uploader"],
	} = $props();

	function resourceTone(resource) {
		return resource?.disabled ? "is-disabled" : "is-live";
	}

	function resourceAccentClass(resource) {
		const href = String(resource?.href || "");

		if (href.includes("/guided-planner")) return "is-planner";
		if (href.includes("/modded-civs-pedia")) return "is-pedia";
		if (href.includes("/schema-browser")) return "is-schema";
		if (href.includes("/lua-api-explorer")) return "is-lua";
		if (href.includes("/pattern-library")) return "is-pattern";
		if (href.includes("/template-generators")) return "is-generator";
		if (href.includes("/workshop-uploader") || href.includes("/modinfo-builder") || href.includes("/civ5mod-ziper")) return "is-publish";
		if (href.includes("/dds-converter") || href.includes("/civ-icon-maker") || href.includes("/ui-screen-viewer")) return "is-ui";
		if (href.includes("/tech-tree-viewer")) return "is-tool";
		if (href.includes("/religion-support") || href.includes("/map-viewer")) return "is-support";
		return "is-tool";
	}

	function isFeaturedResource(resource) {
		return featuredIds.includes(resource?.id);
	}
</script>

<section class="home-section home-resource-directory">
	<div class="stack half">
		<p class="eyebrow">{eyebrow}</p>
		<h2 class="section-title text-box-trim">{title}</h2>
		<p class="section-copy">{copy}</p>
	</div>

	<div class="surface-group-grid">
		{#each groups as group (group.id)}
			<section class="surface-group">
				<div class="stack half">
					<p class="eyebrow">{group.kicker}</p>
					<h3 class="section-title text-box-trim">{group.label}</h3>
					<p class="section-copy">{group.description}</p>
				</div>

				<div class="surface-card-grid">
					{#each group.items as resource (resource.id)}
						{#if resource.disabled}
							<div class={["surface-card", resourceTone(resource), resourceAccentClass(resource), isFeaturedResource(resource) && "is-featured"]} aria-disabled="true">
								<h4 class="card-title text-lg">{resource.label}</h4>
								<p class="card-copy">{resource.description}</p>
							</div>
						{:else}
							<a class={["surface-card", resourceTone(resource), resourceAccentClass(resource), isFeaturedResource(resource) && "is-featured"]} href={resource.href}>
								<h4 class="card-title text-lg">{resource.label}</h4>
								<p class="card-copy">{resource.description}</p>
							</a>
						{/if}
					{/each}
				</div>
			</section>
		{/each}
	</div>
</section>

<style>
	.home-section {
		display: grid;
		gap: 1rem;
		padding: 1.5rem;
	}

	.surface-group-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.surface-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		/*background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 32%),
			radial-gradient(circle at 0% 100%, color-mix(in srgb, #8dc7ff 7%, transparent) 0%, transparent 34%),
			linear-gradient(165deg, color-mix(in srgb, var(--home-panel-strong) 62%, var(--control-bg)) 0%, color-mix(in srgb, var(--control-bg) 84%, #191310 16%) 100%);*/
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, white 12.5%, transparent),
			0 4px 8px color-mix(in srgb, black 80%, transparent);
		/*border: 1px solid color-mix(in srgb, var(--home-muted-border) 58%, white 12%);*/
		padding: 1rem;
		border-radius: 1rem;
	}

	.surface-card-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
	}

	.surface-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		color: var(--ink);
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight, var(--accent)) 20%, transparent) 0%, transparent 45%),
			linear-gradient(
				165deg,
				color-mix(in srgb, var(--surface-panel, var(--control-bg)) 99%, var(--control-bg)) 0%,
				color-mix(in srgb, var(--surface-panel, var(--control-bg)) 95%, #16110f 5%) 100%
			);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, white 8%, transparent),
			0 6px 8px color-mix(in srgb, black 80%, transparent);
		border: 1px solid color-mix(in srgb, var(--surface-highlight, var(--surface-border, var(--accent))) 44%, var(--surface-border, var(--home-muted-border)));
		border-radius: 1rem;
		padding: 1.25rem 1rem;
		overflow: hidden;
		text-decoration: none;
		overflow: hidden;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease,
			box-shadow 160ms ease;
	}

	a.surface-card {
		&:hover,
		&:focus-visible {
			background:
				radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight, var(--accent)) 40%, transparent) 0%, transparent 40%),
				linear-gradient(165deg, color-mix(in srgb, var(--surface-panel) 95%, var(--control-bg)) 0%, color-mix(in srgb, var(--surface-panel) 95%, #16110f 5%) 100%);
			box-shadow:
				inset 0 1px 0 color-mix(in srgb, var(--surface-highlight, var(--accent)) 14%, transparent),
				0 4px 8px color-mix(in srgb, black 76%, transparent);
			border-color: color-mix(in srgb, var(--surface-highlight, var(--accent)) 74%, var(--home-muted-border));
			transform: translateY(-2px);
		}
	}

	.surface-card.is-disabled {
		opacity: 0.75;
		border-style: dashed;
	}

	.surface-card.is-featured {
		min-block-size: 100%;
		grid-column: span 2;
	}

	.is-generator {
		--surface-border: var(--surface-generator-border);
		--surface-highlight: var(--surface-generator-highlight);
		--surface-highlight-strong: var(--surface-generator-highlight-strong);
		--surface-panel: var(--surface-generator-panel);
	}

	.is-lua {
		--surface-border: var(--surface-lua-border);
		--surface-highlight: var(--surface-lua-highlight);
		--surface-highlight-strong: var(--surface-lua-highlight-strong);
		--surface-panel: var(--surface-lua-panel);
	}

	.is-pattern {
		--surface-border: var(--surface-pattern-border);
		--surface-highlight: var(--surface-pattern-highlight);
		--surface-highlight-strong: var(--surface-pattern-highlight-strong);
		--surface-panel: var(--surface-pattern-panel);
	}

	.is-schema {
		--surface-border: var(--surface-schema-border);
		--surface-highlight: var(--surface-schema-highlight);
		--surface-highlight-strong: var(--surface-schema-highlight-strong);
		--surface-panel: var(--surface-schema-panel);
	}

	.is-pedia {
		--surface-border: var(--surface-pedia-border);
		--surface-highlight: var(--surface-pedia-highlight);
		--surface-highlight-strong: var(--surface-pedia-highlight-strong);
		--surface-panel: var(--surface-pedia-panel);
	}

	.is-tool {
		--surface-border: var(--surface-tool-border);
		--surface-highlight: var(--surface-tool-highlight);
		--surface-highlight-strong: var(--surface-tool-highlight-strong);
		--surface-panel: var(--surface-tool-panel);
	}

	.is-publish {
		--surface-border: var(--surface-publish-border);
		--surface-highlight: var(--surface-publish-highlight);
		--surface-highlight-strong: var(--surface-publish-highlight-strong);
		--surface-panel: var(--surface-publish-panel);
	}

	.is-ui {
		--surface-border: var(--surface-ui-border);
		--surface-highlight: var(--surface-ui-highlight);
		--surface-highlight-strong: var(--surface-ui-highlight-strong);
		--surface-panel: var(--surface-ui-panel);
	}

	.is-viewer,
	.is-support {
		--surface-border: var(--surface-support-border);
		--surface-highlight: var(--surface-support-highlight);
		--surface-highlight-strong: var(--surface-support-highlight-strong);
		--surface-panel: var(--surface-support-panel);
	}

	.is-planner {
		--surface-border: var(--surface-planner-border);
		--surface-highlight: var(--surface-planner-highlight);
		--surface-highlight-strong: var(--surface-planner-highlight-strong);
		--surface-panel: var(--surface-planner-panel);
	}

	@media (max-width: 1100px) {
		.surface-group-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.surface-card-grid {
			grid-template-columns: 1fr;
		}

		.surface-card.is-featured {
			grid-column: auto;
		}
	}
</style>
