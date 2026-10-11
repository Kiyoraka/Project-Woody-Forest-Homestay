/* ==========================================================================
   Woody Forest Homestay - admin/view-booking.js
   Registers its renderer on window.Admin (see admin/core.js). Requires
   ui.js, store.js and admin/core.js loaded first.
   ========================================================================== */
(function () {
  "use strict";

  const { qs, qsa, esc, el } = UI;
  const { renderers, ICON, emptyState, whatsapp } = Admin;
  /* --------------------------------------------------------- Booking view */
  const bookingState = { filter: "ALL", query: "" };
  const STATUS_FILTERS = ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "REJECTED", "CANCELLED"];


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

  Admin.onBoot.push(initBookingModal);
})();
