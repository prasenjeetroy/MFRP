/* ==========================================================
   BDAI Events — inbox-5.js
   The Inbox page: folders, search, message list, reading pane,
   star / unread / delete (with undo), and the profile card
   (monthly-drop subscription, log out, delete account).
   Needs account-5.js to be loaded first.
   ========================================================== */
(() => {
  "use strict";

  const { $, $$, escapeHTML, toast, account, inbox, onChange } = window.BDAI;
  const app = $("#inboxApp");

  const ui = { folder: "all", query: "", openId: null, userId: null, deleteArmed: false };

  const FOLDERS = [
    { id: "all", label: "All mail", icon: "📥" },
    { id: "unread", label: "Unread", icon: "🔵" },
    { id: "starred", label: "Starred", icon: "⭐" },
    { id: "Updates", label: "Updates", icon: "📰" },
    { id: "Events", label: "Events", icon: "🎟️" },
    { id: "Account", label: "Account", icon: "🔐" },
  ];
  const EMPTY = {
    all: "Your inbox is empty.",
    unread: "You're all caught up. No unread messages.",
    starred: "No starred messages yet. Star a message to keep it handy.",
    Updates: "No updates yet. The monthly drop will land here.",
    Events: "No event messages yet. Register for an event to get your ticket here.",
    Account: "No account messages.",
  };
  const SENDER_AV = {
    "BDAI Tickets": "linear-gradient(135deg,#ff9f43,#ff4fd8)",
    "BDAI Events Team": "linear-gradient(135deg,#7c5cff,#00d4ff)",
  };
  const senderInitials = (from) => from.replace(/^BDAI\s+/, "").slice(0, 1).toUpperCase();

  const ICON = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  };

  /* ---------- formatting ---------- */
  function relTime(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 7 * 86400) return new Date(ts).toLocaleDateString("en-US", { weekday: "short" });
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const fullDate = (ts) => new Date(ts).toLocaleString("en-US",
    { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const paragraphs = (text) => text.split(/\n{2,}/).map((p) => `<p>${escapeHTML(p).replace(/\n/g, "<br />")}</p>`).join("");
  const snippet = (text) => text.replace(/\s+/g, " ").slice(0, 110);

  /* ---------- filtering ---------- */
  const inFolder = (m, f) => f === "all" || (f === "unread" && !m.read) || (f === "starred" && m.starred) || m.category === f;
  const matches = (m, q) => !q || `${m.from} ${m.subject} ${m.body}`.toLowerCase().includes(q);
  const visible = () => inbox.list().filter((m) => inFolder(m, ui.folder) && matches(m, ui.query.trim().toLowerCase()));
  const countFor = (f) => inbox.list().filter((m) => inFolder(m, f)).length;

  /* ---------- rendering ---------- */
  function render() {
    // Remember which control had focus so re-rendering doesn't lose the keyboard position.
    const focusKey = document.activeElement?.dataset?.fk;
    const user = account.current();
    if (!user) {
      Object.assign(ui, { userId: null, openId: null, deleteArmed: false });
      renderLocked();
      return;
    }
    if (ui.userId !== user.id || !$("#mailList")) {
      Object.assign(ui, { userId: user.id, openId: null, folder: "all", query: "", deleteArmed: false });
      renderShell();
    }
    if (ui.openId && !inbox.list().some((m) => m.id === ui.openId)) ui.openId = null;
    renderTop(user);
    renderFolders();
    renderProfile(user);
    renderList();
    renderReader();
    if (focusKey) $(`[data-fk="${focusKey}"]`)?.focus();
  }

  function renderLocked() {
    document.title = "Inbox — BDAI Events";
    app.innerHTML = `
      <section class="inbox-locked">
        <div class="lock-icon" aria-hidden="true">🔒</div>
        <span class="eyebrow">Inbox</span>
        <h1>Your BDAI inbox</h1>
        <p class="muted">Ticket confirmations, account messages and the monthly drop all arrive here. No email needed: an account is just your first name, last name and a 6-digit PIN.</p>
        <div class="locked-actions">
          <button class="btn btn-primary" data-auth="login">Log in</button>
          <button class="btn btn-ghost" data-auth="signup">Create account</button>
        </div>
      </section>`;
  }

  function renderShell() {
    app.innerHTML = `
      <div class="inbox-top">
        <div>
          <span class="eyebrow">Inbox</span>
          <h1 id="inboxTitle"></h1>
          <p class="muted" id="inboxSub"></p>
        </div>
        <button class="btn btn-ghost btn-sm" id="markAll" data-fk="mark-all">${ICON.mail} Mark all as read</button>
      </div>
      <div class="inbox-grid" id="inboxGrid">
        <aside class="inbox-side">
          <nav class="folders" id="folders" aria-label="Folders"></nav>
          <section class="profile-card" id="profile" aria-label="Your profile"></section>
        </aside>
        <section class="mail-list-wrap" aria-label="Messages">
          <label class="search mail-search">
            ${ICON.search}
            <input type="search" id="mailSearch" placeholder="Search messages" aria-label="Search messages" />
          </label>
          <ul class="mail-list" id="mailList"></ul>
        </section>
        <article class="reader" id="reader"></article>
      </div>`;

    $("#mailSearch").addEventListener("input", (e) => { ui.query = e.target.value; renderList(); });
    $("#markAll").addEventListener("click", () => {
      if (!inbox.unread()) return toast("You're all caught up", "✅");
      inbox.updateAll({ read: true });
      toast("All messages marked as read", "✅");
    });
    $("#folders").addEventListener("click", onFolderClick);
    $("#mailList").addEventListener("click", onListClick);
    $("#mailList").addEventListener("keydown", onListKeys);
    $("#reader").addEventListener("click", onReaderClick);
    $("#profile").addEventListener("change", onProfileChange);
    $("#profile").addEventListener("click", onProfileClick);
  }

  function renderTop(user) {
    const unread = inbox.unread(), total = inbox.list().length;
    $("#inboxTitle").textContent = `Hi, ${user.first}`;
    $("#inboxSub").textContent = `${unread ? `${unread} unread · ` : "All caught up · "}${total} message${total === 1 ? "" : "s"}`;
    document.title = `${unread ? `(${unread}) ` : ""}Inbox — BDAI Events`;
  }

  function renderFolders() {
    $("#folders").innerHTML = FOLDERS.map((f) => {
      const n = countFor(f.id);
      const active = ui.folder === f.id;
      return `<button class="folder${active ? " active" : ""}" data-folder="${f.id}" data-fk="folder-${f.id}" aria-pressed="${active}">
                <span><span aria-hidden="true">${f.icon}</span> ${f.label}</span>${n ? `<span class="n">${n}</span>` : ""}
              </button>`;
    }).join("");
  }

  function renderProfile(user) {
    $("#profile").innerHTML = `
      <span class="avatar-sm xl" style="--av:${user.av}" aria-hidden="true">${escapeHTML(user.initials)}</span>
      <div class="profile-info">
        <h3>${escapeHTML(user.name)}</h3>
        <p class="muted small">Member since ${new Date(user.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
      </div>
      <label class="switch-row">
        <span><b>Monthly drop</b><small>${user.subscribed ? "Subscribed. New drops arrive here." : "Not subscribed"}</small></span>
        <input type="checkbox" class="switch" id="subSwitch" role="switch" data-fk="sub-switch" ${user.subscribed ? "checked" : ""} />
      </label>
      <div class="profile-actions">
        <button class="btn btn-ghost btn-sm" data-acc="logout">Log out</button>
        <button class="btn btn-sm btn-danger${ui.deleteArmed ? " armed" : ""}" id="deleteAcc" data-fk="delete-acc">
          ${ui.deleteArmed ? "Click again to delete" : "Delete account"}
        </button>
      </div>`;
  }

  function renderList() {
    const list = visible();
    $("#inboxGrid").classList.toggle("reading", !!ui.openId);
    if (!list.length) {
      $("#mailList").innerHTML = `
        <li class="mail-empty">
          <span aria-hidden="true">📭</span>
          <p>${ui.query.trim() ? "No messages match your search." : EMPTY[ui.folder]}</p>
        </li>`;
      return;
    }
    $("#mailList").innerHTML = list.map((m) => `
      <li class="mail-item${m.read ? "" : " unread"}${m.id === ui.openId ? " active" : ""}">
        <button class="mail-open" data-id="${m.id}" data-fk="open-${m.id}"
                aria-label="${m.read ? "" : "Unread. "}From ${escapeHTML(m.from)}: ${escapeHTML(m.subject)}. ${relTime(m.date)}"
                ${m.id === ui.openId ? 'aria-current="true"' : ""}>
          <span class="avatar-sm" style="--av:${SENDER_AV[m.from] || SENDER_AV["BDAI Events Team"]}" aria-hidden="true">${senderInitials(m.from)}</span>
          <span class="mail-text">
            <span class="mail-from"><span>${escapeHTML(m.from)}</span><time datetime="${new Date(m.date).toISOString()}">${relTime(m.date)}</time></span>
            <span class="mail-subj">${m.read ? "" : '<span class="unread-dot" aria-hidden="true"></span>'}${escapeHTML(m.subject)}</span>
            <span class="mail-snip">${escapeHTML(snippet(m.body))}</span>
          </span>
        </button>
        <button class="star-btn${m.starred ? " on" : ""}" data-star="${m.id}" data-fk="star-${m.id}"
                aria-pressed="${!!m.starred}" aria-label="${m.starred ? "Unstar" : "Star"} message">${ICON.star}</button>
      </li>`).join("");
  }

  function renderReader() {
    const m = inbox.list().find((x) => x.id === ui.openId);
    const reader = $("#reader");
    if (!m) {
      reader.classList.add("reader-empty");
      reader.innerHTML = `
        <div>
          <div class="reader-empty-icon" aria-hidden="true">✉️</div>
          <h2>Select a message</h2>
          <p class="muted">Choose a message from the list to read it here.</p>
        </div>`;
      return;
    }
    reader.classList.remove("reader-empty");
    reader.innerHTML = `
      <button class="btn btn-ghost btn-sm reader-back" data-r="back" data-fk="r-back">${ICON.back} Back to inbox</button>
      <header class="reader-head">
        <span class="chip">${escapeHTML(m.category)}</span>
        <h2 id="readerTitle" tabindex="-1">${escapeHTML(m.subject)}</h2>
        <div class="reader-meta">
          <span class="avatar-sm" style="--av:${SENDER_AV[m.from] || SENDER_AV["BDAI Events Team"]}" aria-hidden="true">${senderInitials(m.from)}</span>
          <div><b>${escapeHTML(m.from)}</b><small class="muted">${fullDate(m.date)}</small></div>
        </div>
      </header>
      <div class="reader-body">${paragraphs(m.body)}</div>
      ${m.cta ? `<a class="btn btn-primary" href="${escapeHTML(m.cta.href)}">${escapeHTML(m.cta.label)}</a>` : ""}
      <div class="reader-actions">
        <button class="btn btn-ghost btn-sm${m.starred ? " is-on" : ""}" data-r="star" data-fk="r-star" aria-pressed="${!!m.starred}">${ICON.star} ${m.starred ? "Starred" : "Star"}</button>
        <button class="btn btn-ghost btn-sm" data-r="unread" data-fk="r-unread">${ICON.mail} Mark as unread</button>
        <button class="btn btn-ghost btn-sm" data-r="delete" data-fk="r-delete">${ICON.trash} Delete</button>
      </div>`;
  }

  /* ---------- interactions ---------- */
  function openMessage(id) {
    ui.openId = id;
    const m = inbox.list().find((x) => x.id === id);
    if (m && !m.read) inbox.update(id, { read: true }); // triggers a re-render
    else { renderList(); renderReader(); }
    // On phones the reader replaces the list, so bring it into view.
    if (window.matchMedia("(max-width: 720px)").matches) $("#inboxGrid").scrollIntoView({ block: "start" });
    $("#readerTitle")?.focus({ preventScroll: true });
  }

  function onFolderClick(e) {
    const b = e.target.closest("[data-folder]");
    if (!b) return;
    ui.folder = b.dataset.folder;
    renderFolders();
    renderList();
  }

  function onListClick(e) {
    const star = e.target.closest("[data-star]");
    if (star) {
      const m = inbox.list().find((x) => x.id === star.dataset.star);
      inbox.update(m.id, { starred: !m.starred });
      return;
    }
    const open = e.target.closest(".mail-open");
    if (open) openMessage(open.dataset.id);
  }

  // Up/Down arrows move between messages in the list.
  function onListKeys(e) {
    if (!["ArrowDown", "ArrowUp"].includes(e.key) || !e.target.closest(".mail-open")) return;
    const items = $$(".mail-open", $("#mailList"));
    const i = items.indexOf(e.target.closest(".mail-open"));
    const next = items[i + (e.key === "ArrowDown" ? 1 : -1)];
    if (next) { e.preventDefault(); next.focus(); }
  }

  function onReaderClick(e) {
    const action = e.target.closest("[data-r]")?.dataset.r;
    if (!action) return;
    const id = ui.openId;
    const m = inbox.list().find((x) => x.id === id);
    if (action === "back") {
      ui.openId = null;
      renderList(); renderReader();
      $(`[data-fk="open-${id}"]`)?.focus();
    } else if (action === "star") {
      inbox.update(id, { starred: !m.starred });
    } else if (action === "unread") {
      ui.openId = null;
      inbox.update(id, { read: false });
      toast("Marked as unread", "🔵");
    } else if (action === "delete") {
      ui.openId = null;
      const removed = inbox.remove(id);
      toast("Message deleted", "🗑️", { action: { label: "Undo", onClick: () => inbox.restore(removed) } });
    }
  }

  function onProfileChange(e) {
    if (e.target.id !== "subSwitch") return;
    const on = e.target.checked;
    account.setSubscribed(on);
    toast(on ? "Subscribed! New drops will arrive here" : "Unsubscribed from the monthly drop", on ? "📬" : "👋");
  }

  let disarmTimer;
  function onProfileClick(e) {
    if (!e.target.closest("#deleteAcc")) return;
    if (!ui.deleteArmed) { // two-step confirmation
      ui.deleteArmed = true;
      renderProfile(account.current());
      $("#deleteAcc").focus();
      clearTimeout(disarmTimer);
      disarmTimer = setTimeout(() => {
        ui.deleteArmed = false;
        if (account.current()) renderProfile(account.current());
      }, 4000);
      return;
    }
    clearTimeout(disarmTimer);
    account.deleteAccount();
    toast("Your account and inbox were deleted", "🗑️");
  }

  /* ---------- init ---------- */
  $("#year").textContent = new Date().getFullYear();
  onChange(render);
  render();
  setInterval(() => { if ($("#mailList")) renderList(); }, 60 * 1000); // keep "5 min ago" fresh
})();
