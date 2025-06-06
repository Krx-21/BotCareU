const { Model } = require('objection');

class Device extends Model {
  static get tableName() {
    return 'devices';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['deviceId', 'userId', 'name'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        deviceId: { type: 'string', minLength: 1, maxLength: 100 },
        userId: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        status: { 
          type: 'string', 
          enum: ['online', 'offline', 'error', 'maintenance'], 
          default: 'offline' 
        },
        batteryLevel: { type: 'number', minimum: 0, maximum: 100 },
        signalStrength: { type: 'number', minimum: -100, maximum: 0 },
        firmwareVersion: { type: 'string' },
        lastSeen: { type: 'string', format: 'date-time' },
        location: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' }
          }
        },
        settings: {
          type: 'object',
          properties: {
            measurementInterval: { type: 'number', minimum: 10000, default: 60000 },
            feverThreshold: { type: 'number', minimum: 35, maximum: 42, default: 37.5 },
            alertsEnabled: { type: 'boolean', default: true },
            autoMeasurement: { type: 'boolean', default: true },
            displayBrightness: { type: 'number', minimum: 0, maximum: 100, default: 80 },
            soundEnabled: { type: 'boolean', default: true }
          }
        },
        calibration: {
          type: 'object',
          properties: {
            infraredOffset: { type: 'number', default: 0 },
            contactOffset: { type: 'number', default: 0 },
            lastCalibrated: { type: 'string', format: 'date-time' }
          }
        },
        isActive: { type: 'boolean', default: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const User = require('./User');
    const TemperatureReading = require('./TemperatureReading');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'devices.userId',
          to: 'users.id'
        }
      },
      temperatureReadings: {
        relation: Model.HasManyRelation,
        modelClass: TemperatureReading,
        join: {
          from: 'devices.id',
          to: 'temperature_readings.deviceId'
        }
      }
    };
  }

  async $beforeInsert(context) {
    await super.$beforeInsert(context);
    
    const now = new Date().toISOString();
    this.createdAt = now;
    this.updatedAt = now;
    
    // Set default settings if not provided
    if (!this.settings) {
      this.settings = {
        measurementInterval: 60000,
        feverThreshold: 37.5,
        alertsEnabled: true,
        autoMeasurement: true,
        displayBrightness: 80,
        soundEnabled: true
      };
    }

    // Set default calibration if not provided
    if (!this.calibration) {
      this.calibration = {
        infraredOffset: 0,
        contactOffset: 0,
        lastCalibrated: now
      };
    }
  }

  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context);
    this.updatedAt = new Date().toISOString();
  }

  // Update device status
  async updateStatus(status, additionalData = {}) {
    const updateData = {
      status,
      lastSeen: new Date().toISOString(),
      ...additionalData
    };

    return this.$query().patch(updateData);
  }

  // Update battery level
  async updateBattery(batteryLevel) {
    return this.$query().patch({
      batteryLevel,
      lastSeen: new Date().toISOString()
    });
  }

  // Update signal strength
  async updateSignalStrength(signalStrength) {
    return this.$query().patch({
      signalStrength,
      lastSeen: new Date().toISOString()
    });
  }

  // Check if device is online (last seen within 5 minutes)
  isOnline() {
    if (!this.lastSeen) return false;
    
    const lastSeenTime = new Date(this.lastSeen);
    const now = new Date();
    const diffMinutes = (now - lastSeenTime) / (1000 * 60);
    
    return diffMinutes <= 5;
  }

  // Get device health status
  getHealthStatus() {
    const health = {
      overall: 'good',
      issues: []
    };

    // Check battery level
    if (this.batteryLevel !== null) {
      if (this.batteryLevel < 20) {
        health.issues.push('Low battery');
        health.overall = 'warning';
      }
      if (this.batteryLevel < 10) {
        health.overall = 'critical';
      }
    }

    // Check signal strength
    if (this.signalStrength !== null) {
      if (this.signalStrength < -80) {
        health.issues.push('Weak signal');
        if (health.overall === 'good') health.overall = 'warning';
      }
    }

    // Check if device is offline
    if (!this.isOnline()) {
      health.issues.push('Device offline');
      health.overall = 'critical';
    }

    return health;
  }

  // Static methods
  static async findByDeviceId(deviceId) {
    return this.query().findOne({ deviceId });
  }

  static async findByUserId(userId) {
    return this.query().where('userId', userId).where('isActive', true);
  }

  static async createDevice(deviceData) {
    return this.query().insert(deviceData);
  }

  static async updateDevice(id, deviceData) {
    return this.query().patchAndFetchById(id, deviceData);
  }

  static async deleteDevice(id) {
    return this.query().patchAndFetchById(id, { isActive: false });
  }

  static async getDeviceStats() {
    const stats = await this.query()
      .select('status')
      .count('* as count')
      .where('isActive', true)
      .groupBy('status');

    return stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {});
  }

  static async getOnlineDevices() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    return this.query()
      .where('isActive', true)
      .where('lastSeen', '>', fiveMinutesAgo);
  }
}

module.exports = Device;
