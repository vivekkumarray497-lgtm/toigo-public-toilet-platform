const mongoose = require('mongoose');

const AccessSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    toiletId: { type: String, required: true, index: true },
    paymentId: { type: String, default: null },
    accessToken: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'EXPIRED'],
        default: 'ACTIVE',
        index: true
    },
    startedAt: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    endedAt: { type: Date, default: null }
});

module.exports = mongoose.models.AccessSession || mongoose.model('AccessSession', AccessSessionSchema);
