import Question from '../models/Question.js';
import Session from '../models/Session.js';
import { generateInterviewQuestions, generateExplanation } from '../services/gemini.service.js';

// @desc    Generate questions for a session
// @route   POST /api/question/generate
// @access  Private
export const generateQuestions = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    const session = await Session.findById(sessionId);
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error('Session not found');
    }

    // Call Gemini Service
    const generatedData = await generateInterviewQuestions(session.role, session.experienceLevel, 5);

    // Save questions to DB
    const questionsToInsert = generatedData.map((q) => ({
      sessionId: session._id,
      question: q.question,
      answer: q.answer,
    }));

    const savedQuestions = await Question.insertMany(questionsToInsert);

    res.status(201).json(savedQuestions);
  } catch (error) {
    next(error);
  }
};

// @desc    Get questions by session ID
// @route   GET /api/question/:sessionId
// @access  Private
export const getQuestionsBySession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error('Session not found');
    }

    const questions = await Question.find({ sessionId: req.params.sessionId });
    res.json(questions);
  } catch (error) {
    next(error);
  }
};

// @desc    Pin or unpin a question
// @route   PATCH /api/question/pin/:id
// @access  Private
export const togglePinQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).populate('sessionId');
    
    if (!question || question.sessionId.userId.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error('Question not found');
    }

    question.isPinned = !question.isPinned;
    const updatedQuestion = await question.save();

    res.json(updatedQuestion);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate explanation for a question
// @route   POST /api/question/explanation
// @access  Private
export const getQuestionExplanation = async (req, res, next) => {
  try {
    const { questionId } = req.body;

    const question = await Question.findById(questionId).populate('sessionId');
    
    if (!question || question.sessionId.userId.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error('Question not found');
    }

    // Generate explanation if not already exists
    if (!question.explanation) {
      const explanation = await generateExplanation(question.question, question.answer);
      question.explanation = explanation;
      await question.save();
    }

    res.json(question);
  } catch (error) {
    next(error);
  }
};
