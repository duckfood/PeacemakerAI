// Research definitions
const FUNDAMENTALS1 = [
	"R-Wpn-MG1Mk1",
	"R-Sys-Engineering01",
	"R-Sys-MobileRepairTurret01",
	"R-Struc-PowerModuleMk1",
	"R-Defense-Tower01", // mg tower
	"R-Wpn-MG-Damage02", // hardened bullets
	"R-Vehicle-Prop-Halftracks",
	"R-Vehicle-Body05", // cobra
	"R-Vehicle-Metals02",
	"R-Cyborg-Metals02",
	"R-Struc-Research-Upgrade01",
];
const FUNDAMENTALS2 = [
	"R-Wpn-MG3Mk1", // heavy mg
	"R-Vehicle-Metals04",
	"R-Cyborg-Metals04",
	"R-Sys-Sensor-Upgrade01",
	"R-Sys-MobileRepairTurretHvy",
	"R-Struc-RepairFacility",
];
const FUNDAMENTALS3 = [
	"R-Wpn-MG4",
	"R-Vehicle-Prop-Hover",
	"R-Struc-VTOLFactory",
	"R-Vehicle-Prop-VTOL",
	"R-Struc-VTOLPad",
	"R-Struc-VTOLPad-Upgrade03",
	"R-Wpn-Laser02",
	"R-Cyborg-Hvywpn-PulseLsr",
	"R-Sys-Autorepair-General",
	"R-Vehicle-Body12", // mantis
	"R-Struc-Factory-Upgrade04",
	"R-Sys-Engineering03",
	"R-Sys-Sensor-Upgrade03",
	"R-Struc-RprFac-Upgrade02",
];
const LATE_GAME_TECH = [
	"R-Wpn-LasSat",
	"R-Wpn-Bomb05", // plasmite bomb
	"R-Defense-MortarPit-Incendiary",
	"R-Wpn-Mortar-Acc03",
	"R-Wpn-Mortar-Damage06",
	"R-Struc-Research-Upgrade09",
	"R-Sys-Resistance-Circuits",
	"R-Defense-Howitzer-Incendiary",
	"R-Vehicle-Body14", // dragon body
	"R-Sys-SpyTurret",
	"R-Defense-HvyArtMissile",
];
const LASER_TECH = [
	"R-Wpn-Laser01",
	"R-Wpn-Laser02",
	"R-Wpn-Energy-Accuracy01",
	"R-Wpn-Energy-Damage03",
	"R-Wpn-Energy-ROF03",
	"R-Wpn-ParticleGun",
];
const VTOL_WEAPONRY = [
	"R-Struc-VTOLPad-Upgrade06",
];

const KINETIC_ALLOYS = [
	"R-Vehicle-Metals09",
	"R-Cyborg-Metals09",
];
const THERMAL_ALLOYS = [
	"R-Vehicle-Armor-Heat09",
	"R-Cyborg-Armor-Heat09",
];
const STRUCTURE_DEFENSE_UPGRADES = [
	"R-Defense-WallUpgrade11",
	"R-Struc-Materials03",
	"R-Struc-RprFac-Upgrade06",
];
const MG_TECH = [
	"R-Wpn-MG-Damage10", // du bullets mk3
	"R-Wpn-MG5", // twin ag
];
const ANTI_AIR_TECH = [
	"R-Defense-AA-Laser", // stormbringer defense
	"R-Defense-AASite-QuadMg1" // hurricane defense
];
const POWER_AND_RESEARCH_TECH = [
	"R-Struc-Power-Upgrade03a", // final power upgrade
	"R-Struc-Research-Upgrade07", // final research upgrade
];

//This function aims to more cleanly discover available research topics
//with the given list provided.
function evalResearch(labID, list)
{
	if (DEBUG_EXTREME) {log("evalResearch");}
	if (!labID) { return true; }
	var lab = getObject(STRUCTURE, me, labID);
	if (lab == null || list == null)
	{
		return true;
	}	
	
	for (let i = 0, l = list.length; i < l; ++i)
	{
		if (getResearch(list[i]) && !getResearch(list[i]).done && pursueResearch(lab, list[i]))
		{
			return true;
		}
	}

	return false;
}

function lookForResearch(tech, labParam)
{
	if (DEBUG_EXTREME) {log("lookForResearch");}
	// if base is under attack and low funds stop research
	if (baseUnderAttack > 2 && getRealPower() < 600) { return; }
	
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
	for (let i = 0, r = labList.length; i < r; ++i)
	{
		var lab = labList[i];
		var found = evalResearch(lab.id, FUNDAMENTALS1);

		// Focus on the hover research for a hover map.
		if (!found && isSeaMap === true && lab)
		{
			found = pursueResearch(lab, "R-Vehicle-Prop-Hover");
		}
		if (!found && getRealPower() > MIN_RESEARCH_POWER)
		{
			found = evalResearch(lab.id, FUNDAMENTALS2);
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
			// push for mg tech
			if (random(2) === 0 && !found)
			{
				found = evalResearch(lab.id, MG_TECH);
			}
			//If they dont have vtols then push for lasers
			if (!found && !enemyHasVtol && random(2) === 0)
			{
				found = evalResearch(lab.id, LASER_TECH);
			}
			if (!found)
			{
				found = evalResearch(lab.id, FUNDAMENTALS3);
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
					found = evalResearch(lab.id, MG_TECH);
				}
			}
			if (!found && random(6) === 0)
			{
				found = evalResearch(lab.id, STRUCTURE_DEFENSE_UPGRADES);
			}
			if (!found)
			{
				found = evalResearch(lab.id, LATE_GAME_TECH);
			}
			//Only research random stuff if there are surplus funds
			if (getRealPower() > MIN_RESEARCH_POWER*10 && !found)
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
