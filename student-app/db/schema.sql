-- Student Records schema (SQLite)
-- Runs automatically when the server starts.

CREATE TABLE IF NOT EXISTS courses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    duration    INTEGER NOT NULL CHECK (duration > 0)   -- in months
);

CREATE TABLE IF NOT EXISTS students (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    age         INTEGER NOT NULL CHECK (age BETWEEN 10 AND 100),
    course_id   INTEGER NOT NULL REFERENCES courses(id),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_students_course ON students(course_id);
