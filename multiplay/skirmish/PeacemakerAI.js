//// PeacemakerAI v0.9 2026-8-8 github.com/duckfood
//// MIT license. No warranty whatsoever. Use this code at your own risk!

// log messages to bot log file
const DEBUG = false;
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
const ENEMY_DERRICK_SCAN_RANGE = 20;
let GROUP_SCAN_RADIUS = 9; // adjusted later for tech

// constants
const TERRAIN_WATER = 7; // somehow TER_WATER is undefined and defined
const TERRAIN_CLIFF = 8; // maybe TER_CLIFFFACE too
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
let demolishGroup;

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

let baseUnderAttack = 0;
let baseUnderAttackLoc = [];

let lastBuildLoc = {x: truckStarts[0].x, y: truckStarts[0].y};

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
	log("isSeaMap:"+isSeaMap);
	researchDone = false;
	enemyHasVtol = false;

	setTimer("updateSeenStore", 500 + ((1 + random(4)) * random(10)));
	setTimer("pruneSeenStore", 1000 + ((1 + random(4)) * random(10)));

	setTimer("produceDroids", 2000 + ((1 + random(4)) * random(10)));
	setTimer("lookForResearch", 2000 + ((1 + random(4)) * random(10)));
	setTimer("buildFundamentals", 2000 + ((1 + random(3)) * random(10)));
	setTimer("assignTrucksToOil", 2000 + ((1 + random(4)) * random(10)));

	setTimer("baseAware", 5000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareAttacker", 1000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareTruck", 1000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareObstacles", 2000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareRTB", 10000 + ((1 + random(4)) * random(100)));
	setTimer("droidAwareRepair", 1000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareVtol", 1000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareSensor", 5000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareScout", 5000 + ((1 + random(4)) * random(10)));
	setTimer("droidAwareAA", 5000 + ((1 + random(4)) * random(10)));

	setTimer("checkVtolAlphaStrike", VTOL_DEFEND_TIME*3 + ((1 + random(4)) * random(10)));
	setTimer("recycleDroidsForHover", 300000 + ((1 + random(4)) * random(100)));
	setTimer("scanForVTOLs", 10000 + ((1 + random(5)) * random(60)));
	setTimer("balanceGroups", 10000 + ((1 + random(4)) * random(30)));
	setTimer("adjustSchemeAndStance", 60000 + ((1 + random(4)) * random(30)));
	setTimer("updateMapTilesFeatures", 60000 + ((1 + random(4)) * random(30)));
	setTimer("handlePileups", 30000 + ((1 + random(4)) * random(30)));
	setTimer("checkOrderLocations", 10000 + ((1 + random(4)) * random(10)));
	setTimer("checkUnreachableOils", 60000 + ((1 + random(4)) * random(10)));

	//setTimer("showGameTime", 30000); // show gameTime in console

	// lassat api cannot be relied on, sometimes this even fires repeatedly!
	setTimer("fireLassat", 10000 + ((1 + random(4)) * random(100)));

	// handle starting droids
	for (let dr of startDroids) { eventDroidBuilt(dr); }

	// add oils player has seen on minimap
	checkOilsReachable();
	markTiles(seenStore.query({type: FEATURE, stattype: OIL_RESOURCE, isReachable: true, requiresDestruction: true }));

	// don't rely on vtols if advanced AA is available
	if (componentAvailable("AAGunLaser") ||
		componentAvailable("Missile-HvySAM") ||
		componentAvailable("AAGun2Mk1Quad")) relyOnVtols = false;

	// check if any research is available
	const reslist = enumResearch();
    if (!reslist.length) researchDone = true;

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

log("VTOL_DEFEND_TIME: "+VTOL_DEFEND_TIME);
