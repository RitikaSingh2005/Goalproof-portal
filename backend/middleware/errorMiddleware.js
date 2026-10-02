import { errorResponse } from '../utils/responseHelper.js';

export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = status >= 500 ? 'Internal Server Error' : (err.message || 'An error occurred');
  const errorCode = err.errorCode || (status === 404 ? 'RESOURCE_NOT_FOUND' : status === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR');

  // Server-side logging for debugging, without exposing sensitive info to client
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Server Error] ${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
    if (err.stack && process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
  }

  // Never expose stack traces or internal filesystem paths to client
  return errorResponse(res, status, message, errorCode);
};

export const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log format: METHOD URL STATUS DURATIONms
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
};
