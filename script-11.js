/* eslint no-inner-declarations: "off" -- helper functions live inside the blocks that use them */
/* =========================================================
   BDAI Young Innovators · script-11.js
   Plain JavaScript, no frameworks. Each numbered block powers one
   part of index-11.html.

   index-11.html holds two views: the website, and the Student
   Portal (index-11.html#student-portal), which opens in its own
   window. Python runs in the browser with Skulpt 1.2.0 (MIT
   licence, https://skulpt.org), loaded from the jsDelivr CDN the
   first time someone runs Python.
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const COLORS = {
    ink: "#14152a",
    cyan: "#3fd6ee",
    violet: "#8b6bff",
    pink: "#f06aa8",
    mint: "#6ee7b7",
    sun: "#ffd166",
    text: "#eef0ff",
  };

  // localStorage can be blocked (private windows, sandboxes). Never let it break the page.
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

  /* =======================================================
     0. Page views: website or Student Portal window
     -------------------------------------------------------
     #student-portal, #inbox and #founder-access show the portal window;
     #home or any other address shows the website.
     ======================================================= */
  const PORTAL_HASHES = ["#student-portal", "#founder-access", "#inbox"];
  const siteView = $("#site");
  const portalView = $("#portalView");
  function showView() {
    if (!siteView || !portalView) return;
    const inPortal = PORTAL_HASHES.includes(location.hash);
    siteView.hidden = inPortal;
    portalView.hidden = !inPortal;
    const inInbox = location.hash === "#inbox";
    document.title = inPortal ? (inInbox ? "BDAI Inbox" : "BDAI Student Portal") : "BDAI Young Innovators";
    const tag = $("#portalTag"); if (tag) tag.textContent = inInbox ? "Inbox" : "Student Portal";
    if (inPortal || location.hash === "#home" || !location.hash) { window.scrollTo(0, 0); return; }
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
  window.addEventListener("hashchange", showView);
  showView();

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3000);
  }

  /* =======================================================
     1. Navigation: mobile menu + active section highlight
     ======================================================= */
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      navLinks.classList.toggle("is-open", !open);
    });
    $$("a", navLinks).forEach((a) => a.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      navLinks.classList.remove("is-open");
    }));

    if ("IntersectionObserver" in window) {
      const map = new Map($$("a", navLinks).map((a) => [a.getAttribute("href").slice(1), a]));
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const link = map.get(en.target.id);
          if (link && en.isIntersecting) {
            map.forEach((l) => l.classList.remove("is-active"));
            link.classList.add("is-active");
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* =======================================================
     2. Hero aura: soft drifting light, echoing the Databell logo
     ======================================================= */
  const aura = $("#aura");
  if (aura) {
    const ctx = aura.getContext("2d");
    const blobs = [
      { c: COLORS.pink,   x: 0.72, y: 0.30, r: 0.34, sx: 0.00021, sy: 0.00017, p: 0 },
      { c: COLORS.violet, x: 0.86, y: 0.62, r: 0.40, sx: 0.00015, sy: 0.00023, p: 2 },
      { c: COLORS.cyan,   x: 0.62, y: 0.78, r: 0.30, sx: 0.00019, sy: 0.00013, p: 4 },
      { c: COLORS.violet, x: 0.10, y: 0.10, r: 0.26, sx: 0.00012, sy: 0.00018, p: 1 },
    ];
    let w = 0, h = 0;
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = aura.clientWidth; h = aura.clientHeight;
      aura.width = Math.round(w * dpr); aura.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const base = Math.max(w, h);
      blobs.forEach((b) => {
        const x = (b.x + Math.sin(t * b.sx + b.p) * 0.06) * w;
        const y = (b.y + Math.cos(t * b.sy + b.p) * 0.08) * h;
        const r = b.r * base * (1 + Math.sin(t * 0.0004 + b.p) * 0.05);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, b.c + "55");
        g.addColorStop(0.5, b.c + "1c");
        g.addColorStop(1, b.c + "00");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
    }
    let raf;
    function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
    size();
    window.addEventListener("resize", () => { size(); if (reduceMotion) draw(0); });
    if (reduceMotion) draw(0);
    else {
      raf = requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) cancelAnimationFrame(raf);
        else raf = requestAnimationFrame(loop);
      });
    }
  }

  /* =======================================================
     3. Hero terminal: a first program that re-runs itself
     ======================================================= */
  const codeEl = $("#typeCode");
  const outEl = $("#typeOut");
  if (codeEl && outEl) {
    const runs = [
      { w: "rainy", say: "Umbrella time!" },
      { w: "snowy", say: "Build a snowman!" },
      { w: "sunny", say: "Sunglasses on!" },
    ];
    const render = (value, caret) =>
      '<span class="c"># my first robot: dress for the weather</span>\n' +
      'weather = <span class="s">"' + esc(value) + '"</span>' + (caret ? '<span class="caret"></span>' : "") + "\n\n" +
      '<span class="k">if</span> weather == <span class="s">"rainy"</span>:\n' +
      '    robot.<span class="f">say</span>(<span class="s">"Umbrella time!"</span>)\n' +
      '<span class="k">elif</span> weather == <span class="s">"snowy"</span>:\n' +
      '    robot.<span class="f">say</span>(<span class="s">"Build a snowman!"</span>)\n' +
      '<span class="k">else</span>:\n' +
      '    robot.<span class="f">say</span>(<span class="s">"Sunglasses on!"</span>)';

    let i = 0;
    codeEl.innerHTML = render(runs[0].w, false);
    outEl.textContent = 'robot says "' + runs[0].say + '"';

    if (!reduceMotion) {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      (async function cycle() {
        for (;;) {
          await wait(2600);
          const from = runs[i].w;
          i = (i + 1) % runs.length;
          const to = runs[i].w;
          outEl.textContent = "…";
          for (let n = from.length; n >= 0; n--) { codeEl.innerHTML = render(from.slice(0, n), true); await wait(55); }
          for (let n = 1; n <= to.length; n++) { codeEl.innerHTML = render(to.slice(0, n), true); await wait(95); }
          await wait(300);
          codeEl.innerHTML = render(to, false);
          outEl.textContent = 'robot says "' + runs[i].say + '"';
        }
      })();
    }
  }

  /* =======================================================
     4. Learning tracks by level
     ======================================================= */
  const TRACKS = {
    tech: {
      explorer: ["Light up an LED with a paper circuit", "Guide a floor robot through a maze", "Tell a story with block code"],
      builder: ["Program a traffic light on a microcontroller", "Code a step-counter wristband", "Build your first web page"],
      innovator: ["Build a weather station in Python", "Wire up a line-following robot car", "Publish a website with HTML, CSS and JS"],
    },
    create: {
      explorer: ["Paint a digital poster", "Animate an 8-frame flip-book", "Compose a beat with shapes"],
      builder: ["Design a comic strip", "Shoot a stop-motion short", "Style a web page with CSS"],
      innovator: ["Code generative art in JavaScript", "Design a brand for a school club", "Score music for an animation"],
    },
    ai: {
      explorer: ["Sort pictures like a robot does", "Play spot-the-pattern games", "Talk about why computers make mistakes"],
      builder: ["Train a rock-paper-scissors detector", "Teach a model to sort fruit", "Find the bias in a tiny dataset"],
      innovator: ["Build a chatbot with safety rules", "Train an image classifier in Python", "Debate who is responsible when AI is wrong"],
    },
  };
  const LEVEL_NAMES = { explorer: "Explorer", builder: "Builder", innovator: "Innovator" };
  const TRACK_INFO = {
    tech: { name: "Technology", full: "Technology for Kids", tone: COLORS.cyan },
    create: { name: "Creativity", full: "Digital Creativity", tone: COLORS.pink },
    ai: { name: "AI", full: "Artificial Intelligence", tone: COLORS.violet },
  };
  const bandForAge = (age) => (age <= 8 ? "explorer" : age <= 12 ? "builder" : "innovator");

  function showLevel(level) {
    $$("#levelSeg button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.level === level)));
    $$(".track__list").forEach((ul) => {
      const items = TRACKS[ul.dataset.track][level];
      ul.innerHTML = items.map((t, n) => '<li style="animation-delay:' + n * 60 + 'ms">' + esc(t) + "</li>").join("");
    });
    store.set("bdai.level", level);
  }
  $$("#levelSeg button").forEach((b) => b.addEventListener("click", () => showLevel(b.dataset.level)));
  const savedLevel = store.get("bdai.level", "explorer");
  showLevel(TRACKS.tech[savedLevel] ? savedLevel : "explorer");

  /* =======================================================
     5. Paint Studio
     ======================================================= */
  const pc = $("#paintCanvas");
  if (pc) {
    const g = pc.getContext("2d", { willReadFrequently: true });
    const PW = pc.width, PH = pc.height;
    const PAPER = "#ffffff";
    const PAINTS = ["#14152a", "#ffffff", "#f06aa8", "#ff5d5d", "#ff8a4c", "#ffd166", "#6ee7b7", "#2fb36b", "#3fd6ee", "#2f6bff", "#8b6bff", "#8b5a3c"];
    let tool = "brush";
    let color = "#3fd6ee";
    let size = 14;
    let filled = false;
    const undoStack = [];
    const redoStack = [];

    // colours
    const colorsEl = $("#paintColors");
    colorsEl.innerHTML = PAINTS.map((c, n) =>
      '<button class="swatch" role="radio" id="paint-c' + n + '" aria-checked="' + (c === color) + '" aria-label="Colour ' + c + '" data-c="' + c + '" style="background:' + c + '"></button>').join("");
    function pickColor(c) {
      color = c;
      $$(".swatch", colorsEl).forEach((s) => s.setAttribute("aria-checked", String(s.dataset.c === c)));
      if (tool === "eraser") setTool("brush");
    }
    colorsEl.addEventListener("click", (e) => { const b = e.target.closest(".swatch"); if (b) pickColor(b.dataset.c); });
    $("#paintCustom").addEventListener("input", (e) => pickColor(e.target.value));

    function setTool(t) {
      tool = t;
      $$(".ptool").forEach((b) => {
        const on = b.dataset.ptool === t;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
    }
    $$(".ptool").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.ptool)));

    const sizeEl = $("#paintSize");
    sizeEl.addEventListener("input", () => { size = Number(sizeEl.value); $("#paintSizeVal").textContent = size; });
    $("#paintFilled").addEventListener("change", (e) => { filled = e.target.checked; });

    // history
    function pushUndo() {
      undoStack.push(g.getImageData(0, 0, PW, PH));
      if (undoStack.length > 25) undoStack.shift();
      redoStack.length = 0;
    }
    $("#paintUndo").addEventListener("click", () => {
      if (!undoStack.length) return;
      redoStack.push(g.getImageData(0, 0, PW, PH));
      g.putImageData(undoStack.pop(), 0, 0);
      save();
    });
    $("#paintRedo").addEventListener("click", () => {
      if (!redoStack.length) return;
      undoStack.push(g.getImageData(0, 0, PW, PH));
      g.putImageData(redoStack.pop(), 0, 0);
      save();
    });
    $("#paintClear").addEventListener("click", () => {
      pushUndo();
      g.fillStyle = PAPER; g.fillRect(0, 0, PW, PH);
      save();
      toast("Fresh canvas. Press Undo if you want your painting back.");
    });

    let saveTimer;
    function save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { try { store.set("bdai.paint", pc.toDataURL("image/png")); } catch (e) { /* ignore */ } }, 250);
    }

    // drawing helpers
    function hexToRgb(hex) {
      const h = hex.replace("#", "");
      const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function drawStar(cx, cy, r, fill) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.closePath();
      g.fillStyle = fill; g.fill();
    }
    function shape(kind, a, b) {
      g.strokeStyle = color; g.fillStyle = color;
      g.lineWidth = size; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath();
      if (kind === "line") { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); return; }
      if (kind === "rect") g.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      if (kind === "ellipse") g.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
      if (filled) g.fill(); else g.stroke();
    }
    function floodFill(sx, sy, hex) {
      sx = Math.floor(sx); sy = Math.floor(sy);
      if (sx < 0 || sy < 0 || sx >= PW || sy >= PH) return;
      const img = g.getImageData(0, 0, PW, PH);
      const d = img.data;
      const [r, gg, b] = hexToRgb(hex);
      const i0 = (sy * PW + sx) * 4;
      const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
      if (Math.abs(tr - r) + Math.abs(tg - gg) + Math.abs(tb - b) < 6) return;
      const tol = 70;
      const seen = new Uint8Array(PW * PH);
      const stack = [sy * PW + sx];
      while (stack.length) {
        const p = stack.pop();
        if (seen[p]) continue;
        const i = p * 4;
        if (Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) + Math.abs(d[i + 3] - ta) > tol) continue;
        seen[p] = 1;
        d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
        const x = p % PW;
        if (x > 0) stack.push(p - 1);
        if (x < PW - 1) stack.push(p + 1);
        if (p >= PW) stack.push(p - PW);
        if (p < PW * (PH - 1)) stack.push(p + PW);
      }
      g.putImageData(img, 0, 0);
    }

    // pointer handling
    const pos = (e) => {
      const r = pc.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * PW, y: ((e.clientY - r.top) / r.height) * PH };
    };
    let down = false, start = null, last = null, base = null, sprayRaf = 0;
    function stroke(a, b, c) {
      g.strokeStyle = c; g.lineWidth = size; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    function spray() {
      if (!down || !last) return;
      g.fillStyle = color;
      const rad = size * 1.6 + 6;
      for (let n = 0; n < size * 2 + 10; n++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * rad;
        g.fillRect(last.x + Math.cos(a) * d, last.y + Math.sin(a) * d, 2, 2);
      }
      sprayRaf = requestAnimationFrame(spray);
    }
    pc.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const p = pos(e);
      pushUndo();
      if (tool === "fill") { floodFill(p.x, p.y, color); save(); return; }
      if (tool === "star") { drawStar(p.x, p.y, size * 2.2 + 10, color); save(); return; }
      down = true; start = p; last = p;
      base = undoStack[undoStack.length - 1];
      try { pc.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (tool === "brush" || tool === "eraser") stroke(p, { x: p.x + 0.1, y: p.y }, tool === "eraser" ? PAPER : color);
      if (tool === "spray") spray();
    });
    pc.addEventListener("pointermove", (e) => {
      if (!down) return;
      const p = pos(e);
      if (tool === "brush" || tool === "eraser") stroke(last, p, tool === "eraser" ? PAPER : color);
      else if (tool === "line" || tool === "rect" || tool === "ellipse") { g.putImageData(base, 0, 0); shape(tool, start, p); }
      last = p;
    });
    const end = () => {
      if (!down) return;
      down = false; cancelAnimationFrame(sprayRaf); save();
    };
    pc.addEventListener("pointerup", end);
    pc.addEventListener("pointercancel", end);

    // starting picture: a little example painting
    function exampleScene() {
      g.fillStyle = PAPER; g.fillRect(0, 0, PW, PH);
      g.fillStyle = "#d6f3ff"; g.fillRect(0, 0, PW, 520);
      // sun
      g.strokeStyle = COLORS.sun; g.lineWidth = 10; g.lineCap = "round";
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        g.beginPath(); g.moveTo(1030 + Math.cos(a) * 95, 140 + Math.sin(a) * 95); g.lineTo(1030 + Math.cos(a) * 125, 140 + Math.sin(a) * 125); g.stroke();
      }
      g.fillStyle = COLORS.sun; g.beginPath(); g.arc(1030, 140, 72, 0, Math.PI * 2); g.fill();
      // clouds
      g.fillStyle = "#ffffff";
      [[220, 150, 60], [290, 125, 70], [370, 155, 55], [610, 95, 40], [660, 80, 48], [710, 100, 38]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
      // hills
      g.fillStyle = "#6ee7b7"; g.beginPath(); g.ellipse(280, 780, 560, 300, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#3fbf86"; g.beginPath(); g.ellipse(980, 800, 560, 330, 0, 0, Math.PI * 2); g.fill();
      // house
      g.fillStyle = COLORS.pink; g.fillRect(470, 330, 260, 200);
      g.fillStyle = COLORS.violet; g.beginPath(); g.moveTo(440, 335); g.lineTo(600, 215); g.lineTo(760, 335); g.closePath(); g.fill();
      g.fillStyle = COLORS.ink; g.fillRect(570, 420, 62, 110);
      g.fillStyle = "#ffffff"; g.fillRect(500, 368, 54, 54); g.fillRect(650, 368, 54, 54);
      g.strokeStyle = COLORS.pink; g.lineWidth = 5;
      [[527, 368, 527, 422], [500, 395, 554, 395], [677, 368, 677, 422], [650, 395, 704, 395]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
      // tree
      g.fillStyle = "#8b5a3c"; g.fillRect(880, 360, 34, 170);
      g.fillStyle = "#2fb36b"; g.beginPath(); g.arc(897, 330, 82, 0, Math.PI * 2); g.fill();
      // flowers
      [[160, 610, COLORS.pink], [230, 650, COLORS.sun], [330, 620, "#ff8a4c"], [1080, 620, COLORS.pink], [1150, 660, COLORS.sun]].forEach(([x, y, c]) => {
        g.strokeStyle = "#2fb36b"; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 50); g.stroke();
        g.fillStyle = c; g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
      });
      drawStar(130, 70, 26, COLORS.violet);
    }
    const savedPaint = store.get("bdai.paint", null);
    exampleScene();
    if (typeof savedPaint === "string" && savedPaint.indexOf("data:image/png") === 0) {
      const img = new Image();
      img.onload = () => { g.drawImage(img, 0, 0, PW, PH); };
      img.src = savedPaint;
    }

    // challenge game
    const CHALLENGES = [
      "Paint a robot that waters plants.",
      "Paint your dream school in the year 2050.",
      "Paint a friendly alien learning to code.",
      "Paint a city that runs on sunshine.",
      "Paint your favourite animal as a superhero.",
      "Paint a machine that makes rainbows.",
      "Paint the view from a rocket window.",
      "Paint a treehouse with its own Wi-Fi.",
      "Paint what a computer dreams about.",
      "Paint a park where robots and people play together.",
    ];
    let ci = 0, timeLeft = 90, timer = 0;
    const tText = $("#challengeText"), tTime = $("#challengeTimer"), tStart = $("#challengeStart");
    const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    function stopTimer(reset) {
      clearInterval(timer); timer = 0;
      tStart.textContent = "Start 90 seconds";
      if (reset) { timeLeft = 90; tTime.textContent = fmt(timeLeft); tTime.classList.remove("is-low"); }
    }
    $("#challengeNew").addEventListener("click", () => {
      let n; do { n = Math.floor(Math.random() * CHALLENGES.length); } while (n === ci);
      ci = n; tText.textContent = CHALLENGES[ci];
      stopTimer(true);
    });
    tStart.addEventListener("click", () => {
      if (timer) { stopTimer(true); return; }
      timeLeft = 90; tTime.textContent = fmt(timeLeft);
      tStart.textContent = "Stop timer";
      timer = setInterval(() => {
        timeLeft--;
        tTime.textContent = fmt(Math.max(0, timeLeft));
        tTime.classList.toggle("is-low", timeLeft <= 10);
        if (timeLeft <= 0) {
          stopTimer(false);
          toast("Time's up! Brushes down. Show your painting at Sunday's show and tell.");
        }
      }, 1000);
    });
  }

  /* =======================================================
     6. Code Studio: Python, JavaScript, HTML, CSS, single file
     ======================================================= */
  const ideCode = $("#ideCode");
  if (ideCode) {

    const CSS_BASE_HTML =
      '<div class="card">\n  <h1>Space Club</h1>\n  <p>We meet every Friday to talk about planets, rockets and stars.</p>\n  <button>Join the club</button>\n</div>';

    const LANGS = {
      python: {
        file: "main.py", indent: "    ", title: "Output",
        examples: [
          { name: "Rainbow star (turtle)", code:
`# Draw a rainbow star with the turtle
import turtle

t = turtle.Turtle()
t.speed(0)
t.width(2)
t.penup()
t.goto(-75, -12)
t.pendown()

colors = ["#f06aa8", "#8b6bff", "#3fd6ee", "#2fb36b", "#ffb703"]

for i in range(36):
    t.color(colors[i % len(colors)])
    t.forward(150)
    t.left(170)

t.hideturtle()
print("Done! The star has", 36, "lines.")
` },
          { name: "Times tables", code:
`# Print a times table
number = 7

for i in range(1, 11):
    print(number, "x", i, "=", number * i)
` },
          { name: "Guess the number", code:
`# A guessing game. Type your answers in the output panel.
import random

secret = random.randint(1, 20)
print("I'm thinking of a number from 1 to 20.")

for turn in range(5):
    guess = int(input("Your guess: "))
    if guess == secret:
        print("You got it in", turn + 1, "tries!")
        break
    elif guess < secret:
        print("Higher!")
    else:
        print("Lower!")
else:
    print("Out of turns. It was", secret)
` },
        ],
      },
      js: {
        file: "main.js", indent: "  ", title: "Console",
        examples: [
          { name: "Rocket countdown", code:
`// Count down, then launch the rocket
for (let i = 5; i > 0; i--) {
  console.log(i + "...");
}
console.log("Lift off!");
` },
          { name: "Fun with lists", code:
`const pets = ["cat", "dog", "parrot", "turtle"];

console.log("My pets:", pets.join(", "));
console.log("Shouting:", pets.map(p => p.toUpperCase()));

const longest = pets.reduce((a, b) => (a.length >= b.length ? a : b));
console.log("Longest name:", longest);
console.log("How many?", pets.length);
` },
        ],
      },
      html: {
        file: "index.html", indent: "  ", title: "Web page",
        examples: [
          { name: "My first web page", code:
`<h1>Hello, I'm Mira!</h1>
<p>I am learning to code at <b>BDAI</b>.</p>

<h2>Things I love</h2>
<ul>
  <li>Painting</li>
  <li>Robots</li>
  <li>Space</li>
</ul>

<button onclick="this.textContent = 'You clicked me!'">Click me</button>
` },
        ],
      },
      css: {
        file: "style.css", indent: "  ", title: "Styled page",
        examples: [
          { name: "Style a club card", code:
`body {
  font-family: Arial, sans-serif;
  background: #14152a;
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
}

.card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  max-width: 280px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

h1 {
  color: #8b6bff;
  margin-top: 0;
}

button {
  background: #3fd6ee;
  border: none;
  padding: 10px 18px;
  border-radius: 99px;
  font-weight: bold;
}
` },
        ],
      },
      single: {
        file: "app.html", indent: "  ", title: "App",
        examples: [
          { name: "Star counter app", code:
`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 24px; background: #fdf6ff; }
    #count { font-size: 64px; font-weight: bold; color: #8b6bff; margin: 8px; }
    button { font-size: 18px; padding: 10px 20px; border-radius: 12px; border: none; background: #f06aa8; color: white; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Star Counter</h1>
  <div id="count">0</div>
  <button id="add">Add a star</button>

  <script>
    let stars = 0;
    document.getElementById("add").addEventListener("click", () => {
      stars = stars + 1;
      document.getElementById("count").textContent = stars;
      console.log("Stars:", stars);
    });
  </script>
</body>
</html>
` },
          { name: "Colour mixer", code:
`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    #box { height: 120px; border-radius: 16px; margin-top: 12px; }
    label { display: block; margin: 6px 0; }
  </style>
</head>
<body>
  <h2>Mix a colour</h2>
  <label>Red <input type="range" id="r" min="0" max="255" value="240"></label>
  <label>Green <input type="range" id="g" min="0" max="255" value="106"></label>
  <label>Blue <input type="range" id="b" min="0" max="255" value="168"></label>
  <div id="box"></div>

  <script>
    function mix() {
      const r = document.getElementById("r").value;
      const g = document.getElementById("g").value;
      const b = document.getElementById("b").value;
      document.getElementById("box").style.background = "rgb(" + r + "," + g + "," + b + ")";
    }
    document.querySelectorAll("input").forEach(i => i.addEventListener("input", mix));
    mix();
  </script>
</body>
</html>
` },
        ],
      },
    };

    const gutter = $("#ideGutter");
    const consoleEl = $("#ideConsole");
    const statusEl = $("#ideStatus");
    const previewWrap = $("#previewWrap");
    const turtleWrap = $("#turtleWrap");
    const exampleSel = $("#ideExample");
    const runBtn = $("#ideRun");
    const stopBtn = $("#ideStop");

    let lang = store.get("bdai.code.lang", "python");
    if (!LANGS[lang]) lang = "python";
    let runId = 0;
    let frame = null;
    let pyRunning = false;
    let stopRequested = false;
    let pendingInput = null;
    let streamEl = null;

    // ----- console -----
    function clearConsole() { consoleEl.innerHTML = ""; streamEl = null; }
    function logLine(text, kind) {
      const d = document.createElement("div");
      d.className = "ln-" + (kind || "out");
      d.textContent = text;
      consoleEl.appendChild(d);
      streamEl = null;
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
    function stream(text) {
      if (!streamEl) {
        streamEl = document.createElement("span");
        streamEl.className = "ln-out";
        consoleEl.appendChild(streamEl);
      }
      streamEl.textContent += text;
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
    function setStatus(text, kind) {
      statusEl.textContent = text;
      statusEl.className = "output__status" + (kind ? " is-" + kind : "");
    }

    // ----- editor -----
    function updateGutter() {
      const n = ideCode.value.split("\n").length;
      let s = "";
      for (let i = 1; i <= n; i++) s += i + (i < n ? "\n" : "");
      gutter.textContent = s;
      gutter.scrollTop = ideCode.scrollTop;
    }
    function insertText(text) {
      ideCode.focus();
      let ok = false;
      try { ok = document.execCommand("insertText", false, text); } catch (e) { ok = false; }
      if (!ok) {
        ideCode.setRangeText(text, ideCode.selectionStart, ideCode.selectionEnd, "end");
        ideCode.dispatchEvent(new Event("input"));
      }
    }
    let escPressed = false;
    ideCode.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); return; }
      if (e.key === "Escape") { escPressed = true; return; }
      if (e.key === "Tab") {
        if (escPressed || e.shiftKey) { escPressed = false; return; }
        e.preventDefault();
        insertText(LANGS[lang].indent);
        return;
      }
      escPressed = false;
      if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
        const before = ideCode.value.slice(0, ideCode.selectionStart);
        const line = before.slice(before.lastIndexOf("\n") + 1);
        let indent = (line.match(/^[ \t]*/) || [""])[0];
        const trimmed = line.trimEnd();
        if ((lang === "python" && trimmed.endsWith(":")) || (lang !== "python" && /[{([]$/.test(trimmed))) indent += LANGS[lang].indent;
        e.preventDefault();
        insertText("\n" + indent);
      }
    });
    let saveTimer, liveTimer;
    ideCode.addEventListener("input", () => {
      updateGutter();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => store.set("bdai.code." + lang, ideCode.value), 300);
      if (lang === "html" || lang === "css" || lang === "single") {
        clearTimeout(liveTimer);
        liveTimer = setTimeout(run, 700); // live preview for web pages
      }
    });
    ideCode.addEventListener("scroll", () => { gutter.scrollTop = ideCode.scrollTop; });

    // ----- language + examples -----
    function selectLang(next, opts) {
      lang = next;
      store.set("bdai.code.lang", lang);
      const L = LANGS[lang];
      $$("#ideLangs [role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.lang === lang)));
      $("#ideFile").textContent = L.file;
      $("#outputTitle").textContent = L.title;
      exampleSel.innerHTML = L.examples.map((ex, n) => '<option value="' + n + '">' + esc(ex.name) + "</option>").join("");
      const saved = store.get("bdai.code." + lang, null);
      ideCode.value = typeof saved === "string" ? saved : L.examples[0].code;
      updateGutter();
      previewWrap.hidden = !(lang === "html" || lang === "css" || lang === "single");
      turtleWrap.hidden = true;
      clearConsole();
      setStatus("Ready");
      if (!(opts && opts.noRun) && !/\binput\s*\(/.test(ideCode.value)) run();
      else logLine("Press Run ▶ (or Ctrl + Enter) to start your program.", "info");
    }
    $$("#ideLangs [role=tab]").forEach((b) => b.addEventListener("click", () => { if (!pyRunning) selectLang(b.dataset.lang); }));
    exampleSel.addEventListener("change", () => {
      ideCode.value = LANGS[lang].examples[Number(exampleSel.value)].code;
      updateGutter();
      store.set("bdai.code." + lang, ideCode.value);
      if (!/\binput\s*\(/.test(ideCode.value)) run();
      else { clearConsole(); turtleWrap.hidden = true; logLine("This program asks questions. Press Run ▶ to play.", "info"); }
    });
    $("#ideReset").addEventListener("click", () => {
      ideCode.value = LANGS[lang].examples[Number(exampleSel.value) || 0].code;
      updateGutter();
      store.set("bdai.code." + lang, ideCode.value);
      toast("Example code restored.");
    });
    runBtn.addEventListener("click", run);
    stopBtn.addEventListener("click", () => {
      stopRequested = true;
      if (pendingInput) { const p = pendingInput; pendingInput = null; p.cancel(); }
    });

    // ----- web runner (JS, HTML, CSS, single file) in a sandboxed frame -----
    function bridge(id) {
      // one line on purpose, so error line numbers stay correct
      return '<script>(function(){var id=' + id + ';function f(x){if(typeof x==="string")return x;try{var j=JSON.stringify(x);return j===undefined?String(x):j}catch(e){return String(x)}}' +
        'function s(t,a,l){try{parent.postMessage({bdai:id,type:t,line:l||0,text:Array.prototype.map.call(a,f).join(" ")},"*")}catch(e){}}' +
        '["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){s(k,arguments);if(o)o.apply(console,arguments)}});' +
        'window.onerror=function(m,u,l){s("error",[m],l)};' +
        'window.addEventListener("unhandledrejection",function(e){s("error",["Unhandled promise: "+e.reason])});' +
        'window.alert=function(m){s("info",["alert: "+m])};window.prompt=function(m){s("info",["prompt() is not available here"]);return null};window.confirm=function(){return false};' +
        'window.addEventListener("load",function(){s("done",[])});})();</script>';
    }
    function injectBridge(doc, id) {
      const b = bridge(id);
      if (/<head[^>]*>/i.test(doc)) return doc.replace(/<head[^>]*>/i, (m) => m + b);
      if (/<html[^>]*>/i.test(doc)) return doc.replace(/<html[^>]*>/i, (m) => m + b);
      return b + doc;
    }
    let lineOffset = 0;
    function runWeb(code) {
      runId++;
      const id = runId;
      let doc;
      if (lang === "js") {
        lineOffset = 1;
        doc = '<!DOCTYPE html><html><head><meta charset="utf-8">' + bridge(id) + "</head><body><script>\n" +
          code.replace(/<\/script/gi, "<\\/script") + "\n</script></body></html>";
      } else if (lang === "css") {
        lineOffset = 0;
        doc = '<!DOCTYPE html><html><head><meta charset="utf-8">' + bridge(id) + "<style>" + code + "</style></head><body>" + CSS_BASE_HTML + "</body></html>";
      } else {
        lineOffset = 0;
        doc = injectBridge(code, id);
      }
      const next = document.createElement("iframe");
      next.setAttribute("sandbox", "allow-scripts allow-forms");
      next.setAttribute("title", "Program output");
      next.srcdoc = doc;
      if (frame) frame.remove();
      frame = next;
      if (lang === "js") { next.style.display = "none"; document.body.appendChild(next); }
      else { previewWrap.innerHTML = ""; previewWrap.appendChild(next); }
      setStatus("Running…", "busy");
    }
    let webErrors = 0;
    window.addEventListener("message", (e) => {
      const m = e.data;
      if (!m || m.bdai !== runId || !frame || e.source !== frame.contentWindow) return;
      if (m.type === "done") {
        setStatus(webErrors ? "Finished with errors" : "Finished", webErrors ? "err" : "ok");
        if (lang === "js" && !consoleEl.querySelector("div")) logLine("(Your program finished without printing anything. Try console.log)", "info");
        return;
      }
      let text = m.text;
      if (m.type === "error") {
        webErrors++;
        if (m.line) text += "  (line " + Math.max(1, m.line - lineOffset) + ")";
      }
      logLine(text, m.type === "error" ? "err" : m.type === "warn" ? "warn" : m.type === "info" ? "info" : "out");
    });

    // ----- Python runner (Skulpt) -----
    // Skulpt 1.2.0 loads from jsDelivr the first time Python runs. The integrity
    // fingerprints make the browser refuse any file that differs from the tested one.
    const SKULPT_FILES = [
      { src: "https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js",
        integrity: "sha384-xKdsXwmsmIOznHB5nMknv/xlle/iCeNcEabalNUx5oSJIBHdxM1Qfnb50Y/w1zRU" },
      { src: "https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js",
        integrity: "sha384-b3ccRbwiT8uaTe6Waa6GHLF96Yp3wDxTEVKf885pMqeZUqj4hG2zY3rwMD7WmX1g" },
    ];
    let skulptLoading = null;
    function loadScript(file) {
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = file.src;
        s.integrity = file.integrity;
        s.crossOrigin = "anonymous";
        s.onload = resolve;
        s.onerror = () => { s.remove(); reject(new Error("couldn't download " + file.src.split("/").pop())); };
        document.head.appendChild(s);
      });
    }
    function ensureSkulpt() {
      if (window.Sk && window.Sk.builtinFiles) return Promise.resolve();
      if (!skulptLoading) {
        skulptLoading = loadScript(SKULPT_FILES[0])
          .then(() => loadScript(SKULPT_FILES[1]))
          .catch((err) => { skulptLoading = null; throw err; });
      }
      return skulptLoading;
    }
    function builtinRead(x) {
      if (!window.Sk.builtinFiles || window.Sk.builtinFiles.files[x] === undefined) throw new Error("File not found: '" + x + "'");
      return window.Sk.builtinFiles.files[x];
    }
    function askInput(promptText) {
      if (promptText) stream(String(promptText));
      return new Promise((resolve, reject) => {
        const form = document.createElement("form");
        form.className = "console__ask";
        const inp = document.createElement("input");
        inp.type = "text"; inp.id = "pyInput" + Date.now(); inp.setAttribute("aria-label", "Type your answer");
        const btn = document.createElement("button");
        btn.type = "submit"; btn.className = "tool tool--small"; btn.textContent = "Enter";
        form.append(inp, btn);
        consoleEl.appendChild(form);
        streamEl = null;
        consoleEl.scrollTop = consoleEl.scrollHeight;
        try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
        setStatus("Waiting for you…", "busy");
        const done = (val) => {
          form.remove();
          stream(val + "\n");
          setStatus("Running…", "busy");
          pendingInput = null;
          resolve(val);
        };
        pendingInput = {
          cancel() { form.remove(); reject(new Error("Stopped")); },
        };
        form.addEventListener("submit", (e) => { e.preventDefault(); done(inp.value); });
      });
    }
    async function runPython(code) {
      pyRunning = true;
      stopRequested = false;
      runBtn.hidden = true; stopBtn.hidden = false;
      const usesTurtle = /\bturtle\b/.test(code);
      turtleWrap.hidden = !usesTurtle;
      $("#turtleTarget").innerHTML = "";
      setStatus("Loading Python…", "busy");
      try {
        await ensureSkulpt();
      } catch (err) {
        logLine("Python needs an internet connection to start, and it " + err.message + ". Check the connection and press Run again.", "err");
        setStatus("Error", "err");
        pyRunning = false; runBtn.hidden = false; stopBtn.hidden = true;
        return;
      }
      const Sk = window.Sk;
      setStatus("Running…", "busy");
      Sk.configure({
        output: (t) => stream(t),
        read: builtinRead,
        __future__: Sk.python3,
        inputfunTakesPrompt: true,
        inputfun: askInput,
        yieldLimit: 100,
        killableWhile: true,
        killableFor: true,
      });
      if (usesTurtle) {
        const w = Math.max(260, Math.min(560, turtleWrap.clientWidth || 480));
        Sk.TurtleGraphics = Sk.TurtleGraphics || {};
        Sk.TurtleGraphics.target = "turtleTarget";
        Sk.TurtleGraphics.width = w;
        Sk.TurtleGraphics.height = Math.round(w * 0.6);
        if (typeof Sk.TurtleGraphics.reset === "function") Sk.TurtleGraphics.reset();
      }
      try {
        await Sk.misceval.asyncToPromise(
          () => Sk.importMainWithBody("<stdin>", false, code, true),
          { "*": () => { if (stopRequested) throw new Error("Stopped"); } }
        );
        setStatus("Finished", "ok");
      } catch (err) {
        const msg = err && err.toString ? err.toString() : String(err);
        if (stopRequested) { logLine("Program stopped.", "info"); setStatus("Stopped"); }
        else { logLine(msg, "err"); setStatus("Error", "err"); }
      } finally {
        pyRunning = false;
        runBtn.hidden = false; stopBtn.hidden = true;
        if (pendingInput) { const p = pendingInput; pendingInput = null; p.cancel(); }
      }
    }

    function run() {
      if (pyRunning) return;
      clearConsole();
      webErrors = 0;
      const code = ideCode.value;
      store.set("bdai.code." + lang, code);
      if (lang === "python") { if (frame) { frame.remove(); frame = null; } runPython(code); }
      else runWeb(code);
    }

    selectLang(lang, { noRun: true });
    // Run the first example once the studio scrolls into view (keeps page load light).
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          io.disconnect();
          if (!/\binput\s*\(/.test(ideCode.value)) run();
        }
      }, { threshold: 0.2 });
      io.observe($("#ide"));
    } else run();
  }

  /* =======================================================
     7. Student Portal (index-11.html#student-portal)
        Accounts for students, parents, teachers and founders:
        courses, badges, events, PIN and security key, plus the
        inbox page (index-11.html#inbox) with firstname.lastname@
        st-portal.tech.databell.inbox.bdai addresses.
     -------------------------------------------------------
     PREVIEW MODE. Accounts and messages live in this browser's
     storage so the whole flow can be tried without a server.
     Before launch, replace `Accounts` with calls to your backend
     and check passwords, PINs and codes on the server.
     ======================================================= */
  const portalApp = $("#portalApp");
  if (portalApp) {
    const BULB_SRC = ($(".brand img") || {}).src || "";
    const CONFIG = {
      teacherInviteCode: "BDAI-TEACH-2026", // the founder shares this with new teachers
      // Only a SHA-256 fingerprint of the founder code is kept here, never the code itself.
      // The full code is matched exactly (capitals and symbols count); spaces around it are ignored.
      founderCodeHash: "33f5d20345aaaa9f1c887235fd6469caa4485b3ab1f2f800716f6263bb50f0a0",
      demoPassword: "demo1234",
      maxPinTries: 5,
    };
    const DB_KEY = "bdai.portal.v4";

    // Every account gets an inbox address: firstname.lastname@st-portal.tech.databell.inbox.bdai
    const INBOX_DOMAIN = "st-portal.tech.databell.inbox.bdai";
    const GROUP_NAMES = ["teachers", "parents", "students", "everyone"]; // group addresses only the founder can use
    const addrSlug = (s) => String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    function makeInboxAddress(name, taken) {
      const parts = String(name).replace(/^(Ms|Mr|Mrs|Dr)\.?\s+/i, "").trim().split(/\s+/).map(addrSlug).filter(Boolean);
      const base = parts.length > 1 ? parts[0] + "." + parts[parts.length - 1] : (parts[0] || "student");
      let addr = base + "@" + INBOX_DOMAIN, n = 2;
      while (taken.has(addr)) addr = base + n++ + "@" + INBOX_DOMAIN; // a second Mira Sharma becomes mira.sharma2@…
      return addr;
    }
    const SESSION_KEY = "bdai.portal.session";

    // Sign-ins last only while this window is open (sessionStorage).
    const sessionStore = {
      get() { try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; } },
      set(v) { try { if (v) sessionStorage.setItem(SESSION_KEY, v); else sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } },
    };

    const COURSES = [
      { id: "c-robots", title: "Robots and Sensors", track: "tech", band: "explorer", lessons: 8, blurb: "Build and code a floor robot that finds its own way." },
      { id: "c-python", title: "Python Basics", track: "tech", band: "builder", lessons: 12, blurb: "Variables, loops and your first games in Python." },
      { id: "c-web", title: "Build Your First Website", track: "tech", band: "builder", lessons: 10, blurb: "HTML, CSS and JavaScript, one page at a time." },
      { id: "c-iot", title: "Smart Home Gadgets", track: "tech", band: "innovator", lessons: 10, blurb: "Microcontrollers, sensors and Python working together." },
      { id: "c-paint", title: "Digital Painting", track: "create", band: "explorer", lessons: 8, blurb: "Brushes, colour and shape in the Paint Studio." },
      { id: "c-anim", title: "Animation Studio", track: "create", band: "builder", lessons: 10, blurb: "Flip-books, stop-motion and the secrets of timing." },
      { id: "c-genart", title: "Generative Art with JavaScript", track: "create", band: "innovator", lessons: 12, blurb: "Write code that paints by itself." },
      { id: "c-patterns", title: "Robots Spot Patterns", track: "ai", band: "explorer", lessons: 6, blurb: "Sorting games that show how machines learn." },
      { id: "c-ml", title: "How Machines Learn", track: "ai", band: "builder", lessons: 10, blurb: "Train models with your own examples and test them." },
      { id: "c-ethics", title: "AI Ethics and Safety", track: "ai", band: "innovator", lessons: 8, blurb: "Bias, privacy and using AI kindly." },
    ];
    const courseById = (id) => COURSES.find((c) => c.id === id);

    const BADGES = [
      { id: "first-program", name: "First Program", how: "Ran your first line of code" },
      { id: "digital-painter", name: "Digital Painter", how: "Finished a Paint Studio challenge" },
      { id: "circuit-starter", name: "Circuit Starter", how: "Lit up your first LED" },
      { id: "pattern-spotter", name: "Pattern Spotter", how: "Solved 10 pattern puzzles" },
      { id: "team-player", name: "Team Player", how: "Helped a classmate debug" },
      { id: "event-explorer", name: "Event Explorer", how: "Went to 3 BDAI events" },
      { id: "web-builder", name: "Web Builder", how: "Published a web page" },
      { id: "python-pro", name: "Python Pro", how: "Wrote a 50-line Python program" },
      { id: "course-finisher", name: "Course Finisher", how: "Finished every lesson in a course" },
      { id: "data-detective", name: "Data Detective", how: "Cleaned a dataset of 50 rows" },
      { id: "robot-wrangler", name: "Robot Wrangler", how: "Finished a robot maze run" },
      { id: "kind-coder", name: "Kind Coder", how: "Left 5 helpful comments" },
    ];
    const EVENT_KINDS = ["Live studio", "Workshop", "Show and tell", "Hackathon", "Parent meeting"];

    const todayISO = () => new Date().toISOString().slice(0, 10);
    const nowISO = () => new Date().toISOString();
    const fmtDate = (iso) => {
      const d = new Date(String(iso).length <= 10 ? iso + "T12:00:00" : iso);
      return isNaN(d) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };
    const fmtDay = (iso) => {
      const d = new Date(iso + "T12:00:00");
      return isNaN(d) ? { wd: "", md: "" } : { wd: d.toLocaleDateString(undefined, { weekday: "short" }), md: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) };
    };
    const fmtWhen = (iso) => {
      const d = new Date(iso);
      return isNaN(d) ? "" : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    };
    const fmtTime = (hhmm) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
      if (!m) return hhmm || "";
      const h = Number(m[1]);
      return ((h + 11) % 12 + 1) + ":" + m[2] + (h < 12 ? " AM" : " PM");
    };
    const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

    function seed() {
      const s = (o) => Object.assign({ demo: true, createdAt: "2026-09-01" }, o);
      let n = 0;
      const msg = (from, to, subject, body, at, read, batch) => ({ id: "m" + (++n), from, to, subject, body, at, read: !!read, batch: batch || null });
      return {
        events: [
          { id: "e1", date: addDays(1), time: "16:30", title: "Live studio: teach a model to tell cats from dogs", kind: "Live studio", audience: "ai", host: "u-ananya" },
          { id: "e2", date: addDays(3), time: "10:00", title: "Paint Studio jam: a city that runs on sunshine", kind: "Workshop", audience: "create", host: "u-rohan" },
          { id: "e3", date: addDays(4), time: "17:00", title: "Show and tell: share your project", kind: "Show and tell", audience: "all", host: "u-founder" },
          { id: "e4", date: addDays(6), time: "16:30", title: "Circuits: build a doorbell", kind: "Live studio", audience: "tech", host: "u-leela" },
          { id: "e5", date: addDays(17), time: "09:30", title: "BDAI Winter Hackathon", kind: "Hackathon", audience: "all", host: "u-founder" },
        ],
        users: [
          s({ id: "u-founder", role: "founder", name: "BDAI Founder", username: "founder" }),
          s({ id: "u-ananya", role: "teacher", name: "Ms. Ananya Rao", username: "ananya", track: "ai" }),
          s({ id: "u-rohan", role: "teacher", name: "Mr. Rohan Mehta", username: "rohan", track: "create" }),
          s({ id: "u-leela", role: "teacher", name: "Ms. Leela Iyer", username: "leela", track: "tech" }),
          s({ id: "u-mira", role: "student", name: "Mira Sharma", username: "mira", age: 11, track: "ai", teacherId: "u-ananya", demoPin: "1234",
            courses: [{ id: "c-ml", done: 7 }, { id: "c-web", done: 3 }, { id: "c-anim", done: 4 }],
            badges: ["first-program", "digital-painter", "circuit-starter", "pattern-spotter", "team-player", "event-explorer"],
            events: ["e1", "e3"],
            notes: [{ from: "Ms. Ananya Rao", at: "2026-11-24", text: "Your robot sorted 18 of 20 pictures correctly. Try adding more examples of green apples. It keeps calling them limes!" }] }),
          s({ id: "u-arjun", role: "student", name: "Arjun Sharma", username: "arjun", age: 8, track: "tech", teacherId: "u-leela",
            courses: [{ id: "c-robots", done: 5 }, { id: "c-paint", done: 2 }],
            badges: ["first-program", "circuit-starter"], events: ["e4"],
            notes: [{ from: "Ms. Leela Iyer", at: "2026-11-22", text: "Great job finding the bug in your maze code. Next week we add a sensor." }] }),
          s({ id: "u-zoe", role: "student", name: "Zoe Chen", username: "zoe", age: 14, track: "create", teacherId: "u-rohan",
            courses: [{ id: "c-genart", done: 9 }, { id: "c-anim", done: 10 }],
            badges: ["first-program", "digital-painter", "web-builder", "python-pro", "team-player", "course-finisher", "kind-coder"], events: ["e2", "e5"],
            notes: [{ from: "Mr. Rohan Mehta", at: "2026-11-20", text: "Your colour palette for the club brand is bold and clear. Try a second version in black and white." }] }),
          s({ id: "u-kabir", role: "student", name: "Kabir Das", username: "kabir", age: 10, track: "tech", teacherId: "",
            courses: [{ id: "c-python", done: 1 }], badges: ["first-program"], events: [], notes: [] }),
          s({ id: "u-priya", role: "parent", name: "Priya Sharma", username: "priya", childIds: ["u-mira", "u-arjun"], events: ["e3"] }),
          s({ id: "u-david", role: "parent", name: "David Chen", username: "david", childIds: ["u-zoe"], events: [] }),
        ],
        messages: [
          ...["u-ananya", "u-rohan", "u-leela"].map((t) => msg("u-founder", t, "Welcome to the new term",
            "Thank you for teaching at BDAI this term. Please record lessons as students finish them, and add a note after each live studio so parents can follow along.",
            "2026-11-18T09:00:00", t !== "u-rohan", "seed-b1")),
          msg("u-leela", "u-priya", "Arjun's robot course", "Arjun fixed a tricky bug in his maze code by himself this week. He has finished 5 of 8 lessons in Robots and Sensors.", "2026-11-22T16:45:00", true),
          msg("u-david", "u-rohan", "Zoe's animation course", "Zoe loved finishing Animation Studio. Is there a way she can show her film to the whole school?", "2026-11-23T20:15:00", false),
          msg("u-mira", "u-ananya", "Question about green apples", "Hi Ms. Ananya, my robot keeps calling green apples limes. Should I add more photos of apples or of limes?", "2026-11-24T17:10:00", true),
          msg("u-ananya", "u-mira", "Re: Question about green apples", "Add more green apples, from different sides and in different light. Then test it again with 5 new pictures. You're close!", "2026-11-24T18:02:00", false),
          msg("u-ananya", "u-priya", "Mira's progress this month", "Mira is doing really well in How Machines Learn. She has finished 7 of 10 lessons and helps her classmates when they get stuck.", "2026-11-25T10:30:00", false),
          ...["u-priya", "u-david"].map((p) => msg("u-founder", p, "Show and tell this week",
            "Families are welcome at this week's show and tell. Students will present what they built in their courses. You can register in the Events tab.",
            "2026-11-25T12:00:00", false, "seed-b2")),
        ],
      };
    }

    // ----- data layer (swap for your API) -----
    const byNewest = (a, b) => (a.at < b.at ? 1 : -1);
    const Accounts = {
      db: null,
      load() {
        const d = store.get(DB_KEY, null);
        this.db = d && Array.isArray(d.users) ? d : seed();
        if (!Array.isArray(this.db.messages)) this.db.messages = [];
        if (!Array.isArray(this.db.events)) this.db.events = [];
        this.giveAddresses();
        this.save();
      },
      save() { store.set(DB_KEY, this.db); },
      reset() { this.db = seed(); this.giveAddresses(); this.save(); },
      giveAddresses() {
        const taken = new Set(GROUP_NAMES.map((g) => g + "@" + INBOX_DOMAIN));
        this.db.users.forEach((u) => { if (u.inboxAddress) taken.add(u.inboxAddress); });
        this.db.users.forEach((u) => { if (!u.inboxAddress) { u.inboxAddress = makeInboxAddress(u.name, taken); taken.add(u.inboxAddress); } });
      },
      byAddress(addr) {
        const a = String(addr || "").trim().toLowerCase();
        return this.db.users.find((u) => u.inboxAddress === a) || null;
      },
      all(role) { return this.db.users.filter((u) => !role || u.role === role); },
      get(id) { return this.db.users.find((u) => u.id === id) || null; },
      byUsername(name) {
        const n = String(name || "").trim().toLowerCase();
        return this.db.users.find((u) => u.username === n) || null;
      },
      add(user) { this.db.users.push(user); this.giveAddresses(); this.save(); return user; },
      update(id, patch) { const u = this.get(id); if (u) { Object.assign(u, patch); this.save(); } return u; },
      remove(id) {
        this.db.users = this.db.users.filter((u) => u.id !== id);
        this.db.users.forEach((u) => {
          if (u.role === "parent") u.childIds = (u.childIds || []).filter((c) => c !== id);
          if (u.role === "student" && u.teacherId === id) u.teacherId = "";
        });
        this.db.messages = this.db.messages.filter((m) => m.to !== id);
        this.save();
      },
      parentsOf(studentId) { return this.all("parent").filter((p) => (p.childIds || []).includes(studentId)); },
      studentsOf(teacherId) { return this.all("student").filter((s) => s.teacherId === teacherId); },
      // events
      events() { return this.db.events.slice().sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)); },
      upcoming() { const t = todayISO(); return this.events().filter((e) => e.date >= t); },
      event(id) { return this.db.events.find((e) => e.id === id) || null; },
      addEvent(ev) { this.db.events.push(ev); this.save(); },
      removeEvent(id) {
        this.db.events = this.db.events.filter((e) => e.id !== id);
        this.db.users.forEach((u) => { if (u.events) u.events = u.events.filter((x) => x !== id); });
        this.save();
      },
      attendees(id) { return this.db.users.filter((u) => (u.events || []).includes(id)); },
      toggleEvent(userId, eventId) {
        const u = this.get(userId); if (!u) return false;
        const list = u.events || [];
        const going = !list.includes(eventId);
        u.events = going ? list.concat(eventId) : list.filter((x) => x !== eventId);
        this.save();
        return going;
      },
      // messages
      send(fromId, toIds, subject, body) {
        const batch = toIds.length > 1 ? "b" + Date.now().toString(36) : null;
        const at = nowISO();
        toIds.forEach((to, i) => this.db.messages.push({
          id: "m" + Date.now().toString(36) + i + Math.random().toString(36).slice(2, 6),
          from: fromId, to, subject, body, at, read: false, batch,
        }));
        this.save();
      },
      inbox(id) { return this.db.messages.filter((m) => m.to === id).sort(byNewest); },
      sent(id) {
        const out = [], groups = {};
        this.db.messages.filter((m) => m.from === id).forEach((m) => {
          if (m.batch && groups[m.batch]) { groups[m.batch].to.push(m.to); return; }
          const copy = Object.assign({}, m, { to: [m.to] });
          if (m.batch) groups[m.batch] = copy;
          out.push(copy);
        });
        return out.sort(byNewest);
      },
      unread(id) { return this.db.messages.filter((m) => m.to === id && !m.read).length; },
      markRead(msgId) { const m = this.db.messages.find((x) => x.id === msgId); if (m && !m.read) { m.read = true; this.save(); } },
    };

    // ----- secrets: passwords, PINs, security keys, founder code -----
    async function sha256(text) {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      return null;
    }
    async function hashSecret(secret, salt) {
      const h = await sha256(salt + ":" + secret);
      if (h) return h;
      let x = 2166136261; // fallback for very old browsers
      const t = salt + ":" + secret;
      for (let i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 16777619); }
      return "f" + (x >>> 0).toString(16);
    }
    const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I mix-ups
    function randomCode(groups, size) {
      const n = groups * size;
      const vals = new Uint32Array(n);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(vals);
      else for (let i = 0; i < n; i++) vals[i] = Math.floor(Math.random() * 4294967296);
      let out = "";
      for (let i = 0; i < n; i++) {
        if (i && i % size === 0) out += "-";
        out += KEY_ALPHABET[vals[i] % KEY_ALPHABET.length];
      }
      return out;
    }
    const newSalt = () => randomCode(4, 4);
    const normKey = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const normCode = (s) => String(s || "").trim().toUpperCase();
    function saltOf(u) {
      if (!u.salt) Accounts.update(u.id, { salt: newSalt() });
      return Accounts.get(u.id).salt;
    }
    async function checkPassword(u, pw) {
      if (u.pwHash) return (await hashSecret(pw, u.salt)) === u.pwHash;
      return !!u.demo && pw === CONFIG.demoPassword;
    }
    const hasPin = (u) => !!(u && (u.pinHash || u.demoPin));
    async function checkPin(u, pin) {
      if (u.pinHash) return (await hashSecret(pin, "pin:" + u.salt)) === u.pinHash;
      return !!u.demoPin && pin === u.demoPin;
    }
    async function checkKey(u, key) {
      if (!u.keyHash) return false;
      return (await hashSecret(normKey(key), "key:" + u.salt)) === u.keyHash;
    }
    async function checkFounderCode(code) {
      const h = await sha256("bdai-founder:" + String(code || "").trim());
      return h !== null && h === CONFIG.founderCodeHash;
    }
    async function copyText(text, el) {
      try {
        await navigator.clipboard.writeText(text);
        toast("Copied.");
      } catch (e) {
        if (el) { const r = document.createRange(); r.selectNodeContents(el); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
        toast("Selected. Press Ctrl + C (or ⌘ + C) to copy.");
      }
    }

    Accounts.load();

    // ----- UI state -----
    const freshUI = () => ({
      viewAsId: null, tab: null, kidId: null, studentId: null, founderQuery: "", confirmRemove: null,
      box: "in", msgId: null, composing: false, mailQuery: "",
      locked: false, accountUnlocked: false, pinTries: 0, pinRecovery: false,
      newKey: null, notice: null,
    });
    const ui = Object.assign(freshUI(), { sessionId: null, authMode: "signin", signupRole: "student" });
    const restored = sessionStore.get();
    if (restored && Accounts.get(restored)) {
      ui.sessionId = restored;
      const u = Accounts.get(restored);
      ui.locked = !!(u.pinOnOpen && hasPin(u)); // "ask for PIN when the portal opens"
    }

    const TABS = {
      student: [["home", "Learning"], ["courses", "Courses"], ["badges", "Badges"], ["events", "Events"], ["inbox", "Inbox"], ["account", "Account"]],
      parent: [["kids", "My children"], ["events", "Events"], ["inbox", "Inbox"], ["link", "Link a child"], ["account", "Account"]],
      teacher: [["roster", "My class"], ["events", "Events"], ["inbox", "Inbox"], ["waiting", "Unassigned students"], ["account", "Account"]],
      founder: [["overview", "Overview"], ["students", "Students"], ["teachers", "Teachers"], ["parents", "Parents"], ["events", "Events"], ["inbox", "Inbox"], ["account", "Account"]],
    };
    const ROLE_LABEL = { student: "Student", parent: "Parent", teacher: "Teacher", founder: "Founder" };

    function signIn(id) {
      Object.assign(ui, freshUI(), { sessionId: id });
      sessionStore.set(id);
      render();
      window.scrollTo(0, 0);
    }
    function signOut() {
      Object.assign(ui, freshUI(), { sessionId: null, authMode: "signin" });
      sessionStore.set(null);
      render();
    }

    // ----- shared pieces -----
    const initials = (name) => esc(String(name).replace(/^(Ms|Mr|Mrs|Dr)\.?\s+/i, "").trim().charAt(0).toUpperCase() || "?");
    const roleBadge = (role) => '<span class="role-badge role-badge--' + role + '">' + ROLE_LABEL[role] + "</span>";
    const trackName = (t) => (TRACK_INFO[t] ? TRACK_INFO[t].name : "—");
    const firstName = (u) => esc(String(u.name).replace(/^(Ms|Mr|Mrs|Dr)\.?\s+/i, "").split(" ")[0]);
    const nameOf = (id) => { const u = Accounts.get(id); return u ? u.name : "Removed account"; };
    const secChips = (u) => '<span class="sec"><span class="' + (hasPin(u) ? "" : "off") + '">PIN</span><span class="' + (u.keyHash ? "" : "off") + '">Key</span></span>';
    const enrolled = (s) => (s.courses || []).map((e) => ({ e, c: courseById(e.id) })).filter((x) => x.c);
    const lessonsDone = (s) => enrolled(s).reduce((a, x) => a + Math.min(x.e.done, x.c.lessons), 0);
    const finished = (x) => x.e.done >= x.c.lessons;
    const eventsFor = (u) => {
      const up = Accounts.upcoming();
      if (u.role === "student") return up.filter((e) => e.audience === "all" || e.audience === u.track);
      return up;
    };

    function courseHTML(x, opts) {
      const info = TRACK_INFO[x.c.track] || TRACK_INFO.tech;
      const done = Math.min(x.e.done, x.c.lessons);
      const pct = Math.round((done / x.c.lessons) * 100);
      const complete = done >= x.c.lessons;
      return '<li class="course' + (complete ? " course--done" : "") + '">' +
        '<span class="course__dot" style="background:' + info.tone + '"></span>' +
        '<span class="course__name">' + esc(x.c.title) + "</span>" +
        '<span class="course__pct">' + (complete ? "Finished" : done + " of " + x.c.lessons + " lessons") + "</span>" +
        '<span class="course__meta">' + info.name + " · " + LEVEL_NAMES[x.c.band] + (complete ? "" : " · Next: lesson " + (done + 1)) + "</span>" +
        '<span class="bar"><span style="width:' + pct + "%;" + (complete ? "background:" + COLORS.mint : "") + '"></span></span>' +
        (opts && opts.cta && !complete ? '<button class="tool tool--small course__cta" data-action="continue" data-course="' + x.c.id + '">Continue</button>' : "") +
        "</li>";
    }
    function notesHTML(notes) {
      if (!notes || !notes.length) return '<p class="empty">No teacher notes yet.</p>';
      return '<ul class="notes">' + notes.slice().reverse().slice(0, 4).map((n) =>
        '<li class="note">“' + esc(n.text) + '”<cite>' + esc(n.from) + " · " + fmtDate(n.at) + "</cite></li>").join("") + "</ul>";
    }
    function learningTiles(s) {
      const list = enrolled(s);
      const active = list.filter((x) => !finished(x)).length;
      const myEvents = Accounts.upcoming().filter((e) => (s.events || []).includes(e.id));
      const nextBadge = BADGES.find((b) => !(s.badges || []).includes(b.id));
      return '<div class="stats">' +
        '<div class="stat"><p class="stat__label">Courses</p><p class="stat__num">' + list.length + '<small> enrolled</small></p><p class="stat__note">' + active + " in progress · " + (list.length - active) + " finished</p></div>" +
        '<div class="stat"><p class="stat__label">Lessons finished</p><p class="stat__num">' + lessonsDone(s) + '</p><p class="stat__note">across all courses</p></div>' +
        '<div class="stat"><p class="stat__label">Badges</p><p class="stat__num">' + (s.badges || []).length + "<small> of " + BADGES.length + '</small></p><p class="stat__note">' + (nextBadge ? "Next: <strong>" + esc(nextBadge.name) + "</strong>" : "<strong>All badges earned!</strong>") + "</p></div>" +
        '<div class="stat"><p class="stat__label">Events</p><p class="stat__num">' + myEvents.length + '<small> coming up</small></p><p class="stat__note">' + (myEvents[0] ? esc(fmtDay(myEvents[0].date).wd + " " + fmtDay(myEvents[0].date).md) + ": " + esc(myEvents[0].title) : "None yet. Pick one in Events.") + "</p></div>" +
        "</div>";
    }
    function badgesHTML(s) {
      const tones = [COLORS.cyan, COLORS.violet, COLORS.pink, COLORS.mint, COLORS.sun, "#ff8a4c"];
      return '<ul class="badges">' + BADGES.map((b, n) => {
        const got = (s.badges || []).includes(b.id);
        const ini = b.name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2);
        return '<li class="badge' + (got ? "" : " badge--locked") + '"><span class="badge__medal" style="' + (got ? "background:" + tones[n % tones.length] : "") + '">' + ini + "</span>" +
          '<span class="badge__name">' + esc(b.name) + '</span><span class="badge__how">' + (got ? "Earned · " : "Locked · ") + esc(b.how) + "</span></li>";
      }).join("") + "</ul>";
    }
    // one event row; `controls` is the HTML for the right-hand buttons
    function eventRow(e, controls, extra) {
      const d = fmtDay(e.date);
      const aud = e.audience === "all" ? "Everyone" : trackName(e.audience) + " track";
      return '<li class="slot"><span class="slot__when"><b>' + esc(d.wd) + "</b><span>" + esc(d.md) + "</span></span>" +
        '<span><span class="slot__title">' + esc(e.title) + '</span><br><span class="slot__sub">' + esc(e.kind) + " · " + fmtTime(e.time) + " · " + esc(aud) + " · Host: " + esc(nameOf(e.host)) + "</span>" +
        (extra ? '<br><span class="slot__sub">' + extra + "</span>" : "") + "</span>" +
        '<span class="row-actions">' + (controls || "") + "</span></li>";
    }
    const goingBtn = (userId, e, label) => {
      const u = Accounts.get(userId);
      const going = !!u && (u.events || []).includes(e.id);
      return '<button class="tool tool--small' + (going ? " is-going" : "") + '" data-action="rsvp" data-user="' + userId + '" data-event="' + e.id + '" aria-pressed="' + going + '">' +
        (going ? (label ? esc(label) + ": going ✓" : "Going ✓") : (label ? "Register " + esc(label) : "Register")) + "</button>";
    };
    function teacherSelect(student, id) {
      const opts = ['<option value="">No teacher yet</option>'].concat(Accounts.all("teacher").map((t) =>
        '<option value="' + t.id + '"' + (t.id === student.teacherId ? " selected" : "") + ">" + esc(t.name) + " (" + trackName(t.track) + ")</option>"));
      return '<select data-action="assign" data-id="' + student.id + '" id="' + id + '" aria-label="Teacher for ' + esc(student.name) + '">' + opts.join("") + "</select>";
    }
    function removeBtn(id, label) {
      const confirming = ui.confirmRemove === id;
      return '<button class="tool tool--small tool--danger" data-action="remove" data-id="' + id + '">' + (confirming ? "Confirm " + (label || "remove").toLowerCase() : (label || "Remove")) + "</button>";
    }

    // ----- inbox page (index-11.html#inbox) -----
    function contactsFor(u) {
      const founders = Accounts.all("founder").filter((f) => f.id !== u.id);
      let list = [];
      if (u.role === "student") list = [Accounts.get(u.teacherId)].concat(founders);
      if (u.role === "parent") {
        const kids = (u.childIds || []).map((id) => Accounts.get(id)).filter(Boolean);
        list = kids.map((k) => Accounts.get(k.teacherId)).concat(founders);
      }
      if (u.role === "teacher") {
        const kids = Accounts.studentsOf(u.id);
        list = kids.concat(...kids.map((k) => Accounts.parentsOf(k.id))).concat(founders);
      }
      if (u.role === "founder") list = Accounts.all().filter((x) => x.id !== u.id);
      const seen = new Set();
      return list.filter((x) => x && !seen.has(x.id) && seen.add(x.id));
    }
    const addrOf = (id) => { const u = Accounts.get(id); return u ? u.inboxAddress : ""; };

    // Turns "a@…, Name <b@…>" into account ids the sender may write to.
    function resolveRecipients(u, raw) {
      const parts = String(raw || "").split(/[,;]+/).map((p) => {
        const m = /<([^>]+)>/.exec(p);
        return (m ? m[1] : p).trim().toLowerCase();
      }).filter(Boolean);
      if (!parts.length) return { error: "Add at least one inbox address." };
      const allowed = new Set(contactsFor(u).map((c) => c.id));
      const ids = [];
      for (const a of parts) {
        if (!a.endsWith("@" + INBOX_DOMAIN)) return { error: "“" + a + "” isn't a BDAI inbox address. Addresses end in @" + INBOX_DOMAIN + "." };
        const group = GROUP_NAMES.find((g) => g + "@" + INBOX_DOMAIN === a);
        if (group) {
          if (u.role !== "founder") return { error: "Only the founder can write to a whole group." };
          const role = group === "everyone" ? null : group.slice(0, -1);
          Accounts.all(role).forEach((x) => { if (x.id !== u.id) ids.push(x.id); });
          continue;
        }
        const target = Accounts.byAddress(a);
        if (!target) return { error: "No one has the address “" + a + "”. Check the spelling." };
        if (!allowed.has(target.id)) return { error: "You can't write to " + target.name + " from your account." };
        ids.push(target.id);
      }
      const unique = Array.from(new Set(ids));
      if (!unique.length) return { error: "There is no one in that group yet." };
      return { ids: unique };
    }

    function messageItem(m, box) {
      let name;
      if (box === "sent") name = "To " + (m.to.length > 1 ? m.to.length + " people" : nameOf(m.to[0]));
      else name = nameOf(m.from);
      const unread = box === "in" && !m.read;
      return '<li><button class="mitem' + (unread ? " is-unread" : "") + (ui.msgId === m.id ? " is-open" : "") + '" data-action="open-msg" data-id="' + m.id + '" id="msg-' + m.id + '">' +
        '<span class="avatar avatar--sm" aria-hidden="true">' + initials(box === "sent" && m.to.length > 1 ? "#" : name.replace(/^To /, "")) + "</span>" +
        '<span class="mitem__body"><span class="mitem__top"><strong>' + esc(name) + "</strong><time>" + fmtWhen(m.at) + "</time></span>" +
        '<span class="mitem__subj">' + (unread ? '<span class="sr">Unread: </span>' : "") + esc(m.subject) + '</span><span class="mitem__prev">' + esc(m.body.slice(0, 90)) + "</span></span></button></li>";
    }
    function composeHTML(u) {
      const contacts = contactsFor(u);
      const groupOpts = u.role === "founder"
        ? GROUP_NAMES.map((g) => ({ addr: g + "@" + INBOX_DOMAIN, label: g === "everyone" ? "Everyone" : "All " + g })) : [];
      const people = contacts.map((c) => ({ addr: c.inboxAddress, label: c.name + " (" + ROLE_LABEL[c.role] + ")" }));
      const all = groupOpts.concat(people);
      if (!all.length) return '<div class="msg"><h4>New message</h4><p class="empty">There is no one to write to yet. Once you are in a class, your teacher appears here.</p></div>';
      return '<div class="msg"><h4>New message</h4><form class="form" id="composeForm" autocomplete="off">' +
        '<div class="field field--full"><label for="mFrom">From</label><input id="mFrom" type="text" value="' + esc(u.inboxAddress) + '" readonly></div>' +
        '<div class="field field--full"><label for="mTo">To</label><input id="mTo" type="text" list="mToList" spellcheck="false" placeholder="firstname.lastname@' + INBOX_DOMAIN + '" required>' +
        '<datalist id="mToList">' + all.map((o) => '<option value="' + esc(o.addr) + '">' + esc(o.label) + "</option>").join("") + "</datalist>" +
        '<span class="hint">Separate several addresses with commas.</span></div>' +
        '<div class="field field--full"><span class="mail__bookLabel">Address book</span><div class="mail__book">' +
        all.map((o) => '<button type="button" class="chip mail__contact" data-action="add-to" data-addr="' + esc(o.addr) + '" title="' + esc(o.addr) + '">' + esc(o.label) + "</button>").join("") + "</div></div>" +
        '<div class="field field--full"><label for="mSubject">Subject</label><input id="mSubject" type="text" maxlength="80" required></div>' +
        '<div class="field field--full"><label for="mBody">Message</label><textarea id="mBody" rows="7" required></textarea></div>' +
        '<p class="form__error field--full" id="mError"></p>' +
        '<div class="feedback__row field--full"><button class="btn btn--primary btn--sm" type="submit">Send</button><button class="tool" type="button" data-action="cancel-compose">Discard</button></div></form>' +
        (u.role === "student" ? '<p class="hint">Students can write to their teacher and the BDAI team.</p>' : "") + "</div>";
    }
    function readerHTML(u, items, readOnly) {
      if (ui.composing && !readOnly) return composeHTML(u);
      const m = items.find((x) => x.id === ui.msgId);
      if (!m) return '<div class="mail__empty"><p class="empty">Pick a message to read it' + (readOnly ? "." : ", or write a new one.") + "</p></div>";
      const from = Accounts.get(m.from);
      const toIds = Array.isArray(m.to) ? m.to : [m.to];
      const reSubject = /^re:/i.test(m.subject) ? m.subject : "Re: " + m.subject;
      return '<article class="msg"><h4>' + esc(m.subject) + "</h4>" +
        '<dl class="msg__head"><dt>From</dt><dd><strong>' + esc(nameOf(m.from)) + "</strong> " + (from ? roleBadge(from.role) + ' <span class="msg__addr">' + esc(from.inboxAddress) + "</span>" : "") + "</dd>" +
        "<dt>To</dt><dd>" + toIds.map((id) => esc(nameOf(id)) + ' <span class="msg__addr">' + esc(addrOf(id)) + "</span>").join(", ") + "</dd>" +
        "<dt>Sent</dt><dd>" + fmtWhen(m.at) + "</dd></dl>" +
        '<div class="msg__body">' + esc(m.body) + "</div>" +
        (!readOnly && ui.box === "in" && from
          ? '<form class="feedback" id="replyForm" data-to="' + from.id + '" data-subject="' + esc(reSubject) + '"><label class="sr" for="replyText">Reply</label>' +
            '<p class="hint">Reply to ' + esc(from.inboxAddress) + "</p>" +
            '<textarea id="replyText" placeholder="Write a reply to ' + firstName(from) + '…" required></textarea>' +
            '<div class="feedback__row"><button class="btn btn--primary btn--sm" type="submit">Send reply</button></div></form>'
          : "") + "</article>";
    }
    function inboxPage(u, readOnly) {
      const box = ui.box;
      let items = box === "sent" ? Accounts.sent(u.id) : Accounts.inbox(u.id);
      const q = ui.mailQuery.trim().toLowerCase();
      if (q) {
        items = items.filter((m) => {
          const to = Array.isArray(m.to) ? m.to : [m.to];
          return (m.subject + " " + m.body + " " + nameOf(m.from) + " " + addrOf(m.from) + " " + to.map((id) => nameOf(id) + " " + addrOf(id)).join(" ")).toLowerCase().includes(q);
        });
      }
      const unread = Accounts.unread(u.id);
      const side = '<aside class="mail__side">' +
        '<div class="portal__me"><div class="avatar" aria-hidden="true">' + initials(u.name) + '</div><div><p class="portal__name">' + esc(u.name) + '</p><p class="portal__sub">' + roleBadge(u.role) + "</p></div></div>" +
        '<div class="mail__addr"><span class="mail__addrLabel">Inbox address</span><code id="myAddr">' + esc(u.inboxAddress) + "</code>" +
        '<button class="tool tool--small" data-action="copy-addr">Copy address</button></div>' +
        (readOnly ? "" : '<button class="btn btn--primary btn--block" data-action="compose">New message</button>') +
        '<nav class="mail__folders" aria-label="Folders">' +
        '<button data-action="box" data-box="in" id="box-in" aria-current="' + (box === "in" ? "page" : "false") + '">Inbox' + (unread ? ' <span class="count" aria-label="' + unread + ' unread">' + unread + "</span>" : "") + "</button>" +
        '<button data-action="box" data-box="sent" id="box-sent" aria-current="' + (box === "sent" ? "page" : "false") + '">Sent</button></nav>' +
        '<a class="tool tool--quiet mail__back" href="#student-portal">← Back to portal</a></aside>';
      const list = '<section class="mail__list" aria-label="' + (box === "sent" ? "Sent messages" : "Inbox messages") + '">' +
        '<div class="mail__listHead"><h3>' + (box === "sent" ? "Sent" : "Inbox") + '</h3><label class="sr" for="mailSearch">Search messages</label>' +
        '<input type="search" id="mailSearch" placeholder="Search names, addresses or words" value="' + esc(ui.mailQuery) + '"></div>' +
        '<ul class="mlist">' + (items.length ? items.map((m) => messageItem(m, box)).join("")
          : '<li class="empty">' + (q ? "No messages match your search." : box === "sent" ? "You haven't sent any messages yet." : "Your inbox is empty.") + "</li>") + "</ul></section>";
      const banner = readOnly ? '<div class="impersonate"><span>Founder view: <strong>' + esc(u.name) + "</strong>'s inbox, read-only. Opening messages here doesn't mark them as read.</span></div>" : "";
      return '<div class="mail">' + side + list + '<section class="mail__read" aria-label="Message">' + banner + readerHTML(u, items, readOnly) + "</section></div>";
    }

    // ----- account page: profile, password, PIN, security key -----
    function keyRecoveryForm(formId, label) {
      return '<form class="form form--narrow" id="' + formId + '" autocomplete="off">' +
        '<div class="field field--full"><label for="' + formId + 'Key">Security key</label><input id="' + formId + 'Key" type="text" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" required></div>' +
        '<p class="form__error field--full" id="' + formId + 'Error"></p>' +
        '<button class="btn btn--primary field--full" type="submit">' + label + "</button></form>";
    }
    function pinGateHTML(u) {
      return '<div class="pane"><div class="lockcard"><div class="avatar" aria-hidden="true">' + initials(u.name) + "</div>" +
        "<h3>Enter your PIN</h3><p class=\"empty\">Your account page is protected with a PIN.</p>" +
        (ui.pinRecovery
          ? keyRecoveryForm("keyPinForm", "Remove my PIN") + '<button class="linkbtn" data-action="pin-recovery" data-on="0">Back to PIN</button>'
          : '<form class="form form--narrow" id="pinGateForm" autocomplete="off"><div class="field field--full"><label for="gatePin">PIN</label>' +
            '<input id="gatePin" class="pin-input" type="password" inputmode="numeric" maxlength="6" required></div>' +
            '<p class="form__error field--full" id="gateError"></p><button class="btn btn--primary field--full" type="submit">Open account page</button></form>' +
            '<button class="linkbtn" data-action="pin-recovery" data-on="1">Forgot your PIN? Use your security key</button>') +
        "</div></div>";
    }
    function founderSecurityPane(u) {
      return '<div class="pane"><h3 class="pane__title">Account and security</h3><div class="acct">' +
        '<div class="card"><p class="card__title">Profile</p><p><strong>' + esc(u.name) + "</strong> " + roleBadge(u.role) + "</p>" +
        '<p class="empty"><code>' + esc(u.inboxAddress) + "</code></p>" +
        '<p class="empty">@' + esc(u.username) + " · Joined " + fmtDate(u.createdAt) + "</p></div>" +
        '<div class="card"><p class="card__title">Security</p><ul class="seclist">' +
        '<li><span class="status is-on">Password: ' + (u.pwHash ? "set by the user" : "example password") + "</span></li>" +
        '<li><span class="status' + (hasPin(u) ? " is-on" : "") + '">PIN: ' + (hasPin(u) ? (u.pinOnOpen ? "on, also when the portal opens" : "on for the account page") : "off") + "</span></li>" +
        '<li><span class="status' + (u.keyHash ? " is-on" : "") + '">Security key: ' + (u.keyHash ? "set up " + fmtDate(u.keyAt) : "not set up") + "</span></li></ul>" +
        '<div class="feedback__row"><button class="tool tool--small" data-action="reset-pw" data-id="' + u.id + '">Reset password</button>' +
        (hasPin(u) ? '<button class="tool tool--small tool--danger" data-action="clear-pin" data-id="' + u.id + '">Remove PIN</button>' : "") + "</div></div></div></div>";
    }
    function accountPane(u) {
      if (hasPin(u) && !ui.accountUnlocked) return pinGateHTML(u);
      const keyCard = ui.newKey
        ? '<p class="empty">This is your security key. It is shown only once, so write it down or copy it somewhere safe, like with a parent.</p>' +
          '<div class="keybox" id="keyBox">' + esc(ui.newKey) + "</div>" +
          '<div class="feedback__row"><button class="tool tool--small" data-action="copy-key">Copy key</button></div>' +
          '<label class="check" for="keySaved"><input type="checkbox" id="keySaved"><span>I saved my security key somewhere safe.</span></label>' +
          '<p class="form__error" id="keyError"></p><button class="btn btn--primary btn--sm" data-action="key-done" style="width:fit-content">Done</button>'
        : '<p><span class="status' + (u.keyHash ? " is-on" : "") + '">' + (u.keyHash ? "Set up " + fmtDate(u.keyAt) : "Not set up yet") + "</span></p>" +
          '<p class="empty">A security key lets you reset your password or PIN if you forget them.</p>' +
          '<button class="tool" data-action="make-key" style="width:fit-content">' + (u.keyHash ? "Replace security key" : "Create security key") + "</button>";

      return '<div class="pane"><div class="pane__row"><h3 class="pane__title">Account</h3>' +
        (hasPin(u) ? '<button class="tool tool--small" data-action="lock">Lock portal now</button>' : "") + "</div>" +
        '<div class="acct">' +
        '<div class="card"><p class="card__title">Profile</p><form class="form" id="profileForm" autocomplete="off">' +
          '<div class="field field--full"><label for="pfName">Full name</label><input id="pfName" type="text" maxlength="40" value="' + esc(u.name) + '" required></div>' +
          '<p class="field--full empty">Inbox address <code>' + esc(u.inboxAddress) + "</code></p>" +
          '<p class="field--full empty">Username <code>@' + esc(u.username) + "</code> · " + roleBadge(u.role) + " · Joined " + fmtDate(u.createdAt) + "</p>" +
          '<button class="tool field--full" type="submit" style="width:fit-content">Save name</button></form></div>' +
        '<div class="card"><p class="card__title">Password</p><form class="form" id="passwordForm" autocomplete="off">' +
          '<div class="field field--full"><label for="pwOld">Current password</label><input id="pwOld" type="password" required autocomplete="current-password"></div>' +
          '<div class="field"><label for="pwNew">New password</label><input id="pwNew" type="password" minlength="6" required autocomplete="new-password"></div>' +
          '<div class="field"><label for="pwNew2">Type it again</label><input id="pwNew2" type="password" minlength="6" required autocomplete="new-password"></div>' +
          '<p class="form__error field--full" id="pwError"></p><button class="tool field--full" type="submit" style="width:fit-content">Change password</button></form></div>' +
        '<div class="card"><p class="card__title">PIN</p>' +
          '<p><span class="status' + (hasPin(u) ? " is-on" : "") + '">' + (hasPin(u) ? "PIN is on" : "No PIN yet") + "</span></p>" +
          '<p class="empty">A 4 to 6 digit PIN protects this account page. You can also ask for it whenever the portal opens.</p>' +
          '<form class="form" id="pinForm" autocomplete="off">' +
          '<div class="field"><label for="pinNew">' + (hasPin(u) ? "New PIN" : "PIN") + '</label><input id="pinNew" class="pin-input" type="password" inputmode="numeric" maxlength="6" required></div>' +
          '<div class="field"><label for="pinNew2">Type it again</label><input id="pinNew2" class="pin-input" type="password" inputmode="numeric" maxlength="6" required></div>' +
          '<label class="check field--full" for="pinOnOpen"><input type="checkbox" id="pinOnOpen"' + (u.pinOnOpen ? " checked" : "") + "><span>Also ask for my PIN when the portal opens</span></label>" +
          '<p class="form__error field--full" id="pinError"></p>' +
          '<div class="feedback__row field--full"><button class="tool" type="submit">' + (hasPin(u) ? "Change PIN" : "Turn on PIN") + "</button>" +
          (hasPin(u) ? '<button class="tool tool--danger" type="button" data-action="remove-own-pin">Turn off PIN</button>' : "") + "</div></form></div>" +
        '<div class="card"><p class="card__title">Security key</p>' + keyCard + "</div>" +
        "</div></div>";
    }

    // ----- role views -----
    function studentPane(s, tab) {
      const teacher = Accounts.get(s.teacherId);
      const list = enrolled(s);
      if (tab === "courses") {
        const mine = new Set(list.map((x) => x.c.id));
        const more = COURSES.filter((c) => !mine.has(c.id)).sort((a, b) => (a.band === bandForAge(s.age) ? -1 : 0) - (b.band === bandForAge(s.age) ? -1 : 0));
        return '<div class="pane"><h3 class="pane__title">My courses</h3>' +
          (list.length ? '<ul class="courses">' + list.map((x) => courseHTML(x, { cta: true })).join("") + "</ul>" : '<p class="empty">You have not joined a course yet. Pick one below.</p>') +
          '<h3 class="pane__title">More courses for you</h3><ul class="catalog">' + more.map((c) =>
            '<li class="catalog__item"><span class="course__dot" style="background:' + TRACK_INFO[c.track].tone + '"></span><span><strong>' + esc(c.title) + "</strong>" +
            '<small>' + TRACK_INFO[c.track].name + " · " + LEVEL_NAMES[c.band] + " · " + c.lessons + " lessons</small>" + esc(c.blurb) + "</span>" +
            '<button class="tool tool--small" data-action="enroll" data-course="' + c.id + '">Join course</button></li>').join("") + "</ul></div>";
      }
      if (tab === "badges") return '<div class="pane"><h3 class="pane__title">Badges</h3><p class="empty">Teachers award badges when you show a new skill.</p>' + badgesHTML(s) + "</div>";
      if (tab === "events") {
        const evs = eventsFor(s);
        return '<div class="pane"><h3 class="pane__title">Upcoming events</h3>' +
          (evs.length ? '<ul class="schedule">' + evs.map((e) => eventRow(e, goingBtn(s.id, e))).join("") + "</ul>" : '<p class="empty">No events planned yet.</p>') + "</div>";
      }
      const open = list.filter((x) => !finished(x));
      const unread = Accounts.unread(s.id);
      return '<div class="pane"><div class="pane__hello"><h3>Good to see you, ' + firstName(s) + ".</h3>" +
        "<p>" + (teacher ? "Your teacher is <strong>" + esc(teacher.name) + "</strong>. " : "You will be matched with a teacher soon. ") +
        (unread ? 'You have <button class="linkbtn" data-action="open-inbox">' + unread + " new message" + (unread === 1 ? "" : "s") + "</button>." : "") + "</p></div>" +
        learningTiles(s) +
        '<div class="pane__grid"><div class="card"><p class="card__title">Continue learning</p>' +
        (open.length ? '<ul class="courses courses--mini">' + open.map((x) => courseHTML(x, { cta: true })).join("") + "</ul>" : '<p class="empty">You finished all your courses! Open <strong>Courses</strong> to join a new one.</p>') +
        '</div><div class="card"><p class="card__title">Teacher notes</p>' + notesHTML(s.notes) + "</div></div></div>";
    }

    function parentPane(p, tab) {
      const kids = (p.childIds || []).map((id) => Accounts.get(id)).filter(Boolean);
      if (tab === "events") {
        const evs = Accounts.upcoming();
        return '<div class="pane"><h3 class="pane__title">Upcoming events</h3><p class="empty">Register yourself or your children.</p>' +
          (evs.length ? '<ul class="schedule">' + evs.map((e) => {
            const kidBtns = kids.filter((k) => e.audience === "all" || e.audience === k.track).map((k) => goingBtn(k.id, e, k.name.split(" ")[0])).join("");
            return eventRow(e, goingBtn(p.id, e, "Me") + kidBtns);
          }).join("") + "</ul>" : '<p class="empty">No events planned yet.</p>') + "</div>";
      }
      if (tab === "link") {
        return '<div class="pane"><h3 class="pane__title">Link a child</h3><p class="empty">Ask your child for their Student Portal username, then add it here.</p>' +
          '<form class="form" id="linkForm" autocomplete="off"><div class="field"><label for="linkUser">Child\'s username</label><input id="linkUser" type="text" required></div>' +
          '<div class="field" style="align-content:end"><button class="btn btn--primary btn--sm" type="submit">Link child</button></div>' +
          '<p class="form__error field--full" id="linkError"></p></form></div>';
      }
      if (!kids.length) {
        return '<div class="pane"><div class="pane__hello"><h3>Welcome, ' + firstName(p) + ".</h3><p>No children linked yet. Open <strong>Link a child</strong> to add your child's account.</p></div></div>";
      }
      if (!ui.kidId || !kids.some((k) => k.id === ui.kidId)) ui.kidId = kids[0].id;
      const kid = Accounts.get(ui.kidId);
      const teacher = Accounts.get(kid.teacherId);
      const kidEvents = Accounts.upcoming().filter((e) => (kid.events || []).includes(e.id));
      return '<div class="pane"><div class="pane__hello"><h3>Welcome, ' + firstName(p) + ".</h3><p>Here is what your children are learning.</p></div>" +
        '<div class="kids">' + kids.map((k) =>
          '<button class="kid" data-action="kid" data-id="' + k.id + '" aria-pressed="' + (k.id === kid.id) + '" id="kid-' + k.id + '">' +
          '<span class="who"><span class="avatar avatar--sm">' + initials(k.name) + "</span><span><strong>" + esc(k.name) + '</strong><small>Age ' + esc(k.age) + " · " + trackName(k.track) + " track</small></span></span>" +
          '<span class="kid__meta">' + enrolled(k).length + " courses · " + lessonsDone(k) + " lessons · " + (k.badges || []).length + " badges</span></button>").join("") + "</div>" +
        '<h3 class="pane__title">' + firstName(kid) + "'s learning</h3>" + learningTiles(kid) +
        '<div class="pane__grid"><div class="card"><p class="card__title">Courses</p><ul class="courses courses--mini">' + enrolled(kid).map((x) => courseHTML(x)).join("") + "</ul></div>" +
        '<div class="card"><p class="card__title">Notes from ' + (teacher ? esc(teacher.name) : "the teacher") + "</p>" + notesHTML(kid.notes) +
        '<p class="card__title">Events</p>' + (kidEvents.length ? '<ul class="notes">' + kidEvents.map((e) => '<li class="note"><strong>' + esc(e.title) + "</strong><cite>" + esc(fmtDay(e.date).wd + " " + fmtDay(e.date).md) + " · " + fmtTime(e.time) + "</cite></li>").join("") + "</ul>" : '<p class="empty">Not registered for any events yet.</p>') +
        "</div></div></div>";
    }

    function teacherPane(t, tab) {
      if (tab === "events") {
        const evs = Accounts.upcoming();
        const mine = new Set(Accounts.studentsOf(t.id).map((s) => s.id));
        return '<div class="pane"><h3 class="pane__title">Upcoming events</h3>' +
          (evs.length ? '<ul class="schedule">' + evs.map((e) => {
            const fromClass = Accounts.attendees(e.id).filter((u) => mine.has(u.id));
            return eventRow(e, "", fromClass.length ? "From your class: " + fromClass.map((u) => esc(u.name.split(" ")[0])).join(", ") : "No one from your class yet");
          }).join("") + "</ul>" : '<p class="empty">No events planned yet.</p>') + "</div>";
      }
      if (tab === "waiting") {
        const waiting = Accounts.all("student").filter((s) => !s.teacherId);
        return '<div class="pane"><h3 class="pane__title">Students waiting for a teacher</h3>' +
          (waiting.length ? '<div class="table-wrap"><table class="ptable"><thead><tr><th>Student</th><th>Age</th><th>Track</th><th></th></tr></thead><tbody>' +
            waiting.map((s) => "<tr><td>" + esc(s.name) + '</td><td class="num">' + esc(s.age) + "</td><td>" + trackName(s.track) +
              '</td><td><button class="tool tool--small" data-action="claim" data-id="' + s.id + '">Add to my class</button></td></tr>').join("") + "</tbody></table></div>"
            : '<p class="empty">Every student has a teacher right now.</p>') + "</div>";
      }
      const mine = Accounts.studentsOf(t.id);
      if (!mine.length) {
        return '<div class="pane"><div class="pane__hello"><h3>Welcome, ' + esc(t.name) + '.</h3><p>No students in your class yet. Open <strong>Unassigned students</strong>, or ask the founder to assign some.</p></div></div>';
      }
      if (!ui.studentId || !mine.some((s) => s.id === ui.studentId)) ui.studentId = mine[0].id;
      const sel = Accounts.get(ui.studentId);
      const selCourses = enrolled(sel);
      const missing = BADGES.filter((b) => !(sel.badges || []).includes(b.id));
      return '<div class="pane"><div class="pane__hello"><h3>Welcome, ' + esc(t.name) + ".</h3><p>You teach <strong>" + mine.length + " student" + (mine.length === 1 ? "" : "s") + "</strong> in the " + trackName(t.track) + " track.</p></div>" +
        '<div class="table-wrap"><table class="ptable"><thead><tr><th>Student</th><th>Courses</th><th>Lessons</th><th>Badges</th><th>Last note</th><th></th></tr></thead><tbody>' +
        mine.map((s) => {
          const last = (s.notes || [])[(s.notes || []).length - 1];
          return '<tr class="' + (s.id === sel.id ? "is-picked" : "") + '"><td><span class="who"><span class="avatar avatar--sm">' + initials(s.name) + "</span><span>" + esc(s.name) + "<small>Age " + esc(s.age) + "</small></span></span></td>" +
            "<td>" + (enrolled(s).map((x) => esc(x.c.title)).join(", ") || "—") + '</td><td class="num">' + lessonsDone(s) + '</td><td class="num">' + (s.badges || []).length + "</td>" +
            "<td>" + (last ? fmtDate(last.at) : "—") + '</td><td><button class="tool tool--small" data-action="pick-student" data-id="' + s.id + '">Open</button></td></tr>';
        }).join("") + "</tbody></table></div>" +
        '<h3 class="pane__title">' + esc(sel.name) + "</h3>" +
        '<div class="pane__grid"><div class="card"><p class="card__title">Course progress</p>' +
          (selCourses.length ? '<ul class="courses courses--mini">' + selCourses.map((x) => courseHTML(x)).join("") + "</ul>" +
            '<form class="feedback__row" id="lessonForm"><label class="sr" for="lessonCourse">Course</label><select id="lessonCourse" class="ide__select">' +
            selCourses.filter((x) => !finished(x)).map((x) => '<option value="' + x.c.id + '">' + esc(x.c.title) + "</option>").join("") + "</select>" +
            '<button class="tool" type="submit"' + (selCourses.some((x) => !finished(x)) ? "" : " disabled") + ">Record a finished lesson</button></form>"
            : '<p class="empty">Not enrolled in any course yet.</p>') +
          '<p class="card__title">Award a badge</p>' +
          (missing.length ? '<form class="feedback__row" id="badgeForm"><label class="sr" for="badgePick">Badge</label><select id="badgePick" class="ide__select">' +
            missing.map((b) => '<option value="' + b.id + '">' + esc(b.name) + "</option>").join("") + '</select><button class="tool" type="submit">Award badge</button></form>'
            : '<p class="empty">' + firstName(sel) + " has every badge!</p>") +
        "</div>" +
        '<div class="card"><p class="card__title">Feedback for ' + firstName(sel) + "</p>" +
        '<form class="feedback" id="feedbackForm"><label class="sr" for="feedbackText">Note for ' + esc(sel.name) + "</label>" +
        '<textarea id="feedbackText" placeholder="What went well, and what to try next…" required></textarea>' +
        '<div class="feedback__row"><button class="btn btn--primary btn--sm" type="submit">Send note</button></div>' +
        '<p class="hint">Notes also go to the inbox of the student and their parents.</p></form>' +
        '<p class="card__title">Recent notes</p>' + notesHTML(sel.notes) + "</div></div></div>";
    }

    function founderPane(f, tab) {
      const students = Accounts.all("student"), teachers = Accounts.all("teacher"), parents = Accounts.all("parent");
      const q = ui.founderQuery.trim().toLowerCase();
      const match = (u) => !q || u.name.toLowerCase().includes(q) || u.username.includes(q);
      const search = '<div class="filter-row"><label class="sr" for="founderSearch">Search people</label><input type="search" id="founderSearch" placeholder="Search by name or username" value="' + esc(ui.founderQuery) + '"></div>';
      const actions = (u) => '<span class="row-actions"><button class="tool tool--small" data-action="view-as" data-id="' + u.id + '">Open portal</button>' +
        '<button class="tool tool--small" data-action="reset-pw" data-id="' + u.id + '">Reset password</button>' + removeBtn(u.id) + "</span>";
      const who = (u) => '<span class="who"><span class="avatar avatar--sm">' + initials(u.name) + "</span><span>" + esc(u.name) + "<small>@" + esc(u.username) + "</small></span></span>";

      if (tab === "students") {
        return '<div class="pane"><div class="pane__row"><h3 class="pane__title">Students (' + students.length + ")</h3>" + search + "</div>" +
          '<div class="table-wrap"><table class="ptable"><thead><tr><th>Student</th><th>Age · level</th><th>Teacher</th><th>Parents</th><th>Learning</th><th>Security</th><th></th></tr></thead><tbody>' +
          students.filter(match).map((s) => "<tr><td>" + who(s) + "</td>" +
            "<td>" + esc(s.age) + " · " + LEVEL_NAMES[bandForAge(s.age)] + '<small class="block">' + trackName(s.track) + " track</small></td><td>" + teacherSelect(s, "assign-" + s.id) + "</td>" +
            "<td>" + (Accounts.parentsOf(s.id).map((p) => esc(p.name)).join(", ") || "—") + "</td>" +
            "<td>" + enrolled(s).length + " courses<small class=\"block\">" + lessonsDone(s) + " lessons · " + (s.badges || []).length + " badges</small></td>" +
            "<td>" + secChips(s) + "</td><td>" + actions(s) + "</td></tr>").join("") +
          "</tbody></table></div></div>";
      }
      if (tab === "teachers") {
        return '<div class="pane"><div class="pane__row"><h3 class="pane__title">Teachers (' + teachers.length + ")</h3>" + search + "</div>" +
          '<div class="table-wrap"><table class="ptable"><thead><tr><th>Teacher</th><th>Track</th><th>Class</th><th>Notes</th><th>Security</th><th></th></tr></thead><tbody>' +
          teachers.filter(match).map((t) => {
            const kids = Accounts.studentsOf(t.id);
            const notes = students.reduce((a, s) => a + (s.notes || []).filter((n) => n.from === t.name).length, 0);
            return "<tr><td>" + who(t) + "</td><td>" + trackName(t.track) + "</td><td>" + (kids.map((k) => firstName(k)).join(", ") || "—") +
              '</td><td class="num">' + notes + "</td><td>" + secChips(t) + "</td><td>" + actions(t) + "</td></tr>";
          }).join("") + "</tbody></table></div>" +
          '<p class="hint">Teacher invite code (share it only with new teachers): <code>' + esc(CONFIG.teacherInviteCode) + "</code></p></div>";
      }
      if (tab === "parents") {
        return '<div class="pane"><div class="pane__row"><h3 class="pane__title">Parents (' + parents.length + ")</h3>" + search + "</div>" +
          '<div class="table-wrap"><table class="ptable"><thead><tr><th>Parent</th><th>Children</th><th>Joined</th><th>Security</th><th></th></tr></thead><tbody>' +
          parents.filter(match).map((p) => "<tr><td>" + who(p) + "</td>" +
            "<td>" + ((p.childIds || []).map((id) => Accounts.get(id)).filter(Boolean).map((k) => esc(k.name)).join(", ") || "—") + "</td><td>" + fmtDate(p.createdAt) + "</td>" +
            "<td>" + secChips(p) + "</td><td>" + actions(p) + "</td></tr>").join("") +
          "</tbody></table></div></div>";
      }
      if (tab === "events") {
        const evs = Accounts.events();
        const kinds = EVENT_KINDS.map((k) => '<option value="' + k + '">' + k + "</option>").join("");
        const auds = '<option value="all">Everyone</option>' + Object.keys(TRACK_INFO).map((k) => '<option value="' + k + '">' + TRACK_INFO[k].full + " track</option>").join("");
        return '<div class="pane"><h3 class="pane__title">Events</h3>' +
          '<div class="card"><p class="card__title">Plan an event</p><form class="form form--event" id="eventForm" autocomplete="off">' +
          '<div class="field field--full"><label for="evTitle">Title</label><input id="evTitle" type="text" maxlength="80" required placeholder="Robot races in the studio"></div>' +
          '<div class="field"><label for="evDate">Date</label><input id="evDate" type="date" required min="' + todayISO() + '" value="' + addDays(7) + '"></div>' +
          '<div class="field"><label for="evTime">Time</label><input id="evTime" type="time" required value="16:30"></div>' +
          '<div class="field"><label for="evKind">Type</label><select id="evKind">' + kinds + "</select></div>" +
          '<div class="field"><label for="evAud">Who is it for</label><select id="evAud">' + auds + "</select></div>" +
          '<p class="form__error field--full" id="evError"></p>' +
          '<button class="btn btn--primary btn--sm" type="submit" style="width:fit-content">Add event</button></form></div>' +
          (evs.length ? '<ul class="schedule">' + evs.map((e) => {
            const going = Accounts.attendees(e.id);
            return eventRow(e, removeBtn(e.id, "Cancel event"), going.length + " registered" + (going.length ? ": " + going.map((u) => esc(u.name.split(" ")[0])).join(", ") : ""));
          }).join("") + "</ul>" : '<p class="empty">No events yet.</p>') + "</div>";
      }
      // overview
      const enrolments = students.reduce((a, s) => a + enrolled(s).length, 0);
      const lessons = students.reduce((a, s) => a + lessonsDone(s), 0);
      const upcoming = Accounts.upcoming();
      const noTeacher = students.filter((s) => !s.teacherId);
      const noParent = students.filter((s) => !Accounts.parentsOf(s.id).length);
      const noKey = Accounts.all().filter((u) => !u.keyHash).length;
      const newest = Accounts.all().filter((u) => u.role !== "founder").slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);
      const confirmingReset = ui.confirmRemove === "__reset";
      return '<div class="pane"><div class="pane__hello"><h3>Founder overview</h3><p>You can see and manage every student, teacher and parent account.</p></div>' +
        '<div class="stats">' +
        '<div class="stat"><p class="stat__label">Students</p><p class="stat__num">' + students.length + "</p></div>" +
        '<div class="stat"><p class="stat__label">Teachers</p><p class="stat__num">' + teachers.length + "</p></div>" +
        '<div class="stat"><p class="stat__label">Parents</p><p class="stat__num">' + parents.length + "</p></div>" +
        '<div class="stat"><p class="stat__label">Course enrolments</p><p class="stat__num">' + enrolments + '</p><p class="stat__note">' + lessons + " lessons finished</p></div>" +
        '<div class="stat"><p class="stat__label">Upcoming events</p><p class="stat__num">' + upcoming.length + "</p></div></div>" +
        '<div class="pane__grid"><div class="card"><p class="card__title">Needs attention</p>' +
        (noTeacher.length ? "<p>" + noTeacher.length + " student" + (noTeacher.length === 1 ? "" : "s") + " without a teacher: <strong>" + noTeacher.map((s) => esc(s.name)).join(", ") + "</strong></p>" : "<p>Every student has a teacher.</p>") +
        (noParent.length ? "<p>" + noParent.length + " student" + (noParent.length === 1 ? "" : "s") + " without a linked parent: <strong>" + noParent.map((s) => esc(s.name)).join(", ") + "</strong></p>" : "<p>Every student has a parent linked.</p>") +
        "<p>" + noKey + " account" + (noKey === 1 ? "" : "s") + " without a security key.</p>" +
        '<button class="tool tool--small" data-action="tab" data-tab="students" style="width:fit-content">Manage students</button></div>' +
        '<div class="card"><p class="card__title">Next events</p>' +
        (upcoming.length ? '<ul class="notes">' + upcoming.slice(0, 4).map((e) => '<li class="note"><strong>' + esc(e.title) + "</strong><cite>" + esc(fmtDay(e.date).wd + " " + fmtDay(e.date).md) + " · " + fmtTime(e.time) + " · " + Accounts.attendees(e.id).length + " registered</cite></li>").join("") + "</ul>" : '<p class="empty">No events planned.</p>') +
        '<button class="tool tool--small" data-action="tab" data-tab="events" style="width:fit-content">Plan events</button></div></div>' +
        '<div class="pane__grid"><div class="card"><p class="card__title">Newest accounts</p><ul class="notes">' +
        newest.map((u) => '<li class="note"><span class="who"><span class="avatar avatar--sm">' + initials(u.name) + "</span><span>" + esc(u.name) + " " + roleBadge(u.role) + "<small>Joined " + fmtDate(u.createdAt) + "</small></span></span></li>").join("") +
        "</ul></div>" +
        '<div class="card"><p class="card__title">Preview data</p><p class="empty">Accounts, messages and events in this preview are stored in this browser only.</p>' +
        '<button class="tool tool--small tool--danger" data-action="reset" style="width:fit-content">' + (confirmingReset ? "Confirm: reset all accounts" : "Reset example accounts") + "</button></div></div></div>";
    }

    // ----- auth + lock screens -----
    function authView() {
      const r = ui.signupRole;
      const tracks = Object.keys(TRACK_INFO).map((k) => '<option value="' + k + '">' + TRACK_INFO[k].full + "</option>").join("");
      const roleCards = [
        ["student", "Student", "Courses, badges and events"],
        ["parent", "Parent", "Follow your child's learning"],
        ["teacher", "Teacher", "Needs an invite code"],
        ["founder", "Founder", "Needs the founder code"],
      ].map(([k, t, d]) => '<button type="button" role="radio" class="role-pick role-pick--' + k + '" data-action="signup-role" data-role="' + k + '" aria-checked="' + (r === k) + '" id="pick-' + k + '"><strong>' + t + "</strong><span>" + d + "</span></button>").join("");

      const left = ui.authMode === "recover"
        ? '<div class="auth__panel"><h3>Reset your password</h3><p>Use the security key you saved on your Account page.</p>' +
          '<form class="form" id="recoverForm" autocomplete="off">' +
          '<div class="field field--full"><label for="rcUser">Username</label><input id="rcUser" type="text" required></div>' +
          '<div class="field field--full"><label for="rcKey">Security key</label><input id="rcKey" type="text" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" required></div>' +
          '<div class="field field--full"><label for="rcPass">New password (6+ characters)</label><input id="rcPass" type="password" minlength="6" required autocomplete="new-password"></div>' +
          '<p class="form__error field--full" id="rcError"></p>' +
          '<button class="btn btn--primary field--full" type="submit">Reset password and sign in</button></form>' +
          '<button class="linkbtn" data-action="auth-mode" data-mode="signin">Back to sign in</button>' +
          '<p class="hint">No security key? Ask the founder to reset your password.</p></div>'
        : '<div class="auth__panel"><div class="auth__brand"><img src="' + BULB_SRC + '" alt="" width="56" height="56"><span><span class="bdai-word">BDAI</span> <span class="bdai-tag">Student Portal</span></span></div>' +
          '<h3>Sign in</h3><p>Use the username and password you chose.</p>' +
          '<form class="form" id="signinForm" autocomplete="off">' +
          '<div class="field field--full"><label for="siUser">Username</label><input id="siUser" type="text" required autocomplete="username"></div>' +
          '<div class="field field--full"><label for="siPass">Password</label><input id="siPass" type="password" required autocomplete="current-password"></div>' +
          '<p class="form__error field--full" id="siError"></p>' +
          '<button class="btn btn--primary field--full" type="submit">Sign in</button></form>' +
          '<button class="linkbtn" data-action="auth-mode" data-mode="recover">Forgot your password?</button>' +
          '<div class="demo-bar"><p class="demo-bar__label">Preview with an example account</p><div class="demo-bar__row">' +
          '<button class="role-chip role-chip--student" data-action="demo" data-user="mira">Student</button>' +
          '<button class="role-chip role-chip--parent" data-action="demo" data-user="priya">Parent</button>' +
          '<button class="role-chip role-chip--teacher" data-action="demo" data-user="ananya">Teacher</button>' +
          '<button class="role-chip role-chip--founder" data-action="demo" data-user="founder">Founder</button></div>' +
          '<p class="hint">Example password: <code>' + CONFIG.demoPassword + "</code>. The example student's Account page PIN is <code>1234</code>.</p></div></div>";

      return '<div class="auth">' + left +
        '<div class="auth__panel"><h3>Create an account</h3><p>Choose who you are. Each role gets its own portal.</p>' +
          '<div class="roles" role="radiogroup" aria-label="Account type">' + roleCards + "</div>" +
          '<form class="form" id="signupForm" autocomplete="off">' +
          '<div class="field"><label for="suName">Full name</label><input id="suName" type="text" required maxlength="40"></div>' +
          '<div class="field"><label for="suUser">Username</label><input id="suUser" type="text" required maxlength="20" placeholder="letters and numbers"></div>' +
          '<div class="field field--full"><label for="suPass">Password (6+ characters)</label><input id="suPass" type="password" required minlength="6" autocomplete="new-password"></div>' +
          '<div class="field" data-for="student"' + (r === "student" ? "" : " hidden") + '><label for="suAge">Age</label><input id="suAge" type="number" min="6" max="16"></div>' +
          '<div class="field" data-for="student teacher"' + (r === "student" || r === "teacher" ? "" : " hidden") + '><label for="suTrack">' + (r === "teacher" ? "Track you teach" : "Favourite track") + '</label><select id="suTrack">' + tracks + "</select></div>" +
          '<div class="field field--full" data-for="parent"' + (r === "parent" ? "" : " hidden") + '><label for="suChild">Child\'s username (optional)</label><input id="suChild" type="text" placeholder="You can link later too"></div>' +
          '<div class="field field--full" data-for="teacher"' + (r === "teacher" ? "" : " hidden") + '><label for="suInvite">Teacher invite code</label><input id="suInvite" type="text" placeholder="From the founder"></div>' +
          '<div class="field field--full" data-for="founder"' + (r === "founder" ? "" : " hidden") + '><label for="suFounder">Founder code</label><input id="suFounder" type="password" placeholder="Paste the full founder code" autocomplete="off"></div>' +
          '<p class="form__error field--full" id="suError"></p>' +
          '<button class="btn btn--primary field--full" type="submit">Create ' + ROLE_LABEL[r].toLowerCase() + " account</button></form>" +
          '<p class="hint">New students start with a course that fits their age and favourite track. After you sign up, open <strong>Account</strong> to add a PIN and a security key.</p></div>' +
        "</div>";
    }
    function lockView(u) {
      return '<div class="lockscreen"><div class="avatar" aria-hidden="true">' + initials(u.name) + "</div>" +
        "<h3>Welcome back, " + firstName(u) + ".</h3>" +
        (ui.pinRecovery
          ? "<p>Enter your security key to remove your PIN and open the portal.</p>" + keyRecoveryForm("keyPinForm", "Remove PIN and open") +
            '<button class="linkbtn" data-action="pin-recovery" data-on="0">Back to PIN</button>'
          : "<p>Your portal is locked. Enter your PIN to open it.</p>" +
            '<form class="form form--narrow" id="unlockForm" autocomplete="off"><div class="field field--full"><label for="unlockPin">PIN</label>' +
            '<input id="unlockPin" class="pin-input" type="password" inputmode="numeric" maxlength="6" required></div>' +
            '<p class="form__error field--full" id="unlockError"></p><button class="btn btn--primary field--full" type="submit">Unlock</button></form>' +
            '<button class="linkbtn" data-action="pin-recovery" data-on="1">Forgot your PIN? Use your security key</button>') +
        '<button class="linkbtn" data-action="signout">Sign in as someone else</button></div>';
    }

    // ----- render -----
    function render() {
      const me = ui.sessionId ? Accounts.get(ui.sessionId) : null;
      if (!me) {
        portalApp.className = "portal portal--auth";
        portalApp.innerHTML = authView();
        return;
      }
      if (ui.locked) {
        portalApp.className = "portal portal--auth";
        portalApp.innerHTML = lockView(me);
        return;
      }
      const viewing = ui.viewAsId && me.role === "founder" ? Accounts.get(ui.viewAsId) : null;
      const user = viewing || me;
      if (location.hash === "#inbox") {
        portalApp.className = "portal portal--mail";
        portalApp.innerHTML = inboxPage(user, !!viewing);
        return;
      }
      const tabs = TABS[user.role];
      if (!ui.tab || !tabs.some((t) => t[0] === ui.tab)) ui.tab = tabs[0][0];
      const unread = Accounts.unread(user.id);

      let sub = "";
      if (user.role === "student") sub = "Age " + user.age + " · " + trackName(user.track) + " track";
      if (user.role === "parent") { const n = (user.childIds || []).length; sub = n + " child" + (n === 1 ? "" : "ren") + " linked"; }
      if (user.role === "teacher") sub = trackName(user.track) + " track";
      if (user.role === "founder") sub = "Full access";

      const side = '<aside class="portal__side"><div class="portal__me"><div class="avatar" aria-hidden="true">' + initials(user.name) + "</div>" +
        '<div><p class="portal__name">' + esc(user.name) + '</p><p class="portal__sub">' + roleBadge(user.role) + " " + esc(sub) + "</p></div></div>" +
        '<nav class="portal__tabs" role="tablist" aria-label="Portal sections">' +
        tabs.map(([k, label]) => '<button role="tab" data-action="' + (k === "inbox" ? "open-inbox" : "tab") + '" data-tab="' + k + '" id="ptab-' + k + '" aria-selected="' + (ui.tab === k) + '">' + label +
          (k === "inbox" && unread ? ' <span class="count" aria-label="' + unread + ' unread">' + unread + "</span>" : "") + "</button>").join("") +
        '</nav><button class="tool tool--quiet portal__signout" data-action="signout">Sign out</button></aside>';

      let body = "";
      if (ui.notice) {
        body += '<div class="notice" role="status"><p>' + esc(ui.notice.text) + '</p><div class="notice__row"><code id="noticeValue">' + esc(ui.notice.value) + "</code>" +
          '<button class="tool tool--small" data-action="copy-notice">Copy</button><button class="tool tool--small tool--quiet" data-action="dismiss-notice">Dismiss</button></div></div>';
      }
      if (viewing) body += '<div class="impersonate"><span>Founder view: you are looking at <strong>' + esc(viewing.name) + "</strong>'s portal.</span>" +
        '<button class="tool tool--small" data-action="back-founder">Back to founder view</button></div>';
      if (ui.tab === "account") body += viewing ? founderSecurityPane(user) : accountPane(user);
      else if (user.role === "student") body += studentPane(user, ui.tab);
      else if (user.role === "parent") body += parentPane(user, ui.tab);
      else if (user.role === "teacher") body += teacherPane(user, ui.tab);
      else if (user.role === "founder") body += founderPane(user, ui.tab);

      portalApp.className = "portal";
      portalApp.innerHTML = side + '<div class="portal__main">' + body + "</div>";
    }

    // the person whose portal is on screen (founders may be viewing someone else)
    const activeUser = () => {
      const me = Accounts.get(ui.sessionId);
      return me && me.role === "founder" && ui.viewAsId ? Accounts.get(ui.viewAsId) : me;
    };
    const focusEl = (id) => { const el = document.getElementById(id); if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } };
    // who may change an event registration for `userId`
    function canRsvp(userId) {
      const me = activeUser(); if (!me) return false;
      if (me.id === userId) return true;
      if (me.role === "parent") return (me.childIds || []).includes(userId);
      return false;
    }

    // ----- events -----
    portalApp.addEventListener("click", async (e) => {
      const el = e.target.closest("[data-action]");
      if (!el || el.tagName === "SELECT") return;
      const a = el.dataset.action;
      const me = Accounts.get(ui.sessionId);
      const isFounder = me && me.role === "founder";
      if (a !== "remove" && a !== "reset") ui.confirmRemove = null;

      if (a === "tab") { ui.tab = el.dataset.tab; ui.msgId = null; ui.composing = false; ui.pinRecovery = false; render(); }
      else if (a === "signout") signOut();
      else if (a === "demo") {
        if (!Accounts.byUsername(el.dataset.user)) Accounts.reset();
        const u = Accounts.byUsername(el.dataset.user);
        if (u) { signIn(u.id); toast("Signed in to the example " + ROLE_LABEL[u.role].toLowerCase() + " account."); }
      }
      else if (a === "auth-mode") { ui.authMode = el.dataset.mode; render(); }
      else if (a === "signup-role") { ui.signupRole = el.dataset.role; render(); }
      else if (a === "kid") { ui.kidId = el.dataset.id; render(); }
      else if (a === "pick-student") { ui.studentId = el.dataset.id; render(); }
      else if (a === "claim") {
        const t = activeUser(); const s = Accounts.get(el.dataset.id);
        if (t && s) { Accounts.update(s.id, { teacherId: t.id }); ui.studentId = s.id; render(); toast(s.name + " joined your class."); }
      }
      // learning
      else if (a === "continue") {
        const c = courseById(el.dataset.course);
        if (c) toast("Your next “" + c.title + "” lesson is in your next live studio. Your teacher marks it done when you finish.");
      }
      else if (a === "enroll") {
        const s = activeUser(); const c = courseById(el.dataset.course);
        if (!s || !c || ui.viewAsId) return;
        Accounts.update(s.id, { courses: (s.courses || []).concat({ id: c.id, done: 0 }) });
        render(); toast("You joined “" + c.title + "”.");
      }
      else if (a === "rsvp") {
        if (ui.viewAsId || !canRsvp(el.dataset.user)) return;
        const going = Accounts.toggleEvent(el.dataset.user, el.dataset.event);
        const ev = Accounts.event(el.dataset.event);
        render(); toast((going ? "Registered for " : "Registration cancelled: ") + (ev ? ev.title : "event") + ".");
      }
      // inbox
      else if (a === "box") { ui.box = el.dataset.box; ui.msgId = null; ui.composing = false; render(); }
      else if (a === "open-msg") {
        ui.msgId = el.dataset.id; ui.composing = false;
        if (!ui.viewAsId && ui.box === "in") Accounts.markRead(ui.msgId);
        render();
      }
      else if (a === "compose") { ui.composing = true; ui.msgId = null; render(); focusEl("mTo"); }
      else if (a === "open-inbox") {
        Object.assign(ui, { box: "in", msgId: null, composing: false, mailQuery: "" });
        if (location.hash === "#inbox") render(); else location.hash = "#inbox";
      }
      else if (a === "copy-addr") { const u = activeUser(); if (u) copyText(u.inboxAddress, $("#myAddr")); }
      else if (a === "add-to") {
        const input = $("#mTo"); if (!input) return;
        const list = input.value.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
        if (!list.map((s) => s.toLowerCase()).includes(el.dataset.addr)) list.push(el.dataset.addr);
        input.value = list.join(", ");
        input.focus();
      }
      else if (a === "cancel-compose") { ui.composing = false; render(); }
      // founder tools
      else if (a === "view-as" && isFounder) { ui.viewAsId = el.dataset.id; ui.tab = null; ui.kidId = null; ui.studentId = null; ui.msgId = null; ui.box = "in"; render(); }
      else if (a === "back-founder") { ui.viewAsId = null; ui.tab = null; ui.msgId = null; render(); }
      else if (a === "remove" && isFounder) {
        const id = el.dataset.id;
        if (ui.confirmRemove !== id) { ui.confirmRemove = id; render(); return; }
        ui.confirmRemove = null;
        const ev = Accounts.event(id);
        if (ev) { Accounts.removeEvent(id); render(); toast("Event cancelled: " + ev.title + "."); return; }
        const u = Accounts.get(id);
        if (ui.viewAsId === id) ui.viewAsId = null;
        Accounts.remove(id); render(); if (u) toast(u.name + "'s account was removed.");
      }
      else if (a === "reset" && isFounder) {
        if (ui.confirmRemove !== "__reset") { ui.confirmRemove = "__reset"; render(); return; }
        ui.confirmRemove = null; Accounts.reset(); signIn("u-founder"); toast("Example accounts restored.");
      }
      else if (a === "reset-pw" && isFounder) {
        const u = Accounts.get(el.dataset.id); if (!u) return;
        const temp = randomCode(3, 4).toLowerCase();
        Accounts.update(u.id, { pwHash: await hashSecret(temp, saltOf(u)), demo: false });
        ui.notice = { text: "Temporary password for " + u.name + " (@" + u.username + "). Share it with them privately and ask them to change it on their Account page.", value: temp };
        render();
      }
      else if (a === "clear-pin" && isFounder) {
        const u = Accounts.get(el.dataset.id); if (!u) return;
        Accounts.update(u.id, { pinHash: null, demoPin: null, pinOnOpen: false });
        render(); toast(u.name + "'s PIN was removed.");
      }
      else if (a === "copy-notice" && ui.notice) copyText(ui.notice.value, $("#noticeValue"));
      else if (a === "dismiss-notice") { ui.notice = null; render(); }
      // account
      else if (a === "pin-recovery") { ui.pinRecovery = el.dataset.on === "1"; render(); focusEl(ui.pinRecovery ? "keyPinFormKey" : (ui.locked ? "unlockPin" : "gatePin")); }
      else if (a === "lock") { ui.locked = true; ui.accountUnlocked = false; ui.pinTries = 0; ui.pinRecovery = false; render(); focusEl("unlockPin"); }
      else if (a === "remove-own-pin") {
        const u = activeUser();
        Accounts.update(u.id, { pinHash: null, demoPin: null, pinOnOpen: false });
        ui.accountUnlocked = false; render(); toast("PIN turned off.");
      }
      else if (a === "make-key") {
        const u = activeUser();
        const key = randomCode(5, 4);
        Accounts.update(u.id, { keyHash: await hashSecret(normKey(key), "key:" + saltOf(u)), keyAt: todayISO() });
        ui.newKey = key; render();
      }
      else if (a === "copy-key" && ui.newKey) copyText(ui.newKey, $("#keyBox"));
      else if (a === "key-done") {
        const box = $("#keySaved");
        if (box && !box.checked) { $("#keyError").textContent = "Tick the box once your key is saved. You won't see it again."; return; }
        ui.newKey = null; render(); toast("Security key is set up.");
      }
    });

    portalApp.addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset.action === "assign") {
        const me = Accounts.get(ui.sessionId);
        if (!me || me.role !== "founder") return;
        const s = Accounts.update(el.dataset.id, { teacherId: el.value });
        const t = Accounts.get(el.value);
        render();
        toast(t ? s.name + " is now in " + t.name + "'s class." : s.name + " has no teacher now.");
      }
    });
    portalApp.addEventListener("input", (e) => {
      if (e.target.id === "mailSearch") {
        ui.mailQuery = e.target.value;
        const pos = e.target.selectionStart;
        render();
        const s = $("#mailSearch"); if (s) { s.focus(); s.setSelectionRange(pos, pos); }
        return;
      }
      if (e.target.id === "founderSearch") {
        ui.founderQuery = e.target.value;
        const pos = e.target.selectionStart;
        render();
        const s = $("#founderSearch"); if (s) { s.focus(); s.setSelectionRange(pos, pos); }
      }
    });

    portalApp.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
      const fail = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

      if (f.id === "signinForm") {
        const u = Accounts.byUsername(val("siUser"));
        if (!u) return fail("siError", "We couldn't find that username. Check the spelling or create an account.");
        if (!(await checkPassword(u, val("siPass")))) return fail("siError", "That password doesn't match. Try again.");
        signIn(u.id); toast("Welcome back, " + u.name.split(" ")[0] + "!");
      }

      if (f.id === "recoverForm") {
        const u = Accounts.byUsername(val("rcUser"));
        if (!u) return fail("rcError", "We couldn't find that username.");
        if (!u.keyHash) return fail("rcError", "This account has no security key yet. Ask the founder to reset your password.");
        if (!(await checkKey(u, val("rcKey")))) return fail("rcError", "That security key doesn't match this account.");
        if (val("rcPass").length < 6) return fail("rcError", "Passwords need at least 6 characters.");
        Accounts.update(u.id, { pwHash: await hashSecret(val("rcPass"), saltOf(u)), demo: false });
        signIn(u.id); toast("Password reset. Welcome back!");
      }

      if (f.id === "signupForm") {
        const role = ui.signupRole;
        const name = val("suName").trim();
        const username = val("suUser").trim().toLowerCase();
        const pw = val("suPass");
        if (name.length < 2) return fail("suError", "Please enter a full name.");
        if (!/^[a-z0-9_.-]{3,20}$/.test(username)) return fail("suError", "Usernames use 3 to 20 letters, numbers, dots, dashes or underscores.");
        if (Accounts.byUsername(username)) return fail("suError", "That username is taken. Try another one.");
        if (pw.length < 6) return fail("suError", "Passwords need at least 6 characters.");

        const salt = newSalt();
        const user = { id: "u-" + username + "-" + Date.now().toString(36), role, name, username, salt, pwHash: await hashSecret(pw, salt), createdAt: todayISO(), events: [] };

        if (role === "student") {
          const age = Number(val("suAge"));
          if (!(age >= 6 && age <= 16)) return fail("suError", "Students are 6 to 16 years old. Please enter an age in that range.");
          const track = val("suTrack");
          const band = bandForAge(age);
          const starter = COURSES.find((c) => c.track === track && c.band === band) || COURSES.find((c) => c.track === track);
          Object.assign(user, {
            age, track, teacherId: "", courses: starter ? [{ id: starter.id, done: 0 }] : [], badges: [],
            notes: [{ from: "BDAI", at: todayISO(), text: "Welcome to BDAI! Your first course" + (starter ? ", " + starter.title + "," : "") + " is ready in Courses." }],
          });
        }
        if (role === "parent") {
          user.childIds = [];
          const childName = val("suChild").trim();
          if (childName) {
            const child = Accounts.byUsername(childName);
            if (!child || child.role !== "student") return fail("suError", "No student has the username “" + childName + "”. Leave it blank to link later.");
            user.childIds.push(child.id);
          }
        }
        if (role === "teacher") {
          if (normCode(val("suInvite")) !== CONFIG.teacherInviteCode) return fail("suError", "That invite code isn't right. Ask the founder for the teacher invite code.");
          user.track = val("suTrack");
        }
        if (role === "founder") {
          if (!(await checkFounderCode(val("suFounder")))) return fail("suError", "That founder code isn't right.");
        }
        Accounts.add(user);
        const founder = Accounts.all("founder").find((x) => x.id !== user.id);
        if (founder) Accounts.send(founder.id, [user.id], "Welcome to BDAI", "Hi " + name.split(" ")[0] + ", welcome to the BDAI Student Portal! Your inbox address is " + user.inboxAddress + ". Open Account to add a PIN and a security key, so your account stays safe.");
        signIn(user.id);
        toast("Account created. Your inbox address is " + user.inboxAddress + ".");
      }

      if (f.id === "linkForm") {
        const p = activeUser();
        const child = Accounts.byUsername(val("linkUser"));
        if (!child || child.role !== "student") return fail("linkError", "No student has that username. Check the spelling with your child.");
        if ((p.childIds || []).includes(child.id)) return fail("linkError", child.name + " is already linked to your account.");
        Accounts.update(p.id, { childIds: (p.childIds || []).concat(child.id) });
        ui.tab = "kids"; ui.kidId = child.id; render();
        toast(child.name + " is now linked to your account.");
      }

      // teacher tools
      if (f.id === "feedbackForm") {
        const t = activeUser();
        const s = Accounts.get(ui.studentId);
        const text = val("feedbackText").trim();
        if (!s || !text) return;
        Accounts.update(s.id, { notes: (s.notes || []).concat({ from: t.name, at: todayISO(), text }) });
        Accounts.send(t.id, [s.id].concat(Accounts.parentsOf(s.id).map((p) => p.id)), "New note for " + s.name.split(" ")[0], text);
        render(); toast("Note sent to " + s.name + " and their parents.");
      }
      if (f.id === "lessonForm") {
        const s = Accounts.get(ui.studentId);
        const cid = val("lessonCourse");
        const c = courseById(cid);
        if (!s || !c) return;
        let doneNow = 0;
        const courses = (s.courses || []).map((x) => (x.id === cid ? (doneNow = Math.min(c.lessons, x.done + 1), { id: x.id, done: doneNow }) : x));
        const patch = { courses };
        if (doneNow >= c.lessons && !(s.badges || []).includes("course-finisher")) patch.badges = (s.badges || []).concat("course-finisher");
        Accounts.update(s.id, patch);
        render();
        toast(doneNow >= c.lessons ? s.name.split(" ")[0] + " finished “" + c.title + "”!" : "Lesson " + doneNow + " of " + c.lessons + " recorded for " + s.name.split(" ")[0] + ".");
      }
      if (f.id === "badgeForm") {
        const s = Accounts.get(ui.studentId);
        const b = BADGES.find((x) => x.id === val("badgePick"));
        if (!s || !b) return;
        Accounts.update(s.id, { badges: (s.badges || []).concat(b.id) });
        render(); toast(s.name.split(" ")[0] + " earned the " + b.name + " badge.");
      }

      // founder events
      if (f.id === "eventForm") {
        const title = val("evTitle").trim();
        const date = val("evDate");
        if (!title) return fail("evError", "Give the event a title.");
        if (!date || date < todayISO()) return fail("evError", "Pick a date from today onwards.");
        Accounts.addEvent({ id: "e" + Date.now().toString(36), date, time: val("evTime") || "16:30", title, kind: val("evKind"), audience: val("evAud"), host: ui.sessionId });
        render(); toast("Event added: " + title + ".");
      }

      // inbox
      if (f.id === "composeForm") {
        const u = activeUser();
        const r = resolveRecipients(u, val("mTo"));
        if (r.error) return fail("mError", r.error);
        const subject = val("mSubject").trim();
        const body = val("mBody").trim();
        if (!subject || !body) return fail("mError", "Add a subject and a message.");
        Accounts.send(u.id, r.ids, subject, body);
        ui.composing = false; ui.box = "sent"; ui.msgId = null; render();
        toast(r.ids.length > 1 ? "Message sent to " + r.ids.length + " people." : "Message sent to " + addrOf(r.ids[0]) + ".");
      }
      if (f.id === "replyForm") {
        const u = activeUser();
        const to = f.dataset.to;
        const body = val("replyText").trim();
        if (!body || !Accounts.get(to)) return;
        Accounts.send(u.id, [to], f.dataset.subject, body);
        render(); toast("Reply sent to " + nameOf(to) + ".");
      }

      // account
      if (f.id === "profileForm") {
        const name = val("pfName").trim();
        if (name.length < 2) return;
        Accounts.update(activeUser().id, { name }); render(); toast("Name saved.");
      }
      if (f.id === "passwordForm") {
        const u = activeUser();
        if (!(await checkPassword(u, val("pwOld")))) return fail("pwError", "Your current password doesn't match.");
        if (val("pwNew").length < 6) return fail("pwError", "New passwords need at least 6 characters.");
        if (val("pwNew") !== val("pwNew2")) return fail("pwError", "The two new passwords don't match.");
        Accounts.update(u.id, { pwHash: await hashSecret(val("pwNew"), saltOf(u)), demo: false });
        render(); toast("Password changed.");
      }
      if (f.id === "pinForm") {
        const u = activeUser();
        const pin = val("pinNew");
        if (!/^\d{4,6}$/.test(pin)) return fail("pinError", "Use 4 to 6 numbers for your PIN.");
        if (pin !== val("pinNew2")) return fail("pinError", "The two PINs don't match.");
        const onOpen = !!($("#pinOnOpen") && $("#pinOnOpen").checked);
        Accounts.update(u.id, { pinHash: await hashSecret(pin, "pin:" + saltOf(u)), demoPin: null, pinOnOpen: onOpen });
        ui.accountUnlocked = true; render();
        toast(onOpen ? "PIN saved. You'll need it to open the portal and this page." : "PIN saved. You'll need it to open this page.");
      }
      if (f.id === "pinGateForm") {
        const u = activeUser();
        if (await checkPin(u, val("gatePin"))) { ui.accountUnlocked = true; ui.pinTries = 0; render(); return; }
        ui.pinTries++;
        if (ui.pinTries >= CONFIG.maxPinTries) { signOut(); toast("Too many wrong PINs. Sign in with your password."); return; }
        fail("gateError", "Wrong PIN. " + (CONFIG.maxPinTries - ui.pinTries) + " tries left.");
        $("#gatePin").value = "";
      }
      if (f.id === "unlockForm") {
        const u = Accounts.get(ui.sessionId);
        if (await checkPin(u, val("unlockPin"))) { ui.locked = false; ui.pinTries = 0; render(); toast("Unlocked."); return; }
        ui.pinTries++;
        if (ui.pinTries >= CONFIG.maxPinTries) { signOut(); toast("Too many wrong PINs. Sign in with your password."); return; }
        fail("unlockError", "Wrong PIN. " + (CONFIG.maxPinTries - ui.pinTries) + " tries left.");
        $("#unlockPin").value = "";
      }
      if (f.id === "keyPinForm") {
        const u = ui.locked ? Accounts.get(ui.sessionId) : activeUser();
        if (!u.keyHash) return fail("keyPinFormError", "This account has no security key. Sign in with your password, or ask the founder to remove your PIN.");
        if (!(await checkKey(u, val("keyPinFormKey")))) return fail("keyPinFormError", "That security key doesn't match this account.");
        Accounts.update(u.id, { pinHash: null, demoPin: null, pinOnOpen: false });
        Object.assign(ui, { locked: false, accountUnlocked: true, pinRecovery: false, pinTries: 0 });
        render(); toast("PIN removed. You can set a new one on your Account page.");
      }
    });

    // Founder link: index-11.html#founder-access opens founder sign-up
    function handleHash() {
      if (location.hash !== "#founder-access") return;
      const me = ui.sessionId ? Accounts.get(ui.sessionId) : null;
      if (!me) {
        ui.authMode = "signin"; ui.signupRole = "founder"; render(); focusEl("suFounder");
      } else if (me.role !== "founder") {
        toast("You're signed in as " + me.name + ". Sign out to set up a founder account.");
      }
    }
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("hashchange", () => { if (location.hash === "#inbox" || location.hash === "#student-portal") render(); });

    render();
    handleHash();
  }

  /* =======================================================
     8. Join form: suggests a starting class (runs in the browser)
     Connect this to your enrollment system when ready.
     ======================================================= */
  const joinForm = $("#joinForm");
  if (joinForm) {
    joinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameEl = $("#parentName"), ageEl = $("#childAge");
      const name = nameEl.value.trim();
      const age = Number(ageEl.value);
      nameEl.parentElement.classList.toggle("is-invalid", !name);
      const badAge = !(age >= 6 && age <= 16);
      ageEl.parentElement.classList.toggle("is-invalid", badAge);
      const out = $("#joinResult");
      if (!name) { out.textContent = "Please add your name so we know who to talk to."; nameEl.focus(); return; }
      if (badAge) { out.textContent = "Our classes are for ages 6 to 16. Please enter an age in that range."; ageEl.focus(); return; }

      const level = bandForAge(age);
      const track = $("#interest").value;
      const first = TRACKS[track][level][0];
      out.innerHTML = "Thanks, " + esc(name) + ". We suggest <strong>" + TRACK_INFO[track].full + " · " + LEVEL_NAMES[level] +
        "</strong>. A great first project: “" + esc(first) + "”.";
    });
  }
})();
