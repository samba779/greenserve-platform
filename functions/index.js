const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Initialize Express
const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Error:', error.message);
  }
};
connectDB();

// User Schema
const userSchema = new mongoose.Schema({
  googleId: { type: String, sparse: true, unique: true },
  first_name: { type: String, required: true },
  last_name: { type: String },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  mobile: { type: String, unique: true, sparse: true },
  password: { type: String },
  is_verified: { type: Boolean, default: false },
  profile_picture: { type: String }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'GreenServe API on Firebase', timestamp: new Date().toISOString() });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { first_name, last_name, email, mobile, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ first_name, last_name, email, mobile, password: hashedPassword });
    await user.save();
    res.status(201).json({ success: true, message: 'User registered', data: { userId: user._id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 404 Handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Export
exports.api = functions.https.onRequest(app);
