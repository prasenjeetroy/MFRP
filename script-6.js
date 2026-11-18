/* =========================================================
   BDAI Sports & Health — script-6.js
   Powered by BDAIWellness

   Front-end demo: accounts, PIN security key, lock screen,
   subscriptions and health tools. All data is stored in this
   browser only. Secrets (passwords, PINs, recovery keys) are
   salted + hashed with PBKDF2-SHA-256 before storage; card
   numbers and CVCs are never stored.
   For production, move auth, PIN verification and payments
   to a server and a real payment provider.
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
  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  const normEmail = (s) => String(s || '').trim().toLowerCase();
  const initials = (name) => (String(name || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('') || 'BD').toUpperCase();
  const firstName = (name) => String(name || 'Athlete').trim().split(/\s+/)[0];
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDateTime = (ts) => new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
  const PIN_MAX_FAILS = 15; // full sign-out after this many wrong PINs
  const PIN_BATCH = 5; // cooldown after every N wrong PINs

  const KEYS = { users: 'bdai6.users', session: 'bdai6.session', theme: 'bdai6.theme', currency: 'bdai6.currency' };

  const db = {
    all() { return local.get(KEYS.users, {}) || {}; },
    get(email) { return this.all()[email] || null; },
    save(user) { const all = this.all(); all[user.email] = user; local.set(KEYS.users, all); },
    remove(email) { const all = this.all(); delete all[email]; local.set(KEYS.users, all); },
  };

  const state = {
    email: null,
    locked: false,
    billing: 'monthly',
    currency: local.get(KEYS.currency, 'INR') === 'USD' ? 'USD' : 'INR',
    pending: null,
  };

  const currentUser = () => (state.email ? db.get(state.email) : null);
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

  /* ---------------------------------------------------------
     Toasts
     --------------------------------------------------------- */
  function toast(message, type = 'info', ms = 3800) {
    const icon = type === 'success' ? 'check' : type === 'error' ? 'x' : 'sparkle';
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
  };
  const openDialog = (d) => { if (!d.open) d.showModal(); };
  const closeDialog = (d) => { if (d.open) d.close(); };

  // Close on backdrop click (not for the lock screen)
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
      const digits = PinPad.shuffle ? shuffled(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
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

    success() {
      this.root.classList.add('is-ok');
    }

    focus() {
      this.root.focus({ preventScroll: true });
    }

    cooldown(seconds, msgEl, onDone) {
      clearInterval(this.timer);
      this.setDisabled(true);
      let s = seconds;
      const tick = () => {
        if (s <= 0) {
          clearInterval(this.timer);
          this.setDisabled(false);
          setMsg(msgEl, 'You can try again now.');
          this.focus();
          onDone?.();
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
      this.setDisabled(false);
    }
  }

  function setMsg(el, text, tone = '') {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-error', tone === 'error');
    el.classList.toggle('is-ok', tone === 'ok');
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

  /** Verify the current user's PIN with progressive cooldowns. */
  async function verifyPin(pin) {
    const u = currentUser();
    if (!u || !u.pin) return { ok: false, reason: 'nopin' };
    const now = Date.now();
    if (u.pin.lockUntil && now < u.pin.lockUntil) {
      return { ok: false, reason: 'locked', wait: Math.ceil((u.pin.lockUntil - now) / 1000) };
    }
    const hash = await deriveHash(pin, u.pin.salt);
    const fresh = currentUser();
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
      fresh.pin.fails = 0;
      fresh.pin.lockUntil = 0;
      logActivity(fresh, 'Signed out after too many incorrect PIN attempts', true);
      db.save(fresh);
      return { ok: false, reason: 'signedout' };
    }
    let wait = 0;
    if (fresh.pin.fails % PIN_BATCH === 0) {
      wait = 30 * 2 ** (fresh.pin.fails / PIN_BATCH - 1);
      fresh.pin.lockUntil = now + wait * 1000;
    }
    db.save(fresh);
    return { ok: false, reason: wait ? 'locked' : 'wrong', wait, remaining: PIN_BATCH - (fresh.pin.fails % PIN_BATCH) };
  }

  /** Shared UI handling of a failed verifyPin(). Returns true if the user was signed out. */
  function handlePinFailure(res, pad, msgEl) {
    if (res.reason === 'signedout') {
      forceSignOut('Too many incorrect PIN attempts. Please log in with your password.');
      return true;
    }
    pad.error();
    if (res.reason === 'locked') {
      setTimeout(() => pad.cooldown(res.wait, msgEl), 430);
    } else if (res.reason === 'wrong') {
      setMsg(msgEl, `Incorrect PIN. ${res.remaining} attempt${res.remaining === 1 ? '' : 's'} left before a cooldown.`, 'error');
    } else {
      setMsg(msgEl, 'No PIN is set for this account.', 'error');
    }
    return false;
  }

  function applyPinCooldownIfAny(pad, msgEl) {
    const u = currentUser();
    if (u?.pin?.lockUntil && u.pin.lockUntil > Date.now()) {
      pad.cooldown(Math.ceil((u.pin.lockUntil - Date.now()) / 1000), msgEl);
    } else {
      pad.stopCooldown();
    }
  }

  /* ---------- PIN prompt (verify) ---------- */
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
        handlePinFailure(res, pad, promptMsg);
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
    return new Promise((resolve) => {
      if (promptResolve) promptResolve(false);
      promptResolve = resolve;
      $('#pinPromptTitle').textContent = title;
      $('#pinPromptSub').textContent = sub;
      dlg.pinPrompt.classList.toggle('is-danger', danger);
      setMsg(promptMsg, '');
      promptPad.setLength(u.pin.length);
      openDialog(dlg.pinPrompt);
      applyPinCooldownIfAny(promptPad, promptMsg);
      promptPad.focus();
    });
  }

  /** Require PIN for a sensitive action. If no PIN exists yet, set one up first. */
  async function requirePin(opts) {
    const u = currentUser();
    if (!u) return false;
    if (!u.pin) {
      toast('This action needs a PIN security key — let’s create one.');
      return openPinSetup({ mode: 'create', reason: 'Sensitive actions are protected by your PIN security key. Create one now — it only takes a moment.' });
    }
    return pinPrompt(opts);
  }

  /* ---------- PIN setup (create / change / reset) ---------- */
  const ps = { first: '', length: 6, completed: false, key: '', resolve: null };
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
      const u = currentUser();
      if (!u) return;
      const salt = randomHex();
      const hash = await deriveHash(v, salt);
      const key = generateRecoveryKey();
      const keySalt = randomHex();
      const keyHash = await deriveHash(normalizeKey(key), keySalt);
      const hadPin = !!u.pin;
      updateUser((x) => {
        x.pin = { salt, hash, length: ps.length, fails: 0, lockUntil: 0, setAt: Date.now() };
        x.recovery = { salt: keySalt, hash: keyHash, createdAt: Date.now() };
        x.settings = x.settings || {};
        if (x.settings.autoLock === undefined) x.settings.autoLock = 5;
        logActivity(x, hadPin ? 'PIN security key changed' : 'PIN security key created');
        logActivity(x, 'New recovery security key generated');
      });
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
      'Use this key to reset your PIN if you forget it.',
      'Keep it offline and private. It cannot be shown again.',
    ].join('\n'));
  });
  $('#keyDoneBtn').addEventListener('click', () => {
    closeDialog(dlg.pinSetup);
    toast('PIN security key is active. Your account is protected.', 'success');
  });

  dlg.pinSetup.addEventListener('close', () => {
    ps.key = '';
    $('#recoveryKey').textContent = 'XXXX-XXXX-XXXX-XXXX';
    if (ps.resolve) { const r = ps.resolve; ps.resolve = null; r(ps.completed); }
  });

  async function openPinSetup({ mode = 'create', reason = '' } = {}) {
    const u = currentUser();
    if (!u) return false;
    if (mode === 'change' && u.pin) {
      const ok = await pinPrompt({ title: 'Confirm current PIN', sub: 'Enter your current PIN to set a new one.' });
      if (!ok) return false;
    }
    return new Promise((resolve) => {
      if (ps.resolve) ps.resolve(false);
      ps.resolve = resolve;
      ps.completed = false;
      ps.first = '';
      $('#pinSetupTitle').textContent = u.pin ? 'Choose a new PIN' : 'Create your PIN security key';
      $('[data-pin-reason]', dlg.pinSetup).textContent = reason
        || 'Your PIN unlocks BDAI on this device, auto-locks after inactivity and authorizes payments.';
      setPinLength(u.pin ? u.pin.length : 6);
      setMsg(setupMsg, '');
      showPinStep('enter');
      openDialog(dlg.pinSetup);
      setupPad.focus();
    });
  }

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
        handlePinFailure(res, pad, lockMsg);
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
    $('#lockName').textContent = firstName(u.name);
    $('#lockAvatar').textContent = initials(u.name);
    setMsg(lockMsg, '');
    lockPad.setLength(u.pin.length);
    $('#recoveryForm').reset();
    setMsg($('#recoveryForm .form-error'), '');
    tickClock();
    clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 1000 * 15);
    openDialog(dlg.lock);
    showLockView('pin');
    applyPinCooldownIfAny(lockPad, lockMsg);
    if (!quiet) {
      updateUserSilently((x) => logActivity(x, 'Account locked'));
    }
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
    if (u) toast(`Welcome back, ${firstName(u.name)}!`, 'success');
  }

  function updateUserSilently(mutator) {
    const u = currentUser();
    if (!u) return;
    mutator(u);
    db.save(u);
  }

  dlg.lock.addEventListener('cancel', (e) => e.preventDefault());
  dlg.lock.addEventListener('close', () => {
    if (state.locked) setTimeout(() => openDialog(dlg.lock), 0);
  });
  $$('[data-lock-goto]', dlg.lock).forEach((b) => b.addEventListener('click', () => showLockView(b.dataset.lockGoto)));
  $('#lockSignOut').addEventListener('click', () => logout('Signed out.'));

  // Recovery with security key
  let recoveryFails = 0;
  let recoveryBlockedUntil = 0;
  $('#recoveryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const err = $('.form-error', form);
    const input = form.elements.key;
    const btn = $('button[type="submit"]', form);
    const u = currentUser();
    if (!u || !u.recovery) { setMsg(err, 'No recovery key exists for this account. Sign out and log in with your password.'); return; }
    if (Date.now() < recoveryBlockedUntil) {
      setMsg(err, `Too many attempts. Try again in ${Math.ceil((recoveryBlockedUntil - Date.now()) / 1000)}s.`);
      return;
    }
    const key = normalizeKey(input.value);
    if (key.length !== 16) {
      input.setAttribute('aria-invalid', 'true');
      setMsg(err, 'Recovery keys have 16 letters and numbers.');
      return;
    }
    btn.classList.add('is-loading');
    const hash = await deriveHash(key, u.recovery.salt);
    btn.classList.remove('is-loading');
    if (!safeEqual(hash, u.recovery.hash)) {
      recoveryFails += 1;
      if (recoveryFails % 5 === 0) recoveryBlockedUntil = Date.now() + 60000;
      input.setAttribute('aria-invalid', 'true');
      updateUserSilently((x) => logActivity(x, 'Failed recovery-key attempt', true));
      setMsg(err, 'That recovery key is not correct.');
      return;
    }
    recoveryFails = 0;
    input.removeAttribute('aria-invalid');
    updateUserSilently((x) => {
      if (x.pin) { x.pin.fails = 0; x.pin.lockUntil = 0; }
      logActivity(x, 'Account recovered with security key');
    });
    unlock('Unlocked with recovery key');
    await sleep(200);
    const done = await openPinSetup({ mode: 'reset', reason: 'Recovery successful. Choose a new PIN — you’ll also get a fresh recovery key.' });
    if (!done) toast('Your previous PIN is still active. You can change it any time in Security.');
  });
  $('#recoveryForm [name="key"]').addEventListener('input', (e) => {
    const raw = normalizeKey(e.target.value).slice(0, 16);
    e.target.value = raw.match(/.{1,4}/g)?.join('-') || '';
    e.target.removeAttribute('aria-invalid');
  });

  /* ---------- Inactivity auto-lock ---------- */
  let lastActive = Date.now();
  const markActive = () => { lastActive = Date.now(); };
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
     Authentication
     --------------------------------------------------------- */
  const loginForm = $('#loginForm');
  const signupForm = $('#signupForm');

  function saveSession(email, remember) {
    const s = { email, at: Date.now() };
    if (remember) { local.set(KEYS.session, s); session.remove(KEYS.session); } else { session.set(KEYS.session, s); local.remove(KEYS.session); }
  }
  const loadSession = () => session.get(KEYS.session) || local.get(KEYS.session);
  function clearSession() { session.remove(KEYS.session); local.remove(KEYS.session); }

  function switchAuthTab(tab) {
    $$('[role="tab"][data-auth-tab]', dlg.auth).forEach((b) => {
      const on = b.dataset.authTab === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    loginForm.hidden = tab !== 'login';
    signupForm.hidden = tab !== 'signup';
    $('#authTitle').textContent = tab === 'login' ? 'Welcome back' : 'Join BDAI Sports & Health';
    if (!dlg.auth.dataset.customSub) {
      $('#authSub').textContent = tab === 'login' ? 'Log in to continue your training.' : 'Create a free account — upgrade any time.';
    }
    const form = tab === 'login' ? loginForm : signupForm;
    setMsg($('.form-error', form), '');
    setTimeout(() => form.querySelector('input')?.focus(), 30);
  }
  $$('[data-auth-tab]', dlg.auth).forEach((b) => b.addEventListener('click', () => switchAuthTab(b.dataset.authTab)));

  function openAuth(tab = 'login', subtitle = '') {
    if (currentUser()) { openAccount(); return; }
    if (subtitle) { dlg.auth.dataset.customSub = '1'; $('#authSub').textContent = subtitle; } else { delete dlg.auth.dataset.customSub; }
    loginForm.reset();
    signupForm.reset();
    $('.pw-meter').dataset.score = '0';
    $$('[aria-invalid]', dlg.auth).forEach((i) => i.removeAttribute('aria-invalid'));
    switchAuthTab(tab);
    openDialog(dlg.auth);
  }
  dlg.auth.addEventListener('close', () => {
    // Drop a pending action if the user dismissed sign-in.
    if (!currentUser()) state.pending = null;
  });

  // Show/hide password
  $$('[data-toggle-pw]').forEach((b) => b.addEventListener('click', () => {
    const input = b.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(show));
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }));

  function pwStrength(p) {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (p.length < 8) s = Math.min(s, 1);
    return Math.min(4, s);
  }
  const PW_LABELS = ['Use 8+ characters with a mix of letters, numbers & symbols.', 'Weak password', 'Fair — add symbols or length', 'Strong password', 'Excellent password'];
  signupForm.elements.password.addEventListener('input', (e) => {
    const score = e.target.value ? pwStrength(e.target.value) : 0;
    $('.pw-meter').dataset.score = String(score);
    $('#pwMeterLabel').textContent = e.target.value ? PW_LABELS[score] : PW_LABELS[0];
  });

  function fieldError(form, name, message) {
    const input = form.elements[name];
    if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
    setMsg($('.form-error', form), message);
    return false;
  }
  [loginForm, signupForm].forEach((f) => f.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid')));

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = signupForm.elements;
    const name = f.name.value.trim().replace(/\s+/g, ' ');
    const email = normEmail(f.email.value);
    const pw = f.password.value;
    if (name.length < 2) return fieldError(signupForm, 'name', 'Please enter your name.');
    if (!isEmail(email)) return fieldError(signupForm, 'email', 'Please enter a valid email address.');
    if (db.get(email)) return fieldError(signupForm, 'email', 'An account with this email already exists. Try logging in.');
    if (pw.length < 8 || pwStrength(pw) < 2) return fieldError(signupForm, 'password', 'Choose a stronger password (8+ characters, mix of letters, numbers or symbols).');
    if (pw !== f.confirm.value) return fieldError(signupForm, 'confirm', 'Passwords don’t match.');
    if (!f.terms.checked) return fieldError(signupForm, 'terms', 'Please accept the Terms to continue.');

    const btn = $('button[type="submit"]', signupForm);
    btn.classList.add('is-loading');
    const salt = randomHex();
    const hash = await deriveHash(pw, salt);
    btn.classList.remove('is-loading');

    const user = {
      name, email,
      pw: { salt, hash },
      pin: null, recovery: null,
      sub: null, invoices: [], programs: [],
      settings: { autoLock: 5, shuffle: false, sport: 'running', weeklyGoal: 4 },
      activity: [], createdAt: Date.now(), loginFails: 0, loginLockUntil: 0,
    };
    logActivity(user, 'Account created');
    db.save(user);
    saveSession(email, true);
    state.email = email;
    closeDialog(dlg.auth);
    renderAll();
    toast(`Welcome to BDAI, ${firstName(name)}!`, 'success');
    await sleep(250);
    await openPinSetup({ mode: 'create', reason: 'Secure your new account with a PIN security key. It unlocks BDAI on this device and authorizes subscriptions.' });
    runPending();
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = loginForm.elements;
    const email = normEmail(f.email.value);
    const pw = f.password.value;
    if (!isEmail(email)) return fieldError(loginForm, 'email', 'Please enter a valid email address.');
    if (!pw) return fieldError(loginForm, 'password', 'Please enter your password.');
    const u = db.get(email);
    const generic = 'Email or password is incorrect.';
    const btn = $('button[type="submit"]', loginForm);
    btn.classList.add('is-loading');
    // Hash even for unknown emails to keep timing similar.
    const hash = await deriveHash(pw, u ? u.pw.salt : 'bdai-dummy-salt');
    btn.classList.remove('is-loading');
    if (!u) return fieldError(loginForm, 'password', generic);
    if (u.loginLockUntil && Date.now() < u.loginLockUntil) {
      return fieldError(loginForm, 'password', `Too many attempts. Try again in ${Math.ceil((u.loginLockUntil - Date.now()) / 1000)}s.`);
    }
    if (!safeEqual(hash, u.pw.hash)) {
      u.loginFails = (u.loginFails || 0) + 1;
      if (u.loginFails % 5 === 0) u.loginLockUntil = Date.now() + 60000;
      logActivity(u, 'Failed password login', true);
      db.save(u);
      return fieldError(loginForm, 'password', u.loginFails % 5 === 0 ? 'Too many attempts. Login paused for 60 seconds.' : generic);
    }
    u.loginFails = 0;
    u.loginLockUntil = 0;
    if (u.pin) { u.pin.fails = 0; u.pin.lockUntil = 0; }
    logActivity(u, 'Logged in with password');
    db.save(u);
    saveSession(email, f.remember.checked);
    state.email = email;
    state.locked = false;
    markActive();
    closeDialog(dlg.auth);
    syncSubscription();
    renderAll();
    toast(`Welcome back, ${firstName(u.name)}!`, 'success');
    if (!u.pin) {
      setTimeout(() => toast('Tip: set up a PIN security key in Account → Security.'), 900);
    }
    runPending();
  });

  function runPending() {
    const fn = state.pending;
    state.pending = null;
    if (fn && currentUser()) setTimeout(fn, 200);
  }

  function logout(message = 'You’ve been signed out.', type = 'info') {
    if (state.email) updateUserSilently((x) => logActivity(x, 'Signed out'));
    state.locked = false;
    state.email = null;
    state.pending = null;
    clearSession();
    clearInterval(clockTimer);
    $$('dialog[open]').forEach((d) => d.close());
    renderAll();
    toast(message, type);
  }

  function forceSignOut(message) {
    logout(message, 'error');
    setTimeout(() => openAuth('login', 'For your security, please log in with your password.'), 300);
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
    }
  });

  /* ---------------------------------------------------------
     Subscriptions & checkout
     --------------------------------------------------------- */
  function syncSubscription() {
    const u = currentUser();
    if (!u || !u.sub) return;
    const now = Date.now();
    let changed = false;
    while (u.sub && now >= u.sub.renewsAt) {
      if (u.sub.cancelAtPeriodEnd) {
        logActivity(u, `${PLANS[u.sub.plan].name} subscription ended`);
        u.sub = null;
      } else {
        const date = u.sub.renewsAt;
        u.invoices.unshift({
          id: makeInvoiceId(date), date, plan: u.sub.plan, cycle: u.sub.cycle, currency: u.sub.currency,
          amount: u.sub.amount, discount: 0, method: describeMethod(u.sub.method), status: 'Paid',
        });
        u.sub.renewsAt = addPeriod(date, u.sub.cycle);
        logActivity(u, `${PLANS[u.sub.plan].name} renewed`);
      }
      changed = true;
    }
    if (changed) db.save(u);
  }

  const makeInvoiceId = (ts) => `BDAI-${ts.toString(36).toUpperCase().slice(-6)}${randomHex(1).toUpperCase()}`;
  function describeMethod(m) {
    if (!m) return '—';
    if (m.type === 'card') return `${m.brand || 'Card'} •••• ${m.last4}`;
    if (m.type === 'upi') return `UPI ${m.vpa}`;
    return '—';
  }

  const co = { plan: 'pro', cycle: 'monthly', currency: 'INR', promo: null, method: 'card', payment: null, step: 1, busy: false };
  const coEl = (key) => $$(`[data-co="${key}"]`, dlg.checkout);
  const setCo = (key, text) => coEl(key).forEach((el) => { el.textContent = text; });

  function coAmounts() {
    const subtotal = PLANS[co.plan].price[co.currency][co.cycle];
    const discount = co.promo ? round2(subtotal * co.promo.pct / 100) : 0;
    return { subtotal, discount, total: round2(subtotal - discount) };
  }

  function openCheckout(plan) {
    const u = currentUser();
    if (!u) {
      state.pending = () => openCheckout(plan);
      openAuth('signup', `Create a free account to subscribe to BDAI ${PLANS[plan].name}.`);
      return;
    }
    if (u.sub && u.sub.status === 'active' && u.sub.plan === plan && u.sub.cycle === state.billing && !u.sub.cancelAtPeriodEnd) {
      toast(`You’re already on ${PLANS[plan].name} (${state.billing}).`);
      return;
    }
    Object.assign(co, { plan, cycle: state.billing, currency: state.currency, promo: null, method: 'card', payment: null, busy: false });
    $('#promoForm').reset();
    setMsg($('#promoMsg'), '');
    $('#payForm').reset();
    updateCardPreview();
    setPayMethod('card');
    goStep(1);
    openDialog(dlg.checkout);
  }

  function renderCheckout() {
    const { subtotal, discount, total } = coAmounts();
    const plan = PLANS[co.plan];
    setCo('planName', plan.name);
    $$('input[name="coPlan"]', dlg.checkout).forEach((r) => { r.checked = r.value === co.plan; });
    $$('input[name="coCycle"]', dlg.checkout).forEach((r) => { r.checked = r.value === co.cycle; });
    $$('[data-co-price]', dlg.checkout).forEach((el) => {
      const p = PLANS[el.dataset.coPrice].price[co.currency][co.cycle];
      el.textContent = `${fmtMoney(p, co.currency)} / ${co.cycle === 'yearly' ? 'year' : 'month'}`;
    });
    setCo('line', `${plan.name} · ${co.cycle === 'yearly' ? 'yearly' : 'monthly'}`);
    setCo('subtotal', fmtMoney(subtotal, co.currency));
    coEl('discountRow')[0].hidden = !co.promo;
    if (co.promo) {
      setCo('discountLabel', `${co.promo.code} · ${co.promo.pct}% off`);
      setCo('discount', `−${fmtMoney(discount, co.currency)}`);
    }
    setCo('total', fmtMoney(total, co.currency));
    const renewDate = fmtDate(addPeriod(Date.now(), co.cycle));
    setCo('renews', `Renews ${renewDate} at ${fmtMoney(subtotal, co.currency)}/${co.cycle === 'yearly' ? 'year' : 'month'}. Cancel anytime from your account.`);
    setCo('authLine', `BDAI ${plan.name} · ${co.cycle}`);
    setCo('authTotal', fmtMoney(total, co.currency));
    setCo('authMethod', co.payment ? `Paying with ${describeMethod(co.payment)}` : '');
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
    if (n === 3) prepareAuthorizeStep();
    if (n === 2) setTimeout(() => $(`[data-pay-panel="${co.method}"] input`, dlg.checkout)?.focus(), 30);
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
  $('[data-co-next]', dlg.checkout).addEventListener('click', () => goStep(2));
  $$('[data-co-back]', dlg.checkout).forEach((b) => b.addEventListener('click', () => {
    if (co.busy) return;
    checkoutPad.stopCooldown();
    goStep(Math.max(1, co.step - 1));
  }));

  // Payment method tabs
  function setPayMethod(m) {
    co.method = m;
    $$('[data-pay-method]', dlg.checkout).forEach((b) => {
      const on = b.dataset.payMethod === m;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $$('[data-pay-panel]', dlg.checkout).forEach((p) => { p.hidden = p.dataset.payPanel !== m; });
    setMsg($('#payForm .form-error'), '');
  }
  $$('[data-pay-method]', dlg.checkout).forEach((b) => b.addEventListener('click', () => {
    setPayMethod(b.dataset.payMethod);
    $(`[data-pay-panel="${co.method}"] input`, dlg.checkout)?.focus();
  }));

  // Card helpers
  function luhn(num) {
    let sum = 0;
    let dbl = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let d = +num[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      dbl = !dbl;
    }
    return sum % 10 === 0;
  }
  function cardBrand(n) {
    if (/^4/.test(n)) return 'Visa';
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    if (/^(6011|64[4-9])/.test(n)) return 'Discover';
    if (/^(60|65|81|82|508)/.test(n)) return 'RuPay';
    return '';
  }
  function formatCardNumber(digits) {
    if (cardBrand(digits) === 'Amex') {
      return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ');
    }
    return digits.slice(0, 19).match(/.{1,4}/g)?.join(' ') || '';
  }
  const payForm = $('#payForm');
  function updateCardPreview() {
    const f = payForm.elements;
    const digits = f.ccNumber.value.replace(/\D/g, '');
    const brand = cardBrand(digits);
    const preview = $('.card-preview', dlg.checkout);
    preview.dataset.brand = brand;
    $('[data-cp="brand"]', preview).textContent = brand || 'CARD';
    const masked = (digits + '•'.repeat(Math.max(0, 16 - digits.length))).slice(0, Math.max(16, digits.length));
    $('[data-cp="number"]', preview).textContent = masked.match(/.{1,4}/g).join(' ');
    $('[data-cp="name"]', preview).textContent = f.ccName.value.trim() || 'YOUR NAME';
    $('[data-cp="exp"]', preview).textContent = f.ccExp.value || 'MM/YY';
  }
  payForm.elements.ccNumber.addEventListener('input', (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
    e.target.value = formatCardNumber(digits);
    payForm.elements.ccCvc.maxLength = cardBrand(digits) === 'Amex' ? 4 : 3;
    updateCardPreview();
  });
  payForm.elements.ccExp.addEventListener('input', (e) => {
    let d = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (d.length === 1 && +d > 1) d = `0${d}`;
    e.target.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    updateCardPreview();
  });
  payForm.elements.ccCvc.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); });
  payForm.elements.ccName.addEventListener('input', updateCardPreview);
  payForm.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));

  payForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = payForm.elements;
    if (co.method === 'card') {
      const digits = f.ccNumber.value.replace(/\D/g, '');
      const brand = cardBrand(digits);
      if (f.ccName.value.trim().length < 2) return fieldError(payForm, 'ccName', 'Enter the name on your card.');
      if (digits.length < 13 || digits.length > 19 || !luhn(digits)) return fieldError(payForm, 'ccNumber', 'That card number doesn’t look right.');
      const m = f.ccExp.value.match(/^(\d{2})\/(\d{2})$/);
      if (!m || +m[1] < 1 || +m[1] > 12) return fieldError(payForm, 'ccExp', 'Enter expiry as MM/YY.');
      const expEnd = new Date(2000 + +m[2], +m[1], 0, 23, 59, 59);
      if (expEnd < new Date()) return fieldError(payForm, 'ccExp', 'This card has expired.');
      const cvcLen = brand === 'Amex' ? 4 : 3;
      if (f.ccCvc.value.length !== cvcLen) return fieldError(payForm, 'ccCvc', `Enter the ${cvcLen}-digit security code.`);
      co.payment = { type: 'card', brand: brand || 'Card', last4: digits.slice(-4), exp: f.ccExp.value };
    } else {
      const vpa = f.upi.value.trim();
      if (!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(vpa)) return fieldError(payForm, 'upi', 'Enter a valid UPI ID, e.g. name@bank.');
      const [user, handle] = vpa.split('@');
      co.payment = { type: 'upi', vpa: `${user.slice(0, 2)}${'•'.repeat(Math.max(2, user.length - 2))}@${handle}` };
    }
    // Never keep raw card data around.
    f.ccNumber.value = '';
    f.ccCvc.value = '';
    goStep(3);
    return undefined;
  });

  // Authorize with PIN
  const checkoutPinMsg = $('#checkoutPinMsg');
  const checkoutPad = new PinPad($('#checkoutPad'), {
    label: 'Authorize payment PIN',
    onComplete: async (v, pad) => {
      const res = await verifyPin(v);
      if (!res.ok) { handlePinFailure(res, pad, checkoutPinMsg); return; }
      pad.success();
      setMsg(checkoutPinMsg, 'PIN verified', 'ok');
      await sleep(250);
      co.busy = true;
      coEl('pinArea')[0].hidden = true;
      coEl('processing')[0].hidden = false;
      $('[data-co-back]', $('[data-co-step="3"]', dlg.checkout)).disabled = true;
      await sleep(1400);
      activateSubscription();
      co.busy = false;
      $('[data-co-back]', $('[data-co-step="3"]', dlg.checkout)).disabled = false;
      goStep(4);
      confetti();
    },
  });

  function prepareAuthorizeStep() {
    const u = currentUser();
    coEl('processing')[0].hidden = true;
    const hasPin = !!u?.pin;
    coEl('pinArea')[0].hidden = !hasPin;
    coEl('noPinArea')[0].hidden = hasPin;
    if (hasPin) {
      checkoutPad.setLength(u.pin.length);
      setMsg(checkoutPinMsg, '');
      applyPinCooldownIfAny(checkoutPad, checkoutPinMsg);
      setTimeout(() => checkoutPad.focus(), 30);
    }
  }
  $('#coSetupPin').addEventListener('click', async () => {
    const ok = await openPinSetup({ mode: 'create', reason: 'Create a PIN to authorize this subscription and protect your account.' });
    if (ok && dlg.checkout.open) prepareAuthorizeStep();
  });

  function activateSubscription() {
    const now = Date.now();
    const { total, discount } = coAmounts();
    const plan = PLANS[co.plan];
    updateUser((u) => {
      const prev = u.sub;
      u.sub = {
        plan: co.plan, cycle: co.cycle, currency: co.currency,
        amount: plan.price[co.currency][co.cycle],
        status: 'active', startedAt: now, renewsAt: addPeriod(now, co.cycle),
        cancelAtPeriodEnd: false, method: co.payment,
      };
      u.invoices = u.invoices || [];
      u.invoices.unshift({
        id: makeInvoiceId(now), date: now, plan: co.plan, cycle: co.cycle, currency: co.currency,
        amount: total, discount, promo: co.promo?.code || '', method: describeMethod(co.payment), status: 'Paid',
      });
      logActivity(u, prev && prev.status === 'active'
        ? `Plan changed: ${PLANS[prev.plan].name} → ${plan.name} (${co.cycle})`
        : `Subscribed to ${plan.name} (${co.cycle}) — authorized with PIN`);
    });
    setCo('successText', `${fmtMoney(total, co.currency)} paid with ${describeMethod(co.payment)}. Your next billing date is ${fmtDate(addPeriod(now, co.cycle))}. All ${plan.name} programs are now unlocked.`);
    co.payment = null;
  }

  $('#coGoAccount').addEventListener('click', () => {
    closeDialog(dlg.checkout);
    openAccount('subscription');
  });
  dlg.checkout.addEventListener('cancel', (e) => { if (co.busy) e.preventDefault(); });
  dlg.checkout.addEventListener('close', () => {
    checkoutPad.stopCooldown();
    co.payment = null;
    payForm.reset();
  });

  // Confetti
  function confetti() {
    if (reducedMotion) return;
    const canvas = $('#confetti');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
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
      document.getElementById('programs').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    if (u?.sub?.status === 'active' && u.sub.plan === plan && u.sub.cycle === state.billing) {
      openAccount('subscription');
      return;
    }
    openCheckout(plan);
  });

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
    renderAccount();
    fillProfileForm();
    switchAccountTab(tab);
    openDialog(dlg.account);
  }
  $('#userChip').addEventListener('click', () => openAccount());

  const accEl = (k) => $$(`[data-acc="${k}"]`, dlg.account);
  const setAcc = (k, text) => accEl(k).forEach((el) => { el.textContent = text; });

  function fillProfileForm() {
    const u = currentUser();
    if (!u) return;
    const f = $('#profileForm').elements;
    f.name.value = u.name;
    f.email.value = u.email;
    f.sport.value = u.settings?.sport || 'running';
    f.weeklyGoal.value = u.settings?.weeklyGoal || 4;
    f.goalOut.value = f.weeklyGoal.value;
  }

  function renderAccount() {
    const u = currentUser();
    if (!u) return;
    const planKey = u.sub?.status === 'active' ? u.sub.plan : 'starter';
    setAcc('avatar', initials(u.name));
    setAcc('name', u.name);
    setAcc('email', u.email);
    setAcc('planBadge', PLANS[planKey].name);
    accEl('planBadge')[0].dataset.plan = planKey;
    setAcc('since', fmtDate(u.createdAt));
    setAcc('plan', PLANS[planKey].name + (u.sub?.cancelAtPeriodEnd ? ' (ending)' : ''));
    setAcc('programs', String((u.programs || []).length));

    // Subscription
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
            <div><dt>Payment method</dt><dd>${escapeHtml(describeMethod(s.method))}</dd></div>
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
      : '<p class="empty">No invoices yet. Your receipts will appear here.</p>';

    // Security
    const hasPin = !!u.pin;
    setAcc('pinStatus', hasPin
      ? `Enabled · ${u.pin.length}-digit · set ${fmtDate(u.pin.setAt)}`
      : 'Not set — your account is protected by password only.');
    $('#pinSetupBtn').textContent = hasPin ? 'Change PIN' : 'Set up PIN';
    $('#pinRemoveBtn').hidden = !hasPin;
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
      document.getElementById('pricing').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    } else if (act === 'cancel-sub') {
      const ok = await requirePin({
        title: 'Cancel subscription?',
        sub: `Enter your PIN to confirm. You keep ${PLANS[u.sub.plan].name} until ${fmtDate(u.sub.renewsAt)}.`,
        danger: true,
      });
      if (!ok) return;
      updateUser((x) => { x.sub.cancelAtPeriodEnd = true; logActivity(x, `${PLANS[x.sub.plan].name} set to cancel at period end`); });
      renderAccount();
      toast(`Subscription cancelled. Access continues until ${fmtDate(u.sub.renewsAt)}.`);
    } else if (act === 'resume-sub') {
      updateUser((x) => { x.sub.cancelAtPeriodEnd = false; logActivity(x, `${PLANS[x.sub.plan].name} subscription resumed`); });
      renderAccount();
      toast('Welcome back — your subscription will renew as normal.', 'success');
    }
  });

  $('#invoiceView').addEventListener('click', (e) => {
    const b = e.target.closest('[data-invoice]');
    if (!b) return;
    const u = currentUser();
    const x = (u?.invoices || []).find((i) => i.id === b.dataset.invoice);
    if (!x) return;
    downloadText(`${x.id}.txt`, [
      'BDAI Sports & Health — Receipt',
      'Powered by BDAIWellness',
      '----------------------------------------',
      `Receipt:   ${x.id}`,
      `Date:      ${new Date(x.date).toLocaleString()}`,
      `Customer:  ${u.name} <${u.email}>`,
      `Plan:      BDAI ${PLANS[x.plan].name} (${x.cycle})`,
      x.discount ? `Discount:  -${fmtMoney(x.discount, x.currency)}${x.promo ? ` (${x.promo})` : ''}` : null,
      `Total:     ${fmtMoney(x.amount, x.currency)}`,
      `Paid with: ${x.method}`,
      `Status:    ${x.status}`,
      '----------------------------------------',
      'Demo receipt — no real payment was processed.',
    ].filter(Boolean).join('\n'));
  });

  // Profile
  $('#profileForm').addEventListener('input', (e) => {
    if (e.target.name === 'weeklyGoal') e.currentTarget.elements.goalOut.value = e.target.value;
  });
  $('#profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget.elements;
    const name = f.name.value.trim().replace(/\s+/g, ' ');
    if (name.length < 2) { f.name.setAttribute('aria-invalid', 'true'); f.name.focus(); toast('Please enter your name.', 'error'); return; }
    f.name.removeAttribute('aria-invalid');
    updateUser((u) => {
      u.name = name;
      u.settings = { ...u.settings, sport: f.sport.value, weeklyGoal: +f.weeklyGoal.value };
      logActivity(u, 'Profile updated');
    });
    renderAccount();
    toast('Profile saved.', 'success');
  });

  // Security actions
  $('#pinSetupBtn').addEventListener('click', async () => {
    const u = currentUser();
    const ok = await openPinSetup({ mode: u?.pin ? 'change' : 'create' });
    if (ok && dlg.account.open) renderAccount();
  });
  $('#pinRemoveBtn').addEventListener('click', async () => {
    const ok = await pinPrompt({ title: 'Remove PIN security key?', sub: 'Your account will be protected by password only, and paid upgrades will ask you to set a PIN again.', danger: true });
    if (!ok) return;
    updateUser((u) => { u.pin = null; u.recovery = null; logActivity(u, 'PIN security key removed', true); });
    renderAccount();
    toast('PIN security key removed.');
  });
  $('#regenKeyBtn').addEventListener('click', async () => {
    const ok = await pinPrompt({ title: 'Regenerate recovery key', sub: 'Your old recovery key will stop working.' });
    if (!ok) return;
    const key = generateRecoveryKey();
    const salt = randomHex();
    const hash = await deriveHash(normalizeKey(key), salt);
    updateUser((u) => { u.recovery = { salt, hash, createdAt: Date.now() }; logActivity(u, 'Recovery security key regenerated'); });
    renderAccount();
    ps.completed = true;
    showRecoveryKey(key, 'Your new recovery security key');
  });
  $('#autoLockSelect').addEventListener('change', (e) => {
    const v = +e.target.value;
    updateUser((u) => { u.settings = { ...u.settings, autoLock: v }; logActivity(u, v ? `Auto-lock set to ${v} min` : 'Auto-lock turned off'); });
    renderAccount();
    toast(v ? `BDAI will lock after ${v} minute${v === 1 ? '' : 's'} of inactivity.` : 'Auto-lock turned off.');
  });
  $('#shuffleToggle').addEventListener('change', (e) => {
    const on = e.target.checked;
    updateUser((u) => { u.settings = { ...u.settings, shuffle: on }; logActivity(u, on ? 'Scrambled keypad enabled' : 'Scrambled keypad disabled'); });
    renderAccount();
  });
  const lockNow = () => {
    const u = currentUser();
    if (!u?.pin) { toast('Set up a PIN security key first.'); openAccount('security'); return; }
    closeDialog(dlg.account);
    lock();
  };
  $('#lockNowInline').addEventListener('click', lockNow);
  $('#lockNowBtn').addEventListener('click', lockNow);

  $('#passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = form.elements;
    const u = currentUser();
    if (!u) return;
    const btn = $('button[type="submit"]', form);
    btn.classList.add('is-loading');
    const hash = await deriveHash(f.current.value, u.pw.salt);
    btn.classList.remove('is-loading');
    if (!safeEqual(hash, u.pw.hash)) { fieldError(form, 'current', 'Current password is incorrect.'); return; }
    if (f.next.value.length < 8 || pwStrength(f.next.value) < 2) { fieldError(form, 'next', 'Choose a stronger new password.'); return; }
    if (f.next.value !== f.confirm.value) { fieldError(form, 'confirm', 'New passwords don’t match.'); return; }
    const salt = randomHex();
    const newHash = await deriveHash(f.next.value, salt);
    updateUser((x) => { x.pw = { salt, hash: newHash }; logActivity(x, 'Password changed'); });
    form.reset();
    setMsg($('.form-error', form), '');
    form.closest('details').open = false;
    renderAccount();
    toast('Password updated.', 'success');
  });
  $('#passwordForm').addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));

  $('#deleteAccountBtn').addEventListener('click', async () => {
    const u = currentUser();
    if (!u) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Permanently delete the BDAI account for ${u.email}? This cannot be undone.`)) return;
    const ok = u.pin
      ? await pinPrompt({ title: 'Delete account', sub: 'Enter your PIN to permanently delete your account.', danger: true })
      : true;
    if (!ok) return;
    const email = u.email;
    logout('Your account has been deleted.');
    db.remove(email);
  });

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
    updateUser((x) => { x.programs = [...(x.programs || []), name]; logActivity(x, `Started program: ${name}`); });
    toast(`“${name}” added to your training plan. Day 1 starts tomorrow!`, 'success');
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
    $$('[data-guest]').forEach((el) => { el.hidden = !!u; });
    $$('[data-member]').forEach((el) => { el.hidden = !u; });
    $('#lockNowBtn').hidden = !u?.pin;
    if (u) {
      const planKey = u.sub?.status === 'active' ? u.sub.plan : 'starter';
      $('#chipAvatar').textContent = initials(u.name);
      $('#chipName').textContent = firstName(u.name);
      $('#chipPlan').textContent = `${PLANS[planKey].name} plan`;
    }
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
    form.addEventListener('submit', (e) => { e.preventDefault(); tools[form.dataset.tool](form); });
    form.addEventListener('change', () => tools[form.dataset.tool](form));
    tools[form.dataset.tool](form);
  });

  /* ---------------------------------------------------------
     Page chrome: theme, header, nav, reveal, counters, hero
     --------------------------------------------------------- */
  // Theme
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

  // Header shadow on scroll
  const header = $('#siteHeader');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile nav
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

  // Active nav link
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

  // Reveal on scroll (with stagger inside grids)
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

  // Feature card spotlight
  $$('.feature-card').forEach((card) => card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  // Count-up stats
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

  // Hero: date, rings, live heart-rate sparkline
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
     Boot: restore session (PIN users start locked)
     --------------------------------------------------------- */
  const saved = loadSession();
  if (saved && db.get(saved.email)) {
    state.email = saved.email;
    syncSubscription();
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
