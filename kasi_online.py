"""
eKasi Digital Hub
Backend service: PDF tooling gateway + opportunity feed.
"""

import os
import sys
import uuid
import shutil
import pathlib
import tempfile
import subprocess
import sqlite3
from datetime import datetime

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    send_file,
    current_app,
)
from flask_cors import CORS
from werkzeug.utils import secure_filename


# ---------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------
EKASI_BASE = os.path.join(tempfile.gettempdir(), "ekasi")
UPLOAD_FOLDER = os.environ.get(
    "EKASI_UPLOAD_FOLDER", os.path.join(EKASI_BASE, "uploads")
)
OUTPUT_FOLDER = os.environ.get(
    "EKASI_OUTPUT_FOLDER", os.path.join(EKASI_BASE, "output")
)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
CONVERSION_TIMEOUT = 120          # seconds
ALLOWED_EXTENSIONS = {"pdf"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


# ---------------------------------------------------------------
# LibreOffice discovery
# ---------------------------------------------------------------
def resolve_libreoffice_bin():
    """
    Locate the LibreOffice binary across platforms.
    Returns the path, or None if not found (so the app still boots).
    """
    explicit = os.environ.get("EKASI_LIBREOFFICE_BIN")
    if explicit and os.path.exists(explicit):
        return explicit

    for name in ("soffice", "soffice.exe", "libreoffice"):
        found = shutil.which(name)
        if found:
            return found

    if sys.platform.startswith("win"):
        candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
    elif sys.platform == "darwin":
        candidates = [
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        ]
    else:
        candidates = [
            "/usr/bin/soffice",
            "/usr/local/bin/soffice",
            "/opt/libreoffice/program/soffice",
        ]

    for path in candidates:
        if os.path.exists(path):
            return path

    return None


LIBREOFFICE_BIN = resolve_libreoffice_bin()


# ---------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------
app = Flask(__name__)
CORS(app)

DB = "database.db"


# ---------------------------------------------------------------
# Database
# ---------------------------------------------------------------
def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS opportunities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            provider TEXT,
            type TEXT,
            province TEXT,
            sector TEXT,
            closing_date TEXT,
            link TEXT,
            youth_setaside INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def seed_if_empty():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM opportunities")
    if c.fetchone()[0] == 0:
        samples = [
            ("Supply of IT Equipment - KZN Department of Health",
             "KZN Department of Health", "tender", "KwaZulu-Natal",
             "ICT", "2026-11-15", "https://www.etenders.gov.za", 1),
            ("Youth Learnership - Software Development",
             "Harambee", "learnership", "National",
             "Technology", "2026-10-30", "https://sayouth.mobi", 0),
            ("Cleaning Services Tender - City of Johannesburg",
             "City of Johannesburg", "tender", "Gauteng",
             "Facilities", "2026-11-01", "https://www.etenders.gov.za", 1),
            ("Small Business Funding - SEFA",
             "Small Enterprise Finance Agency", "funding", "National",
             "Finance", "2026-12-31", "https://www.sefa.org.za", 0),
            ("General Worker Positions - SASSA",
             "SASSA", "job", "Eastern Cape",
             "Public Service", "2026-10-25", "https://www.sassa.gov.za", 0),
            ("Catering Tender - SAPS Academy",
             "SAPS", "tender", "Free State",
             "Catering", "2026-11-20", "https://www.etenders.gov.za", 1),
        ]
        c.executemany("""
            INSERT INTO opportunities
            (title, provider, type, province, sector, closing_date, link, youth_setaside)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, samples)
        conn.commit()
    conn.close()


init_db()
seed_if_empty()


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def cleanup_job(input_path, output_dir, job_id):
    """Remove temporary files and LibreOffice profile directory."""
    try:
        if input_path and os.path.exists(input_path):
            os.remove(input_path)
    except OSError:
        pass

    profile = os.path.join(output_dir, f"profile_{job_id}")
    if os.path.isdir(profile):
        shutil.rmtree(profile, ignore_errors=True)

    try:
        for f in os.listdir(output_dir):
            if f.startswith(job_id):
                try:
                    os.remove(os.path.join(output_dir, f))
                except OSError:
                    pass
    except OSError:
        pass


def run_libreoffice_conversion(input_path, output_dir, job_id):
    """
    Invoke LibreOffice in headless mode to convert PDF to DOCX.
    Returns the path to the generated .docx file.
    """
    if not LIBREOFFICE_BIN:
        raise RuntimeError(
            "LibreOffice is not installed or could not be located."
        )

    user_profile = os.path.join(output_dir, f"profile_{job_id}")
    os.makedirs(user_profile, exist_ok=True)

    profile_uri = pathlib.Path(user_profile).as_uri()

    cmd = [
        LIBREOFFICE_BIN,
        "--headless",
        "--invisible",
        "--norestore",
        "--nologo",
        "--nolockcheck",
        f"-env:UserInstallation={profile_uri}",
        "--infilter=writer_pdf_import",
        "--convert-to",
        "docx:MS Word 2007 XML",
        "--outdir",
        output_dir,
        input_path,
    ]

    current_app.logger.info("Running LibreOffice: %s", " ".join(cmd))

    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=CONVERSION_TIMEOUT,
        check=False,
    )

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        current_app.logger.error("LibreOffice failed: %s", stderr)
        raise RuntimeError(f"LibreOffice conversion failed: {stderr}")

    expected_output = os.path.join(output_dir, f"{job_id}.docx")

    if not os.path.exists(expected_output):
        candidates = [
            f for f in os.listdir(output_dir)
            if f.startswith(job_id) and f.endswith(".docx")
        ]
        if not candidates:
            raise RuntimeError("Conversion produced no output file")
        expected_output = os.path.join(output_dir, candidates[0])

    return expected_output


# ---------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/tools")
def tools():
    return render_template("tools.html")


@app.route("/opportunities")
def opportunities():
    return render_template("opportunities.html")


# ---------------------------------------------------------------
# API — opportunity feed
# ---------------------------------------------------------------
@app.route("/api/opportunities")
def api_opportunities():
    province = request.args.get("province", "").strip()
    otype = request.args.get("type", "").strip()
    youth = request.args.get("youth", "").strip()

    query = "SELECT * FROM opportunities WHERE 1=1"
    params = []

    if province and province != "All":
        query += " AND province = ?"
        params.append(province)
    if otype and otype != "All":
        query += " AND type = ?"
        params.append(otype)
    if youth == "1":
        query += " AND youth_setaside = 1"

    query += " ORDER BY closing_date ASC"

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows])


@app.route("/api/stats")
def api_stats():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    total = c.execute("SELECT COUNT(*) FROM opportunities").fetchone()[0]
    tenders = c.execute(
        "SELECT COUNT(*) FROM opportunities WHERE type='tender'"
    ).fetchone()[0]
    youth = c.execute(
        "SELECT COUNT(*) FROM opportunities WHERE youth_setaside=1"
    ).fetchone()[0]
    conn.close()
    return jsonify({"total": total, "tenders": tenders, "youth": youth})


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "time": datetime.now().isoformat()})


# ---------------------------------------------------------------
# API — PDF to Word conversion
# ---------------------------------------------------------------
@app.route("/api/convert/pdf-to-word", methods=["POST"])
def convert_pdf_to_word():
    """
    Convert an uploaded PDF to DOCX using LibreOffice headless.
    Pipeline: validate -> save -> convert -> return -> cleanup.
    """
    if not LIBREOFFICE_BIN:
        return jsonify({
            "error": "PDF to Word is not available. "
                     "LibreOffice is not installed on this server."
        }), 503

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are accepted"}), 400

    original_name = secure_filename(file.filename)
    job_id = uuid.uuid4().hex
    input_path = os.path.join(UPLOAD_FOLDER, f"{job_id}.pdf")

    try:
        file.save(input_path)

        if os.path.getsize(input_path) > MAX_FILE_SIZE:
            return jsonify({"error": "File exceeds 20 MB limit"}), 413

        output_path = run_libreoffice_conversion(
            input_path, OUTPUT_FOLDER, job_id
        )

        return send_file(
            output_path,
            as_attachment=True,
            download_name=(
                os.path.splitext(original_name)[0] + ".docx"
            ),
            mimetype=(
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            ),
        )

    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "Conversion timed out. Try a smaller file."
        }), 504

    except RuntimeError as exc:
        current_app.logger.error("Conversion failed: %s", exc)
        return jsonify({"error": str(exc)}), 500

    except Exception:
        current_app.logger.exception("Unexpected conversion error")
        return jsonify({"error": "Conversion failed. Please try again."}), 500

    finally:
        cleanup_job(input_path, OUTPUT_FOLDER, job_id)


# ---------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------
if __name__ == "__main__":
    if LIBREOFFICE_BIN:
        print(f"[eKasi] LibreOffice detected at: {LIBREOFFICE_BIN}")
    else:
        print("[eKasi] WARNING: LibreOffice not found. "
              "PDF to Word will return 503 until installed.")

    app.run(debug=True, host="0.0.0.0", port=5000)