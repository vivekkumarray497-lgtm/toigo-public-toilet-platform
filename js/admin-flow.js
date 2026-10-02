/**
 * TOIGO: Founder & Super Admin Control Center (Vivek)
 * Full master control over Users, Providers, Toilets, Complaints/Reports, Bank Verification & System Rules
 */

class AdminFlowController {
    constructor() {
        this.activeAdminTab = 'overview'; // 'overview', 'toilets', 'providers', 'users', 'reports', 'settings'
        this.userSearchQuery = '';
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
        const allReports = window.db.data.reports || [];

        const totalGmv = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const pendingReports = allReports.filter(r => r.status === 'pending');

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
                                <p class="text-xs text-gray-300 mt-1">Master Control Terminal • Complete Authority Over Users, Hosts, Banking & Reports</p>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-2">
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
                        🏢 Hosts & Bank Verification (${allProviders.length})
                    </button>
                    <button onclick="window.adminFlow.switchTab('users')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeAdminTab === 'users' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}">
                        👥 Users Directory (${allUsers.length})
                    </button>
                    <button onclick="window.adminFlow.switchTab('reports')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeAdminTab === 'reports' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}">
                        🚩 Reports & Complaints (${pendingReports.length} Active)
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
            case 'reports': return this.renderReportsTab();
            case 'settings': return this.renderSettingsTab();
            default: return this.renderOverviewTab();
        }
    }

    renderOverviewTab() {
        const allToilets = window.db.getAllToilets(true);
        const allUsers = window.db.data.users;
        const allProviders = window.db.data.providers;
        const allBookings = window.db.data.bookings;
        const allReports = window.db.data.reports || [];

        const totalGmv = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

        return `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div class="text-xs font-semibold text-gray-400 uppercase">Gross Volume (GMV)</div>
                    <div class="text-2xl font-black text-gray-900 mt-1">₹${totalGmv.toFixed(2)}</div>
                    <div class="text-[11px] text-emerald-600 mt-1">From ${allBookings.length} total visits</div>
                </div>

                <div class="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 shadow-sm">
                    <div class="text-xs font-semibold text-emerald-800 uppercase">Direct Host Payouts</div>
                    <div class="text-2xl font-black text-emerald-700 mt-1">100%</div>
                    <div class="text-[11px] text-emerald-800 mt-1">Direct to host UPI/Bank</div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div class="text-xs font-semibold text-gray-400 uppercase">Active Toilets Live</div>
                    <div class="text-2xl font-black text-gray-900 mt-1">${allToilets.length}</div>
                    <div class="text-[11px] text-blue-600 mt-1">Across partner networks</div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div class="text-xs font-semibold text-gray-400 uppercase">Citizen Complaints</div>
                    <div class="text-2xl font-black text-red-600 mt-1">${allReports.filter(r => r.status === 'pending').length}</div>
                    <div class="text-[11px] text-gray-500 mt-1">Pending inspection</div>
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
                                <th class="p-3">Payment Method</th>
                                <th class="p-3">Amount</th>
                                <th class="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${allBookings.map(b => `
                                <tr class="hover:bg-gray-50/50">
                                    <td class="p-3 font-mono text-[10px] text-gray-400">${b.id}</td>
                                    <td class="p-3 font-bold text-gray-900">${b.toiletName}</td>
                                    <td class="p-3">${b.userName}</td>
                                    <td class="p-3 text-gray-500">${b.paymentMethod}</td>
                                    <td class="p-3 font-black text-emerald-600">₹${b.amount}</td>
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
        const allToilets = window.db.getAllToilets(true);

        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-base font-extrabold text-gray-900">All Registered Restrooms (${allToilets.length})</h3>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-gray-600">
                        <thead class="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                            <tr>
                                <th class="p-3">Washroom Name</th>
                                <th class="p-3">Provider</th>
                                <th class="p-3">Address</th>
                                <th class="p-3">Price</th>
                                <th class="p-3">Rating</th>
                                <th class="p-3">Status</th>
                                <th class="p-3 text-right">Master Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${allToilets.map(t => `
                                <tr class="hover:bg-gray-50/50">
                                    <td class="p-3 font-bold text-gray-900">${t.name}</td>
                                    <td class="p-3">${t.providerName || 'Partner'}</td>
                                    <td class="p-3 text-gray-500 max-w-xs truncate">${t.address}</td>
                                    <td class="p-3 font-bold text-emerald-600">${t.price === 0 ? 'FREE' : '₹' + t.price}</td>
                                    <td class="p-3 text-amber-500 font-bold">★ ${t.rating}</td>
                                    <td class="p-3">
                                        <span class="px-2 py-0.5 rounded-full ${t.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} text-[10px] font-bold">
                                            ${t.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td class="p-3 text-right space-x-1.5">
                                        <button onclick="window.adminFlow.toggleToilet('${t.id}')" class="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-bold">
                                            Toggle Status
                                        </button>
                                        <button onclick="window.adminFlow.deleteToilet('${t.id}')" class="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-bold">
                                            Delete
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

    renderProvidersTab() {
        const allProviders = window.db.data.providers;

        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-base font-extrabold text-gray-900">Registered Toilet Hosts & Direct Bank Info (${allProviders.length})</h3>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-gray-600">
                        <thead class="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                            <tr>
                                <th class="p-3">Host / Partner</th>
                                <th class="p-3">Contact</th>
                                <th class="p-3">UPI ID</th>
                                <th class="p-3">Bank A/C & IFSC</th>
                                <th class="p-3">Bank Verification</th>
                                <th class="p-3">Status</th>
                                <th class="p-3 text-right">Approval Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${allProviders.map(p => `
                                <tr class="hover:bg-gray-50/50">
                                    <td class="p-3">
                                        <p class="font-bold text-gray-900">${p.name}</p>
                                        <p class="text-[10px] text-gray-400">${p.businessName || 'Host'}</p>
                                    </td>
                                    <td class="p-3 font-mono">${p.phone}<br><span class="text-gray-400">${p.email}</span></td>
                                    <td class="p-3 font-mono text-emerald-700 font-bold">${p.upiId || 'host@upi'}</td>
                                    <td class="p-3 font-mono">
                                        ${p.bankAccountNo || '••••5012'}<br>
                                        <span class="text-blue-600 font-bold">${p.bankName || 'Bank'} (${p.bankIfsc || 'UTIB0000123'})</span>
                                    </td>
                                    <td class="p-3">
                                        <span class="px-2 py-0.5 rounded-full ${p.bankVerificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} text-[10px] font-bold">
                                            ${(p.bankVerificationStatus || 'verified').toUpperCase()}
                                        </span>
                                    </td>
                                    <td class="p-3">
                                        <span class="px-2 py-0.5 rounded-full ${p.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : p.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'} text-[10px] font-bold">
                                            ${(p.status || 'verified').toUpperCase()}
                                        </span>
                                    </td>
                                    <td class="p-3 text-right space-x-1.5">
                                        ${p.status !== 'verified' ? `
                                            <button onclick="window.adminFlow.approveProvider('${p.id}')" class="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold">
                                                Approve
                                            </button>
                                        ` : `
                                            <button onclick="window.adminFlow.toggleProviderStatus('${p.id}')" class="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold">
                                                ${p.status === 'suspended' ? 'Activate' : 'Suspend'}
                                            </button>
                                        `}
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
        const allUsers = window.db.data.users;

        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-base font-extrabold text-gray-900">Verified Citizen Users (${allUsers.length})</h3>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-gray-600">
                        <thead class="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
                            <tr>
                                <th class="p-3">Citizen Name</th>
                                <th class="p-3">Mobile / Email</th>
                                <th class="p-3">Gender</th>
                                <th class="p-3">Wallet</th>
                                <th class="p-3">Account Status</th>
                                <th class="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${allUsers.map(u => `
                                <tr class="hover:bg-gray-50/50">
                                    <td class="p-3 font-bold text-gray-900">${u.name}</td>
                                    <td class="p-3 font-mono">${u.phone || '—'}<br><span class="text-gray-400">${u.email || '—'}</span></td>
                                    <td class="p-3"><span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">${u.gender || 'Not Specified'}</span></td>
                                    <td class="p-3 font-bold text-emerald-600">₹${u.walletBalance || 0}</td>
                                    <td class="p-3">
                                        <span class="px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'} text-[10px] font-bold">
                                            ${(u.status || 'active').toUpperCase()}
                                        </span>
                                    </td>
                                    <td class="p-3 text-right">
                                        <button onclick="window.adminFlow.toggleUserStatus('${u.id}')" class="px-2 py-1 ${u.status === 'suspended' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'} rounded-lg text-[10px] font-bold">
                                            ${u.status === 'suspended' ? 'Activate' : 'Suspend'}
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

    renderReportsTab() {
        const allReports = window.db.data.reports || [];

        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-extrabold text-gray-900">Citizen Hygiene & Problem Reports (${allReports.length})</h3>
                        <p class="text-xs text-gray-500">Handle complaints, inspect photo proof & resolve or dismiss fake reports</p>
                    </div>
                </div>

                ${allReports.length === 0 ? `
                    <div class="p-8 text-center bg-gray-50 rounded-2xl">
                        <p class="text-xs text-gray-500">No reports recorded. All restrooms are operating cleanly!</p>
                    </div>
                ` : `
                    <div class="space-y-3">
                        ${allReports.map(r => `
                            <div class="p-4 rounded-2xl border ${r.status === 'pending' ? 'bg-red-50/50 border-red-200' : r.status === 'resolved' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-200'} space-y-3">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${r.status === 'pending' ? 'bg-red-100 text-red-800' : r.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}">
                                            ● ${r.status}
                                        </span>
                                        <h4 class="font-bold text-sm text-gray-900 mt-1">${r.category}: ${r.toiletName}</h4>
                                        <p class="text-[11px] text-gray-500">Reported by <b>${r.userName}</b> • ${new Date(r.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div class="flex gap-1.5">
                                        ${r.status === 'pending' ? `
                                            <button onclick="window.adminFlow.resolveReport('${r.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition">
                                                ✓ Resolve Issue
                                            </button>
                                            <button onclick="window.adminFlow.dismissReport('${r.id}')" class="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition">
                                                ✕ Dismiss Fake Report
                                            </button>
                                        ` : `
                                            <span class="text-xs font-bold text-gray-500">${r.status.toUpperCase()}</span>
                                        `}
                                    </div>
                                </div>

                                <p class="text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-100">${r.description}</p>

                                ${r.photo ? `
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-bold text-gray-500">Attached Photo Proof:</span>
                                        <img src="${r.photo}" class="w-16 h-16 rounded-xl object-cover border border-gray-200 cursor-pointer" onclick="window.open('${r.photo}', '_blank')" />
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }

    renderSettingsTab() {
        return `
            <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4 max-w-xl">
                <h3 class="text-base font-extrabold text-gray-900">Platform Governance & Security Rules</h3>
                
                <div class="space-y-3 text-xs">
                    <div class="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                        <div>
                            <p class="font-bold text-gray-900">Direct Host Payout Protocol</p>
                            <p class="text-gray-500">100% of consumer entry fee goes directly to Host UPI</p>
                        </div>
                        <span class="text-emerald-600 font-bold">ACTIVE</span>
                    </div>

                    <div class="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                        <div>
                            <p class="font-bold text-gray-900">Strict OTP Rate Limiting</p>
                            <p class="text-gray-500">Max 3 attempts, 5 min expiry, 60s resend cooldown</p>
                        </div>
                        <span class="text-emerald-600 font-bold">ENFORCED</span>
                    </div>

                    <div class="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                        <div>
                            <p class="font-bold text-gray-900">IFSC & Bank Account Validation</p>
                            <p class="text-gray-500">RBI format compliance & auto bank lookup</p>
                        </div>
                        <span class="text-emerald-600 font-bold">ENFORCED</span>
                    </div>
                </div>
            </div>
        `;
    }

    toggleToilet(toiletId) {
        const t = window.db.getToiletById(toiletId);
        if (!t) return;
        const newStatus = t.status === 'open' ? 'cleaning' : 'open';
        window.db.updateToilet(toiletId, { status: newStatus });
        window.app.showToast(`Toilet marked as ${newStatus.toUpperCase()}`, 'info');
        this.renderAdminDashboard();
    }

    deleteToilet(toiletId) {
        if (confirm('Are you sure you want to permanently remove this restroom listing?')) {
            window.db.deleteToilet(toiletId);
            window.app.showToast('Restroom removed from TOIGO platform.', 'info');
            this.renderAdminDashboard();
        }
    }

    approveProvider(provId) {
        window.db.updateProvider(provId, { status: 'verified', bankVerificationStatus: 'verified' });
        window.app.showToast('Host partner and bank details verified & approved!', 'success');
        this.renderAdminDashboard();
    }

    toggleProviderStatus(provId) {
        const prov = window.db.data.providers.find(p => p.id === provId);
        if (!prov) return;
        const newStatus = prov.status === 'suspended' ? 'verified' : 'suspended';
        window.db.updateProvider(provId, { status: newStatus });
        window.app.showToast(`Host account status: ${newStatus.toUpperCase()}`, 'info');
        this.renderAdminDashboard();
    }

    toggleUserStatus(userId) {
        const user = window.db.data.users.find(u => u.id === userId);
        if (!user) return;
        const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
        window.db.updateUserProfile(userId, { status: newStatus });
        window.app.showToast(`User status updated to ${newStatus.toUpperCase()}`, 'info');
        this.renderAdminDashboard();
    }

    resolveReport(reportId) {
        window.db.resolveReport(reportId);
        window.app.showToast('Report marked as Resolved!', 'success');
        this.renderAdminDashboard();
    }

    dismissReport(reportId) {
        window.db.dismissReport(reportId);
        window.app.showToast('Report dismissed as invalid/fake.', 'info');
        this.renderAdminDashboard();
    }

    resetDataConfirm() {
        if (confirm('Reset all mock users, listings and transactions to factory defaults?')) {
            window.db.reset();
            window.app.showToast('Factory database reset complete.', 'info');
            location.reload();
        }
    }
}

window.adminFlow = new AdminFlowController();
