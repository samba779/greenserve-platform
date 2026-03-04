const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Worker = require('../models/Worker');
const { generateToken } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Email (Render-compatible)

// Send OTP via Email (Render-compatible)
const sendOTPviaEmail = async (email, otp, firstName) => {
  try {
    // Create transporter using Render's email service or environment variables
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER,
        pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"GreenServe" <noreply@greenserve.com>',
      to: email,
      subject: 'Your GreenServe Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px;">
            <h2 style="color: white; text-align: center; margin: 0;">🌿 Welcome to GreenServe!</h2>
          </div>
          <div style="background: white; padding: 30px; border-radius: 8px;">
            <p>Hi ${firstName},</p>
            <p>Thank you for choosing GreenServe! Your verification code is:</p>
            <div style="background: #f8f9fa; border: 2px dashed #6c757d; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
              ${otp}
            </div>
            <p style="color: #666; margin-top: 20px;">This code will expire in 10 minutes. Please enter it in verification form.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #28a745; margin: 0;">Best regards,<br>The GreenServe Team 🌿</p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 OTP email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
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

    // ✅ Allow multiple users with same mobile - create new account every time
    console.log('✅ Creating new user account');
    
    const newUser = new User({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      mobile: mobile,
      password: hashedPassword,
      address: address || null,
      city: city || null,
      is_verified: false,
      otp_code: otp,
      otp_expires_at: otpExpiresAt
    });

    await newUser.save();
    console.log('✅ New user created:', newUser._id);

    const smsSent = await sendOTPviaEmail(mobile, otp);
    
    res.status(201).json({
      success: true,
      message: 'Account created! Please verify with OTP',
      data: {
        userId: newUser._id,
        mobile: mobile,
        requiresVerification: true,
        otpSent: smsSent
      }
    });

  } catch (error) {
    console.error('❌ Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: error.message
    });
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

    // ✅ Allow multiple workers with same mobile - create new account every time
    console.log('✅ Creating new worker account');

    const newWorker = new Worker({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      mobile: mobile,
      password: hashedPassword,
      city: city || null,
      address: address || null,
      years_of_experience: yearsOfExperience || 0,
      skills: skills || [],
      is_verified: false,
      otp_code: otp,
      otp_expires_at: otpExpiresAt
    });

    await newWorker.save();
    console.log('✅ New worker created:', newWorker._id);

    const smsSent = await sendOTPviaEmail(mobile, otp);

    res.status(201).json({
      success: true,
      message: 'Worker account created! Please verify with OTP',
      data: {
        workerId: newWorker._id,
        mobile: mobile,
        requiresVerification: true,
        otpSent: smsSent
      }
    });

  } catch (error) {
    console.error('❌ Worker Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Worker registration failed. Please try again.',
      error: error.message
    });
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

    const smsSent = await sendOTPviaEmail(mobile, otp);
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
      const smsSent = await sendOTPviaEmail(mobile, otp);

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

    const smsSent = await sendOTPviaEmail(mobile, otp);
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