const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const config = require("./config");
const db = require("./db");
const { HttpError, errorHandler } = require("./errors");

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
  await db.query("SELECT 1 AS ok;");
  res.json({ status: "ok", database: "connected" });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/transactions", require("./routes/transactions"));

// Unknown API path: answer with JSON, not an HTML 404 page.
app.use("/api", (_req, _res, next) => next(new HttpError(404, "API route not found.")));

app.use(express.static(path.join(__dirname, "..", "public")));

app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`✓ Income Tracker running at http://localhost:${config.port}`);
  // Connect early so a wrong password or stopped server shows up right away.
  db.getPool().catch(err => console.error(`✗ Database connection failed: ${err.message}`));
});

async function shutdown() {
  server.close();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = app;
