// standard production definitions
const TANK_BODY_LIST = [
	"Body14SUP", // dragon
	"Body13SUP", // wyvern
	"Body9REC", // tiger
	"Body12SUP", // mantis
	"Body11ABT", // python
	"Body8MBT", // scorpion
	"Body5REC", // cobra
	"Body4ABT", // bug
	"Body1REC", // viper
];
const VTOL_BODY_LIST = [
	"Body14SUP", // dragon
	"Body7ABT", // retribution
	"Body3MBT", // retaliation
	"Body6SUPP", // panther
	"Body8MBT", // scorpion
	"Body5REC", // cobra
	"Body4ABT", // bug
];
const SYSTEM_BODY_LIST = [
	"Body8MBT", // scorpion
	"Body5REC",  // Cobra
	"Body4ABT", // bug
	"Body1REC",  // Viper
];
const TANK_PROP_LIST = [
	"tracked01",
	"HalfTrack",
	"wheeled01",
];
const ARTILLERY_PROP_LIST = [
	"HalfTrack",
	"wheeled01",
];
const SYSTEM_PROP_LIST = [
	"hover01",
	"HalfTrack",
	"wheeled01",
];
const SENSOR_TURRETS_LIST = [
	"Sensor-WideSpec",
	"SensorTurret1Mk1",
];
const TANK_REPAIR_LIST = [
	"HeavyRepair",
	"LightRepair1",
];

// mixed attacker definitions for high tech
const MIX_VTOL_WEAPONS = [
	"Bomb5-VTOL-Plasmite",
	"RailGun2-VTOL",
	"Bomb5-VTOL-Plasmite",
	"Missile-VTOL-AT",
	"ParticleGun-VTOL",
];
const MIX_TANK_WEAPONS = [
	"RailGun3Mk1",
	"ParticleGun",
	"Missile-A-T",
];
const SECONDARY_TANK_WEAPONS = [
	"ParticleGun",
	"RailGun3Mk1",
	"Missile-A-T",
];
const MIX_TANK_ARTILLERY = [
	"Howitzer-Incendiary",
];
const MIX_TANK_AA = [
	"AAGunLaser",
	"Missile-HvySAM",
];
const MIX_CYBORG = [
	"Cyb-Hvywpn-PulseLsr",
	"Cyb-Hvywpn-A-T",
	"Cyb-Hvywpn-RailGunner",

];

const HOVER_CHANCE = 8;
const ARTILLERY_CHANCE = 32;
const AA_CHANCE = 8;

// build tank attackers and cyborgs
function buildAttacker(fac)
{
	// build cyborgs
	if (fac.stattype === CYBORG_FACTORY)
	{
		if (relyOnCyborgs) return buildCyborg(fac);
		if (!relyOnCyborgs && random(100) < 30) return buildCyborg(fac);
	}

	// if factory module and medium body are available, but factory is not upgraded do not build anything else
	if (fac.modules < 1 && isStructureAvailable("A0FacMod1") && (componentAvailable("Body5REC") || componentAvailable("Body8MBT")) )
		{ return false; }

	let prop = TANK_PROP_LIST;
	if ((isSeaMap || (random(100) < HOVER_CHANCE)) && componentAvailable("hover01")) prop = ["hover01"];

	// build repair tanks based on combat droid count and autorepair
	if (componentAvailable("HeavyRepair") || componentAvailable("LightRepair1") && random(100) < 80)
	{
		let div = 4;
		if (componentAvailable("AutoRepair")) { div = 8; }
		
		let repair = [];
		let combat = [];
		
		repair = enumDroid(me, DROID_REPAIR);
		combat = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false)).concat(enumDroid(me, DROID_CYBORG));
		
		let facs = enumStruct(me, FACTORY);
		let vrepair = 0;
		for (let fac of facs)
		{
			let vdr = getDroidProduction(fac);
			if (vdr && vdr.droidType === DROID_REPAIR) { ++vrepair; }
		}
		
		log("repair:"+repair.length+" vrepair:"+vrepair+" combat:"+combat.length+" combat/div:"+combat.length/div);
		if (repair.length + vrepair < combat.length/div || repair.length + vrepair < 1)
		{
			return buildRepair(fac, prop);
		}
	}

	//build mobile artillery
	if (componentAvailable("Mortar-Incendiary") && random(100) < ARTILLERY_CHANCE) return buildMobileArtillery(fac);

	// build AA tanks based on combat droid count
	if (enemyHasVtol && componentAvailable("QuadMg1AAGun"))
	{
		let div = 10;
		if (componentAvailable("AAGunLaser")) { div = 20; }

		let AA = enumDroid(me, DROID_WEAPON).filter((obj) => (obj.canHitAir === true && obj.canHitGround === false) );
		let combat = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false)).concat(enumDroid(me, DROID_CYBORG));

		let facs = enumStruct(me, FACTORY);
		let vAA = 0;
		for (let fac of facs)
		{
			let vdr = getDroidProduction(fac);
			if (vdr && vdr.droidType === DROID_WEAPON && vdr.canHitAir === true && vdr.canHitGround === false)
				{ ++vAA; }
		}

		log("AA:"+AA.length+" vAA:"+vAA.length+" combat:"+combat.length+" combat/div:"+combat.length/div);
		if (AA.length + vAA < combat.length/div || AA.length + vAA < 1)
		{
			return buildMobileAA(fac);
		}
	}

	// build MIN_SENSOR_DROIDS but only if needed
	if (groupSize(attackGroup) > MIN_GROUND_UNITS*2 && componentAvailable("SensorTurret1Mk1") && groupSize(sensorGroup) < MIN_SENSOR_DROIDS && random(100) < 30)
	{
		let vsensor = 0;
		const facs = enumStruct(me, FACTORY_STAT);
		for (let fac of facs)
		{
			let vdr = getDroidProduction(fac);
			if (vdr && vdr.droidType === DROID_SENSOR) { ++vsensor; }
		}

		log("sensor:"+groupSize(sensorGroup)+" vsensor:"+vsensor);
		if (groupSize(sensorGroup) + vsensor < MIN_SENSOR_DROIDS)
		{
			return buildSensor(fac, prop);
		}
	}

	// build tanks
	return buildTank(fac, prop)
}

function buildTank(fac, prop)
{
	if (!fac) return false;
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	// build dragon multi turret tanks
	if (componentAvailable("Body14SUP"))
	{
		let weapon1 = shuffleArray(MIX_TANK_WEAPONS);
		let weapon2 = shuffleArray(SECONDARY_TANK_WEAPONS);
		if (weapon1[0] === "SpyTurret01") weapon2 = weapon1;
		let weaponName1 = StatsMap.get(firstAvailableComponent(weapon1)).Name;
		let weaponName2 = StatsMap.get(firstAvailableComponent(weapon2)).Name;
		let bodyName = StatsMap.get("Body14SUP").Name;
		return buildDroid(fac, weaponName1+" "+weaponName2+" "+bodyName+" "+propName, "Body14SUP", prop, null, null, weapon1, weapon2);
	}
	// build standard tank
	let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].TANK_WEAPON_LIST)).Name;
	let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
	return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, Schemes[Scheme].TANK_WEAPON_LIST);
}

function buildMobileArtillery(fac, prop)
{
	if (!fac) return false;
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : ARTILLERY_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	if (fac.stattype === FACTORY && componentAvailable("Body14SUP"))
	{
		let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].TANK_ARTILLERY_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, "Body14SUP", prop, null, null, Schemes[Scheme].TANK_ARTILLERY_LIST, Schemes[Scheme].TANK_ARTILLERY_LIST);
	}
	else if (fac.stattype === FACTORY)
	{
		let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].TANK_ARTILLERY_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, Schemes[Scheme].TANK_ARTILLERY_LIST);
	}
	else if (fac.stattype === CYBORG_FACTORY)
	{
		return buildDroid(fac, "Cyborg Mortar", "CyborgLightBody", "CyborgLegs", "", "", "Cyb-Wpn-Grenade");
	}
	return false;
}

function buildMobileAA(fac, prop)
{
	if (!fac) return false;
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	if (fac.stattype === FACTORY && componentAvailable("Body14SUP"))
	{
		let mixAA = shuffleArray(MIX_TANK_AA);
		let weaponName = StatsMap.get(firstAvailableComponent(mixAA)).Name;
		let bodyName = StatsMap.get("Body14SUP").Name;
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, "Body14SUP", prop, null, null, mixAA, mixAA);
	}
	else if (fac.stattype === FACTORY)
	{
		let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].TANK_AA_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, Schemes[Scheme].TANK_AA_LIST);
	}
	return false;
}

function buildSensor(fac, prop)
{
	if (fac == null || prop == null) { return false; }
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;
	let weaponName = StatsMap.get(firstAvailableComponent(SENSOR_TURRETS_LIST)).Name;

	if (componentAvailable("Body13SUP")) // wyvern
	{
		return buildDroid(fac, weaponName+" Wyvern "+propName, "Body13SUP", prop, "", "", SENSOR_TURRETS_LIST);
	}

	let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
	return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, SENSOR_TURRETS_LIST);
}

function buildRepair(fac, prop)
{
	if (fac == null || prop == null) { return; }
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	if (componentAvailable("Body13SUP")) // wyvern
	{
		return buildDroid(fac, "Heavy Repair Wyvern "+propName, "Body13SUP", prop, "", "", "HeavyRepair");
	}

	let weaponName = StatsMap.get(firstAvailableComponent(TANK_REPAIR_LIST)).Name;
	let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
	return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, "", "", TANK_REPAIR_LIST);
}

function buildCyborg(fac)
{
	if (!fac) return false;

	if (componentAvailable("CyborgHeavyBody"))
	{
		if (componentAvailable("Cyb-Hvywpn-A-T") || componentAvailable("Cyb-Hvywpn-PulseLsr")) {
			let mixCyborgs = shuffleArray(MIX_CYBORG);
			let weaponName = StatsMap.get(firstAvailableComponent(mixCyborgs)).Name;
			return buildDroid(fac, weaponName, "CyborgHeavyBody", "CyborgLegs", "", "", mixCyborgs);
		} else {
			let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].CYBORG_ADVANCED_LIST)).Name;
			return buildDroid(fac, weaponName, "CyborgHeavyBody", "CyborgLegs", "", "", Schemes[Scheme].CYBORG_ADVANCED_LIST);
		}
	} 
	else
	{
		let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].CYBORG_BASIC_LIST)).Name;
		return buildDroid(fac, weaponName, "CyborgLightBody", "CyborgLegs", "", "", Schemes[Scheme].CYBORG_BASIC_LIST);
	}
}

function buildVTOL(fac)
{
	if (fac == undefined) return;
	let prop = "V-Tol";
	let weapon;
	if (componentAvailable("Body14SUP")) {
		weapon = shuffleArray(MIX_VTOL_WEAPONS);
	} else {
		weapon = Schemes[Scheme].VTOL_WEAPONS;
	}
	let weaponName = StatsMap.get(firstAvailableComponent(weapon)).Name;
	let propName = StatsMap.get(prop).Name;
	let bodyName = StatsMap.get(firstAvailableComponent(VTOL_BODY_LIST)).Name;
	return buildDroid(fac, weaponName+" "+bodyName, VTOL_BODY_LIST, prop, "", "", weapon, weapon);
}

function buildTruck(fac)
{
	if (!fac || !fac.stattype) { return false; }
	if (fac.stattype === FACTORY) {
		let propName = StatsMap.get(firstAvailableComponent(SYSTEM_PROP_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(SYSTEM_BODY_LIST)).Name;
		return buildDroid(fac, "Spade "+bodyName+" "+propName, SYSTEM_BODY_LIST, SYSTEM_PROP_LIST, null, null, "Spade1Mk1");
	}
	if (fac.stattype === CYBORG_FACTORY) { return buildDroid(fac, "Spade Cyborg", "CyborgLightBody", "CyborgLegs", "", "", "CyborgSpade"); }
	return false;
}

//// working version
function produceAndResearch()
{
	if (getRealPower() < MIN_PRODUCTION_POWER) return;

	const FAC_LIST = [FACTORY_STAT, VTOL_FACTORY_STAT, CYBORG_FACTORY_STAT];
	let facsVirtual = enumStruct(me, FACTORY_STAT).concat(enumStruct(me, CYBORG_FACTORY_STAT));
	let virtualTrucks = 0;
	let i = 0;
	let x = 0;
	let l = 0;

	// count the trucks being built so as not to build too many of them
	for (let i = 0, l = facsVirtual.length; i < l; ++i)
	{
		let virDroid = getDroidProduction(facsVirtual[i]);
		if (virDroid !== null)
		{
			if (virDroid.droidType === DROID_CONSTRUCT) virtualTrucks += 1;
		}
	}

	for (let i = 0; i < 3; ++i)
	{
		let facs = enumStruct(me, FAC_LIST[i]);
		if (FAC_LIST[i] === CYBORG_FACTORY_STAT && isSeaMap === true) continue;
		for (let x = 0, l = facs.length; x < l; ++x)
		{
			let fc = facs[x];
			if (structureIdle(fc))
			{
				if (FAC_LIST[i] === FACTORY_STAT || FAC_LIST[i] === CYBORG_FACTORY_STAT)
				{
					// check to see if trucks could be built
					if (countDroid(DROID_CONSTRUCT) + virtualTrucks < getDroidLimit(me, DROID_CONSTRUCT) -2)
					{
						let freeoils = enumFeature(ALL_PLAYERS, OIL_RES_STAT);
						// build early trucks but only if oil is available
						if (gameTime < 180000 && groupSize(oilBuilders) < MIN_OIL_TRUCKS*2 && freeoils.length > 12) { buildTruck(fc); continue; }
						// build trucks as needed half the time, but not if under heavy attack
						if (baseUnderAttack < 3 && random(100) > 50 && countDroid(DROID_CONSTRUCT) + virtualTrucks < MIN_BASE_TRUCKS + MIN_OIL_TRUCKS)
							{ buildTruck(fc); continue; }
						// build extra trucks if lots of bare oil wells, but only if plenty of attackers
						if (freeoils && freeoils.length > 12 && random(100) > 50 && groupSize(attackGroup)+groupSize(vtolGroup) > MIN_ATTACK_GSIZE*3)
							{ buildTruck(fc); continue; }
					}

					// build attackers
					if (countStruct(POW_GEN_STAT) !== 0 || getRealPower() > 1500)
					{
						if (random(100) < 70) { buildAttacker(fc); continue; }
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





