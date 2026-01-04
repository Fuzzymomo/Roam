/**
 * Network System
 * Handles WebSocket communication and API calls
 */

const Network = {
  characterCreationData: {
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
  },
  
  /**
   * Initialize login/signup handlers
   */
  initialize() {
    // Login/Signup handlers
    document.getElementById('loginBtn').addEventListener('click', () => {
      const username = document.getElementById('usernameInput').value.trim();
      if (username) {
        this.login(username);
      }
    });
    
    document.getElementById('signupBtn').addEventListener('click', () => {
      const username = document.getElementById('usernameInput').value.trim();
      if (username) {
        this.signup(username);
      }
    });
    
    document.getElementById('usernameInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const username = document.getElementById('usernameInput').value.trim();
        if (username) {
          this.login(username);
        }
      }
    });
    
    // Character creation button
    document.getElementById('createCharacterBtn').addEventListener('click', () => this.createCharacter());
  },
  
  /**
   * Login user
   */
  async login(username) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        GameState.player.username = data.username;
        GameState.player.score = data.score || 0;
        Portal.respawnX = data.respawnX || 10000;
        Portal.respawnY = data.respawnY || 10000;
        
        // Load character data
        GameState.player.characterClass = data.characterClass || 'warrior';
        GameState.player.level = data.level || 1;
        GameState.player.xp = data.xp || 0;
        GameState.player.hp = data.hp || 100;
        GameState.player.maxHp = data.maxHp || 100;
        GameState.player.mp = data.mp || 50;
        GameState.player.maxMp = data.maxMp || 50;
        GameState.player.str = data.str || 10;
        GameState.player.dex = data.dex || 10;
        GameState.player.int = data.int || 10;
        GameState.player.vit = data.vit || 10;
        GameState.player.def = data.def || 10;
        GameState.player.xpForNextLevel = Utils.getXPForLevel(GameState.player.level);
        
        // Load inventory and equipment
        Inventory.load(data.inventory || [], data.equipment || {});
        
        // Load item database
        await Inventory.initialize();
        
        // Initialize skills
        Skills.init();
        
        this.startGame();
      } else {
        Utils.showError(data.error || 'Login failed');
      }
    } catch (error) {
      Utils.showError('Connection error');
    }
  },
  
  /**
   * Signup new user
   */
  async signup(username) {
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.characterCreationData.username = data.username;
        this.showCharacterCreation();
      } else {
        Utils.showError(data.error || 'Signup failed');
      }
    } catch (error) {
      Utils.showError('Connection error');
    }
  },
  
  /**
   * Show character creation screen
   */
  async showCharacterCreation() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('characterCreation').style.display = 'block';
    
    // Reset character creation data
    this.characterCreationData.selectedClass = null;
    this.characterCreationData.statPoints = 20;
    this.characterCreationData.stats = {
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
      this.populateClassSelection(data.classes);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
    
    this.populateStatAllocation();
    this.updateCreateButton();
  },
  
  /**
   * Populate class selection
   */
  populateClassSelection(classes) {
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
      `;
      div.addEventListener('click', () => this.selectClass(classData.id));
      container.appendChild(div);
    });
  },
  
  /**
   * Select a class
   */
  selectClass(classId) {
    this.characterCreationData.selectedClass = classId;
    
    // Update UI
    document.querySelectorAll('.class-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    document.querySelector(`[data-class-id="${classId}"]`).classList.add('selected');
    
    this.updateCreateButton();
  },
  
  /**
   * Populate stat allocation
   */
  populateStatAllocation() {
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
        <button onclick="Network.adjustStat('${stat}', -1)">-</button>
        <span class="stat-value" id="stat-${stat}">${this.characterCreationData.stats[stat]}</span>
        <button onclick="Network.adjustStat('${stat}', 1)">+</button>
      `;
      container.appendChild(row);
    });
    
    this.updateStatDisplay();
  },
  
  /**
   * Adjust stat (global for onclick)
   */
  adjustStat(stat, change) {
    const newValue = this.characterCreationData.stats[stat] + change;
    
    // Check constraints
    if (change < 0 && newValue < 5) return;
    if (change > 0 && this.characterCreationData.statPoints <= 0) return;
    
    this.characterCreationData.stats[stat] = newValue;
    this.characterCreationData.statPoints -= change;
    
    this.updateStatDisplay();
    this.updateCreateButton();
  },
  
  /**
   * Update stat display
   */
  updateStatDisplay() {
    document.getElementById('pointsRemaining').textContent = this.characterCreationData.statPoints;
    
    Object.keys(this.characterCreationData.stats).forEach(stat => {
      document.getElementById(`stat-${stat}`).textContent = this.characterCreationData.stats[stat];
    });
    
    // Update button states
    document.querySelectorAll('.stat-row button').forEach(btn => {
      const isDecrease = btn.textContent === '-';
      const stat = btn.parentElement.querySelector('.stat-value').id.replace('stat-', '');
      
      if (isDecrease) {
        btn.disabled = this.characterCreationData.stats[stat] <= 5;
      } else {
        btn.disabled = this.characterCreationData.statPoints <= 0;
      }
    });
  },
  
  /**
   * Update create button state
   */
  updateCreateButton() {
    const btn = document.getElementById('createCharacterBtn');
    const canCreate = this.characterCreationData.selectedClass !== null && 
                     this.characterCreationData.statPoints === 0;
    btn.disabled = !canCreate;
  },
  
  /**
   * Create character
   */
  async createCharacter() {
    if (this.characterCreationData.statPoints !== 0) {
      document.getElementById('charCreationError').textContent = 'Please allocate all stat points!';
      return;
    }
    
    if (!this.characterCreationData.selectedClass) {
      document.getElementById('charCreationError').textContent = 'Please select a class!';
      return;
    }
    
    try {
      // Get base stats for the selected class
      const classResponse = await fetch('/api/character-classes');
      const classData = await classResponse.json();
      const selectedClassData = classData.classes.find(c => c.id === this.characterCreationData.selectedClass);
      
      // Calculate final stats
      const allocatedPoints = {
        str: this.characterCreationData.stats.str - 5,
        dex: this.characterCreationData.stats.dex - 5,
        int: this.characterCreationData.stats.int - 5,
        vit: this.characterCreationData.stats.vit - 5,
        def: this.characterCreationData.stats.def - 5
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
      const hpBonus = allocatedPoints.vit * 5;
      const mpBonus = allocatedPoints.int * 3;
      
      const characterData = {
        characterClass: this.characterCreationData.selectedClass,
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
          username: this.characterCreationData.username,
          characterData: characterData
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Load character data and start game
        GameState.player.username = this.characterCreationData.username;
        GameState.player.score = 0;
        Portal.respawnX = 10000;
        Portal.respawnY = 10000;
        GameState.player.characterClass = characterData.characterClass;
        GameState.player.level = characterData.level;
        GameState.player.xp = characterData.xp;
        GameState.player.hp = characterData.hp;
        GameState.player.maxHp = characterData.maxHp;
        GameState.player.mp = characterData.mp;
        GameState.player.maxMp = characterData.maxMp;
        GameState.player.str = characterData.str;
        GameState.player.dex = characterData.dex;
        GameState.player.int = characterData.int;
        GameState.player.vit = characterData.vit;
        GameState.player.def = characterData.def;
        GameState.player.xpForNextLevel = Utils.getXPForLevel(GameState.player.level);
        
        document.getElementById('characterCreation').style.display = 'none';
        this.startGame();
      } else {
        document.getElementById('charCreationError').textContent = data.error || 'Failed to create character';
      }
    } catch (error) {
      document.getElementById('charCreationError').textContent = 'Connection error';
    }
  },
  
  /**
   * Start game and connect WebSocket
   */
  startGame() {
    GameState.loggedIn = true;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('scoreDisplay').style.display = 'block';
    Character.updateDisplay();
    
    // Initialize chat after a short delay
    setTimeout(() => {
      Chat.initialize();
    }, 100);
    
    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    GameState.socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    GameState.socket.onopen = () => {
      GameState.socket.send(JSON.stringify({
        type: 'join',
        username: GameState.player.username,
        score: GameState.player.score,
        respawnX: Portal.respawnX,
        respawnY: Portal.respawnY
      }));
    };
    
    GameState.socket.onmessage = (event) => {
      this.handleWebSocketMessage(event);
    };
    
    GameState.socket.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    GameState.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Initialize keyboard handlers
    this.initializeKeyboardHandlers();
  },
  
  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(event) {
    const data = JSON.parse(event.data);
    
    if (data.type === 'gameState') {
      GameState.otherPlayers = data.players.filter(p => p.username !== GameState.player.username);
      
      if (data.worldWidth) GameState.worldWidth = data.worldWidth;
      if (data.worldHeight) GameState.worldHeight = data.worldHeight;
      
      if (data.zones) {
        World.zones = data.zones;
        // Initialize tiles if not already initialized
        if (!Tiles.tileMap) {
          Tiles.init(GameState.worldWidth, GameState.worldHeight);
        }
        // Regenerate tile map when zones are loaded
        if (Assets.isLoaded() && Tiles.tileMap) {
          World.regenerateTiles();
        }
      }
      
      if (data.portals) {
        Portal.portals = data.portals;
      }
      
      if (data.enemies) {
        GameState.enemies = data.enemies;
      }
      
      const serverPlayer = data.players.find(p => p.username === GameState.player.username);
      if (serverPlayer) {
        GameState.player.x = serverPlayer.x;
        GameState.player.y = serverPlayer.y;
        Camera.update();
        World.checkZoneChange();
      }
    }
    
    if (data.type === 'respawnSet') {
      Portal.respawnX = data.x;
      Portal.respawnY = data.y;
      UI.respawnMessage = `Respawn point set to ${data.town}!`;
      UI.respawnMessageTimer = 180;
    }
    
    if (data.type === 'playerJoined') {
      if (data.username !== GameState.player.username) {
        GameState.otherPlayers.push({
          username: data.username,
          x: data.x,
          y: data.y,
          score: 0
        });
      }
    }
    
    if (data.type === 'playerMove') {
      const otherPlayer = GameState.otherPlayers.find(p => p.username === data.username);
      if (otherPlayer) {
        otherPlayer.x = data.x;
        otherPlayer.y = data.y;
      }
    }
    
    if (data.type === 'playerLeft') {
      GameState.otherPlayers = GameState.otherPlayers.filter(p => p.username !== data.username);
    }
    
    if (data.type === 'characterUpdate') {
      GameState.player.xp = data.xp;
      GameState.player.xpForNextLevel = data.xpForNextLevel;
      GameState.player.level = data.level;
      Character.updateDisplay();
    }
    
    if (data.type === 'levelUp') {
      GameState.player.level = data.level;
      GameState.player.hp = data.stats.hp;
      GameState.player.maxHp = data.stats.maxHp;
      GameState.player.mp = data.stats.mp;
      GameState.player.maxMp = data.stats.maxMp;
      GameState.player.str = data.stats.str;
      GameState.player.dex = data.stats.dex;
      GameState.player.int = data.stats.int;
      GameState.player.vit = data.stats.vit;
      GameState.player.def = data.stats.def;
      GameState.player.xpForNextLevel = Utils.getXPForLevel(GameState.player.level);
      
      GameState.levelUpMessage = `Level Up! You are now Level ${GameState.player.level}!`;
      GameState.levelUpTimer = 300;
      Character.updateDisplay();
    }
    
    if (data.type === 'enemyMove') {
      const enemy = GameState.enemies.find(e => e.id === data.enemyId);
      if (enemy) {
        enemy.x = data.x;
        enemy.y = data.y;
      }
    }
    
    if (data.type === 'enemyDamaged') {
      const enemy = GameState.enemies.find(e => e.id === data.enemyId);
      if (enemy) {
        enemy.hp = data.hp;
        enemy.maxHp = data.maxHp;
        
        if (data.attacker === GameState.player.username) {
          const screenPos = Camera.worldToScreen(enemy.x, enemy.y);
          GameState.damageNumbers.push({
            x: screenPos.x,
            y: screenPos.y - 20,
            damage: data.damage,
            timer: 60,
            color: data.isCrit ? [255, 255, 0] : (data.isDot ? [150, 255, 150] : [255, 100, 100])
          });
        }
      }
    }
    
    if (data.type === 'playerUpdate') {
      if (data.mp !== undefined) GameState.player.mp = data.mp;
      if (data.maxMp !== undefined) GameState.player.maxMp = data.maxMp;
      if (data.hp !== undefined) GameState.player.hp = data.hp;
      if (data.maxHp !== undefined) GameState.player.maxHp = data.maxHp;
      Character.updateDisplay();
    }
    
    if (data.type === 'skillEffect') {
      // Visual effect for skills (could be enhanced with particles)
      console.log('Skill used:', data.skillId, 'by', data.user);
    }
    
    if (data.type === 'effectUpdate') {
      // Update active effects from server
      Skills.updateEffects(data.effects);
    }
    
    if (data.type === 'skillError') {
      // Show error message
      GameState.levelUpMessage = data.message;
      GameState.levelUpTimer = 120;
    }
    
    if (data.type === 'enemyKilled') {
      GameState.enemies = GameState.enemies.filter(e => e.id !== data.enemyId);
      
      if (data.killer === GameState.player.username) {
        let lootText = '';
        if (data.loot && data.loot.length > 0) {
          lootText = ` + ${data.loot.length} item(s)`;
          Inventory.items = Inventory.items.concat(data.loot);
        }
        GameState.levelUpMessage = `Killed ${data.xpReward} XP, ${data.goldReward} Gold${lootText}!`;
        GameState.levelUpTimer = 120;
      }
    }
    
    if (data.type === 'enemyRespawn') {
      const existingIndex = GameState.enemies.findIndex(e => e.id === data.enemy.id);
      if (existingIndex >= 0) {
        GameState.enemies[existingIndex] = data.enemy;
      } else {
        GameState.enemies.push(data.enemy);
      }
    }
    
    if (data.type === 'playerDamaged') {
      GameState.player.hp = data.hp;
      GameState.player.maxHp = data.maxHp;
      Character.updateDisplay();
      
      const screenPos = Camera.worldToScreen(GameState.player.x, GameState.player.y);
      GameState.damageNumbers.push({
        x: screenPos.x,
        y: screenPos.y - 20,
        damage: data.damage,
        timer: 60,
        color: [255, 50, 50]
      });
    }
    
    if (data.type === 'playerDeath') {
      GameState.player.x = data.respawnX;
      GameState.player.y = data.respawnY;
      GameState.player.hp = GameState.player.maxHp;
      GameState.player.mp = GameState.player.maxMp;
      Camera.update();
      Character.updateDisplay();
      
      GameState.levelUpMessage = 'You have died! Respawned at your respawn point.';
      GameState.levelUpTimer = 180;
    }
    
    if (data.type === 'playerRespawn') {
      const otherPlayer = GameState.otherPlayers.find(p => p.username === data.username);
      if (otherPlayer) {
        otherPlayer.x = data.x;
        otherPlayer.y = data.y;
      }
    }
    
    if (data.type === 'chatMessage') {
      Chat.addMessage(data.message, data.channel, data.sender);
    }
  },
  
  /**
   * Initialize keyboard handlers
   */
  initializeKeyboardHandlers() {
    window.addEventListener('keydown', (e) => {
      GameState.keys[e.key.toLowerCase()] = true;
      
      // Portal interaction (E key)
      if (e.key === 'e' || e.key === 'E') {
        if (Portal.nearPortal && GameState.socket && GameState.socket.readyState === WebSocket.OPEN) {
          GameState.socket.send(JSON.stringify({
            type: 'interactPortal'
          }));
        }
      }
      
      // Toggle character sheet (C key)
      if (e.key === 'c' || e.key === 'C') {
        GameState.showCharacterSheet = !GameState.showCharacterSheet;
      }
      
      // Toggle inventory (I key)
      if (e.key === 'i' || e.key === 'I') {
        Inventory.show = !Inventory.show;
      }
      
      // Toggle chat (Enter key - but only when not typing)
      if (e.key === 'Enter' && document.activeElement.id !== 'chatInputField') {
        document.getElementById('chatInputField').focus();
      }
      
      // Close chat (Escape key when typing)
      if (e.key === 'Escape' && document.activeElement.id === 'chatInputField') {
        document.getElementById('chatInputField').blur();
      }
      
      // Skill hotkeys (1, 2, 3)
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        if (GameState.loggedIn && !Inventory.show && !GameState.showCharacterSheet && 
            document.activeElement.id !== 'chatInputField' && Skills.skills) {
          const skill = Skills.getSkillByKey(e.key);
          if (skill) {
            // For targeted skills, find nearest enemy or use null to let server auto-target
            let targetX = null;
            let targetY = null;
            
            // For skills that need targeting (charge, fireball, etc.), find nearest enemy
            if (skill.range && skill.range > 0) {
              let nearestEnemy = null;
              let nearestDistance = Infinity;
              
              GameState.enemies.forEach(enemy => {
                if (enemy.hp <= 0) return;
                const distance = Math.sqrt(
                  Math.pow(GameState.player.x - enemy.x, 2) + 
                  Math.pow(GameState.player.y - enemy.y, 2)
                );
                if (distance < skill.range * 1.5 && distance < nearestDistance) {
                  nearestDistance = distance;
                  nearestEnemy = enemy;
                }
              });
              
              if (nearestEnemy) {
                targetX = nearestEnemy.x;
                targetY = nearestEnemy.y;
              }
            }
            
            Skills.useSkill(skill.id, targetX, targetY);
          }
        }
      }
    });
    
    window.addEventListener('keyup', (e) => {
      GameState.keys[e.key.toLowerCase()] = false;
    });
  },
  
  /**
   * Load player stats with equipment bonuses
   */
  async loadPlayerStats() {
    try {
      const response = await fetch(`/api/inventory/${GameState.player.username}`);
      const data = await response.json();
      Inventory.load(data.inventory || [], data.equipment || {});
      
      // Reload from server to get calculated stats
      const loginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: GameState.player.username })
      });
      const loginData = await loginResponse.json();
      if (loginResponse.ok) {
        GameState.player.hp = loginData.hp;
        GameState.player.maxHp = loginData.maxHp;
        GameState.player.mp = loginData.mp;
        GameState.player.maxMp = loginData.maxMp;
        GameState.player.str = loginData.str;
        GameState.player.dex = loginData.dex;
        GameState.player.int = loginData.int;
        GameState.player.vit = loginData.vit;
        GameState.player.def = loginData.def;
        Character.updateDisplay();
      }
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  }
};

// Make adjustStat globally accessible for onclick handlers
window.Network = Network;
