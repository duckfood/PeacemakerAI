const STANDARD_DEFENSES = [
	"WallTower-PulseLas",
	"WallTower-TwinAssaultGun",
	"Pillbox-RotMG",
	"PillBox1",
	"GuardTower1"
];
const ARTILLERY_DEFENSES = [
	"Emplacement-Howitzer-Incendiary",	
	"Emplacement-MortarPit-Incendiary",
];
const LR_DEFENSES = [
	"Emplacement-HvART-pit",
//	"Emplacement-Rocket06-IDF"
];
const SAM_SITES = [
	"P0-AASite-SAM2",
	"P0-AASite-Laser",
	"AASite-QuadRotMg", // Whirlwind but not researched
	"AASite-QuadMg1" // Hurricane in case that's all there is
];

function conCanHelp(mydroid, bx, by)
{
	if (DEBUG_EXTREME) {log("conCanHelp");}
	var canhelp = false;
	if (mydroid.order !== DORDER_BUILD &&
		mydroid.order !== DORDER_HELPBUILD &&
		mydroid.action !== DORDER_BUILD &&
		mydroid.action !== DORDER_HELPBUILD &&
		mydroid.order !== DORDER_LINEBUILD &&
		mydroid.order !== DORDER_RECYCLE &&
		mydroid.order !== DORDER_DEMOLISH &&
		mydroid.order !== DORDER_RTR &&
		mydroid.order !== DORDER_RTB &&
		droidCanReach(mydroid, bx, by)
	   ) { canhelp = true; }
	return canhelp;    //!droidNeedsRepair(mydroid.id, 80) &&
}

//Return all trucks that are not doing anything.
function findIdleTrucks(obj)
{
	if (DEBUG_EXTREME) {log("findIdleTrucks");}
	var builders = enumGroup(baseBuilders);
	var droidlist = [];
	if (obj == null)
	{
		obj = BASE;
	}

	for (let i = 0, d = builders.length; i < d; ++i)
	{
		if (conCanHelp(builders[i], obj.x, obj.y))
		{
			droidlist.push(builders[i]);
		}
	}

	return droidlist;
}

// Demolish object.
function demolishThis(object)
{
	if (DEBUG_EXTREME) {log("demolishThis");}
	var success = false;
	const droidList = findIdleTrucks(object);

	for (let i = 0, d = droidList.length; i < d; ++i)
	{
		if (orderDroidObj(droidList[i], DORDER_DEMOLISH, object))
		{
			success = true;
		}
	}

	return success;
}

// Build something. MaxBlockingTiles is optional.
function grabTrucksAndBuild(structure, maxBlockingTiles, x = null, y = null)
{
	if (DEBUG_EXTREME) {log("grabTrucksAndBuild");}
	if (!isStructureAvailable(structure))
	{
		return false;
	}

	if (!defined(maxBlockingTiles))
	{
		maxBlockingTiles = 1;
	}

	const droidList = findIdleTrucks();
	var found = false;

	for (let i = 0, d = droidList.length; i < d; ++i)
	{
		var result;
		if (x == null || y == null) { result = pickStructLocation(droidList[i], structure, lastBuildLoc.x, lastBuildLoc.y, maxBlockingTiles); }
		else { result = pickStructLocation(droidList[i], structure, x, y, maxBlockingTiles); }
		
		if (result)
		{
			//logObj(mydroid, "Construction work");
			if (orderDroidBuild(droidList[i], DORDER_BUILD, structure, result.x, result.y))
			{
				found = true;
				//orderTargets.add(dr.id, );
			}
		}
	}
	return found;
}

// Help finish building some object that is close to base.
function checkLocalJobs()
{
	if (DEBUG_EXTREME) {log("checkLocalJobs");}
	var trucks = findIdleTrucks();
	var freeTrucks = trucks.length;
	var success = false;
	var structlist = enumStruct(me).filter((obj) => (
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
				//logObj(trucks[j], "Go help construction");
				success = true;
			}
		}
	}

	return success;
}

// Use this to build a defense next to a derrick (that was taken before we got to build there)
// This can be called from eventStructureBuilt() to build a few defenses with a chance.
function scanAndDefendPosition(structure, droid)
{
	if (DEBUG_EXTREME) {log("scanAndDefendPosition");}
	if (!droid) {return;}

	const MAX_WALLS = 3;
	const MAX_TRAPS = 4;
	const MIN_DEFENSES = 1;
	const MAX_DEFENSES = 2;

	if (structure && (structure.stattype === FACTORY ||
		structure.stattype === CYBORG_FACTORY ||
		structure.stattype === VTOL_FACTORY ||
		structure.stattype === POWER_GEN ||
		structure.stattype === RESEARCH_LAB ||
		structure.stattype === HQ))
	{
		return; //do not waste time trying to defend basic base structures.
	}

	// if more free oil is visible take it
	var oils = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS+2, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
	var buildingoil = false;
	for (oil of oils)
	{
		if (tileIsBurning(oil.x, oil.y) === false && droidCanReach(droid, oil.x, oil.y))
		{
			orderDroidBuild(droid, DORDER_BUILD, DERRICK_STAT, oil.x, oil.y);
			logObj(droid, "building on nearby oil");
			return;
		}
	}

	// build oil defenses if we can afford them
	//if (countStruct(POW_GEN_STAT, me) < 3) { return; }
	if (getRealPower() < MIN_BUILD_POWER*4) { return; }

	var myDefenses = enumRange(droid.x, droid.y, 6, me, false).filter((obj) => (obj.type === STRUCTURE && obj.stattype === DEFENSE));
	var myDerricks = enumRange(droid.x, droid.y, 6, me, false).filter((obj) => (obj.type === STRUCTURE && obj.stattype === RESOURCE_EXTRACTOR));
	var enemyDerricks = enumRange(droid.x, droid.y, 8, ENEMIES, false).filter(isDerrick);

	// build at least MIN_DEFENSES defenses if there is any derrick
	if (myDefenses.length < MIN_DEFENSES && (myDerricks.length > 0 || enemyDerricks.length > 0))
	{
		buildDefenses(droid); // Build right where this droid is at.
		logObj(droid, "building min defenses near derrick");
		return;
	}	
	
	// build at least MIN_DEFENSES defenses per myderrick but not more than MAX_DEFENSES
	if (myDerricks.length > myDefenses.length && myDefenses.length < MAX_DEFENSES)
	{
		buildDefenses(droid); // Build right where this droid is at.
		logObj(droid, "building min one defenses per derrick");
		return;
	}	
	//maybe build tank traps if there are not many
	var myTraps = enumRange(droid.x, droid.y, 8, me, true).filter((obj) => (obj.type === STRUCTURE && obj.id === TANKTRAP_STAT));
	if (myDerricks.length > 0 && myTraps.length < MAX_TRAPS && isStructureAvailable(TANKTRAP_STAT, me) && random(100) < 50)
	{
		var result = pickStructLocation(droid, TANKTRAP_STAT, droid.x, droid.y, 1);
		if (result)
			{
				orderDroidBuild(droid, DORDER_BUILD, TANKTRAP_STAT, result.x, result.y);
				logObj(droid, "building tank trap near derrick");
				return;
			}
	}
	// don't bother building extra defenses if not enough funds
	if (getRealPower() < MIN_BUILD_POWER*10) {return;}
	
	// maybe build another defense if less than MAX_DEFENSES
	if (myDerricks.length > 0 && random(100) < 25 && myDefenses.length < MAX_DEFENSES)
	{
		buildDefenses(droid); // Build right where this droid is at.
		logObj(droid, "building another defense near derrick");
		return;
	}	
	
	//maybe build a wall if there are not many
	var myWalls = enumRange(droid.x, droid.y, 8, me, true).filter((obj) => (obj.type === STRUCTURE && obj.stattype === WALL));
	if (myDerricks.length > 0 && myWalls.length < MAX_WALLS && isStructureAvailable(HARDCRETE_WALL_STAT, me) && random(100) < 50)
	{
		var result = pickStructLocation(droid, HARDCRETE_WALL_STAT, droid.x, droid.y, 1);
		if (result)
			{
				orderDroidBuild(droid, DORDER_BUILD, HARDCRETE_WALL_STAT, result.x, result.y);
				logObj(droid, "building walls near derrick");
				return;
			}
		
	}
	
	//maybe build a sensor tower, but only one	
	var mySensors = enumRange(droid.x, droid.y, 12, me, true).filter((obj) => (obj.type === STRUCTURE && obj.isSensor === true));
	if (myDerricks.length > 0 && myDefenses.length < MAX_DEFENSES +1 && mySensors.length < 1 && random(100) < 20)
	{
		var sensor;
		for (let i = SENSOR_TOWERS.length - 1; i > -1; --i)
		{
			var sen = SENSOR_TOWERS[i];
			if (isStructureAvailable(sen))
			{
				sensor = sen;
				break;
			}
		}
		if (defined(sensor))
		{
			var result = pickStructLocation(droid, sensor, droid.x, droid.y, 1);
			if (result)
			{
				orderDroidBuild(droid, DORDER_BUILD, sensor, result.x, result.y);
				return;
			}
		}
	}
}

function bringBackOilBuilders()
{
	if (DEBUG_EXTREME) {log("bringBackOilBuilders");}
	var builders = enumGroup(oilBuilders);

	for (let i = 0, len = builders.length; i < len; ++i)
	{
		if (builders[i].order !== DORDER_BUILD &&
			builders[i].order !== DORDER_RTB &&
			builders[i].order !== DORDER_RECYCLE)
		{
			orderDroid(builders[i], DORDER_RTB);
		}
	}
}

function lookForOil()
{
	if (DEBUG_EXTREME) {log("lookForOil");}
	
	const UNSAFE_AREA_RANGE = 8;
	var droids = enumGroup(oilBuilders);
	var oils = enumFeature(ALL_PLAYERS, OIL_RES_STAT).sort(sortByDistToBase); // grab closer oils first;
	//if (gameTime < 180000) { oils = shuffleArray(oils); }

	var bestDroid = null;
	var bestDist = 99999;
	var success = false;
	//log("looking for oil... " + oils.length + " available");
	for (let i = 0, oilLen = oils.length; i < oilLen; ++i)
	{
		for (let j = 0, drLen = droids.length; j < drLen; ++j)
		{
			var droid = droids[j];
			if (droid.order === DORDER_RTR || droid.order === DORDER_RTB ) { continue; } 	// droidNeedsRepair(droid.id) === true ||

			var oil = oils[i];
			var dist = distBetweenTwoPoints(droid.x, droid.y, oil.x, oil.y);
			var unsafe = enumRange(oil.x, oil.y, UNSAFE_AREA_RANGE, ENEMIES, false).filter(isUnsafeEnemyObject);
			if (droidCanReach(droid, oil.x, oil.y) &&
				droid.order !== DORDER_BUILD && // but can snatch from HELPBUILD
				droid.order !== DORDER_LINEBUILD &&
				droid.order !== DORDER_RECYCLE &&
				droid.order !== DORDER_MOVE &&
				droid.order !== DORDER_RECOVER &&
				!droid.busy)
			{
				if (dist < bestDist && unsafe.length === 0)
				{
					bestDroid = droid;
					bestDist = dist;
				}
			}
		}

		if (bestDroid && !ThrottleThis("oil" + oil.y * mapWidth * oil.x, 20000))
		{
			bestDroid.busy = true;
			orderDroidBuild(bestDroid, DORDER_BUILD, DERRICK_STAT, oil.x, oil.y);
			orderLocations.set(bestDroid.id, {x: oil.x, y: oil.y, enemies: false});
			
			bestDist = 99999;
			bestDroid = null;
			success = true;
		}
	}

	return success;
}

function buildAntiAir(buildExtras)
{
	if (DEBUG_EXTREME) {log("buildAntiAir");}
	if (!defined(buildExtras))
	{
		buildExtras = false;
	}
	const MAX_DEFENSES = countStruct(FACTORY_STAT) + countStruct(CYBORG_FACTORY_STAT) + countStruct(VTOL_FACTORY_STAT);

	var antiAirs = enumStruct(me).filter((obj) => (obj.canHitAir === true && obj.canHitGround === false)).length;

	if (buildExtras === false && antiAirs+1 > MAX_DEFENSES)
	{
		return false;
	}

	for (let j = 0, s = SAM_SITES.length; j < s; ++j)
	{
		if (grabTrucksAndBuild(SAM_SITES[j], 1))
		{
			return true;
		}
	}

	return false;
}

// type refers to either a hardpoint like structure or an artillery emplacement.
// returns undefined if no structure it can build can be built.
function returnDefense(type)
{
	if (DEBUG_EXTREME) {log("returnDefense");}
	if (!defined(type))
	{
		type = random(2);
	}

	const LR_CHANCE = 50;
	var defenses;
	var bestDefense;
	var i = 0;
	var t = 0;

	if (type === 0 || !isStructureAvailable(ARTILLERY_DEFENSES[ARTILLERY_DEFENSES.length - 1]))
	{
		defenses = STANDARD_DEFENSES;
	}
	else
	{
		defenses = ARTILLERY_DEFENSES;
	}

	//Choose a long range defense if available
	if (random(100) < LR_CHANCE)
	{
		var avail = 0;
		for (i = 0, t = LR_DEFENSES.length; i < t; ++i)
		{
			if (isStructureAvailable(LR_DEFENSES[i]))
			{
				avail += 1;
			}
		}

		if (avail > 0)
		{
			defenses = LR_DEFENSES;
		}
	}

	for (i = 0, t = defenses.length; i < t; ++i)
	{
		if (isStructureAvailable(defenses[i]))
		{
			bestDefense = defenses[i];
			break;
		}
	}

	return bestDefense;
}

// Immediately try building a defense near this truck.
function buildDefenseNearTruck(truck, type)
{
	if (DEBUG_EXTREME) {log("buildDefenseNearTruck");}
	if (!defined(type))
	{
		type = 0;
	}

	var defense = returnDefense(type);

	if (defined(defense))
	{
		var result = pickStructLocation(truck, defense, truck.x, truck.y, 1);
		if (result)
		{
			return orderDroidBuild(truck, DORDER_BUILD, defense, result.x, result.y);
		}
	}

	return false;
}

// Passing a truck will instruct that truck to pick
// a location to build a defense structure near it.
function buildDefenses(truck)
{
	if (DEBUG_EXTREME) {log("buildDefenses");}
	if (defined(truck))
	{
		return buildDefenseNearTruck(truck, 0);
	}

	if (getRealPower() > MIN_BUILD_POWER)
	{
		var def = returnDefense();
		if (defined(def))
		{
			return grabTrucksAndBuild(def, 0);
		}
	}

	return false;
}

// If we need power generators, try to queue up production of them with any idle trucks
//function buildPowerGen()
//{
//	return ((!countStruct(POW_GEN_STAT) || (numUnusedDerricks() > 0)) && grabTrucksAndBuild(POW_GEN_STAT, 1));
//}

//swap the roles of all the trucks to be oil grabbers after building one power generator.
function changeTruckRoleOnce()
{
	if (DEBUG_EXTREME) {log("changeTruckRoleOnce");}
	if (truckRoleSwapped === true)
	{
		return false;
	}

	var completeGen = enumStruct(me, POW_GEN_STAT).filter((obj) => (
		obj.status === BUILT
	));

	if (completeGen.length > 0 && countDroid(DROID_CONSTRUCT, me) < 5)
	{
		enumDroid(me).forEach((dr) => {
			if (dr.droidType === DROID_CONSTRUCT && dr.group === baseBuilders)
			{
				//orderDroid(dr, DORDER_STOP);
				//eventDroidBuilt(dr, null);
				groupAdd(oilBuilders, dr)
			}
		});
		truckRoleSwapped = true;
		return true;
	}

	return false;
}

// Base build scheme
function buildBasicBase()
{
	if (DEBUG_EXTREME) {log("buildBasicBase");}

	/// build 1 factory first
	if (countStruct(FACTORY_STAT) === 0 && grabTrucksAndBuild(FACTORY_STAT, 1))
	{
		return true;
	}
	// build vtol support early at game start if available
	if (relyOnVtols && gameTime < 30000 && isStructureAvailable(VTOL_FACTORY_STAT) && countStruct(VTOL_FACTORY_STAT) === 0 && grabTrucksAndBuild(VTOL_FACTORY_STAT, 1))
	{
		return true;
	}
	// build cyborg factory early if not relying on vtols
	if (!relyOnVtols && gameTime < 30000 && isStructureAvailable(CYBORG_FACTORY_STAT) && countStruct(CYBORG_FACTORY_STAT) < 1 && grabTrucksAndBuild(CYBORG_FACTORY_STAT, 1))
	{
		return true;
	}
	/// build two power generators
	if (countStruct(POW_GEN_STAT) < 2 && grabTrucksAndBuild(POW_GEN_STAT, 1))
	{
		return true;
	}
	// build HQ early if relyOnVtols, as building vtols without plans is not possible for human player
	if (relyOnVtols && gameTime < 30000 && countStruct(PLAYER_HQ_STAT) === 0 && grabTrucksAndBuild(PLAYER_HQ_STAT, 1))
	{
		return true;
	}
	/// build one lab
	if (!researchDone && countStruct(RES_LAB_STAT) === 0 && grabTrucksAndBuild(RES_LAB_STAT, 1))
	{
		return true;
	}
	/// if we have excess derricks build more power
	if (countStruct(DERRICK_STAT)/4 > countStruct(POW_GEN_STAT) && grabTrucksAndBuild(POW_GEN_STAT, 1))
	{
		return true;
	}
	// build another factory if repair turret not available is low tech
	if (!componentAvailable("LightRepair1") && countStruct(FACTORY_STAT) < 2 && grabTrucksAndBuild(FACTORY_STAT, 1))
	{
		return true;
	}
	// Build HQ because human player can't make designs without it
	if (countStruct(PLAYER_HQ_STAT) === 0 && grabTrucksAndBuild(PLAYER_HQ_STAT, 1)) //
	{
		return true;
	}

	return false;
}

//Build factories. Attempts to build at least 1 of each factory.
function factoryBuildOrder()
{
	if (DEBUG_EXTREME) {log("factoryBuildOrder");}
	var FAC_ORDER = [FACTORY_STAT, CYBORG_FACTORY_STAT, VTOL_FACTORY_STAT];
	if (relyOnVtols) { FAC_ORDER = [VTOL_FACTORY_STAT, FACTORY_STAT, CYBORG_FACTORY_STAT]; }

	for (let x = 0; x < 2; ++x)
	{
		var num = 1;
		if (x > 0)
		{
			var derrNum = countStruct(DERRICK_STAT);
			if (derrNum >= 40)
			{
				num = 3;
			}
			else if (derrNum >= 24)
			{
				num = 2;
			}
			else if (derrNum >= 12)
			{
				num = 1;
			}
		}

		for (let i = 0; i < 3; ++i)
		{
			var fac = FAC_ORDER[i];
			if (fac === VTOL_FACTORY_STAT && !relyOnVtols && gameTime < 300000) { return false; }
			if (fac === CYBORG_FACTORY_STAT && relyOnVtols && gameTime < 300000) { return false; }
			if (!(fac === CYBORG_FACTORY_STAT && isSeaMap) && countStruct(fac) < num && grabTrucksAndBuild(fac, 0))
			{
				return true;
			}
		}
	}

	return false;
}

// Decide when to build the last few research labs.
function buildResearchLabs()
{
	if (DEBUG_EXTREME) {log("buildResearchLabs");}
	if (researchDone)
	{
		return false;
	}

	var resCount = countStruct(RES_LAB_STAT);
	if (resCount < getStructureLimit(RES_LAB_STAT))
	{
		var amount = 3;
		var derrCount = countStruct(DERRICK_STAT);
		if (derrCount >= 40)
		{
			amount = 20;
		}
		else if(derrCount >= 24)
		{
			amount = 10;
		}		
		else if (derrCount >= 14)
		{
			amount = 5;
		}
		else if (derrCount >= 9)
		{
			amount = 4;
		}
		if (resCount < amount && grabTrucksAndBuild(RES_LAB_STAT, 1))
		{
			return true;
		}
	}

	return false;
}

function buildVTOLpads()
{
	if (DEBUG_EXTREME) {log("buildVTOLpads");}
	var vtolFacs = enumStruct(me, VTOL_FACTORY_STAT).sort(sortByDistToBase);
	var Labs = enumStruct(me, RES_LAB_STAT);
	var vploc = [];
	var randvf;

	if (Labs[0]) { randvf = Labs[random(Labs.length-1)]; }
	if (randvf) { vploc = {x: randvf.x, y: randvf.y}; }
	else {vploc = {x: lastBuildLoc.x, y: lastBuildLoc.y}; }

	// build one pad if there is a vtol factory
	if (isStructureAvailable(VTOL_PAD_STAT) && countStruct(VTOL_FACTORY_STAT) > 0 && countStruct(VTOL_PAD_STAT) < 1 && grabTrucksAndBuild(VTOL_PAD_STAT, 2))
	{
		return true;
	}
	//Build VTOL pads if needed
	var pad_mult = 0.5; // basic pad
	if (!findResearch("R-Struc-VTOLPad-Upgrade01")) { pad_mult = 0.4; }
	if (!findResearch("R-Struc-VTOLPad-Upgrade04")) { pad_mult = 0.3; }
	if (!findResearch("R-Struc-VTOLPad-Upgrade06")) { pad_mult = 0.25; }

	var needVtolPads = countStruct(VTOL_PAD_STAT) < pad_mult * groupSize(vtolGroup);

	if (isStructureAvailable(VTOL_PAD_STAT) && needVtolPads && grabTrucksAndBuild(VTOL_PAD_STAT, 1, vploc.x, vploc.y))
	{
		return true;
	}
}

function buildRepairFac()
{
		if (isStructureAvailable(REPAIR_FACILITY_STAT) && countStruct(REPAIR_FACILITY_STAT) < (countStruct(FACTORY_STAT) + countStruct(CYBORG_FACTORY_STAT))/3)
		{
			grabTrucksAndBuild(REPAIR_FACILITY_STAT, 8);
			return true;
		}
	return false;
}

function buildFundamentals()
{
	if (DEBUG_EXTREME) {log("buildFundamentals");}
	// Help build unfinished buildings
	if (checkLocalJobs()) {return;}
	if (relyOnVtols && buildVTOLpads()) {return;}
	if (buildBasicBase()) {return;}

	buildFundamentals2(); // go on to the next level
}

function buildFundamentals2()
{
	if (DEBUG_EXTREME) {log("buildFundamentals2");}

	if (enemyHasVtol && buildAntiAir(false)) { return; }
	if (buildVTOLpads()) { return; }
	if (factoryBuildOrder()) { return; }
	if (buildResearchLabs()) { return; }
	if (buildRepairFac()) { return; }
	if (getRealPower() < MIN_BUILD_POWER*4) { return false; }
	if (buildLassat()) { return; }

	if (isStructureAvailable(UPLINK_STAT) && countStruct(UPLINK_STAT) === 0 && grabTrucksAndBuild(UPLINK_STAT, 1))
	   { return; }

	checkResearchCompletion();
}

function buildLassat()
{
	if (isStructureAvailable(LASSAT_STAT) && countStruct(LASSAT_STAT) === 0)
	{
		// how to find location away from other base structures but not too far away?
		var buildloc = {x: lastBuildLoc.x+(random(30)-15), y: lastBuildLoc.y+(random(30)-15)}
		grabTrucksAndBuild(LASSAT_STAT, 0, buildloc.x, buildloc.y);
		return true;
	}
	return false;
}

// Salvage research labs if there is nothing more to research.
function checkResearchCompletion()
{
	if (DEBUG_EXTREME) {log("checkResearchCompletion");}
	var reslist = enumResearch();
	//Sometimes early in T1 no bases it demolishes a lab because it is researching all
	//available tech. So at least wait until Dragon body is obtained before checking this.
	if (componentAvailable("Body14SUP") && reslist.length === 0)
	{
		//log("Done researching - salvage unusable buildings");
		researchDone = true; // and do not rebuild them
		var labList = enumStruct(me, RES_LAB_STAT);
		for (let i = 0, l = labList.length; i < l; ++i)
		{
			var lab = labList[i];
			if (!structureIdle(lab))
			{
				continue;
			}
			if (demolishThis(lab))
			{
				break;
			}
		}
	}
}

// function to find oil clusters not in an occupied base
function findOilClusters()
{
	if (DEBUG_EXTREME) {log("findOilClusters");}
	var oils = enumFeature(ALL_PLAYERS, OIL_RES_STAT).sort(sortByDistToBase);
	if (!oils) {return false;}
	var oilClusterLocations = new Map();
	for (oil of oils)
	{
		var oil_cluster = enumRange(oil.x, oil.y, 10, ALL_PLAYERS, false).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
		if (oil_cluster && oil_cluster.length >= 3)
		{
			//log("findOilClusters found oil cluster at:"+oil.x+"x"+oil.y);
			// check if in an occupied base
			var cluster_in_base = false;
			for (base of startPositions)
			{
				if (distBetweenTwoPoints(oil.x, oil.y, base.x, base.y) < AVG_BASE_RADIUS+10) { cluster_in_base = true; }
			}
			if (cluster_in_base === false)
			{
				oilClusterLocations.set(oil.id, {x: oil.x, y: oil.y, count: oil_cluster.length});
				//log("findOilClusters found oil cluster not in a base at:"+oil.x+"x"+oil.y);
			}
		}
	}
	if (oilClusterLocations.size > 0) 
	{return oilClusterLocations;}
	return false;
}

function getLargestOilClusterID()
{
	if (DEBUG_EXTREME) {log("getLargestOilClusterID");}
	var oilclusters = findOilClusters();
	if (oilclusters && oilclusters.size > 0)
	{
		log("getLargestOilClusterID processing clusters");
		var largest = 2;
		var largest_id = null;
		oilclusters.forEach((value, key) => 
		{
			if (value.count > largest)
			{
				largest = value.count;
				largest_id = key;
			}
		});
		if (largest >= 3) 
		{ 
			log("getLargestOilClusterID found large oil cluster ID:"+largest_id);
			return largest_id; 
		} 
	}
	return false;
}

function idleConstructor(droid)
{
	if (DEBUG_EXTREME) {log("idleConstructor");}

	if (!droid || droid.id == null) { return; }
	if (ThrottleThis("truck"+droid.id+"throttle", 5000)) { return; }
	
	const dr = droid;

	// build on nearby oil
	var nearbyoil = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS*1, me, false).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
	if (nearbyoil && nearbyoil.length > 0 ) // && tileIsBurning(nearbyoil[0].x, nearbyoil[0].y) === false
	{
		var enemies = enumRange(nearbyoil[0].x, nearbyoil[0].y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => 
				(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
		
		if (!enemies[0])
		{
			orderDroidBuild(droid, DORDER_BUILD, RESOURCE_EXTRACTOR, nearbyoil[0].x, nearbyoil[0].y);
			orderLocations.set(droid.id, {x: nearbyoil[0].x, y: nearbyoil[0].y, enemies: false});
			logObj(droid, "idle truck building on nearby undefended oil");
			return true;
		}
	}
	
	// upgrade power plants
	var upgradePower = enumStruct(me, POWER_GEN).filter((obj) => (obj.modules === 0));
	if (droid.group == baseBuilders && upgradePower && upgradePower.length > 0 && isStructureAvailable("A0PowMod1"))
	{
		orderDroidBuild(droid, DORDER_BUILD, "A0PowMod1", upgradePower[0].x, upgradePower[0].y);
		orderLocations.set(dr.id, {x: upgradePower[0].x, y: upgradePower[0].y, enemies: false});
		logObj(droid, "idle truck upgrading power");
		return true;
	}
	
	// basebuilders maintain base defenses
	var baseOils = enumRange(BASE.x, BASE.y, AVG_BASE_RADIUS, me, false).filter((obj) => (obj.stattype === RESOURCE_EXTRACTOR));
	baseOils.sort(sortByDistToBase);
	
	if (getRealPower() > MIN_BUILD_POWER*2 && droid.group === baseBuilders && gameTime > 60000 && countStruct(POW_GEN_STAT, me) > 0 && baseOils && baseOils.length > 0)
	{
		// every baseoil should be covered by one defense prefer artillery
		for (baseOil of baseOils)
		{
			//log("baseOil:"+JSON.stringify(baseOil));		
			var defenses = enumRange(baseOil.x, baseOil.y, 7, me, false).filter((obj) => (obj.stattype === DEFENSE));
			if (!defenses.length)
			{
				var defense = returnDefense(1);
				if (!defense)
				{
					defense = returnDefense(0);
				}
				if (defined(defense))
				{
					var buildloc = pickStructLocation(droid, defense, baseOil.x, baseOil.y, 1);
				}
				
				if (buildloc)
				{	
					orderDroidBuild(droid, DORDER_BUILD, defense, buildloc.x, buildloc.y);
					orderLocations.set(dr.id, {x: buildloc.x, y: buildloc.y, enemies: false});
					logObj(droid, "idle oilbuilder building base defense");
					continue;
				}
			}
		}
	}

	// decide which facts to upgrade first
	if (relyOnVtols)
	{
		// basebuilders upgrade air factories, but only if there is at least 1 power plants and one hq
		var upgradeFac = enumStruct(me, VTOL_FACTORY_STAT).filter((obj) => (obj.modules < 2));
		if (droid.group == baseBuilders  && countStruct(POW_GEN_STAT) > 0 && countStruct(PLAYER_HQ_STAT) > 0 && upgradeFac && upgradeFac.length > 0 && isStructureAvailable("A0FacMod1"))
		{

			orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", upgradeFac[0].x, upgradeFac[0].y);
			orderLocations.set(dr.id, {x: upgradeFac[0].x, y: upgradeFac[0].y, enemies: false});
			logObj(droid, "idle truck upgrading tank factory");
			return true;

		}
		// basebuilders upgrade tank factories, but only if there is at least 1 power plants and one hq
		var upgradeFac = enumStruct(me, FACTORY_STAT).filter((obj) => (obj.modules < 2));
		if (droid.group == baseBuilders && countStruct(POW_GEN_STAT) > 0 && countStruct(PLAYER_HQ_STAT) > 0 && upgradeFac && upgradeFac.length > 0 && isStructureAvailable("A0FacMod1"))
		{
			orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", upgradeFac[0].x, upgradeFac[0].y);
			orderLocations.set(dr.id, {x: upgradeFac[0].x, y: upgradeFac[0].y, enemies: false});
			logObj(droid, "idle truck upgrading tank factory");
			return true;
		}
	}
	else
	{
		// basebuilders upgrade tank factories, but only if there is at least 1 power plants and one hq
		var upgradeFac = enumStruct(me, FACTORY_STAT).filter((obj) => (obj.modules < 2));
		if (droid.group == baseBuilders && countStruct(POW_GEN_STAT) > 0 && countStruct(PLAYER_HQ_STAT) > 0 && upgradeFac && upgradeFac.length > 0 && isStructureAvailable("A0FacMod1"))
		{
			orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", upgradeFac[0].x, upgradeFac[0].y);
			orderLocations.set(dr.id, {x: upgradeFac[0].x, y: upgradeFac[0].y, enemies: false});
			logObj(droid, "idle truck upgrading tank factory");
			return true;
		}
		// basebuilders upgrade air factories, but only if there is at least 1 power plants and one hq
		// and after vtol pads built if available
		var upgradeFac = enumStruct(me, VTOL_FACTORY_STAT).filter((obj) => (obj.modules < 2));
		if (droid.group == baseBuilders  && countStruct(POW_GEN_STAT) > 0 && countStruct(PLAYER_HQ_STAT) > 0 && upgradeFac && upgradeFac.length > 0 && isStructureAvailable("A0FacMod1"))
		{
			orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", upgradeFac[0].x, upgradeFac[0].y);
			orderLocations.set(dr.id, {x: upgradeFac[0].x, y: upgradeFac[0].y, enemies: false});
			logObj(droid, "idle truck upgrading tank factory");
			return true;
		}
	}
	// basebuilders upgrade research
	var upgradeRes = enumStruct(me, RES_LAB_STAT).filter((obj) => (obj.modules === 0));
	if (droid.group == baseBuilders && upgradeRes && upgradeRes.length > 0 && isStructureAvailable("A0ResearchModule1"))
	{
		orderDroidBuild(droid, DORDER_BUILD, "A0ResearchModule1", upgradeRes[0].x, upgradeRes[0].y);
		orderLocations.set(dr.id, {x: upgradeRes[0].x, y: upgradeRes[0].y, enemies: false});
		logObj(droid, "idle truck upgrading research");
		return true;
	}	
	
	// done with basebuilders
	if (droid.group == baseBuilders) { return; }

	// try to grab undefended ememy oil
	var enemyUndefendedoil = getUndefendedOil(droid);
	if (enemyUndefendedoil && enemyUndefendedoil.length > 0)
	{
		var defense_grab = returnDefense();
		if (defense_grab)
		{
			var enemies = enumRange(enemyUndefendedoil.x, enemyUndefendedoil.y, GROUP_SCAN_RADIUS*1.2, ENEMIES, true).filter((obj) =>
					(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
			var mydefenses = enumRange(enemyUndefendedoil.x, enemyUndefendedoil.y, 8, me, true).filter((obj) => (obj.stattype === DEFENSE));

			if (!enemies[0] && !mydefenses[0])
			{
				var buildloc = pickStructLocation(droid, defense_grab, enemyUndefendedoil.x, enemyUndefendedoil.y, 1);
				if (buildloc && buildloc.x)
				{
					orderDroidBuild(droid, DORDER_BUILD, defense_grab, buildloc.x, buildloc.y);
					orderLocations.set(droid.id, {x: buildloc.x, y: buildloc.y, enemies: false});
					logObj(droid, "idle truck building defense near enemy undefended oil");
					return true;
				}
			}
		}
	}

	//scout to damaged defense
	var damagedDefenses = enumStruct(me, DEFENSE).filter((obj) => (obj.health < 70 && obj.stattype === DEFENSE && obj.status === BUILT)).sort(sortByDistToBase);
	if (damagedDefenses && damagedDefenses.length > 0)
	{
		var enemies = enumRange(damagedDefenses[0].x, damagedDefenses[0].y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => 
				(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
		
		if (!enemies[0])
		{
			orderDroidLoc(droid, DORDER_SCOUT, damagedDefenses[0].x, damagedDefenses[0].y);
			logObj(droid,"idle truck scout damagedDefenses: "+damagedDefenses[0].x+"x"+damagedDefenses[0].y);
			orderLocations.set(dr.id, {x: damagedDefenses[0].x, y: damagedDefenses[0].y, enemies: false});
			return true;
		}
	}
	
	// scout to unfinished defense -- this makes them helpbuild too
	var unfinishedDefenses = enumStruct(me, DEFENSE).filter((obj) => (obj.stattype === DEFENSE && obj.status !== BUILT));
	if (unfinishedDefenses && unfinishedDefenses.length > 0)
	{
		var enemies = enumRange(unfinishedDefenses[0].x, unfinishedDefenses[0].y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => 
				(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
		
		if (!enemies[0])
		{
			orderDroidLoc(droid, DORDER_SCOUT, unfinishedDefenses[0].x, unfinishedDefenses[0].y);
			logObj(droid,"idle truck scout unfinishedDefenses: "+unfinishedDefenses[0].x+"x"+unfinishedDefenses[0].y);
			orderLocations.set(dr.id, {x: unfinishedDefenses[0].x, y: unfinishedDefenses[0].y, enemies: false});
			return true;
		}
	}
	
	// scout to nearby finished defense
	var defenses = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.stattype === DEFENSE && obj.status === BUILT));
	if (defenses && defenses.length > 0)
	{
		var enemies = enumRange(defenses[0].x, defenses[0].y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => 
				(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
		
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
		// put idle oil truck on patrol

		logObj(droid,"idle oilbuilder nothing safe to do");
		return false;
	}
}

function getUndefendedOil(droid)
{
	if (DEBUG_EXTREME) {log("getUndefendedOil");}
	// first check for nearby undefended oil
	var oils = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS*3, ENEMIES, false).filter((obj) => (obj.stattype === RESOURCE_EXTRACTOR));
	var defendoil = [];
	
	for (oil of oils)
	{
		var defenses = enumRange(oil.x, oil.y, 8, ENEMIES, false).filter((obj) => (obj.stattype === DEFENSE && obj.status === BUILT));
		if (!defenses[0])
		{
			defendoil = {x: oil.x, y: oil.y, id: oil.id}
			return defendoil;
		}
	}
	
	// then check every one 
	var enemy_derricks = [];
	const players = getAliveEnemyPlayers();
	for (player of players)
	{
		if (!allianceExistsBetween(me, player)) // enemy player
		{
			enemy_derricks = enemy_derricks.concat(enumStruct(player, RESOURCE_EXTRACTOR));
		}
	}
	
	enemy_derricks.sort((obj1, obj2) => 
	{ 
		var dist1 = distBetweenTwoPoints(droid.x, droid.y, obj1.x, obj1.y);
		var dist2 = distBetweenTwoPoints(droid.x, droid.y, obj2.x, obj2.y);
		return (dist1 - dist2);
	} )
	
	for (oil of enemy_derricks)
	{
		var defenses = enumRange(oil.x, oil.y, 8, ENEMIES, false).filter((obj) => (obj.stattype === DEFENSE));
		if (!defenses[0])
		{
			defendoil = {x: oil.x, y: oil.y, id: oil.id}
			return defendoil;
		}
	}

	return false;
}
