const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing!');
}

const authenticateToken = (req, res, next) => {
    if (!JWT_SECRET) {
        return res.status(500).json({
            success: false,
            message: 'Server security configuration error. JWT_SECRET is not configured.'
        });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Authentication token missing.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Find user in database to ensure account is not suspended
        const user = (db.data.users || []).find(u => u.userId === decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session. User account no longer exists.'
            });
        }

        if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
            return res.status(403).json({
                success: false,
                message: 'Account suspended. Please contact support.'
            });
        }

        req.user = {
            userId: user.userId,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status
        };
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please log in again.'
        });
    }
};

// Role-based authorization guard
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden. This action requires one of the following roles: ${roles.join(', ')}.`
            });
        }
        next();
    };
};

// Optional auth: attaches user if token is present, but doesn't block if missing
const optionalAuth = (req, res, next) => {
    if (!JWT_SECRET) return next();

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = (db.data.users || []).find(u => u.userId === decoded.userId);
            if (user && user.status === 'ACTIVE') {
                req.user = {
                    userId: user.userId,
                    email: user.email,
                    name: user.name,
                    role: user.role
                };
            }
        } catch (e) {
            // Ignore invalid optional tokens
        }
    }
    next();
};

const generateToken = (user) => {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured on the server.');
    }
    return jwt.sign(
        {
            userId: user.userId,
            email: user.email,
            role: user.role,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = {
    authenticateToken,
    requireRole,
    optionalAuth,
    generateToken,
    JWT_SECRET
};
