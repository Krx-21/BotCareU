const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.userSockets = new Map(); // socketId -> userId
  }

  initialize(io) {
    this.io = io;
    
    // Handle socket connections
    this.io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);
      
      // Handle authentication
      socket.on('auth', async (data) => {
        try {
          await this.authenticateSocket(socket, data.token);
        } catch (error) {
          logger.error('Socket authentication failed:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Handle heartbeat
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle room joining (for device-specific updates)
      socket.on('join_device', (deviceId) => {
        if (this.userSockets.has(socket.id)) {
          socket.join(`device_${deviceId}`);
          logger.debug(`Socket ${socket.id} joined device room: ${deviceId}`);
        }
      });

      // Handle room leaving
      socket.on('leave_device', (deviceId) => {
        socket.leave(`device_${deviceId}`);
        logger.debug(`Socket ${socket.id} left device room: ${deviceId}`);
      });
    });

    logger.info('WebSocket service initialized');
  }

  async authenticateSocket(socket, token) {
    if (!token) {
      throw new Error('No token provided');
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret);
      const userId = decoded.id;

      // Store user-socket mapping
      this.connectedUsers.set(userId, socket);
      this.userSockets.set(socket.id, userId);

      // Join user-specific room
      socket.join(`user_${userId}`);

      // Send authentication success
      socket.emit('auth_success', { 
        message: 'Authenticated successfully',
        userId 
      });

      logger.info(`User ${userId} authenticated via WebSocket`);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  handleDisconnection(socket) {
    const userId = this.userSockets.get(socket.id);
    
    if (userId) {
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
      logger.info(`User ${userId} disconnected from WebSocket`);
    } else {
      logger.info(`Unauthenticated client disconnected: ${socket.id}`);
    }
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return false;
    }

    try {
      this.io.to(`user_${userId}`).emit(event, data);
      logger.debug(`Sent ${event} to user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error sending message to user:', error);
      return false;
    }
  }

  // Send message to all users in a device room
  sendToDevice(deviceId, event, data) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return false;
    }

    try {
      this.io.to(`device_${deviceId}`).emit(event, data);
      logger.debug(`Sent ${event} to device room ${deviceId}`);
      return true;
    } catch (error) {
      logger.error('Error sending message to device room:', error);
      return false;
    }
  }

  // Broadcast message to all connected users
  broadcast(event, data) {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return false;
    }

    try {
      this.io.emit(event, data);
      logger.debug(`Broadcasted ${event} to all users`);
      return true;
    } catch (error) {
      logger.error('Error broadcasting message:', error);
      return false;
    }
  }

  // Send temperature update
  sendTemperatureUpdate(userId, reading) {
    return this.sendToUser(userId, 'temperature:update', {
      reading,
      timestamp: new Date().toISOString()
    });
  }

  // Send fever alert
  sendFeverAlert(userId, alert) {
    return this.sendToUser(userId, 'fever:alert', {
      ...alert,
      timestamp: new Date().toISOString()
    });
  }

  // Send device status update
  sendDeviceStatus(userId, deviceStatus) {
    return this.sendToUser(userId, 'device:status', {
      ...deviceStatus,
      timestamp: new Date().toISOString()
    });
  }

  // Send notification
  sendNotification(userId, notification) {
    return this.sendToUser(userId, 'notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Get connection statistics
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalSockets: this.userSockets.size,
      rooms: this.io ? Object.keys(this.io.sockets.adapter.rooms).length : 0
    };
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get all connected user IDs
  getConnectedUserIds() {
    return Array.from(this.connectedUsers.keys());
  }

  // Disconnect user
  disconnectUser(userId) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.disconnect();
      return true;
    }
    return false;
  }

  // Send system maintenance notification
  sendMaintenanceNotification(message, scheduledTime) {
    return this.broadcast('system:maintenance', {
      message,
      scheduledTime,
      timestamp: new Date().toISOString()
    });
  }

  // Send emergency broadcast
  sendEmergencyBroadcast(message, severity = 'high') {
    return this.broadcast('emergency:broadcast', {
      message,
      severity,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new WebSocketService();
