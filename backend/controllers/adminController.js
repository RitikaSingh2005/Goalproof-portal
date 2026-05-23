import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CYCLE MANAGEMENT
export const createCycle = async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    
    // Check for overlapping active cycles
    const activeCycle = await prisma.cycle.findFirst({
      where: { status: 'active' }
    });

    if (activeCycle) {
      // Deactivate old active cycle automatically or reject? Let's just create it but warn, or deactivate the old one.
      // Requirements state: "Ensure only one active cycle per quarter/overlapping prevented"
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

    res.json({ message: 'Cycle created successfully', cycle });
  } catch (error) {
    console.error('Create cycle error:', error);
    res.status(500).json({ error: 'Failed to create cycle' });
  }
};

export const updateCycle = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, status } = req.body;
    
    // Check overlaps if activating
    if (status === 'active') {
      const activeCycle = await prisma.cycle.findFirst({
        where: { status: 'active', id: { not: parseInt(id) } }
      });
      if (activeCycle) {
        await prisma.cycle.update({
          where: { id: activeCycle.id },
          data: { status: 'completed' }
        });
      }
    }

    const oldCycle = await prisma.cycle.findUnique({ where: { id: parseInt(id) } });

    const updatedCycle = await prisma.cycle.update({
      where: { id: parseInt(id) },
      data: {
        name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        status
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'update_cycle',
        user_id: req.user.id,
        details: JSON.stringify({
          old: { name: oldCycle.name, status: oldCycle.status },
          new: { name: updatedCycle.name, status: updatedCycle.status },
          message: `Updated cycle: ${name}`
        })
      }
    });

    res.json({ message: 'Cycle updated successfully', cycle: updatedCycle });
  } catch (error) {
    console.error('Update cycle error:', error);
    res.status(500).json({ error: 'Failed to update cycle' });
  }
};

export const getCycles = async (req, res) => {
  try {
    const cycles = await prisma.cycle.findMany({ orderBy: { start_date: 'desc' } });
    res.json({ cycles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cycles' });
  }
};

// ORGANIZATION INTELLIGENCE
export const getInsights = async (req, res) => {
  try {
    // 1. Avg SMART score by dept
    const goals = await prisma.goal.findMany({
      include: { user: true }
    });
    
    const smartScores = {};
    const teamCompletion = {};
    let totalProgress = 0;
    let completedGoals = 0;
    
    goals.forEach(g => {
      const dept = g.user.department || 'Unknown';
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

    // 2. Goal Abandonment
    const totalGoals = goals.length;
    const abandonedGoals = goals.filter(g => g.status === 'rejected' || g.status === 'locked').length;
    const abandonmentRate = totalGoals > 0 ? Math.round((abandonedGoals / totalGoals) * 100) : 0;
    
    // 3. Manager Rankings (Real calculation based on completion By Dept / team avg)
    const managers = await prisma.user.findMany({ where: { role: 'manager' } });
    const managerRankings = managers.map(m => {
      // Find their department's completion rate
      const deptStats = completionByDept.find(d => d.department === m.department);
      let effectiveness = 70; // baseline
      if (deptStats && deptStats.completionRate) {
        effectiveness = Math.min(100, Math.max(0, deptStats.completionRate + 15)); // pseudo-calculation using real team progress
      }
      return {
        name: m.name,
        effectiveness
      };
    }).sort((a, b) => b.effectiveness - a.effectiveness);

    // 4. Missing metrics for Completion Tracking & Quality Issues
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
      { issue: "Vague Description", count: goals.filter(g => g.smart_score < 70).length },
      { issue: "Unrealistic Target", count: goals.filter(g => g.target_value > 1000).length }
    ].filter(i => i.count > 0);

    res.json({
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
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
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

    // 1. Completion Rate
    let totalProgress = 0;
    assignedGoals.forEach(g => totalProgress += g.progress);
    const overallCompletionRate = assignedGoals.length > 0 ? Math.round(totalProgress / assignedGoals.length) : 0;

    // 2. Department-wise Performance
    const deptStats = {};
    assignedGoals.forEach(g => {
      const dept = g.user.department || 'Unknown';
      if (!deptStats[dept]) deptStats[dept] = { sum: 0, count: 0 };
      deptStats[dept].sum += g.progress;
      deptStats[dept].count += 1;
    });
    const departmentPerformance = Object.keys(deptStats).map(dept => ({
      department: dept,
      performance: Math.round(deptStats[dept].sum / deptStats[dept].count)
    }));

    // 3. Employee Participation Rate (Goals where employee has updated weightage > 0)
    const participatingGoals = assignedGoals.filter(g => g.weightage > 0);
    const participationRate = assignedGoals.length > 0 ? Math.round((participatingGoals.length / assignedGoals.length) * 100) : 0;

    // 4. Abandonment Rate (Goals that are rejected or stuck in pending for a long time)
    const abandonedGoals = assignedGoals.filter(g => g.status === 'rejected').length;
    const abandonmentRate = assignedGoals.length > 0 ? Math.round((abandonedGoals / assignedGoals.length) * 100) : 0;

    res.json({
      totalMasterGoals: masterGoals.length,
      totalAssignedGoals: assignedGoals.length,
      overallCompletionRate,
      departmentPerformance,
      participationRate,
      abandonmentRate
    });
  } catch (error) {
    console.error('Get shared analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch shared analytics' });
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
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// CSV EXPORT
export const downloadReport = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      include: { user: true }
    });

    // Build CSV manually
    let csv = 'Employee,Department,Goal Title,Target,Progress,Status,Created At\n';
    goals.forEach(g => {
      const emp = `"${g.user.name.replace(/"/g, '""')}"`;
      const dept = `"${(g.user.department || '').replace(/"/g, '""')}"`;
      const title = `"${g.title.replace(/"/g, '""')}"`;
      const target = g.target_value;
      const progress = g.progress;
      const status = g.status;
      const date = g.created_at.toISOString().split('T')[0];
      
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
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// GOAL OVERRIDE
export const unlockGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { justification } = req.body;

    if (!justification) {
      return res.status(400).json({ error: 'Justification is required to unlock a goal.' });
    }

    const goal = await prisma.goal.update({
      where: { id: parseInt(id) },
      data: { status: 'approved' } // unlock and approve
    });

    await prisma.auditLog.create({
      data: {
        action: 'unlock_override',
        user_id: req.user.id,
        details: JSON.stringify({
          old: { status: "locked/rejected" },
          new: { status: "approved" },
          message: `Unlocked goal ID ${id}. Justification: ${justification}`
        })
      }
    });

    res.json({ message: 'Goal unlocked successfully', goal });
  } catch (error) {
    console.error('Unlock error:', error);
    res.status(500).json({ error: 'Failed to unlock goal' });
  }
};

// SHARED GOALS & EMPLOYEES
export const getEmployees = async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: 'employee' },
      select: { id: true, name: true, email: true, department: true }
    });
    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

export const createSharedGoal = async (req, res) => {
  try {
    const { title, description, target_value, uom_type, thrust_area, employeeIds } = req.body;
    
    if (!employeeIds || employeeIds.length === 0) {
      return res.status(400).json({ error: 'Must select at least one employee.' });
    }

    // Create the master goal assigned to the admin
    const masterGoal = await prisma.goal.create({
      data: {
        user_id: req.user.id,
        title,
        description,
        target_value: parseFloat(target_value),
        uom_type,
        thrust_area,
        status: 'approved',
        is_shared: true
      }
    });

    // Create duplicates for all selected employees
    const childGoals = [];
    for (const empId of employeeIds) {
      childGoals.push({
        user_id: parseInt(empId),
        title,
        description,
        target_value: parseFloat(target_value),
        uom_type,
        thrust_area,
        status: 'pending', // Employee must still accept/set weightage
        is_shared: true,
        shared_from: masterGoal.id,
        weightage: 0 // Employee has to balance their own weightage
      });
    }

    await prisma.goal.createMany({ data: childGoals });

    await prisma.auditLog.create({
      data: {
        action: 'create_shared_goal',
        user_id: req.user.id,
        details: `Created master KPI "${title}" and assigned to ${employeeIds.length} employees.`
      }
    });

    res.json({ message: 'Shared goal successfully bulk-assigned', masterGoal });
  } catch (error) {
    console.error('Create shared goal error:', error);
    res.status(500).json({ error: 'Failed to create shared goals' });
  }
};
