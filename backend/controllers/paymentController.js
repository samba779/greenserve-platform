const { pool } = require('../config/database');

// Process payment
const processPayment = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { bookingId, paymentMethod, transactionId } = req.body;

    // Get booking details
    const [bookings] = await pool.execute(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = ?',
      [bookingId, userId, 'completed']
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not completed'
      });
    }

    const booking = bookings[0];

    if (booking.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already processed for this booking'
      });
    }

    const amount = booking.total_amount;
    const workerId = booking.worker_id;

    // Create payment record
    const [paymentResult] = await pool.execute(
      `INSERT INTO payments (booking_id, user_id, worker_id, amount, payment_method, transaction_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bookingId, userId, workerId, amount, paymentMethod, transactionId || null, 'success']
    );

    // Update booking payment status
    await pool.execute(
      'UPDATE bookings SET payment_status = ?, payment_method = ? WHERE id = ?',
      ['paid', paymentMethod, bookingId]
    );

    // Credit worker's wallet (minus platform commission)
    if (workerId) {
      const workerEarnings = amount - booking.service_charge; // Service charge goes to platform
      
      // Update worker balance
      await pool.execute(
        'UPDATE workers SET total_earnings = total_earnings + ?, available_balance = available_balance + ? WHERE id = ?',
        [workerEarnings, workerEarnings, workerId]
      );

      // Create wallet transaction
      await pool.execute(
        `INSERT INTO wallet_transactions (worker_id, booking_id, type, amount, description, balance_after)
         SELECT ?, ?, 'credit', ?, ?, available_balance FROM workers WHERE id = ?`,
        [workerId, bookingId, workerEarnings, `Payment for booking #${booking.booking_id}`, workerId]
      );
    }

    // Create notification for worker
    await pool.execute(
      'INSERT INTO notifications (worker_id, title, message, type, booking_id) VALUES (?, ?, ?, ?, ?)',
      [workerId, 'Payment Received', `Payment of ₹${amount} received for booking #${booking.booking_id}`, 'payment', bookingId]
    );

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        paymentId: paymentResult.insertId,
        amount,
        paymentMethod,
        status: 'success'
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed'
    });
  }
};

// Get payment details
const getPaymentDetails = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { bookingId } = req.params;

    let query = `
      SELECT p.*, b.booking_id, b.total_amount, b.service_charge, b.tax_amount,
             s.name as service_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN services s ON b.service_id = s.id
      WHERE p.booking_id = ?
    `;
    const params = [bookingId];

    if (role !== 'admin') {
      query += role === 'worker' ? ' AND p.worker_id = ?' : ' AND p.user_id = ?';
      params.push(userId);
    }

    const [payments] = await pool.execute(query, params);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payments[0]
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details'
    });
  }
};

// Get user's payment history
const getPaymentHistory = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, b.booking_id, s.name as service_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN services s ON b.service_id = s.id
      WHERE p.${role === 'worker' ? 'worker_id' : 'user_id'} = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [payments] = await pool.execute(query, [userId, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
};

module.exports = {
  processPayment,
  getPaymentDetails,
  getPaymentHistory
};
