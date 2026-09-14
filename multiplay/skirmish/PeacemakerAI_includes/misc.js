function logFile(obj, message=null)
{
    if (!DEBUG) return;

    if (!obj.id) dump(gameTime + " : " + obj); // no id so message is first
    if (obj.id > 0) dump(gameTime + " [" + obj.name + " id=" + obj.id + "] > " + message);

	if (DEBUG_CONSOLE) {
        if (!obj.id) console(gameTime + " : " + obj);
        if (obj.id > 0) console(gameTime + " [" + obj.name + " id=" + obj.id + "] > " + message);
    }
}

function logTrace(message) {
    let caller = debugGetCallerFuncName();
    logFile(`${message} ${JNstr(caller)}`);
}

function getRealPower()
{
	return playerPower(me) - queuedPower(me);
}

function sortByDistToBase(obj1, obj2)
{
	let dist1 = distBetweenTwoPoints(BASE.x, BASE.y, obj1.x, obj1.y);
	let dist2 = distBetweenTwoPoints(BASE.x, BASE.y, obj2.x, obj2.y);
	return (dist1 - dist2);
}

function setupTruckGroups()
{
	let cons = enumDroid(me, DROID_CONSTRUCT);
	for (let i = 0, l = cons.length; i < l; ++i)
	{
		let droid = cons[i];
		if (enumGroup(baseBuilders).length < MIN_BASE_TRUCKS) { groupAdd(baseBuilders, droid); }
		else if (enumGroup(oilBuilders).length < MIN_OIL_TRUCKS) { groupAdd(oilBuilders, droid); }
		else if (enumGroup(baseBuilders).length === MIN_BASE_TRUCKS) { groupAdd(baseBuilders, droid); }
		else if (enumGroup(oilBuilders).length < MIN_OIL_TRUCKS*2) { groupAdd(oilBuilders, droid); }
		else if (enumGroup(baseBuilders).length < MAX_BASE_TRUCKS) { groupAdd(baseBuilders, droid); }
		else { groupAdd(oilBuilders, droid); }
	}
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

//// used to help generate droid names
function firstAvailableComponent(list) {
    if (!list || !list.length) return false;
    if (!Array.isArray(list)) list = [list]; // make string into list

    for (let item of list) {
		if (item.length && componentAvailable(item)) return item;
	}
}
//// used for defenses
function firstAvailableStructure(list) {
    if (!list || !list.length) return false;
    if (!Array.isArray(list)) list = [list]; // make string into list
	for (let item of list) {
		if (item.length && isStructureAvailable(item, me))	return item;
	}
}

//// returns a random integer from 0 to max
function random(max) { return max <= 0 ? 0 : Math.random() * max | 0; }

//// load stats data into Map using property as key while adding data that would be lost
function loadStatsData(data) {
    const result = new Map();
    for (const category in data) {
        for (const name in data[category]) {
            const item = data[category][name];
            result.set(item.Id, { ...item, Name: name, Category: category });
        }
    }
    return result;
}

//// return randomly one of the first few elements in an array
function returnRandInFirstFew(arr, max=4) {
    if (!arr || !arr.length) return false;
	return arr[Math.floor(Math.random() * Math.min(max, arr.length))];
}

//// throttle a block of code for a specified time using Map() for storage
function throttleThis(throttleId, time = 2000) {
    if (!throttleThis.throttleTimesMap) throttleThis.throttleTimesMap = new Map();
    const lastTime = throttleThis.throttleTimesMap.get(throttleId);

    if (!lastTime) {
        throttleThis.throttleTimesMap.set(throttleId, gameTime);
        return false;
    }

    if (gameTime - lastTime < time) return true; // Throttled

    throttleThis.throttleTimesMap.set(throttleId, gameTime);
    return false;
}

function JNstr(obj){
	return JSON.stringify(obj);
}

function sortByDistToLoc(loc, list) {
    if (!isInMapBounds(loc) || !list || !list.length) return false;

	return list.sort((obj1, obj2) => {
			let dist1 = distBetweenTwoPoints(loc.x, loc.y, obj1.x, obj1.y);
			let dist2 = distBetweenTwoPoints(loc.x, loc.y, obj2.x, obj2.y);
			return (dist1 - dist2); }); // ascending
}

function randomBetween(min, max) {
  if (min === undefined || max === undefined) return false;

  // If min is greater than max, swap them
  if (min > max) [min, max] = [max, min];

  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function detectScavs()
{
	if (scavengers) {
		const scavStructures = enumStruct(scavengerPlayer).length;
		const scavUnits = enumDroid(scavengerPlayer).length;
		if (scavUnits || scavStructures) {
			startedWithScavs = true;
			if (scavengers > 1) isUltimateScavs = true;
		}
	}
}

