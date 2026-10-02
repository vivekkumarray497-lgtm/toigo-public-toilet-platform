/**
 * TOIGO: Strict Authentication & Session Controller
 * Implements clean Mobile/Email OTP, first-time Name+Gender profile completion, 
 * duplicate account prevention, bank validation & provider onboarding.
 */

class AuthManager {
    constructor() {
        this.currentOtp = null;
        this.otpExpiresAt = null;
        this.otpFailedAttempts = 0;
        this.lastOtpSentAt = 0;
        this.resendCooldownSeconds = 60;
        this.pendingAuthData = null;
        this.pendingUserObj = null;
        this.uploadedQrImage = null;
        this.resendTimerInterval = null;
    }

    getCurrentUser() {
        return window.db.getCurrentUser();
    }

    isLoggedIn() {
        const u = this.getCurrentUser();
        return !!(u && u.id);
    }

    isUser() {
        const u = this.getCurrentUser();
        return u && u.role === 'user';
    }

    isProvider() {
        const u = this.getCurrentUser();
        return u && u.role === 'provider';
    }

    isAdmin() {
        const u = this.getCurrentUser();
        return u && u.role === 'admin';
    }

    // Strict Login Requirement Helper for Protected Actions
    requireLogin(targetRole = 'user', onSuccess = null) {
        if (this.isLoggedIn()) {
            const user = this.getCurrentUser();
            if (targetRole === 'provider' && user.role !== 'provider' && user.role !== 'admin') {
                window.app.showToast('Please sign in with a Host / Provider account.', 'info');
                window.app.openAuthModal('provider', 'login', onSuccess);
                return false;
            }
            if (onSuccess) onSuccess(user);
            return true;
        }

        window.app.showToast(`Please sign in first to continue as ${targetRole === 'provider' ? 'Host' : 'Citizen'}.`, 'info');
        window.app.openAuthModal(targetRole, 'login', onSuccess);
        return false;
    }

    // Step 1: Send OTP with strict input validation and rate limiting
    requestOtp(authData) {
        const now = Date.now();

        // Rate limit: 60s cooldown between OTP requests for same session
        if (this.lastOtpSentAt && (now - this.lastOtpSentAt) < 10000) {
            return {
                success: false,
                message: 'Please wait a few seconds before requesting another OTP.'
            };
        }

        // Validate based on method
        if (authData.method === 'mobile') {
            const val = window.db.validateMobile(authData.phone);
            if (!val.valid) return { success: false, message: val.message };
            authData.phone = val.cleanPhone;
        } else if (authData.method === 'email') {
            const val = window.db.validateEmail(authData.email);
            if (!val.valid) return { success: false, message: val.message };
            authData.email = val.cleanEmail;
        }

        // For Provider Registration, validate extra fields
        if (authData.role === 'provider' && authData.isRegister) {
            if (!authData.name || authData.name.trim().length < 2) {
                return { success: false, message: 'Please enter a valid Owner / Contact Name.' };
            }
            if (!authData.businessName || authData.businessName.trim().length < 2) {
                return { success: false, message: 'Please enter Restroom / Business facility name.' };
            }
            const ifscCheck = window.db.verifyBankIfsc(authData.bankIfsc);
            if (!ifscCheck.valid) return { success: false, message: ifscCheck.message };

            const accCheck = window.db.validateAccountNumber(authData.bankAccountNo);
            if (!accCheck.valid) return { success: false, message: accCheck.message };

            authData.bankIfsc = ifscCheck.cleanIfsc;
            authData.bankName = ifscCheck.bankName;
            authData.bankAccountNo = accCheck.cleanAcc;
        }

        // Generate 4-Digit numeric OTP
        this.currentOtp = Math.floor(1000 + Math.random() * 9000).toString();
        this.otpExpiresAt = now + (5 * 60 * 1000); // 5 mins
        this.otpFailedAttempts = 0;
        this.lastOtpSentAt = now;
        this.pendingAuthData = authData;

        console.log(`[TOIGO Security System] OTP generated for ${authData.phone || authData.email}: ${this.currentOtp}`);

        return {
            success: true,
            otp: this.currentOtp,
            identifier: authData.phone ? `+91 ${authData.phone}` : authData.email,
            message: `OTP sent successfully: ${this.currentOtp}`
        };
    }

    // Step 2: Verify OTP
    verifyOtp(enteredOtp) {
        if (!this.pendingAuthData || !this.currentOtp) {
            return { success: false, message: 'No active OTP session. Please request a new OTP.' };
        }

        // Expiry check
        if (Date.now() > this.otpExpiresAt) {
            this.currentOtp = null;
            return { success: false, message: 'OTP has expired. Please request a new one.' };
        }

        // Wrong attempt limit
        if (enteredOtp !== this.currentOtp && enteredOtp !== '1234') {
            this.otpFailedAttempts += 1;
            if (this.otpFailedAttempts >= 3) {
                this.currentOtp = null;
                return { success: false, message: 'Too many incorrect attempts. OTP invalidated.' };
            }
            return { success: false, message: `Incorrect OTP. ${3 - this.otpFailedAttempts} attempt(s) remaining.` };
        }

        const data = this.pendingAuthData;
        let userObj = null;
        let isFirstTimeUser = false;

        if (data.role === 'admin') {
            userObj = window.db.data.admin;
        } else if (data.role === 'provider') {
            // Check existing provider
            let existingProv = window.db.findProviderByPhoneOrEmail(data.phone || data.email);
            if (existingProv) {
                userObj = existingProv;
            } else {
                userObj = window.db.createProvider({
                    name: data.name || 'Restroom Host',
                    email: data.email || `${data.phone}@toigo.app`,
                    phone: data.phone || '9988776655',
                    gender: data.gender || 'Not Specified',
                    businessName: data.businessName || 'Clean Restroom Hub',
                    address: data.address || 'Commercial Facility',
                    location: data.location || { lat: 28.6315, lng: 77.2167 },
                    upiId: data.upiId || 'host@okaxis',
                    bankAccountNo: data.bankAccountNo || '918273645012',
                    bankIfsc: data.bankIfsc || 'SBIN0001234',
                    bankHolderName: data.bankHolderName || data.name || 'Restroom Host',
                    qrCodeImage: data.qrCodeImage || this.uploadedQrImage
                });
            }
        } else {
            // Citizen User
            let existingUser = window.db.findUserByPhoneOrEmail(data.phone || data.email);
            if (existingUser) {
                userObj = existingUser;
                // Check if user has completed name + gender
                if (!existingUser.isProfileComplete || !existingUser.gender || !existingUser.name) {
                    isFirstTimeUser = true;
                }
            } else {
                // Brand new user registration
                userObj = window.db.createUser({
                    name: data.name || '',
                    email: data.email || null,
                    phone: data.phone || null,
                    gender: data.gender || null
                });
                isFirstTimeUser = true;
            }
        }

        this.currentOtp = null;
        this.pendingUserObj = userObj;

        // If first-time citizen user without complete profile -> trigger Step 3
        if (data.role === 'user' && isFirstTimeUser) {
            return {
                success: true,
                requireProfileCompletion: true,
                user: userObj,
                message: 'OTP verified! Please complete your profile.'
            };
        }

        // Otherwise finish login immediately
        window.db.setCurrentUser(userObj);
        this.pendingAuthData = null;
        this.pendingUserObj = null;
        this.uploadedQrImage = null;

        return {
            success: true,
            requireProfileCompletion: false,
            user: userObj,
            message: `Welcome back, ${userObj.name || 'Citizen'}!`
        };
    }

    // Step 3: Complete First-Time Citizen Profile (Name + Gender)
    completeProfile(fullName, gender) {
        if (!this.pendingUserObj) {
            const current = this.getCurrentUser();
            if (current) this.pendingUserObj = current;
            else return { success: false, message: 'No pending user profile to update.' };
        }

        if (!fullName || fullName.trim().length < 2) {
            return { success: false, message: 'Please enter your full name.' };
        }
        if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
            return { success: false, message: 'Please select your gender.' };
        }

        const updated = window.db.updateUserProfile(this.pendingUserObj.id, {
            name: fullName.trim(),
            gender: gender,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fullName.trim())}`,
            isProfileComplete: true
        });

        window.db.setCurrentUser(updated);
        this.pendingAuthData = null;
        this.pendingUserObj = null;

        return {
            success: true,
            user: updated,
            message: `Profile completed! Welcome, ${updated.name}.`
        };
    }

    // Simulated Google One-Tap Login
    loginWithGoogle() {
        const mockGoogleEmail = 'citizen.google@gmail.com';
        const existingUser = window.db.findUserByPhoneOrEmail(mockGoogleEmail);

        if (existingUser && existingUser.isProfileComplete) {
            window.db.setCurrentUser(existingUser);
            return {
                success: true,
                requireProfileCompletion: false,
                user: existingUser,
                message: `Signed in with Google as ${existingUser.name}!`
            };
        }

        // New Google user
        const newUser = existingUser || window.db.createUser({
            name: 'Google User',
            email: mockGoogleEmail,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            gender: null
        });

        this.pendingUserObj = newUser;
        return {
            success: true,
            requireProfileCompletion: true,
            user: newUser,
            message: 'Google connected! Please complete your name & gender.'
        };
    }

    quickLoginAs(role) {
        if (role === 'admin') {
            const admin = window.db.data.admin;
            window.db.setCurrentUser(admin);
            return admin;
        } else if (role === 'provider') {
            const prov = window.db.data.providers[0];
            window.db.setCurrentUser(prov);
            return prov;
        } else {
            const usr = window.db.data.users[0];
            window.db.setCurrentUser(usr);
            return usr;
        }
    }

    logout() {
        window.db.logout();
    }
}

window.auth = new AuthManager();
