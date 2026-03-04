const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const { v4: uuidv4 } = require('uuid');

// Hardcoded services to match frontend
const services = {
  solar: { id: 'solar', title: 'Solar Services', base_price: 150000, category_id: 1 },
  energy: { id: 'energy', title: 'Energy Audit', base_price: 5000, category_id: 2 },
  biogas: { id: 'biogas', title: 'Bio-Gas Services', base_price: 45000, category_id: 3 },
  gardening: { id: 'gardening', title: 'Gardening & Landscaping', base_price: 3000, category_id: 4 },
  waste: { id: 'waste', title: 'Waste Management', base_price: 1500, category_id: 5 },
  water: { id: 'water', title: 'Water Conservation', base_price: 25000, category_id: 6 },
  ev: { id: 'ev', title: 'EV Charging Support', base_price: 35000, category_id: 7 },
  maintenance: { id: 'maintenance', title: 'Green Maintenance', base_price: 1500, category_id: 8 }
};

// Generate unique booking ID
const generateBookingId = () => {
  return 'GR' + Math.floor(100000 + Math.random() * 900000);
};

// Create new booking
const createBooking = async (req, res) => {
  try {
    // Allow booking without authentication for demo/testing
    let userId = null;
    let userName = 'Guest User';
    
    // Try to get user ID from token if available
    try {
      if (req.user && req.user.id) {
        userId = req.user.id;
        userName = req.user.first_name || 'User';
      }
    } catch (error) {
      console.log('No authenticated user, proceeding as guest booking');
    }
    
    const { serviceId, bookingDate, bookingTime, address, city, latitude, longitude, notes } = req.body;

    console.log('🔍 Full Booking Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Booking Request:', { serviceId, userId, userName, bookingDate, bookingTime });
    console.log('👤 User:', userName, 'ID:', userId);
    console.log('🔍 Service ID type:', typeof serviceId, 'value:', serviceId);
    console.log('🔍 Service ID length:', serviceId ? serviceId.length : 'undefined');
    console.log('🔍 All request keys:', Object.keys(req.body));

    // Check if serviceId is present
    if (!serviceId) {
      console.log('❌ Service ID is missing from request');
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }

    // Convert serviceId to string if it's a number
    const serviceIdStr = String(serviceId);
    console.log('🔍 Converted serviceId string:', serviceIdStr);
    
    // Get service details from hardcoded services
    const service = services[serviceIdStr];
    
    if (!service) {
      console.log('❌ Service not found:', serviceIdStr);
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    console.log('✅ Service found:', service);
    
    // Calculate pricing
    const basePrice = parseFloat(service.base_price);
    const serviceCharge = basePrice * 0.10; // 10% platform fee
    const taxAmount = basePrice * 0.18; // 18% GST
    const totalAmount = basePrice + serviceCharge + taxAmount;

    console.log('💰 Pricing:', { basePrice, serviceCharge, taxAmount, totalAmount });

    // Generate booking ID
    const bookingId = generateBookingId();
    console.log('🎫 Booking ID:', bookingId);

    // Validate required fields
    if (!bookingDate || !bookingTime || !address) {
      console.log('❌ Missing required fields:', { bookingDate, bookingTime, address });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date, time, or address'
      });
    }

    try {
      console.log('🗄️ Creating booking in MongoDB...');
      
      // Create booking with MongoDB
      const booking = new Booking({
        booking_id: bookingId,
        user_id: userId,
        service_id: serviceIdStr, // Store as string to match frontend
        category_id: service.category_id,
        booking_date: new Date(bookingDate),
        booking_time: bookingTime,
        address: address,
        city: city,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        price: basePrice,
        service_charge: serviceCharge,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: notes || null,
        status: 'requested'
      });

      const savedBooking = await booking.save();
      console.log('✅ Booking saved successfully:', savedBooking._id);

      // Find nearby workers and send alerts
      const nearbyWorkers = await findNearbyWorkers(latitude, longitude, serviceIdStr);
      console.log(`📍 Found ${nearbyWorkers.length} nearby workers`);
      
      // Send alerts to nearby workers
      for (const worker of nearbyWorkers) {
        await sendWorkerAlert(worker, savedBooking);
      }
      
      // Send confirmation alert to user
      await sendUserAlert(userId, savedBooking, nearbyWorkers.length);

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          bookingId: bookingId,
          id: savedBooking._id,
          service: service.title,
          totalAmount: totalAmount
        }
      });
    } catch (error) {
      console.error('❌ Booking creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message
      });
    }
  } catch (error) {
    console.error('❌ Booking controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const bookings = await Booking.find({ user_id: userId }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('❌ Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookings',
      error: error.message
    });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({ booking_id: id });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('❌ Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking',
      error: error.message
    });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { id: userId } = req.user;
    
    const booking = await Booking.findOne({ booking_id: id });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.user_id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own bookings'
      });
    }
    
    booking.status = 'cancelled';
    booking.cancellation_reason = reason;
    booking.cancelled_by = 'user';
    await booking.save();
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

// Accept booking (for workers)
const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: workerId } = req.user;
    
    const booking = await Booking.findOne({ booking_id: id });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    booking.status = 'accepted';
    booking.worker_id = workerId;
    await booking.save();
    
    res.json({
      success: true,
      message: 'Booking accepted successfully'
    });
  } catch (error) {
    console.error('❌ Accept booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept booking',
      error: error.message
    });
  }
};

// Reject booking (for workers)
const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { id: workerId } = req.user;
    
    const booking = await Booking.findOne({ booking_id: id });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    booking.status = 'rejected';
    booking.worker_id = workerId;
    booking.rejection_reason = reason;
    await booking.save();
    
    res.json({
      success: true,
      message: 'Booking rejected successfully'
    });
  } catch (error) {
    console.error('❌ Reject booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject booking',
      error: error.message
    });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const booking = await Booking.findOne({ booking_id: id });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    booking.status = status;
    await booking.save();
    
    res.json({
      success: true,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('❌ Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message
    });
  }
};

// Get worker's bookings
const getWorkerBookings = async (req, res) => {
  try {
    const { id: workerId } = req.user;
    const bookings = await Booking.find({ worker_id: workerId }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('❌ Get worker bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookings',
      error: error.message
    });
  }
};

// Get available bookings (for workers)
const getAvailableBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      status: 'requested',
      worker_id: { $exists: false }
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('❌ Get available bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available bookings',
      error: error.message
    });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
  getWorkerBookings,
  getAvailableBookings
};

// Helper function: Calculate distance between two coordinates (km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Helper function: Find nearby workers within 5km radius
async function findNearbyWorkers(latitude, longitude, serviceId) {
  try {
    // Get all workers who have the matching skill
    const Worker = require('../models/Worker');
    const workers = await Worker.find({
      skills: { $in: [serviceId] },
      is_verified: true,
      current_location: { $exists: true }
    }).limit(20);
    
    // Filter workers within 5km radius
    const MATCHING_RADIUS_KM = 5;
    const nearbyWorkers = workers.filter(worker => {
      if (!worker.current_location || !worker.current_location.latitude) return false;
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        worker.current_location.latitude,
        worker.current_location.longitude
      );
      return distance <= MATCHING_RADIUS_KM;
    });
    
    return nearbyWorkers;
  } catch (error) {
    console.error('❌ Error finding nearby workers:', error);
    return [];
  }
}

// Helper function: Send alert to worker
async function sendWorkerAlert(worker, booking) {
  try {
    console.log(`🔔 Sending alert to worker ${worker.first_name} (${worker.mobile})`);
    
    // TODO: Integrate with SMS/Email service (Twilio, SendGrid, etc.)
    // For now, log the alert
    console.log(`📱 Worker Alert: New booking #${booking.booking_id} for ${booking.service_id} near you!`);
    
    // Store notification in worker's notification array (if exists)
    if (!worker.notifications) worker.notifications = [];
    worker.notifications.push({
      type: 'new_booking',
      bookingId: booking.booking_id,
      message: `New booking available near you - ${booking.service_id}`,
      timestamp: new Date(),
      read: false
    });
    
    await worker.save();
  } catch (error) {
    console.error('❌ Error sending worker alert:', error);
  }
}

// Helper function: Send alert to user
async function sendUserAlert(userId, booking, workerCount) {
  try {
    console.log(`🔔 Sending confirmation to user ${userId}`);
    
    // TODO: Integrate with SMS/Email service
    console.log(`📱 User Alert: Booking #${booking.booking_id} confirmed! ${workerCount} workers notified.`);
    
    // If user is authenticated, store notification
    if (userId) {
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (user) {
        if (!user.notifications) user.notifications = [];
        user.notifications.push({
          type: 'booking_confirmed',
          bookingId: booking.booking_id,
          message: `Booking confirmed! ${workerCount} workers will be notified.`,
          timestamp: new Date(),
          read: false
        });
        await user.save();
      }
    }
  } catch (error) {
    console.error('❌ Error sending user alert:', error);
  }
}
