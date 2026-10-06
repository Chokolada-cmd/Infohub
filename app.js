import { QuestAPI, AuthError } from './API.js';
import { StateManager } from './state.js';
import { CONFIG, LESSONS, BADGES } from './lesson_data.js';

class QuestApp {
    constructor() {
        this.api = new QuestAPI('');
        this.store = new StateManager(this.api, CONFIG);
        this.dom = {};
        this._editorDelegated = false;
    }

    // ----------------------------------------------------------
    // Boot
    // ----------------------------------------------------------
    async start() {
        this._cacheDom();
        this._wireObservers();
        this._wirePathNavigation();

        try {
            await this.store.load();
        } catch (err) {
            if (err instanceof AuthError) {
                window.location.href = '/login';
                return;
            }
            console.error('Failed to load game state:', err);
            this._toast('Could not load your progress. Working offline.');
        }

        // figure out current lesson
        this.store.state.currentLesson = this._firstUncompletedLesson();
        this._renderPath();
        this._loadLesson(this.store.state.currentLesson);
    }

    _cacheDom() {
        this.dom.xpCount       = document.getElementById('xp-count');
        this.dom.levelCount    = document.getElementById('level-count');
        this.dom.streakCount   = document.getElementById('streak-count');
        this.dom.badgeCount    = document.getElementById('badge-count');
        this.dom.lessonContainer = document.getElementById('lesson-container');
    }

    _wireObservers() {
        this.store.subscribe((state, event) => {
            this._updateHeader();
            if (event === 'badge' || event === 'progress') {
                this._renderPath();
            }
        });
    }

    _wirePathNavigation() {
        document.querySelectorAll('.path-node').forEach((node) => {
            node.addEventListener('click', () => {
                if (node.classList.contains('locked')) return;
                this._loadLesson(node.dataset.lesson);
            });
        });
    }

    // ----------------------------------------------------------
    // Header / path
    // ----------------------------------------------------------
    _updateHeader() {
        const s = this.store.state;
        if (this.dom.xpCount)     this.dom.xpCount.textContent     = s.xp;
        if (this.dom.levelCount)  this.dom.levelCount.textContent  = s.level;
        if (this.dom.streakCount) this.dom.streakCount.textContent = s.streak;
        if (this.dom.badgeCount)  this.dom.badgeCount.textContent  = s.badges.length;
    }

    _renderPath() {
        const s = this.store.state;
        document.querySelectorAll('.path-node').forEach((node) => {
            const lessonId = node.dataset.lesson;
            node.classList.remove('completed', 'active', 'locked');
            const status = node.querySelector('.node-status');

            if (s.isLessonComplete(lessonId)) {
                node.classList.add('completed');
                if (status) status.textContent = '✓';
                return;
            }

            if (lessonId === s.currentLesson) {
                node.classList.add('active');
                if (status) status.textContent = '▶';
                return;
            }

            const prev = this._previousLesson(lessonId);
            if (prev && s.isLessonComplete(prev)) {
                if (status) status.textContent = '🔓';
            } else {
                node.classList.add('locked');
                if (status) status.textContent = '🔒';
            }
        });
    }

    _firstUncompletedLesson() {
        const s = this.store.state;
        for (const id of Object.keys(LESSONS)) {
            if (!s.isLessonComplete(id)) return id;
        }
        return Object.keys(LESSONS)[0];
    }

    _previousLesson(lessonId) {
        const keys = Object.keys(LESSONS);
        const i = keys.indexOf(lessonId);
        return i > 0 ? keys[i - 1] : null;
    }

    // ----------------------------------------------------------
    // Lesson rendering
    // ----------------------------------------------------------
    _loadLesson(lessonId) {
        const lesson = LESSONS[lessonId];
        if (!lesson) return;
        this.store.state.currentLesson = lessonId;
        this._renderPath();
        this._renderLesson(lesson);
    }

    _renderLesson(lesson) {
        const s = this.store.state;
        const alreadyDone = s.isLessonComplete(lesson.id);

        const html = `
            <div class="lesson" id="lesson-${lesson.id}">
                <div class="lesson-header">
                    <h2>${lesson.title}<span class="lesson-badge">${lesson.badge}</span></h2>
                    <span class="lesson-xp">${lesson.xp} XP</span>
                </div>
                <div class="lesson-content">
                    <div class="concept-box"><p>${lesson.concept}</p></div>

                    <h4 class="visual-title">Visual Concept</h4>
                    <div class="visual-concept" id="visual-${lesson.id}">
                        ${this._renderVisual(lesson)}
                    </div>

                    <div class="challenge-area">
                        <h3>${lesson.challenge.title}</h3>
                        <p class="challenge-desc">${lesson.challenge.description}</p>

                        <div class="code-editor-container">
                            <textarea class="code-editor" id="challenge-editor"
                                      spellcheck="false">${lesson.challenge.starterCode}</textarea>
                        </div>

                        <div class="button-group">
                            <button class="btn btn-primary"  data-action="run">Run Code</button>
                            <button class="btn btn-secondary" data-action="hint">Hint</button>
                            <button class="btn btn-secondary" data-action="reset">Reset</button>
                        </div>

                        <div class="output-console" id="output-console">
                            <div class="log-line">Ready to run your code...</div>
                        </div>
                        <div id="feedback-container"></div>
                    </div>

                    ${
                        lesson.nextLesson
                            ? `<div class="next-lesson-container" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                                   <button class="btn btn-success" id="next-lesson-btn"
                                           style="display:${alreadyDone ? 'inline-flex' : 'none'};"
                                           data-next="${lesson.nextLesson}">
                                       Next Lesson →
                                   </button>
                                   <button class="btn btn-primary" id="next-level-btn"
                                           style="display:${alreadyDone ? 'inline-flex' : 'none'};"
                                           data-level>
                                       🚀 Next Level
                                   </button>
                               </div>`
                            : `<div class="completion-box">
                                   <h3>You've Completed All Lessons!</h3>
                                   <p>You're now a certified Web Developer!</p>
                                   <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:12px;">
                                       <button class="btn btn-primary" data-reset-all>Start Over</button>
                                       <button class="btn btn-success" data-next-level>🚀 Next Level</button>
                                   </div>
                               </div>`
                    }
                </div>
            </div>
        `;

        this.dom.lessonContainer.innerHTML = html;
        this._bindLessonEvents(lesson);
        this._initVisual(lesson);
        this._updateHeader();
    }

    _bindLessonEvents(lesson) {
        const container = this.dom.lessonContainer;

        container.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'run')   this._runChallenge(lesson);
                if (action === 'hint')  this._showHint(lesson);
                if (action === 'reset') this._resetChallenge(lesson);
            });
        });

        const nextBtn = container.querySelector('#next-lesson-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this._loadLesson(nextBtn.dataset.next);
            });
        }

        const levelBtn = container.querySelector('#next-level-btn');
        if (levelBtn) {
            levelBtn.addEventListener('click', () => {
                window.location.href = '/program';
            });
        }

        const resetAll = container.querySelector('[data-reset-all]');
        if (resetAll) {
            resetAll.addEventListener('click', () => this._resetAll());
        }
        const levelBtn2 = container.querySelector('[data-next-level]');
        if (levelBtn2) {
            levelBtn2.addEventListener('click', () => {
                window.location.href = '/test';
            });
        }
    }

    // ----------------------------------------------------------
    // Visual concept
    // ----------------------------------------------------------
    _renderVisual(lesson) {
        const v = lesson.visual;
        if (!v) return '<div class="block-error">No visual concept available.</div>';

        const bar = `
            <div class="browser-bar">
                <span class="browser-dot"></span>
                <span class="browser-dot"></span>
                <span class="browser-dot"></span>
                <span class="browser-address">${v.type === 'react' ? 'react.quest' : 'webdevquest.local'}</span>
            </div>`;

        switch (v.type) {
            case 'html':
                return `<div class="visual-browser">${bar}
                            <div class="browser-content html-demo">${v.html}</div>
                        </div>`;
            case 'css':
                return `<div class="visual-browser">${bar}
                            <div class="browser-content css-demo">
                                <style>${v.css}</style>${v.html}
                            </div>
                        </div>`;
            case 'js':
                return `<div class="visual-browser">${bar}
                            <div class="browser-content js-demo">${v.html}</div>
                        </div>`;
            case 'react':
                return `<div class="visual-browser">${bar}
                            <div class="browser-content react-demo">${v.html}</div>
                        </div>`;
            default:
                return '<div class="block-error">Unknown visual type.</div>';
        }
    }

    _initVisual(lesson) {
        if (!lesson.visual || lesson.visual.type !== 'js') return;
        const container = this.dom.lessonContainer.querySelector(`#visual-${lesson.id}`);
        if (!container) return;
        const btn = container.querySelector('#demoButton');
        const greeting = container.querySelector('#greeting');
        if (btn && greeting) {
            btn.addEventListener('click', () => {
                greeting.textContent = 'JavaScript is working!';
            });
        }
    }

    // ----------------------------------------------------------
    // Challenge runner
    // ----------------------------------------------------------
    async _runChallenge(lesson) {
        const editor    = this.dom.lessonContainer.querySelector('#challenge-editor');
        const consoleEl = this.dom.lessonContainer.querySelector('#output-console');
        const feedback  = this.dom.lessonContainer.querySelector('#feedback-container');
        if (!editor || !consoleEl || !feedback) return;

        const code = editor.value.trim();
        consoleEl.innerHTML = '';
        feedback.innerHTML = '';
        this._console(consoleEl, 'Running your code...');

        try {
            const ok = lesson.challenge.test(code);

            if (!ok) {
                this._console(consoleEl, 'Not quite right. Try again!', 'error');
                feedback.innerHTML = `
                    <div class="gamification-feedback error">
                        <div class="feedback-title">Not quite right</div>
                        <div class="feedback-detail">Check your code and try again. Use the hint if you're stuck!</div>
                    </div>`;
                return;
            }

            this._console(consoleEl, 'Challenge completed!', 'success');

            // --- Award XP only once ---
            const alreadyDone = this.store.state.isChallengeComplete(
                lesson.id, lesson.challenge.slug
            );

            if (!alreadyDone) {
                this._console(consoleEl, `+${lesson.challenge.xp} XP awarded!`, 'success');

                const xpResult = await this.store.awardXP({
                    amount: lesson.challenge.xp,
                    reason: `Completed challenge: ${lesson.challenge.title}`,
                    lessonSlug: lesson.id,
                    challengeSlug: lesson.challenge.slug,
                });

                await this.store.completeChallenge({
                    lessonSlug: lesson.id,
                    challengeSlug: lesson.challenge.slug,
                });

                if (xpResult.levelUp) this._showLevelUp(xpResult.newLevel);

                // badge
                await this._maybeUnlockBadge(lesson.id, xpResult.newLevel);
            } else {
                this._console(consoleEl, 'Challenge already completed. XP was already awarded.', 'success');
            }

            feedback.innerHTML = `
                <div class="gamification-feedback success">
                    <div class="feedback-title">Perfect!</div>
                    <div class="feedback-detail">You've mastered this concept.</div>
                </div>`;

            const next = this.dom.lessonContainer.querySelector('#next-lesson-btn');
            const lvl  = this.dom.lessonContainer.querySelector('#next-level-btn');
            if (next) next.style.display = 'inline-flex';
            if (lvl)  lvl.style.display  = 'inline-flex';

        } catch (err) {
            console.error(err);
            this._console(consoleEl, `Error: ${err.message}`, 'error');
        }
    }

    async _maybeUnlockBadge(lessonSlug, level) {
        const meta = BADGES[lessonSlug];
        if (meta) {
            const res = await this.store.unlockBadge(lessonSlug);
            if (res) this._toast(`Badge unlocked: ${res.name}`, res.description);
        }
        if (level >= 5) {
            const r = await this.store.unlockBadge('level-5');
            if (r) this._toast(`Badge unlocked: ${r.name}`, r.description);
        }
        if (level >= 10) {
            const r = await this.store.unlockBadge('level-10');
            if (r) this._toast(`Badge unlocked: ${r.name}`, r.description);
        }
    }

    _showHint(lesson) {
        const feedback = this.dom.lessonContainer.querySelector('#feedback-container');
        if (!feedback) return;
        feedback.innerHTML = `
            <div class="gamification-feedback hint">
                <div class="feedback-title">Hint</div>
                <div class="feedback-detail">${this._escape(lesson.challenge.hint)}</div>
                <pre class="hint-code">${this._escape(lesson.challenge.hint)}</pre>
            </div>`;
    }

    _resetChallenge(lesson) {
        const editor    = this.dom.lessonContainer.querySelector('#challenge-editor');
        const consoleEl = this.dom.lessonContainer.querySelector('#output-console');
        const feedback  = this.dom.lessonContainer.querySelector('#feedback-container');
        if (editor)    editor.value = lesson.challenge.starterCode;
        if (consoleEl) consoleEl.innerHTML = '<div class="log-line">Ready to run your code...</div>';
        if (feedback)  feedback.innerHTML = '';
    }

    // ----------------------------------------------------------
    // Reset
    // ----------------------------------------------------------
    async _resetAll() {
        if (!confirm('Reset all progress? This will delete your XP, badges, and completed lessons.')) return;
        await this.store.reset();
        this.store.state.currentLesson = 'html';
        this._renderPath();
        this._loadLesson('html');
        this._toast('Progress reset.');
    }

    // ----------------------------------------------------------
    // UI helpers
    // ----------------------------------------------------------
    _console(el, message, type = '') {
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = message;
        el.appendChild(line);
        el.scrollTop = el.scrollHeight;
    }

    _toast(title, message = '') {
        const n = document.createElement('div');
        n.className = 'quest-notification';
        n.innerHTML = `
            <div class="notification-title">${this._escape(title)}</div>
            ${message ? `<div class="notification-message">${this._escape(message)}</div>` : ''}
        `;
        document.body.appendChild(n);
        setTimeout(() => {
            n.style.transition = 'opacity 0.5s ease';
            n.style.opacity = '0';
            setTimeout(() => n.remove(), 500);
        }, 4000);
    }

    _showLevelUp(level) {
        const overlay = document.createElement('div');
        overlay.className = 'level-up-overlay';
        overlay.innerHTML = `
            <div class="level-up-modal">
                <span class="level-up-icon">🏆</span>
                <h2>Level ${level}!</h2>
                <p>You've reached Level ${level}! Keep coding and keep learning.</p>
                <button class="btn btn-primary">Continue Coding</button>
            </div>`;
        overlay.querySelector('button').addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }

    _escape(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }
}

// ----------------------------------------------------------
// Bootstrap
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const app = new QuestApp();
    app.start();
    window.QuestApp = app; // handy for debugging
});

console.log('🚀 Web Dev Quest (modular) loaded');