import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import prisma from '../prisma/client.js';
import { clearDatabase } from './helpers.js';

describe('MANAGER API Endpoints', () => {
  let managerToken;
  let employeeToken;
  let managerId;
  let employeeId;

  beforeEach(async () => {
    await clearDatabase(prisma);

    // Register Manager
    const mgrRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Manager Bob',
        email: 'bob.manager@company.com',
        password: 'password123',
        role: 'manager',
        department: 'Engineering'
      });
    managerToken = mgrRes.body.token;
    managerId = mgrRes.body.user.id;

    // Register Employee assigned to Manager Bob
    const empRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Employee Charlie',
        email: 'charlie.emp@company.com',
        password: 'password123',
        role: 'employee',
        department: 'Engineering',
        manager_id: managerId
      });
    employeeToken = empRes.body.token;
    employeeId = empRes.body.user.id;
  });

  // 17. manager can fetch pending goals
  it('17. should allow manager to fetch pending goals for their team', async () => {
    // Create a pending goal for Charlie
    await prisma.goal.create({
      data: {
        user_id: employeeId,
        title: 'Complete Infrastructure Audit',
        thrust_area: 'Engineering',
        uom_type: 'Percentage',
        target_value: 100,
        weightage: 50,
        status: 'pending'
      }
    });

    const res = await request(app)
      .get('/api/manager/pending')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const goals = res.body.goals || res.body.data.goals;
    expect(goals.length).toBe(1);
    expect(goals[0].title).toBe('Complete Infrastructure Audit');
  });

  // 18. manager can approve goal
  it('18. should allow manager to approve a team goal', async () => {
    const goal = await prisma.goal.create({
      data: {
        user_id: employeeId,
        title: 'Deliver Cloud Migration',
        thrust_area: 'Engineering',
        target_value: 100,
        weightage: 50,
        status: 'pending'
      }
    });

    const res = await request(app)
      .put(`/api/manager/goals/${goal.id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
    expect(updated.status).toBe('approved');
    expect(updated.approved_by).toBe(managerId);
  });

  // 19. manager can reject goal
  it('19. should allow manager to reject a team goal', async () => {
    const goal = await prisma.goal.create({
      data: {
        user_id: employeeId,
        title: 'Unrealistic Revenue KPI',
        thrust_area: 'Sales',
        target_value: 500,
        weightage: 50,
        status: 'pending'
      }
    });

    const res = await request(app)
      .put(`/api/manager/goals/${goal.id}/reject`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
    expect(updated.status).toBe('rejected');
  });

  // 20. employee cannot access manager endpoints
  it('20. should block employee from accessing manager endpoints', async () => {
    const resPending = await request(app)
      .get('/api/manager/pending')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(resPending.status).toBe(403);
    expect(resPending.body.success).toBe(false);

    const resTeam = await request(app)
      .get('/api/manager/team')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(resTeam.status).toBe(403);
    expect(resTeam.body.success).toBe(false);
  });
});
