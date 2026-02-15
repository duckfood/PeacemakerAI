// --- utility functions
function log(message)
{
	if (DEBUG) { dump(gameTime + " : " + message); }
	if (DEBUG_CONSOLE) { console(message); }
}

function logObj(obj, message)
{
	if (obj == null) {return;}
	if (DEBUG) { dump(gameTime + " [" + obj.name + " id=" + obj.id + "] > " + message); }
	if (DEBUG_CONSOLE) { console(" [" + obj.name + " id=" + obj.id + "] > " + message); }
}

// Returns true if something is defined
function defined(data)
{
	return typeof data !== "undefined";
}

//Return a number in the range of 0 to (max - 1).
function random(max)
{
	return (max <= 0) ? 0 : Math.floor(Math.random() * max);
}

function getRealPower()
{
	return playerPower(me) - queuedPower(me);
}

function sortByDistToBase(obj1, obj2)
{
	var dist1 = distBetweenTwoPoints(BASE.x, BASE.y, obj1.x, obj1.y);
	var dist2 = distBetweenTwoPoints(BASE.x, BASE.y, obj2.x, obj2.y);
	return (dist1 - dist2);
}

function isUnsafeEnemyObject(obj)
{
	if (obj.player === me || allianceExistsBetween(me, obj.player))
	{
		return false;
	}

	if (obj.type === DROID)
	{
		return true;
	}

	return (obj.type === STRUCTURE && obj.stattype === DEFENSE && obj.status === BUILT);
}

function isDerrick(obj)
{
	return (obj.type === STRUCTURE && obj.stattype === RESOURCE_EXTRACTOR);
}

function setupTruckGroups()
{
	var cons = enumDroid(me, DROID_CONSTRUCT);
	for (let i = 0, l = cons.length; i < l; ++i)
	{
		var droid = cons[i];
		if (l < MIN_BASE_TRUCKS+1)
		{
			if (countStruct(FACTORY_STAT) === 0)
			{
				groupAdd(baseBuilders, droid);
			}
			else
			{
				groupAdd(oilBuilders, droid);
			}
		}
		else
		{
			if (i < Math.floor(l / 2))
			{
				groupAdd(baseBuilders, droid);
			}
			else
			{
				groupAdd(oilBuilders, droid);
			}
		}
	}
}

// returns shuffled array via Fisher-Yates Algorithm
function shuffleArray(array) {
   for (var i = array.length - 1; i > 0; i--) {
       var j = Math.floor(Math.random() * (i + 1));    
       var temp = array[i];
       array[i] = array[j];
       array[j] = temp;
   }
   return array;
}

function ThrottleThis(throttleThis, time)
{
	if (!defined(time))
	{
		time = 2000;
	}

	if (!defined(debugGetCallerFuncObject().throttleTimes))
	{
		debugGetCallerFuncObject().throttleTimes = {};
	}

	if (!defined(debugGetCallerFuncObject().throttleTimes[throttleThis]))
	{
		debugGetCallerFuncObject().throttleTimes[throttleThis] = gameTime;
		return false;
	}

	if (gameTime - debugGetCallerFuncObject().throttleTimes[throttleThis] < time)
	{
		return true;
	}

	debugGetCallerFuncObject().throttleTimes[throttleThis] = gameTime;
	return false;
}

function isUltimateScavs()
{
	if (scavengers && countStruct("A0BaBaFactory", scavengerPlayer))
	{
		return true;
	}
	return false;
}
