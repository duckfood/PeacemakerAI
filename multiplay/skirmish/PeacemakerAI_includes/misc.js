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

function isUltimateScavs()
{
	if (scavengers && countStruct("A0BaBaFactory", scavengerPlayer))
	{
		return true;
	}
	return false;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function firstAvailableComponent(list) {
    if (!list || !list.length) return false;
	for (let i = 0; i < list.length; ++i)
	{
		if (componentAvailable(list[i]))
		{
			return list[i];
		}
	}
}

function firstAvailableStructure(list) {
    if (!list || !list.length) return false;
	for (let i = 0; i < list.length; ++i)
	{
		if (isStructureAvailable(list[i], me))
		{
			return list[i];
		}
	}
}

//// check if defined routine, but does not work if parent element is undefined
const defined = data => typeof data !== 'undefined';

//// returns a random integer from 0 to max
function random(max) { return max <= 0 ? 0 : Math.random() * max | 0; }

//// find an element in nested data by id and add key as property
function findElementById(data, id) {
  for (const category in data) {
    for (const item in data[category]) {
      if (data[category][item].Id === id) {
        return {
          ...data[category][item],
          Name: item
        };
      }
    }
  }
  return null;
}

//// get the key of an element in nested data by property value
function findKeyById(data, id) {
    for (const category in data) {
        const items = data[category];
        for (const key in items) {
            if (items[key].Id === id) {
                return key;
            }
        }
    }
    return null;
}

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

//// stop blocks of code from executing too often
function ThrottleThis(throttleThis, time = 2000) {
    const caller = debugGetCallerFuncObject();
    caller.throttleTimes ??= {};

    const lastTime = caller.throttleTimes[throttleThis];
    if (lastTime === undefined) {
        caller.throttleTimes[throttleThis] = gameTime;
        return false;
    }

    if (gameTime - lastTime < time) return true;

    caller.throttleTimes[throttleThis] = gameTime;
    return false;
}

//// Deep copy an object. Does not work for Map or Set.
function deepCopy(obj)
{
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);

  const clone = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepCopy(obj[key]);
    }
  }
  return clone;
};

function estimateMemoryCapacity() {
  const maxTestSizeMB = 1024; // 1 GB as an initial maximum test
  const stepMultiplier = 2; // exponential growth
  let currentSizeMB = 1; // start at 1MB
  let maxWorkingSizeMB = 0;

  // Function to create a Map with approximate size in MB
  function createMapEntries(count) {
    const map = new Map();
    for (let i = 0; i < count; i++) {
      // Insert varied data: number, string, object
      map.set(i, {
        num: i,
        str: "data" + i,
        obj: { nested: true, index: i }
      });
    }
    return map;
  }

  const approximateBytesPerEntry = 200;

  while (currentSizeMB <= maxTestSizeMB) {
    const numEntries = Math.floor((currentSizeMB * 1024 * 1024) / approximateBytesPerEntry);
    log(`Trying ${currentSizeMB}MB (~${numEntries} entries)...`);

    try {
      const startTime = Date.now();
      const map = createMapEntries(numEntries);
      const duration = Date.now() - startTime;
      log(`Success at ${currentSizeMB}MB in ${duration}ms`);
      maxWorkingSizeMB = currentSizeMB;
      // Increase size exponentially
      currentSizeMB *= stepMultiplier;
    } catch (e) {
      log(`Failed at ${currentSizeMB}MB: ${e}`);
      break; // Stop on failure
    }
  }

  log(`Estimated maximum memory capacity: ${maxWorkingSizeMB}MB`);
}

function dumpGlobals()
	{
	let global = globalThis;
	let globals = {};

	for (let key of Object.getOwnPropertyNames(global)) {
		try {
			let value = global[key];
			// Convert the value to a string description
			globals[key] = typeof value + ": " + String(value);
		} catch (e) {
			globals[key] = "[unaccessible]";
		}
	}

	log(JSON.stringify(globals, null, 2));
}

function JNstr(obj){
	return JSON.stringify(obj);
}
