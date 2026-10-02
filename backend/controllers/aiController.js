import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/env.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

// Lazily or conditionally initialize OpenAI client based on active environment key
const getOpenAIClient = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) return null;
  return new OpenAI({ apiKey: key.trim() });
};

export const getSmartScore = async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return errorResponse(res, 400, 'Goal title is required', 'MISSING_TITLE');
    }

    const client = getOpenAIClient();
    if (!client) {
      return errorResponse(
        res,
        503,
        'OpenAI service is not configured. OPENAI_API_KEY is missing.',
        'AI_NOT_CONFIGURED'
      );
    }

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert HR goal evaluator. Rate the provided goal on SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound) from 0-100. Return ONLY valid JSON in this exact format: {\"score\": number, \"feedback\": \"string\", \"suggestions\": [\"string\", \"string\"]}."
        },
        {
          role: "user",
          content: title.trim()
        }
      ],
      temperature: 0.3,
    });

    const aiContent = response.choices?.[0]?.message?.content;
    if (!aiContent) {
      return errorResponse(res, 502, 'Received empty response from AI service', 'AI_EMPTY_RESPONSE');
    }

    const parsedData = JSON.parse(aiContent);
    return successResponse(res, 200, 'SMART score generated successfully', parsedData, parsedData);
  } catch (error) {
    console.error('AI Smart Score error:', error.message || error);
    return errorResponse(res, 502, 'Failed to generate SMART score from AI service', 'AI_SERVICE_ERROR');
  }
};

export const verifyAchievement = async (req, res) => {
  try {
    const { achievement, goalTitle, target } = req.body;
    
    if (achievement === undefined || achievement === null || !goalTitle || target === undefined || target === null) {
      return errorResponse(res, 400, 'Missing required fields for verification (achievement, goalTitle, target)', 'MISSING_FIELDS');
    }

    const client = getOpenAIClient();
    if (!client) {
      return errorResponse(
        res,
        503,
        'OpenAI service is not configured. OPENAI_API_KEY is missing.',
        'AI_NOT_CONFIGURED'
      );
    }

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that verifies if an entered achievement value is realistic for a given goal and target. Return JSON: { \"isRealistic\": boolean, \"warning\": string | null }. A typical achievement range is 0-130% of the target."
        },
        {
          role: "user",
          content: `Is ${achievement} a realistic achievement for goal '${goalTitle}' with target ${target}?`
        }
      ],
      temperature: 0.2,
    });

    const aiContent = response.choices?.[0]?.message?.content;
    if (!aiContent) {
      return errorResponse(res, 502, 'Received empty response from AI service', 'AI_EMPTY_RESPONSE');
    }

    const parsedData = JSON.parse(aiContent);
    return successResponse(res, 200, 'Achievement verified successfully', parsedData, parsedData);
  } catch (error) {
    console.error('AI Verification error:', error.message || error);
    return errorResponse(res, 502, 'Failed to verify achievement via AI service', 'AI_SERVICE_ERROR');
  }
};
