import sqlite3
import datetime

#create the database schema
DB_NAME = "tutor.db"

conn = sqlite3.connect(DB_NAME, timeout=10)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA foreign_keys = ON")
c = conn.cursor()

# 1. STUDENTS TABLE
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

# 2. WEBDEV_MODULES TABLE
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

# 3. STUDENT_PROGRESS TABLE
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
        FOREIGN KEY (student_id)
            REFERENCES students(student_id),
        FOREIGN KEY (module_id)
            REFERENCES webdev_modules(module_id)
    )
""")

# 4. CODE_SUBMISSIONS TABLE
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
        FOREIGN KEY (student_id)
            REFERENCES students(student_id),
        FOREIGN KEY (module_id)
            REFERENCES webdev_modules(module_id)
    )
""")

# 5. PROJECTS TABLE
c.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        project_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        title TEXT NOT NULL,
        code_url TEXT,
        dataset_id_used INTEGER,
        is_public BOOLEAN DEFAULT 0,
        FOREIGN KEY (student_id)
            REFERENCES students(student_id)
    )
""")

# 6. BEHAVIORAL_DATA TABLE
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
        FOREIGN KEY (student_id)
            REFERENCES students(student_id),
        FOREIGN KEY (module_id)
            REFERENCES webdev_modules(module_id)
    )
""")

# 7. ENGAGEMENT_DATA TABLE
c.execute("""
    CREATE TABLE IF NOT EXISTS engagement_data (
        engagement_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        login_frequency INTEGER,
        streak_days INTEGER,
        last_active TEXT,
        forum_questions INTEGER,
        help_requests INTEGER,
        FOREIGN KEY (student_id)
            REFERENCES students(student_id)
    )
""")

# 8. PERFORMANCE_DATA TABLE
c.execute("""
    CREATE TABLE IF NOT EXISTS performance_data (
        performance_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        quiz_scores TEXT,
        project_scores TEXT,
        rubric_breakdown TEXT,
        mistake_pattern TEXT,
        FOREIGN KEY (student_id)
            REFERENCES students(student_id)
    )
""")

# 9. AI_INTERACTIONS TABLE
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
        FOREIGN KEY (student_id)
            REFERENCES students(student_id),
        FOREIGN KEY (module_id)
            REFERENCES webdev_modules(module_id)
    )
""")

# 10. MISTAKE_PATTERNS TABLE
c.execute("""
    CREATE TABLE IF NOT EXISTS mistake_patterns (
        pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER,
        student_id INTEGER,
        module_id INTEGER,
        error_type TEXT,
        frequency INTEGER,
        pattern_description TEXT,
        FOREIGN KEY (submission_id)
            REFERENCES code_submissions(submission_id),
        FOREIGN KEY (student_id)
            REFERENCES students(student_id),
        FOREIGN KEY (module_id)
            REFERENCES webdev_modules(module_id)
    )
""")

# 11. DATASETS TABLE
c.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        dataset_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        file_url TEXT,
        size TEXT
    )
""")

# 12. ML_MODELS TABLE
c.execute("""
    CREATE TABLE IF NOT EXISTS ml_models (
        model_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        framework TEXT,
        model_url TEXT,
        training_code_url TEXT,
        metrics_json TEXT,
        dataset_id INTEGER,
        FOREIGN KEY (dataset_id)
            REFERENCES datasets(dataset_id)
    )
""")

# 13. SESSION TABLE
c.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        student_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (student_id)
            REFERENCES students(student_id)
            ON DELETE CASCADE
    )
""")

#14 Lessons
c.execute("""
    CREATE TABLE IF NOT EXISTS lessons (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        slug          TEXT    NOT NULL UNIQUE,      -- 'javascript'
        title         TEXT    NOT NULL,             -- 'JavaScript'
        subtitle      TEXT,                         -- 'The Brain of the Web'
        description   TEXT,
        icon          TEXT,                         -- short label like 'JS'
        order_index   INTEGER NOT NULL,             -- 1..N for sorting
        xp_reward     INTEGER NOT NULL DEFAULT 0,   -- XP for finishing the whole lesson
        is_locked     INTEGER NOT NULL DEFAULT 1,   -- 1 = locked until previous is done
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

#15 challenges
c.execute("""
    CREATE TABLE IF NOT EXISTS challenges (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id     INTEGER NOT NULL,
    slug          TEXT    NOT NULL,             -- 'js-step-2-vars'
    step_number   INTEGER NOT NULL,             -- 1..N within the lesson
    title         TEXT    NOT NULL,
    type          TEXT    NOT NULL,             
    prompt        TEXT,
    xp_reward     INTEGER NOT NULL DEFAULT 15,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE (lesson_id, slug)
    )
""")


#16 Badges
c.execute("""
    CREATE TABLE IF NOT EXISTS badges (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    slug          TEXT    NOT NULL UNIQUE,      -- 'code-wizard'
    name          TEXT    NOT NULL,             -- 'Code Wizard'
    description   TEXT,
    icon          TEXT,                         -- short label 'WIZ'
    xp_bonus      INTEGER NOT NULL DEFAULT 0,
    criteria      TEXT,                         -- readable rule
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")


#17 Progress
c.execute("""
    CREATE TABLE IF NOT EXISTS user_progress (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id           INTEGER NOT NULL,
    challenge_id      INTEGER NOT NULL,
    lesson_id         INTEGER NOT NULL,          -- denormalized for fast lookups
    completed         INTEGER NOT NULL DEFAULT 0,
    score             INTEGER DEFAULT 0,         
    attempts          INTEGER NOT NULL DEFAULT 0,
    response_data     TEXT,                      -- JSON blob: reflections, drop data, etc.
    first_started_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id)      REFERENCES students(student_id)      ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id)    REFERENCES lessons(id)    ON DELETE CASCADE,
    UNIQUE (student_id, challenge_id)
    )
""")


#18 user_xp
c.execute("""
    CREATE TABLE IF NOT EXISTS user_xp (
    student_id        INTEGER PRIMARY KEY,
    total_xp       INTEGER NOT NULL DEFAULT 0,
    level          INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active    DATE,                          -- YYYY-MM-DD for streak math
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
    )
""")


#19 User_badges
c.execute("""
    CREATE TABLE IF NOT EXISTS user_badges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id     INTEGER NOT NULL,
    badge_id    INTEGER NOT NULL,
    earned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id)  REFERENCES students(student_id)  ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    UNIQUE (student_id, badge_id)
    )
""")


#20 xp_events
c.execute("""
    CREATE TABLE IF NOT EXISTS xp_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      INTEGER NOT NULL,
    amount       INTEGER NOT NULL,
    reason       TEXT,                           -- e.g. 'completed js-step-2-vars'
    challenge_id INTEGER,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id)      REFERENCES students(student_id)      ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE SET NULL
)
""")


# =============================================================
# SEED DATA
# Matches the lessons/challenges you already built.
# =============================================================

LESSON_SEED = [
    # (slug, title, subtitle, icon, order_index, xp_reward, is_locked)
    ("html",     "HTML",         "Structure of the Web",   "HTML", 1, 100, 0),
    ("css",      "CSS",          "Styling the Web",        "CSS",  2, 150, 0),
    ("design",   "Design",       "Design on the Web",      "DSN",  3, 150, 0),
    ("journey",  "User Journeys","Investigations",         "JRN",  4, 200, 0),
    ("javascript","JavaScript",  "The Brain of the Web",   "JS",   5, 350, 0),
    ("react",    "React",        "Components and State",   "RCT",  6, 400, 1),
]

CHALLENGE_SEED = {
    # lesson slug -> list of (step_number, slug, title, type, xp_reward)
    "design": [
        (1, "design-step-1", "The Web is a Designed Space",   "quiz",       15),
        (2, "design-step-2", "Visual Design Elements",        "dragdrop",   25),
        (3, "design-step-3", "Interactive Design Elements",   "quiz",       15),
        (4, "design-step-4", "User Goals vs Site Goals",      "matching",   25),
    ],
    "journey": [
        (1, "journey-step-5", "Documentation Log",            "reflection", 25),
        (2, "journey-step-6", "Reflection and Review",        "reflection", 15),
        (3, "journey-step-7", "Learning Experience",          "reflection", 25),
    ],
    "javascript": [
        (1, "js-step-1", "What is JavaScript?",               "quiz",       15),
        (2, "js-step-2", "Variables",                         "code",       15),
        (3, "js-step-3", "Data Types",                        "matching",   20),
        (4, "js-step-4", "Operators and Conditionals",        "code",       20),
        (5, "js-step-5", "Functions",                         "code",       15),
        (6, "js-step-6", "Arrays and Loops",                  "code",       15),
        (7, "js-step-7", "DOM Manipulation",                  "reflection", 15),
    ],
}

BADGE_SEED = [
    # (slug, name, description, icon, xp_bonus, criteria)
    ("first-steps",      "First Steps",      "Complete your first challenge.",              "STA", 10,  "complete_any_challenge"),
    ("design-detective", "Design Detective", "Complete all Design challenges.",             "DSN", 25,  "complete_lesson:design"),
    ("code-wizard",      "Code Wizard",      "Complete all JavaScript challenges.",         "JS",  50,  "complete_lesson:javascript"),
    ("level-5",          "Rising Star",      "Reach Level 5.",                              "LVL", 20,  "reach_level:5"),
    ("streak-7",         "On Fire",          "Maintain a 7-day streak.",                    "STR", 30,  "streak:7"),
]

def seed_db():
    for (slug, title, subtitle, icon, order_index, xp_reward, is_locked) in LESSON_SEED:
        conn.execute(
            """
            INSERT INTO lessons (slug, title, subtitle, icon, order_index, xp_reward, is_locked)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO NOTHING
            """,
            (slug, title, subtitle, icon, order_index, xp_reward, is_locked),
        )

    # Challenges - look up lesson_id by slug
    for lesson_slug, challenges in CHALLENGE_SEED.items():
        row = conn.execute(
            "SELECT id FROM lessons WHERE slug = ?", (lesson_slug,)
        ).fetchone()
        if not row:
            continue
        lesson_id = row["id"]
        for (step_number, slug, title, ctype, xp_reward) in challenges:
            conn.execute(
                """
                INSERT INTO challenges (lesson_id, slug, step_number, title, type, xp_reward)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(lesson_id, slug) DO NOTHING
                """,
                (lesson_id, slug, step_number, title, ctype, xp_reward),
            )

    # Badges
    for (slug, name, desc, icon, xp_bonus, criteria) in BADGE_SEED:
        conn.execute(
            """
            INSERT INTO badges (slug, name, description, icon, xp_bonus, criteria)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO NOTHING
            """,
            (slug, name, desc, icon, xp_bonus, criteria),
        )


seed_db()

conn.commit()
conn.close()

print("Database and all tables created & seeded!")

