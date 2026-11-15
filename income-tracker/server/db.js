// One shared connection pool for the whole app. The first query opens it;
// if opening fails, the next query tries again instead of staying broken.
const sql = require("mssql");
const config = require("./config");

let poolPromise = null;

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

async function close() {
  if (poolPromise) {
    const pool = await poolPromise.catch(() => null);
    poolPromise = null;
    if (pool) await pool.close();
  }
}

module.exports = { sql, query, getPool, close };
