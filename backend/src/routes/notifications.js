const express = require('express');
const { query, body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

// Get notifications
router.get('/', authenticate, [
  query('unreadOnly').optional().isBoolean(),
  query('type').optional().isIn(['fever_alert', 'device_offline', 'low_battery', 'system_alert', 'reminder', 'emergency', 'info']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array()
        }
      });
    }

    const {
      unreadOnly = false,
      type,
      limit = 50,
      offset = 0
    } = req.query;

    const userId = req.user.id;

    const options = {
      unreadOnly: unreadOnly === 'true',
      type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const notifications = await Notification.getNotificationsByUser(userId, options);
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    next(error);
  }
});

// Mark notification as read
router.put('/:notificationId/read', authenticate, async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.query()
      .findById(notificationId)
      .where('userId', userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    next(error);
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const updatedCount = await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      message: `${updatedCount} notifications marked as read`
    });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    next(error);
  }
});

// Archive notification
router.put('/:notificationId/archive', authenticate, async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.query()
      .findById(notificationId)
      .where('userId', userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    await notification.archive();

    res.json({
      success: true,
      message: 'Notification archived'
    });
  } catch (error) {
    logger.error('Archive notification error:', error);
    next(error);
  }
});

// Send notification (admin only)
router.post('/send', authenticate, authorize('admin'), [
  body('userId').isUUID(),
  body('type').isIn(['fever_alert', 'device_offline', 'low_battery', 'system_alert', 'reminder', 'emergency', 'info']),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('message').trim().isLength({ min: 1, max: 1000 }),
  body('priority').optional().isIn(['low', 'normal', 'high', 'critical']),
  body('channels').optional().isArray(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification data',
          details: errors.array()
        }
      });
    }

    const notificationData = req.body;
    const notification = await Notification.createNotification(notificationData);

    logger.info(`Notification sent by admin ${req.user.email} to user ${notificationData.userId}`);

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Send notification error:', error);
    next(error);
  }
});

// Get notification statistics (admin only)
router.get('/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.id;

    const stats = await Notification.getNotificationStats(userId, parseInt(days));

    res.json({
      success: true,
      data: {
        stats,
        period: `${days} days`
      }
    });
  } catch (error) {
    logger.error('Get notification stats error:', error);
    next(error);
  }
});

module.exports = router;
