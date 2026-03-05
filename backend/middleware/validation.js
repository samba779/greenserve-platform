const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    // Clean mobile number - remove spaces, dashes, etc.
    if (req.body.mobile) {
      req.body.mobile = req.body.mobile.replace(/[^0-9]/g, '');
    }
    
    console.log('🔍 Validation Request Body:', req.body);
    
    const { error } = schema.validate(req.body);
    if (error) {
      console.log('❌ Validation Error:', error.details[0].message);
      console.log('❌ Validation Error Details:', error.details);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    
    console.log('✅ Validation Passed');
    next();
  };
};

// User Registration Schema
const userRegistrationSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().optional(),
  mobile: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
    'string.pattern.base': 'Mobile number must be exactly 10 digits'
  }),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().optional(), // Allow but don't validate
  address: Joi.string().optional(),
  city: Joi.string().optional()
});

// Worker Registration Schema
const workerRegistrationSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().optional(),
  mobile: Joi.string().pattern(/^[0-9]{10}$/).required(),
  password: Joi.string().min(8).required(),
  city: Joi.string().required(),
  address: Joi.string().optional(),
  yearsOfExperience: Joi.number().integer().min(0).max(50).optional(),
  skills: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'Select at least one skill'
  })
});

// Login Schema
const loginSchema = Joi.object({
  mobile: Joi.string().pattern(/^[0-9]{10}$/).required(),
  password: Joi.string().required(),
  userType: Joi.string().valid('user', 'worker').optional()
});

// OTP Verification Schema
const otpSchema = Joi.object({
  mobile: Joi.string().pattern(/^[0-9]{10}$/).required(),
  otp: Joi.string().length(6).required(),
  userType: Joi.string().valid('user', 'worker').optional()
});

// Booking Schema
const bookingSchema = Joi.object({
  serviceId: Joi.any().required(),
  bookingDate: Joi.date().min('now').required(),
  bookingTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  address: Joi.string().min(10).required(),
  city: Joi.string().required(),
  latitude: Joi.number().precision(8).optional(),
  longitude: Joi.number().precision(8).optional(),
  notes: Joi.string().max(500).optional()
});

// Payment Schema
const paymentSchema = Joi.object({
  bookingId: Joi.number().integer().required(),
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid('upi', 'card', 'netbanking', 'cash', 'wallet').required()
});

// Review Schema
const reviewSchema = Joi.object({
  bookingId: Joi.number().integer().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  reviewText: Joi.string().max(1000).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isRecommended: Joi.boolean().optional()
});

// Worker Status Update Schema
const workerStatusSchema = Joi.object({
  isOnline: Joi.boolean().required(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional()
});

module.exports = {
  validate,
  userRegistrationSchema,
  workerRegistrationSchema,
  loginSchema,
  otpSchema,
  bookingSchema,
  paymentSchema,
  reviewSchema,
  workerStatusSchema
};
