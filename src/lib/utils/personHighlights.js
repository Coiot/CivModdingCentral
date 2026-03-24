const PERSON_HIGHLIGHTS = {
	coiot: "#4db0dd",
	tradboy: "#ffd1dc",
	tophatpaladin: "#d8d474",
	nopecopter: "#d47afe",
	jfd: "#f1c40f",
	orange: "#e67e23",
	orangechrisy: "#e67e23",
	darthkyofu: "#1abc9c",
	rhoze: "#d0c939",
	explosivewatermelon: "#8ff460",
	thyreformer: "#ffbf00",
	emeraldrange: "#3ee773",
	pouakai: "#e74b3c",
	lasqueto: "#6cc036",
	pouākai: "#e74b3c",
	lacsiraxariscal: "#b79701",
};

export function normalizePersonHighlightName(value) {
	return String(value || "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "")
		.trim();
}

export function personHighlight(value) {
	return PERSON_HIGHLIGHTS[normalizePersonHighlightName(value)] || "";
}

export function personHighlightStyle(value, variableName = "--person-highlight") {
	const color = personHighlight(value);
	return color ? `${variableName}:${color}` : "";
}

export { PERSON_HIGHLIGHTS };
