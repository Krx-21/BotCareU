const express = require('express');
const { body, query } = require('express-validator');
const { authenticate, authenticateDevice } = require('../middleware/auth');
const TemperatureReading = require('../models/TemperatureReading');
const Device = require('../models/Device');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

// Get temperature readings
router.get('/readings', authenticate, [
  query('deviceId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array()
        }
      });
    }

    const {
      deviceId,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    const userId = req.user.id;

    let query = TemperatureReading.query()
      .where('userId', userId)
      .orderBy('timestamp', 'desc');

    if (deviceId) {
      query = query.where('deviceId', deviceId);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    const readings = await query
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const totalCount = await TemperatureReading.query()
      .where('userId', userId)
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        readings,
        pagination: {
          total: parseInt(totalCount.count),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + readings.length < parseInt(totalCount.count)
        }
      }
    });
  } catch (error) {
    logger.error('Get readings error:', error);
    next(error);
  }
});

// Create temperature reading (for IoT devices)
router.post('/readings', authenticateDevice, [
  body('deviceId').trim().notEmpty(),
  body('infraredTemp').optional().isFloat({ min: 20, max: 50 }),
  body('contactTemp').optional().isFloat({ min: 20, max: 50 }),
  body('ambientTemp').optional().isFloat({ min: -10, max: 60 }),
  body('measurementType').isIn(['infrared', 'contact', 'combined']),
  body('timestamp').optional().isISO8601(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid reading data',
          details: errors.array()
        }
      });
    }

    const readingData = req.body;
    
    // Find device
    const device = await Device.findByDeviceId(readingData.deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: 'Device not found'
        }
      });
    }

    // Add device and user IDs
    readingData.deviceId = device.id;
    readingData.userId = device.userId;

    const reading = await TemperatureReading.createReading(readingData);

    logger.info(`Temperature reading created: ${reading.temperature}°C from device ${device.deviceId}`);

    res.status(201).json({
      success: true,
      data: reading
    });
  } catch (error) {
    logger.error('Create reading error:', error);
    next(error);
  }
});

// Get temperature analytics
router.get('/analytics', authenticate, [
  query('deviceId').optional().isUUID(),
  query('period').optional().isIn(['day', 'week', 'month', 'year']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array()
        }
      });
    }

    const { deviceId, period = 'week' } = req.query;
    const userId = req.user.id;

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Get temperature statistics
    const stats = await TemperatureReading.getTemperatureStats(userId, 
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

    // Get hourly averages
    const hourlyAverages = await TemperatureReading.getHourlyAverages(userId, 7);

    res.json({
      success: true,
      data: {
        summary: stats,
        hourlyPattern: hourlyAverages,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    next(error);
  }
});

module.exports = router;
