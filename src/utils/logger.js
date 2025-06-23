const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const { config } = require('../config/config');

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file);
fs.ensureDirSync(logsDir);

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add custom methods for bot-specific logging
logger.botAction = (action, details = {}) => {
  logger.info(`BOT ACTION: ${action}`, details);
};

logger.botError = (action, error, details = {}) => {
  logger.error(`BOT ERROR in ${action}:`, { error: error.message, stack: error.stack, ...details });
};

logger.humanBehavior = (behavior, details = {}) => {
  logger.debug(`HUMAN BEHAVIOR: ${behavior}`, details);
};

logger.emailSent = (to, subject, success = true, details = {}) => {
  const level = success ? 'info' : 'error';
  logger[level](`EMAIL ${success ? 'SENT' : 'FAILED'}:`, { to, subject, ...details });
};

logger.jobProcessed = (jobData, action, success = true) => {
  const level = success ? 'info' : 'warn';
  logger[level](`JOB ${action.toUpperCase()}:`, {
    company: jobData.company,
    position: jobData.position,
    email: jobData.email,
    success
  });
};

logger.sessionStart = (sessionId, config) => {
  logger.info('SESSION STARTED:', { sessionId, config });
};

logger.sessionEnd = (sessionId, stats) => {
  logger.info('SESSION ENDED:', { sessionId, stats });
};

// Performance logging
logger.performance = {
  start: (operation) => {
    const startTime = Date.now();
    return {
      end: (success = true, details = {}) => {
        const duration = Date.now() - startTime;
        logger.info(`PERFORMANCE: ${operation}`, {
          duration: `${duration}ms`,
          success,
          ...details
        });
      }
    };
  }
};

// Rate limiting logging
logger.rateLimited = (action, nextAllowedTime) => {
  logger.warn(`RATE LIMITED: ${action}`, {
    nextAllowedTime: new Date(nextAllowedTime).toISOString(),
    waitTime: nextAllowedTime - Date.now()
  });
};

// Security logging
logger.security = {
  detected: (reason, details = {}) => {
    logger.error('SECURITY DETECTION:', { reason, ...details });
  },
  
  blocked: (action, reason) => {
    logger.warn('ACTION BLOCKED:', { action, reason });
  },
  
  suspicious: (activity, details = {}) => {
    logger.warn('SUSPICIOUS ACTIVITY:', { activity, ...details });
  }
};

module.exports = logger; 