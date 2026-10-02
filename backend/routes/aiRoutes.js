import express from 'express';
import { body } from 'express-validator';
import { getSmartScore, verifyAchievement } from '../controllers/aiController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { aiLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(aiLimiter);

router.post(
  '/smart-score',
  [
    body('title').trim().notEmpty().withMessage('Goal title is required'),
  ],
  validateRequest,
  getSmartScore
);

router.post(
  '/verify-achievement',
  [
    body('achievement').notEmpty().withMessage('Achievement value is required'),
    body('goalTitle').trim().notEmpty().withMessage('Goal title is required'),
    body('target').notEmpty().withMessage('Target is required'),
  ],
  validateRequest,
  verifyAchievement
);

export default router;
