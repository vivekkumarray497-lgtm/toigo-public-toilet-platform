/**
 * TOIGO: Provider Flow Controller
 * Complete Restroom Management:
 * - Provider Registration with Dual Verification (Email + Mobile OTP)
 * - Provider Login & Forgot Password (OTP Verification)
 * - My Toilets: View Details, Edit (Triggers Admin Re-Verification if Approved), Manage (Open/Closed, Active/Inactive), Remove (Confirmation)
 * - Strict Ownership Check & Database Isolation
 */

class ProviderFlowController {
    constructor() {
        this.pickerMapInstance = null;
        this.pickerMarker = null;
        this.newToiletCoords = { lat: 28.6315, lng: 77.2167 };
        this.uploadedPhotos = [];
        this.editingToiletId = null;
        this.paymentType = 'paid'; // 'free' | 'paid'
        this.pendingResetProviderId = null;
        this.pendingResetToken = null;
    }

    init() {
        this.renderProviderDashboard();
    }

    renderProviderDashboard() {
        const prov = window.auth.getCurrentUser();
        const container = document.getElementById('provider-dashboard-view');
        if (!container) return;

        if (!prov || prov.role !== 'PROVIDER') {
            container.innerHTML = `
                <div class="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto my-8 space-y-4">
                    <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm">
                        🏢
                    </div>
                    <h2 class="text-xl font-black text-slate-900">Provider Sign In</h2>
                    <p class="text-xs text-slate-500">Sign in to manage your public washrooms, upload facilities and track admin approval.</p>
                    <button onclick="window.app.openProviderAuthModal('login')" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition">
                        Host Login / Register Now →
                    </button>
                </div>
            `;
            return;
        }

        // Strict Ownership Filtering: only show toilets belonging to this provider
        const myToilets = window.db.getToiletsByProvider(prov.userId);
        const myReports = window.db.getProviderReports(prov.userId);

        const pendingCount = myToilets.filter(t => t.status === 'PENDING').length;
        const approvedCount = myToilets.filter(t => t.status === 'APPROVED').length;
        const rejectedCount = myToilets.filter(t => t.status === 'REJECTED').length;

        const toiletsListHtml = myToilets.length === 0 ? `
            <div class="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl">
                    🚽
                </div>
                <h3 class="font-bold text-slate-800 text-sm mb-1">No Washrooms Added Yet</h3>
                <p class="text-xs text-slate-500 mb-3 max-w-sm mx-auto">Submit your toilet facility for Admin inspection and start earning money.</p>
                <button onclick="window.providerFlow.openAddToiletModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-700 transition">
                    + Add New Public Toilet
                </button>
            </div>
        ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${myToilets.map(t => {
                    let badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
                    let statusLabel = '⏳ PENDING VERIFICATION';
                    let notice = 'Submitted to Admin for safety & sanitation inspection.';

                    if (t.status === 'APPROVED') {
                        badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                        statusLabel = '✓ APPROVED & PUBLIC';
                        notice = 'Live and discoverable by citizens on TOIGO Map.';
                    } else if (t.status === 'REJECTED') {
                        badgeClass = 'bg-red-100 text-red-900 border-red-300';
                        statusLabel = '✕ REJECTED';
                        notice = `Rejection Reason: ${t.rejectionReason || 'Sanitation criteria not met'}`;
                    }

                    const isOpen = t.isOpen !== false;
                    const isActive = t.active !== false;

                    return `
                        <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5 flex flex-col justify-between">
                            <div class="space-y-3">
                                <div class="flex gap-3.5">
                                    <img src="${(t.photos && t.photos[0]) || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80'}" class="w-20 h-20 rounded-2xl object-cover border border-slate-200 flex-shrink-0" />
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center justify-between gap-1">
                                            <h4 class="font-black text-slate-900 text-sm truncate">${t.name}</h4>
                                        </div>
                                        <p class="text-[11px] text-slate-500 truncate mt-0.5">📍 ${t.address}</p>
                                        <div class="flex flex-wrap items-center gap-1.5 mt-2">
                                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black border ${badgeClass}">
                                                ${statusLabel}
                                            </span>
                                            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${isOpen ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                                                ● ${isOpen ? 'Open Now' : 'Closed'}
                                            </span>
                                            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-600'}">
                                                ${isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <p class="text-xs ${t.status === 'REJECTED' ? 'text-red-700 bg-red-50/80 border-red-200' : 'text-slate-600 bg-slate-50 border-slate-100'} p-2.5 rounded-xl border">
                                    ${notice}
                                </p>

                                <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                                    <div class="flex items-center gap-1 text-slate-700 font-semibold">
                                        <span>💰 Pricing:</span>
                                        <span class="font-black ${t.isFree || t.price === 0 ? 'text-emerald-600' : 'text-indigo-600'}">
                                            ${t.isFree || t.price === 0 ? 'FREE' : '₹' + t.price + ' / use'}
                                        </span>
                                    </div>
                                    <div class="text-slate-500 text-right truncate">
                                        🕒 ${t.openingTime || '06:00 AM'} - ${t.closingTime || '11:00 PM'}
                                    </div>
                                </div>
                            </div>

                            <!-- 4 Mandatory Action Controls: View Details, Edit, Manage, Remove -->
                            <div class="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
                                <button onclick="window.providerFlow.viewToiletDetails('${t.toiletId}')" 
                                    class="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition flex items-center justify-center gap-1">
                                    <span>👁️</span> Details
                                </button>
                                <button onclick="window.providerFlow.openEditToiletModal('${t.toiletId}')" 
                                    class="py-2 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition flex items-center justify-center gap-1">
                                    <span>✏️</span> Edit
                                </button>
                                <button onclick="window.providerFlow.openManageToiletModal('${t.toiletId}')" 
                                    class="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition flex items-center justify-center gap-1">
                                    <span>⚙️</span> Manage
                                </button>
                                <button onclick="window.providerFlow.confirmRemoveToilet('${t.toiletId}')" 
                                    class="py-2 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition flex items-center justify-center gap-1">
                                    <span>🗑️</span> Remove
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = `
            <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
                <!-- Host Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-black text-slate-900 font-heading">${prov.businessName || prov.name}</h1>
                            <span class="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">Verified Host</span>
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5">Mobile: <span class="font-mono text-slate-700">+91 ${prov.phone || '9876543210'}</span> • Email: <span class="font-mono text-slate-700">${prov.email}</span></p>
                    </div>
                    <button onclick="window.providerFlow.openAddToiletModal()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 self-start sm:self-auto">
                        <span>➕</span> Add New Public Toilet
                    </button>
                </div>

                <!-- Verification Metrics Grid -->
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                        <span class="text-[10px] font-bold text-amber-800 uppercase">Pending Verification</span>
                        <h3 class="text-2xl font-black text-amber-900 mt-0.5">${pendingCount}</h3>
                        <p class="text-[10px] text-amber-700 mt-0.5">Awaiting Admin Decision</p>
                    </div>
                    <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                        <span class="text-[10px] font-bold text-emerald-800 uppercase">Approved & Public</span>
                        <h3 class="text-2xl font-black text-emerald-900 mt-0.5">${approvedCount}</h3>
                        <p class="text-[10px] text-emerald-700 mt-0.5">Live on Citizen Map</p>
                    </div>
                    <div class="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                        <span class="text-[10px] font-bold text-red-800 uppercase">Rejected</span>
                        <h3 class="text-2xl font-black text-red-900 mt-0.5">${rejectedCount}</h3>
                        <p class="text-[10px] text-red-700 mt-0.5">Needs Corrections</p>
                    </div>
                </div>

                <!-- My Toilets Section -->
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider">My Registered Restrooms (${myToilets.length})</h3>
                    </div>
                    ${toiletsListHtml}
                </div>

                <!-- Citizen Complaints on My Restrooms -->
                <div class="bg-white rounded-3xl p-5 border border-slate-200 space-y-3">
                    <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider">Citizen Complaints On My Restrooms (${myReports.length})</h3>
                    ${myReports.length === 0 ? `
                        <p class="text-xs text-slate-400">No issues reported for your restrooms. Great job maintaining hygiene!</p>
                    ` : myReports.map(r => `
                        <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                            <div class="flex justify-between font-bold text-slate-900">
                                <span>${r.category} (${r.toiletName})</span>
                                <span class="text-amber-600">● ${r.status}</span>
                            </div>
                            <p class="text-slate-600">${r.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ================= VIEW TOILET DETAILS =================
    viewToiletDetails(toiletId) {
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;
        if (window.userFlow) {
            window.userFlow.openToiletDetailModal(toilet);
        }
    }

    // ================= ADD TOILET =================
    openAddToiletModal() {
        const modal = document.getElementById('add-toilet-modal');
        if (!modal) return;

        this.uploadedPhotos = [];
        this.paymentType = 'paid';
        modal.classList.remove('hidden');

        this.setPaymentType('paid');

        setTimeout(() => {
            this.initMapPicker('picker-map-container', 'picker-map');
        }, 200);
    }

    closeAddToiletModal() {
        document.getElementById('add-toilet-modal')?.classList.add('hidden');
    }

    setPaymentType(type, formPrefix = '') {
        this.paymentType = type;
        const btnFree = document.getElementById(`${formPrefix}pay-type-free-btn`);
        const btnPaid = document.getElementById(`${formPrefix}pay-type-paid-btn`);
        const feeContainer = document.getElementById(`${formPrefix}paid-fee-container`);
        const priceInput = document.getElementById(`${formPrefix}new-toilet-price-input`);

        if (type === 'free') {
            if (btnFree) btnFree.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm transition';
            if (btnPaid) btnPaid.className = 'flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
            if (feeContainer) feeContainer.classList.add('hidden');
            if (priceInput) priceInput.value = '0';
        } else {
            if (btnFree) btnFree.className = 'flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
            if (btnPaid) btnPaid.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm transition';
            if (feeContainer) feeContainer.classList.remove('hidden');
            if (priceInput && (priceInput.value === '0' || !priceInput.value)) priceInput.value = '10';
        }
    }

    setQuickPrice(amt, inputId = 'new-toilet-price-input') {
        const priceInput = document.getElementById(inputId);
        if (priceInput) priceInput.value = amt;
    }

    initMapPicker(containerId, mapDivId, defaultCoords = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `<div id="${mapDivId}" style="height: 180px; width: 100%; border-radius: 12px;"></div>`;

        const lat = defaultCoords ? defaultCoords.lat : this.newToiletCoords.lat;
        const lng = defaultCoords ? defaultCoords.lng : this.newToiletCoords.lng;

        if (this.pickerMapInstance) {
            this.pickerMapInstance.remove();
            this.pickerMapInstance = null;
        }

        this.pickerMapInstance = L.map(mapDivId).setView([lat, lng], 16);
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(this.pickerMapInstance);

        this.pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(this.pickerMapInstance);
        this.pickerMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            this.newToiletCoords = { lat: pos.lat, lng: pos.lng };
            this.reverseGeocodeCoords(pos.lat, pos.lng);
        });
    }

    useGpsForNewToilet(addressInputSelector = 'input[name="address"]') {
        if (!navigator.geolocation) {
            window.app.showToast('Geolocation not supported by device.', 'error');
            return;
        }

        const gpsBtn = document.getElementById('add-toilet-gps-btn');
        if (gpsBtn) {
            gpsBtn.innerHTML = '<span>⏳</span> Locating GPS...';
            gpsBtn.disabled = true;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                this.newToiletCoords = { lat, lng };

                if (this.pickerMapInstance && this.pickerMarker) {
                    this.pickerMapInstance.setView([lat, lng], 17);
                    this.pickerMarker.setLatLng([lat, lng]);
                }

                if (gpsBtn) {
                    gpsBtn.innerHTML = '<span>📍</span> GPS Captured ✓';
                    gpsBtn.disabled = false;
                }

                window.app.showToast(`Current GPS captured: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
                this.reverseGeocodeCoords(lat, lng, addressInputSelector);
            },
            (err) => {
                console.warn('GPS location error:', err);
                if (gpsBtn) {
                    gpsBtn.innerHTML = '<span>📍</span> Use Current GPS';
                    gpsBtn.disabled = false;
                }
                window.app.showToast('Location permission denied or GPS unavailable. Please enable device location.', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    reverseGeocodeCoords(lat, lng, addressInputSelector = 'input[name="address"]') {
        const addressInput = document.querySelector(addressInputSelector);
        if (!addressInput) return;

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: { 'User-Agent': 'TOIGO-Public-Sanitation-App/2.0' }
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) {
                const parts = data.display_name.split(', ');
                const cleanAddress = parts.slice(0, 4).join(', ');
                addressInput.value = cleanAddress;
                window.app.showToast('Address autofilled from GPS!', 'info');
            }
        })
        .catch(() => {
            if (!addressInput.value) {
                addressInput.value = `Near GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }
        });
    }

    handlePhotoUpload(event, previewId = 'new-toilet-photo-preview') {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedPhotos = [e.target.result];
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }

    submitNewToilet(formData) {
        const prov = window.auth.getCurrentUser();
        if (!prov) return;

        if (!formData.name || formData.name.trim().length < 3) {
            window.app.showToast('Please enter a valid Toilet Name.', 'error');
            return;
        }
        if (!formData.address || formData.address.trim().length < 5) {
            window.app.showToast('Please enter a complete address.', 'error');
            return;
        }

        const isFree = this.paymentType === 'free' || Number(formData.price || 0) === 0;
        const price = isFree ? 0 : Number(formData.price || 10);

        const facilities = [];
        if (document.getElementById('fac-soap')?.checked) facilities.push('Hand Soap');
        if (document.getElementById('fac-water')?.checked) facilities.push('Running Water');
        if (document.getElementById('fac-spray')?.checked) facilities.push('Jet Spray');
        if (document.getElementById('fac-mirror')?.checked) facilities.push('Mirror');
        if (document.getElementById('fac-wheelchair')?.checked) facilities.push('Wheelchair Accessible');

        window.db.addToiletByProvider(prov.userId, {
            name: formData.name,
            address: formData.address,
            description: formData.description,
            latitude: this.newToiletCoords.lat,
            longitude: this.newToiletCoords.lng,
            openingTime: formData.openingTime || '06:00 AM',
            closingTime: formData.closingTime || '11:00 PM',
            commodeType: formData.commodeType || 'English / Western',
            genderType: formData.genderType || 'Unisex',
            facilities: facilities.length > 0 ? facilities : ['Hand Soap', 'Running Water', 'Jet Spray'],
            accessibility: formData.accessibility || 'Ground Floor Accessible',
            price: price,
            isFree: isFree,
            photos: this.uploadedPhotos
        });

        this.closeAddToiletModal();
        window.app.showToast(`Toilet submitted with fee ₹${price} for Admin verification (Status: PENDING) ⏳`, 'info');
        this.renderProviderDashboard();
    }

    // ================= 5. EDIT TOILET (WITH ADMIN RE-VERIFICATION) =================
    openEditToiletModal(toiletId) {
        const prov = window.auth.getCurrentUser();
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet || !prov || toilet.providerId !== prov.userId) {
            window.app.showToast('Unauthorized access to toilet.', 'error');
            return;
        }

        this.editingToiletId = toiletId;
        this.newToiletCoords = { lat: toilet.latitude, lng: toilet.longitude };
        this.uploadedPhotos = toilet.photos || [];

        const modal = document.getElementById('edit-toilet-modal');
        if (!modal) return;

        document.getElementById('edit-toilet-name').value = toilet.name;
        document.getElementById('edit-toilet-address').value = toilet.address;
        document.getElementById('edit-toilet-commode').value = toilet.commodeType || 'English / Western';
        document.getElementById('edit-toilet-gender').value = toilet.genderType || 'Unisex';
        document.getElementById('edit-toilet-open-time').value = toilet.openingTime || '06:00 AM';
        document.getElementById('edit-toilet-close-time').value = toilet.closingTime || '11:00 PM';
        document.getElementById('edit-toilet-accessibility').value = toilet.accessibility || 'Ground Floor Accessible';
        document.getElementById('edit-toilet-price').value = toilet.price || 0;

        // Set free/paid mode
        this.setPaymentType(toilet.isFree || toilet.price === 0 ? 'free' : 'paid', 'edit-');

        // Checkbox facilities
        const facs = toilet.facilities || [];
        if (document.getElementById('edit-fac-soap')) document.getElementById('edit-fac-soap').checked = facs.includes('Hand Soap');
        if (document.getElementById('edit-fac-water')) document.getElementById('edit-fac-water').checked = facs.includes('Running Water');
        if (document.getElementById('edit-fac-spray')) document.getElementById('edit-fac-spray').checked = facs.includes('Jet Spray');
        if (document.getElementById('edit-fac-mirror')) document.getElementById('edit-fac-mirror').checked = facs.includes('Mirror');
        if (document.getElementById('edit-fac-wheelchair')) document.getElementById('edit-fac-wheelchair').checked = facs.includes('Wheelchair Accessible');

        modal.classList.remove('hidden');

        setTimeout(() => {
            this.initMapPicker('edit-picker-map-container', 'edit-picker-map', this.newToiletCoords);
        }, 200);
    }

    closeEditToiletModal() {
        document.getElementById('edit-toilet-modal')?.classList.add('hidden');
        this.editingToiletId = null;
    }

    submitEditToilet() {
        const prov = window.auth.getCurrentUser();
        if (!prov || !this.editingToiletId) return;

        const name = document.getElementById('edit-toilet-name').value.trim();
        const address = document.getElementById('edit-toilet-address').value.trim();
        const commodeType = document.getElementById('edit-toilet-commode').value;
        const genderType = document.getElementById('edit-toilet-gender').value;
        const openingTime = document.getElementById('edit-toilet-open-time').value;
        const closingTime = document.getElementById('edit-toilet-close-time').value;
        const accessibility = document.getElementById('edit-toilet-accessibility').value;
        const price = this.paymentType === 'free' ? 0 : Number(document.getElementById('edit-toilet-price').value || 10);

        if (!name || name.length < 3) {
            window.app.showToast('Please enter a valid Toilet Name.', 'error');
            return;
        }
        if (!address || address.length < 5) {
            window.app.showToast('Please enter a complete address.', 'error');
            return;
        }

        const facilities = [];
        if (document.getElementById('edit-fac-soap')?.checked) facilities.push('Hand Soap');
        if (document.getElementById('edit-fac-water')?.checked) facilities.push('Running Water');
        if (document.getElementById('edit-fac-spray')?.checked) facilities.push('Jet Spray');
        if (document.getElementById('edit-fac-mirror')?.checked) facilities.push('Mirror');
        if (document.getElementById('edit-fac-wheelchair')?.checked) facilities.push('Wheelchair Accessible');

        const res = window.db.updateProviderToilet(prov.userId, this.editingToiletId, {
            name,
            address,
            commodeType,
            genderType,
            openingTime,
            closingTime,
            accessibility,
            price,
            facilities,
            latitude: this.newToiletCoords.lat,
            longitude: this.newToiletCoords.lng,
            photos: this.uploadedPhotos
        });

        if (!res.success) {
            window.app.showToast(res.message, 'error');
            return;
        }

        this.closeEditToiletModal();
        window.app.showToast(res.message, 'success');
        this.renderProviderDashboard();
    }

    // ================= 6. MANAGE TOILET (OPERATIONAL CONTROLS) =================
    openManageToiletModal(toiletId) {
        const prov = window.auth.getCurrentUser();
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet || !prov || toilet.providerId !== prov.userId) {
            window.app.showToast('Unauthorized access to toilet.', 'error');
            return;
        }

        this.editingToiletId = toiletId;
        const modal = document.getElementById('manage-toilet-modal');
        if (!modal) return;

        document.getElementById('manage-target-name').innerText = toilet.name;
        document.getElementById('manage-target-address').innerText = toilet.address;
        document.getElementById('manage-status-open').checked = toilet.isOpen !== false;
        document.getElementById('manage-status-closed').checked = toilet.isOpen === false;
        document.getElementById('manage-active-toggle').checked = toilet.active !== false;
        document.getElementById('manage-fee-input').value = toilet.price || 0;

        modal.classList.remove('hidden');
    }

    closeManageToiletModal() {
        document.getElementById('manage-toilet-modal')?.classList.add('hidden');
        this.editingToiletId = null;
    }

    submitManageToilet() {
        const prov = window.auth.getCurrentUser();
        if (!prov || !this.editingToiletId) return;

        const isOpen = document.getElementById('manage-status-open').checked;
        const active = document.getElementById('manage-active-toggle').checked;
        const price = Number(document.getElementById('manage-fee-input').value || 0);

        const res = window.db.manageProviderToilet(prov.userId, this.editingToiletId, {
            isOpen,
            active,
            price,
            isFree: price === 0
        });

        if (!res.success) {
            window.app.showToast(res.message, 'error');
            return;
        }

        this.closeManageToiletModal();
        window.app.showToast(res.message, 'success');
        this.renderProviderDashboard();
    }

    // ================= 7. REMOVE TOILET (WITH CONFIRMATION) =================
    confirmRemoveToilet(toiletId) {
        const prov = window.auth.getCurrentUser();
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet || !prov || toilet.providerId !== prov.userId) {
            window.app.showToast('Unauthorized access to toilet.', 'error');
            return;
        }

        this.editingToiletId = toiletId;
        const modal = document.getElementById('remove-toilet-modal');
        if (modal) {
            document.getElementById('remove-target-toilet-name').innerText = toilet.name;
            modal.classList.remove('hidden');
        } else {
            if (confirm(`Are you sure you want to remove this toilet?\n"${toilet.name}"`)) {
                this.executeRemoveToilet(toiletId);
            }
        }
    }

    closeRemoveToiletModal() {
        document.getElementById('remove-toilet-modal')?.classList.add('hidden');
        this.editingToiletId = null;
    }

    executeRemoveToilet(toiletId = null) {
        const id = toiletId || this.editingToiletId;
        const prov = window.auth.getCurrentUser();
        if (!id || !prov) return;

        const res = window.db.removeProviderToilet(prov.userId, id);
        this.closeRemoveToiletModal();

        if (res.success) {
            window.app.showToast('Toilet removed from TOIGO. It is no longer visible to users.', 'info');
            this.renderProviderDashboard();
        } else {
            window.app.showToast(res.message, 'error');
        }
    }

    // ================= PROVIDER DUAL VERIFICATION FLOW =================
    openProviderEmailVerifyModal(providerId, codeHint = null) {
        window.app.closeAllModals();
        const modal = document.getElementById('prov-email-verify-modal');
        if (!modal) return;

        const prov = window.db.findProviderById(providerId);
        if (prov) {
            document.getElementById('prov-verify-target-email').innerText = prov.email;
            if (codeHint || prov.emailVerificationCode) {
                document.getElementById('prov-email-code-input').value = codeHint || prov.emailVerificationCode;
            }
        }
        modal.classList.remove('hidden');
    }

    submitProviderEmailVerification() {
        const code = document.getElementById('prov-email-code-input').value.trim();
        const res = window.auth.verifyProviderEmail(null, code);

        if (!res.success) {
            window.app.showToast(res.message, 'error');
            return;
        }

        window.app.showToast(res.message, 'success');
        this.openProviderMobileOtpModal(res.provider.providerId, res.mobileOtp);
    }

    openProviderMobileOtpModal(providerId, otpHint = null) {
        window.app.closeAllModals();
        const modal = document.getElementById('prov-mobile-otp-modal');
        if (!modal) return;

        const prov = window.db.findProviderById(providerId);
        if (prov) {
            document.getElementById('prov-verify-target-phone').innerText = `+91 ${prov.phone}`;
            if (otpHint || prov.mobileOtp) {
                document.getElementById('prov-mobile-otp-input').value = otpHint || prov.mobileOtp;
            }
        }
        modal.classList.remove('hidden');
    }

    submitProviderMobileVerification() {
        const otp = document.getElementById('prov-mobile-otp-input').value.trim();
        const res = window.auth.verifyProviderMobileOtp(null, otp);

        if (!res.success) {
            window.app.showToast(res.message, 'error');
            return;
        }

        window.app.closeAllModals();
        window.app.showToast(res.message, 'success');
        window.app.setRoleMode('PROVIDER');
    }

    resendProviderEmailCode() {
        const res = window.auth.resendProviderEmailCode(null);
        if (res.success) {
            document.getElementById('prov-email-code-input').value = res.code;
            window.app.showToast(res.message, 'success');
        } else {
            window.app.showToast(res.message, 'error');
        }
    }

    resendProviderMobileOtp() {
        const res = window.auth.resendProviderMobileOtp(null);
        if (res.success) {
            document.getElementById('prov-mobile-otp-input').value = res.otp;
            window.app.showToast(res.message, 'success');
        } else {
            window.app.showToast(res.message, 'error');
        }
    }

    // ================= PROVIDER FORGOT PASSWORD FLOW =================
    openProviderForgotPasswordModal() {
        window.app.closeAllModals();
        document.getElementById('prov-forgot-pass-modal')?.classList.remove('hidden');
    }

    submitProviderForgotPasswordRequest(event) {
        event.preventDefault();
        const identifier = document.getElementById('prov-forgot-identifier').value.trim();
        const res = window.auth.initiateProviderForgotPassword(identifier);

        if (!res.success) {
            window.app.showToast(res.message, 'error');
            return;
        }

        this.pendingResetProviderId = res.providerId;
        window.app.closeAllModals();

        // Open OTP verification modal
        const modal = document.getElementById('prov-forgot-otp-modal');
        if (modal) {
            document.getElementById('prov-forgot-target-dest').innerText = res.destinationMasked;
            document.getElementById('prov-forgot-otp-input').value = res.otpHint || '';
            modal.classList.remove('hidden');
        }
        window.app.showToast(res.message, 'info');
    }

    submitProviderForgotOtp() {
        const otp = document.getElementById('prov-forgot-otp-input').value.trim();
        const res = window.auth.verifyProviderForgotOtp(this.pendingResetProviderId, otp);

        if (!res.success) {
            window.app.showToast(res.message, 'error');
            return;
        }

        this.pendingResetToken = res.resetToken;
        window.app.closeAllModals();

        // Open new password modal
        document.getElementById('prov-reset-pass-modal')?.classList.remove('hidden');
        window.app.showToast(res.message, 'success');
    }

    submitProviderResetPassword(event) {
        event.preventDefault();
        const newPass = document.getElementById('prov-new-pass').value;
        const confirmPass = document.getElementById('prov-new-pass-confirm').value;

        const res = window.auth.resetProviderPassword(this.pendingResetProviderId, this.pendingResetToken, newPass, confirmPass);

        if (!res.success) {
            window.app.showToast(res.message, 'error');
            return;
        }

        window.app.closeAllModals();
        window.app.showToast(res.message, 'success');
        window.app.openProviderAuthModal('login');
    }
}

window.providerFlow = new ProviderFlowController();
