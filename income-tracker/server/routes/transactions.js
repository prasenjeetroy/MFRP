// Every query here includes "UserId = @userId", so one user can never read,
// change or delete another user's rows, even by guessing an id.
const express = require("express");
const { sql, query } = require("../db");
const validate = require("../validate");
const { HttpError } = require("../errors");
const { requireAuth } = require("../auth");

const router = express.Router();
router.use(requireAuth);

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
    transactionDate: [sql.Date, validate.toSqlDate(t.transactionDate)]
  };
}

// GET /api/transactions?start=YYYY-MM-DD&end=YYYY-MM-DD&type=Income
// Returns the newest rows plus totals for the whole filtered range, computed in SQL.
router.get("/", async (req, res) => {
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
      start: [sql.Date, start && validate.toSqlDate(start)],
      end: [sql.Date, end && validate.toSqlDate(end)],
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
router.get("/summary", async (req, res) => {
  const from = String(req.query.from || "");
  if (!validate.isIsoDate(from)) throw new HttpError(400, "A valid 'from' date is required.");

  const result = await query(
    `SELECT
       CONVERT(char(7), DATEFROMPARTS(YEAR(TransactionDate), MONTH(TransactionDate), 1), 23) AS month,
       COALESCE(SUM(CASE WHEN [Type] = N'Income'  THEN Amount END), 0) AS income,
       COALESCE(SUM(CASE WHEN [Type] = N'Expense' THEN Amount END), 0) AS expense
     FROM dbo.Transactions
     WHERE UserId = @userId AND TransactionDate >= @from
     GROUP BY YEAR(TransactionDate), MONTH(TransactionDate)
     ORDER BY month;`,
    { userId: [sql.Int, req.userId], from: [sql.Date, validate.toSqlDate(from)] }
  );

  res.json(result.recordset.map(r => ({ ...r, income: Number(r.income), expense: Number(r.expense) })));
});

// GET /api/transactions/categories - the user's own categories, for autocomplete.
router.get("/categories", async (req, res) => {
  const result = await query(
    `SELECT Category AS category, COUNT(*) AS uses
     FROM dbo.Transactions WHERE UserId = @userId
     GROUP BY Category ORDER BY uses DESC, Category;`,
    { userId: [sql.Int, req.userId] }
  );
  res.json(result.recordset.map(r => r.category));
});

router.post("/", async (req, res) => {
  const t = validate.transaction(req.body);
  const result = await query(
    `INSERT INTO dbo.Transactions (UserId, Title, Category, [Type], Amount, TransactionDate)
     OUTPUT inserted.Id AS id
     VALUES (@userId, @title, @category, @type, @amount, @transactionDate);`,
    rowParams(req.userId, t)
  );
  res.status(201).json({ id: result.recordset[0].id, ...t });
});

router.put("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
  const id = validate.id(req.params.id);
  const result = await query(
    `DELETE FROM dbo.Transactions WHERE Id = @id AND UserId = @userId;`,
    { id: [sql.Int, id], userId: [sql.Int, req.userId] }
  );
  if (result.rowsAffected[0] === 0) throw new HttpError(404, "Transaction not found.");
  res.status(204).end();
});

module.exports = router;
