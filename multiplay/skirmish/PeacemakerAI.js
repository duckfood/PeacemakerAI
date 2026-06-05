//// PeacemakerAI v0.3 3-6-2026 github.com/duckfood

// set to true to log debug messages to file
const DEBUG = true;
const DEBUG_CONSOLE = false;

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
const STRUCTURE_TYPES = [HQ, FACTORY, POWER_GEN, RESOURCE_EXTRACTOR, LASSAT, DEFENSE, WALL, RESEARCH_LAB, REPAIR_FACILITY, CYBORG_FACTORY, VTOL_FACTORY, REARM_PAD, SAT_UPLINK, GATE, STRUCT_GENERIC, COMMAND_CONTROL];

// global config
const MIN_BASE_TRUCKS = 2;
const MAX_BASE_TRUCKS = 4;
const MIN_OIL_TRUCKS = 3;
const MIN_BUILD_POWER = 80;
const MIN_RESEARCH_POWER = -50;
const MIN_PRODUCTION_POWER = 60;
const MIN_ATTACK_GSIZE = 5;
const MIN_SENSOR_DROIDS = 1;
const HELP_CONSTRUCT_AREA = 20;
const MIN_GROUND_UNITS = 5;
const MIN_VTOL_UNITS = 4;
const AVG_BASE_RADIUS = 20;
const ENEMY_DERRICK_SCAN_RANGE = 20;
let GROUP_SCAN_RADIUS = 9; // adjusted latar for tech

// constants
const TERRIAN_WATER = 7;
const TERRIAN_CLIFF = 8;
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
let relyOnVtols = true;
let totalVtolsBuilt = 0;
let totalVtolsLost = 0;
let relyOnCyborgs = true;
let totalCyborgBuilt = 0;
let totalCyborgLost = 0;

let baseUnderAttack = false;
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
	setTimer("buildFundamentals", 2000 + ((1 + random(3)) * random(10))); // build stuff
	setTimer("lookForOil", 2000 + ((1 + random(4)) * random(10)));

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

	// handle starting droids
	for (let dr of startDroids) { eventDroidBuilt(dr); }

	// add oil well objects to seenStore, as players would have seen the minimap
	let oils = enumFeature(ALL_PLAYERS, OIL_RES_STAT);
	for (let oil of oils) seenStore.addObject(oil.id, oil);

	// check if any research is available at start
	const reslist = enumResearch();
    if (reslist.length === 0) researchDone = true;

	// if advanced AA is available don't rely on vtols
	if (componentAvailable("AAGunLaser") ||
		componentAvailable("Missile-HvySAM") ||
		componentAvailable("AAGun2Mk1Quad")) relyOnVtols = false;

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
});
const AAseenStore = new SpatialDataStore({
	id: new Map()
});
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
// throw "TILES";

