require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  database: {
    // PostgreSQL configuration
    postgres: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'botcareu_dev',
      user: process.env.DB_USER || 'botcareu_user',
      password: process.env.DB_PASSWORD || 'botcareu_password',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000
      }
    },

    // InfluxDB configuration for time-series data
    influxdb: {
      url: process.env.INFLUXDB_URL || 'http://localhost:8086',
      token: process.env.INFLUXDB_TOKEN,
      org: process.env.INFLUXDB_ORG || 'botcareu',
      bucket: process.env.INFLUXDB_BUCKET || 'temperature_data'
    }
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  },

  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: process.env.MQTT_CLIENT_ID || 'botcareu-backend',
    topics: {
      temperatureReading: 'botcareu/device/+/temperature/reading',
      deviceStatus: 'botcareu/device/+/status',
      deviceConfig: 'botcareu/device/+/config',
      deviceAlerts: 'botcareu/device/+/alerts'
    }
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm'
  },

  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@botcareu.com',
    fromName: process.env.FROM_NAME || 'BotCareU Health Monitor'
  },

  sms: {
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER
  },

  pushNotifications: {
    fcmServerKey: process.env.FCM_SERVER_KEY,
    apnsKeyId: process.env.APNS_KEY_ID,
    apnsTeamId: process.env.APNS_TEAM_ID
  },

  cloudStorage: {
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'botcareu-data-storage'
  },

  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/botcareu.log'
  },

  health: {
    checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
  },

  temperature: {
    feverThreshold: parseFloat(process.env.FEVER_THRESHOLD) || 37.5,
    highFeverThreshold: parseFloat(process.env.HIGH_FEVER_THRESHOLD) || 39.0,
    criticalThreshold: parseFloat(process.env.CRITICAL_TEMPERATURE_THRESHOLD) || 40.0
  },

  dataRetention: {
    medicalDataDays: parseInt(process.env.DATA_RETENTION_DAYS) || 2555, // 7 years
    analyticsDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 365
  },

  api: {
    version: process.env.API_VERSION || 'v1',
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000
  },

  websocket: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS) || 1000
  },

  device: {
    maxDevicesPerUser: parseInt(process.env.MAX_DEVICES_PER_USER) || 5,
    timeoutMinutes: parseInt(process.env.DEVICE_TIMEOUT_MINUTES) || 5,
    temperatureReadingInterval: parseInt(process.env.TEMPERATURE_READING_INTERVAL) || 60000
  },

  notifications: {
    maxPerHour: parseInt(process.env.MAX_NOTIFICATIONS_PER_HOUR) || 10,
    retryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY) || 5000
  }
};

// Validate required configuration
const requiredEnvVars = [
  'JWT_SECRET',
  'ENCRYPTION_KEY'
];

if (config.server.nodeEnv === 'production') {
  requiredEnvVars.push(
    'DATABASE_URL',
    'INFLUXDB_TOKEN',
    'SENDGRID_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN'
  );
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  if (config.server.nodeEnv === 'production') {
    process.exit(1);
  }
}

module.exports = config;
