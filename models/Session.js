import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: [true, 'Please add a role for the interview'],
      trim: true,
    },
    experienceLevel: {
      type: String,
      required: [true, 'Please add an experience level'],
      enum: ['Fresher', '1-3 years', '3-5 years', '5+ years'],
    },
    type: {
      type: String,
      enum: ['manual', 'resume-based'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model('Session', sessionSchema);
export default Session;
