// standard production definitions
const TANK_BODY_LIST = [
	//"Body14SUP", // dragon extra heavy slower
	//"Body13SUP", // wyvern heavy slow
	"Body10MBT", // vengeance heavy
	"Body7ABT", // retribution medium
	//"Body9REC", // tiger heavy way too slow
	"Body12SUP", // mantis heavy
	"Body6SUPP", // panther medium
	"Body11ABT", // python heavy
	"Body8MBT", // scorpion medium
	"Body5REC", // cobra medium
	"Body3MBT", // retaliation light
	"Body2SUP", // leopard light
	"Body4ABT", // bug light
	"Body1REC", // viper light
];
const VTOL_BODY_LIST = [
	"Body14SUP", // dragon
	"Body10MBT", // vengeance
	"Body7ABT", // retribution
	"Body9REC", // tiger
	"Body6SUPP", // panther
	"Body8MBT", // scorpion
	"Body5REC", // cobra
	"Body4ABT", // bug
];
const SYSTEM_BODY_LIST = [
	"Body8MBT", // scorpion
	"Body5REC",  // cobra
	"Body4ABT", // bug
	"Body1REC",  // viper
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
const CYBORG_REPAIR = "CyborgRepair";
const CYBORG_LEGS =	"CyborgLegs";

const MEDIUM_BODY_LIST = [
	"Body7ABT", // retribution
	"Body6SUPP", // panther
	"Body8MBT", // scorpion
	"Body5REC", // cobra
];

const VTOL_ROCKET_BB = "Rocket-VTOL-BB";

// standard artillery
const CYBORG_MORTAR = ["Cyb-Wpn-Grenade"];
const INCENDIARY_MORTAR = ["Mortar-Incendiary"];
const INCENDIARY_HOWITZER = ["Howitzer-Incendiary"];

// mixed attacker definitions for high tech
const MIX_VTOL_WEAPONS = [
	"Bomb5-VTOL-Plasmite",
	"Missile-VTOL-AT",
	"Bomb5-VTOL-Plasmite",
	"Missile-VTOL-AT",
	"ParticleGun-VTOL",
];
const MIX_TANK_WEAPONS = [
	"RailGun3Mk1",
	"ParticleGun",
	"Missile-A-T",
	"Missile-A-T",
];
const SECONDARY_TANK_WEAPONS = [
	"ParticleGun",
	"RailGun3Mk1",
	"Missile-A-T",
	"Missile-A-T",
];

const MIX_TANK_AA = [
	"AAGunLaser",
	"Missile-HvySAM",
];
const MIX_CYBORG = [
	"Cyb-Hvywpn-PulseLsr",
	"Cyb-Hvywpn-A-T",
	"Cyb-Hvywpn-A-T",
	"Cyb-Hvywpn-RailGunner",
];

const HOVER_CHANCE = 6;
const ARTILLERY_CHANCE = 45;
const REPAIR_CHANCE = 75;
const AA_CHANCE = 10;

function produceDroids() { queue("produceDroidsQ"); } // timer
// modernized version
function produceDroidsQ() {
    if (getRealPower() < MIN_PRODUCTION_POWER) return;

    const vtrucksFromStandard = countVirtualProduction(me, FACTORY_STAT, DROID_CONSTRUCT);
    const vtrucksFromCyborg = countVirtualProduction(me, CYBORG_FACTORY_STAT, DROID_CONSTRUCT);
    const virtualTrucks = vtrucksFromStandard + vtrucksFromCyborg;

    for (const factoryType of shuffleArray(FACTORY_TYPES)) {
        const factories = enumStruct(me, factoryType);

        if (factoryType === CYBORG_FACTORY_STAT && isSeaMap) continue;
        for (const factory of factories) {
            if (!structureIdle(factory)) continue;
            if (factoryType === FACTORY_STAT || factoryType === CYBORG_FACTORY_STAT) handleGroundUnitProduction(factory, virtualTrucks);
            if (factoryType === VTOL_FACTORY_STAT) handleVTOLProduction(factory);
        }
    }
}
function handleGroundUnitProduction(factory, virtualTrucks) {
    const currentTrucks = countDroid(DROID_CONSTRUCT);
    const truckLimit = getDroidLimit(me, DROID_CONSTRUCT) - 2;

	if (gameTime < THREE_MINUTE && groupSize(baseBuilders) >= MIN_BASE_TRUCKS && groupSize(oilBuilders) >= MIN_OIL_TRUCKS) {
		// build demo droid
		if (!builtFirstCombat && enumStruct(me, HQ).length && buildDemoDroid(factory)) return true;
		// check if we should build an early artillery posse before more trucks
		if (factory.stattype === FACTORY && componentAvailable(INCENDIARY_MORTAR) && enumStruct(me, HQ).length &&
			!enumGroup(attackGroup).filter(obj => obj.hasIndirect === true).length && buildMobileArtillery(factory)) return true;
	}

    // check if we can build more trucks
    if (currentTrucks + virtualTrucks < truckLimit) {
        const freeOils = seenStore.query( { type: FEATURE, stattype: OIL_RESOURCE } ).filter(obj => obj.lastSeen > gameTime - TEN_MINUTE*2).length;
        const totalOils = oilResourceStore.query({ isReachable: true }).length;
		log("freeOils:"+freeOils+" totalOils:"+totalOils);

        // build early trucks
        if (gameTime < FOUR_MINUTE) {
            const needsOilTrucks = (totalOils > LOW_OIL_MAP && !isSeaMap && !isAirMap && groupSize(oilBuilders) < MAX_OIL_TRUCKS - 2);
            const highOilExpansion = (!isSeaMap && groupSize(oilBuilders) < MAX_OIL_TRUCKS && totalOils > HIGH_OIL_MAP);
            const maintainBase = (groupSize(baseBuilders) === MIN_BASE_TRUCKS);

            if (needsOilTrucks || highOilExpansion || maintainBase) return buildTruck(factory);
        }

        // build replacement trucks if safe
        if (baseUnderAttack <= 2 || Math.random() * 100 < 10) { // maybe build anyway
			let combats = groupSize(attackGroup);
			let hasRepair = groupSize(repairGroup) || countStruct(REPAIR_FACILITY_STAT);
			// build min replacement trucks if repairs
			if (gameTime < FIVE_MINUTE && hasRepair) {
				if (groupSize(baseBuilders) < MIN_BASE_TRUCKS) return buildTruck(factory);
				if (groupSize(oilBuilders) < MIN_OIL_TRUCKS) return buildTruck(factory);
			}
			if (gameTime > FIVE_MINUTE) {
				if (groupSize(baseBuilders) < MIN_BASE_TRUCKS) return buildTruck(factory);
				if (groupSize(oilBuilders) < MIN_OIL_TRUCKS) return buildTruck(factory);
			}

			// build extra trucks if many free oils and plenty of attackers
			if (freeOils > 5 && groupSize(oilBuilders) < MAX_OIL_TRUCKS && groupSize(attackGroup) > MIN_ATTACK_GSIZE * 2 && random(100) > 50) {
				return buildTruck(factory);
			}
        }
    }

    if (countStruct(POW_GEN_STAT) !== 0 || getRealPower() > 500) {
		// build cyborgs
		if (factory.stattype === CYBORG_FACTORY) {
			return buildCyborg(factory);
		//build attackers if factory upgraded to available body size
		} else {
			if (!builtFirstCombat) return buildDemoDroid(factory);
			// if python is available 2 modules
			//if (componentAvailable("Body11ABT") && factory.modules < 2) return false;
			// if cobra available 1 module
			if (componentAvailable("Body5REC") && factory.modules < 1) return false;
			return buildTankForces(factory);
		}

	}
}
function handleVTOLProduction(factory) {
    const highPower = (countStruct(POW_GEN_STAT) !== 0 || getRealPower() > 1000);
    if (!highPower) return;

    const aaVtolCount = seenStore.query({ player: me, isAA: true, isVTOL: true }).length;
    const needsAA = enemyHasVtol && (groupSize(vtolGroup) / 10 > aaVtolCount + 1);

    if (componentAvailable("Rocket-VTOL-Sunburst") && needsAA && random(100) < 50) {
        return buildAAVTOL(factory);
    }

    if (relyOnVtols) {
        buildVTOL(factory);
    } else if (groupSize(attackGroup) > MIN_ATTACK_GSIZE * 2 && random(100) < 80) {
        buildVTOL(factory);
    }
}

// modernized version
function buildTankForces(fac) {
    if (!fac || !fac.id || fac.stattype !== FACTORY || isAirMap) return false;

    let prop = TANK_PROP_LIST;
    if ((isSeaMap || (random(100) < HOVER_CHANCE)) && componentAvailable("hover01")) prop = ["hover01"];

    if (fac.modules === 0 && isStructureAvailable(FAC_MODULE_STAT) && (componentAvailable("Body5REC") || componentAvailable("Body8MBT"))) {
        return false;
    }

    // build mobile artillery
    if (componentAvailable(INCENDIARY_MORTAR)) {
        if (seenStore.query({ player: me, type: DROID, hasIndirect: true }).length === 0 && buildMobileArtillery(fac)) return true;
        if (random(100) < ARTILLERY_CHANCE && buildMobileArtillery(fac)) return true;
    }

    // build repair tanks based on combat droid count and autorepair
    if (componentAvailable("HeavyRepair") || componentAvailable("LightRepair1")) {
        let div = 5;
        if (componentAvailable("AutoRepair")) div = 10;

        const repair = enumDroid(me, DROID_REPAIR);
        const combat = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false)).concat(enumDroid(me, DROID_CYBORG));
        const vrepair = countVirtualProduction(me, FACTORY, DROID_REPAIR);
        log(`repair:${repair.length} vrepair:${vrepair} combat:${combat.length} combat/div:${combat.length/div}`);
		// build one repair at least
		if ((!repair || !repair.length) && !vrepair && buildRepair(fac, prop)) return true;
		// maybe build more if needed
		if (random(100) < REPAIR_CHANCE) {
			if (repair.length + vrepair < combat.length / div || repair.length + vrepair < 1 && buildRepair(fac, prop)) return true;
		}
    }

    // build AA tanks based on combat droid count
    if (enemyHasVtol && componentAvailable("QuadMg1AAGun") && random(100) < 50) {
        let div = 10;
        if (componentAvailable("AAGunLaser")) div = 15;

        const combat = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false)).concat(enumDroid(me, DROID_CYBORG));
		const AA = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false && dr.canHitAir === true && dr.canHitGround === false));
        const vAA = countVirtualProduction(me, FACTORY, DROID_WEAPON, (vdr) => vdr.canHitAir === true && vdr.canHitGround === false);
        log(`AA:${AA.length} vAA:${vAA} combat:${combat.length} combat/div:${combat.length/div}`);
        if (AA.length + vAA < combat.length / div || AA.length + vAA < 1 && buildMobileAA(fac)) return true;
    }

    // build MIN_SENSOR_DROIDS but only if needed
    if (groupSize(attackGroup) > MIN_GROUND_UNITS * 2 && componentAvailable("SensorTurret1Mk1") && groupSize(sensorGroup) < MIN_SENSOR_DROIDS && random(100) < 50) {
        const vsensor = countVirtualProduction(me, FACTORY_STAT, DROID_SENSOR);
        log(`sensor:${groupSize(sensorGroup)} vsensor:${vsensor}`);
        if (groupSize(sensorGroup) + vsensor < MIN_SENSOR_DROIDS && buildSensor(fac, prop)) return true;
    }

    // build tanks then
    return buildTank(fac, prop);
}

function buildDemoDroid(fac)
{
	if (fac.stattype === FACTORY) {
		if (!builtFirstCombat) {
			builtFirstCombat = buildDroid(fac, "Demolition Tank", ["Body4ABT", "Body1REC"], "wheeled01", null, null, "MG1Mk1");
			return builtFirstCombat;
		}
	}
	if (fac.stattype === CYBORG_FACTORY) {
		if (!builtFirstCombat) {
			builtFirstCombat = buildDroid(fac, "Demolition Cyborg", "CyborgLightBody", "CyborgLegs", null, null, "CyborgChaingun");
			return builtFirstCombat;
		}
	}
}

function buildTank(fac, prop)
{
	if (!fac || !fac.id) return false;
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	// limit building early wheeled attack droids on seamap
	if (isSeaMap && !componentAvailable("hover01") && !isUltimateScavs) {
		let wheeled = enumDroid(me, DROID_WEAPON).filter((obj) => (obj.propulsion === "wheeled01")).length;
		let facs = enumStruct(me, FACTORY);
		for (let fac of facs) {
			let vdr = getDroidProduction(fac);
			if (vdr && vdr.propulsion === "wheeled01") wheeled++;
		}
		if (wheeled > 0) return false;
	}

	// build a standard tank with medium body for early posse
	if (fac.modules === 1) {
		let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].TANK_WEAPON_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
		logObj(fac, "Building medium tank: "+weaponName+" "+bodyName+" "+propName);
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, Schemes[Scheme].TANK_WEAPON_LIST);
	}

	// maybe build dragon multi turret tanks
	if (componentAvailable("Body14SUP") && random(100) > 60)  {
		let weapon1 = shuffleArray(MIX_TANK_WEAPONS);
		let weapon2 = shuffleArray(SECONDARY_TANK_WEAPONS);
		if (weapon1[0] === "SpyTurret01") weapon2 = weapon1;
		let weaponName1 = StatsMap.get(firstAvailableComponent(weapon1)).Name;
		let weaponName2 = StatsMap.get(firstAvailableComponent(weapon2)).Name;
		let bodyName = StatsMap.get("Body14SUP").Name;
		logObj(fac, "Building tank: "+weaponName1+" "+weaponName2+" "+bodyName+" "+propName);
		return buildDroid(fac, weaponName1+" "+weaponName2+" "+bodyName+" "+propName, "Body14SUP", prop, null, null, weapon1, weapon2);
	}

	// build standard tank
	let weapon = Schemes[Scheme].TANK_WEAPON_LIST;
	if (componentAvailable("Missile-A-T")) weapon = shuffleArray(MIX_TANK_WEAPONS);
	let weaponName = StatsMap.get(firstAvailableComponent(weapon)).Name;
	let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
	logObj(fac, "Building tank: "+weaponName+" "+bodyName+" "+propName);
	return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, weapon);
}

function buildMobileArtillery(fac, prop)
{
	if (!fac || !fac.id) return false;
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : ARTILLERY_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	if (fac.stattype === FACTORY) {
		if (fac.modules === 1) {
			// build a mortar artillery with medium body for early posse
			let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
			logObj(fac, "Building medium artillery: Incendiary Mortar "+bodyName+" "+propName);
			return buildDroid(fac, "Incendiary Mortar "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, INCENDIARY_MORTAR);
		}
		if (componentAvailable("Body14SUP") && random(100) > 70) {
			// build dragon artillery
			let artillery = INCENDIARY_HOWITZER.concat(INCENDIARY_MORTAR);
			let weaponName = StatsMap.get(firstAvailableComponent(artillery)).Name;
			logObj(fac, "Building dragon artillery: "+weaponName+" Dragon "+propName);
			return buildDroid(fac, weaponName+" Dragon "+propName, "Body14SUP", prop, null, null, artillery, artillery);
		}
		// build standard artillery
		let weaponName = StatsMap.get(firstAvailableComponent(INCENDIARY_MORTAR)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		logObj(fac, "Building artillery: "+weaponName+" "+bodyName+" "+propName);
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, INCENDIARY_MORTAR);
	}
	// build cyborg artillery
	if (fac.stattype === CYBORG_FACTORY) {
		logObj(fac, "Building cyborg artillery");
		return buildDroid(fac, "Cyborg Mortar", "CyborgLightBody", "CyborgLegs", null, null, CYBORG_MORTAR);
	}
	return false;
}

function buildMobileAA(fac, prop)
{
	if (!fac || !fac.id) return false;
	log("Building mobile AA");
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	if (fac.stattype === FACTORY && componentAvailable("Body14SUP") && random(100) > 70) {
		let mixAA = shuffleArray(MIX_TANK_AA);
		let weaponName = StatsMap.get(firstAvailableComponent(mixAA)).Name;
		let bodyName = StatsMap.get("Body14SUP").Name;
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, "Body14SUP", prop, null, null, mixAA, mixAA);
	}
	else if (fac.stattype === FACTORY) {
		let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].TANK_AA_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, Schemes[Scheme].TANK_AA_LIST);
	}
	return false;
}

function buildSensor(fac, prop)
{
	if (!fac || !fac.id) return false;
	log("Building sensor droid");
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;
	let weaponName = StatsMap.get(firstAvailableComponent(SENSOR_TURRETS_LIST)).Name;

	if (componentAvailable("Body13SUP")) // wyvern
	{
		return buildDroid(fac, weaponName+" Wyvern "+propName, "Body13SUP", prop, null, null, SENSOR_TURRETS_LIST);
	}

	let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
	return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, SENSOR_TURRETS_LIST);
}

function buildRepair(fac, prop)
{
	if (!fac || !fac.id) return false;
	log("Building repair droid");
	prop ??= isSeaMap ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;
	if (fac.stattype === FACTORY) {
		if (componentAvailable("Body13SUP"))
			if (fac.modules === 2) {
			// build heavy body repair
			return buildDroid(fac, "Heavy Repair Wyvern "+propName, "Body13SUP", prop, null, null, "HeavyRepair");
		} else {
			// build medium body repair
			let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
			return buildDroid(fac, "Heavy Repair "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, "HeavyRepair");
		}
		// build standard repair
		let weaponName = StatsMap.get(firstAvailableComponent(TANK_REPAIR_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, TANK_REPAIR_LIST);
	}
	if (fac.stattype === CYBORG_FACTORY) {
		return buildDroid(fac, "Cyborg Repair", "CyborgLightBody", "CyborgLegs", null, null, CYBORG_REPAIR);
	}
}

function buildCyborg(fac)
{
	if (!fac || !fac.id) return false;
	log("Building cyborg");

    // build repair cyborgs based on combat cyborg count and autorepair
    if (componentAvailable("HeavyRepair") || componentAvailable("LightRepair1")) {
        let div = 5;
        if (componentAvailable("AutoRepair")) div = 10;

        const repair = enumDroid(me, DROID_REPAIR).filter((dr) => (dr.propulsion === CYBORG_LEGS));
        const combat = enumDroid(me, DROID_CYBORG);
        const vrepair = countVirtualProduction(me, CYBORG_FACTORY, DROID_REPAIR);
        log(`cyborg repair:${repair.length} vrepair:${vrepair} cyborg combat:${combat.length} combat/div:${combat.length/div}`);
		// build one repair at least
		if ((!repair || !repair.length) && !vrepair) return buildRepair(fac);
		// maybe build more if needed
		if (random(100) < REPAIR_CHANCE) {
			if (repair.length + vrepair < combat.length / div || repair.length + vrepair < 1) return buildRepair(fac);
		}
    }

	if (componentAvailable("CyborgHeavyBody") && random(100) < 85) {
		if (componentAvailable("Cyb-Hvywpn-A-T") || componentAvailable("Cyb-Hvywpn-PulseLsr")) {
			let mixCyborgs = shuffleArray(MIX_CYBORG);
			let weaponName = StatsMap.get(firstAvailableComponent(mixCyborgs)).Name;
			return buildDroid(fac, weaponName, "CyborgHeavyBody", "CyborgLegs", null, null, mixCyborgs);
		} else {
			let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].CYBORG_ADVANCED_LIST)).Name;
			return buildDroid(fac, weaponName, "CyborgHeavyBody", "CyborgLegs", null, null, Schemes[Scheme].CYBORG_ADVANCED_LIST);
		}
	} else {
		// maybe build a mortar cyborg
		if (componentAvailable(CYBORG_MORTAR) && random(100) < 65) {
			let weaponName = StatsMap.get(firstAvailableComponent(CYBORG_MORTAR)).Name;
			return buildDroid(fac, weaponName, "CyborgLightBody", "CyborgLegs", null, null, CYBORG_MORTAR);
		}
		// build basic cyborg
		let weaponName = StatsMap.get(firstAvailableComponent(Schemes[Scheme].CYBORG_BASIC_LIST)).Name;
		return buildDroid(fac, weaponName, "CyborgLightBody", "CyborgLegs", null, null, Schemes[Scheme].CYBORG_BASIC_LIST);
	}
}

function buildVTOL(fac)
{
	if (!fac || !fac.id) return false;
	log("Building vtol");
	let prop = "V-Tol";
	let weapon = Schemes[Scheme].VTOL_WEAPONS;

	let vtolBB = seenStore.query({ player: me, isVTOL: true }).filter(dr => dr.weapons[0].id === VTOL_ROCKET_BB);

	if (componentAvailable(VTOL_ROCKET_BB) && vtolBB.length < MIN_VTOL_UNITS * 2) weapon = [VTOL_ROCKET_BB];
	if (componentAvailable("Bomb5-VTOL-Plasmite")) weapon = shuffleArray(MIX_VTOL_WEAPONS);

	let weaponName = StatsMap.get(firstAvailableComponent(weapon)).Name;
	let propName = StatsMap.get(prop).Name;
	let bodyName = StatsMap.get(firstAvailableComponent(VTOL_BODY_LIST)).Name;
	return buildDroid(fac, weaponName+" "+bodyName, VTOL_BODY_LIST, prop, null, null, weapon, weapon);
}

function buildAAVTOL(fac)
{
	if (!fac || !fac.id) return false;
	log("Building vtol AA");
	let prop = "V-Tol";
	if (componentAvailable("Rocket-VTOL-Sunburst")) {
		let bodyName = StatsMap.get(firstAvailableComponent(VTOL_BODY_LIST)).Name;
		return buildDroid(fac, "VTOL Sunburst"+" "+bodyName, VTOL_BODY_LIST, prop, null, null, "Rocket-VTOL-Sunburst", "Rocket-VTOL-Sunburst");
	}
}

function buildTransport(fac)
{
	if (!fac || !fac.id) return false;
	log("Building transport");
	return buildDroid(fac, "Cyborg Transport", "TransporterBody", "V-Tol");
}

function buildTruck(fac)
{
	if (!fac || !fac.id) return false;
	log("Building truck");
	if (fac.stattype === FACTORY) {
		let propName = StatsMap.get(firstAvailableComponent(SYSTEM_PROP_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(SYSTEM_BODY_LIST)).Name;
		return buildDroid(fac, "Spade "+bodyName+" "+propName, SYSTEM_BODY_LIST, SYSTEM_PROP_LIST, null, null, "Spade1Mk1");
	}
	if (fac.stattype === CYBORG_FACTORY) return buildDroid(fac, "Spade Cyborg", "CyborgLightBody", "CyborgLegs", null, null, "CyborgSpade");
	return false;
}

const countVirtualProduction = (owner, factoryType, droidType, filter = () => true) => {
    const facs = enumStruct(owner, factoryType);
    let count = 0;
    for (let fac of facs) {
        let vdr = getDroidProduction(fac);
        if (vdr && vdr.droidType === droidType) {
            if (filter(vdr)) count++;
        }
    }
    return count;
};
