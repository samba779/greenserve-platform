const { pool } = require('../config/database');

// Worker: Update online status
const updateOnlineStatus = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const { isOnline, latitude, longitude } = req.body;

    const updates = { is_online: isOnline };
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;

    await pool.execute(
      'UPDATE workers SET is_online = ?, latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude) WHERE id = ?',
      [isOnline, latitude, longitude, workerId]
    );

    res.json({
      success: true,
      message: `You are now ${isOnline ? 'online' : 'offline'}`,
      data: { isOnline }
    });
  } catch (error) {
    console.error('Update online status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
};

// Worker: Get earnings summary
const getEarnings = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const { period = 'all' } = req.query; // all, week, month

    let dateFilter = '';
    if (period === 'week') {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    // Get worker summary
    const [workerData] = await pool.execute(
      'SELECT total_earnings, available_balance, rating, total_reviews FROM workers WHERE id = ?',
      [workerId]
    );

    // Get weekly earnings
    const [weeklyStats] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as earnings, COUNT(*) as jobs
       FROM wallet_transactions
       WHERE worker_id = ? AND type = 'credit' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [workerId]
    );

    // Get monthly earnings
    const [monthlyStats] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as earnings, COUNT(*) as jobs
       FROM wallet_transactions
       WHERE worker_id = ? AND type = 'credit' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [workerId]
    );

    // Get recent transactions
    const [transactions] = await pool.execute(
      `SELECT wt.*, b.booking_id, s.name as service_name
       FROM wallet_transactions wt
       LEFT JOIN bookings b ON wt.booking_id = b.id
       LEFT JOIN services s ON b.service_id = s.id
       WHERE wt.worker_id = ?
       ORDER BY wt.created_at DESC
       LIMIT 20`,
      [workerId]
    );

    // Get earnings chart data (last 7 days)
    const [chartData] = await pool.execute(
      `SELECT DATE(created_at) as date, SUM(amount) as earnings
       FROM wallet_transactions
       WHERE worker_id = ? AND type = 'credit' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [workerId]
    );

    res.json({
      success: true,
      data: {
        summary: workerData[0],
        weekly: weeklyStats[0],
        monthly: monthlyStats[0],
        transactions,
        chartData
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings'
    });
  }
};

// Worker: Request withdrawal
const requestWithdrawal = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const { amount, bankAccountNumber, bankIfsc, bankName, accountHolderName } = req.body;

    // Check available balance
    const [workerData] = await pool.execute(
      'SELECT available_balance FROM workers WHERE id = ?',
      [workerId]
    );

    if (workerData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const availableBalance = parseFloat(workerData[0].available_balance);

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    if (amount < 500) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is ₹500'
      });
    }

    // Create withdrawal request
    const [result] = await pool.execute(
      `INSERT INTO withdrawal_requests 
       (worker_id, amount, bank_account_number, bank_ifsc, bank_name, account_holder_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [workerId, amount, bankAccountNumber, bankIfsc, bankName, accountHolderName]
    );

    // Deduct from available balance
    await pool.execute(
      'UPDATE workers SET available_balance = available_balance - ? WHERE id = ?',
      [amount, workerId]
    );

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        requestId: result.insertId,
        amount,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit withdrawal request'
    });
  }
};

// Worker: Get statistics
const getWorkerStats = async (req, res) => {
  try {
    const { id: workerId } = req.user;

    // Total completed jobs
    const [completedJobs] = await pool.execute(
      'SELECT COUNT(*) as count FROM bookings WHERE worker_id = ? AND status = ?',
      [workerId, 'completed']
    );

    // Total ongoing jobs
    const [ongoingJobs] = await pool.execute(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE worker_id = ? AND status IN ('accepted', 'on_the_way', 'in_progress')`,
      [workerId]
    );

    // Total earnings
    const [earnings] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions 
       WHERE worker_id = ? AND type = 'credit'`,
      [workerId]
    );

    // Average rating
    const [rating] = await pool.execute(
      'SELECT rating, total_reviews FROM workers WHERE id = ?',
      [workerId]
    );

    // Jobs by category
    const [jobsByCategory] = await pool.execute(
      `SELECT sc.name, COUNT(*) as count
       FROM bookings b
       JOIN service_categories sc ON b.category_id = sc.id
       WHERE b.worker_id = ? AND b.status = 'completed'
       GROUP BY sc.id`,
      [workerId]
    );

    res.json({
      success: true,
      data: {
        completedJobs: completedJobs[0].count,
        ongoingJobs: ongoingJobs[0].count,
        totalEarnings: earnings[0].total,
        rating: rating[0]?.rating || 0,
        totalReviews: rating[0]?.total_reviews || 0,
        jobsByCategory
      }
    });
  } catch (error) {
    console.error('Get worker stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

// Worker: Update skills
const updateSkills = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const { skills } = req.body; // Array of category IDs

    // Remove existing skills
    await pool.execute('DELETE FROM worker_skills WHERE worker_id = ?', [workerId]);

    // Add new skills
    if (skills && skills.length > 0) {
      const skillValues = skills.map(skillId => [workerId, skillId]);
      await pool.query(
        'INSERT INTO worker_skills (worker_id, category_id) VALUES ?',
        [skillValues]
      );
    }

    res.json({
      success: true,
      message: 'Skills updated successfully'
    });
  } catch (error) {
    console.error('Update skills error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update skills'
    });
  }
};

// Get nearby workers (for users)
const getNearbyWorkers = async (req, res) => {
  try {
    const { lat, lng, categoryId, radius = 50 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    let query = `
      SELECT w.id, w.first_name, w.last_name, w.rating, w.total_reviews, 
             w.years_of_experience, w.is_online,
             (6371 * acos(cos(radians(?)) * cos(radians(w.latitude)) * 
             cos(radians(w.longitude) - radians(?)) + sin(radians(?)) * 
             sin(radians(w.latitude)))) AS distance
      FROM workers w
    `;

    const params = [lat, lng, lat];

    if (categoryId) {
      query += ` JOIN worker_skills ws ON w.id = ws.worker_id WHERE ws.category_id = ? AND`;
      params.push(categoryId);
    } else {
      query += ` WHERE`;
    }

    query += ` w.is_active = TRUE AND w.is_verified = TRUE AND w.latitude IS NOT NULL
               HAVING distance < ?
               ORDER BY w.is_online DESC, distance, w.rating DESC
               LIMIT 20`;

    params.push(radius);

    const [workers] = await pool.execute(query, params);

    // Get skills for each worker
    for (let worker of workers) {
      const [skills] = await pool.execute(
        `SELECT sc.id, sc.name, sc.slug
         FROM worker_skills ws
         JOIN service_categories sc ON ws.category_id = sc.id
         WHERE ws.worker_id = ?`,
        [worker.id]
      );
      worker.skills = skills;
    }

    res.json({
      success: true,
      count: workers.length,
      data: workers
    });
  } catch (error) {
    console.error('Get nearby workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby workers'
    });
  }
};

// Get worker by ID (public profile)
const getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [workers] = await pool.execute(
      `SELECT id, first_name, last_name, years_of_experience, rating, total_reviews, city
       FROM workers WHERE id = ? AND is_active = TRUE AND is_verified = TRUE`,
      [id]
    );

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const worker = workers[0];

    // Get skills
    const [skills] = await pool.execute(
      `SELECT sc.id, sc.name, sc.slug, sc.icon
       FROM worker_skills ws
       JOIN service_categories sc ON ws.category_id = sc.id
       WHERE ws.worker_id = ?`,
      [id]
    );
    worker.skills = skills;

    // Get recent reviews
    const [reviews] = await pool.execute(
      `SELECT r.rating, r.review_text, r.created_at, u.first_name as reviewer_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.worker_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [id]
    );
    worker.recentReviews = reviews;

    res.json({
      success: true,
      data: worker
    });
  } catch (error) {
    console.error('Get worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker details'
    });
  }
};

module.exports = {
  updateOnlineStatus,
  getEarnings,
  requestWithdrawal,
  getWorkerStats,
  updateSkills,
  getNearbyWorkers,
  getWorkerById
};
