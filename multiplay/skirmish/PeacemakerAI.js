//// PeacemakerAI v0.13 2026-9-30 http://github.com/duckfood/PeacemakerAI
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
const MIN_COMMAND_DROIDS = 2;
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

// droid groups
const attackGroup = newGroup(),
	defendGroup = newGroup(),
	oilAttackers = newGroup(),
	vtolGroup = newGroup(),
	vtolRepairGroup = newGroup(),
	aaGroup = newGroup(),
	demolishGroup = newGroup(),
	baseBuilders = newGroup(),
	oilBuilders = newGroup(),
	sensorGroup = newGroup(),
	retreatGroup = newGroup(),
	repairGroup = newGroup(),
	transportGroup = newGroup(),
	playerGroup = newGroup();

const allGroups = [
	attackGroup,
	defendGroup,
	oilAttackers,
	vtolGroup,
	vtolRepairGroup,
	aaGroup,
	demolishGroup,
	baseBuilders,
	oilBuilders,
	sensorGroup,
	retreatGroup,
	repairGroup,
	transportGroup,
	playerGroup,
];

// global variables
let PeacemakerAIenable = true;
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
let startedWithBB = false;
let startedWithRepair = false;
let builtFirstCombat = false;
let builtFirstHQ = false;
let truckStarts = enumDroid(me, DROID_CONSTRUCT);
let startDroids;
let baseUnderAttack = 0;
let baseUnderAttackLoc = {};
let MapTilesFeatures; // pathfinding data
let GROUP_SCAN_RADIUS = 9; // adjusted later for tech

let orderTargets = new Map();
let orderLocations = new Map();
let artifactPickups = new Map();
let oilAssignments = new Map();

function eventStartLevel()
{
	// initialize pathfinding data
	updateMapTilesFeatures();

	// check starting comps
	if (isComponentProducible(TANK_REPAIR_LT)) startedWithRepair = true;
	if (isComponentProducible(TANK_BUNKERB)) startedWithBB = true;

	// if starting with a hq begin production of combats
	if (enumStruct(me, HQ) > 0) builtFirstHQ = true;

	// handle starting droids
	startDroids = enumDroid(me);
	for (const dr of startDroids) { eventDroidBuilt(dr); }

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
	setTimer("droidAwareCommander", 3000 + randomBetween(-50, 50));

	setTimer("checkVtolAlphaStrike", VTOL_DEFEND_TIME*10 + 1000 + randomBetween(-150, 150));
	setTimer("recycleDroidsForHover", 10000 + randomBetween(-150, 150));
	setTimer("balanceGroups", 10000 + randomBetween(-150, 150));
	setTimer("updateMapTilesFeatures", 60000 + randomBetween(-150, 150));
	setTimer("checkUnassignedDroids", 60000 + randomBetween(-150, 150));
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
include("/multiplay/skirmish/PeacemakerAI_includes/misc.js");
include("/multiplay/skirmish/PeacemakerAI_includes/map.js");
include("/multiplay/skirmish/PeacemakerAI_includes/scheme.js");
include("/multiplay/skirmish/PeacemakerAI_includes/timers.js");
include("/multiplay/skirmish/PeacemakerAI_includes/production.js");
include("/multiplay/skirmish/PeacemakerAI_includes/build.js");
include("/multiplay/skirmish/PeacemakerAI_includes/tactics.js");
include("/multiplay/skirmish/PeacemakerAI_includes/events.js");
include("/multiplay/skirmish/PeacemakerAI_includes/research.js");
include("/multiplay/skirmish/PeacemakerAI_includes/transport.js");
