const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    logId: { type: String, required: true, unique: true, index: true },
    adminId: { type: String, required: true, index: true },
    adminName: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    targetType: { type: String, required: true, enum: ['TOILET', 'USER', 'PROVIDER', 'REPORT', 'PAYMENT', 'REVIEW', 'SYSTEM'] },
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
