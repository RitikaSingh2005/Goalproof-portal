import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding demo data for Manager Dashboard...');

  // 1. Create or find Manager
  let manager = await prisma.user.findUnique({ where: { email: 'manager@goalproof.com' } });
  if (!manager) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    manager = await prisma.user.create({
      data: {
        name: 'Alex Manager',
        email: 'manager@goalproof.com',
        password: hashedPassword,
        role: 'manager',
        department: 'Engineering'
      }
    });
  }

  // 2. Create Employees
  const employeeNames = ['Sarah Jenkins', 'Mike Ross', 'John Doe'];
  const employees = [];

  for (let i = 0; i < employeeNames.length; i++) {
    const email = i === 2 ? 'employee@goalproof.com' : `employee${i}@goalproof.com`;
    let emp = await prisma.user.findUnique({ where: { email } });
    if (!emp) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      emp = await prisma.user.create({
        data: {
          name: employeeNames[i],
          email: email,
          password: hashedPassword,
          role: 'employee',
          manager_id: manager.id,
          department: 'Engineering'
        }
      });
    } else {
      // Ensure manager_id is set
      emp = await prisma.user.update({
        where: { id: emp.id },
        data: { manager_id: manager.id }
      });
    }
    employees.push(emp);
  }

  // 3. Create Goals & Achievements
  for (const emp of employees) {
    await prisma.achievement.deleteMany({ where: { user_id: emp.id } });
    await prisma.goal.deleteMany({ where: { user_id: emp.id } });
  }

  // Sarah Jenkins
  const goal1 = await prisma.goal.create({
    data: {
      user_id: employees[0].id,
      title: 'Complete AWS Certification',
      description: 'Get AWS Solutions Architect certification',
      target_value: 100,
      weightage: 30,
      status: 'approved',
      progress: 80,
      updated_at: new Date()
    }
  });

  await prisma.achievement.create({
    data: {
      user_id: employees[0].id,
      goal_id: goal1.id,
      quarter: 'Q4',
      year: 2025,
      actual_value: 80,
      status: 'On Track',
      progress_score: 80,
      description: 'Completed associate cert'
    }
  });

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 20);
  await prisma.goal.create({
    data: {
      user_id: employees[0].id,
      title: 'Migrate legacy DB',
      description: 'Move to PostgreSQL',
      target_value: 100,
      weightage: 70,
      status: 'pending',
      progress: 50,
      updated_at: staleDate
    }
  });

  // Mike Ross (Mismatch alert: Progress >> Target)
  const goal3 = await prisma.goal.create({
    data: {
      user_id: employees[1].id,
      title: 'Increase Code Coverage',
      description: 'Write unit tests for core module',
      target_value: 80,
      weightage: 100,
      status: 'approved',
      progress: 150,
      updated_at: new Date()
    }
  });

  await prisma.achievement.create({
    data: {
      user_id: employees[1].id,
      goal_id: goal3.id,
      quarter: 'Q1',
      year: 2026,
      actual_value: 150,
      status: 'Completed',
      progress_score: 150,
      description: 'Mismatched achievement'
    }
  });

  // John Doe (employee@goalproof.com)
  const goal4 = await prisma.goal.create({
    data: {
      user_id: employees[2].id,
      title: 'Optimize API Response Time',
      description: 'Reduce P99 by 50ms',
      target_value: 50,
      weightage: 50,
      status: 'approved',
      progress: 20,
      updated_at: new Date()
    }
  });
  
  await prisma.achievement.create({
    data: {
      user_id: employees[2].id,
      goal_id: goal4.id,
      quarter: 'Q4',
      year: 2025,
      actual_value: 20,
      status: 'On Track',
      progress_score: 40,
      description: 'Reduced by 20ms'
    }
  });

  await prisma.goal.create({
    data: {
      user_id: employees[2].id,
      title: 'Mentor Junior Devs',
      description: 'Conduct 4 sessions',
      target_value: 4,
      weightage: 50,
      status: 'pending',
      progress: 1,
      updated_at: new Date()
    }
  });

  // 4. Create Audit Logs & Cycles for Admin Dashboard
  const adminUser = employees.find(e => e.email === 'admin@goalproof.com') || employees[0];
  
  await prisma.auditLog.deleteMany({});
  await prisma.auditLog.createMany({
    data: [
      { action: 'login', user_id: adminUser.id, details: 'Admin logged in' },
      { action: 'update_settings', user_id: adminUser.id, details: 'Updated global check-in window' },
      { action: 'export_csv', user_id: adminUser.id, details: 'Exported Q4 2025 compliance report' },
      { action: 'approve_goal', user_id: employees[0].id, details: 'Manager approved goal #1' }
    ]
  });

  await prisma.cycle.deleteMany({});
  await prisma.cycle.createMany({
    data: [
      { name: 'Q4 2025', start_date: new Date('2025-10-01'), end_date: new Date('2025-12-31'), status: 'completed' },
      { name: 'Q1 2026', start_date: new Date('2026-01-01'), end_date: new Date('2026-03-31'), status: 'active' }
    ]
  });

  // 5. Shared Goals & KPI Assignments
  const masterSharedGoal = await prisma.goal.create({
    data: {
      user_id: adminUser.id,
      title: "Q1 Organization Compliance & Security Training",
      description: "Mandatory security and compliance course completion.",
      target_value: 100,
      uom_type: "Percentage",
      thrust_area: "HR",
      status: "approved",
      weightage: 0,
      is_shared: true
    }
  });

  await prisma.goal.createMany({
    data: employees.map(emp => ({
      user_id: emp.id,
      title: masterSharedGoal.title,
      description: masterSharedGoal.description,
      target_value: masterSharedGoal.target_value,
      uom_type: masterSharedGoal.uom_type,
      thrust_area: masterSharedGoal.thrust_area,
    }))
  });

  console.log('Seed data successfully created!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
