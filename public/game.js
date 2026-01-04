/**
 * Main Game Entry Point
 * This file orchestrates all game modules and serves as the entry point.
 * All game logic has been modularized into separate files in the js/ directory.
 */

// Initialize all systems when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize network handlers (login, signup, etc.)
  Network.initialize();
  
  console.log('MetaRoam MMO initialized - all modules loaded');
});

// Note: p5.js setup() and draw() functions are defined in js/core.js
// All modules are loaded via script tags in index.html in the correct order