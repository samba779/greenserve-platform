const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  first_name: {
    type: String,
    required: function() {
      return !this.googleId; // Required only if not Google user
    },
    trim: true,
    default: function() {
      return this.googleId ? 'User' : '';
    }
  },
  last_name: {
    type: String,
    required: function() {
      return !this.googleId; // Required only if not Google user
    },
    trim: true,
    default: function() {
      return this.googleId ? '' : '';
    }
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true
  },
  mobile: {
    type: String,
    unique: true,
    sparse: true,
    required: function() {
      return !this.googleId; // Required only if not Google user
    }
  },
  password: {
    type: String
  },
  address: {
    type: String
  },
  city: {
    type: String
  },
  pincode: {
    type: String
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  profile_picture: {
    type: String
  },
  otp_code: String,
  otp_expires_at: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
