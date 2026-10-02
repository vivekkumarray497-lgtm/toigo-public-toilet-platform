/**
 * TOIGO: Provider Flow Controller (Host Onboarding, GPS Location Picker, Direct QR, Banking & Listings)
 */

class ProviderFlowController {
    constructor() {
        this.pickerMapInstance = null;
        this.pickerMarker = null;
        this.newToiletCoords = { lat: 28.6315, lng: 77.2167 };
        this.selectedAmenities = new Set(['Hand Soap', 'Jet Spray', 'Mirror', 'Running Water']);
        this.selectedPhotoUrl = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80';
        this.uploadedListingQr = null;
    }

    init() {
        this.renderProviderDashboard();
    }

    renderProviderDashboard() {
        const prov = window.auth.getCurrentUser();
        const dashContainer = document.getElementById('provider-dashboard-view');
        if (!dashContainer) return;

        if (!prov || prov.role !== 'provider') {
            dashContainer.innerHTML = `
                <div class="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto my-8 space-y-4">
                    <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm">
                        🏢
                    </div>
                    <h2 class="text-xl font-black text-slate-900">Sign In as Toilet Host</h2>
                    <p class="text-xs text-slate-500">Provide your washroom details, direct payment QR code, and bank account to start earning money.</p>
                    <button onclick="window.auth.requireLogin('provider', () => window.providerFlow.renderProviderDashboard())" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition">
                        Host Login / Register Now →
                    </button>
                </div>
            `;
            return;
        }

        const toilets = window.db.getToiletsByProvider(prov.id);
        const myBookings = window.db.data.bookings.filter(b => b.providerId === prov.id);
        const totalVisits = myBookings.length;
        const totalEarnings = (prov.totalEarned || 0) + myBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const walletBal = prov.walletBalance || totalEarnings;

        const isVerified = prov.status === 'verified';

        const metricsHtml = `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div class="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-600/20 flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] uppercase font-bold tracking-wider text-emerald-100">Direct Earnings</span>
                        <span class="p-1.5 bg-white/20 rounded-lg text-xs">💰</span>
                    </div>
                    <div class="my-2">
                        <h2 class="text-2xl font-black">₹${walletBal.toFixed(2)}</h2>
                        <p class="text-[10px] text-emerald-100">Directly deposited via UPI / Cash</p>
                    </div>
                    <div class="text-[10px] text-emerald-200 font-semibold truncate">
                        UPI: ${prov.upiId || 'host@okaxis'}
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Restroom Footfall</span>
                        <span class="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs">👥</span>
                    </div>
                    <div class="my-2">
                        <h2 class="text-2xl font-black text-slate-900">${totalVisits} <span class="text-xs font-normal text-slate-500">Visits</span></h2>
                        <p class="text-[10px] text-slate-500">Across ${toilets.length} registered locations</p>
                    </div>
                    <div class="text-[10px] text-emerald-600 font-bold">
                        ✓ Direct Payouts Active
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Host Bank Account</span>
                        <span class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs">🏦</span>
                    </div>
                    <div class="my-2">
                        <p class="text-xs font-bold text-slate-900">${prov.bankHolderName || prov.name}</p>
                        <p class="text-[10px] text-slate-500 font-mono mt-0.5">A/C: •••• ${prov.bankAccountNo ? prov.bankAccountNo.slice(-4) : '5012'}</p>
                        <p class="text-[10px] text-emerald-700 font-bold">${prov.bankName || 'Verified Bank'} (${prov.bankIfsc || 'UTIB0000123'})</p>
                    </div>
                    <button onclick="window.providerFlow.openAddListingModal()" class="w-full py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition">
                        + Add Another Washroom
                    </button>
                </div>
            </div>
        `;

        const toiletsListHtml = toilets.length === 0 ? `
            <div class="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl">
                    🚽
                </div>
                <h3 class="font-bold text-slate-800 text-sm mb-1">No Washrooms Registered Yet</h3>
                <p class="text-xs text-slate-500 mb-3 max-w-sm mx-auto">Upload your washroom details & direct UPI QR code to start earning money.</p>
                <button onclick="window.providerFlow.openAddListingModal()" class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition">
                    + Register First Toilet
                </button>
            </div>
        ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${toilets.map(t => {
                    const isOpen = t.status === 'open';
                    return `
                        <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition">
                            <div class="flex gap-3">
                                <img src="${t.images[0] || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80'}" class="w-16 h-16 rounded-xl object-cover" />
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-bold text-slate-900 text-xs truncate">${t.name}</h4>
                                        <span class="text-[10px] font-bold ${isOpen ? 'text-emerald-600' : 'text-amber-600'}">
                                            ● ${t.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p class="text-[11px] text-slate-500 truncate mt-0.5">📍 ${t.address}</p>
                                    <div class="flex items-center gap-2 mt-1.5">
                                        <span class="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded">
                                            ₹${t.price} / use
                                        </span>
                                        <span class="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                                            ${t.type}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                <button onclick="window.providerFlow.toggleToiletStatus('${t.id}')" class="px-2.5 py-1 rounded-xl text-xs font-semibold ${isOpen ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}">
                                    ${isOpen ? 'Mark Cleaning' : 'Mark Open'}
                                </button>

                                <button onclick="window.providerFlow.openQrPosterModal('${t.id}')" class="px-3 py-1 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1">
                                    <span>🖨️ Door QR Poster</span>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        dashContainer.innerHTML = `
            <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-black text-slate-900 font-heading">${prov.businessName || prov.name}</h1>
                            <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                                ${isVerified ? '✓ Verified Host Partner' : '⏳ Verification Pending'}
                            </span>
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5">Direct UPI ID: <span class="font-mono font-semibold text-emerald-700">${prov.upiId || 'host@okaxis'}</span></p>
                    </div>
                    <button onclick="window.providerFlow.openAddListingModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition">
                        + Add New Restroom Listing
                    </button>
                </div>

                ${metricsHtml}

                <div>
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider">Your Restroom Listings (${toilets.length})</h3>
                        <span class="text-xs text-slate-500">Live on TOIGO Map</span>
                    </div>
                    ${toiletsListHtml}
                </div>
            </div>
        `;
    }

    toggleToiletStatus(toiletId) {
        const t = window.db.getToiletById(toiletId);
        if (!t) return;
        const newStatus = t.status === 'open' ? 'cleaning' : 'open';
        window.db.updateToilet(toiletId, { status: newStatus });
        window.app.showToast(`Restroom marked as "${newStatus.toUpperCase()}"`, 'info');
        this.renderProviderDashboard();
    }

    // Open Add Toilet Listing Modal
    openAddListingModal() {
        const modal = document.getElementById('add-toilet-modal');
        if (!modal) return;

        this.uploadedListingQr = null;
        const qrPreview = document.getElementById('new-listing-qr-preview');
        if (qrPreview) qrPreview.classList.add('hidden');

        modal.classList.remove('hidden');

        setTimeout(() => {
            this.initPickerMap();
        }, 200);
    }

    closeAddListingModal() {
        const modal = document.getElementById('add-toilet-modal');
        if (modal) modal.classList.add('hidden');
    }

    // Interactive Leaflet Picker Map
    initPickerMap() {
        const container = document.getElementById('picker-map-container');
        if (!container) return;

        container.innerHTML = '<div id="picker-map" style="height: 180px; width: 100%; border-radius: 12px;"></div>';

        const lat = window.toigoMap.userCoords.lat || 28.6315;
        const lng = window.toigoMap.userCoords.lng || 77.2167;
        this.newToiletCoords = { lat, lng };

        if (this.pickerMapInstance) {
            this.pickerMapInstance.remove();
            this.pickerMapInstance = null;
        }

        this.pickerMapInstance = L.map('picker-map', { zoomControl: true }).setView([lat, lng], 16);

        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(this.pickerMapInstance);

        this.pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(this.pickerMapInstance);
        this.pickerMarker.bindPopup('Drag pin to exact restroom door entrance').openPopup();

        this.pickerMarker.on('dragend', (e) => {
            const position = e.target.getLatLng();
            this.newToiletCoords = {
                lat: Number(position.lat.toFixed(6)),
                lng: Number(position.lng.toFixed(6))
            };
            window.app.showToast(`Restroom coordinates set: ${this.newToiletCoords.lat}, ${this.newToiletCoords.lng}`, 'info');
        });

        this.pickerMapInstance.on('click', (e) => {
            this.pickerMarker.setLatLng(e.latlng);
            this.newToiletCoords = {
                lat: Number(e.latlng.lat.toFixed(6)),
                lng: Number(e.latlng.lng.toFixed(6))
            };
        });
    }

    // GPS Current Location for New Restroom
    useCurrentGpsForRestroom() {
        if (!navigator.geolocation) {
            window.app.showToast('Geolocation is not supported by your browser.', 'error');
            return;
        }

        window.app.showToast('Acquiring precise GPS location...', 'info');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = Number(pos.coords.latitude.toFixed(6));
                const lng = Number(pos.coords.longitude.toFixed(6));
                this.newToiletCoords = { lat, lng };

                if (this.pickerMapInstance && this.pickerMarker) {
                    this.pickerMapInstance.setView([lat, lng], 17);
                    this.pickerMarker.setLatLng([lat, lng]);
                }
                window.app.showToast('GPS Location acquired accurately!', 'success');
            },
            (err) => {
                window.app.showToast('Could not fetch GPS. Please drag pin on the map.', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    handleListingQrUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedListingQr = e.target.result;
            const preview = document.getElementById('new-listing-qr-preview');
            if (preview) {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            }
            window.app.showToast('Washroom Payment QR code attached!', 'success');
        };
        reader.readAsDataURL(file);
    }

    submitNewToilet(formData) {
        const prov = window.auth.getCurrentUser();
        if (!prov) return;

        if (!formData.name || formData.name.trim().length < 3) {
            window.app.showToast('Please enter a valid Restroom Name.', 'error');
            return;
        }

        if (!formData.address || formData.address.trim().length < 5) {
            window.app.showToast('Please enter a complete address with landmark.', 'error');
            return;
        }

        const price = Number(formData.price || 10);
        const upiId = formData.upiId || prov.upiId || 'host@okaxis';
        const qrImage = this.uploadedListingQr || prov.qrCodeImage;

        const newToilet = window.db.addToilet({
            name: formData.name.trim(),
            providerId: prov.id,
            providerName: prov.businessName || prov.name,
            phone: prov.phone,
            upiId: upiId,
            qrCodeImage: qrImage,
            address: formData.address.trim(),
            city: 'New Delhi',
            lat: this.newToiletCoords.lat,
            lng: this.newToiletCoords.lng,
            type: formData.type || 'English / Western',
            genderType: formData.genderType || 'Unisex & Separate Men/Women',
            price: price,
            isFree: price === 0,
            timings: formData.timings || '06:00 AM - 11:00 PM',
            amenities: Array.from(this.selectedAmenities),
            images: [this.selectedPhotoUrl],
            description: formData.description || 'Clean, sanitized and verified restroom facility.'
        });

        this.closeAddListingModal();
        window.app.showToast(`"${newToilet.name}" published to TOIGO Map!`, 'success');

        this.renderProviderDashboard();
        window.toigoMap.renderToiletMarkers();
    }

    openQrPosterModal(toiletId) {
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;

        const modal = document.getElementById('qr-poster-modal');
        if (!modal) return;

        modal.querySelector('#poster-toilet-name').innerText = toilet.name;
        modal.querySelector('#poster-toilet-type').innerText = toilet.type;
        modal.querySelector('#poster-toilet-price').innerText = toilet.price === 0 ? 'FREE COMMUNITY RESTROOM' : `₹${toilet.price} PER USE`;
        modal.querySelector('#poster-toilet-address').innerText = `📍 ${toilet.address}`;

        const qrImg = modal.querySelector('#poster-qr-img');
        const upiLink = `upi://pay?pa=${encodeURIComponent(toilet.upiId || 'host@okaxis')}&pn=${encodeURIComponent(toilet.name)}&am=${toilet.price}&cu=INR`;
        qrImg.src = toilet.qrCodeImage || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;

        modal.classList.remove('hidden');
    }

    closeQrPosterModal() {
        const modal = document.getElementById('qr-poster-modal');
        if (modal) modal.classList.add('hidden');
    }
}

window.providerFlow = new ProviderFlowController();
