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

  /* --------------------------------------------------------------- boot */
  UI.ready(async () => {
    await Store.init();
    initNav();
    initHero();
    UI.initReveal();
  });
})();
