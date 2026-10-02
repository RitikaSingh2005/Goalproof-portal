import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

// Auth rate limiter (login / register)
export const authLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // Limit each IP to 50 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: 'Too many authentication attempts, please try again after 15 minutes'
      }
    });

// AI rate limiter
export const aiLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'AI request limit reached. Please wait before generating more evaluations.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: 'AI request limit reached. Please wait before generating more evaluations.'
      }
    });

// General API limiter
export const apiLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests, please slow down.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: 'Too many requests, please slow down.'
      }
    });
