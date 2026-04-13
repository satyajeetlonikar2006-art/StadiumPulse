const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

// Admin console requires organizer minimum to read, admin to write
router.get('/', authenticate, requireRole('organizer', 'admin'), usersController.getAll);
router.get('/:id', authenticate, requireRole('organizer', 'admin'), usersController.getById);

router.patch('/:id/role', authenticate, requireRole('admin'), [
  body('role').isIn(['attendee', 'organizer', 'admin'])
], validate, usersController.updateRole);

module.exports = router;
