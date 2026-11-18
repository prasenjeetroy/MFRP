/* =========================================================
   BDAI Sports & Health — script-6.js
   Powered by BDAIWellness

   Front-end demo of a password-free account system:
   - Sign up with first + last name → a personal address is
     generated: firstname.lastname@wellness.inbox.bdai
   - Sign in with that address + a PIN security key (no password)
   - Recovery security key, lock screen, auto-lock, cooldowns
   - Subscriptions with PIN-authorized checkout
   - A personal BDAI inbox (welcome, security, billing, coach mail)

   All data is stored in this browser only. PINs and recovery keys
   are salted + hashed with PBKDF2-SHA-256; card numbers and CVCs are
   never stored. For production, move accounts, PIN verification,
   mail and payments to a server and a real payment provider.
   ========================================================= */
(() => {
  'use strict';

  document.documentElement.classList.remove('no-js');

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const round2 = (n) => Math.round(n * 100) / 100;
  const initials = (name) => (String(name || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('') || 'BD').toUpperCase();
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDateTime = (ts) => new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtMailTime = (ts) => {
    const d = new Date(ts);
    return d.toDateString() === new Date().toDateString()
      ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
  const fmtMoney = (amount, currency) => {
    const frac = amount % 1 !== 0;
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency', currency, minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: frac ? 2 : 0,
    }).format(amount);
  };
  const addPeriod = (ts, cycle) => {
    const d = new Date(ts);
    if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.getTime();
  };
  const shuffled = (arr) => {
    const a = arr.slice();
    const rnd = crypto.getRandomValues(new Uint32Array(a.length));
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd[i] % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const downloadText = (filename, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  };

  /* ---------------------------------------------------------
     Names & generated email addresses
     --------------------------------------------------------- */
  const DOMAIN = 'wellness.inbox.bdai';
  const NAME_RE = /^\p{L}[\p{L}\p{M}' .-]{0,29}$/u;
  const cleanName = (s) => String(s || '').trim().replace(/\s+/g, ' ');
  const titleCase = (s) => cleanName(s).replace(/(^|[\s'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
  const slugify = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const fullName = (u) => `${u.first} ${u.last}`.trim();

  /** firstname.lastname@wellness.inbox.bdai — numbered if already taken on this device. */
  function generateEmail(first, last) {
    const base = [slugify(first), slugify(last)].filter(Boolean).join('.') || 'athlete';
    let local = base;
    let n = 2;
    while (db.get(`${local}@${DOMAIN}`)) local = `${base}${n++}`;
    return `${local}@${DOMAIN}`;
  }
  /** Accepts "first.last" or the full address. */
  function normalizeLoginEmail(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return '';
    return s.includes('@') ? s : `${s}@${DOMAIN}`;
  }
  const isBdaiEmail = (s) => new RegExp(`^[a-z0-9]+(\\.[a-z0-9]+)*@${DOMAIN.replace(/\./g, '\\.')}$`).test(s);

  /* ---------------------------------------------------------
     Safe storage (falls back to memory when blocked)
     --------------------------------------------------------- */
  function makeStore(name) {
    let area = null;
    const mem = new Map();
    try {
      area = window[name];
      area.setItem('__bdai_t', '1');
      area.removeItem('__bdai_t');
    } catch {
      area = null;
    }
    return {
      get(key, fallback = null) {
        if (area) {
          try {
            const v = area.getItem(key);
            return v === null ? fallback : JSON.parse(v);
          } catch { /* fall through */ }
        }
        return mem.has(key) ? mem.get(key) : fallback;
      },
      set(key, value) {
        mem.set(key, value);
        if (area) { try { area.setItem(key, JSON.stringify(value)); } catch { /* memory only */ } }
      },
      remove(key) {
        mem.delete(key);
        if (area) { try { area.removeItem(key); } catch { /* ignore */ } }
      },
    };
  }
  const local = makeStore('localStorage');
  const session = makeStore('sessionStorage');

  /* ---------------------------------------------------------
     Crypto: PBKDF2-SHA-256 hashing
     --------------------------------------------------------- */
  const enc = new TextEncoder();
  const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const randomHex = (bytes = 16) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));
  const hasSubtle = !!(window.crypto && crypto.subtle && window.isSecureContext !== false);

  async function deriveHash(secret, salt, iterations = 150000) {
    if (hasSubtle) {
      const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' }, key, 256);
      return toHex(bits);
    }
    // Fallback for non-secure contexts (demo only): iterated FNV-1a.
    const s = `${salt}:${secret}`;
    let out = '';
    let h = 2166136261 >>> 0;
    for (let r = 0; r < 8; r++) {
      for (let k = 0; k < 2000; k++) {
        for (let i = 0; i < s.length; i++) {
          h ^= s.charCodeAt(i) + r + k;
          h = Math.imul(h, 16777619) >>> 0;
        }
      }
      out += h.toString(16).padStart(8, '0');
    }
    return out;
  }
  function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  /* ---------------------------------------------------------
     Data
     --------------------------------------------------------- */
  const PLANS = {
    starter: { name: 'Starter', tier: 0, price: { INR: { monthly: 0, yearly: 0 }, USD: { monthly: 0, yearly: 0 } } },
    pro: { name: 'Pro', tier: 1, price: { INR: { monthly: 499, yearly: 4790 }, USD: { monthly: 9, yearly: 86 } } },
    elite: { name: 'Elite', tier: 2, price: { INR: { monthly: 999, yearly: 9590 }, USD: { monthly: 19, yearly: 182 } } },
  };
  const TIER_PLAN = ['starter', 'pro', 'elite'];
  const PROMOS = {
    BDAI20: { pct: 20, label: '20% off your first payment' },
    WELLNESS10: { pct: 10, label: '10% off your first payment' },
    ATHLETE50: { pct: 50, label: '50% off your first year', yearlyOnly: true },
  };
  /* ---------- Wallet & rewards ---------- */
  // Per-currency wallet rules. Cash earned per point; points' value at checkout.
  const WALLET_CFG = {
    INR: { welcome: 1000, dailyCap: 200, cashPerPoint: 0.2, pointValue: 0.1 },
    USD: { welcome: 15, dailyCap: 4, cashPerPoint: 0.004, pointValue: 0.002 },
  };
  const MAX_POINTS_SHARE = 0.5; // points can cover up to 50% of a price
  const DAILY_POINTS_CAP = 1500;
  const ACTIVITIES = {
    run: { label: 'Running', rate: 3 },
    football: { label: 'Football', rate: 3 },
    swim: { label: 'Swimming', rate: 3 },
    cycle: { label: 'Cycling', rate: 2.5 },
    strength: { label: 'Strength training', rate: 2.5 },
    cricket: { label: 'Cricket', rate: 2 },
    yoga: { label: 'Yoga', rate: 1.5 },
    walk: { label: 'Walking', rate: 1 },
    meditation: { label: 'Meditation', rate: 1 },
  };
  const DAILY_TASKS = [
    { id: 'checkin', icon: 'check', title: 'Daily check-in', desc: 'Open BDAI and check in', points: 10 },
    { id: 'water', icon: 'drop', title: 'Hydration goal', desc: 'Drank 8 glasses of water', points: 10 },
    { id: 'breathe', icon: 'wind', title: 'Breathing break', desc: '30-second guided breathing', points: 15, timer: 30 },
    { id: 'tool', icon: 'chart', title: 'Know your numbers', desc: 'Use any health tool on the page', points: 10, auto: true },
  ];
  const MILESTONES = [
    { id: 'first', title: 'First workout', desc: 'Log your first activity', goal: 1, metric: 'workouts', points: 50, cash: 0 },
    { id: 'five', title: 'Getting serious', desc: 'Log 5 activities', goal: 5, metric: 'workouts', points: 150, cashMul: 25 },
    { id: 'ten', title: 'Committed athlete', desc: 'Log 10 activities', goal: 10, metric: 'workouts', points: 300, cashMul: 50 },
    { id: 'pts1k', title: 'Point collector', desc: 'Earn 1,000 lifetime points', goal: 1000, metric: 'lifetime', points: 0, cashMul: 50 },
    { id: 'minutes', title: '10 hours active', desc: 'Log 600 active minutes', goal: 600, metric: 'minutes', points: 250, cashMul: 75 },
  ];
  const PIN_MAX_FAILS = 15; // account frozen after this many wrong PINs
  const PIN_BATCH = 5; // cooldown after every N wrong PINs

  const KEYS = {
    users: 'bdai6.v2.users',
    session: 'bdai6.v2.session',
    devices: 'bdai6.v2.devices',
    theme: 'bdai6.theme',
    currency: 'bdai6.currency',
  };

  const db = {
    all() { return local.get(KEYS.users, {}) || {}; },
    get(email) { return email ? this.all()[email] || null : null; },
    save(user) { const all = this.all(); all[user.email] = user; local.set(KEYS.users, all); },
    remove(email) { const all = this.all(); delete all[email]; local.set(KEYS.users, all); },
  };

  // Accounts that have signed in on this device (for quick sign-in)
  const devices = {
    list() { return (local.get(KEYS.devices, []) || []).filter((e) => db.get(e)); },
    add(email) { local.set(KEYS.devices, [email, ...this.list().filter((e) => e !== email)].slice(0, 5)); },
    remove(email) { local.set(KEYS.devices, this.list().filter((e) => e !== email)); },
  };

  const state = {
    email: null,
    locked: false,
    billing: 'monthly',
    currency: local.get(KEYS.currency, 'INR') === 'USD' ? 'USD' : 'INR',
    pending: null,
    lastUnread: 0,
    lastCash: null,
    inboxUnlocked: false,
  };

  const currentUser = () => db.get(state.email);
  const userTier = (u = currentUser()) => (u && u.sub && u.sub.status === 'active' ? PLANS[u.sub.plan].tier : 0);

  function logActivity(user, msg, warn = false) {
    user.activity = user.activity || [];
    user.activity.unshift({ t: Date.now(), msg, warn });
    user.activity.length = Math.min(user.activity.length, 30);
  }
  function updateUser(mutator) {
    const u = currentUser();
    if (!u) return null;
    mutator(u);
    db.save(u);
    renderAll();
    return u;
  }
  function updateUserSilently(mutator, email = state.email) {
    const u = db.get(email);
    if (!u) return;
    mutator(u);
    db.save(u);
  }

  /* ---------------------------------------------------------
     Wallet engine: BDAI Cash + Wellness Points
     --------------------------------------------------------- */
  const dayKey = (d = new Date()) => d.toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const fmtPts = (n) => `${Math.round(n).toLocaleString()} pts`;
  const walletToasts = [];

  function newWallet(currency) {
    return {
      currency, cash: 0, points: 0, lifetime: 0, workouts: 0, minutes: 0,
      tx: [], milestones: {},
      daily: { date: dayKey(), cash: 0, points: 0, logs: 0, tasks: {} },
    };
  }
  function ensureDaily(w) {
    if (!w.daily || w.daily.date !== dayKey()) w.daily = { date: dayKey(), cash: 0, points: 0, logs: 0, tasks: {} };
    return w.daily;
  }
  function addTx(w, { cash = 0, points = 0, desc, kind = 'earn' }) {
    w.tx.unshift({ t: Date.now(), cash: round2(cash), points: Math.round(points), desc, kind });
    w.tx.length = Math.min(w.tx.length, 150);
  }
  /** Give a new wallet its welcome bonus (also used to migrate older accounts). */
  function grantWelcome(user) {
    const w = user.wallet;
    const cfg = WALLET_CFG[w.currency];
    w.cash = round2(w.cash + cfg.welcome);
    addTx(w, { cash: cfg.welcome, desc: 'Welcome bonus', kind: 'bonus' });
    sendMail(user, 'wallet', `${fmtMoney(cfg.welcome, w.currency)} welcome bonus added to your wallet`, {
      paras: [
        `Hi ${user.first}, we’ve added ${fmtMoney(cfg.welcome, w.currency)} of BDAI Cash to your wallet — use it to try Pro or Elite.`,
        `Earn more by logging workouts, finishing daily tasks and unlocking milestones (up to ${fmtMoney(cfg.dailyCap, w.currency)} a day). Every activity also earns Wellness Points, which take up to 50% off any subscription.`,
      ],
      rows: [['Balance', fmtMoney(w.cash, w.currency)], ['Daily earning cap', fmtMoney(cfg.dailyCap, w.currency)], ['100 points', `${fmtMoney(cfg.pointValue * 100, w.currency)} off`]],
      actions: [{ label: 'Open wallet', tab: 'wallet' }],
    });
  }
  /** Older accounts get a wallet the first time they're used. Returns true if changed. */
  function ensureWallet(user) {
    if (user.wallet) return false;
    user.wallet = newWallet(state.currency);
    grantWelcome(user);
    return true;
  }

  /** Credit points (and cash derived from them) within daily caps. Mutates the user. */
  function earn(user, { points = 0, cash: fixedCash, desc, capped = true, kind = 'earn' }) {
    const w = user.wallet;
    const cfg = WALLET_CFG[w.currency];
    const d = ensureDaily(w);
    let pts = Math.max(0, Math.round(points));
    if (capped) pts = Math.min(pts, Math.max(0, DAILY_POINTS_CAP - d.points));
    let cash = fixedCash !== undefined ? fixedCash : round2(pts * cfg.cashPerPoint);
    if (capped) cash = round2(Math.min(cash, Math.max(0, cfg.dailyCap - d.cash)));
    if (!pts && !cash) return { cash: 0, points: 0 };
    w.cash = round2(w.cash + cash);
    w.points += pts;
    w.lifetime += pts;
    if (capped) { d.cash = round2(d.cash + cash); d.points += pts; }
    addTx(w, { cash, points: pts, desc, kind });
    checkMilestones(user);
    return { cash, points: pts };
  }

  /** Debit cash and points. Returns false (and changes nothing) if the balance is too low. */
  function spend(user, { cash = 0, points = 0, desc }) {
    const w = user.wallet;
    if (!w || cash > w.cash + 1e-9 || points > w.points) return false;
    w.cash = round2(w.cash - cash);
    w.points -= points;
    addTx(w, { cash: -cash, points: -points, desc, kind: 'spend' });
    return true;
  }

  function milestoneValue(w, m) {
    if (m.metric === 'workouts') return w.workouts;
    if (m.metric === 'lifetime') return w.lifetime;
    return w.minutes;
  }
  const milestoneCash = (m, currency) => (m.cashMul ? round2(m.cashMul * WALLET_CFG[currency].welcome / 1000) : 0);
  function checkMilestones(user) {
    const w = user.wallet;
    MILESTONES.forEach((m) => {
      if (w.milestones[m.id] || milestoneValue(w, m) < m.goal) return;
      w.milestones[m.id] = Date.now(); // mark first: earn() below re-enters checkMilestones
      const cash = milestoneCash(m, w.currency);
      earn(user, { points: m.points, cash, desc: `Milestone: ${m.title}`, capped: false, kind: 'milestone' });
      const reward = [m.points ? fmtPts(m.points) : '', cash ? fmtMoney(cash, w.currency) : ''].filter(Boolean).join(' + ');
      sendMail(user, 'wallet', `Milestone unlocked: ${m.title}`, {
        paras: [`Nice work, ${user.first}! You unlocked “${m.title}” — ${m.desc.toLowerCase()}.`, `${reward} has been added to your wallet.`],
        rows: [['Reward', reward], ['Cash balance', fmtMoney(w.cash, w.currency)], ['Points balance', fmtPts(w.points)]],
        actions: [{ label: 'Open wallet', tab: 'wallet' }],
      });
      walletToasts.push(`🏅 Milestone unlocked: ${m.title} (+${reward})`);
    });
  }
  function flushWalletToasts() {
    walletToasts.splice(0).forEach((msg, i) => setTimeout(() => toast(msg, 'success', 4500), 400 + i * 600));
  }
  const earnedText = (r, currency) => [r.points ? `+${fmtPts(r.points)}` : '', r.cash ? `+${fmtMoney(r.cash, currency)}` : ''].filter(Boolean).join(' · ');

  /* ---------------------------------------------------------
     Mail (the @wellness.inbox.bdai inbox)
     --------------------------------------------------------- */
  const SENDERS = {
    team: { name: 'BDAIWellness', addr: `hello@${DOMAIN}`, cat: 'general', icon: 'sparkle' },
    security: { name: 'BDAI Security', addr: `security@${DOMAIN}`, cat: 'security', icon: 'shield-check' },
    billing: { name: 'BDAI Billing', addr: `billing@${DOMAIN}`, cat: 'billing', icon: 'card' },
    coach: { name: 'BDAI Coach', addr: `coach@${DOMAIN}`, cat: 'coach', icon: 'trophy' },
    wallet: { name: 'BDAI Wallet', addr: `wallet@${DOMAIN}`, cat: 'wallet', icon: 'wallet' },
  };

  /**
   * Deliver a message to a user's inbox (mutates the user object; caller saves).
   * Bodies are plain text paragraphs + key/value rows, rendered escaped.
   */
  function sendMail(user, from, subject, { paras = [], rows = [], actions = [], code = null } = {}) {
    user.inbox = user.inbox || [];
    user.inbox.unshift({
      id: `m${Date.now().toString(36)}${randomHex(3)}`,
      from, cat: SENDERS[from].cat, subject, paras, rows, actions, code,
      t: Date.now(), read: false,
    });
    user.inbox.length = Math.min(user.inbox.length, 80);
  }
  const unreadCount = (u) => (u?.inbox || []).filter((m) => !m.read).length;

  /* ---------------------------------------------------------
     Toasts
     --------------------------------------------------------- */
  function toast(message, type = 'info', ms = 3800) {
    const icon = type === 'success' ? 'check' : type === 'error' ? 'x' : type === 'mail' ? 'mail' : 'sparkle';
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<svg class="i"><use href="#i-${icon}"/></svg><span></span>`;
    el.querySelector('span').textContent = message;
    $('#toasts').append(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    setTimeout(() => {
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), 450);
    }, ms);
  }

  /* ---------------------------------------------------------
     Dialog helpers
     --------------------------------------------------------- */
  const dlg = {
    auth: $('#authDialog'),
    pinSetup: $('#pinSetupDialog'),
    pinPrompt: $('#pinPromptDialog'),
    lock: $('#lockDialog'),
    checkout: $('#checkoutDialog'),
    account: $('#accountDialog'),
    keyReset: $('#keyResetDialog'),
  };
  const openDialog = (d) => { if (!d.open) d.showModal(); };
  const closeDialog = (d) => { if (d.open) d.close(); };

  $$('dialog.modal').forEach((d) => {
    d.addEventListener('mousedown', (e) => { d._downOnBackdrop = e.target === d; });
    d.addEventListener('click', (e) => {
      if (e.target === d && d._downOnBackdrop) d.close();
    });
  });
  document.addEventListener('click', (e) => {
    const closer = e.target.closest('[data-close]');
    if (closer) closer.closest('dialog')?.close();
  });

  function setMsg(el, text, tone = '') {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-error', tone === 'error');
    el.classList.toggle('is-ok', tone === 'ok');
  }
  function fieldError(form, name, message) {
    const input = form.elements[name];
    if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
    setMsg($('.form-error', form), message);
    return false;
  }

  /* ---------------------------------------------------------
     PIN pad component
     --------------------------------------------------------- */
  class PinPad {
    static shuffle = false;

    constructor(root, { length = 6, label = 'PIN keypad', onComplete } = {}) {
      this.root = root;
      this.length = length;
      this.onComplete = onComplete || (() => {});
      this.value = '';
      this.disabled = false;
      this.busy = false;
      this.timer = null;

      root.classList.add('pinpad');
      root.tabIndex = 0;
      root.setAttribute('role', 'group');
      root.setAttribute('aria-label', `${label}. Type digits or use the keypad.`);
      root.innerHTML = '<div class="pin-dots" aria-hidden="true"></div><p class="sr-only" aria-live="polite" data-live></p><div class="pin-keys"></div>';
      this.dots = $('.pin-dots', root);
      this.keys = $('.pin-keys', root);
      this.live = $('[data-live]', root);

      this.keys.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        const k = b.dataset.key;
        if (k === 'del') this.back();
        else if (k === 'clear') this.clear();
        else this.press(k);
      });
      root.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (/^\d$/.test(e.key)) {
          e.preventDefault();
          this.press(e.key);
          this.flashKey(e.key);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          this.back();
          this.flashKey('del');
        } else if (e.key === 'Delete') {
          e.preventDefault();
          this.clear();
        }
      });
      this.renderKeys();
      this.renderDots();
    }

    renderKeys() {
      const base = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
      const digits = PinPad.shuffle ? shuffled(base) : base;
      const btn = (d) => `<button type="button" class="pin-key" data-key="${d}" tabindex="-1" aria-label="${d}">${d}</button>`;
      this.keys.innerHTML = digits.slice(0, 9).map(btn).join('')
        + '<button type="button" class="pin-key pin-key-fn" data-key="clear" tabindex="-1" aria-label="Clear">Clear</button>'
        + btn(digits[9])
        + '<button type="button" class="pin-key pin-key-fn" data-key="del" tabindex="-1" aria-label="Delete last digit"><svg class="i"><use href="#i-backspace"/></svg></button>';
      if (this.disabled) this.setDisabled(true);
    }

    renderDots() {
      this.dots.innerHTML = Array.from({ length: this.length }, (_, i) => `<span class="${i < this.value.length ? 'filled' : ''}"></span>`).join('');
      this.live.textContent = this.value.length ? `${this.value.length} of ${this.length} digits entered` : '';
    }

    flashKey(key) {
      const b = this.keys.querySelector(`[data-key="${key}"]`);
      if (!b) return;
      b.classList.add('is-pressed');
      setTimeout(() => b.classList.remove('is-pressed'), 120);
    }

    press(d) {
      if (this.disabled || this.busy || this.value.length >= this.length) return;
      this.value += d;
      this.renderDots();
      if (this.value.length === this.length) {
        const v = this.value;
        this.busy = true;
        this.root.classList.add('is-busy');
        Promise.resolve()
          .then(() => this.onComplete(v, this))
          .catch((err) => { console.error(err); this.error(); })
          .finally(() => { this.busy = false; this.root.classList.remove('is-busy'); });
      }
    }

    back() {
      if (this.disabled || this.busy) return;
      this.value = this.value.slice(0, -1);
      this.renderDots();
    }

    clear() {
      if (this.disabled || this.busy) return;
      this.value = '';
      this.renderDots();
    }

    reset() {
      this.value = '';
      this.root.classList.remove('shake', 'is-ok');
      this.renderKeys();
      this.renderDots();
    }

    setLength(n) {
      this.length = n;
      this.reset();
    }

    setDisabled(b) {
      this.disabled = b;
      this.root.classList.toggle('is-disabled', b);
      $$('button', this.keys).forEach((x) => { x.disabled = b; });
    }

    error() {
      this.root.classList.remove('shake');
      void this.root.offsetWidth; // restart animation
      this.root.classList.add('shake');
      if (navigator.vibrate) navigator.vibrate(120);
      setTimeout(() => this.reset(), 420);
    }

    success() { this.root.classList.add('is-ok'); }

    focus() { this.root.focus({ preventScroll: true }); }

    cooldown(seconds, msgEl) {
      clearInterval(this.timer);
      this.setDisabled(true);
      let s = seconds;
      const tick = () => {
        if (s <= 0) {
          clearInterval(this.timer);
          this.setDisabled(false);
          setMsg(msgEl, 'You can try again now.');
          this.focus();
          return;
        }
        setMsg(msgEl, `Too many incorrect attempts. Try again in ${s}s.`, 'error');
        s -= 1;
      };
      tick();
      this.timer = setInterval(tick, 1000);
    }

    stopCooldown() {
      clearInterval(this.timer);
      clearTimeout(this.pending);
      this.setDisabled(false);
    }

    /** Run fn after ms unless the pad is reset via stopCooldown() first. */
    later(fn, ms) {
      clearTimeout(this.pending);
      this.pending = setTimeout(fn, ms);
    }
  }

  /* ---------------------------------------------------------
     PIN logic
     --------------------------------------------------------- */
  function pinWeakness(p) {
    if (/^(\d)\1+$/.test(p)) return 'All digits are the same — choose a stronger PIN.';
    const asc = '01234567890123456789';
    const desc = '98765432109876543210';
    if (asc.includes(p) || desc.includes(p)) return 'Sequences like 1234 are too easy to guess.';
    const half = p.length / 2;
    if (p.slice(0, half) === p.slice(half)) return 'Repeated patterns are too easy to guess.';
    if (p.length === 6 && /^(\d\d)\1\1$/.test(p)) return 'Repeated patterns are too easy to guess.';
    if (p.length === 4 && /^(19|20)\d\d$/.test(p)) return 'Avoid years — they are easy to guess.';
    const common = ['1004', '2580', '0852', '1122', '6969', '112233', '159753', '147258', '520520', '123321', '654456', '696969', '000007'];
    if (common.includes(p)) return 'That PIN is very common — try another.';
    return '';
  }

  function generateRecoveryKey() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no 0/O/1/I
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    let s = '';
    for (const b of bytes) s += A[b % 32];
    return s.match(/.{4}/g).join('-');
  }
  const normalizeKey = (k) => String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const FROZEN_MSG = 'Account frozen after too many incorrect PINs. Unlock it with your recovery security key.';

  /** Verify a PIN for an account, with progressive cooldowns and freeze. */
  async function verifyPin(pin, email = state.email) {
    const u = db.get(email);
    if (!u || !u.pin) return { ok: false, reason: 'nopin' };
    if (u.pin.frozen) return { ok: false, reason: 'frozen' };
    const now = Date.now();
    if (u.pin.lockUntil && now < u.pin.lockUntil) {
      return { ok: false, reason: 'locked', wait: Math.ceil((u.pin.lockUntil - now) / 1000) };
    }
    const hash = await deriveHash(pin, u.pin.salt);
    const fresh = db.get(email);
    if (!fresh || !fresh.pin) return { ok: false, reason: 'nopin' };

    if (safeEqual(hash, fresh.pin.hash)) {
      fresh.pin.fails = 0;
      fresh.pin.lockUntil = 0;
      db.save(fresh);
      return { ok: true };
    }

    fresh.pin.fails = (fresh.pin.fails || 0) + 1;
    logActivity(fresh, `Incorrect PIN attempt (${fresh.pin.fails})`, true);
    if (fresh.pin.fails >= PIN_MAX_FAILS) {
      fresh.pin.frozen = true;
      fresh.pin.fails = 0;
      fresh.pin.lockUntil = 0;
      logActivity(fresh, 'Account frozen after too many incorrect PINs', true);
      sendMail(fresh, 'security', 'Your BDAI account has been frozen', {
        paras: [
          `Hi ${fresh.first}, we froze your account after ${PIN_MAX_FAILS} incorrect PIN attempts to keep it safe.`,
          'To unlock it, choose “Forgot PIN? Use recovery key” and enter the 16-character recovery security key you saved when you created your PIN. You will then choose a new PIN.',
          'If these attempts weren’t you, someone may know your BDAI email — your data stayed protected.',
        ],
        rows: [['Frozen at', fmtDateTime(now)], ['Unlock with', 'Recovery security key']],
      });
      db.save(fresh);
      return { ok: false, reason: 'frozen' };
    }
    let wait = 0;
    if (fresh.pin.fails % PIN_BATCH === 0) {
      wait = 30 * 2 ** (fresh.pin.fails / PIN_BATCH - 1);
      fresh.pin.lockUntil = now + wait * 1000;
      sendMail(fresh, 'security', 'Multiple incorrect PIN attempts', {
        paras: [
          `Hi ${fresh.first}, there were ${fresh.pin.fails} incorrect PIN attempts on your account. PIN entry is paused for ${wait} seconds.`,
          `After ${PIN_MAX_FAILS} incorrect attempts your account will be frozen until you use your recovery security key.`,
        ],
        rows: [['Time', fmtDateTime(now)], ['Incorrect attempts', String(fresh.pin.fails)], ['Cooldown', `${wait}s`]],
        actions: [{ label: 'Review security', tab: 'security' }],
      });
    }
    db.save(fresh);
    return { ok: false, reason: wait ? 'locked' : 'wrong', wait, remaining: PIN_BATCH - (fresh.pin.fails % PIN_BATCH) };
  }

  /** Shared UI for a failed verifyPin(). */
  function handlePinFailure(res, pad, msgEl, { onFrozen } = {}) {
    pad.error();
    if (res.reason === 'frozen') {
      setMsg(msgEl, FROZEN_MSG, 'error');
      pad.later(() => { pad.setDisabled(true); onFrozen?.(); }, 1400);
    } else if (res.reason === 'locked') {
      pad.later(() => pad.cooldown(res.wait, msgEl), 430);
    } else if (res.reason === 'wrong') {
      setMsg(msgEl, `Incorrect PIN. ${res.remaining} attempt${res.remaining === 1 ? '' : 's'} left before a cooldown.`, 'error');
    } else {
      setMsg(msgEl, 'This account has no PIN.', 'error');
    }
    renderBadges();
  }

  /** Reflect an existing cooldown or freeze on a pad. Returns true if the account is frozen. */
  function applyPinState(pad, msgEl, email = state.email) {
    const u = db.get(email);
    pad.stopCooldown();
    if (u?.pin?.frozen) {
      pad.setDisabled(true);
      setMsg(msgEl, FROZEN_MSG, 'error');
      return true;
    }
    if (u?.pin?.lockUntil && u.pin.lockUntil > Date.now()) {
      pad.cooldown(Math.ceil((u.pin.lockUntil - Date.now()) / 1000), msgEl);
    }
    return false;
  }

  /* ---------- Recovery with security key ---------- */
  const recoveryLimits = new Map(); // email -> { fails, until }
  /** Check a security (recovery) key without side effects, rate-limited per account. */
  async function checkRecoveryKey(email, rawKey, context = 'recovery') {
    const u = db.get(email);
    if (!u || !u.recovery) return { ok: false, msg: 'No security key exists for this account.' };
    const lim = recoveryLimits.get(email) || { fails: 0, until: 0 };
    if (Date.now() < lim.until) return { ok: false, msg: `Too many attempts. Try again in ${Math.ceil((lim.until - Date.now()) / 1000)}s.` };
    const key = normalizeKey(rawKey);
    if (key.length !== 16) return { ok: false, msg: 'Security keys have 16 letters and numbers.' };
    const hash = await deriveHash(key, u.recovery.salt);
    if (!safeEqual(hash, u.recovery.hash)) {
      lim.fails += 1;
      if (lim.fails % 5 === 0) lim.until = Date.now() + 60000;
      recoveryLimits.set(email, lim);
      updateUserSilently((x) => logActivity(x, `Wrong security key (${context})`, true), email);
      return { ok: false, msg: lim.until > Date.now() ? 'Too many wrong keys. Try again in 60s.' : 'That security key is not correct.' };
    }
    recoveryLimits.delete(email);
    return { ok: true };
  }

  async function recoverWithKey(email, rawKey) {
    const res = await checkRecoveryKey(email, rawKey);
    if (!res.ok) return res;
    updateUserSilently((x) => {
      if (x.pin) { x.pin.fails = 0; x.pin.lockUntil = 0; x.pin.frozen = false; }
      logActivity(x, 'Account recovered with security key');
      sendMail(x, 'security', 'Your recovery security key was used', {
        paras: [
          `Hi ${x.first}, your recovery security key was just used to unlock your account.`,
          'Next you’ll choose a new PIN, which also issues a fresh recovery key — store it safely. If this wasn’t you, change your PIN right away.',
        ],
        rows: [['Time', fmtDateTime(Date.now())]],
        actions: [{ label: 'Open security settings', tab: 'security' }],
      });
    }, email);
    return { ok: true };
  }
  function formatKeyInput(e) {
    const raw = normalizeKey(e.target.value).slice(0, 16);
    e.target.value = raw.match(/.{1,4}/g)?.join('-') || '';
    e.target.removeAttribute('aria-invalid');
  }

  /* ---------- PIN prompt (verify for sensitive actions) ---------- */
  const promptMsg = $('#pinPromptMsg');
  let promptResolve = null;
  const promptPad = new PinPad($('#promptPad'), {
    label: 'Enter PIN',
    onComplete: async (v, pad) => {
      const res = await verifyPin(v);
      if (res.ok) {
        pad.success();
        setMsg(promptMsg, 'PIN verified', 'ok');
        await sleep(250);
        const r = promptResolve;
        promptResolve = null;
        closeDialog(dlg.pinPrompt);
        r?.(true);
      } else {
        handlePinFailure(res, pad, promptMsg, { onFrozen: () => { closeDialog(dlg.pinPrompt); lock(); } });
      }
    },
  });
  dlg.pinPrompt.addEventListener('close', () => {
    promptPad.stopCooldown();
    if (promptResolve) { const r = promptResolve; promptResolve = null; r(false); }
  });

  function pinPrompt({ title = 'Enter your PIN', sub = 'Confirm it’s you to continue.', danger = false } = {}) {
    const u = currentUser();
    if (!u || !u.pin) return Promise.resolve(false);
    if (u.pin.frozen) { lock(); return Promise.resolve(false); }
    return new Promise((resolve) => {
      if (promptResolve) promptResolve(false);
      promptResolve = resolve;
      $('#pinPromptTitle').textContent = title;
      $('#pinPromptSub').textContent = sub;
      dlg.pinPrompt.classList.toggle('is-danger', danger);
      setMsg(promptMsg, '');
      promptPad.setLength(u.pin.length);
      openDialog(dlg.pinPrompt);
      applyPinState(promptPad, promptMsg);
      promptPad.focus();
    });
  }

  /* ---------- PIN setup (signup / change / reset) ---------- */
  const ps = { mode: 'change', signup: null, first: '', length: 6, completed: false, key: '', resolve: null };
  const setupMsg = $('#setupMsg');
  const confirmMsg = $('#confirmMsg');

  const setupPad = new PinPad($('#setupPad'), {
    label: 'Create PIN',
    onComplete: async (v, pad) => {
      const weak = pinWeakness(v);
      if (weak) {
        pad.error();
        setMsg(setupMsg, weak, 'error');
        return;
      }
      ps.first = v;
      await sleep(150);
      showPinStep('confirm');
      confirmPad.setLength(ps.length);
      setMsg(confirmMsg, '');
      confirmPad.focus();
    },
  });

  const confirmPad = new PinPad($('#confirmPad'), {
    label: 'Confirm PIN',
    onComplete: async (v, pad) => {
      if (v !== ps.first) {
        pad.error();
        setMsg(confirmMsg, 'PINs don’t match. Let’s try again.', 'error');
        await sleep(1000);
        restartPinSetup('PINs didn’t match — enter a new PIN.');
        return;
      }
      pad.success();
      const salt = randomHex();
      const hash = await deriveHash(v, salt);
      const key = generateRecoveryKey();
      const keySalt = randomHex();
      const keyHash = await deriveHash(normalizeKey(key), keySalt);
      const now = Date.now();
      const pin = { salt, hash, length: ps.length, fails: 0, lockUntil: 0, frozen: false, setAt: now };
      const recovery = { salt: keySalt, hash: keyHash, createdAt: now };

      if (ps.mode === 'signup') {
        createAccount(ps.signup, pin, recovery);
      } else {
        if (!currentUser()) return;
        updateUser((x) => {
          x.pin = pin;
          x.recovery = recovery;
          logActivity(x, ps.mode === 'reset' ? 'PIN reset after recovery' : 'PIN security key changed');
          logActivity(x, 'New recovery security key generated');
          sendMail(x, 'security', ps.mode === 'reset' ? 'You set a new PIN' : 'Your PIN was changed', {
            paras: [
              `Hi ${x.first}, the PIN security key for ${x.email} was just ${ps.mode === 'reset' ? 'reset' : 'changed'}.`,
              'A new recovery security key was issued at the same time — your previous recovery key no longer works.',
              'If you didn’t make this change, use your recovery key to secure your account immediately.',
            ],
            rows: [['Time', fmtDateTime(now)], ['PIN length', `${ps.length} digits`]],
            actions: [{ label: 'Open security settings', tab: 'security' }],
          });
        });
      }
      ps.completed = true;
      ps.first = '';
      await sleep(250);
      showRecoveryKey(key, 'Save your recovery security key');
    },
  });

  function showPinStep(step) {
    $$('[data-pin-step]', dlg.pinSetup).forEach((s) => { s.hidden = s.dataset.pinStep !== step; });
    const order = ['enter', 'confirm', 'key'];
    const idx = order.indexOf(step);
    $$('[data-ps-dot]', dlg.pinSetup).forEach((li) => {
      const i = order.indexOf(li.dataset.psDot);
      li.classList.toggle('is-active', i === idx);
      li.classList.toggle('is-done', i < idx);
    });
  }

  function setPinLength(n) {
    ps.length = n;
    $$('[data-pin-length]', dlg.pinSetup).forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.pinLength === n)));
    setupPad.setLength(n);
  }
  $$('[data-pin-length]', dlg.pinSetup).forEach((b) => b.addEventListener('click', () => {
    setPinLength(+b.dataset.pinLength);
    setMsg(setupMsg, '');
    setupPad.focus();
  }));

  function restartPinSetup(message = '') {
    ps.first = '';
    showPinStep('enter');
    setupPad.reset();
    confirmPad.reset();
    setMsg(setupMsg, message, message ? 'error' : '');
    setupPad.focus();
  }
  $('[data-pin-restart]').addEventListener('click', () => restartPinSetup());

  function showRecoveryKey(key, title) {
    ps.key = key;
    $('[data-key-title]').textContent = title;
    $('#recoveryKey').textContent = key;
    $('#keySavedCheck').checked = false;
    $('#keyDoneBtn').disabled = true;
    showPinStep('key');
    openDialog(dlg.pinSetup);
    $('#copyKeyBtn').focus();
  }

  $('#keySavedCheck').addEventListener('change', (e) => { $('#keyDoneBtn').disabled = !e.target.checked; });
  $('#copyKeyBtn').addEventListener('click', async () => {
    const ok = await copyText(ps.key);
    toast(ok ? 'Recovery key copied to clipboard.' : 'Copy failed — please write the key down.', ok ? 'success' : 'error');
  });
  $('#downloadKeyBtn').addEventListener('click', () => {
    const u = currentUser();
    downloadText('BDAI-recovery-key.txt', [
      'BDAI Sports & Health — Recovery Security Key',
      'Powered by BDAIWellness',
      '',
      `Account: ${u ? u.email : ''}`,
      `Recovery key: ${ps.key}`,
      `Created: ${new Date().toLocaleString()}`,
      '',
      'Use this key to reset your PIN or unfreeze your account.',
      'Keep it offline and private. It cannot be shown again.',
    ].join('\n'));
  });
  $('#keyDoneBtn').addEventListener('click', () => {
    closeDialog(dlg.pinSetup);
    if (ps.mode !== 'signup') toast('PIN security key is active. Your account is protected.', 'success');
  });

  dlg.pinSetup.addEventListener('close', () => {
    ps.key = '';
    $('#recoveryKey').textContent = 'XXXX-XXXX-XXXX-XXXX';
    if (ps.resolve) { const r = ps.resolve; ps.resolve = null; r(ps.completed); }
  });

  /**
   * mode: 'signup' (creates the account), 'change' (verifies current PIN first),
   * 'reset' (after recovery-key unlock).
   */
  async function openPinSetup({ mode = 'change', reason = '', signup = null } = {}) {
    const u = currentUser();
    if (mode !== 'signup' && !u) return false;
    if (mode === 'change' && u.pin) {
      const ok = await pinPrompt({ title: 'Confirm current PIN', sub: 'Enter your current PIN to set a new one.' });
      if (!ok) return false;
    }
    return new Promise((resolve) => {
      if (ps.resolve) ps.resolve(false);
      Object.assign(ps, { resolve, mode, signup, completed: false, first: '' });
      $('#pinSetupTitle').textContent = mode === 'signup' ? 'Create your PIN security key' : 'Choose a new PIN';
      $('[data-pin-reason]', dlg.pinSetup).textContent = reason
        || 'Your PIN signs you in, unlocks BDAI on this device and authorizes payments.';
      setPinLength(u?.pin ? u.pin.length : 6);
      setMsg(setupMsg, '');
      showPinStep('enter');
      openDialog(dlg.pinSetup);
      setupPad.focus();
    });
  }

  /* ---------------------------------------------------------
     Accounts: sign up (names → email → PIN), sign in (email → PIN)
     --------------------------------------------------------- */
  function saveSession(email, remember) {
    const s = { email, at: Date.now() };
    if (remember) { local.set(KEYS.session, s); session.remove(KEYS.session); } else { session.set(KEYS.session, s); local.remove(KEYS.session); }
  }
  const loadSession = () => session.get(KEYS.session) || local.get(KEYS.session);
  function clearSession() { session.remove(KEYS.session); local.remove(KEYS.session); }

  function createAccount({ first, last }, pin, recovery) {
    const email = generateEmail(first, last); // re-check uniqueness at creation time
    const user = {
      first, last, email,
      pin, recovery,
      sub: null, invoices: [], programs: [], inbox: [],
      wallet: newWallet(state.currency),
      settings: { autoLock: 5, shuffle: false, sport: 'running', weeklyGoal: 4 },
      activity: [], createdAt: Date.now(),
    };
    logActivity(user, 'Account created');
    logActivity(user, 'PIN security key created');
    sendMail(user, 'coach', 'Your first week with BDAI', {
      paras: [
        `${first}, here’s how to get the most from your first 7 days.`,
        'Log three sessions this week — any sport counts. Your readiness score calibrates after three nights of data, then your AI plan starts adapting load and rest days for you.',
        'Try a free program to begin: Couch to 5K, Strength Foundations or Mobility Flow Yoga.',
      ],
      rows: [['Day 1', 'Easy 20-min session + mobility'], ['Day 3', 'Technique or tempo work'], ['Day 5', 'Longer aerobic session'], ['Daily', 'Check your recovery score']],
      actions: [{ label: 'Browse programs', href: '#programs' }],
    });
    sendMail(user, 'security', 'Your PIN security key is active', {
      paras: [
        `Hi ${first}, your account is password-free. You sign in with ${email} and your PIN.`,
        'Keep your recovery security key somewhere safe — it’s the only way to reset a forgotten PIN or unfreeze your account.',
        'Tip: turn on “Scramble keypad” in Security if you sign in on shared devices.',
      ],
      rows: [['Sign-in address', email], ['PIN length', `${pin.length} digits`], ['Auto-lock', '5 minutes']],
      actions: [{ label: 'Open security settings', tab: 'security' }],
    });
    grantWelcome(user);
    sendMail(user, 'team', `Welcome to BDAI Sports & Health, ${first}!`, {
      paras: [
        `Hi ${first}, welcome aboard. This is your personal BDAI inbox at ${email}.`,
        'Sign-in alerts, subscription receipts and messages from your coach will arrive here.',
        'Your Starter plan includes activity and heart-rate tracking, three free coach programs and every health calculator. Upgrade any time for AI adaptive plans.',
        '— The BDAIWellness team',
      ],
      actions: [{ label: 'See plans', href: '#pricing' }],
    });
    db.save(user);
    devices.add(email);
    saveSession(email, true);
    state.email = email;
    state.locked = false;
    markActive();
    renderAll();
    return user;
  }

  const loginForm = $('#loginForm');
  const signupForm = $('#signupForm');
  const loginRecoverForm = $('#loginRecoverForm');
  const loginMsg = $('#loginMsg');
  let loginTarget = null;

  function switchAuthTab(tab) {
    $$('[role="tab"][data-auth-tab]', dlg.auth).forEach((b) => {
      const on = b.dataset.authTab === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $('#loginPanel').hidden = tab !== 'login';
    signupForm.hidden = tab !== 'signup';
    $('#authTitle').textContent = tab === 'login' ? 'Welcome back' : 'Join BDAI Sports & Health';
    if (!dlg.auth.dataset.customSub) {
      $('#authSub').textContent = tab === 'login'
        ? 'Sign in with your BDAI email and PIN — no password.'
        : 'Just your name and a PIN. We’ll create your BDAI email.';
    }
    if (tab === 'login') showLoginStep('email');
    else {
      setMsg($('.form-error', signupForm), '');
      updateEmailPreview();
      setTimeout(() => signupForm.elements.first.focus(), 30);
    }
  }
  $$('[data-auth-tab]', dlg.auth).forEach((b) => b.addEventListener('click', () => switchAuthTab(b.dataset.authTab)));

  function showLoginStep(step) {
    $$('[data-login-step]', dlg.auth).forEach((s) => { s.hidden = s.dataset.loginStep !== step; });
    if (step === 'email') {
      loginTarget = null;
      loginPad.stopCooldown();
      setMsg($('.form-error', loginForm), '');
      renderDeviceAccounts();
      setTimeout(() => loginForm.elements.email.focus(), 30);
    } else if (step === 'pin') {
      const u = db.get(loginTarget);
      $('#loginAvatar').textContent = initials(fullName(u));
      $('#loginName').textContent = fullName(u);
      $('#loginEmailShow').textContent = u.email;
      setMsg(loginMsg, '');
      loginPad.setLength(u.pin.length);
      const frozen = applyPinState(loginPad, loginMsg, loginTarget);
      if (frozen) { showLoginStep('recover'); return; }
      setTimeout(() => loginPad.focus(), 30);
    } else if (step === 'recover') {
      const u = db.get(loginTarget);
      loginRecoverForm.reset();
      setMsg($('.form-error', loginRecoverForm), '');
      $('#loginRecoverNote').textContent = u?.pin?.frozen
        ? `${FROZEN_MSG} Enter it below for ${u.email}.`
        : 'Enter the 16-character recovery key you saved when you created your PIN.';
      setTimeout(() => loginRecoverForm.elements.key.focus(), 30);
    }
  }

  function renderDeviceAccounts() {
    const list = devices.list();
    $('#deviceAccounts').hidden = list.length === 0;
    $('#acctList').innerHTML = list.map((email) => {
      const u = db.get(email);
      return `<button type="button" class="acct-chip" data-acct="${escapeHtml(email)}">
        <span class="avatar">${escapeHtml(initials(fullName(u)))}</span>
        <span><strong>${escapeHtml(fullName(u))}</strong><small>${escapeHtml(email)}</small></span>
        <svg class="i"><use href="#i-arrow-right"/></svg>
      </button>`;
    }).join('');
  }
  $('#acctList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-acct]');
    if (!b) return;
    loginTarget = b.dataset.acct;
    loginForm.elements.email.value = loginTarget.split('@')[0];
    showLoginStep('pin');
  });

  function openAuth(tab = 'login', subtitle = '') {
    if (currentUser()) { openAccount(); return; }
    if (subtitle) { dlg.auth.dataset.customSub = '1'; $('#authSub').textContent = subtitle; } else { delete dlg.auth.dataset.customSub; }
    loginForm.reset();
    signupForm.reset();
    $$('[aria-invalid]', dlg.auth).forEach((i) => i.removeAttribute('aria-invalid'));
    switchAuthTab(tab);
    openDialog(dlg.auth);
  }
  dlg.auth.addEventListener('close', () => {
    loginPad.stopCooldown();
    // Drop a pending action if the visitor dismissed sign-in (but not mid sign-up).
    if (!currentUser() && !ps.signup) state.pending = null;
  });

  // ----- Sign up -----
  function updateEmailPreview() {
    const f = signupForm.elements;
    const first = cleanName(f.first.value);
    const last = cleanName(f.last.value);
    $('#emailPreview').textContent = first || last
      ? generateEmail(first, last)
      : `firstname.lastname@${DOMAIN}`;
  }
  signupForm.addEventListener('input', (e) => {
    e.target.removeAttribute('aria-invalid');
    if (e.target.name === 'first' || e.target.name === 'last') updateEmailPreview();
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = signupForm.elements;
    const first = titleCase(f.first.value);
    const last = titleCase(f.last.value);
    if (!NAME_RE.test(first) || !slugify(first)) return fieldError(signupForm, 'first', 'Please enter your first name (letters only).');
    if (!NAME_RE.test(last) || !slugify(last)) return fieldError(signupForm, 'last', 'Please enter your last name (letters only).');
    if (!f.terms.checked) return fieldError(signupForm, 'terms', 'Please accept the Terms to continue.');

    const email = generateEmail(first, last);
    ps.signup = { first, last };
    closeDialog(dlg.auth);
    const done = await openPinSetup({
      mode: 'signup',
      signup: { first, last },
      reason: `Your BDAI email is ${email}. Create a PIN — it’s how you’ll sign in. No password needed.`,
    });
    ps.signup = null;
    if (!done) {
      state.pending = null;
      toast('Sign-up cancelled — a PIN is required to create your account.');
      return;
    }
    const u = currentUser();
    toast(`Welcome, ${u.first}! Your inbox is ${u.email}`, 'success', 5200);
    setTimeout(() => toast(`${fmtMoney(u.wallet.cash, u.wallet.currency)} welcome bonus is in your wallet · ${unreadCount(u)} new messages in your inbox.`, 'mail', 5200), 900);
    runPending();
    return undefined;
  });

  // ----- Sign in: step 1 (email) -----
  loginForm.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = loginForm.elements.email.value;
    const email = normalizeLoginEmail(raw);
    if (!email) return fieldError(loginForm, 'email', 'Enter your BDAI email, e.g. firstname.lastname');
    if (!email.endsWith(`@${DOMAIN}`)) return fieldError(loginForm, 'email', `BDAI emails end with @${DOMAIN}.`);
    if (!isBdaiEmail(email)) return fieldError(loginForm, 'email', 'That doesn’t look like a BDAI email address.');
    if (!db.get(email)) return fieldError(loginForm, 'email', 'No BDAI account with that email on this device. Check the spelling or create an account.');
    loginTarget = email;
    showLoginStep('pin');
    return undefined;
  });
  // Paste of full address → keep only the local part (the domain is shown as a suffix)
  loginForm.elements.email.addEventListener('change', (e) => {
    const v = e.target.value.trim().toLowerCase();
    if (v.endsWith(`@${DOMAIN}`)) e.target.value = v.slice(0, -(DOMAIN.length + 1));
  });

  // ----- Sign in: step 2 (PIN) -----
  const loginPad = new PinPad($('#loginPad'), {
    label: 'Sign-in PIN',
    onComplete: async (v, pad) => {
      const email = loginTarget;
      if (!email) return;
      const res = await verifyPin(v, email);
      if (res.ok) {
        pad.success();
        setMsg(loginMsg, 'PIN verified', 'ok');
        await sleep(250);
        completeLogin(email, $('#rememberDevice').checked);
      } else {
        handlePinFailure(res, pad, loginMsg, { onFrozen: () => showLoginStep('recover') });
      }
    },
  });
  $('[data-login-back]', dlg.auth).addEventListener('click', () => showLoginStep('email'));
  $('[data-login-recover]', dlg.auth).addEventListener('click', () => showLoginStep('recover'));
  $('[data-login-back-pin]', dlg.auth).addEventListener('click', () => showLoginStep('pin'));

  function completeLogin(email, remember, method = 'PIN') {
    updateUserSilently((u) => {
      ensureWallet(u);
      logActivity(u, `Signed in with ${method}`);
      sendMail(u, 'security', 'New sign-in to your BDAI account', {
        paras: [
          `Hi ${u.first}, your account was just signed in with your ${method}.`,
          'If this was you, there’s nothing to do. If not, change your PIN from Security right away.',
        ],
        rows: [['Account', u.email], ['Time', fmtDateTime(Date.now())], ['Method', method], ['Device', navigator.userAgentData?.platform || navigator.platform || 'This browser']],
        actions: [{ label: 'Review security', tab: 'security' }],
      });
    }, email);
    devices.add(email);
    saveSession(email, remember);
    state.email = email;
    state.locked = false;
    markActive();
    closeDialog(dlg.auth);
    syncSubscription();
    renderAll();
    toast(`Welcome back, ${currentUser().first}!`, 'success');
    runPending();
  }

  // ----- Sign in: forgot PIN → recovery key -----
  loginRecoverForm.elements.key.addEventListener('input', formatKeyInput);
  loginRecoverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type="submit"]', loginRecoverForm);
    btn.classList.add('is-loading');
    const res = await recoverWithKey(loginTarget, loginRecoverForm.elements.key.value);
    btn.classList.remove('is-loading');
    if (!res.ok) { fieldError(loginRecoverForm, 'key', res.msg); return; }
    completeLogin(loginTarget, $('#rememberDevice').checked, 'recovery key');
    await sleep(300);
    const done = await openPinSetup({ mode: 'reset', reason: 'Recovery successful. Choose a new PIN — you’ll also get a fresh recovery key.' });
    if (!done) toast('Your previous PIN is still active. Change it any time in Security.');
  });

  function runPending() {
    const fn = state.pending;
    state.pending = null;
    if (fn && currentUser()) setTimeout(fn, 200);
  }

  function logout(message = 'You’ve been signed out.', type = 'info') {
    if (state.email) updateUserSilently((x) => logActivity(x, 'Signed out'));
    state.locked = false;
    state.inboxUnlocked = false;
    state.email = null;
    state.pending = null;
    clearSession();
    clearInterval(clockTimer);
    $$('dialog[open]').forEach((d) => d.close());
    renderAll();
    toast(message, type);
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-open-auth]');
    if (a) { closeMobileNav(); openAuth(a.dataset.openAuth); }
    if (e.target.closest('[data-logout]')) logout();
  });

  // Keep tabs in sync: sign out here if another tab signs out.
  window.addEventListener('storage', (e) => {
    if (e.key === KEYS.session && state.email && !loadSession()) {
      state.locked = false;
      state.email = null;
      $$('dialog[open]').forEach((d) => d.close());
      renderAll();
      toast('You were signed out in another tab.');
    } else if (e.key === KEYS.users && state.email) {
      renderAll();
    }
  });

  /* ---------------------------------------------------------
     Lock screen
     --------------------------------------------------------- */
  const lockMsg = $('#lockMsg');
  const lockPad = new PinPad($('#lockPad'), {
    label: 'Unlock PIN',
    onComplete: async (v, pad) => {
      const res = await verifyPin(v);
      if (res.ok) {
        pad.success();
        setMsg(lockMsg, 'Unlocked', 'ok');
        await sleep(300);
        unlock('Unlocked with PIN');
      } else {
        handlePinFailure(res, pad, lockMsg, { onFrozen: () => { showLockView('recovery'); setMsg($('#recoveryForm .form-error'), FROZEN_MSG); } });
      }
    },
  });

  let clockTimer = null;
  function tickClock() {
    const now = new Date();
    $('#lockTime').textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    $('#lockDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function showLockView(view) {
    $$('[data-lock-view]', dlg.lock).forEach((v) => { v.hidden = v.dataset.lockView !== view; });
    if (view === 'pin') lockPad.focus();
    else $('#recoveryForm [name="key"]').focus();
  }

  function lock({ quiet = false } = {}) {
    const u = currentUser();
    if (!u || !u.pin) return;
    state.locked = true;
    state.inboxUnlocked = false;
    $('#lockName').textContent = u.first;
    $('#lockAvatar').textContent = initials(fullName(u));
    setMsg(lockMsg, '');
    lockPad.setLength(u.pin.length);
    $('#recoveryForm').reset();
    setMsg($('#recoveryForm .form-error'), '');
    tickClock();
    clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 15000);
    openDialog(dlg.lock);
    const frozen = applyPinState(lockPad, lockMsg);
    showLockView('pin');
    if (frozen) {
      showLockView('recovery');
      setMsg($('#recoveryForm .form-error'), FROZEN_MSG);
    }
    if (!quiet) updateUserSilently((x) => logActivity(x, 'Account locked'));
  }

  function unlock(reason) {
    state.locked = false;
    clearInterval(clockTimer);
    lockPad.stopCooldown();
    closeDialog(dlg.lock);
    markActive();
    updateUserSilently((x) => logActivity(x, reason));
    renderAll();
    const u = currentUser();
    if (u) toast(`Welcome back, ${u.first}!`, 'success');
  }

  dlg.lock.addEventListener('cancel', (e) => e.preventDefault());
  dlg.lock.addEventListener('close', () => {
    if (state.locked) setTimeout(() => openDialog(dlg.lock), 0);
  });
  $$('[data-lock-goto]', dlg.lock).forEach((b) => b.addEventListener('click', () => showLockView(b.dataset.lockGoto)));
  $('#lockSignOut').addEventListener('click', () => logout('Signed out.'));

  $('#recoveryForm [name="key"]').addEventListener('input', formatKeyInput);
  $('#recoveryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = $('button[type="submit"]', form);
    btn.classList.add('is-loading');
    const res = await recoverWithKey(state.email, form.elements.key.value);
    btn.classList.remove('is-loading');
    if (!res.ok) { fieldError(form, 'key', res.msg); return; }
    unlock('Unlocked with recovery key');
    await sleep(200);
    const done = await openPinSetup({ mode: 'reset', reason: 'Recovery successful. Choose a new PIN — you’ll also get a fresh recovery key.' });
    if (!done) toast('Your previous PIN is still active. Change it any time in Security.');
  });

  /* ---------- Inactivity auto-lock ---------- */
  let lastActive = Date.now();
  function markActive() { lastActive = Date.now(); }
  ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'wheel'].forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));
  function checkIdle() {
    const u = currentUser();
    if (!u || !u.pin || state.locked) return;
    const minutes = +(u.settings?.autoLock ?? 0);
    if (minutes > 0 && Date.now() - lastActive > minutes * 60000) lock();
  }
  setInterval(checkIdle, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkIdle(); });

  /* ---------------------------------------------------------
     Subscriptions & checkout
     --------------------------------------------------------- */
  const makeInvoiceId = (ts) => `BDAI-${ts.toString(36).toUpperCase().slice(-6)}${randomHex(1).toUpperCase()}`;
  const describeMethod = (m) => (m && m.type === 'wallet' ? 'BDAI Wallet' : '—');
  function receiptRows(inv, renewsAt) {
    return [
      ['Receipt', inv.id],
      ['Plan', `BDAI ${PLANS[inv.plan].name} · ${inv.cycle}`],
      ['Price', fmtMoney(inv.price ?? inv.amount, inv.currency)],
      inv.discount ? ['Promo', `−${fmtMoney(inv.discount, inv.currency)}${inv.promo ? ` (${inv.promo})` : ''}`] : null,
      inv.pointsUsed ? ['Points redeemed', `${fmtPts(inv.pointsUsed)} (−${fmtMoney(inv.pointsOff, inv.currency)})`] : null,
      ['Paid from wallet', fmtMoney(inv.amount, inv.currency)],
      ['Authorized with', inv.auth],
      renewsAt ? ['Next renewal', fmtDate(renewsAt)] : null,
    ].filter(Boolean);
  }

  /** Apply renewals / endings that fell due. Renewals are paid from the wallet. */
  function syncSubscription() {
    const u = currentUser();
    if (!u || !u.sub) return;
    const now = Date.now();
    let changed = false;
    while (u.sub && now >= u.sub.renewsAt) {
      const s = u.sub;
      const planName = PLANS[s.plan].name;
      if (s.cancelAtPeriodEnd) {
        logActivity(u, `${planName} subscription ended`);
        sendMail(u, 'billing', `Your ${planName} subscription has ended`, {
          paras: [`Hi ${u.first}, your BDAI ${planName} plan ended and your account is back on Starter. Your history and programs are saved — resubscribe any time from your wallet.`],
          actions: [{ label: 'See plans', href: '#pricing' }],
        });
        u.sub = null;
      } else if (!spend(u, { cash: s.amount, desc: `BDAI ${planName} renewal · ${s.cycle}` })) {
        logActivity(u, `${planName} renewal failed — wallet balance too low`, true);
        sendMail(u, 'billing', `We couldn’t renew ${planName}`, {
          paras: [
            `Hi ${u.first}, your ${planName} renewal of ${fmtMoney(s.amount, s.currency)} couldn’t be paid — your BDAI Wallet has ${fmtMoney(u.wallet.cash, s.currency)}.`,
            'Your account is now on Starter. Log activities to earn more cash, then subscribe again — Wellness Points can cover up to 50% of the price.',
          ],
          actions: [{ label: 'Open wallet', tab: 'wallet' }],
        });
        u.sub = null;
      } else {
        const date = s.renewsAt;
        const inv = {
          id: makeInvoiceId(date), date, plan: s.plan, cycle: s.cycle, currency: s.currency,
          price: s.amount, amount: s.amount, discount: 0, pointsUsed: 0, pointsOff: 0,
          method: 'BDAI Wallet', auth: 'Auto-renewal', status: 'Paid',
        };
        u.invoices.unshift(inv);
        s.renewsAt = addPeriod(date, s.cycle);
        logActivity(u, `${planName} renewed from wallet`);
        sendMail(u, 'billing', `Receipt: BDAI ${planName} renewed`, {
          paras: [`Hi ${u.first}, your ${planName} subscription renewed and was paid from your BDAI Wallet.`],
          rows: receiptRows(inv, s.renewsAt),
          actions: [{ label: 'Download receipt', invoice: inv.id }],
        });
      }
      changed = true;
    }
    if (changed) db.save(u);
  }

  /* ---------- Checkout: plan → PIN → security key → done ---------- */
  const co = { plan: 'pro', cycle: 'monthly', currency: 'INR', promo: null, points: 0, autoMax: true, step: 1, busy: false, pinOk: false };
  const coEl = (key) => $$(`[data-co="${key}"]`, dlg.checkout);
  const setCo = (key, text) => coEl(key).forEach((el) => { el.textContent = text; });
  const pointsRange = $('#pointsRange');
  const coKeyForm = $('#coKeyForm');

  function coAmounts() {
    const w = currentUser()?.wallet;
    const cfg = WALLET_CFG[co.currency];
    const price = PLANS[co.plan].price[co.currency][co.cycle];
    const promoOff = co.promo ? round2(price * co.promo.pct / 100) : 0;
    const afterPromo = round2(price - promoOff);
    const maxByShare = Math.floor((afterPromo * MAX_POINTS_SHARE) / cfg.pointValue / 10) * 10;
    const maxPoints = Math.max(0, Math.min(Math.floor((w?.points || 0) / 10) * 10, maxByShare));
    const points = clamp(co.autoMax ? maxPoints : co.points, 0, maxPoints);
    const pointsOff = round2(points * cfg.pointValue);
    const total = round2(Math.max(0, afterPromo - pointsOff));
    const balance = w?.cash || 0;
    return { price, promoOff, maxPoints, points, pointsOff, total, balance, after: round2(balance - total) };
  }

  function openCheckout(plan) {
    const u = currentUser();
    if (!u) {
      state.pending = () => openCheckout(plan);
      openAuth('signup', `Create a free account to subscribe to BDAI ${PLANS[plan].name} — your welcome bonus covers it.`);
      return;
    }
    if (u.sub && u.sub.status === 'active' && u.sub.plan === plan && u.sub.cycle === state.billing && !u.sub.cancelAtPeriodEnd) {
      toast(`You’re already on ${PLANS[plan].name} (${state.billing}).`);
      return;
    }
    Object.assign(co, { plan, cycle: state.billing, currency: u.wallet.currency, promo: null, points: 0, autoMax: true, busy: false, pinOk: false });
    $('#promoForm').reset();
    setMsg($('#promoMsg'), '');
    goStep(1);
    openDialog(dlg.checkout);
  }

  function renderCheckout() {
    const u = currentUser();
    if (!u) return;
    const a = coAmounts();
    const cur = co.currency;
    const cfg = WALLET_CFG[cur];
    const plan = PLANS[co.plan];
    co.points = a.points;
    setCo('planName', plan.name);
    $$('input[name="coPlan"]', dlg.checkout).forEach((r) => { r.checked = r.value === co.plan; });
    $$('input[name="coCycle"]', dlg.checkout).forEach((r) => { r.checked = r.value === co.cycle; });
    $$('[data-co-price]', dlg.checkout).forEach((el) => {
      const p = PLANS[el.dataset.coPrice].price[cur][co.cycle];
      el.textContent = `${fmtMoney(p, cur)} / ${co.cycle === 'yearly' ? 'year' : 'month'}`;
    });

    // Points slider
    pointsRange.max = String(a.maxPoints);
    pointsRange.value = String(a.points);
    pointsRange.disabled = a.maxPoints === 0;
    pointsRange.setAttribute('aria-valuetext', `${a.points} points, ${fmtMoney(a.pointsOff, cur)} off`);
    setCo('pointsOff', `${fmtPts(a.points)} · −${fmtMoney(a.pointsOff, cur)}`);
    setCo('pointsNote', u.wallet.points
      ? `You have ${fmtPts(u.wallet.points)} · 100 pts = ${fmtMoney(cfg.pointValue * 100, cur)} · up to 50% of the price (max ${fmtPts(a.maxPoints)} here)`
      : 'No points yet — earn them by logging activities in your Wallet.');

    // Summary
    setCo('line', `${plan.name} · ${co.cycle}`);
    setCo('subtotal', fmtMoney(a.price, cur));
    coEl('discountRow')[0].hidden = !co.promo;
    if (co.promo) {
      setCo('discountLabel', `Promo ${co.promo.code} · ${co.promo.pct}% off`);
      setCo('discount', `−${fmtMoney(a.promoOff, cur)}`);
    }
    coEl('pointsRow')[0].hidden = !a.points;
    setCo('pointsLabel', `Wellness Points (${fmtPts(a.points)})`);
    setCo('pointsDiscount', `−${fmtMoney(a.pointsOff, cur)}`);
    setCo('total', fmtMoney(a.total, cur));
    setCo('balance', fmtMoney(a.balance, cur));
    setCo('balanceAfter', fmtMoney(a.after, cur));
    coEl('balanceAfter')[0].classList.toggle('is-negative', a.after < 0);
    coEl('insufficient')[0].hidden = a.after >= 0;
    $('[data-co-next]', dlg.checkout).disabled = a.after < 0;
    const renewDate = fmtDate(addPeriod(Date.now(), co.cycle));
    setCo('renews', `Renews ${renewDate} at ${fmtMoney(a.price, cur)}/${co.cycle === 'yearly' ? 'year' : 'month'}, paid from your wallet. Receipt goes to your BDAI inbox.`);

    setCo('authLine', `BDAI ${plan.name} · ${co.cycle}`);
    setCo('authTotal', fmtMoney(a.total, cur));
    setCo('authMethod', `From BDAI Wallet${a.points ? ` + ${fmtPts(a.points)}` : ''}`);
    setCo('payBtn', `Pay ${fmtMoney(a.total, cur)} from wallet`);
  }

  function goStep(n) {
    co.step = n;
    $$('[data-co-step]', dlg.checkout).forEach((s) => { s.hidden = +s.dataset.coStep !== n; });
    $$('[data-stepper]', dlg.checkout).forEach((li) => {
      const i = +li.dataset.stepper;
      li.classList.toggle('is-active', i === n);
      li.classList.toggle('is-done', i < n);
    });
    renderCheckout();
    if (n <= 2) co.pinOk = false;
    if (n === 2) {
      const u = currentUser();
      checkoutPad.setLength(u.pin.length);
      setMsg(checkoutPinMsg, '');
      applyPinState(checkoutPad, checkoutPinMsg);
      setTimeout(() => checkoutPad.focus(), 30);
    }
    if (n === 3) {
      coKeyForm.reset();
      coKeyForm.hidden = false;
      coEl('processing')[0].hidden = true;
      setMsg($('.form-error', coKeyForm), '');
      setTimeout(() => coKeyForm.elements.key.focus(), 30);
    }
    $('.modal-card', dlg.checkout).scrollTop = 0;
  }

  $$('input[name="coPlan"]', dlg.checkout).forEach((r) => r.addEventListener('change', () => { co.plan = r.value; renderCheckout(); }));
  $$('input[name="coCycle"]', dlg.checkout).forEach((r) => r.addEventListener('change', () => {
    co.cycle = r.value;
    if (co.promo?.yearlyOnly && co.cycle !== 'yearly') {
      setMsg($('#promoMsg'), `${co.promo.code} applies to yearly plans only — removed.`, 'error');
      co.promo = null;
    }
    renderCheckout();
  }));
  pointsRange.addEventListener('input', () => {
    co.autoMax = false;
    co.points = +pointsRange.value;
    renderCheckout();
  });
  $('#promoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = e.currentTarget.elements.promo.value.trim().toUpperCase();
    const msg = $('#promoMsg');
    if (!code) { co.promo = null; setMsg(msg, ''); renderCheckout(); return; }
    const p = PROMOS[code];
    if (!p) { co.promo = null; setMsg(msg, 'That promo code isn’t valid.', 'error'); renderCheckout(); return; }
    if (p.yearlyOnly && co.cycle !== 'yearly') { setMsg(msg, `${code} works with yearly billing only. Switch to Yearly to apply it.`, 'error'); return; }
    co.promo = { code, ...p };
    setMsg(msg, `${code} applied — ${p.label}.`, 'ok');
    renderCheckout();
  });
  $('[data-co-next]', dlg.checkout).addEventListener('click', () => {
    if (coAmounts().after < 0) return;
    goStep(2);
  });
  $$('[data-co-back]', dlg.checkout).forEach((b) => b.addEventListener('click', () => {
    if (co.busy) return;
    checkoutPad.stopCooldown();
    goStep(Math.max(1, co.step - 1));
  }));
  $('[data-co-wallet]', dlg.checkout).addEventListener('click', () => {
    closeDialog(dlg.checkout);
    openAccount('wallet');
  });

  // Step 2: PIN
  const checkoutPinMsg = $('#checkoutPinMsg');
  const checkoutPad = new PinPad($('#checkoutPad'), {
    label: 'Purchase PIN',
    onComplete: async (v, pad) => {
      const res = await verifyPin(v);
      if (!res.ok) {
        handlePinFailure(res, pad, checkoutPinMsg, { onFrozen: () => { closeDialog(dlg.checkout); lock(); } });
        return;
      }
      pad.success();
      setMsg(checkoutPinMsg, 'PIN verified', 'ok');
      await sleep(300);
      goStep(3);
      co.pinOk = true;
    },
  });

  // Step 3: security key → pay
  coKeyForm.elements.key.addEventListener('input', formatKeyInput);
  coKeyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (co.busy) return;
    if (!co.pinOk) { goStep(2); return; }
    const btn = $('button[type="submit"]', coKeyForm);
    btn.classList.add('is-loading');
    const res = await checkRecoveryKey(state.email, coKeyForm.elements.key.value, 'purchase');
    btn.classList.remove('is-loading');
    if (!res.ok) { fieldError(coKeyForm, 'key', res.msg); return; }
    if (coAmounts().after < 0) { fieldError(coKeyForm, 'key', 'Your wallet balance changed and is now too low.'); return; }
    co.busy = true;
    coKeyForm.hidden = true;
    coEl('processing')[0].hidden = false;
    $$('[data-co-back]', dlg.checkout).forEach((b) => { b.disabled = true; });
    await sleep(1200);
    const done = activateSubscription();
    co.busy = false;
    $$('[data-co-back]', dlg.checkout).forEach((b) => { b.disabled = false; });
    if (!done) {
      coKeyForm.hidden = false;
      coEl('processing')[0].hidden = true;
      fieldError(coKeyForm, 'key', 'Payment failed — not enough wallet balance.');
      return;
    }
    goStep(4);
    confetti();
    flushWalletToasts();
  });

  function activateSubscription() {
    const a = coAmounts();
    const now = Date.now();
    const plan = PLANS[co.plan];
    const cur = co.currency;
    const renewsAt = addPeriod(now, co.cycle);
    let ok = false;
    updateUser((u) => {
      if (!spend(u, { cash: a.total, points: a.points, desc: `BDAI ${plan.name} · ${co.cycle}` })) return;
      ok = true;
      const prev = u.sub;
      u.sub = {
        plan: co.plan, cycle: co.cycle, currency: cur,
        amount: plan.price[cur][co.cycle],
        status: 'active', startedAt: now, renewsAt,
        cancelAtPeriodEnd: false, method: { type: 'wallet' },
      };
      const inv = {
        id: makeInvoiceId(now), date: now, plan: co.plan, cycle: co.cycle, currency: cur,
        price: a.price, discount: a.promoOff, promo: co.promo?.code || '',
        pointsUsed: a.points, pointsOff: a.pointsOff, amount: a.total,
        method: 'BDAI Wallet', auth: 'PIN + security key', status: 'Paid',
      };
      u.invoices = u.invoices || [];
      u.invoices.unshift(inv);
      const changed = prev && prev.status === 'active';
      logActivity(u, changed
        ? `Plan changed: ${PLANS[prev.plan].name} → ${plan.name} (${co.cycle})`
        : `Subscribed to ${plan.name} (${co.cycle}) — authorized with PIN + security key`);
      sendMail(u, 'billing', `Receipt: you’re on BDAI ${plan.name}`, {
        paras: [
          `Hi ${u.first}, thanks for ${changed ? 'switching to' : 'subscribing to'} BDAI ${plan.name}! It was paid from your BDAI Wallet and authorized with your PIN and security key.`,
          `Renewals are taken from your wallet automatically — keep logging activities to top it up. Your wallet now holds ${fmtMoney(u.wallet.cash, cur)} and ${fmtPts(u.wallet.points)}.`,
        ],
        rows: receiptRows(inv, renewsAt),
        actions: [{ label: 'Download receipt', invoice: inv.id }, { label: 'Manage subscription', tab: 'subscription' }],
      });
      sendMail(u, 'coach', `Let’s make ${plan.name} count`, {
        paras: [
          `${u.first}, your AI plan now adapts daily to your readiness score.`,
          plan.tier >= 2
            ? 'As an Elite member you can book your first 1:1 coach check-in this week and invite your team to the coach hub.'
            : 'Start with Half-Marathon Builder or Hypertrophy Pro — both sync with your nutrition targets.',
        ],
        actions: [{ label: 'Browse programs', href: '#programs' }],
      });
    });
    if (ok) {
      setCo('successText', `${fmtMoney(a.total, cur)} paid from your BDAI Wallet${a.points ? ` plus ${fmtPts(a.points)} (−${fmtMoney(a.pointsOff, cur)})` : ''}. Next renewal ${fmtDate(renewsAt)} at ${fmtMoney(plan.price[cur][co.cycle], cur)} from your wallet. Receipt sent to your inbox.`);
    }
    return ok;
  }

  $('#coGoAccount').addEventListener('click', () => {
    closeDialog(dlg.checkout);
    openAccount('subscription');
  });
  dlg.checkout.addEventListener('cancel', (e) => { if (co.busy) e.preventDefault(); });
  dlg.checkout.addEventListener('close', () => {
    checkoutPad.stopCooldown();
    co.pinOk = false;
    coKeyForm.reset();
  });

  function confetti() {
    if (reducedMotion) return;
    const canvas = $('#confetti');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#3ef0a8', '#22c3ee', '#ff6b4a', '#ffc24b', '#8b7bff', '#f07cff'];
    const parts = Array.from({ length: 140 }, () => ({
      x: rect.width / 2 + (Math.random() - 0.5) * 80,
      y: rect.height * 0.35,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -11 - 3,
      r: Math.random() * 6 + 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    const start = performance.now();
    const frame = (t) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, rect.width, rect.height);
      parts.forEach((p) => {
        p.vy += 0.32;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 2600);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      });
      if (elapsed < 2600) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, rect.width, rect.height);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Pricing section ---------- */
  function renderPricing(animate = false) {
    const u = currentUser();
    Object.entries(PLANS).forEach(([key, plan]) => {
      const amountEl = $(`[data-price="${key}"]`);
      const perEl = $(`[data-per="${key}"]`);
      const billedEl = $(`[data-billed="${key}"]`);
      const monthly = plan.price[state.currency].monthly;
      const yearly = plan.price[state.currency].yearly;
      if (key === 'starter') {
        amountEl.textContent = fmtMoney(0, state.currency);
        perEl.textContent = '/month';
        billedEl.textContent = 'Free forever';
      } else if (state.billing === 'monthly') {
        amountEl.textContent = fmtMoney(monthly, state.currency);
        perEl.textContent = '/month';
        billedEl.textContent = 'Billed monthly · cancel anytime';
      } else {
        amountEl.textContent = fmtMoney(Math.round(yearly / 12), state.currency);
        perEl.textContent = '/month';
        billedEl.textContent = `Billed ${fmtMoney(yearly, state.currency)} yearly · save ${fmtMoney(monthly * 12 - yearly, state.currency)}`;
      }
      if (animate && key !== 'starter') {
        amountEl.classList.remove('bump');
        void amountEl.offsetWidth;
        amountEl.classList.add('bump');
      }

      const card = $(`.price-card[data-plan="${key}"]`);
      const btn = $(`[data-choose-plan="${key}"]`);
      const activeTier = userTier(u);
      const isCurrent = u && ((key === 'starter' && activeTier === 0) || (u.sub?.status === 'active' && u.sub.plan === key));
      card.classList.toggle('is-current', !!isCurrent);
      if (!u) {
        btn.textContent = key === 'starter' ? 'Get started free' : `Choose ${plan.name}`;
      } else if (key === 'starter') {
        btn.textContent = activeTier === 0 ? 'Your current plan' : 'Included';
      } else if (u.sub?.status === 'active' && u.sub.plan === key) {
        btn.textContent = u.sub.cycle === state.billing ? 'Current plan · manage' : `Switch to ${state.billing}`;
      } else {
        btn.textContent = plan.tier > activeTier ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`;
      }
    });
  }

  const billingToggle = $('#billingToggle');
  function setBilling(cycle, focus = false) {
    state.billing = cycle;
    billingToggle.dataset.active = cycle;
    $$('[data-billing]', billingToggle).forEach((b) => {
      const on = b.dataset.billing === cycle;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    renderPricing(true);
  }
  $$('[data-billing]', billingToggle).forEach((b) => b.addEventListener('click', () => setBilling(b.dataset.billing)));
  billingToggle.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      setBilling(state.billing === 'monthly' ? 'yearly' : 'monthly', true);
    }
  });
  const currencySelect = $('#currencySelect');
  currencySelect.value = state.currency;
  currencySelect.addEventListener('change', () => {
    state.currency = currencySelect.value;
    local.set(KEYS.currency, state.currency);
    renderPricing(true);
    renderRewardsCopy();
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-choose-plan]');
    if (!b) return;
    const plan = b.dataset.choosePlan;
    const u = currentUser();
    if (plan === 'starter') {
      if (!u) { openAuth('signup'); return; }
      if (userTier(u) > 0) { openAccount('subscription'); toast('To move to Starter, cancel your paid plan — you keep access until the period ends.'); return; }
      toast('You’re on Starter. Explore the free programs below!');
      scrollToId('programs');
      return;
    }
    if (u?.sub?.status === 'active' && u.sub.plan === plan && u.sub.cycle === state.billing) {
      openAccount('subscription');
      return;
    }
    openCheckout(plan);
  });

  function scrollToId(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  /* ---------------------------------------------------------
     Account dialog
     --------------------------------------------------------- */
  function switchAccountTab(tab) {
    $$('[data-acc-tab]', dlg.account).forEach((b) => {
      const on = b.dataset.accTab === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $$('[data-acc-panel]', dlg.account).forEach((p) => { p.hidden = p.dataset.accPanel !== tab; });
    if (tab === 'inbox') {
      renderInbox();
      if (!state.inboxUnlocked) unlockInbox();
    }
  }

  /** The inbox opens only after the PIN is entered; it re-locks when the account window closes. */
  let inboxPrompting = false;
  async function unlockInbox() {
    if (state.inboxUnlocked || inboxPrompting) return state.inboxUnlocked;
    inboxPrompting = true;
    const ok = await pinPrompt({ title: 'Open your inbox', sub: 'Enter your PIN to read your BDAI mail.' });
    inboxPrompting = false;
    if (ok) {
      state.inboxUnlocked = true;
      updateUserSilently((x) => logActivity(x, 'Inbox opened with PIN'));
      if (krWantsCodeMail) {
        krWantsCodeMail = false;
        const m = (currentUser()?.inbox || []).find((x) => x.code);
        if (m) { inboxState.openId = m.id; setMailRead(m.id, true); }
      }
      if (dlg.account.open) renderInbox();
    }
    return ok;
  }
  $$('[data-acc-tab]', dlg.account).forEach((b) => b.addEventListener('click', () => switchAccountTab(b.dataset.accTab)));
  $('.account-tabs', dlg.account).addEventListener('keydown', (e) => {
    const tabs = $$('[data-acc-tab]', dlg.account);
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let n = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    if (n >= 0) { e.preventDefault(); tabs[n].focus(); switchAccountTab(tabs[n].dataset.accTab); }
  });

  function openAccount(tab = 'profile') {
    const u = currentUser();
    if (!u) { openAuth('login'); return; }
    syncSubscription();
    if (tab === 'inbox') inboxState.openId = null;
    renderAccount();
    fillProfileForm();
    openDialog(dlg.account); // open first so the inbox PIN prompt stacks on top
    switchAccountTab(tab);
  }
  $('#userChip').addEventListener('click', () => openAccount('profile'));
  $('#inboxUnlockBtn').addEventListener('click', () => unlockInbox());
  dlg.account.addEventListener('close', () => {
    state.inboxUnlocked = false;
    inboxState.openId = null;
  });
  $('#inboxBtn').addEventListener('click', () => openAccount('inbox'));

  const accEl = (k) => $$(`[data-acc="${k}"]`, dlg.account);
  const setAcc = (k, text) => accEl(k).forEach((el) => { el.textContent = text; });

  function fillProfileForm() {
    const u = currentUser();
    if (!u) return;
    const f = $('#profileForm').elements;
    f.first.value = u.first;
    f.last.value = u.last;
    f.email.value = u.email;
    f.sport.value = u.settings?.sport || 'running';
    f.weeklyGoal.value = u.settings?.weeklyGoal || 4;
    f.goalOut.value = f.weeklyGoal.value;
  }

  function renderAccount() {
    const u = currentUser();
    if (!u) return;
    const planKey = u.sub?.status === 'active' ? u.sub.plan : 'starter';
    setAcc('avatar', initials(fullName(u)));
    setAcc('name', fullName(u));
    const [localPart] = u.email.split('@');
    accEl('email').forEach((el) => { el.innerHTML = `${escapeHtml(localPart)}<wbr>@${DOMAIN}`; });
    setAcc('emailAddr', u.email);
    setAcc('planBadge', PLANS[planKey].name);
    accEl('planBadge')[0].dataset.plan = planKey;
    setAcc('since', fmtDate(u.createdAt));
    setAcc('plan', PLANS[planKey].name + (u.sub?.cancelAtPeriodEnd ? ' (ending)' : ''));
    setAcc('programs', String((u.programs || []).length));

    renderWallet(u);
    renderSubscriptionPanel(u);
    renderSecurityPanel(u);
    if (!$('[data-acc-panel="inbox"]', dlg.account).hidden) renderInbox();
  }

  function renderSubscriptionPanel(u) {
    const subView = $('#subView');
    if (u.sub && u.sub.status === 'active') {
      const s = u.sub;
      const p = PLANS[s.plan];
      const per = s.cycle === 'yearly' ? 'year' : 'month';
      subView.innerHTML = `
        <div class="sub-card" data-plan="${s.plan}">
          <div class="sub-top">
            <div><small>Current plan</small>
              <h3>${p.name} ${s.cancelAtPeriodEnd
                ? `<span class="pill warn">Ends ${escapeHtml(fmtDate(s.renewsAt))}</span>`
                : '<span class="pill ok">Active</span>'}</h3>
            </div>
            <div class="sub-price">${escapeHtml(fmtMoney(s.amount, s.currency))}<small>/${per}</small></div>
          </div>
          <dl class="sub-meta">
            <div><dt>${s.cancelAtPeriodEnd ? 'Access until' : 'Next billing'}</dt><dd>${escapeHtml(fmtDate(s.renewsAt))}</dd></div>
            <div><dt>Paid from</dt><dd>BDAI Wallet · ${escapeHtml(fmtMoney(u.wallet?.cash || 0, s.currency))}</dd></div>
            <div><dt>Started</dt><dd>${escapeHtml(fmtDate(s.startedAt))}</dd></div>
          </dl>
          <div class="sub-actions">
            <button class="btn btn-primary btn-sm" type="button" data-act="change-plan">Change plan</button>
            ${s.cancelAtPeriodEnd
              ? '<button class="btn btn-outline btn-sm" type="button" data-act="resume-sub">Resume subscription</button>'
              : '<button class="btn btn-ghost btn-sm is-danger" type="button" data-act="cancel-sub">Cancel subscription</button>'}
          </div>
        </div>`;
    } else {
      subView.innerHTML = `
        <div class="sub-card" data-plan="starter">
          <div class="sub-top">
            <div><small>Current plan</small><h3>Starter <span class="pill">Free</span></h3></div>
            <div class="sub-price">${escapeHtml(fmtMoney(0, state.currency))}<small>/month</small></div>
          </div>
          <p class="muted" style="margin:14px 0 18px">Unlock AI adaptive plans, all Pro programs, nutrition coaching and HRV insights.</p>
          <div class="sub-actions">
            <button class="btn btn-primary btn-sm" type="button" data-act="upgrade" data-plan="pro">Upgrade to Pro</button>
            <button class="btn btn-outline btn-sm" type="button" data-act="upgrade" data-plan="elite">Go Elite</button>
          </div>
        </div>`;
    }

    const inv = u.invoices || [];
    $('#invoiceView').innerHTML = inv.length
      ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Date</th><th>Invoice</th><th>Plan</th><th>Amount</th><th>Status</th><th><span class="sr-only">Download</span></th></tr></thead>
          <tbody>${inv.map((x) => `
            <tr>
              <td>${escapeHtml(fmtDate(x.date))}</td>
              <td>${escapeHtml(x.id)}</td>
              <td>${escapeHtml(PLANS[x.plan].name)} · ${escapeHtml(x.cycle)}</td>
              <td>${escapeHtml(fmtMoney(x.amount, x.currency))}</td>
              <td><span class="pill ok">${escapeHtml(x.status)}</span></td>
              <td><button class="icon-btn" type="button" data-invoice="${escapeHtml(x.id)}" aria-label="Download receipt ${escapeHtml(x.id)}"><svg class="i"><use href="#i-download"/></svg></button></td>
            </tr>`).join('')}</tbody></table></div>`
      : '<p class="empty">No invoices yet. Receipts will also arrive in your BDAI inbox.</p>';
  }

  function renderSecurityPanel(u) {
    const hasPin = !!u.pin;
    setAcc('pinStatus', hasPin
      ? `${u.pin.frozen ? 'Frozen' : 'Enabled'} · ${u.pin.length}-digit · set ${fmtDate(u.pin.setAt)}`
      : 'Not set');
    $('#pinSetupBtn').textContent = hasPin ? 'Change PIN' : 'Set up PIN';
    setAcc('keyStatus', u.recovery ? `Created ${fmtDate(u.recovery.createdAt)} · stored hashed` : 'Not created');
    $$('[data-needs-pin]', dlg.account).forEach((row) => {
      row.classList.toggle('is-disabled', !hasPin);
      $$('button, select, input', row).forEach((c) => { c.disabled = !hasPin; });
    });
    $('#autoLockSelect').value = String(u.settings?.autoLock ?? 5);
    $('#shuffleToggle').checked = !!u.settings?.shuffle;

    $('#activityList').innerHTML = (u.activity || []).slice(0, 12).map((a) => `
      <li class="${a.warn ? 'is-warn' : ''}"><span>${escapeHtml(a.msg)}</span><small>${escapeHtml(fmtDateTime(a.t))}</small></li>`).join('')
      || '<li><span class="muted">No activity yet.</span></li>';
  }

  // Subscription actions
  $('#subView').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const u = currentUser();
    if (!u) return;
    const act = b.dataset.act;
    if (act === 'change-plan' || act === 'upgrade') {
      closeDialog(dlg.account);
      if (act === 'upgrade') { openCheckout(b.dataset.plan); return; }
      scrollToId('pricing');
    } else if (act === 'cancel-sub') {
      const ok = await pinPrompt({
        title: 'Cancel subscription?',
        sub: `Enter your PIN to confirm. You keep ${PLANS[u.sub.plan].name} until ${fmtDate(u.sub.renewsAt)}.`,
        danger: true,
      });
      if (!ok) return;
      updateUser((x) => {
        const name = PLANS[x.sub.plan].name;
        x.sub.cancelAtPeriodEnd = true;
        logActivity(x, `${name} set to cancel at period end`);
        sendMail(x, 'billing', `Your ${name} subscription is cancelled`, {
          paras: [
            `Hi ${x.first}, we’ve cancelled your BDAI ${name} renewal. You keep full ${name} access until ${fmtDate(x.sub.renewsAt)}, then your account moves to Starter.`,
            'Changed your mind? Resume any time before then — nothing is lost.',
          ],
          rows: [['Plan', `BDAI ${name}`], ['Access until', fmtDate(x.sub.renewsAt)]],
          actions: [{ label: 'Resume subscription', tab: 'subscription' }],
        });
      });
      toast(`Subscription cancelled. Access continues until ${fmtDate(u.sub.renewsAt)}.`);
    } else if (act === 'resume-sub') {
      updateUser((x) => {
        const name = PLANS[x.sub.plan].name;
        x.sub.cancelAtPeriodEnd = false;
        logActivity(x, `${name} subscription resumed`);
        sendMail(x, 'billing', `Welcome back to ${name}`, {
          paras: [`Hi ${x.first}, your ${name} subscription is active again and will renew on ${fmtDate(x.sub.renewsAt)}.`],
        });
      });
      toast('Welcome back — your subscription will renew as normal.', 'success');
    }
  });

  function downloadInvoice(id) {
    const u = currentUser();
    const x = (u?.invoices || []).find((i) => i.id === id);
    if (!x) { toast('Receipt not found.', 'error'); return; }
    downloadText(`${x.id}.txt`, [
      'BDAI Sports & Health — Receipt',
      'Powered by BDAIWellness',
      '----------------------------------------',
      `Receipt:   ${x.id}`,
      `Date:      ${new Date(x.date).toLocaleString()}`,
      `Customer:  ${fullName(u)} <${u.email}>`,
      `Plan:      BDAI ${PLANS[x.plan].name} (${x.cycle})`,
      `Price:     ${fmtMoney(x.price ?? x.amount, x.currency)}`,
      x.discount ? `Promo:     -${fmtMoney(x.discount, x.currency)}${x.promo ? ` (${x.promo})` : ''}` : null,
      x.pointsUsed ? `Points:    -${fmtMoney(x.pointsOff, x.currency)} (${x.pointsUsed} pts redeemed)` : null,
      `Total:     ${fmtMoney(x.amount, x.currency)}`,
      `Paid from: ${x.method}`,
      `Authorized: ${x.auth}`,
      `Status:    ${x.status}`,
      '----------------------------------------',
      'Demo receipt — paid with BDAI Wallet credit, no real money.',
    ].filter(Boolean).join('\n'));
  }
  $('#invoiceView').addEventListener('click', (e) => {
    const b = e.target.closest('[data-invoice]');
    if (b) downloadInvoice(b.dataset.invoice);
  });

  // Profile
  $('#profileForm').addEventListener('input', (e) => {
    e.target.removeAttribute('aria-invalid');
    if (e.target.name === 'weeklyGoal') e.currentTarget.elements.goalOut.value = e.target.value;
  });
  $('#profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = form.elements;
    const first = titleCase(f.first.value);
    const last = titleCase(f.last.value);
    if (!NAME_RE.test(first)) { f.first.setAttribute('aria-invalid', 'true'); f.first.focus(); toast('Please enter a valid first name.', 'error'); return; }
    if (!NAME_RE.test(last)) { f.last.setAttribute('aria-invalid', 'true'); f.last.focus(); toast('Please enter a valid last name.', 'error'); return; }
    updateUser((u) => {
      u.first = first;
      u.last = last;
      u.settings = { ...u.settings, sport: f.sport.value, weeklyGoal: +f.weeklyGoal.value };
      logActivity(u, 'Profile updated');
    });
    fillProfileForm();
    toast('Profile saved. Your BDAI email stays the same.', 'success');
  });

  // Security actions
  $('#pinSetupBtn').addEventListener('click', async () => {
    const ok = await openPinSetup({ mode: 'change' });
    if (ok && dlg.account.open) renderAccount();
  });
  /* ---------- Lost security key → one-time code sent to the PIN-locked inbox ---------- */
  const KR_TTL = 10 * 60 * 1000; // code lifetime
  const KR_RESEND = 30 * 1000; // resend cooldown
  const KR_MAX_TRIES = 5; // wrong codes before a new one is required
  const keyResetForm = $('#keyResetForm');
  let krTimer = null;
  let krWantsCodeMail = false;
  let lastCopiedCode = '';

  /** Create a 6-digit code, store only its hash, and deliver it to the inbox. */
  async function sendKeyResetCode() {
    const u = currentUser();
    if (!u) return { ok: false };
    const now = Date.now();
    if (u.keyReset && now - u.keyReset.sentAt < KR_RESEND) {
      return { ok: false, wait: Math.ceil((KR_RESEND - (now - u.keyReset.sentAt)) / 1000) };
    }
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
    const salt = randomHex();
    const hash = await deriveHash(code, salt, 20000);
    const exp = now + KR_TTL;
    updateUser((x) => {
      // Any earlier code stops working.
      (x.inbox || []).forEach((m) => { if (m.code) m.code.exp = Math.min(m.code.exp, now); });
      x.keyReset = { salt, hash, exp, sentAt: now, tries: 0 };
      logActivity(x, 'Security-key reset code sent to inbox');
      sendMail(x, 'security', 'Your security key reset code', {
        paras: [
          `Hi ${x.first}, use this code to get a new security key for ${x.email}.`,
          'Copy it and paste it into the “Get a new security key” window. It expires in 10 minutes and works only once.',
          'Didn’t ask for this? Ignore this message — your current key keeps working.',
        ],
        code: { value: code, exp },
      });
    });
    return { ok: true };
  }

  function tickKeyReset() {
    const kr = currentUser()?.keyReset;
    const exp = $('[data-kr="expiry"]');
    const resend = $('#krResend');
    if (!kr) { exp.textContent = 'No active code'; resend.disabled = false; resend.textContent = 'Send code'; return; }
    const left = kr.exp - Date.now();
    exp.textContent = left > 0
      ? `Code expires in ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`
      : 'Code expired';
    const wait = KR_RESEND - (Date.now() - kr.sentAt);
    resend.disabled = wait > 0;
    resend.textContent = wait > 0 ? `Resend in ${Math.ceil(wait / 1000)}s` : 'Resend code';
  }

  async function startKeyReset() {
    const u = currentUser();
    if (!u) return;
    // The inbox lives in the account window, which must open on top of this one.
    if (dlg.account.open) closeDialog(dlg.account);
    const res = await sendKeyResetCode();
    keyResetForm.reset();
    $$('[data-kr="email"]').forEach((el) => { el.textContent = u.email; });
    setMsg($('.form-error', keyResetForm), res.ok ? '' : `A code was sent moments ago — check your inbox (resend in ${res.wait}s).`);
    openDialog(dlg.keyReset);
    if (res.ok) toast('Reset code sent to your BDAI inbox.', 'mail');
    tickKeyReset();
    clearInterval(krTimer);
    krTimer = setInterval(tickKeyReset, 1000);
    $('#krOpenInbox').focus();
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-lost-key]')) startKeyReset();
  });
  dlg.keyReset.addEventListener('close', () => clearInterval(krTimer));
  $('#krResend').addEventListener('click', async () => {
    const r = await sendKeyResetCode();
    if (r.ok) {
      keyResetForm.reset();
      setMsg($('.form-error', keyResetForm), '');
      toast('New code sent — older codes no longer work.', 'mail');
    }
    tickKeyReset();
  });
  $('#krOpenInbox').addEventListener('click', () => {
    krWantsCodeMail = true;
    openAccount('inbox');
  });
  // Back from the inbox: put the cursor where the code goes.
  dlg.account.addEventListener('close', () => {
    if (!dlg.keyReset.open) return;
    setTimeout(() => keyResetForm.elements.code.focus(), 50);
    if (lastCopiedCode) toast('Now paste the code (Ctrl/⌘ + V) and verify.');
  });

  keyResetForm.elements.code.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));
  keyResetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = currentUser();
    if (!u) return;
    const code = keyResetForm.elements.code.value.replace(/\D/g, '');
    const kr = u.keyReset;
    if (code.length !== 6) { fieldError(keyResetForm, 'code', 'Enter the 6-digit code from your inbox.'); return; }
    if (!kr) { fieldError(keyResetForm, 'code', 'No active code — tap “Send code”.'); return; }
    if (Date.now() > kr.exp) { fieldError(keyResetForm, 'code', 'This code has expired — tap “Resend code”.'); return; }
    if (kr.tries >= KR_MAX_TRIES) { fieldError(keyResetForm, 'code', 'Too many wrong codes — tap “Resend code” for a new one.'); return; }
    const btn = $('button[type="submit"]', keyResetForm);
    btn.classList.add('is-loading');
    const hash = await deriveHash(code, kr.salt, 20000);
    if (!safeEqual(hash, kr.hash)) {
      btn.classList.remove('is-loading');
      updateUserSilently((x) => {
        if (x.keyReset) x.keyReset.tries += 1;
        logActivity(x, 'Wrong security-key reset code', true);
      });
      const left = KR_MAX_TRIES - kr.tries - 1;
      fieldError(keyResetForm, 'code', left > 0 ? `That code isn’t right. ${left} tr${left === 1 ? 'y' : 'ies'} left.` : 'Too many wrong codes — tap “Resend code” for a new one.');
      return;
    }
    // Code is valid: issue a brand-new security key.
    const key = generateRecoveryKey();
    const salt = randomHex();
    const keyHash = await deriveHash(normalizeKey(key), salt);
    btn.classList.remove('is-loading');
    updateUser((x) => {
      x.keyReset = null;
      (x.inbox || []).forEach((m) => { if (m.code) m.code.exp = Math.min(m.code.exp, Date.now()); });
      x.recovery = { salt, hash: keyHash, createdAt: Date.now() };
      logActivity(x, 'New security key issued via inbox code');
      sendMail(x, 'security', 'You have a new security key', {
        paras: [
          `Hi ${x.first}, a new security key was issued for ${x.email} after you verified the code from your inbox. Your old key no longer works.`,
          'We never email the key itself — keep the copy you just saved.',
        ],
        rows: [['Time', fmtDateTime(Date.now())]],
        actions: [{ label: 'Open security settings', tab: 'security' }],
      });
    });
    recoveryLimits.delete(state.email);
    lastCopiedCode = '';
    closeDialog(dlg.keyReset);
    ps.mode = 'change';
    ps.completed = true;
    showRecoveryKey(key, 'Your new security key');
    dlg.pinSetup.addEventListener('close', () => {
      if (dlg.checkout.open && co.step === 3) {
        toast('Now enter your new security key to finish your purchase.');
        coKeyForm.elements.key.focus();
      }
    }, { once: true });
  });

  $('#autoLockSelect').addEventListener('change', (e) => {
    const v = +e.target.value;
    updateUser((u) => { u.settings = { ...u.settings, autoLock: v }; logActivity(u, v ? `Auto-lock set to ${v} min` : 'Auto-lock turned off'); });
    toast(v ? `BDAI will lock after ${v} minute${v === 1 ? '' : 's'} of inactivity.` : 'Auto-lock turned off.');
  });
  $('#shuffleToggle').addEventListener('change', (e) => {
    const on = e.target.checked;
    updateUser((u) => { u.settings = { ...u.settings, shuffle: on }; logActivity(u, on ? 'Scrambled keypad enabled' : 'Scrambled keypad disabled'); });
  });
  const lockNow = () => {
    if (!currentUser()?.pin) return;
    closeDialog(dlg.account);
    lock();
  };
  $('#lockNowInline').addEventListener('click', lockNow);
  $('#lockNowBtn').addEventListener('click', lockNow);

  $('#deleteAccountBtn').addEventListener('click', async () => {
    const u = currentUser();
    if (!u) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Permanently delete ${u.email} and its inbox? This cannot be undone.`)) return;
    const ok = await pinPrompt({ title: 'Delete account', sub: 'Enter your PIN to permanently delete your account and inbox.', danger: true });
    if (!ok) return;
    const email = u.email;
    logout('Your account and inbox have been deleted.');
    db.remove(email);
    devices.remove(email);
  });

  /* ---------------------------------------------------------
     Wallet tab
     --------------------------------------------------------- */
  const setW = (k, text) => $$(`[data-w="${k}"]`, dlg.account).forEach((el) => { el.textContent = text; });
  const activityForm = $('#activityForm');
  const activityType = $('#activityType');
  activityType.innerHTML = Object.entries(ACTIVITIES)
    .map(([id, a]) => `<option value="${id}">${escapeHtml(a.label)} · ${a.rate} pts/min</option>`).join('');
  const TX_ICON = { earn: 'bolt', bonus: 'wallet', milestone: 'medal', spend: 'card' };
  const breathing = { timer: null, left: 0 };

  function renderWallet(u) {
    const w = u?.wallet;
    if (!w) return;
    const cur = w.currency;
    const cfg = WALLET_CFG[cur];
    const d = ensureDaily(w);
    setW('cash', fmtMoney(w.cash, cur));
    setW('points', w.points.toLocaleString());
    setW('pointsValue', `Worth ${fmtMoney(round2(w.points * cfg.pointValue), cur)} off subscriptions`);
    setW('todayCash', fmtMoney(d.cash, cur));
    setW('today', `of ${fmtMoney(cfg.dailyCap, cur)} daily limit · ${fmtPts(d.points)}`);
    $('[data-w="todayBar"]', dlg.account).style.width = `${clamp(d.cash / cfg.dailyCap * 100, 0, 100)}%`;

    // Daily tasks
    const doneCount = DAILY_TASKS.filter((t) => d.tasks[t.id]).length;
    setW('tasksDone', `${doneCount}/${DAILY_TASKS.length} done`);
    $('#dailyTasks').innerHTML = DAILY_TASKS.map((t) => {
      const done = !!d.tasks[t.id];
      const cash = round2(t.points * cfg.cashPerPoint);
      let label = 'Claim';
      if (done) label = '✓ Done';
      else if (t.auto) label = 'Open tools';
      else if (t.timer) label = breathing.timer ? `Breathe… ${breathing.left}s` : 'Start';
      return `<div class="task${done ? ' is-done' : ''}">
        <span class="task-icon"><svg class="i"><use href="#i-${t.icon}"/></svg></span>
        <span class="task-text"><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(t.desc)} · +${t.points} pts · +${escapeHtml(fmtMoney(cash, cur))}</small></span>
        <button class="btn ${done ? 'btn-ghost' : 'btn-outline'} btn-sm${t.timer && breathing.timer ? ' is-breathing' : ''}" type="button" data-task="${t.id}"${done || (t.timer && breathing.timer) ? ' disabled' : ''}>${escapeHtml(label)}</button>
      </div>`;
    }).join('');

    updateEarnPreview(u);

    // Milestones
    $('#milestoneList').innerHTML = MILESTONES.map((m) => {
      const done = !!w.milestones[m.id];
      const v = done ? m.goal : milestoneValue(w, m);
      const cash = milestoneCash(m, cur);
      const reward = [m.points ? `+${fmtPts(m.points)}` : '', cash ? `+${fmtMoney(cash, cur)}` : ''].filter(Boolean).join(' · ');
      return `<li class="milestone${done ? ' is-done' : ''}">
        <span class="ms-icon"><svg class="i"><use href="#i-${done ? 'medal' : 'trophy'}"/></svg></span>
        <div class="ms-text"><strong>${escapeHtml(m.title)}</strong>
          <small>${done ? `Unlocked ${escapeHtml(fmtDate(w.milestones[m.id]))}` : `${escapeHtml(m.desc)} · ${Math.round(v).toLocaleString()}/${m.goal.toLocaleString()}`} · ${escapeHtml(reward)}</small>
          <div class="ms-bar"><i style="width:${clamp(v / m.goal * 100, 0, 100)}%"></i></div>
        </div>
      </li>`;
    }).join('');

    // Transactions
    $('#txList').innerHTML = w.tx.length ? w.tx.slice(0, 40).map((t) => `
      <li class="${t.kind === 'spend' ? 'is-debit' : ''}">
        <span class="tx-icon"><svg class="i"><use href="#i-${TX_ICON[t.kind] || 'bolt'}"/></svg></span>
        <span class="tx-desc"><strong>${escapeHtml(t.desc)}</strong><small>${escapeHtml(fmtDateTime(t.t))}</small></span>
        <span class="tx-amt">
          ${t.cash ? `<span class="${t.cash < 0 ? 'neg' : 'pos'}">${t.cash < 0 ? '−' : '+'}${escapeHtml(fmtMoney(Math.abs(t.cash), cur))}</span>` : ''}
          ${t.points ? `<span class="pts">${t.points < 0 ? '−' : '+'}${escapeHtml(fmtPts(Math.abs(t.points)))}</span>` : ''}
        </span>
      </li>`).join('') : '<li><span class="muted">No transactions yet.</span></li>';
  }

  function updateEarnPreview(u = currentUser()) {
    const w = u?.wallet;
    if (!w) return;
    const cfg = WALLET_CFG[w.currency];
    const d = ensureDaily(w);
    const min = parseInt(activityForm.elements.minutes.value, 10);
    const a = ACTIVITIES[activityType.value];
    if (!a || !(min >= 5 && min <= 240)) { setW('earnPreview', '5–240 minutes'); return; }
    const pts = Math.min(Math.round(min * a.rate), Math.max(0, DAILY_POINTS_CAP - d.points));
    const cash = round2(Math.min(pts * cfg.cashPerPoint, Math.max(0, cfg.dailyCap - d.cash)));
    setW('earnPreview', pts || cash ? earnedText({ points: pts, cash }, w.currency) : 'Daily cap reached');
  }
  activityForm.addEventListener('input', () => { activityForm.elements.minutes.removeAttribute('aria-invalid'); updateEarnPreview(); });

  activityForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = currentUser();
    if (!u?.wallet) return;
    const f = activityForm.elements;
    const a = ACTIVITIES[f.type.value];
    const min = parseInt(f.minutes.value, 10);
    if (!a) return;
    if (!(min >= 5 && min <= 240)) { fieldError(activityForm, 'minutes', 'Enter between 5 and 240 minutes.'); return; }
    if (ensureDaily(u.wallet).logs >= 12) { fieldError(activityForm, 'minutes', 'You’ve logged 12 activities today — come back tomorrow!'); return; }
    setMsg($('.form-error', activityForm), '');
    let r = null;
    updateUser((x) => {
      const d = ensureDaily(x.wallet);
      d.logs += 1;
      x.wallet.workouts += 1;
      x.wallet.minutes += min;
      r = earn(x, { points: min * a.rate, desc: `${a.label} · ${min} min` });
      if (!r.points && !r.cash) addTx(x.wallet, { desc: `${a.label} · ${min} min (daily cap reached)` });
    });
    const cur = currentUser().wallet.currency;
    toast(r.points || r.cash ? `${a.label} logged: ${earnedText(r, cur)}` : `${a.label} logged — daily earning cap reached, earning resumes tomorrow.`, 'success');
    flushWalletToasts();
  });

  function claimTask(id) {
    const u = currentUser();
    const t = DAILY_TASKS.find((x) => x.id === id);
    if (!u?.wallet || !t || ensureDaily(u.wallet).tasks[id]) return;
    let r = null;
    updateUser((x) => {
      const d = ensureDaily(x.wallet);
      d.tasks[id] = Date.now();
      r = earn(x, { points: t.points, desc: `Daily task: ${t.title}` });
    });
    toast(`${t.title} complete: ${earnedText(r, currentUser().wallet.currency) || 'daily cap reached'}`, 'success');
    flushWalletToasts();
  }

  $('#dailyTasks').addEventListener('click', (e) => {
    const b = e.target.closest('[data-task]');
    if (!b || b.disabled) return;
    const t = DAILY_TASKS.find((x) => x.id === b.dataset.task);
    if (t.auto) { closeDialog(dlg.account); scrollToId('tools'); toast('Use any health tool — your task completes automatically.'); return; }
    if (t.timer) {
      if (breathing.timer) return;
      breathing.left = t.timer;
      const tick = () => {
        breathing.left -= 1;
        if (breathing.left <= 0) {
          clearInterval(breathing.timer);
          breathing.timer = null;
          claimTask(t.id);
          return;
        }
        if (dlg.account.open) renderWallet(currentUser());
      };
      breathing.timer = setInterval(tick, 1000);
      renderWallet(currentUser());
      toast('Breathe in for 4s, hold 4s, out for 6s…');
      return;
    }
    claimTask(t.id);
  });

  function renderHeaderWallet(u) {
    const btn = $('#walletBtn');
    if (!u?.wallet) return;
    const cashText = fmtMoney(u.wallet.cash, u.wallet.currency);
    if ($('#walletPillCash').textContent !== cashText && state.lastCash !== null) {
      btn.classList.remove('bump');
      void btn.offsetWidth;
      btn.classList.add('bump');
    }
    state.lastCash = cashText;
    $('#walletPillCash').textContent = cashText;
    $('#walletPillPoints').textContent = u.wallet.points.toLocaleString();
    btn.setAttribute('aria-label', `Open wallet: ${cashText} and ${u.wallet.points} points`);
  }
  $('#walletBtn').addEventListener('click', () => openAccount('wallet'));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-open-wallet]')) return;
    if (currentUser()) openAccount('wallet');
    else openAuth('signup', `Create a free account and get ${fmtMoney(WALLET_CFG[state.currency].welcome, state.currency)} in your BDAI Wallet.`);
  });

  function renderRewardsCopy() {
    const cfg = WALLET_CFG[state.currency];
    $$('[data-wcfg]').forEach((el) => {
      const k = el.dataset.wcfg;
      el.textContent = k === 'hundred' ? `100 points = ${fmtMoney(cfg.pointValue * 100, state.currency)}` : fmtMoney(cfg[k], state.currency);
    });
  }

  /* ---------------------------------------------------------
     Inbox
     --------------------------------------------------------- */
  const inboxState = { filter: 'all', query: '', openId: null };
  const inboxEl = $('#inbox');
  const mailList = $('#mailList');
  const mailView = $('#mailView');

  function filteredMail(u) {
    const q = inboxState.query.trim().toLowerCase();
    return (u.inbox || []).filter((m) => {
      if (inboxState.filter === 'unread' && m.read) return false;
      if (!['all', 'unread'].includes(inboxState.filter) && m.cat !== inboxState.filter) return false;
      if (!q) return true;
      const hay = [m.subject, SENDERS[m.from].name, ...m.paras, ...m.rows.flat()].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function renderInbox() {
    const u = currentUser();
    if (!u) return;
    const locked = !state.inboxUnlocked;
    $('#inboxLocked').hidden = !locked;
    $('#inboxContent').hidden = locked;
    $('#markAllRead').hidden = locked;
    if (locked) return;
    const mails = filteredMail(u);
    mailList.innerHTML = mails.length
      ? mails.map((m) => {
        const s = SENDERS[m.from];
        return `<li><button type="button" class="mail-item${m.read ? '' : ' is-unread'}${m.id === inboxState.openId ? ' is-active' : ''}" data-mail-id="${m.id}">
            <span class="mail-avatar cat-${s.cat}"><svg class="i"><use href="#i-${s.icon}"/></svg></span>
            <span class="mail-meta">
              <span class="mail-top"><strong>${escapeHtml(s.name)}</strong><time datetime="${new Date(m.t).toISOString()}">${escapeHtml(fmtMailTime(m.t))}</time></span>
              <span class="mail-subject">${escapeHtml(m.subject)}</span>
              <span class="mail-snippet">${escapeHtml(m.paras[0] || '')}</span>
            </span>
            ${m.read ? '' : '<span class="sr-only">Unread</span>'}
          </button></li>`;
      }).join('')
      : `<li class="empty">${inboxState.query || inboxState.filter !== 'all' ? 'No messages match.' : 'Your inbox is empty.'}</li>`;

    const open = (u.inbox || []).find((m) => m.id === inboxState.openId);
    inboxEl.classList.toggle('is-reading', !!open);
    if (!open) {
      mailView.innerHTML = `<div class="mail-empty"><div><svg class="i"><use href="#i-mail"/></svg>
        <p><strong>${unreadCount(u)} unread</strong><br>Select a message to read it.</p></div></div>`;
      return;
    }
    const s = SENDERS[open.from];
    mailView.innerHTML = `
      <div class="mail-toolbar">
        <button class="icon-btn mail-back" type="button" data-mail-act="back" aria-label="Back to inbox"><svg class="i"><use href="#i-arrow-left"/></svg></button>
        <span class="pill pill-cat">${escapeHtml(s.cat)}</span>
        <span class="spacer"></span>
        <button class="icon-btn" type="button" data-mail-act="unread" aria-label="Mark as unread" title="Mark as unread"><svg class="i"><use href="#i-mail-dot"/></svg></button>
        <button class="icon-btn" type="button" data-mail-act="delete" aria-label="Delete message" title="Delete"><svg class="i"><use href="#i-trash"/></svg></button>
      </div>
      <h3>${escapeHtml(open.subject)}</h3>
      <div class="mail-from">
        <span class="mail-avatar cat-${s.cat}"><svg class="i"><use href="#i-${s.icon}"/></svg></span>
        <div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.addr)}<br>to ${escapeHtml(u.email.split('@')[0])}<wbr>@${DOMAIN}</small></div>
        <time datetime="${new Date(open.t).toISOString()}">${escapeHtml(fmtDateTime(open.t))}</time>
      </div>
      <div class="mail-body">
        ${open.code ? `<div class="mail-code${open.code.exp < Date.now() ? ' is-expired' : ''}">
            <div><small>${open.code.exp < Date.now() ? 'Expired' : `Valid until ${escapeHtml(new Date(open.code.exp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))}`}</small><strong>${escapeHtml(open.code.value)}</strong></div>
            <button class="btn btn-primary btn-sm" type="button" data-copy-code="${escapeHtml(open.code.value)}"${open.code.exp < Date.now() ? ' disabled' : ''}><svg class="i"><use href="#i-copy"/></svg> Copy code</button>
          </div>` : ''}
        ${open.paras.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}

        ${open.rows.length ? `<dl class="mail-rows">${open.rows.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>` : ''}
        ${open.actions.length ? `<div class="mail-actions">${open.actions.map((a, i) => `<button class="btn ${i === 0 ? 'btn-primary' : 'btn-outline'} btn-sm" type="button" data-mail-action="${i}">${escapeHtml(a.label)}</button>`).join('')}</div>` : ''}
        <p class="mail-sign">— Sent by ${escapeHtml(s.name)} · BDAI Sports &amp; Health, powered by BDAIWellness</p>
      </div>`;
  }

  function setMailRead(id, read) {
    updateUserSilently((u) => {
      const m = (u.inbox || []).find((x) => x.id === id);
      if (m) m.read = read;
    });
    renderBadges();
  }

  mailList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mail-id]');
    if (!b) return;
    inboxState.openId = b.dataset.mailId;
    setMailRead(inboxState.openId, true);
    renderInbox();
    if (inboxEl.classList.contains('is-reading')) mailView.focus?.();
  });
  mailList.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const items = $$('[data-mail-id]', mailList);
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    items[clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, items.length - 1)].focus();
  });

  mailView.addEventListener('click', (e) => {
    const u = currentUser();
    const open = (u?.inbox || []).find((m) => m.id === inboxState.openId);
    const act = e.target.closest('[data-mail-act]')?.dataset.mailAct;
    if (act === 'back') {
      inboxState.openId = null;
      renderInbox();
      return;
    }
    if (act === 'unread' && open) {
      setMailRead(open.id, false);
      inboxState.openId = null;
      renderInbox();
      toast('Marked as unread.');
      return;
    }
    if (act === 'delete' && open) {
      updateUserSilently((x) => { x.inbox = (x.inbox || []).filter((m) => m.id !== open.id); });
      inboxState.openId = null;
      renderBadges();
      renderInbox();
      toast('Message deleted.');
      return;
    }
    const cb = e.target.closest('[data-copy-code]');
    if (cb) {
      const code = cb.dataset.copyCode;
      copyText(code).then((ok) => {
        toast(ok ? 'Code copied — paste it in the “Get a new security key” window.' : 'Copy failed — type the code instead.', ok ? 'success' : 'error');
      });
      lastCopiedCode = code;
      return;
    }
    const ab = e.target.closest('[data-mail-action]');
    if (ab && open) {
      const a = open.actions[+ab.dataset.mailAction];
      if (!a) return;
      if (a.invoice) downloadInvoice(a.invoice);
      else if (a.tab) switchAccountTab(a.tab);
      else if (a.href) { closeDialog(dlg.account); scrollToId(a.href.slice(1)); }
    }
  });

  $$('[data-mail-filter]', dlg.account).forEach((chip) => chip.addEventListener('click', () => {
    inboxState.filter = chip.dataset.mailFilter;
    $$('[data-mail-filter]', dlg.account).forEach((c) => {
      const on = c === chip;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
    });
    renderInbox();
  }));
  $('#inboxSearch').addEventListener('input', (e) => { inboxState.query = e.target.value; renderInbox(); });
  $('#markAllRead').addEventListener('click', () => {
    const u = currentUser();
    if (!u || !unreadCount(u)) { toast('No unread messages.'); return; }
    updateUserSilently((x) => (x.inbox || []).forEach((m) => { m.read = true; }));
    renderBadges();
    renderInbox();
    toast('All messages marked as read.', 'success');
  });

  function renderBadges() {
    const u = currentUser();
    const n = unreadCount(u);
    const badge = $('#inboxBadge');
    const btn = $('#inboxBtn');
    badge.hidden = n === 0;
    badge.textContent = n > 99 ? '99+' : String(n);
    btn.setAttribute('aria-label', n ? `Open inbox, ${n} unread` : 'Open inbox');
    accEl('unread').forEach((el) => { el.hidden = n === 0; el.textContent = String(n); });
    if (u && n > state.lastUnread) {
      btn.classList.remove('ping');
      void btn.offsetWidth;
      btn.classList.add('ping');
    }
    state.lastUnread = n;
  }

  /* ---------------------------------------------------------
     Programs
     --------------------------------------------------------- */
  function renderPrograms() {
    const u = currentUser();
    const tier = userTier(u);
    const started = new Set(u?.programs || []);
    $$('.program-card').forEach((card) => {
      const need = +card.dataset.tier;
      const btn = $('[data-start-program]', card);
      const badge = $('[data-badge]', card);
      const locked = need > tier;
      const name = btn.dataset.startProgram;
      card.classList.toggle('is-locked', locked);
      card.classList.toggle('is-started', started.has(name));
      badge.innerHTML = need === 0 ? 'Free' : `${locked ? '<svg class="i"><use href="#i-lock"/></svg>' : ''}${PLANS[TIER_PLAN[need]].name}`;
      if (started.has(name)) btn.textContent = '✓ In your plan';
      else if (locked) btn.textContent = `Unlock with ${PLANS[TIER_PLAN[need]].name}`;
      else btn.textContent = 'Start program';
    });
  }

  function startProgram(name, need) {
    const u = currentUser();
    if (!u) {
      state.pending = () => startProgram(name, need);
      openAuth('signup', `Create a free account to start “${name}”.`);
      return;
    }
    if (need > userTier(u)) {
      const plan = TIER_PLAN[need];
      toast(`“${name}” is included with BDAI ${PLANS[plan].name}.`);
      openCheckout(plan);
      return;
    }
    if ((u.programs || []).includes(name)) {
      toast(`“${name}” is already in your training plan.`);
      return;
    }
    const start = new Date();
    start.setDate(start.getDate() + 1);
    let reward = null;
    updateUser((x) => {
      x.programs = [...(x.programs || []), name];
      logActivity(x, `Started program: ${name}`);
      reward = earn(x, { points: 50, desc: `Started program: ${name}` });
      sendMail(x, 'coach', `You’re in: ${name}`, {
        paras: [
          `Great choice, ${x.first}! “${name}” starts tomorrow and is now part of your daily plan.`,
          'Each session adapts to your readiness score — on low-recovery days we’ll swap intensity for technique or mobility work.',
        ],
        rows: [['Starts', fmtDate(start.getTime())], ['Week 1', 'Easy intro sessions + baseline test'], ['Check-in', 'End of week 1 with your AI coach']],
        actions: [{ label: 'Browse more programs', href: '#programs' }],
      });
    });
    const rt = earnedText(reward, currentUser().wallet.currency);
    toast(`“${name}” added to your plan${rt ? ` (${rt})` : ''}. Your coach sent details to your inbox.`, 'success');
    flushWalletToasts();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-start-program]');
    if (!b) return;
    startProgram(b.dataset.startProgram, +b.closest('.program-card').dataset.tier);
  });

  $$('.chip[data-filter]').forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    $$('.chip[data-filter]').forEach((c) => {
      const on = c === chip;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
    });
    $$('.program-card').forEach((card) => {
      const show = f === 'all' || card.dataset.cat === f;
      card.classList.toggle('is-hidden', !show);
      if (show) card.classList.add('is-visible');
    });
  }));

  /* ---------------------------------------------------------
     Global render
     --------------------------------------------------------- */
  function renderAll() {
    const u = currentUser();
    PinPad.shuffle = !!u?.settings?.shuffle;
    // Signed in: prices follow the wallet's currency.
    if (u?.wallet) {
      state.currency = u.wallet.currency;
      currencySelect.disabled = true;
      currencySelect.title = 'Prices are shown in your wallet currency';
    } else {
      state.currency = local.get(KEYS.currency, 'INR') === 'USD' ? 'USD' : 'INR';
      currencySelect.disabled = false;
      currencySelect.title = '';
    }
    currencySelect.value = state.currency;
    renderHeaderWallet(u);
    renderRewardsCopy();
    $$('[data-guest]').forEach((el) => { el.hidden = !!u; });
    $$('[data-member]').forEach((el) => { el.hidden = !u; });
    $('#lockNowBtn').hidden = !u?.pin;
    if (u) {
      const planKey = u.sub?.status === 'active' ? u.sub.plan : 'starter';
      $('#chipAvatar').textContent = initials(fullName(u));
      $('#chipName').textContent = u.first;
      $('#chipPlan').textContent = `${PLANS[planKey].name} plan`;
    }
    renderBadges();
    renderPricing();
    renderPrograms();
    if (dlg.account.open) renderAccount();
  }

  /* ---------------------------------------------------------
     Health tools
     --------------------------------------------------------- */
  const tabs = $$('.tabs [role="tab"]');
  function selectTab(tab, focus = false) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(`#${t.getAttribute('aria-controls')}`).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      let n = -1;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      if (n >= 0) { e.preventDefault(); selectTab(tabs[n], true); }
    });
  });

  const out = (form, key) => $(`[data-out="${key}"]`, form);
  function numbers(form, names) {
    const vals = {};
    let ok = true;
    names.forEach((n) => {
      const input = form.elements[n];
      const v = parseFloat(input.value);
      const bad = Number.isNaN(v) || (input.min !== '' && v < +input.min) || (input.max !== '' && v > +input.max);
      input.setAttribute('aria-invalid', String(bad));
      if (bad) ok = false;
      vals[n] = v;
    });
    return ok ? vals : null;
  }

  const tools = {
    bmi(form) {
      const v = numbers(form, ['height', 'weight']);
      if (!v) { out(form, 'bmiCat').textContent = 'Please enter a valid height and weight.'; out(form, 'bmiCat').dataset.tone = 'bad'; return; }
      const bmi = v.weight / (v.height / 100) ** 2;
      let cat; let tone;
      if (bmi < 18.5) { cat = 'Underweight'; tone = 'warn'; } else if (bmi < 25) { cat = 'Healthy weight'; tone = 'ok'; } else if (bmi < 30) { cat = 'Overweight'; tone = 'warn'; } else { cat = 'Obesity range'; tone = 'bad'; }
      out(form, 'bmi').textContent = bmi.toFixed(1);
      out(form, 'bmiCat').textContent = cat;
      out(form, 'bmiCat').dataset.tone = tone;
      out(form, 'bmiMarker').style.left = `${clamp((bmi - 16) / 24 * 100, 0, 100)}%`;
      const lo = 18.5 * (v.height / 100) ** 2;
      const hi = 24.9 * (v.height / 100) ** 2;
      out(form, 'bmiNote').textContent = `Healthy weight range for ${v.height} cm: ${lo.toFixed(1)}–${hi.toFixed(1)} kg. BMI doesn’t account for muscle mass — athletes may score higher.`;
    },
    hr(form) {
      const v = numbers(form, ['age', 'rest']);
      if (!v) return;
      const max = Math.round(208 - 0.7 * v.age); // Tanaka formula
      const reserve = max - v.rest;
      const zones = [
        { n: 1, name: 'Recovery', lo: 0.5, hi: 0.6, c: '#22c3ee' },
        { n: 2, name: 'Endurance', lo: 0.6, hi: 0.7, c: '#3ef0a8' },
        { n: 3, name: 'Tempo', lo: 0.7, hi: 0.8, c: '#ffc24b' },
        { n: 4, name: 'Threshold', lo: 0.8, hi: 0.9, c: '#ff8a4a' },
        { n: 5, name: 'VO₂ max', lo: 0.9, hi: 1.0, c: '#ff5370' },
      ];
      out(form, 'maxHr').textContent = String(max);
      out(form, 'zones').innerHTML = zones.map((z, i) => {
        const a = Math.round(v.rest + reserve * z.lo);
        const b = Math.round(v.rest + reserve * z.hi);
        return `<li>
          <span class="z-num" style="background:${z.c}">Z${z.n}</span>
          <div class="z-info"><strong>${z.name}</strong><div class="z-bar"><i style="width:${z.hi * 100}%;background:${z.c};animation-delay:${i * 0.08}s"></i></div></div>
          <span class="z-bpm">${a}–${b}</span>
        </li>`;
      }).join('');
    },
    cal(form) {
      const v = numbers(form, ['age', 'height', 'weight']);
      if (!v) return;
      const male = form.elements.sex.value === 'male';
      const bmr = 10 * v.weight + 6.25 * v.height - 5 * v.age + (male ? 5 : -161); // Mifflin-St Jeor
      const tdee = bmr * +form.elements.activity.value;
      const target = Math.max(Math.round(bmr * 1.05), Math.round(tdee + +form.elements.goal.value));
      const protein = Math.round(v.weight * 1.8);
      const fat = Math.round(target * 0.25 / 9);
      const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));
      out(form, 'kcal').textContent = target.toLocaleString();
      out(form, 'calNote').textContent = `BMR ${Math.round(bmr).toLocaleString()} kcal · maintenance ${Math.round(tdee).toLocaleString()} kcal per day.`;
      const rows = [
        { name: 'Protein', g: protein, kcal: protein * 4, c: '#3ef0a8' },
        { name: 'Carbohydrates', g: carbs, kcal: carbs * 4, c: '#22c3ee' },
        { name: 'Fat', g: fat, kcal: fat * 9, c: '#ffc24b' },
      ];
      out(form, 'macros').innerHTML = rows.map((r, i) => `
        <div class="macro-row">
          <header><span>${r.name}</span><strong>${r.g} g <small class="muted">· ${Math.round(r.kcal / target * 100)}%</small></strong></header>
          <div class="macro-bar"><i style="width:${clamp(r.kcal / target * 100, 0, 100)}%;background:${r.c};animation-delay:${i * 0.1}s"></i></div>
        </div>`).join('');
    },
    water(form) {
      const v = numbers(form, ['weight', 'minutes']);
      if (!v) return;
      const ml = v.weight * 35 + v.minutes * 12 + +form.elements.climate.value;
      const glasses = Math.ceil(ml / 250);
      out(form, 'liters').textContent = (ml / 1000).toFixed(1);
      out(form, 'glasses').innerHTML = Array.from({ length: Math.min(glasses, 24) }, (_, i) => `<span class="glass-ico" style="animation-delay:${i * 0.03}s"></span>`).join('');
      out(form, 'waterNote').textContent = `≈ ${glasses} glasses of 250 ml. Sip 400–600 ml in the 2 hours before training and ~150–250 ml every 15–20 minutes during long sessions.`;
    },
  };
  $$('form[data-tool]').forEach((form) => {
    const used = () => { if (currentUser() && !state.locked) claimTask('tool'); };
    form.addEventListener('submit', (e) => { e.preventDefault(); tools[form.dataset.tool](form); used(); });
    form.addEventListener('change', () => { tools[form.dataset.tool](form); used(); });
    tools[form.dataset.tool](form);
  });

  /* ---------------------------------------------------------
     Page chrome: theme, header, nav, reveal, counters, hero
     --------------------------------------------------------- */
  const storedTheme = local.get(KEYS.theme, null);
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#f5f8fb' : '#070b10');
    $('#themeToggle').setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }
  applyTheme(storedTheme || (prefersLight ? 'light' : 'dark'));
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    local.set(KEYS.theme, next);
  });

  const header = $('#siteHeader');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $('#navLinks');
  const menuBtn = $('#menuBtn');
  function closeMobileNav() {
    navLinks.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
  }
  menuBtn.addEventListener('click', () => {
    const open = !navLinks.classList.contains('is-open');
    navLinks.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) closeMobileNav(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileNav(); });
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('is-open') && !e.target.closest('#navLinks, #menuBtn')) closeMobileNav();
  });

  if ('IntersectionObserver' in window) {
    const links = $$('#navLinks a');
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${en.target.id}`)));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) navObs.observe(s); });
  }

  const revealEls = $$('.reveal');
  revealEls.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    const idx = siblings.indexOf(el);
    if (siblings.length > 1) el.style.setProperty('--d', `${Math.min(idx, 6) * 0.07}s`);
  });
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); revObs.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => revObs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  $$('.feature-card').forEach((card) => card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = +(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reducedMotion) { el.textContent = fmt(target); return; }
    const dur = 1600;
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    const cObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { countUp(en.target); cObs.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => cObs.observe(c));
  } else counters.forEach(countUp);

  $('#dashDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  setTimeout(() => $('#rings').classList.add('is-drawn'), 350);

  const hr = { values: Array.from({ length: 40 }, (_, i) => 72 + Math.sin(i / 3) * 4 + (Math.random() - 0.5) * 3) };
  function drawSpark() {
    const n = hr.values.length;
    const pts = hr.values.map((v, i) => [i * (300 / (n - 1)), 58 - ((clamp(v, 55, 100) - 55) / 45) * 54]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    $('#sparkLine').setAttribute('d', d);
    $('#sparkArea').setAttribute('d', `${d} L300,60 L0,60 Z`);
    $('#bpm').textContent = String(Math.round(hr.values[n - 1]));
  }
  drawSpark();
  if (!reducedMotion) {
    setInterval(() => {
      if (document.hidden) return;
      const last = hr.values[hr.values.length - 1];
      const drift = (74 - last) * 0.15 + (Math.random() - 0.5) * 5;
      hr.values.push(clamp(last + drift, 60, 96));
      hr.values.shift();
      drawSpark();
    }, 1100);
  }

  $('#year').textContent = String(new Date().getFullYear());

  /* ---------------------------------------------------------
     Boot: restore session (accounts start locked behind the PIN)
     --------------------------------------------------------- */
  const saved = loadSession();
  if (saved && db.get(saved.email)) {
    state.email = saved.email;
    updateUserSilently((u) => { ensureWallet(u); });
    syncSubscription();
    state.lastUnread = unreadCount(currentUser());
    renderAll();
    if (currentUser()?.pin) lock({ quiet: true });
  } else {
    if (saved) clearSession();
    renderAll();
  }

  if (!hasSubtle) {
    console.warn('[BDAI] Web Crypto is unavailable (open the page over https:// or http://localhost). Using a weaker demo hash.');
  }
})();
