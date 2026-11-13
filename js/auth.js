/**
 * TOIGO: Role-Based Authentication & Session Manager
 * Connected to REST API with JWT Bearer token authorization, password hashing, and role isolation.
 * Roles: 'USER' | 'PROVIDER' | 'ADMIN'
 */

class AuthController {
    constructor() {
        this.pendingVerificationUserId = null;
        this.currentUser = this.loadStoredUser();
    }

    loadStoredUser() {
        try {
            const token = window.api ? window.api.getToken() : localStorage.getItem('TOIGO_JWT_TOKEN');
            if (!token) {
                localStorage.removeItem('TOIGO_CURRENT_USER');
                return null;
            }
            const raw = localStorage.getItem('TOIGO_CURRENT_USER');
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
        } else {
            this.currentUser = null;
            localStorage.removeItem('TOIGO_CURRENT_USER');
            if (window.api) window.api.setToken(null);
            else localStorage.removeItem('TOIGO_JWT_TOKEN');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        const u = this.getCurrentUser();
        return !!(u && u.userId && window.api.getToken());
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

        try {
            const result = await window.api.post('/auth/register', {
                name: name.trim(),
                email: email.trim(),
                password,
                mobile: mobile ? mobile.trim() : null,
                role,
                businessName: businessName ? businessName.trim() : null,
                upiId: upiId ? upiId.trim() : null
            });

            if (result.success && result.requireVerification) {
                this.pendingVerificationUserId = result.userId;
            }

            return result;
        } catch (err) {
            return {
                success: false,
                message: err.message || 'Registration failed. Please check your network connection.'
            };
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

        try {
            const result = await window.api.post('/auth/login', {
                email: email.trim(),
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
            return {
                success: false,
                message: err.message || 'Login failed. Please check your credentials.'
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
            return {
                success: false,
                message: err.message || 'Failed to dispatch OTP. Please check your network connection.'
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
            return {
                success: false,
                message: err.message || 'Verification failed. Please check the OTP and try again.'
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
            return {
                success: false,
                message: err.message || 'Failed to complete profile. Please try again.'
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
            return { success: false, accounts: [] };
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
            console.warn('[TOIGO AUTH] Server authentication validation failed:', error);
            this.saveStoredUser(null);
            return null;
        }
    }
}

window.auth = new AuthController();
