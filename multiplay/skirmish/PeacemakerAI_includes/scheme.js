let Scheme = "CNLAS";

const Schemes = {
    CNLAS: { // standard for T1 start
        START_TECH: [
            "R-Wpn-MG1Mk1",
            "R-Sys-Engineering01",
            "R-Sys-MobileRepairTurret01",
            "R-Defense-Tower01", // mg tower
            "R-Struc-PowerModuleMk1",
            "R-Struc-Factory-Cyborg",
            "R-Vehicle-Prop-Halftracks",
            "R-Wpn-MG-Damage01",
            "R-Vehicle-Engine03",
            "R-Vehicle-Body05", // cobra
            "R-Wpn-Cannon2Mk1", // medium
        ],
        FUNDAMENTALS1: [
            "R-Struc-Research-Upgrade01",
            "R-Vehicle-Metals01",
            "R-Cyborg-Metals01",
        	"R-Struc-RepairFacility",
            "R-Sys-Sensor-Turret01",
        	"R-Sys-MobileRepairTurretHvy",
            "R-Vehicle-Metals02",
            "R-Cyborg-Metals02",
        	"R-Struc-RprFac-Upgrade01",
        	"R-Vehicle-Metals04",
        	"R-Cyborg-Metals04",
        	"R-Sys-Sensor-Upgrade01",
        ],
        FUNDAMENTALS2: [
            "R-Wpn-Cannon4AMk1",
            "R-Cyborg-Hvywpn-HPV",
            "R-Vehicle-Body11", // python
            "R-Wpn-Cannon-Damage04",
            "R-Wpn-Cannon-ROF03",
            "R-Struc-RprFac-Upgrade04",
        	"R-Vehicle-Prop-Tracks",
        ],
        FUNDAMENTALS3: [
            "R-Vehicle-Body12", // mantis
            "R-Struc-RprFac-Upgrade06",
            "R-Wpn-Cannon-Damage07",
            "R-Wpn-Cannon-ROF04",
            "R-Sys-Autorepair-General",
            "R-Defense-PulseLas",
            "R-Struc-VTOLFactory",
            "R-Vehicle-Prop-VTOL",
            "R-Struc-VTOLPad",
            "R-Struc-VTOLPad-Upgrade03",
            "R-Cyborg-Hvywpn-PulseLsr",
            "R-Sys-Engineering03",
            "R-Sys-Sensor-Upgrade03",
        ],
        FUNDAMENTALS4: [
            "R-Wpn-Cannon-Damage09",
            "R-Wpn-Cannon-ROF06",
            "R-Wpn-ParticleGun",
            "R-Defense-MortarPit-Incendiary",
            "R-Wpn-Missile2A-T", // scourge
            "R-Cyborg-Hvywpn-A-T",  // scourge
            "R-Wpn-Missile-Damage03",
            "R-Wpn-Missile-ROF03",
            "R-Wpn-Missile-Accuracy01",
            "R-Vehicle-Body10", // vengeance
            "R-Struc-Factory-Upgrade04",
            "R-Wpn-Bomb05", // plasmite bomb
            "R-Sys-Resistance-Circuits",
            "R-Wpn-LasSat",
            "R-Vehicle-Body14", // dragon body
            "R-Defense-Howitzer-Incendiary",
        ],
        ADVANCED_TECH: [
            "R-Wpn-Energy-Accuracy01",
            "R-Wpn-Energy-Damage03",
            "R-Wpn-Energy-ROF03",
        ],
        BASIC_TECH: [
            "R-Wpn-Mortar-Acc03",
            "R-Wpn-Mortar-Damage06",
            "R-Wpn-Cannon-Damage09",
            "R-Wpn-Cannon-ROF06",
        ],
        ANTI_AIR_TECH: [
            "R-Defense-AA-Laser", // stormbringer defense
            "R-Defense-AASite-QuadBof02", // tornado
            "R-Defense-AASite-QuadBof" // hurricane defense
        ],
        TANK_WEAPON_LIST: [
            "ParticleGun",
            "HeavyLaser",
            "Laser2PULSEMk1", // pulselaser, but not flashlight
            "Cannon4AUTOMk1",
            "Cannon2A-TMk1",
            "Cannon1Mk1",
            "MG3Mk1", // heavy mg
            "MG2Mk1", // twin mg
            "MG1Mk1", // mg, initial weapon
        ],
        TANK_AA_LIST: [
            "AAGunLaser",
            "QuadRotAAGun", // whirlwind
            "QuadMg1AAGun" // hurricane
        ],
        CYBORG_BASIC_LIST: [
          //  "Cyb-Wpn-Laser",
            "CyborgRotMG",
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
            "ParticleGun-VTOL",
            "Laser2PULSE-VTOL", // pulse
            "Cannon4AUTO-VTOL",
            "Cannon1-VTOL",
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
            "AASite-QuadBof02", // Whirlwind
            "AASite-QuadBof" // Hurricane
        ],
    },

    ////////////////////////

    MGLAS: { // alternate for T1 start

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
        	"R-Struc-RepairFacility",
            "R-Sys-Sensor-Turret01",
        	"R-Sys-MobileRepairTurretHvy",
            "R-Vehicle-Metals02",
            "R-Cyborg-Metals02",
        	"R-Struc-RprFac-Upgrade01",
        	"R-Vehicle-Metals04",
        	"R-Cyborg-Metals04",
        	"R-Sys-Sensor-Upgrade01",
        ],
        FUNDAMENTALS2: [
        	"R-Vehicle-Body11", // python
        	"R-Wpn-MG-ROF02", // rapid mg
            "R-Wpn-MG4",
            "R-Defense-RotMG",
            "R-Struc-RprFac-Upgrade04",
        	"R-Vehicle-Prop-Tracks",
            "R-Wpn-MG5",
        ],
        FUNDAMENTALS3: [
            "R-Vehicle-Body12", // mantis
            "R-Wpn-Laser01", // flashlight
            "R-Struc-RprFac-Upgrade06",
            "R-Sys-Autorepair-General",
            "R-Defense-PulseLas",
            "R-Struc-VTOLFactory",
            "R-Vehicle-Prop-VTOL",
            "R-Struc-VTOLPad",
            "R-Struc-VTOLPad-Upgrade03",
            "R-Cyborg-Hvywpn-PulseLsr",
            "R-Sys-Engineering03",
            "R-Sys-Sensor-Upgrade03",
        ],
        FUNDAMENTALS4: [
            //"R-Wpn-ParticleGun",
            "R-Defense-MortarPit-Incendiary",
            "R-Wpn-Missile2A-T", // scourge
            "R-Cyborg-Hvywpn-A-T",  // scourge
            "R-Vehicle-Body10", // vengeance
            "R-Struc-Factory-Upgrade04",
            "R-Wpn-Mortar-Acc03",
            "R-Wpn-Mortar-Damage06",
            "R-Wpn-Missile-Damage03",
            "R-Wpn-Missile-ROF03",
            "R-Wpn-Missile-Accuracy01",
            "R-Vehicle-Body10", // vengence
            "R-Wpn-Bomb05", // plasmite bomb
            "R-Sys-Resistance-Circuits",
            "R-Wpn-LasSat",
            "R-Vehicle-Body14", // dragon body
            "R-Defense-Howitzer-Incendiary",
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
        TANK_AA_LIST: [
            "AAGunLaser",
            "QuadRotAAGun", // whirlwind
            "QuadMg1AAGun" // hurricane
        ],
        CYBORG_BASIC_LIST: [
        //    "Cyb-Wpn-Laser",
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
            "Cannon4AUTO-VTOL",
            "Laser3BEAM-VTOL", // flashlight
            "MG4ROTARY-VTOL",
            "Cannon1-VTOL",
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

    RKTMTR: { // for T2+ start
        // research
        START_TECH: [
            "R-Wpn-MG1Mk1",
            "R-Sys-Engineering01",
            "R-Sys-MobileRepairTurret01",
            "R-Defense-Tower01", // mg tower
            "R-Struc-PowerModuleMk1",
            "R-Struc-Factory-Cyborg",
            "R-Vehicle-Prop-Halftracks",
            "R-Wpn-MG-Damage01",
            "R-Vehicle-Engine03",
            "R-Vehicle-Body05", // cobra
        ],
        FUNDAMENTALS1: [
            "R-Struc-Research-Upgrade01",
            "R-Wpn-Rocket05-MiniPod",
            "R-Wpn-MG-Damage02",
            "R-Wpn-Mortar01Lt",
            "R-Vehicle-Metals02",
            "R-Cyborg-Metals02",
        	"R-Sys-MobileRepairTurretHvy",
        ],
        FUNDAMENTALS2: [
        	"R-Vehicle-Metals04",
        	"R-Cyborg-Metals04",
        	"R-Sys-Sensor-Upgrade01",
        	"R-Vehicle-Body11", // python
        	"R-Struc-RepairFacility",
            "R-Wpn-Rocket01-LtAT", // lancer
            "R-Wpn-Rocket03-HvAT", // bunker buster
            "R-Struc-RprFac-Upgrade04",
        	"R-Vehicle-Prop-Tracks",
            "R-Wpn-Mortar-Damage03",
            "R-Wpn-Mortar-ROF01",
        ],
        FUNDAMENTALS3: [
            "R-Wpn-Rocket07-Tank-Killer",
            "R-Cyborg-Hvywpn-TK", // tank killer
            "R-Vehicle-Body12", // mantis
            "R-Vehicle-Prop-Hover",
            "R-Struc-VTOLFactory",
            "R-Vehicle-Prop-VTOL",
            "R-Struc-VTOLPad",
            "R-Struc-RprFac-Upgrade06",
            "R-Struc-VTOLPad-Upgrade03",
            "R-Sys-Engineering03",
            "R-Sys-Sensor-Upgrade03",
            "R-Defense-MortarPit-Incendiary",
            "R-Wpn-Mortar-Acc03",
            "R-Wpn-Mortar-Damage06",
            "R-Wpn-Mortar-ROF03",
        ],
        FUNDAMENTALS4: [
            "R-Wpn-Missile2A-T", // scourge
            "R-Cyborg-Hvywpn-A-T", // scourge
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
        ],
        ADVANCED_TECH: [
            "R-Wpn-Howitzer-ROF04",
            "R-Wpn-Howitzer-Damage06",
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
        TANK_AA_LIST: [
            "Missile-HvySAM",
            "Missile-LtSAM", // avenger
            "Rocket-Sunburst"
        ],
        CYBORG_BASIC_LIST: [
            "CyborgRotMG",
            "CyborgCannon",
            "CyborgChaingun",
        ],
        CYBORG_ADVANCED_LIST: [
            "Cyb-Hvywpn-A-T", // scourge
            "Cyb-Hvywpn-TK", // tank killer
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
            "Pillbox-RotMG",
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
};




