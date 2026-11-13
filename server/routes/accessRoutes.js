const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// 1. VALIDATE SCANNED QR CODE
router.post('/validate-qr', authenticateToken, apiLimiter, (req, res) => {
    try {
        const { qrData } = req.body;
        if (!qrData) {
            return res.status(400).json({ success: false, message: 'QR Code payload is missing.' });
        }

        let targetToiletId = qrData.trim();

        // Support JSON formatted QR codes: {"toigoToiletId":"t-1"} or raw URL
        if (qrData.startsWith('{') && qrData.endsWith('}')) {
            try {
                const parsed = JSON.parse(qrData);
                targetToiletId = parsed.toigoToiletId || parsed.toiletId || parsed.id || qrData;
            } catch (e) {}
        } else if (qrData.includes('/toilet/')) {
            targetToiletId = qrData.split('/toilet/')[1].split('?')[0];
        }

        const toilet = (db.data.toilets || []).find(t => t.toiletId === targetToiletId);
        if (!toilet) {
            return res.status(404).json({
                success: false,
                message: 'Invalid QR Code. No matching TOIGO washroom found for this code.'
            });
        }

        if (toilet.status !== 'APPROVED' || !toilet.active) {
            return res.status(400).json({
                success: false,
                message: 'This washroom facility is currently not approved or inactive.'
            });
        }

        if (toilet.availability !== 'OPEN') {
            return res.status(400).json({
                success: false,
                message: `This washroom is currently ${toilet.availability.replace('_', ' ').toLowerCase()}.`
            });
        }

        // Check if user already has an active, non-expired session for this toilet
        const now = new Date();
        const existingSession = (db.data.accessSessions || []).find(s =>
            s.userId === req.user.userId &&
            s.toiletId === toilet.toiletId &&
            s.status === 'ACTIVE' &&
            new Date(s.validUntil) > now
        );

        if (existingSession) {
            return res.json({
                success: true,
                isFree: Boolean(toilet.isFree || toilet.price === 0),
                message: 'Active pass found! Door unlocked.',
                toilet,
                accessSession: existingSession,
                accessToken: existingSession.accessToken
            });
        }

        // Check if free toilet
        if (toilet.isFree || toilet.price === 0) {
            const token = 'TG-FREE-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
            const validUntil = new Date(now.getTime() + 30 * 60 * 1000);

            const freeSession = {
                sessionId: 'sess-' + Date.now(),
                userId: req.user.userId,
                toiletId: toilet.toiletId,
                paymentId: null,
                accessToken: token,
                status: 'ACTIVE',
                startedAt: now.toISOString(),
                validUntil: validUntil.toISOString(),
                endedAt: null
            };

            if (!db.data.accessSessions) db.data.accessSessions = [];
            db.data.accessSessions.unshift(freeSession);
            db.save();

            return res.json({
                success: true,
                isFree: true,
                message: 'Valid QR Code! Free public access granted.',
                toilet,
                accessSession: freeSession,
                accessToken: token
            });
        }

        // Paid toilet requires payment
        return res.json({
            success: true,
            isFree: false,
            message: 'Valid QR Code! Paid washroom. Proceed to checkout.',
            toilet,
            price: toilet.price
        });
    } catch (err) {
        console.error('Validate QR error:', err);
        res.status(500).json({ success: false, message: 'Server error validating QR code.' });
    }
});

// 2. GET CURRENT ACTIVE SESSION
router.get('/active', authenticateToken, (req, res) => {
    try {
        const now = new Date();
        const active = (db.data.accessSessions || []).find(s =>
            s.userId === req.user.userId &&
            s.status === 'ACTIVE' &&
            new Date(s.validUntil) > now
        );

        if (!active) {
            return res.json({ success: true, activeSession: null });
        }

        const toilet = (db.data.toilets || []).find(t => t.toiletId === active.toiletId);
        res.json({
            success: true,
            activeSession: {
                ...active,
                toilet
            }
        });
    } catch (err) {
        console.error('Get active session error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving session.' });
    }
});

// 3. COMPLETE ACCESS SESSION
router.post('/complete-session', authenticateToken, (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = (db.data.accessSessions || []).find(s => s.sessionId === sessionId && s.userId === req.user.userId);

        if (!session) {
            return res.status(404).json({ success: false, message: 'Active session not found.' });
        }

        session.status = 'COMPLETED';
        session.endedAt = new Date().toISOString();
        db.save();

        res.json({
            success: true,
            message: 'Washroom visit completed. Please leave a hygiene review!',
            session
        });
    } catch (err) {
        console.error('Complete session error:', err);
        res.status(500).json({ success: false, message: 'Server error completing session.' });
    }
});

// 4. VERIFY ACCESS TOKEN (For Smart-Lock Door Controller / Host Validator)
router.post('/verify-token', (req, res) => {
    try {
        const { accessToken, toiletId } = req.body;
        if (!accessToken) {
            return res.status(400).json({ success: false, valid: false, message: 'Access token is required.' });
        }

        const now = new Date();
        const session = (db.data.accessSessions || []).find(s => s.accessToken === accessToken.trim());

        if (!session) {
            return res.status(404).json({ success: false, valid: false, message: 'Invalid or unknown access token.' });
        }

        if (session.status !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                valid: false,
                message: `Access token has already been ${session.status.toLowerCase()}. Token reuse prevented.`
            });
        }

        if (new Date(session.validUntil) < now) {
            session.status = 'EXPIRED';
            db.save();
            return res.status(400).json({ success: false, valid: false, message: 'Access token has expired.' });
        }

        if (toiletId && session.toiletId !== toiletId) {
            return res.status(403).json({ success: false, valid: false, message: 'Token is not valid for this specific facility.' });
        }

        res.json({
            success: true,
            valid: true,
            message: 'Access token verified. Door unlocked.',
            session: {
                sessionId: session.sessionId,
                toiletId: session.toiletId,
                validUntil: session.validUntil
            }
        });
    } catch (err) {
        console.error('Verify token error:', err);
        res.status(500).json({ success: false, message: 'Server error verifying token.' });
    }
});

module.exports = router;
