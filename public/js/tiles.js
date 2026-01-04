/**
 * Tile System
 * Handles tile-based map rendering with sprite sheets
 */

const Tiles = {
  // Tile size in pixels
  TILE_SIZE: 16,
  
  // Tile map data (2D array: tileMap[y][x])
  tileMap: null,
  
  // Decoration map data (2D array: decorationMap[y][x])
  // Stores decorative elements like trees, rocks, flowers, mushrooms, grass patches
  // Each entry is either null (no decoration) or { type, tileset, index, x, y }
  decorationMap: null,
  
  // World dimensions in tiles
  worldWidthTiles: 0,
  worldHeightTiles: 0,
  
  /**
   * Tileset configuration - defines available tile ranges for each tileset type
   * Each tileset has different layouts and available tile indices
   * 
   * Available Tilesets:
   * - floors: Floors_Tiles.png - Base terrain, wilderness, roads
   * - walls: Wall_Tiles.png - Standard wall tiles for towns
   * - wallVariations: Wall_Variations.png - Used for zone borders and transitions (40% of town walls, 30% of wilderness-to-town edges)
   * - dungeon: Dungeon_Tiles.png - Dungeon floors and walls
   * - water: Water_tiles.png - Water features and water zone borders
   */
  tilesetConfig: {
    floors: {
      baseTiles: { start: 0, count: 8 },      // Base interior tiles (0-7)
      edgeTiles: { start: 3, count: 4 },      // Single edge tiles (3-6)
      cornerTiles: { start: 7, count: 4 },    // Outer corner tiles (7-10)
      innerCornerTiles: { start: 11, count: 4 }, // Inner corner tiles (11-14)
      specialTiles: { start: 15, count: 7 },  // Special edge combinations (15-21)
      // Additional floor variations can extend beyond base tiles
      maxTiles: 48  // Maximum tiles to check in floors tileset
    },
    walls: {
      baseTiles: { start: 0, count: 4 },       // Base wall tiles
      edgeTiles: { start: 3, count: 4 },     // Wall edge tiles
      cornerTiles: { start: 7, count: 4 },   // Wall corner tiles
      innerCornerTiles: { start: 11, count: 4 }, // Wall inner corners
      specialTiles: { start: 15, count: 7 }, // Special wall combinations
      maxTiles: 48
    },
    dungeon: {
      baseTiles: { start: 0, count: 8 },      // Dungeon floor tiles
      edgeTiles: { start: 3, count: 4 },     // Dungeon edge tiles
      cornerTiles: { start: 7, count: 4 },    // Dungeon corner tiles
      innerCornerTiles: { start: 11, count: 4 }, // Dungeon inner corners
      specialTiles: { start: 15, count: 7 }, // Special dungeon combinations
      maxTiles: 48
    },
    water: {
      baseTiles: { start: 0, count: 4 },     // Water base tiles
      edgeTiles: { start: 3, count: 4 },     // Water edge tiles
      cornerTiles: { start: 7, count: 4 },   // Water corner tiles
      innerCornerTiles: { start: 11, count: 4 }, // Water inner corners
      specialTiles: { start: 15, count: 7 }, // Special water combinations
      maxTiles: 32
    },
    wallVariations: {
      baseTiles: { start: 0, count: 8 },      // Wall variation tiles
      edgeTiles: { start: 3, count: 4 },     // Variation edge tiles
      cornerTiles: { start: 7, count: 4 },   // Variation corner tiles
      innerCornerTiles: { start: 11, count: 4 }, // Variation inner corners
      specialTiles: { start: 15, count: 7 }, // Special variation combinations
      maxTiles: 48  // Wall_Variations.png - used for zone borders and transitions
    }
  },
  
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
    
    // Initialize decoration map as 2D array (sparse - most entries will be null)
    this.decorationMap = [];
    for (let y = 0; y < this.worldHeightTiles; y++) {
      this.decorationMap[y] = [];
      for (let x = 0; x < this.worldWidthTiles; x++) {
        this.decorationMap[y][x] = null; // No decoration by default
      }
    }
    
    // Generate tile map based on zones
    this.generateTileMap();
    
    // Generate decorations after tile map is created
    this.generateDecorations();
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
    
    // Second pass: Calculate autotile bitmasks and extended info for each tile
    const extendedInfoMap = [];
    for (let y = 0; y < this.worldHeightTiles; y++) {
      extendedInfoMap[y] = [];
      for (let x = 0; x < this.worldWidthTiles; x++) {
        const bitmask = this.getAutotileBitmask(x, y);
        bitmaskMap[y][x] = bitmask;
        // Get extended info for inner corner detection
        extendedInfoMap[y][x] = this.getExtendedAutotileInfo(x, y);
      }
    }
    
    // Third pass: Generate tiles using contextual tile selection
    for (let y = 0; y < this.worldHeightTiles; y++) {
      for (let x = 0; x < this.worldWidthTiles; x++) {
        const zone = zoneMap[y][x];
        const bitmask = bitmaskMap[y][x];
        const analysis = this.analyzeAutotileBitmask(bitmask);
        const extendedInfo = extendedInfoMap[y][x];
        
        // Use contextual tile selection based on zone type and autotile analysis
        this.tileMap[y][x] = this.getContextualTile(x, y, zone, analysis, extendedInfo);
      }
    }
  },
  
  /**
   * Generate decorations for the map based on zone types
   * Uses hash-based placement for consistent, clustered decorations
   * Zone-based decoration rules:
   * - Wilderness: Trees, rocks, flowers, mushrooms, grass (high density: 10-15%)
   * - Towns: Sparse decorations, structured placement (low density: 2-5%)
   * - Roads: Minimal decorations, path-focused (very low density: 1-2%)
   * - Dungeons: Rocks, torches, minimal vegetation (medium density: 5-8%)
   */
  generateDecorations() {
    if (!this.decorationMap || !this.tileMap) {
      return; // Can't generate decorations if maps aren't initialized
    }
    
    // Clear existing decorations
    this.clearAllDecorations();
    
    // Iterate through all tiles
    for (let y = 0; y < this.worldHeightTiles; y++) {
      for (let x = 0; x < this.worldWidthTiles; x++) {
        // Get zone and tile info for this position
        const zone = this.getZoneAtTile(x, y);
        const tile = this.tileMap[y][x];
        
        // Only place decorations on interior tiles (not borders)
        // Check if tile is an interior tile by checking if it's not an edge/corner type
        if (!tile || tile.type === 'wall' || tile.type === 'dungeon_wall') {
          continue; // Skip wall tiles
        }
        
        // Get zone type (default to wilderness if no zone)
        const zoneType = zone ? zone.type : 'wilderness';
        
        // Skip edge tiles, but allow some decorations near edges in wilderness for natural appearance
        const isEdgeTile = tile.type.includes('_edge') || tile.type.includes('_wall');
        if (isEdgeTile) {
          // For wilderness, allow 10% of edge tiles to have decorations (natural edge vegetation)
          if (zoneType === 'wilderness') {
            const edgeHash = this.hash(x, y);
            if ((Math.abs(edgeHash) % 10) > 0) {
              continue; // 90% chance to skip edge tiles in wilderness
            }
          } else {
            // For other zones, skip all edge tiles
            continue;
          }
        }
        
        // Get decoration configuration for this zone type
        const decorationConfig = this.getDecorationConfig(zoneType);
        if (!decorationConfig) {
          continue; // No decorations for this zone type
        }
        
        // For roads with edge-only decorations, check distance to edge
        if (decorationConfig.edgeOnly && zoneType === 'road') {
          const distanceToEdge = this.getDistanceToNearestEdge(x, y, zone);
          if (distanceToEdge > decorationConfig.edgeDistance) {
            continue; // Too far from edge, skip decoration
          }
          // Reduce density further for edge-only decorations
          const edgeHash = this.hash(x, y);
          if ((Math.abs(edgeHash) % 5) > 0) {
            continue; // Only 20% of eligible edge tiles get decorations
          }
        }
        
        // Use hash-based probability to decide if decoration should be placed
        const shouldPlace = this.shouldPlaceDecoration(x, y, decorationConfig);
        if (!shouldPlace) {
          continue;
        }
        
        // Select decoration type based on zone and hash
        const decorationType = this.selectDecorationType(x, y, zoneType, decorationConfig);
        if (!decorationType) {
          continue; // No valid decoration type selected
        }
        
        // Get decoration tile info (tileset and index)
        // Pass zone type for zone-specific decoration selection (e.g., dungeon rocks)
        const decorationInfo = this.getDecorationTileInfo(decorationType, x, y, zoneType);
        if (!decorationInfo) {
          continue; // No valid decoration info
        }
        
        // Place the decoration
        this.setDecoration(x, y, decorationType, decorationInfo.tileset, decorationInfo.index);
      }
    }
  },
  
  /**
   * Get decoration configuration for a zone type
   * Returns density and available decoration types
   * @param {String} zoneType - Zone type ('town', 'wilderness', 'road', 'dungeon', etc.)
   * @returns {Object|null} - Decoration configuration or null
   */
  getDecorationConfig(zoneType) {
    const configs = {
      wilderness: {
        density: 0.14, // 14% of interior tiles get decorations (increased for richer wilderness)
        clusterSize: 10, // Larger clusters for natural appearance (enhanced)
        types: [
          { type: 'tree', weight: 3.5 },      // Trees are most common in wilderness
          { type: 'rock', weight: 2.5 },      // Rocks add natural variety
          { type: 'flower', weight: 2.5 },    // Flowers add color and life
          { type: 'mushroom', weight: 2 },    // Mushrooms add detail
          { type: 'grass', weight: 3 }        // Grass patches are common
        ]
      },
      town: {
        density: 0.04, // 4% of interior tiles (sparse, structured placement)
        clusterSize: 8, // Medium clusters for structured but natural placement
        types: [
          { type: 'flower', weight: 3 },      // Flowers are most common in towns
          { type: 'grass', weight: 2 },         // Small grass patches
          { type: 'rock', weight: 1.5 }        // Occasional decorative rocks
        ],
        // Towns use structured placement - decorations align to grid
        structured: true,
        gridSize: 4  // Align decorations to 4-tile grid
      },
      road: {
        density: 0.012, // 1.2% of interior tiles (minimal, path-focused)
        clusterSize: 3, // Very small clusters for minimal decoration
        types: [
          { type: 'grass', weight: 2.5 },   // Small grass patches along path edges
          { type: 'flower', weight: 1 }     // Occasional flowers
        ],
        // Roads have minimal decorations - only near edges
        edgeOnly: true,  // Prefer decorations near path edges
        edgeDistance: 2  // Within 2 tiles of edge
      },
      dungeon: {
        density: 0.07, // 7% of interior tiles (enhanced for dungeon atmosphere)
        clusterSize: 6, // Medium clusters for dungeon decorations
        types: [
          { type: 'torch', weight: 4 },      // Torches are most common in dungeons (lighting)
          { type: 'rock', weight: 3.5 },    // Rocks add dungeon atmosphere
          { type: 'mushroom', weight: 1 }    // Minimal vegetation (rare in dungeons)
        ]
      }
    };
    
    return configs[zoneType] || null;
  },
  
  /**
   * Determine if a decoration should be placed at this position
   * Uses hash-based probability with clustering for natural appearance
   * Supports structured placement for towns (grid-aligned)
   * @param {Number} x - Tile X coordinate
   * @param {Number} y - Tile Y coordinate
   * @param {Object} config - Decoration configuration
   * @returns {Boolean} - True if decoration should be placed
   */
  shouldPlaceDecoration(x, y, config) {
    // For structured placement (towns), align to grid
    if (config.structured && config.gridSize) {
      // Only place decorations at grid intersections for structured appearance
      const gridX = Math.floor(x / config.gridSize);
      const gridY = Math.floor(y / config.gridSize);
      const localX = x % config.gridSize;
      const localY = y % config.gridSize;
      
      // Only place at grid corners (0,0) or center of grid cell
      const isGridPosition = (localX === 0 && localY === 0) || 
                            (localX === Math.floor(config.gridSize / 2) && 
                             localY === Math.floor(config.gridSize / 2));
      
      if (!isGridPosition) {
        return false; // Not at a valid grid position
      }
      
      // Use grid-based probability for structured placement
      const gridHash = this.hash(gridX, gridY);
      const gridValue = Math.abs(gridHash) % 100;
      const gridProbability = gridValue / 100;
      
      // Place decoration if grid probability is below density threshold
      return gridProbability < config.density;
    }
    
    // Use clustered variation for natural grouping (wilderness, etc.)
    const clusterX = Math.floor(x / config.clusterSize);
    const clusterY = Math.floor(y / config.clusterSize);
    
    // Hash cluster coordinates for consistent cluster-based placement
    const clusterHash = this.hash(clusterX, clusterY);
    const clusterValue = Math.abs(clusterHash) % 100;
    
    // Base probability from cluster (creates clusters of decorations)
    const clusterProbability = clusterValue / 100;
    
    // Add local variation within cluster
    const localHash = this.hash(x, y);
    const localValue = Math.abs(localHash) % 100;
    const localProbability = localValue / 100;
    
    // Combine cluster and local probabilities
    // Clusters with high clusterProbability are more likely to have decorations
    const combinedProbability = (clusterProbability * 0.7) + (localProbability * 0.3);
    
    // Place decoration if combined probability is below density threshold
    return combinedProbability < config.density;
  },
  
  /**
   * Get distance to nearest edge of zone
   * Used for edge-only decoration placement (roads)
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} zone - Zone object
   * @returns {Number} - Distance to nearest edge in tiles
   */
  getDistanceToNearestEdge(tileX, tileY, zone) {
    if (!zone) {
      return Infinity; // No zone, can't calculate distance
    }
    
    const worldX = tileX * this.TILE_SIZE;
    const worldY = tileY * this.TILE_SIZE;
    
    // Calculate distances to each edge
    const distToLeft = worldX - zone.x;
    const distToRight = (zone.x + zone.width) - worldX;
    const distToTop = worldY - zone.y;
    const distToBottom = (zone.y + zone.height) - worldY;
    
    // Find minimum distance
    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
    
    // Convert to tiles
    return Math.floor(minDist / this.TILE_SIZE);
  },
  
  /**
   * Select decoration type based on zone and hash
   * Uses weighted random selection from available types
   * @param {Number} x - Tile X coordinate
   * @param {Number} y - Tile Y coordinate
   * @param {String} zoneType - Zone type
   * @param {Object} config - Decoration configuration
   * @returns {String|null} - Decoration type or null
   */
  selectDecorationType(x, y, zoneType, config) {
    if (!config.types || config.types.length === 0) {
      return null;
    }
    
    // Calculate total weight
    const totalWeight = config.types.reduce((sum, item) => sum + item.weight, 0);
    
    // Use hash for consistent selection
    const hashValue = this.hash(x, y);
    const selectionValue = Math.abs(hashValue) % 100;
    const target = (selectionValue / 100) * totalWeight;
    
    // Find which decoration type to use based on weighted selection
    let cumulative = 0;
    for (let item of config.types) {
      cumulative += item.weight;
      if (target < cumulative) {
        return item.type;
      }
    }
    
    // Fallback to last type
    return config.types[config.types.length - 1].type;
  },
  
  /**
   * Get decoration tile information (tileset and index)
   * Maps decoration types to actual tileset indices
   * Zone-aware: selects appropriate tileset based on zone type (e.g., dungeon rocks use dungeon tileset)
   * @param {String} decorationType - Decoration type ('tree', 'rock', 'torch', etc.)
   * @param {Number} x - Tile X coordinate (for variation)
   * @param {Number} y - Tile Y coordinate (for variation)
   * @param {String} zoneType - Zone type for zone-specific decoration selection
   * @returns {Object|null} - { tileset, index } or null
   */
  getDecorationTileInfo(decorationType, x, y, zoneType = 'wilderness') {
    // For now, we'll use placeholder tileset and indices
    // These will need to be adjusted based on actual tileset layouts
    // TODO: Map to actual decoration tiles in tilesets when available
    
    const hash = this.hash(x, y);
    const variation = Math.abs(hash) % 3; // 0-2 variations per type
    
    // Zone-specific decoration mappings
    // Some decorations use different tilesets based on zone type
    if (zoneType === 'dungeon') {
      // Dungeon-specific decorations
      if (decorationType === 'torch') {
        return {
          tileset: 'dungeon',
          index: 22 + (variation % 2) // Torches in dungeon tileset
        };
      }
      if (decorationType === 'rock') {
        return {
          tileset: 'dungeon',
          index: 24 + (variation % 2) // Dungeon rocks in dungeon tileset
        };
      }
      if (decorationType === 'mushroom') {
        return {
          tileset: 'dungeon',
          index: 26 + (variation % 2) // Dungeon mushrooms in dungeon tileset
        };
      }
    }
    
    // General decoration mappings (wilderness, towns, etc.)
    const decorationMap = {
      tree: {
        tileset: 'floors', // TODO: Use actual trees tileset when available
        baseIndex: 22, // Placeholder - adjust based on actual tileset
        variations: 3
      },
      rock: {
        tileset: 'floors', // TODO: Use actual rocks tileset when available
        baseIndex: 25, // Placeholder - adjust based on actual tileset
        variations: 2
      },
      flower: {
        tileset: 'floors', // TODO: Use actual flowers tileset when available
        baseIndex: 27, // Placeholder - adjust based on actual tileset
        variations: 4
      },
      mushroom: {
        tileset: 'floors', // TODO: Use actual mushrooms tileset when available
        baseIndex: 31, // Placeholder - adjust based on actual tileset
        variations: 2
      },
      grass: {
        tileset: 'floors', // TODO: Use actual grass tileset when available
        baseIndex: 33, // Placeholder - adjust based on actual tileset
        variations: 3
      },
      torch: {
        tileset: 'dungeon', // Torches are in dungeon tileset
        baseIndex: 22, // Placeholder - adjust based on actual tileset layout
        variations: 2  // Multiple torch variations for variety
      }
    };
    
    const info = decorationMap[decorationType];
    if (!info) {
      return null;
    }
    
    // Calculate tile index with variation
    const index = info.baseIndex + (variation % info.variations);
    
    return {
      tileset: info.tileset,
      index: index
    };
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
   * Get extended autotile information including diagonal neighbors
   * Needed for proper inner corner detection in RPG Maker-style autotiling
   * Returns object with cardinal and diagonal neighbor information
   */
  getExtendedAutotileInfo(tileX, tileY) {
    const centerZone = this.getZoneAtTile(tileX, tileY);
    const info = {
      cardinal: {
        north: false,
        south: false,
        east: false,
        west: false
      },
      diagonal: {
        ne: false, // Northeast
        nw: false, // Northwest
        se: false, // Southeast
        sw: false  // Southwest
      }
    };
    
    // Check cardinal directions
    if (tileY > 0) {
      const northZone = this.getZoneAtTile(tileX, tileY - 1);
      info.cardinal.north = !this.isSameZone(centerZone, northZone);
    } else {
      info.cardinal.north = true;
    }
    
    if (tileY < this.worldHeightTiles - 1) {
      const southZone = this.getZoneAtTile(tileX, tileY + 1);
      info.cardinal.south = !this.isSameZone(centerZone, southZone);
    } else {
      info.cardinal.south = true;
    }
    
    if (tileX < this.worldWidthTiles - 1) {
      const eastZone = this.getZoneAtTile(tileX + 1, tileY);
      info.cardinal.east = !this.isSameZone(centerZone, eastZone);
    } else {
      info.cardinal.east = true;
    }
    
    if (tileX > 0) {
      const westZone = this.getZoneAtTile(tileX - 1, tileY);
      info.cardinal.west = !this.isSameZone(centerZone, westZone);
    } else {
      info.cardinal.west = true;
    }
    
    // Check diagonal directions (for inner corner detection)
    if (tileY > 0 && tileX < this.worldWidthTiles - 1) {
      const neZone = this.getZoneAtTile(tileX + 1, tileY - 1);
      info.diagonal.ne = !this.isSameZone(centerZone, neZone);
    } else {
      info.diagonal.ne = true;
    }
    
    if (tileY > 0 && tileX > 0) {
      const nwZone = this.getZoneAtTile(tileX - 1, tileY - 1);
      info.diagonal.nw = !this.isSameZone(centerZone, nwZone);
    } else {
      info.diagonal.nw = true;
    }
    
    if (tileY < this.worldHeightTiles - 1 && tileX < this.worldWidthTiles - 1) {
      const seZone = this.getZoneAtTile(tileX + 1, tileY + 1);
      info.diagonal.se = !this.isSameZone(centerZone, seZone);
    } else {
      info.diagonal.se = true;
    }
    
    if (tileY < this.worldHeightTiles - 1 && tileX > 0) {
      const swZone = this.getZoneAtTile(tileX - 1, tileY + 1);
      info.diagonal.sw = !this.isSameZone(centerZone, swZone);
    } else {
      info.diagonal.sw = true;
    }
    
    return info;
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
   * Determine transition style between two zones
   * Returns object with transition information: { style, tileset, useWalls, preferWallVariations }
   * Implements smooth blending rules for different zone type combinations
   * Better utilizes all available tilesets including Wall_Variations.png
   * @param {Object} centerZone - The zone at the current tile
   * @param {Object} borderZone - The adjacent zone (can be null)
   * @returns {Object} - Transition style information
   */
  getTransitionStyle(centerZone, borderZone) {
    // Default: no transition needed
    if (!centerZone && !borderZone) {
      return { style: 'none', tileset: 'floors', useWalls: false, preferWallVariations: false };
    }
    
    // If one zone is null, treat as wilderness
    const centerType = centerZone ? centerZone.type : 'wilderness';
    const borderType = borderZone ? borderZone.type : 'wilderness';
    
    // Same zone type: no transition (but still use edge tiles if on border)
    if (centerType === borderType && centerZone && borderZone && 
        centerZone.id === borderZone.id) {
      return { style: 'none', tileset: 'floors', useWalls: false, preferWallVariations: false };
    }
    
    // Town borders: use walls, prefer wallVariations for visual variety
    if (centerType === 'town') {
      return { style: 'wall', tileset: 'walls', useWalls: true, preferWallVariations: true };
    }
    
    // Dungeon borders: always use dungeon walls
    if (centerType === 'dungeon') {
      return { style: 'wall', tileset: 'dungeon', useWalls: true, preferWallVariations: false };
    }
    
    // Road borders: use smooth edge transitions (roads blend naturally)
    if (centerType === 'road') {
      return { style: 'edge', tileset: 'floors', useWalls: false, preferWallVariations: false };
    }
    
    // Water borders: use water edge tiles from Water_tiles.png
    if (centerType === 'water') {
      return { style: 'edge', tileset: 'water', useWalls: false, preferWallVariations: false };
    }
    
    // Wilderness transitions: use smooth edges for natural blending
    // Can use wallVariations for transitions to structured zones
    if (centerType === 'wilderness') {
      // Wilderness to Town: can use wallVariations for transition variety
      if (borderType === 'town') {
        return { style: 'edge', tileset: 'floors', useWalls: false, preferWallVariations: true };
      }
      
      // Wilderness to Dungeon: smooth edge
      if (borderType === 'dungeon') {
        return { style: 'edge', tileset: 'floors', useWalls: false, preferWallVariations: false };
      }
      
      // Wilderness to Road: smooth edge
      if (borderType === 'road') {
        return { style: 'edge', tileset: 'floors', useWalls: false, preferWallVariations: false };
      }
      
      // Wilderness to Water: smooth edge (water tileset handles water borders)
      if (borderType === 'water') {
        return { style: 'edge', tileset: 'floors', useWalls: false, preferWallVariations: false };
      }
      
      // Wilderness to Wilderness (different zones): smooth edge for natural blending
      if (borderType === 'wilderness') {
        return { style: 'edge', tileset: 'floors', useWalls: false, preferWallVariations: false };
      }
    }
    
    // Default: smooth edge transition for natural blending
    return { style: 'edge', tileset: 'floors', useWalls: false, preferWallVariations: false };
  },
  
  /**
   * Get the best transition tileset for a border tile
   * Considers both center and border zones to choose appropriate tileset
   * @param {Object} centerZone - The zone at the current tile
   * @param {Object} borderZones - Object with north, south, east, west zone references
   * @returns {String} - Tileset name to use
   */
  getTransitionTileset(centerZone, borderZones) {
    // Get the dominant border zone type (most common adjacent zone type)
    const borderTypes = [];
    if (borderZones.north) borderTypes.push(borderZones.north.type);
    if (borderZones.south) borderTypes.push(borderZones.south.type);
    if (borderZones.east) borderTypes.push(borderZones.east.type);
    if (borderZones.west) borderTypes.push(borderZones.west.type);
    
    // If no borders, return default
    if (borderTypes.length === 0) {
      return centerZone ? 'floors' : 'floors';
    }
    
    // Get transition style for the first border (or most common)
    const primaryBorder = borderZones.north || borderZones.south || borderZones.east || borderZones.west;
    const transition = this.getTransitionStyle(centerZone, primaryBorder);
    
    return transition.tileset;
  },
  
  /**
   * Determine if a border should use transition tiles or wall tiles
   * Some zone transitions use walls, others use smooth transitions
   * @deprecated - Use getTransitionStyle() instead for better transition handling
   */
  shouldUseWallBorder(centerZone, borderZone) {
    const transition = this.getTransitionStyle(centerZone, borderZone);
    return transition.useWalls;
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
   * Map autotile bitmask to RPG Maker-style tile index
   * RPG Maker autotiles use a 47-tile pattern arranged in a specific grid:
   * 
   * Standard autotile layout (arranged in rows):
   * Row 0 (tiles 0-2):   Base interior variations
   * Row 1 (tiles 3-6):   Single edge tiles (N, S, E, W)
   * Row 2 (tiles 7-10):  Outer corner tiles (NE, NW, SE, SW)
   * Row 3 (tiles 11-14): Inner corner tiles (concave corners)
   * Row 4+ (tiles 15-46): Various edge combinations and special cases
   * 
   * This function maps the 4-bit cardinal direction bitmask to the correct tile index.
   * For inner corners, use mapExtendedAutotileToTileIndex() instead.
   * 
   * @param {Number} bitmask - Autotile bitmask (0-15) from cardinal directions
   * @param {Object} extendedInfo - Optional extended info with diagonal neighbors for inner corners
   * @param {String} tilesetName - Optional tileset name to clamp indices to available range
   * @returns {Number} - Tile index in sprite sheet
   */
  mapBitmaskToTileIndex(bitmask, extendedInfo = null, tilesetName = null) {
    // Extract cardinal direction flags
    const hasNorth = (bitmask & 1) !== 0;
    const hasSouth = (bitmask & 2) !== 0;
    const hasEast = (bitmask & 4) !== 0;
    const hasWest = (bitmask & 8) !== 0;
    
    const edgeCount = (hasNorth ? 1 : 0) + (hasSouth ? 1 : 0) + 
                     (hasEast ? 1 : 0) + (hasWest ? 1 : 0);
    
    // Interior tile (no edges) - use base tile variations
    if (edgeCount === 0) {
      return 0; // Base interior tile (can be varied with getFloorVariation, etc.)
    }
    
    // Single edge tiles
    if (edgeCount === 1) {
      if (hasNorth) return 3;  // North edge
      if (hasSouth) return 4;  // South edge
      if (hasEast) return 5;   // East edge
      if (hasWest) return 6;   // West edge
    }
    
    // Two edges - could be corners or straight edges
    if (edgeCount === 2) {
      // Straight edges (opposite sides)
      if (hasNorth && hasSouth) return 15; // Vertical straight edge
      if (hasEast && hasWest) return 16;   // Horizontal straight edge
      
      // Check for inner corners (concave corners) when diagonal is same zone
      if (extendedInfo) {
        // Inner corner NE: has N and E edges, and NE diagonal is same zone
        if (hasNorth && hasEast && !extendedInfo.diagonal.ne) {
          return 11; // NE inner corner
        }
        // Inner corner NW: has N and W edges, and NW diagonal is same zone
        if (hasNorth && hasWest && !extendedInfo.diagonal.nw) {
          return 12; // NW inner corner
        }
        // Inner corner SE: has S and E edges, and SE diagonal is same zone
        if (hasSouth && hasEast && !extendedInfo.diagonal.se) {
          return 13; // SE inner corner
        }
        // Inner corner SW: has S and W edges, and SW diagonal is same zone
        if (hasSouth && hasWest && !extendedInfo.diagonal.sw) {
          return 14; // SW inner corner
        }
      }
      
      // Outer corners (adjacent edges, no inner corner detected)
      if (hasNorth && hasEast) return 7;   // NE outer corner
      if (hasNorth && hasWest) return 8;   // NW outer corner
      if (hasSouth && hasEast) return 9;   // SE outer corner
      if (hasSouth && hasWest) return 10;  // SW outer corner
    }
    
    // Three edges - T-junctions
    if (edgeCount === 3) {
      // T-junction tiles (three edges meeting)
      if (hasNorth && hasEast && hasWest) return 17; // N+E+W T-junction
      if (hasSouth && hasEast && hasWest) return 18; // S+E+W T-junction
      if (hasNorth && hasSouth && hasEast) return 19; // N+S+E T-junction
      if (hasNorth && hasSouth && hasWest) return 20; // N+S+W T-junction
    }
    
    // Four edges - isolated tile or full border
    if (edgeCount === 4) {
      // Check for inner corners in all four corners
      if (extendedInfo) {
        // All four inner corners
        if (!extendedInfo.diagonal.ne && !extendedInfo.diagonal.nw && 
            !extendedInfo.diagonal.se && !extendedInfo.diagonal.sw) {
          let index = 21; // Isolated tile with all inner corners
          // Clamp to available tiles if tileset specified
          if (tilesetName) {
            const maxIndex = this.getAvailableTileCount(tilesetName);
            index = Math.min(index, maxIndex - 1);
          }
          return index;
        }
      }
      let index = 21; // Isolated tile (surrounded by different zones)
      // Clamp to available tiles if tileset specified
      if (tilesetName) {
        const maxIndex = this.getAvailableTileCount(tilesetName);
        index = Math.min(index, maxIndex - 1);
      }
      return index;
    }
    
    // Fallback: return bitmask as index (shouldn't reach here)
    let fallbackIndex = bitmask;
    if (tilesetName) {
      const maxIndex = this.getAvailableTileCount(tilesetName);
      fallbackIndex = Math.min(fallbackIndex, maxIndex - 1);
    }
    return fallbackIndex;
  },
  
  /**
   * Map extended autotile information to tile index (with diagonal support)
   * Use this for tiles that need inner corner detection
   * @param {Object} extendedInfo - Extended autotile info from getExtendedAutotileInfo()
   * @returns {Number} - Tile index in sprite sheet
   */
  mapExtendedAutotileToTileIndex(extendedInfo) {
    const c = extendedInfo.cardinal;
    const d = extendedInfo.diagonal;
    
    // Build cardinal bitmask
    let bitmask = 0;
    if (c.north) bitmask |= 1;
    if (c.south) bitmask |= 2;
    if (c.east) bitmask |= 4;
    if (c.west) bitmask |= 8;
    
    // Use the main mapping function with extended info
    return this.mapBitmaskToTileIndex(bitmask, extendedInfo);
  },
  
  /**
   * Map autotile bitmask to wall tile index
   * Walls use the same RPG Maker-style mapping but may have different base offsets
   * Supports both 'walls' and 'wallVariations' tilesets
   * @param {Number} bitmask - Autotile bitmask (0-15)
   * @param {String} tilesetName - Optional tileset name for clamping ('walls' or 'wallVariations')
   * @returns {Number} - Wall tile index
   */
  mapBitmaskToWallTileIndex(bitmask, tilesetName = null) {
    // Use the same mapping as regular tiles
    // Both 'walls' and 'wallVariations' use the same autotile pattern
    const index = this.mapBitmaskToTileIndex(bitmask, null, tilesetName);
    return index;
  },
  
  /**
   * Select appropriate tileset for zone borders and transitions
   * Better utilizes all available tilesets including Wall_Variations.png
   * @param {String} baseTileset - Base tileset name ('walls', 'floors', etc.)
   * @param {Number} tileX - Tile X coordinate (for hash-based selection)
   * @param {Number} tileY - Tile Y coordinate (for hash-based selection)
   * @param {Boolean} preferVariations - Whether to prefer wallVariations
   * @param {Number} variationChance - Chance to use variations (0-1, default 0.4)
   * @returns {String} - Selected tileset name
   */
  selectBorderTileset(baseTileset, tileX, tileY, preferVariations = false, variationChance = 0.4) {
    // For wall tilesets, can use wallVariations for variety
    if (baseTileset === 'walls' && preferVariations) {
      const hash = this.hash(tileX, tileY);
      const useVariations = (Math.abs(hash) % 100) < (variationChance * 100);
      if (useVariations) {
        return 'wallVariations';
      }
    }
    
    // For water borders, ensure we use water tileset
    if (baseTileset === 'water') {
      return 'water';
    }
    
    // Default: use base tileset
    return baseTileset;
  },
  
  /**
   * Select tile index based on autotile analysis and zone type
   * This is the core autotiling function that maps bitmasks to tile indices
   * @param {Object} analysis - Result from analyzeAutotileBitmask()
   * @param {String} zoneType - Type of zone ('town', 'wilderness', 'road', 'dungeon', etc.)
   * @param {Number} baseVariation - Base variation offset for interior tiles
   * @param {Object} extendedInfo - Extended autotile info with diagonal neighbors (optional)
   * @param {String} tilesetName - Optional tileset name for clamping indices
   * @returns {Number} - Tile index to use in the tileset
   */
  selectTileIndexFromAutotile(analysis, zoneType, baseVariation = 0, extendedInfo = null, tilesetName = null) {
    if (analysis.isInterior) {
      // Interior tile: use base variation (already clamped by getWeightedBaseTile)
      return baseVariation;
    } else {
      // Edge/Corner tile: use bitmask mapping with extended info for inner corners
      return this.mapBitmaskToTileIndex(analysis.bitmask, extendedInfo, tilesetName);
    }
  },
  
  /**
   * Get contextual tile for a position based on zone type and autotile analysis
   * Improved to handle smooth zone transitions with appropriate tilesets
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} zone - Zone object (can be null)
   * @param {Object} analysis - Autotile analysis result
   * @param {Object} extendedInfo - Extended autotile info with diagonal neighbors (optional)
   * @returns {Object} - Tile data: { type, tileset, index }
   */
  getContextualTile(tileX, tileY, zone, analysis, extendedInfo = null) {
    // Get border information for transition-aware tile selection
    const borderInfo = this.getBorderInfo(tileX, tileY);
    
    // If interior tile (no borders), use standard zone-specific tile
    if (analysis.isInterior) {
      if (!zone) {
        return this.getWildernessTile(tileX, tileY, analysis, extendedInfo);
      }
      
      // Route to appropriate tile selection based on zone type
      switch (zone.type) {
        case 'town':
          return this.getTownTile(tileX, tileY, zone, analysis, extendedInfo);
        case 'road':
          return this.getRoadTile(tileX, tileY, zone, analysis, extendedInfo);
        case 'dungeon':
          return this.getDungeonTile(tileX, tileY, zone, analysis, extendedInfo);
        case 'water':
          return this.getWaterTile(tileX, tileY, zone, analysis, extendedInfo);
        case 'wilderness':
        default:
          return this.getWildernessTile(tileX, tileY, analysis, extendedInfo);
      }
    }
    
    // Border tile: use transition-aware selection
    return this.getTransitionTile(tileX, tileY, zone, analysis, extendedInfo, borderInfo);
  },
  
  /**
   * Get transition tile for border positions
   * Selects appropriate tileset and tile index based on zone transitions
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} zone - Zone object (can be null)
   * @param {Object} analysis - Autotile analysis result
   * @param {Object} extendedInfo - Extended autotile info
   * @param {Object} borderInfo - Border information from getBorderInfo()
   * @returns {Object} - Tile data: { type, tileset, index }
   */
  getTransitionTile(tileX, tileY, zone, analysis, extendedInfo, borderInfo) {
    // Determine transition style based on center zone and border zones
    // Find the most significant border (prioritize certain zone types)
    const borderZones = borderInfo.borderZones;
    let primaryBorder = borderZones.north || borderZones.south || 
                       borderZones.east || borderZones.west;
    
    // Prioritize town/dungeon borders over wilderness/road for transition style
    const priorityBorders = [];
    if (borderZones.north) priorityBorders.push(borderZones.north);
    if (borderZones.south) priorityBorders.push(borderZones.south);
    if (borderZones.east) priorityBorders.push(borderZones.east);
    if (borderZones.west) priorityBorders.push(borderZones.west);
    
    // Find highest priority border (town/dungeon > road > wilderness)
    for (let border of priorityBorders) {
      if (border.type === 'town' || border.type === 'dungeon') {
        primaryBorder = border;
        break;
      }
    }
    if (!primaryBorder && priorityBorders.length > 0) {
      primaryBorder = priorityBorders[0];
    }
    
    const transition = this.getTransitionStyle(zone, primaryBorder);
    
    // Get the appropriate tileset for this transition
    // Use selectBorderTileset for better tileset selection including Wall_Variations.png
    let tileset = transition.tileset;
    
    // Use Wall_Variations.png for zone borders and transitions when appropriate
    if (transition.preferWallVariations) {
      // Use wallVariations for visual variety (40% chance for town walls, 30% for wilderness-to-town transitions)
      const variationChance = transition.useWalls ? 0.4 : 0.3;
      tileset = this.selectBorderTileset(tileset, tileX, tileY, true, variationChance);
    } else if (transition.useWalls && zone) {
      // For other wall transitions, can also use wallVariations occasionally (15% chance)
      tileset = this.selectBorderTileset(tileset, tileX, tileY, false, 0.15);
    }
    
    // Ensure water borders use Water_tiles.png
    if (transition.tileset === 'water') {
      tileset = 'water';
    }
    
    // Map bitmask to tile index using the transition tileset
    const tileIndex = this.mapBitmaskToTileIndex(analysis.bitmask, extendedInfo, tileset);
    
    // Determine tile type based on transition style
    let tileType = 'edge';
    if (transition.useWalls) {
      if (zone && zone.type === 'dungeon') {
        tileType = 'dungeon_wall';
      } else {
        tileType = 'wall';
      }
    } else {
      if (zone) {
        tileType = `${zone.type}_edge`;
      } else {
        tileType = 'wilderness_edge';
      }
    }
    
    return {
      type: tileType,
      tileset: tileset,
      index: tileIndex
    };
  },
  
  /**
   * Get tile for water zones
   * Uses water tileset for proper water rendering
   */
  getWaterTile(tileX, tileY, zone, analysis, extendedInfo = null) {
    if (analysis.isInterior) {
      // Interior: use terrain-specific water tiles with natural clustering
      // Zone-specific: water has its own dedicated tileset
      const terrainTile = this.getTerrainSpecificTile(tileX, tileY, zone, 6);
      
      return {
        type: 'water',
        tileset: terrainTile.tileset,
        index: terrainTile.index
      };
    } else {
      // Border: use water edge tiles mapped from bitmask
      const edgeIndex = this.mapBitmaskToTileIndex(analysis.bitmask, extendedInfo, 'water');
      
      return {
        type: 'water_edge',
        tileset: 'water',
        index: edgeIndex
      };
    }
  },
  
  /**
   * Get tile for town zones
   * Enhanced with structured floor patterns, sparse decorations, and proper wall borders
   * Uses terrain-specific tile sets (stone) with structured grid patterns
   * Uses wall tilesets for proper borders
   */
  getTownTile(tileX, tileY, zone, analysis, extendedInfo = null) {
    if (analysis.isInterior) {
      // Interior: use structured floor patterns with stone terrain
      // Creates organized, grid-like appearance for towns
      const gridPattern = this.getStructuredTownPattern(tileX, tileY, zone);
      
      return {
        type: 'floor',
        tileset: gridPattern.tileset,
        index: gridPattern.index
      };
    } else {
      // Border: use proper wall tilesets for clear boundaries
      // Towns always use walls on borders for structured appearance
      const borderInfo = this.getBorderInfo(tileX, tileY);
      
      // Use extended info for better inner corner detection
      // Select between 'walls' and 'wallVariations' for visual variety
      const wallTileset = this.selectBorderTileset('walls', tileX, tileY, true, 0.4);
      const wallIndex = extendedInfo 
        ? this.mapBitmaskToTileIndex(analysis.bitmask, extendedInfo, wallTileset)
        : this.mapBitmaskToWallTileIndex(analysis.bitmask, wallTileset);
      
      return {
        type: 'wall',
        tileset: wallTileset,  // Uses 'walls' or 'wallVariations' based on selection
        index: wallIndex  // Wall tiles mapped from bitmask with inner corners (already clamped)
      };
    }
  },
  
  /**
   * Get structured town floor pattern
   * Creates organized, grid-like patterns for town interiors
   * Uses stone terrain with structured placement
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} zone - Zone object
   * @returns {Object} - { tileset, index } - Tile information
   */
  getStructuredTownPattern(tileX, tileY, zone) {
    // Use structured grid pattern for organized town layout
    // Smaller grid cells (3-4 tiles) create more structured appearance
    const gridSize = 4;
    const gridX = Math.floor(tileX / gridSize);
    const gridY = Math.floor(tileY / gridSize);
    
    // Get terrain-specific stone tiles
    const terrainInfo = this.getTerrainTileInfo('stone', 0);
    if (!terrainInfo) {
      // Fallback to default
      const range = this.getBaseTileRange('floors');
      const variation = this.getGridPattern(tileX, tileY, gridSize, range.count);
      return {
        tileset: 'floors',
        index: range.start + (variation % range.count)
      };
    }
    
    // Use grid-based variation for structured appearance
    const gridHash = this.hash(gridX, gridY);
    const gridVariation = Math.abs(gridHash) % terrainInfo.variations;
    
    // Add slight local variation within grid cell for texture
    const localX = tileX % gridSize;
    const localY = tileY % gridSize;
    const localHash = this.hash(localX, localY);
    const localVariation = Math.abs(localHash) % 3;
    
    // Combine grid base with small local variation (80% grid, 20% local)
    const finalVariation = localVariation === 0 
      ? gridVariation 
      : (gridVariation + (localVariation % 2)) % terrainInfo.variations;
    
    // Use weighted selection for stone tiles
    const tileIndex = terrainInfo.weights
      ? this.getWeightedBaseTile(finalVariation, {
          start: terrainInfo.baseIndex,
          count: terrainInfo.variations
        }, terrainInfo.weights)
      : terrainInfo.baseIndex + (finalVariation % terrainInfo.variations);
    
    return {
      tileset: terrainInfo.tileset,
      index: tileIndex
    };
  },
  
  /**
   * Get tile for road zones
   * Enhanced with path-specific tiles, minimal decorations, and clear path edges
   * Uses terrain-specific tile sets (dirt) for path-like appearance
   * Creates path-like patterns with clear, defined edges
   */
  getRoadTile(tileX, tileY, zone, analysis, extendedInfo = null) {
    if (analysis.isInterior) {
      // Interior road: use path-specific dirt tiles for consistent path appearance
      // Roads use dirt terrain with very small clusters for path consistency
      const pathTile = this.getPathSpecificTile(tileX, tileY, zone);
      
      return {
        type: 'road',
        tileset: pathTile.tileset,
        index: pathTile.index
      };
    } else {
      // Road borders: use clear path edge tiles
      // Clear path edges help define the road boundaries
      const borderInfo = this.getBorderInfo(tileX, tileY);
      const edgeTile = this.getPathEdgeTile(tileX, tileY, analysis, extendedInfo, borderInfo);
      
      return {
        type: 'road_edge',
        tileset: edgeTile.tileset,
        index: edgeTile.index
      };
    }
  },
  
  /**
   * Get path-specific tile for road interiors
   * Uses dirt terrain with path-focused patterns
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} zone - Zone object
   * @returns {Object} - { tileset, index } - Tile information
   */
  getPathSpecificTile(tileX, tileY, zone) {
    // Get dirt terrain info for path tiles
    const dirtInfo = this.getTerrainTileInfo('dirt', 0);
    if (!dirtInfo) {
      // Fallback to default
      const range = this.getBaseTileRange('floors');
      const variation = this.getClusteredVariation(tileX, tileY, 3, range.count);
      return {
        tileset: 'floors',
        index: range.start + (variation % range.count)
      };
    }
    
    // Use very small clusters (3 tiles) for path consistency
    // Paths should be more uniform than wilderness
    const pathVariation = this.getClusteredVariation(tileX, tileY, 3, dirtInfo.variations);
    
    // Use weighted selection, preferring common dirt tiles
    const tileIndex = dirtInfo.weights
      ? this.getWeightedBaseTile(pathVariation, {
          start: dirtInfo.baseIndex,
          count: dirtInfo.variations
        }, dirtInfo.weights)
      : dirtInfo.baseIndex + (pathVariation % dirtInfo.variations);
    
    return {
      tileset: dirtInfo.tileset,
      index: tileIndex
    };
  },
  
  /**
   * Get path edge tile for road borders
   * Creates clear, defined path edges
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} analysis - Autotile analysis result
   * @param {Object} extendedInfo - Extended autotile info
   * @param {Object} borderInfo - Border information
   * @returns {Object} - { tileset, index } - Edge tile information
   */
  getPathEdgeTile(tileX, tileY, analysis, extendedInfo, borderInfo) {
    // Roads use edge tiles mapped from bitmask for clear path boundaries
    // Use floors tileset for path edges
    const edgeIndex = this.mapBitmaskToTileIndex(analysis.bitmask, extendedInfo, 'floors');
    
    // For roads, we want clear, defined edges
    // The autotile mapping already provides this, but we ensure proper tileset usage
    return {
      tileset: 'floors',
      index: edgeIndex  // Edge tiles mapped from bitmask with inner corners (already clamped)
    };
  },
  
  /**
   * Get tile for dungeon zones
   * Enhanced with dungeon-specific tiles, decorations (torches, rocks), and proper wall borders
   * Uses dungeon-specific tileset for all dungeon features
   */
  getDungeonTile(tileX, tileY, zone, analysis, extendedInfo = null) {
    if (analysis.isInterior) {
      // Interior: use dungeon-specific floor tiles with dungeon-appropriate clustering
      // Dungeons use their own dedicated tileset for authentic dungeon appearance
      const dungeonTile = this.getDungeonSpecificTile(tileX, tileY, zone);
      
      return {
        type: 'dungeon',
        tileset: dungeonTile.tileset,
        index: dungeonTile.index
      };
    } else {
      // Border: use proper dungeon wall borders
      // Dungeons always use dungeon walls for clear boundaries
      const borderInfo = this.getBorderInfo(tileX, tileY);
      const wallTile = this.getDungeonWallTile(tileX, tileY, analysis, extendedInfo, borderInfo);
      
      return {
        type: 'dungeon_wall',
        tileset: wallTile.tileset,
        index: wallTile.index
      };
    }
  },
  
  /**
   * Get dungeon-specific floor tile
   * Uses dungeon tileset with dungeon-appropriate clustering patterns
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} zone - Zone object
   * @returns {Object} - { tileset, index } - Tile information
   */
  getDungeonSpecificTile(tileX, tileY, zone) {
    // Use dungeon tileset with medium clusters for interesting patterns
    const variation = this.getDungeonVariation(tileX, tileY);
    const range = this.getBaseTileRange('dungeon');
    
    // Dungeons use weighted selection for varied but coherent floor patterns
    // Prefer common dungeon floor tiles, but allow variations
    const weights = [2.5, 2.5, 2, 2, 1.5, 1.5, 1, 1];
    const tileIndex = this.getWeightedBaseTile(variation, range, weights);
    
    return {
      tileset: 'dungeon',
      index: tileIndex
    };
  },
  
  /**
   * Get dungeon wall tile for borders
   * Uses dungeon tileset for proper dungeon wall borders
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} analysis - Autotile analysis result
   * @param {Object} extendedInfo - Extended autotile info
   * @param {Object} borderInfo - Border information
   * @returns {Object} - { tileset, index } - Wall tile information
   */
  getDungeonWallTile(tileX, tileY, analysis, extendedInfo, borderInfo) {
    // Dungeons always use dungeon tileset for walls
    // Map bitmask to dungeon wall tile index with inner corner support
    const wallIndex = extendedInfo
      ? this.mapBitmaskToTileIndex(analysis.bitmask, extendedInfo, 'dungeon')
      : this.mapBitmaskToWallTileIndex(analysis.bitmask, 'dungeon');
    
    return {
      tileset: 'dungeon',
      index: wallIndex  // Dungeon wall tiles mapped from bitmask with inner corners (already clamped)
    };
  },
  
  /**
   * Get tile for wilderness zones
   * Enhanced with varied floor tiles, natural clustering, and natural terrain transitions
   * Uses terrain-specific tile sets (grass) with maximum variety
   * Creates natural-looking clusters instead of random noise
   */
  getWildernessTile(tileX, tileY, analysis, extendedInfo = null) {
    if (analysis.isInterior) {
      // Interior: use varied terrain-specific tiles (grass) with enhanced natural clustering
      // Get zone for terrain type determination
      const zone = this.getZoneAtTile(tileX, tileY);
      
      // Use larger cluster size (12) for more natural, varied wilderness appearance
      // This creates larger patches of similar terrain with natural variation
      const terrainTile = this.getTerrainSpecificTile(tileX, tileY, zone, 12);
      
      // Add additional variation by occasionally mixing in adjacent terrain types
      // Creates natural blending between grass and dirt patches
      const mixHash = this.hash(tileX, tileY);
      const shouldMix = (Math.abs(mixHash) % 20) === 0; // 5% chance to mix
      
      if (shouldMix && terrainTile.tileset === 'floors') {
        // Occasionally use dirt tiles for natural variation
        const dirtInfo = this.getTerrainTileInfo('dirt', 0);
        if (dirtInfo) {
          const dirtVariation = this.getClusteredVariation(tileX, tileY, 15, dirtInfo.variations);
          const dirtIndex = dirtInfo.weights
            ? this.getWeightedBaseTile(dirtVariation, {
                start: dirtInfo.baseIndex,
                count: dirtInfo.variations
              }, dirtInfo.weights)
            : dirtInfo.baseIndex + (dirtVariation % dirtInfo.variations);
          
          return {
            type: 'wilderness',
            tileset: dirtInfo.tileset,
            index: dirtIndex
          };
        }
      }
      
      return {
        type: 'wilderness',
        tileset: terrainTile.tileset,
        index: terrainTile.index
      };
    } else {
      // Border: use smooth transition tiles mapped from bitmask with extended info
      // Enhanced natural-looking terrain transitions
      const borderInfo = this.getBorderInfo(tileX, tileY);
      
      // Map bitmask to edge tile index for smooth transitions with inner corners
      const edgeIndex = this.mapBitmaskToTileIndex(analysis.bitmask, extendedInfo, 'floors');
      
      // For wilderness-to-wilderness transitions, use even smoother blending
      // by occasionally using transition tiles that blend better
      const primaryBorder = borderInfo.borderZones.north || 
                           borderInfo.borderZones.south || 
                           borderInfo.borderZones.east || 
                           borderInfo.borderZones.west;
      
      if (primaryBorder && primaryBorder.type === 'wilderness') {
        // Same zone type transition - use smoother edge tiles
        // The edgeIndex already handles this, but we ensure it's using the right tileset
        return {
          type: 'wilderness_edge',
          tileset: 'floors',
          index: edgeIndex
        };
      }
      
      return {
        type: 'wilderness_edge',
        tileset: 'floors',
        index: edgeIndex  // Edge tiles mapped from bitmask with inner corners (already clamped)
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
   * Terrain type definitions for different zones
   * Maps zone types to terrain types (grass, dirt, stone, etc.)
   * Used for terrain-specific tile selection
   */
  terrainTypes: {
    wilderness: 'grass',      // Wilderness uses grass terrain
    town: 'stone',            // Towns use stone/cobblestone terrain
    road: 'dirt',             // Roads use dirt/path terrain
    dungeon: 'stone',         // Dungeons use stone terrain
    water: 'water'            // Water uses water terrain
  },
  
  /**
   * Terrain-specific tile mappings
   * Defines which tile indices represent different terrain types
   * These are offsets within the base tileset
   */
  terrainTileMappings: {
    grass: {
      tileset: 'floors',
      baseOffset: 0,      // Grass tiles start at index 0
      variations: 6,      // 6 grass variations
      weights: [3, 2.5, 2, 1.5, 1, 0.8]  // Common grass tiles appear more often
    },
    dirt: {
      tileset: 'floors',
      baseOffset: 6,      // Dirt tiles start at index 6
      variations: 4,      // 4 dirt variations
      weights: [3, 2, 1.5, 1]
    },
    stone: {
      tileset: 'floors',
      baseOffset: 10,     // Stone tiles start at index 10
      variations: 4,      // 4 stone variations
      weights: [2.5, 2, 1.5, 1]
    },
    water: {
      tileset: 'water',
      baseOffset: 0,      // Water tiles start at index 0
      variations: 4,      // 4 water variations
      weights: [2, 2, 1.5, 1]
    }
  },
  
  /**
   * Get terrain type for a zone
   * @param {Object} zone - Zone object (can be null)
   * @returns {String} - Terrain type ('grass', 'dirt', 'stone', 'water')
   */
  getTerrainType(zone) {
    if (!zone) {
      return 'grass'; // Default to grass for wilderness
    }
    return this.terrainTypes[zone.type] || 'grass';
  },
  
  /**
   * Get terrain-specific tile information
   * @param {String} terrainType - Terrain type ('grass', 'dirt', 'stone', 'water')
   * @param {Number} variation - Variation index from clustering
   * @returns {Object|null} - { tileset, baseIndex, weights } or null
   */
  getTerrainTileInfo(terrainType, variation) {
    const mapping = this.terrainTileMappings[terrainType];
    if (!mapping) {
      return null;
    }
    
    return {
      tileset: mapping.tileset,
      baseIndex: mapping.baseOffset,
      variations: mapping.variations,
      weights: mapping.weights || null
    };
  },
  
  /**
   * Create coherent clusters using noise-like pattern
   * Enhanced to create more natural-looking clusters instead of random noise
   * Uses multi-scale noise for better natural appearance
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
    
    // Multi-scale noise for more natural clustering
    // Large scale: cluster level (determines main terrain type)
    // Medium scale: sub-cluster level (adds regional variation)
    // Small scale: local level (adds fine detail)
    
    const subClusterSize = Math.max(2, Math.floor(clusterSize / 3));
    const subClusterX = Math.floor(x / subClusterSize);
    const subClusterY = Math.floor(y / subClusterSize);
    const subClusterHash = this.hash(subClusterX, subClusterY);
    const subVariation = Math.abs(subClusterHash) % 3; // 0-2
    
    // Local variation for fine detail
    const localX = x % subClusterSize;
    const localY = y % subClusterSize;
    const localHash = this.hash(localX, localY);
    const localVariation = Math.abs(localHash) % 2; // 0-1
    
    // Combine variations: 70% cluster base, 20% sub-cluster, 10% local
    const combined = (baseVariation * 0.7) + (subVariation * 0.2) + (localVariation * 0.1);
    const finalVariation = Math.floor(combined) % variations;
    
    // Occasionally use adjacent variation for natural blending
    if (localVariation === 1 && Math.abs(subVariation) % 2 === 0) {
      // 30% chance to use adjacent variation for texture
      const adjacentVariation = (baseVariation + (subVariation % 2 === 0 ? 1 : -1) + variations) % variations;
      return adjacentVariation;
    }
    
    return finalVariation;
  },
  
  /**
   * Get floor tile variation with coherent clusters
   * Uses more variations for better tile variety
   */
  getFloorVariation(x, y) {
    return this.getClusteredVariation(x, y, 6, 8); // 6-tile clusters, 8 variations
  },
  
  /**
   * Get dungeon tile variation with coherent clusters
   * Uses more variations for interesting dungeon floors
   */
  getDungeonVariation(x, y) {
    return this.getClusteredVariation(x, y, 5, 8); // 5-tile clusters, 8 variations
  },
  
  /**
   * Get wilderness tile variation with larger, more natural clusters
   * Enhanced for maximum variety and natural appearance
   * Uses maximum variations for natural wilderness appearance
   */
  getWildernessVariation(x, y) {
    // Use larger clusters (12 tiles) with more variations (up to available tiles)
    // This creates more natural, varied wilderness appearance
    return this.getClusteredVariation(x, y, 12, 12); // 12-tile clusters, 12 variations
  },
  
  /**
   * Create grid pattern for structured areas (like towns)
   * @param {Number} x - Tile X coordinate
   * @param {Number} y - Tile Y coordinate
   * @param {Number} gridSize - Size of grid cells
   * @param {Number} variations - Number of variations
   * @returns {Number} - Variation index
   */
  getGridPattern(x, y, gridSize = 4, variations = 8) {
    const gridX = Math.floor(x / gridSize);
    const gridY = Math.floor(y / gridSize);
    const hash = this.hash(gridX, gridY);
    return Math.abs(hash) % variations;
  },
  
  /**
   * Create path pattern for roads
   * Creates a more structured, path-like appearance
   * Uses more variations but with weighted selection for consistency
   */
  getRoadPattern(x, y) {
    // Roads use smaller clusters for more consistent appearance
    // But generate more variation values for weighted selection
    return this.getClusteredVariation(x, y, 4, 8); // 4-tile clusters, 8 variations (weighted down)
  },
  
  /**
   * Get available tile count for a tileset
   * Dynamically calculates based on tileset dimensions
   * @param {String} tilesetName - Name of the tileset ('floors', 'walls', etc.)
   * @returns {Number} - Number of available tiles in the tileset
   */
  getAvailableTileCount(tilesetName) {
    const tileset = Assets.getTileset(tilesetName);
    if (!tileset || !tileset.width || !tileset.height) {
      // Fallback to config max if tileset not loaded
      const config = this.tilesetConfig[tilesetName];
      return config ? config.maxTiles : 48;
    }
    
    // Calculate total tiles in sprite sheet
    const tilesPerRow = Math.floor(tileset.width / this.TILE_SIZE);
    const tilesPerCol = Math.floor(tileset.height / this.TILE_SIZE);
    const totalTiles = tilesPerRow * tilesPerCol;
    
    // Use config max if available, otherwise use calculated total
    const config = this.tilesetConfig[tilesetName];
    if (config && config.maxTiles) {
      return Math.min(config.maxTiles, totalTiles);
    }
    
    return totalTiles;
  },
  
  /**
   * Get base tile range for a tileset
   * Returns the range of interior/base tiles available
   * @param {String} tilesetName - Name of the tileset
   * @returns {Object} - { start, count, max } - Tile range information
   */
  getBaseTileRange(tilesetName) {
    const config = this.tilesetConfig[tilesetName];
    if (!config) {
      // Default fallback
      return { start: 0, count: 4, max: 8 };
    }
    
    const availableCount = this.getAvailableTileCount(tilesetName);
    const baseConfig = config.baseTiles;
    
    // Ensure we don't exceed available tiles
    const maxCount = Math.min(baseConfig.count, availableCount - baseConfig.start);
    
    return {
      start: baseConfig.start,
      count: Math.max(1, maxCount),
      max: availableCount
    };
  },
  
  /**
   * Get weighted random tile index from base tiles
   * Enhanced weighted selection with better distribution
   * Uses weighted selection to prefer certain tiles (e.g., common tiles appear more often)
   * @param {Number} variation - Variation index from hash/cluster function
   * @param {Object} range - Tile range from getBaseTileRange()
   * @param {Array} weights - Optional array of weights for each tile (default: equal weights)
   * @returns {Number} - Selected tile index
   */
  getWeightedBaseTile(variation, range, weights = null) {
    const { start, count } = range;
    
    // If no weights provided, use equal distribution with slight clustering
    if (!weights || weights.length !== count) {
      // Use variation modulo count to select tile
      // Add slight bias toward center tiles for natural appearance
      const baseIndex = variation % count;
      return start + baseIndex;
    }
    
    // Ensure weights array matches count
    const normalizedWeights = weights.slice(0, count);
    while (normalizedWeights.length < count) {
      normalizedWeights.push(1); // Default weight for missing entries
    }
    
    // Weighted selection: sum all weights, then find which range variation falls into
    const totalWeight = normalizedWeights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      // Fallback to equal distribution if all weights are 0
      return start + (variation % count);
    }
    
    // Use variation to create deterministic weighted selection
    // Map variation (0-100) to weighted range
    const target = (variation % 1000) * (totalWeight / 1000);
    let cumulative = 0;
    
    for (let i = 0; i < count; i++) {
      cumulative += normalizedWeights[i];
      if (target < cumulative) {
        return start + i;
      }
    }
    
    // Fallback to last tile
    return start + count - 1;
  },
  
  /**
   * Get terrain-specific tile index using weighted selection
   * Combines terrain type, clustering, and weighted selection
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {Object} zone - Zone object (can be null)
   * @param {Number} clusterSize - Cluster size for variation
   * @returns {Object} - { tileset, index } - Tile information
   */
  getTerrainSpecificTile(tileX, tileY, zone, clusterSize = 8) {
    // Get terrain type for this zone
    const terrainType = this.getTerrainType(zone);
    
    // Get terrain tile information
    const terrainInfo = this.getTerrainTileInfo(terrainType, 0);
    if (!terrainInfo) {
      // Fallback to default
      const range = this.getBaseTileRange('floors');
      const variation = this.getClusteredVariation(tileX, tileY, clusterSize, range.count);
      return {
        tileset: 'floors',
        index: range.start + (variation % range.count)
      };
    }
    
    // Get clustered variation for this terrain type
    const variation = this.getClusteredVariation(tileX, tileY, clusterSize, terrainInfo.variations);
    
    // Use weighted selection if weights are available
    const tileIndex = terrainInfo.weights
      ? this.getWeightedBaseTile(variation, {
          start: terrainInfo.baseIndex,
          count: terrainInfo.variations
        }, terrainInfo.weights)
      : terrainInfo.baseIndex + (variation % terrainInfo.variations);
    
    return {
      tileset: terrainInfo.tileset,
      index: tileIndex
    };
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
   * Renders base tiles first, then decorations on top
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
    
    // First pass: Draw base tiles
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
    
    // Second pass: Draw decorations on top of base tiles
    this.drawDecorations(cameraX, cameraY, viewWidth, viewHeight, 
                         clampedStartX, clampedStartY, clampedEndX, clampedEndY);
  },
  
  /**
   * Draw decorations visible in the viewport
   * Renders decorative elements on top of base terrain
   * Supports multi-tile decorations (larger trees, rocks)
   * @param {Number} cameraX - Camera X position
   * @param {Number} cameraY - Camera Y position
   * @param {Number} viewWidth - Viewport width
   * @param {Number} viewHeight - Viewport height
   * @param {Number} startTileX - Start tile X (clamped)
   * @param {Number} startTileY - Start tile Y (clamped)
   * @param {Number} endTileX - End tile X (clamped)
   * @param {Number} endTileY - End tile Y (clamped)
   */
  drawDecorations(cameraX, cameraY, viewWidth, viewHeight, 
                  startTileX, startTileY, endTileX, endTileY) {
    if (!this.decorationMap || !Assets.isLoaded()) return;
    
    // Expand bounds slightly for multi-tile decorations that might extend beyond their base tile
    const expandedStartX = Math.max(0, startTileX - 2);
    const expandedStartY = Math.max(0, startTileY - 2);
    const expandedEndX = Math.min(this.worldWidthTiles, endTileX + 2);
    const expandedEndY = Math.min(this.worldHeightTiles, endTileY + 2);
    
    // Track which decorations we've already drawn (for multi-tile decorations)
    const drawnDecorations = new Set();
    
    // Draw decorations
    for (let y = expandedStartY; y < expandedEndY; y++) {
      for (let x = expandedStartX; x < expandedEndX; x++) {
        const decoration = this.getDecoration(x, y);
        
        if (!decoration) continue;
        
        // Skip if we've already drawn this decoration (multi-tile case)
        const decorationKey = `${decoration.x},${decoration.y}`;
        if (drawnDecorations.has(decorationKey)) continue;
        
        // Get decoration size and offset information
        const decorationInfo = this.getDecorationRenderInfo(decoration);
        if (!decorationInfo) continue;
        
        // Get tileset
        const tileset = Assets.getTileset(decoration.tileset);
        if (!tileset) continue;
        
        // Calculate screen position
        const screenX = (decoration.x * this.TILE_SIZE) - cameraX + decorationInfo.offsetX;
        const screenY = (decoration.y * this.TILE_SIZE) - cameraY + decorationInfo.offsetY;
        
        // Check if decoration is visible in viewport
        if (screenX + decorationInfo.width < 0 || screenX > viewWidth ||
            screenY + decorationInfo.height < 0 || screenY > viewHeight) {
          continue; // Not visible
        }
        
        // Get tile coordinates from tileset
        const coords = this.getTileCoords(tileset, decoration.index);
        if (!coords) continue;
        
        // Draw decoration
        image(
          tileset,
          screenX, screenY, decorationInfo.width, decorationInfo.height,  // Destination
          coords.sx, coords.sy, decorationInfo.sourceWidth, decorationInfo.sourceHeight  // Source
        );
        
        // Mark as drawn
        drawnDecorations.add(decorationKey);
        
        // If multi-tile, mark adjacent tiles as drawn too
        if (decorationInfo.multiTile) {
          for (let dy = 0; dy < decorationInfo.tileHeight; dy++) {
            for (let dx = 0; dx < decorationInfo.tileWidth; dx++) {
              if (dx === 0 && dy === 0) continue; // Already marked
              const adjKey = `${decoration.x + dx},${decoration.y + dy}`;
              drawnDecorations.add(adjKey);
            }
          }
        }
      }
    }
  },
  
  /**
   * Get decoration rendering information (size, offset, multi-tile support)
   * @param {Object} decoration - Decoration object { type, tileset, index, x, y }
   * @returns {Object|null} - Rendering info or null
   */
  getDecorationRenderInfo(decoration) {
    if (!decoration) return null;
    
    // Default: single tile decoration (1x1)
    let width = this.TILE_SIZE;
    let height = this.TILE_SIZE;
    let offsetX = 0;
    let offsetY = 0;
    let sourceWidth = this.TILE_SIZE;
    let sourceHeight = this.TILE_SIZE;
    let multiTile = false;
    let tileWidth = 1;
    let tileHeight = 1;
    
    // Multi-tile decorations (larger than 1x1)
    switch (decoration.type) {
      case 'tree':
        // Trees are typically 1x2 or 2x2 tiles (taller than wide)
        // Use hash to determine size variation
        const treeHash = this.hash(decoration.x, decoration.y);
        const treeSize = Math.abs(treeHash) % 3;
        
        if (treeSize === 0) {
          // Small tree: 1x1
          width = this.TILE_SIZE;
          height = this.TILE_SIZE;
          offsetY = 0; // No vertical offset
        } else if (treeSize === 1) {
          // Medium tree: 1x2 (taller)
          width = this.TILE_SIZE;
          height = this.TILE_SIZE * 2;
          offsetY = -this.TILE_SIZE; // Draw upward from base tile
          sourceHeight = this.TILE_SIZE * 2;
          multiTile = true;
          tileHeight = 2;
        } else {
          // Large tree: 2x2
          width = this.TILE_SIZE * 2;
          height = this.TILE_SIZE * 2;
          offsetX = -this.TILE_SIZE / 2; // Center horizontally
          offsetY = -this.TILE_SIZE; // Draw upward from base tile
          sourceWidth = this.TILE_SIZE * 2;
          sourceHeight = this.TILE_SIZE * 2;
          multiTile = true;
          tileWidth = 2;
          tileHeight = 2;
        }
        break;
        
      case 'rock':
        // Rocks can be 1x1 or 2x2
        const rockHash = this.hash(decoration.x, decoration.y);
        const rockSize = Math.abs(rockHash) % 2;
        
        if (rockSize === 0) {
          // Small rock: 1x1
          width = this.TILE_SIZE;
          height = this.TILE_SIZE;
        } else {
          // Large rock: 2x2
          width = this.TILE_SIZE * 2;
          height = this.TILE_SIZE * 2;
          offsetX = -this.TILE_SIZE / 2; // Center horizontally
          offsetY = -this.TILE_SIZE / 2; // Center vertically
          sourceWidth = this.TILE_SIZE * 2;
          sourceHeight = this.TILE_SIZE * 2;
          multiTile = true;
          tileWidth = 2;
          tileHeight = 2;
        }
        break;
        
      case 'torch':
        // Torches are typically 1x2 (tall, narrow)
        width = this.TILE_SIZE;
        height = this.TILE_SIZE * 2;
        offsetY = -this.TILE_SIZE; // Draw upward from base tile
        sourceHeight = this.TILE_SIZE * 2;
        multiTile = true;
        tileHeight = 2;
        break;
        
      // Default: single tile decorations (flowers, mushrooms, grass)
      case 'flower':
      case 'mushroom':
      case 'grass':
      default:
        // Single tile: 1x1
        width = this.TILE_SIZE;
        height = this.TILE_SIZE;
        break;
    }
    
    return {
      width: width,
      height: height,
      offsetX: offsetX,
      offsetY: offsetY,
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
      multiTile: multiTile,
      tileWidth: tileWidth,
      tileHeight: tileHeight
    };
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
  },
  
  /**
   * Decoration Layer Management Functions
   * Handle decorative elements like trees, rocks, flowers, mushrooms, grass patches
   */
  
  /**
   * Set a decoration at a tile position
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @param {String} type - Decoration type ('tree', 'rock', 'flower', 'mushroom', 'grass')
   * @param {String} tileset - Tileset name to use for the decoration
   * @param {Number} index - Tile index in the tileset
   * @returns {Boolean} - True if decoration was set, false if position is invalid
   */
  setDecoration(tileX, tileY, type, tileset, index) {
    if (tileX < 0 || tileX >= this.worldWidthTiles ||
        tileY < 0 || tileY >= this.worldHeightTiles) {
      return false;
    }
    
    if (!this.decorationMap) {
      // Initialize decoration map if not already initialized
      this.decorationMap = [];
      for (let y = 0; y < this.worldHeightTiles; y++) {
        this.decorationMap[y] = [];
        for (let x = 0; x < this.worldWidthTiles; x++) {
          this.decorationMap[y][x] = null;
        }
      }
    }
    
    // Store decoration with x, y coordinates for easy iteration
    this.decorationMap[tileY][tileX] = {
      type: type,
      tileset: tileset,
      index: index,
      x: tileX,
      y: tileY
    };
    
    return true;
  },
  
  /**
   * Get decoration at a tile position
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @returns {Object|null} - Decoration object or null if no decoration
   */
  getDecoration(tileX, tileY) {
    if (!this.decorationMap ||
        tileX < 0 || tileX >= this.worldWidthTiles ||
        tileY < 0 || tileY >= this.worldHeightTiles) {
      return null;
    }
    
    return this.decorationMap[tileY][tileX];
  },
  
  /**
   * Get decoration at world coordinates
   * @param {Number} worldX - World X coordinate
   * @param {Number} worldY - World Y coordinate
   * @returns {Object|null} - Decoration object or null if no decoration
   */
  getDecorationAt(worldX, worldY) {
    const tileX = Math.floor(worldX / this.TILE_SIZE);
    const tileY = Math.floor(worldY / this.TILE_SIZE);
    return this.getDecoration(tileX, tileY);
  },
  
  /**
   * Remove decoration at a tile position
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @returns {Boolean} - True if decoration was removed, false if position is invalid or no decoration
   */
  removeDecoration(tileX, tileY) {
    if (!this.decorationMap ||
        tileX < 0 || tileX >= this.worldWidthTiles ||
        tileY < 0 || tileY >= this.worldHeightTiles) {
      return false;
    }
    
    if (this.decorationMap[tileY][tileX] !== null) {
      this.decorationMap[tileY][tileX] = null;
      return true;
    }
    
    return false;
  },
  
  /**
   * Clear all decorations
   */
  clearAllDecorations() {
    if (!this.decorationMap) return;
    
    for (let y = 0; y < this.worldHeightTiles; y++) {
      for (let x = 0; x < this.worldWidthTiles; x++) {
        this.decorationMap[y][x] = null;
      }
    }
  },
  
  /**
   * Check if a tile position has a decoration
   * @param {Number} tileX - Tile X coordinate
   * @param {Number} tileY - Tile Y coordinate
   * @returns {Boolean} - True if there is a decoration at this position
   */
  hasDecoration(tileX, tileY) {
    const decoration = this.getDecoration(tileX, tileY);
    return decoration !== null;
  }
};

