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

// Character classes with base stats
const CHARACTER_CLASSES = {
  warrior: {
    name: 'Warrior',
    description: 'High strength and health, melee fighter',
    baseStats: {
      hp: 120,
      maxHp: 120,
      mp: 30,
      maxMp: 30,
      str: 15,
      dex: 8,
      int: 5,
      vit: 12,
      def: 10
    }
  },
  mage: {
    name: 'Mage',
    description: 'High intelligence and magic, spellcaster',
    baseStats: {
      hp: 60,
      maxHp: 60,
      mp: 100,
      maxMp: 100,
      str: 5,
      dex: 8,
      int: 15,
      vit: 6,
      def: 5
    }
  },
  rogue: {
    name: 'Rogue',
    description: 'High dexterity and speed, agile fighter',
    baseStats: {
      hp: 80,
      maxHp: 80,
      mp: 50,
      maxMp: 50,
      str: 8,
      dex: 15,
      int: 8,
      vit: 8,
      def: 7
    }
  },
  paladin: {
    name: 'Paladin',
    description: 'Balanced fighter with healing abilities',
    baseStats: {
      hp: 100,
      maxHp: 100,
      mp: 70,
      maxMp: 70,
      str: 10,
      dex: 7,
      int: 10,
      vit: 10,
      def: 9
    }
  }
};

// Calculate stats based on level
function calculateStatsForLevel(baseStats, level) {
  const stats = { ...baseStats };
  const levelMultiplier = 1 + (level - 1) * 0.1; // 10% increase per level
  
  stats.maxHp = Math.floor(baseStats.maxHp * levelMultiplier);
  stats.hp = stats.maxHp; // Full HP on level up
  stats.maxMp = Math.floor(baseStats.maxMp * levelMultiplier);
  stats.mp = stats.maxMp;
  stats.str = Math.floor(baseStats.str * levelMultiplier);
  stats.dex = Math.floor(baseStats.dex * levelMultiplier);
  stats.int = Math.floor(baseStats.int * levelMultiplier);
  stats.vit = Math.floor(baseStats.vit * levelMultiplier);
  stats.def = Math.floor(baseStats.def * levelMultiplier);
  
  return stats;
}

// Calculate XP needed for next level
function getXPForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Initialize accounts.csv if it doesn't exist
if (!fs.existsSync(accountsFile)) {
  const csvWriter = createCsvWriter({
    path: accountsFile,
    header: [
      { id: 'username', title: 'username' },
      { id: 'score', title: 'score' },
      { id: 'respawnX', title: 'respawnX' },
      { id: 'respawnY', title: 'respawnY' },
      { id: 'characterClass', title: 'characterClass' },
      { id: 'level', title: 'level' },
      { id: 'xp', title: 'xp' },
      { id: 'hp', title: 'hp' },
      { id: 'maxHp', title: 'maxHp' },
      { id: 'mp', title: 'mp' },
      { id: 'maxMp', title: 'maxMp' },
      { id: 'str', title: 'str' },
      { id: 'dex', title: 'dex' },
      { id: 'int', title: 'int' },
      { id: 'vit', title: 'vit' },
      { id: 'def', title: 'def' }
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
        const level = parseInt(row.level) || 1;
        const characterClass = row.characterClass || 'warrior';
        const baseStats = CHARACTER_CLASSES[characterClass]?.baseStats || CHARACTER_CLASSES.warrior.baseStats;
        const stats = calculateStatsForLevel(baseStats, level);
        
        accounts.push({
          username: row.username,
          score: parseInt(row.score) || 0,
          respawnX: parseFloat(row.respawnX) || SPAWN_X,
          respawnY: parseFloat(row.respawnY) || SPAWN_Y,
          characterClass: characterClass,
          level: level,
          xp: parseInt(row.xp) || 0,
          hp: parseInt(row.hp) || stats.maxHp,
          maxHp: parseInt(row.maxHp) || stats.maxHp,
          mp: parseInt(row.mp) || stats.maxMp,
          maxMp: parseInt(row.maxMp) || stats.maxMp,
          str: parseInt(row.str) || stats.str,
          dex: parseInt(row.dex) || stats.dex,
          int: parseInt(row.int) || stats.int,
          vit: parseInt(row.vit) || stats.vit,
          def: parseInt(row.def) || stats.def
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
        { id: 'respawnY', title: 'respawnY' },
        { id: 'characterClass', title: 'characterClass' },
        { id: 'level', title: 'level' },
        { id: 'xp', title: 'xp' },
        { id: 'hp', title: 'hp' },
        { id: 'maxHp', title: 'maxHp' },
        { id: 'mp', title: 'mp' },
        { id: 'maxMp', title: 'maxMp' },
        { id: 'str', title: 'str' },
        { id: 'dex', title: 'dex' },
        { id: 'int', title: 'int' },
        { id: 'vit', title: 'vit' },
        { id: 'def', title: 'def' }
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
        respawnY: account.respawnY || SPAWN_Y,
        characterClass: account.characterClass,
        level: account.level,
        xp: account.xp,
        hp: account.hp,
        maxHp: account.maxHp,
        mp: account.mp,
        maxMp: account.maxMp,
        str: account.str,
        dex: account.dex,
        int: account.int,
        vit: account.vit,
        def: account.def
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

    // Add new account with default character (warrior, level 1)
    const defaultClass = 'warrior';
    const baseStats = CHARACTER_CLASSES[defaultClass].baseStats;
    const stats = calculateStatsForLevel(baseStats, 1);
    
    accounts.push({ 
      username, 
      score: 0,
      respawnX: SPAWN_X,
      respawnY: SPAWN_Y,
      characterClass: defaultClass,
      level: 1,
      xp: 0,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      mp: stats.maxMp,
      maxMp: stats.maxMp,
      str: stats.str,
      dex: stats.dex,
      int: stats.int,
      vit: stats.vit,
      def: stats.def
    });
    await writeAccounts(accounts);
    
    res.json({ 
      success: true, 
      username, 
      score: 0,
      respawnX: SPAWN_X,
      respawnY: SPAWN_Y,
      characterClass: defaultClass,
      level: 1,
      xp: 0,
      ...stats
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

// Update character endpoint
app.post('/api/update-character', async (req, res) => {
  const { username, characterData } = req.body;
  
  if (!username || !characterData) {
    return res.status(400).json({ error: 'Username and character data are required' });
  }

  try {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.username === username);
    
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update character stats
    Object.assign(account, characterData);
    await writeAccounts(accounts);
    
    res.json({ success: true, character: account });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get character classes endpoint
app.get('/api/character-classes', (req, res) => {
  const classes = Object.keys(CHARACTER_CLASSES).map(key => ({
    id: key,
    name: CHARACTER_CLASSES[key].name,
    description: CHARACTER_CLASSES[key].description,
    baseStats: CHARACTER_CLASSES[key].baseStats
  }));
  res.json({ classes });
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
        
        // Get character data from account
        let characterData = {};
        try {
          const accounts = await readAccounts();
          const account = accounts.find(acc => acc.username === data.username);
          if (account) {
            characterData = {
              characterClass: account.characterClass,
              level: account.level,
              xp: account.xp,
              hp: account.hp,
              maxHp: account.maxHp,
              mp: account.mp,
              maxMp: account.maxMp,
              str: account.str,
              dex: account.dex,
              int: account.int,
              vit: account.vit,
              def: account.def
            };
          }
        } catch (error) {
          console.error('Error loading character data:', error);
        }
        
        players.set(ws, {
          username: data.username,
          x: spawnX,
          y: spawnY,
          score: data.score || 0,
          ...characterData
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
            
            // Update score and XP on server
            try {
              const accounts = await readAccounts();
              const account = accounts.find(acc => acc.username === player.username);
              if (account) {
                account.score = player.score;
                
                // Give XP for orb collection
                const xpGain = 15;
                account.xp += xpGain;
                
                // Check for level up
                let leveledUp = false;
                while (account.xp >= getXPForLevel(account.level)) {
                  account.xp -= getXPForLevel(account.level);
                  account.level += 1;
                  leveledUp = true;
                  
                  // Recalculate stats for new level
                  const baseStats = CHARACTER_CLASSES[account.characterClass]?.baseStats || CHARACTER_CLASSES.warrior.baseStats;
                  const newStats = calculateStatsForLevel(baseStats, account.level);
                  
                  // Update stats but preserve current HP/MP percentages
                  const hpPercent = account.hp / account.maxHp;
                  const mpPercent = account.mp / account.maxMp;
                  
                  account.maxHp = newStats.maxHp;
                  account.hp = Math.floor(account.maxHp * hpPercent);
                  account.maxMp = newStats.maxMp;
                  account.mp = Math.floor(account.maxMp * mpPercent);
                  account.str = newStats.str;
                  account.dex = newStats.dex;
                  account.int = newStats.int;
                  account.vit = newStats.vit;
                  account.def = newStats.def;
                }
                
                await writeAccounts(accounts);
                
                // Notify player of level up
                if (leveledUp) {
                  ws.send(JSON.stringify({
                    type: 'levelUp',
                    level: account.level,
                    stats: {
                      hp: account.hp,
                      maxHp: account.maxHp,
                      mp: account.mp,
                      maxMp: account.maxMp,
                      str: account.str,
                      dex: account.dex,
                      int: account.int,
                      vit: account.vit,
                      def: account.def
                    }
                  }));
                }
                
                // Send updated character data
                ws.send(JSON.stringify({
                  type: 'characterUpdate',
                  xp: account.xp,
                  xpForNextLevel: getXPForLevel(account.level),
                  level: account.level
                }));
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

