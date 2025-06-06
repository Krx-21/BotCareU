const { Model } = require('objection');

class Notification extends Model {
  static get tableName() {
    return 'notifications';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'type', 'title', 'message'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        type: { 
          type: 'string', 
          enum: [
            'fever_alert',
            'device_offline',
            'low_battery',
            'system_alert',
            'reminder',
            'emergency',
            'info'
          ]
        },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        message: { type: 'string', minLength: 1, maxLength: 1000 },
        priority: { 
          type: 'string', 
          enum: ['low', 'normal', 'high', 'critical'],
          default: 'normal'
        },
        data: {
          type: 'object',
          properties: {
            deviceId: { type: 'string' },
            temperature: { type: 'number' },
            readingId: { type: 'string' },
            actionUrl: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        channels: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['push', 'email', 'sms', 'websocket']
          },
          default: ['push', 'websocket']
        },
        deliveryStatus: {
          type: 'object',
          properties: {
            push: { 
              type: 'object',
              properties: {
                sent: { type: 'boolean', default: false },
                sentAt: { type: 'string', format: 'date-time' },
                error: { type: 'string' }
              }
            },
            email: {
              type: 'object',
              properties: {
                sent: { type: 'boolean', default: false },
                sentAt: { type: 'string', format: 'date-time' },
                error: { type: 'string' }
              }
            },
            sms: {
              type: 'object',
              properties: {
                sent: { type: 'boolean', default: false },
                sentAt: { type: 'string', format: 'date-time' },
                error: { type: 'string' }
              }
            },
            websocket: {
              type: 'object',
              properties: {
                sent: { type: 'boolean', default: false },
                sentAt: { type: 'string', format: 'date-time' },
                error: { type: 'string' }
              }
            }
          }
        },
        isRead: { type: 'boolean', default: false },
        readAt: { type: 'string', format: 'date-time' },
        isArchived: { type: 'boolean', default: false },
        archivedAt: { type: 'string', format: 'date-time' },
        retryCount: { type: 'number', default: 0 },
        maxRetries: { type: 'number', default: 3 },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const User = require('./User');

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'notifications.userId',
          to: 'users.id'
        }
      }
    };
  }

  async $beforeInsert(context) {
    await super.$beforeInsert(context);
    
    const now = new Date().toISOString();
    this.createdAt = now;
    this.updatedAt = now;

    // Initialize delivery status
    if (!this.deliveryStatus) {
      this.deliveryStatus = {};
      this.channels.forEach(channel => {
        this.deliveryStatus[channel] = {
          sent: false,
          sentAt: null,
          error: null
        };
      });
    }
  }

  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context);
    this.updatedAt = new Date().toISOString();
  }

  // Mark notification as read
  async markAsRead() {
    return this.$query().patch({
      isRead: true,
      readAt: new Date().toISOString()
    });
  }

  // Archive notification
  async archive() {
    return this.$query().patch({
      isArchived: true,
      archivedAt: new Date().toISOString()
    });
  }

  // Update delivery status for a specific channel
  async updateDeliveryStatus(channel, status) {
    const deliveryStatus = { ...this.deliveryStatus };
    deliveryStatus[channel] = {
      ...deliveryStatus[channel],
      ...status,
      sentAt: status.sent ? new Date().toISOString() : deliveryStatus[channel].sentAt
    };

    return this.$query().patch({ deliveryStatus });
  }

  // Check if notification should be retried
  shouldRetry() {
    if (this.retryCount >= this.maxRetries) return false;

    // Check if any channel failed to send
    return this.channels.some(channel => {
      const status = this.deliveryStatus[channel];
      return !status.sent && status.error;
    });
  }

  // Increment retry count
  async incrementRetryCount() {
    return this.$query().patch({
      retryCount: this.retryCount + 1
    });
  }

  // Check if notification is expired
  isExpired() {
    if (!this.data?.expiresAt) return false;
    return new Date() > new Date(this.data.expiresAt);
  }

  // Get notification summary for display
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      message: this.message,
      priority: this.priority,
      isRead: this.isRead,
      createdAt: this.createdAt,
      data: this.data
    };
  }

  // Static methods
  static async createNotification(notificationData) {
    return this.query().insert(notificationData);
  }

  static async getNotificationsByUser(userId, options = {}) {
    const {
      unreadOnly = false,
      type = null,
      limit = 50,
      offset = 0,
      includeArchived = false
    } = options;

    let query = this.query()
      .where('userId', userId)
      .orderBy('createdAt', 'desc');

    if (unreadOnly) {
      query = query.where('isRead', false);
    }

    if (type) {
      query = query.where('type', type);
    }

    if (!includeArchived) {
      query = query.where('isArchived', false);
    }

    return query.limit(limit).offset(offset);
  }

  static async getUnreadCount(userId) {
    const result = await this.query()
      .where('userId', userId)
      .where('isRead', false)
      .where('isArchived', false)
      .count('* as count')
      .first();

    return parseInt(result.count) || 0;
  }

  static async markAllAsRead(userId) {
    return this.query()
      .where('userId', userId)
      .where('isRead', false)
      .patch({
        isRead: true,
        readAt: new Date().toISOString()
      });
  }

  static async getFailedNotifications() {
    return this.query()
      .whereRaw(`
        EXISTS (
          SELECT 1 FROM jsonb_each(delivery_status) AS ds(channel, status)
          WHERE (status->>'sent')::boolean = false 
          AND status->>'error' IS NOT NULL
        )
      `)
      .where('retryCount', '<', this.raw('max_retries'));
  }

  static async cleanupExpiredNotifications() {
    const expiredCount = await this.query()
      .whereRaw(`
        (data->>'expiresAt')::timestamp < NOW()
      `)
      .patch({
        isArchived: true,
        archivedAt: new Date().toISOString()
      });

    return expiredCount;
  }

  static async getNotificationStats(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.query()
      .where('userId', userId)
      .where('createdAt', '>=', startDate.toISOString())
      .select('type')
      .count('* as count')
      .groupBy('type');

    return stats.reduce((acc, stat) => {
      acc[stat.type] = parseInt(stat.count);
      return acc;
    }, {});
  }

  static async createFeverAlert(userId, deviceId, temperature, readingId) {
    let severity = 'mild';
    let message = `Temperature reading of ${temperature}°C detected`;

    if (temperature >= 40.0) {
      severity = 'critical';
      message = `CRITICAL: Very high fever detected (${temperature}°C). Seek immediate medical attention.`;
    } else if (temperature >= 39.0) {
      severity = 'high';
      message = `HIGH FEVER: Temperature of ${temperature}°C detected. Consider medical consultation.`;
    } else if (temperature >= 38.0) {
      severity = 'moderate';
      message = `Moderate fever detected (${temperature}°C). Monitor closely.`;
    }

    return this.createNotification({
      userId,
      type: 'fever_alert',
      title: 'Fever Detected',
      message,
      priority: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'normal',
      data: {
        deviceId,
        temperature,
        readingId,
        severity
      },
      channels: severity === 'critical' ? ['push', 'email', 'sms', 'websocket'] : ['push', 'websocket']
    });
  }
}

module.exports = Notification;
