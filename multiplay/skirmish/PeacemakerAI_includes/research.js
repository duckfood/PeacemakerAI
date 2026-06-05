// Standard research
const KINETIC_ALLOYS = [
	"R-Vehicle-Metals09",
	"R-Cyborg-Metals09",
];
const THERMAL_ALLOYS = [
	"R-Vehicle-Armor-Heat09",
	"R-Cyborg-Armor-Heat09",
];
const STRUCTURE_DEFENSE_UPGRADES = [
	"R-Defense-WallUpgrade11",
	"R-Struc-Materials03",
];
const POWER_AND_RESEARCH_UPGRADES = [
	"R-Struc-Power-Upgrade03a", // final power upgrade
	"R-Struc-Research-Upgrade07", // final research upgrade
];
const VTOL_PADS_UPGRADES = [
	"R-Struc-VTOLPad-Upgrade06",
];

//// distilled version
function lookForResearch(tech, labParam) {
    if (baseUnderAttack > 2 && getRealPower() < 800) return;
    if (!countDroid(DROID_CONSTRUCT) || researchDone) return;

    const labList = labParam ? [labParam]
        : enumStruct(me, RES_LAB_STAT).filter(lab => lab.status === BUILT && structureIdle(lab));

    for (const lab of labList) {
		if (getRealPower() < MIN_RESEARCH_POWER) return;
        let found = false;

        if (enemyHasVtol && !found) {
            found = evalResearch(lab.id, Schemes[Scheme].ANTI_AIR_TECH);
        }

        if (isSeaMap && !found) {
            found = pursueResearch(lab, "R-Vehicle-Prop-Hover");
        }

        if (!found) {
            found = evalResearch(lab.id, Schemes[Scheme].FUNDAMENTALS1);
            if (!found) found = evalResearch(lab.id, Schemes[Scheme].FUNDAMENTALS2);
			if (!found) found = evalResearch(lab.id, Schemes[Scheme].BASIC_TECH);
            if (!found) found = evalResearch(lab.id, Schemes[Scheme].FUNDAMENTALS3);
            if (!found) found = evalResearch(lab.id, Schemes[Scheme].ADVANCED_TECH);
            if (!found) found = evalResearch(lab.id, Schemes[Scheme].FUNDAMENTALS4);
        }

        if (!found && getRealPower() > MIN_RESEARCH_POWER * 10) {
            const reslist = enumResearch();
            if (reslist.length > 0) {
                const idx = Math.floor(Math.random() * reslist.length);
                pursueResearch(lab, reslist[idx].name);
            }
        }
    }
}

function evalResearch(labID, list) {
    if (!labID || !list) {
        return true;
    }

    const lab = getObject(STRUCTURE, me, labID);
    if (!lab) {
        return true;
    }

    for (const item of list) {
        if (isSeaMap && (item === "R-Vehicle-Prop-Halftracks" || item === "R-Vehicle-Prop-Tracks")) continue;
        const research = getResearch(item);
        if (research && !research.done && pursueResearch(lab, item)) {
            return true;
        }
    }

    return false;
}
