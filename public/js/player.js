/**
 * Player System
 * Handles player movement, controls, and rendering
 */

const Player = {
  /**
   * Handle player movement based on input
   */
  handleMovement() {
    const speed = 3;
    let moved = false;
    
    if (GameState.keys['w'] || GameState.keys['W']) {
      GameState.player.y = max(GameState.player.y - speed, GameState.player.size);
      moved = true;
    }
    if (GameState.keys['s'] || GameState.keys['S']) {
      GameState.player.y = min(GameState.player.y + speed, GameState.worldHeight - GameState.player.size);
      moved = true;
    }
    if (GameState.keys['a'] || GameState.keys['A']) {
      GameState.player.x = max(GameState.player.x - speed, GameState.player.size);
      moved = true;
    }
    if (GameState.keys['d'] || GameState.keys['D']) {
      GameState.player.x = min(GameState.player.x + speed, GameState.worldWidth - GameState.player.size);
      moved = true;
    }
    
    // Send movement to server
    if (moved && GameState.socket && GameState.socket.readyState === WebSocket.OPEN) {
      GameState.socket.send(JSON.stringify({
        type: 'move',
        x: GameState.player.x,
        y: GameState.player.y
      }));
    }
  },
  
  /**
   * Draw other players
   */
  drawOthers() {
    for (let other of GameState.otherPlayers) {
      const screenPos = Camera.worldToScreen(other.x, other.y);
      
      // Only draw if player is visible on screen
      if (screenPos.x > -50 && screenPos.x < GameState.canvasWidth + 50 &&
          screenPos.y > -50 && screenPos.y < GameState.canvasHeight + 50) {
        fill(100, 150, 255);
        ellipse(screenPos.x, screenPos.y, GameState.player.size, GameState.player.size);
        fill(255);
        textAlign(CENTER);
        textSize(10);
        text(other.username, screenPos.x, screenPos.y - GameState.player.size - 5);
      }
    }
  },
  
  /**
   * Draw visual effects on a player
   */
  drawEffects(screenPos, effects, size) {
    if (!effects) return;
    
    const time = Date.now();
    
    // Shield effect - glowing blue ring
    if (effects.shield && effects.shield.active) {
      const pulse = sin((time / 200) % (2 * PI)) * 0.3 + 0.7; // Pulse between 0.7 and 1.0
      noFill();
      stroke(100, 150, 255, 200 * pulse);
      strokeWeight(3);
      ellipse(screenPos.x, screenPos.y, size * 1.5 * pulse, size * 1.5 * pulse);
      
      // Inner ring
      stroke(150, 200, 255, 150 * pulse);
      strokeWeight(2);
      ellipse(screenPos.x, screenPos.y, size * 1.3 * pulse, size * 1.3 * pulse);
    }
    
    // Invincible effect - white pulsing rings
    if (effects.invincible && effects.invincible.active) {
      const pulse = sin((time / 100) % (2 * PI)) * 0.5 + 0.5; // Faster pulse
      noFill();
      stroke(255, 255, 255, 255 * pulse);
      strokeWeight(2);
      ellipse(screenPos.x, screenPos.y, size * 1.6 * pulse, size * 1.6 * pulse);
      
      // Outer ring
      stroke(255, 255, 255, 150 * pulse);
      strokeWeight(1);
      ellipse(screenPos.x, screenPos.y, size * 1.9 * pulse, size * 1.9 * pulse);
    }
    
    // Taunt effect - red/orange glow
    if (effects.taunt && effects.taunt.active) {
      const pulse = sin((time / 300) % (2 * PI)) * 0.2 + 0.8;
      noFill();
      stroke(255, 100, 50, 180 * pulse);
      strokeWeight(2);
      ellipse(screenPos.x, screenPos.y, size * 1.4 * pulse, size * 1.4 * pulse);
    }
    
    // Aura effect - golden particles/circle
    if (effects.aura && effects.aura.active) {
      const pulse = sin((time / 400) % (2 * PI)) * 0.3 + 0.7;
      noFill();
      stroke(255, 215, 0, 200 * pulse);
      strokeWeight(2);
      ellipse(screenPos.x, screenPos.y, size * 1.5 * pulse, size * 1.5 * pulse);
      
      // Draw small particles around the player
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        const angle = (time / 500 + i * (2 * PI / particleCount)) % (2 * PI);
        const radius = size * 0.8;
        const px = screenPos.x + cos(angle) * radius;
        const py = screenPos.y + sin(angle) * radius;
        fill(255, 215, 0, 200);
        noStroke();
        ellipse(px, py, 3, 3);
      }
    }
  },
  
  /**
   * Draw current player
   */
  drawSelf() {
    const playerScreenPos = Camera.worldToScreen(GameState.player.x, GameState.player.y);
    if (GameState.player.hp > 0) {
      // Draw effects first (behind player)
      this.drawEffects(playerScreenPos, Skills.activeEffects, GameState.player.size);
      
      // Draw player
      fill(50, 200, 100);
      ellipse(playerScreenPos.x, playerScreenPos.y, GameState.player.size, GameState.player.size);
      
      // Draw effects again on top (for some effects)
      const effects = Skills.activeEffects;
      if (effects && effects.invincible && effects.invincible.active) {
        // Draw invincible effect on top too
        const time = Date.now();
        const pulse = sin((time / 100) % (2 * PI)) * 0.5 + 0.5;
        noFill();
        stroke(255, 255, 255, 200 * pulse);
        strokeWeight(2);
        ellipse(playerScreenPos.x, playerScreenPos.y, GameState.player.size * 1.3 * pulse, GameState.player.size * 1.3 * pulse);
      }
      
      fill(255);
      textAlign(CENTER);
      textSize(10);
      text(GameState.player.username, playerScreenPos.x, playerScreenPos.y - GameState.player.size - 5);
    }
  }
};
