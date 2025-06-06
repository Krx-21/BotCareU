const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class AuthController {
  // Register new user
  async register(req, res, next) {
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

      const { email, password, firstName, lastName, dateOfBirth, gender, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          }
        });
      }

      // Create new user
      const userData = {
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        role: role || 'patient'
      };

      const user = await User.createUser(userData);
      const tokens = user.generateTokens();

      logger.info(`New user registered: ${user.email}`);

      res.status(201).json({
        success: true,
        data: {
          user: user.getProfile(),
          tokens
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  // Login user
  async login(req, res, next) {
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

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Account has been disabled'
          }
        });
      }

      // Verify password
      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      const tokens = user.generateTokens();

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        data: {
          user: user.getProfile(),
          tokens
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  // Refresh access token
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required'
          }
        });
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, config.jwt.secret);
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token'
          }
        });
      }

      // Find user
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive'
          }
        });
      }

      // Generate new tokens
      const tokens = user.generateTokens();

      res.json({
        success: true,
        data: {
          tokens
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      next(error);
    }
  }

  // Logout user
  async logout(req, res, next) {
    try {
      // In a production environment, you would typically:
      // 1. Add the token to a blacklist
      // 2. Clear any session data
      // 3. Log the logout event

      logger.info(`User logged out: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Successfully logged out'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }

  // Get current user profile
  async me(req, res, next) {
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
  }

  // Change password
  async changePassword(req, res, next) {
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

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect'
          }
        });
      }

      // Update password
      await User.updateUser(userId, { password: newPassword });

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      next(error);
    }
  }

  // Forgot password (placeholder for future implementation)
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      // In a production environment, you would:
      // 1. Generate a password reset token
      // 2. Send an email with reset instructions
      // 3. Store the token with expiration

      logger.info(`Password reset requested for: ${email}`);

      res.json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      next(error);
    }
  }

  // Reset password (placeholder for future implementation)
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      // In a production environment, you would:
      // 1. Verify the reset token
      // 2. Check if it's not expired
      // 3. Update the user's password
      // 4. Invalidate the reset token

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      next(error);
    }
  }
}

module.exports = new AuthController();
