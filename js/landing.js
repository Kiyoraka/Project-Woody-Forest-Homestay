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
    window.addEventListener("store:change", initRates);
    UI.initReveal();
  });
})();
