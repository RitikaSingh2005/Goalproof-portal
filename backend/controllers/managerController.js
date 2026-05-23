import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    res.json({ goals: enrichedGoals });
  } catch (error) {
    console.error('Get pending goals error:', error);
    res.status(500).json({ error: 'Failed to fetch pending goals' });
  }
};

// PUT /api/manager/goals/:id/approve
export const approveGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await prisma.goal.findFirst({
      where: { id: parseInt(id, 10), user: { manager_id: req.user.id } }
    });

    if (!goal) return res.status(404).json({ error: 'Goal not found or unauthorized' });

    const updatedGoal = await prisma.goal.update({
      where: { id: parseInt(id, 10) },
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

    res.json({ goal: updatedGoal, message: 'Goal approved' });
  } catch (error) {
    console.error('Approve goal error:', error);
    res.status(500).json({ error: 'Failed to approve goal' });
  }
};

// PUT /api/manager/goals/:id/reject
export const rejectGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await prisma.goal.findFirst({
      where: { id: parseInt(id, 10), user: { manager_id: req.user.id } }
    });

    if (!goal) return res.status(404).json({ error: 'Goal not found or unauthorized' });

    const updatedGoal = await prisma.goal.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'rejected' }
    });

    await prisma.auditLog.create({
      data: {
        action: 'reject_goal',
        user_id: req.user.id,
        details: `Rejected goal: ${goal.title}`
      }
    });

    res.json({ goal: updatedGoal, message: 'Goal rejected' });
  } catch (error) {
    console.error('Reject goal error:', error);
    res.status(500).json({ error: 'Failed to reject goal' });
  }
};

// PUT /api/manager/goals/:id/edit
export const editGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, target_value, weightage, thrust_area } = req.body;

    const goal = await prisma.goal.findFirst({
      where: { id: parseInt(id, 10), user: { manager_id: req.user.id } }
    });

    if (!goal) return res.status(404).json({ error: 'Goal not found or unauthorized' });

    const updatedGoal = await prisma.goal.update({
      where: { id: parseInt(id, 10) },
      data: {
        title,
        description,
        target_value: target_value ? parseFloat(target_value) : undefined,
        weightage: weightage ? parseInt(weightage, 10) : undefined,
        thrust_area
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'manager_edit_goal',
        user_id: req.user.id,
        details: `Manager edited goal: ${goal.title} before approval`
      }
    });

    res.json({ goal: updatedGoal, message: 'Goal updated' });
  } catch (error) {
    console.error('Edit goal error:', error);
    res.status(500).json({ error: 'Failed to edit goal' });
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

    res.json({ team: teamStats });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team analytics' });
  }
};

// GET /api/manager/attention-score
export const getAttentionScore = async (req, res) => {
  try {
    // Basic heuristic for score calculation
    // Speed of approval (simulated as high if not many pending for long)
    const pendingGoals = await prisma.goal.count({
      where: { status: 'pending', user: { manager_id: req.user.id } }
    });
    
    let score = 95 - (pendingGoals * 5); // Example calculation
    if (score < 0) score = 0;
    
    res.json({ 
      score,
      details: {
        approvalSpeed: 'Excellent',
        pendingActionItems: pendingGoals
      }
    });
  } catch (error) {
    console.error('Attention score error:', error);
    res.status(500).json({ error: 'Failed to calculate attention score' });
  }
};

// POST /api/manager/checkin/:employeeId
export const addComment = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.create({
      data: {
        manager_id: req.user.id,
        employee_id: parseInt(employeeId, 10),
        content
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'add_comment',
        user_id: req.user.id,
        details: `Added comment for employee ID: ${employeeId}`
      }
    });

    res.json({ comment, message: 'Comment added successfully' });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};
