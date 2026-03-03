const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Worker = require('../models/Worker');
const { generateToken } = require('../middleware/auth');
const axios = require('axios');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Android SMS Gateway
const sendOTPviaSMS = async (mobile, otp) => {
  try {
    // Android Gateway URL with your real IP
    const androidGatewayURL = 'http://10.195.179.179:8080/sendsms';
    
    const message = `Your GreenServe OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    
    const response = await axios.post(androidGatewayURL, {
      to: mobile,
      message: message
    }, {
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`✅ SMS sent to ${mobile}: ${otp}`);
    return true;
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    // Fallback to console log for development
    console.log(`🔔 OTP for ${mobile}: ${otp}`);
    return false;
  }
};

// User Registration
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, address, city } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { mobile: mobile },
        { email: email, email: { $ne: null, $ne: '' } }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this mobile or email'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = new User({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      mobile: mobile,
      password: hashedPassword,
      address: address || null,
      city: city || null,
      otp_code: otp,
      otp_expires_at: otpExpiresAt
    });

    await user.save();

    // Send OTP via SMS
    const smsSent = await sendOTPviaSMS(mobile, otp);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your mobile number.',
      data: {
        userId: user._id,
        mobile,
        otp: smsSent ? null : otp // Show OTP only if SMS failed
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

// Worker Registration
const registerWorker = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, city, address, yearsOfExperience, skills } = req.body;

    // Check if worker already exists
    const existingWorker = await Worker.findOne({ 
      $or: [
        { mobile: mobile },
        { email: email, email: { $ne: null, $ne: '' } }
      ]
    });

    if (existingWorker) {
      return res.status(400).json({
        success: false,
        message: 'Worker already exists with this mobile or email'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Create worker
    const worker = new Worker({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      mobile: mobile,
      password: hashedPassword,
      city: city,
      address: address || null,
      years_of_experience: yearsOfExperience || 0,
      otp_code: otp,
      otp_expires_at: otpExpiresAt,
      services: skills || []
    });

    await worker.save();

    // Log OTP for development (in production, send via SMS)
    console.log(`🔔 OTP for ${mobile}: ${otp}`);

    res.status(201).json({
      success: true,
      message: 'Worker registered successfully. Please verify your mobile number.',
      data: {
        workerId: worker._id,
        mobile,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      }
    });
  } catch (error) {
    console.error('Worker registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { mobile, otp, userType = 'user' } = req.body;

    const Model = userType === 'worker' ? Worker : User;
    const user = await Model.findOne({ mobile: mobile });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.otp_code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Mark user as verified and clear OTP
    user.is_verified = true;
    user.otp_code = undefined;
    user.otp_expires_at = undefined;
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, userType);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          mobile: user.mobile
        }
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { mobile, userType = 'user' } = req.body;

    const Model = userType === 'worker' ? Worker : User;
    const user = await Model.findOne({ mobile: mobile });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.otp_code = otp;
    user.otp_expires_at = otpExpiresAt;
    await user.save();

    // Send OTP via SMS
    const smsSent = await sendOTPviaSMS(mobile, otp);

    res.json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otp: smsSent ? null : otp // Show OTP only if SMS failed
      }
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { mobile, password, userType = 'user' } = req.body;

    const Model = userType === 'worker' ? Worker : User;
    const user = await Model.findOne({ mobile: mobile });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (userType === 'worker' && !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id, userType);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          mobile: user.mobile,
          isVerified: user.is_verified
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// Get Profile
const getProfile = async (req, res) => {
  try {
    const { id, role } = req.user;
    const Model = role === 'worker' ? Worker : User;
    
    const user = await Model.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = {
      id: user._id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      mobile: user.mobile,
      address: user.address,
      city: user.city,
      pincode: user.pincode,
      location: user.location,
      createdAt: user.created_at
    };

    if (role === 'worker') {
      userData.yearsOfExperience = user.years_of_experience;
      userData.rating = user.rating;
      userData.totalReviews = user.total_reviews;
      userData.totalEarnings = user.total_earnings;
      userData.availableBalance = user.available_balance;
      userData.isOnline = user.is_online;
      userData.isActive = user.is_active;
      userData.skills = user.services;
    } else {
      userData.isVerified = user.is_verified;
    }

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { firstName, lastName, email, address, city, pincode } = req.body;
    
    const Model = role === 'worker' ? Worker : User;
    
    const updateData = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (email) updateData.email = email;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (pincode) updateData.pincode = pincode;

    await Model.findByIdAndUpdate(id, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Update Location
const updateLocation = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { latitude, longitude } = req.body;
    
    const Model = role === 'worker' ? Worker : User;
    
    await Model.findByIdAndUpdate(id, {
      location: { latitude, longitude }
    });

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
};

module.exports = {
  registerUser,
  registerWorker,
  verifyOTP,
  resendOTP,
  login,
  getProfile,
  updateProfile,
  updateLocation
};
