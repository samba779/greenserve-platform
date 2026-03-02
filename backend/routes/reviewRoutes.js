const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { validate, reviewSchema } = require('../middleware/validation');

const {
  createReview,
  getWorkerReviews,
  replyToReview
} = require('../controllers/reviewController');

// Public routes
router.get('/worker/:workerId', getWorkerReviews);

// Protected routes
router.post('/', authMiddleware, validate(reviewSchema), createReview);
router.put('/:reviewId/reply', authMiddleware, replyToReview);

module.exports = router;
