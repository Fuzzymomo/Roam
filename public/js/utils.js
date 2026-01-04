/**
 * Utility Functions
 * Helper functions used across the game
 */

const Utils = {
  /**
   * Calculate XP needed for a level
   * @param {number} level 
   * @returns {number}
   */
  getXPForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  },
  
  /**
   * Show error message
   * @param {string} message 
   */
  showError(message) {
    const errorElement = document.getElementById('errorMsg');
    if (errorElement) {
      errorElement.textContent = message;
      setTimeout(() => {
        errorElement.textContent = '';
      }, 3000);
    }
  }
};
