import express from 'express';
import { getSmartScore, verifyAchievement } from '../controllers/aiController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/smart-score', authenticate, getSmartScore);
router.post('/verify-achievement', authenticate, verifyAchievement);

export default router;
