import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import sessionRoutes from './routes/session.routes.js';
import questionRoutes from './routes/question.routes.js';
import resumeRoutes from './routes/resume.routes.js';


dotenv.config();


// Connect to MongoDB
connectDB();


const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/question', questionRoutes);
app.use('/api/resume', resumeRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('InterviewAce API is running...');
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
