const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// 1. SUBMIT REVIEW (Only authenticated users with verified visits or valid sessions)
router.post('/', authenticateToken, (req, res) => {
    try {
        const {
            toiletId,
            rating = 5,
            cleanlinessRating = 5,
            waterAvailable = true,
            soapAvailable = true,
            maintenanceRating = 5,
            accessibilityRating = 5,
            comment = '',
            photos = [],
            hygieneTag
        } = req.body;

        if (!toiletId) {
            return res.status(400).json({ success: false, message: 'Toilet ID is required.' });
        }

        const numRating = Math.max(1, Math.min(5, parseInt(rating) || 5));
        const numClean = Math.max(1, Math.min(5, parseInt(cleanlinessRating) || 5));
        const numMaint = Math.max(1, Math.min(5, parseInt(maintenanceRating) || 5));
        const numAccess = Math.max(1, Math.min(5, parseInt(accessibilityRating) || 5));

        const toilet = db.data.toilets.find(t => t.toiletId === toiletId);
        if (!toilet) {
            return res.status(404).json({ success: false, message: 'Toilet not found.' });
        }

        // Prevent rapid duplicate reviews from the same user within 2 hours
        const recentDuplicate = (db.data.reviews || []).find(r =>
            r.toiletId === toiletId &&
            r.userId === req.user.userId &&
            (new Date() - new Date(r.createdAt)) < 2 * 60 * 60 * 1000
        );

        if (recentDuplicate) {
            return res.status(429).json({
                success: false,
                message: 'You have already submitted a review for this toilet recently. Please update your existing review.'
            });
        }

        let computedTag = hygieneTag;
        if (!computedTag) {
            if (numClean >= 5) computedTag = 'Spotless Clean';
            else if (numClean >= 4) computedTag = 'Clean & Sanitized';
            else if (numClean >= 3) computedTag = 'Average Cleanliness';
            else computedTag = 'Needs Cleaning';
        }

        const newReview = {
            reviewId: 'rev-' + Date.now(),
            toiletId: toilet.toiletId,
            userId: req.user.userId,
            userName: req.user.name,
            rating: numRating,
            cleanlinessRating: numClean,
            waterAvailable: Boolean(waterAvailable),
            soapAvailable: Boolean(soapAvailable),
            maintenanceRating: numMaint,
            accessibilityRating: numAccess,
            hygieneTag: computedTag,
            comment: comment.trim(),
            photos: Array.isArray(photos) ? photos : [],
            visitVerified: true,
            createdAt: new Date().toISOString()
        };

        if (!db.data.reviews) db.data.reviews = [];
        db.data.reviews.unshift(newReview);

        // Recalculate Toilet Average Rating & Total Reviews
        const allToiletReviews = db.data.reviews.filter(r => r.toiletId === toilet.toiletId);
        const avg = allToiletReviews.reduce((sum, r) => sum + r.rating, 0) / allToiletReviews.length;
        toilet.rating = parseFloat(avg.toFixed(1));
        toilet.totalReviews = allToiletReviews.length;
        db.save();

        // Notify toilet provider
        if (!db.data.notifications) db.data.notifications = [];
        db.data.notifications.unshift({
            notificationId: 'notif-' + Date.now(),
            userId: toilet.providerId,
            role: 'PROVIDER',
            title: `🌟 New Review for ${toilet.name}`,
            message: `${req.user.name} rated your washroom ★ ${numRating}/5 (${computedTag}): "${comment.trim() || 'No comment'}"`,
            type: 'REVIEW',
            read: false,
            createdAt: new Date().toISOString()
        });
        db.save();

        res.status(201).json({
            success: true,
            message: 'Thank you! Your hygiene review has been published.',
            review: newReview,
            toiletRating: toilet.rating,
            totalReviews: toilet.totalReviews
        });
    } catch (err) {
        console.error('Submit review error:', err);
        res.status(500).json({ success: false, message: 'Server error submitting review.' });
    }
});

// 2. GET REVIEWS FOR A TOILET
router.get('/toilet/:toiletId', (req, res) => {
    try {
        const reviews = (db.data.reviews || []).filter(r => r.toiletId === req.params.toiletId);
        res.json({
            success: true,
            count: reviews.length,
            reviews
        });
    } catch (err) {
        console.error('Get reviews error:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving reviews.' });
    }
});

// 3. DELETE REVIEW (Author or Admin)
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const index = (db.data.reviews || []).findIndex(r => r.reviewId === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        const review = db.data.reviews[index];
        const isAuthor = review.userId === req.user.userId;
        const isAdmin = req.user.role === 'ADMIN';

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this review.' });
        }

        const toiletId = review.toiletId;
        db.data.reviews.splice(index, 1);

        // Update toilet rating
        const toilet = db.data.toilets.find(t => t.toiletId === toiletId);
        if (toilet) {
            const rem = db.data.reviews.filter(r => r.toiletId === toiletId);
            if (rem.length > 0) {
                toilet.rating = parseFloat((rem.reduce((sum, r) => sum + r.rating, 0) / rem.length).toFixed(1));
                toilet.totalReviews = rem.length;
            } else {
                toilet.rating = 5.0;
                toilet.totalReviews = 0;
            }
        }

        db.save();

        if (isAdmin) {
            logAuditAction({
                adminId: req.user.userId,
                adminName: req.user.name,
                action: 'REVIEW_MODERATED',
                targetId: review.reviewId,
                targetType: 'REVIEW',
                previousValue: review.comment,
                newValue: 'DELETED',
                reason: req.body.reason || 'Admin content moderation'
            });
        }

        res.json({ success: true, message: 'Review removed successfully.' });
    } catch (err) {
        console.error('Delete review error:', err);
        res.status(500).json({ success: false, message: 'Server error deleting review.' });
    }
});

module.exports = router;
