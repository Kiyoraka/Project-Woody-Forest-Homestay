/* ==========================================================================
   Woody Forest Homestay - landing.js
   Guest page behaviour: navbar, hero slider, gallery + lightbox, calendar,
   booking form, tracker, footer, mobile bottom navigation.
   Requires ui.js + store.js.
   ========================================================================== */
(function () {
  "use strict";

  const { qs, qsa, esc, el } = UI;

  /* ------------------------------------------------------------- navbar */
  function initNav() {
    const nav = qs("#nav");
    const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
    window.addEventListener("scroll", update, { passive: true });
    update();
    UI.scrollSpy(qsa(".nav__link"), { offset: 140 });
  }

  /* --------------------------------------------------------------- hero */
  function initHero() {
    const settings = Store.getSettings();
    qs("#heroTitle").textContent = settings.heroTitle || "Sleep above the rainforest";
    qs("#heroTagline").textContent = settings.tagline;
    qs("#factBedrooms").textContent = settings.bedrooms;
    qs("#factGuests").textContent = settings.maxGuests;
    const from = Math.min(Number(settings.pricing.weekday), Number(settings.pricing.weekend));
    qs("#priceFrom").textContent = UI.fmtRM(from);

    const images = Store.getHeroImages();
    const slidesBox = qs("#heroSlides");
    const dotsBox = qs("#heroDots");
    slidesBox.innerHTML = "";
    dotsBox.innerHTML = "";
    if (!images.length) return;

    const slides = images.map((img, i) => {
      const s = el(`<div class="hero__slide" style="background-image:url('${esc(img.src)}')"></div>`);
      slidesBox.appendChild(s);
      const d = el(`<button class="hero__dot" role="tab" aria-label="Photo ${i + 1}"></button>`);
      d.addEventListener("click", () => go(i, true));
      dotsBox.appendChild(d);
      return s;
    });
    const dots = qsa(".hero__dot", dotsBox);
    let index = 0;
    let timer;

    function go(i, manual) {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle("is-active", k === index));
      dots.forEach((d, k) => d.classList.toggle("is-active", k === index));
      if (manual) restart();
    }

    function restart() {
      clearInterval(timer);
      if (slides.length > 1 && !UI.prefersReducedMotion()) timer = setInterval(() => go(index + 1), 6500);
    }

    go(0);
    restart();
    document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : restart()));

    // touch swipe between hero photos
    const hero = qs("#home");
    let touchX = null;
    let touchY = null;
    hero.addEventListener(
      "touchstart",
      (e) => {
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
      },
      { passive: true }
    );
    hero.addEventListener(
      "touchend",
      (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1), true);
        touchX = touchY = null;
      },
      { passive: true }
    );
  }

  /* --------------------------------------------------------- bottom nav */
  function initBottomNav() {
    const nav = qs("#bottomNav");
    const items = qsa(".bottom-nav__item", nav);
    const pill = qs("#bottomNavPill");
    const move = (active) => {
      const i = Math.max(0, items.indexOf(active));
      pill.style.transform = `translateX(${i * 100}%)`;
    };
    UI.scrollSpy(items, { offset: 180, onChange: move });
    items.forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        UI.scrollToId(a.getAttribute("href"), 56);
        history.replaceState(null, "", a.getAttribute("href"));
      })
    );
  }

  /* ---------------------------------------------------- gallery + lightbox */
  const AMENITY_ICONS = {
    wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2.5 8.5a15 15 0 0 1 19 0M5.5 12a10.5 10.5 0 0 1 13 0M8.5 15.5a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M3 11h18v6H3zM6 17v2m12-2v2"/><circle cx="7.5" cy="14" r="1" fill="currentColor"/><circle cx="16.5" cy="14" r="1" fill="currentColor"/></svg>',
    bbq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16a8 8 0 0 1-16 0zM12 18v3m-5 0 2-3m8 3-2-3M9 3c0 1.5-1 1.5-1 3m4-3c0 1.5-1 1.5-1 3m4-3c0 1.5-1 1.5-1 3"/></svg>',
    kitchen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8m-2-8v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2.5-3 5v3h3v10M17 3v8"/></svg>',
    ac: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>',
    deck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M4 20V9l8-5 8 5v11M9 20v-6h6v6"/></svg>',
    river: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8c2 0 2-1.5 4-1.5S9 8 11 8s2-1.5 4-1.5S17 8 19 8s2-1.5 2-1.5M3 13c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 2-1.5M3 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 2-1.5"/></svg>',
    pet: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 10c-3 0-6 3.5-6 6.5A3 3 0 0 0 9 19.5c1 0 2-.5 3-.5s2 .5 3 .5a3 3 0 0 0 3-3c0-3-3-6.5-6-6.5z"/></svg>',
    default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>'
  };

  let galleryImages = [];
  let lightboxIndex = 0;

  function initGallery() {
    galleryImages = Store.getImages();
    const grid = qs("#galleryGrid");
    grid.innerHTML = galleryImages
      .map(
        (img, i) => `
        <figure class="gallery__item reveal reveal--scale" style="--i:${i % 4}" data-index="${i}" tabindex="0" role="button" aria-label="Open photo: ${esc(img.caption || "Homestay photo")}">
          <img src="${esc(img.src)}" alt="${esc(img.caption || "Homestay photo")}" loading="${i < 2 ? "eager" : "lazy"}">
          <figcaption class="gallery__caption">${esc(img.caption || "")}</figcaption>
        </figure>`
      )
      .join("");
    grid.addEventListener("click", (e) => {
      const item = e.target.closest(".gallery__item");
      if (item) openLightbox(Number(item.dataset.index));
    });
    grid.addEventListener("keydown", (e) => {
      const item = e.target.closest(".gallery__item");
      if (item && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openLightbox(Number(item.dataset.index));
      }
    });
  }

  function openLightbox(i) {
    if (!galleryImages.length) return;
    lightboxIndex = (i + galleryImages.length) % galleryImages.length;
    const img = galleryImages[lightboxIndex];
    const box = qs("#lightbox");
    const pic = qs("#lightboxImg");
    pic.src = img.src;
    pic.alt = img.caption || "Homestay photo";
    qs("#lightboxCaption").textContent = `${img.caption || ""}  ·  ${lightboxIndex + 1} / ${galleryImages.length}`;
    box.classList.add("is-open");
    box.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeLightbox() {
    const box = qs("#lightbox");
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function initLightbox() {
    const box = qs("#lightbox");
    qs("[data-lightbox-close]", box).addEventListener("click", closeLightbox);
    qs("[data-lightbox-prev]", box).addEventListener("click", () => openLightbox(lightboxIndex - 1));
    qs("[data-lightbox-next]", box).addEventListener("click", () => openLightbox(lightboxIndex + 1));
    box.addEventListener("click", (e) => {
      if (e.target === box) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") openLightbox(lightboxIndex - 1);
      if (e.key === "ArrowRight") openLightbox(lightboxIndex + 1);
    });
    let touchX = null;
    box.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
    box.addEventListener(
      "touchend",
      (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) openLightbox(lightboxIndex + (dx < 0 ? 1 : -1));
        touchX = null;
      },
      { passive: true }
    );
  }

  /* -------------------------------------------------------------- about */
  function initAbout() {
    const s = Store.getSettings();
    qs("#aboutTitle").textContent = s.name;
    qs("#aboutText").textContent = s.description;
    qs("#aboutAddress").textContent = s.address;
    const facts = el(`
      <div class="about__facts">
        <div class="about__fact"><strong>${esc(s.bedrooms)}</strong><span>Bedrooms</span></div>
        <div class="about__fact"><strong>${esc(s.bathrooms)}</strong><span>Bathrooms</span></div>
        <div class="about__fact"><strong>${esc(s.maxGuests)}</strong><span>Guests</span></div>
      </div>`);
    qs("#aboutAddress").after(facts);
    qs("#amenityList").innerHTML = (s.amenities || [])
      .map(
        (a, i) => `
        <li class="amenity reveal" style="--i:${i}">
          <span class="amenity__icon">${AMENITY_ICONS[a.icon] || AMENITY_ICONS.default}</span>
          <span>${esc(a.label)}</span>
        </li>`
      )
      .join("");
  }

  /* ------------------------------------------------- availability calendar
     Week starts Monday. Free days are clickable: each click dispatches
     "calendar:pick" (detail.date) on document; the booking form owns the
     check-in / check-out logic and calls calendar.setRange() to highlight. */
  const calendar = (() => {
    const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const MAX_MONTHS_AHEAD = 12;
    let view = null;
    let range = { from: null, to: null };
    let root;

    function monthStart(y, m) {
      return new Date(y, m, 1);
    }

    function canGo(delta) {
      const now = new Date();
      const target = new Date(view.y, view.m + delta, 1);
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + MAX_MONTHS_AHEAD, 1);
      return target >= first && target <= last;
    }

    function render() {
      const s = Store.getSettings();
      const today = UI.todayISO();
      const taken = Store.unavailableNights();
      const blocked = Store.blockedNights();
      const first = monthStart(view.y, view.m);
      const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
      const lead = (first.getDay() + 6) % 7; // Monday-first offset

      let cells = "";
      for (let i = 0; i < lead; i++) cells += '<span class="day day--empty"></span>';
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = UI.toISO(new Date(view.y, view.m, d));
        const info = Store.nightPrice(iso, s.pricing);
        const classes = ["day"];
        let clickable = false;
        if (iso < today) classes.push("day--past");
        else if (blocked.has(iso)) classes.push("day--blocked");
        else if (taken.has(iso)) classes.push("day--booked");
        else {
          classes.push("day--free");
          clickable = true;
          if (info.kind === "peak") classes.push("day--peak");
          else if (info.kind === "weekend") classes.push("day--weekend");
        }
        if (iso === today) classes.push("day--today");
        if (range.from && range.to && iso >= range.from && iso < range.to) classes.push("day--in-range");
        if (iso === range.from || (range.to && iso === UI.addDays(range.to, -1))) classes.push("day--selected");
        const price = clickable ? `<small>${UI.fmtRM(info.price).replace("RM ", "")}</small>` : "";
        const title = clickable ? `${UI.fmtDate(iso)} - ${UI.fmtRM(info.price)} per night` : "";
        cells += `<${clickable ? "button" : "span"} class="${classes.join(" ")}" data-date="${iso}" ${title ? `title="${esc(title)}"` : ""}>${d}${price}</${clickable ? "button" : "span"}>`;
      }

      root.innerHTML = `
        <div class="calendar__head">
          <div class="calendar__title">${UI.monthLabel(view.y, view.m)}</div>
          <div class="calendar__nav">
            <button class="btn btn--icon" data-cal="-1" aria-label="Previous month" ${canGo(-1) ? "" : "disabled"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m15 5-7 7 7 7"/></svg>
            </button>
            <button class="btn btn--icon" data-cal="1" aria-label="Next month" ${canGo(1) ? "" : "disabled"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg>
            </button>
          </div>
        </div>
        <div class="calendar__weekdays">${WEEKDAYS.map((w) => `<span>${w}</span>`).join("")}</div>
        <div class="calendar__days">${cells}</div>
        <div class="calendar__legend">
          <span><i style="background:var(--cream);border:1px solid var(--line)"></i> Available</span>
          <span><i style="background:var(--wood-soft)"></i> Weekend rate</span>
          <span><i style="background:#f3e2e0"></i> Peak rate</span>
          <span><i style="background:var(--forest-900)"></i> Booked</span>
          <span><i style="background:repeating-linear-gradient(135deg,var(--cream-dark) 0 3px,var(--cream) 3px 6px)"></i> Unavailable</span>
        </div>
        <p class="calendar__hint">Tap a date to set your check-in, then another for check-out.</p>`;
    }

    function init() {
      root = qs("#calendar");
      const now = new Date();
      view = { y: now.getFullYear(), m: now.getMonth() };
      root.addEventListener("click", (e) => {
        const nav = e.target.closest("[data-cal]");
        if (nav && !nav.disabled) {
          const d = new Date(view.y, view.m + Number(nav.dataset.cal), 1);
          view = { y: d.getFullYear(), m: d.getMonth() };
          render();
          return;
        }
        const day = e.target.closest(".day--free");
        if (day) document.dispatchEvent(new CustomEvent("calendar:pick", { detail: { date: day.dataset.date } }));
      });
      window.addEventListener("store:change", render);
      render();
    }

    function setRange(from, to) {
      range = { from: from || null, to: to || null };
      if (from) {
        const d = UI.parseISO(from);
        view = { y: d.getFullYear(), m: d.getMonth() };
      }
      render();
    }

    return { init, render, setRange };
  })();

  /* ---------------------------------------------------------- rate card */
  function initRates() {
    const s = Store.getSettings();
    const p = s.pricing;
    const weekendNames = (p.weekendNights || []).map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(" & ");
    const peakRows = (p.peakRanges || [])
      .filter((r) => r.to >= UI.todayISO())
      .map(
        (r) => `
        <div class="rate-row rate-row--peak">
          <div class="rate-row__label">${esc(r.label || "Peak season")}<small>${UI.fmtRange(r.from, r.to)}</small></div>
          <div class="rate-row__value">${UI.fmtRM(r.price)} <small>/ night</small></div>
        </div>`
      )
      .join("");
    qs("#rateCard").innerHTML = `
      <div class="rate-card__title">Nightly rates</div>
      <div>
        <div class="rate-row">
          <div class="rate-row__label">Weekday night<small>Sun - Thu nights</small></div>
          <div class="rate-row__value">${UI.fmtRM(p.weekday)} <small>/ night</small></div>
        </div>
        <div class="rate-row">
          <div class="rate-row__label">Weekend night<small>${esc(weekendNames)} nights</small></div>
          <div class="rate-row__value">${UI.fmtRM(p.weekend)} <small>/ night</small></div>
        </div>
        ${peakRows}
        <div class="rate-row">
          <div class="rate-row__label">Cleaning fee<small>once per stay</small></div>
          <div class="rate-row__value">${UI.fmtRM(p.cleaningFee)}</div>
        </div>
      </div>
      <div class="rate-card__meta">
        <span class="chip">Min ${UI.plural(p.minNights, "night")}</span>
        <span class="chip">Up to ${s.maxGuests} guests</span>
        <span class="chip">Whole house</span>
      </div>
      <a href="#book" class="btn btn--primary btn--block">Book your dates</a>
      <p class="hint text-center">Bank transfer only. Your dates are held once we receive your receipt.</p>`;
  }

  /* ------------------------------------------------------------ booking */
  const booking = (() => {
    let f = {};
    let receipt = null;
    let lastQuote = null;

    function refs() {
      f = {
        form: qs("#bookingForm"),
        checkIn: qs("#checkIn"),
        checkOut: qs("#checkOut"),
        guests: qs("#guests"),
        name: qs("#guestName"),
        phone: qs("#guestPhone"),
        email: qs("#guestEmail"),
        bank: qs("#bankBox"),
        dropzone: qs("#dropzone"),
        file: qs("#receiptFile"),
        idle: qs("#dropzoneIdle"),
        preview: qs("#dropzonePreview"),
        previewImg: qs("#receiptPreview"),
        previewName: qs("#receiptName"),
        remove: qs("#receiptRemove"),
        submit: qs("#bookSubmit"),
        summary: qs("#summary"),
        success: qs("#bookingSuccess")
      };
    }

    function renderBank() {
      const s = Store.getSettings();
      const total = lastQuote && lastQuote.ok ? lastQuote.total : null;
      f.bank.innerHTML = `
        <div>
          <div class="bank-box__label">${esc(s.bank.bankName)} transfer</div>
          <div class="bank-box__acct" id="bankAcct">${esc(s.bank.accountNo)}</div>
          <div class="bank-box__holder">${esc(s.bank.holder)}</div>
        </div>
        <div class="bank-box__total">
          <strong>${total !== null ? UI.fmtRM(total) : "--"}</strong>
          <span>amount to transfer</span>
        </div>
        <button type="button" class="btn btn--outline btn--sm" id="copyAcct">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
          Copy account number
        </button>`;
      qs("#copyAcct", f.bank).addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(s.bank.accountNo.replace(/\s+/g, ""));
          UI.toast("Account number copied", "success");
        } catch (e) {
          UI.toast("Copy not available here - please type the number", "warning");
        }
      });
    }

    function groupNights(nights) {
      const groups = {};
      nights.forEach((n) => {
        const key = n.kind === "peak" ? `Peak night (${n.label || "holiday rate"})` : n.kind === "weekend" ? "Weekend night" : "Weekday night";
        const g = groups[key] || { count: 0, price: n.price, total: 0 };
        g.count += 1;
        g.total += n.price;
        groups[key] = g;
      });
      return Object.entries(groups);
    }

    function renderSummary() {
      const q = lastQuote;
      const ci = f.checkIn.value;
      const co = f.checkOut.value;
      if (!ci || !co) {
        f.summary.innerHTML = `
          <div class="summary__title">Your stay</div>
          <div class="summary__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4"/></svg>
            <span>Choose your check-in and check-out dates to see the total.</span>
          </div>`;
        return;
      }
      const rows = q.nights.length
        ? groupNights(q.nights)
            .map(([label, g]) => `<div class="summary__row"><span>${esc(label)} x ${g.count}</span><span>${UI.fmtRM(g.total)}</span></div>`)
            .join("") + `<div class="summary__row"><span>Cleaning fee</span><span>${UI.fmtRM(q.cleaningFee)}</span></div>`
        : "";
      const status = q.ok
        ? `<div class="summary__ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> These dates are available</div>`
        : `<div class="summary__errors">${q.errors.map((e) => `<span>${esc(e)}</span>`).join("")}</div>`;
      f.summary.innerHTML = `
        <div class="summary__title">Your stay</div>
        <div class="summary__dates">
          <span>${UI.fmtDate(ci, { year: false })} <span class="muted">to</span> ${UI.fmtDate(co, { year: false })}</span>
          <span>${UI.plural(q.nightsCount, "night")} · ${UI.plural(Number(f.guests.value), "guest")}</span>
        </div>
        <div class="summary__rows">${rows}</div>
        ${q.nights.length ? `<div class="summary__total"><span>Total</span><strong>${UI.fmtRM(q.total)}</strong></div>` : ""}
        ${status}`;
    }

    function updateQuote() {
      lastQuote = Store.quote(f.checkIn.value, f.checkOut.value, f.guests.value);
      renderSummary();
      renderBank();
      calendar.setRange(f.checkIn.value, f.checkOut.value);
    }

    async function attachFile(file) {
      if (!file) return;
      try {
        receipt = await Store.resizeImage(file, { maxPx: 1200, quality: 0.8 });
        f.previewImg.src = receipt;
        f.previewName.textContent = file.name;
        f.idle.classList.add("hidden");
        f.preview.classList.remove("hidden");
        f.dropzone.classList.add("has-file");
      } catch (err) {
        UI.toast(err.message || "Could not read that file", "error");
      }
    }

    function clearFile() {
      receipt = null;
      f.file.value = "";
      f.previewImg.src = "";
      f.idle.classList.remove("hidden");
      f.preview.classList.add("hidden");
      f.dropzone.classList.remove("has-file");
    }

    function showSuccess(b) {
      f.form.classList.add("hidden");
      f.summary.classList.add("hidden");
      f.success.classList.remove("hidden");
      f.success.innerHTML = `
        <div class="success__check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 7"/></svg>
        </div>
        <span class="eyebrow">Booking received</span>
        <h3 class="h2">Thank you, ${esc(b.name.split(" ")[0])}</h3>
        <p class="lead text-center">Your dates are held. Keep this reference - you will need it to track your booking.</p>
        <div class="success__ref"><span id="successRef">${esc(b.ref)}</span>
          <button type="button" class="btn btn--icon btn--sm" id="copyRef" aria-label="Copy reference">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
          </button>
        </div>
        <div class="success__grid">
          <div class="success__cell"><span>Check-in</span>${UI.fmtDate(b.checkIn)}</div>
          <div class="success__cell"><span>Check-out</span>${UI.fmtDate(b.checkOut)}</div>
          <div class="success__cell"><span>Guests</span>${b.guests}</div>
          <div class="success__cell"><span>Total</span>${UI.fmtRM(b.total)}</div>
        </div>
        <p class="hint">We will check your transfer and confirm within 24 hours. Status: <strong>Pending review</strong>.</p>
        <div class="success__actions">
          <a href="#track" class="btn btn--primary" id="successTrack">Track this booking</a>
          <button type="button" class="btn btn--ghost" id="bookAgain">Make another booking</button>
        </div>`;
      qs("#copyRef").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(b.ref);
          UI.toast("Reference copied", "success");
        } catch (e) {
          UI.toast("Copy not available here", "warning");
        }
      });
      qs("#successTrack").addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("track:prefill", { detail: { ref: b.ref, phone: b.phone } }));
      });
      qs("#bookAgain").addEventListener("click", () => {
        f.success.classList.add("hidden");
        f.form.classList.remove("hidden");
        f.summary.classList.remove("hidden");
        f.form.reset();
        clearFile();
        fillGuests();
        updateQuote();
        UI.scrollToId("#book", 80);
      });
      f.success.scrollIntoView({ behavior: UI.prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    }

    function fillGuests() {
      const max = Store.getSettings().maxGuests;
      const current = Number(f.guests.value) || 2;
      f.guests.innerHTML = Array.from({ length: max }, (_, i) => i + 1)
        .map((n) => `<option value="${n}" ${n === Math.min(current, max) ? "selected" : ""}>${UI.plural(n, "guest")}</option>`)
        .join("");
    }

    async function submit(e) {
      e.preventDefault();
      [f.name, f.phone, f.email].forEach(UI.clearInvalid);
      const data = {
        name: f.name.value,
        phone: f.phone.value,
        email: f.email.value,
        checkIn: f.checkIn.value,
        checkOut: f.checkOut.value,
        guests: f.guests.value,
        receipt
      };
      f.submit.disabled = true;
      f.submit.textContent = "Submitting...";
      const result = Store.createBooking(data);
      f.submit.disabled = false;
      f.submit.textContent = "Submit booking";
      if (!result.ok) {
        result.errors.forEach((msg) => {
          if (/name/i.test(msg)) UI.setInvalid(f.name, msg);
          else if (/phone/i.test(msg)) UI.setInvalid(f.phone, msg);
          else if (/email/i.test(msg)) UI.setInvalid(f.email, msg);
        });
        if (result.errors.some((m) => /receipt/i.test(m))) f.dropzone.classList.add("shake");
        setTimeout(() => f.dropzone.classList.remove("shake"), 500);
        lastQuote = Store.quote(data.checkIn, data.checkOut, data.guests);
        if (!lastQuote.ok) renderSummary();
        UI.toast(result.errors[0], "error");
        return;
      }
      UI.toast(`Booking ${result.booking.ref} received`, "success");
      showSuccess(result.booking);
    }

    function init() {
      refs();
      const today = UI.todayISO();
      f.checkIn.min = today;
      f.checkOut.min = UI.addDays(today, 1);
      fillGuests();
      renderBank();
      renderSummary();

      f.checkIn.addEventListener("change", () => {
        if (f.checkIn.value) {
          f.checkOut.min = UI.addDays(f.checkIn.value, 1);
          if (!f.checkOut.value || f.checkOut.value <= f.checkIn.value) f.checkOut.value = UI.addDays(f.checkIn.value, 1);
        }
        updateQuote();
      });
      f.checkOut.addEventListener("change", updateQuote);
      f.guests.addEventListener("change", updateQuote);

      document.addEventListener("calendar:pick", (e) => {
        const d = e.detail.date;
        if (!f.checkIn.value || (f.checkIn.value && f.checkOut.value) || d <= f.checkIn.value) {
          f.checkIn.value = d;
          f.checkOut.value = "";
          f.checkOut.min = UI.addDays(d, 1);
        } else {
          f.checkOut.value = d;
        }
        updateQuote();
        if (f.checkIn.value && f.checkOut.value) {
          UI.toast(`${UI.fmtDate(f.checkIn.value, { year: false })} to ${UI.fmtDate(f.checkOut.value, { year: false })} selected`, "info", 2200);
          UI.scrollToId("#book", 80);
        }
      });

      f.dropzone.addEventListener("click", (e) => {
        if (e.target.closest("#receiptRemove")) return;
        if (!receipt) f.file.click();
      });
      f.dropzone.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !receipt) {
          e.preventDefault();
          f.file.click();
        }
      });
      f.file.addEventListener("change", () => attachFile(f.file.files[0]));
      ["dragenter", "dragover"].forEach((ev) =>
        f.dropzone.addEventListener(ev, (e) => {
          e.preventDefault();
          f.dropzone.classList.add("is-dragover");
        })
      );
      ["dragleave", "drop"].forEach((ev) =>
        f.dropzone.addEventListener(ev, (e) => {
          e.preventDefault();
          f.dropzone.classList.remove("is-dragover");
        })
      );
      f.dropzone.addEventListener("drop", (e) => attachFile(e.dataTransfer.files[0]));
      f.remove.addEventListener("click", clearFile);
      [f.name, f.phone, f.email].forEach((input) => input.addEventListener("input", () => UI.clearInvalid(input)));
      f.form.addEventListener("submit", submit);
      window.addEventListener("store:change", () => {
        fillGuests();
        if (!f.form.classList.contains("hidden")) updateQuote();
      });
    }

    return { init };
  })();

  /* ------------------------------------------------------------ tracker */
  const tracker = (() => {
    const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    const CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>';
    const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    const INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>';
    let f = {};
    let results = [];
    let selectedRef = null;

    function whatsappLink(settings, text) {
      return `https://wa.me/${Store.digitsOnly(settings.whatsapp)}?text=${encodeURIComponent(text)}`;
    }

    function stepper(b) {
      const ended = b.status === "REJECTED" || b.status === "CANCELLED";
      const reviewed = b.history && b.history.find((h) => h.by === "owner");
      const steps = [
        { label: "Submitted", sub: UI.fmtDateTime(b.createdAt), icon: CHECK, state: "is-done" },
        {
          label: "Payment review",
          sub: ended || b.status !== "PENDING" ? (reviewed ? UI.fmtDateTime(reviewed.at) : "Reviewed") : "Within 24 hours",
          icon: b.status === "PENDING" ? CLOCK : ended ? CROSS : CHECK,
          state: b.status === "PENDING" ? "is-current" : ended ? "is-ended" : "is-done"
        },
        {
          label: b.status === "COMPLETED" ? "Completed" : ended ? (b.status === "REJECTED" ? "Not accepted" : "Cancelled") : "Confirmed",
          sub: b.status === "CONFIRMED" ? `Check-in ${UI.fmtDate(b.checkIn, { year: false })}` : b.status === "COMPLETED" ? "Thank you for staying" : ended ? "" : "After review",
          icon: ended ? CROSS : b.status === "CONFIRMED" || b.status === "COMPLETED" ? CHECK : CLOCK,
          state: ended ? "is-ended" : b.status === "CONFIRMED" ? "is-current" : b.status === "COMPLETED" ? "is-done" : ""
        }
      ];
      return `<div class="stepper ${ended ? "stepper--ended" : ""}">${steps
        .map((s) => `<div class="step ${s.state}"><span class="step__dot">${s.icon}</span>${esc(s.label)}<small>${esc(s.sub)}</small></div>`)
        .join("")}</div>`;
    }

    function note(b, settings) {
      const wa = whatsappLink(settings, `Hi, I am asking about booking ${b.ref}.`);
      switch (b.status) {
        case "PENDING":
          return `<div class="track-result__note track-result__note--warning">${CLOCK}<div><strong>We are checking your transfer.</strong> You will see Confirmed here once the owner verifies the receipt, usually within 24 hours.</div></div>`;
        case "CONFIRMED":
          return `<div class="track-result__note track-result__note--success">${CHECK}<div><strong>Your stay is confirmed.</strong> Check-in from 3:00 PM on ${UI.fmtDate(b.checkIn)}. The owner will share directions on WhatsApp before you arrive.${b.note ? ` <em>Owner's note: ${esc(b.note)}</em>` : ""}</div></div>`;
        case "COMPLETED":
          return `<div class="track-result__note track-result__note--info">${INFO}<div><strong>This stay is complete.</strong> Thank you for choosing Woody Forest - we would love to host you again.</div></div>`;
        case "REJECTED":
          return `<div class="track-result__note track-result__note--danger">${CROSS}<div><strong>We could not accept this booking.</strong> ${b.note ? esc(b.note) : "The transfer could not be verified."} Please <a href="${wa}" target="_blank" rel="noopener"><u>message us on WhatsApp</u></a> and we will sort it out.</div></div>`;
        case "CANCELLED":
          return `<div class="track-result__note track-result__note--danger">${CROSS}<div><strong>This booking was cancelled.</strong> ${b.note ? esc(b.note) : ""} The dates are released - you are welcome to book again.</div></div>`;
        default:
          return "";
      }
    }

    function switcher(list, current) {
      if (list.length < 2) return "";
      return `
        <div class="track-switch">
          <span>${UI.plural(list.length, "booking")} on this number:</span>
          ${list
            .map((x) => `<button type="button" class="chip ${x.ref === current ? "is-active" : ""}" data-switch="${esc(x.ref)}">${esc(x.ref)} · ${esc(x.status.toLowerCase())}</button>`)
            .join("")}
        </div>`;
    }

    function render(b) {
      const s = Store.getSettings();
      selectedRef = b.ref;
      f.result.innerHTML = `
        ${switcher(results, b.ref)}
        <div class="track-result__head">
          <div>
            <div class="track-result__ref">${esc(b.ref)}</div>
            <div class="track-result__guest">${esc(b.name)} · ${UI.plural(b.guests, "guest")}</div>
          </div>
          <span class="status status--${esc(b.status)}">${esc(b.status.toLowerCase())}</span>
        </div>
        ${stepper(b)}
        <div class="track-result__grid">
          <div class="track-result__cell"><span>Check-in</span>${UI.fmtDate(b.checkIn)}</div>
          <div class="track-result__cell"><span>Check-out</span>${UI.fmtDate(b.checkOut)}</div>
          <div class="track-result__cell"><span>Nights</span>${b.nights}</div>
          <div class="track-result__cell"><span>Total</span>${UI.fmtRM(b.total)}</div>
        </div>
        ${note(b, s)}
        <div class="track-result__actions">
          <a class="btn btn--outline btn--sm" href="${whatsappLink(s, `Hi, this is ${b.name} about booking ${b.ref}.`)}" target="_blank" rel="noopener">WhatsApp the owner</a>
          <a class="btn btn--ghost btn--sm" href="#book">Book another stay</a>
        </div>`;
      qsa("[data-switch]", f.result).forEach((chip) =>
        chip.addEventListener("click", () => {
          const next = results.find((x) => x.ref === chip.dataset.switch);
          if (next) render(next);
        })
      );
    }

    function renderMissing() {
      f.result.innerHTML = `
        <div class="track-result__missing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>
          <strong>No booking found for that number.</strong>
          <span>Use the same phone number you entered when booking, for example 012-345 6789.</span>
        </div>`;
      f.panel.classList.add("shake");
      setTimeout(() => f.panel.classList.remove("shake"), 500);
    }

    function lookup(phone, preferRef) {
      UI.clearInvalid(f.phone);
      if (Store.phoneKey(phone).length < 7) {
        UI.setInvalid(f.phone, "Enter the phone number you booked with.");
        return;
      }
      results = Store.trackByPhone(phone);
      if (!results.length) {
        selectedRef = null;
        renderMissing();
        return;
      }
      // prefer the booking just made, otherwise the next upcoming / most recent one
      const today = UI.todayISO();
      const upcoming = results.filter((b) => b.checkOut >= today && b.status !== "REJECTED" && b.status !== "CANCELLED");
      const pick = (preferRef && results.find((b) => b.ref === preferRef)) || upcoming[upcoming.length - 1] || results[0];
      render(pick);
    }

    function init() {
      f = { panel: qs("#trackPanel"), form: qs("#trackForm"), phone: qs("#trackPhone"), result: qs("#trackResult") };
      f.form.addEventListener("submit", (e) => {
        e.preventDefault();
        lookup(f.phone.value);
      });
      f.phone.addEventListener("input", () => UI.clearInvalid(f.phone));
      document.addEventListener("track:prefill", (e) => {
        f.phone.value = e.detail.phone;
        lookup(e.detail.phone, e.detail.ref);
      });
      window.addEventListener("store:change", () => {
        if (selectedRef && f.result.innerHTML) lookup(f.phone.value, selectedRef);
      });
    }

    return { init };
  })();

  /* ------------------------------------------------------------- footer */
  function initFooter() {
    const s = Store.getSettings();
    const wa = `https://wa.me/${Store.digitsOnly(s.whatsapp)}`;
    const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
    const PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>';
    const MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
    const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
    qs("#footerInner").innerHTML = `
      <div>
        <a class="brand" href="#home"><img class="brand__mark" src="assets/img/logo.svg" alt="" width="40" height="40"><span class="brand__text">Woody <em>Forest</em></span></a>
        <p class="footer__tagline">${esc(s.tagline)}. ${esc(s.bedrooms)} bedrooms, ${esc(s.bathrooms)} bathrooms, up to ${esc(s.maxGuests)} guests, all yours.</p>
      </div>
      <div>
        <div class="footer__title">Find us</div>
        <div class="footer__list">
          <a href="https://maps.google.com/?q=${encodeURIComponent(s.address)}" target="_blank" rel="noopener">${PIN}<span>${esc(s.address)}</span></a>
          <a href="${wa}" target="_blank" rel="noopener">${PHONE}<span>WhatsApp +${esc(Store.digitsOnly(s.whatsapp))}</span></a>
          <a href="mailto:${esc(s.email)}">${MAIL}<span>${esc(s.email)}</span></a>
        </div>
      </div>
      <div>
        <div class="footer__title">Quick links</div>
        <div class="footer__list">
          <a href="#gallery">${ARROW}<span>Gallery</span></a>
          <a href="#rates">${ARROW}<span>Rates &amp; availability</span></a>
          <a href="#book">${ARROW}<span>Book a stay</span></a>
          <a href="#track">${ARROW}<span>Track a booking</span></a>
        </div>
      </div>
      <div class="footer__bottom">
        <span>&copy; ${new Date().getFullYear()} ${esc(s.name)}. All rights reserved.</span>
        <a class="btn btn--light btn--sm" href="admin/login.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
          Login
        </a>
      </div>`;
  }

  /* --------------------------------------------------------------- boot */
  UI.ready(async () => {
    await Store.init();
    initNav();
    initHero();
    initGallery();
    initLightbox();
    initAbout();
    calendar.init();
    initRates();
    booking.init();
    tracker.init();
    initFooter();
    initBottomNav();
    window.addEventListener("store:change", initRates);
    window.addEventListener("store:change", initFooter);
    UI.initReveal();
  });
})();
