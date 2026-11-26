/* =========================================================
   BDAI Young Innovators · script-10.js
   Plain JavaScript, no libraries. Each block below powers one
   section of index-10.html and is safe to remove on its own.
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

  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({
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
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2800);
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
    let w = 0, h = 0, dpr = 1;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      'weather = <span class="s">"' + escapeHTML(value) + '"</span>' + (caret ? '<span class="caret"></span>' : "") + "\n\n" +
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
      builder: ["Program a traffic light on a microcontroller", "Code a step-counter wristband", "Make a quiz game with block code"],
      innovator: ["Build a weather station in Python", "Wire up a line-following robot car", "Publish your first website"],
    },
    create: {
      explorer: ["Draw a pixel pet", "Animate an 8-frame flip-book", "Compose a beat with shapes"],
      builder: ["Design a platform game level", "Shoot a stop-motion short", "Create a sprite pack for your game"],
      innovator: ["Model a 3D character", "Build a game with real physics", "Score music for an animation"],
    },
    ai: {
      explorer: ["Sort pictures like a robot does", "Play spot-the-pattern games", "Talk about why computers make mistakes"],
      builder: ["Train a rock-paper-scissors detector", "Teach a model to sort fruit", "Find the bias in a tiny dataset"],
      innovator: ["Build a chatbot with safety rules", "Train an image classifier in Python", "Debate who is responsible when AI is wrong"],
    },
  };
  const LEVEL_NAMES = { explorer: "Explorer", builder: "Builder", innovator: "Innovator" };

  function showLevel(level) {
    $$("#levelSeg button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.level === level)));
    $$(".track__list").forEach((ul) => {
      const items = TRACKS[ul.dataset.track][level];
      ul.innerHTML = items.map((t, n) => '<li style="animation-delay:' + n * 60 + 'ms">' + escapeHTML(t) + "</li>").join("");
    });
    store.set("bdai.level", level);
  }
  $$("#levelSeg button").forEach((b) => b.addEventListener("click", () => showLevel(b.dataset.level)));
  showLevel(store.get("bdai.level", "explorer"));

  /* =======================================================
     5. Creativity Lab: 16 × 16 pixel sprite editor
     ======================================================= */
  const pixelCanvas = $("#pixelCanvas");
  if (pixelCanvas) {
    const N = 16;
    const pctx = pixelCanvas.getContext("2d");
    const CELL = pixelCanvas.width / N;
    const PALETTE = [
      { name: "Cyan", hex: COLORS.cyan },
      { name: "Violet", hex: COLORS.violet },
      { name: "Pink", hex: COLORS.pink },
      { name: "Mint", hex: COLORS.mint },
      { name: "Sun", hex: "#ffd166" },
      { name: "Tangerine", hex: "#ff8a4c" },
      { name: "Cloud", hex: "#dcd8ff" },
      { name: "White", hex: "#ffffff" },
      { name: "Slate", hex: "#5b5d8a" },
      { name: "Ink", hex: "#0b0c1c" },
    ];
    const EXAMPLE = [
      "................",
      ".......cc.......",
      ".......vv.......",
      "...vvvvvvvvvv...",
      "..vwwwwwwwwwwv..",
      "..vwkkwwwwkkwv..",
      "..vwkkwwwwkkwv..",
      "..vwwwwwwwwwwv..",
      "..vwwppppppwwv..",
      "..vwwwwwwwwwwv..",
      "...vvvvvvvvvv...",
      ".....vvvvvv.....",
      "...ccvvvvvvcc...",
      "...c.vvvvvv.c...",
      ".....v....v.....",
      ".....v....v.....",
    ];
    const KEY = { c: COLORS.cyan, v: COLORS.violet, w: "#dcd8ff", k: "#0b0c1c", p: COLORS.pink };

    const fromExample = () => EXAMPLE.flatMap((row) => row.split("").map((ch) => KEY[ch] || null));
    let grid = store.get("bdai.sprite", null);
    if (!Array.isArray(grid) || grid.length !== N * N) grid = fromExample();

    let color = PALETTE[0].hex;
    let tool = "pen";
    let mirror = true;

    // palette
    const sw = $("#swatches");
    sw.innerHTML = PALETTE.map((p, n) =>
      '<button class="swatch" role="radio" id="swatch-' + n + '" aria-checked="' + (n === 0) + '" aria-label="' + p.name +
      '" data-hex="' + p.hex + '" style="background:' + p.hex + '"></button>').join("");
    sw.addEventListener("click", (e) => {
      const b = e.target.closest(".swatch"); if (!b) return;
      color = b.dataset.hex;
      $$(".swatch", sw).forEach((s) => s.setAttribute("aria-checked", String(s === b)));
      if (tool === "erase") setTool("pen");
    });

    function setTool(t) {
      tool = t;
      $$("[data-tool]").forEach((b) => {
        const on = b.dataset.tool === t;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
    }
    $$("[data-tool]").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool)));
    const mirrorBtn = $("#tool-mirror");
    mirrorBtn.addEventListener("click", () => {
      mirror = !mirror;
      mirrorBtn.setAttribute("aria-pressed", String(mirror));
    });

    function drawGrid() {
      pctx.fillStyle = "#101127";
      pctx.fillRect(0, 0, pixelCanvas.width, pixelCanvas.height);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const v = grid[y * N + x];
          if (v) { pctx.fillStyle = v; pctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
        }
      }
      pctx.strokeStyle = "rgba(190,186,255,0.10)";
      pctx.lineWidth = 1;
      for (let n = 1; n < N; n++) {
        pctx.beginPath(); pctx.moveTo(n * CELL + 0.5, 0); pctx.lineTo(n * CELL + 0.5, pixelCanvas.height); pctx.stroke();
        pctx.beginPath(); pctx.moveTo(0, n * CELL + 0.5); pctx.lineTo(pixelCanvas.width, n * CELL + 0.5); pctx.stroke();
      }
      if (mirror) {
        pctx.strokeStyle = "rgba(240,106,168,0.45)";
        pctx.setLineDash([6, 6]);
        pctx.beginPath(); pctx.moveTo(pixelCanvas.width / 2, 0); pctx.lineTo(pixelCanvas.width / 2, pixelCanvas.height); pctx.stroke();
        pctx.setLineDash([]);
      }
      const painted = grid.filter(Boolean);
      $("#pixelCount").textContent = painted.length;
      $("#colorCount").textContent = new Set(painted).size;
    }

    function paint(x, y) {
      const value = tool === "erase" ? null : color;
      const set = (cx, cy) => { grid[cy * N + cx] = value; };
      if (tool === "fill") {
        floodFill(x, y, value);
        if (mirror) floodFill(N - 1 - x, y, value);
      } else {
        set(x, y);
        if (mirror) set(N - 1 - x, y);
      }
    }
    function floodFill(x, y, value) {
      const target = grid[y * N + x];
      if (target === value) return;
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= N || cy >= N) continue;
        if (grid[cy * N + cx] !== target) continue;
        grid[cy * N + cx] = value;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    }

    function cellFromEvent(e) {
      const r = pixelCanvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * N);
      const y = Math.floor(((e.clientY - r.top) / r.height) * N);
      return (x < 0 || y < 0 || x >= N || y >= N) ? null : [x, y];
    }
    let drawing = false;
    let last = "";
    pixelCanvas.addEventListener("pointerdown", (e) => {
      const c = cellFromEvent(e); if (!c) return;
      drawing = tool !== "fill";
      pixelCanvas.setPointerCapture(e.pointerId);
      paint(c[0], c[1]); last = c.join(); drawGrid();
    });
    pixelCanvas.addEventListener("pointermove", (e) => {
      if (!drawing) return;
      const c = cellFromEvent(e); if (!c || c.join() === last) return;
      last = c.join(); paint(c[0], c[1]); drawGrid();
    });
    const stop = () => { if (drawing || tool === "fill") store.set("bdai.sprite", grid); drawing = false; };
    pixelCanvas.addEventListener("pointerup", stop);
    pixelCanvas.addEventListener("pointercancel", stop);

    $("#pixelClear").addEventListener("click", () => {
      grid = new Array(N * N).fill(null); drawGrid(); store.set("bdai.sprite", grid); toast("Canvas cleared. Time for a new idea!");
    });
    $("#pixelExample").addEventListener("click", () => {
      grid = fromExample(); drawGrid(); store.set("bdai.sprite", grid);
    });

    // animated game preview: the sprite hops
    const prev = $("#spritePreview");
    const vctx = prev.getContext("2d");
    function drawPreview(t) {
      vctx.fillStyle = "#101127"; vctx.fillRect(0, 0, 64, 64);
      vctx.fillStyle = "#2a2858"; vctx.fillRect(0, 58, 64, 6);           // ground
      const hop = reduceMotion ? 0 : Math.abs(Math.sin(t / 380)) * 8;
      const s = 3, ox = 8, oy = 10 - hop;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = grid[y * N + x];
        if (v) { vctx.fillStyle = v; vctx.fillRect(ox + x * s, Math.round(oy + y * s), s, s); }
      }
      if (!reduceMotion) requestAnimationFrame(drawPreview);
    }
    drawGrid();
    requestAnimationFrame(drawPreview);
  }

  /* =======================================================
     6. AI Playground: k-nearest-neighbours classifier
     ======================================================= */
  const knn = $("#knnCanvas");
  if (knn) {
    const kctx = knn.getContext("2d");
    const CLASSES = [
      { name: "Fruit", color: COLORS.pink, cls: "is-fruit" },
      { name: "Vegetable", color: COLORS.cyan, cls: "is-veg" },
    ];
    // x = sweetness, y = crunchiness, both 0..1
    const SEED = [
      ["banana", 0.86, 0.10, 0], ["mango", 0.92, 0.16, 0], ["grapes", 0.80, 0.32, 0], ["strawberry", 0.74, 0.20, 0],
      ["apple", 0.70, 0.82, 0], ["pear", 0.66, 0.56, 0], ["watermelon", 0.82, 0.46, 0], ["tomato", 0.34, 0.24, 0],
      ["lemon", 0.14, 0.30, 0],
      ["carrot", 0.46, 0.90, 1], ["celery", 0.10, 0.86, 1], ["cucumber", 0.18, 0.66, 1], ["broccoli", 0.10, 0.54, 1],
      ["raw potato", 0.06, 0.74, 1], ["bell pepper", 0.38, 0.74, 1], ["beetroot", 0.52, 0.70, 1], ["spinach", 0.05, 0.12, 1],
      ["lettuce", 0.12, 0.44, 1],
    ];
    const seedPoints = () => SEED.map(([name, x, y, c]) => ({ name, x, y, c }));
    let points = seedPoints();
    let k = 3;
    let addCls = 0;
    let hover = null;

    let W = 0, H = 0, dpr = 1;
    let field = null; // offscreen canvas with the decision map
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = knn.clientWidth; H = knn.clientHeight;
      knn.width = Math.round(W * dpr); knn.height = Math.round(H * dpr);
      kctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildField(); render();
    }

    function classify(x, y) {
      if (!points.length) return null;
      const near = points
        .map((p) => ({ p, d: (p.x - x) ** 2 + (p.y - y) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, Math.min(k, points.length));
      const votes = [0, 0];
      near.forEach((n) => votes[n.p.c]++);
      const c = votes[0] === votes[1] ? near[0].p.c : (votes[0] > votes[1] ? 0 : 1);
      return { c, agree: votes[c], total: near.length, near };
    }

    function buildField() {
      const step = 6; // css px per cell
      const cols = Math.ceil(W / step), rows = Math.ceil(H / step);
      field = document.createElement("canvas");
      field.width = cols; field.height = rows;
      const fctx = field.getContext("2d");
      const img = fctx.createImageData(cols, rows);
      const rgb = [[240, 106, 168], [63, 214, 238]];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const o = (j * cols + i) * 4;
          const r = classify((i + 0.5) / cols, 1 - (j + 0.5) / rows);
          if (!r) { img.data[o + 3] = 0; continue; }
          const conf = r.agree / r.total; // 0.5..1
          const a = 40 + Math.round((conf - 0.5) * 2 * 70);
          img.data[o] = rgb[r.c][0]; img.data[o + 1] = rgb[r.c][1]; img.data[o + 2] = rgb[r.c][2]; img.data[o + 3] = a;
        }
      }
      fctx.putImageData(img, 0, 0);
    }

    function render() {
      kctx.clearRect(0, 0, W, H);
      kctx.fillStyle = "#17183a"; kctx.fillRect(0, 0, W, H);
      if (field) {
        kctx.imageSmoothingEnabled = true;
        kctx.drawImage(field, 0, 0, W, H);
      }
      // faint grid
      kctx.strokeStyle = "rgba(238,240,255,0.06)";
      kctx.lineWidth = 1;
      for (let n = 1; n < 10; n++) {
        const gx = Math.round((n / 10) * W) + 0.5, gy = Math.round((n / 10) * H) + 0.5;
        kctx.beginPath(); kctx.moveTo(gx, 0); kctx.lineTo(gx, H); kctx.stroke();
        kctx.beginPath(); kctx.moveTo(0, gy); kctx.lineTo(W, gy); kctx.stroke();
      }
      // lines to the neighbours being asked
      if (hover && hover.result) {
        kctx.strokeStyle = "rgba(238,240,255,0.7)";
        kctx.setLineDash([4, 4]);
        hover.result.near.forEach((n) => {
          kctx.beginPath(); kctx.moveTo(hover.x * W, (1 - hover.y) * H); kctx.lineTo(n.p.x * W, (1 - n.p.y) * H); kctx.stroke();
        });
        kctx.setLineDash([]);
      }
      // examples
      const R = Math.max(6, Math.min(9, W / 60));
      points.forEach((p) => {
        const px = p.x * W, py = (1 - p.y) * H;
        kctx.beginPath(); kctx.arc(px, py, R, 0, Math.PI * 2);
        kctx.fillStyle = CLASSES[p.c].color; kctx.fill();
        kctx.lineWidth = 2.5; kctx.strokeStyle = "#0f1024"; kctx.stroke();
      });
      // hover marker
      if (hover) {
        const hx = hover.x * W, hy = (1 - hover.y) * H;
        kctx.beginPath(); kctx.arc(hx, hy, R + 3, 0, Math.PI * 2);
        kctx.lineWidth = 2.5; kctx.strokeStyle = COLORS.text; kctx.stroke();
      }
      $("#exampleCount").textContent = points.length;
    }

    const guessText = $("#guessText");
    function describe() {
      if (!points.length) { guessText.textContent = "The map is empty. Add a few fruits and vegetables first."; return; }
      if (!hover) { guessText.textContent = "Point at the map to ask the robot."; return; }
      const r = hover.result;
      const cls = CLASSES[r.c];
      const names = r.near.map((n) => n.p.name).filter(Boolean);
      const nearTxt = names.length ? "Closest examples: " + names.slice(0, 3).join(", ") + "." : "";
      guessText.innerHTML = '<span class="' + cls.cls + '">' + cls.name + "</span> · " + r.agree + " of " + r.total +
        " neighbours agree<small>" + escapeHTML(nearTxt) + "</small>";
    }

    function posFromEvent(e) {
      const rect = knn.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height));
      return { x, y };
    }
    knn.addEventListener("pointermove", (e) => {
      const p = posFromEvent(e);
      hover = { ...p, result: classify(p.x, p.y) };
      if (!hover.result) hover = null;
      render(); describe();
    });
    knn.addEventListener("pointerleave", () => { hover = null; render(); describe(); });
    knn.addEventListener("click", (e) => {
      const p = posFromEvent(e);
      points.push({ name: "", x: p.x, y: p.y, c: addCls });
      buildField();
      hover = { ...p, result: classify(p.x, p.y) };
      render(); describe();
    });

    $$(".cls").forEach((b) => b.addEventListener("click", () => {
      addCls = Number(b.dataset.cls);
      $$(".cls").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    }));
    const kSlider = $("#kSlider");
    kSlider.addEventListener("input", () => {
      k = Number(kSlider.value);
      $("#kVal").textContent = k;
      buildField();
      if (hover) hover.result = classify(hover.x, hover.y);
      render(); describe();
    });
    $("#knnReset").addEventListener("click", () => { points = seedPoints(); hover = null; buildField(); render(); describe(); });
    $("#knnClear").addEventListener("click", () => { points = []; hover = null; buildField(); render(); describe(); });

    // start with a demo question so the panel is never blank
    function demoHover() {
      const p = { x: 0.58, y: 0.64 };
      hover = { ...p, result: classify(p.x, p.y) };
      render(); describe();
    }
    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 120); });
    size();
    demoHover();
  }

  /* =======================================================
     7. Student Portal (example data)
     Replace PORTAL_DATA with a call to your real API later.
     ======================================================= */
  const PORTAL_DATA = {
    xp: 1240, xpNext: 1500, level: 7, rank: "Pixel Pilot",
    // last 14 days, oldest first; the final 9 make the current streak
    streak: [false, true, false, false, false, true, true, true, true, true, true, true, true, true],
    projects: [
      { name: "Fruit-sorting robot", track: "AI", tone: COLORS.violet, pct: 72 },
      { name: "Pixel pet animation", track: "Creativity", tone: COLORS.pink, pct: 45 },
      { name: "Traffic light circuit", track: "Technology", tone: COLORS.cyan, pct: 100 },
      { name: "Space dodge game", track: "Creativity", tone: COLORS.pink, pct: 20 },
    ],
    badges: [
      { name: "First Program", how: "Ran your first line of code", got: true },
      { name: "Pixel Artist", how: "Finished a 16 × 16 sprite", got: true },
      { name: "Circuit Starter", how: "Lit up your first LED", got: true },
      { name: "Pattern Spotter", how: "Solved 10 pattern puzzles", got: true },
      { name: "Team Player", how: "Helped a classmate debug", got: true },
      { name: "7-Day Streak", how: "Learned 7 days in a row", got: true },
      { name: "Data Detective", how: "Clean a dataset of 50 rows", got: false },
      { name: "Game Maker", how: "Publish a playable game", got: false },
      { name: "Robot Wrangler", how: "Finish a robot maze run", got: false },
      { name: "Story Animator", how: "Animate a 30-second story", got: false },
      { name: "Kind Coder", how: "Leave 5 helpful comments", got: false },
      { name: "30-Day Streak", how: "Learn 30 days in a row", got: false },
    ],
    schedule: [
      { day: "Thu", time: "4:30 PM", title: "Live studio: teach a model to tell cats from dogs", sub: "AI track · Ms. Ananya", live: true },
      { day: "Sat", time: "10:00 AM", title: "Pixel animation jam", sub: "Creativity track · Mr. Rohan" },
      { day: "Sun", time: "5:00 PM", title: "Show and tell: share your project", sub: "All tracks · family welcome" },
      { day: "Tue", time: "4:30 PM", title: "Circuits: build a doorbell", sub: "Technology track · Ms. Leela" },
    ],
  };

  const projectHTML = (p) =>
    '<li class="project' + (p.pct === 100 ? " project--done" : "") + '">' +
      '<span class="project__dot" style="background:' + p.tone + '"></span>' +
      '<span class="project__name">' + escapeHTML(p.name) + "</span>" +
      '<span class="project__pct">' + (p.pct === 100 ? "Done" : p.pct + "%") + "</span>" +
      '<span class="project__track">' + escapeHTML(p.track) + " track</span>" +
      '<span class="bar"><span style="width:' + p.pct + "%;" + (p.pct === 100 ? "background:" + COLORS.mint : "") + '"></span></span>' +
    "</li>";

  const mini = $("#miniProjects");
  if (mini) {
    mini.innerHTML = PORTAL_DATA.projects.filter((p) => p.pct < 100).slice(0, 3).map(projectHTML).join("");
    $("#allProjects").innerHTML = PORTAL_DATA.projects.map(projectHTML).join("");

    const medalColors = [COLORS.cyan, COLORS.violet, COLORS.pink, COLORS.mint, "#ffd166", "#ff8a4c"];
    $("#badges").innerHTML = PORTAL_DATA.badges.map((b, n) => {
      const initials = b.name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2);
      return '<li class="badge' + (b.got ? "" : " badge--locked") + '">' +
        '<span class="badge__medal" style="' + (b.got ? "background:" + medalColors[n % medalColors.length] : "") + '">' + initials + "</span>" +
        '<span class="badge__name">' + escapeHTML(b.name) + "</span>" +
        '<span class="badge__how">' + (b.got ? "" : "Locked · ") + escapeHTML(b.how) + "</span></li>";
    }).join("");

    $("#schedule").innerHTML = PORTAL_DATA.schedule.map((s, n) =>
      '<li class="slot"><span class="slot__when"><b>' + s.day + "</b><span>" + s.time + "</span></span>" +
      '<span><span class="slot__title">' + escapeHTML(s.title) + '</span><br><span class="slot__sub">' + escapeHTML(s.sub) + "</span></span>" +
      '<button class="tool slot__btn" id="slot-' + n + '" data-title="' + escapeHTML(s.title) + '">' + (s.live ? "Join" : "Remind me") + "</button></li>"
    ).join("");
    $("#schedule").addEventListener("click", (e) => {
      const b = e.target.closest(".slot__btn"); if (!b) return;
      toast(b.textContent === "Join" ? "The studio room opens 10 minutes before class." : "Reminder set for “" + b.dataset.title + "”.");
    });

    $("#streak").innerHTML = PORTAL_DATA.streak.map((on) => '<i class="' + (on ? "on" : "") + '"></i>').join("");

    // tabs
    const tabs = $$(".portal__tabs [role=tab]");
    function openTab(name) {
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
      $$(".pane").forEach((p) => { p.hidden = p.dataset.pane !== name; });
    }
    tabs.forEach((t) => t.addEventListener("click", () => openTab(t.dataset.tab)));
    tabs.forEach((t, n) => t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1 : -1;
      const next = tabs[(n + dir + tabs.length) % tabs.length];
      next.focus(); openTab(next.dataset.tab);
    }));

    // "preview as" name
    function setStudent(name) {
      const clean = name.trim().slice(0, 20) || "Mira";
      $("#pName").textContent = clean;
      $("#avatar").textContent = clean[0].toUpperCase();
      $("#greet").textContent = "Good to see you, " + clean + ".";
    }
    const saved = store.get("bdai.student", "");
    if (saved) { setStudent(saved); $("#studentName").value = saved; }
    $("#signin").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#studentName").value.trim();
      if (!v) { $("#studentName").focus(); return; }
      setStudent(v); store.set("bdai.student", v); openTab("home");
      toast("Welcome to your portal preview, " + v + "!");
    });
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

      const level = age <= 8 ? "explorer" : age <= 12 ? "builder" : "innovator";
      const track = $("#interest").value;
      const trackName = { tech: "Technology for Kids", create: "Digital Creativity", ai: "Artificial Intelligence" }[track];
      const first = TRACKS[track][level][0];
      out.innerHTML = "Thanks, " + escapeHTML(name) + ". We suggest <strong>" + trackName + " · " + LEVEL_NAMES[level] +
        "</strong>. A great first project: “" + escapeHTML(first) + "”.";
    });
  }
})();
