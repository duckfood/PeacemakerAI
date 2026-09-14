function retreatTransport(dr)
{
    if (dr && dr.id) {
		// wait for repairs and return to base
		if (dr.order === DORDER_RTR || dr.order === DORDER_RTB) return true;

        // retreat transport if damaged
        if (dr.health < 70) {
            orderDroid(dr, DORDER_RTR);
            logFile(dr, "transportTrucks transporter ordered to RTR");
            return true;
        }

        // retreat if AA threats exist
        let AAthreats = getAAthreats(dr);
        if (AAthreats && AAthreats.length) {
            orderDroid(dr, DORDER_RTB);
            logFile(dr, "transportTrucks transporter ordered to retreat AA: "+AAthreats.length);
            return true;
        }

        // retreat if hostiles are near
        let hostilesNear = getHostilesNear(dr);
        if (hostilesNear.length) {
            orderDroid(dr, DORDER_RTB);
            logFile(dr, "transportTrucks transporter ordered to retreat too many hostiles: "+hostilesNear.length);
            return true;
        }
    }
    return false;
}

function getTransport()
{
	// assign transport
	let transport = false;
	let transports = enumGroup(transportGroup).filter((obj) => (obj.droidType === DROID_TRANSPORTER));
    if (!transports || !transports.length || !transports[0].id) {
		transports = enumDroid(me, DROID_TRANSPORTER);
		for (let tr of transports) {
			if (!tr || !tr.id) continue;
			if (tr.body === BODY_TRANSPORT) {
				transport = tr;
				groupAdd(transportGroup, tr);
				logFile(tr, "getTransport assigning transport");
				return transport;
			}
		}

		if (groupSize(vtolGroup) > MIN_VTOL_UNITS * 2) {
			// build transport
			let vtolFacs = enumStruct(me, VTOL_FACTORY);
			let vtr = countVirtualProduction(me, VTOL_FACTORY, DROID_TRANSPORTER);
			if (vtr) {
				logFile("getTransport already producing transport");
				return false;
			}

			for (let fac of vtolFacs) {
				if (!fac || !fac.id) continue;
				if (buildTransport(fac)) {
					logFile(fac, "getTransport producing transport");
					return false;
				}
			}
		}

	}
	if (transports && transports.length && transports[0].id) return transports[0];
	return false;
}

function getTransportTruck()
{
	// enum transport truck in group
    let trucks = enumGroup(transportGroup).filter((obj) => (obj.droidType === DROID_CONSTRUCT && obj.propulsion === PROP_CYBORG));
    if (trucks && trucks.length && trucks[0].id) return trucks[0];

    // order transport back to base if not already there
    let transports = enumGroup(transportGroup).filter((obj) => (obj.droidType === DROID_TRANSPORTER));
    if (transports && transports && transports[0].id)
        if (distBetweenTwoPoints(transports[0].x, transports[0].y, BASE.x, BASE.y) > GROUP_SCAN_RADIUS*2) {
            orderDroidLoc(transports[0], DORDER_MOVE, BASE.x, BASE.y);
            logFile("getTransportTruck ordering transport back to base");
            transportState.target = false;
        }

    // grab any cyborg truck
    let cybTrucks = seenStore.query({ player: me, droidType: DROID_CONSTRUCT, propulsion: PROP_CYBORG });
    if (cybTrucks && cybTrucks.length && cybTrucks[0].id) {
        let transtruck = returnRandInFirstFew(cybTrucks);
        if (transtruck && transtruck.id) {
            groupAdd(transportGroup, transtruck);
            logFile(transtruck, "getTransportTruck added to transportGroup");
            transportState.target = false;
            return transtruck;
        }
    }

    // build cyborg truck if not already building
    let virtTruck = countVirtualProduction(me, CYBORG_FACTORY, DROID_CONSTRUCT);
    if (virtTruck) {
        logFile("getTransportTruck starting waiting for truck build");
        return true;
    }

    let cybFacs = seenStore.query({ player: me, type: STRUCTURE, stattype: CYBORG_FACTORY });
    if (cybFacs && cybFacs.length) {
        let fac = returnRandInFirstFew(cybFacs, 2);
        if (fac && fac.id && buildTruck(fac)) {
            logFile(fac, "getTransportTruck starting transport truck build");
            return true;
        }
        logFile(fac, "getTransportTruck truck build failed");
        return false;
    }

    // build cyborg factory
    let basetrucks = enumGroup(baseBuilders).filter((obj) => (obj.order === DORDER_NONE || obj.order === DORDER_PATROL));
    let basetruck = returnRandInFirstFew(basetrucks);
    if (basetruck && basetruck.id && getRealPower() > MIN_BUILD_POWER) {
        let buildloc = pickStructLocation(basetruck, CYBORG_FACTORY_STAT, BASE.x, BASE.y, 1);
        if (buildloc && isInMapBounds(buildloc) && orderDroidBuild(basetruck, DORDER_BUILD, CYBORG_FACTORY_STAT, buildloc.x, buildloc.y)) {
            logFile(basetruck, "getTransportTruck starting cyborg factory build");
            return true;
        }
        logFile(basetruck, "getTransportTruck factory build failed");
        return false;
    }

	return false;
}

function getTransportOils()
{
    // use seen notmyoils to avoid transporting into danger
	let allSeenOils = seenStore.query({ type: FEATURE, stattype: OIL_RESOURCE });
    let oils = getNotMyOil(allSeenOils);
	if (!oils || !oils.length || !oils[0].id) {
		logFile("getTransportOils no seen notmyoils");
		return false;
	}
	// check for aathreats
	let safeOils = [];
	for (oil of oils) {
		if (getAAthreats(oil).length === 0) safeOils.push(oil);
	}
	return safeOils;
}

function isDroidEmbarked(droid, transport)
{
	if (!droid || !droid.id || !transport || !transport.id) return false;
	const carriedDroids = enumCargo(transport);
    if (!carriedDroids || !carriedDroids.length) return false;

	for (const cdr of carriedDroids) {
		if (!cdr || !cdr.id) continue;
		if (droid.id === cdr.id) return true;
	}
	return false;
}


function buildTransport(fac)
{
	if (!fac || !fac.id) return false;
    if (fac.modules < 2) return false;
    makeComponentAvailable("ZNULLSENSOR", me);
    return buildDroid(fac, "Cyborg Transport", BODY_TRANSPORT, PROP_VTOL, "", "", "ZNULLSENSOR");
}

//// transport droids to inaccessible oil resources
let transportState = {};
transportState.target = false;
function transportTrucks() // timer
{
	if (DEBUGEX) logFile("transportTrucks");
	if (!isTransportMap()) return false;

    if (transportTrucks.delay === undefined) transportTrucks.delay = 0;

	const transport = getTransport();
    logFile("transport"+JNstr(transport));
	if (!transport || !transport.id || !isInMapBounds(transport)) return false;

	// check for retreat condition
	if (retreatTransport(transport)) {
		transportState.target = false;
		return true;
	}

	// delay the rest so transport can finish orders
	if (transportTrucks.delay < 3) {
        transportTrucks.delay++;
        return;
    }
    transportTrucks.delay = 0;

    // transport truck to seen notmyoil
	let oils = getTransportOils();
    const canBuildPower = isStructureAvailable(POW_GEN_STAT);

    if (canBuildPower && oils && oils.length && oils[0].id) {
		oils = sortByDistToLoc(transport, oils);

		let truck = getTransportTruck();
		if (!truck || !truck.id) return false;

		const transportOnsite = transportState.target && distBetweenTwoPoints(transport.x, transport.y, transportState.target.x, transportState.target.y) < GROUP_SCAN_RADIUS/2;
		const truckEmbarked = isDroidEmbarked(truck, transport);
		const truckBusy = truck.action !== DACTION_NONE;
		let seenNearbyOils = seenStore.findNear(transport, GROUP_SCAN_RADIUS/2, { type: FEATURE, stattype: OIL_RESOURCE });

		// if onsite, truck embarked, and no nearby oil or no target get new target
		if ((transportOnsite && truckEmbarked && !seenNearbyOils.length) || !transportState.target) {
			transportState.target = returnRandInFirstFew(oils);
			logFile(transport, `transportTrucks getting new target: ${transportState.target.x}x${transportState.target.y}`);
		}

        // build with truck
		if (!truckEmbarked && !truckBusy) {
       		// build derricks
			if (seenNearbyOils && seenNearbyOils.length) {
				seenNearbyOils = sortByDistToLoc(truck, seenNearbyOils);
				for (let oil of seenNearbyOils) {
					if (isInMapBounds(oil) && droidCanReach(truck, oil.x, oil.y) && !tileIsBurning(oil.x, oil.y)
							&& orderDroidBuild(truck, DORDER_BUILD, DERRICK_STAT, oil.x, oil.y)) {
						logFile(truck, `transportTrucks building derrick`);
						return true;
					}
				}
			}

			// build AA site per derrick -1 if funds
            let nearbyMyAA = seenStore.findNear(transport, GROUP_SCAN_RADIUS, { player: me, type: STRUCTURE, isAA: true, status: BUILT });
            let nearbyMyDerricks = seenStore.findNear(transport, GROUP_SCAN_RADIUS, { type: STRUCTURE, stattype: RESOURCE_EXTRACTOR, status: BUILT });
			let buildaa = firstAvailableStructure(Scheme.AA_SITES);
			if (buildaa && buildaa.length && nearbyMyAA.length < nearbyMyDerricks.length -1 && getRealPower() > MIN_BUILD_POWER) {
                let site = returnRandInFirstFew(nearbyMyDerricks);
                site = {x: site.x+randomBetween(-2, 2), y: site.y+randomBetween(-2, 2) };
                site = pickStructLocation(truck, buildaa, site.x, site.y, 0);
                if (site && isInMapBounds(site) && droidCanReach(truck, site.x, site.y)
                        && orderDroidBuild(truck, DORDER_BUILD, buildaa, site.x, site.y)) {
                    logFile(truck, `transportTrucks build AA site`);
                    return true;
                } else {
                    logFile(truck, `transportTrucks build AA site not started`);
                }
			}

			// embark transport if nearby and possible
			if (droidCanReach(truck, transport.x, transport.y)
					&& distBetweenTwoPoints(truck.x, truck.y, transport.x, transport.y) < GROUP_SCAN_RADIUS/2
					&& orderDroidObj(truck, DORDER_EMBARK, transport)) {
				logFile(truck, `transportTrucks truck embark transport`);
				return true;
			}
		} // done with truck

        // wait for transport move
        if (transport.order === DORDER_MOVE) return false;

        // move to oil
        if (truckEmbarked && transportState.target && isInMapBounds(transportState.target)) {
            // move to target
            if (!transportOnsite) {
                orderDroidLoc(transport, DORDER_MOVE, transportState.target.x, transportState.target.y);
                logFile(transport, "transportTrucks transport moving to oil");
                return true;
            }
            // check to unload truck
            if (transportOnsite) {
                orderDroidLoc(transport, DORDER_DISEMBARK, transportState.target.x+randomBetween(-1, 1), transportState.target.y+randomBetween(-1, 1));
                logFile(transport, "transportTrucks transport unloading truck");
				return true;
            }
        }

        // move about while waiting to avoid fire unless at base
        if (!truckEmbarked && transportOnsite && distBetweenTwoPoints(transport.x, transport.y, BASE.x, BASE.y) > GROUP_SCAN_RADIUS*2) {
            let newloc = { x: transportState.target.x+randomBetween(-3, 3), y: transportState.target.y+randomBetween(-3, 3) };
            if (newloc && isInMapBounds(newloc)) {
                orderDroidLoc(transport, DORDER_PATROL, newloc.x ,newloc.y);
                return true;
            }
        }

        // fetch truck
        if (!truckEmbarked) {
            // move to truck
            if (!transportOnsite) {
                transportState.target = {x: truck.x+randomBetween(-2, 2), y: truck.y+randomBetween(-2, 2)};
                orderDroidLoc(transport, DORDER_MOVE, transportState.target.x ,transportState.target.y);
                logFile(transport, "transportTrucks transport moving to truck");
                return true;
            }
            // load truck
            if (!truckBusy) {
                orderDroidObj(truck, DORDER_EMBARK, transport);
                logFile(transport, "transportTrucks transport loading truck");
                return true;
            }
        }
        // final nothing to do so set target false
        if (truckEmbarked && !seenNearbyOils.length) {
            transportState.target = false;
        }
    }
    logFile(transport, "transportTrucks no action taken");
	return false;
}
