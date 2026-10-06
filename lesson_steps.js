// ============================================================
// Step definitions for the three step-based lesson pages.
// Each step maps 1:1 to a challenges row in the DB
//   (lesson_id + slug).
// Sub-activities (match games, reflections) are also modelled
// as challenges so XP awards are idempotent and reload-safe.
// ============================================================

export const STEP_LESSONS = {
    design: {
        slug: 'design',
        title: 'Design on the Web',
        steps: [
            { slug: 'step1', xp: 15 },
            { slug: 'step2', xp: 15 },
            { slug: 'step3', xp: 15 },
            { slug: 'step4', xp: 15 },
        ],
        activities: [
            { slug: 'visual-match', xp: 25 },
            { slug: 'goal-match',   xp: 25 },
        ],
    },
    journey: {
        slug: 'journey',
        title: 'User Journeys',
        steps: [
            { slug: 'step5', xp: 15 },
            { slug: 'step6', xp: 15 },
            { slug: 'step7', xp: 15 },
        ],
        activities: [
            { slug: 'log',                xp: 25 },
            { slug: 'reflections',        xp: 15 },
            { slug: 'final-reflections',  xp: 25 },
        ],
    },
    js: {
        slug: 'js',
        title: 'JavaScript',
        steps: [
            { slug: 'step1', xp: 15 },
            { slug: 'step2', xp: 15 },
            { slug: 'step3', xp: 15 },
            { slug: 'step4', xp: 15 },
            { slug: 'step5', xp: 15 },
            { slug: 'step6', xp: 15 },
            { slug: 'step7', xp: 15 },
        ],
        activities: [
            { slug: 'match-var',       xp: 20 },
            { slug: 'match-type',      xp: 20 },
            { slug: 'match-op',        xp: 20 },
            { slug: 'dom-reflection',  xp: 15 },
        ],
    },
};