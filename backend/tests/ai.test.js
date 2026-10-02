import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import prisma from '../prisma/client.js';
import { clearDatabase } from './helpers.js';

// Mock OpenAI client inside test suite
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      constructor() {
        this.chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      score: 88,
                      feedback: 'Specific, measurable and aligned with department targets.',
                      suggestions: ['Add a mid-quarter review date.']
                    })
                  }
                }
              ]
            })
          }
        };
      }
    }
  };
});

describe('AI API Endpoints', () => {
  let userToken;
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(async () => {
    process.env.OPENAI_API_KEY = 'mock-openai-key-for-testing';
    await clearDatabase(prisma);

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'AI Test User',
        email: 'ai.test@company.com',
        password: 'password123',
        role: 'employee'
      });
    userToken = regRes.body.token;
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
  });

  // 29. authenticated request can access AI endpoint
  it('29. should allow authenticated request to access AI endpoint and receive SMART score', async () => {
    const res = await request(app)
      .post('/api/ai/smart-score')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Increase enterprise client renewals by 15% in Q3'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.score).toBe(88);
    expect(data.feedback).toBeDefined();
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  // 30. missing required AI input is rejected
  it('30. should reject request with 400 when required AI input is missing', async () => {
    const res = await request(app)
      .post('/api/ai/smart-score')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: '' // Empty title
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors || res.body.message).toBeDefined();
  });

  // 31. API key configuration errors are handled safely
  it('31. should return a clear 503 configuration error when OPENAI_API_KEY is not configured', async () => {
    // Unset OpenAI API key
    delete process.env.OPENAI_API_KEY;

    const res = await request(app)
      .post('/api/ai/smart-score')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Launch new employee onboarding experience'
      });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('AI_NOT_CONFIGURED');
    expect(res.body.message).toMatch(/not configured/i);
  });
});
