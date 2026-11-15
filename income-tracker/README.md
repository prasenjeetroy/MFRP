# Income Tracker

A multi-user income and expense tracker.

- **Front end:** React 18 with [htm](https://github.com/developit/htm) (JSX-like syntax with no build step), with a flexbox layout
- **API:** Node.js and Express
- **One JavaScript file:** the server and the React app both live in `script-4.js`
- **Database:** Microsoft SQL Server, accessed through the `mssql` package with parameterised queries
- **Accounts:** sign up and sign in. Passwords are hashed with bcrypt and sessions are kept in an httpOnly cookie. Every user sees only their own transactions.

## Why the original version didn't work

| Problem | Fix |
| --- | --- |
| The page called `/api/transactions`, but no server existed to answer it | Added an Express API backed by SQL Server (`script-4.js`) |
| Opening `index-4.html` by double-clicking it (`file://`) stops the in-browser compiler from loading `script-4.js` | Express now serves the page at `http://localhost:3000` |
| `react@18` and the Babel URL weren't pinned (Babel is gone now), so a new release could break the page | Pinned to exact versions |
| SQL Server `DATE` values reached the browser as `2026-11-01T00:00:00.000Z` and could show the wrong day | SQL returns plain `YYYY-MM-DD` text |
| An HTML error page made `response.json()` throw "Unexpected token <" | The API client reads the response as text first and always shows a readable message |
| No users: everyone shared one list | Added an account system, and every query is filtered by `UserId` |
| Grid layout broke on small screens | Rebuilt with flexbox and `flex-wrap` |

## Project layout

```
income-tracker/
├─ script-4.js                ALL the JavaScript: settings, database, validation,
│                             login, API routes and the React app
│                             (npm run dev / npm run db:init)
├─ database/schema.sql        tables, constraints, index (safe to re-run)
├─ public/
│  ├─ index-4.html            the page
│  └─ style-4.css             flexbox layout
├─ api.http                   ready-made API requests for VS Code REST Client
└─ .vscode/                   workspace settings, debugger, recommended extensions
```

### How one file serves both the server and the browser

The React app lives in section 8 of `script-4.js`, inside a function called `browserApp()`. Node never runs that function. The page loads `/script-4.js`, but the server doesn't send the file as it is on disk. It sends **only that function's source code**. The database and login code in the rest of the file never reaches the browser.

Two rules follow from this:

1. Inside `browserApp()`, use only browser things (`React`, `ReactDOM`, `htm`, `fetch`, `window`) and code defined inside it. A server variable from outside the function won't exist in the browser.
2. Write markup with `htm` instead of JSX, because Node can't read JSX:

| JSX | htm |
| --- | --- |
| `<div className="row">{name}</div>` | ``html`<div className="row">${name}</div>` `` |
| `<Field label="Title" grow={2}>…</Field>` | ``html`<${Field} label="Title" grow=${2}>…<//>` `` |
| `{items.map(i => <li key={i}>{i}</li>)}` | ``${items.map(i => html`<li key=${i}>${i}</li>`)}`` |

## Setup

### Easiest: the ready-made Dev Container (recommended)

You don't need to install SQL Server or Node.js. `.devcontainer/` describes a complete environment, with Node.js 22 and SQL Server 2022 in Docker, and VS Code builds it for you.

1. Install **Docker Desktop** (https://www.docker.com/products/docker-desktop) and start it.
   - On Windows, keep the default *WSL 2* option.
   - On Apple-silicon Macs, turn on *Settings → General → Use Rosetta*, because SQL Server only ships for Intel.
2. In VS Code, install the **Dev Containers** extension (`ms-vscode-remote.remote-containers`).
3. Open the `income-tracker` folder, press `F1`, and run **Dev Containers: Reopen in Container**.
4. The first build takes a few minutes. It installs packages, creates `.env` and creates the database tables.
5. In the VS Code terminal, run `npm run dev` and open **http://localhost:3000**.

This also works in **GitHub Codespaces** (*Code → Codespaces → Create codespace*), entirely in the browser.

Prefer installing everything yourself? Follow steps 1–3 below.

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
| **lit-html** (`bierner.lit-html`) | Highlights the ``html`…` `` markup inside `script-4.js` |
| **DotENV** (`mikestead.dotenv`) | Syntax highlighting for `.env` |

What `.vscode/settings.json` does:

- Formats with Prettier on save, uses 2-space indentation and LF line endings, and trims trailing whitespace.
- Turns on Emmet for JavaScript, and the **lit-html** extension highlights the ``html`…` `` markup in `script-4.js` as real HTML.
- Adds an **"IncomeTracker (local)"** connection to the SQL Server extension. Open the *SQL Server* icon in the sidebar and connect. It asks for the `sa` password the first time and saves it in your OS keychain. Edit `server` or `user` there if yours differ.

Debugging (`.vscode/launch.json`, *Run and Debug* panel, `Ctrl+Shift+D`):

- **Server: debug API** runs the API with `.env` loaded and restarts on file changes. Set breakpoints in `script-4.js`.
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
| "The app didn't start" | The page was opened with Live Server, Live Preview or as a file. Run `npm run dev` and open `http://localhost:3000` |
| "React didn't load" | `npm install` wasn't run. Run it, then restart with `npm run dev` |
| Blank panel in VS Code's built-in browser | Fixed: in development the page is allowed to be shown inside a frame. Make sure `NODE_ENV=development` in `.env` |

## Going to production

Keeping everything in one file is fine for a small project. As it grows, a usual next step is to move `browserApp()` into a Vite React project (`npm create vite@latest`) and serve its `dist/` folder from Express. Switch the React URLs in `index-4.html` from `.development.js` to `.production.min.js`. Also set `NODE_ENV=production`, serve over HTTPS, and use a least-privilege SQL login instead of `sa`.
