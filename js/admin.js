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
