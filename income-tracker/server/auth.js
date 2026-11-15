// Session handling: a signed token (JWT) in an httpOnly cookie.
// httpOnly means page JavaScript can never read it, which protects the
// session from cross-site scripting; SameSite=Lax blocks cross-site posts.
const jwt = require("jsonwebtoken");
const config = require("./config");
const { HttpError } = require("./errors");

const COOKIE = "it_session";

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
  res.cookie(COOKIE, token, cookieOptions());
}

function endSession(res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE, options);
}

/** Middleware: rejects the request unless it carries a valid session. Sets req.userId. */
function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next(new HttpError(401, "Please sign in."));

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = Number(payload.sub);
    next();
  } catch {
    next(new HttpError(401, "Your session has expired. Please sign in again."));
  }
}

module.exports = { startSession, endSession, requireAuth };
