import { validationResult } from 'express-validator';

/**
 * Middleware to intercept validation errors before controller execution
 * Returns standardized 400 response with list of errors
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => err.msg);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorList,
      error: errorList[0] || 'Validation failed' // For backward compatibility with legacy frontend error display
    });
  }
  next();
};
