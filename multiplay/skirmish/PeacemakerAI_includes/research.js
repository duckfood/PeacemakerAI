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
	"R-Struc-Materials03", // final structure upgrade
	"R-Defense-WallUpgrade11", // final wall upgrade
];
const POWER_AND_RESEARCH_UPGRADES = [
	"R-Struc-Power-Upgrade03a", // final power upgrade
	"R-Struc-Research-Upgrade09", // final research upgrade
];
const VTOL_PADS_UPGRADES = [
	"R-Struc-VTOLPad-Upgrade06", // final pad upgrade
];

//// perform research in tiered stages unless flush
function lookForResearch(tech, labParam) { // timer
    if (researchDone) return;
    if (baseUnderAttack > 2 && getRealPower() < 800) return; // produce instead

    const labList = labParam ? [labParam]
        : enumStruct(me, RES_LAB_STAT).filter(lab => lab.status === BUILT && structureIdle(lab));

    for (const lab of labList) {
		if (getRealPower() < MIN_RESEARCH_POWER) return; // avoid deficit spending
        let found = false;

        // if hostiles have been spotted push for AA
        if (enemyHasVtol && !found) {
            found = evalResearch(lab.id, Schemes[Scheme].ANTI_AIR_TECH);
        }
        // prioritize hover if needed
        if (isSeaMap && !found) {
            found = pursueResearch(lab, "R-Vehicle-Prop-Hover");
        }
        // finish start tech first
        found = evalResearch(lab.id, Schemes[Scheme].START_TECH);
        if (getRealPower() < 1500 && !isResearched(Schemes[Scheme].START_TECH)) continue;
        // prioritize fundamentals
        if (!found) {
            found = evalResearch(lab.id, Schemes[Scheme].FUNDAMENTALS1);
            if (getRealPower() < 1500 && !isResearched(Schemes[Scheme].FUNDAMENTALS1)) continue;
            if (!found) found = evalResearch(lab.id, Schemes[Scheme].FUNDAMENTALS2);
            if (getRealPower() < 1500 && !isResearched(Schemes[Scheme].FUNDAMENTALS2)) continue;
            if (!found) found = evalResearch(lab.id, Schemes[Scheme].FUNDAMENTALS3);
            if (getRealPower() < 1500 && !isResearched(Schemes[Scheme].FUNDAMENTALS3)) continue;
            if (!found) found = evalResearch(lab.id, Schemes[Scheme].FUNDAMENTALS4);
            if (getRealPower() < 1500 && !isResearched(Schemes[Scheme].FUNDAMENTALS4)) continue;
        }
        // finish upgrades
        if (!found) {
            found = evalResearch(lab.id, POWER_AND_RESEARCH_UPGRADES);
            if (!found) found = evalResearch(lab.id, KINETIC_ALLOYS);
  			if (!found) found = evalResearch(lab.id, Schemes[Scheme].BASIC_TECH);
			if (!found) found = evalResearch(lab.id, THERMAL_ALLOYS);
            if (!found) found = evalResearch(lab.id, VTOL_PADS_UPGRADES);
            if (!found) found = evalResearch(lab.id, Schemes[Scheme].ADVANCED_TECH);
            if (!found) found = evalResearch(lab.id, STRUCTURE_DEFENSE_UPGRADES);
        }
        // randomly complete the rest if flush
        if (!found && getRealPower() > 1500) {
            const reslist = enumResearch();
            if (reslist.length > 0) {
                const idx = Math.floor(Math.random() * reslist.length);
                pursueResearch(lab, reslist[idx].name);
            }
        }
    }
}

function isResearched(list) {
    if (!list.length) return true; // empty so done
    for (let item of list) {
        let itemsLeft = findResearch(item, me).length;
        if (itemsLeft && itemsLeft.length) return false; // not done
    }
    return true; // done
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

function checkResearchCompletion() {
    const resList = enumResearch();

    // Check if the Dragon body is obtained and there are no more research topics left
    if (componentAvailable("Body14SUP") && !resList.length) {
        researchDone = true; // Mark that all research is completed

        const labList = enumStruct(me, RES_LAB_STAT);

        for (let i = 0, l = labList.length; i < l; ++i) {
            const lab = labList[i];
            if (!structureIdle(lab)) continue; // Skip non-idle labs

            demolishThis(lab);
        }
    }
}
