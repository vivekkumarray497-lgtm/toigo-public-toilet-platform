/**
 * TOIGO: App Orchestrator & View Router
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
            if (user.role === 'admin') this.switchView('admin');
            else if (user.role === 'provider') this.switchView('provider');
            else this.switchView('landing');
        } else {
            this.switchView('landing');
        }

        this.updateHeaderAuthStatus();
        window.userFlow.init();
    }

    switchView(viewName) {
        this.currentView = viewName;

        // Hide all views
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));

        // Show active view
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) targetView.classList.remove('hidden');

        // Update Nav Tabs
        document.querySelectorAll('.nav-tab-item').forEach(btn => {
            if (btn.dataset.view === viewName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

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
        }

        this.updateHeaderAuthStatus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateHeaderAuthStatus() {
        const user = window.auth.getCurrentUser();
        const authBtnContainer = document.getElementById('header-auth-actions');
        const headerCityPill = document.getElementById('header-city-pill');
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

            if (headerCityPill) {
                headerCityPill.className = `px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`;
                headerCityPill.innerText = roleBadge;
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
            if (headerCityPill) {
                headerCityPill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80';
                headerCityPill.innerText = '📍 Live GPS';
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

        if (avatarEl) avatarEl.innerText = user.name[0] || 'T';
        if (nameEl) nameEl.innerText = user.name;
        if (emailEl) emailEl.innerText = user.email || user.phone || 'Verified User';
        if (roleEl) {
            roleEl.innerText = user.role === 'admin' ? '👑 Founder / Super Admin' : user.role === 'provider' ? '🏢 Restroom Host Partner' : '🚻 Citizen Account';
        }
        if (walletEl) walletEl.innerText = `₹${(user.walletBalance || 0).toFixed(2)}`;
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

    // Role selection on Landing Screen
    selectLandingRole(role) {
        if (role === 'user') {
            if (!window.auth.isLoggedIn()) {
                window.auth.quickLoginAs('user');
                this.showToast('Signed in as Citizen. Ready to find washrooms!', 'success');
            }
            this.switchView('user');
        } else if (role === 'provider') {
            if (!window.auth.isLoggedIn() || !window.auth.isProvider()) {
                window.auth.quickLoginAs('provider');
                this.showToast('Signed in as Host Partner. Welcome!', 'success');
            }
            this.switchView('provider');
        } else if (role === 'admin') {
            window.auth.quickLoginAs('admin');
            this.showToast('👑 Founder privileges enabled! Full master control.', 'success');
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

            const role = res.user.role;
            if (role === 'admin') this.switchView('admin');
            else if (role === 'provider') this.switchView('provider');
            else this.switchView('user');

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
