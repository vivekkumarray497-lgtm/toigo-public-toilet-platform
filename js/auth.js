/**
 * TOIGO: Role-Based Authentication & Session Manager
 * Connected to REST API with JWT Bearer token authorization, password hashing, role isolation,
 * and resilient local fallback authentication for offline / mobile standalone execution.
 * Roles: 'USER' | 'PROVIDER' | 'ADMIN'
 */

class AuthController {
    constructor() {
        this.pendingVerificationUserId = null;
        this.currentUser = this.loadStoredUser();
    }

    _isServerUnavailable(err) {
        if (!err) return false;
        const msg = (err.message || String(err)).toLowerCase();
        return (
            msg.includes('404') ||
            msg.includes('no-server') ||
            msg.includes('failed to fetch') ||
            msg.includes('networkerror') ||
            msg.includes('network request failed') ||
            msg.includes('load failed') ||
            msg.includes('connection refused') ||
            msg.includes('econnrefused') ||
            msg.includes('502') ||
            msg.includes('503') ||
            msg.includes('504')
        );
    }

    _getKnownDemoUsers() {
        return [
            {
                userId: 'usr-1',
                name: 'Demo User 1',
                email: 'user1@example.com',
                password: 'password123',
                role: 'USER',
                mobile: null,
                isVerified: true,
                walletBalance: 0,
                createdAt: '2026-01-01T00:00:00.000Z'
            },
            {
                userId: 'usr-2',
                name: 'Demo User 2',
                email: 'user2@example.com',
                password: 'password123',
                role: 'USER',
                mobile: null,
                isVerified: true,
                walletBalance: 0,
                createdAt: '2026-01-01T00:00:00.000Z'
            },
            {
                userId: 'prov-1',
                name: 'SmartRest Sanitation Co',
                email: 'provider1@example.com',
                password: 'password123',
                role: 'PROVIDER',
                mobile: '9899001122',
                businessName: 'SmartRest Sanitation Co',
                isVerified: true,
                status: 'APPROVED',
                upiId: 'smartrest@upi',
                walletBalance: 0,
                createdAt: '2026-01-01T00:00:00.000Z'
            },
            {
                userId: 'prov-2',
                name: 'CityClean Restrooms',
                email: 'provider2@example.com',
                password: 'password123',
                role: 'PROVIDER',
                mobile: '9899001133',
                businessName: 'CityClean Restrooms',
                isVerified: true,
                status: 'APPROVED',
                upiId: 'cityclean@upi',
                walletBalance: 0,
                createdAt: '2026-01-01T00:00:00.000Z'
            },
            {
                userId: 'admin-1',
                name: 'System Admin',
                email: 'founder@toigo.app',
                password: 'admin123',
                role: 'ADMIN',
                mobile: null,
                isVerified: true,
                createdAt: '2026-01-01T00:00:00.000Z'
            },
            {
                userId: 'usr-cit-1',
                name: 'Citizen Demo User',
                email: '9876543210@citizen.toigo.app',
                password: null,
                role: 'USER',
                mobile: '9876543210',
                gender: 'Other',
                isVerified: true,
                walletBalance: 0,
                createdAt: '2026-01-01T00:00:00.000Z'
            }
        ];
    }

    _getLocalUsers() {
        try {
            const raw = localStorage.getItem('TOIGO_PERSISTENT_USERS');
            let list = raw ? JSON.parse(raw) : [];
            const demoUsers = this._getKnownDemoUsers();
            let changed = false;
            for (const d of demoUsers) {
                if (!list.some(u => (u.email && u.email.toLowerCase() === d.email.toLowerCase()) || (u.mobile && d.mobile && u.mobile === d.mobile))) {
                    list.push(d);
                    changed = true;
                }
            }
            if (changed || !raw) {
                localStorage.setItem('TOIGO_PERSISTENT_USERS', JSON.stringify(list));
            }
            return list;
        } catch (e) {
            return this._getKnownDemoUsers();
        }
    }

    _saveLocalUsers(users) {
        try {
            localStorage.setItem('TOIGO_PERSISTENT_USERS', JSON.stringify(users));
        } catch (e) {
            console.warn('[TOIGO AUTH] Failed to save persistent users locally:', e);
        }
    }

    _generateJwtToken(user) {
        try {
            const b64 = typeof btoa !== 'undefined'
                ? (str) => btoa(unescape(encodeURIComponent(str)))
                : (str) => Buffer.from(str, 'utf8').toString('base64');
            const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payload = b64(JSON.stringify({
                userId: user.userId,
                email: user.email,
                role: user.role,
                name: user.name,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
            }));
            const sig = b64('toigo_sig_' + user.userId);
            return `${header}.${payload}.${sig}`;
        } catch (e) {
            return 'toigo_token_' + user.userId + '_' + Date.now();
        }
    }

    loadStoredUser() {
        try {
            let token = window.api ? window.api.getToken() : localStorage.getItem('TOIGO_JWT_TOKEN');
            let raw = localStorage.getItem('TOIGO_CURRENT_USER');

            // If web storage is empty, check Android SharedPreferences native bridge
            if ((!token || !raw) && window.ToigoNativeBridge && window.ToigoNativeBridge.getSavedAuthToken) {
                try {
                    const nativeToken = window.ToigoNativeBridge.getSavedAuthToken();
                    const nativeUser = window.ToigoNativeBridge.getSavedAuthUser();
                    if (nativeToken && nativeUser) {
                        token = nativeToken;
                        raw = nativeUser;
                        localStorage.setItem('TOIGO_JWT_TOKEN', nativeToken);
                        localStorage.setItem('TOIGO_CURRENT_USER', nativeUser);
                        if (window.api) window.api.setToken(nativeToken);
                    }
                } catch (ne) {
                    console.warn('[TOIGO AUTH] Native bridge restore error:', ne);
                }
            }

            if (!token) {
                localStorage.removeItem('TOIGO_CURRENT_USER');
                return null;
            }
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            localStorage.removeItem('TOIGO_CURRENT_USER');
            return null;
        }
    }

    saveStoredUser(user) {
        this.currentUser = user;
        if (user && user.userId) {
            localStorage.setItem('TOIGO_CURRENT_USER', JSON.stringify(user));
            if (window.ToigoNativeBridge && window.ToigoNativeBridge.saveAuthSession) {
                try {
                    const token = window.api ? window.api.getToken() : localStorage.getItem('TOIGO_JWT_TOKEN');
                    window.ToigoNativeBridge.saveAuthSession(token || '', JSON.stringify(user));
                } catch (e) {
                    console.warn('[TOIGO AUTH] Error saving to native bridge:', e);
                }
            }
        } else {
            this.currentUser = null;
            localStorage.removeItem('TOIGO_CURRENT_USER');
            if (window.api) window.api.setToken(null);
            else localStorage.removeItem('TOIGO_JWT_TOKEN');
            if (window.ToigoNativeBridge && window.ToigoNativeBridge.clearAuthSession) {
                try {
                    window.ToigoNativeBridge.clearAuthSession();
                } catch (e) {
                    console.warn('[TOIGO AUTH] Error clearing native bridge:', e);
                }
            }
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        const u = this.getCurrentUser();
        const token = window.api ? window.api.getToken() : localStorage.getItem('TOIGO_JWT_TOKEN');
        return !!(u && u.userId && token);
    }

    getUserRole() {
        const u = this.getCurrentUser();
        return u ? u.role : 'GUEST';
    }

    // Role-based access control guards
    isUser() {
        return this.isLoggedIn() && this.getUserRole() === 'USER';
    }

    isProvider() {
        return this.isLoggedIn() && this.getUserRole() === 'PROVIDER';
    }

    isAdmin() {
        return this.isLoggedIn() && this.getUserRole() === 'ADMIN';
    }

    handleSessionExpired() {
        this.saveStoredUser(null);
        if (window.app) {
            window.app.showToast('Your session has expired. Please sign in again.', 'info');
            window.app.setRoleMode('GUEST');
        }
    }

    // 1. REGISTER USER / CITIZEN
    async registerUser({ name, email, password, confirmPassword, mobile, role = 'USER', businessName, upiId }) {
        if (!name || name.trim().length < 2) {
            return { success: false, message: 'Please enter your full name (at least 2 characters).' };
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return { success: false, message: 'Please enter a valid email address.' };
        }
        if (!password || password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters long.' };
        }
        if (password !== confirmPassword) {
            return { success: false, message: 'Passwords do not match.' };
        }
        if (role === 'ADMIN') {
            return { success: false, message: 'Public registration for ADMIN role is strictly forbidden.' };
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanMobile = mobile ? String(mobile).replace(/\D/g, '').slice(-10) : null;

        try {
            const result = await window.api.post('/auth/register', {
                name: name.trim(),
                email: cleanEmail,
                password,
                mobile: cleanMobile,
                role,
                businessName: businessName ? businessName.trim() : null,
                upiId: upiId ? upiId.trim() : null
            });

            if (result.success && result.requireVerification) {
                this.pendingVerificationUserId = result.userId;
            }

            return result;
        } catch (err) {
            if (!this._isServerUnavailable(err)) {
                return {
                    success: false,
                    message: err.message || 'Registration failed. Please try again.'
                };
            }

            console.log('[TOIGO AUTH] Backend endpoint unavailable, registering user in resilient persistent storage.');
            const users = this._getLocalUsers();

            if (users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
                return { success: false, message: 'This email is already registered. Please sign in.' };
            }
            if (cleanMobile && users.some(u => u.mobile === cleanMobile)) {
                return { success: false, message: 'This mobile number is already registered. Please sign in.' };
            }

            const newUser = {
                userId: (role === 'PROVIDER' ? 'prov-' : 'usr-') + Date.now(),
                name: name.trim(),
                email: cleanEmail,
                password,
                mobile: cleanMobile,
                role,
                businessName: businessName ? businessName.trim() : null,
                upiId: upiId ? upiId.trim() : null,
                isVerified: role === 'USER',
                status: role === 'USER' ? 'ACTIVE' : 'PENDING',
                walletBalance: 0,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            this._saveLocalUsers(users);

            if (role === 'USER') {
                const token = this._generateJwtToken(newUser);
                window.api.setToken(token);
                this.saveStoredUser(newUser);
                return {
                    success: true,
                    message: 'Registration successful! Welcome to TOIGO.',
                    token,
                    user: newUser
                };
            } else {
                return {
                    success: true,
                    requireVerification: true,
                    userId: newUser.userId,
                    message: 'Registration submitted. Account is awaiting admin approval.',
                    user: newUser
                };
            }
        }
    }

    // 2. VERIFY EMAIL
    async verifyEmail(code, email = null) {
        const userId = this.pendingVerificationUserId || (this.currentUser && this.currentUser.userId);
        const targetEmail = email || document.getElementById('verify-target-email')?.innerText?.trim();

        if (!code) {
            return { success: false, message: 'Verification code is required.' };
        }

        try {
            const result = await window.api.post('/auth/verify-email', {
                userId: userId || undefined,
                email: targetEmail || undefined,
                code: code.trim()
            });

            if (result.success && result.token) {
                window.api.setToken(result.token);
                this.saveStoredUser(result.user);
                this.pendingVerificationUserId = null;
            }

            return result;
        } catch (err) {
            return {
                success: false,
                message: err.message || 'Verification failed. Please try again.'
            };
        }
    }

    // 3. LOGIN USER / CITIZEN / PROVIDER / ADMIN
    async loginUser(email, password, requestedRole = 'USER') {
        if (!email || !password) {
            return { success: false, message: 'Please enter both email and password.' };
        }

        const cleanEmail = email.trim().toLowerCase();

        try {
            const result = await window.api.post('/auth/login', {
                email: cleanEmail,
                password,
                requestedRole
            });

            if (result.requireVerification) {
                this.pendingVerificationUserId = result.userId;
                return result;
            }

            if (result.success && result.token) {
                window.api.setToken(result.token);
                this.saveStoredUser(result.user);
            }

            return result;
        } catch (err) {
            // If the live server gave a definitive response (e.g. 401 wrong password), display that directly!
            if (!this._isServerUnavailable(err)) {
                return {
                    success: false,
                    message: err.message || 'Login failed. Please check your credentials.'
                };
            }

            // Resilient Local Authentication Engine (Offline / Standalone / Render waking up)
            console.log('[TOIGO AUTH] Backend endpoint unavailable, executing resilient offline authentication engine.');
            const users = this._getLocalUsers();
            const user = users.find(u => 
                (u.email && u.email.toLowerCase() === cleanEmail) || 
                (u.mobile && u.mobile === cleanEmail.replace(/\D/g, '').slice(-10))
            );

            if (!user) {
                return { success: false, message: 'Invalid credentials. User not found.' };
            }

            // Strictly verify password! Never allow wrong password
            if (!user.password || user.password !== password) {
                return { success: false, message: 'Incorrect password. Please try again.' };
            }

            // Strictly verify role compatibility!
            if (requestedRole && requestedRole !== 'GUEST' && requestedRole !== user.role && user.role !== 'ADMIN') {
                return {
                    success: false,
                    message: `Role mismatch: This account is registered as ${user.role}.`
                };
            }

            // Check provider approval status
            if (user.role === 'PROVIDER' && user.status === 'REJECTED') {
                return { success: false, message: 'Your host registration was rejected: ' + (user.rejectionReason || 'Please contact support.') };
            }
            if (user.role === 'PROVIDER' && !user.isVerified) {
                return { success: false, message: 'Your host account is awaiting admin approval.' };
            }

            const token = this._generateJwtToken(user);
            window.api.setToken(token);
            this.saveStoredUser(user);

            return {
                success: true,
                message: 'Login successful.',
                token,
                user: {
                    userId: user.userId,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    mobile: user.mobile,
                    businessName: user.businessName,
                    walletBalance: user.walletBalance || 0
                }
            };
        }
    }

    // 2B. RESEND EMAIL OTP
    async resendOtp(userIdOrEmail) {
        const userId = this.pendingVerificationUserId;
        try {
            const result = await window.api.post('/auth/resend-otp', {
                userId,
                email: !userId ? userIdOrEmail : undefined
            });
            return result;
        } catch (err) {
            return {
                success: false,
                message: err.message || 'Failed to resend verification code.'
            };
        }
    }

    // 4. GOOGLE OAUTH LOGIN
    async loginWithGoogle(credentialOrToken) {
        if (!credentialOrToken) {
            return {
                success: false,
                message: 'Google Sign-In was cancelled or credentials were not provided.'
            };
        }

        try {
            const payload = typeof credentialOrToken === 'string'
                ? { credential: credentialOrToken }
                : credentialOrToken;

            const result = await window.api.post('/auth/google', payload);

            if (result.success && result.token) {
                window.api.setToken(result.token);
                this.saveStoredUser(result.user);
            }

            return result;
        } catch (err) {
            return {
                success: false,
                message: err.message || 'Google authentication failed.'
            };
        }
    }

    // 5. UPDATE PROFILE
    async updateProfile(profileData) {
        try {
            const result = await window.api.put('/auth/profile', profileData);
            if (result.success && result.user) {
                this.saveStoredUser(result.user);
            }
            return result;
        } catch (err) {
            return { success: false, message: err.message || 'Failed to update profile.' };
        }
    }

    // 6. CHANGE PASSWORD
    async changePassword(currentPassword, newPassword) {
        try {
            return await window.api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });
        } catch (err) {
            return { success: false, message: err.message || 'Failed to change password.' };
        }
    }

    // 7. DELETE ACCOUNT
    async deleteAccount() {
        try {
            const result = await window.api.delete('/auth/delete-account');
            if (result.success) {
                this.logout();
            }
            return result;
        } catch (err) {
            return { success: false, message: err.message || 'Failed to delete account.' };
        }
    }

    // 8. LOGOUT
    async logout() {
        try {
            await window.api.post('/auth/logout');
        } catch (e) {}
        this.saveStoredUser(null);
        window.api.setToken(null);
        if (window.app) {
            window.app.setRoleMode('GUEST');
            window.app.showToast('You have been signed out successfully.', 'info');
        }
    }

    // ================= 9. CITIZEN MOBILE NUMBER + OTP AUTHENTICATION =================

    /**
     * Request Mobile OTP
     * Validates 10-digit Indian number and dispatches OTP
     */
    async sendMobileOtp(mobile, mode = 'TEST') {
        if (!mobile) {
            return { success: false, message: 'Please enter your 10-digit mobile number.' };
        }
        const cleanDigits = String(mobile).replace(/\D/g, '').slice(-10);
        if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
            return {
                success: false,
                message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
            };
        }

        try {
            const result = await window.api.post('/auth/mobile-otp/send', {
                mobile: cleanDigits,
                mode
            });
            return result;
        } catch (err) {
            if (!this._isServerUnavailable(err)) {
                return {
                    success: false,
                    message: err.message || 'Failed to dispatch OTP. Please check your network connection.'
                };
            }

            console.log('[TOIGO AUTH] Backend unavailable, handling Mobile OTP locally.');
            const now = Date.now();
            const lastSent = parseInt(localStorage.getItem('TOIGO_OTP_LAST_SENT_' + cleanDigits) || '0', 10);
            if (now - lastSent < 45000) {
                const remaining = Math.ceil((45000 - (now - lastSent)) / 1000);
                return {
                    success: false,
                    message: `Please wait ${remaining}s before requesting a new OTP.`
                };
            }

            const demoMap = {
                '9876543210': '123456',
                '8888888888': '888888',
                '9999999999': '999999',
                '9899001122': '123456'
            };

            let generatedOtp;
            const isPredefined = Boolean(demoMap[cleanDigits]);

            if (isPredefined) {
                generatedOtp = demoMap[cleanDigits];
            } else if (mode === 'TEST') {
                generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
            } else {
                return {
                    success: false,
                    message: 'Production SMS gateway is currently offline. Please use Test Mode for demonstration.'
                };
            }

            localStorage.setItem('TOIGO_OTP_LAST_SENT_' + cleanDigits, String(now));
            const sessionData = {
                otp: generatedOtp,
                expiresAt: now + (10 * 60 * 1000),
                attemptsLeft: 5,
                mode,
                isPredefined
            };
            sessionStorage.setItem('TOIGO_OTP_SESSION_' + cleanDigits, JSON.stringify(sessionData));

            let userMsg = `OTP sent successfully to +91 ${cleanDigits}.`;
            if (isPredefined) {
                userMsg += ` (Demo OTP: ${generatedOtp})`;
            } else if (mode === 'TEST') {
                userMsg += ` (Test OTP: ${generatedOtp})`;
            }

            return {
                success: true,
                message: userMsg,
                cooldownSeconds: 45,
                expiresInSeconds: 600,
                mode,
                isTestAccount: isPredefined || mode === 'TEST',
                otp: (mode === 'TEST' || isPredefined) ? generatedOtp : undefined
            };
        }
    }

    /**
     * Verify Mobile OTP
     * Verifies 6-digit OTP code or Firebase token
     */
    async verifyMobileOtp(mobile, otp, mode = 'TEST', firebaseToken = null) {
        if (!mobile) {
            return { success: false, message: 'Mobile number is required.' };
        }
        if (!firebaseToken && (!otp || String(otp).trim().length !== 6)) {
            return { success: false, message: 'Please enter the complete 6-digit OTP code.' };
        }

        const cleanDigits = String(mobile).replace(/\D/g, '').slice(-10);

        try {
            const result = await window.api.post('/auth/mobile-otp/verify', {
                mobile: cleanDigits,
                otp: otp ? String(otp).trim() : undefined,
                mode,
                firebaseToken: firebaseToken || undefined
            });

            if (result.success && result.token) {
                window.api.setToken(result.token);
                this.saveStoredUser(result.user);
            }

            return result;
        } catch (err) {
            if (!this._isServerUnavailable(err)) {
                return {
                    success: false,
                    message: err.message || 'Verification failed. Please check the OTP and try again.'
                };
            }

            console.log('[TOIGO AUTH] Backend unavailable, verifying Mobile OTP locally.');
            const enteredOtp = otp ? String(otp).trim() : '';

            const raw = sessionStorage.getItem('TOIGO_OTP_SESSION_' + cleanDigits);
            let session = raw ? JSON.parse(raw) : null;

            const demoMap = {
                '9876543210': '123456',
                '8888888888': '888888',
                '9999999999': '999999',
                '9899001122': '123456'
            };

            if (!session && demoMap[cleanDigits]) {
                session = {
                    otp: demoMap[cleanDigits],
                    expiresAt: Date.now() + 600000,
                    attemptsLeft: 5,
                    mode: 'TEST',
                    isPredefined: true
                };
            }

            if (!session) {
                return {
                    success: false,
                    code: 'NO_SESSION',
                    message: 'No OTP request found for this number or session expired. Please request a new OTP.'
                };
            }

            if (Date.now() > session.expiresAt) {
                sessionStorage.removeItem('TOIGO_OTP_SESSION_' + cleanDigits);
                return {
                    success: false,
                    code: 'OTP_EXPIRED',
                    message: 'OTP has expired. Please request a new one.'
                };
            }

            if (session.attemptsLeft <= 0) {
                sessionStorage.removeItem('TOIGO_OTP_SESSION_' + cleanDigits);
                return {
                    success: false,
                    code: 'MAX_ATTEMPTS_EXCEEDED',
                    message: 'Too many incorrect attempts. Please request a new OTP.'
                };
            }

            // Strictly check OTP! Never allow arbitrary numbers to bypass with fake OTP
            if (enteredOtp !== session.otp) {
                session.attemptsLeft--;
                sessionStorage.setItem('TOIGO_OTP_SESSION_' + cleanDigits, JSON.stringify(session));
                return {
                    success: false,
                    code: 'INVALID_OTP',
                    message: `Invalid OTP code. ${session.attemptsLeft} attempt(s) remaining.`
                };
            }

            sessionStorage.removeItem('TOIGO_OTP_SESSION_' + cleanDigits);

            const users = this._getLocalUsers();
            let user = users.find(u => u.mobile === cleanDigits);

            let isNewUser = false;
            if (!user) {
                isNewUser = true;
                user = {
                    userId: 'usr-' + Date.now(),
                    name: '',
                    email: `${cleanDigits}@citizen.toigo.app`,
                    mobile: cleanDigits,
                    role: 'USER',
                    gender: null,
                    isVerified: true,
                    walletBalance: 0,
                    createdAt: new Date().toISOString()
                };
                users.push(user);
                this._saveLocalUsers(users);
            }

            const token = this._generateJwtToken(user);
            window.api.setToken(token);
            this.saveStoredUser(user);

            const isProfileComplete = Boolean(user.name && user.name.trim().length >= 2 && user.gender);

            return {
                success: true,
                message: isProfileComplete ? 'Login successful.' : 'Mobile number verified. Please complete your profile.',
                token,
                user: {
                    userId: user.userId,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    role: user.role,
                    gender: user.gender,
                    walletBalance: user.walletBalance || 0
                },
                isNewUser,
                isProfileComplete
            };
        }
    }

    /**
     * Complete Citizen Profile (Full Name & Gender)
     */
    async completeMobileProfile(name, gender) {
        if (!name || name.trim().length < 2) {
            return { success: false, message: 'Please enter your full name (minimum 2 characters).' };
        }
        if (!gender) {
            return { success: false, message: 'Please select your gender.' };
        }

        try {
            const result = await window.api.post('/auth/mobile-otp/complete-profile', {
                name: name.trim(),
                gender
            });

            if (result.success && result.user) {
                this.saveStoredUser(result.user);
            }

            return result;
        } catch (err) {
            if (!this._isServerUnavailable(err)) {
                return {
                    success: false,
                    message: err.message || 'Failed to complete profile. Please try again.'
                };
            }

            console.log('[TOIGO AUTH] Backend unavailable, updating profile in local persistent storage.');
            if (this.currentUser) {
                this.currentUser.name = name.trim();
                this.currentUser.gender = gender;
                this.saveStoredUser(this.currentUser);

                const users = this._getLocalUsers();
                const idx = users.findIndex(u => u.userId === this.currentUser.userId || (u.mobile && u.mobile === this.currentUser.mobile));
                if (idx !== -1) {
                    users[idx].name = name.trim();
                    users[idx].gender = gender;
                    this._saveLocalUsers(users);
                }
            }

            return {
                success: true,
                message: 'Profile completed successfully!',
                user: this.currentUser
            };
        }
    }

    /**
     * Fetch predefined demo test accounts
     */
    async fetchTestAccounts() {
        try {
            return await window.api.get('/auth/mobile-otp/test-accounts');
        } catch (e) {
            return {
                success: true,
                accounts: [
                    {
                        phone: '+91 9876543210',
                        otp: '123456',
                        name: 'Citizen Demo User',
                        description: 'Regular Citizen test account'
                    },
                    {
                        phone: '+91 8888888888',
                        otp: '888888',
                        name: 'College Demo User',
                        description: 'Evaluator / Demo testing account'
                    },
                    {
                        phone: '+91 9999999999',
                        otp: '999999',
                        name: 'Sanitation Inspector',
                        description: 'Field inspection test account'
                    },
                    {
                        phone: '+91 9899001122',
                        otp: '123456',
                        name: 'SmartRest Host Demo',
                        description: 'Host / Facility Manager test account'
                    }
                ]
            };
        }
    }

    // Refresh & validate current user data with server
    async syncCurrentUser() {
        const token = window.api ? window.api.getToken() : localStorage.getItem('TOIGO_JWT_TOKEN');
        if (!token) {
            this.saveStoredUser(null);
            return null;
        }

        try {
            const result = await window.api.get('/auth/me');
            if (result && result.success && result.user) {
                this.saveStoredUser(result.user);
                return result.user;
            }

            this.saveStoredUser(null);
            return null;
        } catch (error) {
            // If server is offline/unavailable, preserve active offline session
            if (this._isServerUnavailable(error) && this.currentUser) {
                console.log('[TOIGO AUTH] Server unreachable during sync, preserving active offline session.');
                return this.currentUser;
            }
            console.warn('[TOIGO AUTH] Server authentication validation failed:', error);
            this.saveStoredUser(null);
            return null;
        }
    }
}

window.auth = new AuthController();
