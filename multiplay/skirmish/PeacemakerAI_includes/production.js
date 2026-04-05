// Tank definitions
const TANK_BODY_LIST = [
	// dragon handled elsewhere
	"Body13SUP", // wyvern
	"Body10MBT", // vengeance
	"Body7ABT", // retribution
	"Body9REC", // tiger
	"Body6SUPP", // panther
	"Body12SUP", // mantis
	"Body11ABT", // python
	"Body8MBT", // scorpion
	"Body5REC", // cobra
	"Body4ABT", // bug
	"Body1REC", // viper
];
const TANK_PROP_LIST = [
	"HalfTrack", // half-track
	"wheeled01", //  wheels
];
const TANK_WEAPON_LIST = [
	"RailGun3Mk1",
	"ParticleGun",
	"Laser2PULSEMk1", // pulselaser, but not flashlight
	"MG5TWINROTARY",
	"MG4ROTARYMk1",
	"MG3Mk1", // heavy mg
	"MG2Mk1", // twin mg
	"MG1Mk1", // mg, initial weapon
];
const TANK_FLAMERS = [
	"Howitzer-Incendiary",
	"Mortar-Incendiary",
]
const TANK_REPAIR_LIST = [
	"HeavyRepair",
	"LightRepair1",
];
const TANK_AA = [
	"AAGunLaser",
	"QuadRotAAGun", // whirlwind
	"QuadMg1AAGun" // hurricane
];
const CYBORG_LASERS = [
	"Cyb-Hvywpn-PulseLsr",
];
const CYBORG_MG = [
	"CyborgRotMG",
	"CyborgChaingun",
];
const SYSTEM_BODY_LIST = [
	"Body8MBT", // scorpion
	"Body5REC",  // Cobra
	"Body4ABT", // bug
	"Body1REC",  // Viper
];
const SYSTEM_PROP_LIST = [
	"hover01", // hover
	"HalfTrack",
	"wheeled01", // wheels
];
const SENSOR_TURRETS = [
	"Sensor-WideSpec",
	"SensorTurret1Mk1",
];
const VTOL_WEAPONS = [
	"Bomb5-VTOL-Plasmite",
	"ParticleGun-VTOL",
	"Laser2PULSE-VTOL", // pulse
	"Laser3BEAM-VTOL", // flashlight
	"Cannon4AUTO-VTOL",
	"MG4ROTARY-VTOL",
];
const VTOL_BODY_LIST = [
	//"Body14SUP", //dragon handled elsewhere
	"Body7ABT", // retribution
	"Body3MBT", // retaliation
	"Body6SUPP", // panther	
	"Body8MBT", // scorpion
	"Body5REC", // cobra
	"Body4ABT", // bug
];

// mixed attacker definitions for high tech
const MIX_VTOL_WEAPONS = [
	"Bomb5-VTOL-Plasmite",
	"RailGun2-VTOL",
	"Bomb5-VTOL-Plasmite",
	"Missile-VTOL-AT",
	"Bomb5-VTOL-Plasmite",
	"ParticleGun-VTOL",
];
const MIX_TANK_WEAPONS = [
	"RailGun3Mk1",
	"SpyTurret01",
	"ParticleGun",
];
const SECONDARY_TANK_WEAPONS = [
	"Laser2PULSEMk1",
	"RailGun3Mk1",
	"Missile-A-T",
];
const MIX_TANK_ARTILLERY = [
	"Howitzer-Incendiary",
	"PlasmaHeavy",
	"Missile-HvyArt",
];
const MIX_TANK_AA = [
	"AAGunLaser",
	"Missile-HvySAM",
];
const MIX_CYBORG = [
	"Cyb-Hvywpn-PulseLsr",
	"Cyb-Hvywpn-TK",
	"Cyb-Hvywpn-RailGunner",
];

// build tank attackers and cyborgs
function buildAttacker(struct) 
{
	if (DEBUG_EXTREME) {log("buildAttacker");}

	// build cyborgs
	if (struct.stattype === CYBORG_FACTORY)
	{
		if (relyOnCyborgs) { return buildCyborg(struct);}
		if (!relyOnCyborgs && random(100) < 30) { return buildCyborg(struct); }
		return false;
	}
	// build tanks
	const HOVER_CHANCE = 15;
	const WEAPON_CHANCE = 68;
	var weaponChoice;

	// if factory module and medium body are available, but factory is not upgraded do not build anything else
	if (struct.modules < 2 && isStructureAvailable("A0FacMod1") && (componentAvailable("Body5REC") || componentAvailable("Body8MBT")) )
	{ return false; }

	//Choose either flame or anti-tank.
	if (random(100) > WEAPON_CHANCE && componentAvailable("Mortar-Incendiary")) { weaponChoice = TANK_FLAMERS; }
	else { weaponChoice = TANK_WEAPON_LIST; }

	// build at least one AA unit if enemyHasVtol if needed
	if (enemyHasVtol && random(100) < 20 && groupSize(attackGroup) > MIN_GROUND_UNITS*1)
	{
		var vAA = 0;
		const AAfacs = enumStruct(me, FACTORY_STAT);
		for (fac of AAfacs)
		{
			var vdr = getDroidProduction(fac);
			if (vdr && vdr.canHitAir === true && vdr.canHitGround === false) { ++vAA; }
		}		
		var AAunits = [];
		AAunits = enumDroid(me).filter((obj) => (obj.canHitAir === true && obj.canHitGround === false) );
		if (AAunits.length + vAA < 1)
		{
			weaponChoice = TANK_AA;
		}
	}
	
	// maybe build more AA tanks if enemyHasVtol
	weaponChoice = (random(100) < 10 && enemyHasVtol) ? TANK_AA : weaponChoice;

	var prop = TANK_PROP_LIST;

	if ((isSeaMap || (random(100) < HOVER_CHANCE)) && componentAvailable("hover01"))
	{
		prop = "hover01";
	}

	// build repair tanks based on combat droid count and autorepair
	if (componentAvailable("HeavyRepair") || componentAvailable("LightRepair1") && random(100) < 80)
	{
		var div = 4;
		if (componentAvailable("AutoRepair")) { div = 8; }
		
		var repair = [];
		var combat = [];
		
		repair = enumDroid(me, DROID_REPAIR);
		combat = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false)).concat(enumDroid(me, DROID_CYBORG));
		
		var facs = enumStruct(me, FACTORY);
		var vrepair = 0;
		facs.forEach(fac => 
		{
			var vdr = getDroidProduction(fac);
			if (vdr && vdr.droidType === DROID_REPAIR) { ++vrepair; }
		});
		
		log("repair:"+repair.length+" vrepair:"+vrepair+" combat:"+combat.length+" combat/div:"+combat.length/div);
		if (repair.length + vrepair < combat.length/div || repair.length + vrepair < 1)
		{
			return buildRepair(struct, prop);
		}
	}
	
	// build MIN_SENSOR_DROIDS but only if needed
	if (groupSize(attackGroup) > MIN_GROUND_UNITS*2 && componentAvailable("SensorTurret1Mk1") && groupSize(sensorGroup) < MIN_SENSOR_DROIDS && random(100) < 30)
	{
		var vsensor = 0;
		const facs = enumStruct(me, FACTORY_STAT);
		for (fac of facs)
		{
			var vdr = getDroidProduction(fac);
			if (vdr && vdr.droidType === DROID_SENSOR) { ++vsensor; }
		}

		log("sensor:"+groupSize(sensorGroup)+" vsensor:"+vsensor);
		if (groupSize(sensorGroup) + vsensor < MIN_SENSOR_DROIDS)
		{
			return buildSensor(struct, prop);
		}
	}

	// build dragon multi turret tanks
	if (componentAvailable("Body14SUP")) 
	{
		if (random(100) < WEAPON_CHANCE)
		{
			var primary = shuffleArray(MIX_TANK_WEAPONS);
			var secondary = shuffleArray(SECONDARY_TANK_WEAPONS);
			// if spy turret build a double
			if (primary[0] === "SpyTurret01") { secondary = primary; }
			return buildDroid(struct, "Dragon Tank", "Body14SUP", prop, null, null, primary, secondary);
		}
		else
		{
			var primary = shuffleArray(MIX_TANK_ARTILLERY);
			var secondary = shuffleArray(MIX_TANK_AA);
			return buildDroid(struct, "Dragon Arti AA Tank", "Body14SUP", prop, null, null, primary, secondary);
		}
	}

	// build standard tank
	return buildDroid(struct, "Ranged Tank", TANK_BODY_LIST, prop, null, null, weaponChoice);
}

function buildSensor(struct, prop)
{
	if (DEBUG_EXTREME) {log("buildSensor");}
	if (struct == null || prop == null) { return; }
	return buildDroid(struct, "Sensor", TANK_BODY_LIST, prop, null, null, SENSOR_TURRETS);
}

function buildCommander(struct, prop)
{
	if (DEBUG_EXTREME) {log("buildCommander");}
	if (struct == null || prop == null) { return; }
	return buildDroid(struct, "Commander Tank", TANK_BODY_LIST, prop, null, null, COMMAND_TURRET);
}

function buildRepair(struct, prop)
{
	if (DEBUG_EXTREME) {log("buildRepair");}
	if (struct == null || prop == null) { return; }
	if (componentAvailable("Body13SUP")) // wyvern
	{
		return buildDroid(struct, "Heavy Repair Wyvern", "Body13SUP", prop, "", "", "HeavyRepair");
	}
	if (componentAvailable("HeavyRepair") && struct.modules > 0)
	{
		return buildDroid(struct, "Heavy Repair Tank", TANK_BODY_LIST, prop, "", "", "HeavyRepair");
	}	
	return buildDroid(struct, "Light Repair Tank", TANK_BODY_LIST, prop, "", "", "LightRepair1");
}

function buildCyborg(struct)
{
	if (DEBUG_EXTREME) {log("buildCyborg");}
	if (struct == null) { return; }
	// build 1 repair cyborg if there are no repairs
	// if (componentAvailable("CyborgRepair") && enumDroid(me, DROID_REPAIR).length === 0)
	// {
	// 	return buildDroid(struct, "Cyborg Repair", "CyborgLightBody", "CyborgLegs", "", "", "CyborgRepair");
	// }

	if (componentAvailable("CyborgHeavyBody"))
	{
		var mixcyborg = shuffleArray(MIX_CYBORG);
		return buildDroid(struct, "Mix Cyborg", "CyborgHeavyBody", "CyborgLegs", "", "", mixcyborg);
	} 
	else
	{
		return buildDroid(struct, "Cyborg MG", "CyborgLightBody", "CyborgLegs", "", "", CYBORG_MG);
	}
}

function buildVTOL(struct)
{
	if (DEBUG_EXTREME) {log("buildVTOL");}
	if (struct == null) { return; }
	if (componentAvailable("Body14SUP"))
	{
		var weapon = shuffleArray(MIX_VTOL_WEAPONS);
		return buildDroid(struct, "Dragon MIX VTOL", "Body14SUP", "V-Tol", "", "", weapon, weapon);
	}
	if (componentAvailable("Missile-VTOL-AT")) // 	"Missile-VTOL-AT",	"Bomb5-VTOL-Plasmite",
	{
		var weapon = shuffleArray(MIX_VTOL_WEAPONS);
		return buildDroid(struct, "MIX VTOL", VTOL_BODY_LIST, "V-Tol", "", "", weapon);
	}
	return buildDroid(struct, "VTOL", VTOL_BODY_LIST, "V-Tol", "", "", VTOL_WEAPONS);
}

function buildTruck(fac)
{
	if (!fac || !fac.stattype) { return false; }
	if (fac.stattype === FACTORY) { return buildDroid(fac, "Truck", SYSTEM_BODY_LIST, SYSTEM_PROP_LIST, null, null, "Spade1Mk1"); }
	if (fac.stattype === CYBORG_FACTORY) { return buildDroid(fac, "CyborgSpade", "CyborgLightBody", "CyborgLegs", "", "", "CyborgSpade"); }
	return false;
}

function produceAndResearch()
{
	if (DEBUG_EXTREME) {log("produceAndResearch");}
	if (getRealPower() < MIN_PRODUCTION_POWER)
	{
		return;
	}

	const FAC_LIST = [FACTORY_STAT, VTOL_FACTORY_STAT, CYBORG_FACTORY_STAT];
	var facsVirtual = enumStruct(me, FACTORY_STAT).concat(enumStruct(me, CYBORG_FACTORY_STAT));
	var virtualTrucks = 0;
	var i = 0;
	var x = 0;
	var l = 0;

	//Count the trucks being built so as not to build too many of them.
	for (i = 0, l = facsVirtual.length; i < l; ++i)
	{
		var virDroid = getDroidProduction(facsVirtual[i]);
		if (virDroid !== null)
		{
			if (virDroid.droidType === DROID_CONSTRUCT)
			{
				virtualTrucks += 1;
			}
		}
	}

	for (i = 0; i < 3; ++i)
	{
		var facs = enumStruct(me, FAC_LIST[i]);
		if (FAC_LIST[i] === CYBORG_FACTORY_STAT && isSeaMap === true)
		{
			continue;
		}
		for (x = 0, l = facs.length; x < l; ++x)
		{
			var fc = facs[x];
			if (structureIdle(fc))
			{
				if (FAC_LIST[i] === FACTORY_STAT || FAC_LIST[i] === CYBORG_FACTORY_STAT)
				{
					// check to see if trucks could be built
					if (countDroid(DROID_CONSTRUCT) + virtualTrucks < getDroidLimit(me, DROID_CONSTRUCT) -2)
					{
						// build early trucks
						if (gameTime < 1800000 && groupSize(oilBuilders) < MIN_OIL_TRUCKS*2) { buildTruck(fc); continue; }
						// build trucks as needed half the time, but not if under heavy attack
						if (baseUnderAttack < 3 && random(100) > 50 && countDroid(DROID_CONSTRUCT) + virtualTrucks < MIN_BASE_TRUCKS + MIN_OIL_TRUCKS)
							{ buildTruck(fc); continue; }
						// build extra trucks if lots of bare oil wells, but only if plenty of attackers
						var freeoils = enumFeature(ALL_PLAYERS, OIL_RES_STAT);
						if (freeoils && freeoils.length > 8 && random(100) > 50 && groupSize(attackGroup)+groupSize(vtolGroup) > MIN_ATTACK_GSIZE*3)
							{ buildTruck(fc); continue; }
					}

					// build attackers
					if (countStruct(POW_GEN_STAT) != 0 || getRealPower() > 1500)
					{
						if (getRealPower() > 1500 || !componentAvailable("V-Tol") || groupSize(vtolGroup) > MIN_VTOL_UNITS*3) { buildAttacker(fc); continue; }
						else if (relyOnVtols && componentAvailable("V-Tol") && groupSize(vtolGroup) < MIN_VTOL_UNITS*3) { continue; } // build nothing
						else if (random(100) < 50) { buildAttacker(fc); continue; }
					}
				}

				if (FAC_LIST[i] === VTOL_FACTORY_STAT && (countStruct(POW_GEN_STAT) != 0 || getRealPower() > 1500))
				{
					if (relyOnVtols) { buildVTOL(fc); continue; }
					else if (groupSize(attackGroup) > MIN_ATTACK_GSIZE && random(100) < 50) { buildVTOL(fc); continue; }
				}
			}
		}
	}

	lookForResearch();
}





