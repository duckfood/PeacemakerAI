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
			groupAdd(aaGroup, droid);
			logObj(droid, "added to aaGroup");
		}
		else
		{
			groupAdd(attackGroup, droid);
			logObj(droid, "added to attackGroup");
		}
	}
	else if (droid.droidType === DROID_CYBORG)
	{
		totalCyborgBuilt ++;
		groupAdd(attackGroup, droid);
		logObj(droid, "added to attackGroup");
	}
	else if (droid.droidType === DROID_CONSTRUCT)
	{
		// Get the current number of items in each group
		let baseCount = enumGroup(baseBuilders).length;
		let oilCount = enumGroup(oilBuilders).length;

		if (baseCount < MIN_BASE_TRUCKS) { groupAdd(baseBuilders, droid); logObj(droid, "added to baseBuilders"); }
		else if (oilCount < MIN_OIL_TRUCKS) { groupAdd(oilBuilders, droid); logObj(droid, "added to oilBuilders"); }
		else if (baseCount === MIN_BASE_TRUCKS) { groupAdd(baseBuilders, droid); logObj(droid, "added to baseBuilders"); }
		else if (oilCount < MAX_OIL_TRUCKS - 1) { groupAdd(oilBuilders, droid); logObj(droid, "added to oilBuilders"); }
		else if (baseCount < MAX_BASE_TRUCKS) { groupAdd(baseBuilders, droid); logObj(droid, "added to baseBuilders"); }
		else { groupAdd(oilBuilders, droid); logObj(droid, "added to oilBuilders"); }
	}
	else if (droid.droidType === DROID_REPAIR)
	{
		if ((groupSize(vtolRepairGroup) < 1 && countStruct(VTOL_PAD_STAT) > 4) || (groupSize(vtolRepairGroup) < 2 && countStruct(VTOL_PAD_STAT) > 12))
		{
			groupAdd(vtolRepairGroup, droid);
			logObj(droid, "added repair to vtolRepairGroup");
		}
		else
		{
			groupAdd(attackGroup, droid);
			logObj(droid, "added repair to attackGroup");
			idleRepair(droid);
		}
	}
	else if (droid.droidType === DROID_SENSOR)
	{
		groupAdd(sensorGroup, droid);
		logObj(droid, "added sensor to sensorGroup");
	}
}

// throttled by api
function eventAttacked(victim, attacker) {
    if (!victim || !attacker || !victim.id || !attacker.id) return;

    // Only proceed if the victim belongs to the current player
    if (victim.player !== me || attacker.player === me) return;

    // Track seen attackers that do not belong to the current player
    if (attacker.player !== me && !allianceExistsBetween(attacker.player, me)) {
		if (attacker.canHitAir === true && attacker.canHitGround === false) {
			AAseenStore.addObject(attacker.id, { ...attacker, isAllied: false, isAA: true, isCombat: true, lastSeen: gameTime });
		} else {
			seenStore.addObject(attacker.id, { ...attacker, isAllied: false, isAA: false, isCombat: true, lastSeen: gameTime });
		}
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

    // Determine when to flee and when to stand ground
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

    // defenders scout to victim location
    if (defenders.length >= MIN_GROUND_UNITS && !attacker.isVTOL) {
        for (let dr of defenders) {
			if (throttleThis("eventAttacked_throttle_ground_"+dr.id, VTOL_DEFEND_TIME * 3)) continue;
            if (!droidNeedsRepair(dr.id) && dr.id !== victim.id && dr.order !== DORDER_RTB) {
                if (dr.droidType !== DROID_REPAIR) {
                    orderDroidLoc(dr, DORDER_SCOUT, loc.x, loc.y);
                    log("defend droid " + dr.id + " scouting: " + loc.x + "x" + loc.y);
                    orderLocations.set(dr.id, { x: loc.x, y: loc.y, enemies: true });
                }
            }
        }
    }
	// order vtols scout to attacker if safe
    const vtols = enumGroup(vtolGroup);
    if (vtols.length > MIN_VTOL_UNITS * 2) {
        for (let vt of vtols) {
            if (throttleThis("eventAttacked_throttle_Vtol_" + vt.id, VTOL_DEFEND_TIME * 3)) continue;
            let AA = getAAthreats(loc);
            if (AA && AA.length > 2) {
                logObj(vt, "vtol not sent on defend mission AA: "+AA.length);
                return;
            }
            if (vtolReady(vt) && vt.order !== DORDER_ATTACK && vt.order !== DORDER_REARM) {
                orderDroidLoc(vt, DORDER_SCOUT, loc.x, loc.y);
                logObj(vt, "vtol sent on defend mission");
            }
        }
    }
}

function eventStructureReady(structure)
{
	// uses a timer too
	if (structure.stattype === LASSAT) {
		lassatFired = false;
		fireLassat(structure);
	}
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
	if (object.player === me && object.type === DROID) eventDroidBuilt(object);
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
	if (!object || !object.id) return;
	logObj(object, "destroyed");

	if (object.type === FEATURE && object.stattype !== OIL_RESOURCE) MapTilesFeatures[object.x][object.y].destroyed = true;

	if (object.canHitGround === false && object.canHitAir === true) AAseenStore.deleteObjects({ id: object.id });

	seenStore.deleteKey(object.id);

	if (object.player !== me) return;

	if (object.type === DROID) orderLocations.delete(object.id);
	if (object.type === DROID) orderTargets.delete(object.id);
	if (object.isVTOL) {
		totalVtolsLost ++;
		if (!isAirMap && totalVtolsBuilt > 12 && totalVtolsBuilt < totalVtolsLost*3) relyOnVtols = false;
		if (!isAirMap && totalVtolsBuilt > 12 && totalVtolsBuilt > totalVtolsLost*3) relyOnVtols = true;
	}
	if (object.droidType === DROID_CYBORG) {
		totalCyborgLost ++;
		if (totalCyborgBuilt > 12 && totalCyborgBuilt < totalCyborgLost*3) relyOnCyborgs = false;
		if (totalCyborgBuilt > 12 && totalCyborgBuilt > totalCyborgLost*3) relyOnCyborgs = true;
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
	if (distBetweenTwoPoints(lastBuildLoc.x, lastBuildLoc.y, BASE.x, BASE.y) > GROUP_SCAN_RADIUS*2)	lastBuildLoc = {x: BASE.x, y: BASE.y};

	if (droid.group === oilBuilders) {
		// check for other visible reachable oils
		let oils = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
		if (oils && oils.length) {
			oils = sortByDistToLoc(droid, oils);
			for (let oil of oils) {
				if (!tileIsBurning(oil.x, oil.y) && droidCanReach(droid, oil.x, oil.y) && oilResourceStore.query({ isReachable: true, requiresDestruction: false, x:oil.x, y:oil.y })) {
					orderDroidBuild(droid, DORDER_BUILD, DERRICK_STAT, oil.x, oil.y);
					logObj(droid, "eventStructureBuilt building on nearby oil");
					oilAssignments.set(oil.id, gameTime);
					oilAssignments.set(droid.id, oil.id);
					break;
				}
			}
		}
	}
}

function eventPickup(feature, droid)
{
	// if artifact picked check for another and delete assignment
	if (feature.stattype === ARTIFACT || feature.stattype === OIL_DRUM) {
		collectArtifacts._assignments.delete(feature.id);
		if (collectArtifacts(droid)) return;
	}
}
