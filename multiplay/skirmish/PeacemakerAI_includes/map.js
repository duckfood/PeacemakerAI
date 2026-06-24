//// updated and fully optimized version
class SpatialDataStore {
  constructor(indexes) {
    this.objects = new Map();
    this.indexes = { ...indexes };
    this.positionIndex = new Map();
  }

  addObject(id, obj) {
    if (!id || !obj) log('WARNING Object and id must be defined');
    if (obj.x === undefined || obj.y === undefined) log('WARNING Object must have x,y properties');

    this.objects.set(id, obj);

    // Index by properties
    Object.keys(this.indexes).forEach(prop => {
      if (obj[prop] !== undefined) {
        if (!this.indexes[prop].has(obj[prop])) {
          this.indexes[prop].set(obj[prop], new Set());
        }
        this.indexes[prop].get(obj[prop]).add(id);
      }
    });

    // Store gridKey for efficient access
    const gridKey = `${Math.floor(obj.x / 10)},${Math.floor(obj.y / 10)}`;
    obj.gridKey = gridKey;

    // Spatial indexing
    if (!this.positionIndex.has(gridKey)) {
      this.positionIndex.set(gridKey, new Set());
    }
    this.positionIndex.get(gridKey).add(id);
  }

  query(conditions) {
    // Start with all object IDs
    let results = new Set(this.objects.keys());

    // Split conditions into indexed and non-indexed
    const indexedConditions = {};
    const nonIndexedConditions = {};
    for (const [prop, value] of Object.entries(conditions)) {
        if (this.indexes[prop] && this.indexes[prop].has(value)) {
            indexedConditions[prop] = value;
        } else {
            nonIndexedConditions[prop] = value;
        }
    }

    // Process indexed conditions
    for (const [prop, value] of Object.entries(indexedConditions)) {
        const indexSet = this.indexes[prop].get(value);
        if (indexSet) {
            results = new Set([...results].filter(id => indexSet.has(id)));
        }
    }

    // Process non-indexed conditions in one pass
    const nonIndexedEntries = Object.entries(nonIndexedConditions);
    if (nonIndexedEntries.length > 0) {
        const filtered = new Set();
        for (const id of results) {
            let matches = true;
            for (const [prop, value] of nonIndexedEntries) {
                if (this.objects.get(id)[prop] !== value) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                filtered.add(id);
            }
        }
        results = filtered;
    }

    return Array.from(results).map(id => ({ id, ...this.objects.get(id) }));
  }

  hasKey(key) {
    return this.objects.has(key);
  }
  getKey(key) {
    return this.objects.get(key);
  }

  findClusters(conditions, minClusterSize = 3, radius = 4) {
    return this.query(conditions)
      .reduce(({ visited, clusters }, obj) => {
        if (visited.has(obj.id)) return { visited, clusters };

        const cluster = this._findNeighbors(obj, conditions, visited, radius, minClusterSize);
        if (cluster.length >= minClusterSize) {
          clusters.push({
            centroid: this._calculateCentroid(cluster),
            members: cluster
          });
        }

        return { visited, clusters };
      }, { visited: new Set(), clusters: [] }).clusters;
  }

  _findNeighbors(obj, conditions, visited, radius, minClusterSize) {
    const cluster = [];
    const queue = [obj];

    while (queue.length) {
      const current = queue.pop();
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      cluster.push(current);

      if (cluster.length >= minClusterSize) break;

      const neighbors = this.findNear(current, radius, conditions) || [];
      neighbors.forEach(n => !visited.has(n.id) && queue.push(n));
    }

    return cluster;
  }

  findNear(position, radius, conditions = {}) {
    if (!position || position.x === undefined || position.y === undefined) {
      log('WARNING findNear must have x,y properties');
    }

    const { x, y } = position;
    const results = [];
    const xMin = Math.floor((x - radius) / 10);
    const xMax = Math.floor((x + radius) / 10);
    const yMin = Math.floor((y - radius) / 10);
    const yMax = Math.floor((y + radius) / 10);

    for (let i = xMin; i <= xMax; i++) {
      for (let j = yMin; j <= yMax; j++) {
        const gridKey = `${i},${j}`;
        if (this.positionIndex.has(gridKey)) {
          for (const id of this.positionIndex.get(gridKey)) {
            const obj = this.objects.get(id);
            if (!obj || obj.x === undefined || obj.y === undefined) continue;
            const distance = Math.sqrt(
              Math.pow(obj.x - x, 2) + Math.pow(obj.y - y, 2)
            );
            if (distance <= radius && Object.entries(conditions).every(([k, v]) => obj[k] === v)) {
              results.push({ id, ...obj });
            }
          }
        }
      }
    }

    return results;
  }

  _calculateCentroid(objects) {
    const sum = objects.reduce((acc, obj) => {
      acc.x += obj.x;
      acc.y += obj.y;
      return acc;
    }, { x: 0, y: 0 });

    return {
      x: sum.x / objects.length,
      y: sum.y / objects.length
    };
  }

  deleteObjects(conditions) {
    const toDelete = this.query(conditions);
    toDelete.forEach(obj => {
      this.objects.delete(obj.id);

      // Remove from property indexes
      Object.keys(this.indexes).forEach(prop => {
        if (obj[prop] !== undefined && this.indexes[prop].has(obj[prop])) {
          const set = this.indexes[prop].get(obj[prop]);
          set.delete(obj.id);
          if (set.size === 0) {
            this.indexes[prop].delete(obj[prop]);
          }
        }
      });

      // Remove from spatial index
      const gridKey = obj.gridKey;
      if (this.positionIndex.has(gridKey)) {
        const set = this.positionIndex.get(gridKey);
        set.delete(obj.id);
        if (set.size === 0) {
          this.positionIndex.delete(gridKey);
        }
      }
    });

    return toDelete.length;
  }

  deleteKey(id) {
    if (!this.objects.has(id)) return false;
    const obj = this.objects.get(id);
    this.objects.delete(id);

    // Remove from property indexes
    Object.keys(this.indexes).forEach(prop => {
      if (obj[prop] !== undefined && this.indexes[prop].has(obj[prop])) {
        const set = this.indexes[prop].get(obj[prop]);
        set.delete(id);
        if (set.size === 0) {
          this.indexes[prop].delete(obj[prop]);
        }
      }
    });

    // Remove from spatial index
    const gridKey = obj.gridKey;
    if (this.positionIndex.has(gridKey)) {
      const set = this.positionIndex.get(gridKey);
      set.delete(id);
      if (set.size === 0) {
        this.positionIndex.delete(gridKey);
      }
    }

    return true;
  }
}

//// determine the closest point on the edge of a given rectangular area to a given point relative to the area
function closestPointOnRectEdge(rect, point) {
    // Clamp point coordinates to rectangle edges
    const clampedX = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
    const clampedY = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));

    // Find closest edge
    let edgeX = clampedX;
    let edgeY = clampedY;

    const distToLeft = Math.abs(point.x - rect.x);
    const distToRight = Math.abs(point.x - (rect.x + rect.width));
    const distToTop = Math.abs(point.y - rect.y);
    const distToBottom = Math.abs(point.y - (rect.y + rect.height));

    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

    if (minDist === distToLeft) edgeX = rect.x;
    else if (minDist === distToRight) edgeX = rect.x + rect.width;

    if (minDist === distToTop) edgeY = rect.y;
    else if (minDist === distToBottom) edgeY = rect.y + rect.height;

    return {x: edgeX, y: edgeY};
}

//// test function
function markCliffTiles(tiles)
{
    if (!tiles) return false;
    tiles.forEach((column, x) => {
        column.forEach((cell, y) => {
            if (cell.terrainType === TERRAIN_CLIFF) hackMarkTiles(x, y);
        });
    });
}

//// uses hackMarkTiles to mark tiles in an array
function markTiles(tiles) {
	if (isIterable(tiles)) {
		for (let tile of tiles) {
			if (isIterable(tile)) {
				hackMarkTiles(tile[0], tile[1]);
			} else if (typeof tile.x === 'number' && typeof tile.y === 'number') {
				hackMarkTiles(tile.x, tile.y);
			} else {
              log("WARNING markTiles tiles not valid: "+JNstr(tiles));
            }
		}
	} else {
      log("WARNING markTiles tiles not iterable: "+JNstr(tiles));
    }
}

//// used to prepare pathfinding data
function loadFeaturesIntoTiles(features, tiles) {
    let newTiles = transposeTiles(tiles);
    for (const feature of features) {
        const { x, y } = feature;
        if (newTiles[x] && newTiles[x][y]) {
            newTiles[x][y] = { ...newTiles[x][y], ...feature, destroyed: false };
        }
    }
    return newTiles;
}

//// converts tiles[y][x] to tiles[x][y]
function transposeTiles(Tiles) {
    if (!Tiles || Tiles.length === 0) return [];

    const height = Tiles.length;
    const width = Tiles[0].length;

    // Initialize the transposed array with dimensions [width][height]
    const transposed = Array.from({ length: width }, () => Array(height));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            transposed[x][y] = { ...Tiles[y][x], x: x, y: y };
        }
    }

    return transposed;
}

//// determines if a map requires hover to access any start position from ours
function isHoverMap() {
    for (let i = 0; i < maxPlayers; i++) {
        if (!propulsionCanReach(PROP_WHEEL, BASE.x, BASE.y, startPositions[i].x, startPositions[i].y)) {
            if (propulsionCanReach(PROP_HOVER, BASE.x, BASE.y, startPositions[i].x, startPositions[i].y)) {
                return true;
            }
        }
    }
    return false;
}

//// Extends a line segment from point1 to point2 by distance `d` in the specified direction.
function extendLine(point1, point2, d, direction = 'beyond') {
    // Validate inputs
    if (!point1 || !point2 || !d) return null;
    if (direction !== 'before' && direction !== 'beyond') return null;

    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const length = Math.hypot(dx, dy);

    // Early exit for collinear points
    if (length === 0) return null;

    // Compute unit vector and displacement
    const unitX = dx / length;
    const unitY = dy / length;
    const extendedX = point2.x + (direction === 'beyond' ? d : -d) * unitX;
    const extendedY = point2.y + (direction === 'beyond' ? d : -d) * unitY;

    return { x: extendedX, y: extendedY };
}

//// ultimate version priority queue for QuickJS heap swap branch hash
class ultimate_PriorityQueue {
    constructor() {
        this.heap = [];
        this._set = new Set(); // to track elements using unique identifier
    }

    enqueue(element, priority) {
        const node = { element, priority };
        this.heap.push(node);
        this._set.add(this._elementKey(element));
        this._bubbleUp(this.heap.length - 1);
    }

    dequeue() {
        if (this.heap.length === 0) return null;
        const min = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this._sinkDown(0);
        }
        this._set.delete(this._elementKey(min.element));
        return min.element;  // ← Return JUST the element
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    includes(element) {
        return this._set.has(this._elementKey(element));
    }

    contains(element) {
        return this._set.has(this._elementKey(element));
    }

    _elementKey(element) {
        return `${element[0]},${element[1]}`;
    }

    _bubbleUp(index) {
        const element = this.heap[index];
        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);  // ← Correct formula
            if (element.priority >= this.heap[parentIndex].priority) break;
            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }

    _sinkDown(index) {
        const length = this.heap.length;
        const elementPriority = this.heap[index].priority;
        while (true) {
            let leftChildIndex = 2 * (index + 1) - 1;
            let rightChildIndex = leftChildIndex + 1;
            let swap = null;
            if (leftChildIndex < length && this.heap[leftChildIndex].priority < elementPriority) {
                swap = leftChildIndex;
            }
            if (rightChildIndex < length && ((swap === null && this.heap[rightChildIndex].priority < elementPriority) ||
                                            (swap !== null && this.heap[rightChildIndex].priority < this.heap[swap].priority))) {
                swap = rightChildIndex;
            }
            if (swap === null) break;
            [this.heap[index], this.heap[swap]] = [this.heap[swap], this.heap[index]];
            index = swap;
        }
    }
}

//// ultimate version A* pathfinding with options
// 4-way only as diagonal movement is not possible for droids
// droidCanReach returns incorrect results involving diagonal movement eg. Roughness blocked oils
// map bounds clipped to avoid pathfinding off map as game map is inaccessible around the edge
// considers start tile to be accessible if adjacent tile is
// allows a path to an inaccessible tile can be formed by reversing start and dest
function findShortestPath(start, dest, propulsion = PROP_WHEEL, allowDestruction = false, maxPathLength = Infinity) {
    if (!start || start.x === undefined || start.y === undefined) {
        log("WARNING findShortestPath no or invalid start for path");
        return false;
    }
    if (!dest || dest.x === undefined || dest.y === undefined) {
        log("WARNING findShortestPath no or invalid dest for path");
        return false;
    }
    const tiles = MapTilesFeatures;
    const directions = [[0,1],[1,0],[0,-1],[-1,0]]; // only consider up, down, left, right movements as diagonal is not possible
    const cols = tiles.length;       // x-axis
    const rows = tiles[0].length;    // y-axis
    if (start.x < 1 || start.x >= cols-1 || start.y < 1 || start.y >= rows-1) { // clip map edges
        log("WARNING Start position is out of bounds");
        return false;
    }
    if (dest.x < 1 || dest.x >= cols-1 || dest.y < 1 || dest.y >= rows-1) { // clip map edges
        log("WARNING Destination is out of bounds");
        return false;
    }
    const heuristic = (x1, y1, x2, y2) => {
        if (x1 === start.x && y1 === start.y) return 0; // Always consider the start position with zero heuristic value
        return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Standard Manhattan distance for other nodes
    };
    const openSet = new ultimate_PriorityQueue();
    const cameFrom = Array(cols).fill().map(() => Array(rows).fill(null));
    const gScore = Array(cols).fill().map(() => Array(rows).fill(Infinity));
    const fScore = Array(cols).fill().map(() => Array(rows).fill(Infinity));
    gScore[start.x][start.y] = 0;
    fScore[start.x][start.y] = heuristic(start.x, start.y, dest.x, dest.y);
    openSet.enqueue([start.x, start.y], fScore[start.x][start.y]); // Enqueue with a heuristic score of 0 for immediate consideration
    while (!openSet.isEmpty()) {
        const [x, y] = openSet.dequeue();
        if (x === dest.x && y === dest.y) {
            return reconstructPath(cameFrom, [x, y], tiles);
        }
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 1 || nx >= cols-1 || ny < 1 || ny >= rows-1) continue; // clip map edges
            const tile = tiles[nx][ny];
            if (tile.terrainType === TERRAIN_CLIFF) continue;
            if (tile.terrainType === TERRAIN_WATER && propulsion !== PROP_HOVER) continue;
            if (tile.type === FEATURE) {
                if (!tile.damageable) continue;
                if (!allowDestruction && tile.damageable && !tile.destroyed) continue;
            }
            const cost = 1;
            const tentativeGScore = gScore[x][y] + cost;
            if (tentativeGScore < gScore[nx][ny]) {
                cameFrom[nx][ny] = [x, y];
                gScore[nx][ny] = tentativeGScore;
                fScore[nx][ny] = tentativeGScore + heuristic(nx, ny, dest.x, dest.y);
                if (!openSet.contains([nx, ny])) {
                    openSet.enqueue([nx, ny], fScore[nx][ny]);
                }
            }
        }
    }
    return false; // No path found
    function reconstructPath(cameFrom, current, tiles) {
        const path = [current];
        const destructionList = [];
        while (cameFrom[current[0]][current[1]]) {
            current = cameFrom[current[0]][current[1]];
            path.unshift(current);
            const tile = tiles[current[0]][current[1]];
            if (tile.type === FEATURE && tile.damageable && !tile.destroyed) {
                destructionList.push(tile); // ({x: current[0], y: current[1], id: tile.id, type: tile.type, stattype: tile.stattype, health: tile.health, player: tile.player}); // rebuild oil object from tiles
            }
        }
        return {
            path: path,
            distance: path.length - 1,
            destructionList: destructionList.reverse()
        };
    }
}

//// modernized version
function plotSquareSpiral(xCenter, yCenter, maxRadius = 20, expansionRate = 3) {
    let x = xCenter;
    let y = yCenter;
    const path = [[x, y]];
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // Directions for movement: right, up, left, down
    let stepsPerLoop = 1; // Initial number of steps per loop
    let currentDirIndex = 0; // Start with the first direction in dirs array

    while (true) {
        for (let i = 0; i < 2; i++) { // Two times for each direction to complete a "loop" in all directions
            const dir = dirs[currentDirIndex];
            for (let j = 0; j < stepsPerLoop; j++) {
                x += dir[0];
                y += dir[1];
                path.push([x, y]);
                if (Math.max(Math.abs(x - xCenter), Math.abs(y - yCenter)) > maxRadius) {
                    return path.filter((obj) => obj[0] >= 0 && obj[1] >= 0 && obj[0] < mapWidth && obj[1] < mapHeight);
                }
            }
            currentDirIndex = (currentDirIndex + 1) % 4; // Cycle through the directions
        }
        stepsPerLoop += expansionRate; // Increase steps after completing one full set of loops in all directions
    }
}

