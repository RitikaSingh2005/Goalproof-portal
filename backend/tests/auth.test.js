import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import prisma from '../prisma/client.js';
import { clearDatabase } from './helpers.js';

describe('AUTH API Endpoints', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  // 1. successful registration
  it('1. should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Employee',
        email: 'alice@company.com',
        password: 'password123',
        role: 'employee',
        department: 'Engineering'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('alice@company.com');
  });

  // 2. duplicate email
  it('2. should reject registration with duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Employee',
        email: 'alice@company.com',
        password: 'password123',
        role: 'employee'
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another Alice',
        email: 'alice@company.com',
        password: 'password456',
        role: 'employee'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // 3. invalid email
  it('3. should reject registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bad Email User',
        email: 'not-a-valid-email',
        password: 'password123',
        role: 'employee'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  // 4. invalid password
  it('4. should reject registration with password shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Password User',
        email: 'short@company.com',
        password: '123',
        role: 'employee'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  // 5. successful login
  it('5. should login successfully with valid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login User',
        email: 'login@company.com',
        password: 'secretPassword123',
        role: 'employee'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@company.com',
        password: 'secretPassword123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('login@company.com');
  });

  // 6. incorrect password
  it('6. should reject login with incorrect password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Password Test',
        email: 'pass@company.com',
        password: 'correctPassword',
        role: 'employee'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pass@company.com',
        password: 'wrongPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  // 7. missing authentication token
  it('7. should reject requests to protected endpoints when token is missing', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/token missing/i);
  });
});
