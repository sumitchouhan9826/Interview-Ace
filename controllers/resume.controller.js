import Session from '../models/Session.js';
import Question from '../models/Question.js';
import {
  extractTextFromPDF,
  analyzeResumeWithGemini,
  cleanupFile,
} from '../services/resumeAnalysis.service.js';

// @desc    Upload resume PDF, analyze it, create session + questions
// @route   POST /api/resume/upload
// @access  Private
export const uploadResume = async (req, res, next) => {
  const filePath = req.file?.path;

  try {
    // 1. Validate file exists
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a PDF file');
    }

    // 2. Extract text from PDF
    const resumeText = await extractTextFromPDF(filePath);

    // 3. Send to Gemini for analysis
    const analysis = await analyzeResumeWithGemini(resumeText);

    // 4. Create a session of type "resume-based"
    const session = await Session.create({
      userId: req.user._id,
      role: analysis.role || 'General',
      experienceLevel: analysis.experienceLevel || 'Fresher',
      type: 'resume-based',
    });

    // 5. Save generated questions
    const questionsToInsert = analysis.questions.map((q) => ({
      sessionId: session._id,
      question: q.question,
      answer: q.answer,
    }));

    const savedQuestions = await Question.insertMany(questionsToInsert);

    // 6. Clean up the temp file
    cleanupFile(filePath);

    // 7. Respond
    res.status(201).json({
      session,
      questions: savedQuestions,
    });
  } catch (error) {
    // Always try to clean up the uploaded file on error
    if (filePath) cleanupFile(filePath);
    next(error);
  }
};
