import express from 'express';
import { createSession, getSessions, getSessionById } from '../controllers/session.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.route('/create').post(protect, createSession);
router.route('/all').get(protect, getSessions);
router.route('/:id').get(protect, getSessionById);

export default router;
