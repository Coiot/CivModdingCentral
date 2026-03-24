import { MODDED_CIVS_PEDIA_FORMAT_VERSION } from "./moddedCivsPediaConstants.js";
import { sortPediaEntries } from "../utils/pediaSorting.js";

const BUILTIN_PEDIA_MODULES = import.meta.glob("./modded-civs-pedia/*.json", {
	eager: true,
	import: "default",
});

export const BUILTIN_MODDED_CIVS = Object.values(BUILTIN_PEDIA_MODULES);

export const MOD_SUPPORT_LABELS = {
	aa: "Additional Achievements",
	civivtraits: "Civ IV Traits",
	claimscoloniescrimes: "Claims, Colonies, and Crimes",
	culdiv: "Cultural Diversity",
	eandd: "Events and Decisions",
	enlightenmentera: "Enlightenment Era",
	ethnicunits: "Ethnic Units",
	histreligions: "Historical Religions",
	maplabels: "Map Labels",
	mercenaries: "Mercenaries",
	piety: "Piety and Prestige",
	slavery: "Slavery",
	traits: "Extra Traits",
	uci: "Unique Cultural Influence",
	ynaemp: "YnAEMP",
};

export function sortModdedCivsEntries(entries) {
	return sortPediaEntries(entries);
}
