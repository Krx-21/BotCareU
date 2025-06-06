const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const config = require('./config/config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const deviceRoutes = require('./routes/devices');
const temperatureRoutes = require('./routes/temperature');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');

// Import services
const mqttService = require('./services/mqttService');
const websocketService = require('./services/websocketService');
const notificationService = require('./services/notificationService');
const databaseService = require('./services/databaseService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.security.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  next();
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/temperature', temperatureRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'BotCareU API',
    version: '1.0.0-alpha',
    description: 'IoT Health Monitoring System API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} was not found on this server.`
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Initialize database connections
    await databaseService.initialize();
    logger.info('Database connections initialized');

    // Initialize MQTT service
    await mqttService.initialize();
    logger.info('MQTT service initialized');

    // Initialize WebSocket service
    websocketService.initialize(io);
    logger.info('WebSocket service initialized');

    // Initialize notification service
    await notificationService.initialize();
    logger.info('Notification service initialized');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    await databaseService.close();
    await mqttService.close();
    logger.info('Services closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    await databaseService.close();
    await mqttService.close();
    logger.info('Services closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
const PORT = config.server.port || 3001;

server.listen(PORT, async () => {
  logger.info(`BotCareU API server running on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
  
  // Initialize services after server starts
  await initializeServices();
});

module.exports = { app, server, io };
