import { GoogleGenerativeAI } from '@google/generative-ai';


let genAI = null;

// Models to try in order (first available wins)
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

const getGenAI = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[Gemini] GEMINI_API_KEY is not set!');
      return null;
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Try generating content with model fallback.
 * Attempts each model in MODELS list; falls back to next on failure.
 */
const generateWithFallback = async (ai, prompt) => {
  let lastError = null;

  for (const modelName of MODELS) {
    try {
      console.log(`[Gemini] Trying model: ${modelName}`);
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log(`[Gemini] Success with ${modelName}, response length: ${text.length}`);
      return text;
    } catch (err) {
      console.warn(`[Gemini] ${modelName} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
};

/**
 * Safely extract and parse JSON from Gemini's response text.
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
    throw new Error('No JSON structure found in Gemini response');
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
    throw new Error('Malformed JSON in Gemini response – no matching bracket');
  }

  const jsonStr = text.substring(startIndex, endIndex + 1);
  return JSON.parse(jsonStr);
};

// ✅ Generate Questions
export const generateInterviewQuestions = async (role, experienceLevel, count = 3) => {
  try {
    const ai = getGenAI();
    if (!ai) return getDefaultQuestions(count);

    const prompt = `You are an expert technical interviewer. Generate ${count} interview questions and their detailed answers for a ${role} position. The candidate has an experience level of: ${experienceLevel}.
    Format the response EXACTLY as a JSON array of objects, with each object having a "question" and "answer".
    Return ONLY raw JSON.`;

    console.log(`[Gemini] Generating ${count} questions for role="${role}", level="${experienceLevel}"...`);

    const text = await generateWithFallback(ai, prompt);
    const parsed = safeParseJSON(text);

    // Ensure it's an array
    const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

    if (questions.length === 0) {
      console.warn('[Gemini] Parsed response had 0 questions, using fallback');
      return getDefaultQuestions(count);
    }

    console.log(`[Gemini] Successfully parsed ${questions.length} questions`);
    return questions;

  } catch (error) {
    console.error('[Gemini] Error generating questions:', error.message);
    return getDefaultQuestions(count);
  }
};

// ✅ Generate Explanation
export const generateExplanation = async (question, answer) => {
  try {
    const ai = getGenAI();
    if (!ai) return "Fallback Explanation";

    const prompt = `Explain in simple terms:

Question: ${question}
Answer: ${answer}`;

    const text = await generateWithFallback(ai, prompt);
    return text;

  } catch (error) {
    console.error('[Gemini] Error generating explanation:', error.message);
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
