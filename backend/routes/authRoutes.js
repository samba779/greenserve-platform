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
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html?error=google_auth_failed' }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const token = jwt.sign(
      { userId: req.user._id, email: req.user.email, type: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    // Redirect to frontend with token
    res.redirect(`/index.html?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
  }
);

// Public routes
router.post('/register', validate(userRegistrationSchema), registerUser);
router.post('/worker/register', validate(workerRegistrationSchema), registerWorker);
router.post('/login', validate(loginSchema), login);
router.post('/verify-otp', validate(otpSchema), verifyOTP);
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/location', authMiddleware, updateLocation);

module.exports = router;
