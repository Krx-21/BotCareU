const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const config = require('../config/config');

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0-alpha',
      uptime: process.uptime(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        mqtt: 'healthy',
        influxdb: 'healthy'
      }
    };

    // Check database connection
    try {
      const User = require('../models/User');
      await User.query().limit(1);
    } catch (error) {
      healthStatus.services.database = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed'
      }
    });
  }
});

// Detailed health check (admin only)
router.get('/detailed', authenticate, authorize('admin'), async (req, res) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0-alpha',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      services: {},
      environment: config.server.nodeEnv
    };

    res.json({
      success: true,
      data: detailedHealth
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DETAILED_HEALTH_CHECK_FAILED',
        message: 'Detailed health check failed'
      }
    });
  }
});

module.exports = router;
