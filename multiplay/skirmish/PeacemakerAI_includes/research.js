// Research definitions
const FUNDAMENTALS = [
	"R-Wpn-MG1Mk1",
	"R-Sys-Engineering01",
	"R-Struc-PowerModuleMk1",
	"R-Vehicle-Prop-Halftracks",
	"R-Sys-MobileRepairTurret01",
	"R-Wpn-Cannon1Mk1",
	"R-Vehicle-Body05", // cobra
	"R-Defense-WallTower02", // light cannon hardpoint
	"R-Struc-Research-Upgrade01",
	"R-Defense-WallUpgrade01",
	"R-Vehicle-Metals02",
	"R-Cyborg-Metals02",
	"R-Wpn-Flamer01Mk1",
	"R-Wpn-Cannon-Accuracy01",
	"R-Wpn-Cannon-Damage03",
	"R-Wpn-Cannon4AMk1",
	"R-Sys-MobileRepairTurretHvy",
//	"R-Comp-CommandTurret01",
];
const LATE_GAME_TECH = [
	"R-Sys-Autorepair-General",
	"R-Wpn-Cannon-Damage09",
	"R-Wpn-Bomb05",
	"R-Defense-PulseLas",
	"R-Cyborg-Hvywpn-PulseLsr",
	"R-Struc-RprFac-Upgrade06",
	"R-Wpn-Mortar01Lt",
//	"R-Defense-MortarPit",
	"R-Wpn-Mortar-Acc03",
	"R-Wpn-Mortar-Damage06",
	"R-Wpn-Mortar-Incendiary",
	"R-Defense-MortarPit-Incendiary",
	"R-Struc-Factory-Upgrade09",
	"R-Vehicle-Body09", //tiger
	"R-Sys-Sensor-WSTower",
	"R-Sys-Sensor-UpLink",
	"R-Vehicle-Body13", 
	"R-Struc-Research-Upgrade09",
	"R-Sys-Resistance-Circuits",
	"R-Vehicle-Body14", // dragon body
];
const CANNON_TECH = [
	"R-Wpn-Cannon-Accuracy02",
	"R-Wpn-Cannon-Damage07",
	"R-Wpn-Cannon-ROF06",
];
const LASER_TECH = [
	"R-Wpn-Laser01",
	"R-Wpn-Laser02",
	"R-Wpn-Energy-Accuracy01",
	"R-Wpn-Energy-Damage03",
	"R-Wpn-Energy-ROF03",
];
const KINETIC_ALLOYS = [
	"R-Vehicle-Metals09",
	"R-Cyborg-Metals09",
];
const VTOL_WEAPONRY = [
	"R-Struc-VTOLPad-Upgrade06",
];
const START_COMPONENTS = [
	"R-Defense-Tower01",
	"R-Wpn-Cannon4AMk1",
	"R-Vehicle-Body11", // python
	"R-Vehicle-Metals04",
	"R-Cyborg-Metals04",
	"R-Wpn-Cannon-Accuracy02",
	"R-Wpn-Cannon-Damage07",
	"R-Wpn-Cannon-ROF02",
	"R-Sys-Sensor-Upgrade01", // increase vision field
];
const FUNDAMENTALS2 = [
	"R-Wpn-Flame2", // inferno
	//"R-Defense-TankTrap01",
	"R-Defense-WallTower-HPVcannon",
	"R-Vehicle-Prop-Hover",
	"R-Struc-VTOLFactory",
	"R-Vehicle-Prop-VTOL",
	"R-Struc-VTOLPad",
	"R-Struc-VTOLPad-Upgrade01",
	"R-Struc-VTOLPad-Upgrade06",
	"R-Struc-RprFac-Upgrade04",
	"R-Wpn-Cannon-ROF06",
//	"R-Comp-CommandTurret02",
	"R-Vehicle-Body04", // bug
	"R-Vehicle-Body05", // cobra
	"R-Vehicle-Body12", // mantis
	"R-Sys-Engineering03",
	"R-Sys-Sensor-Upgrade03", // increase vision field
];
const THERMAL_ALLOYS = [
	"R-Vehicle-Armor-Heat09",
	"R-Cyborg-Armor-Heat09",
];
const STRUCTURE_DEFENSE_UPGRADES = [
	"R-Defense-WallUpgrade04",
	"R-Struc-Materials02",
];
const FLAMER_TECH = [
	"R-Wpn-Flamer-ROF02",
	"R-Wpn-Flamer-Damage04",
];
const ANTI_AIR_TECH = [
	"R-Defense-AASite-QuadBof",
	"R-Defense-AA-Laser",
];
const POWER_AND_RESEARCH_TECH = [
	"R-Struc-Power-Upgrade03a", // final power upgrade
	"R-Struc-Research-Upgrade07", // Faster research // 09
];

//This function aims to more cleanly discover available research topics
//with the given list provided.
function evalResearch(labID, list)
{
	if (!labID) { return true; }
	var lab = getObject(STRUCTURE, me, labID);
	if (lab == null || list == null)
	{
		return true;
	}	
	
	for (let i = 0, l = list.length; i < l; ++i)
	{
		if (!getResearch(list[i]).done && pursueResearch(lab, list[i]))
		{
			return true;
		}
	}

	return false;
}

function lookForResearch(tech, labParam)
{
	// if base is under attack and low funds stop research
	if (baseUnderAttack > 1 && getRealPower() < 600) { return; }
	
	if (!countDroid(DROID_CONSTRUCT) || researchDone)
	{
		return; //need construction droids.
	}

	var labList;
	if (labParam) // check if called with parameter or not
	{
		labList = [];
		labList.push(labParam);
	}
	else
	{
		labList = enumStruct(me, RES_LAB_STAT).filter((lab) => (
			lab.status === BUILT && structureIdle(lab)
		));
	}

	// stop research if repair turret and light cannon are available but attackgroup is too small to defend
	if (componentAvailable("LightRepair1") && componentAvailable("Cannon1Mk1") && !isStructureAvailable(VTOL_PAD_STAT) && getRealPower() < 400)
	{ 
		//log("repair and cannon are available. attackGroup:"+groupSize(attackGroup));
		if (groupSize(attackGroup) < MIN_GROUND_UNITS && labList[0])
		{
			log("throttle research -- repair and cannon attackgroup too small to defend");
			pursueResearch(labList[0], "R-Struc-Power-Upgrade01");
			return;
		}
	}	

	// stop research if HVC vtols are available and we don't have many vtols/pads and low funds
	if (getRealPower() < 500 && (componentAvailable("Cannon4AUTOMk1") && isStructureAvailable(VTOL_PAD_STAT)) && (groupSize(vtolGroup) < MIN_VTOL_UNITS && countStruct(VTOL_PAD_STAT) < 3))
	{ 
		log("HPC and vtol are available. attackGroup:"+groupSize(attackGroup)+" vtols:"+groupSize(vtolGroup)+" defendGroup:"+groupSize(defendGroup));
		log("throttle research -- HPC vtol attackgroup not filled");
		if (labList[0]) 
		{
			pursueResearch(labList[0], "R-Struc-VTOLPad-Upgrade01");
			return;
		}
	}

	for (let i = 0, r = labList.length; i < r; ++i)
	{
		var lab = labList[i];
		var found = evalResearch(lab.id, FUNDAMENTALS);

		// Focus on the hover research for a hover map.
		if (!found && isSeaMap === true && lab)
		{
			found = pursueResearch(lab, "R-Vehicle-Prop-Hover");
		}

		if (!found && getRealPower() > MIN_RESEARCH_POWER)
		{
			found = evalResearch(lab.id, START_COMPONENTS);
			if (!found && random(3) === 0)
			{
				found = evalResearch(lab.id, POWER_AND_RESEARCH_TECH);
			}
			if (!found && enemyHasVtol)
			{
				//Push for anti-air tech if we discover the enemy has VTOLs
				found = evalResearch(lab.id, ANTI_AIR_TECH);
				if (!found)
				{
					found = evalResearch(lab.id, LASER_TECH);
				}
				if (!found)
				{
					found = evalResearch(lab.id, VTOL_WEAPONRY);
				}
			}
			//If they have vtols then push for lasers.
			if (!found && !enemyHasVtol && random(2) === 0)
			{
				found = evalResearch(lab.id, LASER_TECH);
			}
			if (!isSeaMap && countStruct(CYBORG_FACTORY_STAT) > 0 && random(2) === 0 && !found)
			{
				found = evalResearch(lab.id, FLAMER_TECH);
			}
			if (!found && random(6) === 0)
			{
				found = evalResearch(lab.id, STRUCTURE_DEFENSE_UPGRADES);
			}
			if (!found)
			{
				found = evalResearch(lab.id, FUNDAMENTALS2);
			}
			if (!found && random(2) === 0)
			{
				if (!isSeaMap)
				{
					found = evalResearch(lab.id, KINETIC_ALLOYS);
					if (!found && random(2) === 0)
					{
						found = evalResearch(lab.id, THERMAL_ALLOYS);
					}
				}
				else
				{
					found = pursueResearch(lab, "R-Vehicle-Metals09");
					if (!found && random(2) === 0)
					{
						found = pursueResearch(lab, "R-Vehicle-Armor-Heat09");
					}
				}
			}
			if (!enemyHasVtol)
			{
				if (!found)
				{
					found = evalResearch(lab.id, LASER_TECH);
				}
				if (!found)
				{
					found = evalResearch(lab.id, VTOL_WEAPONRY);
				}
			}
			else
			{
				if (!found)
				{
					found = evalResearch(lab.id, CANNON_TECH);
				}
			}
			if (!found)
			{
				found = evalResearch(lab.id, LATE_GAME_TECH);
			}
			//Only research random stuff once we get retribution.
			if (componentAvailable("Body7ABT") && !found)
			{
				// Find a random research item
				var reslist = enumResearch();
				var len = reslist.length;
				if (len > 0)
				{
					var idx = Math.floor(Math.random() * len);
					pursueResearch(lab, reslist[idx].name);
				}
			}
		}
	}
}
