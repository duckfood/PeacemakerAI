
//Check if this vtol is armed or needs rearming
function vtolReady(vtolID)
{
	const vtol = getObject(DROID, me, vtolID);
	if (vtol == null || vtol.id == null)
	{
		log("no vtol while checking if ready");
		return false;
	}
	//logObj(vtol, "checking if vtol ready:"+JSON.stringify(vtol));

	if (vtol.order === DORDER_REARM || vtol.action === 35 && vtol.weapons[0].armed < 99) // waitduringrearm
	{
		//logObj(vtol, "vtol rearming and not full");
		return false;
	}

	if (vtol.order !== DORDER_REARM && vtol.weapons[0].armed < 1)
	{
		orderDroid(vtol, DORDER_REARM);
		//logObj(vtol, "vtol ordered to rearm");
		return false;
	}
	//logObj(vtol, "vtol ready");
	return true;
}

//Does a droid need to repair.
function droidNeedsRepair(droidID, percent = null)
{
	const dr = getObject(DROID, me, droidID);
	if (!dr || dr.id == null)
	{
		log("droidNeedsRepair no dr") 
		return true; // dead?
	}

	// if already going for repairs or retreating return true
	if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) { return true;}
	
	if (!percent)
	{
		if (dr.propulsion === "hover01")
		{
			percent = 65;
		}
		else if (dr.propulsion === "CyborgLegs")	
		{
			percent = 85;
		}
		else if (dr.propulsion === "V-Tol")	
		{
			percent = 80;
		}
		else if (dr.propulsion === "wheeled01")	
		{
			percent = 75;
		}
		else 
		{
			percent = 60;
		}
	}

	// if damaged and already guarding a valid repair truck return true
	if (dr.health <= percent && orderTargets.has(dr.id))
	{
		var guarding = getObject(DROID, me, orderTargets.get(dr.id));
		if (guarding && guarding.droidType === DROID_REPAIR)
		{
			return true;
		}
	}

	if (dr.health <= percent)
	{
		var repair_droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, me, true).filter((obj) => (obj.droidType === DROID_REPAIR));
		var repair_facs = enumStruct(me, REPAIR_FACILITY_STAT);
		if (!repair_droids[0]) { repair_droids = enumDroid(me, DROID_REPAIR); }
		
		if (dr.droidType !== DROID_CONSTRUCT && dr.droidType !== DROID_REPAIR && dr.isVTOL === false) 
		{ 
			if (repair_droids[0] && dr.body !== "Body14SUP")
			{
				orderDroidObj(dr, 25, repair_droids[random(repair_droids.length-1)]);
				log("damaged droid ordered to guard random nearby repair:"+dr.id);
			}
			else if (repair_facs && repair_facs.length > 0)
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
//			orderDroid(dr, DORDER_RTR);
//			log("damaged constructor ordered to RTR:"+dr.id);
		}
		else if (dr.isVTOL && dr.order !== DORDER_REARM)
		{
			orderDroid(dr, DORDER_REARM);
			log("damaged vtol ordered to REARM:"+dr.id);
		}

		return true;
	}

	return false;
}

//Return all enemy players that are still alive. An optional argument can be
//passed to determine if that specific player is alive or not.
function getAliveEnemyPlayers(player)
{
	if (defined(player))
	{
		if (countStruct(FACTORY_STAT, player) +
			countStruct(CYBORG_FACTORY_STAT, player) +
			countStruct(VTOL_FACTORY_STAT, player) +
			countStruct(DERRICK_STAT, player) +
			countDroid(DROID_ANY, player) > 0)
		{
			return true;
		}

		return false;
	}

	var numEnemies = [];
	for (let i = 0; i < maxPlayers; ++i)
	{
		if (i !== me && !allianceExistsBetween(i, me))
		{
			//Are they alive (have factories and constructs)
			//Even if they still have attack droids, eventAttacked() will find them anyway if they do attack.
			if ((countStruct(FACTORY_STAT, i) +
				countStruct(CYBORG_FACTORY_STAT, i) +
				countStruct(VTOL_FACTORY_STAT, i) +
				countStruct(DERRICK_STAT, i) +
				countDroid(DROID_ANY, i)) > 0)
			{
				numEnemies.push(i); // count 'em, then kill 'em :)
			}
		}
	}

	if (defined(scavengerPlayer) &&
		(countStruct("A0BaBaFactory", scavengerPlayer) +
		countStruct(DERRICK_STAT, scavengerPlayer) +
		countDroid(DROID_ANY, scavengerPlayer)) > 0)
	{
		numEnemies.push(scavengerPlayer);
	}

	return numEnemies;
}

//return the nearest factory ID (normal factory has precedence). undefined if none.
function findNearestFactoryID(player)
{
	var facs = enumStruct(player, FACTORY_STAT).sort(sortByDistToBase);
	var cybFacs = enumStruct(player, CYBORG_FACTORY_STAT).sort(sortByDistToBase);
	var vtolFacs = enumStruct(player, VTOL_FACTORY_STAT).sort(sortByDistToBase);
	var target;

	if (facs.length > 0)
	{
		target = facs[0].id;
	}
	else if (cybFacs.length > 0)
	{
		target = cybFacs[0].id;
	}
	else if (vtolFacs.length > 0)
	{
		target = vtolFacs[0].id;
	}

	return target;
}

//Return closest player construct ID. Undefined if none.
function findNearestConstructID(player)
{
	var constructs = enumDroid(player, DROID_CONSTRUCT).sort(sortByDistToBase);
	var target;

	if (constructs.length > 0)
	{
		target = constructs[0].id;
	}

	return target;
}

//Return closest player derrick ID. Undefined if none.
function findNearestDerrickID(player)
{
	var target;
	var derr = enumStruct(player, DERRICK_STAT).sort(sortByDistToBase);

	if (derr.length > 0)
	{
		target = derr[0].id;
	}

	return target;
}

function setPlayerAsTarget(player)
{
	currentEnemy = player;
	currentEnemyTick = gameTime;
}

//Returns the current enemy that is being targeted. undefined if none.
//Note that eventBeacon can reset the currentEnemyTick and target enemy player
//so an enemy could be be harassed longer.
function getCurrentEnemy()
{
	if (!defined(currentEnemy) || (gameTime > (currentEnemyTick + 120000)))
	{
		var enemy = getStrongestEnemyPlayer();
		if (enemy > 0)
		{
			setPlayerAsTarget(enemy); 
		}
		else
		{
			return undefined;
		}
	}

	return currentEnemy;
}

//Attack the current selected enemy.
// not used
function attackEnemy()
{
	if (groupSizes[attackGroup] >= MIN_GROUND_UNITS || groupSizes[vtolGroup] >= MIN_VTOL_UNITS)
	{
		var isDroid = false;
		var derrick_obj;
		var factory_obj;
		
		var selectedEnemy = getCurrentEnemy();
		if (!defined(selectedEnemy))
		{
			return; //No enemy players remain
		}

		var targetID = findNearestDerrickID(selectedEnemy);
		var derrick_obj = getObject(STRUCTURE, selectedEnemy, targetID);
		
		if (!targetID || propulsionCanReach("wheeled01", BASE.x, BASE.y, derrick_obj.x, derrick_obj.y) === false)
		{
			targetID = findNearestFactoryID(selectedEnemy);
			if (targetID) { factory_obj = getObject(STRUCTURE, selectedEnemy, targetID); }
			if (!targetID || propulsionCanReach("wheeled01", BASE.x, BASE.y, factory_obj.x, factory_obj.y) === false)
			{
				var droids = enumDroid(selectedEnemy);
				isDroid = true;
				targetID = findNearestConstructID(selectedEnemy);
				if (!targetID && droids.length > 0)
				{
					//Now just start picking off any droids that remain.
					targetID = droids[0].id;
				}
			}
		}

		var loc;
		var realObject;
		if (targetID)
		{
			if (!isDroid)
			{
				realObject = getObject(STRUCTURE, selectedEnemy, targetID);
			}
			else
			{
				realObject = getObject(DROID, selectedEnemy, targetID);
			}

			if (realObject === null)
			{
				return; // just for extra precaution
			}

			loc = {x: realObject.x, y: realObject.y};
		}
		else
		{
			return;
		}
		log("ATTACKING player " + selectedEnemy);
		var i = 0;
		var attackers = enumGroup(attackGroup);
		var len = attackers.length;
		
		if (len >= MIN_GROUND_UNITS ) // MIN_ATTACK_GSIZE
		{
			
			for (i = 0; i < len; ++i)
			{
				var dr = attackers[i];

				if (droidNeedsRepair(dr.id) === false && (dr.action === 0 || dr.action === 9) && dr.order !== DORDER_RTB)
				{
					//log("deciding what to do with idle attacker:"+dr.id+" len:"+len);
					//log(JSON.stringify(dr));
					if (dr.droidType === DROID_REPAIR) // droidAware will grab them
					{
						//if (true)
						//{ 
							//var defrand = attackers[random(len-1)];
							//orderDroidObj(dr, 25, defrand); // DORDER_GUARD
							//log("repair droid "+dr.id+" guarding:"+defrand.id);
						//}
					}
					else 
					{
						orderDroidLoc(dr, DORDER_SCOUT, loc.x, loc.y);
						log("attack droid "+dr.id+" scouting: "+loc.x+"x"+loc.y);
						orderLocations.set(dr.id, {x: loc.x, y: loc.y, enemies: true});
					}
				}
			}
		}
		
		//Only send VTOLs if we got a few of them
		var vtols = enumGroup(vtolGroup);
		len = groupSize(vtolGroup);
		if (len > MIN_VTOL_UNITS)
		{
			var AA = getAAthreats(loc);
			if (AA.length > 2) { return; }
			
			for (j = 0; j < len; ++j)
			{
				var vt = vtols[j];
				if (vtolReady(vt.id) === true && vt.order !== DORDER_ATTACK && vt.order !== DORDER_SCOUT) //
				{
					orderDroidLoc(vt, DORDER_SCOUT, loc.x, loc.y);
					logObj(vt, "vtol sent on attack mission"); //+JSON.stringify(vt));
				}
			}
		}

	}
}

//Use a slim version of the hover map checking code from Cobra AI.
function isHoverMap()
{
	var hoverMap = false;

	for (let i = 0; i < maxPlayers; ++i)
	{
		if (!propulsionCanReach("wheeled01", BASE.x, BASE.y, startPositions[i].x, startPositions[i].y))
		{
			//Check if hover can not reach this area.
			var temp = 0;
			for (let t = 0; t < maxPlayers; ++t)
			{
				var b1 = startPositions[i];
				var b2 = startPositions[t];
				if (!propulsionCanReach("hover01", b1.x, b1.y, b2.x, b2.y))
				{
					temp = temp + 1;
				}
			}

			if (temp !== maxPlayers - 1)
			{
				hoverMap = true;
				break;
			}
		}
	}

	return hoverMap;
}

function recycleDroidsForHover()
{
	if (componentAvailable("hover01") === false || countStruct(POW_GEN_STAT) === 0)
	{
		return;
	}

	const MIN_FACTORY = 1;
	var systems = enumDroid(me, DROID_CONSTRUCT).filter((dr) => (
		dr.propulsion !== "hover01" && dr.action === 0 && dr.group === oilBuilders
	));
	var unfinishedStructures = enumStruct(me).filter((obj) => (
		obj.status !== BUILT && obj.stattype !== RESOURCE_EXTRACTOR && obj.stattype !== DEFENSE
	));
	const NON_HOVER_SYSTEMS = systems.length;

	if (countStruct(FACTORY_STAT) > MIN_FACTORY)
	{
		if (unfinishedStructures.length === 0)
		{
			for (let i = 0; i < NON_HOVER_SYSTEMS; ++i)
			{
				orderDroid(systems[i], DORDER_RECYCLE);
			}

			if (isSeaMap === false && NON_HOVER_SYSTEMS === 0)
			{
				removeTimer("recycleDroidsForHover");
			}
		}

		if (isSeaMap)
		{
			var tanks = enumGroup(attackGroup).filter((dr) => (
				dr.droidType === DROID_WEAPON && dr.propulsion !== "hover01" && dr.action === 0
			));
			const NON_HOVER_TANKS = tanks.length;

			for (let j = 0; j < NON_HOVER_TANKS; ++j)
			{
				orderDroid(tanks[j], DORDER_RECYCLE);
				
			}

			if (NON_HOVER_TANKS + NON_HOVER_SYSTEMS === 0)
			{
				removeTimer("recycleDroidsForHover");
			}
		}
	}
}

function scanForVTOLs()
{
	if (enemyHasVtol)
	{
		removeTimer("scanForVTOLs");
		return; 
	}
	// check for vtol pads
	if (countStruct("A0VtolPad", ENEMIES))
	{
		enemyHasVtol = true;
	}
	// bandit pads
	if (countStruct("A0BaBaVtolPad", ENEMIES))
	{
		enemyHasVtol = true;
	}
}

function checkOrderLocations()
{
	var tmpLocations = new Map();
	orderLocations.forEach((value, key) =>  
	{
		if (value.x == null || value.y == null) { return; }
		else
		{
			tmpLocations.set(value.x+"x"+value.y, {x: value.x, y: value.y});
			//log("checkOrderLocations setting tmpLocations:"+value.x+"x"+value.y);
		}
	});
	
	tmpLocations.forEach((value1, key1) =>
	{
		if (value1 == null || value1.x == null || value1.y == null) { return; }
		else
		{
			//log("checkOrderLocations checking:"+value1.x+"x"+value1.y);
			var enemies = enumRange(value1.x, value1.y, GROUP_SCAN_RADIUS*2, ENEMIES, false);

			orderLocations.forEach((value2, key2) =>
			{
				if (value2 == null || value2.x == null || value2.y == null) { return; }
				else
				{
					if (value2 && value1.x === value2.x && value1.y === value2.y && defined(enemies[0]))
					{
						orderLocations.set(key2, {x: value2.x, y: value2.y, enemies: true});
						//log("checkOrderLocations updating "+key2+" enemies: true");
					}
					if (value2 && value1.x === value2.x && value1.y === value2.y && !defined(enemies[0]))
					{
						orderLocations.set(key2, {x: value2.x, y: value2.y, enemies: false});
						//log("checkOrderLocations updating "+key2+" enemies: false");
					}	
				}
			});
		}
	});
}

function getVTOLtarget(vtol, randomize)
{
	if (!vtol || !vtol.isVTOL || vtol.id == null) { return; }
	
	var enemies = []; var threats = []; var enemy_lassat = []; var enemy_uplink = [];
	
	// target nearby enemies
	enemies = enumRange(vtol.x, vtol.y, GROUP_SCAN_RADIUS*4, ENEMIES, true);
	threats = getAAthreats(vtol);
	
	if ((enemies && enemies.length > 0 && threats && threats.length < 3) || (enemies && enemies.length > 0 && threats && threats.length > 0 && distBetweenTwoPoints(threats[0].x, threats[0].y, BASE.x, BASE.y) < AVG_BASE_RADIUS + 10))           
	{
		if (randomize && threats.length > 0)
		{
			logObj(vtol, "getVTOLtarget returning random nearby AA target");
			return threats[random(threats.length-1)];
		}
		else if (threats.length > 0)
		{
			logObj(vtol, "getVTOLtarget returning first nearby AA target");
			return threats[0];
		} 
		else if (randomize)
		{
			logObj(vtol, "getVTOLtarget returning random nearby target");
			return enemies[random(enemies.length-1)];
		}
		else
		{
			logObj(vtol, "getVTOLtarget returning first nearby target");
			return enemies[0];
		}
	}
	
	// target undefended lassat and uplinks
	const players = getAliveEnemyPlayers();
	for (player of players)
	{
		if (!allianceExistsBetween(me, player)) // enemy player
		{
			enemy_lassat = enemy_lassat.concat(enumStruct(player, LASSAT_STAT)).filter((obj) => (obj.status === BUILT));
			enemy_uplink = enemy_uplink.concat(enumStruct(player, UPLINK_STAT)).filter((obj) => (obj.status === BUILT));
		}
	}		
	for (lassat of enemy_lassat)
	{
		// check to see if defended
		var lassat_AA = getAAthreats(lassat);
		if (!lassat_AA[0])
		{
			logObj(vtol, "getVTOLtarget returning lassat_target");
			return lassat;
		}
	}
	for (uplink of enemy_uplink)
	{
		// check to see if defended
		var uplink_AA = getAAthreats(uplink);
		if (!uplink_AA[0])
		{
			logObj(vtol, "getVTOLtarget returning uplink_target");
			return uplink;
		}
	}
	
	// target derricks and remaining structures
	var structures = [];
	
	for (player of players)
	{
		if (!allianceExistsBetween(me, player)) // enemy player
		{
			var addstructs = [];
			addstructs = enumStruct(player, DERRICK_STAT);
			if (player !== scavengerPlayer && (!addstructs || addstructs.length === 0))
			{
				addstructs = enumStruct(player).filter((obj) => (obj.stattype !== WALL));
			}
			structures = structures.concat(addstructs);
		}	
	}

	if (structures.length === 0) 
	{ 
		//logObj(vtol, "getVTOLtarget no structures"); 
		// if there are no buildings target any trucks
		var enemyTrucks = [];
  
		playerData.forEach(function(player, id) {
			if (!allianceExistsBetween(me, id)) { // enemy player
				enemyTrucks = enemyTrucks.concat(enumDroid(id, DROID_CONSTRUCT));
			}
		});

		if (enemyTrucks[0]) { return enemyTrucks[0]; }
		return false; // no targets left
	}

	if (randomize) 
	{
		structures = shuffleArray(structures);
		logObj(vtol, "getVTOLtarget shuffle targets");
	}
	else
	{
		structures.sort(sortByDistToBase);
		logObj(vtol, "getVTOLtarget sortByDistToBase targets");
	}
	
	for (struct of structures)
	{
		// check to see if area is safe for vtol
		var threats = getAAthreats(struct);
		if (!threats || threats.length < 3)
		{
			if (threats && threats.length > 0)
			{
				// if returning an AA target check it for nearby AA first
				var threatsaa = getAAthreats(threats[0]);
				if (!threatsaa || threatsaa.length < 3)
				{
					logObj(vtol, "getVTOLtarget found "+threatsaa.length+" AA at AA-target location. returning AA-target");
					return threats[0];
				}
				else
				{
					logObj(vtol, "getVTOLtarget found "+threatsaa.length+" AA at AA-target location. checking next structure");
				}	
			}
			else
			{
				logObj(vtol, "getVTOLtarget found 0 AA at location. returning structure");
				return struct;
			}	
		}
		else
		{
			logObj(vtol, "getVTOLtarget found "+threats.length+" AA at location. checking next structure");
		}
	}
	return false;
}

function addAAthreats(AA)
{
	if (!AA || AA.length === 0) { log("addAAthreats no records to add"); return; }
	//log("addAAthreats:"+JSON.stringify(AA));
	
	for (threat of AA)
	{
		//log("threat:"+JSON.stringify(threat));
		if (!threat || threat.id == null || threat.x == null || threat.y == null) { logObj(threat, "addAAthreats not adding null threat"); continue; }
		if (!(threat.canHitAir === true && threat.canHitGround === false)) { logObj(threat, "addAAthreats not adding non-AA threat"); continue; }
		
		if (threat.type === STRUCTURE) 
		{
			if (threat.status === BUILT) // do not add unfinished AA sites
			{
				AAthreats.set(threat.id, {id: threat.id, x: threat.x, y: threat.y, type: threat.type,
					range: threat.range, name: threat.name, cost: threat.cost, player: threat.player} );
			}
		}
		else if (threat.type === DROID)
		{
			AAthreats.set(threat.id, {id: threat.id, x: threat.x, y: threat.y, type: threat.type, weapon: threat.weapons[0].id,
				range: threat.range, name: threat.name, cost: threat.cost, player: threat.player, isVTOL: threat.isVTOL} );
		}
		else
		{
			logObj(threat, "addAAthreats threat.type not STRUCTURE or DROID");
		}	
	}
}

function getAAthreats(loc)
{
	if (!loc) { return; }
	
	var threats = [];
	for (threat of AAthreats.values())
	{
		//log("getAAthreats threat:"+JSON.stringify(threat));
		if (!threat) { continue; }
		if (!threat.range) { threat.range = 24*128; }
		
		if (distBetweenTwoPoints(loc.x, loc.y, threat.x, threat.y) < (threat.range/128)+16) // add turnaround buffer
		{
			var threat_obj = getObject(threat.type, threat.player, threat.id);
			if (threat_obj && threat_obj.id) { threats.push(threat_obj); }
		}
	}

	//log("getAAthreats threats:"+JSON.stringify(threats));
	return threats;
}

function idleVtol(dr)
{
	var random = false;
	if (distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS) { random = true; }
	
	const target = getVTOLtarget(dr, random);

	if (target && target.stattype == LASSAT_STAT && dr.weapons[0].armed > 50 && dr.health > 70)
	{
		orderDroidObj(dr, DORDER_ATTACK, target);
		logObj(dr, "droidAware idle vtol droid ordered to attack lassat");
		return;
	}	
	if (target && target.stattype == UPLINK_STAT && dr.weapons[0].armed > 50 && dr.health > 70)
	{
		orderDroidObj(dr, DORDER_ATTACK, target);
		logObj(dr, "droidAware idle vtol droid ordered to attack uplink");
		return;
	}	
	if (target && dr.weapons[0].armed > 0 && dr.health > 85)
	{
		orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
		logObj(dr, "droidAware idle vtol droid ordered to scout to derrick:"+target.x+"x"+target.y);
		return;
	}
	else if (countStruct(VTOL_PAD_STAT) > 0 && (dr.weapons[0].armed < 100 || dr.health < 100))
	{
		orderDroid(dr, DORDER_REARM);
		logObj(dr, "droidAware idle less than full or damaged vtol droid ordered to REARM");
		return;
	}
	else 
	{
		// circle vtol factory
		const vtolFacs = enumStruct(me, VTOL_FACTORY_STAT).sort(sortByDistToBase);
		if (vtolFacs[0])
		{
			orderDroidLoc(dr, 40, vtolFacs[0].x, vtolFacs[0].y); // DORDER_CIRCLE
			logObj(dr, "droidAware idle vtol droid ordered to CIRCLE vtol factory");
			return;
		}				
	}
}

function idleAttacker(dr)
{
	// wait until ready
	if (groupSize(attackGroup) < MIN_GROUND_UNITS && groupSize(vtolGroup) < MIN_VTOL_UNITS) { return; }
	
	//enum targets
	var targets = [];
	const players = getAliveEnemyPlayers();
	for (player of players)
	{
		if (!allianceExistsBetween(me, player)) // enemy player
		{
			targets = targets.concat(enumStruct(player, DERRICK_STAT)).filter((obj) => (obj.status === BUILT));
			targets = targets.concat(enumStruct(player, FACTORY_STAT)).filter((obj) => (obj.status === BUILT));
			targets = targets.concat(enumStruct(player, CYBORG_FACTORY_STAT)).filter((obj) => (obj.status === BUILT));
			targets = targets.concat(enumStruct(player, VTOL_FACTORY_STAT)).filter((obj) => (obj.status === BUILT));
		}
	}

	// sort targets by dist to attacker
	targets.sort((obj1, obj2) => 
	{ 
		var dist1 = distBetweenTwoPoints(dr.x, dr.y, obj1.x, obj1.y);
		var dist2 = distBetweenTwoPoints(dr.x, dr.y, obj2.x, obj2.y);
		return (dist1 - dist2);
	} )
	var target = targets[0];
	// scout to closest target 
	if (target && target.id)
	{
		orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
		log("attacker "+dr.id+" scouting: "+target.x+"x"+target.y);
		orderLocations.set(dr.id, {x: target.x, y: target.y, enemies: true});
		return;
	}	
}

function idleRepair(droid)
{
	//get nearist combat DROID
	var combats = enumDroid(me, DROID_WEAPON).concat(enumDroid(me, DROID_CYBORG));
	combats.sort((obj1, obj2) => 
	{ 
		var dist1 = distBetweenTwoPoints(droid.x, droid.y, obj1.x, obj1.y);
		var dist2 = distBetweenTwoPoints(droid.x, droid.y, obj2.x, obj2.y);
		return (dist1 - dist2);
	} )	
	
	var target = combats[0];
	// guard it
	if (target && target.id)
	{
		orderDroidObj(droid, 25, target); // guard
		logObj(droid, "idle repair ordered to guard")
		orderTargets.set(droid.id, target.id);
		orderLocations.delete(droid.id);	
	}
}

function fireLassat(satellite)
{
	if (satellite.stattype !== LASSAT)
	{ 
		log("fireLassat passed non lassat:"+JSON.stringify(satellite)); 
		return;
	}
	
	var enemy_lassat = []; var enemy_vtol_fact = []; var enemy_fact = [];  var enemy_gen = []; var enemy_hq = [];
	var fired = false;
	
	// fire the laser sat at semi random target
	const players = getAliveEnemyPlayers();
	for (player of players) 
	{
		if (!allianceExistsBetween(me, player)) // enemy player
		{
			enemy_lassat = enemy_lassat.concat(enumStruct(player, LASSAT_STAT)).filter((obj) => (obj.status === BUILT));
			enemy_vtol_fact = enemy_vtol_fact.concat(enumStruct(player, VTOL_FACTORY_STAT)).filter((obj) => (obj.status === BUILT));
			enemy_fact = enemy_fact.concat(enumStruct(player, FACTORY_STAT)).filter((obj) => (obj.status === BUILT));
			enemy_generator = enemy_gen.concat(enumStruct(player, POW_GEN_STAT)).filter((obj) => (obj.status === BUILT));
			enemy_hq = enemy_hq.concat(enumStruct(player, PLAYER_HQ_STAT)).filter((obj) => (obj.status === BUILT));
		}
	}
	
	if (enemy_lassat.length > 0) 
	{ 
		var randomtarget = enemy_lassat[random(enemy_lassat.length-1)];
		fired = activateStructure(satellite, randomtarget); 
		logObj(satellite, "firing at lassat");
	}
	if (enemy_vtol_fact.length > 0 && fired === false) 
	{ 
		var randomtarget = enemy_vtol_fact[random(enemy_vtol_fact.length-1)];
		fired = activateStructure(satellite, randomtarget); 
		logObj(satellite, "fireLassat firing at vtol_fact player:"+randomtarget.player);
	}			
	if (enemy_fact.length > 0 && fired === false) 
	{ 
		var randomtarget = enemy_fact[random(enemy_fact.length-1)];
		fired = activateStructure(satellite, randomtarget); 
		logObj(satellite, "fireLassat firing at fact player:"+randomtarget.player);
	}	
	if (enemy_gen.length > 0 && fired === false) 
	{ 
		var randomtarget = enemy_gen[random(enemy_gen.length-1)];
		fired = activateStructure(satellite, randomtarget); 
		logObj(satellite, "fireLassat firing at generator player:"+randomtarget.player);
	}
	if (enemy_hq.length > 0 && fired === false) 
	{ 
		var randomtarget = enemy_hq[random(enemy_hq.length-1)];
		fired = activateStructure(satellite, randomtarget); 
		logObj(satellite, "fireLassat firing at hq player:"+randomtarget.player);
	}
	if (fired === false)
	{
		queue("fireLassat", 30000, satellite);
		logObj(satellite, "fireLassat did not fire retry");
	}
}

function getCommanderControlLimit(droid)
{
	// get brains
	var command_turret_brains = Upgrades[0]["Brain"]["Command Turret"];
	var base_control = command_turret_brains["BaseCommandLimit"];
	var rank_control = command_turret_brains["CommandLimitByLevel"];
	var rank_thresholds = command_turret_brains["RankThresholds"];
	rank_thresholds.shift(); // remove rank 0 green
	
	//get rank
 	var droid_rank = 0;
	for (threshold of rank_thresholds)
	{
		if (droid.experience >= threshold) { droid_rank++; }
	}
	
	// calc control
	return base_control+(rank_control*droid_rank);
}

function getStrongestAttackDroids()
{
	var support = new Map();
	const droids = enumGroup(attackGroup).concat(enumGroup(defendGroup)).concat(enumGroup(supportGroup)).filter((obj) => (obj.droidType == DROID_WEAPON));
	for (dr of droids)
	{
		var strength = dr.cost*(dr.bodySize+1)*(dr.experience/10);
		support.set(dr.id, strength);
		//log("support.set:"+dr.id+" str:"+strength);
	}
	const support_sort = new Map([...support.entries()].sort((a, b) => b[1] - a[1]));
	return Array.from( support_sort.keys() );
}

function getStrongestRepairDroids()
{
	var support = new Map();
	const droids = enumGroup(attackGroup).concat(enumGroup(defendGroup)).concat(enumGroup(supportGroup)).filter((obj) => (obj.droidType == DROID_REPAIR));
	for (dr of droids)
	{
		var strength = dr.cost*(dr.bodySize+1);
		support.set(dr.id, strength);
		//log("support.set:"+dr.id+" str:"+strength);
	}
	const support_sort = new Map([...support.entries()].sort((a, b) => b[1] - a[1]));
	return Array.from( support_sort.keys() );
}

function findMostExpDroid()
{
	const droids = enumGroup(attackGroup).concat(enumGroup(defendGroup));
	var most_exp = 0;
	var most_exp_droid;
	
	for (dr of droids)
	{
		if (dr.experience > most_exp)
		{
			most_exp_droid = dr;
			most_exp = dr.experience;
		}
	}
	return most_exp_droid;
}

// not working
function getStrongestEnemyPlayer()
{
	var playerStrength = [];
	var most_str = 0;
	var most_str_player = 0;
	
	const players = getAliveEnemyPlayers();
	for (player of players)
	{
		const player_droids = enumDroid(player);
		const player_base = enumStruct(player);
		for (dr of player_droids)
		{
			playerStrength[player] = (dr.cost * (dr.bodySize+1)) + playerStrength[player];
		}
		for (st of player_base)
		{
			playerStrength[player] = st.cost + playerStrength[player];
		}
	}
	for (player of playerStrength)
	{
		if (playerStrength[player] == null) { continue; }
		if (playerStrength[player] > most_str)
		{
			most_str_player = player;
			most_str = playerStrength[player];
		}		
	}
	//log("strongest enemy player:"+most_str_player);
	return most_str_player;
}
