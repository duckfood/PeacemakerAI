function eventDroidBuilt(droid, struct)
{
	if (DEBUG_EXTREME) {log("eventDroidBuilt");}
	const dr = droid;  //log(JSON.stringify(droid));

	if (droid.isVTOL)
	{
		totalVtolsBuilt ++;
		groupAdd(vtolGroup, droid);

		var target = getVTOLtarget(droid,true);
		if (target) 
		{
			orderDroidLoc(droid, DORDER_SCOUT, target.x, target.y);
			logObj(droid, "new vtol droid ordered to scout to target:"+target.x+"x"+target.y);
		}
	}
	else if (droid.droidType === DROID_WEAPON)
	{
		logObj(droid, "attack droid built: "+droid.weapons[0].name);
		groupAdd(attackGroup, droid);
		log("added to attack group: " + droid.id);
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
		else if (enumGroup(oilBuilders).length < MIN_OIL_TRUCKS*2) { groupAdd(oilBuilders, droid); }
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

function eventAttacked(victim, attacker)
{
	if (DEBUG_EXTREME) {log("eventAttacked");}
	// check for repairs
	if (victim.type === DROID && victim.player === me) { droidNeedsRepair(victim.id); }

	// keep track of AA attacks
	if (victim && attacker && victim.isVTOL && victim.player === me && attacker.canHitAir === true && attacker.canHitGround === false && !allianceExistsBetween(attacker.player, me)) 
	{ 
		const AA = [attacker];
		addAAthreats(AA);
	}
	
	if (attacker && victim && attacker.player !== me && !allianceExistsBetween(attacker.player, me))
	{
		//Flee if we are very outnumbered
		if (victim.type === DROID && victim.player === me && victim.isVTOL === false)
		{
			const seenEnemyGroup = enumRange(victim.x, victim.y, GROUP_SCAN_RADIUS*2, ENEMIES, true).filter((obj) => 
				(obj.isVTOL === false && obj.player !== scavengerPlayer && !(obj.canHitAir === true && obj.canHitGround === false) && 
				(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.droidType === DROID_REPAIR || obj.stattype === DEFENSE)) );
				
			const seenAllyGroup = enumRange(victim.x, victim.y, GROUP_SCAN_RADIUS*2, ALLIES, true).filter((obj) => 
				(obj.isVTOL === false && (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.droidType === DROID_COMMAND || obj.droidType === DROID_REPAIR || obj.stattype === DEFENSE)) );
			
			var allyhealth = 0;
			var enemyhealth = 0;

			// since hitpoints are not available in the jsapi use cost and bodysize instead
			for (seen of seenEnemyGroup)
			{ 
				if (seen.cost == null) { seen.cost = 100; }
				if (seen.bodySize == null) { seen.bodySize = 1; }
				enemyhealth += seen.cost*(seen.bodySize+1)*(seen.health/100); 
			}
			for (seen of seenAllyGroup)
			{ 
				if (seen.cost == null) { seen.cost = 100; }
				if (seen.bodySize == null) { seen.bodySize = 1; }
				allyhealth += seen.cost*(seen.bodySize+1)*(seen.health/100);  
			}
			
			//log("ally:"+allyhealth+" enemy:"+enemyhealth);
			//logObj(victim, JSON.stringify(victim));
			if (allyhealth*1.2 < enemyhealth)
			{
				for (seenally of seenAllyGroup)
				{
					if (seenally.type === DROID && seenally.player === me && distBetweenTwoPoints(seenally.x, seenally.y, BASE.x, BASE.y) > AVG_BASE_RADIUS)
					{
						orderDroid(seenally, DORDER_RTB);
						log("droid "+seenally.id+" RTB allyhealth*1.2 < enemyhealth ally:"+allyhealth+" enemy:"+enemyhealth);
						orderTargets.delete(seenally.id);
						orderLocations.delete(seenally.id);
					}
				}
			}
		}

		if (attacker.type === DROID && attacker.isVTOL)
		{
			enemyHasVtol = true; //Definitely has VTOLs.
		}

		var defenders;
		var loc = {x: attacker.x, y: attacker.y };
		
		if (groupSize(defendGroup) > MIN_ATTACK_GSIZE)
		{
			defenders = enumGroup(defendGroup);
		}
		else 
		{
			defenders = enumGroup(attackGroup).concat(enumGroup(defendGroup));
		}
		var len = defenders.length;
		// use vtol defend time to throttle tank defend orders
		if (len >= MIN_GROUND_UNITS && attacker.isVTOL === false && !ThrottleThis("eventAttacked_Throttle_ground", VTOL_DEFEND_TIME*3))
		{
			for (let i = 0; i < len; ++i)
			{
				var dr = defenders[i];
				if (droidNeedsRepair(dr.id) === false && dr.id !== victim.id && dr.order !== DORDER_RTB) //  && (dr.action === 0 || dr.action === 9)
				{
					if (dr.droidType == DROID_REPAIR) // droidAware will grab them
					{		
						//var defrand = defenders[random(len)];
						//orderDroidObj(dr, 25, defrand); // DORDER_GUARD
						//log("repair droid "+dr.id+" guarding:"+defrand.id);
					}
					else 
					{
						orderDroidLoc(dr, DORDER_SCOUT, loc.x, loc.y);
						log("defend droid "+dr.id+" scouting: "+loc.x+"x"+loc.y);
						orderLocations.set(dr.id, {x: loc.x, y: loc.y, enemies: true});
					}
				}
			}
		}

		var vtols = enumGroup(vtolGroup);
		var vtolLen = vtols.length;

		if (vtolLen > MIN_VTOL_UNITS -2)
		{
			// check to make sure location is safe for vtol
			var AA = getAAthreats(loc);
			if (AA && AA.length > 2) { logObj(vt, "vtol not sent on defend mission AA"); return; }
			
			for (let j = 0; j < vtolLen; ++j)
			{
				var vt = vtols[j];
				if (vtolReady(vt.id) === true && vt.order !== DORDER_ATTACK && !ThrottleThis("eventAttacked_throttle_Vtol", VTOL_DEFEND_TIME))
				{
					orderDroidLoc(vt, DORDER_SCOUT, loc.x, loc.y);
					logObj(vt, "vtol sent on defend mission"); //+JSON.stringify(vt));
				}
			}
		}
	} // if attacker
} // eventAttacked

function eventStructureReady(structure)
{
	if (DEBUG_EXTREME) {log("eventStructureReady");}
	// done with a timer
	//if (structure.stattype === LASSAT) { fireLassat(structure); }
}

function eventDroidIdle(droid)
{
	if (DEBUG_EXTREME) {log("eventDroidIdle");}
	const dr = droid;
	
	if (droid.droidType === DROID_CONSTRUCT && droid.group === oilBuilders)
	{
		var enemyDerrs;
		if (!ThrottleThis("eventDroidIdle"+droid.id+"Throttle1", 5000))
		{
			enemyDerrs = enumRange(droid.x, droid.y, ENEMY_DERRICK_SCAN_RANGE, ENEMIES, false).filter(isDerrick);
		}
		//most likely an enemy truck got the oil before us, so try to build a defense near it.
		if (enemyDerrs && enemyDerrs.length > 0)
		{
			//scanAndDefendPosition(undefined, droid);
			var buildloc;
			const randDer = enemyDerrs[random(enemyDerrs.length-1)];
			var defense = returnDefense(0);
			if (defense && defense.length > 1) { buildloc = pickStructLocation(droid, defense, randDer.x, randDer.y, 1); }
			const enemies = enumRange(randDer.x, randDer.y, 8, ENEMIES, false).filter((obj) => 
				(!(obj.canHitAir === true && obj.canHitGround === false) && (obj.droidType === DROID_WEAPON ||
				 obj.droidType === DROID_CYBORG || (obj.stattype === DEFENSE && obj.status === BUILT))));
			if (!enemies[0] && buildloc && buildloc.length > 0)
			{
				orderDroidBuild(droid, DORDER_BUILD, defense, buildloc.x, buildloc.y);
				orderLocations.set(dr.id, {x: buildloc.x, y: buildloc.y});
				log("idle constructor build defense nearby undefended enemy derrick "+dr.id);
			}
			else
			{
				idleConstructor(droid);
			}
		}
		else
		{
			idleConstructor(droid);
		}
	}
	else if (droid.isVTOL) 
	{
		// get a new target
		idleVtol(droid);
	}
	else if (droid.droidType === DROID_REPAIR && droid.group !== vtolRepairGroup)
	{
		idleRepair(droid);
	}
	else if (droid.droidType === DROID_WEAPON || droid.droidType === DROID_CYBORG)
	{
		idleAttacker(droid);
	}
	else if (droid.droidType === DROID_SENSOR)
	{

	}
}

//Target enemy player closest to whose objects are closest to the beacon.
function eventBeacon(x, y, from, to, message)
{
	if (DEBUG_EXTREME) {log("eventBeacon");}
	if (allianceExistsBetween(from, to) && to !== from)
	{
		//log(from + " sent a beacon. Location [" + x + ", " + y + "]");
		const BEACON_SCAN_RADIUS = 4;
		var enemyObjects = enumRange(x, y, BEACON_SCAN_RADIUS, ENEMIES, false);
		if (enemyObjects.length > 0)
		{
			for (let i = 0, l = enemyObjects.length; i < l; ++i)
			{
				var obj = enemyObjects[i];
				if (obj)
				{
					setPlayerAsTarget(obj.player);
					break;
				}
			}
		}
	}
}

function eventObjectTransfer(obj, whofrom)
{
	if (DEBUG_EXTREME) {log("eventObjectTransfer");}
	if (obj.player === me)
	{
		if (obj.type === DROID)
		{
			eventDroidBuilt(obj, null); //put it in a group
		}
	}
}

function eventDestroyed(object)
{
	if (DEBUG_EXTREME) {log("eventDestroyed");}
	if (!object || !object.id) { return; }
	logObj(object, "destroyed");

	if (object.player !== me && AAthreats.has(object.id))
	{
		AAthreats.delete(object.id);
	}	
	if (object.player === me && object.type === DROID && orderLocations.has(object.id))
	{
		orderLocations.delete(object.id);
	}
	if (object.player === me && object.type === DROID && orderTargets.has(object.id))
	{
		orderTargets.delete(object.id);
	}
	if (object.player === me && object.isVTOL)
	{
		totalVtolsLost ++;
		if (totalVtolsBuilt < totalVtolsLost*2)
		{ relyOnVtols = false; }
	}
	if (object.player === me && object.droidType === DROID_CYBORG)
	{
		totalCyborgLost ++;
		if (totalVtolsBuilt < totalVtolsLost*2)
		{ relyOnCybrogs = false; }
	}
}

function eventStructureBuilt(structure, droid)
{	
	if (DEBUG_EXTREME) {log("eventStructureBuilt");}
	// dump details about building
	//log(JSON.stringify(structure));

	// update lastBuildLoc
	if (structure && !structure.modules && (structure.stattype === FACTORY || structure.stattype === RESEARCH_LAB || structure.stattype === POWER_GEN || structure.stattype === VTOL_FACTORY))
	{
		// randomize last build location
		//lastBuildLoc = { x: structure.x-(random(8)-4), y: structure.y-(random(8)-4) };
		lastBuildLoc = structure;
		logObj(droid, structure.name+" lastBuildLoc:"+JSON.stringify(lastBuildLoc));
	}
	if (distBetweenTwoPoints(lastBuildLoc.x, lastBuildLoc.y, BASE.x, BASE.y) > 6)
	{
		lastBuildLoc = {x: BASE.x, y: BASE.y};
	}

	// upgrade power plant if possible as it costs nothing and is absolutly essential
	if (structure && droid && structure.stattype === POWER_GEN && structure.modules < 1 && isStructureAvailable("A0PowMod1"))
	{
		orderDroidBuild(droid, DORDER_BUILD, "A0PowMod1", structure.x, structure.y);
		orderLocations.set(droid.id, {x: structure.x, y: structure.y, enemies: false});
		return;
	}
	// upgrade vtol factories but only if there is a power generator
	if (relyOnVtols && countStruct(POW_GEN_STAT) > 0 && structure && droid && structure.stattype === VTOL_FACTORY && structure.modules < 2 && isStructureAvailable("A0FacMod1"))
	{
		orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", structure.x, structure.y);
		orderLocations.set(droid.id, {x: structure.x, y: structure.y, enemies: false});
		return;
	}
	// upgrade factories but only if there is 1 power generator
	if (countStruct(POW_GEN_STAT) > 0 && structure && droid && structure.stattype === FACTORY && structure.modules < 2 && isStructureAvailable("A0FacMod1"))
	{
		orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", structure.x, structure.y);
		orderLocations.set(droid.id, {x: structure.x, y: structure.y, enemies: false});
		return;
	}
	// check if constructor sees oil to build on
	if (dr.group === oilBuilders)
	{
		var oils = enumRange(droid.x, droid.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
		if (oils && oils.length > 0)
		{
			for (oil of oils)
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
	// don't build defenses in base here
	var dist = distBetweenTwoPoints(BASE.x, BASE.y, structure.x, structure.y);
	if (!droid || dist <= AVG_BASE_RADIUS)
	{
		return;
	}

	if (gameTime > 60000) { scanAndDefendPosition(structure, droid); }
}

function eventChat(from, to, message)
{
	if (DEBUG_EXTREME) {log("eventChat");}
	if (to !== me || to === from)
	{
		return; // not for me
	}
	if (message === "donatetruck" && allianceExistsBetween(from, to))
	{
		// donate first truck
		var droids = enumDroid(me, DROID_CONSTRUCT);
		if (droids.length > 0)
		{
			donateObject(droids[0], from);
		}
	}
	else if (message === "donatepower" && allianceExistsBetween(from, to))
	{
		donatePower(playerPower(me) / 2, from);
	}
	else if (message === "antiair" && allianceExistsBetween(from, to))
	{
		enemyHasVtol = true;
	}
	else if (message === "crazycolours")
	{
		setSunIntensity(0.6, 0.4, 0.3,  1.0, 0.8, 0.7,  1.2, 0.9, 0.8);
	}
}
