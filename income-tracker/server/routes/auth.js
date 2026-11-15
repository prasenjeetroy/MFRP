const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { sql, query } = require("../db");
const validate = require("../validate");
const { HttpError } = require("../errors");
const { startSession, endSession, requireAuth } = require("../auth");

const router = express.Router();

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

router.post("/register", authLimiter, async (req, res) => {
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

router.post("/login", authLimiter, async (req, res) => {
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

router.post("/logout", (_req, res) => {
  endSession(res);
  res.status(204).end();
});

router.get("/me", requireAuth, async (req, res) => {
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

module.exports = router;
