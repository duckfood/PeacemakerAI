function eventDroidBuilt(droid, struct)
{
	let dr = droid;

	if (droid.isVTOL)
	{
		totalVtolsBuilt ++;
		groupAdd(vtolGroup, droid);

		let target = getVTOLtarget(droid,true);
		if (target) 
		{
			orderDroidLoc(droid, DORDER_SCOUT, target.x, target.y);
			logObj(droid, "new vtol droid ordered to scout to target:"+target.x+"x"+target.y);
		}
	}
	else if (droid.droidType === DROID_WEAPON)
	{
		if (droid.canHitGround === false && droid.canHitAir === true)
		{
			logObj(droid, "aa droid built: "+droid.weapons[0].name);
			groupAdd(aaGroup, droid);
			log("added to aa group: " + droid.id);
		}
		else
		{
			logObj(droid, "attack droid built: "+droid.weapons[0].name);
			groupAdd(attackGroup, droid);
			log("added to attack group: " + droid.id);
		}
	}
	else if (droid.droidType === DROID_CYBORG)
	{
		totalCyborgBuilt ++;
		logObj(droid, "attack cyborg built: "+droid.weapons[0].name);
		groupAdd(attackGroup, droid);
		log("added to attack group: " + droid.id);
	}
	else if (droid.droidType === DROID_CONSTRUCT)
	{
		if (enumGroup(baseBuilders).length < MIN_BASE_TRUCKS) { groupAdd(baseBuilders, droid); }
		else if (enumGroup(oilBuilders).length < MIN_OIL_TRUCKS) { groupAdd(oilBuilders, droid); }
		else if (enumGroup(baseBuilders).length === MIN_BASE_TRUCKS) { groupAdd(baseBuilders, droid); }
		else if (enumGroup(oilBuilders).length < MIN_OIL_TRUCKS*2-1) { groupAdd(oilBuilders, droid); }
		else if (enumGroup(baseBuilders).length < MAX_BASE_TRUCKS) { groupAdd(baseBuilders, droid); }
		else { groupAdd(oilBuilders, droid); }
	}
	else if (droid.droidType === DROID_REPAIR)
	{ 
		if ((groupSize(vtolRepairGroup) < 1 && countStruct(VTOL_PAD_STAT) > 4) || (groupSize(vtolRepairGroup) < 2 && countStruct(VTOL_PAD_STAT) > 12))
		{
			groupAdd(vtolRepairGroup, droid);
			log("added repair to vtolrepairgroup: "+droid.id);
		}
		else
		{
			groupAdd(attackGroup, droid); 
			log("added repair to attack group: "+droid.id);
			idleRepair(droid);
		}
	}
	else if (droid.droidType === DROID_SENSOR)
	{ 
		groupAdd(sensorGroup, droid);
		logObj(droid, "added sensor to sensorgroup");
	}
}

// throttled by api
function eventAttacked(victim, attacker) {
    if (!victim || !attacker || !victim.id || !attacker.id) return;

    // Only proceed if the victim belongs to the current player
    if (victim.player !== me || attacker.player === me) return;

    // Track seen attackers that do not belong to the current player
    if (attacker.player !== me && !allianceExistsBetween(attacker.player, me)) {
        seenStore.addObject(attacker.id, attacker);
		AAseenStore.addObject(attacker.id, attacker);
    }

    // Handle droid repairs if the victim is a droid
    if (victim.type === DROID) droidNeedsRepair(victim.id);

    // Check for retreat conditions when a cyborg or truck is hit by a reprogram ray
    if (victim.type === DROID && (victim.droidType == DROID_CYBORG || victim.droidType == DROID_CONSTRUCT)) {
        for (let weapon of attacker.weapons) {
            if (weapon.id === "SpyTurret01" || weapon.id === "ScavNEXUSlink") {
                orderDroid(victim, DORDER_RTB);
                logObj(victim, "cyborg or truck hit by link ray RTB");
                orderTargets.delete(victim.id);
                orderLocations.delete(victim.id);
                return;
            }
        }
    }

    // Determine if the current player is very outnumbered
    if (attacker.player !== me && !allianceExistsBetween(attacker.player, me)) {
        if (victim.type === DROID && victim.player === me && !victim.isVTOL) {
            const seenEnemyGroup = enumRange(victim.x, victim.y, GROUP_SCAN_RADIUS, ENEMIES, true).filter(
                obj => obj.isVTOL === false && obj.player !== scavengerPlayer &&
                !(obj.canHitAir === true && obj.canHitGround === false) &&
                (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.droidType === DROID_REPAIR || obj.stattype === DEFENSE)
            );

            const seenAllyGroup = enumRange(victim.x, victim.y, GROUP_SCAN_RADIUS, ALLIES, true).filter(
                obj => obj.isVTOL === false && (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG ||
                    obj.droidType === DROID_COMMAND || obj.droidType === DROID_REPAIR || obj.stattype === DEFENSE)
            );

            let allyHealth = 0;
            let enemyHealth = 0;

            // Aggregate health estimates for allies and enemies
            for (let ally of seenAllyGroup) {
                const cost = ally.cost ?? 100;
                const bodySize = ally.bodySize ?? 1;
                allyHealth += cost * (bodySize + 1) * (ally.health / 100);
            }

            for (let enemy of seenEnemyGroup) {
                const cost = enemy.cost ?? 100;
                const bodySize = enemy.bodySize ?? 1;
                enemyHealth += cost * (bodySize + 1) * (enemy.health / 100);
            }

            // Retreat if outnumbered
            if (allyHealth * 1.2 < enemyHealth) {
                for (let ally of seenAllyGroup) {
                    if (ally.type === DROID && ally.player === me && distBetweenTwoPoints(ally.x, ally.y, BASE.x, BASE.y) > AVG_BASE_RADIUS) {
                        orderDroid(ally, DORDER_RTB);
                        log(`droid ${ally.id} RTB ${allyHealth}*1.2 < ${enemyHealth}`);
                        orderTargets.delete(ally.id);
                        orderLocations.delete(ally.id);
                    }
                }
            }
        }

        // Check if the attacker is a VTOL
        if (attacker.type === DROID && attacker.isVTOL) {
            enemyHasVtol = true;
        }
    }

    // Determine defenders based on group size
    let defenders, loc = { x: attacker.x, y: attacker.y };
    if (groupSize(defendGroup) > MIN_ATTACK_GSIZE) {
        defenders = enumGroup(defendGroup);
    } else {
        defenders = enumGroup(attackGroup).concat(enumGroup(defendGroup));
    }

    const len = defenders.length;
    // defenders scout to victim location
    if (len >= MIN_GROUND_UNITS && !attacker.isVTOL && !ThrottleThis("eventAttacked_Throttle_ground", VTOL_DEFEND_TIME * 3)) {
        for (let dr of defenders) {
            if (!droidNeedsRepair(dr.id) && dr.id !== victim.id && dr.order !== DORDER_RTB) {
                if (dr.droidType !== DROID_REPAIR) {
                    orderDroidLoc(dr, DORDER_SCOUT, loc.x, loc.y);
                    log("defend droid " + dr.id + " scouting: " + loc.x + "x" + loc.y);
                    orderLocations.set(dr.id, { x: loc.x, y: loc.y, enemies: true });
                }
            }
        }
    }
	// order VTOLs scout to attacker if safe
    const vtols = enumGroup(vtolGroup);
    if (vtols.length > MIN_VTOL_UNITS) {
        for (let vt of vtols) {
            let AA = getAAthreats(loc);
            if (AA && AA.length > 2) {
                logObj(vt, "vtol not sent on defend mission AA");
                return;
            }
            if (!ThrottleThis("eventAttacked_throttle_Vtol_" + vt.id, VTOL_DEFEND_TIME)
                && vt.weapons[0].armed === 100 && vt.health === 100 && vt.order !== DORDER_ATTACK && vt.order !== DORDER_REARM) {
                orderDroidLoc(vt, DORDER_SCOUT, loc.x, loc.y);
                logObj(vt, "vtol sent on defend mission");
            }
        }
    }
}

function eventStructureReady(structure)
{
	// done with a timer too
	if (structure.stattype === LASSAT) fireLassat(structure);
}

function eventDroidIdle(droid)
{
	if (droid.droidType === DROID_CONSTRUCT && droid.group === oilBuilders) {
		idleConstructor(droid);
	}
	else if (droid.isVTOL) {
		idleVtol(droid);
	}
	else if (droid.droidType === DROID_REPAIR && droid.group !== vtolRepairGroup) {
		idleRepair(droid);
	}
	else if (droid.droidType === DROID_WEAPON || droid.droidType === DROID_CYBORG) {
		idleAttacker(droid);
	}
	else if (droid.droidType === DROID_SENSOR) { } // done by timer
}

function eventObjectTransfer(object, whofrom)
{
	if (!object || !object.id) return;
	logObj(object, "transferred");
	seenStore.deleteObjects({ id: object.id });
	if (object.canHitGround === false && object.canHitAir === true) AAseenStore.deleteObjects({ id: object.id });
	if (object.player === me)
	{
		if (object.type === DROID) eventDroidBuilt(object);
	}
}

function eventStructureDemolish(object, droid)
{
	if (!object || !object.id) return;
	logObj(object, "demolished");
	seenStore.deleteObjects({ id: object.id });
}

function eventObjectRecycled(object)
{
	if (!object || !object.id) return;
	logObj(object, "recycled");
	seenStore.deleteObjects({ id: object.id });
	if (object.canHitGround === false && object.canHitAir === true) AAseenStore.deleteObjects({ id: object.id });
}

function eventDestroyed(object)
{
	if (!object || object.id == undefined) return;
	let x = object.x; let y = object.y;
	logObj(object, "destroyed");
	if (object.type === FEATURE && object.damageable) {
		if (MapTilesFeatures[x] != undefined && MapTilesFeatures[x][y] != undefined) MapTilesFeatures[x][y].destroyed = true;
	}
	if (object.canHitGround === false && object.canHitAir === true) AAseenStore.deleteObjects({ id: object.id });
	if ((object.type === FEATURE && object.stattype === OIL_RESOURCE) === false) seenStore.deleteObjects({ id: object.id });

	if (object.player !== me) return;

	if (object.type === DROID) orderLocations.delete(object.id);
	if (object.type === DROID) orderTargets.delete(object.id);
	if (object.isVTOL) {
		totalVtolsLost ++;
		if (totalVtolsBuilt < totalVtolsLost*2) relyOnVtols = false;
		if (totalVtolsBuilt > totalVtolsLost*2) relyOnVtols = true;
	}
	if (object.droidType === DROID_CYBORG) {
		totalCyborgLost ++;
		if (totalCyborgBuilt < totalCyborgLost*2) relyOnCybrogs = false;
		if (totalCyborgBuilt > totalCyborgLost*2) relyOnCybrogs = true;
	}
}

function eventStructureBuilt(structure, droid)
{
	// update lastBuildLoc
	if (structure && !structure.modules && (structure.stattype === FACTORY || structure.stattype === RESEARCH_LAB || structure.stattype === POWER_GEN || structure.stattype === VTOL_FACTORY))
	{
		logObj(droid, structure.name+" lastBuildLoc:"+JSON.stringify(lastBuildLoc));
		lastBuildLoc.x = structure.x-1; lastBuildLoc.y = structure.y;
	}
	if (distBetweenTwoPoints(lastBuildLoc.x, lastBuildLoc.y, BASE.x, BASE.y) > GROUP_SCAN_RADIUS*2)
	{
		lastBuildLoc = {x: BASE.x, y: BASE.y};
	}
	// upgrade power plant if possible as it costs nothing and is absolutely essential
	if (structure && droid && structure.stattype === POWER_GEN && structure.modules < 1 && isStructureAvailable("A0PowMod1"))
	{
		orderDroidBuild(droid, DORDER_BUILD, "A0PowMod1", structure.x, structure.y);
		orderLocations.set(droid.id, {x: structure.x, y: structure.y, enemies: false});
		return;
	}
	// check if constructor sees oil to build on
	if (droid.group === oilBuilders)
	{
		let oils = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
		if (oils && oils.length > 0)
		{
			for (let oil of oils)
			{
				if (!tileIsBurning(oil.x, oil.y) && droidCanReach(droid, oil.x, oil.y))
				{
					orderDroidBuild(droid, DORDER_BUILD, DERRICK_STAT, oil.x, oil.y);
					logObj(droid, "droidAware truck found free oil feature on way to build something")
					orderLocations.set(droid.id, {x: oil.x, y: oil.y, enemies: false});
					return;
				}
			}
		}
	}
}

function eventPickup(feature, dr)
{

}

function eventDroidRankGained(dr, rankNum)
{

}
