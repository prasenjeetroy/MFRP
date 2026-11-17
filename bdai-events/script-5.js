/* ==========================================================
   BDAI Events — script-5.js
   Vanilla JS: data, rendering, filters, modal registration,
   agenda builder, animations and micro-interactions.
   Needs account-5.js to be loaded first (shared helpers,
   accounts, inbox, theme, toasts and the mobile menu).
   ========================================================== */
(() => {
  "use strict";

  /* ---------------------------------------------------------
     Shared helpers (from account-5.js)
     --------------------------------------------------------- */
  const { $, $$, escapeHTML, store, toast, prefersReducedMotion, account, inbox, userKey, onChange, openAuth } = window.BDAI;
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
