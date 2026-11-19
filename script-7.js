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

  /* =========================================================
     DATABELL PLATFORM
     Databell ID (PIN + security key + inbox recovery), Databell Inbox,
     Databell Store, checkout, orders and command palette.
     Everything runs in the browser and is saved in localStorage.
     ========================================================= */

  /* ---------- SHA-256 (pure JS, so it also works outside secure contexts) ---------- */
  const sha256 = (() => {
    const primes = [];
    for (let n = 2; primes.length < 64; n++) if (primes.every((p) => n % p)) primes.push(n);
    const frac = (x) => ((x - Math.floor(x)) * 4294967296) >>> 0;
    const K = primes.map((p) => frac(Math.cbrt(p)));
    const H0 = primes.slice(0, 8).map((p) => frac(Math.sqrt(p)));
    const ror = (x, n) => (x >>> n) | (x << (32 - n));
    const enc = new TextEncoder();
    return (msg) => {
      const bytes = enc.encode(msg);
      const len = bytes.length;
      const total = ((len + 9 + 63) >> 6) << 6;
      const buf = new Uint8Array(total);
      buf.set(bytes);
      buf[len] = 0x80;
      const dv = new DataView(buf.buffer);
      dv.setUint32(total - 4, (len * 8) >>> 0);
      dv.setUint32(total - 8, Math.floor((len * 8) / 4294967296));
      const h = H0.slice();
      const w = new Uint32Array(64);
      for (let off = 0; off < total; off += 64) {
        for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
        for (let i = 16; i < 64; i++) {
          const a = w[i - 15], b = w[i - 2];
          w[i] = (w[i - 16] + (ror(a, 7) ^ ror(a, 18) ^ (a >>> 3)) + w[i - 7] + (ror(b, 17) ^ ror(b, 19) ^ (b >>> 10))) | 0;
        }
        let [a, b, c, d, e, f, g, hh] = h;
        for (let i = 0; i < 64; i++) {
          const t1 = (hh + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
          const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
          hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        [a, b, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) | 0; });
      }
      return h.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
    };
  })();

  // Salted, stretched hash for PINs, keys and codes (the secrets themselves are never stored)
  const hashSecret = (secret, salt) => {
    let h = sha256(`${salt}|${secret}`);
    for (let i = 0; i < 1200; i++) h = sha256(h + salt);
    return h;
  };
  const randWords = (n) => {
    const a = new Uint32Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 4294967296);
    return a;
  };
  const randomFrom = (alphabet, len) => Array.from(randWords(len), (x) => alphabet[x % alphabet.length]).join('');
  const KEY_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const genKey = () => 'DBSK-' + [0, 1, 2, 3].map(() => randomFrom(KEY_ALPHA, 4)).join('-');
  const genCode = () => randomFrom('0123456789', 6);
  const canonKey = (input) => {
    let s = String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.length === 20 && s.startsWith('DBSK')) s = s.slice(4);
    return s;
  };
  const shuffle = (arr) => { const r = randWords(arr.length); for (let i = arr.length - 1; i > 0; i--) { const j = r[i] % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const uid = () => Date.now().toString(36) + randomFrom(ALNUM, 6);

  /* ---------- Persistent state ---------- */
  const DB_KEY = 'databell-platform-v1';
  const db = (() => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    return Object.assign({ accounts: {}, inbox: {}, session: null, cart: [], coupon: null, stock: {}, wishlist: [], recent: [], prefs: { scramble: false } }, d);
  })();
  let storageWarned = false;
  const saveDB = () => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) { if (!storageWarned) { storageWarned = true; toast('Browser storage is unavailable — changes last until you close this tab.', 'i-alert'); } }
  };
  if (db.session && !db.accounts[db.session.email]) db.session = null;
  if (db.session) db.session.locked = true; // returning visitors unlock with their PIN

  /* ---------- Formatting ---------- */
  const esc = escapeHTML;
  const round2 = (v) => Math.round(v * 100) / 100;
  const money = (v) => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money0 = (v) => '$' + Math.round(v).toLocaleString('en-US');
  const fmtDate = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const ago = (t) => {
    const s = (Date.now() - t) / 1000;
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const initials = (a) => ((a.first[0] || '') + (a.last[0] || '')).toUpperCase();
  const avatar = (a, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(a))}</span>`;
  const maskKey = (hint) => `DBSK-••••-••••-••••-${esc(hint)}`;

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) { /* ignore */ }
      ta.remove();
    }
    toast('Copied to clipboard', 'i-copy');
  }
  function downloadText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const submitForm = (f) => (f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));

  function keepFocus(root, fn) {
    const a = document.activeElement;
    let sel = null;
    if (a && a !== document.body && root && root.contains(a)) {
      if (a.id) sel = '#' + CSS.escape(a.id);
      else if (a.dataset && a.dataset.act) sel = `[data-act="${a.dataset.act}"]` + ['key', 'id', 'tab', 'order'].map((k) => (a.dataset[k] ? `[data-${k}="${CSS.escape(a.dataset[k])}"]` : '')).join('');
      else if (a.name) sel = `[name="${a.name}"]` + (a.type === 'radio' ? `[value="${a.value}"]` : '');
    }
    fn();
    if (sel) { const el = $(sel, root); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  }

  /* ---------- Accounts ---------- */
  const DOMAIN = 'softwarelabs.databell.inbox.bdai';
  const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanName = (s) => String(s).replace(/\s+/g, ' ').trim().slice(0, 30);
  function emailFor(first, last) {
    const base = `${slug(first) || 'first'}.${slug(last) || 'last'}`;
    let email = `${base}@${DOMAIN}`;
    let n = 2;
    while (db.accounts[email]) email = `${base}${n++}@${DOMAIN}`;
    return email;
  }
  const me = () => (db.session && db.accounts[db.session.email]) || null;
  const unlocked = () => !!(me() && !db.session.locked);
  function logAct(acc, text, ic = 'i-shield') {
    acc.activity.unshift({ t: Date.now(), text, icon: ic });
    acc.activity.length = Math.min(acc.activity.length, 40);
  }

  const TIERS = [
    { name: 'Explorer', min: 0, mult: 1, perk: '1 point per $1 spent' },
    { name: 'Builder', min: 500, mult: 1.5, perk: '1.5 points per $1 · priority support' },
    { name: 'Architect', min: 2000, mult: 2, perk: '2 points per $1 · free express shipping' }
  ];
  const tierOf = (acc) => TIERS.filter((t) => acc.spent >= t.min).pop();
  const nextTier = (acc) => TIERS.find((t) => acc.spent < t.min) || null;

  function securityScore(acc) {
    const checks = [
      ['6-digit PIN set', 30, !!acc.pinHash],
      ['Security key saved', 30, !!acc.keyHash],
      ['Auto-lock on', 15, acc.autoLock > 0 && acc.autoLock <= 5 ? 15 : acc.autoLock > 0 ? 8 : 0],
      ['PIN changed in the last 90 days', 10, Date.now() - acc.pinChanged < 90 * 864e5],
      ['Scrambled keypad', 5, !!db.prefs.scramble],
      ['No recent failed PIN attempts', 10, acc.failed === 0]
    ];
    let score = 0;
    const tips = [];
    checks.forEach(([label, pts, ok]) => {
      const got = typeof ok === 'number' ? ok : ok ? pts : 0;
      score += got;
      if (got < pts) tips.push(label);
    });
    return { score, tips };
  }

  /* ---------- Databell Inbox: sending ---------- */
  const mailShell = (acc, inner) => `<div class="mail-hd"><span class="logo-wordmark mail-logo" role="img" aria-label="Databell BDAI"></span></div>
    <p>Hi ${esc(acc.first)},</p>${inner}<p class="mail-sign">— Databell ID · DatabellSoftwareLabs</p>`;
  function sendMail(email, { from = 'Databell ID', addr = `id@${DOMAIN}`, subject, tag = 'updates', html }) {
    (db.inbox[email] = db.inbox[email] || []).unshift({ id: uid(), from, addr, subject, tag, html, t: Date.now(), read: false, star: false });
    if (db.inbox[email].length > 120) db.inbox[email].length = 120;
    saveDB();
    refreshBadges();
    if (Overlay.isOpen('inboxOv') && inbox.email === email) renderInbox();
  }
  const unreadFor = (email) => (db.inbox[email] || []).filter((m) => !m.read).length;

  /* ---------- PIN rules ---------- */
  const SEQS = ['012345', '123456', '234567', '345678', '456789', '987654', '876543', '765432', '654321', '543210'];
  function pinRules(pin) {
    const counts = [...'0123456789'].map((d) => pin.split(d).length - 1);
    return [
      ['Exactly 6 digits', /^\d{6}$/.test(pin)],
      ['Not one digit repeated', !/^(\d)\1{5}$/.test(pin) && pin.length > 0],
      ['Not a straight sequence', !SEQS.includes(pin) && pin.length > 0],
      ['No digit used more than 3 times', Math.max(...counts) <= 3 && pin.length > 0]
    ];
  }
  const pinOK = (pin) => pinRules(pin).every((r) => r[1]);
  const rulesHTML = (pin, pin2) => pinRules(pin).concat(pin2 !== undefined ? [['Both PINs match', pin.length === 6 && pin === pin2]] : [])
    .map(([t, ok]) => `<li class="${ok ? 'ok' : ''}">${icon(ok ? 'i-check' : 'i-x')}${t}</li>`).join('');

  /* ---------- Overlay manager (stacking, focus trap, Esc) ---------- */
  const Overlay = (() => {
    const stack = [];
    const focusables = (el) => $$('button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])', el)
      .filter((x) => x.offsetParent !== null || x === document.activeElement);
    function focusIn(el) {
      const target = $('[data-autofocus]', el) || focusables($('.ov-panel', el) || el)[0];
      if (target) target.focus({ preventScroll: true });
    }
    function open(id) {
      const el = $('#' + id);
      if (!stack.includes(id)) { stack.push(id); el._ret = document.activeElement; }
      el.hidden = false;
      el.style.zIndex = 500 + stack.indexOf(id) * 5;
      document.body.classList.add('ov-open');
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => focusIn(el), 40);
    }
    function close(id) {
      const i = stack.indexOf(id);
      if (i < 0) return;
      stack.splice(i, 1);
      const el = $('#' + id);
      el.classList.remove('show');
      setTimeout(() => { if (!stack.includes(id)) el.hidden = true; }, 260);
      if (!stack.length) document.body.classList.remove('ov-open');
      if (el._ret && document.contains(el._ret)) el._ret.focus({ preventScroll: true });
      el.dispatchEvent(new CustomEvent('ov-close'));
    }
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-ov-close]');
      if (c) { const ov = c.closest('.ov'); if (ov) close(ov.id); }
    });
    document.addEventListener('keydown', (e) => {
      const top = stack[stack.length - 1];
      if (!top) return;
      const el = $('#' + top);
      if (e.key === 'Escape') { e.preventDefault(); close(top); return; }
      if (e.key === 'Tab') {
        const f = focusables($('.ov-panel', el));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    return { open, close, isOpen: (id) => stack.includes(id), focusIn: (id) => focusIn($('#' + id)), top: () => stack[stack.length - 1] };
  })();

  /* =========================================================
     DATABELL ID — auth views
     ========================================================= */
  const authBody = $('#authBody');
  const flow = { after: null, confirm: null, draft: null, resetEmail: null, resetVia: '', newKey: null };
  let authCtx = {};
  let authTimer = null;

  $('#authOv').addEventListener('ov-close', () => {
    clearInterval(authTimer);
    flow.after = null;
    flow.newKey = null;
    if (flow.confirm) { const c = flow.confirm; flow.confirm = null; c(false); }
  });

  function auth(view, ctx = {}) { Overlay.open('authOv'); renderAuth(view, ctx); }
  function renderAuth(view, ctx = {}) {
    clearInterval(authTimer);
    authTimer = null;
    authCtx = Object.assign({ view }, ctx);
    authBody.innerHTML = VIEWS[view](authCtx);
    authBody.dataset.view = view;
    buildKeypads(authBody);
    if (AFTER[view]) AFTER[view](authCtx);
    Overlay.focusIn('authOv');
  }
  function authErr(msg, shake = true) {
    const el = $('.form-err', authBody);
    if (el) el.textContent = msg;
    if (shake) { const card = $('.auth-card'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
  }
  const stepsBar = (n) => `<ol class="steps-bar">${['Profile', 'PIN', 'Security key'].map((s, i) => `<li class="${i < n ? 'done' : i === n ? 'on' : ''}">${i < n ? icon('i-check') : `<b>${i + 1}</b>`}${s}</li>`).join('')}</ol>`;
  const pinInput = (id, label, auto) => `<label class="pin-field"><span>${label}</span><input id="${id}" name="${id}" class="pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" ${auto ? 'data-autofocus' : ''}></label>`;
  const keypad = (target) => `<div class="keypad" data-target="${target}"></div><button type="button" class="link-btn small scramble-btn" data-act="scramble-toggle">${icon('i-shuffle')} <span>${db.prefs.scramble ? 'Keypad scrambled · tap to reset' : 'Scramble keypad'}</span></button>`;
  function buildKeypads(root) {
    $$('.keypad', root).forEach((kp) => {
      const digits = [...'1234567890'];
      if (db.prefs.scramble) shuffle(digits);
      kp.innerHTML = digits.slice(0, 9).map((d) => `<button type="button" data-k="${d}">${d}</button>`).join('')
        + `<button type="button" data-k="clear" aria-label="Clear">C</button><button type="button" data-k="${digits[9]}">${digits[9]}</button><button type="button" data-k="back" aria-label="Delete last digit">${icon('i-backspace')}</button>`;
    });
  }
  const whoHTML = (acc) => `<div class="who">${avatar(acc)}<span><b>${esc(acc.first)} ${esc(acc.last)}</b><small>${esc(acc.email)}</small></span></div>`;
  const lockedOut = (acc) => acc.lockUntil && acc.lockUntil > Date.now();

  const VIEWS = {
    signin() {
      const accts = Object.values(db.accounts);
      return `<div class="auth-head">${icon('i-fingerprint', 'ic auth-ic')}<h3 id="authTitle">Sign in to Databell ID</h3><p class="muted">Choose your account and unlock it with your 6-digit PIN.</p></div>
        ${accts.length ? `<div class="acct-list">${accts.map((a) => `<button class="acct-pick" data-act="pick" data-email="${esc(a.email)}">${avatar(a)}<span><b>${esc(a.first)} ${esc(a.last)}</b><small>${esc(a.email)}</small></span>${icon('i-right')}</button>`).join('')}</div><div class="or"><span>or enter your address</span></div>` : ''}
        <form class="auth-form" id="fFind" novalidate>
          <label class="field"><span>Databell inbox address</span><input name="email" type="email" placeholder="first.last@${DOMAIN}" autocomplete="username" spellcheck="false" ${accts.length ? '' : 'data-autofocus'}></label>
          <p class="form-err" role="alert"></p>
          <button class="btn btn-primary btn-block">Continue ${icon('i-arrow')}</button>
        </form>
        <p class="auth-alt">New to Databell? <button class="link-btn" data-go="signup1">Create a Databell ID</button></p>`;
    },
    pin(ctx) {
      const acc = db.accounts[ctx.email];
      const mode = ctx.mode || 'signin';
      const title = mode === 'confirm' ? (ctx.title || 'Confirm with your PIN') : mode === 'unlock' ? 'Databell ID locked' : `Welcome back, ${esc(acc.first)}`;
      const sub = mode === 'confirm' ? esc(ctx.reason || '') : mode === 'unlock' ? 'Enter your PIN to unlock your account on this device.' : esc(acc.email);
      return `<div class="auth-head">${avatar(acc, 'lg')}<h3 id="authTitle">${title}</h3><p class="muted">${sub}</p></div>
        <form class="auth-form" id="fPin" novalidate>
          ${pinInput('pinIn', 'PIN', true)}
          ${keypad('pinIn')}
          <p class="form-err" role="alert"></p>
          <p class="attempts small" id="attempts"></p>
          <button class="btn btn-primary btn-block" id="pinSubmit">${mode === 'confirm' ? 'Confirm' : 'Unlock'} ${icon('i-unlock')}</button>
        </form>
        <div class="auth-links"><button class="link-btn" data-go="forgot">Forgot PIN?</button>${mode === 'signin' ? '<button class="link-btn" data-go="signin">Use another account</button>' : ''}${mode === 'unlock' ? '<button class="link-btn" data-act="signout">Sign out</button>' : ''}</div>`;
    },
    signup1() {
      const d = flow.draft || {};
      return `${stepsBar(0)}<div class="auth-head"><h3 id="authTitle">Create your Databell ID</h3><p class="muted">One ID for DatabellSoftwareLabs, TechEnhance, TechKnowledge and the Databell Store.</p></div>
        <form class="auth-form" id="fSignup1" novalidate>
          <div class="form-row">
            <label class="field"><span>First name</span><input name="first" autocomplete="given-name" maxlength="30" value="${esc(d.first || '')}" data-autofocus></label>
            <label class="field"><span>Last name</span><input name="last" autocomplete="family-name" maxlength="30" value="${esc(d.last || '')}"></label>
          </div>
          <div class="inbox-preview">${icon('i-inbox')}<span><small>Your Databell inbox will be</small><code id="emailPreview">first.last@${DOMAIN}</code></span></div>
          <label class="field"><span>Main interest</span><select name="division">${['DatabellSoftwareLabs', 'TechEnhance', 'TechKnowledge', 'Databell Store'].map((o) => `<option ${d.division === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
          <label class="check"><input type="checkbox" name="agree" ${d.first ? 'checked' : ''}><span>I understand Databell staff can't see or recover my PIN or security key.</span></label>
          <p class="form-err" role="alert"></p>
          <button class="btn btn-primary btn-block">Continue to PIN ${icon('i-arrow')}</button>
        </form>
        <p class="auth-alt">Already have an ID? <button class="link-btn" data-go="signin">Sign in</button></p>`;
    },
    signup2() {
      return `${stepsBar(1)}<div class="auth-head">${icon('i-lock', 'ic auth-ic')}<h3 id="authTitle">Create a 6-digit PIN</h3><p class="muted">You'll use it to sign in, unlock after auto-lock and confirm every payment.</p></div>
        <form class="auth-form" id="fSignup2" novalidate>
          <div class="form-row">${pinInput('newPin', 'New PIN', true)}${pinInput('newPin2', 'Confirm PIN')}</div>
          <ul class="rules" id="pinRules">${rulesHTML('', '')}</ul>
          <p class="form-err" role="alert"></p>
          <div class="btn-row"><button type="button" class="btn btn-ghost" data-go="signup1">Back</button><button class="btn btn-primary">Continue ${icon('i-arrow')}</button></div>
        </form>`;
    },
    signup3() {
      const key = flow.draft.key;
      return `${stepsBar(2)}<div class="auth-head">${icon('i-key', 'ic auth-ic')}<h3 id="authTitle">Save your security key</h3><p class="muted">If you forget your PIN, this key resets it instantly. It is shown only now — Databell keeps just a fingerprint of it.</p></div>
        ${keyBox(key, true)}
        <form class="auth-form" id="fSignup3" novalidate>
          <label class="check"><input type="checkbox" name="saved"><span>I've stored my security key somewhere safe (password manager, or printed).</span></label>
          <label class="field"><span>Type the last group of your key to confirm</span><input name="last4" class="mono upper" maxlength="4" autocomplete="off" spellcheck="false" placeholder="XXXX"></label>
          <p class="form-err" role="alert"></p>
          <div class="btn-row"><button type="button" class="btn btn-ghost" data-go="signup2">Back</button><button class="btn btn-primary">Create Databell ID</button></div>
        </form>`;
    },
    done(ctx) {
      const acc = db.accounts[ctx.email];
      return `<div class="auth-done"><div class="done-check">${icon('i-check')}</div><h3 id="authTitle">You're all set, ${esc(acc.first)}!</h3><p class="muted">Your Databell ID is active and unlocked on this device.</p></div>
        <ul class="done-list">
          <li>${icon('i-inbox')}<span>Inbox <b>${esc(acc.email)}</b></span><button class="icon-btn sm" data-copy="${esc(acc.email)}" aria-label="Copy inbox address">${icon('i-copy')}</button></li>
          <li>${icon('i-lock')}<span>6-digit PIN set · auto-lock after ${acc.autoLock} min</span></li>
          <li>${icon('i-key')}<span>Security key ${maskKey(acc.keyHint)}</span></li>
          <li>${icon('i-wallet')}<span>${money(acc.wallet)} welcome credit in your Databell Wallet</span></li>
          <li>${icon('i-gift')}<span>${acc.points} Databell Points to start</span></li>
        </ul>
        <div class="btn-row"><button class="btn btn-ghost" data-act="open-inbox">${icon('i-inbox')} Open inbox</button><button class="btn btn-primary" data-act="done-continue">Continue ${icon('i-arrow')}</button></div>`;
    },
    forgot(ctx) {
      const acc = ctx.email && db.accounts[ctx.email];
      if (!acc) {
        return `<div class="auth-head">${icon('i-key', 'ic auth-ic')}<h3 id="authTitle">Forgot your PIN?</h3><p class="muted">Tell us which Databell ID you're recovering.</p></div>
          <form class="auth-form" id="fForgotFind" novalidate>
            <label class="field"><span>Databell inbox address</span><input name="email" type="email" placeholder="first.last@${DOMAIN}" spellcheck="false" data-autofocus></label>
            <p class="form-err" role="alert"></p>
            <button class="btn btn-primary btn-block">Continue ${icon('i-arrow')}</button>
          </form>
          <p class="auth-alt"><button class="link-btn" data-go="signin">Back to sign in</button></p>`;
      }
      return `<div class="auth-head">${icon('i-key', 'ic auth-ic')}<h3 id="authTitle">Forgot your PIN?</h3><p class="muted">Reset it with your security key, or with a one-time code sent to your Databell inbox.</p></div>
        ${whoHTML(acc)}
        <div class="recover-opts">
          <button class="recover-opt" data-act="rec-key">${icon('i-key')}<span><b>Use my security key</b><small>${maskKey(acc.keyHint)} · instant reset</small></span>${icon('i-right')}</button>
          <button class="recover-opt" data-act="rec-mail">${icon('i-inbox')}<span><b>Send a code to my inbox</b><small>${esc(acc.email)}</small></span>${icon('i-right')}</button>
        </div>
        <p class="note small">${icon('i-alert')}<span>Lost your security key as well? Reset your PIN with an inbox code, then replace the key from <b>Security</b> in your Databell ID.</span></p>
        <p class="auth-alt"><button class="link-btn" data-go="signin">Back to sign in</button></p>`;
    },
    resetKey(ctx) {
      const acc = db.accounts[ctx.email];
      return `<div class="auth-head">${icon('i-key', 'ic auth-ic')}<h3 id="authTitle">Reset PIN with security key</h3><p class="muted">${esc(acc.email)}</p></div>
        <form class="auth-form" id="fResetKey" novalidate>
          <label class="field"><span>Security key</span><input name="key" class="mono upper" placeholder="DBSK-XXXX-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false" data-autofocus></label>
          <p class="form-err" role="alert"></p>
          <p class="attempts small" id="attempts"></p>
          <button class="btn btn-primary btn-block">Verify key ${icon('i-arrow')}</button>
        </form>
        <p class="auth-alt"><button class="link-btn" data-act="rec-mail">Send an inbox code instead</button> · <button class="link-btn" data-go="forgot">Back</button></p>`;
    },
    resetCode(ctx) {
      const acc = db.accounts[ctx.email];
      const isKey = ctx.purpose === 'key';
      return `<div class="auth-head">${icon('i-inbox', 'ic auth-ic')}<h3 id="authTitle">Check your Databell inbox</h3><p class="muted">We sent a 6-digit code to <b>${esc(acc.email)}</b> to ${isKey ? 'replace your security key' : 'reset your PIN'}.</p></div>
        <button class="btn btn-ghost btn-block" data-act="open-inbox-for">${icon('i-inbox')} Open Databell Inbox</button>
        <form class="auth-form" id="fResetCode" novalidate>
          <label class="field"><span>6-digit code</span><input name="code" class="code-input mono" inputmode="numeric" maxlength="6" autocomplete="one-time-code" data-autofocus></label>
          <p class="muted small" id="codeTimer"></p>
          <p class="form-err" role="alert"></p>
          <button class="btn btn-primary btn-block">Verify code ${icon('i-arrow')}</button>
        </form>
        <p class="auth-alt"><button class="link-btn" data-act="resend" id="resendBtn">Resend code</button>${isKey ? '' : ' · <button class="link-btn" data-go="forgot">Back</button>'}</p>`;
    },
    resetNew(ctx) {
      return `<div class="auth-head">${icon('i-lock', 'ic auth-ic')}<h3 id="authTitle">Choose a new PIN</h3><p class="muted">Verified with your ${esc(flow.resetVia)}. ${esc(ctx.email)}</p></div>
        <form class="auth-form" id="fResetNew" novalidate>
          <div class="form-row">${pinInput('newPin', 'New PIN', true)}${pinInput('newPin2', 'Confirm PIN')}</div>
          <ul class="rules" id="pinRules">${rulesHTML('', '')}</ul>
          <p class="form-err" role="alert"></p>
          <button class="btn btn-primary btn-block">Save new PIN ${icon('i-check')}</button>
        </form>`;
    },
    changePin() {
      return `<div class="auth-head">${icon('i-lock', 'ic auth-ic')}<h3 id="authTitle">Change your PIN</h3><p class="muted">Enter your current PIN, then pick a new one.</p></div>
        <form class="auth-form" id="fChangePin" novalidate>
          ${pinInput('curPin', 'Current PIN', true)}
          <div class="form-row">${pinInput('newPin', 'New PIN')}${pinInput('newPin2', 'Confirm new PIN')}</div>
          <ul class="rules" id="pinRules">${rulesHTML('', '')}</ul>
          <p class="form-err" role="alert"></p>
          <button class="btn btn-primary btn-block">Update PIN</button>
        </form>`;
    },
    newKey() {
      return `<div class="auth-head">${icon('i-key', 'ic auth-ic')}<h3 id="authTitle">Your new security key</h3><p class="muted">Your old key stops working as soon as you save this one.</p></div>
        ${keyBox(flow.newKey, true)}
        <form class="auth-form" id="fNewKey" novalidate>
          <label class="check"><input type="checkbox" name="saved"><span>I've stored the new key somewhere safe.</span></label>
          <label class="field"><span>Type the last group to confirm</span><input name="last4" class="mono upper" maxlength="4" autocomplete="off" spellcheck="false" placeholder="XXXX"></label>
          <p class="form-err" role="alert"></p>
          <button class="btn btn-primary btn-block">Save new key</button>
        </form>`;
    },
    deleteAcct() {
      return `<div class="auth-head">${icon('i-alert', 'ic auth-ic danger')}<h3 id="authTitle">Delete Databell ID</h3><p class="muted">This removes your account, wallet, orders and inbox from this device. It can't be undone.</p></div>
        <form class="auth-form" id="fDelete" novalidate>
          ${pinInput('delPin', 'PIN', true)}
          <label class="field"><span>Type DELETE to confirm</span><input name="confirm" class="mono" autocomplete="off" spellcheck="false"></label>
          <p class="form-err" role="alert"></p>
          <button class="btn btn-danger btn-block">Delete permanently</button>
        </form>`;
    }
  };

  function keyBox(key, actions) {
    return `<div class="key-box"><code class="key-text" aria-label="Security key ${esc(key)}">${key.split('-').map((g) => `<span>${g}</span>`).join('<i>-</i>')}</code>
      ${actions ? `<div class="key-actions"><button type="button" class="btn btn-ghost btn-sm" data-copy="${key}">${icon('i-copy')} Copy</button><button type="button" class="btn btn-ghost btn-sm" data-act="dl-key">${icon('i-download')} Download</button>${authCtx.view === 'signup3' ? `<button type="button" class="btn btn-ghost btn-sm" data-act="new-key">${icon('i-refresh')} New key</button>` : ''}</div>` : ''}</div>`;
  }

  // Live behaviour for each view
  const livePinRules = (withCur) => {
    const upd = () => { $('#pinRules').innerHTML = rulesHTML($('#newPin').value, $('#newPin2').value); };
    ['#newPin', '#newPin2'].forEach((s) => $(s).addEventListener('input', upd));
    if (withCur) upd();
  };
  function showAttempts(acc) {
    const el = $('#attempts');
    if (!el) return;
    const tick = () => {
      if (lockedOut(acc)) {
        const s = Math.ceil((acc.lockUntil - Date.now()) / 1000);
        el.innerHTML = `${icon('i-alert')} Too many wrong attempts. Try again in <b>${s}s</b>.`;
        el.className = 'attempts small warn';
        $$('input, .keypad button, button.btn-primary', authBody).forEach((b) => { b.disabled = true; });
      } else {
        el.className = 'attempts small';
        el.textContent = acc.failed ? `${Math.max(0, 5 - acc.failed)} attempt${5 - acc.failed === 1 ? '' : 's'} left before a pause` : '';
        $$('input, .keypad button, button.btn-primary', authBody).forEach((b) => { b.disabled = false; });
        if (acc.failed >= 5) el.textContent = 'One more wrong attempt pauses PIN entry again.';
      }
    };
    tick();
    clearInterval(authTimer);
    authTimer = setInterval(() => { const was = lockedOut(acc); tick(); if (!was) { /* keep ticking for live state */ } }, 1000);
  }
  const AFTER = {
    pin(ctx) { showAttempts(db.accounts[ctx.email]); },
    resetKey(ctx) { showAttempts(db.accounts[ctx.email]); },
    signup1() {
      const f = $('#fSignup1');
      const upd = () => { $('#emailPreview').textContent = emailFor(f.first.value, f.last.value); };
      f.first.addEventListener('input', upd); f.last.addEventListener('input', upd); upd();
    },
    signup2() { livePinRules(); },
    resetNew() { livePinRules(); },
    changePin() { livePinRules(); },
    resetCode(ctx) {
      const acc = db.accounts[ctx.email];
      const tick = () => {
        const r = acc.recovery;
        const t = $('#codeTimer');
        const rb = $('#resendBtn');
        if (!t || !r) return;
        const left = Math.max(0, r.exp - Date.now());
        t.textContent = left ? `Code expires in ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}` : 'This code has expired — send a new one.';
        const cool = Math.max(0, 30000 - (Date.now() - r.sent));
        rb.disabled = cool > 0;
        rb.textContent = cool > 0 ? `Resend in ${Math.ceil(cool / 1000)}s` : 'Resend code';
      };
      tick();
      authTimer = setInterval(tick, 1000);
    }
  };

  function sendRecoveryCode(acc, purpose) {
    const code = genCode();
    acc.recovery = { purpose, hash: hashSecret(code, acc.pinSalt + purpose), exp: Date.now() + 10 * 60000, tries: 0, sent: Date.now() };
    logAct(acc, purpose === 'pin' ? 'PIN reset code sent to inbox' : 'Key replacement code sent to inbox', 'i-send');
    sendMail(acc.email, {
      subject: `${code} is your Databell ${purpose === 'pin' ? 'PIN reset' : 'security key'} code`,
      tag: 'security',
      html: mailShell(acc, `<p>Use this code to ${purpose === 'pin' ? 'reset your Databell ID PIN' : 'replace your security key'}. It expires in 10 minutes and can be used once.</p>
        <div class="mail-code"><span>${code}</span><button class="btn btn-ghost btn-sm" data-copy="${code}">${icon('i-copy')} Copy</button></div>
        <p class="muted">Didn't ask for this? You can ignore this email — nothing changes until the code is entered.</p>`)
    });
    saveDB();
  }

  function startSession(acc, how) {
    db.session = { email: acc.email, locked: false };
    acc.failed = 0;
    acc.lockUntil = 0;
    lastActive = Date.now();
    logAct(acc, how, 'i-unlock');
    saveDB();
    refreshAll();
  }
  function finishAuth(msg) {
    const after = flow.after;
    flow.after = null;
    Overlay.close('authOv');
    if (msg) toast(msg);
    if (after) setTimeout(after, 120);
  }
  function registerFailure(acc) {
    acc.failed += 1;
    if (acc.failed >= 5) {
      const secs = Math.min(300, 30 * 2 ** (acc.failed - 5));
      acc.lockUntil = Date.now() + secs * 1000;
      logAct(acc, `Wrong PIN or key 5+ times — entry paused ${secs}s`, 'i-alert');
      sendMail(acc.email, {
        subject: 'Several wrong PIN attempts on your Databell ID', tag: 'security',
        html: mailShell(acc, `<p>We paused PIN entry on your Databell ID for ${secs} seconds after ${acc.failed} wrong attempts on ${fmtDate(Date.now())}.</p><p>If this wasn't you, reset your PIN with your security key and replace the key from Security.</p>`)
      });
    }
    saveDB();
  }

  // ----- Form submissions inside the auth dialog -----
  const SUBMIT = {
    fFind(f) {
      const email = f.email.value.trim().toLowerCase();
      if (!email) return authErr('Enter your Databell inbox address.');
      if (!db.accounts[email]) return authErr("We couldn't find that Databell ID on this device. Check the address or create a new ID.");
      renderAuth('pin', { email, mode: 'signin' });
    },
    fForgotFind(f) {
      const email = f.email.value.trim().toLowerCase();
      if (!db.accounts[email]) return authErr("We couldn't find that Databell ID on this device.");
      renderAuth('forgot', { email });
    },
    fPin(f) {
      const acc = db.accounts[authCtx.email];
      const mode = authCtx.mode || 'signin';
      if (!acc) return renderAuth('signin');
      if (lockedOut(acc)) return;
      const pin = f.pinIn.value;
      if (!/^\d{6}$/.test(pin)) return authErr('Enter all 6 digits of your PIN.');
      if (hashSecret(pin, acc.pinSalt) !== acc.pinHash) {
        registerFailure(acc);
        f.pinIn.value = '';
        if (mode === 'confirm' && lockedOut(acc)) lockSession(false);
        authErr('That PIN is not correct.');
        showAttempts(acc);
        return;
      }
      if (mode === 'confirm') {
        if (db.session && db.session.locked) startSession(acc, 'Unlocked with PIN'); else { acc.failed = 0; saveDB(); }
        const cb = flow.confirm; flow.confirm = null;
        Overlay.close('authOv');
        if (cb) cb(true);
        return;
      }
      if (mode === 'unlock') {
        startSession(acc, 'Unlocked with PIN');
        finishAuth(`Unlocked · welcome back, ${acc.first}`);
        return;
      }
      startSession(acc, 'Signed in with PIN on this device');
      sendMail(acc.email, {
        subject: 'New sign-in to your Databell ID', tag: 'security',
        html: mailShell(acc, `<p>Your Databell ID was signed in on ${fmtDate(Date.now())} using your PIN.</p><table class="mail-table"><tr><td>Device</td><td>${esc(navigator.platform || 'This browser')}</td></tr><tr><td>Method</td><td>6-digit PIN</td></tr></table><p class="muted">Not you? Reset your PIN with your security key straight away.</p>`)
      });
      finishAuth(`Welcome back, ${acc.first}`);
    },
    fSignup1(f) {
      const first = cleanName(f.first.value), last = cleanName(f.last.value);
      if (!slug(first) || !slug(last)) return authErr('Please enter your first and last name (letters or numbers).');
      if (!f.agree.checked) return authErr('Please tick the box to continue.');
      flow.draft = Object.assign(flow.draft || {}, { first, last, division: f.division.value });
      renderAuth('signup2');
    },
    fSignup2(f) {
      const p1 = f.newPin.value, p2 = f.newPin2.value;
      if (!pinOK(p1)) return authErr('Your PIN doesn’t meet all the rules yet.');
      if (p1 !== p2) return authErr('The two PINs don’t match.');
      flow.draft.pin = p1;
      flow.draft.key = flow.draft.key || genKey();
      renderAuth('signup3');
    },
    fSignup3(f) {
      const d = flow.draft;
      if (!f.saved.checked) return authErr('Please confirm you have saved your security key.');
      if (f.last4.value.trim().toUpperCase() !== d.key.slice(-4)) return authErr('That doesn’t match the last group of your key.');
      const email = emailFor(d.first, d.last);
      const now = Date.now();
      const pinSalt = randomFrom(ALNUM, 16), keySalt = randomFrom(ALNUM, 16);
      const acc = {
        first: d.first, last: d.last, email, division: d.division, created: now,
        pinSalt, pinHash: hashSecret(d.pin, pinSalt), pinChanged: now,
        keySalt, keyHash: hashSecret(canonKey(d.key), keySalt), keyHint: d.key.slice(-4), keyCreated: now,
        wallet: 1000, points: 500, spent: 0, orders: [], activity: [], failed: 0, lockUntil: 0, autoLock: 5, recovery: null
      };
      db.accounts[email] = acc;
      logAct(acc, 'Databell ID created', 'i-user');
      logAct(acc, 'PIN and security key set up', 'i-key');
      startSession(acc, 'Signed in on this device');
      sendMail(email, {
        subject: `Welcome to Databell, ${acc.first}!`, tag: 'updates', from: 'Databell Team', addr: `hello@${DOMAIN}`,
        html: mailShell(acc, `<p>Your Databell ID is ready. This inbox — <b>${esc(email)}</b> — is where Databell sends codes, receipts and licence keys.</p>
          <ul><li><b>PIN</b> unlocks your ID and confirms payments.</li><li><b>Security key</b> (${maskKey(acc.keyHint)}) resets a forgotten PIN instantly.</li><li><b>This inbox</b> receives one-time codes if you lose your PIN or key.</li></ul>
          <p>We've added <b>${money(acc.wallet)}</b> of welcome credit and <b>${acc.points} points</b> to your account. Enjoy the Databell Store!</p>`)
      });
      sendMail(email, {
        subject: 'Your security key is set up', tag: 'security',
        html: mailShell(acc, `<p>A security key ending <b>${esc(acc.keyHint)}</b> was added to your Databell ID on ${fmtDate(now)}.</p><p>We never store the key itself, so keep your copy safe. You can replace it any time from Security.</p>`)
      });
      flow.draft = null;
      renderAuth('done', { email });
    },
    fResetKey(f) {
      const acc = db.accounts[authCtx.email];
      if (lockedOut(acc)) return;
      const k = canonKey(f.key.value);
      if (k.length !== 16) return authErr('A security key has 16 characters after “DBSK”.');
      if (hashSecret(k, acc.keySalt) !== acc.keyHash) {
        registerFailure(acc);
        authErr('That security key is not correct.');
        showAttempts(acc);
        return;
      }
      flow.resetEmail = acc.email;
      flow.resetVia = 'security key';
      renderAuth('resetNew', { email: acc.email });
    },
    fResetCode(f) {
      const acc = db.accounts[authCtx.email];
      const purpose = authCtx.purpose || 'pin';
      const r = acc.recovery;
      const code = f.code.value.trim();
      if (!r || r.purpose !== purpose) return authErr('Please request a new code.');
      if (Date.now() > r.exp) return authErr('This code has expired — send a new one.');
      if (!/^\d{6}$/.test(code)) return authErr('Enter the 6-digit code from your inbox.');
      if (hashSecret(code, acc.pinSalt + purpose) !== r.hash) {
        r.tries += 1;
        if (r.tries >= 5) { acc.recovery = null; saveDB(); return authErr('Too many wrong codes. Please request a new one.'); }
        saveDB();
        return authErr(`That code is not correct. ${5 - r.tries} tries left.`);
      }
      acc.recovery = null;
      saveDB();
      if (purpose === 'key') {
        flow.newKey = genKey();
        renderAuth('newKey', { email: acc.email });
      } else {
        flow.resetEmail = acc.email;
        flow.resetVia = 'inbox code';
        renderAuth('resetNew', { email: acc.email });
      }
    },
    fResetNew(f) {
      const acc = db.accounts[authCtx.email];
      if (!acc || flow.resetEmail !== acc.email) return renderAuth('forgot', { email: authCtx.email });
      const p1 = f.newPin.value, p2 = f.newPin2.value;
      if (!pinOK(p1)) return authErr('Your PIN doesn’t meet all the rules yet.');
      if (p1 !== p2) return authErr('The two PINs don’t match.');
      if (hashSecret(p1, acc.pinSalt) === acc.pinHash) return authErr('That is your current PIN — choose a different one.');
      acc.pinSalt = randomFrom(ALNUM, 16);
      acc.pinHash = hashSecret(p1, acc.pinSalt);
      acc.pinChanged = Date.now();
      logAct(acc, `PIN reset with ${flow.resetVia}`, 'i-lock');
      sendMail(acc.email, {
        subject: 'Your Databell PIN was reset', tag: 'security',
        html: mailShell(acc, `<p>Your PIN was reset with your <b>${esc(flow.resetVia)}</b> on ${fmtDate(Date.now())}.</p><p class="muted">If you didn't do this, reset it again with your security key and replace the key.</p>`)
      });
      flow.resetEmail = null;
      startSession(acc, 'Signed in after PIN reset');
      finishAuth('New PIN saved — you are signed in');
    },
    fChangePin(f) {
      const acc = me();
      if (!acc || lockedOut(acc)) return;
      if (hashSecret(f.curPin.value, acc.pinSalt) !== acc.pinHash) { registerFailure(acc); if (lockedOut(acc)) { lockSession(false); Overlay.close('authOv'); return; } return authErr('Your current PIN is not correct.'); }
      const p1 = f.newPin.value, p2 = f.newPin2.value;
      if (!pinOK(p1)) return authErr('Your new PIN doesn’t meet all the rules yet.');
      if (p1 !== p2) return authErr('The new PINs don’t match.');
      if (p1 === f.curPin.value) return authErr('Choose a PIN that is different from your current one.');
      acc.pinSalt = randomFrom(ALNUM, 16);
      acc.pinHash = hashSecret(p1, acc.pinSalt);
      acc.pinChanged = Date.now();
      acc.failed = 0;
      logAct(acc, 'PIN changed', 'i-lock');
      sendMail(acc.email, { subject: 'Your Databell PIN was changed', tag: 'security', html: mailShell(acc, `<p>Your PIN was changed on ${fmtDate(Date.now())}.</p>`) });
      saveDB();
      Overlay.close('authOv');
      toast('PIN updated');
      refreshAll();
    },
    fNewKey(f) {
      const acc = db.accounts[authCtx.email];
      if (!f.saved.checked) return authErr('Please confirm you have saved the new key.');
      if (f.last4.value.trim().toUpperCase() !== flow.newKey.slice(-4)) return authErr('That doesn’t match the last group of the new key.');
      acc.keySalt = randomFrom(ALNUM, 16);
      acc.keyHash = hashSecret(canonKey(flow.newKey), acc.keySalt);
      acc.keyHint = flow.newKey.slice(-4);
      acc.keyCreated = Date.now();
      flow.newKey = null;
      logAct(acc, 'Security key replaced', 'i-key');
      sendMail(acc.email, { subject: 'Your security key was replaced', tag: 'security', html: mailShell(acc, `<p>A new security key ending <b>${esc(acc.keyHint)}</b> replaced your old key on ${fmtDate(Date.now())}. The old key no longer works.</p>`) });
      saveDB();
      Overlay.close('authOv');
      toast('New security key saved');
      refreshAll();
    },
    fDelete(f) {
      const acc = me();
      if (!acc) return;
      if (hashSecret(f.delPin.value, acc.pinSalt) !== acc.pinHash) { registerFailure(acc); return authErr('That PIN is not correct.'); }
      if (f.confirm.value.trim() !== 'DELETE') return authErr('Type DELETE in capitals to confirm.');
      delete db.accounts[acc.email];
      delete db.inbox[acc.email];
      db.session = null;
      saveDB();
      ['authOv', 'acctOv', 'inboxOv', 'checkoutOv'].forEach((id) => Overlay.close(id));
      toast('Databell ID deleted from this device', 'i-trash');
      refreshAll();
    }
  };
  authBody.addEventListener('submit', (e) => {
    e.preventDefault();
    const fn = SUBMIT[e.target.id];
    if (fn) fn(e.target);
  });
  authBody.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { renderAuth(go.dataset.go, { email: authCtx.email }); return; }
    const k = e.target.closest('[data-k]');
    if (k) {
      const kp = k.closest('.keypad');
      const input = $('#' + kp.dataset.target);
      if (input.disabled) return;
      const v = k.dataset.k;
      input.value = v === 'clear' ? '' : v === 'back' ? input.value.slice(0, -1) : (input.value + v).slice(0, 6);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus({ preventScroll: true });
    }
  });
  // digits only in PIN / code inputs; auto-submit single-PIN forms on the 6th digit
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.matches || !t.matches('.pin-input, .code-input')) return;
    const clean = t.value.replace(/\D/g, '').slice(0, 6);
    if (clean !== t.value) t.value = clean;
    if (clean.length === 6 && t.form && (t.form.id === 'fPin' || t.form.id === 'fResetCode')) setTimeout(() => submitForm(t.form), 80);
  });

  /* ---------- Session helpers ---------- */
  function requireUnlocked(fn) {
    if (unlocked()) { fn(); return; }
    flow.after = fn;
    if (me()) auth('pin', { email: db.session.email, mode: 'unlock' });
    else if (Object.keys(db.accounts).length) auth('signin');
    else auth('signup1');
  }
  function confirmPin(reason, title) {
    return new Promise((resolve) => {
      if (!unlocked()) { resolve(false); return; }
      flow.confirm = resolve;
      auth('pin', { email: db.session.email, mode: 'confirm', reason, title });
    });
  }
  function lockSession(auto) {
    const acc = me();
    if (!acc || db.session.locked) return;
    db.session.locked = true;
    logAct(acc, auto ? 'Auto-locked after inactivity' : 'Locked', 'i-lock');
    saveDB();
    ['acctOv', 'checkoutOv'].forEach((id) => Overlay.close(id));
    if (Overlay.isOpen('inboxOv') && inbox.email === acc.email && !inbox.recovery) Overlay.close('inboxOv');
    refreshAll();
    toast(auto ? 'Databell ID locked after inactivity' : 'Databell ID locked', 'i-lock');
  }
  function signOut() {
    const acc = me();
    if (acc) logAct(acc, 'Signed out', 'i-logout');
    db.session = null;
    saveDB();
    ['acctOv', 'checkoutOv', 'authOv'].forEach((id) => Overlay.close(id));
    if (Overlay.isOpen('inboxOv') && !inbox.recovery) Overlay.close('inboxOv');
    refreshAll();
    toast('Signed out of Databell ID', 'i-logout');
  }
  let lastActive = Date.now();
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true }));
  setInterval(() => {
    const acc = me();
    if (!acc || db.session.locked || !acc.autoLock) return;
    if (Date.now() - lastActive > acc.autoLock * 60000) lockSession(true);
  }, 5000);

  function acctClick() {
    if (!me()) { auth(Object.keys(db.accounts).length ? 'signin' : 'signup1'); return; }
    requireUnlocked(() => openAccount());
  }

  /* =========================================================
     DATABELL INBOX
     ========================================================= */
  const inbox = { email: null, sel: null, tab: 'all', q: '', recovery: false };
  const inboxBody = $('#inboxBody');
  function openInbox(email, recovery = false) {
    if (!email) {
      if (!me()) { acctClick(); return; }
      if (!unlocked()) { requireUnlocked(() => openInbox()); return; }
      email = me().email;
    }
    Object.assign(inbox, { email, sel: null, tab: 'all', q: '', recovery: recovery && !(unlocked() && me().email === email) });
    Overlay.open('inboxOv');
    renderInbox(true);
  }
  function renderInbox(frame) { keepFocus($('#inboxBody'), () => renderInboxNow(frame)); }
  function renderInboxNow(frame) {
    const mails = db.inbox[inbox.email] || [];
    if (frame || !$('#ibList', inboxBody)) {
      inboxBody.innerHTML = `<div class="ib-top">
          <div class="ib-brand">${icon('i-inbox')}<span><b>Databell Inbox</b><small>${esc(inbox.email)}</small></span></div>
          <div class="search-box sm">${icon('i-search')}<input type="search" id="ibSearch" placeholder="Search mail" aria-label="Search mail"></div>
          <button class="icon-btn" data-ov-close aria-label="Close inbox">${icon('i-x')}</button>
        </div>
        ${inbox.recovery ? `<p class="ib-banner">${icon('i-shield')} Opened for account recovery on this device. Copy your code, then return to the Databell ID window.</p>` : ''}
        <div class="ib-tabs" role="tablist" id="ibTabs"></div>
        <div class="ib-main" id="ibMain"><ul class="ib-list" id="ibList"></ul><div class="ib-read" id="ibRead"></div></div>`;
      $('#ibSearch').addEventListener('input', (e) => { inbox.q = e.target.value.trim().toLowerCase(); renderInbox(); });
    }
    const counts = { all: mails.length, security: 0, orders: 0, updates: 0, starred: 0 };
    mails.forEach((m) => { counts[m.tag] = (counts[m.tag] || 0) + 1; if (m.star) counts.starred += 1; });
    $('#ibTabs').innerHTML = ['all', 'security', 'orders', 'updates', 'starred'].map((t) => `<button role="tab" aria-selected="${inbox.tab === t}" class="${inbox.tab === t ? 'on' : ''}" data-act="ib-tab" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)} <span>${counts[t] || 0}</span></button>`).join('')
      + `<button class="link-btn small" data-act="ib-readall">Mark all read</button>`;
    const list = mails.filter((m) => (inbox.tab === 'all' || (inbox.tab === 'starred' ? m.star : m.tag === inbox.tab))
      && (!inbox.q || (m.subject + ' ' + m.from + ' ' + m.html.replace(/<[^>]+>/g, ' ')).toLowerCase().includes(inbox.q)));
    $('#ibList').innerHTML = list.length ? list.map((m) => `<li><button class="ib-item ${m.read ? '' : 'unread'} ${inbox.sel === m.id ? 'sel' : ''}" data-act="ib-open" data-id="${m.id}">
        <span class="ib-from">${m.star ? icon('i-star', 'ic star-on') : ''}${esc(m.from)}</span><span class="ib-time">${ago(m.t)}</span>
        <span class="ib-subj">${esc(m.subject)}</span><span class="ib-tag t-${m.tag}">${m.tag}</span></button></li>`).join('')
      : `<li class="ib-empty">${icon('i-inbox')}<span>${mails.length ? 'No messages match.' : 'No messages yet.'}</span></li>`;
    const m = mails.find((x) => x.id === inbox.sel);
    $('#ibMain').classList.toggle('reading', !!m);
    $('#ibRead').innerHTML = m ? `<div class="ib-read-top"><button class="icon-btn sm ib-back" data-act="ib-back" aria-label="Back to list">${icon('i-left')}</button>
        <div class="ib-read-acts"><button class="icon-btn sm ${m.star ? 'on' : ''}" data-act="ib-star" data-id="${m.id}" aria-label="${m.star ? 'Unstar' : 'Star'} message" aria-pressed="${m.star}">${icon('i-star')}</button><button class="icon-btn sm" data-act="ib-del" data-id="${m.id}" aria-label="Delete message">${icon('i-trash')}</button></div></div>
        <h3 class="ib-h">${esc(m.subject)}</h3>
        <p class="ib-meta"><b>${esc(m.from)}</b> &lt;${esc(m.addr)}&gt; · to ${esc(inbox.email)} · ${fmtDate(m.t)}</p>
        <div class="mail-body">${m.html}</div>`
      : `<div class="ib-placeholder">${icon('i-inbox')}<p>Select a message to read it.</p><small class="muted">${unreadFor(inbox.email)} unread</small></div>`;
  }

  /* =========================================================
     DATABELL STORE — catalogue
     ========================================================= */
  const CATS = [['all', 'All'], ['software', 'Software'], ['services', 'Services'], ['learning', 'Learning'], ['hardware', 'Hardware'], ['merch', 'Merch']];
  const LICENCE = (base) => ({ label: 'Licence', choices: [{ name: 'Starter · 1 seat', add: 0 }, { name: 'Team · 10 seats', add: base * 4 }, { name: 'Business · 50 seats', add: base * 14 }] });
  const PRODUCTS = [
    { id: 'nova', name: 'Nova Platform', cat: 'software', div: 'DatabellSoftwareLabs', icon: 'i-layers', price: 49, rating: 4.9, reviews: 1284, pop: 98, badge: 'Bestseller', key: 'NOVA', desc: 'The operations suite behind 2,300 retailers — inventory, orders, invoicing and analytics in one multi-tenant platform.', features: ['Inventory & order management', 'Built-in invoicing and tax', 'Real-time dashboards', 'SSO and role-based access'], opts: LICENCE(49) },
    { id: 'sentinel', name: 'Sentinel Vision SDK', cat: 'software', div: 'DatabellSoftwareLabs', icon: 'i-eye', price: 299, rating: 4.8, reviews: 412, pop: 86, badge: 'New', key: 'SNTL', desc: 'Computer-vision quality inspection that flags defects in under 80 ms, on the edge or in the cloud.', features: ['Pre-trained defect models', 'Edge and cloud runtimes', 'Python & C++ bindings', 'Model retraining studio'], opts: LICENCE(299) },
    { id: 'pulse', name: 'Pulse Health SDK', cat: 'software', div: 'DatabellSoftwareLabs', icon: 'i-mobile', price: 149, rating: 4.7, reviews: 233, pop: 72, key: 'PULS', desc: 'Secure messaging, scheduling and patient records components for iOS and Android apps.', features: ['End-to-end encrypted chat', 'Appointment booking UI', 'Offline-first sync', 'HIPAA-ready audit log'], opts: LICENCE(149) },
    { id: 'dataflow', name: 'DataFlow Pipelines', cat: 'software', div: 'DatabellSoftwareLabs', icon: 'i-data', price: 89, rating: 4.8, reviews: 519, pop: 81, key: 'DFLW', desc: 'Visual and code-first data pipelines with scheduling, lineage and 140+ connectors.', features: ['140+ source connectors', 'Column-level lineage', 'Schedules & triggers', 'Git-backed projects'], opts: LICENCE(89) },
    { id: 'devkit', name: 'Labs DevOps Toolkit', cat: 'software', div: 'DatabellSoftwareLabs', icon: 'i-terminal', price: 59, rating: 4.6, reviews: 341, pop: 69, key: 'DOPS', desc: 'Pipelines, preview environments and release dashboards used by the Labs squads themselves.', features: ['CI/CD templates', 'Preview environments', 'Release health dashboard', 'Slack & Teams alerts'], opts: LICENCE(59) },
    { id: 'audit', name: 'Cloud Cost Audit', cat: 'services', div: 'TechEnhance', icon: 'i-chart', price: 1490, rating: 4.9, reviews: 96, pop: 77, badge: 'Popular', service: true, desc: 'A 10-day TechEnhance review of your cloud bill with a ranked savings plan. Typical savings: 20–35%.', features: ['Full billing and usage analysis', 'Rightsizing recommendations', 'Savings-plan modelling', 'Executive summary call'], opts: { label: 'Cloud estate', choices: [{ name: 'Up to $25K/mo spend', add: 0 }, { name: 'Up to $100K/mo spend', add: 1500 }, { name: 'Over $100K/mo spend', add: 3500 }] } },
    { id: 'harden', name: 'Security Hardening Pack', cat: 'services', div: 'TechEnhance', icon: 'i-shield', price: 2400, rating: 4.8, reviews: 58, pop: 64, service: true, desc: 'Zero-trust review, secrets clean-up and CIS benchmark fixes delivered by TechEnhance engineers.', features: ['Threat-model workshop', 'Secrets & IAM clean-up', 'CIS benchmark remediation', 'Pen-test retest included'] },
    { id: 'tuneup', name: 'Performance Tune-up', cat: 'services', div: 'TechEnhance', icon: 'i-bolt', price: 990, rating: 4.7, reviews: 121, pop: 70, service: true, desc: 'Two engineers, one week: profiling, caching and database tuning against your real traffic.', features: ['Profiling & flame graphs', 'Query and index tuning', 'CDN and cache strategy', 'Before/after report'] },
    { id: 'mlcourse', name: 'Applied Machine Learning', cat: 'learning', div: 'TechKnowledge', icon: 'i-brain', price: 129, rating: 4.9, reviews: 2210, pop: 95, badge: 'Bestseller', voucher: true, desc: '32 hours of hands-on ML — from data prep to deploying models — with graded labs and a certificate.', features: ['48 lessons, 12 labs', 'Graded capstone project', 'Verifiable certificate', 'Lifetime access'] },
    { id: 'cloudcert', name: 'Cloud Architect Certification', cat: 'learning', div: 'TechKnowledge', icon: 'i-cloud', price: 199, rating: 4.8, reviews: 876, pop: 88, voucher: true, desc: 'Exam voucher plus a 40-hour prep track mapped to AWS, Azure and GCP architect objectives.', features: ['Exam voucher included', '40-hour prep track', '3 full practice exams', 'Free retake if needed'] },
    { id: 'allaccess', name: 'TechKnowledge All-Access', cat: 'learning', div: 'TechKnowledge', icon: 'i-book', price: 399, rating: 4.9, reviews: 1503, pop: 92, badge: 'Best value', voucher: true, desc: 'Every TechKnowledge course, lab and certification track for a full year.', features: ['All 60+ courses', 'Unlimited labs', 'Two exam vouchers', 'Mentor office hours'], opts: { label: 'Plan', choices: [{ name: '1 year', add: 0 }, { name: '2 years', add: 299 }] } },
    { id: 'bootcamp', name: 'Team Bootcamp · 10 seats', cat: 'learning', div: 'TechKnowledge', icon: 'i-users', price: 2900, rating: 4.8, reviews: 74, pop: 58, voucher: true, desc: 'A live, instructor-led 4-week bootcamp for your team on cloud, DevOps or AI.', features: ['Live instructor sessions', 'Custom track for your stack', 'Progress dashboard', 'Certificates for all seats'], opts: { label: 'Track', choices: [{ name: 'Cloud & DevOps', add: 0 }, { name: 'Applied AI', add: 400 }, { name: 'Secure coding', add: 0 }] } },
    { id: 'edgeai', name: 'Edge AI Dev Kit', cat: 'hardware', div: 'Databell', icon: 'i-cpu', price: 249, rating: 4.7, reviews: 389, pop: 83, badge: 'New', ship: true, stock: 14, desc: 'An 8-TOPS edge module with camera, pre-loaded Sentinel Vision samples and a 12-month SDK licence.', features: ['8 TOPS NPU', '4K camera module', 'Wi-Fi 6 & Ethernet', 'Sentinel SDK licence included'] },
    { id: 'iotkit', name: 'IoT Sensor Starter Kit', cat: 'hardware', div: 'Databell', icon: 'i-globe', price: 119, rating: 4.6, reviews: 244, pop: 74, ship: true, stock: 6, desc: 'Six wireless sensors, a gateway and a DataFlow connector to stream readings in minutes.', features: ['Temperature, motion, light & more', 'LoRa + BLE gateway', 'DataFlow connector', '2-year battery life'] },
    { id: 'hoodie', name: 'Databell Hoodie', cat: 'merch', div: 'Databell', icon: 'i-shirt', price: 59, rating: 4.8, reviews: 612, pop: 79, ship: true, stock: 40, desc: 'Heavyweight organic-cotton hoodie with the Databell BDAI wordmark embroidered in white.', features: ['400 gsm organic cotton', 'Embroidered wordmark', 'Unisex relaxed fit'], opts: { label: 'Size', choices: ['S', 'M', 'L', 'XL'].map((s) => ({ name: s, add: 0 })) } },
    { id: 'mug', name: 'Commit Mug', cat: 'merch', div: 'Databell', icon: 'i-coffee', price: 18, rating: 4.7, reviews: 905, pop: 66, ship: true, stock: 0, desc: 'Ceramic mug printed with `git commit -m "coffee"`. Dishwasher safe.', features: ['350 ml ceramic', 'Dishwasher safe', 'Printed both sides'] },
    { id: 'stickers', name: 'Sticker Pack', cat: 'merch', div: 'Databell', icon: 'i-tag', price: 8, rating: 4.9, reviews: 1320, pop: 73, ship: true, stock: 120, desc: 'Ten holographic stickers: Databell, SoftwareLabs, TechEnhance, TechKnowledge and more.', features: ['10 holographic stickers', 'Weatherproof vinyl', 'Laptop friendly'] }
  ];
  const P = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const REVIEWERS = [['Priya S.', 'Setup took minutes and support answered within the hour.'], ['Tom W.', 'Exactly what our team needed. Licence key arrived instantly.'], ['Aisha K.', 'Great value — we already see the difference.'], ['Diego R.', 'Solid quality, clear docs, no surprises.'], ['Mei L.', 'Would buy again. The PIN-confirmed checkout feels secure.'], ['Noah B.', 'Better than the alternatives we tried.']];

  const DAY = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  const DEAL_POOL = ['sentinel', 'mlcourse', 'edgeai', 'dataflow', 'cloudcert', 'tuneup', 'hoodie'];
  const dealId = DEAL_POOL[DAY % DEAL_POOL.length];
  const DEAL_OFF = 0.25;
  const stockOf = (p) => (p.ship ? (db.stock[p.id] !== undefined ? db.stock[p.id] : p.stock) : Infinity);
  const unitPrice = (p, opt = 0) => {
    const add = (p.opts && p.opts.choices[opt]) ? p.opts.choices[opt].add : 0;
    return round2((p.price + add) * (p.id === dealId ? 1 - DEAL_OFF : 1));
  };
  const optLabel = (p, opt) => (p.opts && p.opts.choices[opt] ? `${p.opts.label}: ${p.opts.choices[opt].name}` : '');
  const stars = (r) => `<span class="stars" style="--r:${(r / 5) * 100}%" aria-label="Rated ${r} out of 5"></span>`;
  const artHTML = (p, cls = '') => `<div class="art art-${p.cat} ${cls}">${icon(p.icon)}</div>`;

  /* ---------- Store: grid ---------- */
  const shop = { cat: 'all', q: '', sort: 'featured', max: 3000, stock: false, wish: false };
  function shopList() {
    const q = shop.q.toLowerCase();
    let list = PRODUCTS.filter((p) => (shop.cat === 'all' || p.cat === shop.cat)
      && unitPrice(p) <= shop.max
      && (!shop.stock || stockOf(p) > 0)
      && (!shop.wish || db.wishlist.includes(p.id))
      && (!q || `${p.name} ${p.div} ${p.cat} ${p.desc} ${p.features.join(' ')}`.toLowerCase().includes(q)));
    const by = {
      'price-asc': (a, b) => unitPrice(a) - unitPrice(b),
      'price-desc': (a, b) => unitPrice(b) - unitPrice(a),
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      popular: (a, b) => b.pop - a.pop,
      name: (a, b) => a.name.localeCompare(b.name),
      featured: (a, b) => (b.id === dealId) - (a.id === dealId) || (!!b.badge) - (!!a.badge) || b.pop - a.pop
    }[shop.sort];
    return list.sort(by);
  }
  function stockLine(p) {
    if (!p.ship) return `<span class="stock ok">${icon(p.service ? 'i-users' : 'i-inbox')} ${p.service ? 'Booked by our team' : 'Instant digital delivery'}</span>`;
    const s = stockOf(p);
    if (s <= 0) return `<span class="stock out">${icon('i-x')} Out of stock</span>`;
    if (s <= 8) return `<span class="stock low">${icon('i-alert')} Only ${s} left</span>`;
    return `<span class="stock ok">${icon('i-truck')} In stock · ships in 1–2 days</span>`;
  }
  function renderShop() { keepFocus($('#shopGrid'), () => renderShopNow()); }
  function renderShopNow() {
    const grid = $('#shopGrid');
    if (!grid) return;
    const list = shopList();
    grid.innerHTML = list.map((p, i) => {
      const deal = p.id === dealId;
      const out = stockOf(p) <= 0;
      const wished = db.wishlist.includes(p.id);
      return `<article class="pcard ${out ? 'is-out' : ''}" style="--i:${i}" data-id="${p.id}">
        <button class="pc-art" data-act="quick" data-id="${p.id}" aria-label="Quick view: ${esc(p.name)}">${artHTML(p)}${p.badge ? `<span class="pc-badge">${p.badge}</span>` : ''}${deal ? `<span class="pc-deal">−${DEAL_OFF * 100}% today</span>` : ''}</button>
        <button class="pc-wish ${wished ? 'on' : ''}" data-act="wish" data-id="${p.id}" aria-pressed="${wished}" aria-label="${wished ? 'Remove from' : 'Save to'} wishlist">${icon('i-heart')}</button>
        <div class="pc-body">
          <span class="pc-div">${p.div}</span>
          <h4><button class="link-plain" data-act="quick" data-id="${p.id}">${esc(p.name)}</button></h4>
          <div class="pc-rating">${stars(p.rating)}<small>${p.rating} · ${p.reviews.toLocaleString()} reviews</small></div>
          ${stockLine(p)}
          <div class="pc-bottom">
            <div class="price-tag">${deal ? `<s>${money(p.price)}</s>` : ''}<b>${p.opts ? '<small>from </small>' : ''}${money(unitPrice(p))}</b></div>
            <button class="btn btn-primary btn-sm" data-act="add" data-id="${p.id}" ${out ? 'disabled' : ''} aria-label="Add ${esc(p.name)} to cart">${icon('i-cart')}<span>${out ? 'Sold out' : 'Add'}</span></button>
          </div>
        </div>
      </article>`;
    }).join('');
    $('#shopCount').textContent = `${list.length} of ${PRODUCTS.length} products`;
    $('#shopEmpty').hidden = list.length > 0;
    renderRecent();
  }
  function renderRecent() {
    const el = $('#recent');
    const ids = db.recent.filter((id) => P[id]);
    el.hidden = !ids.length;
    el.innerHTML = ids.length ? `<span class="muted small">${icon('i-history')} Recently viewed</span>${ids.map((id) => `<button class="recent-chip" data-act="quick" data-id="${id}">${icon(P[id].icon)}${esc(P[id].name)}</button>`).join('')}` : '';
  }
  function renderDeal() {
    const p = P[dealId];
    const el = $('#deal');
    el.innerHTML = `<div class="deal-tag">${icon('i-bolt')} Deal of the day</div>
      <div class="deal-main">${artHTML(p, 'sm')}<div><b>${esc(p.name)}</b><div class="price-tag"><s>${money(p.price)}</s><b>${money(unitPrice(p))}</b></div><small class="muted">${p.div}</small></div></div>
      <div class="deal-timer" aria-label="Time left"><span id="dH">00</span><i>:</i><span id="dM">00</span><i>:</i><span id="dS">00</span></div>
      <button class="btn btn-primary btn-sm btn-block" data-act="quick" data-id="${p.id}">View deal ${icon('i-arrow')}</button>`;
    const tick = () => {
      const now = new Date();
      const end = new Date(now); end.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((end - now) / 1000));
      $('#dH').textContent = String(Math.floor(s / 3600)).padStart(2, '0');
      $('#dM').textContent = String(Math.floor(s / 60) % 60).padStart(2, '0');
      $('#dS').textContent = String(s % 60).padStart(2, '0');
    };
    tick();
    setInterval(tick, 1000);
  }
  function initShop() {
    $('#shopCats').innerHTML = CATS.map(([k, n]) => `<button class="chip-btn ${k === 'all' ? 'active' : ''}" role="tab" aria-selected="${k === 'all'}" data-cat="${k}">${n}</button>`).join('');
    $('#shopCats').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      shop.cat = b.dataset.cat;
      $$('#shopCats .chip-btn').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', String(x === b)); });
      renderShop();
    });
    let t;
    $('#shopSearch').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { shop.q = e.target.value.trim(); renderShop(); }, 120); });
    $('#shopSort').addEventListener('change', (e) => { shop.sort = e.target.value; renderShop(); });
    const max = $('#shopMax');
    const updMax = () => { shop.max = +max.value; $('#maxOut').textContent = money0(shop.max); paintRange(max); };
    max.addEventListener('input', () => { updMax(); renderShop(); });
    updMax();
    $('#shopStock').addEventListener('change', (e) => { shop.stock = e.target.checked; renderShop(); });
    $('#shopWish').addEventListener('change', (e) => { shop.wish = e.target.checked; renderShop(); });
    $('#shopReset').addEventListener('click', () => {
      Object.assign(shop, { cat: 'all', q: '', sort: 'featured', max: 3000, stock: false, wish: false });
      $('#shopSearch').value = ''; $('#shopSort').value = 'featured'; max.value = 3000; updMax();
      $('#shopStock').checked = false; $('#shopWish').checked = false;
      $$('#shopCats .chip-btn').forEach((x, i) => { x.classList.toggle('active', i === 0); x.setAttribute('aria-selected', String(i === 0)); });
      renderShop();
    });
    renderDeal();
    renderShop();
  }

  function toggleWish(id) {
    const i = db.wishlist.indexOf(id);
    if (i >= 0) { db.wishlist.splice(i, 1); toast(`Removed ${P[id].name} from wishlist`, 'i-heart'); }
    else { db.wishlist.push(id); toast(`Saved ${P[id].name} to wishlist`, 'i-heart'); }
    saveDB();
    renderShop();
    if (Overlay.isOpen('productOv')) renderProduct();
    if (Overlay.isOpen('acctOv')) renderAccount();
  }

  /* ---------- Cart ---------- */
  const cartQty = () => db.cart.reduce((n, c) => n + c.qty, 0);
  function addToCart(id, opt = 0, qty = 1, silent) {
    const p = P[id];
    if (!p) return false;
    const key = `${id}|${opt}`;
    const line = db.cart.find((c) => c.key === key);
    const inCart = db.cart.filter((c) => c.id === id).reduce((n, c) => n + c.qty, 0);
    const room = Math.min(99, stockOf(p)) - inCart;
    if (room <= 0) { toast(stockOf(p) <= 0 ? `${p.name} is out of stock` : `No more ${p.name} available`, 'i-alert'); return false; }
    const add = Math.min(qty, room);
    if (line) line.qty += add; else db.cart.push({ key, id, opt, qty: add });
    saveDB();
    refreshBadges();
    const btn = $('#cartBtn');
    btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
    if (!silent) toast(`Added ${add > 1 ? add + ' × ' : ''}${p.name} to cart`, 'i-cart');
    if (Overlay.isOpen('cartOv')) renderCart();
    return true;
  }
  const COUPONS = {
    WELCOME10: { label: '10% off everything', apply: (lines, sub) => ({ discount: sub * 0.1 }) },
    LABS20: { label: '20% off DatabellSoftwareLabs software', apply: (lines) => { const s = lines.filter((l) => l.p.cat === 'software').reduce((a, l) => a + l.line, 0); return s ? { discount: s * 0.2 } : { error: 'LABS20 needs a software licence in your cart.' }; } },
    BDAI15: { label: '15% off orders of $200+', apply: (lines, sub) => (sub >= 200 ? { discount: sub * 0.15 } : { error: `BDAI15 needs a $200 subtotal (${money(200 - sub)} to go).` }) },
    FREESHIP: { label: 'Free shipping', apply: (lines) => (lines.some((l) => l.p.ship) ? { freeShip: true } : { error: 'FREESHIP applies to hardware and merch.' }) }
  };
  function totals(extra = {}) {
    const acc = me();
    const lines = db.cart.map((c) => {
      const p = P[c.id];
      if (!p) return null;
      const unit = unitPrice(p, c.opt);
      return Object.assign({}, c, { p, unit, line: round2(unit * c.qty) });
    }).filter(Boolean);
    const sub = round2(lines.reduce((a, l) => a + l.line, 0));
    const physical = lines.some((l) => l.p.ship);
    let discount = 0, freeShip = false, couponError = '';
    const c = db.coupon && COUPONS[db.coupon];
    if (c) { const r = c.apply(lines, sub); discount = r.discount || 0; freeShip = !!r.freeShip; couponError = r.error || ''; }
    discount = round2(Math.min(discount, sub));
    const after = round2(sub - discount);
    let ship = 0;
    if (physical && !freeShip) ship = after >= 150 ? 0 : 12;
    if (physical && extra.express && !(acc && tierOf(acc).name === 'Architect')) ship += 15;
    const tax = round2(after * 0.08);
    const total = round2(after + ship + tax);
    const pts = acc ? acc.points : 0;
    const pointsValue = extra.usePoints ? round2(Math.min(Math.floor(pts) / 100, total)) : 0;
    const due = round2(total - pointsValue);
    const earn = acc ? Math.floor(total * tierOf(acc).mult) : Math.floor(total);
    return { lines, sub, discount, ship, tax, total, physical, pointsValue, due, earn, couponError, freeLeft: physical && !freeShip && after < 150 ? round2(150 - after) : 0, after };
  }
  function renderCart() { keepFocus($('#cartBody'), () => renderCartNow()); }
  function renderCartNow() {
    const t = totals();
    const body = $('#cartBody');
    body.innerHTML = `<div class="drawer-head">${icon('i-cart')}<h3>Your cart <span class="muted">(${cartQty()})</span></h3><button class="icon-btn" data-ov-close aria-label="Close cart">${icon('i-x')}</button></div>
      <div class="drawer-body">
        ${t.lines.length ? `<ul class="cart-list">${t.lines.map((l) => `<li class="cart-item">
            ${artHTML(l.p, 'thumb')}
            <div class="ci-main"><b>${esc(l.p.name)}</b><small>${esc(optLabel(l.p, l.opt) || l.p.div)}</small>
              <div class="qty" aria-label="Quantity"><button data-act="dec" data-key="${l.key}" aria-label="Decrease">${icon('i-minus')}</button><span>${l.qty}</span><button data-act="inc" data-key="${l.key}" aria-label="Increase">${icon('i-plus')}</button></div></div>
            <div class="ci-right"><b>${money(l.line)}</b><button class="icon-btn sm" data-act="rm" data-key="${l.key}" aria-label="Remove ${esc(l.p.name)}">${icon('i-trash')}</button></div>
          </li>`).join('')}</ul>
          ${t.freeLeft ? `<div class="ship-meter"><small>Add <b>${money(t.freeLeft)}</b> for free shipping</small><div class="bar"><i style="width:${Math.min(100, (t.after / 150) * 100)}%"></i></div></div>` : t.physical ? `<div class="ship-meter ok"><small>${icon('i-truck')} Free shipping unlocked</small></div>` : ''}
          ${db.coupon ? `<div class="coupon-on">${icon('i-tag')}<span><b>${esc(db.coupon)}</b><small>${COUPONS[db.coupon].label}</small></span><button class="link-btn small" data-act="coupon-rm">Remove</button></div>${t.couponError ? `<p class="form-err">${esc(t.couponError)}</p>` : ''}`
            : `<form class="coupon" id="couponForm" novalidate><input name="code" placeholder="Coupon code" aria-label="Coupon code" class="upper" autocomplete="off"><button class="btn btn-ghost btn-sm">Apply</button></form><p class="muted small">Try <button class="link-btn small" data-act="coupon-try" data-code="WELCOME10">WELCOME10</button>, <button class="link-btn small" data-act="coupon-try" data-code="LABS20">LABS20</button> or <button class="link-btn small" data-act="coupon-try" data-code="BDAI15">BDAI15</button></p>`}
          <dl class="sum">
            <div><dt>Subtotal</dt><dd>${money(t.sub)}</dd></div>
            ${t.discount ? `<div class="disc"><dt>Discount</dt><dd>−${money(t.discount)}</dd></div>` : ''}
            ${t.physical ? `<div><dt>Shipping</dt><dd>${t.ship ? money(t.ship) : 'Free'}</dd></div>` : ''}
            <div><dt>Tax (8%)</dt><dd>${money(t.tax)}</dd></div>
            <div class="grand"><dt>Total</dt><dd>${money(t.total)}</dd></div>
          </dl>`
        : `<div class="empty-state">${icon('i-cart')}<b>Your cart is empty</b><p class="muted small">Browse software, services, courses and hardware in the Databell Store.</p><button class="btn btn-ghost btn-sm" data-act="go-shop">Browse the store</button></div>`}
      </div>
      ${t.lines.length ? `<div class="drawer-foot"><button class="btn btn-primary btn-block" data-act="checkout">${icon('i-lock')} Checkout · ${money(t.total)}</button><small class="muted">Earn ~${t.earn.toLocaleString()} Databell Points with this order</small></div>` : ''}`;
    const cf = $('#couponForm');
    if (cf) cf.addEventListener('submit', (e) => { e.preventDefault(); applyCoupon(cf.code.value); });
  }
  function applyCoupon(code) {
    const c = String(code).trim().toUpperCase();
    if (!COUPONS[c]) { toast('That coupon code is not valid', 'i-alert'); return; }
    db.coupon = c;
    saveDB();
    renderCart();
    const t = totals();
    toast(t.couponError ? `${c} saved — ${t.couponError}` : `${c} applied · ${COUPONS[c].label}`, t.couponError ? 'i-alert' : 'i-tag');
  }
  function openCart() { Overlay.open('cartOv'); renderCart(); }

  /* ---------- Product quick view ---------- */
  const pm = { id: null, opt: 0, qty: 1 };
  function openProduct(id) {
    Object.assign(pm, { id, opt: 0, qty: 1 });
    db.recent = [id].concat(db.recent.filter((x) => x !== id)).slice(0, 6);
    saveDB();
    Overlay.open('productOv');
    renderProduct();
    renderRecent();
  }
  function renderProduct() { keepFocus($('#productBody'), () => renderProductNow()); }
  function renderProductNow() {
    const p = P[pm.id];
    const s = stockOf(p);
    const maxQ = Math.max(1, Math.min(99, s));
    const deal = p.id === dealId;
    const wished = db.wishlist.includes(p.id);
    const revs = [0, 1].map((k) => REVIEWERS[(p.id.length * 3 + k * 2 + p.reviews) % REVIEWERS.length]);
    $('#productBody').innerHTML = `<button class="icon-btn ov-x" data-ov-close aria-label="Close">${icon('i-x')}</button>
      <div class="pm">
        <div class="pm-art">${artHTML(p, 'lg')}${p.badge ? `<span class="pc-badge">${p.badge}</span>` : ''}${deal ? `<span class="pc-deal">−${DEAL_OFF * 100}% today</span>` : ''}</div>
        <div class="pm-info">
          <span class="pc-div">${p.div}</span>
          <h3 id="pmTitle">${esc(p.name)}</h3>
          <div class="pc-rating">${stars(p.rating)}<small>${p.rating} · ${p.reviews.toLocaleString()} reviews · ${p.pop}% recommend</small></div>
          <p class="muted">${esc(p.desc)}</p>
          <ul class="tick-list">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          ${p.opts ? `<fieldset class="opts"><legend>${p.opts.label}</legend>${p.opts.choices.map((c, i) => `<label class="opt"><input type="radio" name="pmopt" value="${i}" ${i === pm.opt ? 'checked' : ''}><span>${esc(c.name)}<small>${c.add ? '+' + money0(c.add * (deal ? 1 - DEAL_OFF : 1)) : 'Included'}</small></span></label>`).join('')}</fieldset>` : ''}
          <div class="pm-buy">
            <div class="qty big"><button data-act="pm-dec" aria-label="Decrease quantity">${icon('i-minus')}</button><span id="pmQty">${pm.qty}</span><button data-act="pm-inc" aria-label="Increase quantity" ${pm.qty >= maxQ ? 'disabled' : ''}>${icon('i-plus')}</button></div>
            <div class="price-tag lg">${deal ? `<s>${money((p.price + (p.opts ? p.opts.choices[pm.opt].add : 0)) * pm.qty)}</s>` : ''}<b>${money(unitPrice(p, pm.opt) * pm.qty)}</b></div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" data-act="pm-add" ${s <= 0 ? 'disabled' : ''}>${icon('i-cart')} Add to cart</button>
            <button class="btn btn-ghost" data-act="pm-buy" ${s <= 0 ? 'disabled' : ''}>${icon('i-bolt')} Buy now</button>
            <button class="icon-btn ${wished ? 'on' : ''}" data-act="wish" data-id="${p.id}" aria-pressed="${wished}" aria-label="${wished ? 'Remove from' : 'Save to'} wishlist">${icon('i-heart')}</button>
          </div>
          <p class="pm-meta">${stockLine(p)}${p.ship ? '' : `<span class="stock">${icon('i-key')} ${p.service ? 'Booking reference sent to your inbox' : p.voucher ? 'Access voucher sent to your inbox' : 'Licence key sent to your inbox'}</span>`}</p>
          <div class="reviews"><h4>Recent reviews</h4>${revs.map(([n, t], k) => `<blockquote><div>${stars(5 - k * 0.5)}<b>${n}</b></div><p>${t}</p></blockquote>`).join('')}</div>
        </div>
      </div>`;
    $$('input[name="pmopt"]', $('#productBody')).forEach((r) => r.addEventListener('change', () => { pm.opt = +r.value; renderProduct(); }));
  }

  /* =========================================================
     CHECKOUT & ORDERS
     ========================================================= */
  let co = null;
  const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Germany', 'Singapore', 'United Arab Emirates', 'Canada', 'Australia'];
  function openCheckout() {
    if (!db.cart.length) { toast('Your cart is empty', 'i-cart'); return; }
    requireUnlocked(() => {
      const acc = me();
      co = { step: 'review', express: false, usePoints: false, addr: { name: `${acc.first} ${acc.last}`, line: '', city: '', zip: '', country: 'India' }, order: null };
      Overlay.close('cartOv');
      Overlay.close('productOv');
      Overlay.open('checkoutOv');
      renderCheckout();
    });
  }
  function coSteps() { return totals().physical ? ['review', 'delivery', 'payment'] : ['review', 'payment']; }
  function renderCheckout() { keepFocus($('#checkoutBody'), () => renderCheckoutNow()); }
  function renderCheckoutNow() {
    const acc = me();
    if (!acc || !co) return;
    const t = totals({ express: co.express, usePoints: co.usePoints });
    const steps = coSteps();
    const names = { review: 'Review', delivery: 'Delivery', payment: 'Payment' };
    const head = `<div class="co-head"><h3 id="coTitle">${icon('i-lock')} Secure checkout</h3><button class="icon-btn" data-ov-close aria-label="Close checkout">${icon('i-x')}</button></div>`;
    if (co.step === 'done') {
      const o = co.order;
      const keys = o.items.filter((i) => i.keys.length);
      $('#checkoutBody').innerHTML = `${head}<div class="co-done">
        <div class="done-check">${icon('i-check')}</div>
        <h3>Order confirmed</h3>
        <p class="muted">Order <b>#${o.id}</b> · ${money(o.total)} paid${o.pointsUsed ? ` (incl. ${o.pointsUsed.toLocaleString()} points)` : ''} · +${o.earned.toLocaleString()} points earned</p>
        ${keys.length ? `<div class="co-keys"><h4>${icon('i-key')} Your keys & references</h4>${keys.map((i) => i.keys.map((k) => `<div class="lic"><span>${esc(i.name)}</span><code>${k}</code><button class="icon-btn sm" data-copy="${k}" aria-label="Copy">${icon('i-copy')}</button></div>`).join('')).join('')}</div>` : ''}
        <p class="muted small">${icon('i-inbox')} A receipt${keys.length ? ' with these keys' : ''} was sent to ${esc(acc.email)}.${o.physical ? ' We’ll email you when it ships.' : ''}</p>
        <div class="btn-row center"><button class="btn btn-ghost" data-act="co-orders">${icon('i-box')} View orders</button><button class="btn btn-ghost" data-act="open-inbox">${icon('i-inbox')} Open inbox</button><button class="btn btn-primary" data-act="co-close">Keep shopping</button></div>
      </div>`;
      return;
    }
    const idx = steps.indexOf(co.step);
    const bar = `<ol class="co-steps">${steps.map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'on' : ''}">${i < idx ? icon('i-check') : `<b>${i + 1}</b>`}${names[s]}</li>`).join('')}</ol>`;
    let main = '';
    if (co.step === 'review') {
      main = `<h4>Items</h4><ul class="co-items">${t.lines.map((l) => `<li>${artHTML(l.p, 'thumb')}<span><b>${esc(l.p.name)}</b><small>${esc(optLabel(l.p, l.opt) || l.p.div)} · qty ${l.qty}</small></span><b>${money(l.line)}</b></li>`).join('')}</ul>
        <button class="link-btn small" data-act="co-cart">${icon('i-cart')} Edit cart</button>
        <div class="btn-row end"><button class="btn btn-primary" data-act="co-next">Continue ${icon('i-arrow')}</button></div>`;
    } else if (co.step === 'delivery') {
      const a = co.addr;
      const arch = tierOf(acc).name === 'Architect';
      main = `<form id="fDelivery" class="auth-form" novalidate>
        <label class="field"><span>Full name</span><input name="name" value="${esc(a.name)}" autocomplete="name" required></label>
        <label class="field"><span>Address</span><input name="line" value="${esc(a.line)}" autocomplete="street-address" required></label>
        <div class="form-row"><label class="field"><span>City</span><input name="city" value="${esc(a.city)}" autocomplete="address-level2" required></label><label class="field"><span>Postal code</span><input name="zip" value="${esc(a.zip)}" autocomplete="postal-code" required></label></div>
        <label class="field"><span>Country</span><select name="country">${COUNTRIES.map((c) => `<option ${c === a.country ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <fieldset class="opts"><legend>Delivery speed</legend>
          <label class="opt"><input type="radio" name="speed" value="std" ${co.express ? '' : 'checked'}><span>Standard · 3–5 business days<small>${t.ship && !co.express ? money(t.ship) : 'Free'}</small></span></label>
          <label class="opt"><input type="radio" name="speed" value="exp" ${co.express ? 'checked' : ''}><span>Express · 1–2 business days<small>${arch ? 'Free for Architects' : '+$15.00'}</small></span></label>
        </fieldset>
        <p class="form-err" role="alert"></p>
        <div class="btn-row between"><button type="button" class="btn btn-ghost" data-act="co-back">Back</button><button class="btn btn-primary">Continue ${icon('i-arrow')}</button></div>
      </form>`;
    } else {
      const short = round2(t.due - acc.wallet);
      main = `<div class="wallet-card">${icon('i-wallet')}<div><small>Databell Wallet</small><strong>${money(acc.wallet)}</strong></div>${short > 0 ? `<span class="pill warn">Short ${money(short)}</span>` : `<span class="pill ok">Enough balance</span>`}</div>
        <label class="row-toggle"><input type="checkbox" id="usePoints" ${co.usePoints ? 'checked' : ''} ${acc.points < 100 ? 'disabled' : ''}><span><b>Use Databell Points</b><small>${acc.points.toLocaleString()} points available · 100 points = $1</small></span><em>${co.usePoints ? '−' + money(t.pointsValue) : ''}</em></label>
        ${t.physical ? `<div class="co-addr">${icon('i-truck')}<span><b>${esc(co.addr.name)}</b><small>${esc(co.addr.line)}, ${esc(co.addr.city)} ${esc(co.addr.zip)}, ${esc(co.addr.country)} · ${co.express ? 'Express' : 'Standard'}</small></span><button class="link-btn small" data-act="co-back">Change</button></div>` : `<div class="co-addr">${icon('i-inbox')}<span><b>Digital delivery</b><small>Keys and receipts go to ${esc(acc.email)}</small></span></div>`}
        ${short > 0 ? `<p class="note small">${icon('i-alert')}<span>Your wallet is ${money(short)} short. <button class="link-btn small" data-act="co-topup" data-amt="${Math.ceil(short / 50) * 50}">Add ${money0(Math.ceil(short / 50) * 50)} demo credit</button></span></p>` : ''}
        <div class="btn-row between"><button class="btn btn-ghost" data-act="co-back">Back</button><button class="btn btn-primary" data-act="co-pay" ${short > 0 ? 'disabled' : ''}>${icon('i-lock')} Pay ${money(t.due)} with PIN</button></div>`;
    }
    $('#checkoutBody').innerHTML = `${head}${bar}<div class="co-grid"><div class="co-main">${main}</div>
      <aside class="co-sum"><h4>Order summary</h4><dl class="sum">
        <div><dt>Subtotal (${cartQty()} items)</dt><dd>${money(t.sub)}</dd></div>
        ${t.discount ? `<div class="disc"><dt>${esc(db.coupon)}</dt><dd>−${money(t.discount)}</dd></div>` : ''}
        ${t.physical ? `<div><dt>Shipping</dt><dd>${t.ship ? money(t.ship) : 'Free'}</dd></div>` : ''}
        <div><dt>Tax (8%)</dt><dd>${money(t.tax)}</dd></div>
        ${t.pointsValue ? `<div class="disc"><dt>Points</dt><dd>−${money(t.pointsValue)}</dd></div>` : ''}
        <div class="grand"><dt>To pay</dt><dd>${money(t.due)}</dd></div>
      </dl><p class="muted small">${icon('i-gift')} You'll earn ${t.earn.toLocaleString()} points (${tierOf(acc).name} ×${tierOf(acc).mult}).</p></aside></div>`;
    const fd = $('#fDelivery');
    if (fd) {
      $$('input[name="speed"]', fd).forEach((r) => r.addEventListener('change', () => { co.express = r.value === 'exp'; saveAddr(fd); renderCheckout(); }));
      fd.addEventListener('submit', (e) => {
        e.preventDefault();
        saveAddr(fd);
        const a = co.addr;
        if (!a.name || !a.line || !a.city || !a.zip) { $('.form-err', fd).textContent = 'Please complete your delivery address.'; return; }
        co.step = 'payment';
        renderCheckout();
      });
    }
    const up = $('#usePoints');
    if (up) up.addEventListener('change', () => { co.usePoints = up.checked; renderCheckout(); });
    if (co.lastStep !== co.step) { co.lastStep = co.step; const f = $('.co-main input, .co-main button', $('#checkoutBody')); if (f) f.focus({ preventScroll: true }); }
  }
  function saveAddr(f) { co.addr = { name: f.name.value.trim(), line: f.line.value.trim(), city: f.city.value.trim(), zip: f.zip.value.trim(), country: f.country.value }; }

  function keysFor(p, qty) {
    if (p.ship) return [];
    return Array.from({ length: p.service ? 1 : qty }, () => (p.service ? `TE-${randomFrom('0123456789', 6)}` : p.voucher ? `TK-${randomFrom(KEY_ALPHA, 4)}-${randomFrom(KEY_ALPHA, 4)}` : `${p.key}-${randomFrom(KEY_ALPHA, 4)}-${randomFrom(KEY_ALPHA, 4)}-${randomFrom(KEY_ALPHA, 4)}`));
  }
  async function payNow() {
    const acc = me();
    const t = totals({ express: co.express, usePoints: co.usePoints });
    if (t.due > acc.wallet) { toast('Not enough wallet balance', 'i-alert'); return; }
    const ok = await confirmPin(`Pay ${money(t.due)} to the Databell Store from your Databell Wallet.`, 'Confirm payment');
    if (!ok || !unlocked()) return;
    const tierBefore = tierOf(acc).name;
    const order = {
      id: 'DB-' + randomFrom('0123456789', 6), t: Date.now(),
      items: t.lines.map((l) => ({ id: l.id, name: l.p.name, cat: l.p.cat, opt: optLabel(l.p, l.opt), qty: l.qty, unit: l.unit, line: l.line, keys: keysFor(l.p, l.qty) })),
      sub: t.sub, discount: t.discount, coupon: db.coupon, ship: t.ship, tax: t.tax, total: t.total, pointsUsed: Math.round(t.pointsValue * 100), paid: t.due,
      earned: t.earn, physical: t.physical, express: co.express, addr: t.physical ? co.addr : null, mailed: 0
    };
    acc.wallet = round2(acc.wallet - t.due);
    acc.points = acc.points - order.pointsUsed + order.earned;
    acc.spent = round2(acc.spent + t.total);
    acc.orders.unshift(order);
    t.lines.forEach((l) => { if (l.p.ship) db.stock[l.id] = stockOf(l.p) - l.qty; });
    db.cart = [];
    db.coupon = null;
    logAct(acc, `Order #${order.id} paid · ${money(order.total)}`, 'i-cart');
    sendMail(acc.email, {
      from: 'Databell Store', addr: `store@${DOMAIN}`, tag: 'orders', subject: `Receipt for order #${order.id} · ${money(order.total)}`,
      html: mailShell(acc, `<p>Thanks for your order! Here's your receipt.</p>
        <table class="mail-table">${order.items.map((i) => `<tr><td>${esc(i.name)}${i.opt ? `<br><small>${esc(i.opt)}</small>` : ''} × ${i.qty}</td><td>${money(i.line)}</td></tr>`).join('')}
        ${order.discount ? `<tr><td>Discount (${esc(order.coupon)})</td><td>−${money(order.discount)}</td></tr>` : ''}
        ${order.physical ? `<tr><td>Shipping</td><td>${order.ship ? money(order.ship) : 'Free'}</td></tr>` : ''}
        <tr><td>Tax</td><td>${money(order.tax)}</td></tr>${order.pointsUsed ? `<tr><td>Points used</td><td>−${money(order.pointsUsed / 100)}</td></tr>` : ''}
        <tr class="tot"><td>Paid from wallet</td><td>${money(order.paid)}</td></tr></table>
        ${order.items.some((i) => i.keys.length) ? `<p><b>Your keys & references</b></p>${order.items.filter((i) => i.keys.length).map((i) => i.keys.map((k) => `<div class="mail-code sm"><span>${k}</span><small>${esc(i.name)}</small><button class="btn btn-ghost btn-sm" data-copy="${k}">${icon('i-copy')} Copy</button></div>`).join('')).join('')}` : ''}
        ${order.physical ? `<p>Shipping to ${esc(order.addr.name)}, ${esc(order.addr.city)}, ${esc(order.addr.country)} (${order.express ? 'Express' : 'Standard'}).</p>` : ''}
        <p>You earned <b>${order.earned.toLocaleString()} points</b>. Balance: ${acc.points.toLocaleString()} points.</p>`)
    });
    const tierAfter = tierOf(acc).name;
    if (tierAfter !== tierBefore) {
      logAct(acc, `Upgraded to ${tierAfter} membership`, 'i-award');
      sendMail(acc.email, { from: 'Databell Store', addr: `store@${DOMAIN}`, tag: 'updates', subject: `You're now a Databell ${tierAfter}!`, html: mailShell(acc, `<p>Your spending unlocked <b>${tierAfter}</b> membership: ${tierOf(acc).perk}.</p>`) });
      setTimeout(() => toast(`Upgraded to ${tierAfter} membership!`, 'i-award'), 1600);
    }
    saveDB();
    co.step = 'done';
    co.order = order;
    refreshAll();
    renderShop();
    renderCheckout();
    toast(`Payment confirmed · order #${order.id}`);
  }

  const STAGES = ['Placed', 'Processing', 'Shipped', 'Delivered'];
  const STAGE_AT = [0, 60, 180, 360]; // seconds — accelerated so you can watch an order move
  function stageOf(o) {
    if (!o.physical) return 3;
    const s = (Date.now() - o.t) / 1000 * (o.express ? 2 : 1);
    return STAGE_AT.filter((x) => s >= x).length - 1;
  }
  setInterval(() => {
    const acc = me();
    if (!acc) return;
    let changed = false;
    acc.orders.forEach((o) => {
      if (!o.physical) return;
      const st = stageOf(o);
      if (st >= 2 && o.mailed < st) {
        o.mailed = st;
        changed = true;
        sendMail(acc.email, {
          from: 'Databell Store', addr: `store@${DOMAIN}`, tag: 'orders',
          subject: st === 2 ? `Order #${o.id} has shipped` : `Order #${o.id} was delivered`,
          html: mailShell(acc, st === 2 ? `<p>Good news — your order is on its way via ${o.express ? 'Express' : 'Standard'} delivery.</p><p>Tracking: <b>DBX${o.id.slice(3)}${o.t.toString().slice(-4)}</b></p>` : `<p>Your order #${o.id} was delivered to ${esc(o.addr.city)}. Enjoy!</p>`)
        });
      }
    });
    if (changed) { saveDB(); if (Overlay.isOpen('acctOv')) renderAccount(); }
  }, 8000);

  /* =========================================================
     ACCOUNT DRAWER
     ========================================================= */
  let acctTab = 'overview';
  function openAccount(tab) {
    if (tab) acctTab = tab;
    Overlay.open('acctOv');
    renderAccount();
  }
  function scoreRing(score) {
    return `<div class="score-ring" style="--p:${score}" role="img" aria-label="Security score ${score} out of 100"><span>${score}</span></div>`;
  }
  function orderHTML(o) {
    const st = stageOf(o);
    const label = o.physical ? STAGES[st] : 'Delivered to inbox';
    return `<details class="order"><summary><span><b>#${o.id}</b><small>${fmtDate(o.t)} · ${o.items.reduce((n, i) => n + i.qty, 0)} items</small></span><span class="status s${st}">${label}</span><b>${money(o.total)}</b></summary>
      <div class="order-body">
        ${o.physical ? `<ol class="track">${STAGES.map((s, i) => `<li class="${i <= st ? 'on' : ''}"><i></i><span>${s}</span></li>`).join('')}</ol>` : ''}
        <ul class="o-items">${o.items.map((i) => `<li><span>${esc(i.name)}${i.opt ? ` <small>· ${esc(i.opt)}</small>` : ''} × ${i.qty}</span><b>${money(i.line)}</b>
          ${i.keys.map((k) => `<div class="lic"><code data-key="${k}">${k.slice(0, 5)}••••-••••</code><button class="link-btn small" data-act="reveal">Show</button><button class="icon-btn sm" data-copy="${k}" aria-label="Copy key">${icon('i-copy')}</button></div>`).join('')}</li>`).join('')}</ul>
        <dl class="sum sm"><div><dt>Paid from wallet</dt><dd>${money(o.paid)}</dd></div>${o.pointsUsed ? `<div><dt>Points used</dt><dd>${o.pointsUsed.toLocaleString()}</dd></div>` : ''}<div><dt>Points earned</dt><dd>+${o.earned.toLocaleString()}</dd></div></dl>
        <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="buy-again" data-order="${o.id}">${icon('i-refresh')} Buy again</button></div>
      </div></details>`;
  }
  function renderAccount() { keepFocus($('#acctBody'), () => renderAccountNow()); }
  function renderAccountNow() {
    const acc = me();
    if (!acc || !unlocked()) { Overlay.close('acctOv'); return; }
    const tier = tierOf(acc), next = nextTier(acc);
    const pct = next ? Math.min(100, ((acc.spent - tier.min) / (next.min - tier.min)) * 100) : 100;
    const sec = securityScore(acc);
    const unread = unreadFor(acc.email);
    const tabs = [['overview', 'Overview'], ['orders', `Orders${acc.orders.length ? ` (${acc.orders.length})` : ''}`], ['wishlist', `Wishlist${db.wishlist.length ? ` (${db.wishlist.length})` : ''}`], ['security', 'Security']];
    let body = '';
    if (acctTab === 'overview') {
      body = `<div class="wallet-card big">${icon('i-wallet')}<div><small>Databell Wallet</small><strong>${money(acc.wallet)}</strong><span class="muted small">Demo credit for the Databell Store</span></div><button class="btn btn-ghost btn-sm" data-act="topup" data-amt="250">${icon('i-plus')} $250</button></div>
        <div class="mini-grid">
          <div class="mini"><small>Points</small><strong>${acc.points.toLocaleString()}</strong><span>worth ${money(acc.points / 100)}</span></div>
          <button class="mini" data-act="tab" data-tab="orders"><small>Orders</small><strong>${acc.orders.length}</strong><span>${money0(acc.spent)} spent</span></button>
          <button class="mini" data-act="open-inbox"><small>Inbox</small><strong>${unread}</strong><span>unread</span></button>
        </div>
        <div class="tier"><div class="tier-top"><b>${icon('i-award')} ${tier.name}</b><span class="muted small">${next ? `${money0(next.min - acc.spent)} to ${next.name}` : 'Top tier reached'}</span></div><div class="bar"><i style="width:${pct}%"></i></div><small class="muted">${tier.perk}</small></div>
        <button class="sec-mini" data-act="tab" data-tab="security">${scoreRing(sec.score)}<span><b>Security score</b><small>${sec.tips.length ? 'Improve: ' + sec.tips[0] : 'Everything looks great'}</small></span>${icon('i-right')}</button>
        <h4 class="d-h">Recent orders</h4>
        ${acc.orders.length ? acc.orders.slice(0, 2).map(orderHTML).join('') : `<div class="empty-state sm">${icon('i-box')}<span class="muted small">No orders yet.</span><button class="btn btn-ghost btn-sm" data-act="go-shop">Visit the store</button></div>`}`;
    } else if (acctTab === 'orders') {
      body = acc.orders.length ? acc.orders.map(orderHTML).join('') : `<div class="empty-state">${icon('i-box')}<b>No orders yet</b><button class="btn btn-ghost btn-sm" data-act="go-shop">Visit the store</button></div>`;
    } else if (acctTab === 'wishlist') {
      body = db.wishlist.length ? `<ul class="cart-list">${db.wishlist.filter((id) => P[id]).map((id) => { const p = P[id]; return `<li class="cart-item">${artHTML(p, 'thumb')}<div class="ci-main"><b>${esc(p.name)}</b><small>${money(unitPrice(p))} · ${stockOf(p) > 0 ? 'Available' : 'Out of stock'}</small></div><div class="ci-right"><button class="btn btn-primary btn-sm" data-act="add" data-id="${id}" ${stockOf(p) > 0 ? '' : 'disabled'}>${icon('i-cart')}</button><button class="icon-btn sm" data-act="wish" data-id="${id}" aria-label="Remove from wishlist">${icon('i-trash')}</button></div></li>`; }).join('')}</ul>`
        : `<div class="empty-state">${icon('i-heart')}<b>Your wishlist is empty</b><p class="muted small">Tap the heart on any product to save it here.</p></div>`;
    } else {
      body = `<div class="score-card">${scoreRing(sec.score)}<div><b>Security score ${sec.score}/100</b><p class="muted small">${sec.tips.length ? 'To improve: ' + sec.tips.join(' · ') : 'Your Databell ID is fully protected.'}</p></div></div>
        <div class="sec-row">${icon('i-lock')}<span><b>6-digit PIN</b><small>Changed ${ago(acc.pinChanged)}</small></span><button class="btn btn-ghost btn-sm" data-act="change-pin">Change</button></div>
        <div class="sec-row">${icon('i-key')}<span><b>Security key</b><small>${maskKey(acc.keyHint)} · added ${ago(acc.keyCreated)}</small></span><button class="btn btn-ghost btn-sm" data-act="replace-key">Replace</button></div>
        <div class="sec-row">${icon('i-inbox')}<span><b>Recovery inbox</b><small>${esc(acc.email)}</small></span><button class="btn btn-ghost btn-sm" data-act="open-inbox">Open</button></div>
        <label class="sec-row">${icon('i-clock')}<span><b>Auto-lock</b><small>Lock after inactivity</small></span><select id="autoLockSel" aria-label="Auto-lock time">${[[1, '1 min'], [5, '5 min'], [15, '15 min'], [0, 'Never']].map(([v, n]) => `<option value="${v}" ${acc.autoLock === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="sec-row">${icon('i-shuffle')}<span><b>Scrambled keypad</b><small>Shuffle digits on every PIN prompt</small></span><span class="sw"><input type="checkbox" id="scrambleSw" ${db.prefs.scramble ? 'checked' : ''}><i></i></span></label>
        <div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="lock">${icon('i-lock')} Lock now</button><button class="btn btn-ghost btn-sm" data-act="signout">${icon('i-logout')} Sign out</button></div>
        <h4 class="d-h">${icon('i-history')} Activity</h4>
        <ul class="activity">${acc.activity.slice(0, 15).map((a) => `<li>${icon(a.icon)}<span>${esc(a.text)}</span><small>${ago(a.t)}</small></li>`).join('')}</ul>
        <button class="danger-link" data-act="delete">${icon('i-trash')} Delete Databell ID</button>`;
    }
    $('#acctBody').innerHTML = `<div class="drawer-head acct-head">${avatar(acc, 'lg')}<span class="dh-text"><b>${esc(acc.first)} ${esc(acc.last)}</b><button class="email-chip" data-copy="${esc(acc.email)}" title="Copy inbox address">${esc(acc.email)} ${icon('i-copy')}</button></span>
        <button class="icon-btn" data-act="lock" aria-label="Lock Databell ID">${icon('i-lock')}</button><button class="icon-btn" data-ov-close aria-label="Close">${icon('i-x')}</button></div>
      <div class="d-tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" aria-selected="${acctTab === k}" class="${acctTab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="drawer-body">${body}</div>`;
    const al = $('#autoLockSel');
    if (al) al.addEventListener('change', () => { acc.autoLock = +al.value; logAct(acc, `Auto-lock set to ${al.value === '0' ? 'never' : al.value + ' min'}`, 'i-clock'); saveDB(); renderAccount(); });
    const sw = $('#scrambleSw');
    if (sw) sw.addEventListener('change', () => { db.prefs.scramble = sw.checked; saveDB(); renderAccount(); });
  }

  /* =========================================================
     HEADER BADGES
     ========================================================= */
  function refreshBadges() {
    const n = cartQty();
    const cc = $('#cartCount');
    cc.hidden = !n;
    cc.textContent = n > 99 ? '99+' : n;
    $('#cartBtn').setAttribute('aria-label', `Open cart (${n} item${n === 1 ? '' : 's'})`);
    const acc = me();
    const btn = $('#acctBtn');
    const mc = $('#mailCount');
    if (acc) {
      const isLocked = db.session.locked;
      $('#acctAvatar').innerHTML = isLocked ? icon('i-lock') : esc(initials(acc));
      $('#acctLabel').textContent = isLocked ? 'Locked' : acc.first;
      btn.classList.toggle('locked', isLocked);
      btn.classList.add('signed');
      const u = isLocked ? 0 : unreadFor(acc.email);
      mc.hidden = !u;
      mc.textContent = u;
      btn.setAttribute('aria-label', isLocked ? `Databell ID locked — unlock ${acc.first}` : `Open Databell ID for ${acc.first} ${acc.last}${u ? `, ${u} unread messages` : ''}`);
    } else {
      $('#acctAvatar').innerHTML = icon('i-user');
      $('#acctLabel').textContent = 'Sign in';
      btn.classList.remove('locked', 'signed');
      mc.hidden = true;
      btn.setAttribute('aria-label', 'Sign in to Databell ID');
    }
  }
  function refreshAll() {
    refreshBadges();
    if (Overlay.isOpen('acctOv')) renderAccount();
    if (Overlay.isOpen('cartOv')) renderCart();
    if (Overlay.isOpen('checkoutOv') && co && co.step !== 'done') renderCheckout();
  }

  /* =========================================================
     COMMAND PALETTE
     ========================================================= */
  const cmd = { items: [], sel: 0 };
  function goTo(hash) { const el = $(hash); if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
  function cmdSource() {
    const acc = me();
    const actions = [
      { label: 'Toggle light / dark theme', icon: 'i-sun', run: () => $('#themeToggle').click() },
      { label: `Open cart (${cartQty()})`, icon: 'i-cart', run: openCart },
      { label: acc ? (unlocked() ? 'Open my Databell ID' : 'Unlock Databell ID') : 'Sign in or create a Databell ID', icon: 'i-user', run: acctClick }
    ];
    if (acc) actions.push({ label: 'Open Databell Inbox', icon: 'i-inbox', run: () => openInbox() });
    if (acc && unlocked()) actions.push({ label: 'Lock Databell ID now', icon: 'i-lock', run: () => lockSession(false) }, { label: 'Sign out', icon: 'i-logout', run: signOut });
    if (acc) actions.push({ label: 'Forgot PIN — recover with key or inbox', icon: 'i-key', run: () => auth('forgot', { email: acc.email }) });
    const pages = [['Home', '#home'], ['Company', '#about'], ['Ecosystem', '#ecosystem'], ['DatabellSoftwareLabs', '#labs'], ['TechEnhance', '#enhance'], ['TechKnowledge', '#knowledge'], ['Databell Store', '#shop'], ['Technology stack', '#stack'], ['Impact', '#impact'], ['Client stories', '#stories'], ['Plans', '#plans'], ['FAQ', '#faq'], ['Contact', '#contact']]
      .map(([n, h]) => ({ group: 'Pages', label: n, icon: 'i-arrow', run: () => goTo(h) }));
    return actions.map((a) => Object.assign({ group: 'Actions' }, a))
      .concat(pages)
      .concat(PRODUCTS.map((p) => ({ group: 'Store', label: p.name, hint: money(unitPrice(p)), icon: p.icon, run: () => openProduct(p.id) })))
      .concat(ARTICLES.map((a) => ({ group: 'Knowledge base', label: a.title, hint: a.tag, icon: a.icon, run: () => openArticle(a, null) })))
      .concat(COURSES.map((c) => ({ group: 'Courses', label: c.title, hint: c.level, icon: c.icon, run: () => goTo('#knowledge') })));
  }
  function renderCmd() {
    const q = $('#cmdInput').value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    cmd.items = cmdSource().filter((it) => words.every((w) => `${it.label} ${it.hint || ''} ${it.group}`.toLowerCase().includes(w))).slice(0, 40);
    cmd.sel = Math.min(cmd.sel, Math.max(0, cmd.items.length - 1));
    let group = '';
    $('#cmdList').innerHTML = cmd.items.length ? cmd.items.map((it, i) => {
      const head = it.group !== group ? `<li class="cmd-group" role="presentation">${(group = it.group)}</li>` : '';
      return `${head}<li role="option" id="cmd-${i}" aria-selected="${i === cmd.sel}" class="${i === cmd.sel ? 'sel' : ''}" data-i="${i}">${icon(it.icon)}<span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</li>`;
    }).join('') : '<li class="cmd-empty">No results</li>';
    $('#cmdInput').setAttribute('aria-activedescendant', cmd.items.length ? `cmd-${cmd.sel}` : '');
    const sel = $('#cmdList .sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function openCmd() { $('#cmdInput').value = ''; cmd.sel = 0; Overlay.open('cmdOv'); renderCmd(); $('#cmdInput').focus(); }
  function runCmd(i) { const it = cmd.items[i]; if (!it) return; Overlay.close('cmdOv'); setTimeout(it.run, 80); }
  function initCmd() {
    const input = $('#cmdInput');
    input.addEventListener('input', () => { cmd.sel = 0; renderCmd(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); cmd.sel = Math.min(cmd.items.length - 1, cmd.sel + 1); renderCmd(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cmd.sel = Math.max(0, cmd.sel - 1); renderCmd(); }
      else if (e.key === 'Enter') { e.preventDefault(); runCmd(cmd.sel); }
    });
    $('#cmdList').addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) runCmd(+li.dataset.i); });
    $('#cmdBtn').addEventListener('click', openCmd);
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (Overlay.isOpen('cmdOv')) Overlay.close('cmdOv'); else openCmd(); }
      else if (e.key === '/' && !typing && !Overlay.top()) { e.preventDefault(); openCmd(); }
    });
  }

  /* =========================================================
     GLOBAL ACTIONS (event delegation)
     ========================================================= */
  document.addEventListener('click', (e) => {
    const cp = e.target.closest('[data-copy]');
    if (cp) { e.preventDefault(); copyText(cp.dataset.copy); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const acc = me();
    switch (act) {
      // store
      case 'quick': openProduct(el.dataset.id); break;
      case 'wish': toggleWish(el.dataset.id); break;
      case 'add': addToCart(el.dataset.id); break;
      case 'pm-inc': pm.qty = Math.min(pm.qty + 1, Math.max(1, Math.min(99, stockOf(P[pm.id])))); renderProduct(); break;
      case 'pm-dec': pm.qty = Math.max(1, pm.qty - 1); renderProduct(); break;
      case 'pm-add': if (addToCart(pm.id, pm.opt, pm.qty)) Overlay.close('productOv'); break;
      case 'pm-buy': if (addToCart(pm.id, pm.opt, pm.qty, true)) { Overlay.close('productOv'); openCheckout(); } break;
      case 'go-shop': ['acctOv', 'cartOv', 'checkoutOv'].forEach((id) => Overlay.close(id)); setTimeout(() => goTo('#shop'), 120); break;
      // cart
      case 'inc': case 'dec': {
        const line = db.cart.find((c) => c.key === el.dataset.key);
        if (!line) break;
        if (act === 'inc') { addToCart(line.id, line.opt, 1, true); break; }
        line.qty -= 1;
        if (line.qty <= 0) db.cart = db.cart.filter((c) => c !== line);
        saveDB(); refreshBadges(); renderCart();
        break;
      }
      case 'rm': db.cart = db.cart.filter((c) => c.key !== el.dataset.key); saveDB(); refreshBadges(); renderCart(); break;
      case 'coupon-rm': db.coupon = null; saveDB(); renderCart(); break;
      case 'coupon-try': applyCoupon(el.dataset.code); break;
      case 'checkout': openCheckout(); break;
      // checkout
      case 'co-next': co.step = coSteps()[1]; renderCheckout(); break;
      case 'co-back': { const s = coSteps(); co.step = s[Math.max(0, s.indexOf(co.step) - 1)]; renderCheckout(); break; }
      case 'co-cart': Overlay.close('checkoutOv'); openCart(); break;
      case 'co-topup': if (acc) { topUp(acc, +el.dataset.amt); renderCheckout(); } break;
      case 'co-pay': payNow(); break;
      case 'co-orders': Overlay.close('checkoutOv'); openAccount('orders'); break;
      case 'co-close': Overlay.close('checkoutOv'); break;
      // account
      case 'tab': acctTab = el.dataset.tab; renderAccount(); break;
      case 'topup': if (acc) { topUp(acc, +el.dataset.amt); renderAccount(); } break;
      case 'lock': lockSession(false); break;
      case 'signout': signOut(); break;
      case 'change-pin': auth('changePin'); break;
      case 'replace-key':
        confirmPin('Confirm it’s you before replacing your security key.', 'Replace security key').then((ok) => {
          if (!ok || !me()) return;
          sendRecoveryCode(me(), 'key');
          auth('resetCode', { email: me().email, purpose: 'key' });
        });
        break;
      case 'delete': auth('deleteAcct'); break;
      case 'reveal': { const code = el.parentElement.querySelector('code'); const show = el.textContent === 'Show'; code.textContent = show ? code.dataset.key : `${code.dataset.key.slice(0, 5)}••••-••••`; el.textContent = show ? 'Hide' : 'Show'; break; }
      case 'buy-again': {
        const o = acc && acc.orders.find((x) => x.id === el.dataset.order);
        if (!o) break;
        let n = 0;
        o.items.forEach((i) => { const p = P[i.id]; if (!p) return; const opt = p.opts ? Math.max(0, p.opts.choices.findIndex((c) => `${p.opts.label}: ${c.name}` === i.opt)) : 0; if (addToCart(i.id, opt, i.qty, true)) n += 1; });
        if (n) { Overlay.close('acctOv'); openCart(); toast('Items added to your cart', 'i-cart'); }
        break;
      }
      case 'open-inbox': Overlay.close('authOv'); openInbox(); break;
      case 'done-continue': finishAuth(); break;
      // auth helpers
      case 'pick': renderAuth('pin', { email: el.dataset.email, mode: 'signin' }); break;
      case 'rec-key': renderAuth('resetKey', { email: authCtx.email }); break;
      case 'rec-mail': case 'resend': {
        const a = db.accounts[authCtx.email];
        if (!a) break;
        const purpose = authCtx.purpose || 'pin';
        sendRecoveryCode(a, purpose);
        renderAuth('resetCode', { email: a.email, purpose });
        toast(`Code sent to ${a.email}`, 'i-send');
        break;
      }
      case 'open-inbox-for': openInbox(authCtx.email, true); break;
      case 'dl-key': {
        const key = authCtx.view === 'newKey' ? flow.newKey : flow.draft && flow.draft.key;
        const email = authCtx.view === 'newKey' ? authCtx.email : flow.draft && emailFor(flow.draft.first, flow.draft.last);
        if (key) downloadText('databell-security-key.txt', `Databell ID security key\n\nAccount: ${email}\nKey:     ${key}\nCreated: ${new Date().toString()}\n\nKeep this file private. Anyone with this key can reset your PIN.\n`);
        break;
      }
      case 'new-key': if (flow.draft) { flow.draft.key = genKey(); renderAuth('signup3'); } break;
      case 'scramble-toggle': db.prefs.scramble = !db.prefs.scramble; saveDB(); buildKeypads(authBody); el.querySelector('span').textContent = db.prefs.scramble ? 'Keypad scrambled · tap to reset' : 'Scramble keypad'; break;
      // inbox
      case 'ib-open': {
        inbox.sel = el.dataset.id;
        const m = (db.inbox[inbox.email] || []).find((x) => x.id === inbox.sel);
        if (m && !m.read) { m.read = true; saveDB(); refreshBadges(); }
        renderInbox();
        break;
      }
      case 'ib-back': inbox.sel = null; renderInbox(); break;
      case 'ib-tab': inbox.tab = el.dataset.tab; inbox.sel = null; renderInbox(); break;
      case 'ib-readall': (db.inbox[inbox.email] || []).forEach((m) => { m.read = true; }); saveDB(); refreshBadges(); renderInbox(); break;
      case 'ib-star': { const m = (db.inbox[inbox.email] || []).find((x) => x.id === el.dataset.id); if (m) { m.star = !m.star; saveDB(); renderInbox(); } break; }
      case 'ib-del': db.inbox[inbox.email] = (db.inbox[inbox.email] || []).filter((x) => x.id !== el.dataset.id); inbox.sel = null; saveDB(); refreshBadges(); renderInbox(); toast('Message deleted', 'i-trash'); break;
      default: break;
    }
  });
  function topUp(acc, amt) {
    acc.wallet = round2(acc.wallet + amt);
    logAct(acc, `Added ${money0(amt)} demo credit to wallet`, 'i-wallet');
    saveDB();
    toast(`${money0(amt)} demo credit added to your wallet`, 'i-wallet');
  }

  function initPlatform() {
    $('#acctBtn').addEventListener('click', acctClick);
    $('#cartBtn').addEventListener('click', openCart);
    initShop();
    initCmd();
    refreshBadges();
    // keep "x min ago" labels and order stages fresh while panels are open
    setInterval(() => { if (Overlay.isOpen('acctOv') && !$('#acctBody details[open]')) renderAccount(); }, 30000);
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
    initPlatform();
    runPreloader();
  });
})();
