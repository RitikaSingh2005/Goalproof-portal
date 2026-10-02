import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import prisma from '../prisma/client.js';
import { clearDatabase } from './helpers.js';

describe('CHECK-IN & CYCLE API Endpoints', () => {
  let employeeToken;
  let employeeId;
  let approvedGoalId;
  let draftGoalId;

  beforeEach(async () => {
    await clearDatabase(prisma);

    // Register Employee
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Checkin Employee',
        email: 'checkin.emp@company.com',
        password: 'password123',
        role: 'employee'
      });
    employeeToken = regRes.body.token;
    employeeId = regRes.body.user.id;

    // Create an approved goal
    const approvedGoal = await prisma.goal.create({
      data: {
        user_id: employeeId,
        title: 'Approved Production Goal',
        thrust_area: 'Engineering',
        uom_type: 'Numeric',
        target_value: 100,
        weightage: 50,
        status: 'approved'
      }
    });
    approvedGoalId = approvedGoal.id;

    // Create a draft goal
    const draftGoal = await prisma.goal.create({
      data: {
        user_id: employeeId,
        title: 'Draft Unapproved Goal',
        thrust_area: 'Engineering',
        uom_type: 'Numeric',
        target_value: 100,
        weightage: 50,
        status: 'draft'
      }
    });
    draftGoalId = draftGoal.id;
  });

  // 21. active cycle allows check-in
  it('21. should allow check-in when an active cycle encompasses current date', async () => {
    const today = new Date();
    const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

    await prisma.cycle.create({
      data: {
        name: 'Q1 Active Cycle',
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      }
    });

    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        goal_id: approvedGoalId,
        actual_value: 75,
        status: 'On Track',
        description: 'Completed 75 units so far'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const achievement = res.body.achievement || res.body.data.achievement;
    expect(achievement).toBeDefined();
    expect(achievement.actual_value).toBe(75);
    expect(achievement.quarter).toBe('Q1 Active Cycle');
  });

  // 22. inactive cycle rejects check-in
  it('22. should reject check-in with 403 when check-in window is closed (no active cycle)', async () => {
    // No cycles exist in DB
    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        goal_id: approvedGoalId,
        actual_value: 50,
        status: 'On Track'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/closed/i);
  });

  // 23. unapproved goal cannot receive check-in
  it('23. should reject check-in for unapproved goal', async () => {
    // Create active cycle
    const today = new Date();
    await prisma.cycle.create({
      data: {
        name: 'Q1 Active Cycle',
        start_date: new Date(today.getTime() - 100000),
        end_date: new Date(today.getTime() + 10000000),
        status: 'active'
      }
    });

    // Try checkin on draftGoalId
    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        goal_id: draftGoalId,
        actual_value: 40,
        status: 'In Progress'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/approved/i);
  });

  // 24. invalid actual value is rejected
  it('24. should reject check-in when actual_value is missing or invalid', async () => {
    const today = new Date();
    await prisma.cycle.create({
      data: {
        name: 'Q1 Active Cycle',
        start_date: new Date(today.getTime() - 100000),
        end_date: new Date(today.getTime() + 10000000),
        status: 'active'
      }
    });

    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        goal_id: approvedGoalId,
        actual_value: 'not-a-number'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 25. valid check-in creates Achievement
  it('25. should record Achievement in DB and update goal progress with 150% cap', async () => {
    const today = new Date();
    await prisma.cycle.create({
      data: {
        name: 'Q1 2026',
        start_date: new Date(today.getTime() - 100000),
        end_date: new Date(today.getTime() + 10000000),
        status: 'active'
      }
    });

    // Target is 100, actual is 200 (200% should be capped at 150%)
    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        goal_id: approvedGoalId,
        actual_value: 200,
        status: 'Completed',
        description: 'Exceeded target significantly'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const achievements = await prisma.achievement.findMany({
      where: { goal_id: approvedGoalId }
    });
    expect(achievements.length).toBe(1);
    expect(achievements[0].progress_score).toBe(150); // Capped at 150%

    // Check goal updated progress
    const updatedGoal = await prisma.goal.findUnique({ where: { id: approvedGoalId } });
    expect(updatedGoal.progress).toBe(150);
  });
});
