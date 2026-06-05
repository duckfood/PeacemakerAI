function droidAwareAttacker()
{
	queue("droidAwareAttackerQ");
}
function droidAwareAttackerQ()
{
	let droidAware = enumGroup(attackGroup).concat(enumGroup(defendGroup));
	for (let dr of droidAware)
	{
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
		if (dr.health < 85 && dr.order === DORDER_SCOUT || dr.order === DORDER_ATTACK)
		{ 
			droidNeedsRepair(dr.id);
			continue;
		}
		// very damaged attackers retreat to repair fac
		if (dr.health < 25)
		{
			orderDroid(dr, DORDER_RTR);
			logObj(dr, "very damaged attacker ordered to RTR");
			continue;
		}
		// move to a nearby non burning location
		moveFromBurningTile(dr);
	}
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
				logObj(dr, "moving from burning area");
				return;
			}
		}
		orderDroid(dr, DORDER_RTR);
		logObj(dr, "retreating from burning area");
	}
}

function droidAwareSensor()
{
	let droidAware = enumGroup(sensorGroup);

	for (let dr of droidAware)
	{
		if (dr.droidType !== DROID_SENSOR) continue;

		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) continue;

		// rtb if on buring tileIsBurning
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

		// rtb if on buring tileIsBurning
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

function droidAwareVtol()
{
	queue("droidAwareVtolQ");
}
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

function droidAwareRepair()
{
	queue("droidAwareRepairQ");
}
function droidAwareRepairQ()
{
	// handle repair droids
	let droidAware = enumDroid(me, DROID_REPAIR);
	for (let dr of droidAware)
	{
		if (dr.droidType !== DROID_REPAIR) continue;
		if (dr.group === vtolRepairGroup) continue;

		if (dr.order === 0 || (dr.order === 25 && dr.action === 0))
		{
			idleRepair(dr);
			logObj(dr, "droidAware idle or guarding nothing repair");
			continue;
		}

		// repair guard most damaged combat or repair droid nearby
		if (dr.order !== DORDER_RTB && dr.order !== DORDER_SCOUT )
		{
			let guarding;
			if (orderTargets.has(dr.id)) { guarding = getObject(DROID, me, orderTargets.get(dr.id)); }
			
			// if guarding another repair droid stop
			if (guarding && guarding.droidType === DROID_REPAIR)
			{
				orderDroid(dr, DORDER_STOP);
				orderTargets.delete(dr.id);
				log("droidAware repair droid guarding repair ordred to stop");
			}
			// try for tanks first
			let droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*4, me, true).filter((obj) =>
				(obj.isVTOL === false && (obj.droidType === DROID_WEAPON)) );
			// no tanks try for cyborgs
			if (!droids || droids.length === 0)
			{
				droids = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*4, me, true).filter((obj) =>
				(obj.isVTOL === false && obj.droidType === DROID_CYBORG) );
			}
			// repair droids nearby
			if (droids && droids.length > 0)
			{
				let lowesthealth = 100;
				let guardit = 0;
				for (let drg of droids)
				{
					if (drg.health < lowesthealth)
					{
						lowesthealth = drg.health;
						guardit = drg;
					}
				}
				if (lowesthealth < 40)
				{
					if (!guarding || guardit && guarding.id !== guardit.id)
					{
						orderDroidObj(dr, DORDER_REPAIR, guardit);
						orderTargets.set(dr.id, guardit.id);
						logObj(dr, "droidAware repair droid ordered to repair most damaged droid:"+guardit.id);
					}
				}
				else // go back to guarding random nearby combat droid
				{
					// if not already guarding attacker
					if (guarding && !(guarding.droidType === DROID_WEAPON || guarding.droidType === DROID_CYBORG))
					{
						let defrand = droids[random(droids.length-1)];
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
	queue("droidAwareScoutQ");
}
function droidAwareScoutQ()
{
	let droidAware = enumGroup(attackGroup).concat(enumGroup(defendGroup));
	for (let dr of droidAware)
	{
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
		// check combat scout locations for ememies, cancel scout order if none
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

function droidAwareTruck()
{
	queue("droidAwareTruckQ");
}
function droidAwareTruckQ()
{
	let droidAware = enumDroid(me, DROID_CONSTRUCT);
	for (let dr of droidAware)
	{
		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) continue;
		// self destruct stuck trucks
		if (dr.action === 9) // SULK
		{
			removeObject(dr);
			continue;
		}
		// rtr if on tileIsBurning
		moveFromBurningTile(dr);

		// make oil trucks RTB if they spot enemies, but not AA, and not if already in base
		if (dr.group === oilBuilders && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS/2)
		{
			// and if not repairing
			if (dr.action !== 5)
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

		// check if oilbuilder sees free oil to build on or a well to liberate
		if (dr.group === oilBuilders && (dr.order === DORDER_MOVE || dr.order === DORDER_SCOUT || dr.action === 18)) // DACTION_MOVETOBUILD
		{
			// check for free wells first
			let oils = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE))
				.sort((obj1, obj2) => {
					let dist1 = distBetweenTwoPoints(dr.x, dr.y, obj1.x, obj1.y);
					let dist2 = distBetweenTwoPoints(dr.x, dr.y, obj2.x, obj2.y);
					return (dist1 - dist2); });

			if (oils && oils.length > 0 && droidCanReach(dr, oils[0].x, oils[0].y))
			{
				let enemies = getHostilesNear(oils[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
				//logObj(dr, "freeoil enemies: "+JSON.stringify(enemies));
				if (enemies.length === 0)
				{
					orderDroidBuild(dr, DORDER_BUILD, DERRICK_STAT, oils[0].x, oils[0].y);
					logObj(dr, "droidAware truck found free oil feature on way to build something")
					orderLocations.set(dr.id, {x: oils[0].x, y: oils[0].y, enemies: false});
					continue;
				}
			}

			// see if there is a well to liberate
			oils = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ENEMIES, true).filter((obj) => (obj.type === STRUCTURE && obj.stattype === RESOURCE_EXTRACTOR))
				.sort((obj1, obj2) => {
					let dist1 = distBetweenTwoPoints(dr.x, dr.y, obj1.x, obj1.y);
					let dist2 = distBetweenTwoPoints(dr.x, dr.y, obj2.x, obj2.y);
					return (dist1 - dist2); });

			if (oils && oils.length > 0 && droidCanReach(dr, oils[0].x, oils[0].y))
			{
				let mydefenses = enumRange(oils[0].x, oils[0].y, GROUP_SCAN_RADIUS, ALLIES, true).filter((obj) => (obj.type === STRUCTURE && obj.stattype === DEFENSE));
				if (mydefenses.length === 0) {
					let enemies = getHostilesNear(oils[0], GROUP_SCAN_RADIUS).filter((obj) => (obj.isAA === false));
					//logObj(dr, "liberate enemies: "+JSON.stringify(enemies));
					if (enemies.length === 0)
					{
						let defense = firstAvailableStructure(Schemes[Scheme].STANDARD_DEFENSES);
						let buildloc = false;
						if (defense) {
							buildloc = pickStructLocation(dr, defense, oils[0].x, oils[0].y, 1);
						}
						if (buildloc) {
							orderDroidBuild(dr, DORDER_BUILD, defense, buildloc.x, buildloc.y);
							logObj(dr, "droidAware truck found oil to liberate")
							orderLocations.set(dr.id, {x: oils[0].x, y: oils[0].y, enemies: false});
							continue;
						}
					}
				}
			}
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

function droidAwareBlockedoil()
{
	queue("droidAwareBlockedoilQ");
}
function droidAwareBlockedoilQ()
{
	let droidAware = enumDroid(me, DROID_WEAPON);
	
	let skip_some = false;
	if (groupSize(attackGroup) + groupSize(defendGroup) + groupSize(vtolGroup) > 20)
	{
		skip_some = true;
	}

	let skip = 0;
	for (let dr of droidAware)
	{
		if (skip_some)
		{
			if (skip < 9) { skip = skip + random(2); continue; }
		}
		skip = 0;
		
		// check for possibly blocked oil feature
		if (dr.order === DORDER_SCOUT || dr.order === 25 || dr.action === 0 && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) > AVG_BASE_RADIUS)
		{
			let oils = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.stattype === OIL_RESOURCE));
			if (oils[0] && tileIsBurning(oils[0].x, oils[0].y) === false)
			{
				let featuresNearOil = enumRange(oils[0].x, oils[0].y, GROUP_SCAN_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.damageable === true));
				let fnoil = returnRandInFirstFew(featuresNearOil);
				if (fnoil && droidCanReach(dr, fnoil.x, fnoil.y))
				{
					let enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true)
						.filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
					if (!enemies[0])
					{
						orderDroidObj(dr, DORDER_ATTACK, fnoil);
						logObj(dr, "droidAware combat droid ordered to attack random nearby feature");
					}
				}
			}
		}
		// destroy all accessible features near base
		if (gameTime < 600000 && (dr.order === DORDER_SCOUT || dr.action === 0) && distBetweenTwoPoints(dr.x, dr.y, BASE.x, BASE.y) < AVG_BASE_RADIUS)
		{
			let featuresNearBase = enumRange(BASE.x, BASE.y, AVG_BASE_RADIUS, ALL_PLAYERS, true).filter((obj) => (obj.type === FEATURE && obj.damageable === true));
			let randfeature = returnRandInFirstFew(featuresNearBase);
			if (randfeature && droidCanReach(dr, randfeature.x, randfeature.y))
			{	
				let enemies = enumRange(dr.x, dr.y, GROUP_SCAN_RADIUS*2, ENEMIES, true).filter((obj) => (obj.droidType === DROID_WEAPON || obj.droidType === DROID_CYBORG || obj.stattype === DEFENSE));
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
	queue("droidAwareRTBQ");
}
function droidAwareRTBQ()
{
	let droidAware = enumDroid(me);
	for (let dr of droidAware)
	{
		// send retreating vtols on random derrick missions
		if (dr.order === DORDER_RTB && dr.isVTOL === true && dr.health > 80 && dr.weapons[0].armed > 80)
		{
			// select random ememy derrick and attack
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
	queue("checkVtolAlphaStrikeQ");
}
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
				vtolAlphaStrikeLoc = { x: cluster.centroid.x, y: cluster.centroid.y };
				queue(orderVtolAlphaStrike, VTOL_DEFEND_TIME);
			}
			return; // only check one
		}
	}
}

function orderVtolAlphaStrike()
{
	let vtols = enumGroup(vtolGroup);
	for (let vtol of vtols) {
		if (vtolReady(vtol)) {
			orderDroidLoc(vtol, 40, cluster.centroid.x, cluster.centroid.y); // CIRCLE
			logObj(vtol, "vtols ordered to alphastrike AA cluster: "+vtolAlphaStrikeLoc.x+"x"+vtolAlphaStrikeLoc.y);
		}
	}
	vtolAlphaStrikeLoc = {};
}

function handlePileups()
{
	//log("SEENSTORE: "+JNstr(seenStore.query({})));
	queue("handlePileupsQ");
}
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
	for (cluster of clusters)
		for (let dr of cluster.members)
		{
			orderDroid(dr, DORDER_STOP);
			log("possible repair pileup detected stopping: " + dr.id);
		}
}

function updateSeenStore()
{
	queue("updateSeenStoreQ");
}
function updateSeenStoreQ() {
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
            // Directly handle the oil resource case
            if (obj.type === FEATURE && obj.stattype === OIL_RESOURCE) {
                seenStore.addObject(obj.id, { ...obj, id: obj.id });
                continue;
            }

            let isAllied = allianceExistsBetween(me, obj.player);
            let isAA = obj.canHitAir === true && obj.canHitGround === false;
            let isCombat = obj.droidType === DROID_WEAPON ||
                           obj.droidType === DROID_CYBORG ||
                           obj.stattype === DEFENSE;

            // Directly add with minimal cloning
            seenStore.addObject(obj.id, { ...obj, id: obj.id, isAllied, isAA, isCombat, lastSeen: gameTime });

            // Conditional check for AA and non-allied objects
            if (isAA && !isAllied) {
                AAseenStore.addObject(obj.id, { ...obj, id: obj.id, isAllied, isAA, lastSeen: gameTime });
            }
        }
    }
}

function pruneSeenStore()
{
	queue("pruneSeenStoreQ");
}
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
            AAseenStore.deleteKey(obj.id); // Assuming AAseenStore should also be updated
        }
    }
}

function recycleDroidsForHover()
{
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

function checkOrderLocationsQ()
{
	queue("checkOrderLocations");
}
function checkOrderLocations() {
    const locationMap = new Map();

    // Collect all possible threats for each location
    orderLocations.forEach(({ x, y }, key) => {
        if (x == null || y == null) return;
        const locKey = `${x}x${y}`;
        let hasThreats = false;

        // Check enemies
        const enemies = seenStore.findNear({ x: x, y: y }, GROUP_SCAN_RADIUS, { isAllied: false })
            .filter(obj => obj.lastSeen < gameTime - 60000);

        // Update the map if there are any threats found
        hasThreats = enemies.length > 0;
        locationMap.set(locKey, { x, y, hasThreats });
    });

    // Second pass: update original map with the collected threats
    orderLocations.forEach(({ x, y }, key) => {
        if (x == null || y == null) return;
        const locKey = `${x}x${y}`;
        if (locationMap.has(locKey)) {
            orderLocations.set(key, locationMap.get(locKey));
        }
    });
}
