/**
 * World System
 * Handles zones, world rendering, grid, and boundaries
 */

const World = {
  zones: [],
  currentZone: null,
  zoneDisplayTimer: 0,
  lastZoneId: null,
  
  /**
   * Check which zone the player is in
   */
  getZoneAt(x, y) {
    for (let zone of this.zones) {
      if (x >= zone.x && x <= zone.x + zone.width &&
          y >= zone.y && y <= zone.y + zone.height) {
        return zone;
      }
    }
    return null;
  },
  
  /**
   * Check if player entered a new zone
   */
  checkZoneChange() {
    const zone = this.getZoneAt(GameState.player.x, GameState.player.y);
    
    if (zone && zone.id !== this.lastZoneId) {
      this.currentZone = zone;
      this.lastZoneId = zone.id;
      this.zoneDisplayTimer = 180; // Display for 3 seconds at 60fps
    } else if (!zone) {
      this.currentZone = null;
      if (this.lastZoneId !== null) {
        this.lastZoneId = null;
      }
    }
  },
  
  /**
   * Draw zones with their themes
   */
  draw() {
    // Get current zone's background color or default
    let bgColor = [20, 25, 30];
    if (this.currentZone && this.currentZone.theme) {
      bgColor = this.currentZone.theme.bgColor;
    }
    
    // Draw base background
    background(bgColor[0], bgColor[1], bgColor[2]);
    
    // Draw all visible zones
    for (let zone of this.zones) {
      const zoneRight = zone.x + zone.width;
      const zoneBottom = zone.y + zone.height;
      
      // Check if zone is visible on screen
      if (zoneRight >= Camera.x && zone.x <= Camera.x + GameState.canvasWidth &&
          zoneBottom >= Camera.y && zone.y <= Camera.y + GameState.canvasHeight) {
        
        const screenX = zone.x - Camera.x;
        const screenY = zone.y - Camera.y;
        const screenWidth = zone.width;
        const screenHeight = zone.height;
        
        // Draw zone background with slight transparency overlay
        fill(zone.theme.bgColor[0], zone.theme.bgColor[1], zone.theme.bgColor[2], 100);
        noStroke();
        rect(screenX, screenY, screenWidth, screenHeight);
        
        // Draw zone border
        noFill();
        stroke(zone.theme.borderColor[0], zone.theme.borderColor[1], zone.theme.borderColor[2], 150);
        strokeWeight(2);
        rect(screenX, screenY, screenWidth, screenHeight);
        
        // Draw zone name label (if town)
        if (zone.type === 'town') {
          fill(255, 255, 255, 180);
          textAlign(CENTER);
          textSize(16);
          textStyle(BOLD);
          text(zone.name, screenX + screenWidth / 2, screenY + 25);
          textStyle(NORMAL);
        }
      }
    }
    
    // Draw world grid
    this.drawGrid();
  },
  
  /**
   * Draw world grid for visual reference
   */
  drawGrid() {
    // Use current zone's grid color or default
    let gridColor = [40, 40, 50];
    if (this.currentZone && this.currentZone.theme) {
      gridColor = this.currentZone.theme.gridColor;
    }
    
    stroke(gridColor[0], gridColor[1], gridColor[2], 80);
    strokeWeight(1);
    
    // Larger grid size for larger world
    const gridSize = 500;
    const startX = Math.floor(Camera.x / gridSize) * gridSize;
    const startY = Math.floor(Camera.y / gridSize) * gridSize;
    
    // Vertical lines
    for (let x = startX; x < Camera.x + GameState.canvasWidth; x += gridSize) {
      const screenX = x - Camera.x;
      line(screenX, 0, screenX, GameState.canvasHeight);
    }
    
    // Horizontal lines
    for (let y = startY; y < Camera.y + GameState.canvasHeight; y += gridSize) {
      const screenY = y - Camera.y;
      line(0, screenY, GameState.canvasWidth, screenY);
    }
  },
  
  /**
   * Draw world boundaries when camera is near edges
   */
  drawBoundaries() {
    noFill();
    stroke(255, 0, 0, 100);
    strokeWeight(3);
    
    if (Camera.x <= 0) {
      line(0, 0, 0, GameState.canvasHeight);
    }
    if (Camera.x >= GameState.worldWidth - GameState.canvasWidth) {
      line(GameState.canvasWidth, 0, GameState.canvasWidth, GameState.canvasHeight);
    }
    if (Camera.y <= 0) {
      line(0, 0, GameState.canvasWidth, 0);
    }
    if (Camera.y >= GameState.worldHeight - GameState.canvasHeight) {
      line(0, GameState.canvasHeight, GameState.canvasWidth, GameState.canvasHeight);
    }
  },
  
  /**
   * Draw zone name when entering a new zone
   */
  drawZoneDisplay() {
    if (this.zoneDisplayTimer > 0 && this.currentZone) {
      this.zoneDisplayTimer--;
      
      // Set text size first to calculate width
      textSize(24);
      textStyle(BOLD);
      const nameWidth = textWidth(this.currentZone.name) + 40;
      const rectX = (GameState.canvasWidth - nameWidth) / 2;
      
      // Background
      fill(0, 0, 0, 200);
      noStroke();
      rect(rectX, 20, nameWidth, 50);
      
      // Zone name
      fill(255, 255, 255);
      textAlign(CENTER);
      text(this.currentZone.name, GameState.canvasWidth / 2, 50);
      
      // Zone type
      textSize(14);
      textStyle(NORMAL);
      fill(200, 200, 200);
      const typeText = this.currentZone.type === 'town' ? 'Town' : 
                       this.currentZone.type === 'road' ? 'Path' : 'Wilderness';
      text(typeText, GameState.canvasWidth / 2, 70);
      
      textStyle(NORMAL);
    }
  },
  
  /**
   * Draw world boundaries when camera is near edges
   */
  drawBoundaries() {
    noFill();
    stroke(255, 0, 0, 100);
    strokeWeight(3);
    
    if (Camera.x <= 0) {
      line(0, 0, 0, GameState.canvasHeight);
    }
    if (Camera.x >= GameState.worldWidth - GameState.canvasWidth) {
      line(GameState.canvasWidth, 0, GameState.canvasWidth, GameState.canvasHeight);
    }
    if (Camera.y <= 0) {
      line(0, 0, GameState.canvasWidth, 0);
    }
    if (Camera.y >= GameState.worldHeight - GameState.canvasHeight) {
      line(0, GameState.canvasHeight, GameState.canvasWidth, GameState.canvasHeight);
    }
  }
};
