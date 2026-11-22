/* ==========================================================================
   The Essence Lab · script-10.js
   Hero curve, Big-O bars, slide decks, papers, worksheet generator, quizzes,
   studio survey and the live Code Lab (HTML/CSS/JS preview + Python).
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }
  };
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // Shared account state (set by the sign-in module) and the points API (set by the points module).
  const Acct = {
    mode: "local", id: null, name: "", db: null, user: null, staff: false, listeners: [],
    set(patch) { Object.assign(this, patch); this.listeners.forEach((f) => { try { f(this); } catch (e) { /* keep going */ } }); },
    on(f) { this.listeners.push(f); }
  };
  const Points = { award: () => Promise.resolve(0) };

  /* ------------------------------------------------------------------ nav */
  const navToggle = $("#navToggle");
  const nav = $("#siteNav");
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.textContent = open ? "close" : "menu";
  });
  $$("a", nav).forEach((a) => a.addEventListener("click", () => {
    nav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.textContent = "menu";
  }));
  if ("IntersectionObserver" in window) {
    const links = new Map($$("a", nav).map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((a) => a.classList.remove("active"));
          const a = links.get(en.target.id);
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ----------------------------------------------------- hero: lemniscate */
  (function hero() {
    const canvas = $("#heroCanvas");
    const readout = $("#heroReadout");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1, colors = {};
    const trail = [];

    function readColors() {
      colors = {
        grid: "rgba(90,140,255,0.10)",
        axis: "rgba(120,160,240,0.28)",
        curve: "rgba(120,170,255,0.22)",
        a: cssVar("--accent") || "#3d8bff",
        b: cssVar("--cyan") || "#33d6f2",
        c: cssVar("--pink") || "#d65cf0",
        label: "#8aa0d0"
      };
    }
    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(280, r.width); H = Math.max(175, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // Lemniscate of Bernoulli, parametric: x = a cos t / (1 + sin² t), y = a sin t cos t / (1 + sin² t)
    function pt(t, a) {
      const s = Math.sin(t), c = Math.cos(t), d = 1 + s * s;
      return [W / 2 + (a * c) / d, H / 2 + (a * s * c) / d];
    }
    function drawStatic(a) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.grid;
      for (let x = (W / 2) % 32; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (H / 2) % 32; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = colors.axis;
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.strokeStyle = colors.curve;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const [x, y] = pt((i / 400) * Math.PI * 2, a);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = colors.label;
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillText("−a", W / 2 - a - 6, H / 2 + 16);
      ctx.fillText("a", W / 2 + a - 3, H / 2 + 16);
      ctx.fillText("foci (±a/√2, 0)", 10, H - 12);
      ctx.fillStyle = colors.b;
      [-1, 1].forEach((sgn) => { ctx.beginPath(); ctx.arc(W / 2 + (sgn * a) / Math.SQRT2, H / 2, 3, 0, Math.PI * 2); ctx.fill(); });
    }
    function frame(t) {
      const a = Math.min(W * 0.42, H * 1.05);
      drawStatic(a);
      const theta = (t / 2600) % (Math.PI * 2);
      trail.push(theta);
      if (trail.length > 70) trail.shift();
      for (let i = 1; i < trail.length; i++) {
        const [x0, y0] = pt(trail[i - 1], a);
        const [x1, y1] = pt(trail[i], a);
        if (Math.hypot(x1 - x0, y1 - y0) > 60) continue;
        const k = i / trail.length;
        ctx.strokeStyle = i % 2 ? colors.a : colors.c;
        ctx.globalAlpha = k;
        ctx.lineWidth = 1 + k * 3.5;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const [px, py] = pt(theta, a);
      ctx.fillStyle = colors.b;
      ctx.shadowColor = colors.b; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // distance-product property: |PF1|·|PF2| = a²/2
      const f = a / Math.SQRT2;
      const prod = (Math.hypot(px - (W / 2 - f), py - H / 2) * Math.hypot(px - (W / 2 + f), py - H / 2)) / (a * a);
      readout.textContent = `t = ${theta.toFixed(2)} rad · |PF₁|·|PF₂| / a² = ${prod.toFixed(3)}`;
    }
    readColors(); resize();
    window.addEventListener("resize", () => { resize(); if (reduceMotion) frame(1.1 * 2600); });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", readColors);
    if (reduceMotion) { frame(1.1 * 2600); return; }
    let visible = true;
    if ("IntersectionObserver" in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
    (function loop(ts) { if (visible && !document.hidden) frame(ts); requestAnimationFrame(loop); })(0);
  })();

  /* ----------------------------------------------------------- Big-O bars */
  (function bigO() {
    const root = $("#bigo"), input = $("#bigoN"), out = $("#bigoOut");
    const rows = [
      { o: "O(1)", name: "constant", f: () => 1, ex: "read item #5" },
      { o: "O(log n)", name: "logarithmic", f: (n) => Math.max(1, Math.ceil(Math.log2(n))), ex: "binary search" },
      { o: "O(n)", name: "linear", f: (n) => n, ex: "check every item" },
      { o: "O(n log n)", name: "linearithmic", f: (n) => Math.max(1, Math.round(n * Math.log2(n))), ex: "merge sort" },
      { o: "O(n²)", name: "quadratic", f: (n) => n * n, ex: "nested loops" }
    ];
    const els = rows.map((r) => {
      const row = document.createElement("div");
      row.className = "bigo-row";
      row.innerHTML = `<code>${r.o}</code><div class="bigo-bar-track"><div class="bigo-bar"></div><span><em>${r.ex}</em><b class="v"></b></span></div>`;
      root.appendChild(row);
      return { bar: $(".bigo-bar", row), v: $(".v", row), r };
    });
    const fmt = (x) => x >= 1e9 ? (x / 1e9).toFixed(x >= 1e10 ? 0 : 1) + " billion" : x >= 1e6 ? (x / 1e6).toFixed(x >= 1e7 ? 0 : 1) + " million" : x.toLocaleString("en-US");
    function update() {
      const n = Math.pow(10, Number(input.value));
      out.textContent = "n = " + n.toLocaleString("en-US");
      const maxLog = Math.log10(1e12) + 1; // n² at n = 10^6
      els.forEach(({ bar, v, r }) => {
        const ops = r.f(n);
        bar.style.setProperty("--w", (((Math.log10(ops) + 1) / maxLog) * 100).toFixed(1) + "%");
        v.textContent = fmt(ops) + " steps";
      });
    }
    input.addEventListener("input", update);
    update();
  })();

  /* ---------------------------------------------------------------- decks */
  const DECKS = {
    bdai: {
      foot: "</> coding_essentials · BDAI",
      slides: [
        { e: "> hello, world", t: "The Essence of Coding & Technology", cols: 1, items: [["From first principles to object-oriented design", "A beginner-friendly tour of the ideas behind the software that runs our world."]], code: "$ python learn.py --topics oop,algorithms,design" },
        { e: "00 // ROADMAP", t: "What we will cover", cols: 4, items: [["01 The Essence", "Why code matters · thinking like a programmer · the technology stack"], ["02 Core Concepts", "Paradigms · data structures · algorithms & Big-O"], ["03 Object-Oriented", "Classes & objects · four pillars · SOLID & patterns"], ["04 The Craft", "Version control & testing · debugging · your learning path"]] },
        { e: "01 // THE ESSENCE", t: "Coding is problem solving, not typing", cols: 4, items: [["Decompose", "Break a big problem into small pieces."], ["Find patterns", "Spot what repeats so you solve it once."], ["Abstract", "Hide the details; keep what matters."], ["Write the steps", "Express the solution precisely."]], code: "INPUT ingredients (data)  →  PROCESS steps (instructions)  →  OUTPUT the finished dish (result)" },
        { e: "01 // THE ESSENCE", t: "Technology is a stack of layers", cols: 2, items: [["Applications → Frameworks → Languages", "Browsers and games sit on React, Django and NumPy, which sit on Python, JavaScript and Java."], ["Operating system → Hardware", "Windows, macOS, Linux, Android over CPU, memory, storage and network."], ["How code becomes action", "Source code → compiler / interpreter → machine code → CPU executes billions of steps per second."], ["The key idea", "Each layer hides the complexity of the one below it."]] },
        { e: "02 // CORE CONCEPTS", t: "Four ways to think about code", cols: 2, items: [["Procedural", "Step-by-step recipes.  total = add(price, tax)"], ["Object-oriented", "Objects bundle data and behaviour.  cart.add_item(book)"], ["Functional", "Pure functions and data flow.  sum(map(double, nums))"], ["Declarative", "Say what, not how.  SELECT name FROM users;"]] },
        { e: "02 // CORE CONCEPTS", t: "The building blocks every language shares", cols: 4, items: [["Variables", "Named boxes that hold values."], ["Data types", "Numbers, text, lists, true/false."], ["Control flow", "if / else decisions and loops."], ["Functions", "Reusable, named blocks of logic."]], code: 'scores = [82, 91, 77, 95]\ndef grade(score):\n    if score >= 90: return "A"\n    elif score >= 80: return "B"\n    else: return "Retry"\nprint("Average:", sum(scores) / len(scores))' },
        { e: "02 // CORE CONCEPTS", t: "Data structures: choosing the right container", cols: 3, items: [["List", "Ordered row, fast access by position.  fruits[0]"], ["Dictionary", "Look up a value by key.  ages[\"Ada\"]"], ["Stack", "Last in, first out.  stack.pop()"], ["Queue", "First in, first out.  queue.popleft()"], ["Tree", "Family tree or folders.  node.children"], ["Graph", "Cities and roads.  graph[\"A\"] = [\"B\", \"C\"]"]] },
        { e: "02 // CORE CONCEPTS", t: "Algorithms & Big-O: how work grows with input", cols: 4, items: [["O(1) Constant", "Reading item #5 from a list"], ["O(log n) Logarithmic", "Binary search halves the problem each step"], ["O(n) Linear", "Checking every item once"], ["O(n²) Quadratic", "Nested loops: double the input, 4× the work"]] },
        { e: "03 // OBJECT-ORIENTED PROGRAMMING", t: "OOP: model the world as objects", cols: 3, items: [["Class: the blueprint", "Dog has name, age, breed and can bark(), eat(), sleep()."], ["Objects: the instances", "rex = Dog(\"Rex\", 3), buddy = Dog(\"Buddy\", 5), luna = Dog(\"Luna\", 1)"], ["Why OOP?", "Code mirrors real things, blueprints are reused, and teams build objects in parallel."]] },
        { e: "03 // OBJECT-ORIENTED PROGRAMMING", t: "The four pillars of OOP", cols: 4, items: [["Encapsulation", "A dashboard hides the engine.  self._balance"], ["Inheritance", "Every Dog is an Animal.  class Dog(Animal):"], ["Polymorphism", "speak() works for Dog and Cat.  pet.speak()"], ["Abstraction", "Press the pedal, not the fuel pump.  class Shape(ABC):"]] },
        { e: "03 // OOP IN CODE", t: "Classes & encapsulation: a bank account", cols: 3, items: [["__init__ is the constructor", "Runs once per object and sets its data."], ["_balance stays protected", "Read through a property, never edited directly."], ["Methods guard the rules", "deposit() and withdraw() reject bad input."]], code: 'class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self._balance = balance\n    def deposit(self, amount):\n        if amount <= 0: raise ValueError("Must be positive")\n        self._balance += amount' },
        { e: "03 // OOP IN CODE", t: "Inheritance & polymorphism: one animal family", cols: 3, items: [["Inheritance", "Dog and Cat reuse setup from Animal."], ["Polymorphism", "The loop calls speak() on any animal."], ["Abstraction", "Animal defines the contract only."]], code: 'pets = [Dog("Rex"), Cat("Luna"), Dog("Buddy")]\nfor pet in pets:\n    print(pet.speak())   # Rex says Woof! / Luna says Meow! / Buddy says Woof!' },
        { e: "03 // OOP DESIGN", t: "SOLID: five habits of clean object-oriented code", cols: 3, items: [["S · Single Responsibility", "Invoice totals; InvoicePrinter prints."], ["O · Open / Closed", "Add a Shape without editing old code."], ["L · Liskov Substitution", "Any Bird method is safe on any bird."], ["I · Interface Segregation", "A Printer need not implement fax()."], ["D · Dependency Inversion", "Code against PaymentMethod, not CreditCard."]] },
        { e: "03 // OOP DESIGN", t: "Composition & design patterns", cols: 4, items: [["Strategy", "Swap behaviour at runtime."], ["Factory", "One function builds the right object."], ["Observer", "Subscribe to updates."], ["Singleton", "One shared instance, like settings."]], code: 'class Car:\n    def __init__(self, power_source):\n        self.power_source = power_source   # has-a\n    def drive(self):\n        return self.power_source.start() + ", moving"\n# Prefer "has-a" over "is-a" when behaviour needs to change.' },
        { e: "04 // THE CRAFT", t: "Good code is tested, tracked, and debugged", cols: 3, items: [["Version control", "Git records every change so you can experiment and roll back."], ["Testing", "Small automated checks keep code working as it grows."], ["Debugging", "Reproduce, read the error, isolate, fix, re-test."]], code: '$ git checkout -b add-login\n$ git commit -m "Add login form"\n$ pytest   ->   1 passed' },
        { e: "05 // NEXT STEPS", t: "Your path forward", cols: 4, items: [["Pick one language", "Python is friendly. Go deep before wide."], ["Build tiny projects", "Calculator, to-do list, quiz game. Finish them."], ["Learn by using", "Reach for classes and tests as needs appear."], ["Read and share code", "Study open source and ask for reviews."]], code: "Key takeaway: coding is a way of thinking. Languages change, but the ideas last." }
      ]
    },
    guests: {
      foot: "Chief Guest Visit · Tech Showcase",
      slides: [
        { e: '> welcome()   guests = 3   status: "ready"', t: "Where Math, Experiments & Data Meet Code", cols: 1, items: [["// CHIEF GUEST VISIT", "Welcoming Mathopea, Experimentium and Databell Software Labs. Presented by Bhavyam Roy."]] },
        { e: "// agenda", t: "Today's run order", cols: 3, items: [["01", "Meet the chief guests"], ["02", "Mathopea: code & logic"], ["03", "Experimentium: build & test"], ["04", "Databell Software Labs: data"], ["05", "Apps showcase & live demo"], ["06", "Collaboration & next steps"]] },
        { e: "// chief_guests", t: "Our three chief guests", cols: 3, items: [["Mathopea", "Mathematics meets programming. Focus: algorithms, logic and problem solving."], ["Experimentium", "Hands-on experimentation with technology. Focus: prototypes, testing and innovation."], ["Databell Software Labs", "Software engineering and data. Focus: apps, databases and analytics."]] },
        { e: "// mathopea", t: "Mathopea: math as code", cols: 1, items: [["Patterns become programs", "Sequences, primes and proofs turn into short, readable functions. Idea: maths puzzles as coding challenges."]], code: "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\nprint([fib(i) for i in range(10)])   # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]" },
        { e: "// experimentium", t: "Experimentium: build, test, learn", cols: 1, items: [["Hypothesis, test, measure", "Small code experiments make ideas testable in minutes. Idea: students run their own experiments."]], code: "function factorial(n) {\n  if (n < 0) return null;\n  let result = 1;\n  for (let i = 2; i <= n; i++) result *= i;\n  return result;\n}\nconsole.log(`5! =`, factorial(5));   // 5! = 120" },
        { e: "// databell_software_labs", t: "Databell Software Labs: data to decisions", cols: 1, items: [["Software that learns from data", "Databases and analytics guide what apps should do next. Idea: from raw events to clear insight."]], code: "SELECT feature, COUNT(*) AS uses\nFROM app_events\nWHERE event_date >= '2026-01-01'\nGROUP BY feature\nORDER BY uses DESC\nLIMIT 5;" },
        { e: "// apps", t: "App showcase (illustrative concepts)", cols: 3, items: [["MathQuest", "Gamified maths practice, by Mathopea-style logic engines."], ["LabSim", "Virtual experiment sandbox, by Experimentium-style prototyping."], ["InsightBoard", "Live analytics dashboard, by Databell-style data tools."]] },
        { e: "// pipeline", t: "All together: one tiny pipeline", cols: 3, items: [["Mathopea", "define the model"], ["Experimentium", "run the experiment"], ["Databell", "analyse the rows"]], code: "import math\ndef experiment(n):\n    return [math.sqrt(i) for i in range(n)]\ndef analyse(rows):\n    return sum(rows) / len(rows)\nprint(analyse(experiment(100)))" },
        { e: "// tech_stack", t: "Tools of the trade", cols: 3, items: [["</Python>", "Maths & scripting"], ["</JavaScript>", "Web experiments"], ["</SQL>", "Data queries"], ["</Git>", "Team collaboration"], ["</APIs>", "Connecting apps"], ["</Cloud>", "Deploy & scale"]] },
        { e: "// visit_timeline", t: "Visit timeline", cols: 5, items: [["step_1 Welcome", "Greet & intro"], ["step_2 Talks", "Guest sessions"], ["step_3 Demo", "Live code & apps"], ["step_4 Q&A", "Student questions"], ["step_5 Wrap-up", "Thanks & photos"]] },
        { e: '> return "see you again soon";', t: "Thank you, chief guests!", cols: 1, items: [["Mathopea · Experimentium · Databell Software Labs", "Where math, experiments and data meet code."]] }
      ]
    }
  };

  (function decks() {
    const slideEl = $("#slide"), countEl = $("#slideCount"), dotsEl = $("#deckDots");
    let deckKey = "bdai", idx = 0;
    function render() {
      const deck = DECKS[deckKey], s = deck.slides[idx], n = deck.slides.length;
      slideEl.style.setProperty("--cols", s.cols || 2);
      slideEl.innerHTML =
        `<div class="s-eyebrow">${esc(s.e)}</div>` +
        `<h3 class="s-title">${esc(s.t)}</h3>` +
        `<div class="s-body">${s.items.map(([b, t]) => `<div class="s-item"><b>${esc(b)}</b><span>${esc(t)}</span></div>`).join("")}${s.code ? `<pre class="s-code">${esc(s.code)}</pre>` : ""}</div>` +
        `<div class="s-foot"><span>${esc(deck.foot)}</span><span>${String(idx + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}</span></div>`;
      countEl.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      dotsEl.innerHTML = deck.slides.map((_, i) => `<button type="button" aria-label="Slide ${i + 1}" ${i === idx ? 'aria-current="true"' : ""} data-i="${i}"></button>`).join("");
      $("#prevSlide").disabled = idx === 0;
      $("#nextSlide").disabled = idx === n - 1;
    }
    function go(d) { const n = DECKS[deckKey].slides.length; idx = Math.min(n - 1, Math.max(0, idx + d)); render(); }
    $("#prevSlide").addEventListener("click", () => go(-1));
    $("#nextSlide").addEventListener("click", () => go(1));
    dotsEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { idx = Number(b.dataset.i); render(); } });
    $("#deck").addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
    });
    $$("#decks .tab").forEach((tab) => tab.addEventListener("click", () => {
      $$("#decks .tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      deckKey = tab.dataset.deck; idx = 0; render();
    }));
    render();
  })();

  /* --------------------------------------------------------------- papers */
  $$("#paperList .paper-btn").forEach((btn) => btn.addEventListener("click", () => {
    $$("#paperList .paper-btn").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
    $$("#papers .paper").forEach((p) => { p.hidden = p.id !== btn.dataset.paper; });
    const paper = document.getElementById(btn.dataset.paper);
    if (paper.getBoundingClientRect().top < 0) paper.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }));

  /* ------------------------------------------------------ worksheet maker */
  (function sheets() {
    const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const fracStr = (n, d) => { const g = gcd(n, d); n /= g; d /= g; if (d < 0) { n = -n; d = -d; } return d === 1 ? String(n) : `${n}/${d}`; };
    const fracHTML = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;

    const GEN = {
      arith(L) {
        const op = pick(["+", "−", "×", "÷"]);
        const m = [20, 100, 1000][L - 1];
        if (op === "+") { const a = rnd(2, m), b = rnd(2, m); return { q: `${a} + ${b}`, a: a + b }; }
        if (op === "−") { const a = rnd(2, m), b = rnd(2, m); const [x, y] = L === 3 ? [a, b] : [Math.max(a, b), Math.min(a, b)]; return { q: `${x} − ${y}`, a: x - y }; }
        if (op === "×") { const t = [10, 15, 30][L - 1]; const a = rnd(2, t), b = rnd(2, L === 3 ? 25 : 12); return { q: `${a} × ${b}`, a: a * b }; }
        const b = rnd(2, [9, 12, 25][L - 1]), ans = rnd(2, [10, 15, 40][L - 1]); return { q: `${b * ans} ÷ ${b}`, a: ans };
      },
      frac(L) {
        const dm = [6, 10, 12][L - 1];
        const b = rnd(2, dm), d = rnd(2, dm), a = rnd(1, b - 1 || 1), c = rnd(1, d - 1 || 1);
        const op = L === 1 ? "+" : pick(["+", "−", "×", ...(L === 3 ? ["÷"] : [])]);
        let n, den;
        if (op === "+") { n = a * d + c * b; den = b * d; }
        else if (op === "−") { n = a * d - c * b; den = b * d; }
        else if (op === "×") { n = a * c; den = b * d; }
        else { n = a * d; den = b * c; }
        return { q: `${fracHTML(a, b)} ${op} ${fracHTML(c, d)}`, a: n / den, show: fracStr(n, den) };
      },
      linear(L) {
        const x = rnd(-9, 12) || 3, a = rnd(2, [5, 9, 12][L - 1]) * (L === 3 && Math.random() < 0.4 ? -1 : 1), b = rnd(-20, 20);
        if (L === 3 && Math.random() < 0.5) {
          const c = rnd(1, 6); const lhsB = b; const rhs = a * x + lhsB - c * x;
          return { q: `${a}<i>x</i> ${lhsB < 0 ? "−" : "+"} ${Math.abs(lhsB)} = ${c}<i>x</i> ${rhs < 0 ? "−" : "+"} ${Math.abs(rhs)}`, a: x, show: `x = ${x}`, invalid: a === c };
        }
        return { q: `${a}<i>x</i> ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${a * x + b}`, a: x, show: `x = ${x}` };
      },
      powers(L) {
        const kind = pick(L === 1 ? ["sq", "sqrt"] : ["sq", "sqrt", "pow2", "cube", ...(L === 3 ? ["cbrt", "neg"] : [])]);
        if (kind === "sq") { const n = rnd(2, [12, 20, 30][L - 1]); return { q: `${n}²`, a: n * n }; }
        if (kind === "sqrt") { const n = rnd(2, [12, 20, 30][L - 1]); return { q: `√${n * n}`, a: n }; }
        if (kind === "pow2") { const k = rnd(3, L === 3 ? 12 : 10); return { q: `2<sup>${k}</sup>`, a: 2 ** k }; }
        if (kind === "cube") { const n = rnd(2, 9); return { q: `${n}³`, a: n ** 3 }; }
        if (kind === "cbrt") { const n = rnd(2, 10); return { q: `∛${n ** 3}`, a: n }; }
        const n = rnd(2, 5), k = rnd(1, 3); return { q: `${n}<sup>−${k}</sup>`, a: 1 / n ** k, show: `1/${n ** k}` };
      },
      percent(L) {
        const p = pick(L === 1 ? [10, 25, 50, 75] : L === 2 ? [5, 10, 15, 20, 25, 40, 60, 75] : [12, 15, 35, 45, 120, 150]);
        const base = rnd(1, 20) * (100 / gcd(p, 100));
        if (L === 3 && Math.random() < 0.4) { const part = (p * base) / 100; return { q: `${part} is ${p}% of what number?`, a: base }; }
        return { q: `${p}% of ${base}`, a: (p * base) / 100 };
      },
      seq(L) {
        if (L > 1 && Math.random() < 0.45) {
          const a = rnd(1, 5), r = pick(L === 3 ? [2, 3, -2] : [2, 3]);
          const t = [0, 1, 2, 3].map((i) => a * r ** i);
          return { q: `${t.join(", ")}, …  next?`, a: a * r ** 4 };
        }
        const a = rnd(-10, 20), d = pick([2, 3, 4, 5, 7, -3, 11].slice(0, L === 1 ? 4 : 7));
        const t = [0, 1, 2, 3].map((i) => a + d * i);
        return { q: `${t.join(", ")}, …  next?`, a: a + 4 * d };
      }
    };
    const TITLES = { arith: "Arithmetic", frac: "Fractions", linear: "Linear equations · solve for x", powers: "Powers & roots", percent: "Percentages", seq: "Sequences · find the next term", mixed: "Mixed review" };
    let problems = [];

    function make() {
      const topic = $("#sheetTopic").value, L = Number($("#sheetLevel").value), count = Number($("#sheetCount").value);
      const keys = Object.keys(GEN);
      problems = [];
      const seen = new Set();
      let guard = 0;
      while (problems.length < count && guard++ < 500) {
        const p = GEN[topic === "mixed" ? keys[problems.length % keys.length] : topic](L);
        if (p.invalid || seen.has(p.q)) continue;
        seen.add(p.q);
        problems.push(p);
      }
      $("#wsTitle").textContent = `${TITLES[topic]} · Level ${L}`;
      $("#wsCode").textContent = "Sheet #" + String(rnd(1000, 9999));
      $("#wsGrid").innerHTML = problems.map((p, i) =>
        `<div class="ws-item" data-i="${i}"><span class="ws-q">${p.q}</span><input type="text" inputmode="text" id="ws-a-${i}" aria-label="Answer ${i + 1}" autocomplete="off"><span class="ws-ans" hidden></span></div>`).join("");
      $("#wsScore").textContent = "";
    }
    function parse(v) {
      v = v.trim().replace(/^x\s*=\s*/i, "").replace(/,/g, "").replace(/−/g, "-");
      if (!v) return null;
      const m = v.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
      if (m) return Number(m[2]) === 0 ? NaN : Number(m[1]) / Number(m[2]);
      return Number(v);
    }
    function check() {
      let right = 0, answered = 0;
      $$(".ws-item").forEach((el) => {
        const p = problems[el.dataset.i], v = parse($("input", el).value);
        el.classList.remove("right", "wrong");
        if (v == null) return;
        answered++;
        const tol = Number.isInteger(p.a) ? 1e-9 : Math.min(0.005, Math.abs(p.a) * 0.01);
        const ok = Number.isFinite(v) && Math.abs(v - p.a) <= tol;
        el.classList.add(ok ? "right" : "wrong");
        if (ok) right++;
      });
      const pct = problems.length ? Math.round((right / problems.length) * 100) : 0;
      if (problems.length && right === problems.length && !problems.awarded && $("#showSheet").dataset.on !== "1" && !problems.peeked) {
        problems.awarded = true;
        Points.award(10 + 2 * problems.length, "Perfect worksheet · " + $("#wsTitle").textContent, { bucket: "sheet", dailyMax: 200 });
      }
      $("#wsScore").textContent = answered ? `Score: ${right} / ${problems.length} (${pct}%)${answered < problems.length ? ` · ${problems.length - answered} unanswered` : right === problems.length ? " · perfect sheet!" : ""}` : "Type an answer in at least one box first.";
    }
    function show() {
      const btn = $("#showSheet"), on = btn.dataset.on !== "1";
      btn.dataset.on = on ? "1" : "0";
      if (on) problems.peeked = true;
      btn.textContent = on ? "Hide answers" : "Show answers";
      $$(".ws-item").forEach((el) => {
        const p = problems[el.dataset.i], a = $(".ws-ans", el);
        a.textContent = "Answer: " + (p.show || String(Math.round(p.a * 1e6) / 1e6));
        a.hidden = !on;
      });
    }
    $("#sheetForm").addEventListener("submit", (e) => { e.preventDefault(); make(); const b = $("#showSheet"); b.dataset.on = "0"; b.textContent = "Show answers"; });
    $("#checkSheet").addEventListener("click", check);
    $("#showSheet").addEventListener("click", show);
    $("#wsGrid").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); check(); } });
    make();
  })();

  /* ----------------------------------------------------------------- quiz */
  const QUIZ = {
    math: [
      { q: "What is the 10th Fibonacci number if F₀ = 0 and F₁ = 1?", o: ["34", "55", "89", "21"], a: 1, x: "0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55: F₁₀ = 55." },
      { q: "The harmonic series 1 + ½ + ⅓ + ¼ + … ", o: ["converges to 2", "converges to ln 2", "grows without bound", "converges to π²/6"], a: 2, x: "Oresme's grouping shows every block of terms adds at least ½, so the sum is unbounded. π²/6 is the sum of 1/n²." },
      { q: "Which value is closest to the golden ratio φ?", o: ["1.414", "1.618", "2.718", "3.142"], a: 1, x: "φ = (1 + √5)/2 ≈ 1.618. The others are √2, e and π." },
      { q: "How many primes are less than 30?", o: ["8", "9", "10", "11"], a: 2, x: "2, 3, 5, 7, 11, 13, 17, 19, 23, 29: ten primes." },
      { q: "e^(iπ) + 1 equals", o: ["0", "1", "−1", "i"], a: 0, x: "Euler's identity: e^(iπ) = cos π + i sin π = −1, so e^(iπ) + 1 = 0." },
      { q: "What is the derivative of x³?", o: ["x²", "3x", "3x²", "x⁴/4"], a: 2, x: "Power rule: d/dx xⁿ = n xⁿ⁻¹, so 3x²." },
      { q: "Solve 3x − 7 = 11.", o: ["x = 4/3", "x = 6", "x = 18", "x = 3"], a: 1, x: "Add 7: 3x = 18. Divide by 3: x = 6." },
      { q: "The sum 1 + 2 + 3 + … + 100 is", o: ["5,000", "5,050", "10,100", "4,950"], a: 1, x: "n(n + 1)/2 = 100 × 101 / 2 = 5,050, Gauss's classroom trick." },
      { q: "Euclid proved there are infinitely many primes by considering", o: ["p₁p₂⋯pₖ + 1", "2ⁿ − 1", "n² + n + 41", "the sieve of Eratosthenes"], a: 0, x: "No listed prime divides the product plus one, so a new prime factor must exist." },
      { q: "What is √(144) + 2⁵?", o: ["44", "42", "76", "34"], a: 0, x: "12 + 32 = 44." }
    ],
    science: [
      { q: "What is the correct order of the scientific method?", o: ["Test → Hypothesis → Observe", "Observe → Hypothesis → Test → Conclude", "Conclude → Test → Observe", "Hypothesis → Conclude → Test"], a: 1, x: "Observe, form a testable hypothesis, run an experiment, then draw a conclusion." },
      { q: "In an experiment, the variable you deliberately change is the", o: ["dependent variable", "controlled variable", "independent variable", "constant"], a: 2, x: "You change the independent variable and measure the dependent variable." },
      { q: "The speed of light in a vacuum is about", o: ["300,000 km/s", "300 km/s", "30,000 km/s", "3,000,000 km/s"], a: 0, x: "c ≈ 299,792 km/s." },
      { q: "Water boils at 100 °C at sea level. What is that in kelvin?", o: ["100 K", "273 K", "373 K", "212 K"], a: 2, x: "K = °C + 273.15, so about 373 K." },
      { q: "Newton's second law states", o: ["F = ma", "E = mc²", "V = IR", "PV = nRT"], a: 0, x: "Force equals mass times acceleration." },
      { q: "Which particle has a negative charge?", o: ["Proton", "Neutron", "Electron", "Photon"], a: 2, x: "Electrons carry negative charge; protons positive; neutrons and photons are neutral." },
      { q: "Why do scientists repeat an experiment?", o: ["To get the answer they want", "To check results are reliable and reproducible", "Because the first run is always wrong", "To use more equipment"], a: 1, x: "Repeating reduces the effect of random error and shows the result is reproducible." },
      { q: "A pH of 3 means a solution is", o: ["neutral", "basic", "acidic", "salty"], a: 2, x: "pH below 7 is acidic, 7 is neutral, above 7 is basic." },
      { q: "What gas do plants take in for photosynthesis?", o: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], a: 2, x: "6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂." },
      { q: "The SI unit of energy is the", o: ["watt", "joule", "newton", "pascal"], a: 1, x: "Energy is measured in joules; power, the rate of energy use, in watts." }
    ],
    code: [
      { q: "What does <code>print([fib(i) for i in range(5)])</code> output for the Mathopea fib()?", o: ["[1, 1, 2, 3, 5]", "[0, 1, 1, 2, 3]", "[0, 1, 2, 3, 4]", "[1, 2, 3, 5, 8]"], a: 1, x: "fib(0) = 0, fib(1) = 1, fib(2) = 1, fib(3) = 2, fib(4) = 3." },
      { q: "Binary search on a sorted list has time complexity", o: ["O(1)", "O(log n)", "O(n)", "O(n²)"], a: 1, x: "Each step halves the remaining search space." },
      { q: "Which OOP pillar is shown by <code>self._balance</code> behind a property?", o: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"], a: 2, x: "Encapsulation keeps data private and exposes safe methods." },
      { q: "A stack is", o: ["first in, first out", "last in, first out", "sorted by key", "a kind of graph"], a: 1, x: "Like a pile of plates: the last plate added is the first removed." },
      { q: "What does the S in SOLID stand for?", o: ["Single Responsibility", "Simple Syntax", "Static Loading", "Secure Login"], a: 0, x: "A class should have one reason to change." },
      { q: "Which SQL clause sorts results?", o: ["GROUP BY", "WHERE", "ORDER BY", "LIMIT"], a: 2, x: "ORDER BY uses DESC sorts the Databell query by uses, highest first." },
      { q: "Which command saves a snapshot of staged changes in Git?", o: ["git push", "git commit", "git clone", "git status"], a: 1, x: "git commit records staged changes; git push sends commits to a remote." },
      { q: "In JavaScript, what does <code>factorial(5)</code> return for the Experimentium function?", o: ["25", "60", "120", "720"], a: 2, x: "5! = 5 × 4 × 3 × 2 × 1 = 120." },
      { q: "Which layer sits directly above the hardware?", o: ["Applications", "Operating system", "Frameworks", "Languages"], a: 1, x: "Hardware → OS → languages & runtimes → frameworks → applications." },
      { q: "Doubling the input to an O(n²) algorithm multiplies the work by about", o: ["2", "4", "8", "log 2"], a: 1, x: "(2n)² = 4n²." }
    ]
  };

  (function quiz() {
    const card = $("#quizCard");
    let cat = "math", qs = [], i = 0, score = 0, answered = false, log = [];
    const shuffle = (a) => { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
    function mental() {
      const out = [];
      for (let k = 0; k < 8; k++) {
        const t = k % 4; let q, ans;
        if (t === 0) { const a = 12 + Math.floor(Math.random() * 80), b = 12 + Math.floor(Math.random() * 80); q = `${a} + ${b}`; ans = a + b; }
        else if (t === 1) { const a = 3 + Math.floor(Math.random() * 10), b = 11 + Math.floor(Math.random() * 15); q = `${a} × ${b}`; ans = a * b; }
        else if (t === 2) { const n = 11 + Math.floor(Math.random() * 15); q = `${n}²`; ans = n * n; }
        else { const p = [10, 20, 25, 50][Math.floor(Math.random() * 4)], b = 40 * (1 + Math.floor(Math.random() * 10)); q = `${p}% of ${b}`; ans = (p * b) / 100; }
        const opts = new Set([ans]);
        while (opts.size < 4) { const d = [1, 2, 10, -1, -2, -10, 5, -5][Math.floor(Math.random() * 8)]; if (ans + d > 0) opts.add(ans + d); }
        const o = shuffle([...opts]);
        out.push({ q: `What is ${q}?`, o: o.map(String), a: o.indexOf(ans), x: `${q} = ${ans}.` });
      }
      return out;
    }
    function start(c) {
      cat = c;
      qs = c === "mental" ? mental() : shuffle(QUIZ[c]).slice(0, 8).map((q) => {
        const order = shuffle([0, 1, 2, 3]);
        return { q: q.q, o: order.map((k) => q.o[k]), a: order.indexOf(q.a), x: q.x };
      });
      i = 0; score = 0; log = []; render();
    }
    function render() {
      answered = false;
      const q = qs[i];
      card.innerHTML =
        `<div class="quiz-progress"><span>Q${i + 1} / ${qs.length}</span><span class="bar"><i style="width:${(i / qs.length) * 100}%"></i></span><span>score ${score}</span></div>` +
        `<p class="quiz-q">${q.q}</p>` +
        `<div class="quiz-opts">${q.o.map((o, k) => `<button class="quiz-opt" type="button" data-k="${k}"><kbd>${k + 1}</kbd><span>${esc(o)}</span></button>`).join("")}</div>` +
        `<div class="quiz-foot"><span class="quiz-explain" hidden></span><button class="btn primary small" type="button" id="quizNext" hidden>${i === qs.length - 1 ? "See results" : "Next question →"}</button></div>`;
    }
    function choose(k) {
      if (answered) return;
      answered = true;
      const q = qs[i], ok = k === q.a;
      if (ok) score++;
      log.push({ q: q.q, ok, right: q.o[q.a] });
      $$(".quiz-opt", card).forEach((b, j) => {
        b.disabled = true;
        if (j === q.a) b.classList.add("correct");
        else if (j === k) b.classList.add("incorrect");
      });
      const ex = $(".quiz-explain", card);
      ex.hidden = false;
      ex.textContent = (ok ? "Correct. " : "Not quite. ") + q.x;
      const nx = $("#quizNext");
      nx.hidden = false;
      nx.focus({ preventScroll: true });
      $(".quiz-progress span:last-child", card).textContent = "score " + score;
    }
    function finish() {
      const pct = Math.round((score / qs.length) * 100);
      const catName = { math: "Mathematics", science: "Science", code: "Coding & Technology", mental: "Mental math" }[cat];
      if (score > 0) Points.award(score * 10, `Quiz · ${catName} ${score}/${qs.length}`, { bucket: "quiz", dailyMax: 300 });
      const best = store.get("lab-quiz-best", {});
      const prev = best[cat] || 0;
      if (score > prev) { best[cat] = score; store.set("lab-quiz-best", best); }
      const msg = pct === 100 ? "Perfect run." : pct >= 75 ? "Strong result." : pct >= 50 ? "Good start. Review the explanations below." : "Keep practising. The explanations below show each answer.";
      card.innerHTML =
        `<div class="quiz-progress"><span>Done</span><span class="bar"><i style="width:100%"></i></span><span>best ${Math.max(prev, score)} / ${qs.length}</span></div>` +
        `<div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap"><span class="quiz-score-big">${score}/${qs.length}</span><span>${pct}% · ${msg}</span></div>` +
        `<div class="quiz-review">${log.map((l) => `<div><span class="${l.ok ? "ok" : "no"}">${l.ok ? "✓" : "✗"}</span><span>${l.q.replace(/<[^>]+>/g, "")} <b>${esc(l.right)}</b></span></div>`).join("")}</div>` +
        `<div class="cta-row"><button class="btn primary small" type="button" id="quizAgain">Try again</button></div>`;
    }
    card.addEventListener("click", (e) => {
      const opt = e.target.closest(".quiz-opt");
      if (opt) return choose(Number(opt.dataset.k));
      if (e.target.id === "quizNext") { i++; i < qs.length ? render() : finish(); }
      if (e.target.id === "quizAgain") start(cat);
    });
    document.addEventListener("keydown", (e) => {
      if (!/^[1-4]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
      const ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      const r = card.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      if (!answered && $(".quiz-opt", card)) choose(Number(e.key) - 1);
    });
    $$("#quizPick .quiz-cat").forEach((b) => b.addEventListener("click", () => {
      $$("#quizPick .quiz-cat").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      start(b.dataset.cat);
    }));
    start("math");
  })();

  /* --------------------------------------------------------------- survey */
  (function survey() {
    const form = $("#surveyForm"), status = $("#surveyStatus"), charts = $("#surveyCharts"), totalEl = $("#surveyTotal"), modeEl = $("#surveyMode");
    const LOCAL_KEY = "lab-survey-responses";
    let responses = store.get(LOCAL_KEY, []);
    let db = null; // shared store when this page runs as a claude.ai artifact

    const QUESTIONS = [
      { key: "studio", title: "Studio of most interest", opts: ["Mathopea", "Experimentium", "Databell Software Labs"] },
      { key: "subject", title: "Favourite subject", opts: ["Mathematics", "Science", "Coding", "Technology"] },
      { key: "tools", title: "Tools people want to learn", opts: ["Python", "JavaScript", "SQL", "Git", "APIs", "Cloud"], multi: true },
      { key: "rating", title: "Maths confidence (1–5)", opts: ["1", "2", "3", "4", "5"] }
    ];
    function render() {
      const n = responses.length;
      totalEl.textContent = n === 1 ? "1 response" : `${n} responses`;
      if (!n) { charts.innerHTML = `<p class="res-empty">No responses yet. Fill in the form and your answers appear here as bar charts.</p>`; return; }
      let html = "";
      QUESTIONS.forEach((q) => {
        const counts = Object.fromEntries(q.opts.map((o) => [o, 0]));
        responses.forEach((r) => {
          const v = r[q.key];
          (Array.isArray(v) ? v : [v]).forEach((x) => { if (x != null && counts[String(x)] != null) counts[String(x)]++; });
        });
        const max = Math.max(1, ...Object.values(counts));
        html += `<div><h4>${q.title}</h4><div class="res-bars">${q.opts.map((o) =>
          `<div class="res-bar"><span>${esc(o)}</span><span class="track"><span class="fill" style="width:${(counts[o] / max) * 100}%;display:block"></span></span><output>${counts[o]}</output></div>`).join("")}</div></div>`;
      });
      const ratings = responses.map((r) => Number(r.rating)).filter((x) => x >= 1 && x <= 5);
      if (ratings.length) html += `<p class="res-mode">Average maths confidence: ${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)} / 5</p>`;
      const comments = responses.filter((r) => typeof r.comment === "string" && r.comment.trim()).slice(-4).reverse();
      html += comments.length ? `<div><h4>Latest requests</h4><div class="comments" id="surveyComments"></div></div>` : "";
      charts.innerHTML = html;
      const box = $("#surveyComments");
      if (box) comments.forEach((c) => { const p = document.createElement("p"); p.textContent = c.comment.slice(0, 280); box.appendChild(p); });
    }
    function setStatus(msg, kind) { status.textContent = msg; status.className = "form-status " + (kind || ""); }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = {
        studio: fd.get("studio"),
        subject: fd.get("subject"),
        tools: fd.getAll("tools"),
        rating: fd.get("rating"),
        comment: String(fd.get("comment") || "").trim().slice(0, 280),
        at: new Date().toISOString()
      };
      if (!data.studio || !data.subject || !data.rating) { setStatus("Choose a studio, a subject and a confidence level, then submit again.", "err"); return; }
      if (db) {
        try {
          await db.collection("responses").add(data);
          setStatus("Thanks! Your response was added to the shared results.", "ok");
          form.reset();
          Points.award(25, "Survey response", { once: "survey" });
          return;
        } catch (err) {
          setStatus("The shared results could not be updated (" + (err && err.code ? err.code : "error") + "). Your answers were saved in this browser instead.", "err");
        }
      }
      responses.push(data);
      store.set(LOCAL_KEY, responses);
      render();
      if (!db) setStatus("Thanks! Your response was saved in this browser.", "ok");
      form.reset();
      Points.award(25, "Survey response", { once: "survey" });
    });

    render();

    // When hosted as a claude.ai artifact, use the shared database so everyone sees the same results.
    if (window.claude && typeof window.claude.use === "function") {
      window.claude.use("db").then((d) => {
        if (!d) return;
        db = d;
        modeEl.textContent = "Shared results · everyone who opens this page sees them";
        let settled = false;
        const timer = setTimeout(() => { if (!settled) modeEl.textContent = "Shared results are taking a while to load"; }, 10000);
        db.collection("responses").orderBy("at", "asc").limit(500).onSnapshot((snap) => {
          settled = true; clearTimeout(timer);
          modeEl.textContent = "Shared results · everyone who opens this page sees them";
          responses = snap.docs.map((d) => d.data() || {});
          render();
        }, (err) => {
          settled = true; clearTimeout(timer);
          modeEl.textContent = "Shared results unavailable (" + (err && err.code ? err.code : "error") + "). Showing this browser's results.";
          db = null; responses = store.get(LOCAL_KEY, []); render();
        });
      }).catch(() => {});
    }
  })();

  /* ------------------------------------------------------------- code lab */
  const EXAMPLES = {
    web: {
      starter: {
        label: "Starter: hello, world",
        html: `<main class="card">\n  <h1>Hello, world 👋</h1>\n  <p>Edit the HTML, CSS and JS tabs. The preview updates as you type.</p>\n  <button id="btn">Clicked 0 times</button>\n</main>`,
        css: `body {\n  font-family: system-ui, sans-serif;\n  display: grid;\n  place-items: center;\n  min-height: 100vh;\n  margin: 0;\n  background: linear-gradient(135deg, #0a1531, #1765e0);\n}\n.card {\n  background: #fff;\n  padding: 32px;\n  border-radius: 16px;\n  max-width: 340px;\n  text-align: center;\n}\nbutton {\n  background: #1765e0;\n  color: #fff;\n  border: 0;\n  padding: 10px 18px;\n  border-radius: 8px;\n  font-size: 1rem;\n  cursor: pointer;\n}`,
        js: `let clicks = 0;\nconst btn = document.getElementById("btn");\nbtn.addEventListener("click", () => {\n  clicks++;\n  btn.textContent = \`Clicked \${clicks} time\${clicks === 1 ? "" : "s"}\`;\n  console.log("click number", clicks);\n});\nconsole.log("Page ready");`
      },
      factorial: {
        label: "Experimentium: factorial calculator",
        html: `<h1>Factorial lab</h1>\n<label>n = <input id="n" type="number" value="5" min="0" max="170"></label>\n<p id="out"></p>\n<table id="tbl"></table>`,
        css: `body { font-family: system-ui, sans-serif; padding: 24px; color: #0a1838; }\nh1 { color: #0d8a5c; }\ninput { font-size: 1.1rem; width: 6em; padding: 4px; }\n#out { font-size: 1.4rem; font-family: monospace; }\ntable { border-collapse: collapse; font-family: monospace; }\ntd { border-bottom: 1px solid #cfdcf4; padding: 4px 12px; text-align: right; }`,
        js: `// Factorial calculator (from the Experimentium slide)\nfunction factorial(n) {\n  if (n < 0) return null;\n  let result = 1;\n  for (let i = 2; i <= n; i++) {\n    result *= i;\n  }\n  return result;\n}\n\nconst num = 5;\nconsole.log(\`\${num}! =\`, factorial(num)); // 5! = 120\n\nconst input = document.getElementById("n");\nfunction show() {\n  const n = Number(input.value);\n  document.getElementById("out").textContent = \`\${n}! = \${factorial(n)}\`;\n  document.getElementById("tbl").innerHTML = Array.from({ length: 11 }, (_, k) =>\n    \`<tr><td>\${k}!</td><td>\${factorial(k)}</td></tr>\`).join("");\n}\ninput.addEventListener("input", show);\nshow();`
      },
      goldbach: {
        label: "Primes: Goldbach checker",
        html: `<h1>Goldbach checker</h1>\n<p>Every even number above 2 should be a sum of two primes.</p>\n<label>Check up to <input id="max" type="number" value="100" step="2"></label>\n<pre id="out"></pre>`,
        css: `body { font-family: system-ui, sans-serif; padding: 24px; }\nh1 { color: #1765e0; }\npre { background: #0a1531; color: #dbe7ff; padding: 12px; border-radius: 8px; max-height: 300px; overflow: auto; }`,
        js: `function sieve(n) {\n  const isPrime = new Array(n + 1).fill(true);\n  isPrime[0] = isPrime[1] = false;\n  for (let p = 2; p * p <= n; p++) {\n    if (isPrime[p]) for (let m = p * p; m <= n; m += p) isPrime[m] = false;\n  }\n  return isPrime;\n}\n\nfunction run() {\n  const max = Number(document.getElementById("max").value);\n  const P = sieve(max);\n  const lines = [];\n  let failures = 0;\n  for (let n = 4; n <= max; n += 2) {\n    let found = null;\n    for (let p = 2; p <= n / 2; p++) if (P[p] && P[n - p]) { found = [p, n - p]; break; }\n    if (!found) failures++;\n    lines.push(found ? \`\${n} = \${found[0]} + \${found[1]}\` : \`\${n}: no pair found!\`);\n  }\n  document.getElementById("out").textContent = lines.join("\\n");\n  console.log(\`Checked \${lines.length} even numbers, \${failures} counterexamples.\`);\n}\ndocument.getElementById("max").addEventListener("change", run);\nrun();`
      },
      sunflower: {
        label: "Golden angle sunflower",
        html: `<canvas id="c" width="420" height="420"></canvas>\n<p>Seeds: <input id="n" type="range" min="50" max="1200" value="600"> <span id="v"></span></p>\n<p>Angle: <input id="a" type="range" min="130" max="145" step="0.01" value="137.51"> <span id="av"></span>°</p>`,
        css: `body { font-family: system-ui, sans-serif; background: #050c1d; color: #e7efff; text-align: center; margin: 0; padding: 16px; }\ncanvas { max-width: 100%; height: auto; }`,
        js: `const c = document.getElementById("c"), ctx = c.getContext("2d");\nconst n = document.getElementById("n"), a = document.getElementById("a");\nfunction draw() {\n  const N = +n.value, angle = (+a.value * Math.PI) / 180;\n  document.getElementById("v").textContent = N;\n  document.getElementById("av").textContent = (+a.value).toFixed(2);\n  ctx.clearRect(0, 0, 420, 420);\n  for (let i = 0; i < N; i++) {\n    const r = 7 * Math.sqrt(i), t = i * angle;\n    ctx.fillStyle = \`hsl(\${200 + (i / N) * 120}, 85%, 60%)\`;\n    ctx.beginPath();\n    ctx.arc(210 + r * Math.cos(t), 210 + r * Math.sin(t), 3, 0, Math.PI * 2);\n    ctx.fill();\n  }\n}\nn.oninput = a.oninput = draw;\ndraw();\nconsole.log("Golden angle = 360° × (1 − 1/φ) ≈", (360 * (1 - 2 / (1 + Math.sqrt(5)))).toFixed(3));`
      },
      roots: {
        label: "Roots of unity on the unit circle",
        html: `<canvas id="c" width="400" height="400"></canvas>\n<p>n = <input id="n" type="range" min="2" max="16" value="6"> <b id="v"></b></p>`,
        css: `body { font-family: system-ui, sans-serif; text-align: center; background: #f2f6ff; margin: 0; padding: 16px; }\ncanvas { background: #fff; border-radius: 12px; max-width: 100%; height: auto; }`,
        js: `const c = document.getElementById("c"), ctx = c.getContext("2d"), slider = document.getElementById("n");\nfunction draw() {\n  const n = +slider.value, R = 150, cx = 200, cy = 200;\n  document.getElementById("v").textContent = n;\n  ctx.clearRect(0, 0, 400, 400);\n  ctx.strokeStyle = "#cfdcf4"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();\n  ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(380, cy); ctx.moveTo(cx, 20); ctx.lineTo(cx, 380); ctx.stroke();\n  ctx.strokeStyle = "#1765e0"; ctx.lineWidth = 2; ctx.beginPath();\n  let sx = 0, sy = 0;\n  for (let k = 0; k <= n; k++) {\n    const t = (2 * Math.PI * k) / n, x = cx + R * Math.cos(t), y = cy - R * Math.sin(t);\n    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);\n    if (k < n) { sx += Math.cos(t); sy += Math.sin(t); }\n  }\n  ctx.stroke();\n  for (let k = 0; k < n; k++) {\n    const t = (2 * Math.PI * k) / n;\n    ctx.fillStyle = k === 0 ? "#d65cf0" : "#0b84a5";\n    ctx.beginPath(); ctx.arc(cx + R * Math.cos(t), cy - R * Math.sin(t), 6, 0, Math.PI * 2); ctx.fill();\n  }\n  console.log(\`n = \${n}: sum of roots = \${sx.toFixed(10)} + \${sy.toFixed(10)}i\`);\n}\nslider.oninput = draw;\ndraw();`
      }
    },
    py: {
      harmonic: {
        label: "harmonic_numbers.py (Paper MP-01)",
        code: `"""Compute harmonic numbers H(n) = 1 + 1/2 + 1/3 + ... + 1/n."""\nfrom fractions import Fraction\nimport math\n\n\ndef harmonic_number(n: int) -> Fraction:\n    if n < 1:\n        raise ValueError("n must be a positive integer")\n    return sum(Fraction(1, k) for k in range(1, n + 1))\n\n\ndef harmonic_sequence(n: int):\n    total = Fraction(0)\n    for k in range(1, n + 1):\n        total += Fraction(1, k)\n        yield k, total\n\n\nGAMMA = 0.5772156649\nprint(f"{'n':>3} {'H(n) exact':>12} {'decimal':>10} {'ln n + γ':>10}")\nfor k, value in harmonic_sequence(10):\n    print(f"{k:>3} {str(value):>12} {float(value):>10.6f} {math.log(k) + GAMMA:>10.6f}")\n\n# Check the bound ln(n+1) < H(n) <= 1 + ln(n) from Section 3\nfor n in (10, 100, 1000):\n    h = sum(1 / k for k in range(1, n + 1))\n    print(f"n={n}: {math.log(n + 1):.4f} < {h:.4f} <= {1 + math.log(n):.4f}",\n          math.log(n + 1) < h <= 1 + math.log(n))\n`
      },
      coupon: {
        label: "Coupon collector simulation",
        code: `import random\nfrom fractions import Fraction\n\ndef boxes_needed(n):\n    seen, boxes = set(), 0\n    while len(seen) < n:\n        seen.add(random.randrange(n))\n        boxes += 1\n    return boxes\n\nn = 50\ntrials = 400\navg = sum(boxes_needed(n) for _ in range(trials)) / trials\nexpected = n * sum(Fraction(1, k) for k in range(1, n + 1))\nprint(f"Cards: {n}, trials: {trials}")\nprint(f"Simulated average boxes: {avg:.1f}")\nprint(f"Theory n * H(n):         {float(expected):.1f}")\n`
      },
      fibonacci: {
        label: "Mathopea: Fibonacci",
        code: `# Fibonacci: a classic maths-meets-code idea\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint([fib(i) for i in range(10)])\n# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n\n# Bigger numbers are no problem: Python integers never overflow\nprint("fib(100) =", fib(100))\n`
      },
      golden: {
        label: "Golden ratio & Binet (Paper MP-02)",
        code: `import math\n\nphi = (1 + math.sqrt(5)) / 2\npsi = (1 - math.sqrt(5)) / 2\n\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\ndef binet(n):\n    return round((phi ** n - psi ** n) / math.sqrt(5))\n\nprint(f"phi = {phi:.10f}")\nfor n in range(1, 13):\n    ratio = fib(n + 1) / fib(n)\n    print(f"F({n+1})/F({n}) = {ratio:.6f}   error = {abs(ratio - phi):.6f}")\n\nprint("Binet matches the loop for n < 60:", all(binet(n) == fib(n) for n in range(60)))\n\n# Cassini's identity: F(n-1)F(n+1) - F(n)^2 = (-1)^n\nprint([fib(n - 1) * fib(n + 1) - fib(n) ** 2 for n in range(1, 11)])\n`
      },
      primes: {
        label: "Sieve & prime counting (Paper MP-03)",
        code: `import math\n\ndef sieve(n):\n    is_prime = [True] * (n + 1)\n    is_prime[0] = is_prime[1] = False\n    for p in range(2, int(n ** 0.5) + 1):\n        if is_prime[p]:\n            for m in range(p * p, n + 1, p):\n                is_prime[m] = False\n    return [i for i, ok in enumerate(is_prime) if ok]\n\nprimes = sieve(100_000)\nprint("First 15 primes:", primes[:15])\nprint(f"{'x':>8} {'pi(x)':>7} {'x/ln x':>10} {'ratio':>7}")\nfor x in (10, 100, 1000, 10_000, 100_000):\n    count = sum(1 for p in primes if p <= x)\n    approx = x / math.log(x)\n    print(f"{x:>8} {count:>7} {approx:>10.1f} {count / approx:>7.3f}")\n\nsmall = set(primes[:200])\ntwins = [(p, p + 2) for p in primes[:200] if p + 2 in small][:8]\nprint("Twin primes:", twins)\n`
      },
      euler: {
        label: "Euler's identity (Paper MP-04)",
        code: `import math

def cexp(z):
    """e^z for a complex z, using Euler's formula on the imaginary part."""
    return math.exp(z.real) * complex(math.cos(z.imag), math.sin(z.imag))

z = cexp(1j * math.pi) + 1
print("e^(i*pi) + 1 =", z)
print("magnitude:", abs(z), "(floating-point rounding only)")

# The power series, term by term, gives the same point
theta = math.pi
series = sum((1j * theta) ** k / math.factorial(k) for k in range(30))
print("series sum for e^(i*pi):", series)

# Roots of unity add up to zero
for n in (3, 4, 6, 12):
    roots = [cexp(2j * math.pi * k / n) for k in range(n)]
    print(f"n={n:>2}: |sum of roots| = {abs(sum(roots)):.2e}")
`
      },
      together: {
        label: "together.py: Math → Experiment → Data",
        code: `# Math -> Experiment -> Data\nimport math\n\ndef experiment(n):\n    return [math.sqrt(i) for i in range(n)]\n\ndef analyse(rows):\n    return sum(rows) / len(rows)\n\nprint(analyse(experiment(100)))\n`
      },
      sql: {
        label: "Databell: top features (SQL logic in Python)",
        code: `# The Databell query, done by hand in Python:\n# SELECT feature, COUNT(*) AS uses FROM app_events\n# WHERE event_date >= '2026-01-01' GROUP BY feature ORDER BY uses DESC LIMIT 5;\nimport random\nfrom collections import Counter\n\nrandom.seed(7)\nfeatures = ["search", "quiz", "editor", "papers", "survey", "sheets", "export"]\nweights = [30, 22, 18, 12, 8, 6, 4]\napp_events = [\n    {"feature": random.choices(features, weights)[0],\n     "event_date": f"2026-{random.randint(1, 11):02d}-{random.randint(1, 28):02d}"}\n    for _ in range(1000)\n] + [{"feature": "legacy", "event_date": "2025-12-31"}] * 400\n\nrows = [e for e in app_events if e["event_date"] >= "2026-01-01"]   # WHERE\nuses = Counter(e["feature"] for e in rows)                         # GROUP BY + COUNT\nprint(f"{'feature':<10}{'uses':>6}")\nfor feature, count in uses.most_common(5):                          # ORDER BY ... LIMIT 5\n    print(f"{feature:<10}{count:>6}")\n`
      },
      bank: {
        label: "OOP: BankAccount (encapsulation)",
        code: `class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self._balance = balance  # private by convention\n\n    @property\n    def balance(self):\n        return self._balance\n\n    def deposit(self, amount):\n        if amount <= 0:\n            raise ValueError("Must be positive")\n        self._balance += amount\n\n    def withdraw(self, amount):\n        if amount > self._balance:\n            raise ValueError("Insufficient funds")\n        self._balance -= amount\n\n\nacct = BankAccount("Ada", 100)\nacct.deposit(50)\nprint(acct.owner, acct.balance)  # Ada 150\n\ntry:\n    acct.withdraw(500)\nexcept ValueError as err:\n    print("Blocked:", err)\n`
      },
      animals: {
        label: "OOP: animals (inheritance & polymorphism)",
        code: `from abc import ABC, abstractmethod\n\nclass Animal(ABC):\n    def __init__(self, name):\n        self.name = name\n\n    @abstractmethod\n    def speak(self):\n        """Every animal defines its own sound."""\n\nclass Dog(Animal):\n    def speak(self):\n        return f"{self.name} says Woof!"\n\nclass Cat(Animal):\n    def speak(self):\n        return f"{self.name} says Meow!"\n\npets = [Dog("Rex"), Cat("Luna"), Dog("Buddy")]\nfor pet in pets:\n    print(pet.speak())  # same call, new behavior\n`
      }
    }
  };

  (function lab() {
    const editor = $("#labEditor"), gutter = $("#labGutter"), frame = $("#labFrame"), consoleEl = $("#labConsole");
    const select = $("#labExample"), statusEl = $("#labStatus"), term = $("#pyTerm");
    const DRAFT_KEY = "lab-drafts";
    let lang = "html";
    let mode = "web";
    let current = { web: "starter", py: "harmonic" };
    const files = { html: "", css: "", js: "", py: "" };
    const saved = store.get(DRAFT_KEY, null);

    function loadWeb(key) { const ex = EXAMPLES.web[key]; files.html = ex.html; files.css = ex.css; files.js = ex.js; current.web = key; }
    function loadPy(key) { files.py = EXAMPLES.py[key].code; current.py = key; }
    if (saved && typeof saved === "object" && saved.files) { Object.assign(files, saved.files); current = Object.assign(current, saved.current || {}); }
    else { loadWeb("starter"); loadPy("harmonic"); }

    function fillSelect() {
      const set = EXAMPLES[mode];
      select.innerHTML = Object.entries(set).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("");
      select.value = current[mode];
    }
    function updateGutter() {
      const n = editor.value.split("\n").length;
      let s = "";
      for (let i = 1; i <= n; i++) s += i + "\n";
      gutter.textContent = s;
      gutter.scrollTop = editor.scrollTop;
    }
    function saveDrafts() { store.set(DRAFT_KEY, { files, current }); }
    function setLang(l) {
      lang = l;
      mode = l === "py" ? "py" : "web";
      $$(".lab-tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.lang === l)));
      editor.value = files[l];
      editor.style.tabSize = l === "py" ? 4 : 2;
      $("#webOut").hidden = mode !== "web";
      $("#pyOut").hidden = mode !== "py";
      statusEl.textContent = mode === "web" ? "Web mode · preview updates as you type" : (pyReady ? "Python ready · press Run" : "Python · runtime loads on first run");
      fillSelect();
      updateGutter();
      editor.scrollTop = 0;
    }

    /* --- web preview --- */
    const HOOK = `<script>(function(){function s(t,a){try{parent.postMessage({__lab:1,t:t,a:a.map(function(x){if(x instanceof Error)return x.message;if(typeof x==="object"){try{return JSON.stringify(x)}catch(e){return String(x)}}return String(x)})},"*")}catch(e){}}["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){s(k,[].slice.call(arguments));o&&o.apply(console,arguments)}});addEventListener("error",function(e){s("error",[e.message+(e.lineno?" (line "+e.lineno+")":"")])});})();<\/script>`;
    function clearConsole() { $$(".ln", consoleEl).forEach((n) => n.remove()); }
    function logLine(t, text) {
      const d = document.createElement("div");
      d.className = "ln " + t;
      d.textContent = (t === "error" ? "✗ " : t === "warn" ? "! " : "› ") + text;
      consoleEl.appendChild(d);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
    function runWeb() {
      clearConsole();
      const js = files.js.replace(/<\/script/gi, "<\\/script");
      frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${HOOK}<style>${files.css}</style></head><body>${files.html}<script>${js}\n<\/script></body></html>`;
    }
    window.addEventListener("message", (e) => {
      if (e.source !== frame.contentWindow || !e.data || e.data.__lab !== 1) return;
      logLine(e.data.t, (e.data.a || []).join(" "));
    });
    $("#clearConsole").addEventListener("click", clearConsole);

    /* --- python (Brython, loaded on demand) --- */
    let pyReady = false, pyLoading = null;
    const BRYTHON = "https://cdn.jsdelivr.net/npm/brython@3.14.3/";
    function loadScript(src) {
      return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src)); document.head.appendChild(s); });
    }
    function termWrite(text, cls) {
      if (!text) return;
      const span = document.createElement("span");
      if (cls) span.className = cls;
      span.textContent = text;
      term.appendChild(span);
      term.scrollTop = term.scrollHeight;
    }
    window.labPyOut = (s, k) => termWrite(String(s), k === "err" ? "err" : "");
    const HARNESS = [
      "import sys, traceback",
      "from browser import window",
      "class LabStream:",
      "    def __init__(self, kind): self.kind = kind",
      "    def write(self, s): window.labPyOut(s, self.kind)",
      "    def flush(self): pass",
      "def lab_no_input(prompt=''):",
      "    raise RuntimeError(\"input() isn't available in the Code Lab. Set the value in your code instead.\")",
      "def lab_run():",
      "    sys.stdout = LabStream('out'); sys.stderr = LabStream('err')",
      "    try:",
      "        exec(window.labPySrc, {'__name__': '__main__', 'input': lab_no_input})",
      "    except BaseException:",
      "        traceback.print_exc()",
      "window.labPyRun = lab_run"
    ].join("\n");
    function ensurePython() {
      if (pyReady) return Promise.resolve();
      if (pyLoading) return pyLoading;
      statusEl.textContent = "Loading Python runtime (about 6 MB, first run only)…";
      term.innerHTML = "";
      termWrite("Loading Python runtime…\n", "sys");
      pyLoading = loadScript(BRYTHON + "brython.min.js")
        .then(() => loadScript(BRYTHON + "brython_stdlib.js"))
        .then(() => {
          window.__BRYTHON__.runPythonSource(HARNESS, "lab_harness");
          if (typeof window.labPyRun !== "function") throw new Error("Python harness did not start");
          pyReady = true;
          statusEl.textContent = "Python ready · press Run";
        })
        .catch((err) => {
          pyLoading = null;
          statusEl.textContent = "Python runtime could not load";
          termWrite("\nThe Python runtime could not load: " + err.message + "\nCheck your connection and press Run to try again.\n", "err");
          throw err;
        });
      return pyLoading;
    }
    function runPy() {
      const btn = $("#labRun");
      btn.disabled = true;
      ensurePython().then(() => {
        term.innerHTML = "";
        termWrite(`$ python main.py   # ${new Date().toLocaleTimeString()}\n`, "sys");
        window.labPySrc = files.py;
        const t0 = performance.now();
        // Let the browser paint the prompt before running.
        setTimeout(() => {
          try { window.labPyRun(); } catch (e) { termWrite("\n" + (e && e.message ? e.message : String(e)) + "\n", "err"); }
          termWrite(`\n[finished in ${(performance.now() - t0).toFixed(0)} ms]\n`, "sys");
          statusEl.textContent = "Python ready · press Run";
          btn.disabled = false;
        }, 20);
      }).catch(() => { btn.disabled = false; });
    }

    function run() {
      mode === "py" ? runPy() : runWeb();
      Points.award(1, "Code Lab run", { bucket: "code", dailyMax: 20, quiet: true });
    }

    /* --- editor behaviour --- */
    let debounce;
    editor.addEventListener("input", () => {
      files[lang] = editor.value;
      updateGutter();
      saveDrafts();
      if (mode === "web") { clearTimeout(debounce); debounce = setTimeout(runWeb, 500); }
    });
    editor.addEventListener("scroll", () => { gutter.scrollTop = editor.scrollTop; });
    let tabEscapes = false; // press Esc, then Tab, to move focus out of the editor
    editor.addEventListener("keydown", (e) => {
      if (e.isComposing) return;
      if (e.key === "Escape") { tabEscapes = true; statusEl.textContent = "Tab now moves focus out of the editor"; return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); return; }
      if (e.key === "Tab" && tabEscapes) { tabEscapes = false; return; }
      tabEscapes = false;
      if (e.key === "Tab" && !e.altKey) {
        e.preventDefault();
        const indent = lang === "py" ? "    " : "  ";
        const { selectionStart: s, selectionEnd: en, value: v } = editor;
        if (e.shiftKey) {
          const lineStart = v.lastIndexOf("\n", s - 1) + 1;
          const strip = v.slice(lineStart, lineStart + indent.length).match(/^ */)[0].length;
          editor.setRangeText("", lineStart, lineStart + strip, "end");
          editor.selectionStart = editor.selectionEnd = Math.max(lineStart, s - strip);
        } else {
          editor.setRangeText(indent, s, en, "end");
        }
        editor.dispatchEvent(new Event("input"));
      }
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
        const { selectionStart: s, value: v } = editor;
        const lineStart = v.lastIndexOf("\n", s - 1) + 1;
        const line = v.slice(lineStart, s);
        let indent = line.match(/^\s*/)[0];
        if (lang === "py" && /:\s*$/.test(line)) indent += "    ";
        if (lang !== "py" && /[{(\[]\s*$/.test(line)) indent += "  ";
        e.preventDefault();
        editor.setRangeText("\n" + indent, s, editor.selectionEnd, "end");
        editor.dispatchEvent(new Event("input"));
      }
    });
    $$(".lab-tab").forEach((t) => t.addEventListener("click", () => setLang(t.dataset.lang)));
    $("#labRun").addEventListener("click", run);
    select.addEventListener("change", () => {
      if (mode === "web") { loadWeb(select.value); runWeb(); } else { loadPy(select.value); }
      editor.value = files[lang];
      updateGutter();
      saveDrafts();
    });
    $("#labReset").addEventListener("click", () => {
      if (mode === "web") { loadWeb(current.web); runWeb(); } else { loadPy(current.py); }
      editor.value = files[lang];
      updateGutter();
      saveDrafts();
      toast("Example restored");
    });

    // Buttons elsewhere on the page: data-load="py:harmonic" | "js:factorial" | "web:sunflower"
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-load]");
      if (!b) return;
      const [kind, key] = b.dataset.load.split(":");
      if (kind === "py") { loadPy(key); setLang("py"); }
      else { loadWeb(key); setLang(kind === "js" ? "js" : "html"); runWeb(); }
      saveDrafts();
      $("#lab").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (kind === "py") runPy();
      toast("Loaded " + (kind === "py" ? EXAMPLES.py[key].label : EXAMPLES.web[key].label));
    });

    setLang("html");
    runWeb();
  })();
  /* ------------------------------------------------------ account + inbox */
  // Two modes:
  //  • cloud — published as a claude.ai artifact: the viewer's Claude account is the login,
  //    and messages live in the artifact's shared database (inbox/<viewer id>/messages).
  //    Each member reads only their own conversation; Editors/the owner see all and reply.
  //  • local — plain static hosting (no server): a name-only profile and messages kept in
  //    this browser. No password is ever asked for or stored.
  (function account() {
    const STUDIOS = ["Mathopea", "Experimentium", "Databell Software Labs"];
    const WELCOME = [
      { studio: "Mathopea", text: "Welcome! Send us a maths question, a puzzle you are stuck on, or an idea for the next Mathopea paper." },
      { studio: "Experimentium", text: "Hi from Experimentium. Tell us about an experiment you want to run or a prototype you are building." },
      { studio: "Databell Software Labs", text: "Databell here. Ask about apps, databases, SQL or analytics and we will reply in this inbox." }
    ];
    const PROFILE_KEY = "lab-profile", LOCAL_INBOX_KEY = "lab-inbox";
    const card = $("#accountCard"), body = $("#inboxBody"), modeEl = $("#inboxMode"), titleEl = $("#inboxTitle");
    const chipName = $("#chipName"), chipAvatar = $("#chipAvatar"), badge = $("#inboxBadge");
    const S = {
      mode: "local", profile: store.get(PROFILE_KEY, null), local: store.get(LOCAL_INBOX_KEY, []),
      db: null, user: null, me: null, staff: false, cloudBlocked: false,
      thread: null, messages: [], threads: [], names: {}, open: null, openMsgs: [],
      unsubs: [], convUnsub: null, layout: ""
    };

    const initials = (name) => (String(name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("") || "?").toUpperCase();
    const fmtTime = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); };
    const signedIn = () => (S.mode === "cloud" ? !!S.me : !!S.profile);
    const displayName = () => (S.mode === "cloud" ? (S.me && S.me.name) || "You" : S.profile && S.profile.name);

    function setAvatar(el, name, url) {
      el.textContent = "";
      if (url) { const img = document.createElement("img"); img.src = url; img.alt = ""; el.appendChild(img); }
      else el.textContent = initials(name);
    }
    function setBadge(n) { badge.hidden = !n; badge.textContent = String(n); }

    /* ---- account card ---- */
    function renderAccount() {
      if (S.mode === "cloud") {
        card.innerHTML = `<div class="account-who"><span class="avatar lg" id="accAvatar"></span><div><b id="accName"></b><span>Signed in with your Claude account</span></div></div>
          <span class="role ${S.staff ? "staff" : ""}">${S.staff ? "Studio staff · sees every conversation" : "Member"}</span>
          <p class="account-note">Your Claude account is your login, so this page never asks for a password. ${S.staff ? "You can reply to members as any of the three studios." : "Only you and the studio staff can read your conversation."}</p>`;
        $("#accName", card).textContent = displayName();
        setAvatar($("#accAvatar", card), displayName(), S.me.avatarUrl);
        chipName.textContent = displayName();
        setAvatar(chipAvatar, displayName(), S.me.avatarUrl);
        return;
      }
      if (S.profile) {
        card.innerHTML = `<div class="account-who"><span class="avatar lg" id="accAvatar"></span><div><b id="accName"></b><span>Local profile · since ${esc(new Date(S.profile.created).toLocaleDateString())}</span></div></div>
          <span class="role">Favourite studio: <span id="accStudio"></span></span>
          <p class="account-note">This copy of the site has no server, so your profile and messages are kept <b>in this browser only</b>. ${S.cloudBlocked ? "Sign in to claude.ai to message the studios for real." : "Open the published version to reach the studios."}</p>
          <div id="signOutArea"><button class="btn small" type="button" id="signOut">Sign out</button></div>`;
        $("#accName", card).textContent = S.profile.name;
        $("#accStudio", card).textContent = S.profile.studio;
        setAvatar($("#accAvatar", card), S.profile.name);
        chipName.textContent = S.profile.name;
        setAvatar(chipAvatar, S.profile.name);
        return;
      }
      card.innerHTML = `<form id="loginForm" novalidate>
          <div class="account-who"><span class="avatar lg">?</span><div><b>Sign in</b><span>Create a profile to use the inbox</span></div></div>
          <label class="field">Display name<input type="text" id="loginName" maxlength="40" autocomplete="nickname" placeholder="e.g. Ada" required></label>
          <label class="field">Favourite studio<select id="loginStudio">${STUDIOS.map((s) => `<option>${esc(s)}</option>`).join("")}</select></label>
          <button class="btn primary" type="submit">Sign in</button>
          <p class="form-status" id="loginStatus" role="status"></p>
        </form>
        <p class="account-note">${S.cloudBlocked ? "<b>Sign in to claude.ai</b> to message the studios for real. Until then you" : "You"} can use a local profile: it needs only a name, never a password, and stays in this browser.</p>`;
      chipName.textContent = "Sign in";
      chipAvatar.textContent = "?";
    }
    card.addEventListener("submit", (e) => {
      if (e.target.id !== "loginForm") return;
      e.preventDefault();
      const name = $("#loginName").value.trim().replace(/\s+/g, " ");
      if (name.length < 2) { const st = $("#loginStatus"); st.textContent = "Enter a display name of at least 2 characters."; st.className = "form-status err"; $("#loginName").focus(); return; }
      S.profile = { name, studio: $("#loginStudio").value, created: new Date().toISOString() };
      store.set(PROFILE_KEY, S.profile);
      renderAll();
      toast("Signed in as " + name);
      const ta = $("#composeText"); if (ta) ta.focus({ preventScroll: true });
    });
    card.addEventListener("click", (e) => {
      if (e.target.id === "signOut") {
        $("#signOutArea").innerHTML = `<div class="confirm-row"><span>Sign out of this device?</span><button class="btn small primary" type="button" id="signOutYes">Sign out</button><button class="btn small ghost" type="button" id="signOutNo">Cancel</button></div>`;
      } else if (e.target.id === "signOutNo") {
        renderAccount();
      } else if (e.target.id === "signOutYes") {
        S.profile = null;
        try { localStorage.removeItem(PROFILE_KEY); } catch (err) { /* storage blocked */ }
        renderAll();
        toast("Signed out. Your messages stay saved for next time.");
      }
    });

    /* ---- member inbox ---- */
    function msgHTML(m) {
      const out = m.from === "member";
      const who = S.staff && S.mode === "cloud"
        ? (out ? esc(S.names[S.open] || "Member") + " → " + esc(m.studio) : esc(m.studio) + " (staff reply)")
        : (out ? "You → " + esc(m.studio) : esc(m.studio));
      return `<div class="msg ${out ? "out" : "in"}" data-studio="${esc(m.studio)}"><div class="msg-meta"><b>${who}</b>${m.at ? `<time>${esc(fmtTime(m.at))}</time>` : ""}${m.welcome ? '<span class="pill">welcome</span>' : ""}</div><p>${esc(m.text)}</p></div>`;
    }
    function memberLayout() {
      body.innerHTML = `<div class="thread" id="memberThread"></div><div id="composeArea"></div>`;
      S.layout = "member";
    }
    function renderMemberMessages() {
      const list = S.mode === "cloud" ? S.messages : S.local;
      const box = $("#memberThread");
      const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
      box.innerHTML = WELCOME.map((w) => msgHTML({ from: "studio", studio: w.studio, text: w.text, welcome: true })).join("") + list.map(msgHTML).join("");
      if (atBottom || list.length) box.scrollTop = box.scrollHeight;
    }
    function renderCompose() {
      const area = $("#composeArea");
      if (!signedIn()) {
        area.innerHTML = `<div class="locked"><span>Sign in to send a message to a studio.</span><a class="btn small primary" href="#accountCard" id="goSignIn">Sign in</a></div>`;
        return;
      }
      const fav = S.mode === "local" && S.profile ? S.profile.studio : STUDIOS[0];
      area.innerHTML = `<form class="compose" id="composeForm">
          <label class="field">To<select id="composeTo">${STUDIOS.map((s) => `<option ${s === fav ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
          <label class="field">Message<textarea id="composeText" maxlength="2000" rows="2" placeholder="Write your question or idea…"></textarea></label>
          <button class="btn primary" type="submit">Send</button>
        </form><p class="form-status" id="composeStatus" role="status"></p>`;
    }
    body.addEventListener("click", (e) => {
      if (e.target.id === "goSignIn") { e.preventDefault(); const n = $("#loginName"); card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); if (n) n.focus({ preventScroll: true }); }
    });
    body.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && e.target.tagName === "TEXTAREA") { e.preventDefault(); e.target.form.requestSubmit(); }
    });
    body.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (e.target.id === "composeForm") return sendMember();
      if (e.target.id === "replyForm") return sendReply();
    });
    async function sendMember() {
      const ta = $("#composeText"), st = $("#composeStatus"), studio = $("#composeTo").value;
      const text = ta.value.trim().slice(0, 2000);
      if (!text) { st.textContent = "Write a message first."; st.className = "form-status err"; return; }
      const msg = { from: "member", studio, text, at: new Date().toISOString() };
      if (S.mode === "local") {
        S.local.push(msg);
        store.set(LOCAL_INBOX_KEY, S.local);
        ta.value = "";
        renderMemberMessages();
        st.textContent = "Saved in this browser. Open the published version of the site to reach " + studio + ".";
        st.className = "form-status ok";
        Points.award(5, "Message to " + studio, { bucket: "msg", dailyMax: 15 });
        return;
      }
      const btn = $("#composeForm button");
      btn.disabled = true;
      try {
        const uid = S.me.id;
        await S.db.collection(`inbox/${uid}/messages`).add(Object.assign({ author: uid }, msg));
        const ref = S.db.doc("inbox/" + uid);
        const meta = { lastAt: msg.at, lastText: text.slice(0, 120), lastStudio: studio, lastFrom: "member", needsReply: true };
        const snap = await ref.get();
        if (snap.exists) await ref.update(meta); else await ref.set(Object.assign({ memberUnread: 0, startedAt: msg.at }, meta));
        ta.value = "";
        st.textContent = "Sent to " + studio + ". Replies appear here.";
        st.className = "form-status ok";
        Points.award(5, "Message to " + studio, { bucket: "msg", dailyMax: 15 });
      } catch (err) {
        st.textContent = "Your message was not sent (" + ((err && err.code) || "error") + "). Check your connection and try again.";
        st.className = "form-status err";
      } finally { btn.disabled = false; }
    }

    /* ---- staff inbox (cloud, editors and owner) ---- */
    function staffLayout() {
      body.innerHTML = `<div class="staff"><div class="thread-list" id="threadList"></div><div class="staff-conv" id="staffConv"></div></div>`;
      S.layout = "staff";
    }
    function renderThreads() {
      const list = $("#threadList");
      if (!S.threads.length) { list.innerHTML = `<p class="res-empty">No conversations yet. When a member sends a message, it appears here.</p>`; return; }
      list.innerHTML = S.threads.map((t) => `<button class="thread-item" type="button" data-uid="${esc(t.id)}" aria-current="${t.id === S.open}">
          <span class="ti-top"><b data-name="${esc(t.id)}"></b><time>${esc(fmtTime(t.lastAt))}</time></span>
          <span class="pv"></span>${t.needsReply ? '<span class="needs">● needs reply</span>' : ""}</button>`).join("");
      $$(".thread-item", list).forEach((b, i) => {
        const t = S.threads[i];
        $("b", b).textContent = S.names[t.id] || "Member";
        $(".pv", b).textContent = (t.lastFrom === "member" ? "" : "You: ") + (t.lastText || "");
      });
    }
    function renderStaffConv() {
      const conv = $("#staffConv");
      if (!S.open) { conv.innerHTML = `<p class="res-empty">Choose a conversation to read it and reply as a studio.</p>`; return; }
      if (!$("#staffThread", conv)) {
        conv.innerHTML = `<div class="thread" id="staffThread"></div>
          <form class="compose" id="replyForm">
            <label class="field">Reply as<select id="replyAs">${STUDIOS.map((s) => `<option>${esc(s)}</option>`).join("")}</select></label>
            <label class="field">Reply<textarea id="replyText" maxlength="2000" rows="2" placeholder="Write a reply…"></textarea></label>
            <button class="btn primary" type="submit">Reply</button>
          </form><p class="form-status" id="replyStatus" role="status"></p>`;
      }
      const box = $("#staffThread");
      box.innerHTML = S.openMsgs.length ? S.openMsgs.map(msgHTML).join("") : `<p class="res-empty">Loading messages…</p>`;
      box.scrollTop = box.scrollHeight;
      const last = [...S.openMsgs].reverse().find((m) => m.from === "member");
      if (last && STUDIOS.includes(last.studio) && !$("#replyText").value) $("#replyAs").value = last.studio;
    }
    $("#inboxPanel").addEventListener("click", (e) => {
      const item = e.target.closest(".thread-item");
      if (!item || S.mode !== "cloud") return;
      openThread(item.dataset.uid);
    });
    function openThread(uid) {
      if (S.convUnsub) S.convUnsub();
      S.open = uid; S.openMsgs = [];
      $("#staffConv").innerHTML = "";
      renderThreads(); renderStaffConv();
      S.convUnsub = S.db.collection(`inbox/${uid}/messages`).orderBy("at", "asc").limit(500).onSnapshot((snap) => {
        S.openMsgs = snap.docs.map((d) => d.data() || {});
        renderStaffConv();
      }, (err) => { $("#staffThread").innerHTML = `<p class="res-empty">This conversation could not load (${esc((err && err.code) || "error")}).</p>`; });
    }
    async function sendReply() {
      const ta = $("#replyText"), st = $("#replyStatus"), studio = $("#replyAs").value, uid = S.open;
      const text = ta.value.trim().slice(0, 2000);
      if (!text) { st.textContent = "Write a reply first."; st.className = "form-status err"; return; }
      const btn = $("#replyForm button");
      btn.disabled = true;
      try {
        const at = new Date().toISOString();
        await S.db.collection(`inbox/${uid}/messages`).add({ from: "studio", studio, text, at, author: S.me.id });
        const ref = S.db.doc("inbox/" + uid);
        const snap = await ref.get();
        const unread = snap.exists ? Number((snap.data() || {}).memberUnread) || 0 : 0;
        await ref.update({ lastAt: at, lastText: text.slice(0, 120), lastStudio: studio, lastFrom: "studio", needsReply: false, memberUnread: unread + 1 });
        ta.value = "";
        st.textContent = "Reply sent as " + studio + ".";
        st.className = "form-status ok";
      } catch (err) {
        st.textContent = "The reply was not sent (" + ((err && err.code) || "error") + "). Try again.";
        st.className = "form-status err";
      } finally { btn.disabled = false; }
    }
    async function resolveNames(ids) {
      const missing = ids.filter((id) => !(id in S.names));
      if (!missing.length || !S.user) return;
      try {
        const ps = await S.user.profiles(missing);
        missing.forEach((id) => { S.names[id] = (ps && ps[id] && ps[id].name) || "Member"; });
        renderThreads();
      } catch (err) { /* names stay generic */ }
    }

    /* ---- orchestration ---- */
    function publishAcct() {
      if (S.mode === "cloud") Acct.set({ mode: "cloud", id: S.me.id, name: S.me.name || "", db: S.db, user: S.user, staff: S.staff });
      else Acct.set({ mode: "local", id: S.profile ? "local" : null, name: S.profile ? S.profile.name : "", db: null, user: null, staff: false });
    }
    function renderAll() {
      publishAcct();
      renderAccount();
      if (S.mode === "cloud" && S.staff) {
        titleEl.textContent = "Studio inbox";
        modeEl.textContent = "Shared · members see only their own messages";
        if (S.layout !== "staff") staffLayout();
        renderThreads(); renderStaffConv();
        setBadge(S.threads.filter((t) => t.needsReply).length);
      } else {
        titleEl.textContent = signedIn() ? "Your inbox" : "Inbox";
        modeEl.textContent = S.mode === "cloud" ? "Private · you and the studio staff" : "On this device";
        if (S.layout !== "member") memberLayout();
        renderMemberMessages(); renderCompose();
        setBadge(S.mode === "cloud" && S.thread ? Number(S.thread.memberUnread) || 0 : 0);
      }
    }
    function markRead() {
      if (S.mode !== "cloud" || S.staff || !S.thread || !(Number(S.thread.memberUnread) > 0)) return;
      const r = $("#inbox").getBoundingClientRect();
      if (r.top > innerHeight || r.bottom < 0 || document.hidden) return;
      S.db.doc("inbox/" + S.me.id).update({ memberUnread: 0 }).catch(() => {});
    }
    function subscribeCloud() {
      const fail = (what) => (err) => { modeEl.textContent = what + " could not load (" + ((err && err.code) || "error") + ")"; };
      if (S.staff) {
        S.unsubs.push(S.db.collection("inbox").orderBy("lastAt", "desc").limit(200).onSnapshot((snap) => {
          S.threads = snap.docs.map((d) => Object.assign({ id: d.id }, d.data() || {}));
          renderThreads();
          setBadge(S.threads.filter((t) => t.needsReply).length);
          resolveNames(S.threads.map((t) => t.id));
        }, fail("Conversations")));
        return;
      }
      const uid = S.me.id;
      S.unsubs.push(S.db.doc("inbox/" + uid).onSnapshot((snap) => {
        S.thread = snap.exists ? snap.data() : null;
        setBadge(S.thread ? Number(S.thread.memberUnread) || 0 : 0);
        markRead();
      }, fail("Inbox")));
      S.unsubs.push(S.db.collection(`inbox/${uid}/messages`).orderBy("at", "asc").limit(500).onSnapshot((snap) => {
        S.messages = snap.docs.map((d) => d.data() || {});
        renderMemberMessages();
      }, fail("Messages")));
    }
    window.addEventListener("scroll", () => { clearTimeout(S.readTimer); S.readTimer = setTimeout(markRead, 300); }, { passive: true });
    document.addEventListener("visibilitychange", markRead);

    renderAll();

    if (window.claude && typeof window.claude.use === "function") {
      Promise.all([window.claude.use("user"), window.claude.use("db")]).then(async ([u, d]) => {
        if (!u || !d) { S.cloudBlocked = true; renderAll(); return; }
        const me = await u.me();
        if (!me || !me.id) { S.cloudBlocked = true; renderAll(); return; }
        Object.assign(S, { mode: "cloud", user: u, db: d, me, staff: await u.canEdit(), layout: "" });
        renderAll();
        subscribeCloud();
      }).catch(() => {});
    }
  })();

  /* -------------------------------------------- points · security · founder */
  // Points: earned on quizzes, perfect worksheets, the survey, messages and Code Lab runs.
  // Security: every account can set a PIN and gets its own security key (letters + numbers).
  //   Both are stored only as salted PBKDF2 hashes, in the account's private storage.
  // Founder: claimed once with the BDAI founder code AND the 45-character founder key. The page
  //   holds only SHA-256 hashes of those, never the codes. The founder prize is 10,000 points.
  //   After setup, the founder console opens with the PIN alone.
  (function pointsSecurityFounder() {
    const FOUNDER_PRIZE = 10000;
    const FOUNDER_CODE_HASH = "5ee8789f4a3ec8040838d1157269deef9e74ccdba286458e00a4d772e2141c34";
    const FOUNDER_KEY_HASH = "27ae5cef1bf8895c949cb36c01d4e6fa67c2fc619ac1e769f726c4bb0f8c48ee";
    const PIN_ITER = 150000, MAX_FAILS = 5;
    const LEVELS = [[0, "Rookie"], [100, "Explorer"], [300, "Builder"], [750, "Scientist"], [1500, "Innovator"], [5000, "Master"], [15000, "Legend"]];
    const EARN = [["+10 / correct", "Quiz answer (300 a day)"], ["+10 + 2 each", "Perfect worksheet (200 a day)"], ["+25", "Survey response (once)"], ["+5", "Message a studio (15 a day)"], ["+1", "Code Lab run (20 a day)"], ["+10,000", "Founder prize (once)"]];
    const K = { points: "lab-points", security: "lab-security", founder: "lab-founder", locked: "lab-locked", fcUnlocked: "lab-founder-open" };
    const pointsCard = $("#pointsCard"), leaderList = $("#leaderList"), leaderMode = $("#leaderMode"), secCard = $("#securityCard"), fCard = $("#founderCard");
    const chipPts = $("#chipPts");

    const enc = new TextEncoder();
    const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
    const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
    const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
    async function pbkdf2(secret, salt, iter) {
      const k = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
      return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: iter }, k, 256));
    }
    function makeSecurityKey() {
      // 32 symbols, letters and numbers, no look-alikes (I, O, 0, 1). 256 is a multiple of 32: no bias.
      const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const raw = Array.from(bytes, (b) => A[b & 31]).join("");
      return raw.match(/.{4}/g).join("-");
    }
    const normKey = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const today = () => new Date().toISOString().slice(0, 10);
    const sget = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
    const sset = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { /* blocked */ } };
    const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }); };
    const fmtN = (n) => Number(n || 0).toLocaleString("en-US");
    const levelOf = (t) => { let i = 0; LEVELS.forEach(([min], j) => { if (t >= min) i = j; }); return i; };

    const P = { mine: null, sec: null, founder: null, leaders: [], names: {}, unsubs: [], queue: Promise.resolve(), warned: false, view: {} };
    const cloud = () => Acct.mode === "cloud" && Acct.db && Acct.id;
    const blankPoints = () => ({ total: 0, history: [], claims: {}, daily: { date: today(), buckets: {} }, founder: false, updatedAt: null });

    /* ---- storage ---- */
    async function readPoints(uid) {
      if (!cloud()) return Object.assign(blankPoints(), store.get(K.points, {}));
      const snap = await Acct.db.doc("points/" + (uid || Acct.id)).get();
      return Object.assign(blankPoints(), snap.exists ? JSON.parse(JSON.stringify(snap.data())) : {});
    }
    async function writePoints(doc, uid) {
      if (!cloud()) { store.set(K.points, doc); P.mine = doc; return; }
      await Acct.db.doc("points/" + (uid || Acct.id)).set(doc);
    }
    async function readSecurity() {
      if (!cloud()) return store.get(K.security, null);
      const snap = await Acct.db.doc(`data/users/${Acct.id}/security`).get();
      return snap.exists ? snap.data() : null;
    }
    async function writeSecurity(doc) {
      if (!cloud()) { store.set(K.security, doc); P.sec = doc; return; }
      await Acct.db.doc(`data/users/${Acct.id}/security`).set(doc);
      P.sec = doc;
    }
    async function readFounder() {
      if (!cloud()) return store.get(K.founder, null);
      const snap = await Acct.db.doc("founder/current").get();
      return snap.exists ? snap.data() : null;
    }

    /* ---- points ---- */
    function award(amount, reason, opts = {}) {
      if (!Acct.id) {
        if (!P.warned && !opts.quiet) { toast("Sign in to collect points"); P.warned = true; }
        return Promise.resolve(0);
      }
      P.queue = P.queue.then(async () => {
        const doc = await readPoints();
        if (!doc.daily || doc.daily.date !== today()) doc.daily = { date: today(), buckets: {} };
        if (opts.once && doc.claims[opts.once]) return 0;
        let amt = Math.round(amount);
        if (opts.bucket && opts.dailyMax) {
          const used = doc.daily.buckets[opts.bucket] || 0;
          amt = Math.max(0, Math.min(amt, opts.dailyMax - used));
          doc.daily.buckets[opts.bucket] = used + amt;
        }
        if (amt <= 0) return 0;
        if (opts.once) doc.claims[opts.once] = true;
        if (opts.founder) doc.founder = true;
        const at = new Date().toISOString();
        doc.total = (Number(doc.total) || 0) + amt;
        doc.history = [{ amt, reason: String(reason).slice(0, 80), at }].concat(doc.history || []).slice(0, 20);
        doc.updatedAt = at;
        await writePoints(doc);
        if (!cloud()) renderPoints();
        if (!opts.quiet) toast(`+${fmtN(amt)} points · ${reason}`);
        return amt;
      }).catch((err) => { if (!opts.quiet) toast("Points could not be saved (" + ((err && err.code) || "error") + ")"); return 0; });
      return P.queue;
    }
    Points.award = award;

    function renderPoints() {
      if (!Acct.id) {
        pointsCard.innerHTML = `<div class="card-head"><h3>Your points</h3></div><div class="locked"><span>Sign in to start collecting points.</span><a class="btn small primary" href="#inbox">Sign in</a></div>${earnHTML()}`;
        chipPts.hidden = true;
        return;
      }
      const d = P.mine || blankPoints(), t = Number(d.total) || 0, li = levelOf(t);
      const next = LEVELS[li + 1], cur = LEVELS[li];
      const pct = next ? Math.min(100, ((t - cur[0]) / (next[0] - cur[0])) * 100) : 100;
      pointsCard.innerHTML = `<div class="card-head"><h3>Your points</h3><span class="pill">${cloud() ? "Saved to your account" : "Saved on this device"}</span></div>
        <div class="pts-top"><div class="pts-total">${fmtN(t)}<small>pts</small></div>
          <div class="level-row"><span class="level">★ ${esc(cur[1])}</span>${d.founder ? '<span class="level founder">♛ Founder</span>' : ""}</div></div>
        <div class="progress"><span>${next ? `${fmtN(next[0] - t)} points to ${esc(next[1])}` : "Top level reached"}</span><span class="track"><i style="width:${pct.toFixed(1)}%"></i></span></div>
        <div><h4 style="font-size:0.95rem;margin-bottom:6px">Recent points</h4>${(d.history || []).length
          ? `<ul class="history">${d.history.map((h) => `<li><span class="amt ${h.amt < 0 ? "neg" : ""}">${h.amt > 0 ? "+" : ""}${fmtN(h.amt)}</span><span>${esc(h.reason)}</span><time>${esc(fmtDate(h.at))}</time></li>`).join("")}</ul>`
          : `<p class="res-empty">No points yet. Finish a quiz or a perfect worksheet to earn your first ones.</p>`}</div>
        ${earnHTML()}`;
      chipPts.hidden = false;
      chipPts.textContent = fmtN(t) + " pts";
      if (!cloud()) renderLeaders();
    }
    function earnHTML() {
      return `<div><h4 style="font-size:0.95rem;margin-bottom:6px">How to earn</h4><ul class="earn-list">${EARN.map(([a, b]) => `<li><b>${esc(a)}</b>${esc(b)}</li>`).join("")}</ul></div>`;
    }
    function renderLeaders() {
      leaderMode.textContent = cloud() ? "Everyone on this page" : "This device";
      let rows;
      if (cloud()) rows = P.leaders;
      else rows = Acct.id && P.mine ? [{ id: "local", total: P.mine.total, founder: P.mine.founder }] : [];
      if (!rows.length) { leaderList.innerHTML = `<li class="res-empty" style="display:block">No points yet. Be the first on the board.</li>`; return; }
      leaderList.innerHTML = rows.map((r) => `<li class="${r.id === Acct.id ? "me" : ""}"><span class="avatar" data-av="${esc(r.id)}"></span><span class="nm"></span><span class="pt">${fmtN(r.total)}</span></li>`).join("");
      $$("li", leaderList).forEach((li, i) => {
        const r = rows[i];
        const name = r.id === Acct.id ? (Acct.name || "You") + " (you)" : P.names[r.id] || "Member";
        $(".nm", li).textContent = name;
        if (r.founder) { const s = document.createElement("small"); s.textContent = "♛ founder"; $(".nm", li).appendChild(s); }
        $(".avatar", li).textContent = (name.match(/[A-Za-z0-9]/) || ["?"])[0].toUpperCase();
      });
    }
    async function resolveNames(ids) {
      const missing = ids.filter((id) => id !== Acct.id && !(id in P.names));
      if (!missing.length || !Acct.user) return;
      try {
        const ps = await Acct.user.profiles(missing);
        missing.forEach((id) => { P.names[id] = (ps && ps[id] && ps[id].name) || "Member"; });
        renderLeaders(); renderFounder();
      } catch (e) { /* keep generic names */ }
    }

    /* ---- lock ---- */
    function isLocked() { return !!(Acct.id && P.sec && sget(K.locked) === (Acct.id || "")); }
    function applyLock() {
      document.documentElement.classList.toggle("is-locked", isLocked());
    }
    async function checkPin(pin) {
      const sec = P.sec;
      if (!sec) return { ok: false, msg: "Set up a PIN first." };
      if ((sec.fails || 0) >= MAX_FAILS) return { ok: false, msg: "Too many wrong PINs. Use your security key to set a new PIN.", blocked: true };
      const ok = (await pbkdf2(pin, sec.pinSalt, sec.iter || PIN_ITER)) === sec.pinHash;
      const updated = Object.assign({}, sec, { fails: ok ? 0 : (sec.fails || 0) + 1 });
      if (ok !== true || sec.fails) await writeSecurity(updated);
      if (ok) return { ok: true };
      const left = MAX_FAILS - updated.fails;
      return { ok: false, msg: left > 0 ? `Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left before you need your security key.` : "Too many wrong PINs. Use your security key to set a new PIN.", blocked: left <= 0 };
    }
    $("#unlockForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const st = $("#unlockStatus"), inp = $("#unlockPin");
      st.textContent = "Checking…"; st.className = "form-status";
      const r = await checkPin(inp.value.trim());
      inp.value = "";
      if (r.ok) { sset(K.locked, null); applyLock(); st.textContent = ""; toast("Unlocked"); renderSecurity(); }
      else { st.textContent = r.msg; st.className = "form-status err"; if (r.blocked) { P.view.sec = "forgot"; renderSecurity(); } }
    });

    /* ---- security card ---- */
    const validPin = (p) => /^\d{4,8}$/.test(p);
    function renderSecurity() {
      const v = P.view.sec || "home";
      if (!Acct.id) {
        secCard.innerHTML = `<div class="card-head"><h3>PIN &amp; security key</h3></div><div class="locked"><span>Sign in first, then protect your account with a PIN.</span><a class="btn small primary" href="#inbox">Sign in</a></div>`;
        return;
      }
      const head = `<div class="card-head"><h3>PIN &amp; security key</h3><span class="sec-status"><span class="sec-dot ${P.sec ? "on" : ""}"></span>${P.sec ? "Protected" : "Not set up"}</span></div>`;
      if (v === "show-key") {
        secCard.innerHTML = head + `<p>This is your personal security key. It is different for every account. Write it down or store it in a password manager; you need it if you forget your PIN.</p>
          <div class="key-box" id="keyBox"></div>
          <div class="btn-row"><button class="btn small" type="button" data-sec="copy-key">Copy key</button></div>
          <p class="warn-note">The key is shown only now. The site keeps a one-way hash, so nobody can show it to you again.</p>
          <label class="check-row"><input type="checkbox" id="keySaved"><span>I have saved my security key somewhere safe.</span></label>
          <button class="btn primary" type="button" data-sec="done-key" disabled id="keyDone">Done</button>`;
        $("#keyBox").textContent = P.view.key;
        $("#keySaved").addEventListener("change", (e) => { $("#keyDone").disabled = !e.target.checked; });
        return;
      }
      if (!P.sec || v === "setup") {
        secCard.innerHTML = head + `<p class="account-note">Choose a 4–8 digit PIN. The site then creates your own security key from letters and numbers. ${cloud() ? "Both are stored as one-way hashes in your private account storage, which nobody else on this page can read." : "Both are stored as one-way hashes in this browser."}</p>
          <form id="secSetup" novalidate>
            <label class="field">New PIN<input type="password" id="secPin1" inputmode="numeric" maxlength="8" autocomplete="new-password"></label>
            <label class="field">Confirm PIN<input type="password" id="secPin2" inputmode="numeric" maxlength="8" autocomplete="new-password"></label>
            <button class="btn primary" type="submit">Set PIN and create security key</button>
            <p class="form-status" id="secStatus" role="status"></p>
          </form>`;
        return;
      }
      if (v === "change") {
        secCard.innerHTML = head + `<form id="secChange" novalidate>
            <label class="field">Current PIN<input type="password" id="secOld" inputmode="numeric" maxlength="8" autocomplete="current-password"></label>
            <label class="field">New PIN<input type="password" id="secNew1" inputmode="numeric" maxlength="8" autocomplete="new-password"></label>
            <label class="field">Confirm new PIN<input type="password" id="secNew2" inputmode="numeric" maxlength="8" autocomplete="new-password"></label>
            <div class="btn-row"><button class="btn primary" type="submit">Change PIN</button><button class="btn ghost" type="button" data-sec="home">Cancel</button></div>
            <p class="form-status" id="secStatus" role="status"></p></form>`;
        return;
      }
      if (v === "forgot") {
        secCard.innerHTML = head + `<p class="account-note">Enter your security key to choose a new PIN. Dashes and capital letters do not matter.</p><form id="secForgot" novalidate>
            <label class="field">Security key<input type="text" id="secKey" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"></label>
            <label class="field">New PIN<input type="password" id="secNew1" inputmode="numeric" maxlength="8" autocomplete="new-password"></label>
            <label class="field">Confirm new PIN<input type="password" id="secNew2" inputmode="numeric" maxlength="8" autocomplete="new-password"></label>
            <div class="btn-row"><button class="btn primary" type="submit">Reset PIN</button><button class="btn ghost" type="button" data-sec="home">Cancel</button></div>
            <p class="form-status" id="secStatus" role="status"></p></form>`;
        return;
      }
      if (v === "newkey") {
        secCard.innerHTML = head + `<p class="account-note">Enter your PIN to replace your security key. Your old key stops working.</p><form id="secNewKey" novalidate>
            <label class="field">PIN<input type="password" id="secOld" inputmode="numeric" maxlength="8" autocomplete="current-password"></label>
            <div class="btn-row"><button class="btn primary" type="submit">Create new key</button><button class="btn ghost" type="button" data-sec="home">Cancel</button></div>
            <p class="form-status" id="secStatus" role="status"></p></form>`;
        return;
      }
      secCard.innerHTML = head + `<p class="account-note">PIN set ${esc(fmtDate(P.sec.createdAt))}${P.sec.keyAt && P.sec.keyAt !== P.sec.createdAt ? ` · security key replaced ${esc(fmtDate(P.sec.keyAt))}` : ""}. Lock this device when you step away; your PIN unlocks it.</p>
        <div class="btn-row">
          <button class="btn small primary" type="button" data-sec="lock">🔒 Lock now</button>
          <button class="btn small" type="button" data-sec="change">Change PIN</button>
          <button class="btn small" type="button" data-sec="forgot">Forgot PIN?</button>
          <button class="btn small ghost" type="button" data-sec="newkey">New security key</button>
        </div>`;
    }
    function status(msg, ok) { const st = $("#secStatus"); if (st) { st.textContent = msg; st.className = "form-status " + (ok ? "ok" : "err"); } }
    async function setPinAndKey(pin, keepKey) {
      const now = new Date().toISOString();
      const doc = Object.assign({}, P.sec || {}, { pinSalt: randHex(16), iter: PIN_ITER, fails: 0, pinAt: now });
      doc.pinHash = await pbkdf2(pin, doc.pinSalt, PIN_ITER);
      let key = null;
      if (!keepKey) {
        key = makeSecurityKey();
        doc.keySalt = randHex(16);
        doc.keyHash = await pbkdf2(normKey(key), doc.keySalt, PIN_ITER);
        doc.keyAt = now;
      }
      if (!doc.createdAt) doc.createdAt = now;
      await writeSecurity(doc);
      return key;
    }
    secCard.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-sec]");
      if (!b) return;
      const a = b.dataset.sec;
      if (a === "copy-key") {
        try { await navigator.clipboard.writeText(P.view.key); toast("Security key copied"); }
        catch (err) { const r = document.createRange(); r.selectNodeContents($("#keyBox")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Key selected. Press Ctrl+C to copy."); }
        return;
      }
      if (a === "done-key") { P.view.key = null; P.view.sec = "home"; renderSecurity(); renderFounder(); return; }
      if (a === "lock") { sset(K.locked, Acct.id); sset(K.fcUnlocked, null); applyLock(); renderFounder(); $("#unlockForm").scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" }); toast("Locked. Enter your PIN to unlock."); return; }
      P.view.sec = a; renderSecurity();
      const first = $("input", secCard); if (first) first.focus();
    });
    secCard.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = e.target.id, btn = $("button[type=submit]", e.target);
      const v = (x) => ($("#" + x) ? $("#" + x).value.trim() : "");
      btn.disabled = true;
      try {
        if (id === "secSetup") {
          if (!validPin(v("secPin1"))) return status("Use 4 to 8 digits for your PIN.");
          if (v("secPin1") !== v("secPin2")) return status("The two PINs do not match.");
          status("Creating your security key…", true);
          P.view.key = await setPinAndKey(v("secPin1"));
          P.view.sec = "show-key"; renderSecurity();
        } else if (id === "secChange") {
          if (!validPin(v("secNew1"))) return status("Use 4 to 8 digits for the new PIN.");
          if (v("secNew1") !== v("secNew2")) return status("The new PINs do not match.");
          const r = await checkPin(v("secOld"));
          if (!r.ok) return status(r.msg);
          await setPinAndKey(v("secNew1"), true);
          P.view.sec = "home"; renderSecurity(); toast("PIN changed");
        } else if (id === "secForgot") {
          const key = normKey(v("secKey"));
          if (key.length !== 32) return status("A security key has 32 letters and numbers.");
          if (!validPin(v("secNew1"))) return status("Use 4 to 8 digits for the new PIN.");
          if (v("secNew1") !== v("secNew2")) return status("The new PINs do not match.");
          status("Checking your key…", true);
          if ((await pbkdf2(key, P.sec.keySalt, P.sec.iter || PIN_ITER)) !== P.sec.keyHash) return status("That security key does not match this account.");
          await setPinAndKey(v("secNew1"), true);
          sset(K.locked, null); applyLock();
          P.view.sec = "home"; renderSecurity(); renderFounder(); toast("New PIN set");
        } else if (id === "secNewKey") {
          const r = await checkPin(v("secOld"));
          if (!r.ok) return status(r.msg);
          const now = new Date().toISOString();
          const key = makeSecurityKey();
          const doc = Object.assign({}, P.sec, { keySalt: randHex(16), keyAt: now });
          doc.keyHash = await pbkdf2(normKey(key), doc.keySalt, doc.iter || PIN_ITER);
          await writeSecurity(doc);
          P.view.key = key; P.view.sec = "show-key"; renderSecurity();
        }
      } catch (err) {
        status("That did not save (" + ((err && err.code) || (err && err.message) || "error") + "). Try again.");
      } finally { if (btn.isConnected) btn.disabled = false; }
    });

    /* ---- founder card ---- */
    const isFounder = () => !!(P.founder && Acct.id && P.founder.uid === (cloud() ? Acct.id : "local"));
    function renderFounder() {
      const head = `<div class="card-head"><h3>Founder access · BDAI</h3>${P.founder ? '<span class="level founder">♛ set up</span>' : '<span class="pill">Not claimed</span>'}</div>`;
      if (!Acct.id) { fCard.innerHTML = head + `<div class="locked"><span>Sign in to set up or open founder access.</span><a class="btn small primary" href="#inbox">Sign in</a></div>`; return; }
      if (P.founder && !isFounder()) {
        fCard.innerHTML = head + `<div class="founder-badge"><span class="crown">♛</span><div><b id="fName"></b><div class="account-note">Founder since ${esc(fmtDate(P.founder.since))}</div></div></div><p class="account-note">Founder access is already set up for another account.</p>`;
        const fn = P.names[P.founder.uid];
        $("#fName").textContent = fn && fn !== "Member" ? fn : "The BDAI founder";
        return;
      }
      if (!P.founder) {
        if (!P.sec) { fCard.innerHTML = head + `<p class="account-note">Founder setup needs a PIN and security key on this account first. Set them up in the PIN &amp; security key card, then come back here.</p>`; return; }
        fCard.innerHTML = head + `<p class="account-note">Enter the BDAI founder code and the 45-character founder key. Both are checked against one-way hashes, so this page never contains them. The founder account receives the <b>${fmtN(FOUNDER_PRIZE)}-point founder prize</b>. After setup, you only need your PIN.</p>
          <form id="founderSetup" novalidate>
            <label class="field">Founder code<input type="password" id="fCode" autocomplete="off" spellcheck="false"></label>
            <label class="field">Founder key (45 letters and numbers)<input type="password" id="fKey" autocomplete="off" spellcheck="false" maxlength="60"></label>
            <button class="btn primary" type="submit">Set up founder account</button>
            <p class="form-status" id="fStatus" role="status"></p>
          </form>`;
        return;
      }
      if (sget(K.fcUnlocked) !== Acct.id) {
        fCard.innerHTML = head + `<div class="founder-badge"><span class="crown">♛</span><div><b>You are the founder</b><div class="account-note">Since ${esc(fmtDate(P.founder.since))}</div></div></div>
          <form id="founderPin" novalidate>
            <label class="field">PIN<input type="password" id="fPin" inputmode="numeric" maxlength="8" autocomplete="current-password"></label>
            <button class="btn primary" type="submit">Open founder console</button>
            <p class="form-status" id="fStatus" role="status"></p>
          </form>`;
        return;
      }
      const totalPts = cloud() ? P.leaders.reduce((a, r) => a + (Number(r.total) || 0), 0) : (P.mine ? P.mine.total : 0);
      const members = cloud() ? P.leaders.filter((r) => r.id !== Acct.id) : [];
      fCard.innerHTML = head + `<div class="founder-badge"><span class="crown">♛</span><div><b>Founder console</b><div class="account-note">Opened with your PIN · founder since ${esc(fmtDate(P.founder.since))}</div></div></div>
        <div class="stat-row"><div class="stat"><b>${fmtN(cloud() ? P.leaders.length : 1)}</b><span>accounts with points</span></div><div class="stat"><b>${fmtN(totalPts)}</b><span>points across the site</span></div><div class="stat"><b>${fmtN(FOUNDER_PRIZE)}</b><span>founder prize</span></div></div>
        ${cloud() ? (members.length ? `<form id="awardForm" novalidate>
            <label class="field">Award points to<select id="awardTo">${members.map((m) => `<option value="${esc(m.id)}" data-name="${esc(m.id)}"></option>`).join("")}</select></label>
            <label class="field">Points (−1,000 to 1,000)<input type="number" id="awardAmt" min="-1000" max="1000" step="1" value="50"></label>
            <label class="field">Reason<input type="text" id="awardWhy" maxlength="60" value="Founder award"></label>
            <button class="btn primary" type="submit">Award points</button>
            <p class="form-status" id="fStatus" role="status"></p></form>` : `<p class="res-empty">When members earn points, you can award them bonus points here.</p>`)
          : `<p class="account-note">This copy of the site runs without a server, so the console shows only this device. Open the published version to award points to members.</p>`}
        <div class="btn-row"><a class="btn small" href="#inbox">Open studio inbox</a><button class="btn small ghost" type="button" id="founderClose">Close console</button></div>`;
      $$("#awardTo option", fCard).forEach((o) => { o.textContent = (P.names[o.value] || "Member") + " · " + fmtN((P.leaders.find((r) => r.id === o.value) || {}).total) + " pts"; });
    }
    const fStatus = (msg, ok) => { const st = $("#fStatus"); if (st) { st.textContent = msg; st.className = "form-status " + (ok ? "ok" : "err"); } };
    fCard.addEventListener("click", (e) => { if (e.target.id === "founderClose") { sset(K.fcUnlocked, null); renderFounder(); } });
    fCard.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("button[type=submit]", e.target);
      btn.disabled = true;
      try {
        if (e.target.id === "founderSetup") {
          const code = $("#fCode").value.trim(), key = $("#fKey").value.trim();
          if (!code || !key) return fStatus("Enter both the founder code and the founder key.");
          fStatus("Checking…", true);
          const [hc, hk] = await Promise.all([sha256("bdai-founder-v1|code:" + code), sha256("bdai-founder-v1|key:" + key)]);
          if (hc !== FOUNDER_CODE_HASH || hk !== FOUNDER_KEY_HASH) { $("#fKey").value = ""; return fStatus("The founder code or key is not correct."); }
          const existing = await readFounder();
          if (existing) { P.founder = existing; renderFounder(); return; }
          const rec = { uid: cloud() ? Acct.id : "local", since: new Date().toISOString() };
          if (cloud()) {
            try { await Acct.db.doc("founder/current").set(rec); }
            catch (err) { return fStatus(err && (err.code === "not_granted" || err.code === "permission_denied") ? "Founder setup needs Editor access to this page. Ask the page owner to make you an Editor." : "Founder setup did not save (" + ((err && err.code) || "error") + ")."); }
          } else store.set(K.founder, rec);
          P.founder = rec;
          await award(FOUNDER_PRIZE, "BDAI founder prize", { once: "founderPrize", founder: true });
          sset(K.fcUnlocked, Acct.id);
          renderFounder();
          toast("Founder account set up · +10,000 points");
        } else if (e.target.id === "founderPin") {
          const r = await checkPin($("#fPin").value.trim());
          if (!r.ok) { $("#fPin").value = ""; fStatus(r.msg); if (r.blocked) { P.view.sec = "forgot"; renderSecurity(); } return; }
          sset(K.fcUnlocked, Acct.id);
          renderFounder();
        } else if (e.target.id === "awardForm") {
          const to = $("#awardTo").value, amt = Math.round(Number($("#awardAmt").value)), why = $("#awardWhy").value.trim() || "Founder award";
          if (!to || !Number.isFinite(amt) || !amt || Math.abs(amt) > 1000) return fStatus("Choose a member and an amount between −1,000 and 1,000 (not 0).");
          const doc = await readPoints(to);
          const at = new Date().toISOString();
          doc.total = Math.max(0, (Number(doc.total) || 0) + amt);
          doc.history = [{ amt, reason: why.slice(0, 60) + " (founder)", at }].concat(doc.history || []).slice(0, 20);
          doc.updatedAt = at;
          await writePoints(doc, to);
          fStatus(`${amt > 0 ? "Awarded" : "Removed"} ${fmtN(Math.abs(amt))} points.`, true);
        }
      } catch (err) {
        fStatus("That did not work (" + ((err && err.code) || (err && err.message) || "error") + ").");
      } finally { if (btn.isConnected) btn.disabled = false; }
    });

    /* ---- wiring ---- */
    function renderAllP() { renderPoints(); renderLeaders(); renderSecurity(); renderFounder(); applyLock(); }
    async function load() {
      P.unsubs.forEach((u) => { try { u(); } catch (e) { /* ignore */ } });
      P.unsubs = []; P.view = {};
      P.mine = null; P.sec = null; P.founder = null; P.leaders = [];
      if (!Acct.id) { renderAllP(); return; }
      try {
        if (cloud()) {
          const db = Acct.db;
          P.sec = await readSecurity().catch(() => null);
          P.unsubs.push(db.doc("points/" + Acct.id).onSnapshot((s) => { P.mine = Object.assign(blankPoints(), s.exists ? s.data() : {}); renderPoints(); renderLeaders(); }, () => {}));
          P.unsubs.push(db.collection("points").orderBy("total", "desc").limit(20).onSnapshot((s) => {
            P.leaders = s.docs.map((d) => ({ id: d.id, total: (d.data() || {}).total || 0, founder: !!(d.data() || {}).founder }));
            renderLeaders(); if (isFounder()) renderFounder();
            resolveNames(P.leaders.map((r) => r.id));
          }, () => { leaderMode.textContent = "Leaderboard unavailable"; }));
          P.unsubs.push(db.doc("founder/current").onSnapshot((s) => { P.founder = s.exists ? s.data() : null; if (P.founder) resolveNames([P.founder.uid]); renderFounder(); }, () => {}));
        } else {
          P.mine = Object.assign(blankPoints(), store.get(K.points, {}));
          P.sec = store.get(K.security, null);
          P.founder = store.get(K.founder, null);
        }
      } catch (err) { /* render what we have */ }
      renderAllP();
    }
    let lastKey = "";
    Acct.on(() => { const key = Acct.mode + ":" + Acct.id; if (key !== lastKey) { lastKey = key; load(); } });
    lastKey = Acct.mode + ":" + Acct.id;
    load();
  })();

})();
