const SENSOR_TOWERS = [ "Sys-SensoTowerWS", "Sys-SensoTower01" ];

function buildEarlyBase()
{
	if (DEBUGEX) logFile("buildEarlyBase");
	// build first factory
	if (countStruct(FACTORY_STAT) === 0 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

	let oils = oilResourceStore.query({ isReachable: true }).length;
	let isHighTech = isComponentProducible(BODY_COBRA);

	if (!isHighTech) {
		if (isHoverMap()) {
		// build three labs seamap low tech
		if (countStruct(RES_LAB_STAT) < 3 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;
		// build more labs if mass cash
		if (getRealPower() > RESEARCH_TIER_THRESH && countStruct(RES_LAB_STAT) < 5 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;

		} else if (isVtolMap()) {
			// build 3 labs airmap low tech
			if (countStruct(RES_LAB_STAT) < 3 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;

		} else { // standard land map low tech
			// build a second factory standard low tech
			if (countStruct(FACTORY_STAT) < 2 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
			// build 2 labs standard low tech
			if (countStruct(RES_LAB_STAT) < 2 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;
			// build thrid and fourth lab if extra cash
			if (getRealPower() > RESEARCH_TIER_THRESH && countStruct(RES_LAB_STAT) < 4 && grabTrucksAndBuild(RES_LAB_STAT, 1)) return true;
			// build one power generator
			if (countStruct(POW_GEN_STAT) === 0 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;
			if (upgradeGenerators()) return true;
			// build a third factory if standard high oil map low tech
			if (oils > HIGH_OIL_MAP && countStruct(FACTORY_STAT) < 3 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
		}
	}

	if (isHighTech) {
		if (isHoverMap()) {
			// build a second factory seamap high tech
			if (countStruct(FACTORY_STAT) < 2 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
			// build one power generator
			if (countStruct(POW_GEN_STAT) === 0 && grabTrucksAndBuild(POW_GEN_STAT, 1)) return true;
			if (upgradeGenerators()) return true;
			// upgrade one factory to 1 modules to build early posse
			if (upgradeFactories(FACTORY, 1, 1)) return true;
			// build third factory seamap high tech high oil
			if (oils > HIGH_OIL_MAP && countStruct(FACTORY_STAT) < 3 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;

		} else if (isVtolMap()) {
			// build first air factory
			if (countStruct(VTOL_FACTORY_STAT) < 1 && grabTrucksAndBuild(VTOL_FACTORY_STAT, 1)) return true;
			// build second air factory if high oil
			if (oils > HIGH_OIL_MAP && countStruct(VTOL_FACTORY_STAT) < 2 && grabTrucksAndBuild(VTOL_FACTORY_STAT, 1)) return true;

		} else { // standard land map high tech
			if (isStructureBuildable(CYBORG_FACTORY_STAT)) { // cyborgs
				if (countStruct(CYBORG_FACTORY_STAT) < 1 && grabTrucksAndBuild(CYBORG_FACTORY_STAT, 1)) return true;
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
	if (DEBUGEX) logFile("buildBasicBase");
	// build one power generator if needed
	if (buildPowerGens(1)) return true;
	if (upgradeGenerators()) return true;
	// build one factory
	if (countStruct(FACTORY_STAT) === 0 && grabTrucksAndBuild(FACTORY_STAT, 1)) return true;
	// build hq
	if (countStruct(PLAYER_HQ_STAT) === 0 && grabTrucksAndBuild(PLAYER_HQ_STAT, 1))	return true;
	// build one cyborg factory unless hover map
	if (countStruct(CYBORG_FACTORY_STAT) === 0 && !isHoverMap() && grabTrucksAndBuild(CYBORG_FACTORY_STAT, 1)) return true;

	return false;
}

function buildFundamentals() { queue("buildFundamentalsQ"); } // timer
function buildFundamentalsQ()
{
	if (!PeacemakerAIenable) return false;
	if (DEBUGEX) logFile("buildFundamentalsQ");
	if (finishLocalJobs()) return true;
	if (gameTime < FOUR_MINUTE && buildEarlyBase()) return true;
	if (buildBasicBase()) return true;

	// build second and third generator if needed
	if (buildPowerGens(3)) return true;

	// upgrade all factory to 1 modules to build early posse
	if (upgradeFactories(FACTORY, 1)) return true;

	if (enemyHasVtol && buildBaseAntiAir(2)) return true;
	if (isVtolMap() && buildBaseAntiAir(3)) return true;

	// upgrade all facs two modules
	if (upgradeFactories(FACTORY)) return true;

	// upgrade one vtol fac one module
	if (upgradeFactories(VTOL_FACTORY, 1, 1)) return true;
	if (buildVTOLpads()) return true;

	// build fourth and fifth generator if needed
	if (buildPowerGens(5)) return true;

	if (upgradeResearch()) return true;

	if (upgradeFactories(VTOL_FACTORY)) return true;

	// build more facs if needed
	if (factoryBuildOrder()) return true;

	if (buildResearchLabs()) return true;
	if (buildRepairFacs()) return true;

	// build more generators if needed
	if (buildPowerGens()) return true;

	if (isVtolMap() && buildBaseAntiAir(6)) return true;

	if (groupSize(attackGroup)+groupSize(defendGroup) > MIN_GROUND_UNITS * 4 && buildCommandPost()) return true;

	if (getRealPower() > MIN_BUILD_POWER*3) {
		if (buildLassat()) return true;
		if (buildBaseAntiAir(3)) return true;
		if (isVtolMap() && buildBaseAntiAir(12)) return true;
	}

	if (getRealPower() > MIN_BUILD_POWER*7) {
		if (enemyHasVtol && buildBaseAntiAir(3)) return true;
		if (countStruct(UPLINK_STAT) === 0 && grabTrucksAndBuild(UPLINK_STAT, 1)) return true;
	}

	// build with excess power
	if (getRealPower() > MIN_BUILD_POWER*15) {
		if (buildBaseAntiAir(4)) return true;
		if (isVtolMap() && buildBaseAntiAir(20)) return true;
	}

	if (getRealPower() > MIN_BUILD_POWER*50) {
		if (buildBaseOilDefenses(1)) return true;
		if (buildBaseAntiAir(6)) return true;
		if (buildBaseArtillery(6)) return true;
		if (buildBaseAntiAir(8)) return true;
		if (!isVtolMap() && buildBaseArtillery(8)) return true;
		if (buildBaseAntiAir(12)) return true;
		if (!isVtolMap() && buildBaseArtillery(12)) return true;
	}
	if (getRealPower() > MIN_BUILD_POWER*100) {
		if (buildBaseAntiAir(24)) return true;
		if (!isVtolMap() && buildBaseArtillery(24)) return true;
	}
	checkResearchCompletion();
}

//// used to build core base buildings but not accessory buildings
let baseCongested = false;
function grabTrucksAndBuild(structure, maxBlocking=1, x=lastBuildLoc.x, y=lastBuildLoc.y, direction=[0, 90, 180, 270][randomBetween(0, 3)])
{
	if (DEBUGEX) logFile("grabTrucksAndBuild");
    if (!isStructureBuildable(structure)) return false;
	const droids = findIdleTrucks();
    if (!droids.length) return false;
    const builder = droids[0];
    if (!builder?.id) return false;

	if (!isInMapBounds({x,y})) {
		logFile("ERROR grabTrucksAndBuild x,y not in map bounds:", x, y);
		return false;

	}

	// plot a spiral to help efficiently locate building sites
	let locationSpiral = plotSquareSpiral(x, y, GROUP_SCAN_RADIUS*3);
	if (!locationSpiral || !locationSpiral.length) {
		logFile("ERROR grabTrucksAndBuild no spiral data");
		return false;
	}
	logFile("grabTrucksAndBuild structure:", structure);

	// try the original location first
    let buildloc = pickStructLocation(builder, structure, x, y, maxBlocking);
	logFile("buildloc orig: "+x+","+y+" "+JSON.stringify(buildloc));

	// iterate through location spiral skipping 8 tiles in the spiral until a suitable site is found
	if (!baseCongested) {
		for (let count = 0; count < locationSpiral.length; count = count+8) {
			if (buildloc && isInMapBounds(buildloc)) {
				if (droidCanReach(builder, buildloc.x, buildloc.y)) {
					if (distBetweenTwoPoints(buildloc.x, buildloc.y, BASE.x, BASE.y) < GROUP_SCAN_RADIUS*3.5) {
						const line = distBetweenTwoPoints(builder.x, builder.y, buildloc.x, buildloc.y);
						logFile("line: "+line);
						if (line > 2.5) {
							logFile("line is long enough to check");
							const path = findShortestPath(builder, buildloc, builder.propulsion, false, line*6); // limit pathing effort
							if (path && path.distance) {
								logFile("path: "+path.distance);
								if (path.distance <= line * 2.5) {
									logFile("distance building at: "+x+"x"+y);
									return orderTrucksBuild(structure, buildloc, maxBlocking, direction);
								}
							} else {
								logFile("no path data so try next step likely defective map");
							}
						} else {
							logFile("short line building at: "+x+"x"+y);
							return orderTrucksBuild(structure, buildloc, maxBlocking, direction);
						}
					} else {
						logFile("buildloc too far from base so set baseCongested true");
						baseCongested = true;
						break;
					}
				} else {
					logFile("unreachable buildloc likely defective map");
				}
			} else {
				logFile("invalid buildloc");
			}

			let spirloc = locationSpiral[count];
			let spirx = spirloc[0];
			let spiry = spirloc[1];

			buildloc = pickStructLocation(builder, structure, spirx, spiry, maxBlocking);
			logFile("buildloc spiral: "+spirx+","+spiry+JSON.stringify(buildloc));
		}
	}

	// base might be congested or other trouble so build anywhere offered by pickStructLocation
	if (!baseCongested) baseCongested = true;
    logFile("baseCongested building at: "+x+"x"+y);
    buildloc = pickStructLocation(builder, structure, x, y, maxBlocking); // get a fresh buildloc
	if (isInMapBounds(buildloc) && droidCanReach(builder, buildloc.x, buildloc.y)) return orderTrucksBuild(structure, buildloc);
	return false;
}

//// used to build accessory buildings and by grabTrucksAndBuild()
function orderTrucksBuild(structure, site, maxBlocking=1, direction=0)
{
	if (DEBUGEX) logFile("orderTrucksBuild");
	if (!structure || !structure.length) {
		logTrace("ERROR orderTrucksBuild missing structure");
		return false;
	}

	let started = false;
	let trucks = findIdleTrucks();
	if (!trucks || !trucks.length || !trucks[0].id) return false;

	if (!site || !isInMapBounds(site)) {
		site = pickStructLocation(trucks[0], structure, site.x, site.y, maxBlocking);
		if (!isInMapBounds(site)) return false;
	}

	for (let dr of trucks)
	{
		if (dr && dr.id && droidCanReach(dr, site.x, site.y)) {
			if (orderDroidBuild(dr, DORDER_BUILD, structure, site.x, site.y, direction)) started = true;
		}
	}
	logFile("orderTrucksBuild build started: "+started, structure, site);

	return started;
}

//// build factories. Attempts to build at least 1 of each factory.
function factoryBuildOrder() {
    if (DEBUGEX) logFile("factoryBuildOrder");

    const BASE_FACTORY_ORDER = [FACTORY_STAT, CYBORG_FACTORY_STAT, VTOL_FACTORY_STAT];

    const factoryOrder = relyOnVtols
        ? [VTOL_FACTORY_STAT, CYBORG_FACTORY_STAT, FACTORY_STAT]
        : BASE_FACTORY_ORDER;

    // Calculate the initial target count based on derrick count.
    let numFactoriesToBuild = 1;
    if (countStruct(DERRICK_STAT) >= 40) {
        numFactoriesToBuild = 3;
    } else if (countStruct(DERRICK_STAT) >= 24) {
        numFactoriesToBuild = 2;
    }

    for (let i = 0; i < factoryOrder.length && numFactoriesToBuild > 0; ++i) {
        const fac = factoryOrder[i];
        let compensatedTarget = numFactoriesToBuild;
        let shouldSkip = false;

        if (isHoverMap()) {
            if (fac === CYBORG_FACTORY_STAT) {
                shouldSkip = true;
            }
            else if (fac === FACTORY_STAT) {
                compensatedTarget++; // Boost the required count (compensatory build slot)
            }
            else if (fac === VTOL_FACTORY_STAT && (groupSize(attackGroup) < MIN_ATTACK_GSIZE * 2)) {
                shouldSkip = true;
            }
        } else if (isVtolMap()) {
            if (fac === CYBORG_FACTORY_STAT || fac === FACTORY_STAT) {
                shouldSkip = true;
            }
            else if (fac === VTOL_FACTORY_STAT) {
                compensatedTarget++; // Boost the required count
            }
        } else { // standard map
            if (fac === VTOL_FACTORY_STAT && groupSize(attackGroup) < MIN_ATTACK_GSIZE * 2) {
                shouldSkip = true;
            }
            else if (fac === CYBORG_FACTORY_STAT && gameTime < SIX_MINUTE && !isComponentProducible(TANK_REPAIR_HV)) {
                shouldSkip = true;
            }
        }

        // Skip the rest of the logic if the factory type is unsuitable for this map.
        if (shouldSkip) {
            continue;
        }

        // Check if the factory count is below the adjusted economic target.
        if (countStruct(fac) < compensatedTarget) {
            if (grabTrucksAndBuild(fac, 1)) {
                numFactoriesToBuild--;
            }
        }
    }

    return numFactoriesToBuild === 0;
}


function buildResearchLabs()
{
	if (DEBUGEX) logFile("buildResearchLabs");
    if (researchDone) {
        return false;
    }

	// delay building research labs for 6 minutes unless plenty of cash
	if (gameTime < SIX_MINUTE && isComponentProducible(TANK_BUNKERB)) {
		if (getRealPower() < RESEARCH_TIER_THRESH) return;
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
	if (DEBUGEX) logFile("buildVTOLpads");
	if (getRealPower() < MIN_BUILD_POWER/2) return false;
	if (!isStructureBuildable(VTOL_PAD_STAT)) return false;
	if (!countStruct(VTOL_FACTORY_STAT)) return false;

	let sites = [ ...seenStore.query({ player: me, type: STRUCTURE, stattype: RESEARCH_LAB }),
				  ...seenStore.query({ player: me, type: STRUCTURE, stattype: POWER_GEN }),
				  ...seenStore.query({ player: me, type: STRUCTURE, stattype: HQ }),
				];

	let vploc = returnRandInFirstFew(shuffleArray(sites), 8);

	//Build VTOL pads if needed
	let pad_mult = 0.7; // basic pad
	if (!findResearch("R-Struc-VTOLPad-Upgrade01")) pad_mult = 0.5;
	if (!findResearch("R-Struc-VTOLPad-Upgrade04")) pad_mult = 0.4;
	if (!findResearch("R-Struc-VTOLPad-Upgrade06")) pad_mult = 0.3;

	let needVtolPads = !countStruct(VTOL_PAD_STAT) || countStruct(VTOL_PAD_STAT) < pad_mult * (groupSize(vtolGroup));

	if (needVtolPads && vploc) {
		return grabTrucksAndBuild(VTOL_PAD_STAT, 0, vploc.x, vploc.y);
	}
}


function buildRepairFacs()
{
	// pre-calculate path to another base to identify likely home base exit site
	if (buildRepairFacs.pathCache === undefined) {
		let baseloc;
		let notmybase;
		for (const position of startPositions) {
			if (position === startPositions[me]) continue; // me is startPositions index for current player
			notmybase = position; // use the first one
			break;
		}
		buildRepairFacs.pathCache = findShortestPath(startPositions[me], notmybase, PROP_HOVER, false);
		logFile("buildRepairFacs path:", buildRepairFacs.pathCache);
	}
	if (!isStructureBuildable(REPAIR_FACILITY_STAT)) return false;
	if (getRealPower() < MIN_BUILD_POWER/2) return false;

	if (countStruct(REPAIR_FACILITY_STAT) < (countStruct(FACTORY_STAT) + countStruct(CYBORG_FACTORY_STAT))/4) {
		// plot a path from our base to a hostile base and build on it
		if (!buildRepairFacs.pathCache) {
			logFile("buildRepairFacs using plot a line");
			// use alternate method: plot a line from edge past base
			let baseEdge = closestPointOnRectEdge({x: 0, y: 0, width: mapWidth, height: mapHeight}, {x: BASE.x, y: BASE.y});
			let site = extendLine(baseEdge, BASE, 10);
			if (site && isInMapBounds(site) && grabTrucksAndBuild(REPAIR_FACILITY_STAT, 2, site.x, site.y)) {
				return true;
			} else {
				return false;
			}
		}
		// build on path near base perimeter
		let randomPathStep = randomBetween(12, 22);
		return grabTrucksAndBuild(REPAIR_FACILITY_STAT, 8, buildRepairFacs.pathCache.path[randomPathStep][0], buildRepairFacs.pathCache.path[randomPathStep][1]);
	}
	return false;
}

function buildPowerGens(amount=Infinity)
{
	if (!isStructureBuildable(POW_GEN_STAT)) return false;

	const gens = seenStore.query({ player: me, type: STRUCTURE, stattype: POWER_GEN }).length;
	const derricks = seenStore.query({ player: me, type: STRUCTURE, stattype: RESOURCE_EXTRACTOR }).length;

	if (derricks/4 > gens && gens < amount) {
		return grabTrucksAndBuild(POW_GEN_STAT, 1);
	}

}

function buildLassat() {
	if (DEBUGEX) logFile("buildLassat");
    if (StatsMap.has(LASSAT_STAT) && isStructureBuildable(LASSAT_STAT)) {
        if (getRealPower() < 0) return false;

		// find a location likely to be behind base
		let baseEdge = closestPointOnRectEdge({x: 0, y: 0, width: mapWidth, height: mapHeight}, {x: BASE.x, y: BASE.y});
		let buildArea = extendLine(baseEdge, BASE, 10, 'before');

        let spiral = plotSquareSpiral(buildArea.x+randomBetween(-3, 3), buildArea.y+randomBetween(-3, 3), GROUP_SCAN_RADIUS * 3);
        if (!spiral || spiral.length < 20) {
            logFile("ERROR buildLassat not valid spiral");
            return false;
        }
		let trucks = findIdleTrucks();
		if (!trucks || !trucks.length || !trucks[0].id) return false;

		let buildloc;
        for (let i = 0; i < spiral.length; i += 4) {
            let x = spiral[i][0];
            let y = spiral[i][1];
			if (!isInMapBounds({x,y}) || !droidCanReach(trucks[0], x, y)) continue;
            logFile(`buildLassat trying to build at ${x},${y}`);
            buildloc = pickStructLocation(trucks[0], LASSAT_STAT, x, y);
			let structs = enumRange(buildloc.x, buildloc.y, 8, me, true).filter((obj) => obj.type === STRUCTURE);
			if (structs.length > 0) continue;

            if (buildloc && droidCanReach(trucks[0], buildloc.x, buildloc.y)) {
                logFile(`buildLassat building at ${buildloc.x},${buildloc.y}`);
                return orderTrucksBuild(LASSAT_STAT, buildloc);
            }
        }
        logFile("WARNING buildLassat no suitable place to build found.");
		buildloc = pickStructLocation(trucks[0], LASSAT_STAT, BASE.x, BASE.y);
		return orderTrucksBuild(LASSAT_STAT, buildloc); // just build it wherever
    }
    return false;
}

function buildOneIncendiaryMortar() {
	if (!isStructureBuildable("Emplacement-MortarPit-Incendiary")) return false;
	let base_artillery = seenStore.query({ player: me, hasIndirect: true, type: STRUCTURE });

	if (!base_artillery.length && grabTrucksAndBuild("Emplacement-MortarPit-Incendiary")) return true;
	return false;
}

function buildBaseArtillery(max=1)
{
	if (getRealPower() < MIN_BUILD_POWER) return false;
	let defenses = enumStruct(me, DEFENSE).filter((obj) => (obj.hasIndirect === true));
	if (defenses.length >= max) return false;
	let bestDefense = firstAvailableStructure(Scheme.ARTILLERY_DEFENSES);
	if (!bestDefense) return false;

	return grabTrucksAndBuild(bestDefense, 0);
}

function buildBaseOilDefenses(max=1)
{
	let baseoils = enumStruct(me, RESOURCE_EXTRACTOR).filter((obj) => (distBetweenTwoPoints(obj.x, obj.y, BASE.x, BASE.y) < AVG_BASE_RADIUS));
	for (let oil of baseoils) {
		let covered = 0;
		let oildefenses = enumRange(oil.x, oil.y, GROUP_SCAN_RADIUS*3, me).filter((obj) => (obj.type === STRUCTURE && obj.stattype === DEFENSE));
		for (let defense of oildefenses){
			if (defense.range/TILE_DIVISOR > distBetweenTwoPoints(oil.x, oil.y, defense.x, defense.y)) {
				covered++;
			}
		}
		if (covered >= max) continue;
		else {
			let bestDefense = firstAvailableStructure(Scheme.STANDARD_DEFENSES);
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
		for (let defense of oildefenses) {
			if (defense.range/TILE_DIVISOR > distBetweenTwoPoints(oil.x, oil.y, defense.x, defense.y)) {
				covered++;
			}
		}
		if (covered >= max) continue;
		else {
			let bestDefense = firstAvailableStructure(Scheme.STANDARD_DEFENSES);
			if (!bestDefense) return false;

			let oilEdge = closestPointOnRectEdge({x: 0, y: 0, width: mapWidth, height: mapHeight}, {x: oil.x, y: oil.y});
			let site = extendLine(oilEdge, oil, 2);
			return orderTrucksBuild(bestDefense, site);
		}
	}
	return false;
}

function buildBaseAntiAir(max=1)
{
	if (DEBUGEX) logFile("buildBaseAntiAir");
	let antiAirs = seenStore.findNear(BASE, GROUP_SCAN_RADIUS*2, { player: me, type: STRUCTURE, isAA: true });
	let buildSites = [ ...seenStore.query({ player: me, type: STRUCTURE, stattype: REARM_PAD }),
					   ...seenStore.query({ player: me, type: STRUCTURE, stattype: POWER_GEN }),
					   ...seenStore.query({ player: me, type: STRUCTURE, stattype: RESEARCH_LAB }),
					 ];

	if (max > antiAirs.length) {
		let site = returnRandInFirstFew(shuffleArray(buildSites));
		if (!site || !isInMapBounds(site)) return false;

		let buildaa = firstAvailableStructure(Scheme.AA_SITES);
		if (buildaa && buildaa.length && grabTrucksAndBuild(buildaa, 0, site.x, site.y)) return true;
	}
	return false;
}

//// structure upgrade functions
function upgradeFactories(type, buildmod=2, numfacs=Infinity)
{
	if (!type) return false;
	if (!isStructureBuildable(FAC_MODULE_STAT)) return false;
	if (getRealPower() < MIN_BUILD_POWER/2) return false;

	let facs = seenStore.query({ player: me, type: STRUCTURE, stattype: type });
	let facsUpgraded = 0;
	for (let fac of facs) {
		if (facsUpgraded >= numfacs) return false;
		if (fac.modules < buildmod) {
			if (orderTrucksBuild(FAC_MODULE_STAT, fac)) return true;
		}
		facsUpgraded++;
	}
	return false;
}

function upgradeGenerators()
{
	if (!isStructureBuildable(POW_MODULE_STAT)) return false;

	let gens = seenStore.query({ player: me, type: STRUCTURE, stattype: POWER_GEN });
	for (let struct of gens) {
		if (struct.modules < 1) {
			return orderTrucksBuild(POW_MODULE_STAT, struct);
		}
	}
	return false;
}
function upgradeResearch()
{
	if (!isStructureBuildable(RES_MODULE_STAT)) return false;
	if (getRealPower() < MIN_BUILD_POWER) return false;

	let labs = seenStore.query({ player: me, type: STRUCTURE, stattype: RESEARCH_LAB });
	for (let struct of labs) {
		if (struct.modules < 1) {
			return orderTrucksBuild(RES_MODULE_STAT, struct);
		}
	}
	return false;
}

function findIdleTrucks()
{
	// enumerate the basebuilders group list and filter to select inactive
	return enumGroup(baseBuilders).filter(truck => truck.order === DORDER_NONE || truck.order === DORDER_PATROL);
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
		distBetweenTwoPoints(BASE.x, BASE.y, obj.x, obj.y) < GROUP_SCAN_RADIUS * 2
	));

	if (freeTrucks && structlist.length)
	{
		structlist = structlist.sort(sortByDistToBase);
		for (let j = 0; j < freeTrucks; ++j)
		{
			if (orderDroidObj(trucks[j], DORDER_HELPBUILD, structlist[0])) success = true;
		}
	}

	return success;
}

//// assigns trucks to closet safe notMyOil() with pre-computation, state, and PQ
function assignTrucksToOil() { queue("assignTrucksToOilQ"); } // timer
function assignTrucksToOilQ() {
	if (!PeacemakerAIenable) return false;
	if (DEBUGEX) logFile("assignTrucksToOilQ");
	const BUILDER_SPACING_THRESHOLD = (mapWidth + mapHeight) / 4;
    // Step 1: Filter builders based on specified conditions
    const builders = enumGroup(oilBuilders).filter((obj) =>
        (obj.order === 0 || obj.action === 0 || obj.order === DORDER_HELPBUILD));

    if (!builders.length) return false;

    // Step 2: Identify safe sites by filtering out hostile-adjacent oil sites
	let sites;
	// get clusters for first 3 minutes
	if (gameTime < THREE_MINUTE) {
		sites = oilResourceStore.findClusters({ isReachable: true, requiresDestruction: false }, 2, GROUP_SCAN_RADIUS).clusters;
	}
	if (!sites || !sites.length) sites = getNotMyOil();
	if (!sites || !sites.length) return false;

    const safeSites = sites.filter(site => {
        const alliedBuilders = seenStore.findNear(site, GROUP_SCAN_RADIUS, { isAllied: true, droidType: DROID_CONSTRUCT, group: oilBuilders });
        if (alliedBuilders.length > 0) {
			logFile(site, `${site.x},${site.y} assignTrucksToOil builder already present`);
			return false;
		}

        const hostileCount = getHostilesNear(site, GROUP_SCAN_RADIUS).length;
		if (hostileCount > 0) {
			logFile(site, `${site.x},${site.y} assignTrucksToOil hostiles present`);
		}
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
		if (!assignedSite || !assignedSite.id) {
			logFile(builder, "assignTrucksToOil no site skipping builder");
			continue;
		}

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
        logFile(assignment.builder, `truck assigned to oil at ${assignment.site.x},${assignment.site.y}`);
    }

    return assignments.length > 0;
}

//// reduced original working version
function idleConstructor(droid)
{
	if (DEBUGEX) logFile("idleConstructor");
	if (!droid || droid.id === null) return;
	if (throttleThis("idleConstructor_"+droid.id+"throttle", 10000)) return;
	const dr = droid;

	if (droid.group === baseBuilders) {
		// patrol
		let randBaseLoc = { x: BASE.x+randomBetween(-6, 6), y: BASE.y+randomBetween(-6, 6) };
		if (isInMapBounds(randBaseLoc) && droidCanReach(droid, randBaseLoc.x, randBaseLoc.y)) {
			orderDroidLoc(droid, DORDER_PATROL, randBaseLoc.x, randBaseLoc.y);
		}
		return;
	}

	if (droid.order !== 0 || droid.action !== 0) return;

	oilAssignments.delete(droid.id);
	orderLocations.delete(droid.id);
	orderTargets.delete(droid.id);


	let notMyOil;
	// get oil clusters for first 3 minutes
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
			logFile(droid,"idle truck scout notMyOil: "+oil.x+"x"+oil.y);
			orderLocations.set(dr.id, {x: oil.x, y: oil.y, enemies: false});
			oilAssignments.set(dr.id, oil.id);
			oilAssignments.set(oil.id, gameTime);
			return true;
		}
	}

	// check for nearby unclaimed oil
	let nearbyOil = seenStore.findNear(dr, GROUP_SCAN_RADIUS, { type: FEATURE, type: OIL_RESOURCE });
	nearbyOil = sortByDistToLoc(dr, nearbyOil);
	if (nearbyOil && nearbyOil.length && nearbyOil[0].id && !tileIsBurning(nearbyOil[0].x, nearbyOil[0].y)) {
		const enemies = getHostilesNear(nearbyOil[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0] && droidCanReach(droid, nearbyOil[0].x, nearbyOil[0].y))
		{
			orderDroidBuild(droid, DORDER_BUILD, DERRICK_STAT, nearbyOil[0].x, nearbyOil[0].y);
			logFile(droid,"idle truck build nearbyOil: "+nearbyOil[0].x+"x"+nearbyOil[0].y);
			orderLocations.set(dr.id, {x: nearbyOil[0].x, y: nearbyOil[0].y, enemies: false});
			return true;
		}
	}

	// scout to nearest nearby damaged defense
	let damagedDefenses = seenStore.findNear(dr, GROUP_SCAN_RADIUS*3, { player: me, type: STRUCTURE, stattype: DEFENSE, status: BUILT }).filter((obj) => (obj.health < 80) );
	damagedDefenses = sortByDistToLoc(droid, damagedDefenses);
	if (damagedDefenses && damagedDefenses.length > 0)
	{
		const enemies = getHostilesNear(damagedDefenses[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
		if (!enemies[0] && droidCanReach(droid, damagedDefenses[0].x, damagedDefenses[0].y))
		{
			orderDroidLoc(droid, DORDER_SCOUT, damagedDefenses[0].x, damagedDefenses[0].y);
			logFile(droid,"idle truck scout damagedDefenses: "+damagedDefenses[0].x+"x"+damagedDefenses[0].y);
			orderLocations.set(dr.id, {x: damagedDefenses[0].x, y: damagedDefenses[0].y, enemies: false});
			return true;
		}
	}

	return false;
}

function checkOilsReachable() { queue("checkOilsReachableQ"); }
function checkOilsReachableQ(sites)
{
	if (DEBUGEX) logFile("checkOilsReachableQ");
	// player sees oils on minimap
	if (!sites || !sites.length) sites = enumFeature(ALL_PLAYERS, OIL_RES_STAT);

	let unReachableSites = sites.length;
	let reachableWithDestruction = 0;
	let reachableWithHover = 0;

    for (let site of sites) {
		if (!isInMapBounds(site)) continue;

        let isReachable = false;
        let requiresDestruction = false;
		let requiresHover = false;

		// reverse start and dest to find a path to an impassable oil feature
		const pathWheel = findShortestPath(site, BASE, PROP_WHEEL, false);
		if (pathWheel) {
			isReachable = true;
			unReachableSites--;
			logFile(`oil reachable wheel: ${site.x},${site.y}`);
		} else {
			const pathWheelDestruct = findShortestPath(site, BASE, PROP_WHEEL, true);
			if (pathWheelDestruct) {
				isReachable = true;
				requiresDestruction = true;
				unReachableSites--;
				reachableWithDestruction++;
				logFile(`oil reachable wheel destruct: ${site.x},${site.y}`);
			} else {
				const pathHover = findShortestPath(site, BASE, PROP_HOVER, false);
				if (pathHover) {
					isReachable = true;
					requiresHover = true;
					unReachableSites--;
					reachableWithHover++;
					logFile(`oil reachable hover: ${site.x},${site.y}`);
				} else {
					const pathHoverDestruct = findShortestPath(site, BASE, PROP_HOVER, true);
					if (pathHoverDestruct) {
						isReachable = true;
						requiresHover = true;
						requiresDestruction = true;
						unReachableSites--;
						reachableWithHover++;
						reachableWithDestruction++;
						logFile(`oil reachable hover destruct: ${site.x},${site.y}`);
					}
				}
			}
		}
		if (!isReachable) logFile(`oil not reachable: ${site.x},${site.y}`);

        oilResourceStore.addObject( site.id, { ...site, id: site.id, isReachable, requiresDestruction, requiresHover });
    }

	if (DEBUG) {
		logFile("unreachable oils: "+unReachableSites);
		console("unreachable oils: "+unReachableSites);
		logFile("requires destruction: "+reachableWithDestruction);
		console("requires destruction: "+reachableWithDestruction);
		logFile("requires hover: "+reachableWithHover);
		console("requires hover: "+reachableWithHover);

		// mark unreachableoils
		let unreachableoils = oilResourceStore.query({ isReachable: false });
		if (unreachableoils && unreachableoils.length) {
			markTiles(unreachableoils);
		}
	}
}

function setupTruckGroups()
{
	let cons = enumDroid(me, DROID_CONSTRUCT);
	for (let i = 0, l = cons.length; i < l; ++i)
	{
		let droid = cons[i];
		if (enumGroup(baseBuilders).length < MIN_BASE_TRUCKS) { groupAdd(baseBuilders, droid); }
		else if (enumGroup(oilBuilders).length < MIN_OIL_TRUCKS) { groupAdd(oilBuilders, droid); }
		else if (enumGroup(baseBuilders).length === MIN_BASE_TRUCKS) { groupAdd(baseBuilders, droid); }
		else if (enumGroup(oilBuilders).length < MIN_OIL_TRUCKS*2) { groupAdd(oilBuilders, droid); }
		else if (enumGroup(baseBuilders).length < MAX_BASE_TRUCKS) { groupAdd(baseBuilders, droid); }
		else { groupAdd(oilBuilders, droid); }
	}
}


function buildCommandPost()
{
	if (!isStructureBuildable(RELAY_POST_STAT)) return false;

	const commandPosts = seenStore.query({ player: me, type: STRUCTURE, stattype: COMMAND_CONTROL }).length;
    if (!commandPosts && grabTrucksAndBuild(RELAY_POST_STAT, 1)) {
        return true;
    }

    return false;
}
