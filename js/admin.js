/* ==========================================================================
   Woody Forest Homestay - admin.js
   Owner dashboard: auth guard, hash router, sidebar/topbar, and the
   Main / Booking / Customer / Setting views. Analysis is drawn by charts.js.
   Requires ui.js + store.js (+ charts.js for the Analysis view).
   ========================================================================== */
(function () {
  "use strict";

  const { qs, qsa, esc, el } = UI;

  const VIEWS = {
    main: { title: "Main" },
    analysis: { title: "Analysis" },
    booking: { title: "Booking" },
    customer: { title: "Customer" },
    setting: { title: "Setting" }
  };

  /* --------------------------------------------------------------- auth */
  function requireAuth() {
    if (!Store.isAuthed()) {
      location.replace("login.html");
      return false;
    }
    return true;
  }

  function initUser() {
    const name = Store.currentUser() || "Owner";
    qs("#userName").textContent = name;
    qs("#userAvatar").textContent = name.charAt(0).toUpperCase();
    qs("#topbarDate").textContent = new Date().toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    qs("#logoutBtn").addEventListener("click", async () => {
      const ok = await UI.confirm({ title: "Log out?", message: "You will need your password to sign in again.", okText: "Log out" });
      if (!ok) return;
      Store.logout();
      location.replace("login.html");
    });
  }

  /* ------------------------------------------------------------- router */
  let currentView = null;

  function viewFromHash() {
    const key = (location.hash || "#main").replace("#", "").split("/")[0];
    return VIEWS[key] ? key : "main";
  }

  function showView(key) {
    if (currentView === "analysis" && key !== "analysis" && window.Charts) Charts.destroy();
    currentView = key;
    qsa(".view").forEach((v) => {
      const active = v.dataset.view === key;
      v.classList.toggle("hidden", !active);
      if (active) {
        v.classList.remove("view");
        void v.offsetWidth; // restart the enter animation
        v.classList.add("view");
      }
    });
    qsa("[data-view]").forEach((a) => {
      if (a.classList.contains("view")) return;
      a.classList.toggle("is-active", a.dataset.view === key);
    });
    qs("#viewTitle").textContent = VIEWS[key].title;
    document.title = `${VIEWS[key].title} - Owner dashboard`;
    const renderer = renderers[key];
    if (renderer) renderer(qs(`#view-${key}`));
    qs("#content").scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "auto" });
    closeDrawer();
  }

  function initRouter() {
    window.addEventListener("hashchange", () => showView(viewFromHash()));
    showView(viewFromHash());
  }

  /* --------------------------------------------------------- drawer (mobile) */
  function openDrawer() {
    qs("#sidebar").classList.add("is-open");
    qs("#sidebarScrim").classList.add("is-open");
    qs("#menuBtn").setAttribute("aria-expanded", "true");
    document.body.classList.add("drawer-open");
  }

  function closeDrawer() {
    qs("#sidebar").classList.remove("is-open");
    qs("#sidebarScrim").classList.remove("is-open");
    qs("#menuBtn").setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-open");
  }

  function initDrawer() {
    qs("#menuBtn").addEventListener("click", () => (qs("#sidebar").classList.contains("is-open") ? closeDrawer() : openDrawer()));
    qs("#sidebarScrim").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  /* ---------------------------------------------------- shared indicators */
  function refreshBadges() {
    const pending = Store.kpis().pending;
    const badge = qs("#pendingBadge");
    badge.textContent = pending;
    badge.classList.toggle("hidden", pending === 0);
    qs("#topbarPending").textContent = `${pending} pending`;
  }

  /* ------------------------------------------------------------ views
     Each renderer receives its <section> and fills it. Added per task:
     main (Phase 5/3), booking + customer (Phase 6), setting (Phase 7). */
  const renderers = {
    analysis(root) {
      if (window.Charts) Charts.render(root, { months: 6 });
      else root.innerHTML = '<div class="empty"><p>Charts module not loaded.</p></div>';
    }
  };

  /* ------------------------------------------------------ shared helpers */
  const ICON = {
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 11h18M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M3 11v8m18-8v8M3 15h18"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M7 12h.01M17 12h.01"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M6 7v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>'
  };

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
  }

  function emptyState(text) {
    return `<div class="empty">${ICON.empty}<p>${esc(text)}</p></div>`;
  }

  function bookingRow(b, { showStatus = true, action = "View" } = {}) {
    return `
      <div class="row-item">
        <div class="row-item__avatar">${esc(initials(b.name))}</div>
        <div class="row-item__body">
          <span class="row-item__title">${esc(b.name)} <span class="muted">· ${esc(b.ref)}</span></span>
          <span class="row-item__sub">${UI.fmtRange(b.checkIn, b.checkOut)} · ${UI.plural(b.nights, "night")} · ${UI.plural(b.guests, "guest")}</span>
        </div>
        <div class="row-item__end">
          <span>${UI.fmtRM(b.total)}</span>
          ${showStatus ? `<span class="status status--${esc(b.status)}">${esc(b.status.toLowerCase())}</span>` : ""}
          <a class="btn btn--outline btn--sm" href="#booking/${esc(b.ref)}">${esc(action)}</a>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------ Main view */
  function miniCalendar() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const today = UI.todayISO();
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    const bookings = Store.getBookings();
    const confirmed = new Set();
    const pending = new Set();
    bookings.forEach((b) => {
      if (b.status === "CONFIRMED" || b.status === "COMPLETED") UI.eachDay(b.checkIn, b.checkOut).forEach((d) => confirmed.add(d));
      if (b.status === "PENDING") UI.eachDay(b.checkIn, b.checkOut).forEach((d) => pending.add(d));
    });
    const blocked = Store.blockedNights();
    let cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span class="mini-cal__dow">${d}</span>`).join("");
    for (let i = 0; i < lead; i++) cells += '<span class="mini-cal__day mini-cal__day--empty"></span>';
    for (let d = 1; d <= days; d++) {
      const iso = UI.toISO(new Date(y, m, d));
      const cls = ["mini-cal__day"];
      if (confirmed.has(iso)) cls.push("mini-cal__day--booked");
      else if (pending.has(iso)) cls.push("mini-cal__day--pending");
      else if (blocked.has(iso)) cls.push("mini-cal__day--blocked");
      if (iso < today) cls.push("mini-cal__day--past");
      if (iso === today) cls.push("mini-cal__day--today");
      cells += `<span class="${cls.join(" ")}" title="${UI.fmtDate(iso)}">${d}</span>`;
    }
    return `
      <div class="mini-cal">${cells}</div>
      <div class="mini-cal__legend">
        <span><i style="background:var(--forest-900)"></i>Confirmed</span>
        <span><i style="background:var(--warning-soft);border:1px solid var(--warning)"></i>Pending</span>
        <span><i style="background:repeating-linear-gradient(135deg,var(--cream-dark) 0 3px,var(--cream) 3px 6px)"></i>Blocked</span>
      </div>`;
  }

  renderers.main = function (root) {
    const k = Store.kpis();
    const month = new Date().toLocaleDateString("en-MY", { month: "long" });
    const stayingLabel = k.stayingNow ? `${UI.plural(k.stayingNow, "guest party", "guest parties")} staying now` : "Nobody checked in right now";
    root.innerHTML = `
      <div class="view-head">
        <div>
          <h2 class="h2">Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}</h2>
          <p>Here is how the homestay looks today.</p>
        </div>
        <a class="btn btn--primary" href="#booking">Review bookings</a>
      </div>

      <div class="kpis">
        <div class="kpi kpi--warning">
          <span class="kpi__label">${ICON.clock} Pending confirmation</span>
          <span class="kpi__value" data-count="${k.pending}">0</span>
          <span class="kpi__sub">${k.pending ? "Receipts waiting for your check" : "All caught up"}</span>
        </div>
        <div class="kpi kpi--info">
          <span class="kpi__label">${ICON.key} Check-ins today</span>
          <span class="kpi__value" data-count="${k.checkInsToday}">0</span>
          <span class="kpi__sub">${esc(stayingLabel)}</span>
        </div>
        <div class="kpi">
          <span class="kpi__label">${ICON.bed} Occupancy · ${esc(month)}</span>
          <span class="kpi__value" data-count="${k.occupancy}" data-suffix="%">0%</span>
          <span class="kpi__sub">Confirmed nights this month</span>
        </div>
        <div class="kpi kpi--wood">
          <span class="kpi__label">${ICON.cash} Revenue · ${esc(month)}</span>
          <span class="kpi__value" data-count="${k.revenue}" data-prefix="RM ">RM 0</span>
          <span class="kpi__sub">Confirmed stays checking in this month</span>
        </div>
      </div>

      <div class="panel-grid">
        <section class="card card--pad panel">
          <div class="panel__head">
            <h3 class="panel__title">Needs confirmation</h3>
            <span class="chip chip--warning">${UI.plural(k.needsConfirmation.length, "booking")}</span>
          </div>
          <div class="row-list">
            ${k.needsConfirmation.length ? k.needsConfirmation.map((b) => bookingRow(b, { showStatus: false, action: "Check receipt" })).join("") : emptyState("No receipts waiting. Enjoy the quiet.")}
          </div>
        </section>

        <div class="panel">
          <section class="card card--pad panel">
            <div class="panel__head">
              <h3 class="panel__title">Upcoming check-ins</h3>
              <span class="chip">Next 30 days</span>
            </div>
            <div class="row-list">
              ${k.upcoming.length ? k.upcoming.slice(0, 5).map((b) => `
                <div class="row-item">
                  <div class="row-item__avatar row-item__avatar--date"><span>${UI.parseISO(b.checkIn).getDate()}</span><small>${UI.parseISO(b.checkIn).toLocaleDateString("en-MY", { month: "short" })}</small></div>
                  <div class="row-item__body">
                    <span class="row-item__title">${esc(b.name)}</span>
                    <span class="row-item__sub">${UI.plural(b.nights, "night")} · ${UI.plural(b.guests, "guest")} · ${esc(b.ref)}</span>
                  </div>
                  <div class="row-item__end"><a class="btn btn--ghost btn--sm" href="#booking/${esc(b.ref)}">Open</a></div>
                </div>`).join("") : emptyState("No confirmed arrivals in the next 30 days.")}
            </div>
          </section>

          <section class="card card--pad panel">
            <div class="panel__head">
              <h3 class="panel__title">${esc(new Date().toLocaleDateString("en-MY", { month: "long", year: "numeric" }))}</h3>
              <a class="btn btn--ghost btn--sm" href="#setting/pricing">Block dates</a>
            </div>
            ${miniCalendar()}
          </section>
        </div>
      </div>`;

    qsa("[data-count]", root).forEach((node) =>
      UI.countUp(node, Number(node.dataset.count), { prefix: node.dataset.prefix || "", suffix: node.dataset.suffix || "", duration: 900 })
    );
  };

  /* --------------------------------------------------------------- boot */
  UI.ready(async () => {
    await Store.init();
    if (!requireAuth()) return;
    initUser();
    initDrawer();
    refreshBadges();
    initRouter();
    window.addEventListener("store:change", () => {
      refreshBadges();
      if (currentView && renderers[currentView]) renderers[currentView](qs(`#view-${currentView}`));
    });
    window.addEventListener("store:error", () => UI.toast("Storage is full - remove some photos or receipts", "error", 5000));
  });

  // exposed for the view modules appended below
  window.Admin = { renderers, refreshBadges, showView };
})();
