const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, default: null },
    mobile: { type: String, default: null },
    profileImage: { type: String, default: null },
    authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
    emailVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    role: { type: String, enum: ['USER', 'PROVIDER', 'ADMIN'], default: 'USER', index: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'], default: 'ACTIVE' },
    businessName: { type: String, default: null },
    verified: { type: Boolean, default: false },
    bankAccountNo: { type: String, default: null },
    bankIfsc: { type: String, default: null },
    bankName: { type: String, default: null },
    upiId: { type: String, default: null },
    walletBalance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
