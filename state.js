export class GameState {
    constructor() {
        this.xp = 0;
        this.level = 1;
        this.streak = 0;
        this.longestStreak = 0;
        this.badges = [];            // ['html', 'level-5', ...]
        this.badgeDetails = [];      // [{slug, name, description, icon}]
        this.completedLessons = new Set();
        this.completedChallenges = new Set(); // "lesson:challenge"
        this.currentLesson = 'html';
        this.progressData = {}
    }

    static fromServer(data) {
        const s = new GameState();
        const xp = data.xp ?? {};
        s.xp            = xp.total_xp        ?? 0;
        s.level         = xp.level           ?? 1;
        s.streak        = xp.current_streak  ?? 0;
        s.longestStreak = xp.longest_streak  ?? 0;

        s.badgeDetails = data.badges ?? [];
        s.badges       = s.badgeDetails.map(b => b.slug);

        for (const p of data.progress ?? []) {
            if (!p.lesson_slug) continue;
            const key = p.challenge_slug
                ? `${p.lesson_slug}:${p.challenge_slug}`
                : p.lesson_slug;

            s.progressData[key] = {
                completed:    !!p.completed,
                score:        p.score,
                responseData: p.response_data,
            };

            if (!p.completed) continue;
            s.completedLessons.add(p.lesson_slug);
            if (p.challenge_slug) s.completedChallenges.add(key);
        }
        return s;
    }

    hasBadge(slug)          { return this.badges.includes(slug); }
    isLessonComplete(slug)  { return this.completedLessons.has(slug); }
    isChallengeComplete(lessonSlug, challengeSlug) {
        return this.completedChallenges.has(`${lessonSlug}:${challengeSlug}`);
    }
}

export class StateManager {
    constructor(api, config = { xpPerLevel: 100 }) {
        this.api = api;
        this.config = config;
        this.state = new GameState();
        this.listeners = new Set();
        this.loaded = false;
    }

    // ---- observer pattern ----
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    _notify(event) {
        for (const fn of this.listeners) fn(this.state, event);
    }

    // ---- load everything from the server ----
    async load() {
        const data = await this.api.getState();
        this.state = GameState.fromServer(data);
        this.loaded = true;
        this._notify('loaded');
        return this.state;
    }

    // ---- XP (optimistic + rollback on failure) ----
    async awardXP({ amount, reason, lessonSlug = null, challengeSlug = null }) {
        const prevXP    = this.state.xp;
        const prevLevel = this.state.level;

        this.state.xp += amount;
        const optimisticLevel =
            Math.floor(this.state.xp / this.config.xpPerLevel) + 1;
        const levelUp = optimisticLevel > this.state.level;
        this.state.level = optimisticLevel;
        this._notify('xp');

        try {
            const res = await this.api.awardXP({
                amount, reason, lessonSlug, challengeSlug,
            });
            this.state.xp    = res.total_xp;
            this.state.level = res.level;
            this._notify('xp-synced');
            return { levelUp, newLevel: res.level, totalXP: res.total_xp };
        } catch (err) {
            // rollback
            this.state.xp    = prevXP;
            this.state.level = prevLevel;
            this._notify('xp-rollback');
            throw err;
        }
    }

    // ---- progress ----
    async completeChallenge({ lessonSlug, challengeSlug, score = null,
                              responseData = null }) {
        await this.api.saveProgress({
            lessonSlug, challengeSlug, completed: true, score, responseData,
        });
        this.state.completedLessons.add(lessonSlug);
        if (challengeSlug) {
            this.state.completedChallenges.add(`${lessonSlug}:${challengeSlug}`);
        }
        this._notify('progress');
    }

    // ---- badges ----
    async unlockBadge(slug) {
        if (this.state.hasBadge(slug)) return false;

        const res = await this.api.unlockBadge(slug);
        if (res.unlocked) {
            this.state.badges.push(slug);
            this.state.badgeDetails.push({
                slug,
                name: res.name,
                description: res.description,
                icon: null,
            });
            this._notify('badge');
            return { name: res.name, description: res.description };
        }
        return false;
    }

    // ---- reset (start over) ----
    async reset() {
        await this.api.reset();
        this.state = new GameState();
        this._notify('reset');
    }
}