import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@goalproof.com' },
    update: {},
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
    update: {},
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
    update: {},
    create: {
      name: 'Employee User',
      email: 'employee@goalproof.com',
      password: passwordHash,
      role: 'employee',
      department: 'Engineering',
      manager_id: manager.id,
    },
  });

  // Demo Goals for Employee
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
    }
  });

  console.log('Seed successful:', { admin, manager, employee, goal1, goal2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
