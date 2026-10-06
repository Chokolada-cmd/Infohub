// ============================================================
// program.html — User Journeys
// ============================================================
import { PageShell } from '../page-shell.js';
import { STEP_LESSONS } from '../lesson-steps.js';

class JourneyPage extends PageShell {
    constructor() {
        super({
            lessonSlug: 'journey',
            steps: STEP_LESSONS.journey.steps,
        });
    }

    async start() {
        await super.start();
        this._restoreReflections();
    }

    // ---- Site selector ----
    selectSite(btn, site) {
        document.querySelectorAll('.site-btn').forEach(b =>
            b.classList.remove('active'));
        btn.classList.add('active');
        const el = document.getElementById('selected-site');
        if (el) el.textContent = site;
    }

    // ---- Documentation log ----
    async updateLog() {
        const fields = ['goal', 'first', 'clicked', 'sidetracked',
                        'feel', 'annoyed', 'time'];
        let allFilled = true;
        const data = {};

        fields.forEach(field => {
            const input = document.getElementById(`input-${field}`);
            const log   = document.getElementById(`log-${field}`);
            if (input && log) {
                data[field] = input.value;
                if (input.value) {
                    log.textContent = input.value;
                } else {
                    allFilled = false;
                }
            }
        });

        const fb = document.getElementById('step5-feedback');
        if (allFilled) {
            await this.saveActivityData('log', data, 25, 'User journey log');
            this.feedback(fb, 'success',
                'Great Documentation! +25 XP',
                "You've captured the user journey thoroughly!");
        } else {
            this.feedback(fb, 'hint',
                'Fill in all fields',
                'Complete all the input fields to earn XP.');
        }
    }

    // ---- Reflections ----
    async saveReflections() {
        const data = {
            influence: document.getElementById('reflection-influence').value,
            tension:   document.getElementById('reflection-tension').value,
            future:    document.getElementById('reflection-future').value,
            teaching:  document.getElementById('reflection-teaching').value,
        };
        await this.saveActivityData('reflections', data, 15, 'Reflections');
        this.feedback(document.getElementById('step6-feedback'),
            'success', 'Reflections Saved! +15 XP',
            'Your insights are valuable for future learning.');
    }

    async saveFinalReflections() {
        const data = {
            like:   document.getElementById('reflection-like').value,
            change: document.getElementById('reflection-change').value,
        };
        await this.saveActivityData('final-reflections', data, 25,
                                    'Final reflections');
        this.feedback(document.getElementById('step7-feedback'),
            'success', 'Thank You! +25 XP',
            'Your feedback helps improve the learning experience.');
    }

    _restoreReflections() {
        const progress = this.store.state.progressData;

        const refs = progress['journey:reflections'];
        if (refs?.responseData) {
            try {
                const data = JSON.parse(refs.responseData);
                Object.keys(data).forEach(key => {
                    const el = document.getElementById(`reflection-${key}`);
                    if (el) el.value = data[key];
                });
            } catch (_) {}
        }

        const finalRefs = progress['journey:final-reflections'];
        if (finalRefs?.responseData) {
            try {
                const data = JSON.parse(finalRefs.responseData);
                const likeEl   = document.getElementById('reflection-like');
                const changeEl = document.getElementById('reflection-change');
                if (likeEl)   likeEl.value   = data.like   || '';
                if (changeEl) changeEl.value = data.change || '';
            } catch (_) {}
        }

        const log = progress['journey:log'];
        if (log?.responseData) {
            try {
                const data = JSON.parse(log.responseData);
                Object.keys(data).forEach(field => {
                    const input = document.getElementById(`input-${field}`);
                    const logEl = document.getElementById(`log-${field}`);
                    if (input) input.value = data[field];
                    if (logEl) logEl.textContent = data[field];
                });
            } catch (_) {}
        }
    }

    completeStep(slug) {
        return super.completeStep(slug);
    }
}

// ---- Bootstrap ----
const page = new JourneyPage();
page.start();

// ---- Legacy inline handlers ----
window.selectSite              = (btn, site) => page.selectSite(btn, site);
window.updateLog               = () => page.updateLog();
window.saveReflections         = () => page.saveReflections();
window.saveFinalReflections    = () => page.saveFinalReflections();
window.completeStep            = (slug) => page.completeStep(slug);
window.QuestPage = page;