/**
 * TOIGO: Find, Use & Pay - Data & Storage Layer
 * Manages Mock Database, LocalStorage sync, Seed Data & CRUD operations
 */

const STORAGE_KEY = 'TOIGO_APP_DATA_V1';

// Default initial state
const defaultInitialData = {
    currentUser: null, // { id, name, email, phone, role: 'user'|'provider'|'admin', walletBalance, avatar }
    settings: {
        platformCommissionPct: 10, // 10% platform fee for founder
        sosEmergencyNumber: '112 / 108',
        announcements: [
            { id: 'ann-1', title: 'Welcome to TOIGO!', message: 'India’s #1 Smart Public & Private Toilet Network. Hygienic, safe & pay-per-use.', date: 'Today' }
        ]
    },
    users: [
        {
            id: 'usr-1',
            name: 'Rahul Sharma',
            email: 'rahul.sharma@example.com',
            phone: '9876543210',
            role: 'user',
            walletBalance: 150,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            status: 'active',
            joinedAt: '2026-08-15',
            favoriteToilets: ['t-1', 't-3']
        },
        {
            id: 'usr-2',
            name: 'Priya Patel',
            email: 'priya.p@example.com',
            phone: '9812345678',
            role: 'user',
            walletBalance: 80,
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
            status: 'active',
            joinedAt: '2026-09-01',
            favoriteToilets: ['t-2']
        }
    ],
    providers: [
        {
            id: 'prov-1',
            name: 'Amit Verma (SmartRest)',
            email: 'amit.verma@restpoint.in',
            phone: '9899001122',
            role: 'provider',
            businessName: 'SmartRest Commercial Sanitations',
            upiId: 'amit.verma@okaxis',
            walletBalance: 4200,
            totalEarned: 18500,
            status: 'verified',
            kycStatus: 'Approved',
            joinedAt: '2026-07-10',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
        },
        {
            id: 'prov-2',
            name: 'Sunita Devi',
            email: 'sunita.devi@cafesan.com',
            phone: '9765432109',
            role: 'provider',
            businessName: 'Sunita Clean Restrooms (Home/Shop Host)',
            upiId: 'sunita976@ybl',
            walletBalance: 1850,
            totalEarned: 6400,
            status: 'verified',
            kycStatus: 'Approved',
            joinedAt: '2026-08-20',
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
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
            providerName: 'Amit Verma (SmartRest)',
            phone: '+91 9899001122',
            address: 'Block A, Connaught Place, Inner Circle, Near Metro Gate 3',
            city: 'New Delhi',
            lat: 28.6315,
            lng: 77.2167,
            type: 'English / Western', // 'Indian', 'English / Western', 'Both (Indian & Western)', 'Urinal Only'
            genderType: 'Unisex & Separate Men/Women',
            price: 15,
            isFree: false,
            rating: 4.9,
            totalReviews: 142,
            cleanlinessScore: '98%',
            status: 'open', // 'open', 'closed', 'cleaning'
            approvalStatus: 'approved', // 'pending', 'approved', 'rejected'
            isVerified: true,
            isFeatured: true,
            images: [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Air Conditioned', 'Hand Soap', 'Tissue / Toilet Paper', 'Hand Sanitizer', 'Jet Spray', 'Wheelchair Accessible', 'Mirror', 'Sanitary Pad Dispenser', 'Baby Care Station'],
            timings: '06:00 AM - 11:30 PM',
            upiQrString: 'upi://pay?pa=amit.verma@okaxis&pn=SmartRest%20Toilets&am=15&cu=INR',
            description: 'Ultra-hygienic premium air-conditioned washroom facility with automated touchless taps, sanitized seats and full handicap access.'
        },
        {
            id: 't-2',
            name: 'Sunita Clean & Safe Restroom (Shop Front)',
            providerId: 'prov-2',
            providerName: 'Sunita Devi',
            phone: '+91 9765432109',
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
                'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Hand Soap', 'Jet Spray', 'Mirror', 'Fresh Water', 'Sanitary Pad Dispenser'],
            timings: '07:00 AM - 10:00 PM',
            upiQrString: 'upi://pay?pa=sunita976@ybl&pn=Sunita%20Restrooms&am=10&cu=INR',
            description: 'Clean commercial shop toilet maintained hourly. Separate Indian and Western commodes available.'
        },
        {
            id: 't-3',
            name: 'Public Metro Station Hygiene Complex',
            providerId: 'prov-1',
            providerName: 'Delhi Transit & SmartRest',
            phone: '+91 1123456789',
            address: 'Rajiv Chowk Metro Concourse, Gate 6',
            city: 'New Delhi',
            lat: 28.6328,
            lng: 77.2195,
            type: 'Indian',
            genderType: 'Separate Men & Women',
            price: 5,
            isFree: false,
            rating: 4.4,
            totalReviews: 310,
            cleanlinessScore: '89%',
            status: 'open',
            approvalStatus: 'approved',
            isVerified: true,
            isFeatured: false,
            images: [
                'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Hand Soap', 'Running Tap Water', 'Dustbin', 'Wheelchair Accessible'],
            timings: '05:30 AM - 11:45 PM',
            upiQrString: 'upi://pay?pa=amit.verma@okaxis&pn=Metro%20Toigo&am=5&cu=INR',
            description: 'Fast public toilet hub with quick turnaround, dedicated attendants and regular disinfection.'
        },
        {
            id: 't-4',
            name: 'Green Oasis Free Public Sanitation',
            providerId: 'prov-1',
            providerName: 'Municipal Smart City Project',
            phone: '+91 1800112233',
            address: 'Central Park North Lawn, Near Fountain',
            city: 'New Delhi',
            lat: 28.6342,
            lng: 77.2170,
            type: 'Both (Indian & Western)',
            genderType: 'Separate Men, Women & Transgender',
            price: 0,
            isFree: true,
            rating: 4.2,
            totalReviews: 64,
            cleanlinessScore: '85%',
            status: 'cleaning',
            approvalStatus: 'approved',
            isVerified: true,
            isFeatured: false,
            images: [
                'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Free Water', 'Soap Dispenser', 'Wheelchair Ramp', 'Solar Powered Lighting'],
            timings: '24 Hours',
            upiQrString: 'upi://pay?pa=amit.verma@okaxis&pn=Free%20Public%20Toilet&am=0&cu=INR',
            description: 'Free public community toilet funded by CSR. Currently undergoing routine 15-minute sanitization cycle.'
        },
        {
            id: 't-5',
            name: 'Royal Comfort Cafe & Rest Lounge',
            providerId: 'prov-2',
            providerName: 'Sunita Devi',
            phone: '+91 9765432109',
            address: 'Kasturba Gandhi Marg, Near Barakhamba Road',
            city: 'New Delhi',
            lat: 28.6280,
            lng: 77.2240,
            type: 'English / Western',
            genderType: 'Unisex',
            price: 20,
            isFree: false,
            rating: 4.95,
            totalReviews: 53,
            cleanlinessScore: '99%',
            status: 'open',
            approvalStatus: 'approved',
            isVerified: true,
            isFeatured: true,
            images: [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Air Conditioned', 'Premium Fragrance', 'Tissue / Toilet Paper', 'Hand Dryer', 'Warm Water', 'Sanitary Pad Dispenser', 'Mirror'],
            timings: '08:00 AM - 11:00 PM',
            upiQrString: 'upi://pay?pa=sunita976@ybl&pn=Royal%20Comfort&am=20&cu=INR',
            description: 'Premium boutique restroom with luxury automated fixtures, organic soap, and refreshing aroma.'
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
            platformFee: 1.5,
            providerEarning: 13.5,
            paymentMethod: 'UPI (GPay)',
            paymentStatus: 'PAID',
            timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
            status: 'Completed',
            ratingGiven: 5,
            reviewText: 'Extremely clean and aromatic! Worth every rupee.'
        },
        {
            id: 'bk-102',
            toiletId: 't-2',
            toiletName: 'Sunita Clean & Safe Restroom (Shop Front)',
            userId: 'usr-2',
            userName: 'Priya Patel',
            providerId: 'prov-2',
            amount: 10,
            platformFee: 1.0,
            providerEarning: 9.0,
            paymentMethod: 'TOIGO Wallet',
            paymentStatus: 'PAID',
            timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
            status: 'Completed',
            ratingGiven: 5,
            reviewText: 'Very safe for women, good lock and sanitary pads available.'
        },
        {
            id: 'bk-103',
            toiletId: 't-3',
            toiletName: 'Public Metro Station Hygiene Complex',
            userId: 'usr-1',
            userName: 'Rahul Sharma',
            providerId: 'prov-1',
            amount: 5,
            platformFee: 0.5,
            providerEarning: 4.5,
            paymentMethod: 'Paytm UPI',
            paymentStatus: 'PAID',
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
            status: 'Completed',
            ratingGiven: 4,
            reviewText: 'Quick entry via QR scan.'
        }
    ],
    payoutRequests: [
        {
            id: 'po-1',
            providerId: 'prov-1',
            providerName: 'Amit Verma (SmartRest)',
            amount: 2500,
            upiId: 'amit.verma@okaxis',
            status: 'pending', // 'pending', 'approved', 'rejected'
            requestedAt: new Date(Date.now() - 3600000 * 18).toISOString()
        }
    ],
    reviews: [
        {
            id: 'rev-1',
            toiletId: 't-1',
            userId: 'usr-1',
            userName: 'Rahul Sharma',
            rating: 5,
            comment: 'Super clean, smelled great and very convenient!',
            date: '2 hours ago'
        },
        {
            id: 'rev-2',
            toiletId: 't-2',
            userId: 'usr-2',
            userName: 'Priya Patel',
            rating: 5,
            comment: 'Safe, private and hygiene maintained with proper water supply.',
            date: 'Yesterday'
        }
    ]
};

// Application Database Controller
class ToigoDB {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // merge with defaults in case of missing keys
                return { ...defaultInitialData, ...parsed };
            }
        } catch (e) {
            console.error('Error loading TOIGO data from localStorage:', e);
        }
        this.save(defaultInitialData);
        return defaultInitialData;
    }

    save(dataToSave = null) {
        if (dataToSave) this.data = dataToSave;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Error saving TOIGO data to localStorage:', e);
        }
    }

    // Auth helpers
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

    // User CRUD
    findUserByPhoneOrEmail(identifier) {
        const idLower = identifier.trim().toLowerCase();
        return this.data.users.find(u => u.phone === idLower || u.email.toLowerCase() === idLower);
    }

    findProviderByPhoneOrEmail(identifier) {
        const idLower = identifier.trim().toLowerCase();
        return this.data.providers.find(p => p.phone === idLower || p.email.toLowerCase() === idLower);
    }

    createUser(userData) {
        const newUser = {
            id: 'usr-' + Date.now(),
            walletBalance: 100, // Welcome gift ₹100
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userData.name || 'User')}`,
            status: 'active',
            joinedAt: new Date().toISOString().split('T')[0],
            favoriteToilets: [],
            ...userData,
            role: 'user'
        };
        this.data.users.push(newUser);
        this.save();
        return newUser;
    }

    createProvider(providerData) {
        const newProvider = {
            id: 'prov-' + Date.now(),
            walletBalance: 0,
            totalEarned: 0,
            status: 'verified',
            kycStatus: 'Approved',
            joinedAt: new Date().toISOString().split('T')[0],
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(providerData.name || 'Provider')}`,
            ...providerData,
            role: 'provider'
        };
        this.data.providers.push(newProvider);
        this.save();
        return newProvider;
    }

    // Toilet CRUD
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

    addToilet(toiletData) {
        const newToilet = {
            id: 't-' + Date.now(),
            rating: 5.0,
            totalReviews: 1,
            cleanlinessScore: '98%',
            status: 'open',
            approvalStatus: 'approved', // Auto approved for instant host gratification
            isVerified: true,
            isFeatured: false,
            images: toiletData.images && toiletData.images.length > 0 ? toiletData.images : [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'
            ],
            upiQrString: `upi://pay?pa=${toiletData.upiId || 'host@toigo'}&pn=${encodeURIComponent(toiletData.name)}&am=${toiletData.price}&cu=INR`,
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

    // Bookings & Transactions
    createBooking({ toiletId, userId, amount, paymentMethod }) {
        const toilet = this.getToiletById(toiletId);
        const user = this.data.users.find(u => u.id === userId) || this.data.currentUser || { name: 'Guest User' };
        
        const commPct = this.data.settings.platformCommissionPct || 10;
        const platformFee = Number(((amount * commPct) / 100).toFixed(2));
        const providerEarning = Number((amount - platformFee).toFixed(2));

        const newBooking = {
            id: 'bk-' + Date.now(),
            toiletId,
            toiletName: toilet ? toilet.name : 'Public Toilet',
            userId: user.id || 'usr-guest',
            userName: user.name || 'User',
            providerId: toilet ? toilet.providerId : 'prov-1',
            amount: Number(amount),
            platformFee,
            providerEarning,
            paymentMethod,
            paymentStatus: 'PAID',
            timestamp: new Date().toISOString(),
            status: 'Completed',
            ratingGiven: null,
            reviewText: null
        };

        this.data.bookings.unshift(newBooking);

        // Update provider earnings
        if (toilet && toilet.providerId) {
            const prov = this.data.providers.find(p => p.id === toilet.providerId);
            if (prov) {
                prov.walletBalance = (prov.walletBalance || 0) + providerEarning;
                prov.totalEarned = (prov.totalEarned || 0) + providerEarning;
            }
        }

        // Deduct from user wallet if wallet payment
        if (paymentMethod === 'TOIGO Wallet' && user.id) {
            const dbUser = this.data.users.find(u => u.id === user.id);
            if (dbUser) {
                dbUser.walletBalance = Math.max(0, (dbUser.walletBalance || 0) - amount);
            }
        }

        this.save();
        return newBooking;
    }

    addReview({ toiletId, userId, userName, rating, comment }) {
        const newReview = {
            id: 'rev-' + Date.now(),
            toiletId,
            userId,
            userName,
            rating: Number(rating),
            comment,
            date: 'Just now'
        };
        this.data.reviews.unshift(newReview);

        // Update toilet average rating
        const toiletReviews = this.data.reviews.filter(r => r.toiletId === toiletId);
        const avg = toiletReviews.reduce((sum, r) => sum + r.rating, 0) / toiletReviews.length;
        this.updateToilet(toiletId, {
            rating: Number(avg.toFixed(1)),
            totalReviews: toiletReviews.length
        });

        this.save();
        return newReview;
    }

    // Payout Requests
    requestPayout(providerId, amount, upiId) {
        const prov = this.data.providers.find(p => p.id === providerId);
        if (!prov) throw new Error('Provider not found');
        if (prov.walletBalance < amount) throw new Error('Insufficient wallet balance');

        prov.walletBalance -= amount;
        const payout = {
            id: 'po-' + Date.now(),
            providerId,
            providerName: prov.name,
            amount,
            upiId,
            status: 'pending',
            requestedAt: new Date().toISOString()
        };
        this.data.payoutRequests.unshift(payout);
        this.save();
        return payout;
    }

    resolvePayout(payoutId, newStatus) {
        const po = this.data.payoutRequests.find(p => p.id === payoutId);
        if (po) {
            po.status = newStatus;
            if (newStatus === 'rejected') {
                // Refund provider wallet
                const prov = this.data.providers.find(p => p.id === po.providerId);
                if (prov) prov.walletBalance += po.amount;
            }
            this.save();
            return po;
        }
        return null;
    }

    // Distance calculation helper (Haversine formula in Kilometers)
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0.8;
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return Number(d.toFixed(2));
    }

    // Relocate demo toilets around user's live coordinates so map is immediately full of nearby pins!
    seedAroundUserLocation(userLat, userLng) {
        if (!userLat || !userLng) return;
        const offsets = [
            { dLat: 0.0021, dLng: 0.0018, name: 'SmartRest Luxury Washroom (Near You)' },
            { dLat: -0.0019, dLng: 0.0025, name: 'Sunita Clean Restroom & Indian Pan' },
            { dLat: 0.0035, dLng: -0.0022, name: 'City Metro Station Pay & Use' },
            { dLat: -0.0031, dLng: -0.0019, name: 'Free Public Eco Sanitation Complex' },
            { dLat: 0.0012, dLng: 0.0041, name: 'Royal Comfort Western Lounge' }
        ];

        this.data.toilets.forEach((t, i) => {
            if (offsets[i]) {
                t.lat = Number((userLat + offsets[i].dLat).toFixed(6));
                t.lng = Number((userLng + offsets[i].dLng).toFixed(6));
            }
        });
        this.save();
    }

    resetAllData() {
        localStorage.removeItem(STORAGE_KEY);
        this.data = JSON.parse(JSON.stringify(defaultInitialData));
        this.save();
    }
}

// Global Singleton Instance
window.db = new ToigoDB();
