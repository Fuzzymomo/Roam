/**
 * Asset Loading System
 * Handles loading and management of game assets (images, sprites, etc.)
 */

const Assets = {
  // Storage for loaded images
  tilesets: {},
  
  // Flag to track if assets are loaded
  loaded: false,
  
  /**
   * Preload all assets before game starts
   * Called by p5.js preload() function
   */
  preload() {
    // Load tileset images
    this.tilesets.floors = loadImage('assets/tilesets/Floors_Tiles.png');
    this.tilesets.walls = loadImage('assets/tilesets/Wall_Tiles.png');
    this.tilesets.dungeon = loadImage('assets/tilesets/Dungeon_Tiles.png');
    this.tilesets.water = loadImage('assets/tilesets/Water_tiles.png');
    this.tilesets.wallVariations = loadImage('assets/tilesets/Wall_Variations.png');
  },
  
  /**
   * Check if all assets are loaded
   */
  isLoaded() {
    if (this.loaded) return true;
    
    // Check if all tilesets are loaded
    for (let key in this.tilesets) {
      if (!this.tilesets[key] || !this.tilesets[key].width) {
        return false;
      }
    }
    
    this.loaded = true;
    return true;
  },
  
  /**
   * Get a tileset image by name
   */
  getTileset(name) {
    return this.tilesets[name] || null;
  }
};

