import express from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { 
  createCycle, 
  getCycles, 
  getInsights, 
  getAuditLogs, 
  downloadReport, 
  unlockGoal, 
  getEmployees, 
  createSharedGoal, 
  updateCycle, 
  getSharedAnalytics 
} from '../controllers/adminController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin']));

router.post(
  '/cycles',
  [
    body('name').trim().notEmpty().withMessage('Cycle name is required'),
    body('start_date').notEmpty().withMessage('Start date is required').isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').notEmpty().withMessage('End date is required').isISO8601().withMessage('End date must be a valid date'),
  ],
  validateRequest,
  createCycle
);

router.get('/cycles', getCycles);

router.put(
  '/cycles/:id',
  [
    param('id').isInt().withMessage('Cycle ID must be an integer'),
    body('start_date').optional().isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').optional().isISO8601().withMessage('End date must be a valid date'),
    body('status').optional().isIn(['active', 'completed', 'draft']).withMessage('Status must be active, completed, or draft'),
  ],
  validateRequest,
  updateCycle
);

router.get('/insights', getInsights);
router.get('/shared-analytics', getSharedAnalytics);
router.get('/audit-log', getAuditLogs);
router.get('/report', downloadReport);

router.put(
  '/goals/:id/unlock',
  [
    param('id').isInt().withMessage('Goal ID must be an integer'),
    body('justification').trim().notEmpty().withMessage('Justification is required to unlock a goal.'),
  ],
  validateRequest,
  unlockGoal
);

router.get('/employees', getEmployees);

router.post(
  '/shared-goal',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('target_value').notEmpty().withMessage('Target value is required').isNumeric().withMessage('Target value must be a number'),
    body('employeeIds').isArray({ min: 1 }).withMessage('Must select at least one employee.'),
  ],
  validateRequest,
  createSharedGoal
);

export default router;
