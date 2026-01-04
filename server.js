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

    // Add new account without character (character will be created via character creation)
    // Set temporary defaults that will be overwritten
    accounts.push({ 
      username, 
      score: 0,
      respawnX: SPAWN_X,
      respawnY: SPAWN_Y,
      characterClass: 'warrior', // Temporary, will be updated
      level: 1,
      xp: 0,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      str: 10,
      dex: 10,
      int: 10,
      vit: 10,
      def: 10
    });
    await writeAccounts(accounts);
    
    res.json({ 
      success: true, 
      username, 
      score: 0,
      respawnX: SPAWN_X,
      respawnY: SPAWN_Y
      // Character data will be set via character creation
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

// Enemy types
const ENEMY_TYPES = {
  goblin: {
    name: 'Goblin',
    level: 1,
    hp: 50,
    maxHp: 50,
    damage: 5,
    defense: 2,
    xpReward: 25,
    goldReward: 5,
    speed: 1.5,
    attackRange: 40,
    color: [100, 150, 100]
  },
  orc: {
    name: 'Orc',
    level: 3,
    hp: 120,
    maxHp: 120,
    damage: 12,
    defense: 5,
    xpReward: 50,
    goldReward: 10,
    speed: 1.2,
    attackRange: 45,
    color: [150, 100, 100]
  },
  skeleton: {
    name: 'Skeleton',
    level: 2,
    hp: 80,
    maxHp: 80,
    damage: 8,
    defense: 3,
    xpReward: 35,
    goldReward: 7,
    speed: 1.8,
    attackRange: 40,
    color: [200, 200, 200]
  },
  wolf: {
    name: 'Wolf',
    level: 1,
    hp: 40,
    maxHp: 40,
    damage: 6,
    defense: 1,
    xpReward: 20,
    goldReward: 4,
    speed: 2.5,
    attackRange: 35,
    color: [100, 100, 150]
  }
};

// Store connected players
const players = new Map();
const orbs = [];
const enemies = new Map(); // Map of enemy ID to enemy object
let nextEnemyId = 0;

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
spawnEnemies();

// Spawn enemies in the world
function spawnEnemies() {
  const enemyCount = 100; // Total enemies in the world
  
  for (let i = 0; i < enemyCount; i++) {
    const enemyTypes = Object.keys(ENEMY_TYPES);
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const enemyType = ENEMY_TYPES[randomType];
    
    // Spawn in wilderness areas (not in towns)
    let x, y;
    do {
      x = Math.random() * WORLD_WIDTH;
      y = Math.random() * WORLD_HEIGHT;
    } while (isInTown(x, y));
    
    const enemyId = nextEnemyId++;
    enemies.set(enemyId, {
      id: enemyId,
      type: randomType,
      name: enemyType.name,
      x: x,
      y: y,
      hp: enemyType.maxHp,
      maxHp: enemyType.maxHp,
      damage: enemyType.damage,
      defense: enemyType.defense,
      xpReward: enemyType.xpReward,
      goldReward: enemyType.goldReward,
      speed: enemyType.speed,
      attackRange: enemyType.attackRange,
      color: enemyType.color,
      target: null,
      lastAttack: 0,
      attackCooldown: 1000 // 1 second
    });
  }
}

// Check if coordinates are in a town
function isInTown(x, y) {
  for (let zone of ZONES) {
    if (zone.type === 'town' && 
        x >= zone.x && x <= zone.x + zone.width &&
        y >= zone.y && y <= zone.y + zone.height) {
      return true;
    }
  }
  return false;
}

// Calculate damage
function calculateDamage(attacker, defender) {
  let baseDamage = attacker.damage || attacker.str || 10;
  let defense = defender.defense || defender.def || 0;
  
  // Damage = base damage - defense (minimum 1)
  let damage = Math.max(1, baseDamage - defense);
  
  // Add some randomness (80-120% of base damage)
  damage = Math.floor(damage * (0.8 + Math.random() * 0.4));
  
  return damage;
}

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
          enemies: Array.from(enemies.values()),
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
      
      if (data.type === 'attackEnemy') {
        const player = players.get(ws);
        if (player) {
          const enemy = enemies.get(data.enemyId);
          if (enemy && enemy.hp > 0) {
            // Check if player is in range
            const distance = Math.sqrt(
              Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2)
            );
            
            if (distance < 50) { // Attack range
              // Calculate damage
              const damage = calculateDamage(player, enemy);
              enemy.hp -= damage;
              
              // Broadcast damage
              broadcast({
                type: 'enemyDamaged',
                enemyId: enemy.id,
                damage: damage,
                hp: enemy.hp,
                maxHp: enemy.maxHp,
                attacker: player.username
              });
              
              // Check if enemy is dead
              if (enemy.hp <= 0) {
                // Give XP and rewards
                try {
                  const accounts = await readAccounts();
                  const account = accounts.find(acc => acc.username === player.username);
                  if (account) {
                    account.xp += enemy.xpReward;
                    account.score += enemy.goldReward;
                    
                    // Check for level up
                    let leveledUp = false;
                    while (account.xp >= getXPForLevel(account.level)) {
                      account.xp -= getXPForLevel(account.level);
                      account.level += 1;
                      leveledUp = true;
                      
                      const baseStats = CHARACTER_CLASSES[account.characterClass]?.baseStats || CHARACTER_CLASSES.warrior.baseStats;
                      const newStats = calculateStatsForLevel(baseStats, account.level);
                      
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
                    
                    // Update player object
                    player.score = account.score;
                    player.xp = account.xp;
                    player.level = account.level;
                    
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
                    
                    ws.send(JSON.stringify({
                      type: 'characterUpdate',
                      xp: account.xp,
                      xpForNextLevel: getXPForLevel(account.level),
                      level: account.level
                    }));
                  }
                } catch (error) {
                  console.error('Error updating account:', error);
                }
                
                // Broadcast enemy death
                broadcast({
                  type: 'enemyKilled',
                  enemyId: enemy.id,
                  xpReward: enemy.xpReward,
                  goldReward: enemy.goldReward,
                  killer: player.username
                });
                
                // Respawn enemy after delay
                setTimeout(() => {
                  const enemyTypes = Object.keys(ENEMY_TYPES);
                  const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                  const enemyType = ENEMY_TYPES[randomType];
                  
                  let x, y;
                  do {
                    x = Math.random() * WORLD_WIDTH;
                    y = Math.random() * WORLD_HEIGHT;
                  } while (isInTown(x, y));
                  
                  enemy.type = randomType;
                  enemy.name = enemyType.name;
                  enemy.x = x;
                  enemy.y = y;
                  enemy.hp = enemyType.maxHp;
                  enemy.maxHp = enemyType.maxHp;
                  enemy.damage = enemyType.damage;
                  enemy.defense = enemyType.defense;
                  enemy.xpReward = enemyType.xpReward;
                  enemy.goldReward = enemyType.goldReward;
                  enemy.speed = enemyType.speed;
                  enemy.attackRange = enemyType.attackRange;
                  enemy.color = enemyType.color;
                  enemy.target = null;
                  
                  broadcast({
                    type: 'enemyRespawn',
                    enemy: enemy
                  });
                }, 10000); // Respawn after 10 seconds
              }
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

// Game tick - update enemy AI and combat
setInterval(() => {
  const now = Date.now();
  const allPlayers = Array.from(players.values());
  
  enemies.forEach((enemy, enemyId) => {
    if (enemy.hp <= 0) return; // Skip dead enemies
    
    // Find nearest player
    let nearestPlayer = null;
    let nearestDistance = Infinity;
    
    allPlayers.forEach(player => {
      if (player.hp <= 0) return; // Skip dead players
      
      const distance = Math.sqrt(
        Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)
      );
      
      if (distance < 300 && distance < nearestDistance) { // Aggro range
        nearestDistance = distance;
        nearestPlayer = player;
      }
    });
    
    if (nearestPlayer) {
      enemy.target = nearestPlayer.username;
      
      // Move towards player
      const dx = nearestPlayer.x - enemy.x;
      const dy = nearestPlayer.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > enemy.attackRange) {
        // Move towards player
        const moveSpeed = enemy.speed;
        enemy.x += (dx / distance) * moveSpeed;
        enemy.y += (dy / distance) * moveSpeed;
        
        // Broadcast enemy movement
        broadcast({
          type: 'enemyMove',
          enemyId: enemy.id,
          x: enemy.x,
          y: enemy.y
        });
      } else {
        // Attack player if in range
        if (now - enemy.lastAttack >= enemy.attackCooldown) {
          const damage = calculateDamage(enemy, nearestPlayer);
          nearestPlayer.hp = Math.max(0, nearestPlayer.hp - damage);
          enemy.lastAttack = now;
          
          // Find player's WebSocket
          let playerWs = null;
          players.forEach((p, ws) => {
            if (p.username === nearestPlayer.username) {
              playerWs = ws;
            }
          });
          
          if (playerWs) {
            // Send damage to player
            playerWs.send(JSON.stringify({
              type: 'playerDamaged',
              damage: damage,
              hp: nearestPlayer.hp,
              maxHp: nearestPlayer.maxHp,
              attacker: enemy.name
            }));
            
            // Check if player is dead
            if (nearestPlayer.hp <= 0) {
              // Respawn player at respawn point
              (async () => {
                try {
                  const accounts = await readAccounts();
                  const account = accounts.find(acc => acc.username === nearestPlayer.username);
                  if (account) {
                    nearestPlayer.x = account.respawnX || SPAWN_X;
                    nearestPlayer.y = account.respawnY || SPAWN_Y;
                    nearestPlayer.hp = nearestPlayer.maxHp;
                    nearestPlayer.mp = nearestPlayer.maxMp;
                    
                    playerWs.send(JSON.stringify({
                      type: 'playerDeath',
                      respawnX: nearestPlayer.x,
                      respawnY: nearestPlayer.y
                    }));
                    
                    broadcast({
                      type: 'playerRespawn',
                      username: nearestPlayer.username,
                      x: nearestPlayer.x,
                      y: nearestPlayer.y
                    });
                  }
                } catch (error) {
                  console.error('Error handling player death:', error);
                }
              })();
            }
          }
        }
      }
    } else {
      enemy.target = null;
    }
  });
}, 100); // Update every 100ms

