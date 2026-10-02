/**
 * TOIGO: User Experience Flow (Find, Use & Pay)
 */

class UserFlowController {
    constructor() {
        this.selectedToiletId = null;
        this.activeBooking = null;
        this.usageTimerInterval = null;
        this.usageSeconds = 0;
        this.activeFilters = {
            query: '',
            type: 'all',
            maxPrice: 50,
            onlyOpen: false,
            minRating: 0,
            amenities: []
        };
    }

    init() {
        this.bindFilterEvents();
        this.renderToiletList();
    }

    bindFilterEvents() {
        // Search Input
        const searchInput = document.getElementById('search-toilet-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.activeFilters.query = e.target.value.toLowerCase().trim();
                this.applyFilters();
            });
        }

        // Type filter pills
        document.querySelectorAll('.filter-type-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-type-pill').forEach(b => b.classList.remove('active-filter'));
                btn.classList.add('active-filter');
                this.activeFilters.type = btn.dataset.type;
                this.applyFilters();
            });
        });

        // Price Filter
        const priceFilter = document.getElementById('price-filter-select');
        if (priceFilter) {
            priceFilter.addEventListener('change', (e) => {
                this.activeFilters.maxPrice = Number(e.target.value);
                this.applyFilters();
            });
        }
    }

    applyFilters() {
        const allToilets = window.db.getAllToilets();
        const userLat = window.toigoMap.userCoords.lat;
        const userLng = window.toigoMap.userCoords.lng;

        const filtered = allToilets.filter(t => {
            // Search query
            if (this.activeFilters.query) {
                const q = this.activeFilters.query;
                const matchName = t.name.toLowerCase().includes(q);
                const matchAddress = t.address.toLowerCase().includes(q);
                const matchCity = t.city?.toLowerCase().includes(q);
                const matchType = t.type.toLowerCase().includes(q);
                if (!matchName && !matchAddress && !matchCity && !matchType) return false;
            }

            // Type
            if (this.activeFilters.type !== 'all') {
                if (this.activeFilters.type === 'indian' && !t.type.includes('Indian')) return false;
                if (this.activeFilters.type === 'western' && !t.type.includes('Western') && !t.type.includes('English')) return false;
                if (this.activeFilters.type === 'free' && t.price > 0) return false;
                if (this.activeFilters.type === 'accessible' && !t.amenities.some(a => a.toLowerCase().includes('wheelchair'))) return false;
            }

            // Max Price
            if (this.activeFilters.maxPrice && t.price > this.activeFilters.maxPrice) {
                return false;
            }

            return true;
        });

        // Sort by distance from user
        filtered.sort((a, b) => {
            const distA = window.db.calculateDistance(userLat, userLng, a.lat, a.lng);
            const distB = window.db.calculateDistance(userLat, userLng, b.lat, b.lng);
            return distA - distB;
        });

        this.renderToiletList(filtered);
        window.toigoMap.renderToiletMarkers(filtered);
    }

    renderToiletList(toilets = null) {
        const container = document.getElementById('toilet-cards-container');
        if (!container) return;

        const list = toilets || window.db.getAllToilets();
        const userLat = window.toigoMap.userCoords.lat;
        const userLng = window.toigoMap.userCoords.lng;

        if (list.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                        🔍
                    </div>
                    <h3 class="font-bold text-gray-800 text-base mb-1">No Toilets Found Nearby</h3>
                    <p class="text-xs text-gray-500 mb-4">Try clearing filters or search in another area.</p>
                    <button onclick="window.userFlow.resetFilters()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
                        Reset All Filters
                    </button>
                </div>
            `;
            return;
        }

        const cardsHtml = list.map(t => {
            const dist = window.db.calculateDistance(userLat, userLng, t.lat, t.lng);
            const walkingMinutes = Math.max(1, Math.round(dist * 12)); // ~5 km/h walk speed
            const isFree = t.price === 0 || t.isFree;
            const priceTag = isFree ? '<span class="text-emerald-600 font-bold">FREE</span>' : `<span class="font-bold text-gray-900">₹${t.price}</span>`;
            
            // Type badge
            let typeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            if (t.type === 'Indian') typeColor = 'bg-amber-50 text-amber-700 border-amber-200';
            if (t.type.includes('Both')) typeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';

            const statusBadge = t.status === 'open' 
                ? '<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Open Now</span>'
                : '<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Cleaning</span>';

            const imgUrl = t.images && t.images[0] ? t.images[0] : 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80';

            return `
                <div onclick="window.userFlow.selectToilet('${t.id}')" 
                     class="toilet-card group cursor-pointer bg-white rounded-2xl p-3.5 border border-gray-100/80 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between">
                    
                    <div class="flex gap-3">
                        <div class="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                            <img src="${imgUrl}" alt="${t.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div class="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                ★ ${t.rating}
                            </div>
                        </div>

                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-1 mb-1">
                                <h4 class="font-bold text-gray-900 text-sm truncate group-hover:text-emerald-700 transition">
                                    ${t.name}
                                </h4>
                            </div>

                            <p class="text-xs text-gray-500 line-clamp-1 mb-2">
                                📍 ${t.address}
                            </p>

                            <div class="flex flex-wrap items-center gap-1.5 mb-2">
                                <span class="text-[10px] px-2 py-0.5 rounded-md border font-medium ${typeColor}">
                                    ${t.type}
                                </span>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>

                    <div class="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                        <div class="flex items-center gap-3 text-xs text-gray-600">
                            <span class="font-medium text-gray-700 flex items-center gap-1">
                                🚶 ${dist} km <span class="text-gray-400 font-normal">(${walkingMinutes} min)</span>
                            </span>
                            <span class="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                                ✨ ${t.cleanlinessScore || '96%'} Clean
                            </span>
                        </div>

                        <div class="flex items-center gap-2">
                            <div class="text-right">
                                <div class="text-sm">${priceTag}</div>
                            </div>
                            <button class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm group-hover:shadow-emerald-500/30 transition flex items-center gap-1">
                                <span>Use</span>
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = cardsHtml;
    }

    resetFilters() {
        this.activeFilters = {
            query: '',
            type: 'all',
            maxPrice: 50,
            onlyOpen: false,
            minRating: 0,
            amenities: []
        };
        const searchInput = document.getElementById('search-toilet-input');
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('.filter-type-pill').forEach((b, i) => {
            if (i === 0) b.classList.add('active-filter');
            else b.classList.remove('active-filter');
        });
        this.applyFilters();
    }

    selectToilet(toiletId) {
        this.selectedToiletId = toiletId;
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;

        // Draw route on map
        window.toigoMap.drawRouteToToilet(toilet);

        // Open Bottom Sheet / Modal
        this.openToiletDetailModal(toilet);
    }

    openToiletDetailModal(toilet) {
        const modal = document.getElementById('toilet-detail-modal');
        if (!modal) return;

        const userLat = window.toigoMap.userCoords.lat;
        const userLng = window.toigoMap.userCoords.lng;
        const dist = window.db.calculateDistance(userLat, userLng, toilet.lat, toilet.lng);
        const walkingMinutes = Math.max(1, Math.round(dist * 12));

        const amenitiesListHtml = (toilet.amenities || []).map(a => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl font-medium">
                <span class="text-emerald-600">✓</span> ${a}
            </span>
        `).join('');

        const imagesHtml = (toilet.images || []).map(img => `
            <div class="w-full h-52 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-inner">
                <img src="${img}" class="w-full h-full object-cover" />
            </div>
        `).join('');

        const isFree = toilet.price === 0 || toilet.isFree;

        const content = `
            <div class="relative max-h-[85vh] overflow-y-auto">
                <!-- Close Button -->
                <button onclick="window.userFlow.closeToiletDetailModal()" class="absolute top-3 right-3 z-20 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition">
                    ✕
                </button>

                <!-- Photo Header -->
                <div class="relative">
                    <div class="flex gap-2 overflow-x-auto snap-x snap-mandatory rounded-2xl p-1 no-scrollbar">
                        ${imagesHtml}
                    </div>
                    <div class="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <span class="text-amber-400">★ ${toilet.rating}</span>
                        <span class="text-gray-300">(${toilet.totalReviews || 0} reviews)</span>
                    </div>
                </div>

                <div class="p-5 space-y-4">
                    <!-- Title & Host -->
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${toilet.type === 'Indian' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                                ${toilet.type}
                            </span>
                            ${toilet.isVerified ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">🛡️ TOIGO Verified</span>' : ''}
                        </div>
                        <h2 class="text-xl font-extrabold text-gray-900">${toilet.name}</h2>
                        <p class="text-sm text-gray-600 mt-1 flex items-start gap-1">
                            <span>📍</span> ${toilet.address}
                        </p>
                    </div>

                    <!-- Metrics bar -->
                    <div class="grid grid-cols-3 gap-2.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                        <div>
                            <p class="text-[11px] text-gray-400 uppercase font-semibold">Distance</p>
                            <p class="text-sm font-bold text-gray-800 mt-0.5">${dist} km</p>
                            <span class="text-[10px] text-emerald-600">~${walkingMinutes} min walk</span>
                        </div>
                        <div class="border-x border-gray-200">
                            <p class="text-[11px] text-gray-400 uppercase font-semibold">Cleanliness</p>
                            <p class="text-sm font-bold text-emerald-600 mt-0.5">${toilet.cleanlinessScore || '98%'}</p>
                            <span class="text-[10px] text-gray-500">Hourly sanitized</span>
                        </div>
                        <div>
                            <p class="text-[11px] text-gray-400 uppercase font-semibold">Entry Fee</p>
                            <p class="text-base font-extrabold text-gray-900 mt-0.5">${isFree ? 'FREE' : '₹' + toilet.price}</p>
                            <span class="text-[10px] text-gray-500">Pay & Use</span>
                        </div>
                    </div>

                    <!-- About / Description -->
                    <div>
                        <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">Facility Overview</h4>
                        <p class="text-xs text-gray-600 leading-relaxed">${toilet.description || 'Clean, safe and maintained toilet facility with hygienic sanitary amenities.'}</p>
                    </div>

                    <!-- Amenities Checklist -->
                    <div>
                        <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Available Amenities</h4>
                        <div class="flex flex-wrap gap-1.5">
                            ${amenitiesListHtml}
                        </div>
                    </div>

                    <!-- Provider Info -->
                    <div class="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                ${toilet.providerName ? toilet.providerName[0] : 'H'}
                            </div>
                            <div>
                                <p class="text-xs font-bold text-gray-900">Hosted by ${toilet.providerName || 'Certified Partner'}</p>
                                <p class="text-[11px] text-emerald-700">🕒 Timings: ${toilet.timings || 'Open All Day'}</p>
                            </div>
                        </div>
                        <a href="tel:${toilet.phone || '112'}" class="p-2 bg-white rounded-xl text-emerald-700 hover:bg-emerald-100 shadow-sm transition">
                            📞
                        </a>
                    </div>

                    <!-- Action Buttons -->
                    <div class="pt-2 flex gap-2.5">
                        <button onclick="window.userFlow.openGoogleMapsRoute(${toilet.lat}, ${toilet.lng})" 
                                class="flex-1 py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition">
                            🧭 Google Maps
                        </button>

                        <button onclick="window.userFlow.startToiletSession('${toilet.id}')" 
                                class="flex-2 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition">
                            <span>Use & Pay (${isFree ? 'Free' : '₹' + toilet.price})</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('.modal-content-container').innerHTML = content;
        modal.classList.remove('hidden');
    }

    closeToiletDetailModal() {
        const modal = document.getElementById('toilet-detail-modal');
        if (modal) modal.classList.add('hidden');
        window.toigoMap.clearRoute();
    }

    openGoogleMapsRoute(lat, lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }

    // Start Use & Pay Process
    startToiletSession(toiletId) {
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;

        this.closeToiletDetailModal();

        // If not logged in, prompt quick login or guest auth
        if (!window.auth.isLoggedIn()) {
            window.app.showToast('Please sign in or continue as guest to unlock toilet entry', 'info');
            window.app.openAuthModal('user', () => {
                this.openQrScannerModal(toilet);
            });
            return;
        }

        this.openQrScannerModal(toilet);
    }

    openQrScannerModal(toilet) {
        const qrModal = document.getElementById('qr-scanner-modal');
        if (!qrModal) return;

        qrModal.querySelector('#qr-target-toilet-name').innerText = toilet.name;
        qrModal.querySelector('#qr-target-price').innerText = toilet.price === 0 ? 'FREE ENTRY' : `Entry Fee: ₹${toilet.price}`;
        qrModal.classList.remove('hidden');

        // Store for scanner action
        this.activeBooking = {
            toiletId: toilet.id,
            price: toilet.price,
            name: toilet.name
        };
    }

    closeQrScannerModal() {
        const qrModal = document.getElementById('qr-scanner-modal');
        if (qrModal) qrModal.classList.add('hidden');
    }

    // Simulate scanning the QR code at the physical toilet door
    simulateDoorQrScanned() {
        this.closeQrScannerModal();
        window.app.showToast('Door QR Code Verified! Washroom unlocked.', 'success');

        // Start usage timer screen
        this.startUsageTimer();
    }

    startUsageTimer() {
        const timerModal = document.getElementById('usage-timer-modal');
        if (!timerModal) return;

        this.usageSeconds = 0;
        clearInterval(this.usageTimerInterval);

        const toilet = window.db.getToiletById(this.activeBooking.toiletId);
        timerModal.querySelector('#usage-toilet-title').innerText = toilet ? toilet.name : 'Washroom Active';

        timerModal.classList.remove('hidden');

        this.usageTimerInterval = setInterval(() => {
            this.usageSeconds++;
            const mins = String(Math.floor(this.usageSeconds / 60)).padStart(2, '0');
            const secs = String(this.usageSeconds % 60).padStart(2, '0');
            const displayEl = document.getElementById('usage-timer-display');
            if (displayEl) displayEl.innerText = `${mins}:${secs}`;
        }, 1000);
    }

    finishToiletSession() {
        clearInterval(this.usageTimerInterval);
        const timerModal = document.getElementById('usage-timer-modal');
        if (timerModal) timerModal.classList.add('hidden');

        const toilet = window.db.getToiletById(this.activeBooking.toiletId);
        if (!toilet) return;

        // If free, skip payment straight to feedback
        if (toilet.price === 0 || toilet.isFree) {
            window.db.createBooking({
                toiletId: toilet.id,
                userId: window.auth.getCurrentUser()?.id,
                amount: 0,
                paymentMethod: 'Free Community Access'
            });
            this.openRatingModal(toilet.id);
            return;
        }

        // Open Payment Checkout Modal
        this.openPaymentCheckoutModal(toilet);
    }

    openPaymentCheckoutModal(toilet) {
        const payModal = document.getElementById('payment-checkout-modal');
        if (!payModal) return;

        const user = window.auth.getCurrentUser() || { walletBalance: 100 };
        const baseAmount = toilet.price;
        const discount = 0;
        const totalToPay = baseAmount - discount;

        payModal.querySelector('#pay-toilet-name').innerText = toilet.name;
        payModal.querySelector('#pay-base-price').innerText = `₹${baseAmount.toFixed(2)}`;
        payModal.querySelector('#pay-total-amount').innerText = `₹${totalToPay.toFixed(2)}`;
        payModal.querySelector('#pay-wallet-balance').innerText = `₹${user.walletBalance || 0}`;

        // UPI QR Code preview
        const upiLink = toilet.upiQrString || `upi://pay?pa=toigo@upi&pn=TOIGO%20Washrooms&am=${totalToPay}&cu=INR`;
        const qrImg = payModal.querySelector('#pay-upi-qr-img');
        if (qrImg) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;
        }

        payModal.classList.remove('hidden');
    }

    closePaymentCheckoutModal() {
        const payModal = document.getElementById('payment-checkout-modal');
        if (payModal) payModal.classList.add('hidden');
    }

    // Process payment
    executePayment(method) {
        const toilet = window.db.getToiletById(this.activeBooking.toiletId);
        const user = window.auth.getCurrentUser();

        if (method === 'TOIGO Wallet') {
            if ((user?.walletBalance || 0) < toilet.price) {
                window.app.showToast('Insufficient wallet balance. Please use UPI or Cash.', 'error');
                return;
            }
        }

        // Create booking
        const booking = window.db.createBooking({
            toiletId: toilet.id,
            userId: user?.id,
            amount: toilet.price,
            paymentMethod: method
        });

        this.closePaymentCheckoutModal();

        // Celebration
        if (window.confetti) {
            window.confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        window.app.showToast(`Payment of ₹${toilet.price} successful via ${method}!`, 'success');

        // Open Rating & Review Modal
        this.openRatingModal(toilet.id, booking.id);
    }

    openRatingModal(toiletId, bookingId = null) {
        const ratingModal = document.getElementById('rating-feedback-modal');
        if (!ratingModal) return;

        ratingModal.dataset.toiletId = toiletId;
        ratingModal.dataset.bookingId = bookingId || '';
        ratingModal.classList.remove('hidden');
    }

    submitRating(stars, comment) {
        const ratingModal = document.getElementById('rating-feedback-modal');
        if (!ratingModal) return;

        const toiletId = ratingModal.dataset.toiletId;
        const user = window.auth.getCurrentUser() || { name: 'Verified Citizen' };

        window.db.addReview({
            toiletId,
            userId: user.id || 'usr-guest',
            userName: user.name || 'User',
            rating: stars,
            comment: comment || 'Clean and well maintained.'
        });

        ratingModal.classList.add('hidden');
        window.app.showToast('Thank you for helping keep public sanitation clean! 🌟', 'success');

        // Refresh cards
        this.applyFilters();
    }
}

window.userFlow = new UserFlowController();
