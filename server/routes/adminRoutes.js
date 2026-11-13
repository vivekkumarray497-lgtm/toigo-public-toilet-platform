const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// All endpoints in this router require ADMIN role
router.use(authenticateToken, requireRole('ADMIN'));

// 1. ADMIN DASHBOARD SUMMARY METRICS
router.get('/dashboard', (req, res) => {
    try {
        const allUsers = db.data.users || [];
        const citizens = allUsers.filter(u => u.role === 'USER');
        const providers = allUsers.filter(u => u.role === 'PROVIDER');

        const allToilets = db.data.toilets || [];
        const pendingToilets = allToilets.filter(t => t.status === 'PENDING');
        const approvedToilets = allToilets.filter(t => t.status === 'APPROVED');
        const rejectedToilets = allToilets.filter(t => t.status === 'REJECTED');
        const openToilets = approvedToilets.filter(t => t.availability === 'OPEN');
        const closedToilets = approvedToilets.filter(t => t.availability !== 'OPEN');

        const allReports = db.data.reports || [];
        const pendingReports = allReports.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS');
        const resolvedReports = allReports.filter(r => r.status === 'RESOLVED');

        const allPayments = db.data.payments || [];
        const successfulPayments = allPayments.filter(p => p.status === 'SUCCESS');
        const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
        const founderCut = Math.round(totalRevenue * 0.10); // 10% platform commission

        const allReviews = db.data.reviews || [];
        const validHygieneToilets = approvedToilets.filter(t => t.hygieneScore != null && t.hygieneScore > 0);
        const avgHygiene = validHygieneToilets.length > 0
            ? Math.round(validHygieneToilets.reduce((sum, t) => sum + t.hygieneScore, 0) / validHygieneToilets.length)
            : null;

        res.json({
            success: true,
            stats: {
                totalUsers: citizens.length,
                totalProviders: providers.length,
                totalToilets: allToilets.length,
                pendingToilets: pendingToilets.length,
                approvedToilets: approvedToilets.length,
                rejectedToilets: rejectedToilets.length,
                openToilets: openToilets.length,
                closedToilets: closedToilets.length,
                totalReports: allReports.length,
                pendingReports: pendingReports.length,
                resolvedReports: resolvedReports.length,
                totalPaymentsCount: successfulPayments.length,
                totalRevenue,
                founderCommissionRevenue: founderCut,
                totalReviews: allReviews.length,
                averageHygieneScore: avgHygiene
            }
        });
    } catch (err) {
        console.error('Admin dashboard stats error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving admin metrics.' });
    }
});

// 2. GET AUDIT LOGS
router.get('/audit-logs', (req, res) => {
    try {
        const logs = db.data.auditLogs || [];
        res.json({
            success: true,
            count: logs.length,
            auditLogs: logs
        });
    } catch (err) {
        console.error('Get audit logs error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving audit logs.' });
    }
});

// 3. APPROVE / REJECT TOILET
router.put('/toilets/:id/verify', (req, res) => {
    try {
        const { action, rejectionReason } = req.body; // action: 'APPROVE' | 'REJECT'
        const toilet = (db.data.toilets || []).find(t => t.toiletId === req.params.id);

        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet not found.' });
        }

        const prevStatus = toilet.status;

        if (action === 'APPROVE') {
            toilet.status = 'APPROVED';
            toilet.rejectionReason = null;
            toilet.lastInspectedAt = new Date().toISOString();
        } else if (action === 'REJECT') {
            toilet.status = 'REJECTED';
            toilet.rejectionReason = rejectionReason || 'Failed hygiene inspection standards';
        } else {
            return res.status(400).json({ success: false, message: "Action must be 'APPROVE' or 'REJECT'." });
        }

        toilet.updatedAt = new Date().toISOString();
        db.save();

        logAuditAction({
            adminId: req.user.userId,
            adminName: req.user.name,
            action: action === 'APPROVE' ? 'TOILET_APPROVED' : 'TOILET_REJECTED',
            targetId: toilet.toiletId,
            targetType: 'TOILET',
            previousValue: prevStatus,
            newValue: toilet.status,
            reason: rejectionReason || `Admin marked as ${toilet.status}`
        });

        // Notify provider
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: toilet.providerId,
            role: 'PROVIDER',
            title: action === 'APPROVE' ? '🎉 Washroom Approved!' : '❌ Washroom Listing Rejected',
            message: action === 'APPROVE'
                ? `Congratulations! Your washroom "${toilet.name}" is now approved and live on the map.`
                : `Your washroom "${toilet.name}" was rejected. Reason: ${toilet.rejectionReason}`,
            type: 'TOILET',
            read: false,
            createdAt: new Date().toISOString()
        });
        db.save();

        res.json({
            success: true,
            message: `Toilet ${toilet.status.toLowerCase()} successfully.`,
            toilet
        });
    } catch (err) {
        console.error('Verify toilet error:', err);
        res.status(500).json({ success: false, message: 'Server error updating toilet approval status.' });
    }
});

// 4. SUSPEND / ACTIVATE USER OR PROVIDER
router.put('/users/:id/status', (req, res) => {
    try {
        const { status, reason } = req.body; // 'ACTIVE' | 'SUSPENDED'
        const user = (db.data.users || []).find(u => u.userId === req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const prev = user.status;
        user.status = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
        db.save();

        logAuditAction({
            adminId: req.user.userId,
            adminName: req.user.name,
            action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
            targetId: user.userId,
            targetType: user.role === 'PROVIDER' ? 'PROVIDER' : 'USER',
            previousValue: prev,
            newValue: user.status,
            reason: reason || `Admin updated status to ${user.status}`
        });

        res.json({
            success: true,
            message: `User status updated to ${user.status}.`,
            user: { userId: user.userId, name: user.name, status: user.status }
        });
    } catch (err) {
        console.error('Update user status error:', err);
        res.status(500).json({ success: false, message: 'Server error updating user status.' });
    }
});

// 5. GRANT PROMOTIONAL WALLET CREDIT
router.post('/users/:id/credit', (req, res) => {
    try {
        const { amount, reason } = req.body;
        const creditAmt = parseFloat(amount);

        if (isNaN(creditAmt) || creditAmt <= 0) {
            return res.status(400).json({ success: false, message: 'Please enter a valid credit amount.' });
        }

        const user = (db.data.users || []).find(u => u.userId === req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const prevBalance = user.walletBalance || 0;
        user.walletBalance = prevBalance + creditAmt;
        db.save();

        logAuditAction({
            adminId: req.user.userId,
            adminName: req.user.name,
            action: 'WALLET_CREDITED',
            targetId: user.userId,
            targetType: 'USER',
            previousValue: `₹${prevBalance}`,
            newValue: `₹${user.walletBalance}`,
            reason: reason || 'Founder promotional bonus'
        });

        // Notify user
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: user.userId,
            title: '🎁 Promotional Credits Added!',
            message: `You received ₹${creditAmt} bonus credits from Founder Vivek. New balance: ₹${user.walletBalance}`,
            type: 'SYSTEM',
            read: false,
            createdAt: new Date().toISOString()
        });
        db.save();

        res.json({
            success: true,
            message: `Granted ₹${creditAmt} promo credits to ${user.name}.`,
            newBalance: user.walletBalance
        });
    } catch (err) {
        console.error('Credit wallet error:', err);
        res.status(500).json({ success: false, message: 'Server error granting wallet credits.' });
    }
});

// 6. BROADCAST ANNOUNCEMENT
router.post('/broadcast', (req, res) => {
    try {
        const { title, message, targetRole = 'ALL' } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required.' });
        }

        if (!db.data.notifications) db.data.notifications = [];
        const notif = {
            notificationId: 'notif-' + Date.now(),
            userId: null,
            role: targetRole,
            title: `📢 ${title}`,
            message: message.trim(),
            type: 'SYSTEM',
            read: false,
            createdAt: new Date().toISOString()
        };
        db.data.notifications.unshift(notif);
        db.save();

        logAuditAction({
            adminId: req.user.userId,
            adminName: req.user.name,
            action: 'BROADCAST_SENT',
            targetId: 'ALL',
            targetType: 'SYSTEM',
            newValue: title,
            reason: `Target: ${targetRole}`
        });

        res.json({ success: true, message: 'Broadcast announcement published successfully.' });
    } catch (err) {
        console.error('Broadcast error:', err);
        res.status(500).json({ success: false, message: 'Server error sending broadcast.' });
    }
});

// 8. GET ALL PROVIDERS & PENDING APPROVALS
router.get('/providers', (req, res) => {
    try {
        const { status } = req.query; // 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
        let providers = (db.data.users || []).filter(u => u.role === 'PROVIDER');
        if (status) {
            providers = providers.filter(p => (p.verificationStatus || (p.verified ? 'APPROVED' : 'PENDING')) === status);
        }
        res.json({
            success: true,
            count: providers.length,
            providers: providers.map(p => ({
                userId: p.userId,
                name: p.name,
                email: p.email,
                mobile: p.mobile || p.phone,
                businessName: p.businessName,
                upiId: p.upiId,
                status: p.status,
                verificationStatus: p.verificationStatus || (p.verified ? 'APPROVED' : 'PENDING'),
                verified: !!p.verified,
                createdAt: p.createdAt
            }))
        });
    } catch (err) {
        console.error('Admin get providers error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving providers.' });
    }
});

// 9. APPROVE / REJECT / SUSPEND PROVIDER
router.put('/providers/:id/verify', (req, res) => {
    try {
        const { action, rejectionReason } = req.body; // 'APPROVE' | 'REJECT' | 'SUSPEND'
        const user = (db.data.users || []).find(u => u.userId === req.params.id && u.role === 'PROVIDER');

        if (!user) {
            return res.status(404).json({ success: false, message: 'Host provider account not found.' });
        }

        const prevStatus = user.verificationStatus || (user.verified ? 'APPROVED' : 'PENDING');

        if (action === 'APPROVE') {
            user.verified = true;
            user.verificationStatus = 'APPROVED';
            user.status = 'ACTIVE';
            user.rejectionReason = null;
        } else if (action === 'REJECT') {
            user.verified = false;
            user.verificationStatus = 'REJECTED';
            user.rejectionReason = rejectionReason || 'Failed partner background verification';
        } else if (action === 'SUSPEND') {
            user.status = 'SUSPENDED';
            user.verificationStatus = 'SUSPENDED';
            user.rejectionReason = rejectionReason || 'Account suspended for policy violation';
        } else {
            return res.status(400).json({ success: false, message: "Action must be 'APPROVE', 'REJECT', or 'SUSPEND'." });
        }

        db.save();

        logAuditAction({
            adminId: req.user.userId,
            adminName: req.user.name,
            action: action === 'APPROVE' ? 'PROVIDER_APPROVED' : action === 'REJECT' ? 'PROVIDER_REJECTED' : 'PROVIDER_SUSPENDED',
            targetId: user.userId,
            targetType: 'PROVIDER',
            previousValue: prevStatus,
            newValue: user.verificationStatus,
            reason: rejectionReason || `Admin marked host as ${user.verificationStatus}`
        });

        // Notify provider
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: user.userId,
            role: 'PROVIDER',
            title: action === 'APPROVE' ? '🎉 Host Partner Approved!' : '⚠️ Host Application Update',
            message: action === 'APPROVE'
                ? 'Congratulations! Your TOIGO host account is approved. You can now log in and manage your washrooms.'
                : `Your host application was ${user.verificationStatus.toLowerCase()}. Reason: ${user.rejectionReason}`,
            type: 'SYSTEM',
            read: false,
            createdAt: new Date().toISOString()
        });
        db.save();

        res.json({
            success: true,
            message: `Host provider application ${user.verificationStatus.toLowerCase()} successfully.`,
            provider: {
                userId: user.userId,
                name: user.name,
                verificationStatus: user.verificationStatus,
                status: user.status
            }
        });
    } catch (err) {
        console.error('Verify provider error:', err);
        res.status(500).json({ success: false, message: 'Server error updating provider verification status.' });
    }
});

// 10. GET ALL PAYMENTS (With Filter)
router.get('/payments', (req, res) => {
    try {
        const { status } = req.query; // 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED'
        let list = db.data.payments || [];
        if (status && status !== 'ALL' && status !== 'all') {
            list = list.filter(p => p.status === status.toUpperCase());
        }

        res.json({
            success: true,
            count: list.length,
            payments: list
        });
    } catch (err) {
        console.error('Admin get payments error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving payments.' });
    }
});

module.exports = router;
