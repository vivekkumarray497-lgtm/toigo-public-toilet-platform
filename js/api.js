/**
 * TOIGO: Centralized REST API Service Client
 * Handles HTTP Requests, JWT Bearer Token Injection, Global Loading Indicators & Network Error Handling.
 */

class ToigoApiClient {
    constructor() {
        // Base API URL (automatically connects to backend on port 5000 regardless of whether served via 5000, Live Server 5500, or file://)
        if (window.location.origin.includes(':5000')) {
            this.baseUrl = `${window.location.origin}/api`;
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.baseUrl = `http://${window.location.hostname}:5000/api`;
        } else if (window.location.protocol === 'file:') {
            this.baseUrl = 'http://localhost:5000/api';
        } else {
            this.baseUrl = '/api';
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
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        const config = {
            ...options,
            headers: this.getHeaders(options.headers)
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // If token expired or unauthorized, clean local token
                if (response.status === 401) {
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
