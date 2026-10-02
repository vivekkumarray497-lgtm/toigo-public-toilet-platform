/**
 * TOIGO: Master Application Orchestrator
 * Seamless role routing, OTP lifecycle, first-time user profile onboarding & IFSC bank auto-detection.
 */

class ToigoApp {
    constructor() {
        this.currentView = 'landing';
        this.authCallback = null;
        this.activeAuthRole = 'user'; // 'user' | 'provider' | 'admin'
        this.activeUserAuthMethod = 'mobile'; // 'mobile' | 'email' | 'google'
        this.activeProviderAuthMode = 'register'; // 'register' | 'login'
        this.selectedGender = 'Male';
        this.resendCountdownInterval = null;
        this.resendSecondsLeft = 60;
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
        this.bindBankIfscAutoDetect();
    }

    // Set complete app layout based on logged-in role
    setAppRoleMode(role) {
        const user = window.auth.getCurrentUser();

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
                headerRolePill.innerText = `🚻 ${user.name || 'Citizen'}`;
            }
            if (headerSosBtn) headerSosBtn.classList.remove('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.switchUserTab('profile')" class="flex items-center gap-1.5 p-1 pl-2 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 transition">
                        <span class="text-xs font-bold text-slate-800 max-w-[80px] truncate">${user.name || 'Citizen'}</span>
                        <div class="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                            ${(user.name || 'U')[0]}
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
            if (headerSosBtn) headerSosBtn.classList.add('hidden');

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
        const user = window.auth.getCurrentUser() || { name: 'Citizen', gender: 'Not Specified', email: 'user@toigo.app', walletBalance: 100 };
        const avatarEl = document.getElementById('user-profile-avatar');
        const nameEl = document.getElementById('user-profile-name');
        const emailEl = document.getElementById('user-profile-email');
        const genderEl = document.getElementById('user-profile-gender');
        const walletEl = document.getElementById('user-profile-wallet');

        if (avatarEl) avatarEl.innerText = (user.name || 'U')[0];
        if (nameEl) nameEl.innerText = user.name || 'Citizen User';
        if (emailEl) emailEl.innerText = user.phone ? `+91 ${user.phone}` : (user.email || 'Verified Citizen');
        if (genderEl) genderEl.innerText = user.gender ? `Gender: ${user.gender}` : 'Gender: Verified';
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
                        <div class="flex justify-between"><span class="text-slate-500">Bank Name:</span><span class="font-semibold text-slate-800">${prov.bankName || 'Verified Bank'}</span></div>
                        <div class="flex justify-between"><span class="text-slate-500">Account No:</span><span class="font-mono text-slate-800">•••• ${prov.bankAccountNo ? prov.bankAccountNo.slice(-4) : '5012'}</span></div>
                        <div class="flex justify-between"><span class="text-slate-500">IFSC Code:</span><span class="font-mono text-slate-800">${prov.bankIfsc || 'UTIB0000123'}</span></div>
                        <div class="flex justify-between"><span class="text-slate-500">Bank Verification:</span><span class="font-bold text-emerald-700">✓ VERIFIED</span></div>
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
                this.openAuthModal('user', 'mobile', () => {
                    this.setAppRoleMode('user');
                });
                return;
            }
            this.setAppRoleMode('user');
        } else if (role === 'provider') {
            const user = window.auth.getCurrentUser();
            if (!user || user.role !== 'provider') {
                this.openAuthModal('provider', 'register', () => {
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

    // ================= AUTH MODAL & STATE MACHINE =================
    openAuthModal(targetRole = 'user', initialMethod = 'mobile', onSuccess = null) {
        this.authCallback = onSuccess;
        this.activeAuthRole = targetRole;
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        this.switchAuthRoleTab(targetRole);

        // Reset steps
        document.getElementById('auth-step-input')?.classList.remove('hidden');
        document.getElementById('auth-step-otp')?.classList.add('hidden');
        document.getElementById('auth-step-profile-completion')?.classList.add('hidden');

        modal.classList.remove('hidden');
    }

    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
        clearInterval(this.resendCountdownInterval);
    }

    switchAuthRoleTab(role) {
        this.activeAuthRole = role;

        document.querySelectorAll('.auth-role-tab-btn').forEach(btn => {
            if (btn.dataset.role === role) {
                btn.className = 'auth-role-tab-btn flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white shadow-sm transition';
            } else {
                btn.className = 'auth-role-tab-btn flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-900 transition';
            }
        });

        const userSection = document.getElementById('auth-user-section');
        const providerSection = document.getElementById('auth-provider-section');
        const adminSection = document.getElementById('auth-admin-section');

        if (userSection) userSection.classList.add('hidden');
        if (providerSection) providerSection.classList.add('hidden');
        if (adminSection) adminSection.classList.add('hidden');

        if (role === 'user') {
            if (userSection) userSection.classList.remove('hidden');
            this.switchUserAuthMethod('mobile');
        } else if (role === 'provider') {
            if (providerSection) providerSection.classList.remove('hidden');
            this.switchProviderAuthMode('register');
        } else if (role === 'admin') {
            if (adminSection) adminSection.classList.remove('hidden');
        }
    }

    // User Login Method Switcher: Mobile vs Email
    switchUserAuthMethod(method) {
        this.activeUserAuthMethod = method;

        const mobileBox = document.getElementById('user-auth-mobile-box');
        const emailBox = document.getElementById('user-auth-email-box');
        const tabMobile = document.getElementById('tab-user-method-mobile');
        const tabEmail = document.getElementById('tab-user-method-email');

        if (method === 'mobile') {
            mobileBox?.classList.remove('hidden');
            emailBox?.classList.add('hidden');
            if (tabMobile) tabMobile.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-emerald-700 shadow-xs border border-slate-200 transition';
            if (tabEmail) tabEmail.className = 'px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition';
        } else {
            mobileBox?.classList.add('hidden');
            emailBox?.classList.remove('hidden');
            if (tabMobile) tabMobile.className = 'px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition';
            if (tabEmail) tabEmail.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-emerald-700 shadow-xs border border-slate-200 transition';
        }
    }

    // Provider Mode Switcher: Register vs Login
    switchProviderAuthMode(mode) {
        this.activeProviderAuthMode = mode;
        const regForm = document.getElementById('provider-register-fields');
        const loginForm = document.getElementById('provider-login-fields');
        const tabReg = document.getElementById('tab-prov-mode-register');
        const tabLogin = document.getElementById('tab-prov-mode-login');

        if (mode === 'register') {
            regForm?.classList.remove('hidden');
            loginForm?.classList.add('hidden');
            if (tabReg) tabReg.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs border border-slate-200 transition';
            if (tabLogin) tabLogin.className = 'px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition';
        } else {
            regForm?.classList.add('hidden');
            loginForm?.classList.remove('hidden');
            if (tabReg) tabReg.className = 'px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition';
            if (tabLogin) tabLogin.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs border border-slate-200 transition';
        }
    }

    // Live IFSC Bank Name Resolver
    bindBankIfscAutoDetect() {
        const ifscInput = document.getElementById('prov-reg-ifsc');
        const bankNameLabel = document.getElementById('prov-reg-bank-detected');
        if (!ifscInput || !bankNameLabel) return;

        ifscInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toUpperCase();
            e.target.value = val;
            if (val.length === 11) {
                const check = window.db.verifyBankIfsc(val);
                if (check.valid) {
                    bankNameLabel.innerHTML = `<span class="text-emerald-700 font-bold">✓ ${check.bankName}</span>`;
                } else {
                    bankNameLabel.innerHTML = `<span class="text-red-500 font-medium">Invalid IFSC format</span>`;
                }
            } else {
                bankNameLabel.innerHTML = `<span class="text-slate-400">Bank name auto-resolves from IFSC</span>`;
            }
        });
    }

    // Trigger Send OTP
    submitAuthSendOtp() {
        let authData = {
            role: this.activeAuthRole,
            method: this.activeUserAuthMethod,
            isRegister: false
        };

        if (this.activeAuthRole === 'user') {
            if (this.activeUserAuthMethod === 'mobile') {
                const phone = document.getElementById('user-mobile-input')?.value.trim();
                authData.phone = phone;
                authData.method = 'mobile';
            } else {
                const email = document.getElementById('user-email-input')?.value.trim();
                authData.email = email;
                authData.method = 'email';
            }
        } else if (this.activeAuthRole === 'provider') {
            if (this.activeProviderAuthMode === 'register') {
                authData.isRegister = true;
                authData.name = document.getElementById('prov-reg-name')?.value.trim();
                authData.phone = document.getElementById('prov-reg-phone')?.value.trim();
                authData.email = document.getElementById('prov-reg-email')?.value.trim();
                authData.businessName = document.getElementById('prov-reg-biz-name')?.value.trim();
                authData.address = document.getElementById('prov-reg-address')?.value.trim();
                authData.bankAccountNo = document.getElementById('prov-reg-acc')?.value.trim();
                authData.bankIfsc = document.getElementById('prov-reg-ifsc')?.value.trim();
                authData.upiId = document.getElementById('prov-reg-upi')?.value.trim() || 'host@okaxis';
                authData.method = 'mobile';
            } else {
                const identifier = document.getElementById('prov-login-input')?.value.trim();
                if (identifier.includes('@')) {
                    authData.email = identifier;
                    authData.method = 'email';
                } else {
                    authData.phone = identifier;
                    authData.method = 'mobile';
                }
            }
        } else if (this.activeAuthRole === 'admin') {
            authData.phone = '9999999999';
            authData.name = 'Vivek (Founder)';
            authData.method = 'mobile';
        }

        const res = window.auth.requestOtp(authData);
        if (!res.success) {
            this.showToast(res.message, 'error');
            return;
        }

        // Show Step 2: OTP Entry
        document.getElementById('auth-step-input').classList.add('hidden');
        document.getElementById('auth-step-otp').classList.remove('hidden');
        document.getElementById('otp-sent-to-label').innerText = `4-digit OTP sent to ${res.identifier}`;
        document.getElementById('auth-otp-input').value = res.otp; // Auto-fill for seamless user experience

        this.startResendOtpTimer();
        this.showToast(`Verification OTP: ${res.otp} (Auto-filled)`, 'info');
    }

    startResendOtpTimer() {
        this.resendSecondsLeft = 60;
        const resendBtn = document.getElementById('auth-resend-otp-btn');
        const timerLabel = document.getElementById('auth-otp-timer-label');
        if (resendBtn) resendBtn.disabled = true;

        clearInterval(this.resendCountdownInterval);
        this.resendCountdownInterval = setInterval(() => {
            this.resendSecondsLeft--;
            if (timerLabel) {
                timerLabel.innerText = `Resend available in ${this.resendSecondsLeft}s`;
            }

            if (this.resendSecondsLeft <= 0) {
                clearInterval(this.resendCountdownInterval);
                if (timerLabel) timerLabel.innerText = 'Didn\'t receive OTP?';
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.className = 'text-xs text-emerald-600 font-bold hover:underline cursor-pointer';
                }
            }
        }, 1000);
    }

    resendOtp() {
        if (this.resendSecondsLeft > 0) return;
        this.submitAuthSendOtp();
    }

    // Verify OTP Step 2
    submitVerifyOtp() {
        const otpVal = document.getElementById('auth-otp-input').value.trim();
        const res = window.auth.verifyOtp(otpVal);

        if (!res.success) {
            this.showToast(res.message, 'error');
            return;
        }

        // Check if first-time user profile completion is required
        if (res.requireProfileCompletion) {
            document.getElementById('auth-step-otp').classList.add('hidden');
            document.getElementById('auth-step-profile-completion').classList.remove('hidden');
            this.showToast('Please complete your Name and Gender to continue.', 'info');
            return;
        }

        this.finishAuthFlow(res.user);
    }

    // Gender selection pill in Step 3
    selectGender(gender) {
        this.selectedGender = gender;
        document.querySelectorAll('.gender-pill-btn').forEach(btn => {
            if (btn.dataset.gender === gender) {
                btn.className = 'gender-pill-btn flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs transition';
            } else {
                btn.className = 'gender-pill-btn flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
            }
        });
    }

    // Complete Step 3: Name + Gender for First-Time User
    submitProfileCompletion() {
        const fullName = document.getElementById('profile-name-input').value.trim();
        const res = window.auth.completeProfile(fullName, this.selectedGender);

        if (!res.success) {
            this.showToast(res.message, 'error');
            return;
        }

        this.finishAuthFlow(res.user);
    }

    // Google Login Simulation
    handleGoogleLogin() {
        const res = window.auth.loginWithGoogle();
        if (res.requireProfileCompletion) {
            document.getElementById('auth-step-input').classList.add('hidden');
            document.getElementById('auth-step-profile-completion').classList.remove('hidden');
            this.showToast('Google account connected! Please confirm Name and Gender.', 'info');
            return;
        }

        this.finishAuthFlow(res.user);
    }

    finishAuthFlow(user) {
        this.closeAuthModal();
        this.showToast(`Signed in successfully as ${user.name || 'Citizen'}!`, 'success');
        this.setAppRoleMode(user.role);

        if (this.authCallback) {
            this.authCallback(user);
            this.authCallback = null;
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
