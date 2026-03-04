const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { validate, bookingSchema } = require('../middleware/validation');

const {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
  getWorkerBookings,
  getAvailableBookings
} = require('../controllers/bookingController');

// User routes
router.post('/', authMiddleware, (req, res, next) => {
  try {
    console.log('🔍 Route received request body:', JSON.stringify(req.body, null, 2));
    validate(bookingSchema)(req, res, next);
  } catch (error) {
    console.error('❌ Route validation error:', error);
    return res.status(400).json({
      success: false,
      message: 'Validation error: ' + error.message
    });
  }
}, createBooking);
router.get('/my-bookings', authMiddleware, getUserBookings);
router.get('/available', authMiddleware, getAvailableBookings); // For workers
router.get('/worker-bookings', authMiddleware, getWorkerBookings); // For workers

// Common routes a
router.get('/:id', authMiddleware, getBookingById);
router.put('/:id/cancel', authMiddleware, cancelBooking);

// Worker routes
router.put('/:id/accept', authMiddleware, acceptBooking);
router.put('/:id/reject', authMiddleware, rejectBooking);
router.put('/:id/status', authMiddleware, updateBookingStatus);

module.exports = router;
