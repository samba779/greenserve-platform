const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Worker = require('../models/Worker');

// Clean up test data route
router.delete('/cleanup-users', authMiddleware, async (req, res) => {
  try {
    console.log('🧹 Starting user cleanup...');
    
    // Delete all unverified users older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const deleteResult = await User.deleteMany({
      $and: [
        { is_verified: false },
        { createdAt: { $lt: oneHourAgo } }
      ]
    });

    console.log(`🗑️ Deleted ${deleteResult.deletedCount} unverified users`);
    
    // Also delete any test users with common test emails
    const testEmails = ['test@example.com', 'demo@test.com', 'user@test.com'];
    const testDeleteResult = await User.deleteMany({
      email: { $in: testEmails }
    });

    console.log(`🗑️ Deleted ${testDeleteResult.deletedCount} test users`);
    
    res.json({
      success: true,
      message: `Cleanup completed. Deleted ${deleteResult.deletedCount} unverified users and ${testDeleteResult.deletedCount} test users.`,
      deleted: {
        unverifiedUsers: deleteResult.deletedCount,
        testUsers: testDeleteResult.deletedCount
      }
    });
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    });
  }
});

// Get database statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    console.log('📊 Getting database stats...');
    
    const userStats = await User.aggregate([
      { $match: { is_verified: true } },
      { $group: null, _id: null, count: { $sum: 1 } }
    ]);
    
    const workerStats = await Worker.aggregate([
      { $match: { is_verified: true } },
      { $group: null, _id: null, count: { $sum: 1 } }
    ]);
    
    const unverifiedUserStats = await User.aggregate([
      { $match: { is_verified: false } },
      { $group: null, _id: null, count: { $sum: 1 } }
    ]);
    
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('first_name last_name email mobile createdAt is_verified');
    
    console.log('📊 Database Statistics:');
    console.log(`✅ Verified Users: ${userStats[0]?.count || 0}`);
    console.log(`✅ Verified Workers: ${workerStats[0]?.count || 0}`);
    console.log(`⚠️ Unverified Users: ${unverifiedUserStats[0]?.count || 0}`);
    console.log(`📋 Recent Users (last 10):`, recentUsers.map(u => ({
      email: u.email,
      mobile: u.mobile,
      verified: u.is_verified,
      created: u.createdAt
    })));
    
    res.json({
      success: true,
      data: {
        userStats: userStats[0] || { count: 0 },
        workerStats: workerStats[0] || { count: 0 },
        unverifiedUserStats: unverifiedUserStats[0] || { count: 0 },
        recentUsers: recentUsers
      }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
});

module.exports = router;
