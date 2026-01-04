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
      { id: 'score', title: 'score' }
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
          score: parseInt(row.score) || 0
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
        { id: 'score', title: 'score' }
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
      res.json({ success: true, username: account.username, score: account.score });
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

    // Add new account
    accounts.push({ username, score: 0 });
    await writeAccounts(accounts);
    
    res.json({ success: true, username, score: 0 });
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

// WebSocket server for real-time game updates
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

// Store connected players
const players = new Map();
const orbs = [];

// Generate initial orbs
function generateOrbs() {
  for (let i = 0; i < 10; i++) {
    orbs.push({
      id: i,
      x: Math.random() * 800,
      y: Math.random() * 600,
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
        players.set(ws, {
          username: data.username,
          x: 400,
          y: 300,
          score: data.score || 0
        });
        
        // Send current game state
        ws.send(JSON.stringify({
          type: 'gameState',
          players: Array.from(players.values()),
          orbs: orbs.filter(o => !o.collected)
        }));
        
        // Broadcast new player to others
        broadcast({
          type: 'playerJoined',
          username: data.username,
          x: 400,
          y: 300
        }, ws);
      }
      
      if (data.type === 'move') {
        const player = players.get(ws);
        if (player) {
          player.x = data.x;
          player.y = data.y;
          
          // Broadcast movement to other players
          broadcast({
            type: 'playerMove',
            username: player.username,
            x: data.x,
            y: data.y
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
              orb.x = Math.random() * 800;
              orb.y = Math.random() * 600;
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

