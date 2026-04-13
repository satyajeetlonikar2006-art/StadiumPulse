const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

router.use(authenticate);

router.get('/', ordersController.getAll);
router.get('/:id', ordersController.getById);

router.post('/', [
  body('stallId').notEmpty(),
  body('items').isArray({ min: 1 }),
  body('items.*.itemId').notEmpty(),
  body('items.*.qty').isInt({ min: 1, max: 10 }),
  body('seat').optional().isString(),
  body('paymentMethod').notEmpty()
], validate, ordersController.create);

router.patch('/:id/status', requireRole('organizer', 'admin'), [
  body('status').isIn(['PLACED', 'PREPARING', 'READY', 'COLLECTED'])
], validate, ordersController.updateStatus);

router.delete('/:id', ordersController.cancelOrder);

module.exports = router;
