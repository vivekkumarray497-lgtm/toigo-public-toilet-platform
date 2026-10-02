/**
 * TOIGO: Provider Flow Controller (Host & Earn, Toilet Management, Listings & Payouts)
 */

class ProviderFlowController {
    constructor() {
        this.pickerMapInstance = null;
        this.newToiletCoords = { lat: 28.6315, lng: 77.2167 };
        this.selectedAmenities = new Set(['Hand Soap', 'Jet Spray', 'Mirror']);
        this.selectedPhotoUrl = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80';
    }

    init() {
        this.renderProviderDashboard();
    }

    renderProviderDashboard() {
        const prov = window.auth.getCurrentUser();
        if (!prov || prov.role !== 'provider') return;

        const dashContainer = document.getElementById('provider-dashboard-view');
        if (!dashContainer) return;

        const toilets = window.db.getToiletsByProvider(prov.id);
        const myBookings = window.db.data.bookings.filter(b => b.providerId === prov.id);
        const totalVisits = myBookings.length;
        const totalEarnings = (prov.totalEarned || 0) + myBookings.reduce((sum, b) => sum + (b.providerEarning || 0), 0);
        const walletBal = prov.walletBalance || 0;

        // Render metrics
        const metricsHtml = `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div class="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-600/20 flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-xs uppercase font-bold tracking-wider text-emerald-100">Wallet Balance</span>
                        <span class="p-2 bg-white/20 rounded-xl">💰</span>
                    </div>
                    <div class="my-3">
                        <h2 class="text-3xl font-extrabold tracking-tight">₹${walletBal.toFixed(2)}</h2>
                        <p class="text-xs text-emerald-100 mt-1">Available for instant UPI withdrawal</p>
                    </div>
                    <button onclick="window.providerFlow.openWithdrawModal()" class="w-full py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm">
                        Withdraw Earnings ⚡
                    </button>
                </div>

                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-xs uppercase font-bold tracking-wider text-gray-400">Total Revenue</span>
                        <span class="p-2 bg-emerald-50 text-emerald-600 rounded-xl">📈</span>
                    </div>
                    <div class="my-3">
                        <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight">₹${totalEarnings.toFixed(2)}</h2>
                        <p class="text-xs text-gray-500 mt-1">Lifetime net payouts received</p>
                    </div>
                    <div class="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <span>✓ Verified Host Account</span>
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-xs uppercase font-bold tracking-wider text-gray-400">Restroom Footfall</span>
                        <span class="p-2 bg-blue-50 text-blue-600 rounded-xl">👥</span>
                    </div>
                    <div class="my-3">
                        <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight">${totalVisits} <span class="text-sm font-normal text-gray-500">Visits</span></h2>
                        <p class="text-xs text-gray-500 mt-1">Across ${toilets.length} registered locations</p>
                    </div>
                    <button onclick="window.providerFlow.openAddListingModal()" class="w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition">
                        + Add Another Toilet
                    </button>
                </div>
            </div>
        `;

        // Render Toilets List
        const toiletsListHtml = toilets.length === 0 ? `
            <div class="p-10 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                    🚽
                </div>
                <h3 class="font-bold text-gray-800 text-lg mb-1">No Toilets Added Yet</h3>
                <p class="text-xs text-gray-500 mb-4 max-w-sm mx-auto">Start earning passive income by listing your shop, cafe, petrol pump, or private washroom.</p>
                <button onclick="window.providerFlow.openAddListingModal()" class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition">
                    + Register First Toilet
                </button>
            </div>
        ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${toilets.map(t => {
                    const isOpen = t.status === 'open';
                    return `
                        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition">
                            <div class="flex gap-3">
                                <img src="${t.images[0] || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80'}" class="w-20 h-20 rounded-xl object-cover" />
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-bold text-gray-900 text-sm truncate">${t.name}</h4>
                                        <span class="text-xs font-bold ${isOpen ? 'text-emerald-600' : 'text-amber-600'}">
                                            ● ${t.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p class="text-xs text-gray-500 truncate mt-0.5">📍 ${t.address}</p>
                                    <div class="flex items-center gap-2 mt-2">
                                        <span class="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded">
                                            ₹${t.price} / use
                                        </span>
                                        <span class="text-[11px] font-medium px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                            ${t.type}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                <div class="flex items-center gap-2">
                                    <button onclick="window.providerFlow.toggleToiletStatus('${t.id}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold ${isOpen ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} transition">
                                        ${isOpen ? 'Mark Cleaning' : 'Mark Open'}
                                    </button>
                                </div>

                                <button onclick="window.providerFlow.openQrPosterModal('${t.id}')" class="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
                                    <span>🖨️ Door QR Poster</span>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Render Recent Earnings Activity
        const recentActivityHtml = myBookings.length === 0 ? `
            <p class="text-xs text-gray-400 p-4 text-center">No visitors recorded yet.</p>
        ` : `
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-gray-600">
                    <thead class="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                        <tr>
                            <th class="p-3">Time</th>
                            <th class="p-3">User</th>
                            <th class="p-3">Gross Fee</th>
                            <th class="p-3">Platform Fee</th>
                            <th class="p-3">Your Earning</th>
                            <th class="p-3">Method</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${myBookings.slice(0, 5).map(b => `
                            <tr class="hover:bg-gray-50/50">
                                <td class="p-3 font-medium text-gray-800">${new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td class="p-3">${b.userName}</td>
                                <td class="p-3 font-bold text-gray-900">₹${b.amount}</td>
                                <td class="p-3 text-red-500">-₹${b.platformFee}</td>
                                <td class="p-3 font-bold text-emerald-600">+₹${b.providerEarning}</td>
                                <td class="p-3"><span class="px-2 py-0.5 rounded bg-gray-100 text-[10px]">${b.paymentMethod}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        dashContainer.innerHTML = `
            <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
                <!-- Welcome header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-2xl font-black text-gray-900">${prov.businessName || prov.name}</h1>
                            <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">Host Partner</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-0.5">UPI ID: <span class="font-mono font-semibold text-gray-700">${prov.upiId || 'Not configured'}</span></p>
                    </div>
                    <button onclick="window.providerFlow.openAddListingModal()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition">
                        <span>+ Add New Toilet Listing</span>
                    </button>
                </div>

                <!-- Metrics -->
                ${metricsHtml}

                <!-- Toilet management Section -->
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-base font-extrabold text-gray-900">Your Washroom Listings (${toilets.length})</h3>
                        <span class="text-xs text-gray-500">Live on Public TOIGO Map</span>
                    </div>
                    ${toiletsListHtml}
                </div>

                <!-- Recent Usage Logs -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <h3 class="text-base font-extrabold text-gray-900 mb-3">Recent Customer Visit Logs</h3>
                    ${recentActivityHtml}
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

    // Modal: Add New Toilet Wizard
    openAddListingModal() {
        const modal = document.getElementById('add-toilet-modal');
        if (!modal) return;
        modal.classList.remove('hidden');

        // Init picker map
        setTimeout(() => {
            const userCoords = window.toigoMap.userCoords;
            this.newToiletCoords = { ...userCoords };
            
            const pickerContainer = document.getElementById('picker-map-container');
            if (pickerContainer) {
                pickerContainer.innerHTML = '<div id="picker-map" class="w-full h-48 rounded-xl"></div>';
                this.pickerMapInstance = window.toigoMap.initPickerMap('picker-map', userCoords, (lat, lng) => {
                    this.newToiletCoords = { lat, lng };
                    const coordsDisplay = document.getElementById('new-toilet-coords-display');
                    if (coordsDisplay) coordsDisplay.innerText = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
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
        document.querySelectorAll('.preset-photo-thumb').forEach(el => {
            if (el.dataset.url === url) el.classList.add('ring-4', 'ring-emerald-500');
            else el.classList.remove('ring-4', 'ring-emerald-500');
        });
    }

    submitNewToilet(formData) {
        const prov = window.auth.getCurrentUser();
        if (!prov) return;

        const newToilet = window.db.addToilet({
            name: formData.name || 'Clean Public Restroom',
            providerId: prov.id,
            providerName: prov.businessName || prov.name,
            phone: formData.phone || prov.phone,
            address: formData.address || 'Central City Road',
            city: formData.city || 'New Delhi',
            lat: this.newToiletCoords.lat,
            lng: this.newToiletCoords.lng,
            type: formData.type || 'English / Western',
            genderType: formData.genderType || 'Unisex',
            price: Number(formData.price || 10),
            isFree: Number(formData.price) === 0,
            amenities: Array.from(this.selectedAmenities),
            timings: formData.timings || '06:00 AM - 11:00 PM',
            upiId: formData.upiId || prov.upiId || 'host@toigo',
            description: formData.description || 'Clean, sanitized and verified washroom facility.',
            images: [this.selectedPhotoUrl]
        });

        this.closeAddListingModal();
        window.app.showToast('Toilet added successfully! Now live on TOIGO map.', 'success');
        this.renderProviderDashboard();
        window.userFlow?.applyFilters();
    }

    // Modal: Printable Door QR Poster
    openQrPosterModal(toiletId) {
        const toilet = window.db.getToiletById(toiletId);
        if (!toilet) return;

        const modal = document.getElementById('qr-poster-modal');
        if (!modal) return;

        const upiLink = toilet.upiQrString || `upi://pay?pa=host@toigo&pn=${encodeURIComponent(toilet.name)}&am=${toilet.price}&cu=INR`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

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

    // Modal: Payout Withdrawal
    openWithdrawModal() {
        const prov = window.auth.getCurrentUser();
        const modal = document.getElementById('payout-modal');
        if (!modal || !prov) return;

        modal.querySelector('#withdraw-max-amount').innerText = `₹${(prov.walletBalance || 0).toFixed(2)}`;
        modal.querySelector('#withdraw-upi-input').value = prov.upiId || '';
        modal.querySelector('#withdraw-amount-input').value = Math.floor(prov.walletBalance || 0);

        modal.classList.remove('hidden');
    }

    closeWithdrawModal() {
        const modal = document.getElementById('payout-modal');
        if (modal) modal.classList.add('hidden');
    }

    submitWithdrawRequest(amount, upiId) {
        const prov = window.auth.getCurrentUser();
        if (!prov) return;

        try {
            window.db.requestPayout(prov.id, Number(amount), upiId);
            this.closeWithdrawModal();
            window.app.showToast(`Withdrawal request of ₹${amount} submitted! Sent to Super Admin.`, 'success');
            this.renderProviderDashboard();
        } catch (e) {
            window.app.showToast(e.message, 'error');
        }
    }
}

window.providerFlow = new ProviderFlowController();
