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
    const androidGatewayURL = 'http://10.195.179.179:8080/sendsms';
    const message = `Your GreenServe OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;

    await axios.post(androidGatewayURL, { to: mobile, message }, { timeout: 10000 });
    console.log(`✅ SMS sent to ${mobile}: ${otp}`);
    return true;
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    console.log(`🔔 OTP for ${mobile}: ${otp}`);
    return false;
  }
};

// ─── User Registration ───────────────────────────────────────────────────────
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, address, city } = req.body;
    console.log('🔍 Registration Request:', { firstName, lastName, email, mobile });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // ✅ Check by mobile only
    const existingUser = await User.findOne({ mobile });

    if (existingUser) {
      if (!existingUser.is_verified) {
        // Unverified ghost record — update it and resend OTP
        console.log('⚠️ Unverified user found, updating for re-registration');
        existingUser.first_name = firstName;
        existingUser.last_name = lastName;
        existingUser.email = email || null;
        existingUser.password = hashedPassword;
        existingUser.address = address || null;
        existingUser.city = city || null;
        existingUser.otp_code = otp;
        existingUser.otp_expires_at = otpExpiresAt;
        await existingUser.save();

        const smsSent = await sendOTPviaSMS(mobile, otp);
        return res.status(200).json({
          success: true,
          message: 'Account updated successfully. Please verify your mobile number.',
          data: { userId: existingUser._id, mobile, otp: smsSent ? null : otp }
        });
      }

      // If user exists and is verified, block registration
      console.log('🚫 Verified user already exists with this mobile number');
      return res.status(400).json({
        success: false,
        message: 'This mobile number is already registered and verified. Please login instead.',
        data: {
          existingUser: {
            first_name: existingUser.first_name,
            last_name: existingUser.last_name,
            email: existingUser.email,
            mobile: existingUser.mobile,
            is_verified: existingUser.is_verified,
            created_at: existingUser.createdAt
          }
        }
      });
    }

    // ✅ New user
    const user = new User({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      mobile,
      password: hashedPassword,
      address: address || null,
      city: city || null,
      otp_code: otp,
      otp_expires_at: otpExpiresAt
    });

    await user.save();
    console.log('✅ User saved:', user._id);

    const smsSent = await sendOTPviaSMS(mobile, otp);
    res.status(201).json({
      success: true,
      message: 'Registered successfully. Please verify your mobile number.',
      data: { userId: user._id, mobile, otp: smsSent ? null : otp }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered. Please login instead.`
      });
    }
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ─── Worker Registration ─────────────────────────────────────────────────────
const registerWorker = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, city, address, yearsOfExperience, skills } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // ✅ FIX: Check mobile only (not broken $or with duplicate email key)
    const existingWorker = await Worker.findOne({ mobile });

    if (existingWorker) {
      if (!existingWorker.is_verified) {
        console.log('⚠️ Unverified worker found, updating for re-registration');
        existingWorker.first_name = firstName;
        existingWorker.last_name = lastName;
        existingWorker.email = email || null;
        existingWorker.password = hashedPassword;
        existingWorker.city = city || null;
        existingWorker.address = address || null;
        existingWorker.years_of_experience = yearsOfExperience;
        existingWorker.skills = skills || [];
        existingWorker.otp_code = otp;
        existingWorker.otp_expires_at = otpExpiresAt;
        await existingWorker.save();

        const smsSent = await sendOTPviaSMS(mobile, otp);
        return res.status(200).json({
          success: true,
          message: 'OTP resent. Please verify your mobile number.',
          data: { workerId: existingWorker._id, mobile, otp: smsSent ? null : otp }
        });
      }

      return res.status(400).json({
        success: false,
        message: 'This mobile number is already registered as a worker. Please login instead.'
      });
    }

    // ✅ Check email separately — only if provided AND verified
    if (email) {
      const emailExists = await Worker.findOne({ email, is_verified: true });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered. Please login instead.'
        });
      }
    }

    const worker = new Worker({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      mobile,
      password: hashedPassword,
      city: city || null,
      address: address || null,
      years_of_experience: yearsOfExperience,
      skills: skills || [],
      otp_code: otp,
      otp_expires_at: otpExpiresAt
    });

    await worker.save();
    console.log('✅ Worker saved:', worker._id);

    const smsSent = await sendOTPviaSMS(mobile, otp);
    res.status(201).json({
      success: true,
      message: 'Worker registered successfully. Please verify your mobile number.',
      data: { workerId: worker._id, mobile, otp: smsSent ? null : otp }
    });

  } catch (error) {
    console.error('Worker registration error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered. Please login instead.`
      });
    }
    res.status(500).json({ success: false, message: 'Worker registration failed. Please try again.' });
  }
};

// ─── Verify OTP ──────────────────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { mobile, otp, userType = 'user' } = req.body;
    console.log('🔍 OTP Verification:', { mobile, otp, userType });

    const Model = userType === 'worker' ? Worker : User;
    const user = await Model.findOne({ mobile });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.otp_code !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    user.is_verified = true;
    user.otp_code = undefined;
    user.otp_expires_at = undefined;
    await user.save();

    const token = generateToken(user._id, userType);
    console.log('✅ OTP verified successfully');

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
    console.error('❌ OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

// ─── Resend OTP ──────────────────────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { mobile, userType = 'user' } = req.body;
    const Model = userType === 'worker' ? Worker : User;
    const user = await Model.findOne({ mobile });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const otp = generateOTP();
    user.otp_code = otp;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const smsSent = await sendOTPviaSMS(mobile, otp);
    res.json({
      success: true,
      message: 'OTP resent successfully',
      data: { otp: smsSent ? null : otp }
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend OTP' });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { mobile, password, userType = 'user' } = req.body;
    const Model = userType === 'worker' ? Worker : User;
    const user = await Model.findOne({ mobile });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this mobile number' });
    }

    if (!user.is_verified) {
      const otp = generateOTP();
      user.otp_code = otp;
      user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      const smsSent = await sendOTPviaSMS(mobile, otp);

      return res.status(401).json({
        success: false,
        message: 'Please verify your mobile number first',
        data: { requiresVerification: true, mobile, otp: smsSent ? null : otp }
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
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
          mobile: user.mobile
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ─── Forgot Password ─────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { mobile, userType = 'user' } = req.body;
    const Model = userType === 'worker' ? Worker : User;
    const user = await Model.findOne({ mobile });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this mobile number' });
    }

    const otp = generateOTP();
    user.otp_code = otp;
    user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const smsSent = await sendOTPviaSMS(mobile, otp);
    res.json({
      success: true,
      message: 'OTP sent for password reset',
      data: { otp: smsSent ? null : otp }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process request' });
  }
};

// ─── Get Profile ─────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const { userType = 'user' } = req.query;
    const Model = userType === 'worker' ? Worker : User;
    const user = await Model.findById(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          mobile: user.mobile,
          address: user.address,
          city: user.city,
          is_verified: user.is_verified,
          created_at: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

// ─── Update Profile ──────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { userType = 'user' } = req.query;
    const Model = userType === 'worker' ? Worker : User;
    const { firstName, lastName, email, address, city } = req.body;

    const updateData = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (email) updateData.email = email;
    if (address) updateData.address = address;
    if (city) updateData.city = city;

    const updatedUser = await Model.findByIdAndUpdate(req.user.id, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Profile updated successfully', data: { user: updatedUser } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// ─── Update Location ─────────────────────────────────────────────────────────
const updateLocation = async (req, res) => {
  try {
    const { userType = 'user' } = req.query;
    const Model = userType === 'worker' ? Worker : User;
    const { latitude, longitude } = req.body;

    const updatedUser = await Model.findByIdAndUpdate(
      req.user.id,
      { 'location.latitude': parseFloat(latitude), 'location.longitude': parseFloat(longitude) },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Location updated successfully', data: { user: updatedUser } });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
};

module.exports = {
  registerUser,
  registerWorker,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  getProfile,
  updateProfile,
  updateLocation
};