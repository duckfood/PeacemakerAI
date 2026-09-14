// standard production definitions
const TANK_BODY_LIST = [
	//BODY_DRAGON, // dragon heavy extra slow
	//BODY_WYVERN, // wyvern heavy slow
	BODY_VENGEANCE, // vengeance heavy
	BODY_RETRIBUTION, // retribution medium
	//BODY_TIGER, // tiger heavy way too slow
	BODY_MANTIS, // mantis heavy
	BODY_PANTHER, // panther medium
	BODY_PYTHON, // python heavy
	BODY_SCORPION, // scorpion medium
	BODY_COBRA, // cobra medium
	BODY_RETALIATION, // retaliation light
	BODY_LEOPARD, // leopard light
	BODY_BUG, // bug light
	BODY_VIPER, // viper light
];
const VTOL_BODY_LIST = [
	BODY_DRAGON, // dragon
	BODY_VENGEANCE, // vengeance
	BODY_RETRIBUTION, // retribution
	BODY_TIGER, // tiger
	BODY_PANTHER, // panther
	BODY_SCORPION, // scorpion
	BODY_COBRA, // cobra
	BODY_BUG, // bug
];
const SYSTEM_BODY_LIST = [
	BODY_SCORPION, // scorpion
	BODY_COBRA,  // cobra
	BODY_BUG, // bug
	BODY_VIPER,  // viper
];
const TANK_PROP_LIST = [
	PROP_TRACK,
	PROP_HALFTRACK,
	PROP_WHEEL,
];
const ARTILLERY_PROP_LIST = [
	PROP_HALFTRACK,
	PROP_WHEEL,
];
const SYSTEM_PROP_LIST = [
	PROP_HOVER,
	PROP_HALFTRACK,
	PROP_WHEEL,
];
const SENSOR_TURRETS_LIST = [
	"Sensor-WideSpec",
	"SensorTurret1Mk1",
];
const TANK_REPAIR_LIST = [
	TANK_REPAIR_HV,
	TANK_REPAIR_LT,
];

const MEDIUM_BODY_LIST = [
	BODY_RETRIBUTION, // retribution
	BODY_PANTHER, // panther
	BODY_SCORPION, // scorpion
	BODY_COBRA, // cobra
];

//  artillery
const PEPPERPOT_MORTAR = "Mortar3ROTARYMk1";
const INCENDIARY_MORTAR = "Mortar-Incendiary";
const INCENDIARY_HOWITZER = "Howitzer-Incendiary";
const CYBORG_MORTAR = "Cyb-Wpn-Grenade";
const TANK_MORTAR_LIST = [PEPPERPOT_MORTAR, "Mortar1Mk1"]; // pepperpot, standard

// machine gun lists
const CYBORG_MG_LIST = ["CyborgRotMG","CyborgChaingun"];
const TANK_MG_LIST = ["MG3Mk1", "MG2Mk1", "MG1Mk1"]; // heavy, twin, basic

// mixed attacker definitions for high tech
// extra definitions for weighting mix shuffle
const MIX_VTOL_WEAPONS = [
	"Bomb5-VTOL-Plasmite",
	"Missile-VTOL-AT",
	"Bomb5-VTOL-Plasmite",
	"Missile-VTOL-AT",
	"ParticleGun-VTOL",
	VTOL_BUNKERB,
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

// master function to produce droids of all types
// only produce at one factory per run to prevent economic crash
function produceDroids() { queue("produceDroidsQ"); } // timer
function produceDroidsQ()
{
	if (DEBUGEX) logFile("produceDroidsQ");

    if (getRealPower() < MIN_PRODUCTION_POWER) return;  // gets total power for the current tick not each run

    const vtrucksFromStandard = countVirtualProduction(me, FACTORY_STAT, DROID_CONSTRUCT);
    const vtrucksFromCyborg = countVirtualProduction(me, CYBORG_FACTORY_STAT, DROID_CONSTRUCT);
    const virtualTrucks = vtrucksFromStandard + vtrucksFromCyborg;

    for (const factoryType of shuffleArray(FACTORY_TYPES)) {
        const factories = enumStruct(me, factoryType);

        if (factoryType === CYBORG_FACTORY_STAT && (isHoverMap() || isVtolMap()) ) continue;
        for (const factory of factories) {
            if (!structureIdle(factory)) continue;
            if (factoryType === FACTORY_STAT || factoryType === CYBORG_FACTORY_STAT) return handleGroundUnitProduction(factory, virtualTrucks);
            if (factoryType === VTOL_FACTORY_STAT) return handleVTOLProduction(factory);
        }
    }
}
function handleGroundUnitProduction(factory, virtualTrucks)
{
    const currentTrucks = countDroid(DROID_CONSTRUCT);
    const truckLimit = getDroidLimit(me, DROID_CONSTRUCT) - 2;

	if (gameTime < THREE_MINUTE && builtFirstHQ && groupSize(baseBuilders) >= MIN_BASE_TRUCKS && groupSize(oilBuilders) >= MIN_OIL_TRUCKS) {
		// build demo droid
		if (!builtFirstCombat && enumStruct(me, HQ).length && buildDemoDroid(factory)) return true;
		// check if we should build an early artillery posse before more trucks
		if (factory.stattype === FACTORY && componentAvailable(INCENDIARY_MORTAR) && enumStruct(me, HQ).length && factory.modules > 0 &&
			!enumGroup(attackGroup).filter(obj => obj.hasIndirect === true).length && buildMobileArtillery(factory)) return true;
	}

    // check if we can build more trucks
    if (currentTrucks + virtualTrucks < truckLimit) {
        const freeOils = seenStore.query( { type: FEATURE, stattype: OIL_RESOURCE } ).filter(obj => obj.lastSeen > gameTime - TEN_MINUTE*2).length;
        const totalOils = oilResourceStore.query({ isReachable: true }).length;
		logFile("freeOils:"+freeOils+" totalOils:"+totalOils);

        // build early trucks
        if (gameTime < FOUR_MINUTE) {
            const needsOilTrucks = (totalOils > LOW_OIL_MAP && !isHoverMap() && !isVtolMap() && groupSize(oilBuilders) < MAX_OIL_TRUCKS - 2);
            const highOilExpansion = (!isHoverMap() && groupSize(oilBuilders) < MAX_OIL_TRUCKS && totalOils > HIGH_OIL_MAP);
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

    if ((countStruct(POW_GEN_STAT) || getRealPower() > 500) && builtFirstHQ) {
		// build cyborgs
		if (factory.stattype === CYBORG_FACTORY) {
			return buildCyborg(factory);

		} else {
			//build attackers if factory upgraded to available body size
			// if cobra available 1 module
			if (componentAvailable(BODY_COBRA) && factory.modules < 1) return false;

			return buildTankForces(factory);
		}

	}
}
function handleVTOLProduction(factory)
{
    const highPower = (countStruct(POW_GEN_STAT) !== 0 || getRealPower() > 1000);
    if (!highPower) return false;

    const aaVtolCount = seenStore.query({ player: me, isAA: true, isVTOL: true }).length;
    const needsAA = enemyHasVtol && (groupSize(vtolGroup) / 10 > aaVtolCount + 1);

	if (!builtFirstHQ) return false;

    if (componentAvailable(VTOL_SUNBURST) && needsAA && random(100) < 50) {
        return buildAAVTOL(factory);
    }

    if (relyOnVtols) {
        return buildVTOL(factory);
    } else if (groupSize(attackGroup) > MIN_ATTACK_GSIZE * 2 && random(100) < 80) {
        return buildVTOL(factory);
    }
}

// modernized version
function buildTankForces(fac)
{
    if (!fac || !fac.id || fac.stattype !== FACTORY || isVtolMap()) return false;

    let prop = TANK_PROP_LIST;
    if ((isHoverMap() || (random(100) < HOVER_CHANCE)) && componentAvailable(PROP_HOVER)) prop = [PROP_HOVER];

    if (fac.modules === 0 && isStructureAvailable(FAC_MODULE_STAT) && (componentAvailable(BODY_COBRA) || componentAvailable(BODY_SCORPION))) {
        return false;
    }

    // build mobile artillery
    if (componentAvailable(PEPPERPOT_MORTAR)) { // no standard mortar tanks
		// build one for sure
        if (seenStore.query({ player: me, type: DROID, hasIndirect: true }).length === 0 && buildMobileArtillery(fac)) {
			logFile("ordered first mortar tank production");
			return true;
		}
		// maybe build more
        if (random(100) < ARTILLERY_CHANCE && buildMobileArtillery(fac)) {
			logFile("ordered mortar tank production");
			return true;
		}
    }

    // build repair tanks based on combat droid count and autorepair
    if (componentAvailable(TANK_REPAIR_HV) || componentAvailable(TANK_REPAIR_LT)) {
        let div = 5;
        if (componentAvailable("AutoRepair")) div = 10;

        const repair = enumDroid(me, DROID_REPAIR).filter((dr) => (dr.propulsion !== PROP_CYBORG)).length;
        const combat = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false)).concat(enumDroid(me, DROID_CYBORG)).length;
        const vrepair = countVirtualProduction(me, FACTORY, DROID_REPAIR);
        logFile(`repair:${repair} vrepair:${vrepair} combat:${combat} combat/div:${combat/div}`);

		// build one repair for sure
		if (repair === 0 && vrepair === 0 && buildRepair(fac, prop)) {
			logFile("ordered first repair tank production");
			return true;
		}
		// maybe build more if needed
		if (random(100) < REPAIR_CHANCE && repair + vrepair < combat / div && buildRepair(fac, prop)) {
			logFile("ordered repair tank production");
			return true;
		}
    }

    // build AA tanks based on combat droid count
    if (enemyHasVtol && componentAvailable("QuadMg1AAGun") && random(100) < 50) {
        let div = 10;
        if (componentAvailable("AAGunLaser")) div = 15;

        const combat = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false)).concat(enumDroid(me, DROID_CYBORG)).length;
		const AA = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false && dr.canHitAir === true && dr.canHitGround === false)).length;
        const vAA = countVirtualProduction(me, FACTORY, DROID_WEAPON, (vdr) => vdr.canHitAir === true && vdr.canHitGround === false);
        logFile(`AA:${AA} vAA:${vAA} combat:${combat} combat/div:${combat/div}`);
        if ((AA + vAA < combat / div || AA + vAA < 1) && buildMobileAA(fac)) {
			logFile("ordered AA tank production");
			return true;
		}
    }

    // build MIN_SENSOR_DROIDS but only if needed
    if (componentAvailable("SensorTurret1Mk1") && groupSize(sensorGroup) < MIN_SENSOR_DROIDS && random(100) < 30) {

		if (groupSize(attackGroup) > MIN_GROUND_UNITS * 2 && groupSize(sensorGroup) < 1) {
			const vsensor = countVirtualProduction(me, FACTORY_STAT, DROID_SENSOR);
			logFile(`sensor:${groupSize(sensorGroup)} vsensor:${vsensor}`);
			if (groupSize(sensorGroup) + vsensor < MIN_SENSOR_DROIDS && buildSensor(fac, prop)) {
				logFile("ordered sensor tank production");
				return true;
			}
		}
		if (groupSize(attackGroup) > MIN_GROUND_UNITS * 5 && groupSize(sensorGroup) < MIN_SENSOR_DROIDS) {
			const vsensor = countVirtualProduction(me, FACTORY_STAT, DROID_SENSOR);
			logFile(`sensor:${groupSize(sensorGroup)} vsensor:${vsensor}`);
			if (groupSize(sensorGroup) + vsensor < MIN_SENSOR_DROIDS && buildSensor(fac, prop)) {
				logFile("ordered another sensor tank production");
				return true;
			}
		}
    }

    // build tanks then
    return buildTank(fac, prop);
}

function buildDemoDroid(fac)
{
	if (DEBUGEX) logFile("buildDemoDroid");
	if (fac.stattype === FACTORY) {
		if (!builtFirstCombat) {
			builtFirstCombat = buildDroid(fac, "Demolition Tank", [BODY_BUG, BODY_VIPER], PROP_WHEEL, null, null, "MG1Mk1");
			return builtFirstCombat;
		}
	}
	if (fac.stattype === CYBORG_FACTORY) {
		if (!builtFirstCombat) {
			builtFirstCombat = buildDroid(fac, "Demolition Cyborg", BODY_CYBORG_LT, PROP_CYBORG, null, null, "CyborgChaingun");
			return builtFirstCombat;
		}
	}
	return false;
}

function buildTank(fac, prop)
{
	if (DEBUGEX) logFile("buildTank");
	if (!fac || !fac.id) return false;
	prop ??= isHoverMap() ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	// limit building early wheeled attack droids on seamap
	if (isHoverMap() && !componentAvailable(PROP_HOVER) && !isUltimateScavs) {
		let wheeled = enumDroid(me, DROID_WEAPON).filter((obj) => (obj.propulsion === PROP_WHEEL)).length;
		let facs = enumStruct(me, FACTORY);
		for (let fac of facs) {
			let vdr = getDroidProduction(fac);
			if (vdr && vdr.propulsion === PROP_WHEEL) wheeled++;
		}
		if (wheeled > 0) return false;
	}

	// build a standard tank with medium body for early posse
	if (fac.modules === 1) {
		let weaponName = StatsMap.get(firstAvailableComponent(Scheme.TANK_WEAPON_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
		logFile(fac, "Building medium tank: "+weaponName+" "+bodyName+" "+propName);
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, Scheme.TANK_WEAPON_LIST);
	}

	// maybe build dragon multi turret tanks
	if (componentAvailable(BODY_DRAGON) && random(100) < 50) {
		let weapon1 = shuffleArray(MIX_TANK_WEAPONS);
		let weapon2 = shuffleArray(SECONDARY_TANK_WEAPONS);
		if (weapon1[0] === "SpyTurret01") weapon2 = weapon1; // must not be a mixed turret tank
		let weaponName1 = StatsMap.get(firstAvailableComponent(weapon1)).Name;
		let weaponName2 = StatsMap.get(firstAvailableComponent(weapon2)).Name;
		let bodyName = StatsMap.get(BODY_DRAGON).Name;
		logFile(fac, "Building tank: "+weaponName1+" "+weaponName2+" "+bodyName+" "+propName);
		return buildDroid(fac, weaponName1+" "+weaponName2+" "+bodyName+" "+propName, BODY_DRAGON, prop, null, null, weapon1, weapon2);
	}

	// build standard tank
	let weapon = Scheme.TANK_WEAPON_LIST;
    if (isUltimateScavs && !startedWithBB && gameTime < SIX_MINUTE && random(100) < 65) weapon = TANK_MG_LIST;

	if (componentAvailable("Missile-A-T")) weapon = shuffleArray(MIX_TANK_WEAPONS);
	let weaponName = StatsMap.get(firstAvailableComponent(weapon)).Name;
	let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
	logFile(fac, "Building tank: "+weaponName+" "+bodyName+" "+propName);
	return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, weapon);
}

function buildMobileArtillery(fac, prop)
{
	if (DEBUGEX) logFile("buildMobileArtillery");
	if (!fac || !fac.id) return false;
	prop ??= isHoverMap() ? SYSTEM_PROP_LIST : ARTILLERY_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	if (fac.stattype === FACTORY) {
		// build incendiary artillery
		if (componentAvailable(INCENDIARY_MORTAR) ) {
			if (fac.modules === 1) {
				// build a mortar artillery with medium body for early posse
				let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
				logFile(fac, "Building medium artillery: Incendiary Mortar "+propName);
				return buildDroid(fac, "Incendiary Mortar "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, INCENDIARY_MORTAR);
			}
			if (componentAvailable(BODY_DRAGON) && random(100) > 60) {
				// build dragon artillery
				let artillery = [INCENDIARY_HOWITZER].concat([INCENDIARY_MORTAR]);
				let weaponName = StatsMap.get(firstAvailableComponent(artillery)).Name;
				logFile(fac, "Building dragon artillery: "+weaponName+" Dragon "+propName);
				return buildDroid(fac, weaponName+" Dragon "+propName, BODY_DRAGON, prop, null, null, artillery, artillery);
			}
			// build standard incendiary artillery
			let weaponName = StatsMap.get(INCENDIARY_MORTAR).Name;
			let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
			logFile(fac, "Building artillery: "+weaponName+" "+bodyName+" "+propName);
			return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, INCENDIARY_MORTAR);
		}

		// build standard mortar artillery with medium body for early posse
		if (fac.modules === 1) {
			let weaponName = StatsMap.get(firstAvailableComponent(TANK_MORTAR_LIST)).Name;
			let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
			logFile(fac, "Building medium artillery: Mortar "+propName);
			return buildDroid(fac, weaponName+" "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, TANK_MORTAR_LIST);
		}
		// build standard mortar artillery
		let weaponName = StatsMap.get(firstAvailableComponent(TANK_MORTAR_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		logFile(fac, "Building artillery: "+weaponName+" "+bodyName+" "+propName);
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, TANK_MORTAR_LIST);
	}

	// build cyborg artillery
	if (fac.stattype === CYBORG_FACTORY) {
		logFile(fac, "Building cyborg artillery");
		return buildDroid(fac, "Cyborg Mortar", BODY_CYBORG_LT, PROP_CYBORG, null, null, CYBORG_MORTAR);
	}

	return false;
}

function buildMobileAA(fac, prop)
{
	if (DEBUGEX) logFile("buildMobileAA");
	if (!fac || !fac.id) return false;
	logFile("Building mobile AA");
	prop ??= isHoverMap() ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	if (fac.stattype === FACTORY && componentAvailable(BODY_DRAGON) && random(100) > 70) {
		let mixAA = shuffleArray(MIX_TANK_AA);
		let weaponName = StatsMap.get(firstAvailableComponent(mixAA)).Name;
		let bodyName = StatsMap.get(BODY_DRAGON).Name;
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, BODY_DRAGON, prop, null, null, mixAA, mixAA);
	}
	else if (fac.stattype === FACTORY) {
		let weaponName = StatsMap.get(firstAvailableComponent(Scheme.TANK_AA_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, Scheme.TANK_AA_LIST);
	}
	return false;
}

function buildSensor(fac, prop)
{
	if (DEBUGEX) logFile("buildSensor");
	if (!fac || !fac.id) return false;
	logFile("Building sensor droid");
	prop ??= isHoverMap() ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;
	let weaponName = StatsMap.get(firstAvailableComponent(SENSOR_TURRETS_LIST)).Name;

	if (componentAvailable(BODY_WYVERN))
	{
		return buildDroid(fac, weaponName+" Wyvern "+propName, BODY_WYVERN, prop, null, null, SENSOR_TURRETS_LIST);
	}

	let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
	return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, SENSOR_TURRETS_LIST);
}

function buildRepair(fac, prop)
{
	if (DEBUGEX) logFile("buildRepair");
	if (!fac || !fac.id) return false;

	prop ??= isHoverMap() ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;
	if (fac.stattype === FACTORY) {
		if (fac.modules === 1) {
			let weaponName = StatsMap.get(firstAvailableComponent(TANK_REPAIR_LIST)).Name;
			let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
			logFile("Building medium repair tank");
			return buildDroid(fac, weaponName+" "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, TANK_REPAIR_LIST);
		}
		let weaponName = StatsMap.get(firstAvailableComponent(TANK_REPAIR_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		logFile("Building repair tank");
		return buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, TANK_REPAIR_LIST);
	}

	if (fac.stattype === CYBORG_FACTORY) {
		logFile("Building repair cyborg");
		return buildDroid(fac, "Cyborg Repair", BODY_CYBORG_LT, PROP_CYBORG, null, null, CYBORG_REPAIR);
	}
	return false;
}

function buildCyborg(fac)
{
	if (DEBUGEX) logFile("buildCyborg");
	if (!fac || !fac.id) return false;
	logFile("Building cyborg");

    // build repair cyborgs based on combat cyborg count and autorepair
    if (componentAvailable(TANK_REPAIR_HV) || componentAvailable(TANK_REPAIR_LT)) {
        let div = 5;
        if (componentAvailable("AutoRepair")) div = 10;

        const repair = enumDroid(me, DROID_REPAIR).filter((dr) => (dr.propulsion === PROP_CYBORG));
        const combat = enumDroid(me, DROID_CYBORG);
        const vrepair = countVirtualProduction(me, CYBORG_FACTORY, DROID_REPAIR);
        logFile(`cyborg repair:${repair.length} vrepair:${vrepair} cyborg combat:${combat.length} combat/div:${combat.length/div}`);
		// build one repair at least
		if ((!repair || !repair.length) && !vrepair) return buildRepair(fac);
		// maybe build more if needed
		if (random(100) < REPAIR_CHANCE) {
			if (repair.length + vrepair < combat.length / div || repair.length + vrepair < 1) return buildRepair(fac);
		}
    }

	if (componentAvailable(BODY_CYBORG_HV) && random(100) < 85) {
		if (componentAvailable("Cyb-Hvywpn-A-T") || componentAvailable("Cyb-Hvywpn-PulseLsr")) {
			let mixCyborgs = shuffleArray(MIX_CYBORG);
			let weaponName = StatsMap.get(firstAvailableComponent(mixCyborgs)).Name;
			return buildDroid(fac, weaponName, BODY_CYBORG_HV, PROP_CYBORG, null, null, mixCyborgs);
		} else {
			let weaponName = StatsMap.get(firstAvailableComponent(Scheme.CYBORG_ADVANCED_LIST)).Name;
			return buildDroid(fac, weaponName, BODY_CYBORG_HV, PROP_CYBORG, null, null, Scheme.CYBORG_ADVANCED_LIST);
		}
	} else {
		// maybe build a mortar cyborg
		if (componentAvailable(CYBORG_MORTAR) && random(100) < 65) {
			let weaponName = StatsMap.get(CYBORG_MORTAR).Name;
			return buildDroid(fac, weaponName, BODY_CYBORG_LT, PROP_CYBORG, null, null, CYBORG_MORTAR);
		}

		// build basic cyborg
		let weapon = Scheme.CYBORG_BASIC_LIST;
		// maybe build a mg cyborg
		if (random(100) < 30) weapon = CYBORG_MG_LIST;
		let weaponName = StatsMap.get(firstAvailableComponent(weapon)).Name;
		return buildDroid(fac, weaponName, BODY_CYBORG_LT, PROP_CYBORG, null, null, weapon);
	}
	return false;
}

function buildVTOL(fac)
{
	if (DEBUGEX) logFile("buildVTOL");
	if (!fac || !fac.id) return false;
	logFile("Building vtol");
	let prop = PROP_VTOL;
	let weapon = Scheme.VTOL_WEAPONS;

	let vtolBB = seenStore.query({ player: me, isVTOL: true }).filter(dr => dr.weapons[0].id === VTOL_BUNKERB);

	if (componentAvailable(VTOL_BUNKERB) && vtolBB.length < MIN_VTOL_UNITS * 3 && random(100) < 65) weapon = [VTOL_BUNKERB];
	if (componentAvailable("Bomb5-VTOL-Plasmite")) weapon = shuffleArray(MIX_VTOL_WEAPONS);

	let weaponName = StatsMap.get(firstAvailableComponent(weapon)).Name;
	let propName = StatsMap.get(prop).Name;
	let bodyName = StatsMap.get(firstAvailableComponent(VTOL_BODY_LIST)).Name;
	return buildDroid(fac, weaponName+" "+bodyName, VTOL_BODY_LIST, prop, null, null, weapon, weapon);
}

function buildAAVTOL(fac)
{
	if (DEBUGEX) logFile("buildAAVTOL");
	if (!fac || !fac.id) return false;
	logFile("Building vtol AA");
	let prop = PROP_VTOL;
	if (componentAvailable(VTOL_SUNBURST)) {
		let bodyName = StatsMap.get(firstAvailableComponent(VTOL_BODY_LIST)).Name;
		return buildDroid(fac, "VTOL Sunburst"+" "+bodyName, VTOL_BODY_LIST, prop, null, null, VTOL_SUNBURST, VTOL_SUNBURST);
	}
	return false;
}

function buildTruck(fac)
{
	if (DEBUGEX) logFile("buildTruck");
	if (!fac || !fac.id) return false;
	logFile("Building truck");
	if (fac.stattype === FACTORY) {
		let propName = StatsMap.get(firstAvailableComponent(SYSTEM_PROP_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(SYSTEM_BODY_LIST)).Name;
		return buildDroid(fac, "Spade "+bodyName+" "+propName, SYSTEM_BODY_LIST, SYSTEM_PROP_LIST, null, null, "Spade1Mk1");
	}
	if (fac.stattype === CYBORG_FACTORY) return buildDroid(fac, "Spade Cyborg", BODY_CYBORG_LT, PROP_CYBORG, null, null, "CyborgSpade");
	return false;
}

const countVirtualProduction = (owner, factoryType, droidType, filter = () => true) => {
	if (DEBUGEX) logFile("countVirtualProduction");
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
