const { Model } = require('objection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

class User extends Model {
  static get tableName() {
    return 'users';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        firstName: { type: 'string', minLength: 1, maxLength: 50 },
        lastName: { type: 'string', minLength: 1, maxLength: 50 },
        dateOfBirth: { type: 'string', format: 'date' },
        gender: { type: 'string', enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
        role: { type: 'string', enum: ['patient', 'healthcare_provider', 'admin'], default: 'patient' },
        isActive: { type: 'boolean', default: true },
        isEmailVerified: { type: 'boolean', default: false },
        preferences: {
          type: 'object',
          properties: {
            temperatureUnit: { type: 'string', enum: ['celsius', 'fahrenheit'], default: 'celsius' },
            feverThreshold: { type: 'number', minimum: 35, maximum: 42, default: 37.5 },
            notificationsEnabled: { type: 'boolean', default: true },
            emailNotifications: { type: 'boolean', default: true },
            smsNotifications: { type: 'boolean', default: false },
            pushNotifications: { type: 'boolean', default: true },
            emergencyContacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  relationship: { type: 'string' }
                }
              }
            }
          }
        },
        lastLoginAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const Device = require('./Device');
    const TemperatureReading = require('./TemperatureReading');
    const Notification = require('./Notification');

    return {
      devices: {
        relation: Model.HasManyRelation,
        modelClass: Device,
        join: {
          from: 'users.id',
          to: 'devices.userId'
        }
      },
      temperatureReadings: {
        relation: Model.HasManyRelation,
        modelClass: TemperatureReading,
        join: {
          from: 'users.id',
          to: 'temperature_readings.userId'
        }
      },
      notifications: {
        relation: Model.HasManyRelation,
        modelClass: Notification,
        join: {
          from: 'users.id',
          to: 'notifications.userId'
        }
      }
    };
  }

  // Instance methods
  async $beforeInsert(context) {
    await super.$beforeInsert(context);
    
    // Hash password before saving
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    
    // Set timestamps
    const now = new Date().toISOString();
    this.createdAt = now;
    this.updatedAt = now;
    
    // Set default preferences if not provided
    if (!this.preferences) {
      this.preferences = {
        temperatureUnit: 'celsius',
        feverThreshold: 37.5,
        notificationsEnabled: true,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        emergencyContacts: []
      };
    }
  }

  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context);
    
    // Hash password if it's being updated
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    
    // Update timestamp
    this.updatedAt = new Date().toISOString();
  }

  // Password verification
  async verifyPassword(password) {
    return bcrypt.compare(password, this.password);
  }

  // Generate JWT tokens
  generateTokens() {
    const payload = {
      id: this.id,
      email: this.email,
      role: this.role
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    const refreshToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn
    });

    return { accessToken, refreshToken };
  }

  // Get user profile (excluding sensitive data)
  getProfile() {
    const { password, ...profile } = this;
    return profile;
  }

  // Check if user has permission
  hasPermission(permission) {
    const rolePermissions = {
      patient: ['read:own_data', 'write:own_data'],
      healthcare_provider: ['read:own_data', 'write:own_data', 'read:patient_data', 'write:patient_data'],
      admin: ['read:all_data', 'write:all_data', 'manage:users', 'manage:devices']
    };

    return rolePermissions[this.role]?.includes(permission) || false;
  }

  // Update last login timestamp
  async updateLastLogin() {
    await this.$query().patch({
      lastLoginAt: new Date().toISOString()
    });
  }

  // Static methods
  static async findByEmail(email) {
    return this.query().findOne({ email: email.toLowerCase() });
  }

  static async findById(id) {
    return this.query().findById(id);
  }

  static async createUser(userData) {
    // Normalize email
    if (userData.email) {
      userData.email = userData.email.toLowerCase();
    }

    return this.query().insert(userData);
  }

  static async updateUser(id, userData) {
    // Normalize email if provided
    if (userData.email) {
      userData.email = userData.email.toLowerCase();
    }

    return this.query().patchAndFetchById(id, userData);
  }

  static async deleteUser(id) {
    return this.query().deleteById(id);
  }

  static async searchUsers(searchTerm, role = null) {
    let query = this.query()
      .where(builder => {
        builder
          .where('firstName', 'ilike', `%${searchTerm}%`)
          .orWhere('lastName', 'ilike', `%${searchTerm}%`)
          .orWhere('email', 'ilike', `%${searchTerm}%`);
      });

    if (role) {
      query = query.where('role', role);
    }

    return query;
  }

  static async getUserStats() {
    const stats = await this.query()
      .select('role')
      .count('* as count')
      .groupBy('role');

    return stats.reduce((acc, stat) => {
      acc[stat.role] = parseInt(stat.count);
      return acc;
    }, {});
  }
}

module.exports = User;
