/**
 * Portal System
 * Handles portal rendering and interactions
 */

const Portal = {
  portals: [],
  respawnX: 10000,
  respawnY: 10000,
  respawnMessage: '',
  respawnMessageTimer: 0,
  nearPortal: null,
  
  /**
   * Check for nearby portals
   */
  checkNearby() {
    this.nearPortal = null;
    for (let portal of this.portals) {
      const distance = dist(GameState.player.x, GameState.player.y, portal.x, portal.y);
      if (distance < 100) { // Interaction range
        this.nearPortal = portal;
        break;
      }
    }
  },
  
  /**
   * Draw portals
   */
  draw() {
    for (let portal of this.portals) {
      const screenPos = Camera.worldToScreen(portal.x, portal.y);
      
      // Only draw if portal is visible on screen
      if (screenPos.x > -100 && screenPos.x < GameState.canvasWidth + 100 &&
          screenPos.y > -100 && screenPos.y < GameState.canvasHeight + 100) {
        
        // Portal outer ring (animated pulsing effect)
        const pulse = sin(frameCount * 0.1) * 10;
        fill(100, 50, 200, 150);
        noStroke();
        ellipse(screenPos.x, screenPos.y, 60 + pulse, 60 + pulse);
        
        // Portal inner ring
        fill(150, 100, 255, 200);
        ellipse(screenPos.x, screenPos.y, 40 + pulse * 0.5, 40 + pulse * 0.5);
        
        // Portal center
        fill(200, 150, 255);
        ellipse(screenPos.x, screenPos.y, 20, 20);
        
        // Portal name
        fill(255, 255, 255);
        textAlign(CENTER);
        textSize(12);
        text(portal.town, screenPos.x, screenPos.y - 45);
      }
    }
  }
};
