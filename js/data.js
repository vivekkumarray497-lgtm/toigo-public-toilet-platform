/**
 * TOIGO: Core Data & Persistence Layer
 * Models for USERS, PROVIDERS, TOILETS, REPORTS, REVIEWS
 * Strict approval workflow: Toilets start as 'PENDING', only 'APPROVED' + active=true are visible to Users.
 */

const STORAGE_KEY = 'TOIGO_MASTER_DATA_V3';

const defaultSeedData = {
    currentUser: null, // { userId, name, email, role: 'USER'|'PROVIDER'|'ADMIN', emailVerified, profileImage, authProvider }
    settings: {
        appName: 'TOIGO',
        emergencySos: '112 / 108',
        googleClientId: 'toigo-google-oauth-mock-client'
    },
    users: [
        {
            userId: 'usr-1',
            name: 'Rahul Sharma',
            email: 'rahul.sharma@example.com',
            password: 'password123',
            mobile: '9876543210',
            profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            authProvider: 'email',
            emailVerified: true,
            role: 'USER',
            status: 'ACTIVE',
            createdAt: '2026-08-15T10:00:00Z'
        },
        {
            userId: 'usr-2',
            name: 'Priya Patel',
            email: 'priya.p@gmail.com',
            password: null,
            mobile: '9812345678',
            profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
            authProvider: 'google',
            emailVerified: true,
            role: 'USER',
            status: 'ACTIVE',
            createdAt: '2026-09-01T12:00:00Z'
        }
    ],
    providers: [
        {
            providerId: 'prov-1',
            name: 'Amit Verma',
            email: 'amit.verma@restpoint.in',
            password: 'password123',
            phone: '9899001122',
            businessName: 'SmartRest Sanitation Hub',
            profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            authProvider: 'email',
            verified: true,
            bankAccountNo: '918273645012',
            bankIfsc: 'UTIB0000123',
            bankName: 'Axis Bank',
            upiId: 'amit.verma@okaxis',
            role: 'PROVIDER',
            status: 'ACTIVE',
            createdAt: '2026-07-10T08:00:00Z'
        },
        {
            providerId: 'prov-2',
            name: 'Sunita Devi',
            email: 'sunita.devi@cafesan.com',
            password: 'password123',
            phone: '9765432109',
            businessName: 'Sunita Clean Restrooms',
            profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
            authProvider: 'email',
            verified: true,
            bankAccountNo: '5010023491823',
            bankIfsc: 'HDFC0000456',
            bankName: 'HDFC Bank',
            upiId: 'sunita976@ybl',
            role: 'PROVIDER',
            status: 'ACTIVE',
            createdAt: '2026-08-20T09:30:00Z'
        }
    ],
    admin: {
        userId: 'admin-vivek',
        name: 'Vivek (Super Admin)',
        email: 'founder@toigo.app',
        password: 'admin123', // Protected separate admin password
        role: 'ADMIN',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: '2026-01-01T00:00:00Z'
    },
    toilets: [
        {
            toiletId: 't-1',
            providerId: 'prov-1',
            providerName: 'Amit Verma',
            name: 'SmartRest Luxury Lounge & Washrooms',
            description: 'Ultra-hygienic premium air-conditioned washroom facility with automated touchless taps, sanitized seats and full handicap access.',
            address: 'Block A, Connaught Place, Inner Circle, Near Metro Gate 3, New Delhi',
            latitude: 28.6315,
            longitude: 77.2167,
            openingTime: '06:00 AM',
            closingTime: '11:30 PM',
            commodeType: 'English / Western',
            genderType: 'Unisex & Separate Men/Women',
            facilities: ['Air Conditioned', 'Hand Soap', 'Tissue / Toilet Paper', 'Hand Sanitizer', 'Jet Spray', 'Mirror', 'Running Water', 'Sanitary Pad Dispenser'],
            accessibility: 'Wheelchair Accessible Ramp & Wide Door',
            hygieneStatus: 'High (Automated sanitized seats)',
            cleanlinessScore: '98%',
            price: 15,
            isFree: false,
            photos: [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=600&q=80'
            ],
            status: 'APPROVED', // 'PENDING' | 'APPROVED' | 'REJECTED'
            rejectionReason: null,
            active: true,
            rating: 4.9,
            totalReviews: 142,
            upiId: 'amit.verma@okaxis',
            createdAt: '2026-07-15T10:00:00Z',
            updatedAt: '2026-07-15T10:00:00Z'
        },
        {
            toiletId: 't-2',
            providerId: 'prov-2',
            providerName: 'Sunita Devi',
            name: 'Sunita Clean & Safe Restroom (Shop Front)',
            description: 'Clean and safe market washroom equipped with western commode, indian squat option, jet spray and continuous clean water supply.',
            address: 'Shop #12, Janpath Market Road, Opp Central Bank, New Delhi',
            latitude: 28.6250,
            longitude: 77.2185,
            openingTime: '07:00 AM',
            closingTime: '10:00 PM',
            commodeType: 'Both (Indian & Western)',
            genderType: 'Unisex',
            facilities: ['Hand Soap', 'Jet Spray', 'Mirror', 'Running Water', 'Sanitizer'],
            accessibility: 'Ground Floor Entry',
            hygieneStatus: 'Clean & Sanitized Daily',
            cleanlinessScore: '94%',
            price: 10,
            isFree: false,
            photos: [
                'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80'
            ],
            status: 'APPROVED',
            rejectionReason: null,
            active: true,
            rating: 4.7,
            totalReviews: 89,
            upiId: 'sunita976@ybl',
            createdAt: '2026-08-22T11:00:00Z',
            updatedAt: '2026-08-22T11:00:00Z'
        },
        {
            toiletId: 't-3',
            providerId: 'prov-1',
            providerName: 'Amit Verma',
            name: 'Metro Transit Smart Restroom Gate 2',
            description: 'High traffic urban restroom currently submitted for inspection.',
            address: 'Barakhamba Road, Near Metro Entry, New Delhi',
            latitude: 28.6300,
            longitude: 77.2250,
            openingTime: '06:00 AM',
            closingTime: '11:00 PM',
            commodeType: 'English / Western',
            genderType: 'Separate Men & Women',
            facilities: ['Running Water', 'Jet Spray', 'Mirror'],
            accessibility: 'Wheelchair Accessible',
            hygieneStatus: 'Standard Commercial',
            cleanlinessScore: '90%',
            price: 10,
            isFree: false,
            photos: [
                'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80'
            ],
            status: 'PENDING', // PENDING MUST NEVER SHOW TO NORMAL USERS
            rejectionReason: null,
            active: true,
            rating: 5.0,
            totalReviews: 0,
            upiId: 'amit.verma@okaxis',
            createdAt: '2026-10-01T09:00:00Z',
            updatedAt: '2026-10-01T09:00:00Z'
        }
    ],
    reports: [
        {
            reportId: 'rep-1',
            userId: 'usr-1',
            userName: 'Rahul Sharma',
            toiletId: 't-2',
            toiletName: 'Sunita Clean & Safe Restroom (Shop Front)',
            providerId: 'prov-2',
            category: 'Water Not Available',
            description: 'Water tap had low pressure around noon. Needs maintenance.',
            photo: null,
            status: 'RESOLVED', // 'PENDING' | 'UNDER REVIEW' | 'RESOLVED' | 'REJECTED'
            adminResponse: 'Host notified; plumbing fixed and water pressure restored.',
            createdAt: '2026-09-28T14:20:00Z',
            updatedAt: '2026-09-29T10:00:00Z'
        }
    ],
    reviews: [
        {
            reviewId: 'rev-1',
            toiletId: 't-1',
            userId: 'usr-1',
            userName: 'Rahul Sharma',
            rating: 5,
            hygieneTag: '✨ Spotless Clean',
            comment: 'Super clean, fresh fragrance, warm water and touchless taps. Best washroom in CP!',
            photos: [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'
            ],
            createdAt: '2026-09-25T12:00:00Z'
        }
    ]
};

class ToigoDataStore {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...defaultSeedData, ...parsed };
            }
        } catch (e) {
            console.error('Failed to parse storage', e);
        }
        return JSON.parse(JSON.stringify(defaultSeedData));
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save to storage', e);
        }
    }

    reset() {
        localStorage.removeItem(STORAGE_KEY);
        this.data = JSON.parse(JSON.stringify(defaultSeedData));
        this.save();
    }

    // ================= SESSIONS & CURRENT USER =================
    getCurrentUser() {
        return this.data.currentUser;
    }

    setCurrentUser(user) {
        this.data.currentUser = user ? {
            userId: user.userId || user.providerId || user.id,
            name: user.name,
            email: user.email,
            role: user.role, // 'USER' | 'PROVIDER' | 'ADMIN'
            emailVerified: user.emailVerified ?? true,
            profileImage: user.profileImage || null,
            authProvider: user.authProvider || 'email'
        } : null;
        this.save();
    }

    logout() {
        this.data.currentUser = null;
        this.save();
    }

    // ================= USERS MANAGEMENT =================
    findUserByEmail(email) {
        if (!email) return null;
        const normalized = email.trim().toLowerCase();
        return this.data.users.find(u => u.email && u.email.toLowerCase() === normalized);
    }

    findUserById(userId) {
        return this.data.users.find(u => u.userId === userId);
    }

    createUser({ name, email, password, mobile, authProvider = 'email', emailVerified = false, profileImage = null }) {
        const newUser = {
            userId: 'usr-' + Date.now(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password ? password : null,
            mobile: mobile ? mobile.trim() : null,
            profileImage: profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
            authProvider: authProvider,
            emailVerified: emailVerified,
            verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
            role: 'USER',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
        };
        this.data.users.unshift(newUser);
        this.save();
        return newUser;
    }

    verifyUserEmail(userId) {
        const user = this.findUserById(userId);
        if (user) {
            user.emailVerified = true;
            user.verificationCode = null;
            if (this.data.currentUser && this.data.currentUser.userId === userId) {
                this.data.currentUser.emailVerified = true;
            }
            this.save();
            return true;
        }
        return false;
    }

    toggleUserStatus(userId) {
        const user = this.findUserById(userId);
        if (user) {
            user.status = user.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
            this.save();
            return user;
        }
        return null;
    }

    // ================= PROVIDERS MANAGEMENT =================
    findProviderByEmailOrPhone(identifier) {
        if (!identifier) return null;
        const normalized = identifier.trim().toLowerCase();
        const digits = identifier.replace(/\D/g, '');
        return this.data.providers.find(p => 
            (p.email && p.email.toLowerCase() === normalized) ||
            (p.phone && p.phone.replace(/\D/g, '') === digits && digits.length >= 10)
        );
    }

    findProviderByPhone(phone) {
        if (!phone) return null;
        const digits = phone.replace(/\D/g, '');
        return this.data.providers.find(p => p.phone && p.phone.replace(/\D/g, '') === digits);
    }

    createProvider({ name, email, password, phone, businessName, bankAccountNo, bankIfsc, bankName, upiId, emailVerified = false, mobileVerified = false }) {
        const newProv = {
            providerId: 'prov-' + Date.now(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            phone: phone ? phone.trim() : '',
            businessName: businessName ? businessName.trim() : `${name}'s Restroom`,
            profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
            authProvider: 'email',
            emailVerified: emailVerified,
            mobileVerified: mobileVerified,
            verified: emailVerified && mobileVerified,
            emailVerificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
            mobileOtp: Math.floor(1000 + Math.random() * 9000).toString(),
            otpExpiresAt: Date.now() + 5 * 60 * 1000, // 5 mins
            bankAccountNo: bankAccountNo || '918273645012',
            bankIfsc: bankIfsc || 'UTIB0000123',
            bankName: bankName || 'Axis Bank',
            upiId: upiId || 'host@upi',
            role: 'PROVIDER',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
        };
        this.data.providers.unshift(newProv);
        this.save();
        return newProv;
    }

    updateProviderToilet(providerId, toiletId, updateData) {
        const toilet = this.getToiletById(toiletId);
        if (!toilet) {
            return { success: false, message: 'Toilet listing not found.' };
        }
        // Strict Ownership Security Check
        if (toilet.providerId !== providerId) {
            return { success: false, message: 'Access Denied: You do not own this toilet listing.' };
        }

        const wasApproved = toilet.status === 'APPROVED';

        if (updateData.name) toilet.name = updateData.name.trim();
        if (updateData.address) toilet.address = updateData.address.trim();
        if (updateData.description !== undefined) toilet.description = updateData.description;
        if (updateData.latitude) toilet.latitude = Number(updateData.latitude);
        if (updateData.longitude) toilet.longitude = Number(updateData.longitude);
        if (updateData.openingTime) toilet.openingTime = updateData.openingTime;
        if (updateData.closingTime) toilet.closingTime = updateData.closingTime;
        if (updateData.commodeType) toilet.commodeType = updateData.commodeType;
        if (updateData.genderType) toilet.genderType = updateData.genderType;
        if (updateData.facilities) toilet.facilities = updateData.facilities;
        if (updateData.accessibility) toilet.accessibility = updateData.accessibility;
        if (updateData.hygieneStatus) toilet.hygieneStatus = updateData.hygieneStatus;
        if (updateData.price !== undefined) {
            toilet.price = Number(updateData.price);
            toilet.isFree = Number(updateData.price) === 0;
        }
        if (updateData.photos && updateData.photos.length > 0) toilet.photos = updateData.photos;

        // Admin Re-Verification Rule: If an approved toilet has its details changed, it goes to PENDING
        let requireReVerification = false;
        if (wasApproved) {
            toilet.status = 'PENDING';
            toilet.rejectionReason = null;
            toilet.needsReVerification = true;
            requireReVerification = true;
        }

        toilet.updatedAt = new Date().toISOString();
        this.save();

        return {
            success: true,
            toilet: toilet,
            requireReVerification: requireReVerification,
            message: requireReVerification
                ? 'Toilet updated! Submitted to Admin for re-verification (Status: PENDING).'
                : 'Toilet details updated successfully.'
        };
    }

    manageProviderToilet(providerId, toiletId, { isOpen, active, price, isFree, facilities }) {
        const toilet = this.getToiletById(toiletId);
        if (!toilet) {
            return { success: false, message: 'Toilet listing not found.' };
        }
        // Strict Ownership Security Check
        if (toilet.providerId !== providerId) {
            return { success: false, message: 'Access Denied: You do not own this toilet listing.' };
        }

        if (isOpen !== undefined) toilet.isOpen = isOpen;
        if (active !== undefined) toilet.active = active;
        if (price !== undefined) {
            toilet.price = Number(price);
            toilet.isFree = Number(price) === 0 || isFree === true;
        }
        if (facilities) toilet.facilities = facilities;

        toilet.updatedAt = new Date().toISOString();
        this.save();

        return {
            success: true,
            toilet: toilet,
            message: `Toilet ${toilet.name} settings updated.`
        };
    }

    removeProviderToilet(providerId, toiletId) {
        const toilet = this.getToiletById(toiletId);
        if (!toilet) {
            return { success: false, message: 'Toilet listing not found.' };
        }
        // Strict Ownership Security Check
        if (toilet.providerId !== providerId) {
            return { success: false, message: 'Access Denied: You do not own this toilet listing.' };
        }

        this.data.toilets = this.data.toilets.filter(t => t.toiletId !== toiletId);
        this.save();

        return {
            success: true,
            message: 'Toilet removed successfully. It is no longer visible on TOIGO.'
        };
    }

    toggleProviderStatus(providerId) {
        const prov = this.findProviderById(providerId);
        if (prov) {
            prov.status = prov.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
            this.save();
            return prov;
        }
        return null;
    }

    approveProviderVerification(providerId) {
        const prov = this.findProviderById(providerId);
        if (prov) {
            prov.verified = true;
            this.save();
            return prov;
        }
        return null;
    }

    // ================= PUBLIC TOILETS & APPROVAL WORKFLOW =================
    /**
     * CRITICAL REQUIREMENT:
     * Normal Users must ONLY see toilets where status === 'APPROVED' and active === true.
     * Providers can see all their own toilets ('PENDING', 'APPROVED', 'REJECTED').
     * Admins can view all toilets across the platform.
     */
    getPublicApprovedToilets() {
        return this.data.toilets.filter(t => t.status === 'APPROVED' && t.active === true);
    }

    getToiletById(toiletId) {
        return this.data.toilets.find(t => t.toiletId === toiletId);
    }

    getToiletsByProvider(providerId) {
        return this.data.toilets.filter(t => t.providerId === providerId);
    }

    getAllToiletsAdmin() {
        return this.data.toilets;
    }

    addToiletByProvider(providerId, toiletData) {
        const prov = this.findProviderById(providerId) || { name: 'Host Partner' };
        const newToilet = {
            toiletId: 't-' + Date.now(),
            providerId: providerId,
            providerName: prov.businessName || prov.name,
            name: toiletData.name.trim(),
            description: toiletData.description || 'Clean and sanitized public washroom.',
            address: toiletData.address.trim(),
            latitude: Number(toiletData.latitude || 28.6315),
            longitude: Number(toiletData.longitude || 77.2167),
            openingTime: toiletData.openingTime || '06:00 AM',
            closingTime: toiletData.closingTime || '11:00 PM',
            commodeType: toiletData.commodeType || 'English / Western',
            genderType: toiletData.genderType || 'Unisex',
            facilities: Array.isArray(toiletData.facilities) ? toiletData.facilities : ['Hand Soap', 'Running Water', 'Jet Spray', 'Mirror'],
            accessibility: toiletData.accessibility || 'Ground Floor / Accessible',
            hygieneStatus: toiletData.hygieneStatus || 'Clean',
            cleanlinessScore: '95%',
            price: Number(toiletData.price || 0),
            isFree: Number(toiletData.price || 0) === 0,
            photos: toiletData.photos && toiletData.photos.length > 0 ? toiletData.photos : [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
            ],
            status: 'PENDING', // STRICT: Starts as PENDING, requires Admin approval
            rejectionReason: null,
            active: true,
            rating: 5.0,
            totalReviews: 0,
            upiId: toiletData.upiId || prov.upiId || 'host@okaxis',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.toilets.unshift(newToilet);
        this.save();
        return newToilet;
    }

    approveToiletAdmin(toiletId) {
        const toilet = this.getToiletById(toiletId);
        if (toilet) {
            toilet.status = 'APPROVED';
            toilet.rejectionReason = null;
            toilet.updatedAt = new Date().toISOString();
            this.save();
            return toilet;
        }
        return null;
    }

    rejectToiletAdmin(toiletId, reason) {
        const toilet = this.getToiletById(toiletId);
        if (toilet) {
            toilet.status = 'REJECTED';
            toilet.rejectionReason = reason || 'Facility does not meet sanitation or location standards.';
            toilet.updatedAt = new Date().toISOString();
            this.save();
            return toilet;
        }
        return null;
    }

    toggleToiletActiveStatus(toiletId) {
        const toilet = this.getToiletById(toiletId);
        if (toilet) {
            toilet.active = !toilet.active;
            toilet.updatedAt = new Date().toISOString();
            this.save();
            return toilet;
        }
        return null;
    }

    deleteToiletAdmin(toiletId) {
        this.data.toilets = this.data.toilets.filter(t => t.toiletId !== toiletId);
        this.save();
    }

    // ================= CITIZEN REPORTS / COMPLAINTS =================
    /**
     * Users see only their own reports.
     * Providers see reports for their own toilets.
     * Admin sees all reports.
     */
    addReport({ userId, userName, toiletId, category, description, photo }) {
        const toilet = this.getToiletById(toiletId) || { name: 'Public Restroom', providerId: 'prov-1' };
        const newReport = {
            reportId: 'rep-' + Date.now(),
            userId: userId,
            userName: userName || 'Citizen',
            toiletId: toiletId,
            toiletName: toilet.name,
            providerId: toilet.providerId,
            category: category || 'Dirty Toilet',
            description: description.trim(),
            photo: photo || null,
            status: 'PENDING', // 'PENDING' | 'UNDER REVIEW' | 'RESOLVED' | 'REJECTED'
            adminResponse: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!this.data.reports) this.data.reports = [];
        this.data.reports.unshift(newReport);
        this.save();
        return newReport;
    }

    getUserReports(userId) {
        return (this.data.reports || []).filter(r => r.userId === userId);
    }

    getProviderReports(providerId) {
        return (this.data.reports || []).filter(r => r.providerId === providerId);
    }

    getAllReportsAdmin() {
        return this.data.reports || [];
    }

    updateReportStatusAdmin(reportId, status, adminResponse) {
        const report = (this.data.reports || []).find(r => r.reportId === reportId);
        if (report) {
            report.status = status;
            report.adminResponse = adminResponse || null;
            report.updatedAt = new Date().toISOString();
            this.save();
            return report;
        }
        return null;
    }

    // ================= REVIEWS & RATINGS =================
    addReview({ toiletId, userId, userName, rating, hygieneTag, comment, photos }) {
        const newReview = {
            reviewId: 'rev-' + Date.now(),
            toiletId: toiletId,
            userId: userId,
            userName: userName || 'Citizen',
            rating: Number(rating),
            hygieneTag: hygieneTag || '✨ Clean',
            comment: comment || 'Verified clean washroom.',
            photos: photos || [],
            createdAt: new Date().toISOString()
        };

        if (!this.data.reviews) this.data.reviews = [];
        this.data.reviews.unshift(newReview);

        // Recalculate average rating
        const allReviews = this.data.reviews.filter(r => r.toiletId === toiletId);
        const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        const toilet = this.getToiletById(toiletId);
        if (toilet) {
            toilet.rating = Number(avg.toFixed(1));
            toilet.totalReviews = allReviews.length;
            toilet.cleanlinessScore = `${Math.min(99, Math.round((avg / 5) * 100))}%`;
        }

        this.save();
        return newReview;
    }

    getReviewsForToilet(toiletId) {
        return (this.data.reviews || []).filter(r => r.toiletId === toiletId);
    }

    // ================= PAYMENTS & TRANSACTIONS =================
    addPaymentTransaction({ userId, userName, toiletId, toiletName, providerId, amount, method, status = 'SUCCESS', upiId }) {
        const newPayment = {
            paymentId: 'PAY-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
            userId: userId,
            userName: userName || 'Citizen',
            toiletId: toiletId,
            toiletName: toiletName || 'Public Restroom',
            providerId: providerId || 'prov-1',
            amount: Number(amount),
            method: method || 'UPI',
            status: status, // 'SUCCESS' | 'FAILED' | 'CANCELLED'
            unlockToken: 'TG-' + Math.floor(1000 + Math.random() * 9000),
            upiId: upiId || 'host@upi',
            timestamp: new Date().toISOString()
        };

        if (!this.data.payments) this.data.payments = [];
        this.data.payments.unshift(newPayment);
        this.save();
        return newPayment;
    }

    getUserPayments(userId) {
        return (this.data.payments || []).filter(p => p.userId === userId);
    }

    getAllPaymentsAdmin() {
        return this.data.payments || [];
    }

    // ================= UTILITIES =================
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0.5;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Number((R * c).toFixed(2));
    }
}

window.db = new ToigoDataStore();
