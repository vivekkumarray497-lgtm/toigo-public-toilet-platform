/**
 * TOIGO: Auth & Session Management
 * Role handling for User, Provider, and Founder/Admin
 */

class AuthManager {
    constructor() {
        this.currentOtp = null;
        this.pendingAuthData = null;
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

    // Step 1: Send OTP simulation
    requestOtp(authData) {
        this.pendingAuthData = authData;
        // Generate 4-digit OTP
        this.currentOtp = Math.floor(1000 + Math.random() * 9000).toString();
        
        console.log(`[TOIGO Security] OTP for ${authData.phone || authData.email}: ${this.currentOtp}`);
        
        return {
            success: true,
            otp: this.currentOtp,
            message: `OTP sent to ${authData.phone || authData.email}: ${this.currentOtp}`
        };
    }

    // Step 2: Verify OTP and finalize login/signup
    verifyOtp(enteredOtp) {
        if (!this.currentOtp || enteredOtp !== this.currentOtp) {
            // Allow master debug OTP '1234' for quick testing
            if (enteredOtp !== '1234' && enteredOtp !== this.currentOtp) {
                return { success: false, message: 'Invalid OTP. Please enter the correct code or use 1234.' };
            }
        }

        const data = this.pendingAuthData;
        if (!data) return { success: false, message: 'No authentication session found.' };

        let userObj = null;

        if (data.role === 'admin') {
            // Admin Founder Login
            userObj = window.db.data.admin;
        } else if (data.role === 'provider') {
            // Look up existing provider or create new
            let prov = window.db.findProviderByPhoneOrEmail(data.phone || data.email);
            if (!prov) {
                prov = window.db.createProvider({
                    name: data.name || 'Toilet Host',
                    email: data.email || 'host@toigo.app',
                    phone: data.phone || '9988776655',
                    businessName: data.businessName || 'Clean Restroom Hub',
                    upiId: data.upiId || 'host@okaxis'
                });
            }
            userObj = prov;
        } else {
            // Standard User
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

        return {
            success: true,
            user: userObj,
            message: `Welcome back, ${userObj.name}!`
        };
    }

    // Direct 1-Click Fast Login for quick role testing
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
