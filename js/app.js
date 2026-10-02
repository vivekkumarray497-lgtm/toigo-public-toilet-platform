/**
 * TOIGO: App Orchestrator & Strict Role Router
 * Completely isolates User and Provider interfaces
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
            this.routeUserToDedicatedInterface(user);
        } else {
            this.switchView('landing');
        }

        this.updateHeaderAuthStatus();
        this.updateRoleSpecificNav();
        window.userFlow.init();
    }

    routeUserToDedicatedInterface(user) {
        if (!user) {
            this.switchView('landing');
            return;
        }

        if (user.role === 'admin') {
            this.switchView('admin');
        } else if (user.role === 'provider') {
            this.switchView('provider');
        } else {
            this.switchView('user');
        }
    }

    switchView(viewName) {
        // Enforce strict interface access
        const user = window.auth.getCurrentUser();

        // If a normal user tries to access provider or admin view, block it!
        if (user && user.role === 'user' && (viewName === 'provider' || viewName === 'admin')) {
            this.showToast('Access restricted: You are in Citizen User mode.', 'error');
            this.switchView('user');
            return;
        }

        // If a provider tries to access user map view or admin, redirect to provider dashboard
        if (user && user.role === 'provider' && viewName === 'admin') {
            this.showToast('Access restricted to Founder.', 'error');
            this.switchView('provider');
            return;
        }

        this.currentView = viewName;

        // Hide all views
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));

        // Show active view
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) targetView.classList.remove('hidden');

        // Update Nav Bars
        this.updateRoleSpecificNav();

        // View specific initializations
        if (viewName === 'user') {
            window.toigoMap.init('map-view');
            setTimeout(() => {
                window.toigoMap.map?.invalidateSize();
                window.toigoMap.renderToiletMarkers();
            }, 150);
            window.userFlow.applyFilters();
        } else if (viewName === 'provider') {
            window.providerFlow.renderProviderDashboard();
        } else if (viewName === 'admin') {
            window.adminFlow.renderAdminDashboard();
        } else if (viewName === 'profile') {
            this.renderProfileView();
        } else if (viewName === 'history') {
            this.renderHistoryView();
        }

        this.updateHeaderAuthStatus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Show appropriate bottom navigation depending on user role
    updateRoleSpecificNav() {
        const user = window.auth.getCurrentUser();
        const userNav = document.getElementById('bottom-nav-user');
        const providerNav = document.getElementById('bottom-nav-provider');
        const adminNav = document.getElementById('bottom-nav-admin');
        const guestNav = document.getElementById('bottom-nav-guest');

        // Hide all nav bars first
        if (userNav) userNav.classList.add('hidden');
        if (providerNav) providerNav.classList.add('hidden');
        if (adminNav) adminNav.classList.add('hidden');
        if (guestNav) guestNav.classList.add('hidden');

        if (!user || this.currentView === 'landing') {
            if (guestNav) guestNav.classList.remove('hidden');
            return;
        }

        if (user.role === 'admin') {
            if (adminNav) adminNav.classList.remove('hidden');
        } else if (user.role === 'provider') {
            if (providerNav) providerNav.classList.remove('hidden');
        } else {
            if (userNav) userNav.classList.remove('hidden');
        }

        // Update active class on current nav tab
        document.querySelectorAll('.nav-tab-item').forEach(btn => {
            if (btn.dataset.view === this.currentView) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateHeaderAuthStatus() {
        const user = window.auth.getCurrentUser();
        const authBtnContainer = document.getElementById('header-auth-actions');
        const headerRolePill = document.getElementById('header-role-pill');
        if (!authBtnContainer) return;

        if (user) {
            let roleBadge = '🚻 Citizen';
            let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            if (user.role === 'provider') {
                roleBadge = '🏢 Host Partner';
                badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
            } else if (user.role === 'admin') {
                roleBadge = '👑 Founder Admin';
                badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
            }

            if (headerRolePill) {
                headerRolePill.className = `px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`;
                headerRolePill.innerText = roleBadge;
            }

            authBtnContainer.innerHTML = `
                <button onclick="window.app.openProfileView()" class="flex items-center gap-1.5 p-1 pl-2 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 transition">
                    <span class="text-xs font-bold text-slate-800 max-w-[80px] truncate">${user.name}</span>
                    <div class="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                        ${user.name[0]}
                    </div>
                </button>
            `;
        } else {
            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200';
                headerRolePill.innerText = '📍 Live GPS';
            }

            authBtnContainer.innerHTML = `
                <button onclick="window.app.openAuthModal('user')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition">
                    Sign In
                </button>
            `;
        }
    }

    openProfileView() {
        if (!window.auth.isLoggedIn()) {
            this.openAuthModal('user', () => {
                this.switchView('profile');
            });
            return;
        }
        this.switchView('profile');
    }

    renderProfileView() {
        const user = window.auth.getCurrentUser() || { name: 'Citizen', email: 'user@toigo.app', walletBalance: 100, role: 'user' };
        
        const avatarEl = document.getElementById('profile-avatar-large');
        const nameEl = document.getElementById('profile-user-name');
        const emailEl = document.getElementById('profile-user-email');
        const roleEl = document.getElementById('profile-user-role-badge');
        const walletEl = document.getElementById('profile-wallet-balance');
        const roleSwitchBtn = document.getElementById('profile-switch-role-btn');

        if (avatarEl) avatarEl.innerText = user.name[0] || 'T';
        if (nameEl) nameEl.innerText = user.name;
        if (emailEl) emailEl.innerText = user.email || user.phone || 'Verified User';
        if (roleEl) {
            roleEl.innerText = user.role === 'admin' ? '👑 Founder / Super Admin' : user.role === 'provider' ? '🏢 Restroom Host Partner' : '🚻 Citizen User Account';
        }
        if (walletEl) walletEl.innerText = `₹${(user.walletBalance || 0).toFixed(2)}`;

        // Dynamic Role Switch button in Profile
        if (roleSwitchBtn) {
            if (user.role === 'user') {
                roleSwitchBtn.innerHTML = `
                    <button onclick="window.app.logout(); window.app.openAuthModal('provider')" class="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-1.5">
                        <span>🏢 Switch to Host / Provider Portal</span>
                    </button>
                `;
            } else if (user.role === 'provider') {
                roleSwitchBtn.innerHTML = `
                    <button onclick="window.app.logout(); window.app.openAuthModal('user')" class="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-1.5">
                        <span>🚻 Switch to Citizen / User Portal</span>
                    </button>
                `;
            } else {
                roleSwitchBtn.innerHTML = '';
            }
        }
    }

    renderHistoryView() {
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

    quickFilterSearch(type) {
        this.switchView('user');
        const pill = document.querySelector(`.filter-type-pill[data-type="${type}"]`);
        if (pill) {
            document.querySelectorAll('.filter-type-pill').forEach(b => b.classList.remove('active-filter'));
            pill.classList.add('active-filter');
            window.userFlow.activeFilters.type = type;
            window.userFlow.applyFilters();
        }
    }

    // Role selection on Landing Screen (Strict Login Enforced)
    selectLandingRole(role) {
        if (role === 'user') {
            const user = window.auth.getCurrentUser();
            if (!user || user.role !== 'user') {
                window.auth.requireLogin('user', () => {
                    this.switchView('user');
                });
                return;
            }
            this.switchView('user');
        } else if (role === 'provider') {
            const user = window.auth.getCurrentUser();
            if (!user || user.role !== 'provider') {
                window.auth.requireLogin('provider', () => {
                    this.switchView('provider');
                });
                return;
            }
            this.switchView('provider');
        } else if (role === 'admin') {
            window.auth.quickLoginAs('admin');
            this.showToast('👑 Founder privileges active!', 'success');
            this.switchView('admin');
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
            if (!name) name = role === 'provider' ? 'Clean Rest Host' : 'Citizen';
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

            this.routeUserToDedicatedInterface(res.user);

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
        this.switchView('landing');
    }

    // Emergency SOS: Find nearest toilet in 1 click
    triggerEmergencySOS() {
        this.showToast('🚨 SOS Emergency Activated! Locating nearest washroom...', 'info');
        this.switchView('user');

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
