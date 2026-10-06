// standard production definitions
const TANK_BODY_LIST = [
	//BODY_DRAGON, // dragon heavy extra slow
	//BODY_WYVERN, // wyvern heavy slow
	BODY_VENGEANCE, // vengeance heavy
	BODY_RETRIBUTION, // retribution medium
	//BODY_TIGER, // tiger heavy slow
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

const HEAVY_BODY_LIST = [
	BODY_VENGEANCE,
	// BODY_TIGER, // too slow
	BODY_MANTIS,
	BODY_PYTHON,
];

const MEDIUM_BODY_LIST = [
	BODY_RETRIBUTION,
	BODY_TIGER,
	BODY_SCORPION,
	BODY_COBRA,
];

const LIGHT_BODY_LIST = [
	BODY_RETALIATION,
	BODY_LEOPARD,
	BODY_BUG,
	BODY_VIPER,
];

//  artillery
const BOMBARD_MORTAR = "Mortar2Mk1";
const BASIC_MORTAR =  "Mortar1Mk1";
const PEPPERPOT_MORTAR = "Mortar3ROTARYMk1";
const INCENDIARY_MORTAR = "Mortar-Incendiary";
const INCENDIARY_HOWITZER = "Howitzer-Incendiary";
const CYBORG_MORTAR = "Cyb-Wpn-Grenade";
const TANK_MORTAR_LIST = [PEPPERPOT_MORTAR, BOMBARD_MORTAR, BASIC_MORTAR];

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
	if (!PeacemakerAIenable) return false;
	if (DEBUGEX) logFile("produceDroidsQ");

    if (getRealPower() < MIN_PRODUCTION_POWER) return; // gets total power for the current tick not each run

    for (const factoryType of shuffleArray(FACTORY_TYPES)) { // shuffle to avoid favoring one
        const factories = enumStruct(me, factoryType);

        if (factoryType === CYBORG_FACTORY_STAT && (isHoverMap() || isVtolMap()) ) continue;
        for (const factory of factories) {
            if (!structureIdle(factory)) continue;
            if (factoryType === FACTORY_STAT || factoryType === CYBORG_FACTORY_STAT) return handleGroundUnitProduction(factory);
            if (factoryType === VTOL_FACTORY_STAT) return handleVTOLProduction(factory);
        }
    }
}

function handleGroundUnitProduction(factory)
{
    // --- 1. Early Game & Artillery Checks ---
    const currentTrucks = countDroid(DROID_CONSTRUCT);
    const truckLimit = getDroidLimit(me, DROID_CONSTRUCT) - 2;
    const vtrucksFromStandard = countVirtualProduction(me, FACTORY_STAT, DROID_CONSTRUCT);
    const vtrucksFromCyborg = countVirtualProduction(me, CYBORG_FACTORY_STAT, DROID_CONSTRUCT);
    const virtualTrucks = vtrucksFromStandard + vtrucksFromCyborg;

    if (gameTime < THREE_MINUTE && builtFirstHQ && groupSize(baseBuilders) >= MIN_BASE_TRUCKS && groupSize(oilBuilders) >= MIN_OIL_TRUCKS) {
        // build demo droid
        if (!builtFirstCombat && buildDemoDroid(factory)) return true;

        // check if we should build an early artillery posse before more trucks
        if (factory.stattype === FACTORY && isComponentProducible(INCENDIARY_MORTAR) && enumStruct(me, HQ).length && factory.modules > 0 &&
            !enumGroup(attackGroup).filter(obj => obj.hasIndirect === true).length && buildMobileArtillery(factory)) {
                return true;
        }
    }

    // --- 2. Truck Production Check (Updated) ---
    if (currentTrucks + virtualTrucks < truckLimit) {
        const freeOils = seenStore.query( { type: FEATURE, stattype: OIL_RESOURCE } ).filter(obj => obj.lastSeen > gameTime - TEN_MINUTE*2).length;
        const totalOils = oilResourceStore.query({ isReachable: true }).length;
        logFile("freeOils:"+freeOils+" totalOils:"+totalOils);

        // build early trucks
        if (gameTime < FOUR_MINUTE) {
            const needsOilTrucks = (totalOils > LOW_OIL_MAP && !isHoverMap() && !isVtolMap() && groupSize(oilBuilders) < MAX_OIL_TRUCKS - 2);
            const highOilExpansion = (!isHoverMap() && groupSize(oilBuilders) < MAX_OIL_TRUCKS && totalOils > HIGH_OIL_MAP);
            const maintainBase = (groupSize(baseBuilders) === MIN_BASE_TRUCKS);

            // Use an IF statement and set a flag instead of returning
            if (needsOilTrucks || highOilExpansion || maintainBase) {
                if (buildTruck(factory)) {
                    return true;
                }
            }
        }

        // build replacement trucks if safe (General Replacements)
        if (baseUnderAttack <= 2 || Math.random() * 100 < 10) { // maybe build anyway
            let combats = groupSize(attackGroup);
            let hasRepair = groupSize(repairGroup) || countStruct(REPAIR_FACILITY_STAT);

            // build min replacement trucks if repairs
            if (gameTime < FIVE_MINUTE && hasRepair) {
                if (groupSize(baseBuilders) < MIN_BASE_TRUCKS && buildTruck(factory)) {
                    return true;
                }
                if (groupSize(oilBuilders) < MIN_OIL_TRUCKS && buildTruck(factory)) {
                    return true;
                }
            }

            // build trucks normally (Post 5 minutes)
            if (gameTime >= FIVE_MINUTE) {
                if (groupSize(baseBuilders) < MIN_BASE_TRUCKS && buildTruck(factory)) {
                    return true;
                }
                if (groupSize(oilBuilders) < MIN_OIL_TRUCKS && buildTruck(factory)) {
                    return true;
                }
            }

            // build extra trucks if many free oils and plenty of attackers
            if (freeOils > 5 && groupSize(oilBuilders) < MAX_OIL_TRUCKS && groupSize(attackGroup) > MIN_ATTACK_GSIZE * 2 && random(100) > 50) {
                if (buildTruck(factory)) {
                    return true;
                }
            }
        }
    }

    // --- 3. Tank Production Check (Made independent of truck flow) ---
    if ((countStruct(POW_GEN_STAT) || getRealPower() > 500) && builtFirstHQ) {
        if (factory.stattype === CYBORG_FACTORY) {
            if (buildCyborg(factory)) {
                return true;
            }
        }
        if (factory.stattype === FACTORY && !isVtolMap()) {
            // build attackers if factory upgraded to available body size
            // if cobra available 1 module
            if ((isComponentProducible(BODY_COBRA) || isComponentProducible(BODY_SCORPION)) && factory.modules < 1) {
                return false;
            }

            // Only build tanks if the function hasn't already returned due to a higher priority action (like Cyborgs)
            if (buildTankForces(factory)) {
                return true;
            }
        }
    }

	return false;
}

function handleVTOLProduction(factory)
{
    const highPower = (countStruct(POW_GEN_STAT) !== 0 || getRealPower() > 1000);
    if (!highPower) return false;

    const aaVtolCount = seenStore.query({ player: me, isAA: true, isVTOL: true }).length;
    const needsAA = enemyHasVtol && (groupSize(vtolGroup) / 10 > aaVtolCount + 1);

	if (!builtFirstHQ) return false;

    if (isComponentProducible(VTOL_SUNBURST) && needsAA && random(100) < 50) {
        buildAAVTOL(factory);
    }

    if (relyOnVtols) {
        return buildVTOL(factory);
    } else if (groupSize(attackGroup) > MIN_ATTACK_GSIZE * 2 && random(100) < 80) {
        return buildVTOL(factory);
    }
}

const buildTankForces = (fac) => {
    if (!fac || !fac.id || fac.stattype !== FACTORY) {
        logFile("Build failed: Invalid factory context.");
        return false;
    }

	let prop = isHoverMap() ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	if (random(100) < HOVER_CHANCE) prop = PROP_HOVER;

    // wait until factory is upgraded if possible
    if (fac.modules === 0 && isStructureBuildable(FAC_MODULE_STAT) &&
        (isComponentProducible(BODY_COBRA) || isComponentProducible(BODY_SCORPION))) {
        return false;
    }

    if (buildArtilleryForces(fac, prop)) return true;
    if (buildRepairForces(fac, prop)) return true;
    if (buildAATanks(fac, prop)) return true;
    if (buildSensorForces(fac, prop)) return true;

    if (buildCommandersForces(fac, prop)) return true;

	return buildTank(fac, prop);
};

const buildArtilleryForces = (fac, prop) => {
	if (!fac || !prop) return false;
    if (!isComponentProducible(PEPPERPOT_MORTAR) &&
		!isComponentProducible(BOMBARD_MORTAR) &&
		!isComponentProducible(INCENDIARY_MORTAR)) {
        return false;
    }

    // Check for first unit (guaranteed build)
    const seenStoreQuery = seenStore.query({ player: me, type: DROID, hasIndirect: true });
    if (seenStoreQuery.length === 0) {
        if (buildMobileArtillery(fac)) {
            logFile("ordered first mortar tank production");
            return true;
        }
    }

    // Check for subsequent units (probabilistic build)
    if (random(100) < ARTILLERY_CHANCE && buildMobileArtillery(fac)) {
        logFile("ordered mortar tank production");
        return true;
    }

    return false;
};

const buildRepairForces = (fac, prop) => {
	if (!fac || !prop) return false;
    if (!isComponentProducible(TANK_REPAIR_HV) && !isComponentProducible(TANK_REPAIR_LT)) {
        return false;
    }

    const div = isComponentProducible("AutoRepair") ? 10 : 5;

    // Calculate current ratios
    const repair = enumDroid(me, DROID_REPAIR).filter((dr) => (dr.propulsion !== PROP_CYBORG)).length;
    const combat = enumDroid(me, DROID_WEAPON).filter((dr) => (dr.isVTOL === false)).concat(enumDroid(me, DROID_CYBORG)).length;
    const vrepair = countVirtualProduction(me, FACTORY, DROID_REPAIR);

    logFile(`repair:${repair} vrepair:${vrepair} combat:${combat} combat/div:${combat/div}`);

    // Guaranteed first unit
    if (repair === 0 && vrepair === 0 && buildRepair(fac, prop)) {
        logFile("ordered first repair tank production");
        return true;
    }

    // Probabilistic subsequent units
    if (random(100) < REPAIR_CHANCE && repair + vrepair < combat / div && buildRepair(fac, prop)) {
        logFile("ordered repair tank production");
        return true;
    }

    return false;
};

const buildAATanks = (fac, prop) => {
	if (!fac || !prop) return false;
    if (!enemyHasVtol && random(100) < 50) return false;

    let div = 10;
	const hostileVtols = seenStore.query({ isAllied: false, isVTOL: true }).length;
	if (hostileVtols > MIN_VTOL_UNITS * 3) div = 6;
	if (hostileVtols > MIN_VTOL_UNITS * 5) div = 3;

    // Calculate ratios
    const combat = seenStore.query({ player: me, isCombat: true, isVTOL: false }).length;
    const AA = seenStore.query({ player: me, type: DROID, isAA: true, isVTOL: false }).length;
    const vAA = countVirtualProduction(me, FACTORY_STAT, DROID_WEAPON, (vdr) => vdr.canHitAir === true && vdr.canHitGround === false);

    logFile(`AA:${AA} vAA:${vAA} combat:${combat} combat/div:${combat/div}`);

    // Build if needed or have none
    if ((AA + vAA < combat / div || AA + vAA < 1) && buildMobileAA(fac)) {
        logFile("ordered AA tank production");
        return true;
    }

    return false;
};

const buildSensorForces = (fac, prop) => {
	if (!fac || !prop) return false;
    if (!isComponentProducible("SensorTurret1Mk1") || random(100) < 50) {
        return false;
    }

    let buildCondition = false;
	const attackers = groupSize(attackGroup) + groupSize(defendGroup);

    // Condition 1: Group size check 1
    if (attackers > MIN_GROUND_UNITS * 4 && groupSize(sensorGroup) < MIN_SENSOR_DROIDS) {
        logFile`Sensor Check 1: Sensor:${groupSize(sensorGroup)} vsensor:${countVirtualProduction(me, FACTORY_STAT, DROID_SENSOR)}`;
        buildCondition = true;
    }
    // Condition 2: Group size check 2
    else if (attackers > MIN_GROUND_UNITS * 8 && groupSize(sensorGroup) < MIN_SENSOR_DROIDS) {
        logFile`Sensor Check 2: Sensor:${groupSize(sensorGroup)} vsensor:${countVirtualProduction(me, FACTORY_STAT, DROID_SENSOR)}`;
        buildCondition = true;
    }

    if (buildCondition) {
        if (groupSize(sensorGroup) + countVirtualProduction(me, FACTORY_STAT, DROID_SENSOR) < MIN_SENSOR_DROIDS && buildSensor(fac, prop)) {
            if (groupSize(attackGroup) > MIN_GROUND_UNITS * 2) {
                 logFile("ordered sensor tank production (Initial)");
            } else {
                 logFile("ordered sensor tank production (Increased)");
            }
            return true;
        }
    }
    return false;
};

const buildCommandersForces = (fac, prop) => {

    if (random(100) < 50) return false;
	if (!fac || !prop) return false;

    const commanders = seenStore.query({ player: me, type: DROID, droidType: DROID_COMMAND }).length;
	logFile("commanders:", commanders);
    let buildCondition = false;
	const vcommand = countVirtualProduction(me, FACTORY_STAT, DROID_COMMAND);
	const attackers = groupSize(attackGroup) + groupSize(defendGroup);

    // Condition 1
    if (attackers > MIN_GROUND_UNITS * 4 && commanders < MIN_COMMAND_DROIDS && commanders < 1) {
        logFile`Command Check 1: Commanders:${commanders} vcommand:${vcommand}`;
        buildCondition = true;
    }
    // Condition 2
    else if (attackers > MIN_GROUND_UNITS * 8 && commanders < MIN_COMMAND_DROIDS) {
        logFile`Command Check 2: Commanders:${commanders} vcommand:${vcommand}`;
        buildCondition = true;
    }

    if (buildCondition) {
        if (commanders + vcommand < MIN_COMMAND_DROIDS && buildCommander(fac, prop)) {
			logFile("ordered command tank production");
            return true;
        }
    }

    return false;
};

function buildDemoDroid(fac)
{
 	if (DEBUGEX) logFile("buildDemoDroid");
	if (!fac || !fac.id) return false;

	if (fac.stattype === FACTORY) {
		if (!builtFirstCombat) {
			builtFirstCombat = true;
			if (buildDroid(fac, "Demolition Tank", [BODY_BUG, BODY_VIPER], PROP_WHEEL, null, null, "MG1Mk1")) return true;
			return false;
		}
	}
	if (fac.stattype === CYBORG_FACTORY) {
		if (!builtFirstCombat) {
			builtFirstCombat = true;
			if (buildDroid(fac, "Demolition Cyborg", BODY_CYBORG_LT, PROP_CYBORG, null, null, "CyborgChaingun")) return true;
			return false;
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
	if (isHoverMap() && !isComponentProducible(PROP_HOVER) && !isUltimateScavs()) {
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
		let weapon = firstAvailableComponent(Scheme.TANK_WEAPON_LIST);
		let weaponName = StatsMap.get(weapon).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
		logFile(fac, "Building medium tank: "+weaponName+" "+bodyName+" "+propName);
		if (buildDroid(fac, weaponName+" "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, weapon)) return true;
	}

	// maybe build dragon multi turret tanks
	if (isComponentProducible(BODY_DRAGON) && random(100) < 50) {
		let weapon1 = shuffleArray(MIX_TANK_WEAPONS);
		let weapon2 = shuffleArray(SECONDARY_TANK_WEAPONS);
		if (weapon1[0] === "SpyTurret01") weapon2 = weapon1; // must not be a mixed turret tank
		let weaponName1 = StatsMap.get(firstAvailableComponent(weapon1)).Name;
		let weaponName2 = StatsMap.get(firstAvailableComponent(weapon2)).Name;
		let bodyName = StatsMap.get(BODY_DRAGON).Name;
		logFile(fac, "Building tank: "+weaponName1+" "+weaponName2+" "+bodyName+" "+propName);
		if (buildDroid(fac, weaponName1+" "+weaponName2+" "+bodyName+" "+propName, BODY_DRAGON, prop, null, null, weapon1, weapon2)) return true;
	}

	// build standard tank
	let weapon = Scheme.TANK_WEAPON_LIST;
    if (isUltimateScavs() && !startedWithBB && gameTime < SIX_MINUTE && random(100) < 65) weapon = TANK_MG_LIST;

	if (isComponentProducible("Missile-A-T")) weapon = shuffleArray(MIX_TANK_WEAPONS);
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
		if (isComponentProducible(INCENDIARY_MORTAR) ) {
			if (fac.modules === 1) {
				// build an incendiary mortar artillery with medium body for early posse
				let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
				logFile(fac, "Building medium artillery: Incendiary Mortar "+propName);
				if (buildDroid(fac, "Incendiary Mortar "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, INCENDIARY_MORTAR)) return true;
			}
			if (isComponentProducible(BODY_DRAGON) && random(100) > 60) {
				// build dragon artillery
				let artillery = [INCENDIARY_HOWITZER].concat([INCENDIARY_MORTAR]);
				let weaponName = StatsMap.get(firstAvailableComponent(artillery)).Name;
				logFile(fac, "Building dragon artillery: "+weaponName+" Dragon "+propName);
				if (buildDroid(fac, weaponName+" Dragon "+propName, BODY_DRAGON, prop, null, null, artillery, artillery)) return true;
			}
			// build standard incendiary artillery
			let weaponName = StatsMap.get(INCENDIARY_MORTAR).Name;
			let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
			logFile(fac, "Building artillery: "+weaponName+" "+bodyName+" "+propName);
			if (buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, INCENDIARY_MORTAR)) return true;
		}

		// build standard mortar artillery with medium body for early posse
		if (fac.modules === 1) {
			let weaponName = StatsMap.get(firstAvailableComponent(TANK_MORTAR_LIST)).Name;
			let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
			logFile(fac, "Building medium artillery: Mortar "+propName);
			if (buildDroid(fac, weaponName+" "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, TANK_MORTAR_LIST)) return true;
		}
		// build standard mortar artillery
		let weaponName = StatsMap.get(firstAvailableComponent(TANK_MORTAR_LIST)).Name;
		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		logFile(fac, "Building artillery: "+weaponName+" "+bodyName+" "+propName);
		if (buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, TANK_MORTAR_LIST)) return true;
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
	prop ??= isHoverMap() ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;

	if (fac.stattype === FACTORY && fac.modules >= 2) {
		if (isComponentProducible(BODY_DRAGON) && random(100) < 30) {
			const mixAA = firstAvailableComponent(shuffleArray(MIX_TANK_AA));
			const weaponName = StatsMap.get(mixAA).Name;
			const bodyName = StatsMap.get(BODY_DRAGON).Name;
			if (mixAA && mixAA.length && buildDroid(fac, weaponName+" "+bodyName+" "+propName, BODY_DRAGON, prop, null, null, mixAA, mixAA)) return true;
		}
		else {
			const weapon = firstAvailableComponent(Scheme.TANK_AA_LIST);
			const weaponName = StatsMap.get(weapon).Name;
			const bodies = getBodiesForFactory(fac, TANK_BODY_LIST);
			const body = firstAvailableComponent(bodies);
			const bodyName = StatsMap.get(body).Name;
			if (weapon && weapon.length && buildDroid(fac, weaponName+" "+bodyName+" "+propName, body, prop, null, null, weapon)) return true;
		}
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
	let weapon = firstAvailableComponent(SENSOR_TURRETS_LIST);
	let weaponName = StatsMap.get(weapon).Name;

	const bodies = getBodiesForFactory(fac, TANK_BODY_LIST);
	const body = firstAvailableComponent(bodies);
	let bodyName = StatsMap.get(body).Name;

	return buildDroid(fac, weaponName+" "+bodyName+" "+propName, body, prop, null, null, weapon);
}

function buildCommander(fac, prop)
{
	if (DEBUGEX) logFile("buildCommander");
	if (!fac || !fac.id || fac.stattype !== FACTORY) return false;
	if (!isComponentProducible(TANK_COMMAND)) return false;
	const relays = seenStore.query({ player: me, type: STRUCTURE, stattype: COMMAND_CONTROL }).length;
	if (!relays) return false;

	logFile("Building commander droid");

	prop ??= isHoverMap() ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	const propName = StatsMap.get(firstAvailableComponent(prop)).Name;
	const bodies = getBodiesForFactory(fac, TANK_BODY_LIST);
	const body = firstAvailableComponent(bodies);
	const bodyName = StatsMap.get(body).Name;

	const weapon = [BRAIN_COMMAND];
	if (buildDroid(fac, "Commander "+bodyName+" "+propName, body, prop, null, null, weapon)) return true;

	return false;
}

function buildRepair(fac, prop)
{
	if (DEBUGEX) logFile("buildRepair");
	if (!fac || !fac.id) return false;

	prop ??= isHoverMap() ? SYSTEM_PROP_LIST : TANK_PROP_LIST;
	let propName = StatsMap.get(firstAvailableComponent(prop)).Name;
	let weapon = firstAvailableComponent(TANK_REPAIR_LIST);
	let weaponName = StatsMap.get(weapon).Name;

	if (fac.stattype === FACTORY) {
		if (fac.modules === 1) {
			let bodyName = StatsMap.get(firstAvailableComponent(MEDIUM_BODY_LIST)).Name;
			logFile("Building medium repair tank");
			if (buildDroid(fac, weaponName+" "+bodyName+" "+propName, MEDIUM_BODY_LIST, prop, null, null, weapon)) return true;
		}

		let bodyName = StatsMap.get(firstAvailableComponent(TANK_BODY_LIST)).Name;
		logFile("Building repair tank");
		if (buildDroid(fac, weaponName+" "+bodyName+" "+propName, TANK_BODY_LIST, prop, null, null, weapon)) return true;
	}

	if (fac.stattype === CYBORG_FACTORY && isComponentProducible(CYBORG_REPAIR)) {
		logFile("Building repair cyborg");
		if (buildDroid(fac, "Cyborg Repair", BODY_CYBORG_LT, PROP_CYBORG, null, null, CYBORG_REPAIR)) return true;
	}
	return false;
}

function buildCyborg(fac)
{
	if (DEBUGEX) logFile("buildCyborg");
	if (!fac || !fac.id) return false;
	logFile("Building cyborg");

    // build repair cyborgs based on combat cyborg count and autorepair
    if (isComponentProducible(CYBORG_REPAIR)) {
        let div = 5;
        if (isComponentProducible("AutoRepair")) div = 10;

        const repair = enumDroid(me, DROID_REPAIR).filter((dr) => (dr.propulsion === PROP_CYBORG));
        const combat = enumDroid(me, DROID_CYBORG);
        const vrepair = countVirtualProduction(me, CYBORG_FACTORY, DROID_REPAIR);
        logFile(`cyborg repair:${repair.length} vrepair:${vrepair} cyborg combat:${combat.length} combat/div:${combat.length/div}`);
		// build one repair at least
		if ((!repair || !repair.length) && !vrepair) if (buildRepair(fac)) return true;
		// maybe build more if needed
		if (random(100) < REPAIR_CHANCE) {
			if (repair.length + vrepair < combat.length / div || repair.length + vrepair < 1) {
				if (buildRepair(fac)) return true;
			}
		}
    }

	if (isComponentProducible(BODY_CYBORG_HV) && random(100) < 70) {
		if (isComponentProducible("Cyb-Hvywpn-A-T") || isComponentProducible("Cyb-Hvywpn-PulseLsr")) {
			let mixCyborgs = shuffleArray(MIX_CYBORG);
			let weaponName = StatsMap.get(firstAvailableComponent(mixCyborgs)).Name;
			if (buildDroid(fac, weaponName, BODY_CYBORG_HV, PROP_CYBORG, null, null, mixCyborgs)) return true;
		} else {
			let weaponName = StatsMap.get(firstAvailableComponent(Scheme.CYBORG_ADVANCED_LIST)).Name;
			if (buildDroid(fac, weaponName, BODY_CYBORG_HV, PROP_CYBORG, null, null, Scheme.CYBORG_ADVANCED_LIST)) return true;
		}
	} else {
		// maybe build a mortar cyborg
		if (isComponentProducible(CYBORG_MORTAR) && random(100) < 65) {
			let weaponName = StatsMap.get(CYBORG_MORTAR).Name;
			if (buildDroid(fac, weaponName, BODY_CYBORG_LT, PROP_CYBORG, null, null, CYBORG_MORTAR)) return true;
		}

		// build basic cyborg
		let weapon = Scheme.CYBORG_BASIC_LIST;
		// maybe build a mg cyborg
		if (random(100) < 30) weapon = CYBORG_MG_LIST;
		let weaponName = StatsMap.get(firstAvailableComponent(weapon)).Name;
		if (buildDroid(fac, weaponName, BODY_CYBORG_LT, PROP_CYBORG, null, null, weapon)) return true;
	}
	return false;
}

function buildVTOL(fac)
{
	if (DEBUGEX) logFile("buildVTOL");
	if (!fac || !fac.id) return false;
	logFile("Building vtol");
	const prop = PROP_VTOL;
	const propName = StatsMap.get(prop).Name;
	let weapons = Scheme.VTOL_WEAPONS;

	let vtolBB = seenStore.query({ player: me, isVTOL: true }).filter(dr => dr.weapons[0].id === VTOL_BUNKERB);
	if (isComponentProducible(VTOL_BUNKERB) && vtolBB.length < MIN_VTOL_UNITS * 3 && random(100) < 65) weapons = [VTOL_BUNKERB];

	if (isComponentProducible("Bomb5-VTOL-Plasmite")) weapons = shuffleArray(MIX_VTOL_WEAPONS);

	const bodies = getBodiesForFactory(fac, VTOL_BODY_LIST);
	const weapon = firstAvailableComponent(weapons);
	const body = firstAvailableComponent(bodies);
	const weaponName = StatsMap.get(weapon).Name;
	const bodyName = StatsMap.get(body).Name;

	return buildDroid(fac, weaponName+" "+bodyName, body, prop, null, null, weapon, weapon);
}

function buildAAVTOL(fac)
{
	if (DEBUGEX) logFile("buildAAVTOL");
	if (!fac || !fac.id) return false;
	logFile("Building vtol AA");

	if (isComponentProducible(VTOL_SUNBURST)) {
		const bodies = getBodiesForFactory(fac, VTOL_BODY_LIST);
		const body = firstAvailableComponent(bodies);
		const bodyName = StatsMap.get(body).Name;
		return buildDroid(fac, "VTOL Sunburst"+" "+bodyName, body, PROP_VTOL, null, null, VTOL_SUNBURST, VTOL_SUNBURST);
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
		if (buildDroid(fac, "Spade "+bodyName+" "+propName, SYSTEM_BODY_LIST, SYSTEM_PROP_LIST, null, null, TANK_TRUCK)) return true;
	}
	if (fac.stattype === CYBORG_FACTORY && isComponentProducible(CYBORG_TRUCK)) {

		if (buildDroid(fac, "Spade Cyborg", BODY_CYBORG_LT, PROP_CYBORG, null, null, CYBORG_TRUCK)) return true;
	}
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


function getBodiesForFactory(factory, customBodies)
{
	if (DEBUGEX) logFile("getBodiesForFactory");
	if (factory.modules === 0) return LIGHT_BODY_LIST;
	if (factory.modules === 1) return MEDIUM_BODY_LIST;
	if (factory.modules >= 2) {
		if (customBodies && customBodies.length) { return customBodies; }
		else { return HEAVY_BODY_LIST; }
	}
	return false;
}
