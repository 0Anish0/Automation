#!/usr/bin/env node

const LinkedInBot = require('./bot/linkedinBot');
const logger = require('./utils/logger');
const { config } = require('./config/config');

// Handle process termination gracefully
let bot = null;

const gracefulShutdown = async (signal) => {
  logger.botAction(`Received ${signal}, shutting down gracefully`);
  
  if (bot) {
    await bot.stop();
  }
  
  process.exit(0);
};

// Register signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (bot) {
    bot.cleanup();
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (bot) {
    bot.cleanup();
  }
  process.exit(1);
});

/**
 * Display help information
 */
function showHelp() {
  console.log(`
LinkedIn Job Automation Bot
==========================

Usage: npm start [command]

Commands:
  start     - Start the full automation (default)
  test      - Run a test cycle with limited scope
  help      - Show this help message

Configuration:
  Configure your settings in the .env file based on env.example

Environment Variables Required:
  - LINKEDIN_EMAIL: Your LinkedIn email
  - LINKEDIN_PASSWORD: Your LinkedIn password  
  - GEMINI_API_KEY: Your Google Gemini API key
  - GMAIL_EMAIL: Your Gmail address
  - GMAIL_APP_PASSWORD: Your Gmail app password

For more information, check the README.md file.
`);
}

/**
 * Main application function
 */
async function main() {
  try {
    const command = process.argv[2] || 'start';
    
    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        return;
        
      case 'test':
        logger.botAction('Starting LinkedIn Bot in TEST mode');
        bot = new LinkedInBot();
        
        const initSuccess = await bot.initialize();
        if (!initSuccess) {
          logger.error('Failed to initialize bot');
          process.exit(1);
        }
        
        const testSuccess = await bot.runTest();
        logger.botAction('Test completed', { success: testSuccess });
        break;
        
      case 'start':
      default:
        logger.botAction('Starting LinkedIn Bot in FULL mode');
        bot = new LinkedInBot();
        
        const initialized = await bot.initialize();
        if (!initialized) {
          logger.error('Failed to initialize bot');
          process.exit(1);
        }
        
        const success = await bot.start();
        logger.botAction('Bot execution completed', { success });
        break;
    }
    
    // Show final statistics
    if (bot) {
      const stats = bot.getStats();
      logger.botAction('Final Statistics', stats);
    }
    
  } catch (error) {
    logger.error('Application error:', error);
    process.exit(1);
  }
}

/**
 * Startup banner
 */
function showBanner() {
  console.log(`
┌─────────────────────────────────────────────────┐
│           LinkedIn Job Automation Bot           │
│                                                 │
│  🤖 AI-Powered Job Application Automation      │  
│  🔍 Intelligent Job Search & Email Generation  │
│  👤 Human-like Behavior Simulation             │
│                                                 │
│  Author: Anish Kumar Pandey                    │
│  Version: 1.0.0                                │
└─────────────────────────────────────────────────┘

Starting up...
`);
}

// Run the application
if (require.main === module) {
  showBanner();
  main().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = main; 