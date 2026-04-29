import express from 'express';
import upload from '../middleware/upload.middleware.js';
import { uploadResume } from '../controllers/resume.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/resume/upload
// Expects multipart/form-data with a single field named "resume"
router.post('/upload', protect, upload.single('resume'), uploadResume);

export default router;
