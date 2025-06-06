const { Model } = require('objection');
const Knex = require('knex');
const Redis = require('redis');
const { InfluxDB } = require('@influxdata/influxdb-client');
const config = require('../config/config');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.knex = null;
    this.redis = null;
    this.influxDB = null;
    this.influxWriteApi = null;
    this.influxQueryApi = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize PostgreSQL
      await this.initializePostgreSQL();
      
      // Initialize Redis
      await this.initializeRedis();
      
      // Initialize InfluxDB
      await this.initializeInfluxDB();
      
      this.initialized = true;
      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  async initializePostgreSQL() {
    try {
      // Create Knex instance
      this.knex = Knex({
        client: 'postgresql',
        connection: config.database.postgres,
        pool: config.database.postgres.pool,
        migrations: {
          directory: './database/migrations',
          tableName: 'knex_migrations'
        }
      });

      // Bind Objection.js to Knex
      Model.knex(this.knex);

      // Test connection
      await this.knex.raw('SELECT 1');
      
      logger.info('PostgreSQL connection established');
    } catch (error) {
      logger.error('PostgreSQL initialization failed:', error);
      throw error;
    }
  }

  async initializeRedis() {
    try {
      // Create Redis client
      this.redis = Redis.createClient({
        url: config.redis.url,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Handle Redis events
      this.redis.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.redis.on('error', (error) => {
        logger.error('Redis client error:', error);
      });

      this.redis.on('end', () => {
        logger.warn('Redis client connection ended');
      });

      // Connect to Redis
      await this.redis.connect();
      
      // Test connection
      await this.redis.ping();
      
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Redis initialization failed:', error);
      throw error;
    }
  }

  async initializeInfluxDB() {
    try {
      // Create InfluxDB client
      this.influxDB = new InfluxDB({
        url: config.database.influxdb.url,
        token: config.database.influxdb.token
      });

      // Create write and query APIs
      this.influxWriteApi = this.influxDB.getWriteApi(
        config.database.influxdb.org,
        config.database.influxdb.bucket
      );

      this.influxQueryApi = this.influxDB.getQueryApi(
        config.database.influxdb.org
      );

      // Test connection
      const health = await this.influxDB.health();
      if (health.status !== 'pass') {
        throw new Error('InfluxDB health check failed');
      }

      logger.info('InfluxDB connection established');
    } catch (error) {
      logger.error('InfluxDB initialization failed:', error);
      throw error;
    }
  }

  // PostgreSQL operations
  async runMigrations() {
    try {
      await this.knex.migrate.latest();
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  async runSeeds() {
    try {
      await this.knex.seed.run();
      logger.info('Database seeds completed');
    } catch (error) {
      logger.error('Seeding failed:', error);
      throw error;
    }
  }

  // Redis operations
  async cacheSet(key, value, ttl = 3600) {
    try {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      if (ttl) {
        await this.redis.setEx(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async cacheGet(key) {
    try {
      const value = await this.redis.get(key);
      
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async cacheDelete(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  async cacheExists(key) {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  // InfluxDB operations
  async writeTemperatureData(data) {
    try {
      const { Point } = require('@influxdata/influxdb-client');
      
      const point = new Point('temperature')
        .tag('deviceId', data.deviceId)
        .tag('userId', data.userId)
        .tag('measurementType', data.measurementType)
        .floatField('temperature', data.temperature)
        .floatField('infraredTemp', data.infraredTemp || null)
        .floatField('contactTemp', data.contactTemp || null)
        .floatField('ambientTemp', data.ambientTemp || null)
        .booleanField('feverDetected', data.feverDetected || false)
        .timestamp(new Date(data.timestamp));

      this.influxWriteApi.writePoint(point);
      await this.influxWriteApi.flush();
      
      return true;
    } catch (error) {
      logger.error('InfluxDB write error:', error);
      return false;
    }
  }

  async queryTemperatureData(query) {
    try {
      const results = [];
      
      await this.influxQueryApi.queryRows(query, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          results.push(o);
        },
        error(error) {
          logger.error('InfluxDB query error:', error);
        },
        complete() {
          logger.debug('InfluxDB query completed');
        }
      });
      
      return results;
    } catch (error) {
      logger.error('InfluxDB query error:', error);
      return [];
    }
  }

  // Health checks
  async checkHealth() {
    const health = {
      postgresql: false,
      redis: false,
      influxdb: false
    };

    try {
      // Check PostgreSQL
      await this.knex.raw('SELECT 1');
      health.postgresql = true;
    } catch (error) {
      logger.error('PostgreSQL health check failed:', error);
    }

    try {
      // Check Redis
      await this.redis.ping();
      health.redis = true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    try {
      // Check InfluxDB
      const influxHealth = await this.influxDB.health();
      health.influxdb = influxHealth.status === 'pass';
    } catch (error) {
      logger.error('InfluxDB health check failed:', error);
    }

    return health;
  }

  // Get connection statistics
  getStats() {
    return {
      initialized: this.initialized,
      postgresql: {
        connected: this.knex !== null
      },
      redis: {
        connected: this.redis && this.redis.isReady
      },
      influxdb: {
        connected: this.influxDB !== null
      }
    };
  }

  // Close all connections
  async close() {
    try {
      if (this.knex) {
        await this.knex.destroy();
        this.knex = null;
      }

      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }

      if (this.influxWriteApi) {
        await this.influxWriteApi.close();
        this.influxWriteApi = null;
      }

      this.initialized = false;
      logger.info('Database service closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
    }
  }
}

module.exports = new DatabaseService();
