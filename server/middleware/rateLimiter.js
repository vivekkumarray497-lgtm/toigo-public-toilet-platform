const rateLimit = require('express-rate-limit');

// General authentication rate limiter (50 attempts / 15 mins)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
    }
});

// Strict Login / Password rate limiter (100 attempts / 15 mins for development test flexibility)
const strictAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many failed login attempts. Please try again after 15 minutes.'
    }
});

// OTP Request & Resend Rate Limiter (5 requests / 10 mins in production, flexible in non-production)
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 250,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many OTP requests. Please wait before requesting another code.'
    }
});

// Payment & Checkout Rate Limiter (30 requests / 5 mins)
const paymentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many payment requests from this IP. Please wait a few moments.'
    }
});

// General API Rate Limiter (180 requests / 1 min)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please slow down.'
    }
});

module.exports = {
    authLimiter,
    strictAuthLimiter,
    otpLimiter,
    paymentLimiter,
    apiLimiter
};
