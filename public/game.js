let socket;
let player = {
  username: '',
  x: 10000,
  y: 10000,
  score: 0,
  size: 20
};
let otherPlayers = [];
let orbs = [];
let keys = {};
let loggedIn = false;

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
      startGame();
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    showError('Connection error');
  }
}

async function signup(username) {
  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      player.username = data.username;
      player.score = data.score || 0;
      startGame();
    } else {
      showError(data.error || 'Signup failed');
    }
  } catch (error) {
    showError('Connection error');
  }
}

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
  document.getElementById('usernameDisplay').textContent = player.username;
  document.getElementById('scoreValue').textContent = player.score;
  
  // Connect WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}`);
  
  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: 'join',
      username: player.username,
      score: player.score
    }));
  };
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'gameState') {
      otherPlayers = data.players.filter(p => p.username !== player.username);
      orbs = data.orbs;
      
      // Update world dimensions if provided
      if (data.worldWidth) worldWidth = data.worldWidth;
      if (data.worldHeight) worldHeight = data.worldHeight;
      
      // Update zones if provided
      if (data.zones) {
        zones = data.zones;
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
    
    if (data.type === 'orbCollected') {
      if (data.username === player.username) {
        player.score = data.score;
        document.getElementById('scoreValue').textContent = player.score;
        updateScoreOnServer();
      }
      orbs = orbs.filter(o => o.id !== data.orbId);
    }
    
    if (data.type === 'orbRespawn') {
      orbs.push(data.orb);
    }
  };
  
  // Keyboard handlers
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  
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

function draw() {
  if (!loggedIn) return;
  
  // Update camera to follow player
  updateCamera();
  
  // Check zone changes
  checkZoneChange();
  
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
  
  // Draw orbs (only those visible on screen)
  for (let orb of orbs) {
    const screenPos = worldToScreen(orb.x, orb.y);
    
    // Only draw if orb is visible on screen
    if (screenPos.x > -50 && screenPos.x < canvasWidth + 50 &&
        screenPos.y > -50 && screenPos.y < canvasHeight + 50) {
      
      const distance = dist(player.x, player.y, orb.x, orb.y);
      
      // Check collision
      if (distance < player.size + 10 && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'collectOrb',
          orbId: orb.id
        }));
      }
      
      // Draw orb
      fill(255, 215, 0);
      noStroke();
      ellipse(screenPos.x, screenPos.y, 20, 20);
      fill(255, 255, 0);
      ellipse(screenPos.x, screenPos.y, 12, 12);
    }
  }
  
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
  fill(50, 200, 100);
  ellipse(playerScreenPos.x, playerScreenPos.y, player.size, player.size);
  fill(255);
  textAlign(CENTER);
  textSize(10);
  text(player.username, playerScreenPos.x, playerScreenPos.y - player.size - 5);
  
  // Draw world boundaries (if camera is near edge)
  drawWorldBoundaries();
  
  // Draw zone name display
  drawZoneDisplay();
  
  // Draw minimap
  drawMinimap();
  
  // Draw instructions
  fill(255, 200);
  textAlign(LEFT);
  textSize(12);
  text('WASD to move', 10, canvasHeight - 30);
  text('Collect orbs to earn points!', 10, canvasHeight - 15);
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
  
  // Draw orbs on minimap
  fill(255, 215, 0);
  noStroke();
  for (let orb of orbs) {
    const mapX = minimapX + orb.x * scale;
    const mapY = minimapY + orb.y * scale;
    ellipse(mapX, mapY, 3, 3);
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

