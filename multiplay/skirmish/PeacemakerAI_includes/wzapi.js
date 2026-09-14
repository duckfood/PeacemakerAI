// wz2100 api definitions

// structure defs for countStruct() and others
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
const FACTORY_TYPES = [FACTORY_STAT, CYBORG_FACTORY_STAT, VTOL_FACTORY_STAT];

// upgrade modules
const FAC_MODULE_STAT = "A0FacMod1";
const POW_MODULE_STAT = "A0PowMod1";
const RES_MODULE_STAT = "A0ResearchModule1";

// structure defs for collecting seen objects
const STRUCTURE_TYPES = [HQ, FACTORY, POWER_GEN, RESOURCE_EXTRACTOR, LASSAT,
				DEFENSE, WALL, RESEARCH_LAB, REPAIR_FACILITY, CYBORG_FACTORY,
				VTOL_FACTORY, REARM_PAD, SAT_UPLINK, GATE, STRUCT_GENERIC, COMMAND_CONTROL];

// propulsion
const PROP_HOVER = "hover01";
const PROP_WHEEL = "wheeled01";
const PROP_HALFTRACK = "HalfTrack";
const PROP_TRACK = "tracked01";
const PROP_CYBORG = "CyborgLegs";
const PROP_VTOL = "V-Tol";

// heavy bodies
const BODY_DRAGON =	"Body14SUP";
const BODY_WYVERN = "Body13SUP";
const BODY_VENGEANCE = "Body10MBT";
const BODY_TIGER = "Body9REC";
const BODY_MANTIS = "Body12SUP";
const BODY_PYTHON = "Body11ABT";
// medium bodies
const BODY_RETRIBUTION = "Body7ABT";
const BODY_PANTHER = "Body6SUPP";
const BODY_SCORPION = "Body8MBT";
const BODY_COBRA = "Body5REC";
// light bodies
const BODY_RETALIATION = "Body3MBT";
const BODY_LEOPARD = "Body2SUP";
const BODY_BUG = "Body4ABT";
const BODY_VIPER = "Body1REC";
// cyborg bodies
const BODY_CYBORG_LT = "CyborgLightBody";
const BODY_CYBORG_HV = "CyborgHeavyBody";
// transports
const BODY_SUPERTRANS = "SuperTransportBody";
const BODY_TRANSPORT = "TransporterBody";

// weapon components
const TANK_BUNKERB = "Rocket-BB";
const VTOL_BUNKERB = "Rocket-VTOL-BB";
const VTOL_SUNBURST = "Rocket-VTOL-Sunburst";

// system components
const CYBORG_REPAIR = "CyborgRepair";
const TANK_REPAIR_LT = "LightRepair1";
const TANK_REPAIR_HV = "HeavyRepair";

// actions missing from api
const DACTION_NONE = 0; // not doing anything
const DACTION_MOVE = 1; // moving to a location
const DACTION_BUILD = 2; // building a structure
const DACTION_BUILD_FOUNDATION = 3; // building a foundation for a structure
const DACTION_DEMOLISH = 4; // demolishing a structure
const DACTION_REPAIR = 5; // repairing a structure
const DACTION_ATTACK = 6; // attacking something
const DACTION_OBSERVE = 7; // observing something
const DACTION_FIRESUPPORT = 8; // attacking something visible by a sensor droid
const DACTION_SULK = 9; // refuse to do anything aggressive for a fixed time
const DACTION_DESTRUCT = 10; // self destruct
const DACTION_TRANSPORTOUT = 11; // move transporter offworld
const DACTION_TRANSPORTWAITTOFLYIN = 12; // wait for timer to move reinforcements in
const DACTION_TRANSPORTIN = 13; // move transporter onworld
const DACTION_DROID_REPAIR = 14; // repairing a droid
const DACTION_RESTORE = 15; // restore resistance points of a structure
const DACTION_UNUSED = 16;
const DACTION_MOVE_FIRE = 17;
const DACTION_MOVETOBUILD = 18; // moving to a new building location
const DACTION_MOVETODEMOLISH = 19; // moving to a new demolition location
const DACTION_MOVETOREPAIR = 20; // moving to a new repair location
const DACTION_BUILDWANDER = 21; // moving around while building
const DACTION_FOUNDATION_WANDER = 22; // moving around while building the foundation
const DACTION_MOVETOATTACK = 23; // moving to a target to attack
const DACTION_ROTATETOATTACK = 24; // rotating to a target to attack
const DACTION_MOVETOOBSERVE = 25; // moving to be able to see a target
const DACTION_WAITFORREPAIR = 26; // waiting to be repaired by a facility
const DACTION_MOVETOREPAIRPOINT = 27; // move to repair facility repair point
const DACTION_WAITDURINGREPAIR = 28; // waiting to be repaired by a facility
const DACTION_MOVETODROIDREPAIR = 29; // moving to a new location next to droid to be repaired
const DACTION_MOVETORESTORE = 30; // moving to a low resistance structure
const DACTION_UNUSED_2 = 31;
const DACTION_MOVETOREARM = 32; // moving to a rearming pad - VTOLS
const DACTION_WAITFORREARM = 33; // waiting for rearm - VTOLS
const DACTION_MOVETOREARMPOINT = 34; // move to rearm point - VTOLS
const DACTION_WAITDURINGREARM = 35; // waiting during rearm process- VTOLS
const DACTION_VTOLATTACK = 36; // a VTOL droid doing attack runs
const DACTION_CLEARREARMPAD = 37; // a VTOL droid being told to get off a rearm pad
const DACTION_RETURNTOPOS = 38; // used by scout/patrol order when returning to route
const DACTION_FIRE_SUPPORT_RETREAT = 39; // used by firesupport order when sensor retreats
const DACTION_CIRCLE = 41; // circling while engaging

// orders missing from api
const DORDER_NONE = 0;
const DORDER_GUARD = 25;
const DORDER_CIRCLE = 40;

// terrain
const TERRAIN_WATER = 7; // TER_WATER is defined and undefined
const TERRAIN_CLIFF = 8; // maybe TER_CLIFFFACE too
const FEATURE_PLAYER_IDX = 12;
const TILE_DIVISOR = 128;

const MAX_AA_DIST = 24;
const VTOL_TURNAROUND_DIST = 16;
