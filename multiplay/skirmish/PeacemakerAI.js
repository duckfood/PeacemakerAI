//// PeacemakerAI v0.12 2026-9-14 http://github.com/duckfood/PeacemakerAI
//// MIT license. No warranty whatsoever. Use this code at your own risk!
//// Include this notice in any substantial reproductions.

// log messages to bot log file
const DEBUG = false;
// log messages in-game
const DEBUG_CONSOLE = false;
const DEBUG_TRACE = false; // with call trace
const DEBUGEX = false; // extreme debugging every function call

// global config
const MIN_BASE_TRUCKS = 2;
const MAX_BASE_TRUCKS = 4;
const MIN_OIL_TRUCKS = 3;
const MAX_OIL_TRUCKS = 6;
const MIN_BUILD_POWER = 80;
const MIN_RESEARCH_POWER = 30;
const MIN_PRODUCTION_POWER = 50;
const MIN_LIBERATE_POWER = 20;
const MIN_ATTACK_GSIZE = 5;
const MIN_SENSOR_DROIDS = 2;
const HELP_CONSTRUCT_AREA = 20;
const MIN_GROUND_UNITS = 5;
const MIN_VTOL_UNITS = 4;
const AVG_BASE_RADIUS = 20;
const RETREAT_THRESHOLD = 1.2;
const RESEARCH_TIER_THRESH = 1750;
const TRANPORT_MAP_THRESH = 5; // unreachable oils

// map definitions
const EXHIGH_OIL_MAP = 80;
const HIGH_OIL_MAP = 50;
const LOW_OIL_MAP = 30;

// time constants
const ONE_MINUTE =   60000;
const TWO_MINUTE =   120000;
const THREE_MINUTE = 180000;
const FOUR_MINUTE =  240000;
const FIVE_MINUTE =  300000;
const SIX_MINUTE =   360000;
const TEN_MINUTE =   600000;

let VTOL_DEFEND_TIME = 0;

// groups
let attackGroup;
let defendGroup;
let oilAttackers;
let vtolGroup;
let vtolRepairGroup;
let aaGroup;
let demolishGroup;
let baseBuilders;
let oilBuilders;
let sensorGroup;
let retreatGroup;
let repairGroup;
let transportGroup;

// global variables
let researchDone = false;
let enemyHasVtol = false;
let BASE = startPositions[me];
let lastBuildLoc = BASE;
let relyOnVtols = false;
let totalVtolsBuilt = 0;
let totalVtolsLost = 0;
let relyOnCyborgs = true;
let totalCyborgBuilt = 0;
let totalCyborgLost = 0;
let isUltimateScavs = false;
let startedWithBB = false;
let startedWithRepair = false;
let startedWithScavs = false;
let builtFirstCombat = false;
let builtFirstHQ = false;
let truckStarts;
let startDroids;
let baseUnderAttack = 0;
let baseUnderAttackLoc = {};
let MapTilesFeatures; // pathfinding data
let trucksBuildingAt = {}; // prevent base builders from starting duplicate builds
let GROUP_SCAN_RADIUS = 9; // adjusted later for tech

let orderTargets = new Map();
let orderLocations = new Map();
let artifactPickups = new Map();
let oilAssignments = new Map();

function eventStartLevel()
{
	attackGroup = newGroup();
	defendGroup = newGroup();
	oilAttackers = newGroup();
	sensorGroup = newGroup();
	vtolGroup = newGroup();
	vtolRepairGroup = newGroup();
	aaGroup = newGroup();
	baseBuilders = newGroup();
	oilBuilders = newGroup();
	demolishGroup = newGroup();
	retreatGroup = newGroup();
	repairGroup = newGroup();
	transportGroup = newGroup();

	// started with light repair
	if (componentAvailable(TANK_REPAIR_LT)) startedWithRepair = true;

	// if starting with a hq begin production of combats
	if (countStruct(PLAYER_HQ_STAT) > 0) builtFirstHQ = true;

	// enumerate starting trucks
	truckStarts = enumDroid(me, DROID_CONSTRUCT);
	//if (truckStarts && truckStarts.length && truckStarts[0].id) lastBuildLoc = {x: truckStarts[0].x, y: truckStarts[0].y};

	// handle starting droids
	startDroids = enumDroid(me);
	for (const dr of startDroids) { eventDroidBuilt(dr); }

	// check if any research is available
	const reslist = enumResearch();
    if (!reslist.length) researchDone = true;

	// check if scavs enabled and alive
	detectScavs();

	// fast vtol flight time from corner to center
	VTOL_DEFEND_TIME = distBetweenTwoPoints(1, 1, mapWidth-2, mapHeight-2) / 22 * 1000;
	logFile("VTOL_DEFEND_TIME: "+VTOL_DEFEND_TIME);

	// timers for core functionality
	setTimer("updateSeenStore", 500 + randomBetween(-10, 10));
	setTimer("produceDroids", 5000 + randomBetween(-10, 10));
	setTimer("lookForResearch", 5000 + randomBetween(-10, 10));
	setTimer("buildFundamentals", 2000 + randomBetween(-10, 10));
	setTimer("assignTrucksToOil", 5000 + randomBetween(-10, 10));

	setTimer("baseAware", 5000 + randomBetween(-10, 10));
	setTimer("droidAwareRepair", 1000 + randomBetween(-10, 10));
	setTimer("droidAwareAttacker", 1000 + randomBetween(-10, 10));
	setTimer("droidAwareTruck", 1000 + randomBetween(-10, 10));
	setTimer("droidAwareObstacles", 3000 + randomBetween(-10, 10));
	setTimer("droidAwareVtol", 1000 + randomBetween(-10, 10));
	setTimer("droidAwareSensor", 5000 + randomBetween(-10, 10));
	setTimer("droidAwareScout", 5000 + randomBetween(-10, 10));
	setTimer("droidAwareAA", 5000 + randomBetween(-10, 10));
	setTimer("droidAwareRTB", 10000 + randomBetween(-50, 50));
	setTimer("droidAwareRetreat", 5000 + randomBetween(-50, 50));

	setTimer("checkVtolAlphaStrike", VTOL_DEFEND_TIME*4 + 1000 + randomBetween(-150, 150));
	setTimer("recycleDroidsForHover", 10000 + randomBetween(-150, 150));
	setTimer("balanceGroups", 10000 + randomBetween(-150, 150));
	setTimer("updateMapTilesFeatures", 60000 + randomBetween(-150, 150));
	setTimer("handlePileups", 30000 + randomBetween(-150, 150));
	setTimer("checkOrderLocations", 10000 + randomBetween(-150, 150));
	setTimer("checkUnreachableOils", 30000 + randomBetween(-150, 150));
	setTimer("fireLassat", 10000 + randomBetween(-150, 150));
	setTimer("transportTrucks", 2000 + randomBetween(-150, 150));

	// check oil resources accessibility and store
	checkOilsReachable();

	// get started building
	buildFundamentals();
}

// include initial modules
include("/multiplay/skirmish/PeacemakerAI_includes/wzapi.js");
include("/multiplay/skirmish/PeacemakerAI_includes/scheme.js");
include("/multiplay/skirmish/PeacemakerAI_includes/misc.js");
include("/multiplay/skirmish/PeacemakerAI_includes/map.js");

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

// initialize component name and stats data
const StatsMap = loadStatsData(Stats);

// include remaining modules
include("/multiplay/skirmish/PeacemakerAI_includes/timers.js");
updateMapTilesFeatures(); // initialize pathfinding data
include("/multiplay/skirmish/PeacemakerAI_includes/production.js");
include("/multiplay/skirmish/PeacemakerAI_includes/build.js");
include("/multiplay/skirmish/PeacemakerAI_includes/tactics.js");
include("/multiplay/skirmish/PeacemakerAI_includes/events.js");
include("/multiplay/skirmish/PeacemakerAI_includes/research.js");
include("/multiplay/skirmish/PeacemakerAI_includes/transport.js");
