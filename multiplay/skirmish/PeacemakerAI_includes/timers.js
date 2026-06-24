function droidAwareAttacker() { queue("droidAwareAttackerQ"); }
function droidAwareAttackerQ()
{
	let droidAware = enumGroup(attackGroup).concat(enumGroup(defendGroup));
	for (let dr of droidAware)
	{
		// very damaged attackers retreat to repair fac
		if (dr.health < 40)
		{
			if (countStruct(REPAIR_FACILITY_STAT)){
				orderDroid(dr, DORDER_RTR);
				logObj(dr, "very damaged attacker ordered to RTR");
				continue;
			} else {
				orderDroid(dr, DORDER_RTB);
				logObj(dr, "very damaged attacker ordered to RTB");
				continue;
			}
		}
		// stop scouting droids from returning to position
		if (dr.order === DORDER_SCOUT && dr.action === 38)
		{
			idleAttacker(dr);
			continue;
		}
		// catch attack droids that have fallen idle while guarding
		if (dr.order === 25 && dr.action === 0)
		{
			idleAttacker(dr);
			continue;
		}
		// check for damaged droids stuck on scout 
		if ((dr.health < 85) && (dr.order === DORDER_SCOUT || dr.order === DORDER_ATTACK))
		{ 
			droidNeedsRepair(dr.id);
			continue;
		}
		// move to a nearby non burning location
		moveFromBurningTile(dr);
	}
}

function droidAwareSensor()
{
	let droidAware = enumGroup(sensorGroup);

	for (let dr of droidAware)
	{
		if (dr.droidType !== DROID_SENSOR) continue;

		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) continue;

		// rtb if on tileIsBurning
		moveFromBurningTile(dr);

		if (dr.health < 80 && dr.order !== DORDER_RTR)
		{
			orderDroid(dr, DORDER_RTR);
			logObj(dr, "damaged sensor ordered to RTR");
			continue;
		}

		// escort the most exp attack droid
		if (random(100) > 70)
		{
			let new_escort = findMostExpDroid();
			if (new_escort && new_escort.id)
			{
				orderDroidObj(dr, 25, new_escort); // defend
				logObj(dr, "sensor ordered to escort: "+new_escort.id);
			}
		}
	}
}

function droidAwareAA()
{
	let droidAware = enumGroup(aaGroup);

	for (let dr of droidAware)
	{
		if (!(dr.canHitGround === false && dr.canHitAir === true)) { continue; }
		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) { continue; }

		// rtb if on tileIsBurning
		moveFromBurningTile(dr);

		if (dr.health < 80 && dr.order !== DORDER_RTR)
		{
			orderDroid(dr, DORDER_RTR);
			logObj(dr, "damaged aa ordered to RTR");
			continue;
		}

		// escort the most exp attack droid
		if (random(100) > 89)
		{
			let new_escort = findMostExpDroid();
			if (new_escort && new_escort.id)
			{
				orderDroidObj(dr, 25, new_escort); // defend
				logObj(dr, "sensor ordered to escort: "+new_escort.id);
			}
		}
	}
}

function droidAwareVtol() { queue("droidAwareVtolQ"); }
function droidAwareVtolQ()
{
	let droidAware = enumGroup(vtolGroup);
	for (let dr of droidAware)
	{
		if (!dr.isVTOL) { continue; }

		if (dr.health < 65 && dr.order === DORDER_SCOUT && enumStruct(me, VTOL_PAD_STAT))
		{
			orderDroid(dr, DORDER_REARM);
			orderLocations.delete(dr.id);
			orderTargets.delete(dr.id);
			logObj(dr, "droidAware found scouting vtol in need of repair:");
			continue;
		}
		// if scouting vtol spots mass AA retreat, otherwise attack the AA
		if (dr.order === DORDER_SCOUT || dr.order === DORDER_ATTACK)
		{
			let threats = [];
			threats = getAAthreats(dr);
			if (threats && threats.length > 3) // mass AA
			{
				orderDroid(dr, DORDER_RTB);
				logObj(dr, "droidAware scouting vtol spotted mass AA:"+threats.length);
				continue;
			}
			else if (threats && threats.length > 0 && dr.weapons[0].armed > 0 && dr.health > 65)
			{
				let threats_aa = getAAthreats(threats[0]);
				if (threats_aa && threats_aa.length < 3)
				{
					orderDroidObj(dr, DORDER_ATTACK, threats[0]);
					logObj(dr, "droidAware scouting vtol ordered to attack AA - call in support");

					// call in air support
					for (let dr2 of droidAware)
					{
						// order vtols to scout to AA if healthy and fully loaded
						if (dr2.health === 100 && dr2.weapons[0].armed === 100 && dr2.id != dr.id)
						{
							orderDroidLoc(dr2, DORDER_SCOUT, threats[0].x, threats[0].y);
						}
					}
					continue;
				}
			}
		}
		// vtol after killing AA or attacking base
		if (dr.order === DORDER_REARM && dr.action !== 35 && dr.weapons[0].armed > 0 && dr.health > 80)
		{
			let target = getVTOLtarget(dr);
			if (target)
			{
				orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
				logObj(dr, "droidAware rearming vtol ordered to scout to target");
				continue;
			}
		}
		// make sure vtol on scout does not go home with ammo if it sees ememies or there is a derrick to blast
		if (dr.order === DORDER_SCOUT && dr.weapons[0].armed > 0 && dr.health > 65 &&
		   (dr.action === 32 || dr.action === 33 || dr.action === 34 || dr.action === 38))
		{
			let target = getVTOLtarget(dr);
			if (target && target.canHitAir === true && target.canHitGround === false) // AA target
			{
				orderDroidObj(dr, DORDER_ATTACK, target);
				logObj(dr, "droidAware scouting returning with ammo vtol ordered to attack AA:"+target.id);
				continue;
			}
			else if (target)
			{
				orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
				logObj(dr, "droidAware scouting returning with ammo vtol ordered to scout to target:"+target.x+"x"+target.y);
				continue;
			}
		}
		// handle vtols on circle
		if (dr.order === 40) // CIRCLE
		{
			if (dr && dr.health < 100 && dr.weapons[0].armed < 100 && enumStruct(me, VTOL_PAD_STAT))
			{
				orderDroid(dr, DORDER_REARM);
				logObj(dr, "droidAware circling vtol ordered to REARM");
				continue;

			}
			let target = getVTOLtarget(dr);
			if (target && dr.health === 100 && dr.weapons[0].armed === 100 && target.x && target.y)
			{
				orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
				logObj(dr, "droidAware circling vtol ordered to scout to target:"+target.x+"x"+target.y);
				continue;
			}
		}
		// idle vtol
		if (dr.order === 0 || dr.action === 0)
		{
			idleVtol(dr);
			continue;
		}
	}
}

function droidAwareRepair() { queue("droidAwareRepairQ"); }
function droidAwareRepairQ()
{
	let droidAware = enumDroid(me, DROID_REPAIR);
	for (let dr of droidAware)
	{
		if (dr.droidType !== DROID_REPAIR) continue;
		if (dr.group === vtolRepairGroup) continue;

		if (dr.order === 0 || (dr.order === 25 && dr.action === 0))
		{
			idleRepair(dr);
			continue;
		}

		// repair scout to most damaged droid nearby, but not if retreating
		if (dr.order !== DORDER_RTB)
		{
			// try for tanks first
			let droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*4, me, true).filter((obj) =>
				(obj.isVTOL === false && obj.droidType === DROID_WEAPON) );
			// if no tanks try for cyborgs
			if (!droids || droids.length === 0)
			{
				droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*4, me, true).filter((obj) =>
					(obj.droidType === DROID_CYBORG) );
			}
			// if there are combat droids nearby to scout to
			if (droids && droids.length > 0)
			{
				let lowesthealth = 100;
				let scoutit = false;
				for (let drg of droids)
				{
					if (drg.health < lowesthealth)
					{
						lowesthealth = drg.health;
						scoutit = drg;
					}
				}
				// scout to damaged droid nearby if not already scouting to that droid
				let scoutloc = orderLocations.get(dr.id);
				if (scoutit && lowesthealth < 90 && (!scoutloc || !(scoutloc.x === scoutit.x && scoutloc.y === scoutit.y)))
				{
					orderDroidLoc(dr, DORDER_SCOUT, scoutit.x, scoutit.y);
					orderLocations.set(dr.id, { x: scoutit.x, y: scoutit.y });
					logObj(dr, "droidAware repair scout to most damaged droid:"+scoutit.id);
				}
			}
		}
	}
}

function droidAwareScout() { queue("droidAwareScoutQ"); }
function droidAwareScoutQ()
{
	let droidAware = enumGroup(attackGroup).concat(enumGroup(defendGroup));
	for (let dr of droidAware)
	{
		if (dr.droidType === DROID_REPAIR) continue;
		// check if scouting droid is very near target 
		if (orderLocations.has(dr.id) && dr.order === DORDER_SCOUT && (dr.droidType === DROID_COMMAND || dr.droidType === DROID_WEAPON || dr.droidType === DROID_CYBORG) )
		{
			let scoutLoc = orderLocations.get(dr.id);

			if (scoutLoc && scoutLoc.x && scoutLoc.y)
			{
				if (scoutLoc.x >= 0 && scoutLoc.y >= 0 && distBetweenTwoPoints(dr.x, dr.y, scoutLoc.x, scoutLoc.y) < 4)
				{
					idleAttacker(dr);
				}
			}
		}
		// check combat scout locations for enemies, cancel scout order if none
		if (orderLocations.has(dr.id) && dr.order === DORDER_SCOUT && (dr.droidType === DROID_COMMAND || dr.droidType === DROID_WEAPON || dr.droidType === DROID_CYBORG))
		{
			let scoutLoc = orderLocations.get(dr.id);
			if (scoutLoc && scoutLoc.x && scoutLoc.y)
			{
				if (scoutLoc.x >= 0 && scoutLoc.y >= 0)
				{
					if (scoutLoc.enemies === false)
					{
						orderDroid(dr, DORDER_STOP);
						logObj(dr, "scouting combat droid ordered to STOP as scout location is free of enemies");
						orderLocations.delete(dr.id);
						continue;
					}
				}
			}
		}
		// if attacking close to a repair facility take it out, but not before the trucks
		if (dr.action === 6 && (dr.order === DORDER_SCOUT || dr.order === 25) && (dr.droidType === DROID_WEAPON || dr.droidType === DROID_CYBORG))
		{
			let objects = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ENEMIES, true);
			let repairfacs = objects.filter((obj) => (obj.stattype === REPAIR_FACILITY));
			let trucks = objects.filter((obj) => (obj.droidType === DROID_CONSTRUCT));

			if (!trucks[0] && repairfacs && repairfacs.length > 0)
			{
				orderDroidObj(dr, DORDER_ATTACK, repairfacs[0]);
				logObj(dr, "scouting combat droid ordered to attack repair facility");
				orderLocations.delete(dr.id);
				continue;				
			}
		}
	}
}

function droidAwareTruck() { queue("droidAwareTruckQ"); }
function droidAwareTruckQ()
{
	let droidAware = enumDroid(me, DROID_CONSTRUCT);
	for (let dr of droidAware)
	{
		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) continue;

		// rtr if on tileIsBurning
		if (tileIsBurning(dr.x, dr.y)) moveFromBurningTile(dr);

		// make oil trucks RTB if they spot enemies, but not AA, and not if already in base
		if (dr.group === oilBuilders && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS/2) {
			if (fleeFromHostiles(dr)) continue;
		}

		// check if oilbuilder sees free oil to build on or a well to liberate
		if (dr.group === oilBuilders && (dr.order === DORDER_MOVE || dr.order === DORDER_SCOUT))
		{
			// check for free wells first
			let oils = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
			oils = sortByDistToLoc(dr, oils);

			if (oils && oils.length > 0)
			{
				let oil = oils[0];
				// check for adjacent oil first
				if (distBetweenTwoPoints(dr.x, dr.y, oil.x, oil.y) < 1.5) {
					orderDroidBuild(dr, DORDER_BUILD, DERRICK_STAT, oil.x, oil.y);
					logObj(dr, "droidAware truck building on adjacent oil");
					orderLocations.set(dr.id, {x: oil.x, y: oil.y, enemies: false});
					seenStore.addObject( oil.id, { ...oil, id: oil.id, isReachable: true, requiresDestruction: false });
					continue;
				}

				// check assignments
				const lastAssignmentTime = oilAssignments.get(oil.id) || -Infinity;
				if (gameTime - lastAssignmentTime > 30000) {
					oilAssignments.delete(oilAssignments.get(dr.id)); // delete old oil assignment for this truck

					// check is accessible
					if (seenStore.query({isReachable: true, requiresDestruction: false, x: oil.x, y: oil.y}).length && droidCanReach(dr, oil.x, oil.y)) {
						let enemies = getHostilesNear(oil, GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
						if (enemies.length === 0)
						{
							orderDroidBuild(dr, DORDER_BUILD, DERRICK_STAT, oil.x, oil.y);
							logObj(dr, "droidAware truck found free oil feature on way to build something");
							orderLocations.set(dr.id, {x: oil.x, y: oil.y, enemies: false});
							// update assignments
							oilAssignments.set(oil.id, gameTime);
							oilAssignments.set(dr.id, oil.id);
							continue;
						}
					}
				}
			}

			// see if there is a well to liberate
			oils = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => (obj.type === STRUCTURE && obj.stattype === RESOURCE_EXTRACTOR));
			oils = sortByDistToLoc(dr, oils);

			if (oils && oils.length > 0 && seenStore.query({isReachable: true, requiresDestruction: false, x:oils[0].x, y:oils[0].y}).length && droidCanReach(dr, oils[0].x, oils[0].y)) {
				let oil = oils[0];
				// if allied combat droids or defenses are present do not liberate
				let mydefenses = enumRange(oil.x, oil.y, GROUP_SCAN_RADIUS, ALLIES, true).filter((obj) =>
						(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
				if (mydefenses.length === 0) {
					let enemies = getHostilesNear(oil, GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
					if (enemies.length === 0)
					{
						let defense = firstAvailableStructure(Schemes[Scheme].STANDARD_DEFENSES);
						let buildloc = false;
						if (defense) {
							buildloc = pickStructLocation(dr, defense, oil.x, oil.y, 1);
						}
						if (buildloc) {
							orderDroidBuild(dr, DORDER_BUILD, defense, buildloc.x, buildloc.y);
							logObj(dr, "droidAware truck found oil to liberate");
							orderLocations.set(dr.id, {x: oil.x, y: oil.y, enemies: false});
							continue;
						}
					}
				}
			}
		}

		// check for artifacts
		if (dr.group === oilBuilders && (dr.order === DORDER_MOVE || dr.order === DORDER_SCOUT)) {
			if (collectArtifacts(dr)) continue;
		}

		// check truck scout locations for enemies, cancel scout order if more than one hostile combat unit present
		if (orderLocations.has(dr.id) && dr.order !== 0 && dr.order == DORDER_SCOUT)
		{
			let scoutLoc = orderLocations.get(dr.id);
			if (scoutLoc && scoutLoc.x && scoutLoc.y)
			{
				if (scoutLoc.x >= 0 && scoutLoc.y >= 0)
				{
					let enemies = getHostilesNear(scoutLoc, GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
					if (enemies[1])
					{
						orderDroid(dr, DORDER_RTB);
						logObj(dr, "scouting constructor ordered to RTB as scout location has more than one enemy");
						orderTargets.delete(dr.id);
						orderLocations.delete(dr.id);
						continue;
					}
				}
			}
		}
		// trigger idle
		if (dr.order === 0 || dr.order === 25)
		{
			idleConstructor(dr);
			continue;
		}
	}
}

function collectArtifacts(dr)
{
	if (!collectArtifacts._assignments) collectArtifacts._assignments = new Map();

	let artifacts = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && (obj.stattype === OIL_DRUM || obj.stattype === ARTIFACT)));
	artifacts = sortByDistToLoc(dr, artifacts);

	if (artifacts && artifacts.length > 0) {
		for (let artifact of artifacts) {
			if (artifact.x === undefined || artifact.y === undefined) continue;
			// check assignments
			let lastAssignment = collectArtifacts._assignments.get(artifact.id) || 0;
			if (lastAssignment < gameTime - 60000) {
				collectArtifacts._assignments.delete(artifact.id);
				// check is accessible
				if (droidCanReach(dr, artifact.x, artifact.y)) {
					let enemies = getHostilesNear(artifact, GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
					if (enemies.length === 0) {
						orderDroidObj(dr, DORDER_RECOVER, artifact);
						logObj(dr, "droidAware truck found artifact to collect");
						orderLocations.set(dr.id, {x: artifact.x, y: artifact.y, enemies: false});
						// update assignments
						collectArtifacts._assignments.set(artifact.id, gameTime);
						return true;
					}
				}
			}
		}
	}
	return false;
}

function droidAwareObstacles() { queue("droidAwareObstaclesQ"); }
function droidAwareObstaclesQ() {
    // Get demolish droid or grab weakest combat unit
    let droids = enumGroup(demolishGroup);
    if (!droids || !droids.length) {
        const weakestDroids = getStrongestAttackDroids().reverse(); // weakest droids
        if (weakestDroids && weakestDroids.length && weakestDroids[0].id) {
            groupAdd(demolishGroup, weakestDroids[0]);
            logObj(weakestDroids[0], "added to demolishGroup");
        } else { return; }// No droids available
    }

    const dr = droids[0];
    if (!dr || !dr.id) return;

	// check if healthy
	if (dr.health < 75 && dr.order !== DORDER_RTR) {
		orderDroid(dr, DORDER_RTR);
		logObj(dr, "RTR");
		return;
	}

    // if attacking or scouting and not idle return
    if (( dr.order === DORDER_ATTACK || dr.order === DORDER_RTR || dr.order === DORDER_RECOVER ) && dr.action !== 0) return;

	// scout to nearby hostiles instead
	let hostiles = getHostilesNear(dr, GROUP_SCAN_RADIUS);
	if (hostiles && hostiles.length && dr.order !== DORDER_SCOUT) {
		orderDroidLoc(dr, DORDER_SCOUT, hostiles[0].x, hostiles[0].y);
		logObj(dr, `demolish droid scouting to nearby hostile`);
	}

	// try to collect artifacts
	if (collectArtifacts(dr)) return;

	logObj(dr, `droidAwareObstacles starting run`);

    // Demolish base obstacles if not already cleared
    if (!droidAwareObstaclesQ._clearedBaseObstacles) {
        let baseObstacles = enumRange(BASE.x, BASE.y, AVG_BASE_RADIUS, ALL_PLAYERS, false).filter((obj) =>
			obj.type === FEATURE && obj.damageable && droidCanReach(dr, obj.x, obj.y));
		baseObstacles = sortByDistToLoc(dr, baseObstacles);

        if (baseObstacles && baseObstacles.length) {
            orderDroidObj(dr, DORDER_ATTACK, baseObstacles[0]);
            logObj( dr, `droidAware demolishing base feature ${baseObstacles[0].name} at ${baseObstacles[0].x},${baseObstacles[0].y}` );
            return;
        }
    }

    droidAwareObstaclesQ._clearedBaseObstacles = true;

    // Demolish paths to blocked oil
    let blockedOils = seenStore.query({isReachable: true, requiresDestruction: true });

    if (!blockedOils || !blockedOils.length) {
        removeTimer("droidAwareObstacles");
        groupAdd(attackGroup, dr);
        logObj(dr, "removed timer");
        return; // All demolition tasks completed
    }

    let update = false;
    for (const oil of blockedOils) {
		logObj(dr, `checking for unblocked path to oil: ${oil.x},${oil.y}`);
        const pathWithout = findShortestPath(oil, dr, dr.prop, false);
        if (pathWithout) {
            // Update seenStore and mark the oil as reachable
			seenStore.deleteKey(oil.id); // oils are frozen
            seenStore.addObject(oil.id, { ...oil, id: oil.id, requiresDestruction: false });
            logObj(dr, `updated seenStore`);
            update = true;
            break; // Only check one per iteration
        }
    }

    if (update) blockedOils = seenStore.query({ isReachable: true, requiresDestruction: true });

    if (blockedOils && blockedOils.length) {
        const blockedOil = blockedOils[0];
		logObj(dr, `checking path for blocked oil: ${blockedOil.x},${blockedOil.y}`);
        const blockedPath = findShortestPath(blockedOil, BASE, dr.prop, true);

        if (blockedPath) {
			logObj(dr, `clearing path to: ${blockedOil.x},${blockedOil.y}`);
            // Start unblocking the path if safe
            const oilObstacles = blockedPath.destructionList.reverse();
            const hostilesOil = getHostilesNear(oilObstacles[0], GROUP_SCAN_RADIUS).length > 0;
            if (!hostilesOil) {
				logObj(dr, `demolishing obstacle: ${oilObstacles[0].x},${oilObstacles[0].y}`);
				let obstacleObject = getObject(oilObstacles[0].x, oilObstacles[0].y);
				if (obstacleObject && obstacleObject.id) {
					orderDroidObj(dr, DORDER_ATTACK, obstacleObject);
					logObj(dr, `droidAware demolishing path obstacle: `+JNstr(oilObstacles[0]));
					return;
				}
            }
        }
    }
}

function droidAwareRTB() { queue("droidAwareRTBQ"); }
function droidAwareRTBQ()
{
	let droidAware = enumDroid(me);
	for (let dr of droidAware)
	{
		// send retreating vtols on random attack missions
		if (dr.order === DORDER_RTB && dr.isVTOL === true && dr.health > 80 && dr.weapons[0].armed > 80)
		{
			// select random enemy target and attack
			let target = getVTOLtarget(dr, random);
			if (target)
			{
				orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
				logObj(dr, "droidAware RTB vtol droid ordered to scout to derrick:"+target.x+"x"+target.y);
			}
		}

		// check for healthy RTR droid
		if (dr.health > 90 && dr.order === DORDER_RTR)
		{
			orderDroidLoc(dr, DORDER_SCOUT, dr.x, dr.y);
			logObj(dr, "droidAwareRTB found healthy RTR");
			orderTargets.delete(dr.id);
			orderLocations.delete(dr.id);
			continue;
		}

		// check if RTB droid is very near base
		if (dr.order === DORDER_RTB && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) < 8)
		{
			orderDroidLoc(dr, DORDER_SCOUT, dr.x, dr.y);
			logObj(dr, "droidAware found RTB very close to base");
			orderTargets.delete(dr.id);
			orderLocations.delete(dr.id);			
			continue;
		}

		// change base defender RTB orders to SCOUT to BASE attackers if no enemies seen on the way back to base
		// base will order RTB again if dr not within avgbaseradius
		if (dr.order === DORDER_RTB && baseUnderAttack > 0) 
		{
			let enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true);
			if (!enemies[0] || distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) < AVG_BASE_RADIUS)
			{
				if (dr.droidType == DROID_REPAIR)
				{	
					idleRepair(dr);
				}
				else 
				{
					orderDroidLoc(dr, DORDER_SCOUT, baseUnderAttackLoc.x, baseUnderAttackLoc.y);
					logObj(dr, "base defend RTB droid switched to scout:"+dr.id);
					orderLocations.set(dr.id, {x: baseUnderAttackLoc.x , y: baseUnderAttackLoc.y, enemies: true});
				}
			}
		}

		// RTB move to nearby defense
		if (dr.order === DORDER_RTB && baseUnderAttack === 0) 
		{
			let enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true);
			if (!enemies[0])
			{
				let defenses = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.stattype === DEFENSE && obj.status === BUILT));
				if (defenses[0]) // move to nearby defense 
				{	
					if (dr.droidType == DROID_REPAIR)
					{		
						let droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.droidType === DROID_WEAPON && obj.isVTOL === false));
						if (!droids[0]) { droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.droidType === DROID_CYBORG)); }
						let droid = droids[random(droids.length-1)];
						if (droid) 
						{
							orderDroidLoc(dr, DORDER_SCOUT, defenses[0].x, defenses[0].y);
							log("RTB repair switched to scout to defense :"+dr.id);
							orderLocations.set(dr.id, {x: defenses[0].x, y: defenses[0].y, enemies: true});
						}
						else 
						{ 
							orderDroidLoc(dr, DORDER_SCOUT, defenses[0].x, defenses[0].y);
							log("RTB repair switched to scout to defense :"+dr.id);
							orderLocations.set(dr.id, {x: defenses[0].x, y: defenses[0].y, enemies: true});
						}				
					}
					else 
					{
						orderDroidLoc(dr, DORDER_SCOUT, defenses[0].x, defenses[0].y);
						log("RTB droid switched to scout to defense:"+dr.id);
						orderLocations.set(dr.id, {x: defenses[0].x, y: defenses[0].y, enemies: true});
					}
				}
				else 
				{
					orderDroidLoc(dr, DORDER_SCOUT, dr.x, dr.y); 
					log("RTB switched to scout to current location:"+dr.id);
					orderLocations.set(dr.id, {x: dr.x, y: dr.y, enemies: false});
				}
			}
		}
	}	
}

function baseAware()
{
	// respond to enemies in base
	let hq = enumStruct(me, HQ);

	if (!hq[0]) { hq = enumStruct(me).filter((obj) => (obj.stattype === VTOL_FACTORY || obj.stattype === FACTORY || obj.stattype === CYBORG_FACTORY)); }
	if (!hq[0]) { baseUnderAttack = 0; return; }

	// set BASE location to hq location
	if (hq[0]) { BASE = {x: hq[0].x, y: hq[0].y}; }

	// check if base is under attack ignore vtols
	let enemies = enumRange(hq[0].x, hq[0].y, AVG_BASE_RADIUS*0.65, ENEMIES, true).filter((obj) =>
		(obj.isVTOL === false && (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.droidType === DROID_CONSTRUCT || obj.stattype === DEFENSE)) );
	enemies.sort(sortByDistToBase);

	if (enemies.length > 12) {
		log("baseAware hq spotted mass of enemy attackers:"+enemies.length);
		baseUnderAttack = 4;
	}
	else if (enemies.length > 8)
	{
		log("baseAware hq spotted many enemy attackers:"+enemies.length);
		baseUnderAttack = 3
	}
	else if (enemies.length > 3)
	{
		log("baseAware hq spotted several enemy attackers:"+enemies.length);
		baseUnderAttack = 2;
	}
	else if (enemies.length > 0)
	{
		log("baseAware hq spotted a few enemy attackers:"+enemies.length);
		baseUnderAttack = 1;
	}
	else
	{
		baseUnderAttack = 0;
	}

	if (baseUnderAttack > 0)
	{
		baseUnderAttackLoc = {x: enemies[0].x, y: enemies[0].y}
		let defenders;
		if (baseUnderAttack > 1)
		{
			defenders = enumGroup(defendGroup).concat(enumGroup(attackGroup));
		}
		else if (groupSize(defendGroup) > MIN_ATTACK_GSIZE)
		{
			defenders = enumGroup(defendGroup);
		}
		else
		{
			defenders = enumGroup(defendGroup).concat(enumGroup(attackGroup));
		}

		for (let i = 0; i < defenders.length; ++i)
		{
			let dr = defenders[i];
			// only call them back if outside base and not already near attackers
			if (dr && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS &&
				distBetweenTwoPoints(dr.x, dr.y, baseUnderAttackLoc.x, baseUnderAttackLoc.y) > AVG_BASE_RADIUS)
			{
				if (dr.droidType == DROID_REPAIR)
				{
					let defrand = defenders[random(defenders.length)];
					orderDroidObj(dr, 25, defrand); // DORDER_GUARD
					log("base defend repair guard:"+dr.id);
				}
				else
				{
					orderDroid(dr, DORDER_RTB);
					log("base defend droid RTB:"+dr.id);
					orderTargets.delete(dr.id);
					orderLocations.delete(dr.id);
				}
			}
			else if (dr.droidType !== DROID_REPAIR)
			{
				orderDroidLoc(dr, DORDER_SCOUT, baseUnderAttackLoc.x, baseUnderAttackLoc.y);
				orderLocations.set(dr.id, {x: baseUnderAttackLoc.x, y: baseUnderAttackLoc.y, enemies: true});
				log("base defend combat droid in base ordered to scout:"+dr.id);
			}
		}
	}
}

function balanceGroups()
{
	//log("AAseenStore: "+JNstr(AAseenStore.query({})));
	//log("seenStore: "+JNstr(seenStore.query({})));

	if (getResearch("R-Sys-Sensor-Upgrade01").done) GROUP_SCAN_RADIUS = 11;
	if (getResearch("R-Sys-Sensor-Upgrade02").done) GROUP_SCAN_RADIUS = 13;
	if (getResearch("R-Sys-Sensor-Upgrade03").done) GROUP_SCAN_RADIUS = 15;

	// check if truck groups need balancing
	if (groupSize(baseBuilders) < MIN_BASE_TRUCKS && groupSize(oilBuilders) > 0) { setupTruckGroups(); }
	if (groupSize(baseBuilders) > MAX_BASE_TRUCKS) { setupTruckGroups(); }
	// put vtolrepairgroup on patrol
	let vtolpads = enumStruct(me, VTOL_PAD_STAT).sort(sortByDistToBase);
	if (vtolpads && vtolpads[0])
	{
		let vtolrepairs = enumGroup(vtolRepairGroup);
		for (let repair of vtolrepairs)
		{
			orderDroidLoc(repair, DORDER_PATROL, vtolpads[0].x, vtolpads[0].y); // vtolpads[vtolpads.length-1].x, vtolpads[vtolpads.length-1].y
			logObj(repair, "vtolrepair put on PATROL");
		}
	}
	// if attackgroup is large enough move some droids to defendGroup if needed
	if (groupSize(attackGroup) > MIN_ATTACK_GSIZE*3 && groupSize(defendGroup) < MIN_ATTACK_GSIZE*1.5 ||
		groupSize(attackGroup) > MIN_ATTACK_GSIZE*6 && groupSize(defendGroup) < MIN_ATTACK_GSIZE*3)
	{
		let attackLen = groupSize(attackGroup);
		let attackers = enumGroup(attackGroup);
		for (let i = 0; i < attackLen; ++i)
		{
			let dr = attackers[i];
			if (!droidNeedsRepair(dr.id) && dr.order !== DORDER_RECYCLE && dr.order !== DORDER_RTR)
			{
				if (random(100) < 20) 
				{
					groupAdd(defendGroup, dr);
					orderDroidLoc(dr, DORDER_SCOUT, BASE.x, BASE.y);
					orderLocations.set(dr.id, {x: BASE.x, y: BASE.y});
					log("moved droid to defendGroup "+dr.id+" size:"+groupSize(defendGroup));
				}
			}
		}
	}
	// decide when to recycle obsolete droids
	// if python is available and groups are large enough recycle vipers with experience
	if (componentAvailable("Body11ABT"))
	{
		let droids = enumDroid(me, DROID_WEAPON);
		if (droids && droids.length > MIN_ATTACK_GSIZE*4)
		{
			for (let dr of droids)
			{
				if (dr.isVTOL) { return; }
				if (dr.experience > 8 && dr.body === "Body1REC")
				{
					orderDroid(dr, DORDER_RECYCLE);
					logObj(dr, "exp viper droid ordered to recycle exp:"+dr.experience);
					orderLocations.delete(dr.id);
					orderTargets.delete(dr.id);
				}					
			}
		}
	}
	// recycle experienced cobra or bug vtols if pulse laser is available
	if (componentAvailable("Laser2PULSEMk1") && groupSize(vtolGroup) > MIN_VTOL_UNITS*4)
	{
		const vtols = enumDroid(DROID_WEAPON);
		for (let dr of vtols)
		{
			if (!dr.isVTOL) { return; }
			if (dr.experience > 16 && (dr.body === "Body5REC" || dr.body === "Body4ABT"))
			{
				orderDroid(dr, DORDER_RECYCLE);
				orderLocations.delete(dr.id);
				orderTargets.delete(dr.id);				
				logObj(dr, "vtol ordered to recycle experience:"+dr.experience);
			}
		}
	}
}

//// not confirmed working
function checkVtolAlphaStrike() { queue("checkVtolAlphaStrikeQ"); }
let vtolAlphaStrikeLoc = {};
function checkVtolAlphaStrikeQ()
{
	let vtols = enumGroup(vtolGroup);
	if (vtols.length < MIN_VTOL_UNITS*4) return false;
	
	// get clusters of unallied AA units sorted by smallest first and randomly check one of the first few
	let clusters = seenStore.findClusters({ canHitGround: false, isAllied: false, canHitAir: true, }, 3, 24)
		.sort((a, b) => a.members.length - b.members.length )
		.filter((obj) => (obj.lastSeen > gameTime - 600000));

	let chance = 100;
	if (clusters.length > 3) { chance = 25; }
	else if (clusters.length === 3) { chance = 33; }
	else if (clusters.length === 2) { chance = 50; }
	for (let cluster of clusters)
	{
		if (random(100) < chance)
		{
			if (vtols.length > cluster.members.length*3)
			{
				for (let vtol of vtols)
				{
					if (vtolReady(vtol))
					{
						orderDroidLoc(vtol, 40, BASE.x, BASE.y); // CIRCLE
						logObj(vtol, "vtols ordered to CIRCLE for alphastrike: "+cluster.centroid.x+"x"+cluster.centroid.y);
					}
				}
				vtolAlphaStrikeLoc = cluster.centroid;
				queue(orderVtolAlphaStrike, VTOL_DEFEND_TIME);
			}
			return; // only check one
		}
	}
}

function orderVtolAlphaStrike()
{
	if (!vtolAlphaStrikeLoc || !vtolAlphaStrikeLoc.x) log("ERROR orderVtolAlphaStrike no location");
	let vtols = enumGroup(vtolGroup);
	for (let vtol of vtols) {
		if (vtolReady(vtol)) {
			orderDroidLoc(vtol, 40, cluster.centroid.x, cluster.centroid.y); // CIRCLE
			logObj(vtol, "vtols ordered to alphastrike AA cluster: "+vtolAlphaStrikeLoc.x+"x"+vtolAlphaStrikeLoc.y);
		}
	}
	vtolAlphaStrikeLoc = {};
}

function handlePileups() { queue("handlePileupsQ"); }
function handlePileupsQ()
{
	let clusters = seenStore.findClusters({ player: me, type: DROID, isVTOL: false}, 16, 4); // min, radius
	for (let cluster of clusters)
		for (let dr of cluster.members)
		{
			orderDroid(dr, DORDER_STOP);
			log("possible pileup detected stopping: " + dr.id);
		}

	// check for repair droid clusters
	clusters = seenStore.findClusters({ player: me, type: DROID, droidType: DROID_REPAIR }, 8, 5); // min, radius
	for (let cluster of clusters)
		for (let dr of cluster.members)
		{
			orderDroid(dr, DORDER_STOP);
			log("possible repair pileup detected stopping: " + dr.id);
		}
}

function updateSeenStore() { queue("updateSeenStoreQ"); }
function updateSeenStoreQ()
{
    let objects = [];
    let pidx = 0;

    // Collect all objects in a single loop with direct pushes
    for (let player of playerData) {
        objects.push(...enumDroid(pidx, DROID_ANY, me));
        for (let type of STRUCTURE_TYPES) {
            objects.push(...enumStruct(pidx, type, me));
        }
        pidx++;
    }

    // Process each object once with optimized checks
	for (let obj of objects) {
		if ((obj.id !== undefined && obj.x !== undefined) || obj.y !== undefined) {

			let isAllied = allianceExistsBetween(me, obj.player);
			let isAA = obj.canHitAir === true && obj.canHitGround === false;
			let isCombat = obj.droidType === DROID_WEAPON ||
						obj.droidType === DROID_CYBORG ||
						obj.stattype === DEFENSE;

			// Directly add the object without cloning if not needed
			seenStore.addObject(obj.id, { ...obj, id: obj.id, isAllied, isAA, isCombat, lastSeen: gameTime });

			if (isAA && !isAllied) {
				AAseenStore.addObject(obj.id, { ...obj, id: obj.id, isAllied, isAA, isCombat, lastSeen: gameTime });
			}
		}
	}
}

function pruneSeenStore() { queue("pruneSeenStoreQ"); }
function pruneSeenStoreQ() {
    // Expire AAthreats based on type and age
    for (let obj of AAseenStore.query({})) {
        if ((obj.type === STRUCTURE && obj.lastSeen < gameTime - 600000) ||
            (obj.type === DROID && obj.lastSeen < gameTime - 120000)) {
            AAseenStore.deleteKey(obj.id);
        }
    }

    // Remove structures that have been destroyed while unseen
    const seenNow = new Map();
    let pidx = 0;

    for (let player of playerData) {
        for (let type of STRUCTURE_TYPES) {
            enumStruct(pidx, type, me).forEach(obj => obj.id && seenNow.set(obj.id, true));
        }
        pidx++;
    }

    for (let obj of seenStore.query({ type: STRUCTURE })) {
        if (obj.id && !seenNow.has(obj.id)) {
            seenStore.deleteKey(obj.id);
            AAseenStore.deleteKey(obj.id);
        }
    }
}

function recycleDroidsForHover()
{
	// don't recycle if not hover not required to reach oil
	if (!isSeaMap && !seenStore.query({requiresHover: true}).length) return removeTimer("recycleDroidsForHover");
	// not ready to recuycle
	if (componentAvailable("hover01") === false || countStruct(FACTORY_STAT) === 0) return;

	let systems = enumGroup(oilBuilders).filter((dr) => (dr.propulsion !== PROP_HOVER));
	let tanks = enumGroup(attackGroup).filter((dr) => (dr.droidType === DROID_WEAPON && dr.propulsion !== PROP_HOVER));
	if (!tanks.length && !systems.length) removeTimer("recycleDroidsForHover");
	tanks = tanks.filter((dr) => (dr.action !== 6)); // DACTION_ATTACK
	systems = systems.filter((dr) => (dr.action === 0));

	if (countStruct(FACTORY_STAT)) {
		recycleDroids(systems);
		if (isSeaMap && componentAvailable("V-Tol")) {
			recycleDroids(tanks);
		}
	}
}

function checkOrderLocations() { queue("checkOrderLocationsQ"); }
function checkOrderLocationsQ() {
    const EXPIRATION_TIME_MS = 240000; // four minutes

    // Single pass: update orderLocations with threat info and check for expiration
    orderLocations.forEach(({ x, y, enemies: oldEnemies, lastUpdated }, key) => {
        if (x === null || y === null) return;

        // Check if the record has expired based on `lastUpdated` timestamp
        const currentTime = gameTime;
        const ageInMs = currentTime - lastUpdated;
        if (ageInMs > EXPIRATION_TIME_MS) {
            log(`checkOrderLocations expired entry at (${x}, ${y})`);
            orderLocations.delete(key);
            return; // Skip further processing for this expired record
        }

        // Check for current enemies
        const enemies = seenStore.findNear({ x, y }, GROUP_SCAN_RADIUS, { isAllied: false, isCombat: true })
            .filter(obj => obj.lastSeen > currentTime - 60000); // Adjust the filter condition if needed

        // Update in-place if threat status changed or record was just created/updated
        let shouldUpdate = false;
        if (enemies.length > 0 && oldEnemies === false) {
            orderLocations.set(key, { x, y, enemies: true, lastUpdated: currentTime });
            shouldUpdate = true;
        } else if (enemies.length === 0 && oldEnemies !== false) {
            orderLocations.set(key, { x, y, enemies: false, lastUpdated: currentTime });
            shouldUpdate = true;
        }

        // If no change but record is not expired, just ensure it's up-to-date
        if (!shouldUpdate && ageInMs > 0) {
            orderLocations.set(key, { ...orderLocations.get(key), lastUpdated: currentTime });
        }
    });

    // Optional: log the current size of orderLocations for debugging
    log(`Current orderLocations size: ${orderLocations.size}`);
}
// function checkOrderLocationsQ()
// {
//     // Single pass: update orderLocations with threat info
//     orderLocations.forEach(({ x, y, enemies: oldEnemies }, key) => {
//         if (x == null || y == null) return;
//
//         // Check for current enemies
//         const enemies = seenStore.findNear({ x: x, y: y }, GROUP_SCAN_RADIUS, { isAllied: false, isCombat: true })
//             .filter(obj => obj.lastSeen > gameTime - 60000);
//
//         // Update in-place if threat status changed
//         if (enemies.length > 0 && oldEnemies === false) {
//             orderLocations.set(key, { x, y, enemies: true });
//         } else if (enemies.length === 0 && oldEnemies !== false) {
//             orderLocations.set(key, { x, y, enemies: false });
//         }
//     });
// }

function updateMapTilesFeatures() { queue("updateMapTilesFeaturesQ"); }
function updateMapTilesFeaturesQ() {
	MapTilesFeatures = loadFeaturesIntoTiles(enumFeature(ALL_PLAYERS).filter((obj) => (obj.stattype !== OIL_DRUM && obj.stattype !== ARTIFACT)), MapTiles);
}

function checkUnreachableOils() { queue("checkUnreachableOilsQ"); }
function checkUnreachableOilsQ() {
	let reachableWithDestruction = seenStore.query({ type: FEATURE, stattype: OIL_RESOURCE, isReachable: true, requiresDestruction: true });
	if (!reachableWithDestruction || !reachableWithDestruction.length) {
		removeTimer("checkUnreachableOils");
		return;
	}

	for (let oil of reachableWithDestruction) {
		// check for path without destruction
		let pathWithoutDestruction = findShortestPath(oil, BASE, PROP_HOVER, false);

		if (!pathWithoutDestruction) continue;
		// update seenStore
		seenStore.deleteKey(oil.id);
		seenStore.addObject(oil.id, { ...oil, isReachable: true, requiresDestruction: false});
	}
}

function adjustSchemeAndStance()
{
	// evaluate hostile forces and choose scheme
	let hostileCyborg = seenStore.query({ isAllied: false, droidType: DROID_CYBORG });
	let hostileTanks = seenStore.query({ isAllied: false, droidType: DROID_WEAPON, isVTOL: false });

	// choose anti-tank or anti-cyborg
	if (hostileCyborg.length + hostileTanks.length > 15 && !componentAvailable("Laser2PULSEMk1")) { // if already at pulse laser don't switch

		if (hostileCyborg.length > hostileTanks.length && Scheme !== "MGLAS") {
			Scheme = "MGLAS";
			log("switching scheme to MGLAS");
		}
		if (hostileCyborg.length < hostileTanks.length && Scheme !== "CNLAS") {
			Scheme = "CNLAS";
			log("switching scheme to CNLAS");
		}
	}

	// adjust stance based on losses and hostile composition
	// vtol
	// cyborgs
}
