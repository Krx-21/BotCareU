const Device = require('../models/Device');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

class DeviceController {
  // Get all devices for the current user
  async getDevices(req, res, next) {
    try {
      const userId = req.user.id;
      const devices = await Device.findByUserId(userId);

      // Add health status to each device
      const devicesWithHealth = devices.map(device => ({
        ...device,
        healthStatus: device.getHealthStatus(),
        isOnline: device.isOnline()
      }));

      res.json({
        success: true,
        data: devicesWithHealth
      });
    } catch (error) {
      logger.error('Get devices error:', error);
      next(error);
    }
  }

  // Get a specific device
  async getDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      const device = await Device.query()
        .findById(deviceId)
        .where('userId', userId)
        .where('isActive', true);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found'
          }
        });
      }

      res.json({
        success: true,
        data: {
          ...device,
          healthStatus: device.getHealthStatus(),
          isOnline: device.isOnline()
        }
      });
    } catch (error) {
      logger.error('Get device error:', error);
      next(error);
    }
  }

  // Pair a new device
  async pairDevice(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { deviceId, pairingCode, name } = req.body;
      const userId = req.user.id;

      // Check if device already exists
      const existingDevice = await Device.findByDeviceId(deviceId);
      if (existingDevice) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DEVICE_ALREADY_PAIRED',
            message: 'Device is already paired with an account'
          }
        });
      }

      // In a production environment, you would verify the pairing code
      // For now, we'll accept any 6-digit code
      if (!pairingCode || pairingCode.length !== 6) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAIRING_CODE',
            message: 'Invalid pairing code'
          }
        });
      }

      // Check device limit per user
      const userDevices = await Device.findByUserId(userId);
      const maxDevicesPerUser = 5; // From config
      
      if (userDevices.length >= maxDevicesPerUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DEVICE_LIMIT_EXCEEDED',
            message: `Maximum of ${maxDevicesPerUser} devices allowed per user`
          }
        });
      }

      // Create new device
      const deviceData = {
        deviceId,
        userId,
        name,
        status: 'offline',
        settings: {
          measurementInterval: 60000,
          feverThreshold: 37.5,
          alertsEnabled: true,
          autoMeasurement: true,
          displayBrightness: 80,
          soundEnabled: true
        }
      };

      const device = await Device.createDevice(deviceData);

      logger.info(`Device paired: ${deviceId} to user: ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: device
      });
    } catch (error) {
      logger.error('Pair device error:', error);
      next(error);
    }
  }

  // Update device settings
  async updateDevice(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { deviceId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      // Find device
      const device = await Device.query()
        .findById(deviceId)
        .where('userId', userId)
        .where('isActive', true);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found'
          }
        });
      }

      // Update device
      const updatedDevice = await Device.updateDevice(deviceId, updateData);

      logger.info(`Device updated: ${device.deviceId} by user: ${req.user.email}`);

      res.json({
        success: true,
        data: updatedDevice
      });
    } catch (error) {
      logger.error('Update device error:', error);
      next(error);
    }
  }

  // Remove device
  async removeDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      // Find device
      const device = await Device.query()
        .findById(deviceId)
        .where('userId', userId)
        .where('isActive', true);

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found'
          }
        });
      }

      // Soft delete device
      await Device.deleteDevice(deviceId);

      logger.info(`Device removed: ${device.deviceId} by user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Device removed successfully'
      });
    } catch (error) {
      logger.error('Remove device error:', error);
      next(error);
    }
  }

  // Update device status (typically called by IoT device)
  async updateDeviceStatus(req, res, next) {
    try {
      const { deviceId } = req.params;
      const { status, batteryLevel, signalStrength, firmwareVersion } = req.body;

      // Find device by deviceId (not UUID)
      const device = await Device.findByDeviceId(deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found'
          }
        });
      }

      // Update device status
      const updateData = {
        status,
        lastSeen: new Date().toISOString()
      };

      if (batteryLevel !== undefined) updateData.batteryLevel = batteryLevel;
      if (signalStrength !== undefined) updateData.signalStrength = signalStrength;
      if (firmwareVersion !== undefined) updateData.firmwareVersion = firmwareVersion;

      await device.updateStatus(status, updateData);

      res.json({
        success: true,
        message: 'Device status updated'
      });
    } catch (error) {
      logger.error('Update device status error:', error);
      next(error);
    }
  }

  // Get device statistics (admin only)
  async getDeviceStats(req, res, next) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
      }

      const stats = await Device.getDeviceStats();
      const onlineDevices = await Device.getOnlineDevices();

      res.json({
        success: true,
        data: {
          statusDistribution: stats,
          onlineCount: onlineDevices.length,
          totalDevices: Object.values(stats).reduce((sum, count) => sum + count, 0)
        }
      });
    } catch (error) {
      logger.error('Get device stats error:', error);
      next(error);
    }
  }

  // Generate pairing code for device (admin only)
  async generatePairingCode(req, res, next) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
      }

      // Generate 6-digit pairing code
      const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // In a production environment, you would:
      // 1. Store the pairing code with expiration
      // 2. Associate it with a specific device
      // 3. Implement code verification logic

      res.json({
        success: true,
        data: {
          pairingCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        }
      });
    } catch (error) {
      logger.error('Generate pairing code error:', error);
      next(error);
    }
  }
}

module.exports = new DeviceController();
