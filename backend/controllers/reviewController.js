const { pool } = require('../config/database');

// Create review
const createReview = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { bookingId, rating, reviewText, tags, isRecommended } = req.body;

    // Check if booking exists and belongs to user
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

    // Check if review already exists
    const [existingReviews] = await pool.execute(
      'SELECT id FROM reviews WHERE booking_id = ?',
      [bookingId]
    );

    if (existingReviews.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this booking'
      });
    }

    // Create review
    const [result] = await pool.execute(
      `INSERT INTO reviews (booking_id, user_id, worker_id, rating, review_text, tags, is_recommended)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bookingId, userId, booking.worker_id, rating, reviewText || null, 
       JSON.stringify(tags || []), isRecommended !== false]
    );

    // Update worker rating
    await pool.execute(
      `UPDATE workers SET 
        rating = (SELECT AVG(rating) FROM reviews WHERE worker_id = ?),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE worker_id = ?)
       WHERE id = ?`,
      [booking.worker_id, booking.worker_id, booking.worker_id]
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        reviewId: result.insertId,
        rating
      }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review'
    });
  }
};

// Get reviews for a worker
const getWorkerReviews = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const [reviews] = await pool.execute(
      `SELECT r.id, r.rating, r.review_text, r.tags, r.is_recommended, r.created_at,
              u.first_name as reviewer_name, b.booking_id
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN bookings b ON r.booking_id = b.id
       WHERE r.worker_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [workerId, parseInt(limit), parseInt(offset)]
    );

    // Get rating distribution
    const [distribution] = await pool.execute(
      `SELECT rating, COUNT(*) as count
       FROM reviews
       WHERE worker_id = ?
       GROUP BY rating
       ORDER BY rating DESC`,
      [workerId]
    );

    // Get summary
    const [summary] = await pool.execute(
      `SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews
       FROM reviews
       WHERE worker_id = ?`,
      [workerId]
    );

    res.json({
      success: true,
      data: {
        reviews,
        summary: summary[0],
        ratingDistribution: distribution
      }
    });
  } catch (error) {
    console.error('Get worker reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

// Worker: Reply to review
const replyToReview = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const { reviewId } = req.params;
    const { response } = req.body;

    // Check if review belongs to worker
    const [reviews] = await pool.execute(
      'SELECT id FROM reviews WHERE id = ? AND worker_id = ?',
      [reviewId, workerId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await pool.execute(
      'UPDATE reviews SET worker_response = ? WHERE id = ?',
      [response, reviewId]
    );

    res.json({
      success: true,
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Reply to review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response'
    });
  }
};

module.exports = {
  createReview,
  getWorkerReviews,
  replyToReview
};
