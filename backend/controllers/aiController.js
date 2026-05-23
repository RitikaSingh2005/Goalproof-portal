import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key',
});

export const getSmartScore = async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Goal title is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      // Mock fallback if no API key is provided
      console.log('No OPENAI_API_KEY found, using mock AI response.');
      // Generate a mock score based on length of title to make it somewhat dynamic
      const lengthScore = Math.min(title.length * 2, 100);
      const isSpecific = title.length > 20;
      
      const score = isSpecific ? Math.floor(Math.random() * 20) + 70 : Math.floor(Math.random() * 40) + 30;
      
      return res.json({
        score,
        feedback: isSpecific ? "This goal is well defined and specific." : "This goal is too vague. Try adding more specific details.",
        suggestions: [
          "Include a clear timeline.",
          "Add measurable metrics.",
          "Ensure it aligns with company objectives."
        ]
      });
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert HR goal evaluator. Rate the provided goal on SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound) from 0-100. Return ONLY valid JSON in this exact format: {\"score\": number, \"feedback\": \"string\", \"suggestions\": [\"string\", \"string\"]}."
        },
        {
          role: "user",
          content: title
        }
      ],
      temperature: 0.3,
    });

    const aiContent = response.choices[0].message.content;
    const parsedData = JSON.parse(aiContent);

    res.json(parsedData);
  } catch (error) {
    console.error('AI Smart Score error:', error);
    res.status(500).json({ error: 'Failed to generate SMART score' });
  }
};

export const verifyAchievement = async (req, res) => {
  try {
    const { achievement, goalTitle, target } = req.body;
    
    if (achievement === undefined || !goalTitle || target === undefined) {
      return res.status(400).json({ error: 'Missing required fields for verification' });
    }

    if (!process.env.OPENAI_API_KEY) {
      // Mock logic
      const val = parseFloat(achievement);
      const tgt = parseFloat(target);
      const isRealistic = (val <= tgt * 1.3);
      return res.json({
        isRealistic,
        warning: isRealistic ? null : "This achievement seems unusually high compared to the target. Please verify accuracy."
      });
    }

    const response = await openai.chat.completions.create({
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

    const aiContent = response.choices[0].message.content;
    const parsedData = JSON.parse(aiContent);

    res.json(parsedData);
  } catch (error) {
    console.error('AI Verification error:', error);
    res.status(500).json({ error: 'Failed to verify achievement' });
  }
};
