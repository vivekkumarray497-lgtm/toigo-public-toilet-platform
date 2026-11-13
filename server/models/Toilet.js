const mongoose = require('mongoose');

const ToiletSchema = new mongoose.Schema({
    toiletId: { type: String, required: true, unique: true, index: true },
    providerId: { type: String, required: true, index: true },
    providerName: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    toiletType: { type: String, default: 'Public Toilet' },
    genderType: { type: String, default: 'Unisex' },
    commodeType: { type: String, default: 'English / Western' },
    address: { type: String, required: true },
    landmark: { type: String, default: '' },
    city: { type: String, default: 'New Delhi' },
    state: { type: String, default: 'Delhi' },
    pincode: { type: String, default: '110001' },
    latitude: { type: Number, required: true, index: true },
    longitude: { type: Number, required: true, index: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [77.2167, 28.6315] } // [lng, lat]
    },
    openingTime: { type: String, default: '06:00 AM' },
    closingTime: { type: String, default: '11:00 PM' },
    isOpen24Hours: { type: Boolean, default: false },
    weeklySchedule: { type: mongoose.Schema.Types.Mixed, default: null },
    facilities: [{ type: String }],
    accessibility: [{ type: String }],
    hygieneStatus: { type: String, default: 'Inspected Clean' },
    hygieneScore: { type: Number, default: 90 }, // 0 - 100
    cleanlinessScore: { type: String, default: '90%' },
    lastInspectedAt: { type: Date, default: Date.now },
    lastCleanedAt: { type: Date, default: Date.now },
    cleaningFrequency: { type: String, default: 'Twice Daily' },
    contactNumber: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    rules: { type: String, default: '' },
    lastReportedIssue: { type: String, default: null },
    price: { type: Number, default: 0 },
    isFree: { type: Boolean, default: true },
    pricing: {
        isFree: { type: Boolean, default: true },
        amount: { type: Number, default: 0 },
        taxRate: { type: Number, default: 0 },
        finalPrice: { type: Number, default: 0 }
    },
    photos: [{ type: String }],
    primaryPhoto: { type: String, default: null },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'], default: 'PENDING', index: true },
    availability: { type: String, enum: ['OPEN', 'CLOSED', 'TEMPORARILY_CLOSED', 'UNDER_MAINTENANCE'], default: 'OPEN', index: true },
    closureReason: { type: String, default: null },
    expectedReopenAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    pendingUpdates: { type: mongoose.Schema.Types.Mixed, default: null },
    active: { type: Boolean, default: true, index: true },
    rating: { type: Number, default: 5.0 },
    totalReviews: { type: Number, default: 0 },
    maintenanceLogs: [{ type: mongoose.Schema.Types.Mixed }],
    upiId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
});

// Spatial index for MongoDB geospatial queries
ToiletSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.Toilet || mongoose.model('Toilet', ToiletSchema);

