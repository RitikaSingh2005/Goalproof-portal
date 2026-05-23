import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
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

router.put('/goals/:id/approve', approveGoal);
router.put('/goals/:id/reject', rejectGoal);
router.put('/goals/:id/edit', editGoal);

router.post('/checkin/:employeeId', addComment);

export default router;
