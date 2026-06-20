const schemeOptions = ["MGLAS", "RKTMTR"];
const Scheme = schemeOptions[0];

const Schemes = {
    MGLAS: {
        START_TECH: [
            "R-Wpn-MG1Mk1",
            "R-Sys-Engineering01",
            "R-Sys-MobileRepairTurret01",
            "R-Defense-Tower01", // mg tower
            "R-Struc-PowerModuleMk1",
            "R-Struc-Factory-Cyborg",
            "R-Vehicle-Prop-Halftracks",
            "R-Wpn-MG-Damage04",
            "R-Vehicle-Engine03",
            "R-Vehicle-Body05", // cobra
            "R-Wpn-MG3Mk1", // heavy mg
        ],
        FUNDAMENTALS1: [
            "R-Struc-Research-Upgrade01",
            "R-Vehicle-Metals01",
            "R-Cyborg-Metals01",
            "R-Sys-Sensor-Turret01",
        	"R-Sys-MobileRepairTurretHvy",
            "R-Vehicle-Metals02",
            "R-Cyborg-Metals02",
        	"R-Struc-RepairFacility",
        	"R-Struc-RprFac-Upgrade01",
        	"R-Vehicle-Metals04",
        	"R-Cyborg-Metals04",
        	"R-Sys-Sensor-Upgrade01",
        ],
        FUNDAMENTALS2: [
        	"R-Vehicle-Body11", // python
        	"R-Wpn-MG-ROF02", // rapid mg
        	"R-Vehicle-Prop-Tracks",
            "R-Wpn-MG4",
            "R-Defense-RotMG",
            "R-Wpn-MG5",
        ],
        FUNDAMENTALS3: [
            "R-Struc-VTOLFactory",
            "R-Vehicle-Prop-VTOL",
            "R-Struc-VTOLPad",
            "R-Struc-VTOLPad-Upgrade03",
            "R-Struc-RprFac-Upgrade06",
            "R-Vehicle-Body12", // mantis
            "R-Sys-Autorepair-General",
            "R-Vehicle-Prop-Hover",
            "R-Defense-PulseLas", // pulse tower
            "R-Defense-WallUpgrade03",
            "R-Cyborg-Hvywpn-PulseLsr",
            "R-Sys-Engineering03",
            "R-Sys-Sensor-Upgrade03",
        ],
        FUNDAMENTALS4: [
            "R-Vehicle-Body09", // tiger
            "R-Wpn-ParticleGun",
            "R-Defense-MortarPit-Incendiary",
            "R-Struc-Factory-Upgrade04",
            "R-Wpn-Bomb05", // plasmite bomb
            "R-Wpn-Mortar-Acc03",
            "R-Wpn-Mortar-Damage06",
            "R-Vehicle-Body10", // vengence
            "R-Struc-Research-Upgrade09",
            "R-Sys-Resistance-Circuits",
            "R-Defense-Howitzer-Incendiary",
            "R-Vehicle-Body14", // dragon body
            "R-Wpn-LasSat",
        ],
        ADVANCED_TECH: [
            "R-Wpn-Energy-Accuracy01",
            "R-Wpn-Energy-Damage03",
            "R-Wpn-Energy-ROF03",
        ],
        BASIC_TECH: [
            "R-Wpn-MG-Damage10", // du bullets mk3
            "R-Wpn-MG-ROF02"
        ],
        ANTI_AIR_TECH: [
            "R-Defense-AA-Laser", // stormbringer defense
            "R-Defense-AASite-QuadMg1" // hurricane defense
        ],
        TANK_WEAPON_LIST: [
            "ParticleGun",
            "HeavyLaser",
            "Laser2PULSEMk1", // pulselaser, but not flashlight
            "MG5TWINROTARY",
            "MG4ROTARYMk1",
            "MG3Mk1", // heavy mg
            "MG2Mk1", // twin mg
            "MG1Mk1", // mg, initial weapon
        ],
        TANK_ARTILLERY_LIST: [
            "Howitzer-Incendiary",
            "Mortar-Incendiary",
        ],
        TANK_AA_LIST: [
            "AAGunLaser",
            "QuadRotAAGun", // whirlwind
            "QuadMg1AAGun" // hurricane
        ],
        CYBORG_BASIC_LIST: [
            "CyborgRotMG",
            "CyborgChaingun",
        ],
        CYBORG_ADVANCED_LIST: [
            "Cyb-Hvywpn-TK",
            "Cyb-Hvywpn-HPV",
        ],
        VTOL_WEAPONS: [
            "Bomb5-VTOL-Plasmite",
            "ParticleGun-VTOL",
            "Laser2PULSE-VTOL", // pulse
            "Laser3BEAM-VTOL", // flashlight
            "Cannon4AUTO-VTOL",
            "MG4ROTARY-VTOL",
        ],
        STANDARD_DEFENSES: [
            "GuardTower-BeamLas",
            "Pillbox-RotMG",
            "PillBox1",
            "GuardTower1"
        ],
        ARTILLERY_DEFENSES: [
            "Emplacement-Howitzer-Incendiary",
            "Emplacement-MortarPit-Incendiary",
        ],
        AA_SITES: [
            "P0-AASite-SAM2",
            "P0-AASite-Laser",
            "AASite-QuadRotMg", // Whirlwind
            "AASite-QuadMg1" // Hurricane
        ],
    },

    ////////////

    RKTMTR: { // not effective
        // research
        FUNDAMENTALS1: [
            "R-Wpn-MG1Mk1",
            "R-Sys-Engineering01",
            "R-Sys-MobileRepairTurret01",
            "R-Wpn-Rocket05-MiniPod",
            "R-Struc-PowerModuleMk1",
            "R-Wpn-MG-Damage02",
            "R-Wpn-Mortar01Lt",
            "R-Defense-Tower01", // mg tower
            "R-Vehicle-Prop-Halftracks",
            "R-Vehicle-Body05", // cobra
            "R-Vehicle-Metals02",
            "R-Cyborg-Metals02",
            "R-Struc-Research-Upgrade01",
        ],
        FUNDAMENTALS2: [
            "R-Wpn-Mortar-Damage03",
            "R-Wpn-Mortar-ROF01",
        	"R-Vehicle-Metals04",
        	"R-Cyborg-Metals04",
        	"R-Sys-Sensor-Upgrade01",
        	"R-Sys-MobileRepairTurretHvy",
        	"R-Vehicle-Body11", // python
        	"R-Struc-RepairFacility",
        	"R-Struc-RprFac-Upgrade03",
            "R-Wpn-Rocket01-LtAT", // lancer
            "R-Wpn-Rocket03-HvAT", // bunker buster
        	"R-Vehicle-Prop-Tracks",
        ],
        FUNDAMENTALS3: [
            "R-Wpn-Missile2A-T", // scourge
            "R-Defense-MortarPit-Incendiary",
            "R-Vehicle-Body12", // mantis
            "R-Sys-Autorepair-General",
            "R-Vehicle-Prop-Hover",
            "R-Struc-VTOLFactory",
            "R-Vehicle-Prop-VTOL",
            "R-Struc-VTOLPad",
            "R-Struc-RprFac-Upgrade06",
            "R-Struc-VTOLPad-Upgrade03",
            "R-Cyborg-Hvywpn-A-T", // scourge
            "R-Sys-Engineering03",
            "R-Sys-Sensor-Upgrade03",
        ],
        FUNDAMENTALS4: [
            "R-Wpn-Mortar-Damage06",
            "R-Struc-Factory-Upgrade04",
            "R-Wpn-LasSat",
            "R-Wpn-Bomb05", // plasmite bomb
            "R-Wpn-Mortar-Acc03",
            "R-Wpn-Mortar-Damage06",
            "R-Struc-Research-Upgrade09",
            "R-Sys-Resistance-Circuits",
            "R-Defense-Howitzer-Incendiary",
            "R-Wpn-Howitzer-Damage05",
            "R-Vehicle-Body14", // dragon body
        ],
        ADVANCED_TECH: [
        ],
        BASIC_TECH: [
            "R-Wpn-Rocket-Damage09",
            "R-Wpn-Rocket-ROF03"
        ],
        ANTI_AIR_TECH: [
            "R-Defense-Sunburst",
            "R-Defense-SamSite2",
        ],

        // production
        TANK_WEAPON_LIST: [
            "Missile-A-T", // scourge
            "Rocket-HvyA-T", // tank killer
            "Rocket-BB", // bunker buster
            "Rocket-LtA-T", // lancer
            "Rocket-Pod", // mini-rocket pod
            "MG1Mk1", // mg, initial weapon
        ],
        TANK_ARTILLERY_LIST: [
            "Howitzer-Incendiary",
            "Mortar-Incendiary",
        ],
        TANK_AA_LIST: [
            "Missile-HvySAM",
            "Missile-LtSAM", // avenger
            "Rocket-Sunburst"
        ],
        CYBORG_BASIC_LIST: [
            "Cyb-Wpn-Grenade",
        ],
        CYBORG_ADVANCED_LIST: [
            "Cyb-Hvywpn-A-T", // scourge
            "Cyb-Hvywpn-TK",
        ],
        VTOL_WEAPONS: [
            "Bomb5-VTOL-Plasmite",
            "Missile-VTOL-AT", // scourge
            "Rocket-VTOL-HvyA-T", // tank killer
            "Rocket-VTOL-BB", // bunker buster
        ],

        // defenses
        STANDARD_DEFENSES: [
            "GuardTower-BeamLas",
            "GuardTower-ATMiss",
            "GuardTower1",
        ],
        ARTILLERY_DEFENSES: [
            "Emplacement-Howitzer-Incendiary",
            "Emplacement-MortarPit-Incendiary",
        ],
        AA_SITES: [
            "P0-AASite-SAM2",
            "P0-AASite-SAM1",
            "P0-AASite-Sunburst",
        ],
    },

    //////

};
