/**
 * TOIGO: Provider Flow Controller
 * Provider Home: My Toilets, Add Toilet (Starts as 'PENDING'), Verification status, Reports on own toilets.
 */

class ProviderFlowController {
    constructor() {
        this.pickerMapInstance = null;
        this.pickerMarker = null;
        this.newToiletCoords = { lat: 28.6315, lng: 77.2167 };
        this.uploadedPhotos = [];
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${myToilets.map(t => {
                    let badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
                    let statusLabel = '⏳ PENDING APPROVAL';
                    let notice = 'Submitted to Admin for safety & sanitation verification.';

                    if (t.status === 'APPROVED') {
                        badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                        statusLabel = '✓ APPROVED & PUBLIC';
                        notice = 'Live and discoverable by citizens on TOIGO Map.';
                    } else if (t.status === 'REJECTED') {
                        badgeClass = 'bg-red-100 text-red-900 border-red-300';
                        statusLabel = '✕ REJECTED';
                        notice = `Rejection Reason: ${t.rejectionReason || 'Sanitation criteria not met'}`;
                    }

                    return `
                        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                            <div class="flex gap-3">
                                <img src="${(t.photos && t.photos[0]) || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80'}" class="w-20 h-20 rounded-xl object-cover border border-slate-100" />
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-bold text-slate-900 text-sm truncate">${t.name}</h4>
                                    </div>
                                    <p class="text-[11px] text-slate-500 truncate mt-0.5">📍 ${t.address}</p>
                                    <div class="flex items-center gap-1.5 mt-2">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeClass}">
                                            ${statusLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p class="text-xs ${t.status === 'REJECTED' ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50'} p-2 rounded-xl border border-slate-100">
                                ${notice}
                            </p>

                            <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                <span class="font-bold text-slate-700">Fee: ${t.price === 0 ? 'FREE' : '₹' + t.price}</span>
                                <span class="text-slate-400">Timings: ${t.openingTime} - ${t.closingTime}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = `
            <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
                <!-- Host Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-black text-slate-900 font-heading">${prov.businessName || prov.name}</h1>
                            <span class="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">Host Partner</span>
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5">Linked Email: <span class="font-mono text-slate-700">${prov.email}</span></p>
                    </div>
                    <button onclick="window.providerFlow.openAddToiletModal()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition">
                        + Add Public Toilet
                    </button>
                </div>

                <!-- Verification Metrics Grid -->
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                        <span class="text-[10px] font-bold text-amber-800 uppercase">Pending Verification</span>
                        <h3 class="text-2xl font-black text-amber-900 mt-0.5">${pendingCount}</h3>
                        <p class="text-[10px] text-amber-700 mt-0.5">Awaiting Admin inspection</p>
                    </div>
                    <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                        <span class="text-[10px] font-bold text-emerald-800 uppercase">Approved & Public</span>
                        <h3 class="text-2xl font-black text-emerald-900 mt-0.5">${approvedCount}</h3>
                        <p class="text-[10px] text-emerald-700 mt-0.5">Active on Map</p>
                    </div>
                    <div class="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                        <span class="text-[10px] font-bold text-red-800 uppercase">Rejected</span>
                        <h3 class="text-2xl font-black text-red-900 mt-0.5">${rejectedCount}</h3>
                        <p class="text-[10px] text-red-700 mt-0.5">Needs correction</p>
                    </div>
                </div>

                <!-- My Toilets List -->
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider">My Registered Restrooms (${myToilets.length})</h3>
                    </div>
                    ${toiletsListHtml}
                </div>

                <!-- Reports on My Toilets -->
                <div class="bg-white rounded-3xl p-5 border border-slate-200 space-y-3">
                    <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider">Citizen Complaints On My Restrooms (${myReports.length})</h3>
                    ${myReports.length === 0 ? `
                        <p class="text-xs text-slate-400">No issues reported for your restrooms. Great job maintaining hygiene!</p>
                    ` : myReports.map(r => `
                        <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                            <div class="flex justify-between font-bold text-slate-900">
                                <span>${r.category} (${r.toiletName})</span>
                                <span class="text-amber-600">${r.status}</span>
                            </div>
                            <p class="text-slate-600">${r.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    openAddToiletModal() {
        const modal = document.getElementById('add-toilet-modal');
        if (!modal) return;

        this.uploadedPhotos = [];
        this.paymentType = 'paid'; // 'free' | 'paid'
        modal.classList.remove('hidden');

        // Reset payment mode
        this.setPaymentType('paid');

        setTimeout(() => {
            this.initMapPicker();
        }, 200);
    }

    closeAddToiletModal() {
        document.getElementById('add-toilet-modal')?.classList.add('hidden');
    }

    setPaymentType(type) {
        this.paymentType = type;
        const btnFree = document.getElementById('pay-type-free-btn');
        const btnPaid = document.getElementById('pay-type-paid-btn');
        const feeContainer = document.getElementById('paid-fee-container');
        const priceInput = document.getElementById('new-toilet-price-input');

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

    setQuickPrice(amt) {
        const priceInput = document.getElementById('new-toilet-price-input');
        if (priceInput) {
            priceInput.value = amt;
        }
        document.querySelectorAll('.quick-price-chip').forEach(chip => {
            if (Number(chip.dataset.price) === amt) {
                chip.className = 'quick-price-chip px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs transition';
            } else {
                chip.className = 'quick-price-chip px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition';
            }
        });
    }

    initMapPicker() {
        const container = document.getElementById('picker-map-container');
        if (!container) return;

        container.innerHTML = '<div id="picker-map" style="height: 180px; width: 100%; border-radius: 12px;"></div>';

        const lat = this.newToiletCoords.lat;
        const lng = this.newToiletCoords.lng;

        if (this.pickerMapInstance) {
            this.pickerMapInstance.remove();
            this.pickerMapInstance = null;
        }

        this.pickerMapInstance = L.map('picker-map').setView([lat, lng], 16);
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

    useGpsForNewToilet() {
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
                this.reverseGeocodeCoords(lat, lng);
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

    reverseGeocodeCoords(lat, lng) {
        const addressInput = document.querySelector('input[name="address"]');
        if (!addressInput) return;

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: { 'User-Agent': 'TOIGO-Public-Sanitation-App/2.0' }
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) {
                // Shorten formatted address
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

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedPhotos = [e.target.result];
            const preview = document.getElementById('new-toilet-photo-preview');
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
}

window.providerFlow = new ProviderFlowController();
