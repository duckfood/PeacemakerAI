const SENSOR_TOWERS = [ "Sys-SensoTowerWS", "Sys-SensoTower01" ];

function findIdleTrucks()
{
	// enumerate the basebuilders group list and filter to select inactive
	return enumGroup(baseBuilders).filter(dr => dr.action === 0);
}

// Demolish object.
function demolishThis(object)
{
	let success = false;
	const droidList = findIdleTrucks(object);

	for (let dr of droidList) {
		if (orderDroidObj(dr, DORDER_DEMOLISH, object)) success = true;
	}

	return success;
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

// standard base build scheme
function buildBasicBase()
{
	// build a factory
	if (countStruct(FACTORY_STAT) === 0 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

	if (gameTime < 240000) {
		// build another factory if cyborgs are not available
		if ((isSeaMap || !isStructureAvailable(CYBORG_FACTORY_STAT)) && countStruct(FACTORY_STAT) < 2 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

		// build another factory if cyborgs are not available and oil rich map
		let oils = oilResourceStore.query({isReachable: true}).length;
		if ((isSeaMap || !isStructureAvailable(CYBORG_FACTORY_STAT)) && oils > 40 && countStruct(FACTORY_STAT) < 3 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

		// build two labs early if no tech
		if (!researchDone && !componentAvailable("MG1Mk1") && countStruct(RES_LAB_STAT) < 2 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;

		// build cyborg factory early at start
		if (!isSeaMap && countStruct(CYBORG_FACTORY_STAT) < 1 && grabTrucksAndBuild(CYBORG_FACTORY_STAT, 1)) return true;
	}

	// build a power generator and upgrade
	if (countStruct(POW_GEN_STAT) < 1 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;

	// make sure generators get upgraded asap
	if (upgradeGenerators()) return true;

	// build hq early because player designs can't be made without it
	if (countStruct(PLAYER_HQ_STAT) === 0 && grabTrucksAndBuild(PLAYER_HQ_STAT, 1))	return true;

	// build another power generator
	if (countStruct(POW_GEN_STAT) < 2 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;

	/// build one lab
	if (!researchDone && countStruct(RES_LAB_STAT) === 0 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;

	return false;
}

function buildFundamentals() { queue("buildFundamentalsQ"); } // timer
function buildFundamentalsQ()
{
	if (checkLocalJobs()) return true; // help finish jobs
	if (buildBasicBase()) return true; // only the basics
	if (upgradeFactories(FACTORY)) return true;

	if (countStruct(DERRICK_STAT)/4 > countStruct(POW_GEN_STAT) && grabTrucksAndBuild(POW_GEN_STAT, 1))	return true;

	if (enemyHasVtol && buildAntiAir(1)) return true;
	if (buildVTOLpads()) return true; // build vtol pads before upgrading vtol facs
	if (upgradeFactories(VTOL_FACTORY)) return true;

	if (upgradeResearch()) return true;
	if (factoryBuildOrder()) return true;
	if (buildResearchLabs()) return true;
	if (buildRepairFacs()) return true;

	if (getRealPower() > MIN_BUILD_POWER*3) {
		if (buildLassat()) return true;
		if (enemyHasVtol && buildAntiAir(2)) return true;
	}

	if (getRealPower() > MIN_BUILD_POWER*7) {
		if (enemyHasVtol && buildAntiAir(3)) return true;
		if (countStruct(UPLINK_STAT) === 0 && grabTrucksAndBuild(UPLINK_STAT, 1)) return true;
	}

	// build with excess power
	if (getRealPower() > MIN_BUILD_POWER*15) {
		if (enemyHasVtol && buildAntiAir(4)) return true;
		if (buildBaseOilDefenses(1)) return true;
	}

	if (getRealPower() > MIN_BUILD_POWER*50) {
		if (enemyHasVtol && buildAntiAir(6)) return true;
		if (buildBaseArtillery(6)) return true;
		if (enemyHasVtol && buildAntiAir(8)) return true;
		if (buildBaseArtillery(8)) return true;
		if (enemyHasVtol && buildAntiAir(12)) return true;
		if (buildBaseArtillery(12)) return true;
	}

	checkResearchCompletion();
}

//// used to build core base buildings but not accessory buildings
// cascaded if working version
function grabTrucksAndBuild(structure, maxBlocking=1, x=BASE.x+random(6)-random(6), y=BASE.y+random(6)-random(6), direction=[0, 90, 180, 270][random(3)])
{
    if (!isStructureAvailable(structure)) return false;
	const droids = findIdleTrucks();
    if (!droids.length) return false;
    const builder = droids[0];
    if (!builder?.id) return false;

	// plot a spiral to help efficiently locate building sites
	let locationSpiral = plotSquareSpiral(x, y, GROUP_SCAN_RADIUS*3);
	if (!locationSpiral || !locationSpiral.length) {
		log("ERROR grabTrucksAndBuild no spiral data");
		return false;
	}
	log("grabTrucksAndBuild structure: "+structure);

	// try the original location first
    let buildloc = pickStructLocation(builder, structure, x, y, maxBlocking);
	log("buildloc orig: "+x+","+y+" "+JSON.stringify(buildloc));

	// iterate through location spiral skipping 4 tiles in the spiral until a suitable site is found
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
							if (path.distance <= line * 2.5) {
								log("distance building at: "+x+"x"+y);
								return orderTrucksBuild(structure, buildloc, maxBlocking, direction);
							}
						} else {
							log("no path data so try next step");
						}
					} else {
						log("short line building at: "+x+"x"+y);
						return orderTrucksBuild(structure, buildloc, maxBlocking, direction);
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

		buildloc = pickStructLocation(builder, structure, spirx, spiry, maxBlocking);
		log("buildloc spir: "+spirx+","+spiry+JSON.stringify(buildloc));
    }
    log("default building at: "+x+"x"+y);
    buildloc = pickStructLocation(builder, structure, x, y, maxBlocking);
	return orderTrucksBuild(droids, structure, buildloc, direction);
}

//// used to build accessory buildings and used by grabTrucksAndBuild
function orderTrucksBuild(structure, site, maxBlocking=1, direction=0)
{
	if (!structure || !structure.length) {
		logTrace("WARNING orderTrucksBuild missing structure");
		return false;
	}
	if (!site || site.x === undefined || site.y === undefined) {
		logTrace("WARNING orderTrucksBuild missing site");
		return false;
	}

	let trucks = findIdleTrucks();
	if (!trucks || !trucks.length || !trucks[0].id) return false;
	let buildloc = pickStructLocation(trucks[0], structure, site.x, site.y, maxBlocking);
	if (!buildloc || buildloc.x == undefined || buildloc.y == undefined) return false;

	log("building structure "+JNstr(structure)+" at: "+JNstr(buildloc));
	let done = false;
	for (let dr of trucks)
	{
		if (dr && dr.id && droidCanReach(dr, buildloc.x, buildloc.y)) {
			if (orderDroidBuild(dr, DORDER_BUILD, structure, buildloc.x, buildloc.y, direction)) done = true;
		}
	}
	return done;
}

//// build factories. Attempts to build at least 1 of each factory.
function factoryBuildOrder() {
    const FAC_ORDER = [FACTORY_STAT, CYBORG_FACTORY_STAT, VTOL_FACTORY_STAT];
    let order = relyOnVtols ? [VTOL_FACTORY_STAT, CYBORG_FACTORY_STAT, FACTORY_STAT] : FAC_ORDER;

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

        // Check if the map is sea and skip CYBORG factory build
        if (!(fac === CYBORG_FACTORY_STAT && isSeaMap) &&
			!(fac === VTOL_FACTORY_STAT && groupSize(attackGroup) < MIN_ATTACK_GSIZE * 3) &&
			countStruct(fac) < numFactoriesToBuild && grabTrucksAndBuild(fac, 0)) --numFactoriesToBuild;
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
    let amountToBuild = 3;
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

function buildVTOLpads()
{
	if (getRealPower() < MIN_BUILD_POWER/2) return false;
	if (!isStructureAvailable(VTOL_PAD_STAT)) return false;
	if (!countStruct(VTOL_FACTORY_STAT)) return false;

	let Labs = enumStruct(me, RES_LAB_STAT);
	let baseoils = enumStruct(me, RESOURCE_EXTRACTOR).filter((obj) => (distBetweenTwoPoints(obj.x, obj.y, BASE.x, BASE.y) < AVG_BASE_RADIUS));
	Labs = Labs.concat(baseoils);
	let vploc = returnRandInFirstFew(Labs, 8);

	//Build VTOL pads if needed
	let pad_mult = 0.7; // basic pad
	if (!findResearch("R-Struc-VTOLPad-Upgrade01")) pad_mult = 0.6;
	if (!findResearch("R-Struc-VTOLPad-Upgrade04")) pad_mult = 0.45;
	if (!findResearch("R-Struc-VTOLPad-Upgrade06")) pad_mult = 0.3;

	let needVtolPads = countStruct(VTOL_PAD_STAT) < pad_mult * (groupSize(vtolGroup) + 0.1); // boost to build first pad
	if (needVtolPads && vploc) {
		return orderTrucksBuild(VTOL_PAD_STAT, vploc);
	}
}

function buildRepairFacs()
{
	// pre-calculate path
	if (!buildRepairFacs._path) {
		let notme;
		for (let i = 0; i < maxPlayers; i++) {
			if (startPositions[i] === me) continue; // not our base
			if (allianceExistsBetween(me, i)) continue; // not allied base
			notme = i; // first non-allied base
			break;
		}
		buildRepairFacs._path = findShortestPath(startPositions[me], startPositions[notme], PROP_HOVER, false);
	}
	if (!isStructureAvailable(REPAIR_FACILITY_STAT)) return false;
	if (getRealPower() < MIN_BUILD_POWER/2) return false;

	if (countStruct(REPAIR_FACILITY_STAT) < (countStruct(FACTORY_STAT) + countStruct(CYBORG_FACTORY_STAT))/4) {
		// plot a path from our base to a hostile base and build on it
		if (!buildRepairFacs._path) {
			log("WARNING buildRepairFacs no path");
			// use alternate method: plot a line from edge past base
			let baseEdge = closestPointOnRectEdge({x: 0, y: 0, width: mapWidth, height: mapHeight}, {x: BASE.x, y: BASE.y});
			let site = extendLine(baseEdge, BASE, 10);
			return grabTrucksAndBuild(REPAIR_FACILITY_STAT, 2, site.x, site.y);
		}
		// build on path near base perimeter
		let randomPathStep = randomBetween(10, 20);
		return grabTrucksAndBuild(REPAIR_FACILITY_STAT, 8, buildRepairFacs._path.path[randomPathStep][0], buildRepairFacs._path.path[randomPathStep][1]);
	}
	return false;
}

function buildLassat() {
    if (isStructureAvailable(LASSAT_STAT)) {
        if (getRealPower() < 0) return false;

		// find a location likely to be behind base
		let baseEdge = closestPointOnRectEdge({x: 0, y: 0, width: mapWidth, height: mapHeight}, {x: BASE.x, y: BASE.y});
		let buildArea = extendLine(baseEdge, BASE, 10, 'before');

        let spiral = plotSquareSpiral(buildArea.x+random(6)-random(6), buildArea.y+random(6)-random(6), GROUP_SCAN_RADIUS * 3);
        if (!spiral || spiral.length < 20) {
            log("ERROR buildLassat not valid spiral");
            return false;
        }
		let trucks = findIdleTrucks();
		if (!trucks || !trucks.length || !trucks[0].id) return false;

		let buildloc;
        for (let i = 0; i < spiral.length; i += 4) {
            let x = spiral[i][0];
            let y = spiral[i][1];
			if (!droidCanReach(trucks[0], x, y)) continue;
            log(`buildLassat trying to build at ${x},${y}`);
            buildloc = pickStructLocation(trucks[0], LASSAT_STAT, x, y);
			let structs = enumRange(buildloc.x, buildloc.y, 8, me, true).filter((obj) => obj.type === STRUCTURE);
			if (structs.length > 0) continue;

            if (buildloc && droidCanReach(trucks[0], buildloc.x, buildloc.y)) {
                log(`buildLassat building at ${buildloc.x},${buildloc.y}`);
                return orderTrucksBuild(LASSAT_STAT, buildloc);
            }
        }
        log("buildLassat no suitable place to build found.");
		buildloc = pickStructLocation(trucks[0], LASSAT_STAT, BASE.x, BASE.y);
		return orderTrucksBuild(LASSAT_STAT, buildloc); // just build it wherever
    }
    return false;
}

function buildBaseArtillery(max=1)
{
	if (getRealPower() < MIN_BUILD_POWER) return false;
	let defenses = enumStruct(me, DEFENSE).filter((obj) => (obj.hasIndirect === true));
	if (defenses.length >= max) return false;
	let bestDefense = firstAvailableStructure(Schemes[Scheme].ARTILLERY_DEFENSES);
	if (!bestDefense) return false;

	return orderTrucksBuild(bestDefense, BASE, 1);
}

function buildBaseOilDefenses(max=1)
{
	let baseoils = enumStruct(me, RESOURCE_EXTRACTOR).filter((obj) => (distBetweenTwoPoints(obj.x, obj.y, BASE.x, BASE.y) < AVG_BASE_RADIUS));
	for (let oil of baseoils) {
		let covered = 0;
		let oildefenses = enumRange(oil.x, oil.y, GROUP_SCAN_RADIUS*3, me).filter((obj) => (obj.type === STRUCTURE && obj.stattype === DEFENSE));
		for (let defense of oildefenses){
			if (defense.range/128 > distBetweenTwoPoints(oil.x, oil.y, defense.x, defense.y)) {
				covered++;
			}
		}
		if (covered >= max) continue;
		else {
			let bestDefense = firstAvailableStructure(Schemes[Scheme].STANDARD_DEFENSES);
			if (!bestDefense) return false;

			let oilEdge = closestPointOnRectEdge({x: 0, y: 0, width: mapWidth, height: mapHeight}, {x: oil.x, y: oil.y});
			let site = extendLine(oilEdge, oil, 2);
			return orderTrucksBuild(bestDefense, site);
		}
	}
	return false;
}

function buildOilDefenses(max=1)
{
	let baseoils = enumStruct(me, RESOURCE_EXTRACTOR).filter((obj) => (distBetweenTwoPoints(obj.x, obj.y, BASE.x, BASE.y) < AVG_BASE_RADIUS));
	for (let oil of baseoils) {
		let covered = 0;
		let oildefenses = enumRange(oil.x, oil.y, GROUP_SCAN_RADIUS*3, me).filter((obj) => (obj.type === STRUCTURE && obj.stattype === DEFENSE));
		for (let defense of oildefenses){
			if (defense.range/128 > distBetweenTwoPoints(oil.x, oil.y, defense.x, defense.y)) {
				covered++;
			}
		}
		if (covered >= max) continue;
		else {
			let bestDefense = firstAvailableStructure(Schemes[Scheme].STANDARD_DEFENSES);
			if (!bestDefense) return false;

			let oilEdge = closestPointOnRectEdge({x: 0, y: 0, width: mapWidth, height: mapHeight}, {x: oil.x, y: oil.y});
			let site = extendLine(oilEdge, oil, 2);

			return orderTrucksBuild(bestDefense, site);
		}
	}
	return false;
}

function buildAntiAir(max=1)
{
	let antiAirs = seenStore.query({ player: me, type: STRUCTURE, isAA: true });

	if (max > antiAirs) {
		for (let j = 0, s = Schemes[Scheme].AA_SITES.length; j < s; ++j)
		{
			if (grabTrucksAndBuild(Schemes[Scheme].AA_SITES[j], 1)) return true;
		}
	}
	return false;
}

//// separate upgrade functions for build flexibility
function upgradeFactories(type)
{
	if (!type) return false;
	if (!isStructureAvailable(FAC_MODULE_STAT)) return false;
	if (getRealPower() < MIN_BUILD_POWER) return false;

	let facs = seenStore.query({ player: me, type: STRUCTURE, stattype: type });
	for (let struct of facs) {
		if (struct.modules < 2) {
			return orderTrucksBuild(FAC_MODULE_STAT, struct);
		}
	}
}
function upgradeGenerators()
{
	if (!isStructureAvailable(POW_MODULE_STAT)) return false;

	let gens = seenStore.query({ player: me, type: STRUCTURE, stattype: POWER_GEN });
	for (let struct of gens) {
		if (struct.modules < 1) {
			return orderTrucksBuild(POW_MODULE_STAT, struct);
		}
	}
}
function upgradeResearch()
{
	if (!isStructureAvailable(RES_MODULE_STAT)) return false;
	if (getRealPower() < MIN_BUILD_POWER) return false;

	let labs = seenStore.query({ player: me, type: STRUCTURE, stattype: RESEARCH_LAB });
	for (let struct of labs) {
		if (struct.modules < 1) {
			return orderTrucksBuild(RES_MODULE_STAT, struct);
		}
	}
}

//// assigns trucks to closet safe notMyOil() with pre-computation, state, and PQ
function assignTrucksToOil() { queue("assignTrucksToOilQ"); } // timer
function assignTrucksToOilQ() {
    // Step 1: Filter builders based on specified conditions (omitted as per request)
    const builders = enumGroup(oilBuilders).filter((obj) =>
        (obj.order === 0 || obj.action === 0 || obj.order === DORDER_HELPBUILD));

    if (!builders.length) return false;

    // Step 2: Identify safe sites by filtering out hostile-adjacent oil sites
    const sites = getNotMyOil();
    const safeSites = sites.filter(site => {
        const alliedBuilders = seenStore.findNear(site, GROUP_SCAN_RADIUS, {isAllied: true, droidType: DROID_CONSTRUCT});
        if (alliedBuilders.length > 0) return false; // builder already present

        const hostileCount = getHostilesNear(site, GROUP_SCAN_RADIUS).length;
        return hostileCount === 0;
    });

    if (!safeSites.length) return false;

    const assignments = [];
    let availableSites = [...safeSites];

    // Step 3: Precompute distances from each builder to all safe sites (omitted as per request)
    const builderDistances = builders.map(builder => {
        const distances = availableSites.map(site => {
            const dist = distBetweenTwoPoints(builder.x, builder.y, site.x, site.y);
            return dist ? dist : Infinity;
        });
        return { builder, distances };
    });

    // Step 4: Use a priority queue to sort builders by their minimum distance to any safe site (omitted as per request)
    const priorityQueue = new ultimate_PriorityQueue();
    builderDistances.forEach(({ builder, distances }) => {
        const minDistance = Math.min(...distances);
        priorityQueue.enqueue({ builder, distances }, minDistance);
    });

    // Step 5: Assign each builder to the closest available safe site
    while (!priorityQueue.isEmpty()) {
        const { builder, distances } = priorityQueue.dequeue();
        if (!builder || !builder.id) continue;

        let bestSite = null;
        let minDistance = Infinity;
        for (let i = 0; i < availableSites.length; i++) {
            const site = availableSites[i];
            const distance = distances[i];
            if (distance < minDistance && droidCanReach(builder, site.x, site.y)) {
                minDistance = distance;
                bestSite = site;
            }
        }

        if (!bestSite || !bestSite.id) continue;

        // Check if the previous assignment has expired
        const lastAssignmentTime = oilAssignments.get(bestSite.id) || -Infinity;
        if (gameTime - lastAssignmentTime > 30000) {
            assignments.push({ builder, site: bestSite });
            availableSites = availableSites.filter(site => site !== bestSite);
			oilAssignments.set(bestSite.id, gameTime);
			oilAssignments.set(builder.id, bestSite.id);
        }
    }

    // Step 6: Execute the assignments and log each successful assignment
    for (const assignment of assignments) {
        orderDroidLoc(assignment.builder, DORDER_MOVE, assignment.site.x, assignment.site.y);
        orderLocations.set(assignment.builder.id, { x: assignment.site.x, y: assignment.site.y, enemies: false });
        logObj(assignment.builder, `truck assigned to oil at ${assignment.site.x},${assignment.site.y}`);
    }

    return assignments.length > 0;
}

//// reduced original working version
function idleConstructor(droid)
{
	if (!droid || droid.id == null) return;
	if (droid.group == baseBuilders) return;
	if (droid.order !== 0 || droid.action !== 0) return;

	if (throttleThis("idleConstructor_"+droid.id+"throttle", 5000)) return;
	const dr = droid;

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

	logObj(droid,"idle oilbuilder nothing safe to do");
	return false;
}

function checkOilsReachable() { queue("checkOilsReachableQ"); }
function checkOilsReachableQ() {
	const sites = enumFeature(ALL_PLAYERS, OIL_RES_STAT); // player sees oils on minimap

	let unReachableSites = sites.length;
	let reachableWithDestruction = 0;
	let reachableWithHover = 0;

    for (let site of sites) {
        let isReachable = false;
        let requiresDestruction = false;
		let requiresHover = false;

		// reverse start and dest to find a path to an impassable oil feature
		const pathWheel = findShortestPath(site, BASE, PROP_WHEEL, false);
		if (pathWheel) {
			isReachable = true;
			unReachableSites--;
			log(`oil reachable wheel: ${site.x},${site.y}`);
		} else {
			const pathWheelDestruct = findShortestPath(site, BASE, PROP_WHEEL, true);
			if (pathWheelDestruct) {
				isReachable = true;
				requiresDestruction = true;
				unReachableSites--;
				reachableWithDestruction++;
				log(`oil reachable wheel destruct: ${site.x},${site.y}`);
			} else {
				const pathHover = findShortestPath(site, BASE, PROP_HOVER, false);
				if (pathHover) {
					isReachable = true;
					requiresHover = true;
					unReachableSites--;
					reachableWithHover++;
					log(`oil reachable hover: ${site.x},${site.y}`);
				} else {
					const pathHoverDestruct = findShortestPath(site, BASE, PROP_HOVER, true);
					if (pathHoverDestruct) {
						isReachable = true;
						requiresHover = true;
						requiresDestruction = true;
						unReachableSites--;
						reachableWithHover++;
						reachableWithDestruction++;
						log(`oil reachable hover destruct: ${site.x},${site.y}`);
					}
				}
			}
		}

		if (!isReachable) log(`oil not reachable: ${site.x},${site.y}`);

        oilResourceStore.addObject( site.id, { ...site, id: site.id, isReachable, requiresDestruction, requiresHover });
    }
	log("unreachable oils: "+unReachableSites);
	console("unreachable oils: "+unReachableSites);
	log("requires destruction: "+reachableWithDestruction);
	console("requires destruction: "+reachableWithDestruction);
	log("requires hover: "+reachableWithHover);
	console("requires hover: "+reachableWithHover);
}
