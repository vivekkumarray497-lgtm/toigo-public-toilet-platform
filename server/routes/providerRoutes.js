const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// Guard all provider routes with JWT and role check
router.use(authenticateToken, requireRole('PROVIDER', 'ADMIN'));

// Helper: Verify ownership or admin privilege
function checkToiletOwnership(req, res, toiletId) {
    const toilet = (db.data.toilets || []).find(t => t.toiletId === toiletId);
    if (!toilet) {
        res.status(404).json({ success: false, message: 'Toilet facility not found.' });
        return null;
    }
    if (req.user.role !== 'ADMIN' && toilet.providerId !== req.user.userId) {
        res.status(403).json({ success: false, message: 'Forbidden: You do not own or manage this toilet facility.' });
        return null;
    }
    return toilet;
}

// Helper: Record provider activity audit log
function logProviderActivity(providerId, action, toiletId, details = '') {
    if (!db.data.activities) db.data.activities = [];
    db.data.activities.unshift({
        activityId: 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        providerId,
        toiletId,
        action,
        details,
        timestamp: new Date().toISOString()
    });
    // Keep max 200 activity records
    if (db.data.activities.length > 200) db.data.activities.pop();
}

// ================= 1. PROVIDER DASHBOARD METRICS & RECENT ACTIVITY =================
router.get('/dashboard', (req, res) => {
    try {
        const providerId = req.user.userId;
        const provider = (db.data.users || []).find(u => u.userId === providerId) || req.user;

        // ONLY get toilets belonging to currently logged in provider that are not soft-removed
        const myToilets = (db.data.toilets || []).filter(t => t.providerId === providerId && t.status !== 'REMOVED');
        const approvedToilets = myToilets.filter(t => t.status === 'APPROVED');
        const pendingToilets = myToilets.filter(t => t.status === 'PENDING');
        const rejectedToilets = myToilets.filter(t => t.status === 'REJECTED');
        const activeToilets = myToilets.filter(t => t.status === 'APPROVED' && t.availability === 'OPEN' && t.active !== false);
        const closedToilets = myToilets.filter(t => t.availability === 'CLOSED' || t.availability === 'TEMPORARILY_CLOSED');
        const maintenanceToilets = myToilets.filter(t => t.availability === 'UNDER_MAINTENANCE');

        // Legitimate payments for provider's toilets only
        const myToiletIds = myToilets.map(t => t.toiletId);
        const myPayments = (db.data.payments || []).filter(p => (p.providerId === providerId || myToiletIds.includes(p.toiletId)) && p.status === 'SUCCESS');
        const totalEarnings = myPayments.reduce((sum, p) => sum + Math.round((p.amount || 0) * 0.9), 0);
        const totalVisits = myPayments.length;

        // Reports on provider's toilets only
        const myReports = (db.data.reports || []).filter(r => myToiletIds.includes(r.toiletId));
        const activeReports = myReports.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS');

        // Reviews on provider's toilets only
        const myReviews = (db.data.reviews || []).filter(r => myToiletIds.includes(r.toiletId));
        const avgRating = myReviews.length > 0
            ? parseFloat((myReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / myReviews.length).toFixed(1))
            : null;

        const validHygieneToilets = myToilets.filter(t => t.hygieneScore != null && t.hygieneScore > 0);
        const avgHygiene = validHygieneToilets.length > 0
            ? Math.round(validHygieneToilets.reduce((sum, t) => sum + t.hygieneScore, 0) / validHygieneToilets.length)
            : null;

        const activities = (db.data.activities || [])
            .filter(a => a.providerId === providerId)
            .slice(0, 15);

        res.json({
            success: true,
            metrics: {
                totalListings: myToilets.length,
                approvedListings: approvedToilets.length,
                pendingListings: pendingToilets.length,
                rejectedListings: rejectedToilets.length,
                activeListings: activeToilets.length,
                closedListings: closedToilets.length,
                maintenanceListings: maintenanceToilets.length,
                totalEarnings,
                walletBalance: provider.walletBalance || 0,
                totalVisits,
                totalReviews: myReviews.length,
                averageRating: avgRating,
                averageHygieneScore: avgHygiene,
                activeReportsCount: activeReports.length,
                totalReportsCount: myReports.length,
                businessName: provider.businessName || provider.name,
                upiId: provider.upiId ? provider.upiId : 'UPI Not Configured'
            },
            recentActivities: activities
        });
    } catch (err) {
        console.error('Provider dashboard error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving provider metrics.' });
    }
});

// ================= 2. GET MY TOILETS (STRICT ISOLATION: ONLY LOGGED-IN PROVIDER'S OWN TOILETS) =================
router.get('/toilets', (req, res) => {
    try {
        const providerId = req.user.userId;
        const myToilets = (db.data.toilets || [])
            .filter(t => t.providerId === providerId && t.status !== 'REMOVED');

        res.json({
            success: true,
            count: myToilets.length,
            toilets: myToilets
        });
    } catch (err) {
        console.error('Get provider toilets error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving your toilets.' });
    }
});

// ================= 3. GET SINGLE TOILET DETAILS (WITH OWNERSHIP CHECK) =================
router.get('/toilets/:id', (req, res) => {
    try {
        const toilet = checkToiletOwnership(req, res, req.params.id);
        if (!toilet) return;

        const reports = (db.data.reports || []).filter(r => r.toiletId === toilet.toiletId);
        const reviews = (db.data.reviews || []).filter(r => r.toiletId === toilet.toiletId);
        const payments = (db.data.payments || []).filter(p => p.toiletId === toilet.toiletId && p.status === 'SUCCESS');

        res.json({
            success: true,
            toilet,
            reports,
            reviews,
            usageStats: {
                totalVisits: payments.length,
                totalEarnings: payments.reduce((sum, p) => sum + Math.round((p.amount || 0) * 0.9), 0),
                totalReviews: reviews.length,
                totalReports: reports.length
            }
        });
    } catch (err) {
        console.error('Get single toilet error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching toilet details.' });
    }
});

// ================= 4. ADD NEW TOILET (CREATES WITH PENDING STATUS & NO FAKE PHOTO) =================
router.post('/toilets', (req, res) => {
    try {
        const {
            name,
            description = '',
            toiletType = 'Public Toilet',
            customToiletType = '',
            genderType = 'Unisex',
            price = 0,
            isFree = false,
            address,
            landmark = '',
            city = 'New Delhi',
            state = 'Delhi',
            pincode = '110001',
            latitude,
            longitude,
            openingTime = '06:00 AM',
            closingTime = '11:00 PM',
            isOpen24Hours = false,
            weeklySchedule = null,
            commodeType = 'English / Western',
            facilities = [],
            accessibility = [],
            photos = [],
            primaryPhoto = null,
            contactNumber = '',
            emergencyContact = '',
            rules = '',
            cleaningFrequency = 'Twice Daily',
            upiId
        } = req.body;

        if (!name || name.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Please enter a valid restroom name (at least 3 characters).' });
        }
        if (!address || address.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Please provide a complete physical address.' });
        }
        if (latitude === undefined || longitude === undefined || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
            return res.status(400).json({ success: false, message: 'Valid GPS latitude and longitude coordinates are required.' });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({ success: false, message: 'GPS coordinates out of valid geographic range.' });
        }

        const numPrice = parseFloat(price) || 0;
        const finalIsFree = isFree || numPrice === 0;
        const actualPrice = finalIsFree ? 0 : Math.max(0, numPrice);

        // DO NOT use fake/stock images if no photo uploaded
        const realPhotos = Array.isArray(photos) ? photos.filter(p => p && typeof p === 'string' && p.trim().length > 0) : [];

        const newToilet = {
            toiletId: 't-' + Date.now(),
            providerId: req.user.userId,
            providerName: req.user.name,
            name: name.trim(),
            description: description.trim(),
            toiletType: toiletType === 'Other' && customToiletType ? customToiletType.trim() : toiletType,
            genderType,
            commodeType,
            address: address.trim(),
            landmark: landmark.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            latitude: lat,
            longitude: lng,
            location: {
                type: 'Point',
                coordinates: [lng, lat]
            },
            openingTime: isOpen24Hours ? '00:00 AM' : openingTime,
            closingTime: isOpen24Hours ? '11:59 PM' : closingTime,
            isOpen24Hours: !!isOpen24Hours,
            weeklySchedule: weeklySchedule || {
                monday: { open: true, from: openingTime, to: closingTime },
                tuesday: { open: true, from: openingTime, to: closingTime },
                wednesday: { open: true, from: openingTime, to: closingTime },
                thursday: { open: true, from: openingTime, to: closingTime },
                friday: { open: true, from: openingTime, to: closingTime },
                saturday: { open: true, from: openingTime, to: closingTime },
                sunday: { open: true, from: openingTime, to: closingTime }
            },
            facilities: Array.isArray(facilities) ? facilities : [],
            accessibility: Array.isArray(accessibility) ? accessibility : ['Ground Floor Entry'],
            price: actualPrice,
            isFree: finalIsFree,
            pricing: {
                isFree: finalIsFree,
                amount: actualPrice,
                taxRate: 0,
                finalPrice: actualPrice
            },
            photos: realPhotos,
            primaryPhoto: primaryPhoto || (realPhotos.length > 0 ? realPhotos[0] : null),
            contactNumber: contactNumber || req.user.mobile || '',
            emergencyContact: emergencyContact || '',
            rules: rules || 'Please maintain cleanliness. Flush after use. Turn off water tap.',
            cleaningFrequency: cleaningFrequency || 'Twice Daily',
            lastCleanedAt: new Date().toISOString(),
            lastInspectedAt: null,
            hygieneStatus: 'Newly Listed (Admin Inspection Pending)',
            hygieneScore: null,
            cleanlinessScore: null,
            status: req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING',
            availability: 'OPEN',
            closureReason: null,
            expectedReopenAt: null,
            rejectionReason: null,
            pendingUpdates: null,
            active: true,
            rating: null,
            totalReviews: 0,
            upiId: (upiId || req.user.upiId || '').trim() || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!db.data.toilets) db.data.toilets = [];
        db.data.toilets.unshift(newToilet);
        db.save();

        logProviderActivity(req.user.userId, 'TOILET_CREATED', newToilet.toiletId, `Added new restroom "${newToilet.name}" (Status: ${newToilet.status})`);

        // Notify Admin
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now() + '-adm',
            userId: null,
            role: 'ADMIN',
            title: `🆕 New Restroom Submitted for Approval`,
            message: `Host ${req.user.name} listed "${newToilet.name}" at ${newToilet.address}. Status: PENDING_APPROVAL.`,
            type: 'TOILET_SUBMISSION',
            toiletId: newToilet.toiletId,
            read: false,
            createdAt: new Date().toISOString()
        });
        db.save();

        res.status(201).json({
            success: true,
            message: req.user.role === 'ADMIN' ? 'Restroom created and published!' : 'Restroom submitted successfully! Pending admin hygiene verification.',
            toilet: newToilet
        });
    } catch (err) {
        console.error('Add toilet error:', err);
        res.status(500).json({ success: false, message: 'Server error saving restroom facility.' });
    }
});

// ================= 5. EDIT TOILET (STRICT OWNERSHIP & RESUBMISSION TO PENDING IF REJECTED) =================
router.put('/toilets/:id', (req, res) => {
    try {
        const toilet = checkToiletOwnership(req, res, req.params.id);
        if (!toilet) return;

        const {
            name,
            description,
            toiletType,
            genderType,
            commodeType,
            price,
            isFree,
            address,
            landmark,
            city,
            state,
            pincode,
            latitude,
            longitude,
            openingTime,
            closingTime,
            isOpen24Hours,
            weeklySchedule,
            facilities,
            accessibility,
            photos,
            primaryPhoto,
            contactNumber,
            emergencyContact,
            rules,
            cleaningFrequency,
            upiId
        } = req.body;

        if (name && name.trim().length >= 3) toilet.name = name.trim();
        if (description !== undefined) toilet.description = description.trim();
        if (toiletType) toilet.toiletType = toiletType;
        if (genderType) toilet.genderType = genderType;
        if (commodeType) toilet.commodeType = commodeType;
        if (address && address.trim().length >= 5) toilet.address = address.trim();
        if (landmark !== undefined) toilet.landmark = landmark.trim();
        if (city) toilet.city = city.trim();
        if (state) toilet.state = state.trim();
        if (pincode) toilet.pincode = pincode.trim();

        if (latitude !== undefined && longitude !== undefined && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                toilet.latitude = lat;
                toilet.longitude = lng;
                toilet.location = { type: 'Point', coordinates: [lng, lat] };
            }
        }

        if (price !== undefined) {
            const numPrice = parseFloat(price) || 0;
            toilet.price = (isFree || numPrice === 0) ? 0 : Math.max(0, numPrice);
            toilet.isFree = (isFree !== undefined ? !!isFree : toilet.price === 0);
            toilet.pricing = { isFree: toilet.isFree, amount: toilet.price, taxRate: 0, finalPrice: toilet.price };
        }

        if (openingTime) toilet.openingTime = openingTime;
        if (closingTime) toilet.closingTime = closingTime;
        if (isOpen24Hours !== undefined) toilet.isOpen24Hours = !!isOpen24Hours;
        if (weeklySchedule) toilet.weeklySchedule = weeklySchedule;
        if (Array.isArray(facilities)) toilet.facilities = facilities;
        if (Array.isArray(accessibility)) toilet.accessibility = accessibility;
        if (Array.isArray(photos)) {
            toilet.photos = photos.filter(p => p && typeof p === 'string' && p.trim().length > 0);
            toilet.primaryPhoto = primaryPhoto || (toilet.photos.length > 0 ? toilet.photos[0] : null);
        }
        if (contactNumber !== undefined) toilet.contactNumber = contactNumber;
        if (emergencyContact !== undefined) toilet.emergencyContact = emergencyContact;
        if (rules !== undefined) toilet.rules = rules;
        if (cleaningFrequency) toilet.cleaningFrequency = cleaningFrequency;
        if (upiId !== undefined) toilet.upiId = upiId ? upiId.trim() : null;

        // If toilet was previously REJECTED, resubmitting turns status back to PENDING for admin review
        let wasRejected = false;
        if (toilet.status === 'REJECTED') {
            toilet.status = 'PENDING';
            toilet.rejectionReason = null;
            wasRejected = true;
        }

        toilet.updatedAt = new Date().toISOString();
        db.save();

        const actionType = wasRejected ? 'TOILET_RESUBMITTED' : 'TOILET_EDITED';
        logProviderActivity(req.user.userId, actionType, toilet.toiletId, `Updated details for "${toilet.name}" ${wasRejected ? '(Resubmitted for Admin Approval)' : ''}`);

        if (wasRejected) {
            if (!db.data.notifications) db.data.notifications = [];
            db.data.notifications.unshift({
                notificationId: 'notif-' + Date.now() + '-adm',
                userId: null,
                role: 'ADMIN',
                title: `🔄 Rejected Restroom Edited & Resubmitted`,
                message: `Host ${req.user.name} corrected and resubmitted "${toilet.name}" for verification.`,
                type: 'TOILET_SUBMISSION',
                toiletId: toilet.toiletId,
                read: false,
                createdAt: new Date().toISOString()
            });
            db.save();
        }

        res.json({
            success: true,
            message: wasRejected
                ? 'Toilet details updated and resubmitted for admin verification!'
                : 'Toilet details updated successfully!',
            toilet
        });
    } catch (err) {
        console.error('Edit toilet error:', err);
        res.status(500).json({ success: false, message: 'Server error updating toilet.' });
    }
});

// ================= 6. MANAGE STATUS (OPEN, CLOSED, TEMPORARILY_CLOSED, UNDER_MAINTENANCE) =================
router.patch('/toilets/:id/status', (req, res) => {
    try {
        const toilet = checkToiletOwnership(req, res, req.params.id);
        if (!toilet) return;

        const { availability, closureReason, expectedReopenAt } = req.body;
        const validStatuses = ['OPEN', 'CLOSED', 'TEMPORARILY_CLOSED', 'UNDER_MAINTENANCE'];

        if (!validStatuses.includes(availability)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        toilet.availability = availability;
        if (availability === 'OPEN') {
            toilet.closureReason = null;
            toilet.expectedReopenAt = null;
        } else {
            toilet.closureReason = closureReason ? closureReason.trim() : null;
            toilet.expectedReopenAt = expectedReopenAt || null;
        }
        toilet.updatedAt = new Date().toISOString();
        db.save();

        logProviderActivity(req.user.userId, 'STATUS_CHANGED', toilet.toiletId, `Changed status of "${toilet.name}" to ${availability} (${closureReason || 'No reason provided'})`);

        res.json({
            success: true,
            message: `Restroom availability updated to ${availability.replace('_', ' ')}!`,
            toilet
        });
    } catch (err) {
        console.error('Update toilet status error:', err);
        res.status(500).json({ success: false, message: 'Server error updating status.' });
    }
});

// ================= 7. REOPEN TOILET =================
router.post('/toilets/:id/reopen', (req, res) => {
    try {
        const toilet = checkToiletOwnership(req, res, req.params.id);
        if (!toilet) return;

        toilet.availability = 'OPEN';
        toilet.closureReason = null;
        toilet.expectedReopenAt = null;
        toilet.updatedAt = new Date().toISOString();
        db.save();

        logProviderActivity(req.user.userId, 'TOILET_REOPENED', toilet.toiletId, `Reopened restroom "${toilet.name}" to public`);

        res.json({
            success: true,
            message: `Restroom "${toilet.name}" is now OPEN for public use!`,
            toilet
        });
    } catch (err) {
        console.error('Reopen toilet error:', err);
        res.status(500).json({ success: false, message: 'Server error reopening restroom.' });
    }
});

// ================= 8. SOFT REMOVE TOILET (PRESERVES HISTORICAL AUDIT & REVIEWS) =================
router.delete('/toilets/:id', (req, res) => {
    try {
        const toilet = checkToiletOwnership(req, res, req.params.id);
        if (!toilet) return;

        // Soft deletion: marks REMOVED, active: false, availability: CLOSED
        toilet.status = 'REMOVED';
        toilet.active = false;
        toilet.availability = 'CLOSED';
        toilet.updatedAt = new Date().toISOString();
        db.save();

        logProviderActivity(req.user.userId, 'TOILET_REMOVED', toilet.toiletId, `Soft removed restroom "${toilet.name}" from active listings`);

        res.json({
            success: true,
            message: `Restroom "${toilet.name}" has been removed from active listings.`
        });
    } catch (err) {
        console.error('Remove toilet error:', err);
        res.status(500).json({ success: false, message: 'Server error removing restroom.' });
    }
});

// ================= 9. PROVIDER REPORT MANAGEMENT (OWN TOILETS ONLY) =================
router.get('/reports', (req, res) => {
    try {
        const providerId = req.user.userId;
        const myToiletIds = (db.data.toilets || [])
            .filter(t => t.providerId === providerId)
            .map(t => t.toiletId);

        const reports = (db.data.reports || []).filter(r => myToiletIds.includes(r.toiletId));
        res.json({ success: true, count: reports.length, reports });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching reports.' });
    }
});

router.patch('/reports/:reportId', (req, res) => {
    try {
        const { reportId } = req.params;
        const { status, providerResponse } = req.body;

        const report = (db.data.reports || []).find(r => r.reportId === reportId);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        // Ownership check
        const toilet = (db.data.toilets || []).find(t => t.toiletId === report.toiletId);
        if (req.user.role !== 'ADMIN' && (!toilet || toilet.providerId !== req.user.userId)) {
            return res.status(403).json({ success: false, message: 'Forbidden: You do not own the reported facility.' });
        }

        const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
        if (status && validStatuses.includes(status)) {
            report.status = status;
        }
        if (providerResponse !== undefined) {
            report.providerResponse = providerResponse ? providerResponse.trim() : '';
            report.providerRespondedAt = new Date().toISOString();
        }
        report.updatedAt = new Date().toISOString();
        db.save();

        logProviderActivity(req.user.userId, 'REPORT_RESPONDED', report.toiletId, `Responded to report #${report.reportId} (Status: ${report.status})`);

        res.json({
            success: true,
            message: 'Report status and response updated!',
            report
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error updating report.' });
    }
});

// ================= 10. PROVIDER REVIEW MANAGEMENT & RESPONSE =================
router.get('/reviews', (req, res) => {
    try {
        const providerId = req.user.userId;
        const myToiletIds = (db.data.toilets || [])
            .filter(t => t.providerId === providerId)
            .map(t => t.toiletId);

        const reviews = (db.data.reviews || []).filter(r => myToiletIds.includes(r.toiletId));
        res.json({ success: true, count: reviews.length, reviews });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching reviews.' });
    }
});

router.post('/toilets/:id/reviews/:reviewId/response', (req, res) => {
    try {
        const toilet = checkToiletOwnership(req, res, req.params.id);
        if (!toilet) return;

        const { reviewId } = req.params;
        const { response } = req.body;

        if (!response || response.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Please enter a valid response.' });
        }

        const review = (db.data.reviews || []).find(r => r.reviewId === reviewId && r.toiletId === toilet.toiletId);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found for this facility.' });
        }

        review.providerResponse = response.trim();
        review.providerRespondedAt = new Date().toISOString();
        db.save();

        logProviderActivity(req.user.userId, 'REVIEW_REPLY', toilet.toiletId, `Replied to review by ${review.userName}`);

        res.json({
            success: true,
            message: 'Response posted successfully to review!',
            review
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error responding to review.' });
    }
});

// ================= 11. HYGIENE & MAINTENANCE LOGGING =================
router.post('/toilets/:id/maintenance', (req, res) => {
    try {
        const toilet = checkToiletOwnership(req, res, req.params.id);
        if (!toilet) return;

        const { waterChecked = true, soapChecked = true, notes = '' } = req.body;

        toilet.lastCleanedAt = new Date().toISOString();
        toilet.lastInspectedAt = new Date().toISOString();
        toilet.hygieneStatus = `Inspected Clean by Host on ${new Date().toLocaleDateString()}`;
        toilet.updatedAt = new Date().toISOString();

        if (!toilet.maintenanceLogs) toilet.maintenanceLogs = [];
        toilet.maintenanceLogs.unshift({
            logId: 'maint-' + Date.now(),
            performedBy: req.user.name,
            timestamp: new Date().toISOString(),
            waterChecked: Boolean(waterChecked),
            soapChecked: Boolean(soapChecked),
            notes: notes ? notes.trim() : ''
        });

        db.save();

        logProviderActivity(req.user.userId, 'MAINTENANCE_LOG', toilet.toiletId, `Logged cleaning & maintenance check for "${toilet.name}"`);

        res.json({
            success: true,
            message: 'Cleaning and hygiene check recorded successfully!',
            lastCleanedAt: toilet.lastCleanedAt
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error logging maintenance.' });
    }
});

// ================= 12. PROVIDER ACTIVITY HISTORY =================
router.get('/activity', (req, res) => {
    try {
        const providerId = req.user.userId;
        const activities = (db.data.activities || []).filter(a => a.providerId === providerId);
        res.json({ success: true, count: activities.length, activities });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error retrieving activities.' });
    }
});

// ================= 13. WITHDRAWAL REQUEST & PAYOUT LEDGER =================
router.post('/withdraw', (req, res) => {
    try {
        const { amount, upiId } = req.body;
        const withdrawAmt = parseFloat(amount);
        const provider = (db.data.users || []).find(u => u.userId === req.user.userId);

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found.' });
        }

        if (isNaN(withdrawAmt) || withdrawAmt <= 0) {
            return res.status(400).json({ success: false, message: 'Please enter a valid withdrawal amount.' });
        }

        const balance = provider.walletBalance || 0;
        if (withdrawAmt > balance) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Available to withdraw: ₹${balance}`
            });
        }

        provider.walletBalance = balance - withdrawAmt;

        // Record PENDING Payout in Ledger
        const payoutRecord = {
            payoutId: 'payout-' + Date.now(),
            providerId: provider.userId,
            providerName: provider.name,
            businessName: provider.businessName,
            amount: withdrawAmt,
            upiId: upiId || provider.upiId || 'registered UPI',
            bankAccountNo: provider.bankAccountNo || null,
            bankIfsc: provider.bankIfsc || null,
            status: 'PENDING', // Lifecycle: PENDING -> PROCESSING -> COMPLETED / FAILED
            requestedAt: new Date().toISOString(),
            processedAt: null,
            transactionReference: null
        };

        if (!db.data.payouts) db.data.payouts = [];
        db.data.payouts.unshift(payoutRecord);
        db.save();

        logProviderActivity(req.user.userId, 'WITHDRAWAL_REQUEST', null, `Requested payout of ₹${withdrawAmt} to ${payoutRecord.upiId}`);

        // Notification for Provider
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: provider.userId,
            title: '💸 Payout Request Submitted',
            message: `Withdrawal of ₹${withdrawAmt} initiated to ${payoutRecord.upiId}. Processing status: PENDING.`,
            type: 'PAYMENT',
            read: false,
            createdAt: new Date().toISOString()
        });

        // Notification for Admin
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now() + '-adm',
            userId: null,
            role: 'ADMIN',
            title: `Host Payout Request: ₹${withdrawAmt}`,
            message: `Host ${provider.name} (${provider.businessName || 'Sanitation Partner'}) requested payout of ₹${withdrawAmt} to ${payoutRecord.upiId}`,
            type: 'PAYMENT',
            read: false,
            createdAt: new Date().toISOString()
        });
        db.save();

        res.json({
            success: true,
            message: `Payout of ₹${withdrawAmt} successfully initiated! Payout status: PENDING. Remaining wallet balance: ₹${provider.walletBalance}`,
            payout: payoutRecord,
            remainingBalance: provider.walletBalance
        });
    } catch (err) {
        console.error('Withdraw error:', err);
        res.status(500).json({ success: false, message: 'Server error processing withdrawal.' });
    }
});

// ================= 13B. GET PROVIDER PAYOUTS HISTORY =================
router.get('/payouts', (req, res) => {
    try {
        const providerId = req.user.userId;
        const payouts = (db.data.payouts || []).filter(p => req.user.role === 'ADMIN' || p.providerId === providerId);
        res.json({
            success: true,
            count: payouts.length,
            payouts
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error retrieving payouts.' });
    }
});

// ================= 14. PROVIDER PROFILE UPDATE =================
router.put('/profile', (req, res) => {
    try {
        const { businessName, phone, mobile, upiId, bankAccountNo, bankIfsc, bankName, name, profileImage } = req.body;
        const provider = (db.data.users || []).find(u => u.userId === req.user.userId);
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found.' });
        }

        if (name && name.trim().length >= 2) provider.name = name.trim();
        if (businessName !== undefined) provider.businessName = businessName ? businessName.trim() : null;
        if (phone !== undefined) provider.phone = phone ? phone.trim() : null;
        if (mobile !== undefined) provider.mobile = mobile ? mobile.trim() : null;
        if (upiId !== undefined) provider.upiId = upiId ? upiId.trim() : null;
        if (bankAccountNo !== undefined) provider.bankAccountNo = bankAccountNo ? bankAccountNo.trim() : null;
        if (bankIfsc !== undefined) provider.bankIfsc = bankIfsc ? bankIfsc.trim() : null;
        if (bankName !== undefined) provider.bankName = bankName ? bankName.trim() : null;
        if (profileImage !== undefined) provider.profileImage = profileImage;

        db.save();

        logProviderActivity(req.user.userId, 'PROFILE_UPDATED', null, 'Updated business and payout information');

        res.json({
            success: true,
            message: 'Provider profile updated successfully.',
            provider: {
                userId: provider.userId,
                name: provider.name,
                email: provider.email,
                businessName: provider.businessName,
                phone: provider.phone,
                mobile: provider.mobile,
                upiId: provider.upiId,
                profileImage: provider.profileImage,
                role: provider.role,
                verified: provider.verified,
                walletBalance: provider.walletBalance || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error updating provider profile.' });
    }
});

module.exports = router;
