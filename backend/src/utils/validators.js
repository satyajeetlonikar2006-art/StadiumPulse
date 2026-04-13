const { body, validationResult } = require('express-validator');

// Common validation chains
exports.emailValidator = body('email').isEmail().withMessage('Invalid email format');
exports.passwordValidator = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
  .matches(/[0-9]/).withMessage('Password must contain a number')
  .matches(/[@$!%*?&#]/).withMessage('Password must contain a special character');
exports.nameValidator = body('name').notEmpty().withMessage('Name is required');

// Extracts errors and passes to next or sends 400
exports.validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors for consistency
    const formatErr = errors.array().map(err => ({ field: err.path, message: err.msg }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: formatErr
      }
    });
  }
  next();
};
