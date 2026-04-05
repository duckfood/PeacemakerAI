function droidAwareAttacker()
{
	if (DEBUG_EXTREME) {log("droidAware");}
	//const droidAware = enumGroup(attackGroup).concat(enumGroup(defendGroup));
	const droidAware = enumDroid(me, DROID_CYBORG).concat(enumDroid(me, DROID_WEAPON));
	for (dr of droidAware)
	{
		// stop scouting droids from returning to position
		if (dr.order === DORDER_SCOUT && dr.action === 38)
		{
			orderDroidLoc(dr, DORDER_SCOUT, dr.x, dr.y);
			logObj(dr, "droidAware found scouting non vtol returning to position");
			orderLocations.delete(dr.id);
			continue;
		}
		// catch attack droids that have fallen idle while guarding
		if (dr.order === 25 && dr.action === 0)
		{
			idleAttacker(dr);
			continue;
		}
		// check for damaged droids stuck on scout 
		if (dr.health < 85 && dr.order === DORDER_SCOUT || dr.order === DORDER_ATTACK)
		{ 
			droidNeedsRepair(dr.id);
			continue;
		}
		// make very damaged attackers retreat to repair fac
		if (dr.health < 20)
		{
			orderDroid(dr, DORDER_RTR);
			logObj(dr, "very damaged attacker ordered to RTR");
			continue;
		}
		if (dr.order === DORDER_RTR && dr.health > 80)
		{
			orderDroid(dr, DORDER_STOP);
			logObj(dr, "healtly attacker ordered to stop RTR");
			continue;
		}
		// rtb if on buring tileIsBurning
		if (tileIsBurning(dr.x, dr.y))
		{
			orderDroid(dr, DORDER_RTB);
			logObj(dr, "droid on buring tile ordered to RTB");
			continue;
		}
	}
}

function droidAwareSensor()
{
	if (DEBUG_EXTREME) {log("droidAwareSensor");}
	const droidAware = enumGroup(sensorGroup);
//	const sensorDroids = enumDroid(me, DROID_SENSOR);
	// must use unique var drs due to scope leakage dr is a repair droid!
	for (drs of droidAware)
	{
		if (drs.droidType !== DROID_SENSOR) { continue; }
		if (drs.order === DORDER_RTR && drs.health > 80)
		{
			orderDroid(drs, DORDER_STOP);
			logObj(drs, "undamaged sensor ordered to stop RTR");
		}
		if (drs.order === DORDER_RTR || drs.order === DORDER_RTB) { continue; }

		// rtb if on buring tileIsBurning
		if (tileIsBurning(dr.x, dr.y))
		{
			orderDroid(dr, DORDER_RTB);
			logObj(dr, "droid on buring tile ordered to RTB");
			continue;
		}
		const objects = enumRange(drs.x, drs.y, GROUP_SCAN_RADIUS*3, ALL_PLAYERS, true);
		const enemy_objects = objects.filter((obj) => (obj.type !== FEATURE && !allianceExistsBetween(me, obj.player)) );
		const AA = enemy_objects.filter((obj) => (obj.canHitAir === true && obj.canHitGround === false));
		//const enemies = enemy_objects.filter((obj) => (!(obj.canHitAir === true && obj.canHitGround === false) &&
		//		(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || (obj.stattype === DEFENSE && obj.status === BUILT))) );
		
		// update AAthreats
		if (AA && AA.length > 0) { addAAthreats(AA); }

		if (drs.health < 80 && drs.order !== DORDER_RTR)
		{
			orderDroid(drs, DORDER_RTR);
			logObj(drs, "damaged sensor ordered to RTR");
			continue;
		}

		// escort the most exp attack droid
		if (random(100) > 89)
		{
			var new_escort = findMostExpDroid();
			if (new_escort && new_escort.id)
			{
				orderDroidObj(drs, 25, new_escort); // defend
				logObj(drs, "sensor ordered to escort: "+new_escort.id);
			}
		}
	}	
}	

function droidAwareVtol()
{
	if (DEBUG_EXTREME) {log("droidAwareVtol");}
	const droidAware = enumGroup(vtolGroup);
	for (dr of droidAware)
	{ 	
		if (!dr.isVTOL) { continue; }
	
		if (dr.health < 65 && dr.order === DORDER_SCOUT)
		{ 
			droidNeedsRepair(dr.id);
			orderLocations.delete(dr.id);
			orderTargets.delete(dr.id);
			logObj(dr, "droidAware found scouting vtol in need of repair:");
			continue;
		}
		// if scouting vtol spots mass AA retreat, otherwise attack the AA
		if (dr.order === DORDER_SCOUT || dr.order === DORDER_ATTACK)
		{
			var AA = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*4, ENEMIES, true).filter((obj) => (obj.canHitAir === true && obj.canHitGround === false));
			if (AA && AA.length > 0) { addAAthreats(AA); }
			
			var threats = [];
			threats = getAAthreats(dr);
			
			if (threats && threats.length > 3) // mass AA
			{
				orderDroid(dr, DORDER_RTB);
				logObj(dr, "droidAware scouting vtol spotted mass AA:"+threats.length);
				continue;
			}
			else if (threats && threats.length > 0 && dr.weapons[0].armed > 0 && dr.health > 65)
			{
				var threats_aa = getAAthreats(threats[0]);
				if (threats_aa && threats_aa.length < 3)
				{
					orderDroidObj(dr, DORDER_ATTACK, threats[0]);
					logObj(dr, "droidAware scouting vtol ordered to attack AA - call in support");

					// call in air support
					for (dr2 of droidAware)
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
			AA = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*4, ENEMIES, true).filter((obj) => (obj.canHitAir === true && obj.canHitGround === false));
			if (AA && AA.length > 0) { addAAthreats(AA); }
			
			var threats = getAAthreats(dr);
			var target = getVTOLtarget(dr);
			
			if (threats && threats.length > 2) // mass AA
			{
				//orderDroid(dr, DORDER_REARM);
				logObj(dr, "droidAware rearming vtol spotted mass AA:"+threats.length);
				continue;
			}
			else if (threats && threats.length > 0)
			{
				var threats_aa = getAAthreats(threats[0]);
				if (threats_aa && threats_aa.length < 3)
				{
					orderDroidObj(dr, DORDER_ATTACK, threats[0]);
					logObj(dr, "droidAware scouting vtol ordered to attack AA");
					continue;
				}			
			}
			else if (target)
			{
				orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
				logObj(dr, "droidAware rearming vtol ordered to scout to target");
			}
		}

		// make sure vtol on scout does not go home with ammo if it sees ememies or there is a derrick to blast
		if (dr.order === DORDER_SCOUT && dr.weapons[0].armed > 0 && dr.health > 65 && 
		   (dr.action === 32 || dr.action === 33 || dr.action === 34 || dr.action === 38))
		{
			var target = getVTOLtarget(dr);
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
		// idle vtol
		if (dr.order === 0 || dr.action === 0) 
		{
			idleVtol(dr);
			continue;
		}	
	}
}

function droidAwareRepair()
{
	if (DEBUG_EXTREME) {log("droidAwareRepair");}
	// handle repair droids
	const droidAware = enumDroid(me, DROID_REPAIR);
	for (dr of droidAware)
	{
		if (dr.droidType !== DROID_REPAIR) { continue; }
		if (dr.group === vtolRepairGroup) { continue; }

		if (dr.order === 0 || (dr.order === 25 && dr.action === 0))
		{
			orderDroidLoc(dr, DORDER_MOVE, dr.x-1+random(1), dr.y-1+random(1));
			logObj(dr, "droidAware idle or guarding nothing repair droid ordered to MOVE");
			continue;
		}

		// repair guard most damaged combat or repair droid nearby
		if (dr.order !== DORDER_RTB && dr.order !== DORDER_SCOUT )
		{
			var guarding = 0;
			if (orderTargets.has(dr.id)) { guarding = getObject(DROID, me, orderTargets.get(dr.id)); }
			
			// try for tanks first
			var droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*4, me, true).filter((obj) =>
				(obj.isVTOL === false && (obj.droidType === DROID_WEAPON)) );
			// no tanks try for cyborgs
			if (!droids || droids.length === 0)
			{
				droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*4, me, true).filter((obj) =>
				(obj.isVTOL === false && (obj.droidType === DROID_CYBORG)) );
			}
			// repair droids nearby
			if (droids && droids.length > 0)
			{
				var lowesthealth = 100;
				var guardit = 0;
				for (drg of droids)
				{
					if (drg.health < lowesthealth)
					{
						lowesthealth = drg.health;
						guardit = drg;
					}
				}
				if (lowesthealth < 80)
				{
					if (!guarding || guardit && guarding.id !== guardit.id)
					{
						orderDroidObj(dr, 25, guardit);
						orderTargets.set(dr.id, guardit.id);
						logObj(dr, "droidAware repair droid ordered to repair most damaged droid:"+guardit.id);
					}
				}
				else // go back to guarding random nearby combat droid
				{
					// if not already guarding attacker
					if (guarding && !(guarding.droidType === DROID_WEAPON || guarding.droidType === DROID_CYBORG))
					{
						var defrand = droids[random(droids.length-1)];
						if (defrand)
						{
							orderDroidObj(dr, 25, defrand); // DORDER_GUARD
							orderTargets.set(dr.id, defrand.id);
							log("droidAware repair droid "+dr.id+" guarding nearby:"+defrand.id);
						}
					}
				}
			}
		}		
	}	
}
	
function droidAwareScout()
{
	if (DEBUG_EXTREME) {log("droidAwareScout");}
	checkOrderLocations();
	
	const droidAware = enumGroup(attackGroup).concat(enumGroup(defendGroup));
	for (dr of droidAware)
	{
		// check if scouting droid is very near target 
		if (orderLocations.has(dr.id) && dr.order === DORDER_SCOUT && (dr.droidType === DROID_COMMAND || dr.droidType === DROID_WEAPON || dr.droidType === DROID_CYBORG) )
		{
			var scoutLoc = orderLocations.get(dr.id);

			if (scoutLoc && scoutLoc.x && scoutLoc.y)
			{
				//logObj(dr, "checking stuck scout location:"+scoutLoc.x+"x"+scoutLoc.y);
				if (scoutLoc.x >= 0 && scoutLoc.y >= 0 && distBetweenTwoPoints(dr.x, dr.y, scoutLoc.x, scoutLoc.y) < 4)
				{
					orderDroidLoc(dr, DORDER_SCOUT, dr.x, dr.y);
					logObj(dr, "droidAware found scout very close to target location");
					orderLocations.delete(dr.id);
					continue;
				}
			}
		}
		// check combat scout locations for ememies, cancel scout order if none
		if (orderLocations.has(dr.id) && dr.order === DORDER_SCOUT && (dr.droidType === DROID_COMMAND || dr.droidType === DROID_WEAPON || dr.droidType === DROID_CYBORG))
		{
			var scoutLoc = orderLocations.get(dr.id);
			//logObj(dr, "checking scout location for ememies1:"+scoutLoc["x"]+"x"+scoutLoc["y"]);
			if (scoutLoc && scoutLoc.x && scoutLoc.y)
			{
				//logObj(dr, "checking scout location for ememies2:"+scoutLoc["x"]+"x"+scoutLoc["y"]);
				if (scoutLoc.x >= 0 && scoutLoc.y >= 0)
				{
					if (scoutLoc.enemies === false)
					{
						orderDroidLoc(dr, DORDER_SCOUT, dr.x, dr.y);
						logObj(dr, "scouting combat droid ordered to guard as scout location is free of enemies");
						orderLocations.delete(dr.id);
						continue;
					}
				}
			}
		}
		// if attacking close to a repair facility take it out, but not before the trucks
		// update AA threats too
		if (dr.action === 6 && (dr.order === DORDER_SCOUT || dr.order === 25) && (dr.droidType === DROID_WEAPON || dr.droidType === DROID_CYBORG))
		{
			var objects = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*1.5, ENEMIES, true);
			var repairfacs = objects.filter((obj) => (obj.stattype === REPAIR_FACILITY));
			var AA = objects.filter((obj) => (obj.canHitAir === true && obj.canHitGround === false));
			var trucks = objects.filter((obj) => (obj.droidType === DROID_CONSTRUCT));
			
			if (AA && AA.length > 0) { addAAthreats(AA); }
			
			if (!trucks[0] && repairfacs && repairfacs.length > 0)
			{
				orderDroidObj(dr, DORDER_ATTACK, repairfacs[0]);
				logObj(dr, "scouting combat droid ordered attack repair facility");
				orderLocations.delete(dr.id);
				continue;				
			}
		}
	}	
}

function droidAwareTruck()
{
	if (DEBUG_EXTREME) {log("droidAwareTruck");}
	const droidAware = enumDroid(me, DROID_CONSTRUCT);
	for (dr of droidAware)
	{	
		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) { continue; }
		// self destruct stuck trucks
		// could to be smarter
		if (dr.action === 9) // DORDER_SULK
		{
			removeObject(dr);
			continue;
		}
		// rtb if on buring tileIsBurning
		if (tileIsBurning(dr.x, dr.y))
		{
			orderDroid(dr, DORDER_RTB);
			logObj(dr, "droid on burning tile ordered to RTB");
			continue;
		}
		// make oil trucks RTB if they spot enemies, but not AA, // and not if already in base
		// this does not work correctly all the time
		if (dr.group === oilBuilders) //  && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS
		{
			// and if not repairing
			if (!(dr.order === DORDER_REPAIR || dr.action === 5 || dr.action === 20))
			{
				var enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, ENEMIES, true).filter((obj) => (!(obj.canHitAir === true && obj.canHitGround === false) &&
					(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || (obj.stattype === DEFENSE && obj.status === BUILT))) );
				if (enemies && enemies.length > 0)
				{
					var longest_range = 0;
					var longest_droid;

					// find longest range enemy weapon
					for (enemy of enemies) {
						if (enemy.range > longest_range)
						{
							longest_range = enemy.range/128;
							longest_droid = enemy;
						}
					}

					// run if we get too close
					if (longest_range && longest_droid && distBetweenTwoPoints(dr.x, dr.y, longest_droid.x, longest_droid.y) < longest_range + 2)
					{
						orderDroid(dr, DORDER_RTB);
						logObj(dr, "truck ordered to RTB as enemies too close longest_range:"+longest_range);
						orderLocations.delete(dr.id);
						orderTargets.delete(dr.id);
						continue;
					}
				}
			}
		}
		// if baseBuilders see an unupgraded power plant and module is available stop and build a module
		if (dr.group === baseBuilders)
		{
			var pow_gen_work = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ALLIES, true).filter((obj) => (obj.stattype == POWER_GEN && obj.status == BEING_BUILT) );
			if (pow_gen_work && pow_gen_work.length > 0 && dr.order !== DORDER_HELPBUILD)
			{
				orderDroidObj(dr, DORDER_HELPBUILD, pow_gen_work[0])
				logObj(dr, "truck ordered to helpbuild a power generator");
				continue;
			}
		}
		// check if constructor sees oil to build on but only if not in base
		if (distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS && dr.group === oilBuilders && (dr.order === DORDER_SCOUT || dr.action === 18))
		{	
			var oils = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
			//oils.sort(sortByDistToBase);
			var orderloc = orderLocations.get(dr.id);
			if (!orderloc || !orderloc.x || !orderloc.y) { orderloc = { x: -1, y: -1}; }
			
			if (oils && oils.length > 0 && tileIsBurning(oils[0].x, oils[0].y) === false && droidCanReach(dr, oils[0].x, oils[0].y) && !(oils[0].x === orderloc.x && oils[0].y === orderloc.y))
			{
				var enemies = enumRange(oils[0].x, oils[0].y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
				if (enemies.length === 0)
				{
					orderDroidBuild(dr, DORDER_BUILD, DERRICK_STAT, oils[0].x, oils[0].y);
					logObj(dr, "droidAware truck found free oil feature on way to build something")
					orderLocations.set(dr.id, {x: oils[0].x, y: oils[0].y, enemies: false});
					continue;
				}					
			}
		}
		// check truck scout locations for ememies, cancel scout order if more than one combat unit present
		// cheaty
		if (orderLocations.has(dr.id) && dr.order === DORDER_SCOUT)
		{
			var scoutLoc = orderLocations.get(dr.id);
			if (scoutLoc && scoutLoc.x && scoutLoc.y)
			{
				//logObj(dr, "checking scout location for ememies2:"+scoutLoc["x"]+"x"+scoutLoc["y"]);
				if (scoutLoc.x >= 0 && scoutLoc.y >= 0)
				{
					var enemies = enumRange(scoutLoc.x, scoutLoc.y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => 
								(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
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
		if (dr.order === 0 || dr.order === 25)
		{
			idleConstructor(dr);
			continue;
		}
	}	
}

function droidAwareBlockedoil()
{
	if (DEBUG_EXTREME) {log("droidAwareBlockedoil");}
	const droidAware = enumDroid(me, DROID_WEAPON);
	
	var skip_some = false;
	if (groupSize(attackGroup) + groupSize(defendGroup) + groupSize(vtolGroup) > 20)
	{
		skip_some = true;
	}

	var skip = 0;
	for (dr of droidAware)
	{
		if (skip_some)
		{
			if (skip < 9) { skip = skip + random(2); continue; }
		}
		skip = 0;
		
		// check for possibly blocked oil feature
		if (dr.order === DORDER_SCOUT || dr.order === 25 || dr.action === 0 && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS)
		{
			var oils = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
			if (oils[0] && tileIsBurning(oils[0].x, oils[0].y) === false)
			{
				var featuresNearOil = enumRange(oils[0].x, oils[0].y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.damageable === true));
				if (featuresNearOil[0] && droidCanReach(dr, featuresNearOil[0].x, featuresNearOil[0].y))
				{
					var enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true).filter((obj) =>
								  (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
					if (!enemies[0])
					{
						orderDroidObj(dr, DORDER_ATTACK, featuresNearOil[random(featuresNearOil.length-1)]);
						logObj(dr, "droidAware combat droid ordered to attack random nearby feature");
					}
				}
			}
		}
		// destroy all accessible features near base
		if (gameTime < 2400000 && (dr.order === DORDER_SCOUT || dr.action === 0) && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) < AVG_BASE_RADIUS)
		{
			var featuresNearBase = enumRange(BASE.x, BASE.y, 10, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.damageable === true));
			var randfeature = featuresNearBase[random(featuresNearBase.length-1)];
			if (randfeature && droidCanReach(dr, randfeature.x, randfeature.y))
			{	
				var enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true).filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
				if (!enemies[0])
				{						
					orderDroidObj(dr, DORDER_ATTACK, randfeature);
					logObj(dr, "droidAware combat droid ordered to attack feature near base");
				}
			}	
		}
	}
}

function droidAwareRTB()
{
	if (DEBUG_EXTREME) {log("droidAwareRTB");}
	const droidAware = enumDroid(me);
	for (dr of droidAware)
	{
		// send retreating vtols on random derrick missions
		if (dr.order === DORDER_RTB && dr.isVTOL === true && dr.health > 80 && dr.weapons[0].armed > 80)
		{
			// select random ememy derrick and attack
			var target = getVTOLtarget(dr, random);
			if (target)
			{
				orderDroidLoc(dr, DORDER_SCOUT, target.x, target.y);
				logObj(dr, "droidAware RTB vtol droid ordered to scout to derrick:"+target.x+"x"+target.y);
			}
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
			var enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true); // .filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
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
			var enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true);
			if (!enemies[0])
			{
				var defenses = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.stattype === DEFENSE && obj.status === BUILT));
				if (defenses[0]) // move to nearby defense 
				{	
					//var derricks = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, me, true).filter((obj) => (obj.stattype === RESOURCE_EXTRACTOR));
					if (dr.droidType == DROID_REPAIR)
					{		
						var droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.droidType === DROID_WEAPON && obj.isVTOL === false));
						if (!droids[0]) { droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.droidType === DROID_CYBORG)); }
						var droid = droids[random(droids.length-1)];
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
	if (DEBUG_EXTREME) {log("baseAware");}
	// respond to enemies in base
	// grab a factory if no hq
	var hq = enumStruct(me, HQ);
	
	if (!hq[0]) { hq = enumStruct(me).filter((obj) => (obj.stattype === VTOL_FACTORY || obj.stattype === FACTORY || obj.stattype === CYBORG_FACTORY)); }
	if (!hq[0]) { baseUnderAttack = 0; return; } 

	// set BASE location to hq location
	if (hq[0]) { BASE = {x: hq[0].x, y: hq[0].y}; }

	// check if base is under attack ignore vtols for now
	var enemies = enumRange(hq[0].x, hq[0].y, AVG_BASE_RADIUS*0.65, ENEMIES, true).filter((obj) => 
		(obj.isVTOL === false && (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.droidType === DROID_CONSTRUCT || obj.stattype === DEFENSE)) );
	enemies.sort(sortByDistToBase);

	if (enemies.length > 12)
	{
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
		var defenders;
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
			var dr = defenders[i];
			// only call them back if outside base and not already near attackers
			if (dr && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS &&
				distBetweenTwoPoints(dr.x, dr.y, baseUnderAttackLoc.x, baseUnderAttackLoc.y) > AVG_BASE_RADIUS) 
			{
				if (dr.droidType == DROID_REPAIR)
				{		
					var defrand = defenders[random(defenders.length)];
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
	if (DEBUG_EXTREME) {log("balanceGroups");}

	// remove AAthreats that no longer exist
	// eventDestroyed should remove them too
	for (threat of AAthreats)
	{
		var object = getObject(threat.type, threat.player, threat.id);
 		if (!object || !object.id)
		{
			AAthreats.delete(threat.id);
		}
	}

	// check if truck groups need rebalancing
	if (groupSize(baseBuilders) < MIN_BASE_TRUCKS && groupSize(oilBuilders) > 0)
	{
		setupTruckGroups();
	}
	if (groupSize(oilBuilders) < MIN_OIL_TRUCKS && groupSize(baseBuilders) > MIN_BASE_TRUCKS)
	{
		setupTruckGroups();
	}
	if (groupSize(baseBuilders) > MAX_BASE_TRUCKS)
	{
		setupTruckGroups();
	}	
	// put vtolrepairgroup on patrol
	var vtolpads = enumStruct(me, VTOL_PAD_STAT).sort(sortByDistToBase);
	if (vtolpads && vtolpads[0])
	{
		var vtolrepairs = enumGroup(vtolRepairGroup);
		for (repair of vtolrepairs)
		{
			orderDroidLoc(repair, DORDER_PATROL, vtolpads[0].x, vtolpads[0].y); // vtolpads[vtolpads.length-1].x, vtolpads[vtolpads.length-1].y
			logObj(repair, "vtolrepair put on PATROL");
		}
	}
	// if attackgroup is large enough move some droids to defendGroup if needed
	if (groupSize(attackGroup) > MIN_ATTACK_GSIZE*3 && groupSize(defendGroup) < MIN_ATTACK_GSIZE*1.5 ||
		groupSize(attackGroup) > MIN_ATTACK_GSIZE*6 && groupSize(defendGroup) < MIN_ATTACK_GSIZE*3)
	{
		var attackLen = groupSize(attackGroup);
		var attackers = enumGroup(attackGroup);
		for (let i = 0; i < attackLen; ++i)
		{
			var dr = attackers[i];
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
	// if python and MG4ROTARYMk1 are available and groups are large enough recycle vipers with experience
	if (componentAvailable("Body11ABT") && componentAvailable("MG4ROTARYMk1"))
	{
		var droids = enumDroid(DROID_WEAPON);
		if (droids && droids.length > MIN_ATTACK_GSIZE*4)
		{
			for (dr of droids)
			{
				if (dr.isVTOL) { return; }
				if (dr.experience > 8 && dr.body === "Body1REC")
				{
					orderDroid(dr, DORDER_RECYCLE);
					groupAdd(recycleGroup, dr);
					logObj(dr, "exp viper droid ordered to recycle exp:"+dr.experience);
					orderLocations.delete(dr.id);
					orderTargets.delete(dr.id);
				}					
			}
		}
	}
	// recycle experienced cobra or bug vtols if pulse laser is available
	if (componentAvailable("Laser2PULSEMk1") && groupSize(vtolGroup) > MIN_ATTACK_GSIZE*4)
	{
		const vtols = enumDroid(DROID_WEAPON);
		for (dr of vtols)
		{
			if (dr.isVTOL === false) { return; }
			if (dr.experience > 16 && (dr.body === "Body5REC" || dr.body === "Body4ABT"))
			{
				orderDroid(dr, DORDER_RECYCLE);
				groupAdd(recycleGroup, dr);
				orderLocations.delete(dr.id);
				orderTargets.delete(dr.id);				
				logObj(dr, "vtol ordered to recycle experience:"+dr.experience);
			}
		}
	}
}

function checkVtolAlphaStrike()
{
	if (DEBUG_EXTREME) {log("checkVtolAlphaStrike");}
	// check if there are many vtols on circle for a possible alpha-strike on enemy base with AA
	var vtols = enumGroup(vtolGroup);
	var vtols_circling = 0;
	
	for (vtol of vtols)
	{
		if (vtol.order === 40)
		{
			++vtols_circling;
		}
	}
	
	if (vtols_circling < MIN_VTOL_UNITS*4) { return; }
	
	// get enemy player base AA counts
	var playerAA = [];

	startPositions.forEach((player, index) =>
	{
		if (allianceExistsBetween(index, me)) { return; } // skip allied and me
		var AA = getAAthreats(player);
		if (AA && AA.length > 0)
		{
			playerAA[index] = AA.length;
			log("checkVtolAlphaStrike player:"+index+" AA:"+AA.length);
		}
		else
		{	
			playerAA[index] = 0;
			log("checkVtolAlphaStrike no AA player:"+index+" AA:"+AA.length);
		}
	});
	
	// find player with lowest AA count
	var least_AA = 9999;
	var least_AA_player = null;
	
	playerAA.forEach((value, index) =>	
	{
		if (value > 0 && value < least_AA)
		{
			least_AA = value;
			least_AA_player = index;
		}
	});
	
	log("vtolAlphaStrike least_AA:"+least_AA+" least_AA_player:"+least_AA_player+" vtols_circling:"+vtols_circling+" playerAA:"+JSON.stringify(playerAA));
	
	// now check to see if there are enough vtols circling to take out least_AA_player
	if (least_AA_player >= 0 && vtols_circling > least_AA*3)
	{
		// attack their base
		var player = startPositions[least_AA_player];
		var AA = getAAthreats(player);
		for (vtol of vtols) 
		{
			if (vtol.order === 40)
			{
				var randAA = AA[random(AA.length-1)];
				orderDroidLoc(vtol, 40, randAA.x, randAA.y); // CIRCLE
				logObj(vtol, "circling vtols ordered to atttack base AA of player:"+least_AA_player);					
			}
		}		
	}
}


function handlePileups()
{
	if (DEBUG_EXTREME) {log("handlePileups");}
	var droids = enumDroid(me);
	for (dr of droids)
	{
		var nearby_droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS/2, me, true);
		if (nearby_droids.length > 12)
		{
			orderDroid(dr, DORDER_STOP);
			log("possible pileup detected stopping: " + dr.id);
		}
	}
}

