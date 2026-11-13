const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// 1. GET USER NOTIFICATIONS
router.get('/', authenticateToken, apiLimiter, (req, res) => {
    try {
        const notifs = (db.data.notifications || []).filter(n =>
            n.userId === req.user.userId ||
            n.role === 'ALL' ||
            (n.role && n.role === req.user.role)
        );

        res.json({
            success: true,
            count: notifs.length,
            unreadCount: notifs.filter(n => !n.read).length,
            notifications: notifs
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving notifications.' });
    }
});

// 2. MARK NOTIFICATION AS READ (Protected to owner)
router.put('/:id/read', authenticateToken, (req, res) => {
    try {
        const notif = (db.data.notifications || []).find(n => n.notificationId === req.params.id);
        if (!notif) {
            return res.status(404).json({ success: false, message: 'Notification not found.' });
        }

        // Only owner or admin can mark read
        if (notif.userId && notif.userId !== req.user.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden. This notification does not belong to your account.' });
        }

        notif.read = true;
        db.save();

        res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// 3. MARK ALL NOTIFICATIONS AS READ
router.post('/read-all', authenticateToken, (req, res) => {
    try {
        (db.data.notifications || []).forEach(n => {
            if (n.userId === req.user.userId || n.role === 'ALL' || n.role === req.user.role) {
                n.read = true;
            }
        });
        db.save();
        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
        console.error('Mark all read error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
