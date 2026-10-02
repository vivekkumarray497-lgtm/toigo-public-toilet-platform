/**
 * TOIGO: Master Application Orchestrator
 * Strictly manages role-based viewports, isolated login portals, Google OAuth & Email Verification states.
 */

class ToigoMasterApp {
    constructor() {
        this.currentRole = 'GUEST';
    }

    init() {
        if (window.toigoMap) {
            window.toigoMap.init('map-view');
        }

        // Check for ?admin=true URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') {
            const admin = window.db.data.admin;
            window.db.setCurrentUser(admin);
        }

        const currentUser = window.auth.getCurrentUser();
        if (currentUser) {
            this.setRoleMode(currentUser.role);
        } else {
            this.setRoleMode('GUEST');
        }

        if (window.userFlow) {
            window.userFlow.init();
        }
    }

    // Role-based Layout Switcher
    setRoleMode(role) {
        this.currentRole = role;
        const currentUser = window.auth.getCurrentUser();

        // Hide all views
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));

        // Hide all role navigations
        document.querySelectorAll('.role-nav-bar').forEach(el => el.classList.add('hidden'));

        const headerRolePill = document.getElementById('header-role-pill');
        const headerAuthActions = document.getElementById('header-auth-actions');
        const headerSosBtn = document.getElementById('header-sos-btn');

        if (role === 'USER' && currentUser) {
            // Check email verification guard
            if (!currentUser.emailVerified) {
                this.openEmailVerificationModal();
                return;
            }

            document.body.className = 'bg-slate-100 text-slate-900 min-h-screen user-mode';
            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
                headerRolePill.innerText = `🚻 ${currentUser.name}`;
            }
            if (headerSosBtn) headerSosBtn.classList.remove('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.switchUserTab('profile')" class="flex items-center gap-1.5 p-1 pl-2 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 transition">
                        <span class="text-xs font-bold text-slate-800 max-w-[80px] truncate">${currentUser.name}</span>
                        <img src="${currentUser.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" class="w-6 h-6 rounded-full object-cover border border-emerald-500" />
                    </button>
                `;
            }

            document.getElementById('nav-bar-user')?.classList.remove('hidden');
            this.switchUserTab('home');

        } else if (role === 'PROVIDER' && currentUser) {
            document.body.className = 'bg-slate-100 text-slate-900 min-h-screen provider-mode';
            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200';
                headerRolePill.innerText = '🏢 Host Partner';
            }
            if (headerSosBtn) headerSosBtn.classList.add('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.switchProviderTab('account')" class="flex items-center gap-1.5 p-1 pl-2 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 transition">
                        <span class="text-xs font-bold text-slate-800 max-w-[90px] truncate">${currentUser.businessName || currentUser.name}</span>
                        <div class="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">🏢</div>
                    </button>
                `;
            }

            document.getElementById('nav-bar-provider')?.classList.remove('hidden');
            this.switchProviderTab('dashboard');

        } else if (role === 'ADMIN' && currentUser) {
            document.body.className = 'bg-slate-950 text-slate-100 min-h-screen admin-mode';
            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40';
                headerRolePill.innerText = '👑 Founder Vivek';
            }
            if (headerSosBtn) headerSosBtn.classList.add('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.logout()" class="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-bold border border-red-500/30 transition">
                        Sign Out
                    </button>
                `;
            }

            document.getElementById('view-admin')?.classList.remove('hidden');
            if (window.adminFlow) window.adminFlow.renderAdminDashboard();

        } else {
            // GUEST / LANDING VIEW
            document.body.className = 'bg-slate-100 text-slate-900 min-h-screen guest-mode';
            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200';
                headerRolePill.innerText = '📍 Live GPS';
            }
            if (headerSosBtn) headerSosBtn.classList.remove('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.openUserLoginModal()" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition">
                        User Sign In
                    </button>
                `;
            }

            document.getElementById('nav-bar-guest')?.classList.remove('hidden');
            document.getElementById('view-landing')?.classList.remove('hidden');
        }
    }

    // ================= USER NAVIGATION =================
    switchUserTab(tab) {
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('#nav-bar-user .nav-tab-item').forEach(btn => {
            if (btn.dataset.tab === tab) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (tab === 'home') {
            document.getElementById('view-user-home')?.classList.remove('hidden');
            if (window.toigoMap) {
                window.toigoMap.init('map-view');
                window.toigoMap.renderApprovedMarkers();
            }
            window.userFlow?.loadAndRenderApprovedToilets();
        } else if (tab === 'reports') {
            document.getElementById('view-user-reports')?.classList.remove('hidden');
            window.userFlow?.renderMyReports();
        } else if (tab === 'profile') {
            document.getElementById('view-user-profile')?.classList.remove('hidden');
            this.renderUserProfile();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderUserProfile() {
        const user = window.auth.getCurrentUser();
        if (!user) return;
        document.getElementById('profile-name-label').innerText = user.name;
        document.getElementById('profile-email-label').innerText = user.email;
        document.getElementById('profile-auth-badge').innerText = user.authProvider === 'google' ? 'Google Authenticated' : 'Email Verified';
    }

    // ================= PROVIDER NAVIGATION =================
    switchProviderTab(tab) {
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('#nav-bar-provider .nav-tab-item').forEach(btn => {
            if (btn.dataset.tab === tab) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (tab === 'dashboard') {
            document.getElementById('view-provider-dashboard')?.classList.remove('hidden');
            window.providerFlow?.renderProviderDashboard();
        } else if (tab === 'add') {
            document.getElementById('view-provider-dashboard')?.classList.remove('hidden');
            window.providerFlow?.openAddToiletModal();
        } else if (tab === 'account') {
            document.getElementById('view-provider-account')?.classList.remove('hidden');
            this.renderProviderAccount();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderProviderAccount() {
        const prov = window.auth.getCurrentUser();
        if (!prov) return;
        document.getElementById('prov-account-name').innerText = prov.name;
        document.getElementById('prov-account-biz').innerText = prov.businessName || 'Host Partner';
        document.getElementById('prov-account-email').innerText = prov.email;
    }

    // ================= USER AUTH MODALS =================
    openUserLoginModal() {
        this.closeAllModals();
        document.getElementById('user-login-modal')?.classList.remove('hidden');
    }

    openUserRegisterModal() {
        this.closeAllModals();
        document.getElementById('user-register-modal')?.classList.remove('hidden');
    }

    submitUserLogin(event) {
        event.preventDefault();
        const email = document.getElementById('user-login-email').value;
        const pass = document.getElementById('user-login-pass').value;

        const res = window.auth.loginUser(email, pass);
        if (!res.success) {
            if (res.requireVerification) {
                this.closeAllModals();
                this.openEmailVerificationModal();
                this.showToast('Please verify your email before continuing.', 'info');
                return;
            }
            this.showToast(res.message, 'error');
            return;
        }

        this.closeAllModals();
        this.showToast(res.message, 'success');
        this.setRoleMode('USER');
    }

    submitUserRegister(event) {
        event.preventDefault();
        const name = document.getElementById('reg-user-name').value;
        const email = document.getElementById('reg-user-email').value;
        const password = document.getElementById('reg-user-pass').value;
        const confirmPassword = document.getElementById('reg-user-pass-confirm').value;
        const mobile = document.getElementById('reg-user-mobile').value;

        const res = window.auth.registerUser({ name, email, password, confirmPassword, mobile });
        if (!res.success) {
            this.showToast(res.message, 'error');
            return;
        }

        this.closeAllModals();
        this.openEmailVerificationModal(res.verificationCode);
        this.showToast(`Verification email sent! Code: ${res.verificationCode}`, 'info');
    }

    openEmailVerificationModal(codeHint = null) {
        this.closeAllModals();
        const modal = document.getElementById('email-verification-modal');
        if (modal) {
            const user = window.db.findUserById(window.auth.pendingVerificationUserId);
            if (user) {
                modal.querySelector('#verify-target-email').innerText = user.email;
                if (codeHint || user.verificationCode) {
                    modal.querySelector('#verify-code-input').value = codeHint || user.verificationCode;
                }
            }
            modal.classList.remove('hidden');
        }
    }

    submitEmailVerification() {
        const code = document.getElementById('verify-code-input').value.trim();
        const res = window.auth.verifyEmailCode(code);
        if (!res.success) {
            this.showToast(res.message, 'error');
            return;
        }

        this.closeAllModals();
        this.showToast(res.message, 'success');
        this.setRoleMode('USER');
    }

    resendVerificationEmail() {
        const res = window.auth.resendVerificationEmail();
        if (res.success) {
            document.getElementById('verify-code-input').value = res.code;
            this.showToast(`New verification code sent! (Code: ${res.code})`, 'success');
        } else {
            this.showToast(res.message, 'error');
        }
    }

    // Google Sign-In Selection Modal
    openGoogleSignInPicker() {
        this.closeAllModals();
        document.getElementById('google-picker-modal')?.classList.remove('hidden');
    }

    selectGoogleAccount(name, email, picture) {
        const res = window.auth.loginWithGoogleAccount({ name, email, picture });
        this.closeAllModals();
        if (res.success) {
            this.showToast(res.message, 'success');
            this.setRoleMode('USER');
        } else {
            this.showToast(res.message, 'error');
        }
    }

    // ================= PROVIDER AUTH MODALS =================
    openProviderAuthModal(mode = 'login') {
        this.closeAllModals();
        const modal = document.getElementById('provider-auth-modal');
        if (!modal) return;

        if (mode === 'register') {
            document.getElementById('prov-register-form').classList.remove('hidden');
            document.getElementById('prov-login-form').classList.add('hidden');
        } else {
            document.getElementById('prov-register-form').classList.add('hidden');
            document.getElementById('prov-login-form').classList.remove('hidden');
        }
        modal.classList.remove('hidden');
    }

    submitProviderLogin(event) {
        event.preventDefault();
        const email = document.getElementById('prov-login-email').value;
        const pass = document.getElementById('prov-login-pass').value;

        const res = window.auth.loginProvider(email, pass);
        if (!res.success) {
            this.showToast(res.message, 'error');
            return;
        }

        this.closeAllModals();
        this.showToast(res.message, 'success');
        this.setRoleMode('PROVIDER');
    }

    submitProviderRegister(event) {
        event.preventDefault();
        const name = document.getElementById('prov-reg-name').value;
        const email = document.getElementById('prov-reg-email').value;
        const password = document.getElementById('prov-reg-pass').value;
        const phone = document.getElementById('prov-reg-phone').value;
        const businessName = document.getElementById('prov-reg-biz').value;
        const bankAccountNo = document.getElementById('prov-reg-acc').value;
        const bankIfsc = document.getElementById('prov-reg-ifsc').value;

        const res = window.auth.registerProvider({ name, email, password, phone, businessName, bankAccountNo, bankIfsc });
        if (!res.success) {
            this.showToast(res.message, 'error');
            return;
        }

        this.closeAllModals();
        this.showToast(res.message, 'success');
        this.setRoleMode('PROVIDER');
    }

    // ================= ADMIN AUTH MODAL =================
    openAdminLoginModal() {
        this.closeAllModals();
        document.getElementById('admin-login-modal')?.classList.remove('hidden');
    }

    submitAdminLogin(event) {
        event.preventDefault();
        const email = document.getElementById('admin-login-email').value;
        const pass = document.getElementById('admin-login-pass').value;

        const res = window.auth.loginAdmin(email, pass);
        if (!res.success) {
            this.showToast(res.message, 'error');
            return;
        }

        this.closeAllModals();
        this.showToast(res.message, 'success');
        this.setRoleMode('ADMIN');
    }

    closeAllModals() {
        document.querySelectorAll('.app-modal').forEach(m => m.classList.add('hidden'));
    }

    logout() {
        window.auth.logout();
        this.showToast('Signed out successfully.', 'info');
        this.setRoleMode('GUEST');
    }

    triggerEmergencySOS() {
        this.showToast('🚨 SOS Emergency Activated! Locating nearest washroom...', 'info');
        this.setRoleMode('USER');
        this.switchUserTab('home');

        const approved = window.db.getPublicApprovedToilets();
        if (approved.length > 0) {
            window.userFlow?.selectToilet(approved[0].toiletId);
        }
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

window.app = new ToigoMasterApp();

document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
