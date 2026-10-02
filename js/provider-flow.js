/**
 * TOIGO: Provider Flow Controller (Host Onboarding, Direct QR, Banking & Listings)
 */

class ProviderFlowController {
    constructor() {
        this.pickerMapInstance = null;
        this.newToiletCoords = { lat: 28.6315, lng: 77.2167 };
        this.selectedAmenities = new Set(['Hand Soap', 'Jet Spray', 'Mirror']);
        this.selectedPhotoUrl = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80';
        this.uploadedListingQr = null;
    }

    init() {
        this.renderProviderDashboard();
    }

    renderProviderDashboard() {
        // Enforce provider login
        const prov = window.auth.getCurrentUser();
        if (!prov || prov.role !== 'provider') {
            const dashContainer = document.getElementById('provider-dashboard-view');
            if (dashContainer) {
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
            }
            return;
        }

        const dashContainer = document.getElementById('provider-dashboard-view');
        if (!dashContainer) return;

        const toilets = window.db.getToiletsByProvider(prov.id);
        const myBookings = window.db.data.bookings.filter(b => b.providerId === prov.id);
        const totalVisits = myBookings.length;
        const totalEarnings = (prov.totalEarned || 0) + myBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const walletBal = prov.walletBalance || totalEarnings;

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
                        ✓ 100% Direct Payouts Active
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
                        <p class="text-[10px] text-slate-400 font-mono">IFSC: ${prov.bankIfsc || 'UTIB0000123'}</p>
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
                            <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">Verified Host Partner</span>
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5">Direct UPI Account: <span class="font-mono font-semibold text-emerald-700">${prov.upiId || 'host@okaxis'}</span></p>
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
        window.app.showToast(`Toilet marked as ${newStatus.toUpperCase()}`, 'info');
        this.renderProviderDashboard();
        window.userFlow?.applyFilters();
    }

    openAddListingModal() {
        // Enforce login
        if (!window.auth.isLoggedIn()) {
            window.auth.requireLogin('provider', () => this.openAddListingModal());
            return;
        }

        const modal = document.getElementById('add-toilet-modal');
        if (!modal) return;
        modal.classList.remove('hidden');

        setTimeout(() => {
            const userCoords = window.toigoMap.userCoords;
            this.newToiletCoords = { ...userCoords };
            
            const pickerContainer = document.getElementById('picker-map-container');
            if (pickerContainer) {
                pickerContainer.innerHTML = '<div id="picker-map" class="w-full h-40 rounded-xl"></div>';
                this.pickerMapInstance = window.toigoMap.initPickerMap('picker-map', userCoords, (lat, lng) => {
                    this.newToiletCoords = { lat, lng };
                });
            }
        }, 200);
    }

    closeAddListingModal() {
        const modal = document.getElementById('add-toilet-modal');
        if (modal) modal.classList.add('hidden');
    }

    toggleAmenitySelection(amenityName) {
        if (this.selectedAmenities.has(amenityName)) {
            this.selectedAmenities.delete(amenityName);
        } else {
            this.selectedAmenities.add(amenityName);
        }
    }

    selectPresetPhoto(url) {
        this.selectedPhotoUrl = url;
    }

    // Host QR Code File Upload in New Listing
    handleListingQrUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedListingQr = e.target.result;
            const previewEl = document.getElementById('new-listing-qr-preview');
            if (previewEl) {
                previewEl.src = this.uploadedListingQr;
                previewEl.classList.remove('hidden');
            }
            window.app.showToast('Custom Payment QR Code uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    }

    submitNewToilet(formData) {
        const prov = window.auth.getCurrentUser();
        if (!prov) return;

        const upi = formData.upiId || prov.upiId || 'host@okaxis';
        const qrImg = this.uploadedListingQr || prov.qrCodeImage || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('upi://pay?pa=' + upi + '&pn=' + encodeURIComponent(formData.name) + '&am=' + (formData.price || 10) + '&cu=INR')}`;

        const newToilet = window.db.addToilet({
            name: formData.name || 'Clean Public Restroom',
            providerId: prov.id,
            providerName: prov.businessName || prov.name,
            phone: formData.phone || prov.phone,
            upiId: upi,
            qrCodeImage: qrImg,
            address: formData.address || 'Central City Road',
            city: 'New Delhi',
            lat: this.newToiletCoords.lat,
            lng: this.newToiletCoords.lng,
            type: formData.type || 'English / Western',
            genderType: formData.genderType || 'Unisex',
            price: Number(formData.price || 10),
            isFree: Number(formData.price) === 0,
            amenities: Array.from(this.selectedAmenities),
            timings: formData.timings || '06:00 AM - 11:00 PM',
            description: 'Clean, sanitized and verified washroom facility.',
            images: [this.selectedPhotoUrl]
        });

        this.closeAddListingModal();
        window.app.showToast('Restroom listing published! Users can now pay directly to your QR.', 'success');
        this.renderProviderDashboard();
        window.userFlow?.applyFilters();
    }

    openQrPosterModal(toiletId) {
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;

        const modal = document.getElementById('qr-poster-modal');
        if (!modal) return;

        const upiLink = `upi://pay?pa=${encodeURIComponent(toilet.upiId || 'host@okaxis')}&pn=${encodeURIComponent(toilet.name)}&am=${toilet.price}&cu=INR`;
        const qrUrl = toilet.qrCodeImage || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

        modal.querySelector('#poster-toilet-name').innerText = toilet.name;
        modal.querySelector('#poster-toilet-price').innerText = toilet.price === 0 ? 'FREE ADMISSION' : `₹${toilet.price} PER ENTRY`;
        modal.querySelector('#poster-qr-img').src = qrUrl;
        modal.querySelector('#poster-toilet-address').innerText = toilet.address;
        modal.querySelector('#poster-toilet-type').innerText = `${toilet.type} • ${toilet.genderType}`;

        modal.classList.remove('hidden');
    }

    closeQrPosterModal() {
        const modal = document.getElementById('qr-poster-modal');
        if (modal) modal.classList.add('hidden');
    }
}

window.providerFlow = new ProviderFlowController();
