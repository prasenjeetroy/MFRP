/* ============================================================================
   Income Tracker - all the JavaScript, server and browser, in one file

     node script-4.js            start the web server  (npm start / npm run dev)
     node script-4.js --init-db  create the database   (npm run db:init)

   Sections:
     1. Settings (.env)          6. Auth routes
     2. Errors                   7. Transaction routes
     3. Database                 8. Browser app (React) - sent to the page
     4. Validation               9. App, database setup, startup
     5. Sessions (login cookie)

   Sections 1-7 and 9 run only in Node. Section 8 is the one part the
   browser receives (as /script-4.js); see the note at the top of that section.
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
const PIN_RE = /^\d{4,8}$/;

/** Trims a display name and collapses repeated spaces ("  Asha   Roy " -> "Asha Roy"). */
function cleanName(value) {
  return text(value).replace(/\s+/g, " ");
}

/** Returns an error message for an unsuitable new PIN, or null if it is fine. */
function pinProblem(pin, label) {
  if (!PIN_RE.test(pin)) return `${label} must be 4 to 8 digits.`;
  const repeated = /^(\d)\1+$/.test(pin); // 1111, 000000
  const sequence = "0123456789".includes(pin) || "9876543210".includes(pin); // 1234, 6543
  if (repeated || sequence) return `${label} is too easy to guess. Avoid repeated or consecutive digits.`;
  return null;
}

const digits = value => (typeof value === "string" ? value.trim() : "");

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
    const displayName = cleanName(body.displayName);
    const pin = digits(body.pin);
    const backupPin = digits(body.backupPin);

    if (displayName.length < 2) errors.displayName = "Name must be at least 2 characters.";
    else if (displayName.length > 50) errors.displayName = "Name must be 50 characters or fewer.";

    const pinError = pinProblem(pin, "PIN");
    if (pinError) errors.pin = pinError;

    const backupError = pinProblem(backupPin, "Backup PIN");
    if (backupError) errors.backupPin = backupError;
    else if (backupPin === pin) errors.backupPin = "Backup PIN must be different from your PIN.";

    failIfErrors(errors);
    return { displayName, pin, backupPin };
  },

  login(body = {}) {
    const displayName = cleanName(body.displayName);
    const pin = digits(body.pin);
    if (!displayName || !pin) throw new HttpError(400, "Enter your name and PIN.");
    return { displayName, pin };
  },

  resetPin(body = {}) {
    const errors = {};
    const displayName = cleanName(body.displayName);
    const backupPin = digits(body.backupPin);
    const newPin = digits(body.newPin);

    if (!displayName) errors.displayName = "Enter your name.";
    if (!backupPin) errors.backupPin = "Enter your backup PIN.";
    const pinError = pinProblem(newPin, "New PIN");
    if (pinError) errors.newPin = pinError;
    else if (newPin === backupPin) errors.newPin = "New PIN must be different from your backup PIN.";

    failIfErrors(errors);
    return { displayName, backupPin, newPin };
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

// VS Code's built-in browser shows the page inside a frame, and browsers don't
// send SameSite=Lax cookies there, so signing in wouldn't stick. When the
// page says it is framed (X-Framed header, development only), the cookie is
// SameSite=None + Secure instead. Browsers accept Secure cookies on
// http://localhost. Production always uses Lax.
function cookieOptions(req) {
  const framed = !config.isProduction && req.get("X-Framed") === "1";
  return {
    httpOnly: true,
    sameSite: framed ? "none" : "lax",
    secure: config.isProduction || framed, // HTTPS only in production
    path: "/",
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000
  };
}

function startSession(req, res, user) {
  const token = jwt.sign({ sub: String(user.id), name: user.displayName }, config.jwtSecret, {
    expiresIn: `${config.sessionDays}d`
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions(req));
}

function endSession(req, res) {
  const { maxAge, ...options } = cookieOptions(req);
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

// Slow down PIN guessing from one address: 20 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." }
});

// A 4-digit PIN has only 10,000 possibilities, so each account also locks
// after a few wrong PINs, wherever the attempts come from.
const MAX_FAILED_PINS = 5;
const LOCK_MINUTES = 15;

// Compared against when the name is unknown, so a wrong name and a wrong PIN
// take the same time and an attacker cannot tell which accounts exist by timing.
const DUMMY_HASH = bcrypt.hashSync("000000", 12);

const publicUser = row => ({ id: row.id, displayName: row.displayName });

/** Loads an account for sign-in, including whether it is locked right now. */
async function findAccount(displayName) {
  const result = await query(
    `SELECT Id AS id, DisplayName AS displayName, PinHash AS pinHash, BackupPinHash AS backupPinHash,
            CASE WHEN LockedUntil > SYSUTCDATETIME()
                 THEN DATEDIFF(second, SYSUTCDATETIME(), LockedUntil) END AS lockedSeconds
     FROM dbo.Users WHERE DisplayName = @displayName;`,
    { displayName: [sql.NVarChar(50), displayName] }
  );
  return result.recordset[0];
}

function lockedError(seconds) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return new HttpError(429, `Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
}

/**
 * Checks a PIN against one of the account's hashes. A wrong PIN is counted
 * (atomically, in SQL) and locks the account after MAX_FAILED_PINS; a right
 * one clears the count. Throws a user-facing error when the check fails.
 */
async function verifyPin(account, pin, hashField, wrongMessage) {
  if (account?.lockedSeconds > 0) throw lockedError(account.lockedSeconds);

  const ok = await bcrypt.compare(pin, account ? account[hashField] : DUMMY_HASH);
  if (!account) throw new HttpError(401, wrongMessage);

  if (ok) {
    await query(`UPDATE dbo.Users SET FailedAttempts = 0, LockedUntil = NULL WHERE Id = @id;`, {
      id: [sql.Int, account.id]
    });
    return;
  }

  // An expired lock starts a fresh count; otherwise add one and lock at the limit.
  const result = await query(
    `UPDATE dbo.Users SET
       FailedAttempts = CASE WHEN LockedUntil <= SYSUTCDATETIME() THEN 1 ELSE FailedAttempts + 1 END,
       LockedUntil = CASE
         WHEN LockedUntil <= SYSUTCDATETIME() THEN NULL
         WHEN FailedAttempts + 1 >= @max THEN DATEADD(minute, @lockMinutes, SYSUTCDATETIME())
         ELSE LockedUntil END
     OUTPUT inserted.FailedAttempts AS failedAttempts
     WHERE Id = @id;`,
    { id: [sql.Int, account.id], max: [sql.Int, MAX_FAILED_PINS], lockMinutes: [sql.Int, LOCK_MINUTES] }
  );

  const left = MAX_FAILED_PINS - result.recordset[0].failedAttempts;
  if (left <= 0) throw lockedError(LOCK_MINUTES * 60);
  throw new HttpError(401, `${wrongMessage} ${left} attempt${left === 1 ? "" : "s"} left.`);
}

authRouter.post("/register", authLimiter, async (req, res) => {
  const { displayName, pin, backupPin } = validate.register(req.body);
  const [pinHash, backupPinHash] = await Promise.all([bcrypt.hash(pin, 12), bcrypt.hash(backupPin, 12)]);

  try {
    const result = await query(
      `INSERT INTO dbo.Users (DisplayName, PinHash, BackupPinHash)
       OUTPUT inserted.Id AS id, inserted.DisplayName AS displayName
       VALUES (@displayName, @pinHash, @backupPinHash);`,
      {
        displayName: [sql.NVarChar(50), displayName],
        pinHash: [sql.NVarChar(100), pinHash],
        backupPinHash: [sql.NVarChar(100), backupPinHash]
      }
    );

    const user = publicUser(result.recordset[0]);
    startSession(req, res, user);
    res.status(201).json(user);
  } catch (err) {
    // 2627 / 2601 = unique constraint violation: the name is already taken.
    if (err.number === 2627 || err.number === 2601) {
      throw new HttpError(409, "That name is already taken. Please choose another.", {
        displayName: "That name is already taken. Please choose another."
      });
    }
    throw err;
  }
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const { displayName, pin } = validate.login(req.body);
  const account = await findAccount(displayName);
  await verifyPin(account, pin, "pinHash", "Name or PIN is incorrect.");

  const user = publicUser(account);
  startSession(req, res, user);
  res.json(user);
});

// Forgot PIN: the backup PIN proves who you are, then a new PIN is saved.
authRouter.post("/reset-pin", authLimiter, async (req, res) => {
  const { displayName, backupPin, newPin } = validate.resetPin(req.body);
  const account = await findAccount(displayName);
  await verifyPin(account, backupPin, "backupPinHash", "Name or backup PIN is incorrect.");

  await query(`UPDATE dbo.Users SET PinHash = @pinHash WHERE Id = @id;`, {
    id: [sql.Int, account.id],
    pinHash: [sql.NVarChar(100), await bcrypt.hash(newPin, 12)]
  });

  const user = publicUser(account);
  startSession(req, res, user);
  res.json(user);
});

authRouter.post("/logout", (req, res) => {
  endSession(req, res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const result = await query(
    `SELECT Id AS id, DisplayName AS displayName FROM dbo.Users WHERE Id = @id;`,
    { id: [sql.Int, req.userId] }
  );

  const row = result.recordset[0];
  if (!row) {
    // The account was deleted while the cookie was still valid.
    endSession(req, res);
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
   8. Browser app (React)
      Everything inside browserApp() runs in the BROWSER, not in Node. The
      server sends only this function's source to the page as /script-4.js, so the
      rest of this file (database, login code) never leaves the server.
      Inside it, use only browser globals (React, ReactDOM, htm, window,
      fetch). Server variables from this file are not available there.

      Markup is written with htm, a JSX-like syntax that is plain JavaScript:
        JSX:  <Field label="Title" grow={2}>…</Field>
        htm:  <${Field} label="Title" grow=${2}>…<//>
   ========================================================================== */

/* global React, ReactDOM, htm */
function browserApp() {
  const { useCallback, useEffect, useMemo, useRef, useState } = React;
  const html = htm.bind(React.createElement);

  /* ---------- Helpers ---------- */

  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  });

  const TYPES = ["Income", "Expense"];
  const CHART_MONTHS = 6;

  function toIsoDate(year, monthIndex, day) {
    const d = new Date(year, monthIndex, day);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join(
      "-"
    );
  }

  /** Today as YYYY-MM-DD in the user's own timezone (toISOString alone would use UTC). */
  function localToday() {
    const d = new Date();
    return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** "2026-11-05" -> "5 Nov 2026", without the date drifting a day across timezones. */
  function formatDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  /** The last N calendar months, oldest first, as { key: "2026-11", label: "Nov" }. */
  function lastMonths(count) {
    const now = new Date();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (count - 1) + i, 1);
      return {
        key: toIsoDate(d.getFullYear(), d.getMonth(), 1).slice(0, 7),
        label: d.toLocaleString("en", { month: "short" })
      };
    });
  }

  const emptyForm = () => ({ title: "", category: "", type: "Income", amount: "", transactionDate: localToday() });

  /* ---------- API client ---------- */

  class ApiError extends Error {
    constructor(status, message, details) {
      super(message);
      this.status = status;
      this.details = details || {};
    }
  }

  // Called when any request comes back 401, so the app can return to sign-in.
  let onUnauthorized = () => {};

  async function api(url, { body, ...options } = {}) {
    let response;
    try {
      response = await fetch(url, {
        credentials: "same-origin",
        ...options,
        headers: {
          Accept: "application/json",
          ...(body !== undefined && { "Content-Type": "application/json" }),
          // Tells the server the page is inside a frame (VS Code's built-in browser), see cookieOptions.
          ...(window.top !== window.self && { "X-Framed": "1" })
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (err) {
      if (err.name === "AbortError") throw err;
      throw new ApiError(0, "Cannot reach the server. Is it running? (npm run dev)");
    }

    if (response.status === 204) return null;

    // Read as text first: a proxy or crash can return HTML, and response.json()
    // would then throw a confusing "Unexpected token <" error.
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON */
    }

    if (!response.ok) {
      if (response.status === 401 && !url.startsWith("/api/auth/")) onUnauthorized();
      throw new ApiError(response.status, data?.error || `Request failed (${response.status}).`, data?.details);
    }
    return data;
  }

  /* ---------- App: sign-in screen or dashboard ---------- */

  function App() {
    // undefined = still checking the session, null = signed out, object = signed in
    const [user, setUser] = useState(undefined);

    useEffect(() => {
      onUnauthorized = () => setUser(null);
      api("/api/auth/me")
        .then(setUser)
        .catch(() => setUser(null));
    }, []);

    async function signOut() {
      await api("/api/auth/logout", { method: "POST" }).catch(() => {});
      setUser(null);
    }

    if (user === undefined) return html`<div className="center muted">Loading…</div>`;
    if (!user) return html`<${AuthScreen} onSignedIn=${setUser} />`;
    return html`<${Dashboard} key=${user.id} user=${user} onSignOut=${signOut} />`;
  }

  /* ---------- Sign in / create account ---------- */

  // Three screens share one form: sign in, create account, and forgot PIN.
  const AUTH_MODES = {
    login: {
      intro: "Sign in with your name and PIN.",
      submit: "Sign in",
      fields: [["pin", "PIN", "current-password"]]
    },
    register: {
      intro: "Create your account. You only need a name and a PIN.",
      submit: "Create account",
      fields: [
        ["pin", "PIN (4 to 8 digits)", "new-password"],
        ["backupPin", "Backup PIN", "off", "Used to reset your PIN if you forget it. Must differ from your PIN. Keep it somewhere safe."]
      ]
    },
    reset: {
      intro: "Forgot your PIN? Use your backup PIN to choose a new one.",
      submit: "Reset PIN and sign in",
      fields: [
        ["backupPin", "Backup PIN", "off"],
        ["newPin", "New PIN (4 to 8 digits)", "new-password"]
      ]
    }
  };

  function AuthScreen({ onSignedIn }) {
    const [mode, setMode] = useState("login");
    const [fields, setFields] = useState({ displayName: "", pin: "", backupPin: "", newPin: "" });
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const screen = AUTH_MODES[mode];
    const endpoint = { login: "login", register: "register", reset: "reset-pin" }[mode];

    const setName = e => setFields({ ...fields, displayName: e.target.value });
    // PIN boxes accept digits only, up to 8.
    const setPin = name => e => setFields({ ...fields, [name]: e.target.value.replace(/\D/g, "").slice(0, 8) });

    async function submit(e) {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const body = { displayName: fields.displayName };
        screen.fields.forEach(([name]) => (body[name] = fields[name]));
        onSignedIn(await api(`/api/auth/${endpoint}`, { method: "POST", body }));
      } catch (err) {
        setError(err);
        setBusy(false);
      }
    }

    function go(next) {
      setMode(next);
      setError(null);
      setFields(f => ({ displayName: f.displayName, pin: "", backupPin: "", newPin: "" }));
    }

    return html`
      <main className="center">
        <form className="panel auth" onSubmit=${submit} noValidate>
          <h1>Income Tracker</h1>
          <p className="muted">${screen.intro}</p>

          <${ErrorBanner} error=${error} />

          <${Field} label="Display name" error=${error?.details?.displayName}>
            <input
              id="auth-name"
              required
              maxLength="50"
              autoComplete="username"
              value=${fields.displayName}
              onChange=${setName}
            />
          <//>

          ${screen.fields.map(
            ([name, label, autoComplete, hint]) => html`
              <${Field} key=${mode + name} label=${label} error=${error?.details?.[name]}>
                <input
                  id=${`auth-${name}`}
                  required
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  minLength="4"
                  maxLength="8"
                  autoComplete=${autoComplete}
                  value=${fields[name]}
                  onChange=${setPin(name)}
                />
                ${hint && html`<span className="hint">${hint}</span>`}
              <//>
            `
          )}

          <button type="submit" disabled=${busy}>${busy ? "Please wait…" : screen.submit}</button>

          <div className="switch muted">
            ${mode === "login"
              ? html`
                  <${React.Fragment}>
                    <button type="button" className="link" onClick=${() => go("reset")}>Forgot your PIN?</button>
                    <span>
                      New here? <button type="button" className="link" onClick=${() => go("register")}>Create an account</button>
                    </span>
                  <//>
                `
              : html`<button type="button" className="link" onClick=${() => go("login")}>Back to sign in</button>`}
          </div>
        </form>
      </main>
    `;
  }

  /* ---------- Dashboard ---------- */

  function Dashboard({ user, onSignOut }) {
    const [filters, setFilters] = useState({ start: "", end: "", type: "" });
    const [list, setList] = useState({
      items: [],
      totals: { income: 0, expense: 0, balance: 0, count: 0 },
      truncated: false
    });
    const [summary, setSummary] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null); // the row being edited, or null
    const listRequest = useRef(null);

    const rangeError =
      filters.start && filters.end && filters.start > filters.end
        ? "The “To” date must be on or after the “From” date."
        : null;

    const loadList = useCallback(async () => {
      if (rangeError) return;
      // Cancel the previous request so a slow, older response can't overwrite a newer one.
      listRequest.current?.abort();
      const controller = new AbortController();
      listRequest.current = controller;

      setLoading(true);
      try {
        const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
        setList(await api(`/api/transactions?${params}`, { signal: controller.signal }));
        setError(null);
      } catch (err) {
        if (err.name !== "AbortError") setError(err);
      } finally {
        if (listRequest.current === controller) setLoading(false);
      }
    }, [filters, rangeError]);

    const loadChartAndCategories = useCallback(async () => {
      try {
        const from = `${lastMonths(CHART_MONTHS)[0].key}-01`;
        const [months, cats] = await Promise.all([
          api(`/api/transactions/summary?from=${from}`),
          api("/api/transactions/categories")
        ]);
        setSummary(months);
        setCategories(cats);
      } catch (err) {
        setError(err);
      }
    }, []);

    useEffect(() => {
      loadList();
    }, [loadList]);
    useEffect(() => {
      loadChartAndCategories();
    }, [loadChartAndCategories]);
    useEffect(() => () => listRequest.current?.abort(), []);

    const refresh = () => Promise.all([loadList(), loadChartAndCategories()]);

    async function save(form) {
      if (editing) {
        await api(`/api/transactions/${editing.id}`, { method: "PUT", body: form });
      } else {
        await api("/api/transactions", { method: "POST", body: form });
      }
      setEditing(null);
      await refresh();
    }

    async function remove(row) {
      if (!window.confirm(`Delete “${row.title}”?`)) return;
      try {
        await api(`/api/transactions/${row.id}`, { method: "DELETE" });
        if (editing?.id === row.id) setEditing(null);
        await refresh();
      } catch (err) {
        setError(err);
      }
    }

    function startEdit(row) {
      setEditing(row);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return html`
      <main className="wrap">
        <header className="top">
          <div>
            <h1>Income Tracker</h1>
            <div className="muted">Track your cash flow and stay on top of your goals.</div>
          </div>
          <div className="user">
            <span className="muted">Signed in as <strong>${user.displayName}</strong></span>
            <button className="secondary" onClick=${onSignOut}>Sign out</button>
          </div>
        </header>

        <${ErrorBanner} error=${error} onClose=${() => setError(null)} />

        <${SummaryCards} totals=${list.totals} filtered=${Boolean(filters.start || filters.end || filters.type)} />

        <${TransactionForm}
          key=${editing ? `edit-${editing.id}` : "new"}
          editing=${editing}
          categories=${categories}
          onSave=${save}
          onCancel=${() => setEditing(null)}
        />

        <section className="columns">
          <${CashFlowChart} summary=${summary} />

          <div className="panel grow">
            <div className="panel-head">
              <h2>Transactions</h2>
              <span className="muted">${list.totals.count} total</span>
            </div>
            <${Filters} filters=${filters} onChange=${setFilters} error=${rangeError} />
            <${TransactionList}
              loading=${loading}
              items=${list.items}
              truncated=${list.truncated}
              editingId=${editing?.id}
              onEdit=${startEdit}
              onDelete=${remove}
            />
          </div>
        </section>
      </main>
    `;
  }

  function SummaryCards({ totals, filtered }) {
    const cards = [
      { label: "Income", value: totals.income, className: "income" },
      { label: "Expenses", value: totals.expense, className: "expense" },
      { label: "Balance", value: totals.balance, className: totals.balance < 0 ? "expense" : "" }
    ];
    return html`
      <section className="cards" aria-label="Totals">
        ${cards.map(
          card => html`
            <div className="card" key=${card.label}>
              <div className="muted">${card.label}${filtered && " · filtered"}</div>
              <div className=${`metric ${card.className}`}>${currency.format(card.value)}</div>
            </div>
          `
        )}
      </section>
    `;
  }

  /* ---------- Add / edit form ---------- */

  function TransactionForm({ editing, categories, onSave, onCancel }) {
    const [form, setForm] = useState(() =>
      editing
        ? {
            title: editing.title,
            category: editing.category,
            type: editing.type,
            amount: String(editing.amount),
            transactionDate: editing.transactionDate
          }
        : emptyForm()
    );
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const firstInput = useRef(null);

    useEffect(() => {
      if (editing) firstInput.current?.focus({ preventScroll: true });
    }, [editing]);

    const set = name => e => setForm({ ...form, [name]: e.target.value });

    async function submit(e) {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        await onSave({ ...form, amount: Number(form.amount) });
        setForm(emptyForm()); // only reached when adding; editing remounts the form
      } catch (err) {
        setError(err);
      } finally {
        setBusy(false);
      }
    }

    return html`
      <section className=${`panel ${editing ? "editing" : ""}`}>
        <h2>${editing ? `Edit “${editing.title}”` : "Add a transaction"}</h2>
        <${ErrorBanner} error=${error} />

        <form className="form-row" onSubmit=${submit}>
          <${Field} label="Title" error=${error?.details?.title} grow=${2}>
            <input ref=${firstInput} required maxLength="100" value=${form.title} onChange=${set("title")} />
          <//>

          <${Field} label="Category" error=${error?.details?.category}>
            <input
              required
              maxLength="50"
              list="category-options"
              placeholder="e.g. Salary, Food"
              value=${form.category}
              onChange=${set("category")}
            />
            <datalist id="category-options">
              ${categories.map(c => html`<option key=${c} value=${c} />`)}
            </datalist>
          <//>

          <${Field} label="Type" error=${error?.details?.type}>
            <select value=${form.type} onChange=${set("type")}>
              ${TYPES.map(t => html`<option key=${t}>${t}</option>`)}
            </select>
          <//>

          <${Field} label="Amount (₹)" error=${error?.details?.amount}>
            <input
              required
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value=${form.amount}
              onChange=${set("amount")}
            />
          <//>

          <${Field} label="Date" error=${error?.details?.transactionDate}>
            <input required type="date" value=${form.transactionDate} onChange=${set("transactionDate")} />
          <//>

          <div className="form-actions">
            <button type="submit" disabled=${busy}>
              ${busy ? "Saving…" : editing ? "Save changes" : "Add transaction"}
            </button>
            ${editing && html`<button type="button" className="secondary" onClick=${onCancel}>Cancel</button>`}
          </div>
        </form>
      </section>
    `;
  }

  /* ---------- Chart (pure flexbox, no chart library) ---------- */

  function CashFlowChart({ summary }) {
    const months = useMemo(() => {
      const byMonth = Object.fromEntries(summary.map(m => [m.month, m]));
      return lastMonths(CHART_MONTHS).map(m => ({
        ...m,
        income: byMonth[m.key]?.income || 0,
        expense: byMonth[m.key]?.expense || 0
      }));
    }, [summary]);

    const max = Math.max(1, ...months.flatMap(m => [m.income, m.expense]));
    const height = value => (value ? `${Math.max(3, (value / max) * 100)}%` : "2px");

    return html`
      <div className="panel chart-panel">
        <h2>Cash flow · last ${CHART_MONTHS} months</h2>

        <div className="bars" role="img" aria-label="Monthly income and expenses">
          ${months.map(
            m => html`
              <div className="month" key=${m.key}>
                <div className="bar-pair">
                  <div
                    className="bar income"
                    style=${{ height: height(m.income) }}
                    title=${`${m.label} income ${currency.format(m.income)}`}
                  />
                  <div
                    className="bar expense"
                    style=${{ height: height(m.expense) }}
                    title=${`${m.label} expenses ${currency.format(m.expense)}`}
                  />
                </div>
                <span>${m.label}</span>
              </div>
            `
          )}
        </div>

        <div className="legend">
          <span className="income">■ Income</span>
          <span className="expense">■ Expenses</span>
        </div>
      </div>
    `;
  }

  /* ---------- Filters & list ---------- */

  function Filters({ filters, onChange, error }) {
    const set = name => e => onChange({ ...filters, [name]: e.target.value });

    function thisMonth() {
      const d = new Date();
      onChange({
        ...filters,
        start: toIsoDate(d.getFullYear(), d.getMonth(), 1),
        end: toIsoDate(d.getFullYear(), d.getMonth() + 1, 0)
      });
    }

    return html`
      <${React.Fragment}>
        <div className="filters">
          <${Field} label="From">
            <input type="date" value=${filters.start} max=${filters.end || undefined} onChange=${set("start")} />
          <//>
          <${Field} label="To">
            <input type="date" value=${filters.end} min=${filters.start || undefined} onChange=${set("end")} />
          <//>
          <${Field} label="Type">
            <select value=${filters.type} onChange=${set("type")}>
              <option value="">All</option>
              ${TYPES.map(t => html`<option key=${t}>${t}</option>`)}
            </select>
          <//>
          <div className="form-actions">
            <button type="button" className="secondary" onClick=${thisMonth}>This month</button>
            <button type="button" className="secondary" onClick=${() => onChange({ start: "", end: "", type: "" })}>
              Clear
            </button>
          </div>
        </div>
        ${error && html`<div className="field-error">${error}</div>`}
      <//>
    `;
  }

  function TransactionList({ loading, items, truncated, editingId, onEdit, onDelete }) {
    if (loading && items.length === 0) return html`<div className="muted list-state">Loading…</div>`;
    if (items.length === 0) return html`<div className="muted list-state">No transactions found.</div>`;

    return html`
      <div className=${`list ${loading ? "is-loading" : ""}`}>
        ${items.map(row => {
          const tone = row.type === "Income" ? "income" : "expense";
          return html`
            <div className=${`row ${row.id === editingId ? "selected" : ""}`} key=${row.id}>
              <div className="row-main">
                <strong>${row.title}</strong>
                <div className="muted small">${formatDate(row.transactionDate)} · ${row.category}</div>
              </div>
              <span className=${`badge ${tone}`}>${row.type}</span>
              <strong className=${`amount ${tone}`}>
                ${row.type === "Expense" ? "−" : "+"}${currency.format(row.amount)}
              </strong>
              <div className="actions">
                <button className="secondary" onClick=${() => onEdit(row)} aria-label=${`Edit ${row.title}`}>
                  Edit
                </button>
                <button className="danger" onClick=${() => onDelete(row)} aria-label=${`Delete ${row.title}`}>
                  Delete
                </button>
              </div>
            </div>
          `;
        })}
        ${truncated &&
        html`<div className="muted small list-state">
          Showing the newest ${items.length}. Narrow the dates to see older ones.
        </div>`}
      </div>
    `;
  }

  /* ---------- Small shared pieces ---------- */

  function Field({ label, error, grow = 1, children }) {
    return html`
      <label className="field" style=${{ flexGrow: grow }}>
        <span>${label}</span>
        ${children}
        ${error && html`<span className="field-error">${error}</span>`}
      </label>
    `;
  }

  // If any component crashes while rendering, React would otherwise remove
  // the whole page and leave it blank. This shows a message instead.
  class CrashGuard extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error };
    }
    componentDidCatch(error, info) {
      console.error("Income Tracker crashed:", error, info.componentStack);
    }
    render() {
      if (!this.state.error) return this.props.children;
      return html`
        <div className="boot">
          <div className="panel boot-help now">
            <h2>Something went wrong</h2>
            <p className="muted">${this.state.error.message}</p>
            <button onClick=${() => window.location.reload()}>Reload the page</button>
          </div>
        </div>
      `;
    }
  }

  function ErrorBanner({ error, onClose }) {
    if (!error) return null;
    return html`
      <div className="error" role="alert">
        <span>${error.message}</span>
        ${onClose && html`<button className="link" onClick=${onClose} aria-label="Dismiss">✕</button>`}
      </div>
    `;
  }

  ReactDOM.createRoot(document.getElementById("root")).render(html`<${CrashGuard}><${App} /><//>`);
}

// The exact text sent to the browser as /script-4.js: browserApp's source,
// called once, but only if React and htm were downloaded. Otherwise the page
// explains what's wrong instead of staying blank.
const BROWSER_SCRIPT = `"use strict";
if (window.React && window.ReactDOM && window.htm) {
  (${browserApp.toString()})();
} else {
  document.getElementById("root").innerHTML =
    '<div class="boot"><div class="panel boot-help now">' +
    "<h2>React didn't load</h2>" +
    '<p class="muted">Run <code>npm install</code> in the project folder, restart ' +
    "the server with <code>npm run dev</code>, then reload the page.</p></div></div>";
}
`;

/* ============================================================================
   9. App, database setup, startup
   ========================================================================== */

function createApp() {
  const app = express();
  app.disable("x-powered-by");

  // Security headers. Scripts may come only from this server; inline and
  // eval'd scripts are blocked.
  // In development the page may be shown inside a frame, because VS Code's
  // built-in browser (Simple Browser) displays pages in one. Blocking that
  // gives an empty panel. In production, framing by other sites stays blocked
  // to prevent clickjacking.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "frame-ancestors": config.isProduction ? ["'self'"] : null,
          "upgrade-insecure-requests": config.isProduction ? [] : null
        }
      },
      xFrameOptions: config.isProduction ? { action: "sameorigin" } : false
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

  // React and htm are served from node_modules (installed by npm install), so
  // the page works offline and doesn't depend on an outside website.
  const vendor = pkg => path.join(__dirname, "node_modules", pkg);
  app.use("/vendor/react", express.static(path.join(vendor("react"), "umd")));
  app.use("/vendor/react-dom", express.static(path.join(vendor("react-dom"), "umd")));
  app.use("/vendor/htm", express.static(path.join(vendor("htm"), "dist")));

  // The React app from section 8.
  app.get("/script-4.js", (_req, res) => {
    res.type("application/javascript").set("Cache-Control", "no-cache").send(BROWSER_SCRIPT);
  });

  // index-4.html is the home page, so http://localhost:3000 opens it directly.
  app.use(express.static(path.join(__dirname, "public"), { index: "index-4.html" }));
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
