const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    paymentId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    transactionId: { type: String, default: null },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    toiletId: { type: String, required: true, index: true },
    toiletName: { type: String, required: true },
    providerId: { type: String, default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: { type: String, default: 'UPI (Google Pay / PhonePe)' },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'],
        default: 'PENDING',
        index: true
    },
    signature: { type: String, default: null },
    refundReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
