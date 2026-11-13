const { db } = require('../config/db');

const logAuditAction = ({ adminId, adminName, action, targetId, targetType, previousValue, newValue, reason }) => {
    const logEntry = {
        logId: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        adminId,
        adminName: adminName || 'Admin',
        action,
        targetId,
        targetType,
        previousValue: previousValue !== undefined ? previousValue : null,
        newValue: newValue !== undefined ? newValue : null,
        reason: reason || null,
        timestamp: new Date().toISOString()
    };

    if (!db.data.auditLogs) {
        db.data.auditLogs = [];
    }
    db.data.auditLogs.unshift(logEntry);
    db.save();
    return logEntry;
};

module.exports = {
    logAuditAction
};
