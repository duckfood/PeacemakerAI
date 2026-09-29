function logFile(subject, message, object) {
    if (!DEBUG) return false;
    if (subject === undefined) return false;

    let entry = `${gameTime}: `;

    // if subject is a string append it instead of subject name and id
    if (typeof subject === 'string' && subject.length > 0) {
        entry += subject;
    }
    // append name and id of subject
    else if (subject && subject.name && subject.id) {
        entry += `[${subject.name} id=${subject.id}]`;
    }

    // if message is a string append it
    if (typeof message === 'string' && message.length > 0) {
        entry += ` ${message}`;
    }
    // else if message is defined stringify and append
    else if (message !== undefined){
        entry += " "+JNstr(message);
    }

    // if object is defined stringify and append
    if (object !== undefined) {
        entry += " "+JNstr(object);
    }

    // present the entry
    dump(entry);
    if (DEBUG_CONSOLE) console(entry);
    return true;
}

function logTrace(message) {
    let caller = debugGetCallerFuncName();
    logFile(`${message} ${JNstr(caller)}`);
}

function JNstr(object){
    try {
        return JSON.stringify(object);
    } catch (e) {
        return `[Object serialization failed: ${e.message}]`;
    }
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

function shuffleArray(array)
{
  if (!Array.isArray(array)) return false;

  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function firstAvailableComponent(list)
{
    if (!list || !list.length) return false;
    if (!Array.isArray(list)) list = [list]; // make string into list

    for (let item of list) {
        if (!item || !item.length) continue;
		if (StatsMap.has(item) && componentAvailable(item)) return item;
	}
}
function firstAvailableStructure(list)
{
    if (!list || !list.length) return false;
    if (!Array.isArray(list)) list = [list]; // make string into list

	for (let item of list) {
        if (!item || !item.length) continue;
		if (StatsMap.has(item) && isStructureAvailable(item, me)) return item;
	}
}
function isComponentProducible(id)
{
	return StatsMap.has(id) && componentAvailable(id);
}
function isStructureBuildable(id)
{
	return StatsMap.has(id) && isStructureAvailable(id);
}
//// returns a random integer from 0 through max
function random(max) { return max <= 0 ? 0 : Math.random() * max | 0; }

//// load stats data into Map using Id property as key while adding data that would be lost
function loadStatsData(data)
{
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

function isUltimateScavs()
{
    if (isUltimateScavs.cache !== undefined) return isUltimateScavs.cache;

	if (scavengers) {
		const scavStructures = enumStruct(scavengerPlayer).length;
		const scavUnits = enumDroid(scavengerPlayer).length;
		if (scavUnits || scavStructures) {
			if (scavengers > 1) {
                isUltimateScavs.cache = true;
                return true;
            }
		}
	}

	isUltimateScavs.cache = false;
	return false;
}

function isDroidInGroup(droid)
{
	if (!droid || !droid.id) return false;
	for (const group of allGroups) {
		const members = enumGroup(group);
		for (const member of members) {
            if (!member || !member.id) continue;
			if (droid.id === member.id) return true;
		}
	}
	return false;
}

// initialize component name and stats data
const StatsMap = loadStatsData(Stats);
