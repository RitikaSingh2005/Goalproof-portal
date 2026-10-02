import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { errorResponse } from '../utils/responseHelper.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : (authHeader ? authHeader.split(' ')[1] || authHeader : null);

  if (!token) {
    return errorResponse(res, 401, 'Access denied, token missing!', 'TOKEN_MISSING');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, 401, 'Invalid token', 'INVALID_TOKEN');
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'Forbidden, insufficient permissions', 'FORBIDDEN');
    }
    next();
  };
};
