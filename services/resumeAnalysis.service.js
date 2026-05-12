import fs from 'fs';
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
 * Generate content using Groq API.
 */
const generateWithGroq = async (prompt) => {
  try {
    const client = getGroqClient();
    console.log(`[Resume] Calling Groq with model: ${MODEL}`);
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL,
      response_format: { type: "json_object" }
    });

    const text = completion.choices[0].message.content;
    console.log(`[Resume] Success with Groq, response length: ${text.length}`);
    return text;
  } catch (err) {
    console.error(`[Resume] Groq failed: ${err.message}`);
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

/**
 * Send the resume text to Groq and get back interview Q&A.
 * @param {string} resumeText – raw text extracted from PDF
 * @param {number} count – number of questions to generate
 * @returns {Promise<{role: string, experienceLevel: string, questions: Array<{question: string, answer: string}>}>}
 */
export const analyzeResumeWithGroq = async (resumeText, count = 5) => {
  try {
    const prompt = `You are a senior technical interviewer. Below is a candidate's resume.

---
${resumeText.substring(0, 8000)}
---

Perform the following:
1. Identify the candidate's primary job role (e.g. "Frontend Developer", "Data Scientist").
2. Estimate their experience level as one of: "Fresher", "1-3 years", "3-5 years", "5+ years".
3. Generate ${count} challenging, personalized interview questions with detailed answers. Base these on the skills, projects, and experience mentioned in the resume.

Return your response ONLY as a valid JSON object with this exact structure:
{
  "role": "<detected role>",
  "experienceLevel": "<estimated experience>",
  "questions": [
    { "question": "...", "answer": "..." }
  ]
}`;

    console.log(`[Resume] Sending resume (${resumeText.length} chars) to Groq...`);

    const text = await generateWithGroq(prompt);
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
      console.warn('[Resume] Groq returned 0 questions, using fallback');
      return getMockResumeAnalysis(count);
    }

    console.log(`[Resume] Successfully parsed: role="${analysis.role}", level="${analysis.experienceLevel}", ${analysis.questions.length} questions`);
    return analysis;

  } catch (error) {
    console.error('[Resume] Error analysing resume with Groq:', error.message);
    return getMockResumeAnalysis(count);
  }
};

/**
 * Fallback mock data when Groq is unavailable.
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
