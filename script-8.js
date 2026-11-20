/* =========================================================
   Databell · Technology, Engineered
   script-8.js
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

    // Tilt cards: hover is decided from the card's untransformed layout box, so the tilt itself
    // can never move the card out from under the pointer (which caused flicker at the edges)
    const layoutRect = (el) => {
      const p = el.offsetParent;
      const pr = p ? p.getBoundingClientRect() : { left: 0, top: 0 };
      const left = pr.left + el.offsetLeft + (p ? p.clientLeft : 0);
      const top = pr.top + el.offsetTop + (p ? p.clientTop : 0);
      return { left, top, right: left + el.offsetWidth, bottom: top + el.offsetHeight, width: el.offsetWidth, height: el.offsetHeight };
    };
    const inside = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    $$('.tilt').forEach((card) => {
      let active = false;
      const reset = () => { active = false; card.style.transform = ''; card.classList.remove('tilt-on'); };
      const apply = (x, y) => {
        const r = layoutRect(card);
        if (!inside(r, x, y)) { reset(); return; }
        active = true;
        card.classList.add('tilt-on');
        const px = (x - r.left) / r.width;
        const py = (y - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg)`;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
      };
      card.addEventListener('pointermove', (e) => apply(e.clientX, e.clientY));
      card.addEventListener('pointerleave', (e) => { if (!inside(layoutRect(card), e.clientX, e.clientY)) reset(); });
      window.addEventListener('pointermove', (e) => { if (active) apply(e.clientX, e.clientY); }, { passive: true });
      window.addEventListener('scroll', () => { if (active) reset(); }, { passive: true });
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
      if (enrolled.has(t)) { enrolled.delete(t); toast(`Left “${t}”`, 'i-x'); } else { enrolled.add(t); toast(`Enrolled in “${t}”`); rewardActivity('course', t); }
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
    setTimeout(() => rewardActivity('article', a.title), 500);
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
    const qEl = $('#quizQ'), opts = $('#quizOpts'), next = $('#quizNext'), meta = $('#quizMeta'), bar = $('#quizBar'), quit = $('#quizQuit');
    let idx = 0, score = 0, answered = 0;
    const best = () => store.get('databell-quiz-best', 0);

    const show = () => {
      const item = QUIZ[idx];
      qEl.textContent = item.q;
      opts.innerHTML = item.o.map((o, i) => `<button class="quiz-opt" data-i="${i}">${escapeHTML(o)}</button>`).join('');
      next.disabled = true;
      quit.hidden = false;
      next.textContent = idx === QUIZ.length - 1 ? 'See result' : 'Next';
      meta.textContent = `Question ${idx + 1} of ${QUIZ.length} · Score ${score}`;
      bar.style.width = `${(idx / QUIZ.length) * 100}%`;
    };

    const finish = () => {
      bar.style.width = '100%';
      const prev = best();
      if (score > prev) store.set('databell-quiz-best', score);
      if (score === QUIZ.length) rewardActivity('quiz-perfect');
      const msg = score === QUIZ.length ? 'Perfect — you’re ready for an advanced track.' : score >= 3 ? 'Solid! An intermediate track would suit you.' : 'Great start — try a beginner track.';
      qEl.textContent = '';
      opts.innerHTML = `<div class="quiz-result"><span class="score grad-text">${score}/${QUIZ.length}</span><p>${msg}</p></div>`;
      meta.textContent = `Best score: ${Math.max(prev, score)}/${QUIZ.length}`;
      next.disabled = false;
      next.textContent = 'Try again';
      quit.hidden = true;
      idx = -1;
    };

    quit.addEventListener('click', () => {
      if (idx < 0) return;
      bar.style.width = '0%';
      qEl.textContent = '';
      opts.innerHTML = `<div class="quiz-result"><span class="score grad-text">${score}/${answered}</span><p>Quiz ended early after ${answered} question${answered === 1 ? '' : 's'}. Any points you earned are kept.</p></div>`;
      meta.textContent = 'You quit the quiz';
      next.disabled = false;
      next.textContent = 'Start again';
      quit.hidden = true;
      idx = -1;
      next.focus();
    });

    opts.addEventListener('click', (e) => {
      const btn = e.target.closest('.quiz-opt');
      if (!btn || idx < 0) return;
      const choice = +btn.dataset.i;
      const right = QUIZ[idx].a;
      $$('.quiz-opt', opts).forEach((b, i) => {
        b.disabled = true;
        if (i === right) b.classList.add('right');
      });
      answered = idx + 1;
      if (choice === right) { score += 1; rewardActivity('quiz'); } else btn.classList.add('wrong');
      meta.textContent = `Question ${idx + 1} of ${QUIZ.length} · Score ${score}`;
      next.disabled = false;
    });

    next.addEventListener('click', () => {
      if (idx === -1) { idx = 0; score = 0; answered = 0; show(); return; }
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
        setTimeout(() => rewardActivity('contact'), 2200);
      }, 1200);
    });

    const news = $('#newsletter');
    news.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('input', news);
      if (!emailOK(input.value.trim())) { toast('Please enter a valid email address.', 'i-x'); input.focus(); return; }
      input.value = '';
      toast('Subscribed to the Databell tech digest.');
      setTimeout(() => rewardActivity('newsletter'), 2000);
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
  // The Founder ID: one reserved Databell ID with the founder's $15 trillion wallet
  const FOUNDER_EMAIL = `founder@${DOMAIN}`;
  const FOUNDER_WALLET = 15e12; // fifteen trillion dollars
  // Founder code check — the code itself is never stored, only this salted SHA-256 fingerprint
  const FOUNDER_CODE_SALT = 'databell-founder-v1';
  const FOUNDER_CODE_HASH = 'd0a880848fa15f07c7beeabc888e94968d894d8a53c6377e81a1f4a70ac846e0';
  const founderCodeOK = (code) => hashSecret(String(code).trim(), FOUNDER_CODE_SALT) === FOUNDER_CODE_HASH;
  const isFounder = (acc) => !!acc && (acc.founder || acc.email === FOUNDER_EMAIL);
  const founderChip = (acc) => (isFounder(acc) ? `<span class="founder-chip">${icon('i-crown')} Founder</span>` : '');
  const SCALES = [[1e15, 'quadrillion'], [1e12, 'trillion']];
  const bigMoney = (v) => {
    const s = SCALES.find(([n]) => v >= n);
    if (!s) return money(v);
    const x = v / s[0];
    return '$' + x.toLocaleString('en-US', { maximumFractionDigits: x < 10 ? 2 : 0 }) + ' ' + s[1];
  };
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
    { name: 'Architect', min: 2000, mult: 2, perk: '2 points per $1 · free express shipping', freeExpress: true }
  ];
  const FOUNDER_TIER = { name: 'Founder', min: 0, mult: 3, perk: '3 points per $1 · free express shipping · $15 trillion founder wallet', freeExpress: true };
  const tierOf = (acc) => (isFounder(acc) ? FOUNDER_TIER : TIERS.filter((t) => acc.spent >= t.min).pop());
  const nextTier = (acc) => (isFounder(acc) ? null : TIERS.find((t) => acc.spent < t.min) || null);

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
        ${accts.length ? `<div class="acct-list">${accts.map((a) => `<button class="acct-pick" data-act="pick" data-email="${esc(a.email)}">${avatar(a)}<span><b>${esc(a.first)} ${esc(a.last)} ${founderChip(a)}</b><small>${esc(a.email)}</small></span>${icon('i-right')}</button>`).join('')}</div><div class="or"><span>or enter your address</span></div>` : ''}
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
          ${db.accounts[FOUNDER_EMAIL] ? '' : `<label class="founder-opt"><input type="checkbox" name="founder" ${d.founder ? 'checked' : ''}><span>${icon('i-crown')}<span><b>Set up the Founder ID</b><small>founder@${DOMAIN} · $15 trillion wallet · needs the founder code</small></span></span></label>
          <label class="field founder-code" ${d.founder ? '' : 'hidden'}><span>Founder code</span><span class="pw-wrap"><input name="fcode" type="password" class="mono" autocomplete="off" spellcheck="false" placeholder="Enter the founder code"><button type="button" class="icon-btn sm" data-act="pw-toggle" aria-label="Show founder code">${icon('i-eye')}</button></span></label>`}
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
      return `<div class="auth-done"><div class="done-check">${icon('i-check')}</div><h3 id="authTitle">You're all set, ${esc(acc.first)}!</h3>${founderChip(acc)}<p class="muted">Your Databell ID is active and unlocked on this device.</p></div>
        <ul class="done-list">
          <li>${icon('i-inbox')}<span>Inbox <b>${esc(acc.email)}</b></span><button class="icon-btn sm" data-copy="${esc(acc.email)}" aria-label="Copy inbox address">${icon('i-copy')}</button></li>
          <li>${icon('i-lock')}<span>6-digit PIN set · auto-lock after ${acc.autoLock} min</span></li>
          <li>${icon('i-key')}<span>Security key ${maskKey(acc.keyHint)}</span></li>
          <li>${icon(isFounder(acc) ? 'i-crown' : 'i-wallet')}<span>${isFounder(acc) ? `<b>${money(acc.wallet)}</b> — $15 trillion in your Founder wallet` : `${money(acc.wallet)} welcome credit in your Databell Wallet`}</span></li>
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
      const upd = () => { $('#emailPreview').textContent = f.founder && f.founder.checked ? FOUNDER_EMAIL : emailFor(f.first.value, f.last.value); };
      f.first.addEventListener('input', upd); f.last.addEventListener('input', upd);
      if (f.founder) f.founder.addEventListener('change', () => {
        upd();
        const box = $('.founder-code', f);
        box.hidden = !f.founder.checked;
        if (f.founder.checked) f.fcode.focus();
      });
      upd();
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
    const plays = db.session && db.session.email === acc.email ? db.session.quizPlays || 0 : 0;
    db.session = { email: acc.email, locked: false, quizPlays: plays };
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
  function openSession(acc, mode) {
    if (mode === 'unlock') { startSession(acc, 'Unlocked with PIN'); finishAuth(`Unlocked · welcome back, ${acc.first}`); return; }
    if (mode === 'reset') { startSession(acc, 'Signed in after PIN reset'); finishAuth('New PIN saved — you are signed in'); return; }
    startSession(acc, 'Signed in with PIN on this device');
    sendMail(acc.email, {
      subject: 'New sign-in to your Databell ID', tag: 'security',
      html: mailShell(acc, `<p>Your Databell ID was signed in on ${fmtDate(Date.now())}.</p><table class="mail-table"><tr><td>Device</td><td>${esc(navigator.platform || 'This browser')}</td></tr><tr><td>Method</td><td>6-digit PIN</td></tr></table><p class="muted">Not you? Reset your PIN with your security key straight away.</p>`)
    });
    finishAuth(`Welcome back, ${acc.first}`);
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
        const cb = flow.confirm; flow.confirm = null;
        if (db.session && db.session.locked) { if (cb) cb(false); openSession(acc, 'unlock'); return; }
        acc.failed = 0; saveDB();
        Overlay.close('authOv');
        if (cb) cb(true);
        return;
      }
      openSession(acc, mode);
    },
    fSignup1(f) {
      const first = cleanName(f.first.value), last = cleanName(f.last.value);
      if (!slug(first) || !slug(last)) return authErr('Please enter your first and last name (letters or numbers).');
      if (!f.agree.checked) return authErr('Please tick the box to continue.');
      const wantsFounder = !!(f.founder && f.founder.checked);
      if (wantsFounder) {
        const wait = (db.prefs.founderLockUntil || 0) - Date.now();
        if (wait > 0) return authErr(`Too many wrong founder codes. Try again in ${Math.ceil(wait / 1000)}s.`);
        if (!founderCodeOK(f.fcode.value)) {
          db.prefs.founderFails = (db.prefs.founderFails || 0) + 1;
          if (db.prefs.founderFails >= 5) { db.prefs.founderLockUntil = Date.now() + 60000; db.prefs.founderFails = 0; }
          saveDB();
          f.fcode.value = '';
          return authErr('That founder code is not correct. The Founder ID can only be set up with the founder code.');
        }
        db.prefs.founderFails = 0;
        saveDB();
      }
      flow.draft = Object.assign(flow.draft || {}, { first, last, division: f.division.value, founder: wantsFounder });
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
      const founder = !!d.founder && !db.accounts[FOUNDER_EMAIL];
      const email = founder ? FOUNDER_EMAIL : emailFor(d.first, d.last);
      const now = Date.now();
      const pinSalt = randomFrom(ALNUM, 16), keySalt = randomFrom(ALNUM, 16);
      const acc = {
        first: d.first, last: d.last, email, division: d.division, created: now,
        pinSalt, pinHash: hashSecret(d.pin, pinSalt), pinChanged: now,
        keySalt, keyHash: hashSecret(canonKey(d.key), keySalt), keyHint: d.key.slice(-4), keyCreated: now,
        founder, wallet: founder ? FOUNDER_WALLET : 1000, points: 500, spent: 0, orders: [], activity: [], failed: 0, lockUntil: 0, autoLock: 5, recovery: null
      };
      db.accounts[email] = acc;
      ensureMember(acc);
      logAct(acc, founder ? 'Founder ID created · $15 trillion wallet activated' : 'Databell ID created', founder ? 'i-crown' : 'i-user');
      logAct(acc, 'PIN and security key set up', 'i-key');
      startSession(acc, 'Signed in on this device');
      sendMail(email, {
        subject: founder ? `Founder ID activated — welcome, ${acc.first}!` : `Welcome to Databell, ${acc.first}!`, tag: 'updates', from: 'Databell Team', addr: `hello@${DOMAIN}`,
        html: mailShell(acc, `<p>Your Databell ID is ready. This inbox — <b>${esc(email)}</b> — is where Databell sends codes, receipts and licence keys.</p>
          <ul><li><b>PIN</b> unlocks your ID and confirms payments.</li><li><b>Security key</b> (${maskKey(acc.keyHint)}) resets a forgotten PIN instantly.</li><li><b>This inbox</b> receives one-time codes if you lose your PIN or key.</li></ul>
          ${founder ? `<p>As <b>Founder</b>, your Databell Wallet holds <b>${money(acc.wallet)}</b> — fifteen trillion dollars — and you're subscribed to <b>BDAI Team Pro</b>, complimentary for the Founder. You earn 3 points per $1 in the store, 2× points on activities, 10% off and free shipping.</p>` : `<p>We've added <b>${money(acc.wallet)}</b> of welcome credit and <b>${acc.points} points</b> to your account. Enjoy the Databell Store!</p>`}`)
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
      openSession(acc, 'reset');
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
    ['acctOv', 'checkoutOv', 'moneyOv'].forEach((id) => Overlay.close(id));
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
    else { db.wishlist.push(id); toast(`Saved ${P[id].name} to wishlist`, 'i-heart'); setTimeout(() => rewardActivity('wish'), 1800); }
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
    const plan = acc ? subOf(acc) : SUBS.free;
    const member = round2((sub - discount) * plan.disc);
    const after = round2(sub - discount - member);
    if (plan.freeShip) freeShip = true;
    let ship = 0;
    if (physical && !freeShip) ship = after >= 150 ? 0 : 12;
    if (physical && extra.express && !(acc && tierOf(acc).freeExpress)) ship += 15;
    const tax = round2(after * 0.08);
    const total = round2(after + ship + tax);
    const pts = acc ? acc.points : 0;
    const pointsValue = extra.usePoints ? round2(Math.min(Math.floor(pts) / 100, total)) : 0;
    const due = round2(total - pointsValue);
    const earn = acc ? Math.floor(total * tierOf(acc).mult) : Math.floor(total);
    return { lines, sub, discount, member, planName: plan.name, ship, tax, total, physical, pointsValue, due, earn, couponError, freeLeft: physical && !freeShip && after < 150 ? round2(150 - after) : 0, after };
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
            ${t.member ? `<div class="disc"><dt>${esc(t.planName)}</dt><dd>−${money(t.member)}</dd></div>` : ''}
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
      const arch = tierOf(acc).freeExpress;
      main = `<form id="fDelivery" class="auth-form" novalidate>
        <label class="field"><span>Full name</span><input name="name" value="${esc(a.name)}" autocomplete="name" required></label>
        <label class="field"><span>Address</span><input name="line" value="${esc(a.line)}" autocomplete="street-address" required></label>
        <div class="form-row"><label class="field"><span>City</span><input name="city" value="${esc(a.city)}" autocomplete="address-level2" required></label><label class="field"><span>Postal code</span><input name="zip" value="${esc(a.zip)}" autocomplete="postal-code" required></label></div>
        <label class="field"><span>Country</span><select name="country">${COUNTRIES.map((c) => `<option ${c === a.country ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <fieldset class="opts"><legend>Delivery speed</legend>
          <label class="opt"><input type="radio" name="speed" value="std" ${co.express ? '' : 'checked'}><span>Standard · 3–5 business days<small>${t.ship && !co.express ? money(t.ship) : 'Free'}</small></span></label>
          <label class="opt"><input type="radio" name="speed" value="exp" ${co.express ? 'checked' : ''}><span>Express · 1–2 business days<small>${arch ? `Free for ${tierOf(acc).name}s` : '+$15.00'}</small></span></label>
        </fieldset>
        <p class="form-err" role="alert"></p>
        <div class="btn-row between"><button type="button" class="btn btn-ghost" data-act="co-back">Back</button><button class="btn btn-primary">Continue ${icon('i-arrow')}</button></div>
      </form>`;
    } else {
      const short = round2(t.due - acc.wallet);
      main = `<div class="wallet-card ${isFounder(acc) ? 'founder-wallet' : ''}">${icon(isFounder(acc) ? 'i-crown' : 'i-wallet')}<div><small>${isFounder(acc) ? 'Founder wallet' : 'Databell Wallet'}</small><strong>${bigMoney(acc.wallet)}</strong></div>${short > 0 ? `<span class="pill warn">Short ${money(short)}</span>` : `<span class="pill ok">Enough balance</span>`}</div>
        <label class="row-toggle"><input type="checkbox" id="usePoints" ${co.usePoints ? 'checked' : ''} ${acc.points < 100 ? 'disabled' : ''}><span><b>Use Databell Points</b><small>${acc.points.toLocaleString()} points available · 100 points = $1</small></span><em>${co.usePoints ? '−' + money(t.pointsValue) : ''}</em></label>
        ${t.physical ? `<div class="co-addr">${icon('i-truck')}<span><b>${esc(co.addr.name)}</b><small>${esc(co.addr.line)}, ${esc(co.addr.city)} ${esc(co.addr.zip)}, ${esc(co.addr.country)} · ${co.express ? 'Express' : 'Standard'}</small></span><button class="link-btn small" data-act="co-back">Change</button></div>` : `<div class="co-addr">${icon('i-inbox')}<span><b>Digital delivery</b><small>Keys and receipts go to ${esc(acc.email)}</small></span></div>`}
        ${short > 0 ? `<p class="note small">${icon('i-alert')}<span>Your wallet is ${money(short)} short. <button class="link-btn small" data-act="co-topup" data-amt="${Math.ceil(short / 50) * 50}">Add ${money0(Math.ceil(short / 50) * 50)} with PIN</button> · <button class="link-btn small" data-act="money-open">More ways to add money</button></span></p>` : ''}
        <div class="btn-row between"><button class="btn btn-ghost" data-act="co-back">Back</button><button class="btn btn-primary" data-act="co-pay" ${short > 0 ? 'disabled' : ''}>${icon('i-lock')} Pay ${money(t.due)} with PIN</button></div>`;
    }
    $('#checkoutBody').innerHTML = `${head}${bar}<div class="co-grid"><div class="co-main">${main}</div>
      <aside class="co-sum"><h4>Order summary</h4><dl class="sum">
        <div><dt>Subtotal (${cartQty()} items)</dt><dd>${money(t.sub)}</dd></div>
        ${t.discount ? `<div class="disc"><dt>${esc(db.coupon)}</dt><dd>−${money(t.discount)}</dd></div>` : ''}
        ${t.member ? `<div class="disc"><dt>${esc(t.planName)}</dt><dd>−${money(t.member)}</dd></div>` : ''}
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
      sub: t.sub, discount: t.discount, coupon: db.coupon, member: t.member, planName: t.planName, ship: t.ship, tax: t.tax, total: t.total, pointsUsed: Math.round(t.pointsValue * 100), paid: t.due,
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
    if (order.pointsUsed) addLedger(acc, -order.pointsUsed, `Points used on order #${order.id}`);
    addLedger(acc, order.earned, `Order #${order.id}`);
    setTimeout(() => completeQuest(acc, 'firstOrder'), 2200);
    sendMail(acc.email, {
      from: 'Databell Store', addr: `store@${DOMAIN}`, tag: 'orders', subject: `Receipt for order #${order.id} · ${money(order.total)}`,
      html: mailShell(acc, `<p>Thanks for your order! Here's your receipt.</p>
        <table class="mail-table">${order.items.map((i) => `<tr><td>${esc(i.name)}${i.opt ? `<br><small>${esc(i.opt)}</small>` : ''} × ${i.qty}</td><td>${money(i.line)}</td></tr>`).join('')}
        ${order.discount ? `<tr><td>Discount (${esc(order.coupon)})</td><td>−${money(order.discount)}</td></tr>` : ''}
        ${order.member ? `<tr><td>${esc(order.planName)} discount</td><td>−${money(order.member)}</td></tr>` : ''}
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
    if (checkRenewal(acc)) changed = true;
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
    ensureMember(acc);
    if (securityScore(acc).score >= 100 && !acc.rewards.quests.secure) setTimeout(() => completeQuest(acc, 'secure'), 600);
    const tier = tierOf(acc), next = nextTier(acc);
    const pct = next ? Math.min(100, ((acc.spent - tier.min) / (next.min - tier.min)) * 100) : 100;
    const sec = securityScore(acc);
    const unread = unreadFor(acc.email);
    const tabs = [['overview', 'Overview'], ['orders', `Orders${acc.orders.length ? ` (${acc.orders.length})` : ''}`], ['wishlist', `Wishlist${db.wishlist.length ? ` (${db.wishlist.length})` : ''}`], ['plan', 'Plan'], ['rewards', 'Rewards'], ['security', 'Security']];
    let body = '';
    if (acctTab === 'overview') {
      body = isFounder(acc)
        ? `<div class="wallet-card big founder-wallet">${icon('i-crown')}<div><small>Founder wallet</small><strong>${bigMoney(acc.wallet)}</strong><span class="full-amt">${money(acc.wallet)}</span><span class="muted small">Founder allocation · fifteen trillion dollars</span></div><button class="btn btn-ghost btn-sm" data-act="money-open">${icon('i-plus')} Add money</button></div>`
        : `<div class="wallet-card big">${icon('i-wallet')}<div><small>Databell Wallet</small><strong>${money(acc.wallet)}</strong><span class="muted small">Demo credit for the Databell Store</span></div><button class="btn btn-ghost btn-sm" data-act="money-open">${icon('i-plus')} Add money</button></div>`;
      body += `
        <div class="mini-grid">
          <div class="mini"><small>Points</small><strong>${acc.points.toLocaleString()}</strong><span>worth ${money(acc.points / 100)}</span></div>
          <button class="mini" data-act="tab" data-tab="orders"><small>Orders</small><strong>${acc.orders.length}</strong><span>${money0(acc.spent)} spent</span></button>
          <button class="mini" data-act="open-inbox"><small>Inbox</small><strong>${unread}</strong><span>unread</span></button>
        </div>
        <div class="tier"><div class="tier-top"><b>${icon('i-award')} ${tier.name}</b><span class="muted small">${next ? `${money0(next.min - acc.spent)} to ${next.name}` : 'Top tier reached'}</span></div><div class="bar"><i style="width:${pct}%"></i></div><small class="muted">${tier.perk}</small></div>
        <button class="sec-mini" data-act="tab" data-tab="plan">${icon(acc.sub && acc.sub.comp ? 'i-crown' : 'i-star', 'ic sm-ic')}<span><b>${subOf(acc).name}</b><small>${acc.sub && acc.sub.comp ? 'Complimentary for the Founder' : acc.sub && acc.sub.plan !== 'free' ? 'Active subscription' : 'Upgrade for more points and discounts'}</small></span>${icon('i-right')}</button>
        <button class="sec-mini" data-act="tab" data-tab="rewards">${icon('i-gift', 'ic sm-ic')}<span><b>Earn points</b><small>${acc.rewards.checkin === today() ? `${QUESTS.filter((q) => !acc.rewards.quests[q.id]).length} quests waiting` : 'Daily check-in and lucky spin ready'}</small></span>${icon('i-right')}</button>
        <button class="sec-mini" data-act="tab" data-tab="security">${scoreRing(sec.score)}<span><b>Security score</b><small>${sec.tips.length ? 'Improve: ' + sec.tips[0] : 'Everything looks great'}</small></span>${icon('i-right')}</button>
        <h4 class="d-h">Recent orders</h4>
        ${acc.orders.length ? acc.orders.slice(0, 2).map(orderHTML).join('') : `<div class="empty-state sm">${icon('i-box')}<span class="muted small">No orders yet.</span><button class="btn btn-ghost btn-sm" data-act="go-shop">Visit the store</button></div>`}`;
    } else if (acctTab === 'plan') {
      body = planTabHTML(acc);
    } else if (acctTab === 'rewards') {
      body = rewardsTabHTML(acc);
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
    $('#acctBody').innerHTML = `<div class="drawer-head acct-head">${avatar(acc, 'lg')}<span class="dh-text"><b>${esc(acc.first)} ${esc(acc.last)} ${founderChip(acc)} ${planChip(acc)}</b><button class="email-chip" data-copy="${esc(acc.email)}" title="Copy inbox address">${esc(acc.email)} ${icon('i-copy')}</button></span>
        <button class="icon-btn" data-act="lock" aria-label="Lock Databell ID">${icon('i-lock')}</button><button class="icon-btn" data-ov-close aria-label="Close">${icon('i-x')}</button></div>
      <div class="d-tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" aria-selected="${acctTab === k}" class="${acctTab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="drawer-body">${body}</div>`;
    const onTab = $('#acctBody .d-tabs .on');
    if (onTab) onTab.parentElement.scrollLeft = onTab.offsetLeft - 40;
    const al = $('#autoLockSel');
    if (al) al.addEventListener('change', () => { acc.autoLock = +al.value; logAct(acc, `Auto-lock set to ${al.value === '0' ? 'never' : al.value + ' min'}`, 'i-clock'); saveDB(); renderAccount(); });
    const sw = $('#scrambleSw');
    if (sw) sw.addEventListener('change', () => { db.prefs.scramble = sw.checked; saveDB(); renderAccount(); });
  }

  /* =========================================================
     ADD MONEY — top up, exercises and money quizzes (PIN-confirmed)
     ========================================================= */
  const EXERCISES = [
    { id: 'py-sum', lang: 'Python', level: 'Easy', pay: 10, q: 'What does this print?', code: 'print(sum(range(1, 11)))', a: ['55'], hint: 'range(1, 11) is 1 to 10.' },
    { id: 'js-map', lang: 'JavaScript', level: 'Easy', pay: 10, q: 'What is the result?', code: "[1, 2, 3].map(x => x * 2).join('-')", a: ['2-4-6', "'2-4-6'", '"2-4-6"'], hint: 'Each item is doubled, then joined with a dash.' },
    { id: 'bin', lang: 'Binary', level: 'Easy', pay: 10, q: 'Convert binary 1011 to decimal.', code: '1011₂ = ?₁₀', a: ['11'], hint: '8 + 0 + 2 + 1' },
    { id: 'http', lang: 'Web', level: 'Easy', pay: 10, q: 'Which HTTP status code means “Not Found”?', code: 'HTTP/1.1 ??? Not Found', a: ['404'], hint: 'It starts with 4.' },
    { id: 'py-len', lang: 'Python', level: 'Easy', pay: 10, q: 'What does this print?', code: 'print(len("Databell"))', a: ['8'], hint: 'Count the letters.' },
    { id: 'fib', lang: 'Logic', level: 'Medium', pay: 15, q: 'What comes next?', code: '1, 1, 2, 3, 5, 8, ?', a: ['13'], hint: 'Add the two previous numbers.' },
    { id: 'pow', lang: 'Python', level: 'Medium', pay: 15, q: 'What does this print?', code: 'print(2 ** 10)', a: ['1024'], hint: '** is “to the power of”.' },
    { id: 'hex', lang: 'Hex', level: 'Medium', pay: 15, q: 'Convert hexadecimal FF to decimal.', code: '0xFF = ?', a: ['255'], hint: '15 × 16 + 15' },
    { id: 'bigo', lang: 'Algorithms', level: 'Hard', pay: 25, q: 'What is the time complexity of binary search?', code: 'binarySearch(sortedArray, target)', a: ['o(log n)', 'olog n', 'log n', 'logn', 'o(logn)', 'o(log(n))', 'log(n)'], hint: 'It halves the search space each step.' },
    { id: 'typeof', lang: 'JavaScript', level: 'Hard', pay: 25, q: 'What is the result?', code: 'typeof null', a: ['object', "'object'", '"object"'], hint: 'A famous JavaScript quirk.' }
  ];
  const MONEY_QUIZZES = [
    { id: 'cloud', name: 'Cloud', icon: 'i-cloud', qs: [
      { q: 'Which service model gives you virtual machines you manage yourself?', o: ['SaaS', 'PaaS', 'IaaS', 'FaaS'], a: 2 },
      { q: 'What does “autoscaling” change automatically?', o: ['Your password', 'The number of running instances', 'The DNS provider', 'The billing currency'], a: 1 },
      { q: 'Object storage like S3 is best for…', o: ['Files and backups', 'CPU registers', 'Running SQL joins', 'Keyboard input'], a: 0 },
      { q: 'A CDN mainly reduces…', o: ['Code size', 'Latency for distant users', 'Database locks', 'Compile time'], a: 1 },
      { q: 'Which tool defines infrastructure as code?', o: ['Terraform', 'Photoshop', 'Excel', 'Figma'], a: 0 },
      { q: 'A container image is run by…', o: ['A container runtime such as Docker', 'A printer driver', 'A DNS record', 'A CSS file'], a: 0 },
      { q: 'Which pricing model suits steady 24/7 workloads?', o: ['On-demand only', 'Reserved instances or savings plans', 'Spot only', 'Free tier'], a: 1 },
      { q: 'Deploying across several regions mainly improves…', o: ['Font rendering', 'Availability and disaster recovery', 'Keyboard latency', 'Image compression'], a: 1 }
    ] },
    { id: 'ai', name: 'AI & Data', icon: 'i-brain', qs: [
      { q: 'Training a model on labelled examples is called…', o: ['Supervised learning', 'Unsupervised learning', 'Compilation', 'Sharding'], a: 0 },
      { q: 'Which metric suits an imbalanced fraud dataset better than accuracy?', o: ['Precision/recall', 'Line count', 'Ping time', 'Pixel density'], a: 0 },
      { q: 'In RAG, what does the “R” stand for?', o: ['Rendering', 'Retrieval', 'Recursion', 'Routing'], a: 1 },
      { q: 'Overfitting means the model…', o: ['Is too small', 'Memorises training data and generalises poorly', 'Runs too fast', 'Has no parameters'], a: 1 },
      { q: 'A vector embedding represents…', o: ['Meaning as a list of numbers', 'A JPEG header', 'A CPU clock speed', 'A password'], a: 0 },
      { q: 'Which data split measures performance on unseen data?', o: ['Training set', 'Test set', 'Cache', 'Log file'], a: 1 },
      { q: 'LLM stands for…', o: ['Large Language Model', 'Low Latency Machine', 'Linear Logic Module', 'Long Lived Memory'], a: 0 },
      { q: 'Which is a common neural-network activation function?', o: ['ReLU', 'HTTP', 'CSV', 'DNS'], a: 0 }
    ] },
    { id: 'sec', name: 'Security', icon: 'i-shield', qs: [
      { q: 'Which is the strongest second factor?', o: ['SMS code', 'Security key', 'Security question', 'Birthday'], a: 1 },
      { q: 'Storing passwords safely means…', o: ['Encrypting with one shared key', 'Salted, slow hashing', 'Base64 encoding', 'Plain text in a vault'], a: 1 },
      { q: 'Phishing is an attack that…', o: ['Floods a server', 'Tricks people into giving secrets', 'Breaks encryption maths', 'Overheats CPUs'], a: 1 },
      { q: 'HTTPS protects data…', o: ['Only at rest', 'In transit between browser and server', 'Inside the CPU', 'On printed pages'], a: 1 },
      { q: '“Least privilege” means…', o: ['Grant only the access that is needed', 'Make everyone an admin', 'Share one password', 'Turn off logging'], a: 0 },
      { q: 'A firewall controls…', o: ['Network traffic', 'Screen brightness', 'Font size', 'Battery charging'], a: 0 },
      { q: 'Which makes a PIN harder to guess?', o: ['Avoiding sequences like 123456', 'Using your birth year', 'Using 000000', 'Writing it on a sticky note'], a: 0 },
      { q: 'Ransomware typically…', o: ['Encrypts files and demands payment', 'Speeds up your computer', 'Updates your drivers', 'Cleans your disk'], a: 0 }
    ] }
  ];
  const QUIZ_PAY = 5;
  const QUIZ_LEN = 4; // questions drawn at random from each topic's pool
  const QUIZ_SESSION_MAX = 3; // money quizzes allowed per sign-in session
  const addm = { tab: 'topup', amount: 100, quiz: null };
  const norm = (v) => String(v).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.;]+$/, '');
  function ensureEarn(acc) {
    if (!acc.earn) acc.earn = { pending: 0, total: 0, solved: {}, tries: {}, quiz: {} };
    return acc.earn;
  }
  function earn(acc, amt, text) {
    const e = ensureEarn(acc);
    e.pending = round2(e.pending + amt);
    e.total = round2(e.total + amt);
    logAct(acc, `Earned ${money0(amt)} · ${text}`, 'i-wallet');
    saveDB();
  }
  function openMoney(tab) {
    if (!me()) { acctClick(); return; }
    requireUnlocked(() => {
      if (tab) addm.tab = tab;
      addm.quiz = null;
      Overlay.open('moneyOv');
      renderMoney();
    });
  }
  function renderMoney() { keepFocus($('#moneyBody'), () => renderMoneyNow()); }
  function renderMoneyNow() {
    const acc = me();
    if (!acc || !unlocked()) { Overlay.close('moneyOv'); return; }
    const e = ensureEarn(acc);
    const tabs = [['topup', 'Top up', 'i-wallet'], ['exercises', 'Exercises', 'i-code'], ['quizzes', 'Quizzes', 'i-bolt']];
    let body = '';
    if (addm.tab === 'topup') {
      const amts = [50, 100, 250, 500, 1000];
      body = `<p class="muted small">Add demo credit to your Databell Wallet. Every top-up is confirmed with your PIN.</p>
        <div class="amt-grid">${amts.map((a) => `<button class="amt ${addm.amount === a ? 'on' : ''}" data-act="m-amt" data-amt="${a}" aria-pressed="${addm.amount === a}">${money0(a)}</button>`).join('')}</div>
        <label class="field"><span>Or enter an amount ($1 – $10,000)</span><input id="mCustom" type="number" min="1" max="10000" step="1" inputmode="numeric" value="${amts.includes(addm.amount) ? '' : addm.amount}" placeholder="e.g. 75"></label>
        <button class="btn btn-primary btn-block" data-act="m-topup">${icon('i-lock')} Add ${money0(addm.amount)} with PIN</button>`;
    } else if (addm.tab === 'exercises') {
      const solved = EXERCISES.filter((x) => e.solved[x.id]).length;
      body = `<p class="muted small">Solve a coding or logic exercise to earn cash. Each one pays once · ${solved}/${EXERCISES.length} solved.</p>
        <ul class="ex-list">${EXERCISES.map((x) => {
          const done = !!e.solved[x.id];
          const tries = e.tries[x.id] || 0;
          return `<li class="ex ${done ? 'done' : ''}">
            <div class="ex-top"><span class="ex-tag">${x.lang} · ${x.level}</span><b class="ex-pay">${done ? `${icon('i-check')} Earned` : '+' + money0(x.pay)}</b></div>
            <p>${esc(x.q)}</p><code class="ex-code">${esc(x.code)}</code>
            ${done ? '' : `<form class="ex-form" data-ex="${x.id}" novalidate><input name="ans" autocomplete="off" spellcheck="false" placeholder="Your answer" aria-label="Answer for: ${esc(x.q)}"><button class="btn btn-ghost btn-sm">Check</button></form>
            ${tries ? `<small class="ex-msg">${tries >= 2 ? `${icon('i-alert')} Hint: ${esc(x.hint)}` : 'Not quite — try again.'}</small>` : ''}`}
          </li>`;
        }).join('')}</ul>`;
    } else if (addm.quiz) {
      const qz = MONEY_QUIZZES.find((x) => x.id === addm.quiz.id);
      const st = addm.quiz;
      const left = Math.max(0, QUIZ_SESSION_MAX - (db.session.quizPlays || 0));
      if (st.i >= st.qs.length) {
        body = `<div class="mq-done">${st.quit ? `<div class="done-check quit">${icon('i-x')}</div><h4>${qz.name} quiz ended early</h4><p class="muted">You quit after ${st.answered} of ${st.qs.length} questions · ${st.score} correct · <b>+${money0(st.score * QUIZ_PAY)}</b> kept in pending earnings</p>` : `<div class="done-check">${icon('i-check')}</div><h4>${qz.name} quiz complete</h4><p class="muted">${st.score}/${st.qs.length} correct · <b>+${money0(st.score * QUIZ_PAY)}</b> added to pending earnings</p>`}
          <p class="small muted">${left} of ${QUIZ_SESSION_MAX} quizzes left this session</p><button class="btn btn-ghost btn-sm" data-act="m-quiz-back">Back to quizzes</button></div>`;
      } else {
        const item = st.qs[st.i];
        body = `<div class="mq-head"><b>${icon(qz.icon)} ${qz.name} quiz</b><button class="btn btn-ghost btn-sm mq-quit" data-act="m-quiz-quit">${icon('i-x')} Quit quiz</button></div>
          <span class="muted small">Question ${st.i + 1} of ${st.qs.length} · ${money0(QUIZ_PAY)} per correct answer</span>
          <div class="bar"><i style="width:${(st.i / st.qs.length) * 100}%"></i></div>
          <p class="mq-q">${esc(item.q)}</p>
          <div class="quiz-opts">${item.o.map((o, i) => `<button class="quiz-opt ${st.picked === undefined ? '' : i === item.a ? 'right' : i === st.picked ? 'wrong' : ''}" data-act="m-quiz-pick" data-i="${i}" ${st.picked === undefined ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>
          ${st.picked === undefined ? '' : `<div class="btn-row end"><button class="btn btn-primary btn-sm" data-act="m-quiz-next">${st.i + 1 === st.qs.length ? 'Finish' : 'Next question'}</button></div>`}`;
      }
    } else {
      const plays = db.session.quizPlays || 0;
      const left = Math.max(0, QUIZ_SESSION_MAX - plays);
      body = `<div class="mq-limit ${left ? '' : 'out'}">${icon('i-bolt')}<span><b>${left} of ${QUIZ_SESSION_MAX}</b> quizzes left this session</span><span class="mq-dots">${Array.from({ length: QUIZ_SESSION_MAX }, (_, i) => `<i class="${i < plays ? 'used' : ''}"></i>`).join('')}</span></div>
        <p class="muted small">Each quiz draws ${QUIZ_LEN} random questions and pays ${money0(QUIZ_PAY)} per correct answer. You can quit at any time and keep what you've earned.</p>
        <ul class="mq-list">${MONEY_QUIZZES.map((qz) => {
          const last = e.quiz[qz.id];
          return `<li>${icon(qz.icon)}<span><b>${qz.name} quiz</b><small>${QUIZ_LEN} of ${qz.qs.length} questions · up to ${money0(QUIZ_LEN * QUIZ_PAY)}${last ? ` · last score ${last.score}/${QUIZ_LEN}` : ''}</small></span>
            <button class="btn ${left ? 'btn-primary' : 'btn-ghost'} btn-sm" data-act="m-quiz-start" data-quiz="${qz.id}" ${left ? '' : 'disabled'}>${left ? 'Play' : 'Limit reached'}</button></li>`;
        }).join('')}</ul>
        ${left ? '' : `<p class="note small">${icon('i-alert')}<span>You've played ${QUIZ_SESSION_MAX} quizzes this session. Sign out and sign in again to start a new session.</span></p>`}`;
    }
    $('#moneyBody').innerHTML = `<button class="icon-btn ov-x" data-ov-close aria-label="Close">${icon('i-x')}</button>
      <div class="m-head">${icon('i-wallet', 'ic m-ic')}<div><h3 id="moneyTitle">Add money</h3><span class="muted small">Wallet balance <b>${bigMoney(acc.wallet)}</b></span></div></div>
      <div class="pending ${e.pending ? 'has' : ''}">${icon('i-gift')}<span><small>Pending earnings</small><b>${money(e.pending)}</b><em>${money0(e.total)} earned all-time</em></span>
        <button class="btn btn-primary btn-sm" data-act="m-collect" ${e.pending ? '' : 'disabled'}>${icon('i-lock')} Add to wallet</button></div>
      <div class="seg" role="tablist">${tabs.map(([k, n, ic]) => `<button role="tab" aria-selected="${addm.tab === k}" class="${addm.tab === k ? 'on' : ''}" data-act="m-tab" data-tab="${k}">${icon(ic)} ${n}</button>`).join('')}</div>
      <div class="m-body">${body}</div>`;
    $$('.ex-form', $('#moneyBody')).forEach((f) => f.addEventListener('submit', (ev) => { ev.preventDefault(); checkExercise(f.dataset.ex, f.ans.value); }));
    const cu = $('#mCustom');
    if (cu) cu.addEventListener('input', () => {
      const v = Math.floor(+cu.value);
      if (v >= 1 && v <= 10000) { addm.amount = v; $$('.amt', $('#moneyBody')).forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); $('[data-act="m-topup"]').innerHTML = `${icon('i-lock')} Add ${money0(v)} with PIN`; }
    });
  }
  function checkExercise(id, value) {
    const acc = me();
    const x = EXERCISES.find((y) => y.id === id);
    if (!acc || !x) return;
    const e = ensureEarn(acc);
    if (e.solved[id]) return;
    if (!value.trim()) return;
    const v = norm(value);
    if (x.a.some((a) => norm(a) === v || norm(a).replace(/\s/g, '') === v.replace(/\s/g, ''))) {
      e.solved[id] = Date.now();
      earn(acc, x.pay, `Exercise: ${x.q} (${x.lang})`);
      toast(`Correct! +${money0(x.pay)} added to pending earnings`, 'i-check');
    } else {
      e.tries[id] = (e.tries[id] || 0) + 1;
      saveDB();
      toast('Not quite — try again', 'i-x');
    }
    renderMoney();
  }
  async function collectEarnings() {
    const acc = me();
    if (!acc) return;
    const e = ensureEarn(acc);
    const amt = e.pending;
    if (!amt) return;
    const ok = await confirmPin(`Move ${money(amt)} of earnings from exercises and quizzes into your Databell Wallet.`, 'Add earnings to wallet');
    if (!ok || !unlocked()) return;
    e.pending = 0;
    acc.wallet = round2(acc.wallet + amt);
    logAct(acc, `Added ${money(amt)} of earnings to wallet`, 'i-wallet');
    sendMail(acc.email, { from: 'Databell Wallet', addr: `wallet@${DOMAIN}`, tag: 'orders', subject: `${money(amt)} added to your wallet`, html: mailShell(acc, `<p>You moved <b>${money(amt)}</b> of earnings from exercises and quizzes into your Databell Wallet on ${fmtDate(Date.now())}, confirmed with your PIN.</p><p>New balance: <b>${money(acc.wallet)}</b>.</p>`) });
    saveDB();
    refreshAll();
    if (Overlay.isOpen('moneyOv')) renderMoney();
    toast(`${money(amt)} added to your wallet`, 'i-wallet');
  }
  async function topUpWithPin(amt) {
    const acc = me();
    amt = Math.floor(+amt);
    if (!acc || !(amt >= 1 && amt <= 10000)) { toast('Choose an amount between $1 and $10,000', 'i-alert'); return false; }
    const ok = await confirmPin(`Add ${money0(amt)} of demo credit to your Databell Wallet.`, 'Add money');
    if (!ok || !unlocked()) return false;
    acc.wallet = round2(acc.wallet + amt);
    logAct(acc, `Added ${money0(amt)} to wallet (top-up)`, 'i-wallet');
    sendMail(acc.email, { from: 'Databell Wallet', addr: `wallet@${DOMAIN}`, tag: 'orders', subject: `Wallet top-up · ${money0(amt)}`, html: mailShell(acc, `<p>${money0(amt)} of demo credit was added to your Databell Wallet on ${fmtDate(Date.now())}, confirmed with your PIN.</p><p>New balance: <b>${money(acc.wallet)}</b>.</p>`) });
    saveDB();
    refreshAll();
    if (Overlay.isOpen('moneyOv')) renderMoney();
    toast(`${money0(amt)} added to your wallet`, 'i-wallet');
    return true;
  }

  /* =========================================================
     BDAI SUBSCRIPTIONS & REWARDS
     ========================================================= */
  const SUBS = {
    free: { name: 'BDAI Free', price: 0, mult: 1, disc: 0, perks: ['Daily check-in and lucky spin', 'All quests and activities', 'Standard support'] },
    pro: { name: 'BDAI Pro', price: 19, mult: 1.5, disc: 0.05, perks: ['1.5× points on every activity', '5% off the Databell Store', 'Priority TechKnowledge labs'] },
    teampro: { name: 'BDAI Team Pro', price: 49, mult: 2, disc: 0.1, freeShip: true, perks: ['2× points on every activity', '10% off the Databell Store', 'Free shipping on every order', 'Up to 10 team seats', 'Priority support'] }
  };
  const subOf = (acc) => SUBS[(acc && acc.sub && acc.sub.plan) || 'free'] || SUBS.free;
  const planChip = (acc) => (acc && acc.sub && acc.sub.plan !== 'free' ? `<span class="plan-chip">${icon('i-star')} ${SUBS[acc.sub.plan].name}</span>` : '');
  const today = () => new Date().toLocaleDateString('en-CA');
  const untilMidnight = () => {
    const now = new Date(); const end = new Date(now); end.setHours(24, 0, 0, 0);
    const m = Math.ceil((end - now) / 60000);
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  };

  function ensureMember(acc) {
    if (!acc) return acc;
    if (!acc.rewards) acc.rewards = { checkin: '', spin: '', spinWon: 0, spinDeg: 0, quizDay: '', quizPts: 0, articles: [], courses: [], sections: [], quests: {} };
    if (!acc.ledger) acc.ledger = [];
    if (!acc.sub) acc.sub = { plan: 'free' };
    if (isFounder(acc) && !acc.sub.comp) {
      acc.sub = { plan: 'teampro', since: Date.now(), comp: true };
      acc.rewards.quests.subscribe = acc.rewards.quests.subscribe || Date.now();
      logAct(acc, 'BDAI Team Pro activated · complimentary for the Founder', 'i-star');
    }
    return acc;
  }

  function addLedger(acc, pts, text) {
    ensureMember(acc);
    acc.ledger.unshift({ t: Date.now(), pts, text });
    if (acc.ledger.length > 80) acc.ledger.length = 80;
  }
  function award(acc, base, text, opts = {}) {
    ensureMember(acc);
    const pts = Math.max(1, Math.round(base * (opts.noMult ? 1 : subOf(acc).mult)));
    acc.points += pts;
    addLedger(acc, pts, text);
    saveDB();
    refreshBadges();
    if (Overlay.isOpen('acctOv')) renderAccount();
    if (!opts.silent) toast(`+${pts.toLocaleString()} points · ${text}`, 'i-gift');
    return pts;
  }

  const QUESTS = [
    { id: 'explorer', icon: 'i-globe', title: 'Explore the ecosystem', desc: 'Visit SoftwareLabs, TechEnhance, TechKnowledge and the Store', pts: 75, go: '#labs', progress: (r) => `${Math.min(4, r.sections.length)}/4 visited` },
    { id: 'reader', icon: 'i-book', title: 'Bookworm', desc: 'Read 3 knowledge-base articles', pts: 60, go: '#knowledge', progress: (r) => `${Math.min(3, r.articles.length)}/3 read` },
    { id: 'learner', icon: 'i-award', title: 'Lifelong learner', desc: 'Enroll in a TechKnowledge course', pts: 40, go: '#knowledge' },
    { id: 'quizace', icon: 'i-bolt', title: 'Quiz ace', desc: 'Score 5/5 in the Tech Pulse quiz', pts: 100, go: '#quiz' },
    { id: 'wish', icon: 'i-heart', title: 'Window shopper', desc: 'Save a product to your wishlist', pts: 20, go: '#shop' },
    { id: 'firstOrder', icon: 'i-box', title: 'First order', desc: 'Buy anything in the Databell Store', pts: 150, go: '#shop' },
    { id: 'secure', icon: 'i-shield', title: 'Fortress', desc: 'Reach a security score of 100', pts: 80, tab: 'security' },
    { id: 'subscribe', icon: 'i-star', title: 'Go Pro', desc: 'Join BDAI Pro or BDAI Team Pro', pts: 100, tab: 'plan' },
    { id: 'cmdk', icon: 'i-cmd', title: 'Power user', desc: 'Open the command palette (Ctrl K)', pts: 20, run: 'cmd' },
    { id: 'newsletter', icon: 'i-mail', title: 'Stay in the loop', desc: 'Subscribe to the tech digest', pts: 30, go: '.site-footer' },
    { id: 'contact', icon: 'i-send', title: 'Say hello', desc: 'Send us a project enquiry', pts: 40, go: '#contact' },
    { id: 'coder', icon: 'i-terminal', title: 'Hello, world', desc: 'Run a program in the Code Lab', pts: 30, go: '#codelab' },
    { id: 'presenter', icon: 'i-slides', title: 'Presenter', desc: 'View every slide of a presentation', pts: 60, go: '#presentations' },
    { id: 'tester', icon: 'i-flask', title: 'All green', desc: 'Pass every check on a Studio prototype', pts: 40, go: '#studio' },
    { id: 'pledge', icon: 'i-leaf', title: 'Green Diwali', desc: 'Take the BDAIGoGreen pledge', pts: 50, go: '#gogreen' }
  ];
  const SPIN = [25, 50, 10, 100, 25, 200, 50, 500];
  const SPIN_W = [20, 15, 22, 8, 20, 4, 10, 1];
  const QUIET = ['section', 'cmdk', 'wish'];
  let nudged = false;

  function completeQuest(acc, id) {
    ensureMember(acc);
    const q = QUESTS.find((x) => x.id === id);
    if (!q || acc.rewards.quests[id]) return;
    acc.rewards.quests[id] = Date.now();
    logAct(acc, `Quest complete · ${q.title}`, 'i-award');
    award(acc, q.pts, `Quest complete: ${q.title}`);
  }
  // Called from activities around the site; points only go to an unlocked Databell ID
  function rewardActivity(kind, key) {
    const acc = unlocked() ? ensureMember(me()) : null;
    if (!acc) {
      if (!QUIET.includes(kind) && !nudged && Object.keys(db.accounts).length + 1) { nudged = true; setTimeout(() => toast('Sign in to your Databell ID to earn points for activities', 'i-gift'), 1600); }
      return;
    }
    const r = acc.rewards;
    switch (kind) {
      case 'article':
        if (!r.articles.includes(key)) { r.articles.push(key); award(acc, 10, `Read “${key}”`); if (r.articles.length >= 3) setTimeout(() => completeQuest(acc, 'reader'), 1800); }
        break;
      case 'course':
        if (!r.courses.includes(key)) { r.courses.push(key); award(acc, 15, `Enrolled in ${key}`); setTimeout(() => completeQuest(acc, 'learner'), 1800); }
        break;
      case 'quiz': {
        const d = today();
        if (r.quizDay !== d) { r.quizDay = d; r.quizPts = 0; }
        if (r.quizPts < 100) { r.quizPts += 20; award(acc, 20, 'Correct quiz answer'); }
        break;
      }
      case 'quiz-perfect': setTimeout(() => completeQuest(acc, 'quizace'), 1500); break;
      case 'section':
        if (!r.sections.includes(key)) { r.sections.push(key); saveDB(); if (r.sections.length >= 4) completeQuest(acc, 'explorer'); }
        break;
      default: completeQuest(acc, kind);
    }
  }

  function checkIn() {
    const acc = ensureMember(me());
    if (!acc || !unlocked() || acc.rewards.checkin === today()) return;
    acc.rewards.checkin = today();
    logAct(acc, 'Daily check-in', 'i-gift');
    award(acc, 25, 'Daily check-in');
  }
  function spin(btn) {
    const acc = ensureMember(me());
    if (!acc || !unlocked() || acc.rewards.spin === today()) return;
    const total = SPIN_W.reduce((a, b) => a + b, 0);
    let roll = randWords(1)[0] % total, idx = 0;
    while (roll >= SPIN_W[idx]) { roll -= SPIN_W[idx]; idx += 1; }
    const deg = 360 * 6 + (360 - (idx * 45 + 22.5));
    acc.rewards.spin = today();
    acc.rewards.spinWon = SPIN[idx];
    acc.rewards.spinDeg = deg % 360;
    saveDB();
    const disc = $('#wheelDisc');
    const wheel = disc.closest('.wheel');
    wheel.classList.add('spinning');
    btn.disabled = true;
    btn.textContent = 'Spinning…';
    disc.style.transition = reduceMotion ? 'none' : 'transform 3.2s cubic-bezier(.15,.7,.15,1)';
    requestAnimationFrame(() => { disc.style.transform = `rotate(${deg}deg)`; });
    setTimeout(() => {
      wheel.classList.remove('spinning');
      logAct(acc, `Lucky spin landed on ${SPIN[idx]}`, 'i-gift');
      award(acc, SPIN[idx], `Lucky spin landed on ${SPIN[idx]}`);
    }, reduceMotion ? 80 : 3400);
  }
  function redeemPoints() {
    const acc = ensureMember(me());
    if (!acc || !unlocked() || acc.points < 1000) return;
    acc.points -= 1000;
    acc.wallet = round2(acc.wallet + 10);
    addLedger(acc, -1000, 'Redeemed for $10 wallet credit');
    logAct(acc, 'Redeemed 1,000 points for $10 wallet credit', 'i-wallet');
    saveDB();
    refreshAll();
    toast('1,000 points redeemed · $10 added to your wallet', 'i-wallet');
  }

  async function choosePlan(k) {
    const acc = ensureMember(me());
    if (!acc || !unlocked() || acc.sub.comp || !SUBS[k] || acc.sub.plan === k) return;
    const p = SUBS[k];
    if (k === 'free') {
      const old = subOf(acc).name;
      acc.sub = { plan: 'free' };
      logAct(acc, `${old} cancelled`, 'i-star');
      sendMail(acc.email, { from: 'Databell Billing', addr: `billing@${DOMAIN}`, tag: 'updates', subject: `${old} cancelled`, html: mailShell(acc, `<p>Your ${old} subscription was cancelled on ${fmtDate(Date.now())}. You're now on BDAI Free.</p>`) });
      saveDB(); renderAccount(); toast(`${old} cancelled — you're on BDAI Free`, 'i-star');
      return;
    }
    if (acc.wallet < p.price) { toast(`Add wallet credit first — ${p.name} is ${money(p.price)} a month`, 'i-alert'); return; }
    const ok = await confirmPin(`Subscribe to ${p.name} for ${money(p.price)} a month, paid from your Databell Wallet.`, `Subscribe to ${p.name}`);
    if (!ok || !unlocked()) return;
    acc.wallet = round2(acc.wallet - p.price);
    acc.sub = { plan: k, since: Date.now(), renews: Date.now() + 30 * 864e5 };
    logAct(acc, `Subscribed to ${p.name} · ${money(p.price)}/month`, 'i-star');
    sendMail(acc.email, {
      from: 'Databell Billing', addr: `billing@${DOMAIN}`, tag: 'orders', subject: `Welcome to ${p.name} · ${money(p.price)}`,
      html: mailShell(acc, `<p>You're now on <b>${p.name}</b>. ${money(p.price)} was paid from your Databell Wallet; your plan renews on ${new Date(acc.sub.renews).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p><ul>${p.perks.map((x) => `<li>${x}</li>`).join('')}</ul>`)
    });
    saveDB();
    refreshAll();
    toast(`Welcome to ${p.name}!`, 'i-star');
    setTimeout(() => completeQuest(acc, 'subscribe'), 1800);
  }
  function checkRenewal(acc) {
    ensureMember(acc);
    const sub = acc.sub;
    if (sub.plan === 'free' || sub.comp || !sub.renews || sub.renews > Date.now()) return false;
    const p = SUBS[sub.plan];
    if (acc.wallet >= p.price) {
      acc.wallet = round2(acc.wallet - p.price);
      sub.renews += 30 * 864e5;
      logAct(acc, `${p.name} renewed · ${money(p.price)}`, 'i-star');
      sendMail(acc.email, { from: 'Databell Billing', addr: `billing@${DOMAIN}`, tag: 'orders', subject: `${p.name} renewed · ${money(p.price)}`, html: mailShell(acc, `<p>Your ${p.name} plan renewed and ${money(p.price)} was paid from your wallet.</p>`) });
    } else {
      acc.sub = { plan: 'free' };
      logAct(acc, `${p.name} ended — not enough wallet balance`, 'i-alert');
      sendMail(acc.email, { from: 'Databell Billing', addr: `billing@${DOMAIN}`, tag: 'orders', subject: `${p.name} could not renew`, html: mailShell(acc, `<p>Your wallet didn't have ${money(p.price)} for the renewal, so you're back on BDAI Free.</p>`) });
    }
    return true;
  }

  function planTabHTML(acc) {
    ensureMember(acc);
    const cur = acc.sub.plan;
    const s = SUBS[cur];
    const status = acc.sub.comp ? 'Complimentary for the Founder · never billed'
      : cur === 'free' ? 'Free forever · upgrade any time'
        : `Renews ${new Date(acc.sub.renews).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${money(s.price)}/month from your wallet`;
    return `<div class="plan-now plan-${cur}">${icon(acc.sub.comp ? 'i-crown' : 'i-star')}<div><small>Your BDAI plan</small><strong>${s.name}</strong><span>${status}</span></div></div>
      <div class="sub-list">${Object.entries(SUBS).map(([k, p]) => {
        const btn = k === cur ? '<button class="btn btn-ghost btn-sm" disabled>Current plan</button>'
          : acc.sub.comp ? '<button class="btn btn-ghost btn-sm" disabled>Founder has Team Pro</button>'
            : `<button class="btn ${k === 'free' ? 'btn-ghost' : 'btn-primary'} btn-sm" data-act="sub-pick" data-plan="${k}">${k === 'free' ? 'Switch to Free' : `Choose ${p.name}`}</button>`;
        return `<div class="sub-card sub-${k} ${k === cur ? 'on' : ''}"><div class="sub-top"><b>${p.name}</b><span>${p.price ? `${money0(p.price)}<small>/mo</small>` : 'Free'}</span></div><ul class="tick-list">${p.perks.map((x) => `<li>${x}</li>`).join('')}</ul>${btn}</div>`;
      }).join('')}</div>
      <p class="muted small">Plans are paid monthly from your Databell Wallet and confirmed with your PIN. Plan discounts and free shipping apply automatically at checkout.</p>`;
  }

  function rewardsTabHTML(acc) {
    ensureMember(acc);
    const r = acc.rewards, plan = subOf(acc), d = today();
    const todayPts = acc.ledger.filter((x) => x.pts > 0 && new Date(x.t).toLocaleDateString('en-CA') === d && !/^Order #/.test(x.text)).reduce((a, x) => a + x.pts, 0);
    const checked = r.checkin === d, spun = r.spin === d;
    const m = (base) => Math.round(base * plan.mult);
    const quizToday = r.quizDay === d ? r.quizPts : 0;
    const questsLeft = QUESTS.filter((q) => !r.quests[q.id]).length;
    return `<div class="rw-head"><div><small>Databell Points</small><strong>${acc.points.toLocaleString()}</strong><span>+${todayPts.toLocaleString()} earned today · ${questsLeft} quests left</span></div><span class="mult-chip">${icon('i-bolt')} ${plan.name} · ${plan.mult}× points</span></div>
      <div class="rw-grid">
        <div class="rw-card">${icon('i-gift', 'ic rw-ic')}<b>Daily check-in</b><small>+${m(25)} points every day</small>
          <button class="btn ${checked ? 'btn-ghost' : 'btn-primary'} btn-sm btn-block" data-act="rw-checkin" ${checked ? 'disabled' : ''}>${checked ? `${icon('i-check')} Checked in · next in ${untilMidnight()}` : 'Check in'}</button></div>
        <div class="rw-card">
          <div class="wheel ${spun ? 'done' : ''}"><div class="wheel-disc" id="wheelDisc" style="transform: rotate(${spun ? r.spinDeg : 0}deg)">${SPIN.map((v, i) => `<span style="--a:${i * 45 + 22.5}deg">${v}</span>`).join('')}</div><i class="wheel-pin" aria-hidden="true"></i><em class="wheel-hub">${icon('i-gift')}</em></div>
          <button class="btn ${spun ? 'btn-ghost' : 'btn-primary'} btn-sm btn-block" data-act="rw-spin" ${spun ? 'disabled' : ''}>${spun ? `Won ${r.spinWon} · next in ${untilMidnight()}` : 'Lucky spin'}</button></div>
      </div>
      <ul class="rw-acts">
        <li>${icon('i-bolt')}<span><b>Tech Pulse quiz</b><small>+${m(20)} per correct answer · ${quizToday}/100 base points today</small></span><button class="btn btn-ghost btn-sm" data-act="quest-go" data-quest="quizace">Play</button></li>
        <li>${icon('i-book')}<span><b>Read the knowledge base</b><small>+${m(10)} per new article · ${r.articles.length}/${ARTICLES.length} read</small></span><button class="btn btn-ghost btn-sm" data-act="quest-go" data-quest="reader">Read</button></li>
        <li>${icon('i-award')}<span><b>Enroll in courses</b><small>+${m(15)} per new course · ${r.courses.length}/${COURSES.length} enrolled</small></span><button class="btn btn-ghost btn-sm" data-act="quest-go" data-quest="learner">Browse</button></li>
      </ul>
      <h4 class="d-h">${icon('i-award')} Quests</h4>
      <ul class="quests">${QUESTS.map((q) => {
        const done = !!r.quests[q.id];
        return `<li class="quest ${done ? 'done' : ''}">${icon(q.icon)}<span><b>${q.title}</b><small>${q.desc}${q.progress && !done ? ` · ${q.progress(r)}` : ''}</small></span>${done ? `<em class="q-done">${icon('i-check')} Done</em>` : `<button class="btn btn-ghost btn-sm" data-act="quest-go" data-quest="${q.id}">+${m(q.pts)} ${icon('i-arrow')}</button>`}</li>`;
      }).join('')}</ul>
      <div class="redeem">${icon('i-wallet')}<span><b>Redeem points</b><small>1,000 points = $10 wallet credit</small></span><button class="btn btn-ghost btn-sm" data-act="rw-redeem" ${acc.points >= 1000 ? '' : 'disabled'}>Redeem</button></div>
      <h4 class="d-h">${icon('i-history')} Points history</h4>
      <ul class="activity ledger">${acc.ledger.length ? acc.ledger.slice(0, 14).map((x) => `<li><b class="${x.pts < 0 ? 'neg' : 'pos'}">${x.pts > 0 ? '+' : ''}${x.pts.toLocaleString()}</b><span>${esc(x.text)}</span><small>${ago(x.t)}</small></li>`).join('') : '<li><span class="muted">No points yet — check in to start.</span></li>'}</ul>`;
  }
  function questGo(id) {
    const q = QUESTS.find((x) => x.id === id);
    if (!q) return;
    if (q.tab) { acctTab = q.tab; renderAccount(); return; }
    Overlay.close('acctOv');
    if (q.run === 'cmd') { setTimeout(openCmd, 150); return; }
    setTimeout(() => goTo(q.go), 150);
  }
  function initExplorer() {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) rewardActivity('section', en.target.id); }), { threshold: 0.3 });
    ['labs', 'enhance', 'knowledge', 'shop'].forEach((id) => { const el = $('#' + id); if (el) io.observe(el); });
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
      btn.classList.toggle('founder', isFounder(acc));
      btn.classList.add('signed');
      const u = isLocked ? 0 : unreadFor(acc.email);
      mc.hidden = !u;
      mc.textContent = u;
      btn.setAttribute('aria-label', isLocked ? `Databell ID locked — unlock ${acc.first}` : `Open Databell ID for ${acc.first} ${acc.last}${u ? `, ${u} unread messages` : ''}`);
    } else {
      $('#acctAvatar').innerHTML = icon('i-user');
      $('#acctLabel').textContent = 'Sign in';
      btn.classList.remove('locked', 'signed', 'founder');
      mc.hidden = true;
      btn.setAttribute('aria-label', 'Sign in to Databell ID');
    }
  }
  function refreshAll() {
    refreshBadges();
    if (Overlay.isOpen('acctOv')) renderAccount();
    if (Overlay.isOpen('cartOv')) renderCart();
    if (Overlay.isOpen('checkoutOv') && co && co.step !== 'done') renderCheckout();
    if (Overlay.isOpen('moneyOv')) renderMoney();
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
    actions.push({ label: 'Earn points — daily check-in, lucky spin & quests', icon: 'i-gift', run: () => (me() ? requireUnlocked(() => openAccount('rewards')) : acctClick()) });
    actions.push({ label: 'Add money — top up, exercises & quizzes', icon: 'i-wallet', run: () => openMoney() });
    actions.push({ label: 'BDAI subscription plans', icon: 'i-star', run: () => (me() ? requireUnlocked(() => openAccount('plan')) : acctClick()) });
    if (acc && unlocked()) actions.push({ label: 'Lock Databell ID now', icon: 'i-lock', run: () => lockSession(false) }, { label: 'Sign out', icon: 'i-logout', run: signOut });
    if (acc) actions.push({ label: 'Forgot PIN — recover with key or inbox', icon: 'i-key', run: () => auth('forgot', { email: acc.email }) });
    const pages = [['Home', '#home'], ['Company', '#about'], ['Ecosystem', '#ecosystem'], ['DatabellSoftwareLabs', '#labs'], ['TechEnhance', '#enhance'], ['TechKnowledge', '#knowledge'], ['Databell Store', '#shop'], ['Technology stack', '#stack'], ['Impact', '#impact'], ['Client stories', '#stories'], ['Plans', '#plans'], ['FAQ', '#faq'], ['Contact', '#contact'],
      ['Hub · Extension 08', '#hub'], ['Architecture', '#architecture'], ['Connections: maths, science & coding', '#connections'], ['Code Lab', '#codelab'], ['Presentations', '#presentations'], ['Studio: Mathopea & Experimentium', '#studio'], ['Exhibition 2026', '#exhibition'], ['BDAIGoGreen: Green Earth Diwali', '#gogreen']]
      .map(([n, h]) => ({ group: 'Pages', label: n, icon: 'i-arrow', run: () => goTo(h) }));
    return actions.map((a) => Object.assign({ group: 'Actions' }, a))
      .concat(pages)
      .concat(PRODUCTS.map((p) => ({ group: 'Store', label: p.name, hint: money(unitPrice(p)), icon: p.icon, run: () => openProduct(p.id) })))
      .concat(ARTICLES.map((a) => ({ group: 'Knowledge base', label: a.title, hint: a.tag, icon: a.icon, run: () => openArticle(a, null) })))
      .concat(COURSES.map((c) => ({ group: 'Courses', label: c.title, hint: c.level, icon: c.icon, run: () => goTo('#knowledge') })))
      .concat(DECKS.flatMap((d) => d.slides.map((sl, i) => ({ group: 'Slides', label: sl.t, hint: `${d.short} · ${i + 1}`, icon: 'i-slides', run: () => { openDeck(d.id, i); goTo('#presentations'); } }))))
      .concat(LAB.map((f) => ({ group: 'Code Lab', label: f.name, hint: f.mode === 'sim' ? 'simulated' : 'runs live', icon: 'i-terminal', run: () => { labOpen(f.id); goTo('#codelab'); } })))
      .concat(ARCH_FLOWS.map((f) => ({ group: 'Architecture', label: `Trace: ${f.name}`, icon: f.icon, run: () => { goTo('#architecture'); setTimeout(() => archTrace(f.id), 500); } })));
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
  function openCmd() { $('#cmdInput').value = ''; cmd.sel = 0; Overlay.open('cmdOv'); renderCmd(); $('#cmdInput').focus(); setTimeout(() => rewardActivity('cmdk'), 1500); }
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
      case 'co-topup': if (acc) topUpWithPin(+el.dataset.amt).then((ok) => { if (ok) renderCheckout(); }); break;
      case 'co-pay': payNow(); break;
      case 'co-orders': Overlay.close('checkoutOv'); openAccount('orders'); break;
      case 'co-close': Overlay.close('checkoutOv'); break;
      // account
      case 'tab': acctTab = el.dataset.tab; renderAccount(); break;
      case 'topup': openMoney('topup'); break;
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
      case 'money-open': openMoney(); break;
      case 'm-tab': addm.tab = el.dataset.tab; addm.quiz = null; renderMoney(); break;
      case 'm-amt': addm.amount = +el.dataset.amt; renderMoney(); break;
      case 'm-topup': topUpWithPin(addm.amount); break;
      case 'm-collect': collectEarnings(); break;
      case 'm-quiz-start': {
        const qz = MONEY_QUIZZES.find((x) => x.id === el.dataset.quiz);
        if (!qz || !acc || !db.session) break;
        const plays = db.session.quizPlays || 0;
        if (plays >= QUIZ_SESSION_MAX) { toast(`You've played ${QUIZ_SESSION_MAX} quizzes this session`, 'i-alert'); break; }
        db.session.quizPlays = plays + 1;
        ensureEarn(acc).quiz[qz.id] = { day: today(), score: 0 };
        saveDB();
        const qs = shuffle(qz.qs.slice()).slice(0, QUIZ_LEN).map((q) => {
          const order = shuffle(q.o.map((_, i) => i));
          return { q: q.q, o: order.map((i) => q.o[i]), a: order.indexOf(q.a) };
        });
        addm.quiz = { id: qz.id, qs, i: 0, score: 0, picked: undefined, quit: false, answered: 0 };
        renderMoney();
        break;
      }
      case 'm-quiz-quit': {
        const st = addm.quiz;
        if (!st || st.i >= st.qs.length) break;
        st.answered = st.i + (st.picked === undefined ? 0 : 1);
        st.quit = true;
        st.i = st.qs.length;
        logAct(acc, `Quit a quiz after ${st.answered} questions`, 'i-bolt');
        saveDB();
        renderMoney();
        break;
      }
      case 'm-quiz-pick': {
        const st = addm.quiz;
        if (!st || st.picked !== undefined) break;
        const qz = MONEY_QUIZZES.find((x) => x.id === st.id);
        st.picked = +el.dataset.i;
        if (st.picked === st.qs[st.i].a) {
          st.score += 1;
          ensureEarn(acc).quiz[st.id].score = st.score;
          earn(acc, QUIZ_PAY, `${qz.name} quiz answer`);
          toast(`Correct! +${money0(QUIZ_PAY)} pending`, 'i-check');
        }
        renderMoney();
        break;
      }
      case 'm-quiz-next': if (addm.quiz) { addm.quiz.i += 1; addm.quiz.picked = undefined; renderMoney(); } break;
      case 'm-quiz-back': addm.quiz = null; renderMoney(); break;
      case 'rw-checkin': checkIn(); break;
      case 'rw-spin': spin(el); break;
      case 'rw-redeem': redeemPoints(); break;
      case 'sub-pick': choosePlan(el.dataset.plan); break;
      case 'quest-go': questGo(el.dataset.quest); break;
      case 'pw-toggle': {
        const input = el.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        el.setAttribute('aria-label', show ? 'Hide founder code' : 'Show founder code');
        el.setAttribute('aria-pressed', String(show));
        input.focus();
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
    Object.values(db.accounts).forEach(ensureMember);
    saveDB();
    initShop();
    initCmd();
    initExplorer();
    refreshBadges();
    // keep "x min ago" labels and order stages fresh while panels are open
    setInterval(() => { if (Overlay.isOpen('acctOv') && !$('#acctBody details[open]') && !$('.wheel.spinning')) renderAccount(); }, 30000);
  }


  /* =========================================================
     EXTENSION 8 — DATABELL HUB
     Architecture · Connections · Code Lab · Presentations ·
     Studio · Exhibition · BDAIGoGreen
     ========================================================= */
  const HUB_SECTIONS = ['hub', 'architecture', 'connections', 'codelab', 'presentations', 'studio', 'exhibition', 'gogreen'];
  const pad2 = (n) => String(n).padStart(2, '0');
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

  /* ---------- Python-style helpers (Code Lab and Studio) ---------- */
  // Compensated sum, the same as Python 3.12+ sum() over floats
  function pySum(xs) {
    let s = 0, c = 0;
    for (const x of xs) {
      const t = s + x;
      c += Math.abs(s) >= Math.abs(x) ? (s - t) + x : (x - t) + s;
      s = t;
    }
    return s + c;
  }
  const pyFloat = (v) => (Number.isFinite(v) ? (Number.isInteger(v) && Math.abs(v) < 1e16 ? v.toFixed(1) : String(v)) : (Number.isNaN(v) ? 'nan' : v > 0 ? 'inf' : '-inf'));
  const pyRound2 = (v) => Math.round(v * 100) / 100;

  /* ---------- Tiny syntax highlighter ---------- */
  const KW = {
    py: 'def return for in if not import from raise and or is None True False while lambda print range len sum type int float all any',
    js: 'const let var function return if else for of in new class console log null undefined true false while typeof',
    sql: 'SELECT FROM WHERE ORDER BY DESC ASC GROUP COUNT AS LIMIT AND OR JOIN ON',
    cpp: 'int return for include main std cout'
  };
  const KWSET = Object.fromEntries(Object.entries(KW).map(([k, v]) => [k, new Set(v.split(' '))]));
  function highlight(code, lang) {
    const e = escapeHTML;
    if (lang === 'html') {
      return code.replace(/(<!--[\s\S]*?-->)|(<\/?)([a-zA-Z][\w-]*)|([\w-]+)(=)("[^"]*"|'[^']*')|(\/?>)|([^<]+)/g,
        (m, com, lt, tag, an, eq, av, gt, txt) => com ? `<span class="t-c">${e(com)}</span>`
          : tag ? `<span class="t-p">${e(lt)}</span><span class="t-k">${tag}</span>`
          : an ? `<span class="t-f">${an}</span>${eq}<span class="t-s">${e(av)}</span>`
          : gt ? `<span class="t-p">${e(gt)}</span>` : e(txt));
    }
    if (lang === 'css') {
      return code.replace(/(\/\*[\s\S]*?\*\/)|([.#]?[a-zA-Z][\w-]*)(?=\s*\{)|([a-z-]+)(?=\s*:)|(#[0-9a-fA-F]{3,8}\b)|(\d*\.?\d+(?:px|rem|em|%|s)?)|([\s\S])/g,
        (m, com, sel, prop, hex, num, other) => com ? `<span class="t-c">${e(com)}</span>`
          : sel ? `<span class="t-k">${e(sel)}</span>` : prop ? `<span class="t-f">${prop}</span>`
          : hex ? `<span class="t-s">${hex}</span>` : num ? `<span class="t-n">${num}</span>` : e(other));
    }
    const comment = { py: '#[^\\n]*', js: '\\/\\/[^\\n]*', sql: '--[^\\n]*', cpp: '\\/\\/[^\\n]*|#include' }[lang] || '\\/\\/[^\\n]*';
    const re = new RegExp(`(${comment})|(\`(?:[^\`\\\\]|\\\\.)*\`|"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*')|\\b(\\d+(?:\\.\\d+)?)\\b|([A-Za-z_][\\w]*)(?=\\s*\\()|([A-Za-z_][\\w]*)|([\\s\\S])`, 'g');
    const set = KWSET[lang] || new Set();
    return code.replace(re, (m, com, str, num, fn, word, other) => {
      if (com) return `<span class="${com === '#include' ? 't-k' : 't-c'}">${e(com)}</span>`;
      if (str) return `<span class="t-s">${e(str)}</span>`;
      if (num) return `<span class="t-n">${num}</span>`;
      if (fn) return set.has(fn) ? `<span class="t-k">${fn}</span>` : `<span class="t-f">${fn}</span>`;
      if (word) return set.has(word) || set.has(word.toUpperCase()) && lang === 'sql' ? `<span class="t-k">${word}</span>` : word;
      return e(other);
    });
  }

  /* =========================================================
     NAV: Hub dropdown
     ========================================================= */
  function initNavDrop() {
    const drop = $('#navDrop');
    const btn = $('#navDropBtn');
    if (!drop) return;
    const set = (open) => { drop.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); set(!drop.classList.contains('open')); });
    document.addEventListener('click', (e) => { if (!drop.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drop.classList.contains('open')) { set(false); btn.focus(); } });
    $$('a', drop).forEach((a) => a.addEventListener('click', () => set(false)));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) btn.classList.toggle('active', HUB_SECTIONS.includes(en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => io.observe(s));
  }

  /* =========================================================
     ARCHITECTURE
     ========================================================= */
  const ARCH_LAYERS = [
    { id: 'exp', name: 'Experience', nodes: ['web', 'mobile', 'store', 'inbox', 'decks'] },
    { id: 'edge', name: 'Edge & identity', nodes: ['cdn', 'gateway', 'dbid'] },
    { id: 'svc', name: 'Services', nodes: ['labs', 'enhance', 'know', 'mathopea', 'experimentium', 'commerce'] },
    { id: 'data', name: 'Data', nodes: ['pg', 'stream', 'lake', 'search', 'objects'] },
    { id: 'plat', name: 'Platform', nodes: ['cicd', 'iac', 'k8s', 'obs'] }
  ];
  const ARCH = {
    web: ['Web experience', 'i-globe', 'This site: the home page, the Hub and the Store, served as static HTML, CSS and JavaScript.', ['HTML', 'CSS', 'JavaScript']],
    mobile: ['Mobile apps', 'i-mobile', 'Native iOS and Android clients from DatabellSoftwareLabs, using the same APIs as the web.', ['Swift', 'Kotlin']],
    store: ['Databell Store', 'i-cart', 'Catalogue, cart and PIN-confirmed checkout, paid from the Databell Wallet.', ['Cart', 'Checkout', 'Wishlist']],
    inbox: ['Databell Inbox', 'i-inbox', 'Delivers licence keys, recovery codes and order updates to every Databell ID.', ['Mail', 'Notifications']],
    decks: ['Presentations hub', 'i-slides', 'Slide decks rebuilt for the web, with full-screen presenting and the original .pptx files to download.', ['Slides', 'Fullscreen API']],
    cdn: ['CDN & edge cache', 'i-cloud', 'Serves pages, images and decks from the location nearest each visitor.', ['Edge cache', 'TLS']],
    gateway: ['API gateway', 'i-network', 'The single entry point for every API, handling routing, rate limits and request logs.', ['Routing', 'Rate limits']],
    dbid: ['Databell ID', 'i-fingerprint', 'Accounts, 6-digit PIN sign-in, session lock and recovery keys.', ['PIN auth', 'Sessions']],
    labs: ['SoftwareLabs services', 'i-code', 'Product services built in two-week sprints: SaaS, AI and data platforms.', ['Python', 'TypeScript', 'Go']],
    enhance: ['TechEnhance ops', 'i-rocket', 'Performance tuning, autoscaling and FinOps on the live platform, plus the capability-growth tracks.', ['FinOps', 'Autoscaling']],
    know: ['TechKnowledge learning', 'i-book', 'Courses, enrolments, quizzes and the knowledge-base articles.', ['Courses', 'Quizzes', 'KB']],
    mathopea: ['Mathopea logic engine', 'i-sigma', 'Pure maths functions such as sequences, Fibonacci and factorials, used by MathQuest-style exercises.', ['Pure functions', 'Python']],
    experimentium: ['Experimentium sandbox', 'i-flask', 'Runs experiments: records a hypothesis, captures readings and validates them before summarising.', ['Validation', 'Notebooks']],
    commerce: ['Commerce & wallet', 'i-wallet', 'Orders, coupons, points and wallet balances.', ['Orders', 'Points']],
    pg: ['PostgreSQL', 'i-data', 'The system of record for accounts, orders, records and enrolments.', ['SQL', 'Backups']],
    stream: ['Event stream', 'i-bolt', 'Every order, click and reading is published as an event for other services to use.', ['Kafka', 'Events']],
    lake: ['Lakehouse analytics', 'i-chart', 'Turns raw events into InsightBoard dashboards, such as the top five app features.', ['SQL', 'Dashboards']],
    search: ['Search index', 'i-search', 'Case-insensitive title search across articles, records and slides.', ['Full-text', 'Ranking']],
    objects: ['Object storage', 'i-box', 'Stores media, slide images and the original PowerPoint files.', ['Blobs', 'Versioning']],
    cicd: ['CI/CD pipeline', 'i-refresh', 'Write, test, improve: every commit is built, tested and deployed automatically.', ['Git', 'Tests']],
    iac: ['Terraform IaC', 'i-layers', 'Infrastructure defined as code and reviewed like any other change.', ['Terraform']],
    k8s: ['Kubernetes', 'i-cpu', 'Runs every service in containers and scales them with traffic.', ['Containers', 'Autoscaling']],
    obs: ['Observability', 'i-eye', 'Metrics, logs and traces, with alerts that fire before users notice a problem.', ['Metrics', 'Tracing']]
  };
  const ARCH_FLOWS = [
    { id: 'buy', name: 'Buy in the Store', icon: 'i-cart', steps: [['store', 'A visitor taps “Buy” in the Databell Store'], ['cdn', 'Pages and images come from the nearest edge'], ['gateway', 'The checkout request enters the API gateway'], ['dbid', 'Databell ID asks for the 6-digit PIN'], ['commerce', 'Order created, wallet charged, points added'], ['pg', 'The order is written to PostgreSQL'], ['stream', 'An “order.placed” event is published'], ['inbox', 'The licence key lands in the Databell Inbox']] },
    { id: 'search', name: 'Search knowledge', icon: 'i-search', steps: [['web', 'A learner types “kubernetes” into the search box'], ['cdn', 'Static assets come from the edge'], ['gateway', 'The query is routed to TechKnowledge'], ['know', 'TechKnowledge receives the query'], ['search', 'Titles are matched ignoring case and spaces'], ['pg', 'Matching articles are loaded from the database']] },
    { id: 'lab', name: 'Run a LabSim experiment', icon: 'i-flask', steps: [['web', 'A student opens LabSim'], ['gateway', 'The run request is authorised and routed'], ['mathopea', 'Mathopea generates the inputs (maths)'], ['experimentium', 'Experimentium runs and validates the readings (experiment)'], ['stream', 'The readings are published as events'], ['lake', 'The lakehouse returns the count and mean (data)']] },
    { id: 'present', name: 'Present a deck', icon: 'i-slides', steps: [['decks', 'A presenter opens a deck in the Hub'], ['cdn', 'Slides are served from the edge'], ['objects', 'The original .pptx is fetched from object storage']] },
    { id: 'ship', name: 'Ship a release', icon: 'i-rocket', steps: [['cicd', 'The commit is built and tested'], ['iac', 'Terraform plans the infrastructure change'], ['k8s', 'Kubernetes rolls out the new version'], ['obs', 'Observability watches error rates and latency'], ['enhance', 'TechEnhance tunes performance on real traffic'], ['labs', 'SoftwareLabs starts the next sprint']] }
  ];
  const archLinks = (() => {
    const m = {};
    ARCH_FLOWS.forEach((f) => f.steps.forEach(([n], i) => {
      const nxt = f.steps[i + 1];
      if (!nxt) return;
      (m[n] = m[n] || new Set()).add(nxt[0]);
      (m[nxt[0]] = m[nxt[0]] || new Set()).add(n);
    }));
    return m;
  })();
  const arch = { flow: null, node: null, step: -1, timer: null };

  function initArchitecture() {
    const layers = $('#archLayers');
    if (!layers) return;
    layers.innerHTML = ARCH_LAYERS.map((l, li) => `
      <div class="arch-layer" data-layer="${l.id}">
        <span class="arch-lname"><b>L${li + 1}</b>${escapeHTML(l.name)}</span>
        <div class="arch-nodes">${l.nodes.map((id) => `<button class="anode" type="button" data-node="${id}" aria-pressed="false">${icon(ARCH[id][1])}<span>${escapeHTML(ARCH[id][0])}</span><i class="anode-n" aria-hidden="true"></i></button>`).join('')}</div>
      </div>`).join('');
    $('#archFlows').innerHTML = ARCH_FLOWS.map((f) => `<button class="chip-btn" type="button" data-flow="${f.id}" aria-pressed="false">${icon(f.icon)} ${escapeHTML(f.name)}</button>`).join('');
    layers.addEventListener('click', (e) => { const b = e.target.closest('[data-node]'); if (b) archSelect(b.dataset.node); });
    $('#archFlows').addEventListener('click', (e) => { const b = e.target.closest('[data-flow]'); if (b) archTrace(b.dataset.flow); });
    $('#archClear').addEventListener('click', archReset);
    $('#archPanel').addEventListener('click', (e) => {
      const n = e.target.closest('[data-goto-node]');
      if (n) archSelect(n.dataset.gotoNode);
      const s = e.target.closest('[data-step]');
      if (s && arch.flow) { clearInterval(arch.timer); arch.step = +s.dataset.step; archPaint(); }
      const f = e.target.closest('[data-start-flow]');
      if (f) archTrace(f.dataset.startFlow);
    });
    if ('ResizeObserver' in window) new ResizeObserver(() => archWires()).observe($('#archMap'));
    else window.addEventListener('resize', archWires);
    archPanelDefault();
  }
  function archReset() {
    clearInterval(arch.timer);
    arch.flow = null; arch.node = null; arch.step = -1;
    $$('#archFlows [data-flow]').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    archPaint();
    archPanelDefault();
  }
  function archPanelDefault() {
    $('#archPanel').innerHTML = `
      <span class="kicker">// Select a component</span>
      <h3>23 components, 5 layers</h3>
      <p class="muted small">Requests enter at the top and move down through edge, services and data, all of it running on the platform layer at the bottom.</p>
      <ul class="arch-legend">${ARCH_LAYERS.map((l, i) => `<li><b>L${i + 1}</b>${escapeHTML(l.name)}<small>${l.nodes.length}</small></li>`).join('')}</ul>
      <p class="small muted">Or start with a trace:</p>
      <div class="arch-quick">${ARCH_FLOWS.slice(0, 3).map((f) => `<button class="link-btn" data-start-flow="${f.id}">${icon(f.icon)} ${escapeHTML(f.name)}</button>`).join('')}</div>`;
  }
  function archSelect(id) {
    clearInterval(arch.timer);
    arch.flow = null; arch.step = -1; arch.node = id;
    $$('#archFlows [data-flow]').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    const [name, ic, what, tech] = ARCH[id];
    const layer = ARCH_LAYERS.find((l) => l.nodes.includes(id));
    const links = [...(archLinks[id] || [])];
    const flows = ARCH_FLOWS.filter((f) => f.steps.some(([n]) => n === id));
    $('#archPanel').innerHTML = `
      <span class="kicker">// ${escapeHTML(layer.name)}</span>
      <h3 class="arch-ph">${icon(ic)} ${escapeHTML(name)}</h3>
      <p>${escapeHTML(what)}</p>
      <div class="arch-tech">${tech.map((t) => `<span>${escapeHTML(t)}</span>`).join('')}</div>
      ${links.length ? `<p class="small muted">Talks to</p><div class="arch-tech links">${links.map((l) => `<button class="link-btn" data-goto-node="${l}">${escapeHTML(ARCH[l][0])}</button>`).join('')}</div>` : ''}
      ${flows.length ? `<p class="small muted">Part of</p><div class="arch-quick">${flows.map((f) => `<button class="link-btn" data-start-flow="${f.id}">${icon(f.icon)} ${escapeHTML(f.name)}</button>`).join('')}</div>` : ''}`;
    archPaint();
  }
  function archTrace(fid) {
    clearInterval(arch.timer);
    const f = ARCH_FLOWS.find((x) => x.id === fid);
    arch.flow = f; arch.node = null;
    $$('#archFlows [data-flow]').forEach((b) => { const on = b.dataset.flow === fid; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    if (reduceMotion) { arch.step = f.steps.length - 1; archPaint(); return; }
    arch.step = 0;
    archPaint();
    arch.timer = setInterval(() => {
      if (arch.step >= f.steps.length - 1) { clearInterval(arch.timer); return; }
      arch.step++;
      archPaint();
    }, 1100);
  }
  function archPaint() {
    const nodes = $$('#archLayers .anode');
    const f = arch.flow;
    const onPath = f ? f.steps.slice(0, arch.step + 1).map(([n]) => n) : [];
    const related = arch.node ? [arch.node, ...(archLinks[arch.node] || [])] : [];
    $('#archMap').classList.toggle('focus', !!(f || arch.node));
    nodes.forEach((b) => {
      const id = b.dataset.node;
      const idx = onPath.indexOf(id);
      b.classList.toggle('lit', idx >= 0 || related.includes(id));
      b.classList.toggle('cur', (f && idx === arch.step) || arch.node === id);
      b.setAttribute('aria-pressed', String(arch.node === id));
      $('.anode-n', b).textContent = idx >= 0 ? idx + 1 : '';
    });
    if (f) {
      $('#archPanel').innerHTML = `
        <span class="kicker">// Trace</span>
        <h3 class="arch-ph">${icon(f.icon)} ${escapeHTML(f.name)}</h3>
        <ol class="arch-steps">${f.steps.map(([n, txt], i) => `<li class="${i < arch.step ? 'done' : i === arch.step ? 'cur' : ''}"><button type="button" data-step="${i}"><b>${i + 1}</b><span><strong>${escapeHTML(ARCH[n][0])}</strong><small>${escapeHTML(txt)}</small></span></button></li>`).join('')}</ol>`;
    }
    archWires();
  }
  function archWires() {
    const svg = $('#archWires');
    const map = $('#archMap');
    if (!svg || !map) return;
    const mr = map.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${mr.width} ${mr.height}`);
    const pairs = [];
    if (arch.flow) {
      const st = arch.flow.steps;
      for (let i = 0; i < Math.min(arch.step, st.length - 1); i++) pairs.push([st[i][0], st[i + 1][0], 'flow']);
    } else if (arch.node) {
      (archLinks[arch.node] || []).forEach((l) => pairs.push([arch.node, l, 'link']));
    }
    const center = (id) => {
      const r = $(`#archLayers [data-node="${id}"]`).getBoundingClientRect();
      return { x: r.left - mr.left + r.width / 2, y: r.top - mr.top + r.height / 2, h: r.height, w: r.width };
    };
    svg.innerHTML = pairs.map(([a, b, kind]) => {
      const p = center(a), q = center(b);
      let d;
      if (Math.abs(p.y - q.y) < 8) {
        const lift = Math.min(46, p.h);
        d = `M${p.x},${p.y - p.h / 2} C${p.x},${p.y - p.h / 2 - lift} ${q.x},${q.y - q.h / 2 - lift} ${q.x},${q.y - q.h / 2}`;
      } else {
        const down = q.y > p.y;
        const y1 = p.y + (down ? p.h / 2 : -p.h / 2), y2 = q.y + (down ? -q.h / 2 : q.h / 2);
        const my = (y1 + y2) / 2;
        d = `M${p.x},${y1} C${p.x},${my} ${q.x},${my} ${q.x},${y2}`;
      }
      return `<path class="wire ${kind}" d="${d}"/>`;
    }).join('');
  }

  /* =========================================================
     CONNECTIONS: Venn + innovation cycle
     ========================================================= */
  const VENN = {
    math: { t: 'Math', s: 'Patterns & logic', p: 'Mathematics supplies the patterns, rules and proofs the other two fields depend on.', list: ['Sequences, primes and patterns', 'Logic and proof', 'Measurement and statistics'] },
    sci: { t: 'Science', s: 'Questions & evidence', p: 'Science asks the questions and insists on evidence before believing an answer.', list: ['Ask a clear question', 'Observe and measure carefully', 'Test ideas against evidence'] },
    code: { t: 'Coding', s: 'Tools & creation', p: 'Coding turns ideas into tools that calculate, simulate and build things people use.', list: ['Automate repetitive work', 'Visualise ideas and data', 'Build real products'] },
    'math-code': { t: 'Math + Coding', s: 'Math gives code its logic; code gives math its reach', cols: [['Math helps coding', ['Logic builds clear, correct programs', 'Algebra powers variables and functions', 'Geometry drives games and graphics']], ['Coding helps math', ['Compute huge sums in a blink', 'Visualise graphs and patterns', 'Test conjectures with quick experiments']]], lab: 'fib' },
    'sci-code': { t: 'Science + Coding', s: 'Code lets science simulate, analyse and discover', cols: [['Simulate', ['Model weather, planets and molecules safely']], ['Analyse', ['Sift through experiment data in seconds']], ['Automate', ['Run sensors and lab tools with scripts']]], foot: 'Science asks the questions. Code helps answer them faster.', lab: 'fact' },
    'math-sci': { t: 'Math + Science', s: 'Math is the language science speaks', cols: [['Measure', ['Numbers turn observations into facts']], ['Model', ['Equations describe how nature behaves']], ['Predict', ['Statistics show what is likely next']], ['Prove', ['Evidence plus logic builds trust']]], big: 'E = mc²', foot: 'One short equation, one huge scientific idea.', lab: 'together' },
    all: { t: 'All three', s: 'Together they form a loop of discovery', p: 'Science asks the question, maths models it, code builds it, data tests it, and all three improve it.', list: ['Question · Science', 'Model · Math', 'Build · Code', 'Test · Data', 'Improve · All three'], lab: 'together' }
  };
  const CYCLE = [
    ['Question', 'Science', 'Ask what you want to find out, and why it matters.'],
    ['Model', 'Math', 'Describe it with numbers, equations and rules.'],
    ['Build', 'Code', 'Turn the model into a working program.'],
    ['Test', 'Data', 'Measure the result against real data.'],
    ['Improve', 'All three', 'Feed what you learned into the next question.']
  ];
  function initConnections() {
    const venn = $('#venn');
    if (!venn) return;
    const show = (z) => {
      venn.dataset.active = z;
      $$('.vz', venn).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.z === z)));
      const v = VENN[z];
      $('#vennPanel').innerHTML = `
        <span class="kicker">// ${z === 'all' ? 'The innovation cycle' : z.includes('-') ? 'Connection' : 'Field'}</span>
        <h3>${escapeHTML(v.t)}</h3>
        <p class="venn-s">${escapeHTML(v.s)}</p>
        ${v.p ? `<p class="muted">${escapeHTML(v.p)}</p>` : ''}
        ${v.list ? `<ul class="tick-list">${v.list.map((x) => `<li>${escapeHTML(x)}</li>`).join('')}</ul>` : ''}
        ${v.cols ? `<div class="venn-cols n${v.cols.length}">${v.cols.map(([h, items]) => `<div><b>${escapeHTML(h)}</b>${items.length > 1 ? `<ul>${items.map((x) => `<li>${escapeHTML(x)}</li>`).join('')}</ul>` : `<small>${escapeHTML(items[0])}</small>`}</div>`).join('')}</div>` : ''}
        ${v.big ? `<p class="venn-big">${escapeHTML(v.big)}</p>` : ''}
        ${v.foot ? `<p class="muted small">${escapeHTML(v.foot)}</p>` : ''}
        ${v.lab ? `<button class="btn btn-ghost btn-sm" data-open-lab="${v.lab}">${icon('i-terminal')} Run the example in the Code Lab</button>` : ''}`;
    };
    venn.addEventListener('click', (e) => { const b = e.target.closest('.vz'); if (b) show(b.dataset.z); });
    show('math-code');

    // Innovation cycle
    const cyc = $('#cycle');
    cyc.insertAdjacentHTML('beforeend', CYCLE.map(([h, f], i) => {
      const a = (-90 + i * 72) * Math.PI / 180;
      return `<button class="cyc-node" type="button" data-c="${i}" style="left:${50 + 37.3 * Math.cos(a)}%;top:${50 + 37.3 * Math.sin(a)}%"><b>${i + 1}</b><span>${h}</span><small>${f}</small></button>`;
    }).join(''));
    $('#cycleList').innerHTML = CYCLE.map(([h, f, d], i) => `<li data-c="${i}"><b>${i + 1}</b><span><strong>${h}</strong> <em>${f}</em><small>${d}</small></span></li>`).join('');
    let ci = 0, timer = null, visible = false;
    const run = $('#cycleRun');
    const C = 2 * Math.PI * 112;
    run.style.strokeDasharray = `${C}`;
    const paint = () => {
      $$('[data-c]', cyc).forEach((n) => n.classList.toggle('on', +n.dataset.c === ci));
      $$('#cycleList li').forEach((n) => n.classList.toggle('on', +n.dataset.c === ci));
      run.style.strokeDashoffset = `${C * (1 - (ci + 1) / CYCLE.length)}`;
      $('#cycleCore').textContent = `${CYCLE[ci][0]} · ${CYCLE[ci][1]}`;
    };
    const start = () => { if (reduceMotion || timer) return; timer = setInterval(() => { ci = (ci + 1) % CYCLE.length; paint(); }, 2400); };
    const stop = () => { clearInterval(timer); timer = null; };
    const pick = (i) => { ci = i; paint(); stop(); setTimeout(() => { if (visible) start(); }, 6000); };
    cyc.addEventListener('click', (e) => { const n = e.target.closest('[data-c]'); if (n) pick(+n.dataset.c); });
    $('#cycleList').addEventListener('click', (e) => { const n = e.target.closest('[data-c]'); if (n) pick(+n.dataset.c); });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.3 }).observe(cyc);
    paint();
  }

  /* =========================================================
     CODE LAB
     ========================================================= */
  const LEARNERS = [['Aanya', 92], ['Rohan', 78], ['Meera', 88], ['Kabir', 95], ['Ishaan', 81], ['Diya', 67], ['Vihaan', 80], ['Sara', 99]];
  const APP_EVENTS = (() => {
    // Deterministic sample: 420 events between Oct 2025 and Nov 2026
    const feats = [['quiz', 9], ['store', 8], ['search', 7], ['decks', 6], ['codelab', 5], ['inbox', 4], ['pledge', 3], ['wallet', 2]];
    const total = feats.reduce((s, [, w]) => s + w, 0);
    let seed = 20261113;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const start = Date.UTC(2025, 9, 1), span = Date.UTC(2026, 10, 19) - start;
    return Array.from({ length: 420 }, () => {
      let r = rnd() * total, f = feats[0][0];
      for (const [name, w] of feats) { if ((r -= w) < 0) { f = name; break; } }
      return { feature: f, event_date: new Date(start + rnd() * span).toISOString().slice(0, 10) };
    });
  })();
  const sqlTable = (cols, rows) => `<table class="lab-table"><thead><tr>${cols.map((c) => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${escapeHTML(String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  const LAB = [
    { id: 'html', name: 'index.html', lang: 'html', mode: 'web', from: 'Technology Briefing · slide 11',
      code: '<h1>Hello, world!</h1>\n<button id="go">\n  Click me\n</button>\n<p class="note">\n  Math + Code = fun\n</p>' },
    { id: 'css', name: 'style.css', lang: 'css', mode: 'web', from: 'Technology Briefing · slide 11',
      code: 'h1 {\n  color: #00e5ff;\n  font-size: 2rem;\n}\n.note {\n  background: #121c3f;\n  padding: 8px;\n}' },
    { id: 'js', name: 'squares.js', lang: 'js', mode: 'js', from: 'Technology Briefing · slide 12',
      code: 'const nums = [1, 2, 3, 4];\nconst squares =\n  nums.map(n => n * n);\nconsole.log(squares);\n// [1, 4, 9, 16]' },
    { id: 'py', name: 'circles.py', lang: 'py', mode: 'sim', from: 'Technology Briefing · slide 12',
      code: 'import math\n\nfor r in [1, 2, 3]:\n    area = math.pi * r**2\n    print(r, round(area, 2))',
      sim: () => ({ lines: [1, 2, 3].map((r) => `${r} ${pyRound2(Math.PI * r ** 2)}`) }) },
    { id: 'sql', name: 'learners.sql', lang: 'sql', mode: 'sim', from: 'Technology Briefing · slide 13',
      code: 'SELECT name, score\nFROM learners\nWHERE score > 80\nORDER BY score DESC;',
      sim: () => {
        const rows = LEARNERS.filter(([, s]) => s > 80).sort((a, b) => b[1] - a[1]);
        return { html: sqlTable(['name', 'score'], rows), foot: `${rows.length} rows`, sample: `<details class="lab-sample"><summary>Sample table · learners (${LEARNERS.length} rows)</summary>${sqlTable(['name', 'score'], LEARNERS)}</details>` };
      } },
    { id: 'cpp', name: 'sum.cpp', lang: 'cpp', mode: 'sim', from: 'Technology Briefing · slide 13',
      code: '#include <iostream>\nint main() {\n  int sum = 0;\n  for (int i=1; i<=10; i++)\n    sum += i;\n  std::cout << sum;\n}',
      sim: () => { let sum = 0; for (let i = 1; i <= 10; i++) sum += i; return { lines: [String(sum)], foot: 'exit code 0' }; } },
    { id: 'fib', name: 'mathopea.py', lang: 'py', mode: 'sim', from: 'Chief Guest Visit · slide 4',
      code: '# Fibonacci: a classic maths-meets-code idea\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint([fib(i) for i in range(10)])\n# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]',
      sim: () => {
        const fib = (n) => { let a = 0, b = 1; for (let k = 0; k < n; k++) [a, b] = [b, a + b]; return a; };
        return { lines: [`[${Array.from({ length: 10 }, (_, i) => fib(i)).join(', ')}]`] };
      } },
    { id: 'fact', name: 'factorial.js', lang: 'js', mode: 'js', from: 'Chief Guest Visit · slide 5',
      code: '// Factorial calculator\nfunction factorial(n) {\n  if (n < 0) return null;\n  let result = 1;\n  for (let i = 2; i <= n; i++) {\n    result *= i;\n  }\n  return result;\n}\n\nconst num = 5;\nconsole.log(`${num}! =`, factorial(num));\n// 5! = 120' },
    { id: 'query', name: 'query.sql', lang: 'sql', mode: 'sim', from: 'Chief Guest Visit · slide 6',
      code: "-- Top 5 most-used app features\nSELECT feature, COUNT(*) AS uses\nFROM app_events\nWHERE event_date >= '2026-01-01'\nGROUP BY feature\nORDER BY uses DESC\nLIMIT 5;",
      sim: () => {
        const counts = {};
        const kept = APP_EVENTS.filter((e) => e.event_date >= '2026-01-01');
        kept.forEach((e) => { counts[e.feature] = (counts[e.feature] || 0) + 1; });
        const rows = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
        return { html: sqlTable(['feature', 'uses'], rows), foot: `5 rows · ${kept.length} of ${APP_EVENTS.length} events since 2026-01-01`,
          sample: `<details class="lab-sample"><summary>Sample table · app_events (${APP_EVENTS.length} generated rows, first 8 shown)</summary>${sqlTable(['feature', 'event_date'], APP_EVENTS.slice(0, 8).map((e) => [e.feature, e.event_date]))}</details>` };
      } },
    { id: 'together', name: 'together.py', lang: 'py', mode: 'sim', from: 'Chief Guest Visit · slide 8',
      code: '# Math -> Experiment -> Data\nimport math\n\ndef experiment(n):\n    return [math.sqrt(i) for i in range(n)]\n\ndef analyse(rows):\n    return sum(rows) / len(rows)\n\nprint(analyse(experiment(100)))',
      sim: () => {
        const rows = Array.from({ length: 100 }, (_, i) => Math.sqrt(i));
        return { lines: [pyFloat(pySum(rows) / rows.length)], foot: 'Mathopea → Experimentium → Databell' };
      } }
  ];
  const LAB_KEY = 'databell-hub-lab';
  const lab = { cur: 'html', edits: store.get(LAB_KEY, {}), ran: false };
  const labFile = (id) => LAB.find((f) => f.id === id);
  const labCode = (id) => (lab.edits[id] != null ? lab.edits[id] : labFile(id).code);

  function initCodeLab() {
    if (!$('#lab')) return;
    $('#labFiles').innerHTML = LAB.map((f) => `<button role="tab" type="button" class="lab-file" data-file="${f.id}" aria-selected="false"><span class="lf-lang lf-${f.lang}">${f.lang.toUpperCase()}</span><span>${f.name}</span>${f.mode === 'sim' ? '<em>sim</em>' : ''}</button>`).join('');
    $('#labFiles').addEventListener('click', (e) => { const b = e.target.closest('[data-file]'); if (b) labOpen(b.dataset.file); });
    const ta = $('#labInput');
    let tabEscape = false;
    ta.addEventListener('input', () => {
      const f = labFile(lab.cur);
      if (f.mode === 'sim') return;
      lab.edits[lab.cur] = ta.value;
      store.set(LAB_KEY, lab.edits);
      labPaint();
      if (f.mode === 'web') { clearTimeout(lab.t); lab.t = setTimeout(labRun, 500); }
    });
    ta.addEventListener('scroll', () => { $('#labHl').scrollTop = ta.scrollTop; $('#labHl').scrollLeft = ta.scrollLeft; });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { tabEscape = true; return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); labRun(); return; }
      if (e.key === 'Tab' && !e.shiftKey && !tabEscape && !ta.readOnly) {
        e.preventDefault();
        const s = ta.selectionStart;
        ta.setRangeText('  ', s, ta.selectionEnd, 'end');
        ta.dispatchEvent(new Event('input'));
      }
      tabEscape = false;
    });
    $('#labRun').addEventListener('click', labRun);
    $('#labReset').addEventListener('click', () => { delete lab.edits[lab.cur]; store.set(LAB_KEY, lab.edits); labOpen(lab.cur); toast('Code reset to the original slide version', 'i-refresh'); });
    $('#labCopy').addEventListener('click', () => {
      const txt = labCode(lab.cur);
      const done = () => toast(`Copied ${labFile(lab.cur).name}`, 'i-copy');
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => toast('Copy failed — select the code and copy it manually', 'i-x'));
      else toast('Clipboard is not available here', 'i-x');
    });
    window.addEventListener('message', (e) => {
      const fr = $('#labFrame');
      if (!fr || e.source !== fr.contentWindow || !e.data || e.data.lab !== lab.token) return;
      if (e.data.type === 'log') labLine(e.data.text, 'log');
      if (e.data.type === 'error') labLine(e.data.text, 'err');
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open-lab]');
      if (!b) return;
      labOpen(b.dataset.openLab);
      goTo('#codelab');
      setTimeout(labRun, 600);
    });
    labOpen('html', true);
  }
  function labPaint() {
    const f = labFile(lab.cur);
    $('#labHl').innerHTML = highlight(labCode(lab.cur), f.lang) + '\n';
  }
  function labOpen(id, quiet) {
    lab.cur = id;
    const f = labFile(id);
    $$('#labFiles [data-file]').forEach((b) => { const on = b.dataset.file === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    const ta = $('#labInput');
    ta.value = labCode(id);
    ta.readOnly = f.mode === 'sim';
    $('#labCode').classList.toggle('ro', ta.readOnly);
    $('#labName').textContent = f.name;
    $('#labTag').textContent = f.mode === 'sim' ? 'simulated · read-only' : f.mode === 'web' ? 'live preview · editable' : 'runs in a sandbox · editable';
    $('#labTag').className = `lab-tag ${f.mode}`;
    $('#labOutName').textContent = f.mode === 'web' ? 'Preview · index.html + style.css' : 'Console';
    $('#labNote').innerHTML = `${icon('i-slides')} From <b>${escapeHTML(f.from)}</b>${f.mode === 'sim' ? ` · ${f.lang === 'sql' ? 'The query runs against sample tables, shown under the result.' : 'The output comes from a JavaScript version of the same program.'}` : ' · <kbd>Ctrl</kbd> <kbd>Enter</kbd> runs · <kbd>Esc</kbd> then <kbd>Tab</kbd> leaves the editor'}`;
    labPaint();
    $('#labFrame').hidden = f.mode !== 'web';
    $('#labConsole').hidden = f.mode === 'web';
    $('#labConsole').innerHTML = `<p class="lab-idle">Press <b>Run</b> to execute ${escapeHTML(f.name)}</p>`;
    if (f.mode === 'web') labRun(quiet);
  }
  function labLine(text, cls = 'log', delay = 0) {
    const out = $('#labConsole');
    const add = () => { const p = document.createElement('p'); p.className = `lab-line ${cls}`; p.textContent = text; out.appendChild(p); };
    if (delay && !reduceMotion) setTimeout(add, delay); else add();
  }
  function labRun(quiet) {
    const f = labFile(lab.cur);
    const out = $('#labConsole');
    const fr = $('#labFrame');
    lab.token = Math.random().toString(36).slice(2);
    if (f.mode === 'web') {
      fr.setAttribute('sandbox', '');
      fr.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Inter,system-ui,sans-serif;margin:16px;color:#e6f0ff;background:#0a1128}${labCode('css')}</style></head><body>${labCode('html')}</body></html>`;
    } else if (f.mode === 'js') {
      out.innerHTML = '';
      labLine(`$ node ${f.name}`, 'cmd');
      fr.setAttribute('sandbox', 'allow-scripts');
      const src = labCode(f.id).replace(/<\/script/gi, '<\\/script');
      fr.srcdoc = `<!doctype html><script>
        (function(){
          var T=${JSON.stringify(lab.token)};
          function fmt(v,d){ if(typeof v==='string') return d?JSON.stringify(v):v;
            if(Array.isArray(v)) return '['+v.map(function(x){return fmt(x,1)}).join(', ')+']';
            if(v&&typeof v==='object'){ try{return JSON.stringify(v)}catch(e){return String(v)} } return String(v); }
          console.log=function(){ parent.postMessage({lab:T,type:'log',text:Array.prototype.map.call(arguments,function(a){return fmt(a,0)}).join(' ')},'*'); };
          console.error=console.warn=console.log;
          window.onerror=function(m){ parent.postMessage({lab:T,type:'error',text:String(m)},'*'); };
        })();<\/script><script>${src}<\/script>`;
      fr.hidden = true;
    } else {
      out.innerHTML = '';
      labLine(`$ ${f.lang === 'py' ? 'python3' : f.lang === 'sql' ? 'sqlite3 sample.db <' : 'g++ sum.cpp -o sum && ./sum #'} ${f.lang === 'cpp' ? '' : f.name}`.trim(), 'cmd');
      const r = f.sim();
      (r.lines || []).forEach((l, i) => labLine(l, 'log', 160 + i * 160));
      if (r.html) setTimeout(() => out.insertAdjacentHTML('beforeend', r.html), reduceMotion ? 0 : 200);
      setTimeout(() => {
        if (r.foot) labLine(r.foot, 'meta');
        labLine('simulated in your browser', 'meta');
        if (r.sample) out.insertAdjacentHTML('beforeend', r.sample);
      }, reduceMotion ? 0 : 240 + (r.lines || []).length * 160);
    }
    if (!quiet && !lab.ran) { lab.ran = true; setTimeout(() => rewardActivity('coder'), 1200); }
  }

  /* =========================================================
     PRESENTATIONS
     ========================================================= */
  const DECKS = [
    { id: 'tech', theme: 'tech', title: 'Where Math, Science & Code Connect', short: 'Technology Briefing', by: 'DatabellSoftwareLabs · TechEnhance · TechKnowledge',
      file: 'assets-8/decks/DatabellSoftwareLabs_TechEnhance_and_TechKnowledge.pptx',
      slides: [
        { l: 'cover', t: 'Where Math, Science & Code Connect', kick: 'TECHNOLOGY BRIEFING', sub: 'DatabellSoftwareLabs  •  TechEnhance  •  TechKnowledge', sym: ['{ }', 'π', '∑'] },
        { l: 'cards', label: 'OVERVIEW', kick: '// THE PLAYERS', t: 'Three names, one mission: learn and build with tech', cards: [{ n: '01', h: 'DatabellSoftwareLabs', s: 'Software & data building', p: 'Where ideas become working code' }, { n: '02', h: 'TechEnhance', s: 'Skills & capability growth', p: 'Where learners level up with tech' }, { n: '03', h: 'TechKnowledge', s: 'Knowledge & understanding', p: 'Where concepts become clear and shared' }], foot: 'Descriptions reflect each name’s focus as a framing for this talk.' },
        { l: 'cardsCode', label: 'DATABELLSOFTWARELABS', kick: '// 01  SOFTWARE & DATA', t: 'DatabellSoftwareLabs: turning ideas into software', cards: [{ h: 'Build', p: 'Design and write software that solves real problems' }, { h: 'Data', p: 'Use data to test ideas and guide decisions' }, { h: 'Iterate', p: 'Ship small, learn fast, improve every cycle' }, { h: 'Collaborate', p: 'Teams of makers sharing code and feedback' }], code: 'def build(idea):\n  code = write(idea)\n  test(code)\n  return improve(code)', lang: 'py', cap: 'Every project is a loop of write, test, improve.' },
        { l: 'steps', label: 'TECHENHANCE', kick: '// 02  CAPABILITY GROWTH', t: 'TechEnhance: levelling up skills step by step', steps: [{ h: 'Learn', p: 'Understand the core concept' }, { h: 'Practice', p: 'Apply it in small exercises' }, { h: 'Build', p: 'Create a real project' }, { h: 'Share', p: 'Teach it and get feedback' }], arrows: true, foot: 'Small, steady steps compound into big capability gains.' },
        { l: 'rows', label: 'TECHKNOWLEDGE', kick: '// 03  UNDERSTANDING', t: 'TechKnowledge: making knowledge easy to share', rows: [{ h: 'Curiosity', p: 'Ask why things work' }, { h: 'Clarity', p: 'Explain ideas simply' }, { h: 'Community', p: 'Learn together, share answers' }, { h: 'Confidence', p: 'Know it well enough to use it' }], callout: { h: 'Knowledge grows when it is shared', p: 'Every explanation you give deepens your own understanding.' } },
        { l: 'venn', label: 'THE BIG IDEA', kick: '// POSITIVE CONNECTIONS', t: 'Math, science and coding make each other stronger', foot: 'Each field supplies something the others need.' },
        { l: 'twocol', label: 'MATH + CODING', kick: '// CONNECTION 01', t: 'Math gives code its logic; code gives math its reach', cols: [{ h: 'Math helps coding', items: ['Logic builds clear, correct programs', 'Algebra powers variables and functions', 'Geometry drives games and graphics'] }, { h: 'Coding helps math', items: ['Compute huge sums in a blink', 'Visualize graphs and patterns', 'Test conjectures with quick experiments'] }] },
        { l: 'cards', label: 'SCIENCE + CODING', kick: '// CONNECTION 02', t: 'Code lets science simulate, analyze and discover', cards: [{ h: 'Simulate', p: 'Model weather, planets and molecules safely' }, { h: 'Analyze', p: 'Sift through experiment data in seconds' }, { h: 'Automate', p: 'Run sensors and lab tools with scripts' }], tall: true, foot: 'Science asks the questions. Code helps answer them faster.' },
        { l: 'rows', label: 'MATH + SCIENCE', kick: '// CONNECTION 03', t: 'Math is the language science speaks', rows: [{ h: 'Measure', p: 'Numbers turn observations into facts' }, { h: 'Model', p: 'Equations describe how nature behaves' }, { h: 'Predict', p: 'Statistics show what is likely next' }, { h: 'Prove', p: 'Evidence plus logic builds trust' }], callout: { big: 'E = mc²', p: 'One short equation, one huge scientific idea.' } },
        { l: 'steps', label: 'TOGETHER', kick: '// THE INNOVATION CYCLE', t: 'Together they form a loop of discovery', steps: [{ h: 'Question', s: 'Science' }, { h: 'Model', s: 'Math' }, { h: 'Build', s: 'Code' }, { h: 'Test', s: 'Data' }, { h: 'Improve', s: 'All three' }], foot: 'DatabellSoftwareLabs builds, TechEnhance trains, TechKnowledge shares.' },
        { l: 'code2', label: 'HTML + CSS', kick: '// CODE EXAMPLES 01', t: 'Web basics: HTML and CSS', panels: [{ h: 'HTML', s: 'structure', lang: 'html', code: '<h1>Hello, world!</h1>\n<button id="go">\n  Click me\n</button>\n<p class="note">\n  Math + Code = fun\n</p>' }, { h: 'CSS', s: 'style', lang: 'css', code: 'h1 {\n  color: #00e5ff;\n  font-size: 2rem;\n}\n.note {\n  background: #121c3f;\n  padding: 8px;\n}' }], lab: 'html' },
        { l: 'code2', label: 'JS + PYTHON', kick: '// CODE EXAMPLES 02', t: 'Logic and data: JavaScript and Python', panels: [{ h: 'JavaScript', lang: 'js', code: 'const nums = [1, 2, 3, 4];\nconst squares =\n  nums.map(n => n * n);\nconsole.log(squares);\n// [1, 4, 9, 16]' }, { h: 'Python', lang: 'py', code: 'import math\n\nfor r in [1, 2, 3]:\n    area = math.pi * r**2\n    print(r, round(area, 2))' }], lab: 'js' },
        { l: 'code2', label: 'SQL + C++', kick: '// CODE EXAMPLES 03', t: 'And more: SQL and C++', panels: [{ h: 'SQL', s: 'data', lang: 'sql', code: 'SELECT name, score\nFROM learners\nWHERE score > 80\nORDER BY score DESC;' }, { h: 'C++', s: 'speed', lang: 'cpp', code: '#include <iostream>\nint main() {\n  int sum = 0;\n  for (int i=1; i<=10; i++)\n    sum += i;\n  std::cout << sum;\n}' }], lab: 'sql' },
        { l: 'cards', label: 'POSITIVE OUTCOMES', kick: '// BENEFITS', t: 'What learners gain from all three', cards: [{ h: 'Problem solving', p: 'Break big challenges into steps' }, { h: 'Creativity', p: 'Build things that never existed' }, { h: 'Career readiness', p: 'Skills useful in many fields' }, { h: 'Confidence', p: 'Proof you can figure it out' }], cols: 2 },
        { l: 'closing', kick: 'NEXT STEP', t: 'Keep learning. Keep building.', sub: 'Pick one idea from math, science or code and make something with it this week.', line: 'DatabellSoftwareLabs  •  TechEnhance  •  TechKnowledge' }
      ] },
    { id: 'guest', theme: 'guest', title: 'Where Math, Experiments & Data Meet Code', short: 'Chief Guest Visit', by: 'Mathopea · Experimentium · Databell Software Labs',
      file: 'assets-8/decks/Mathopea_Experimentium_and_DatabellSoftwareLabs.pptx',
      slides: [
        { l: 'cover', t: 'Where Math, Experiments & Data Meet Code', kick: '// CHIEF GUEST VISIT', sub: 'Welcoming Mathopea, Experimentium and Databell Software Labs', by: 'Presented by Bhavyam Roy', term: '> welcome()\n  guests = 3\n  status: "ready"' },
        { l: 'agenda', kick: '// agenda', t: "Today's Run Order", items: ['Meet the chief guests', 'Mathopea: code & logic', 'Experimentium: build & test', 'Databell Software Labs: data', 'Apps showcase & live demo', 'Collaboration & next steps'] },
        { l: 'cards', kick: '// chief_guests', t: 'Our Three Chief Guests', cards: [{ h: 'Mathopea', p: 'Mathematics meets programming.', f: 'Focus: algorithms, logic and problem solving.' }, { h: 'Experimentium', p: 'Hands-on experimentation with technology.', f: 'Focus: prototypes, testing and innovation.' }, { h: 'Databell Software Labs', p: 'Software engineering and data.', f: 'Focus: apps, databases and analytics.' }], tall: true, note: 'Original deck note: descriptions are placeholders, to be replaced with each organisation’s real profile.' },
        { l: 'codeside', kick: '// mathopea', t: 'Mathopea: Math as Code', file: 'mathopea.py', lang: 'py', code: '# Fibonacci: a classic maths-meets-code idea\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint([fib(i) for i in range(10)])\n# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]', side: ['Patterns become programs.', 'Sequences, primes and proofs turn into short, readable functions.', 'Idea: maths puzzles as coding challenges.'], lab: 'fib' },
        { l: 'codeside', kick: '// experimentium', t: 'Experimentium: Build, Test, Learn', file: 'factorial.js', lang: 'js', code: '// Factorial calculator\nfunction factorial(n) {\n  if (n < 0) return null;\n  let result = 1;\n  for (let i = 2; i <= n; i++) {\n    result *= i;\n  }\n  return result;\n}\n\nconst num = 5;\nconsole.log(`${num}! =`, factorial(num));\n// 5! = 120', side: ['Hypothesis, test, measure.', 'Small code experiments make ideas testable in minutes.', 'Idea: students run their own experiments.'], lab: 'fact' },
        { l: 'codeside', kick: '// databell_software_labs', t: 'Databell Software Labs: Data to Decisions', file: 'query.sql', lang: 'sql', code: "-- Top 5 most-used app features\nSELECT feature, COUNT(*) AS uses\nFROM app_events\nWHERE event_date >= '2026-01-01'\nGROUP BY feature\nORDER BY uses DESC\nLIMIT 5;", side: ['Software that learns from data.', 'Databases and analytics guide what apps should do next.', 'Idea: from raw events to clear insight.'], lab: 'query' },
        { l: 'cards', kick: '// apps', t: 'App Showcase (Illustrative Concepts)', cards: [{ h: 'MathQuest', p: 'Gamified maths practice.', f: 'By Mathopea-style logic engines.' }, { h: 'LabSim', p: 'Virtual experiment sandbox.', f: 'By Experimentium-style prototyping.' }, { h: 'InsightBoard', p: 'Live analytics dashboard.', f: 'By Databell-style data tools.' }], tall: true, note: 'Original deck note: concept apps for illustration only; swap in real products before presenting.' },
        { l: 'pipeline', kick: '// pipeline', t: 'All Together: One Tiny Pipeline', file: 'together.py', lang: 'py', code: '# Math -> Experiment -> Data\nimport math\n\ndef experiment(n):\n    return [math.sqrt(i) for i in range(n)]\n\ndef analyse(rows):\n    return sum(rows) / len(rows)\n\nprint(analyse(experiment(100)))', flow: ['Mathopea', 'Experimentium', 'Databell'], lab: 'together' },
        { l: 'tools', kick: '// tech_stack', t: 'Tools of the Trade', items: [['Python', 'Maths & scripting'], ['JavaScript', 'Web experiments'], ['SQL', 'Data queries'], ['Git', 'Team collaboration'], ['APIs', 'Connecting apps'], ['Cloud', 'Deploy & scale']] },
        { l: 'timeline', kick: '// visit_timeline', t: 'Visit Timeline', steps: [['Welcome', 'Greet & intro'], ['Talks', 'Guest sessions'], ['Demo', 'Live code & apps'], ['Q&A', 'Student questions'], ['Wrap-up', 'Thanks & photos']], note: 'Original title: “Visit Timeline (Edit Times)”. Add times before presenting.' },
        { l: 'closing', t: 'Thank You, Chief Guests!', sub: 'Mathopea  ·  Experimentium  ·  Databell Software Labs', line: '> return "see you again soon";' }
      ] },
    { id: 'green', theme: 'green', title: 'Green Earth: A safe, eco-friendly Diwali', short: 'Green Earth Diwali', by: 'BDAIGoGreen',
      file: 'assets-8/decks/Green_Earth_Diwali_Celebration_BDAIGoGreen.pptx',
      slides: [
        { l: 'gcover', t: 'Green Earth', kick: 'BDAIGoGreen presents', sub: 'A safe, eco-friendly Diwali', line: 'Light up homes, not the planet.' },
        { l: 'stats', t: 'Why a Green Diwali matters', stats: [['AQI 376', 'Delhi\'s average AQI hit 376 ("very poor") the morning after Diwali 2026, with firecrackers worsening PM2.5', 'i-flame'], ['120 dB+', 'noise from many crackers, far above levels that are safe for hearing, pets and elders', 'i-users'], ['1000s', 'of burn and eye injuries reported each festive season', 'i-heart']], src: 'Source: Hindustan Times, Business Today, 9 Nov 2026 (CPCB data). Noise and injury figures are illustrative.', lede: 'Diwali is a festival of light and joy; the goal is to keep the light and lose the harm.' },
        { l: 'pledge', t: 'Our Green Diwali pledge', items: [['Light', 'Clay diyas and LED lights over electric-heavy or plastic décor'], ['Sound', 'Skip firecrackers; celebrate with music, dance and rangoli'], ['Waste', 'Natural, reusable and compostable décor and gifts'], ['Community', 'Share the pledge with family, neighbours and school']] },
        { l: 'gcards', t: 'Light up: diyas and decorations', cards: [['Clay diyas', 'Use earthen diyas with natural oil or ghee instead of paraffin or plastic lamps. Reuse them next year.', 'i-flame', 'Warm glow, zero smoke'], ['LED string lights', 'Energy-saving LEDs use far less power and stay cool, lowering fire risk.', 'i-bolt', 'Cool, safe and efficient'], ['Natural décor', 'Marigold and mango leaf toranas, flower rangoli and fallen petals. Compost them afterwards.', 'i-leaf', 'Back to the soil']] },
        { l: 'ggrid', t: 'Sound and sparkle without the smoke', cards: [['Skip the crackers', 'Crackers release smoke, heavy metals and loud noise that harm people, pets, birds and elders.', 'i-shield'], ['Celebrate with music', 'Hold a family singing, dance or dhol evening in place of the bangs.', 'i-heart'], ['Rangoli and diya art', 'Colour floors with flower, rice or natural-dye rangoli. Hold a family contest.', 'i-sparkle'], ['If you must use sparklers', 'Choose certified green options, use outdoors, keep water close and adults supervising.', 'i-flame']] },
        { l: 'gtiles', t: 'Gifts and sweets, the sustainable way', cards: [['Gift', 'Potted saplings, seed paper, handmade or local artisan items', 'i-gift'], ['Wrap', 'Cloth, newspaper or reusable bags instead of plastic or foil', 'i-leaf'], ['Sweets', 'Homemade or local sweets, served on leaf plates, with steel or clay cups', 'i-coffee'], ['Share', 'Donate extra food, clothes and sweets to those in need', 'i-heart']] },
        { l: 'grows', t: 'Celebrate safely', rows: [['Fire safety', 'Keep diyas away from curtains and clothes; keep a bucket of water or extinguisher nearby.', 'i-flame'], ['Never unattended', 'Do not leave lit diyas or candles alone, especially around children and pets.', 'i-shield'], ['Clothing', 'Wear cotton and fitted clothes, not loose synthetic fabrics, near flames.', 'i-shirt'], ['Health', 'People with asthma should limit exposure to smoke; keep windows and air purifiers ready.', 'i-heart'], ['First aid', 'Run burns under cool water for 10+ minutes and seek medical help quickly.', 'i-check']] },
        { l: 'gsteps', t: 'After Diwali: clean up responsibly', steps: [['Collect', 'Gather diyas, flowers and leaves'], ['Compost', 'Compost flowers and natural décor'], ['Reuse', 'Wash and store diyas and décor'], ['Recycle', 'Sort paper, glass and metal waste']], warn: 'Never immerse idols or décor in rivers and lakes; use home buckets or designated tanks.' },
        { l: 'gcheck', t: 'Your Green Diwali checklist', items: ['Use clay diyas and LED lights', 'Make flower rangoli and natural décor', 'Skip firecrackers; enjoy music and family time', 'Choose plastic-free gifts and wrapping', 'Keep fire safety essentials ready', 'Compost and recycle after the festival'] },
        { l: 'gclose', t: 'Light a diya, not the sky.', sub: 'Happy Green Diwali from BDAIGoGreen' }
      ] }
  ];
  const DECK_KEY = 'databell-hub-deck';
  const deck = { d: DECKS[0], i: 0, play: null, grid: false, seen: {} };

  function slideHTML(dk, s, i) {
    const n = dk.slides.length;
    const e = escapeHTML;
    const code = (c, lang) => `<pre class="sl-code"><code>${highlight(c, lang)}</code></pre>`;
    const head = `<div class="sl-head">${s.kick ? `<span class="sl-kick">${e(s.kick)}</span>` : ''}<h3>${e(s.t)}</h3></div>`;
    let foot = '';
    if (dk.theme === 'tech') foot = `<div class="sl-foot"><span>${e(s.label || '')}</span><span>${pad2(i + 1)}</span></div>`;
    if (dk.theme === 'guest') foot = `<div class="sl-foot"><span>Chief Guest Visit  ·  Tech Showcase</span><span>${pad2(i + 1)} / ${pad2(n)}</span></div>`;
    if (dk.theme === 'green') foot = `<div class="sl-foot"><span>BDAIGoGreen  |  Green Earth</span><span>${i + 1}</span></div>`;
    const ACC = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
    let body = '';
    switch (s.l) {
      case 'cover':
        body = dk.theme === 'tech'
          ? `<div class="sl-cover"><span class="sl-kick sq">${e(s.kick)}</span><h2>${e(s.t)}</h2><p>${e(s.sub)}</p><div class="sl-syms">${s.sym.map((x, k) => `<span class="${ACC[k]}">${e(x)}</span>`).join('')}</div></div>`
          : `<div class="sl-cover g2"><div><span class="sl-kick">${e(s.kick)}</span><h2>${e(s.t)}</h2><p>${e(s.sub)}</p><p class="sl-by">${e(s.by)}</p></div><pre class="sl-term">${e(s.term)}</pre><div class="sl-dots" aria-hidden="true"></div></div>`;
        return `<div class="sl th-${dk.theme} l-cover">${body}${dk.theme === 'tech' ? foot : ''}</div>`;
      case 'cards':
        body = `<div class="sl-cards c${s.cols || s.cards.length}${s.tall ? ' tall' : ''}">${s.cards.map((c, k) => `<div class="sl-card ${ACC[k % 3]}">${c.n ? `<b class="sl-n">${c.n}</b>` : ''}<h4>${e(c.h)}</h4>${c.s ? `<span class="sl-sub">${e(c.s)}</span>` : ''}<p>${e(c.p)}</p>${c.f ? `<p class="sl-f">${e(c.f)}</p>` : ''}</div>`).join('')}</div>${s.foot ? `<p class="sl-note">${e(s.foot)}</p>` : ''}`;
        break;
      case 'cardsCode':
        body = `<div class="sl-split"><div class="sl-cards c2">${s.cards.map((c, k) => `<div class="sl-card ${ACC[k % 2]}"><h4>${e(c.h)}</h4><p>${e(c.p)}</p></div>`).join('')}</div><div class="sl-card a2 sl-codecard">${code(s.code, s.lang)}<p>${e(s.cap)}</p></div></div>`;
        break;
      case 'steps':
        body = `<div class="sl-steps n${s.steps.length}">${s.steps.map((st, k) => `<div class="sl-step ${ACC[k % 3]}"><b class="sl-n">${k + 1}</b><h4>${e(st.h)}</h4>${st.p ? `<p>${e(st.p)}</p>` : ''}${st.s ? `<span class="sl-sub">${e(st.s)}</span>` : ''}</div>${s.arrows && k < s.steps.length - 1 ? '<span class="sl-arrow">▶</span>' : ''}`).join('')}</div>${s.foot ? `<p class="sl-lead">${e(s.foot)}</p>` : ''}`;
        break;
      case 'rows':
        body = `<div class="sl-split r"><div class="sl-rows">${s.rows.map((r, k) => `<div class="sl-row ${ACC[k % 3]}"><b>${e(r.h)}</b><span>${e(r.p)}</span></div>`).join('')}</div><div class="sl-card a1 sl-callout">${s.callout.big ? `<p class="sl-big">${e(s.callout.big)}</p>` : `<h4>${e(s.callout.h)}</h4>`}<p>${e(s.callout.p)}</p></div></div>`;
        break;
      case 'venn':
        body = `<div class="sl-venn"><div class="sv sv-code"><b>CODING</b><small>Tools &amp; creation</small></div><div class="sv sv-math"><b>MATH</b><small>Patterns &amp; logic</small></div><div class="sv sv-sci"><b>SCIENCE</b><small>Questions &amp; evidence</small></div><p class="sl-aside">${e(s.foot)}</p></div>`;
        break;
      case 'twocol':
        body = `<div class="sl-cards c2 tall">${s.cols.map((c, k) => `<div class="sl-card ${ACC[k]}"><h4>${e(c.h)}</h4><ul>${c.items.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>`).join('')}</div>`;
        break;
      case 'code2':
        body = `<div class="sl-cards c2 tall">${s.panels.map((p, k) => `<div class="sl-card ${ACC[k]}"><h4>${e(p.h)}${p.s ? ` <span class="sl-sub inl">${e(p.s)}</span>` : ''}</h4>${code(p.code, p.lang)}</div>`).join('')}</div>`;
        break;
      case 'agenda':
        body = `<div class="sl-agenda">${s.items.map((x, k) => `<div class="sl-ag"><b>${pad2(k + 1)}</b><span>${e(x)}</span></div>`).join('')}</div>`;
        break;
      case 'codeside':
        body = `<div class="sl-split cs"><div class="sl-win"><div class="sl-winbar"><i></i><i></i><i></i><span>${e(s.file)}</span></div>${code(s.code, s.lang)}</div><div class="sl-card a1 sl-shows"><h4>What it shows</h4><p class="strong">${e(s.side[0])}</p><p>${e(s.side[1])}</p><p>${e(s.side[2])}</p></div></div>`;
        break;
      case 'pipeline':
        body = `<div class="sl-split cs"><div class="sl-win"><div class="sl-winbar"><i></i><i></i><i></i><span>${e(s.file)}</span></div>${code(s.code, s.lang)}</div><div class="sl-flow">${s.flow.map((x, k) => `<span class="sl-fnode ${k === 2 ? 'gold' : ''}">${e(x)}</span>${k < 2 ? '<i>▼</i>' : ''}`).join('')}</div></div>`;
        break;
      case 'tools':
        body = `<div class="sl-tools">${s.items.map(([h, p]) => `<div class="sl-card"><h4>&lt;/${e(h)}&gt;</h4><p>${e(p)}</p></div>`).join('')}</div>`;
        break;
      case 'timeline':
        body = `<div class="sl-tl">${s.steps.map(([h, p], k) => `<div class="sl-tli"><span class="sl-k">step_${k + 1}</span><i></i><b>${e(h)}</b><small>${e(p)}</small></div>`).join('')}</div>`;
        break;
      case 'closing':
        return `<div class="sl th-${dk.theme} l-closing"><div class="sl-close">${s.kick ? `<span class="sl-kick">${e(s.kick)}</span>` : ''}<h2>${e(s.t)}</h2><p>${e(s.sub)}</p><p class="sl-line">${e(s.line)}</p></div>${dk.theme === 'guest' ? '<div class="sl-dots wide" aria-hidden="true"></div>' : ''}${foot}</div>`;
      /* --- Green Earth deck --- */
      case 'gcover':
        return `<div class="sl th-green l-gcover"><div class="sl-gc-copy"><span class="sl-kick">${e(s.kick)}</span><h2>${e(s.t)}</h2><p class="sl-gsub">${e(s.sub)}</p><p>${e(s.line)}</p></div><div class="sl-gc-img"></div></div>`;
      case 'gclose':
        return `<div class="sl th-green l-gclose"><div class="sl-gclose"><h2>${e(s.t)}</h2><p>${e(s.sub)}</p></div></div>`;
      case 'stats':
        body = `<div class="sl-gstats">${s.stats.map(([b, p, ic], k) => `<div class="sl-gstat ${k === 1 ? 'mid' : ''}"><strong>${e(b)}</strong><p>${e(p)}</p><span class="sl-gic">${icon(ic)}</span></div>`).join('')}</div><p class="sl-src">${e(s.src)}</p><p class="sl-glede">${e(s.lede)}</p>`;
        break;
      case 'pledge':
        body = `<div class="sl-split gp"><ol class="sl-gpl">${s.items.map(([h, p], k) => `<li><b class="${k % 2 ? 'g' : 'o'}">${k + 1}</b><span><strong>${e(h)}</strong><small>${e(p)}</small></span></li>`).join('')}</ol><div class="sl-gp-img"></div></div>`;
        break;
      case 'gcards':
        body = `<div class="sl-gcards">${s.cards.map(([h, p, ic, cap], k) => `<div class="sl-gcard"><h4><i class="dot ${['o', 'g', 'r'][k]}"></i>${e(h)}</h4><p>${e(p)}</p><span class="sl-gbig ${['o', 'g', 'r'][k]}">${icon(ic)}</span><b class="sl-gcap ${['o', 'g', 'r'][k]}">${e(cap)}</b></div>`).join('')}</div>`;
        break;
      case 'ggrid':
        body = `<div class="sl-ggrid">${s.cards.map(([h, p, ic], k) => `<div class="sl-gcard row"><h4><span class="sl-gsm ${k % 2 ? 'o' : 'g'}">${icon(ic)}</span>${e(h)}</h4><p>${e(p)}</p></div>`).join('')}</div>`;
        break;
      case 'gtiles':
        body = `<div class="sl-gtiles">${s.cards.map(([h, p, ic], k) => `<div class="sl-gtile ${k % 2 ? 'g' : ''}"><h4>${e(h)}</h4><p>${e(p)}</p><span class="sl-gic big">${icon(ic)}</span></div>`).join('')}</div>`;
        break;
      case 'grows':
        body = `<div class="sl-grows">${s.rows.map(([h, p, ic], k) => `<div class="sl-grow"><span class="sl-gsm ${k % 2 ? 'g' : 'o'}">${icon(ic)}</span><b>${e(h)}</b><span>${e(p)}</span></div>`).join('')}</div>`;
        break;
      case 'gsteps':
        body = `<div class="sl-gsteps">${s.steps.map(([h, p], k) => `<div><b class="${k % 2 ? 'g' : 'o'}">${k + 1}</b><strong>${e(h)}</strong><small>${e(p)}</small></div>`).join('')}</div><p class="sl-gwarn">${e(s.warn)}</p>`;
        break;
      case 'gcheck':
        body = `<div class="sl-gchk">${s.items.map((x) => `<div><span class="sl-gtick">✓</span>${e(x)}</div>`).join('')}</div>`;
        break;
      default: break;
    }
    return `<div class="sl th-${dk.theme} l-${s.l}">${dk.theme === 'green' ? '<i class="sl-gbar"></i>' : '<i class="sl-pin" aria-hidden="true"></i>'}${head}<div class="sl-body">${body}</div>${foot}</div>`;
  }

  function initDecks() {
    if (!$('#viewer')) return;
    const saved = store.get(DECK_KEY, null);
    if (saved) { const d = DECKS.find((x) => x.id === saved.d); if (d) { deck.d = d; deck.i = Math.min(saved.i || 0, d.slides.length - 1); } }
    $('#deckPicker').innerHTML = DECKS.map((d) => `
      <button class="deck-card glass" role="tab" type="button" data-deck="${d.id}" aria-selected="false">
        <span class="deck-mini" aria-hidden="true">${slideHTML(d, d.slides[0], 0)}</span>
        <span class="deck-info"><b>${escapeHTML(d.short)}</b><small>${escapeHTML(d.title)}</small><span class="deck-meta">${d.slides.length} slides · ${escapeHTML(d.by)}</span></span>
      </button>`).join('');
    $('#deckPicker').addEventListener('click', (e) => { const b = e.target.closest('[data-deck]'); if (b) openDeck(b.dataset.deck, 0); });
    $('#slidePrev').addEventListener('click', () => goSlide(deck.i - 1));
    $('#slideNext').addEventListener('click', () => goSlide(deck.i + 1));
    $('#thumbs').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { goSlide(+b.dataset.i); if (deck.grid) toggleGrid(false); } });
    $('#slidePlay').addEventListener('click', togglePlay);
    $('#slideGrid').addEventListener('click', () => toggleGrid());
    $('#slideFull').addEventListener('click', toggleFull);
    $('#slideFrame').addEventListener('click', (e) => {
      const b = e.target.closest('[data-open-lab]');
      if (b && isFull()) exitFull();
    });
    const viewer = $('#viewer');
    const keys = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && isFull())) { e.preventDefault(); goSlide(deck.i + 1); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); goSlide(deck.i - 1); }
      else if (k === 'Home') { e.preventDefault(); goSlide(0); }
      else if (k === 'End') { e.preventDefault(); goSlide(deck.d.slides.length - 1); }
      else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFull(); }
      else if (k === 'g' || k === 'G') { e.preventDefault(); toggleGrid(); }
      else if (k === 'Escape' && deck.grid) { e.preventDefault(); toggleGrid(false); }
      else if (k === 'Escape' && viewer.classList.contains('presenting')) { e.preventDefault(); exitFull(); }
    };
    viewer.addEventListener('keydown', keys);
    // Swipe
    let sx = null;
    $('#viewerStage').addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    $('#viewerStage').addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) goSlide(deck.i + (dx < 0 ? 1 : -1));
      sx = null;
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === viewer;
      viewer.classList.toggle('presenting', on);
      $('#slideFull').innerHTML = icon(on ? 'i-shrink' : 'i-expand');
      $('#slideFull').setAttribute('aria-label', on ? 'Exit full screen' : 'Present full screen');
    });
    renderDeck();
  }
  const isFull = () => document.fullscreenElement === $('#viewer') || $('#viewer').classList.contains('presenting');
  function exitFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    $('#viewer').classList.remove('presenting');
    document.body.classList.remove('deck-presenting');
    $('#slideFull').innerHTML = icon('i-expand');
  }
  function toggleFull() {
    const v = $('#viewer');
    if (isFull()) { exitFull(); return; }
    if (v.requestFullscreen) v.requestFullscreen().catch(() => { v.classList.add('presenting'); document.body.classList.add('deck-presenting'); });
    else { v.classList.add('presenting'); document.body.classList.add('deck-presenting'); $('#slideFull').innerHTML = icon('i-shrink'); }
    v.focus({ preventScroll: true });
  }
  function toggleGrid(force) {
    deck.grid = typeof force === 'boolean' ? force : !deck.grid;
    $('#viewer').classList.toggle('grid', deck.grid);
    $('#slideGrid').classList.toggle('on', deck.grid);
    if (deck.grid) { stopPlay(); const t = $(`#thumbs [data-i="${deck.i}"]`); if (t) t.focus({ preventScroll: true }); }
  }
  function togglePlay() {
    if (deck.play) { stopPlay(); return; }
    if (deck.i >= deck.d.slides.length - 1) goSlide(0);
    deck.play = setInterval(() => { if (deck.i >= deck.d.slides.length - 1) { stopPlay(); return; } goSlide(deck.i + 1); }, 5000);
    $('#slidePlay').innerHTML = icon('i-pause');
    $('#slidePlay').classList.add('on');
    $('#slidePlay').setAttribute('aria-label', 'Pause auto-play');
  }
  function stopPlay() {
    clearInterval(deck.play); deck.play = null;
    $('#slidePlay').innerHTML = icon('i-play');
    $('#slidePlay').classList.remove('on');
    $('#slidePlay').setAttribute('aria-label', 'Auto-play slides');
  }
  function openDeck(id, i = 0) {
    const d = DECKS.find((x) => x.id === id);
    if (!d) return;
    stopPlay();
    deck.d = d; deck.i = Math.max(0, Math.min(i, d.slides.length - 1));
    renderDeck();
  }
  function renderDeck() {
    const d = deck.d;
    $$('#deckPicker [data-deck]').forEach((b) => { const on = b.dataset.deck === d.id; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    $('#thumbs').innerHTML = d.slides.map((s, i) => `<button class="thumb" type="button" role="option" data-i="${i}" aria-label="Slide ${i + 1}: ${escapeHTML(s.t)}"><span class="thumb-sl" aria-hidden="true">${slideHTML(d, s, i)}</span><span class="thumb-n">${i + 1}</span></button>`).join('');
    $('#deckDownload').href = d.file;
    $('#deckDownload').setAttribute('download', d.file.split('/').pop());
    $('#viewer').dataset.theme = d.theme;
    goSlide(deck.i, true);
  }
  function goSlide(i, instant) {
    const d = deck.d;
    const n = d.slides.length;
    const next = Math.max(0, Math.min(n - 1, i));
    const dir = next >= deck.i ? 1 : -1;
    deck.i = next;
    const s = d.slides[next];
    const frame = $('#slideFrame');
    frame.innerHTML = slideHTML(d, s, next) + (s.lab ? `<button class="sl-run" type="button" data-open-lab="${s.lab}">${icon('i-play')} Run in Code Lab</button>` : '');
    frame.setAttribute('aria-label', `Slide ${next + 1} of ${n}: ${s.t}`);
    if (!instant && !reduceMotion) { frame.classList.remove('in-l', 'in-r'); void frame.offsetWidth; frame.classList.add(dir > 0 ? 'in-r' : 'in-l'); }
    $('#viewerTitle').textContent = d.short;
    $('#viewerCount').textContent = `${next + 1} / ${n}`;
    $('#viewerProgress').style.width = `${((next + 1) / n) * 100}%`;
    $('#viewerNote').hidden = !s.note;
    $('#viewerNote').innerHTML = s.note ? `${icon('i-alert')} <span>${escapeHTML(s.note)}</span>` : '';
    $('#slidePrev').disabled = next === 0;
    $('#slideNext').disabled = next === n - 1;
    $$('#thumbs .thumb').forEach((t) => { const on = +t.dataset.i === next; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); });
    const at = $(`#thumbs [data-i="${next}"]`);
    if (at && !deck.grid) { const box = $('#thumbs'); box.scrollTo({ left: at.offsetLeft - box.clientWidth / 2 + at.clientWidth / 2, behavior: instant || reduceMotion ? 'auto' : 'smooth' }); }
    store.set(DECK_KEY, { d: d.id, i: next });
    (deck.seen[d.id] = deck.seen[d.id] || new Set()).add(next);
    if (deck.seen[d.id].size === n && !deck.seen[d.id].done) { deck.seen[d.id].done = true; setTimeout(() => rewardActivity('presenter'), 800); }
  }

  /* =========================================================
     STUDIO: prototype workbench (ported from the résumé's Python)
     ========================================================= */
  // A tiny model of Python values so the checks behave exactly like the originals
  function pyToken(tok) {
    if (/^[+-]?\d+$/.test(tok)) return { type: 'int', v: parseInt(tok, 10), raw: tok };
    if (/^[+-]?(\d+\.\d*|\.\d+|\d+)(e[+-]?\d+)?$/i.test(tok)) return { type: 'float', v: parseFloat(tok), raw: tok };
    if (/^[+-]?(inf|infinity)$/i.test(tok)) return { type: 'float', v: tok.startsWith('-') ? -Infinity : Infinity, raw: tok };
    if (/^[+-]?nan$/i.test(tok)) return { type: 'float', v: NaN, raw: tok };
    if (/^(true|false)$/i.test(tok)) return { type: 'bool', v: /^t/i.test(tok), raw: tok };
    return { type: 'str', v: tok, raw: tok };
  }
  const parseReadings = (text) => text.split(/[\s,;]+/).filter(Boolean).map(pyToken);
  class PyValueError extends Error {}

  // def search_records(records, query)
  function searchRecords(records, query) {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return records.filter((r) => r.title.toLowerCase().includes(term));
  }
  // def summarize_readings(readings)
  function summarizeReadings(readings) {
    if (!readings.length) throw new PyValueError('At least one reading is required');
    if (readings.some((x) => x.type !== 'int' && x.type !== 'float')) throw new PyValueError('Readings must be numeric');
    if (!readings.every((x) => Number.isFinite(x.v))) throw new PyValueError('Readings must be finite');
    return { count: readings.length, mean: pySum(readings.map((x) => x.v)) / readings.length };
  }
  // def arithmetic_sequence(start, step, count)
  function arithmeticSequence(start, step, count) {
    if (start.type !== 'int' || step.type !== 'int') throw new PyValueError('Start and step must be integers');
    if (count.type !== 'int' || !(count.v >= 1 && count.v <= 100)) throw new PyValueError('Count must be an integer from 1 to 100');
    return Array.from({ length: count.v }, (_, i) => start.v + i * step.v);
  }
  const PY_SRC = {
    records: 'def search_records(records, query):\n    term = query.strip().casefold()\n    if not term:\n        return []\n    return [\n        record for record in records\n        if term in record["title"].casefold()\n    ]',
    notebook: 'from math import isfinite\n\ndef summarize_readings(readings):\n    if not readings:\n        raise ValueError("At least one reading is required")\n    if any(type(x) not in (int, float) for x in readings):\n        raise ValueError("Readings must be numeric")\n    if not all(isfinite(x) for x in readings):\n        raise ValueError("Readings must be finite")\n    return {"count": len(readings),\n            "mean": sum(readings) / len(readings)}',
    sequence: 'def arithmetic_sequence(start, step, count):\n    if type(start) is not int or type(step) is not int:\n        raise ValueError("Start and step must be integers")\n    if type(count) is not int or not 1 <= count <= 100:\n        raise ValueError("Count must be an integer from 1 to 100")\n    return [start + i * step for i in range(count)]'
  };
  const T = (s) => pyToken(String(s));
  const raises = (fn, msg) => { try { fn(); return false; } catch (err) { return err instanceof PyValueError && err.message === msg; } };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const CHECKS = {
    records: [
      ['Matching is case-insensitive', 'search_records(rs, "FIB")', () => searchRecords([{ title: 'Fibonacci in Python' }], 'FIB').length === 1, '1 match'],
      ['Surrounding spaces are ignored', 'search_records(rs, "  fib  ")', () => searchRecords([{ title: 'Fibonacci in Python' }], '  fib  ').length === 1, '1 match'],
      ['An empty query returns no results', 'search_records(rs, "")', () => same(searchRecords([{ title: 'Anything' }], ''), []), '[]'],
      ['A whitespace-only query returns no results', 'search_records(rs, "   ")', () => same(searchRecords([{ title: 'Anything' }], '   '), []), '[]'],
      ['A non-matching query returns an empty list', 'search_records(rs, "zzz")', () => same(searchRecords([{ title: 'Fibonacci' }], 'zzz'), []), '[]']
    ],
    notebook: [
      ['Rejects an empty list', 'summarize_readings([])', () => raises(() => summarizeReadings([]), 'At least one reading is required'), 'ValueError'],
      ['Rejects text', 'summarize_readings([21.5, "x"])', () => raises(() => summarizeReadings([T('21.5'), T('x')]), 'Readings must be numeric'), 'ValueError'],
      ['Rejects booleans', 'summarize_readings([True, 2])', () => raises(() => summarizeReadings([T('True'), T(2)]), 'Readings must be numeric'), 'ValueError'],
      ['Rejects non-finite values', 'summarize_readings([1, inf])', () => raises(() => summarizeReadings([T(1), T('inf')]), 'Readings must be finite'), 'ValueError'],
      ['Valid readings give count and mean', 'summarize_readings([2, 4, 9])', () => { const r = summarizeReadings([T(2), T(4), T(9)]); return r.count === 3 && r.mean === 5; }, "{'count': 3, 'mean': 5.0}"]
    ],
    sequence: [
      ['Positive step', 'arithmetic_sequence(1, 2, 5)', () => same(arithmeticSequence(T(1), T(2), T(5)), [1, 3, 5, 7, 9]), '[1, 3, 5, 7, 9]'],
      ['Zero step', 'arithmetic_sequence(4, 0, 3)', () => same(arithmeticSequence(T(4), T(0), T(3)), [4, 4, 4]), '[4, 4, 4]'],
      ['Negative step', 'arithmetic_sequence(10, -3, 4)', () => same(arithmeticSequence(T(10), T(-3), T(4)), [10, 7, 4, 1]), '[10, 7, 4, 1]'],
      ['A one-term sequence', 'arithmetic_sequence(7, 5, 1)', () => same(arithmeticSequence(T(7), T(5), T(1)), [7]), '[7]'],
      ['Invalid counts are rejected', 'arithmetic_sequence(1, 1, 0) / (1, 1, 101)', () => raises(() => arithmeticSequence(T(1), T(1), T(0)), 'Count must be an integer from 1 to 100') && raises(() => arithmeticSequence(T(1), T(1), T(101)), 'Count must be an integer from 1 to 100'), 'ValueError ×2']
    ]
  };
  const SEED_RECORDS = [
    { title: 'Green Earth Diwali deck', tags: ['bdaigogreen', 'slides'] },
    { title: 'Technology Briefing deck', tags: ['slides', 'databell'] },
    { title: 'Chief Guest Visit run order', tags: ['events'] },
    { title: 'Exhibition competition list', tags: ['events', 'prizes'] },
    { title: 'Fibonacci in Python', tags: ['mathopea', 'code'] },
    { title: 'Factorial calculator', tags: ['experimentium', 'code'] },
    { title: 'Top 5 app features query', tags: ['sql', 'databell'] }
  ];
  const REC_KEY = 'databell-hub-records';
  const bench = { proto: 'records', userRecs: store.get(REC_KEY, []), query: 'deck', tested: false };
  const allRecords = () => SEED_RECORDS.concat(bench.userRecs);

  function initStudio() {
    if (!$('#bench')) return;
    $('#bench').addEventListener('click', (e) => {
      const t = e.target.closest('.bench-tab');
      if (t) { benchShow(t.dataset.proto); return; }
      if (e.target.closest('[data-run-checks]')) runChecks();
      const rm = e.target.closest('[data-rm]');
      if (rm) { bench.userRecs.splice(+rm.dataset.rm, 1); store.set(REC_KEY, bench.userRecs); benchShow('records'); }
    });
    $('.bench-tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = $$('.bench-tab');
      const i = tabs.findIndex((t) => t.classList.contains('active'));
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      benchShow(n.dataset.proto); n.focus();
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.blueprint[data-proto], .concept[data-proto]');
      if (!b) return;
      e.preventDefault();
      benchShow(b.dataset.proto);
      goTo('#bench');
    });
    benchShow('records');
  }
  function checksHTML(proto) {
    return `
      <div class="bench-checks">
        <div class="bc-head"><b>${icon('i-shield')} Suggested checks</b><button class="btn btn-ghost btn-sm" type="button" data-run-checks>${icon('i-play')} Run ${CHECKS[proto].length} checks</button></div>
        <ul class="bc-list" id="bcList">${CHECKS[proto].map(([name, call, , expect]) => `<li><span class="bc-st" aria-hidden="true"></span><span><b>${escapeHTML(name)}</b><code>${escapeHTML(call)} → ${escapeHTML(expect)}</code></span></li>`).join('')}</ul>
        <p class="bc-sum muted small" id="bcSum" aria-live="polite"></p>
      </div>
      <details class="bench-src"><summary>${icon('i-code')} Python source</summary><pre class="mini-code"><code>${highlight(PY_SRC[proto], 'py')}</code></pre></details>`;
  }
  function benchShow(proto) {
    bench.proto = proto;
    $$('.bench-tab').forEach((t) => { const on = t.dataset.proto === proto; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    const body = $('#benchBody');
    if (proto === 'records') {
      body.innerHTML = `
        <div class="bench-grid">
          <div class="bench-ui">
            <p class="muted small">Design: a record-entry screen accepts a title and tags. Validation rejects empty titles, a repository stores records, and search returns title matches.</p>
            <form class="bench-form" id="recForm" novalidate>
              <label class="field"><span>Title</span><input name="rtitle" maxlength="80" placeholder="e.g. Prime number sieve"><em class="err" id="recErr">Title is required.</em></label>
              <label class="field"><span>Tags (comma separated)</span><input name="rtags" maxlength="80" placeholder="mathopea, code"></label>
              <button class="btn btn-primary btn-sm" type="submit">${icon('i-plus')} Add record</button>
            </form>
            <div class="search-box"><svg class="ic"><use href="#i-search"/></svg><input type="search" id="recQ" value="${escapeHTML(bench.query)}" placeholder="Search titles…" aria-label="Search records"></div>
            <p class="small muted" id="recMeta"></p>
            <ul class="rec-list" id="recList"></ul>
          </div>
          ${checksHTML(proto)}
        </div>`;
      const paint = () => {
        const recs = allRecords();
        const q = $('#recQ').value;
        bench.query = q;
        const res = searchRecords(recs, q);
        const term = q.trim().toLowerCase();
        $('#recMeta').innerHTML = !term ? `Empty query → <code>[]</code> by design. ${recs.length} records in the repository.` : `<code>search_records(records, ${escapeHTML(JSON.stringify(q))})</code> → ${res.length} of ${recs.length}`;
        $('#recList').innerHTML = res.map((r) => {
          const ui = bench.userRecs.indexOf(r);
          const t = escapeHTML(r.title);
          const k = r.title.toLowerCase().indexOf(term);
          const marked = k >= 0 ? `${escapeHTML(r.title.slice(0, k))}<mark>${escapeHTML(r.title.slice(k, k + term.length))}</mark>${escapeHTML(r.title.slice(k + term.length))}` : t;
          return `<li><span>${marked}</span><span class="rec-tags">${r.tags.map((x) => `<i>${escapeHTML(x)}</i>`).join('')}</span>${ui >= 0 ? `<button class="icon-btn sm" data-rm="${ui}" aria-label="Remove ${t}">${icon('i-x')}</button>` : ''}</li>`;
        }).join('') || (term ? '<li class="muted">No titles match.</li>' : '');
      };
      $('#recQ').addEventListener('input', paint);
      $('#recForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const tIn = f.elements.namedItem('rtitle');
        const title = tIn.value.trim();
        const wrap = tIn.closest('.field');
        let err = '';
        if (!title) err = 'Title is required: empty titles are rejected.';
        else if (allRecords().some((r) => r.title.toLowerCase() === title.toLowerCase())) err = 'A record with this title already exists.';
        wrap.classList.toggle('invalid', !!err);
        $('#recErr').textContent = err;
        if (err) { tIn.focus(); return; }
        bench.userRecs.push({ title, tags: f.elements.namedItem('rtags').value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 5) });
        store.set(REC_KEY, bench.userRecs);
        f.reset();
        $('#recQ').value = title.split(/\s+/)[0];
        paint();
        toast(`Record “${title}” added`, 'i-data');
      });
      paint();
    } else if (proto === 'notebook') {
      body.innerHTML = `
        <div class="bench-grid">
          <div class="bench-ui">
            <p class="muted small">Design: the hypothesis, unit, observations and interpretation are kept in separate fields. Readings are validated before a summary is generated, and the raw readings are kept so every result can be traced.</p>
            <div class="nb-cols">
              <fieldset class="nb-col"><legend>Evidence</legend>
                <label class="field"><span>Hypothesis</span><input id="nbHyp" value="Water boils faster with the lid on" maxlength="120"></label>
                <label class="field"><span>Measurement unit</span><input id="nbUnit" value="seconds" maxlength="20"></label>
                <label class="field"><span>Readings (separate with spaces or commas)</span><textarea id="nbRead" rows="2">312, 298, 305, 301, 309</textarea></label>
              </fieldset>
              <fieldset class="nb-col"><legend>Interpretation</legend>
                <label class="field"><span>What do you think it means?</span><textarea id="nbInt" rows="5" placeholder="Kept apart from the evidence on purpose.">Times are close together; compare with a lid-off run before concluding.</textarea></label>
              </fieldset>
            </div>
            <div class="nb-out" id="nbOut" aria-live="polite"></div>
            <p class="muted small">Try <code>21.5, x</code>, <code>true</code>, <code>inf</code> or an empty box to see the validation.</p>
          </div>
          ${checksHTML(proto)}
        </div>`;
      const paint = () => {
        const raw = parseReadings($('#nbRead').value);
        const unit = $('#nbUnit').value.trim();
        let out;
        try {
          const r = summarizeReadings(raw);
          const vals = raw.map((x) => x.v);
          const lo = Math.min(...vals), hi = Math.max(...vals);
          const span = hi - lo || 1;
          const W = 300, x = (v) => 12 + ((v - lo) / span) * (W - 24);
          out = `<div class="nb-ok">
              <div class="nb-sum"><span><small>count</small><b>${r.count}</b></span><span><small>mean</small><b>${pyFloat(r.mean)}</b>${unit ? `<em>${escapeHTML(unit)}</em>` : ''}</span><span><small>range</small><b>${lo} – ${hi}</b></span></div>
              <svg class="nb-plot" viewBox="0 0 ${W} 54" role="img" aria-label="Dot plot of ${r.count} readings with the mean marked"><line x1="12" x2="${W - 12}" y1="34" y2="34" class="ax"/>${vals.map((v) => `<circle cx="${x(v).toFixed(1)}" cy="34" r="5" class="pt"/>`).join('')}<line x1="${x(r.mean).toFixed(1)}" x2="${x(r.mean).toFixed(1)}" y1="10" y2="46" class="mean"/><text x="${Math.min(W - 40, Math.max(14, x(r.mean) + 4)).toFixed(1)}" y="12" class="lbl">mean</text></svg>
              <p class="small muted">${icon('i-alert')} An average summarises the readings; it does not prove the hypothesis “${escapeHTML($('#nbHyp').value.trim() || '—')}”.</p></div>`;
        } catch (err) {
          out = `<div class="nb-err">${icon('i-x')} <code>ValueError: ${escapeHTML(err.message)}</code></div>`;
        }
        $('#nbOut').innerHTML = `<div class="nb-raw"><small>Raw readings kept (${raw.length})</small>${raw.map((t) => `<i class="t-${t.type}" title="${t.type}">${escapeHTML(t.raw)}<sub>${t.type}</sub></i>`).join('') || '<i class="t-str">empty</i>'}</div>${out}`;
      };
      ['#nbRead', '#nbUnit', '#nbHyp'].forEach((s) => $(s).addEventListener('input', paint));
      paint();
    } else {
      body.innerHTML = `
        <div class="bench-grid">
          <div class="bench-ui">
            <p class="muted small">Design: a pure function generates the sequence, and the screen shows each addition as an explanatory step, so the rule can be tested without the interface.</p>
            <div class="seq-in">
              <label class="field"><span>Start</span><input id="sqStart" inputmode="numeric" value="5"></label>
              <label class="field"><span>Step</span><input id="sqStep" inputmode="numeric" value="3"></label>
              <label class="field"><span>Count (1–100)</span><input id="sqCount" inputmode="numeric" value="8"></label>
            </div>
            <div id="sqOut" aria-live="polite"></div>
          </div>
          ${checksHTML(proto)}
        </div>`;
      const paint = () => {
        const a = pyToken($('#sqStart').value.trim()), d = pyToken($('#sqStep').value.trim()), c = pyToken($('#sqCount').value.trim());
        let html;
        try {
          const seq = arithmeticSequence(a, d, c);
          const lo = Math.min(0, ...seq), hi = Math.max(0, ...seq);
          const span = hi - lo || 1;
          const W = 320, H = 110, bw = Math.max(2, (W - 8) / seq.length - 2);
          const y = (v) => 6 + (1 - (v - lo) / span) * (H - 12);
          html = `
            <p class="seq-rule">a<sub>n</sub> = ${a.v} + (n − 1) × ${d.v < 0 ? `(${d.v})` : d.v}</p>
            <div class="seq-terms">${seq.map((v) => `<span>${v}</span>`).join('')}</div>
            <svg class="seq-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of ${seq.length} terms"><line x1="0" x2="${W}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" class="ax"/>${seq.map((v, i) => `<rect x="${(4 + i * (bw + 2)).toFixed(1)}" y="${Math.min(y(v), y(0)).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(y(v) - y(0))).toFixed(1)}" rx="1.5"/>`).join('')}</svg>
            <ol class="seq-steps">${seq.slice(0, 8).map((v, i) => `<li>a<sub>${i + 1}</sub> = ${i === 0 ? v : `${seq[i - 1]} ${d.v < 0 ? '−' : '+'} ${Math.abs(d.v)} = ${v}`}</li>`).join('')}${seq.length > 8 ? `<li class="muted">… ${seq.length - 8} more</li>` : ''}</ol>`;
        } catch (err) {
          html = `<div class="nb-err">${icon('i-x')} <code>ValueError: ${escapeHTML(err.message)}</code></div>`;
        }
        $('#sqOut').innerHTML = html;
      };
      ['#sqStart', '#sqStep', '#sqCount'].forEach((s) => $(s).addEventListener('input', paint));
      paint();
    }
  }
  function runChecks() {
    const list = CHECKS[bench.proto];
    const items = $$('#bcList li');
    items.forEach((li) => li.classList.remove('pass', 'fail'));
    $('#bcSum').textContent = 'Running…';
    let passed = 0;
    list.forEach(([, , fn], i) => {
      setTimeout(() => {
        let ok = false;
        try { ok = !!fn(); } catch (err) { ok = false; }
        if (ok) passed++;
        items[i].classList.add(ok ? 'pass' : 'fail');
        $('.bc-st', items[i]).innerHTML = icon(ok ? 'i-check' : 'i-x');
        if (i === list.length - 1) {
          $('#bcSum').textContent = `${passed} of ${list.length} checks passed`;
          if (!bench.tested && passed === list.length) { bench.tested = true; setTimeout(() => rewardActivity('tester'), 900); }
        }
      }, reduceMotion ? 0 : 180 * (i + 1));
    });
  }

  /* =========================================================
     EXHIBITION 2026
     ========================================================= */
  const EXPO_START = new Date('2026-11-13T09:00:00+05:30');
  const EXPO_END = new Date('2026-11-13T18:00:00+05:30');
  const PRIZES = [
    { p: 1, cash: 150000, extra: ['Trophy', 'Laptop', 'Certificate of Excellence'], h: 100 },
    { p: 2, cash: 100000, extra: ['Trophy', 'Certificate of Excellence'], h: 80 },
    { p: 3, cash: 50000, extra: ['Trophy', 'Certificate of Excellence'], h: 64 },
    { p: 4, cash: 25000, extra: ['Trophy', 'Certificate of Excellence'], h: 50 },
    { p: 5, cash: 12500, extra: ['Trophy', 'Certificate of Excellence'], h: 40 }
  ];
  const PLACE = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
  const EXPO_KEY = 'databell-hub-expo';
  function initExhibition() {
    if (!$('#exhibition')) return;
    // Status / countdown
    const tick = () => {
      const now = new Date();
      const st = $('#expoStatus'), cnt = $('#expoCount');
      if (now < EXPO_START) {
        let s = Math.floor((EXPO_START - now) / 1000);
        const d = Math.floor(s / 86400); s -= d * 86400;
        const h = Math.floor(s / 3600); s -= h * 3600;
        const m = Math.floor(s / 60); s -= m * 60;
        st.textContent = 'Starts in';
        cnt.hidden = false;
        cnt.innerHTML = [[d, 'days'], [h, 'hrs'], [m, 'min'], [s, 'sec']].map(([v, l]) => `<span><b>${pad2(v)}</b><small>${l}</small></span>`).join('');
        return true;
      }
      cnt.hidden = true;
      if (now <= EXPO_END) { st.textContent = 'Happening today: Science and Mathematics Exhibition Halls are open'; return true; }
      const days = Math.floor((now - EXPO_END) / 864e5);
      st.textContent = `Held ${days < 1 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`} · thank you to every participant`;
      $('#expoFormTitle').textContent = 'Register interest for the next exhibition';
      $('#expoFormSub').textContent = 'Tell us which competition you’d enter next time. Entries are saved in this browser only.';
      return false;
    };
    if (tick()) { const t = setInterval(() => { if (!tick()) clearInterval(t); }, 1000); }

    // Hall filter
    $('#expoFilter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-hall]');
      if (!b) return;
      $$('#expoFilter .chip-btn').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-selected', String(on)); });
      $$('#halls .hall').forEach((h) => { h.hidden = !(b.dataset.hall === 'all' || h.dataset.hall === b.dataset.hall); });
    });

    // Podium (visual order 4-2-1-3-5)
    $('#podium').innerHTML = [4, 2, 1, 3, 5].map((p) => {
      const z = PRIZES[p - 1];
      return `<div class="pod pod-${p}" style="--h:${z.h}">
        <div class="pod-top">${p <= 3 ? `<span class="pod-trophy">${icon('i-trophy')}</span>` : `<span class="pod-trophy sm">${icon('i-award')}</span>`}<b class="pod-cash">${inr(z.cash)}</b><small>${z.extra.join(' · ')}</small></div>
        <div class="pod-block"><span class="pod-n">#${p}</span><span class="pod-l">${PLACE[p - 1]} place</span></div>
      </div>`;
    }).join('');
    const totals = (k) => {
      const cash = PRIZES.reduce((s, z) => s + z.cash, 0) * k;
      $('#prizeTotals').innerHTML = `
        <div><dt>Cash prizes</dt><dd>${inr(cash)}</dd></div>
        <div><dt>Laptops</dt><dd>${k}</dd></div>
        <div><dt>Trophies</dt><dd>${5 * k}</dd></div>
        <div><dt>Certificates of Excellence</dt><dd>${5 * k}</dd></div>`;
    };
    $$('.prize-side .seg-btn').forEach((b) => b.addEventListener('click', () => {
      $$('.prize-side .seg-btn').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      totals(+b.dataset.scope);
    }));
    totals(1);

    // Interest form
    const form = $('#expoForm');
    let entries = store.get(EXPO_KEY, []);
    const paintEntries = () => {
      $('#expoEntries').innerHTML = entries.map((en, i) => `<li><span><b>${escapeHTML(en.name)}</b><small>${escapeHTML(en.comp)} · team of ${en.size}</small></span><button class="icon-btn sm" type="button" data-rm-entry="${i}" aria-label="Remove entry for ${escapeHTML(en.name)}">${icon('i-trash')}</button></li>`).join('');
    };
    $('#expoEntries').addEventListener('click', (e) => {
      const b = e.target.closest('[data-rm-entry]');
      if (!b) return;
      entries.splice(+b.dataset.rmEntry, 1);
      store.set(EXPO_KEY, entries);
      paintEntries();
    });
    const valid = (el) => {
      let ok = el.value.trim().length > 0;
      if (el.name === 'size') { const n = Number(el.value); ok = Number.isInteger(n) && n >= 1 && n <= 6; }
      el.closest('.field').classList.toggle('invalid', !ok);
      return ok;
    };
    $$('[required]', form).forEach((el) => el.addEventListener('input', () => { if (el.closest('.invalid')) valid(el); }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = $$('[required]', form);
      const res = fields.map(valid);
      if (res.includes(false)) { fields[res.indexOf(false)].focus(); return; }
      const nm = form.elements.namedItem('ename').value.trim();
      const comp = form.elements.namedItem('comp').value;
      entries.push({ name: nm, comp, size: Number(form.elements.namedItem('size').value) });
      entries = entries.slice(-12);
      store.set(EXPO_KEY, entries);
      paintEntries();
      toast(`Saved: ${nm} · ${comp}`, 'i-trophy');
      form.reset();
    });
    paintEntries();
  }

  /* =========================================================
     BDAIGoGreen
     ========================================================= */
  const GG_TIPS = [
    { id: 'light', t: 'Light up', icon: 'i-flame', items: [['Clay diyas', 'Use earthen diyas with natural oil or ghee instead of paraffin or plastic lamps. Reuse them next year.', 'Warm glow, zero smoke'], ['LED string lights', 'Energy-saving LEDs use far less power and stay cool, lowering fire risk.', 'Cool, safe and efficient'], ['Natural décor', 'Marigold and mango leaf toranas, flower rangoli and fallen petals. Compost them afterwards.', 'Back to the soil']] },
    { id: 'sound', t: 'Sound & sparkle', icon: 'i-sparkle', items: [['Skip the crackers', 'Crackers release smoke, heavy metals and loud noise that harm people, pets, birds and elders.'], ['Celebrate with music', 'Hold a family singing, dance or dhol evening in place of the bangs.'], ['Rangoli and diya art', 'Colour floors with flower, rice or natural-dye rangoli. Hold a family contest.'], ['If you must use sparklers', 'Choose certified green options, use outdoors, keep water close and adults supervising.']] },
    { id: 'gifts', t: 'Gifts & sweets', icon: 'i-gift', items: [['Gift', 'Potted saplings, seed paper, handmade or local artisan items.'], ['Wrap', 'Cloth, newspaper or reusable bags instead of plastic or foil.'], ['Sweets', 'Homemade or local sweets, served on leaf plates, with steel or clay cups.'], ['Share', 'Donate extra food, clothes and sweets to those in need.']] },
    { id: 'safety', t: 'Celebrate safely', icon: 'i-shield', items: [['Fire safety', 'Keep diyas away from curtains and clothes; keep a bucket of water or extinguisher nearby.'], ['Never unattended', 'Do not leave lit diyas or candles alone, especially around children and pets.'], ['Clothing', 'Wear cotton and fitted clothes, not loose synthetic fabrics, near flames.'], ['Health', 'People with asthma should limit exposure to smoke; keep windows and air purifiers ready.'], ['First aid', 'Run burns under cool water for 10+ minutes and seek medical help quickly.']] }
  ];
  const GG_CHECK = ['Use clay diyas and LED lights', 'Make flower rangoli and natural décor', 'Skip firecrackers; enjoy music and family time', 'Choose plastic-free gifts and wrapping', 'Keep fire safety essentials ready', 'Compost and recycle after the festival'];
  const GG_KEY = 'databell-hub-green';
  function initGoGreen() {
    if (!$('#gogreen')) return;
    const st = Object.assign({ pledged: null, checks: [], diyas: [] }, store.get(GG_KEY, {}));
    const save = () => store.set(GG_KEY, st);

    // Pledge
    const boxes = $$('#pledgeList input');
    const btn = $('#pledgeBtn');
    const msg = $('#pledgeMsg');
    const paintPledge = () => {
      if (st.pledged) {
        boxes.forEach((b) => { b.checked = true; b.disabled = true; });
        btn.disabled = false;
        btn.innerHTML = `${icon('i-send')} Share the pledge`;
        msg.innerHTML = `${icon('i-check')} You took the Green Diwali pledge on ${new Date(st.pledged).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
        msg.classList.add('ok');
        return;
      }
      const n = boxes.filter((b) => b.checked).length;
      btn.disabled = n < 4;
      msg.textContent = n < 4 ? `Tick all four promises to take the pledge (${n}/4).` : 'Ready. Take the pledge!';
    };
    boxes.forEach((b) => b.addEventListener('change', paintPledge));
    btn.addEventListener('click', () => {
      if (!st.pledged) {
        st.pledged = Date.now(); save(); paintPledge();
        toast('Pledge taken: light up homes, not the planet', 'i-leaf');
        burst(btn);
        setTimeout(() => rewardActivity('pledge'), 1200);
        return;
      }
      const text = 'I took the BDAIGoGreen Green Diwali pledge: clay diyas and LEDs, no firecrackers, zero-waste décor and gifts, and I’m sharing it with my community. Light a diya, not the sky.';
      if (navigator.share) navigator.share({ title: 'Green Diwali pledge', text }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Pledge text copied, ready to share', 'i-copy'), () => toast(text, 'i-leaf'));
      else toast(text, 'i-leaf');
    });
    paintPledge();

    // Tips tabs
    const tabs = $('#ggTabs');
    tabs.innerHTML = GG_TIPS.map((g, i) => `<button role="tab" type="button" class="gg-tab${i ? '' : ' active'}" data-tip="${g.id}" aria-selected="${!i}" tabindex="${i ? -1 : 0}">${icon(g.icon)} ${g.t}</button>`).join('');
    const showTip = (id) => {
      const g = GG_TIPS.find((x) => x.id === id);
      $$('.gg-tab', tabs).forEach((t) => { const on = t.dataset.tip === id; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      $('#ggPanel').innerHTML = `<div class="gg-tips n${g.items.length}">${g.items.map(([h, p, cap]) => `<article class="gg-tip"><h4>${escapeHTML(h)}</h4><p>${escapeHTML(p)}</p>${cap ? `<b>${escapeHTML(cap)}</b>` : ''}</article>`).join('')}</div>`;
    };
    tabs.addEventListener('click', (e) => { const t = e.target.closest('[data-tip]'); if (t) showTip(t.dataset.tip); });
    tabs.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const all = $$('.gg-tab', tabs);
      const i = all.findIndex((t) => t.classList.contains('active'));
      const n = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      showTip(n.dataset.tip); n.focus();
    });
    showTip('light');

    // Checklist
    const ul = $('#ggCheck');
    ul.innerHTML = GG_CHECK.map((t, i) => `<li><label><input type="checkbox" data-ck="${i}" ${st.checks.includes(i) ? 'checked' : ''}><span class="gg-tick">${icon('i-check')}</span><span>${escapeHTML(t)}</span></label></li>`).join('');
    const ring = () => {
      const n = st.checks.length;
      $('#ggRing').style.setProperty('--p', n / GG_CHECK.length);
      $('#ggRingText').textContent = `${n}/${GG_CHECK.length}`;
      $('#ggRing').classList.toggle('done', n === GG_CHECK.length);
    };
    ul.addEventListener('change', (e) => {
      const i = +e.target.dataset.ck;
      st.checks = e.target.checked ? [...new Set(st.checks.concat(i))] : st.checks.filter((x) => x !== i);
      save(); ring();
      if (e.target.checked && st.checks.length === GG_CHECK.length) toast('Checklist complete. Happy Green Diwali!', 'i-leaf');
    });
    ring();

    // Diyas
    const N = 9;
    const wrap = $('#diyas');
    wrap.innerHTML = Array.from({ length: N }, (_, i) => `<button class="diya${st.diyas.includes(i) ? ' lit' : ''}" type="button" data-diya="${i}" aria-pressed="${st.diyas.includes(i)}" aria-label="Diya ${i + 1}">
      <svg viewBox="0 0 60 70" aria-hidden="true"><path class="d-flame" d="M30 8c5 8 8 13 8 19a8 8 0 0 1-16 0c0-6 3-11 8-19z"/><path class="d-core" d="M30 20c2 4 3 6 3 9a3 3 0 0 1-6 0c0-3 1-5 3-9z"/><path class="d-wick" d="M30 36v6"/><path class="d-bowl" d="M6 42h48c-2 12-12 20-24 20S8 54 6 42z"/><path class="d-rim" d="M6 42h48"/></svg></button>`).join('');
    const paintDiyas = (justLit) => {
      const n = st.diyas.length;
      $('#diyaMsg').textContent = n === N ? 'Happy Green Diwali from BDAIGoGreen ✨' : n ? `${n} of ${N} diyas lit` : 'Click each diya to light it.';
      $('.diya-strip').classList.toggle('all-lit', n === N);
      if (justLit && n === N) toast('All nine diyas lit: light a diya, not the sky', 'i-flame');
    };
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-diya]');
      if (!b) return;
      const i = +b.dataset.diya;
      const on = !st.diyas.includes(i);
      st.diyas = on ? st.diyas.concat(i) : st.diyas.filter((x) => x !== i);
      b.classList.toggle('lit', on);
      b.setAttribute('aria-pressed', String(on));
      save();
      paintDiyas(on);
    });
    paintDiyas(false);
  }
  function burst(el) {
    if (reduceMotion) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('i');
      s.className = 'petal';
      const a = (Math.PI * 2 * i) / 18;
      s.style.left = `${r.left + r.width / 2}px`;
      s.style.top = `${r.top + r.height / 2}px`;
      s.style.setProperty('--dx', `${Math.cos(a) * (60 + Math.random() * 60)}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * (60 + Math.random() * 60) - 30}px`);
      s.style.background = ['#f5a623', '#e8731a', '#4ade80', '#fbbf24'][i % 4];
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    }
  }

  /* ---------- Hub: register everything ---------- */
  function initHub() {
    initNavDrop();
    initArchitecture();
    initConnections();
    initCodeLab();
    initDecks();
    initStudio();
    initExhibition();
    initGoGreen();
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
    initHub();
    runPreloader();
  });
})();
