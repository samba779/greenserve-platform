const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Worker = require('../models/Worker');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.BACKEND_URL 
    ? `${process.env.BACKEND_URL}/api/auth/google/callback` 
    : 'https://greenserve-platform.onrender.com/api/auth/google/callback',
  scope: ['profile', 'email']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user is coming from worker login (stored in session)
    const isWorker = profile._json?.authType === 'worker' || profile.session?.authType === 'worker';
    
    if (isWorker) {
      // Handle worker authentication
      let worker = await Worker.findOne({ 
        $or: [
          { email: profile.emails[0].value },
          { googleId: profile.id }
        ]
      });

      if (worker) {
        if (!worker.googleId) {
          worker.googleId = profile.id;
          worker.is_verified = true; // Auto-verify Google workers
          await worker.save();
        }
        return done(null, worker);
      }

      // Create new worker if doesn't exist
      const nameParts = profile.displayName.split(' ');
      worker = new Worker({
        googleId: profile.id,
        first_name: nameParts[0] || profile.name?.givenName || 'Worker',
        last_name: nameParts.slice(1).join(' ') || profile.name?.familyName || '',
        email: profile.emails[0].value,
        is_verified: true, // Auto-verify Google workers
        profile_picture: profile.photos[0]?.value,
        mobile: '0000000000', // Placeholder, will be updated later
        city: 'Bangalore', // Default city
        skills: [] // Empty skills initially
      });

      await worker.save();
      return done(null, worker);
    } else {
      // Handle user authentication (existing logic)
      let user = await User.findOne({ 
        $or: [
          { email: profile.emails[0].value },
          { googleId: profile.id }
        ]
      });

      if (user) {
        if (!user.googleId) {
          user.googleId = profile.id;
          user.is_verified = true; // Auto-verify Google users
          await user.save();
        }
        return done(null, user);
      }

      // Create new user if doesn't exist
      const nameParts = profile.displayName.split(' ');
      user = new User({
        googleId: profile.id,
        first_name: nameParts[0] || profile.name?.givenName || 'User',
        last_name: nameParts.slice(1).join(' ') || profile.name?.familyName || '',
        email: profile.emails[0].value,
        is_verified: true, // Auto-verify Google users
        profile_picture: profile.photos[0]?.value
      });

      await user.save();
      return done(null, user);
    }

  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
