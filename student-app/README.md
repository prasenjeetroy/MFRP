# Student Records App

A small full-stack project you can run in VS Code:

| Layer     | Tech              | File(s)                     |
|-----------|-------------------|-----------------------------|
| Structure | HTML              | `public/index.html`         |
| Styling   | CSS               | `public/style.css`          |
| Frontend  | JavaScript        | `public/app.js`             |
| Backend   | Python (Flask)    | `app.py`                    |
| Storage   | SQL (SQLite)      | `db/schema.sql`, `db/seed.sql` |

## Run it in VS Code

1. Open the `student-app` folder in VS Code (**File → Open Folder**).
2. Open a terminal (**Terminal → New Terminal**) and create a virtual environment:

   ```bash
   python -m venv .venv
   ```

3. Activate it. On Windows:

   ```bash
   .venv\Scripts\activate
   ```

   On macOS/Linux:

   ```bash
   source .venv/bin/activate
   ```

4. Install Flask:

   ```bash
   pip install -r requirements.txt
   ```

5. Start the server:

   ```bash
   python app.py
   ```

6. Open http://localhost:5000 in your browser.

The database file `db/students.db` is created on first run, with sample data from `db/seed.sql`.
Delete it to start fresh.

## API

| Method | URL                     | What it does                      |
|--------|-------------------------|-----------------------------------|
| GET    | `/api/courses`          | List courses                      |
| GET    | `/api/students?q=text`  | List / search students            |
| POST   | `/api/students`         | Add a student (JSON body)         |
| PUT    | `/api/students/<id>`    | Update a student                  |
| DELETE | `/api/students/<id>`    | Delete a student                  |

Example body: `{"name": "Asha Rao", "email": "asha@example.com", "age": 22, "course_id": 1}`

## Viewing the SQL data

Install the **SQLite Viewer** extension in VS Code and click `db/students.db`,
or use the `sqlite3` command line:

```bash
sqlite3 db/students.db "SELECT * FROM students;"
```
