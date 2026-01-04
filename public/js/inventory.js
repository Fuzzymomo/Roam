/**
 * Inventory System
 * Handles inventory, equipment, and item management
 */

const Inventory = {
  items: [],
  equipment: {},
  itemDatabase: { weapons: [], armor: [], consumables: [], accessories: [] },
  show: false,
  selectedSlot: null,
  
  /**
   * Initialize inventory
   */
  async initialize() {
    // Load item database
    try {
      const itemsResponse = await fetch('/api/items');
      const itemsData = await itemsResponse.json();
      this.itemDatabase = itemsData.items || { weapons: [], armor: [], consumables: [], accessories: [] };
    } catch (error) {
      console.error('Error loading items:', error);
    }
  },
  
  /**
   * Load inventory from server data
   */
  load(inventory, equipment) {
    this.items = inventory || [];
    this.equipment = equipment || {};
  },
  
  /**
   * Draw inventory UI
   */
  draw() {
    const invWidth = 600;
    const invHeight = 500;
    const invX = (GameState.canvasWidth - invWidth) / 2;
    const invY = (GameState.canvasHeight - invHeight) / 2;
    
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
      if (this.equipment[slot.slot]) {
        const item = this.equipment[slot.slot];
        fill(100, 150, 200);
        stroke(150, 200, 255);
        strokeWeight(2);
        rect(slot.x + 5, slot.y + 5, slotSize - 10, slotSize - 10);
        
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
        if (index < this.items.length) {
          const item = this.items[index];
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
          
          fill(255);
          textSize(7);
          textAlign(CENTER);
          text(item.name.substring(0, 6), slotX + gridSlotSize / 2, slotY + gridSlotSize / 2);
          
          // Highlight selected slot
          if (this.selectedSlot === index) {
            fill(255, 255, 0, 100);
            rect(slotX, slotY, gridSlotSize, gridSlotSize);
          }
        }
      }
    }
    
    // Item info (bottom)
    if (this.selectedSlot !== null && this.selectedSlot < this.items.length) {
      const item = this.items[this.selectedSlot];
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
  },
  
  /**
   * Handle inventory clicks
   */
  handleClick(mx, my) {
    const invWidth = 600;
    const invHeight = 500;
    const invX = (GameState.canvasWidth - invWidth) / 2;
    const invY = (GameState.canvasHeight - invHeight) / 2;
    
    // Check if click is in inventory area
    if (mx < invX || mx > invX + invWidth || my < invY || my > invY + invHeight) {
      return;
    }
    
    // First, check if clicking on action button (if item is selected)
    if (this.selectedSlot !== null && this.selectedSlot < this.items.length) {
      const infoY = invY + invHeight - 100;
      const item = this.items[this.selectedSlot];
      
      // Check if clicking on Use/Equip button
      if (mx >= invX + invWidth - 120 && mx <= invX + invWidth - 20 &&
          my >= infoY + 50 && my <= infoY + 75) {
        if (item.type === 'consumable') {
          this.useItem(this.selectedSlot);
        } else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
          this.equipItem(this.selectedSlot);
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
        if (this.equipment[slot.slot]) {
          this.unequipItem(slot.slot);
        } else {
          this.selectedSlot = null;
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
          if (index < this.items.length) {
            this.selectedSlot = index;
          } else {
            this.selectedSlot = null;
          }
          return;
        }
      }
    }
    
    // If clicked elsewhere in inventory, deselect
    this.selectedSlot = null;
  },
  
  /**
   * Equip item
   */
  async equipItem(inventoryIndex) {
    if (inventoryIndex >= this.items.length) return;
    
    const item = this.items[inventoryIndex];
    let slot = null;
    
    // Determine slot based on item type
    if (item.type === 'weapon') {
      slot = 'weapon';
    } else if (item.type === 'armor') {
      slot = item.slot;
    } else if (item.type === 'accessory') {
      if (item.slot === 'ring') {
        slot = this.equipment.ring1 ? 'ring2' : 'ring1';
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
          username: GameState.player.username,
          itemInstanceId: item.instanceId,
          slot: slot
        })
      });
      
      const data = await response.json();
      if (data.success) {
        this.items = data.inventory;
        this.equipment = data.equipment;
        this.selectedSlot = null;
        await Network.loadPlayerStats();
      }
    } catch (error) {
      console.error('Error equipping item:', error);
    }
  },
  
  /**
   * Unequip item
   */
  async unequipItem(slot) {
    try {
      const response = await fetch('/api/inventory/unequip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: GameState.player.username,
          slot: slot
        })
      });
      
      const data = await response.json();
      if (data.success) {
        this.items = data.inventory;
        this.equipment = data.equipment;
        await Network.loadPlayerStats();
      }
    } catch (error) {
      console.error('Error unequipping item:', error);
    }
  },
  
  /**
   * Use consumable
   */
  async useItem(inventoryIndex) {
    if (inventoryIndex >= this.items.length) return;
    
    const item = this.items[inventoryIndex];
    if (item.type !== 'consumable') return;
    
    try {
      const response = await fetch('/api/inventory/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: GameState.player.username,
          itemInstanceId: item.instanceId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        this.items = data.inventory;
        GameState.player.hp = data.hp;
        GameState.player.mp = data.mp;
        GameState.player.xp = data.xp;
        Character.updateDisplay();
        this.selectedSlot = null;
      }
    } catch (error) {
      console.error('Error using item:', error);
    }
  }
};
