/* ==========================================================================
   Woody Forest Homestay - admin/view-main.js
   Registers its renderer on window.Admin (see admin/core.js). Requires
   ui.js, store.js and admin/core.js loaded first.
   ========================================================================== */
(function () {
  "use strict";

  const { qs, qsa, esc, el } = UI;
  const { renderers, ICON, emptyState, bookingRow } = Admin;
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
})();
