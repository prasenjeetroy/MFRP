/* =========================================================
   BDAI Young Innovators · script-10.js
   Plain JavaScript, no frameworks. Each numbered block powers one
   section of index-10.html.

   Python runs in the browser with Skulpt (vendor/skulpt.min.js and
   vendor/skulpt-stdlib.js), loaded the first time Python runs.
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
    const SKULPT_BASE = "vendor/";

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
        if ((lang === "python" && trimmed.endsWith(":")) || (lang !== "python" && /[{(\[]$/.test(trimmed))) indent += LANGS[lang].indent;
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
        'window.addEventListener("load",function(){s("done",[])});})();<\/script>';
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
          code.replace(/<\/script/gi, "<\\/script") + "\n<\/script></body></html>";
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
    let skulptLoading = null;
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error("Could not load " + src));
        document.head.appendChild(s);
      });
    }
    function ensureSkulpt() {
      if (window.Sk && window.Sk.builtinFiles) return Promise.resolve();
      if (!skulptLoading) {
        skulptLoading = loadScript(SKULPT_BASE + "skulpt.min.js")
          .then(() => loadScript(SKULPT_BASE + "skulpt-stdlib.js"))
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
        logLine("Python could not load. Keep the vendor folder next to index-10.html. (" + err.message + ")", "err");
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
     7. Student Portal: accounts for students, parents,
        teachers and founders
     -------------------------------------------------------
     PREVIEW MODE. Accounts live in this browser's storage so the
     whole flow can be tried without a server. Before launch,
     replace `Accounts` with calls to your real backend, and check
     passwords and setup codes on the server, never in this file.
     ======================================================= */
  const portalApp = $("#portalApp");
  if (portalApp) {
    const CONFIG = {
      teacherInviteCode: "BDAI-TEACH-2026",   // given to new teachers by the founder
      founderSetupCode: "BDAI-FOUNDER-2026",  // only the founder knows this
      demoPassword: "demo1234",
    };
    const DB_KEY = "bdai.portal.v2";
    const SESSION_KEY = "bdai.portal.session";

    const BADGES = [
      { id: "first-program", name: "First Program", how: "Ran your first line of code" },
      { id: "digital-painter", name: "Digital Painter", how: "Finished a Paint Studio challenge" },
      { id: "circuit-starter", name: "Circuit Starter", how: "Lit up your first LED" },
      { id: "pattern-spotter", name: "Pattern Spotter", how: "Solved 10 pattern puzzles" },
      { id: "team-player", name: "Team Player", how: "Helped a classmate debug" },
      { id: "streak-7", name: "7-Day Streak", how: "Learned 7 days in a row" },
      { id: "web-builder", name: "Web Builder", how: "Published a web page" },
      { id: "python-pro", name: "Python Pro", how: "Wrote a 50-line Python program" },
      { id: "data-detective", name: "Data Detective", how: "Cleaned a dataset of 50 rows" },
      { id: "robot-wrangler", name: "Robot Wrangler", how: "Finished a robot maze run" },
      { id: "kind-coder", name: "Kind Coder", how: "Left 5 helpful comments" },
      { id: "streak-30", name: "30-Day Streak", how: "Learned 30 days in a row" },
    ];
    const SCHEDULE = [
      { day: "Thu", time: "4:30 PM", title: "Live studio: teach a model to tell cats from dogs", sub: "AI track · Ms. Ananya Rao", live: true },
      { day: "Sat", time: "10:00 AM", title: "Paint Studio jam: a city that runs on sunshine", sub: "Creativity track · Mr. Rohan Mehta" },
      { day: "Sun", time: "5:00 PM", title: "Show and tell: share your project", sub: "All tracks · family welcome" },
      { day: "Tue", time: "4:30 PM", title: "Circuits: build a doorbell", sub: "Technology track · Ms. Leela Iyer" },
    ];
    const RANKS = ["Spark", "Spark", "Code Cadet", "Code Cadet", "Bright Builder", "Bright Builder", "Idea Engineer", "Idea Engineer", "Innovation Star"];
    const levelOf = (xp) => 1 + Math.floor((xp || 0) / 200);
    const rankOf = (xp) => RANKS[Math.min(levelOf(xp) - 1, RANKS.length - 1)];
    const today = () => new Date().toISOString().slice(0, 10);
    const fmtDate = (iso) => {
      const d = new Date(iso + "T12:00:00");
      return isNaN(d) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };
    const streakOf = (days) => Array.from({ length: 14 }, (_, i) => i >= 14 - days);

    function seed() {
      const s = (o) => Object.assign({ demo: true, createdAt: "2026-09-01" }, o);
      return {
        users: [
          s({ id: "u-founder", role: "founder", name: "BDAI Founder", username: "founder" }),
          s({ id: "u-ananya", role: "teacher", name: "Ms. Ananya Rao", username: "ananya", track: "ai" }),
          s({ id: "u-rohan", role: "teacher", name: "Mr. Rohan Mehta", username: "rohan", track: "create" }),
          s({ id: "u-leela", role: "teacher", name: "Ms. Leela Iyer", username: "leela", track: "tech" }),
          s({ id: "u-mira", role: "student", name: "Mira Sharma", username: "mira", age: 11, track: "ai", teacherId: "u-ananya",
            xp: 1240, streak: [false, true, false, false, false].concat(streakOf(9).slice(5)),
            projects: [
              { name: "Fruit-sorting robot", track: "ai", pct: 72 },
              { name: "Animated greeting card", track: "create", pct: 45 },
              { name: "Traffic light circuit", track: "tech", pct: 100 },
              { name: "My first web page", track: "tech", pct: 30 },
            ],
            badges: ["first-program", "digital-painter", "circuit-starter", "pattern-spotter", "team-player", "streak-7"],
            notes: [{ from: "Ms. Ananya Rao", at: "2026-11-24", text: "Your robot sorted 18 of 20 pictures correctly. Try adding more examples of green apples. It keeps calling them limes!" }] }),
          s({ id: "u-arjun", role: "student", name: "Arjun Sharma", username: "arjun", age: 8, track: "tech", teacherId: "u-leela",
            xp: 380, streak: streakOf(3),
            projects: [
              { name: "Paper circuit night-light", track: "tech", pct: 100 },
              { name: "Floor robot maze", track: "tech", pct: 60 },
            ],
            badges: ["first-program", "circuit-starter"],
            notes: [{ from: "Ms. Leela Iyer", at: "2026-11-22", text: "Great job finding the bug in your maze code. Next week we add a sensor." }] }),
          s({ id: "u-zoe", role: "student", name: "Zoe Chen", username: "zoe", age: 14, track: "create", teacherId: "u-rohan",
            xp: 2100, streak: streakOf(12),
            projects: [
              { name: "Generative art in JavaScript", track: "create", pct: 80 },
              { name: "School club brand", track: "create", pct: 55 },
              { name: "Animated poster", track: "create", pct: 100 },
            ],
            badges: ["first-program", "digital-painter", "web-builder", "python-pro", "team-player", "streak-7", "kind-coder"],
            notes: [{ from: "Mr. Rohan Mehta", at: "2026-11-20", text: "Your colour palette for the club brand is bold and clear. Try a second version in black and white." }] }),
          s({ id: "u-kabir", role: "student", name: "Kabir Das", username: "kabir", age: 10, track: "tech", teacherId: "",
            xp: 150, streak: streakOf(1),
            projects: [{ name: "Block code story", track: "tech", pct: 40 }],
            badges: ["first-program"], notes: [] }),
          s({ id: "u-priya", role: "parent", name: "Priya Sharma", username: "priya", childIds: ["u-mira", "u-arjun"] }),
          s({ id: "u-david", role: "parent", name: "David Chen", username: "david", childIds: ["u-zoe"] }),
        ],
      };
    }

    // ----- data layer (swap for your API) -----
    const Accounts = {
      db: null,
      load() {
        const d = store.get(DB_KEY, null);
        this.db = d && Array.isArray(d.users) ? d : seed();
        this.save();
      },
      save() { store.set(DB_KEY, this.db); },
      reset() { this.db = seed(); this.save(); },
      all(role) { return this.db.users.filter((u) => !role || u.role === role); },
      get(id) { return this.db.users.find((u) => u.id === id) || null; },
      byUsername(name) {
        const n = String(name || "").trim().toLowerCase();
        return this.db.users.find((u) => u.username === n) || null;
      },
      add(user) { this.db.users.push(user); this.save(); return user; },
      update(id, patch) { const u = this.get(id); if (u) { Object.assign(u, patch); this.save(); } return u; },
      remove(id) {
        this.db.users = this.db.users.filter((u) => u.id !== id);
        this.db.users.forEach((u) => {
          if (u.role === "parent") u.childIds = (u.childIds || []).filter((c) => c !== id);
          if (u.role === "student" && u.teacherId === id) u.teacherId = "";
        });
        this.save();
      },
      parentsOf(studentId) { return this.all("parent").filter((p) => (p.childIds || []).includes(studentId)); },
      studentsOf(teacherId) { return this.all("student").filter((s) => s.teacherId === teacherId); },
    };

    async function hashPassword(pw, salt) {
      const text = salt + ":" + pw;
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      let h = 2166136261; // fallback for very old browsers
      for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
      return "f" + (h >>> 0).toString(16);
    }
    async function checkPassword(user, pw) {
      if (user.pwHash) return (await hashPassword(pw, user.salt)) === user.pwHash;
      return user.demo && pw === CONFIG.demoPassword;
    }

    Accounts.load();

    // ----- UI state -----
    const ui = {
      sessionId: null,
      viewAsId: null,
      tab: null,
      authMode: "signin",
      signupRole: "student",
      kidId: null,
      studentId: null,
      founderQuery: "",
      confirmRemove: null,
    };
    const savedSession = store.get(SESSION_KEY, null);
    ui.sessionId = savedSession === null ? "u-mira" : savedSession || null;
    if (ui.sessionId && !Accounts.get(ui.sessionId)) ui.sessionId = null;

    const TABS = {
      student: [["home", "Dashboard"], ["projects", "My projects"], ["badges", "Badges"], ["schedule", "Schedule"]],
      parent: [["kids", "My children"], ["schedule", "Class schedule"], ["link", "Link a child"]],
      teacher: [["roster", "My students"], ["waiting", "Unassigned students"], ["schedule", "Schedule"]],
      founder: [["overview", "Overview"], ["students", "Students"], ["teachers", "Teachers"], ["parents", "Parents"]],
    };
    const ROLE_LABEL = { student: "Student", parent: "Parent", teacher: "Teacher", founder: "Founder" };

    function signIn(id) {
      ui.sessionId = id; ui.viewAsId = null; ui.tab = null; ui.kidId = null; ui.studentId = null; ui.confirmRemove = null;
      store.set(SESSION_KEY, id);
      render();
    }
    function signOut() {
      ui.sessionId = null; ui.viewAsId = null; ui.tab = null; ui.authMode = "signin";
      store.set(SESSION_KEY, "");
      render();
    }

    // ----- shared pieces -----
    const initials = (name) => esc(String(name).replace(/^(Ms|Mr|Mrs|Dr)\.?\s+/i, "").trim().charAt(0).toUpperCase() || "?");
    const roleBadge = (role) => '<span class="role-badge role-badge--' + role + '">' + ROLE_LABEL[role] + "</span>";
    const trackName = (t) => (TRACK_INFO[t] ? TRACK_INFO[t].name : "—");

    function projectHTML(p) {
      const info = TRACK_INFO[p.track] || TRACK_INFO.tech;
      const done = p.pct >= 100;
      return '<li class="project' + (done ? " project--done" : "") + '">' +
        '<span class="project__dot" style="background:' + info.tone + '"></span>' +
        '<span class="project__name">' + esc(p.name) + "</span>" +
        '<span class="project__pct">' + (done ? "Done" : p.pct + "%") + "</span>" +
        '<span class="project__track">' + info.name + " track</span>" +
        '<span class="bar"><span style="width:' + Math.min(100, p.pct) + "%;" + (done ? "background:" + COLORS.mint : "") + '"></span></span></li>';
    }
    function notesHTML(notes) {
      if (!notes || !notes.length) return '<p class="empty">No teacher notes yet.</p>';
      return '<ul class="notes">' + notes.slice().reverse().slice(0, 4).map((n) =>
        '<li class="note">“' + esc(n.text) + '”<cite>' + esc(n.from) + " · " + fmtDate(n.at) + "</cite></li>").join("") + "</ul>";
    }
    function statsHTML(s) {
      const lvl = levelOf(s.xp), next = lvl * 200, pct = Math.round(((s.xp - (lvl - 1) * 200) / 200) * 100);
      const days = (() => { let n = 0; for (let i = (s.streak || []).length - 1; i >= 0 && s.streak[i]; i--) n++; return n; })();
      const nextBadge = BADGES.find((b) => !(s.badges || []).includes(b.id));
      return '<div class="stats">' +
        '<div class="stat"><p class="stat__label">XP to level ' + (lvl + 1) + '</p><p class="stat__num">' + Number(s.xp).toLocaleString() + "<small> / " + next.toLocaleString() + "</small></p>" +
          '<span class="bar"><span style="width:' + pct + '%"></span></span></div>' +
        '<div class="stat"><p class="stat__label">Learning streak</p><p class="stat__num">' + days + "<small> day" + (days === 1 ? "" : "s") + "</small></p>" +
          '<div class="streak" aria-label="Last 14 days">' + (s.streak || []).map((on) => '<i class="' + (on ? "on" : "") + '"></i>').join("") + "</div></div>" +
        '<div class="stat"><p class="stat__label">Badges earned</p><p class="stat__num">' + (s.badges || []).length + "<small> of " + BADGES.length + "</small></p>" +
          '<p class="stat__note">' + (nextBadge ? "Next: <strong>" + esc(nextBadge.name) + "</strong>" : "<strong>All badges earned!</strong>") + "</p></div>" +
        "</div>";
    }
    function scheduleHTML() {
      return '<ul class="schedule">' + SCHEDULE.map((s, n) =>
        '<li class="slot"><span class="slot__when"><b>' + s.day + "</b><span>" + s.time + "</span></span>" +
        '<span><span class="slot__title">' + esc(s.title) + '</span><br><span class="slot__sub">' + esc(s.sub) + "</span></span>" +
        '<button class="tool slot__btn" data-action="slot" data-live="' + (s.live ? 1 : 0) + '" data-title="' + esc(s.title) + '" id="slot-' + n + '">' + (s.live ? "Join" : "Remind me") + "</button></li>").join("") + "</ul>";
    }
    function badgesHTML(s) {
      const tones = [COLORS.cyan, COLORS.violet, COLORS.pink, COLORS.mint, COLORS.sun, "#ff8a4c"];
      return '<ul class="badges">' + BADGES.map((b, n) => {
        const got = (s.badges || []).includes(b.id);
        const ini = b.name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2);
        return '<li class="badge' + (got ? "" : " badge--locked") + '"><span class="badge__medal" style="' + (got ? "background:" + tones[n % tones.length] : "") + '">' + ini + "</span>" +
          '<span class="badge__name">' + esc(b.name) + '</span><span class="badge__how">' + (got ? "" : "Locked · ") + esc(b.how) + "</span></li>";
      }).join("") + "</ul>";
    }
    function teacherSelect(student, id) {
      const opts = ['<option value="">No teacher yet</option>'].concat(Accounts.all("teacher").map((t) =>
        '<option value="' + t.id + '"' + (t.id === student.teacherId ? " selected" : "") + ">" + esc(t.name) + " (" + trackName(t.track) + ")</option>"));
      return '<select data-action="assign" data-id="' + student.id + '" id="' + id + '" aria-label="Teacher for ' + esc(student.name) + '">' + opts.join("") + "</select>";
    }
    function removeBtn(u) {
      const confirming = ui.confirmRemove === u.id;
      return '<button class="tool tool--small tool--danger" data-action="remove" data-id="' + u.id + '">' + (confirming ? "Confirm remove" : "Remove") + "</button>";
    }

    // ----- role views -----
    function studentPane(s, tab) {
      const teacher = Accounts.get(s.teacherId);
      if (tab === "projects") return '<div class="pane"><h3 class="pane__title">My projects</h3><ul class="projects">' + (s.projects || []).map(projectHTML).join("") + "</ul></div>";
      if (tab === "badges") return '<div class="pane"><h3 class="pane__title">Badges</h3>' + badgesHTML(s) + "</div>";
      if (tab === "schedule") return '<div class="pane"><h3 class="pane__title">This week</h3>' + scheduleHTML() + "</div>";
      const open = (s.projects || []).filter((p) => p.pct < 100).slice(0, 3);
      return '<div class="pane"><div class="pane__hello"><h3>Good to see you, ' + esc(s.name.split(" ")[0]) + ".</h3>" +
        "<p>" + (teacher ? "Your teacher is <strong>" + esc(teacher.name) + "</strong>. " : "You will be matched with a teacher soon. ") +
        "Next live studio: <strong>Thursday at 4:30 PM</strong>.</p></div>" + statsHTML(s) +
        '<div class="pane__grid"><div class="card"><p class="card__title">Keep going</p>' +
        (open.length ? '<ul class="projects projects--mini">' + open.map(projectHTML).join("") + "</ul>" : '<p class="empty">All projects finished. Ask your teacher for the next one!</p>') +
        '</div><div class="card"><p class="card__title">Teacher notes</p>' + notesHTML(s.notes) + "</div></div></div>";
    }

    function parentPane(p, tab) {
      if (tab === "schedule") return '<div class="pane"><h3 class="pane__title">Class schedule</h3>' + scheduleHTML() + "</div>";
      if (tab === "link") {
        return '<div class="pane"><h3 class="pane__title">Link a child</h3><p class="empty">Ask your child for their Student Portal username, then add it here.</p>' +
          '<form class="form" id="linkForm" autocomplete="off"><div class="field"><label for="linkUser">Child\'s username</label><input id="linkUser" type="text" required></div>' +
          '<div class="field" style="align-content:end"><button class="btn btn--primary btn--sm" type="submit">Link child</button></div>' +
          '<p class="form__error field--full" id="linkError"></p></form>' +
          '<p class="hint">Try linking the example student <code>kabir</code>.</p></div>';
      }
      const kids = (p.childIds || []).map((id) => Accounts.get(id)).filter(Boolean);
      if (!kids.length) {
        return '<div class="pane"><div class="pane__hello"><h3>Welcome, ' + esc(p.name.split(" ")[0]) + ".</h3><p>No children linked yet. Open <strong>Link a child</strong> to add your child's account.</p></div></div>";
      }
      if (!ui.kidId || !kids.some((k) => k.id === ui.kidId)) ui.kidId = kids[0].id;
      const kid = Accounts.get(ui.kidId);
      const teacher = Accounts.get(kid.teacherId);
      return '<div class="pane"><div class="pane__hello"><h3>Welcome, ' + esc(p.name.split(" ")[0]) + ".</h3><p>Here is how your children are doing this week.</p></div>" +
        '<div class="kids">' + kids.map((k) =>
          '<button class="kid" data-action="kid" data-id="' + k.id + '" aria-pressed="' + (k.id === kid.id) + '" id="kid-' + k.id + '">' +
          '<span class="who"><span class="avatar avatar--sm">' + initials(k.name) + "</span><span><strong>" + esc(k.name) + '</strong><small>Age ' + esc(k.age) + " · " + trackName(k.track) + " track</small></span></span>" +
          '<span class="kid__meta">Level ' + levelOf(k.xp) + " · " + rankOf(k.xp) + " · " + (k.badges || []).length + " badges</span></button>").join("") + "</div>" +
        '<h3 class="pane__title">' + esc(kid.name.split(" ")[0]) + "'s progress</h3>" + statsHTML(kid) +
        '<div class="pane__grid"><div class="card"><p class="card__title">Projects</p><ul class="projects projects--mini">' + (kid.projects || []).map(projectHTML).join("") + "</ul></div>" +
        '<div class="card"><p class="card__title">Notes from ' + (teacher ? esc(teacher.name) : "the teacher") + "</p>" + notesHTML(kid.notes) + "</div></div></div>";
    }

    function teacherPane(t, tab) {
      if (tab === "schedule") return '<div class="pane"><h3 class="pane__title">Schedule</h3>' + scheduleHTML() + "</div>";
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
      const avg = (s) => (s.projects && s.projects.length ? Math.round(s.projects.reduce((a, p) => a + p.pct, 0) / s.projects.length) : 0);
      return '<div class="pane"><div class="pane__hello"><h3>Welcome, ' + esc(t.name) + ".</h3><p>You teach <strong>" + mine.length + " student" + (mine.length === 1 ? "" : "s") + "</strong> in the " + trackName(t.track) + " track.</p></div>" +
        '<div class="table-wrap"><table class="ptable"><thead><tr><th>Student</th><th>Level</th><th>XP</th><th>Projects</th><th>Last note</th><th></th></tr></thead><tbody>' +
        mine.map((s) => {
          const last = (s.notes || [])[(s.notes || []).length - 1];
          return '<tr class="' + (s.id === sel.id ? "is-picked" : "") + '"><td><span class="who"><span class="avatar avatar--sm">' + initials(s.name) + "</span><span>" + esc(s.name) + "<small>Age " + esc(s.age) + "</small></span></span></td>" +
            '<td>' + levelOf(s.xp) + " · " + rankOf(s.xp) + '</td><td class="num">' + Number(s.xp).toLocaleString() + '</td><td class="num">' + avg(s) + "% avg</td>" +
            "<td>" + (last ? fmtDate(last.at) : "—") + '</td><td><button class="tool tool--small" data-action="pick-student" data-id="' + s.id + '">Give feedback</button></td></tr>';
        }).join("") + "</tbody></table></div>" +
        '<div class="pane__grid"><div class="card"><p class="card__title">Feedback for ' + esc(sel.name) + "</p>" +
        '<form class="feedback" id="feedbackForm"><label class="sr" for="feedbackText">Note for ' + esc(sel.name) + '</label>' +
        '<textarea id="feedbackText" placeholder="What went well, and what to try next…" required></textarea>' +
        '<div class="feedback__row"><button class="btn btn--primary btn--sm" type="submit">Send note</button>' +
        '<button class="tool" type="button" data-action="xp" data-amount="25">+25 XP</button><button class="tool" type="button" data-action="xp" data-amount="50">+50 XP</button></div></form></div>' +
        '<div class="card"><p class="card__title">Recent notes</p>' + notesHTML(sel.notes) + "</div></div></div>";
    }

    function founderPane(f, tab) {
      const students = Accounts.all("student"), teachers = Accounts.all("teacher"), parents = Accounts.all("parent");
      const q = ui.founderQuery.trim().toLowerCase();
      const match = (u) => !q || u.name.toLowerCase().includes(q) || u.username.includes(q);
      const search = '<div class="filter-row"><label class="sr" for="founderSearch">Search people</label><input type="search" id="founderSearch" placeholder="Search by name or username" value="' + esc(ui.founderQuery) + '"></div>';
      const openBtn = (u) => '<button class="tool tool--small" data-action="view-as" data-id="' + u.id + '">Open portal</button>';

      if (tab === "students") {
        return '<div class="pane"><div class="pane__row"><h3 class="pane__title">Students (' + students.length + ")</h3>" + search + "</div>" +
          '<div class="table-wrap"><table class="ptable"><thead><tr><th>Student</th><th>Age · level</th><th>Track</th><th>Teacher</th><th>Parents</th><th>XP</th><th></th></tr></thead><tbody>' +
          students.filter(match).map((s) => "<tr><td><span class=\"who\"><span class=\"avatar avatar--sm\">" + initials(s.name) + "</span><span>" + esc(s.name) + "<small>@" + esc(s.username) + "</small></span></span></td>" +
            "<td>" + esc(s.age) + " · " + LEVEL_NAMES[bandForAge(s.age)] + "</td><td>" + trackName(s.track) + "</td><td>" + teacherSelect(s, "assign-" + s.id) + "</td>" +
            "<td>" + (Accounts.parentsOf(s.id).map((p) => esc(p.name)).join(", ") || "—") + '</td><td class="num">' + Number(s.xp).toLocaleString() + "</td>" +
            '<td><span class="row-actions">' + openBtn(s) + removeBtn(s) + "</span></td></tr>").join("") +
          "</tbody></table></div></div>";
      }
      if (tab === "teachers") {
        return '<div class="pane"><div class="pane__row"><h3 class="pane__title">Teachers (' + teachers.length + ")</h3>" + search + "</div>" +
          '<div class="table-wrap"><table class="ptable"><thead><tr><th>Teacher</th><th>Track</th><th>Students</th><th>Notes written</th><th></th></tr></thead><tbody>' +
          teachers.filter(match).map((t) => {
            const kids = Accounts.studentsOf(t.id);
            const notes = students.reduce((a, s) => a + (s.notes || []).filter((n) => n.from === t.name).length, 0);
            return "<tr><td><span class=\"who\"><span class=\"avatar avatar--sm\">" + initials(t.name) + "</span><span>" + esc(t.name) + "<small>@" + esc(t.username) + "</small></span></span></td>" +
              "<td>" + trackName(t.track) + "</td><td>" + (kids.map((k) => esc(k.name.split(" ")[0])).join(", ") || "—") + '</td><td class="num">' + notes + "</td>" +
              '<td><span class="row-actions">' + openBtn(t) + removeBtn(t) + "</span></td></tr>";
          }).join("") + "</tbody></table></div>" +
          '<p class="hint">New teachers sign up with the teacher invite code: <code>' + esc(CONFIG.teacherInviteCode) + "</code></p></div>";
      }
      if (tab === "parents") {
        return '<div class="pane"><div class="pane__row"><h3 class="pane__title">Parents (' + parents.length + ")</h3>" + search + "</div>" +
          '<div class="table-wrap"><table class="ptable"><thead><tr><th>Parent</th><th>Children</th><th>Joined</th><th></th></tr></thead><tbody>' +
          parents.filter(match).map((p) => "<tr><td><span class=\"who\"><span class=\"avatar avatar--sm\">" + initials(p.name) + "</span><span>" + esc(p.name) + "<small>@" + esc(p.username) + "</small></span></span></td>" +
            "<td>" + ((p.childIds || []).map((id) => Accounts.get(id)).filter(Boolean).map((k) => esc(k.name)).join(", ") || "—") + "</td><td>" + fmtDate(p.createdAt) + "</td>" +
            '<td><span class="row-actions">' + openBtn(p) + removeBtn(p) + "</span></td></tr>").join("") +
          "</tbody></table></div></div>";
      }
      // overview
      const totalXP = students.reduce((a, s) => a + (s.xp || 0), 0);
      const noTeacher = students.filter((s) => !s.teacherId);
      const noParent = students.filter((s) => !Accounts.parentsOf(s.id).length);
      const newest = Accounts.all().filter((u) => u.role !== "founder").slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);
      const confirmingReset = ui.confirmRemove === "__reset";
      return '<div class="pane"><div class="pane__hello"><h3>Founder overview</h3><p>You can see and manage every student, teacher and parent account.</p></div>' +
        '<div class="stats">' +
        '<div class="stat"><p class="stat__label">Students</p><p class="stat__num">' + students.length + "</p></div>" +
        '<div class="stat"><p class="stat__label">Teachers</p><p class="stat__num">' + teachers.length + "</p></div>" +
        '<div class="stat"><p class="stat__label">Parents</p><p class="stat__num">' + parents.length + "</p></div>" +
        '<div class="stat"><p class="stat__label">XP earned</p><p class="stat__num">' + totalXP.toLocaleString() + "</p></div></div>" +
        '<div class="pane__grid"><div class="card"><p class="card__title">Needs attention</p>' +
        (noTeacher.length ? "<p>" + noTeacher.length + " student" + (noTeacher.length === 1 ? "" : "s") + " without a teacher: <strong>" + noTeacher.map((s) => esc(s.name)).join(", ") + "</strong></p>" : "<p>Every student has a teacher.</p>") +
        (noParent.length ? "<p>" + noParent.length + " student" + (noParent.length === 1 ? "" : "s") + " without a linked parent: <strong>" + noParent.map((s) => esc(s.name)).join(", ") + "</strong></p>" : "<p>Every student has a parent linked.</p>") +
        '<button class="tool tool--small" data-action="tab" data-tab="students" style="width:fit-content">Manage students</button></div>' +
        '<div class="card"><p class="card__title">Newest accounts</p><ul class="notes">' +
        newest.map((u) => '<li class="note"><span class="who"><span class="avatar avatar--sm">' + initials(u.name) + "</span><span>" + esc(u.name) + " " + roleBadge(u.role) + "<small>Joined " + fmtDate(u.createdAt) + "</small></span></span></li>").join("") +
        "</ul></div></div>" +
        '<div class="card"><p class="card__title">Preview data</p><p class="empty">Accounts in this preview are stored in this browser only.</p>' +
        '<button class="tool tool--small tool--danger" data-action="reset" style="width:fit-content">' + (confirmingReset ? "Confirm: reset all accounts" : "Reset example accounts") + "</button></div></div>";
    }

    // ----- auth screen -----
    function authView() {
      const r = ui.signupRole;
      const tracks = Object.keys(TRACK_INFO).map((k) => '<option value="' + k + '">' + TRACK_INFO[k].full + "</option>").join("");
      const roleCards = [
        ["student", "Student", "Projects, badges and classes"],
        ["parent", "Parent", "Follow your child's progress"],
        ["teacher", "Teacher", "Needs an invite code"],
        ["founder", "Founder", "Needs the founder setup code"],
      ].map(([k, t, d]) => '<button type="button" role="radio" class="role-pick role-pick--' + k + '" data-action="signup-role" data-role="' + k + '" aria-checked="' + (r === k) + '" id="pick-' + k + '"><strong>' + t + "</strong><span>" + d + "</span></button>").join("");
      return '<div class="auth">' +
        '<div class="auth__panel"><h3>Sign in</h3><p>Welcome back. Use the username and password you chose.</p>' +
          '<form class="form" id="signinForm" autocomplete="off">' +
          '<div class="field field--full"><label for="siUser">Username</label><input id="siUser" type="text" required autocomplete="username"></div>' +
          '<div class="field field--full"><label for="siPass">Password</label><input id="siPass" type="password" required autocomplete="current-password"></div>' +
          '<p class="form__error field--full" id="siError"></p>' +
          '<button class="btn btn--primary field--full" type="submit">Sign in</button></form>' +
          '<p class="hint">Example usernames: <code>mira</code>, <code>priya</code>, <code>ananya</code>, <code>founder</code>. Password: <code>' + CONFIG.demoPassword + "</code></p></div>" +
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
          '<div class="field field--full" data-for="founder"' + (r === "founder" ? "" : " hidden") + '><label for="suFounder">Founder setup code</label><input id="suFounder" type="text"></div>' +
          '<p class="form__error field--full" id="suError"></p>' +
          '<button class="btn btn--primary field--full" type="submit">Create ' + ROLE_LABEL[r].toLowerCase() + " account</button></form>" +
          '<p class="hint">Preview codes: teacher <code>' + CONFIG.teacherInviteCode + "</code>, founder <code>" + CONFIG.founderSetupCode + "</code>. Keep the real ones on your server.</p></div>" +
        "</div>";
    }

    // ----- render -----
    function render() {
      const me = ui.sessionId ? Accounts.get(ui.sessionId) : null;
      $$("#demoBar [data-demo]").forEach((b) => b.classList.toggle("is-on", !!me && me.username === b.dataset.demo && !ui.viewAsId));
      if (!me) {
        portalApp.className = "portal portal--auth";
        portalApp.innerHTML = authView();
        return;
      }
      const viewing = ui.viewAsId && me.role === "founder" ? Accounts.get(ui.viewAsId) : null;
      const user = viewing || me;
      const tabs = TABS[user.role];
      if (!ui.tab || !tabs.some((t) => t[0] === ui.tab)) ui.tab = tabs[0][0];

      let sub = "";
      if (user.role === "student") sub = "Level " + levelOf(user.xp) + " · " + rankOf(user.xp);
      if (user.role === "parent") { const n = (user.childIds || []).length; sub = n + " child" + (n === 1 ? "" : "ren") + " linked"; }
      if (user.role === "teacher") sub = trackName(user.track) + " track";
      if (user.role === "founder") sub = "Full access";

      const side = '<aside class="portal__side"><div class="portal__me"><div class="avatar" aria-hidden="true">' + initials(user.name) + "</div>" +
        '<div><p class="portal__name">' + esc(user.name) + '</p><p class="portal__sub">' + roleBadge(user.role) + " " + esc(sub) + "</p></div></div>" +
        '<nav class="portal__tabs" role="tablist" aria-label="Portal sections">' +
        tabs.map(([k, label]) => '<button role="tab" data-action="tab" data-tab="' + k + '" id="ptab-' + k + '" aria-selected="' + (ui.tab === k) + '">' + label + "</button>").join("") +
        '</nav><button class="tool tool--quiet portal__signout" data-action="signout">Sign out</button></aside>';

      let body = "";
      if (viewing) body += '<div class="impersonate"><span>Founder view: you are looking at <strong>' + esc(viewing.name) + "</strong>'s portal.</span>" +
        '<button class="tool tool--small" data-action="back-founder">Back to founder view</button></div>';
      if (user.role === "student") body += studentPane(user, ui.tab);
      if (user.role === "parent") body += parentPane(user, ui.tab);
      if (user.role === "teacher") body += teacherPane(user, ui.tab);
      if (user.role === "founder") body += founderPane(user, ui.tab);

      portalApp.className = "portal";
      portalApp.innerHTML = side + '<div class="portal__main">' + body + "</div>";
    }

    // the person whose portal is on screen (founders may be viewing someone else)
    const activeUser = () => {
      const me = Accounts.get(ui.sessionId);
      return me && me.role === "founder" && ui.viewAsId ? Accounts.get(ui.viewAsId) : me;
    };

    // ----- events -----
    $("#demoBar").addEventListener("click", (e) => {
      const b = e.target.closest("[data-demo]"); if (!b) return;
      const u = Accounts.byUsername(b.dataset.demo);
      if (!u) { Accounts.reset(); }
      const user = Accounts.byUsername(b.dataset.demo);
      if (user) { signIn(user.id); toast("Signed in as " + user.name + " (" + ROLE_LABEL[user.role] + ")."); }
    });

    portalApp.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el || el.tagName === "SELECT") return;
      const a = el.dataset.action;
      const me = Accounts.get(ui.sessionId);
      if (a !== "remove" && a !== "reset") ui.confirmRemove = null;

      if (a === "tab") { ui.tab = el.dataset.tab; render(); }
      else if (a === "signout") signOut();
      else if (a === "signup-role") { ui.signupRole = el.dataset.role; render(); }
      else if (a === "slot") toast(el.dataset.live === "1" ? "The studio room opens 10 minutes before class." : "Reminder set for “" + el.dataset.title + "”.");
      else if (a === "kid") { ui.kidId = el.dataset.id; render(); }
      else if (a === "pick-student") { ui.studentId = el.dataset.id; render(); const t = $("#feedbackText"); if (t) t.focus({ preventScroll: true }); }
      else if (a === "xp") {
        const s = Accounts.get(ui.studentId); if (!s) return;
        const amt = Number(el.dataset.amount);
        Accounts.update(s.id, { xp: (s.xp || 0) + amt });
        render(); toast("+" + amt + " XP for " + s.name + ".");
      }
      else if (a === "claim") {
        const t = activeUser(); const s = Accounts.get(el.dataset.id);
        if (t && s) { Accounts.update(s.id, { teacherId: t.id }); ui.studentId = s.id; render(); toast(s.name + " joined your class."); }
      }
      else if (a === "view-as" && me && me.role === "founder") { ui.viewAsId = el.dataset.id; ui.tab = null; ui.kidId = null; ui.studentId = null; render(); }
      else if (a === "back-founder") { ui.viewAsId = null; ui.tab = null; render(); }
      else if (a === "remove" && me && me.role === "founder") {
        const id = el.dataset.id;
        if (ui.confirmRemove !== id) { ui.confirmRemove = id; render(); return; }
        const u = Accounts.get(id); ui.confirmRemove = null;
        Accounts.remove(id); render(); if (u) toast(u.name + "'s account was removed.");
      }
      else if (a === "reset" && me && me.role === "founder") {
        if (ui.confirmRemove !== "__reset") { ui.confirmRemove = "__reset"; render(); return; }
        ui.confirmRemove = null; Accounts.reset(); signIn("u-founder"); toast("Example accounts restored.");
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

      if (f.id === "signinForm") {
        const err = $("#siError");
        const u = Accounts.byUsername($("#siUser").value);
        if (!u) { err.textContent = "We couldn't find that username. Check the spelling or create an account."; return; }
        if (!(await checkPassword(u, $("#siPass").value))) { err.textContent = "That password doesn't match. Try again."; return; }
        signIn(u.id); toast("Welcome back, " + u.name.split(" ")[0] + "!");
      }

      if (f.id === "signupForm") {
        const err = $("#suError");
        const role = ui.signupRole;
        const name = $("#suName").value.trim();
        const username = $("#suUser").value.trim().toLowerCase();
        const pw = $("#suPass").value;
        if (name.length < 2) { err.textContent = "Please enter a full name."; return; }
        if (!/^[a-z0-9_.-]{3,20}$/.test(username)) { err.textContent = "Usernames use 3 to 20 letters, numbers, dots, dashes or underscores."; return; }
        if (Accounts.byUsername(username)) { err.textContent = "That username is taken. Try another one."; return; }
        if (pw.length < 6) { err.textContent = "Passwords need at least 6 characters."; return; }

        const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const user = { id: "u-" + username + "-" + Date.now().toString(36), role, name, username, salt, pwHash: await hashPassword(pw, salt), createdAt: today() };

        if (role === "student") {
          const age = Number($("#suAge").value);
          if (!(age >= 6 && age <= 16)) { err.textContent = "Students are 6 to 16 years old. Please enter an age in that range."; return; }
          Object.assign(user, {
            age, track: $("#suTrack").value, teacherId: "", xp: 0, streak: streakOf(1),
            projects: [{ name: "My first web page", track: "tech", pct: 0 }], badges: [],
            notes: [{ from: "BDAI", at: today(), text: "Welcome to BDAI! Open Code Studio and try your first program." }],
          });
        }
        if (role === "parent") {
          user.childIds = [];
          const childName = $("#suChild").value.trim();
          if (childName) {
            const child = Accounts.byUsername(childName);
            if (!child || child.role !== "student") { err.textContent = "No student has the username “" + childName + "”. Leave it blank to link later."; return; }
            user.childIds.push(child.id);
          }
        }
        if (role === "teacher") {
          if ($("#suInvite").value.trim() !== CONFIG.teacherInviteCode) { err.textContent = "That invite code isn't right. Ask the founder for the teacher invite code."; return; }
          user.track = $("#suTrack").value;
        }
        if (role === "founder") {
          if ($("#suFounder").value.trim() !== CONFIG.founderSetupCode) { err.textContent = "That founder setup code isn't right."; return; }
        }
        Accounts.add(user);
        signIn(user.id);
        toast("Account created. Welcome, " + name.split(" ")[0] + "!");
      }

      if (f.id === "linkForm") {
        const p = activeUser();
        const err = $("#linkError");
        const child = Accounts.byUsername($("#linkUser").value);
        if (!child || child.role !== "student") { err.textContent = "No student has that username. Check the spelling with your child."; return; }
        if ((p.childIds || []).includes(child.id)) { err.textContent = child.name + " is already linked to your account."; return; }
        Accounts.update(p.id, { childIds: (p.childIds || []).concat(child.id) });
        ui.tab = "kids"; ui.kidId = child.id; render();
        toast(child.name + " is now linked to your account.");
      }

      if (f.id === "feedbackForm") {
        const t = activeUser();
        const s = Accounts.get(ui.studentId);
        const text = $("#feedbackText").value.trim();
        if (!s || !text) return;
        Accounts.update(s.id, { notes: (s.notes || []).concat({ from: t.name, at: today(), text }) });
        render(); toast("Note sent to " + s.name + " and their parents.");
      }
    });

    render();
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
