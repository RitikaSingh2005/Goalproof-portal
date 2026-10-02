import prisma from '../prisma/client.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

// Helper to find currently active performance cycle within start_date and end_date
export const findActiveCycle = async (date = new Date()) => {
  const activeCycle = await prisma.cycle.findFirst({
    where: {
      status: 'active',
      start_date: { lte: date },
      end_date: { gte: date }
    },
    orderBy: { start_date: 'desc' }
  });
  return activeCycle;
};

// GET /api/checkin/active
export const getActiveWindow = async (req, res) => {
  try {
    const now = new Date();
    const activeCycle = await findActiveCycle(now);

    if (!activeCycle) {
      const windowData = {
        isActive: false,
        quarter: null,
        year: null
      };
      return successResponse(res, 200, 'Check-in window is currently closed', windowData, windowData);
    }

    const quarterName = activeCycle.name;
    const year = new Date(activeCycle.start_date).getFullYear();

    const windowData = {
      isActive: true,
      quarter: quarterName,
      year: year,
      cycle: activeCycle
    };

    return successResponse(res, 200, 'Active check-in window found', windowData, windowData);
  } catch (error) {
    console.error('Get active window error:', error);
    return errorResponse(res, 500, 'Failed to fetch check-in window', 'ACTIVE_WINDOW_ERROR');
  }
};

// POST /api/checkin
export const submitCheckin = async (req, res) => {
  try {
    const { goal_id, actual_value, status, description } = req.body;
    const now = new Date();
    const activeCycle = await findActiveCycle(now);

    if (!activeCycle) {
      return errorResponse(res, 403, 'Check-in window is currently closed', 'CHECKIN_WINDOW_CLOSED');
    }

    const parsedGoalId = parseInt(goal_id, 10);
    if (isNaN(parsedGoalId)) {
      return errorResponse(res, 400, 'Goal ID must be a valid number', 'INVALID_ID');
    }

    if (actual_value === undefined || actual_value === null || isNaN(parseFloat(actual_value))) {
      return errorResponse(res, 400, 'Actual value must be a valid number', 'INVALID_ACTUAL_VALUE');
    }

    const goal = await prisma.goal.findFirst({
      where: { id: parsedGoalId, user_id: req.user.id }
    });

    if (!goal) {
      return errorResponse(res, 400, 'Invalid goal or goal does not belong to user.', 'INVALID_GOAL');
    }

    if (goal.status !== 'approved') {
      return errorResponse(res, 400, 'Invalid goal or goal is not approved.', 'GOAL_NOT_APPROVED');
    }

    // Progress Calculation Engine
    let progress_score = 0;
    const actual = parseFloat(actual_value);
    const target = goal.target_value || 0;

    if (goal.uom_type === 'Numeric' || goal.uom_type === 'Percentage') {
      progress_score = target > 0 ? (actual / target) * 100 : 0;
    } else if (goal.uom_type === 'Timeline') {
      progress_score = status === 'Completed' ? 100 : (actual > 0 ? actual : 0);
    } else {
      progress_score = target > 0 ? (actual / target) * 100 : 0;
    }

    // Cap at 150% for display
    if (progress_score > 150) progress_score = 150;
    if (progress_score < 0) progress_score = 0;
    progress_score = Math.round(progress_score * 100) / 100;

    const cycleYear = new Date(activeCycle.start_date).getFullYear();

    const achievement = await prisma.achievement.create({
      data: {
        user_id: req.user.id,
        goal_id: goal.id,
        quarter: activeCycle.name,
        year: cycleYear,
        actual_value: actual,
        status: status || 'In Progress',
        progress_score,
        description: description ? description.trim() : ''
      }
    });

    // Update goal's current progress and associate cycle
    await prisma.goal.update({
      where: { id: goal.id },
      data: {
        progress: progress_score,
        cycle_id: activeCycle.id
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'submit_checkin',
        user_id: req.user.id,
        details: `Submitted checkin for goal ${goal.id} in ${activeCycle.name}`
      }
    });

    return successResponse(res, 201, 'Check-in submitted successfully.', { achievement }, { achievement });
  } catch (error) {
    console.error('Submit checkin error:', error);
    return errorResponse(res, 500, 'Failed to submit check-in', 'SUBMIT_CHECKIN_ERROR');
  }
};

// GET /api/checkin/history
export const getCheckinHistory = async (req, res) => {
  try {
    const history = await prisma.achievement.findMany({
      where: { user_id: req.user.id },
      include: {
        goal: { select: { id: true, title: true, target_value: true, uom_type: true } }
      },
      orderBy: { submitted_at: 'desc' }
    });

    return successResponse(res, 200, 'Check-in history fetched successfully', { history }, { history });
  } catch (error) {
    console.error('Get checkin history error:', error);
    return errorResponse(res, 500, 'Failed to fetch check-in history', 'FETCH_HISTORY_ERROR');
  }
};
