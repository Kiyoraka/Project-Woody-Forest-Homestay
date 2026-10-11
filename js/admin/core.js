/* ==========================================================================
   Woody Forest Homestay - admin/core.js
   Owner dashboard core: auth guard, hash router, sidebar/topbar, drawer,
   badges, shared helpers and the renderers registry. The views live in
   admin/view-*.js and register themselves on window.Admin.
   Load order: ui.js, store.js, charts.js, admin/core.js, admin/view-*.js
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
    const pill = qs("#adminNavPill");
    if (pill) pill.style.transform = `translateX(${Math.max(0, Object.keys(VIEWS).indexOf(key)) * 100}%)`;
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

  function bookingRow(b, { showStatus = true, action = "View", compact = false } = {}) {
    if (compact) {
      return `
        <a class="row-item row-item--compact" href="#booking/${esc(b.ref)}">
          <div class="row-item__body">
            <span class="row-item__title">${UI.fmtRange(b.checkIn, b.checkOut)}</span>
            <span class="row-item__sub">${esc(b.ref)} · ${UI.plural(b.nights, "night")} · ${UI.plural(b.guests, "guest")}</span>
          </div>
          <div class="row-item__end">
            <span>${UI.fmtRM(b.total)}</span>
            <span class="status status--${esc(b.status)}">${esc(b.status.toLowerCase())}</span>
          </div>
        </a>`;
    }
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

  function whatsapp(phone, text) {
    return `https://wa.me/${Store.digitsOnly(phone).replace(/^0/, "60")}?text=${encodeURIComponent(text)}`;
  }

  // shared surface for the view modules (admin/view-*.js)
  window.Admin = { VIEWS, renderers, refreshBadges, showView, closeDrawer, ICON, initials, emptyState, bookingRow, whatsapp, onBoot: [] };

  /* --------------------------------------------------------------- boot */
  UI.ready(async () => {
    Store.assetBase = "../"; // dashboard lives in admin/, seeded photo paths are site-root relative
    await Store.init();
    if (!requireAuth()) return;
    initUser();
    initDrawer();
    Admin.onBoot.forEach((fn) => fn());
    refreshBadges();
    initRouter();
    window.addEventListener("store:change", () => {
      refreshBadges();
      if (currentView && renderers[currentView]) renderers[currentView](qs(`#view-${currentView}`));
    });
    window.addEventListener("store:error", () => UI.toast("Storage is full - remove some photos or receipts", "error", 5000));
  });

})();
