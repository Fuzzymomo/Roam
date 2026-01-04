/**
 * Camera System
 * Handles camera positioning and coordinate conversion
 */

const Camera = {
  x: 0,
  y: 0,
  
  /**
   * Update camera to follow player
   */
  update() {
    // Center camera on player
    this.x = GameState.player.x - GameState.canvasWidth / 2;
    this.y = GameState.player.y - GameState.canvasHeight / 2;
    
    // Clamp camera to world boundaries
    this.x = Math.max(0, Math.min(GameState.worldWidth - GameState.canvasWidth, this.x));
    this.y = Math.max(0, Math.min(GameState.worldHeight - GameState.canvasHeight, this.y));
  },
  
  /**
   * Convert world coordinates to screen coordinates
   * @param {number} worldX 
   * @param {number} worldY 
   * @returns {{x: number, y: number}}
   */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y
    };
  }
};
