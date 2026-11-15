/* Income Tracker - React front end.
   Compiled in the browser by Babel (see index.html); talks to the Express API. */
const { useCallback, useEffect, useMemo, useRef, useState } = React;

/* ============================================================
   Helpers
   ============================================================ */

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const TYPES = ["Income", "Expense"];
const CHART_MONTHS = 6;

/** Today as YYYY-MM-DD in the user's own timezone (toISOString alone would use UTC). */
function localToday() {
  const d = new Date();
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

function toIsoDate(year, monthIndex, day) {
  const d = new Date(year, monthIndex, day);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
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

/* ============================================================
   API client
   ============================================================ */

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
      headers: { Accept: "application/json", ...(body !== undefined && { "Content-Type": "application/json" }) },
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

/* ============================================================
   App: decides between the sign-in screen and the dashboard
   ============================================================ */

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

  if (user === undefined) {
    return <div className="center muted">Loading…</div>;
  }
  if (!user) return <AuthScreen onSignedIn={setUser} />;
  return <Dashboard key={user.id} user={user} onSignOut={signOut} />;
}

/* ============================================================
   Sign in / create account
   ============================================================ */

function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [fields, setFields] = useState({ displayName: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  const set = name => e => setFields({ ...fields, [name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = isRegister ? fields : { email: fields.email, password: fields.password };
      const user = await api(`/api/auth/${mode}`, { method: "POST", body });
      onSignedIn(user);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError(null);
  }

  return (
    <main className="center">
      <form className="panel auth" onSubmit={submit} noValidate>
        <h1>Income Tracker</h1>
        <p className="muted">{isRegister ? "Create your account to get started." : "Sign in to your account."}</p>

        <ErrorBanner error={error} />

        {isRegister && (
          <Field label="Name" error={error?.details?.displayName}>
            <input required maxLength="100" autoComplete="name" value={fields.displayName} onChange={set("displayName")} />
          </Field>
        )}
        <Field label="Email" error={error?.details?.email}>
          <input required type="email" autoComplete="email" value={fields.email} onChange={set("email")} />
        </Field>
        <Field label="Password" error={error?.details?.password}>
          <input
            required
            type="password"
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={fields.password}
            onChange={set("password")}
          />
        </Field>

        <button type="submit" disabled={busy}>
          {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
        </button>

        <p className="muted switch">
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <button type="button" className="link" onClick={switchMode}>
            {isRegister ? "Sign in" : "Create an account"}
          </button>
        </p>
      </form>
    </main>
  );
}

/* ============================================================
   Dashboard
   ============================================================ */

function Dashboard({ user, onSignOut }) {
  const [filters, setFilters] = useState({ start: "", end: "", type: "" });
  const [list, setList] = useState({ items: [], totals: { income: 0, expense: 0, balance: 0, count: 0 }, truncated: false });
  const [summary, setSummary] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // the row being edited, or null
  const listRequest = useRef(null);

  const rangeError = filters.start && filters.end && filters.start > filters.end
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
      const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
      setList(await api(`/api/transactions?${query}`, { signal: controller.signal }));
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

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadChartAndCategories(); }, [loadChartAndCategories]);
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

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Income Tracker</h1>
          <div className="muted">Track your cash flow and stay on top of your goals.</div>
        </div>
        <div className="user">
          <span className="muted">Signed in as <strong>{user.displayName}</strong></span>
          <button className="secondary" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <ErrorBanner error={error} onClose={() => setError(null)} />

      <SummaryCards totals={list.totals} filtered={Boolean(filters.start || filters.end || filters.type)} />

      <TransactionForm
        key={editing ? `edit-${editing.id}` : "new"}
        editing={editing}
        categories={categories}
        onSave={save}
        onCancel={() => setEditing(null)}
      />

      <section className="columns">
        <CashFlowChart summary={summary} />

        <div className="panel grow">
          <div className="panel-head">
            <h2>Transactions</h2>
            <span className="muted">{list.totals.count} total</span>
          </div>
          <Filters filters={filters} onChange={setFilters} error={rangeError} />
          <TransactionList
            loading={loading}
            items={list.items}
            truncated={list.truncated}
            editingId={editing?.id}
            onEdit={startEdit}
            onDelete={remove}
          />
        </div>
      </section>
    </main>
  );
}

function SummaryCards({ totals, filtered }) {
  const cards = [
    { label: "Income", value: totals.income, className: "income" },
    { label: "Expenses", value: totals.expense, className: "expense" },
    { label: "Balance", value: totals.balance, className: totals.balance < 0 ? "expense" : "" }
  ];
  return (
    <section className="cards" aria-label="Totals">
      {cards.map(card => (
        <div className="card" key={card.label}>
          <div className="muted">{card.label}{filtered && " · filtered"}</div>
          <div className={`metric ${card.className}`}>{currency.format(card.value)}</div>
        </div>
      ))}
    </section>
  );
}

/* ---------- Add / edit form ---------- */

function TransactionForm({ editing, categories, onSave, onCancel }) {
  const [form, setForm] = useState(() =>
    editing
      ? { title: editing.title, category: editing.category, type: editing.type, amount: String(editing.amount), transactionDate: editing.transactionDate }
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

  return (
    <section className={`panel ${editing ? "editing" : ""}`}>
      <h2>{editing ? `Edit “${editing.title}”` : "Add a transaction"}</h2>
      <ErrorBanner error={error} />

      <form className="form-row" onSubmit={submit}>
        <Field label="Title" error={error?.details?.title} grow={2}>
          <input ref={firstInput} required maxLength="100" value={form.title} onChange={set("title")} />
        </Field>

        <Field label="Category" error={error?.details?.category}>
          <input
            required
            maxLength="50"
            list="category-options"
            placeholder="e.g. Salary, Food"
            value={form.category}
            onChange={set("category")}
          />
          <datalist id="category-options">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </Field>

        <Field label="Type" error={error?.details?.type}>
          <select value={form.type} onChange={set("type")}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Amount (₹)" error={error?.details?.amount}>
          <input required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={set("amount")} />
        </Field>

        <Field label="Date" error={error?.details?.transactionDate}>
          <input required type="date" value={form.transactionDate} onChange={set("transactionDate")} />
        </Field>

        <div className="form-actions">
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add transaction"}
          </button>
          {editing && (
            <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          )}
        </div>
      </form>
    </section>
  );
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

  return (
    <div className="panel chart-panel">
      <h2>Cash flow · last {CHART_MONTHS} months</h2>

      <div className="bars" role="img" aria-label="Monthly income and expenses">
        {months.map(m => (
          <div className="month" key={m.key}>
            <div className="bar-pair">
              <div className="bar income" style={{ height: height(m.income) }} title={`${m.label} income ${currency.format(m.income)}`} />
              <div className="bar expense" style={{ height: height(m.expense) }} title={`${m.label} expenses ${currency.format(m.expense)}`} />
            </div>
            <span>{m.label}</span>
          </div>
        ))}
      </div>

      <div className="legend">
        <span className="income">■ Income</span>
        <span className="expense">■ Expenses</span>
      </div>
    </div>
  );
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

  return (
    <>
      <div className="filters">
        <Field label="From">
          <input type="date" value={filters.start} max={filters.end || undefined} onChange={set("start")} />
        </Field>
        <Field label="To">
          <input type="date" value={filters.end} min={filters.start || undefined} onChange={set("end")} />
        </Field>
        <Field label="Type">
          <select value={filters.type} onChange={set("type")}>
            <option value="">All</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={thisMonth}>This month</button>
          <button type="button" className="secondary" onClick={() => onChange({ start: "", end: "", type: "" })}>Clear</button>
        </div>
      </div>
      {error && <div className="field-error">{error}</div>}
    </>
  );
}

function TransactionList({ loading, items, truncated, editingId, onEdit, onDelete }) {
  if (loading && items.length === 0) return <div className="muted list-state">Loading…</div>;
  if (items.length === 0) return <div className="muted list-state">No transactions found.</div>;

  return (
    <div className={`list ${loading ? "is-loading" : ""}`}>
      {items.map(row => (
        <div className={`row ${row.id === editingId ? "selected" : ""}`} key={row.id}>
          <div className="row-main">
            <strong>{row.title}</strong>
            <div className="muted small">{formatDate(row.transactionDate)} · {row.category}</div>
          </div>
          <span className={`badge ${row.type === "Income" ? "income" : "expense"}`}>{row.type}</span>
          <strong className={`amount ${row.type === "Income" ? "income" : "expense"}`}>
            {row.type === "Expense" ? "−" : "+"}{currency.format(row.amount)}
          </strong>
          <div className="actions">
            <button className="secondary" onClick={() => onEdit(row)} aria-label={`Edit ${row.title}`}>Edit</button>
            <button className="danger" onClick={() => onDelete(row)} aria-label={`Delete ${row.title}`}>Delete</button>
          </div>
        </div>
      ))}
      {truncated && <div className="muted small list-state">Showing the newest {items.length}. Narrow the dates to see older ones.</div>}
    </div>
  );
}

/* ---------- Small shared pieces ---------- */

function Field({ label, error, grow = 1, children }) {
  return (
    <label className="field" style={{ flexGrow: grow }}>
      <span>{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function ErrorBanner({ error, onClose }) {
  if (!error) return null;
  return (
    <div className="error" role="alert">
      <span>{error.message}</span>
      {onClose && <button className="link" onClick={onClose} aria-label="Dismiss">✕</button>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
