// set to true to log debug messags to file
const DEBUG = true;
const DEBUG_CONSOLE = false;

// -- definitions
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
const SENSOR_TOWERS = ["Sys-SensoTower01", "Sys-SensoTowerWS"];
const UPLINK_STAT = "UplinkCentre";
const LASSAT_STAT = "A0LasSatCommand";
const RELAY_POST_STAT = "A0ComDroidControl";
const HARDCRETE_WALL_STAT = "A0HardcreteMk1Wall";
const TANKTRAP_STAT = "A0TankTrap";

// -- globals
const MIN_BASE_TRUCKS = 2;
const MAX_BASE_TRUCKS = 3;
const MIN_OIL_TRUCKS = 3;
const MIN_BUILD_POWER = 80;
const MIN_RESEARCH_POWER = -50;
const MIN_PRODUCTION_POWER = 60;
const MIN_BUSTERS = 4;
const MIN_ATTACK_GSIZE = 8;
const MIN_SENSOR_DROIDS = 1;
const HELP_CONSTRUCT_AREA = 20;
const MIN_GROUND_UNITS = 5;
const MIN_VTOL_UNITS = 4;
const GROUP_SCAN_RADIUS = 8;
const AVG_BASE_RADIUS = 20; 

const ENEMY_DERRICK_SCAN_RANGE = 20;

var BASE = startPositions[me];

var attackGroup;
var defendGroup;
var vtolGroup;
var vtolRepairGroup;
var baseBuilders;
var oilBuilders;
var sensorGroup;
var commanderGroup;
var supportGroup;
var recycleGroup;

var researchDone;
var truckRoleSwapped;
var isSeaMap;
var currentEnemy;
var currentEnemyTick;
var enemyHasVtol;

var baseUnderAttack = false;
var baseUnderAttackLoc = [];

var truckStarts = enumDroid(me, DROID_CONSTRUCT);
var lastBuildLoc = truckStarts[0];

var orderTargets = new Map();
var orderLocations = new Map();
var AAthreats = new Map();

var derrickAttacks = Array(maxPlayers).fill(0);

// approx time it would take for a fast vtol to fly from one corner of the map half way to the opposing corner
const VTOL_DEFEND_TIME = distBetweenTwoPoints(1, 1, mapWidth-2, mapHeight-2) / 22 * 1000; 

function eventStartLevel()
{
	//setup groups
	attackGroup = newGroup();
	defendGroup = newGroup();
	sensorGroup = newGroup();
	commanderGroup = newGroup();
	supportGroup = newGroup();
	recycleGroup = newGroup();
	
	vtolGroup = newGroup();
	vtolRepairGroup = newGroup();

	baseBuilders = newGroup();
	oilBuilders = newGroup();
	//groupAdd(baseBuilders, dr);

	truckRoleSwapped = false;
	//enumDroid(me).forEach((droid) => {
	//	if (droid.droidType !== DROID_CONSTRUCT)
	//	{
	//		eventDroidBuilt(droid, null);
	//	}
	//});

	setupTruckGroups();
	buildFundamentals();
	isSeaMap = isHoverMap();
	researchDone = false;
	enemyHasVtol = false;

	// Set the timer call randomly so as not to compute on the same tick if more than one AI is on map.
	setTimer("produceAndResearch", 2000 + ((1 + random(4)) * random(70)));
	setTimer("buildFundamentals", 1500 + ((1 + random(3)) * random(60))); // build stuff
	setTimer("lookForOil", 7000 + ((1 + random(4)) * random(30)));
	setTimer("recycleDroidsForHover", 60000 + ((1 + random(4)) * random(100)));
	//setTimer("attackEnemy", 6000 + ((1 + random(4)) * random(100)));
	setTimer("scanForVTOLs", 10000 + ((1 + random(5)) * random(60)));
	
	setTimer("balanceGroups", 20000 + ((1 + random(4)) * random(30)));
	setTimer("baseAware", 5000 + ((1 + random(4)) * random(30)));

	setTimer("droidAware", 1000 + ((1 + random(4)) * random(30)));	
	setTimer("droidAwareTruck", 1100 + ((1 + random(4)) * random(30)));
	setTimer("droidAwareBlockedoil", 2500 + ((1 + random(4)) * random(30)));
	setTimer("droidAwareRTB", 10000 + ((1 + random(4)) * random(30)));
	setTimer("droidAwareRepair", 750 + ((1 + random(4)) * random(30)));	
	setTimer("droidAwareScout", 5000 + ((1 + random(4)) * random(30)));	
//	setTimer("droidAwareCommander", 10000 + ((1 + random(4)) * random(30)));
	
	setTimer("droidAwareVtol", 1000 + ((1 + random(4)) * random(30)));
	setTimer("droidAwareSensor", 700 + ((1 + random(4)) * random(30)));
	
	setTimer("checkVtolAlphaStrike", VTOL_DEFEND_TIME*3 + ((1 + random(4)) * random(30)));	
}

include("/multiplay/skirmish/PeacemakerAI_includes/miscFunctions.js");
include("/multiplay/skirmish/PeacemakerAI_includes/production.js");
include("/multiplay/skirmish/PeacemakerAI_includes/build.js");
include("/multiplay/skirmish/PeacemakerAI_includes/tactics.js");
include("/multiplay/skirmish/PeacemakerAI_includes/events.js");
include("/multiplay/skirmish/PeacemakerAI_includes/research.js");
include("/multiplay/skirmish/PeacemakerAI_includes/timers.js");

log("VTOL_DEFEND_TIME: "+VTOL_DEFEND_TIME);
