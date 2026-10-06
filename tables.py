import sqlite3
import datetime

# ---------------------------------------------------------------------
# DATABASE SETUP
# ---------------------------------------------------------------------
DB_NAME = "tutor.db"

conn = sqlite3.connect(DB_NAME, timeout=10)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA foreign_keys = ON")
c = conn.cursor()


# ---------------------------------------------------------------------
# 1. STUDENTS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS students (
        student_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        school TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age_group TEXT,
        learning_style TEXT,
        password_hash TEXT NOT NULL,
        goal TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
""")

# ---------------------------------------------------------------------
# 2. WEBDEV_MODULES
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS webdev_modules (
        module_id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        difficulty_level TEXT,
        estimated_time INTEGER,
        category TEXT,
        content_url TEXT
    )
""")

# ---------------------------------------------------------------------
# 3. STUDENT_PROGRESS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS student_progress (
        progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        module_id INTEGER,
        status TEXT,
        attempts INTEGER DEFAULT 0,
        score REAL,
        time_spent INTEGER,
        completion_date TEXT,
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (module_id) REFERENCES webdev_modules(module_id)
    )
""")

# ---------------------------------------------------------------------
# 4. CODE_SUBMISSIONS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS code_submissions (
        submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        module_id INTEGER,
        code_text TEXT,
        passed_tests INTEGER,
        error_log TEXT,
        language TEXT,
        timestamp TEXT,
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (module_id) REFERENCES webdev_modules(module_id)
    )
""")

# ---------------------------------------------------------------------
# 5. PROJECTS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        project_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        title TEXT NOT NULL,
        code_url TEXT,
        dataset_id_used INTEGER,
        is_public BOOLEAN DEFAULT 0,
        FOREIGN KEY (student_id) REFERENCES students(student_id)
    )
""")

# ---------------------------------------------------------------------
# 6. BEHAVIORAL_DATA
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS behavioral_data (
        behavior_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        module_id INTEGER,
        time_on_lesson INTEGER,
        pauses INTEGER,
        replays_video BOOLEAN,
        code_runs INTEGER,
        errors_per_run INTEGER,
        time_to_fix_error INTEGER,
        hints_used INTEGER,
        skips INTEGER,
        abandon_rate REAL,
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (module_id) REFERENCES webdev_modules(module_id)
    )
""")

# ---------------------------------------------------------------------
# 7. ENGAGEMENT_DATA
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS engagement_data (
        engagement_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        login_frequency INTEGER,
        streak_days INTEGER,
        last_active TEXT,
        forum_questions INTEGER,
        help_requests INTEGER,
        FOREIGN KEY (student_id) REFERENCES students(student_id)
    )
""")

# ---------------------------------------------------------------------
# 8. PERFORMANCE_DATA
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS performance_data (
        performance_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        quiz_scores TEXT,
        project_scores TEXT,
        rubric_breakdown TEXT,
        mistake_pattern TEXT,
        FOREIGN KEY (student_id) REFERENCES students(student_id)
    )
""")

# ---------------------------------------------------------------------
# 9. AI_INTERACTIONS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS ai_interactions (
        interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        module_id INTEGER,
        question_asked TEXT,
        hint_given TEXT,
        response_generated TEXT,
        resolved BOOLEAN,
        response_time INTEGER,
        timestamp TEXT,
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (module_id) REFERENCES webdev_modules(module_id)
    )
""")

# ---------------------------------------------------------------------
# 10. MISTAKE_PATTERNS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS mistake_patterns (
        pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER,
        student_id INTEGER,
        module_id INTEGER,
        error_type TEXT,
        frequency INTEGER,
        pattern_description TEXT,
        FOREIGN KEY (submission_id) REFERENCES code_submissions(submission_id),
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (module_id) REFERENCES webdev_modules(module_id)
    )
""")

# ---------------------------------------------------------------------
# 11. DATASETS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        dataset_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        file_url TEXT,
        size TEXT
    )
""")

# ---------------------------------------------------------------------
# 12. ML_MODELS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS ml_models (
        model_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        framework TEXT,
        model_url TEXT,
        training_code_url TEXT,
        metrics_json TEXT,
        dataset_id INTEGER,
        FOREIGN KEY (dataset_id) REFERENCES datasets(dataset_id)
    )
""")

# ---------------------------------------------------------------------
# 13. SESSIONS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        student_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
    )
""")

# ---------------------------------------------------------------------
# 14. LESSONS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS lessons (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        slug          TEXT    NOT NULL UNIQUE,
        title         TEXT    NOT NULL,
        subtitle      TEXT,
        description   TEXT,
        icon          TEXT,
        order_index   INTEGER NOT NULL,
        xp_reward     INTEGER NOT NULL DEFAULT 0,
        is_locked     INTEGER NOT NULL DEFAULT 1,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# ---------------------------------------------------------------------
# 15. CHALLENGES
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS challenges (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id     INTEGER NOT NULL,
        slug          TEXT    NOT NULL,
        step_number   INTEGER NOT NULL,
        title         TEXT    NOT NULL,
        type          TEXT    NOT NULL,
        prompt        TEXT,
        xp_reward     INTEGER NOT NULL DEFAULT 15,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE (lesson_id, slug)
    )
""")

# ---------------------------------------------------------------------
# 16. BADGES
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS badges (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        slug          TEXT    NOT NULL UNIQUE,
        name          TEXT    NOT NULL,
        description   TEXT,
        icon          TEXT,
        xp_bonus      INTEGER NOT NULL DEFAULT 0,
        criteria      TEXT,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# ---------------------------------------------------------------------
# 17. USER_PROGRESS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS user_progress (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id        INTEGER NOT NULL,
        challenge_id      INTEGER,
        lesson_id         INTEGER NOT NULL,
        completed         INTEGER NOT NULL DEFAULT 0,
        score             INTEGER DEFAULT 0,
        attempts          INTEGER NOT NULL DEFAULT 0,
        response_data     TEXT,
        first_started_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at      TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id)   REFERENCES students(student_id)   ON DELETE CASCADE,
        FOREIGN KEY (challenge_id) REFERENCES challenges(id)          ON DELETE CASCADE,
        FOREIGN KEY (lesson_id)    REFERENCES lessons(id)             ON DELETE CASCADE,
        UNIQUE (student_id, challenge_id)
    )
""")

# ---------------------------------------------------------------------
# 18. USER_XP
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS user_xp (
        student_id     INTEGER PRIMARY KEY,
        total_xp       INTEGER NOT NULL DEFAULT 0,
        level          INTEGER NOT NULL DEFAULT 1,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_active    DATE,
        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
    )
""")

# ---------------------------------------------------------------------
# 19. USER_BADGES
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS user_badges (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id  INTEGER NOT NULL,
        badge_id    INTEGER NOT NULL,
        earned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        FOREIGN KEY (badge_id)   REFERENCES badges(id)            ON DELETE CASCADE,
        UNIQUE (student_id, badge_id)
    )
""")

# ---------------------------------------------------------------------
# 20. XP_EVENTS
# ---------------------------------------------------------------------
c.execute("""
    CREATE TABLE IF NOT EXISTS xp_events (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id   INTEGER NOT NULL,
        amount       INTEGER NOT NULL,
        reason       TEXT,
        challenge_id INTEGER,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id)   REFERENCES students(student_id) ON DELETE CASCADE,
        FOREIGN KEY (challenge_id) REFERENCES challenges(id)        ON DELETE SET NULL
    )
""")


# =====================================================================
# SEED DATA
# Slugs must match what the JS modules send:
#   static/js/lesson-data.js        →  html, css, js, react
#   static/js/lesson-steps.js       →  design, journey, js + activity slugs
# =====================================================================

LESSON_SEED = [
    # (slug, title, subtitle, icon, order_index, xp_reward, is_locked)
    ("html",    "HTML Basics",       "Structure of the Web", "HTML", 1, 100, 0),
    ("css",     "CSS Styling",       "Styling the Web",      "CSS",  2, 150, 0),
    ("design",  "Design on the Web", "Design Principles",    "DSN",  3, 150, 0),
    ("journey", "User Journeys",     "Investigations",       "JRN",  4, 200, 0),
    ("js",      "JavaScript Logic",  "The Brain of the Web", "JS",   5, 350, 0),
    ("react",   "React Components",  "Components and State", "RCT",  6, 400, 1),
]

CHALLENGE_SEED = {
    # lesson slug -> [(step_number, slug, title, type, xp_reward), ...]

    "html": [
        (1, "first-heading", "Create Your First Heading", "code", 50),
    ],

    "css": [
        (1, "style-heading", "Style Your Heading", "code", 50),
    ],

    "design": [
        (1,  "step1", "The Web is a Designed Space",  "activity", 15),
        (2,  "step2", "Visual Design Elements",       "activity", 15),
        (3,  "step3", "Interactive Design Elements",  "activity", 15),
        (4,  "step4", "User Goals vs Site Goals",     "activity", 15),
        (10, "visual-match", "Visual Design Match",   "activity", 25),
        (11, "goal-match",   "User vs Site Goals",    "activity", 25),
    ],

    "journey": [
        (5,  "step5", "Investigations and Journeys",     "activity", 15),
        (6,  "step6", "Reflection and Review",           "activity", 15),
        (7,  "step7", "Learning Experience Reflection",  "activity", 15),
        (12, "log",                "Documentation Log",  "activity", 25),
        (13, "reflections",        "Reflections",        "activity", 15),
        (14, "final-reflections",  "Final Reflections",  "activity", 25),
    ],

    "js": [
        (1,  "step1", "What is JavaScript?",       "activity", 15),
        (2,  "step2", "Variables",                 "activity", 15),
        (3,  "step3", "Data Types",                "activity", 15),
        (4,  "step4", "Operators & Conditionals",  "activity", 15),
        (5,  "step5", "Functions",                 "activity", 15),
        (6,  "step6", "Arrays & Loops",            "activity", 15),
        (7,  "step7", "DOM Manipulation",          "activity", 15),
        (10, "match-var",      "Variable match",   "activity", 20),
        (11, "match-type",     "Data type match",  "activity", 20),
        (12, "match-op",       "Operators match",  "activity", 20),
        (13, "dom-reflection", "DOM Reflection",   "activity", 15),
    ],

    "react": [
        (1, "welcome-component", "Create a React Component", "code", 100),
    ],
}

BADGE_SEED = [
    # (slug, name, description, icon, xp_bonus, criteria)
    # --- lesson-completion badges ---------------------------------
    # NOTE: the slug MUST equal the lesson slug, because
    # PageShell._lessonComplete() calls unlockBadge(this.lessonSlug).
    ("html",     "HTML Builder",     "Completed HTML Basics",         "HTML",  0, "complete_lesson:html"),
    ("css",      "CSS Stylist",      "Styled your first element",     "CSS",   0, "complete_lesson:css"),
    ("design",   "Design Detective", "Completed Design on the Web",   "DSN",  25, "complete_lesson:design"),
    ("journey",  "Journey Mapper",   "Completed User Journeys",       "JRN",  25, "complete_lesson:journey"),
    ("js",       "Code Wizard",      "Completed JavaScript",          "JS",   50, "complete_lesson:js"),
    ("react",    "React Developer",  "Built your first component",    "RCT",   0, "complete_lesson:react"),

    # --- level badges ---------------------------------------------
    ("level-5",  "Rising Star",       "Reached Level 5",              "LVL",  20, "reach_level:5"),
    ("level-10", "Level 10 Achieved", "Reached Level 10",             "LVL",  40, "reach_level:10"),
]


def seed_db():
    # ---- Lessons ----
    for (slug, title, subtitle, icon, order_index, xp_reward, is_locked) in LESSON_SEED:
        conn.execute(
            """
            INSERT INTO lessons (slug, title, subtitle, icon, order_index, xp_reward, is_locked)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET
                title       = excluded.title,
                subtitle    = excluded.subtitle,
                icon        = excluded.icon,
                order_index = excluded.order_index,
                xp_reward   = excluded.xp_reward,
                is_locked   = excluded.is_locked
            """,
            (slug, title, subtitle, icon, order_index, xp_reward, is_locked),
        )

    # ---- Challenges ----
    for lesson_slug, challenges in CHALLENGE_SEED.items():
        row = conn.execute(
            "SELECT id FROM lessons WHERE slug = ?", (lesson_slug,)
        ).fetchone()
        if not row:
            print(f"[seed] skipping challenges for unknown lesson: {lesson_slug}")
            continue

        lesson_id = row["id"]

        for (step_number, slug, title, ctype, xp_reward) in challenges:
            conn.execute(
                """
                INSERT INTO challenges (lesson_id, slug, step_number, title, type, xp_reward)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(lesson_id, slug) DO UPDATE SET
                    step_number = excluded.step_number,
                    title       = excluded.title,
                    type        = excluded.type,
                    xp_reward   = excluded.xp_reward
                """,
                (lesson_id, slug, step_number, title, ctype, xp_reward),
            )

    # ---- Badges ----
    for (slug, name, desc, icon, xp_bonus, criteria) in BADGE_SEED:
        conn.execute(
            """
            INSERT INTO badges (slug, name, description, icon, xp_bonus, criteria)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET
                name        = excluded.name,
                description = excluded.description,
                icon        = excluded.icon,
                xp_bonus    = excluded.xp_bonus,
                criteria    = excluded.criteria
            """,
            (slug, name, desc, icon, xp_bonus, criteria),
        )


seed_db()

conn.commit()
conn.close()

print("Database and all tables created & seeded!")