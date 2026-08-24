//// PeacemakerAI v0.10 2026-8-20 http://github.com/duckfood
//// MIT license. No warranty whatsoever. Use this code at your own risk!
//// Include this notice in any substantial reproductions.

// log messages to bot log file
const DEBUG = true;
// log messages in-game
const DEBUG_CONSOLE = false;
const DEBUG_TRACE = false;

// api definitions
const OIL_RES_STAT = "OilResource";
const RES_LAB_STAT = "A0ResearchFacility";
const POW_GEN_STAT = "A0PowerGenerator";
const FACTORY_STAT = "A0LightFactory";
const DERRICK_STAT = "A0ResourceExtractor";
const CYBORG_FACTORY_STAT = "A0CyborgFactory";
const PLAYER_HQ_STAT = "A0CommandCentre";
const VTOL_PAD_STAT = "A0VtolPad";
const VTOL_FACTORY_STAT = "A0VTolFactory1";
const REPAIR_FACILITY_STAT = "A0RepairCentre3";
const UPLINK_STAT = "UplinkCentre";
const LASSAT_STAT = "A0LasSatCommand";
const RELAY_POST_STAT = "A0ComDroidControl";
const HARDCRETE_WALL_STAT = "A0HardcreteMk1Wall";
const TANKTRAP_STAT = "A0TankTrap";
const FAC_MODULE_STAT = "A0FacMod1";
const POW_MODULE_STAT = "A0PowMod1";
const RES_MODULE_STAT = "A0ResearchModule1";
const STRUCTURE_TYPES = [HQ, FACTORY, POWER_GEN, RESOURCE_EXTRACTOR, LASSAT,
				DEFENSE, WALL, RESEARCH_LAB, REPAIR_FACILITY, CYBORG_FACTORY,
				VTOL_FACTORY, REARM_PAD, SAT_UPLINK, GATE, STRUCT_GENERIC, COMMAND_CONTROL];

// global config
const MIN_BASE_TRUCKS = 2;
const MAX_BASE_TRUCKS = 4;
const MIN_OIL_TRUCKS = 2;
const MAX_OIL_TRUCKS = 6;
const MIN_BUILD_POWER = 100;
const MIN_RESEARCH_POWER = 20;
const MIN_PRODUCTION_POWER = 50;
const MIN_LIBERATE_POWER = -100;
const MIN_ATTACK_GSIZE = 5;
const MIN_SENSOR_DROIDS = 1;
const HELP_CONSTRUCT_AREA = 20;
const MIN_GROUND_UNITS = 5;
const MIN_VTOL_UNITS = 4;
const AVG_BASE_RADIUS = 20;
let GROUP_SCAN_RADIUS = 9; // adjusted later for tech

// constants
const TERRAIN_WATER = 7; // somehow TER_WATER is undefined and defined
const TERRAIN_CLIFF = 8; // maybe TER_CLIFFFACE too
const PROP_HOVER = "hover01";
const PROP_WHEEL = "wheeled01";
// approx time it would take for a fast vtol to fly from one corner of the map half way to the opposing corner
let VTOL_DEFEND_TIME = 0;

let truckStarts = [];
let startDroids = [];

// group definitions
let attackGroup;
let defendGroup;
let vtolGroup;
let vtolRepairGroup;
let aaGroup;
let demolishGroup;
let baseBuilders;
let oilBuilders;
let sensorGroup;

let researchDone = false;
let isSeaMap = false;
let isAirMap = false;
let enemyHasVtol = false;

// variables
let BASE = startPositions[me];
let relyOnVtols = false;
let totalVtolsBuilt = 0;
let totalVtolsLost = 0;
let relyOnCyborgs = true;
let totalCyborgBuilt = 0;
let totalCyborgLost = 0;

let baseUnderAttack = 0;
let baseUnderAttackLoc = [];

let lastBuildLoc;

let orderTargets = new Map();
let orderLocations = new Map();

let artifactPickups = new Map();
let oilAssignments = new Map();

function eventStartLevel()
{
	attackGroup = newGroup();
	defendGroup = newGroup();
	sensorGroup = newGroup();
	vtolGroup = newGroup();
	vtolRepairGroup = newGroup();
	aaGroup = newGroup();
	baseBuilders = newGroup();
	oilBuilders = newGroup();
	demolishGroup = newGroup();

	isSeaMap = isHoverMap();
	isAirMap = isVtolMap();
	log("isSeaMap:"+isSeaMap);
	log("isAirMap:"+isAirMap);

	researchDone = false;
	enemyHasVtol = false;
	VTOL_DEFEND_TIME = distBetweenTwoPoints(1, 1, mapWidth-2, mapHeight-2) / 22 * 1000;
	log("VTOL_DEFEND_TIME: "+VTOL_DEFEND_TIME);

	setTimer("updateSeenStore", 500 + (randomBetween(-10, 10)));
	setTimer("pruneSeenStore", 1000 + (randomBetween(-10, 10)));

	setTimer("produceDroids", 2000 + (randomBetween(-10, 10)));
	setTimer("lookForResearch", 2000 + (randomBetween(-10, 10)));
	setTimer("buildFundamentals", 2000 + (randomBetween(-10, 10)));
	setTimer("assignTrucksToOil", 2000 + (randomBetween(-10, 10)));
	setTimer("droidAwareRepair", 1000 + (randomBetween(-10, 10)));
	setTimer("baseAware", 5000 + (randomBetween(-10, 10)));
	setTimer("droidAwareAttacker", 1000 + (randomBetween(-10, 10)));
	setTimer("droidAwareTruck", 1000 + (randomBetween(-10, 10)));
	setTimer("droidAwareObstacles", 2000 + (randomBetween(-10, 10)));
	setTimer("droidAwareVtol", 1000 + (randomBetween(-10, 10)));
	setTimer("droidAwareSensor", 5000 + (randomBetween(-10, 10)));
	setTimer("droidAwareScout", 5000 + (randomBetween(-10, 10)));
	setTimer("droidAwareAA", 5000 + (randomBetween(-10, 10)));
	setTimer("droidAwareRTB", 10000 + (randomBetween(-50, 50)));

	setTimer("checkVtolAlphaStrike", VTOL_DEFEND_TIME*3 + (randomBetween(-50, 50)));
	setTimer("recycleDroidsForHover", 10000 + (randomBetween(-50, 50)));
	setTimer("scanForVTOLs", 10000 + (randomBetween(-50, 50)));
	setTimer("balanceGroups", 10000 + (randomBetween(-50, 50)));
	setTimer("adjustSchemeAndStance", 60000 + (randomBetween(-50, 50)));
	setTimer("updateMapTilesFeatures", 60000 + (randomBetween(-50, 50)));
	setTimer("handlePileups", 30000 + (randomBetween(-50, 50)));
	setTimer("checkOrderLocations", 10000 + (randomBetween(-50, 50)));
	setTimer("checkUnreachableOils", 60000 + (randomBetween(-50, 50)));
	setTimer("fireLassat", 10000 + (randomBetween(-50, 50)));

	setTimer("showGameTime", 30000 + (randomBetween(-10, 10)));

	// enumerate starting droids
	truckStarts = enumDroid(me, DROID_CONSTRUCT);
	lastBuildLoc = {x: truckStarts[0].x, y: truckStarts[0].y};

	startDroids = enumDroid(me);
	// handle starting droids
	for (let dr of startDroids) { eventDroidBuilt(dr); }

	// // don't rely on vtols if high tech and not airmap
	// if (componentAvailable("AAGunLaser") ||
	// 	componentAvailable("Missile-HvySAM") ||
	// 	componentAvailable("AAGun2Mk1Quad")) relyOnVtols = false;

	// check if any research is available
	const reslist = enumResearch();
    if (!reslist.length) researchDone = true;

	// check oil resources accessibility and store
	checkOilsReachable();

	buildFundamentals();
}

// include key portions
include("/multiplay/skirmish/PeacemakerAI_includes/scheme.js");
include("/multiplay/skirmish/PeacemakerAI_includes/misc.js");
include("/multiplay/skirmish/PeacemakerAI_includes/map.js");
include("/multiplay/skirmish/PeacemakerAI_includes/timers.js");

// initialize seenStore
const seenStore = new SpatialDataStore({
	type: new Map(),
	stattype: new Map(),
	droidType: new Map(),
	player: new Map(),
	isAllied: new Map(),
	isVTOL: new Map(),
	isSensor: new Map(),
	canHitAir: new Map(),
	canHitGround: new Map(),
	hasIndirect: new Map(),
	isAA: new Map(),
});

// initialize AAseenStore for faster AA queries
const AAseenStore = new SpatialDataStore({
	player: new Map(),
	isVTOL: new Map(),
	canHitAir: new Map(),
	canHitGround: new Map(),
});

// initialize oil resource store
const oilResourceStore = new SpatialDataStore({
	isReachable: new Map(),
	requiresDestruction: new Map(),
	requiresHover: new Map(),
});

// used for naming droids
const StatsMap = loadStatsData(Stats);

// initialize pathfinding data
let MapTilesFeatures;
updateMapTilesFeatures();

// include the rest
include("/multiplay/skirmish/PeacemakerAI_includes/production.js");
include("/multiplay/skirmish/PeacemakerAI_includes/build.js");
include("/multiplay/skirmish/PeacemakerAI_includes/tactics.js");
include("/multiplay/skirmish/PeacemakerAI_includes/events.js");
include("/multiplay/skirmish/PeacemakerAI_includes/research.js");



