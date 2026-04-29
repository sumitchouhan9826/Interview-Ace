import Session from '../models/Session.js';
import Question from '../models/Question.js';

// @desc    Create new session
// @route   POST /api/session/create
// @access  Private
export const createSession = async (req, res, next) => {
  try {
    const { role, experienceLevel } = req.body;

    if (!role || !experienceLevel) {
      res.status(400);
      throw new Error('Please provide role and experience level');
    }

    const session = await Session.create({
      userId: req.user._id,
      role,
      experienceLevel,
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all user sessions
// @route   GET /api/session/all
// @access  Private
export const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

// @desc    Get session by ID
// @route   GET /api/session/:id
// @access  Private
export const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);

    if (session && session.userId.toString() === req.user._id.toString()) {
      res.json(session);
    } else {
      res.status(404);
      throw new Error('Session not found or not authorized');
    }
  } catch (error) {
    next(error);
  }
};
