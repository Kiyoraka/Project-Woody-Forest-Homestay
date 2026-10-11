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

  /* --------------------------------------------------------- Booking view */
  const bookingState = { filter: "ALL", query: "" };
  const STATUS_FILTERS = ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "REJECTED", "CANCELLED"];

  function whatsapp(phone, text) {
    return `https://wa.me/${Store.digitsOnly(phone).replace(/^0/, "60")}?text=${encodeURIComponent(text)}`;
  }

  function filteredBookings() {
    const q = bookingState.query.trim().toLowerCase();
    const qDigits = Store.digitsOnly(q);
    return Store.getBookings()
      .filter((b) => bookingState.filter === "ALL" || b.status === bookingState.filter)
      .filter((b) => {
        if (!q) return true;
        return (
          b.ref.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q) ||
          (qDigits && Store.digitsOnly(b.phone).includes(qDigits)) ||
          (b.email || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // pending first, then nearest check-in first
        const pa = a.status === "PENDING" ? 0 : 1;
        const pb = b.status === "PENDING" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return b.checkIn.localeCompare(a.checkIn);
      });
  }

  function bookingTableRow(b) {
    return `
      <tr class="is-clickable" data-ref="${esc(b.ref)}">
        <td><span class="ref">${esc(b.ref)}</span><span class="cell-sub">${UI.fmtDate(b.createdAt.slice(0, 10), { year: false })}</span></td>
        <td><span class="cell-main">${esc(b.name)}</span><span class="cell-sub">${esc(b.phone)}</span></td>
        <td><span class="cell-main">${UI.fmtRange(b.checkIn, b.checkOut)}</span><span class="cell-sub">${UI.plural(b.nights, "night")}</span></td>
        <td class="num">${b.guests}</td>
        <td class="num"><span class="cell-main">${UI.fmtRM(b.total)}</span></td>
        <td><span class="status status--${esc(b.status)}">${esc(b.status.toLowerCase())}</span></td>
        <td class="num"><button class="btn btn--outline btn--sm" data-open="${esc(b.ref)}">View</button></td>
      </tr>`;
  }

  renderers.booking = function (root) {
    const counts = Store.statusSplit();
    const all = Store.getBookings().length;
    const rows = filteredBookings();
    root.innerHTML = `
      <div class="view-head">
        <div>
          <h2 class="h2">Bookings</h2>
          <p>Open a booking to check the receipt and confirm or reject it.</p>
        </div>
      </div>
      <div class="toolbar">
        <div class="seg" role="tablist" aria-label="Filter by status">
          ${STATUS_FILTERS.map((s) => {
            const n = s === "ALL" ? all : counts[s] || 0;
            return `<button class="seg__btn ${bookingState.filter === s ? "is-active" : ""}" data-filter="${s}" role="tab" aria-selected="${bookingState.filter === s}">${s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()} <span class="muted">${n}</span></button>`;
          }).join("")}
        </div>
        <label class="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input class="input" type="search" placeholder="Search ref, name, phone" value="${esc(bookingState.query)}" data-search aria-label="Search bookings">
        </label>
      </div>
      ${rows.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Ref</th><th>Guest</th><th>Dates</th><th class="num">Pax</th><th class="num">Total</th><th>Status</th><th></th></tr></thead>
            <tbody>${rows.map(bookingTableRow).join("")}</tbody>
          </table>
        </div>` : `<div class="card">${emptyState(bookingState.query ? "No bookings match that search." : "No bookings in this list yet.")}</div>`}`;

    qsa("[data-filter]", root).forEach((btn) =>
      btn.addEventListener("click", () => {
        bookingState.filter = btn.dataset.filter;
        renderers.booking(root);
      })
    );
    const search = qs("[data-search]", root);
    search.addEventListener(
      "input",
      UI.debounce(() => {
        bookingState.query = search.value;
        const pos = search.selectionStart;
        renderers.booking(root);
        const fresh = qs("[data-search]", root);
        fresh.focus();
        fresh.setSelectionRange(pos, pos);
      }, 180)
    );
    root.addEventListener("click", (e) => {
      const open = e.target.closest("[data-open]");
      const row = e.target.closest("tr[data-ref]");
      if (open) openBooking(open.dataset.open);
      else if (row) openBooking(row.dataset.ref);
    });

    // deep link: #booking/WF-2026-0001
    const ref = (location.hash.split("/")[1] || "").toUpperCase();
    if (ref && Store.getBooking(ref)) openBooking(ref);
  };

  /* --------------------------------------------------------- Booking modal */
  function historyList(b) {
    const items = (b.history || []).slice().reverse();
    if (!items.length) return "";
    return `<ul class="history">${items
      .map((h) => `<li><span>${UI.fmtDateTime(h.at)}</span><span>${esc(h.status.charAt(0) + h.status.slice(1).toLowerCase())} by ${esc(h.by)}${h.note ? ` - ${esc(h.note)}` : ""}</span></li>`)
      .join("")}</ul>`;
  }

  function openBooking(ref) {
    const b = Store.getBooking(ref);
    if (!b) return;
    const nightsText = b.breakdown && b.breakdown.nights
      ? Object.entries(
          b.breakdown.nights.reduce((acc, n) => {
            acc[n.kind] = (acc[n.kind] || 0) + 1;
            return acc;
          }, {})
        )
          .map(([k, n]) => `${n} ${k}`)
          .join(", ")
      : UI.plural(b.nights, "night");

    qs("#bookingModalTitle").innerHTML = `${esc(b.ref)} <span class="status status--${esc(b.status)}" style="margin-left:8px">${esc(b.status.toLowerCase())}</span>`;
    qs("#bookingModalSub").textContent = `Booked ${UI.fmtDateTime(b.createdAt)}`;
    qs("#bookingModalBody").innerHTML = `
      <div class="booking-detail">
        <div class="stack">
          <div class="detail-grid">
            <div class="detail-cell detail-cell--wide"><span>Guest</span>${esc(b.name)}</div>
            <div class="detail-cell"><span>Phone</span><a href="${whatsapp(b.phone, `Hi ${b.name}, about your booking ${b.ref} at Woody Forest Homestay`)}" target="_blank" rel="noopener">${esc(b.phone)}</a></div>
            <div class="detail-cell"><span>Email</span>${b.email ? `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>` : "--"}</div>
            <div class="detail-cell"><span>Check-in</span>${UI.fmtDate(b.checkIn, { weekday: true })}</div>
            <div class="detail-cell"><span>Check-out</span>${UI.fmtDate(b.checkOut, { weekday: true })}</div>
            <div class="detail-cell"><span>Stay</span>${UI.plural(b.nights, "night")} · ${UI.plural(b.guests, "guest")}<span class="cell-sub" style="text-transform:none;letter-spacing:0;font-weight:500">${esc(nightsText)}${b.breakdown ? ` + cleaning ${UI.fmtRM(b.breakdown.cleaningFee)}` : ""}</span></div>
            <div class="detail-cell"><span>Total to verify</span><strong style="font-size:1.25rem;color:var(--forest-700)">${UI.fmtRM(b.total)}</strong></div>
          </div>
          ${b.status === "PENDING" || b.status === "CONFIRMED" ? `
          <div class="field">
            <label class="label" for="bookingNote">Note to guest <span class="optional">(shown on their tracking page)</span></label>
            <textarea class="textarea" id="bookingNote" rows="2" placeholder="e.g. Transfer received, see you on Friday! / Amount did not match the total.">${esc(b.note || "")}</textarea>
          </div>` : b.note ? `<div class="detail-cell detail-cell--wide"><span>Note to guest</span>${esc(b.note)}</div>` : ""}
          ${historyList(b)}
        </div>
        <div class="stack">
          <div class="label">Transfer receipt</div>
          ${b.receipt ? `
            <div class="receipt-thumb" data-zoom>
              <img src="${esc(b.receipt)}" alt="Transfer receipt for ${esc(b.ref)}">
              <div class="receipt-thumb__hint">Click to enlarge</div>
            </div>` : `<div class="empty">${ICON.empty}<p>No receipt attached</p></div>`}
          <a class="btn btn--ghost btn--sm" href="${whatsapp(b.phone, `Hi ${b.name}, this is Woody Forest Homestay about booking ${b.ref}.`)}" target="_blank" rel="noopener">WhatsApp guest</a>
        </div>
      </div>`;

    const foot = qs("#bookingModalFoot");
    if (b.status === "PENDING") {
      foot.innerHTML = `
        <button class="btn btn--ghost" data-action="CANCELLED">Cancel booking</button>
        <button class="btn btn--danger" data-action="REJECTED">Reject</button>
        <button class="btn btn--primary" data-action="CONFIRMED">Confirm booking</button>`;
    } else if (b.status === "CONFIRMED") {
      foot.innerHTML = `
        <button class="btn btn--ghost" data-close>Close</button>
        <button class="btn btn--outline" data-action="NOTE">Save note</button>
        <button class="btn btn--danger" data-action="CANCELLED">Cancel booking</button>`;
    } else {
      foot.innerHTML = `<button class="btn btn--primary" data-close>Close</button>`;
    }

    qsa("[data-action]", foot).forEach((btn) =>
      btn.addEventListener("click", async () => {
        const note = (qs("#bookingNote") || {}).value || "";
        const action = btn.dataset.action;
        if (action === "NOTE") {
          Store.updateBooking(b.ref, { note: note.trim() });
          UI.toast("Note saved", "success");
          return;
        }
        if (action !== "CONFIRMED") {
          const ok = await UI.confirm({
            title: action === "REJECTED" ? "Reject this booking?" : "Cancel this booking?",
            message: `${b.name}'s dates (${UI.fmtRange(b.checkIn, b.checkOut)}) will be released. The guest will see this on their tracking page.`,
            okText: action === "REJECTED" ? "Reject" : "Cancel booking",
            danger: true
          });
          if (!ok) return;
        }
        // close first: the status write re-renders the view, and the deep link must not re-open the modal
        UI.modalClose("#bookingModal");
        Store.setBookingStatus(b.ref, action, note.trim());
        UI.toast(
          action === "CONFIRMED" ? `${b.ref} confirmed` : action === "REJECTED" ? `${b.ref} rejected` : `${b.ref} cancelled`,
          action === "CONFIRMED" ? "success" : "warning"
        );
      })
    );
    const thumb = qs("[data-zoom]", qs("#bookingModalBody"));
    if (thumb) thumb.addEventListener("click", () => openReceiptZoom(b.receipt));
    UI.modalOpen("#bookingModal");
    if (location.hash.startsWith("#booking") && !location.hash.includes(`/${b.ref}`)) history.replaceState(null, "", `#booking/${b.ref}`);
  }

  function openReceiptZoom(src) {
    qs("#receiptZoomImg").src = src;
    qs("#receiptZoom").classList.add("is-open");
    qs("#receiptZoom").setAttribute("aria-hidden", "false");
  }

  function closeReceiptZoom() {
    qs("#receiptZoom").classList.remove("is-open");
    qs("#receiptZoom").setAttribute("aria-hidden", "true");
  }

  function initBookingModal() {
    qs("#receiptZoomClose").addEventListener("click", closeReceiptZoom);
    qs("#receiptZoom").addEventListener("click", (e) => {
      if (e.target.id === "receiptZoom") closeReceiptZoom();
    });
    // capture phase + stopPropagation: Escape closes the zoom only, not the modal beneath it
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape" && qs("#receiptZoom").classList.contains("is-open")) {
          e.stopPropagation();
          closeReceiptZoom();
        }
      },
      true
    );
    qs("#bookingModal").addEventListener("modal:close", () => {
      if (location.hash.startsWith("#booking/")) history.replaceState(null, "", "#booking");
    });
  }

  /* -------------------------------------------------------- Customer view */
  const customerState = { query: "", openId: null };

  function filteredCustomers() {
    const q = customerState.query.trim().toLowerCase();
    const qDigits = Store.digitsOnly(q);
    return Store.getCustomers().filter((c) => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (qDigits && c.id.includes(qDigits)) || (c.email || "").toLowerCase().includes(q);
    });
  }

  renderers.customer = function (root) {
    const customers = filteredCustomers();
    const total = Store.getCustomers().length;
    root.innerHTML = `
      <div class="view-head">
        <div>
          <h2 class="h2">Customers</h2>
          <p>${UI.plural(total, "guest")} have booked with you. Open one to see their history.</p>
        </div>
      </div>
      <div class="toolbar">
        <span class="chip">${UI.plural(customers.length, "shown", "shown")}</span>
        <label class="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input class="input" type="search" placeholder="Search name, phone, email" value="${esc(customerState.query)}" data-search aria-label="Search customers">
        </label>
      </div>
      ${customers.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Customer</th><th>Phone</th><th class="num">Stays</th><th class="num">Total spent</th><th>Last stay</th><th class="num">Bookings</th></tr></thead>
            <tbody>${customers
              .map(
                (c) => `
                <tr class="is-clickable" data-customer="${esc(c.id)}">
                  <td><span class="cell-main">${esc(c.name)}</span><span class="cell-sub">${esc(c.email || "no email")}</span></td>
                  <td>${esc(c.phone)}</td>
                  <td class="num">${c.stays}</td>
                  <td class="num"><span class="cell-main">${UI.fmtRM(c.totalSpent)}</span></td>
                  <td>${c.lastStay ? UI.fmtDate(c.lastStay) : "--"}</td>
                  <td class="num">${c.bookings.length}</td>
                </tr>`
              )
              .join("")}</tbody>
          </table>
        </div>` : `<div class="card">${emptyState(customerState.query ? "No customers match that search." : "No customers yet.")}</div>`}`;

    const search = qs("[data-search]", root);
    search.addEventListener(
      "input",
      UI.debounce(() => {
        customerState.query = search.value;
        const pos = search.selectionStart;
        renderers.customer(root);
        const fresh = qs("[data-search]", root);
        fresh.focus();
        fresh.setSelectionRange(pos, pos);
      }, 180)
    );
    root.addEventListener("click", (e) => {
      const row = e.target.closest("tr[data-customer]");
      if (row) openCustomer(row.dataset.customer);
    });
  };

  function ensureSidePanel() {
    if (qs("#customerPanel")) return;
    document.body.appendChild(el('<div class="side-panel__scrim" id="customerScrim"></div>'));
    document.body.appendChild(
      el(`
      <aside class="side-panel" id="customerPanel" aria-label="Customer details">
        <div class="side-panel__head" id="customerPanelHead"></div>
        <div class="side-panel__body" id="customerPanelBody"></div>
      </aside>`)
    );
    qs("#customerScrim").addEventListener("click", closeCustomer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && qs("#customerPanel").classList.contains("is-open")) closeCustomer();
    });
    // a booking link inside the panel navigates to the booking view; close the panel on the way
    qs("#customerPanel").addEventListener("click", (e) => {
      if (e.target.closest('a[href^="#booking/"]')) closeCustomer();
    });
  }

  function openCustomer(id) {
    const c = Store.getCustomers().find((x) => x.id === id);
    if (!c) return;
    ensureSidePanel();
    customerState.openId = id;
    const history = c.bookings.slice().sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    const firstSeen = c.firstSeen ? UI.fmtDate(c.firstSeen.slice(0, 10)) : "--";
    qs("#customerPanelHead").innerHTML = `
      <div class="side-panel__avatar">${esc(initials(c.name))}</div>
      <div>
        <div class="side-panel__name">${esc(c.name)}</div>
        <div class="small muted">Guest since ${esc(firstSeen)}</div>
      </div>
      <button class="btn btn--icon btn--ghost" id="customerPanelClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>`;
    qs("#customerPanelBody").innerHTML = `
      <div class="side-panel__stats">
        <div class="side-panel__stat"><strong>${c.stays}</strong><span>Stays</span></div>
        <div class="side-panel__stat"><strong>${UI.fmtRM(c.totalSpent).replace("RM ", "")}</strong><span>RM spent</span></div>
        <div class="side-panel__stat"><strong>${c.bookings.length}</strong><span>Bookings</span></div>
      </div>
      <div class="contact-list">
        <a href="${whatsapp(c.phone, `Hi ${c.name}, this is Woody Forest Homestay.`)}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
          ${esc(c.phone)} · WhatsApp
        </a>
        ${c.email ? `<a href="mailto:${esc(c.email)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>${esc(c.email)}</a>` : ""}
      </div>
      <div>
        <div class="panel__head" style="margin-bottom:8px"><h3 class="panel__title">Booking history</h3></div>
        <div class="row-list">${history.map((b) => bookingRow(b, { compact: true })).join("")}</div>
      </div>`;
    qs("#customerPanelClose").addEventListener("click", closeCustomer);
    qs("#customerPanel").classList.add("is-open");
    qs("#customerScrim").classList.add("is-open");
  }

  function closeCustomer() {
    customerState.openId = null;
    const panel = qs("#customerPanel");
    if (!panel) return;
    panel.classList.remove("is-open");
    qs("#customerScrim").classList.remove("is-open");
  }

  /* --------------------------------------------------------------- boot */
  UI.ready(async () => {
    await Store.init();
    if (!requireAuth()) return;
    initUser();
    initDrawer();
    initBookingModal();
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
