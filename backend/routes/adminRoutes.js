import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { createCycle, getCycles, getInsights, getAuditLogs, downloadReport, unlockGoal, getEmployees, createSharedGoal, updateCycle, getSharedAnalytics } from '../controllers/adminController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin']));

router.post('/cycles', createCycle);
router.get('/cycles', getCycles);
router.put('/cycles/:id', updateCycle);
router.get('/insights', getInsights);
router.get('/shared-analytics', getSharedAnalytics);
router.get('/audit-log', getAuditLogs);
router.get('/report', downloadReport);
router.put('/goals/:id/unlock', unlockGoal);

router.get('/employees', getEmployees);
router.post('/shared-goal', createSharedGoal);

export default router;
