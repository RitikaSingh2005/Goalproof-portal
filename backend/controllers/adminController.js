import prisma from '../prisma/client.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

// CYCLE MANAGEMENT
export const createCycle = async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    
    // Check for overlapping active cycles
    const activeCycle = await prisma.cycle.findFirst({
      where: { status: 'active' }
    });

    if (activeCycle) {
      await prisma.cycle.update({
        where: { id: activeCycle.id },
        data: { status: 'completed' }
      });
    }

    const cycle = await prisma.cycle.create({
      data: {
        name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        status: 'active'
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'create_cycle',
        user_id: req.user.id,
        details: `Created new cycle: ${name}`
      }
    });

    return successResponse(res, 201, 'Cycle created successfully', { cycle }, { cycle });
  } catch (error) {
    console.error('Create cycle error:', error);
    return errorResponse(res, 500, 'Failed to create cycle', 'CREATE_CYCLE_ERROR');
  }
};

export const updateCycle = async (req, res) => {
  try {
    const { id } = req.params;
    const cycleId = parseInt(id, 10);
    if (isNaN(cycleId)) {
      return errorResponse(res, 400, 'Invalid cycle ID', 'INVALID_ID');
    }

    const { name, start_date, end_date, status } = req.body;
    
    // Check overlaps if activating
    if (status === 'active') {
      const activeCycle = await prisma.cycle.findFirst({
        where: { status: 'active', id: { not: cycleId } }
      });
      if (activeCycle) {
        await prisma.cycle.update({
          where: { id: activeCycle.id },
          data: { status: 'completed' }
        });
      }
    }

    const oldCycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
    if (!oldCycle) {
      return errorResponse(res, 404, 'Cycle not found', 'CYCLE_NOT_FOUND');
    }

    const updatedCycle = await prisma.cycle.update({
      where: { id: cycleId },
      data: {
        name: name !== undefined ? name : oldCycle.name,
        start_date: start_date ? new Date(start_date) : oldCycle.start_date,
        end_date: end_date ? new Date(end_date) : oldCycle.end_date,
        status: status !== undefined ? status : oldCycle.status
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'update_cycle',
        user_id: req.user.id,
        details: JSON.stringify({
          old: { name: oldCycle.name, status: oldCycle.status },
          new: { name: updatedCycle.name, status: updatedCycle.status },
          message: `Updated cycle: ${updatedCycle.name}`
        })
      }
    });

    return successResponse(res, 200, 'Cycle updated successfully', { cycle: updatedCycle }, { cycle: updatedCycle });
  } catch (error) {
    console.error('Update cycle error:', error);
    return errorResponse(res, 500, 'Failed to update cycle', 'UPDATE_CYCLE_ERROR');
  }
};

export const getCycles = async (req, res) => {
  try {
    const cycles = await prisma.cycle.findMany({ orderBy: { start_date: 'desc' } });
    return successResponse(res, 200, 'Cycles fetched successfully', { cycles }, { cycles });
  } catch (error) {
    console.error('Get cycles error:', error);
    return errorResponse(res, 500, 'Failed to fetch cycles', 'FETCH_CYCLES_ERROR');
  }
};

// ORGANIZATION INTELLIGENCE
export const getInsights = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      include: { user: true }
    });
    
    const smartScores = {};
    const teamCompletion = {};
    let totalProgress = 0;
    let completedGoals = 0;
    
    goals.forEach(g => {
      const dept = g.user?.department || 'Unknown';
      if (g.smart_score) {
        if (!smartScores[dept]) smartScores[dept] = { sum: 0, count: 0 };
        smartScores[dept].sum += g.smart_score;
        smartScores[dept].count += 1;
      }
      
      if (!teamCompletion[dept]) teamCompletion[dept] = { progressSum: 0, count: 0 };
      teamCompletion[dept].progressSum += g.progress;
      teamCompletion[dept].count += 1;
      
      totalProgress += g.progress;
      if (g.progress >= 100) completedGoals++;
    });

    const smartScoreByDept = Object.keys(smartScores).map(dept => ({
      department: dept,
      avgScore: Math.round(smartScores[dept].sum / smartScores[dept].count)
    }));
    
    const completionByDept = Object.keys(teamCompletion).map(dept => ({
      department: dept,
      completionRate: Math.round(teamCompletion[dept].progressSum / teamCompletion[dept].count)
    }));

    const totalGoals = goals.length;
    const abandonedGoals = goals.filter(g => g.status === 'rejected' || g.status === 'locked').length;
    const abandonmentRate = totalGoals > 0 ? Math.round((abandonedGoals / totalGoals) * 100) : 0;
    
    const managers = await prisma.user.findMany({ where: { role: 'manager' } });
    const managerRankings = managers.map(m => {
      const deptStats = completionByDept.find(d => d.department === m.department);
      let effectiveness = 70;
      if (deptStats && deptStats.completionRate) {
        effectiveness = Math.min(100, Math.max(0, deptStats.completionRate + 15));
      }
      return {
        name: m.name,
        effectiveness
      };
    }).sort((a, b) => b.effectiveness - a.effectiveness);

    const pendingManagerReviews = goals.filter(g => g.status === 'pending').length;
    
    const users = await prisma.user.findMany({
      where: { role: 'employee' },
      include: { goals: true }
    });
    let employeesCompletedCheckins = 0;
    users.forEach(u => {
      if (u.goals.some(g => g.progress > 0)) employeesCompletedCheckins++;
    });
    
    const commonIssues = [
      { issue: "Vague Description", count: goals.filter(g => g.smart_score && g.smart_score < 70).length },
      { issue: "Unrealistic Target", count: goals.filter(g => g.target_value > 1000).length }
    ].filter(i => i.count > 0);

    const insightsData = {
      smartScoreByDept,
      completionByDept,
      abandonmentRate,
      managerRankings,
      totalGoals,
      completedGoals,
      pendingManagerReviews,
      employeesCompletedCheckins,
      totalEmployees: users.length,
      commonIssues
    };

    return successResponse(res, 200, 'Insights fetched successfully', insightsData, insightsData);
  } catch (error) {
    console.error('Get insights error:', error);
    return errorResponse(res, 500, 'Failed to fetch insights', 'FETCH_INSIGHTS_ERROR');
  }
};

// SHARED GOALS ANALYTICS
export const getSharedAnalytics = async (req, res) => {
  try {
    const sharedGoals = await prisma.goal.findMany({
      where: { is_shared: true },
      include: { user: true }
    });

    const masterGoals = sharedGoals.filter(g => g.shared_from === null);
    const assignedGoals = sharedGoals.filter(g => g.shared_from !== null);

    let totalProgress = 0;
    assignedGoals.forEach(g => totalProgress += g.progress);
    const overallCompletionRate = assignedGoals.length > 0 ? Math.round(totalProgress / assignedGoals.length) : 0;

    const deptStats = {};
    assignedGoals.forEach(g => {
      const dept = g.user?.department || 'Unknown';
      if (!deptStats[dept]) deptStats[dept] = { sum: 0, count: 0 };
      deptStats[dept].sum += g.progress;
      deptStats[dept].count += 1;
    });
    const departmentPerformance = Object.keys(deptStats).map(dept => ({
      department: dept,
      performance: Math.round(deptStats[dept].sum / deptStats[dept].count)
    }));

    const participatingGoals = assignedGoals.filter(g => g.weightage > 0);
    const participationRate = assignedGoals.length > 0 ? Math.round((participatingGoals.length / assignedGoals.length) * 100) : 0;

    const abandonedGoals = assignedGoals.filter(g => g.status === 'rejected').length;
    const abandonmentRate = assignedGoals.length > 0 ? Math.round((abandonedGoals / assignedGoals.length) * 100) : 0;

    const analyticsData = {
      totalMasterGoals: masterGoals.length,
      totalAssignedGoals: assignedGoals.length,
      overallCompletionRate,
      departmentPerformance,
      participationRate,
      abandonmentRate
    };

    return successResponse(res, 200, 'Shared analytics fetched successfully', analyticsData, analyticsData);
  } catch (error) {
    console.error('Get shared analytics error:', error);
    return errorResponse(res, 500, 'Failed to fetch shared analytics', 'FETCH_SHARED_ANALYTICS_ERROR');
  }
};

// AUDIT TRAIL
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    return successResponse(res, 200, 'Audit logs fetched successfully', { logs }, { logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return errorResponse(res, 500, 'Failed to fetch audit logs', 'FETCH_AUDIT_LOGS_ERROR');
  }
};

// CSV EXPORT
export const downloadReport = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      include: { user: true }
    });

    let csv = 'Employee,Department,Goal Title,Target,Progress,Status,Created At\n';
    goals.forEach(g => {
      const emp = `"${(g.user?.name || '').replace(/"/g, '""')}"`;
      const dept = `"${(g.user?.department || '').replace(/"/g, '""')}"`;
      const title = `"${(g.title || '').replace(/"/g, '""')}"`;
      const target = g.target_value ?? 0;
      const progress = g.progress ?? 0;
      const status = g.status || '';
      const date = g.created_at ? g.created_at.toISOString().split('T')[0] : '';
      
      csv += `${emp},${dept},${title},${target},${progress},${status},${date}\n`;
    });

    await prisma.auditLog.create({
      data: {
        action: 'export_csv',
        user_id: req.user.id,
        details: 'Exported full goals report'
      }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="goalproof_report.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Export error:', error);
    return errorResponse(res, 500, 'Failed to generate report', 'REPORT_GENERATION_ERROR');
  }
};

// GOAL OVERRIDE
export const unlockGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) {
      return errorResponse(res, 400, 'Invalid goal ID', 'INVALID_ID');
    }

    const { justification } = req.body;

    if (!justification || !justification.trim()) {
      return errorResponse(res, 400, 'Justification is required to unlock a goal.', 'MISSING_JUSTIFICATION');
    }

    const existing = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!existing) {
      return errorResponse(res, 404, 'Goal not found', 'GOAL_NOT_FOUND');
    }

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: { status: 'draft' } // Set to draft so employee can edit and re-submit
    });

    await prisma.auditLog.create({
      data: {
        action: 'unlock_override',
        user_id: req.user.id,
        details: JSON.stringify({
          oldStatus: existing.status,
          newStatus: 'draft',
          message: `Unlocked goal ID ${goalId}. Justification: ${justification.trim()}`
        })
      }
    });

    return successResponse(res, 200, 'Goal unlocked successfully', { goal }, { goal });
  } catch (error) {
    console.error('Unlock error:', error);
    return errorResponse(res, 500, 'Failed to unlock goal', 'UNLOCK_GOAL_ERROR');
  }
};

// SHARED GOALS & EMPLOYEES
export const getEmployees = async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: 'employee' },
      select: { id: true, name: true, email: true, department: true }
    });
    return successResponse(res, 200, 'Employees fetched successfully', { employees }, { employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return errorResponse(res, 500, 'Failed to fetch employees', 'FETCH_EMPLOYEES_ERROR');
  }
};

export const createSharedGoal = async (req, res) => {
  try {
    const { title, description, target_value, uom_type, thrust_area, employeeIds } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return errorResponse(res, 400, 'Must select at least one employee.', 'NO_EMPLOYEES_SELECTED');
    }

    const masterGoal = await prisma.goal.create({
      data: {
        user_id: req.user.id,
        title,
        description: description || null,
        target_value: parseFloat(target_value) || 0,
        uom_type: uom_type || 'Numeric',
        thrust_area: thrust_area || 'Operations',
        status: 'approved',
        is_shared: true
      }
    });

    const childGoals = employeeIds.map(empId => ({
      user_id: parseInt(empId, 10),
      title,
      description: description || null,
      target_value: parseFloat(target_value) || 0,
      uom_type: uom_type || 'Numeric',
      thrust_area: thrust_area || 'Operations',
      status: 'pending',
      is_shared: true,
      shared_from: masterGoal.id,
      weightage: 0
    }));

    await prisma.goal.createMany({ data: childGoals });

    await prisma.auditLog.create({
      data: {
        action: 'create_shared_goal',
        user_id: req.user.id,
        details: `Created master KPI "${title}" and assigned to ${employeeIds.length} employees.`
      }
    });

    return successResponse(res, 201, 'Shared goal successfully bulk-assigned', { masterGoal }, { masterGoal });
  } catch (error) {
    console.error('Create shared goal error:', error);
    return errorResponse(res, 500, 'Failed to create shared goals', 'CREATE_SHARED_GOAL_ERROR');
  }
};
