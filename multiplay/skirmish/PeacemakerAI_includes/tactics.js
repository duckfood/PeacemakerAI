function droidNeedsRepair(droidID, percent = null)
{
	if (DEBUGEX) logFile("droidNeedsRepair");
	const dr = getObject(DROID, me, droidID);
	if (!dr || dr.id === undefined)
	{
		logTrace("WARNING droidNeedsRepair no dr");
		return false; // dead?
	}

	// if already going for repairs or retreating return true
	if (dr.order === DORDER_RTR || dr.order === DORDER_RTB || dr.order === DORDER_REARM) return true;

	if (!percent)
	{
		if (dr.propulsion === PROP_HOVER) { percent = 65; }
		else if (dr.propulsion === PROP_CYBORG) { percent = 85; }
		else if (dr.propulsion === PROP_VTOL) { percent = 80; }
		else if (dr.propulsion === PROP_WHEEL) { percent = 75; }
		else { percent = 60; }
	}

	// if damaged and already guarding a valid repair truck return true
	if (dr.health <= percent && orderTargets.has(dr.id))
	{
		let guarding = getObject(DROID, me, orderTargets.get(dr.id));
		if (guarding && guarding.droidType === DROID_REPAIR)
		{
			return true;
		}
	}

	if (dr.health <= percent)
	{
		let repair_droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, me, true).filter((obj) => (obj.droidType === DROID_REPAIR));
		let repair_facs = enumStruct(me, REPAIR_FACILITY_STAT);
		if (!repair_droids[0]) { repair_droids = enumDroid(me, DROID_REPAIR); }

		if (dr.droidType !== DROID_CONSTRUCT && dr.droidType !== DROID_REPAIR && dr.isVTOL === false)
		{
			if (repair_droids[0] && !isComponentProducible(BODY_DRAGON))
			{
				orderDroidObj(dr, 25, returnRandInFirstFew(repair_droids));
				logFile("damaged droid ordered to guard random nearby repair:"+dr.id);
			}
			else if ( (repair_facs && repair_facs.length > 0) || (repair_droids && repair_droids.length > 0) )
			{
				orderDroid(dr, DORDER_RTR);
				logFile("damaged droid ordered to RTR:"+dr.id);
			}
			else // no repairs available
			{
				orderDroid(dr, DORDER_RTB);
				logFile("damaged droid ordered to RTB:"+dr.id);
			}
		}
		else if (dr.droidType === DROID_REPAIR && dr.order !== DORDER_RTR)
		{
			orderDroid(dr, DORDER_RTR);
			logFile("damaged repair ordered to RTR:"+dr.id);
		}
		else if (dr.droidType === DROID_CONSTRUCT && dr.order !== DORDER_RTR)
		{
			orderDroid(dr, DORDER_RTR);
			logFile("damaged constructor ordered to RTR:"+dr.id);
		}
		else if (dr.isVTOL && dr.order !== DORDER_REARM && enumStruct(me, VTOL_PAD_STAT).length > 0)
		{
			orderDroid(dr, DORDER_REARM);
			logFile("damaged vtol ordered to REARM:"+dr.id);
		}
		return true;
	}
	return false;
}

function vtolReady(dr)
{
	return (dr.weapons[0].armed === 100 && dr.health === 100);
}

function recycleDroids(droids)
{
	if (!droids || !droids.length) return false;
	for (let dr of droids) {
		logFile(dr, "recycle droid");
		orderDroid(dr, DORDER_RECYCLE);
	}
}

function getRandomScoutLoc(dr)
{
	if (DEBUGEX) logFile("getRandomScoutLoc");
	if (!dr) return false;
	let count = 0;
	while (count < 250)
	{
		count++;
		let ranx = random(mapWidth-1);
		let rany = random(mapHeight-1);
		if (dr.isVTOL)
		{
			let t_aa = getAAthreats({ x: ranx, y:rany });
			if (t_aa && t_aa.length > 2)
			{
				logFile("returnTarget "+t_aa.length+" AA near random target - next target");
				continue;
			}
			else
			{
				return ({x: ranx, y: rany});
			}
		}
		else
		{
			if (dr && dr.id && seenStore.hasKey(dr.id) && droidCanReach(dr, ranx, rany)) return ({x: ranx, y: rany});
		}
	}
	return false;
}

function getNotMyOil(oils=oilResourceStore.query({ isReachable: true, requiresDestruction: false }))
{
	if (DEBUGEX) logFile("getNotMyOil");
	if (!oils || !oils.length) {
		//logFile("WARNING no oil resources");
		return false;
	}
	const alliedObjects = new Set();

	// precompute allied derricks
	for (const obj of seenStore.query({ isAllied: true, type: STRUCTURE, stattype: RESOURCE_EXTRACTOR})) {
		alliedObjects.add(`${obj.x},${obj.y}`);
	}
	// filter unowned
	const unalliedOilResources = oils.filter(obj => {
		const positionKey = `${obj.x},${obj.y}`;
		const hasAllied = alliedObjects.has(positionKey);
		return !hasAllied;
	});
	return unalliedOilResources;
}

function returnTarget(dr, randomtarget=false, droidAge=TWO_MINUTE, structAge=TEN_MINUTE)
{
	if (DEBUGEX) logFile("returnTarget");
	if (!dr || !dr.id || !isInMapBounds(dr)) return false;
	let targets = [];

	// send vtols lightly defended lassat targets
	if (dr.isVTOL) {
		targets = seenStore.query({ isAllied: false, type: STRUCTURE, stattype: LASSAT }).filter((obj) => (obj.lastSeen > gameTime - TEN_MINUTE*2));
		if (targets && targets.length)
		{
			for (let lassat of targets)
			{
				if (!isInMapBounds(lassat)) continue;
				let target_AA = getAAthreats(lassat);
				if (!target_AA || target_AA.length < 2) {
					logFile(dr, "getVTOLtarget returning lassat target");
					return lassat;
				}
			}
		}
		// send vtols to attack oil if there's any to take and not maxed out on power plants
		if (isStructureBuildable(POW_GEN_STAT)) {
			let notmyoils = sortByDistToLoc(dr, getNotMyOil());
			if (notmyoils && notmyoils.length) {
				let notmyoil = returnRandInFirstFew(notmyoils, 4); // test one random nearby oil
				if (notmyoil && notmyoil.id && distBetweenTwoPoints(BASE.x, BASE.y, notmyoil.x, notmyoil.y) > GROUP_SCAN_RADIUS*2) {
					if (distBetweenTwoPoints(dr.x, dr.y, notmyoil.x, notmyoil.y) > GROUP_SCAN_RADIUS ) {
						let oilaa = getAAthreats(notmyoil);
						if (!oilaa || !oilaa.length) return notmyoil;
					}
				}
			}
		}
		// vtols attack hostiles
	}

	targets = seenStore.query({ isAllied: false, type: DROID, isVTOL: false }).filter((obj) => (obj.lastSeen > gameTime - droidAge));
	targets = targets.concat(seenStore.query({ isAllied: false, type: STRUCTURE}).filter((obj) => (obj.lastSeen > gameTime - structAge)));
	if (isStructureBuildable(POW_GEN_STAT)) targets = targets.concat(getNotMyOil());

	// if no targets return a random location
	if (!targets.length || !targets[0].id) return getRandomScoutLoc(dr);

	// handle lassat
	if (dr.type === STRUCTURE && dr.stattype === LASSAT) {
		targets = targets.sort((a, b) => b.cost - a.cost); // decending
		// if one of the first few are a lassat return it
		for (let i = 0; i < 3; i++)
		{
			if (!targets[i] || !targets[i].id) continue;
			if (targets[i].type === STRUCTURE && targets[i].stattype === LASSAT) return targets[i];

		}
		// otherwise return one of the most expensive targets
		return returnRandInFirstFew(targets, 3);
	}

	if (randomtarget === true) { targets = shuffleArray(targets); }
	else { targets = sortByDistToLoc(dr, targets); }

	let target = {};
	for (let t of targets) {
		if (!isInMapBounds(t)) continue;
		// skip dead targets but don't check oils
		if (!(t.type === FEATURE && t.stattype === OIL_RESOURCE)) {
			let tObj = getObject(t.type, t.player, t.id);
			if (!tObj) continue;
		}

		// if aleady at target skip
		if (distBetweenTwoPoints(dr.x, dr.y, t.x, t.y) < GROUP_SCAN_RADIUS) continue;

		if (droidCanReach(dr, t.x, t.y)) {
			// choose a random target in the nearist few
			let chance = 100;
			if (targets.length > 3) { chance = 20; }
			else if (targets.length === 3) { chance = 33; }
			else if (targets.length === 2) { chance = 50; }
			if (random(100) <= chance) {
				// if vtol check aa
				if (dr.isVTOL === true) {
					let t_aa = getAAthreats(t);
					if (t_aa && t_aa.length > 1) {
						logFile("returnTarget "+t_aa.length+" AA near target - next target");
						continue;
					}
				}

				// return this target
				target = t;
				break;
			}
		}
	}
	if (!target || !isInMapBounds(target)) return getRandomScoutLoc(dr);
	return target;
}

function getHostilesNear(loc, range=GROUP_SCAN_RADIUS)
{
	if (DEBUGEX) logFile("getHostilesNear");
	if (!loc || !isInMapBounds(loc)) return false;
	const buildingAge = TEN_MINUTE;
	const droidAge = ONE_MINUTE;

	let hostiles = seenStore.findNear(loc, range, { isAllied: false, type: DROID, isVTOL: false, isCombat: true })
		.filter((obj) => (obj.lastSeen > gameTime - droidAge) );
	hostiles = hostiles.concat(seenStore.findNear(loc, range, { isAllied: false, type: STRUCTURE, isCombat: true })
		.filter((obj) => (obj.status === BUILT && obj.lastSeen > gameTime - buildingAge)) );
	return hostiles;
}

//// refined version
function getVTOLtarget(vtol, randomize = false) {
	if (DEBUGEX) logFile("getVTOLtarget");
    if (!vtol || !vtol.isVTOL || !vtol.id || !isInMapBounds(vtol)) {
        logFile("WARNING getVTOLtarget passed invalid vtol: " + JNstr(vtol));
        return;
    }

    let seenEnemies = enumRange(vtol.x, vtol.y, GROUP_SCAN_RADIUS * 3, ENEMIES, true);
    let AAthreats = getAAthreats(vtol);

    // Target AA if not too many
    if (AAthreats.length && AAthreats.length < 2) {
        if (randomize) {
            logFile(vtol, "getVTOLtarget returning random nearby AA target");
            return returnRandInFirstFew(AAthreats);
        } else {
			logFile(vtol, "getVTOLtarget returning nearby AA target");
			return AAthreats[0];
		}
    }

    if (!AAthreats.length) {
		if (seenEnemies.length && seenEnemies[0].id) {
			return returnRandInFirstFew(seenEnemies);
		} else {
			let target = returnTarget(vtol);
			if (target) {
				logFile(vtol, "getVTOLtarget returning target");
				return target;
			}
		}
	}
}

function getAttackerTarget(dr, randomize=false)
{
	if (DEBUGEX) logFile("getAttackerTarget");
	if (!dr || !dr.id || dr.isVTOL || !isInMapBounds(dr)) { logTrace("WARNING getAttackerTarget invalid droid: "+JNstr(dr)); return; }

	if (dr.group === oilAttackers) {
		let oils = sortByDistToLoc(dr, getNotMyOil());
		logFile(dr, "getAttackerTarget returning random nearest notmyoil");
		return returnRandInFirstFew(oils, 4);
	}

	// target nearby enemies if seen
	const enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, ENEMIES, true);
	if (enemies && enemies.length > 0)
	{
		logFile(dr, "getAttackerTarget returning random nearby target");
		return returnRandInFirstFew(enemies);
	}

	let target = returnTarget(dr, randomize);
	if (!target || !isInMapBounds(target)) return false;
	return target;
}

function getAAthreats(loc)
{
	if (DEBUGEX) logFile("getAAthreats");
	if (!loc || !isInMapBounds(loc)) {
		logTrace("WARNING getAAthreats invalid location: "+JNstr(loc));
		return;
	}
	let threats = []; // initialize return array
	let aathreats = AAseenStore.findNear(loc, MAX_AA_DIST);
	for (let threat of aathreats)
	{
		if (!threat.range) threat.range = MAX_AA_DIST*TILE_DIVISOR;
		if (distBetweenTwoPoints(loc.x, loc.y, threat.x, threat.y) < (threat.range/TILE_DIVISOR)+VTOL_TURNAROUND_DIST) {
			// check to ensure added threat it still alive
			let threatObject = getObject(threat.type, threat.player, threat.id);
			if (threatObject) threats.push(threatObject);
		}
	}
	return threats;
}

function idleVtol(dr)
{
	if (DEBUGEX) logFile("idleVtol");
	if (!dr || !dr.id) return;
	if (throttleThis("idleVtol_"+dr.id+"throttle", 2000))  return;

	let randomize = false;
	// random target if vtol outside base
	if (distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS) randomize = true;

	const target = getVTOLtarget(dr, randomize);
	if (!target || !isInMapBounds(target)) return false;

	// attack lassats
	if (target.stattype === LASSAT && dr.weapons[0].armed > 50 && dr.health > 85) {
		if (orderDroidObj(dr, DORDER_ATTACK, target)) {
			logFile(dr, "idleVtol droid ordered to attack lassat");
			return;
		}
	}
	// maybe attack walls
	if ((target.stattype === WALL || target.stattype === GATE) && random(100) > 80 ) {
		if (orderDroidObj(dr, DORDER_ATTACK, target)) {
			logFile(dr, "idleVtol attacking wall: "+target.x+"x"+target.y);
			return;
		}
	}
	// scout to hostile if still armed
	if (dr.weapons[0].armed > 0 && dr.health > 85) {
		if (orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y)) {
			logFile(dr, "idleVtol droid ordered to scout to:"+target.x+"x"+target.y);
			return;
		}
	}
	// rearm if not 100 percent
	if ((dr.weapons[0].armed < 100 || dr.health < 100) && dr.order !== DORDER_REARM) {
		if (orderDroid(dr, DORDER_REARM)) {
			logFile(dr, "idleVtol droid ordered to REARM");
			return;
		}
	}
	// circle vtol pad
	const vtolPads = enumStruct(me, VTOL_PAD_STAT);
	if (vtolPads || vtolPads.length || vtolPads[0].id) {
		if (orderDroidLoc(dr, DORDER_CIRCLE, vtolPads[0].x, vtolPads[0].y)) {
			logFile(dr, "idleVtol droid ordered to CIRCLE vtol factory");
			return;
		}
	}
}

function idleAttacker(dr)
{
	if (DEBUGEX) logFile("idleAttacker");
	if (!dr || !dr.id) return;
	if (throttleThis("idleAttacker_"+dr.id+"throttle", 2000)) return;

	if (groupSize(attackGroup) >= MIN_GROUND_UNITS || isComponentProducible(BODY_COBRA))
	{
		let target = getAttackerTarget(dr);
		if (target) {
			// maybe attack walls instead of scout
			if ((target.stattype === WALL || target.stattype === GATE) && random(100) > 80) {
				orderDroidObj(dr, DORDER_ATTACK, target);
				logFile(dr, "attacker attacking wall: "+target.x+"x"+target.y);
				orderLocations.set(dr.id, { x: target.x, y: target.y, enemies: true });
				return;
			}
			// scout to target
			orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
			logFile(dr, "attacker scouting: "+target.x+"x"+target.y);
			if (target.id !== undefined && isInMapBounds(target)) orderLocations.set(dr.id, { x: target.x, y: target.y, enemies: true });
			return;
		}
	}
}

function idleRepair(dr)
{
	if (DEBUGEX) logFile("idleRepair");
	if (!dr || !dr.id) return;
	if (throttleThis("idleRepair_"+dr.id+"throttle", 2000)) { return; }

	// select random closest nearby combat unit and scout to it
	let droids = seenStore.query({type: DROID, isCombat: true, isAllied: true, isVTOL: false});
	droids = sortByDistToLoc(dr, droids);

	let defrand = returnRandInFirstFew(droids, 3);
	if (defrand)
	{
		orderDroidLoc(dr, DORDER_SCOUT, defrand.x, defrand.y);
		orderLocations.set(dr.id, { x: defrand.x, y:defrand.y });
		logFile(dr, "droidAware scouting to nearby "+defrand.id);
	}
	else {logFile("droidAware repair droid "+dr.id+" nowhere to scout");}
}

let lassatFired = false;
function fireLassat(myLassat) // timer
{
	if (lassatFired === true) return false;
	if (!myLassat || !myLassat.id) {
		let lasSats = enumStruct(me, LASSAT_STAT);
		if (lasSats && lasSats.length && lasSats[0].id) {
			myLassat = lasSats[0];
		} else { return false; }
	}
	lassatFired = activateStructure(myLassat, returnTarget(myLassat));
	return lassatFired;
}

function getStrongestAttackDroids() {
    // Combine attack and defend groups, filtering for relevant droid types
    const allDroids = [].concat(
        enumGroup(attackGroup),
        enumGroup(defendGroup)
    ).filter(droid => droid.droidType === DROID_WEAPON || droid.droidType === DROID_CYBORG);

    // Sort droids by descending strength
    const sortedDroids = allDroids.sort((a, b) => {
        const strengthA = a.cost * (a.bodySize + 1) * (a.experience / 10);
        const strengthB = b.cost * (b.bodySize + 1) * (b.experience / 10);
        return strengthB - strengthA; // Descending order
    });

    return sortedDroids;
}

function getStrongestRepairDroids() {
    // Combine groups, filtering for repair droids
    const allDroids = [].concat(enumGroup(repairGroup)).filter(droid => droid.droidType === DROID_REPAIR);

    // Sort droids by descending strength
    const sortedDroids = allDroids.sort((a, b) => {
        const strengthA = a.cost * (a.bodySize + 1); // should include turret size
        const strengthB = b.cost * (b.bodySize + 1);
        return strengthB - strengthA; // Descending order
    });

    return sortedDroids;
}

function findMostExpDroid()
{
	const droids = enumGroup(attackGroup).concat(enumGroup(defendGroup));

	let most_exp = 0;
	let most_exp_droid = {};

	for (let dr of droids) {
		if (dr.experience > most_exp) {
			most_exp_droid = dr;
			most_exp = dr.experience;
		}
	}
	return most_exp_droid;
}

function moveFromBurningTile(dr){
	if (tileIsBurning(dr.x, dr.y)) {
		let spiral = plotSquareSpiral(dr.x, dr.y, 10, 2);
		for (let i = 0; i < spiral.length; i=i+4) {
			let x = spiral[i][0];
			let y = spiral[i][1];
			if (!tileIsBurning(x, y) && droidCanReach(dr, x, y)) {
				orderDroidLoc(dr, DORDER_MOVE, x, y);
				orderLocations.delete(dr.id);
				logFile(dr, "moving from burning area");
				return true;
			}
		}
		orderDroid(dr, DORDER_RTR);
		logFile(dr, "retreating from burning area");
		return true;
	}
	return false;
}

//// used for non combat droids
function fleeFromHostiles(dr)
{
	let enemies = getHostilesNear(dr, GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
	if (enemies && enemies.length > 0)
	{
		let longest_range = 0;
		let longest_droid;

		// find longest range weapon
		for (let enemy of enemies) {
			if (enemy.range > longest_range)
			{
				longest_range = enemy.range/TILE_DIVISOR;
				longest_droid = enemy;
			}
		}

		// run if we get too close
		if (longest_range && longest_droid && distBetweenTwoPoints(dr.x, dr.y, longest_droid.x, longest_droid.y) < longest_range + 4)
		{
			let rallyPoint = extendLine(longest_droid, dr, GROUP_SCAN_RADIUS, 'beyond');

			if (rallyPoint && isInMapBounds(rallyPoint) && droidCanReach(dr, rallyPoint.x, rallyPoint.y)) {
				orderDroidLoc(dr, DORDER_MOVE, rallyPoint.x, rallyPoint.y);
				logFile(dr, "truck ordered to retreat enemies close longest_range:"+longest_range);
			} else {
				orderDroid(dr, DORDER_RTB);
				logFile(dr, "truck ordered to RTB enemies close longest_range:"+longest_range);
			}
			oilAssignments.delete(oilAssignments.get(dr.id));
			oilAssignments.delete(dr.id);
			orderLocations.delete(dr.id);
			orderTargets.delete(dr.id);
			return true;
		}
	}
	return false;
}

const shouldWeRetreat = (droid) => {
    if (!droid || !droid.id || droid.isVTOL) return false;

    // 1. Scan for Threats and Allies
    const seenEnemyGroup = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS*1.5, ENEMIES, true).filter(obj =>
        obj.isVTOL === false &&
        obj.player !== scavengerPlayer &&
        !(obj.canHitAir === true && obj.canHitGround === false) && // not AA
        (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.droidType === DROID_REPAIR || obj.stattype === DEFENSE)
    );

    const seenAllyGroup = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS*1.5, ALLIES, true).filter(obj =>
        obj.isVTOL === false &&
        (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG ||
         obj.droidType === DROID_COMMAND || obj.droidType === DROID_REPAIR || obj.stattype === DEFENSE)
    );

    // 2. Calculate Effective Health
    const allyHealth = aggregateGroupHealth(seenAllyGroup);
    const enemyHealth = aggregateGroupHealth(seenEnemyGroup);

    // 3. Decision Logic (Retreat if enemy is too powerful)
    if (allyHealth * RETREAT_THRESHOLD < enemyHealth) {
        logFile(`Retreat condition ${allyHealth}*${RETREAT_THRESHOLD} < ${enemyHealth}`);
        return { seenAllyGroup, seenEnemyGroup, allyHealth, enemyHealth };
    }

    return false;
};
const calculateEffectiveHealth = (droid) => {
    const cost = droid.cost ?? 100;
    const bodySize = droid.bodySize ?? 1;
    // Ensure health is treated as a ratio (0 to 1) for accurate scaling
    const healthRatio = droid.health / 100;
    return cost * (bodySize + 1) * healthRatio;
};
const aggregateGroupHealth = (group) => {
    return group.reduce((total, droid) => {
        return total + calculateEffectiveHealth(droid);
    }, 0);
};

function orderRetreat(retreat)
{
	if (retreat && retreat.seenAllyGroup && retreat.seenAllyGroup.length && retreat.seenEnemyGroup && retreat.seenEnemyGroup.length) {

		for (const ally of retreat.seenAllyGroup) {
			// only order my droids
			if (ally.id && ally.player === me && ally.type === DROID && ally.group !== playerGroup) {

				if (distBetweenTwoPoints(ally.x, ally.y, BASE.x, BASE.y) > AVG_BASE_RADIUS) {
					let actionTaken = false;
					let hostile = returnRandInFirstFew(sortByDistToLoc(ally, retreat.seenEnemyGroup));
					let rallyPoint = extendLine(hostile, ally, GROUP_SCAN_RADIUS, 'beyond');

					// is rallyPoint suitable for retreat location
					if (rallyPoint && isInMapBounds(rallyPoint) && droidCanReach(ally, rallyPoint.x, rallyPoint.y)) {
						if (ally.type === DROID_REPAIR) {
							orderDroidLoc(ally, DORDER_SCOUT, rallyPoint.x, rallyPoint.y);
							logFile(ally, "retreating scout to rallyPoint");
						} else {
							orderDroidLoc(ally, DORDER_MOVE, rallyPoint.x, rallyPoint.y);
							logFile(ally, "retreating move to rallyPoint");
						}

					} else { // rallyPoint not suitable
						if (ally.type === DROID_REPAIR) {
							orderDroidLoc(ally, DORDER_SCOUT, BASE.x, BASE.y);
							logFile(ally, "retreating scout to base");
						} else {
							orderDroid(ally, DORDER_RTB);
							logFile(ally, "retreating RTB");
						}
					}

					groupAdd(retreatGroup, ally);
					orderTargets.delete(ally.id);
					orderLocations.delete(ally.id);
				}
			}
		}
	}
}

function collectArtifacts(dr, range=GROUP_SCAN_RADIUS)
{
	if (!collectArtifacts._assignments) collectArtifacts._assignments = new Map();

	let artifacts = enumRange(dr.x, dr.y, range, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && (obj.stattype === OIL_DRUM || obj.stattype === ARTIFACT)));
	artifacts = sortByDistToLoc(dr, artifacts);

	if (artifacts && artifacts.length > 0) {
		for (let artifact of artifacts) {
			if (!isInMapBounds(artifact)) continue;
			// check assignments
			let lastAssignment = collectArtifacts._assignments.get(artifact.id) || 0;
			if (lastAssignment < gameTime - ONE_MINUTE) {
				collectArtifacts._assignments.delete(artifact.id);
				// check is accessible
				if (droidCanReach(dr, artifact.x, artifact.y)) {
					let enemies = getHostilesNear(artifact, GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
					if (enemies.length === 0) {
						orderDroidObj(dr, DORDER_RECOVER, artifact);
						logFile(dr, "droidAware truck found artifact to collect");
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

class CommanderSupportManager {
    constructor(initialAssignments = {}) {
        this.assignments = initialAssignments;
    }

    calculateSupportLimit(commander) {
        if (!commander || commander.droidType !== DROID_COMMAND) {
			logFile("Calculate failed: Invalid commander or droid provided.");
            return 0;
        }

        // Assume Upgrades[player].Brain.CommandBrain01 exists and is valid
        const brain = Upgrades[commander.player]?.Brain?.["Command Turret"];
        if (!brain) {
			logFile("Calculate failed: Invalid Brain Upgrade data.");
            return 0;
        }

        const thresholds = brain.RankThresholds;
        const experience = Math.floor(commander.experience);
        let rank = thresholds.length - 1;

        // Determine rank based on experience vs thresholds
        for (let i = 1; i < thresholds.length; ++i) {
            if (experience < thresholds[i]) {
                rank = i - 1;
                break;
            }
        }
        return brain.BaseCommandLimit + rank * brain.CommandLimitByLevel;
    }

    assignToCommander(commander, droid) {
        // Improved validation
        if (!commander || !droid || !commander.id || !droid.id) {
            logFile("Assignment failed: Invalid commander or droid provided.");
            return false;
        }

        if (droid.droidType === DROID_COMMAND) return false;

        // Initialize assignments map if it doesn't exist
        if (!this.assignments[commander.id]) {
            this.assignments[commander.id] = {};
        }

        // Check if already assigned (optional, but prevents redundant state updates)
        if (this.assignments[commander.id][droid.id]) {
            //logFile(`Droid ${droid.id} already assigned to Commander ${commander.id}.`);
            return true;
        }

        // Update state
        this.assignments[commander.id][droid.id] = true;

        if (orderDroidObj(droid, DORDER_COMMANDERSUPPORT, commander)) {
			logFile("Assigned to commander:", commander.id, droid.id);
			return true;
		}
		logFile(`Failed to assign to commander:`, commander.id, droid.id);
        return false;
    }

    unassignFromCommander(commander, droid) {
        if (this.assignments[commander.id] && this.assignments[commander.id][droid.id]) {
            delete this.assignments[commander.id][droid.id];
            logFile("Unassigned from commander:", commander.id, droid.id);
        }
    }

    countTrackedCommanderUnits(commander) {
        const assignments = this.assignments[commander.id];
        if (!assignments) {
            return 0;
        }

        let count = 0;
        const validAssignments = {};
        let unitsToKeep = 0;

        // Use Object.entries to iterate and validate simultaneously
        for (const [droidId, isAssigned] of Object.entries(assignments)) {
            const droid = getObject(DROID, me, droidId);

            // Validation checks
            const isValidDroid = !!droid && droid.droidType !== DROID_COMMAND && droid.order === DORDER_COMMANDERSUPPORT;

            if (isValidDroid) {
                validAssignments[droidId] = true;
                unitsToKeep++;
            }
        }

        // Update the state by replacing the old assignments object
        this.assignments[commander.id] = validAssignments;

        return unitsToKeep;
    }

    processSupport(potentialCommanders) {

        for (const commander of potentialCommanders) {
            if (!commander || !commander.id) continue;
			if (commander.action !== DACTION_ATTACK) continue;

			const nearbyAttackers = enumRange(commander.x, commander.y, GROUP_SCAN_RADIUS, me, true).filter((obj) =>
					((obj.action === DACTION_ATTACK || obj.action === DACTION_OBSERVE) && (obj.group === attackGroup || obj.group === defendGroup)) );

            // 1. Calculate Status
            const numAssigned = this.countTrackedCommanderUnits(commander);
			logFile("numAssigned:", numAssigned);
            const maxAssigned = this.calculateSupportLimit(commander);
			logFile("maxAssigned:", maxAssigned);
            const needed = maxAssigned - numAssigned;

            // 2. Assign Support Units (Filling the gap)
            if (needed > 0 && nearbyAttackers && nearbyAttackers.length > 0) {
                let assignedCount = 0;
                for (const combatDroid of nearbyAttackers) {
                    if (assignedCount >= needed) break;

                    // Check if the nearby droid is viable and not already assigned/processed
                    if (combatDroid && combatDroid.order !== DORDER_FIRESUPPORT && combatDroid.order !== DORDER_COMMANDERSUPPORT) {
                         if (this.assignToCommander(commander, combatDroid)) {
                            assignedCount++;
                        }
                    }
                }
            }

            // 3. Clean Up Support Units (Order Correction)
            this.cleanupCommanderSupport(commander);
        }
    }

    cleanupCommanderSupport(commander) {
        const assignments = this.assignments[commander.id];
        if (!assignments) return;

        const droidIds = Object.keys(assignments);

        for (const droidId of droidIds) {
            const droid = getObject(DROID, me, droidId);
            if (!droid || !droid.id) {
                // Droid object is gone, remove assignment
                delete this.assignments[commander.id][droidId];
                continue;
            }

            // Condition 1: If the droid is supposed to be support, but it's not supporting
            if (droid.order === DORDER_COMMANDERSUPPORT && (droid.action !== DACTION_ATTACK || droid.action !== DACTION_OBSERVE)) {
                this.unassignFromCommander(commander, droid);
				idleAttacker(droid);
            }

            // Condition 2: If the droid's order changed to something other than support
            if (droid.order !== DORDER_COMMANDERSUPPORT) {
                this.unassignFromCommander(commander, droid);
            }
        }
    }
}

const supportManager = new CommanderSupportManager({});
function droidAwareCommander() {
    const commanders = [ ...enumGroup(attackGroup), ...enumGroup(defendGroup) ].filter((obj) => obj.droidType === DROID_COMMAND);

	if (commanders && commanders.length) supportManager.processSupport(commanders);
}
