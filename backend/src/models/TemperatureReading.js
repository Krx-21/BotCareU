const { Model } = require('objection');

class TemperatureReading extends Model {
  static get tableName() {
    return 'temperature_readings';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['deviceId', 'userId', 'temperature', 'measurementType'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        deviceId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        infraredTemp: { type: 'number', minimum: 20, maximum: 50 },
        contactTemp: { type: 'number', minimum: 20, maximum: 50 },
        ambientTemp: { type: 'number', minimum: -10, maximum: 60 },
        temperature: { type: 'number', minimum: 20, maximum: 50 },
        measurementType: { 
          type: 'string', 
          enum: ['infrared', 'contact', 'combined'] 
        },
        accuracy: { type: 'number', minimum: 0, maximum: 1 },
        isValid: { type: 'boolean', default: true },
        feverDetected: { type: 'boolean', default: false },
        feverSeverity: { 
          type: 'string', 
          enum: ['none', 'mild', 'moderate', 'high', 'critical'],
          default: 'none'
        },
        location: {
          type: 'object',
          properties: {
            bodyPart: { 
              type: 'string', 
              enum: ['forehead', 'wrist', 'oral', 'ear', 'armpit'] 
            },
            coordinates: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' }
              }
            }
          }
        },
        metadata: {
          type: 'object',
          properties: {
            batteryLevel: { type: 'number' },
            signalStrength: { type: 'number' },
            firmwareVersion: { type: 'string' },
            calibrationOffset: { type: 'number' },
            measurementDuration: { type: 'number' },
            retryCount: { type: 'number', default: 0 }
          }
        },
        timestamp: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const User = require('./User');
    const Device = require('./Device');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'temperature_readings.userId',
          to: 'users.id'
        }
      },
      device: {
        relation: Model.BelongsToOneRelation,
        modelClass: Device,
        join: {
          from: 'temperature_readings.deviceId',
          to: 'devices.id'
        }
      }
    };
  }

  async $beforeInsert(context) {
    await super.$beforeInsert(context);
    
    const now = new Date().toISOString();
    this.createdAt = now;
    this.updatedAt = now;
    
    // Set timestamp if not provided
    if (!this.timestamp) {
      this.timestamp = now;
    }

    // Determine primary temperature and fever status
    this.determinePrimaryTemperature();
    this.detectFever();
  }

  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context);
    this.updatedAt = new Date().toISOString();
    
    // Re-evaluate fever status if temperature changed
    this.detectFever();
  }

  // Determine the primary temperature reading
  determinePrimaryTemperature() {
    if (this.measurementType === 'combined') {
      // Use contact temperature if available, otherwise infrared
      this.temperature = this.contactTemp || this.infraredTemp;
    } else if (this.measurementType === 'contact') {
      this.temperature = this.contactTemp;
    } else if (this.measurementType === 'infrared') {
      this.temperature = this.infraredTemp;
    }
  }

  // Detect fever and set severity
  detectFever() {
    if (!this.temperature) return;

    const temp = this.temperature;
    
    if (temp >= 40.0) {
      this.feverDetected = true;
      this.feverSeverity = 'critical';
    } else if (temp >= 39.0) {
      this.feverDetected = true;
      this.feverSeverity = 'high';
    } else if (temp >= 38.0) {
      this.feverDetected = true;
      this.feverSeverity = 'moderate';
    } else if (temp >= 37.5) {
      this.feverDetected = true;
      this.feverSeverity = 'mild';
    } else {
      this.feverDetected = false;
      this.feverSeverity = 'none';
    }
  }

  // Validate temperature reading
  validateReading() {
    const issues = [];

    // Check temperature ranges
    if (this.temperature < 30 || this.temperature > 45) {
      issues.push('Temperature out of normal range');
    }

    // Check for significant difference between sensors
    if (this.infraredTemp && this.contactTemp) {
      const diff = Math.abs(this.infraredTemp - this.contactTemp);
      if (diff > 2.0) {
        issues.push('Large discrepancy between sensors');
      }
    }

    // Check ambient temperature
    if (this.ambientTemp && (this.ambientTemp < 10 || this.ambientTemp > 40)) {
      issues.push('Extreme ambient temperature');
    }

    this.isValid = issues.length === 0;
    return { isValid: this.isValid, issues };
  }

  // Convert temperature to different units
  convertTemperature(unit) {
    if (!this.temperature) return null;

    if (unit === 'fahrenheit') {
      return (this.temperature * 9/5) + 32;
    }
    return this.temperature; // Celsius is default
  }

  // Static methods
  static async createReading(readingData) {
    return this.query().insert(readingData);
  }

  static async getReadingsByDevice(deviceId, limit = 100, offset = 0) {
    return this.query()
      .where('deviceId', deviceId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset);
  }

  static async getReadingsByUser(userId, limit = 100, offset = 0) {
    return this.query()
      .where('userId', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset);
  }

  static async getReadingsInRange(deviceId, startDate, endDate) {
    return this.query()
      .where('deviceId', deviceId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .orderBy('timestamp', 'asc');
  }

  static async getFeverReadings(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.query()
      .where('userId', userId)
      .where('feverDetected', true)
      .where('timestamp', '>=', startDate.toISOString())
      .orderBy('timestamp', 'desc');
  }

  static async getTemperatureStats(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.query()
      .where('userId', userId)
      .where('timestamp', '>=', startDate.toISOString())
      .where('isValid', true)
      .select(
        this.raw('AVG(temperature) as avgTemp'),
        this.raw('MIN(temperature) as minTemp'),
        this.raw('MAX(temperature) as maxTemp'),
        this.raw('COUNT(*) as totalReadings'),
        this.raw('COUNT(CASE WHEN fever_detected = true THEN 1 END) as feverCount')
      )
      .first();

    return {
      averageTemp: parseFloat(stats.avgTemp) || 0,
      minTemp: parseFloat(stats.minTemp) || 0,
      maxTemp: parseFloat(stats.maxTemp) || 0,
      totalReadings: parseInt(stats.totalReadings) || 0,
      feverCount: parseInt(stats.feverCount) || 0
    };
  }

  static async getHourlyAverages(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.query()
      .where('userId', userId)
      .where('timestamp', '>=', startDate.toISOString())
      .where('isValid', true)
      .select(
        this.raw('EXTRACT(hour FROM timestamp) as hour'),
        this.raw('AVG(temperature) as avgTemp'),
        this.raw('COUNT(*) as readingCount')
      )
      .groupBy(this.raw('EXTRACT(hour FROM timestamp)'))
      .orderBy('hour');
  }
}

module.exports = TemperatureReading;
