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


// Skill definitions (same as client)
const CLASS_SKILLS = {
  warrior: {
    charge: { mpCost: 20, cooldown: 4000, range: 120, damageMultiplier: 2.5 },
    whirlwind: { mpCost: 30, cooldown: 6000, range: 80, damageMultiplier: 1.8 },
    taunt: { mpCost: 15, cooldown: 8000, range: 100, defenseBonus: 10, duration: 5000 }
  },
  mage: {
    fireball: { mpCost: 25, cooldown: 2500, range: 180, damageMultiplier: 3.0 },
    ice_bolt: { mpCost: 20, cooldown: 3000, range: 150, damageMultiplier: 2.2, slowAmount: 0.3 },
    shield: { mpCost: 40, cooldown: 12000, duration: 8000, damageReduction: 0.75 }
  },
  rogue: {
    dash: { mpCost: 15, cooldown: 3000, range: 100, invincibilityDuration: 500 },
    backstab: { mpCost: 25, cooldown: 5000, range: 50, damageMultiplier: 4.0 },
    poison: { mpCost: 20, cooldown: 4000, range: 60, damageMultiplier: 1.5, dotDamage: 10, dotDuration: 8000 }
  },
  paladin: {
    heal: { mpCost: 30, cooldown: 6000, healAmount: 100 },
    smite: { mpCost: 25, cooldown: 4000, range: 90, damageMultiplier: 3.0 },
    aura: { mpCost: 35, cooldown: 10000, range: 120, defenseBonus: 15, hpRegenBonus: 2, duration: 10000 }
  }
};

// Track player skill cooldowns
const playerSkillCooldowns = new Map(); // Map<ws, Map<skillId, cooldown>>

// Track player active effects
const playerEffects = new Map(); // Map<ws, {shield: {active, timer}, aura: {active, timer}, poison: {...}}>

// Calculate damage with improved mechanics
function calculateDamage(attacker, defender, skillMultiplier = 1.0) {
  // Base damage calculation - use STR for physical, INT for magical
  const isPhysical = attacker.characterClass !== 'mage';
  const baseStat = isPhysical ? (attacker.str || 10) : (attacker.int || 10);
  let baseDamage = attacker.damage || baseStat;
  
  // Apply skill multiplier
  baseDamage *= skillMultiplier;
  
  // Defense calculation - reduces damage by percentage
  const defense = defender.defense || defender.def || 0;
  const defenseReduction = defense / (defense + 100); // Diminishing returns
  
  // Calculate damage after defense
  let damage = baseDamage * (1 - defenseReduction);
  
  // Critical hit chance based on DEX
  const critChance = (attacker.dex || 10) / 200; // 5% base at 10 DEX, scales up
  const isCrit = Math.random() < critChance;
  
  if (isCrit) {
    damage *= 2.0; // Critical hits do 2x damage
  }
  
  // Add randomness (85-115% of calculated damage)
  damage = Math.floor(damage * (0.85 + Math.random() * 0.3));
  
  // Minimum damage of 1
  damage = Math.max(1, damage);
  
  return { damage, isCrit };
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
            // Get attack range from weapon or default
            const attackRange = player.attackRange || 50;
            
            // Check if player is in range
            const distance = Math.sqrt(
              Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2)
            );
            
            if (distance < attackRange) {
              // Calculate damage
              const result = calculateDamage(player, enemy);
              enemy.hp -= result.damage;
              
              // Broadcast damage
              broadcast({
                type: 'enemyDamaged',
                enemyId: enemy.id,
                damage: result.damage,
                isCrit: result.isCrit,
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
      
      if (data.type === 'useSkill') {
        const player = players.get(ws);
        if (!player) return;
        
        const skillId = data.skillId;
        const playerClass = player.characterClass || 'warrior';
        const classSkills = CLASS_SKILLS[playerClass];
        
        if (!classSkills || !classSkills[skillId]) {
          ws.send(JSON.stringify({
            type: 'skillError',
            message: 'Invalid skill for your class'
          }));
          return;
        }
        
        const skill = classSkills[skillId];
        const now = Date.now();
        
        // Initialize cooldown tracking
        if (!playerSkillCooldowns.has(ws)) {
          playerSkillCooldowns.set(ws, new Map());
        }
        const cooldowns = playerSkillCooldowns.get(ws);
        
        // Check cooldown
        if (cooldowns.has(skillId)) {
          const lastUsed = cooldowns.get(skillId);
          if (now - lastUsed < skill.cooldown) {
            ws.send(JSON.stringify({
              type: 'skillError',
              message: 'Skill is on cooldown'
            }));
            return;
          }
        }
        
        // Check MP
        if (player.mp < skill.mpCost) {
          ws.send(JSON.stringify({
            type: 'skillError',
            message: 'Not enough MP'
          }));
          return;
        }
        
        // Consume MP
        player.mp = Math.max(0, player.mp - skill.mpCost);
        cooldowns.set(skillId, now);
        
        // Handle different skills
        if (skillId === 'charge') {
          // Charge: dash forward and damage first enemy
          // Find nearest enemy to charge towards (within charge range)
          let targetEnemy = null;
          let nearestDist = skill.range * 1.5; // Look for enemies slightly beyond range
          
          enemies.forEach((enemy, enemyId) => {
            if (enemy.hp <= 0) return;
            const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
            if (dist < nearestDist) {
              nearestDist = dist;
              targetEnemy = enemy;
            }
          });
          
          // Determine charge direction
          let targetX, targetY;
          if (targetEnemy) {
            // Charge towards the nearest enemy
            targetX = targetEnemy.x;
            targetY = targetEnemy.y;
          } else if (data.targetX && data.targetY && 
                     (data.targetX !== player.x || data.targetY !== player.y)) {
            // Use provided target
            targetX = data.targetX;
            targetY = data.targetY;
          } else {
            // No valid target, don't charge
            ws.send(JSON.stringify({
              type: 'skillError',
              message: 'No target found for Charge'
            }));
            return;
          }
          
          const dx = targetX - player.x;
          const dy = targetY - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const moveDistance = Math.min(skill.range, distance);
            const oldX = player.x;
            const oldY = player.y;
            
            // Move player
            player.x += (dx / distance) * moveDistance;
            player.y += (dy / distance) * moveDistance;
            
            // Find first enemy hit along the path or at destination
            let hitEnemy = null;
            let minDist = 50; // Hit detection range
            
            enemies.forEach((enemy, enemyId) => {
              if (enemy.hp <= 0) return;
              
              // Check distance from charge path
              const distToOld = Math.sqrt(Math.pow(oldX - enemy.x, 2) + Math.pow(oldY - enemy.y, 2));
              const distToNew = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
              
              // Hit if enemy is close to the path or destination
              if (distToNew < minDist) {
                if (!hitEnemy || distToNew < minDist) {
                  minDist = distToNew;
                  hitEnemy = enemy;
                }
              }
            });
            
            if (hitEnemy) {
              const result = calculateDamage(player, hitEnemy, skill.damageMultiplier);
              hitEnemy.hp -= result.damage;
              broadcast({
                type: 'enemyDamaged',
                enemyId: hitEnemy.id,
                damage: result.damage,
                isCrit: result.isCrit,
                hp: hitEnemy.hp,
                maxHp: hitEnemy.maxHp,
                attacker: player.username,
                skill: skillId
              });
            }
            
            // Broadcast player movement
            broadcast({
              type: 'playerMove',
              username: player.username,
              x: player.x,
              y: player.y
            });
          }
          
        } else if (skillId === 'whirlwind') {
          // Whirlwind: damage all nearby enemies
          const hitEnemies = [];
          enemies.forEach((enemy, enemyId) => {
            if (enemy.hp <= 0) return;
            const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
            if (dist < skill.range) {
              const result = calculateDamage(player, enemy, skill.damageMultiplier);
              enemy.hp -= result.damage;
              hitEnemies.push({
                enemyId: enemy.id,
                damage: result.damage,
                isCrit: result.isCrit,
                hp: enemy.hp,
                maxHp: enemy.maxHp
              });
            }
          });
          
          broadcast({
            type: 'skillEffect',
            skillId: skillId,
            user: player.username,
            x: player.x,
            y: player.y,
            range: skill.range
          });
          
          hitEnemies.forEach(hit => {
            broadcast({
              type: 'enemyDamaged',
              enemyId: hit.enemyId,
              damage: hit.damage,
              isCrit: hit.isCrit,
              hp: hit.hp,
              maxHp: hit.maxHp,
              attacker: player.username,
              skill: skillId
            });
          });
          
        } else if (skillId === 'fireball') {
          // Fireball: ranged projectile
          // Find nearest enemy within range
          let targetEnemy = null;
          let minDist = skill.range;
          
          enemies.forEach((enemy, enemyId) => {
            if (enemy.hp <= 0) return;
            const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
            if (dist < skill.range && dist < minDist) {
              minDist = dist;
              targetEnemy = enemy;
            }
          });
          
          // If target position provided, check if there's an enemy near it
          if (!targetEnemy && data.targetX && data.targetY) {
            const targetX = data.targetX;
            const targetY = data.targetY;
            enemies.forEach((enemy, enemyId) => {
              if (enemy.hp <= 0) return;
              const dist = Math.sqrt(Math.pow(targetX - enemy.x, 2) + Math.pow(targetY - enemy.y, 2));
              if (dist < 50 && dist < minDist) {
                minDist = dist;
                targetEnemy = enemy;
              }
            });
          }
          
          if (targetEnemy) {
            const result = calculateDamage(player, targetEnemy, skill.damageMultiplier);
            targetEnemy.hp -= result.damage;
            broadcast({
              type: 'enemyDamaged',
              enemyId: targetEnemy.id,
              damage: result.damage,
              isCrit: result.isCrit,
              hp: targetEnemy.hp,
              maxHp: targetEnemy.maxHp,
              attacker: player.username,
              skill: skillId
            });
          }
          
          broadcast({
            type: 'skillEffect',
            skillId: skillId,
            user: player.username,
            x: player.x,
            y: player.y,
            targetX: targetX,
            targetY: targetY
          });
          
        } else if (skillId === 'ice_bolt') {
          // Ice Bolt: freeze and slow
          // Find nearest enemy within range
          let targetEnemy = null;
          let minDist = skill.range;
          
          enemies.forEach((enemy, enemyId) => {
            if (enemy.hp <= 0) return;
            const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
            if (dist < skill.range && dist < minDist) {
              minDist = dist;
              targetEnemy = enemy;
            }
          });
          
          // If target position provided, check if there's an enemy near it
          if (!targetEnemy && data.targetX && data.targetY) {
            const targetX = data.targetX;
            const targetY = data.targetY;
            enemies.forEach((enemy, enemyId) => {
              if (enemy.hp <= 0) return;
              const dist = Math.sqrt(Math.pow(targetX - enemy.x, 2) + Math.pow(targetY - enemy.y, 2));
              if (dist < 50 && dist < minDist) {
                minDist = dist;
                targetEnemy = enemy;
              }
            });
          }
          
          if (targetEnemy) {
            const result = calculateDamage(player, targetEnemy, skill.damageMultiplier);
            targetEnemy.hp -= result.damage;
            const slowAmount = skill.slowAmount || 0.5; // Default 50% if not specified
            const originalSpeed = targetEnemy.speed || 1;
            targetEnemy.speed = originalSpeed * slowAmount; // Stronger slow
            setTimeout(() => {
              if (targetEnemy && targetEnemy.speed) {
                targetEnemy.speed = originalSpeed; // Restore original speed
              }
            }, 5000); // Longer slow duration
            
            broadcast({
              type: 'enemyDamaged',
              enemyId: targetEnemy.id,
              damage: result.damage,
              isCrit: result.isCrit,
              hp: targetEnemy.hp,
              maxHp: targetEnemy.maxHp,
              attacker: player.username,
              skill: skillId
            });
          }
          
        } else if (skillId === 'shield') {
          // Magic Shield: powerful damage reduction
          if (!playerEffects.has(ws)) {
            playerEffects.set(ws, {});
          }
          const effects = playerEffects.get(ws);
          const damageReduction = skill.damageReduction || 0.5; // Default 50% if not specified
          effects.shield = { active: true, timer: skill.duration, damageReduction: damageReduction };
          
          broadcast({
            type: 'skillEffect',
            skillId: skillId,
            user: player.username
          });
          
        } else if (skillId === 'dash') {
          // Dash: quick movement with brief invincibility
          const targetX = data.targetX || player.x;
          const targetY = data.targetY || player.y;
          const dx = targetX - player.x;
          const dy = targetY - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const moveDistance = Math.min(skill.range, distance);
            player.x += (dx / distance) * moveDistance;
            player.y += (dy / distance) * moveDistance;
            
            // Apply brief invincibility
            if (skill.invincibilityDuration) {
              if (!playerEffects.has(ws)) {
                playerEffects.set(ws, {});
              }
              const effects = playerEffects.get(ws);
              effects.invincible = { active: true, timer: skill.invincibilityDuration };
            }
            
            broadcast({
              type: 'playerMove',
              username: player.username,
              x: player.x,
              y: player.y
            });
          }
          
        } else if (skillId === 'backstab') {
          // Backstab: high damage from behind
          // Find nearest enemy within range
          let targetEnemy = null;
          let minDist = skill.range;
          
          enemies.forEach((enemy, enemyId) => {
            if (enemy.hp <= 0) return;
            const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
            if (dist < skill.range && dist < minDist) {
              minDist = dist;
              targetEnemy = enemy;
            }
          });
          
          // If target position provided, check if there's an enemy near it
          if (!targetEnemy && data.targetX && data.targetY) {
            const targetX = data.targetX;
            const targetY = data.targetY;
            enemies.forEach((enemy, enemyId) => {
              if (enemy.hp <= 0) return;
              const dist = Math.sqrt(Math.pow(targetX - enemy.x, 2) + Math.pow(targetY - enemy.y, 2));
              if (dist < 50 && dist < minDist) {
                minDist = dist;
                targetEnemy = enemy;
              }
            });
          }
          
          if (targetEnemy) {
            const result = calculateDamage(player, targetEnemy, skill.damageMultiplier);
            targetEnemy.hp -= result.damage;
            broadcast({
              type: 'enemyDamaged',
              enemyId: targetEnemy.id,
              damage: result.damage,
              isCrit: true, // Backstab always crits
              hp: targetEnemy.hp,
              maxHp: targetEnemy.maxHp,
              attacker: player.username,
              skill: skillId
            });
          }
          
        } else if (skillId === 'poison') {
          // Poison: DoT effect
          // Find nearest enemy within range
          let targetEnemy = null;
          let minDist = skill.range;
          
          enemies.forEach((enemy, enemyId) => {
            if (enemy.hp <= 0) return;
            const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
            if (dist < skill.range && dist < minDist) {
              minDist = dist;
              targetEnemy = enemy;
            }
          });
          
          // If target position provided, check if there's an enemy near it
          if (!targetEnemy && data.targetX && data.targetY) {
            const targetX = data.targetX;
            const targetY = data.targetY;
            enemies.forEach((enemy, enemyId) => {
              if (enemy.hp <= 0) return;
              const dist = Math.sqrt(Math.pow(targetX - enemy.x, 2) + Math.pow(targetY - enemy.y, 2));
              if (dist < 50 && dist < minDist) {
                minDist = dist;
                targetEnemy = enemy;
              }
            });
          }
          
          if (targetEnemy) {
            // Apply initial damage
            const result = calculateDamage(player, targetEnemy, skill.damageMultiplier);
            targetEnemy.hp -= result.damage;
            
            // Apply DoT
            if (!targetEnemy.dots) targetEnemy.dots = [];
            targetEnemy.dots.push({
              damage: skill.dotDamage,
              duration: skill.dotDuration,
              startTime: now
            });
            
            broadcast({
              type: 'enemyDamaged',
              enemyId: targetEnemy.id,
              damage: result.damage,
              isCrit: result.isCrit,
              hp: targetEnemy.hp,
              maxHp: targetEnemy.maxHp,
              attacker: player.username,
              skill: skillId
            });
          }
          
        } else if (skillId === 'heal') {
          // Heal: restore HP
          player.hp = Math.min(player.maxHp, player.hp + skill.healAmount);
          
          broadcast({
            type: 'skillEffect',
            skillId: skillId,
            user: player.username
          });
          
        } else if (skillId === 'smite') {
          // Smite: holy damage
          // Find nearest enemy within range
          let targetEnemy = null;
          let minDist = skill.range;
          
          enemies.forEach((enemy, enemyId) => {
            if (enemy.hp <= 0) return;
            const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
            if (dist < skill.range && dist < minDist) {
              minDist = dist;
              targetEnemy = enemy;
            }
          });
          
          // If target position provided, check if there's an enemy near it
          if (!targetEnemy && data.targetX && data.targetY) {
            const targetX = data.targetX;
            const targetY = data.targetY;
            enemies.forEach((enemy, enemyId) => {
              if (enemy.hp <= 0) return;
              const dist = Math.sqrt(Math.pow(targetX - enemy.x, 2) + Math.pow(targetY - enemy.y, 2));
              if (dist < 50 && dist < minDist) {
                minDist = dist;
                targetEnemy = enemy;
              }
            });
          }
          
          if (targetEnemy) {
            const result = calculateDamage(player, targetEnemy, skill.damageMultiplier);
            targetEnemy.hp -= result.damage;
            broadcast({
              type: 'enemyDamaged',
              enemyId: targetEnemy.id,
              damage: result.damage,
              isCrit: result.isCrit,
              hp: targetEnemy.hp,
              maxHp: targetEnemy.maxHp,
              attacker: player.username,
              skill: skillId
            });
          }
          
        } else if (skillId === 'taunt') {
          // Taunt: force enemies to target player and gain defense bonus
          enemies.forEach((enemy, enemyId) => {
            if (enemy.hp <= 0) return;
            const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
            if (dist < skill.range) {
              enemy.target = player.username;
            }
          });
          
          // Apply defense bonus
          if (skill.defenseBonus && skill.duration) {
            if (!playerEffects.has(ws)) {
              playerEffects.set(ws, {});
            }
            const effects = playerEffects.get(ws);
            effects.taunt = { 
              active: true, 
              timer: skill.duration, 
              defenseBonus: skill.defenseBonus 
            };
          }
          
          broadcast({
            type: 'skillEffect',
            skillId: skillId,
            user: player.username
          });
          
        } else if (skillId === 'aura') {
          // Protection Aura: increase defense and HP regen for nearby allies
          if (!playerEffects.has(ws)) {
            playerEffects.set(ws, {});
          }
          const effects = playerEffects.get(ws);
          effects.aura = { 
            active: true, 
            timer: skill.duration, 
            defenseBonus: skill.defenseBonus || 5,
            hpRegenBonus: skill.hpRegenBonus || 0
          };
          
          broadcast({
            type: 'skillEffect',
            skillId: skillId,
            user: player.username
          });
        }
        
        // Send MP update
        ws.send(JSON.stringify({
          type: 'playerUpdate',
          mp: player.mp,
          maxMp: player.maxMp
        }));
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

// Track last regeneration time
let lastRegenTime = Date.now();

// Game tick - update enemy AI and combat
setInterval(() => {
  const now = Date.now();
  const allPlayers = Array.from(players.values());
  
  // Regenerate MP and HP every second
  if (now - lastRegenTime >= 1000) {
    lastRegenTime = now;
    
    allPlayers.forEach(player => {
      if (player.hp <= 0) return; // Skip dead players
      
      let needsUpdate = false;
      
      // MP regeneration: 1 MP per second, scales with INT
      if (player.mp < player.maxMp) {
        const mpRegen = 1 + Math.floor((player.int || 10) / 20); // 1 base + INT/20
        player.mp = Math.min(player.maxMp, player.mp + mpRegen);
        needsUpdate = true;
      }
      
      // Check if player is near any portal for HP regeneration
      let nearPortal = false;
      for (let portal of PORTALS) {
        const distance = Math.sqrt(
          Math.pow(player.x - portal.x, 2) + Math.pow(player.y - portal.y, 2)
        );
        if (distance < 150) { // Regeneration range (slightly larger than interaction range)
          nearPortal = true;
          break;
        }
      }
      
      // Health regeneration near portals: 5 HP per second, scales with VIT
      let hpRegen = 0;
      if (nearPortal && player.hp < player.maxHp) {
        hpRegen = 5 + Math.floor((player.vit || 10) / 10); // 5 base + VIT/10
      }
      
      // Check for aura HP regen bonus
      let playerWs = null;
      players.forEach((p, ws) => {
        if (p.username === player.username) {
          playerWs = ws;
        }
      });
      
      if (playerWs && playerEffects.has(playerWs)) {
        const effects = playerEffects.get(playerWs);
        if (effects.aura && effects.aura.active) {
          hpRegen += effects.aura.hpRegenBonus || 0;
        }
      }
      
      if (hpRegen > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + hpRegen);
        needsUpdate = true;
      }
      
      // Update effect timers
      if (playerWs && playerEffects.has(playerWs)) {
        const effects = playerEffects.get(playerWs);
        let effectsUpdated = false;
        
        // Update shield timer
        if (effects.shield && effects.shield.active) {
          effects.shield.timer = Math.max(0, effects.shield.timer - 1000);
          if (effects.shield.timer <= 0) {
            effects.shield.active = false;
            effectsUpdated = true;
          }
        }
        
        // Update invincibility timer
        if (effects.invincible && effects.invincible.active) {
          effects.invincible.timer = Math.max(0, effects.invincible.timer - 1000);
          if (effects.invincible.timer <= 0) {
            effects.invincible.active = false;
            effectsUpdated = true;
          }
        }
        
        // Update taunt timer
        if (effects.taunt && effects.taunt.active) {
          effects.taunt.timer = Math.max(0, effects.taunt.timer - 1000);
          if (effects.taunt.timer <= 0) {
            effects.taunt.active = false;
            effectsUpdated = true;
          }
        }
        
        // Update aura timer
        if (effects.aura && effects.aura.active) {
          effects.aura.timer = Math.max(0, effects.aura.timer - 1000);
          if (effects.aura.timer <= 0) {
            effects.aura.active = false;
            effectsUpdated = true;
          }
        }
      }
      
      // Send update if anything changed
      if (needsUpdate) {
        let playerWs = null;
        players.forEach((p, ws) => {
          if (p.username === player.username) {
            playerWs = ws;
          }
        });
        
        if (playerWs && playerWs.readyState === WebSocket.OPEN) {
          playerWs.send(JSON.stringify({
            type: 'playerUpdate',
            mp: player.mp,
            maxMp: player.maxMp,
            hp: player.hp,
            maxHp: player.maxHp
          }));
        }
      }
    });
  }
  
  enemies.forEach((enemy, enemyId) => {
    if (enemy.hp <= 0) return; // Skip dead enemies
    
    // Handle DoT effects
    if (enemy.dots && enemy.dots.length > 0) {
      enemy.dots = enemy.dots.filter(dot => {
        const elapsed = now - dot.startTime;
        if (elapsed >= dot.duration) {
          return false; // Remove expired DoT
        }
        
        // Apply DoT damage every second
        if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - 16) / 1000)) {
          enemy.hp -= dot.damage;
          broadcast({
            type: 'enemyDamaged',
            enemyId: enemy.id,
            damage: dot.damage,
            hp: enemy.hp,
            maxHp: enemy.maxHp,
            isDot: true
          });
        }
        
        return true; // Keep active DoT
      });
    }
    
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
          // Find player's WebSocket first
          let playerWs = null;
          players.forEach((p, ws) => {
            if (p.username === nearestPlayer.username) {
              playerWs = ws;
            }
          });
          
          // Apply defense bonuses before damage calculation
          let defenseBonus = 0;
          if (playerWs && playerEffects.has(playerWs)) {
            const effects = playerEffects.get(playerWs);
            if (effects.taunt && effects.taunt.active) {
              defenseBonus += effects.taunt.defenseBonus || 0;
            }
            if (effects.aura && effects.aura.active) {
              defenseBonus += effects.aura.defenseBonus || 0;
            }
          }
          
          // Temporarily boost defense for damage calculation
          const originalDef = nearestPlayer.defense || nearestPlayer.def || 0;
          if (defenseBonus > 0) {
            nearestPlayer.defense = originalDef + defenseBonus;
          }
          
          const result = calculateDamage(enemy, nearestPlayer);
          let finalDamage = result.damage;
          
          // Restore original defense
          nearestPlayer.defense = originalDef;
          
          // Apply shield reduction and invincibility
          if (playerWs && playerEffects.has(playerWs)) {
            const effects = playerEffects.get(playerWs);
            
            // Invincibility frames (from dash) - complete immunity
            if (effects.invincible && effects.invincible.active) {
              finalDamage = 0;
            }
            
            // Shield damage reduction
            if (effects.shield && effects.shield.active && finalDamage > 0) {
              const reduction = effects.shield.damageReduction || 0.5;
              finalDamage = Math.floor(finalDamage * (1 - reduction));
            }
          }
          
          nearestPlayer.hp = Math.max(0, nearestPlayer.hp - finalDamage);
          enemy.lastAttack = now;
          
          if (playerWs) {
            // Send damage to player
            playerWs.send(JSON.stringify({
              type: 'playerDamaged',
              damage: finalDamage,
              isCrit: result.isCrit,
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

