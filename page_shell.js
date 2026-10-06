// ============================================================
// PageShell — shared controller for step-based lesson pages.
// Handles: header stats, progress path, step completion,
// sub-activity XP, badges, level-up overlays, toasts.
// ============================================================

import { QuestAPI, AuthError } from './api.js';
import { StateManager } from './state.js';

const LESSON_ORDER = ['html', 'css', 'design', 'journey', 'js', 'react'];

export class PageShell {
    constructor({ lessonSlug, steps = [] }) {
        this.api = new QuestAPI('');
        this.store = new StateManager(this.api, { xpPerLevel: 100 });
        this.lessonSlug = lessonSlug;
        this.steps = steps;
        this.dom = {};
    }

    // ----------------------------------------------------------------
    // Lifecycle
    // ----------------------------------------------------------------

    async start() {
        this._cacheDom();
        this._wireObservers();

        try {
            await this.store.load();
        } catch (err) {
            if (err instanceof AuthError) {
                window.location.href = '/login';
                return;
            }
            console.error('Failed to load game state:', err);
            this.toast('Could not load your progress');
        }

        this._renderPath();
        this.updateHeader();
        this._restoreCompletedSteps();
        this._maybeShowLevelBadges();
    }

    _cacheDom() {
        this.dom.xpCount     = document.getElementById('xp-count');
        this.dom.levelCount  = document.getElementById('level-count');
        this.dom.streakCount = document.getElementById('streak-count');
        this.dom.badgeCount  = document.getElementById('badge-count');
        this.dom.progressEl  = document.getElementById('step-progress');
    }

    _wireObservers() {
        this.store.subscribe((_, event) => {
            this.updateHeader();
            if (event === 'badge' || event === 'progress') {
                this._renderPath();
            }
        });
    }

    // ----------------------------------------------------------------
    // Header + progress path
    // ----------------------------------------------------------------

    updateHeader() {
        const s = this.store.state;
        if (this.dom.xpCount)     this.dom.xpCount.textContent     = s.xp;
        if (this.dom.levelCount)  this.dom.levelCount.textContent  = s.level;
        if (this.dom.streakCount) this.dom.streakCount.textContent = s.streak;
        if (this.dom.badgeCount)  this.dom.badgeCount.textContent  = s.badges.length;
    }

    _renderPath() {
        const s = this.store.state;

        document.querySelectorAll('.path-node').forEach(node => {
            const lessonId = node.dataset.lesson;
            if (!lessonId) return;

            node.classList.remove('completed', 'active', 'locked');
            const status = node.querySelector('.node-status');

            if (s.isLessonComplete(lessonId)) {
                node.classList.add('completed');
                if (status) status.textContent = '✓';
                return;
            }

            if (lessonId === this.lessonSlug) {
                node.classList.add('active');
                if (status) status.textContent = '▶';
                return;
            }

            const idx    = LESSON_ORDER.indexOf(lessonId);
            const prevId = idx > 0 ? LESSON_ORDER[idx - 1] : null;
            if (prevId && s.isLessonComplete(prevId)) {
                if (status) status.textContent = '🔓';
            } else {
                node.classList.add('locked');
                if (status) status.textContent = '🔒';
            }
        });
    }

    // ----------------------------------------------------------------
    // Step completion
    // ----------------------------------------------------------------

    get completedCount() {
        const s = this.store.state;
        return this.steps.filter(step =>
            s.isChallengeComplete(this.lessonSlug, step.slug)
        ).length;
    }

    _updateStepCounter() {
        if (!this.dom.progressEl) return;
        this.dom.progressEl.textContent = `${this.completedCount}/${this.steps.length}`;
    }

    _restoreCompletedSteps() {
        const s = this.store.state;
        for (const step of this.steps) {
            if (s.isChallengeComplete(this.lessonSlug, step.slug)) {
                this._showStepFeedback(
                    step.slug, 'success',
                    'Step Complete!',
                    'You completed this step earlier.'
                );
            }
        }
        this._updateStepCounter();
    }

    async completeStep(stepSlug) {
        const step = this.steps.find(s => s.slug === stepSlug);
        if (!step) {
            console.warn('Unknown step:', stepSlug);
            return;
        }

        const already = this.store.state.isChallengeComplete(
            this.lessonSlug, stepSlug
        );

        if (already) {
            this._showStepFeedback(
                stepSlug, 'hint',
                'Already Completed',
                "You've already finished this step."
            );
            return;
        }

        try {
            const xpRes = await this.store.awardXP({
                amount: step.xp,
                reason: `Completed ${this.lessonSlug}:${stepSlug}`,
                lessonSlug: this.lessonSlug,
                challengeSlug: stepSlug,
            });

            await this.store.completeChallenge({
                lessonSlug: this.lessonSlug,
                challengeSlug: stepSlug,
            });

            this._showStepFeedback(
                stepSlug, 'success',
                `Step Complete! +${step.xp} XP`,
                'Great progress! Keep going!'
            );

            this._updateStepCounter();
            if (xpRes.levelUp) this.showLevelUp(xpRes.newLevel);

            if (this.completedCount === this.steps.length) {
                await this._lessonComplete();
            }
        } catch (err) {
            console.error(err);
            this.toast('Could not save progress', err.message);
        }
    }

    /** Idempotent XP for sub-activities (match games, reflections). */
    async awardActivityXP(activitySlug, amount, reason) {
        if (this.store.state.isChallengeComplete(this.lessonSlug, activitySlug)) {
            return false;
        }
        try {
            const xpRes = await this.store.awardXP({
                amount,
                reason,
                lessonSlug: this.lessonSlug,
                challengeSlug: activitySlug,
            });
            await this.store.completeChallenge({
                lessonSlug: this.lessonSlug,
                challengeSlug: activitySlug,
            });
            if (xpRes.levelUp) this.showLevelUp(xpRes.newLevel);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    /** Persist free-form text (reflections) under a challenge slug. */
    async saveActivityData(activitySlug, data, xp = 0, reason = '') {
        try {
            await this.store.completeChallenge({
                lessonSlug: this.lessonSlug,
                challengeSlug: activitySlug,
                responseData: JSON.stringify(data),
            });
            if (xp > 0) {
                await this.awardActivityXP(activitySlug, xp, reason);
            }
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    _showStepFeedback(stepSlug, variant, title, detail) {
        const fb = document.getElementById(`${stepSlug}-feedback`);
        if (!fb) return;
        fb.innerHTML = `
            <div class="gamification-feedback ${variant}">
                <div class="feedback-title">${this.escape(title)}</div>
                ${detail ? `<div class="feedback-detail">${this.escape(detail)}</div>` : ''}
            </div>`;
    }

    async _lessonComplete() {
        const res = await this.store.unlockBadge(this.lessonSlug);
        if (res) this.toast(`Badge unlocked: ${res.name}`, res.description);
        this.showCongrats();
    }

    _maybeShowLevelBadges() {
        const lvl = this.store.state.level;
        if (lvl >= 5)  this._silentUnlock('level-5');
        if (lvl >= 10) this._silentUnlock('level-10');
    }

    async _silentUnlock(slug) {
        try { await this.store.unlockBadge(slug); } catch (_) {}
    }

    // ----------------------------------------------------------------
    // UI helpers
    // ----------------------------------------------------------------

    console(el, message, type = '') {
        if (!el) return;
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = message;
        el.appendChild(line);
        el.scrollTop = el.scrollHeight;
    }

    feedback(parentEl, variant, title, detail = '') {
        if (!parentEl) return;
        parentEl.innerHTML = `
            <div class="gamification-feedback ${variant}">
                <div class="feedback-title">${this.escape(title)}</div>
                ${detail ? `<div class="feedback-detail">${this.escape(detail)}</div>` : ''}
            </div>`;
    }

    toast(title, message = '') {
        const n = document.createElement('div');
        n.className = 'quest-notification';
        n.innerHTML = `
            <div class="notification-title">${this.escape(title)}</div>
            ${message ? `<div class="notification-message">${this.escape(message)}</div>` : ''}
        `;
        document.body.appendChild(n);
        setTimeout(() => {
            n.style.transition = 'opacity 0.5s ease';
            n.style.opacity = '0';
            setTimeout(() => n.remove(), 500);
        }, 4000);
    }

    showLevelUp(level) {
        const overlay = document.createElement('div');
        overlay.className = 'level-up-overlay';
        overlay.innerHTML = `
            <div class="level-up-modal">
                <span class="level-up-icon">🏆</span>
                <h2>Level ${level}!</h2>
                <p>You've reached Level ${level}! Keep coding.</p>
                <button class="btn btn-primary" data-dismiss>Continue</button>
            </div>`;
        overlay.querySelector('[data-dismiss]')
               .addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }

    showCongrats() {
        const overlay = document.createElement('div');
        overlay.className = 'level-up-overlay';
        overlay.innerHTML = `
            <div class="level-up-modal">
                <span class="level-up-icon">🎉</span>
                <h2>Lesson Complete!</h2>
                <p>You've mastered this lesson.</p>
                <button class="btn btn-primary" data-dismiss>Continue Your Quest</button>
            </div>`;
        overlay.querySelector('[data-dismiss]')
               .addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }

    escape(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }
}