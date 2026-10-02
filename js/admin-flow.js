/**
 * TOIGO: Separate Admin Master Control Center (Vivek)
 * Complete oversight: Users, Providers, Toilets Verification (Approve/Reject with Reason), and Complaints Management.
 */

class AdminFlowController {
    constructor() {
        this.activeTab = 'overview'; // 'overview' | 'users' | 'providers' | 'toilets' | 'reports'
        this.toiletFilter = 'ALL'; // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
        this.searchQuery = '';
    }

    init() {
        this.renderAdminDashboard();
    }

    renderAdminDashboard() {
        const admin = window.auth.getCurrentUser();
        const container = document.getElementById('admin-dashboard-view');
        if (!container) return;

        if (!admin || admin.role !== 'ADMIN') {
            container.innerHTML = `
                <div class="p-8 text-center bg-slate-900 text-white rounded-3xl max-w-md mx-auto my-12 space-y-4">
                    <span class="text-3xl">🔒</span>
                    <h2 class="text-xl font-bold">Admin Master Terminal Protected</h2>
                    <p class="text-xs text-slate-400">Please sign in with administrator master credentials.</p>
                    <button onclick="window.app.openAdminLoginModal()" class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition">
                        Admin Sign In ⚡
                    </button>
                </div>
            `;
            return;
        }

        const allUsers = window.db.data.users;
        const allProviders = window.db.data.providers;
        const allToilets = window.db.getAllToiletsAdmin();
        const allReports = window.db.getAllReportsAdmin();

        const pendingToilets = allToilets.filter(t => t.status === 'PENDING');
        const approvedToilets = allToilets.filter(t => t.status === 'APPROVED');
        const rejectedToilets = allToilets.filter(t => t.status === 'REJECTED');
        const pendingReports = allReports.filter(r => r.status === 'PENDING' || r.status === 'UNDER REVIEW');
        const resolvedReports = allReports.filter(r => r.status === 'RESOLVED');

        container.innerHTML = `
            <div class="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
                <!-- Founder Header -->
                <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 text-white shadow-2xl border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-3.5">
                        <div class="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-2xl">
                            👑
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h1 class="text-xl sm:text-2xl font-black">${admin.name}</h1>
                                <span class="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-[10px] font-extrabold uppercase">
                                    Master Terminal
                                </span>
                            </div>
                            <p class="text-xs text-slate-300 mt-0.5">Separate Administrator Hub • Authority Over Users, Hosts, Toilets & Complaints</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="window.adminFlow.resetDatabaseConfirm()" class="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-semibold border border-red-500/30 transition">
                            ↺ Reset Factory Data
                        </button>
                        <button onclick="window.app.logout()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition">
                            Sign Out
                        </button>
                    </div>
                </div>

                <!-- Admin Navigation Tabs -->
                <div class="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar text-xs font-bold">
                    <button onclick="window.adminFlow.switchTab('overview')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">
                        📊 Overview
                    </button>
                    <button onclick="window.adminFlow.switchTab('toilets')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'toilets' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">
                        🚽 Toilet Verifications (${pendingToilets.length} Pending)
                    </button>
                    <button onclick="window.adminFlow.switchTab('providers')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'providers' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">
                        🏢 Providers (${allProviders.length})
                    </button>
                    <button onclick="window.adminFlow.switchTab('users')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'users' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">
                        👥 Users (${allUsers.length})
                    </button>
                    <button onclick="window.adminFlow.switchTab('reports')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'reports' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">
                        🚩 Reports (${pendingReports.length} Active)
                    </button>
                </div>

                <!-- Tab Content -->
                <div>
                    ${this.renderActiveTabContent({ allUsers, allProviders, allToilets, allReports, pendingToilets, approvedToilets, rejectedToilets, pendingReports, resolvedReports })}
                </div>
            </div>
        `;
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.renderAdminDashboard();
    }

    renderActiveTabContent(data) {
        switch (this.activeTab) {
            case 'toilets': return this.renderToiletsVerificationTab(data);
            case 'providers': return this.renderProvidersTab(data);
            case 'users': return this.renderUsersTab(data);
            case 'reports': return this.renderReportsTab(data);
            default: return this.renderOverviewTab(data);
        }
    }

    renderOverviewTab({ allUsers, allProviders, allToilets, pendingToilets, approvedToilets, rejectedToilets, pendingReports, resolvedReports }) {
        return `
            <div class="space-y-6">
                <!-- Overview Stats Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Total Users</span>
                        <h3 class="text-2xl font-black text-slate-900 mt-1">${allUsers.length}</h3>
                        <p class="text-[10px] text-emerald-600 mt-0.5">Verified Citizens</p>
                    </div>
                    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Total Providers</span>
                        <h3 class="text-2xl font-black text-slate-900 mt-1">${allProviders.length}</h3>
                        <p class="text-[10px] text-indigo-600 mt-0.5">Host Partners</p>
                    </div>
                    <div class="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-2xs">
                        <span class="text-[10px] font-bold text-amber-800 uppercase">Pending Verifications</span>
                        <h3 class="text-2xl font-black text-amber-900 mt-1">${pendingToilets.length}</h3>
                        <p class="text-[10px] text-amber-700 mt-0.5">Awaiting Admin Decision</p>
                    </div>
                    <div class="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-2xs">
                        <span class="text-[10px] font-bold text-emerald-800 uppercase">Approved & Active Toilets</span>
                        <h3 class="text-2xl font-black text-emerald-900 mt-1">${approvedToilets.length}</h3>
                        <p class="text-[10px] text-emerald-700 mt-0.5">Visible to Public</p>
                    </div>
                </div>

                <!-- Secondary Summary -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                        <h4 class="font-bold text-sm text-slate-900">Restroom Approval Health</h4>
                        <div class="space-y-2 text-xs">
                            <div class="flex justify-between p-2.5 bg-slate-50 rounded-xl"><span>Approved Public Toilets:</span><span class="font-bold text-emerald-600">${approvedToilets.length}</span></div>
                            <div class="flex justify-between p-2.5 bg-slate-50 rounded-xl"><span>Pending Verification:</span><span class="font-bold text-amber-600">${pendingToilets.length}</span></div>
                            <div class="flex justify-between p-2.5 bg-slate-50 rounded-xl"><span>Rejected Toilets:</span><span class="font-bold text-red-600">${rejectedToilets.length}</span></div>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                        <h4 class="font-bold text-sm text-slate-900">Complaint Resolution Center</h4>
                        <div class="space-y-2 text-xs">
                            <div class="flex justify-between p-2.5 bg-slate-50 rounded-xl"><span>Active / Under Review Reports:</span><span class="font-bold text-red-600">${pendingReports.length}</span></div>
                            <div class="flex justify-between p-2.5 bg-slate-50 rounded-xl"><span>Resolved Hygiene Tickets:</span><span class="font-bold text-emerald-600">${resolvedReports.length}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderToiletsVerificationTab({ allToilets }) {
        let list = allToilets;
        if (this.toiletFilter !== 'ALL') {
            list = allToilets.filter(t => t.status === this.toiletFilter);
        }

        return `
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 class="font-black text-base text-slate-900">Restroom Verification & Approval Portal</h3>
                    <div class="flex gap-1.5 text-xs font-bold">
                        <button onclick="window.adminFlow.filterToilets('ALL')" class="px-3 py-1.5 rounded-lg ${this.toiletFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}">All (${allToilets.length})</button>
                        <button onclick="window.adminFlow.filterToilets('PENDING')" class="px-3 py-1.5 rounded-lg ${this.toiletFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800'}">Pending (${allToilets.filter(t => t.status === 'PENDING').length})</button>
                        <button onclick="window.adminFlow.filterToilets('APPROVED')" class="px-3 py-1.5 rounded-lg ${this.toiletFilter === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'}">Approved (${allToilets.filter(t => t.status === 'APPROVED').length})</button>
                        <button onclick="window.adminFlow.filterToilets('REJECTED')" class="px-3 py-1.5 rounded-lg ${this.toiletFilter === 'REJECTED' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-800'}">Rejected (${allToilets.filter(t => t.status === 'REJECTED').length})</button>
                    </div>
                </div>

                <div class="space-y-3">
                    ${list.map(t => {
                        let statusBadge = 'bg-amber-100 text-amber-800';
                        if (t.status === 'APPROVED') statusBadge = 'bg-emerald-100 text-emerald-800';
                        if (t.status === 'REJECTED') statusBadge = 'bg-red-100 text-red-800';

                        return `
                            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                                <div class="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                    <div class="flex gap-3">
                                        <img src="${(t.photos && t.photos[0]) || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80'}" class="w-20 h-20 rounded-xl object-cover border border-slate-200" />
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <h4 class="font-bold text-sm text-slate-900">${t.name}</h4>
                                                <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${statusBadge}">
                                                    ● ${t.status}
                                                </span>
                                            </div>
                                            <p class="text-xs text-slate-500 mt-0.5">Provider: <b>${t.providerName}</b> • Fee: ₹${t.price}</p>
                                            <p class="text-xs text-slate-600 mt-0.5">📍 ${t.address}</p>
                                            <p class="text-[11px] text-slate-400 mt-0.5">Coordinates: ${t.latitude}, ${t.longitude}</p>
                                        </div>
                                    </div>

                                    <div class="flex flex-wrap gap-2 items-center">
                                        ${t.status !== 'APPROVED' ? `
                                            <button onclick="window.adminFlow.approveToilet('${t.toiletId}')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs">
                                                ✓ Approve Toilet
                                            </button>
                                        ` : ''}

                                        ${t.status !== 'REJECTED' ? `
                                            <button onclick="window.adminFlow.promptRejectToilet('${t.toiletId}')" class="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition">
                                                ✕ Reject with Reason
                                            </button>
                                        ` : ''}

                                        <button onclick="window.adminFlow.toggleActive('${t.toiletId}')" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition">
                                            ${t.active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>
                                </div>

                                ${t.rejectionReason ? `
                                    <div class="p-2.5 bg-red-50 rounded-xl border border-red-100 text-xs text-red-800">
                                        <b>Rejection Reason Provided:</b> ${t.rejectionReason}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    filterToilets(status) {
        this.toiletFilter = status;
        this.renderAdminDashboard();
    }

    approveToilet(toiletId) {
        window.db.approveToiletAdmin(toiletId);
        window.app.showToast('Restroom APPROVED! It is now publicly discoverable by citizens on TOIGO Map.', 'success');
        this.renderAdminDashboard();
    }

    promptRejectToilet(toiletId) {
        const reason = prompt('Enter Rejection Reason for this washroom (visible to Provider):', 'Sanitation or safety criteria not met.');
        if (reason) {
            window.db.rejectToiletAdmin(toiletId, reason);
            window.app.showToast('Restroom marked as REJECTED.', 'info');
            this.renderAdminDashboard();
        }
    }

    toggleActive(toiletId) {
        const t = window.db.toggleToiletActiveStatus(toiletId);
        window.app.showToast(`Restroom active status: ${t.active ? 'ACTIVE' : 'INACTIVE'}`, 'info');
        this.renderAdminDashboard();
    }

    renderProvidersTab({ allProviders }) {
        return `
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 class="font-black text-base text-slate-900">Registered Toilet Hosts (${allProviders.length})</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-slate-600">
                        <thead class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th class="p-3">Host Name</th>
                                <th class="p-3">Email & Phone</th>
                                <th class="p-3">Business / Hub</th>
                                <th class="p-3">Bank Details</th>
                                <th class="p-3">Status</th>
                                <th class="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${allProviders.map(p => `
                                <tr class="hover:bg-slate-50/50">
                                    <td class="p-3 font-bold text-slate-900">${p.name}</td>
                                    <td class="p-3 font-mono">${p.email}<br><span class="text-slate-400">${p.phone}</span></td>
                                    <td class="p-3">${p.businessName}</td>
                                    <td class="p-3 font-mono">••••${p.bankAccountNo.slice(-4)} (${p.bankIfsc})</td>
                                    <td class="p-3"><span class="px-2 py-0.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'} font-bold text-[10px]">${p.status}</span></td>
                                    <td class="p-3 text-right">
                                        <button onclick="window.adminFlow.toggleProvider('${p.providerId}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-[10px]">
                                            ${p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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

    toggleProvider(provId) {
        window.db.toggleProviderStatus(provId);
        window.app.showToast('Provider status updated.', 'info');
        this.renderAdminDashboard();
    }

    renderUsersTab({ allUsers }) {
        return `
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 class="font-black text-base text-slate-900">Citizen Users Directory (${allUsers.length})</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-slate-600">
                        <thead class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th class="p-3">User Name</th>
                                <th class="p-3">Email Address</th>
                                <th class="p-3">Auth Method</th>
                                <th class="p-3">Email Verified</th>
                                <th class="p-3">Account Status</th>
                                <th class="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${allUsers.map(u => `
                                <tr class="hover:bg-slate-50/50">
                                    <td class="p-3 font-bold text-slate-900">${u.name}</td>
                                    <td class="p-3 font-mono">${u.email}</td>
                                    <td class="p-3 uppercase font-bold text-slate-500">${u.authProvider}</td>
                                    <td class="p-3">
                                        <span class="px-2 py-0.5 rounded-full ${u.emailVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} font-bold text-[10px]">
                                            ${u.emailVerified ? 'VERIFIED' : 'PENDING'}
                                        </span>
                                    </td>
                                    <td class="p-3">
                                        <span class="px-2 py-0.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'} font-bold text-[10px]">
                                            ${u.status}
                                        </span>
                                    </td>
                                    <td class="p-3 text-right">
                                        <button onclick="window.adminFlow.toggleUser('${u.userId}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-[10px]">
                                            ${u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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

    toggleUser(userId) {
        window.db.toggleUserStatus(userId);
        window.app.showToast('User status updated.', 'info');
        this.renderAdminDashboard();
    }

    renderReportsTab({ allReports }) {
        return `
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 class="font-black text-base text-slate-900">Citizen Complaints & Hygiene Reports (${allReports.length})</h3>
                <div class="space-y-3">
                    ${allReports.length === 0 ? `<p class="text-xs text-slate-400">No reports on file.</p>` : allReports.map(r => `
                        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                            <div class="flex items-start justify-between">
                                <div>
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                                        ● ${r.status}
                                    </span>
                                    <h4 class="font-bold text-sm text-slate-900 mt-1">${r.category} (${r.toiletName})</h4>
                                    <p class="text-[10px] text-slate-400">Submitted by <b>${r.userName}</b> • ${new Date(r.createdAt).toLocaleString()}</p>
                                </div>

                                <div class="flex gap-1.5">
                                    <button onclick="window.adminFlow.resolveReportPrompt('${r.reportId}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition">
                                        ✓ Resolve
                                    </button>
                                    <button onclick="window.adminFlow.rejectReport('${r.reportId}')" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition">
                                        ✕ Dismiss
                                    </button>
                                </div>
                            </div>

                            <p class="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100">${r.description}</p>

                            ${r.adminResponse ? `
                                <div class="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800">
                                    <b>Admin Response Note:</b> ${r.adminResponse}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    resolveReportPrompt(reportId) {
        const response = prompt('Enter resolution note for citizen / host:', 'Issue inspected and resolved by maintenance.');
        if (response) {
            window.db.updateReportStatusAdmin(reportId, 'RESOLVED', response);
            window.app.showToast('Report marked as RESOLVED!', 'success');
            this.renderAdminDashboard();
        }
    }

    rejectReport(reportId) {
        window.db.updateReportStatusAdmin(reportId, 'REJECTED', 'Marked as false/invalid report.');
        window.app.showToast('Report dismissed.', 'info');
        this.renderAdminDashboard();
    }

    resetDatabaseConfirm() {
        if (confirm('Reset mock database to factory defaults?')) {
            window.db.reset();
            window.app.showToast('Database reset complete.', 'info');
            location.reload();
        }
    }
}

window.adminFlow = new AdminFlowController();
