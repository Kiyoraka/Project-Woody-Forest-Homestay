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
        <td data-label="Ref"><span class="ref">${esc(b.ref)}</span><span class="cell-sub">${UI.fmtDate(b.createdAt.slice(0, 10), { year: false })}</span></td>
        <td data-label="Guest"><span class="cell-main">${esc(b.name)}</span><span class="cell-sub">${esc(b.phone)}</span></td>
        <td data-label="Dates"><span class="cell-main">${UI.fmtRange(b.checkIn, b.checkOut)}</span><span class="cell-sub">${UI.plural(b.nights, "night")}</span></td>
        <td class="num" data-label="Pax">${b.guests}</td>
        <td class="num" data-label="Total"><span class="cell-main">${UI.fmtRM(b.total)}</span></td>
        <td data-label="Status"><span class="status status--${esc(b.status)}">${esc(b.status.toLowerCase())}</span></td>
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
                  <td data-label="Customer"><span class="cell-main">${esc(c.name)}</span><span class="cell-sub">${esc(c.email || "no email")}</span></td>
                  <td data-label="Phone">${esc(c.phone)}</td>
                  <td class="num" data-label="Stays">${c.stays}</td>
                  <td class="num" data-label="Total spent"><span class="cell-main">${UI.fmtRM(c.totalSpent)}</span></td>
                  <td data-label="Last stay">${c.lastStay ? UI.fmtDate(c.lastStay) : "--"}</td>
                  <td class="num" data-label="Bookings">${c.bookings.length}</td>
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

  /* --------------------------------------------------------- Setting view */
  const SETTING_TABS = [
    { key: "homestay", label: "Homestay" },
    { key: "pricing", label: "Pricing" },
    { key: "images", label: "Images" },
    { key: "bank", label: "Bank" },
    { key: "account", label: "Account" }
  ];
  const AMENITY_ICON_KEYS = ["wifi", "car", "bbq", "kitchen", "ac", "deck", "river", "pet", "default"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const settingState = { tab: "homestay", draft: null };

  function field(label, inputHTML, hint) {
    return `<div class="field"><label class="label">${label}</label>${inputHTML}${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  }

  function input(name, value, { type = "text", placeholder = "", min, step, required = true } = {}) {
    return `<input class="input" type="${type}" name="${name}" value="${esc(value ?? "")}" placeholder="${esc(placeholder)}" ${min !== undefined ? `min="${min}"` : ""} ${step !== undefined ? `step="${step}"` : ""} ${required ? "required" : ""}>`;
  }

  function readForm(form) {
    const data = {};
    new FormData(form).forEach((v, k) => (data[k] = v));
    return data;
  }

  function settingsTabHTML(tab, s) {
    const d = settingState.draft;
    switch (tab) {
      case "homestay":
        return `
          <form class="settings-form" data-tab-form="homestay">
            <div class="form-grid form-grid--2">
              ${field("Homestay name", input("name", s.name))}
              ${field("Tagline", input("tagline", s.tagline))}
            </div>
            ${field("Description", `<textarea class="textarea" name="description" rows="4" required>${esc(s.description)}</textarea>`, "Shown in the About section of the website.")}
            <div class="form-grid form-grid--2">
              ${field("Address", input("address", s.address))}
              ${field("WhatsApp number", input("whatsapp", s.whatsapp, { placeholder: "60129876543" }), "Country code first, digits only.")}
              ${field("Email", input("email", s.email, { type: "email" }))}
              ${field("Max guests", input("maxGuests", s.maxGuests, { type: "number", min: 1 }))}
              ${field("Bedrooms", input("bedrooms", s.bedrooms, { type: "number", min: 1 }))}
              ${field("Bathrooms", input("bathrooms", s.bathrooms, { type: "number", min: 1 }))}
            </div>
            <div class="field">
              <span class="label">Amenities</span>
              <div class="range-list" data-amenities>
                ${d.amenities.map((a, i) => `
                  <div class="range-row" style="grid-template-columns:140px minmax(0,1fr) auto">
                    <select class="select" data-amenity-icon="${i}">${AMENITY_ICON_KEYS.map((k) => `<option value="${k}" ${a.icon === k ? "selected" : ""}>${k}</option>`).join("")}</select>
                    <input class="input" data-amenity-label="${i}" value="${esc(a.label)}" placeholder="Amenity">
                    <button type="button" class="btn btn--ghost btn--sm" data-remove-amenity="${i}" aria-label="Remove amenity">Remove</button>
                  </div>`).join("")}
              </div>
              <div><button type="button" class="btn btn--outline btn--sm" data-add-amenity>+ Add amenity</button></div>
            </div>
            <div class="settings-form__foot"><button class="btn btn--primary" type="submit">Save homestay</button></div>
          </form>`;
      case "pricing": {
        const p = s.pricing;
        return `
          <form class="settings-form" data-tab-form="pricing">
            <div class="form-grid form-grid--2">
              ${field("Weekday night (RM)", input("weekday", p.weekday, { type: "number", min: 0 }))}
              ${field("Weekend night (RM)", input("weekend", p.weekend, { type: "number", min: 0 }))}
              ${field("Cleaning fee per stay (RM)", input("cleaningFee", p.cleaningFee, { type: "number", min: 0 }))}
              ${field("Minimum nights", input("minNights", p.minNights, { type: "number", min: 1 }))}
            </div>
            <div class="field">
              <span class="label">Weekend nights</span>
              <div class="chips-edit">
                ${DOW.map((n, i) => `<label class="checkbox chip"><input type="checkbox" name="weekendNights" value="${i}" ${(p.weekendNights || []).includes(i) ? "checked" : ""}> ${n}</label>`).join("")}
              </div>
              <span class="hint">Kelantan weekend is Friday and Saturday night by default.</span>
            </div>
            <div class="field">
              <span class="label">Peak season rates</span>
              <div class="range-list">
                ${d.peakRanges.length ? d.peakRanges.map((r, i) => `
                  <div class="range-row">
                    <input class="input" data-peak="${i}" data-field="label" value="${esc(r.label)}" placeholder="Label (e.g. School holidays)">
                    <input class="input" type="date" data-peak="${i}" data-field="from" value="${esc(r.from)}">
                    <input class="input" type="date" data-peak="${i}" data-field="to" value="${esc(r.to)}">
                    <input class="input" type="number" min="0" data-peak="${i}" data-field="price" value="${esc(r.price)}" placeholder="RM">
                    <button type="button" class="btn btn--ghost btn--sm" data-remove-peak="${i}">Remove</button>
                  </div>`).join("") : '<span class="hint">No peak ranges. Nights fall back to weekday / weekend rates.</span>'}
              </div>
              <div><button type="button" class="btn btn--outline btn--sm" data-add-peak>+ Add peak range</button></div>
            </div>
            <div class="field">
              <span class="label">Blocked dates (owner use, maintenance)</span>
              <div class="range-list">
                ${d.blockedDates.length ? d.blockedDates.map((r, i) => `
                  <div class="range-row range-row--blocked">
                    <input class="input" type="date" data-block="${i}" data-field="from" value="${esc(r.from)}">
                    <input class="input" type="date" data-block="${i}" data-field="to" value="${esc(r.to)}">
                    <input class="input" data-block="${i}" data-field="reason" value="${esc(r.reason || "")}" placeholder="Reason (optional)">
                    <button type="button" class="btn btn--ghost btn--sm" data-remove-block="${i}">Remove</button>
                  </div>`).join("") : '<span class="hint">No blocked dates.</span>'}
              </div>
              <div><button type="button" class="btn btn--outline btn--sm" data-add-block>+ Block dates</button></div>
            </div>
            <div class="settings-form__foot"><button class="btn btn--primary" type="submit">Save pricing</button></div>
          </form>`;
      }
      case "images": {
        const images = Store.getImages();
        const kb = Math.round(Store.storageUsage() / 1024);
        return `
          <div class="settings-form" style="max-width:none">
            <p class="muted small">The first photo marked as hero leads the slider on the website. Drag tiles to reorder. Photos are stored in this browser (${kb} KB used of roughly 5,000 KB).</p>
            <div class="image-grid" data-images>
              ${images.map((img) => `
                <div class="image-tile ${img.isHero ? "is-hero" : ""}" draggable="true" data-image="${esc(img.id)}">
                  <img src="${esc(Store.imageUrl(img.src))}" alt="${esc(img.caption || "")}">
                  ${img.isHero ? '<span class="image-tile__hero-tag">Hero</span>' : ""}
                  <div class="image-tile__bar">
                    <button type="button" class="btn ${img.isHero ? "is-on" : ""}" data-hero="${esc(img.id)}" title="Set as hero" aria-label="Set as hero">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/></svg>
                    </button>
                    <button type="button" class="btn" data-caption="${esc(img.id)}" title="Edit caption" aria-label="Edit caption">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4"/></svg>
                    </button>
                    <button type="button" class="btn" data-remove-image="${esc(img.id)}" title="Remove photo" aria-label="Remove photo">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    </button>
                  </div>
                </div>`).join("")}
              <label class="image-add">
                <input type="file" accept="image/*" multiple class="sr-only" data-add-image>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Add photos
              </label>
            </div>
          </div>`;
      }
      case "bank":
        return `
          <form class="settings-form" data-tab-form="bank">
            <p class="muted small">Shown to guests at checkout so they can transfer the total.</p>
            <div class="form-grid form-grid--2">
              ${field("Bank name", input("bankName", s.bank.bankName))}
              ${field("Account holder", input("holder", s.bank.holder))}
            </div>
            ${field("Account number", input("accountNo", s.bank.accountNo))}
            <div class="settings-form__foot"><button class="btn btn--primary" type="submit">Save bank details</button></div>
          </form>`;
      case "account":
        return `
          <form class="settings-form" data-tab-form="account">
            ${field("Username", input("username", Store.currentUser() || "owner"))}
            <div class="form-grid form-grid--2">
              ${field("Current password", input("currentPassword", "", { type: "password", required: false }))}
              <div></div>
              ${field("New password", input("newPassword", "", { type: "password", required: false }), "At least 6 characters. Leave blank to keep the current one.")}
              ${field("Confirm new password", input("confirmPassword", "", { type: "password", required: false }))}
            </div>
            <div class="settings-form__foot">
              <button class="btn btn--primary" type="submit">Save account</button>
              <button class="btn btn--ghost" type="button" data-reset-demo>Reset demo data</button>
            </div>
          </form>`;
      default:
        return "";
    }
  }

  function loadDraft() {
    const s = Store.getSettings();
    settingState.draft = {
      amenities: structuredClone(s.amenities || []),
      peakRanges: structuredClone(s.pricing.peakRanges || []),
      blockedDates: structuredClone(s.blockedDates || [])
    };
  }

  function syncDraftFromDom(root) {
    const d = settingState.draft;
    qsa("[data-amenity-label]", root).forEach((el2) => (d.amenities[Number(el2.dataset.amenityLabel)].label = el2.value));
    qsa("[data-amenity-icon]", root).forEach((el2) => (d.amenities[Number(el2.dataset.amenityIcon)].icon = el2.value));
    qsa("[data-peak]", root).forEach((el2) => (d.peakRanges[Number(el2.dataset.peak)][el2.dataset.field] = el2.dataset.field === "price" ? Number(el2.value) : el2.value));
    qsa("[data-block]", root).forEach((el2) => (d.blockedDates[Number(el2.dataset.block)][el2.dataset.field] = el2.value));
  }

  renderers.setting = function (root) {
    const s = Store.getSettings();
    const sub = location.hash.split("/")[1];
    if (sub && SETTING_TABS.some((t) => t.key === sub)) settingState.tab = sub;
    if (!settingState.draft) loadDraft();
    root.innerHTML = `
      <div class="view-head">
        <div>
          <h2 class="h2">Settings</h2>
          <p>Everything the website shows comes from here.</p>
        </div>
      </div>
      <div class="tabs" role="tablist">
        ${SETTING_TABS.map((t) => `<button class="tab ${settingState.tab === t.key ? "is-active" : ""}" role="tab" data-tab="${t.key}" aria-selected="${settingState.tab === t.key}">${t.label}</button>`).join("")}
      </div>
      <div class="card card--pad view-enter" data-tab-panel>${settingsTabHTML(settingState.tab, s)}</div>`;

    qsa("[data-tab]", root).forEach((btn) =>
      btn.addEventListener("click", () => {
        settingState.tab = btn.dataset.tab;
        loadDraft();
        history.replaceState(null, "", `#setting/${settingState.tab}`);
        renderers.setting(root);
      })
    );
    bindSettingPanel(root);
  };

  function rerenderPanel(root) {
    qs("[data-tab-panel]", root).innerHTML = settingsTabHTML(settingState.tab, Store.getSettings());
    bindSettingPanel(root);
  }

  function bindSettingPanel(root) {
    const panel = qs("[data-tab-panel]", root);
    const form = qs("[data-tab-form]", panel);
    const d = settingState.draft;

    // draft row editors (amenities, peak ranges, blocked dates)
    panel.addEventListener("click", (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.hasAttribute("data-add-amenity")) { syncDraftFromDom(panel); d.amenities.push({ icon: "default", label: "" }); rerenderPanel(root); }
      if (t.hasAttribute("data-remove-amenity")) { syncDraftFromDom(panel); d.amenities.splice(Number(t.dataset.removeAmenity), 1); rerenderPanel(root); }
      if (t.hasAttribute("data-add-peak")) { syncDraftFromDom(panel); d.peakRanges.push({ id: "peak-" + Date.now(), label: "", from: "", to: "", price: Store.getSettings().pricing.weekend }); rerenderPanel(root); }
      if (t.hasAttribute("data-remove-peak")) { syncDraftFromDom(panel); d.peakRanges.splice(Number(t.dataset.removePeak), 1); rerenderPanel(root); }
      if (t.hasAttribute("data-add-block")) { syncDraftFromDom(panel); d.blockedDates.push({ id: "blk-" + Date.now(), from: "", to: "", reason: "" }); rerenderPanel(root); }
      if (t.hasAttribute("data-remove-block")) { syncDraftFromDom(panel); d.blockedDates.splice(Number(t.dataset.removeBlock), 1); rerenderPanel(root); }
    });

    if (form) form.addEventListener("submit", (e) => { e.preventDefault(); saveSettingTab(form.dataset.tabForm, form, panel); });
    if (settingState.tab === "images") bindImagesTab(panel, root);
    const reset = qs("[data-reset-demo]", panel);
    if (reset) reset.addEventListener("click", async () => {
      const ok = await UI.confirm({ title: "Reset demo data?", message: "All bookings, photos and settings in this browser go back to the sample data. You will be signed out.", okText: "Reset", danger: true });
      if (!ok) return;
      Store.resetAll();
      Store.logout();
      location.replace("login.html");
    });
  }

  async function saveSettingTab(tab, form, panel) {
    const data = readForm(form);
    syncDraftFromDom(panel);
    const d = settingState.draft;
    if (tab === "homestay") {
      const amenities = d.amenities.filter((a) => a.label.trim()).map((a) => ({ icon: a.icon, label: a.label.trim() }));
      Store.saveSettings({
        name: data.name.trim(), tagline: data.tagline.trim(), description: data.description.trim(), address: data.address.trim(),
        whatsapp: Store.digitsOnly(data.whatsapp), email: data.email.trim(),
        maxGuests: Number(data.maxGuests) || 1, bedrooms: Number(data.bedrooms) || 1, bathrooms: Number(data.bathrooms) || 1, amenities
      });
      UI.toast("Homestay details saved", "success");
    }
    if (tab === "pricing") {
      const bad = d.peakRanges.find((r) => !r.from || !r.to || r.to < r.from || !(Number(r.price) > 0));
      const badBlock = d.blockedDates.find((r) => !r.from || !r.to || r.to < r.from);
      if (bad) return UI.toast("Each peak range needs a start, an end after it, and a price", "error");
      if (badBlock) return UI.toast("Each blocked range needs a start and an end after it", "error");
      const weekendNights = Array.from(form.querySelectorAll('input[name="weekendNights"]:checked')).map((c) => Number(c.value));
      Store.saveSettings({
        pricing: {
          weekday: Number(data.weekday) || 0, weekend: Number(data.weekend) || 0, cleaningFee: Number(data.cleaningFee) || 0,
          minNights: Math.max(1, Number(data.minNights) || 1), weekendNights,
          peakRanges: d.peakRanges.map((r) => ({ ...r, label: r.label.trim() || "Peak season", price: Number(r.price) }))
        },
        blockedDates: d.blockedDates.map((r) => ({ ...r, reason: (r.reason || "").trim() }))
      });
      UI.toast("Pricing saved", "success");
    }
    if (tab === "bank") {
      Store.saveSettings({ bank: { bankName: data.bankName.trim(), accountNo: data.accountNo.trim(), holder: data.holder.trim() } });
      UI.toast("Bank details saved", "success");
    }
    if (tab === "account") {
      const username = data.username.trim();
      if (username !== Store.currentUser()) {
        if (!Store.changeUsername(username)) return UI.toast("Username needs at least 3 characters", "error");
        qs("#userName").textContent = username;
        qs("#userAvatar").textContent = username.charAt(0).toUpperCase();
      }
      if (data.newPassword) {
        if (data.newPassword !== data.confirmPassword) return UI.toast("New passwords do not match", "error");
        const r = await Store.changePassword(data.currentPassword, data.newPassword);
        if (!r.ok) return UI.toast(r.error, "error");
      }
      UI.toast("Account saved", "success");
      form.reset();
      qs('[name="username"]', form).value = username;
    }
    loadDraft();
  }

  function bindImagesTab(panel, root) {
    const grid = qs("[data-images]", panel);
    const saveImages = (images) => {
      Store.saveSettings({ images: images.map((img, i) => ({ ...img, order: i })) });
    };
    grid.addEventListener("click", async (e) => {
      const hero = e.target.closest("[data-hero]");
      const cap = e.target.closest("[data-caption]");
      const rem = e.target.closest("[data-remove-image]");
      if (hero) {
        saveImages(Store.getImages().map((img) => ({ ...img, isHero: img.id === hero.dataset.hero })));
        UI.toast("Hero photo updated", "success");
      }
      if (cap) {
        const img = Store.getImages().find((x) => x.id === cap.dataset.caption);
        const next = await captionDialog(img.caption || "");
        if (next === null) return;
        saveImages(Store.getImages().map((x) => (x.id === img.id ? { ...x, caption: next } : x)));
        UI.toast("Caption saved", "success");
      }
      if (rem) {
        const images = Store.getImages();
        if (images.length <= 1) return UI.toast("Keep at least one photo", "warning");
        const ok = await UI.confirm({ title: "Remove this photo?", message: "It disappears from the website immediately.", okText: "Remove", danger: true });
        if (!ok) return;
        const rest = images.filter((x) => x.id !== rem.dataset.removeImage);
        if (!rest.some((x) => x.isHero)) rest[0].isHero = true;
        saveImages(rest);
        UI.toast("Photo removed", "warning");
      }
    });
    qs("[data-add-image]", panel).addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const images = Store.getImages();
      let added = 0;
      for (const file of files) {
        try {
          const src = await Store.resizeImage(file, { maxPx: 1600, quality: 0.82 });
          images.push({ id: "img-" + Date.now() + "-" + added, src, caption: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), isHero: false, order: images.length });
          added += 1;
        } catch (err) {
          UI.toast(err.message, "error");
        }
      }
      if (added) {
        saveImages(images);
        UI.toast(UI.plural(added, "photo") + " added", "success");
      }
    });
    // drag to reorder
    let dragId = null;
    grid.addEventListener("dragstart", (e) => {
      const tile = e.target.closest(".image-tile");
      if (!tile) return;
      dragId = tile.dataset.image;
      tile.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    grid.addEventListener("dragover", (e) => {
      const tile = e.target.closest(".image-tile");
      if (!tile || !dragId) return;
      e.preventDefault();
      qsa(".image-tile.is-over", grid).forEach((t) => t.classList.remove("is-over"));
      tile.classList.add("is-over");
    });
    grid.addEventListener("dragleave", (e) => {
      const tile = e.target.closest(".image-tile");
      if (tile) tile.classList.remove("is-over");
    });
    grid.addEventListener("drop", (e) => {
      const tile = e.target.closest(".image-tile");
      if (!tile || !dragId || tile.dataset.image === dragId) return;
      e.preventDefault();
      const images = Store.getImages();
      const from = images.findIndex((x) => x.id === dragId);
      const to = images.findIndex((x) => x.id === tile.dataset.image);
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      saveImages(images);
      dragId = null;
    });
    grid.addEventListener("dragend", () => {
      dragId = null;
      qsa(".image-tile", grid).forEach((t) => t.classList.remove("is-dragging", "is-over"));
    });
  }

  function captionDialog(current) {
    return new Promise((resolve) => {
      const backdrop = el(`
        <div class="modal-backdrop">
          <div class="modal" role="dialog" aria-modal="true" style="width:min(100%,440px)">
            <div class="modal__head"><h3 class="h3">Photo caption</h3></div>
            <div class="modal__body"><input class="input" id="captionInput" value="${esc(current)}" placeholder="e.g. Master bedroom" autofocus></div>
            <div class="modal__foot">
              <button class="btn btn--ghost" data-role="cancel">Cancel</button>
              <button class="btn btn--primary" data-role="ok">Save</button>
            </div>
          </div>
        </div>`);
      document.body.appendChild(backdrop);
      const done = (v) => {
        UI.modalClose(backdrop);
        setTimeout(() => backdrop.remove(), 400);
        resolve(v);
      };
      qs('[data-role="ok"]', backdrop).addEventListener("click", () => done(qs("#captionInput", backdrop).value.trim()));
      qs('[data-role="cancel"]', backdrop).addEventListener("click", () => done(null));
      qs("#captionInput", backdrop).addEventListener("keydown", (e) => {
        if (e.key === "Enter") done(e.target.value.trim());
      });
      requestAnimationFrame(() => UI.modalOpen(backdrop));
    });
  }

  /* --------------------------------------------------------------- boot */
  UI.ready(async () => {
    Store.assetBase = "../"; // dashboard lives in admin/, seeded photo paths are site-root relative
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
