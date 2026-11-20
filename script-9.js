/* =========================================================
   Databell Hub · Architecture, Presentations, Code Lab & more
   script-9.js — loads after script-7.js and imports its helpers
   ========================================================= */
(() => {
  'use strict';

  const D = window.Databell;
  if (!D) { console.error('script-9.js needs script-7.js to load first.'); return; }
  const { $, $$, store, escapeHTML, icon, toast, goTo, rewardActivity, reduceMotion } = D;
  /* =========================================================
     DATABELL HUB
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

  /* ---------- Register with the base site (script-7.js) ---------- */
  D.addQuests([
    { id: 'coder', icon: 'i-terminal', title: 'Hello, world', desc: 'Run a program in the Code Lab', pts: 30, go: '#codelab' },
    { id: 'presenter', icon: 'i-slides', title: 'Presenter', desc: 'View every slide of a presentation', pts: 60, go: '#presentations' },
    { id: 'tester', icon: 'i-flask', title: 'All green', desc: 'Pass every check on a Studio prototype', pts: 40, go: '#studio' },
    { id: 'pledge', icon: 'i-leaf', title: 'Green Diwali', desc: 'Take the BDAIGoGreen pledge', pts: 50, go: '#gogreen' }
  ]);
  D.addCommands(() => [['Hub · Extension 09', '#hub'], ['Architecture', '#architecture'], ['Connections: maths, science & coding', '#connections'], ['Code Lab', '#codelab'], ['Presentations', '#presentations'], ['Studio: Mathopea & Experimentium', '#studio'], ['Exhibition 2026', '#exhibition'], ['BDAIGoGreen: Green Earth Diwali', '#gogreen']]
    .map(([n, h]) => ({ group: 'Hub', label: n, icon: 'i-arrow', run: () => goTo(h) }))
    .concat(DECKS.flatMap((d) => d.slides.map((sl, i) => ({ group: 'Slides', label: sl.t, hint: `${d.short} · ${i + 1}`, icon: 'i-slides', run: () => { openDeck(d.id, i); goTo('#presentations'); } }))))
    .concat(LAB.map((f) => ({ group: 'Code Lab', label: f.name, hint: f.mode === 'sim' ? 'simulated' : 'runs live', icon: 'i-terminal', run: () => { labOpen(f.id); goTo('#codelab'); } })))
    .concat(ARCH_FLOWS.map((f) => ({ group: 'Architecture', label: `Trace: ${f.name}`, icon: f.icon, run: () => { goTo('#architecture'); setTimeout(() => archTrace(f.id), 500); } }))));

  // script-7.js boots first (deferred scripts run in order), then the Hub
  document.addEventListener('DOMContentLoaded', initHub);
})();
