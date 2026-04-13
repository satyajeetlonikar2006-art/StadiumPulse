const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { emailValidator, passwordValidator, nameValidator } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimit');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

router.post('/register', authLimiter, [
  nameValidator,
  emailValidator,
  passwordValidator,
  body('role').optional().isIn(['attendee', 'organizer', 'admin'])
], validate, authController.register);

router.post('/login', authLimiter, [
  emailValidator,
  body('password').notEmpty().withMessage('Password is required')
], validate, authController.login);

router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token required')
], validate, authController.refresh);

router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, authController.updateMe);

module.exports = router;
