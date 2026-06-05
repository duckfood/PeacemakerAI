SENSOR_TOWERS = [
	"Sys-SensoTowerWS",
	"Sys-SensoTower01"
];

function findIdleTrucks()
{
	return enumGroup(baseBuilders).filter(dr => dr.action === 0);
}

// Demolish object.
function demolishThis(object)
{
	let success = false;
	const droidList = findIdleTrucks(object);

	for (let dr of droidList)
	{
		if (orderDroidObj(dr, DORDER_DEMOLISH, object))success = true;
	}

	return success;
}

//// cascaded if version working version
function grabTrucksAndBuild(structure, maxBlockingTiles=1, x=BASE.x, y=BASE.y, direction=[0, 90, 180, 270][random(3)])
{
    if (!isStructureAvailable(structure)) return false;
	const droids = findIdleTrucks();
    if (!droids.length) return false;
    const builder = droids[0];
    if (!builder?.id) return false;

	let locationSpiral = plotSquareSpiral(x, y, GROUP_SCAN_RADIUS*3);
	if (!locationSpiral || !locationSpiral.length) {
		log("grabTrucksAndBuild no spiral data");
		return false;
	}
	log("grabTrucksAndBuild structure: "+structure);
	//log("spiral data:"+JNstr(locationSpiral));
    let buildloc = pickStructLocation(builder, structure, x, y, maxBlockingTiles);
	log("buildloc orig: "+x+","+y+" "+JSON.stringify(buildloc));

    for (let count = 0; count < locationSpiral.length; count = count+4) {
		if (buildloc && buildloc.x !== undefined && buildloc.y !== undefined) {
			if (droidCanReach(builder, buildloc.x, buildloc.y)) {
				if (distBetweenTwoPoints(buildloc.x, buildloc.y, BASE.x, BASE.y) < GROUP_SCAN_RADIUS*3.5) {
					const line = distBetweenTwoPoints(builder.x, builder.y, buildloc.x, buildloc.y);
					log ("line: "+line);
					if (line > 2.5) {
						log("line is long enough to check");
						const path = findShortestPath(builder, buildloc, builder.propulsion, false);
						if (path && path.distance) {
							log ("path: "+path.distance);
							if (path.distance <= line * 3) {
								log("distance building at: "+x+"x"+y);
								return orderDroidsBuild(droids, structure, buildloc, direction);
							}
						} else {
							log("no path data so try next step");
						}
					} else {
						log("short line building at: "+x+"x"+y);
						return orderDroidsBuild(droids, structure, buildloc, direction);
					}
				} else {
					log("buildloc too far from base");
				}
			} else {
				log("unreachable buildloc");
			}
		} else {
			log("invalid buildloc");
		}

		let spirloc = locationSpiral[count];
		let spirx = spirloc[0];
		let spiry = spirloc[1];

		buildloc = pickStructLocation(builder, structure, spirx, spiry, maxBlockingTiles);
		log("buildloc spir: "+spirx+","+spiry+JSON.stringify(buildloc));
    }
    log("default building at: "+x+"x"+y);
    buildloc = pickStructLocation(builder, structure, x, y, maxBlockingTiles);
	return orderDroidsBuild(droids, structure, buildloc, direction);
}

function orderDroidsBuild(droids, structure, buildloc, direction)
{
	if (!droids || !droids.length) {
		log("orderDroidsBuild missing droids");
		return false;
	}
	if (!structure) {
		log("orderDroidsBuild missing structure");
		return false;
	}
	if (!buildloc) {
		log("orderDroidsBuild missing buildloc");
		return false;
	}

	let done = false;
	for (let i = 0; i < droids.length; i++)
	{
		let dr = droids[i];
		if (dr && dr.id > 0)
		{
			if (orderDroidBuild(dr, DORDER_BUILD, structure, buildloc.x, buildloc.y, direction)) done = true;
		}
	}
	return done;
}

// Help finish building some object that is close to base.
function checkLocalJobs()
{
	let trucks = findIdleTrucks();
	let freeTrucks = trucks.length;
	let success = false;
	let structlist = enumStruct(me).filter((obj) => (
		obj.status !== BUILT &&
		obj.stattype !== RESOURCE_EXTRACTOR &&
		obj.stattype !== DEFENSE &&
		distBetweenTwoPoints(BASE.x, BASE.y, obj.x, obj.y) < HELP_CONSTRUCT_AREA
	));

	if (freeTrucks && structlist.length)
	{
		structlist = structlist.sort(sortByDistToBase);
		for (let j = 0; j < freeTrucks; ++j)
		{
			if (orderDroidObj(trucks[j], DORDER_HELPBUILD, structlist[0]))
			{
				success = true;
			}
		}
	}

	return success;
}

function buildAntiAir(max=1)
{
	let antiAirs = enumStruct(me).filter((obj) => (obj.canHitAir === true && obj.canHitGround === false)).length;

	if (max > antiAirs) {
		for (let j = 0, s = Schemes[Scheme].AA_SITES.length; j < s; ++j)
		{
			if (grabTrucksAndBuild(Schemes[Scheme].AA_SITES[j], 1)) return true;
		}
	}
	return false;
}

// Base build scheme
function buildBasicBase()
{
	/// build a factory
	if (countStruct(FACTORY_STAT) === 0 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

	if (gameTime < 90000) {
		// build vtol support early if available
		if (relyOnVtols && countStruct(VTOL_FACTORY_STAT) === 0 && grabTrucksAndBuild(VTOL_FACTORY_STAT, 1)) return true;

		// build another factory if cyborgs are not available
		if ((isSeaMap || !isStructureAvailable(CYBORG_FACTORY_STAT)) && countStruct(FACTORY_STAT) < 2 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

		// build cyborg factory early if not relying on vtols
		if (!isSeaMap && !relyOnVtols && countStruct(CYBORG_FACTORY_STAT) < 1 && grabTrucksAndBuild(CYBORG_FACTORY_STAT, 1)) return true;
	}

	/// build a power generator
	if (countStruct(POW_GEN_STAT) < 1 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;

	// build hq early because player designs can't be made without it
	if (countStruct(PLAYER_HQ_STAT) === 0 && grabTrucksAndBuild(PLAYER_HQ_STAT, 1))	return true;

	/// build another power generator
	if (countStruct(POW_GEN_STAT) < 2 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;

	// build not more than two vtol pads
	if (relyOnVtols && buildVTOLpads(2)) return true;

	// build one base artillery defense
	if (buildBaseArtillery(1)) return true;

	/// build one lab
	if (!researchDone && countStruct(RES_LAB_STAT) === 0 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;

	/// if excess derricks build more generators
	if (countStruct(DERRICK_STAT)/4 > countStruct(POW_GEN_STAT) && grabTrucksAndBuild(POW_GEN_STAT, 1))	return true;

	return false;
}

function buildFundamentals()
{
	if (checkLocalJobs()) return true;
	if (buildBasicBase()) return true;
	if (upgradeGenerators()) return true;

	if (relyOnVtols) {
		if (buildVTOLpads()) return true;
		if (upgradeFactories(VTOL_FACTORY)) return true;
		if (upgradeFactories(FACTORY)) return true;
	} else {
		if (upgradeFactories(FACTORY)) return true;
		if (upgradeFactories(VTOL_FACTORY)) return true;
	}
	if (upgradeResearch()) return true;
	if (buildBaseArtillery(2)) return true;
	if (buildRepairFacs()) return true;

	buildFundamentals2(); // go on to the next level
}

function buildFundamentals2()
{
	if (factoryBuildOrder()) return true;
	if (buildResearchLabs()) return true;
	if (buildVTOLpads()) return true;
	if (getRealPower() < MIN_BUILD_POWER*2) return false;
	if (enemyHasVtol && buildAntiAir(1)) return true;
	if (getRealPower() < MIN_BUILD_POWER*3) return false;
	if (enemyHasVtol && buildAntiAir(2)) return true;
	if (buildLassat())  return true;
	if (countStruct(UPLINK_STAT) === 0 && grabTrucksAndBuild(UPLINK_STAT, 1)) return true;
	if (enemyHasVtol && buildAntiAir(3)) return true;

	checkResearchCompletion();
}

//Build factories. Attempts to build at least 1 of each factory.
function factoryBuildOrder() {
    const FAC_ORDER = [FACTORY_STAT, CYBORG_FACTORY_STAT, VTOL_FACTORY_STAT];
    let order = relyOnVtols ? [VTOL_FACTORY_STAT, FACTORY_STAT, CYBORG_FACTORY_STAT] : FAC_ORDER;

    // Determine the number of factories to build based on Derrick count
    const derrNum = countStruct(DERRICK_STAT);
    let numFactoriesToBuild = 1;
    if (derrNum >= 40) {
        numFactoriesToBuild = 3;
    } else if (derrNum >= 24) {
        numFactoriesToBuild = 2;
    }

    // Iterate over the factory order
    for (let i = 0; i < order.length && numFactoriesToBuild > 0; ++i) {
        const fac = order[i];

        // either VTOL or CYBORG factories at early game time
        if ((fac === VTOL_FACTORY_STAT && !relyOnVtols && gameTime < 300000) ||
            (fac === CYBORG_FACTORY_STAT && relyOnVtols && gameTime < 300000)) {
            return false;
        }

        // Check if the map is sea and skip CYBORG factory build
        if (!(fac === CYBORG_FACTORY_STAT && isSeaMap) && countStruct(fac) < numFactoriesToBuild && grabTrucksAndBuild(fac, 0)) {
            --numFactoriesToBuild;
        }
    }

    // Return true if all required factories were successfully built, otherwise false
    return numFactoriesToBuild === 0;
}

function buildResearchLabs() {
    if (researchDone) {
        return false;
    }

    const resCount = countStruct(RES_LAB_STAT);
    const maxBuildAmount = getStructureLimit(RES_LAB_STAT);

    // Determine the number of research labs to build based on Derrick count
    let amountToBuild = 4;
    const derrCount = countStruct(DERRICK_STAT);
    if (derrCount >= 40) {
        amountToBuild = 20;
    } else if (derrCount >= 24) {
        amountToBuild = 10;
    } else if (derrCount >= 14) {
        amountToBuild = 5;
    } else if (derrCount >= 9) {
        amountToBuild = 4;
    }

    // Calculate the effective maximum number of labs to build
    const amount = Math.min(resCount < amountToBuild ? amountToBuild : resCount, maxBuildAmount);

    // Attempt to build the required number of research labs
    if (resCount < amount && grabTrucksAndBuild(RES_LAB_STAT, 1)) {
        return true;
    }

    return false;
}

function buildVTOLpads(maxPads=0)
{
	if (!isStructureAvailable(VTOL_PAD_STAT)) return false;
	if (maxPads && countStruct(VTOL_PAD_STAT) >= maxPads) return false;

	let Labs = enumStruct(me, RES_LAB_STAT);
	let baseoils = enumStruct(me, RESOURCE_EXTRACTOR).filter((obj) => (distBetweenTwoPoints(obj.x, obj.y, BASE.x, BASE.y) < AVG_BASE_RADIUS));
	Labs = Labs.concat(baseoils);
	let vploc = returnRandInFirstFew(Labs, 8);

	//Build VTOL pads if needed
	let pad_mult = 0.7; // basic pad
	if (!findResearch("R-Struc-VTOLPad-Upgrade01")) pad_mult = 0.6;
	if (!findResearch("R-Struc-VTOLPad-Upgrade04")) pad_mult = 0.5;
	if (!findResearch("R-Struc-VTOLPad-Upgrade06")) pad_mult = 0.35;

	let needVtolPads = countStruct(VTOL_PAD_STAT) < pad_mult * groupSize(vtolGroup);

	if (needVtolPads && vploc && grabTrucksAndBuild(VTOL_PAD_STAT, 1, vploc.x, vploc.y)) return true;

	return false;
}

function buildRepairFacs()
{
	if (isStructureAvailable(REPAIR_FACILITY_STAT) && countStruct(REPAIR_FACILITY_STAT) < (countStruct(FACTORY_STAT) + countStruct(CYBORG_FACTORY_STAT))/4)
	{
		// get a location likely to be in front of the base
		let baseEdge = closestPointOnRectEdge({x: 0, y: 0, width: mapWidth, height: mapHeight}, {x: BASE.x, y: BASE.y});
		let buildloc = extendLine({x: baseEdge.x, y: baseEdge.y}, {x: BASE.x, y: BASE.y}, 10);
		return grabTrucksAndBuild(REPAIR_FACILITY_STAT, 8, buildloc.x, buildloc.y);
	}
	return false;
}

function buildLassat()
{
	if (isStructureAvailable(LASSAT_STAT))
	{
		// pick a random location near base which is not too near an existing building
		let buildloc = null;
		let count = 0;
		let center = lastBuildLoc;
		let trucks = findIdleTrucks();
		let spiral = plotSquareSpiral(BASE.x, BASE.y, GROUP_SCAN_RADIUS*3);
		for (let i; i < spiral.length; i = i+4)
		{
			let x = spiral[i][0];
			let y = spiral[i][1];
			let structs = enumRange(x, y, 6, me, true).filter((obj) => (obj.type === STRUCTURE));
			if (structs && structs.length) continue;

			buildloc = pickStructLocation(dr, LASSAT_STAT, x, y);
			if (buildloc && droidCanReach(trucks[0], buildloc.x, buildloc.y)) {
				return orderDroidsBuild(trucks, LASSAT_STAT, buildloc);
			}
		}
	}
	return false;
}
//// updated version
function checkResearchCompletion() {
    // Enumerate all available research topics
    const resList = enumResearch();

    // Check if the Dragon body is obtained and there are no more research topics left
    if (componentAvailable("Body14SUP") && !resList.length) {
        researchDone = true; // Mark that all research is completed

        // Enumerate all labs in the current base
        const labList = enumStruct(me, RES_LAB_STAT);

        // Iterate through each lab and attempt to demolish it if it's idle
        for (let i = 0, l = labList.length; i < l; ++i) {
            const lab = labList[i];
            if (!structureIdle(lab)) continue; // Skip non-idle labs

            demolishThis(lab);
        }
    }
}

//// original working version
function idleConstructor(droid)
{
	if (!droid || droid.id == null) return;
	if (droid.group == baseBuilders) return;
	if (droid.order !== 0 || droid.action !== 0) return;

	if (ThrottleThis("truck"+droid.id+"throttle", 5000)) return;
	const dr = droid;

	// build on nearby seen oil
	let nearbyoil = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS, me, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
	if (nearbyoil && nearbyoil.length > 0 ) // && tileIsBurning(nearbyoil[0].x, nearbyoil[0].y) === false
	{
		let enemies = getHostilesNear(nearbyoil[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0])
		{
			orderDroidBuild(droid, DORDER_BUILD, RESOURCE_EXTRACTOR, nearbyoil[0].x, nearbyoil[0].y);
			orderLocations.set(droid.id, {x: nearbyoil[0].x, y: nearbyoil[0].y, enemies: false});
			logObj(droid, "idle truck building on nearby oil");
			return true;
		}
	}

	// move to random nearby un-owned oil if likely safe
	let notMyOil = getNotMyOil().sort((obj1, obj2) => {
				let dist1 = distBetweenTwoPoints(dr.x, dr.y, obj1.x, obj1.y);
				let dist2 = distBetweenTwoPoints(dr.x, dr.y, obj2.x, obj2.y);
				return (dist1 - dist2); });

	if (notMyOil && notMyOil.length)
	{
		let nmoil = returnRandInFirstFew(notMyOil);
		if (distBetweenTwoPoints(dr.x, dr.y, nmoil.x, nmoil.y) < 4) return;
		let enemies = getHostilesNear(nmoil, GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0])
		{
			orderDroidLoc(droid, DORDER_MOVE, nmoil.x, nmoil.y);
			logObj(droid,"idle truck move to notMyOil: "+nmoil.x+"x"+nmoil.y);
			orderLocations.set(dr.id, {x: nmoil.x, y: nmoil.y, enemies: false});
			return true;
		}
	}

	// scout to unfinished defense
	let unfinishedDefenses = enumStruct(me, DEFENSE).filter((obj) => (obj.stattype === DEFENSE && obj.status !== BUILT));
	if (unfinishedDefenses && unfinishedDefenses.length > 0)
	{
		let enemies = getHostilesNear(unfinishedDefenses[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0])
		{
			orderDroidLoc(droid, DORDER_SCOUT, unfinishedDefenses[0].x, unfinishedDefenses[0].y);
			logObj(droid,"idle truck scout unfinishedDefenses: "+unfinishedDefenses[0].x+"x"+unfinishedDefenses[0].y);
			orderLocations.set(dr.id, {x: unfinishedDefenses[0].x, y: unfinishedDefenses[0].y, enemies: false});
			return true;
		}
	}

	//scout to damaged defense farthest from base first
	let damagedDefenses = enumStruct(me, DEFENSE).filter((obj) => (obj.health < 70 && obj.stattype === DEFENSE && obj.status === BUILT))
		.sort(sortByDistToBase).reverse();
	if (damagedDefenses && damagedDefenses.length > 0)
	{
		let enemies = getHostilesNear(damagedDefenses[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0])
		{
			orderDroidLoc(droid, DORDER_SCOUT, damagedDefenses[0].x, damagedDefenses[0].y);
			logObj(droid,"idle truck scout damagedDefenses: "+damagedDefenses[0].x+"x"+damagedDefenses[0].y);
			orderLocations.set(dr.id, {x: damagedDefenses[0].x, y: damagedDefenses[0].y, enemies: false});
			return true;
		}
	}

	// scout to nearby finished defense
	let defenses = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS*3, me, true).filter((obj) => (obj.stattype === DEFENSE && obj.status === BUILT));
	if (defenses && defenses.length > 0)
	{
		let enemies = getHostilesNear(defenses[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0])
		{
			if (distBetweenTwoPoints(droid.x, droid.y, defenses[0].x, defenses[0].y) > 4)
			{
				orderDroidLoc(droid, DORDER_SCOUT, defenses[0].x, defenses[0].y);
				logObj(droid,"idle constructor scout defenses: "+defenses[0].x+"x"+defenses[0].y);
				orderLocations.set(dr.id, {x: defenses[0].x, y: defenses[0].y, enemies: false});
			}
			return true;
		}
	}
	else
	{
		// maybe put idle oil truck on patrol
		logObj(droid,"idle oilbuilder nothing safe to do");
		return false;
	}
}

function upgradeFactories(type)
{
	if (!type) return false;
	if (!isStructureAvailable(FAC_MODULE_STAT)) return false;
	let facs = enumStruct(me, type);
	for (let fac of facs) {
		if (fac.modules < 2) {
			let trucks = findIdleTrucks();
			for (let truck of trucks) {
				orderDroidBuild(truck, DORDER_BUILD, FAC_MODULE_STAT, fac.x, fac.y)
			}
		}
	}
	return false;
}
function upgradeGenerators()
{
	if (!isStructureAvailable(POW_MODULE_STAT)) return false;
	let gens = enumStruct(me, POWER_GEN);
	for (let gen of gens) {
		if (gen.modules < 1) {
			let trucks = findIdleTrucks();
			for (let truck of trucks) {
				orderDroidBuild(truck, DORDER_BUILD, POW_MODULE_STAT, gen.x, gen.y)
			}
		}
	}
	return false;
}
function upgradeResearch()
{
	if (!isStructureAvailable(RES_MODULE_STAT)) return false;
	let labs = enumStruct(me, RESEARCH_LAB);
	for (let lab of labs) {
		if (lab.modules < 1) {
			let trucks = findIdleTrucks();
			for (let truck of trucks) {
				orderDroidBuild(truck, DORDER_BUILD, RES_MODULE_STAT, lab.x, lab.y)
			}
		}
	}
	return false;
}

function buildBaseArtillery(max)
{
	if (max == undefined) max = 1;
	let defenses = enumStruct(me, DEFENSE).filter((obj) => (obj.hasIndirect === true) );
	if (defenses.length >= max) return false;

	let bestDefense = false;
	for (let i = 0, t = Schemes[Scheme].ARTILLERY_DEFENSES.length; i < t; ++i)
	{
		if (isStructureAvailable(Schemes[Scheme].ARTILLERY_DEFENSES[i]))
		{
			bestDefense = Schemes[Scheme].ARTILLERY_DEFENSES[i];
			break;
		}
	}
	if (!bestDefense) return false;

	return grabTrucksAndBuild(bestDefense, 0, BASE.x, BASE.y);
}

function buildBaseOilDefenses()
{
	let baseoils = enumStruct(me, RESOURCE_EXTRACTOR).filter((obj) => (distBetweenTwoPoints(obj.x, obj.y, BASE.x, BASE.y) < AVG_BASE_RADIUS));
	for (let oil of baseoils) {
		let covered = false;
		let oildefenses = enumRange(oil.x, oil.y, GROUP_SCAN_RADIUS*3, me).filter((obj) => (obj.type === STRUCTURE && obj.stattype === DEFENSE));
		for (let defense of oildefenses){
			if (defense.range/128 > distBetweenTwoPoints(oil.x, oil.y, defense.x, defense.y)) {
				covered = true;
			}
		}
		if (covered) continue;
		else {
			let bestDefense = false;
			for (let i = 0, t = Schemes[Scheme].STANDARD_DEFENSES.length; i < t; ++i)
			{
				if (isStructureAvailable(Schemes[Scheme].STANDARD_DEFENSES[i]))
				{
					bestDefense = Schemes[Scheme].STANDARD_DEFENSES[i];
					break;
				}
			}
			if (!bestDefense) return false;

			let oilEdge = closestPointOnRectEdge({x: 0, y: 0, width: mapWidth, height: mapHeight}, {x: oil.x, y: oil.y});
			let buildloc = extendLine({x: oilEdge.x, y: oilEdge.y}, {x: oil.x, y: oil.y}, 2);
			if (buildloc) return grabTrucksAndBuild(bestDefense, 0, buildloc.x, buildloc.y);
		}
	}
	return false;
}

//// still enumerates free oil wells
function lookForOil() {

    const MAX_DIST = Infinity;
    const droids = enumGroup(oilBuilders).filter((obj) => (obj.order === 0 || obj.action === 0 || obj.order === DORDER_HELPBUILD));
    const oils = enumFeature(ALL_PLAYERS, OIL_RES_STAT).sort(sortByDistToBase);

    let bestDroid = null;
    let bestDist = MAX_DIST;
    for (let oil of oils) {
        const unsafe = getHostilesNear(oil, GROUP_SCAN_RADIUS);
		if (unsafe.length) log("unsafe oil: "+oil.x+","+oil.y+" "+unsafe.length);
        if (unsafe.length) continue;

        for (let droid of droids) {
            if (droid.busy) continue;

            const dist = distBetweenTwoPoints(droid.x, droid.y, oil.x, oil.y);
            if (dist >= bestDist) continue;
            if (!droidCanReach(droid, oil.x, oil.y)) continue;

            bestDroid = droid;
            bestDist = dist;
        }

        if (bestDroid) {
            bestDroid.busy = true;
            orderDroidBuild(bestDroid, DORDER_BUILD, DERRICK_STAT, oil.x, oil.y);
            orderLocations.set(bestDroid.id, {x: oil.x, y: oil.y, enemies: false});
            return true;
        }
    }
    return false;
}

