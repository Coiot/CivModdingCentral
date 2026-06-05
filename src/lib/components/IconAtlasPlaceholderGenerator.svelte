<script>
	const CELL_SIZE = 256;
	const CIRCLE_SIZE = 174;
	const MAX_COLUMNS = 10;
	const MAX_ROWS = 20;

	let columnsInput = $state("2");
	let rowsInput = $state("2");
	let fileNameInput = $state("IconAtlas_Placeholder.png");
	let previewCanvas;
	let status = $state("");

	const columns = $derived(clampInteger(columnsInput, 1, MAX_COLUMNS, 2));
	const rows = $derived(clampInteger(rowsInput, 1, MAX_ROWS, 2));
	const atlasWidth = $derived(columns * CELL_SIZE);
	const atlasHeight = $derived(rows * CELL_SIZE);
	const cellCount = $derived(columns * rows);

	function clampInteger(value, min, max, fallback) {
		const parsed = Number.parseInt(String(value || ""), 10);
		if (!Number.isFinite(parsed)) {
			return fallback;
		}
		return Math.max(min, Math.min(max, parsed));
	}

	function normalizedDownloadName() {
		const raw = String(fileNameInput || "").trim() || "IconAtlas_Placeholder.png";
		return /\.png$/i.test(raw) ? raw : `${raw}.png`;
	}

	function drawAtlas(canvas) {
		if (!canvas) {
			return;
		}
		canvas.width = atlasWidth;
		canvas.height = atlasHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return;
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#ff0000";

		const radius = CIRCLE_SIZE / 2;
		for (let row = 0; row < rows; row += 1) {
			for (let column = 0; column < columns; column += 1) {
				const centerX = column * CELL_SIZE + CELL_SIZE / 2;
				const centerY = row * CELL_SIZE + CELL_SIZE / 2;
				ctx.beginPath();
				ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	function downloadAtlas() {
		if (typeof document === "undefined") {
			return;
		}
		const canvas = document.createElement("canvas");
		drawAtlas(canvas);
		canvas.toBlob((blob) => {
			if (!blob) {
				status = "Unable to create atlas PNG.";
				return;
			}
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = normalizedDownloadName();
			link.click();
			URL.revokeObjectURL(url);
			status = `Created ${atlasWidth}x${atlasHeight} atlas with ${cellCount} slot${cellCount === 1 ? "" : "s"}.`;
		}, "image/png");
	}

	$effect(() => {
		columns;
		rows;
		drawAtlas(previewCanvas);
	});
</script>

<section class="icon-atlas-generator" aria-label="Icon art atlas placeholder generator">
	<div class="icon-atlas-generator-head">
		<div>
			<p class="eyebrow">Icon Atlas Generator</p>
			<h3>Dynamic Atlas Builder</h3>
			<p>Create a transparent PNG atlas with 256px cells and centered 174px red-circle to help you create your icon set.</p>
		</div>
		<div class="icon-atlas-generator-meta">
			<span>{atlasWidth}x{atlasHeight}px</span>
			<span>{cellCount} slot{cellCount === 1 ? "" : "s"}</span>
		</div>
	</div>

	<div class="icon-atlas-generator-grid">
		<div class="icon-atlas-generator-controls">
			<label>
				Columns
				<input type="number" min="1" max={MAX_COLUMNS} step="1" bind:value={columnsInput} />
			</label>
			<label>
				Rows
				<input type="number" min="1" max={MAX_ROWS} step="1" bind:value={rowsInput} />
			</label>
			<label class="icon-atlas-generator-file">
				Filename
				<input type="text" spellcheck="false" bind:value={fileNameInput} />
			</label>
			<button type="button" class="icon-atlas-generator-button" onclick={downloadAtlas}>Download PNG Atlas</button>
		</div>

		<div class="icon-atlas-generator-preview" aria-label="Atlas preview">
			<canvas bind:this={previewCanvas}></canvas>
		</div>
	</div>

	{#if status}
		<p class="icon-atlas-generator-status">{status}</p>
	{/if}
</section>

<style>
	.icon-atlas-generator {
		display: grid;
		gap: 1rem;
		min-inline-size: 0;
		background: color-mix(in srgb, var(--panel-bg, #16191f) 90%, black 10%);
		border: 1px solid color-mix(in srgb, var(--panel-border, rgba(255, 255, 255, 0.16)) 70%, #2c86b5 30%);
		border-radius: 0.9rem;
		box-shadow: 0 6px 10px color-mix(in srgb, black 55%, transparent);
		padding: 1rem;
	}

	.icon-atlas-generator-head,
	.icon-atlas-generator-grid,
	.icon-atlas-generator-controls {
		display: grid;
		gap: 0.85rem;
		min-inline-size: 0;
	}

	.icon-atlas-generator-head {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
	}

	.icon-atlas-generator h3,
	.icon-atlas-generator p {
		margin: 0;
	}

	.icon-atlas-generator h3 {
		font-size: 1.15rem;
	}

	.icon-atlas-generator p {
		color: var(--muted-ink, #aeb4bd);
		line-height: 1.45;
	}

	.icon-atlas-generator-meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: end;
		gap: 0.45rem;
	}

	.icon-atlas-generator-meta span {
		color: color-mix(in srgb, white 82%, #2c86b5 18%);
		font-size: 0.78rem;
		font-weight: 700;
		background: color-mix(in srgb, #2c86b5 14%, transparent);
		border: 1px solid color-mix(in srgb, #2c86b5 32%, var(--panel-border, rgba(255, 255, 255, 0.16)));
		border-radius: 999px;
		padding: 0.35rem 0.6rem;
	}

	.icon-atlas-generator-grid {
		grid-template-columns: minmax(14rem, 22rem) minmax(0, 1fr);
		align-items: stretch;
	}

	.icon-atlas-generator-controls {
		align-content: start;
	}

	.icon-atlas-generator label {
		display: grid;
		gap: 0.35rem;
		color: var(--ink, #f4f6f8);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.icon-atlas-generator input {
		inline-size: 100%;
		color: inherit;
		background: color-mix(in srgb, var(--input-bg, #101319) 90%, black 10%);
		border: 1px solid color-mix(in srgb, var(--panel-border, rgba(255, 255, 255, 0.16)) 82%, #2c86b5 18%);
		border-radius: 0.55rem;
		padding: 0.62rem 0.7rem;
	}

	.icon-atlas-generator-button {
		inline-size: fit-content;
		color: white;
		font-weight: 800;
		background: color-mix(in srgb, #2c86b5 76%, black 24%);
		border: 1px solid color-mix(in srgb, #2c86b5 78%, white 12%);
		border-radius: 0.6rem;
		box-shadow: 0 4px 8px color-mix(in srgb, black 45%, transparent);
		cursor: pointer;
		padding: 0.72rem 0.95rem;
	}

	.icon-atlas-generator-button:hover,
	.icon-atlas-generator-button:focus-visible {
		background: color-mix(in srgb, #2c86b5 88%, black 12%);
	}

	.icon-atlas-generator-preview {
		display: grid;
		place-items: center;
		min-block-size: 13rem;
		background:
			linear-gradient(45deg, color-mix(in srgb, white 8%, transparent) 25%, transparent 25%), linear-gradient(-45deg, color-mix(in srgb, white 8%, transparent) 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, color-mix(in srgb, white 8%, transparent) 75%), linear-gradient(-45deg, transparent 75%, color-mix(in srgb, white 8%, transparent) 75%),
			color-mix(in srgb, var(--panel-bg, #16191f) 70%, black 30%);
		background-position:
			0 0,
			0 8px,
			8px -8px,
			-8px 0;
		background-size: 16px 16px;
		border: 1px solid color-mix(in srgb, var(--panel-border, rgba(255, 255, 255, 0.16)) 80%, #2c86b5 20%);
		border-radius: 0.75rem;
		overflow: hidden;
		padding: 0.75rem;
	}

	.icon-atlas-generator-preview canvas {
		inline-size: auto;
		max-inline-size: 100%;
		block-size: auto;
		max-block-size: 16rem;
		display: block;
		image-rendering: auto;
	}

	.icon-atlas-generator-status {
		font-size: 0.88rem;
	}

	@media (max-width: 720px) {
		.icon-atlas-generator-head,
		.icon-atlas-generator-grid {
			grid-template-columns: 1fr;
		}

		.icon-atlas-generator-meta {
			justify-content: start;
		}

		.icon-atlas-generator-button {
			inline-size: 100%;
		}
	}
</style>
