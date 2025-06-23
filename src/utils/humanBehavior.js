const randomstring = require('randomstring');
const { config } = require('../config/config');

class HumanBehavior {
  /**
   * Generate random delay between min and max values
   * @param {number} min - Minimum delay in milliseconds
   * @param {number} max - Maximum delay in milliseconds
   * @returns {Promise<void>}
   */
  static async randomDelay(min = config.bot.delayMin, max = config.bot.delayMax) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Type text with human-like delays between characters
   * @param {Page} page - Puppeteer page object
   * @param {string} selector - CSS selector for input element
   * @param {string} text - Text to type
   * @param {Object} options - Typing options
   */
  static async humanTypeText(page, selector, text, options = {}) {
    const element = await page.waitForSelector(selector);
    await element.click();
    
    // Clear existing text
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    
    // Type with human-like delays
    for (let i = 0; i < text.length; i++) {
      await page.keyboard.type(text[i]);
      
      // Random delay between characters
      const charDelay = Math.random() * (config.bot.humanTypingDelay * 2) + (config.bot.humanTypingDelay / 2);
      await new Promise(resolve => setTimeout(resolve, charDelay));
      
      // Occasional longer pauses (thinking)
      if (Math.random() < 0.1) {
        await this.randomDelay(200, 800);
      }
    }
  }

  /**
   * Simulate human-like mouse movements before clicking
   * @param {Page} page - Puppeteer page object
   * @param {string} selector - CSS selector for element to click
   */
  static async humanClick(page, selector) {
    const element = await page.waitForSelector(selector);
    const box = await element.boundingBox();
    
    if (box) {
      // Move mouse to a random point within the element
      const x = box.x + Math.random() * box.width;
      const y = box.y + Math.random() * box.height;
      
      // Move mouse in steps to simulate human movement
      await page.mouse.move(x - 100, y - 100);
      await this.randomDelay(100, 300);
      await page.mouse.move(x - 50, y - 50);
      await this.randomDelay(50, 150);
      await page.mouse.move(x, y);
      await this.randomDelay(100, 200);
      
      // Click
      await page.mouse.click(x, y);
    } else {
      // Fallback to regular click
      await element.click();
    }
  }

  /**
   * Simulate human-like scrolling
   * @param {Page} page - Puppeteer page object
   * @param {number} scrollAmount - Amount to scroll in pixels
   */
  static async humanScroll(page, scrollAmount = 300) {
    const steps = Math.floor(scrollAmount / 50);
    
    for (let i = 0; i < steps; i++) {
      await page.evaluate((step) => {
        window.scrollBy(0, step);
      }, 50);
      
      await this.randomDelay(50, 150);
    }
    
    // Random pause after scrolling
    await this.randomDelay(500, 1000);
  }

  /**
   * Generate human-like reading time based on text length
   * @param {string} text - Text to calculate reading time for
   * @returns {number} Reading time in milliseconds
   */
  static calculateReadingTime(text) {
    // Average reading speed: 200-250 words per minute
    const wordsPerMinute = 225;
    const words = text.split(' ').length;
    const baseTime = (words / wordsPerMinute) * 60 * 1000;
    
    // Add randomness (50% to 150% of base time)
    const randomFactor = 0.5 + Math.random();
    return Math.floor(baseTime * randomFactor);
  }

  /**
   * Simulate human browsing patterns with random actions
   * @param {Page} page - Puppeteer page object
   */
  static async randomBrowsingBehavior(page) {
    const actions = [
      // Scroll up/down
      async () => {
        const direction = Math.random() > 0.5 ? 1 : -1;
        await this.humanScroll(page, direction * Math.random() * 200);
      },
      
      // Move mouse randomly
      async () => {
        const viewport = page.viewport();
        const x = Math.random() * viewport.width;
        const y = Math.random() * viewport.height;
        await page.mouse.move(x, y);
      },
      
      // Brief pause (thinking)
      async () => {
        await this.randomDelay(1000, 3000);
      }
    ];
    
    // Perform 1-3 random actions
    const numActions = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numActions; i++) {
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      await randomAction();
    }
  }

  /**
   * Generate realistic user agent strings
   * @returns {string} Random user agent string
   */
  static getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Add random viewport jitter to avoid fingerprinting
   * @param {Object} baseViewport - Base viewport dimensions
   * @returns {Object} Modified viewport with jitter
   */
  static addViewportJitter(baseViewport) {
    const jitter = 20; // +/- 20 pixels
    
    return {
      width: Math.floor(baseViewport.width + (Math.random() * jitter * 2 - jitter)),
      height: Math.floor(baseViewport.height + (Math.random() * jitter * 2 - jitter))
    };
  }

  /**
   * Generate session-specific behavior patterns
   * @returns {Object} Session behavior configuration
   */
  static generateSessionBehavior() {
    return {
      preferredDelayRange: {
        min: config.bot.delayMin + Math.random() * 1000,
        max: config.bot.delayMax + Math.random() * 2000
      },
      typingSpeed: config.bot.humanTypingDelay + (Math.random() * 50 - 25),
      scrollPreference: Math.random() > 0.5 ? 'smooth' : 'step',
      pauseFrequency: Math.random() * 0.3 + 0.1, // 10-40% chance of pauses
      mouseMovementStyle: Math.random() > 0.5 ? 'curved' : 'direct'
    };
  }

  /**
   * Add random mouse movements to simulate human presence
   * @param {Page} page - Puppeteer page object
   */
  static async addRandomMouseMovements(page) {
    try {
      const viewport = page.viewport();
      const movements = Math.floor(Math.random() * 5) + 3; // 3-7 movements
      
      for (let i = 0; i < movements; i++) {
        const x = Math.random() * viewport.width;
        const y = Math.random() * viewport.height;
        
        // Move mouse with realistic speed
        await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
        await this.randomDelay(100, 500);
      }
    } catch (error) {
      // Silently ignore errors in mouse movements
    }
  }

  /**
   * Simulate realistic page interaction patterns
   * @param {Page} page - Puppeteer page object
   */
  static async simulatePageReading(page) {
    try {
      // Get page content for reading time calculation
      const textContent = await page.evaluate(() => {
        return document.body.innerText || '';
      });
      
      const readingTime = this.calculateReadingTime(textContent);
      const actualReadingTime = Math.min(readingTime, 30000); // Cap at 30 seconds
      
      // Break reading time into chunks with interactions
      const chunks = Math.floor(actualReadingTime / 5000) + 1;
      const chunkTime = actualReadingTime / chunks;
      
      for (let i = 0; i < chunks; i++) {
        await this.randomDelay(chunkTime * 0.8, chunkTime * 1.2);
        
        // Random interaction during reading
        if (Math.random() < 0.3) {
          await this.humanScroll(page, Math.random() * 100 - 50);
        }
        
        if (Math.random() < 0.2) {
          await this.addRandomMouseMovements(page);
        }
      }
    } catch (error) {
      // Fallback to basic delay
      await this.randomDelay(3000, 8000);
    }
  }

  /**
   * Generate realistic typing patterns with errors and corrections
   * @param {Page} page - Puppeteer page object
   * @param {string} selector - CSS selector for input element
   * @param {string} text - Text to type
   */
  static async realisticTypeText(page, selector, text) {
    const element = await page.waitForSelector(selector);
    await element.click();
    
    // Clear existing text
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    
    let currentText = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Simulate occasional typos (5% chance)
      if (Math.random() < 0.05 && char !== ' ') {
        const wrongChar = String.fromCharCode(char.charCodeAt(0) + 1);
        await page.keyboard.type(wrongChar);
        currentText += wrongChar;
        
        // Realize mistake and correct it
        await this.randomDelay(200, 800);
        await page.keyboard.press('Backspace');
        currentText = currentText.slice(0, -1);
        await this.randomDelay(100, 300);
        
        // Type correct character
        await page.keyboard.type(char);
        currentText += char;
      } else {
        // Normal typing
        await page.keyboard.type(char);
        currentText += char;
      }
      
      // Variable typing speed
      let charDelay = config.bot.humanTypingDelay;
      
      // Slower typing for complex characters
      if (char.match(/[A-Z@#$%^&*()]/)) {
        charDelay *= 1.5;
      }
      
      // Faster typing for common letter combinations
      if (i > 0 && ['th', 'er', 'on', 'an', 're', 'he', 'in', 'ed', 'nd'].includes(text.substring(i-1, i+1))) {
        charDelay *= 0.7;
      }
      
      await this.randomDelay(charDelay * 0.5, charDelay * 1.5);
      
      // Occasional longer pauses (thinking/reading)
      if (Math.random() < 0.1) {
        await this.randomDelay(500, 1500);
      }
    }
  }
}

module.exports = HumanBehavior; 