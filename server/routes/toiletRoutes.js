const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// Haversine distance in Kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
}

// Calculate Dynamic Weighted Hygiene Score
function calculateHygieneScore(toilet) {
    const reviews = (db.data.reviews || []).filter(r => r.toiletId === toilet.toiletId);
    const openReports = (db.data.reports || []).filter(r => r.toiletId === toilet.toiletId && (r.status === 'OPEN' || r.status === 'IN_PROGRESS'));

    if (reviews.length === 0 && (toilet.hygieneScore === null || toilet.hygieneScore === undefined) && !toilet.lastInspectedAt) {
        return null;
    }

    let baseScore = toilet.hygieneScore != null ? toilet.hygieneScore : 80;

    if (reviews.length > 0) {
        // Compute average review cleanliness
        let totalCleanliness = 0;
        let waterCount = 0;
        let soapCount = 0;

        reviews.forEach(rev => {
            const cleanScore = (rev.cleanlinessRating || rev.rating || 3) * 20; // 1-5 -> 20-100
            totalCleanliness += cleanScore;
            if (rev.waterAvailable !== false) waterCount++;
            if (rev.soapAvailable !== false) soapCount++;
        });

        const avgCleanliness = totalCleanliness / reviews.length;
        const waterScore = (waterCount / reviews.length) * 100;
        const soapScore = (soapCount / reviews.length) * 100;

        baseScore = (avgCleanliness * 0.5) + (waterScore * 0.25) + (soapScore * 0.25);
    }

    // Penalize for open reports
    openReports.forEach(rep => {
        if (rep.priority === 'CRITICAL') baseScore -= 20;
        else if (rep.priority === 'HIGH') baseScore -= 12;
        else baseScore -= 6;
    });

    // Check inspection recency bonus
    if (toilet.lastInspectedAt) {
        const diffDays = (new Date() - new Date(toilet.lastInspectedAt)) / (1000 * 60 * 60 * 24);
        if (diffDays <= 7) {
            baseScore = Math.min(100, baseScore + 3);
        }
    }

    const finalScore = Math.max(30, Math.min(100, Math.round(baseScore)));
    return finalScore;
}

// 1. GET ALL TOILETS (With Filters, Distance & Sorting)
router.get('/', optionalAuth, (req, res) => {
    try {
        const {
            query,
            lat,
            lng,
            isFree,
            maxPrice,
            commodeType,
            genderType,
            wheelchair,
            water,
            soap,
            babyChanging,
            openNow,
            sort = 'nearest',
            all = 'false' // For admin
        } = req.query;

        const userLat = lat ? parseFloat(lat) : null;
        const userLng = lng ? parseFloat(lng) : null;

        let toilets = [...db.data.toilets];

        // If not admin requesting 'all', show only APPROVED and active toilets to users
        const isAdminRequest = all === 'true' && req.user && req.user.role === 'ADMIN';
        if (!isAdminRequest) {
            toilets = toilets.filter(t => t.status === 'APPROVED' && t.active !== false);
        }

        // Apply Search Query
        if (query && query.trim()) {
            const q = query.trim().toLowerCase();
            toilets = toilets.filter(t =>
                (t.name && t.name.toLowerCase().includes(q)) ||
                (t.address && t.address.toLowerCase().includes(q)) ||
                (t.description && t.description.toLowerCase().includes(q))
            );
        }

        // Filter: Free / Paid
        if (isFree !== undefined) {
            const freeBool = isFree === 'true';
            toilets = toilets.filter(t => (t.isFree === freeBool) || (freeBool ? t.price === 0 : t.price > 0));
        }

        // Filter: Max Price
        if (maxPrice) {
            const maxP = parseFloat(maxPrice);
            if (!isNaN(maxP)) {
                toilets = toilets.filter(t => t.price <= maxP);
            }
        }

        // Filter: Commode Type
        if (commodeType && commodeType !== 'all') {
            toilets = toilets.filter(t => t.commodeType && t.commodeType.toLowerCase().includes(commodeType.toLowerCase()));
        }

        // Filter: Gender Type
        if (genderType && genderType !== 'all') {
            toilets = toilets.filter(t => t.genderType && t.genderType.toLowerCase().includes(genderType.toLowerCase()));
        }

        // Filter: Wheelchair Accessible
        if (wheelchair === 'true') {
            toilets = toilets.filter(t =>
                (t.accessibility && t.accessibility.toLowerCase().includes('wheelchair')) ||
                (t.facilities && t.facilities.some(f => f.toLowerCase().includes('wheelchair')))
            );
        }

        // Filter: Water Available
        if (water === 'true') {
            toilets = toilets.filter(t =>
                t.facilities && t.facilities.some(f => f.toLowerCase().includes('water'))
            );
        }

        // Filter: Soap Available
        if (soap === 'true') {
            toilets = toilets.filter(t =>
                t.facilities && t.facilities.some(f => f.toLowerCase().includes('soap'))
            );
        }

        // Filter: Baby Changing
        if (babyChanging === 'true') {
            toilets = toilets.filter(t =>
                t.facilities && t.facilities.some(f => f.toLowerCase().includes('baby'))
            );
        }

        // Filter: Open Now
        if (openNow === 'true') {
            toilets = toilets.filter(t => t.availability === 'OPEN' || !t.availability);
        }

        // Attach computed properties: Distance & Dynamic Hygiene Score
        const enriched = toilets.map(t => {
            const distKm = (userLat && userLng) ? calculateDistance(userLat, userLng, t.latitude, t.longitude) : 0;
            const calculatedHygiene = calculateHygieneScore(t);
            const openReport = db.data.reports.find(r => r.toiletId === t.toiletId && r.status === 'OPEN');

            return {
                ...t,
                distanceKm: distKm,
                hygieneScore: calculatedHygiene,
                cleanlinessScore: `${calculatedHygiene}%`,
                lastReportedIssue: openReport ? openReport.category : t.lastReportedIssue || null
            };
        });

        // Sorting
        if (sort === 'nearest' && userLat && userLng) {
            enriched.sort((a, b) => a.distanceKm - b.distanceKm);
        } else if (sort === 'rating') {
            enriched.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sort === 'hygiene') {
            enriched.sort((a, b) => b.hygieneScore - a.hygieneScore);
        } else if (sort === 'price_asc') {
            enriched.sort((a, b) => a.price - b.price);
        }

        res.json({
            success: true,
            total: enriched.length,
            toilets: enriched
        });
    } catch (err) {
        console.error('Fetch toilets error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving toilets.' });
    }
});

// 2. GET NEARBY TOILETS (SOS or Radius View)
router.get('/nearby', (req, res) => {
    try {
        const { lat, lng, radiusKm = 10 } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude are required for nearby search.' });
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        const radius = parseFloat(radiusKm);

        const approved = db.data.toilets.filter(t => t.status === 'APPROVED' && t.active !== false);

        const nearby = approved
            .map(t => {
                const dist = calculateDistance(userLat, userLng, t.latitude, t.longitude);
                const calculatedHygiene = calculateHygieneScore(t);
                return {
                    ...t,
                    distanceKm: dist,
                    hygieneScore: calculatedHygiene,
                    cleanlinessScore: `${calculatedHygiene}%`
                };
            })
            .filter(t => t.distanceKm <= radius)
            .sort((a, b) => a.distanceKm - b.distanceKm);

        res.json({
            success: true,
            count: nearby.length,
            toilets: nearby
        });
    } catch (err) {
        console.error('Nearby toilets error:', err);
        res.status(500).json({ success: false, message: 'Server error finding nearby toilets.' });
    }
});

// 3. GET TOILET DETAILS BY ID
router.get('/:id', optionalAuth, (req, res) => {
    try {
        const toilet = db.data.toilets.find(t => t.toiletId === req.params.id);
        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet not found.' });
        }

        // Hide pending/rejected from normal users unless owner or admin
        const isOwner = req.user && req.user.userId === toilet.providerId;
        const isAdmin = req.user && req.user.role === 'ADMIN';

        if (toilet.status !== 'APPROVED' && !isOwner && !isAdmin) {
            return res.status(404).json({ success: false, message: 'Toilet is currently under review or unavailable.' });
        }

        const reviews = db.data.reviews.filter(r => r.toiletId === toilet.toiletId);
        const computedHygiene = calculateHygieneScore(toilet);

        res.json({
            success: true,
            toilet: {
                ...toilet,
                hygieneScore: computedHygiene,
                cleanlinessScore: `${computedHygiene}%`,
                reviews
            }
        });
    } catch (err) {
        console.error('Get toilet details error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving toilet details.' });
    }
});

// 4. CREATE TOILET LISTING (Provider or Admin)
router.post('/', authenticateToken, requireRole('PROVIDER', 'ADMIN'), (req, res) => {
    try {
        const {
            name,
            description,
            address,
            latitude,
            longitude,
            openingTime = '06:00 AM',
            closingTime = '11:00 PM',
            commodeType = 'English / Western',
            genderType = 'Unisex',
            facilities = [],
            accessibility = 'Ground Floor Entry',
            price = 0,
            isFree = false,
            photos = [],
            upiId
        } = req.body;

        if (!name || name.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Please provide a valid toilet facility name.' });
        }
        if (!address || address.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Please provide a complete physical address.' });
        }
        if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ success: false, message: 'Valid GPS coordinates (latitude & longitude) are required.' });
        }

        const numPrice = parseFloat(price) || 0;
        const isActuallyFree = isFree || numPrice === 0;
        const isAdmin = req.user.role === 'ADMIN';
        const realPhotos = Array.isArray(photos) ? photos.filter(p => p && typeof p === 'string' && p.trim().length > 0) : [];

        const newToilet = {
            toiletId: 't-' + Date.now(),
            providerId: req.user.userId,
            providerName: req.user.name,
            name: name.trim(),
            description: description ? description.trim() : '',
            address: address.trim(),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            openingTime,
            closingTime,
            commodeType,
            genderType,
            facilities: Array.isArray(facilities) ? facilities : [],
            accessibility: accessibility || 'Standard Entry',
            hygieneStatus: 'Newly Listed (Hygiene Inspection Pending)',
            hygieneScore: null,
            cleanlinessScore: null,
            lastInspectedAt: isAdmin ? new Date().toISOString() : null,
            lastReportedIssue: null,
            price: isActuallyFree ? 0 : numPrice,
            isFree: isActuallyFree,
            photos: realPhotos,
            primaryPhoto: realPhotos.length > 0 ? realPhotos[0] : null,
            status: isAdmin ? 'APPROVED' : 'PENDING', // Auto-approve if created by Admin, else PENDING
            availability: 'OPEN',
            rejectionReason: null,
            active: true,
            rating: null,
            totalReviews: 0,
            upiId: (upiId || req.user.upiId || '').trim() || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        db.data.toilets.unshift(newToilet);
        db.save();

        if (isAdmin) {
            logAuditAction({
                adminId: req.user.userId,
                adminName: req.user.name,
                action: 'TOILET_CREATED',
                targetId: newToilet.toiletId,
                targetType: 'TOILET',
                newValue: newToilet.name,
                reason: 'Admin added direct listing'
            });
        }

        res.status(201).json({
            success: true,
            message: isAdmin ? 'Toilet listed and approved!' : 'Toilet submitted! Pending admin hygiene verification.',
            toilet: newToilet
        });
    } catch (err) {
        console.error('Create toilet error:', err);
        res.status(500).json({ success: false, message: 'Server error listing toilet.' });
    }
});

// 5. UPDATE TOILET DETAILS (Owner Provider or Admin)
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const toilet = db.data.toilets.find(t => t.toiletId === req.params.id);
        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet not found.' });
        }

        const isOwner = req.user.userId === toilet.providerId;
        const isAdmin = req.user.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to edit this toilet facility.' });
        }

        const {
            name,
            description,
            address,
            latitude,
            longitude,
            openingTime,
            closingTime,
            commodeType,
            genderType,
            facilities,
            accessibility,
            price,
            isFree,
            photos,
            primaryPhoto,
            upiId,
            active
        } = req.body;

        if (name && name.trim().length >= 3) toilet.name = name.trim();
        if (description !== undefined) toilet.description = description.trim();
        if (address && address.trim().length >= 5) toilet.address = address.trim();
        if (latitude !== undefined && longitude !== undefined && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
            toilet.latitude = parseFloat(latitude);
            toilet.longitude = parseFloat(longitude);
            toilet.location = { type: 'Point', coordinates: [toilet.longitude, toilet.latitude] };
        }
        if (openingTime) toilet.openingTime = openingTime;
        if (closingTime) toilet.closingTime = closingTime;
        if (commodeType) toilet.commodeType = commodeType;
        if (genderType) toilet.genderType = genderType;
        if (Array.isArray(facilities)) toilet.facilities = facilities;
        if (accessibility) toilet.accessibility = accessibility;
        if (price !== undefined) {
            const numPrice = parseFloat(price) || 0;
            toilet.price = (isFree || numPrice === 0) ? 0 : Math.max(0, numPrice);
            toilet.isFree = (isFree !== undefined ? !!isFree : toilet.price === 0);
        }
        if (Array.isArray(photos)) {
            toilet.photos = photos.filter(p => p && typeof p === 'string' && p.trim().length > 0);
            toilet.primaryPhoto = primaryPhoto || (toilet.photos.length > 0 ? toilet.photos[0] : null);
        }
        if (upiId !== undefined) toilet.upiId = upiId ? upiId.trim() : null;
        if (active !== undefined && isAdmin) toilet.active = Boolean(active);

        // If previously REJECTED, resubmitting sets status back to PENDING for admin review
        if (toilet.status === 'REJECTED') {
            toilet.status = 'PENDING';
            toilet.rejectionReason = null;
        }

        toilet.updatedAt = new Date().toISOString();
        db.save();

        res.json({
            success: true,
            message: 'Toilet updated successfully.',
            toilet
        });
    } catch (err) {
        console.error('Update toilet error:', err);
        res.status(500).json({ success: false, message: 'Server error updating toilet.' });
    }
});

// 6. TOGGLE AVAILABILITY STATUS (OPEN, CLOSED, TEMPORARILY_CLOSED, UNDER_MAINTENANCE)
router.put('/:id/status', authenticateToken, (req, res) => {
    try {
        const { availability, reason, expectedReopenAt } = req.body;
        const validStatuses = ['OPEN', 'CLOSED', 'TEMPORARILY_CLOSED', 'UNDER_MAINTENANCE'];
        if (!validStatuses.includes(availability)) {
            return res.status(400).json({ success: false, message: `Invalid status. Valid values: ${validStatuses.join(', ')}` });
        }

        const toilet = db.data.toilets.find(t => t.toiletId === req.params.id);
        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet not found.' });
        }

        const isOwner = req.user.userId === toilet.providerId;
        const isAdmin = req.user.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: Unauthorized.' });
        }

        const prev = toilet.availability;
        toilet.availability = availability;
        if (availability === 'OPEN') {
            toilet.closureReason = null;
            toilet.expectedReopenAt = null;
        } else {
            toilet.closureReason = reason || null;
            toilet.expectedReopenAt = expectedReopenAt || null;
        }
        toilet.updatedAt = new Date().toISOString();
        db.save();

        if (isAdmin) {
            logAuditAction({
                adminId: req.user.userId,
                adminName: req.user.name,
                action: 'TOILET_STATUS_CHANGED',
                targetId: toilet.toiletId,
                targetType: 'TOILET',
                previousValue: prev,
                newValue: availability,
                reason: reason || 'Status updated'
            });
        }

        res.json({
            success: true,
            message: `Toilet availability status set to ${availability}.`,
            availability: toilet.availability
        });
    } catch (err) {
        console.error('Status change error:', err);
        res.status(500).json({ success: false, message: 'Server error updating status.' });
    }
});

// 7. SOFT DELETE TOILET (PRESERVES HISTORICAL AUDIT & REVIEWS)
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const toilet = db.data.toilets.find(t => t.toiletId === req.params.id);
        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet not found.' });
        }

        const isOwner = req.user.userId === toilet.providerId;
        const isAdmin = req.user.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: Unauthorized to delete this toilet.' });
        }

        // Soft deletion
        toilet.status = 'REMOVED';
        toilet.active = false;
        toilet.availability = 'CLOSED';
        toilet.updatedAt = new Date().toISOString();
        db.save();

        if (isAdmin) {
            logAuditAction({
                adminId: req.user.userId,
                adminName: req.user.name,
                action: 'TOILET_DELETED',
                targetId: toilet.toiletId,
                targetType: 'TOILET',
                previousValue: toilet.name,
                newValue: 'REMOVED',
                reason: req.body.reason || 'Admin deleted toilet'
            });
        }

        res.json({ success: true, message: 'Toilet listing removed successfully.' });
    } catch (err) {
        console.error('Delete toilet error:', err);
        res.status(500).json({ success: false, message: 'Server error deleting toilet.' });
    }
});

module.exports = router;
