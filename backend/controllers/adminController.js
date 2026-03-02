const { pool } = require('../config/database');

// Get admin dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Total counts
    const [usersCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [workersCount] = await pool.execute('SELECT COUNT(*) as count FROM workers');
    const [bookingsCount] = await pool.execute('SELECT COUNT(*) as count FROM bookings');
    const [paymentsCount] = await pool.execute('SELECT COUNT(*) as count FROM payments WHERE status = ?', ['success']);

    // Revenue stats
    const [revenueStats] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_revenue,
              COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN amount ELSE 0 END), 0) as weekly_revenue,
              COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN amount ELSE 0 END), 0) as monthly_revenue
       FROM payments WHERE status = ?`,
      ['success']
    );

    // Booking status breakdown
    const [bookingStats] = await pool.execute(
      `SELECT status, COUNT(*) as count FROM bookings GROUP BY status`
    );

    // Recent activity
    const [recentBookings] = await pool.execute(
      `SELECT b.id, b.booking_id, b.status, b.total_amount, b.created_at,
              u.first_name as user_name, w.first_name as worker_name, s.name as service_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN workers w ON b.worker_id = w.id
       JOIN services s ON b.service_id = s.id
       ORDER BY b.created_at DESC LIMIT 10`
    );

    const [recentPayments] = await pool.execute(
      `SELECT p.id, p.amount, p.payment_method, p.status, p.created_at,
              u.first_name as user_name, w.first_name as worker_name
       FROM payments p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN workers w ON p.worker_id = w.id
       ORDER BY p.created_at DESC LIMIT 10`
    );

    // Top workers by earnings
    const [topWorkers] = await pool.execute(
      `SELECT w.id, w.first_name, w.last_name, w.mobile, w.rating, w.total_reviews,
              w.total_earnings, w.is_online, w.is_active,
              (SELECT COUNT(*) FROM bookings WHERE worker_id = w.id AND status = 'completed') as completed_jobs
       FROM workers w
       ORDER BY w.total_earnings DESC LIMIT 10`
    );

    // Top users by bookings
    const [topUsers] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, u.mobile, u.email, u.is_verified,
              (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as total_bookings,
              (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE user_id = u.id AND payment_status = 'paid') as total_spent
       FROM users u
       ORDER BY total_bookings DESC LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        counts: {
          users: usersCount[0].count,
          workers: workersCount[0].count,
          bookings: bookingsCount[0].count,
          payments: paymentsCount[0].count
        },
        revenue: revenueStats[0],
        bookingBreakdown: bookingStats,
        recentBookings,
        recentPayments,
        topWorkers,
        topUsers
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

// Get all users with details
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.mobile, u.address, u.city,
              u.is_verified, u.created_at,
              (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as total_bookings,
              (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE user_id = u.id AND payment_status = 'paid') as total_spent,
              (SELECT COUNT(*) FROM bookings WHERE user_id = u.id AND status = 'completed') as completed_services
       FROM users u
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Get all workers with details
const getAllWorkers = async (req, res) => {
  try {
    const [workers] = await pool.execute(
      `SELECT w.id, w.first_name, w.last_name, w.email, w.mobile, w.address, w.city,
              w.years_of_experience, w.rating, w.total_reviews, w.total_earnings,
              w.available_balance, w.is_online, w.is_active, w.is_verified, w.created_at,
              (SELECT COUNT(*) FROM bookings WHERE worker_id = w.id) as total_jobs,
              (SELECT COUNT(*) FROM bookings WHERE worker_id = w.id AND status = 'completed') as completed_jobs
       FROM workers w
       ORDER BY w.created_at DESC`
    );

    // Get skills for each worker
    for (let worker of workers) {
      const [skills] = await pool.execute(
        `SELECT sc.name FROM worker_skills ws
         JOIN service_categories sc ON ws.category_id = sc.id
         WHERE ws.worker_id = ?`,
        [worker.id]
      );
      worker.skills = skills.map(s => s.name);
    }

    res.json({
      success: true,
      count: workers.length,
      data: workers
    });
  } catch (error) {
    console.error('Get all workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workers'
    });
  }
};

// Get all bookings with details
const getAllBookings = async (req, res) => {
  try {
    const [bookings] = await pool.execute(
      `SELECT b.id, b.booking_id, b.status, b.booking_date, b.booking_time,
              b.address, b.city, b.total_amount, b.payment_status, b.created_at,
              u.first_name as user_first_name, u.last_name as user_last_name, u.mobile as user_mobile,
              w.first_name as worker_first_name, w.last_name as worker_last_name, w.mobile as worker_mobile,
              s.name as service_name, sc.name as category_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN workers w ON b.worker_id = w.id
       JOIN services s ON b.service_id = s.id
       JOIN service_categories sc ON b.category_id = sc.id
       ORDER BY b.created_at DESC`
    );

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

// Get all payments with details
const getAllPayments = async (req, res) => {
  try {
    const [payments] = await pool.execute(
      `SELECT p.id, p.amount, p.payment_method, p.status, p.transaction_id, p.created_at,
              b.booking_id, s.name as service_name,
              u.first_name as user_first_name, u.last_name as user_last_name,
              w.first_name as worker_first_name, w.last_name as worker_last_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN services s ON b.service_id = s.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN workers w ON p.worker_id = w.id
       ORDER BY p.created_at DESC`
    );

    // Payment summary
    const [summary] = await pool.execute(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0) as total_success,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as total_failed,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as count_success,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as count_pending,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as count_failed
       FROM payments`
    );

    res.json({
      success: true,
      count: payments.length,
      summary: summary[0],
      data: payments
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
};

// Update worker status (activate/deactivate)
const updateWorkerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isVerified } = req.body;

    await pool.execute(
      'UPDATE workers SET is_active = COALESCE(?, is_active), is_verified = COALESCE(?, is_verified) WHERE id = ?',
      [isActive, isVerified, id]
    );

    res.json({
      success: true,
      message: 'Worker status updated'
    });
  } catch (error) {
    console.error('Update worker status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update worker status'
    });
  }
};

// Get service statistics
const getServiceStats = async (req, res) => {
  try {
    // Bookings by category
    const [categoryStats] = await pool.execute(
      `SELECT sc.name, COUNT(b.id) as bookings, COALESCE(SUM(b.total_amount), 0) as revenue
       FROM service_categories sc
       LEFT JOIN bookings b ON sc.id = b.category_id
       GROUP BY sc.id
       ORDER BY bookings DESC`
    );

    // Popular services
    const [popularServices] = await pool.execute(
      `SELECT s.name, s.base_price, COUNT(b.id) as bookings,
              COALESCE(SUM(b.total_amount), 0) as revenue
       FROM services s
       LEFT JOIN bookings b ON s.id = b.service_id
       GROUP BY s.id
       ORDER BY bookings DESC LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        categoryStats,
        popularServices
      }
    });
  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service statistics'
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getAllWorkers,
  getAllBookings,
  getAllPayments,
  updateWorkerStatus,
  getServiceStats
};
