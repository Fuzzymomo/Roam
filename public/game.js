let socket;
let player = {
  username: '',
  x: 400,
  y: 300,
  score: 0,
  size: 20
};
let otherPlayers = [];
let orbs = [];
let keys = {};
let loggedIn = false;

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
  createCanvas(800, 600);
}

function draw() {
  if (!loggedIn) return;
  
  background(30, 30, 40);
  
  // Handle movement
  const speed = 3;
  let moved = false;
  
  if (keys['w'] || keys['W']) {
    player.y = max(player.y - speed, player.size);
    moved = true;
  }
  if (keys['s'] || keys['S']) {
    player.y = min(player.y + speed, height - player.size);
    moved = true;
  }
  if (keys['a'] || keys['A']) {
    player.x = max(player.x - speed, player.size);
    moved = true;
  }
  if (keys['d'] || keys['D']) {
    player.x = min(player.x + speed, width - player.size);
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
  
  // Draw orbs
  for (let orb of orbs) {
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
    ellipse(orb.x, orb.y, 20, 20);
    fill(255, 255, 0);
    ellipse(orb.x, orb.y, 12, 12);
  }
  
  // Draw other players
  for (let other of otherPlayers) {
    fill(100, 150, 255);
    ellipse(other.x, other.y, player.size, player.size);
    fill(255);
    textAlign(CENTER);
    textSize(10);
    text(other.username, other.x, other.y - player.size - 5);
  }
  
  // Draw current player
  fill(50, 200, 100);
  ellipse(player.x, player.y, player.size, player.size);
  fill(255);
  textAlign(CENTER);
  textSize(10);
  text(player.username, player.x, player.y - player.size - 5);
  
  // Draw instructions
  fill(255, 200);
  textAlign(LEFT);
  textSize(12);
  text('WASD to move', 10, height - 30);
  text('Collect orbs to earn points!', 10, height - 15);
}

