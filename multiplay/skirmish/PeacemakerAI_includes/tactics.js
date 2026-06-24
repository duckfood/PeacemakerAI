function droidNeedsRepair(droidID, percent = null)
{
	const dr = getObject(DROID, me, droidID);
	if (!dr || dr.id == undefined)
	{
		logTrace("WARNING droidNeedsRepair no dr");
		return true; // dead?
	}

	// if already going for repairs or retreating return true
	if (dr.order === DORDER_RTR || dr.order === DORDER_RTB || dr.order === DORDER_REARM) return true;

	if (!percent)
	{
		if (dr.propulsion === "hover01") { percent = 65; }
		else if (dr.propulsion === "CyborgLegs") { percent = 85; }
		else if (dr.propulsion === "V-Tol") { percent = 80; }
		else if (dr.propulsion === "wheeled01") { percent = 75; }
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
			if (repair_droids[0] && !componentAvailable("Body14SUP"))
			{
				orderDroidObj(dr, 25, returnRandInFirstFew(repair_droids));
				log("damaged droid ordered to guard random nearby repair:"+dr.id);
			}
			else if ( (repair_facs && repair_facs.length > 0) || (repair_droids && repair_droids.length > 0) )
			{
				orderDroid(dr, DORDER_RTR);
				log("damaged droid ordered to RTR:"+dr.id);
			}
			else // no repairs available
			{
				orderDroid(dr, DORDER_RTB);
				log("damaged droid ordered to RTB:"+dr.id);
			}
		}
		else if (dr.droidType === DROID_REPAIR && dr.order !== DORDER_RTR)
		{
			orderDroid(dr, DORDER_RTR);
			log("damaged repair ordered to RTR:"+dr.id);
		}
		else if (dr.droidType === DROID_CONSTRUCT && dr.order !== DORDER_RTR)
		{
			orderDroid(dr, DORDER_RTR);
			log("damaged constructor ordered to RTR:"+dr.id);
		}
		else if (dr.isVTOL && dr.order !== DORDER_REARM && enumStruct(me, VTOL_PAD_STAT))
		{
			orderDroid(dr, DORDER_REARM);
			log("damaged vtol ordered to REARM:"+dr.id);
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
		logObj(dr, "recycle droid");
		orderDroid(dr, DORDER_RECYCLE);
	}
}

function scanForVTOLs()
{
	if (enemyHasVtol)
	{
		removeTimer("scanForVTOLs");
		return;
	}

	// bandit pads
	if (countStruct("A0BaBaVtolPad", ENEMIES))
	{
		enemyHasVtol = true;
	}
}

function getRandomScoutLoc(dr)
{
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
				log("returnTarget "+t_aa.length+" AA near random target - next target");
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

function getNotMyOil(){
	const oilResources = seenStore.query({ type: FEATURE, stattype: OIL_RESOURCE, isReachable: true, requiresDestruction: false });
	if (!oilResources || !oilResources.length) log("WARNING no oil resources");
	const alliedObjects = new Set();

	// precompute allied derricks
	for (const obj of seenStore.query({ isAllied: true, type: STRUCTURE, stattype: RESOURCE_EXTRACTOR})) {
		alliedObjects.add(`${obj.x},${obj.y}`);
	}
	// filter unowned
	const unalliedOilResources = oilResources.filter(obj => {
		const positionKey = `${obj.x},${obj.y}`;
		const hasAllied = alliedObjects.has(positionKey);
		return !hasAllied;
	});
	return unalliedOilResources;
}

function returnTarget(dr, randomtarget=false, droidAge=120000, structAge=600000)
{
	if (!dr || !dr.id) return false;
	let targets = [];

	// send vtols lightly defended lassat targets
	if (dr.isVTOL)
	{
		targets = seenStore.query({ isAllied: false, type: STRUCTURE, stattype: LASSAT }).filter((obj) => (obj.lastSeen > gameTime - 1200000));
		if (targets && targets.length)
		{
			for (let lassat of targets)
			{
				if (lassat.x === undefined || lassat.y === undefined) continue;
				let target_AA = getAAthreats(lassat);
				if (!target_AA || target_AA.length < 3)
				{
					logObj(dr, "getVTOLtarget returning lassat target");
					return lassat;
				}
			}
		}
	}

	targets = seenStore.query({ isAllied: false, type: DROID, isVTOL: false }).filter((obj) => (obj.lastSeen > gameTime - droidAge));
	targets = targets.concat(seenStore.query({ isAllied: false, type: STRUCTURE}).filter((obj) => (obj.lastSeen > gameTime - structAge)));
	targets = targets.concat(getNotMyOil());

	// if no targets return a random location
	if (!targets.length || !targets[0].id) return getRandomScoutLoc(dr);
	// handle lassat
	if (dr.type === STRUCTURE && dr.stattype === LASSAT)
	{
		targets = targets.sort((a, b) => b.cost - a.cost); // decending
		// if one of the first few are a lassat return it
		for (i = 0; i < 3; i++)
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
	for (let t of targets)
	{
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
				if (dr.isVTOL == true) {
					let t_aa = getAAthreats(t);
					if (t_aa && t_aa.length > 2) {
						log("returnTarget "+t_aa.length+" AA near target - next target");
						continue;
					}
				}

				// return this target
				target = t;
				break;
			}
		}
	}
	if (!target || target.x == undefined || target.y == undefined) return getRandomScoutLoc(dr);
	return target;
}

function getHostilesNear(loc, range=GROUP_SCAN_RADIUS)
{
	if (!loc) return false;
	const buildingAge = 600000;
	const droidAge = 60000;

	let hostiles = seenStore.findNear(loc, range, { isAllied: false, type: DROID, isVTOL: false, isCombat: true })
		.filter((obj) => (obj.lastSeen > gameTime - droidAge) );
	hostiles = hostiles.concat(seenStore.findNear(loc, range, { isAllied: false, type: STRUCTURE, isCombat: true })
		.filter((obj) => (obj.status === BUILT && obj.lastSeen > gameTime - buildingAge)) );
	return hostiles;
}

//// refined version
function getVTOLtarget(vtol, randomize = false) {
    if (!vtol || !vtol.isVTOL || !vtol.id) {
        log("WARNING getVTOLtarget passed invalid vtol: " + JNstr(vtol));
        return;
    }

    let seenEnemies = enumRange(vtol.x, vtol.y, GROUP_SCAN_RADIUS * 3, ENEMIES, true);
    let AAthreats = getAAthreats(vtol);

    // Target AA if not too many
    if (AAthreats.length && AAthreats.length < 3) {
        if (randomize) {
            logObj(vtol, "getVTOLtarget returning random nearby AA target");
            return returnRandInFirstFew(AAthreats);
        } else {
			logObj(vtol, "getVTOLtarget returning nearby AA target");
			return AAthreats[0];
		}
    }

    if (!AAthreats.length) {
		if (seenEnemies.length && seenEnemies[0].id) {
			return returnRandInFirstFew(seenEnemies);
		} else {
			let target = returnTarget(vtol);
			if (target) {
				logObj(vtol, "getVTOLtarget returning target");
				return target;
			}
		}
	}
}

function getAttackerTarget(dr, randomize=true)
{
	if (!dr || !dr.id || dr.isVTOL) { logTrace("WARNING getAttackerTarget invalid droid: "+JNstr(dr)); return; }

	// target nearby enemies if seen
	const enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, ENEMIES, true);
	if (enemies && enemies.length > 0)
	{
		logObj(dr, "getAttackerTarget returning random nearby target");
		return returnRandInFirstFew(enemies);
	}

	let target = returnTarget(dr, randomize);
	if (!target || target.x == undefined || target.y == undefined) return false;
	return target;
}

function getAAthreats(loc)
{
	if (!loc || loc.x === undefined || loc.y === undefined) {
		logTrace("WARNING getAAthreats invalid location: "+JNstr(loc));
		return;
	}
	let threats = []; // initialize return array
	let aathreats = AAseenStore.findNear(loc, 24);
	for (let threat of aathreats)
	{
		if (!threat.range) { threat.range = 24*128; }
		if (distBetweenTwoPoints(loc.x, loc.y, threat.x, threat.y) < (threat.range/128)+16) {
			// check to ensure added threat it still alive
			let threatObject = getObject(threat.type, threat.player, threat.id);
			if (threatObject) threats.push(threatObject);
		}
	}
	return threats;
}

function idleVtol(dr)
{
	if (!dr || !dr.id) return;
	if (throttleThis("idleVtol_"+dr.id+"throttle", 2000)) { return; }
	let randomize = false;
	if (distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS) { randomize = true; }

	const target = getVTOLtarget(dr, randomize);
	if (!target || target.x == undefined || target.y == undefined) return false;

	if (target.stattype == LASSAT && dr.weapons[0].armed > 50 && dr.health > 85)
	{
		orderDroidObj(dr, DORDER_ATTACK, target);
		logObj(dr, "idleVtol droid ordered to attack lassat");
		return;
	}
	else if (target.stattype == SAT_UPLINK && dr.weapons[0].armed > 50 && dr.health > 85)
	{
		orderDroidObj(dr, DORDER_ATTACK, target);
		logObj(dr, "idleVtol droid ordered to attack uplink");
		return;
	}
	else if (target.x !== undefined && dr.weapons[0].armed > 0 && dr.health > 85)
	{
		orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
		logObj(dr, "idleVtol droid ordered to scout to:"+target.x+"x"+target.y);
		return;
	}
	else if ((dr.weapons[0].armed < 100 || dr.health < 100) && dr.order !== DORDER_REARM)
	{
		orderDroid(dr, DORDER_REARM);
		logObj(dr, "idleVtol droid ordered to REARM");
		return;
	}
	else
	{
		// circle vtol pad
		const vtolFacs = enumStruct(me, VTOL_PAD_STAT);
		if (vtolFacs[0])
		{
			orderDroidLoc(dr, 40, vtolFacs[0].x, vtolFacs[0].y); // DORDER_CIRCLE
			logObj(dr, "idleVtol droid ordered to CIRCLE vtol factory");
			return;
		}
	}
}

function idleAttacker(dr)
{
	if (!dr || dr.id == undefined) return;
	if (throttleThis("idleAttacker_"+dr.id+"throttle", 2000)) { return; }
	if (groupSize(attackGroup) >= MIN_GROUND_UNITS || componentAvailable("HeavyRepair"))
	{
		let target = getAttackerTarget(dr);
		if (target && target.x && target.y)
		{
			orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
			logObj(dr, "attacker scouting: "+target.x+"x"+target.y);
			if (target.id !== undefined) orderLocations.set(dr.id, {x: target.x, y: target.y, enemies: true});
			return;
		}
	}
}

function idleRepair(dr)
{
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
		logObj(dr, "droidAware scouting to nearby "+defrand.id);
	}
	else {log("droidAware repair droid "+dr.id+" nowhere to scout");}
}

function fireLassat()
{
	let my_lassat = [];
	my_lassat = enumStruct(me, LASSAT_STAT);
	if (my_lassat.length === 0) return false;

	// no way to know if charged so just attempt to fire it
	const satellite = my_lassat[0];

	const target = returnTarget(satellite);
	return activateStructure(satellite, target);
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

    // Return sorted array of droid objects
    return sortedDroids;
}

function getStrongestRepairDroids() {
    // Combine groups, filtering for repair droids
    const allDroids = [].concat(
        enumGroup(attackGroup),
        enumGroup(defendGroup),
        enumGroup(supportGroup)
    ).filter(droid => droid.droidType === DROID_REPAIR);


    // Sort droids by descending strength (cost * (bodySize + 1))
    const sortedDroids = allDroids.sort((a, b) => {
        const strengthA = a.cost * (a.bodySize + 1); // TODO should include turret size
        const strengthB = b.cost * (b.bodySize + 1);
        return strengthB - strengthA; // Descending order
    });

    // Return sorted array of droid objects
    return sortedDroids;
}

function findMostExpDroid()
{
	const droids = enumGroup(attackGroup).concat(enumGroup(defendGroup));

	let most_exp = 0;
	let most_exp_droid = {};

	for (let dr of droids)
	{
		if (dr.experience > most_exp)
		{
			most_exp_droid = dr;
			most_exp = dr.experience;
		}
	}
	return most_exp_droid;
}

//// might not be working
function moveFromBurningTile(dr){
	if (tileIsBurning(dr.x, dr.y)) {
		let spiral = plotSquareSpiral(dr.x, dr.y, 10, 2);
		for (let i = 0; i < spiral.length; i=i+4) {
			let x = spiral[i][0];
			let y = spiral[i][1];
			if (!tileIsBurning(x, y) && droidCanReach(dr, x, y)) {
				orderDroidLoc(dr, DORDER_MOVE, x, y);
				orderLocations.delete(dr.id);
				logObj(dr, "moving from burning area");
				return;
			}
		}
		orderDroid(dr, DORDER_RTR);
		logObj(dr, "retreating from burning area");
	}
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
				longest_range = enemy.range/128;
				longest_droid = enemy;
			}
		}

		// run if we get too close
		if (longest_range && longest_droid && distBetweenTwoPoints(dr.x, dr.y, longest_droid.x, longest_droid.y) < longest_range + 3)
		{
			orderDroid(dr, DORDER_RTB);
			logObj(dr, "truck ordered to RTB as enemies too close longest_range:"+longest_range);
			orderLocations.delete(dr.id);
			orderTargets.delete(dr.id);
			return true;
		}
	}
	return false;
}
