const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists in database
    let user;
    if (decoded.role === 'worker') {
      const [workers] = await pool.execute(
        'SELECT id, first_name, last_name, email, mobile, is_active FROM workers WHERE id = ?',
        [decoded.id]
      );
      user = workers[0];
    } else {
      const [users] = await pool.execute(
        'SELECT id, first_name, last_name, email, mobile, is_verified FROM users WHERE id = ?',
        [decoded.id]
      );
      user = users[0];
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    req.user = { ...user, role: decoded.role };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error.' 
    });
  }
};

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = { authMiddleware, generateToken };
