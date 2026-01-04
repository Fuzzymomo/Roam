const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const PORT = 3000;

// Serve static files from public directory
app.use(express.static('public'));
app.use(express.json());

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const accountsFile = path.join(dataDir, 'accounts.csv');

// Initialize accounts.csv if it doesn't exist
if (!fs.existsSync(accountsFile)) {
  const csvWriter = createCsvWriter({
    path: accountsFile,
    header: [
      { id: 'username', title: 'username' },
      { id: 'score', title: 'score' },
      { id: 'respawnX', title: 'respawnX' },
      { id: 'respawnY', title: 'respawnY' }
    ]
  });
  csvWriter.writeRecords([]);
}

// Read accounts from CSV
function readAccounts() {
  return new Promise((resolve, reject) => {
    const accounts = [];
    fs.createReadStream(accountsFile)
      .pipe(csv())
      .on('data', (row) => {
        accounts.push({
          username: row.username,
          score: parseInt(row.score) || 0,
          respawnX: parseFloat(row.respawnX) || SPAWN_X,
          respawnY: parseFloat(row.respawnY) || SPAWN_Y
        });
      })
      .on('end', () => {
        resolve(accounts);
      })
      .on('error', reject);
  });
}

// Write accounts to CSV
function writeAccounts(accounts) {
  return new Promise((resolve, reject) => {
    const csvWriter = createCsvWriter({
      path: accountsFile,
      header: [
        { id: 'username', title: 'username' },
        { id: 'score', title: 'score' },
        { id: 'respawnX', title: 'respawnX' },
        { id: 'respawnY', title: 'respawnY' }
      ]
    });
    csvWriter.writeRecords(accounts)
      .then(resolve)
      .catch(reject);
  });
}

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.username === username);
    
    if (account) {
      res.json({ 
        success: true, 
        username: account.username, 
        score: account.score,
        respawnX: account.respawnX || SPAWN_X,
        respawnY: account.respawnY || SPAWN_Y
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const accounts = await readAccounts();
    
    // Check if username already exists
    if (accounts.find(acc => acc.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Add new account with default respawn at center
    accounts.push({ 
      username, 
      score: 0,
      respawnX: SPAWN_X,
      respawnY: SPAWN_Y
    });
    await writeAccounts(accounts);
    
    res.json({ 
      success: true, 
      username, 
      score: 0,
      respawnX: SPAWN_X,
      respawnY: SPAWN_Y
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update score endpoint
app.post('/api/update-score', async (req, res) => {
  const { username, score } = req.body;
  
  if (!username || score === undefined) {
    return res.status(400).json({ error: 'Username and score are required' });
  }

  try {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.username === username);
    
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }

    account.score = score;
    await writeAccounts(accounts);
    
    res.json({ success: true, username, score });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update respawn point endpoint
app.post('/api/update-respawn', async (req, res) => {
  const { username, respawnX, respawnY } = req.body;
  
  if (!username || respawnX === undefined || respawnY === undefined) {
    return res.status(400).json({ error: 'Username and respawn coordinates are required' });
  }

  try {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.username === username);
    
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }

    account.respawnX = respawnX;
    account.respawnY = respawnY;
    await writeAccounts(accounts);
    
    res.json({ success: true, username, respawnX, respawnY });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// WebSocket server for real-time game updates
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

// World configuration - MMO scale
const WORLD_WIDTH = 20000;
const WORLD_HEIGHT = 20000;
const SPAWN_X = WORLD_WIDTH / 2;
const SPAWN_Y = WORLD_HEIGHT / 2;

// Portal locations - one in each town (centered in each town)
const PORTALS = [
  {
    id: 'northwood_portal',
    name: 'Northwood Portal',
    x: 3500, // Center of Northwood (2000 + 3000/2)
    y: 3500,
    town: 'Northwood'
  },
  {
    id: 'sandhaven_portal',
    name: 'Sandhaven Portal',
    x: 16500, // Center of Sandhaven (15000 + 3000/2)
    y: 16500,
    town: 'Sandhaven'
  },
  {
    id: 'seabreeze_portal',
    name: 'Seabreeze Portal',
    x: 16500, // Center of Seabreeze
    y: 3500,
    town: 'Seabreeze'
  },
  {
    id: 'frosthold_portal',
    name: 'Frosthold Portal',
    x: 3500, // Center of Frosthold
    y: 16500,
    town: 'Frosthold'
  }
];

// Zone definitions - 4 towns with connecting wilderness areas (scaled for MMO)
// World is 20,000x20,000, so zones are scaled 10x from original 2000x2000 world
const ZONES = [
  // North Town - Forest/Mountain Theme
  {
    id: 'north_town',
    name: 'Northwood',
    type: 'town',
    x: 2000,
    y: 2000,
    width: 3000,
    height: 3000,
    theme: {
      bgColor: [30, 60, 40],
      gridColor: [50, 80, 60],
      borderColor: [100, 150, 120]
    }
  },
  // South Town - Desert/Plains Theme
  {
    id: 'south_town',
    name: 'Sandhaven',
    type: 'town',
    x: 15000,
    y: 15000,
    width: 3000,
    height: 3000,
    theme: {
      bgColor: [80, 70, 50],
      gridColor: [100, 90, 70],
      borderColor: [150, 130, 100]
    }
  },
  // East Town - Coastal/Water Theme
  {
    id: 'east_town',
    name: 'Seabreeze',
    type: 'town',
    x: 15000,
    y: 2000,
    width: 3000,
    height: 3000,
    theme: {
      bgColor: [30, 50, 70],
      gridColor: [50, 70, 90],
      borderColor: [80, 120, 150]
    }
  },
  // West Town - Snow/Ice Theme
  {
    id: 'west_town',
    name: 'Frosthold',
    type: 'town',
    x: 2000,
    y: 15000,
    width: 3000,
    height: 3000,
    theme: {
      bgColor: [60, 70, 80],
      gridColor: [80, 90, 100],
      borderColor: [150, 160, 170]
    }
  },
  // Central Wilderness - Neutral connecting area
  {
    id: 'central_wilderness',
    name: 'Central Plains',
    type: 'wilderness',
    x: 5000,
    y: 5000,
    width: 10000,
    height: 10000,
    theme: {
      bgColor: [25, 35, 30],
      gridColor: [40, 50, 45],
      borderColor: [60, 70, 65]
    }
  },
  // North-South Road (West side)
  {
    id: 'north_south_road_west',
    name: 'Northern Path',
    type: 'road',
    x: 2000,
    y: 5000,
    width: 3000,
    height: 10000,
    theme: {
      bgColor: [35, 40, 35],
      gridColor: [50, 55, 50],
      borderColor: [80, 85, 80]
    }
  },
  // East-West Road (North side)
  {
    id: 'east_west_road_north',
    name: 'Eastern Path',
    type: 'road',
    x: 5000,
    y: 2000,
    width: 10000,
    height: 3000,
    theme: {
      bgColor: [35, 40, 35],
      gridColor: [50, 55, 50],
      borderColor: [80, 85, 80]
    }
  },
  // North-South Road (East side)
  {
    id: 'north_south_road_east',
    name: 'Southern Path',
    type: 'road',
    x: 15000,
    y: 5000,
    width: 3000,
    height: 10000,
    theme: {
      bgColor: [35, 40, 35],
      gridColor: [50, 55, 50],
      borderColor: [80, 85, 80]
    }
  },
  // East-West Road (South side)
  {
    id: 'east_west_road_south',
    name: 'Western Path',
    type: 'road',
    x: 5000,
    y: 15000,
    width: 10000,
    height: 3000,
    theme: {
      bgColor: [35, 40, 35],
      gridColor: [50, 55, 50],
      borderColor: [80, 85, 80]
    }
  }
];

// Store connected players
const players = new Map();
const orbs = [];

// Generate initial orbs - more orbs for larger world
function generateOrbs() {
  for (let i = 0; i < 200; i++) {
    orbs.push({
      id: i,
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      collected: false
    });
  }
}

generateOrbs();

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'join') {
        // Use respawn point if provided, otherwise use default spawn
        const spawnX = data.respawnX || SPAWN_X;
        const spawnY = data.respawnY || SPAWN_Y;
        
        players.set(ws, {
          username: data.username,
          x: spawnX,
          y: spawnY,
          score: data.score || 0
        });
        
        // Send current game state with world info
        ws.send(JSON.stringify({
          type: 'gameState',
          players: Array.from(players.values()),
          orbs: orbs.filter(o => !o.collected),
          worldWidth: WORLD_WIDTH,
          worldHeight: WORLD_HEIGHT,
          zones: ZONES,
          portals: PORTALS
        }));
        
        // Broadcast new player to others
        broadcast({
          type: 'playerJoined',
          username: data.username,
          x: spawnX,
          y: spawnY
        }, ws);
      }
      
      if (data.type === 'move') {
        const player = players.get(ws);
        if (player) {
          // Validate and clamp position to world boundaries
          const playerSize = 20;
          player.x = Math.max(playerSize, Math.min(WORLD_WIDTH - playerSize, data.x));
          player.y = Math.max(playerSize, Math.min(WORLD_HEIGHT - playerSize, data.y));
          
          // Broadcast movement to other players
          broadcast({
            type: 'playerMove',
            username: player.username,
            x: player.x,
            y: player.y
          }, ws);
        }
      }
      
      if (data.type === 'collectOrb') {
        const player = players.get(ws);
        if (player) {
          const orb = orbs.find(o => o.id === data.orbId && !o.collected);
          if (orb) {
            orb.collected = true;
            player.score += 10;
            
            // Respawn orb after a delay
            setTimeout(() => {
              orb.x = Math.random() * WORLD_WIDTH;
              orb.y = Math.random() * WORLD_HEIGHT;
              orb.collected = false;
              broadcast({
                type: 'orbRespawn',
                orb: orb
              });
            }, 5000);
            
            // Broadcast orb collection
            broadcast({
              type: 'orbCollected',
              orbId: data.orbId,
              username: player.username,
              score: player.score
            });
            
            // Update score on server
            try {
              const accounts = await readAccounts();
              const account = accounts.find(acc => acc.username === player.username);
              if (account) {
                account.score = player.score;
                await writeAccounts(accounts);
              }
            } catch (error) {
              console.error('Error updating score:', error);
            }
          }
        }
      }
      
      if (data.type === 'interactPortal') {
        const player = players.get(ws);
        if (player) {
          // Find nearest portal
          const portal = PORTALS.find(p => {
            const distance = Math.sqrt(
              Math.pow(player.x - p.x, 2) + Math.pow(player.y - p.y, 2)
            );
            return distance < 100; // Interaction range
          });
          
          if (portal) {
            // Update respawn point
            try {
              const accounts = await readAccounts();
              const account = accounts.find(acc => acc.username === player.username);
              if (account) {
                account.respawnX = portal.x;
                account.respawnY = portal.y;
                await writeAccounts(accounts);
                
                // Confirm to player
                ws.send(JSON.stringify({
                  type: 'respawnSet',
                  portal: portal.name,
                  town: portal.town,
                  x: portal.x,
                  y: portal.y
                }));
              }
            } catch (error) {
              console.error('Error updating respawn point:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    const player = players.get(ws);
    if (player) {
      players.delete(ws);
      broadcast({
        type: 'playerLeft',
        username: player.username
      });
    }
    console.log('Client disconnected');
  });
});

function broadcast(data, excludeWs = null) {
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

