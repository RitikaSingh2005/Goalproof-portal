import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import prisma from '../prisma/client.js';
import { clearDatabase } from './helpers.js';

describe('ADMIN API Endpoints', () => {
  let adminToken;
  let managerToken;
  let employeeToken;

  beforeEach(async () => {
    await clearDatabase(prisma);

    // Register Admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Super Admin',
        email: 'admin@company.com',
        password: 'password123',
        role: 'admin'
      });
    adminToken = adminRes.body.token;

    // Register Manager
    const mgrRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Manager Person',
        email: 'manager@company.com',
        password: 'password123',
        role: 'manager'
      });
    managerToken = mgrRes.body.token;

    // Register Employee
    const empRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Employee Person',
        email: 'employee@company.com',
        password: 'password123',
        role: 'employee'
      });
    employeeToken = empRes.body.token;
  });

  // 26. admin can access admin endpoint
  it('26. should allow admin to access admin-only endpoints', async () => {
    const res = await request(app)
      .get('/api/admin/cycles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const resInsights = await request(app)
      .get('/api/admin/insights')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resInsights.status).toBe(200);
    expect(resInsights.body.success).toBe(true);
  });

  // 27. employee cannot access admin endpoint
  it('27. should block employee from accessing admin-only endpoints', async () => {
    const res = await request(app)
      .get('/api/admin/cycles')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 28. manager cannot access admin-only endpoint
  it('28. should block manager from accessing admin-only endpoints', async () => {
    const res = await request(app)
      .get('/api/admin/cycles')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
