/* ============================================================================
   Income Tracker - server (everything that runs in Node.js, in one file)

     node script.js            start the web server  (npm start / npm run dev)
     node script.js --init-db  create the database   (npm run db:init)

   Sections:
     1. Settings (.env)          5. Sessions (login cookie)
     2. Errors                   6. Auth routes
     3. Database                 7. Transaction routes
     4. Validation               8. App, database setup, startup

   The React page is in public/app.js. It runs in the browser, so it can't
   live in this file.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sql = require("mssql");

require("dotenv").config({ path: path.join(__dirname, ".env") });

/* ============================================================================
   1. Settings - read and checked once, so a missing value fails loudly
   ========================================================================== */

function requiredSetting(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required setting ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

const bool = (value, fallback) =>
  value === undefined ? fallback : ["1", "true", "yes"].includes(String(value).toLowerCase());

const isProduction = process.env.NODE_ENV === "production";
const instanceName = process.env.DB_INSTANCE || undefined;

const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction,
  jwtSecret: requiredSetting("JWT_SECRET"),
  sessionDays: 7,
  db: {
    server: requiredSetting("DB_SERVER"),
    database: process.env.DB_DATABASE || "IncomeTracker",
    user: requiredSetting("DB_USER"),
    password: requiredSetting("DB_PASSWORD"),
    // A named instance is found through SQL Browser; a port must not be set with it.
    port: instanceName ? undefined : Number(process.env.DB_PORT) || 1433,
    options: {
      instanceName,
      encrypt: bool(process.env.DB_ENCRYPT, true),
      trustServerCertificate: bool(process.env.DB_TRUST_CERT, !isProduction)
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  }
};

if (config.jwtSecret.length < 32 || config.jwtSecret.startsWith("replace-me")) {
  const message = "JWT_SECRET must be a random string of at least 32 characters.";
  if (isProduction) throw new Error(message);
  console.warn(`⚠  ${message} (allowed in development only)`);
}

/* ============================================================================
   2. Errors
   ========================================================================== */

// An error that is safe to show to the user, with the HTTP status to send.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Last middleware in the chain: turns any thrown error into a JSON response.
// Unexpected errors are logged in full but reported to the browser generically,
// so database details never leak to users.
function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "The request body is not valid JSON." });
  }

  const dbDown = ["ESOCKET", "ELOGIN", "ETIMEOUT", "EINSTLOOKUP"].includes(err.code);
  console.error(`${req.method} ${req.originalUrl} failed:`, err);

  res.status(dbDown ? 503 : 500).json({
    error: dbDown
      ? "Cannot reach the database. Check that SQL Server is running and the .env settings are correct."
      : "Something went wrong on the server."
  });
}

/* ============================================================================
   3. Database - one shared connection pool
   ========================================================================== */

let poolPromise = null;

// The first query opens the pool; if opening fails, the next query tries
// again instead of staying broken.
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config.db)
      .connect()
      .then(pool => {
        console.log(`✓ Connected to SQL Server ${config.db.server} / ${config.db.database}`);
        pool.on("error", err => console.error("SQL pool error:", err));
        return pool;
      })
      .catch(err => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

/**
 * Runs a parameterised query. Values are always sent as parameters, never
 * pasted into the SQL text, which is what prevents SQL injection.
 *
 *   query("SELECT * FROM dbo.Users WHERE Id = @id", { id: [sql.Int, 5] })
 */
async function query(text, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [name, [type, value]] of Object.entries(params)) {
    request.input(name, type, value);
  }
  return request.query(text);
}

async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise.catch(() => null);
    poolPromise = null;
    if (pool) await pool.close();
  }
}

/* ============================================================================
   4. Validation - the database has CHECK constraints too, but checking here
      gives the user a clear message for each field
   ========================================================================== */

const TYPES = ["Income", "Expense"];
const MAX_AMOUNT = 9_999_999_999.99; // fits DECIMAL(12, 2)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** True for a real calendar date written as YYYY-MM-DD. */
function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Turns "YYYY-MM-DD" into a Date at UTC midnight, which mssql stores as that exact day. */
function toSqlDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function failIfErrors(errors) {
  if (Object.keys(errors).length) {
    throw new HttpError(400, Object.values(errors)[0], errors);
  }
}

const validate = {
  transaction(body = {}) {
    const errors = {};
    const title = text(body.title);
    const category = text(body.category);
    const type = text(body.type);
    const amount = Math.round(Number(body.amount) * 100) / 100;
    const transactionDate = text(body.transactionDate);

    if (!title) errors.title = "Title is required.";
    else if (title.length > 100) errors.title = "Title must be 100 characters or fewer.";

    if (!category) errors.category = "Category is required.";
    else if (category.length > 50) errors.category = "Category must be 50 characters or fewer.";

    if (!TYPES.includes(type)) errors.type = "Type must be Income or Expense.";

    if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Amount must be greater than zero.";
    else if (amount > MAX_AMOUNT) errors.amount = "Amount is too large.";

    if (!isIsoDate(transactionDate)) errors.transactionDate = "Date must be a valid date.";

    failIfErrors(errors);
    return { title, category, type, amount, transactionDate };
  },

  dateRange(params = {}) {
    const errors = {};
    const start = text(params.start) || null;
    const end = text(params.end) || null;
    const type = text(params.type) || null;

    if (start && !isIsoDate(start)) errors.start = "Start date is not valid.";
    if (end && !isIsoDate(end)) errors.end = "End date is not valid.";
    if (start && end && start > end) errors.end = "The end date must be on or after the start date.";
    if (type && !TYPES.includes(type)) errors.type = "Type must be Income or Expense.";

    failIfErrors(errors);
    return { start, end, type };
  },

  register(body = {}) {
    const errors = {};
    const email = text(body.email).toLowerCase();
    const displayName = text(body.displayName);
    const password = typeof body.password === "string" ? body.password : "";

    if (!EMAIL_RE.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
    if (!displayName) errors.displayName = "Name is required.";
    else if (displayName.length > 100) errors.displayName = "Name must be 100 characters or fewer.";
    if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    // bcrypt only uses the first 72 bytes, so refuse longer passwords rather than silently truncating.
    else if (Buffer.byteLength(password) > 72) errors.password = "Password must be 72 characters or fewer.";

    failIfErrors(errors);
    return { email, displayName, password };
  },

  login(body = {}) {
    const email = text(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) throw new HttpError(400, "Enter your email and password.");
    return { email, password };
  },

  id(value) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) throw new HttpError(400, "Invalid id.");
    return number;
  }
};

/* ============================================================================
   5. Sessions - a signed token (JWT) in an httpOnly cookie. httpOnly means
      page JavaScript can never read it (protects against XSS); SameSite=Lax
      blocks cross-site posts.
   ========================================================================== */

const SESSION_COOKIE = "it_session";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction, // HTTPS only in production
    path: "/",
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000
  };
}

function startSession(res, user) {
  const token = jwt.sign({ sub: String(user.id), name: user.displayName }, config.jwtSecret, {
    expiresIn: `${config.sessionDays}d`
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

function endSession(res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
}

/** Middleware: rejects the request unless it carries a valid session. Sets req.userId. */
function requireAuth(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next(new HttpError(401, "Please sign in."));

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = Number(payload.sub);
    next();
  } catch {
    next(new HttpError(401, "Your session has expired. Please sign in again."));
  }
}

/* ============================================================================
   6. Auth routes - /api/auth/...
   ========================================================================== */

const authRouter = express.Router();

// Slow down password guessing: 20 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." }
});

// Compared against when the email is unknown, so a wrong email and a wrong
// password take the same time and an attacker cannot tell which accounts exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const publicUser = row => ({ id: row.id, email: row.email, displayName: row.displayName });

authRouter.post("/register", authLimiter, async (req, res) => {
  const { email, displayName, password } = validate.register(req.body);
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await query(
      `INSERT INTO dbo.Users (Email, DisplayName, PasswordHash)
       OUTPUT inserted.Id AS id, inserted.Email AS email, inserted.DisplayName AS displayName
       VALUES (@email, @displayName, @passwordHash);`,
      {
        email: [sql.NVarChar(254), email],
        displayName: [sql.NVarChar(100), displayName],
        passwordHash: [sql.NVarChar(100), passwordHash]
      }
    );

    const user = publicUser(result.recordset[0]);
    startSession(res, user);
    res.status(201).json(user);
  } catch (err) {
    // 2627 / 2601 = unique constraint violation: the email is already registered.
    if (err.number === 2627 || err.number === 2601) {
      throw new HttpError(409, "An account with this email already exists.", {
        email: "An account with this email already exists."
      });
    }
    throw err;
  }
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const { email, password } = validate.login(req.body);

  const result = await query(
    `SELECT Id AS id, Email AS email, DisplayName AS displayName, PasswordHash AS passwordHash
     FROM dbo.Users WHERE Email = @email;`,
    { email: [sql.NVarChar(254), email] }
  );

  const row = result.recordset[0];
  const ok = await bcrypt.compare(password, row ? row.passwordHash : DUMMY_HASH);
  if (!row || !ok) throw new HttpError(401, "Email or password is incorrect.");

  const user = publicUser(row);
  startSession(res, user);
  res.json(user);
});

authRouter.post("/logout", (_req, res) => {
  endSession(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const result = await query(
    `SELECT Id AS id, Email AS email, DisplayName AS displayName FROM dbo.Users WHERE Id = @id;`,
    { id: [sql.Int, req.userId] }
  );

  const row = result.recordset[0];
  if (!row) {
    // The account was deleted while the cookie was still valid.
    endSession(res);
    throw new HttpError(401, "Please sign in.");
  }
  res.json(publicUser(row));
});

/* ============================================================================
   7. Transaction routes - /api/transactions/...
      Every query includes "UserId = @userId", so one user can never read,
      change or delete another user's rows, even by guessing an id.
   ========================================================================== */

const transactionsRouter = express.Router();
transactionsRouter.use(requireAuth);

const LIST_LIMIT = 500;

// Shared SELECT list. CONVERT(..., 23) returns the date as plain 'YYYY-MM-DD'
// text, so the browser never shifts it by a timezone.
const COLUMNS = `
  Id AS id, Title AS title, Category AS category, [Type] AS type,
  Amount AS amount, CONVERT(char(10), TransactionDate, 23) AS transactionDate`;

function rowParams(userId, t) {
  return {
    userId: [sql.Int, userId],
    title: [sql.NVarChar(100), t.title],
    category: [sql.NVarChar(50), t.category],
    type: [sql.NVarChar(7), t.type],
    amount: [sql.Decimal(12, 2), t.amount],
    transactionDate: [sql.Date, toSqlDate(t.transactionDate)]
  };
}

// GET /api/transactions?start=YYYY-MM-DD&end=YYYY-MM-DD&type=Income
// Returns the newest rows plus totals for the whole filtered range, computed in SQL.
transactionsRouter.get("/", async (req, res) => {
  const { start, end, type } = validate.dateRange(req.query);

  const filter = `
    WHERE UserId = @userId
      AND (@start IS NULL OR TransactionDate >= @start)
      AND (@end   IS NULL OR TransactionDate <= @end)
      AND (@type  IS NULL OR [Type] = @type)`;

  const result = await query(
    `SELECT TOP (@limit) ${COLUMNS}
     FROM dbo.Transactions ${filter}
     ORDER BY TransactionDate DESC, Id DESC;

     SELECT
       COALESCE(SUM(CASE WHEN [Type] = N'Income'  THEN Amount END), 0) AS income,
       COALESCE(SUM(CASE WHEN [Type] = N'Expense' THEN Amount END), 0) AS expense,
       COUNT(*) AS count
     FROM dbo.Transactions ${filter};`,
    {
      userId: [sql.Int, req.userId],
      start: [sql.Date, start && toSqlDate(start)],
      end: [sql.Date, end && toSqlDate(end)],
      type: [sql.NVarChar(7), type],
      limit: [sql.Int, LIST_LIMIT]
    }
  );

  const [items, [totals]] = result.recordsets;
  res.json({
    items,
    totals: {
      income: Number(totals.income),
      expense: Number(totals.expense),
      balance: Number(totals.income) - Number(totals.expense),
      count: totals.count
    },
    truncated: totals.count > items.length
  });
});

// GET /api/transactions/summary?from=YYYY-MM-01
// Income and expense per month, grouped by SQL Server, for the cash-flow chart.
transactionsRouter.get("/summary", async (req, res) => {
  const from = String(req.query.from || "");
  if (!isIsoDate(from)) throw new HttpError(400, "A valid 'from' date is required.");

  const result = await query(
    `SELECT
       CONVERT(char(7), DATEFROMPARTS(YEAR(TransactionDate), MONTH(TransactionDate), 1), 23) AS month,
       COALESCE(SUM(CASE WHEN [Type] = N'Income'  THEN Amount END), 0) AS income,
       COALESCE(SUM(CASE WHEN [Type] = N'Expense' THEN Amount END), 0) AS expense
     FROM dbo.Transactions
     WHERE UserId = @userId AND TransactionDate >= @from
     GROUP BY YEAR(TransactionDate), MONTH(TransactionDate)
     ORDER BY month;`,
    { userId: [sql.Int, req.userId], from: [sql.Date, toSqlDate(from)] }
  );

  res.json(result.recordset.map(r => ({ ...r, income: Number(r.income), expense: Number(r.expense) })));
});

// GET /api/transactions/categories - the user's own categories, for autocomplete.
transactionsRouter.get("/categories", async (req, res) => {
  const result = await query(
    `SELECT Category AS category, COUNT(*) AS uses
     FROM dbo.Transactions WHERE UserId = @userId
     GROUP BY Category ORDER BY uses DESC, Category;`,
    { userId: [sql.Int, req.userId] }
  );
  res.json(result.recordset.map(r => r.category));
});

transactionsRouter.post("/", async (req, res) => {
  const t = validate.transaction(req.body);
  const result = await query(
    `INSERT INTO dbo.Transactions (UserId, Title, Category, [Type], Amount, TransactionDate)
     OUTPUT inserted.Id AS id
     VALUES (@userId, @title, @category, @type, @amount, @transactionDate);`,
    rowParams(req.userId, t)
  );
  res.status(201).json({ id: result.recordset[0].id, ...t });
});

transactionsRouter.put("/:id", async (req, res) => {
  const id = validate.id(req.params.id);
  const t = validate.transaction(req.body);
  const result = await query(
    `UPDATE dbo.Transactions
     SET Title = @title, Category = @category, [Type] = @type, Amount = @amount,
         TransactionDate = @transactionDate, UpdatedAt = SYSUTCDATETIME()
     WHERE Id = @id AND UserId = @userId;`,
    { ...rowParams(req.userId, t), id: [sql.Int, id] }
  );
  if (result.rowsAffected[0] === 0) throw new HttpError(404, "Transaction not found.");
  res.json({ id, ...t });
});

transactionsRouter.delete("/:id", async (req, res) => {
  const id = validate.id(req.params.id);
  const result = await query(`DELETE FROM dbo.Transactions WHERE Id = @id AND UserId = @userId;`, {
    id: [sql.Int, id],
    userId: [sql.Int, req.userId]
  });
  if (result.rowsAffected[0] === 0) throw new HttpError(404, "Transaction not found.");
  res.status(204).end();
});

/* ============================================================================
   8. App, database setup, startup
   ========================================================================== */

function createApp() {
  const app = express();
  app.disable("x-powered-by");

  // Security headers. The page compiles JSX in the browser with Babel, which
  // needs inline/eval scripts, so the CSP allows exactly that plus unpkg.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'", "https://unpkg.com", "'unsafe-inline'", "'unsafe-eval'"],
          "upgrade-insecure-requests": config.isProduction ? [] : null
        }
      }
    })
  );

  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());

  // Requests that change data must be JSON. A plain HTML form on another site
  // cannot send JSON, so this (with the SameSite cookie) blocks CSRF attacks.
  app.use("/api", (req, _res, next) => {
    const changesData = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    const hasBody = Number(req.headers["content-length"]) > 0;
    if (changesData && hasBody && !req.is("application/json")) {
      return next(new HttpError(415, "Requests must be sent as JSON."));
    }
    next();
  });

  app.get("/api/health", async (_req, res) => {
    await query("SELECT 1 AS ok;");
    res.json({ status: "ok", database: "connected" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/transactions", transactionsRouter);

  // Unknown API path: answer with JSON, not an HTML 404 page.
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "API route not found.")));

  app.use(express.static(path.join(__dirname, "public")));
  app.use(errorHandler);
  return app;
}

function startServer() {
  const server = createApp().listen(config.port, () => {
    console.log(`✓ Income Tracker running at http://localhost:${config.port}`);
    // Connect early so a wrong password or stopped server shows up right away.
    getPool().catch(err => console.error(`✗ Database connection failed: ${err.message}`));
  });

  async function shutdown() {
    server.close();
    await closePool();
    process.exit(0);
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Creates the database and tables by running database/schema.sql.
async function initDatabase() {
  const script = fs.readFileSync(path.join(__dirname, "database", "schema.sql"), "utf8");

  // "GO" is a batch separator understood by SSMS/sqlcmd, not by SQL Server
  // itself, so split on it and send each batch separately. Block comments are
  // removed first because the optional section at the end of schema.sql
  // contains its own GO lines inside a comment.
  const batches = script
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/^\s*GO\s*$/im)
    .map(batch => batch.trim())
    .filter(batch => batch.replace(/--.*$/gm, "").trim());

  // Connect to "master" because the app database may not exist yet.
  const pool = await new sql.ConnectionPool({ ...config.db, database: "master" }).connect();
  try {
    for (const batch of batches) await pool.request().batch(batch);
    console.log(`✓ Database "${config.db.database}" is ready (${batches.length} batches run).`);
  } finally {
    await pool.close();
  }
}

if (process.argv.includes("--init-db")) {
  initDatabase().catch(err => {
    console.error(`✗ Database setup failed: ${err.message}`);
    process.exit(1);
  });
} else {
  startServer();
}
