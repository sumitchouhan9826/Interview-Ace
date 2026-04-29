import express from 'express';
import {
  generateQuestions,
  getQuestionsBySession,
  togglePinQuestion,
  getQuestionExplanation
} from '../controllers/question.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/generate', protect, generateQuestions);
router.get('/:sessionId', protect, getQuestionsBySession);
router.patch('/pin/:id', protect, togglePinQuestion);
router.post('/explanation', protect, getQuestionExplanation);

export default router;
