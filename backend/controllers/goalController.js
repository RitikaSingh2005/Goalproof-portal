import prisma from '../prisma/client.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

// GET /api/goals
export const getGoals = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' }
    });
    return successResponse(res, 200, 'Goals fetched successfully', { goals }, { goals });
  } catch (error) {
    console.error('Get goals error:', error);
    return errorResponse(res, 500, 'Failed to fetch goals', 'FETCH_GOALS_ERROR');
  }
};

// GET /api/goals/shared
export const getSharedGoals = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { user_id: req.user.id, is_shared: true },
      orderBy: { created_at: 'desc' }
    });
    return successResponse(res, 200, 'Shared goals fetched successfully', { goals }, { goals });
  } catch (error) {
    console.error('Get shared goals error:', error);
    return errorResponse(res, 500, 'Failed to fetch shared goals', 'FETCH_SHARED_GOALS_ERROR');
  }
};

// POST /api/goals
export const createGoal = async (req, res) => {
  try {
    const { thrust_area, title, description, uom_type, target_value, weightage, smart_score } = req.body;

    // Validate max goals
    const goalCount = await prisma.goal.count({
      where: { user_id: req.user.id }
    });

    if (goalCount >= 8) {
      return errorResponse(res, 400, 'Maximum limit of 8 goals reached', 'MAX_GOALS_REACHED');
    }

    const parsedWeightage = parseInt(weightage, 10);
    if (parsedWeightage < 10 || parsedWeightage > 100) {
      return errorResponse(res, 400, 'Individual goal weightage must be between 10% and 100%', 'INVALID_WEIGHTAGE');
    }

    const goal = await prisma.goal.create({
      data: {
        user_id: req.user.id,
        thrust_area: thrust_area || 'General',
        title,
        description: description || null,
        uom_type: uom_type || 'Numeric',
        target_value: parseFloat(target_value),
        weightage: parsedWeightage,
        smart_score: smart_score ? parseInt(smart_score, 10) : null,
        status: 'draft',
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'create_goal',
        user_id: req.user.id,
        details: `Created goal: ${goal.title}`,
      }
    });

    return successResponse(res, 201, 'Goal created successfully', { goal }, { goal });
  } catch (error) {
    console.error('Create goal error:', error);
    return errorResponse(res, 500, 'Failed to create goal', 'CREATE_GOAL_ERROR');
  }
};

// PUT /api/goals/:id
export const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) {
      return errorResponse(res, 400, 'Invalid goal ID', 'INVALID_ID');
    }

    const { thrust_area, title, description, uom_type, target_value, weightage, smart_score } = req.body;

    const existingGoal = await prisma.goal.findUnique({
      where: { id: goalId }
    });

    if (!existingGoal) {
      return errorResponse(res, 404, 'Goal not found', 'GOAL_NOT_FOUND');
    }

    if (existingGoal.user_id !== req.user.id) {
      return errorResponse(res, 403, "Cannot modify another user's goal", 'FORBIDDEN');
    }

    if (existingGoal.status === 'pending' || existingGoal.status === 'approved' || existingGoal.status === 'locked') {
      return errorResponse(res, 400, 'Cannot edit a goal in this status', 'INVALID_GOAL_STATUS');
    }

    if (weightage !== undefined) {
      const parsedWeightage = parseInt(weightage, 10);
      if (parsedWeightage < 10 || parsedWeightage > 100) {
        return errorResponse(res, 400, 'Individual goal weightage must be between 10% and 100%', 'INVALID_WEIGHTAGE');
      }
    }

    let dataToUpdate = {
      thrust_area: thrust_area !== undefined ? thrust_area : existingGoal.thrust_area,
      title: title !== undefined ? title : existingGoal.title,
      description: description !== undefined ? description : existingGoal.description,
      uom_type: uom_type !== undefined ? uom_type : existingGoal.uom_type,
      target_value: target_value !== undefined ? parseFloat(target_value) : existingGoal.target_value,
      weightage: weightage !== undefined ? parseInt(weightage, 10) : existingGoal.weightage,
      smart_score: smart_score !== undefined ? parseInt(smart_score, 10) : existingGoal.smart_score,
    };

    if (existingGoal.is_shared) {
      dataToUpdate = { weightage: weightage !== undefined ? parseInt(weightage, 10) : existingGoal.weightage };
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: dataToUpdate
    });

    await prisma.auditLog.create({
      data: {
        action: 'update_goal',
        user_id: req.user.id,
        details: `Updated goal: ${updatedGoal.title}`,
      }
    });

    return successResponse(res, 200, 'Goal updated successfully', { goal: updatedGoal }, { goal: updatedGoal });
  } catch (error) {
    console.error('Update goal error:', error);
    return errorResponse(res, 500, 'Failed to update goal', 'UPDATE_GOAL_ERROR');
  }
};

// DELETE /api/goals/:id
export const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) {
      return errorResponse(res, 400, 'Invalid goal ID', 'INVALID_ID');
    }

    const existingGoal = await prisma.goal.findUnique({
      where: { id: goalId }
    });

    if (!existingGoal) {
      return errorResponse(res, 404, 'Goal not found', 'GOAL_NOT_FOUND');
    }

    if (existingGoal.user_id !== req.user.id) {
      return errorResponse(res, 403, "Cannot delete another user's goal", 'FORBIDDEN');
    }

    if (existingGoal.status !== 'draft' && existingGoal.status !== 'rejected') {
      return errorResponse(res, 400, 'Only draft or rejected goals can be deleted', 'INVALID_GOAL_STATUS');
    }

    // Delete any achievements attached to this goal first to maintain FK integrity
    await prisma.achievement.deleteMany({
      where: { goal_id: goalId }
    });

    await prisma.goal.delete({
      where: { id: goalId }
    });

    await prisma.auditLog.create({
      data: {
        action: 'delete_goal',
        user_id: req.user.id,
        details: `Deleted goal: ${existingGoal.title}`,
      }
    });

    return successResponse(res, 200, 'Goal deleted successfully', {});
  } catch (error) {
    console.error('Delete goal error:', error);
    return errorResponse(res, 500, 'Failed to delete goal', 'DELETE_GOAL_ERROR');
  }
};

// POST /api/goals/submit-all
export const submitAllGoals = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { user_id: req.user.id }
    });

    if (goals.length === 0) {
      return errorResponse(res, 400, 'Minimum one goal is required', 'NO_GOALS_FOUND');
    }

    const totalWeightage = goals.reduce((acc, goal) => acc + goal.weightage, 0);

    if (totalWeightage !== 100) {
      return errorResponse(
        res,
        400,
        `Total weightage must be exactly 100%. Current is ${totalWeightage}%`,
        'INVALID_TOTAL_WEIGHTAGE'
      );
    }

    const invalidGoals = goals.filter(g => g.weightage < 10);
    if (invalidGoals.length > 0) {
      return errorResponse(res, 400, 'Some goals have weightage less than 10%', 'INVALID_GOAL_WEIGHTAGE');
    }

    // Update all draft/rejected goals to pending
    await prisma.goal.updateMany({
      where: { 
        user_id: req.user.id,
        status: { in: ['draft', 'rejected'] }
      },
      data: {
        status: 'pending'
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'submit_goals',
        user_id: req.user.id,
        details: `Submitted ${goals.length} goals for approval`,
      }
    });

    return successResponse(res, 200, 'Goals submitted for approval successfully', {});
  } catch (error) {
    console.error('Submit goals error:', error);
    return errorResponse(res, 500, 'Failed to submit goals', 'SUBMIT_GOALS_ERROR');
  }
};
