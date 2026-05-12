import Groq from "groq-sdk";

let groq = null;

const getGroqClient = () => {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not defined in environment variables');
    }
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groq;
};

const MODEL = "llama-3.3-70b-versatile";

/**
 * Generate content using Groq API.
 */
const generateWithGroq = async (prompt) => {
  try {
    const client = getGroqClient();
    console.log(`[Groq] Calling with model: ${MODEL}`);
    
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL,
    });

    const text = completion.choices[0].message.content;
    console.log(`[Groq] Success, response length: ${text.length}`);
    return text;
  } catch (err) {
    console.error(`[Groq] Failed: ${err.message}`);
    throw err;
  }
};

/**
 * Safely extract and parse JSON from response text.
 * Handles markdown fences, leading/trailing prose, etc.
 */
const safeParseJSON = (raw) => {
  // 1. Strip markdown code fences
  let text = raw.replace(/```(?:json)?/gi, '').trim();

  // 2. Find the first '[' or '{' and its matching closer
  const startArr = text.indexOf('[');
  const startObj = text.indexOf('{');

  let startIndex = -1;
  let openChar = '';
  let closeChar = '';

  if (startArr === -1 && startObj === -1) {
    throw new Error('No JSON structure found in response');
  } else if (startArr === -1) {
    startIndex = startObj; openChar = '{'; closeChar = '}';
  } else if (startObj === -1) {
    startIndex = startArr; openChar = '['; closeChar = ']';
  } else {
    if (startArr < startObj) {
      startIndex = startArr; openChar = '['; closeChar = ']';
    } else {
      startIndex = startObj; openChar = '{'; closeChar = '}';
    }
  }

  // 3. Walk forward to find the matching closing bracket
  let depth = 0;
  let endIndex = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\') { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openChar) depth++;
    if (ch === closeChar) { depth--; if (depth === 0) { endIndex = i; break; } }
  }

  if (endIndex === -1) {
    throw new Error('Malformed JSON in response – no matching bracket');
  }

  const jsonStr = text.substring(startIndex, endIndex + 1);
  return JSON.parse(jsonStr);
};

// ✅ Generate Questions
export const generateInterviewQuestions = async (role, experienceLevel, count = 3) => {
  try {
    const prompt = `You are an expert technical interviewer. Generate ${count} interview questions and their detailed answers for a ${role} position. The candidate has an experience level of: ${experienceLevel}.
    Format the response EXACTLY as a JSON array of objects, with each object having a "question" and "answer".
    Return ONLY raw JSON.`;

    console.log(`[Groq] Generating ${count} questions for role="${role}", level="${experienceLevel}"...`);

    const text = await generateWithGroq(prompt);
    const parsed = safeParseJSON(text);

    // Ensure it's an array
    const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

    if (questions.length === 0) {
      console.warn('[Groq] Parsed response had 0 questions, using fallback');
      return getDefaultQuestions(count);
    }

    console.log(`[Groq] Successfully parsed ${questions.length} questions`);
    return questions;

  } catch (error) {
    console.error('[Groq] Error generating questions:', error.message);
    return getDefaultQuestions(count);
  }
};

// ✅ Generate Explanation
export const generateExplanation = async (question, answer) => {
  try {
    const prompt = `Explain in simple terms:

Question: ${question}
Answer: ${answer}`;

    const text = await generateWithGroq(prompt);
    return text;

  } catch (error) {
    console.error('[Groq] Error generating explanation:', error.message);
    return "Failed to generate explanation.";
  }
};

// fallback
const getDefaultQuestions = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    question: `Mock Question ${i + 1}`,
    answer: `Mock Answer ${i + 1}`
  }));
};
