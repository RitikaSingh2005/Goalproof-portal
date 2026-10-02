import prisma from '../prisma/client.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

// Helper to check for goal decay (no updates for > 14 days)
const isDecayed = (updatedAt) => {
  const daysDiff = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
  return daysDiff > 14;
};

// Helper for verification mismatch (progress > 130% of target)
const isMismatch = (progress, target) => {
  if (!target || target === 0) return false;
  return (progress / target) > 1.3;
};

// GET /api/manager/pending
export const getPendingGoals = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: {
        status: 'pending',
        user: { manager_id: req.user.id }
      },
      include: {
        user: { select: { id: true, name: true, department: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const enrichedGoals = goals.map(goal => ({
      ...goal,
      isDecayed: isDecayed(goal.updated_at),
      isMismatch: isMismatch(goal.progress, goal.target_value)
    }));

    return successResponse(res, 200, 'Pending goals fetched successfully', { goals: enrichedGoals }, { goals: enrichedGoals });
  } catch (error) {
    console.error('Get pending goals error:', error);
    return errorResponse(res, 500, 'Failed to fetch pending goals', 'FETCH_PENDING_GOALS_ERROR');
  }
};

// PUT /api/manager/goals/:id/approve
export const approveGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) {
      return errorResponse(res, 400, 'Invalid goal ID', 'INVALID_ID');
    }

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        user: { manager_id: req.user.id }
      }
    });

    if (!goal) {
      return errorResponse(res, 404, 'Goal not found or unauthorized', 'GOAL_NOT_FOUND');
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        status: 'approved',
        approved_by: req.user.id,
        approved_at: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'approve_goal',
        user_id: req.user.id,
        details: `Approved goal: ${goal.title}`
      }
    });

    return successResponse(res, 200, 'Goal approved', { goal: updatedGoal }, { goal: updatedGoal });
  } catch (error) {
    console.error('Approve goal error:', error);
    return errorResponse(res, 500, 'Failed to approve goal', 'APPROVE_GOAL_ERROR');
  }
};

// PUT /api/manager/goals/:id/reject
export const rejectGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) {
      return errorResponse(res, 400, 'Invalid goal ID', 'INVALID_ID');
    }

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        user: { manager_id: req.user.id }
      }
    });

    if (!goal) {
      return errorResponse(res, 404, 'Goal not found or unauthorized', 'GOAL_NOT_FOUND');
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: { status: 'rejected' }
    });

    await prisma.auditLog.create({
      data: {
        action: 'reject_goal',
        user_id: req.user.id,
        details: `Rejected goal: ${goal.title}`
      }
    });

    return successResponse(res, 200, 'Goal rejected', { goal: updatedGoal }, { goal: updatedGoal });
  } catch (error) {
    console.error('Reject goal error:', error);
    return errorResponse(res, 500, 'Failed to reject goal', 'REJECT_GOAL_ERROR');
  }
};

// PUT /api/manager/goals/:id/edit
export const editGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) {
      return errorResponse(res, 400, 'Invalid goal ID', 'INVALID_ID');
    }

    const { title, description, target_value, weightage, thrust_area } = req.body;

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        user: { manager_id: req.user.id }
      }
    });

    if (!goal) {
      return errorResponse(res, 404, 'Goal not found or unauthorized', 'GOAL_NOT_FOUND');
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        title: title !== undefined ? title : goal.title,
        description: description !== undefined ? description : goal.description,
        target_value: target_value !== undefined ? parseFloat(target_value) : goal.target_value,
        weightage: weightage !== undefined ? parseInt(weightage, 10) : goal.weightage,
        thrust_area: thrust_area !== undefined ? thrust_area : goal.thrust_area
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'manager_edit_goal',
        user_id: req.user.id,
        details: `Manager edited goal: ${goal.title} before approval`
      }
    });

    return successResponse(res, 200, 'Goal updated', { goal: updatedGoal }, { goal: updatedGoal });
  } catch (error) {
    console.error('Edit goal error:', error);
    return errorResponse(res, 500, 'Failed to edit goal', 'EDIT_GOAL_ERROR');
  }
};

// GET /api/manager/team
export const getTeamAnalytics = async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: { manager_id: req.user.id },
      include: {
        goals: true
      }
    });

    const teamStats = employees.map(emp => {
      const totalGoals = emp.goals.length;
      const pendingGoals = emp.goals.filter(g => g.status === 'pending').length;
      const approvedGoals = emp.goals.filter(g => g.status === 'approved').length;
      
      let overallProgress = 0;
      if (emp.goals.length > 0) {
        const totalProgress = emp.goals.reduce((acc, g) => acc + (g.progress || 0), 0);
        overallProgress = Math.round(totalProgress / totalGoals);
      }

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department || 'General',
        totalGoals,
        pendingGoals,
        approvedGoals,
        overallProgress,
        status: overallProgress > 70 ? 'On Track' : overallProgress > 40 ? 'At Risk' : 'Critical'
      };
    });

    return successResponse(res, 200, 'Team analytics fetched successfully', { team: teamStats }, { team: teamStats });
  } catch (error) {
    console.error('Get team error:', error);
    return errorResponse(res, 500, 'Failed to fetch team analytics', 'FETCH_TEAM_ERROR');
  }
};

// GET /api/manager/attention-score
export const getAttentionScore = async (req, res) => {
  try {
    const pendingGoals = await prisma.goal.count({
      where: { status: 'pending', user: { manager_id: req.user.id } }
    });
    
    let score = 95 - (pendingGoals * 5);
    if (score < 0) score = 0;
    
    const data = { 
      score,
      details: {
        approvalSpeed: 'Excellent',
        pendingActionItems: pendingGoals
      }
    };

    return successResponse(res, 200, 'Attention score fetched successfully', data, data);
  } catch (error) {
    console.error('Attention score error:', error);
    return errorResponse(res, 500, 'Failed to calculate attention score', 'ATTENTION_SCORE_ERROR');
  }
};

// POST /api/manager/checkin/:employeeId
export const addComment = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const empId = parseInt(employeeId, 10);
    if (isNaN(empId)) {
      return errorResponse(res, 400, 'Invalid employee ID', 'INVALID_ID');
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return errorResponse(res, 400, 'Comment content is required', 'MISSING_CONTENT');
    }

    const comment = await prisma.comment.create({
      data: {
        manager_id: req.user.id,
        employee_id: empId,
        content: content.trim()
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'add_comment',
        user_id: req.user.id,
        details: `Added comment for employee ID: ${empId}`
      }
    });

    return successResponse(res, 201, 'Comment added successfully', { comment }, { comment });
  } catch (error) {
    console.error('Add comment error:', error);
    return errorResponse(res, 500, 'Failed to add comment', 'ADD_COMMENT_ERROR');
  }
};
