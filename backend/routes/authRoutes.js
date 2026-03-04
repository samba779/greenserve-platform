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
  forgotPassword,
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
  async (req, res) => {
    try {
      console.log('OAuth Callback - User:', req.user);
      
      if (!req.user) {
        console.error('No user in request');
        return res.redirect(`${process.env.FRONTEND_URL}/login.html?error=no_user`);
      }
      
      // Check if user is coming from worker login
      const isWorker = req.query.type === 'worker' || req.session?.authType === 'worker';
      
      // Generate JWT token for the authenticated user
      const token = jwt.sign(
        { 
          userId: req.user._id, 
          email: req.user.email, 
          type: isWorker ? 'worker' : 'user',
          userType: isWorker ? 'worker' : 'user'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );
      
      console.log('Token generated successfully for:', isWorker ? 'worker' : 'user');
      
      // Redirect to appropriate dashboard
      const redirectUrl = isWorker 
        ? `${process.env.FRONTEND_URL}/worker-dashboard.html?token=${token}`
        : `${process.env.FRONTEND_URL}/index.html?token=${token}`;
      
      res.redirect(redirectUrl);
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
router.post('/forgot-password', forgotPassword);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/location', authMiddleware, updateLocation);

module.exports = router;
