/**
 * Skills System
 * Handles class-specific abilities and skills
 */

// Skill definitions for each class
const CLASS_SKILLS = {
  warrior: [
    {
      id: 'charge',
      name: 'Charge',
      description: 'Dash forward and deal massive damage to first enemy hit',
      mpCost: 20,
      cooldown: 4000, // 4 seconds (reduced)
      range: 120, // Increased range
      damageMultiplier: 2.5, // Increased damage
      key: '1',
      icon: '⚔️'
    },
    {
      id: 'whirlwind',
      name: 'Whirlwind',
      description: 'Spin attack hitting all nearby enemies for high damage',
      mpCost: 30,
      cooldown: 6000, // 6 seconds (reduced)
      range: 80, // Increased range
      damageMultiplier: 1.8, // Increased damage
      key: '2',
      icon: '🌪️'
    },
    {
      id: 'taunt',
      name: 'Taunt',
      description: 'Force nearby enemies to attack you and gain temporary defense',
      mpCost: 15,
      cooldown: 8000, // 8 seconds (reduced)
      range: 100, // Increased range
      defenseBonus: 10, // Added defense bonus
      duration: 5000, // 5 seconds
      key: '3',
      icon: '🛡️'
    }
  ],
  mage: [
    {
      id: 'fireball',
      name: 'Fireball',
      description: 'Launch a powerful fireball that explodes on impact',
      mpCost: 25,
      cooldown: 2500, // 2.5 seconds (reduced)
      range: 180, // Increased range
      damageMultiplier: 3.0, // Increased damage
      key: '1',
      icon: '🔥'
    },
    {
      id: 'ice_bolt',
      name: 'Ice Bolt',
      description: 'Freeze enemy, dealing damage and slowing them significantly',
      mpCost: 20,
      cooldown: 3000, // 3 seconds (reduced)
      range: 150, // Increased range
      damageMultiplier: 2.2, // Increased damage
      slowAmount: 0.3, // Stronger slow (70% reduction)
      key: '2',
      icon: '❄️'
    },
    {
      id: 'shield',
      name: 'Magic Shield',
      description: 'Create a powerful shield that absorbs 75% of damage',
      mpCost: 40,
      cooldown: 12000, // 12 seconds (reduced)
      duration: 8000, // 8 seconds (increased)
      damageReduction: 0.75, // 75% damage reduction
      key: '3',
      icon: '🛡️'
    }
  ],
  rogue: [
    {
      id: 'dash',
      name: 'Dash',
      description: 'Quickly dash in target direction, gaining brief invincibility',
      mpCost: 15,
      cooldown: 3000, // 3 seconds (reduced)
      range: 100, // Increased range
      invincibilityDuration: 500, // 0.5 seconds of invincibility
      key: '1',
      icon: '💨'
    },
    {
      id: 'backstab',
      name: 'Backstab',
      description: 'Deal massive critical damage from behind',
      mpCost: 25,
      cooldown: 5000, // 5 seconds (reduced)
      range: 50, // Increased range
      damageMultiplier: 4.0, // Massive damage increase
      key: '2',
      icon: '🗡️'
    },
    {
      id: 'poison',
      name: 'Poison Strike',
      description: 'Apply deadly poison that deals significant damage over time',
      mpCost: 20,
      cooldown: 4000, // 4 seconds (reduced)
      range: 60, // Increased range
      damageMultiplier: 1.5, // Increased initial damage
      dotDamage: 10, // Increased DoT damage
      dotDuration: 8000, // 8 seconds (longer duration)
      key: '3',
      icon: '☠️'
    }
  ],
  paladin: [
    {
      id: 'heal',
      name: 'Heal',
      description: 'Restore significant health instantly',
      mpCost: 30,
      cooldown: 6000, // 6 seconds (reduced)
      healAmount: 100, // Doubled healing
      key: '1',
      icon: '✨'
    },
    {
      id: 'smite',
      name: 'Smite',
      description: 'Powerful holy attack that deals massive damage',
      mpCost: 25,
      cooldown: 4000, // 4 seconds (reduced)
      range: 90, // Increased range
      damageMultiplier: 3.0, // Increased damage
      key: '2',
      icon: '⚡'
    },
    {
      id: 'aura',
      name: 'Protection Aura',
      description: 'Increase defense and health regeneration for nearby allies',
      mpCost: 35,
      cooldown: 10000, // 10 seconds (reduced)
      range: 120, // Increased range
      defenseBonus: 15, // Tripled defense bonus
      hpRegenBonus: 2, // Added HP regen
      duration: 10000, // 10 seconds (increased)
      key: '3',
      icon: '🌟'
    }
  ]
};

const Skills = {
  // Track skill cooldowns
  cooldowns: {},
  
  // Track active effects
  activeEffects: {},
  
  /**
   * Initialize skills for player's class
   */
  init() {
    const playerClass = GameState.player.characterClass || 'warrior';
    this.skills = CLASS_SKILLS[playerClass] || CLASS_SKILLS.warrior;
    
    // Initialize cooldowns
    this.skills.forEach(skill => {
      this.cooldowns[skill.id] = 0;
    });
    
    // Initialize active effects
    this.activeEffects = {
      shield: { active: false, timer: 0 },
      aura: { active: false, timer: 0 }
    };
  },
  
  /**
   * Check if skill is ready (cooldown and MP)
   */
  canUseSkill(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) return false;
    
    // Check cooldown
    if (this.cooldowns[skillId] > 0) return false;
    
    // Check MP
    if (GameState.player.mp < skill.mpCost) return false;
    
    return true;
  },
  
  /**
   * Use a skill
   */
  useSkill(skillId, targetX = null, targetY = null) {
    if (!this.canUseSkill(skillId)) return false;
    
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) return false;
    
    // Send skill usage to server
    if (GameState.socket && GameState.socket.readyState === WebSocket.OPEN) {
      GameState.socket.send(JSON.stringify({
        type: 'useSkill',
        skillId: skillId,
        targetX: targetX,
        targetY: targetY
      }));
      
      // Set cooldown (client-side for UI)
      this.cooldowns[skillId] = skill.cooldown;
      
      return true;
    }
    
    return false;
  },
  
  /**
   * Update cooldowns
   */
  update() {
    // Update cooldowns
    for (let skillId in this.cooldowns) {
      if (this.cooldowns[skillId] > 0) {
        this.cooldowns[skillId] = Math.max(0, this.cooldowns[skillId] - 16); // ~60fps
      }
    }
    
    // Update active effects
    if (this.activeEffects.shield.active) {
      this.activeEffects.shield.timer = Math.max(0, this.activeEffects.shield.timer - 16);
      if (this.activeEffects.shield.timer <= 0) {
        this.activeEffects.shield.active = false;
      }
    }
    
    if (this.activeEffects.aura.active) {
      this.activeEffects.aura.timer = Math.max(0, this.activeEffects.aura.timer - 16);
      if (this.activeEffects.aura.timer <= 0) {
        this.activeEffects.aura.active = false;
      }
    }
  },
  
  /**
   * Draw skill bar
   */
  drawSkillBar() {
    if (!this.skills || !GameState.loggedIn) return;
    
    const barWidth = 300;
    const barHeight = 60;
    const barX = (GameState.canvasWidth - barWidth) / 2;
    const barY = GameState.canvasHeight - barHeight - 20;
    const skillSpacing = barWidth / this.skills.length;
    
    // Background
    fill(0, 0, 0, 200);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(barX, barY, barWidth, barHeight);
    
    // Draw each skill
    this.skills.forEach((skill, index) => {
      const skillX = barX + index * skillSpacing + skillSpacing / 2;
      const skillY = barY + barHeight / 2;
      const skillSize = 40;
      
      // Check if skill is on cooldown
      const cooldownPercent = this.cooldowns[skill.id] / skill.cooldown;
      const canUse = this.canUseSkill(skill.id);
      
      // Skill button background
      if (canUse) {
        fill(50, 100, 50, 200);
      } else {
        fill(50, 50, 50, 200);
      }
      stroke(150, 150, 150);
      strokeWeight(1);
      rect(skillX - skillSize / 2, skillY - skillSize / 2, skillSize, skillSize);
      
      // Cooldown overlay
      if (cooldownPercent > 0) {
        fill(0, 0, 0, 180);
        noStroke();
        rect(skillX - skillSize / 2, skillY - skillSize / 2, skillSize, skillSize * cooldownPercent);
      }
      
      // Skill icon
      fill(255);
      textAlign(CENTER);
      textSize(20);
      text(skill.icon, skillX, skillY - 5);
      
      // Key binding
      textSize(10);
      fill(255, 255, 0);
      text(skill.key, skillX, skillY + 15);
      
      // MP cost
      textSize(8);
      fill(100, 150, 255);
      text(skill.mpCost + ' MP', skillX, skillY + 25);
    });
  },
  
  /**
   * Get skill by key
   */
  getSkillByKey(key) {
    if (!this.skills) return null;
    return this.skills.find(s => s.key === key);
  }
};

