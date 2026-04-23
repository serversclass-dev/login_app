/**
 * Device Fingerprint Generator - FIXED VERSION.
 * Token is purely based on device properties.
 * No random component = same device always gets same token.
 * Works across subdomains because it doesn't depend on localStorage.
 */

const DeviceFingerprint = (function() {
    const STORAGE_KEY = 'sc_device_token';
    const COOKIE_NAME = 'sc_device_token';
    const COOKIE_DAYS = 365;

    /**
     * Generate a fingerprint from browser properties.
     */
    function _generateRawFingerprint() {
        const components = [];

        // Screen
        components.push(screen.width + 'x' + screen.height);
        components.push(screen.colorDepth || 0);
        components.push(screen.pixelDepth || 0);

        // Timezone
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
        components.push(new Date().getTimezoneOffset());

        // Language
        components.push(navigator.language || '');
        components.push((navigator.languages || []).join(','));

        // Platform
        components.push(navigator.platform || '');
        components.push(navigator.hardwareConcurrency || 0);
        components.push(navigator.maxTouchPoints || 0);

        // User Agent
        components.push(navigator.userAgent || '');

        // WebGL renderer
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
                }
            }
        } catch(e) {
            components.push('no-webgl');
        }

        // Canvas fingerprint
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(0, 0, 200, 50);
            ctx.fillStyle = '#069';
            ctx.fillText('ServerClass FP', 2, 15);
            components.push(canvas.toDataURL().slice(-50));
        } catch(e) {
            components.push('no-canvas');
        }

        return components.join('|||');
    }

    /**
     * Strong hash function - produces longer, more unique hash.
     * Uses multiple rounds to reduce collisions.
     */
    function _hash(str) {
        // Hash 1: djb2
        let hash1 = 5381;
        for (let i = 0; i < str.length; i++) {
            hash1 = ((hash1 << 5) + hash1) + str.charCodeAt(i);
            hash1 = hash1 & hash1;
        }

        // Hash 2: sdbm
        let hash2 = 0;
        for (let i = 0; i < str.length; i++) {
            hash2 = str.charCodeAt(i) + (hash2 << 6) + (hash2 << 16) - hash2;
            hash2 = hash2 & hash2;
        }

        // Hash 3: simple sum with position
        let hash3 = 0;
        for (let i = 0; i < str.length; i++) {
            hash3 = hash3 + (str.charCodeAt(i) * (i + 1));
            hash3 = hash3 & hash3;
        }

        return 'sc_' +
            (hash1 >>> 0).toString(16).padStart(8, '0') + '_' +
            (hash2 >>> 0).toString(16).padStart(8, '0') + '_' +
            (hash3 >>> 0).toString(16).padStart(8, '0');
    }

    /**
     * Set cookie with domain that works across subdomains.
     */
    function _setCookie(value) {
        const expires = new Date();
        expires.setDate(expires.getDate() + COOKIE_DAYS);
        // Set on parent domain so all subdomains can read it
        document.cookie = COOKIE_NAME + '=' + value +
            ';expires=' + expires.toUTCString() +
            ';path=/' +
            ';domain=.smartclass.com.ly' +
            ';SameSite=Lax';
    }

    /**
     * Get cookie.
     */
    function _getCookie() {
        const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
        return match ? match[2] : null;
    }

    /**
     * Get the device token.
     * DETERMINISTIC: same device = same token, every time, on every subdomain.
     * No random component.
     */
    function getToken() {
        // Always generate the deterministic fingerprint
        const raw = _generateRawFingerprint();
        const token = _hash(raw);

        // Store in localStorage (for this subdomain's cache)
        try {
            localStorage.setItem(STORAGE_KEY, token);
        } catch(e) {}

        // Store in cookie on parent domain (shared across subdomains)
        _setCookie(token);

        return token;
    }

    /**
     * Clear the device token (for logout).
     */
    function clearToken() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch(e) {}
        // Clear on parent domain too
        document.cookie = COOKIE_NAME + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.smartclass.com.ly';
        document.cookie = COOKIE_NAME + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }

    return {
        getToken: getToken,
        clearToken: clearToken,
    };
})();
