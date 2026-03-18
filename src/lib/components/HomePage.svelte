<script>
	import SiteResourceDirectory from "./SiteResourceDirectory.svelte";
	import luaData from "../data/civ-lua-api.json";
	import { plannerDeliverables, plannerTracks, siteResourceGroups, tutorialTracks } from "../data/guidedPlannerData.js";
	import { CURATED_EVENT_NAMES, CURATED_METHOD_NAMES } from "../data/luaQuickStarts.js";
	import { CURRENT_VERSION, workshopUploaderDownloadCards } from "../data/workshopUploaderReleaseData.js";

	const curatedEntries = [
		{
			id: "schema-civilizations",
			surface: "schema",
			kicker: "Schema Table",
			title: "Civilizations",
			copy: "Start here when you need to verify civilization-level keys, links, and database wiring.",
			href: "/schema-browser?table=Civilizations",
		},
		{
			id: "schema-leaders",
			surface: "schema",
			kicker: "Schema Table",
			title: "Leaders",
			copy: "Useful for leader records, trait joins, and making sure the civ package is hooked together cleanly.",
			href: "/schema-browser?table=Leaders",
		},
		{
			id: "schema-units",
			surface: "schema",
			kicker: "Schema Table",
			title: "Units",
			copy: "Good companion table when a unique unit is replacing base combat roles, promotions, or art data.",
			href: "/schema-browser?table=Units",
		},
		{
			id: "schema-buildings",
			surface: "schema",
			kicker: "Schema Table",
			title: "Buildings",
			copy: "One of the most important tables for civ bonuses, dummy-building effects, uniques, and city-side rewards.",
			href: "/schema-browser?table=Buildings",
		},
		{
			id: "schema-building-classes",
			surface: "schema",
			kicker: "Schema Table",
			title: "BuildingClasses",
			copy: "Critical when a unique building or hidden proxy needs to replace or extend the correct base class member.",
			href: "/schema-browser?table=BuildingClasses",
		},
		{
			id: "schema-unit-promotions",
			surface: "schema",
			kicker: "Schema Table",
			title: "UnitPromotions",
			copy: "Useful when a civ leans on free promotions, conditional bonuses, or custom combat identity for units.",
			href: "/schema-browser?table=UnitPromotions",
		},
		{
			id: "schema-traits",
			surface: "schema",
			kicker: "Schema Table",
			title: "Traits",
			copy: "Important for checking the base trait row before wiring it into leader and civilization package links.",
			href: "/schema-browser?table=Traits",
		},
		{
			id: "schema-policies",
			surface: "schema",
			kicker: "Schema Table",
			title: "Policies",
			copy: "Useful when a civ mechanic leans on dummy policies, branch attachments, or policy-driven bonuses.",
			href: "/schema-browser?table=Policies",
		},
		{
			id: "schema-civ-building-overrides",
			surface: "schema",
			kicker: "Schema Table",
			title: "Civilization_BuildingClassOverrides",
			copy: "Important when a civilization swaps in a unique building and you need to verify the class override wiring directly.",
			href: "/schema-browser?table=Civilization_BuildingClassOverrides",
		},
		{
			id: "schema-civ-unit-overrides",
			surface: "schema",
			kicker: "Schema Table",
			title: "Civilization_UnitClassOverrides",
			copy: "A high-value table for checking unique unit replacement wiring against the right base unit class.",
			href: "/schema-browser?table=Civilization_UnitClassOverrides",
		},
		{
			id: "schema-building-yield-changes",
			surface: "schema",
			kicker: "Schema Table",
			title: "Building_YieldChanges",
			copy: "Common follow-up table when a building or dummy proxy needs to turn into real city yields.",
			href: "/schema-browser?table=Building_YieldChanges",
		},
		{
			id: "pattern-unique-replacement",
			surface: "pattern",
			kicker: "Pattern",
			title: "Unique Replacement Setup",
			copy: "A strong starting point when your civ needs a UU, UB, or UI wired cleanly without breaking the base replacement chain.",
			href: "/pattern-library?pattern=unique-replacement-setup",
		},
		{
			id: "pattern-dummy-building-scaffold",
			surface: "pattern",
			kicker: "Pattern",
			title: "Dummy Building Scaffold",
			copy: "A frequent answer for civ abilities that need passive city-state or building-style effects.",
			href: "/pattern-library?pattern=dummy-building-scaffold",
		},
		{
			id: "pattern-unit-spawn-workflow",
			surface: "pattern",
			kicker: "Pattern",
			title: "Unit Spawn Workflow",
			copy: "High-value when a civ bonus needs to create units safely, place them correctly, and finish setup without brittle spawn code.",
			href: "/pattern-library?pattern=unit-spawn-workflow",
		},
		{
			id: "pattern-requirements-gate",
			surface: "pattern",
			kicker: "Pattern",
			title: "Requirements Gate Pattern",
			copy: "Useful when your civ needs layered yes-or-no checks for training, construction, or unlock logic.",
			href: "/pattern-library?pattern=requirements-gate-pattern",
		},
		{
			id: "pattern-city-hooks",
			surface: "pattern",
			kicker: "Pattern",
			title: "City Capture / Found / Construct Hooks",
			copy: "Useful when the civ mechanic should react to founding, conquest, or city construction instead of polling every turn.",
			href: "/pattern-library?pattern=city-capture-found-construct-hooks",
		},
		{
			id: "pattern-savedata-cooldown",
			surface: "pattern",
			kicker: "Pattern",
			title: "SaveData Cooldown",
			copy: "Good for civ abilities that need once-per-turn, once-per-city, or delayed repeat behavior without firing endlessly.",
			href: "/pattern-library?pattern=savedata-cooldown-once-per-city-once-per-player",
		},
		{
			id: "pattern-promotion-chain",
			surface: "pattern",
			kicker: "Pattern",
			title: "Promotion Chain Setup",
			copy: "A helpful reference when promotions unlock conditionally or need staged prerequisite logic.",
			href: "/pattern-library?pattern=promotion-chain-setup",
		},
		{
			id: "pattern-per-turn-city-scanner",
			surface: "pattern",
			kicker: "Pattern",
			title: "Per-Turn City Scanner",
			copy: "Useful when a unique needs a steady city pass to refresh dummy buildings, thresholds, or passive state each turn.",
			href: "/pattern-library?pattern=per-turn-city-scanner",
		},
		{
			id: "pattern-city-bought-plot-trigger",
			surface: "pattern",
			kicker: "Pattern",
			title: "City Bought Plot Trigger",
			copy: "Helpful when a civ reward should fire from border expansion purchases instead of broader city polling.",
			href: "/pattern-library?pattern=city-bought-plot-trigger",
		},
		{
			id: "pattern-holy-city-reward-resolver",
			surface: "pattern",
			kicker: "Pattern",
			title: "Holy City / Largest City Reward Resolver",
			copy: "A practical companion when rewards should land in the capital, holy city, or best fallback city without brittle lookup code.",
			href: "/pattern-library?pattern=holy-city-largest-city-reward-resolver",
		},
		{
			id: "generator-city-spy-names",
			surface: "generator",
			kicker: "Generator",
			title: "City + Spy List Generator",
			copy: "Useful when a civ needs polished city lists and spy names without manually formatting every naming block from scratch.",
			href: "/template-generators?generator=city-spy-name-generator",
		},
		{
			id: "generator-leader-behavior",
			surface: "generator",
			kicker: "Generator",
			title: "Leader Behavior Tuning Generator",
			copy: "A fast way to shape AI flavors and diplomatic behavior before hand-tuning every leader value by trial and error.",
			href: "/template-generators?generator=leader-behavior-tuning-generator",
		},
		{
			id: "generator-art-audio-bundle",
			surface: "generator",
			kicker: "Generator",
			title: "Art + Audio Setup",
			copy: "Useful when a civ already exists on paper and you need the supporting atlas, audio, and art registration blocks laid out cleanly.",
			href: "/template-generators?generator=art-audio-bundle",
		},
		{
			id: "tool-modinfo-builder",
			surface: "tool",
			kicker: "Tool",
			title: ".modinfo Builder",
			copy: "Helpful when you need to clean up actions, references, and entry points without hand-editing the XML manifest.",
			href: "/modinfo-builder",
		},
		{
			id: "tool-dds-converter",
			surface: "tool",
			kicker: "Tool",
			title: "DDS Converter",
			copy: "Useful when icons, atlases, or textures are ready and need to be converted into Civ V-friendly DDS outputs.",
			href: "/dds-converter",
		},
		{
			id: "tool-map-viewer",
			surface: "tool",
			kicker: "Tool",
			title: "Map Viewer",
			copy: "Helpful for checking terrain, ownership, and plot state when a civ mechanic depends on placement or map context.",
			href: "/map-viewer",
		},
		{
			id: "tool-tech-tree-viewer",
			surface: "tool",
			kicker: "Tool",
			title: "Tech Tree Viewer",
			copy: "Useful when placing uniques, reveals, or support effects and you need the full tech context at a glance.",
			href: "/tech-tree-viewer",
		},
		{
			id: "tool-icon-maker",
			surface: "tool",
			kicker: "Tool",
			title: "Icon Maker",
			copy: "Useful when a civ has its symbols picked out and you need alpha-ready icon renders for the real game-facing assets.",
			href: "/civ-icon-maker",
		},
		{
			id: "schema-improvements",
			surface: "schema",
			kicker: "Schema Table",
			title: "Improvements",
			copy: "Check this when your civ leans on custom improvement support, build rules, or tile presentation.",
			href: "/schema-browser?table=Improvements",
		},
		...buildLuaCuratedEntries(),
	];

	const allResources = siteResourceGroups.flatMap((group) => group.items);
	const liveSurfaceCount = allResources.filter((item) => !item.disabled).length;
	const upcomingSurfaceCount = allResources.filter((item) => item.disabled).length;
	const hiddenSurfaceCount = allResources.filter((item) =>
		String(item.status || "")
			.toLowerCase()
			.includes("hidden"),
	).length;
	const highImpactPatternIds = [
		"pattern-unique-replacement",
		"pattern-dummy-building-scaffold",
		"pattern-requirements-gate",
		"pattern-unit-spawn-workflow",
		"pattern-city-hooks",
		"pattern-savedata-cooldown",
		"pattern-per-turn-city-scanner",
		"pattern-holy-city-reward-resolver",
	];
	const selectedCuratedEntries = $state(pickCuratedEntries());
	const workshopPlatformIcons = {
		macos: "M447.1 332.7C446.9 296 463.5 268.3 497.1 247.9C478.3 221 449.9 206.2 412.4 203.3C376.9 200.5 338.1 224 323.9 224C308.9 224 274.5 204.3 247.5 204.3C191.7 205.2 132.4 248.8 132.4 337.5C132.4 363.7 137.2 390.8 146.8 418.7C159.6 455.4 205.8 545.4 254 543.9C279.2 543.3 297 526 329.8 526C361.6 526 378.1 543.9 406.2 543.9C454.8 543.2 496.6 461.4 508.8 424.6C443.6 393.9 447.1 334.6 447.1 332.7zM390.5 168.5C417.8 136.1 415.3 106.6 414.5 96C390.4 97.4 362.5 112.4 346.6 130.9C329.1 150.7 318.8 175.2 321 202.8C347.1 204.8 370.9 191.4 390.5 168.5z",
		linux: "M316.9 187.3C317.9 187.8 318.7 189 319.9 189C321 189 322.7 188.6 322.8 187.5C323 186.1 320.9 185.2 319.6 184.6C317.9 183.9 315.7 183.6 314.1 184.5C313.7 184.7 313.3 185.2 313.5 185.6C313.8 186.9 315.8 186.7 316.9 187.3zM295 189C296.2 189 297 187.8 298 187.3C299.1 186.7 301.1 186.9 301.5 185.7C301.7 185.3 301.3 184.8 300.9 184.6C299.3 183.7 297.1 184 295.4 184.7C294.1 185.3 292 186.2 292.2 187.6C292.3 188.6 294 189.1 295 189zM516 467.8C512.4 463.8 510.7 456.2 508.8 448.1C507 440 504.9 431.3 498.3 425.7C497 424.6 495.7 423.6 494.3 422.8C493 422 491.6 421.3 490.2 420.8C499.4 393.5 495.8 366.3 486.5 341.7C475.1 311.6 455.2 285.3 440 267.3C422.9 245.8 406.3 225.4 406.6 195.3C407.1 149.4 411.7 64.1 330.8 64C228.4 63.8 254 167.4 252.9 199.2C251.2 222.6 246.5 241 230.4 263.9C211.5 286.4 184.9 322.7 172.3 360.6C166.3 378.5 163.5 396.7 166.1 413.9C159.6 419.7 154.7 428.6 149.5 434.1C145.3 438.4 139.2 440 132.5 442.4C125.8 444.8 118.5 448.4 114 456.9C111.9 460.8 111.2 465 111.2 469.3C111.2 473.2 111.8 477.2 112.4 481.1C113.6 489.2 114.9 496.8 113.2 501.9C108 516.3 107.3 526.3 111 533.6C114.8 540.9 122.4 544.1 131.1 545.9C148.4 549.5 171.9 548.6 190.4 558.4C210.2 568.8 230.3 572.5 246.3 568.8C257.9 566.2 267.4 559.2 272.2 548.6C284.7 548.5 298.5 543.2 320.5 542C335.4 540.8 354.1 547.3 375.6 546.1C376.2 548.4 377 550.7 378.1 552.8L378.1 552.9C386.4 569.6 401.9 577.2 418.4 575.9C435 574.6 452.5 564.9 466.7 548C480.3 531.6 502.7 524.8 517.6 515.8C525 511.3 531 505.7 531.5 497.5C531.9 489.3 527.1 480.2 516 467.8zM319.8 151.3C329.6 129.1 354 129.5 363.8 150.9C370.3 165.1 367.4 181.8 359.5 191.3C357.9 190.5 353.6 188.7 346.9 186.4C348 185.2 350 183.7 350.8 181.8C355.6 170 350.6 154.8 341.7 154.5C334.4 154 327.8 165.3 329.9 177.5C325.8 175.5 320.5 174 316.9 173.1C315.9 166.2 316.6 158.5 319.8 151.3zM279.1 139.8C289.2 139.8 299.9 154 298.2 173.3C294.7 174.3 291.1 175.8 288 177.9C289.2 169 284.7 157.8 278.4 158.3C270 159 268.6 179.5 276.6 186.4C277.6 187.2 278.5 186.2 270.7 191.9C255.1 177.3 260.2 139.8 279.1 139.8zM265.5 200.5C271.7 195.9 279.1 190.5 279.6 190C284.3 185.6 293.1 175.8 307.5 175.8C314.6 175.8 323.1 178.1 333.4 184.7C339.7 188.8 344.7 189.1 356 194C364.4 197.5 369.7 203.7 366.5 212.2C363.9 219.3 355.5 226.6 343.8 230.3C332.7 233.9 324 246.3 305.6 245.2C301.7 245 298.6 244.2 296 243.1C288 239.6 283.8 232.7 276 228.1C267.4 223.3 262.8 217.7 261.3 212.8C259.9 207.9 261.3 203.8 265.5 200.5zM268.8 534.5C266.1 569.6 224.9 568.9 193.5 552.5C163.6 536.7 124.9 546 117 530.6C114.6 525.9 114.6 517.9 119.6 504.2L119.6 504C122 496.4 120.2 488 119 480.1C117.8 472.3 117.2 465.1 119.9 460.1C123.4 453.4 128.4 451 134.7 448.8C145 445.1 146.5 445.4 154.3 438.9C159.8 433.2 163.8 426 168.6 420.9C173.7 415.4 178.6 412.8 186.3 414C194.4 415.2 201.4 420.8 208.2 430L227.8 465.6C237.3 485.5 270.9 514 268.8 534.5zM267.4 508.6C263.3 502 257.8 495 253 489C260.1 489 267.2 486.8 269.7 480.1C272 473.9 269.7 465.2 262.3 455.2C248.8 437 224 422.7 224 422.7C210.5 414.3 202.9 404 199.4 392.8C195.9 381.6 196.4 369.5 199.1 357.6C204.3 334.7 217.7 312.4 226.3 298.4C228.6 296.7 227.1 301.6 217.6 319.2C209.1 335.3 193.2 372.5 215 401.6C215.6 380.9 220.5 359.8 228.8 340.1C240.8 312.7 266.1 265.2 268.1 227.4C269.2 228.2 272.7 230.6 274.3 231.5C278.9 234.2 282.4 238.2 286.9 241.8C299.3 251.8 315.4 251 329.3 243C335.5 239.5 340.5 235.5 345.2 234C355.1 230.9 363 225.4 367.5 219C375.2 249.4 393.2 293.3 404.7 314.7C410.8 326.1 423 350.2 428.3 379.3C431.6 379.2 435.3 379.7 439.2 380.7C453 345 427.5 306.5 415.9 295.8C411.2 291.2 411 289.2 413.3 289.3C425.9 300.5 442.5 323 448.5 348.3C451.3 359.9 451.8 372 448.9 384C465.3 390.8 484.8 401.9 479.6 418.8C477.4 418.7 476.4 418.8 475.4 418.8C478.6 408.7 471.5 401.2 452.6 392.7C433 384.1 416.6 384.1 414.3 405.2C402.2 409.4 396 419.9 392.9 432.5C390.1 443.7 389.3 457.2 388.5 472.4C388 480.1 384.9 490.4 381.7 501.4C349.6 524.3 305 534.3 267.4 508.6zM524.8 497.1C523.9 513.9 483.6 517 461.6 543.6C448.4 559.3 432.2 568 418 569.1C403.8 570.2 391.5 564.3 384.3 549.8C379.6 538.7 381.9 526.7 385.4 513.5C389.1 499.3 394.6 484.7 395.3 472.9C396.1 457.7 397 444.4 399.5 434.2C402.1 423.9 406.1 417 413.2 413.1C413.5 412.9 413.9 412.8 414.2 412.6C415 425.8 421.5 439.2 433 442.1C445.6 445.4 463.7 434.6 471.4 425.8C480.4 425.5 487.1 424.9 494 430.9C503.9 439.4 501.1 461.2 511.1 472.5C521.7 484.1 525.1 492 524.8 497.1zM269.4 212.7C271.4 214.6 274.1 217.2 277.4 219.8C284 225 293.2 230.4 304.7 230.4C316.3 230.4 327.2 224.5 336.5 219.6C341.4 217 347.4 212.6 351.3 209.2C355.2 205.8 357.2 202.9 354.4 202.6C351.6 202.3 351.8 205.2 348.4 207.7C344 210.9 338.7 215.1 334.5 217.5C327.1 221.7 315 227.7 304.6 227.7C294.2 227.7 285.9 222.9 279.7 218C276.6 215.5 274 213 272 211.1C270.5 209.7 270.1 206.5 267.7 206.2C266.3 206.1 265.9 209.9 269.4 212.7z",
		windows:
			"M96 96L310.6 96L310.6 310.6L96 310.6L96 96zM329.4 96L544 96L544 310.6L329.4 310.6L329.4 96zM96 329.4L310.6 329.4L310.6 544L96 544L96 329.4zM329.4 329.4L544 329.4L544 544L329.4 544L329.4 329.4z",
	};

	function shuffleEntries(entries) {
		const pool = [...entries];
		for (let index = pool.length - 1; index > 0; index -= 1) {
			const swapIndex = Math.floor(Math.random() * (index + 1));
			[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
		}
		return pool;
	}

	function pickFirstAvailable(entries, chosenIds) {
		return entries.find((entry) => !chosenIds.has(entry.id)) || null;
	}

	function pickCuratedEntries() {
		const chosenIds = new Set();
		const picks = [];

		const patternPick = pickFirstAvailable(shuffleEntries(curatedEntries.filter((entry) => entry.surface === "pattern" && highImpactPatternIds.includes(entry.id))), chosenIds);
		if (patternPick) {
			chosenIds.add(patternPick.id);
			picks.push(patternPick);
		}

		// const secondaryPatternPick = pickFirstAvailable(shuffleEntries(curatedEntries.filter((entry) => entry.surface === "pattern")), chosenIds);
		// if (secondaryPatternPick) {
		// 	chosenIds.add(secondaryPatternPick.id);
		// 	picks.push(secondaryPatternPick);
		// }

		const schemaPick = pickFirstAvailable(shuffleEntries(curatedEntries.filter((entry) => entry.surface === "schema")), chosenIds);
		if (schemaPick) {
			chosenIds.add(schemaPick.id);
			picks.push(schemaPick);
		}

		const luaPick = pickFirstAvailable(shuffleEntries(curatedEntries.filter((entry) => entry.surface === "lua")), chosenIds);
		if (luaPick) {
			chosenIds.add(luaPick.id);
			picks.push(luaPick);
		}

		const generatorOrToolPick = pickFirstAvailable(shuffleEntries(curatedEntries.filter((entry) => entry.surface === "generator" || entry.surface === "tool")), chosenIds);
		if (generatorOrToolPick) {
			chosenIds.add(generatorOrToolPick.id);
			picks.push(generatorOrToolPick);
		}

		if (picks.length < 4) {
			const fallbackPool = shuffleEntries(curatedEntries.filter((entry) => !chosenIds.has(entry.id)));
			for (const entry of fallbackPool) {
				if (picks.length >= 4) {
					break;
				}
				chosenIds.add(entry.id);
				picks.push(entry);
			}
		}

		return picks;
	}

	function refreshCuratedEntries() {
		selectedCuratedEntries.splice(0, selectedCuratedEntries.length, ...pickCuratedEntries());
	}

	function buildLuaCuratedEntries() {
		const methodEntries = CURATED_METHOD_NAMES.map((methodName) => {
			const entry = luaData.methods.find((item) => item.methodName === methodName);
			if (!entry) {
				return null;
			}

			const title = entry.family === "Game" ? `Game.${entry.methodName}` : `${entry.family}:${entry.methodName}`;
			return {
				id: `lua-method-${entry.id}`,
				surface: "lua",
				kicker: "Lua Method",
				title,
				copy: entry.summary || `${entry.family} method with ${entry.parameters.length} ${entry.parameters.length === 1 ? "parameter" : "parameters"}.`,
				href: `/lua-api-explorer?dataset=methods&entry=${entry.id}`,
			};
		});

		const eventEntries = CURATED_EVENT_NAMES.map((eventName) => {
			const entry = luaData.gameEvents.find((item) => item.name === eventName);
			if (!entry) {
				return null;
			}

			return {
				id: `lua-event-${entry.id}`,
				surface: "lua",
				kicker: "Lua Event",
				title: `GameEvents.${entry.name}`,
				copy: entry.summary || `${entry.scope || "Game"} callback with ${entry.parameters.length} ${entry.parameters.length === 1 ? "parameter" : "parameters"}.`,
				href: `/lua-api-explorer?dataset=game-events&entry=${entry.id}`,
			};
		});

		return [...methodEntries, ...eventEntries].filter(Boolean);
	}

	function curatedAccentClass(entry) {
		const href = String(entry?.href || "");

		if (href.includes("/workshop-uploader") || href.includes("/modinfo-builder") || href.includes("/civ5mod-ziper")) {
			return "is-publish";
		}
		if (href.includes("/dds-converter") || href.includes("/civ-icon-maker") || href.includes("/text-screen-viewer")) {
			return "is-ui";
		}
		if (href.includes("/guided-planner")) {
			return "is-planner";
		}

		switch (entry.surface) {
			case "schema":
				return "is-schema";
			case "lua":
				return "is-lua";
			case "pattern":
				return "is-pattern";
			case "generator":
				return "is-generator";
			default:
				return "is-tool";
		}
	}
</script>

<section class="home-page">
	<header class="hero home-hero">
		<div class="hero-copy">
			<p class="eyebrow">New to Civilization V Modding? Start Here</p>
			<h1>Learn how to build Civilization V mods with a smooth on-ramp, custom tooling, and fewer dead ends.</h1>
			<p>Civ Modding Central makes it easier to go from first draft to final release.</p>
		</div>
	</header>

	<section class="home-section home-onramp">
		<div class="section-heading">
			<p class="eyebrow">Beginner On-Ramp + Progress Tracking</p>
			<p class="section-copy">
				The fastest way to get unstuck is to stop treating civ modding like one huge task. Use our planner as your step-by-step guide and our templates to remove the blank page problem.
			</p>
		</div>

		<div class="onramp-grid">
			<a class="onramp-card is-generator" href="/template-generators" target="_blank" rel="noopener noreferrer">
				<span class="onramp-kicker">Step 1</span>
				<h3 class="card-title">Civilization Starter</h3>
				<p class="card-copy">Copying an existing civ can be scary touching what you don't understand, this starter makes it safe and easy.</p>
				<ul>
					<li>Starter structure for civ identity, art, text, and mod support</li>
					<li>Useful for first-time modders who need a starting point</li>
					<li>Starter package is free from code you may not be ready for</li>
				</ul>
			</a>

			<a class="onramp-card is-path" href="/guided-planner" target="_blank" rel="noopener noreferrer">
				<span class="onramp-kicker">Step 2</span>
				<h3 class="card-title">Guided Planner</h3>
				<p class="card-copy">See the full civ workload laid out in manageable chunks, weighted priority, dependencies, progress tracking, and linked supporting learning resources.</p>
				<ul>
					<li>Weighted task sequence instead of a flat checklist</li>
					<li>Notes and veteran modder testimonies per step</li>
					<li>Local (and cloud for collabs) progress tracking across projects</li>
				</ul>
			</a>
		</div>
	</section>

	<section class="home-section home-curated">
		<div class="section-heading">
			<div class="stack half">
				<p class="eyebrow">Curated Lessons + Complete Documentation</p>
				<h2 class="section-title text-box-trim">The site is built to give you the references, examples, and tooling you need to learn in one place</h2>
				<p class="section-copy">Use these rotating picks as a quick peek into the broader resource library before diving into the knowledge base.</p>
			</div>
		</div>

		<div class="curated-grid">
			{#each selectedCuratedEntries as entry (entry.id)}
				<a class={["curated-card", curatedAccentClass(entry)]} href={entry.href} target="_blank" rel="noopener noreferrer">
					<div class="curated-card-head">
						<span class="surface-badge">{entry.kicker}</span>
					</div>
					<h3 class="card-title">{entry.title}</h3>
					<p class="card-copy">{entry.copy}</p>
				</a>
			{/each}
		</div>

		<div class="curated-toolbar">
			<p class="curated-toolbar-copy">Rotate the set and explore a new slice of the resource library.</p>
			<button type="button" class="section-refresh" onclick={refreshCuratedEntries}>Show another set</button>
		</div>
	</section>

	<section class="home-section home-workshop">
		<div class="stack half">
			<p class="eyebrow">Release + Distribute</p>
			<h2 class="section-title text-box-trim">When the mod is ready, use these tools to package and publish it.</h2>
			<p class="section-copy">The same toolkit that packages your mod also helps you upload it to the Steam Workshop.</p>
		</div>

		<div class="workshop-grid">
			<article class="workshop-feature-card">
				<div class="workshop-feature-shell">
					<div class="stack">
						<div class="workshop-feature-head">
							<div class="stack quarter">
								<span class="workshop-kicker">Standalone App</span>
								<h3 class="card-title">CMC Workshop Uploader</h3>
							</div>
						</div>
						<p class="card-copy">Use our dedicated upload app for new Workshop releases and existing mod update.</p>
						<ul>
							<li>Cross-platform (macOS/Linux/Windows) uploading for Steam Workshop publishing</li>
							<li>Better and faster fit for release upkeep than now deprecated and unsupported ModBuddy</li>
							<li>Bundled with the .modinfo Builder and .civ5mod Ziper support tools within the app</li>
						</ul>
					</div>
					<div class="workshop-download-panel">
						<div class="workshop-download-copy">
							<span class="workshop-download-label">Version {CURRENT_VERSION}</span>
							<p>Visit the page for instructions. Requires Steam account and a Steam copy of Civilization V.</p>
						</div>
						<div class="workshop-download-stack">
							{#each workshopUploaderDownloadCards as card (card.id)}
								{#if card.available}
									<a class="home-cta is-primary is-platform-download" href={card.href} target="_blank" rel="noopener noreferrer">
										<svg viewBox="0 0 640 640" aria-hidden="true">
											<path d={workshopPlatformIcons[card.id]} />
										</svg>
										<span class="inline">
											<strong>{card.title}</strong>
											<small>{card.formats}</small>
										</span>
									</a>
								{:else}
									<span class="home-cta is-primary is-platform-download is-disabled" aria-disabled="true">
										<svg viewBox="0 0 640 640" aria-hidden="true">
											<path d={workshopPlatformIcons[card.id]} />
										</svg>
										<span class="inline">
											<strong>{card.title}</strong>
											<small>{card.formats}</small>
										</span>
									</span>
								{/if}
							{/each}
						</div>
					</div>
				</div>
			</article>

			<div class="workshop-support-grid">
				<a class="support-link-card is-publish" href="/modinfo-builder" target="_blank" rel="noopener noreferrer">
					<h3 class="card-title">.modinfo Builder</h3>
					<p class="card-copy">Get the mod manifest clean and auto filled with the correct settings. No repeated clicks or frustrating setup errors.</p>
				</a>
				<a class="support-link-card is-publish" href="/civ5mod-ziper" target="_blank" rel="noopener noreferrer">
					<h3 class="card-title">.civ5mod Ziper</h3>
					<p class="card-copy">Package a proper Civ V archive in the proper format for distribution before the upload handoff.</p>
				</a>
				<a class="support-link-card is-tool" href="/community-links" target="_blank" rel="noopener noreferrer">
					<h3 class="card-title">Community Links</h3>
					<p class="card-copy">Useful when you need release help or sharing your mod with the community.</p>
				</a>
			</div>
		</div>
	</section>

	<SiteResourceDirectory groups={siteResourceGroups} />
</section>

<style>
	.home-page {
		display: grid;
		gap: 2rem;
		--home-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 82%, #85511a 5%);
		--home-muted-border: color-mix(in srgb, var(--border-color, rgba(255, 255, 255, 0.14)) 92%, white 8%);
		--home-panel: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 88%, #1e140d 12%);
		--home-panel-strong: color-mix(in srgb, var(--surface-color, rgba(14, 18, 24, 0.94)) 80%, #221209 20%);
		--home-shadow: 0 6px 10px color-mix(in srgb, black 70%, transparent);
	}

	.home-hero {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 26rem);
		gap: 1.25rem;
		background:
			radial-gradient(circle at 12% 14%, color-mix(in srgb, var(--accent) 20%, transparent) 0%, transparent 34%),
			radial-gradient(circle at 85% 18%, color-mix(in srgb, #8dc7ff 16%, transparent) 0%, transparent 30%),
			linear-gradient(140deg, color-mix(in srgb, var(--home-panel) 84%, black 16%) 0%, color-mix(in srgb, var(--home-panel-strong) 76%, #130d09 24%) 100%);
		padding-block: clamp(1.4rem, 2.8vw, 2rem) 2rem;
		padding-inline: 2vw;
	}

	.home-hero,
	.home-section {
		box-shadow: var(--home-shadow);
		border: 1px solid var(--home-border);
		border-radius: 1.15rem;
	}

	.hero-copy {
		align-content: start;
		gap: 1rem;
	}

	.hero-copy,
	.hero-aside,
	.hero-actions,
	.hero-microcopy,
	.onramp-grid,
	.curated-grid,
	.workshop-grid,
	.workshop-support-grid,
	.gallery-grid,
	.credits-grid {
		display: grid;
		gap: 1rem;
	}

	.workshop-download-copy p {
		color: color-mix(in srgb, var(--muted-ink) 68%, white 32%);
		font-size: 1rem;
		margin: 0;
	}

	.home-section {
		display: grid;
		gap: 1rem;
		background: color-mix(in srgb, var(--home-panel) 92%, #140f0c 8%);
		padding: 1.3rem;
	}

	.home-onramp {
		background:
			linear-gradient(160deg, color-mix(in srgb, var(--surface-generator-panel) 22%, var(--home-panel)) 0%, color-mix(in srgb, var(--home-panel) 96%, #110d0b 4%) 58%),
			color-mix(in srgb, var(--home-panel) 94%, #130f0d 6%);
	}

	.section-heading {
		display: grid;
		gap: 0.5rem;
	}

	.onramp-grid,
	.workshop-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.support-link-card:hover,
	.support-link-card:focus-visible,
	a.surface-card:hover,
	a.surface-card:focus-visible {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight, var(--accent)) 25%, transparent) 0%, transparent 40%),
			linear-gradient(165deg, var(--surface-panel) 90%, color-mix(in srgb, var(--surface-panel) 90%, #16110f 10%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--surface-highlight, var(--accent)) 14%, transparent),
			0 6px 8px color-mix(in srgb, black 80%, transparent);
		border-color: color-mix(in srgb, var(--surface-highlight, var(--accent)) 74%, var(--home-muted-border));
		transform: translateY(-2px);
	}

	.hero-stat-card,
	.onramp-card,
	.curated-card,
	.workshop-feature-card,
	.support-link-card,
	.gallery-card,
	.surface-group,
	.surface-card,
	.credit-card {
		background: color-mix(in srgb, var(--control-bg) 92%, #1d1410 8%);
		box-shadow: 0 4px 8px color-mix(in srgb, black 78%, transparent);
		border: 1px solid var(--home-muted-border);
		border-radius: 1rem;
	}

	.onramp-card ul,
	.workshop-feature-card ul {
		display: grid;
		gap: 0.45rem;
		color: var(--muted-ink);
		padding-inline-start: 1.1rem;
		margin: 0;
	}

	.onramp-card,
	.workshop-feature-card,
	.credit-card {
		position: relative;
		display: grid;
		gap: 0.8rem;
		color: var(--ink);
		text-decoration: none;
		padding: 1.15rem;
		overflow: hidden;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease,
			box-shadow 160ms ease;
	}

	.onramp-card:hover {
		transform: translateY(-2px);
	}

	.onramp-card.is-generator {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-generator-highlight) 22%, transparent) 0%, transparent 36%),
			linear-gradient(
				168deg,
				color-mix(in srgb, var(--surface-generator-panel) 78%, var(--control-bg)) 0%,
				color-mix(in srgb, #1b1323 56%, var(--control-bg)) 58%,
				color-mix(in srgb, var(--control-bg) 76%, #171018 24%) 100%
			);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--surface-generator-highlight) 18%, transparent),
			0 6px 10px color-mix(in srgb, #0f0914 34%, transparent);
		border-color: color-mix(in srgb, var(--surface-generator-highlight) 62%, var(--home-muted-border));
	}

	.onramp-card.is-generator:hover {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-generator-highlight) 32%, transparent) 0%, transparent 38%),
			linear-gradient(
				168deg,
				color-mix(in srgb, var(--surface-generator-panel) 84%, var(--control-bg)) 0%,
				color-mix(in srgb, #20152b 60%, var(--control-bg)) 58%,
				color-mix(in srgb, var(--control-bg) 68%, #171018 32%) 100%
			);
		border-color: color-mix(in srgb, var(--surface-generator-highlight) 82%, var(--home-muted-border));
	}

	.onramp-card.is-path {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-planner-highlight) 20%, transparent) 0%, transparent 34%),
			linear-gradient(
				168deg,
				color-mix(in srgb, var(--surface-planner-panel) 76%, var(--control-bg)) 0%,
				color-mix(in srgb, #2f2619 54%, var(--control-bg)) 58%,
				color-mix(in srgb, var(--control-bg) 80%, #1c160f 20%) 100%
			);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--surface-planner-highlight) 18%, transparent),
			0 6px 8px color-mix(in srgb, #15110a 34%, transparent);
		border-color: color-mix(in srgb, var(--surface-planner-highlight) 62%, var(--home-muted-border));
	}

	.onramp-card.is-path:hover {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-planner-highlight) 30%, transparent) 0%, transparent 38%),
			linear-gradient(
				168deg,
				color-mix(in srgb, var(--surface-planner-panel) 84%, var(--control-bg)) 0%,
				color-mix(in srgb, #382d1e 60%, var(--control-bg)) 58%,
				color-mix(in srgb, var(--control-bg) 72%, #1c160f 28%) 100%
			);
		border-color: color-mix(in srgb, var(--surface-planner-highlight) 82%, var(--home-muted-border));
	}

	.is-generator {
		--surface-border: var(--surface-generator-border);
		--surface-highlight: var(--surface-generator-highlight);
		--surface-highlight-strong: var(--surface-generator-highlight-strong);
		--surface-panel: var(--surface-generator-panel);
	}

	.hero-microcopy span {
		color: var(--ink);
		background: color-mix(in srgb, var(--control-bg) 88%, transparent);
		border: 1px solid color-mix(in srgb, var(--home-muted-border) 92%, white 8%);
		border-radius: 999px;
		padding-block: 0.42rem;
		padding-inline: 0.65rem;
	}

	.hero-microcopy span,
	.hero-stat-label,
	.onramp-kicker {
		text-transform: uppercase;
		font-size: 0.74rem;
		letter-spacing: 0.12em;
	}

	.home-curated {
		background:
			radial-gradient(circle at top right, color-mix(in srgb, #8dc7ff 8%, transparent) 0%, transparent 28%),
			radial-gradient(circle at 20% 90%, color-mix(in srgb, #7de0ae 8%, transparent) 0%, transparent 30%), color-mix(in srgb, var(--home-panel) 94%, #0f1315 6%);
	}

	.curated-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.curated-card-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.7rem;
	}

	.curated-card .surface-badge,
	.support-link-card .surface-badge {
		color: var(--surface-highlight-strong, var(--ink));
		background: color-mix(in srgb, var(--surface-highlight, var(--accent)) 14%, transparent);
		border-color: color-mix(in srgb, var(--surface-highlight, var(--accent)) 54%, var(--home-muted-border));
	}

	.surface-badge {
		inline-size: fit-content;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		text-transform: uppercase;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		border: 1px solid currentColor;
		border-radius: 999px;
		padding-block: 0.3rem;
		padding-inline: 0.65rem;
	}

	.curated-toolbar {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 1.5rem;
		border-radius: 1rem;
		padding-block: 0.75rem;
		padding-inline: 0.5rem;
		/*background: color-mix(in srgb, var(--surface-schema-panel) 38%, var(--control-bg));
		border: 1px solid color-mix(in srgb, var(--surface-schema-highlight) 18%, var(--home-muted-border));*/
	}

	.curated-toolbar-copy {
		color: var(--muted-ink);
		margin: 0;
	}

	.home-cta:hover,
	.section-refresh:hover {
		transform: translateY(-1px);
	}

	.section-refresh {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		color: var(--ink);
		font-weight: 700;
		background: color-mix(in srgb, var(--surface-schema-panel) 72%, var(--control-bg));
		border: 1px solid color-mix(in srgb, var(--surface-schema-highlight) 28%, var(--home-muted-border));
		border-radius: 999px;
		padding-block: 0.6rem;
		padding-inline: 0.9rem;
	}

	.home-workshop {
		background:
			radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 32%),
			linear-gradient(150deg, color-mix(in srgb, var(--surface-tool-panel) 24%, var(--home-panel)) 0%, color-mix(in srgb, var(--home-panel) 96%, #110d0a 4%) 100%);
	}

	.workshop-feature-card {
		display: grid;
		background:
			radial-gradient(circle at 86% 16%, color-mix(in srgb, var(--surface-tool-highlight) 18%, transparent) 0%, transparent 30%),
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 34%),
			linear-gradient(160deg, color-mix(in srgb, var(--surface-tool-panel) 62%, var(--control-bg)) 0%, color-mix(in srgb, var(--control-bg) 88%, #18110d 12%) 100%);
		border-color: color-mix(in srgb, var(--surface-tool-highlight) 54%, var(--home-muted-border));
		padding: 0;
		overflow: hidden;
	}

	.workshop-feature-shell {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 0.9fr);
		align-items: stretch;
		gap: 1.1rem;
		padding: 1.2rem;
	}

	.workshop-feature-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 1rem;
	}

	.workshop-kicker,
	.workshop-download-label {
		color: color-mix(in srgb, var(--surface-tool-highlight) 62%, white 38%);
		text-transform: uppercase;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.12em;
	}

	.workshop-download-panel {
		display: grid;
		gap: 0.5rem;
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent) 20%, transparent) 0%, transparent 42%),
			linear-gradient(165deg, color-mix(in srgb, var(--surface-tool-panel) 74%, var(--control-bg)) 0%, color-mix(in srgb, var(--control-bg) 82%, #21130b 18%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, white 8%, transparent),
			0 6px 28px color-mix(in srgb, black 78%, transparent);
		border: 1px solid color-mix(in srgb, var(--surface-tool-highlight) 34%, var(--home-muted-border));
		border-radius: 1rem;
		padding: 1rem;
	}

	.workshop-download-panel .home-cta.is-platform-download {
		justify-content: flex-start;
		gap: 0.5rem;
		padding-block: 0.5rem;
		padding-inline: 0.65rem;
	}

	.workshop-download-panel .home-cta.is-platform-download small {
		flex: 0 0 auto;
		color: color-mix(in srgb, white 70%, var(--muted-ink) 30%);
		text-transform: uppercase;
		font-size: 0.74rem;
		font-weight: 800;
		letter-spacing: 0.08em;
	}

	.workshop-download-panel .home-cta.is-platform-download svg {
		inline-size: 1.75rem;
		block-size: 1.75rem;
		flex: 0 0 auto;
		fill: currentColor;
	}

	.workshop-download-panel .home-cta.is-platform-download.is-disabled {
		color: color-mix(in srgb, white 82%, var(--muted-ink) 18%);
		opacity: 0.82;
		background: linear-gradient(180deg, color-mix(in srgb, var(--control-bg) 84%, #2a201c 16%) 0%, color-mix(in srgb, var(--control-bg) 90%, #1a1412 10%) 100%);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);
		border-color: color-mix(in srgb, var(--surface-tool-highlight) 26%, var(--home-muted-border));
		cursor: default;
	}

	.workshop-download-panel .home-cta.is-primary {
		inline-size: 100%;
		font-size: 1rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 28%, #5a2b15 72%) 0%, color-mix(in srgb, var(--accent) 18%, #3c1f12 82%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, white 12%, transparent),
			0 4px 8px color-mix(in srgb, #180d08 72%, transparent);
		border-radius: 1rem;
		border-color: color-mix(in srgb, var(--accent) 72%, var(--surface-tool-highlight));
	}

	.workshop-download-copy {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.workshop-download-stack {
		display: grid;
		gap: 0.75rem;
	}

	.home-cta {
		min-block-size: 3rem;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		text-decoration: none;
		font-weight: 800;
		letter-spacing: 0.03em;
		border: 1px solid var(--home-muted-border);
		border-radius: 999px;
		padding-inline: 1.05rem;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background 140ms ease;
	}

	.home-cta.is-primary {
		color: var(--ink);
		background: color-mix(in srgb, var(--accent) 18%, var(--control-bg));
		border-color: color-mix(in srgb, var(--accent) 56%, var(--home-muted-border));
	}

	.home-cta.is-secondary {
		color: var(--ink);
		background: color-mix(in srgb, var(--surface-generator-panel) 82%, transparent);
		border-color: color-mix(in srgb, var(--surface-generator-highlight) 44%, var(--home-muted-border));
	}

	.workshop-support-grid,
	.credits-grid {
		grid-template-columns: 1fr;
	}

	.curated-card,
	.support-link-card {
		position: relative;
		display: grid;
		gap: 0.7rem;
		color: var(--ink);
		text-decoration: none;
		padding: 1rem;
		overflow: hidden;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease,
			box-shadow 160ms ease;
	}

	.curated-card,
	.support-link-card,
	.surface-card {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight, var(--accent)) 30%, transparent) 0%, transparent 35%),
			linear-gradient(165deg, color-mix(in srgb, var(--surface-panel) 100%, var(--control-bg)) 0%, color-mix(in srgb, var(--surface-panel) 80%, #16110f 5%) 100%);
		border-color: color-mix(in srgb, var(--surface-highlight, var(--surface-border, var(--accent))) 44%, var(--surface-border, var(--home-muted-border)));
	}

	.is-publish {
		--surface-border: var(--surface-publish-border);
		--surface-highlight: var(--surface-publish-highlight);
		--surface-highlight-strong: var(--surface-publish-highlight-strong);
		--surface-panel: var(--surface-publish-panel);
	}

	.is-tool {
		--surface-border: var(--surface-tool-border);
		--surface-highlight: var(--surface-tool-highlight);
		--surface-highlight-strong: var(--surface-tool-highlight-strong);
		--surface-panel: var(--surface-tool-panel);
	}

	.credit-card {
		background: color-mix(in srgb, var(--control-bg) 94%, #191412 6%);
	}

	.curated-card:hover,
	.curated-card:focus-visible {
		background:
			radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--surface-highlight, var(--accent)) 18%, transparent) 0%, transparent 34%),
			linear-gradient(165deg, color-mix(in srgb, var(--surface-panel, var(--control-bg)) 90%, var(--control-bg)) 0%, color-mix(in srgb, var(--control-bg) 84%, #16110f 16%) 100%);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--surface-highlight, var(--accent)) 14%, transparent),
			0 6px 8px color-mix(in srgb, black 76%, transparent);
		border-color: color-mix(in srgb, var(--surface-highlight, var(--accent)) 74%, var(--home-muted-border));
		transform: translateY(-2px);
	}

	.gallery-card {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
	}

	.gallery-card--wide {
		grid-column: span 2;
	}

	.gallery-copy {
		display: grid;
		gap: 0.45rem;
	}

	.gallery-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.gallery-placeholder {
		min-block-size: 12rem;
		display: grid;
		place-items: center;
		color: color-mix(in srgb, var(--muted-ink) 72%, white 28%);
		font-weight: 700;
		letter-spacing: 0.04em;
		text-align: center;
		background: linear-gradient(135deg, color-mix(in srgb, var(--control-bg) 82%, #18222d 18%) 0%, color-mix(in srgb, var(--control-bg) 86%, #21150f 14%) 100%);
		border: 1px dashed color-mix(in srgb, var(--home-muted-border) 80%, white 20%);
		border-radius: 0.9rem;
	}

	.hero-actions {
		grid-template-columns: repeat(2, minmax(0, max-content));
		align-items: center;
	}

	.hero-aside {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		align-content: start;
	}

	.hero-microcopy {
		grid-template-columns: repeat(3, minmax(0, max-content));
		gap: 0.65rem;
	}

	.hero-stat-card {
		display: grid;
		gap: 0.45rem;
		padding: 1rem;
	}

	.hero-stat-label {
		color: color-mix(in srgb, var(--muted-ink) 72%, white 28%);
	}

	.home-credits {
		background: linear-gradient(180deg, color-mix(in srgb, var(--home-panel) 96%, transparent) 0%, color-mix(in srgb, var(--home-panel-strong) 90%, #0e0a08 10%) 100%);
	}

	.home-gallery {
		background: color-mix(in srgb, var(--home-panel) 94%, #12171d 6%);
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

	.is-planner {
		--surface-border: var(--surface-planner-border);
		--surface-highlight: var(--surface-planner-highlight);
		--surface-highlight-strong: var(--surface-planner-highlight-strong);
		--surface-panel: var(--surface-planner-panel);
	}

	.is-schema {
		--surface-border: var(--surface-schema-border);
		--surface-highlight: var(--surface-schema-highlight);
		--surface-highlight-strong: var(--surface-schema-highlight-strong);
		--surface-panel: var(--surface-schema-panel);
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

	.workshop-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	.workshop-feature-copy {
		display: grid;
		gap: 1rem;
	}

	@media (max-width: 1100px) {
		.home-hero,
		.onramp-grid,
		.workshop-grid,
		.gallery-grid {
			grid-template-columns: 1fr;
		}

		.hero-aside,
		.curated-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.workshop-feature-shell {
			grid-template-columns: 1fr;
		}

		.gallery-card--wide {
			grid-column: auto;
		}
	}

	@media (max-width: 720px) {
		.hero-actions,
		.hero-microcopy,
		.hero-aside,
		.curated-grid {
			grid-template-columns: 1fr;
		}

		.curated-toolbar {
			align-items: start;
		}
	}
</style>
