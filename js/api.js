/**
 * TOIGO: Centralized REST API Service Client
 * Handles HTTP Requests, JWT Bearer Token Injection, Global Loading Indicators & Network Error Handling.
 */

class ToigoApiClient {
    constructor() {
        this.baseUrl = this.detectBaseUrl();
    }

    detectBaseUrl() {
        // 1. If running inside Android Native App Bridge, read configured backend
        if (typeof window !== 'undefined' && window.ToigoNativeBridge && typeof window.ToigoNativeBridge.getServerUrl === 'function') {
            try {
                const nativeBackend = window.ToigoNativeBridge.getServerUrl();
                if (nativeBackend && !nativeBackend.includes('localhost') && !nativeBackend.includes('10.0.2.2')) {
                    return `${nativeBackend.replace(/\/$/, '')}/api`;
                }
            } catch (e) {
                console.warn('Native bridge backend query exception:', e);
            }
        }

        // 2. If injected global native backend exists
        if (typeof window !== 'undefined' && window.__TOIGO_NATIVE_BACKEND__) {
            return `${window.__TOIGO_NATIVE_BACKEND__.replace(/\/$/, '')}/api`;
        }

        // 3. Runtime stored server URL override
        try {
            const savedServer = localStorage.getItem('TOIGO_SERVER_URL');
            if (savedServer && (savedServer.startsWith('http://') || savedServer.startsWith('https://'))) {
                return `${savedServer.replace(/\/$/, '')}/api`;
            }
        } catch (e) {}

        // 4. Environment detection for local development testing
        if (typeof window !== 'undefined' && window.location) {
            if (window.location.origin && window.location.origin.includes(':5000')) {
                return `${window.location.origin}/api`;
            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return `http://${window.location.hostname}:5000/api`;
            }
        }

        // 5. Default production backend API URL (Used on Android app & GitHub Pages)
        return 'https://toigo-sanitation-app.onrender.com/api';
    }

    getBaseUrl() {
        return this.baseUrl || this.detectBaseUrl();
    }

    setBaseUrl(newUrl) {
        if (!newUrl) return;
        let clean = newUrl.trim();
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
            clean = 'https://' + clean;
        }
        this.baseUrl = clean.endsWith('/api') ? clean : `${clean.replace(/\/$/, '')}/api`;
        try {
            localStorage.setItem('TOIGO_SERVER_URL', clean.replace(/\/api$/, ''));
        } catch (e) {}
        if (window.ToigoNativeBridge && window.ToigoNativeBridge.setServerUrl) {
            try { window.ToigoNativeBridge.setServerUrl(clean.replace(/\/api$/, '')); } catch (e) {}
        }
    }

    getToken() {
        return localStorage.getItem('TOIGO_JWT_TOKEN');
    }

    setToken(token) {
        if (token) {
            localStorage.setItem('TOIGO_JWT_TOKEN', token);
        } else {
            localStorage.removeItem('TOIGO_JWT_TOKEN');
        }
    }

    getHeaders(extraHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...extraHeaders
        };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const base = this.getBaseUrl();
        const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        const config = {
            ...options,
            headers: this.getHeaders(options.headers)
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Do NOT trigger session expired on login/registration/auth attempts
                const isAuthEndpoint = endpoint.includes('/auth/login') ||
                                       endpoint.includes('/auth/register') ||
                                       endpoint.includes('/auth/mobile-otp') ||
                                       endpoint.includes('/auth/verify-email') ||
                                       endpoint.includes('/auth/forgot-password') ||
                                       endpoint.includes('/auth/reset-password');

                if (response.status === 401 && !isAuthEndpoint) {
                    this.setToken(null);
                    if (window.auth && window.auth.isLoggedIn()) {
                        window.auth.handleSessionExpired();
                    }
                }
                const errorMsg = data.message || `Request failed with status ${response.status}`;
                const error = new Error(errorMsg);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            if (!navigator.onLine) {
                const netErr = new Error('You are currently offline. Please check your internet connection.');
                netErr.isOffline = true;
                throw netErr;
            }
            throw error;
        }
    }

    async checkHealth() {
        try {
            const res = await this.get('/health');
            return { online: res && res.status === 'OK', data: res };
        } catch (e) {
            return { online: false, error: e.message };
        }
    }

    // HTTP Convenience Methods
    get(endpoint, params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                query.append(key, val);
            }
        });
        const qs = query.toString();
        const fullEndpoint = qs ? `${endpoint}?${qs}` : endpoint;
        return this.request(fullEndpoint, { method: 'GET' });
    }

    post(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    put(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    delete(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
        });
    }
}

window.api = new ToigoApiClient();
window.apiClient = window.api;

/**
 * Global HTML Sanitizer to prevent XSS vulnerability across frontend views
 */
window.escapeHtml = function(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};
