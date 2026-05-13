import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Clerk user ID — primary link between Clerk and MongoDB
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
    },
    profileImage: {
      type: String,
      default: 'https://ui-avatars.com/api/?name=User&background=random',
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;
