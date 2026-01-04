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
      { id: 'def', title: 'def' },
      { id: 'inventory', title: 'inventory' },
      { id: 'equipment', title: 'equipment' }
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
        
        // Parse inventory and equipment from JSON strings
        let inventory = [];
        let equipment = {};
        try {
          inventory = row.inventory ? JSON.parse(row.inventory) : [];
        } catch (e) {
          inventory = [];
        }
        try {
          equipment = row.equipment ? JSON.parse(row.equipment) : {};
        } catch (e) {
          equipment = {};
        }
        
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
          def: parseInt(row.def) || stats.def,
          inventory: inventory,
          equipment: equipment
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
        { id: 'def', title: 'def' },
        { id: 'inventory', title: 'inventory' },
        { id: 'equipment', title: 'equipment' }
      ]
    });
    
    // Convert inventory and equipment to JSON strings for CSV
    const accountsForCsv = accounts.map(acc => ({
      ...acc,
      inventory: JSON.stringify(acc.inventory || []),
      equipment: JSON.stringify(acc.equipment || {})
    }));
    
    csvWriter.writeRecords(accountsForCsv)
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
      // Calculate effective stats with equipment bonuses
      const equipmentBonuses = calculateEquipmentStats(account.equipment || {});
      const effectiveStats = {
        hp: account.hp,
        maxHp: account.maxHp + Math.floor(equipmentBonuses.maxHp || 0),
        mp: account.mp,
        maxMp: account.maxMp + Math.floor(equipmentBonuses.maxMp || 0),
        str: account.str + Math.floor(equipmentBonuses.str || 0),
        dex: account.dex + Math.floor(equipmentBonuses.dex || 0),
        int: account.int + Math.floor(equipmentBonuses.int || 0),
        vit: account.vit + Math.floor(equipmentBonuses.vit || 0),
        def: account.def + Math.floor(equipmentBonuses.def || 0)
      };
      
      res.json({ 
        success: true, 
        username: account.username, 
        score: account.score,
        respawnX: account.respawnX || SPAWN_X,
        respawnY: account.respawnY || SPAWN_Y,
        characterClass: account.characterClass,
        level: account.level,
        xp: account.xp,
        hp: effectiveStats.hp,
        maxHp: effectiveStats.maxHp,
        mp: effectiveStats.mp,
        maxMp: effectiveStats.maxMp,
        str: effectiveStats.str,
        dex: effectiveStats.dex,
        int: effectiveStats.int,
        vit: effectiveStats.vit,
        def: effectiveStats.def,
        inventory: account.inventory || [],
        equipment: account.equipment || {}
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

// Get all items endpoint (for client to load item database)
app.get('/api/items', (req, res) => {
  res.json({ items: getAllItems() });
});

// Get inventory endpoint
app.get('/api/inventory/:username', async (req, res) => {
  try {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.username === req.params.username);
    
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      inventory: account.inventory || [],
      equipment: account.equipment || {}
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add item to inventory endpoint
app.post('/api/inventory/add', async (req, res) => {
  const { username, itemId, itemType } = req.body;
  
  if (!username || !itemId || !itemType) {
    return res.status(400).json({ error: 'Username, itemId, and itemType are required' });
  }
  
  try {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.username === username);
    
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get item template
    const itemTemplate = getItemById(itemId, itemType);
    if (!itemTemplate) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Generate item instance
    const itemInstance = generateItemInstance(itemTemplate, account.level);
    
    // Add to inventory
    if (!account.inventory) {
      account.inventory = [];
    }
    account.inventory.push(itemInstance);
    
    await writeAccounts(accounts);
    
    res.json({ success: true, item: itemInstance, inventory: account.inventory });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Equip item endpoint
app.post('/api/inventory/equip', async (req, res) => {
  const { username, itemInstanceId, slot } = req.body;
  
  if (!username || !itemInstanceId || !slot) {
    return res.status(400).json({ error: 'Username, itemInstanceId, and slot are required' });
  }
  
  try {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.username === username);
    
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!account.inventory) {
      account.inventory = [];
    }
    if (!account.equipment) {
      account.equipment = {};
    }
    
    // Find item in inventory
    const itemIndex = account.inventory.findIndex(item => item.instanceId === itemInstanceId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in inventory' });
    }
    
    const item = account.inventory[itemIndex];
    
    // Validate slot
    const validSlots = {
      weapon: ['weapon'],
      armor: ['helmet', 'chest', 'legs', 'boots'],
      accessory: ['ring1', 'ring2', 'necklace']
    };
    
    let validSlot = false;
    if (item.type === 'weapon' && slot === 'weapon') validSlot = true;
    if (item.type === 'armor' && item.slot === slot) validSlot = true;
    if (item.type === 'accessory' && (slot === 'ring1' || slot === 'ring2' || slot === 'necklace')) {
      if (item.slot === 'ring' && (slot === 'ring1' || slot === 'ring2')) validSlot = true;
      if (item.slot === 'necklace' && slot === 'necklace') validSlot = true;
    }
    
    if (!validSlot) {
      return res.status(400).json({ error: 'Invalid slot for this item type' });
    }
    
    // If slot is already occupied, unequip first
    if (account.equipment[slot]) {
      account.inventory.push(account.equipment[slot]);
    }
    
    // Equip item
    account.equipment[slot] = item;
    account.inventory.splice(itemIndex, 1);
    
    await writeAccounts(accounts);
    
    res.json({ success: true, equipment: account.equipment, inventory: account.inventory });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Unequip item endpoint
app.post('/api/inventory/unequip', async (req, res) => {
  const { username, slot } = req.body;
  
  if (!username || !slot) {
    return res.status(400).json({ error: 'Username and slot are required' });
  }
  
  try {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.username === username);
    
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!account.equipment || !account.equipment[slot]) {
      return res.status(404).json({ error: 'No item equipped in that slot' });
    }
    
    if (!account.inventory) {
      account.inventory = [];
    }
    
    // Move item from equipment to inventory
    account.inventory.push(account.equipment[slot]);
    delete account.equipment[slot];
    
    await writeAccounts(accounts);
    
    res.json({ success: true, equipment: account.equipment, inventory: account.inventory });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Use consumable endpoint
app.post('/api/inventory/use', async (req, res) => {
  const { username, itemInstanceId } = req.body;
  
  if (!username || !itemInstanceId) {
    return res.status(400).json({ error: 'Username and itemInstanceId are required' });
  }
  
  try {
    const accounts = await readAccounts();
    const account = accounts.find(acc => acc.username === username);
    
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!account.inventory) {
      account.inventory = [];
    }
    
    // Find item in inventory
    const itemIndex = account.inventory.findIndex(item => item.instanceId === itemInstanceId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in inventory' });
    }
    
    const item = account.inventory[itemIndex];
    
    if (item.type !== 'consumable') {
      return res.status(400).json({ error: 'Item is not a consumable' });
    }
    
    // Apply consumable effects
    const effects = item.effect || {};
    let effectsApplied = {};
    
    if (effects.hp) {
      account.hp = Math.min(account.maxHp, account.hp + effects.hp);
      effectsApplied.hp = effects.hp;
    }
    if (effects.mp) {
      account.mp = Math.min(account.maxMp, account.mp + effects.mp);
      effectsApplied.mp = effects.mp;
    }
    if (effects.xp) {
      account.xp += effects.xp;
      effectsApplied.xp = effects.xp;
    }
    if (effects.revive && account.hp <= 0) {
      account.hp = account.maxHp;
      effectsApplied.revive = true;
    }
    
    // Remove item from inventory (consumables are single-use)
    account.inventory.splice(itemIndex, 1);
    
    await writeAccounts(accounts);
    
    res.json({ 
      success: true, 
      effects: effectsApplied,
      inventory: account.inventory,
      hp: account.hp,
      mp: account.mp,
      xp: account.xp
    });
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

// Load biomes from JSON file
let ZONES = [];
try {
  const biomesPath = path.join(__dirname, 'biomes.json');
  const biomesData = fs.readFileSync(biomesPath, 'utf8');
  const biomes = JSON.parse(biomesData);
  ZONES = biomes.zones || [];
  console.log(`Loaded ${ZONES.length} biomes from biomes.json`);
} catch (error) {
  console.error('Error loading biomes.json:', error);
  console.log('Using default empty zones array');
  ZONES = [];
}

// Load item databases from JSON files
let ITEM_DATABASE = {
  weapons: [],
  armor: [],
  consumables: [],
  accessories: []
};

try {
  const weaponsPath = path.join(dataDir, 'weapons.json');
  const weaponsData = fs.readFileSync(weaponsPath, 'utf8');
  const weapons = JSON.parse(weaponsData);
  ITEM_DATABASE.weapons = weapons.weapons || [];
  console.log(`Loaded ${ITEM_DATABASE.weapons.length} weapons`);
} catch (error) {
  console.error('Error loading weapons.json:', error);
}

try {
  const armorPath = path.join(dataDir, 'armor.json');
  const armorData = fs.readFileSync(armorPath, 'utf8');
  const armor = JSON.parse(armorData);
  ITEM_DATABASE.armor = armor.armor || [];
  console.log(`Loaded ${ITEM_DATABASE.armor.length} armor pieces`);
} catch (error) {
  console.error('Error loading armor.json:', error);
}

try {
  const consumablesPath = path.join(dataDir, 'consumables.json');
  const consumablesData = fs.readFileSync(consumablesPath, 'utf8');
  const consumables = JSON.parse(consumablesData);
  ITEM_DATABASE.consumables = consumables.consumables || [];
  console.log(`Loaded ${ITEM_DATABASE.consumables.length} consumables`);
} catch (error) {
  console.error('Error loading consumables.json:', error);
}

try {
  const accessoriesPath = path.join(dataDir, 'accessories.json');
  const accessoriesData = fs.readFileSync(accessoriesPath, 'utf8');
  const accessories = JSON.parse(accessoriesData);
  ITEM_DATABASE.accessories = accessories.accessories || [];
  console.log(`Loaded ${ITEM_DATABASE.accessories.length} accessories`);
} catch (error) {
  console.error('Error loading accessories.json:', error);
}

// Item helper functions
function getItemById(itemId, itemType) {
  const items = ITEM_DATABASE[itemType] || [];
  return items.find(item => item.id === itemId);
}

function getAllItems() {
  return {
    weapons: ITEM_DATABASE.weapons,
    armor: ITEM_DATABASE.armor,
    consumables: ITEM_DATABASE.consumables,
    accessories: ITEM_DATABASE.accessories
  };
}

// Generate a random item instance from a template
function generateItemInstance(template, level = null) {
  const item = JSON.parse(JSON.stringify(template)); // Deep copy
  
  // Generate random stats within ranges
  if (item.baseStats) {
    item.stats = {};
    for (const [stat, range] of Object.entries(item.baseStats)) {
      if (Array.isArray(range) && range.length === 2) {
        item.stats[stat] = Math.random() * (range[1] - range[0]) + range[0];
        // Round damage and integer stats
        if (stat === 'damage' || stat === 'str' || stat === 'dex' || stat === 'int' || stat === 'vit' || stat === 'def' || stat === 'maxHp') {
          item.stats[stat] = Math.floor(item.stats[stat]);
        }
      }
    }
  }
  
  // Generate random stat ranges
  if (item.statRanges) {
    item.generatedStats = {};
    for (const [stat, range] of Object.entries(item.statRanges)) {
      if (Array.isArray(range) && range.length === 2) {
        item.generatedStats[stat] = Math.random() * (range[1] - range[0]) + range[0];
      }
    }
  }
  
  // Generate random value if it's a range
  if (Array.isArray(item.value) && item.value.length === 2) {
    item.value = Math.floor(Math.random() * (item.value[1] - item.value[0]) + item.value[0]);
  }
  
  // Generate unique ID for this instance
  item.instanceId = `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return item;
}

// Calculate equipment stat bonuses
function calculateEquipmentStats(equipment) {
  const bonuses = {
    damage: 0,
    str: 0,
    dex: 0,
    int: 0,
    vit: 0,
    def: 0,
    maxHp: 0,
    maxMp: 0,
    mp: 0,
    attackRange: 0
  };
  
  for (const slot in equipment) {
    const item = equipment[slot];
    if (item && item.stats) {
      for (const [stat, value] of Object.entries(item.stats)) {
        if (bonuses.hasOwnProperty(stat)) {
          bonuses[stat] += value;
        }
      }
    }
    
    // Add attack range from weapon
    if (slot === 'weapon' && item && item.attackRange) {
      const range = Array.isArray(item.attackRange) 
        ? Math.random() * (item.attackRange[1] - item.attackRange[0]) + item.attackRange[0]
        : item.attackRange;
      bonuses.attackRange = Math.floor(range);
    }
  }
  
  return bonuses;
}

// Generate loot drop from enemy
function generateLootDrop(enemyLevel) {
  const drops = [];
  
  // 30% chance for weapon drop
  if (Math.random() < 0.3) {
    const weapons = ITEM_DATABASE.weapons.filter(w => w.level <= enemyLevel + 2);
    if (weapons.length > 0) {
      const weapon = weapons[Math.floor(Math.random() * weapons.length)];
      drops.push({ item: generateItemInstance(weapon, enemyLevel), type: 'weapon' });
    }
  }
  
  // 30% chance for armor drop
  if (Math.random() < 0.3) {
    const armor = ITEM_DATABASE.armor.filter(a => a.level <= enemyLevel + 2);
    if (armor.length > 0) {
      const armorPiece = armor[Math.floor(Math.random() * armor.length)];
      drops.push({ item: generateItemInstance(armorPiece, enemyLevel), type: 'armor' });
    }
  }
  
  // 20% chance for accessory drop
  if (Math.random() < 0.2) {
    const accessories = ITEM_DATABASE.accessories.filter(a => a.level <= enemyLevel + 2);
    if (accessories.length > 0) {
      const accessory = accessories[Math.floor(Math.random() * accessories.length)];
      drops.push({ item: generateItemInstance(accessory, enemyLevel), type: 'accessory' });
    }
  }
  
  // 40% chance for consumable drop
  if (Math.random() < 0.4) {
    const consumables = ITEM_DATABASE.consumables.filter(c => c.level <= enemyLevel + 2);
    if (consumables.length > 0) {
      const consumable = consumables[Math.floor(Math.random() * consumables.length)];
      drops.push({ item: generateItemInstance(consumable, enemyLevel), type: 'consumable' });
    }
  }
  
  return drops;
}

// Base enemy templates (scaled by level)
const ENEMY_TEMPLATES = {
  // Central Plains - Low level enemies
  forest_sprite: {
    name: 'Forest Sprite',
    baseLevel: 1,
    baseHp: 50,
    baseDamage: 8,
    baseDefense: 1,
    baseXp: 15,
    baseGold: 3,
    speed: 2.0,
    attackRange: 35,
    color: [100, 200, 100],
    zones: ['central_wilderness']
  },
  wild_boar: {
    name: 'Wild Boar',
    baseLevel: 2,
    baseHp: 90,
    baseDamage: 14,
    baseDefense: 2,
    baseXp: 25,
    baseGold: 5,
    speed: 1.8,
    attackRange: 40,
    color: [150, 100, 80],
    zones: ['central_wilderness']
  },
  
  // Northwood (Forest) - Mid level enemies
  treant: {
    name: 'Treant',
    baseLevel: 5,
    baseHp: 200,
    baseDamage: 30,
    baseDefense: 8,
    baseXp: 60,
    baseGold: 12,
    speed: 0.8,
    attackRange: 50,
    color: [50, 150, 50],
    zones: ['north_town', 'north_south_road_west', 'east_west_road_north']
  },
  forest_wolf: {
    name: 'Forest Wolf',
    baseLevel: 4,
    baseHp: 130,
    baseDamage: 24,
    baseDefense: 4,
    baseXp: 45,
    baseGold: 9,
    speed: 2.2,
    attackRange: 38,
    color: [80, 120, 80],
    zones: ['north_town', 'north_south_road_west', 'east_west_road_north']
  },
  
  // Sandhaven (Desert) - Mid-High level enemies
  desert_scorpion: {
    name: 'Desert Scorpion',
    baseLevel: 7,
    baseHp: 150,
    baseDamage: 36,
    baseDefense: 6,
    baseXp: 80,
    baseGold: 15,
    speed: 1.5,
    attackRange: 35,
    color: [180, 150, 100],
    zones: ['south_town', 'north_south_road_east', 'east_west_road_south']
  },
  sand_elemental: {
    name: 'Sand Elemental',
    baseLevel: 8,
    baseHp: 250,
    baseDamage: 44,
    baseDefense: 10,
    baseXp: 100,
    baseGold: 18,
    speed: 1.0,
    attackRange: 45,
    color: [200, 180, 120],
    zones: ['south_town', 'north_south_road_east', 'east_west_road_south']
  },
  
  // Seabreeze (Coastal) - Mid level enemies
  sea_serpent: {
    name: 'Sea Serpent',
    baseLevel: 6,
    baseHp: 180,
    baseDamage: 32,
    baseDefense: 7,
    baseXp: 70,
    baseGold: 13,
    speed: 1.6,
    attackRange: 42,
    color: [80, 120, 200],
    zones: ['east_town', 'north_south_road_east', 'east_west_road_north']
  },
  kraken_spawn: {
    name: 'Kraken Spawn',
    baseLevel: 5,
    baseHp: 140,
    baseDamage: 28,
    baseDefense: 5,
    baseXp: 55,
    baseGold: 11,
    speed: 1.4,
    attackRange: 40,
    color: [60, 100, 180],
    zones: ['east_town', 'north_south_road_east', 'east_west_road_north']
  },
  
  // Frosthold (Snow) - High level enemies
  ice_troll: {
    name: 'Ice Troll',
    baseLevel: 10,
    baseHp: 350,
    baseDamage: 56,
    baseDefense: 12,
    baseXp: 130,
    baseGold: 22,
    speed: 1.2,
    attackRange: 48,
    color: [150, 180, 200],
    zones: ['west_town', 'north_south_road_west', 'east_west_road_south']
  },
  frost_wraith: {
    name: 'Frost Wraith',
    baseLevel: 9,
    baseHp: 240,
    baseDamage: 50,
    baseDefense: 11,
    baseXp: 110,
    baseGold: 20,
    speed: 1.8,
    attackRange: 44,
    color: [200, 220, 240],
    zones: ['west_town', 'north_south_road_west', 'east_west_road_south']
  }
};

// Calculate enemy stats based on level
function calculateEnemyStats(template, level) {
  const levelMultiplier = 1 + (level - template.baseLevel) * 0.15; // 15% per level above base
  const levelDiff = Math.max(0, level - template.baseLevel);
  
  return {
    name: template.name,
    level: level,
    hp: Math.floor(template.baseHp * levelMultiplier),
    maxHp: Math.floor(template.baseHp * levelMultiplier),
    damage: Math.floor(template.baseDamage * levelMultiplier),
    defense: Math.floor(template.baseDefense * levelMultiplier),
    // XP scales with level difference - higher level mobs give more XP
    baseXp: template.baseXp,
    baseGold: template.baseGold,
    speed: template.speed,
    attackRange: template.attackRange,
    color: template.color,
    zones: template.zones
  };
}

// Calculate XP reward based on mob level vs player level
function calculateXPReward(mobLevel, playerLevel, baseXp) {
  const levelDiff = mobLevel - playerLevel;
  
  // Base XP from mob
  let xp = baseXp;
  
  // Bonus for killing higher level mobs
  if (levelDiff > 0) {
    xp = Math.floor(baseXp * (1 + levelDiff * 0.25)); // 25% bonus per level above player
  }
  // Penalty for killing lower level mobs
  else if (levelDiff < 0) {
    xp = Math.floor(baseXp * Math.max(0.1, 1 + levelDiff * 0.15)); // 15% penalty per level below, minimum 10%
  }
  
  return Math.max(1, xp); // Minimum 1 XP
}

// Store connected players
const players = new Map();
const enemies = new Map(); // Map of enemy ID to enemy object
let nextEnemyId = 0;

spawnEnemies();

// Get zone at coordinates
function getZoneAt(x, y) {
  for (let zone of ZONES) {
    if (x >= zone.x && x <= zone.x + zone.width &&
        y >= zone.y && y <= zone.y + zone.height) {
      return zone;
    }
  }
  return null;
}

// Get enemies that can spawn in a zone
function getEnemiesForZone(zoneId) {
  const availableEnemies = [];
  
  Object.keys(ENEMY_TEMPLATES).forEach(key => {
    const template = ENEMY_TEMPLATES[key];
    if (template.zones.includes(zoneId)) {
      availableEnemies.push({ key, template });
    }
  });
  
  return availableEnemies;
}

// Spawn enemies in the world - zone-based
function spawnEnemies() {
  const enemiesPerZone = 50; // Enemies per zone (increased for more mobs)
  
  // Spawn enemies in each zone
  ZONES.forEach(zone => {
    if (zone.type === 'town') return; // Don't spawn in towns
    
    const zoneEnemies = getEnemiesForZone(zone.id);
    if (zoneEnemies.length === 0) return;
    
    for (let i = 0; i < enemiesPerZone; i++) {
      // Random enemy type for this zone
      const randomEnemy = zoneEnemies[Math.floor(Math.random() * zoneEnemies.length)];
      
      // Random level variation (base level ± 2)
      const levelVariation = Math.floor(Math.random() * 5) - 2; // -2 to +2
      const enemyLevel = Math.max(1, randomEnemy.template.baseLevel + levelVariation);
      
      // Calculate stats for this level
      const enemyStats = calculateEnemyStats(randomEnemy.template, enemyLevel);
      
      // Random position within zone
      const x = zone.x + Math.random() * zone.width;
      const y = zone.y + Math.random() * zone.height;
      
      const enemyId = nextEnemyId++;
      enemies.set(enemyId, {
        id: enemyId,
        type: randomEnemy.key,
        name: enemyStats.name,
        level: enemyStats.level,
        x: x,
        y: y,
        hp: enemyStats.hp,
        maxHp: enemyStats.maxHp,
        damage: enemyStats.damage,
        defense: enemyStats.defense,
        baseXp: enemyStats.baseXp,
        baseGold: enemyStats.baseGold,
        speed: enemyStats.speed,
        attackRange: enemyStats.attackRange,
        color: enemyStats.color,
        target: null,
        lastAttack: 0,
        attackCooldown: 600 // 0.6 seconds (faster attacks)
      });
    }
  });
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
            // Calculate effective stats with equipment bonuses
            const equipmentBonuses = calculateEquipmentStats(account.equipment || {});
            const effectiveStats = {
              maxHp: account.maxHp + Math.floor(equipmentBonuses.maxHp || 0),
              maxMp: account.maxMp + Math.floor(equipmentBonuses.maxMp || 0),
              str: account.str + Math.floor(equipmentBonuses.str || 0),
              dex: account.dex + Math.floor(equipmentBonuses.dex || 0),
              int: account.int + Math.floor(equipmentBonuses.int || 0),
              vit: account.vit + Math.floor(equipmentBonuses.vit || 0),
              def: account.def + Math.floor(equipmentBonuses.def || 0),
              damage: Math.floor(equipmentBonuses.damage || 0)
            };
            
            characterData = {
              characterClass: account.characterClass,
              level: account.level,
              xp: account.xp,
              hp: account.hp,
              maxHp: effectiveStats.maxHp,
              mp: account.mp,
              maxMp: effectiveStats.maxMp,
              str: effectiveStats.str,
              dex: effectiveStats.dex,
              int: effectiveStats.int,
              vit: effectiveStats.vit,
              def: effectiveStats.def,
              damage: effectiveStats.damage
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
      
      if (data.type === 'chat') {
        const player = players.get(ws);
        if (!player) return;
        
        const message = data.message.trim();
        if (!message || message.length > 500) return; // Limit message length
        
        if (data.channel === 'global') {
          // Broadcast to all players
          broadcast({
            type: 'chatMessage',
            channel: 'global',
            sender: player.username,
            message: message
          });
        } else if (data.channel === 'local') {
          // Broadcast to nearby players (within 1000 units)
          const nearbyPlayers = Array.from(players.entries()).filter(([ws2, p]) => {
            if (ws2 === ws) return false; // Don't send to sender
            const distance = Math.sqrt(
              Math.pow(p.x - player.x, 2) + Math.pow(p.y - player.y, 2)
            );
            return distance <= 1000;
          });
          
          // Send to sender (echo)
          ws.send(JSON.stringify({
            type: 'chatMessage',
            channel: 'local',
            sender: player.username,
            message: message
          }));
          
          // Send to nearby players
          nearbyPlayers.forEach(([ws2]) => {
            if (ws2.readyState === WebSocket.OPEN) {
              ws2.send(JSON.stringify({
                type: 'chatMessage',
                channel: 'local',
                sender: player.username,
                message: message
              }));
            }
          });
        } else if (data.channel === 'whisper') {
          // Send to specific target player
          const targetUsername = data.target;
          let targetWs = null;
          
          players.forEach((p, ws2) => {
            if (p.username === targetUsername) {
              targetWs = ws2;
            }
          });
          
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            // Send to target
            targetWs.send(JSON.stringify({
              type: 'chatMessage',
              channel: 'whisper',
              sender: player.username,
              message: message,
              target: targetUsername
            }));
            
            // Echo to sender
            ws.send(JSON.stringify({
              type: 'chatMessage',
              channel: 'whisper',
              sender: player.username,
              message: message,
              target: targetUsername
            }));
          } else {
            // Target not found
            ws.send(JSON.stringify({
              type: 'chatMessage',
              channel: 'system',
              sender: 'System',
              message: `Player "${targetUsername}" is not online or not found.`
            }));
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
                // Give XP and rewards based on level difference
                try {
                  const accounts = await readAccounts();
                  const account = accounts.find(acc => acc.username === player.username);
                  if (account) {
                    // Calculate XP based on mob level vs player level
                    const xpReward = calculateXPReward(enemy.level, account.level, enemy.baseXp);
                    account.xp += xpReward;
                    account.score += enemy.baseGold;
                    
                    // Generate loot drops
                    const lootDrops = generateLootDrop(enemy.level);
                    if (lootDrops.length > 0) {
                      if (!account.inventory) {
                        account.inventory = [];
                      }
                      lootDrops.forEach(drop => {
                        account.inventory.push(drop.item);
                      });
                    }
                    
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
                    
                    // Broadcast enemy death with calculated XP and loot
                    broadcast({
                      type: 'enemyKilled',
                      enemyId: enemy.id,
                      xpReward: xpReward,
                      goldReward: enemy.baseGold,
                      killer: player.username,
                      loot: lootDrops.map(drop => drop.item)
                    });
                  }
                } catch (error) {
                  console.error('Error updating account:', error);
                }
                
                // Respawn enemy after delay in same zone
                setTimeout(() => {
                  const zone = getZoneAt(enemy.x, enemy.y);
                  if (zone && zone.type !== 'town') {
                    const zoneEnemies = getEnemiesForZone(zone.id);
                    if (zoneEnemies.length > 0) {
                      const randomEnemy = zoneEnemies[Math.floor(Math.random() * zoneEnemies.length)];
                      const levelVariation = Math.floor(Math.random() * 5) - 2;
                      const enemyLevel = Math.max(1, randomEnemy.template.baseLevel + levelVariation);
                      const enemyStats = calculateEnemyStats(randomEnemy.template, enemyLevel);
                      
                      // Respawn in same zone
                      const x = zone.x + Math.random() * zone.width;
                      const y = zone.y + Math.random() * zone.height;
                      
                      enemy.type = randomEnemy.key;
                      enemy.name = enemyStats.name;
                      enemy.level = enemyLevel;
                      enemy.x = x;
                      enemy.y = y;
                      enemy.hp = enemyStats.hp;
                      enemy.maxHp = enemyStats.maxHp;
                      enemy.damage = enemyStats.damage;
                      enemy.defense = enemyStats.defense;
                      enemy.baseXp = enemyStats.baseXp;
                      enemy.baseGold = enemyStats.baseGold;
                      enemy.speed = enemyStats.speed;
                      enemy.attackRange = enemyStats.attackRange;
                      enemy.color = enemyStats.color;
                      enemy.target = null;
                      
                      broadcast({
                        type: 'enemyRespawn',
                        enemy: enemy
                      });
                    }
                  }
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
      
      if (distance < 500 && distance < nearestDistance) { // Aggro range (increased for more aggression)
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

