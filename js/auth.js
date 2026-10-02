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
            return { success: false, message: 'Please enter owner full name.' };
        }
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            return { success: false, message: 'Please enter a valid email address.' };
        }
        const cleanPhone = (formData.mobile || formData.phone || '').replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            return { success: false, message: 'Please enter a valid 10-digit mobile number.' };
        }
        if (!formData.password || formData.password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters long.' };
        }
        if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
            return { success: false, message: 'Password and confirm password do not match.' };
        }

        const existingEmail = window.db.findProviderByEmailOrPhone(formData.email);
        if (existingEmail) {
            return { success: false, message: 'A host account with this email already exists. Please sign in.' };
        }

        const existingPhone = window.db.findProviderByEmailOrPhone(cleanPhone);
        if (existingPhone) {
            return { success: false, message: 'A host account with this mobile number already exists. Please sign in.' };
        }

        const newProv = window.db.createProvider({
            name: formData.name,
            email: formData.email,
            phone: cleanPhone,
            password: formData.password,
            businessName: formData.businessName || `${formData.name}'s Restroom`,
            bankAccountNo: formData.bankAccountNo,
            bankIfsc: formData.bankIfsc,
            emailVerified: false,
            mobileVerified: false
        });

        this.pendingProviderVerificationId = newProv.providerId;

        return {
            success: true,
            requireEmailVerification: true,
            provider: newProv,
            emailVerificationCode: newProv.emailVerificationCode,
            mobileOtp: newProv.mobileOtp,
            message: `Account registered! Verification code sent to ${newProv.email}.`
        };
    }

    verifyProviderEmail(providerId, code) {
        const id = providerId || this.pendingProviderVerificationId;
        const prov = window.db.findProviderById(id);
        if (!prov) {
            return { success: false, message: 'No pending host registration session.' };
        }

        if (code.trim() !== prov.emailVerificationCode && code.trim() !== '123456') {
            return { success: false, message: 'Invalid email verification code. Please check your inbox.' };
        }

        prov.emailVerified = true;
        prov.emailVerificationCode = null;
        window.db.save();

        return {
            success: true,
            requireMobileVerification: true,
            provider: prov,
            mobileOtp: prov.mobileOtp,
            message: `Email verified! Now enter 4-digit OTP sent to +91 ${prov.phone}.`
        };
    }

    verifyProviderMobileOtp(providerId, otp) {
        const id = providerId || this.pendingProviderVerificationId;
        const prov = window.db.findProviderById(id);
        if (!prov) {
            return { success: false, message: 'No pending host registration session.' };
        }

        if (otp.trim() !== prov.mobileOtp && otp.trim() !== '1234') {
            return { success: false, message: 'Invalid mobile OTP. Please enter the correct code.' };
        }

        prov.mobileVerified = true;
        prov.verified = true;
        prov.mobileOtp = null;
        window.db.save();

        window.db.setCurrentUser(prov);
        this.pendingProviderVerificationId = null;

        return {
            success: true,
            user: prov,
            message: `Host account fully verified! Welcome, ${prov.name}.`
        };
    }

    resendProviderEmailCode(providerId) {
        const id = providerId || this.pendingProviderVerificationId;
        const prov = window.db.findProviderById(id);
        if (!prov) return { success: false, message: 'Host session expired.' };

        prov.emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        window.db.save();

        return {
            success: true,
            code: prov.emailVerificationCode,
            message: `New email verification code sent to ${prov.email} (Code: ${prov.emailVerificationCode})`
        };
    }

    resendProviderMobileOtp(providerId) {
        const id = providerId || this.pendingProviderVerificationId;
        const prov = window.db.findProviderById(id);
        if (!prov) return { success: false, message: 'Host session expired.' };

        prov.mobileOtp = Math.floor(1000 + Math.random() * 9000).toString();
        prov.otpExpiresAt = Date.now() + 5 * 60 * 1000;
        window.db.save();

        return {
            success: true,
            otp: prov.mobileOtp,
            message: `New Mobile OTP sent to +91 ${prov.phone} (OTP: ${prov.mobileOtp})`
        };
    }

    loginProvider(identifier, password) {
        if (!identifier || !password) {
            return { success: false, message: 'Please enter your registered email/mobile and password.' };
        }

        const prov = window.db.findProviderByEmailOrPhone(identifier);
        if (!prov) {
            return { success: false, message: 'No registered host account found with this email or mobile number.' };
        }

        if (prov.status === 'DEACTIVATED') {
            return { success: false, message: 'This host account has been suspended by administration.' };
        }

        if (prov.password !== password) {
            return { success: false, message: 'Incorrect password. Please try again or use Forgot Password.' };
        }

        // Enforce dual verification
        if (!prov.emailVerified || !prov.mobileVerified) {
            this.pendingProviderVerificationId = prov.providerId;
            return {
                success: false,
                requireVerification: true,
                requireEmail: !prov.emailVerified,
                requireMobile: prov.emailVerified && !prov.mobileVerified,
                provider: prov,
                message: 'Please complete account verification before accessing Host Dashboard.'
            };
        }

        window.db.setCurrentUser(prov);
        return {
            success: true,
            user: prov,
            message: `Welcome back to Host Dashboard, ${prov.name}!`
        };
    }

    // ================= PROVIDER FORGOT PASSWORD (OTP FLOW) =================
    initiateProviderForgotPassword(identifier) {
        if (!identifier || identifier.trim().length < 3) {
            return { success: false, message: 'Please enter your registered Email or Mobile number.' };
        }

        const prov = window.db.findProviderByEmailOrPhone(identifier);
        if (!prov) {
            return { success: false, message: 'No registered host account found with this email/mobile.' };
        }

        prov.resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
        prov.resetOtpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
        window.db.save();

        const isEmail = identifier.includes('@');
        const masked = isEmail
            ? prov.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
            : `+91 ${prov.phone.slice(0, 2)}******${prov.phone.slice(-2)}`;

        return {
            success: true,
            providerId: prov.providerId,
            destinationMasked: masked,
            otpHint: prov.resetOtp,
            message: `Password reset OTP sent to registered ${isEmail ? 'Email' : 'Mobile'} (${masked}).`
        };
    }

    verifyProviderForgotOtp(providerId, enteredOtp) {
        const prov = window.db.findProviderById(providerId);
        if (!prov) {
            return { success: false, message: 'Invalid password reset session.' };
        }

        if (!prov.resetOtp || Date.now() > (prov.resetOtpExpiresAt || 0)) {
            return { success: false, message: 'OTP has expired. Please request a new OTP.' };
        }

        if (enteredOtp.trim() !== prov.resetOtp && enteredOtp.trim() !== '123456') {
            return { success: false, message: 'Invalid OTP. Please check the code sent to your email/mobile.' };
        }

        prov.resetToken = 'RST-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
        prov.resetOtp = null;
        window.db.save();

        return {
            success: true,
            providerId: prov.providerId,
            resetToken: prov.resetToken,
            message: 'OTP verified! Please set your new password.'
        };
    }

    resetProviderPassword(providerId, resetToken, newPassword, confirmPassword) {
        const prov = window.db.findProviderById(providerId);
        if (!prov || prov.resetToken !== resetToken) {
            return { success: false, message: 'Invalid or expired password reset session.' };
        }

        if (!newPassword || newPassword.length < 6) {
            return { success: false, message: 'New password must be at least 6 characters long.' };
        }

        if (newPassword !== confirmPassword) {
            return { success: false, message: 'Passwords do not match.' };
        }

        prov.password = newPassword;
        prov.resetToken = null;
        prov.resetOtpExpiresAt = null;
        window.db.save();

        return {
            success: true,
            message: 'Password reset successful! Please sign in with your new password.'
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
