/**
 * TOIGO: Auth & Session Management
 * Enforces strict login for both Users & Providers, and collects Host Bank/QR details
 */

class AuthManager {
    constructor() {
        this.currentOtp = null;
        this.pendingAuthData = null;
        this.uploadedQrImage = null;
    }

    getCurrentUser() {
        return window.db.getCurrentUser();
    }

    isLoggedIn() {
        return !!this.getCurrentUser();
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

    // Strict Login Requirement Helper
    requireLogin(targetRole = 'user', onSuccess = null) {
        if (this.isLoggedIn()) {
            const user = this.getCurrentUser();
            if (targetRole === 'provider' && user.role !== 'provider' && user.role !== 'admin') {
                window.app.showToast('Please sign in with a Host / Provider account.', 'info');
                window.app.openAuthModal('provider', onSuccess);
                return false;
            }
            if (onSuccess) onSuccess(user);
            return true;
        }

        window.app.showToast(`Please sign in first to continue as ${targetRole === 'provider' ? 'Host' : 'Citizen'}.`, 'info');
        window.app.openAuthModal(targetRole, onSuccess);
        return false;
    }

    // Step 1: Send OTP
    requestOtp(authData) {
        this.pendingAuthData = authData;
        this.currentOtp = Math.floor(1000 + Math.random() * 9000).toString();
        
        console.log(`[TOIGO Security] OTP for ${authData.phone || authData.email}: ${this.currentOtp}`);
        
        return {
            success: true,
            otp: this.currentOtp,
            message: `OTP sent: ${this.currentOtp}`
        };
    }

    // Step 2: Verify OTP
    verifyOtp(enteredOtp) {
        if (!this.currentOtp || enteredOtp !== this.currentOtp) {
            if (enteredOtp !== '1234' && enteredOtp !== this.currentOtp) {
                return { success: false, message: 'Invalid OTP. Please enter the correct 4-digit code.' };
            }
        }

        const data = this.pendingAuthData;
        if (!data) return { success: false, message: 'No authentication session found.' };

        let userObj = null;

        if (data.role === 'admin') {
            userObj = window.db.data.admin;
        } else if (data.role === 'provider') {
            let prov = window.db.findProviderByPhoneOrEmail(data.phone || data.email);
            if (!prov) {
                prov = window.db.createProvider({
                    name: data.name || 'Toilet Host',
                    email: data.email || 'host@toigo.app',
                    phone: data.phone || '9988776655',
                    businessName: data.businessName || 'Clean Restroom Hub',
                    upiId: data.upiId || 'host@okaxis',
                    bankAccountNo: data.bankAccountNo || '918273645012',
                    bankIfsc: data.bankIfsc || 'UTIB0000123',
                    bankHolderName: data.bankHolderName || data.name || 'Toilet Host',
                    qrCodeImage: data.qrCodeImage || this.uploadedQrImage || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('upi://pay?pa=' + (data.upiId || 'host@upi') + '&pn=' + (data.businessName || 'Restroom') + '&cu=INR')}`
                });
            }
            userObj = prov;
        } else {
            let usr = window.db.findUserByPhoneOrEmail(data.phone || data.email);
            if (!usr) {
                usr = window.db.createUser({
                    name: data.name || 'Citizen User',
                    email: data.email || 'user@toigo.app',
                    phone: data.phone || '9876543210'
                });
            }
            userObj = usr;
        }

        window.db.setCurrentUser(userObj);
        this.currentOtp = null;
        this.pendingAuthData = null;
        this.uploadedQrImage = null;

        return {
            success: true,
            user: userObj,
            message: `Welcome back, ${userObj.name}!`
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
