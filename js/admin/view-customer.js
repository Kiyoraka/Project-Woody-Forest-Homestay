/* ==========================================================================
   Woody Forest Homestay - admin/view-customer.js
   Registers its renderer on window.Admin (see admin/core.js). Requires
   ui.js, store.js and admin/core.js loaded first.
   ========================================================================== */
(function () {
  "use strict";

  const { qs, qsa, esc, el } = UI;
  const { renderers, initials, emptyState, bookingRow, whatsapp } = Admin;
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
})();
