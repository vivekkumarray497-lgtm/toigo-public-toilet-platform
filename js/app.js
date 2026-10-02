/**
 * TOIGO: Strict Role Architecture & Dedicated Interface Orchestrator
 */

class ToigoApp {
    constructor() {
        this.currentView = 'landing';
        this.authCallback = null;
    }

    init() {
        window.toigoMap.init('map-view');

        const user = window.auth.getCurrentUser();
        if (user) {
            this.setAppRoleMode(user.role);
        } else {
            this.setAppRoleMode('guest');
        }

        window.userFlow.init();
    }

    // Set complete app layout based on logged-in role
    setAppRoleMode(role) {
        const user = window.auth.getCurrentUser();
        const appContainer = document.getElementById('app-main-content');

        // Hide all views first
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));

        // Hide all role bottom navigations
        document.querySelectorAll('.role-nav-bar').forEach(el => el.classList.add('hidden'));

        // Header elements
        const headerRolePill = document.getElementById('header-role-pill');
        const headerAuthActions = document.getElementById('header-auth-actions');
        const headerSosBtn = document.getElementById('header-sos-btn');

        if (role === 'user' && user) {
            // ================= 1. USER DEDICATED MODE =================
            document.body.classList.remove('provider-mode', 'admin-mode');
            document.body.classList.add('user-mode');

            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
                headerRolePill.innerText = '🚻 Citizen User';
            }
            if (headerSosBtn) headerSosBtn.classList.remove('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.switchUserTab('profile')" class="flex items-center gap-1.5 p-1 pl-2 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 transition">
                        <span class="text-xs font-bold text-slate-800 max-w-[80px] truncate">${user.name}</span>
                        <div class="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                            ${user.name[0]}
                        </div>
                    </button>
                `;
            }

            // Show User Navigation
            document.getElementById('nav-bar-user')?.classList.remove('hidden');
            this.switchUserTab('map');

        } else if (role === 'provider' && user) {
            // ================= 2. PROVIDER DEDICATED MODE =================
            document.body.classList.remove('user-mode', 'admin-mode');
            document.body.classList.add('provider-mode');

            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200';
                headerRolePill.innerText = '🏢 Host Partner';
            }
            if (headerSosBtn) headerSosBtn.classList.add('hidden'); // Host doesn't need consumer SOS

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.switchProviderTab('account')" class="flex items-center gap-1.5 p-1 pl-2 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 transition">
                        <span class="text-xs font-bold text-slate-800 max-w-[90px] truncate">${user.businessName || user.name}</span>
                        <div class="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                            ${(user.businessName || user.name)[0]}
                        </div>
                    </button>
                `;
            }

            // Show Provider Navigation
            document.getElementById('nav-bar-provider')?.classList.remove('hidden');
            this.switchProviderTab('dashboard');

        } else if (role === 'admin' && user) {
            // ================= 3. FOUNDER / ADMIN MODE =================
            document.body.classList.remove('user-mode', 'provider-mode');
            document.body.classList.add('admin-mode');

            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200';
                headerRolePill.innerText = '👑 Founder & Owner';
            }
            if (headerSosBtn) headerSosBtn.classList.add('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.switchAdminTab('overview')" class="flex items-center gap-1.5 p-1 pl-2 bg-amber-50 hover:bg-amber-100 rounded-full border border-amber-200 transition">
                        <span class="text-xs font-bold text-amber-900 truncate">Founder Vivek</span>
                        <div class="w-6 h-6 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">
                            👑
                        </div>
                    </button>
                `;
            }

            document.getElementById('nav-bar-admin')?.classList.remove('hidden');
            document.getElementById('view-admin')?.classList.remove('hidden');
            window.adminFlow.renderAdminDashboard();

        } else {
            // ================= 4. GUEST / WELCOME LANDING =================
            document.body.classList.remove('user-mode', 'provider-mode', 'admin-mode');

            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200';
                headerRolePill.innerText = '📍 Live GPS';
            }
            if (headerSosBtn) headerSosBtn.classList.remove('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.openAuthModal('user')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition">
                        Sign In
                    </button>
                `;
            }

            document.getElementById('nav-bar-guest')?.classList.remove('hidden');
            document.getElementById('view-landing')?.classList.remove('hidden');
        }
    }

    // ================= USER NAVIGATION TABS =================
    switchUserTab(tabName) {
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('#nav-bar-user .nav-tab-item').forEach(btn => {
            if (btn.dataset.tab === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (tabName === 'map') {
            const userMapView = document.getElementById('view-user-map');
            if (userMapView) userMapView.classList.remove('hidden');
            window.toigoMap.init('map-view');
            setTimeout(() => {
                window.toigoMap.map?.invalidateSize();
                window.toigoMap.renderToiletMarkers();
            }, 150);
            window.userFlow.applyFilters();
        } else if (tabName === 'history') {
            document.getElementById('view-user-history')?.classList.remove('hidden');
            this.renderUserHistory();
        } else if (tabName === 'profile') {
            document.getElementById('view-user-profile')?.classList.remove('hidden');
            this.renderUserProfile();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderUserHistory() {
        const container = document.getElementById('user-history-list');
        if (!container) return;

        const user = window.auth.getCurrentUser();
        const myBookings = (window.db.data.bookings || []).filter(b => b.userId === user?.id);

        if (myBookings.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-white rounded-3xl border border-slate-100">
                    <span class="text-3xl block mb-2">📋</span>
                    <h3 class="font-bold text-slate-800 text-sm">No Usage History Yet</h3>
                    <p class="text-xs text-slate-500 mt-1">Your completed washroom visits and receipts will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = myBookings.map(b => `
            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-xs text-slate-900">${b.toiletName}</h4>
                    <span class="text-xs font-black text-emerald-600">₹${b.amount}</span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span>${new Date(b.timestamp).toLocaleDateString()} at ${new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span class="text-emerald-700 font-semibold">${b.paymentStatus}</span>
                </div>
                <div class="pt-1 text-[11px] text-slate-500">
                    Method: <span class="font-medium text-slate-700">${b.paymentMethod}</span>
                </div>
            </div>
        `).join('');
    }

    renderUserProfile() {
        const user = window.auth.getCurrentUser() || { name: 'Citizen', email: 'user@toigo.app', walletBalance: 100 };
        const avatarEl = document.getElementById('user-profile-avatar');
        const nameEl = document.getElementById('user-profile-name');
        const emailEl = document.getElementById('user-profile-email');
        const walletEl = document.getElementById('user-profile-wallet');

        if (avatarEl) avatarEl.innerText = user.name[0] || 'U';
        if (nameEl) nameEl.innerText = user.name;
        if (emailEl) emailEl.innerText = user.email || user.phone || 'Verified Citizen';
        if (walletEl) walletEl.innerText = `₹${(user.walletBalance || 0).toFixed(2)}`;
    }

    // ================= PROVIDER NAVIGATION TABS =================
    switchProviderTab(tabName) {
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('#nav-bar-provider .nav-tab-item').forEach(btn => {
            if (btn.dataset.tab === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (tabName === 'dashboard') {
            document.getElementById('view-provider-dashboard')?.classList.remove('hidden');
            window.providerFlow.renderProviderDashboard();
        } else if (tabName === 'add') {
            document.getElementById('view-provider-dashboard')?.classList.remove('hidden');
            window.providerFlow.openAddListingModal();
        } else if (tabName === 'earnings') {
            document.getElementById('view-provider-earnings')?.classList.remove('hidden');
            this.renderProviderEarningsView();
        } else if (tabName === 'account') {
            document.getElementById('view-provider-account')?.classList.remove('hidden');
            this.renderProviderAccount();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderProviderEarningsView() {
        const prov = window.auth.getCurrentUser();
        if (!prov) return;

        const myBookings = window.db.data.bookings.filter(b => b.providerId === prov.id);
        const totalEarnings = (prov.totalEarned || 0) + myBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

        const container = document.getElementById('provider-earnings-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-4">
                <div class="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg">
                    <span class="text-xs uppercase font-bold text-emerald-100">Total Direct Revenue</span>
                    <h2 class="text-3xl font-black mt-1">₹${totalEarnings.toFixed(2)}</h2>
                    <p class="text-xs text-emerald-100 mt-1">Directly received from customers via UPI / Cash</p>
                </div>

                <div class="bg-white rounded-3xl p-5 border border-slate-200 space-y-3">
                    <h3 class="font-bold text-slate-900 text-sm">Linked Bank & UPI Payout Info</h3>
                    <div class="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs">
                        <div class="flex justify-between"><span class="text-slate-500">Host UPI ID:</span><span class="font-bold font-mono text-emerald-700">${prov.upiId || 'host@okaxis'}</span></div>
                        <div class="flex justify-between"><span class="text-slate-500">Bank Name:</span><span class="font-semibold text-slate-800">${prov.bankHolderName || prov.name}</span></div>
                        <div class="flex justify-between"><span class="text-slate-500">Account No:</span><span class="font-mono text-slate-800">•••• ${prov.bankAccountNo ? prov.bankAccountNo.slice(-4) : '5012'}</span></div>
                        <div class="flex justify-between"><span class="text-slate-500">IFSC Code:</span><span class="font-mono text-slate-800">${prov.bankIfsc || 'UTIB0000123'}</span></div>
                    </div>
                </div>

                <div class="bg-white rounded-3xl p-5 border border-slate-200">
                    <h3 class="font-bold text-slate-900 text-sm mb-3">Customer Visit Transactions (${myBookings.length})</h3>
                    <div class="space-y-2">
                        ${myBookings.length === 0 ? '<p class="text-xs text-slate-400">No visits recorded yet.</p>' : myBookings.map(b => `
                            <div class="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                                <div>
                                    <p class="font-bold text-slate-900">${b.userName}</p>
                                    <p class="text-[10px] text-slate-400">${new Date(b.timestamp).toLocaleTimeString()}</p>
                                </div>
                                <span class="font-black text-emerald-600">+₹${b.amount}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderProviderAccount() {
        const prov = window.auth.getCurrentUser();
        if (!prov) return;

        const nameEl = document.getElementById('provider-account-name');
        const bizEl = document.getElementById('provider-account-biz');
        const upiEl = document.getElementById('provider-account-upi');

        if (nameEl) nameEl.innerText = prov.name;
        if (bizEl) bizEl.innerText = prov.businessName || 'Host Business';
        if (upiEl) upiEl.innerText = prov.upiId || 'host@okaxis';
    }

    // ================= ADMIN NAVIGATION TABS =================
    switchAdminTab(tabName) {
        document.getElementById('view-admin')?.classList.remove('hidden');
        window.adminFlow.switchTab(tabName);
    }

    // Role selection on Landing Screen
    selectLandingRole(role) {
        if (role === 'user') {
            const user = window.auth.getCurrentUser();
            if (!user || user.role !== 'user') {
                this.openAuthModal('user', (newUser) => {
                    this.setAppRoleMode('user');
                });
                return;
            }
            this.setAppRoleMode('user');
        } else if (role === 'provider') {
            const user = window.auth.getCurrentUser();
            if (!user || user.role !== 'provider') {
                this.openAuthModal('provider', (newProv) => {
                    this.setAppRoleMode('provider');
                });
                return;
            }
            this.setAppRoleMode('provider');
        } else if (role === 'admin') {
            window.auth.quickLoginAs('admin');
            this.showToast('👑 Founder master privileges enabled!', 'success');
            this.setAppRoleMode('admin');
        }
    }

    // Auth Modal Management
    openAuthModal(targetRole = 'user', onSuccess = null) {
        this.authCallback = onSuccess;
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        modal.dataset.targetRole = targetRole;
        this.switchAuthTab(targetRole);

        document.getElementById('auth-step-credentials')?.classList.remove('hidden');
        document.getElementById('auth-step-otp')?.classList.add('hidden');

        modal.classList.remove('hidden');
    }

    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
    }

    switchAuthTab(role) {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        modal.dataset.targetRole = role;

        document.querySelectorAll('.auth-tab-btn').forEach(btn => {
            if (btn.dataset.role === role) {
                btn.className = 'auth-tab-btn flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white shadow-sm transition';
            } else {
                btn.className = 'auth-tab-btn flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-900 transition';
            }
        });

        const provFields = document.getElementById('provider-specific-fields');
        if (provFields) {
            if (role === 'provider') provFields.classList.remove('hidden');
            else provFields.classList.add('hidden');
        }

        const adminNotice = document.getElementById('admin-specific-notice');
        if (adminNotice) {
            if (role === 'admin') adminNotice.classList.remove('hidden');
            else adminNotice.classList.add('hidden');
        }
    }

    submitAuthStep1() {
        const modal = document.getElementById('auth-modal');
        const role = modal.dataset.targetRole || 'user';

        let email = document.getElementById('auth-email-input').value.trim();
        let phone = document.getElementById('auth-phone-input').value.trim();
        let name = document.getElementById('auth-name-input').value.trim();

        if (role === 'admin') {
            email = 'founder@toigo.app';
            phone = '9999999999';
            name = 'Vivek (Founder)';
        } else {
            if (!phone && !email) {
                this.showToast('Please enter your Phone or Email', 'error');
                return;
            }
            if (!name) name = role === 'provider' ? 'Restroom Host' : 'Citizen User';
        }

        const authData = {
            role,
            name,
            email: email || `${phone}@toigo.app`,
            phone: phone || '9876543210',
            businessName: document.getElementById('auth-business-input')?.value || 'Restroom Host',
            upiId: document.getElementById('auth-upi-input')?.value || 'host@okaxis',
            bankAccountNo: document.getElementById('auth-bank-acc')?.value || '918273645012',
            bankIfsc: document.getElementById('auth-bank-ifsc')?.value || 'UTIB0000123',
            qrCodeImage: window.auth.uploadedQrImage
        };

        const res = window.auth.requestOtp(authData);
        if (res.success) {
            document.getElementById('auth-step-credentials').classList.add('hidden');
            document.getElementById('auth-step-otp').classList.remove('hidden');
            document.getElementById('otp-sent-to-label').innerText = `OTP sent to ${authData.phone}`;
            document.getElementById('auth-otp-input').value = res.otp;
            this.showToast(`Verification OTP: ${res.otp} (Auto-filled)`, 'info');
        }
    }

    submitAuthStep2() {
        const otpVal = document.getElementById('auth-otp-input').value.trim();
        const res = window.auth.verifyOtp(otpVal);

        if (res.success) {
            this.closeAuthModal();
            this.showToast(res.message, 'success');

            this.setAppRoleMode(res.user.role);

            if (this.authCallback) {
                this.authCallback(res.user);
                this.authCallback = null;
            }
        } else {
            this.showToast(res.message, 'error');
        }
    }

    logout() {
        window.auth.logout();
        this.showToast('Logged out successfully.', 'info');
        this.setAppRoleMode('guest');
    }

    triggerEmergencySOS() {
        this.showToast('🚨 SOS Emergency Activated! Locating nearest washroom...', 'info');
        this.setAppRoleMode('user');
        this.switchUserTab('map');

        const all = window.db.getAllToilets();
        const userLat = window.toigoMap.userCoords.lat;
        const userLng = window.toigoMap.userCoords.lng;

        if (all.length === 0) {
            this.showToast('No toilets in range.', 'error');
            return;
        }

        all.sort((a, b) => {
            return window.db.calculateDistance(userLat, userLng, a.lat, a.lng) -
                   window.db.calculateDistance(userLat, userLng, b.lat, b.lng);
        });

        const nearest = all[0];
        window.userFlow.selectToilet(nearest.id);
        this.showToast(`Nearest washroom: "${nearest.name}" (${window.db.calculateDistance(userLat, userLng, nearest.lat, nearest.lng)} km)`, 'success');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        let bgClass = 'bg-slate-900 text-white';
        let icon = 'ℹ️';

        if (type === 'success') {
            bgClass = 'bg-emerald-600 text-white shadow-emerald-500/30';
            icon = '✓';
        } else if (type === 'error') {
            bgClass = 'bg-red-600 text-white shadow-red-500/30';
            icon = '✕';
        }

        toast.className = `transform transition-all duration-300 ease-out flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold ${bgClass} translate-y-4 opacity-0`;
        toast.innerHTML = `
            <span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">${icon}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
        }, 10);

        setTimeout(() => {
            toast.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

window.app = new ToigoApp();

document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
