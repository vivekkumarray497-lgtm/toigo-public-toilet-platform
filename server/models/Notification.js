const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    notificationId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: null, index: true }, // Null = broadcast or specific role
    role: { type: String, enum: ['ALL', 'USER', 'PROVIDER', 'ADMIN'], default: 'ALL', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['SYSTEM', 'REPORT', 'PAYMENT', 'TOILET', 'ACCESS', 'REVIEW'], default: 'SYSTEM' },
    read: { type: Boolean, default: false },
    metadata: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
