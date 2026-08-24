let Scheme = "CNLAS";

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
            "R-Struc-RprFac-Upgrade04",
        	"R-Vehicle-Prop-Tracks",
            "R-Wpn-MG4",
            "R-Defense-RotMG",
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
            "R-Vehicle-Body09", // tiger
            "R-Wpn-ParticleGun",
            "R-Defense-MortarPit-Incendiary",
            "R-Cyborg-Hvywpn-A-T",  // scourge
            "R-Struc-Factory-Upgrade04",
            "R-Wpn-Bomb05", // plasmite bomb
            "R-Wpn-Mortar-Acc03",
            "R-Wpn-Mortar-Damage06",
            "R-Wpn-Missile-Damage03",
            "R-Wpn-Missile-ROF03",
            "R-Vehicle-Body10", // vengence
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
            "Cyb-Wpn-Laser",
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

    CNLAS: {
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
            "R-Vehicle-Body09", // tiger
            "R-Wpn-ParticleGun",
            "R-Defense-MortarPit-Incendiary",
            "R-Cyborg-Hvywpn-A-T",  // scourge
            "R-Struc-Factory-Upgrade04",
            "R-Wpn-Bomb05", // plasmite bomb
            "R-Wpn-Mortar-Acc03",
            "R-Wpn-Mortar-Damage06",
            "R-Wpn-Missile-Damage03",
            "R-Wpn-Missile-ROF03",
            "R-Sys-Resistance-Circuits",
            "R-Defense-Howitzer-Incendiary",
            "R-Wpn-LasSat",
            "R-Vehicle-Body14", // dragon body
        ],
        ADVANCED_TECH: [
            "R-Wpn-Energy-Accuracy01",
            "R-Wpn-Energy-Damage03",
            "R-Wpn-Energy-ROF03",
        ],
        BASIC_TECH: [
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
            "Cyb-Wpn-Laser",
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
};




