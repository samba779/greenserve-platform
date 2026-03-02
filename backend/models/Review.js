const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  worker_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review_text: {
    type: String
  },
  tags: [{
    type: String
  }],
  is_recommended: {
    type: Boolean,
    default: true
  },
  worker_response: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Review', reviewSchema);
