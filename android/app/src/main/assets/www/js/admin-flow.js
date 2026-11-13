/**
 * TOIGO: Admin Master Control Center (Founder Vivek)
 * Connected to REST API with real audit logs, toilet approvals, user moderation,
 * complaints resolution, and executive platform analytics.
 */

class AdminFlowController {
    constructor() {
        this.activeTab = 'overview'; // 'overview' | 'toilets' | 'providers' | 'users' | 'reports' | 'audit'
        this.toiletFilter = 'ALL';
    }

    async init() {
        await this.renderAdminDashboard();
    }

    async renderAdminDashboard() {
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

        container.innerHTML = `
            <div class="p-12 text-center text-white">
                <div class="inline-block w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs text-slate-400 mt-2">Loading executive master telemetry...</p>
            </div>
        `;

        try {
            const statsRes = await window.api.get('/admin/dashboard');
            const toiletsRes = await window.api.get('/toilets?all=true');
            const reportsRes = await window.api.get('/reports');
            const providersRes = await window.api.get('/admin/providers').catch(() => ({ providers: [] }));

            const s = statsRes.stats || {};
            const allToilets = toiletsRes.toilets || [];
            const allReports = reportsRes.reports || [];
            const allProviders = providersRes.providers || [];

            const pendingToilets = allToilets.filter(t => t.status === 'PENDING');
            const pendingReports = allReports.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS');
            const pendingProviders = allProviders.filter(p => p.verificationStatus === 'PENDING' || !p.verified);

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
                                        Super Admin Master
                                    </span>
                                </div>
                                <p class="text-xs text-slate-300 mt-0.5">REST API Backend Synchronized • Complete Authority Over Platform & Network</p>
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
                    <div class="flex gap-2 overflow-x-auto pb-1 border-b border-slate-800 no-scrollbar text-xs font-bold">
                        <button onclick="window.adminFlow.switchTab('overview')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'}">
                            📊 Overview
                        </button>
                        <button onclick="window.adminFlow.switchTab('toilets')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'toilets' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'}">
                            🚽 Washrooms (${pendingToilets.length} Pending)
                        </button>
                        <button onclick="window.adminFlow.switchTab('providers')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'providers' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'}">
                            🏢 Host Partners (${pendingProviders.length} Pending)
                        </button>
                        <button onclick="window.adminFlow.switchTab('reports')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'reports' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'}">
                            🚩 Complaints (${pendingReports.length} Active)
                        </button>
                        <button onclick="window.adminFlow.switchTab('audit')" class="admin-tab-btn px-4 py-2.5 rounded-xl transition ${this.activeTab === 'audit' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'}">
                            📜 Audit Logs
                        </button>
                    </div>

                    <!-- Active Tab Content -->
                    <div id="admin-tab-content-container">
                        ${await this.renderTabContent(s, allToilets, allReports)}
                    </div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `
                <div class="p-8 text-center text-red-400 text-xs">
                    Failed to fetch admin data from REST backend. Check server connection.
                </div>
            `;
        }
    }

    async switchTab(tabName) {
        this.activeTab = tabName;
        await this.renderAdminDashboard();
    }

    async renderTabContent(stats, allToilets, allReports) {
        if (this.activeTab === 'overview') {
            return `
                <div class="space-y-6">
                    <!-- Metrics Cards Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                            <span class="text-[10px] text-slate-400 font-bold uppercase">Total Revenue</span>
                            <h3 class="text-2xl font-black text-white mt-1">₹${stats.totalRevenue || 0}</h3>
                            <span class="text-[10px] text-emerald-400 font-semibold">Founder Cut: ₹${stats.founderCommissionRevenue || 0}</span>
                        </div>
                        <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                            <span class="text-[10px] text-slate-400 font-bold uppercase">Total Washrooms</span>
                            <h3 class="text-2xl font-black text-emerald-400 mt-1">${stats.totalToilets || 0}</h3>
                            <span class="text-[10px] text-slate-400">${stats.openToilets || 0} Live & Open</span>
                        </div>
                        <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                            <span class="text-[10px] text-slate-400 font-bold uppercase">Pending Approvals</span>
                            <h3 class="text-2xl font-black text-amber-400 mt-1">${stats.pendingToilets || 0}</h3>
                            <span class="text-[10px] text-amber-300">Requires review</span>
                        </div>
                        <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                            <span class="text-[10px] text-slate-400 font-bold uppercase">Avg Hygiene Score</span>
                            <h3 class="text-2xl font-black text-blue-400 mt-1">${stats.averageHygieneScore != null ? stats.averageHygieneScore + '%' : '0%'}</h3>
                            <span class="text-[10px] text-slate-400">Network Standard</span>
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.activeTab === 'toilets') {
            const list = allToilets;
            if (list.length === 0) {
                return `<div class="p-8 text-center text-slate-400 text-xs">No washrooms found.</div>`;
            }

            return `
                <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-4">
                    <h3 class="text-sm font-bold text-white">All Washrooms Management (${list.length})</h3>
                    <div class="space-y-3">
                        ${list.map(t => {
                            let badge = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                            if (t.status === 'APPROVED') badge = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                            if (t.status === 'REJECTED') badge = 'bg-red-500/20 text-red-300 border border-red-500/30';

                            return `
                                <div class="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badge}">
                                                ● ${t.status}
                                            </span>
                                            <span class="text-[10px] font-bold text-slate-400">
                                                By: ${t.providerName}
                                            </span>
                                            <span class="text-[10px] font-bold text-slate-400">
                                                Fee: ${t.isFree ? 'FREE' : '₹' + t.price}
                                            </span>
                                        </div>
                                        <h4 class="font-bold text-sm text-white">${t.name}</h4>
                                        <p class="text-xs text-slate-400">📍 ${t.address}</p>
                                    </div>

                                    <div class="flex items-center gap-2 flex-shrink-0">
                                        ${t.status !== 'APPROVED' ? `
                                            <button onclick="window.adminFlow.verifyToilet('${t.toiletId}', 'APPROVE')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition">
                                                ✓ Approve
                                            </button>
                                        ` : ''}
                                        ${t.status !== 'REJECTED' ? `
                                            <button onclick="window.adminFlow.verifyToilet('${t.toiletId}', 'REJECT')" class="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-xl text-xs font-bold border border-red-500/30 transition">
                                                ✕ Reject
                                            </button>
                                        ` : ''}
                                        <button onclick="window.adminFlow.deleteToilet('${t.toiletId}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        if (this.activeTab === 'reports') {
            if (allReports.length === 0) {
                return `<div class="p-8 text-center text-slate-400 text-xs">No reports recorded.</div>`;
            }

            return `
                <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-4">
                    <h3 class="text-sm font-bold text-white">Complaints & Hygiene Tickets (${allReports.length})</h3>
                    <div class="space-y-3">
                        ${allReports.map(r => `
                            <div class="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2 text-xs">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}">
                                            ● ${r.status}
                                        </span>
                                        <h4 class="font-bold text-sm text-white mt-1">${r.category}: ${r.toiletName}</h4>
                                        <p class="text-slate-400 text-[10px]">Reported by ${r.userName} • Priority: ${r.priority || 'MEDIUM'}</p>
                                    </div>
                                </div>
                                <p class="text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">${r.description}</p>
                                
                                <div class="flex items-center gap-2 pt-1">
                                    <button onclick="window.adminFlow.resolveReport('${r.reportId}', 'RESOLVED')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">
                                        Mark Resolved
                                    </button>
                                    <button onclick="window.adminFlow.resolveReport('${r.reportId}', 'REJECTED')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition">
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (this.activeTab === 'audit') {
            const auditRes = await window.api.get('/admin/audit-logs');
            const logs = auditRes.auditLogs || [];

            if (logs.length === 0) {
                return `<div class="p-8 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>`;
            }

            return `
                <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-4">
                    <h3 class="text-sm font-bold text-white">System Security & Audit History (${logs.length})</h3>
                    <div class="space-y-2">
                        ${logs.map(l => `
                            <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                                <div>
                                    <span class="font-bold text-amber-400">${l.action}</span>
                                    <span class="text-slate-400 ml-2">Target: ${l.targetType} (${l.targetId})</span>
                                    ${l.reason ? `<p class="text-[11px] text-slate-400 mt-0.5">${l.reason}</p>` : ''}
                                </div>
                                <span class="text-[10px] text-slate-500">${new Date(l.timestamp).toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (this.activeTab === 'providers') {
            const providersRes = await window.api.get('/admin/providers').catch(() => ({ providers: [] }));
            const list = providersRes.providers || [];
            if (list.length === 0) {
                return `<div class="p-8 text-center text-slate-400 text-xs">No registered host partners found.</div>`;
            }
            return `
                <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-sm font-bold text-white">Registered Restroom Hosts (${list.length})</h3>
                            <p class="text-xs text-slate-400">Review, approve, or reject partner host applications</p>
                        </div>
                    </div>
                    <div class="space-y-3">
                        ${list.map(p => `
                            <div class="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div>
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            p.verificationStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                                            p.verificationStatus === 'REJECTED' ? 'bg-red-500/20 text-red-300' :
                                            'bg-amber-500/20 text-amber-300'
                                        }">
                                            ● ${p.verificationStatus}
                                        </span>
                                        <span class="text-slate-400 text-[10px] font-mono">${p.userId}</span>
                                    </div>
                                    <h4 class="font-bold text-sm text-white">${p.name} ${p.businessName ? `(${p.businessName})` : ''}</h4>
                                    <p class="text-slate-400 text-xs mt-0.5">📧 ${p.email} • 📱 ${p.mobile || 'No mobile'}</p>
                                </div>
                                <div class="flex items-center gap-2 flex-shrink-0">
                                    ${p.verificationStatus !== 'APPROVED' ? `
                                        <button onclick="window.adminFlow.verifyProvider('${p.userId}', 'APPROVE')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition">
                                            ✓ Approve Host
                                        </button>
                                    ` : ''}
                                    ${p.verificationStatus !== 'REJECTED' ? `
                                        <button onclick="window.adminFlow.verifyProvider('${p.userId}', 'REJECT')" class="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-xl text-xs font-bold border border-red-500/30 transition">
                                            ✕ Reject
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return '';
    }

    async verifyProvider(providerId, action) {
        let reason = null;
        if (action === 'REJECT') {
            reason = prompt('Enter rejection reason for host applicant:');
            if (!reason) return;
        }

        try {
            const res = await window.api.put(`/admin/providers/${providerId}/verify`, {
                action,
                rejectionReason: reason
            });
            if (res.success) {
                window.app.showToast(res.message, 'success');
                await this.renderAdminDashboard();
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error updating host status.', 'error');
        }
    }

    async verifyToilet(toiletId, action) {
        let reason = null;
        if (action === 'REJECT') {
            reason = prompt('Enter rejection reason:');
            if (!reason) return;
        }

        try {
            const res = await window.api.put(`/admin/toilets/${toiletId}/verify`, {
                action,
                rejectionReason: reason
            });
            if (res.success) {
                window.app.showToast(res.message, 'success');
                await this.renderAdminDashboard();
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error verifying toilet.', 'error');
        }
    }

    async deleteToilet(toiletId) {
        if (!confirm('Are you sure you want to permanently delete this washroom listing?')) return;
        try {
            const res = await window.api.delete(`/toilets/${toiletId}`);
            if (res.success) {
                window.app.showToast(res.message, 'success');
                await this.renderAdminDashboard();
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error deleting toilet.', 'error');
        }
    }

    async resolveReport(reportId, status) {
        const response = prompt(`Enter response note for citizen (marking as ${status}):`);
        try {
            const res = await window.api.put(`/reports/${reportId}`, {
                status,
                adminResponse: response || 'Handled by administration'
            });
            if (res.success) {
                window.app.showToast('Report updated successfully.', 'success');
                await this.renderAdminDashboard();
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error updating report.', 'error');
        }
    }

    async resetDatabaseConfirm() {
        if (!confirm('WARNING: Are you sure you want to reset the database to factory demo seed data?')) return;
        try {
            const res = await window.api.post('/admin/reset-factory');
            if (res.success) {
                window.app.showToast('Database reset to factory demo data!', 'success');
                await this.renderAdminDashboard();
            }
        } catch (err) {
            window.app.showToast(err.message || 'Error resetting database.', 'error');
        }
    }
}

window.adminFlow = new AdminFlowController();
