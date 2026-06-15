//// PeacemakerAI v0.6 15-6-2026 github.com/duckfood
//// MIT license. No warranty whatsoever. Use this code at your own risk!

// log messages to bot log file
const DEBUG = true;
// log messages in-game
const DEBUG_CONSOLE = false;
const DEBUG_TRACE = true;

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
const MIN_OIL_TRUCKS = 3;
const MAX_OIL_TRUCKS = 6;
const MIN_BUILD_POWER = 60;
const MIN_RESEARCH_POWER = 0;
const MIN_PRODUCTION_POWER = 40;
const MIN_LIBERATE_POWER = -100;
const MIN_ATTACK_GSIZE = 5;
const MIN_SENSOR_DROIDS = 1;
const HELP_CONSTRUCT_AREA = 20;
const MIN_GROUND_UNITS = 5;
const MIN_VTOL_UNITS = 4;
const AVG_BASE_RADIUS = 20;
const ENEMY_DERRICK_SCAN_RANGE = 20;
let GROUP_SCAN_RADIUS = 9; // adjusted later for tech

// constants
const TERRAIN_WATER = 7;
const TERRAIN_CLIFF = 8;
const PROP_HOVER = "hover01";
const PROP_WHEEL = "wheeled01";
const truckStarts = enumDroid(me, DROID_CONSTRUCT);
const startDroids = enumDroid(me);
// approx time it would take for a fast vtol to fly from one corner of the map half way to the opposing corner
const VTOL_DEFEND_TIME = distBetweenTwoPoints(1, 1, mapWidth-2, mapHeight-2) / 22 * 1000;

// group definitions
let attackGroup;
let defendGroup;
let vtolGroup;
let vtolRepairGroup;
let aaGroup;

let baseBuilders;
let oilBuilders;
let sensorGroup;

let researchDone;
let truckRoleSwapped;
let isSeaMap;
let currentEnemy;
let currentEnemyTick;
let enemyHasVtol;

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

let lastBuildLoc = {x: truckStarts[0].x, y: truckStarts[0].y}

let orderTargets = new Map();
let orderLocations = new Map();

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

	isSeaMap = isHoverMap();
	log("isSeaMap:"+isSeaMap);
	researchDone = false;
	enemyHasVtol = false;

	setTimer("updateSeenStore", 500 + ((1 + random(4)) * random(10)));
	setTimer("pruneSeenStore", 2000 + ((1 + random(4)) * random(10)));

	setTimer("produceAndResearch", 2000 + ((1 + random(4)) * random(10)));
	setTimer("buildFundamentals", 2000 + ((1 + random(3)) * random(10)));
	setTimer("assignTrucksToOil", 2000 + ((1 + random(4)) * random(10)));

	setTimer("baseAware", 5000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareAttacker", 1000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareTruck", 1000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareBlockedoil", 10000 + ((1 + random(4)) * random(100)));
	setTimer("droidAwareRTB", 10000 + ((1 + random(4)) * random(100)));
	setTimer("droidAwareRepair", 1000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareVtol", 1000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareSensor", 5000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareScout", 5000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareAA", 5000 + ((1 + random(4)) * random(10)));

	setTimer("checkVtolAlphaStrike", VTOL_DEFEND_TIME*3 + ((1 + random(4)) * random(10)));
	setTimer("fireLassat", 10000 + ((1 + random(4)) * random(100)));
	setTimer("recycleDroidsForHover", 60000 + ((1 + random(4)) * random(100)));
	setTimer("scanForVTOLs", 10000 + ((1 + random(5)) * random(60)));
	setTimer("balanceGroups", 10000 + ((1 + random(4)) * random(30)));
	setTimer("handlePileups", 30000 + ((1 + random(4)) * random(30)));
	setTimer("checkOrderLocations", 10000 + ((1 + random(4)) * random(10)));
	//setTimer("checkUnreachableOils", 60000 + ((1 + random(4)) * random(10)));

	// handle starting droids
	for (let dr of startDroids) { eventDroidBuilt(dr); }

	// add oil wells to seenStore, as players would have seen them on the minimap
	checkOilsReachable();
	markTiles(seenStore.query({type: FEATURE, stattype: OIL_RESOURCE, isReachable: false }));

	// check if any research is available
	const reslist = enumResearch();
    if (!reslist.length) researchDone = true;

	buildFundamentals();
}

include("/multiplay/skirmish/PeacemakerAI_includes/scheme.js");
include("/multiplay/skirmish/PeacemakerAI_includes/misc.js");
include("/multiplay/skirmish/PeacemakerAI_includes/map.js");
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
	isReachable: new Map(),
	requiresDestruction: new Map(),
});
//const AAseenStore = new SpatialDataStore({});
const StatsMap = loadStatsData(Stats);
const MapTilesFeatures = loadFeaturesIntoTiles(enumFeature(ALL_PLAYERS)
	.filter((obj) =>(obj.stattype !== OIL_DRUM && obj.stattype !== ARTIFACT)), MapTiles);

include("/multiplay/skirmish/PeacemakerAI_includes/production.js");
include("/multiplay/skirmish/PeacemakerAI_includes/build.js");
include("/multiplay/skirmish/PeacemakerAI_includes/tactics.js");
include("/multiplay/skirmish/PeacemakerAI_includes/events.js");
include("/multiplay/skirmish/PeacemakerAI_includes/research.js");
include("/multiplay/skirmish/PeacemakerAI_includes/timers.js");
log("VTOL_DEFEND_TIME: "+VTOL_DEFEND_TIME);

//// performance testing
// let start = {x: 10, y: 90}; // highground
// let dest = {x:35 ,y:10};
// let start = {x: 20, y: 5}; // great rift
// let dest = {x:20 ,y: 185};
// let start = {x: 33, y: 33}; // thales
// let dest = {x:181 ,y: 148};
// let start = {x: 4, y: 170}; // dried ocean
// let dest = {x:5 ,y: 8};
// startTime = new Date().getTime();
// let path = findShortestPath(start, dest);
// endTime = new Date().getTime();
// totaltime = endTime - startTime;
// log("findShortestPath_granite: "+totaltime);
// markTiles(path.path);
// log("path: "+JNstr(path));
// markCliffTiles(MapTilesFeatures);
// let startTime = new Date().getTime();
//let path = findShortestPath(BASE, {x:65, y:80}, PROP_HOVER, true); // {x:87, y:41} roughness blocked oil requiresDestruction
// getPerimeterPath(32, 10);// = findShortestPath(BASE, {x:65, y:80}, PROP_WHEEL, true); // roughness blocked oil {x:27, y:57 }
// let endTime = new Date().getTime();
// let totaltime = endTime - startTime;
// log("findShortestPath: "+totaltime);
//markTiles(path.path);
//log(JNstr(path));
//let testvar = findPassableTileInPerimeter(BASE.x, BASE.y);
//log(JNstr(testvar));
//markTiles([[testvar]]);
