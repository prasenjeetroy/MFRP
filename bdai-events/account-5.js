/* ==========================================================
   BDAI Events — account-5.js
   Shared by index-5.html and inbox-5.html. Load it BEFORE the
   page's own script. It provides:
     · helpers, theme toggle, toasts and the mobile menu
     · accounts: sign up / log in with first name, last name
       and a 6-digit PIN (no email)
     · the log-in / sign-up dialog
     · the header account button and menu
     · the inbox message store
   Everything is saved in this browser (localStorage); there is
   no server. PINs are never stored as typed: only a salted,
   stretched SHA-256 hash is kept.
   ========================================================== */
(() => {
  "use strict";

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const escapeHTML = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Browser storage can throw (private mode, blocked site data): never let it break the page.
  const areaOf = (area) => (area === "session" ? window.sessionStorage : window.localStorage);
  const store = {
    get(key, fallback, area = "local") {
      try { const v = areaOf(area).getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value, area = "local") {
      try { areaOf(area).setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    },
    remove(key, area = "local") {
      try { areaOf(area).removeItem(key); } catch { /* ignore */ }
    },
  };

  // "Tolstoy Kr. Roy" -> "TR"
  const initialsOf = (name) => {
    const w = name.trim().split(/\s+/);
    return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
  };

  const AVATARS = [
    "linear-gradient(135deg,#7c5cff,#00d4ff)", "linear-gradient(135deg,#ff4fd8,#7c5cff)",
    "linear-gradient(135deg,#ff9f43,#ff4fd8)", "linear-gradient(135deg,#00b894,#00d4ff)",
    "linear-gradient(135deg,#3b82f6,#8b5cf6)", "linear-gradient(135deg,#f43f5e,#f59e0b)",
    "linear-gradient(135deg,#06b6d4,#22c55e)", "linear-gradient(135deg,#a855f7,#ec4899)",
  ];
  const hashCode = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

  /* ---------------------------------------------------------
     Theme
     --------------------------------------------------------- */
  const root = document.documentElement;
  root.dataset.theme = store.get("bdai.theme", null) ||
    (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

  $("#themeToggle")?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    store.set("bdai.theme", root.dataset.theme);
    $$("#themeToggle svg").forEach((s) => { s.style.animation = "none"; void s.offsetWidth; s.style.animation = ""; });
  });

  /* ---------------------------------------------------------
     Toasts (optionally with an action button, e.g. "Undo")
     --------------------------------------------------------- */
  function toast(msg, icon = "✨", { action, duration = 2800 } = {}) {
    let box = $("#toasts");
    if (!box) {
      box = Object.assign(document.createElement("div"), { id: "toasts", className: "toasts" });
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span aria-hidden="true">${icon}</span><span>${escapeHTML(msg)}</span>`;
    const dismiss = () => {
      if (el.classList.contains("out")) return;
      el.classList.add("out");
      el.addEventListener("animationend", () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 400); // in case animations are disabled
    };
    if (action) {
      const btn = Object.assign(document.createElement("button"), { className: "toast-action", textContent: action.label });
      btn.addEventListener("click", () => { action.onClick(); dismiss(); });
      el.appendChild(btn);
    }
    box.appendChild(el);
    setTimeout(dismiss, action ? Math.max(duration, 5000) : duration);
  }

  /* ---------------------------------------------------------
     Mobile menu
     --------------------------------------------------------- */
  const hamburger = $("#hamburger");
  const navMenu = $("#navLinks");
  if (hamburger && navMenu) {
    const setMenu = (open) => {
      navMenu.classList.toggle("open", open);
      hamburger.setAttribute("aria-expanded", String(open));
      hamburger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    hamburger.addEventListener("click", () => setMenu(!navMenu.classList.contains("open")));
    $$(".nav-link", navMenu).forEach((l) => l.addEventListener("click", () => setMenu(false)));
  }

  /* ---------------------------------------------------------
     SHA-256 (pure JS, so it works on file:// and plain http too)
     --------------------------------------------------------- */
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  function sha256(data) { // Uint8Array -> Uint8Array(32)
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const len = data.length;
    const total = Math.ceil((len + 9) / 64) * 64;
    const buf = new Uint8Array(total);
    buf.set(data);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor((len * 8) / 0x100000000));
    dv.setUint32(total - 4, (len * 8) >>> 0);
    const W = new Uint32Array(64);
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32);
    const odv = new DataView(out.buffer);
    H.forEach((v, i) => odv.setUint32(i * 4, v));
    return out;
  }

  const enc = new TextEncoder();
  const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  const concat = (a, b) => { const out = new Uint8Array(a.length + b.length); out.set(a); out.set(b, a.length); return out; };
  const randomHex = (n) => {
    const bytes = new Uint8Array(n);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
    return toHex(bytes);
  };

  // Salted and stretched (3,000 rounds), so the stored value can't simply be looked up.
  const HASH_ROUNDS = 3000;
  function hashPin(pin, saltHex) {
    const salt = enc.encode(saltHex);
    let h = sha256(concat(salt, enc.encode(pin)));
    for (let i = 0; i < HASH_ROUNDS; i++) h = sha256(concat(h, salt));
    return toHex(h);
  }
  const sameHash = (a, b) => { // compares every character, whatever the input
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };

  /* ---------------------------------------------------------
     Validation rules
     --------------------------------------------------------- */
  const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’. -]{0,39}$/u;
  const cleanName = (s) => String(s || "").trim().replace(/\s+/g, " ");
  const nameKey = (first, last) => `${cleanName(first)} ${cleanName(last)}`.toLowerCase();

  function nameProblem(value, label) {
    const v = cleanName(value);
    if (!v) return `Enter your ${label}.`;
    if (!NAME_RE.test(v)) return `Your ${label} can use letters, spaces, hyphens, apostrophes and full stops (up to 40).`;
    return "";
  }

  // Patterns that are too easy to guess: 111111, 123456, 654321, 121212, 123123
  function isWeakPin(p) {
    if (/^(\d)\1{5}$/.test(p)) return true;
    const d = [...p].map(Number);
    if (d.every((x, i) => i === 0 || x === d[i - 1] + 1)) return true;
    if (d.every((x, i) => i === 0 || x === d[i - 1] - 1)) return true;
    return p.slice(0, 2).repeat(3) === p || p.slice(0, 3).repeat(2) === p;
  }

  /* ---------------------------------------------------------
     Change notifications (also across browser tabs)
     --------------------------------------------------------- */
  const listeners = new Set();
  const emit = () => { const u = account.current(); listeners.forEach((fn) => fn(u)); };
  const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  window.addEventListener("storage", (e) => { if (!e.key || e.key.startsWith("bdai.")) emit(); });

  /* ---------------------------------------------------------
     Accounts
     --------------------------------------------------------- */
  const ACCOUNTS = "bdai.accounts";
  const SESSION = "bdai.session";
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 60 * 1000;

  class AuthError extends Error {
    constructor(code, message, extra = {}) { super(message); this.code = code; Object.assign(this, extra); }
  }

  const loadAccounts = () => store.get(ACCOUNTS, {});
  const saveAccounts = (a) => store.set(ACCOUNTS, a);
  const sessionId = () => store.get(SESSION, null, "session") || store.get(SESSION, null, "local");
  function setSession(id, remember) {
    store.remove(SESSION, "session");
    store.remove(SESSION, "local");
    if (id) store.set(SESSION, id, remember ? "local" : "session");
  }

  const publicUser = (a) => a && {
    id: a.id, first: a.first, last: a.last, name: `${a.first} ${a.last}`,
    initials: initialsOf(`${a.first} ${a.last}`), av: a.av, created: a.created, subscribed: a.subscribed,
  };

  // Per-account storage key, e.g. userKey("bdai.registrations") -> "bdai.registrations.u_1a2b…"
  const userKey = (prefix, id = sessionId()) => (id ? `${prefix}.${id}` : null);

  const account = {
    current() {
      const id = sessionId();
      return id ? publicUser(loadAccounts()[id]) || null : null;
    },

    signup({ first, last, pin, remember = true }) {
      first = cleanName(first); last = cleanName(last);
      const accounts = loadAccounts();
      const key = nameKey(first, last);
      if (Object.values(accounts).some((a) => a.key === key)) {
        throw new AuthError("exists", `An account for ${first} ${last} already exists on this device.`);
      }
      const id = "u_" + randomHex(8);
      const salt = randomHex(16);
      accounts[id] = {
        id, first, last, key, salt, pinHash: hashPin(pin, salt),
        created: Date.now(), subscribed: true, failed: 0, lockUntil: 0,
        av: AVATARS[hashCode(key) % AVATARS.length],
      };
      saveAccounts(accounts);
      setSession(id, remember);
      seedInbox(publicUser(accounts[id]));
      emit();
      return publicUser(accounts[id]);
    },

    login({ first, last, pin, remember = true }) {
      const accounts = loadAccounts();
      const key = nameKey(first, last);
      const acc = Object.values(accounts).find((a) => a.key === key);
      if (!acc) throw new AuthError("nomatch", "That name and PIN don't match an account on this device.");

      const now = Date.now();
      if (acc.lockUntil > now) {
        throw new AuthError("locked", "Too many wrong PINs.", { seconds: Math.ceil((acc.lockUntil - now) / 1000) });
      }
      if (!sameHash(hashPin(pin, acc.salt), acc.pinHash)) {
        acc.failed = (acc.failed || 0) + 1;
        let err;
        if (acc.failed >= MAX_ATTEMPTS) {
          acc.failed = 0;
          acc.lockUntil = now + LOCK_MS;
          err = new AuthError("locked", "Too many wrong PINs.", { seconds: LOCK_MS / 1000 });
        } else {
          const left = MAX_ATTEMPTS - acc.failed;
          err = new AuthError("nomatch", `That name and PIN don't match. ${left} attempt${left === 1 ? "" : "s"} left.`);
        }
        saveAccounts(accounts);
        throw err;
      }
      acc.failed = 0;
      acc.lockUntil = 0;
      saveAccounts(accounts);
      setSession(acc.id, remember);
      emit();
      return publicUser(acc);
    },

    logout() { setSession(null); emit(); },

    setSubscribed(on) {
      const id = sessionId();
      const accounts = loadAccounts();
      if (!id || !accounts[id] || accounts[id].subscribed === on) return;
      accounts[id].subscribed = on;
      saveAccounts(accounts);
      inbox.add(on ? subscribedMessage(accounts[id].first) : {
        from: "BDAI Events Team", category: "Account",
        subject: "You've unsubscribed from the monthly drop",
        body: "You won't receive the monthly drop any more. Event confirmations and account messages will still arrive here.\n\nChanged your mind? Turn the subscription back on from your profile on the Inbox page at any time.",
      });
    },

    deleteAccount() {
      const id = sessionId();
      if (!id) return;
      const accounts = loadAccounts();
      delete accounts[id];
      saveAccounts(accounts);
      store.remove(userKey("bdai.inbox", id));
      store.remove(userKey("bdai.registrations", id));
      setSession(null);
      emit();
    },
  };

  /* ---------------------------------------------------------
     Inbox store (one list of messages per account, newest first)
     --------------------------------------------------------- */
  const inbox = {
    list(id = sessionId()) { return id ? store.get(userKey("bdai.inbox", id), []) : []; },
    save(list, id = sessionId()) { if (id) store.set(userKey("bdai.inbox", id), list); },
    add(msg, id = sessionId()) {
      if (!id) return null;
      const m = { id: "m_" + randomHex(6), date: Date.now(), read: false, starred: false, ...msg };
      const list = inbox.list(id);
      list.unshift(m);
      list.sort((a, b) => b.date - a.date);
      inbox.save(list, id);
      emit();
      return m;
    },
    update(msgId, patch) {
      const list = inbox.list().map((m) => (m.id === msgId ? { ...m, ...patch } : m));
      inbox.save(list); emit();
    },
    updateAll(patch) { inbox.save(inbox.list().map((m) => ({ ...m, ...patch }))); emit(); },
    remove(msgId) {
      const list = inbox.list();
      const removed = list.find((m) => m.id === msgId);
      inbox.save(list.filter((m) => m.id !== msgId)); emit();
      return removed;
    },
    restore(msg) {
      const list = inbox.list().filter((m) => m.id !== msg.id);
      list.push(msg);
      list.sort((a, b) => b.date - a.date);
      inbox.save(list); emit();
    },
    unread() { return inbox.list().filter((m) => !m.read).length; },
  };

  function subscribedMessage(first) {
    return {
      from: "BDAI Events Team", category: "Updates",
      subject: "You're subscribed to the monthly BDAI drop",
      body: `Thanks for subscribing, ${first}!\n\nOnce a month we'll send early-bird tickets, speaker announcements and new city launches straight to this inbox. No email needed.\n\nYou can unsubscribe at any time from your profile on this page.`,
    };
  }

  function seedInbox(user) {
    const now = Date.now();
    const msgs = [
      {
        date: now - 2000, from: "BDAI Events Team", category: "Updates",
        subject: "Early-bird seats for BDAI Global Summit 2027",
        body: "The BDAI Global Summit comes to Bengaluru on February 18, 2027: three days of keynotes, deep-dive tracks and live labs.\n\nBuild your personal agenda now and reserve your seat while early-bird pricing lasts.",
        cta: { label: "View the agenda", href: "index-5.html#schedule" },
      },
      { date: now - 1000, ...subscribedMessage(user.first) },
      {
        date: now, from: "BDAI Events Team", category: "Account",
        subject: `Welcome to BDAI Events, ${user.first}!`,
        body: `Hi ${user.first},\n\nYour BDAI Events account is ready. To log in, use your first name, last name and the 6-digit PIN you just chose.\n\nKeep your PIN safe. There's no email linked to your account, so a forgotten PIN can't be reset.\n\nWith your account you can register for events, keep your tickets in one place and get every update right here in your inbox.\n\nSee you at the next event,\nThe BDAI Events Team`,
        cta: { label: "Browse events", href: "index-5.html#events" },
      },
    ];
    const list = msgs.map((m) => ({ id: "m_" + randomHex(6), read: false, starred: false, ...m }));
    inbox.save(list.sort((a, b) => b.date - a.date), user.id);
  }

  /* ---------------------------------------------------------
     Header: account button + menu (rendered into #accountSlot)
     --------------------------------------------------------- */
  const onInboxPage = document.body.dataset.page === "inbox";
  const ICONS = {
    user: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/></svg>',
    logout: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
  };

  function renderAccountSlot() {
    const slot = $("#accountSlot");
    if (!slot) return;
    const user = account.current();
    if (!user) {
      slot.innerHTML = `<button class="btn btn-ghost btn-sm account-login" data-auth="login">${ICONS.user}<span class="account-login-text">Log in</span></button>`;
      return;
    }
    const unread = inbox.unread();
    slot.innerHTML = `
      <div class="account">
        <button class="account-btn" aria-haspopup="true" aria-expanded="false"
                aria-label="Account menu for ${escapeHTML(user.name)}${unread ? `, ${unread} unread` : ""}">
          <span class="avatar-sm" style="--av:${user.av}">${escapeHTML(user.initials)}</span>
          <span class="badge${unread ? " show" : ""}">${unread}</span>
        </button>
        <div class="account-menu" hidden>
          <div class="account-menu-head">
            <span class="avatar-sm" style="--av:${user.av}">${escapeHTML(user.initials)}</span>
            <div><b>${escapeHTML(user.name)}</b><small>${user.subscribed ? "Subscribed to the monthly drop" : "Not subscribed"}</small></div>
          </div>
          <a href="inbox-5.html" class="account-menu-item">${ICONS.inbox}<span>Inbox</span>${unread ? `<span class="count-pill">${unread}</span>` : ""}</a>
          <button class="account-menu-item" data-acc="logout">${ICONS.logout}<span>Log out</span></button>
        </div>
      </div>`;
  }

  function setMenuOpen(open) {
    const menu = $(".account-menu");
    const btn = $(".account-btn");
    if (!menu || !btn) return;
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) $(".account-menu-item", menu)?.focus();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-auth]")) {
      openAuth(e.target.closest("[data-auth]").dataset.auth);
      return;
    }
    if (e.target.closest(".account-btn")) {
      setMenuOpen($(".account-menu").hidden);
      return;
    }
    if (e.target.closest('[data-acc="logout"]')) {
      setMenuOpen(false);
      account.logout();
      toast("You've been logged out", "👋");
      return;
    }
    if (!e.target.closest(".account-menu")) setMenuOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $(".account-menu") && !$(".account-menu").hidden) {
      setMenuOpen(false);
      $(".account-btn")?.focus();
    }
  });
  onChange(renderAccountSlot);

  /* ---------------------------------------------------------
     Log-in / sign-up dialog
     --------------------------------------------------------- */
  let authModal = null;
  let authThen = null;
  let lastFocus = null;
  let pins = {};

  const pinGroup = (id, label, withToggle) => `
    <div class="field full">
      <div class="pin-label-row">
        <span class="label" id="${id}-label">${label}</span>
        ${withToggle ? '<button type="button" class="link-btn" data-toggle-pin aria-pressed="false">Show</button>' : ""}
      </div>
      <div class="pin" id="${id}" role="group" aria-labelledby="${id}-label">
        ${Array.from({ length: 6 }, (_, i) => `<input class="pin-box" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="off" aria-label="${label}, digit ${i + 1} of 6" />`).join("")}
      </div>
    </div>`;

  const nameFields = (prefix) => `
    <div class="field">
      <label for="${prefix}First">First name</label>
      <input id="${prefix}First" name="first" autocomplete="given-name" maxlength="40" required />
    </div>
    <div class="field">
      <label for="${prefix}Last">Last name</label>
      <input id="${prefix}Last" name="last" autocomplete="family-name" maxlength="40" required />
    </div>`;

  function buildAuth() {
    if (authModal) return;
    authModal = document.createElement("div");
    authModal.className = "modal";
    authModal.id = "authModal";
    authModal.hidden = true;
    authModal.setAttribute("role", "dialog");
    authModal.setAttribute("aria-modal", "true");
    authModal.setAttribute("aria-labelledby", "authTitle");
    authModal.innerHTML = `
      <div class="modal-backdrop" data-auth-close></div>
      <div class="modal-panel auth-panel">
        <button class="modal-close icon-btn" data-auth-close aria-label="Close dialog">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>

        <div class="auth-body" id="authForms">
          <div class="auth-head">
            <span class="auth-icon" aria-hidden="true">${ICONS.user}</span>
            <h2 id="authTitle">Welcome back</h2>
            <p class="muted" id="authSub"></p>
            <p class="auth-reason" id="authReason" hidden></p>
          </div>

          <div class="seg" role="tablist" aria-label="Log in or sign up">
            <button type="button" role="tab" id="tabLogin" data-mode="login" aria-controls="loginForm">Log in</button>
            <button type="button" role="tab" id="tabSignup" data-mode="signup" aria-controls="signupForm">Sign up</button>
            <span class="seg-ind" aria-hidden="true"></span>
          </div>

          <form id="loginForm" role="tabpanel" aria-labelledby="tabLogin" novalidate>
            <div class="form-grid">
              ${nameFields("li")}
              ${pinGroup("liPin", "PIN security key", true)}
            </div>
            <label class="check"><input type="checkbox" name="remember" checked /> Keep me logged in on this device</label>
            <p class="form-error" role="alert"></p>
            <button type="submit" class="btn btn-primary btn-block btn-lg">Log in</button>
            <p class="auth-switch muted">New here? <button type="button" class="link-btn" data-switch="signup">Create an account</button></p>
          </form>

          <form id="signupForm" role="tabpanel" aria-labelledby="tabSignup" novalidate hidden>
            <div class="form-grid">
              ${nameFields("su")}
              ${pinGroup("suPin", "Choose a 6-digit PIN", true)}
              ${pinGroup("suPin2", "Confirm PIN", false)}
            </div>
            <ul class="checklist" aria-live="polite">
              <li data-rule="len">6 digits</li>
              <li data-rule="weak">Not an easy pattern like 123456 or 111111</li>
              <li data-rule="match">Both PINs match</li>
            </ul>
            <p class="auth-note">📬 Your account includes the monthly BDAI drop, delivered to your inbox here. No email needed, and you can unsubscribe anytime. Keep your PIN safe: with no email, a forgotten PIN can't be reset.</p>
            <label class="check"><input type="checkbox" name="remember" checked /> Keep me logged in on this device</label>
            <p class="form-error" role="alert"></p>
            <button type="submit" class="btn btn-primary btn-block btn-lg">Create account &amp; subscribe</button>
            <p class="auth-switch muted">Already have an account? <button type="button" class="link-btn" data-switch="login">Log in</button></p>
          </form>
        </div>

        <div class="auth-body auth-success" id="authSuccess" hidden></div>
      </div>`;
    document.body.appendChild(authModal);

    pins = {
      li: wirePin($("#liPin")),
      su: wirePin($("#suPin"), updateChecklist),
      su2: wirePin($("#suPin2"), updateChecklist),
    };

    authModal.addEventListener("click", (e) => {
      if (e.target.closest("[data-auth-close]")) return closeAuth();
      const tab = e.target.closest("[data-mode]");
      if (tab) return setMode(tab.dataset.mode, true);
      const sw = e.target.closest("[data-switch]");
      if (sw) return setMode(sw.dataset.switch, true);
      const toggle = e.target.closest("[data-toggle-pin]");
      if (toggle) {
        const show = toggle.getAttribute("aria-pressed") !== "true";
        toggle.setAttribute("aria-pressed", String(show));
        toggle.textContent = show ? "Hide" : "Show";
        $$(".pin-box", toggle.closest("form")).forEach((b) => { b.type = show ? "text" : "password"; });
      }
    });

    // Arrow keys move between the two tabs
    $(".seg", authModal).addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const next = $(".seg", authModal).dataset.mode === "login" ? "signup" : "login";
      setMode(next);
      $(`[data-mode="${next}"]`, authModal).focus();
    });

    $("#loginForm").addEventListener("submit", onLogin);
    $("#signupForm").addEventListener("submit", onSignup);
    $$("input[name=first], input[name=last]", authModal).forEach((i) => i.addEventListener("input", () => {
      i.removeAttribute("aria-invalid");
      i.closest(".field").classList.remove("invalid");
      $(".form-error", i.closest("form")).textContent = "";
    }));

    document.addEventListener("keydown", (e) => {
      if (!authModal || authModal.hidden) return;
      if (e.key === "Escape") { e.stopPropagation(); closeAuth(); }
      if (e.key === "Tab") { // keep focus inside the dialog
        const f = $$('button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])', authModal).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  // Six one-digit boxes that behave like one field: auto-advance, backspace, arrows, paste.
  function wirePin(group, onInput) {
    const boxes = $$(".pin-box", group);
    const sync = () => {
      boxes.forEach((b) => b.classList.toggle("filled", !!b.value));
      group.classList.remove("invalid");
      const err = group.closest("form")?.querySelector(".form-error");
      if (err && !err.querySelector("button")) err.textContent = ""; // keep "Log in instead" visible
      onInput?.();
    };
    const fill = (digits, start) => {
      [...digits].slice(0, 6 - start).forEach((d, k) => { boxes[start + k].value = d; });
      boxes[Math.min(5, start + digits.length)].focus();
    };
    boxes.forEach((box, i) => {
      box.addEventListener("input", () => {
        const digits = box.value.replace(/\D/g, "");
        if (digits.length > 1) fill(digits, i);
        else {
          box.value = digits;
          if (digits && i < 5) boxes[i + 1].focus();
        }
        sync();
      });
      box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !box.value && i > 0) {
          e.preventDefault();
          boxes[i - 1].value = "";
          boxes[i - 1].focus();
          sync();
        } else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); boxes[i - 1].focus(); }
        else if (e.key === "ArrowRight" && i < 5) { e.preventDefault(); boxes[i + 1].focus(); }
      });
      box.addEventListener("paste", (e) => {
        e.preventDefault();
        const digits = (e.clipboardData?.getData("text") || "").replace(/\D/g, "");
        if (digits) { fill(digits, i); sync(); }
      });
      box.addEventListener("focus", () => box.select());
    });
    return {
      get value() { return boxes.map((b) => b.value).join(""); },
      clear() { boxes.forEach((b) => { b.value = ""; }); sync(); },
      focus() { (boxes.find((b) => !b.value) || boxes[5]).focus(); },
      invalid() {
        group.classList.add("invalid");
        group.classList.remove("shake"); void group.offsetWidth; group.classList.add("shake");
      },
    };
  }

  function pinRules() {
    const p = pins.su.value, p2 = pins.su2.value;
    return { len: /^\d{6}$/.test(p), weak: /^\d{6}$/.test(p) && !isWeakPin(p), match: p.length === 6 && p === p2 };
  }
  function updateChecklist() {
    const r = pinRules();
    $$(".checklist li", authModal).forEach((li) => li.classList.toggle("ok", r[li.dataset.rule]));
  }

  const MODES = {
    login: { title: "Welcome back", sub: "Log in with your name and 6-digit PIN." },
    signup: { title: "Create your account", sub: "Just your first name, last name and a 6-digit PIN. No email needed." },
  };

  function setMode(mode, focus = false) {
    const seg = $(".seg", authModal);
    seg.dataset.mode = mode;
    $$("[role=tab]", seg).forEach((t) => {
      const on = t.dataset.mode === mode;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    $("#authTitle").textContent = MODES[mode].title;
    $("#authSub").textContent = MODES[mode].sub;
    $("#loginForm").hidden = mode !== "login";
    $("#signupForm").hidden = mode !== "signup";
    $$(".form-error", authModal).forEach((p) => { p.textContent = ""; });
    // carry typed names across when switching tabs
    const from = mode === "login" ? "su" : "li", to = mode === "login" ? "li" : "su";
    ["First", "Last"].forEach((f) => {
      const src = $(`#${from}${f}`), dst = $(`#${to}${f}`);
      if (src.value && !dst.value) dst.value = src.value;
    });
    if (focus) setTimeout(() => $(`#${to}First`).focus(), 30);
  }

  function showFormError(form, msg) {
    const p = $(".form-error", form);
    p.textContent = msg;
    p.classList.remove("shake"); void p.offsetWidth; p.classList.add("shake");
  }

  function checkNames(form, prefix) {
    for (const [id, label] of [[`${prefix}First`, "first name"], [`${prefix}Last`, "last name"]]) {
      const input = $(`#${id}`);
      const problem = nameProblem(input.value, label);
      if (problem) {
        input.setAttribute("aria-invalid", "true");
        input.closest(".field").classList.add("invalid");
        showFormError(form, problem);
        input.focus();
        return false;
      }
    }
    return true;
  }

  function onLogin(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!checkNames(form, "li")) return;
    if (pins.li.value.length !== 6) {
      pins.li.invalid();
      showFormError(form, "Enter your 6-digit PIN.");
      return pins.li.focus();
    }
    try {
      const user = account.login({
        first: $("#liFirst").value, last: $("#liLast").value,
        pin: pins.li.value, remember: form.elements.remember.checked,
      });
      finishAuth();
      toast(`Welcome back, ${user.first}!`, "👋");
    } catch (err) {
      pins.li.clear();
      pins.li.invalid();
      showFormError(form, err.code === "locked"
        ? `Too many wrong PINs. For your security, try again in ${err.seconds} seconds.`
        : err.message);
      pins.li.focus();
    }
  }

  function onSignup(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!checkNames(form, "su")) return;
    const r = pinRules();
    if (!r.len) { pins.su.invalid(); showFormError(form, "Choose a 6-digit PIN."); return pins.su.focus(); }
    if (!r.weak) { pins.su.invalid(); showFormError(form, "That PIN is too easy to guess. Try a less obvious one."); return pins.su.focus(); }
    if (!r.match) { pins.su2.clear(); pins.su2.invalid(); showFormError(form, "The two PINs don't match. Please confirm it again."); return pins.su2.focus(); }

    try {
      const user = account.signup({
        first: $("#suFirst").value, last: $("#suLast").value,
        pin: pins.su.value, remember: form.elements.remember.checked,
      });
      showSignupSuccess(user);
    } catch (err) {
      if (err.code !== "exists") throw err;
      const p = $(".form-error", form);
      p.innerHTML = `${escapeHTML(err.message)} <button type="button" class="link-btn" data-switch="login">Log in instead</button>`;
    }
  }

  function showSignupSuccess(user) {
    const n = inbox.unread();
    const box = $("#authSuccess");
    box.innerHTML = `
      <div class="check-anim"><svg viewBox="0 0 24 24" width="40" height="40"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h2 id="authSuccessTitle">You're all set, ${escapeHTML(user.first)}!</h2>
      <p class="muted">Your account is ready and you're subscribed to the monthly drop. There ${n === 1 ? "is 1 new message" : `are ${n} new messages`} waiting in your inbox.</p>
      <div class="auth-success-actions">
        ${authThen
          ? `<button class="btn btn-primary" data-continue>Continue to registration</button>
             <a class="btn btn-ghost" href="inbox-5.html">Open inbox</a>`
          : `${onInboxPage
              ? '<button class="btn btn-primary" data-continue>Open inbox</button>'
              : '<a class="btn btn-primary" href="inbox-5.html">Open inbox</a>'}
             <button class="btn btn-ghost" data-continue>${onInboxPage ? "Close" : "Keep exploring"}</button>`}
      </div>`;
    $("#authForms").hidden = true;
    box.hidden = false;
    authModal.setAttribute("aria-labelledby", "authSuccessTitle");
    $$("[data-continue]", box).forEach((b) => b.addEventListener("click", finishAuth));
    setTimeout(() => $(".btn", box).focus(), 50);
    toast("Account created", "🎉");
  }

  function finishAuth() {
    const then = authThen;
    authThen = null;
    closeAuth({ restoreFocus: !then });
    then?.();
  }

  function openAuth(mode = "login", { reason = "", then = null } = {}) {
    buildAuth();
    if (account.current() && !then) return; // already logged in
    lastFocus = document.activeElement;
    authThen = then;
    // reset everything
    $$("form", authModal).forEach((f) => f.reset());
    Object.values(pins).forEach((p) => p.clear());
    $$("[data-toggle-pin]", authModal).forEach((t) => { t.setAttribute("aria-pressed", "false"); t.textContent = "Show"; });
    $$(".pin-box", authModal).forEach((b) => { b.type = "password"; });
    $$(".field.invalid", authModal).forEach((f) => f.classList.remove("invalid"));
    $("#authForms").hidden = false;
    $("#authSuccess").hidden = true;
    authModal.setAttribute("aria-labelledby", "authTitle");
    const reasonEl = $("#authReason");
    reasonEl.textContent = reason;
    reasonEl.hidden = !reason;
    setMode(mode);

    authModal.hidden = false;
    authModal.classList.remove("closing");
    document.body.classList.add("modal-open");
    $(".modal-panel", authModal).scrollTop = 0;
    setTimeout(() => $(`#${mode === "login" ? "li" : "su"}First`).focus({ preventScroll: true }), 50);
  }

  function closeAuth({ restoreFocus = true } = {}) {
    if (!authModal || authModal.hidden) return;
    authModal.classList.add("closing");
    setTimeout(() => {
      authModal.hidden = true;
      authModal.classList.remove("closing");
      if (!$$(".modal").some((m) => !m.hidden)) document.body.classList.remove("modal-open");
      if (restoreFocus) lastFocus?.focus?.();
    }, prefersReducedMotion ? 0 : 230);
  }

  /* ---------------------------------------------------------
     Public API
     --------------------------------------------------------- */
  window.BDAI = {
    $, $$, escapeHTML, store, toast, prefersReducedMotion, initialsOf,
    account, inbox, userKey, onChange, openAuth, closeAuth,
    _test: { sha256, hashPin, isWeakPin },
  };

  renderAccountSlot();
})();
