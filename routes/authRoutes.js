import express from 'express';
import { getAuth } from '@clerk/express';
import User from '../models/User.js';

const router = express.Router();

/**
 * @desc    Sync Clerk user to MongoDB (called after first signup/login)
 * @route   POST /api/auth/sync
 * @access  Private (requires Clerk session)
 */
router.post('/sync', async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const { name, email, profileImage } = req.body;

    // Find existing user or create new one
    let user = await User.findOne({ clerkId: auth.userId });

    if (user) {
      // Update existing user's info
      if (name) user.name = name;
      if (email) user.email = email;
      if (profileImage) user.profileImage = profileImage;
      await user.save();
    } else {
      // Create new MongoDB user linked to Clerk
      user = await User.create({
        clerkId: auth.userId,
        name: name || 'User',
        email: email || `${auth.userId}@clerk.user`,
        profileImage: profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'User synced successfully',
      data: {
        _id: user._id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync user' });
  }
});

/**
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
router.get('/profile', async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const user = await User.findOne({ clerkId: auth.userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
