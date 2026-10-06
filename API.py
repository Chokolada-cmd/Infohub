import secrets
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Request, Response, HTTPException, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from connection import Database
from pydantic import BaseModel, EmailStr
from pwdlib import PasswordHash

app = FastAPI(title = "Your Tutor API")

# Define the origins that are allowed to make requests
#frontend (port 5173) and backend (port 8000)
#browser will block requests from the frontend unless the backend explicitly allows it
#cross origin error

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # In development, you can use ["*"] to allow all, but be specific in production
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, PUT, DELETE)
    allow_headers=["*"], # Allows all headers
)

app.mount("/static",StaticFiles(directory="static"),name="static")
templates = Jinja2Templates(directory="templates")

password_hash = PasswordHash.recommended()
session_len = 1

def create_session(student_id: int):
    db = Database()
    conn = db.get_connection()

    session_id = secrets.token_urlsafe(32)
    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(hours=session_len)
    )

    try:
        # Remove expired sessions
        conn.execute(
            """
            DELETE FROM sessions
            WHERE expires_at < ?
            """,
            (
                datetime.now(timezone.utc).isoformat(),
            )
        )

        # Create new session
        conn.execute(
            """
            INSERT INTO sessions (
                session_id,
                student_id,
                expires_at
            )
            VALUES (?, ?, ?)
            """,
            (
                session_id,
                student_id,
                expires_at.isoformat()
            )
        )

        conn.commit()

    finally:
        conn.close()

    return session_id

def set_session_cookie(response: Response,session_id: str):
    """
    Sends the session ID to the browser using
    a secure HttpOnly cookie.
    """
    response.set_cookie(
        key="session_id",
        value=session_id,

        # JavaScript cannot read this cookie
        httponly=True,

        # change this to True when using HTTPS
        secure=False,

        # Helps protect against CSRF
        samesite="lax",
        max_age=session_len * 60 * 60,
        path="/"
    )

class RegisterRequest(BaseModel):
    name: str
    surname: str
    school: str
    email: EmailStr
    password: str
    age_group: str | None = None
    learning_style: str | None = None
    goal: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@app.post("/login")
def login(user: LoginRequest,response: Response):
    db = Database()
    conn = db.get_connection()

    try:
        student = conn.execute(
            """
            SELECT
                student_id,
                name,
                email,
                password_hash
            FROM students
            WHERE email = ?
            """,
            (user.email,)
        ).fetchone()

    finally:
        conn.close()

    if not student:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password!")

    #verify p/w
    isValid = password_hash.verify(user.password,student["password_hash"])

    if not isValid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password")
    
    #create session
    session_id = create_session(student["student_id"])
    set_session_cookie(response,session_id)

    return {
        "message": "Login successful.",
        "student": {
            "student_id": student["student_id"],
            "name": student["name"],
            "email": student["email"]
        }
    }

#Define the expected incoming JSON payload
class ChatRequest(BaseModel):
    message: str

#Define the outgoing JSON payload (optional, but good practice)
class ChatResponse(BaseModel):
    reply: str

#Create the chat endpoint
@app.post("/chat", response_model=ChatResponse)
def chat_with_tutor(request: ChatRequest):
    user_message = request.message

    # --- YOUR AI LOGIC GOES HERE ---
    ai_response = f"I received your message: '{user_message}'. (AI logic not implemented yet!)"
    
    return {"reply": ai_response}

@app.get("/")
def root(request: Request):
     # Check if the user has a valid session
    student = get_current_student(request)
    print("GAME HIT | cookie:",request.cookies.get("session_id"), "| student:", student) 
    if student is None:
        # Not logged in -> redirect to the React login page
        return RedirectResponse("http://localhost:5173/", status_code=303)
    
    return templates.TemplateResponse(
        request=request,
        name="tutor.html",
        context={"student": dict(student)} # Optionally pass student data to the game

       )

@app.get("/javascript")
def javascript(request: Request):
    return templates.TemplateResponse("javascript.html", {"request": request})


@app.get("/test")
def test(request: Request):
    student = get_current_student(request)
    if student is None:
        return RedirectResponse("http://localhost:5173/", status_code=303)
        
    return templates.TemplateResponse(
        request=request,
        name="test.html"
       )

@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="login.html")

@app.get("/program")
def program(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="program.html"
    )

@app.get("/tutor")
def tutor(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="tutor.html"
    )

@app.get("/registration")
def registration(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="registration.html")

def get_current_student(request: Request):
    """
    Reads the 'session_id' cookie, validates it against the sessions table,
    and returns the matching student row (sqlite3.Row) or None.
    """
    session_id = request.cookies.get("session_id")
    if not session_id:
        return None

    db = Database()
    conn = db.get_connection()
    try:
        row = conn.execute(
            """
            SELECT s.student_id
            FROM sessions s
            WHERE s.session_id = ?
              AND s.expires_at > ?
            """,
            (session_id, datetime.now(timezone.utc).isoformat()),
        ).fetchone()

        if row is None:
            return None

        student = conn.execute(
            "SELECT * FROM students WHERE student_id = ?",
            (row["student_id"],),
        ).fetchone()

        return student  # sqlite3.Row or None
    finally:
        conn.close()

# Add this new endpoint anywhere in your API.py
@app.get("/api/me")
def get_me(request: Request):
    # This uses your existing helper function!
    student = get_current_student(request)
    
    if student is None:
        # If no valid session, return a 401 Unauthorized
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Return JSON data to React (excluding the password hash for security)
    return {
        "student_id": student["student_id"],
        "name": student["name"],
        "surname": student["surname"],
        "email": student["email"],
        "school": student["school"],
        "age_group": student["age_group"],
        "learning_style": student["learning_style"],
        "goal": student["goal"]
    }

@app.get("/profile")
def me(request: Request):
    # ---- identify current student via session cookie ----
    student = get_current_student(request)
    if student is None:
        return RedirectResponse("/login", status_code=303)

    student_id = student["student_id"]

    db = Database()
    conn = db.get_connection()
    try:
        # ---- module progress (joined with module titles) ----
        modules = conn.execute(
            """
            SELECT
                m.module_id,
                m.title,
                m.difficulty_level,
                m.category,
                p.status,
                p.attempts,
                p.score,
                p.time_spent
            FROM webdev_modules m
            LEFT JOIN student_progress p
                   ON p.module_id = m.module_id
                  AND p.student_id = ?
            ORDER BY m.module_id
            """,
            (student_id,),
        ).fetchall()

        total_modules       = len(modules)
        completed_modules   = sum(1 for m in modules if m["status"] == "completed")
        in_progress_modules = sum(1 for m in modules if m["status"] == "in_progress")
        completion_pct      = round(completed_modules / total_modules * 100) if total_modules else 0

        scored    = [m["score"] for m in modules if m["score"] is not None]
        avg_score = round(sum(scored) / len(scored)) if scored else 0
        total_time = sum(m["time_spent"] or 0 for m in modules)

        stats = {
            "total_modules":       total_modules,
            "completed_modules":   completed_modules,
            "in_progress_modules": in_progress_modules,
            "completion_pct":      completion_pct,
            "avg_score":           avg_score,
            "total_time":          total_time,
        }

        # ---- engagement (latest row) ----
        eng_row = conn.execute(
            """
            SELECT * FROM engagement_data
            WHERE student_id = ?
            ORDER BY engagement_id DESC LIMIT 1
            """,
            (student_id,),
        ).fetchone()
        engagement = dict(eng_row) if eng_row else {
            "login_frequency": 0, "streak_days": 0, "last_active": None,
            "forum_questions": 0, "help_requests": 0,
        }

        # ---- behavioural data (latest row) ----
        beh_row = conn.execute(
            """
            SELECT * FROM behavioral_data
            WHERE student_id = ?
            ORDER BY behavior_id DESC LIMIT 1
            """,
            (student_id,),
        ).fetchone()
        behavior = dict(beh_row) if beh_row else {
            "time_on_lesson": 0, "pauses": 0, "replays_video": False,
            "code_runs": 0, "errors_per_run": 0, "time_to_fix_error": 0,
            "hints_used": 0, "skips": 0, "abandon_rate": 0.0,
        }

        # ---- recent submissions ----
        # NOTE: your schema has no 'total_tests' column, so we compute a rough
        # total from passed_tests (adjust if you later add a real column).
        submissions_rows = conn.execute(
            """
            SELECT s.submission_id, s.language, s.passed_tests, s.timestamp,
                   m.title AS module_title
            FROM code_submissions s
            LEFT JOIN webdev_modules m ON m.module_id = s.module_id
            WHERE s.student_id = ?
            ORDER BY s.timestamp DESC
            LIMIT 5
            """,
            (student_id,),
        ).fetchall()

        submissions = []
        for s in submissions_rows:
            d = dict(s)
            d["total_tests"] = max(d["passed_tests"] or 0, 1)
            submissions.append(d)

        # ---- mistake patterns ----
        mistakes = conn.execute(
            """
            SELECT error_type, frequency, pattern_description
            FROM mistake_patterns
            WHERE student_id = ?
            ORDER BY frequency DESC
            LIMIT 5
            """,
            (student_id,),
        ).fetchall()

        # ---- AI interactions ----
        ai_interactions = conn.execute(
            """
            SELECT question_asked, hint_given, response_generated,
                   resolved, response_time, timestamp
            FROM ai_interactions
            WHERE student_id = ?
            ORDER BY interaction_id DESC
            LIMIT 5
            """,
            (student_id,),
        ).fetchall()

        # ---- quiz score mini-chart (map module scores to bars) ----
        quiz_scores = [
            {"label": f"M{m['module_id']}", "score": int(m["score"])}
            for m in modules
            if m["score"] is not None
        ][-6:]

        performance = {
            "quizzes_passed":   completed_modules,
            "projects_pending": max(0, total_modules - completed_modules),
        }

        return templates.TemplateResponse(
            request=request,
            name="profile.html",
            context={
                "student":         dict(student),
                "stats":           stats,
                "engagement":      engagement,
                "behavior":        behavior,
                "modules":         [dict(m) for m in modules],
                "submissions":     submissions,
                "mistakes":        [dict(m) for m in mistakes],
                "ai_interactions": [dict(i) for i in ai_interactions],
                "quiz_scores":     quiz_scores,
                "performance":     performance,
            },
        )
    finally:
        conn.close()
        
@app.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="session_id",
        path="/",
        httponly=True,
        samesite="lax"
    )
    return {"message": "Logged out successfully"}
    
@app.post("/register")
def register(user: RegisterRequest,response: Response):
    db = Database()
    conn = db.get_connection()

    if len(user.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters."
        )

    try:
        # Check whether email already exists
        existing_student = conn.execute(
            """
            SELECT student_id
            FROM students
            WHERE email = ?
            """,
            (user.email,)
        ).fetchone()

        if existing_student:
            raise HTTPException(
                status_code=400,
                detail="Email is already registered."
            )

        hashed_password = password_hash.hash(user.password)

        # Create student
        cursor = conn.execute(
            """
            INSERT INTO students (
                name,
                surname,
                school,
                email,
                age_group,
                learning_style,
                password_hash,
                goal
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user.name,
                user.surname,
                user.school,
                user.email,
                user.age_group,
                user.learning_style,
                hashed_password,
                user.goal
            )
        )

        conn.commit()
        student_id = cursor.lastrowid

    finally:
        conn.close()

    session_id = create_session(student_id)
    set_session_cookie(response,session_id)

    return {
        "message": "Registration successful.",
        "student_id": student_id
    }


@app.get("/me/edit")
def edit_profile_page(request: Request):
    student = get_current_student(request)
    if student is None:
        return RedirectResponse("/login", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="edit_profile.html",
        context={"student": dict(student)},
    )


@app.post("/me/edit")
def update_profile(
    request: Request,
    name: str = Form(...),
    surname: str = Form(...),
    school: str = Form(...),
    email: str = Form(...),
    age_group: str = Form(""),
    learning_style: str = Form(""),
    goal: str = Form(...),
):
    student = get_current_student(request)
    if student is None:
        return RedirectResponse("/login", status_code=303)

    student_id = student["student_id"]

    db = Database()
    conn = db.get_connection()
    try:
        # guard against email collisions (email is UNIQUE)
        existing = conn.execute(
            "SELECT student_id FROM students WHERE email = ? AND student_id != ?",
            (email.strip(), student_id),
        ).fetchone()

        if existing:
            return templates.TemplateResponse(
                request=request,
                name="edit_profile.html",
                context={
                    "student": dict(student),
                    "error": "That email is already in use by another account.",
                },
                status_code=400,
            )

        conn.execute(
            """
            UPDATE students
               SET name = ?,
                   surname = ?,
                   school = ?,
                   email = ?,
                   age_group = ?,
                   learning_style = ?,
                   goal = ?
             WHERE student_id = ?
            """,
            (
                name.strip(),
                surname.strip(),
                school.strip(),
                email.strip(),
                age_group.strip() or None,
                learning_style.strip() or None,
                goal.strip(),
                student_id,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    return RedirectResponse("/profile", status_code=303)


# =====================================================================
# GAME STATE API
# =====================================================================
# All routes require a valid session cookie (student_id resolved via
# get_current_student). All write the corresponding tables:
#   user_xp, xp_events, user_progress, user_badges.
# =====================================================================

XP_PER_LEVEL = 100

class XPRequest(BaseModel):
    amount: int
    reason: str
    lesson_slug: str | None = None
    challenge_slug: str | None = None

class ProgressRequest(BaseModel):
    lesson_slug: str
    challenge_slug: str | None = None
    completed: bool = True
    score: float | None = None
    response_data: str | None = None

class BadgeRequest(BaseModel):
    slug: str

def _ensure_user_xp(conn, student_id: int) -> None:
    """Create a user_xp row if the student doesn't have one yet."""
    conn.execute(
        """
        INSERT OR IGNORE INTO user_xp
            (student_id, total_xp, level, current_streak, longest_streak, updated_at)
        VALUES (?, 0, 1, 0, 0, ?)
        """,
        (student_id, datetime.now(timezone.utc).isoformat()),
    )

def _resolve_challenge_id(conn, lesson_slug: str, challenge_slug: str | None):
    """Map (lesson_slug, challenge_slug) -> challenges.id, or None."""
    if not challenge_slug:
        return None
    row = conn.execute(
        """
        SELECT c.id
          FROM challenges c
          JOIN lessons l ON l.id = c.lesson_id
         WHERE l.slug = ? AND c.slug = ?
        """,
        (lesson_slug, challenge_slug),
    ).fetchone()
    return row["id"] if row else None

@app.get("/api/state")
def api_state(request: Request):
    """Return the full game state for the logged-in student."""
    student = get_current_student(request)
    if student is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sid = student["student_id"]
    db = Database()
    conn = db.get_connection()
    try:
        _ensure_user_xp(conn, sid)
        conn.commit()

        xp_row = conn.execute(
            """
            SELECT total_xp, level, current_streak, longest_streak, last_active
              FROM user_xp
             WHERE student_id = ?
            """,
            (sid,),
        ).fetchone()

        badges = conn.execute(
            """
            SELECT b.slug, b.name, b.description, b.icon, ub.earned_at
              FROM user_badges ub
              JOIN badges b ON b.id = ub.badge_id
             WHERE ub.student_id = ?
            """,
            (sid,),
        ).fetchall()

        progress = conn.execute(
            """
            SELECT l.slug AS lesson_slug,
                   c.slug AS challenge_slug,
                   up.completed,
                   up.score,
                   up.response_data,
                   up.attempts
              FROM user_progress up
              LEFT JOIN lessons    l ON l.id = up.lesson_id
              LEFT JOIN challenges c ON c.id = up.challenge_id
             WHERE up.student_id = ?
            """,
            (sid,),
        ).fetchall()

        return {
            "xp": dict(xp_row),
            "badges": [dict(b) for b in badges],
            "progress": [dict(p) for p in progress],
        }
    finally:
        conn.close()


@app.post("/api/xp")
def api_award_xp(request: Request, payload: XPRequest):
    """Insert an xp_event, add to user_xp.total_xp, recompute level."""
    student = get_current_student(request)
    if student is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sid = student["student_id"]
    db = Database()
    conn = db.get_connection()
    try:
        challenge_id = _resolve_challenge_id(
            conn, payload.lesson_slug, payload.challenge_slug
        )
        now = datetime.now(timezone.utc).isoformat()

        _ensure_user_xp(conn, sid)

        conn.execute(
            """
            INSERT INTO xp_events (student_id, amount, reason, challenge_id, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (sid, payload.amount, payload.reason, challenge_id, now),
        )

        conn.execute(
            """
            UPDATE user_xp
               SET total_xp = total_xp + ?,
                   updated_at = ?
             WHERE student_id = ?
            """,
            (payload.amount, now, sid),
        )

        row = conn.execute(
            "SELECT total_xp FROM user_xp WHERE student_id = ?", (sid,)
        ).fetchone()
        new_total = row["total_xp"]
        new_level = (new_total // XP_PER_LEVEL) + 1

        conn.execute(
            "UPDATE user_xp SET level = ? WHERE student_id = ?",
            (new_level, sid),
        )
        conn.commit()

        return {"total_xp": new_total, "level": new_level, "awarded": payload.amount}
    finally:
        conn.close()


@app.post("/api/progress")
def api_save_progress(request: Request, payload: ProgressRequest):
    """Upsert a row in user_progress for (student, lesson[, challenge])."""
    student = get_current_student(request)
    if student is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sid = student["student_id"]
    db = Database()
    conn = db.get_connection()
    try:
        lesson = conn.execute(
            "SELECT id FROM lessons WHERE slug = ?", (payload.lesson_slug,)
        ).fetchone()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        lesson_id = lesson["id"]

        challenge_id = _resolve_challenge_id(
            conn, payload.lesson_slug, payload.challenge_slug
        )

        now = datetime.now(timezone.utc).isoformat()

        existing = conn.execute(
            """
            SELECT id FROM user_progress
             WHERE student_id = ?
               AND lesson_id = ?
               AND (challenge_id IS ? OR challenge_id = ?)
            """,
            (sid, lesson_id, challenge_id, challenge_id),
        ).fetchone()

        if existing:
            conn.execute(
                """
                UPDATE user_progress
                   SET completed     = ?,
                       score         = COALESCE(?, score),
                       response_data = COALESCE(?, response_data),
                       attempts      = attempts + 1,
                       completed_at  = CASE WHEN ? = 1 THEN ? ELSE completed_at END,
                       updated_at    = ?
                 WHERE id = ?
                """,
                (
                    1 if payload.completed else 0,
                    payload.score,
                    payload.response_data,
                    1 if payload.completed else 0,
                    now,
                    now,
                    existing["id"],
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO user_progress
                    (student_id, challenge_id, lesson_id, completed, score,
                     attempts, response_data, first_started_at, completed_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
                """,
                (
                    sid,
                    challenge_id,
                    lesson_id,
                    1 if payload.completed else 0,
                    payload.score,
                    payload.response_data,
                    now,
                    now if payload.completed else None,
                    now,
                ),
            )

        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.post("/api/badges/unlock")
def api_unlock_badge(request: Request, payload: BadgeRequest):
    """Award a badge by slug (idempotent — one user_badges row per badge)."""
    student = get_current_student(request)
    if student is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sid = student["student_id"]
    db = Database()
    conn = db.get_connection()
    try:
        badge = conn.execute(
            "SELECT id, name, description FROM badges WHERE slug = ?",
            (payload.slug,),
        ).fetchone()
        if not badge:
            raise HTTPException(status_code=404, detail="Badge not found")

        already = conn.execute(
            "SELECT id FROM user_badges WHERE student_id = ? AND badge_id = ?",
            (sid, badge["id"]),
        ).fetchone()

        if already:
            return {"unlocked": False, "name": badge["name"]}

        conn.execute(
            """
            INSERT INTO user_badges (student_id, badge_id, earned_at)
            VALUES (?, ?, ?)
            """,
            (sid, badge["id"], datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
        return {
            "unlocked": True,
            "name": badge["name"],
            "description": badge["description"],
        }
    finally:
        conn.close()


@app.post("/api/reset")
def api_reset(request: Request):
    """Wipe the logged-in student's game state (dev / start-over)."""
    student = get_current_student(request)
    if student is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sid = student["student_id"]
    db = Database()
    conn = db.get_connection()
    try:
        conn.execute("DELETE FROM user_progress WHERE student_id = ?", (sid,))
        conn.execute("DELETE FROM user_badges   WHERE student_id = ?", (sid,))
        conn.execute("DELETE FROM xp_events     WHERE student_id = ?", (sid,))
        conn.execute(
            """
            UPDATE user_xp
               SET total_xp = 0, level = 1, current_streak = 0,
                   longest_streak = 0, updated_at = ?
             WHERE student_id = ?
            """,
            (datetime.now(timezone.utc).isoformat(), sid),
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()