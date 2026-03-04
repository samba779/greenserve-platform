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
    const { id: userId } = req.user;
    const { serviceId, bookingDate, bookingTime, address, city, latitude, longitude, notes } = req.body;

    console.log('🔍 Full Booking Request Body:', req.body);
    console.log('🔍 Booking Request:', { serviceId, userId, bookingDate, bookingTime });
    console.log('👤 User ID from token:', userId);
    console.log('🔍 Service ID type:', typeof serviceId, 'value:', serviceId);

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

      // TODO: Find nearby workers and send notifications
      // This will be implemented in the next step

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
