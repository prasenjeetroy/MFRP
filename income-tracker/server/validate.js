// Input checks shared by the routes. The database has CHECK constraints too,
// but validating here gives the user a clear message for each field.
const { HttpError } = require("./errors");

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

function fail(errors) {
  if (Object.keys(errors).length) {
    throw new HttpError(400, Object.values(errors)[0], errors);
  }
}

function transaction(body = {}) {
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

  fail(errors);
  return { title, category, type, amount, transactionDate };
}

function dateRange(query = {}) {
  const errors = {};
  const start = text(query.start) || null;
  const end = text(query.end) || null;
  const type = text(query.type) || null;

  if (start && !isIsoDate(start)) errors.start = "Start date is not valid.";
  if (end && !isIsoDate(end)) errors.end = "End date is not valid.";
  if (start && end && start > end) errors.end = "The end date must be on or after the start date.";
  if (type && !TYPES.includes(type)) errors.type = "Type must be Income or Expense.";

  fail(errors);
  return { start, end, type };
}

function register(body = {}) {
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

  fail(errors);
  return { email, displayName, password };
}

function login(body = {}) {
  const email = text(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) throw new HttpError(400, "Enter your email and password.");
  return { email, password };
}

function id(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new HttpError(400, "Invalid id.");
  return number;
}

module.exports = { transaction, dateRange, register, login, id, isIsoDate, toSqlDate };
