const mqtt = require('mqtt');
const config = require('../config/config');
const logger = require('../utils/logger');
const TemperatureReading = require('../models/TemperatureReading');
const Device = require('../models/Device');
const notificationService = require('./notificationService');
const websocketService = require('./websocketService');

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  async initialize() {
    try {
      const options = {
        clientId: config.mqtt.clientId,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 5000,
        keepalive: 60
      };

      if (config.mqtt.username) {
        options.username = config.mqtt.username;
        options.password = config.mqtt.password;
      }

      this.client = mqtt.connect(config.mqtt.brokerUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('MQTT client connected');
        this.subscribeToTopics();
      });

      this.client.on('error', (error) => {
        logger.error('MQTT connection error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('MQTT connection closed');
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        logger.info(`MQTT reconnecting... Attempt ${this.reconnectAttempts}`);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('Max MQTT reconnection attempts reached');
          this.client.end();
        }
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize MQTT service:', error);
      throw error;
    }
  }

  subscribeToTopics() {
    const topics = [
      config.mqtt.topics.temperatureReading,
      config.mqtt.topics.deviceStatus,
      config.mqtt.topics.deviceAlerts
    ];

    topics.forEach(topic => {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          logger.error(`Failed to subscribe to topic ${topic}:`, err);
        } else {
          logger.info(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  async handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      const deviceId = this.extractDeviceIdFromTopic(topic);

      if (!deviceId) {
        logger.warn('Could not extract device ID from topic:', topic);
        return;
      }

      // Find device in database
      const device = await Device.findByDeviceId(deviceId);
      if (!device) {
        logger.warn(`Device not found: ${deviceId}`);
        return;
      }

      if (topic.includes('/temperature/reading')) {
        await this.handleTemperatureReading(device, data);
      } else if (topic.includes('/status')) {
        await this.handleDeviceStatus(device, data);
      } else if (topic.includes('/alerts')) {
        await this.handleDeviceAlert(device, data);
      }
    } catch (error) {
      logger.error('Error handling MQTT message:', error);
    }
  }

  async handleTemperatureReading(device, data) {
    try {
      const {
        infraredTemp,
        contactTemp,
        ambientTemp,
        measurementType,
        timestamp,
        metadata
      } = data;

      // Create temperature reading
      const readingData = {
        deviceId: device.id,
        userId: device.userId,
        infraredTemp,
        contactTemp,
        ambientTemp,
        measurementType,
        timestamp: timestamp || new Date().toISOString(),
        metadata: {
          batteryLevel: metadata?.batteryLevel,
          signalStrength: metadata?.signalStrength,
          firmwareVersion: metadata?.firmwareVersion,
          calibrationOffset: metadata?.calibrationOffset || 0,
          measurementDuration: metadata?.measurementDuration,
          retryCount: metadata?.retryCount || 0
        }
      };

      const reading = await TemperatureReading.createReading(readingData);

      // Update device last seen
      await device.updateStatus(device.status, {
        lastSeen: new Date().toISOString(),
        batteryLevel: metadata?.batteryLevel,
        signalStrength: metadata?.signalStrength
      });

      // Check for fever and send notifications
      if (reading.feverDetected) {
        await this.handleFeverDetection(device, reading);
      }

      // Send real-time update via WebSocket
      websocketService.sendToUser(device.userId, 'temperature:update', {
        deviceId: device.deviceId,
        reading: reading,
        device: {
          name: device.name,
          status: device.status
        }
      });

      logger.info(`Temperature reading processed: ${reading.temperature}°C from device ${device.deviceId}`);
    } catch (error) {
      logger.error('Error handling temperature reading:', error);
    }
  }

  async handleDeviceStatus(device, data) {
    try {
      const {
        status,
        batteryLevel,
        signalStrength,
        firmwareVersion,
        uptime,
        freeMemory
      } = data;

      // Update device status
      await device.updateStatus(status, {
        batteryLevel,
        signalStrength,
        firmwareVersion,
        lastSeen: new Date().toISOString()
      });

      // Check for low battery
      if (batteryLevel && batteryLevel < 20) {
        await notificationService.sendNotification({
          userId: device.userId,
          type: 'low_battery',
          title: 'Low Battery Warning',
          message: `Device "${device.name}" battery is at ${batteryLevel}%`,
          priority: batteryLevel < 10 ? 'high' : 'normal',
          data: {
            deviceId: device.deviceId,
            batteryLevel
          }
        });
      }

      // Send device status update via WebSocket
      websocketService.sendToUser(device.userId, 'device:status', {
        deviceId: device.deviceId,
        status,
        batteryLevel,
        signalStrength,
        lastSeen: new Date().toISOString()
      });

      logger.debug(`Device status updated: ${device.deviceId} - ${status}`);
    } catch (error) {
      logger.error('Error handling device status:', error);
    }
  }

  async handleDeviceAlert(device, data) {
    try {
      const { alertType, message, severity, timestamp } = data;

      // Send notification based on alert type
      let notificationData = {
        userId: device.userId,
        type: 'system_alert',
        title: `Device Alert: ${alertType}`,
        message: message || `Alert from device "${device.name}"`,
        priority: severity || 'normal',
        data: {
          deviceId: device.deviceId,
          alertType,
          timestamp: timestamp || new Date().toISOString()
        }
      };

      // Customize notification based on alert type
      if (alertType === 'sensor_error') {
        notificationData.type = 'device_offline';
        notificationData.title = 'Sensor Error';
        notificationData.priority = 'high';
      } else if (alertType === 'calibration_needed') {
        notificationData.title = 'Calibration Required';
        notificationData.message = `Device "${device.name}" requires calibration for accurate readings`;
      }

      await notificationService.sendNotification(notificationData);

      logger.info(`Device alert processed: ${alertType} from device ${device.deviceId}`);
    } catch (error) {
      logger.error('Error handling device alert:', error);
    }
  }

  async handleFeverDetection(device, reading) {
    try {
      // Create fever alert notification
      await notificationService.createFeverAlert(
        device.userId,
        device.deviceId,
        reading.temperature,
        reading.id
      );

      // Send immediate WebSocket notification
      websocketService.sendToUser(device.userId, 'fever:alert', {
        deviceId: device.deviceId,
        temperature: reading.temperature,
        severity: reading.feverSeverity,
        timestamp: reading.timestamp,
        device: {
          name: device.name
        }
      });

      logger.warn(`Fever detected: ${reading.temperature}°C from device ${device.deviceId}`);
    } catch (error) {
      logger.error('Error handling fever detection:', error);
    }
  }

  extractDeviceIdFromTopic(topic) {
    // Extract device ID from topic like: botcareu/device/{device_id}/temperature/reading
    const parts = topic.split('/');
    const deviceIndex = parts.indexOf('device');
    
    if (deviceIndex !== -1 && parts.length > deviceIndex + 1) {
      return parts[deviceIndex + 1];
    }
    
    return null;
  }

  // Publish message to device
  async publishToDevice(deviceId, topic, message, options = {}) {
    if (!this.isConnected) {
      throw new Error('MQTT client is not connected');
    }

    const fullTopic = `botcareu/device/${deviceId}/${topic}`;
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);

    return new Promise((resolve, reject) => {
      this.client.publish(fullTopic, messageString, { qos: 1, ...options }, (err) => {
        if (err) {
          logger.error(`Failed to publish to ${fullTopic}:`, err);
          reject(err);
        } else {
          logger.debug(`Published to ${fullTopic}`);
          resolve();
        }
      });
    });
  }

  // Send configuration to device
  async sendDeviceConfig(deviceId, config) {
    return this.publishToDevice(deviceId, 'config', config);
  }

  // Send command to device
  async sendDeviceCommand(deviceId, command, params = {}) {
    const message = {
      command,
      params,
      timestamp: new Date().toISOString()
    };
    
    return this.publishToDevice(deviceId, 'commands', message);
  }

  async close() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      logger.info('MQTT client disconnected');
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

module.exports = new MQTTService();
