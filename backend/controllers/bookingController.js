const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Hardcoded services to match frontend
const services = {
  solar: { id: 'solar', title: 'Solar Services', base_price: 150000, category_id: 1 },
  energy: { id: 'energy', title: 'Energy Audit', base_price: 5000, category_id: 2 },
  biogas: { id: 'biogas', title: 'Bio-Gas Services', base_price: 45000, category_id: 3 },
  gardening: { id: 'gardening', title: 'Gardening & Landscaping', base_price: 3000, category_id: 4 },
  waste: { id: 'waste', title: 'Waste Management', base_price: 1500, category_id: 5 },
  water: { id: 'water', title: 'Water Conservation', base_price: 25000, category_id: 6 },
  ev: { id: 'ev', title: 'EV Charging Support', base_price: 35000, category_id: 7 },
  maintenance: { id: 'maintenance', title: 'Green Maintenance', base_price: 1500, category_id: 8 }
};

// Generate unique booking ID
const generateBookingId = () => {
  return 'GR' + Math.floor(100000 + Math.random() * 900000);
};

// Create new booking
const createBooking = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { serviceId, bookingDate, bookingTime, address, city, latitude, longitude, notes } = req.body;

    console.log('🔍 Booking Request:', { serviceId, userId, bookingDate, bookingTime });

    // Get service details from hardcoded services
    const service = services[serviceId];
    
    if (!service) {
      console.log('❌ Service not found:', serviceId);
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    console.log('✅ Service found:', service);
    
    // Calculate pricing
    const basePrice = parseFloat(service.base_price);
    const serviceCharge = basePrice * 0.10; // 10% platform fee
    const taxAmount = basePrice * 0.18; // 18% GST
    const totalAmount = basePrice + serviceCharge + taxAmount;

    // Generate booking ID
    const bookingId = generateBookingId();

    // Create booking
    const [result] = await pool.execute(
      `INSERT INTO bookings 
       (booking_id, user_id, service_id, category_id, booking_date, booking_time, 
        address, city, latitude, longitude, price, service_charge, tax_amount, total_amount, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested')`,
      [bookingId, userId, serviceId, service.category_id, bookingDate, bookingTime,
       address, city, latitude, longitude, basePrice, serviceCharge, taxAmount, totalAmount, notes || null]
    );

    // Add to status history
    await pool.execute(
      'INSERT INTO booking_status_history (booking_id, status, notes, created_by) VALUES (?, ?, ?, ?)',
      [result.insertId, 'requested', 'Booking created', userId]
    );

    // Find nearby workers
    const [nearbyWorkers] = await pool.execute(
      `SELECT w.id, w.first_name, w.last_name, w.rating, w.total_reviews,
              (6371 * acos(cos(radians(?)) * cos(radians(w.latitude)) * 
              cos(radians(w.longitude) - radians(?)) + sin(radians(?)) * 
              sin(radians(w.latitude)))) AS distance
       FROM workers w
       JOIN worker_skills ws ON w.id = ws.worker_id
       WHERE ws.category_id = ? AND w.is_online = TRUE AND w.is_active = TRUE AND w.is_verified = TRUE
       HAVING distance < 50
       ORDER BY distance
       LIMIT 5`,
      [latitude, longitude, latitude, service.category_id]
    );

    // TODO: Send notifications to nearby workers

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        bookingId: result.insertId,
        bookingRef: bookingId,
        status: 'requested',
        totalAmount,
        nearbyWorkers: nearbyWorkers.length
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { status } = req.query;

    let query = `
      SELECT b.id, b.booking_id, b.status, b.booking_date, b.booking_time, 
             b.address, b.city, b.total_amount, b.payment_status,
             s.name as service_name, sc.name as category_name, sc.icon as category_icon,
             w.first_name as worker_first_name, w.last_name as worker_last_name, w.mobile as worker_mobile,
             w.rating as worker_rating
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN service_categories sc ON b.category_id = sc.id
      LEFT JOIN workers w ON b.worker_id = w.id
      WHERE b.user_id = ?
    `;

    const params = [userId];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.created_at DESC';

    const [bookings] = await pool.execute(query, params);

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;

    let query = `
      SELECT b.*, s.name as service_name, s.description as service_description,
             sc.name as category_name, sc.icon as category_icon,
             w.first_name as worker_first_name, w.last_name as worker_last_name,
             w.mobile as worker_mobile, w.rating as worker_rating, w.total_reviews as worker_total_reviews
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN service_categories sc ON b.category_id = sc.id
      LEFT JOIN workers w ON b.worker_id = w.id
      WHERE b.id = ?
    `;

    const params = [id];

    if (role !== 'admin') {
      query += role === 'worker' ? ' AND b.worker_id = ?' : ' AND b.user_id = ?';
      params.push(userId);
    }

    const [bookings] = await pool.execute(query, params);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Get status history
    const [history] = await pool.execute(
      'SELECT status, notes, created_at FROM booking_status_history WHERE booking_id = ? ORDER BY created_at',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...bookings[0],
        statusHistory: history
      }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    // Check if booking exists and belongs to user
    const [bookings] = await pool.execute(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Can only cancel if not already completed or cancelled
    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status: ${booking.status}`
      });
    }

    // Update booking status
    await pool.execute(
      `UPDATE bookings SET status = 'cancelled', cancellation_reason = ?, cancelled_by = ? WHERE id = ?`,
      [reason || 'No reason provided', role, id]
    );

    // Add to status history
    await pool.execute(
      'INSERT INTO booking_status_history (booking_id, status, notes, created_by) VALUES (?, ?, ?, ?)',
      [id, 'cancelled', `Cancelled: ${reason || 'No reason'}`, userId]
    );

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
};

// Worker: Accept booking
const acceptBooking = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const { id } = req.params;

    // Check if booking exists and is available
    const [bookings] = await pool.execute(
      'SELECT * FROM bookings WHERE id = ? AND status = ?',
      [id, 'requested']
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not available or already assigned'
      });
    }

    // Update booking
    await pool.execute(
      'UPDATE bookings SET worker_id = ?, status = ? WHERE id = ?',
      [workerId, 'accepted', id]
    );

    // Add to status history
    await pool.execute(
      'INSERT INTO booking_status_history (booking_id, status, notes, created_by) VALUES (?, ?, ?, ?)',
      [id, 'accepted', 'Worker accepted the booking', workerId]
    );

    // Create notification for user
    await pool.execute(
      'INSERT INTO notifications (user_id, title, message, type, booking_id) VALUES (?, ?, ?, ?, ?)',
      [bookings[0].user_id, 'Booking Accepted', 'A worker has accepted your booking!', 'booking_accepted', id]
    );

    res.json({
      success: true,
      message: 'Booking accepted successfully'
    });
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept booking'
    });
  }
};

// Worker: Reject booking
const rejectBooking = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    // Check if booking was assigned to this worker
    const [bookings] = await pool.execute(
      'SELECT * FROM bookings WHERE id = ? AND worker_id = ? AND status = ?',
      [id, workerId, 'accepted']
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not assigned to you'
      });
    }

    // Reset booking to requested status
    await pool.execute(
      'UPDATE bookings SET worker_id = NULL, status = ? WHERE id = ?',
      ['requested', id]
    );

    // Add to status history
    await pool.execute(
      'INSERT INTO booking_status_history (booking_id, status, notes, created_by) VALUES (?, ?, ?, ?)',
      [id, 'rejected', `Worker rejected: ${reason || 'No reason'}`, workerId]
    );

    res.json({
      success: true,
      message: 'Booking rejected'
    });
  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject booking'
    });
  }
};

// Worker: Update booking status (on_the_way, in_progress, completed)
const updateBookingStatus = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['on_the_way', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Check if booking belongs to worker
    const [bookings] = await pool.execute(
      'SELECT * FROM bookings WHERE id = ? AND worker_id = ?',
      [id, workerId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not assigned to you'
      });
    }

    const booking = bookings[0];

    // Validate status transition
    const validTransitions = {
      'accepted': ['on_the_way'],
      'on_the_way': ['in_progress'],
      'in_progress': ['completed']
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${booking.status} to ${status}`
      });
    }

    const updates = { status };
    if (status === 'completed') {
      updates.completed_at = new Date();
    }

    // Update booking
    await pool.execute(
      'UPDATE bookings SET status = ?, completed_at = ? WHERE id = ?',
      [updates.status, updates.completed_at || null, id]
    );

    // Add to status history
    await pool.execute(
      'INSERT INTO booking_status_history (booking_id, status, notes, created_by) VALUES (?, ?, ?, ?)',
      [id, status, `Worker updated status to ${status}`, workerId]
    );

    // Create notification for user
    const statusMessages = {
      'on_the_way': 'Worker is on the way to your location',
      'in_progress': 'Service has started',
      'completed': 'Service completed! Please make payment'
    };

    await pool.execute(
      'INSERT INTO notifications (user_id, title, message, type, booking_id) VALUES (?, ?, ?, ?, ?)',
      [booking.user_id, 'Booking Update', statusMessages[status], `booking_${status}`, id]
    );

    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
};

// Worker: Get assigned bookings
const getWorkerBookings = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const { status } = req.query;

    let query = `
      SELECT b.id, b.booking_id, b.status, b.booking_date, b.booking_time,
             b.address, b.city, b.latitude, b.longitude, b.total_amount,
             s.name as service_name, sc.name as category_name,
             u.first_name as user_first_name, u.last_name as user_last_name, u.mobile as user_mobile
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN service_categories sc ON b.category_id = sc.id
      JOIN users u ON b.user_id = u.id
      WHERE b.worker_id = ?
    `;

    const params = [workerId];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.booking_date ASC, b.booking_time ASC';

    const [bookings] = await pool.execute(query, params);

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Get worker bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

// Get available bookings for workers
const getAvailableBookings = async (req, res) => {
  try {
    const { id: workerId } = req.user;

    // Get worker skills and location
    const [workerData] = await pool.execute(
      `SELECT w.latitude, w.longitude, GROUP_CONCAT(ws.category_id) as skills
       FROM workers w
       LEFT JOIN worker_skills ws ON w.id = ws.worker_id
       WHERE w.id = ?
       GROUP BY w.id`,
      [workerId]
    );

    if (workerData.length === 0 || !workerData[0].skills) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    const skills = workerData[0].skills.split(',').map(Number);
    const workerLat = workerData[0].latitude;
    const workerLng = workerData[0].longitude;

    // Find requested bookings matching worker skills and within 50km
    let query = `
      SELECT b.id, b.booking_id, b.booking_date, b.booking_time,
             b.address, b.city, b.latitude, b.longitude, b.total_amount,
             s.name as service_name, sc.name as category_name,
             (6371 * acos(cos(radians(?)) * cos(radians(b.latitude)) * 
             cos(radians(b.longitude) - radians(?)) + sin(radians(?)) * 
             sin(radians(b.latitude)))) AS distance
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN service_categories sc ON b.category_id = sc.id
      WHERE b.status = 'requested' AND b.category_id IN (${skills.map(() => '?').join(',')})
    `;

    if (workerLat && workerLng) {
      query += ` HAVING distance < 50 ORDER BY distance`;
    } else {
      query += ` ORDER BY b.created_at DESC`;
    }

    query += ` LIMIT 20`;

    const params = [workerLat || 0, workerLng || 0, workerLat || 0, ...skills];
    const [bookings] = await pool.execute(query, params);

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Get available bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available bookings'
    });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
  getWorkerBookings,
  getAvailableBookings
};
