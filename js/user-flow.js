/**
 * TOIGO: User Flow Controller (Find, Use, Direct Host Pay, Report Issues & Hygiene Photo Reviews)
 * Strictly enforces login on protected actions while allowing guests to browse the public directory.
 */

class UserFlowController {
    constructor() {
        this.selectedToiletId = null;
        this.activeBooking = null;
        this.usageTimerInterval = null;
        this.usageSeconds = 0;
        this.uploadedReviewPhotos = [];
        this.uploadedReportPhoto = null;
        this.selectedRatingStars = 5;
        this.selectedHygieneTag = '✨ Spotless Clean';
        this.selectedReportCategory = 'Poor Hygiene';
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
        const searchInput = document.getElementById('search-toilet-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.activeFilters.query = e.target.value.toLowerCase().trim();
                this.applyFilters();
            });
        }

        document.querySelectorAll('.filter-type-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-type-pill').forEach(b => b.classList.remove('active-filter'));
                btn.classList.add('active-filter');
                this.activeFilters.type = btn.dataset.type;
                this.applyFilters();
            });
        });
    }

    applyFilters() {
        const allToilets = window.db.getAllToilets();
        const userLat = window.toigoMap.userCoords.lat;
        const userLng = window.toigoMap.userCoords.lng;

        const filtered = allToilets.filter(t => {
            if (this.activeFilters.query) {
                const q = this.activeFilters.query;
                const matchName = t.name.toLowerCase().includes(q);
                const matchAddress = t.address.toLowerCase().includes(q);
                const matchType = t.type.toLowerCase().includes(q);
                if (!matchName && !matchAddress && !matchType) return false;
            }

            if (this.activeFilters.type !== 'all') {
                if (this.activeFilters.type === 'indian' && !t.type.includes('Indian')) return false;
                if (this.activeFilters.type === 'western' && !t.type.includes('Western') && !t.type.includes('English')) return false;
                if (this.activeFilters.type === 'free' && t.price > 0) return false;
                if (this.activeFilters.type === 'accessible' && !t.amenities.some(a => a.toLowerCase().includes('wheelchair'))) return false;
            }

            if (this.activeFilters.maxPrice && t.price > this.activeFilters.maxPrice) {
                return false;
            }

            return true;
        });

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
                <div class="p-6 text-center bg-white rounded-2xl border border-slate-100 col-span-full">
                    <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                        🔍
                    </div>
                    <h3 class="font-bold text-slate-800 text-xs mb-1">No Toilets Found Nearby</h3>
                    <p class="text-[11px] text-slate-400 mb-3">Try adjusting your filters or location search.</p>
                    <button onclick="window.userFlow.resetFilters()" class="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl">
                        Reset Filters
                    </button>
                </div>
            `;
            return;
        }

        const cardsHtml = list.map(t => {
            const dist = window.db.calculateDistance(userLat, userLng, t.lat, t.lng);
            const isFree = t.price === 0 || t.isFree;
            const priceTag = isFree ? '<span class="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px]">FREE</span>' : `<span class="font-black text-slate-900">₹${t.price}</span>`;
            const walkingMinutes = Math.max(1, Math.round(dist * 12));

            return `
                <div onclick="window.userFlow.selectToilet('${t.id}')" 
                     class="bg-white/95 hover:bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between">
                    
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 mb-1">
                                <span class="px-2 py-0.5 rounded-md text-[9px] font-extrabold ${t.type === 'Indian' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}">
                                    ${t.type}
                                </span>
                                <span class="text-[10px] text-slate-400 font-medium">● Open</span>
                            </div>
                            <h4 class="font-bold text-xs text-slate-900 truncate leading-tight">${t.name}</h4>
                            <p class="text-[10px] text-slate-500 truncate mt-0.5">${t.address}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <span class="inline-flex items-center gap-0.5 text-xs font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">
                                ★ ${t.rating}
                            </span>
                        </div>
                    </div>

                    <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span class="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            🚶 ${dist} km <span class="text-slate-400 font-normal">(${walkingMinutes}m)</span>
                        </span>

                        <div class="flex items-center gap-2">
                            <span class="text-xs">${priceTag}</span>
                            <button class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                                View →
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

        window.toigoMap.drawRouteToToilet(toilet);
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
            <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl font-medium">
                <span class="text-emerald-600">✓</span> ${a}
            </span>
        `).join('');

        const imagesHtml = (toilet.images || []).map(img => `
            <div class="w-full h-48 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-inner">
                <img src="${img}" class="w-full h-full object-cover" />
            </div>
        `).join('');

        // Fetch citizen reviews with uploaded photos
        const reviews = window.db.getReviewsForToilet(toilet.id);
        const reviewsHtml = reviews.length === 0 ? `
            <p class="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl text-center">No citizen photo reviews yet. Be the first to review!</p>
        ` : reviews.map(r => `
            <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <img src="${r.userAvatar}" class="w-6 h-6 rounded-full object-cover" />
                        <div>
                            <span class="font-bold text-xs text-slate-900">${r.userName}</span>
                            <span class="text-[10px] text-slate-400 ml-1.5">${r.date}</span>
                        </div>
                    </div>
                    <span class="text-xs text-amber-500 font-bold">★ ${r.rating}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">${r.hygieneTag || 'Clean'}</span>
                </div>
                <p class="text-xs text-slate-600">${r.comment}</p>
                ${r.photos && r.photos.length > 0 ? `
                    <div class="flex gap-2 mt-1 overflow-x-auto">
                        ${r.photos.map(p => `
                            <img src="${p}" class="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs cursor-pointer" onclick="window.open('${p}', '_blank')" />
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');

        const isFree = toilet.price === 0 || toilet.isFree;

        const content = `
            <div class="relative max-h-[88vh] overflow-y-auto">
                <button onclick="window.userFlow.closeToiletDetailModal()" class="absolute top-3 right-3 z-20 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition">
                    ✕
                </button>

                <div class="relative">
                    <div class="flex gap-2 overflow-x-auto snap-x snap-mandatory rounded-2xl p-1 no-scrollbar">
                        ${imagesHtml}
                    </div>
                    <div class="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <span class="text-amber-400">★ ${toilet.rating}</span>
                        <span class="text-slate-300">(${toilet.totalReviews || 0} citizen reviews)</span>
                    </div>
                </div>

                <div class="p-5 space-y-4">
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${toilet.type === 'Indian' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                                    ${toilet.type}
                                </span>
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">🛡️ Verified Host</span>
                            </div>

                            <!-- Report issue button (Protected Action) -->
                            <button onclick="window.userFlow.openReportModal('${toilet.id}')" class="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                                🚩 Report Problem
                            </button>
                        </div>
                        <h2 class="text-xl font-black text-slate-900 font-heading">${toilet.name}</h2>
                        <p class="text-xs text-slate-600 mt-1 flex items-start gap-1">
                            <span>📍</span> ${toilet.address}
                        </p>
                    </div>

                    <!-- Metrics Grid -->
                    <div class="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs">
                        <div>
                            <p class="text-[10px] text-slate-400 uppercase font-bold">Distance</p>
                            <p class="font-extrabold text-slate-900 mt-0.5">${dist} km</p>
                            <span class="text-[10px] text-emerald-600 font-semibold">~${walkingMinutes} min walk</span>
                        </div>
                        <div class="border-x border-slate-200">
                            <p class="text-[10px] text-slate-400 uppercase font-bold">Hygiene Score</p>
                            <p class="font-extrabold text-emerald-600 mt-0.5">${toilet.cleanlinessScore || '98%'}</p>
                            <span class="text-[10px] text-slate-500">Live verified</span>
                        </div>
                        <div>
                            <p class="text-[10px] text-slate-400 uppercase font-bold">Direct Entry Fee</p>
                            <p class="font-black text-slate-900 mt-0.5">${isFree ? 'FREE' : '₹' + toilet.price}</p>
                            <span class="text-[10px] text-emerald-700 font-semibold">Pay direct to Host</span>
                        </div>
                    </div>

                    <!-- Facility Status -->
                    <div class="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                🚻
                            </div>
                            <div>
                                <p class="text-xs font-bold text-slate-900">Verified Public Sanitation Facility</p>
                                <p class="text-[10px] text-emerald-800">🕒 Timings: ${toilet.timings || '06:00 AM - 11:00 PM'}</p>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 bg-white text-emerald-700 font-bold text-[10px] rounded-xl border border-emerald-200">
                            ● OPEN NOW
                        </span>
                    </div>

                    <!-- Amenities -->
                    <div>
                        <h4 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Facility Amenities</h4>
                        <div class="flex flex-wrap gap-1.5">
                            ${amenitiesListHtml}
                        </div>
                    </div>

                    <!-- Citizen Hygiene Reviews & Uploaded Photos -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Citizen Hygiene Reviews & Photos (${reviews.length})</h4>
                        </div>
                        <div class="space-y-2.5">
                            ${reviewsHtml}
                        </div>
                    </div>

                    <!-- Action Buttons (Protected Actions) -->
                    <div class="pt-2 flex gap-2">
                        <button onclick="window.userFlow.openGoogleMapsRoute(${toilet.lat}, ${toilet.lng})" 
                                class="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs flex items-center justify-center gap-1 transition">
                            🧭 Google Maps
                        </button>

                        <button onclick="window.userFlow.startToiletSession('${toilet.id}')" 
                                class="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition">
                            <span>Use & Pay (${isFree ? 'Free' : '₹' + toilet.price})</span>
                            <span>⚡</span>
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

    // Google Maps Navigation - Protected Action (Requires verified login)
    openGoogleMapsRoute(lat, lng) {
        if (!window.auth.isLoggedIn()) {
            this.closeToiletDetailModal();
            window.auth.requireLogin('user', () => {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
            });
            return;
        }
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }

    // Start Toilet Session (Strict Login Enforced!)
    startToiletSession(toiletId) {
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;

        if (!window.auth.isLoggedIn()) {
            this.closeToiletDetailModal();
            window.auth.requireLogin('user', () => {
                this.openQrScannerModal(toilet);
            });
            return;
        }

        this.closeToiletDetailModal();
        this.openQrScannerModal(toilet);
    }

    openQrScannerModal(toilet) {
        const qrModal = document.getElementById('qr-scanner-modal');
        if (!qrModal) return;

        qrModal.querySelector('#qr-target-toilet-name').innerText = toilet.name;
        qrModal.querySelector('#qr-target-price').innerText = toilet.price === 0 ? 'FREE ENTRY' : `Direct Host Entry Fee: ₹${toilet.price}`;
        qrModal.classList.remove('hidden');

        this.activeBooking = {
            toiletId: toilet.id,
            price: toilet.price,
            name: toilet.name,
            providerId: toilet.providerId,
            upiId: toilet.upiId,
            qrCodeImage: toilet.qrCodeImage
        };
    }

    closeQrScannerModal() {
        const qrModal = document.getElementById('qr-scanner-modal');
        if (qrModal) qrModal.classList.add('hidden');
    }

    simulateDoorQrScanned() {
        this.closeQrScannerModal();
        window.app.showToast('Door QR Verified! Restroom latch unlocked.', 'success');
        this.startUsageTimer();
    }

    startUsageTimer() {
        const timerModal = document.getElementById('usage-timer-modal');
        if (!timerModal) return;

        this.usageSeconds = 0;
        clearInterval(this.usageTimerInterval);

        const toilet = window.db.getToiletById(this.activeBooking.toiletId);
        timerModal.querySelector('#usage-toilet-title').innerText = toilet ? toilet.name : 'Restroom Active';
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

        this.openPaymentCheckoutModal(toilet);
    }

    // Direct Host Payment Checkout Modal
    openPaymentCheckoutModal(toilet) {
        const payModal = document.getElementById('payment-checkout-modal');
        if (!payModal) return;

        const user = window.auth.getCurrentUser() || { walletBalance: 100 };
        const totalToPay = toilet.price;

        payModal.querySelector('#pay-toilet-name').innerText = toilet.name;
        payModal.querySelector('#pay-base-price').innerText = `₹${totalToPay.toFixed(2)}`;
        payModal.querySelector('#pay-total-amount').innerText = `₹${totalToPay.toFixed(2)}`;
        payModal.querySelector('#pay-wallet-balance').innerText = `₹${user.walletBalance || 0}`;

        // Direct Host QR Code Image & UPI ID
        const hostUpi = toilet.upiId || 'host@okaxis';
        const upiLink = `upi://pay?pa=${encodeURIComponent(hostUpi)}&pn=${encodeURIComponent(toilet.name)}&am=${totalToPay}&cu=INR`;
        const qrSrc = toilet.qrCodeImage || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

        const qrImg = payModal.querySelector('#pay-upi-qr-img');
        if (qrImg) qrImg.src = qrSrc;

        const hostUpiLabel = payModal.querySelector('#pay-host-upi-label');
        if (hostUpiLabel) hostUpiLabel.innerText = `Host UPI: ${hostUpi}`;

        payModal.classList.remove('hidden');
    }

    closePaymentCheckoutModal() {
        const payModal = document.getElementById('payment-checkout-modal');
        if (payModal) payModal.classList.add('hidden');
    }

    executePayment(method) {
        const toilet = window.db.getToiletById(this.activeBooking.toiletId);
        const user = window.auth.getCurrentUser();

        if (method === 'TOIGO Wallet') {
            if ((user?.walletBalance || 0) < toilet.price) {
                window.app.showToast('Insufficient wallet balance. Please use direct UPI or Cash.', 'error');
                return;
            }
        }

        const booking = window.db.createBooking({
            toiletId: toilet.id,
            userId: user?.id,
            amount: toilet.price,
            paymentMethod: method
        });

        this.closePaymentCheckoutModal();

        if (window.confetti) {
            window.confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        }

        window.app.showToast(`Direct payment of ₹${toilet.price} sent to Host via ${method}!`, 'success');

        // Open Rating & Hygiene Photo Review Modal
        this.openRatingModal(toilet.id, booking.id);
    }

    // Rating & Hygiene Photo Feedback Modal
    openRatingModal(toiletId, bookingId = null) {
        // Enforce user login for submitting reviews
        if (!window.auth.isLoggedIn()) {
            window.auth.requireLogin('user', () => this.openRatingModal(toiletId, bookingId));
            return;
        }

        const ratingModal = document.getElementById('rating-feedback-modal');
        if (!ratingModal) return;

        ratingModal.dataset.toiletId = toiletId;
        ratingModal.dataset.bookingId = bookingId || '';
        this.uploadedReviewPhotos = [];
        this.selectedRatingStars = 5;
        this.selectedHygieneTag = '✨ Spotless Clean';

        const previewContainer = document.getElementById('review-photo-preview');
        if (previewContainer) previewContainer.innerHTML = '';

        this.updateStarUI(5);
        ratingModal.classList.remove('hidden');
    }

    setReviewRating(stars) {
        this.selectedRatingStars = stars;
        this.updateStarUI(stars);
    }

    updateStarUI(stars) {
        document.querySelectorAll('.feedback-star-btn').forEach((el, index) => {
            if (index < stars) {
                el.classList.add('text-amber-400');
                el.classList.remove('text-slate-300');
            } else {
                el.classList.remove('text-amber-400');
                el.classList.add('text-slate-300');
            }
        });
    }

    setHygieneTag(tag) {
        this.selectedHygieneTag = tag;
        document.querySelectorAll('.hygiene-tag-pill').forEach(el => {
            if (el.dataset.tag === tag) {
                el.className = 'hygiene-tag-pill px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-2xs transition';
            } else {
                el.className = 'hygiene-tag-pill px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
            }
        });
    }

    handleReviewPhotoUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const previewContainer = document.getElementById('review-photo-preview');

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                this.uploadedReviewPhotos.push(base64);

                if (previewContainer) {
                    const thumb = document.createElement('div');
                    thumb.className = 'relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs flex-shrink-0';
                    thumb.innerHTML = `
                        <img src="${base64}" class="w-full h-full object-cover" />
                        <button type="button" onclick="this.parentElement.remove()" class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">✕</button>
                    `;
                    previewContainer.appendChild(thumb);
                }
            };
            reader.readAsDataURL(file);
        });

        window.app.showToast('Hygiene condition photo attached!', 'info');
    }

    submitRatingFeedback() {
        const ratingModal = document.getElementById('rating-feedback-modal');
        if (!ratingModal) return;

        const toiletId = ratingModal.dataset.toiletId;
        const comment = document.getElementById('review-comment-input')?.value.trim() || 'Hygienic and maintained restroom.';
        const user = window.auth.getCurrentUser() || { name: 'Verified Citizen' };

        window.db.addReview({
            toiletId,
            userId: user.id || 'usr-guest',
            userName: user.name || 'Citizen User',
            userAvatar: user.avatar,
            rating: this.selectedRatingStars,
            hygieneTag: this.selectedHygieneTag,
            comment,
            photos: this.uploadedReviewPhotos
        });

        ratingModal.classList.add('hidden');
        window.app.showToast('Hygiene review & photo published! Thank you 🌟', 'success');

        this.applyFilters();
    }

    // ================= REPORT TOILET ISSUE SYSTEM =================
    openReportModal(toiletId) {
        if (!window.auth.isLoggedIn()) {
            this.closeToiletDetailModal();
            window.auth.requireLogin('user', () => this.openReportModal(toiletId));
            return;
        }

        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;

        const modal = document.getElementById('report-toilet-modal');
        if (!modal) return;

        modal.dataset.toiletId = toiletId;
        document.getElementById('report-toilet-name-label').innerText = toilet.name;
        document.getElementById('report-toilet-address-label').innerText = toilet.address;
        document.getElementById('report-desc-input').value = '';
        this.uploadedReportPhoto = null;
        document.getElementById('report-photo-preview-img').classList.add('hidden');

        modal.classList.remove('hidden');
    }

    closeReportModal() {
        const modal = document.getElementById('report-toilet-modal');
        if (modal) modal.classList.add('hidden');
    }

    setReportCategory(category) {
        this.selectedReportCategory = category;
        document.querySelectorAll('.report-category-pill').forEach(btn => {
            if (btn.dataset.category === category) {
                btn.className = 'report-category-pill px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white shadow-xs transition';
            } else {
                btn.className = 'report-category-pill px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
            }
        });
    }

    handleReportPhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedReportPhoto = e.target.result;
            const imgEl = document.getElementById('report-photo-preview-img');
            if (imgEl) {
                imgEl.src = e.target.result;
                imgEl.classList.remove('hidden');
            }
            window.app.showToast('Report photo attached!', 'info');
        };
        reader.readAsDataURL(file);
    }

    submitToiletReport() {
        const modal = document.getElementById('report-toilet-modal');
        if (!modal) return;

        const toiletId = modal.dataset.toiletId;
        const description = document.getElementById('report-desc-input').value.trim();
        const user = window.auth.getCurrentUser();

        if (!description) {
            window.app.showToast('Please describe the issue or problem.', 'error');
            return;
        }

        window.db.addReport({
            toiletId,
            userId: user?.id,
            userName: user?.name,
            category: this.selectedReportCategory,
            description,
            photo: this.uploadedReportPhoto
        });

        this.closeReportModal();
        window.app.showToast('Issue reported successfully. Admin & Host will inspect immediately.', 'success');
    }
}

window.userFlow = new UserFlowController();
