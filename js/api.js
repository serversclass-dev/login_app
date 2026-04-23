/**
 * API Client for Main DB Server.
 * All communication with dooratre-db.hf.space goes through here.
 */

const API = (function() {
    const BASE_URL = 'https://dooratre-db.hf.space';
    const API_KEY = 'maindb_api_secret_2024';

    /**
     * Make an API request to Main DB.
     */
    async function _request(endpoint, method, body) {
        const url = BASE_URL + endpoint;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error:', endpoint, error);
            return { ok: false, error: 'فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت.' };
        }
    }

    /**
     * Check if device token is linked to a user.
     * Returns: {ok, found, username, server_num, server_url}
     */
    async function checkToken(token) {
        return await _request('/api/check-token', 'POST', { token: token });
    }

    /**
     * Look up which server a username is on.
     * Returns: {ok, found, server_num, server_url}
     */
    async function lookupUser(username) {
        return await _request('/api/lookup-user', 'POST', { username: username });
    }

    /**
     * Get the best server for a new signup.
     * Returns: {ok, server_num, server_url}
     */
    async function getBestServer() {
        return await _request('/api/get-best-server', 'POST', {});
    }

    /**
     * Check if a username already exists.
     * Returns: {ok, exists, server_num}
     */
    async function checkUsername(username) {
        return await _request('/api/check-username', 'POST', { username: username });
    }

    /**
     * Link device token to user after login.
     * Returns: {ok}
     */
    async function linkToken(username, token) {
        return await _request('/api/link-token', 'POST', {
            username: username,
            token: token,
        });
    }

    /**
     * Notify Main DB of successful login.
     * Returns: {ok}
     */
    async function loginSuccess(username, token) {
        return await _request('/api/login-success', 'POST', {
            username: username,
            token: token,
        });
    }

    return {
        checkToken: checkToken,
        lookupUser: lookupUser,
        getBestServer: getBestServer,
        checkUsername: checkUsername,
        linkToken: linkToken,
        loginSuccess: loginSuccess,
    };
})();