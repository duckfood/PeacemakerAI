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
	"Laser2PULSEMk1", // pulselaser, but not flashlight
	"Cannon4AUTOMk1", // HVC
	"Cannon2A-TMk1", // medium cannon, but don't research
	"Cannon1Mk1", // light cannon
	"MG2Mk1", // twin mg, but don't research
	"MG1Mk1", // mg, initial weapon
];
const TANK_FLAMERS = [
	"Howitzer-Incendiary",
	"Mortar-Incendiary",
	"PlasmiteFlamer",
	"Flame2",
	"Flame1Mk1",
]
const TANK_REPAIR_LIST = [
	"HeavyRepair",
	"LightRepair1",
];

const TANK_AA = [
	"AAGunLaser",
	"AAGun2Mk1",
];
const CYBORG_FLAMERS = [
	"Cyb-Wpn-Thermite",
	"CyborgFlamer01",
];
const CYBORG_LASERS = [
	"Cyb-Hvywpn-PulseLsr",
];
// System definitions
const SYSTEM_BODY_LIST = [
	// "Body3MBT",  // retaliation too expensive
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
const COMMAND_TURRET = "CommandBrain01";

// vtol definitions
const VTOL_WEAPONS = [
	"Bomb5-VTOL-Plasmite",
	"Laser2PULSE-VTOL",
	"Laser3BEAM-VTOL",
	"Cannon4AUTO-VTOL",
];
const VTOL_BODY_LIST = [
	//"Body14SUP", // dragon too slow
	"Body7ABT", // retribution
	"Body3MBT", // retaliation
	"Body6SUPP", // panther	
	//"Body2SUP", // leopard low value
	"Body8MBT", // scorpion
	"Body5REC", // cobra
	"Body4ABT", // bug
];

// mixed attacker definitions for MultiTechLevel > 3
const MIX_VTOL_WEAPONS = [
	"Bomb5-VTOL-Plasmite",
	"Laser2PULSE-VTOL",
	"Bomb5-VTOL-Plasmite",
	"RailGun2-VTOL",
	"Missile-VTOL-AT",
	"Bomb5-VTOL-Plasmite",
];
const MIX_TANK_WEAPONS = [
	"Laser2PULSEMk1",
	"RailGun3Mk1",
	"Missile-A-T",
	"RailGun3Mk1",
	"HeavyLaser",
];
const MIX_TANK_ARTILLERY = [
	"Howitzer-Incendiary",
	"MortarEMP",
	"Howitzer150Mk1",
	"Missile-HvyArt",
	"Howitzer-Incendiary",
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

// build tanks
function buildAttacker(struct) 
{
	const HOVER_CHANCE = 15;
	const WEAPON_CHANCE = 68;
	
	// build MIN_SENSOR_DROIDS 
	if (componentAvailable("SensorTurret1Mk1") && groupSize(sensorGroup) < MIN_SENSOR_DROIDS && random(100) < 10) 
	{ 
		var vsensor = 0;
		const facs = enumStruct(me, FACTORY_STAT);
		for (fac of facs)
		{
			var vdr = getDroidProduction(fac);
			if (vdr && vdr.droidType === DROID_SENSOR) { ++vsensor; }
		}
		
		log("sensor:"+groupSize(sensorGroup)+" vsensor:"+vsensor);
		if (groupSize(sensorGroup) + vsensor < MIN_SENSOR_DROIDS) { return buildSensor(struct); }
	}
		
	// if factory module and medium body are available, but factory is not upgraded do not build anything else
	if (struct.modules < 2 && isStructureAvailable("A0FacMod1") && (componentAvailable("Body5REC") || componentAvailable("Body8MBT")) ) 
	{ return false; }	

	//Choose either flame or anti-tank.
	var weaponChoice = (random(100) < WEAPON_CHANCE) ? TANK_WEAPON_LIST : TANK_FLAMERS;

	// build at least one AA unit if enemyHasVtol
	if (enemyHasVtol) 
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

	// build command turret droid if available and group is empty
	if (random(100) < 33 && componentAvailable(COMMAND_TURRET) && componentAvailable("Body11ABT") && enumGroup(commanderGroup).length < 1 && countStruct(RELAY_POST_STAT) > 0)
	{
		var cprop;
		if (isSeaMap) { cprop = "hover01"; }
		else { cprop = TANK_PROP_LIST; }

		var vcommand = 0;
		const facs = enumStruct(me, FACTORY);
		for (fac of facs)
		{
			var vdr = getDroidProduction(fac);
			if (vdr && vdr.droidType === DROID_COMMAND) { ++vcommand; }
		}

		log("command:"+enumDroid(me, DROID_COMMAND)+" vcommand:"+vcommand);
		if (enumDroid(me, DROID_COMMAND) + vcommand < 1)
		{
			return buildCommander(struct, cprop);
		}
	}

	var prop = TANK_PROP_LIST;

	if ((isSeaMap || (random(100) < HOVER_CHANCE)) && componentAvailable("hover01"))
	{
		prop = "hover01";
	}

	// build repair tanks based on combat droid count and autorepair
	if (componentAvailable("HeavyRepair") || componentAvailable("LightRepair1") && random(100) < 50)
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
	
	// build dragon multi turret tanks
	if (componentAvailable("Body14SUP")) 
	{
		if (random(100) < WEAPON_CHANCE)
		{
			var primary = JSON.parse(JSON.stringify(MIX_TANK_WEAPONS)); // without this deep copy primary and secondary would be the same after shuffle
			primary = shuffleArray(primary);
			var secondary = JSON.parse(JSON.stringify(MIX_TANK_WEAPONS));
			secondary = shuffleArray(secondary);
			return buildDroid(struct, "Dragon Tank", TANK_BODY_LIST, prop, null, null, primary, secondary);
		}
		else
		{
			var primary = shuffleArray(MIX_TANK_ARTILLERY);
			var secondary = shuffleArray(MIX_TANK_AA);
			return buildDroid(struct, "Dragon Arti AA Tank", TANK_BODY_LIST, prop, null, null, primary, secondary);			
		}
	}

	// build standard tank
	return buildDroid(struct, "Ranged Tank", TANK_BODY_LIST, prop, null, null, weaponChoice);
}
function buildSensor(struct)
{
	if (struct == null) { return; }
	return buildDroid(struct, "Sensor", SYSTEM_BODY_LIST, SYSTEM_PROP_LIST, null, null, SENSOR_TURRETS);
}
function buildCommander(struct, prop)
{
	if (struct == null || prop == null) { return; }
	return buildDroid(struct, "Commander Tank", TANK_BODY_LIST, prop, null, null, COMMAND_TURRET);
}

function buildRepair(struct, prop)
{
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
	if (struct == null) { return; }
	
	if (getMultiTechLevel() > 2) 
	{
		var cyborg = shuffleArray(MIX_CYBORG);
		return buildDroid(struct, "Mix Cyborg", "CyborgHeavyBody", "CyborgLegs", "", "", cyborg);
	}	
	
	if (componentAvailable("Cyb-Hvywpn-PulseLsr") && random(100) < 80)
	{
		return buildDroid(struct, "Cyborg Pulse Laser", "CyborgHeavyBody", "CyborgLegs", "", "", "Cyb-Hvywpn-PulseLsr");
	} 
	else
	{
		return buildDroid(struct, "Cyborg Flamer", "CyborgLightBody", "CyborgLegs", "", "", CYBORG_FLAMERS);
	}
}

function buildVTOL(struct)
{
	if (struct == null) { return; }
	if (getMultiTechLevel() > 3) 
	{
		var weapon = shuffleArray(MIX_VTOL_WEAPONS);
		return buildDroid(struct, "MIX VTOL", VTOL_BODY_LIST, "V-Tol", "", "", weapon, weapon);
	}
	return buildDroid(struct, "VTOL", VTOL_BODY_LIST, "V-Tol", "", "", VTOL_WEAPONS);
}

function produceAndResearch()
{
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
				if (FAC_LIST[i] === FACTORY_STAT)
				{
					if (random(100) > 50 && baseUnderAttack < 2 && countDroid(DROID_CONSTRUCT) + virtualTrucks < getDroidLimit(me, DROID_CONSTRUCT) -2)
					{
						if ((countDroid(DROID_CONSTRUCT) + virtualTrucks < MIN_BASE_TRUCKS + MIN_OIL_TRUCKS) || (countStruct(POW_GEN_STAT) > 2) ) // //enumFeature(me, OIL_RES_STAT).length > 4
						{ buildDroid(fc, "Truck", SYSTEM_BODY_LIST, SYSTEM_PROP_LIST, null, null, "Spade1Mk1");; }
					}
					else
					{
						if (countStruct(POW_GEN_STAT))
						{
							if (getRealPower() > 1500 || !componentAvailable("V-Tol") || groupSize(vtolGroup) > MIN_ATTACK_GSIZE*2.5) { buildAttacker(fc); }
							else if (componentAvailable("V-Tol") && groupSize(vtolGroup) < MIN_ATTACK_GSIZE) {} // build nothing
							else if (random(100) < 50) { buildAttacker(fc); } 
						}
					}
				}
				else
				{
					if (!countStruct(POW_GEN_STAT))
					{
						continue;
					}

					if (FAC_LIST[i] === CYBORG_FACTORY_STAT)
					{
					if (random(100) > 50 && baseUnderAttack < 2 && countDroid(DROID_CONSTRUCT) + virtualTrucks < getDroidLimit(me, DROID_CONSTRUCT) -2)
					{
						if ((countDroid(DROID_CONSTRUCT) + virtualTrucks < MIN_BASE_TRUCKS + MIN_OIL_TRUCKS) || (countStruct(POW_GEN_STAT) > 2 ) )
						{ buildDroid(fc, "CyborgSpade", "CyborgLightBody", "CyborgLegs", "", "", "CyborgSpade"); }
					}
					else
						{
							if (getRealPower() > 1500 || (!componentAvailable("Cannon4AUTOMk1") && random(100) < 50)) { buildCyborg(fc); }
							else if (componentAvailable("V-Tol") && groupSize(vtolGroup) < MIN_ATTACK_GSIZE) {} // build nothing
							else if (random(100) < 50) { buildCyborg(fc); }
						}
					}
					else
					{
						if (enumGroup(vtolGroup) > MIN_ATTACK_GSIZE*6 && random(100) < 50) { buildVTOL(fc); }
						else { buildVTOL(fc); }
					}
				}
			}
		}
	}

	lookForResearch();
}
