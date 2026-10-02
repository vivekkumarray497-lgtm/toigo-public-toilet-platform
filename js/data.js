/**
 * TOIGO: Find, Use & Pay - Data & Storage Layer
 * Supports Direct Provider QR/Bank details & Citizen Hygiene Photo Reviews
 */

const STORAGE_KEY = 'TOIGO_APP_DATA_V2';

// Default initial seed data
const defaultInitialData = {
    currentUser: null, // { id, name, email, phone, role: 'user'|'provider'|'admin', walletBalance, avatar }
    settings: {
        platformCommissionPct: 0, // 0% or direct payout to host
        sosEmergencyNumber: '112 / 108',
        announcements: [
            { id: 'ann-1', title: 'Welcome to TOIGO!', message: 'India’s #1 Smart Toilet Network. Direct UPI payment to hosts & citizen hygiene photo reviews.', date: 'Today' }
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
            bankAccountNo: '918273645012',
            bankIfsc: 'UTIB0000123',
            bankHolderName: 'Amit Verma',
            qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Damit.verma%40okaxis%26pn%3DSmartRest%20Washrooms%26cu%3DINR',
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
            businessName: 'Sunita Clean Restrooms',
            upiId: 'sunita976@ybl',
            bankAccountNo: '5010023491823',
            bankIfsc: 'HDFC0000456',
            bankHolderName: 'Sunita Devi',
            qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Dsunita976%40ybl%26pn%3DSunita%20Restrooms%26cu%3DINR',
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
                'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Hand Soap', 'Jet Spray', 'Mirror', 'Fresh Water', 'Sanitary Pad Dispenser'],
            timings: '07:00 AM - 10:00 PM',
            description: 'Clean commercial shop toilet maintained hourly. Separate Indian and Western commodes available.'
        },
        {
            id: 't-3',
            name: 'Public Metro Station Hygiene Complex',
            providerId: 'prov-1',
            providerName: 'Delhi Transit & SmartRest',
            phone: '+91 1123456789',
            upiId: 'amit.verma@okaxis',
            qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Damit.verma%40okaxis%26pn%3DMetro%20Toigo%26am%3D5%26cu%3DINR',
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
            description: 'Fast public toilet hub with quick turnaround, dedicated attendants and regular disinfection.'
        },
        {
            id: 't-4',
            name: 'Green Oasis Free Public Sanitation',
            providerId: 'prov-1',
            providerName: 'Municipal Smart City Project',
            phone: '+91 1800112233',
            upiId: 'free@municipal',
            qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=FREE_ACCESS',
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
            status: 'open',
            approvalStatus: 'approved',
            isVerified: true,
            isFeatured: false,
            images: [
                'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=600&q=80'
            ],
            amenities: ['Free Water', 'Soap Dispenser', 'Wheelchair Ramp', 'Solar Powered Lighting'],
            timings: '24 Hours',
            description: 'Free public community toilet funded by CSR.'
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
            paymentStatus: 'PAID',
            timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
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
            comment: 'Super clean, pleasant fragrance and jet spray had great pressure. Very safe!',
            photos: [
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'
            ],
            date: '2 hours ago'
        },
        {
            id: 'rev-2',
            toiletId: 't-2',
            userId: 'usr-2',
            userName: 'Priya Patel',
            userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
            rating: 5,
            hygieneTag: '🧼 Fresh & Sanitized',
            comment: 'Very safe for women. Clean mirror, sanitary pads available and dry floor.',
            photos: [
                'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=400&q=80'
            ],
            date: 'Yesterday'
        }
    ]
};

// Database Controller
class ToigoDB {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...defaultInitialData, ...parsed };
            }
        } catch (e) {
            console.error('Error loading data:', e);
        }
        this.save(defaultInitialData);
        return defaultInitialData;
    }

    save(dataToSave = null) {
        if (dataToSave) this.data = dataToSave;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

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
        const idLower = identifier.trim().toLowerCase();
        return this.data.users.find(u => u.phone === idLower || (u.email && u.email.toLowerCase() === idLower));
    }

    findProviderByPhoneOrEmail(identifier) {
        if (!identifier) return null;
        const idLower = identifier.trim().toLowerCase();
        return this.data.providers.find(p => p.phone === idLower || (p.email && p.email.toLowerCase() === idLower));
    }

    createUser(userData) {
        const newUser = {
            id: 'usr-' + Date.now(),
            walletBalance: 100,
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
        const upi = providerData.upiId || 'host@upi';
        const defaultQr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('upi://pay?pa=' + upi + '&pn=' + (providerData.businessName || providerData.name) + '&cu=INR')}`;

        const newProvider = {
            id: 'prov-' + Date.now(),
            walletBalance: 0,
            totalEarned: 0,
            status: 'verified',
            kycStatus: 'Approved',
            joinedAt: new Date().toISOString().split('T')[0],
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(providerData.name || 'Provider')}`,
            qrCodeImage: providerData.qrCodeImage || defaultQr,
            ...providerData,
            role: 'provider'
        };
        this.data.providers.push(newProvider);
        this.save();
        return newProvider;
    }

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

    createBooking({ toiletId, userId, amount, paymentMethod }) {
        const toilet = this.getToiletById(toiletId);
        const user = this.data.users.find(u => u.id === userId) || this.data.currentUser || { name: 'User' };
        
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
            userName: userName || 'Citizen',
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
