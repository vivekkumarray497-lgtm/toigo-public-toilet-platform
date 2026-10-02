/**
 * TOIGO: User Flow Controller
 * User Home: Approved Public Toilets Only (status === 'APPROVED' && active === true)
 * Real GPS Geolocation, Distance Sorting, Live Route, Ratings & My Reports Screen.
 */

class UserFlowController {
    constructor() {
        this.selectedToiletId = null;
        this.activeFilters = {
            query: '',
            type: 'all',
            maxPrice: 50
        };
        this.userLocation = { lat: 28.6315, lng: 77.2167 };
        this.locationPermissionGranted = false;
        this.uploadedReportPhoto = null;
        this.selectedReportCategory = 'Dirty Toilet';
    }

    init() {
        this.bindSearchAndFilters();
        this.requestUserLocation();
    }

    // Geolocation Request & Handling
    requestUserLocation() {
        if (!navigator.geolocation) {
            this.renderLocationNotice(false, 'Geolocation is not supported by your browser.');
            this.loadAndRenderApprovedToilets();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.userLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                this.locationPermissionGranted = true;
                if (window.toigoMap) {
                    window.toigoMap.userCoords = this.userLocation;
                    window.toigoMap.locateUser(false);
                }
                this.hideLocationNotice();
                this.loadAndRenderApprovedToilets();
            },
            (err) => {
                console.warn('Geolocation denied or failed:', err);
                this.locationPermissionGranted = false;
                this.renderLocationNotice(true, 'Location permission is required to find nearby public toilets.');
                this.loadAndRenderApprovedToilets();
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }

    renderLocationNotice(show, message) {
        const noticeEl = document.getElementById('user-location-denied-banner');
        if (!noticeEl) return;
        if (show) {
            noticeEl.classList.remove('hidden');
            noticeEl.querySelector('#loc-denied-msg').innerText = message;
        } else {
            noticeEl.classList.add('hidden');
        }
    }

    hideLocationNotice() {
        document.getElementById('user-location-denied-banner')?.classList.add('hidden');
    }

    bindSearchAndFilters() {
        const searchInput = document.getElementById('search-toilet-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.activeFilters.query = e.target.value.toLowerCase().trim();
                this.loadAndRenderApprovedToilets();
            });
        }

        document.querySelectorAll('.filter-type-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-type-pill').forEach(b => b.classList.remove('active-filter'));
                btn.classList.add('active-filter');
                this.activeFilters.type = btn.dataset.type;
                this.loadAndRenderApprovedToilets();
            });
        });
    }

    /**
     * CRITICAL FILTER RULE:
     * Only toilets where status === 'APPROVED' and active === true must appear to users!
     */
    loadAndRenderApprovedToilets() {
        const approvedToilets = window.db.getPublicApprovedToilets();
        const userLat = this.userLocation.lat;
        const userLng = this.userLocation.lng;

        // Apply Search & Category filters
        const filtered = approvedToilets.filter(t => {
            if (this.activeFilters.query) {
                const q = this.activeFilters.query;
                const matchName = t.name.toLowerCase().includes(q);
                const matchAddress = t.address.toLowerCase().includes(q);
                const matchType = t.commodeType.toLowerCase().includes(q);
                if (!matchName && !matchAddress && !matchType) return false;
            }

            if (this.activeFilters.type !== 'all') {
                if (this.activeFilters.type === 'indian' && !t.commodeType.includes('Indian')) return false;
                if (this.activeFilters.type === 'western' && !t.commodeType.includes('Western') && !t.commodeType.includes('English')) return false;
                if (this.activeFilters.type === 'free' && t.price > 0) return false;
                if (this.activeFilters.type === 'accessible' && !t.accessibility.toLowerCase().includes('wheelchair')) return false;
            }

            return true;
        });

        // Sort by nearest distance
        filtered.sort((a, b) => {
            const distA = window.db.calculateDistance(userLat, userLng, a.latitude, a.longitude);
            const distB = window.db.calculateDistance(userLat, userLng, b.latitude, b.longitude);
            return distA - distB;
        });

        this.renderToiletCards(filtered);
        if (window.toigoMap) {
            window.toigoMap.renderApprovedMarkers(filtered);
        }
    }

    renderToiletCards(toilets) {
        const container = document.getElementById('toilet-cards-container');
        if (!container) return;

        if (toilets.length === 0) {
            container.innerHTML = `
                <div class="p-6 text-center bg-white rounded-2xl border border-slate-100 col-span-full">
                    <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                        🔍
                    </div>
                    <h3 class="font-bold text-slate-800 text-xs mb-1">No Approved Toilets Nearby</h3>
                    <p class="text-[11px] text-slate-400">Try adjusting your search criteria or enabling GPS location.</p>
                </div>
            `;
            return;
        }

        const cardsHtml = toilets.map(t => {
            const distKm = window.db.calculateDistance(this.userLocation.lat, this.userLocation.lng, t.latitude, t.longitude);
            const distDisplay = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm} km`;
            const isFree = t.price === 0 || t.isFree;
            const priceTag = isFree ? '<span class="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px]">FREE</span>' : `<span class="font-black text-slate-900">₹${t.price}</span>`;

            return `
                <div onclick="window.userFlow.selectToilet('${t.toiletId}')" 
                     class="bg-white/95 hover:bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between">
                    
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 mb-1">
                                <span class="px-2 py-0.5 rounded-md text-[9px] font-extrabold ${t.commodeType.includes('Indian') ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}">
                                    ${t.commodeType}
                                </span>
                                <span class="text-[10px] text-emerald-600 font-bold">● Open</span>
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
                        <span class="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            📍 ${distDisplay}
                        </span>

                        <div class="flex items-center gap-2">
                            <span class="text-xs">${priceTag}</span>
                            <button class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                                Details →
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = cardsHtml;
    }

    selectToilet(toiletId) {
        this.selectedToiletId = toiletId;
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;

        if (window.toigoMap) {
            window.toigoMap.drawRoute(toilet.latitude, toilet.longitude);
        }
        this.openToiletDetailModal(toilet);
    }

    openToiletDetailModal(toilet) {
        const modal = document.getElementById('toilet-detail-modal');
        if (!modal) return;

        const distKm = window.db.calculateDistance(this.userLocation.lat, this.userLocation.lng, toilet.latitude, toilet.longitude);
        const distDisplay = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm} km`;
        const walkingMinutes = Math.max(1, Math.round(distKm * 12));

        const facilitiesHtml = (toilet.facilities || []).map(f => `
            <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl font-medium">
                <span class="text-emerald-600 font-bold">✓</span> ${f}
            </span>
        `).join('');

        const imagesHtml = (toilet.photos || []).map(img => `
            <div class="w-full h-48 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-inner">
                <img src="${img}" class="w-full h-full object-cover" />
            </div>
        `).join('');

        const reviews = window.db.getReviewsForToilet(toilet.toiletId);
        const reviewsHtml = reviews.length === 0 ? `
            <p class="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl text-center">No reviews yet. Be the first citizen to rate!</p>
        ` : reviews.map(r => `
            <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-xs text-slate-900">${r.userName}</span>
                    <span class="text-xs text-amber-500 font-bold">★ ${r.rating}</span>
                </div>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">${r.hygieneTag}</span>
                <p class="text-xs text-slate-600">${r.comment}</p>
            </div>
        `).join('');

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
                        <span class="text-slate-300">(${toilet.totalReviews} reviews)</span>
                    </div>
                </div>

                <div class="p-5 space-y-4">
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    ${toilet.commodeType}
                                </span>
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">🛡️ Verified Approved</span>
                            </div>

                            <button onclick="window.userFlow.openReportModal('${toilet.toiletId}')" class="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                                🚩 Report Issue
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
                            <p class="font-extrabold text-slate-900 mt-0.5">${distDisplay}</p>
                            <span class="text-[10px] text-emerald-600 font-semibold">~${walkingMinutes}m walk</span>
                        </div>
                        <div class="border-x border-slate-200">
                            <p class="text-[10px] text-slate-400 uppercase font-bold">Hygiene</p>
                            <p class="font-extrabold text-emerald-600 mt-0.5">${toilet.cleanlinessScore}</p>
                            <span class="text-[10px] text-slate-500">${toilet.hygieneStatus}</span>
                        </div>
                        <div>
                            <p class="text-[10px] text-slate-400 uppercase font-bold">Fee</p>
                            <p class="font-black text-slate-900 mt-0.5">${toilet.price === 0 ? 'FREE' : '₹' + toilet.price}</p>
                            <span class="text-[10px] text-emerald-700 font-semibold">Pay per use</span>
                        </div>
                    </div>

                    <!-- Facilities & Accessibility -->
                    <div>
                        <h4 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">Facilities Available</h4>
                        <div class="flex flex-wrap gap-1.5 mb-2">
                            ${facilitiesHtml}
                        </div>
                        <p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            ♿ <b>Accessibility:</b> ${toilet.accessibility}
                        </p>
                    </div>

                    <!-- Reviews -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Citizen Reviews (${reviews.length})</h4>
                            <button onclick="window.userFlow.openReviewSubmitModal('${toilet.toiletId}')" class="text-xs text-emerald-600 font-bold hover:underline">
                                + Write Review
                            </button>
                        </div>
                        <div class="space-y-2">
                            ${reviewsHtml}
                        </div>
                    </div>

                    <!-- Navigation Action Button -->
                    <div class="pt-2 flex gap-2">
                        <button onclick="window.userFlow.startNavigationTo(${toilet.latitude}, ${toilet.longitude})" 
                                class="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition">
                            <span>🧭 Start Navigation (Google Maps)</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('.modal-content-container').innerHTML = content;
        modal.classList.remove('hidden');
    }

    closeToiletDetailModal() {
        document.getElementById('toilet-detail-modal')?.classList.add('hidden');
    }

    startNavigationTo(lat, lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }

    // ================= REPORT ISSUE MODAL =================
    openReportModal(toiletId) {
        const user = window.auth.getCurrentUser();
        if (!user) {
            window.app.openUserLoginModal();
            return;
        }

        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;

        const modal = document.getElementById('report-toilet-modal');
        if (!modal) return;

        modal.dataset.toiletId = toiletId;
        modal.querySelector('#report-target-toilet-name').innerText = toilet.name;
        modal.querySelector('#report-desc-input').value = '';
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

    handleReportPhoto(event) {
        const file = event.target.files[0];
        if (!file) return;

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

    submitToiletReport() {
        const user = window.auth.getCurrentUser();
        if (!user) return;

        const modal = document.getElementById('report-toilet-modal');
        const toiletId = modal.dataset.toiletId;
        const desc = document.getElementById('report-desc-input').value.trim();

        if (!desc) {
            window.app.showToast('Please describe the problem.', 'error');
            return;
        }

        window.db.addReport({
            userId: user.userId,
            userName: user.name,
            toiletId: toiletId,
            category: this.selectedReportCategory,
            description: desc,
            photo: this.uploadedReportPhoto
        });

        this.closeReportModal();
        window.app.showToast('Report submitted! You can track status in My Reports.', 'success');
    }

    // ================= MY REPORTS SCREEN =================
    renderMyReports() {
        const user = window.auth.getCurrentUser();
        const container = document.getElementById('user-my-reports-list');
        if (!container) return;

        if (!user) {
            container.innerHTML = `<p class="text-xs text-slate-400 text-center p-6">Please sign in to view your reports.</p>`;
            return;
        }

        const myReports = window.db.getUserReports(user.userId);
        if (myReports.length === 0) {
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
            if (r.status === 'UNDER REVIEW') statusBadge = 'bg-blue-100 text-blue-800';

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

    // Write Review Modal
    openReviewSubmitModal(toiletId) {
        const user = window.auth.getCurrentUser();
        if (!user) {
            window.app.openUserLoginModal();
            return;
        }
        const comment = prompt('Enter your hygiene feedback / review:');
        if (comment) {
            window.db.addReview({
                toiletId,
                userId: user.userId,
                userName: user.name,
                rating: 5,
                hygieneTag: '✨ Spotless Clean',
                comment: comment
            });
            window.app.showToast('Review submitted! Thank you.', 'success');
            const toilet = window.db.getToiletById(toiletId);
            if (toilet) this.openToiletDetailModal(toilet);
            this.loadAndRenderApprovedToilets();
        }
    }
}

window.userFlow = new UserFlowController();
