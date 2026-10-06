// ============================================================
// javascript.html — JavaScript
// ============================================================
import { PageShell } from '../page-shell.js';
import { STEP_LESSONS } from '../lesson-steps.js';

class JavaScriptPage extends PageShell {
    constructor() {
        super({
            lessonSlug: 'js',
            steps: STEP_LESSONS.js.steps,
        });
    }

    async start() {
        await super.start();
        this._restoreReflection();
    }

    // ---- Step 1 ----
    revealJsExample() {
        const el = document.getElementById('js-reveal-result');
        if (!el) return;
        el.innerHTML = '<span style="color:#48bb78;">Example: A "Sign Up" form that checks if your email is valid <em>before</em> submitting — that is JavaScript at work.</span>';
    }

    // ---- Matching groups ----
    async checkMatch(select, group) {
        const isCorrect = select.value === select.dataset.correct;
        select.classList.remove('correct', 'incorrect');
        if (select.value) {
            select.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
        await this._updateMatchFeedback(group);
    }

    async _updateMatchFeedback(group) {
        const map = {
            var:  { container: 'var-matching',  feedback: 'var-feedback',  xp: 20, slug: 'match-var'  },
            type: { container: 'type-matching', feedback: 'type-feedback', xp: 20, slug: 'match-type' },
            op:   { container: 'op-matching',   feedback: 'op-feedback',   xp: 20, slug: 'match-op'   },
        };
        const cfg = map[group];
        if (!cfg) return;

        const selects = document.querySelectorAll(`#${cfg.container} select`);
        let correct = 0, filled = 0;
        selects.forEach(s => {
            if (s.value) {
                filled++;
                if (s.value === s.dataset.correct) correct++;
            }
        });

        const fb = document.getElementById(cfg.feedback);
        if (filled === selects.length) {
            if (correct === selects.length) {
                const awarded = await this.awardActivityXP(
                    cfg.slug, cfg.xp, `Match activity: ${group}`
                );
                this.feedback(fb, 'success',
                    awarded ? `Perfect! +${cfg.xp} XP` : 'Perfect!',
                    'All matches correct!');
            } else {
                this.feedback(fb, 'hint', 'Almost There!',
                    `You got ${correct}/${selects.length}. Try adjusting the red ones.`);
            }
        }
    }

    // ---- Code runner ----
    runCode(inputId, outputId) {
        const code = document.getElementById(inputId)?.value ?? '';
        const output = document.getElementById(outputId);
        if (!output) return;
        output.innerHTML = '';

        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => {
            logs.push(args.map(a => {
                if (a === null) return 'null';
                if (a === undefined) return 'undefined';
                if (typeof a === 'object') {
                    try { return JSON.stringify(a); } catch (_) { return String(a); }
                }
                return String(a);
            }).join(' '));
        };

        try {
            // eslint-disable-next-line no-new-func
            new Function(code)();
            console.log = originalLog;
            if (logs.length === 0) {
                this.console(output,
                    'No output. Try using console.log() to print something!',
                    'warning');
            } else {
                logs.forEach(l => this.console(output, `> ${l}`, 'success'));
            }
        } catch (err) {
            console.log = originalLog;
            this.console(output, `Error: ${err.message}`, 'error');
        }
    }

    resetCode(inputId, fallback) {
        const el = document.getElementById(inputId);
        if (el) el.value = fallback || '';
    }

    // ---- Step 7 demo ----
    changeDemoText() {
        const el = document.getElementById('demo-text');
        if (!el) return;
        el.textContent = 'Changed by JavaScript!';
    }

    changeDemoColor() {
        const el = document.getElementById('demo-text');
        if (!el) return;
        const colors = ['#f6ad55', '#48bb78', '#667eea', '#fc8181', '#9f7aea'];
        el.style.color = colors[Math.floor(Math.random() * colors.length)];
        el.style.transform = 'scale(1.1)';
        setTimeout(() => { el.style.transform = 'scale(1)'; }, 300);
    }

    resetDemo() {
        const el = document.getElementById('demo-text');
        if (!el) return;
        el.textContent = 'Hello from JavaScript';
        el.style.color = '#e2e8f0';
    }

    // ---- Reflection ----
    async saveDomReflection() {
        const el = document.getElementById('code-dom');
        const fb = document.getElementById('dom-feedback');
        const text = el?.value.trim();
        if (!text) {
            this.feedback(fb, 'hint',
                'Write something first',
                'Describe at least one step in your plan.');
            return;
        }
        await this.saveActivityData('dom-reflection', { text }, 15,
                                    'DOM reflection');
        this.feedback(fb, 'success',
            'Reflection Saved! +15 XP',
            'Great thinking — you just planned a real feature!');
    }

    _restoreReflection() {
        const saved = this.store.state.progressData['js:dom-reflection'];
        if (!saved?.responseData) return;
        try {
            const data = JSON.parse(saved.responseData);
            const el = document.getElementById('code-dom');
            if (el) el.value = data.text || '';
        } catch (_) {}
    }

    completeStep(slug) {
        return super.completeStep(slug);
    }
}

// ---- Bootstrap ----
const page = new JavaScriptPage();
page.start();

// ---- Legacy inline handlers ----
window.revealJsExample  = () => page.revealJsExample();
window.checkMatch       = (sel, group) => page.checkMatch(sel, group);
window.runCode          = (i, o) => page.runCode(i, o);
window.resetCode        = (i, f) => page.resetCode(i, f);
window.changeDemoText   = () => page.changeDemoText();
window.changeDemoColor  = () => page.changeDemoColor();
window.resetDemo        = () => page.resetDemo();
window.saveDomReflection= () => page.saveDomReflection();
window.completeStep     = (slug) => page.completeStep(slug);
window.QuestPage = page;