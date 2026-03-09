<script>
	import SnippetExample from "./SnippetExample.svelte";

	export let example;
	export let activeLanguage = "all";

	const LUA_HOOK_CALLBACKS = {
		PlayerCanTrain: {
			callbackRef: "GameEvents.PlayerCanTrain",
			fileName: "PlayerCanTrain",
			typeLabel: "Unit type",
			typePrefix: "UNIT_",
			typeArg: "iUnitType",
			lookupArg: "iTargetType",
			techLine: "local iRequiredTech = GameInfoTypes.%TECH%",
			guardLine: "\tif iUnitType ~= iTargetType then\n\t\treturn true\n\tend",
			teamLine: "\tlocal pPlayer = Players[iPlayer]\n\tlocal pTeam = pPlayer and Teams[pPlayer:GetTeam()]\n\tif not pTeam or not pTeam:IsHasTech(iRequiredTech) then\n\t\treturn false\n\tend",
			notificationComment: "-- Add player-facing messaging only if the veto needs explanation during testing or UX iteration.",
			note: "Gameplay veto hook for unit production.",
		},
		CityCanConstruct: {
			callbackRef: "GameEvents.CityCanConstruct",
			fileName: "CityCanConstruct",
			typeLabel: "Building type",
			typePrefix: "BUILDING_",
			typeArg: "eBuilding",
			lookupArg: "iTargetType",
			techLine: "local iRequiredTech = GameInfoTypes.%TECH%",
			guardLine: "\tif eBuilding ~= iTargetType then\n\t\treturn true\n\tend",
			teamLine: "\tlocal pPlayer = Players[iPlayer]\n\tlocal pTeam = pPlayer and Teams[pPlayer:GetTeam()]\n\tif not pTeam or not pTeam:IsHasTech(iRequiredTech) then\n\t\treturn false\n\tend",
			notificationComment: "-- City-side veto hooks can optionally emit debug or notification text after the construct check runs.",
			note: "City-level veto hook for building production.",
		},
	};

	let hookCallback = example?.preview?.formDefaults?.callback || "PlayerCanTrain";
	let hookTargetType = example?.preview?.formDefaults?.targetType || "UNIT_ATLAS_GUARD";
	let hookRequiredTech = example?.preview?.formDefaults?.requiredTech || "TECH_WRITING";
	let emitTurnCache = example?.preview?.formDefaults?.turnCache ?? true;
	let emitDebugTrace = example?.preview?.formDefaults?.debug ?? true;
	let emitNotificationNote = example?.preview?.formDefaults?.notification ?? false;

	$: preview = example?.preview;
	$: isInteractiveLuaHook = preview?.interactiveKind === "lua-hook";
	$: currentHookConfig = LUA_HOOK_CALLBACKS[hookCallback] || LUA_HOOK_CALLBACKS.PlayerCanTrain;
	$: normalizedTargetType = hookTargetType.trim().toUpperCase() || `${currentHookConfig.typePrefix}CUSTOM_TYPE`;
	$: normalizedRequiredTech = hookRequiredTech.trim().toUpperCase() || "TECH_WRITING";
	$: stepValidationMap = buildStepValidationMap();
	$: displayExample = isInteractiveLuaHook ? buildInteractiveLuaHookExample() : example;

	function buildInteractiveLuaHookExample() {
		const mainLines = [
			`local iTargetType = GameInfoTypes.${normalizedTargetType}`,
			currentHookConfig.techLine.replace("%TECH%", normalizedRequiredTech),
		];

		if (emitTurnCache) {
			mainLines.push('local TurnCache = include("TurnCache")');
		}

		mainLines.push("", `${currentHookConfig.callbackRef}.Add(function(iPlayer, ${currentHookConfig.typeArg === "eBuilding" ? "iCity, eBuilding" : "iUnitType"})`);
		mainLines.push(currentHookConfig.guardLine);
		mainLines.push(currentHookConfig.teamLine);

		if (emitTurnCache) {
			mainLines.push('\tlocal cacheKey = string.format("%s:%d", "'+currentHookConfig.fileName+'", iPlayer)');
			mainLines.push("\tif TurnCache.processedThisTurn(cacheKey) then");
			mainLines.push("\t\treturn true");
			mainLines.push("\tend");
			mainLines.push("\tTurnCache.markTurnProcessed(cacheKey)");
		}

		if (emitDebugTrace) {
			mainLines.push(`\tprint("[CMC_${currentHookConfig.fileName}] checking", iPlayer, ${currentHookConfig.typeArg})`);
		}

		if (emitNotificationNote) {
			mainLines.push(`\t${currentHookConfig.notificationComment}`);
		}

		mainLines.push("\treturn true");
		mainLines.push("end)");

		const files = [
			{
				label: `${currentHookConfig.fileName}.lua`,
				path: `Lua/Gameplay/${currentHookConfig.fileName}.lua`,
				language: "lua",
				code: mainLines.join("\n"),
				note: currentHookConfig.note,
			},
		];

		if (emitTurnCache) {
			files.push({
				label: "TurnCache.lua",
				path: "Lua/Shared/TurnCache.lua",
				language: "lua",
				code:
					'local TurnCache = {}\n\nlocal function markTurnProcessed(key)\n\tTurnCache[key] = Game.GetGameTurn()\nend\n\nlocal function processedThisTurn(key)\n\treturn TurnCache[key] == Game.GetGameTurn()\nend\n\nreturn {\n\tmarkTurnProcessed = markTurnProcessed,\n\tprocessedThisTurn = processedThisTurn,\n}',
				note: "Optional helper emitted when per-turn cache support is enabled.",
			});
		}

		return {
			...example,
			title: `Interactive ${currentHookConfig.fileName} scaffold`,
			summary: `Generated from the current wizard inputs for ${currentHookConfig.callbackRef}.`,
			files,
		};
	}

	function buildStepValidationMap() {
		if (!isInteractiveLuaHook) {
			return {};
		}

		return {
			"Choose hook surface": [
				currentHookConfig.callbackRef.startsWith("GameEvents.")
					? "Validation: gameplay veto hooks belong on a GameEvents callback that returns a boolean."
					: "Validation: check the callback family before emitting gameplay-side code.",
			],
			"Define the rule": [
				normalizedTargetType.startsWith(currentHookConfig.typePrefix)
					? `Validation: ${currentHookConfig.typeLabel} key uses the expected ${currentHookConfig.typePrefix} prefix.`
					: `Validation: ${currentHookConfig.typeLabel} should normally start with ${currentHookConfig.typePrefix}.`,
				normalizedRequiredTech.startsWith("TECH_")
					? "Validation: prerequisite tech key uses the expected TECH_ prefix."
					: "Validation: prerequisite tech should normally start with TECH_.",
			],
			"Optional scaffolds": [
				emitTurnCache ? "Validation: cache helper is enabled, so the wizard emits a shared TurnCache file." : "Validation: cache helper is disabled, so the scaffold stays single-file.",
				emitNotificationNote ? "Validation: notification guidance is included, but the wizard should still avoid forcing UX code into every hook." : "Validation: no notification note is emitted, which keeps the starter focused on gameplay logic.",
			],
		};
	}
</script>

<div class="wizard-example-preview">
	{#if displayExample?.summary}
		<p class="wizard-example-summary">{displayExample.summary}</p>
	{/if}

	{#if preview?.steps?.length}
		<section class="wizard-intake-preview" aria-label="Sample wizard inputs">
			<div class="wizard-preview-head">
				<span class="wizard-preview-kicker">{isInteractiveLuaHook ? "Interactive Wizard Run" : "Sample Wizard Run"}</span>
				{#if preview.resultNote}
					<p>{preview.resultNote}</p>
				{/if}
			</div>

			<div class="wizard-preview-steps">
				{#each preview.steps as step, index (`${example.title}-${step.title}-${index}`)}
					<article class="wizard-preview-step">
						<div class="wizard-preview-step-head">
							<span class="wizard-preview-step-index">Step {index + 1}</span>
							<strong>{step.title}</strong>
						</div>

						{#if step.copy}
							<p>{step.copy}</p>
						{/if}

						{#if isInteractiveLuaHook && step.title === "Choose hook surface"}
							<div class="wizard-form-grid">
								<label class="wizard-form-field">
									<span>Hook family</span>
									<input type="text" value="GameEvents" readonly />
								</label>
								<label class="wizard-form-field">
									<span>Callback</span>
									<select bind:value={hookCallback}>
										<option value="PlayerCanTrain">PlayerCanTrain</option>
										<option value="CityCanConstruct">CityCanConstruct</option>
									</select>
								</label>
							</div>
						{:else if isInteractiveLuaHook && step.title === "Define the rule"}
							<div class="wizard-form-grid">
								<label class="wizard-form-field">
									<span>{currentHookConfig.typeLabel}</span>
									<input type="text" bind:value={hookTargetType} placeholder={currentHookConfig.typePrefix + "CUSTOM_TYPE"} />
								</label>
								<label class="wizard-form-field">
									<span>Required tech</span>
									<input type="text" bind:value={hookRequiredTech} placeholder="TECH_WRITING" />
								</label>
							</div>
						{:else if isInteractiveLuaHook && step.title === "Optional scaffolds"}
							<div class="wizard-toggle-list">
								<label class="wizard-toggle-item">
									<input type="checkbox" bind:checked={emitTurnCache} />
									<span>Emit turn cache helper</span>
								</label>
								<label class="wizard-toggle-item">
									<input type="checkbox" bind:checked={emitDebugTrace} />
									<span>Emit debug trace</span>
								</label>
								<label class="wizard-toggle-item">
									<input type="checkbox" bind:checked={emitNotificationNote} />
									<span>Include notification guidance</span>
								</label>
							</div>
						{:else}
							<div class="wizard-preview-fields">
								{#each step.fields as field (`${step.title}-${field.label}`)}
									<div class="wizard-preview-field">
										<span class="wizard-preview-field-label">{field.label}</span>
										{#if field.values?.length}
											<div class="wizard-preview-value-list">
												{#each field.values as value (`${field.label}-${value}`)}
													<span class="wizard-preview-value-chip">{value}</span>
												{/each}
											</div>
										{:else}
											<span class="wizard-preview-field-value">{field.value}</span>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						{#if step.validation}
							<p class="wizard-preview-validation">{step.validation}</p>
						{/if}

						{#if stepValidationMap[step.title]?.length}
							<ul class="wizard-validation-list">
								{#each stepValidationMap[step.title] as item (`${step.title}-${item}`)}
									<li>{item}</li>
								{/each}
							</ul>
						{/if}
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<section class="wizard-generated-preview" aria-label="Generated files">
		<div class="wizard-preview-head">
			<span class="wizard-preview-kicker">Generated Files</span>
			<p>These files are the scaffold produced from the current wizard answers.</p>
		</div>
		<SnippetExample example={displayExample} activeLanguage={activeLanguage} showSummary={false} />
	</section>
</div>

<style>
	.wizard-example-preview,
	.wizard-intake-preview,
	.wizard-preview-steps,
	.wizard-preview-step,
	.wizard-preview-fields,
	.wizard-preview-field,
	.wizard-generated-preview {
		display: grid;
		gap: 0.75rem;
	}

	.wizard-example-summary,
	.wizard-preview-head p,
	.wizard-preview-step p,
	.wizard-preview-validation,
	.wizard-validation-list {
		margin: 0;
		color: var(--muted-ink);
		line-height: 1.55;
	}

	.wizard-preview-kicker,
	.wizard-preview-step-index {
		display: inline-flex;
		align-items: center;
		inline-size: fit-content;
		border-radius: 999px;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 0.24rem 0.55rem;
	}

	.wizard-preview-kicker {
		color: color-mix(in oklch, white 84%, var(--ink));
		background: color-mix(in oklch, var(--accent) 20%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 34%, var(--panel-border));
	}

	.wizard-preview-step {
		padding: 0.95rem;
		background: linear-gradient(180deg, color-mix(in oklch, var(--panel-bg) 84%, var(--control-bg)) 0%, color-mix(in oklch, var(--panel-bg) 78%, var(--control-bg)) 100%);
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		border-radius: 0.95rem;
	}

	.wizard-preview-step-head {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.wizard-preview-step-head strong {
		color: color-mix(in oklch, white 86%, var(--ink));
		font-size: 0.92rem;
	}

	.wizard-preview-step-index {
		color: var(--muted-ink);
		background: color-mix(in oklch, var(--panel-bg) 84%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 16%, var(--panel-border));
	}

	.wizard-preview-fields,
	.wizard-form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.75rem;
	}

	.wizard-preview-field,
	.wizard-form-field,
	.wizard-toggle-item {
		display: grid;
		gap: 0.45rem;
		padding: 0.8rem;
		background: color-mix(in oklch, var(--panel-bg) 82%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 14%, var(--panel-border));
		border-radius: 0.8rem;
	}

	.wizard-preview-field-label,
	.wizard-form-field span {
		color: var(--muted-ink);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.wizard-preview-field-value {
		color: color-mix(in oklch, white 86%, var(--ink));
		font-size: 0.92rem;
		font-weight: 600;
	}

	.wizard-preview-value-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.wizard-preview-value-chip {
		display: inline-flex;
		align-items: center;
		inline-size: fit-content;
		padding: 0.28rem 0.55rem;
		border-radius: 999px;
		background: color-mix(in oklch, var(--accent) 14%, var(--control-bg));
		border: 1px solid color-mix(in oklch, var(--accent) 24%, var(--panel-border));
		color: color-mix(in oklch, white 84%, var(--ink));
		font-size: 0.74rem;
		font-weight: 600;
	}

	.wizard-form-field input,
	.wizard-form-field select {
		min-inline-size: 0;
		padding: 0.7rem 0.8rem;
		border: 1px solid color-mix(in oklch, var(--accent) 18%, var(--panel-border));
		border-radius: 0.75rem;
		background: color-mix(in oklch, var(--panel-bg) 86%, var(--control-bg));
		color: color-mix(in oklch, white 86%, var(--ink));
		font: inherit;
	}

	.wizard-toggle-list {
		display: grid;
		gap: 0.6rem;
	}

	.wizard-toggle-item {
		grid-template-columns: auto 1fr;
		align-items: center;
	}

	.wizard-toggle-item input {
		margin: 0;
	}

	.wizard-preview-validation {
		padding: 0.75rem 0.85rem;
		background: color-mix(in oklch, var(--panel-bg) 84%, var(--control-bg));
		border-inline-start: 3px solid color-mix(in oklch, var(--accent) 42%, var(--panel-border));
		border-radius: 0.7rem;
	}

	.wizard-validation-list {
		display: grid;
		gap: 0.45rem;
		padding-inline-start: 1.1rem;
	}

	@media (width <= 720px) {
		.wizard-preview-fields,
		.wizard-form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
