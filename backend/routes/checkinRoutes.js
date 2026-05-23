import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getActiveWindow, submitCheckin, getCheckinHistory } from '../controllers/checkinController.js';

const router = express.Router();

router.use(authenticate);

router.get('/active', getActiveWindow);
router.post('/', submitCheckin);
router.get('/history', getCheckinHistory);

export default router;
