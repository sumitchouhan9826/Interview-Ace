import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Models to try in order (first available wins)
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

/**
 * Extract raw text from a PDF file on disk.
 * Uses dynamic import() to load the CJS-only pdf-parse package in ESM.
 * @param {string} filePath – absolute path to the uploaded PDF
 * @returns {Promise<string>} extracted text
 */
export const extractTextFromPDF = async (filePath) => {
  console.log('[Resume] Extracting text from:', filePath);

  const pdfParse = (await import('pdf-parse')).default;

  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);

  if (!data.text || data.text.trim().length === 0) {
    throw new Error('Could not extract text from PDF. The file may be scanned or image-based.');
  }

  console.log(`[Resume] Extracted ${data.text.length} characters from PDF`);
  return data.text;
};

/**
 * Try generating content with model fallback.
 * Attempts each model in MODELS list; falls back to next on failure.
 */
const generateWithFallback = async (ai, prompt) => {
  let lastError = null;

  for (const modelName of MODELS) {
    try {
      console.log(`[Resume] Trying model: ${modelName}`);
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log(`[Resume] Success with ${modelName}, response length: ${text.length}`);
      return text;
    } catch (err) {
      console.warn(`[Resume] ${modelName} failed: ${err.message}`);
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

/**
 * Send the resume text to Gemini and get back interview Q&A.
 * @param {string} resumeText – raw text extracted from PDF
 * @param {number} count – number of questions to generate
 * @returns {Promise<{role: string, experienceLevel: string, questions: Array<{question: string, answer: string}>}>}
 */
export const analyzeResumeWithGemini = async (resumeText, count = 5) => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Resume] GEMINI_API_KEY is not set – returning mock data');
    return getMockResumeAnalysis(count);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const prompt = `You are a senior technical interviewer. Below is a candidate's resume.

---
${resumeText.substring(0, 8000)}
---

Perform the following:
1. Identify the candidate's primary job role (e.g. "Frontend Developer", "Data Scientist").
2. Estimate their experience level as one of: "Fresher", "1-3 years", "3-5 years", "5+ years".
3. Generate ${count} challenging, personalized interview questions with detailed answers. Base these on the skills, projects, and experience mentioned in the resume.

Return your response ONLY as a valid JSON object with this exact structure (no markdown, no code fences):
{
  "role": "<detected role>",
  "experienceLevel": "<estimated experience>",
  "questions": [
    { "question": "...", "answer": "..." }
  ]
}`;

    console.log(`[Resume] Sending resume (${resumeText.length} chars) to Gemini...`);

    const text = await generateWithFallback(genAI, prompt);
    const parsed = safeParseJSON(text);

    // Validate shape
    const analysis = {
      role: parsed.role || 'General Developer',
      experienceLevel: parsed.experienceLevel || 'Fresher',
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    };

    // Ensure experienceLevel matches the Session enum
    const validLevels = ['Fresher', '1-3 years', '3-5 years', '5+ years'];
    if (!validLevels.includes(analysis.experienceLevel)) {
      console.warn(`[Resume] Unexpected experienceLevel "${analysis.experienceLevel}", defaulting to "Fresher"`);
      analysis.experienceLevel = 'Fresher';
    }

    if (analysis.questions.length === 0) {
      console.warn('[Resume] Gemini returned 0 questions, using fallback');
      return getMockResumeAnalysis(count);
    }

    console.log(`[Resume] Successfully parsed: role="${analysis.role}", level="${analysis.experienceLevel}", ${analysis.questions.length} questions`);
    return analysis;

  } catch (error) {
    console.error('[Resume] Error analysing resume with Gemini:', error.message);
    return getMockResumeAnalysis(count);
  }
};

/**
 * Fallback mock data when Gemini is unavailable.
 */
const getMockResumeAnalysis = (count) => ({
  role: 'General Developer',
  experienceLevel: 'Fresher',
  questions: Array.from({ length: count }, (_, i) => ({
    question: `Mock Resume Question ${i + 1}`,
    answer: `Mock Resume Answer ${i + 1}`,
  })),
});

/**
 * Clean up the temporary uploaded file.
 * @param {string} filePath – absolute path to the file
 */
export const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[Resume] Cleaned up temp file:', filePath);
    }
  } catch (err) {
    console.error('[Resume] Failed to clean up uploaded file:', err.message);
  }
};
