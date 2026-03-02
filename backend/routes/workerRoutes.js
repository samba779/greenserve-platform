const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

const {
  updateOnlineStatus,
  getEarnings,
  requestWithdrawal,
  getWorkerStats,
  updateSkills,
  getNearbyWorkers,
  getWorkerById
} = require('../controllers/workerController');

// Worker protected routes
router.put('/status', authMiddleware, updateOnlineStatus);
router.get('/earnings', authMiddleware, getEarnings);
router.post('/withdraw', authMiddleware, requestWithdrawal);
router.get('/stats', authMiddleware, getWorkerStats);
router.put('/skills', authMiddleware, updateSkills);

// Public routes
router.get('/nearby', getNearbyWorkers);
router.get('/:id', getWorkerById);

module.exports = router;
