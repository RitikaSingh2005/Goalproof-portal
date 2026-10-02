import express from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { 
  getPendingGoals, 
  approveGoal, 
  rejectGoal, 
  editGoal, 
  getTeamAnalytics, 
  getAttentionScore, 
  addComment 
} from '../controllers/managerController.js';

const router = express.Router();

// Apply auth middleware for all manager routes
router.use(authenticate);
router.use(authorize(['manager', 'admin']));

router.get('/pending', getPendingGoals);
router.get('/team', getTeamAnalytics);
router.get('/attention-score', getAttentionScore);

router.put(
  '/goals/:id/approve',
  [param('id').isInt().withMessage('Goal ID must be an integer')],
  validateRequest,
  approveGoal
);

router.put(
  '/goals/:id/reject',
  [param('id').isInt().withMessage('Goal ID must be an integer')],
  validateRequest,
  rejectGoal
);

router.put(
  '/goals/:id/edit',
  [
    param('id').isInt().withMessage('Goal ID must be an integer'),
    body('target_value').optional().isNumeric().withMessage('Target value must be a number'),
    body('weightage').optional().isInt({ min: 10, max: 100 }).withMessage('Weightage must be between 10% and 100%'),
  ],
  validateRequest,
  editGoal
);

router.post(
  '/checkin/:employeeId',
  [
    param('employeeId').isInt().withMessage('Employee ID must be an integer'),
    body('content').trim().notEmpty().withMessage('Comment content is required'),
  ],
  validateRequest,
  addComment
);

export default router;
