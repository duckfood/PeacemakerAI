function droidAwareAttacker() { queue("droidAwareAttackerQ"); }
function droidAwareAttackerQ()
{
	let droidAware = enumGroup(attackGroup).concat(enumGroup(defendGroup)).concat(enumGroup(oilAttackers));
	for (let dr of droidAware)
	{
		if (!dr || !dr.id) continue;
		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) continue;

		// very damaged attackers retreat to repair fac or base
		if (dr.health < 40)
		{
			if (countStruct(REPAIR_FACILITY_STAT)){
				orderDroid(dr, DORDER_RTR);
				logObj(dr, "droidAwareAttacker very damaged attacker ordered to RTR");
				continue;
			} else {
				orderDroid(dr, DORDER_RTB);
				logObj(dr, "droidAwareAttacker very damaged attacker ordered to RTB");
				continue;
			}
		}
		// less damaged attackers move to nearest repair droid
		if (dr.health < 80)
		{
			let repairs = sortByDistToLoc(dr, enumGroup(repairGroup));
			if (repairs && repairs[0] && repairs[0].id) {
				orderDroidLoc(dr, DORDER_MOVE, repairs[0].x, repairs[0].y);
				logObj(dr, "droidAwareAttacker damaged droid moving to repair: "+repairs[0].id);
			}
		}

		// handle droids on firesupport
		if (dr.hasIndirect === true && dr.order === DORDER_FIRESUPPORT && dr.weapons[0].armed === 100) {
			// remove from firesupport
			idleAttacker(dr);
			continue;
		}

		// stop scouting droids from returning to position
		if (dr.order === DORDER_SCOUT && dr.action === DACTION_RETURNTOPOS)
		{
			idleAttacker(dr);
			continue;
		}
		// catch attack droids that have fallen idle while guarding
		if (dr.order === DORDER_GUARD && dr.action === DACTION_NONE)
		{
			idleAttacker(dr);
			continue;
		}
		// check for damaged droids stuck on scout 
		if ((dr.health < 75) && (dr.order === DORDER_SCOUT || dr.order === DORDER_ATTACK))
		{ 
			droidNeedsRepair(dr.id);
			continue;
		}
		// move to a nearby non burning location
		moveFromBurningTile(dr);

		if (dr.action !== DACTION_ATTACK && Math.random() * 100 < 6 && collectArtifacts(dr)) continue;
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
            logObj(dr, "damaged sensor ordered to RTR");
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
					logObj(dr, "moving to escort: "+escort.id);
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
                    logObj(artillery, "assigned to sensor: "+dr.id);

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
				logObj(dr, "scouting to escort: "+escort.id);
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
				logObj(dr, "scouting to escort: "+escort.id);
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
			logObj(dr, "damaged AA ordered to RTR");
			continue;
		}

		let new_escort = findMostExpDroid();
		if (dr.order === 25 && distBetweenTwoPoints(dr.x, dr.y, new_escort.x, new_escort.y) > 6) {
			if (new_escort && new_escort.id){
				orderDroidLoc(dr, DORDER_SCOUT, new_escort.x, new_escort.y);
				logObj(dr, "AA ordered to return to escort: "+new_escort.id);
			}
		}

		// escort the most exp attack droid
		if (Math.random() * 100 > 89){

			if (new_escort && new_escort.id){
				orderDroidObj(dr, 25, new_escort);
				logObj(dr, "AA ordered to escort: "+new_escort.id);
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
			logObj(dr, "droidAware found scouting vtol in need of repair:");
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
					logObj(dr, "droidAware scouting mass of vtol ordered to attack AA");

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
								logObj(vt, "droidAware vtol called in for AA support");
							}
						}
					}
					continue;
				}

				// otherwise retreat
				orderDroid(dr, DORDER_RTB);
				logObj(dr, "droidAware scouting vtol spotted mass AA:"+threats.length);
				continue;
			}
			else if (groupSize(vtolGroup) > MIN_VTOL_UNITS * 2 && threats && threats.length > 0 && dr.weapons[0].armed > 0 && dr.health > 65)
			{
				let threats_aa = getAAthreats(threats[0]);
				if (threats_aa && threats_aa.length < 2)
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
		// make sure vtol on scout does not go home with ammo if it sees enemies or there is a derrick to blast
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
			if (Math.random() * 100 > 85) { // remove some from circle
				let target = getVTOLtarget(dr);
				if (target && dr.health === 100 && dr.weapons[0].armed === 100 && target.x && target.y)
				{
					orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
					logObj(dr, "droidAware circling vtol ordered to scout to target:"+target.x+"x"+target.y);
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
function droidAwareTruckQ() {

    // 1. Initialization and Droid Enumeration
    const droidAware = enumDroid(me, DROID_CONSTRUCT);
    for (const dr of droidAware) {
        if (!dr || !dr.id) continue;

        // Skip droids already ordered to return or take specific retreat orders.
        if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) continue;

        // 2. Check burning tiles
        if (moveFromBurningTile(dr)) continue;

        // 3. Oil Builder Logic: Hostile Evasion
        if (dr.group === oilBuilders && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS / 4) {
            if (fleeFromHostiles(dr)) continue;
        }

        // 4. Core Oil Builder Logic (Resource Scanning and Assignment)
        if (dr.group === oilBuilders && (dr.order === DORDER_MOVE || dr.order === DORDER_SCOUT)) {

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
                    logObj(dr, "droidAware truck building on adjacent oil");
                    orderLocations.set(dr.id, { x: nearestOil.x, y: nearestOil.y, enemies: false });
                    // Update assignments for this immediate build
                    oilAssignments.set(nearestOil.id, gameTime);
                    oilAssignments.set(dr.id, nearestOil.id);
                    continue;
                }
            }

            // 4b. Scan for the Best Site (Deeper Search)
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
            if (suitableSite && suitableSite.x !== undefined && suitableSite.y !== undefined) {
                // Clear old assignments (if applicable)
                if (oilAssignments.has(dr.id)) {
                    oilAssignments.delete(dr.id);
                }

                orderDroidBuild(dr, DORDER_BUILD, DERRICK_STAT, suitableSite.x, suitableSite.y);
                logObj(dr, "droidAware truck found free oil feature on way to build something");
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

        if (wells.length > 0) {
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
                        let defenseSchema = firstAvailableStructure(Schemes[Scheme].STANDARD_DEFENSES);
                        let buildLocation = false;

                        if (defenseSchema) {
                            buildLocation = pickStructLocation(dr, defenseSchema, primaryWell.x, primaryWell.y, 1);
                        }

                        if (buildLocation) {
                            orderDroidBuild(dr, DORDER_BUILD, defenseSchema, buildLocation.x, buildLocation.y);
                            logObj(dr, "droidAware truck found oil to liberate");
                            orderLocations.set(dr.id, { x: primaryWell.x, y: primaryWell.y, enemies: false });
                            continue;
                        }
                    }
                }
            }
        }

        // 6. Artifact Collection Check
        if (dr.group === oilBuilders && (dr.order === DORDER_MOVE || dr.order === DORDER_SCOUT)) {
            if (collectArtifacts(dr)) continue;
        }

        // 7. Scout Location Management (Enemy Detection)
        // Check if the droid is actively scouting and if the location is hostile.
        if (orderLocations.has(dr.id) && dr.order !== 0 && dr.order === DORDER_SCOUT) {
            const scoutLoc = orderLocations.get(dr.id);

            // Ensure coordinates are valid before checking
            if (scoutLoc && scoutLoc.x !== undefined && scoutLoc.y !== undefined) {
                const enemies = getHostilesNear(scoutLoc, GROUP_SCAN_RADIUS).filter(
                    (obj) => (obj.isAA === false)
                );

                // If more than one hostile combat unit is present, order withdrawal.
                if (enemies.length > 1) {
                    orderDroid(dr, DORDER_RTB);
                    logObj(dr, "scouting constructor ordered to RTB as scout location has more than one enemy");
                    orderTargets.delete(dr.id);
                    orderLocations.delete(dr.id);
                    continue;
                }
            }
        }

        // 8. Idle/Default Behavior Trigger
        if (dr.order === 0 || dr.order === 25) {
            idleConstructor(dr);
            continue;
        }
    }
}

function droidAwareObstacles() { queue("droidAwareObstaclesQ"); }
let lastDemoOrderTime = 0;
const STAGNATION_THRESHOLD = ONE_MINUTE/2;
function droidAwareObstaclesQ() {

    // 1. Setup & Droid Selection
    let droids = enumGroup(demolishGroup);
    if (!droids || !droids.length) {
        const weakestDroids = getStrongestAttackDroids().reverse();
        if (weakestDroids && weakestDroids.length && weakestDroids[0].id) {
            groupAdd(demolishGroup, weakestDroids[0]);
            logObj(weakestDroids[0], "added to demolishGroup");
        } else { return; }
    }
    const dr = droids[0];
    if (!dr || !dr.id) return;

    // 2. Vital Maintenance (Health & Retreat)
    if (dr.health < 75 && dr.order !== DORDER_RTB && dr.order !== DORDER_RTR) {
		if (countStruct(REPAIR_FACILITY_STAT)){
			orderDroid(dr, DORDER_RTR);
			logObj(dr, "droidAwareObstacles damaged RTR");
			return;
		} else {
			orderDroid(dr, DORDER_RTB);
			logObj(dr, "droidAwareObstacles damaged RTB");
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
        logObj(dr, "Demolition Stagnation Detected! Attempting to reposition...");
        orderDroidLoc(dr, DORDER_MOVE, dr.x + randomBetween(-3, 3), dr.y + randomBetween(-3, 3));
        lastDemoOrderTime = gameTime;
		return;
    }

    // 5. Avoid Interrupting Active Tasks (unless we are the ones forcing a reposition)
    const isBusy = (dr.order === DORDER_SCOUT || dr.order === DORDER_ATTACK ||
                    dr.order === DORDER_RTR || dr.order === DORDER_RECOVER) && dr.action !== 0;
    if (isBusy && !isStagnant) return;

    // 6. Task: Artifact Collection
    if (collectArtifacts(dr)) return;

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
	// check attackers and defenders for retreat
	let droidAware = enumGroup(attackGroup).concat(enumGroup(defendGroup));
	for (const dr of droidAware) {
		if (!dr || !dr.id) continue;
		const retreat = shouldWeRetreat(dr);
		if (retreat && retreat.seenAllyGroup && retreat.seenAllyGroup.length) {
			for (const ally of retreat.seenAllyGroup.filter((obj) => (obj.player === me)) ) {
				if (ally.id && ally.type === DROID && ally.player === me && distBetweenTwoPoints(ally.x, ally.y, BASE.x, BASE.y) > AVG_BASE_RADIUS) {
					if (ally.type === DROID_REPAIR) {
						orderDroidLoc(ally, DORDER_SCOUT, BASE.x, BASE.y);
						logObj(ally, "droidAwareRetreat retreating scout to base");
					} else {
						orderDroid(ally, DORDER_RTB);
						logObj(ally, "droidAwareRetreat retreating from hostile group");
					}
					groupAdd(retreatGroup, ally);
					orderTargets.delete(ally.id);
					orderLocations.delete(ally.id);
				}
			}
		}
	}

	// check if retreatGroup should return to front line
	droidAware = enumGroup(retreatGroup);
	for (const dr of droidAware) {
		if (!dr || !dr.id) continue;
		// if hostiles still visible keep retreating
		const seenEnemyGroup = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*1.5, ENEMIES, true).filter(obj =>
			obj.isVTOL === false &&
			obj.player !== scavengerPlayer &&
			!(obj.canHitAir === true && obj.canHitGround === false) && // not AA
			(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.droidType === DROID_REPAIR || obj.stattype === DEFENSE)
		);
		if (!seenEnemyGroup || !seenEnemyGroup.length || !seenEnemyGroup[0].id) {
			// no hostiles seen return to front line
			const retreat = shouldWeRetreat(dr); // returns false or retreat object
			if (!retreat) {
				if (dr.droidType === DROID_REPAIR) {
					groupAdd(repairGroup, dr);
					logObj(dr, "droidAwareRetreat repairing");
					idleRepair(dr);
				} else if (dr.canHitAir && !dr.canHitGround) { // AA
					groupAdd(aaGroup, dr);
					orderDroid(dr, DORDER_STOP);
					logObj(dr, "droidAwareRetreat new escort");
				} else if (dr.droidType === DROID_SENSOR) {
					groupAdd(sensorGroup, dr);
					orderDroid(dr, DORDER_STOP);
					logObj(dr, "droidAwareRetreat new escort");
				} else {
					groupAdd(attackGroup, dr);
					logObj(dr, "droidAwareRetreat new target");
					idleAttacker(dr);
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
		if (!dr || !dr.id) continue;

		// send retreating vtols on random attack missions
		if (dr.order === DORDER_RTB && dr.isVTOL === true && dr.health > 90 && dr.weapons[0].armed > 80)
		{
			// select random enemy target and attack
			let target = getVTOLtarget(dr, random);
			if (target && target.id)
			{
				orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
				logObj(dr, "droidAware RTB vtol scouting to:"+target.x+"x"+target.y);
			}
		}

		// check for healthy RTR droid returning for repair
		if (dr.health > 90 && dr.order === DORDER_RTR)
		{
			orderDroid(dr, DORDER_STOP);
			logObj(dr, "droidAwareRTB found healthy RTR");
			continue;
		}

		// check if RTB droid is very near base
		if (dr.order === DORDER_RTB && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) < 8)
		{
			orderDroid(dr, DORDER_STOP);
			logObj(dr, "droidAware found RTB very close to base");
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
					logObj(dr, "base defend RTB droid switched to scout:"+dr.id);
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
				logObj(dr, "droidAware RTB but base and nearby area is safe");
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
		log("baseAware hq spotted mass of enemy attackers:"+enemies.length);
		baseUnderAttack = 4;
	}
	else if (enemies.length > 5)
	{
		log("baseAware hq spotted many enemy attackers:"+enemies.length);
		baseUnderAttack = 3
	}
	else if (enemies.length > 2)
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
				if (dr.droidType === DROID_REPAIR)
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
	//log("seenStore: "+JNstr(seenStore.query({})));
	if (isAirMap) relyOnVtols = true;

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
	// setup oilAttackers with artillery
	if (groupSize(oilAttackers) < 1) {
		let artillery = getStrongestAttackDroids().filter((obj) => (obj.hasIndirect === true)).reverse();
		if (artillery && artillery.length) {
			let arti = returnRandInFirstFew(artillery, 2);
			groupAdd(oilAttackers, arti);
			logObj(arti, "added to oilAttackers");
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
					log("moved droid to defendGroup "+dr.id+" size:"+groupSize(defendGroup));
				}
			}
		}
	}

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
	// recycle vtols if experienced cobra or bug and pulse laser is available
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

    objects = objects.concat(enumFeature(me, OIL_RESOURCE)); // add seen oil resources

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
        if ((obj.type === STRUCTURE && obj.lastSeen < gameTime - TEN_MINUTE*2) ||
            (obj.type === DROID && obj.lastSeen < gameTime - TWO_MINUTE)) {
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
    // now remove oil resources
    seenNow.clear();
    enumFeature(me, OIL_RESOURCE).forEach(obj => obj.id && seenNow.set(obj.id, true));
    for (let obj of seenStore.query({ type: FEATURE, stattype: OIL_RESOURCE})) {
        if (obj.id && !seenNow.has(obj.id)) {
            seenStore.deleteKey(obj.id);
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
    const EXPIRATION_TIME_MS = FOUR_MINUTE; // four minutes

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
            .filter(obj => obj.lastSeen > currentTime - ONE_MINUTE); // Adjust the filter condition if needed

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

function updateMapTilesFeatures() { queue("updateMapTilesFeaturesQ"); }
function updateMapTilesFeaturesQ() {
	MapTilesFeatures = loadFeaturesIntoTiles(enumFeature(ALL_PLAYERS).filter((obj) => (obj.stattype !== OIL_DRUM && obj.stattype !== ARTIFACT)), MapTiles);
}

function checkUnreachableOils() { queue("checkUnreachableOilsQ"); }
function checkUnreachableOilsQ() {
	let reachableWithDestruction = oilResourceStore.query({ type: FEATURE, stattype: OIL_RESOURCE, isReachable: true, requiresDestruction: true });
	if (!reachableWithDestruction || !reachableWithDestruction.length) {
		removeTimer("checkUnreachableOils");
		return;
	}

	for (let oil of reachableWithDestruction) {
		let pathWithoutDestruction = findShortestPath(oil, BASE, PROP_HOVER, false);

		if (!pathWithoutDestruction) continue;
		oilResourceStore.deleteKey(oil.id);
		oilResourceStore.addObject(oil.id, { ...oil, isReachable: true, requiresDestruction: false});
	}
}

function adjustSchemeAndStance()
{
	// evaluate hostile forces and choose scheme
	let hostileCyborg = seenStore.query({ isAllied: false, droidType: DROID_CYBORG }).concat(seenStore.query({ isAllied: false, droidType: DROID_PERSON }));
	let hostileTanks = seenStore.query({ isAllied: false, droidType: DROID_WEAPON, isVTOL: false });
	let SCHEME_THRESHOLD = 1.25; // twenty five percent

	// don't adjust too early if ultimate scavs
	if (isUltimateScavs && gameTime < TEN_MINUTE) return;

	// choose anti-tank or anti-cyborg, but not if started with Bunker Buster
	if (!startedWithBB && hostileCyborg.length + hostileTanks.length > 25 && !componentAvailable("Laser3BEAMMk1")) { // if already at flashlight don't switch

		if (hostileCyborg.length * SCHEME_THRESHOLD > hostileTanks.length && Scheme !== "MGLAS") {
			Scheme = "MGLAS";
			log("switching scheme to MGLAS");
		}
		if (hostileCyborg.length < hostileTanks.length * SCHEME_THRESHOLD && Scheme !== "CNLAS") {
			Scheme = "CNLAS";
			log("switching scheme to CNLAS");
		}
	}
}

//let transporterSites = new Map();
function claimOilWithTransport()
{
	// retreat transport if damaged
	let transports = enumDroid(me, DROID_TRANSPORTER);
	for (let tr of transports) {
		if (tr.health < 70 && tr.order !== DORDER_REARM) {
			orderDroid(tr, DORDER_REARM);
			logObj(tr, "transporter ordered to rearm");
		}
	}
	let transport = transports[0];
	// retreat if AA
	let hostileNearbyAA = AAseenStore.findNear();

	// pick another oil if combat units present at site


	// get unreachable oils
	let notmyoils = new Map();
	for (oil of oilResourceStore.query({ isReachable: false })) {
		notmyoils.set(`${oil.x},${oil.y}`, oil);
	}
	// filter out owned oils by x,y
	let ownedOils = seenStore.query({ player:me, type: STRUCTURE, stattype: RESOURCE_EXTRACTOR });
	for (let oil of ownedOils) {
		if (notmyoils.has(`${oil.x},${oil.y}`)) notmyoils.delete(`${oil.x},${oil.y}`);
	}
	// convert Map to array
	let oils = [...notmyoils].map((e) => e);

	// if enough unowned transporter only oils
	if (oils.length > 4)  {
		// if no transporter build one if enough combat vtols
		if (!transports || !transports.length) {
			if (groupSize(vtolGroup) > MIN_VTOL_UNITS * 3) {
				let facs = enumStruct(me, VTOL_FACTORY);
				// check production for transports
				let vt = 0;
				for (let fac of facs)
				{
					let vdr = getDroidProduction(fac);
					if (vdr && vdr.droidType === DROID_TRANSPORTER) ++vt;
				}
				// build one transport
				if (vt < 1) return buildTransport(fac);
				return;
			} else { return; }
		}

		// enum transport group cyborg trucks
		let trucks = enumGroup(transportGroup);
		if (!trucks || !trucks.length) {
			// if cyborg truck is available reassign
			// if no truck build a cyborg truck unless already producing one
			// if no cyborg fac build one
			// if no truck yet return
		}

		// sort oils by dist to transporter
		oils = sortByDistToLoc(transporter, oils);

		// if transporter has no truck find one to load up
			// move transporter to cyborg truck if no hostile combat units
			// load cyborg truck
		// move transporter to closest oil if no hostile combat units
		// unload cyborg truck
		// build until no oil can be reached
		// consider building 1 AA per 2 oil if airmap
		// if transport reachable by truck load up or call transport

	}
}

