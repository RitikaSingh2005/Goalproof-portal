import express from 'express';
import { body, param } from 'express-validator';
import { getGoals, createGoal, updateGoal, deleteGoal, submitAllGoals, getSharedGoals } from '../controllers/goalController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.use(authenticate); // Protect all goal routes

router.get('/', getGoals);
router.get('/shared', getSharedGoals);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('thrust_area').trim().notEmpty().withMessage('Thrust area is required'),
    body('uom_type').trim().notEmpty().withMessage('Unit of measurement is required'),
    body('target_value').notEmpty().withMessage('Target value is required').isNumeric().withMessage('Target must be a number'),
    body('weightage').notEmpty().withMessage('Weightage is required').isInt({ min: 10, max: 100 }).withMessage('Weightage must be between 10% and 100%'),
  ],
  validateRequest,
  createGoal
);

router.put(
  '/:id',
  [
    param('id').isInt().withMessage('Goal ID must be an integer'),
    body('weightage').optional().isInt({ min: 10, max: 100 }).withMessage('Weightage must be between 10% and 100%'),
    body('target_value').optional().isNumeric().withMessage('Target value must be a number'),
  ],
  validateRequest,
  updateGoal
);

router.delete(
  '/:id',
  [
    param('id').isInt().withMessage('Goal ID must be an integer'),
  ],
  validateRequest,
  deleteGoal
);

router.post('/submit-all', submitAllGoals);

export default router;
