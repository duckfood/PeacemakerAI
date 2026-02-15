
const standardDefenses = [
	"WallTower-PulseLas",
	"WallTower-HPVcannon",
	"WallTower02",
	"GuardTower1",
];
const artilleryDefenses = [
	"Emplacement-Howitzer-Incendiary",	
	"Emplacement-MortarPit-Incendiary",
	"Emplacement-MortarPit01",
];
const ELECTRONIC_DEFENSES = [
	"Sys-SpyTower",
	"WallTower-EMP",
	"Emplacement-MortarEMP"
];

// If positive, there are oil derricks that unused due to lack of power generators.
// If negative, we have too many power generator (usually not a problem in itself).
function numUnusedDerricks()
{
	return countStruct(DERRICK_STAT) - countStruct(POW_GEN_STAT) * 4;
}

function conCanHelp(mydroid, bx, by)
{
	return (mydroid.order !== DORDER_BUILD &&
		mydroid.order !== DORDER_HELPBUILD &&
		// mydroid.order !== DORDER_LINEBUILD &&
		mydroid.order !== DORDER_RECYCLE &&
		mydroid.order !== DORDER_DEMOLISH &&
		mydroid.order !== DORDER_RTR &&
		mydroid.order !== DORDER_RTB &&
		!droidNeedsRepair(mydroid.id, 80) &&
		droidCanReach(mydroid, bx, by)
	);
}

//Return all trucks that are not doing anything.
function findIdleTrucks(obj)
{
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
			}
		}
	}
	return found;
}

// Help finish building some object that is close to base.
function checkLocalJobs()
{
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
	if (!droid)
	{
		return;
	}

	const MAX_WALLS = 3;
	const MAX_TRAPS = 3;
	
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
	
	if (countStruct(POW_GEN_STAT, me) < 2) { return; }

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

	// if more free oil is visible take it
	var oils = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS+4, ALL_PLAYERS, false).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
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

	// don't bother building extra defenses if not enough funds
	if (getRealPower() < MIN_BUILD_POWER) {return;}
	
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

	//maybe build tank traps if there are not many
	var myTraps = enumRange(droid.x, droid.y, 8, me, true).filter((obj) => (obj.type === STRUCTURE && obj.id === "A0TankTrap"));
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

function skipOilGrabIfEasy()
{
	if (difficulty === EASY)
	{
		var myDerrickCount = enumStruct(me, DERRICK_STAT).filter((obj) => (
			obj.status === BUILT
		)).length;
		var enemies = getAliveEnemyPlayers();

		for (let i = 0, len = enemies.length; i < len; ++i)
		{
			if (myDerrickCount >= 5 && myDerrickCount >= countStruct(DERRICK_STAT, enemies[i]) && enemies[i] !== scavengerPlayer)
			{
				bringBackOilBuilders();
				return true;
			}
		}
	}

	return false;
}

function lookForOil()
{
	if (skipOilGrabIfEasy())
	{
		return;
	}
	
	const UNSAFE_AREA_RANGE = 8;
	var droids = enumGroup(oilBuilders);
	var oils = enumFeature(ALL_PLAYERS, OIL_RES_STAT).sort(sortByDistToBase); // grab closer oils first;
	var bestDroid = null;
	var bestDist = 99999;
	var success = false;
	//log("looking for oil... " + oils.length + " available");
	for (let i = 0, oilLen = oils.length; i < oilLen; ++i)
	{
		for (let j = 0, drLen = droids.length; j < drLen; ++j)
		{
			var droid = droids[j];
			if (droidNeedsRepair(droid.id) === true || droid.order === DORDER_RTR || droid.order === DORDER_RTB ) { continue; }
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
	if (!defined(buildExtras))
	{
		buildExtras = false;
	}
	const MAX_DEFENSES = countStruct(FACTORY_STAT) + countStruct(CYBORG_FACTORY_STAT) + 1;
	const SAM_SITES = ["P0-AASite-SAM2", "P0-AASite-Laser", "AASite-QuadBof02", "AASite-QuadBof"];
	var antiAirs = enumStruct(me).filter((obj) => (obj.canHitAir === true && obj.canHitGround === false)).length;

	if (buildExtras === false && antiAirs > MAX_DEFENSES)
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
	if (!defined(type))
	{
		type = random(2);
	}

	const ELECTRONIC_CHANCE = 15;
	var defenses;
	var bestDefense;
	var i = 0;
	var t = 0;

	if (type === 0 || !isStructureAvailable(artilleryDefenses[artilleryDefenses.length - 1]))
	{
		defenses = standardDefenses;
	}
	else
	{
		defenses = artilleryDefenses;
	}

	//Choose a random electronic warfare defense if possible.
	if (random(100) < ELECTRONIC_CHANCE)
	{
		var avail = 0;
		for (i = 0, t = ELECTRONIC_DEFENSES.length; i < t; ++i)
		{
			if (isStructureAvailable(ELECTRONIC_DEFENSES[i]))
			{
				avail += 1;
			}
		}

		if (avail > 0)
		{
			defenses = [];
			defenses.push(ELECTRONIC_DEFENSES[random(avail)]);
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
function buildPowerGen()
{
	return ((!countStruct(POW_GEN_STAT) || (numUnusedDerricks() > 0)) && grabTrucksAndBuild(POW_GEN_STAT, 1));
}

//swap the roles of all the trucks to be oil grabbers after building one power generator.
function changeTruckRoleOnce()
{
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

// Basic base design so as to survive in a no bases match.
function buildBasicBase()
{
	// if we have excess derricks build more power
	if (countStruct(DERRICK_STAT)/4 > countStruct(POW_GEN_STAT) && grabTrucksAndBuild(POW_GEN_STAT, 2))
	{
		return true;
	}
	// build 1 factories
	if (countStruct(FACTORY_STAT) < 1 && grabTrucksAndBuild(FACTORY_STAT, 3))
	{
		return true;
	}
	//If we start on T2/T3 no bases then build a few power generators early.
	if (getMultiTechLevel() > 1 && baseType === CAMP_CLEAN && countStruct(POW_GEN_STAT) < 2 && grabTrucksAndBuild(POW_GEN_STAT, 1))
	{
		return true;
	}

	if (!researchDone && countStruct(RES_LAB_STAT) < 2 && grabTrucksAndBuild(RES_LAB_STAT, 2))
	{
		return true;
	}
	
	// Build HQ if missing
	if (countStruct(PLAYER_HQ_STAT) === 0 && grabTrucksAndBuild(PLAYER_HQ_STAT, 2, BASE.x, BASE.y)) // 
	{
		return true;
	}
	
	if (countStruct(POW_GEN_STAT) < 2 && grabTrucksAndBuild(POW_GEN_STAT, 2))
	{
		return true;
	}

	if (!researchDone && countStruct(RES_LAB_STAT) < 3 && grabTrucksAndBuild(RES_LAB_STAT, 2))
	{
		return true;
	}

	if (buildPowerGen())
	{
		return true;
	}

	return false;
}

//Build factories. Attempts to build at least 1 of each factory.
function factoryBuildOrder()
{
	const FAC_ORDER = [VTOL_FACTORY_STAT, FACTORY_STAT, CYBORG_FACTORY_STAT];
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
			if (!(fac === CYBORG_FACTORY_STAT && isSeaMap) && countStruct(fac) < num && grabTrucksAndBuild(fac, 1, BASE.x, BASE.y))
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

function buildFundamentals()
{
	// Help build unfinished buildings
	if (checkLocalJobs())
	{
		return;
	}
	if (buildBasicBase())
	{
		return;
	}

//	if (changeTruckRoleOnce())
//	{
//		return;
//	}
//
	buildFundamentals2(); // go on to the next level
}

function buildFundamentals2()
{
	var repairfacs = enumStruct(me, REPAIR_FACILITY_STAT).sort(sortByDistToBase);
	var vtolFacs = enumStruct(me, VTOL_FACTORY_STAT).sort(sortByDistToBase);
	var Labs = enumStruct(me, RES_LAB_STAT);
	
	var vploc = [];
	var randvf;
	//if (repairfacs[0]) { vploc = {x: repairfacs[0].x, y: repairfacs[0].y}; }
	if (Labs[0]) { randvf = Labs[random(Labs.length-1)]; }
	if (randvf) { vploc = {x: randvf.x, y: randvf.y}; }
	else {vploc = {x: lastBuildLoc.x, y: lastBuildLoc.y}; }
	
	//Build VTOL pads if needed 
	var pad_mult = 1.4; // basic pad
	if (!findResearch("R-Struc-VTOLPad-Upgrade01")) { pad_mult = 1.2; }
	if (!findResearch("R-Struc-VTOLPad-Upgrade04")) { pad_mult = 1; }
	if (!findResearch("R-Struc-VTOLPad-Upgrade06")) { pad_mult = 0.8; }
	
	var needVtolPads = pad_mult * countStruct(VTOL_PAD_STAT) < groupSize(vtolGroup);

	if (isStructureAvailable(VTOL_PAD_STAT) && needVtolPads && grabTrucksAndBuild(VTOL_PAD_STAT, 1, vploc.x, vploc.y))
	{
		return;
	}
	
	if (isStructureAvailable(VTOL_FACTORY_STAT) && countStruct(VTOL_FACTORY_STAT) === 0 && grabTrucksAndBuild(VTOL_FACTORY_STAT, 1))
	{
		return;
	}	
	
	if (isStructureAvailable(LASSAT_STAT) && countStruct(LASSAT_STAT) === 0)
	{	
		// how to find location away from other base structures but not too far away?
		var buildloc = {x: lastBuildLoc.x+random(12), y: lastBuildLoc.y+random(12)}
		grabTrucksAndBuild(LASSAT_STAT, 0, buildloc.x, buildloc.y);
		return;
	}

	//Build VTOL pads if there are vtol factories
	var needVtolPads = countStruct(VTOL_FACTORY_STAT)*1 > countStruct(VTOL_PAD_STAT);

	if (isStructureAvailable(VTOL_PAD_STAT) && needVtolPads && grabTrucksAndBuild(VTOL_PAD_STAT, 1, vploc.x, vploc.y))
	{
		return;
	}

	if (factoryBuildOrder())
	{
		return;
	}

	// throttle building if repair turret and light cannon are available but attackgroup is too small to defend
//	if (componentAvailable("LightRepair1") && componentAvailable("Cannon1Mk1") && getRealPower() < 200 && groupSize(attackGroup) + groupSize(vtolGroup) < MIN_GROUND_UNITS)
//	{
//		log("throttle building -- attackgroups too small attackGroup:"+groupSize(attackGroup));
//		return;
//	}
	
	if (buildResearchLabs())
	{
		return;
	}
	// build command relay post when turret is available and there are plenty of ground units
//	const adroids = enumGroup(attackGroup).concat(enumGroup(defendGroup)).concat(enumGroup(commanderGroup));
//	if (componentAvailable(COMMAND_TURRET) && countStruct(RELAY_POST_STAT) < 1 && adroids && adroids.length > 5)
//	{
//		grabTrucksAndBuild(RELAY_POST_STAT, 0, lastBuildLoc.x, lastBuildLoc.y);
//		return;
//	}

	
	if (getRealPower() < MIN_BUILD_POWER) { return false; }
	
//	if (maintenance())
//	{
//		return;
//	}
	
//	if (countStruct(REPAIR_FACILITY_STAT) < countStruct(FACTORY_STAT)/2 && grabTrucksAndBuild(REPAIR_FACILITY_STAT, 4))
//	{
//		return;
//	}

	if (countStruct(UPLINK_STAT) === 0 && grabTrucksAndBuild(UPLINK_STAT, 1))
	{
		return;
	}
	//build minimum anti-air defenses in base
	if (enemyHasVtol && buildAntiAir(false))
	{
		return;
	}
	//Build defenses in base.
	if (getRealPower() > MIN_BUILD_POWER*8 && random(100) < 5 && buildAntiAir(true))
	{
		return;
	}

	if (getRealPower() > MIN_BUILD_POWER*16 && buildDefenses())
	{
		return;
	}

	//log("All fundamental buildings built -- proceed to military stuff");
}

// Salvage research labs if there is nothing more to research.
function checkResearchCompletion()
{
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

// Build modules and check research completion.
function maintenance()
{
	if (countStruct(POW_GEN_STAT) === 0)
	{
		return false;
	}
	//log("Maintenance check");
	const MIN_POWER_FOR_MODULE = -40;
	var struct = null;
	var module = "";
	var structList = [];
	var success = false;
	var modList = [
		{"mod": "A0FacMod1", "amount": 2, "structure": VTOL_FACTORY_STAT},
		{"mod": "A0PowMod1", "amount": 1, "structure": POW_GEN_STAT},
		{"mod": "A0FacMod1", "amount": 2, "structure": FACTORY_STAT},
		{"mod": "A0ResearchModule1", "amount": 1, "structure": RES_LAB_STAT}
	];

	for (let i = 0, l = modList.length; i < l; ++i)
	{
		if (isStructureAvailable(modList[i].mod))
		{
			structList = enumStruct(me, modList[i].structure).sort(sortByDistToBase);
			for (let c = 0, s = structList.length; c < s; ++c)
			{
				if (structList[c].modules < modList[i].amount)
				{
					struct = structList[c];
					module = modList[i].mod;
					break;
				}
			}
			if (struct !== null)
			{
				break;
			}
		}
	}

	if (struct && ((getRealPower() > MIN_POWER_FOR_MODULE || module === "A0PowMod1") || countStruct(DERRICK_STAT) >= 12))
	{
		//log("Found a structure to upgrade");
		var builders = findIdleTrucks(struct);
		for (let j = 0, t = builders.length; j < t; ++j)
		{
			var mydroid = builders[j];
			if (conCanHelp(mydroid, struct.x, struct.y))
			{
				if (orderDroidBuild(mydroid, DORDER_BUILD, module, struct.x, struct.y))
				{
					success = true;
				}
			}
		}
	}

	if (checkResearchCompletion())
	{
		success = true;
	}

	return success;
}

// function to find oil clusters not in an occupied base
function findOilClusters()
{
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
	if (!droid || droid.id == null) { return; }
	if (ThrottleThis("truck"+droid.id+"throttle", 10000)) { return; }
	
	const dr = droid;

	// check for artifacts
	var artifacts = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && (obj.stattype === OIL_DRUM || obj.stattype === ARTIFACT)) );
	if (artifacts && artifacts.length > 0)
	{
		var randpickup = artifacts[random(artifacts.length-1)];
		var enemies = enumRange(randpickup.x, randpickup.y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
		if (enemies.length === 0 && droidCanReach(dr, randpickup.x, randpickup.y))
		{
			orderDroidObj(dr, DORDER_RECOVER, randpickup);
			logObj(dr, "idle truck ordered to recover artifact")
			orderTargets.set(dr.id, randpickup.id);
			orderLocations.delete(dr.id);
			return;
		}					
	}
	// build on nearby oil
	var nearbyoil = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS*3, me, false).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
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
	//logObj(droid, "idle truck checking base defenses");
	//log("baseOils:"+JSON.stringify(baseOils));
	
	if (droid.group == oilBuilders && countStruct(POW_GEN_STAT, me) > 1 && baseOils && baseOils.length > 0)
	{
		// every baseoil should be covered by one defense prefer artillery
		for (baseOil of baseOils)
		{
			//log("baseOil:"+JSON.stringify(baseOil));		
			
			var defenses = enumRange(baseOil.x, baseOil.y, 6, me, false).filter((obj) => (obj.stattype === DEFENSE));
			//log("defenses:"+JSON.stringify(defenses));
			
			if (!defenses.length)
			{
				var defense = returnDefense(1);
				if (!defense)
				{
					defense = returnDefense(0);
				}
				//log("defense:"+JSON.stringify(defense));
				if (defined(defense))
				{
					var buildloc = pickStructLocation(droid, defense, baseOil.x, baseOil.y, 1);
				}
				//log("buildloc:"+JSON.stringify(buildloc));
				
				if (buildloc)
				{	
					orderDroidBuild(droid, DORDER_BUILD, defense, buildloc.x, buildloc.y);
					orderLocations.set(dr.id, {x: buildloc.x, y: buildloc.y, enemies: false});
					logObj(droid, "idle truck building base defense");
					continue;
				}
			}
		}
	}
	
	// basebuilders upgrade air factories, but only if there is at least 2 power plants and HQ
	// and after vtol pads built if available
	var upgradeFac = enumStruct(me, VTOL_FACTORY_STAT).filter((obj) => (obj.modules < 2));
	if (droid.group == baseBuilders && countStruct(PLAYER_HQ_STAT) > 0 && countStruct(POW_GEN_STAT) > 1 && upgradeFac && upgradeFac.length > 0 && isStructureAvailable("A0FacMod1"))
	{
		if (isStructureAvailable("A0VTolFactory1") && countStruct(VTOL_PAD_STAT) < 1 ) { } // do nothing
		else {
			orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", upgradeFac[0].x, upgradeFac[0].y);
			orderLocations.set(dr.id, {x: upgradeFac[0].x, y: upgradeFac[0].y, enemies: false});
			logObj(droid, "idle truck upgrading tank factory");
			return true;
		}
	}	
	
	// basebuilders upgrade tank factories, but only if there is at least 2 power plants and HQ
	// and after vtol pad built if available
	var upgradeFac = enumStruct(me, FACTORY_STAT).filter((obj) => (obj.modules < 2));
	if (droid.group == baseBuilders && countStruct(PLAYER_HQ_STAT) > 0 && countStruct(POW_GEN_STAT) > 1 && upgradeFac && upgradeFac.length > 0 && isStructureAvailable("A0FacMod1"))
	{
		if (isStructureAvailable("A0VTolFactory1") && countStruct(VTOL_PAD_STAT) < 1 ) { } // do nothing
		else {
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
	
	if (droid.group == baseBuilders) { return; }
	
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
	
	// defend undefended oils nearby 
	var defense = returnDefense(0);
	var undefendedOil = getUndefendedOil(droid);
	if (gameTime > 90000 && undefendedOil && defined(defense))
	{
		var enemies = enumRange(undefendedOil.x, undefendedOil.y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) =>
				(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));

		if (!enemies)
		{
			var buildloc = pickStructLocation(droid, defense, undefendedOil.x, undefendedOil.y, 1);
			orderDroidBuild(droid, DORDER_BUILD, defense, buildloc.x, buildloc.y);
			orderLocations.set(droid.id, {x: buildloc.x, y: buildloc.y, enemies: false});
			logObj(droid, "idle truck building defense near undefended oil");
			return true;
		}
	}

	// oilbuilders upgrade tank factories, but only if there is at least 2 power plants
//	var upgradeFac = enumStruct(me, FACTORY_STAT).filter((obj) => (obj.modules < 2));
//	if (countStruct(POW_GEN_STAT) > 1 && upgradeFac && upgradeFac.length > 0 && isStructureAvailable("A0FacMod1"))
//	{
//		orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", upgradeFac[0].x, upgradeFac[0].y);
//		orderLocations.set(dr.id, {x: upgradeFac[0].x, y: upgradeFac[0].y, enemies: false});
//		logObj(droid, "idle truck upgrading tank factory");
//		return true;
//	}
	
	// try to grab undefended ememy oil
	var enemyUndefendedoil = getUndefendedOil(droid);
	if (enemyUndefendedoil && defined(defense))
	{
		var enemies = enumRange(enemyUndefendedoil.x, enemyUndefendedoil.y, GROUP_SCAN_RADIUS*1.5, ENEMIES, false).filter((obj) => 
				(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
		var mydefenses = enumRange(enemyUndefendedoil.x, enemyUndefendedoil.y, 8, me, false).filter((obj) => (obj.stattype === DEFENSE));
		
		if (!enemies[0] && !mydefenses[0])
		{
			var buildloc = pickStructLocation(droid, defense, enemyUndefendedoil.x, enemyUndefendedoil.y, 1);
			orderDroidBuild(droid, DORDER_BUILD, defense, buildloc.x, buildloc.y);
			orderLocations.set(droid.id, {x: buildloc.x, y: buildloc.y, enemies: false});
			logObj(droid, "idle truck building defense near enemy undefended oil");
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
		logObj(droid,"idle oilbuilder nothing safe to do");
		return false;
	}
}

function getUndefendedOil(droid)
{
	// first check for nearby undefended oil
	var oils = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS*2, ENEMIES, false).filter((obj) => (obj.stattype === RESOURCE_EXTRACTOR));
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
