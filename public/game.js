let socket;
let player = {
  username: '',
  x: 10000,
  y: 10000,
  score: 0,
  size: 20,
  // Character stats
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
};
let otherPlayers = [];
let enemies = [];
let keys = {};
let loggedIn = false;
let showCharacterSheet = false;
let levelUpMessage = '';
let levelUpTimer = 0;
let lastAttackTime = 0;
let attackCooldown = 500; // 0.5 seconds
let damageNumbers = []; // Array of {x, y, damage, timer}
let playerAttackCooldown = 0;

// World and camera configuration - MMO scale
let worldWidth = 20000;
let worldHeight = 20000;
let camera = {
  x: 0,
  y: 0
};
let canvasWidth = 800;
let canvasHeight = 600;

// Zone system
let zones = [];
let currentZone = null;
let zoneDisplayTimer = 0;
let lastZoneId = null;

// Portal system
let portals = [];
let respawnX = 10000;
let respawnY = 10000;
let respawnMessage = '';
let respawnMessageTimer = 0;
let nearPortal = null;

// Inventory system
let inventory = [];
let equipment = {};
let itemDatabase = { weapons: [], armor: [], consumables: [], accessories: [] };
let showInventory = false;
let selectedInventorySlot = null;

// Login/Signup handlers
document.getElementById('loginBtn').addEventListener('click', () => {
  const username = document.getElementById('usernameInput').value.trim();
  if (username) {
    login(username);
  }
});

document.getElementById('signupBtn').addEventListener('click', () => {
  const username = document.getElementById('usernameInput').value.trim();
  if (username) {
    signup(username);
  }
});

document.getElementById('usernameInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const username = document.getElementById('usernameInput').value.trim();
    if (username) {
      login(username);
    }
  }
});

async function login(username) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      player.username = data.username;
      player.score = data.score || 0;
      respawnX = data.respawnX || 10000;
      respawnY = data.respawnY || 10000;
      
      // Load character data
      player.characterClass = data.characterClass || 'warrior';
      player.level = data.level || 1;
      player.xp = data.xp || 0;
      player.hp = data.hp || 100;
      player.maxHp = data.maxHp || 100;
      player.mp = data.mp || 50;
      player.maxMp = data.maxMp || 50;
      player.str = data.str || 10;
      player.dex = data.dex || 10;
      player.int = data.int || 10;
      player.vit = data.vit || 10;
      player.def = data.def || 10;
      player.xpForNextLevel = getXPForLevel(player.level);
      
      // Load inventory and equipment
      inventory = data.inventory || [];
      equipment = data.equipment || {};
      
      // Load item database
      try {
        const itemsResponse = await fetch('/api/items');
        const itemsData = await itemsResponse.json();
        itemDatabase = itemsData.items || { weapons: [], armor: [], consumables: [], accessories: [] };
      } catch (error) {
        console.error('Error loading items:', error);
      }
      
      startGame();
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    showError('Connection error');
  }
}

// Character creation state
let characterCreationData = {
  username: '',
  selectedClass: null,
  statPoints: 20,
  stats: {
    str: 5,
    dex: 5,
    int: 5,
    vit: 5,
    def: 5
  }
};

async function signup(username) {
  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store username and show character creation
      characterCreationData.username = data.username;
      showCharacterCreation();
    } else {
      showError(data.error || 'Signup failed');
    }
  } catch (error) {
    showError('Connection error');
  }
}

// Show character creation screen
async function showCharacterCreation() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('characterCreation').style.display = 'block';
  
  // Reset character creation data
  characterCreationData.selectedClass = null;
  characterCreationData.statPoints = 20;
  characterCreationData.stats = {
    str: 5,
    dex: 5,
    int: 5,
    vit: 5,
    def: 5
  };
  
  // Clear error message
  document.getElementById('charCreationError').textContent = '';
  
  // Load character classes
  try {
    const response = await fetch('/api/character-classes');
    const data = await response.json();
    populateClassSelection(data.classes);
  } catch (error) {
    console.error('Error loading classes:', error);
  }
  
  populateStatAllocation();
  updateCreateButton();
}

// Populate class selection
function populateClassSelection(classes) {
  const container = document.getElementById('classSelection');
  container.innerHTML = '';
  
  classes.forEach(classData => {
    const div = document.createElement('div');
    div.className = 'class-option';
    div.dataset.classId = classData.id;
    div.innerHTML = `
      <h3>${classData.name}</h3>
      <p>${classData.description}</p>
      <p style="font-size: 10px; margin-top: 8px;">
        HP: ${classData.baseStats.maxHp} | MP: ${classData.baseStats.maxMp}<br>
        STR: ${classData.baseStats.str} | DEX: ${classData.baseStats.dex} | INT: ${classData.baseStats.int}
      </p>
      </p>
    `;
    div.addEventListener('click', () => selectClass(classData.id));
    container.appendChild(div);
  });
}

// Select a class
function selectClass(classId) {
  characterCreationData.selectedClass = classId;
  
  // Update UI
  document.querySelectorAll('.class-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  document.querySelector(`[data-class-id="${classId}"]`).classList.add('selected');
  
  updateCreateButton();
}

// Populate stat allocation
function populateStatAllocation() {
  const container = document.getElementById('statAllocation');
  container.innerHTML = '';
  
  const stats = ['str', 'dex', 'int', 'vit', 'def'];
  const statNames = {
    str: 'Strength',
    dex: 'Dexterity',
    int: 'Intelligence',
    vit: 'Vitality',
    def: 'Defense'
  };
  
  stats.forEach(stat => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <label>${statNames[stat]}:</label>
      <button onclick="adjustStat('${stat}', -1)">-</button>
      <span class="stat-value" id="stat-${stat}">${characterCreationData.stats[stat]}</span>
      <button onclick="adjustStat('${stat}', 1)">+</button>
    `;
    container.appendChild(row);
  });
  
  updateStatDisplay();
}

// Adjust stat (needs to be global for onclick)
window.adjustStat = function(stat, change) {
  const newValue = characterCreationData.stats[stat] + change;
  
  // Check constraints
  if (change < 0 && newValue < 5) return; // Minimum 5
  if (change > 0 && characterCreationData.statPoints <= 0) return; // No points left
  
  characterCreationData.stats[stat] = newValue;
  characterCreationData.statPoints -= change;
  
  updateStatDisplay();
  updateCreateButton();
};

// Update stat display
function updateStatDisplay() {
  document.getElementById('pointsRemaining').textContent = characterCreationData.statPoints;
  
  Object.keys(characterCreationData.stats).forEach(stat => {
    document.getElementById(`stat-${stat}`).textContent = characterCreationData.stats[stat];
  });
  
  // Update button states
  document.querySelectorAll('.stat-row button').forEach(btn => {
    const isDecrease = btn.textContent === '-';
    const stat = btn.parentElement.querySelector('.stat-value').id.replace('stat-', '');
    
    if (isDecrease) {
      btn.disabled = characterCreationData.stats[stat] <= 5;
    } else {
      btn.disabled = characterCreationData.statPoints <= 0;
    }
  });
}

// Update create button state
function updateCreateButton() {
  const btn = document.getElementById('createCharacterBtn');
  const canCreate = characterCreationData.selectedClass !== null && 
                     characterCreationData.statPoints === 0;
  btn.disabled = !canCreate;
}

// Create character
document.getElementById('createCharacterBtn').addEventListener('click', async () => {
  if (characterCreationData.statPoints !== 0) {
    document.getElementById('charCreationError').textContent = 'Please allocate all stat points!';
    return;
  }
  
  if (!characterCreationData.selectedClass) {
    document.getElementById('charCreationError').textContent = 'Please select a class!';
    return;
  }
  
  try {
    // Get base stats for the selected class
    const classResponse = await fetch('/api/character-classes');
    const classData = await classResponse.json();
    const selectedClassData = classData.classes.find(c => c.id === characterCreationData.selectedClass);
    
    // Calculate final stats (base stats + allocated points)
    // Allocated points start at 5, so we add the difference
    const allocatedPoints = {
      str: characterCreationData.stats.str - 5,
      dex: characterCreationData.stats.dex - 5,
      int: characterCreationData.stats.int - 5,
      vit: characterCreationData.stats.vit - 5,
      def: characterCreationData.stats.def - 5
    };
    
    const finalStats = {
      str: selectedClassData.baseStats.str + allocatedPoints.str,
      dex: selectedClassData.baseStats.dex + allocatedPoints.dex,
      int: selectedClassData.baseStats.int + allocatedPoints.int,
      vit: selectedClassData.baseStats.vit + allocatedPoints.vit,
      def: selectedClassData.baseStats.def + allocatedPoints.def
    };
    
    // Calculate HP/MP based on VIT and INT
    const baseHp = selectedClassData.baseStats.maxHp;
    const baseMp = selectedClassData.baseStats.maxMp;
    const hpBonus = allocatedPoints.vit * 5; // Each VIT point adds 5 HP
    const mpBonus = allocatedPoints.int * 3; // Each INT point adds 3 MP
    
    const characterData = {
      characterClass: characterCreationData.selectedClass,
      level: 1,
      xp: 0,
      hp: baseHp + hpBonus,
      maxHp: baseHp + hpBonus,
      mp: baseMp + mpBonus,
      maxMp: baseMp + mpBonus,
      str: finalStats.str,
      dex: finalStats.dex,
      int: finalStats.int,
      vit: finalStats.vit,
      def: finalStats.def
    };
    
    // Update character on server
    const response = await fetch('/api/update-character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: characterCreationData.username,
        characterData: characterData
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Load character data and start game
      player.username = characterCreationData.username;
      player.score = 0;
      respawnX = 10000;
      respawnY = 10000;
      player.characterClass = characterData.characterClass;
      player.level = characterData.level;
      player.xp = characterData.xp;
      player.hp = characterData.hp;
      player.maxHp = characterData.maxHp;
      player.mp = characterData.mp;
      player.maxMp = characterData.maxMp;
      player.str = characterData.str;
      player.dex = characterData.dex;
      player.int = characterData.int;
      player.vit = characterData.vit;
      player.def = characterData.def;
      player.xpForNextLevel = getXPForLevel(player.level);
      
      document.getElementById('characterCreation').style.display = 'none';
      startGame();
    } else {
      document.getElementById('charCreationError').textContent = data.error || 'Failed to create character';
    }
  } catch (error) {
    document.getElementById('charCreationError').textContent = 'Connection error';
  }
});

function showError(message) {
  document.getElementById('errorMsg').textContent = message;
  setTimeout(() => {
    document.getElementById('errorMsg').textContent = '';
  }, 3000);
}

function startGame() {
  loggedIn = true;
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('scoreDisplay').style.display = 'block';
  updateCharacterDisplay();
  
  // Connect WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}`);
  
  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: 'join',
      username: player.username,
      score: player.score,
      respawnX: respawnX,
      respawnY: respawnY
    }));
  };
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'gameState') {
      otherPlayers = data.players.filter(p => p.username !== player.username);
      
      // Update world dimensions if provided
      if (data.worldWidth) worldWidth = data.worldWidth;
      if (data.worldHeight) worldHeight = data.worldHeight;
      
      // Update zones if provided
      if (data.zones) {
        zones = data.zones;
      }
      
      // Update portals if provided
      if (data.portals) {
        portals = data.portals;
      }
      
      // Update enemies if provided
      if (data.enemies) {
        enemies = data.enemies;
      }
      
      // Set player position from server
      const serverPlayer = data.players.find(p => p.username === player.username);
      if (serverPlayer) {
        player.x = serverPlayer.x;
        player.y = serverPlayer.y;
        updateCamera();
        checkZoneChange();
      }
    }
    
    if (data.type === 'respawnSet') {
      respawnX = data.x;
      respawnY = data.y;
      respawnMessage = `Respawn point set to ${data.town}!`;
      respawnMessageTimer = 180; // 3 seconds at 60fps
    }
    
    if (data.type === 'playerJoined') {
      if (data.username !== player.username) {
        otherPlayers.push({
          username: data.username,
          x: data.x,
          y: data.y,
          score: 0
        });
      }
    }
    
    if (data.type === 'playerMove') {
      const otherPlayer = otherPlayers.find(p => p.username === data.username);
      if (otherPlayer) {
        otherPlayer.x = data.x;
        otherPlayer.y = data.y;
      }
    }
    
    if (data.type === 'playerLeft') {
      otherPlayers = otherPlayers.filter(p => p.username !== data.username);
    }
    
    if (data.type === 'characterUpdate') {
      player.xp = data.xp;
      player.xpForNextLevel = data.xpForNextLevel;
      player.level = data.level;
      updateCharacterDisplay();
    }
    
    if (data.type === 'levelUp') {
      player.level = data.level;
      player.hp = data.stats.hp;
      player.maxHp = data.stats.maxHp;
      player.mp = data.stats.mp;
      player.maxMp = data.stats.maxMp;
      player.str = data.stats.str;
      player.dex = data.stats.dex;
      player.int = data.stats.int;
      player.vit = data.stats.vit;
      player.def = data.stats.def;
      player.xpForNextLevel = getXPForLevel(player.level);
      
      levelUpMessage = `Level Up! You are now Level ${player.level}!`;
      levelUpTimer = 300; // 5 seconds at 60fps
      updateCharacterDisplay();
    }
    
    if (data.type === 'enemyMove') {
      const enemy = enemies.find(e => e.id === data.enemyId);
      if (enemy) {
        enemy.x = data.x;
        enemy.y = data.y;
      }
    }
    
    if (data.type === 'enemyDamaged') {
      const enemy = enemies.find(e => e.id === data.enemyId);
      if (enemy) {
        enemy.hp = data.hp;
        enemy.maxHp = data.maxHp;
        
        // Show damage number
        if (data.attacker === player.username) {
          const screenPos = worldToScreen(enemy.x, enemy.y);
          damageNumbers.push({
            x: screenPos.x,
            y: screenPos.y - 20,
            damage: data.damage,
            timer: 60,
            color: [255, 100, 100]
          });
        }
      }
    }
    
    if (data.type === 'enemyKilled') {
      enemies = enemies.filter(e => e.id !== data.enemyId);
      
      if (data.killer === player.username) {
        // Show kill notification
        let lootText = '';
        if (data.loot && data.loot.length > 0) {
          lootText = ` + ${data.loot.length} item(s)`;
          // Add loot to inventory
          inventory = inventory.concat(data.loot);
        }
        levelUpMessage = `Killed ${data.xpReward} XP, ${data.goldReward} Gold${lootText}!`;
        levelUpTimer = 120;
      }
    }
    
    if (data.type === 'enemyRespawn') {
      const existingIndex = enemies.findIndex(e => e.id === data.enemy.id);
      if (existingIndex >= 0) {
        enemies[existingIndex] = data.enemy;
      } else {
        enemies.push(data.enemy);
      }
    }
    
    if (data.type === 'playerDamaged') {
      player.hp = data.hp;
      player.maxHp = data.maxHp;
      updateCharacterDisplay();
      
      // Show damage number on player
      const screenPos = worldToScreen(player.x, player.y);
      damageNumbers.push({
        x: screenPos.x,
        y: screenPos.y - 20,
        damage: data.damage,
        timer: 60,
        color: [255, 50, 50]
      });
    }
    
    if (data.type === 'playerDeath') {
      player.x = data.respawnX;
      player.y = data.respawnY;
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      updateCamera();
      updateCharacterDisplay();
      
      levelUpMessage = 'You have died! Respawned at your respawn point.';
      levelUpTimer = 180;
    }
    
    if (data.type === 'playerRespawn') {
      const otherPlayer = otherPlayers.find(p => p.username === data.username);
      if (otherPlayer) {
        otherPlayer.x = data.x;
        otherPlayer.y = data.y;
      }
    }
  };
  
  // Keyboard handlers
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Portal interaction (E key)
    if (e.key === 'e' || e.key === 'E') {
      if (nearPortal && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'interactPortal'
        }));
      }
    }
    
    // Toggle character sheet (C key)
    if (e.key === 'c' || e.key === 'C') {
      showCharacterSheet = !showCharacterSheet;
    }
    
    // Toggle inventory (I key)
    if (e.key === 'i' || e.key === 'I') {
      showInventory = !showInventory;
    }
  });
  
  // Mouse click handler for attacking (will be called from p5.js mousePressed)
  
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
}

async function updateScoreOnServer() {
  try {
    await fetch('/api/update-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: player.username,
        score: player.score
      })
    });
  } catch (error) {
    console.error('Error updating score:', error);
  }
}

// Update character display in UI
function updateCharacterDisplay() {
  document.getElementById('usernameDisplay').textContent = player.username;
  document.getElementById('scoreValue').textContent = player.score;
  document.getElementById('levelDisplay').textContent = player.level;
  document.getElementById('hpDisplay').textContent = player.hp;
  document.getElementById('maxHpDisplay').textContent = player.maxHp;
  document.getElementById('mpDisplay').textContent = player.mp;
  document.getElementById('maxMpDisplay').textContent = player.maxMp;
  document.getElementById('xpDisplay').textContent = player.xp;
  document.getElementById('xpForNextLevelDisplay').textContent = player.xpForNextLevel;
  
  // Update HP bar
  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  document.getElementById('hpBar').style.width = hpPercent + '%';
  
  // Update MP bar
  const mpPercent = Math.max(0, Math.min(100, (player.mp / player.maxMp) * 100));
  document.getElementById('mpBar').style.width = mpPercent + '%';
}

// p5.js setup
function setup() {
  canvasWidth = 800;
  canvasHeight = 600;
  createCanvas(canvasWidth, canvasHeight);
}

// Camera system - follows player and stays within world bounds
function updateCamera() {
  // Center camera on player
  camera.x = player.x - canvasWidth / 2;
  camera.y = player.y - canvasHeight / 2;
  
  // Clamp camera to world boundaries
  camera.x = Math.max(0, Math.min(worldWidth - canvasWidth, camera.x));
  camera.y = Math.max(0, Math.min(worldHeight - canvasHeight, camera.y));
}

// Convert world coordinates to screen coordinates
function worldToScreen(worldX, worldY) {
  return {
    x: worldX - camera.x,
    y: worldY - camera.y
  };
}

// Calculate XP needed for level
function getXPForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Check which zone the player is in
function getZoneAt(x, y) {
  for (let zone of zones) {
    if (x >= zone.x && x <= zone.x + zone.width &&
        y >= zone.y && y <= zone.y + zone.height) {
      return zone;
    }
  }
  return null;
}

// Check if player entered a new zone
function checkZoneChange() {
  const zone = getZoneAt(player.x, player.y);
  
  if (zone && zone.id !== lastZoneId) {
    currentZone = zone;
    lastZoneId = zone.id;
    zoneDisplayTimer = 180; // Display for 3 seconds at 60fps
  } else if (!zone) {
    currentZone = null;
    if (lastZoneId !== null) {
      lastZoneId = null;
    }
  }
}

// Check for nearby portals
function checkNearbyPortals() {
  nearPortal = null;
  for (let portal of portals) {
    const distance = dist(player.x, player.y, portal.x, portal.y);
    if (distance < 100) { // Interaction range
      nearPortal = portal;
      break;
    }
  }
}

function draw() {
  if (!loggedIn) return;
  
  // Update camera to follow player
  updateCamera();
  
  // Check zone changes
  checkZoneChange();
  
  // Check for nearby portals
  checkNearbyPortals();
  
  // Draw zones with their themes
  drawZones();
  
  // Draw world grid
  drawWorldGrid();
  
  // Handle movement
  const speed = 3;
  let moved = false;
  
  if (keys['w'] || keys['W']) {
    player.y = max(player.y - speed, player.size);
    moved = true;
  }
  if (keys['s'] || keys['S']) {
    player.y = min(player.y + speed, worldHeight - player.size);
    moved = true;
  }
  if (keys['a'] || keys['A']) {
    player.x = max(player.x - speed, player.size);
    moved = true;
  }
  if (keys['d'] || keys['D']) {
    player.x = min(player.x + speed, worldWidth - player.size);
    moved = true;
  }
  
  // Send movement to server
  if (moved && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'move',
      x: player.x,
      y: player.y
    }));
  }
  
  // Draw portals
  drawPortals();
  
  // Draw enemies
  drawEnemies();
  
  // Draw other players (only those visible on screen)
  for (let other of otherPlayers) {
    const screenPos = worldToScreen(other.x, other.y);
    
    // Only draw if player is visible on screen
    if (screenPos.x > -50 && screenPos.x < canvasWidth + 50 &&
        screenPos.y > -50 && screenPos.y < canvasHeight + 50) {
      fill(100, 150, 255);
      ellipse(screenPos.x, screenPos.y, player.size, player.size);
      fill(255);
      textAlign(CENTER);
      textSize(10);
      text(other.username, screenPos.x, screenPos.y - player.size - 5);
    }
  }
  
  // Draw current player (always centered)
  const playerScreenPos = worldToScreen(player.x, player.y);
  if (player.hp > 0) {
    fill(50, 200, 100);
    ellipse(playerScreenPos.x, playerScreenPos.y, player.size, player.size);
    fill(255);
    textAlign(CENTER);
    textSize(10);
    text(player.username, playerScreenPos.x, playerScreenPos.y - player.size - 5);
  }
  
  // Draw damage numbers
  drawDamageNumbers();
  
  // Draw world boundaries (if camera is near edge)
  drawWorldBoundaries();
  
  // Draw zone name display
  drawZoneDisplay();
  
  // Draw respawn message
  drawRespawnMessage();
  
  // Draw level up message
  drawLevelUpMessage();
  
  // Draw portal interaction hint
  drawPortalHint();
  
  // Draw character sheet
  if (showCharacterSheet) {
    drawCharacterSheet();
  }
  
  // Draw inventory
  if (showInventory) {
    drawInventory();
  }
  
  // Draw minimap
  drawMinimap();
  
  // Draw instructions
  fill(255, 200);
  textAlign(LEFT);
  textSize(12);
  text('WASD to move | C - Character Sheet | I - Inventory | Click to attack enemies', 10, canvasHeight - 30);
  text('Kill enemies to gain XP! Higher level mobs give more XP.', 10, canvasHeight - 15);
}

// Draw enemies
function drawEnemies() {
  for (let enemy of enemies) {
    if (enemy.hp <= 0) continue;
    
    const screenPos = worldToScreen(enemy.x, enemy.y);
    
    // Only draw if enemy is visible on screen
    if (screenPos.x > -50 && screenPos.x < canvasWidth + 50 &&
        screenPos.y > -50 && screenPos.y < canvasHeight + 50) {
      
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
        const levelDiff = enemy.level - player.level;
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
}

// Draw damage numbers
function drawDamageNumbers() {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const dmg = damageNumbers[i];
    dmg.timer--;
    dmg.y -= 1; // Float upward
    
    if (dmg.timer <= 0) {
      damageNumbers.splice(i, 1);
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

// Handle inventory clicks
function handleInventoryClick(mx, my) {
  const invWidth = 600;
  const invHeight = 500;
  const invX = (canvasWidth - invWidth) / 2;
  const invY = (canvasHeight - invHeight) / 2;
  
  // Check if click is in inventory area
  if (mx < invX || mx > invX + invWidth || my < invY || my > invY + invHeight) {
    return;
  }
  
  // First, check if clicking on action button (if item is selected)
  if (selectedInventorySlot !== null && selectedInventorySlot < inventory.length) {
    const infoY = invY + invHeight - 100;
    const item = inventory[selectedInventorySlot];
    
    // Check if clicking on Use/Equip button
    if (mx >= invX + invWidth - 120 && mx <= invX + invWidth - 20 &&
        my >= infoY + 50 && my <= infoY + 75) {
      if (item.type === 'consumable') {
        useItem(selectedInventorySlot);
      } else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
        equipItem(selectedInventorySlot);
      }
      return;
    }
  }
  
  // Check equipment slot clicks (for unequipping)
  const equipX = invX + 20;
  const equipY = invY + 70;
  const slotSize = 60;
  const slotSpacing = 70;
  
  const equipmentSlots = [
    { slot: 'weapon', x: equipX, y: equipY },
    { slot: 'helmet', x: equipX, y: equipY + slotSpacing },
    { slot: 'chest', x: equipX, y: equipY + slotSpacing * 2 },
    { slot: 'legs', x: equipX, y: equipY + slotSpacing * 3 },
    { slot: 'boots', x: equipX, y: equipY + slotSpacing * 4 },
    { slot: 'ring1', x: equipX + slotSpacing, y: equipY + slotSpacing * 2 },
    { slot: 'ring2', x: equipX + slotSpacing, y: equipY + slotSpacing * 3 },
    { slot: 'necklace', x: equipX + slotSpacing, y: equipY + slotSpacing * 4 }
  ];
  
  for (let slot of equipmentSlots) {
    if (mx >= slot.x && mx <= slot.x + slotSize && 
        my >= slot.y && my <= slot.y + slotSize) {
      if (equipment[slot.slot]) {
        unequipItem(slot.slot);
      } else {
        selectedInventorySlot = null; // Deselect if clicking empty slot
      }
      return;
    }
  }
  
  // Check inventory grid clicks
  const invGridX = invX + 200;
  const invGridY = invY + 70;
  const gridCols = 6;
  const gridRows = 5;
  const gridSlotSize = 50;
  const gridSpacing = 55;
  
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const slotX = invGridX + col * gridSpacing;
      const slotY = invGridY + row * gridSpacing;
      const index = row * gridCols + col;
      
      if (mx >= slotX && mx <= slotX + gridSlotSize && 
          my >= slotY && my <= slotY + gridSlotSize) {
        if (index < inventory.length) {
          selectedInventorySlot = index;
        } else {
          selectedInventorySlot = null;
        }
        return;
      }
    }
  }
  
  // If clicked elsewhere in inventory, deselect
  selectedInventorySlot = null;
}

// Equip item
async function equipItem(inventoryIndex) {
  if (inventoryIndex >= inventory.length) return;
  
  const item = inventory[inventoryIndex];
  let slot = null;
  
  // Determine slot based on item type
  if (item.type === 'weapon') {
    slot = 'weapon';
  } else if (item.type === 'armor') {
    slot = item.slot; // helmet, chest, legs, boots
  } else if (item.type === 'accessory') {
    if (item.slot === 'ring') {
      slot = equipment.ring1 ? 'ring2' : 'ring1';
    } else if (item.slot === 'necklace') {
      slot = 'necklace';
    }
  }
  
  if (!slot) return;
  
  try {
    const response = await fetch('/api/inventory/equip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: player.username,
        itemInstanceId: item.instanceId,
        slot: slot
      })
    });
    
    const data = await response.json();
    if (data.success) {
      inventory = data.inventory;
      equipment = data.equipment;
      selectedInventorySlot = null;
      // Recalculate stats with equipment
      await loadPlayerStats();
    }
  } catch (error) {
    console.error('Error equipping item:', error);
  }
}

// Unequip item
async function unequipItem(slot) {
  try {
    const response = await fetch('/api/inventory/unequip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: player.username,
        slot: slot
      })
    });
    
    const data = await response.json();
    if (data.success) {
      inventory = data.inventory;
      equipment = data.equipment;
      // Recalculate stats with equipment
      await loadPlayerStats();
    }
  } catch (error) {
    console.error('Error unequipping item:', error);
  }
}

// Use consumable
async function useItem(inventoryIndex) {
  if (inventoryIndex >= inventory.length) return;
  
  const item = inventory[inventoryIndex];
  if (item.type !== 'consumable') return;
  
  try {
    const response = await fetch('/api/inventory/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: player.username,
        itemInstanceId: item.instanceId
      })
    });
    
    const data = await response.json();
    if (data.success) {
      inventory = data.inventory;
      player.hp = data.hp;
      player.mp = data.mp;
      player.xp = data.xp;
      updateCharacterDisplay();
      selectedInventorySlot = null;
    }
  } catch (error) {
    console.error('Error using item:', error);
  }
}

// Load player stats with equipment bonuses
async function loadPlayerStats() {
  try {
    const response = await fetch(`/api/inventory/${player.username}`);
    const data = await response.json();
    inventory = data.inventory || [];
    equipment = data.equipment || {};
    
    // Calculate equipment bonuses (client-side calculation)
    // Note: Server should also apply these, but we calculate here for display
    // For now, we'll just reload from server which should have calculated stats
    const loginResponse = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: player.username })
    });
    const loginData = await loginResponse.json();
    if (loginResponse.ok) {
      player.hp = loginData.hp;
      player.maxHp = loginData.maxHp;
      player.mp = loginData.mp;
      player.maxMp = loginData.maxMp;
      player.str = loginData.str;
      player.dex = loginData.dex;
      player.int = loginData.int;
      player.vit = loginData.vit;
      player.def = loginData.def;
      updateCharacterDisplay();
    }
  } catch (error) {
    console.error('Error loading player stats:', error);
  }
}

// p5.js mouse pressed handler
function mousePressed() {
  if (!loggedIn) return;
  
  // Handle inventory clicks
  if (showInventory) {
    handleInventoryClick(mouseX, mouseY);
    return;
  }
  
  if (player.hp <= 0) return;
  
  const now = Date.now();
  if (now - lastAttackTime < attackCooldown) return;
  
  // Get mouse position in world coordinates
  const worldMouseX = mouseX + camera.x;
  const worldMouseY = mouseY + camera.y;
  
  // Find nearest enemy within attack range
  let nearestEnemy = null;
  let nearestDistance = Infinity;
  
  enemies.forEach(enemy => {
    if (enemy.hp <= 0) return;
    
    const distance = dist(player.x, player.y, enemy.x, enemy.y);
    if (distance < 50 && distance < nearestDistance) { // Attack range
      nearestDistance = distance;
      nearestEnemy = enemy;
    }
  });
  
  if (nearestEnemy && socket && socket.readyState === WebSocket.OPEN) {
    lastAttackTime = now;
    socket.send(JSON.stringify({
      type: 'attackEnemy',
      enemyId: nearestEnemy.id
    }));
  }
}

// Draw portals
function drawPortals() {
  for (let portal of portals) {
    const screenPos = worldToScreen(portal.x, portal.y);
    
    // Only draw if portal is visible on screen
    if (screenPos.x > -100 && screenPos.x < canvasWidth + 100 &&
        screenPos.y > -100 && screenPos.y < canvasHeight + 100) {
      
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

// Draw portal interaction hint
function drawPortalHint() {
  if (nearPortal) {
    // Background
    fill(0, 0, 0, 200);
    noStroke();
    rect(canvasWidth / 2 - 150, canvasHeight - 80, 300, 40);
    
    // Text
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(16);
    text(`Press E to set respawn point at ${nearPortal.town}`, canvasWidth / 2, canvasHeight - 55);
  }
}

// Draw respawn message
function drawRespawnMessage() {
  if (respawnMessageTimer > 0 && respawnMessage) {
    respawnMessageTimer--;
    
    // Background
    fill(0, 0, 0, 200);
    noStroke();
    textSize(18);
    textStyle(BOLD);
    const msgWidth = textWidth(respawnMessage) + 40;
    const rectX = (canvasWidth - msgWidth) / 2;
    rect(rectX, canvasHeight / 2 - 30, msgWidth, 50);
    
    // Message
    fill(100, 255, 100);
    textAlign(CENTER);
    text(respawnMessage, canvasWidth / 2, canvasHeight / 2);
    
    textStyle(NORMAL);
  }
}

// Draw level up message
function drawLevelUpMessage() {
  if (levelUpTimer > 0 && levelUpMessage) {
    levelUpTimer--;
    
    // Background
    fill(0, 0, 0, 220);
    noStroke();
    textSize(28);
    textStyle(BOLD);
    const msgWidth = textWidth(levelUpMessage) + 60;
    const rectX = (canvasWidth - msgWidth) / 2;
    rect(rectX, canvasHeight / 2 - 50, msgWidth, 70);
    
    // Message with glow effect
    fill(255, 215, 0);
    textAlign(CENTER);
    text(levelUpMessage, canvasWidth / 2, canvasHeight / 2);
    
    textStyle(NORMAL);
  }
}

// Draw character sheet
function drawCharacterSheet() {
  const sheetWidth = 400;
  const sheetHeight = 500;
  const sheetX = (canvasWidth - sheetWidth) / 2;
  const sheetY = (canvasHeight - sheetHeight) / 2;
  
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
  text(`Name: ${player.username}`, sheetX + 20, yOffset);
  yOffset += lineHeight;
  
  const classNames = {
    warrior: 'Warrior',
    mage: 'Mage',
    rogue: 'Rogue',
    paladin: 'Paladin'
  };
  
  fill(150, 200, 255);
  text(`Class: ${classNames[player.characterClass] || player.characterClass}`, sheetX + 20, yOffset);
  yOffset += lineHeight;
  
  fill(255, 200, 100);
  text(`Level: ${player.level}`, sheetX + 20, yOffset);
  yOffset += lineHeight;
  
  // XP Bar
  const xpBarWidth = sheetWidth - 40;
  const xpBarHeight = 20;
  const xpPercent = player.xp / player.xpForNextLevel;
  
  fill(50, 50, 50);
  rect(sheetX + 20, yOffset, xpBarWidth, xpBarHeight);
  
  fill(100, 200, 255);
  rect(sheetX + 20, yOffset, xpBarWidth * xpPercent, xpBarHeight);
  
  fill(255, 255, 255);
  textAlign(CENTER);
  textSize(12);
  text(`${player.xp} / ${player.xpForNextLevel} XP`, sheetX + sheetWidth / 2, yOffset + 15);
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
  text(`HP: ${player.hp} / ${player.maxHp}`, sheetX + 20, yOffset);
  yOffset += lineHeight;
  
  // MP
  fill(100, 150, 255);
  text(`MP: ${player.mp} / ${player.maxMp}`, sheetX + 20, yOffset);
  yOffset += lineHeight + 5;
  
  // Attributes
  fill(255, 200, 100);
  text(`STR: ${player.str}`, sheetX + 20, yOffset);
  text(`DEX: ${player.dex}`, sheetX + 220, yOffset);
  yOffset += lineHeight;
  
  text(`INT: ${player.int}`, sheetX + 20, yOffset);
  text(`VIT: ${player.vit}`, sheetX + 220, yOffset);
  yOffset += lineHeight;
  
  text(`DEF: ${player.def}`, sheetX + 20, yOffset);
  yOffset += lineHeight + 10;
  
  // Close hint
  textAlign(CENTER);
  fill(150, 150, 150);
  textSize(12);
  text('Press C to close', sheetX + sheetWidth / 2, sheetY + sheetHeight - 20);
}

// Draw inventory UI
function drawInventory() {
  const invWidth = 600;
  const invHeight = 500;
  const invX = (canvasWidth - invWidth) / 2;
  const invY = (canvasHeight - invHeight) / 2;
  
  // Background
  fill(30, 30, 40, 240);
  stroke(100, 150, 200);
  strokeWeight(3);
  rect(invX, invY, invWidth, invHeight);
  
  // Title
  fill(255, 255, 255);
  textAlign(CENTER);
  textSize(24);
  textStyle(BOLD);
  text('Inventory', invX + invWidth / 2, invY + 35);
  textStyle(NORMAL);
  
  // Equipment slots (left side)
  const equipX = invX + 20;
  const equipY = invY + 70;
  const slotSize = 60;
  const slotSpacing = 70;
  
  textAlign(LEFT);
  textSize(16);
  fill(200, 200, 255);
  text('Equipment', equipX, equipY - 10);
  
  // Equipment slots
  const equipmentSlots = [
    { name: 'Weapon', slot: 'weapon', x: equipX, y: equipY },
    { name: 'Helmet', slot: 'helmet', x: equipX, y: equipY + slotSpacing },
    { name: 'Chest', slot: 'chest', x: equipX, y: equipY + slotSpacing * 2 },
    { name: 'Legs', slot: 'legs', x: equipX, y: equipY + slotSpacing * 3 },
    { name: 'Boots', slot: 'boots', x: equipX, y: equipY + slotSpacing * 4 },
    { name: 'Ring 1', slot: 'ring1', x: equipX + slotSpacing, y: equipY + slotSpacing * 2 },
    { name: 'Ring 2', slot: 'ring2', x: equipX + slotSpacing, y: equipY + slotSpacing * 3 },
    { name: 'Necklace', slot: 'necklace', x: equipX + slotSpacing, y: equipY + slotSpacing * 4 }
  ];
  
  for (let slot of equipmentSlots) {
    // Slot background
    fill(40, 40, 50);
    stroke(80, 80, 100);
    strokeWeight(2);
    rect(slot.x, slot.y, slotSize, slotSize);
    
    // Slot label
    fill(150, 150, 150);
    textSize(10);
    textAlign(CENTER);
    text(slot.name, slot.x + slotSize / 2, slot.y + slotSize + 12);
    
    // Draw equipped item
    if (equipment[slot.slot]) {
      const item = equipment[slot.slot];
      fill(100, 150, 200);
      stroke(150, 200, 255);
      strokeWeight(2);
      rect(slot.x + 5, slot.y + 5, slotSize - 10, slotSize - 10);
      
      // Item name (truncated)
      fill(255);
      textSize(8);
      text(item.name.substring(0, 8), slot.x + slotSize / 2, slot.y + slotSize / 2);
    }
  }
  
  // Inventory grid (right side)
  const invGridX = invX + 200;
  const invGridY = invY + 70;
  const gridCols = 6;
  const gridRows = 5;
  const gridSlotSize = 50;
  const gridSpacing = 55;
  
  textAlign(LEFT);
  textSize(16);
  fill(200, 200, 255);
  text('Inventory', invGridX, invGridY - 10);
  
  // Draw inventory grid
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const slotX = invGridX + col * gridSpacing;
      const slotY = invGridY + row * gridSpacing;
      const index = row * gridCols + col;
      
      // Slot background
      fill(40, 40, 50);
      stroke(80, 80, 100);
      strokeWeight(1);
      rect(slotX, slotY, gridSlotSize, gridSlotSize);
      
      // Draw item if exists
      if (index < inventory.length) {
        const item = inventory[index];
        const rarityColors = {
          common: [150, 150, 150],
          uncommon: [100, 200, 100],
          rare: [100, 150, 255],
          epic: [200, 100, 255],
          legendary: [255, 200, 100]
        };
        const color = rarityColors[item.baseRarity] || [150, 150, 150];
        
        fill(color[0], color[1], color[2]);
        stroke(color[0] + 50, color[1] + 50, color[2] + 50);
        strokeWeight(2);
        rect(slotX + 3, slotY + 3, gridSlotSize - 6, gridSlotSize - 6);
        
        // Item name (very small)
        fill(255);
        textSize(7);
        textAlign(CENTER);
        text(item.name.substring(0, 6), slotX + gridSlotSize / 2, slotY + gridSlotSize / 2);
      }
    }
  }
  
  // Item info (bottom)
  if (selectedInventorySlot !== null && selectedInventorySlot < inventory.length) {
    const item = inventory[selectedInventorySlot];
    const infoY = invY + invHeight - 100;
    
    fill(50, 50, 60, 200);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(invX + 20, infoY, invWidth - 40, 80);
    
    textAlign(LEFT);
    textSize(14);
    fill(255, 255, 255);
    textStyle(BOLD);
    text(item.name, invX + 30, infoY + 20);
    textStyle(NORMAL);
    
    textSize(10);
    fill(200, 200, 200);
    text(item.description || 'No description', invX + 30, infoY + 40);
    
    // Item stats
    if (item.stats) {
      let statsText = '';
      for (const [stat, value] of Object.entries(item.stats)) {
        if (typeof value === 'number') {
          statsText += `${stat}: ${Math.floor(value)} `;
        }
      }
      text(statsText, invX + 30, infoY + 55);
    }
    
    // Action buttons
    if (item.type === 'consumable') {
      fill(100, 200, 100);
      rect(invX + invWidth - 120, infoY + 50, 100, 25);
      fill(255);
      textAlign(CENTER);
      text('Use', invX + invWidth - 70, infoY + 67);
    } else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
      fill(150, 150, 255);
      rect(invX + invWidth - 120, infoY + 50, 100, 25);
      fill(255);
      textAlign(CENTER);
      text('Equip', invX + invWidth - 70, infoY + 67);
    }
  }
  
  // Close hint
  textAlign(CENTER);
  fill(150, 150, 150);
  textSize(12);
  text('Press I to close | Click items to select', invX + invWidth / 2, invY + invHeight - 15);
}

// Draw zone name when entering a new zone
function drawZoneDisplay() {
  if (zoneDisplayTimer > 0 && currentZone) {
    zoneDisplayTimer--;
    
    // Set text size first to calculate width
    textSize(24);
    textStyle(BOLD);
    const nameWidth = textWidth(currentZone.name) + 40;
    const rectX = (canvasWidth - nameWidth) / 2;
    
    // Background
    fill(0, 0, 0, 200);
    noStroke();
    rect(rectX, 20, nameWidth, 50);
    
    // Zone name
    fill(255, 255, 255);
    textAlign(CENTER);
    text(currentZone.name, canvasWidth / 2, 50);
    
    // Zone type
    textSize(14);
    textStyle(NORMAL);
    fill(200, 200, 200);
    const typeText = currentZone.type === 'town' ? 'Town' : 
                     currentZone.type === 'road' ? 'Path' : 'Wilderness';
    text(typeText, canvasWidth / 2, 70);
    
    textStyle(NORMAL);
  }
}

// Draw zones with their themes
function drawZones() {
  // Get current zone's background color or default
  let bgColor = [20, 25, 30];
  if (currentZone && currentZone.theme) {
    bgColor = currentZone.theme.bgColor;
  }
  
  // Draw base background
  background(bgColor[0], bgColor[1], bgColor[2]);
  
  // Draw all visible zones
  for (let zone of zones) {
    const zoneRight = zone.x + zone.width;
    const zoneBottom = zone.y + zone.height;
    
    // Check if zone is visible on screen
    if (zoneRight >= camera.x && zone.x <= camera.x + canvasWidth &&
        zoneBottom >= camera.y && zone.y <= camera.y + canvasHeight) {
      
      const screenX = zone.x - camera.x;
      const screenY = zone.y - camera.y;
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
}

// Draw world grid for visual reference
function drawWorldGrid() {
  // Use current zone's grid color or default
  let gridColor = [40, 40, 50];
  if (currentZone && currentZone.theme) {
    gridColor = currentZone.theme.gridColor;
  }
  
  stroke(gridColor[0], gridColor[1], gridColor[2], 80);
  strokeWeight(1);
  
  // Larger grid size for larger world
  const gridSize = 500;
  const startX = Math.floor(camera.x / gridSize) * gridSize;
  const startY = Math.floor(camera.y / gridSize) * gridSize;
  
  // Vertical lines
  for (let x = startX; x < camera.x + canvasWidth; x += gridSize) {
    const screenX = x - camera.x;
    line(screenX, 0, screenX, canvasHeight);
  }
  
  // Horizontal lines
  for (let y = startY; y < camera.y + canvasHeight; y += gridSize) {
    const screenY = y - camera.y;
    line(0, screenY, canvasWidth, screenY);
  }
}

// Draw world boundaries when camera is near edges
function drawWorldBoundaries() {
  noFill();
  stroke(255, 0, 0, 100);
  strokeWeight(3);
  
  if (camera.x <= 0) {
    line(0, 0, 0, canvasHeight);
  }
  if (camera.x >= worldWidth - canvasWidth) {
    line(canvasWidth, 0, canvasWidth, canvasHeight);
  }
  if (camera.y <= 0) {
    line(0, 0, canvasWidth, 0);
  }
  if (camera.y >= worldHeight - canvasHeight) {
    line(0, canvasHeight, canvasWidth, canvasHeight);
  }
}

// Draw minimap in corner
function drawMinimap() {
  const minimapSize = 150;
  const minimapX = canvasWidth - minimapSize - 10;
  const minimapY = 10;
  const scale = minimapSize / worldWidth;
  
  // Minimap background
  fill(0, 0, 0, 180);
  stroke(255, 255, 255, 200);
  strokeWeight(2);
  rect(minimapX, minimapY, minimapSize, minimapSize * (worldHeight / worldWidth));
  
  // Draw zones on minimap
  for (let zone of zones) {
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
  for (let other of otherPlayers) {
    const mapX = minimapX + other.x * scale;
    const mapY = minimapY + other.y * scale;
    ellipse(mapX, mapY, 4, 4);
  }
  
  // Draw current player on minimap
  fill(50, 200, 100);
  const playerMapX = minimapX + player.x * scale;
  const playerMapY = minimapY + player.y * scale;
  ellipse(playerMapX, playerMapY, 5, 5);
  
  // Draw camera viewport on minimap
  noFill();
  stroke(255, 255, 0, 150);
  strokeWeight(1);
  rect(
    minimapX + camera.x * scale,
    minimapY + camera.y * scale,
    canvasWidth * scale,
    canvasHeight * scale
  );
  
  // Minimap label
  fill(255);
  textAlign(LEFT);
  textSize(10);
  text('Map', minimapX, minimapY - 5);
}

