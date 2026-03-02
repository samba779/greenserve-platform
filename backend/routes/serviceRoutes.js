const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getCategories,
  getCategoryBySlug,
  getServices,
  getServiceById,
  searchServices
} = require('../controllers/serviceController');

// Public routes
router.get('/categories', getCategories);
router.get('/categories/:slug', getCategoryBySlug);
router.get('/', getServices);
router.get('/search', searchServices);
router.get('/:id', getServiceById);

module.exports = router;
