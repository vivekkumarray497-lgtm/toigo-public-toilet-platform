/**
 * TOIGO: Master Application Orchestrator
 * Fully connected to REST API with exact matching modal IDs and event handlers.
 */

class ToigoMasterApp {
    constructor() {
        this.currentRole = 'GUEST';
        this.authMode = 'TEST'; // 'TEST' | 'PROD'
        this.citizenMobile = '';
        this.citizenOtpTimerInterval = null;
        this.citizenOtpSecondsLeft = 45;
        this.selectedCitizenGender = 'Male';
    }

    async init() {
        try {
            // 1. Initialize Map
            if (window.toigoMap) {
                try {
                    window.toigoMap.init('map-view');
                } catch (mapErr) {
                    console.error('[TOIGO INIT] Map init error:', mapErr);
                }
            }

            // 2. Check for ?admin=true URL parameter to open Admin login portal
            try {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('admin') === 'true') {
                    const serverUser = await window.auth.syncCurrentUser();
                    if (serverUser && serverUser.role === 'ADMIN') {
                        this.setRoleMode('ADMIN');
                        return;
                    } else {
                        this.openAdminLoginModal();
                    }
                }
            } catch (adminParamErr) {
                console.warn('[TOIGO INIT] Admin param notice:', adminParamErr);
            }

            // 3. Server-authoritative Authentication Bootstrap
            try {
                const serverUser = await window.auth.syncCurrentUser();
                if (serverUser && serverUser.userId) {
                    this.setRoleMode(serverUser.role);
                } else {
                    this.setRoleMode('GUEST');
                }
            } catch (authSyncErr) {
                console.error('[TOIGO INIT] Auth sync validation error:', authSyncErr);
                this.setRoleMode('GUEST');
            }

            // 4. Initialize User Flow
            if (window.userFlow) {
                try {
                    window.userFlow.init();
                } catch (userFlowErr) {
                    console.error('[TOIGO INIT] UserFlow init error:', userFlowErr);
                }
            }

            // 5. Update Notification Badge
            try {
                this.updateNotificationBadge();
            } catch (notifErr) {
                console.warn('[TOIGO INIT] Notification badge update notice:', notifErr);
            }
        } catch (fatalErr) {
            console.error('[TOIGO INIT CRITICAL] Master app init error:', fatalErr);
            this.setRoleMode('GUEST');
        }
    }

    // ================= 1. ROLE-BASED VIEWPORT DISPATCH =================
    setRoleMode(role) {
        const currentUser = window.auth.getCurrentUser();
        const isLoggedIn = window.auth.isLoggedIn();

        // Enforce strict server authentication integrity - NEVER allow unauthenticated dashboard access
        if (role !== 'GUEST') {
            if (!isLoggedIn || !currentUser || currentUser.role !== role) {
                console.warn(`[TOIGO AUTH GUARD] Blocked unauthenticated role dispatch: '${role}'. Enforcing GUEST mode.`);
                role = 'GUEST';
            }
        }

        this.currentRole = role;

        // Hide all views
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));

        // Hide all role navigations
        document.querySelectorAll('.role-nav-bar').forEach(el => el.classList.add('hidden'));

        const headerRolePill = document.getElementById('header-role-pill');
        const headerAuthActions = document.getElementById('header-auth-actions');
        const headerSosBtn = document.getElementById('header-sos-btn');

        if (role === 'USER' && currentUser && isLoggedIn) {
            document.body.className = 'bg-slate-100 text-slate-900 min-h-screen user-mode';
            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
                headerRolePill.innerText = `🚻 ${currentUser.name}`;
            }
            if (headerSosBtn) headerSosBtn.classList.remove('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.openNotificationsModal()" class="relative p-2 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 transition">
                        <span>🔔</span>
                        <span id="notif-badge" class="hidden absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                    </button>
                    <button onclick="window.app.switchUserTab('profile')" class="flex items-center gap-1.5 p-1 pl-2 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 transition">
                        <span class="text-xs font-bold text-slate-800 max-w-[80px] truncate">${currentUser.name}</span>
                        <img src="${currentUser.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" class="w-6 h-6 rounded-full object-cover border border-emerald-500" />
                    </button>
                `;
            }

            document.getElementById('nav-bar-user')?.classList.remove('hidden');
            this.switchUserTab('home');

        } else if (role === 'PROVIDER' && currentUser && isLoggedIn) {
            document.body.className = 'bg-slate-100 text-slate-900 min-h-screen provider-mode';
            if (headerRolePill) {
                headerRolePill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200';
                headerRolePill.innerText = '🏢 Host Partner';
            }
            if (headerSosBtn) headerSosBtn.classList.add('hidden');

            if (headerAuthActions) {
                headerAuthActions.innerHTML = `
                    <button onclick="window.app.openNotificationsModal()" class="relative p-2 bg-slate-100 hover:bg-slate-200 rounded-full border border-slate-200 transition">
                        <span>🔔</span>
                        <span id="notif-badge" class="hidden absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                    </button>
                    <button onclick="window.app.logout()" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition">
                        Sign Out
                    </button>
                `;
            }

            document.getElementById('nav-bar-provider')?.classList.remove('hidden');
            this.switchProviderTab('dashboard');

        } else if (role === 'ADMIN' && currentUser && isLoggedIn) {
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
                        Sign In
                    </button>
                `;
            }

            document.getElementById('nav-bar-guest')?.classList.remove('hidden');
            document.getElementById('view-landing')?.classList.remove('hidden');
        }
    }

    // ================= 2. USER TABS & EXPLORATION =================
    exploreToilets() {
        // Enforce login - User dashboard/map discovery requires login
        if (!window.auth.isLoggedIn()) {
            this.setRoleMode('GUEST');
            this.openUserLoginModal();
            this.showToast('Please sign in to find and use clean public washrooms.', 'info');
            return;
        }

        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-user-home')?.classList.remove('hidden');
        document.getElementById('nav-bar-user')?.classList.remove('hidden');
        document.getElementById('nav-bar-guest')?.classList.add('hidden');

        if (window.toigoMap) {
            window.toigoMap.init('map-view');
            setTimeout(() => {
                if (window.toigoMap.map) window.toigoMap.map.invalidateSize();
            }, 150);
        }

        if (window.userFlow) {
            window.userFlow.loadAndRenderApprovedToilets();
        }
    }

    switchUserTab(tab) {
        if (!window.auth.isLoggedIn()) {
            this.setRoleMode('GUEST');
            this.openUserLoginModal();
            return;
        }

        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('#nav-bar-user .nav-tab-item').forEach(btn => {
            if (btn.dataset.tab === tab) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (tab === 'home') {
            document.getElementById('view-user-home')?.classList.remove('hidden');
            if (window.toigoMap) {
                window.toigoMap.init('map-view');
                setTimeout(() => {
                    if (window.toigoMap.map) window.toigoMap.map.invalidateSize();
                }, 150);
            }
            if (window.userFlow) {
                window.userFlow.loadAndRenderApprovedToilets();
            }
        } else if (tab === 'reports') {
            document.getElementById('view-user-reports')?.classList.remove('hidden');
            if (window.userFlow) {
                window.userFlow.renderMyReports();
            }
        } else if (tab === 'profile') {
            document.getElementById('view-user-profile')?.classList.remove('hidden');
            this.renderUserProfile();
        }
    }

    renderUserProfile() {
        const user = window.auth.getCurrentUser();
        if (!user) return;

        const nameEl = document.getElementById('profile-user-name') || document.getElementById('profile-name-label');
        const emailEl = document.getElementById('profile-user-email') || document.getElementById('profile-email-label');
        const mobileEl = document.getElementById('profile-user-mobile');
        const genderEl = document.getElementById('profile-user-gender');
        const walletEl = document.getElementById('profile-user-wallet');
        const avatarEl = document.getElementById('profile-user-avatar');

        if (nameEl) nameEl.innerText = user.name || 'Citizen User';
        if (emailEl) emailEl.innerText = user.email || 'Verified Citizen';
        if (mobileEl) mobileEl.innerText = user.mobile ? `+91 ${user.mobile}` : (user.phone ? `+91 ${user.phone}` : 'Not set');
        if (genderEl) genderEl.innerText = user.gender || 'Not specified';
        if (walletEl) walletEl.innerText = `₹${user.walletBalance || 0}`;
        if (avatarEl) avatarEl.src = user.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
    }

    // ================= 2B. PROVIDER TABS =================
    switchProviderTab(tab) {
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('#nav-bar-provider .nav-tab-item').forEach(btn => {
            if (btn.dataset.tab === tab) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (tab === 'dashboard') {
            document.getElementById('view-provider-dashboard')?.classList.remove('hidden');
            if (window.providerFlow) {
                window.providerFlow.renderDashboard();
            }
        } else if (tab === 'add') {
            document.getElementById('view-provider-dashboard')?.classList.remove('hidden');
            if (window.providerFlow) {
                window.providerFlow.openAddToiletModal();
            }
        } else if (tab === 'account') {
            document.getElementById('view-provider-account')?.classList.remove('hidden');
            this.renderProviderAccount();
        }
    }

    renderProviderAccount() {
        const user = window.auth.getCurrentUser();
        if (!user) return;

        const nameEl = document.getElementById('prov-account-name');
        const bizEl = document.getElementById('prov-account-biz');
        const emailEl = document.getElementById('prov-account-email');
        const statusEl = document.getElementById('prov-account-status');
        const bizInput = document.getElementById('edit-prov-biz-name');
        const phoneInput = document.getElementById('edit-prov-phone');
        const upiInput = document.getElementById('edit-prov-upi');

        if (nameEl) nameEl.innerText = user.name;
        if (bizEl) bizEl.innerText = user.businessName || 'Host Sanitation Partner';
        if (emailEl) emailEl.innerText = user.email;
        if (statusEl) {
            const vStatus = user.verificationStatus || (user.verified ? 'VERIFIED' : 'PENDING');
            statusEl.innerText = vStatus;
            statusEl.className = `inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                vStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                vStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                vStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                'bg-slate-100 text-slate-700'
            }`;
        }
        if (bizInput) bizInput.value = user.businessName || '';
        if (phoneInput) phoneInput.value = user.mobile || user.phone || '';
        if (upiInput) upiInput.value = user.upiId || '';
    }

    // ================= 3. SOS EMERGENCY FEATURE =================
    async triggerEmergencySOS() {
        this.showToast('🚨 Locating nearest emergency restroom...', 'error');
        const userLoc = window.userFlow ? window.userFlow.userLocation : { lat: 28.6315, lng: 77.2167 };
        
        try {
            const res = await window.api.get('/toilets/nearby', {
                lat: userLoc.lat,
                lng: userLoc.lng,
                radiusKm: 5
            });

            const nearest = res.toilets && res.toilets.length > 0 ? res.toilets[0] : null;

            const modal = document.getElementById('sos-emergency-modal');
            if (!modal) {
                window.location.href = 'tel:112';
                return;
            }

            const content = document.getElementById('sos-modal-content');
            if (nearest) {
                content.innerHTML = `
                    <div class="space-y-4">
                        <div class="p-4 bg-red-50 border border-red-200 rounded-2xl">
                            <span class="text-xs font-bold text-red-800 uppercase">Nearest Open Washroom (${nearest.distanceKm < 1 ? Math.round(nearest.distanceKm * 1000) + ' m' : nearest.distanceKm + ' km'})</span>
                            <h4 class="font-extrabold text-slate-900 text-sm mt-1">${nearest.name}</h4>
                            <p class="text-xs text-slate-600 mt-0.5">📍 ${nearest.address}</p>
                        </div>

                        <div class="flex gap-2">
                            <button onclick="window.userFlow.startNavigationTo(${nearest.latitude}, ${nearest.longitude})" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition">
                                🧭 Navigate to Toilet
                            </button>
                            <a href="tel:112" class="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition">
                                📞 Call 112 Helpline
                            </a>
                        </div>
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div class="space-y-4">
                        <p class="text-xs text-slate-600">No public washrooms found within 5km radius. Emergency assistance is available:</p>
                        <a href="tel:112" class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition">
                            📞 Dial 112 National Emergency
                        </a>
                    </div>
                `;
            }

            modal.classList.remove('hidden');
        } catch (err) {
            this.showToast('Emergency SOS activated. Dialing 112 helpline.', 'error');
            window.location.href = 'tel:112';
        }
    }

    closeSosModal() {
        document.getElementById('sos-emergency-modal')?.classList.add('hidden');
    }

    // ================= 4. NOTIFICATIONS MODAL =================
    async openNotificationsModal() {
        const modal = document.getElementById('notifications-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        const container = document.getElementById('notifications-list-container');
        if (!container) return;

        container.innerHTML = `
            <div class="p-6 text-center">
                <div class="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        `;

        const res = await window.db.fetchNotifications();
        const list = res.notifications || [];

        if (list.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center">
                    <span class="text-3xl block mb-2">🔔</span>
                    <p class="text-xs font-bold text-slate-700">No notifications yet</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">You will receive live updates on reports and payments here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = list.map(n => `
            <div class="p-3.5 ${n.read ? 'bg-slate-50' : 'bg-emerald-50/50 border border-emerald-200/60'} rounded-2xl space-y-1">
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-xs text-slate-900">${n.title}</h4>
                    <span class="text-[10px] text-slate-400">${new Date(n.createdAt).toLocaleTimeString()}</span>
                </div>
                <p class="text-xs text-slate-600">${n.message}</p>
            </div>
        `).join('');

        await window.db.markAllNotificationsRead();
        this.updateNotificationBadge();
    }

    closeNotificationsModal() {
        document.getElementById('notifications-modal')?.classList.add('hidden');
    }

    async updateNotificationBadge() {
        if (!window.auth.isLoggedIn()) return;
        const res = await window.db.fetchNotifications();
        const badge = document.getElementById('notif-badge');
        if (badge) {
            if (res.unreadCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    // ================= 5. PRIVACY POLICY & TERMS =================
    openPrivacyModal() {
        document.getElementById('privacy-policy-modal')?.classList.remove('hidden');
    }

    closePrivacyModal() {
        document.getElementById('privacy-policy-modal')?.classList.add('hidden');
    }

    openTermsModal() {
        document.getElementById('terms-conditions-modal')?.classList.remove('hidden');
    }

    closeTermsModal() {
        document.getElementById('terms-conditions-modal')?.classList.add('hidden');
    }

    // ================= 6. CITIZEN MOBILE NUMBER + OTP AUTHENTICATION =================

    openUserLoginModal() {
        this.closeAllModals();
        const modal = document.getElementById('user-login-modal');
        if (!modal) return;

        // Reset steps
        document.getElementById('citizen-auth-step-mobile')?.classList.remove('hidden');
        document.getElementById('citizen-auth-step-otp')?.classList.add('hidden');
        document.getElementById('citizen-auth-step-profile')?.classList.add('hidden');

        // Clear errors
        this.clearCitizenAuthError();

        // Update mode badge
        this.updateAuthModeUI();

        // Focus mobile input
        const mobileInput = document.getElementById('citizen-mobile-input');
        if (mobileInput && !mobileInput.value) {
            mobileInput.value = '9876543210';
            this.handleMobileInput(mobileInput);
        }

        modal.classList.remove('hidden');
    }

    openUserRegisterModal() {
        this.openUserLoginModal();
    }

    toggleAuthMode() {
        this.authMode = this.authMode === 'TEST' ? 'PROD' : 'TEST';
        this.updateAuthModeUI();
        this.showToast(
            this.authMode === 'TEST'
                ? 'Switched to Demo / Test OTP Mode (College Presentation) 🧪'
                : 'Switched to Production Firebase Phone Auth Mode 🚀',
            'info'
        );
    }

    updateAuthModeUI() {
        const badge = document.getElementById('citizen-auth-mode-badge');
        const toggleText = document.getElementById('toggle-auth-mode-text');
        const toggleIcon = document.getElementById('toggle-auth-mode-icon');
        const demoBox = document.getElementById('citizen-demo-accounts-box');

        if (this.authMode === 'TEST') {
            if (badge) {
                badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200';
                badge.innerText = '🧪 Test Mode';
            }
            if (toggleText) toggleText.innerText = 'Switch to Prod';
            if (toggleIcon) toggleIcon.innerText = '⚡';
            if (demoBox) demoBox.classList.remove('hidden');
        } else {
            if (badge) {
                badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200';
                badge.innerText = '🚀 Production Mode';
            }
            if (toggleText) toggleText.innerText = 'Switch to Test';
            if (toggleIcon) toggleIcon.innerText = '🧪';
            if (demoBox) demoBox.classList.add('hidden');
        }
    }

    handleMobileInput(inputEl) {
        if (!inputEl) return;
        inputEl.value = inputEl.value.replace(/\D/g, '').slice(0, 10);
        const validIcon = document.getElementById('citizen-mobile-valid-icon');
        const isValid = /^[6-9]\d{9}$/.test(inputEl.value);

        if (validIcon) {
            if (isValid) validIcon.classList.remove('hidden');
            else validIcon.classList.add('hidden');
        }

        this.clearCitizenAuthError();
    }

    quickFillTestAccount(mobile) {
        const input = document.getElementById('citizen-mobile-input');
        if (input) {
            input.value = mobile;
            this.handleMobileInput(input);
        }
        this.submitCitizenSendOtp();
    }

    async submitCitizenSendOtp() {
        const mobileInput = document.getElementById('citizen-mobile-input');
        const rawMobile = mobileInput ? mobileInput.value.trim() : '';
        const cleanDigits = rawMobile.replace(/\D/g, '').slice(-10);

        if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
            this.showCitizenAuthError('Please enter a valid 10-digit Indian mobile number.', 'Indian numbers start with 6, 7, 8, or 9.');
            return;
        }

        const sendBtn = document.getElementById('btn-send-citizen-otp');
        const btnLabel = document.getElementById('btn-send-otp-label');
        if (sendBtn) sendBtn.disabled = true;
        if (btnLabel) btnLabel.innerHTML = '<span class="inline-block animate-spin mr-1">⌛</span> Sending OTP...';

        this.clearCitizenAuthError();

        const res = await window.auth.sendMobileOtp(cleanDigits, this.authMode);

        if (sendBtn) sendBtn.disabled = false;
        if (btnLabel) btnLabel.innerText = 'Get Verification Code (OTP) →';

        if (res.success) {
            this.citizenMobile = cleanDigits;

            // Update Target Phone label in Step 2
            const phoneEl = document.getElementById('citizen-otp-target-phone');
            if (phoneEl) {
                phoneEl.innerText = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
            }

            // Setup Demo Helper Banner if available
            const helperBox = document.getElementById('citizen-test-otp-helper');
            const helperCode = document.getElementById('citizen-test-otp-code');
            if (res.testAccount && res.testAccount.testOtp) {
                if (helperBox) helperBox.classList.remove('hidden');
                if (helperCode) helperCode.innerText = res.testAccount.testOtp;
            } else if (res.mode === 'TEST') {
                if (helperBox) helperBox.classList.remove('hidden');
                if (helperCode) helperCode.innerText = 'Check Server Log (Terminal)';
            } else {
                if (helperBox) helperBox.classList.add('hidden');
            }

            // Advance to Step 2
            document.getElementById('citizen-auth-step-mobile')?.classList.add('hidden');
            document.getElementById('citizen-auth-step-otp')?.classList.remove('hidden');

            // Reset OTP input and verify button
            const otpInput = document.getElementById('citizen-otp-input');
            if (otpInput) {
                otpInput.value = '';
                otpInput.focus();
            }
            const verifyBtn = document.getElementById('btn-verify-citizen-otp');
            if (verifyBtn) verifyBtn.disabled = true;

            // Start 45s countdown timer
            this.startOtpCountdown(res.cooldownSeconds || 45);

            this.showToast(res.message || `Verification code sent to +91 ${cleanDigits}`, 'success');
        } else {
            this.showCitizenAuthError(res.message || 'Failed to dispatch OTP. Please try again.');
            this.showToast(res.message || 'Failed to dispatch OTP', 'error');
        }
    }

    editCitizenMobileNumber() {
        if (this.citizenOtpTimerInterval) {
            clearInterval(this.citizenOtpTimerInterval);
            this.citizenOtpTimerInterval = null;
        }
        this.clearCitizenAuthError();
        document.getElementById('citizen-auth-step-otp')?.classList.add('hidden');
        document.getElementById('citizen-auth-step-mobile')?.classList.remove('hidden');
        document.getElementById('citizen-mobile-input')?.focus();
    }

    handleOtpInput(inputEl) {
        if (!inputEl) return;
        inputEl.value = inputEl.value.replace(/\D/g, '').slice(0, 6);
        const verifyBtn = document.getElementById('btn-verify-citizen-otp');
        if (verifyBtn) {
            verifyBtn.disabled = inputEl.value.length !== 6;
        }
        this.clearCitizenAuthError();

        // Auto submit when 6 digits are typed
        if (inputEl.value.length === 6) {
            this.submitCitizenVerifyOtp();
        }
    }

    autoFillTestOtp() {
        const helperCode = document.getElementById('citizen-test-otp-code');
        const code = (helperCode ? helperCode.innerText.trim() : '') || '123456';
        const cleanCode = code.replace(/\D/g, '').slice(0, 6);
        const input = document.getElementById('citizen-otp-input');
        if (input) {
            input.value = cleanCode || '123456';
            this.handleOtpInput(input);
        }
    }

    async submitCitizenVerifyOtp() {
        const otpInput = document.getElementById('citizen-otp-input');
        const code = otpInput ? otpInput.value.trim() : '';

        if (!code || code.length !== 6) {
            this.showCitizenAuthError('Please enter the complete 6-digit OTP code.');
            return;
        }

        const verifyBtn = document.getElementById('btn-verify-citizen-otp');
        const btnLabel = document.getElementById('btn-verify-otp-label');
        if (verifyBtn) verifyBtn.disabled = true;
        if (btnLabel) btnLabel.innerHTML = '<span class="inline-block animate-spin mr-1">⌛</span> Verifying OTP...';

        this.clearCitizenAuthError();

        const res = await window.auth.verifyMobileOtp(this.citizenMobile, code, this.authMode);

        if (verifyBtn) verifyBtn.disabled = false;
        if (btnLabel) btnLabel.innerText = 'Verify & Continue →';

        if (res.success) {
            if (this.citizenOtpTimerInterval) {
                clearInterval(this.citizenOtpTimerInterval);
                this.citizenOtpTimerInterval = null;
            }

            if (res.profileComplete) {
                // Existing user with complete profile -> go directly to Home!
                this.closeAllModals();
                this.setRoleMode('USER');
                this.showToast(res.message || `Welcome back, ${res.user ? res.user.name : 'Citizen'}!`, 'success');
            } else {
                // Incomplete profile -> advance to Step 3
                document.getElementById('citizen-auth-step-otp')?.classList.add('hidden');
                document.getElementById('citizen-auth-step-profile')?.classList.remove('hidden');

                const phoneBadge = document.getElementById('citizen-profile-phone-badge');
                if (phoneBadge) {
                    phoneBadge.innerText = `+91 ${this.citizenMobile} ✅`;
                }

                const nameInput = document.getElementById('citizen-profile-name-input');
                if (nameInput) {
                    nameInput.value = (res.user && res.user.name && !res.user.name.startsWith('Citizen ')) ? res.user.name : '';
                    nameInput.focus();
                }

                this.selectCitizenGender(res.user?.gender || 'Male');
                this.showToast('Mobile verified! Please set your name and gender.', 'info');
            }
        } else {
            this.showCitizenAuthError(res.message || 'Invalid or expired verification code.');
            this.showToast(res.message || 'OTP verification failed.', 'error');
            if (otpInput) {
                otpInput.value = '';
                if (verifyBtn) verifyBtn.disabled = true;
                otpInput.focus();
            }
        }
    }

    startOtpCountdown(seconds = 45) {
        if (this.citizenOtpTimerInterval) {
            clearInterval(this.citizenOtpTimerInterval);
        }
        this.citizenOtpSecondsLeft = seconds;
        const timerEl = document.getElementById('citizen-resend-seconds');
        const countdownBox = document.getElementById('citizen-resend-countdown-box');
        const resendBtn = document.getElementById('btn-resend-citizen-otp');

        if (resendBtn) resendBtn.disabled = true;
        if (countdownBox) countdownBox.classList.remove('hidden');
        if (timerEl) timerEl.innerText = this.citizenOtpSecondsLeft;

        this.citizenOtpTimerInterval = setInterval(() => {
            this.citizenOtpSecondsLeft -= 1;
            if (timerEl) timerEl.innerText = this.citizenOtpSecondsLeft;

            if (this.citizenOtpSecondsLeft <= 0) {
                clearInterval(this.citizenOtpTimerInterval);
                this.citizenOtpTimerInterval = null;
                if (resendBtn) resendBtn.disabled = false;
                if (countdownBox) countdownBox.classList.add('hidden');
            }
        }, 1000);
    }

    async submitCitizenResendOtp() {
        if (!this.citizenMobile) {
            this.editCitizenMobileNumber();
            return;
        }

        const resendBtn = document.getElementById('btn-resend-citizen-otp');
        if (resendBtn) resendBtn.disabled = true;

        this.showToast('Requesting fresh OTP code...', 'info');
        const res = await window.auth.sendMobileOtp(this.citizenMobile, this.authMode);

        if (res.success) {
            this.startOtpCountdown(res.cooldownSeconds || 45);
            this.clearCitizenAuthError();
            this.showToast(res.message || 'Fresh OTP dispatched successfully!', 'success');
        } else {
            if (resendBtn) resendBtn.disabled = false;
            this.showCitizenAuthError(res.message || 'Failed to resend OTP.');
            this.showToast(res.message || 'Resend failed.', 'error');
        }
    }

    selectCitizenGender(gender) {
        this.selectedCitizenGender = gender;
        ['Male', 'Female', 'Other'].forEach(g => {
            const btn = document.getElementById(`gender-btn-${g}`);
            if (!btn) return;
            if (g === gender) {
                btn.className = 'gender-select-btn py-2.5 px-3 bg-white border-2 border-emerald-500 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition';
            } else {
                btn.className = 'gender-select-btn py-2.5 px-3 bg-slate-50 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-white transition';
            }
        });
        const hiddenInput = document.getElementById('citizen-profile-gender-val');
        if (hiddenInput) hiddenInput.value = gender;
    }

    async submitCitizenCompleteProfile() {
        const nameInput = document.getElementById('citizen-profile-name-input');
        const name = nameInput ? nameInput.value.trim() : '';
        const gender = this.selectedCitizenGender || 'Male';

        if (!name || name.length < 2) {
            this.showCitizenAuthError('Please enter your full name (at least 2 characters).');
            if (nameInput) nameInput.focus();
            return;
        }

        const submitBtn = document.getElementById('btn-complete-citizen-profile');
        const btnLabel = document.getElementById('btn-complete-profile-label');
        if (submitBtn) submitBtn.disabled = true;
        if (btnLabel) btnLabel.innerHTML = '<span class="inline-block animate-spin mr-1">⌛</span> Saving Profile...';

        this.clearCitizenAuthError();

        const res = await window.auth.completeMobileProfile(name, gender);

        if (submitBtn) submitBtn.disabled = false;
        if (btnLabel) btnLabel.innerText = 'Complete Profile & Enter TOIGO 🚀';

        if (res.success) {
            this.closeAllModals();
            this.setRoleMode('USER');
            this.showToast(`Welcome to TOIGO, ${name}! Your profile is ready.`, 'success');
        } else {
            this.showCitizenAuthError(res.message || 'Failed to save profile. Please try again.');
            this.showToast(res.message || 'Profile update failed.', 'error');
        }
    }

    showCitizenAuthError(text, subtext = '') {
        const banner = document.getElementById('citizen-auth-error-banner');
        const textEl = document.getElementById('citizen-auth-error-text');
        const subtextEl = document.getElementById('citizen-auth-error-subtext');
        if (banner) {
            banner.className = 'p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold flex items-start gap-2 animate-shake';
            banner.classList.remove('hidden');
        }
        if (textEl) textEl.innerText = text;
        if (subtextEl) {
            subtextEl.innerText = subtext;
            if (subtext) subtextEl.classList.remove('hidden');
            else subtextEl.classList.add('hidden');
        }
    }

    clearCitizenAuthError() {
        const banner = document.getElementById('citizen-auth-error-banner');
        if (banner) banner.classList.add('hidden');
    }

    // Legacy method maintained for backward compatibility
    async submitUserLogin(e) {
        this.openUserLoginModal();
    }

    openProviderAuthModal(mode = 'login') {
        this.closeAllModals();
        const modal = document.getElementById('provider-auth-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        const loginTab = document.getElementById('tab-prov-mode-login');
        const regTab = document.getElementById('tab-prov-mode-register');
        const loginForm = document.getElementById('prov-login-form');
        const regForm = document.getElementById('prov-register-form');

        if (mode === 'register') {
            loginTab?.classList.replace('bg-indigo-600', 'text-slate-600');
            loginTab?.classList.remove('text-white', 'shadow-xs');
            regTab?.classList.add('bg-indigo-600', 'text-white', 'shadow-xs');
            regTab?.classList.remove('text-slate-600');
            loginForm?.classList.add('hidden');
            regForm?.classList.remove('hidden');
        } else {
            regTab?.classList.replace('bg-indigo-600', 'text-slate-600');
            regTab?.classList.remove('text-white', 'shadow-xs');
            loginTab?.classList.add('bg-indigo-600', 'text-white', 'shadow-xs');
            loginTab?.classList.remove('text-slate-600');
            regForm?.classList.add('hidden');
            loginForm?.classList.remove('hidden');

            // Auto-fill saved credentials from localStorage
            const savedEmail = localStorage.getItem('TOIGO_HOST_LOGIN_IDENTIFIER');
            const savedPass = localStorage.getItem('TOIGO_HOST_LOGIN_PASSWORD');
            const emailInput = document.getElementById('prov-login-email');
            const passInput = document.getElementById('prov-login-pass');
            if (emailInput && savedEmail && !emailInput.value) {
                emailInput.value = savedEmail;
            }
            if (passInput && savedPass && !passInput.value) {
                passInput.value = savedPass;
            }
        }
    }

    openAdminLoginModal() {
        this.closeAllModals();
        document.getElementById('admin-login-modal')?.classList.remove('hidden');
    }

    openGoogleSignInPicker() {
        this.closeAllModals();
        document.getElementById('google-picker-modal')?.classList.remove('hidden');
    }

    openEmailVerificationModal(targetEmail = null, code = null) {
        this.closeAllModals();
        const modal = document.getElementById('email-verification-modal');
        if (!modal) return;

        if (targetEmail) {
            const emailEl = document.getElementById('verify-target-email');
            if (emailEl) emailEl.innerText = targetEmail;
        }
        if (code) {
            const input = document.getElementById('verify-code-input');
            if (input) input.value = code;
        }
        modal.classList.remove('hidden');
    }

    closeAllModals() {
        document.querySelectorAll('.app-modal').forEach(m => m.classList.add('hidden'));
    }

    // 6A. CITIZEN USER LOGIN SUBMIT (Direct Email or Mobile Number)
    async submitUserLogin(e) {
        if (e && e.preventDefault) e.preventDefault();
        const email = document.getElementById('user-login-email')?.value.trim();
        const password = document.getElementById('user-login-pass')?.value || 'toigo123';

        if (!email) {
            this.showToast('Please enter your email or 10-digit mobile number.', 'error');
            return;
        }

        this.showToast('Signing in to TOIGO...', 'info');
        const res = await window.auth.loginUser(email, password, 'USER');

        if (res.requireVerification) {
            this.openEmailVerificationModal(email, res.verificationCode || res.devOtp || '123456');
            this.showToast('Please enter the verification code sent to your email.', 'info');
            return;
        }

        if (res.success) {
            this.closeAllModals();
            this.setRoleMode('USER');
            this.showToast(`Welcome, ${res.user ? res.user.name : 'Citizen'}!`, 'success');
        } else {
            this.showToast(res.message || 'Login failed. Please check credentials.', 'error');
        }
    }

    // 6B. CITIZEN USER REGISTER SUBMIT
    async submitUserRegister(e) {
        if (e && e.preventDefault) e.preventDefault();
        const name = document.getElementById('reg-user-name')?.value.trim();
        const email = document.getElementById('reg-user-email')?.value.trim();
        const password = document.getElementById('reg-user-pass')?.value;
        const confirmPassword = document.getElementById('reg-user-pass-confirm')?.value;
        const mobile = document.getElementById('reg-user-mobile')?.value.trim();

        if (!name || !email || !password) {
            this.showToast('Please fill all required fields.', 'error');
            return;
        }

        this.showToast('Creating your citizen account...', 'info');
        const res = await window.auth.registerUser({
            name,
            email,
            password,
            confirmPassword,
            mobile,
            role: 'USER'
        });

        if (res.success) {
            this.openEmailVerificationModal(email, res.verificationCode);
            this.showToast('Account created! Enter the 6-digit code to verify.', 'success');
        } else {
            this.showToast(res.message || 'Registration failed.', 'error');
        }
    }

    // 6C. EMAIL VERIFICATION SUBMIT
    async submitEmailVerification() {
        const code = document.getElementById('verify-code-input')?.value.trim();
        if (!code) {
            this.showToast('Please enter the 6-digit verification code.', 'error');
            return;
        }

        this.showToast('Verifying code with server...', 'info');
        const res = await window.auth.verifyEmail(code);

        if (res.success) {
            this.closeAllModals();
            this.setRoleMode(window.auth.getUserRole());
            this.showToast('Email verified successfully! Welcome to TOIGO.', 'success');
        } else {
            this.showToast(res.message || 'Invalid verification code.', 'error');
        }
    }

    async resendVerificationEmail() {
        const targetEmail = document.getElementById('verify-target-email')?.innerText;
        this.showToast('Sending new verification code...', 'info');
        const res = await window.auth.resendOtp(targetEmail);
        if (res.success) {
            this.showToast('New verification code sent to your email!', 'success');
            if (res.verificationCode) {
                const input = document.getElementById('verify-code-input');
                if (input) input.value = res.verificationCode;
            }
        } else {
            this.showToast(res.message || 'Failed to resend code.', 'error');
        }
    }

    // 6D. GOOGLE ACCOUNT SELECTOR
    async selectGoogleAccount(name, email, profileImage) {
        this.showToast('Signing in with Google...', 'info');
        const res = await window.auth.loginWithGoogle({
            name,
            email,
            profileImage
        });

        if (res.success) {
            this.closeAllModals();
            this.setRoleMode('USER');
            this.showToast(`Signed in as ${name}!`, 'success');
        } else {
            this.showToast(res.message || 'Google Sign-In failed.', 'error');
        }
    }

    quickFillProviderLogin() {
        const emailEl = document.getElementById('prov-login-email');
        const passEl = document.getElementById('prov-login-pass');
        if (emailEl) emailEl.value = 'provider1@example.com';
        if (passEl) passEl.value = 'password123';
        this.showToast('Demo Host credentials filled! Click "Host Dashboard Sign In".', 'info');
    }

    // 6E. HOST / PROVIDER LOGIN SUBMIT
    async submitProviderLogin(e) {
        if (e && e.preventDefault) e.preventDefault();
        const email = document.getElementById('prov-login-email')?.value?.trim();
        const password = document.getElementById('prov-login-pass')?.value?.trim();

        if (!email || !password) {
            this.showToast('Please enter your host email/mobile and password.', 'error');
            return;
        }

        // Save host login details in localStorage
        const rememberMe = document.getElementById('prov-remember-me')?.checked !== false;
        if (rememberMe) {
            localStorage.setItem('TOIGO_HOST_LOGIN_IDENTIFIER', email);
            localStorage.setItem('TOIGO_HOST_LOGIN_PASSWORD', password);
        }

        this.showToast('Signing in to Host Dashboard...', 'info');
        const res = await window.auth.loginUser(email, password, 'PROVIDER');

        if (res.requireVerification) {
            if (window.providerFlow) {
                window.providerFlow.openProviderEmailVerificationModal(email, null, res.userId, res.verificationCode);
            }
            this.showToast('Please verify your host email to continue.', 'info');
            return;
        }

        if (res.requireMobileVerification) {
            if (window.providerFlow) {
                window.providerFlow.openProviderEmailVerificationModal(email, res.mobile, res.userId);
                document.getElementById('prov-email-verify-modal')?.classList.add('hidden');
                const mobileModal = document.getElementById('prov-mobile-otp-modal');
                if (mobileModal) {
                    const phoneEl = document.getElementById('prov-verify-target-phone');
                    if (phoneEl) phoneEl.innerText = `+91 ${res.mobile || ''}`;
                    mobileModal.classList.remove('hidden');
                }
            }
            this.showToast('Please complete mobile OTP verification to continue.', 'info');
            return;
        }

        if (res.success) {
            this.closeAllModals();
            this.setRoleMode('PROVIDER');
            this.showToast(`Welcome to Host Control Center, ${res.user?.name || 'Partner'}!`, 'success');
        } else {
            this.showToast(res.message || 'Host login failed. Please check your credentials.', 'error');
        }
    }

    // 6F. HOST / PROVIDER REGISTER SUBMIT
    async submitProviderRegister(e) {
        if (e && e.preventDefault) e.preventDefault();
        const name = document.getElementById('prov-reg-name')?.value.trim();
        const email = document.getElementById('prov-reg-email')?.value.trim();
        const mobile = document.getElementById('prov-reg-phone')?.value.trim();
        const password = document.getElementById('prov-reg-pass')?.value;
        const confirmPassword = document.getElementById('prov-reg-pass-confirm')?.value;
        const businessName = document.getElementById('prov-reg-biz')?.value.trim();

        if (!name || !email || !mobile || !password) {
            this.showToast('Please fill all required fields.', 'error');
            return;
        }

        // Pre-save host credentials in localStorage
        localStorage.setItem('TOIGO_HOST_LOGIN_IDENTIFIER', email);
        if (password) {
            localStorage.setItem('TOIGO_HOST_LOGIN_PASSWORD', password);
        }

        this.showToast('Registering Host Partner account...', 'info');
        const res = await window.auth.registerUser({
            name,
            email,
            mobile,
            password,
            confirmPassword,
            businessName,
            role: 'PROVIDER'
        });

        if (res.success || res.requireVerification) {
            if (window.providerFlow) {
                window.providerFlow.openProviderEmailVerificationModal(email, mobile, res.userId, res.verificationCode);
            }
            this.showToast('Host account registered! Please verify email.', 'success');
        } else {
            if (res.message && res.message.toLowerCase().includes('already registered')) {
                this.showToast(res.message, 'info');
                setTimeout(() => {
                    this.openProviderAuthModal('login');
                    const loginEmailInput = document.getElementById('prov-login-email');
                    if (loginEmailInput) loginEmailInput.value = email;
                    const loginPassInput = document.getElementById('prov-login-pass');
                    if (loginPassInput && password) loginPassInput.value = password;
                }, 1200);
            } else {
                this.showToast(res.message || 'Registration failed.', 'error');
            }
        }
    }

    // 6G. ADMIN LOGIN SUBMIT
    async submitAdminLogin(e) {
        if (e && e.preventDefault) e.preventDefault();
        const email = document.getElementById('admin-login-email')?.value.trim();
        const password = document.getElementById('admin-login-pass')?.value;

        this.showToast('Authenticating Administrator Master...', 'info');
        const res = await window.auth.loginUser(email, password, 'ADMIN');

        if (res.success) {
            this.closeAllModals();
            this.setRoleMode('ADMIN');
            this.showToast('Welcome to Super Admin Master Terminal!', 'success');
        } else {
            this.showToast(res.message || 'Admin authentication failed.', 'error');
        }
    }

    async logout() {
        await window.auth.logout();
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('app-toast');
        if (!toast) return;

        toast.innerText = message;
        toast.className = `fixed top-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-2xl z-[9999] transition duration-300 pointer-events-none ${
            type === 'success' ? 'bg-emerald-600 border border-emerald-400' :
            type === 'error' ? 'bg-red-600 border border-red-400' : 'bg-slate-900 border border-slate-700'
        }`;

        toast.classList.remove('hidden', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3200);
    }
}

window.app = new ToigoMasterApp();

document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
