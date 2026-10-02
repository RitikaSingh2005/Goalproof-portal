import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { getActiveWindow, submitCheckin, getCheckinHistory } from '../controllers/checkinController.js';

const router = express.Router();

router.use(authenticate);

router.get('/active', getActiveWindow);

router.post(
  '/',
  [
    body('goal_id').notEmpty().withMessage('Goal ID is required').isInt().withMessage('Goal ID must be an integer'),
    body('actual_value').notEmpty().withMessage('Actual value is required').isNumeric().withMessage('Actual value must be a number'),
    body('status').optional().isString().withMessage('Status must be a string'),
    body('description').optional().isString().withMessage('Description must be a string'),
  ],
  validateRequest,
  submitCheckin
);

router.get('/history', getCheckinHistory);

export default router;
