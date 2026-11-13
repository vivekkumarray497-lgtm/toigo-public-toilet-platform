/**
 * TOIGO: User Flow Controller
 * Connected to REST API with live GPS, multi-dimensional filters, real camera QR scanner,
 * server-side payment verification, verified hygiene review submission, and live report tracking.
 */

class UserFlowController {
    constructor() {
        this.selectedToiletId = null;
        this.activeFilters = {
            query: '',
            type: 'all',
            maxPrice: 50,
            commodeType: 'all',
            genderType: 'all',
            isFree: undefined,
            wheelchair: false,
            water: false,
            soap: false,
            babyChanging: false,
            openNow: false,
            sort: 'nearest'
        };
        this.userLocation = { lat: 28.6315, lng: 77.2167 };
        this.locationPermissionGranted = false;
        this.uploadedReportPhoto = null;
        this.selectedReportCategory = 'Dirty Toilet';
        this.selectedReportPriority = 'MEDIUM';
        this.html5QrCode = null;
        this.activeSessionInterval = null;
    }

    init() {
        this.bindSearchAndFilters();
        this.requestUserLocation();
        this.checkActiveSession();
    }

    // ================= 1. GEOLOCATION HANDLING =================
    requestUserLocation(showToastOnSuccess = false) {
        // Guest user gate: Require mobile sign-in for live device GPS tracking
        if (!window.auth || !window.auth.isLoggedIn()) {
            if (showToastOnSuccess || (window.event && window.event.type === 'click')) {
                if (window.app) {
                    window.app.showToast('Please sign in with your mobile number to use live GPS tracking 📍', 'info');
                    window.app.openUserLoginModal();
                }
                return;
            }
            // For guest background map initialization, load default city toilets without blocking
            this.loadAndRenderApprovedToilets();
            return;
        }

        if (!navigator.geolocation) {
            this.renderLocationNotice(true, 'Geolocation is not supported by your device browser.');
            this.loadAndRenderApprovedToilets();
            return;
        }

        const locateBtn = document.getElementById('locate-me-btn');
        if (locateBtn) locateBtn.classList.add('animate-pulse');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.userLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                this.locationPermissionGranted = true;
                if (locateBtn) locateBtn.classList.remove('animate-pulse');

                if (window.toigoMap) {
                    window.toigoMap.userCoords = this.userLocation;
                    window.toigoMap.updateUserMarker();
                    if (showToastOnSuccess && window.toigoMap.map) {
                        window.toigoMap.map.flyTo([this.userLocation.lat, this.userLocation.lng], 16, { animate: true });
                    }
                }
                this.hideLocationNotice();
                this.loadAndRenderApprovedToilets();
                if (showToastOnSuccess) {
                    window.app.showToast('GPS Location synchronized! 📍', 'success');
                }

                // Watch Position for real-time movement updates
                if (!this.watchId) {
                    this.watchId = navigator.geolocation.watchPosition(
                        (watchPos) => {
                            this.userLocation = {
                                lat: watchPos.coords.latitude,
                                lng: watchPos.coords.longitude
                            };
                            if (window.toigoMap) {
                                window.toigoMap.userCoords = this.userLocation;
                                window.toigoMap.updateUserMarker();
                            }
                        },
                        (err) => console.warn('Location watch update error:', err),
                        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
                    );
                }
            },
            (err) => {
                console.warn('Geolocation error:', err);
                if (locateBtn) locateBtn.classList.remove('animate-pulse');
                this.locationPermissionGranted = false;
                this.renderLocationNotice(true, 'Location permission is required to detect nearby public washrooms.');
                this.loadAndRenderApprovedToilets();
                if (showToastOnSuccess) {
                    window.app.showToast('Location permission denied. Please allow GPS access.', 'error');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    renderLocationNotice(show, message) {
        const noticeEl = document.getElementById('user-location-denied-banner');
        if (!noticeEl) return;
        if (show) {
            noticeEl.classList.remove('hidden');
            const msgEl = noticeEl.querySelector('#loc-denied-msg');
            if (msgEl) msgEl.innerText = message;
        } else {
            noticeEl.classList.add('hidden');
        }
    }

    hideLocationNotice() {
        document.getElementById('user-location-denied-banner')?.classList.add('hidden');
    }

    // ================= 2. SEARCH & ADVANCED FILTERS =================
    bindSearchAndFilters() {
        const searchInput = document.getElementById('search-toilet-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.activeFilters.query = e.target.value.toLowerCase().trim();
                    this.loadAndRenderApprovedToilets();
                }, 300);
            });
        }

        // Filter Pills (All / Free / Paid / Western / Indian / 4.5+ Rating)
        document.querySelectorAll('.filter-type-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-type-pill').forEach(b => b.classList.remove('active-filter'));
                btn.classList.add('active-filter');
                const type = btn.dataset.type;
                this.activeFilters.type = type;

                if (type === 'free') {
                    this.activeFilters.isFree = true;
                    this.activeFilters.commodeType = 'all';
                } else if (type === 'paid') {
                    this.activeFilters.isFree = false;
                    this.activeFilters.commodeType = 'all';
                } else if (type === 'western') {
                    this.activeFilters.commodeType = 'Western';
                    this.activeFilters.isFree = undefined;
                } else if (type === 'indian') {
                    this.activeFilters.commodeType = 'Indian';
                    this.activeFilters.isFree = undefined;
                } else {
                    this.activeFilters.isFree = undefined;
                    this.activeFilters.commodeType = 'all';
                }

                this.loadAndRenderApprovedToilets();
            });
        });

        // Sort Selector
        const sortSelect = document.getElementById('sort-toilet-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.activeFilters.sort = e.target.value;
                this.loadAndRenderApprovedToilets();
            });
        }
    }

    // ================= 3. FETCH & RENDER TOILET LIST =================
    async loadAndRenderApprovedToilets() {
        const container = document.getElementById('toilet-cards-container') || document.getElementById('user-toilet-list-container');
        if (!container) return;

        // Show Loading State
        container.innerHTML = `
            <div class="p-8 text-center col-span-full">
                <div class="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs text-slate-500 font-semibold mt-2">Locating sanitized washrooms nearby...</p>
            </div>
        `;

        const queryParams = {
            lat: this.userLocation.lat,
            lng: this.userLocation.lng,
            query: this.activeFilters.query || undefined,
            sort: this.activeFilters.sort || 'nearest'
        };

        if (this.activeFilters.isFree !== undefined) {
            queryParams.isFree = this.activeFilters.isFree;
        }
        if (this.activeFilters.commodeType && this.activeFilters.commodeType !== 'all') {
            queryParams.commodeType = this.activeFilters.commodeType;
        }
        if (this.activeFilters.wheelchair) {
            queryParams.wheelchair = 'true';
        }
        if (this.activeFilters.water) {
            queryParams.water = 'true';
        }
        if (this.activeFilters.soap) {
            queryParams.soap = 'true';
        }

        const toilets = await window.db.fetchToilets(queryParams);

        // Update Map Markers
        if (window.toigoMap) {
            window.toigoMap.renderApprovedMarkers(toilets);
        }

        // Empty State
        if (!toilets || toilets.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-white rounded-3xl border border-slate-200 col-span-full">
                    <span class="text-4xl block mb-2">🔍</span>
                    <h3 class="font-bold text-slate-800 text-sm">No Washrooms Found</h3>
                    <p class="text-xs text-slate-500 mt-1">Try adjusting your search keywords or filter criteria.</p>
                </div>
            `;
            return;
        }

        // Render Toilet Cards
        const cardsHtml = toilets.map(t => {
            const distKm = t.distanceKm !== undefined
                ? t.distanceKm
                : (window.db ? window.db.calculateDistance(this.userLocation.lat, this.userLocation.lng, t.latitude, t.longitude) : 0.5);
            const distDisplay = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm} km`;
            const walkingMinutes = Math.max(1, Math.round(distKm * 12));

            const isFreeToilet = t.isFree || t.price === 0;
            const priceTag = isFreeToilet
                ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">FREE</span>'
                : `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-900">₹${t.price} per use</span>`;

            const photo = (t.photos && Array.isArray(t.photos) && t.photos.length > 0 && t.photos[0])
                ? t.photos[0]
                : 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80';

            const isOpen = t.availability === 'OPEN' || !t.availability;
            const statusBadge = isOpen
                ? '<span class="text-[10px] text-emerald-600 font-bold">● Open</span>'
                : `<span class="text-[10px] text-amber-600 font-bold">● ${(t.availability || 'Closed').replace('_', ' ')}</span>`;

            return `
                <div class="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition duration-200 cursor-pointer flex flex-col justify-between" onclick="window.userFlow.selectToilet('${t.toiletId}')">
                    <div>
                        <div class="relative h-32 rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                            <img src="${photo}" class="w-full h-full object-cover" alt="${t.name}" onerror="this.src='https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'" />
                            <div class="absolute top-2 left-2">
                                ${priceTag}
                            </div>
                            <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[10px] font-bold">
                                ★ ${t.rating || 5.0} (${t.totalReviews || 0})
                            </div>
                            <div class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md text-slate-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                ✨ Hygiene: ${t.hygieneScore || 95}%
                            </div>
                        </div>

                        <div class="flex items-start justify-between gap-1">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-1.5 mb-0.5">
                                    <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                        ${t.commodeType || 'Western'}
                                    </span>
                                    ${statusBadge}
                                </div>
                                <h4 class="font-bold text-xs text-slate-900 truncate leading-tight">${t.name}</h4>
                                <p class="text-[10px] text-slate-500 truncate mt-0.5">${t.address}</p>
                                <div class="mt-1">
                                    <span class="text-[11px] font-extrabold ${isFreeToilet ? 'text-emerald-700' : 'text-indigo-700'}">
                                        ${isFreeToilet ? 'FREE • No payment required' : `₹${t.price} per use`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span class="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            📍 ${distDisplay} <span class="text-[10px] font-normal text-slate-400">(~${walkingMinutes}m)</span>
                        </span>

                        <div class="flex items-center gap-2">
                            <button type="button" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer" onclick="event.stopPropagation(); window.userFlow.selectToilet('${t.toiletId}')">
                                Details →
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = cardsHtml;
    }

    // ================= 4. TOILET DETAILS MODAL =================
    async selectToilet(toiletId) {
        if (!toiletId) return;
        this.selectedToiletId = toiletId;

        let toilet = (window.db?.cache?.toilets || []).find(t => t.toiletId === toiletId);
        if (!toilet && window.db) {
            toilet = await window.db.fetchToiletById(toiletId);
        }

        if (!toilet) {
            window.app?.showToast('Washroom details not found.', 'error');
            return;
        }

        // Open details modal immediately
        this.openToiletDetailModal(toilet);

        // Draw route line on map
        if (window.toigoMap) {
            try {
                window.toigoMap.drawRoute(toilet.latitude, toilet.longitude);
            } catch (e) {
                console.warn('drawRoute notice:', e);
            }
        }
    }

    async openToiletDetailModal(toilet) {
        const modal = document.getElementById('toilet-detail-modal');
        if (!modal) return;

        try {
            const distKm = (window.db && this.userLocation)
                ? window.db.calculateDistance(this.userLocation.lat, this.userLocation.lng, toilet.latitude, toilet.longitude)
                : 0.5;
            const distDisplay = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm} km`;
            const walkingMinutes = Math.max(1, Math.round(distKm * 12));

            const facilities = Array.isArray(toilet.facilities) ? toilet.facilities : ['Running Water', 'Hand Soap'];
            const facilitiesHtml = facilities.map(f => `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl font-medium">
                    <span class="text-emerald-600 font-bold">✓</span> ${window.escapeHtml ? window.escapeHtml(f) : f}
                </span>
            `).join('');

            const photos = (Array.isArray(toilet.photos) && toilet.photos.length > 0)
                ? toilet.photos
                : ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'];

            const imagesHtml = photos.map(img => `
                <div class="w-full h-48 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-inner">
                    <img src="${img}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'" />
                </div>
            `).join('');

            // Fetch latest reviews safely
            let reviews = [];
            if (window.db && window.db.fetchToiletReviews) {
                try {
                    reviews = await window.db.fetchToiletReviews(toilet.toiletId);
                } catch (e) {
                    console.warn('Reviews fetch:', e);
                }
            }
            if (!Array.isArray(reviews)) reviews = [];

            const reviewsHtml = reviews.length === 0 ? `
                <p class="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl text-center">No citizen reviews yet. Be the first to review!</p>
            ` : reviews.map(r => `
                <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-xs text-slate-900">${window.escapeHtml ? window.escapeHtml(r.userName || 'Citizen') : (r.userName || 'Citizen')}</span>
                        <span class="text-xs text-amber-500 font-bold">★ ${r.rating || 5}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">${window.escapeHtml ? window.escapeHtml(r.hygieneTag || 'Clean') : (r.hygieneTag || 'Clean')}</span>
                        ${r.waterAvailable !== false ? '<span class="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">💧 Water OK</span>' : ''}
                        ${r.soapAvailable !== false ? '<span class="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">🧼 Soap OK</span>' : ''}
                    </div>
                    <p class="text-xs text-slate-600">${window.escapeHtml ? window.escapeHtml(r.comment || 'Verified clean visit') : (r.comment || 'Verified clean visit')}</p>
                </div>
            `).join('');

            const lastInspectedDisplay = toilet.lastInspectedAt
                ? new Date(toilet.lastInspectedAt).toLocaleDateString()
                : 'Recently Inspected';

            const toiletName = window.escapeHtml ? window.escapeHtml(toilet.name || 'Public Restroom') : (toilet.name || 'Public Restroom');
            const toiletAddr = window.escapeHtml ? window.escapeHtml(toilet.address || 'Central Area') : (toilet.address || 'Central Area');
            const toiletDesc = toilet.description ? (window.escapeHtml ? window.escapeHtml(toilet.description) : toilet.description) : '';
            const price = toilet.price != null ? toilet.price : 0;
            const isFree = toilet.isFree || price === 0;

            const content = `
                <div class="relative max-h-[88vh] overflow-y-auto">
                    <button type="button" onclick="window.userFlow.closeToiletDetailModal()" class="absolute top-3 right-3 z-30 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-md transition cursor-pointer">
                        ✕
                    </button>

                    <div class="relative">
                        <div class="flex gap-2 overflow-x-auto snap-x snap-mandatory rounded-2xl p-1 no-scrollbar">
                            ${imagesHtml}
                        </div>
                        <div class="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                            <span class="text-amber-400">★ ${toilet.rating || 5.0}</span>
                            <span class="text-slate-300">(${toilet.totalReviews || 0} reviews)</span>
                        </div>
                    </div>

                    <div class="p-5 space-y-4">
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <div class="flex items-center gap-2">
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                        ${toilet.commodeType || 'Western'}
                                    </span>
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">🛡️ Verified Approved</span>
                                </div>

                                <button type="button" onclick="window.userFlow.openReportModal('${toilet.toiletId}')" class="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer">
                                    🚩 Report Issue
                                </button>
                            </div>
                            <h2 class="text-xl font-black text-slate-900 font-heading">${toiletName}</h2>
                            <p class="text-xs text-slate-600 mt-1 flex items-start gap-1">
                                <span>📍</span> ${toiletAddr}
                            </p>
                            ${toiletDesc ? `
                                <p class="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                                    "${toiletDesc}"
                                </p>
                            ` : ''}
                            <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                                <span class="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">🕒 ${toilet.openingTime || '06:00 AM'} - ${toilet.closingTime || '11:00 PM'}</span>
                                <span class="px-2 py-0.5 rounded-md bg-indigo-50 font-bold text-indigo-700">👥 ${toilet.genderType || 'Unisex'}</span>
                                <span class="px-2 py-0.5 rounded-md bg-amber-50 font-bold text-amber-800">🏢 Host: ${toilet.providerName || 'Verified Partner'}</span>
                            </div>
                        </div>

                        <!-- Metrics Grid -->
                        <div class="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs">
                            <div>
                                <p class="text-[10px] text-slate-400 uppercase font-bold">Distance</p>
                                <p class="font-extrabold text-slate-900 mt-0.5">${distDisplay}</p>
                                <span class="text-[10px] text-emerald-600 font-semibold">~${walkingMinutes}m walk</span>
                            </div>
                            <div class="border-x border-slate-200">
                                <p class="text-[10px] text-slate-400 uppercase font-bold">Hygiene Score</p>
                                <p class="font-extrabold text-emerald-600 mt-0.5">${toilet.hygieneScore || 95}%</p>
                                <span class="text-[10px] text-slate-500">${toilet.hygieneStatus || (toilet.lastInspectedAt ? 'Inspected: ' + lastInspectedDisplay : 'Sanitized Daily')}</span>
                            </div>
                            <div>
                                <p class="text-[10px] text-slate-400 uppercase font-bold">Fee</p>
                                <p class="font-black text-slate-900 mt-0.5">${isFree ? 'FREE' : '₹' + price}</p>
                                <span class="text-[10px] text-emerald-700 font-semibold">${isFree ? 'No payment required' : 'Pay per use'}</span>
                            </div>
                        </div>

                        <!-- Dedicated Toilet Fee Pricing Section -->
                        ${!isFree && price > 0 ? `
                            <div class="p-4 rounded-2xl border bg-indigo-50/80 border-indigo-200">
                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <p class="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">Toilet Fee</p>
                                        <h3 class="text-xl font-black text-indigo-950 mt-0.5">₹${price} per use</h3>
                                        <p class="text-xs text-indigo-700/80 font-semibold mt-0.5">Exact facility fee: ₹${price}</p>
                                    </div>
                                    <button type="button" onclick="window.userFlow.openPaymentModal('${toilet.toiletId}')"
                                            class="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer">
                                        Pay ₹${price}
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <div class="p-4 rounded-2xl border bg-emerald-50/80 border-emerald-200">
                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <p class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Toilet Fee</p>
                                        <h3 class="text-xl font-black text-emerald-950 mt-0.5">FREE</h3>
                                        <p class="text-xs text-emerald-700 font-semibold mt-0.5">No payment required</p>
                                    </div>
                                    <button type="button" onclick="window.userFlow.claimFreeToiletAccess('${toilet.toiletId}')"
                                            class="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer">
                                        Get Free Access Pass
                                    </button>
                                </div>
                            </div>
                        `}

                        <!-- Facilities & Accessibility -->
                        <div>
                            <h4 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Facilities Available</h4>
                            <div class="flex flex-wrap gap-1.5 mb-2">
                                ${facilitiesHtml}
                            </div>
                            <p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                ♿ <b>Accessibility:</b> ${toilet.accessibility || 'Ground floor entry'}
                            </p>
                        </div>

                        <!-- Reviews -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Citizen Hygiene Reviews (${reviews.length})</h4>
                                <button type="button" onclick="window.userFlow.openReviewSubmitModal('${toilet.toiletId}')" class="text-xs text-emerald-600 font-bold hover:underline cursor-pointer">
                                    + Write Review
                                </button>
                            </div>
                            <div class="space-y-2">
                                ${reviewsHtml}
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="pt-2 flex flex-col sm:flex-row gap-2">
                            ${!isFree && price > 0 ? `
                                <button type="button" onclick="window.userFlow.openPaymentModal('${toilet.toiletId}')" 
                                        class="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer">
                                    <span>💳 Pay ₹${price}</span>
                                    <span>→</span>
                                </button>
                            ` : `
                                <button type="button" onclick="window.userFlow.claimFreeToiletAccess('${toilet.toiletId}')" 
                                        class="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer">
                                    <span>🎟️ Get Free Access Pass</span>
                                    <span>→</span>
                                </button>
                            `}
                            <button type="button" onclick="window.userFlow.startNavigationTo(${toilet.latitude}, ${toilet.longitude})" 
                                     class="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer">
                                <span>🧭 Start Navigation</span>
                                <span>→</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const container = modal.querySelector('.modal-content-container');
            if (container) container.innerHTML = content;
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
        } catch (err) {
            console.error('Error in openToiletDetailModal:', err);
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
        }
    }

    async claimFreeToiletAccess(toiletId) {
        const user = window.auth.getCurrentUser();
        if (!user) {
            window.app.showToast('Please sign in to get an access pass.', 'info');
            window.app.openUserLoginModal();
            return;
        }

        window.app.showToast('Generating free access pass...', 'info');
        try {
            const res = await window.api.post('/payments/free-access', { toiletId });
            if (res && res.success) {
                const toilet = await window.db.fetchToiletById(toiletId);
                this.closeToiletDetailModal();
                this.startActiveSession(res.accessSession, toilet);
                window.app.showToast('Free Access Pass Generated! Access code: ' + res.accessToken, 'success');
            } else {
                window.app.showToast(res.message || 'Failed to generate free access pass.', 'error');
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error requesting free access.', 'error');
        }
    }

    closeToiletDetailModal() {
        const modal = document.getElementById('toilet-detail-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    }

    startNavigationTo(lat, lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }

    // ================= 5. REAL CAMERA QR SCANNER =================
    openDoorScannerModal() {
        const user = window.auth.getCurrentUser();
        if (!user) {
            window.app.showToast('Please sign in to scan door QR code.', 'info');
            window.app.openUserLoginModal();
            return;
        }

        const modal = document.getElementById('qr-scanner-modal');
        if (!modal) return;
        modal.classList.remove('hidden');

        const videoElem = document.getElementById('camera-preview-video');
        const statusText = document.getElementById('scanner-status-text');
        if (statusText) statusText.innerText = 'Initializing camera feed...';

        // Initialize real WebRTC Camera Video Stream
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            .then((stream) => {
                this.cameraStream = stream;
                if (videoElem) {
                    videoElem.srcObject = stream;
                    videoElem.play();
                }
                if (statusText) statusText.innerText = 'Align the washroom door QR code within the frame';
            })
            .catch((err) => {
                console.warn('Camera access error:', err);
                if (statusText) statusText.innerText = 'Camera permission required. You can also enter the Toilet Code manually below.';
            });
        }
    }

    closeDoorScannerModal() {
        const modal = document.getElementById('qr-scanner-modal');
        if (modal) modal.classList.add('hidden');

        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
    }

    async processScannedQrData(qrCodeText) {
        if (!qrCodeText || !qrCodeText.trim()) {
            window.app.showToast('Please provide a valid QR code or Toilet ID.', 'error');
            return;
        }

        this.closeDoorScannerModal();
        window.app.showToast('Validating washroom with backend server...', 'info');

        try {
            const result = await window.db.validateQrCode(qrCodeText.trim());
            if (!result.success) {
                window.app.showToast(result.message || 'Invalid QR code.', 'error');
                return;
            }

            if (result.isFree) {
                // Free toilet -> Start active session immediately
                window.app.showToast('Free Access Granted! Unlock code generated.', 'success');
                this.startActiveSession(result.accessSession, result.toilet);
            } else {
                // Paid toilet -> Open payment checkout
                this.openPaymentModal(result.toilet.toiletId);
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error validating QR code with server.', 'error');
        }
    }

    // ================= 6. PAYMENT CHECKOUT & SERVER VERIFICATION =================
    async openPaymentModal(toiletId) {
        const user = window.auth.getCurrentUser();
        if (!user) {
            window.app.showToast('Please sign in to proceed with payment.', 'info');
            window.app.openUserLoginModal();
            return;
        }

        const toilet = await window.db.fetchToiletById(toiletId);
        if (!toilet) return;

        this.selectedToiletForPayment = toilet;
        this.selectedPaymentMethod = 'UPI (Google Pay / PhonePe)';

        const modal = document.getElementById('payment-checkout-modal');
        if (!modal) return;

        document.getElementById('pay-toilet-name-label').innerText = toilet.name;
        document.getElementById('pay-toilet-address-label').innerText = toilet.address;
        document.getElementById('pay-amount-label').innerText = `₹${toilet.price}.00`;
        document.getElementById('pay-total-amount-label').innerText = `₹${toilet.price}.00`;
        document.getElementById('pay-host-upi-label').innerText = `Host UPI: ${toilet.upiId || 'host@toigo.upi'}`;

        const payBtn = document.getElementById('btn-confirm-payment');
        if (payBtn) {
            payBtn.innerHTML = `<span>Pay ₹${toilet.price} Securely →</span>`;
        }

        const walletBalLabel = document.getElementById('pay-wallet-balance-label');
        if (walletBalLabel) {
            walletBalLabel.innerText = `Balance: ₹${user.walletBalance || 0}.00`;
        }

        // Fetch latest wallet balance from server
        try {
            const wRes = await window.api.get('/payments/wallet/history');
            if (wRes && wRes.success && wRes.walletBalance !== undefined) {
                user.walletBalance = wRes.walletBalance;
                if (walletBalLabel) {
                    walletBalLabel.innerText = `Balance: ₹${wRes.walletBalance}.00`;
                }
            }
        } catch (e) {}

        modal.classList.remove('hidden');
    }

    closePaymentModal() {
        document.getElementById('payment-checkout-modal')?.classList.add('hidden');
    }

    selectPaymentMethod(method) {
        this.selectedPaymentMethod = method;
        document.querySelectorAll('.pay-method-btn').forEach(btn => {
            if (btn.dataset.method === method) {
                btn.className = 'pay-method-btn w-full p-3 rounded-2xl border-2 border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold text-xs flex items-center justify-between transition shadow-xs';
            } else {
                btn.className = 'pay-method-btn w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-between transition';
            }
        });
    }

    async executeOnlinePayment() {
        const user = window.auth.getCurrentUser();
        if (!user || !this.selectedToiletForPayment) return;

        const toilet = this.selectedToiletForPayment;
        const payBtn = document.getElementById('btn-confirm-payment');

        // Handle TOIGO Wallet Payment Flow
        if (this.selectedPaymentMethod === 'TOIGO Wallet') {
            if (payBtn) {
                payBtn.innerHTML = '<span>👛</span> Processing Wallet Deduction...';
                payBtn.disabled = true;
            }

            try {
                const res = await window.api.post('/payments/wallet-pay', { toiletId: toilet.toiletId });
                if (!res.success) {
                    throw new Error(res.message || 'Insufficient wallet balance or payment error.');
                }

                if (payBtn) {
                    payBtn.innerHTML = '<span>✓</span> Wallet Payment Verified!';
                    payBtn.disabled = false;
                }

                await window.auth.syncCurrentUser();
                this.closePaymentModal();
                this.showPaymentSuccessResult(res.payment, toilet, res.accessSession);

                if (window.confetti) {
                    window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                }
                return;
            } catch (wErr) {
                if (payBtn) {
                    payBtn.innerHTML = '<span>💳</span> Pay Securely';
                    payBtn.disabled = false;
                }
                window.app.showToast(wErr.message || 'Wallet payment failed. Please use UPI.', 'error');
                return;
            }
        }

        if (payBtn) {
            payBtn.innerHTML = '<span>⏳</span> Initializing Secure Checkout...';
            payBtn.disabled = true;
        }

        try {
            // Step 1: Create Order on Backend
            const orderRes = await window.db.createPaymentOrder(toilet.toiletId, this.selectedPaymentMethod);
            if (!orderRes.success) {
                throw new Error(orderRes.message || 'Failed to create payment order.');
            }

            // If Razorpay SDK is available and configured
            if (typeof window.Razorpay !== 'undefined' && orderRes.keyId && !orderRes.keyId.includes('unconfigured')) {
                const options = {
                    key: orderRes.keyId,
                    amount: orderRes.amountInPaise || Math.round(toilet.price * 100),
                    currency: orderRes.currency || 'INR',
                    name: 'TOIGO Sanitation Network',
                    description: `Washroom Pass: ${toilet.name}`,
                    order_id: orderRes.orderId,
                    prefill: {
                        name: user.name || '',
                        email: user.email || '',
                        contact: user.mobile || ''
                    },
                    theme: {
                        color: '#059669'
                    },
                    handler: async (response) => {
                        try {
                            if (payBtn) payBtn.innerHTML = '<span>🔒</span> Verifying Transaction with Gateway...';
                            const verifyRes = await window.db.verifyPayment({
                                orderId: response.razorpay_order_id || orderRes.orderId,
                                transactionId: response.razorpay_payment_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                paymentMethod: this.selectedPaymentMethod
                            });

                            if (!verifyRes.success) {
                                throw new Error(verifyRes.message || 'Payment verification failed on server.');
                            }

                            if (payBtn) {
                                payBtn.innerHTML = '<span>✓</span> Payment Verified!';
                                payBtn.disabled = false;
                            }

                            this.closePaymentModal();
                            this.showPaymentSuccessResult(verifyRes.payment, toilet, verifyRes.accessSession);

                            if (window.confetti) {
                                window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                            }
                        } catch (vErr) {
                            if (payBtn) {
                                payBtn.innerHTML = '<span>💳</span> Pay Securely';
                                payBtn.disabled = false;
                            }
                            window.app.showToast(vErr.message || 'Verification failed.', 'error');
                        }
                    },
                    modal: {
                        ondismiss: () => {
                            if (payBtn) {
                                payBtn.innerHTML = '<span>💳</span> Pay Securely';
                                payBtn.disabled = false;
                            }
                            window.app.showToast('Payment window dismissed.', 'info');
                        }
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', (response) => {
                    if (payBtn) {
                        payBtn.innerHTML = '<span>💳</span> Pay Securely';
                        payBtn.disabled = false;
                    }
                    window.app.showToast('Payment failed: ' + (response.error.description || response.error.reason), 'error');
                });
                rzp.open();
                return;
            }

            // Fallback for development test mode when gateway keys are not provided
            if (payBtn) payBtn.innerHTML = '<span>🔒</span> Verifying Transaction with Server...';

            const verifyRes = await window.db.verifyPayment({
                orderId: orderRes.orderId,
                transactionId: orderRes.paymentId,
                paymentMethod: this.selectedPaymentMethod
            });

            if (!verifyRes.success) {
                throw new Error(verifyRes.message || 'Payment verification failed on server.');
            }

            if (payBtn) {
                payBtn.innerHTML = '<span>✓</span> Payment Verified!';
                payBtn.disabled = false;
            }

            this.closePaymentModal();
            this.showPaymentSuccessResult(verifyRes.payment, toilet, verifyRes.accessSession);

            // Trigger Confetti Animation
            if (window.confetti) {
                window.confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        } catch (err) {
            if (payBtn) {
                payBtn.innerHTML = '<span>💳</span> Pay Securely';
                payBtn.disabled = false;
            }
            window.app.showToast(err.message || 'Payment failed. Please try again.', 'error');
        }
    }

    showPaymentSuccessResult(payment, toilet, accessSession) {
        const modal = document.getElementById('payment-result-modal');
        if (!modal) return;

        document.getElementById('res-txn-id').innerText = payment.transactionId || payment.paymentId;
        document.getElementById('res-toilet-name').innerText = toilet.name;
        document.getElementById('res-amount-paid').innerText = `₹${payment.amount}.00`;
        document.getElementById('res-unlock-code').innerText = accessSession ? accessSession.accessToken : 'TG-VERIFIED';
        document.getElementById('res-payment-method').innerText = payment.method;

        modal.classList.remove('hidden');
    }

    closePaymentResultModal() {
        document.getElementById('payment-result-modal')?.classList.add('hidden');
        this.checkActiveSession();
    }

    // ================= 7. ACTIVE SESSION TIMER =================
    async checkActiveSession() {
        if (!window.auth.isLoggedIn()) return;
        const active = await window.db.getActiveSession();
        if (active) {
            this.startActiveSession(active, active.toilet);
        }
    }

    startActiveSession(session, toilet) {
        const banner = document.getElementById('active-session-banner');
        if (!banner) return;

        banner.classList.remove('hidden');
        document.getElementById('active-session-toilet-name').innerText = toilet ? toilet.name : 'Washroom Session Active';
        document.getElementById('active-session-token').innerText = session.accessToken;

        if (this.activeSessionInterval) clearInterval(this.activeSessionInterval);

        const updateTimer = () => {
            const now = new Date().getTime();
            const validUntil = new Date(session.validUntil).getTime();
            const remainingSec = Math.max(0, Math.floor((validUntil - now) / 1000));

            const mins = Math.floor(remainingSec / 60);
            const secs = remainingSec % 60;
            const timerDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            const timerEl = document.getElementById('active-session-timer-clock');
            if (timerEl) timerEl.innerText = timerDisplay;

            if (remainingSec <= 0) {
                clearInterval(this.activeSessionInterval);
                banner.classList.add('hidden');
                window.app.showToast('Washroom access session completed.', 'info');
            }
        };

        updateTimer();
        this.activeSessionInterval = setInterval(updateTimer, 1000);
    }

    async completeActiveSession() {
        const active = await window.db.getActiveSession();
        if (active) {
            await window.db.completeAccessSession(active.sessionId);
            clearInterval(this.activeSessionInterval);
            document.getElementById('active-session-banner')?.classList.add('hidden');
            window.app.showToast('Washroom visit completed. Please rate your hygiene experience!', 'success');
            if (active.toiletId) {
                this.openReviewSubmitModal(active.toiletId);
            }
        }
    }

    // ================= 8. MULTI-DIMENSIONAL REVIEW SUBMISSION =================
    openReviewSubmitModal(toiletId) {
        const user = window.auth.getCurrentUser();
        if (!user) {
            window.app.openUserLoginModal();
            return;
        }

        const modal = document.getElementById('review-submit-modal');
        if (!modal) return;

        modal.dataset.toiletId = toiletId;
        this.currentCleanlinessRating = 5;
        this.currentWaterAvailable = true;
        this.currentSoapAvailable = true;
        this.currentOverallRating = 5;

        modal.classList.remove('hidden');
    }

    closeReviewSubmitModal() {
        document.getElementById('review-submit-modal')?.classList.add('hidden');
    }

    async submitToiletReview() {
        const user = window.auth.getCurrentUser();
        if (!user) return;

        const modal = document.getElementById('review-submit-modal');
        const toiletId = modal.dataset.toiletId;
        const comment = document.getElementById('review-comment-input')?.value || '';

        const submitBtn = document.getElementById('btn-submit-review');
        if (submitBtn) {
            submitBtn.innerHTML = 'Submitting...';
            submitBtn.disabled = true;
        }

        try {
            const res = await window.db.submitReview({
                toiletId,
                rating: this.currentOverallRating || 5,
                cleanlinessRating: this.currentCleanlinessRating || 5,
                waterAvailable: this.currentWaterAvailable !== false,
                soapAvailable: this.currentSoapAvailable !== false,
                comment: comment.trim()
            });

            if (!res.success) {
                throw new Error(res.message || 'Failed to submit review.');
            }

            this.closeReviewSubmitModal();
            window.app.showToast('Hygiene review submitted successfully! 🌟', 'success');
            this.loadAndRenderApprovedToilets();
        } catch (err) {
            window.app.showToast(err.message || 'Error submitting review.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = 'Publish Review';
                submitBtn.disabled = false;
            }
        }
    }

    // ================= 9. REPORT ISSUE =================
    openReportModal(toiletId) {
        const user = window.auth.getCurrentUser();
        if (!user) {
            window.app.openUserLoginModal();
            return;
        }

        const modal = document.getElementById('report-toilet-modal');
        if (!modal) return;

        modal.dataset.toiletId = toiletId;
        const descInput = document.getElementById('report-desc-input');
        if (descInput) descInput.value = '';
        this.uploadedReportPhoto = null;
        document.getElementById('report-photo-preview')?.classList.add('hidden');

        modal.classList.remove('hidden');
    }

    closeReportModal() {
        document.getElementById('report-toilet-modal')?.classList.add('hidden');
    }

    setReportCategory(cat) {
        this.selectedReportCategory = cat;
        document.querySelectorAll('.report-cat-btn').forEach(btn => {
            if (btn.dataset.cat === cat) {
                btn.className = 'report-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white shadow-xs';
            } else {
                btn.className = 'report-cat-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700';
            }
        });
    }

    setReportPriority(prio) {
        this.selectedReportPriority = prio;
        document.querySelectorAll('.report-prio-btn').forEach(btn => {
            if (btn.dataset.prio === prio) {
                btn.className = 'report-prio-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white';
            } else {
                btn.className = 'report-prio-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600';
            }
        });
    }

    handleReportPhoto(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            window.app.showToast('Photo must be less than 10MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedReportPhoto = e.target.result;
            const preview = document.getElementById('report-photo-preview');
            if (preview) {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }

    async submitToiletReport() {
        const user = window.auth.getCurrentUser();
        if (!user) return;

        const modal = document.getElementById('report-toilet-modal');
        const toiletId = modal.dataset.toiletId;
        const desc = document.getElementById('report-desc-input')?.value.trim();

        if (!desc) {
            window.app.showToast('Please describe the problem.', 'error');
            return;
        }

        const submitBtn = document.getElementById('btn-submit-report');
        if (submitBtn) {
            submitBtn.innerHTML = 'Submitting Report...';
            submitBtn.disabled = true;
        }

        try {
            const res = await window.db.submitReport({
                toiletId,
                category: this.selectedReportCategory,
                priority: this.selectedReportPriority || 'MEDIUM',
                description: desc,
                photo: this.uploadedReportPhoto,
                latitude: this.userLocation.lat,
                longitude: this.userLocation.lng
            });

            if (!res.success) {
                throw new Error(res.message || 'Failed to submit report.');
            }

            this.closeReportModal();
            window.app.showToast('Report submitted! You can track live status in My Reports.', 'success');
        } catch (err) {
            window.app.showToast(err.message || 'Error submitting report.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = 'Submit Complaint';
                submitBtn.disabled = false;
            }
        }
    }

    // ================= 10. MY REPORTS SCREEN =================
    async renderMyReports() {
        const user = window.auth.getCurrentUser();
        const container = document.getElementById('user-my-reports-list');
        if (!container) return;

        if (!user) {
            container.innerHTML = `<p class="text-xs text-slate-400 text-center p-6">Please sign in to view your reports.</p>`;
            return;
        }

        container.innerHTML = `
            <div class="p-6 text-center">
                <div class="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        `;

        const myReports = await window.db.fetchMyReports();
        if (!myReports || myReports.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-white rounded-3xl border border-slate-200">
                    <span class="text-3xl block mb-2">🚩</span>
                    <h3 class="font-bold text-slate-800 text-sm">No Reports Submitted</h3>
                    <p class="text-xs text-slate-500 mt-1">When you report a dirty or damaged washroom, your ticket will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = myReports.map(r => {
            let statusBadge = 'bg-amber-100 text-amber-800';
            if (r.status === 'RESOLVED') statusBadge = 'bg-emerald-100 text-emerald-800';
            if (r.status === 'REJECTED') statusBadge = 'bg-red-100 text-red-800';
            if (r.status === 'IN_PROGRESS' || r.status === 'UNDER REVIEW') statusBadge = 'bg-blue-100 text-blue-800';

            return `
                <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                    <div class="flex items-start justify-between">
                        <div>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge}">
                                ● ${r.status}
                            </span>
                            <h4 class="font-bold text-sm text-slate-900 mt-1">${r.category}: ${r.toiletName}</h4>
                            <p class="text-[10px] text-slate-400">${new Date(r.createdAt).toLocaleString()}</p>
                        </div>
                        <span class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                            Priority: ${r.priority || 'MEDIUM'}
                        </span>
                    </div>

                    <p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">${r.description}</p>

                    ${r.photo ? `
                        <div class="flex gap-2">
                            <img src="${r.photo}" class="w-14 h-14 rounded-lg object-cover border border-slate-200 cursor-pointer" onclick="window.open('${r.photo}', '_blank')" />
                        </div>
                    ` : ''}

                    ${r.adminResponse ? `
                        <div class="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-xs">
                            <span class="font-bold text-emerald-900">Admin Response:</span>
                            <p class="text-emerald-800 mt-0.5">${r.adminResponse}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
}

window.userFlow = new UserFlowController();
