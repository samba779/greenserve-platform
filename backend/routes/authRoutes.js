const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');
const { validate, userRegistrationSchema, workerRegistrationSchema, loginSchema, otpSchema } = require('../middleware/validation');

const {
  registerUser,
  registerWorker,
  verifyOTP,
  resendOTP,
  login,
  getProfile,
  updateProfile,
  updateLocation
} = require('../controllers/authController');

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  prompt: 'select_account',
  accessType: 'offline'
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=google_auth_failed` 
  }),
  (req, res) => {
    try {
      console.log('OAuth Callback - User:', req.user);
      
      if (!req.user) {
        console.error('No user in request');
        return res.redirect(`${process.env.FRONTEND_URL}/login.html?error=no_user`);
      }
      
      // Generate JWT token for the authenticated user
      const token = jwt.sign(
        { userId: req.user._id, email: req.user.email, type: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );
      
      console.log('Token generated successfully');
      
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/index.html?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
    } catch (error) {
      console.error('OAuth Callback Error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login.html?error=oauth_error&message=${encodeURIComponent(error.message)}`);
    }
  }
);

// Public routes
router.post('/register', validate(userRegistrationSchema), registerUser);
router.post('/worker/register', validate(workerRegistrationSchema), registerWorker);
router.post('/login', validate(loginSchema), login);
router.post('/verify-otp', validate(otpSchema), verifyOTP);
router.post('/resend-otp', resendOTP);

// Cleanup route for testing (remove in production)
router.post('/cleanup-user', async (req, res) => {
  try {
    const { mobile, email } = req.body;
    const User = require('../models/User');
    
    let query = {};
    if (mobile) query.mobile = mobile;
    if (email) query.email = email;
    
    const result = await User.deleteOne(query);
    
    if (result.deletedCount > 0) {
      res.json({ success: true, message: 'User cleaned up successfully' });
    } else {
      res.json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Cleanup failed' });
  }
});

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/location', authMiddleware, updateLocation);

module.exports = router;
