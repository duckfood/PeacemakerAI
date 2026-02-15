function droidAware()
{
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
		if (dr.order === 25 && dr.action === 0 && (dr.droidType === DROID_CYBORG || dr.droidType === DROID_WEAPON))
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
	}
}

function droidAwareSensor()
{
	const sensorDroids = enumGroup(sensorGroup);
	for (dr of sensorDroids)
	{
		if (dr.droidType !== DROID_SENSOR) { continue; }
		
		const objects = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, ALL_PLAYERS, true);
		const artifacts = objects.filter((obj) => (obj.type === FEATURE && (obj.stattype === OIL_DRUM || obj.stattype === ARTIFACT)) );
		
		const enemy_objects = objects.filter((obj) => (obj.type !== FEATURE && !allianceExistsBetween(me, obj.player)) );
		const AA = enemy_objects.filter((obj) => (obj.canHitAir === true && obj.canHitGround === false));
		const enemies = enemy_objects.filter((obj) => (!(obj.canHitAir === true && obj.canHitGround === false) &&
				(obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || (obj.stattype === DEFENSE && obj.status === BUILT))) );
		
		// update AAthreats
		if (AA && AA.length > 0) { addAAthreats(AA); }
		
		// make sensors RTB if they spot enemies too close, but not AA
		if (dr.order !== DORDER_RTB && dr.order !== DORDER_RTR) // && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS)
		{	
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
				if (longest_range && longest_droid && distBetweenTwoPoints(dr.x, dr.y, longest_droid.x, longest_droid.y) < longest_range + 5)
				{
					orderDroid(dr, DORDER_RTB);
					logObj(dr, "sensor ordered to RTB as enemies too close longest_range:"+longest_range);
					//orderLocations.delete(dr.id);
					//orderTargets.delete(dr.id);
					continue;
				}
			}
		}
		// if sensor sees oil drum or artifact pick it up
		if (dr.order !== DORDER_RTB && dr.order !== DORDER_RTR && dr.order !== DORDER_RECOVER)
		{
			if (artifacts && artifacts.length > 0)
			{
				var randpickup = artifacts[random(artifacts.length -1)];
				const enemies_pickup = enumRange(randpickup.x, randpickup.y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
				if (enemies_pickup.length === 0 && droidCanReach(dr, randpickup.x, randpickup.y))
				{
					orderDroidObj(dr, DORDER_RECOVER, randpickup);
					logObj(dr, "droidAware sensor ordered to recover artifact")
					orderTargets.set(dr.id, randpickup.id);
					orderLocations.delete(dr.id);
					continue;
				}
			}
		}
		// sensor close to target location
		if (dr.order === DORDER_MOVE && orderLocations.has(dr.id)) 
		{
			var loc = orderLocations.get(dr.id);
			if (loc && loc.x && loc.y && distBetweenTwoPoints(dr.x, dr.y, loc.x, loc.y) < 9)
			{
				orderDroid(dr, DORDER_STOP);
				//orderLocations.delete(dr.id);
				//orderTargets.delete(dr.id);	
				logObj(dr, "sensor close to target ordered to STOP");
				continue;
			}
		}
		// damamged sensor
		if (dr.health < 80 && dr.order !== DORDER_RTR) 
		{
			orderDroid(dr, DORDER_RTR);
			logObj(dr, "damaged sensor ordered to RTR");
			continue;
		}
		// idle sensor
		if (dr.order !== DORDER_MOVE && dr.order !== DORDER_RECOVER && dr.order !== DORDER_RTB && dr.order !== DORDER_RTR && dr.order !== DORDER_RECYCLE)
		{
			const randloc = { x: random(mapWidth-2), y: random(mapHeight-2) };
			if (random(100) < 50 && droidCanReach(dr, randloc.x, randloc.y))
			{
				orderDroidLoc(dr, DORDER_MOVE, randloc.x, randloc.y);
				orderLocations.set(dr.id, {x: randloc.x, y: randloc.y, droidType: DROID_SENSOR});
				logObj(dr, "sensor ordered to move to random location:"+randloc.x+"x"+randloc.y);
				continue;
			}
			const players = getAliveEnemyPlayers();
			const randplayer = players[random(players.length-1)];
			const randbase = startPositions[randplayer];
			if (randbase)
			{
				orderDroidLoc(dr, DORDER_MOVE, randbase.x, randbase.y);
				orderLocations.set(dr.id, {x: randbase.x, y: randbase.y, droidType: DROID_SENSOR});
				logObj(dr, "sensor ordered to move to "+randbase.x+"x"+randbase.y+" player:"+JSON.stringify(randbase));
				continue;
			}
		}
	}	
}	

function droidAwareVtol()
{
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
					logObj(dr, "droidAware scouting vtol ordered to attack AA");
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
	// handle repair droids
	const droidAware = enumDroid(me, DROID_REPAIR);
	for (dr of droidAware)
	{
		if (dr.group == vtolRepairGroup) { continue; }
		if (dr.group == supportGroup) { continue; }
		
		// repair guard most damaged combat or repair droid nearby but not self
		if (dr.droidType === DROID_REPAIR && dr.order !== DORDER_RTB && dr.order !== DORDER_SCOUT )
		{
			var guarding = null;
			if (orderTargets.has(dr.id)) { guarding = getObject(DROID, me, orderTargets.get(dr.id)); }
			
			var droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, me, true).filter((obj) => (obj.isVTOL === false && (obj.droidType === DROID_WEAPON || obj.droidType === DROID_REPAIR || obj.droidType === DROID_COMMAND)) );
			if (!droids[0]) { droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.droidType === DROID_CYBORG)); }
			if (!droids[0]) // find a combat droid to guard in attackgroup
			{
				var attackgroup = enumGroup(attackGroup, DROID_WEAPON).concat(enumGroup(supportGroup, DROID_WEAPON));
				var defrand = attackgroup[random(attackgroup.length-1)];
				if (defrand && (!guarding || guarding.droidType === DROID_REPAIR)) 
				{
					orderDroidObj(dr, 25, defrand); // DORDER_GUARD
					orderTargets.set(dr.id, defrand.id);
					log("droidAware repair droid "+dr.id+" guarding:"+defrand.id);
				}
			}
			else // there are droids nearby
			{
				var lowesthealth = 100;
				var guardit;
				for (dr of droids)
				{
					if (dr.health < lowesthealth) 
					{
						lowesthealth = dr.health;
						guardit = dr;
					}
				}
				if (lowesthealth < 80) 
				{
					if (guardit.id !== dr.id)
					{
						orderDroidObj(dr, 25, guardit);
						orderTargets.set(dr.id, guardit.id);
						logObj(dr, "droidAware repair droid ordered to guard most damaged droid:"+guardit.id);
					}
				}
				else // go back to guarding random combat droid
				{
					var defrand = droids[random(droids.length-1)];
					if (defrand && defrand.droidType !== DROID_REPAIR && (!guarding || guarding.droidType === DROID_REPAIR))
					{
						orderDroidObj(dr, 25, defrand); // DORDER_GUARD
						orderTargets.set(dr.id, defrand.id);
						log("droidAware repair droid "+dr.id+" guarding:"+defrand.id);
					}					
				}
			}
		}		
	
	}	
}
	
function droidAwareScout()
{
	checkOrderLocations();
	
	const droidAware = enumGroup(attackGroup).concat(enumGroup(defendGroup)).concat(enumGroup(commanderGroup));
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
	const droidAware = enumDroid(me, DROID_CONSTRUCT);
	for (dr of droidAware)
	{	
		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) { continue; }
		
		// make trucks RTB if they spot enemies, but not AA, and not if already in base
		if (dr.droidType === DROID_CONSTRUCT && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS) 
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
		// check if constructor sees oil to build on but only if first factory is built
		if (dr.group === oilBuilders && dr.health === 100 && (dr.order === DORDER_SCOUT || dr.action === 18))
		{	
			var oils = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
			//oils.sort(sortByDistToBase);
			var orderloc = orderLocations.get(dr.id);
			if (!orderloc || !orderloc.x || !orderloc.y) { orderloc = { x: -1, y: -1}; }
			
			// neads cleanup -- "cannot read property 'x' of undefined"
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
		// if truck sees oil drum or artifact pick it up after a factory is built
		if (countStruct(FACTORY_STAT) > 0 && dr.group === oilBuilders && (dr.order === DORDER_SCOUT || dr.action === 18)) // move to build?
		{
			var artifacts = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && (obj.stattype === OIL_DRUM || obj.stattype === ARTIFACT)) );
			if (artifacts.length !== 0)
			{
				var randpickup = artifacts[random(artifacts.length -1)];
				var enemies = enumRange(randpickup.x, randpickup.y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
				if (enemies.length === 0 && droidCanReach(dr, randpickup.x, randpickup.y))
				{
					orderDroidObj(dr, DORDER_RECOVER, randpickup);
					logObj(dr, "droidAware truck ordered to recover artifact")
					orderTargets.set(dr.id, randpickup.id);
					orderLocations.delete(dr.id);
					continue;
				}
			}
		}
		// check truck scout locations for ememies, cancel scout order if more than one combat unit present
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
	const droidAware = enumDroid(me, DROID_WEAPON);
	
	var skip_some = false;
	if (groupSize(attackGroup) + groupSize(defendGroup) + groupSize(vtolGroup) > 30)
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
					var enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true).filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
					if (!enemies[0])
					{
						orderDroidObj(dr, DORDER_ATTACK, featuresNearOil[random(featuresNearOil.length-1)]);
						logObj(dr, "droidAware combat droid ordered to attack random nearby feature");
					}
				}
			}
		}
		// destroy all accessible features near base
		if ((dr.order === DORDER_SCOUT || dr.action === 0) && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) < AVG_BASE_RADIUS)
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
		// destroy unguarded enemy walls esp bandit walls
		if ((dr.order === DORDER_SCOUT || dr.order === 25 || dr.action === 0))
		{
			var walls = enumRange(dr.x, dr.y, 8, ENEMIES, true).filter((obj) => (obj.type == "WALL" || obj.type == "CORNER WALL") );
			var randfeature = walls[random(walls.length-1)];
			if (randfeature && droidCanReach(dr, randfeature.x, randfeature.y))
			{	
				var enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true).filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
				if (!enemies[0])
				{
					orderDroidObj(dr, DORDER_ATTACK, randfeature);
					logObj(dr, "droidAware combat droid ordered to attack wall");
				}
			}	
		}		
	}
}

function droidAwareRTB()
{
	const droidAware = enumDroid(me);
	for (dr of droidAware)
	{
		// send retreating vtols on random derrick missions
		if (dr.isVTOL === true && dr.health > 80 && dr.weapons[0].armed > 80)
		{
			// select random ememy derrick and attack
			const players = getAliveEnemyPlayers();
			var structures = [];
			var target;
			var AA;

			for (player of players)
			{
				if (!allianceExistsBetween(me, player)) // enemy player
				{
					var addstructs = [];
					addstructs = enumStruct(player, DERRICK_STAT);
					structures = structures.concat(addstructs);
				}
			}
			// randomize targets
			target = structures[random(structures.length-1)];
			// check for AA
			AA = getAAthreats(target);
			while (AA && AA.length > 2) {
				target = structures[random(structures.length-1)];
				AA = getAAthreats(target);
			}
			// scout to target
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
					var droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*3, me, true).filter((obj) => (obj.droidType === DROID_WEAPON && obj.isVTOL === false));
					if (!droids[0]) { droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, me, true).filter((obj) => (obj.droidType === DROID_CYBORG)); }
					var droid = droids[random(droids.length-1)];
					if (droid) 
					{
						orderDroidObj(dr, 25, droid);
						logObj(dr, "base defend RTB repair switched to guard nearby droid:"+droid.id);
						orderTargets.set(dr.id, droid.id);
					}
					else 
					{ 
						orderDroidLoc(dr, DORDER_SCOUT, baseUnderAttackLoc.x, baseUnderAttackLoc.y); 
						orderLocations.set(dr.id, {x: baseUnderAttackLoc.x , y: baseUnderAttackLoc.y, enemies: true});
					}

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
	// respond to enemies in base
	// grab a factory if no hq
	var hq = enumStruct(me, HQ);
	
	if (!hq[0]) { hq = enumStruct(me).filter((obj) => (obj.stattype === FACTORY || obj.stattype === CYBORG_FACTORY)); }
	if (!hq[0]) { baseUnderAttack = 0; return; } 
	
	// set BASE location to hq location
	BASE = {x: hq[0].x, y: hq[0].y};
	
	// reset build location to base if it gets too far away
	if (distBetweenTwoPoints(lastBuildLoc.x, lastBuildLoc.y, BASE.x, BASE.y) > 8) 
	{
		lastBuildLoc = BASE;
	}
	
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
			defenders = enumGroup(defendGroup).concat(enumGroup(attackGroup)).concat(enumGroup(commanderGroup));
		}
		else if (groupSize(defendGroup) > MIN_ATTACK_GSIZE)
		{
			defenders = enumGroup(defendGroup);
		}
		else 
		{
			defenders = enumGroup(defendGroup).concat(enumGroup(attackGroup)).concat(enumGroup(commanderGroup));
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
	if (groupSize(baseBuilders) < MIN_BASE_TRUCKS && groupSize(oilBuilders) > MIN_OIL_TRUCKS)
	{
		setupTruckGroups();
	}
	if (groupSize(oilBuilders) < MIN_OIL_TRUCKS && groupSize(baseBuilders) > MIN_BASE_TRUCKS)
	{
		setupTruckGroups();
	}
	if (groupSize(baseBuilders) > MIN_BASE_TRUCKS*2) //  && groupSize(oilBuilders) === 0
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
	// if python and vtol are available and groups are large enough recycle vipers with experience
	if (componentAvailable("Body11ABT") && componentAvailable("V-Tol"))
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
	// recycle sensors not on hover propulsion
	if (componentAvailable("hover01"))
	{
		const droids = enumGroup(sensorGroup);
		for (dr of droids) 
		{
			if (dr.propulsion !== "hover01")
			{
				orderDroid(dr, DORDER_RECYCLE);
				groupAdd(recycleGroup, dr);
				orderLocations.delete(dr.id);
				orderTargets.delete(dr.id);				
				logObj(dr, "sensor droid ordered to recycle propulsion:"+dr.propulsion);
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

function droidAwareCommander()
{
	const commandergroup = enumGroup(commanderGroup);
	if (commandergroup.length > 0)
	{
		const commander = commandergroup[0];
		
		// return to base if it is under attack
		if (baseUnderAttack > 1 && commander && commander.order !== DORDER_RTB && distBetweenTwoPoints(commander.x, commander.y, BASE.x, BASE.y) > AVG_BASE_RADIUS &&
			distBetweenTwoPoints(commander.x, commander.y, baseUnderAttackLoc.x, baseUnderAttackLoc.y) > AVG_BASE_RADIUS) 
		{
			orderDroid(commander, DORDER_RTB);
			log("base defend commander RTB:"+commander.id);
			orderTargets.delete(commander.id);
			orderLocations.delete(commander.id);
			return;
		}
		// retreat if damaged
		if (commander.health < 45 && commander.order !== DORDER_RTR)
		{
			orderDroid(commander, DORDER_RTR);
			return;
		}
		// stop commander returing to pos during scouting
		if (commander.order === DORDER_SCOUT && commander.action === 38)
		{
			orderDroidLoc(commander, DORDER_SCOUT, commander.x, commander.y);
			logObj(commander, "droidAware found scouting commander returning to position");
			orderLocations.delete(commander.id);
			return;
		}		
		// select targets when idle
		if (commander.order === 0 || commander.action === 0)
		{	
			var targets = [];
			const players = getAliveEnemyPlayers();
			for (player of players)
			{
				if (!allianceExistsBetween(me, player)) // enemy player
				{
					targets = targets.concat(enumStruct(player, PLAYER_HQ_STAT)).filter((obj) => (obj.status === BUILT));
					targets = targets.concat(enumStruct(player, FACTORY_STAT)).filter((obj) => (obj.status === BUILT));
					targets = targets.concat(enumStruct(player, CYBORG_FACTORY_STAT)).filter((obj) => (obj.status === BUILT));
					targets = targets.concat(enumStruct(player, VTOL_FACTORY_STAT)).filter((obj) => (obj.status === BUILT));
					targets = targets.concat(enumStruct(player, RESOURCE_EXTRACTOR)).filter((obj) => (obj.status === BUILT));
					targets = targets.concat(enumStruct(player, DEFENSE)).filter((obj) => (obj.status === BUILT));
				}
			}
			// sort targets by dist to commander
			targets.sort((obj1, obj2) => 
			{ 
				var dist1 = distBetweenTwoPoints(commander.x, commander.y, obj1.x, obj1.y);
				var dist2 = distBetweenTwoPoints(commander.x, commander.y, obj2.x, obj2.y);
				return (dist1 - dist2);
			} )
			var target = targets[0];
			// scout to closest target 
			if (target && target.id)
			{
				orderDroidLoc(commander, DORDER_SCOUT, target.x, target.y);
				log("commander "+commander.id+" scouting: "+target.x+"x"+target.y);
				orderLocations.set(commander.id, {x: target.x, y: target.y, enemies: true});
				return;
			}
		}

		// remove units from supportgroup not assigned to commander
		var supportgroup = [];
		supportgroup = enumGroup(supportGroup);
		for (dr of supportgroup)
		{
			if (dr.order !== DORDER_COMMANDERSUPPORT)
			{
				groupAdd(attackGroup, dr); // remove from supportgroup
			}
		}
		supportgroup = enumGroup(supportGroup);
		
		// maintain support units
		const command_limit = getCommanderControlLimit(commander);
		//log("command_limit:"+command_limit);

		// get strongest droids from attackgroups
		const strong_droids = getStrongestAttackDroids();
		const strong_repairs = getStrongestRepairDroids();
		//log("strong_repairs:");
		//log(JSON.stringify(strong_repairs));
		
		// shift strongest droids from array
		var support = [];
		var supportgroup_id = [];
		var repair_count = 0;
		var count = 0;
		while (count < command_limit)
		{
			if (repair_count > 4) // one repair every 5 attack
			{
				support.push(strong_repairs.shift());
				repair_count = 0;
			}
			else
			{
				support.push(strong_droids.shift());

			}
			count++;
			repair_count++;			
		}
		// (un)assign droids
		for (dr of supportgroup)
		{
			supportgroup_id.push(dr.id);
		}	
		for (drid of supportgroup_id)
		{
			if (drid == 0) {continue;}
			if (!support.includes(drid))
			{
				var dr = getObject(DROID, me, drid);
				if (!dr) {continue;}
				orderDroidLoc(dr, DORDER_SCOUT, dr.x, dr.y);
				groupAdd(attackGroup, dr);
				logObj(dr,"unassigned from commander");
			}
		}		
		for (drid of support)
		{
			if (drid == 0) {continue;}
			if (!supportgroup_id.includes(drid))
			{			
				var dr = getObject(DROID, me, drid);
				if (!dr) {continue;}
				groupAdd(supportGroup, dr);
				orderDroidObj(dr, DORDER_COMMANDERSUPPORT, commander);
				logObj(dr, "assigned droid to commander");
			}
		}
	}
}

