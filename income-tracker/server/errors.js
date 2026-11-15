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

module.exports = { HttpError, errorHandler };
