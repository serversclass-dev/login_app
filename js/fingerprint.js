/**
 * Device Fingerprint Generator.
 * Creates a unique-ish device identifier using browser properties.
 * Stored in localStorage + cookie for persistence.
 *
 * This is NOT cryptographic security - it's a convenience token
 * for auto-login across visits on the same device/browser.
 */

const DeviceFingerprint = (function() {
    const STORAGE_KEY = 'sc_device_token';
    const COOKIE_NAME = 'sc_device_token';
    const COOKIE_DAYS = 365;

    /**
     * Generate a fingerprint hash from browser properties.
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

        // WebGL renderer (if available)
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
     * Simple hash function (djb2 variant).
     */
    function _hash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        // Convert to positive hex string
        return 'sc_' + (hash >>> 0).toString(16) + '_' + str.length.toString(16);
    }

    /**
     * Generate a random component to make token unique even on identical devices.
     */
    function _randomPart() {
        const arr = new Uint8Array(8);
        crypto.getRandomValues(arr);
        return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Set cookie.
     */
    function _setCookie(value) {
        const expires = new Date();
        expires.setDate(expires.getDate() + COOKIE_DAYS);
        document.cookie = `${COOKIE_NAME}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }

    /**
     * Get cookie.
     */
    function _getCookie() {
        const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
        return match ? match[2] : null;
    }

    /**
     * Get or create the device token.
     * Priority: localStorage > cookie > generate new
     */
    function getToken() {
        // Try localStorage first
        let token = null;
        try {
            token = localStorage.getItem(STORAGE_KEY);
        } catch(e) {}

        // Try cookie
        if (!token) {
            token = _getCookie();
        }

        // Generate new if none found
        if (!token) {
            const raw = _generateRawFingerprint();
            const fingerprint = _hash(raw);
            const random = _randomPart();
            token = fingerprint + '_' + random;
        }

        // Persist in both storage mechanisms
        try {
            localStorage.setItem(STORAGE_KEY, token);
        } catch(e) {}
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
        document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }

    return {
        getToken: getToken,
        clearToken: clearToken,
    };
})();