/**
 * Character System
 * Handles character stats, leveling, and character sheet UI
 */

const Character = {
  /**
   * Update character display in UI
   */
  updateDisplay() {
    document.getElementById('usernameDisplay').textContent = GameState.player.username;
    document.getElementById('scoreValue').textContent = GameState.player.score;
    document.getElementById('levelDisplay').textContent = GameState.player.level;
    document.getElementById('hpDisplay').textContent = GameState.player.hp;
    document.getElementById('maxHpDisplay').textContent = GameState.player.maxHp;
    document.getElementById('mpDisplay').textContent = GameState.player.mp;
    document.getElementById('maxMpDisplay').textContent = GameState.player.maxMp;
    document.getElementById('xpDisplay').textContent = GameState.player.xp;
    document.getElementById('xpForNextLevelDisplay').textContent = GameState.player.xpForNextLevel;
    
    // Update HP bar
    const hpPercent = Math.max(0, Math.min(100, (GameState.player.hp / GameState.player.maxHp) * 100));
    document.getElementById('hpBar').style.width = hpPercent + '%';
    
    // Update MP bar
    const mpPercent = Math.max(0, Math.min(100, (GameState.player.mp / GameState.player.maxMp) * 100));
    document.getElementById('mpBar').style.width = mpPercent + '%';
  },
  
  /**
   * Draw character sheet
   */
  drawSheet() {
    const sheetWidth = 400;
    const sheetHeight = 500;
    const sheetX = (GameState.canvasWidth - sheetWidth) / 2;
    const sheetY = (GameState.canvasHeight - sheetHeight) / 2;
    
    // Background
    fill(30, 30, 40, 240);
    stroke(100, 150, 200);
    strokeWeight(3);
    rect(sheetX, sheetY, sheetWidth, sheetHeight);
    
    // Title
    fill(255, 255, 255);
    textAlign(CENTER);
    textSize(24);
    textStyle(BOLD);
    text('Character Sheet', sheetX + sheetWidth / 2, sheetY + 35);
    textStyle(NORMAL);
    
    let yOffset = sheetY + 70;
    const lineHeight = 25;
    
    // Character info
    textAlign(LEFT);
    textSize(16);
    fill(200, 200, 255);
    text(`Name: ${GameState.player.username}`, sheetX + 20, yOffset);
    yOffset += lineHeight;
    
    const classNames = {
      warrior: 'Warrior',
      mage: 'Mage',
      rogue: 'Rogue',
      paladin: 'Paladin'
    };
    
    fill(150, 200, 255);
    text(`Class: ${classNames[GameState.player.characterClass] || GameState.player.characterClass}`, sheetX + 20, yOffset);
    yOffset += lineHeight;
    
    fill(255, 200, 100);
    text(`Level: ${GameState.player.level}`, sheetX + 20, yOffset);
    yOffset += lineHeight;
    
    // XP Bar
    const xpBarWidth = sheetWidth - 40;
    const xpBarHeight = 20;
    const xpPercent = GameState.player.xp / GameState.player.xpForNextLevel;
    
    fill(50, 50, 50);
    rect(sheetX + 20, yOffset, xpBarWidth, xpBarHeight);
    
    fill(100, 200, 255);
    rect(sheetX + 20, yOffset, xpBarWidth * xpPercent, xpBarHeight);
    
    fill(255, 255, 255);
    textAlign(CENTER);
    textSize(12);
    text(`${GameState.player.xp} / ${GameState.player.xpForNextLevel} XP`, sheetX + sheetWidth / 2, yOffset + 15);
    yOffset += lineHeight + 10;
    
    // Stats section
    textAlign(LEFT);
    textSize(18);
    fill(255, 255, 255);
    textStyle(BOLD);
    text('Stats', sheetX + 20, yOffset);
    textStyle(NORMAL);
    yOffset += lineHeight;
    
    textSize(14);
    
    // HP
    fill(255, 100, 100);
    text(`HP: ${GameState.player.hp} / ${GameState.player.maxHp}`, sheetX + 20, yOffset);
    yOffset += lineHeight;
    
    // MP
    fill(100, 150, 255);
    text(`MP: ${GameState.player.mp} / ${GameState.player.maxMp}`, sheetX + 20, yOffset);
    yOffset += lineHeight + 5;
    
    // Attributes
    fill(255, 200, 100);
    text(`STR: ${GameState.player.str}`, sheetX + 20, yOffset);
    text(`DEX: ${GameState.player.dex}`, sheetX + 220, yOffset);
    yOffset += lineHeight;
    
    text(`INT: ${GameState.player.int}`, sheetX + 20, yOffset);
    text(`VIT: ${GameState.player.vit}`, sheetX + 220, yOffset);
    yOffset += lineHeight;
    
    text(`DEF: ${GameState.player.def}`, sheetX + 20, yOffset);
    yOffset += lineHeight + 10;
    
    // Close hint
    textAlign(CENTER);
    fill(150, 150, 150);
    textSize(12);
    text('Press C to close', sheetX + sheetWidth / 2, sheetY + sheetHeight - 20);
  }
};
