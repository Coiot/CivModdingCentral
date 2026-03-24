function compactTitle(value) {
	return String(value || "")
		.replace(/\s+/g, " ")
		trim();
}

export function sortKeyForPediaEntryTitle(value) {
	const title = compactTitle(value);
	const withoutLeadingArticle = title.replace(/^the\s+/i, "").trim();
	return withoutLeadingArticle || title;
}

export function comparePediaEntryTitles(leftTitle, rightTitle) {
	const leftDisplayTitle = compactTitle(leftTitle);
	const rightDisplayTitle = compactTitle(rightTitle);
	const leftSortTitle = sortKeyForPediaEntryTitle(leftDisplayTitle);
	const rightSortTitle = sortKeyForPediaEntryTitle(rightDisplayTitle);
	return (
		leftSortTitle.localeCompare(rightSortTitle, undefined, { sensitivity: "base" }) ||
		leftDisplayTitle.localeCompare(rightDisplayTitle, undefined, { sensitivity: "base" })
	);
}

export function comparePediaEntriesByTitle(left, right) {
	return (
		comparePediaEntryTitles(left?.title, right?.title) ||
		String(left?.leader || "").localeCompare(String(right?.leader || ""), undefined, { sensitivity: "base" })
	);
}

export function sortPediaEntries(entries) {
	return [...(entries || [])].sort(comparePediaEntriesByTitle);
}
