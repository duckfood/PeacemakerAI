function log(message)
{
	if (DEBUG) { dump(gameTime + " : " + message); }
	if (DEBUG_CONSOLE) { console(message); }
}

function logObj(obj, message)
{
	if (obj === null) {return;}
	if (DEBUG) { dump(gameTime + " [" + obj.name + " id=" + obj.id + "] > " + message); }
	if (DEBUG_CONSOLE) { console(" [" + obj.name + " id=" + obj.id + "] > " + message); }
}

function logTrace(message) {
    let caller = debugGetCallerFuncName();
    log(`${message} ${JNstr(caller)}`);
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
	for (let item of list) {
		if (item.length && componentAvailable(item)) return item;
	}
}
//// used for defenses
function firstAvailableStructure(list) {
    if (!list || !list.length) return false;
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

function isIterable(value) {
    return value != null && typeof value[Symbol.iterator] === 'function';
}

function sortByDistToLoc(loc, list) {
	return list.sort((obj1, obj2) => {
			let dist1 = distBetweenTwoPoints(loc.x, loc.y, obj1.x, obj1.y);
			let dist2 = distBetweenTwoPoints(loc.x, loc.y, obj2.x, obj2.y);
			return (dist1 - dist2); }); // ascending
}

function showGameTime() { console("gameTime: "+gameTime/1000+" seconds"); } // timer

function randomBetween(min, max) {
  // If min is greater than max, swap them
  if (min > max) [min, max] = [max, min];

  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
