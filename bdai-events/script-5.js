/* ==========================================================
   BDAI Events — script-5.js
   All the JavaScript for the site, used by both pages:
     index-5.html  (<body data-page="home">)
     inbox-5.html  (<body data-page="inbox">)

   PART 1  Shared: helpers, theme, toasts, mobile menu,
           accounts (first name, last name and a 6-digit PIN,
           no email), the log-in / sign-up dialog, the header
           account menu and the inbox message store.
   PART 2  Home page: events, filters, registration, countdown,
           agenda, team, FAQ and the subscription card.
   PART 3  Inbox page: folders, search, messages, reading pane
           and the profile card.

   Each part is its own block; parts 2 and 3 share PART 1
   through window.BDAI and only run on their own page.
   Everything is saved in this browser (localStorage); there
   is no server.
   ========================================================== */

/* ##########################################################
   PART 1 · SHARED (both pages)
   ########################################################## */
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

/* ##########################################################
   PART 2 · HOME PAGE (index-5.html only)
   ########################################################## */
(() => {
  "use strict";

  /* ---------------------------------------------------------
     Shared helpers (from PART 1)
     --------------------------------------------------------- */
  const { $, $$, escapeHTML, store, toast, prefersReducedMotion, account, inbox, userKey, onChange, openAuth } = window.BDAI;
  if (document.body.dataset.page !== "home") return; // this part is only for index-5.html
  const root = document.documentElement;

  const fmtDate = (iso, opts) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", opts);
  const fmtPrice = (n) => (n === 0 ? "Free" : `$${n.toLocaleString("en-US")}`);
  const pad = (n) => String(n).padStart(2, "0");

  /* ---------------------------------------------------------
     Data
     --------------------------------------------------------- */
  const BANNERS = {
    Conference: "linear-gradient(135deg,#7c5cff,#00d4ff)",
    Workshop:   "linear-gradient(135deg,#00b894,#00d4ff)",
    "AI Developer Ops": "linear-gradient(135deg,#ff4fd8,#7c5cff)",
    Webinar:    "linear-gradient(135deg,#ff9f43,#ff4fd8)",
    Meetup:     "linear-gradient(135deg,#3b82f6,#8b5cf6)",
  };
  const MODE_DOT = { "In-person": "#22e39b", Online: "#00d4ff", Hybrid: "#ffb020" };

  const EVENTS = [
    { id: "summit27", title: "BDAI Global Summit 2027", category: "Conference", mode: "Hybrid",
      date: "2027-02-18", time: "09:00 – 18:00 IST · 3 days", location: "Bengaluru, India",
      price: 299, seats: 1200, taken: 912, emoji: "🚀", flagship: true,
      tags: ["GenAI", "Data Platforms", "Leadership"],
      desc: "Our flagship three-day summit: keynotes, eight parallel tracks, live labs and the BDAI Innovation Awards." },
    { id: "genai-hack", title: "AI Developer Ops Bootcamp", category: "AI Developer Ops", mode: "In-person",
      date: "2026-12-05", time: "2 days · starts 10:00 PST", location: "San Francisco, USA",
      price: 0, seats: 300, taken: 271, emoji: "🤖",
      tags: ["LLMOps", "CI/CD", "Deployment"],
      desc: "Two hands-on days building, testing and deploying AI applications with CI/CD, evaluation and monitoring." },
    { id: "lakehouse", title: "Lakehouse Architecture Masterclass", category: "Workshop", mode: "Online",
      date: "2026-11-28", time: "14:00 – 18:00 UTC", location: "Live online",
      price: 79, seats: 150, taken: 96, emoji: "🏞️",
      tags: ["Delta", "Iceberg", "Spark"],
      desc: "Design a production lakehouse from ingestion to BI with open table formats and hands-on notebooks." },
    { id: "stream", title: "Streaming Analytics with Kafka & Flink", category: "Webinar", mode: "Online",
      date: "2026-11-24", time: "16:00 – 17:30 UTC", location: "Live online",
      price: 0, seats: 1000, taken: 640, emoji: "🌊",
      tags: ["Kafka", "Flink", "Real-time"],
      desc: "From event streams to real-time dashboards: patterns, pitfalls and a live demo." },
    { id: "rai", title: "Responsible AI Roundtable", category: "Meetup", mode: "In-person",
      date: "2026-12-10", time: "18:30 – 21:00 GMT", location: "London, UK",
      price: 0, seats: 60, taken: 22, emoji: "⚖️",
      tags: ["Ethics", "Policy", "Governance"],
      desc: "An intimate evening discussion on AI regulation, model audits and fairness in practice." },
    { id: "wids", title: "Women in Data Science Meetup", category: "Meetup", mode: "Hybrid",
      date: "2026-12-14", time: "17:00 – 20:00 IST", location: "Pune, India",
      price: 0, seats: 120, taken: 88, emoji: "💜",
      tags: ["Community", "Careers", "Mentoring"],
      desc: "Lightning talks, mentoring circles and networking for women and allies in data." },
    { id: "vector", title: "Vector Search Deep Dive", category: "Webinar", mode: "Online",
      date: "2026-12-17", time: "15:00 – 16:30 UTC", location: "Live online",
      price: 0, seats: 800, taken: 210, emoji: "🧭",
      tags: ["Embeddings", "RAG", "ANN"],
      desc: "How ANN indexes work, how to evaluate retrieval quality, and when you actually need a vector DB." },
    { id: "mlops", title: "MLOps in Production", category: "Workshop", mode: "Hybrid",
      date: "2027-01-14", time: "09:30 – 17:00 CET", location: "Berlin, Germany",
      price: 149, seats: 80, taken: 61, emoji: "⚙️",
      tags: ["CI/CD", "Monitoring", "Feature Stores"],
      desc: "Build a full ML pipeline with versioning, automated retraining, drift detection and rollbacks." },
    { id: "edge-cv", title: "Computer Vision at the Edge", category: "Workshop", mode: "In-person",
      date: "2027-01-22", time: "10:00 – 16:00 SGT", location: "Singapore",
      price: 129, seats: 50, taken: 47, emoji: "👁️",
      tags: ["Edge AI", "Quantization", "IoT"],
      desc: "Deploy compact vision models to edge devices. Dev kits provided to every attendee." },
    { id: "agents-hack", title: "Agent Ops Night: Prototype to Production", category: "AI Developer Ops", mode: "Hybrid",
      date: "2027-01-30", time: "18:00 – 22:00 IST", location: "Bengaluru, India",
      price: 0, seats: 200, taken: 120, emoji: "🧠",
      tags: ["Agents", "Observability", "Automation"],
      desc: "An evening of practical sessions on deploying, observing and scaling AI agents safely in production." },
    { id: "leaders", title: "Data Leaders Forum", category: "Conference", mode: "In-person",
      date: "2027-03-11", time: "09:00 – 17:30 IST", location: "Mumbai, India",
      price: 249, seats: 400, taken: 150, emoji: "📊",
      tags: ["Strategy", "ROI", "Data Culture"],
      desc: "For CDOs and heads of data: building data-driven organisations and measuring AI ROI." },
  ];

  const AGENDA = [
    [ // Day 1
      { t: "09:00", title: "Opening Keynote: The Next Decade of Data", who: "Bhavyam Roy", track: "Keynote", room: "Main Hall" },
      { t: "10:30", title: "Modern Data Stack: What Actually Matters", who: "Vindalu Kr.", track: "Data Eng", room: "Hall B" },
      { t: "11:45", title: "Feature Engineering Patterns That Scale", who: "Dayashankar Roy", track: "ML", room: "Hall C" },
      { t: "13:00", title: "Lunch & Expo Floor", who: "Partners showcase", track: "Break", room: "Expo" },
      { t: "14:15", title: "Lab: Your First Lakehouse in 90 Minutes", who: "Tolstoy Kr. Roy", track: "Lab", room: "Lab 1" },
      { t: "16:30", title: "Panel: Building Data Teams in 2027", who: "Moderated by Bhavyam Roy", track: "Leadership", room: "Main Hall" },
    ],
    [ // Day 2
      { t: "09:00", title: "Keynote: Training & Serving at Planet Scale", who: "Rhythm Kr. Roy", track: "Keynote", room: "Main Hall" },
      { t: "10:30", title: "Real-time Feature Pipelines with Streaming", who: "Jelesky Kr", track: "Data Eng", room: "Hall B" },
      { t: "11:45", title: "Evaluating LLM Apps Beyond Vibes", who: "Sooraj Pratap", track: "GenAI", room: "Hall C" },
      { t: "13:00", title: "Lunch & Birds-of-a-Feather Tables", who: "Community", track: "Break", room: "Expo" },
      { t: "14:15", title: "Lab: Fine-tuning Small Models on a Budget", who: "Meeka Roy", track: "Lab", room: "Lab 2" },
      { t: "16:00", title: "Cost-Aware Cloud Data Platforms", who: "Shankaranand Roy", track: "Data Eng", room: "Hall B" },
    ],
    [ // Day 3
      { t: "09:00", title: "Keynote: Agents in the Enterprise", who: "Hari Prasad", track: "Keynote", room: "Main Hall" },
      { t: "10:30", title: "Privacy-Preserving ML in Practice", who: "Devi Prasad", track: "Responsible AI", room: "Hall C" },
      { t: "11:45", title: "Multimodal Models for Industry", who: "Dayashankar Roy", track: "GenAI", room: "Hall B" },
      { t: "13:00", title: "Lunch & AI Developer Ops Demos", who: "Community teams", track: "Break", room: "Expo" },
      { t: "14:30", title: "Lab: Shipping an Agent with Guardrails", who: "Tolstoy Kr. Roy", track: "Lab", room: "Lab 1" },
      { t: "16:30", title: "BDAI Innovation Awards & Closing", who: "Bhavyam Roy", track: "Keynote", room: "Main Hall" },
    ],
  ];

  const ENGINEER = "Software Engineer & Contributor";
  const TEAM = [
    { name: "Bhavyam Roy", role: "Founder and CEO", featured: true,
      bio: "Founder of BDAI Events, leading its mission to bring the Big Data & AI community together.",
      av: "linear-gradient(135deg,#7c5cff,#ff4fd8)" },
    { name: "Vindalu Kr.",      role: ENGINEER, av: "linear-gradient(135deg,#7c5cff,#00d4ff)" },
    { name: "Dayashankar Roy",  role: ENGINEER, av: "linear-gradient(135deg,#ff4fd8,#7c5cff)" },
    { name: "Tolstoy Kr. Roy",  role: ENGINEER, av: "linear-gradient(135deg,#ff9f43,#ff4fd8)" },
    { name: "Rhythm Kr. Roy",   role: ENGINEER, av: "linear-gradient(135deg,#00b894,#00d4ff)" },
    { name: "Jelesky Kr",       role: ENGINEER, av: "linear-gradient(135deg,#3b82f6,#8b5cf6)" },
    { name: "Sooraj Pratap",    role: ENGINEER, av: "linear-gradient(135deg,#f43f5e,#f59e0b)" },
    { name: "Meeka Roy",        role: ENGINEER, av: "linear-gradient(135deg,#06b6d4,#22c55e)" },
    { name: "Shankaranand Roy", role: ENGINEER, av: "linear-gradient(135deg,#a855f7,#ec4899)" },
    { name: "Hari Prasad",      role: ENGINEER, av: "linear-gradient(135deg,#0ea5e9,#6366f1)" },
    { name: "Devi Prasad",      role: ENGINEER, av: "linear-gradient(135deg,#eab308,#f97316)" },
  ];

  const FAQS = [
    { q: "Who are BDAI events for?", a: "Data engineers, ML practitioners, researchers, analysts, product leaders and students — anyone building with data and AI. Each event page lists its level and prerequisites." },
    { q: "Do I need an email to sign up?", a: "No. A BDAI account needs only your first name, last name and a 6-digit PIN security key. Ticket confirmations and the monthly drop arrive in your BDAI inbox instead of by email." },
    { q: "What if I forget my PIN?", a: "Because no email is linked to your account, a forgotten PIN can't be reset, so keep it safe. After 5 wrong PINs the account locks for a minute. Your account and inbox are saved in this browser on this device: they won't appear on other devices, and clearing your browser data removes them." },
    { q: "Can I attend in-person events online?", a: "Hybrid events are streamed live with interactive Q&A. In-person-only events are not streamed, but recordings of talks are usually shared with attendees within a week." },
    { q: "Are there student or group discounts?", a: "Yes. Choose the Student ticket at checkout (50% off; bring a valid student ID). Groups of 5 or more can register together using the attendee counter." },
    { q: "What is your refund policy?", a: "Full refund up to 14 days before the event, 50% up to 3 days before. Tickets are transferable to a colleague at any time at no charge." },
    { q: "How do I add sessions to my agenda?", a: "In the Schedule section, click any session to add it to your personal agenda. It's saved in your browser, so it will be there when you come back." },
    { q: "Can I speak or sponsor?", a: "Calls for speakers open roughly four months before each conference. Sponsorship packages are available for all formats, from meetups to the Global Summit." },
  ];

  /* ---------------------------------------------------------
     State
     --------------------------------------------------------- */
  const state = {
    query: "",
    category: "All",
    mode: "all",
    sort: "date",
    view: store.get("bdai.view", "grid"),
    saved: new Set(store.get("bdai.saved", [])),
    registrations: {},
    agenda: new Set(store.get("bdai.agenda", [])),
    day: 0,
  };

  // Registrations belong to the logged-in account (none when logged out).
  const loadRegs = () => { const k = userKey("bdai.registrations"); return k ? store.get(k, {}) : {}; };
  const saveRegs = () => { const k = userKey("bdai.registrations"); if (k) store.set(k, state.registrations); };
  state.registrations = loadRegs();

  const seatsTaken = (ev) => Math.min(ev.seats, ev.taken + (state.registrations[ev.id]?.qty || 0));

  /* ---------------------------------------------------------
     Header: scroll state, progress bar, active link
     --------------------------------------------------------- */
  const header = $("#header");
  const progress = $("#scrollProgress");
  const toTop = $("#toTop");

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("scrolled", y > 20);
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    toTop.classList.toggle("show", y > 700);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" }));

  const navLinks = $$(".nav-link");
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === `#${e.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["events", "schedule", "team", "faq"].forEach((id) => sectionObserver.observe(document.getElementById(id)));

  /* ---------------------------------------------------------
     Hero: typing effect
     --------------------------------------------------------- */
  (function typing() {
    const el = $("#typed");
    const words = ["Generative AI", "Machine Learning", "Data Engineering", "Live Analytics", "the Builders"];
    if (prefersReducedMotion) { el.textContent = words[0]; return; }
    let w = 0, i = 0, deleting = false;
    (function tick() {
      const word = words[w];
      i += deleting ? -1 : 1;
      el.textContent = word.slice(0, i);
      let delay = deleting ? 45 : 90;
      if (!deleting && i === word.length) { deleting = true; delay = 1600; }
      else if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; delay = 350; }
      setTimeout(tick, delay);
    })();
  })();

  /* ---------------------------------------------------------
     Hero: animated neural-network canvas (reacts to the cursor)
     --------------------------------------------------------- */
  (function network() {
    const canvas = $("#networkCanvas");
    const ctx = canvas.getContext("2d");
    const hero = $(".hero");
    let w, h, nodes = [], running = true, raf;
    const mouse = { x: -9999, y: -9999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 1,
      }));
    }

    function draw() {
      const rgb = getComputedStyle(root).getPropertyValue("--node").trim();
      ctx.clearRect(0, 0, w, h);
      const LINK = 130;
      for (const n of nodes) {
        if (!prefersReducedMotion) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          // gentle attraction to the cursor
          const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
          if (d < 180) { n.x += dx * 0.004; n.y += dy * 0.004; }
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(${rgb},${(1 - d / LINK) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (md < 180) {
          ctx.strokeStyle = `rgba(0,212,255,${(1 - md / 180) * 0.6})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = `rgba(${rgb},.9)`;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      if (running && !prefersReducedMotion) raf = requestAnimationFrame(draw);
    }

    hero.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

    // Pause the animation while the hero is off-screen to save CPU.
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (running) draw();
    }).observe(hero);

    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resize(); draw(); }, 150); });
    new MutationObserver(() => { if (prefersReducedMotion || !running) draw(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    resize();
    draw();
  })();

  /* ---------------------------------------------------------
     Hero: flagship countdown
     --------------------------------------------------------- */
  const flagship = EVENTS.find((e) => e.flagship);
  (function countdown() {
    $("#flagshipTitle").textContent = flagship.title;
    $("#flagshipDate").textContent = fmtDate(flagship.date, { month: "short", day: "numeric", year: "numeric" });
    $("#flagshipLocation").textContent = `📍 ${flagship.location} · ${flagship.mode}`;
    $("#flagshipBtn").addEventListener("click", () => openEvent(flagship.id));

    const target = new Date(flagship.date + "T09:00:00+05:30").getTime();
    const els = { d: $("#cdDays"), h: $("#cdHours"), m: $("#cdMins"), s: $("#cdSecs") };
    const set = (el, v) => {
      if (el.textContent !== v) {
        el.textContent = v;
        el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip");
      }
    };
    function update() {
      const diff = Math.max(0, target - Date.now());
      set(els.d, pad(Math.floor(diff / 864e5)));
      set(els.h, pad(Math.floor((diff / 36e5) % 24)));
      set(els.m, pad(Math.floor((diff / 6e4) % 60)));
      set(els.s, pad(Math.floor((diff / 1e3) % 60)));
    }
    update();
    setInterval(update, 1000);
  })();

  function updateFlagshipMeter() {
    const pct = Math.round((seatsTaken(flagship) / flagship.seats) * 100);
    $("#flagshipSeats").textContent = `${pct}%`;
    $("#flagshipFill").style.width = `${pct}%`;
  }

  /* ---------------------------------------------------------
     Animated counters & scroll reveal
     --------------------------------------------------------- */
  function animateCounter(el) {
    const target = +el.dataset.target;
    const suffix = el.dataset.suffix || "";
    if (prefersReducedMotion) { el.textContent = target.toLocaleString("en-US") + suffix; return; }
    const start = performance.now(), dur = 1800;
    (function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased).toLocaleString("en-US") + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("visible");
      $$(".counter", e.target).forEach(animateCounter);
      if (e.target.classList.contains("countdown-card")) updateFlagshipMeter();
      obs.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  const observeReveals = () => $$(".reveal:not(.visible)").forEach((el) => revealObserver.observe(el));

  /* ---------------------------------------------------------
     Micro-interactions: ripple, magnetic buttons, 3D tilt
     --------------------------------------------------------- */
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn || prefersReducedMotion) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const span = document.createElement("span");
    span.className = "ripple";
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.appendChild(span);
    span.addEventListener("animationend", () => span.remove());
  });

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer && !prefersReducedMotion) {
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });

    $$(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  /* ---------------------------------------------------------
     Events: filters, rendering
     --------------------------------------------------------- */
  const CATEGORIES = ["All", ...new Set(EVENTS.map((e) => e.category)), "Saved"];
  const grid = $("#eventsGrid");

  function renderChips() {
    $("#categoryChips").innerHTML = CATEGORIES.map((c) => {
      const count = c === "All" ? EVENTS.length : c === "Saved" ? state.saved.size : EVENTS.filter((e) => e.category === c).length;
      const active = state.category === c;
      return `<button class="chip-btn${active ? " active" : ""}" role="tab" aria-selected="${active}" data-cat="${c}">
                ${c === "Saved" ? "♥ " : ""}${c}<span class="count">${count}</span></button>`;
    }).join("");
  }

  function filteredEvents() {
    const q = state.query.trim().toLowerCase();
    let list = EVENTS.filter((e) => {
      if (state.category === "Saved" && !state.saved.has(e.id)) return false;
      if (!["All", "Saved"].includes(state.category) && e.category !== state.category) return false;
      if (state.mode !== "all" && e.mode !== state.mode) return false;
      if (!q) return true;
      return [e.title, e.desc, e.location, e.category, e.mode, ...e.tags].join(" ").toLowerCase().includes(q);
    });
    const sorters = {
      date: (a, b) => a.date.localeCompare(b.date),
      "price-asc": (a, b) => a.price - b.price || a.date.localeCompare(b.date),
      "price-desc": (a, b) => b.price - a.price || a.date.localeCompare(b.date),
      popular: (a, b) => seatsTaken(b) / b.seats - seatsTaken(a) / a.seats,
    };
    return list.sort(sorters[state.sort]);
  }

  const ICON = {
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 5.6 5 5 0 0 1 21.2 11C19 15.6 12 20 12 20z"/></svg>',
  };

  function cardHTML(e, i) {
    const taken = seatsTaken(e);
    const pct = Math.round((taken / e.seats) * 100);
    const left = e.seats - taken;
    const saved = state.saved.has(e.id);
    const registered = state.registrations[e.id];
    const soldOut = left <= 0;
    return `
      <div class="card-wrap">
      <article class="event-card" style="--i:${i};--banner:${BANNERS[e.category]}" data-id="${e.id}">
        <div class="card-banner">
          <div class="card-date"><b>${fmtDate(e.date, { day: "2-digit" })}</b><small>${fmtDate(e.date, { month: "short" })}</small></div>
          <span class="card-emoji" aria-hidden="true">${e.emoji}</span>
        </div>
        <button class="save-btn${saved ? " saved" : ""}" data-action="save" aria-pressed="${saved}"
                aria-label="${saved ? "Remove from" : "Add to"} saved: ${escapeHTML(e.title)}">${ICON.heart}</button>
        <div class="card-body">
          <div class="card-tags">
            <span class="chip">${e.category}</span>
            <span class="chip chip-mode" style="--dot:${MODE_DOT[e.mode]}">${e.mode}</span>
            ${e.flagship ? '<span class="chip chip-hot">Flagship</span>' : ""}
            ${pct >= 85 && !soldOut ? '<span class="chip chip-hot">🔥 Selling fast</span>' : ""}
          </div>
          <h3 class="card-title">${escapeHTML(e.title)}</h3>
          <p class="card-desc">${escapeHTML(e.desc)}</p>
          <div class="card-meta">
            <span>${ICON.clock}${fmtDate(e.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · ${e.time}</span>
            <span>${ICON.pin}${escapeHTML(e.location)}</span>
          </div>
          <div class="card-seats${pct >= 85 ? " low" : ""}">
            <div class="seat-meter-label"><span>${soldOut ? "Sold out" : `${left.toLocaleString("en-US")} seats left`}</span><span>${pct}% full</span></div>
            <div class="seat-meter-track"><div class="seat-meter-fill" data-width="${pct}"></div></div>
          </div>
          <div class="card-foot">
            <span class="price">${fmtPrice(e.price)}${e.price ? " <small>/ seat</small>" : ""}</span>
            ${registered
              ? `<button class="btn btn-ghost btn-sm" data-action="open">✓ Registered</button>`
              : `<button class="btn btn-primary btn-sm" data-action="open" ${soldOut ? "disabled" : ""}>${soldOut ? "Sold out" : "Register"}</button>`}
          </div>
        </div>
      </article>
      </div>`;
  }

  function renderEvents() {
    const list = filteredEvents();
    grid.classList.toggle("list", state.view === "list");
    grid.innerHTML = list.map(cardHTML).join("");
    $("#emptyState").classList.toggle("hidden", list.length > 0);
    $("#resultsMeta").textContent = list.length
      ? `Showing ${list.length} of ${EVENTS.length} events${state.query ? ` for “${state.query}”` : ""}`
      : "";
    // animate seat meters after paint
    requestAnimationFrame(() => requestAnimationFrame(() =>
      $$(".seat-meter-fill[data-width]", grid).forEach((f) => { f.style.width = f.dataset.width + "%"; })));
  }

  function updateSavedBadge(bump = false) {
    const badge = $("#savedCount");
    badge.textContent = state.saved.size;
    badge.classList.toggle("show", state.saved.size > 0);
    if (bump) { badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump"); }
  }

  function renderAll() { renderChips(); renderEvents(); updateSavedBadge(); }

  // Search (debounced) + keyboard shortcut "/"
  let searchTimer;
  $("#searchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = e.target.value; renderEvents(); }, 180);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.body.classList.contains("modal-open")) {
      e.preventDefault();
      $("#events").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      $("#searchInput").focus({ preventScroll: true });
    }
  });

  $("#modeSelect").addEventListener("change", (e) => { state.mode = e.target.value; renderEvents(); });
  $("#sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; renderEvents(); });

  $("#categoryChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip-btn");
    if (!chip) return;
    state.category = chip.dataset.cat;
    renderChips(); renderEvents();
  });

  $$(".view-btn").forEach((btn) => btn.addEventListener("click", () => {
    state.view = btn.dataset.view;
    store.set("bdai.view", state.view);
    $$(".view-btn").forEach((b) => { b.classList.toggle("active", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
    renderEvents();
  }));
  $$(".view-btn").forEach((b) => { b.classList.toggle("active", b.dataset.view === state.view); b.setAttribute("aria-pressed", String(b.dataset.view === state.view)); });

  $("#resetFilters").addEventListener("click", () => {
    Object.assign(state, { query: "", category: "All", mode: "all", sort: "date" });
    $("#searchInput").value = ""; $("#modeSelect").value = "all"; $("#sortSelect").value = "date";
    renderAll();
  });

  $("#savedBtn").addEventListener("click", () => {
    state.category = "Saved";
    renderChips(); renderEvents();
    $("#events").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    if (!state.saved.size) toast("No saved events yet — tap ♥ on any event", "💡");
  });

  // Card interactions: save, open, spotlight
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".event-card");
    if (!card) return;
    const id = card.dataset.id;
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "save") {
      const ev = EVENTS.find((x) => x.id === id);
      if (state.saved.has(id)) { state.saved.delete(id); toast(`Removed “${ev.title}”`, "🗑️"); }
      else { state.saved.add(id); toast(`Saved “${ev.title}”`, "💖"); }
      store.set("bdai.saved", [...state.saved]);
      updateSavedBadge(true);
      renderChips();
      if (state.category === "Saved") renderEvents();
      else {
        const btn = card.querySelector(".save-btn");
        const on = state.saved.has(id);
        btn.classList.toggle("saved", on);
        btn.setAttribute("aria-pressed", String(on));
        btn.setAttribute("aria-label", `${on ? "Remove from" : "Add to"} saved: ${ev.title}`);
      }
    } else if (action === "open") {
      openEvent(id);
    }
  });
  grid.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".event-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--x", `${e.clientX - r.left}px`);
    card.style.setProperty("--y", `${e.clientY - r.top}px`);
  });

  /* ---------------------------------------------------------
     Modal: event details + registration form
     --------------------------------------------------------- */
  const modal = $("#modal");
  const modalBody = $("#modalBody");
  let lastFocus = null;

  const TICKETS = [
    { id: "standard", name: "Standard", mult: 1, note: "Full access" },
    { id: "vip", name: "VIP", mult: 1.8, note: "Front rows + lounge" },
    { id: "student", name: "Student", mult: 0.5, note: "Valid ID required" },
  ];

  function openModal(html) {
    lastFocus = document.activeElement;
    modalBody.innerHTML = html;
    modal.hidden = false;
    modal.classList.remove("closing");
    document.body.classList.add("modal-open");
    modal.querySelector(".modal-panel").scrollTop = 0;
    setTimeout(() => ($("input, button:not(.modal-close)", modalBody) || $(".modal-close")).focus({ preventScroll: true }), 50);
  }

  function closeModal({ restoreFocus = true } = {}) {
    if (modal.hidden) return;
    modal.classList.add("closing");
    setTimeout(() => {
      modal.hidden = true;
      if (!$$(".modal").some((m) => !m.hidden)) document.body.classList.remove("modal-open");
      if (restoreFocus) lastFocus?.focus?.();
    }, prefersReducedMotion ? 0 : 230);
  }

  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "Tab") { // focus trap
      const f = $$('button:not([disabled]), input, select, [href], [tabindex]:not([tabindex="-1"])', modal).filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function openEvent(id) {
    const e = EVENTS.find((x) => x.id === id);
    const user = account.current();
    const reg = state.registrations[id];
    if (user && reg) return showSuccess(e, reg, false);

    const left = e.seats - seatsTaken(e);
    const free = e.price === 0;
    const details = `
      <div class="modal-hero" style="--banner:${BANNERS[e.category]}">
        <div class="card-tags"><span class="chip">${e.category}</span><span class="chip">${e.mode}</span></div>
        <h2 id="modalTitle">${e.emoji} ${escapeHTML(e.title)}</h2>
        <p>${escapeHTML(e.desc)}</p>
      </div>
      <div class="modal-content">
        <div class="modal-meta">
          <div><small>Date</small>${fmtDate(e.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
          <div><small>Time</small>${e.time}</div>
          <div><small>Location</small>${escapeHTML(e.location)}</div>
          <div><small>Availability</small>${left.toLocaleString("en-US")} of ${e.seats.toLocaleString("en-US")} seats left</div>
        </div>`;

    // Logged out: show the details and ask for an account first.
    if (!user) {
      openModal(`${details}
          <div class="reg-gate">
            <p><b>Registration needs a free BDAI account.</b><br />
              <span class="muted">No email, just your first name, last name and a 6-digit PIN. Your ticket and updates arrive in your BDAI inbox.</span></p>
            <div class="reg-gate-actions">
              <button class="btn btn-primary" data-gate="signup">Create account</button>
              <button class="btn btn-ghost" data-gate="login">Log in</button>
            </div>
          </div>
        </div>`);
      $$("[data-gate]", modalBody).forEach((b) => b.addEventListener("click", () => {
        closeModal({ restoreFocus: false });
        openAuth(b.dataset.gate, {
          reason: `Log in or create an account to register for “${e.title}”.`,
          then: () => openEvent(id),
        });
      }));
      return;
    }

    openModal(`${details}
        <form id="regForm" novalidate>
          <div class="reg-as">
            <span class="avatar-sm" style="--av:${user.av}">${escapeHTML(user.initials)}</span>
            <div><small class="muted">Registering as</small><b>${escapeHTML(user.name)}</b></div>
            <span class="chip">📬 Confirmation goes to your inbox</span>
          </div>
          <div class="form-grid">
            ${free ? "" : `
            <fieldset class="field full" style="border:0;padding:0;margin:0">
              <legend style="font-size:.85rem;font-weight:600;margin-bottom:.35rem">Ticket type</legend>
              <div class="tickets">
                ${TICKETS.map((t, i) => `
                  <div class="ticket-opt">
                    <input type="radio" name="ticket" id="t-${t.id}" value="${t.id}" ${i === 0 ? "checked" : ""} />
                    <label for="t-${t.id}"><b>${t.name} · ${fmtPrice(Math.round(e.price * t.mult))}</b><span>${t.note}</span></label>
                  </div>`).join("")}
              </div>
            </fieldset>`}
            <div class="field">
              <span style="font-size:.85rem;font-weight:600" id="qtyLabel">Attendees</span>
              <div class="stepper" role="group" aria-labelledby="qtyLabel">
                <button type="button" data-step="-1" aria-label="Fewer attendees">−</button>
                <output id="qty" aria-live="polite">1</output>
                <button type="button" data-step="1" aria-label="More attendees">+</button>
              </div>
            </div>
          </div>

          <div class="total-row">
            <span class="muted">Total</span>
            <span class="price" id="total">${fmtPrice(e.price)}</span>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">${free ? "Reserve free seat" : "Confirm registration"}</button>
        </form>
      </div>`);

    const form = $("#regForm");
    const maxQty = Math.max(1, Math.min(10, left));
    let qty = 1;

    const updateTotal = () => {
      const t = TICKETS.find((x) => x.id === (form.elements.ticket?.value || "standard"));
      const total = Math.round(e.price * t.mult) * qty;
      const el = $("#total");
      el.textContent = fmtPrice(total);
      el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
    };

    form.addEventListener("click", (ev) => {
      const step = ev.target.closest("[data-step]");
      if (!step) return;
      const next = qty + Number(step.dataset.step);
      if (next < 1) return;
      if (next > maxQty) { toast(`Maximum ${maxQty} attendees per registration`, "⚠️"); return; }
      qty = next;
      $("#qty").textContent = qty;
      updateTotal();
    });
    form.addEventListener("change", (ev) => { if (ev.target.name === "ticket") updateTotal(); });

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const submit = $('button[type="submit"]', form);
      submit.disabled = true;
      submit.textContent = "Processing…";

      setTimeout(() => { // simulate a network request
        const ticket = TICKETS.find((x) => x.id === (form.elements.ticket?.value || "standard"));
        const reg = {
          name: user.name,
          qty,
          ticket: ticket.name,
          total: Math.round(e.price * ticket.mult) * qty,
          code: "BDAI-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        };
        state.registrations[e.id] = reg;
        saveRegs();
        inbox.add({
          from: "BDAI Tickets", category: "Events",
          subject: `You're registered: ${e.title}`,
          body: `Hi ${user.first},\n\nYour registration is confirmed.\n\nEvent: ${e.title}\nDate: ${fmtDate(e.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}\nTime: ${e.time}\nLocation: ${e.location}\nTicket: ${reg.ticket} × ${reg.qty}\nTotal: ${fmtPrice(reg.total)}\nConfirmation code: ${reg.code}\n\nShow this code at check-in. You can add the event to your calendar or cancel your registration from the event on the Events page.`,
          cta: { label: "View events", href: "index-5.html#events" },
        });
        showSuccess(e, reg, true);
      }, 900);
    });
  }

  function showSuccess(e, reg, fresh) {
    const html = `
      <div class="success">
        <div class="check-anim"><svg viewBox="0 0 24 24" width="40" height="40"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h2 id="modalTitle">${fresh ? "You're in! 🎉" : "Your ticket"}</h2>
        <p class="muted">${fresh ? "Your confirmation is waiting in your BDAI inbox." : `Registered as <b>${escapeHTML(reg.name)}</b>`}</p>
        <div class="ticket" style="--banner:${BANNERS[e.category]}">
          <div class="ticket-top"><b>${e.emoji} ${escapeHTML(e.title)}</b><br /><small>${fmtDate(e.date, { month: "long", day: "numeric", year: "numeric" })} · ${escapeHTML(e.location)}</small></div>
          <div class="ticket-bottom">
            <span class="muted">Attendee</span><span>${escapeHTML(reg.name)}</span>
            <span class="muted">Ticket</span><span>${reg.ticket} × ${reg.qty}</span>
            <span class="muted">Total</span><span>${fmtPrice(reg.total)}</span>
            <span class="muted">Code</span><span class="code">${reg.code}</span>
          </div>
        </div>
        <div style="display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" id="calBtn">Add to calendar</button>
          <a class="btn btn-ghost" href="inbox-5.html">Open inbox</a>
          <button class="btn btn-ghost" id="cancelReg">Cancel registration</button>
        </div>
      </div>`;
    if (fresh) modalBody.innerHTML = html; else openModal(html);
    if (fresh) { confetti(); toast("Registration confirmed, check your inbox", "🎟️"); $("#calBtn").focus(); }

    $("#calBtn").addEventListener("click", () => downloadICS(e));
    $("#cancelReg").addEventListener("click", () => {
      delete state.registrations[e.id];
      saveRegs();
      inbox.add({
        from: "BDAI Tickets", category: "Events",
        subject: `Registration cancelled: ${e.title}`,
        body: `Your registration for ${e.title} (code ${reg.code}) has been cancelled.\n\nChanged your mind? You can register again from the Events page while seats are available.`,
        cta: { label: "View events", href: "index-5.html#events" },
      });
      closeModal();
      toast("Registration cancelled", "↩️");
    });
  }

  function downloadICS(e) {
    const d = e.date.replace(/-/g, "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BDAI Events//EN", "BEGIN:VEVENT",
      `UID:${e.id}@bdai-events`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${e.title}`, `LOCATION:${e.location}`, `DESCRIPTION:${e.desc}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${e.id}.ics` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Calendar file downloaded", "📅");
  }

  function confetti() {
    if (prefersReducedMotion) return;
    const colors = ["#7c5cff", "#00d4ff", "#ff4fd8", "#22e39b", "#ffb020"];
    for (let i = 0; i < 90; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      c.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % colors.length]};
        --dx:${(Math.random() - 0.5) * 300}px;--rot:${Math.random() * 900}deg;
        animation-duration:${2 + Math.random() * 1.8}s;animation-delay:${Math.random() * 0.3}s`;
      document.body.appendChild(c);
      c.addEventListener("animationend", () => c.remove());
    }
  }

  /* ---------------------------------------------------------
     Schedule: tabs + personal agenda
     --------------------------------------------------------- */
  const tabs = $$(".tab");
  const indicator = $("#tabIndicator");

  function moveIndicator() {
    const active = tabs[state.day];
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
  }

  function renderTimeline() {
    $("#timeline").innerHTML = AGENDA[state.day].map((s, i) => {
      const key = `${state.day}-${i}`;
      const added = state.agenda.has(key);
      const isBreak = s.track === "Break";
      return `
        <li class="session" style="--i:${i}">
          <div class="session-time">${s.t}</div>
          ${isBreak
            ? `<div class="session-card" style="opacity:.75"><h4>${s.title}</h4><p>${s.who} · ${s.room}</p></div>`
            : `<button class="session-card${added ? " added" : ""}" data-key="${key}" aria-pressed="${added}">
                <div class="session-top">
                  <span class="chip chip-mode ${s.track === "Keynote" ? "track-keynote" : ""}">${s.track}</span>
                  <span class="session-add">${added ? "✓ In my agenda" : "+ Add to agenda"}</span>
                </div>
                <h4>${s.title}</h4>
                <p>${s.who} · ${s.room}</p>
              </button>`}
        </li>`;
    }).join("");
    const n = state.agenda.size;
    $("#agendaNote").textContent = n ? `You have ${n} session${n > 1 ? "s" : ""} in your personal agenda.` : "";
  }

  tabs.forEach((tab, i) => tab.addEventListener("click", () => {
    state.day = i;
    tabs.forEach((t, j) => { t.classList.toggle("active", j === i); t.setAttribute("aria-selected", String(j === i)); });
    moveIndicator();
    renderTimeline();
  }));
  $("#dayTabs").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const next = (state.day + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });

  $("#timeline").addEventListener("click", (e) => {
    const card = e.target.closest("button.session-card");
    if (!card) return;
    const key = card.dataset.key;
    const title = $("h4", card).textContent;
    if (state.agenda.has(key)) { state.agenda.delete(key); toast(`Removed “${title}”`, "🗓️"); }
    else { state.agenda.add(key); toast(`Added “${title}” to your agenda`, "✅"); }
    store.set("bdai.agenda", [...state.agenda]);
    renderTimeline();
  });
  window.addEventListener("resize", moveIndicator);

  /* ---------------------------------------------------------
     Team: flip cards (front: profile, back: summit sessions)
     --------------------------------------------------------- */
  // First letter of the first and last word, e.g. "Tolstoy Kr. Roy" -> "TR".
  const initials = (name) => { const w = name.split(" "); return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase(); };
  const sessionsFor = (name) => AGENDA.flatMap((day, d) =>
    day.filter((s) => s.who.includes(name)).map((s) => ({ ...s, day: d + 1 })));

  $("#speakersGrid").innerHTML = TEAM.map((m, i) => {
    const sessions = sessionsFor(m.name);
    const count = sessions.length;
    return `
    <button class="speaker reveal${m.featured ? " featured" : ""}" style="transition-delay:${(i % 4) * 80}ms"
            aria-label="${m.name}, ${m.role}. ${count} summit session${count === 1 ? "" : "s"}: ${sessions.map((s) => s.title).join("; ")}">
      <div class="speaker-inner">
        <div class="speaker-face">
          <div class="avatar" style="--av:${m.av}">${initials(m.name)}</div>
          <h3>${m.name}</h3>
          <p class="role">${m.role}</p>
          ${m.featured ? `<p class="bio">${m.bio}</p>` : ""}
          ${count ? `<span class="chip">🎤 ${count} summit session${count === 1 ? "" : "s"}</span>` : ""}
        </div>
        <div class="speaker-face speaker-back">
          <h3>${m.name}</h3>
          <p class="role">${m.role}</p>
          <p class="talk">At the Global Summit</p>
          <ul class="talk-list">
            ${sessions.map((s) => `<li><small>Day ${s.day} · ${s.t}</small>${s.title}</li>`).join("")}
          </ul>
        </div>
      </div>
    </button>`;
  }).join("");
  $("#speakersGrid").addEventListener("click", (e) => e.target.closest(".speaker")?.classList.toggle("flipped"));

  /* ---------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------- */
  $("#faqList").innerHTML = FAQS.map((f, i) => `
    <div class="acc-item reveal" style="transition-delay:${i * 60}ms">
      <button class="acc-q" aria-expanded="false" aria-controls="faq-a-${i}" id="faq-q-${i}">
        ${f.q}<span class="acc-icon" aria-hidden="true">+</span>
      </button>
      <div class="acc-a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}"><div><p>${f.a}</p></div></div>
    </div>`).join("");
  $("#faqList").addEventListener("click", (e) => {
    const q = e.target.closest(".acc-q");
    if (!q) return;
    const item = q.parentElement;
    const open = !item.classList.contains("open");
    $$(".acc-item", $("#faqList")).forEach((it) => { it.classList.remove("open"); $(".acc-q", it).setAttribute("aria-expanded", "false"); });
    item.classList.toggle("open", open);
    q.setAttribute("aria-expanded", String(open));
  });

  /* ---------------------------------------------------------
     Subscription card: subscribing comes with an account (no email)
     --------------------------------------------------------- */
  function renderAccountCta() {
    const el = $("#accountCta");
    const user = account.current();
    if (!user) {
      el.innerHTML = `
        <div>
          <h2>Never miss a drop.</h2>
          <p>Create a free BDAI account and the monthly drop lands in your BDAI inbox. No email needed: just your first name, last name and a 6-digit PIN.</p>
        </div>
        <div class="cta-actions">
          <button class="btn btn-light" data-auth="signup">Create account &amp; subscribe</button>
          <button class="btn btn-outline-light" data-auth="login">Log in</button>
        </div>`;
      return;
    }
    const unread = inbox.unread();
    const first = escapeHTML(user.first);
    el.innerHTML = user.subscribed ? `
        <div>
          <h2>You're subscribed, ${first}.</h2>
          <p>New drops, early-bird tickets and event updates arrive in your BDAI inbox.</p>
        </div>
        <div class="cta-actions">
          <a class="btn btn-light" href="inbox-5.html">Open inbox${unread ? ` (${unread} new)` : ""}</a>
          <button class="btn btn-outline-light" data-cta="unsubscribe">Unsubscribe</button>
        </div>` : `
        <div>
          <h2>Get the monthly drop, ${first}.</h2>
          <p>Early-bird tickets, speaker announcements and new city launches, once a month, straight to your BDAI inbox.</p>
        </div>
        <div class="cta-actions">
          <button class="btn btn-light" data-cta="subscribe">Subscribe</button>
          <a class="btn btn-outline-light" href="inbox-5.html">Open inbox</a>
        </div>`;
  }
  $("#accountCta").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cta]");
    if (!btn) return;
    const on = btn.dataset.cta === "subscribe";
    account.setSubscribed(on);
    toast(on ? "Subscribed! New drops will arrive in your inbox" : "Unsubscribed from the monthly drop", on ? "📬" : "👋");
  });

  // Logging in/out (here or in another tab) or a new inbox message refreshes what depends on the account.
  onChange(() => {
    state.registrations = loadRegs();
    renderEvents();
    if ($(".countdown-card")?.classList.contains("visible")) updateFlagshipMeter();
    renderAccountCta();
  });

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  $("#year").textContent = new Date().getFullYear();
  renderAll();
  renderTimeline();
  renderAccountCta();
  requestAnimationFrame(moveIndicator);
  document.fonts?.ready.then(moveIndicator);
  observeReveals();
})();

/* ##########################################################
   PART 3 · INBOX PAGE (inbox-5.html only)
   ########################################################## */
(() => {
  "use strict";

  const { $, $$, escapeHTML, toast, account, inbox, onChange } = window.BDAI;
  if (document.body.dataset.page !== "inbox") return; // this part is only for inbox-5.html
  const app = $("#inboxApp");

  const ui = { folder: "all", query: "", openId: null, userId: null, deleteArmed: false };

  const FOLDERS = [
    { id: "all", label: "All mail", icon: "📥" },
    { id: "unread", label: "Unread", icon: "🔵" },
    { id: "starred", label: "Starred", icon: "⭐" },
    { id: "Updates", label: "Updates", icon: "📰" },
    { id: "Events", label: "Events", icon: "🎟️" },
    { id: "Account", label: "Account", icon: "🔐" },
  ];
  const EMPTY = {
    all: "Your inbox is empty.",
    unread: "You're all caught up. No unread messages.",
    starred: "No starred messages yet. Star a message to keep it handy.",
    Updates: "No updates yet. The monthly drop will land here.",
    Events: "No event messages yet. Register for an event to get your ticket here.",
    Account: "No account messages.",
  };
  const SENDER_AV = {
    "BDAI Tickets": "linear-gradient(135deg,#ff9f43,#ff4fd8)",
    "BDAI Events Team": "linear-gradient(135deg,#7c5cff,#00d4ff)",
  };
  const senderInitials = (from) => from.replace(/^BDAI\s+/, "").slice(0, 1).toUpperCase();

  const ICON = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  };

  /* ---------- formatting ---------- */
  function relTime(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 7 * 86400) return new Date(ts).toLocaleDateString("en-US", { weekday: "short" });
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const fullDate = (ts) => new Date(ts).toLocaleString("en-US",
    { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const paragraphs = (text) => text.split(/\n{2,}/).map((p) => `<p>${escapeHTML(p).replace(/\n/g, "<br />")}</p>`).join("");
  const snippet = (text) => text.replace(/\s+/g, " ").slice(0, 110);

  /* ---------- filtering ---------- */
  const inFolder = (m, f) => f === "all" || (f === "unread" && !m.read) || (f === "starred" && m.starred) || m.category === f;
  const matches = (m, q) => !q || `${m.from} ${m.subject} ${m.body}`.toLowerCase().includes(q);
  const visible = () => inbox.list().filter((m) => inFolder(m, ui.folder) && matches(m, ui.query.trim().toLowerCase()));
  const countFor = (f) => inbox.list().filter((m) => inFolder(m, f)).length;

  /* ---------- rendering ---------- */
  function render() {
    // Remember which control had focus so re-rendering doesn't lose the keyboard position.
    const focusKey = document.activeElement?.dataset?.fk;
    const user = account.current();
    if (!user) {
      Object.assign(ui, { userId: null, openId: null, deleteArmed: false });
      renderLocked();
      return;
    }
    if (ui.userId !== user.id || !$("#mailList")) {
      Object.assign(ui, { userId: user.id, openId: null, folder: "all", query: "", deleteArmed: false });
      renderShell();
    }
    if (ui.openId && !inbox.list().some((m) => m.id === ui.openId)) ui.openId = null;
    renderTop(user);
    renderFolders();
    renderProfile(user);
    renderList();
    renderReader();
    if (focusKey) $(`[data-fk="${focusKey}"]`)?.focus();
  }

  function renderLocked() {
    document.title = "Inbox — BDAI Events";
    app.innerHTML = `
      <section class="inbox-locked">
        <div class="lock-icon" aria-hidden="true">🔒</div>
        <span class="eyebrow">Inbox</span>
        <h1>Your BDAI inbox</h1>
        <p class="muted">Ticket confirmations, account messages and the monthly drop all arrive here. No email needed: an account is just your first name, last name and a 6-digit PIN.</p>
        <div class="locked-actions">
          <button class="btn btn-primary" data-auth="login">Log in</button>
          <button class="btn btn-ghost" data-auth="signup">Create account</button>
        </div>
      </section>`;
  }

  function renderShell() {
    app.innerHTML = `
      <div class="inbox-top">
        <div>
          <span class="eyebrow">Inbox</span>
          <h1 id="inboxTitle"></h1>
          <p class="muted" id="inboxSub"></p>
        </div>
        <button class="btn btn-ghost btn-sm" id="markAll" data-fk="mark-all">${ICON.mail} Mark all as read</button>
      </div>
      <div class="inbox-grid" id="inboxGrid">
        <aside class="inbox-side">
          <nav class="folders" id="folders" aria-label="Folders"></nav>
          <section class="profile-card" id="profile" aria-label="Your profile"></section>
        </aside>
        <section class="mail-list-wrap" aria-label="Messages">
          <label class="search mail-search">
            ${ICON.search}
            <input type="search" id="mailSearch" placeholder="Search messages" aria-label="Search messages" />
          </label>
          <ul class="mail-list" id="mailList"></ul>
        </section>
        <article class="reader" id="reader"></article>
      </div>`;

    $("#mailSearch").addEventListener("input", (e) => { ui.query = e.target.value; renderList(); });
    $("#markAll").addEventListener("click", () => {
      if (!inbox.unread()) return toast("You're all caught up", "✅");
      inbox.updateAll({ read: true });
      toast("All messages marked as read", "✅");
    });
    $("#folders").addEventListener("click", onFolderClick);
    $("#mailList").addEventListener("click", onListClick);
    $("#mailList").addEventListener("keydown", onListKeys);
    $("#reader").addEventListener("click", onReaderClick);
    $("#profile").addEventListener("change", onProfileChange);
    $("#profile").addEventListener("click", onProfileClick);
  }

  function renderTop(user) {
    const unread = inbox.unread(), total = inbox.list().length;
    $("#inboxTitle").textContent = `Hi, ${user.first}`;
    $("#inboxSub").textContent = `${unread ? `${unread} unread · ` : "All caught up · "}${total} message${total === 1 ? "" : "s"}`;
    document.title = `${unread ? `(${unread}) ` : ""}Inbox — BDAI Events`;
  }

  function renderFolders() {
    $("#folders").innerHTML = FOLDERS.map((f) => {
      const n = countFor(f.id);
      const active = ui.folder === f.id;
      return `<button class="folder${active ? " active" : ""}" data-folder="${f.id}" data-fk="folder-${f.id}" aria-pressed="${active}">
                <span><span aria-hidden="true">${f.icon}</span> ${f.label}</span>${n ? `<span class="n">${n}</span>` : ""}
              </button>`;
    }).join("");
  }

  function renderProfile(user) {
    $("#profile").innerHTML = `
      <span class="avatar-sm xl" style="--av:${user.av}" aria-hidden="true">${escapeHTML(user.initials)}</span>
      <div class="profile-info">
        <h3>${escapeHTML(user.name)}</h3>
        <p class="muted small">Member since ${new Date(user.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
      </div>
      <label class="switch-row">
        <span><b>Monthly drop</b><small>${user.subscribed ? "Subscribed. New drops arrive here." : "Not subscribed"}</small></span>
        <input type="checkbox" class="switch" id="subSwitch" role="switch" data-fk="sub-switch" ${user.subscribed ? "checked" : ""} />
      </label>
      <div class="profile-actions">
        <button class="btn btn-ghost btn-sm" data-acc="logout">Log out</button>
        <button class="btn btn-sm btn-danger${ui.deleteArmed ? " armed" : ""}" id="deleteAcc" data-fk="delete-acc">
          ${ui.deleteArmed ? "Click again to delete" : "Delete account"}
        </button>
      </div>`;
  }

  function renderList() {
    const list = visible();
    $("#inboxGrid").classList.toggle("reading", !!ui.openId);
    if (!list.length) {
      $("#mailList").innerHTML = `
        <li class="mail-empty">
          <span aria-hidden="true">📭</span>
          <p>${ui.query.trim() ? "No messages match your search." : EMPTY[ui.folder]}</p>
        </li>`;
      return;
    }
    $("#mailList").innerHTML = list.map((m) => `
      <li class="mail-item${m.read ? "" : " unread"}${m.id === ui.openId ? " active" : ""}">
        <button class="mail-open" data-id="${m.id}" data-fk="open-${m.id}"
                aria-label="${m.read ? "" : "Unread. "}From ${escapeHTML(m.from)}: ${escapeHTML(m.subject)}. ${relTime(m.date)}"
                ${m.id === ui.openId ? 'aria-current="true"' : ""}>
          <span class="avatar-sm" style="--av:${SENDER_AV[m.from] || SENDER_AV["BDAI Events Team"]}" aria-hidden="true">${senderInitials(m.from)}</span>
          <span class="mail-text">
            <span class="mail-from"><span>${escapeHTML(m.from)}</span><time datetime="${new Date(m.date).toISOString()}">${relTime(m.date)}</time></span>
            <span class="mail-subj">${m.read ? "" : '<span class="unread-dot" aria-hidden="true"></span>'}${escapeHTML(m.subject)}</span>
            <span class="mail-snip">${escapeHTML(snippet(m.body))}</span>
          </span>
        </button>
        <button class="star-btn${m.starred ? " on" : ""}" data-star="${m.id}" data-fk="star-${m.id}"
                aria-pressed="${!!m.starred}" aria-label="${m.starred ? "Unstar" : "Star"} message">${ICON.star}</button>
      </li>`).join("");
  }

  function renderReader() {
    const m = inbox.list().find((x) => x.id === ui.openId);
    const reader = $("#reader");
    if (!m) {
      reader.classList.add("reader-empty");
      reader.innerHTML = `
        <div>
          <div class="reader-empty-icon" aria-hidden="true">✉️</div>
          <h2>Select a message</h2>
          <p class="muted">Choose a message from the list to read it here.</p>
        </div>`;
      return;
    }
    reader.classList.remove("reader-empty");
    reader.innerHTML = `
      <button class="btn btn-ghost btn-sm reader-back" data-r="back" data-fk="r-back">${ICON.back} Back to inbox</button>
      <header class="reader-head">
        <span class="chip">${escapeHTML(m.category)}</span>
        <h2 id="readerTitle" tabindex="-1">${escapeHTML(m.subject)}</h2>
        <div class="reader-meta">
          <span class="avatar-sm" style="--av:${SENDER_AV[m.from] || SENDER_AV["BDAI Events Team"]}" aria-hidden="true">${senderInitials(m.from)}</span>
          <div><b>${escapeHTML(m.from)}</b><small class="muted">${fullDate(m.date)}</small></div>
        </div>
      </header>
      <div class="reader-body">${paragraphs(m.body)}</div>
      ${m.cta ? `<a class="btn btn-primary" href="${escapeHTML(m.cta.href)}">${escapeHTML(m.cta.label)}</a>` : ""}
      <div class="reader-actions">
        <button class="btn btn-ghost btn-sm${m.starred ? " is-on" : ""}" data-r="star" data-fk="r-star" aria-pressed="${!!m.starred}">${ICON.star} ${m.starred ? "Starred" : "Star"}</button>
        <button class="btn btn-ghost btn-sm" data-r="unread" data-fk="r-unread">${ICON.mail} Mark as unread</button>
        <button class="btn btn-ghost btn-sm" data-r="delete" data-fk="r-delete">${ICON.trash} Delete</button>
      </div>`;
  }

  /* ---------- interactions ---------- */
  function openMessage(id) {
    ui.openId = id;
    const m = inbox.list().find((x) => x.id === id);
    if (m && !m.read) inbox.update(id, { read: true }); // triggers a re-render
    else { renderList(); renderReader(); }
    // On phones the reader replaces the list, so bring it into view.
    if (window.matchMedia("(max-width: 720px)").matches) $("#inboxGrid").scrollIntoView({ block: "start" });
    $("#readerTitle")?.focus({ preventScroll: true });
  }

  function onFolderClick(e) {
    const b = e.target.closest("[data-folder]");
    if (!b) return;
    ui.folder = b.dataset.folder;
    renderFolders();
    renderList();
  }

  function onListClick(e) {
    const star = e.target.closest("[data-star]");
    if (star) {
      const m = inbox.list().find((x) => x.id === star.dataset.star);
      inbox.update(m.id, { starred: !m.starred });
      return;
    }
    const open = e.target.closest(".mail-open");
    if (open) openMessage(open.dataset.id);
  }

  // Up/Down arrows move between messages in the list.
  function onListKeys(e) {
    if (!["ArrowDown", "ArrowUp"].includes(e.key) || !e.target.closest(".mail-open")) return;
    const items = $$(".mail-open", $("#mailList"));
    const i = items.indexOf(e.target.closest(".mail-open"));
    const next = items[i + (e.key === "ArrowDown" ? 1 : -1)];
    if (next) { e.preventDefault(); next.focus(); }
  }

  function onReaderClick(e) {
    const action = e.target.closest("[data-r]")?.dataset.r;
    if (!action) return;
    const id = ui.openId;
    const m = inbox.list().find((x) => x.id === id);
    if (action === "back") {
      ui.openId = null;
      renderList(); renderReader();
      $(`[data-fk="open-${id}"]`)?.focus();
    } else if (action === "star") {
      inbox.update(id, { starred: !m.starred });
    } else if (action === "unread") {
      ui.openId = null;
      inbox.update(id, { read: false });
      toast("Marked as unread", "🔵");
    } else if (action === "delete") {
      ui.openId = null;
      const removed = inbox.remove(id);
      toast("Message deleted", "🗑️", { action: { label: "Undo", onClick: () => inbox.restore(removed) } });
    }
  }

  function onProfileChange(e) {
    if (e.target.id !== "subSwitch") return;
    const on = e.target.checked;
    account.setSubscribed(on);
    toast(on ? "Subscribed! New drops will arrive here" : "Unsubscribed from the monthly drop", on ? "📬" : "👋");
  }

  let disarmTimer;
  function onProfileClick(e) {
    if (!e.target.closest("#deleteAcc")) return;
    if (!ui.deleteArmed) { // two-step confirmation
      ui.deleteArmed = true;
      renderProfile(account.current());
      $("#deleteAcc").focus();
      clearTimeout(disarmTimer);
      disarmTimer = setTimeout(() => {
        ui.deleteArmed = false;
        if (account.current()) renderProfile(account.current());
      }, 4000);
      return;
    }
    clearTimeout(disarmTimer);
    account.deleteAccount();
    toast("Your account and inbox were deleted", "🗑️");
  }

  /* ---------- init ---------- */
  $("#year").textContent = new Date().getFullYear();
  onChange(render);
  render();
  setInterval(() => { if ($("#mailList")) renderList(); }, 60 * 1000); // keep "5 min ago" fresh
})();
