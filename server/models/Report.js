const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    reportId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    toiletId: { type: String, required: true, index: true },
    toiletName: { type: String, required: true },
    providerId: { type: String, default: null, index: true },
    category: {
        type: String,
        required: true,
        enum: [
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
        ]
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM', index: true },
    description: { type: String, required: true, trim: true },
    photo: { type: String, default: null },
    location: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], default: 'OPEN', index: true },
    adminResponse: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Report || mongoose.model('Report', ReportSchema);
