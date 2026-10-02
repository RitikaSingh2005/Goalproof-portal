import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import prisma from '../prisma/client.js';
import { clearDatabase } from './helpers.js';

describe('GOALS API Endpoints', () => {
  let userAToken;
  let userBToken;
  let userAId;
  let userBId;

  beforeEach(async () => {
    await clearDatabase(prisma);

    // Register User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User A',
        email: 'usera@company.com',
        password: 'password123',
        role: 'employee'
      });
    userAToken = regA.body.token;
    userAId = regA.body.user.id;

    // Register User B
    const regB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User B',
        email: 'userb@company.com',
        password: 'password123',
        role: 'employee'
      });
    userBToken = regB.body.token;
    userBId = regB.body.user.id;
  });

  // 8. authenticated user can fetch goals
  it('8. should allow authenticated user to fetch goals', async () => {
    const res = await request(app)
      .get('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.goals || res.body.data.goals)).toBe(true);
  });

  // 9. unauthenticated user cannot fetch goals
  it('9. should reject goal fetch for unauthenticated user', async () => {
    const res = await request(app).get('/api/goals');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 10. valid goal creation
  it('10. should create a valid goal successfully', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Improve Core API Response Time',
        thrust_area: 'Engineering',
        description: 'Reduce latency by 20%',
        uom_type: 'Percentage',
        target_value: 20,
        weightage: 30
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const goal = res.body.goal || res.body.data.goal;
    expect(goal).toBeDefined();
    expect(goal.title).toBe('Improve Core API Response Time');
    expect(goal.status).toBe('draft');
  });

  // 11. invalid goal creation
  it('11. should reject invalid goal creation (missing required fields or weightage < 10)', async () => {
    const resMissingTitle = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        thrust_area: 'Engineering',
        uom_type: 'Numeric',
        target_value: 50,
        weightage: 20
      });
    expect(resMissingTitle.status).toBe(400);
    expect(resMissingTitle.body.success).toBe(false);

    const resLowWeightage = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Valid Title',
        thrust_area: 'Sales',
        uom_type: 'Numeric',
        target_value: 10,
        weightage: 5 // less than minimum 10
      });
    expect(resLowWeightage.status).toBe(400);
    expect(resLowWeightage.body.success).toBe(false);
  });

  // 12. update own goal
  it('12. should allow employee to update their own draft goal', async () => {
    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Initial Goal Title',
        thrust_area: 'Sales',
        uom_type: 'Numeric',
        target_value: 100,
        weightage: 25
      });
    const goalId = (createRes.body.goal || createRes.body.data.goal).id;

    const updateRes = await request(app)
      .put(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Updated Goal Title',
        weightage: 35
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    const updatedGoal = updateRes.body.goal || updateRes.body.data.goal;
    expect(updatedGoal.title).toBe('Updated Goal Title');
    expect(updatedGoal.weightage).toBe(35);
  });

  // 13. cannot modify another user's goal
  it("13. should prevent modifying another user's goal", async () => {
    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: "User A's Private Goal",
        thrust_area: 'Engineering',
        uom_type: 'Numeric',
        target_value: 50,
        weightage: 20
      });
    const goalId = (createRes.body.goal || createRes.body.data.goal).id;

    // User B tries to update User A's goal
    const updateRes = await request(app)
      .put(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        title: 'Hacked Goal Title'
      });

    expect(updateRes.status).toBe(403);
    expect(updateRes.body.success).toBe(false);
  });

  // 14. delete draft/rejected goal
  it('14. should allow deleting a draft or rejected goal', async () => {
    const createRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Goal to Delete',
        thrust_area: 'Engineering',
        uom_type: 'Numeric',
        target_value: 10,
        weightage: 15
      });
    const goalId = (createRes.body.goal || createRes.body.data.goal).id;

    const deleteRes = await request(app)
      .delete(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const check = await prisma.goal.findUnique({ where: { id: goalId } });
    expect(check).toBeNull();
  });

  // 15. submit goals
  it('15. should submit all goals when total weightage equals exactly 100%', async () => {
    // Create goals totaling 100% (40 + 30 + 30)
    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Goal 1', thrust_area: 'Sales', uom_type: 'Numeric', target_value: 10, weightage: 40 });

    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Goal 2', thrust_area: 'Engineering', uom_type: 'Numeric', target_value: 20, weightage: 30 });

    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Goal 3', thrust_area: 'Operations', uom_type: 'Numeric', target_value: 30, weightage: 30 });

    const submitRes = await request(app)
      .post('/api/goals/submit-all')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);

    const userGoals = await prisma.goal.findMany({ where: { user_id: userAId } });
    expect(userGoals.every(g => g.status === 'pending')).toBe(true);
  });

  // 16. reject invalid weightage totals
  it('16. should reject submission when total weightage is not exactly 100%', async () => {
    // Total weightage = 40 + 20 = 60%
    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Goal 1', thrust_area: 'Sales', uom_type: 'Numeric', target_value: 10, weightage: 40 });

    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Goal 2', thrust_area: 'Engineering', uom_type: 'Numeric', target_value: 20, weightage: 20 });

    const submitRes = await request(app)
      .post('/api/goals/submit-all')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.success).toBe(false);
    expect(submitRes.body.message).toMatch(/100%/);
  });
});
