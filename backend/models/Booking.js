const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  booking_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  worker_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  },
  service_id: {
    type: String,
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    required: true
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled', 'rejected'],
    default: 'requested'
  },
  booking_date: {
    type: Date,
    required: true
  },
  booking_time: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  service_charge: {
    type: Number,
    default: 0.0
  },
  tax_amount: {
    type: Number,
    default: 0.0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  payment_method: {
    type: String
  },
  cancellation_reason: {
    type: String
  },
  cancelled_by: {
    type: String,
    enum: ['user', 'worker', 'system']
  },
  completed_at: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);
