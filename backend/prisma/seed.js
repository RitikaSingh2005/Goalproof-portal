import prisma from './client.js';
import bcrypt from 'bcryptjs';

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@goalproof.com' },
    update: { password: passwordHash },
    create: {
      name: 'Admin User',
      email: 'admin@goalproof.com',
      password: passwordHash,
      role: 'admin',
      department: 'IT',
    },
  });

  // Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@goalproof.com' },
    update: { password: passwordHash },
    create: {
      name: 'Manager User',
      email: 'manager@goalproof.com',
      password: passwordHash,
      role: 'manager',
      department: 'Engineering',
    },
  });

  // Employee
  const employee = await prisma.user.upsert({
    where: { email: 'employee@goalproof.com' },
    update: { password: passwordHash, manager_id: manager.id },
    create: {
      name: 'Employee User',
      email: 'employee@goalproof.com',
      password: passwordHash,
      role: 'employee',
      department: 'Engineering',
      manager_id: manager.id,
    },
  });

  // Performance Cycle covering current date
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);

  const cycle = await prisma.cycle.upsert({
    where: { id: 1 },
    update: {
      name: `FY ${now.getFullYear()} Annual Cycle`,
      start_date: startOfYear,
      end_date: endOfYear,
      status: 'active'
    },
    create: {
      name: `FY ${now.getFullYear()} Annual Cycle`,
      start_date: startOfYear,
      end_date: endOfYear,
      status: 'active'
    }
  });

  // Clean old demo goals for employee
  await prisma.achievement.deleteMany({ where: { user_id: employee.id } });
  await prisma.goal.deleteMany({ where: { user_id: employee.id } });

  // Demo Goals for Employee (total weightage = 40 + 20 + 40 = 100)
  const goal1 = await prisma.goal.create({
    data: {
      user_id: employee.id,
      thrust_area: 'Sales',
      title: 'Increase Q3 Software Sales',
      description: 'Achieve a 15% increase in enterprise software sales in Q3',
      uom_type: 'Percentage',
      target_value: 15,
      weightage: 40,
      status: 'pending',
      smart_score: 85,
      cycle_id: cycle.id
    }
  });

  const goal2 = await prisma.goal.create({
    data: {
      user_id: employee.id,
      thrust_area: 'Engineering',
      title: 'Reduce bug report resolution time',
      description: 'Lower the average resolution time for critical bugs',
      uom_type: 'Numeric',
      target_value: 24,
      weightage: 20,
      status: 'draft',
      smart_score: 65,
      cycle_id: cycle.id
    }
  });

  const goal3 = await prisma.goal.create({
    data: {
      user_id: employee.id,
      thrust_area: 'Engineering',
      title: 'Maintain 99.9% Production API Uptime',
      description: 'Ensure service reliability and zero critical outages',
      uom_type: 'Percentage',
      target_value: 100,
      weightage: 40,
      status: 'approved',
      progress: 60,
      smart_score: 92,
      cycle_id: cycle.id
    }
  });

  // Sample historical achievement
  await prisma.achievement.create({
    data: {
      user_id: employee.id,
      goal_id: goal3.id,
      quarter: cycle.name,
      year: now.getFullYear(),
      actual_value: 60,
      status: 'On Track',
      progress_score: 60,
      description: 'Q2 mid-cycle uptime verified at 99.92%'
    }
  });

  console.log('Seed successful:', { admin: admin.email, manager: manager.email, employee: employee.email, cycle: cycle.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
