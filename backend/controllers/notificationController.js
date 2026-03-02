const { pool } = require('../config/database');

// Get notifications
const getNotifications = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT n.*, b.booking_id as booking_ref
      FROM notifications n
      LEFT JOIN bookings b ON n.booking_id = b.id
      WHERE n.${role === 'worker' ? 'worker_id' : 'user_id'} = ?
    `;

    const params = [userId];

    if (unreadOnly === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [notifications] = await pool.execute(query, params);

    // Get unread count
    const [unreadCount] = await pool.execute(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE ${role === 'worker' ? 'worker_id' : 'user_id'} = ? AND is_read = FALSE`,
      [userId]
    );

    res.json({
      success: true,
      unreadCount: unreadCount[0].count,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;

    await pool.execute(
      `UPDATE notifications SET is_read = TRUE 
       WHERE id = ? AND ${role === 'worker' ? 'worker_id' : 'user_id'} = ?`,
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification'
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    await pool.execute(
      `UPDATE notifications SET is_read = TRUE 
       WHERE ${role === 'worker' ? 'worker_id' : 'user_id'} = ? AND is_read = FALSE`,
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications'
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;

    await pool.execute(
      `DELETE FROM notifications 
       WHERE id = ? AND ${role === 'worker' ? 'worker_id' : 'user_id'} = ?`,
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
