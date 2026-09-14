// standard research
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

// contextual start tech
const SCAV_START_TECH = [
    "R-Vehicle-Body05", // cobra
    "R-Sys-MobileRepairTurret01",
    "R-Struc-PowerModuleMk1",
    "R-Struc-Research-Module",
    "R-Struc-Factory-Module",
    "R-Wpn-MG3Mk1", // heavy mg
    "R-Wpn-MG-Damage04",
];
const HOVER_START_TECH = [
    "R-Wpn-MG1Mk1",
    "R-Struc-PowerModuleMk1",
    "R-Struc-Research-Module",
    "R-Struc-Factory-Module",
    "R-Vehicle-Body05", // cobra
    "R-Vehicle-Prop-Hover",
    "R-Sys-MobileRepairTurret01",
    "R-Wpn-Cannon2Mk1",
    "R-Vehicle-Body11", // python
];
const AIR_START_TECH = [
    "R-Struc-PowerModuleMk1",
    "R-Struc-Factory-Module",
    "R-Struc-Research-Module",
    "R-Struc-VTOLFactory",
    "R-Vehicle-Prop-VTOL",
    "R-Struc-VTOLPad-Upgrade01",
    "R-Vehicle-Body05", // cobra
    "R-Defense-Sunburst",
    "R-Wpn-Rocket03-HvAT", // bunker buster
    "R-Struc-Materials01",
	"R-Defense-WallUpgrade03",
];
const SUPERTRANPORT_TECH = ["R-Cyborg-Transport"] // ["R-SuperTransport"];

const RESEARCH_UPGRADES = [
    POWER_AND_RESEARCH_UPGRADES,
    KINETIC_ALLOYS,
    Scheme.BASIC_TECH,
    THERMAL_ALLOYS,
    VTOL_PADS_UPGRADES,
    Scheme.ADVANCED_TECH,
    STRUCTURE_DEFENSE_UPGRADES,
];

//// perform research in tiered stages unless flush
// only assign one lab each run to prevent economic crash
function lookForResearch() { // timer
    if (researchDone) return false;
    if (baseUnderAttack > 2 && getRealPower() < 800) return false; // produce instead
    if (getRealPower() < MIN_RESEARCH_POWER) return false; // gets total power for the current tick not each run

    const labs = enumStruct(me, RESEARCH_LAB).filter(lab => lab.status === BUILT && structureIdle(lab));

    if (!labs || !labs.length || !labs[0].id) return;
    const lab = labs[0];

    const RESEARCH_TIERS = [
        isUltimateScavs ? SCAV_START_TECH : false,
        isVtolMap() ? AIR_START_TECH : false,
        isTransportMap() ? SUPERTRANPORT_TECH : false,
        isHoverMap() ? HOVER_START_TECH : false,
        Scheme.START_TECH, Scheme.FUNDAMENTALS1, Scheme.FUNDAMENTALS2, Scheme.FUNDAMENTALS3, Scheme.FUNDAMENTALS4
    ];
    //logFile("RESEARCH_TIERS: "+JNstr(RESEARCH_TIERS));

    // research each tier before moving to the next unless plenty of power
    for (tier of RESEARCH_TIERS) {
        if (!tier || !tier.length) continue;  // empty
        if (isTierResearched(tier)) continue; // completed
        if (evalResearch(lab, tier)) return true; // assigned
        if (getRealPower() > RESEARCH_TIER_THRESH) continue; // extra cash so keep labs busy

        return false; // finish tier first
    }

    if (isTierResearched(RESEARCH_TIERS[RESEARCH_TIERS.length - 1])) {
        // Only run this block if the very last tier is completed
        for (upgrade of shuffleArray(RESEARCH_UPGRADES)) {
            if (evalResearch(lab, upgrade)) {
                return true; // Successfully assigned an upgrade research
            }
        }
        // randomly complete the rest if flush
        if (getRealPower() > RESEARCH_TIER_THRESH) {
            const reslist = enumResearch();
            if (reslist.length > 0) {
                const idx = Math.floor(Math.random() * reslist.length);
                return pursueResearch(lab, reslist[idx].name);
            }
        }
    }
}

function isTierResearched(tier) {
    if (!tier || !tier.length) return true; // empty so done

    for (let item of tier) {
        if (filterUnusedResearch(item)) continue;

        if (findResearch(item, me).length === 0) {
            //logFile("research item done: "+JNstr(item));
            continue;
        }
        //logFile("research tier not done: "+JNstr(tier));
        return false; // tier not done
    }
    //logFile("research tier done: "+JNstr(tier));
    return true; // done
}

function filterUnusedResearch(item)
{
    if (!item || !item.length) return true; // empty so filter
    if (isHoverMap() || isVtolMap()) {
        if (item === "R-Vehicle-Prop-Halftracks" || item === "R-Vehicle-Prop-Tracks") return true; // skip tracks
        if (item.includes("Cyborg") && item !== "R-Cyborg-Transport") return true; // skip all cyborg except transport
    }
    if (isVtolMap()) {
        if (item.includes("Mortar")) return true; // skip all mortar
        if (item.includes("Cannon")) return true; // skip all cannon
        if (item.includes("QuadBof")) return true; // skip AA cannon
        if (item.includes("Howitzer")) return true; // skip Howitzer
    }
    return false; // don't filter
}

function evalResearch(lab, list) {
    if (!list) return false; // can't research

    if (!lab || !lab.id) return false; // can't research

    for (const item of list) {
        if (filterUnusedResearch(item)) continue;

        const research = getResearch(item);
        if (!research) { logFile("invalid research item: "+JNstr(item)); return false; } // invalid research
        //logFile("getResearch: "+JNstr(research));
        if (research && !research.done && pursueResearch(lab, item)) {
            //logFile("research assigned: "+JNstr(item));
            return true;
        }
    }

    return false; // nothing assigned
}

function checkResearchCompletion() {
    const resList = enumResearch();

    // Check if the Dragon body is obtained and there are no more research topics left
    if (componentAvailable(BODY_DRAGON) && !resList.length) {
        researchDone = true; // Mark that all research is completed

        const labList = enumStruct(me, RES_LAB_STAT);

        for (let i = 0, l = labList.length; i < l; ++i) {
            const lab = labList[i];
            if (!structureIdle(lab)) continue; // Skip non-idle labs

            demolishThis(lab);
        }
    }
}
