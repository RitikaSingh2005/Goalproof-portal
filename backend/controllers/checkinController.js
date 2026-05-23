import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to determine active window
const checkActiveWindow = () => {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const date = now.getDate();

  // For testing purposes, we'll open a mock window "Q-Test" so we can test the UI anytime.
  // In production, we'd strictly enforce the dates below.
  return { isActive: true, quarter: 'Q-Test', year: now.getFullYear() };

  /* Strict logic:
  if (month === 6) return { isActive: true, quarter: 'Q1', year: now.getFullYear() }; // July
  if (month === 9) return { isActive: true, quarter: 'Q2', year: now.getFullYear() }; // Oct
  if (month === 0) return { isActive: true, quarter: 'Q3', year: now.getFullYear() }; // Jan
  if ((month === 2) || (month === 3 && date <= 15)) return { isActive: true, quarter: 'Q4', year: now.getFullYear() }; // Mar 1 - Apr 15
  return { isActive: false, quarter: null, year: now.getFullYear() };
  */
};

// GET /api/checkin/active
export const getActiveWindow = (req, res) => {
  res.json(checkActiveWindow());
};

// POST /api/checkin
export const submitCheckin = async (req, res) => {
  try {
    const { goal_id, actual_value, status, description } = req.body;
    const window = checkActiveWindow();

    if (!window.isActive) {
      return res.status(403).json({ error: 'Check-in window is currently closed.' });
    }

    const goal = await prisma.goal.findFirst({
      where: { id: parseInt(goal_id, 10), user_id: req.user.id }
    });

    if (!goal || goal.status !== 'approved') {
      return res.status(400).json({ error: 'Invalid goal or goal is not approved.' });
    }

    if (actual_value === undefined || actual_value === null) {
      return res.status(400).json({ error: 'Actual value is required.' });
    }

    // Progress Calculation Engine
    let progress_score = 0;
    const actual = parseFloat(actual_value);
    const target = goal.target_value;

    if (goal.uom_type === 'Numeric' || goal.uom_type === 'Percentage') {
      progress_score = target > 0 ? (actual / target) * 100 : 0;
    } else if (goal.uom_type === 'Timeline') {
      // Simplistic timeline interpretation (if status is completed => 100%)
      progress_score = status === 'Completed' ? 100 : (actual > 0 ? actual : 0);
    }
    
    // Cap at 150% for display
    if (progress_score > 150) progress_score = 150;

    const achievement = await prisma.achievement.create({
      data: {
        user_id: req.user.id,
        goal_id: goal.id,
        quarter: window.quarter,
        year: window.year,
        actual_value: actual,
        status,
        progress_score,
        description: description || ''
      }
    });

    // Update goal progress overall (simple average or replacement depending on business logic)
    // Here we'll just replace it with the latest progress score
    await prisma.goal.update({
      where: { id: goal.id },
      data: { progress: progress_score }
    });

    await prisma.auditLog.create({
      data: {
        action: 'submit_checkin',
        user_id: req.user.id,
        details: `Submitted checkin for goal ${goal.id} in ${window.quarter}`
      }
    });

    res.json({ achievement, message: 'Check-in submitted successfully.' });
  } catch (error) {
    console.error('Submit checkin error:', error);
    res.status(500).json({ error: 'Failed to submit check-in' });
  }
};

// GET /api/checkin/history
export const getCheckinHistory = async (req, res) => {
  try {
    const history = await prisma.achievement.findMany({
      where: { user_id: req.user.id },
      include: {
        goal: { select: { title: true, target_value: true, uom_type: true } }
      },
      orderBy: { submitted_at: 'desc' }
    });

    res.json({ history });
  } catch (error) {
    console.error('Get checkin history error:', error);
    res.status(500).json({ error: 'Failed to fetch check-in history' });
  }
};
