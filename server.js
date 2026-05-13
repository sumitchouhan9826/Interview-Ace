import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';
import connectDB from './config/db.js';
import errorHandler, { notFound } from './middleware/errorMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import sessionRoutes from './routes/session.routes.js';
import questionRoutes from './routes/question.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Connect to MongoDB
connectDB();

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware()); // Clerk session middleware — populates req.auth
app.use(apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/question', questionRoutes);
app.use('/api/resume', resumeRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('InterviewAce API is running...');
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  );
});