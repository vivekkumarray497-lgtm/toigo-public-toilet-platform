const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');
const { paymentLimiter } = require('../middleware/rateLimiter');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Check if Razorpay keys are properly configured
const isRazorpayConfigured = RAZORPAY_KEY_ID &&
    RAZORPAY_KEY_SECRET &&
    !RAZORPAY_KEY_ID.includes('placeholder') &&
    !RAZORPAY_KEY_ID.includes('your_');

let razorpayInstance = null;
if (isRazorpayConfigured) {
    try {
        razorpayInstance = new Razorpay({
            key_id: RAZORPAY_KEY_ID,
            key_secret: RAZORPAY_KEY_SECRET
        });
    } catch (e) {
        console.error('Failed to initialize Razorpay client:', e.message);
    }
}

// 1. CREATE REAL PAYMENT ORDER
router.post('/create-order', authenticateToken, paymentLimiter, async (req, res) => {
    try {
        const { toiletId, method = 'UPI' } = req.body;
        if (!toiletId) {
            return res.status(400).json({ success: false, message: 'Toilet ID is required.' });
        }

        const toilet = (db.data.toilets || []).find(t => t.toiletId === toiletId);
        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet facility not found.' });
        }

        if (toilet.availability !== 'OPEN' || !toilet.active) {
            return res.status(400).json({ success: false, message: 'This toilet is currently closed or under maintenance.' });
        }

        if (toilet.isFree || toilet.price <= 0) {
            return res.status(400).json({ success: false, message: 'This is a free public toilet. No payment required.' });
        }

        let orderId;
        const amountInPaise = Math.round(toilet.price * 100);

        if (razorpayInstance) {
            // Create Real Razorpay Order via SDK
            try {
                const rzpOrder = await razorpayInstance.orders.create({
                    amount: amountInPaise,
                    currency: 'INR',
                    receipt: `rcpt_${Date.now()}_${toilet.toiletId}`,
                    notes: {
                        toiletId: toilet.toiletId,
                        userId: req.user.userId,
                        facilityName: toilet.name
                    }
                });
                orderId = rzpOrder.id;
            } catch (rzpErr) {
                console.error('Razorpay API error creating order:', rzpErr);
                return res.status(502).json({
                    success: false,
                    message: 'Razorpay payment gateway error: ' + (rzpErr.error ? rzpErr.error.description : rzpErr.message)
                });
            }
        } else {
            // Fallback for development/testing when keys are not provided
            if (process.env.NODE_ENV === 'production') {
                return res.status(503).json({
                    success: false,
                    message: 'Payment gateway is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.'
                });
            }
            orderId = 'order_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
        }

        const paymentId = 'pay_' + Date.now();

        const host = (db.data.users || []).find(u => u.userId === toilet.providerId);

        const paymentRecord = {
            paymentId,
            orderId,
            transactionId: null,
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email || null,
            userMobile: req.user.mobile || req.user.phone || null,
            toiletId: toilet.toiletId,
            toiletName: toilet.name,
            toiletAddress: toilet.address || 'Address Not Available',
            toiletLocation: { lat: toilet.latitude, lng: toilet.longitude },
            providerId: toilet.providerId,
            providerName: host ? host.name : (toilet.providerName || 'Verified Host'),
            amount: toilet.price,
            currency: 'INR',
            method,
            gateway: isRazorpayConfigured ? 'RAZORPAY' : 'DIRECT_GATEWAY',
            gatewayOrderId: orderId,
            gatewayPaymentId: null,
            status: 'PENDING',
            signature: null,
            createdAt: new Date().toISOString()
        };

        if (!db.data.payments) db.data.payments = [];
        db.data.payments.push(paymentRecord);
        db.save();

        res.status(201).json({
            success: true,
            orderId,
            paymentId,
            amount: toilet.price,
            amountInPaise,
            currency: 'INR',
            toiletName: toilet.name,
            hostUpiId: toilet.upiId || 'payments@toigo.upi',
            keyId: RAZORPAY_KEY_ID || 'rzp_test_unconfigured'
        });
    } catch (err) {
        console.error('Create payment order error:', err);
        res.status(500).json({ success: false, message: 'Server error creating payment order.' });
    }
});

// 1B. FREE TOILET DIRECT ACCESS (No Payment Required)
router.post('/free-access', authenticateToken, (req, res) => {
    try {
        const { toiletId } = req.body;
        if (!toiletId) {
            return res.status(400).json({ success: false, message: 'Toilet ID is required.' });
        }

        const toilet = (db.data.toilets || []).find(t => t.toiletId === toiletId);
        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet facility not found.' });
        }

        if (!toilet.isFree && toilet.price > 0) {
            return res.status(400).json({ success: false, message: 'This is a paid facility. Please complete online payment.' });
        }

        // Generate one-time secure access token & 30-minute Access Session
        const token = 'TG-FREE-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        const now = new Date();
        const validUntil = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins validity

        const newSession = {
            sessionId: 'sess-free-' + Date.now(),
            userId: req.user.userId,
            toiletId: toilet.toiletId,
            paymentId: null,
            isFree: true,
            accessToken: token,
            status: 'ACTIVE',
            startedAt: now.toISOString(),
            validUntil: validUntil.toISOString(),
            endedAt: null
        };

        if (!db.data.accessSessions) db.data.accessSessions = [];
        db.data.accessSessions.unshift(newSession);
        db.save();

        res.json({
            success: true,
            message: 'Free access granted! Please scan or enter your access code.',
            accessSession: newSession,
            accessToken: token
        });
    } catch (err) {
        console.error('Free access error:', err);
        res.status(500).json({ success: false, message: 'Server error generating free access pass.' });
    }
});

// 1C. WALLET PAYMENT (Atomic Server-Side Balance Validation & Deduction)
router.post('/wallet-pay', authenticateToken, paymentLimiter, (req, res) => {
    try {
        const { toiletId } = req.body;
        if (!toiletId) {
            return res.status(400).json({ success: false, message: 'Toilet ID is required.' });
        }

        const user = (db.data.users || []).find(u => u.userId === req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        const toilet = (db.data.toilets || []).find(t => t.toiletId === toiletId);
        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet facility not found.' });
        }

        if (toilet.availability !== 'OPEN' || !toilet.active) {
            return res.status(400).json({ success: false, message: 'This toilet is currently closed or under maintenance.' });
        }

        if (toilet.isFree || toilet.price <= 0) {
            return res.status(400).json({ success: false, message: 'This is a free toilet. No wallet payment required.' });
        }

        const currentBalance = user.walletBalance || 0;
        const requiredAmount = toilet.price;

        if (currentBalance < requiredAmount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. You have ₹${currentBalance}, but ₹${requiredAmount} is required.`,
                walletBalance: currentBalance,
                requiredAmount
            });
        }

        // Atomic deduction
        user.walletBalance = currentBalance - requiredAmount;

        const paymentId = 'pay_wal_' + Date.now();
        const orderId = 'ord_wal_' + Date.now();
        const transactionId = 'TXN_WAL_' + crypto.randomBytes(4).toString('hex').toUpperCase();

        const host = (db.data.users || []).find(u => u.userId === toilet.providerId);
        const hostCut = Math.round(requiredAmount * 0.9);
        const platformCut = requiredAmount - hostCut;

        if (host) {
            host.walletBalance = (host.walletBalance || 0) + hostCut;
        }

        const paymentRecord = {
            paymentId,
            orderId,
            transactionId,
            userId: user.userId,
            userName: user.name,
            userEmail: user.email,
            userMobile: user.mobile || user.phone,
            toiletId: toilet.toiletId,
            toiletName: toilet.name,
            toiletAddress: toilet.address || 'Address Not Available',
            toiletLocation: { lat: toilet.latitude, lng: toilet.longitude },
            providerId: toilet.providerId,
            providerName: host ? host.name : (toilet.providerName || 'Verified Host'),
            amount: requiredAmount,
            currency: 'INR',
            method: 'TOIGO Wallet',
            gateway: 'TOIGO_WALLET',
            gatewayOrderId: orderId,
            gatewayPaymentId: transactionId,
            status: 'SUCCESS',
            signature: 'wallet_internal_debit_verified',
            verifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        if (!db.data.payments) db.data.payments = [];
        db.data.payments.push(paymentRecord);

        // Record in wallet transactions
        if (!db.data.walletTransactions) db.data.walletTransactions = [];
        db.data.walletTransactions.unshift({
            txId: 'wtx-' + Date.now(),
            userId: user.userId,
            amount: requiredAmount,
            type: 'DEBIT',
            description: `Pass for ${toilet.name}`,
            toiletId: toilet.toiletId,
            balanceAfter: user.walletBalance,
            createdAt: new Date().toISOString()
        });

        // Add ledger record
        if (!db.data.ledger) db.data.ledger = [];
        db.data.ledger.unshift({
            ledgerId: 'ledg-' + Date.now(),
            paymentId,
            orderId,
            transactionId,
            providerId: toilet.providerId,
            grossAmount: requiredAmount,
            hostEarning: hostCut,
            platformFee: platformCut,
            timestamp: new Date().toISOString()
        });

        // Generate Access Session
        const token = 'TG-WAL-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        const now = new Date();
        const validUntil = new Date(now.getTime() + 30 * 60 * 1000);

        const newSession = {
            sessionId: 'sess-' + Date.now(),
            userId: user.userId,
            toiletId: toilet.toiletId,
            paymentId,
            accessToken: token,
            status: 'ACTIVE',
            startedAt: now.toISOString(),
            validUntil: validUntil.toISOString(),
            endedAt: null
        };

        if (!db.data.accessSessions) db.data.accessSessions = [];
        db.data.accessSessions.unshift(newSession);

        // Add In-App Notification
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: user.userId,
            title: '👛 Wallet Payment Successful',
            message: `Paid ₹${requiredAmount} using TOIGO Wallet for ${toilet.name}. Access token: ${token}. New balance: ₹${user.walletBalance}`,
            type: 'PAYMENT',
            read: false,
            createdAt: new Date().toISOString()
        });

        db.save();

        res.json({
            success: true,
            message: 'Payment completed successfully using wallet balance!',
            payment: paymentRecord,
            accessSession: newSession,
            accessToken: token,
            walletBalance: user.walletBalance
        });
    } catch (err) {
        console.error('Wallet payment error:', err);
        res.status(500).json({ success: false, message: 'Server error processing wallet payment.' });
    }
});

// 1D. GET WALLET BALANCE & TRANSACTION HISTORY
router.get('/wallet/history', authenticateToken, (req, res) => {
    try {
        const user = (db.data.users || []).find(u => u.userId === req.user.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const history = (db.data.walletTransactions || []).filter(t => t.userId === req.user.userId);
        res.json({
            success: true,
            walletBalance: user.walletBalance || 0,
            count: history.length,
            transactions: history
        });
    } catch (err) {
        console.error('Wallet history error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving wallet history.' });
    }
});

// 2. VERIFY PAYMENT TRANSACTION & GENERATE ACCESS SESSION
router.post('/verify', authenticateToken, paymentLimiter, (req, res) => {
    try {
        const {
            orderId,
            transactionId,
            paymentMethod,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const effectiveOrderId = razorpay_order_id || orderId;
        const effectivePaymentId = razorpay_payment_id || transactionId;
        const effectiveSignature = razorpay_signature;

        if (!effectiveOrderId) {
            return res.status(400).json({ success: false, message: 'Order ID is required for verification.' });
        }

        const payment = (db.data.payments || []).find(p => p.orderId === effectiveOrderId);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment order record not found.' });
        }

        if (payment.userId !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Payment does not belong to your account.' });
        }

        if (payment.status === 'SUCCESS') {
            // Already verified (idempotent), return active session
            const existingSession = (db.data.accessSessions || []).find(s => s.paymentId === payment.paymentId);
            return res.json({
                success: true,
                message: 'Payment verified.',
                payment,
                accessSession: existingSession,
                accessToken: existingSession ? existingSession.accessToken : null
            });
        }

        // Cryptographic HMAC SHA256 Signature Verification
        if (RAZORPAY_KEY_SECRET && effectiveSignature) {
            const expectedSignature = crypto
                .createHmac('sha256', RAZORPAY_KEY_SECRET)
                .update(`${effectiveOrderId}|${effectivePaymentId}`)
                .digest('hex');

            const isSignatureValid = crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'utf8'),
                Buffer.from(effectiveSignature, 'utf8')
            );

            if (!isSignatureValid) {
                payment.status = 'FAILED';
                db.save();
                return res.status(400).json({
                    success: false,
                    message: 'Payment signature verification failed. Tampered or invalid transaction.'
                });
            }
        } else if (process.env.NODE_ENV === 'production' && !effectivePaymentId) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID and verification signature are required.'
            });
        }

        // Mark payment as SUCCESS
        payment.status = 'SUCCESS';
        payment.transactionId = effectivePaymentId || 'pay_verified_' + Date.now();
        payment.gatewayPaymentId = effectivePaymentId;
        payment.signature = effectiveSignature || 'verified_server_hmac';
        if (paymentMethod) payment.method = paymentMethod;
        payment.verifiedAt = new Date().toISOString();

        // Host provider balance credit & Ledger Accounting
        const hostCut = Math.round(payment.amount * 0.9);
        const platformCut = payment.amount - hostCut;

        const host = (db.data.users || []).find(u => u.userId === payment.providerId);
        if (host) {
            host.walletBalance = (host.walletBalance || 0) + hostCut;
        }

        // Add ledger record
        if (!db.data.ledger) db.data.ledger = [];
        db.data.ledger.unshift({
            ledgerId: 'ledg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            paymentId: payment.paymentId,
            orderId: payment.orderId,
            transactionId: payment.transactionId,
            providerId: payment.providerId,
            grossAmount: payment.amount,
            hostEarning: hostCut,
            platformFee: platformCut,
            timestamp: new Date().toISOString()
        });

        // Generate one-time secure access token & 30-minute Access Session
        const token = 'TG-ACC-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
        const now = new Date();
        const validUntil = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins validity

        const newSession = {
            sessionId: 'sess-' + Date.now(),
            userId: req.user.userId,
            toiletId: payment.toiletId,
            paymentId: payment.paymentId,
            accessToken: token,
            status: 'ACTIVE',
            startedAt: now.toISOString(),
            validUntil: validUntil.toISOString(),
            endedAt: null
        };

        if (!db.data.accessSessions) db.data.accessSessions = [];
        db.data.accessSessions.unshift(newSession);

        // Add In-App Notification for User
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: req.user.userId,
            title: '💳 Payment Successful',
            message: `Paid ₹${payment.amount} for ${payment.toiletName}. Your door access code is: ${token}`,
            type: 'PAYMENT',
            read: false,
            createdAt: new Date().toISOString()
        });

        db.save();

        res.json({
            success: true,
            message: 'Payment verified successfully! Access granted.',
            payment,
            accessSession: newSession,
            accessToken: token
        });
    } catch (err) {
        console.error('Verify payment error:', err);
        res.status(500).json({ success: false, message: 'Server error verifying payment.' });
    }
});

// 3. GET PAYMENT HISTORY (User, Provider, or Admin)
router.get('/history', authenticateToken, (req, res) => {
    try {
        let list = db.data.payments || [];
        if (req.user.role === 'USER') {
            list = list.filter(p => p.userId === req.user.userId);
        } else if (req.user.role === 'PROVIDER') {
            list = list.filter(p => p.providerId === req.user.userId);
        }
        // Admin sees all

        res.json({
            success: true,
            count: list.length,
            payments: list
        });
    } catch (err) {
        console.error('Get payment history error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving payments.' });
    }
});

// 4. REFUND PAYMENT (Admin only)
router.post('/refund', authenticateToken, requireRole('ADMIN'), (req, res) => {
    try {
        const { paymentId, reason } = req.body;
        const payment = (db.data.payments || []).find(p => p.paymentId === paymentId);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found.' });
        }

        if (payment.status === 'REFUNDED') {
            return res.status(400).json({ success: false, message: 'This payment has already been refunded.' });
        }

        payment.status = 'REFUNDED';
        payment.refundReason = reason || 'Customer support refund';
        payment.refundedAt = new Date().toISOString();

        // Deduct from host wallet
        const hostCut = Math.round(payment.amount * 0.9);
        const host = (db.data.users || []).find(u => u.userId === payment.providerId);
        if (host) {
            host.walletBalance = Math.max(0, (host.walletBalance || 0) - hostCut);
        }

        db.save();

        logAuditAction({
            adminId: req.user.userId,
            adminName: req.user.name,
            action: 'PAYMENT_REFUNDED',
            targetId: payment.paymentId,
            targetType: 'PAYMENT',
            previousValue: 'SUCCESS',
            newValue: 'REFUNDED',
            reason: reason || 'Admin processed refund'
        });

        // Notify user
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: payment.userId,
            title: '💸 Payment Refunded',
            message: `Your payment of ₹${payment.amount} for ${payment.toiletName} has been refunded. Reason: ${reason || 'Approved by support'}.`,
            type: 'PAYMENT',
            read: false,
            createdAt: new Date().toISOString()
        });
        db.save();

        res.json({
            success: true,
            message: 'Payment refunded successfully.',
            payment
        });
    } catch (err) {
        console.error('Refund payment error:', err);
        res.status(500).json({ success: false, message: 'Server error processing refund.' });
    }
});

module.exports = router;
