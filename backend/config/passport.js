const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
  scope: ['profile', 'email']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { email: profile.emails[0].value },
        { googleId: profile.id }
      ]
    });

    if (user) {
      // If user exists but doesn't have googleId, update it
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
