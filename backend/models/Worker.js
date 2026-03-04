const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true
  },
  mobile: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  address: {
    type: String
  },
  city: {
    type: String,
    required: true
  },
  pincode: {
    type: String
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  years_of_experience: {
    type: Number,
    default: 0
  },
  skills: {
    type: [String],
    default: []
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_online: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  total_reviews: {
    type: Number,
    default: 0
  },
  total_earnings: {
    type: Number,
    default: 0.0
  },
  available_balance: {
    type: Number,
    default: 0.0
  },
  otp_code: String,
  otp_expires_at: Date,
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Worker', workerSchema);