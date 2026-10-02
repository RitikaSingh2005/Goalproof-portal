process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-jwt-secret-key-32-chars-long-for-tests';
process.env.OPENAI_API_KEY = 'mock-openai-api-key-for-tests';

import { beforeAll, afterAll } from 'vitest';
import prisma from '../prisma/client.js';

beforeAll(async () => {
  // Clean all records before test suite starts
  try {
    await prisma.achievement.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.cycle.deleteMany();
    await prisma.user.deleteMany();
  } catch (err) {
    // If tables don't exist yet, db push will create them
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
