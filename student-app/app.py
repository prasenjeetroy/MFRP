"""Student Records backend: Flask REST API + SQLite storage.

Run:  python app.py   then open http://localhost:5000
"""
import re
import sqlite3
from pathlib import Path

from flask import Flask, g, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "db" / "students.db"
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

STUDENT_SELECT = """
    SELECT s.id, s.name, s.email, s.age, s.course_id, c.name AS course, s.created_at
    FROM students s JOIN courses c ON c.id = s.course_id
"""

app = Flask(__name__, static_folder="public", static_url_path="")


# ---------- Database helpers ----------
def get_db():
    """One connection per request, stored on Flask's `g` object."""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row  # rows behave like dicts
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create tables, and load sample data the first time only."""
    with sqlite3.connect(DB_PATH) as db:
        db.executescript((BASE_DIR / "db" / "schema.sql").read_text())
        if db.execute("SELECT COUNT(*) FROM courses").fetchone()[0] == 0:
            db.executescript((BASE_DIR / "db" / "seed.sql").read_text())


def get_student(student_id):
    row = get_db().execute(f"{STUDENT_SELECT} WHERE s.id = ?", (student_id,)).fetchone()
    return dict(row) if row else None


# ---------- Validation ----------
def validate_student(data):
    """Return (clean_data, error_message). Exactly one of them is None."""
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    age = data.get("age")
    course_id = data.get("course_id")

    if len(name) < 2:
        return None, "Name must be at least 2 characters"
    if not EMAIL_RE.match(email):
        return None, "Email is invalid"
    if not isinstance(age, int) or isinstance(age, bool) or not 10 <= age <= 100:
        return None, "Age must be a whole number between 10 and 100"
    if not get_db().execute("SELECT 1 FROM courses WHERE id = ?", (course_id,)).fetchone():
        return None, "Course does not exist"

    return {"name": name, "email": email, "age": age, "course_id": course_id}, None


def error(message, status):
    return jsonify({"error": message}), status


# ---------- Routes ----------
@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/api/courses")
def list_courses():
    rows = get_db().execute("SELECT * FROM courses ORDER BY name").fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/students")
def list_students():
    q = f"%{request.args.get('q', '').strip()}%"
    rows = get_db().execute(
        f"{STUDENT_SELECT} WHERE s.name LIKE ? OR s.email LIKE ? ORDER BY s.id DESC",
        (q, q),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/students")
def create_student():
    data, err = validate_student(request.get_json(silent=True) or {})
    if err:
        return error(err, 400)
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO students (name, email, age, course_id) VALUES (?, ?, ?, ?)",
            (data["name"], data["email"], data["age"], data["course_id"]),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return error("A student with this email already exists", 409)
    return jsonify(get_student(cur.lastrowid)), 201


@app.put("/api/students/<int:student_id>")
def update_student(student_id):
    data, err = validate_student(request.get_json(silent=True) or {})
    if err:
        return error(err, 400)
    db = get_db()
    try:
        cur = db.execute(
            "UPDATE students SET name = ?, email = ?, age = ?, course_id = ? WHERE id = ?",
            (data["name"], data["email"], data["age"], data["course_id"], student_id),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return error("A student with this email already exists", 409)
    if cur.rowcount == 0:
        return error("Student not found", 404)
    return jsonify(get_student(student_id))


@app.delete("/api/students/<int:student_id>")
def delete_student(student_id):
    db = get_db()
    cur = db.execute("DELETE FROM students WHERE id = ?", (student_id,))
    db.commit()
    if cur.rowcount == 0:
        return error("Student not found", 404)
    return "", 204


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
