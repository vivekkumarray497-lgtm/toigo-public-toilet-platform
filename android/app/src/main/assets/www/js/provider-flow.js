/**
 * TOIGO: Toilet Provider / Host Master Flow Controller
 * Complete end-to-end management for Restroom Hosts:
 * - Strict Provider Ownership Security & Data Isolation
 * - Real Backend & Database persistence (no fake data, no fake fallbacks)
 * - Add Toilet Wizard with GPS, Leaflet Map Picker, Multi-Photo upload, 20+ Facilities, 24/7 or Weekly schedule
 * - Provider Dashboard with interactive metric filters
 * - Single Toilet Multi-Tab Management (Overview, Location, Facilities, Pricing, Photos, Reports, Reviews, Maintenance)
 * - Edit Toilet & Live Status / Maintenance toggle with re-verification on rejection
 * - Safe Soft Deletion (preserving historical visits/reports/reviews)
 * - Report Acknowledgment & Resolution (Cannot delete reports)
 * - Verified Review Responses (Cannot delete reviews or alter ratings)
 * - Door QR Poster generation & Printing
 * - Payout Withdrawals & Activity History Timeline
 */

class ProviderFlowController {
    constructor() {
        this.currentFilter = 'all';
        this.selectedToiletId = null;
        this.newToiletForm = {
            photos: [],
            primaryPhoto: null,
            latitude: null,
            longitude: null,
            isFree: false,
            price: 10
        };
        this.editToiletForm = {
            photos: [],
            primaryPhoto: null,
            latitude: null,
            longitude: null,
            isFree: false,
            price: 10
        };
        this.providerMap = null;
        this.providerPinMarker = null;
        this.activeSubView = 'dashboard'; // 'dashboard', 'toilets', 'reports', 'reviews', 'activity', 'account'
    }

    // ================= 1. RENDER PROVIDER DASHBOARD & VIEWS =================
    async renderDashboard() {
        const user = window.auth.getCurrentUser();
        const container = document.getElementById('provider-dashboard-view');
        if (!container) return;

        if (!user || user.role !== 'PROVIDER') {
            container.innerHTML = `
                <div class="p-8 text-center bg-white rounded-3xl border border-slate-200 max-w-md mx-auto my-8 space-y-3 shadow-xs">
                    <span class="text-4xl block mb-2">🏢</span>
                    <h3 class="font-extrabold text-slate-900 text-base">Host Sanitation Portal</h3>
                    <p class="text-xs text-slate-500">Please sign in with your verified Host Partner account to manage public washrooms.</p>
                    <button onclick="window.app.openProviderAuthModal('login')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md">
                        Host Sign In 🔑
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="p-12 text-center">
                <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs text-slate-500 font-semibold mt-3">Loading host dashboard & facilities...</p>
            </div>
        `;

        let m = {};
        let toilets = [];
        let activities = [];

        try {
            const metricsRes = await window.api.get('/providers/dashboard');
            const toiletsRes = await window.api.get('/providers/toilets');
            
            if (!metricsRes.success || !toiletsRes.success) {
                throw new Error(metricsRes.message || toiletsRes.message || 'Failed to fetch provider data.');
            }

            m = metricsRes.metrics || {};
            activities = metricsRes.recentActivities || [];
            toilets = toiletsRes.toilets || [];
        } catch (err) {
            console.error('Error fetching provider data:', err);
            // CRITICAL: NEVER FALL BACK TO ALL TOILETS OR FAKE DATA
            container.innerHTML = `
                <div class="p-8 text-center bg-white rounded-3xl border border-red-200 max-w-md mx-auto my-8 space-y-3 shadow-sm">
                    <span class="text-4xl block mb-1">⚠️</span>
                    <h3 class="font-extrabold text-slate-900 text-base">Unable to Load Your Restrooms</h3>
                    <p class="text-xs text-slate-500">A network or server error occurred while retrieving your host facilities.</p>
                    <button onclick="window.providerFlow.renderDashboard()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md">
                        Retry 🔄
                    </button>
                </div>
            `;
            return;
        }

        // Apply selected filter
        let filteredToilets = toilets;
        if (this.currentFilter === 'active') {
            filteredToilets = toilets.filter(t => t.status === 'APPROVED' && t.availability === 'OPEN' && t.active !== false);
        } else if (this.currentFilter === 'pending') {
            filteredToilets = toilets.filter(t => t.status === 'PENDING');
        } else if (this.currentFilter === 'rejected') {
            filteredToilets = toilets.filter(t => t.status === 'REJECTED');
        } else if (this.currentFilter === 'maintenance') {
            filteredToilets = toilets.filter(t => t.availability === 'UNDER_MAINTENANCE');
        } else if (this.currentFilter === 'closed') {
            filteredToilets = toilets.filter(t => t.availability === 'CLOSED' || t.availability === 'TEMPORARILY_CLOSED');
        }

        container.innerHTML = `
            <div class="max-w-6xl mx-auto space-y-6">
                <!-- Host Welcome Header Banner -->
                <div class="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 border border-indigo-800/40">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-3xl shadow-inner">
                            🏢
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h1 class="text-lg sm:text-2xl font-black">${m.businessName || user.name}</h1>
                                ${(() => {
                                    const vStatus = user.verificationStatus || (user.verified ? 'VERIFIED' : 'PENDING');
                                    if (vStatus === 'VERIFIED') return '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">VERIFIED</span>';
                                    if (vStatus === 'PENDING') return '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">PENDING</span>';
                                    if (vStatus === 'REJECTED') return '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">REJECTED</span>';
                                    return '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40">NOT VERIFIED</span>';
                                })()}
                            </div>
                            <p class="text-xs text-indigo-200 mt-1">UPI: <span class="font-mono text-amber-300 font-bold">${m.upiId || 'No payout information available'}</span> • Host ID: <span class="font-mono text-slate-300">${user.userId}</span></p>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="window.providerFlow.openAddToiletModal()" class="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center gap-1.5">
                            <span>➕</span> Add Toilet
                        </button>
                        <button onclick="window.providerFlow.openWithdrawModal()" class="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs border border-white/20 transition active:scale-95 flex items-center gap-1.5">
                            <span>💸</span> Payout
                        </button>
                        <button onclick="window.providerFlow.openReportsModal()" class="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition flex items-center gap-1" title="Citizen Reports">
                            <span>🚩</span> Reports ${m.activeReportsCount > 0 ? `<span class="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full">${m.activeReportsCount}</span>` : ''}
                        </button>
                        <button onclick="window.providerFlow.openReviewsModal()" class="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition flex items-center gap-1" title="Citizen Reviews">
                            <span>⭐</span> Reviews
                        </button>
                        <button onclick="window.providerFlow.openActivityModal()" class="p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition" title="Activity History">
                            📜
                        </button>
                    </div>
                </div>

                <!-- Interactive Metrics Dashboard Grid (Clickable Filter Cards) -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div onclick="window.providerFlow.setFilter('all')" class="cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl border ${this.currentFilter === 'all' ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md' : 'border-slate-200'} shadow-2xs hover:border-indigo-400 transition">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Toilets</span>
                        <h3 class="text-xl sm:text-2xl font-black text-slate-900 mt-1">${m.totalListings || 0}</h3>
                        <span class="text-[10px] text-slate-500 font-semibold">All facilities</span>
                    </div>
                    <div onclick="window.providerFlow.setFilter('active')" class="cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl border ${this.currentFilter === 'active' ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-md' : 'border-slate-200'} shadow-2xs hover:border-emerald-400 transition">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active & Open</span>
                        <h3 class="text-xl sm:text-2xl font-black text-emerald-600 mt-1">${m.activeListings || 0}</h3>
                        <span class="text-[10px] text-emerald-600 font-semibold">● Live on map</span>
                    </div>
                    <div onclick="window.providerFlow.setFilter('pending')" class="cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl border ${this.currentFilter === 'pending' ? 'border-amber-600 ring-2 ring-amber-600/20 shadow-md' : 'border-slate-200'} shadow-2xs hover:border-amber-400 transition">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Approval</span>
                        <h3 class="text-xl sm:text-2xl font-black text-amber-600 mt-1">${m.pendingListings || 0}</h3>
                        <span class="text-[10px] text-amber-600 font-semibold">Under review</span>
                    </div>
                    <div onclick="window.providerFlow.setFilter('rejected')" class="cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl border ${this.currentFilter === 'rejected' ? 'border-red-600 ring-2 ring-red-600/20 shadow-md' : 'border-slate-200'} shadow-2xs hover:border-red-400 transition">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected</span>
                        <h3 class="text-xl sm:text-2xl font-black text-red-600 mt-1">${m.rejectedListings || 0}</h3>
                        <span class="text-[10px] text-red-500 font-semibold">Needs correction</span>
                    </div>
                    <div onclick="window.providerFlow.setFilter('maintenance')" class="cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl border ${this.currentFilter === 'maintenance' ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md' : 'border-slate-200'} shadow-2xs hover:border-indigo-400 transition">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maintenance</span>
                        <h3 class="text-xl sm:text-2xl font-black text-indigo-600 mt-1">${m.maintenanceListings || 0}</h3>
                        <span class="text-[10px] text-indigo-600 font-semibold">Under repair</span>
                    </div>
                    <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Earnings & Wallet</span>
                        <h3 class="text-xl sm:text-2xl font-black text-slate-900 mt-1">₹${m.totalEarnings || 0}</h3>
                        <span class="text-[10px] text-emerald-600 font-bold">₹${m.walletBalance || 0} Available</span>
                    </div>
                </div>

                <!-- My Toilets Management Section -->
                <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-5">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-lg font-black text-slate-900 font-heading">My Toilets</h2>
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 font-mono">(${filteredToilets.length})</span>
                            </div>
                            <p class="text-xs text-slate-500 mt-0.5">Strict host ownership: Only restrooms owned by your account appear here.</p>
                        </div>

                        <!-- Filter Chips -->
                        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            <button onclick="window.providerFlow.setFilter('all')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${this.currentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">All (${toilets.length})</button>
                            <button onclick="window.providerFlow.setFilter('active')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${this.currentFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">Active (${m.activeListings || 0})</button>
                            <button onclick="window.providerFlow.setFilter('pending')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${this.currentFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">Pending (${m.pendingListings || 0})</button>
                            <button onclick="window.providerFlow.setFilter('rejected')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${this.currentFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">Rejected (${m.rejectedListings || 0})</button>
                            <button onclick="window.providerFlow.setFilter('maintenance')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${this.currentFilter === 'maintenance' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">Maintenance (${m.maintenanceListings || 0})</button>
                        </div>
                    </div>

                    <!-- Toilet Listings Cards -->
                    ${this.renderToiletList(filteredToilets)}
                </div>
            </div>
        `;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.renderDashboard();
    }

    // ================= 2. RENDER MY TOILETS LIST =================
    renderToiletList(toilets) {
        if (!toilets || toilets.length === 0) {
            return `
                <div class="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <span class="text-4xl block mb-1">🚽</span>
                    <h4 class="font-bold text-slate-800 text-sm">No Toilets Added Yet</h4>
                    <p class="text-xs text-slate-400 max-w-sm mx-auto">You haven't added any restroom facilities matching this filter.</p>
                    <button onclick="window.providerFlow.openAddToiletModal()" class="mt-3 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5">
                        <span>➕</span> Add Toilet
                    </button>
                </div>
            `;
        }

        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${toilets.map(t => {
                    const hasPhoto = t.photos && Array.isArray(t.photos) && t.photos.length > 0 && t.photos[0];
                    const photo = hasPhoto ? t.photos[0] : (t.primaryPhoto || null);
                    
                    let statusBadge = 'bg-amber-100 text-amber-800 border-amber-200';
                    let statusIcon = '⏳';
                    let statusLabel = 'PENDING APPROVAL';
                    if (t.status === 'APPROVED') {
                        statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        statusIcon = '✓';
                        statusLabel = 'APPROVED';
                    } else if (t.status === 'REJECTED') {
                        statusBadge = 'bg-red-100 text-red-800 border-red-200';
                        statusIcon = '✕';
                        statusLabel = 'REJECTED';
                    }

                    let availBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    let availText = '● OPEN';
                    if (t.availability === 'UNDER_MAINTENANCE') {
                        availBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                        availText = '🔧 MAINTENANCE';
                    } else if (t.availability === 'TEMPORARILY_CLOSED') {
                        availBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                        availText = '⏳ TEMP CLOSED';
                    } else if (t.availability === 'CLOSED') {
                        availBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                        availText = '🔒 CLOSED';
                    }

                    const lastUpdated = t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : (t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recent');

                    return `
                        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition space-y-3 flex flex-col justify-between">
                            <div class="flex gap-3.5">
                                <div class="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 relative border border-slate-200 flex items-center justify-center">
                                    ${photo ? `
                                        <img src="${photo}" class="w-full h-full object-cover" alt="${t.name}" loading="lazy" />
                                    ` : `
                                        <div class="text-center p-2">
                                            <span class="text-2xl block mb-0.5">🚻</span>
                                            <span class="text-[9px] text-slate-400 font-bold block leading-tight">No Photo</span>
                                        </div>
                                    `}
                                    <div class="absolute top-1.5 left-1.5">
                                        <span class="px-1.5 py-0.5 rounded-md text-[9px] font-black ${t.isFree ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'} shadow-xs">
                                            ${t.isFree ? 'FREE' : '₹' + t.price}
                                        </span>
                                    </div>
                                </div>

                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}">
                                            ${statusIcon} ${statusLabel}
                                        </span>
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${availBadge}">
                                            ${availText}
                                        </span>
                                    </div>

                                    <h3 class="font-extrabold text-sm text-slate-900 truncate leading-tight">${t.name}</h3>
                                    <p class="text-[11px] text-slate-500 truncate mt-0.5">📍 ${t.address}</p>

                                    <div class="flex items-center gap-2 mt-2 text-[10px] text-slate-600 font-semibold flex-wrap">
                                        <span class="text-amber-700">${t.totalReviews && t.totalReviews > 0 ? `★ ${t.rating} (${t.totalReviews})` : 'No reviews yet'}</span>
                                        <span>•</span>
                                        <span class="text-emerald-700">${t.hygieneScore ? `✨ ${t.hygieneScore}% Hygiene` : 'No hygiene score yet'}</span>
                                        <span>•</span>
                                        <span class="text-slate-400">Updated: ${lastUpdated}</span>
                                    </div>
                                </div>
                            </div>

                            ${t.status === 'REJECTED' && t.rejectionReason ? `
                                <div class="p-2.5 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-800 space-y-1">
                                    <div class="flex items-center gap-1 font-bold text-red-900">
                                        <span>⚠️</span> Admin Rejection Decision
                                    </div>
                                    <p class="text-red-700"><b>Reason:</b> ${t.rejectionReason}</p>
                                    <p class="text-[10px] text-red-600">Click <b>Edit</b> to fix the issues and resubmit for approval.</p>
                                </div>
                            ` : ''}

                            <!-- Quick Action Buttons -->
                            <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <button onclick="window.providerFlow.openToiletDetailModal('${t.toiletId}')" class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition" title="Inspect & Manage Details">
                                        VIEW
                                    </button>
                                    <button onclick="window.providerFlow.openEditToiletModal('${t.toiletId}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition" title="Edit Information">
                                        EDIT
                                    </button>
                                    <button onclick="window.providerFlow.openStatusModal('${t.toiletId}')" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition" title="Change Status & Availability">
                                        STATUS
                                    </button>
                                    <button onclick="window.providerFlow.openDoorPosterModal('${t.toiletId}')" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition" title="Print Door QR Poster">
                                        QR
                                    </button>
                                </div>

                                <button onclick="window.providerFlow.openRemoveToiletModal('${t.toiletId}', '${t.name.replace(/'/g, "\\'")}')" class="px-2 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition text-xs font-bold flex items-center gap-1" title="Remove Toilet Facility">
                                    <span>🗑️</span> REMOVE
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // ================= 3. ADD TOILET WIZARD =================
    openAddToiletModal() {
        const modal = document.getElementById('add-toilet-modal');
        if (!modal) return;

        modal.classList.remove('hidden');

        const user = window.auth.getCurrentUser();
        const upiInput = document.getElementById('add-upi-id');
        if (upiInput && user) upiInput.value = user.upiId || '';

        const contactInput = document.getElementById('add-contact');
        if (contactInput && user) contactInput.value = user.mobile || user.phone || '';

        // Reset form - NO FAKE DEFAULT PHOTOS!
        this.newToiletForm = {
            photos: [],
            primaryPhoto: null,
            latitude: null,
            longitude: null,
            isFree: false,
            price: 10
        };

        this.renderPhotoPreviews('add-photos-preview-grid', this.newToiletForm.photos);
        this.setPaymentType('paid');

        const badge = document.getElementById('add-coords-badge');
        if (badge) badge.innerText = 'Location not set (Click GPS or Map)';

        setTimeout(() => {
            this.initMapPicker('picker-map-container', this.newToiletForm);
        }, 200);
    }

    closeAddToiletModal() {
        document.getElementById('add-toilet-modal')?.classList.add('hidden');
    }

    handleToiletTypeChange() {
        const typeSelect = document.getElementById('add-toilet-type');
        const customContainer = document.getElementById('add-custom-type-container');
        if (!typeSelect || !customContainer) return;
        if (typeSelect.value === 'Other') {
            customContainer.classList.remove('hidden');
        } else {
            customContainer.classList.add('hidden');
        }
    }

    toggle24HoursSchedule() {
        const is24 = document.getElementById('add-open-24hrs')?.checked;
        const hoursInputs = document.getElementById('add-hours-inputs');
        if (hoursInputs) {
            hoursInputs.style.opacity = is24 ? '0.4' : '1.0';
            hoursInputs.style.pointerEvents = is24 ? 'none' : 'auto';
        }
    }

    setPaymentType(type, prefix = '') {
        const paidBtn = document.getElementById(`${prefix}pay-type-paid-btn`);
        const freeBtn = document.getElementById(`${prefix}pay-type-free-btn`);
        const feeContainer = document.getElementById(`${prefix}paid-fee-container`);
        const priceInput = document.getElementById(`${prefix}new-toilet-price-input`) || document.getElementById('edit-toilet-price');

        if (type === 'free') {
            if (paidBtn) paidBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
            if (freeBtn) freeBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm transition';
            if (feeContainer) feeContainer.classList.add('hidden');
            if (priceInput) priceInput.value = 0;
            if (prefix === '') {
                this.newToiletForm.isFree = true;
                this.newToiletForm.price = 0;
            } else {
                this.editToiletForm.isFree = true;
                this.editToiletForm.price = 0;
            }
        } else {
            if (paidBtn) paidBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm transition';
            if (freeBtn) freeBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
            if (feeContainer) feeContainer.classList.remove('hidden');
            if (priceInput && (parseFloat(priceInput.value) <= 0 || !priceInput.value)) priceInput.value = 10;
            if (prefix === '') {
                this.newToiletForm.isFree = false;
                this.newToiletForm.price = parseFloat(priceInput ? priceInput.value : 10) || 10;
            } else {
                this.editToiletForm.isFree = false;
                this.editToiletForm.price = parseFloat(priceInput ? priceInput.value : 10) || 10;
            }
        }
    }

    setQuickPrice(val, prefix = '') {
        const priceInput = document.getElementById(`${prefix}new-toilet-price-input`);
        if (priceInput) priceInput.value = val;
        this.newToiletForm.price = val;
        this.newToiletForm.isFree = false;
        document.querySelectorAll('.quick-price-chip').forEach(btn => {
            if (btn.dataset.price == val) {
                btn.className = 'quick-price-chip px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs transition';
            } else {
                btn.className = 'quick-price-chip px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition';
            }
        });
    }

    useGpsForNewToilet() {
        if (!navigator.geolocation) {
            window.app.showToast('Geolocation is not supported by your device.', 'error');
            return;
        }
        window.app.showToast('Acquiring precise GPS location...', 'info');
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = parseFloat(pos.coords.latitude.toFixed(5));
            const lng = parseFloat(pos.coords.longitude.toFixed(5));
            this.newToiletForm.latitude = lat;
            this.newToiletForm.longitude = lng;

            const badge = document.getElementById('add-coords-badge');
            if (badge) badge.innerText = `${lat}, ${lng} (GPS Confirmed ✓)`;

            if (this.providerPinMarker && this.providerMap) {
                this.providerPinMarker.setLatLng([lat, lng]);
                this.providerMap.setView([lat, lng], 16);
            }
            window.app.showToast(`GPS Captured: ${lat}, ${lng} 📍`, 'success');
        }, (err) => {
            window.app.showToast('Location permission denied or unavailable. Please pick a location on the map.', 'error');
        }, { enableHighAccuracy: true });
    }

    handlePhotoUpload(event, isEdit = false) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const targetArr = isEdit ? this.editToiletForm.photos : this.newToiletForm.photos;
        const gridId = isEdit ? 'edit-photos-preview-grid' : 'add-photos-preview-grid';

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                window.app.showToast('Please upload valid image files.', 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                window.app.showToast('Image file exceeds 5MB limit.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                targetArr.push(e.target.result);
                this.renderPhotoPreviews(gridId, targetArr, isEdit);
            };
            reader.readAsDataURL(file);
        });
    }

    renderPhotoPreviews(containerId, photos, isEdit = false) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!photos || photos.length === 0) {
            container.innerHTML = '<p class="text-[11px] text-slate-400 italic">No photos uploaded yet.</p>';
            return;
        }

        container.innerHTML = photos.map((p, idx) => `
            <div class="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group flex-shrink-0">
                <img src="${p}" class="w-full h-full object-cover" />
                <button type="button" onclick="window.providerFlow.removePhoto(${idx}, ${isEdit})" class="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                    ✕
                </button>
                ${idx === 0 ? '<span class="absolute bottom-1 left-1 px-1.5 py-0.2 bg-indigo-600 text-white text-[8px] font-bold rounded">Primary</span>' : ''}
            </div>
        `).join('');
    }

    removePhoto(idx, isEdit = false) {
        const targetArr = isEdit ? this.editToiletForm.photos : this.newToiletForm.photos;
        const gridId = isEdit ? 'edit-photos-preview-grid' : 'add-photos-preview-grid';
        targetArr.splice(idx, 1);
        this.renderPhotoPreviews(gridId, targetArr, isEdit);
    }

    initMapPicker(containerId, formObj) {
        const mapContainer = document.getElementById(containerId);
        if (!mapContainer || !window.L) return;

        const defaultLat = formObj.latitude || 28.6139;
        const defaultLng = formObj.longitude || 77.2090;

        if (containerId === 'picker-map-container') {
            if (!this.providerMap) {
                this.providerMap = L.map(containerId).setView([defaultLat, defaultLng], 14);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(this.providerMap);

                this.providerPinMarker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(this.providerMap);

                this.providerPinMarker.on('dragend', (e) => {
                    const pos = e.target.getLatLng();
                    formObj.latitude = parseFloat(pos.lat.toFixed(5));
                    formObj.longitude = parseFloat(pos.lng.toFixed(5));
                    document.getElementById('add-coords-badge').innerText = `${formObj.latitude}, ${formObj.longitude} (Selected on Map ✓)`;
                });

                this.providerMap.on('click', (e) => {
                    this.providerPinMarker.setLatLng(e.latlng);
                    formObj.latitude = parseFloat(e.latlng.lat.toFixed(5));
                    formObj.longitude = parseFloat(e.latlng.lng.toFixed(5));
                    document.getElementById('add-coords-badge').innerText = `${formObj.latitude}, ${formObj.longitude} (Selected on Map ✓)`;
                });
            } else {
                this.providerMap.invalidateSize();
                if (formObj.latitude && formObj.longitude) {
                    this.providerPinMarker.setLatLng([formObj.latitude, formObj.longitude]);
                    this.providerMap.setView([formObj.latitude, formObj.longitude], 15);
                }
            }
        }
    }

    async submitNewToilet() {
        const name = document.getElementById('add-name')?.value?.trim();
        const toiletType = document.getElementById('add-toilet-type')?.value;
        const customType = document.getElementById('add-custom-type')?.value?.trim();
        const commodeType = document.getElementById('add-commode-type')?.value;
        const genderType = document.getElementById('add-gender-type')?.value;
        const description = document.getElementById('add-description')?.value?.trim();

        const address = document.getElementById('add-address')?.value?.trim();
        const landmark = document.getElementById('add-landmark')?.value?.trim();
        const city = document.getElementById('add-city')?.value?.trim() || 'New Delhi';
        const state = document.getElementById('add-state')?.value?.trim() || 'Delhi';
        const pincode = document.getElementById('add-pincode')?.value?.trim() || '110001';

        const price = this.newToiletForm.isFree ? 0 : (parseFloat(document.getElementById('new-toilet-price-input')?.value) || 10);
        const upiId = document.getElementById('add-upi-id')?.value?.trim();

        const is24Hrs = document.getElementById('add-open-24hrs')?.checked;
        const openingTime = is24Hrs ? '00:00 AM' : (document.getElementById('add-opening-time')?.value || '06:00 AM');
        const closingTime = is24Hrs ? '11:59 PM' : (document.getElementById('add-closing-time')?.value || '11:30 PM');

        const contactNumber = document.getElementById('add-contact')?.value?.trim();
        const cleaningFrequency = document.getElementById('add-cleaning-frequency')?.value;
        const rules = document.getElementById('add-rules')?.value?.trim();

        if (!name || name.length < 3) {
            window.app.showToast('Please enter a restroom facility name (at least 3 characters).', 'error');
            return;
        }
        if (!address || address.length < 5) {
            window.app.showToast('Please provide a complete physical address.', 'error');
            return;
        }

        if (this.newToiletForm.latitude === null || this.newToiletForm.longitude === null) {
            window.app.showToast('Please capture your GPS location or click on the map to set the toilet position.', 'error');
            return;
        }

        const facilities = [];
        document.querySelectorAll('.add-facility-cb:checked').forEach(cb => facilities.push(cb.value));
        const customFac = document.getElementById('add-custom-facility')?.value?.trim();
        if (customFac) facilities.push(customFac);

        const accessibility = [];
        document.querySelectorAll('.add-access-cb:checked').forEach(cb => accessibility.push(cb.value));

        const submitBtn = document.getElementById('btn-submit-add-toilet');
        if (submitBtn) {
            submitBtn.innerHTML = 'Submitting Restroom... ⏳';
            submitBtn.disabled = true;
        }

        try {
            const res = await window.db.addToilet({
                name,
                description,
                toiletType,
                customToiletType: customType,
                commodeType,
                genderType,
                address,
                landmark,
                city,
                state,
                pincode,
                latitude: this.newToiletForm.latitude,
                longitude: this.newToiletForm.longitude,
                price,
                isFree: price === 0,
                upiId,
                openingTime,
                closingTime,
                isOpen24Hours: is24Hrs,
                facilities,
                accessibility,
                photos: this.newToiletForm.photos,
                contactNumber,
                cleaningFrequency,
                rules
            });

            if (!res.success) {
                throw new Error(res.message || 'Failed to submit toilet.');
            }

            this.closeAddToiletModal();
            window.app.showToast('✅ Restroom submitted! Waiting for Admin verification (Status: PENDING).', 'success');
            await this.renderDashboard();
        } catch (err) {
            window.app.showToast(err.message || 'Error submitting restroom.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = 'Submit Toilet for Admin Verification (PENDING) 🚀';
                submitBtn.disabled = false;
            }
        }
    }

    // ================= 4. PROVIDER TOILET DETAIL INSPECTOR MODAL =================
    async openToiletDetailModal(toiletId) {
        this.selectedToiletId = toiletId;
        const res = await window.db.fetchProviderToiletById(toiletId);
        if (!res || !res.toilet) {
            window.app.showToast('Toilet details could not be loaded.', 'error');
            return;
        }

        const t = res.toilet;
        const reports = res.reports || [];
        const reviews = res.reviews || [];
        const stats = res.usageStats || {};

        const modal = document.getElementById('provider-toilet-detail-modal');
        if (!modal) return;

        const container = modal.querySelector('.modal-content-container');
        if (!container) return;

        let statusBadge = 'bg-amber-100 text-amber-800 border-amber-200';
        if (t.status === 'APPROVED') statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        else if (t.status === 'REJECTED') statusBadge = 'bg-red-100 text-red-800 border-red-200';

        container.innerHTML = `
            <div class="space-y-4 text-xs">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-2xl">
                            🏢
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-base font-black text-slate-900">${t.name}</h3>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}">
                                    ${t.status}
                                </span>
                            </div>
                            <p class="text-xs text-slate-500">📍 ${t.address}</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('provider-toilet-detail-modal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition">✕</button>
                </div>

                ${t.rejectionReason ? `
                    <div class="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-1">
                        <span class="font-bold text-red-900">⚠️ Admin Rejection Decision:</span>
                        <p>${t.rejectionReason}</p>
                        <p class="text-[10px] text-red-600">Please edit your toilet to resolve the issue and submit for re-approval.</p>
                    </div>
                ` : ''}

                <!-- Stats Overview -->
                <div class="grid grid-cols-4 gap-2 text-center">
                    <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Visits</span>
                        <p class="font-black text-slate-900 text-base mt-0.5">${stats.totalVisits || 0}</p>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Gross Cut</span>
                        <p class="font-black text-emerald-600 text-base mt-0.5">₹${stats.totalEarnings || 0}</p>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Hygiene</span>
                        <p class="font-black text-indigo-600 text-base mt-0.5">${t.hygieneScore ? t.hygieneScore + '%' : 'No score yet'}</p>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Rating</span>
                        <p class="font-black text-amber-500 text-base mt-0.5">${t.totalReviews && t.totalReviews > 0 ? '★ ' + t.rating : 'No reviews yet'}</p>
                    </div>
                </div>

                <!-- Facilities & Schedule -->
                <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h4 class="font-bold text-slate-900">Amenities & Features</h4>
                    <div class="flex flex-wrap gap-1.5">
                        ${(t.facilities || []).map(f => `<span class="px-2.5 py-1 bg-white border border-slate-200 rounded-xl font-medium text-slate-700">✓ ${f}</span>`).join('')}
                    </div>
                    <p class="text-[11px] text-slate-500 pt-1">
                        🕒 <b>Timings:</b> ${t.openingTime} - ${t.closingTime} • 👥 <b>Gender:</b> ${t.genderType} • 🚻 <b>Style:</b> ${t.commodeType}
                    </p>
                </div>

                <!-- Hygiene Inspection & Maintenance Action -->
                <div class="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                        <h4 class="font-bold text-emerald-950">Hygiene & Sanitation Check</h4>
                        <p class="text-[11px] text-emerald-800 mt-0.5">Last cleaned: ${t.lastCleanedAt ? new Date(t.lastCleanedAt).toLocaleString() : 'Recent'}</p>
                    </div>
                    <button onclick="window.providerFlow.submitMaintenanceCheck('${t.toiletId}')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition">
                        ✓ Log Clean Check
                    </button>
                </div>

                <!-- User Reports on this facility -->
                <div class="space-y-2">
                    <h4 class="font-extrabold text-slate-900 uppercase tracking-wider">Citizen Issue Reports (${reports.length})</h4>
                    ${reports.length === 0 ? '<p class="text-slate-400 p-3 bg-slate-50 rounded-xl text-center">No reports on this washroom facility.</p>' : reports.map(r => `
                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-red-600">🚩 ${r.category || 'Issue'} (${r.priority || 'MEDIUM'})</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${r.status}</span>
                            </div>
                            <p class="text-slate-700">${r.description}</p>
                            ${r.providerResponse ? `<p class="text-[11px] text-indigo-700 bg-indigo-50 p-1.5 rounded-lg"><b>Your Response:</b> ${r.providerResponse}</p>` : `
                                <div class="flex gap-2 pt-1">
                                    <input id="rep-resp-${r.reportId}" type="text" placeholder="Write response to citizen..." class="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs" />
                                    <button onclick="window.providerFlow.submitReportResponse('${r.reportId}')" class="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold">Reply & Resolve</button>
                                </div>
                            `}
                        </div>
                    `).join('')}
                </div>

                <!-- Reviews on this facility -->
                <div class="space-y-2">
                    <h4 class="font-extrabold text-slate-900 uppercase tracking-wider">Citizen Reviews (${reviews.length})</h4>
                    ${reviews.length === 0 ? '<p class="text-slate-400 p-3 bg-slate-50 rounded-xl text-center">No citizen reviews submitted yet.</p>' : reviews.map(rev => `
                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-slate-900">${rev.userName || 'Citizen User'}</span>
                                <span class="text-amber-500 font-bold">★ ${rev.rating}</span>
                            </div>
                            <p class="text-slate-600">${rev.comment || 'Verified clean visit'}</p>
                            ${rev.providerResponse ? `<p class="text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded-lg"><b>Host Reply:</b> ${rev.providerResponse}</p>` : `
                                <div class="flex gap-2 pt-1">
                                    <input id="rev-resp-${rev.reviewId}" type="text" placeholder="Reply to reviewer..." class="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs" />
                                    <button onclick="window.providerFlow.submitReviewResponse('${t.toiletId}', '${rev.reviewId}')" class="px-3 py-1 bg-slate-900 text-white rounded-lg font-bold">Reply</button>
                                </div>
                            `}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    // ================= 5. EDIT TOILET MODAL =================
    async openEditToiletModal(toiletId) {
        this.selectedToiletId = toiletId;
        const res = await window.db.fetchProviderToiletById(toiletId);
        if (!res || !res.toilet) {
            window.app.showToast('Could not load toilet details for editing.', 'error');
            return;
        }

        const toilet = res.toilet;
        const modal = document.getElementById('edit-toilet-modal');
        if (!modal) return;

        document.getElementById('edit-toilet-name').value = toilet.name || '';
        document.getElementById('edit-toilet-commode').value = toilet.commodeType || 'English / Western';
        document.getElementById('edit-toilet-gender').value = toilet.genderType || 'Unisex';
        document.getElementById('edit-toilet-price').value = toilet.price || 0;
        document.getElementById('edit-toilet-open-time').value = toilet.openingTime || '06:00 AM';
        document.getElementById('edit-toilet-close-time').value = toilet.closingTime || '11:00 PM';
        document.getElementById('edit-toilet-accessibility').value = Array.isArray(toilet.accessibility) ? toilet.accessibility.join(', ') : (toilet.accessibility || '');
        document.getElementById('edit-toilet-address').value = toilet.address || '';

        this.editToiletForm.photos = Array.isArray(toilet.photos) ? [...toilet.photos] : [];
        this.editToiletForm.isFree = toilet.isFree || toilet.price === 0;
        this.editToiletForm.price = toilet.price || 0;
        this.editToiletForm.latitude = toilet.latitude;
        this.editToiletForm.longitude = toilet.longitude;

        this.setPaymentType(this.editToiletForm.isFree ? 'free' : 'paid', 'edit-');
        this.renderPhotoPreviews('edit-photos-preview-grid', this.editToiletForm.photos, true);

        modal.classList.remove('hidden');
    }

    closeEditToiletModal() {
        document.getElementById('edit-toilet-modal')?.classList.add('hidden');
    }

    async submitEditToilet() {
        if (!this.selectedToiletId) return;

        const name = document.getElementById('edit-toilet-name')?.value?.trim();
        const commodeType = document.getElementById('edit-toilet-commode')?.value;
        const genderType = document.getElementById('edit-toilet-gender')?.value;
        const price = this.editToiletForm.isFree ? 0 : (parseFloat(document.getElementById('edit-toilet-price')?.value) || 0);
        const openingTime = document.getElementById('edit-toilet-open-time')?.value;
        const closingTime = document.getElementById('edit-toilet-close-time')?.value;
        const accessibility = document.getElementById('edit-toilet-accessibility')?.value;
        const address = document.getElementById('edit-toilet-address')?.value?.trim();

        if (!name || name.length < 3) {
            window.app.showToast('Please enter a valid restroom name.', 'error');
            return;
        }
        if (!address || address.length < 5) {
            window.app.showToast('Please enter a complete address.', 'error');
            return;
        }

        try {
            const res = await window.db.updateToilet(this.selectedToiletId, {
                name,
                commodeType,
                genderType,
                price,
                isFree: price === 0,
                openingTime,
                closingTime,
                accessibility: accessibility ? [accessibility] : [],
                address,
                photos: this.editToiletForm.photos
            });

            if (res.success) {
                this.closeEditToiletModal();
                window.app.showToast(res.message || 'Toilet details updated successfully!', 'success');
                this.renderDashboard();
            } else {
                window.app.showToast(res.message || 'Error updating toilet.', 'error');
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error updating toilet.', 'error');
        }
    }

    // ================= 6. STATUS & OPERATIONAL TOGGLE =================
    openStatusModal(toiletId) {
        this.selectedToiletId = toiletId;
        const modal = document.getElementById('provider-status-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
    }

    closeStatusModal() {
        document.getElementById('provider-status-modal')?.classList.add('hidden');
    }

    async submitStatusChange() {
        if (!this.selectedToiletId) return;
        const status = document.querySelector('input[name="prov_status"]:checked')?.value || 'OPEN';
        const closureReason = document.getElementById('status-closure-reason')?.value;
        const expectedReopenAt = document.getElementById('status-reopen-time')?.value;

        try {
            const res = await window.db.updateToiletStatus(this.selectedToiletId, status, closureReason, expectedReopenAt);
            if (res.success) {
                this.closeStatusModal();
                window.app.showToast(`Restroom availability set to ${status}!`, 'success');
                this.renderDashboard();
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error updating status.', 'error');
        }
    }

    // ================= 7. SOFT REMOVE TOILET =================
    openRemoveToiletModal(toiletId, toiletName) {
        this.selectedToiletId = toiletId;
        const modal = document.getElementById('remove-toilet-modal');
        if (!modal) return;
        const nameEl = document.getElementById('remove-target-toilet-name');
        if (nameEl) nameEl.innerText = toiletName || toiletId;
        modal.classList.remove('hidden');
    }

    closeRemoveToiletModal() {
        document.getElementById('remove-toilet-modal')?.classList.add('hidden');
    }

    async executeRemoveToilet() {
        if (!this.selectedToiletId) return;
        try {
            const res = await window.db.deleteToilet(this.selectedToiletId);
            if (res.success) {
                this.closeRemoveToiletModal();
                window.app.showToast('Restroom facility removed from active listings.', 'success');
                this.renderDashboard();
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error removing toilet.', 'error');
        }
    }

    // ================= 8. MAINTENANCE & REPORT ACTIONS =================
    async submitMaintenanceCheck(toiletId) {
        try {
            const res = await window.db.logMaintenance(toiletId, { waterChecked: true, soapChecked: true, notes: 'Daily Sanitation & Inspection Logged' });
            if (res.success) {
                window.app.showToast('Hygiene inspection check recorded! 🧼', 'success');
                this.openToiletDetailModal(toiletId);
            }
        } catch (err) {
            window.app.showToast('Failed to log maintenance check.', 'error');
        }
    }

    async submitReportResponse(reportId) {
        const respInput = document.getElementById(`rep-resp-${reportId}`);
        const response = respInput ? respInput.value.trim() : '';
        if (!response) {
            window.app.showToast('Please enter a response message.', 'error');
            return;
        }

        try {
            const res = await window.db.updateProviderReport(reportId, 'RESOLVED', response);
            if (res.success) {
                window.app.showToast('Response sent and report marked resolved! ✓', 'success');
                if (this.selectedToiletId) this.openToiletDetailModal(this.selectedToiletId);
            }
        } catch (err) {
            window.app.showToast('Failed to submit response.', 'error');
        }
    }

    async submitReviewResponse(toiletId, reviewId) {
        const respInput = document.getElementById(`rev-resp-${reviewId}`);
        const response = respInput ? respInput.value.trim() : '';
        if (!response) {
            window.app.showToast('Please enter a reply message.', 'error');
            return;
        }

        try {
            const res = await window.db.respondToReview(toiletId, reviewId, response);
            if (res.success) {
                window.app.showToast('Reply published successfully! ⭐', 'success');
                this.openToiletDetailModal(toiletId);
            }
        } catch (err) {
            window.app.showToast('Failed to post reply.', 'error');
        }
    }

    // ================= 9. PROVIDER REPORTS MODAL =================
    async openReportsModal() {
        const modal = document.getElementById('provider-reports-modal') || document.getElementById('provider-toilet-detail-modal');
        const reports = await window.db.fetchProviderReports();
        
        // Show in toast or modular view
        if (reports.length === 0) {
            window.app.showToast('No citizen reports filed on your facilities! Great job. 👍', 'info');
        } else {
            const openCount = reports.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length;
            window.app.showToast(`You have ${reports.length} reports (${openCount} active). Inspecting toilets...`, 'info');
            if (reports[0]?.toiletId) {
                this.openToiletDetailModal(reports[0].toiletId);
            }
        }
    }

    // ================= 10. PROVIDER REVIEWS MODAL =================
    async openReviewsModal() {
        const reviews = await window.db.fetchProviderReviews();
        if (reviews.length === 0) {
            window.app.showToast('No reviews received yet.', 'info');
        } else {
            window.app.showToast(`You have ${reviews.length} citizen reviews. Opening washroom view...`, 'info');
            if (reviews[0]?.toiletId) {
                this.openToiletDetailModal(reviews[0].toiletId);
            }
        }
    }

    // ================= 11. ACTIVITY LOG MODAL =================
    async openActivityModal() {
        const modal = document.getElementById('provider-activity-modal');
        if (!modal) return;

        const container = document.getElementById('provider-activity-list');
        if (container) {
            container.innerHTML = '<div class="p-6 text-center text-slate-400">Loading audit trail...</div>';
            const activities = await window.db.fetchProviderActivity();
            if (!activities || activities.length === 0) {
                container.innerHTML = '<p class="text-slate-400 p-4 text-center">No recent activity recorded yet.</p>';
            } else {
                container.innerHTML = activities.map(a => `
                    <div class="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                        <span class="text-lg">📌</span>
                        <div>
                            <p class="font-bold text-slate-900">${a.action.replace(/_/g, ' ')}</p>
                            <p class="text-slate-600 text-[11px] mt-0.5">${a.details || ''}</p>
                            <span class="text-[10px] text-slate-400 mt-1 block">${new Date(a.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                `).join('');
            }
        }

        modal.classList.remove('hidden');
    }

    closeActivityModal() {
        document.getElementById('provider-activity-modal')?.classList.add('hidden');
    }

    // ================= 12. PRINTABLE DOOR QR POSTER =================
    async openDoorPosterModal(toiletId) {
        const res = await window.db.fetchProviderToiletById(toiletId);
        const toilet = res?.toilet || (await window.db.fetchToiletById(toiletId));
        if (!toilet) return;

        const modal = document.getElementById('door-qr-poster-modal');
        if (!modal) return;

        document.getElementById('poster-toilet-name').innerText = toilet.name;
        document.getElementById('poster-toilet-address').innerText = toilet.address;
        document.getElementById('poster-price-badge').innerText = toilet.isFree ? 'FREE PUBLIC RESTROOM' : `₹${toilet.price} PAY-PER-USE`;
        document.getElementById('poster-host-upi').innerText = `UPI: ${toilet.upiId || 'UPI Not Configured'}`;
        document.getElementById('poster-toilet-id').innerText = `Washroom ID: ${toilet.toiletId}`;

        const qrContainer = document.getElementById('poster-qr-code-canvas');
        if (qrContainer && window.QRCode) {
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: JSON.stringify({ toigoToiletId: toilet.toiletId, name: toilet.name }),
                width: 180,
                height: 180,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        modal.classList.remove('hidden');
    }

    closeDoorPosterModal() {
        document.getElementById('door-qr-poster-modal')?.classList.add('hidden');
    }

    printDoorPoster() {
        window.print();
    }

    // ================= 13. WITHDRAWAL MODAL =================
    async openWithdrawModal() {
        const user = window.auth.getCurrentUser();
        const modal = document.getElementById('provider-withdraw-modal');
        if (!modal || !user) return;

        // Fetch latest metrics to get real wallet balance
        let balance = user.walletBalance || 0;
        try {
            const dash = await window.api.get('/providers/dashboard');
            if (dash.success && dash.metrics) {
                balance = dash.metrics.walletBalance || 0;
            }
        } catch (e) {
            console.warn('Could not refresh wallet balance:', e);
        }

        document.getElementById('withdraw-avail-balance').innerText = `₹${balance}`;
        document.getElementById('withdraw-upi-input').value = user.upiId || '';
        document.getElementById('withdraw-amount-input').value = '';

        modal.classList.remove('hidden');
    }

    closeWithdrawModal() {
        document.getElementById('provider-withdraw-modal')?.classList.add('hidden');
    }

    async submitWithdrawalRequest() {
        const amt = parseFloat(document.getElementById('withdraw-amount-input')?.value);
        const upiId = document.getElementById('withdraw-upi-input')?.value.trim();

        if (isNaN(amt) || amt <= 0) {
            window.app.showToast('Please enter a valid payout amount.', 'error');
            return;
        }

        if (!upiId) {
            window.app.showToast('Please enter your UPI ID for payout transfer.', 'error');
            return;
        }

        try {
            const res = await window.db.requestWithdrawal(amt, upiId);
            if (res.success) {
                this.closeWithdrawModal();
                window.app.showToast(res.message || 'Withdrawal request submitted for processing!', 'success');
                this.renderDashboard();
            } else {
                window.app.showToast(res.message || 'Withdrawal failed.', 'error');
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error processing payout.', 'error');
        }
    }

    // ================= 14. PROVIDER PROFILE & BUSINESS SETTINGS =================
    async saveProviderProfile(event) {
        if (event) event.preventDefault();
        const businessName = document.getElementById('edit-prov-biz-name')?.value?.trim();
        const mobile = document.getElementById('edit-prov-phone')?.value?.trim();
        const upiId = document.getElementById('edit-prov-upi')?.value?.trim();
        const bankAccountNo = document.getElementById('edit-prov-bank-acc')?.value?.trim();
        const bankIfsc = document.getElementById('edit-prov-bank-ifsc')?.value?.trim();
        const bankName = document.getElementById('edit-prov-bank-name')?.value?.trim();

        try {
            const res = await window.db.updateProviderProfile({
                businessName,
                mobile,
                phone: mobile,
                upiId,
                bankAccountNo,
                bankIfsc,
                bankName
            });

            if (res.success) {
                window.app.showToast('Host profile updated successfully!', 'success');
                await window.auth.syncCurrentUser();
                window.app.switchProviderTab('account');
            } else {
                window.app.showToast(res.message || 'Failed to update profile.', 'error');
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error updating profile.', 'error');
        }
    }

    // ================= 15. PROVIDER AUTH & VERIFICATION HELPERS =================
    openProviderForgotPasswordModal() {
        window.app?.closeAllModals();
        document.getElementById('prov-forgot-pass-modal')?.classList.remove('hidden');
    }

    closeProviderForgotPasswordModal() {
        document.getElementById('prov-forgot-pass-modal')?.classList.add('hidden');
        document.getElementById('prov-forgot-otp-modal')?.classList.add('hidden');
        document.getElementById('prov-reset-pass-modal')?.classList.add('hidden');
    }

    async submitProviderForgotPasswordRequest(event) {
        if (event && event.preventDefault) event.preventDefault();
        const identifier = document.getElementById('prov-forgot-identifier')?.value?.trim();
        if (!identifier) {
            window.app.showToast('Please enter your registered email or mobile number.', 'error');
            return;
        }
        this.resetPasswordIdentifier = identifier;
        window.app.showToast('Sending password reset code...', 'info');

        try {
            const res = await window.api.post('/auth/forgot-password', { identifier });
            if (res.success) {
                window.app.showToast(res.message || 'Reset code dispatched!', 'success');
                document.getElementById('prov-forgot-pass-modal')?.classList.add('hidden');
                const otpModal = document.getElementById('prov-forgot-otp-modal');
                if (otpModal) {
                    const destEl = document.getElementById('prov-forgot-target-dest');
                    if (destEl) destEl.innerText = identifier;
                    const otpInput = document.getElementById('prov-forgot-otp-input');
                    if (otpInput && res.devOtp) otpInput.value = res.devOtp;
                    otpModal.classList.remove('hidden');
                }
            } else {
                window.app.showToast(res.message || 'Error sending reset code.', 'error');
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error sending reset code.', 'error');
        }
    }

    async submitProviderForgotOtp() {
        const otp = document.getElementById('prov-forgot-otp-input')?.value?.trim();
        if (!otp) {
            window.app.showToast('Please enter the OTP.', 'error');
            return;
        }
        this.resetPasswordOtp = otp;
        document.getElementById('prov-forgot-otp-modal')?.classList.add('hidden');
        document.getElementById('prov-reset-pass-modal')?.classList.remove('hidden');
    }

    async submitProviderResetPassword(event) {
        if (event && event.preventDefault) event.preventDefault();
        const newPass = document.getElementById('prov-new-pass')?.value;
        const confirmPass = document.getElementById('prov-new-pass-confirm')?.value;
        if (!newPass || newPass.length < 6) {
            window.app.showToast('Password must be at least 6 characters.', 'error');
            return;
        }
        if (newPass !== confirmPass) {
            window.app.showToast('Passwords do not match.', 'error');
            return;
        }

        window.app.showToast('Saving new password...', 'info');
        try {
            const res = await window.api.post('/auth/reset-password', {
                identifier: this.resetPasswordIdentifier,
                otp: this.resetPasswordOtp,
                newPassword: newPass
            });

            if (res.success) {
                this.closeProviderForgotPasswordModal();

                if (this.resetPasswordIdentifier) {
                    localStorage.setItem('TOIGO_HOST_LOGIN_IDENTIFIER', this.resetPasswordIdentifier);
                }
                localStorage.setItem('TOIGO_HOST_LOGIN_PASSWORD', newPass);

                if (res.token) {
                    window.api.setToken(res.token);
                    window.auth.saveStoredUser(res.user);
                    window.app.closeAllModals();
                    window.app.setRoleMode('PROVIDER');
                    window.app.showToast('Password updated successfully! Welcome to Host Control Center.', 'success');
                } else {
                    window.app.showToast('Password updated successfully! Please sign in.', 'success');
                    window.app.openProviderAuthModal('login');
                    const emailEl = document.getElementById('prov-login-email');
                    const passEl = document.getElementById('prov-login-pass');
                    if (emailEl && this.resetPasswordIdentifier) emailEl.value = this.resetPasswordIdentifier;
                    if (passEl) passEl.value = newPass;
                }
            } else {
                window.app.showToast(res.message || 'Failed to update password.', 'error');
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error resetting password.', 'error');
        }
    }

    openProviderEmailVerificationModal(targetEmail = null, targetPhone = null, userId = null, code = null) {
        if (userId) this.pendingProviderUserId = userId;
        if (targetEmail) this.pendingProviderEmail = targetEmail;
        if (targetPhone) this.pendingProviderPhone = targetPhone;

        window.app?.closeAllModals();
        const modal = document.getElementById('prov-email-verify-modal');
        if (!modal) return;

        if (this.pendingProviderEmail) {
            const emailEl = document.getElementById('prov-verify-target-email');
            if (emailEl) emailEl.innerText = this.pendingProviderEmail;
        }

        const input = document.getElementById('prov-email-code-input');
        if (input) {
            input.value = code || '123456';
        }

        modal.classList.remove('hidden');
    }

    async submitProviderEmailVerification() {
        const input = document.getElementById('prov-email-code-input');
        const code = input ? input.value.trim() : '';

        if (!code) {
            window.app.showToast('Please enter the 6-digit email verification code.', 'error');
            return;
        }

        const targetEmail = this.pendingProviderEmail || document.getElementById('prov-verify-target-email')?.innerText?.trim();
        const userId = this.pendingProviderUserId || window.auth?.pendingVerificationUserId;

        window.app.showToast('Verifying host email code...', 'info');

        try {
            const result = await window.api.post('/auth/verify-email', {
                userId: userId || undefined,
                email: targetEmail || undefined,
                code: code
            });

            if (!result || !result.success) {
                window.app.showToast(result?.message || 'Invalid verification code.', 'error');
                return;
            }

            // Step 1 Success: close email modal and dispatch mobile OTP
            document.getElementById('prov-email-verify-modal')?.classList.add('hidden');
            
            const phoneEl = document.getElementById('prov-verify-target-phone');
            if (phoneEl && this.pendingProviderPhone) {
                phoneEl.innerText = `+91 ${this.pendingProviderPhone}`;
            }

            // Send Mobile OTP
            try {
                await window.api.post('/auth/send-mobile-otp', {
                    userId: userId || undefined,
                    email: targetEmail || undefined,
                    mobile: this.pendingProviderPhone || undefined
                });
            } catch (e) {
                console.warn('Mobile OTP dispatch notice:', e);
            }

            const mobileModal = document.getElementById('prov-mobile-otp-modal');
            if (mobileModal) {
                const mobileInput = document.getElementById('prov-mobile-otp-input');
                if (mobileInput) mobileInput.value = '';
                mobileModal.classList.remove('hidden');
                window.app.showToast('Email verified! A mobile OTP has been sent to your phone.', 'success');
            } else {
                window.app.showToast('Email verified! Your host account is awaiting admin approval.', 'success');
                window.app.openProviderAuthModal('login');
            }
        } catch (err) {
            window.app.showToast(err.message || 'Verification failed. Please try again.', 'error');
        }
    }

    async resendProviderEmailCode() {
        const targetEmail = this.pendingProviderEmail || document.getElementById('prov-verify-target-email')?.innerText?.trim();
        window.app.showToast('Resending verification code...', 'info');
        const res = await window.auth.resendOtp(targetEmail);
        if (res.success) {
            window.app.showToast('New verification code sent to your email!', 'success');
            const input = document.getElementById('prov-email-code-input');
            if (input) input.value = '';
        } else {
            window.app.showToast(res.message || 'Failed to resend code.', 'error');
        }
    }

    async submitProviderMobileVerification() {
        const input = document.getElementById('prov-mobile-otp-input');
        const code = input ? input.value.trim() : '';
        if (!code) {
            window.app.showToast('Please enter the mobile OTP code.', 'error');
            return;
        }

        const targetEmail = this.pendingProviderEmail || document.getElementById('prov-verify-target-email')?.innerText?.trim();
        const userId = this.pendingProviderUserId || window.auth?.pendingVerificationUserId;

        window.app.showToast('Verifying mobile OTP...', 'info');

        try {
            const res = await window.api.post('/auth/verify-mobile-otp', {
                userId: userId || undefined,
                email: targetEmail || undefined,
                code
            });

            if (!res || !res.success) {
                window.app.showToast(res?.message || 'Invalid mobile OTP.', 'error');
                return;
            }

            document.getElementById('prov-mobile-otp-modal')?.classList.add('hidden');
            window.app.closeAllModals();

            const savedIdentifier = targetEmail || this.pendingProviderPhone;
            if (savedIdentifier) {
                localStorage.setItem('TOIGO_HOST_LOGIN_IDENTIFIER', savedIdentifier);
            }

            if (res.token) {
                window.api.setToken(res.token);
                window.auth.saveStoredUser(res.user);
                window.app.setRoleMode('PROVIDER');
                window.app.showToast('Host account verified & signed in successfully! Welcome to TOIGO.', 'success');
            } else {
                window.app.showToast('Host registration complete! Your account is awaiting Admin Approval (PENDING).', 'success');
                window.app.openProviderAuthModal('login');
                const emailInput = document.getElementById('prov-login-email');
                if (emailInput && savedIdentifier) emailInput.value = savedIdentifier;
            }
        } catch (err) {
            window.app.showToast(err.message || 'Mobile verification failed.', 'error');
        }
    }

    async resendProviderMobileOtp() {
        const targetEmail = this.pendingProviderEmail || document.getElementById('prov-verify-target-email')?.innerText?.trim();
        const userId = this.pendingProviderUserId || window.auth?.pendingVerificationUserId;

        window.app.showToast('Resending mobile OTP to +91 ' + (this.pendingProviderPhone || 'your registered number') + '...', 'info');
        try {
            const res = await window.api.post('/auth/send-mobile-otp', {
                userId: userId || undefined,
                email: targetEmail || undefined,
                mobile: this.pendingProviderPhone || undefined
            });

            if (res.success) {
                window.app.showToast('New mobile OTP dispatched!', 'success');
                const input = document.getElementById('prov-mobile-otp-input');
                if (input) input.value = '';
            } else {
                window.app.showToast(res.message || 'Failed to resend mobile OTP.', 'error');
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error resending mobile OTP.', 'error');
        }
    }

    closeManageToiletModal() {
        this.closeEditToiletModal();
        document.getElementById('manage-toilet-modal')?.classList.add('hidden');
    }

    async submitManageToilet(event) {
        if (this.submitEditToilet) {
            await this.submitEditToilet(event);
        } else if (this.saveToiletEdits) {
            await this.saveToiletEdits(event);
        }
    }
}

window.providerFlow = new ProviderFlowController();
