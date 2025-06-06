const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

// Get current user profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getProfile()
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticate, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('dateOfBirth').optional().isISO8601(),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('preferences').optional().isObject(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const userId = req.user.id;
    const updateData = req.body;

    const updatedUser = await User.updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    logger.info(`User profile updated: ${updatedUser.email}`);

    res.json({
      success: true,
      data: {
        user: updatedUser.getProfile()
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
});

// Get user settings
router.get('/settings', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        preferences: user.preferences || {}
      }
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    next(error);
  }
});

// Update user settings
router.put('/settings', authenticate, [
  body('preferences').isObject(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const userId = req.user.id;
    const { preferences } = req.body;

    const updatedUser = await User.updateUser(userId, { preferences });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    logger.info(`User settings updated: ${updatedUser.email}`);

    res.json({
      success: true,
      data: {
        preferences: updatedUser.preferences
      }
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    next(error);
  }
});

module.exports = router;
