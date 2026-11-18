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
    // Internal plan for the BDAI team (founder/admin): complimentary, not sold on the pricing page.
    team: { name: 'BDAI Team', tier: 3, internal: true, price: { INR: { monthly: 0, yearly: 0 }, USD: { monthly: 0, yearly: 0 } } },
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
  // Founder / admin account(s): get a one-time Wellness Points bonus.
  const ADMIN_EMAILS = ['bhavyam.roy@wellness.inbox.bdai'];
  // Founder bonus: BDAI Cash (₹15,000; scaled for USD wallets like the welcome bonus) + Wellness Points.
  const FOUNDER_BONUS_CASH = { INR: 15000, USD: 225 };
  const FOUNDER_BONUS_POINTS = 4500;
  const FOUNDER_V1_POINTS = 15000; // earlier version paid the whole bonus as points
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
    progressReset: 'bdai6.progressReset.v1',
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

  /* ---------- Founder / admin account ---------- */
  function isAdmin(user) {
    return !!user && ADMIN_EMAILS.includes(String(user.email).toLowerCase());
  }
  /**
   * One-time founder bonus for the admin account: BDAI Cash + Wellness Points.
   * Granted the first time the account is used on this device (sign-up, sign-in
   * or opening the site) and again after a progress reset. Accounts that got the
   * earlier all-points bonus are corrected once. Returns true if anything changed.
   */
  function ensureFounder(user) {
    if (!isAdmin(user) || !user.wallet || user.founderBonusV === 2) return false;
    const w = user.wallet;
    const cash = FOUNDER_BONUS_CASH[w.currency];
    const cashText = fmtMoney(cash, w.currency);
    const ptsText = fmtPts(FOUNDER_BONUS_POINTS);
    const corrected = !!user.founderBonusAt; // had the old 15,000-point bonus
    if (corrected) {
      const take = Math.min(w.points, FOUNDER_V1_POINTS - FOUNDER_BONUS_POINTS);
      w.points -= take;
      w.cash = round2(w.cash + cash);
      addTx(w, { cash, points: -take, desc: 'Founder bonus updated: points → cash', kind: 'bonus' });
    } else {
      w.cash = round2(w.cash + cash);
      w.points += FOUNDER_BONUS_POINTS;
      addTx(w, { cash, points: FOUNDER_BONUS_POINTS, desc: 'Founder bonus (admin account)', kind: 'bonus' });
    }
    user.founderBonusAt = Date.now();
    user.founderBonusV = 2;
    logActivity(user, `Founder bonus${corrected ? ' updated' : ''}: ${cashText} + ${ptsText}`);
    sendMail(user, 'wallet', `Founder bonus: ${cashText} + ${ptsText}`, {
      paras: [
        corrected
          ? `Hi ${user.first}, your founder bonus has been updated: it is now ${cashText} of BDAI Cash plus ${ptsText}, instead of 15,000 points.`
          : `Welcome back, ${user.first}! As the founder of BDAI Sports & Health, your admin account has received ${cashText} of BDAI Cash and ${ptsText}.`,
        'Use the cash to pay for subscriptions and renewals; points take up to 50% off any plan’s price.',
      ],
      rows: [['Cash bonus', cashText], ['Points bonus', ptsText], ['Cash balance', fmtMoney(w.cash, w.currency)], ['Points balance', fmtPts(w.points)], ['Account', `${user.email} · Founder / Admin`]],
      actions: [{ label: 'Open wallet', tab: 'wallet' }],
    });
    walletToasts.push(`👑 Founder bonus${corrected ? ' updated' : ''}: ${cashText} + ${ptsText} in your wallet`);
    return true;
  }

  /**
   * The founder/admin account is always on the complimentary BDAI Team
   * subscription: every feature and program, never billed, never expires.
   * Returns true if the subscription was (re)applied now.
   */
  function ensureTeamSub(user) {
    if (!isAdmin(user) || !user.wallet) return false;
    if (user.sub && user.sub.plan === 'team' && user.sub.status === 'active') return false;
    const prev = user.sub && user.sub.status === 'active' ? PLANS[user.sub.plan]?.name : '';
    user.sub = {
      plan: 'team', cycle: 'lifetime', currency: user.wallet.currency, amount: 0,
      status: 'active', startedAt: Date.now(), renewsAt: null,
      cancelAtPeriodEnd: false, complimentary: true, method: { type: 'complimentary' },
    };
    logActivity(user, 'BDAI Team subscription activated');
    sendMail(user, 'billing', 'You’re on the BDAI Team subscription', {
      paras: [
        `Hi ${user.first}, your founder/admin account is subscribed to the BDAI Team subscription.`,
        'It includes everything in Starter, Pro and Elite — every program and feature — at no cost. It is never billed to your wallet and never expires.',
        prev ? `It replaces your previous ${prev} plan; nothing more will be charged for it.` : 'Your wallet cash and points stay yours to use however you like.',
      ],
      rows: [['Plan', 'BDAI Team'], ['Price', 'Complimentary'], ['Renews', 'Never — included for the BDAI team'], ['Account', `${user.email} · Founder / Admin`]],
      actions: [{ label: 'View subscription', tab: 'subscription' }],
    });
    walletToasts.push('🏆 You’re on the BDAI Team subscription — everything unlocked.');
    return true;
  }
  /** All admin perks: founder bonus + BDAI Team subscription. */
  function ensureAdminPerks(user) {
    const a = ensureFounder(user);
    const b = ensureTeamSub(user);
    return a || b;
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

  /**
   * Start a user's progress over: fresh wallet at the starting balance, no points,
   * activities, milestones, daily tasks, transactions or started programs.
   * Account, PIN, security key, inbox, subscription and invoices are kept.
   */
  function resetProgress(user, reason) {
    const currency = user.wallet?.currency || state.currency;
    const cfg = WALLET_CFG[currency];
    user.wallet = newWallet(currency);
    user.wallet.cash = cfg.welcome;
    addTx(user.wallet, { cash: cfg.welcome, desc: 'Starting balance (progress reset)', kind: 'bonus' });
    user.programs = [];
    delete user.founderBonusAt;
    delete user.founderBonusV;
    logActivity(user, `Progress reset (${reason})`);
    sendMail(user, 'wallet', 'Your progress has been reset', {
      paras: [
        `Hi ${user.first}, your BDAI progress was reset${reason === 'update' ? ' as part of this update' : ''} — you’re starting fresh.`,
        `Your wallet is back to ${fmtMoney(cfg.welcome, currency)} with 0 points, and activities, milestones, daily tasks and programs have been cleared.`,
        'Your account, PIN, security key, inbox and any active subscription are unchanged.',
      ],
      rows: [['BDAI Cash', fmtMoney(cfg.welcome, currency)], ['Wellness Points', '0'], ['Reset on', fmtDateTime(Date.now())]],
      actions: [{ label: 'Open wallet', tab: 'wallet' }],
    });
    ensureFounder(user);
  }

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
    ensureAdminPerks(user);
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
    flushWalletToasts();
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
      ensureAdminPerks(u);
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
    flushWalletToasts();
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
    flushWalletToasts();
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
    if (!u || !u.sub || u.sub.complimentary) return;
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
    if (u.sub?.complimentary) {
      toast(`Your ${PLANS[u.sub.plan].name} subscription already includes ${PLANS[plan].name} — nothing to buy.`);
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
    Object.entries(PLANS).filter(([, plan]) => !plan.internal).forEach(([key, plan]) => {
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
      } else if (u.sub?.complimentary) {
        btn.textContent = `Included in ${PLANS[u.sub.plan].name}`;
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
      if (u.sub?.complimentary) { openAccount('subscription'); toast(`You’re on ${PLANS[u.sub.plan].name}, which already includes everything.`); return; }
      if (userTier(u) > 0) { openAccount('subscription'); toast('To move to Starter, cancel your paid plan — you keep access until the period ends.'); return; }
      toast('You’re on Starter. Explore the free programs below!');
      scrollToId('programs');
      return;
    }
    if (u?.sub?.complimentary || (u?.sub?.status === 'active' && u.sub.plan === plan && u.sub.cycle === state.billing)) {
      if (u.sub.complimentary) toast(`${PLANS[plan].name} is already included in your ${PLANS[u.sub.plan].name} subscription.`);
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
    accEl('adminBadge').forEach((el) => { el.hidden = !isAdmin(u); });
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
    if (u.sub?.complimentary) {
      const s = u.sub;
      subView.innerHTML = `
        <div class="sub-card" data-plan="${escapeHtml(s.plan)}">
          <div class="sub-top">
            <div><small>Current subscription</small><h3>${escapeHtml(PLANS[s.plan].name)} <span class="pill ok">Active</span> <span class="pill team-pill">Complimentary</span></h3></div>
            <div class="sub-price">${escapeHtml(fmtMoney(0, s.currency))}<small>/forever</small></div>
          </div>
          <dl class="sub-meta">
            <div><dt>Includes</dt><dd>Everything in Starter, Pro &amp; Elite</dd></div>
            <div><dt>Renews</dt><dd>Never — no charges</dd></div>
            <div><dt>Since</dt><dd>${escapeHtml(fmtDate(s.startedAt))}</dd></div>
          </dl>
          <p class="muted small" style="margin:0">Included for the BDAI team (founder / admin account). Your wallet is never charged for it.</p>
        </div>`;
      $('#invoiceView').innerHTML = (u.invoices || []).length ? $('#invoiceView').innerHTML : '<p class="empty">No invoices — the BDAI Team subscription is complimentary.</p>';
      return;
    }
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
    setW('welcomeAmt', fmtMoney(cfg.welcome, cur));
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
  $('#resetProgressBtn').addEventListener('click', async () => {
    const u = currentUser();
    if (!u?.wallet) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Reset all your progress? Points, activities, milestones, daily tasks, transactions and programs will be cleared. This cannot be undone.')) return;
    const ok = await pinPrompt({ title: 'Reset progress', sub: 'Enter your PIN to start your progress over.', danger: true });
    if (!ok) return;
    updateUser((x) => resetProgress(x, 'manual'));
    toast('Progress reset — you’re starting fresh.', 'success');
    flushWalletToasts();
  });
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
      $('#chipPlan').textContent = `${isAdmin(u) ? 'Founder · ' : ''}${PLANS[planKey].name} plan`;
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

  // CDC 2000 BMI-for-age LMS (ages 24–240.5 months) and WHO Child Growth Standards
  // BMI-for-age LMS (0–24 months). Flattened as [ageMonths, L, M, S, ...]; sex 1 = male, 2 = female.
  const CDC_BMI_LMS = {
    1: [24,-2.01118,16.575,0.08059,24.5,-1.98237,16.5478,0.08013,25.5,-1.9241,16.4944,0.07923,26.5,-1.8655,16.4426,0.07839,27.5,-1.80726,16.3922,0.07759,28.5,-1.75012,16.3433,0.07685,29.5,-1.69482,16.2958,0.07615,30.5,-1.64211,16.2497,0.0755,31.5,-1.59274,16.205,0.0749,32.5,-1.54744,16.1615,0.07435,33.5,-1.5069,16.1193,0.07385,34.5,-1.47177,16.0784,0.07339,35.5,-1.44263,16.0388,0.07299,36.5,-1.41999,16.0003,0.07263,37.5,-1.40428,15.963,0.07233,38.5,-1.39586,15.927,0.07207,39.5,-1.39494,15.892,0.07186,40.5,-1.40167,15.8582,0.07169,41.5,-1.4161,15.8256,0.07157,42.5,-1.43816,15.7941,0.0715,43.5,-1.46767,15.7636,0.07146,44.5,-1.50438,15.7343,0.07147,45.5,-1.54794,15.7061,0.07152,46.5,-1.5979,15.679,0.07161,47.5,-1.65373,15.6531,0.07173,48.5,-1.71487,15.6282,0.07189,49.5,-1.78067,15.6044,0.07208,50.5,-1.85047,15.5818,0.07231,51.5,-1.92355,15.5603,0.07256,52.5,-1.99922,15.5399,0.07284,53.5,-2.07671,15.5206,0.07315,54.5,-2.15535,15.5026,0.07349,55.5,-2.23444,15.4857,0.07385,56.5,-2.31332,15.47,0.07424,57.5,-2.39138,15.4555,0.07464,58.5,-2.46803,15.4421,0.07507,59.5,-2.54278,15.43,0.07552,60.5,-2.61517,15.4191,0.07599,61.5,-2.68479,15.4095,0.07648,62.5,-2.75132,15.401,0.07699,63.5,-2.81446,15.3938,0.07752,64.5,-2.87402,15.3878,0.07807,65.5,-2.92984,15.3831,0.07863,66.5,-2.9818,15.3795,0.07921,67.5,-3.02983,15.3772,0.07981,68.5,-3.07392,15.3761,0.08043,69.5,-3.11409,15.3762,0.08106,70.5,-3.15039,15.3775,0.08171,71.5,-3.18289,15.3799,0.08237,72.5,-3.21171,15.3835,0.08305,73.5,-3.23695,15.3883,0.08374,74.5,-3.25876,15.3942,0.08445,75.5,-3.27728,15.4013,0.08517,76.5,-3.29268,15.4094,0.0859,77.5,-3.30512,15.4187,0.08664,78.5,-3.31477,15.429,0.0874,79.5,-3.32179,15.4404,0.08817,80.5,-3.32635,15.4529,0.08894,81.5,-3.3286,15.4664,0.08973,82.5,-3.32873,15.4809,0.09052,83.5,-3.32687,15.4964,0.09132,84.5,-3.32319,15.5129,0.09213,85.5,-3.31783,15.5303,0.09295,86.5,-3.31092,15.5488,0.09377,87.5,-3.30261,15.5681,0.09459,88.5,-3.29302,15.5884,0.09542,89.5,-3.28226,15.6096,0.09625,90.5,-3.27045,15.6317,0.09708,91.5,-3.2577,15.6547,0.09792,92.5,-3.24411,15.6785,0.09875,93.5,-3.22976,15.7032,0.09959,94.5,-3.21475,15.7288,0.10042,95.5,-3.19916,15.7551,0.10126,96.5,-3.18306,15.7823,0.10209,97.5,-3.16652,15.8103,0.10292,98.5,-3.14961,15.839,0.10375,99.5,-3.13239,15.8686,0.10457,100.5,-3.11491,15.8989,0.10539,101.5,-3.09723,15.9299,0.1062,102.5,-3.07938,15.9617,0.10701,103.5,-3.06142,15.9942,0.10782,104.5,-3.04339,16.0274,0.10861,105.5,-3.02531,16.0613,0.1094,106.5,-3.00723,16.0959,0.11018,107.5,-2.98916,16.1312,0.11096,108.5,-2.97115,16.1671,0.11172,109.5,-2.95321,16.2037,0.11248,110.5,-2.93536,16.2409,0.11322,111.5,-2.91764,16.2788,0.11396,112.5,-2.90004,16.3173,0.11469,113.5,-2.88259,16.3564,0.11541,114.5,-2.86531,16.3961,0.11611,115.5,-2.8482,16.4363,0.11681,116.5,-2.83129,16.4772,0.11749,117.5,-2.81456,16.5186,0.11817,118.5,-2.79804,16.5606,0.11883,119.5,-2.78174,16.6031,0.11948,120.5,-2.76565,16.6461,0.12011,121.5,-2.74978,16.6897,0.12074,122.5,-2.73414,16.7338,0.12135,123.5,-2.71873,16.7784,0.12195,124.5,-2.70356,16.8235,0.12253,125.5,-2.68861,16.8691,0.1231,126.5,-2.6739,16.9151,0.12366,127.5,-2.65943,16.9616,0.12421,128.5,-2.64519,17.0086,0.12474,129.5,-2.63119,17.056,0.12526,130.5,-2.61741,17.1039,0.12577,131.5,-2.60387,17.1522,0.12626,132.5,-2.59056,17.2009,0.12673,133.5,-2.57747,17.25,0.1272,134.5,-2.56461,17.2995,0.12765,135.5,-2.55197,17.3494,0.12808,136.5,-2.53954,17.3997,0.12851,137.5,-2.52733,17.4504,0.12891,138.5,-2.51532,17.5014,0.12931,139.5,-2.50352,17.5528,0.12969,140.5,-2.49192,17.6045,0.13006,141.5,-2.48051,17.6565,0.13041,142.5,-2.4693,17.7089,0.13075,143.5,-2.45827,17.7616,0.13108,144.5,-2.44743,17.8146,0.13139,145.5,-2.43676,17.8679,0.13169,146.5,-2.42626,17.9216,0.13197,147.5,-2.41592,17.9754,0.13225,148.5,-2.40575,18.0296,0.13251,149.5,-2.39573,18.084,0.13276,150.5,-2.38586,18.1387,0.13299,151.5,-2.37613,18.1937,0.13321,152.5,-2.36654,18.2488,0.13342,153.5,-2.35709,18.3043,0.13362,154.5,-2.34776,18.3599,0.13381,155.5,-2.33855,18.4157,0.13398,156.5,-2.32946,18.4718,0.13414,157.5,-2.32047,18.5281,0.13429,158.5,-2.3116,18.5845,0.13443,159.5,-2.30282,18.6411,0.13456,160.5,-2.29413,18.6979,0.13468,161.5,-2.28553,18.7549,0.13478,162.5,-2.27702,18.812,0.13488,163.5,-2.26858,18.8693,0.13497,164.5,-2.26021,18.9267,0.13504,165.5,-2.25191,18.9842,0.13511,166.5,-2.24367,19.0419,0.13516,167.5,-2.23549,19.0997,0.13521,168.5,-2.22736,19.1576,0.13525,169.5,-2.21928,19.2156,0.13528,170.5,-2.21124,19.2737,0.1353,171.5,-2.20324,19.3318,0.13532,172.5,-2.19527,19.3901,0.13532,173.5,-2.18734,19.4484,0.13532,174.5,-2.17943,19.5067,0.13531,175.5,-2.17154,19.5651,0.13529,176.5,-2.16367,19.6236,0.13527,177.5,-2.15582,19.6821,0.13524,178.5,-2.14799,19.7406,0.1352,179.5,-2.14016,19.7991,0.13516,180.5,-2.13234,19.8577,0.13511,181.5,-2.12454,19.9162,0.13506,182.5,-2.11674,19.9747,0.135,183.5,-2.10894,20.0332,0.13493,184.5,-2.10115,20.0917,0.13487,185.5,-2.09336,20.1502,0.13479,186.5,-2.08557,20.2086,0.13472,187.5,-2.07779,20.2669,0.13464,188.5,-2.07002,20.3252,0.13456,189.5,-2.06225,20.3835,0.13447,190.5,-2.0545,20.4416,0.13438,191.5,-2.04675,20.4997,0.13429,192.5,-2.03902,20.5576,0.1342,193.5,-2.0313,20.6155,0.1341,194.5,-2.02361,20.6733,0.13401,195.5,-2.01594,20.7309,0.13391,196.5,-2.00831,20.7884,0.13381,197.5,-2.00071,20.8457,0.13372,198.5,-1.99315,20.9029,0.13362,199.5,-1.98564,20.96,0.13352,200.5,-1.97819,21.0169,0.13343,201.5,-1.97081,21.0736,0.13333,202.5,-1.9635,21.1301,0.13324,203.5,-1.95627,21.1864,0.13315,204.5,-1.94913,21.2425,0.13306,205.5,-1.9421,21.2984,0.13297,206.5,-1.93518,21.354,0.13289,207.5,-1.92838,21.4094,0.1328,208.5,-1.92171,21.4646,0.13273,209.5,-1.91519,21.5195,0.13265,210.5,-1.90883,21.5742,0.13258,211.5,-1.90264,21.6285,0.13252,212.5,-1.89663,21.6826,0.13246,213.5,-1.89082,21.7364,0.13241,214.5,-1.88521,21.7899,0.13236,215.5,-1.87982,21.843,0.13232,216.5,-1.87467,21.8959,0.13229,217.5,-1.86976,21.9484,0.13226,218.5,-1.86511,22.0005,0.13224,219.5,-1.86073,22.0523,0.13223,220.5,-1.85663,22.1037,0.13223,221.5,-1.85283,22.1548,0.13223,222.5,-1.84932,22.2054,0.13225,223.5,-1.84613,22.2557,0.13227,224.5,-1.84326,22.3055,0.13231,225.5,-1.84072,22.355,0.13236,226.5,-1.83852,22.404,0.13242,227.5,-1.83666,22.4526,0.13248,228.5,-1.83514,22.5007,0.13257,229.5,-1.83397,22.5484,0.13266,230.5,-1.83316,22.5957,0.13277,231.5,-1.8327,22.6424,0.13289,232.5,-1.83258,22.6887,0.13302,233.5,-1.83282,22.7346,0.13317,234.5,-1.8334,22.7799,0.13334,235.5,-1.83432,22.8247,0.13352,236.5,-1.83556,22.8691,0.13372,237.5,-1.83712,22.9129,0.13393,238.5,-1.83899,22.9563,0.13416,239.5,-1.84115,22.9991,0.13441,240,-1.84233,23.0203,0.13454,240.5,-1.84358,23.0414,0.13468],
    2: [24,-0.98661,16.4234,0.08545,24.5,-1.0245,16.388,0.08503,25.5,-1.1027,16.319,0.08421,26.5,-1.18397,16.2521,0.08346,27.5,-1.26807,16.1873,0.08275,28.5,-1.35475,16.1248,0.08209,29.5,-1.44369,16.0643,0.08149,30.5,-1.53454,16.0059,0.08093,31.5,-1.62693,15.9497,0.08043,32.5,-1.72043,15.8955,0.07997,33.5,-1.81464,15.8434,0.07956,34.5,-1.90908,15.7933,0.07919,35.5,-2.0033,15.7453,0.07888,36.5,-2.09683,15.6992,0.07861,37.5,-2.18921,15.6552,0.07838,38.5,-2.27999,15.6132,0.0782,39.5,-2.36873,15.5732,0.07806,40.5,-2.45502,15.5351,0.07796,41.5,-2.53847,15.4989,0.07791,42.5,-2.61873,15.4647,0.0779,43.5,-2.69549,15.4324,0.07794,44.5,-2.76846,15.4019,0.07801,45.5,-2.83743,15.3734,0.07813,46.5,-2.90218,15.3466,0.07828,47.5,-2.96258,15.3217,0.07848,48.5,-3.01852,15.2985,0.07871,49.5,-3.06994,15.2772,0.07899,50.5,-3.1168,15.2576,0.0793,51.5,-3.15911,15.2397,0.07965,52.5,-3.19691,15.2235,0.08003,53.5,-3.23028,15.2089,0.08045,54.5,-3.2593,15.1961,0.0809,55.5,-3.2841,15.1848,0.08139,56.5,-3.30481,15.1751,0.08191,57.5,-3.3216,15.167,0.08246,58.5,-3.33462,15.1605,0.08305,59.5,-3.34405,15.1554,0.08366,60.5,-3.35008,15.1519,0.0843,61.5,-3.35289,15.1498,0.08497,62.5,-3.35269,15.1492,0.08566,63.5,-3.34966,15.1499,0.08638,64.5,-3.344,15.1521,0.08713,65.5,-3.33589,15.1557,0.08789,66.5,-3.32552,15.1606,0.08868,67.5,-3.31308,15.1668,0.08949,68.5,-3.29873,15.1743,0.09032,69.5,-3.28265,15.1831,0.09116,70.5,-3.265,15.1931,0.09203,71.5,-3.24594,15.2044,0.09291,72.5,-3.22561,15.2169,0.0938,73.5,-3.20415,15.2306,0.09471,74.5,-3.18169,15.2454,0.09563,75.5,-3.15836,15.2614,0.09657,76.5,-3.13428,15.2785,0.09751,77.5,-3.10956,15.2968,0.09846,78.5,-3.08429,15.3161,0.09943,79.5,-3.05858,15.3364,0.1004,80.5,-3.03251,15.3579,0.10137,81.5,-3.00616,15.3803,0.10236,82.5,-2.97961,15.4037,0.10334,83.5,-2.95293,15.4282,0.10433,84.5,-2.92619,15.4536,0.10533,85.5,-2.89944,15.4799,0.10632,86.5,-2.87273,15.5072,0.10732,87.5,-2.84612,15.5354,0.10831,88.5,-2.81966,15.5644,0.10931,89.5,-2.79337,15.5944,0.1103,90.5,-2.76731,15.6252,0.11129,91.5,-2.7415,15.6568,0.11228,92.5,-2.71597,15.6893,0.11327,93.5,-2.69075,15.7226,0.11425,94.5,-2.66587,15.7566,0.11523,95.5,-2.64134,15.7914,0.1162,96.5,-2.61719,15.827,0.11716,97.5,-2.59343,15.8633,0.11812,98.5,-2.57008,15.9003,0.11906,99.5,-2.54714,15.938,0.12,100.5,-2.52464,15.9764,0.12094,101.5,-2.50257,16.0155,0.12186,102.5,-2.48095,16.0552,0.12277,103.5,-2.45979,16.0955,0.12367,104.5,-2.43908,16.1365,0.12456,105.5,-2.41884,16.178,0.12544,106.5,-2.39906,16.2201,0.12631,107.5,-2.37976,16.2628,0.12717,108.5,-2.36092,16.3061,0.12801,109.5,-2.34256,16.3499,0.12884,110.5,-2.32466,16.3942,0.12966,111.5,-2.30724,16.439,0.13047,112.5,-2.29029,16.4843,0.13126,113.5,-2.2738,16.53,0.13203,114.5,-2.25778,16.5763,0.1328,115.5,-2.24223,16.6229,0.13354,116.5,-2.22713,16.67,0.13428,117.5,-2.2125,16.7175,0.135,118.5,-2.19831,16.7654,0.1357,119.5,-2.18458,16.8137,0.13639,120.5,-2.1713,16.8623,0.13706,121.5,-2.15845,16.9113,0.13771,122.5,-2.14605,16.9606,0.13835,123.5,-2.13408,17.0103,0.13898,124.5,-2.12255,17.0602,0.13959,125.5,-2.11144,17.1105,0.14018,126.5,-2.10075,17.161,0.14075,127.5,-2.09048,17.2117,0.14131,128.5,-2.08062,17.2628,0.14186,129.5,-2.07117,17.314,0.14238,130.5,-2.06213,17.3655,0.1429,131.5,-2.05348,17.4172,0.14339,132.5,-2.04524,17.4691,0.14387,133.5,-2.03738,17.5211,0.14433,134.5,-2.02991,17.5733,0.14478,135.5,-2.02282,17.6257,0.14521,136.5,-2.01611,17.6782,0.14562,137.5,-2.00977,17.7308,0.14602,138.5,-2.0038,17.7836,0.1464,139.5,-1.9982,17.8364,0.14677,140.5,-1.99296,17.8893,0.14712,141.5,-1.98807,17.9423,0.14745,142.5,-1.98354,17.9953,0.14777,143.5,-1.97936,18.0484,0.14807,144.5,-1.97552,18.1015,0.14836,145.5,-1.97202,18.1546,0.14864,146.5,-1.96886,18.2077,0.14889,147.5,-1.96604,18.2609,0.14914,148.5,-1.96354,18.3139,0.14937,149.5,-1.96137,18.367,0.14958,150.5,-1.95952,18.42,0.14978,151.5,-1.95799,18.473,0.14997,152.5,-1.95677,18.5259,0.15014,153.5,-1.95587,18.5787,0.1503,154.5,-1.95527,18.6314,0.15045,155.5,-1.95497,18.684,0.15058,156.5,-1.95498,18.7364,0.15071,157.5,-1.95528,18.7888,0.15081,158.5,-1.95587,18.841,0.15091,159.5,-1.95676,18.893,0.15099,160.5,-1.95792,18.9449,0.15107,161.5,-1.95937,18.9966,0.15113,162.5,-1.9611,19.0481,0.15118,163.5,-1.9631,19.0994,0.15122,164.5,-1.96537,19.1505,0.15124,165.5,-1.96791,19.2014,0.15126,166.5,-1.97071,19.252,0.15127,167.5,-1.97376,19.3024,0.15127,168.5,-1.97707,19.3526,0.15126,169.5,-1.98063,19.4024,0.15124,170.5,-1.98444,19.452,0.15121,171.5,-1.98848,19.5014,0.15117,172.5,-1.99276,19.5504,0.15112,173.5,-1.99728,19.5991,0.15107,174.5,-2.00201,19.6475,0.15101,175.5,-2.00697,19.6955,0.15094,176.5,-2.01215,19.7432,0.15087,177.5,-2.01753,19.7906,0.15079,178.5,-2.02312,19.8376,0.1507,179.5,-2.02891,19.8843,0.15061,180.5,-2.03489,19.9306,0.15051,181.5,-2.04106,19.9765,0.15041,182.5,-2.04741,20.022,0.1503,183.5,-2.05393,20.067,0.15019,184.5,-2.06062,20.1117,0.15008,185.5,-2.06746,20.156,0.14996,186.5,-2.07446,20.1998,0.14984,187.5,-2.0816,20.2432,0.14972,188.5,-2.08888,20.2861,0.1496,189.5,-2.09628,20.3286,0.14947,190.5,-2.1038,20.3706,0.14934,191.5,-2.11143,20.4122,0.14922,192.5,-2.11916,20.4533,0.14909,193.5,-2.12698,20.4938,0.14896,194.5,-2.13487,20.5339,0.14884,195.5,-2.14284,20.5735,0.14871,196.5,-2.15087,20.6126,0.14859,197.5,-2.15894,20.6511,0.14847,198.5,-2.16704,20.6891,0.14835,199.5,-2.17518,20.7266,0.14823,200.5,-2.18332,20.7636,0.14812,201.5,-2.19146,20.7999,0.14802,202.5,-2.19958,20.8358,0.14791,203.5,-2.20768,20.8711,0.14782,204.5,-2.21574,20.9058,0.14772,205.5,-2.22374,20.9399,0.14764,206.5,-2.23167,20.9734,0.14756,207.5,-2.23951,21.0064,0.14749,208.5,-2.24726,21.0387,0.14742,209.5,-2.25489,21.0705,0.14737,210.5,-2.26238,21.1016,0.14732,211.5,-2.26973,21.1322,0.14729,212.5,-2.27692,21.1621,0.14726,213.5,-2.28393,21.1913,0.14724,214.5,-2.29073,21.22,0.14724,215.5,-2.29732,21.248,0.14725,216.5,-2.30369,21.2753,0.14727,217.5,-2.3098,21.302,0.1473,218.5,-2.31565,21.3281,0.14735,219.5,-2.32122,21.3534,0.14741,220.5,-2.32648,21.3781,0.14749,221.5,-2.33143,21.4021,0.14758,222.5,-2.33604,21.4255,0.14769,223.5,-2.3403,21.4481,0.14782,224.5,-2.34418,21.4701,0.14796,225.5,-2.34768,21.4913,0.14812,226.5,-2.35077,21.5119,0.1483,227.5,-2.35344,21.5317,0.1485,228.5,-2.35568,21.5508,0.14872,229.5,-2.35746,21.5692,0.14897,230.5,-2.35876,21.5869,0.14923,231.5,-2.35959,21.6038,0.14952,232.5,-2.35991,21.62,0.14983,233.5,-2.35971,21.6354,0.15016,234.5,-2.35898,21.6501,0.15052,235.5,-2.35771,21.664,0.15091,236.5,-2.35589,21.6771,0.15132,237.5,-2.3535,21.6895,0.15175,238.5,-2.35053,21.7011,0.15222,239.5,-2.34696,21.7119,0.15272,240,-2.34496,21.717,0.15297,240.5,-2.3428,21.7219,0.15324],
  };
  const WHO_BMI_LMS = {
    1: [0,-0.3053,13.4069,0.0956,1,0.2708,14.9441,0.09027,2,0.1118,16.3195,0.08677,3,0.0068,16.8987,0.08495,4,-0.0727,17.1579,0.08378,5,-0.137,17.2919,0.08296,6,-0.1913,17.3422,0.08234,7,-0.2385,17.3288,0.08183,8,-0.2802,17.2647,0.0814,9,-0.3176,17.1662,0.08102,10,-0.3516,17.0488,0.08068,11,-0.3828,16.9239,0.08037,12,-0.4115,16.7981,0.08009,13,-0.4382,16.6743,0.07982,14,-0.463,16.5548,0.07958,15,-0.4863,16.4409,0.07935,16,-0.5082,16.3335,0.07913,17,-0.5289,16.2329,0.07892,18,-0.5484,16.1392,0.07873,19,-0.5669,16.0528,0.07854,20,-0.5846,15.9743,0.07836,21,-0.6014,15.9039,0.07818,22,-0.6174,15.8412,0.07802,23,-0.6328,15.7852,0.07786,24,-0.6473,15.7356,0.07771],
    2: [0,-0.0631,13.3363,0.09272,1,0.3448,14.5679,0.09556,2,0.1749,15.7679,0.09371,3,0.0643,16.3574,0.09254,4,-0.0191,16.6703,0.09166,5,-0.0864,16.8386,0.09096,6,-0.1429,16.9083,0.09036,7,-0.1916,16.902,0.08984,8,-0.2344,16.8404,0.08939,9,-0.2725,16.7406,0.08898,10,-0.3068,16.6184,0.08861,11,-0.3381,16.4875,0.08828,12,-0.3667,16.3568,0.08797,13,-0.3932,16.2311,0.08768,14,-0.4177,16.1128,0.08741,15,-0.4407,16.0028,0.08716,16,-0.4623,15.9017,0.08693,17,-0.4825,15.8096,0.08671,18,-0.5017,15.7263,0.0865,19,-0.5199,15.6517,0.0863,20,-0.5372,15.5855,0.08612,21,-0.5537,15.5278,0.08594,22,-0.5695,15.4787,0.08577,23,-0.5846,15.438,0.0856,24,-0.5989,15.4052,0.08545],
  };

  /* ---------- BMI-for-age (children & teens) ---------- */
  const lmsCache = {};
  function lmsTable(src, sex, key) {
    const k = `${key}${sex}`;
    if (!lmsCache[k]) {
      const f = src[sex];
      lmsCache[k] = [];
      for (let i = 0; i < f.length; i += 4) lmsCache[k].push([f[i], f[i + 1], f[i + 2], f[i + 3]]);
    }
    return lmsCache[k];
  }
  /** L, M, S at an age in months, linearly interpolated between table rows. */
  function lmsAt(src, key, sex, ageMos) {
    const t = lmsTable(src, sex, key);
    if (ageMos <= t[0][0]) return t[0].slice(1);
    if (ageMos >= t[t.length - 1][0]) return t[t.length - 1].slice(1);
    let i = 0;
    while (t[i + 1][0] < ageMos) i++;
    const [a0, ...p] = t[i];
    const [a1, ...q] = t[i + 1];
    const f = (ageMos - a0) / (a1 - a0);
    return p.map((v, j) => v + (q[j] - v) * f);
  }
  const lmsZ = (x, [L, M, S]) => (Math.abs(L) < 1e-9 ? Math.log(x / M) / S : ((x / M) ** L - 1) / (L * S));
  const lmsValue = (z, [L, M, S]) => (Math.abs(L) < 1e-9 ? M * Math.exp(S * z) : M * (1 + L * S * z) ** (1 / L));
  function normCdf(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z > 0 ? 1 - p : p;
  }
  const Z_P5 = -1.6448536;
  const Z_P85 = 1.0364334;
  const Z_P95 = 1.6448536;
  const ordinal = (n) => {
    const v = n % 100;
    return `${n}${v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
  };
  function fmtPercentile(p) {
    const n = p * 100;
    if (n < 0.1) return 'below the 0.1st';
    if (n > 99.9) return 'above the 99.9th';
    if (n < 1 || n > 99) return `${n.toFixed(1)}th`;
    return ordinal(Math.round(n));
  }
  function renderGauge(form, segs, labels, pos, caption) {
    out(form, 'gaugeBar').innerHTML = segs.map(([w, cls]) => `<span class="gseg ${cls}" style="flex-basis:${w}%"></span>`).join('');
    out(form, 'gaugeLabels').innerHTML = labels.map(([at, text]) => `<span style="left:${at}%">${text}</span>`).join('');
    out(form, 'bmiMarker').style.left = `${clamp(pos, 0, 100)}%`;
    out(form, 'gaugeCaption').textContent = caption;
  }

  const tools = {
    bmi(form) {
      const tag = out(form, 'bmiCat');
      const v = numbers(form, ['ageYears', 'ageMonths', 'height', 'weight']);
      if (!v) { tag.textContent = 'Please check the highlighted values.'; tag.dataset.tone = 'bad'; return; }
      const sex = form.elements.sex.value === '2' ? 2 : 1;
      const ageMos = Math.floor(v.ageYears) * 12 + Math.floor(v.ageMonths);
      const hM = v.height / 100;
      const bmi = v.weight / (hM * hM);
      const kid = sex === 1 ? 'boy' : 'girl';
      const ageText = ageMos < 24 ? `${ageMos}-month-old` : `${Math.floor(ageMos / 12)}-year-old`;
      const kg = (b) => (b * hM * hM).toFixed(1);
      const setResult = (cat, tone, sub, note, source, hint) => {
        out(form, 'bmi').textContent = bmi.toFixed(1);
        tag.textContent = cat;
        tag.dataset.tone = tone;
        out(form, 'bmiSub').textContent = sub;
        out(form, 'bmiNote').textContent = note;
        out(form, 'bmiSource').textContent = source;
        out(form, 'bmiHint').textContent = hint;
      };
      out(form, 'heightLabel').textContent = ageMos < 24 ? 'Length (cm, lying down)' : 'Height (cm)';

      if (ageMos >= 240) {
        // Adults (20+): fixed WHO cut-offs, the same at every age.
        let cat; let tone;
        if (bmi < 18.5) { cat = 'Underweight'; tone = 'warn'; } else if (bmi < 25) { cat = 'Healthy weight'; tone = 'ok'; } else if (bmi < 30) { cat = 'Overweight'; tone = 'warn'; } else { cat = 'Obesity'; tone = 'bad'; }
        renderGauge(form,
          [[10.4, 'seg-under'], [27.1, 'seg-normal'], [20.8, 'seg-over'], [41.7, 'seg-obese']],
          [[0, '16'], [10.4, '18.5'], [37.5, '25'], [58.3, '30'], [100, '40']],
          (bmi - 16) / 24 * 100, 'Adult BMI scale');
        setResult(cat, tone, 'Body Mass Index · adult',
          `Healthy weight range for ${v.height} cm: ${kg(18.5)}–${kg(24.9)} kg. BMI doesn’t account for muscle mass — athletes may score higher.`,
          'Adults 20+: WHO BMI classification (underweight <18.5 · healthy 18.5–24.9 · overweight 25–29.9 · obesity ≥30).',
          'Adults use the same BMI cut-offs at every age.');
        return;
      }

      if (ageMos >= 24) {
        // Ages 2–19: CDC BMI-for-age percentiles (completed months + 0.5, as in the CDC tables).
        const lms = lmsAt(CDC_BMI_LMS, 'cdc', sex, ageMos + 0.5);
        const p = normCdf(lmsZ(bmi, lms));
        const p95 = lmsValue(Z_P95, lms);
        let cat; let tone;
        if (p < 0.05) { cat = 'Underweight'; tone = 'warn'; } else if (p < 0.85) { cat = 'Healthy weight'; tone = 'ok'; } else if (p < 0.95) { cat = 'Overweight'; tone = 'warn'; } else if (bmi >= 1.2 * p95) { cat = 'Severe obesity'; tone = 'bad'; } else { cat = 'Obesity'; tone = 'bad'; }
        renderGauge(form,
          [[5, 'seg-under'], [80, 'seg-normal'], [10, 'seg-over'], [5, 'seg-obese']],
          [[5, '5th'], [85, '85th'], [95, '95th']],
          p * 100, `Percentile among ${ageText} ${kid}s`);
        setResult(cat, tone, `BMI · ${fmtPercentile(p)} percentile for ${ageText} ${kid}s`,
          `Healthy weight range for a ${ageText} ${kid} at ${v.height} cm: about ${kg(lmsValue(Z_P5, lms))}–${kg(lmsValue(Z_P85, lms))} kg (5th to 85th percentile). Children’s BMI naturally changes as they grow, so it’s compared with children of the same age and sex.`,
          'Ages 2–19: CDC BMI-for-age growth charts (underweight <5th · healthy 5th–<85th · overweight 85th–<95th · obesity ≥95th · severe obesity ≥120% of the 95th percentile).',
          'Children and teens are compared with others of the same age and sex.');
        return;
      }

      // Under 2: WHO Child Growth Standards (BMI-for-age z-scores).
      const lms = lmsAt(WHO_BMI_LMS, 'who', sex, ageMos);
      const z = lmsZ(bmi, lms);
      const p = normCdf(z);
      let cat; let tone;
      if (z < -3) { cat = 'Severely low BMI for age'; tone = 'bad'; } else if (z < -2) { cat = 'Low BMI for age'; tone = 'warn'; } else if (z <= 1) { cat = 'Healthy growth'; tone = 'ok'; } else if (z <= 2) { cat = 'Possible risk of overweight'; tone = 'info'; } else if (z <= 3) { cat = 'Overweight'; tone = 'warn'; } else { cat = 'Obese'; tone = 'bad'; }
      renderGauge(form,
        [[2.28, 'seg-under'], [81.85, 'seg-normal'], [13.59, 'seg-over'], [2.28, 'seg-obese']],
        [[2.28, '−2 SD'], [84.13, '+1 SD'], [97.72, '+2 SD']],
        p * 100, `Position among ${ageText} ${kid}s (WHO z-score)`);
      setResult(cat, tone, `BMI · z-score ${z >= 0 ? '+' : '−'}${Math.abs(z).toFixed(2)} (${fmtPercentile(p)} percentile) for ${ageText} ${kid}s`,
        `Typical weight for a ${ageText} ${kid} at ${v.height} cm length: about ${kg(lmsValue(-2, lms))}–${kg(lmsValue(1, lms))} kg (−2 to +1 SD).`,
        'Under 2: WHO Child Growth Standards, BMI-for-age (low <−2 SD · healthy −2 to +1 · risk of overweight +1 to +2 · overweight +2 to +3 · obese >+3). Babies grow fast — always review growth with your paediatrician.',
        'For babies under 2, measure length lying down.');
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
  $('#panel-bmi').addEventListener('click', (e) => {
    const b = e.target.closest('[data-bmi-preset]');
    if (!b) return;
    const [y, mo, sex, h, w] = b.dataset.bmiPreset.split(',');
    const f = e.currentTarget.elements;
    f.ageYears.value = y;
    f.ageMonths.value = mo;
    f.sex.value = sex;
    f.height.value = h;
    f.weight.value = w;
    e.currentTarget.dispatchEvent(new Event('change'));
  });
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
  // One-time reset of everyone's progress on this device for this release.
  if (!local.get(KEYS.progressReset, false)) {
    const all = db.all();
    Object.values(all).forEach((u) => { if (u.wallet || u.programs?.length) resetProgress(u, 'update'); });
    local.set(KEYS.users, all);
    local.set(KEYS.progressReset, true);
  }

  const saved = loadSession();
  if (saved && db.get(saved.email)) {
    state.email = saved.email;
    updateUserSilently((u) => { ensureWallet(u); ensureAdminPerks(u); });
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
