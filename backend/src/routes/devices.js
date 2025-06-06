const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize, authenticateDevice } = require('../middleware/auth');
const deviceController = require('../controllers/deviceController');

const router = express.Router();

// Validation rules
const pairDeviceValidation = [
  body('deviceId').trim().isLength({ min: 1, max: 100 }),
  body('pairingCode').isLength({ min: 6, max: 6 }).isNumeric(),
  body('name').trim().isLength({ min: 1, max: 100 }),
];

const updateDeviceValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('settings').optional().isObject(),
  body('location').optional().isObject(),
];

// Routes
router.get('/', authenticate, deviceController.getDevices);
router.get('/:deviceId', authenticate, deviceController.getDevice);
router.post('/pair', authenticate, pairDeviceValidation, deviceController.pairDevice);
router.put('/:deviceId', authenticate, updateDeviceValidation, deviceController.updateDevice);
router.delete('/:deviceId', authenticate, deviceController.removeDevice);

// Device status update (for IoT devices)
router.put('/:deviceId/status', authenticateDevice, deviceController.updateDeviceStatus);

// Admin routes
router.get('/stats', authenticate, authorize('admin'), deviceController.getDeviceStats);
router.post('/pairing-code', authenticate, authorize('admin'), deviceController.generatePairingCode);

module.exports = router;
