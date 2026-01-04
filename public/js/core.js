/**
 * Core Game State and Initialization
 * Main game state, p5.js setup, and core game loop
 */

// Global game state object
const GameState = {
  // Connection
  socket: null,
  loggedIn: false,
  
  // Player
  player: {
    username: '',
    x: 10000,
    y: 10000,
    score: 0,
    size: 20,
    characterClass: 'warrior',
    level: 1,
    xp: 0,
    xpForNextLevel: 100,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    str: 10,
    dex: 10,
    int: 10,
    vit: 10,
    def: 10
  },
  
  // Other entities
  otherPlayers: [],
  enemies: [],
  
  // Input
  keys: {},
  lastAttackTime: 0,
  attackCooldown: 500,
  damageNumbers: [],
  
  // World
  worldWidth: 20000,
  worldHeight: 20000,
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  
  // UI State
  showCharacterSheet: false,
  levelUpMessage: '',
  levelUpTimer: 0
};

// p5.js preload function - loads assets before setup
function preload() {
  Assets.preload();
}

// p5.js setup
function setup() {
  // Make canvas fill the viewport
  GameState.canvasWidth = window.innerWidth;
  GameState.canvasHeight = window.innerHeight;
  const canvas = createCanvas(GameState.canvasWidth, GameState.canvasHeight);
  canvas.parent(document.body);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    GameState.canvasWidth = window.innerWidth;
    GameState.canvasHeight = window.innerHeight;
    resizeCanvas(GameState.canvasWidth, GameState.canvasHeight);
  });
  
  // Initialize tile system (will be re-initialized when zones load)
  Tiles.init(GameState.worldWidth, GameState.worldHeight);
}

// Main game loop
function draw() {
  if (!GameState.loggedIn) return;
  
  // Update systems
  Camera.update();
  World.checkZoneChange();
  Portal.checkNearby();
  Skills.update();
  
  // Draw world
  World.draw();
  
  // Handle player movement
  Player.handleMovement();
  
  // Draw entities
  Portal.draw();
  Enemies.draw();
  Player.drawOthers();
  Player.drawSelf();
  Enemies.drawDamageNumbers();
  
  // Draw UI overlays
  World.drawBoundaries();
  World.drawZoneDisplay();
  UI.drawRespawnMessage();
  UI.drawLevelUpMessage();
  UI.drawPortalHint();
  
  if (GameState.showCharacterSheet) {
    Character.drawSheet();
  }
  
  if (Inventory.show) {
    Inventory.draw();
  }
  
  UI.drawMinimap();
  Chat.drawFloatingMessages();
  Skills.drawSkillBar();
  UI.drawBuffsAndDebuffs();
  
  // Draw instructions
  fill(255, 200);
  textAlign(LEFT);
  textSize(12);
  text('WASD to move | C - Character Sheet | I - Inventory | Click to attack | 1/2/3 - Skills | Enter - Chat', 
       10, GameState.canvasHeight - 30);
  text('Kill enemies to gain XP! Higher level mobs give more XP. Use skills (1/2/3) for special abilities!', 
       10, GameState.canvasHeight - 15);
}

// Mouse press handler
function mousePressed() {
  if (!GameState.loggedIn) return;
  
  // Handle inventory clicks
  if (Inventory.show) {
    Inventory.handleClick(mouseX, mouseY);
    return;
  }
  
  if (GameState.player.hp <= 0) return;
  
  const now = Date.now();
  if (now - GameState.lastAttackTime < GameState.attackCooldown) return;
  
  // Get mouse position in world coordinates
  const worldMouseX = mouseX + Camera.x;
  const worldMouseY = mouseY + Camera.y;
  
  // Find nearest enemy within attack range
  let nearestEnemy = null;
  let nearestDistance = Infinity;
  
  GameState.enemies.forEach(enemy => {
    if (enemy.hp <= 0) return;
    
    const distance = dist(GameState.player.x, GameState.player.y, enemy.x, enemy.y);
    if (distance < 50 && distance < nearestDistance) {
      nearestDistance = distance;
      nearestEnemy = enemy;
    }
  });
  
  if (nearestEnemy && GameState.socket && GameState.socket.readyState === WebSocket.OPEN) {
    GameState.lastAttackTime = now;
    GameState.socket.send(JSON.stringify({
      type: 'attackEnemy',
      enemyId: nearestEnemy.id
    }));
  }
}
