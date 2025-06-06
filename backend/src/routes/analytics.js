const express = require('express');
const { query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const TemperatureReading = require('../models/TemperatureReading');
const Device = require('../models/Device');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

// Get user analytics
router.get('/user', authenticate, [
  query('period').optional().isIn(['day', 'week', 'month', 'year']),
  query('deviceId').optional().isUUID(),
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

    const { period = 'month', deviceId } = req.query;
    const userId = req.user.id;

    // Calculate days based on period
    let days;
    switch (period) {
      case 'day': days = 1; break;
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'year': days = 365; break;
      default: days = 30;
    }

    // Get temperature statistics
    const tempStats = await TemperatureReading.getTemperatureStats(userId, days);
    
    // Get fever readings
    const feverReadings = await TemperatureReading.getFeverReadings(userId, days);
    
    // Get hourly patterns
    const hourlyPattern = await TemperatureReading.getHourlyAverages(userId, Math.min(days, 7));

    // Get device-specific data if requested
    let deviceData = null;
    if (deviceId) {
      const deviceReadings = await TemperatureReading.getReadingsByDevice(deviceId, 100);
      deviceData = {
        deviceId,
        recentReadings: deviceReadings.length,
        latestReading: deviceReadings[0] || null
      };
    }

    res.json({
      success: true,
      data: {
        period,
        days,
        temperatureStats: tempStats,
        feverReadings: feverReadings.map(reading => ({
          temperature: reading.temperature,
          severity: reading.feverSeverity,
          timestamp: reading.timestamp,
          deviceId: reading.deviceId
        })),
        hourlyPattern,
        deviceData
      }
    });
  } catch (error) {
    logger.error('Get user analytics error:', error);
    next(error);
  }
});

// Get system analytics (admin only)
router.get('/system', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    // Get user statistics
    const userStats = await User.getUserStats();
    
    // Get device statistics
    const deviceStats = await Device.getDeviceStats();
    
    // Get online devices
    const onlineDevices = await Device.getOnlineDevices();

    // Calculate total readings in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const totalReadings = await TemperatureReading.query()
      .where('timestamp', '>=', thirtyDaysAgo.toISOString())
      .count('* as count')
      .first();

    // Calculate fever alerts in the last 30 days
    const feverAlerts = await TemperatureReading.query()
      .where('timestamp', '>=', thirtyDaysAgo.toISOString())
      .where('feverDetected', true)
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        period,
        users: {
          total: Object.values(userStats).reduce((sum, count) => sum + count, 0),
          byRole: userStats
        },
        devices: {
          total: Object.values(deviceStats).reduce((sum, count) => sum + count, 0),
          online: onlineDevices.length,
          byStatus: deviceStats
        },
        readings: {
          total: parseInt(totalReadings.count),
          feverAlerts: parseInt(feverAlerts.count),
          period: '30 days'
        }
      }
    });
  } catch (error) {
    logger.error('Get system analytics error:', error);
    next(error);
  }
});

// Get health trends
router.get('/trends', authenticate, [
  query('metric').optional().isIn(['temperature', 'fever_rate', 'device_usage']),
  query('period').optional().isIn(['day', 'week', 'month']),
  query('groupBy').optional().isIn(['hour', 'day', 'week']),
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
      metric = 'temperature', 
      period = 'week',
      groupBy = 'day'
    } = req.query;
    
    const userId = req.user.id;

    // Calculate date range
    let days;
    switch (period) {
      case 'day': days = 1; break;
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      default: days = 7;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let trendData = [];

    if (metric === 'temperature') {
      // Get temperature trends
      const readings = await TemperatureReading.query()
        .where('userId', userId)
        .where('timestamp', '>=', startDate.toISOString())
        .where('isValid', true)
        .orderBy('timestamp', 'asc');

      // Group by specified interval
      const groupedData = {};
      readings.forEach(reading => {
        const date = new Date(reading.timestamp);
        let key;
        
        if (groupBy === 'hour') {
          key = date.toISOString().substring(0, 13) + ':00:00.000Z';
        } else if (groupBy === 'day') {
          key = date.toISOString().substring(0, 10);
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().substring(0, 10);
        }

        if (!groupedData[key]) {
          groupedData[key] = { temps: [], count: 0 };
        }
        groupedData[key].temps.push(reading.temperature);
        groupedData[key].count++;
      });

      trendData = Object.entries(groupedData).map(([key, data]) => ({
        timestamp: key,
        averageTemp: data.temps.reduce((sum, temp) => sum + temp, 0) / data.temps.length,
        minTemp: Math.min(...data.temps),
        maxTemp: Math.max(...data.temps),
        readingCount: data.count
      }));
    }

    res.json({
      success: true,
      data: {
        metric,
        period,
        groupBy,
        trends: trendData
      }
    });
  } catch (error) {
    logger.error('Get trends error:', error);
    next(error);
  }
});

module.exports = router;
