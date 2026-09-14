function droidAwareAttacker() { queue("droidAwareAttackerQ"); }
function droidAwareAttackerQ(droidAware)
{
	if (DEBUGEX) logFile("droidAwareAttackerQ");
    // 1. Initialize the target list of droids
    const droidAwareList = enumGroup(attackGroup)
        .concat(enumGroup(defendGroup))
        .concat(enumGroup(oilAttackers));

    for (const dr of droidAwareList) {
        if (!dr || !dr.id) {
            continue;
        }

        // 2. Immediate Exit Conditions
        // Skip if already retreating
        if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) {
            continue;
        }

        // 3. Critical Damage Handling (< 40 Health)
        if (dr.health < 40) {
            // Determine the destination: Repair Facility (RTR) or Base (RTB)
            const isRepairFacilityPresent = countStruct(REPAIR_FACILITY_STAT);
            const targetOrder = isRepairFacilityPresent ? DORDER_RTR : DORDER_RTB;

            orderDroid(dr, targetOrder);
            const logMessage = `droidAwareAttacker: very damaged attacker ordered to ${targetOrder === DORDER_RTR ? 'RTR' : 'RTB'}`;
            logFile(dr, logMessage);
            continue; // Action taken, move to next droid
        }

        // 4. Minor Damage Handling (< 80 Health) - Move to Repair
        if (dr.health < 80) {
            let targetCoords = null;
            let actionTaken = false;

            // A. Try to find nearby repair unit (Priority 1)
            const nearbyRepairs = seenStore.findNear(dr, 2, { isAllied: true, droidType: DROID_REPAIR });
            if (nearbyRepairs && nearbyRepairs.length && nearbyRepairs[0].id) {
                const repairDroid = nearbyRepairs[0];
                orderDroidLoc(dr, DORDER_SCOUT, repairDroid.x, repairDroid.y);
                logFile(dr, `droidAwareAttacker damaged droid scouting to repair: ${repairDroid.id}`);
                targetCoords = { x: repairDroid.x, y: repairDroid.y };
                actionTaken = true;
            }

            // B. If no nearby repair unit, find the closest unit globally (Priority 2)
            if (!actionTaken) {
                let allRepairs = seenStore.query({ isAllied: true, droidType: DROID_REPAIR });
                if (allRepairs && allRepairs.length) {
                    // Sort and select the best target
                    const closestRepairDroid = sortByDistToLoc(dr, allRepairs)[0];

                    if (closestRepairDroid) {
                        orderDroidLoc(dr, DORDER_MOVE, closestRepairDroid.x, closestRepairDroid.y);
                        logFile(dr, `droidAwareAttacker damaged droid moving to repair: ${closestRepairDroid.id}`);
                        targetCoords = { x: closestRepairDroid.x, y: closestRepairDroid.y };
                    }
                }
            }
        }

        // 5. Specific State Management Checks

        // Check 5.1: Droids on fire support are not supporting if fully armed
        if (dr.hasIndirect === true && dr.order === DORDER_FIRESUPPORT && dr.weapons[0].armed === 100) {
            idleAttacker(dr);
            continue;
        }

        // Check 5.2: Scouting droids returning to position get new target
        if (dr.order === DORDER_SCOUT && dr.action === DACTION_RETURNTOPOS) {
            idleAttacker(dr);
            continue;
        }

        // Check 5.3: Idle guarding droids get new target
        if (dr.order === DORDER_GUARD && dr.action === DACTION_NONE) {
            idleAttacker(dr);
			logFile(dr, `droidAwareAttacker found guarding idle`);
            continue;
        }

        // 6. Movement and Action Decisions

        // Move out of burning tiles if possible
        if (moveFromBurningTile(dr)) {
            continue;
        }

        // If droids are not attacking, and random chance dictates, try artifact collection
        if (dr.action !== DACTION_ATTACK && Math.random() * 100 < 8 && collectArtifacts(dr, GROUP_SCAN_RADIUS*2)) {
            continue;
        }
    }
}

function droidAwareSensor()
{
    let droidAware = enumGroup(sensorGroup);

    for (let dr of droidAware)
    {
        // 1. Basic Checks
        if (dr.droidType !== DROID_SENSOR) continue;
        if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) continue;
        // rtb if on tileIsBurning
        if (moveFromBurningTile(dr)) continue;

        // Damage Check
        if (dr.health < 80 && dr.order !== DORDER_RTR)
        {
            orderDroid(dr, DORDER_RTR);
            logFile(dr, "damaged sensor ordered to RTR");
            continue;
        }
        // Retreat
        let retreat = shouldWeRetreat(dr);
		if (retreat) {
			orderRetreat(retreat);
			continue;
		}

        // 2. Support
        if (dr.action === DACTION_OBSERVE) {
			// move to another observation point if no support nearby
			let nearbySupport = seenStore.findNear(dr, GROUP_SCAN_RADIUS * 2, { player: me, type: DROID, canHitGround: true});
			if (!nearbySupport || !nearbySupport.length) {
				let escorts = getStrongestAttackDroids();
				if (escorts && escorts.length) {
					let escort = escorts[0];
					orderDroidLoc(dr, DORDER_MOVE, escort.x, escort.y);
					logFile(dr, "moving to escort: "+escort.id);
					continue;
				}
			}

			// call in support when illuminating
            let nearbyArtillery = seenStore.findNear(dr, GROUP_SCAN_RADIUS * 2, { player: me, type: DROID, hasIndirect: true });
            const assignedArtillery = new Set();

            for (let artillery of nearbyArtillery) {
                const artilleryId = artillery.id;

                // Skip if unit has no ID or if it has already been assigned a mission this tick
                if (!artilleryId || assignedArtillery.has(artilleryId)) {
                    continue;
                }

                if (artillery.order === DORDER_SCOUT && orderTargets.get(dr.id) !== artilleryId) {

                    // 3. Issue Command
                    orderDroidObj(artillery,  DORDER_FIRESUPPORT, dr);
                    logFile(artillery, "assigned to sensor: "+dr.id);

                    // 4. Update State & Mark as Assigned
                    orderTargets.set(artilleryId, dr.id);
                    orderLocations.set(artilleryId, dr);
                    assignedArtillery.add(artilleryId);
                }
            }
        }

        // 3. Observe
		if ((dr.order !== DORDER_MOVE && dr.order !== DORDER_SCOUT) || dr.action === DACTION_NONE) {
			let escorts = getStrongestAttackDroids();
			if (escorts && escorts.length) {
				let escort = escorts[0];
				orderDroidLoc(dr, DORDER_SCOUT, escort.x, escort.y);
				logFile(dr, "scouting to escort: "+escort.id);
				continue;
			}
		}
		// stop scouting sensors from returning to position
		if (dr.order === DORDER_SCOUT && dr.action === DACTION_RETURNTOPOS)
		{
			let escorts = getStrongestAttackDroids();
			if (escorts && escorts.length) {
				let escort = escorts[0];
				orderDroidLoc(dr, DORDER_SCOUT, escort.x, escort.y);
				logFile(dr, "scouting to escort: "+escort.id);
				continue;
			}
		}
    }
}

function droidAwareAA()
{
	let droidAware = enumGroup(aaGroup);

	for (let dr of droidAware)
	{
		if (!(dr.canHitGround === false && dr.canHitAir === true)) continue;
		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) continue;

		if (moveFromBurningTile(dr)) continue;

		if (dr.health < 80) {
			orderDroid(dr, DORDER_RTR);
			logFile(dr, "damaged AA ordered to RTR");
			continue;
		}

		let new_escort = findMostExpDroid();
		if (dr.order === 25 && distBetweenTwoPoints(dr.x, dr.y, new_escort.x, new_escort.y) > 6) {
			if (new_escort && new_escort.id){
				orderDroidLoc(dr, DORDER_SCOUT, new_escort.x, new_escort.y);
				logFile(dr, "AA ordered to return to escort: "+new_escort.id);
			}
		}

		// escort the most exp attack droid
		if (Math.random() * 100 > 89){

			if (new_escort && new_escort.id){
				orderDroidObj(dr, 25, new_escort);
				logFile(dr, "AA ordered to escort: "+new_escort.id);
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
		if (!dr.isVTOL) continue;

		if (dr.health < 75 && dr.order === DORDER_SCOUT && enumStruct(me, VTOL_PAD_STAT))
		{
			orderDroid(dr, DORDER_REARM);
			orderLocations.delete(dr.id);
			orderTargets.delete(dr.id);
			logFile(dr, "droidAware found scouting vtol in need of repair:");
			continue;
		}

		if (dr.order === DORDER_SCOUT || dr.order === DORDER_ATTACK)
		{
			let threats = getAAthreats(dr);
			if (threats && threats.length)
			{
				// check to see if nearby vtols vastly outnumber aa
				let allied_vtols = seenStore.findNear(dr, GROUP_SCAN_RADIUS *2, { isAllied: true, isVTOL: true });

				if (allied_vtols.length / 6 > threats.length)
				{
					orderDroidObj(dr, DORDER_ATTACK, threats[0]);
					logFile(dr, "droidAware scouting mass of vtol ordered to attack AA");

					// call in air support from nearby vtols
					let my_vtols = allied_vtols.filter((obj) => (obj.player === me));
					for (let vt of my_vtols)
					{
						if (vt.health === 100 && vt.weapons[0].armed === 100 && vt.id != dr.id &&
								!throttleThis("droidAwareVtol_throttle_AAairSupport_"+vt.id, VTOL_DEFEND_TIME*3))
						{
							let aathreat = returnRandInFirstFew(threats);
							let vt_object = getObject(vt.type, vt.player, vt.id);
							if (vt_object && vt_object.id && vt_object.isVTOL) {
								orderDroidObj(vt_object, DORDER_ATTACK, aathreat);
								logFile(vt, "droidAware vtol called in for AA support");
							}
						}
					}
					continue;
				}

				// otherwise retreat
				orderDroid(dr, DORDER_RTB);
				logFile(dr, "droidAware scouting vtol spotted mass AA:"+threats.length);
				continue;
			}
			else if (groupSize(vtolGroup) > MIN_VTOL_UNITS * 2 && threats && threats.length > 0 && dr.weapons[0].armed > 0 && dr.health > 65)
			{
				let threats_aa = getAAthreats(threats[0]);
				if (threats_aa && threats_aa.length < 2)
				{
					orderDroidObj(dr, DORDER_ATTACK, threats[0]);
					logFile(dr, "droidAware scouting vtol ordered to attack AA - call in support");

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
				logFile(dr, "droidAware rearming vtol ordered to scout to target");
				continue;
			}
		}
		// make sure vtol on scout does not go home with ammo if it sees enemies or there is a derrick to blast
		if (dr.order === DORDER_SCOUT && dr.weapons[0].armed > 0 && dr.health > 65 &&
		   (dr.action === 32 || dr.action === 33 || dr.action === 34 || dr.action === 38))
		{
			let target = getVTOLtarget(dr);
			if (target && target.canHitAir === true && target.canHitGround === false) // AA target
			{
				orderDroidObj(dr, DORDER_ATTACK, target);
				logFile(dr, "droidAware scouting returning with ammo vtol ordered to attack AA:"+target.id);
				continue;
			}
			else if (target)
			{
				orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
				logFile(dr, "droidAware scouting returning with ammo vtol ordered to scout to target:"+target.x+"x"+target.y);
				continue;
			}
		}
		// handle vtols on circle
		if (dr.order === 40) // CIRCLE
		{
			if (dr && dr.health < 100 && dr.weapons[0].armed < 100 && enumStruct(me, VTOL_PAD_STAT))
			{
				orderDroid(dr, DORDER_REARM);
				logFile(dr, "droidAware circling vtol ordered to REARM");
				continue;
			}
			if (Math.random() * 100 > 85) { // remove some from circle
				let target = getVTOLtarget(dr);
				if (target && dr.health === 100 && dr.weapons[0].armed === 100 && target.x && target.y)
				{
					orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
					logFile(dr, "droidAware circling vtol ordered to scout to target:"+target.x+"x"+target.y);
					continue;
				}
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
	let droidAware = enumGroup(repairGroup);
	for (let dr of droidAware)
	{
		if (dr.droidType !== DROID_REPAIR) continue;
		if (dr.group === vtolRepairGroup) continue;

		if (dr.order === 0 || (dr.order === 25 && dr.action === 0))
		{
			idleRepair(dr);
			continue;
		}

		// repair scout to most damaged droid nearby
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
					logFile(dr, "droidAware repair scout to most damaged droid:"+scoutit.id);
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
						idleAttacker(dr);
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
				logFile(dr, "scouting combat droid ordered to attack repair facility");
				orderLocations.delete(dr.id);
				continue;				
			}
		}
	}
}

function droidAwareTruck() { queue("droidAwareTruckQ"); }
function droidAwareTruckQ()
{
    // 1. Initialization and Droid Enumeration
    const droidAware = enumDroid(me, DROID_CONSTRUCT);
    for (const dr of droidAware) {
        if (!dr || !dr.id) continue;

        // Skip droids already ordered to return or take specific retreat orders.
        if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) continue;

        // 2. Check burning tiles
        if (moveFromBurningTile(dr)) continue;

		// if base truck patrol

        // 3. Oil Builder Logic: Hostile Evasion
        if (dr.group === oilBuilders && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS / 4) {
            if (fleeFromHostiles(dr)) continue;
        }

        // 4. Resource Scanning and Assignment
        if (dr.group === oilBuilders && (dr.order === DORDER_MOVE || dr.order === DORDER_SCOUT || dr.order === DORDER_NONE)) {

            // 4a. Check for Free Oil (Immediate Build Adjacent)
            let nearbyOils = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter(
                (obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE)
            );

            if (nearbyOils.length > 0) {
                const sortedOils = sortByDistToLoc(dr, nearbyOils);
                const nearestOil = sortedOils[0];

                // Check for building opportunity adjacent to the droid.
                if (distBetweenTwoPoints(dr.x, dr.y, nearestOil.x, nearestOil.y) < 2 && !tileIsBurning(nearestOil.x, nearestOil.y)) {
                    orderDroidBuild(dr, DORDER_BUILD, DERRICK_STAT, nearestOil.x, nearestOil.y);
                    logFile(dr, "droidAware truck building on adjacent oil");
                    orderLocations.set(dr.id, { x: nearestOil.x, y: nearestOil.y, enemies: false });
                    // Update assignments for this immediate build
                    oilAssignments.set(nearestOil.id, gameTime);
                    oilAssignments.set(dr.id, nearestOil.id);
                    continue;
                }
            }

            // 4b. Scan for the Best Site
            let suitableSite = null;
            const oilsToProcess = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter(
                (obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE)
            );

            for (const oil of oilsToProcess) {
                // Skip if hostiles are present unless they are AA
                const hostileCheck = getHostilesNear(oil, GROUP_SCAN_RADIUS).filter(
                    (obj) => obj.isAA === false
                );
                if (hostileCheck.length > 0) continue;

                // Check reachability and availability
                if (!droidCanReach(dr, oil.x, oil.y)) continue;
                if (oilResourceStore.query({ isReachable: false, x: oil.x, y: oil.y }).length) continue;
                if (tileIsBurning(oil.x, oil.y)) continue;

                // Skip if assignment is too recent
                const lastAssignmentTime = oilAssignments.get(oil.id) || -Infinity;
                if (gameTime - lastAssignmentTime < ONE_MINUTE/2) continue;

                // Skip if multiple trucks are already near this site
                const nearbyTrucks = seenStore.findNear(oil, 2, { player: me, droidType: DROID_CONSTRUCT });
                if (nearbyTrucks && nearbyTrucks.length > 1) continue;

                // Found a suitable site - break and assign
                suitableSite = oil;
                break;
            }

            // 4c. Execute Build Order if Site Found
            if (suitableSite && isInMapBounds(suitableSite)) {
                // Clear old assignments (if applicable)
                if (oilAssignments.has(dr.id)) {
                    oilAssignments.delete(dr.id);
                }

                orderDroidBuild(dr, DORDER_BUILD, DERRICK_STAT, suitableSite.x, suitableSite.y);
                logFile(dr, "droidAware truck found free oil feature on way to build something");
                orderLocations.set(dr.id, { x: suitableSite.x, y: suitableSite.y, enemies: false });

                // Update assignments
                oilAssignments.set(suitableSite.id, gameTime);
                oilAssignments.set(dr.id, suitableSite.id);
                continue;
            }
        }

        // 5. Resource Extraction: Liberating Wells
        let wells = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ENEMIES, true).filter(
            (obj) => (obj.type === STRUCTURE && obj.stattype === RESOURCE_EXTRACTOR)
        );
        wells = sortByDistToLoc(dr, wells);

        if (wells.length > 0 && getRealPower() > MIN_LIBERATE_POWER) {
            const primaryWell = wells[0];

            // Check for resource extraction potential at the primary well
            const resourceQuery = oilResourceStore.query({ isReachable: true, requiresDestruction: false, x: primaryWell.x, y: primaryWell.y });

            // Check if the droid can reach the well
            if (resourceQuery.length > 0 && droidCanReach(dr, primaryWell.x, primaryWell.y)) {
                let myDefenses = enumRange(primaryWell.x, primaryWell.y, GROUP_SCAN_RADIUS, ALLIES, true).filter(
                    (obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE)
                );

                // Only proceed if no allied combat droids or defenses are present
                if (myDefenses.length === 0) {
                    const enemyHostiles = getHostilesNear(primaryWell, GROUP_SCAN_RADIUS).filter(
                        (obj) => (obj.isAA === false)
                    );

                    // Only proceed if there are no hostile combat units
                    if (enemyHostiles.length === 0) {
                        let defenseSchema = firstAvailableStructure(Scheme.STANDARD_DEFENSES);
                        let buildLocation = false;

                        if (defenseSchema) {
                            buildLocation = pickStructLocation(dr, defenseSchema, primaryWell.x, primaryWell.y, 1);
                        }

                        if (buildLocation && isInMapBounds(buildLocation)) {
                            orderDroidBuild(dr, DORDER_BUILD, defenseSchema, buildLocation.x, buildLocation.y);
                            logFile(dr, "droidAware truck found oil to liberate");
                            orderLocations.set(dr.id, { x: primaryWell.x, y: primaryWell.y, enemies: false });
                            continue;
                        }
                    }
                }
            }
        }

        // 6. Artifact Collection Check
        if (dr.group === oilBuilders && (dr.order === DORDER_MOVE || dr.order === DORDER_SCOUT)) {
            if (collectArtifacts(dr, GROUP_SCAN_RADIUS*2)) continue;
        }

        // 7. Scout Location Management (Enemy Detection)
        // Check if the droid is actively scouting and if the location is hostile.
        if (orderLocations.has(dr.id) && dr.order !== 0 && dr.order === DORDER_SCOUT) {
            const scoutLoc = orderLocations.get(dr.id);

            // Ensure coordinates are valid before checking
            if (scoutLoc && isInMapBounds(scoutLoc)) {
                const enemies = getHostilesNear(scoutLoc, GROUP_SCAN_RADIUS).filter(
                    (obj) => (obj.isAA === false)
                );

                // If more than one hostile combat unit is present, order withdrawal.
                if (enemies.length > 1) {
                    orderDroid(dr, DORDER_RTB);
                    logFile(dr, "scouting constructor ordered to RTB as scout location has more than one enemy");
                    orderTargets.delete(dr.id);
                    orderLocations.delete(dr.id);
                    continue;
                }
            }
        }

        // 8. Idle/Default Behavior Trigger
        if (dr.order === 0 || dr.order === DORDER_GUARD || dr.action === 0) {
            idleConstructor(dr);
            continue;
        }
    }
}

function droidAwareObstacles() { queue("droidAwareObstaclesQ"); }
let lastDemoOrderTime = 0;
const STAGNATION_THRESHOLD = ONE_MINUTE/2;
function droidAwareObstaclesQ()
{
    // 1. Setup & Droid Selection
    let droids = enumGroup(demolishGroup);
    if (!droids || !droids.length) {
        const weakestDroids = getStrongestAttackDroids().reverse();
        if (weakestDroids && weakestDroids.length && weakestDroids[0].id) {
            groupAdd(demolishGroup, weakestDroids[0]);
            logFile(weakestDroids[0], "added to demolishGroup");
        } else { return; }
    }
    const dr = droids[0];
    if (!dr || !dr.id) return;

    // 2. Vital Maintenance (Health & Retreat)
    if (dr.health < 75 && dr.order !== DORDER_RTB && dr.order !== DORDER_RTR) {
		if (countStruct(REPAIR_FACILITY_STAT)){
			orderDroid(dr, DORDER_RTR);
			logFile(dr, "droidAwareObstacles damaged RTR");
			return;
		} else {
			orderDroid(dr, DORDER_RTB);
			logFile(dr, "droidAwareObstacles damaged RTB");
			return;
		}
    }
    if (dr.health < 90 && dr.order === DORDER_RTB || dr.order === DORDER_RTR) return;

    // 3. Scouting Logic
    let hostiles = getHostilesNear(dr, GROUP_SCAN_RADIUS * 2);
    if (hostiles && hostiles.length) {
        orderDroidLoc(dr, DORDER_SCOUT, hostiles[0].x, hostiles[0].y);
        return;
    }

    // 4. STAGNATION CHECK
    const isStagnant = (gameTime - lastDemoOrderTime > STAGNATION_THRESHOLD);
    const isStuckInAttack = (dr.order === DORDER_ATTACK && isStagnant);

    if (isStuckInAttack) {
        logFile(dr, "Demolition Stagnation Detected! Attempting to reposition...");
        orderDroidLoc(dr, DORDER_MOVE, dr.x + randomBetween(-3, 3), dr.y + randomBetween(-3, 3));
        lastDemoOrderTime = gameTime;
		return;
    }

    // 5. Avoid Interrupting Active Tasks (unless we are the ones forcing a reposition)
    const isBusy = (dr.order === DORDER_SCOUT || dr.order === DORDER_ATTACK ||
                    dr.order === DORDER_RTR || dr.order === DORDER_RECOVER) && dr.action !== 0;
    if (isBusy && !isStagnant) return;

    // 6. Task: Artifact Collection
    if (collectArtifacts(dr, GROUP_SCAN_RADIUS*2)) return;

    // 7. Task: Base Obstacles
    let baseObstacles = enumRange(BASE.x, BASE.y, AVG_BASE_RADIUS, ALL_PLAYERS, false)
        .filter((obj) => obj.type === FEATURE && obj.damageable && droidCanReach(dr, obj.x, obj.y));

    if (baseObstacles && baseObstacles.length) {
        baseObstacles = sortByDistToLoc(dr, baseObstacles);
        orderDroidObj(dr, DORDER_ATTACK, baseObstacles[0]);
        lastDemoOrderTime = gameTime;
        return;
    }

    // 8. Task: Path Clearing (Blocked Oils)
    let blockedOils = oilResourceStore.query({ isReachable: true, requiresDestruction: true });
    if (!blockedOils || !blockedOils.length) {
        if (dr.order !== DORDER_ATTACK) {
            groupAdd(attackGroup, dr);
			removeTimer("droidAwareObstacles");
        }
        return;
    }

    // Check the first blocked oil
    const blockedOil = blockedOils[0];
    const blockedPath = findShortestPath(blockedOil, BASE, dr.prop, true);

    if (blockedPath) {
        const oilObstacles = blockedPath.destructionList.reverse();
        if (oilObstacles.length > 0) {
            let obstacleLocation = oilObstacles[0];
            let obstacleObject = getObject(obstacleLocation.x, obstacleLocation.y);

            if (obstacleObject && obstacleObject.id) {
                const nearbyHostiles = getHostilesNear(obstacleLocation, GROUP_SCAN_RADIUS).length > 0;
                if (!nearbyHostiles) {
					orderDroidObj(dr, DORDER_ATTACK, obstacleObject);
                    lastDemoOrderTime = gameTime;
                    return;
                }
            }
        }
    }

    // 9. Task: Update visibility for oils that are actually reachable
    for (const oil of blockedOils) {
        const pathWithout = findShortestPath(oil, dr, dr.prop, false);
        if (pathWithout) {
            seenStore.deleteKey(oil.ID);
            seenStore.addObject(oil.ID, { ...oil, requiresDestruction: false });
            break;
        }
    }
}

function droidAwareRetreat() { queue("droidAwareRetreatQ"); }
function droidAwareRetreatQ()
{
    // 1. Combine initial groups into a single collection to check.
    const droidAware = [...enumGroup(attackGroup), ...enumGroup(defendGroup), ...enumGroup(oilAttackers)];
	const skipSome = droidAware.length > MIN_ATTACK_GSIZE * 10;

    for (const dr of droidAware) {
        if (!dr || !dr.id) continue;

		if (skipSome && random(100) < 50) continue; // reduce workload

        const retreat = shouldWeRetreat(dr);
        if (retreat) orderRetreat(retreat);
    }

    // Use a single, definitive list for the droids that need reassessment
    const retreatDroids = enumGroup(retreatGroup).filter(dr => dr && dr.id);

    for (const dr of retreatDroids) {

        // 2. Consolidate enemy detection lookups.
		const seenEnemyGroup = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*1.5, ENEMIES, true).filter(obj =>
			obj.isVTOL === false &&
			obj.player !== scavengerPlayer &&
			!(obj.canHitAir === true && obj.canHitGround === false) && // not AA
			(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.droidType === DROID_REPAIR || obj.stattype === DEFENSE)
		);

        // Check for visibility of ANY hostiles
        const isHostileVisible = seenEnemyGroup.length > 0 && seenEnemyGroup[0] && seenEnemyGroup[0].id;

        // 3. If hostiles are visible, simply continue to the next droid.
        if (isHostileVisible) {
            continue;
        }

        // If no hostiles are seen, check if retreat is still necessary.
        const retreatCheck = shouldWeRetreat(dr);

        // If the retreat check shows no need to retreat, reassign roles.
        if (!retreatCheck) {

            // 4. role assignment
            let assigned = false;

            if (dr.droidType === DROID_REPAIR) {
                groupAdd(repairGroup, dr);
                logFile(dr, "droidAwareRetreat repairing");
                idleRepair(dr);
                assigned = true;
            } else if (dr.canHitAir && !dr.canHitGround) { // AA
                groupAdd(aaGroup, dr);
                orderDroid(dr, DORDER_STOP);
                logFile(dr, "droidAwareRetreat new escort");
                assigned = true;
            } else if (dr.droidType === DROID_SENSOR) {
                groupAdd(sensorGroup, dr);
                orderDroid(dr, DORDER_STOP);
                logFile(dr, "droidAwareRetreat new escort");
                assigned = true;
            } else { // Default: Must be an attacker or frontline unit
                groupAdd(attackGroup, dr);
                logFile(dr, "droidAwareRetreat new target");
                idleAttacker(dr);
                assigned = true;
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
		if (!dr || !dr.id) continue;

		// send retreating vtols on random attack missions
		if (dr.order === DORDER_RTB && dr.isVTOL === true && dr.health > 90 && dr.weapons[0].armed > 80)
		{
			// select random enemy target and attack
			let target = getVTOLtarget(dr, random);
			if (target && target.id)
			{
				orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
				logFile(dr, "droidAware RTB vtol scouting to:"+target.x+"x"+target.y);
			}
		}

		// check for healthy RTR droid returning for repair
		if (dr.health > 90 && dr.order === DORDER_RTR)
		{
			orderDroid(dr, DORDER_STOP);
			logFile(dr, "droidAwareRTB found healthy RTR");
			continue;
		}

		// check if RTB droid is very near base
		if (dr.order === DORDER_RTB && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) < 8)
		{
			orderDroid(dr, DORDER_STOP);
			logFile(dr, "droidAware found RTB very close to base");
			continue;
		}

		// change base defender RTB orders to SCOUT to BASE attackers if no enemies seen on the way back to base
		// base will order RTB again if dr not within avgbaseradius
		if (dr.order === DORDER_RTB && baseUnderAttack > 0) 
		{
			let enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true);
			if (!enemies[0] || distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) < AVG_BASE_RADIUS)
			{
				if (dr.droidType === DROID_REPAIR)
				{	
					idleRepair(dr);
				}
				else 
				{
					orderDroidLoc(dr, DORDER_SCOUT, baseUnderAttackLoc.x, baseUnderAttackLoc.y);
					logFile(dr, "base defend RTB droid switched to scout:"+dr.id);
					orderLocations.set(dr.id, {x: baseUnderAttackLoc.x , y: baseUnderAttackLoc.y, enemies: true});
				}
			}
		}

		// RTB and base is not under attack go idle
		if (dr.order === DORDER_RTB && baseUnderAttack === 0) 
		{
			let enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true);
			if (!enemies[0])
			{
				orderDroid(dr, DORDER_STOP);
				logFile(dr, "droidAware RTB but base and nearby area is safe");
				continue;
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

	if (enemies.length > 8) {
		logFile("baseAware hq spotted mass of enemy attackers:"+enemies.length);
		baseUnderAttack = 4;
	}
	else if (enemies.length > 5)
	{
		logFile("baseAware hq spotted many enemy attackers:"+enemies.length);
		baseUnderAttack = 3
	}
	else if (enemies.length > 2)
	{
		logFile("baseAware hq spotted several enemy attackers:"+enemies.length);
		baseUnderAttack = 2;
	}
	else if (enemies.length > 0)
	{
		logFile("baseAware hq spotted a few enemy attackers:"+enemies.length);
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
				if (dr.droidType === DROID_REPAIR)
				{
					let defrand = defenders[random(defenders.length)];
					orderDroidObj(dr, 25, defrand); // DORDER_GUARD
					logFile("base defend repair guard:"+dr.id);
				}
				else
				{
					orderDroid(dr, DORDER_RTB);
					logFile("base defend droid RTB:"+dr.id);
					orderTargets.delete(dr.id);
					orderLocations.delete(dr.id);
				}
			}
			else if (dr.droidType !== DROID_REPAIR)
			{
				orderDroidLoc(dr, DORDER_SCOUT, baseUnderAttackLoc.x, baseUnderAttackLoc.y);
				orderLocations.set(dr.id, {x: baseUnderAttackLoc.x, y: baseUnderAttackLoc.y, enemies: true});
				logFile("base defend combat droid in base ordered to scout:"+dr.id);
			}
		}
	}
}

function balanceGroups()
{
	//logFile("seenStore: "+JNstr(seenStore.query({})));
	//logFile("oilResourceStore length: "+oilResourceStore.query({}).length);
	//logFile("oilResourceStore: "+JNstr(oilResourceStore.query({})));

	if (isVtolMap()) relyOnVtols = true;

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
			logFile(repair, "vtolrepair put on PATROL");
		}
	}

	// setup oilAttackers with artillery
	let oilArtiCount = enumGroup(oilAttackers).filter((obj) => (obj.hasIndirect === true)).length;
	if (!oilArtiCount ||
			(groupSize(attackGroup) > MIN_ATTACK_GSIZE *3 && oilArtiCount < 2) ||
			(groupSize(attackGroup) > MIN_ATTACK_GSIZE *5 && oilArtiCount < 3) ) {
		let artillery = getStrongestAttackDroids().filter((obj) => (obj.hasIndirect === true)).reverse();
		if (artillery && artillery.length) {
			let arti = returnRandInFirstFew(artillery);
			if (arti.id) {
				groupAdd(oilAttackers, arti);
				logFile(arti, "added to oilAttackers");
			}
		}
	}
	// setup oilAttackers with direct fire
	let oilDirectCount = enumGroup(oilAttackers).filter((obj) => (obj.hasIndirect === false)).length;
	if (!oilDirectCount ||
			(groupSize(attackGroup) > MIN_ATTACK_GSIZE *3 && oilDirectCount < 2) ||
			(groupSize(attackGroup) > MIN_ATTACK_GSIZE *5 && oilDirectCount < 3) ) {
		let attackers = getStrongestAttackDroids().filter((obj) => (obj.hasIndirect === false)).reverse();
		if (attackers && attackers.length) {
			let attacker = returnRandInFirstFew(attackers);
			if (attacker.id) {
				groupAdd(oilAttackers, attacker);
				logFile(attacker, "added to oilAttackers");
			}
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
				if (Math.random() * 100 < 33)
				{
					groupAdd(defendGroup, dr);
					orderDroidLoc(dr, DORDER_SCOUT, BASE.x, BASE.y);
					orderLocations.set(dr.id, {x: BASE.x, y: BASE.y});
					logFile("moved droid to defendGroup "+dr.id+" size:"+groupSize(defendGroup));
				}
			}
		}
	}

	// if python is available and groups are large enough recycle vipers with experience
	if (componentAvailable(BODY_PYTHON))
	{
		let droids = enumDroid(me, DROID_WEAPON);
		if (droids && droids.length > MIN_ATTACK_GSIZE*4)
		{
			for (let dr of droids)
			{
				if (dr.isVTOL) { return; }
				if (dr.experience > 8 && dr.body === BODY_VIPER)
				{
					orderDroid(dr, DORDER_RECYCLE);
					logFile(dr, "exp viper droid ordered to recycle exp:"+dr.experience);
					orderLocations.delete(dr.id);
					orderTargets.delete(dr.id);
				}					
			}
		}
	}
	// recycle vtols if experienced cobra or bug and pulse laser is available
	if (componentAvailable("Laser2PULSEMk1") && groupSize(vtolGroup) > MIN_VTOL_UNITS*4)
	{
		const vtols = enumDroid(DROID_WEAPON);
		for (let dr of vtols)
		{
			if (!dr.isVTOL) { return; }
			if (dr.experience > 16 && (dr.body === BODY_COBRA || dr.body === BODY_BUG))
			{
				orderDroid(dr, DORDER_RECYCLE);
				orderLocations.delete(dr.id);
				orderTargets.delete(dr.id);				
				logFile(dr, "vtol ordered to recycle experience:"+dr.experience);
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
	let clusters = seenStore.findClusters({ canHitGround: false, isAllied: false, canHitAir: true, }, 3, MAX_AA_DIST)
		.sort((a, b) => a.members.length - b.members.length )
		.filter((obj) => (obj.lastSeen > gameTime - TEN_MINUTE));

	let chance = 100;
	if (clusters.length > 3) { chance = 25; }
	else if (clusters.length === 3) { chance = 33; }
	else if (clusters.length === 2) { chance = 50; }
	for (let cluster of clusters)
	{
		if (Math.random() * 100 < chance)
		{
			if (vtols.length > cluster.members.length*3)
			{
				for (let vtol of vtols)
				{
					if (vtolReady(vtol))
					{
						orderDroidLoc(vtol, DORDER_CIRCLE, BASE.x, BASE.y);
						logFile(vtol, "vtols ordered to CIRCLE at base for alphastrike at: "+cluster.centroid.x+"x"+cluster.centroid.y);
					}
				}
				vtolAlphaStrikeLoc = cluster.centroid;
				queue(orderVtolAlphaStrike, VTOL_DEFEND_TIME*2);
			}
			return; // only check one
		}
	}
}

function orderVtolAlphaStrike()
{
	if (!vtolAlphaStrikeLoc || !vtolAlphaStrikeLoc.x) logFile("ERROR orderVtolAlphaStrike no location");
	let vtols = enumGroup(vtolGroup);
	for (let vtol of vtols) {
		if (vtolReady(vtol)) {
			orderDroidLoc(vtol, DORDER_CIRCLE, vtolAlphaStrikeLoc.x, vtolAlphaStrikeLoc.y);
			logFile(vtol, "vtols ordered to alphastrike AA cluster: "+vtolAlphaStrikeLoc.x+"x"+vtolAlphaStrikeLoc.y);
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
			logFile("possible pileup detected stopping: " + dr.id);
		}

	// check for repair droid clusters
	clusters = seenStore.findClusters({ player: me, type: DROID, droidType: DROID_REPAIR }, 8, 5); // min, radius
	for (let cluster of clusters)
		for (let dr of cluster.members)
		{
			orderDroid(dr, DORDER_STOP);
			logFile("possible repair pileup detected stopping: " + dr.id);
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

	// scavenger objects
	if (startedWithScavs) {
		objects.push(enumStruct(me, scavengerPlayer));
		objects.push(enumDroid(me, scavengerPlayer));
	}

	// add seen oil resources
    objects = objects.concat(enumFeature(me, OIL_RES_STAT));   // must be _STAT for enumFeature

    // Process each object once with optimized checks
	for (let obj of objects) {
		if (obj.id !== undefined && isInMapBounds(obj)) {

			let isAllied = false;
			if (obj.type === FEATURE || obj.player === FEATURE_PLAYER_IDX) { // feature player index
				seenStore.addObject(obj.id, { ...obj, lastSeen: gameTime });
				continue;
			} else if (allianceExistsBetween(me, obj.player)) {
				isAllied = true;
			}
			let isAA = obj.canHitAir === true && obj.canHitGround === false;
			let isCombat = obj.droidType === DROID_WEAPON ||
						obj.droidType === DROID_CYBORG ||
						obj.droidType === DROID_COMMAND ||
						obj.droidType === DROID_SENSOR ||
						obj.stattype === DEFENSE;

			// Directly add the object without cloning if not needed
			seenStore.addObject(obj.id, { ...obj, isAllied, isAA, isCombat, lastSeen: gameTime });

			if (isAA && !isAllied) {
				AAseenStore.addObject(obj.id, { ...obj, isAllied, isAA, isCombat, lastSeen: gameTime });
			}
		}
	}
	pruneSeenStore();
}

function pruneSeenStore()
{
    // Expire AAthreats based on type and age
    for (let obj of AAseenStore.query({})) {
        if ((obj.type === STRUCTURE && obj.lastSeen < gameTime - TEN_MINUTE*2) ||
            (obj.type === DROID && obj.lastSeen < gameTime - TWO_MINUTE)) {
            AAseenStore.deleteKey(obj.id);
        }
    }

    // Remove structures that have been destroyed while unseen
    const seenNow = new Map();
	// player structures
    let pidx = 0;
    for (let player of playerData) {
        for (let type of STRUCTURE_TYPES) {
            enumStruct(pidx, type, me).forEach(obj => obj.id && seenNow.set(obj.id, true));
        }
        pidx++;
    }
	// scavenger structures
	if (startedWithScavs) {
		for (let type of STRUCTURE_TYPES) {
			enumStruct(me, type, scavengerPlayer).forEach(obj => obj.id && seenNow.set(obj.id, true));
		}
	}
	// remove missing structures
    for (let obj of seenStore.query({ type: STRUCTURE })) {
        if (obj.id && !seenNow.has(obj.id)) {
            seenStore.deleteKey(obj.id);
            AAseenStore.deleteKey(obj.id);
        }
    }
    // now remove oil resources
    seenNow.clear();
    enumFeature(me, OIL_RES_STAT).forEach(obj => obj.id && seenNow.set(obj.id, true)); // must be _STAT for enumFeature
    for (let obj of seenStore.query({ type: FEATURE, stattype: OIL_RESOURCE})) {
        if (obj.id && !seenNow.has(obj.id)) {
            seenStore.deleteKey(obj.id);
        }
    }
}

function recycleDroidsForHover()
{
	// don't recycle if not hover not required to reach oil
	if (!isHoverMap() && !oilResourceStore.query({ requiresHover: true }).length) return removeTimer("recycleDroidsForHover");
	// not ready to recycle
	if (!componentAvailable(PROP_HOVER) || !countStruct(FACTORY_STAT)) return;

	let systems = enumGroup(oilBuilders).filter((dr) => (dr.propulsion !== PROP_HOVER));
	let tanks = enumGroup(attackGroup).filter((dr) => (dr.droidType === DROID_WEAPON && dr.propulsion !== PROP_HOVER));
	if (!tanks.length && !systems.length) {
		removeTimer("recycleDroidsForHover");
		logFile("removeTimer recycleDroidsForHover");
	}

	tanks = tanks.filter((dr) => (dr.action !== DACTION_ATTACK));
	systems = systems.filter((dr) => (dr.action === 0));

	if (countStruct(FACTORY_STAT)) {
		recycleDroids(systems);
		if (isHoverMap() && componentAvailable(PROP_VTOL)) {
			recycleDroids(tanks);
		}
	}
}

function checkOrderLocations() { queue("checkOrderLocationsQ"); }
function checkOrderLocationsQ()
{
    const EXPIRATION_TIME_MS = FOUR_MINUTE; // four minutes

    // Single pass: update orderLocations with threat info and check for expiration
    orderLocations.forEach(({ x, y, enemies: oldEnemies, lastUpdated }, key) => {
        if (x === undefined || y === undefined) return;

        // Check if the record has expired based on `lastUpdated` timestamp
        const currentTime = gameTime;
        const ageInMs = currentTime - lastUpdated;
        if (ageInMs > EXPIRATION_TIME_MS) {
            logFile(`checkOrderLocations expired entry at (${x}, ${y})`);
            orderLocations.delete(key);
            return; // Skip further processing for this expired record
        }

        // Check for current enemies
		let enemies = enumRange(x, y, GROUP_SCAN_RADIUS*1.2, ENEMIES, true).filter(obj =>
			obj.isVTOL === false &&
			obj.player !== scavengerPlayer &&
			!(obj.canHitAir === true && obj.canHitGround === false) && // not AA
			(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.droidType === DROID_REPAIR || obj.stattype === DEFENSE)
		);
		if (!enemies || !enemies.length) {
			 enemies = seenStore.findNear({ x, y }, GROUP_SCAN_RADIUS, { isAllied: false, isCombat: true })
						.filter(obj => obj.lastSeen > currentTime - ONE_MINUTE);
		}

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

    logFile(`Current orderLocations size: ${orderLocations.size}`);
}

function updateMapTilesFeatures() { queue("updateMapTilesFeaturesQ"); }
function updateMapTilesFeaturesQ()
{
	MapTilesFeatures = loadFeaturesIntoTiles(enumFeature(ALL_PLAYERS).filter((obj) => (obj.stattype !== OIL_DRUM && obj.stattype !== ARTIFACT)), MapTiles);
}

function checkUnreachableOils() { queue("checkUnreachableOilsQ"); }
function checkUnreachableOilsQ()
{
	let reachableWithDestruction = oilResourceStore.query({ type: FEATURE, stattype: OIL_RESOURCE, isReachable: true, requiresDestruction: true });

	// check for oils now reachable
	for (let oil of reachableWithDestruction) {
		if (!oil || !oil.id) continue;
		let pathWithoutDestruction = findShortestPath(oil, BASE, PROP_HOVER, false); // oils are impassable so swap start and dest

		if (!pathWithoutDestruction) continue;
		oilResourceStore.deleteKey(oil.id);
		oilResourceStore.addObject(oil.id, { ...oil, isReachable: true, requiresDestruction: false});
	}

	// check for oils in seenstore missing from oilstore
	const seenOils = seenStore.query({ type: FEATURE, stattype: OIL_RESOURCE });
	for (let seenOil of seenOils) {
		if (!seenOil || !seenOil.id) continue;
		let oilQuery = oilResourceStore.query({ x: seenOil.x, y: seenOil.y });
		if (!oilQuery || !oilQuery.length) {
			logFile(seenOil, "checkUnreachableOils found new free oil resource")
			checkOilsReachableQ([seenOil]); // must be array and Q
		}
	}
}
