const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    reviewId: { type: String, required: true, unique: true, index: true },
    toiletId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    cleanlinessRating: { type: Number, min: 1, max: 5, default: 5 },
    waterAvailable: { type: Boolean, default: true },
    soapAvailable: { type: Boolean, default: true },
    maintenanceRating: { type: Number, min: 1, max: 5, default: 5 },
    accessibilityRating: { type: Number, min: 1, max: 5, default: 5 },
    hygieneTag: { type: String, default: 'Clean' },
    comment: { type: String, default: '', trim: true },
    photos: [{ type: String }],
    visitVerified: { type: Boolean, default: true },
    visitSessionId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
