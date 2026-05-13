import { getAuth, clerkClient } from '@clerk/express';
import User from '../models/User.js';

/**
 * Clerk-based route protection middleware.
 * Verifies the Clerk session and attaches the MongoDB user to req.user.
 * Auto-creates a MongoDB user document on first authenticated request,
 * pulling real name/email from Clerk's user API.
 */
const protect = async (req, res, next) => {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no valid session',
      });
    }

    // Find existing MongoDB user by Clerk ID
    let user = await User.findOne({ clerkId: auth.userId });

    if (!user) {
      // Auto-create: fetch real user info from Clerk's backend API
      let name = 'User';
      let email = `${auth.userId}@clerk.user`;

      try {
        const clerkUser = await clerkClient.users.getUser(auth.userId);
        name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User';
        email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
      } catch (clerkErr) {
        console.error('Failed to fetch Clerk user data:', clerkErr.message);
      }

      user = await User.create({
        clerkId: auth.userId,
        name,
        email,
        profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      });
      console.log('Auto-created MongoDB user for Clerk ID:', auth.userId);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, authentication failed',
    });
  }
};

export { protect };
