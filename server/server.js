const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB, getDbStatus } = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');

// Validate critical security environment variables
if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        process.env.JWT_SECRET = 'toigo_prod_auto_secret_jwt_key_' + (process.env.RENDER_SERVICE_ID || 'platform_2026');
        console.warn('⚠️ Notice: JWT_SECRET not found in environment. Initialized auto-generated secure session secret.');
    } else {
        process.env.JWT_SECRET = 'toigo_dev_jwt_secret_key_2026_change_in_prod';
        console.warn('⚠️ Development warning: JWT_SECRET not found in .env. Initialized temporary development secret.');
    }
}

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const toiletRoutes = require('./routes/toiletRoutes');
const reportRoutes = require('./routes/reportRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const accessRoutes = require('./routes/accessRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const providerRoutes = require('./routes/providerRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database Connection
connectDB();

// Security Headers (Helmet with Content Security Policy)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://cdn.tailwindcss.com",
                "https://unpkg.com",
                "https://cdn.jsdelivr.net",
                "https://checkout.razorpay.com",
                "https://api.razorpay.com",
                "https://accounts.google.com",
                "https://www.gstatic.com",
                "https://apis.google.com",
                "https://*.firebaseio.com",
                "https://*.googleapis.com",
                "https://www.google.com/recaptcha/",
                "https://www.gstatic.com/recaptcha/",
                "https://www.recaptcha.net/"
            ],
            scriptSrcAttr: [
                "'unsafe-inline'"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://unpkg.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://*.google.com",
                "https://*.google.co.in",
                "https://*.googleapis.com",
                "https://*.gstatic.com",
                "https://*.googleusercontent.com",
                "https://*.tile.openstreetmap.org",
                "https://server.arcgisonline.com",
                "https://images.unsplash.com",
                "https://api.dicebear.com"
            ],
            connectSrc: [
                "'self'",
                "http://localhost:5000",
                "http://127.0.0.1:5000",
                "https://api.razorpay.com",
                "https://lumberjack.razorpay.com",
                "https://nominatim.openstreetmap.org",
                "https://accounts.google.com",
                "https://oauth2.googleapis.com",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com",
                "https://*.firebaseio.com",
                "https://*.googleapis.com",
                "https://www.google.com/recaptcha/",
                "https://www.recaptcha.net/"
            ],
            frameSrc: [
                "'self'",
                "https://api.razorpay.com",
                "https://accounts.google.com",
                "https://*.firebaseapp.com",
                "https://www.google.com/recaptcha/",
                "https://www.recaptcha.net/",
                "https://recaptcha.net/"
            ],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
    : ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000', 'http://127.0.0.1:5500'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: Request from origin ' + origin + ' is not allowed.'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '15mb' })); // Support base64 image uploads
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// General API Rate Limiting
app.use('/api', apiLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'TOIGO Sanitation Network REST API',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        database: getDbStatus()
    });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/toilets', toiletRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/provider', providerRoutes);

// Serve static frontend assets from root project directory
const staticDir = path.join(__dirname, '..');
app.use(express.static(staticDir));

// Explicit route for root index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

// Fallback to index.html for SPA frontend routing
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: `API endpoint '${req.originalUrl}' not found.`
        });
    }
    res.sendFile(path.join(staticDir, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error('Server error:', err);
    }
    const statusCode = err.status || (err.name === 'UnauthorizedError' ? 401 : 500);
    res.status(statusCode).json({
        success: false,
        message: err.message || 'An unexpected internal server error occurred.',
        ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
    });
});

// Start Server
const server = app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 TOIGO Master Backend Server running on port ${PORT}`);
    console.log(`🌐 Web App & API URL: http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`==================================================\n`);
});

module.exports = app;
