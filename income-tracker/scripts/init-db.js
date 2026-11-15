// Creates the IncomeTracker database and tables by running database/schema.sql.
// Usage: npm run db:init
const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const config = require("../server/config");

async function main() {
  const script = fs.readFileSync(path.join(__dirname, "..", "database", "schema.sql"), "utf8");

  // "GO" is a batch separator understood by SSMS/sqlcmd, not by SQL Server itself,
  // so split on it and send each batch separately.
  // Block comments are removed first because the optional section at the end
  // of the file contains its own GO lines inside a comment.
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

main().catch(err => {
  console.error(`✗ Database setup failed: ${err.message}`);
  process.exit(1);
});
