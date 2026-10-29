-- Sample data. app.py loads this only when the database is empty.

INSERT INTO courses (id, name, duration) VALUES
    (1, 'Web Development', 6),
    (2, 'Data Science',    9),
    (3, 'Salesforce Admin', 3),
    (4, 'Cloud Computing', 4);

INSERT INTO students (name, email, age, course_id) VALUES
    ('Aarav Sharma', 'aarav@example.com', 21, 1),
    ('Diya Patel',   'diya@example.com',  23, 2),
    ('Rohan Das',    'rohan@example.com', 22, 3),
    ('Meera Iyer',   'meera@example.com', 24, 1);

-- Handy queries to try in a SQLite client:
-- SELECT * FROM students;
-- SELECT c.name AS course, COUNT(s.id) AS total
--   FROM courses c LEFT JOIN students s ON s.course_id = c.id
--   GROUP BY c.id;
