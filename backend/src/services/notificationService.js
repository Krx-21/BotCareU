const Notification = require('../models/Notification');
const websocketService = require('./websocketService');
const logger = require('../utils/logger');
const config = require('../config/config');

class NotificationService {
  constructor() {
    this.initialized = false;
    this.retryQueue = [];
    this.retryInterval = null;
  }

  async initialize() {
    try {
      // Start retry processor
      this.startRetryProcessor();
      
      this.initialized = true;
      logger.info('Notification service initialized');
    } catch (error) {
      logger.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  // Send notification through multiple channels
  async sendNotification(notificationData) {
    try {
      // Create notification record
      const notification = await Notification.createNotification(notificationData);
      
      // Send through each requested channel
      const deliveryPromises = notification.channels.map(channel => 
        this.sendThroughChannel(notification, channel)
      );

      await Promise.allSettled(deliveryPromises);
      
      return notification;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send notification through specific channel
  async sendThroughChannel(notification, channel) {
    try {
      let success = false;
      let error = null;

      switch (channel) {
        case 'websocket':
          success = await this.sendWebSocketNotification(notification);
          break;
        case 'push':
          success = await this.sendPushNotification(notification);
          break;
        case 'email':
          success = await this.sendEmailNotification(notification);
          break;
        case 'sms':
          success = await this.sendSMSNotification(notification);
          break;
        default:
          error = `Unknown channel: ${channel}`;
      }

      // Update delivery status
      await notification.updateDeliveryStatus(channel, {
        sent: success,
        error: error
      });

      if (!success && !error) {
        error = 'Unknown delivery failure';
      }

      if (error) {
        logger.warn(`Failed to send notification via ${channel}:`, error);
        
        // Add to retry queue if retries are available
        if (notification.shouldRetry()) {
          this.retryQueue.push({ notification, channel });
        }
      }

      return success;
    } catch (err) {
      logger.error(`Error sending notification via ${channel}:`, err);
      
      await notification.updateDeliveryStatus(channel, {
        sent: false,
        error: err.message
      });

      return false;
    }
  }

  // Send WebSocket notification
  async sendWebSocketNotification(notification) {
    try {
      const success = websocketService.sendNotification(notification.userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        data: notification.data
      });

      return success;
    } catch (error) {
      logger.error('WebSocket notification error:', error);
      return false;
    }
  }

  // Send push notification
  async sendPushNotification(notification) {
    try {
      // Placeholder for push notification implementation
      // In production, integrate with FCM, APNS, etc.
      
      logger.info(`Push notification sent: ${notification.title}`);
      return true;
    } catch (error) {
      logger.error('Push notification error:', error);
      return false;
    }
  }

  // Send email notification
  async sendEmailNotification(notification) {
    try {
      // Placeholder for email notification implementation
      // In production, integrate with SendGrid, SES, etc.
      
      if (!config.email.sendgridApiKey) {
        logger.warn('Email service not configured');
        return false;
      }

      logger.info(`Email notification sent: ${notification.title}`);
      return true;
    } catch (error) {
      logger.error('Email notification error:', error);
      return false;
    }
  }

  // Send SMS notification
  async sendSMSNotification(notification) {
    try {
      // Placeholder for SMS notification implementation
      // In production, integrate with Twilio, AWS SNS, etc.
      
      if (!config.sms.twilioAccountSid) {
        logger.warn('SMS service not configured');
        return false;
      }

      logger.info(`SMS notification sent: ${notification.title}`);
      return true;
    } catch (error) {
      logger.error('SMS notification error:', error);
      return false;
    }
  }

  // Create fever alert notification
  async createFeverAlert(userId, deviceId, temperature, readingId) {
    try {
      let severity = 'mild';
      let priority = 'normal';
      let channels = ['websocket', 'push'];
      let message = `Temperature reading of ${temperature}°C detected`;

      if (temperature >= 40.0) {
        severity = 'critical';
        priority = 'critical';
        channels = ['websocket', 'push', 'email', 'sms'];
        message = `CRITICAL: Very high fever detected (${temperature}°C). Seek immediate medical attention.`;
      } else if (temperature >= 39.0) {
        severity = 'high';
        priority = 'high';
        channels = ['websocket', 'push', 'email'];
        message = `HIGH FEVER: Temperature of ${temperature}°C detected. Consider medical consultation.`;
      } else if (temperature >= 38.0) {
        severity = 'moderate';
        priority = 'normal';
        message = `Moderate fever detected (${temperature}°C). Monitor closely.`;
      }

      const notificationData = {
        userId,
        type: 'fever_alert',
        title: 'Fever Detected',
        message,
        priority,
        data: {
          deviceId,
          temperature,
          readingId,
          severity
        },
        channels
      };

      return await this.sendNotification(notificationData);
    } catch (error) {
      logger.error('Error creating fever alert:', error);
      throw error;
    }
  }

  // Create device offline notification
  async createDeviceOfflineAlert(userId, deviceId, deviceName) {
    const notificationData = {
      userId,
      type: 'device_offline',
      title: 'Device Offline',
      message: `Device "${deviceName}" has gone offline and is no longer sending data.`,
      priority: 'normal',
      data: {
        deviceId,
        deviceName
      },
      channels: ['websocket', 'push']
    };

    return await this.sendNotification(notificationData);
  }

  // Create low battery notification
  async createLowBatteryAlert(userId, deviceId, deviceName, batteryLevel) {
    const priority = batteryLevel < 10 ? 'high' : 'normal';
    const message = batteryLevel < 10 
      ? `Device "${deviceName}" battery is critically low (${batteryLevel}%). Please charge immediately.`
      : `Device "${deviceName}" battery is low (${batteryLevel}%). Please charge soon.`;

    const notificationData = {
      userId,
      type: 'low_battery',
      title: 'Low Battery Warning',
      message,
      priority,
      data: {
        deviceId,
        deviceName,
        batteryLevel
      },
      channels: ['websocket', 'push']
    };

    return await this.sendNotification(notificationData);
  }

  // Start retry processor
  startRetryProcessor() {
    this.retryInterval = setInterval(async () => {
      if (this.retryQueue.length === 0) return;

      const retryItems = this.retryQueue.splice(0, 10); // Process up to 10 items at a time
      
      for (const item of retryItems) {
        try {
          await item.notification.incrementRetryCount();
          await this.sendThroughChannel(item.notification, item.channel);
        } catch (error) {
          logger.error('Error in retry processor:', error);
        }
      }
    }, config.notifications.retryDelay);
  }

  // Stop retry processor
  stopRetryProcessor() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  // Get service statistics
  getStats() {
    return {
      initialized: this.initialized,
      retryQueueSize: this.retryQueue.length
    };
  }

  // Cleanup expired notifications
  async cleanupExpiredNotifications() {
    try {
      const expiredCount = await Notification.cleanupExpiredNotifications();
      logger.info(`Cleaned up ${expiredCount} expired notifications`);
      return expiredCount;
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }

  // Shutdown service
  async shutdown() {
    this.stopRetryProcessor();
    this.initialized = false;
    logger.info('Notification service shut down');
  }
}

module.exports = new NotificationService();
