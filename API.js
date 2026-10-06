export class APIError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'APIError';
        this.status = status;
    }
}

export class AuthError extends APIError {
    constructor(message = 'Not authenticated') {
        super(message, 401);
        this.name = 'AuthError';
    }
}

export class QuestAPI {
    constructor(base = '') {
        this.base = base;
    }

    async _request(method, path, body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // send the session_id cookie
        };
        if (body !== null) options.body = JSON.stringify(body);

        const res = await fetch(this.base + path, options);

        if (res.status === 401) throw new AuthError();
        if (!res.ok) {
            let detail = res.statusText;
            try { detail = (await res.json()).detail || detail; } catch (_) {}
            throw new APIError(detail, res.status);
        }
        return res.json();
    }

    // ---- endpoints ----
    getState() {
        return this._request('GET', '/api/state');
    }

    awardXP({ amount, reason, lessonSlug = null, challengeSlug = null }) {
        return this._request('POST', '/api/xp', {
            amount,
            reason,
            lesson_slug: lessonSlug,
            challenge_slug: challengeSlug,
        });
    }

    saveProgress({ lessonSlug, challengeSlug = null, completed = true,
                   score = null, responseData = null }) {
        return this._request('POST', '/api/progress', {
            lesson_slug: lessonSlug,
            challenge_slug: challengeSlug,
            completed,
            score,
            response_data: responseData,
        });
    }

    unlockBadge(slug) {
        return this._request('POST', '/api/badges/unlock', { slug });
    }

    reset() {
        return this._request('POST', '/api/reset');
    }
}