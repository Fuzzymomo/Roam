/**
 * Tile System
 * Handles tile-based map rendering with sprite sheets
 */

const Tiles = {
  // Tile size in pixels
  TILE_SIZE: 16,
  
  // Tile map data (2D array: tileMap[y][x])
  tileMap: null,
  
  // World dimensions in tiles
  worldWidthTiles: 0,
  worldHeightTiles: 0,
  
  /**
   * Initialize the tile system
   */
  init(worldWidth, worldHeight) {
    // Calculate world size in tiles
    this.worldWidthTiles = Math.ceil(worldWidth / this.TILE_SIZE);
    this.worldHeightTiles = Math.ceil(worldHeight / this.TILE_SIZE);
    
    // Initialize tile map as 2D array
    this.tileMap = [];
    for (let y = 0; y < this.worldHeightTiles; y++) {
      this.tileMap[y] = [];
      for (let x = 0; x < this.worldWidthTiles; x++) {
        this.tileMap[y][x] = { type: 'empty', tileset: null, index: 0 };
      }
    }
    
    // Generate tile map based on zones
    this.generateTileMap();
  },
  
  /**
   * Generate tile map from zones using autotiling and contextual tile selection
   */
  generateTileMap() {
    if (!World.zones || World.zones.length === 0) {
      // Default: fill with floor tiles
      for (let y = 0; y < this.worldHeightTiles; y++) {
        for (let x = 0; x < this.worldWidthTiles; x++) {
          const analysis = this.analyzeAutotileBitmask(0); // No borders for default
          this.tileMap[y][x] = this.getWildernessTile(x, y, analysis);
        }
      }
      return;
    }
    
    // First pass: Determine zone for each tile and calculate autotile bitmasks
    // We need to do this in two passes because autotiling depends on neighbors
    const zoneMap = [];
    const bitmaskMap = [];
    
    for (let y = 0; y < this.worldHeightTiles; y++) {
      zoneMap[y] = [];
      bitmaskMap[y] = [];
      for (let x = 0; x < this.worldWidthTiles; x++) {
        const worldX = x * this.TILE_SIZE;
        const worldY = y * this.TILE_SIZE;
        const zone = World.getZoneAt(worldX, worldY);
        zoneMap[y][x] = zone;
      }
    }
    
    // Second pass: Calculate autotile bitmasks for each tile
    for (let y = 0; y < this.worldHeightTiles; y++) {
      for (let x = 0; x < this.worldWidthTiles; x++) {
        const bitmask = this.getAutotileBitmask(x, y);
        bitmaskMap[y][x] = bitmask;
      }
    }
    
    // Third pass: Generate tiles using contextual tile selection
    for (let y = 0; y < this.worldHeightTiles; y++) {
      for (let x = 0; x < this.worldWidthTiles; x++) {
        const zone = zoneMap[y][x];
        const bitmask = bitmaskMap[y][x];
        const analysis = this.analyzeAutotileBitmask(bitmask);
        
        // Use contextual tile selection based on zone type and autotile analysis
        this.tileMap[y][x] = this.getContextualTile(x, y, zone, analysis);
      }
    }
  },
  
  /**
   * Get zone at tile coordinates (cached for performance)
   */
  getZoneAtTile(x, y) {
    const worldX = x * this.TILE_SIZE;
    const worldY = y * this.TILE_SIZE;
    return World.getZoneAt(worldX, worldY);
  },
  
  /**
   * Check if two zones are the same (handles null zones)
   */
  isSameZone(zone1, zone2) {
    if (!zone1 && !zone2) return true;
    if (!zone1 || !zone2) return false;
    return zone1.id === zone2.id;
  },
  
  /**
   * Get zone ID for a tile position (returns null if no zone)
   */
  getZoneIdAtTile(x, y) {
    const zone = this.getZoneAtTile(x, y);
    return zone ? zone.id : null;
  },
  
  /**
   * Calculate autotile bitmask for a tile position
   * Checks 4 neighbors (N, S, E, W) and creates a 4-bit mask
   * Bit 0 (1): North neighbor is different zone
   * Bit 1 (2): South neighbor is different zone
   * Bit 2 (4): East neighbor is different zone
   * Bit 3 (8): West neighbor is different zone
   * Returns value 0-15
   */
  getAutotileBitmask(tileX, tileY) {
    const centerZone = this.getZoneAtTile(tileX, tileY);
    let bitmask = 0;
    
    // Check North neighbor (y - 1)
    if (tileY > 0) {
      const northZone = this.getZoneAtTile(tileX, tileY - 1);
      if (!this.isSameZone(centerZone, northZone)) {
        bitmask |= 1; // Bit 0: North
      }
    } else {
      // Edge of map counts as different zone
      bitmask |= 1;
    }
    
    // Check South neighbor (y + 1)
    if (tileY < this.worldHeightTiles - 1) {
      const southZone = this.getZoneAtTile(tileX, tileY + 1);
      if (!this.isSameZone(centerZone, southZone)) {
        bitmask |= 2; // Bit 1: South
      }
    } else {
      bitmask |= 2;
    }
    
    // Check East neighbor (x + 1)
    if (tileX < this.worldWidthTiles - 1) {
      const eastZone = this.getZoneAtTile(tileX + 1, tileY);
      if (!this.isSameZone(centerZone, eastZone)) {
        bitmask |= 4; // Bit 2: East
      }
    } else {
      bitmask |= 4;
    }
    
    // Check West neighbor (x - 1)
    if (tileX > 0) {
      const westZone = this.getZoneAtTile(tileX - 1, tileY);
      if (!this.isSameZone(centerZone, westZone)) {
        bitmask |= 8; // Bit 3: West
      }
    } else {
      bitmask |= 8;
    }
    
    return bitmask;
  },
  
  /**
   * Get border information for a tile
   * Returns information about what zones border this tile and from which directions
   * @returns {Object} - { hasBorder: boolean, borderZones: {north, south, east, west}, borderCount: number }
   */
  getBorderInfo(tileX, tileY) {
    const centerZone = this.getZoneAtTile(tileX, tileY);
    const borderZones = {
      north: null,
      south: null,
      east: null,
      west: null
    };
    let borderCount = 0;
    
    // Check North neighbor
    if (tileY > 0) {
      const northZone = this.getZoneAtTile(tileX, tileY - 1);
      if (!this.isSameZone(centerZone, northZone)) {
        borderZones.north = northZone;
        borderCount++;
      }
    }
    
    // Check South neighbor
    if (tileY < this.worldHeightTiles - 1) {
      const southZone = this.getZoneAtTile(tileX, tileY + 1);
      if (!this.isSameZone(centerZone, southZone)) {
        borderZones.south = southZone;
        borderCount++;
      }
    }
    
    // Check East neighbor
    if (tileX < this.worldWidthTiles - 1) {
      const eastZone = this.getZoneAtTile(tileX + 1, tileY);
      if (!this.isSameZone(centerZone, eastZone)) {
        borderZones.east = eastZone;
        borderCount++;
      }
    }
    
    // Check West neighbor
    if (tileX > 0) {
      const westZone = this.getZoneAtTile(tileX - 1, tileY);
      if (!this.isSameZone(centerZone, westZone)) {
        borderZones.west = westZone;
        borderCount++;
      }
    }
    
    return {
      hasBorder: borderCount > 0,
      borderZones: borderZones,
      borderCount: borderCount,
      centerZone: centerZone
    };
  },
  
  /**
   * Determine if a border should use transition tiles or wall tiles
   * Some zone transitions use walls, others use smooth transitions
   */
  shouldUseWallBorder(centerZone, borderZone) {
    if (!centerZone || !borderZone) return false;
    
    // Towns always use walls on borders
    if (centerZone.type === 'town') return true;
    
    // Dungeons use walls on borders
    if (centerZone.type === 'dungeon') return true;
    
    // Roads use edge tiles, not walls
    if (centerZone.type === 'road') return false;
    
    // Wilderness uses transition tiles, not walls
    if (centerZone.type === 'wilderness') return false;
    
    return false;
  },
  
  /**
   * Determine tile type based on autotile bitmask
   * Returns object with: { type, edges, corners, isInterior, isEdge, isCorner }
   */
  analyzeAutotileBitmask(bitmask) {
    const hasNorth = (bitmask & 1) !== 0;
    const hasSouth = (bitmask & 2) !== 0;
    const hasEast = (bitmask & 4) !== 0;
    const hasWest = (bitmask & 8) !== 0;
    
    const edgeCount = (hasNorth ? 1 : 0) + (hasSouth ? 1 : 0) + 
                     (hasEast ? 1 : 0) + (hasWest ? 1 : 0);
    
    // Determine corner type
    let cornerType = null;
    if (edgeCount === 2) {
      if (hasNorth && hasWest) cornerType = 'nw';
      else if (hasNorth && hasEast) cornerType = 'ne';
      else if (hasSouth && hasWest) cornerType = 'sw';
      else if (hasSouth && hasEast) cornerType = 'se';
    }
    
    return {
      bitmask: bitmask,
      hasNorth: hasNorth,
      hasSouth: hasSouth,
      hasEast: hasEast,
      hasWest: hasWest,
      edgeCount: edgeCount,
      cornerType: cornerType,
      isInterior: edgeCount === 0,
      isEdge: edgeCount === 1 || (edgeCount === 2 && !cornerType),
      isCorner: cornerType !== null,
      isFullBorder: edgeCount === 4
    };
  },
  
  /**
   * Tile index mapping system
   * Maps autotile bitmasks to actual tile indices in sprite sheets
   * Standard autotile layout (like RPG Maker style):
   * - Base tiles: indices 0-3 (interior variations)
   * - Edge tiles: indices 4-7 (single edges)
   * - Corner tiles: indices 8-11 (two adjacent edges = corners)
   * - Full edges: indices 12-15 (three edges)
   * 
   * Bitmask to tile index mapping:
   * 0 (0000): Interior - use base tile
   * 1 (0001): North edge
   * 2 (0010): South edge
   * 4 (0100): East edge
   * 8 (1000): West edge
   * 3 (0011): N+S edges = vertical edge
   * 12 (1100): E+W edges = horizontal edge
   * 5 (0101): N+E = NE corner
   * 9 (1001): N+W = NW corner
   * 6 (0110): S+E = SE corner
   * 10 (1010): S+W = SW corner
   * 7, 11, 13, 14: Three edges
   * 15 (1111): All edges = isolated tile
   */
  
  /**
   * Map autotile bitmask to standard tile index
   * This is the standard autotile mapping used in many tile-based games
   * @param {Number} bitmask - Autotile bitmask (0-15)
   * @returns {Number} - Tile index in sprite sheet
   */
  mapBitmaskToTileIndex(bitmask) {
    // Standard autotile mapping
    const bitmaskMap = {
      0: 0,   // Interior (base tile 0)
      1: 4,   // North edge
      2: 4,   // South edge (can use same as north for simple mapping)
      3: 5,   // N+S (vertical edge)
      4: 6,   // East edge
      5: 8,   // N+E (NE corner)
      6: 9,   // S+E (SE corner)
      7: 12,  // N+S+E (three edges)
      8: 6,   // West edge (can use same as east)
      9: 10,  // N+W (NW corner)
      10: 11, // S+W (SW corner)
      11: 13, // N+S+W (three edges)
      12: 7,  // E+W (horizontal edge)
      13: 14, // N+E+W (three edges)
      14: 15, // S+E+W (three edges)
      15: 16  // All edges (isolated tile)
    };
    
    // If exact mapping exists, use it
    if (bitmaskMap.hasOwnProperty(bitmask)) {
      return bitmaskMap[bitmask];
    }
    
    // Fallback: use bitmask directly (for edge cases)
    return bitmask;
  },
  
  /**
   * Map autotile bitmask to wall tile index
   * Walls use a similar but different mapping
   */
  mapBitmaskToWallTileIndex(bitmask) {
    // For walls, we can use a simpler mapping
    // Most tilesets have walls organized differently
    // Use bitmask directly as offset from wall tile start
    return bitmask; // Wall tiles typically start at a different offset in tileset
  },
  
  /**
   * Select tile index based on autotile analysis and zone type
   * This is the core autotiling function that maps bitmasks to tile indices
   * @param {Object} analysis - Result from analyzeAutotileBitmask()
   * @param {String} zoneType - Type of zone ('town', 'wilderness', 'road', 'dungeon', etc.)
   * @param {Number} baseVariation - Base variation offset for interior tiles
   * @returns {Number} - Tile index to use in the tileset
   */
  selectTileIndexFromAutotile(analysis, zoneType, baseVariation = 0) {
    if (analysis.isInterior) {
      // Interior tile: use base variation
      return baseVariation;
    } else {
      // Edge/Corner tile: use bitmask mapping
      return this.mapBitmaskToTileIndex(analysis.bitmask);
    }
  },
  
  /**
   * Get contextual tile for a position based on zone type and autotile analysis
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} zone - Zone object (can be null)
   * @param {Object} analysis - Autotile analysis result
   * @returns {Object} - Tile data: { type, tileset, index }
   */
  getContextualTile(tileX, tileY, zone, analysis) {
    if (!zone) {
      // No zone: use default wilderness floor
      return this.getWildernessTile(tileX, tileY, analysis);
    }
    
    // Route to appropriate tile selection based on zone type
    switch (zone.type) {
      case 'town':
        return this.getTownTile(tileX, tileY, zone, analysis);
      case 'road':
        return this.getRoadTile(tileX, tileY, zone, analysis);
      case 'dungeon':
        return this.getDungeonTile(tileX, tileY, zone, analysis);
      case 'wilderness':
      default:
        return this.getWildernessTile(tileX, tileY, analysis);
    }
  },
  
  /**
   * Get tile for town zones
   * Uses structured grid patterns for interiors, wall tiles for borders
   */
  getTownTile(tileX, tileY, zone, analysis) {
    if (analysis.isInterior) {
      // Interior: use grid pattern for structured town layout
      // Creates a more organized, grid-like appearance
      const variation = this.getGridPattern(tileX, tileY, 4, 4);
      return {
        type: 'floor',
        tileset: 'floors',
        index: variation % 4  // Base tiles: indices 0-3
      };
    } else {
      // Border: use wall tiles based on bitmask mapping
      // Towns always use walls on borders for clear boundaries
      const borderInfo = this.getBorderInfo(tileX, tileY);
      
      // Map bitmask to wall tile index
      const wallIndex = this.mapBitmaskToWallTileIndex(analysis.bitmask);
      
      return {
        type: 'wall',
        tileset: 'walls',
        index: wallIndex  // Wall tiles mapped from bitmask
      };
    }
  },
  
  /**
   * Get tile for road zones
   * Creates path-like patterns with clear edges and structured appearance
   */
  getRoadTile(tileX, tileY, zone, analysis) {
    if (analysis.isInterior) {
      // Interior road: use path pattern for consistent road appearance
      // Roads can use a different set of floor tiles (if available in tileset)
      const variation = this.getRoadPattern(tileX, tileY);
      // Use base floor tiles with offset (assuming roads are variations of floor tiles)
      return {
        type: 'road',
        tileset: 'floors',
        index: variation % 4  // Use base floor tiles for roads (0-3)
      };
    } else {
      // Road borders: use edge tiles mapped from bitmask
      const borderInfo = this.getBorderInfo(tileX, tileY);
      
      // Roads use edge tiles mapped from bitmask for smooth transitions
      const edgeIndex = this.mapBitmaskToTileIndex(analysis.bitmask);
      return {
        type: 'road_edge',
        tileset: 'floors',
        index: edgeIndex  // Edge tiles from bitmask mapping
      };
    }
  },
  
  /**
   * Get tile for dungeon zones
   * Uses dungeon floor tiles for interiors, dungeon walls for borders
   */
  getDungeonTile(tileX, tileY, zone, analysis) {
    if (analysis.isInterior) {
      // Interior: use dungeon floor tiles with variation
      const variation = this.getDungeonVariation(tileX, tileY);
      return {
        type: 'dungeon',
        tileset: 'dungeon',
        index: variation % 4  // Base dungeon floor tiles: indices 0-3
      };
    } else {
      // Border: use dungeon wall tiles mapped from bitmask
      const borderInfo = this.getBorderInfo(tileX, tileY);
      
      // Map bitmask to dungeon wall tile index
      // Dungeon walls typically start after base tiles
      const wallIndex = this.mapBitmaskToWallTileIndex(analysis.bitmask);
      return {
        type: 'dungeon_wall',
        tileset: 'dungeon',
        index: wallIndex  // Dungeon wall tiles mapped from bitmask
      };
    }
  },
  
  /**
   * Get tile for wilderness zones
   * Uses varied but coherent patterns with smooth transitions at borders
   * Creates natural-looking clusters instead of random noise
   */
  getWildernessTile(tileX, tileY, analysis) {
    if (analysis.isInterior) {
      // Interior: use clustered variation for natural-looking areas
      // Larger clusters create more natural, less noisy appearance
      const variation = this.getWildernessVariation(tileX, tileY);
      
      return {
        type: 'wilderness',
        tileset: 'floors',
        index: variation % 6  // Base wilderness tiles: indices 0-5 (or wrap to 0-3 if fewer available)
      };
    } else {
      // Border: use smooth transition tiles mapped from bitmask
      // Wilderness borders use edge tiles for natural transitions
      const borderInfo = this.getBorderInfo(tileX, tileY);
      
      // Map bitmask to edge tile index for smooth transitions
      const edgeIndex = this.mapBitmaskToTileIndex(analysis.bitmask);
      return {
        type: 'wilderness_edge',
        tileset: 'floors',
        index: edgeIndex  // Edge tiles mapped from bitmask
      };
    }
  },
  
  /**
   * Hash function for consistent pseudo-randomness
   * Creates consistent patterns based on position
   */
  hash(x, y) {
    return (x * 73856093) ^ (y * 19349663);
  },
  
  /**
   * Create coherent clusters using noise-like pattern
   * Uses larger grid cells to create clustered areas
   * @param {Number} x - Tile X coordinate
   * @param {Number} y - Tile Y coordinate
   * @param {Number} clusterSize - Size of clusters (in tiles)
   * @param {Number} variations - Number of variations to choose from
   * @returns {Number} - Variation index (0 to variations-1)
   */
  getClusteredVariation(x, y, clusterSize = 8, variations = 4) {
    // Divide into clusters
    const clusterX = Math.floor(x / clusterSize);
    const clusterY = Math.floor(y / clusterSize);
    
    // Hash the cluster coordinates to get base variation for this cluster
    const clusterHash = this.hash(clusterX, clusterY);
    const baseVariation = Math.abs(clusterHash) % variations;
    
    // Add some local variation within the cluster (smaller scale)
    const localX = x % clusterSize;
    const localY = y % clusterSize;
    const localHash = this.hash(localX, localY);
    const localVariation = Math.abs(localHash) % 3; // Small local variation
    
    // Combine cluster base with small local variation
    // Most tiles in cluster use base, some use nearby variations
    if (localVariation === 0) {
      return baseVariation;
    } else {
      // Occasionally use adjacent variation for texture
      return (baseVariation + localVariation - 1) % variations;
    }
  },
  
  /**
   * Get floor tile variation with coherent clusters
   */
  getFloorVariation(x, y) {
    return this.getClusteredVariation(x, y, 6, 4); // 6-tile clusters, 4 variations
  },
  
  /**
   * Get dungeon tile variation with coherent clusters
   */
  getDungeonVariation(x, y) {
    return this.getClusteredVariation(x, y, 5, 4); // 5-tile clusters, 4 variations
  },
  
  /**
   * Get wilderness tile variation with larger, more natural clusters
   */
  getWildernessVariation(x, y) {
    return this.getClusteredVariation(x, y, 10, 6); // 10-tile clusters, 6 variations
  },
  
  /**
   * Create grid pattern for structured areas (like towns)
   * @param {Number} x - Tile X coordinate
   * @param {Number} y - Tile Y coordinate
   * @param {Number} gridSize - Size of grid cells
   * @param {Number} variations - Number of variations
   * @returns {Number} - Variation index
   */
  getGridPattern(x, y, gridSize = 4, variations = 4) {
    const gridX = Math.floor(x / gridSize);
    const gridY = Math.floor(y / gridSize);
    const hash = this.hash(gridX, gridY);
    return Math.abs(hash) % variations;
  },
  
  /**
   * Create path pattern for roads
   * Creates a more structured, path-like appearance
   */
  getRoadPattern(x, y) {
    // Roads use smaller clusters for more consistent appearance
    return this.getClusteredVariation(x, y, 4, 3); // 4-tile clusters, 3 variations
  },
  
  /**
   * Get tile coordinates in sprite sheet
   * @param {p5.Image} tileset - The sprite sheet image
   * @param {number} tileIndex - Index of the tile in the sprite sheet (0-based, left-to-right, top-to-bottom)
   * @returns {Object} - Object with sx, sy (source coordinates in tileset)
   */
  getTileCoords(tileset, tileIndex) {
    if (!tileset || !tileset.width) return null;
    
    // Calculate tiles per row in the sprite sheet
    const tilesPerRow = Math.floor(tileset.width / this.TILE_SIZE);
    
    // Calculate tile position in sprite sheet
    const tileX = (tileIndex % tilesPerRow) * this.TILE_SIZE;
    const tileY = Math.floor(tileIndex / tilesPerRow) * this.TILE_SIZE;
    
    return { sx: tileX, sy: tileY };
  },
  
  /**
   * Draw tiles visible in the viewport
   */
  draw(cameraX, cameraY, viewWidth, viewHeight) {
    if (!Assets.isLoaded() || !this.tileMap) return;
    
    // Calculate which tiles are visible
    const startTileX = Math.floor(cameraX / this.TILE_SIZE);
    const startTileY = Math.floor(cameraY / this.TILE_SIZE);
    const endTileX = Math.ceil((cameraX + viewWidth) / this.TILE_SIZE);
    const endTileY = Math.ceil((cameraY + viewHeight) / this.TILE_SIZE);
    
    // Clamp to world bounds
    const clampedStartX = Math.max(0, startTileX);
    const clampedStartY = Math.max(0, startTileY);
    const clampedEndX = Math.min(this.worldWidthTiles, endTileX);
    const clampedEndY = Math.min(this.worldHeightTiles, endTileY);
    
    // Draw visible tiles
    for (let y = clampedStartY; y < clampedEndY; y++) {
      for (let x = clampedStartX; x < clampedEndX; x++) {
        const tile = this.tileMap[y][x];
        
        if (tile && tile.tileset) {
          const tileset = Assets.getTileset(tile.tileset);
          if (!tileset) continue;
          
          const coords = this.getTileCoords(tileset, tile.index);
          if (!coords) continue;
          
          const screenX = (x * this.TILE_SIZE) - cameraX;
          const screenY = (y * this.TILE_SIZE) - cameraY;
          
          // Draw tile from sprite sheet using image() with source coordinates
          image(
            tileset,
            screenX, screenY, this.TILE_SIZE, this.TILE_SIZE,  // Destination
            coords.sx, coords.sy, this.TILE_SIZE, this.TILE_SIZE  // Source
          );
        }
      }
    }
  },
  
  /**
   * Get tile at world coordinates
   */
  getTileAt(worldX, worldY) {
    const tileX = Math.floor(worldX / this.TILE_SIZE);
    const tileY = Math.floor(worldY / this.TILE_SIZE);
    
    if (tileX >= 0 && tileX < this.worldWidthTiles &&
        tileY >= 0 && tileY < this.worldHeightTiles) {
      return this.tileMap[tileY][tileX];
    }
    
    return null;
  }
};

