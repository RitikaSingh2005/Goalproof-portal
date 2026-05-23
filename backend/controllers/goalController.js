import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

// GET /api/goals
export const getGoals = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' }
    });
    res.json({ goals });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
};

// Get strictly shared goals for employee
export const getSharedGoals = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { user_id: req.user.id, is_shared: true },
      orderBy: { created_at: 'desc' }
    });
    res.json({ goals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shared goals' });
  }
};

// POST /api/goals
export const createGoal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { thrust_area, title, description, uom_type, target_value, weightage, smart_score } = req.body;

    // Validate max goals
    const goalCount = await prisma.goal.count({
      where: { user_id: req.user.id }
    });

    if (goalCount >= 8) {
      return res.status(400).json({ error: 'Maximum limit of 8 goals reached' });
    }

    // Validate weightage rules for single goal
    if (weightage < 10) {
      return res.status(400).json({ error: 'Individual goal weightage must be at least 10%' });
    }

    const goal = await prisma.goal.create({
      data: {
        user_id: req.user.id,
        thrust_area,
        title,
        description,
        uom_type,
        target_value: parseFloat(target_value),
        weightage: parseInt(weightage, 10),
        smart_score: parseInt(smart_score, 10) || null,
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

    res.status(201).json({ goal, message: 'Goal created successfully' });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
};

// PUT /api/goals/:id
export const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { thrust_area, title, description, uom_type, target_value, weightage, smart_score } = req.body;

    const existingGoal = await prisma.goal.findFirst({
      where: { id: parseInt(id, 10), user_id: req.user.id }
    });

    if (!existingGoal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (existingGoal.status === 'pending' || existingGoal.status === 'approved' || existingGoal.status === 'locked') {
      return res.status(400).json({ error: 'Cannot edit a goal in this status' });
    }

    if (weightage && weightage < 10) {
      return res.status(400).json({ error: 'Individual goal weightage must be at least 10%' });
    }

    // Shared Goals Rule: Employees can only edit weightage
    let dataToUpdate = {
      thrust_area,
      title,
      description,
      uom_type,
      target_value: target_value ? parseFloat(target_value) : undefined,
      weightage: weightage ? parseInt(weightage, 10) : undefined,
      smart_score: smart_score ? parseInt(smart_score, 10) : undefined,
    };

    if (existingGoal.is_shared) {
      dataToUpdate = { weightage: weightage ? parseInt(weightage, 10) : undefined };
    }

    const goal = await prisma.goal.update({
      where: { id: parseInt(id, 10) },
      data: dataToUpdate
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'update_goal',
        user_id: req.user.id,
        details: `Updated goal: ${goal.title}`,
      }
    });

    res.json({ goal, message: 'Goal updated successfully' });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
};

// DELETE /api/goals/:id
export const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const existingGoal = await prisma.goal.findFirst({
      where: { id: parseInt(id, 10), user_id: req.user.id }
    });

    if (!existingGoal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (existingGoal.status !== 'draft' && existingGoal.status !== 'rejected') {
      return res.status(400).json({ error: 'Only draft or rejected goals can be deleted' });
    }

    await prisma.goal.delete({
      where: { id: parseInt(id, 10) }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'delete_goal',
        user_id: req.user.id,
        details: `Deleted goal: ${existingGoal.title}`,
      }
    });

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
};

// POST /api/goals/:id/submit OR POST /api/goals/submit-all
export const submitAllGoals = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { user_id: req.user.id }
    });

    if (goals.length === 0) {
      return res.status(400).json({ error: 'Minimum one goal is required' });
    }

    const totalWeightage = goals.reduce((acc, goal) => acc + goal.weightage, 0);

    if (totalWeightage !== 100) {
      return res.status(400).json({ error: `Total weightage must be exactly 100%. Current is ${totalWeightage}%` });
    }

    const invalidGoals = goals.filter(g => g.weightage < 10);
    if (invalidGoals.length > 0) {
      return res.status(400).json({ error: 'Some goals have weightage less than 10%' });
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

    res.json({ message: 'Goals submitted for approval successfully' });
  } catch (error) {
    console.error('Submit goals error:', error);
    res.status(500).json({ error: 'Failed to submit goals' });
  }
};
