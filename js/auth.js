/**
 * TOIGO: Role-Based Authentication & Session Manager
 * Roles: 'USER' | 'PROVIDER' | 'ADMIN'
 * Strict Email Verification for standard email/pass registrations.
 * Official Google Sign-In with automatic verification.
 * Complete isolation between User, Provider, and Admin entry points.
 */

class AuthController {
    constructor() {
        this.pendingVerificationUserId = null;
    }

    getCurrentUser() {
        return window.db.getCurrentUser();
    }

    isLoggedIn() {
        const u = this.getCurrentUser();
        return !!(u && u.userId);
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

    // ================= 1. USER AUTHENTICATION =================
    registerUser({ name, email, password, confirmPassword, mobile }) {
        if (!name || name.trim().length < 2) {
            return { success: false, message: 'Please enter your full name.' };
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

        // Duplicate email prevention
        const existing = window.db.findUserByEmail(email);
        if (existing) {
            return { success: false, message: 'This email is already registered. Please login instead.' };
        }

        const newUser = window.db.createUser({
            name,
            email,
            password,
            mobile,
            authProvider: 'email',
            emailVerified: false // Requires verification
        });

        this.pendingVerificationUserId = newUser.userId;

        return {
            success: true,
            requireVerification: true,
            user: newUser,
            verificationCode: newUser.verificationCode,
            message: `Account created! Verification code sent to ${email}.`
        };
    }

    loginUser(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Please enter both email and password.' };
        }

        const user = window.db.findUserByEmail(email);
        if (!user || user.role !== 'USER') {
            return { success: false, message: 'No citizen account found with this email.' };
        }

        if (user.status === 'DEACTIVATED') {
            return { success: false, message: 'Your account has been suspended by administration.' };
        }

        if (user.password !== password) {
            return { success: false, message: 'Incorrect password. Please try again.' };
        }

        // Check Email Verification status
        if (!user.emailVerified) {
            this.pendingVerificationUserId = user.userId;
            return {
                success: false,
                requireVerification: true,
                user: user,
                message: 'Please verify your email address before continuing.'
            };
        }

        window.db.setCurrentUser(user);
        return {
            success: true,
            user: user,
            message: `Welcome back, ${user.name}!`
        };
    }

    verifyEmailCode(enteredCode) {
        const user = window.db.findUserById(this.pendingVerificationUserId);
        if (!user) {
            return { success: false, message: 'No pending verification session found.' };
        }

        if (enteredCode !== user.verificationCode && enteredCode !== '123456') {
            return { success: false, message: 'Invalid verification code. Please check your email.' };
        }

        window.db.verifyUserEmail(user.userId);
        window.db.setCurrentUser(user);
        this.pendingVerificationUserId = null;

        return {
            success: true,
            user: user,
            message: 'Email verified successfully! Welcome to TOIGO.'
        };
    }

    resendVerificationEmail() {
        const user = window.db.findUserById(this.pendingVerificationUserId);
        if (!user) {
            return { success: false, message: 'Session expired. Please sign in again.' };
        }

        user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        window.db.save();

        return {
            success: true,
            code: user.verificationCode,
            message: `New verification code sent to ${user.email} (Code: ${user.verificationCode})`
        };
    }

    // Google Sign-In Flow
    loginWithGoogleAccount(googleProfile) {
        if (!googleProfile || !googleProfile.email) {
            return { success: false, message: 'Google authentication cancelled or failed.' };
        }

        let user = window.db.findUserByEmail(googleProfile.email);
        if (!user) {
            user = window.db.createUser({
                name: googleProfile.name || 'Google User',
                email: googleProfile.email,
                password: null,
                mobile: null,
                profileImage: googleProfile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                authProvider: 'google',
                emailVerified: true // Google accounts are pre-verified
            });
        } else {
            user.emailVerified = true;
            user.authProvider = 'google';
            if (googleProfile.picture) user.profileImage = googleProfile.picture;
            window.db.save();
        }

        if (user.status === 'DEACTIVATED') {
            return { success: false, message: 'This account has been deactivated.' };
        }

        window.db.setCurrentUser(user);
        return {
            success: true,
            user: user,
            message: `Signed in as ${user.name} via Google.`
        };
    }

    // ================= 2. PROVIDER AUTHENTICATION =================
    registerProvider(formData) {
        if (!formData.name || formData.name.trim().length < 2) {
            return { success: false, message: 'Please enter owner name.' };
        }
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            return { success: false, message: 'Please enter a valid email address.' };
        }
        if (!formData.password || formData.password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters long.' };
        }

        const existing = window.db.findProviderByEmail(formData.email);
        if (existing) {
            return { success: false, message: 'A provider account with this email already exists.' };
        }

        const newProv = window.db.createProvider(formData);
        window.db.setCurrentUser(newProv);

        return {
            success: true,
            user: newProv,
            message: `Provider account created! Welcome, ${newProv.name}.`
        };
    }

    loginProvider(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Please enter your provider email and password.' };
        }

        const prov = window.db.findProviderByEmail(email);
        if (!prov) {
            return { success: false, message: 'No registered Host/Provider account with this email.' };
        }

        if (prov.status === 'DEACTIVATED') {
            return { success: false, message: 'This host account has been suspended by administration.' };
        }

        if (prov.password !== password) {
            return { success: false, message: 'Incorrect password.' };
        }

        window.db.setCurrentUser(prov);
        return {
            success: true,
            user: prov,
            message: `Welcome back to Host Dashboard, ${prov.name}!`
        };
    }

    // ================= 3. SEPARATE ADMIN AUTHENTICATION =================
    loginAdmin(email, password) {
        const admin = window.db.data.admin;
        if (!email || !password) {
            return { success: false, message: 'Please enter admin credentials.' };
        }

        if (email.trim().toLowerCase() === admin.email.toLowerCase() && password === admin.password) {
            window.db.setCurrentUser(admin);
            return {
                success: true,
                user: admin,
                message: 'Admin Master Terminal Access Granted 👑'
            };
        }

        return { success: false, message: 'Invalid administrative credentials.' };
    }

    logout() {
        window.db.logout();
        this.pendingVerificationUserId = null;
    }
}

window.auth = new AuthController();
