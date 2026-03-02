const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { validate, paymentSchema } = require('../middleware/validation');

const {
  processPayment,
  getPaymentDetails,
  getPaymentHistory
} = require('../controllers/paymentController');

router.post('/', authMiddleware, validate(paymentSchema), processPayment);
router.get('/history', authMiddleware, getPaymentHistory);
router.get('/:bookingId', authMiddleware, getPaymentDetails);

module.exports = router;
