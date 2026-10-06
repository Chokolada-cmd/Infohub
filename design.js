// ============================================================
// test.html — Design on the Web
// ============================================================
import { PageShell } from '../page-shell.js';
import { STEP_LESSONS } from '../lesson-steps.js';

class DesignPage extends PageShell {
    constructor() {
        super({
            lessonSlug: 'design',
            steps: STEP_LESSONS.design.steps,
        });
        this._dragData = null;
    }

    async start() {
        await super.start();
        this._bindDragDrop();
    }

    // ---- Drag & drop ----
    _bindDragDrop() {
        document.querySelectorAll('.drag-item').forEach(item => {
            item.addEventListener('dragstart', () => {
                this._dragData = item.dataset.term;
                item.classList.add('dragging');
            });
            item.addEventListener('dragend', () =>
                item.classList.remove('dragging'));
        });

        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.addEventListener('dragover', e => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
            zone.addEventListener('dragleave', () =>
                zone.classList.remove('drag-over'));
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                if (!this._dragData) return;
                zone.dataset.dropped = this._dragData;
                zone.innerHTML =
                    `<span style="color:#48bb78;">✅ ${this._dragData}</span>`;
                zone.style.borderColor = '#48bb78';
                this._dragData = null;
            });
        });
    }

    // ---- Visual match ----
    async checkVisualMatch() {
        const zones = document.querySelectorAll('.drop-zone');
        let correct = 0;

        zones.forEach(zone => {
            const dropped  = zone.dataset.dropped;
            const expected = zone.dataset.expected;
            if (dropped === expected) {
                zone.classList.add('correct');
                zone.classList.remove('incorrect');
                correct++;
            } else if (dropped) {
                zone.classList.add('incorrect');
                zone.classList.remove('correct');
            }
        });

        const fb = document.getElementById('visual-match-feedback');
        if (correct === zones.length) {
            const awarded = await this.awardActivityXP(
                'visual-match', 25, 'Visual design match'
            );
            this.feedback(fb, 'success',
                awarded ? 'Perfect! +25 XP' : 'Perfect!',
                "You've mastered visual design elements.");
        } else {
            this.feedback(fb, 'hint', 'Keep Going!',
                `You got ${correct}/${zones.length} correct. Try again!`);
        }
    }

    resetVisualMatch() {
        const labels = {
            color:      'The hue that evokes emotion',
            size:       'How big or small elements appear',
            space:      'The area around or between elements',
            position:   'Where elements are placed on the page',
            repetition: 'Patterns that create unity',
        };
        document.querySelectorAll('.drop-zone').forEach(zone => {
            const expected = zone.dataset.expected;
            zone.innerHTML =
                `<span class="placeholder">Drop here: ${labels[expected] || expected}</span>`;
            zone.dataset.dropped = '';
            zone.className = 'drop-zone';
        });
        const fb = document.getElementById('visual-match-feedback');
        if (fb) fb.innerHTML = '';
    }

    // ---- Goal match (selects) ----
    async checkGoalMatch(select) {
        const isCorrect = select.value === select.dataset.correct;
        select.classList.remove('correct', 'incorrect');
        if (select.value) {
            select.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
        await this._updateGoalFeedback();
    }

    async _updateGoalFeedback() {
        const selects = document.querySelectorAll('#goal-matching select');
        let correct = 0, filled = 0;

        selects.forEach(sel => {
            if (sel.value) {
                filled++;
                if (sel.value === sel.dataset.correct) correct++;
            }
        });

        const fb = document.getElementById('goal-match-feedback');
        if (filled === selects.length) {
            if (correct === selects.length) {
                const awarded = await this.awardActivityXP(
                    'goal-match', 25, 'User vs Site goals match'
                );
                this.feedback(fb, 'success',
                    awarded ? 'Excellent! +25 XP' : 'Excellent!',
                    'You understand user vs site goals!');
            } else {
                this.feedback(fb, 'hint', 'Almost There!',
                    `You got ${correct}/${selects.length} correct. Review the examples above.`);
            }
        }
    }

    // ---- Misc ----
    showDesignIntent() {
        const el = document.getElementById('design-intent-result');
        if (!el) return;
        el.innerHTML = '<span style="color:#48bb78;">💡 Designers make choices to create an outcome—in action or feeling for the user.</span>';
    }

    completeStep(slug) {
        return super.completeStep(slug);
    }
}

// ---- Bootstrap ----
const page = new DesignPage();
page.start();

// ---- Legacy inline handlers (kept for HTML compatibility) ----
window.checkVisualMatch  = () => page.checkVisualMatch();
window.resetVisualMatch  = () => page.resetVisualMatch();
window.checkGoalMatch    = (sel) => page.checkGoalMatch(sel);
window.showDesignIntent  = () => page.showDesignIntent();
window.completeStep      = (slug) => page.completeStep(slug);
window.QuestPage = page;