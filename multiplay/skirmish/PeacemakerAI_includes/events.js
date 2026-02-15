function eventDroidBuilt(droid, struct)
{
	const dr = droid;
	orderDroid(droid, DORDER_STOP);
	if (droid.droidType === DROID_WEAPON && droid.body === "Body1REC" && droid.weapons[0].id === "Cannon4AUTOMk1")
	{
		orderDroid(droid, DORDER_RECYCLE);
		logObj(droid, "recycle viper hvc");
		return;
	}
	
	if (isVTOL(droid))
	{
		groupAdd(vtolGroup, droid);
		var target = getVTOLtarget(droid,true);
		if (target) 
		{
			orderDroidLoc(droid, DORDER_SCOUT, target.x, target.y);
			logObj(droid, "new vtol droid ordered to scout to target:"+target.x+"x"+target.y);
		} 
	}
	else if (droid.droidType === DROID_WEAPON || droid.droidType === DROID_CYBORG)
	{
		logObj(droid, "attack droid built: "+droid.weapons[0].name);
		groupAdd(attackGroup, droid);
		log("added to attack group: " + droid.id);
	}
	else if (droid.droidType === DROID_CONSTRUCT)
	{
		if (enumGroup(baseBuilders).length < MIN_BASE_TRUCKS)
		{
			groupAdd(baseBuilders, droid);
		}
		else if (enumGroup(oilBuilders).length < MIN_OIL_TRUCKS)
		{
			groupAdd(oilBuilders, droid);
		}
		else if (enumGroup(baseBuilders).length < MAX_BASE_TRUCKS)
		{
			groupAdd(baseBuilders, droid);
		}
		else
		{
			groupAdd(oilBuilders, droid);
		}
		//else
		// {
		// 	var oilclusterID = getLargestOilClusterID();
		// 	if (oilclusterID && random(100) < 50)
		// 	{
		// 		var oil = enumFeature(ALL_PLAYERS, OIL_RES_STAT).filter((obj) => (obj.id === oilclusterID && obj.stattype === OIL_RESOURCE));
		// 		if (oil[0])
		// 		{
		// 			orderDroidLoc(droid, DORDER_MOVE, oil[0].x, oil[0].y);
		// 			orderLocations.set(droid.id, {x: oil[0].x, y: oil[0].y, enemies: false});
		// 			logObj(droid, "new oil truck sent to oil cluster at:"+oil[0].x+"x"+oil[0].y);
		// 			return;
		// 		}
		// 	}
		// }
		//checkLocalJobs();
	}
	else if (droid.droidType === DROID_REPAIR)
	{ 
		//log(JSON.stringify(droid));
		if ((groupSize(vtolRepairGroup) < 1 && countStruct(VTOL_PAD_STAT) > 4) || (groupSize(vtolRepairGroup) < 2 && countStruct(VTOL_PAD_STAT) > 12))
		{
			groupAdd(vtolRepairGroup, droid);
			log("added repair to vtolrepairgroup: "+droid.id);
		}
		else
		{
			groupAdd(attackGroup, droid); 
			log("added repair to attack group: "+droid.id);
			
			var droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.droidType === DROID_WEAPON && obj.isVTOL === false));
			if (!droids[0]) { droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, me, true).filter((obj) => (obj.droidType === DROID_CYBORG)); }
			if (!droids[0]) // find a droid to guard
			{
				var attackgroup = enumGroup(attackGroup);
				var defrand = attackgroup[random(attackgroup.length-1)];
				orderDroidObj(dr, 25, defrand); // DORDER_GUARD
				orderTargets.set(dr.id, defrand.id);
				log("new repair droid "+dr.id+" guarding:"+defrand.id);
			}
			else
			{
				var defrand = droids[random(droids.length-1)];
				orderDroidObj(dr, 25, defrand); // DORDER_GUARD
				orderTargets.set(dr.id, defrand.id);
				log("new repair droid "+dr.id+" guarding nearby:"+defrand.id);
			}
		}
	}
	else if (droid.droidType === DROID_SENSOR)
	{ 
		groupAdd(sensorGroup, droid);
		logObj(droid, "added sensor to sensorgroup");
	}
	else if (droid.droidType === DROID_COMMAND)
	{ 
		log("built command droid: ");
		log(JSON.stringify(droid));
		
		// if commanderGroup is empty add to group otherwise recycle
		// needs to recycle weakist and swap pilot
		if (enumGroup(commanderGroup).length < 1)
		{
			groupAdd(commanderGroup, droid);
			logObj(droid, "added command to commandgroup");
			// swap most exp pilot into commander -- recycle swap is unreliable
			var exp_droid = findMostExpDroid();
			var droid_exp = droid.experience;
			if (droid_exp)
			{	
				setDroidExperience(droid, exp_droid.experience);
				setDroidExperience(exp_droid, droid_exp);
			}
		}
		else
		{
			orderDroid(droid, DORDER_RECYCLE);
			logObj(droid, "recycled extra command droid");
		}
	}	
}

function eventAttacked(victim, attacker)
{
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
		
		// keep track of who attacks my derricks
//		if (victim.type === STRUCTURE && victim.stattype === RESOURCE_EXTRACTOR)
//		{
//			derrickAttacks[attacker.player] += 1;
//			logObj(victim, "derrickAttacks:"+JSON.stringify(derrickAttacks));
//		}
	
//		var enemyNumber = getCurrentEnemy();
//		if (!defined(enemyNumber))
//		{
//			return;
//		}

		//Set this player as the current enemy. Also, only do this if they are
		//somewhat close to our base so our units don't shuffle around rapidly
		//picking many different players to focus on in intense multi-battles.
//		if (enemyNumber !== attacker.player && distBetweenTwoPoints(attacker.x, attacker.y, BASE.x, BASE.y) <= (AVG_BASE_RADIUS + 20))
//		{
//			setPlayerAsTarget(attacker.player);
//		}

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
	if (structure.stattype === LASSAT) { fireLassat(structure); }
}

function eventDroidIdle(droid)
{
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
				(!(obj.canHitAir === true && obj.canHitGround === false) && (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || (obj.stattype === DEFENSE && obj.status === BUILT))) );
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
		var attackgroup = enumGroup(attackGroup, DROID_WEAPON);
		var defrand = attackgroup[random(attackgroup.length-1)];
		if (defrand) 
		{
			orderDroidObj(dr, 25, defrand); // DORDER_GUARD
			orderTargets.set(dr.id, defrand.id);
			log("droidAware repair droid "+dr.id+" guarding:"+defrand.id);
		}
	}
	else if (droid.droidType === DROID_WEAPON || droid.droidType === DROID_CYBORG)
	{
		idleAttacker(droid);
	}
	else if (droid.droidType === DROID_REPAIR)
	{
		idleRepair(droid);
	}	
	else if (droid.droidType === DROID_COMMAND)
	{
		droidAwareCommander();
	}
}

//Target enemy player closest to whose objects are closest to the beacon.
function eventBeacon(x, y, from, to, message)
{
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

function eventObjectTransfer(obj, from)
{
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
	logObj(object, "destroyed");
	
	if (object && object.player !== me && AAthreats.has(object.id))
	{
		AAthreats.delete(object.id);
	}	
	if (object && object.player === me && object.type === DROID && orderLocations.has(object.id))
	{
		orderLocations.delete(object.id);
	}
	if (object && object.player === me && object.type === DROID && orderTargets.has(object.id))
	{
		orderTargets.delete(object.id);
	}
}

function eventStructureBuilt(structure, droid)
{	
	if (structure && !structure.modules && (structure.stattype === FACTORY || structure.stattype === RESEARCH_LAB || structure.stattype === POWER_GEN || structure.stattype === VTOL_FACTORY))
	{
		// randomize last build location
		lastBuildLoc = { x: structure.x-(random(4)), y: structure.y-(random(4)) };
		logObj(droid, structure.name+" lastBuildLoc:"+JSON.stringify(lastBuildLoc));
	}
	
	// upgrade power plant if possible as it costs nothing and is absolutly essestial
	if (structure && droid && structure.stattype === POWER_GEN && structure.modules < 1 && isStructureAvailable("A0PowMod1"))
	{
		orderDroidBuild(droid, DORDER_BUILD, "A0PowMod1", structure.x, structure.y);
		orderLocations.set(droid.id, {x: structure.x, y: structure.y, enemies: false});
		return;
	}
	// upgrade vtol factories 
	if (structure && droid && structure.stattype === VTOL_FACTORY && structure.modules < 2 && isStructureAvailable("A0FacMod1"))
	{
		orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", structure.x, structure.y);
		orderLocations.set(droid.id, {x: structure.x, y: structure.y, enemies: false});
		return;
	}
	// upgrade factories but only if there is 2 power generator and hq
	if (countStruct(POW_GEN_STAT) > 1 && countStruct(PLAYER_HQ_STAT) > 0 && structure && droid && structure.stattype === FACTORY && structure.modules < 2 && isStructureAvailable("A0FacMod1"))
	{
		orderDroidBuild(droid, DORDER_BUILD, "A0FacMod1", structure.x, structure.y);
		orderLocations.set(droid.id, {x: structure.x, y: structure.y, enemies: false});
		return;
	}
	// don't build defenses in base here
	var dist = distBetweenTwoPoints(BASE.x, BASE.y, structure.x, structure.y);
	if (!droid || dist <= AVG_BASE_RADIUS)
	{
		return;
	}

	scanAndDefendPosition(structure, droid);
}
	
function eventGroupLoss(gameObject, groupID, groupSize)
{
	//logObj(gameObject, "droid lost group:"+groupID+" size now:"+groupSize);
	if (groupID == commanderGroup)
	{
		// reassign supportgroup to attackgroup
		var supportgroup = enumGroup(supportGroup);
		for (dr of supportgroup)
		{
			groupAdd(attackGroup, dr);
			orderDroid(dr, DORDER_STOP);
		}
	}
}

function eventChat(from, to, message)
{
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
