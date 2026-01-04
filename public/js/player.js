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
   * Draw current player
   */
  drawSelf() {
    const playerScreenPos = Camera.worldToScreen(GameState.player.x, GameState.player.y);
    if (GameState.player.hp > 0) {
      fill(50, 200, 100);
      ellipse(playerScreenPos.x, playerScreenPos.y, GameState.player.size, GameState.player.size);
      fill(255);
      textAlign(CENTER);
      textSize(10);
      text(GameState.player.username, playerScreenPos.x, playerScreenPos.y - GameState.player.size - 5);
    }
  }
};
