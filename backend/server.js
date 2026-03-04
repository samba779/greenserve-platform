require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');

const { connectDB } = require('./config/database');
require('./config/passport');

// Route imports
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const workerRoutes = require('./routes/workerRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for production deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://greenserve-platform.vercel.app',
    'https://greenserve-platform-e9f85nq3s-samba779s-projects.vercel.app'
  ].filter(Boolean),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ FIX: Session middleware using mongoUrl directly (no need to wait for DB)
// connect-mongo v6 handles its own connection using the mongoUrl string
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-this',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,    // ✅ uses its own connection string
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,                   // 24 hours
    autoRemove: 'native',
    touchAfter: 24 * 3600                // only update session once per 24h
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // ✅ only force secure in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static('public'));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'GreenServe Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cleanup', require('./routes/cleanupRoutes'));

// Admin Panel
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// ✅ Health check endpoint for Render
app.get('/api/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    const dbStateText = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
    
    res.json({ 
      success: true,
      status: 'ok', 
      server: 'running',
      database: {
        state: dbStatus,
        readyState: dbState,
        stateText: dbStateText,
        host: mongoose.connection.host || 'not connected'
      },
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'GreenServe API Server is running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      services: '/api/services',
      bookings: '/api/bookings'
    },
    documentation: 'API documentation available at /api/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ✅ FIX: Start server - connectDB first, then listen
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`
========================================
  GreenServe API Server
  Running on port ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
========================================
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();