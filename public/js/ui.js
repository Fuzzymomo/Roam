/**
 * UI System
 * Handles UI overlays: minimap, messages, hints, etc.
 */

const UI = {
  respawnMessage: '',
  respawnMessageTimer: 0,
  
  /**
   * Draw minimap
   */
  drawMinimap() {
    const minimapSize = 150;
    const minimapX = GameState.canvasWidth - minimapSize - 10;
    const minimapY = 10;
    const scale = minimapSize / GameState.worldWidth;
    
    // Minimap background
    fill(0, 0, 0, 180);
    stroke(255, 255, 255, 200);
    strokeWeight(2);
    rect(minimapX, minimapY, minimapSize, minimapSize * (GameState.worldHeight / GameState.worldWidth));
    
    // Draw zones on minimap
    for (let zone of World.zones) {
      const zoneMapX = minimapX + zone.x * scale;
      const zoneMapY = minimapY + zone.y * scale;
      const zoneMapWidth = zone.width * scale;
      const zoneMapHeight = zone.height * scale;
      
      // Draw zone with theme color
      fill(zone.theme.bgColor[0], zone.theme.bgColor[1], zone.theme.bgColor[2], 150);
      noStroke();
      rect(zoneMapX, zoneMapY, zoneMapWidth, zoneMapHeight);
      
      // Draw zone border
      noFill();
      stroke(zone.theme.borderColor[0], zone.theme.borderColor[1], zone.theme.borderColor[2], 200);
      strokeWeight(1);
      rect(zoneMapX, zoneMapY, zoneMapWidth, zoneMapHeight);
    }
    
    // Draw other players on minimap
    fill(100, 150, 255);
    for (let other of GameState.otherPlayers) {
      const mapX = minimapX + other.x * scale;
      const mapY = minimapY + other.y * scale;
      ellipse(mapX, mapY, 4, 4);
    }
    
    // Draw current player on minimap
    fill(50, 200, 100);
    const playerMapX = minimapX + GameState.player.x * scale;
    const playerMapY = minimapY + GameState.player.y * scale;
    ellipse(playerMapX, playerMapY, 5, 5);
    
    // Draw camera viewport on minimap
    noFill();
    stroke(255, 255, 0, 150);
    strokeWeight(1);
    rect(
      minimapX + Camera.x * scale,
      minimapY + Camera.y * scale,
      GameState.canvasWidth * scale,
      GameState.canvasHeight * scale
    );
    
    // Minimap label
    fill(255);
    textAlign(LEFT);
    textSize(10);
    text('Map', minimapX, minimapY - 5);
  },
  
  /**
   * Draw respawn message
   */
  drawRespawnMessage() {
    if (this.respawnMessageTimer > 0 && this.respawnMessage) {
      this.respawnMessageTimer--;
      
      // Background
      fill(0, 0, 0, 200);
      noStroke();
      textSize(18);
      textStyle(BOLD);
      const msgWidth = textWidth(this.respawnMessage) + 40;
      const rectX = (GameState.canvasWidth - msgWidth) / 2;
      rect(rectX, GameState.canvasHeight / 2 - 30, msgWidth, 50);
      
      // Message
      fill(100, 255, 100);
      textAlign(CENTER);
      text(this.respawnMessage, GameState.canvasWidth / 2, GameState.canvasHeight / 2);
      
      textStyle(NORMAL);
    }
  },
  
  /**
   * Draw level up message
   */
  drawLevelUpMessage() {
    if (GameState.levelUpTimer > 0 && GameState.levelUpMessage) {
      GameState.levelUpTimer--;
      
      // Background
      fill(0, 0, 0, 220);
      noStroke();
      textSize(28);
      textStyle(BOLD);
      const msgWidth = textWidth(GameState.levelUpMessage) + 60;
      const rectX = (GameState.canvasWidth - msgWidth) / 2;
      rect(rectX, GameState.canvasHeight / 2 - 50, msgWidth, 70);
      
      // Message with glow effect
      fill(255, 215, 0);
      textAlign(CENTER);
      text(GameState.levelUpMessage, GameState.canvasWidth / 2, GameState.canvasHeight / 2);
      
      textStyle(NORMAL);
    }
  },
  
  /**
   * Draw portal interaction hint
   */
  drawPortalHint() {
    if (Portal.nearPortal) {
      // Background
      fill(0, 0, 0, 200);
      noStroke();
      rect(GameState.canvasWidth / 2 - 150, GameState.canvasHeight - 80, 300, 40);
      
      // Text
      fill(255, 255, 0);
      textAlign(CENTER);
      textSize(16);
      text(`Press E to set respawn point at ${Portal.nearPortal.town}`, GameState.canvasWidth / 2, GameState.canvasHeight - 55);
    }
  }
};
