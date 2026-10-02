/**
 * TOIGO: Find, Use & Pay - Data & Storage Layer
 * Enhanced with Strict Validations, Bank Verification, Reports System & Role Permissions
 */

const STORAGE_KEY = 'TOIGO_APP_DATA_V2';

// Bank IFSC Prefix Lookup Directory
const BANK_IFSC_DIRECTORY = {
    'SBIN': 'State Bank of India',
    'HDFC': 'HDFC Bank',
    'ICIC': 'ICICI Bank',
    'UTIB': 'Axis Bank',
    'PUNB': 'Punjab National Bank',
    'BARB': 'Bank of Baroda',
    'KKBK': 'Kotak Mahindra Bank',
    'CNRB': 'Canara Bank',
    'UBIN': 'Union Bank of India',
    'IDFB': 'IDFC First Bank',
    'YESB': 'Yes Bank',
    'INDB': 'IndusInd Bank',
    'IOBA': 'Indian Overseas Bank',
    'BKID': 'Bank of India',
    'MAHB': 'Bank of Maharashtra'
};

// Default initial seed data
const defaultInitialData = {
    currentUser: null,
    settings: {
        platformCommissionPct: 0,
        sosEmergencyNumber: '112 / 108',
        otpExpirySeconds: 300,
        announcements: [
            { id: 'ann-1', title: 'Welcome to TOIGO!', message: 'India’s #1 Verified Smart Toilet Network. Direct UPI payments to hosts & verified hygiene reports.', date: 'Today' }
        ]
    },
    users: [
        {
            id: 'usr-1',
            name: 'Rahul Sharma',
            email: 'rahul.sharma@example.com',
            phone: '9876543210',
            gender: 'Male',
            role: 'user',
            walletBalance: 150,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            status: 'active',
            isProfileComplete: true,
            joinedAt: '2026-08-15',
            favoriteToilets: ['t-1', 't-3']
        },
        {
            id: 'usr-2',
            name: 'Priya Patel',
            email: 'priya.p@example.com',
            phone: '9812345678',
            gender: 'Female',
            role: 'user',
            walletBalance: 80,
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
            status: 'active',
            isProfileComplete: true,
            joinedAt: '2026-09-01',
            favoriteToilets: ['t-2']
        }
    ],
    providers: [
        {
            id: 'prov-1',
            name: 'Amit Verma',
            email: 'amit.verma@restpoint.in',
            phone: '9899001122',
            gender: 'Male',
            role: 'provider',
            businessName: 'SmartRest Commercial Sanitations',
            address: 'Block A, Connaught Place, New Delhi',
            location: { lat: 28.6315, lng: 77.2167 },
            upiId: 'amit.verma@okaxis',
            bankAccountNo: '918273645012',
            bankIfsc: 'UTIB0000123',
            bankName: 'Axis Bank',
            bankHolderName: 'Amit Verma',
            bankVerificationStatus: 'verified', // 'verified' | 'pending' | 'failed'
            status: 'verified', // 'verified' | 'pending' | 'rejected' | 'suspended'
            kycStatus: 'Approved',
            walletBalance: 4200,
            totalEarned: 18500,
            joinedAt: '2026-07-10',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Damit.verma%40okaxis%26pn%3DSmartRest%20Washrooms%26cu%3DINR'
        },
        {
            id: 'prov-2',
            name: 'Sunita Devi',
            email: 'sunita.devi@cafesan.com',
            phone: '9765432109',
            gender: 'Female',
            role: 'provider',
            businessName: 'Sunita Clean Restrooms',
            address: 'Shop #12, Janpath Market Road, New Delhi',
            location: { lat: 28.6250, lng: 77.2185 },
            upiId: 'sunita976@ybl',
            bankAccountNo: '5010023491823',
            bankIfsc: 'HDFC0000456',
            bankName: 'HDFC Bank',
            bankHolderName: 'Sunita Devi',
            bankVerificationStatus: 'verified',
            status: 'verified',
            kycStatus: 'Approved',
            walletBalance: 1850,
            totalEarned: 6400,
            joinedAt: '2026-08-20',
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
            qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Dsunita976%40ybl%26pn%3DSunita%20Restrooms%26cu%3DINR'
        }
    ],
    admin: {
        id: 'admin-founder',
        name: 'Vivek (Founder & Super Admin)',
        email: 'founder@toigo.app',
        phone: '9999999999',
        role: 'admin',
        title: 'Chief Executive & Founder',
        badge: 'Founder / Super Admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    },
    toilets: [
        {
            id: 't-1',
            name: 'SmartRest Luxury Lounge & Washrooms',
            providerId: 'prov-1',
            providerName: 'Amit Verma',
            phone: '+91 9899001122',
            upiId: 'amit.verma@okaxis',
            qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Damit.verma%40okaxis%26pn%3DSmartRest%20Washrooms%26am%3D15%26cu%3DINR',
            address: 'Block A, Connaught Place, Inner Circle, Near Metro Gate 3',
            city: 'New Delhi',
            lat: 28.6315,
            lng: 77.2167,
            type: 'English / Western',
            genderType: 'Unisex & Separate Men/Women',
            price: 15,
            isFree: false,
            rating: 4.9,
            totalReviews: 142,
            cleanlinessScore: '98%',
            status: 'open',
            approvalStatus: 'approved',
            isVerified: true,
            isFeatured: true,
            images: [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Air Conditioned', 'Hand Soap', 'Tissue / Toilet Paper', 'Hand Sanitizer', 'Jet Spray', 'Wheelchair Accessible', 'Mirror', 'Sanitary Pad Dispenser', 'Baby Care Station'],
            timings: '06:00 AM - 11:30 PM',
            description: 'Ultra-hygienic premium air-conditioned washroom facility with automated touchless taps, sanitized seats and full handicap access.'
        },
        {
            id: 't-2',
            name: 'Sunita Clean & Safe Restroom (Shop Front)',
            providerId: 'prov-2',
            providerName: 'Sunita Devi',
            phone: '+91 9765432109',
            upiId: 'sunita976@ybl',
            qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Dsunita976%40ybl%26pn%3DSunita%20Restrooms%26am%3D10%26cu%3DINR',
            address: 'Shop #12, Janpath Market Road, Opp Central Bank',
            city: 'New Delhi',
            lat: 28.6250,
            lng: 77.2185,
            type: 'Both (Indian & Western)',
            genderType: 'Unisex',
            price: 10,
            isFree: false,
            rating: 4.7,
            totalReviews: 89,
            cleanlinessScore: '94%',
            status: 'open',
            approvalStatus: 'approved',
            isVerified: true,
            isFeatured: false,
            images: [
                'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Hand Soap', 'Jet Spray', 'Mirror', 'Running Water', 'Sanitizer'],
            timings: '07:00 AM - 10:00 PM',
            description: 'Clean and safe market washroom equipped with western commode, indian squat option, jet spray and continuous clean water supply.'
        },
        {
            id: 't-3',
            name: 'NDMC Smart Public Convenience & Washroom',
            providerId: 'prov-1',
            providerName: 'SmartRest Commercial Sanitations',
            phone: '+91 9899001122',
            upiId: 'amit.verma@okaxis',
            qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Damit.verma%40okaxis%26pn%3DNDMC%20Smart%20Toilet%26am%3D5%26cu%3DINR',
            address: 'Opposite Shivaji Stadium Bus Terminal, CP',
            city: 'New Delhi',
            lat: 28.6335,
            lng: 77.2120,
            type: 'Indian',
            genderType: 'Separate Men & Women',
            price: 5,
            isFree: false,
            rating: 4.3,
            totalReviews: 215,
            cleanlinessScore: '88%',
            status: 'open',
            approvalStatus: 'approved',
            isVerified: true,
            isFeatured: false,
            images: [
                'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Hand Soap', 'Running Water', 'Indian Squat Pan', 'Separate Male/Female'],
            timings: '24 Hours Open',
            description: 'High frequency public washroom with automated flush, dedicated attendants and regular deep sanitation rounds.'
        },
        {
            id: 't-4',
            name: 'Express Free Public Sanitation Booth',
            providerId: null,
            providerName: 'Municipal Corporation (Free)',
            phone: '1800-11-0011',
            upiId: null,
            qrCodeImage: null,
            address: 'Near Palika Bazaar Entry Gate 2',
            city: 'New Delhi',
            lat: 28.6295,
            lng: 77.2198,
            type: 'Indian',
            genderType: 'Separate Men & Women',
            price: 0,
            isFree: true,
            rating: 3.9,
            totalReviews: 64,
            cleanlinessScore: '76%',
            status: 'open',
            approvalStatus: 'approved',
            isVerified: true,
            isFeatured: false,
            images: [
                'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Running Water', 'Indian Squat Pan'],
            timings: '05:00 AM - 11:00 PM',
            description: 'Free municipal toilet facility maintained by city municipal team.'
        }
    ],
    bookings: [
        {
            id: 'bk-101',
            toiletId: 't-1',
            toiletName: 'SmartRest Luxury Lounge & Washrooms',
            userId: 'usr-1',
            userName: 'Rahul Sharma',
            providerId: 'prov-1',
            amount: 15,
            providerEarning: 15,
            paymentMethod: 'Direct UPI (GPay)',
            paymentStatus: 'PAID (Direct to Host)',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            status: 'Completed'
        },
        {
            id: 'bk-102',
            toiletId: 't-2',
            toiletName: 'Sunita Clean & Safe Restroom (Shop Front)',
            userId: 'usr-2',
            userName: 'Priya Patel',
            providerId: 'prov-2',
            amount: 10,
            providerEarning: 10,
            paymentMethod: 'TOIGO Wallet',
            paymentStatus: 'PAID (Direct to Host)',
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            status: 'Completed'
        }
    ],
    reviews: [
        {
            id: 'rev-1',
            toiletId: 't-1',
            userId: 'usr-1',
            userName: 'Rahul Sharma',
            userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            rating: 5,
            hygieneTag: '✨ Spotless Clean',
            comment: 'Super clean, fresh fragrance, warm water and touchless taps. Best washroom experience in Connaught Place!',
            photos: [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'
            ],
            date: 'Today, 12:45 PM'
        },
        {
            id: 'rev-2',
            toiletId: 't-2',
            userId: 'usr-2',
            userName: 'Priya Patel',
            userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
            rating: 5,
            hygieneTag: '🧼 Fresh & Sanitized',
            comment: 'Very hygienic and safe for women. Host Sunita was very polite. Highly recommended!',
            photos: [
                'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=400&q=80'
            ],
            date: 'Yesterday'
        }
    ],
    reports: [
        {
            id: 'rep-1',
            toiletId: 't-4',
            toiletName: 'Express Free Public Sanitation Booth',
            userId: 'usr-1',
            userName: 'Rahul Sharma',
            category: 'Water Not Available',
            description: 'Water tap was running low on pressure around noon. Needs maintenance.',
            photo: null,
            status: 'pending', // 'pending' | 'resolved' | 'dismissed'
            timestamp: new Date(Date.now() - 86400000).toISOString()
        }
    ],
    payoutRequests: []
};

class ToigoDB {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (!parsed.reports) parsed.reports = defaultInitialData.reports;
                return { ...defaultInitialData, ...parsed };
            }
        } catch (e) {
            console.error('Error loading data from LocalStorage', e);
        }
        return JSON.parse(JSON.stringify(defaultInitialData));
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Error saving data to LocalStorage', e);
        }
    }

    reset() {
        localStorage.removeItem(STORAGE_KEY);
        this.data = JSON.parse(JSON.stringify(defaultInitialData));
        this.save();
    }

    // ================= BANK & VALIDATION UTILITIES =================
    validateMobile(phone) {
        if (!phone) return { valid: false, message: 'Please enter mobile number.' };
        const cleanPhone = phone.toString().replace(/\D/g, '');
        // 10 digits starting with 6, 7, 8, 9
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            return { valid: false, message: 'Please enter a valid 10-digit Indian mobile number (starts with 6-9).' };
        }
        // Reject obvious fake repetitive numbers like 9999999999 or 8888888888
        if (/^(\d)\1{9}$/.test(cleanPhone)) {
            return { valid: false, message: 'Invalid mobile number. Repetitive digits not allowed.' };
        }
        return { valid: true, cleanPhone };
    }

    validateEmail(email) {
        if (!email) return { valid: false, message: 'Please enter email address.' };
        const cleanEmail = email.toString().trim().toLowerCase();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(cleanEmail)) {
            return { valid: false, message: 'Please enter a valid email address (e.g. name@example.com).' };
        }
        return { valid: true, cleanEmail };
    }

    verifyBankIfsc(ifscCode) {
        if (!ifscCode) return { valid: false, message: 'IFSC Code is required.' };
        const cleanIfsc = ifscCode.toString().trim().toUpperCase();
        // Standard RBI IFSC format: 4 letters, '0', 6 alphanumeric characters (total 11 chars)
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(cleanIfsc)) {
            return { valid: false, message: 'Invalid IFSC format. Must be 11 characters (e.g. SBIN0001234, HDFC0000123).' };
        }

        const prefix = cleanIfsc.substring(0, 4);
        const bankName = BANK_IFSC_DIRECTORY[prefix] || `${prefix} Bank`;
        return {
            valid: true,
            cleanIfsc,
            bankName,
            status: 'verified',
            message: `✓ Valid IFSC: ${bankName}`
        };
    }

    validateAccountNumber(accNo) {
        if (!accNo) return { valid: false, message: 'Account number is required.' };
        const cleanAcc = accNo.toString().replace(/\D/g, '');
        if (cleanAcc.length < 9 || cleanAcc.length > 18) {
            return { valid: false, message: 'Bank account number must be between 9 and 18 digits.' };
        }
        return { valid: true, cleanAcc };
    }

    // ================= USER & AUTH SESSIONS =================
    getCurrentUser() {
        return this.data.currentUser;
    }

    setCurrentUser(user) {
        this.data.currentUser = user;
        this.save();
    }

    logout() {
        this.data.currentUser = null;
        this.save();
    }

    findUserByPhoneOrEmail(identifier) {
        if (!identifier) return null;
        const idClean = identifier.toString().trim().toLowerCase().replace(/\D/g, '');
        const idLower = identifier.toString().trim().toLowerCase();
        return this.data.users.find(u => 
            (u.phone && (u.phone === idLower || u.phone.replace(/\D/g, '') === idClean)) || 
            (u.email && u.email.toLowerCase() === idLower)
        );
    }

    findProviderByPhoneOrEmail(identifier) {
        if (!identifier) return null;
        const idClean = identifier.toString().trim().toLowerCase().replace(/\D/g, '');
        const idLower = identifier.toString().trim().toLowerCase();
        return this.data.providers.find(p => 
            (p.phone && (p.phone === idLower || p.phone.replace(/\D/g, '') === idClean)) || 
            (p.email && p.email.toLowerCase() === idLower)
        );
    }

    createUser(userData) {
        const newUser = {
            id: 'usr-' + Date.now(),
            name: userData.name || 'Citizen User',
            email: userData.email || null,
            phone: userData.phone || null,
            gender: userData.gender || null,
            isProfileComplete: !!(userData.name && userData.gender),
            role: 'user',
            walletBalance: 100,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userData.name || 'User')}`,
            status: 'active',
            joinedAt: new Date().toISOString().split('T')[0],
            favoriteToilets: []
        };
        this.data.users.unshift(newUser);
        this.save();
        return newUser;
    }

    updateUserProfile(userId, updateFields) {
        const index = this.data.users.findIndex(u => u.id === userId);
        if (index !== -1) {
            this.data.users[index] = { ...this.data.users[index], ...updateFields };
            if (updateFields.name && updateFields.gender) {
                this.data.users[index].isProfileComplete = true;
            }
            if (this.data.currentUser && this.data.currentUser.id === userId) {
                this.data.currentUser = this.data.users[index];
            }
            this.save();
            return this.data.users[index];
        }
        return null;
    }

    createProvider(providerData) {
        const upi = providerData.upiId || 'host@upi';
        const defaultQr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('upi://pay?pa=' + upi + '&pn=' + (providerData.businessName || providerData.name) + '&cu=INR')}`;

        const ifscCheck = this.verifyBankIfsc(providerData.bankIfsc || 'SBIN0001234');

        const newProvider = {
            id: 'prov-' + Date.now(),
            name: providerData.name || 'Restroom Host',
            email: providerData.email || 'host@toigo.app',
            phone: providerData.phone || '9988776655',
            gender: providerData.gender || 'Not Specified',
            role: 'provider',
            businessName: providerData.businessName || 'Clean Restroom Hub',
            address: providerData.address || 'Commercial Facility',
            location: providerData.location || { lat: 28.6315, lng: 77.2167 },
            upiId: upi,
            bankAccountNo: providerData.bankAccountNo || '918273645012',
            bankIfsc: ifscCheck.cleanIfsc,
            bankName: ifscCheck.bankName,
            bankHolderName: providerData.bankHolderName || providerData.name || 'Restroom Host',
            bankVerificationStatus: ifscCheck.valid ? 'verified' : 'pending',
            status: 'verified', // Directly verified for smooth onboarding
            kycStatus: 'Approved',
            walletBalance: 0,
            totalEarned: 0,
            joinedAt: new Date().toISOString().split('T')[0],
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(providerData.name || 'Provider')}`,
            qrCodeImage: providerData.qrCodeImage || defaultQr
        };

        this.data.providers.unshift(newProvider);
        this.save();
        return newProvider;
    }

    updateProvider(provId, updateFields) {
        const index = this.data.providers.findIndex(p => p.id === provId);
        if (index !== -1) {
            this.data.providers[index] = { ...this.data.providers[index], ...updateFields };
            if (this.data.currentUser && this.data.currentUser.id === provId) {
                this.data.currentUser = this.data.providers[index];
            }
            this.save();
            return this.data.providers[index];
        }
        return null;
    }

    // ================= TOILET MANAGEMENT =================
    getAllToilets(includePending = false) {
        if (includePending) return this.data.toilets;
        return this.data.toilets.filter(t => t.approvalStatus === 'approved');
    }

    getToiletById(id) {
        return this.data.toilets.find(t => t.id === id);
    }

    getToiletsByProvider(providerId) {
        return this.data.toilets.filter(t => t.providerId === providerId);
    }

    getReviewsForToilet(toiletId) {
        return (this.data.reviews || []).filter(r => r.toiletId === toiletId);
    }

    addToilet(toiletData) {
        const prov = this.data.providers.find(p => p.id === toiletData.providerId) || {};
        const upi = toiletData.upiId || prov.upiId || 'host@okaxis';
        const qrImg = toiletData.qrCodeImage || prov.qrCodeImage || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('upi://pay?pa=' + upi + '&pn=' + encodeURIComponent(toiletData.name) + '&am=' + toiletData.price + '&cu=INR')}`;

        const newToilet = {
            id: 't-' + Date.now(),
            rating: 5.0,
            totalReviews: 1,
            cleanlinessScore: '98%',
            status: 'open',
            approvalStatus: 'approved',
            isVerified: true,
            isFeatured: false,
            upiId: upi,
            qrCodeImage: qrImg,
            images: toiletData.images && toiletData.images.length > 0 ? toiletData.images : [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
            ],
            ...toiletData
        };
        this.data.toilets.unshift(newToilet);
        this.save();
        return newToilet;
    }

    updateToilet(id, updateFields) {
        const index = this.data.toilets.findIndex(t => t.id === id);
        if (index !== -1) {
            this.data.toilets[index] = { ...this.data.toilets[index], ...updateFields };
            this.save();
            return this.data.toilets[index];
        }
        return null;
    }

    deleteToilet(id) {
        this.data.toilets = this.data.toilets.filter(t => t.id !== id);
        this.save();
    }

    // ================= TRANSACTIONS & REVIEWS =================
    createBooking({ toiletId, userId, amount, paymentMethod }) {
        const toilet = this.getToiletById(toiletId);
        const user = this.data.users.find(u => u.id === userId) || this.data.currentUser || { name: 'Citizen User' };
        
        const newBooking = {
            id: 'bk-' + Date.now(),
            toiletId,
            toiletName: toilet ? toilet.name : 'Public Restroom',
            userId: user.id || 'usr-guest',
            userName: user.name || 'Citizen User',
            providerId: toilet ? toilet.providerId : 'prov-1',
            amount: Number(amount),
            providerEarning: Number(amount),
            paymentMethod,
            paymentStatus: 'PAID (Direct to Host)',
            timestamp: new Date().toISOString(),
            status: 'Completed'
        };

        this.data.bookings.unshift(newBooking);

        // Credit provider
        if (toilet && toilet.providerId) {
            const prov = this.data.providers.find(p => p.id === toilet.providerId);
            if (prov) {
                prov.walletBalance = (prov.walletBalance || 0) + Number(amount);
                prov.totalEarned = (prov.totalEarned || 0) + Number(amount);
            }
        }

        // Deduct wallet if wallet pay
        if (paymentMethod === 'TOIGO Wallet' && user.id) {
            const dbUser = this.data.users.find(u => u.id === user.id);
            if (dbUser) {
                dbUser.walletBalance = Math.max(0, (dbUser.walletBalance || 0) - amount);
            }
        }

        this.save();
        return newBooking;
    }

    addReview({ toiletId, userId, userName, userAvatar, rating, hygieneTag, comment, photos }) {
        const newReview = {
            id: 'rev-' + Date.now(),
            toiletId,
            userId,
            userName: userName || 'Citizen User',
            userAvatar: userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            rating: Number(rating),
            hygieneTag: hygieneTag || '✨ Spotless Clean',
            comment: comment || 'Verified clean and hygienic washroom.',
            photos: photos || [],
            date: 'Just now'
        };

        if (!this.data.reviews) this.data.reviews = [];
        this.data.reviews.unshift(newReview);

        // Update toilet rating & cleanliness score
        const toiletReviews = this.data.reviews.filter(r => r.toiletId === toiletId);
        const avgRating = toiletReviews.reduce((sum, r) => sum + r.rating, 0) / toiletReviews.length;
        const hygieneScorePct = Math.round((avgRating / 5) * 100);

        this.updateToilet(toiletId, {
            rating: Number(avgRating.toFixed(1)),
            totalReviews: toiletReviews.length,
            cleanlinessScore: `${hygieneScorePct}%`
        });

        this.save();
        return newReview;
    }

    // ================= REPORT & ISSUE TICKETING SYSTEM =================
    addReport({ toiletId, userId, userName, category, description, photo }) {
        const toilet = this.getToiletById(toiletId);
        const newReport = {
            id: 'rep-' + Date.now(),
            toiletId,
            toiletName: toilet ? toilet.name : 'Unknown Toilet',
            userId: userId || 'usr-guest',
            userName: userName || 'Citizen',
            category: category || 'Poor Hygiene',
            description: description || 'Issue reported by citizen.',
            photo: photo || null,
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        if (!this.data.reports) this.data.reports = [];
        this.data.reports.unshift(newReport);
        this.save();
        return newReport;
    }

    resolveReport(reportId, adminNote = 'Issue inspected and resolved.') {
        const report = (this.data.reports || []).find(r => r.id === reportId);
        if (report) {
            report.status = 'resolved';
            report.resolvedAt = new Date().toISOString();
            report.adminNote = adminNote;
            this.save();
            return report;
        }
        return null;
    }

    dismissReport(reportId, dismissReason = 'Marked as false/invalid report.') {
        const report = (this.data.reports || []).find(r => r.id === reportId);
        if (report) {
            report.status = 'dismissed';
            report.dismissedAt = new Date().toISOString();
            report.dismissReason = dismissReason;
            this.save();
            return report;
        }
        return null;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0.8;
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Number((R * c).toFixed(2));
    }

    seedAroundUserLocation(userLat, userLng) {
        if (!userLat || !userLng) return;
        const offsets = [
            { dLat: 0.0021, dLng: 0.0018 },
            { dLat: -0.0019, dLng: 0.0025 },
            { dLat: 0.0035, dLng: -0.0022 },
            { dLat: -0.0031, dLng: -0.0019 }
        ];

        this.data.toilets.forEach((t, i) => {
            if (offsets[i]) {
                t.lat = Number((userLat + offsets[i].dLat).toFixed(6));
                t.lng = Number((userLng + offsets[i].dLng).toFixed(6));
            }
        });
        this.save();
    }
}

window.db = new ToigoDB();
