const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getAllUsers,
  getAllWorkers,
  getAllBookings,
  getAllPayments,
  updateWorkerStatus,
  getServiceStats
} = require('../controllers/adminController');

// Simple admin auth middleware - checks for admin token or basic auth
const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'] || req.query.key;
  
  // Simple admin key check (in production, use proper authentication)
  if (adminKey === process.env.ADMIN_KEY || adminKey === 'greenserve-admin-2024') {
    return next();
  }
  
  res.status(401).json({
    success: false,
    message: 'Unauthorized. Admin access required.'
  });
};

// Dashboard stats
router.get('/stats', adminAuth, getDashboardStats);

// Users management
router.get('/users', adminAuth, getAllUsers);

// Workers management
router.get('/workers', adminAuth, getAllWorkers);
router.put('/workers/:id/status', adminAuth, updateWorkerStatus);

// Bookings management
router.get('/bookings', adminAuth, getAllBookings);

// Payments management
router.get('/payments', adminAuth, getAllPayments);

// Service statistics
router.get('/services/stats', adminAuth, getServiceStats);

module.exports = router;
