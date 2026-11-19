/* =========================================================
   Databell · Technology, Engineered
   script-7.js
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    }
  };

  const escapeHTML = (str) => str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls = 'ic') => `<svg class="${cls}"><use href="#${id}"/></svg>`;

  /* ---------------- Toast ---------------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg, iconId = 'i-check') {
    toastEl.innerHTML = `${icon(iconId)}<span>${escapeHTML(msg)}</span>`;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3600);
  }

  /* ---------------- Preloader ---------------- */
  function runPreloader() {
    const pre = $('#preloader');
    const lines = $('#bootLines');
    const bar = $('#bootBar');
    if (!pre) return;
    document.body.classList.add('loading');
    const steps = ['Initialising Databell core', 'Mounting DatabellSoftwareLabs', 'Linking TechEnhance', 'Syncing TechKnowledge', 'All systems online'];
    let i = 0;
    const delay = reduceMotion ? 60 : 220;
    const tick = () => {
      if (i < steps.length) {
        const d = document.createElement('div');
        d.textContent = steps[i];
        lines.appendChild(d);
        i += 1;
        bar.style.width = `${(i / steps.length) * 100}%`;
        setTimeout(tick, delay);
      } else {
        setTimeout(() => {
          pre.classList.add('done');
          document.body.classList.remove('loading');
          initReveal();
          startHero();
        }, delay);
      }
    };
    tick();
  }

  /* ---------------- Theme ---------------- */
  function initTheme() {
    const btn = $('#themeToggle');
    const meta = $('meta[name="theme-color"]');
    const apply = (t) => {
      document.documentElement.dataset.theme = t;
      meta.setAttribute('content', t === 'light' ? '#f3f7ff' : '#040a17');
      btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    };
    apply(document.documentElement.dataset.theme || 'dark');
    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      apply(next);
      try { localStorage.setItem('databell-theme', next); } catch (e) { /* ignore */ }
    });
  }

  /* ---------------- Header, nav, progress ---------------- */
  function initHeader() {
    const header = $('#siteHeader');
    const nav = $('#mainNav');
    const menuBtn = $('#menuBtn');
    const progress = $('#scrollProgress');
    const toTop = $('#toTop');
    let lastY = window.scrollY;

    const closeMenu = () => {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.innerHTML = icon('i-menu');
    };
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.innerHTML = icon(open ? 'i-x' : 'i-menu');
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      header.classList.toggle('scrolled', y > 20);
      if (y > lastY + 4 && y > 600 && !nav.classList.contains('open')) header.classList.add('hide');
      else if (y < lastY - 4 || y < 600) header.classList.remove('hide');
      lastY = y;
      toTop.classList.toggle('show', y > 900);
      updateTimeline();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    // Scrollspy
    const links = $$('.main-nav a[href^="#"]');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => l.classList.remove('active'));
          const link = map.get(en.target.id);
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => spy.observe(s));
  }

  /* ---------------- Timeline fill ---------------- */
  const tlFill = $('#tlFill');
  const tlItems = $$('.tl-item');
  function updateTimeline() {
    if (!tlFill) return;
    const box = tlFill.parentElement.getBoundingClientRect();
    const mid = window.innerHeight * 0.6;
    const pct = Math.min(1, Math.max(0, (mid - box.top) / box.height));
    tlFill.style.height = `${pct * 100}%`;
    tlItems.forEach((it) => it.classList.toggle('lit', it.getBoundingClientRect().top < mid));
  }

  /* ---------------- Reveal & counters ---------------- */
  function animateCount(el) {
    const to = parseFloat(el.dataset.to);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reduceMotion) { el.textContent = fmt(to); return; }
    const dur = 1800;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt(to * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function initReveal() {
    // Stagger siblings that reveal together
    $$('.reveal').forEach((el) => {
      const parent = el.parentElement;
      const sibs = Array.from(parent.children).filter((c) => c.classList.contains('reveal'));
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.setProperty('--delay', `${Math.min(idx, 6) * 0.08}s`);
    });
    $$('.bar').forEach((b, i) => b.style.setProperty('--i', i));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add('in');
        // Once revealed, drop the reveal class so each card's own hover transitions take over
        if (el.classList.contains('reveal')) {
          const delay = parseFloat(getComputedStyle(el).getPropertyValue('--delay')) || 0;
          setTimeout(() => el.classList.remove('reveal'), 900 + delay * 1000);
        }
        $$('.count', el).forEach((c) => { if (!c.dataset.done) { c.dataset.done = '1'; animateCount(c); } });
        if (el.classList.contains('count') && !el.dataset.done) { el.dataset.done = '1'; animateCount(el); }
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    $$('.reveal, .compare, .chart').forEach((el) => io.observe(el));
    $$('.count').forEach((c) => { if (!c.closest('.reveal')) io.observe(c); });
  }

  /* ---------------- Hero: typewriter ---------------- */
  function initTypewriter() {
    const el = $('#typeWord');
    const words = ['smart software', 'cloud platforms', 'AI systems', 'secure stacks', 'skilled teams'];
    if (reduceMotion) return;
    let w = 0, c = words[0].length, deleting = true;
    const loop = () => {
      const word = words[w];
      if (deleting) {
        c -= 1;
        el.textContent = word.slice(0, c);
        if (c === 0) { deleting = false; w = (w + 1) % words.length; }
        setTimeout(loop, 40);
      } else {
        const next = words[w];
        c += 1;
        el.textContent = next.slice(0, c);
        if (c === next.length) { deleting = true; setTimeout(loop, 2200); } else { setTimeout(loop, 75); }
      }
    };
    setTimeout(loop, 2600);
  }

  /* ---------------- Hero: particle network ---------------- */
  function initNetwork() {
    const canvas = $('#netCanvas');
    const ctx = canvas.getContext('2d');
    const hero = $('#home');
    let w, h, dpr, nodes = [], running = true, raf;
    const mouse = { x: -9999, y: -9999 };

    const color = () => (document.documentElement.dataset.theme === 'light' ? '37, 99, 235' : '56, 189, 248');

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(110, (w * h) / 14000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 0.8
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const rgb = color();
      const maxD = 130;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!reduceMotion) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          const dx = mouse.x - n.x, dy = mouse.y - n.y;
          const md = Math.hypot(dx, dy);
          if (md < 180) { n.x += dx * 0.006; n.y += dy * 0.006; }
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d < maxD) {
            ctx.strokeStyle = `rgba(${rgb}, ${(1 - d / maxD) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
          }
        }
        const near = Math.hypot(mouse.x - n.x, mouse.y - n.y) < 180;
        ctx.fillStyle = `rgba(${rgb}, ${near ? 1 : 0.7})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, near ? n.r + 1 : n.r, 0, Math.PI * 2); ctx.fill();
      }
      // mouse links
      if (mouse.x > 0) {
        nodes.forEach((n) => {
          const d = Math.hypot(mouse.x - n.x, mouse.y - n.y);
          if (d < 180) {
            ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - d / 180) * 0.6})`;
            ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(n.x, n.y); ctx.stroke();
          }
        });
      }
      if (running && !reduceMotion) raf = requestAnimationFrame(draw);
    };

    resize();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduceMotion) draw(); }, 150); });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });
    new IntersectionObserver(([en]) => {
      const was = running;
      running = en.isIntersecting;
      if (running && !was && !reduceMotion) raf = requestAnimationFrame(draw);
      if (!running) cancelAnimationFrame(raf);
    }).observe(hero);
    // Redraw on theme change so the static (reduced-motion) frame updates too
    new MutationObserver(() => { if (reduceMotion) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    draw();
  }

  let heroStarted = false;
  function startHero() {
    if (heroStarted) return;
    heroStarted = true;
    initTypewriter();
  }

  /* ---------------- Cursor glow, tilt, magnetic ---------------- */
  function initPointerFX() {
    if (!finePointer || reduceMotion) return;
    const glow = $('#cursorGlow');
    let tx = 0, ty = 0, x = 0, y = 0;
    window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; glow.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
    const follow = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      glow.style.transform = `translate(${x - 210}px, ${y - 210}px)`;
      requestAnimationFrame(follow);
    };
    follow();

    $$('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg) translateY(-4px)`;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.18}px, ${dy * 0.25}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------------- Labs: terminal ---------------- */
  function initTerminal() {
    const body = $('#termBody');
    const script = [
      ['p', '$ ', 'labs deploy nova-platform --env=prod'],
      ['dim', '', '→ Resolving 214 packages…'],
      ['ok', '✔ ', 'Lint & type-check passed (0 errors)'],
      ['ok', '✔ ', 'Unit tests: 1,842 passed · coverage 94.6%'],
      ['ok', '✔ ', 'Security scan: no critical findings'],
      ['warn', '⚠ ', '2 dependencies have minor updates available'],
      ['dim', '', '→ Building containers [api, web, worker]'],
      ['ok', '✔ ', 'Images pushed to registry (sha256:9f3c…a71e)'],
      ['dim', '', '→ Rolling out to 3 regions · canary 10% → 100%'],
      ['ok', '✔ ', 'Health checks green · p95 latency 42ms'],
      ['p', '★ ', 'Deployed nova-platform v4.12.0 in 3m 18s']
    ];
    let started = false;

    const render = (lines, partial) => {
      body.innerHTML = lines.map(([cls, pre, txt]) => `<span class="${cls}">${escapeHTML(pre)}</span>${escapeHTML(txt)}`).join('\n')
        + (partial !== undefined ? (lines.length ? '\n' : '') + partial : '') + '<span class="cur"></span>';
    };

    const play = () => {
      const done = [];
      let li = 0;
      const nextLine = () => {
        if (li >= script.length) {
          render(done);
          setTimeout(() => { body.innerHTML = ''; play(); }, 6000);
          return;
        }
        const [cls, pre, txt] = script[li];
        if (li === 0) {
          let ci = 0;
          const typeCmd = () => {
            ci += 1;
            render(done, `<span class="${cls}">${escapeHTML(pre)}</span>${escapeHTML(txt.slice(0, ci))}`);
            if (ci < txt.length) setTimeout(typeCmd, 38);
            else { done.push(script[li]); li += 1; setTimeout(nextLine, 400); }
          };
          typeCmd();
        } else {
          done.push(script[li]); li += 1;
          render(done);
          setTimeout(nextLine, 380 + Math.random() * 380);
        }
      };
      nextLine();
    };

    if (reduceMotion) { render(script); return; }
    new IntersectionObserver(([en], obs) => {
      if (en.isIntersecting && !started) { started = true; play(); obs.disconnect(); }
    }, { threshold: 0.3 }).observe(body);
  }

  /* ---------------- Labs: pipeline ---------------- */
  function initPipeline() {
    const pl = $('#pipeline');
    const steps = $$('.pl-step', pl);
    let tick = 0, timer;
    const set = (n) => {
      steps.forEach((s, k) => s.classList.toggle('on', k <= n));
      pl.style.setProperty('--prog', n / (steps.length - 1));
    };
    if (reduceMotion) { set(steps.length - 1); return; }
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !timer) {
        timer = setInterval(() => {
          set(Math.min(tick, steps.length - 1)); // the last step holds for a few ticks before restarting
          tick = (tick + 1) % (steps.length + 3);
        }, 700);
      } else if (!en.isIntersecting && timer) { clearInterval(timer); timer = null; }
    }, { threshold: 0.4 }).observe(pl);
  }

  /* ---------------- Range fill helper ---------------- */
  function paintRange(r) {
    const pct = ((r.value - r.min) / (r.max - r.min)) * 100;
    r.style.setProperty('--fill', `${pct}%`);
  }

  /* ---------------- Enhance: compare slider ---------------- */
  function initCompare() {
    const box = $('#compare');
    const range = $('#compareRange');
    const set = () => box.style.setProperty('--pos', `${range.value}%`);
    range.addEventListener('input', set);
    set();
    // Gentle intro sweep when it first appears
    if (!reduceMotion) {
      new IntersectionObserver(([en], obs) => {
        if (!en.isIntersecting) return;
        obs.disconnect();
        const start = performance.now();
        const sweep = (now) => {
          const t = Math.min(1, (now - start) / 1600);
          range.value = 50 + Math.sin(t * Math.PI * 2) * 30 * (1 - t);
          set();
          if (t < 1) requestAnimationFrame(sweep);
        };
        setTimeout(() => requestAnimationFrame(sweep), 600);
      }, { threshold: 0.5 }).observe(box);
    }
  }

  /* ---------------- Enhance: savings calculator ---------------- */
  function initCalc() {
    const spend = $('#spend'), eng = $('#eng'), age = $('#age');
    const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
    const update = () => {
      [spend, eng, age].forEach(paintRange);
      const s = +spend.value, e = +eng.value, a = +age.value;
      $('#spendOut').textContent = money(s);
      $('#engOut').textContent = e;
      $('#ageOut').textContent = `${a} year${a === 1 ? '' : 's'}`;
      const rate = Math.min(0.55, 0.22 + a * 0.012);
      const yearly = s * 12 * rate;
      const hours = Math.round(e * (6 + a * 0.6));
      const engagement = 30000 + s * 0.9 + e * 1200;
      const payback = Math.max(1, Math.ceil(engagement / (yearly / 12)));
      $('#saveOut').textContent = money(yearly);
      $('#hoursOut').textContent = hours.toLocaleString('en-US');
      $('#paybackOut').textContent = `${payback} mo`;
    };
    [spend, eng, age].forEach((r) => r.addEventListener('input', update));
    update();
  }

  /* ---------------- Knowledge: courses ---------------- */
  const COURSES = [
    { cat: 'ai', icon: 'i-brain', title: 'Applied Machine Learning', level: 'Intermediate', hours: 32, lessons: 48, rating: 4.9, pop: 92, desc: 'Train, evaluate and deploy models with Python, scikit-learn and PyTorch.' },
    { cat: 'ai', icon: 'i-cpu', title: 'Building with LLMs', level: 'Advanced', hours: 24, lessons: 30, rating: 4.8, pop: 96, desc: 'Retrieval, agents, evaluation and safe deployment of language-model apps.' },
    { cat: 'ai', icon: 'i-data', title: 'Data Engineering Foundations', level: 'Beginner', hours: 20, lessons: 26, rating: 4.7, pop: 78, desc: 'SQL, pipelines, warehouses and the modern data stack from first principles.' },
    { cat: 'cloud', icon: 'i-cloud', title: 'Cloud Architecture Pro', level: 'Advanced', hours: 40, lessons: 52, rating: 4.9, pop: 88, desc: 'Design resilient, cost-aware systems across AWS, Azure and GCP.' },
    { cat: 'cloud', icon: 'i-layers', title: 'Kubernetes in Production', level: 'Intermediate', hours: 28, lessons: 36, rating: 4.8, pop: 84, desc: 'Clusters, Helm, autoscaling and observability you can actually operate.' },
    { cat: 'cloud', icon: 'i-gear', title: 'DevOps & CI/CD', level: 'Beginner', hours: 18, lessons: 22, rating: 4.6, pop: 74, desc: 'Automate builds, tests and releases with GitHub Actions and Terraform.' },
    { cat: 'dev', icon: 'i-code', title: 'Modern TypeScript', level: 'Beginner', hours: 16, lessons: 24, rating: 4.8, pop: 81, desc: 'Types, generics and patterns for maintainable front-end and Node code.' },
    { cat: 'dev', icon: 'i-mobile', title: 'Cross-platform Mobile', level: 'Intermediate', hours: 30, lessons: 40, rating: 4.7, pop: 69, desc: 'Ship iOS and Android apps from one codebase with offline sync.' },
    { cat: 'sec', icon: 'i-shield', title: 'Zero-Trust Security', level: 'Intermediate', hours: 22, lessons: 28, rating: 4.9, pop: 77, desc: 'Identity, secrets, network policy and threat modelling for engineers.' },
    { cat: 'sec', icon: 'i-terminal', title: 'Secure Coding Lab', level: 'Beginner', hours: 12, lessons: 18, rating: 4.7, pop: 65, desc: 'Find and fix the OWASP Top 10 in real code, hands-on.' }
  ];

  function initCourses() {
    const grid = $('#courseGrid');
    const enrolled = new Set(store.get('databell-enrolled', []));
    const render = (filter) => {
      const list = COURSES.filter((c) => filter === 'all' || c.cat === filter);
      grid.innerHTML = list.map((c, i) => {
        const on = enrolled.has(c.title);
        return `<article class="course" style="--i:${i}">
          <div class="course-top"><span class="course-icon">${icon(c.icon)}</span><span class="level">${c.level}</span></div>
          <h4>${escapeHTML(c.title)}</h4>
          <p>${escapeHTML(c.desc)}</p>
          <div class="course-meta"><span>${icon('i-clock')} ${c.hours}h</span><span>${icon('i-book')} ${c.lessons} lessons</span><span>${icon('i-star')} ${c.rating}</span></div>
          <div class="course-bar" title="Popularity ${c.pop}%"><i style="--p:${c.pop}%"></i></div>
          <button class="enroll${on ? ' done' : ''}" data-title="${escapeHTML(c.title)}" aria-pressed="${on}">${on ? icon('i-check') + ' Enrolled' : 'Enroll free ' + icon('i-arrow')}</button>
        </article>`;
      }).join('');
    };
    render('all');

    $$('.chip-btn').forEach((btn) => btn.addEventListener('click', () => {
      $$('.chip-btn').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      render(btn.dataset.filter);
    }));

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.enroll');
      if (!btn) return;
      const t = btn.dataset.title;
      if (enrolled.has(t)) { enrolled.delete(t); toast(`Left “${t}”`, 'i-x'); } else { enrolled.add(t); toast(`Enrolled in “${t}”`); }
      store.set('databell-enrolled', [...enrolled]);
      const on = enrolled.has(t);
      btn.classList.toggle('done', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.innerHTML = on ? icon('i-check') + ' Enrolled' : 'Enroll free ' + icon('i-arrow');
    });
  }

  /* ---------------- Knowledge: knowledge base ---------------- */
  const ARTICLES = [
    { tag: 'Cloud', icon: 'i-layers', title: 'Kubernetes explained in 5 minutes', mins: 5,
      body: '<p>Kubernetes is a system that runs your containers across a group of machines and keeps them in the state you asked for. You describe what you want — say, three copies of an API — and it schedules, restarts and scales them for you.</p><p>The core objects are <code>Pods</code> (one or more containers), <code>Deployments</code> (how many Pods and which version) and <code>Services</code> (a stable address in front of the Pods).</p><p>TechEnhance tip: start with managed Kubernetes (EKS, AKS or GKE) unless you have a team dedicated to running the control plane.</p>' },
    { tag: 'AI', icon: 'i-brain', title: 'What is a vector database?', mins: 6,
      body: '<p>A vector database stores numbers that represent meaning — embeddings — and finds the ones closest to a query. It is how an AI assistant retrieves the right paragraph from thousands of documents.</p><p>Text is turned into a vector by an embedding model, stored with its source, and searched with distance measures such as cosine similarity.</p><p>DatabellSoftwareLabs uses this pattern, called retrieval-augmented generation, in most of the assistants it builds.</p>' },
    { tag: 'Security', icon: 'i-shield', title: 'Zero trust without the buzzwords', mins: 7,
      body: '<p>Zero trust means no request is trusted because of where it comes from. Every call is authenticated, authorised and encrypted, even inside your own network.</p><p>In practice: strong identity for people and services, short-lived credentials, least-privilege policies and logging everything.</p>' },
    { tag: 'DevOps', icon: 'i-gear', title: 'CI/CD pipelines that don’t break', mins: 6,
      body: '<p>A good pipeline is fast, deterministic and boring. Cache dependencies, run tests in parallel, and make every build reproducible from a commit hash.</p><p>Deploy behind feature flags and use canary releases so a bad change reaches 5% of users, not all of them.</p>' },
    { tag: 'Data', icon: 'i-data', title: 'Data lake vs. warehouse vs. lakehouse', mins: 8,
      body: '<p>A <code>warehouse</code> stores cleaned, structured data for reporting. A <code>lake</code> stores raw files of any shape cheaply. A <code>lakehouse</code> adds table formats and transactions on top of a lake, so you get both.</p><p>Pick based on who queries the data and how fresh it needs to be, not on vendor marketing.</p>' },
    { tag: 'Cloud', icon: 'i-cloud', title: 'Five quick wins to cut your cloud bill', mins: 4,
      body: '<p>1. Delete idle resources. 2. Right-size over-provisioned instances. 3. Buy savings plans for steady workloads. 4. Move cold data to cheaper storage tiers. 5. Turn off non-production environments at night.</p><p>These five steps alone typically save TechEnhance clients 20–35%.</p>' },
    { tag: 'Dev', icon: 'i-code', title: 'Monolith to microservices, safely', mins: 9,
      body: '<p>The strangler pattern lets you replace a monolith one slice at a time. Route a single feature to a new service, verify it with real traffic, then move on.</p><p>Don’t split by technical layer — split by business capability, and keep the data each service owns inside that service.</p>' },
    { tag: 'AI', icon: 'i-cpu', title: 'Evaluating LLM apps in production', mins: 7,
      body: '<p>Language-model apps need tests just like any other code. Build a set of real examples with expected outcomes, score every change against it, and track the score over time.</p><p>Combine automatic checks (format, factual grounding) with periodic human review for tone and usefulness.</p>' }
  ];

  function initKB() {
    const list = $('#kbList');
    const input = $('#kbSearch');
    const empty = $('#kbEmpty');

    const highlight = (text, q) => {
      const safe = escapeHTML(text);
      if (!q) return safe;
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
      return safe.replace(re, '<mark>$1</mark>');
    };

    const render = () => {
      const q = input.value.trim();
      const ql = q.toLowerCase();
      const hits = ARTICLES.map((a, i) => ({ a, i })).filter(({ a }) =>
        !ql || a.title.toLowerCase().includes(ql) || a.tag.toLowerCase().includes(ql) || a.body.replace(/<[^>]+>/g, '').toLowerCase().includes(ql));
      list.innerHTML = hits.map(({ a, i }) => `<li><button class="kb-item" data-i="${i}">${icon(a.icon)}<span><b>${highlight(a.title, q)}</b><small>${escapeHTML(a.tag)} · ${a.mins} min read</small></span>${icon('i-right')}</button></li>`).join('');
      empty.hidden = hits.length > 0;
    };
    input.addEventListener('input', render);
    render();

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.kb-item');
      if (btn) openArticle(ARTICLES[+btn.dataset.i], btn);
    });
  }

  /* ---------------- Modal ---------------- */
  const modal = $('#modal');
  let lastFocus = null;
  function openArticle(a, trigger) {
    lastFocus = trigger;
    $('#modalTag').textContent = a.tag;
    $('#modalTitle').textContent = a.title;
    $('#modalMeta').textContent = `TechKnowledge · ${a.mins} min read`;
    $('#modalBody').innerHTML = a.body; // trusted static content defined above
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal-close', modal).focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      const f = $$('button, a[href], input', modal).filter((el) => !el.disabled);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------- Knowledge: quiz ---------------- */
  const QUIZ = [
    { q: 'Which protocol secures traffic between your browser and a website?', o: ['FTP', 'TLS', 'SMTP', 'UDP'], a: 1 },
    { q: 'In Kubernetes, what keeps a set number of Pod replicas running?', o: ['A Service', 'An Ingress', 'A Deployment', 'A ConfigMap'], a: 2 },
    { q: 'What does an embedding model produce from a piece of text?', o: ['A vector of numbers', 'A SQL query', 'A compressed ZIP', 'A hash for passwords'], a: 0 },
    { q: 'Which release strategy sends a new version to a small share of users first?', o: ['Big bang', 'Blue/green only', 'Canary', 'Hotfix'], a: 2 },
    { q: 'What does “least privilege” mean in security?', o: ['Admins get all rights', 'Grant only the access needed', 'Disable all logging', 'Share one account'], a: 1 }
  ];

  function initQuiz() {
    const qEl = $('#quizQ'), opts = $('#quizOpts'), next = $('#quizNext'), meta = $('#quizMeta'), bar = $('#quizBar');
    let idx = 0, score = 0;
    const best = () => store.get('databell-quiz-best', 0);

    const show = () => {
      const item = QUIZ[idx];
      qEl.textContent = item.q;
      opts.innerHTML = item.o.map((o, i) => `<button class="quiz-opt" data-i="${i}">${escapeHTML(o)}</button>`).join('');
      next.disabled = true;
      next.textContent = idx === QUIZ.length - 1 ? 'See result' : 'Next';
      meta.textContent = `Question ${idx + 1} of ${QUIZ.length} · Score ${score}`;
      bar.style.width = `${(idx / QUIZ.length) * 100}%`;
    };

    const finish = () => {
      bar.style.width = '100%';
      const prev = best();
      if (score > prev) store.set('databell-quiz-best', score);
      const msg = score === QUIZ.length ? 'Perfect — you’re ready for an advanced track.' : score >= 3 ? 'Solid! An intermediate track would suit you.' : 'Great start — try a beginner track.';
      qEl.textContent = '';
      opts.innerHTML = `<div class="quiz-result"><span class="score grad-text">${score}/${QUIZ.length}</span><p>${msg}</p></div>`;
      meta.textContent = `Best score: ${Math.max(prev, score)}/${QUIZ.length}`;
      next.disabled = false;
      next.textContent = 'Try again';
      idx = -1;
    };

    opts.addEventListener('click', (e) => {
      const btn = e.target.closest('.quiz-opt');
      if (!btn || idx < 0) return;
      const choice = +btn.dataset.i;
      const right = QUIZ[idx].a;
      $$('.quiz-opt', opts).forEach((b, i) => {
        b.disabled = true;
        if (i === right) b.classList.add('right');
      });
      if (choice === right) score += 1; else btn.classList.add('wrong');
      meta.textContent = `Question ${idx + 1} of ${QUIZ.length} · Score ${score}`;
      next.disabled = false;
    });

    next.addEventListener('click', () => {
      if (idx === -1) { idx = 0; score = 0; show(); return; }
      if (idx === QUIZ.length - 1) { finish(); return; }
      idx += 1;
      show();
    });
    show();
  }

  /* ---------------- Carousel ---------------- */
  function initCarousel() {
    const root = $('#carousel');
    const track = $('#carouselTrack');
    const slides = $$('.slide', track);
    const dots = $('#dots');
    let i = 0, timer;

    dots.innerHTML = slides.map((_, k) => `<button aria-label="Go to story ${k + 1}"></button>`).join('');
    const dotBtns = $$('button', dots);

    const go = (n) => {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      dotBtns.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i)));
    };
    const play = () => { if (!reduceMotion) { clearInterval(timer); timer = setInterval(() => go(i + 1), 6000); } };
    const stop = () => clearInterval(timer);

    dotBtns.forEach((d, k) => d.addEventListener('click', () => { go(k); play(); }));
    $('#prevSlide').addEventListener('click', () => { go(i - 1); play(); });
    $('#nextSlide').addEventListener('click', () => { go(i + 1); play(); });
    root.addEventListener('pointerenter', stop);
    root.addEventListener('pointerleave', play);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', play);

    // Swipe
    let sx = null;
    track.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    track.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 50) { go(i + (dx < 0 ? 1 : -1)); play(); }
      sx = null;
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { go(i - 1); play(); }
      if (e.key === 'ArrowRight') { go(i + 1); play(); }
    });

    go(0);
    play();
  }

  /* ---------------- Pricing ---------------- */
  function initPricing() {
    const sw = $('#billSwitch');
    const amts = $$('.amt[data-m]');
    sw.addEventListener('click', () => {
      const annual = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(annual));
      $('#billMonthly').classList.toggle('on', !annual);
      $('#billAnnual').classList.toggle('on', annual);
      amts.forEach((a) => {
        a.classList.remove('flip');
        void a.offsetWidth; // restart animation
        a.textContent = annual ? a.dataset.y : a.dataset.m;
        a.classList.add('flip');
      });
    });

    const planToDivision = { Learn: 'TechKnowledge', Enhance: 'TechEnhance', Build: 'DatabellSoftwareLabs' };
    $$('[data-plan]').forEach((btn) => btn.addEventListener('click', () => {
      const sel = $('#divisionSelect');
      sel.value = planToDivision[btn.dataset.plan] || '';
      const msg = $('#contactForm textarea');
      if (!msg.value) msg.value = `I'm interested in the ${btn.dataset.plan} plan.`;
    }));
  }

  /* ---------------- Forms ---------------- */
  function initForms() {
    const form = $('#contactForm');
    const emailOK = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    const validateField = (el) => {
      const wrap = el.closest('.field, .check');
      let ok = true;
      if (el.type === 'checkbox') ok = el.checked;
      else if (el.type === 'email') ok = emailOK(el.value.trim());
      else if (el.required) ok = el.value.trim().length >= (el.minLength > 0 ? el.minLength : 1);
      if (wrap) wrap.classList.toggle('invalid', !ok);
      return ok;
    };

    const fields = $$('[required]', form);
    fields.forEach((el) => {
      el.addEventListener('blur', () => validateField(el));
      el.addEventListener('input', () => { if (el.closest('.invalid')) validateField(el); });
      el.addEventListener('change', () => { if (el.closest('.invalid')) validateField(el); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const results = fields.map(validateField);
      if (results.includes(false)) {
        const firstBad = fields[results.indexOf(false)];
        firstBad.focus();
        toast('Please check the highlighted fields.', 'i-x');
        return;
      }
      const btn = $('#submitBtn');
      const label = $('span', btn);
      btn.disabled = true;
      btn.classList.add('sending');
      label.textContent = 'Sending';
      const data = Object.fromEntries(new FormData(form));
      setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('sending');
        label.textContent = 'Send message';
        form.reset();
        form.classList.add('sent');
        setTimeout(() => form.classList.remove('sent'), 900);
        toast(`Thanks ${data.name.split(' ')[0]}! The ${data.division} team will reply within one business day.`);
      }, 1200);
    });

    const news = $('#newsletter');
    news.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('input', news);
      if (!emailOK(input.value.trim())) { toast('Please enter a valid email address.', 'i-x'); input.focus(); return; }
      input.value = '';
      toast('Subscribed to the Databell tech digest.');
    });
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    $('#year').textContent = new Date().getFullYear();
    initTheme();
    initHeader();
    initNetwork();
    initPointerFX();
    initTerminal();
    initPipeline();
    initCompare();
    initCalc();
    initCourses();
    initKB();
    initQuiz();
    initCarousel();
    initPricing();
    initForms();
    runPreloader();
  });
})();
