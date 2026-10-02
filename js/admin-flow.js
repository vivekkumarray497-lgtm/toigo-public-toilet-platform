/**
 * TOIGO: Founder & Super Admin Control Center
 * Full master control over Users, Providers, Toilets, Payouts, Commissions and System Settings
 */

class AdminFlowController {
    constructor() {
        this.activeAdminTab = 'overview'; // 'overview', 'toilets', 'providers', 'users', 'payouts', 'settings'
    }

    init() {
        this.renderAdminDashboard();
    }

    renderAdminDashboard() {
        const admin = window.auth.getCurrentUser();
        if (!admin || admin.role !== 'admin') return;

        const container = document.getElementById('admin-dashboard-view');
        if (!container) return;

        // Platform Aggregates
        const allToilets = window.db.getAllToilets(true);
        const allUsers = window.db.data.users;
        const allProviders = window.db.data.providers;
        const allBookings = window.db.data.bookings;
        const allPayouts = window.db.data.payoutRequests;

        const totalGmv = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const totalCommissionEarned = allBookings.reduce((sum, b) => sum + (b.platformFee || 0), 0);
        const pendingPayoutsTotal = allPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

        container.innerHTML = `
            <div class="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
                <!-- Founder Header Banner -->
                <div class="bg-gradient-to-r from-gray-900 via-slate-800 to-emerald-950 rounded-3xl p-6 text-white shadow-2xl border border-emerald-500/30 relative overflow-hidden">
                    <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl flex-shrink-0">
                                <img src="${admin.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" class="w-full h-full object-cover rounded-[14px]" />
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h1 class="text-2xl font-black text-white">${admin.name}</h1>
                                    <span class="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
                                        👑 Founder & Super Admin
                                    </span>
                                </div>
                                <p class="text-xs text-gray-300 mt-1">Master Control Terminal • Complete Authority Over Users, Hosts & Finances</p>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-2">
                            <button onclick="window.adminFlow.openBroadcastModal()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                                <span>📢 Send Broadcast</span>
                            </button>
                            <button onclick="window.adminFlow.resetDataConfirm()" class="px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold transition">
                                ↺ Reset Seed Data
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Admin Navigation Tabs -->
                <div class="flex gap-2 overflow-x-auto pb-1 border-b border-gray-200 no-scrollbar text-xs font-bold">
                    <button onclick="window.adminFlow.switchTab('overview')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeAdminTab === 'overview' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}">
                        📊 Master Overview
                    </button>
                    <button onclick="window.adminFlow.switchTab('toilets')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeAdminTab === 'toilets' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}">
                        🚽 Toilet Listings (${allToilets.length})
                    </button>
                    <button onclick="window.adminFlow.switchTab('providers')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeAdminTab === 'providers' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}">
                        🏢 Toilet Providers (${allProviders.length})
                    </button>
                    <button onclick="window.adminFlow.switchTab('users')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeAdminTab === 'users' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}">
                        👥 Users (${allUsers.length})
                    </button>
                    <button onclick="window.adminFlow.switchTab('payouts')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeAdminTab === 'payouts' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}">
                        💸 Payout Requests (${allPayouts.filter(p => p.status === 'pending').length} Pending)
                    </button>
                    <button onclick="window.adminFlow.switchTab('settings')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeAdminTab === 'settings' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}">
                        ⚙️ Platform Rules
                    </button>
                </div>

                <!-- Tab Content Container -->
                <div id="admin-tab-content" class="space-y-6">
                    ${this.renderActiveTabContent()}
                </div>
            </div>
        `;
    }

    switchTab(tabName) {
        this.activeAdminTab = tabName;
        this.renderAdminDashboard();
    }

    renderActiveTabContent() {
        switch (this.activeAdminTab) {
            case 'toilets': return this.renderToiletsTab();
            case 'providers': return this.renderProvidersTab();
            case 'users': return this.renderUsersTab();
            case 'payouts': return this.renderPayoutsTab();
            case 'settings': return this.renderSettingsTab();
            default: return this.renderOverviewTab();
        }
    }

    renderOverviewTab() {
        const allToilets = window.db.getAllToilets(true);
        const allUsers = window.db.data.users;
        const allProviders = window.db.data.providers;
        const allBookings = window.db.data.bookings;

        const totalGmv = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const totalCommissionEarned = allBookings.reduce((sum, b) => sum + (b.platformFee || 0), 0);

        return `
            <!-- Top Metric Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div class="text-xs font-semibold text-gray-400 uppercase">Gross App Volume (GMV)</div>
                    <div class="text-2xl font-black text-gray-900 mt-1">₹${totalGmv.toFixed(2)}</div>
                    <div class="text-[11px] text-emerald-600 mt-1">From ${allBookings.length} total visits</div>
                </div>

                <div class="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 shadow-sm">
                    <div class="text-xs font-semibold text-emerald-800 uppercase">Founder Revenue (10%)</div>
                    <div class="text-2xl font-black text-emerald-700 mt-1">₹${totalCommissionEarned.toFixed(2)}</div>
                    <div class="text-[11px] text-emerald-800 mt-1">Net platform commission</div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div class="text-xs font-semibold text-gray-400 uppercase">Active Toilets Live</div>
                    <div class="text-2xl font-black text-gray-900 mt-1">${allToilets.length}</div>
                    <div class="text-[11px] text-blue-600 mt-1">Across partner networks</div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div class="text-xs font-semibold text-gray-400 uppercase">Total User Base</div>
                    <div class="text-2xl font-black text-gray-900 mt-1">${allUsers.length + allProviders.length}</div>
                    <div class="text-[11px] text-gray-500 mt-1">${allUsers.length} Users • ${allProviders.length} Providers</div>
                </div>
            </div>

            <!-- Master Real-time Transactions Feed -->
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-base font-extrabold text-gray-900">Live Toilet Usage & Payment Feed</h3>
                    <span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Auto-Syncing</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-gray-600">
                        <thead class="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                            <tr>
                                <th class="p-3">ID</th>
                                <th class="p-3">Toilet Facility</th>
                                <th class="p-3">Citizen (User)</th>
                                <th class="p-3">Host (Provider)</th>
                                <th class="p-3">Gross</th>
                                <th class="p-3">Founder Fee</th>
                                <th class="p-3">Provider Net</th>
                                <th class="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${allBookings.map(b => `
                                <tr class="hover:bg-gray-50/50">
                                    <td class="p-3 font-mono text-[10px] text-gray-400">${b.id}</td>
                                    <td class="p-3 font-bold text-gray-900">${b.toiletName}</td>
                                    <td class="p-3">${b.userName}</td>
                                    <td class="p-3 text-gray-500">${b.providerId}</td>
                                    <td class="p-3 font-bold text-gray-900">₹${b.amount}</td>
                                    <td class="p-3 font-bold text-emerald-600">+₹${b.platformFee}</td>
                                    <td class="p-3 text-gray-700">₹${b.providerEarning}</td>
                                    <td class="p-3"><span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">${b.paymentStatus}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderToiletsTab() {
        const toilets = window.db.getAllToilets(true);

        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-extrabold text-gray-900">All Registered Public & Private Toilets</h3>
                        <p class="text-xs text-gray-500">You have full control to approve, verify, feature, or delete any listing.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${toilets.map(t => `
                        <div class="border border-gray-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition">
                            <div>
                                <div class="relative h-36 rounded-xl overflow-hidden mb-3">
                                    <img src="${t.images[0]}" class="w-full h-full object-cover" />
                                    <div class="absolute top-2 left-2 flex gap-1">
                                        <span class="px-2 py-0.5 bg-black/70 text-white rounded text-[10px] font-bold">${t.type}</span>
                                        ${t.isVerified ? '<span class="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">🛡️ Verified</span>' : ''}
                                    </div>
                                    <div class="absolute top-2 right-2">
                                        <span class="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">₹${t.price}</span>
                                    </div>
                                </div>

                                <h4 class="font-extrabold text-gray-900 text-sm mb-1">${t.name}</h4>
                                <p class="text-xs text-gray-500 line-clamp-1 mb-2">📍 ${t.address}</p>
                                <p class="text-[11px] text-gray-600 mb-3">Provider: <span class="font-semibold">${t.providerName || t.providerId}</span></p>
                            </div>

                            <div class="pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
                                <button onclick="window.adminFlow.toggleVerified('${t.id}')" class="flex-1 py-1.5 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[11px] font-bold transition">
                                    ${t.isVerified ? 'Remove Badge' : 'Make Verified'}
                                </button>
                                <button onclick="window.adminFlow.deleteToiletConfirm('${t.id}')" class="py-1.5 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[11px] font-bold transition">
                                    Delete ✕
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderProvidersTab() {
        const providers = window.db.data.providers;

        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div>
                    <h3 class="text-base font-extrabold text-gray-900">Registered Toilet Hosts / Providers</h3>
                    <p class="text-xs text-gray-500">Manage partner verification, balances, and payout settlements.</p>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-gray-600">
                        <thead class="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                            <tr>
                                <th class="p-3">Host Name</th>
                                <th class="p-3">Contact</th>
                                <th class="p-3">UPI ID</th>
                                <th class="p-3">Current Balance</th>
                                <th class="p-3">Total Earned</th>
                                <th class="p-3">KYC Status</th>
                                <th class="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${providers.map(p => `
                                <tr class="hover:bg-gray-50/50">
                                    <td class="p-3 font-bold text-gray-900">${p.name} <br><span class="text-[10px] text-gray-400 font-normal">${p.businessName || ''}</span></td>
                                    <td class="p-3">${p.phone}<br><span class="text-gray-400">${p.email}</span></td>
                                    <td class="p-3 font-mono text-gray-700">${p.upiId || 'None'}</td>
                                    <td class="p-3 font-bold text-emerald-600">₹${(p.walletBalance || 0).toFixed(2)}</td>
                                    <td class="p-3 font-bold text-gray-900">₹${(p.totalEarned || 0).toFixed(2)}</td>
                                    <td class="p-3"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">${p.kycStatus || 'Approved'}</span></td>
                                    <td class="p-3">
                                        <button onclick="window.adminFlow.addBonusToProvider('${p.id}')" class="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold">
                                            + Bonus ₹50
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderUsersTab() {
        const users = window.db.data.users;

        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div>
                    <h3 class="text-base font-extrabold text-gray-900">Citizen Users</h3>
                    <p class="text-xs text-gray-500">Monitor citizen registrations and grant promo credits.</p>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-gray-600">
                        <thead class="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                            <tr>
                                <th class="p-3">User</th>
                                <th class="p-3">Phone</th>
                                <th class="p-3">Email</th>
                                <th class="p-3">Wallet Balance</th>
                                <th class="p-3">Joined Date</th>
                                <th class="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${users.map(u => `
                                <tr class="hover:bg-gray-50/50">
                                    <td class="p-3 font-bold text-gray-900">${u.name}</td>
                                    <td class="p-3 font-mono">${u.phone}</td>
                                    <td class="p-3">${u.email}</td>
                                    <td class="p-3 font-bold text-emerald-600">₹${u.walletBalance || 0}</td>
                                    <td class="p-3 text-gray-400">${u.joinedAt || '2026-09'}</td>
                                    <td class="p-3 flex gap-1">
                                        <button onclick="window.adminFlow.addWalletCredit('${u.id}', 50)" class="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold">
                                            + ₹50 Promo
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderPayoutsTab() {
        const payouts = window.db.data.payoutRequests;

        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div>
                    <h3 class="text-base font-extrabold text-gray-900">Provider Payout Requests (UPI Disbursal)</h3>
                    <p class="text-xs text-gray-500">Approve and settle provider withdrawal requests.</p>
                </div>

                ${payouts.length === 0 ? `
                    <p class="text-xs text-gray-400 text-center p-6">No payout requests pending.</p>
                ` : `
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs text-gray-600">
                            <thead class="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                                <tr>
                                    <th class="p-3">Requested Time</th>
                                    <th class="p-3">Provider</th>
                                    <th class="p-3">Amount</th>
                                    <th class="p-3">UPI Destination</th>
                                    <th class="p-3">Status</th>
                                    <th class="p-3">Founder Action</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                ${payouts.map(p => {
                                    const isPending = p.status === 'pending';
                                    return `
                                        <tr class="hover:bg-gray-50/50">
                                            <td class="p-3">${new Date(p.requestedAt).toLocaleString()}</td>
                                            <td class="p-3 font-bold text-gray-900">${p.providerName}</td>
                                            <td class="p-3 font-extrabold text-emerald-600">₹${p.amount}</td>
                                            <td class="p-3 font-mono font-semibold text-gray-800">${p.upiId}</td>
                                            <td class="p-3">
                                                <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${isPending ? 'bg-amber-100 text-amber-800' : p.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                                                    ${p.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td class="p-3">
                                                ${isPending ? `
                                                    <div class="flex gap-1.5">
                                                        <button onclick="window.adminFlow.processPayout('${p.id}', 'approved')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">
                                                            ✓ Disburse UPI
                                                        </button>
                                                        <button onclick="window.adminFlow.processPayout('${p.id}', 'rejected')" class="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition">
                                                            Reject
                                                        </button>
                                                    </div>
                                                ` : '<span class="text-gray-400">Settled</span>'}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    }

    renderSettingsTab() {
        const settings = window.db.data.settings;

        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-6 max-w-2xl">
                <div>
                    <h3 class="text-base font-extrabold text-gray-900">Platform Global Rules & Pricing Policy</h3>
                    <p class="text-xs text-gray-500">Configure core app parameters as the Founder.</p>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Founder Commission Percentage (%)</label>
                        <input id="setting-commission-input" type="number" value="${settings.platformCommissionPct || 10}" min="0" max="50" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold" />
                        <span class="text-[11px] text-gray-400">Current platform cut taken per paid washroom entry.</span>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">SOS Helpline Numbers</label>
                        <input id="setting-sos-input" type="text" value="${settings.sosEmergencyNumber || '112 / 108'}" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold" />
                        <span class="text-[11px] text-gray-400">Displayed in emergency SOS button on user screen.</span>
                    </div>

                    <button onclick="window.adminFlow.saveSettings()" class="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm">
                        Save Global Settings
                    </button>
                </div>
            </div>
        `;
    }

    // Actions
    toggleVerified(toiletId) {
        const t = window.db.getToiletById(toiletId);
        if (!t) return;
        window.db.updateToilet(toiletId, { isVerified: !t.isVerified });
        window.app.showToast(`Updated verified badge for ${t.name}`, 'success');
        this.renderAdminDashboard();
        window.userFlow?.applyFilters();
    }

    deleteToiletConfirm(toiletId) {
        if (confirm('As Founder, are you sure you want to permanently remove this toilet listing from TOIGO?')) {
            window.db.deleteToilet(toiletId);
            window.app.showToast('Toilet removed from platform.', 'info');
            this.renderAdminDashboard();
            window.userFlow?.applyFilters();
        }
    }

    addBonusToProvider(providerId) {
        const prov = window.db.data.providers.find(p => p.id === providerId);
        if (prov) {
            prov.walletBalance = (prov.walletBalance || 0) + 50;
            window.db.save();
            window.app.showToast(`₹50 bonus added to ${prov.name}'s wallet!`, 'success');
            this.renderAdminDashboard();
        }
    }

    addWalletCredit(userId, amount) {
        const usr = window.db.data.users.find(u => u.id === userId);
        if (usr) {
            usr.walletBalance = (usr.walletBalance || 0) + amount;
            window.db.save();
            window.app.showToast(`₹${amount} promo credit granted to ${usr.name}!`, 'success');
            this.renderAdminDashboard();
        }
    }

    processPayout(payoutId, status) {
        window.db.resolvePayout(payoutId, status);
        window.app.showToast(`Payout marked as ${status.toUpperCase()}!`, 'success');
        this.renderAdminDashboard();
    }

    saveSettings() {
        const comm = Number(document.getElementById('setting-commission-input').value) || 10;
        const sos = document.getElementById('setting-sos-input').value || '112 / 108';

        window.db.data.settings.platformCommissionPct = comm;
        window.db.data.settings.sosEmergencyNumber = sos;
        window.db.save();

        window.app.showToast('Platform settings saved successfully!', 'success');
    }

    openBroadcastModal() {
        const msg = prompt('Enter platform-wide broadcast message to all users & providers:');
        if (msg) {
            window.app.showToast(`Broadcast sent: "${msg}"`, 'info');
        }
    }

    resetDataConfirm() {
        if (confirm('Reset entire database to initial seed state? This will restore default toilets and accounts.')) {
            window.db.resetAllData();
            window.app.showToast('Database reset to defaults.', 'info');
            location.reload();
        }
    }
}

window.adminFlow = new AdminFlowController();
