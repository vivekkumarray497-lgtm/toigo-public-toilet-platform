const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

const VALID_CATEGORIES = [
    'Dirty Toilet',
    'No Water',
    'No Soap',
    'Broken Door',
    'Broken Toilet',
    'Bad Smell',
    'Unsafe Condition',
    'Closed Toilet',
    'Wrong Location',
    'Accessibility Problem',
    'Other'
];

// 1. SUBMIT A REPORT
router.post('/', authenticateToken, (req, res) => {
    try {
        const { toiletId, category, priority = 'MEDIUM', description, photo, latitude, longitude } = req.body;

        if (!toiletId) {
            return res.status(400).json({ success: false, message: 'Toilet ID is required.' });
        }
        if (!description || description.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Please provide a clear description of the issue (at least 5 characters).' });
        }

        const validCat = VALID_CATEGORIES.includes(category) ? category : 'Other';
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const validPrio = validPriorities.includes(priority) ? priority : 'MEDIUM';

        const toilet = db.data.toilets.find(t => t.toiletId === toiletId);
        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet not found.' });
        }

        const newReport = {
            reportId: 'rep-' + Date.now(),
            userId: req.user.userId,
            userName: req.user.name,
            toiletId: toilet.toiletId,
            toiletName: toilet.name,
            providerId: toilet.providerId,
            category: validCat,
            priority: validPrio,
            description: description.trim(),
            photo: photo || null,
            location: latitude && longitude ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : null,
            status: 'OPEN',
            adminResponse: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!db.data.reports) db.data.reports = [];
        db.data.reports.unshift(newReport);

        // Update toilet lastReportedIssue
        toilet.lastReportedIssue = `${validCat} (${validPrio})`;
        db.save();

        // Create notification for Provider & Admin
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: toilet.providerId,
            role: 'PROVIDER',
            title: `🚩 New Issue Reported: ${validCat}`,
            message: `A visitor reported an issue at ${toilet.name}: "${description.trim()}"`,
            type: 'REPORT',
            read: false,
            createdAt: new Date().toISOString()
        });
        db.save();

        res.status(201).json({
            success: true,
            message: 'Issue reported successfully! Our team and the host will address it promptly.',
            report: newReport
        });
    } catch (err) {
        console.error('Submit report error:', err);
        res.status(500).json({ success: false, message: 'Server error submitting report.' });
    }
});

// 2. GET CURRENT USER'S REPORTS
router.get('/my', authenticateToken, (req, res) => {
    try {
        const myReports = (db.data.reports || []).filter(r => r.userId === req.user.userId);
        res.json({
            success: true,
            count: myReports.length,
            reports: myReports
        });
    } catch (err) {
        console.error('Get my reports error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching your reports.' });
    }
});

// 3. GET REPORTS FOR LOGGED-IN PROVIDER'S TOILETS
router.get('/provider', authenticateToken, requireRole('PROVIDER', 'ADMIN'), (req, res) => {
    try {
        const providerReports = (db.data.reports || []).filter(r => r.providerId === req.user.userId);
        res.json({
            success: true,
            count: providerReports.length,
            reports: providerReports
        });
    } catch (err) {
        console.error('Get provider reports error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching provider reports.' });
    }
});

// 4. GET ALL REPORTS (Admin)
router.get('/', authenticateToken, requireRole('ADMIN'), (req, res) => {
    try {
        const { status, priority, toiletId } = req.query;
        let reports = db.data.reports || [];

        if (status) {
            reports = reports.filter(r => r.status === status);
        }
        if (priority) {
            reports = reports.filter(r => r.priority === priority);
        }
        if (toiletId) {
            reports = reports.filter(r => r.toiletId === toiletId);
        }

        res.json({
            success: true,
            count: reports.length,
            reports
        });
    } catch (err) {
        console.error('Get admin reports error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching reports.' });
    }
});

// 5. UPDATE REPORT STATUS & ADMIN RESPONSE (Admin or Provider)
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const { status, adminResponse, priority } = req.body;
        const report = (db.data.reports || []).find(r => r.reportId === req.params.id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        const isOwner = req.user.userId === report.providerId;
        const isAdmin = req.user.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Unauthorized to update this report.' });
        }

        const prevStatus = report.status;
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
        if (status && validStatuses.includes(status)) {
            report.status = status;
        }

        if (adminResponse !== undefined) {
            report.adminResponse = adminResponse.trim();
        }

        if (priority && isAdmin) {
            report.priority = priority;
        }

        report.updatedAt = new Date().toISOString();
        db.save();

        if (isAdmin) {
            logAuditAction({
                adminId: req.user.userId,
                adminName: req.user.name,
                action: 'REPORT_STATUS_CHANGED',
                targetId: report.reportId,
                targetType: 'REPORT',
                previousValue: prevStatus,
                newValue: report.status,
                reason: adminResponse || `Status changed from ${prevStatus} to ${report.status}`
            });
        }

        // Notify reporting citizen
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: report.userId,
            title: `Report Status: ${report.status}`,
            message: `Your report for ${report.toiletName} is now ${report.status}. ${adminResponse ? 'Response: ' + adminResponse : ''}`,
            type: 'REPORT',
            read: false,
            createdAt: new Date().toISOString()
        });
        db.save();

        res.json({
            success: true,
            message: 'Report updated successfully.',
            report
        });
    } catch (err) {
        console.error('Update report error:', err);
        res.status(500).json({ success: false, message: 'Server error updating report.' });
    }
});

module.exports = router;
