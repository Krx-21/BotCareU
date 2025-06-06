const winston = require('winston');
const path = require('path');
const config = require('../config/config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Add file transport in production
if (config.server.nodeEnv === 'production') {
  // Ensure logs directory exists
  const fs = require('fs');
  const logsDir = path.dirname(config.logging.file);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Combined log file
    new winston.transports.File({
      filename: config.logging.file,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Add custom methods for specific use cases
logger.logUserAction = (userId, action, details = {}) => {
  logger.info(`User Action: ${action}`, {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

logger.logDeviceEvent = (deviceId, event, details = {}) => {
  logger.info(`Device Event: ${event}`, {
    deviceId,
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

logger.logTemperatureReading = (deviceId, temperature, feverDetected = false) => {
  const level = feverDetected ? 'warn' : 'info';
  logger.log(level, `Temperature Reading: ${temperature}°C`, {
    deviceId,
    temperature,
    feverDetected,
    timestamp: new Date().toISOString()
  });
};

logger.logSecurityEvent = (event, details = {}) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

logger.logAPIRequest = (method, url, statusCode, responseTime, userId = null) => {
  logger.http(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
    method,
    url,
    statusCode,
    responseTime,
    userId,
    timestamp: new Date().toISOString()
  });
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context,
    timestamp: new Date().toISOString()
  });
};

// Handle uncaught exceptions and unhandled rejections
if (config.server.nodeEnv === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({ 
      filename: path.join(path.dirname(config.logging.file), 'exceptions.log') 
    })
  );

  logger.rejections.handle(
    new winston.transports.File({ 
      filename: path.join(path.dirname(config.logging.file), 'rejections.log') 
    })
  );
}

module.exports = logger;
