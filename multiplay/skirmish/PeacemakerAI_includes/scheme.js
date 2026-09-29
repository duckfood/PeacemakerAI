// master scheme for research, building, and production
const Scheme = {
    START_TECH: [
        "R-Wpn-MG1Mk1",
        "R-Sys-Engineering01",
        "R-Sys-MobileRepairTurret01",
        "R-Defense-Tower01", // mg tower
        "R-Struc-PowerModuleMk1",
        "R-Struc-Factory-Cyborg",
        "R-Vehicle-Prop-Halftracks",
        "R-Wpn-MG-Damage02",
        "R-Vehicle-Engine03",
        "R-Vehicle-Body05", // cobra
        "R-Wpn-Cannon2Mk1", // medium
    ],
    FUNDAMENTALS1: [
        "R-Struc-Research-Upgrade01",
        "R-Vehicle-Metals01",
        "R-Cyborg-Metals01",
        "R-Wpn-Mortar01Lt",
        "R-Wpn-Mortar-Damage01",
        "R-Struc-RepairFacility",
        "R-Sys-Sensor-Turret01",
        "R-Sys-MobileRepairTurretHvy",
        "R-Vehicle-Metals02",
        "R-Cyborg-Metals02",
        "R-Struc-RprFac-Upgrade01",
        "R-Vehicle-Metals04",
        "R-Cyborg-Metals04",
        "R-Sys-Sensor-Upgrade01",
        "R-Comp-CommandTurret01",
    ],
    FUNDAMENTALS2: [
        "R-Vehicle-Body11", // python
        "R-Wpn-Mortar-Damage04",
        "R-Wpn-Cannon4AMk1",
        "R-Cyborg-Hvywpn-HPV",
        "R-Wpn-Mortar3", // pepperpot
        "R-Wpn-Cannon-Damage04",
        "R-Wpn-Cannon-ROF03",
        "R-Struc-RprFac-Upgrade04",
        "R-Vehicle-Prop-Tracks",
        "R-Defense-WallTower-DoubleAAgun",
    ],
    FUNDAMENTALS3: [
        "R-Vehicle-Body12", // mantis
        "R-Struc-RprFac-Upgrade06", // affects repairs droids too
        "R-Wpn-Cannon-Damage07",
        "R-Wpn-Cannon-ROF04",
        "R-Defense-WallTower-DoubleAAgun02",
        "R-Wpn-Mortar-Acc03",
        "R-Wpn-Mortar-Damage06",
        "R-Wpn-Mortar-ROF03",
        "R-Wpn-Rocket03-HvAT", // bunker buster
        "R-Wpn-Rocket07-Tank-Killer",
        "R-Cyborg-Hvywpn-TK", // tank killer
        "R-Defense-MortarPit-Incendiary",
        "R-Sys-Engineering03",
        "R-Sys-Sensor-Upgrade03",
        "R-Struc-VTOLFactory",
        "R-Vehicle-Prop-VTOL",
        "R-Struc-VTOLPad",
        "R-Struc-VTOLPad-Upgrade03",
        "R-Defense-Sunburst",
    ],
    FUNDAMENTALS4: [
        "R-Wpn-Missile2A-T", // scourge
        "R-Cyborg-Hvywpn-A-T", // scourge
        "R-Comp-CommandTurret02",
        "R-Defense-WallTower-SamSite", // SAM1
        "R-Wpn-Missile-Accuracy01",
        "R-Wpn-Missile-ROF03",
        "R-Wpn-Missile-Damage03",
        "R-Vehicle-Body10", // vengeance
        "R-Struc-Factory-Upgrade04",
        "R-Sys-Autorepair-General",
        "R-Wpn-Bomb05", // plasmite bomb
        "R-Struc-Research-Upgrade09",
        "R-Sys-Resistance-Circuits",
        "R-Wpn-LasSat",
        "R-Defense-Howitzer-Incendiary",
        "R-Vehicle-Body14", // dragon body
        "R-Defense-WallTower-SamHvy", // SAM2
    ],
    ADVANCED_TECH: [
        "R-Wpn-Missile-Damage03",
        "R-Wpn-Missile-ROF03",
        "R-Wpn-Missile-Accuracy01",
    ],
    BASIC_TECH: [
        "R-Wpn-Mortar-Acc03",
        "R-Wpn-Mortar-Damage06",
        "R-Wpn-Mortar-ROF03",
        "R-Wpn-Cannon-Damage09",
        "R-Wpn-Cannon-ROF06",
    ],
    // contextual start tech
    HOVER_START_TECH: [
        "R-Wpn-MG1Mk1",
        "R-Struc-PowerModuleMk1",
        "R-Struc-Research-Module",
        "R-Struc-Factory-Module",
        "R-Vehicle-Body05", // cobra
        "R-Vehicle-Prop-Hover",
        "R-Sys-MobileRepairTurret01",
        "R-Wpn-Cannon2Mk1",
        "R-Vehicle-Body11", // python
    ],
    AIR_START_TECH: [
        "R-Struc-PowerModuleMk1",
        "R-Struc-Factory-Module",
        "R-Struc-Research-Module",
        "R-Struc-VTOLFactory",
        "R-Vehicle-Prop-VTOL",
        "R-Struc-VTOLPad-Upgrade01",
        "R-Vehicle-Body05", // cobra
        "R-Defense-Sunburst",
        "R-Wpn-Rocket03-HvAT", // bunker buster
        "R-Struc-Materials01",
        "R-Defense-WallUpgrade03",
    ],
    TANK_WEAPON_LIST: [
        "Missile-A-T", // scourge
        "Rocket-HvyA-T", // tank killer
        //TANK_BUNKERB, // bunker buster
        "Rocket-LtA-T", // lancer
        "Cannon4AUTOMk1",
        "Cannon2A-TMk1",
        "Cannon1Mk1",
        "MG3Mk1", // heavy mg
        "MG2Mk1", // twin mg
        "MG1Mk1", // mg initial weapon
    ],
    TANK_AA_LIST: [
        "Missile-HvySAM", // SAM2
        "Missile-LtSAM", // SAM1
        "Rocket-Sunburst",
        "AAGun2Mk1Quad", // Tornado
        "QuadRotAAGun", // whirlwind
        "AAGun2Mk1", // Cyclone
        "QuadMg1AAGun", // hurricane
    ],
    CYBORG_BASIC_LIST: [
        "CyborgCannon",
        "CyborgChaingun",
    ],
    CYBORG_ADVANCED_LIST: [
        "Cyb-Hvywpn-A-T",
        "Cyb-Hvywpn-TK",
        "Cyb-Hvywpn-HPV",
    ],
    VTOL_WEAPONS: [
        "Bomb5-VTOL-Plasmite",
        "Missile-VTOL-AT", // scourge
        "Rocket-VTOL-HvyA-T", // tank killer
        "Rocket-VTOL-BB", // bunker buster
        "Rocket-VTOL-LtA-T",
        "Cannon4AUTO-VTOL",
        "Cannon1-VTOL",
    ],
    STANDARD_DEFENSES: [
        "GuardTower-BeamLas", // not researched
        "Pillbox-RotMG",
        "GuardTower1", // can hit air
    ],
    ARTILLERY_DEFENSES: [
        "Emplacement-Howitzer-Incendiary",
        "Emplacement-MortarPit-Incendiary",
    ],
    AA_SITES: [
        "WallTower-SamHvy", // SAM2
        "WallTower-SamSite", // SAM1
        "P0-AASite-Sunburst", // Sunburst
        "WallTower-DoubleAAGun02", // Tornado
        "WallTower-DoubleAAGun", // Cyclone
        "AASite-QuadBof02", // Tornado
        "AASite-QuadBof", // Cyclone
        "AASite-QuadRotMg", // Hurricane
        "AASite-QuadMg1", // Whirlwind
    ],
};

// final upgrade defs
const KINETIC_ALLOYS = [
	"R-Vehicle-Metals09",
	"R-Cyborg-Metals09",
];
const THERMAL_ALLOYS = [
	"R-Vehicle-Armor-Heat09",
	"R-Cyborg-Armor-Heat09",
];
const STRUCTURE_DEFENSE_UPGRADES = [
	"R-Struc-Materials03", // final structure upgrade
	"R-Defense-WallUpgrade11", // final wall upgrade
];
const POWER_AND_RESEARCH_UPGRADES = [
	"R-Struc-Power-Upgrade03a", // final power upgrade
	"R-Struc-Research-Upgrade09", // final research upgrade
];
const VTOL_PADS_UPGRADES = [
	"R-Struc-VTOLPad-Upgrade06", // final pad upgrade
];

const RESEARCH_UPGRADES = [
    POWER_AND_RESEARCH_UPGRADES,
    KINETIC_ALLOYS,
    Scheme.BASIC_TECH,
    THERMAL_ALLOYS,
    VTOL_PADS_UPGRADES,
    Scheme.ADVANCED_TECH,
    STRUCTURE_DEFENSE_UPGRADES,
];

// transport research defs
const TRANSPORT_TECH = "R-Cyborg-Transport";

// priories for off tiers research
const RESEARCH_PRIORITIES = {
    power: 5,
    repair: 4,
    metals: 4,
    engine: 4,
    rprfac: 4,
    mortar: 3,
    missile: 3,
    heat: 3,
    body: 3,
    cannon: 2,
    vtol: 2,
    sam: 2,
    research: 2,
    aagun: 2,
    module: 1,
    factory: 1
};
