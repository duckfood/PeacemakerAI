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
function finishLocalJobs()
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

function buildEarlyBase()
{
	// build first factory
	if (countStruct(FACTORY_STAT) === 0 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

	let oils = oilResourceStore.query({ isReachable: true }).length;
	let isHighTech = componentAvailable("LightRepair1");

	if (!isHighTech) {
		if (isSeaMap) {
		// build three labs seamap low tech
		if (countStruct(RES_LAB_STAT) < 3 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;

		} else if (isAirMap) {
			// build 5 labs airmap low tech
			if (countStruct(RES_LAB_STAT) < 5 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;

		} else { // standard land map low tech
			// build a second factory standard low tech
			if (countStruct(FACTORY_STAT) < 2 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
			// build 2 labs standard low tech
			if (countStruct(RES_LAB_STAT) < 2 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;
			// build one power generator
			if (countStruct(POW_GEN_STAT) === 0 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;
			if (upgradeGenerators()) return true;
			// build a third factory if standard high oil map low tech
			if (oils > HIGH_OIL_MAP && countStruct(FACTORY_STAT) < 3 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
		}
	}

	if (isHighTech) {
		if (isSeaMap) {
			// build a second factory seamap high tech
			if (countStruct(FACTORY_STAT) < 2 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
			// build one power generator
			if (countStruct(POW_GEN_STAT) === 0 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;
			if (upgradeGenerators()) return true;
			// upgrade one factory to 1 modules to build early posse
			if (upgradeFactories(FACTORY, 1, 1)) return true;
			// build third factory seamap high tech high oil
			if (oils > HIGH_OIL_MAP && countStruct(FACTORY_STAT) < 3 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

		} else if (isAirMap) {
			// build first air factory
			if (countStruct(VTOL_FACTORY_STAT) < 1 && grabTrucksAndBuild(VTOL_FACTORY_STAT, 1)) return true;
			// build second air factory if high oil
			if (oils > HIGH_OIL_MAP && countStruct(VTOL_FACTORY_STAT) < 2 && grabTrucksAndBuild(VTOL_FACTORY_STAT, 1)) return true;

		} else { // standard land map high tech
			if (isStructureAvailable(CYBORG_FACTORY_STAT)) { // cyborgs
				if (!enumStruct(me, CYBORG_FACTORY).length && grabTrucksAndBuild(CYBORG_FACTORY_STAT, 1)) return true;
				// build one power generator
				if (countStruct(POW_GEN_STAT) === 0 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;
				if (upgradeGenerators()) return true;
				// build a second factory if cyborgs are available and high oil map
				if (oils > HIGH_OIL_MAP && countStruct(FACTORY_STAT) < 2 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

			} else { // no cyborgs high tech
				// build second factory if cyborgs are not available
				if (countStruct(FACTORY_STAT) < 2 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
				// build one power generator
				if (countStruct(POW_GEN_STAT) === 0 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;
				if (upgradeGenerators()) return true;
				// build a third factory if cyborgs are not available and high oil map
				if (oils > HIGH_OIL_MAP && countStruct(FACTORY_STAT) < 3 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
			}
		}
	}
	return false;
}

// standard base build scheme
function buildBasicBase()
{
	// build power generator if needed
	if (countStruct(DERRICK_STAT) && !countStruct(POW_GEN_STAT) && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;
	if (upgradeGenerators()) return true;
	// build one factory
	if (countStruct(FACTORY_STAT) === 0 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
	// build hq
	if (countStruct(PLAYER_HQ_STAT) === 0 && grabTrucksAndBuild(PLAYER_HQ_STAT, 1))	return true;

	return false;
}

function buildFundamentals() { queue("buildFundamentalsQ"); } // timer
function buildFundamentalsQ()
{
	if (finishLocalJobs()) return true;
	if (gameTime < FOUR_MINUTE && buildEarlyBase()) return true;
	if (buildBasicBase()) return true;

	// build second and third generator if needed
	if (countStruct(DERRICK_STAT) > 4 && countStruct(POW_GEN_STAT) < 2 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;
	if (countStruct(DERRICK_STAT) > 8 && countStruct(POW_GEN_STAT) < 3 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;

	// upgrade all factory to 1 modules to build early posse
	if (upgradeFactories(FACTORY, 1)) return true;

	// build more generators as needed
	if (countStruct(DERRICK_STAT)/4 > countStruct(POW_GEN_STAT) && grabTrucksAndBuild(POW_GEN_STAT, 1))	return true;

	// upgrade all facs two modules
	if (upgradeFactories(FACTORY)) return true;

	if (enemyHasVtol && buildAntiAir(1)) return true;
	if (buildVTOLpads()) return true;
	if (upgradeFactories(VTOL_FACTORY)) return true;

	if (upgradeResearch()) return true;
	if (factoryBuildOrder()) return true;

	// if high tech delay building extra research labs for 6 minutes unless mass cash
	if (componentAvailable("LightRepair1") && gameTime > SIX_MINUTE && buildResearchLabs()) return true;
	if (!componentAvailable("LightRepair1") || getRealPower() > 1500 && buildResearchLabs()) return true;

	if (buildRepairFacs()) return true;

	if (getRealPower() > MIN_BUILD_POWER*3) {
		if (buildLassat()) return true;
		if (buildAntiAir(2)) return true;
		if (isAirMap && buildAntiAir(6)) return true;
	}

	if (getRealPower() > MIN_BUILD_POWER*7) {
		if (enemyHasVtol && buildAntiAir(3)) return true;
		if (countStruct(UPLINK_STAT) === 0 && grabTrucksAndBuild(UPLINK_STAT, 1)) return true;
	}

	// build with excess power
	if (getRealPower() > MIN_BUILD_POWER*15) {
		if (buildAntiAir(4)) return true;
		if (isAirMap && buildAntiAir(8)) return true;
		if (buildBaseOilDefenses(1)) return true;
	}

	if (getRealPower() > MIN_BUILD_POWER*50) {
		if (buildAntiAir(6)) return true;
		if (buildBaseArtillery(6)) return true;
		if (buildAntiAir(8)) return true;
		if (!isAirMap && buildBaseArtillery(8)) return true;
		if (buildAntiAir(12)) return true;
		if (!isAirMap && buildBaseArtillery(12)) return true;
	}
	if (getRealPower() > MIN_BUILD_POWER*100) {
		if (buildAntiAir(24)) return true;
		if (!isAirMap && buildBaseArtillery(24)) return true;
	}
	checkResearchCompletion();
}

//// used to build core base buildings but not accessory buildings
let baseCongested = false;
function grabTrucksAndBuild(structure, maxBlocking=1, x=BASE.x+randomBetween(-3, 3), y=BASE.y+randomBetween(-3, 3), direction=[0, 90, 180, 270][randomBetween(0, 3)])
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
	if (!baseCongested) {
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
			log("buildloc spiral: "+spirx+","+spiry+JSON.stringify(buildloc));
		}
	}

	baseCongested = true;
    log("default building at: "+x+"x"+y);
    buildloc = pickStructLocation(builder, structure, x, y, maxBlocking+1);
	return orderTrucksBuild(droids, structure, buildloc, direction);
}

//// used to build accessory buildings and by grabTrucksAndBuild()
function orderTrucksBuild(structure, site, maxBlocking=1, direction=0)
{
	if (!structure || !structure.length) {
		logTrace("ERROR orderTrucksBuild missing structure");
		return false;
	}

	let trucks = findIdleTrucks();
	if (!trucks || !trucks.length || !trucks[0].id) return false;
	if (!site || site.x === undefined || site.y === undefined) site = trucks[0];

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

    // Determine the number of factories to build based on derrick count
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

		// skip unused factories for sea and air maps
		if (isSeaMap) {
			if (fac === CYBORG_FACTORY_STAT) continue;
			if (fac === VTOL_FACTORY_STAT && groupSize(attackGroup) < MIN_ATTACK_GSIZE * 2) continue;
		} else if (isAirMap) {
			if (fac === CYBORG_FACTORY_STAT) continue;
			if (fac === FACTORY_STAT) continue;
		} else {
			if (fac === VTOL_FACTORY_STAT && groupSize(attackGroup) < MIN_ATTACK_GSIZE * 2) continue;
			if (fac === CYBORG_FACTORY_STAT && gameTime < SIX_MINUTE && !componentAvailable("HeavyRepair")) continue;
		}

		if (countStruct(fac) < numFactoriesToBuild && grabTrucksAndBuild(fac, 0)) --numFactoriesToBuild;
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
		let randomPathStep = randomBetween(12, 22);
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

        let spiral = plotSquareSpiral(buildArea.x+randomBetween(-3, 3), buildArea.y+randomBetween(-3, 3), GROUP_SCAN_RADIUS * 3);
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
        log("WARNING buildLassat no suitable place to build found.");
		buildloc = pickStructLocation(trucks[0], LASSAT_STAT, BASE.x, BASE.y);
		return orderTrucksBuild(LASSAT_STAT, buildloc); // just build it wherever
    }
    return false;
}

function buildOneIncendiaryMortar() {
	if (!isStructureAvailable("Emplacement-MortarPit-Incendiary")) return false;
	let base_artillery = seenStore.query({ player: me, hasIndirect: true, type: STRUCTURE });

	if (!base_artillery.length && orderTrucksBuild("Emplacement-MortarPit-Incendiary")) return true;
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
	let buildSites = seenStore.query({ player: me, type: STRUCTURE, stattype: REARM_PAD });
	buildSites = buildSites.concat(seenStore.query({ player: me, type: STRUCTURE, stattype: POWER_GEN }));

	if (max > antiAirs.length) {
		for (let j = 0, s = Schemes[Scheme].AA_SITES.length; j < s; ++j)
		{
			let site = returnRandInFirstFew(buildSites, 12);
			if (!site || !site.x || !site.y) site = BASE;
			if (grabTrucksAndBuild(Schemes[Scheme].AA_SITES[j], 1, site.x, site.y)) return true;
		}
	}
	return false;
}

//// structure upgrade functions
function upgradeFactories(type, buildmod=2, numfacs=Infinity)
{
	if (!type) return false;
	if (!isStructureAvailable(FAC_MODULE_STAT)) return false;
	if (getRealPower() < MIN_BUILD_POWER) return false;

	let facs = seenStore.query({ player: me, type: STRUCTURE, stattype: type });
	let facsUpgraded = 0;
	for (let fac of facs) {
		if (facsUpgraded >= numfacs) return false;
		if (fac.modules < buildmod) {
			return orderTrucksBuild(FAC_MODULE_STAT, fac);
		}
		facsUpgraded++;
	}
	return false;
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
	const BUILDER_SPACING_THRESHOLD = mapWidth + mapHeight / 4;
    // Step 1: Filter builders based on specified conditions
    const builders = enumGroup(oilBuilders).filter((obj) =>
        (obj.order === 0 || obj.action === 0 || obj.order === DORDER_HELPBUILD));

    if (!builders.length) return false;

    // Step 2: Identify safe sites by filtering out hostile-adjacent oil sites
	let sites;
	// get clusters for first 3 minutes
	if (gameTime < THREE_MINUTE) {
		if (!sites || !site.length) sites = oilResourceStore.findClusters({ isReachable: true, requiresDestruction: false }, 2, GROUP_SCAN_RADIUS).clusters;
	}
	if (!sites || !sites.length) sites = getNotMyOil();
	if (!sites || !sites.length) return false;

    const safeSites = sites.filter(site => {
        const alliedBuilders = seenStore.findNear(site, GROUP_SCAN_RADIUS, {isAllied: true, droidType: DROID_CONSTRUCT});
        if (alliedBuilders.length > 0) return false; // builder already present

        const hostileCount = getHostilesNear(site, GROUP_SCAN_RADIUS).length;
        return hostileCount === 0;
    });

    if (!safeSites.length) return false;

    const assignments = [];
    let availableSites = [...safeSites];

    // Step 3: Precompute distances from each builder to all safe sites
    const builderDistances = builders.map(builder => {
        const distances = availableSites.map(site => {
            const dist = distBetweenTwoPoints(builder.x, builder.y, site.x, site.y);
            return dist ? dist : Infinity;
        });
        return { builder, distances };
    });

    // Step 4: Use a priority queue to sort builders by their minimum distance to any safe site
    const priorityQueue = new ultimate_PriorityQueue();
    builderDistances.forEach(({ builder, distances }) => {
        const minDistance = Math.min(...distances);
        priorityQueue.enqueue({ builder, distances }, minDistance);
    });


	// NEW: Track sites assigned ONLY in this run to enforce spacing
	let assignedSitesInThisRun = [];

	// Step 5: Assign each builder to the closest AVAILABLE AND SPATIALLY SEPARATED safe site
	while (!priorityQueue.isEmpty()) {
		const { builder, distances } = priorityQueue.dequeue();
		if (!builder || !builder.id) continue;

		// Variables for the search results:
		let bestSiteStrict = null;   // Site found using the spacing constraint
		let minDistanceStrict = Infinity;

		let bestSiteFallback = null; // Site found using only distance (fallback)
		let minDistanceFallback = Infinity;

		// --- ITERATE TO DETERMINE BEST CANDIDATE ---
		for (let i = 0; i < availableSites.length; i++) {
			const site = availableSites[i];
			const distance = distances[i];

			// 1. Check general reachability (Always required)
			if (!droidCanReach(builder, site.x, site.y)) continue;

			// --- PASS 1: STRICT SEPARATION CHECK (The primary goal) ---
			let isTooClose = false;
			for (const assignedSite of assignedSitesInThisRun) {
				const separation = distBetweenTwoPoints(site.x, site.y, assignedSite.x, assignedSite.y);
				if (separation < BUILDER_SPACING_THRESHOLD) {
					isTooClose = true;
					break;
				}
			}

			// Check if this site is a better candidate for the strict assignment
			if (!isTooClose && distance < minDistanceStrict) {
				minDistanceStrict = distance;
				bestSiteStrict = site;
			}

			// --- PASS 2: FALLBACK CHECK (Always tracking the absolute closest) ---
			if (distance < minDistanceFallback) {
				minDistanceFallback = distance;
				bestSiteFallback = site;
			}
		}

		let assignedSite = null;

		// 1. Try the strict assignment first
		if (bestSiteStrict && bestSiteStrict.id) {
			assignedSite = bestSiteStrict;
		}
		// 2. Fallback: If strict assignment failed (bestSiteStrict is null),
		else if (bestSiteFallback && bestSiteFallback.id && availableSites.length > 0) {
			assignedSite = bestSiteFallback;
		}

		// If no site was selected after both passes, skip the builder
		if (!assignedSite || !assignedSite.id) continue;

		// Check if the previous assignment has expired (Original logic)
		const lastAssignmentTime = oilAssignments.get(assignedSite.id) || -Infinity;
		if (gameTime - lastAssignmentTime > ONE_MINUTE/2) {
			assignments.push({ builder, site: assignedSite });

			// CRUCIAL: Update tracking lists and status
			availableSites = availableSites.filter(site => site !== assignedSite);
			assignedSitesInThisRun.push(assignedSite); // <-- Tracks the assigned site

			oilAssignments.set(assignedSite.id, gameTime);
			oilAssignments.set(builder.id, assignedSite.id);
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
	if (droid.group === baseBuilders) return;
	if (droid.order !== 0 || droid.action !== 0) return;

	oilAssignments.delete(droid.id);
	orderLocations.delete(droid.id);
	orderTargets.delete(droid.id);

	if (throttleThis("idleConstructor_"+droid.id+"throttle", 10000)) return;
	const dr = droid;

	let notMyOil;
	// get clusters for first 3 minutes
	if (gameTime < THREE_MINUTE) {
		notMyOil = oilResourceStore.findClusters({ isReachable: true, requiresDestruction: false }, 2, GROUP_SCAN_RADIUS).clusters;
	}
	// scout to nearest notmyoil
	if (!notMyOil || !notMyOil.length) notMyOil = getNotMyOil();
	notMyOil = sortByDistToLoc(droid, notMyOil);
	if (notMyOil && notMyOil.length > 0 && !oilAssignments.get(notMyOil[0].id))
	{
		const enemies = getHostilesNear(notMyOil[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0] && droidCanReach(droid, notMyOil[0].x, notMyOil[0].y))
		{
			const oil = notMyOil[0];
			orderDroidLoc(droid, DORDER_SCOUT, oil.x, oil.y);
			logObj(droid,"idle truck scout notMyOil: "+oil.x+"x"+oil.y);
			orderLocations.set(dr.id, {x: oil.x, y: oil.y, enemies: false});
			oilAssignments.set(dr.id, oil.id);
			oilAssignments.set(oil.id, oil.id);
			return true;
		}
	}

	// check for nearby unclaimed oil
	let nearbyOil = seenStore.findNear(dr, GROUP_SCAN_RADIUS, { type: FEATURE, type: OIL_RESOURCE });
	nearbyOil = sortByDistToLoc(dr, nearbyOil);
	if (nearbyOil && nearbyOil.length && nearbyOil[0].id && !tileIsBurning(nearbyOil[0].x, nearbyOil[0].y)) {
		const enemies = getHostilesNear(damagedDefenses[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0] && droidCanReach(droid, damagedDefenses[0].x, damagedDefenses[0].y))
		{
			orderDroidBuild(droid, DORDER_BUILD, nearbyOil[0].x, nearbyOil[0].y);
			logObj(droid,"idle truck build nearbyOil: "+nearbyOil[0].x+"x"+nearbyOil[0].y);
			orderLocations.set(dr.id, {x: nearbyOil[0].x, y: nearbyOil[0].y, enemies: false});
			return true;
		}
	}

	// scout to nearest nearby damaged defense
	let damagedDefenses = seenStore.findNear(dr, GROUP_SCAN_RADIUS*3, { player: me, type: STRUCTURE, statttype: DEFENSE, status: BUILT }).filter((obj) => (obj.health < 80) );
	damagedDefenses = sortByDistToLoc(droid, damagedDefenses);
	if (damagedDefenses && damagedDefenses.length > 0)
	{
		const enemies = getHostilesNear(damagedDefenses[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0] && droidCanReach(droid, damagedDefenses[0].x, damagedDefenses[0].y))
		{
			orderDroidLoc(droid, DORDER_SCOUT, damagedDefenses[0].x, damagedDefenses[0].y);
			logObj(droid,"idle truck scout damagedDefenses: "+damagedDefenses[0].x+"x"+damagedDefenses[0].y);
			orderLocations.set(dr.id, {x: damagedDefenses[0].x, y: damagedDefenses[0].y, enemies: false});
			return true;
		}
	}

	//logObj(droid,"idle oilbuilder nothing safe to do");
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
	//console("unreachable oils: "+unReachableSites);
	log("requires destruction: "+reachableWithDestruction);
	//console("requires destruction: "+reachableWithDestruction);
	log("requires hover: "+reachableWithHover);
	//console("requires hover: "+reachableWithHover);

	// mark unreachableoils
	let unreachableoils = oilResourceStore.query({ isReachable: false });
	if (unreachableoils && unreachableoils.length) {
		markTiles(unreachableoils);
	}
}
