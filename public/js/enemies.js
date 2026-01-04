/**
 * Enemy System
 * Handles enemy rendering and damage numbers
 */

const Enemies = {
  /**
   * Draw all enemies
   */
  draw() {
    for (let enemy of GameState.enemies) {
      if (enemy.hp <= 0) continue;
      
      const screenPos = Camera.worldToScreen(enemy.x, enemy.y);
      
      // Only draw if enemy is visible on screen
      if (screenPos.x > -50 && screenPos.x < GameState.canvasWidth + 50 &&
          screenPos.y > -50 && screenPos.y < GameState.canvasHeight + 50) {
        
        // Draw enemy
        fill(enemy.color[0], enemy.color[1], enemy.color[2]);
        ellipse(screenPos.x, screenPos.y, 25, 25);
        
        // Draw enemy name and level
        fill(255);
        textAlign(CENTER);
        textSize(10);
        const levelText = enemy.level ? `Lv.${enemy.level} ${enemy.name}` : enemy.name;
        text(levelText, screenPos.x, screenPos.y - 20);
        
        // Color code by level difference
        if (enemy.level) {
          const levelDiff = enemy.level - GameState.player.level;
          if (levelDiff > 3) {
            fill(255, 0, 0); // Red - much higher level
          } else if (levelDiff > 0) {
            fill(255, 150, 0); // Orange - higher level
          } else if (levelDiff === 0) {
            fill(255, 255, 0); // Yellow - same level
          } else {
            fill(150, 255, 150); // Green - lower level
          }
          textSize(9);
          text(`Lv.${enemy.level}`, screenPos.x, screenPos.y - 32);
        }
        
        // Draw health bar
        const barWidth = 40;
        const barHeight = 4;
        const hpPercent = enemy.hp / enemy.maxHp;
        
        // Background
        fill(50, 50, 50);
        rect(screenPos.x - barWidth / 2, screenPos.y + 18, barWidth, barHeight);
        
        // Health
        fill(255, 0, 0);
        rect(screenPos.x - barWidth / 2, screenPos.y + 18, barWidth * hpPercent, barHeight);
      }
    }
  },
  
  /**
   * Draw damage numbers floating above entities
   */
  drawDamageNumbers() {
    for (let i = GameState.damageNumbers.length - 1; i >= 0; i--) {
      const dmg = GameState.damageNumbers[i];
      dmg.timer--;
      dmg.y -= 1; // Float upward
      
      if (dmg.timer <= 0) {
        GameState.damageNumbers.splice(i, 1);
        continue;
      }
      
      const alpha = map(dmg.timer, 0, 60, 0, 255);
      fill(dmg.color[0], dmg.color[1], dmg.color[2], alpha);
      textAlign(CENTER);
      textSize(16);
      textStyle(BOLD);
      text(`-${dmg.damage}`, dmg.x, dmg.y);
      textStyle(NORMAL);
    }
  }
};
