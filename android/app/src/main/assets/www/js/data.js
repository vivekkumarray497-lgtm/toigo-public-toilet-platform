/**
 * TOIGO: Client Data Sync Layer & Local Cache
 * Communicates with REST API while maintaining fast in-memory caching and offline resilience.
 */

class ToigoDataStore {
    constructor() {
        this.cache = {
            toilets: [],
            myReports: [],
            adminToilets: [],
            adminReports: [],
            notifications: []
        };
    }

    getPublicApprovedToilets() {
        return (this.cache.toilets || []).filter(t => t.status === 'APPROVED' && t.active !== false);
    }

    // Distance calculation helper (Haversine formula in KM)
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(2));
    }

    // ================= TOILETS API =================
    async fetchToilets(params = {}) {
        try {
            const res = await window.api.get('/toilets', params);
            if (res.success && Array.isArray(res.toilets)) {
                this.cache.toilets = res.toilets;
                return res.toilets;
            }
        } catch (e) {
            console.warn('Error fetching toilets from server, using cached seed:', e);
        }

        // Fallback seed toilets if server is offline or on static GitHub Pages
        if (!this.cache.toilets || this.cache.toilets.length === 0) {
            this.cache.toilets = [
                {
                    toiletId: 't-1',
                    providerId: 'prov-1',
                    providerName: 'Amit Verma',
                    name: 'SmartRest Luxury Lounge & Washrooms',
                    description: 'Ultra-hygienic premium air-conditioned washroom facility with automated touchless taps and sanitized seats.',
                    address: 'Block A, Connaught Place, Inner Circle, Near Metro Gate 3, New Delhi',
                    latitude: 28.6315,
                    longitude: 77.2167,
                    openingTime: '06:00 AM',
                    closingTime: '11:30 PM',
                    commodeType: 'English / Western',
                    genderType: 'Unisex & Separate Men/Women',
                    facilities: ['Air Conditioned', 'Hand Soap', 'Tissue / Toilet Paper', 'Jet Spray', 'Mirror', 'Running Water'],
                    accessibility: 'Wheelchair Accessible Ramp',
                    hygieneScore: 98,
                    cleanlinessScore: '98%',
                    price: 15,
                    isFree: false,
                    photos: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'],
                    status: 'APPROVED',
                    availability: 'OPEN',
                    active: true,
                    rating: 4.9,
                    totalReviews: 142
                },
                {
                    toiletId: 't-2',
                    providerId: 'prov-2',
                    providerName: 'Sunita Devi',
                    name: 'Sunita Clean & Safe Restroom (Shop Front)',
                    description: 'Clean and safe market washroom equipped with western commode, indian squat option, and clean water.',
                    address: 'Shop #12, Janpath Market Road, Opp Central Bank, New Delhi',
                    latitude: 28.6250,
                    longitude: 77.2185,
                    openingTime: '07:00 AM',
                    closingTime: '10:00 PM',
                    commodeType: 'Both (Indian & Western)',
                    genderType: 'Unisex',
                    facilities: ['Hand Soap', 'Jet Spray', 'Mirror', 'Running Water'],
                    accessibility: 'Ground Floor Entry',
                    hygieneScore: 94,
                    cleanlinessScore: '94%',
                    price: 10,
                    isFree: false,
                    photos: ['https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80'],
                    status: 'APPROVED',
                    availability: 'OPEN',
                    active: true,
                    rating: 4.7,
                    totalReviews: 89
                },
                {
                    toiletId: 't-3',
                    providerId: 'prov-1',
                    providerName: 'Amit Verma',
                    name: 'Metro Transit Public Sanitation Unit',
                    description: 'Free municipal & public sanitation booth accessible 24/7 with fresh water.',
                    address: 'Barakhamba Road, Near Metro Gate 2, New Delhi',
                    latitude: 28.6300,
                    longitude: 77.2250,
                    openingTime: '00:00 AM',
                    closingTime: '11:59 PM',
                    commodeType: 'English / Western',
                    genderType: 'Separate Men & Women',
                    facilities: ['Running Water', 'Jet Spray', 'Hand Soap', 'Mirror'],
                    accessibility: 'Wheelchair Accessible Ramp',
                    hygieneScore: 88,
                    cleanlinessScore: '88%',
                    price: 0,
                    isFree: true,
                    photos: ['https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80'],
                    status: 'APPROVED',
                    availability: 'OPEN',
                    active: true,
                    rating: 4.5,
                    totalReviews: 34
                },
                {
                    toiletId: 't-4',
                    providerId: 'prov-2',
                    providerName: 'Sunita Devi',
                    name: 'Central Park Green Restroom Pavilion',
                    description: 'Modern eco-friendly public restroom facility with baby changing station and touchless hand wash.',
                    address: 'Central Park Radial Road 1, Connaught Place, New Delhi',
                    latitude: 28.6328,
                    longitude: 77.2195,
                    openingTime: '05:30 AM',
                    closingTime: '10:30 PM',
                    commodeType: 'Both (Indian & Western)',
                    genderType: 'Unisex',
                    facilities: ['Running Water', 'Hand Soap', 'Tissue / Toilet Paper', 'Baby Changing Station', 'Mirror'],
                    accessibility: 'Wheelchair Accessible Ramp',
                    hygieneScore: 96,
                    cleanlinessScore: '96%',
                    price: 5,
                    isFree: false,
                    photos: ['https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=600&q=80'],
                    status: 'APPROVED',
                    availability: 'OPEN',
                    active: true,
                    rating: 4.8,
                    totalReviews: 67
                }
            ];
        }

        return this.cache.toilets || [];
    }

    async fetchToiletById(id) {
        try {
            const res = await window.api.get(`/toilets/${id}`);
            if (res.success && res.toilet) {
                return res.toilet;
            }
        } catch (e) {
            console.warn(`Error fetching toilet ${id}:`, e);
        }
        return (this.cache.toilets || []).find(t => t.toiletId === id) || null;
    }

    async addToilet(toiletData) {
        return await window.api.post('/providers/toilets', toiletData);
    }

    async updateToilet(id, updateData) {
        return await window.api.put(`/providers/toilets/${id}`, updateData);
    }

    async updateToiletStatus(id, availability, closureReason = '', expectedReopenAt = null) {
        return await window.api.patch(`/providers/toilets/${id}/status`, { availability, closureReason, expectedReopenAt });
    }

    async reopenToilet(id) {
        return await window.api.post(`/providers/toilets/${id}/reopen`);
    }

    async deleteToilet(id) {
        return await window.api.delete(`/providers/toilets/${id}`);
    }

    async fetchProviderToilets() {
        try {
            const res = await window.api.get('/providers/toilets');
            if (res.success && Array.isArray(res.toilets)) {
                return res.toilets;
            }
        } catch (e) {
            console.warn('Error fetching provider toilets:', e);
        }
        return [];
    }

    async fetchProviderToiletById(id) {
        return await window.api.get(`/providers/toilets/${id}`);
    }

    async fetchProviderReports() {
        try {
            const res = await window.api.get('/providers/reports');
            if (res.success && Array.isArray(res.reports)) {
                return res.reports;
            }
        } catch (e) {
            console.warn('Error fetching provider reports:', e);
        }
        return [];
    }

    async updateProviderReport(reportId, status, providerResponse = '') {
        return await window.api.patch(`/providers/reports/${reportId}`, { status, providerResponse });
    }

    async fetchProviderReviews() {
        try {
            const res = await window.api.get('/providers/reviews');
            if (res.success && Array.isArray(res.reviews)) {
                return res.reviews;
            }
        } catch (e) {
            console.warn('Error fetching provider reviews:', e);
        }
        return [];
    }

    async respondToReview(toiletId, reviewId, response) {
        return await window.api.post(`/providers/toilets/${toiletId}/reviews/${reviewId}/response`, { response });
    }

    async logMaintenance(toiletId, data) {
        return await window.api.post(`/providers/toilets/${toiletId}/maintenance`, data);
    }

    async fetchProviderActivity() {
        try {
            const res = await window.api.get('/providers/activity');
            if (res.success && Array.isArray(res.activities)) {
                return res.activities;
            }
        } catch (e) {
            console.warn('Error fetching provider activity:', e);
        }
        return [];
    }

    async updateProviderProfile(profileData) {
        return await window.api.put('/providers/profile', profileData);
    }

    async requestWithdrawal(amount, upiId) {
        return await window.api.post('/providers/withdraw', { amount, upiId });
    }

    // ================= REPORTS API =================
    async submitReport(reportData) {
        return await window.api.post('/reports', reportData);
    }

    async fetchMyReports() {
        try {
            const res = await window.api.get('/reports/my');
            if (res.success && Array.isArray(res.reports)) {
                this.cache.myReports = res.reports;
                return res.reports;
            }
        } catch (e) {
            console.warn('Error fetching my reports:', e);
        }
        return this.cache.myReports || [];
    }

    async fetchProviderReports() {
        try {
            const res = await window.api.get('/reports/provider');
            if (res.success && Array.isArray(res.reports)) {
                return res.reports;
            }
        } catch (e) {
            console.warn('Error fetching provider reports:', e);
        }
        return [];
    }

    async updateReportStatus(reportId, status, adminResponse) {
        return await window.api.put(`/reports/${reportId}`, { status, adminResponse });
    }

    // ================= REVIEWS API =================
    async submitReview(reviewData) {
        return await window.api.post('/reviews', reviewData);
    }

    async fetchToiletReviews(toiletId) {
        try {
            const res = await window.api.get(`/reviews/toilet/${toiletId}`);
            if (res.success && Array.isArray(res.reviews)) {
                return res.reviews;
            }
        } catch (e) {
            console.warn('Error fetching reviews:', e);
        }
        return [];
    }

    async deleteReview(reviewId) {
        return await window.api.delete(`/reviews/${reviewId}`);
    }

    // ================= PAYMENTS & ACCESS API =================
    async createPaymentOrder(toiletId, method) {
        return await window.api.post('/payments/create-order', { toiletId, method });
    }

    async verifyPayment(orderIdOrPayload, transactionId, method) {
        if (typeof orderIdOrPayload === 'object' && orderIdOrPayload !== null) {
            return await window.api.post('/payments/verify', orderIdOrPayload);
        }
        return await window.api.post('/payments/verify', { orderId: orderIdOrPayload, transactionId, paymentMethod: method });
    }

    async validateQrCode(qrData) {
        return await window.api.post('/access/validate-qr', { qrData });
    }

    async getActiveSession() {
        try {
            const res = await window.api.get('/access/active');
            if (res.success) {
                return res.activeSession;
            }
        } catch (e) {
            console.warn('Error checking active session:', e);
        }
        return null;
    }

    async completeAccessSession(sessionId) {
        return await window.api.post('/access/complete-session', { sessionId });
    }

    // ================= NOTIFICATIONS API =================
    async fetchNotifications() {
        try {
            const res = await window.api.get('/notifications');
            if (res.success && Array.isArray(res.notifications)) {
                this.cache.notifications = res.notifications;
                return res;
            }
        } catch (e) {
            console.warn('Error fetching notifications:', e);
        }
        return { success: true, count: 0, unreadCount: 0, notifications: [] };
    }

    async markNotificationRead(notifId) {
        return await window.api.put(`/notifications/${notifId}/read`);
    }

    async markAllNotificationsRead() {
        return await window.api.post('/notifications/read-all');
    }

    // Synchronous helper for instant access from cache
    getToiletById(toiletId) {
        return (this.cache.toilets || []).find(t => t.toiletId === toiletId) || null;
    }
}

window.db = new ToigoDataStore();
