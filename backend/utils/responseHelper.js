/**
 * Standardized API success response
 */
export const successResponse = (res, statusCode, message, data = {}, extra = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra
  });
};

/**
 * Standardized API error response
 */
export const errorResponse = (res, statusCode, message, errorCode = 'ERROR', extra = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    error: message, // Backward compatibility for legacy frontend
    ...extra
  });
};
