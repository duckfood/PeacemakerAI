//// perform research in tiered stages unless flush
// only assign one lab each run to prevent economic crash
// fallback from tiers to prioritized research
function lookForResearch() { // timer
    if (!PeacemakerAIenable) return false;
    if (researchDone) return false;
    if (baseUnderAttack > 2 && getRealPower() < 800) return false; // produce instead
    if (getRealPower() < MIN_RESEARCH_POWER) return false; // gets total power for the current tick not each run

    const labs = enumStruct(me, RESEARCH_LAB).filter(lab => lab.status === BUILT && structureIdle(lab));

    if (!labs || !labs.length || !labs[0].id) return;
    const lab = labs[0];

    const RESEARCH_TIERS = getResearchTiers();
    //logFile("RESEARCH_TIERS:", RESEARCH_TIERS);
    if (lookForResearch.tiersValid === undefined) {
        lookForResearch.tiersValid = isResearchValid(RESEARCH_TIERS);
        if (!lookForResearch.tiersValid) logFile("lookForResearch scheme tiers not valid");
    }

    // research each tier before moving to the next unless plenty of power
    if (lookForResearch.tiersValid) {
        // transporters do not get researched when in tiers
        if (isTransportMap() && isComponentProducible(PROP_VTOL)) {
            if (StatsMap.has(TRANSPORT_TECH) && pursueResearch(lab, TRANSPORT_TECH)) return true;
        }
        for (let tier of RESEARCH_TIERS) {
            if (!tier || !tier.length) continue;  // empty
            if (isTierResearched(tier)) continue; // completed
            if (evalResearch(lab, tier)) return true; // assigned
            if (getRealPower() > RESEARCH_TIER_THRESH) continue; // extra cash so keep labs busy

            return false; // finish tier first
        }
        // finish important upgrades
        for (let upgrade of shuffleArray(RESEARCH_UPGRADES)) {
            if (evalResearch(lab, upgrade)) return true;
        }
        // all scheme research done continue if extra power
        return getRealPower() > RESEARCH_TIER_THRESH && researchEverything(lab);
    }
    // scheme tiered research not valid
    return researchEverything(lab);
}

function isResearchValid(tiers)
{
    if (!tiers || !tiers.length) return false; // no tiers is invalid

    if (Array.isArray(tiers)) { // maybe tiers
        for (let tier of tiers) {
            if (!tier || !tier.length) continue; // empty tier is valid
            for (let item of tier) {
                if (!item || !item.length) return false; // empty item is invalid
                if (!StatsMap.has(item)) return false; // item not in StatsMap is invalid
                if (!getResearch(item, me)) return false; // no info about item is invalid
            }
        }
    } else { // maybe single item
        if (!findReseach(tiers, me)) return false;
    }

    return true;
}

function getResearchPriority(itemName) {
    if (!itemName) return 0;
    const name = itemName.toLowerCase();
    let highestWeight = 0;

    // Check all known topics against the item name
    for (const [topic, weight] of Object.entries(RESEARCH_PRIORITIES)) {
        if (name.includes(topic)) {
            if (weight > highestWeight) highestWeight = weight;
        }
    }
    return highestWeight;
}

function researchEverything(lab) {
    if (!lab || !lab.id) return false;

    const reslist = enumResearch(); // Get list of available research
    if (!reslist || reslist.length === 0) return false;

    // Sort the list: Highest priority weight first
    const sortedList = [...reslist].sort((a, b) => {
        return getResearchPriority(b.name) - getResearchPriority(a.name);
    });

    // try to research one of the first 2
    let item = returnRandInFirstFew(sortedList, 2);
    if (item && item.name && pursueResearch(lab, item.name)) {
        return true;
    }

    return false;
}

function getResearchTiers()
{
    return [
        isVtolMap() ? Scheme.AIR_START_TECH : false,
        isHoverMap() ? Scheme.HOVER_START_TECH : false,
        Scheme.START_TECH,
        Scheme.FUNDAMENTALS1,
        Scheme.FUNDAMENTALS2,
        Scheme.FUNDAMENTALS3,
        Scheme.FUNDAMENTALS4,
    ];
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
        return false;
    }
    //logFile("research tier done: "+JNstr(tier));
    return true;
}

function filterUnusedResearch(item)
{
    if (!item || !item.length) return true; // empty so skip
    if (item.includes("Transport")) return false; // research transports

    if (isHoverMap() || isVtolMap()) {
        if (item === "R-Vehicle-Prop-Halftracks" || item === "R-Vehicle-Prop-Tracks") return true; // skip tracks
        if (item.includes("Cyborg")) return true; // skip all cyborg
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
        if (research && !research.done && pursueResearch(lab, item)) {
            //logFile("research assigned: "+JNstr(item));
            return true;
        }
    }

    return false; // nothing assigned
}

function checkResearchCompletion() {
    const resList = enumResearch();

    // Check if the BODY_VENGEANCE is obtained and there are no more research topics left
    if (isComponentProducible(BODY_VENGEANCE) && !resList.length) {
        researchDone = true; // Mark that all research is completed

        const labList = enumStruct(me, RES_LAB_STAT);

        for (let i = 0, l = labList.length; i < l; ++i) {
            const lab = labList[i];
            if (!structureIdle(lab)) continue; // Skip non-idle labs

            demolishThis(lab);
        }
    }
}
