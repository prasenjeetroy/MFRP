# Income Tracker

A multi-user income and expense tracker.

- **Front end:** React 18 (compiled in the browser by Babel, so there's no build step), with a flexbox layout
- **API:** Node.js and Express in `server/`
- **Database:** Microsoft SQL Server, accessed through the `mssql` package with parameterised queries
- **Accounts:** sign up and sign in. Passwords are hashed with bcrypt and sessions are kept in an httpOnly cookie. Every user sees only their own transactions.

## Why the original version didn't work

| Problem | Fix |
| --- | --- |
| The page called `/api/transactions`, but no server existed to answer it | Added an Express API backed by SQL Server (`server/`) |
| Opening `index.html` by double-clicking it (`file://`) stops Babel from loading `script-4.js` | Express now serves the page at `http://localhost:3000` |
| `react@18` and the Babel URL weren't pinned, so a new release could break the page | Pinned to exact versions |
| SQL Server `DATE` values reached the browser as `2026-11-01T00:00:00.000Z` and could show the wrong day | SQL returns plain `YYYY-MM-DD` text |
| An HTML error page made `response.json()` throw "Unexpected token <" | The API client reads the response as text first and always shows a readable message |
| No users: everyone shared one list | Added an account system, and every query is filtered by `UserId` |
| Grid layout broke on small screens | Rebuilt with flexbox and `flex-wrap` |

## Project layout

```
income-tracker/
├─ database/schema.sql        tables, constraints, index (safe to re-run)
├─ scripts/init-db.js         runs schema.sql  →  npm run db:init
├─ server/
│  ├─ index.js                Express app, security headers, static files
│  ├─ config.js               reads and checks .env
│  ├─ db.js                   shared SQL Server connection pool
│  ├─ auth.js                 session cookie + requireAuth middleware
│  ├─ validate.js             input validation
│  ├─ errors.js               JSON error responses
│  └─ routes/{auth,transactions}.js
├─ public/                    index.html, app.js (React), style.css
├─ api.http                   ready-made API requests for VS Code REST Client
└─ .vscode/                   workspace settings, debugger, recommended extensions
```

## Setup

### 1. Install

- **Node.js 18 or newer**: https://nodejs.org
- **SQL Server 2019 or 2022.** The free *Express* or *Developer* edition is fine.
- **VS Code**

### 2. Prepare SQL Server (one time)

The Node driver connects over TCP with a SQL login, so turn on two things:

1. **Turn on SQL logins.** In SSMS, right-click the server, open *Properties → Security*, choose *SQL Server and Windows Authentication mode*, then restart the SQL Server service. Make sure the `sa` login is enabled and has a password, or create your own login (see the end of `schema.sql`).
2. **Turn on TCP/IP.** Open *SQL Server Configuration Manager → SQL Server Network Configuration → Protocols for SQLEXPRESS* (or *MSSQLSERVER*) and set *TCP/IP* to **Enabled**, then restart the service.
   - **Default instance:** it listens on port 1433, so set `DB_PORT=1433`.
   - **Named instance (`SQLEXPRESS`):** either set `DB_INSTANCE=SQLEXPRESS` and start the **SQL Server Browser** service, or go to *TCP/IP → IP Addresses → IPAll*, set *TCP Port* to `1433`, clear *TCP Dynamic Ports*, and use `DB_PORT=1433`.

If you don't have a local SQL Server, you can run one with Docker instead:

```bash
docker run -d --name mssql -e ACCEPT_EULA=Y -e "MSSQL_SA_PASSWORD=Your_Str0ng_Pass!" -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
```

### 3. Configure, create tables, run

Open the **`income-tracker` folder** in VS Code (*File → Open Folder*) so the `.vscode` settings take effect. Then, in the terminal (`` Ctrl+` ``):

```bash
npm install
```

```bash
cp .env.example .env
```

(On Windows PowerShell, use `copy .env.example .env` instead.) Edit `.env` to set `DB_PASSWORD`, plus `DB_PORT` or `DB_INSTANCE`, and a random `JWT_SECRET`. This command prints one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```bash
npm run db:init
```

```bash
npm run dev
```

Open **http://localhost:3000**, create an account and start adding transactions. To see the multi-user separation, sign up a second account in a private window.

## VS Code settings

When you open the folder, VS Code offers to install the recommended extensions. Accept the offer, or install them yourself:

| Extension | Why |
| --- | --- |
| **SQL Server (mssql)** (`ms-mssql.mssql`) | Browse the database and run `schema.sql` or ad-hoc queries in VS Code |
| **Prettier** (`esbenp.prettier-vscode`) | Formats code on save (`.prettierrc.json`) |
| **REST Client** (`humao.rest-client`) | Click *Send Request* in `api.http` to test the API |
| **DotENV** (`mikestead.dotenv`) | Syntax highlighting for `.env` |

What `.vscode/settings.json` does:

- Formats with Prettier on save, uses 2-space indentation and LF line endings, and trims trailing whitespace.
- Treats `public/app.js` as **JavaScript React**, so JSX gets proper highlighting, IntelliSense and Emmet.
- Adds an **"IncomeTracker (local)"** connection to the SQL Server extension. Open the *SQL Server* icon in the sidebar and connect. It asks for the `sa` password the first time and saves it in your OS keychain. Edit `server` or `user` there if yours differ.

Debugging (`.vscode/launch.json`, *Run and Debug* panel, `Ctrl+Shift+D`):

- **Server: debug API** runs the API with `.env` loaded and restarts on file changes. Set breakpoints in `server/`.
- **Full stack (server + browser)** starts the API and opens Chrome with the debugger attached.
- **Database: create tables** is the same as `npm run db:init`.

## API

All `/api/transactions` routes need a signed-in session.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ email, displayName, password }` creates an account and signs in |
| POST | `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/logout` | Ends the session |
| GET | `/api/auth/me` | Returns the current user |
| GET | `/api/transactions?start&end&type` | Newest 500 rows, plus totals for the whole range (SQL `SUM`) |
| GET | `/api/transactions/summary?from=YYYY-MM-01` | Income and expense per month (SQL `GROUP BY`) |
| GET | `/api/transactions/categories` | Your categories, most used first (for autocomplete) |
| POST | `/api/transactions` | Creates a transaction |
| PUT | `/api/transactions/:id` | Updates a transaction (only your own) |
| DELETE | `/api/transactions/:id` | Deletes a transaction (only your own) |
| GET | `/api/health` | Checks whether the database is reachable |

## Security

- Every SQL statement uses parameters (`@userId`, `@title` and so on). User input is never pasted into SQL text.
- Each read, update and delete includes `WHERE UserId = @userId`, so guessing another user's id returns *404*.
- Passwords are hashed with bcrypt (cost 12). A wrong email and a wrong password get the same message and take the same time.
- Sign-in and sign-up are rate-limited (20 attempts per 15 minutes per IP).
- The session cookie is `httpOnly` and `SameSite=Lax`, and `Secure` in production. Requests that change data must be JSON, which blocks cross-site form posts.
- The database enforces the same rules again: `CHECK` constraints, a unique email, and a foreign key with cascade delete.

## Troubleshooting

| Message | Cause |
| --- | --- |
| `Cannot reach the database…` / `ESOCKET` | SQL Server isn't running, TCP/IP is off, or the port or instance is wrong (see step 2) |
| `Login failed for user 'sa'` | Wrong password, or SQL authentication isn't turned on |
| `Failed to lookup instance` | `DB_INSTANCE` is set, but the SQL Server Browser service isn't running |
| `self-signed certificate` | Set `DB_TRUST_CERT=true` for a local server |
| Blank page | You opened the file directly. Use `http://localhost:3000` |

## Going to production

In-browser Babel is fine for learning but slow for real users. To ship this, move `public/app.js` into a Vite React project (`npm create vite@latest`) and serve its `dist/` folder from Express. Also set `NODE_ENV=production`, serve over HTTPS, and use a least-privilege SQL login instead of `sa`.
