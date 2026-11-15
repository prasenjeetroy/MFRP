// Reads and checks every setting once at startup, so a missing value fails
// loudly with a clear message instead of a confusing error later.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required setting ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

const bool = (value, fallback) =>
  value === undefined ? fallback : ["1", "true", "yes"].includes(String(value).toLowerCase());

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = required("JWT_SECRET");

if (jwtSecret.length < 32 || jwtSecret.startsWith("replace-me")) {
  const message = "JWT_SECRET must be a random string of at least 32 characters.";
  if (isProduction) throw new Error(message);
  console.warn(`⚠  ${message} (allowed in development only)`);
}

const instanceName = process.env.DB_INSTANCE || undefined;

module.exports = {
  port: Number(process.env.PORT) || 3000,
  isProduction,
  jwtSecret,
  sessionDays: 7,
  db: {
    server: required("DB_SERVER"),
    database: process.env.DB_DATABASE || "IncomeTracker",
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
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
