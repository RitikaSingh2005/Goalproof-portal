import express from 'express';
import { body } from 'express-validator';
import { getGoals, createGoal, updateGoal, deleteGoal, submitAllGoals, getSharedGoals } from '../controllers/goalController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate); // Protect all goal routes

router.get('/', getGoals);
router.get('/shared', getSharedGoals);

router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('thrust_area').notEmpty().withMessage('Thrust area is required'),
  body('uom_type').notEmpty().withMessage('Unit of measurement is required'),
  body('target_value').isNumeric().withMessage('Target must be a number'),
  body('weightage').isInt({ min: 10 }).withMessage('Weightage must be at least 10%'),
], createGoal);

router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);
router.post('/submit-all', submitAllGoals);

export default router;
