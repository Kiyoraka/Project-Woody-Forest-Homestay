/* ==========================================================================
   Woody Forest Homestay - ui.js
   Shared browser helpers used by both the landing page and the admin
   dashboard: DOM shortcuts, formatters, toasts, modals, scroll reveals,
   number count-ups and small date utilities.
   Exposes a single global: window.UI
   ========================================================================== */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------------ DOM */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Escape user-provided text before injecting it into innerHTML. */
  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Build an element from an HTML string (first node only). */
  function el(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  }

  function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  const prefersReducedMotion = () =>
    global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------- Formatters */
  const rmFormatter = new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  /** 800 -> "RM 800" */
  function fmtRM(amount) {
    const n = Number(amount) || 0;
    return rmFormatter.format(n).replace("MYR", "RM").replace(/ /g, " ");
  }

  /** "2026-10-12" -> "12 Oct 2026" (or "12 Oct" with { year: false }). */
  function fmtDate(iso, opts = {}) {
    if (!iso) return "--";
    const d = parseISO(iso);
    if (!d) return "--";
    const options = { day: "numeric", month: "short" };
    if (opts.year !== false) options.year = "numeric";
    if (opts.weekday) options.weekday = "short";
    return d.toLocaleDateString("en-MY", options);
  }

  /** ISO timestamp -> "12 Oct 2026, 3:45 PM" */
  function fmtDateTime(iso) {
    if (!iso) return "--";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "--";
    return d.toLocaleString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  /** Two ISO dates -> "12 - 15 Oct 2026" / "28 Oct - 2 Nov 2026" */
  function fmtRange(fromISO, toISO) {
    const a = parseISO(fromISO);
    const b = parseISO(toISO);
    if (!a || !b) return "--";
    const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    const left = sameMonth
      ? String(a.getDate())
      : a.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
    const right = b.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
    return `${left} - ${right}`;
  }

  function fmtNumber(n) {
    return new Intl.NumberFormat("en-MY").format(Number(n) || 0);
  }

  function plural(n, word, pluralWord) {
    return `${n} ${n === 1 ? word : pluralWord || word + "s"}`;
  }

  /* ------------------------------------------------------------------ Dates
     All calendar dates are bare ISO strings (YYYY-MM-DD) in local time. */
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseISO(iso) {
    if (!iso || typeof iso !== "string") return null;
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function todayISO() {
    return toISO(new Date());
  }

  function addDays(iso, days) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + days);
    return toISO(d);
  }

  /** Nights between two ISO dates (check-out - check-in). */
  function diffDays(fromISO, toISO) {
    const a = parseISO(fromISO);
    const b = parseISO(toISO);
    if (!a || !b) return 0;
    return Math.round((b - a) / 86400000);
  }

  /** Every ISO date from `fromISO` (inclusive) to `toISO` (exclusive). */
  function eachDay(fromISO, toISO) {
    const out = [];
    let cur = fromISO;
    while (cur < toISO) {
      out.push(cur);
      cur = addDays(cur, 1);
    }
    return out;
  }

  /** 0 = Sunday ... 6 = Saturday for an ISO date. */
  function weekday(iso) {
    return parseISO(iso).getDay();
  }

  function monthLabel(year, monthIndex) {
    return new Date(year, monthIndex, 1).toLocaleDateString("en-MY", { month: "long", year: "numeric" });
  }

  /* ----------------------------------------------------------------- Toasts */
  const ICONS = {
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>',
    warning:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4m0 3h.01"/></svg>',
    info:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>'
  };

  let toastStack;

  /**
   * toast("Saved", "success") - types: success | error | warning | info
   * Auto-dismisses after `ms` (default 3200).
   */
  function toast(message, type = "info", ms = 3200) {
    if (!toastStack) {
      toastStack = el('<div class="toast-stack" role="status" aria-live="polite"></div>');
      document.body.appendChild(toastStack);
    }
    const node = el(
      `<div class="toast toast--${esc(type)}">${ICONS[type] || ICONS.info}<span>${esc(message)}</span></div>`
    );
    toastStack.appendChild(node);
    const remove = () => {
      node.classList.add("is-leaving");
      node.addEventListener("animationend", () => node.remove(), { once: true });
      if (prefersReducedMotion()) node.remove();
    };
    const timer = setTimeout(remove, ms);
    node.addEventListener("click", () => {
      clearTimeout(timer);
      remove();
    });
    return node;
  }

  /* ----------------------------------------------------------------- Modals
     Markup contract:
       <div class="modal-backdrop" id="x">
         <div class="modal" role="dialog" aria-modal="true"> ... </div>
       </div>
     Anything inside with [data-close] closes it. Escape + backdrop click too. */
  const openModals = [];

  function modalOpen(target) {
    const backdrop = typeof target === "string" ? qs(target) : target;
    if (!backdrop) return;
    backdrop.classList.add("is-open");
    document.body.classList.add("modal-open");
    openModals.push(backdrop);
    const focusable = qs("[autofocus], input, select, textarea, button", backdrop);
    if (focusable) setTimeout(() => focusable.focus(), 50);
  }

  function modalClose(target) {
    const backdrop = target
      ? typeof target === "string"
        ? qs(target)
        : target
      : openModals[openModals.length - 1];
    if (!backdrop) return;
    backdrop.classList.remove("is-open");
    const i = openModals.indexOf(backdrop);
    if (i > -1) openModals.splice(i, 1);
    if (!openModals.length) document.body.classList.remove("modal-open");
    backdrop.dispatchEvent(new CustomEvent("modal:close"));
  }

  function bindModals() {
    document.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-close]");
      if (closeBtn) {
        modalClose(closeBtn.closest(".modal-backdrop"));
        return;
      }
      if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
        modalClose(e.target);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && openModals.length) modalClose();
    });
  }

  /**
   * Promise-based confirm dialog (never the native one).
   * confirm({ title, message, okText, danger }) -> Promise<boolean>
   */
  function confirmDialog({ title = "Are you sure?", message = "", okText = "Confirm", cancelText = "Cancel", danger = false } = {}) {
    return new Promise((resolve) => {
      const backdrop = el(`
        <div class="modal-backdrop">
          <div class="modal" role="dialog" aria-modal="true" style="width:min(100%,440px)">
            <div class="modal__head"><h3 class="h3">${esc(title)}</h3></div>
            <div class="modal__body"><p class="muted">${esc(message)}</p></div>
            <div class="modal__foot">
              <button class="btn btn--ghost" data-role="cancel">${esc(cancelText)}</button>
              <button class="btn ${danger ? "btn--danger" : "btn--primary"}" data-role="ok">${esc(okText)}</button>
            </div>
          </div>
        </div>`);
      document.body.appendChild(backdrop);
      const done = (value) => {
        modalClose(backdrop);
        setTimeout(() => backdrop.remove(), 400);
        resolve(value);
      };
      qs('[data-role="ok"]', backdrop).addEventListener("click", () => done(true));
      qs('[data-role="cancel"]', backdrop).addEventListener("click", () => done(false));
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) done(false);
      });
      requestAnimationFrame(() => modalOpen(backdrop));
    });
  }

  /* ---------------------------------------------------------- Scroll reveal */
  let revealObserver;

  /** Observe every .reveal element (call again after injecting new markup). */
  function initReveal(root = document) {
    const nodes = qsa(".reveal:not(.is-visible)", root);
    if (!nodes.length) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in global)) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
    }
    nodes.forEach((n) => revealObserver.observe(n));
  }

  /* -------------------------------------------------------------- Count-up */
  /**
   * countUp(el, 4800, { prefix: "RM ", suffix: "%", duration: 900 })
   * Animates the element's text from 0 to `to`. Respects reduced motion.
   */
  function countUp(target, to, opts = {}) {
    const node = typeof target === "string" ? qs(target) : target;
    if (!node) return;
    const { prefix = "", suffix = "", duration = 900, decimals = 0, formatter = fmtNumber } = opts;
    const end = Number(to) || 0;
    const render = (v) => {
      const val = decimals ? v.toFixed(decimals) : Math.round(v);
      node.textContent = `${prefix}${decimals ? val : formatter(val)}${suffix}`;
    };
    if (prefersReducedMotion() || duration <= 0) {
      render(end);
      return;
    }
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      render(end * ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------- Scroll utilities */
  function scrollToId(id, offset = 0) {
    const node = typeof id === "string" ? qs(id.startsWith("#") ? id : `#${id}`) : id;
    if (!node) return;
    const top = node.getBoundingClientRect().top + global.scrollY - offset;
    global.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  /**
   * Scroll-spy: toggles `activeClass` on the link whose hash matches the
   * section currently in view. links: NodeList/array of <a href="#id">.
   */
  function scrollSpy(links, { activeClass = "is-active", offset = 120, onChange } = {}) {
    const items = Array.from(links)
      .map((a) => ({ a, section: qs(a.getAttribute("href")) }))
      .filter((x) => x.section);
    if (!items.length) return;
    let current = null;
    const update = () => {
      const y = global.scrollY + offset;
      let active = items[0];
      for (const item of items) {
        if (item.section.offsetTop <= y) active = item;
      }
      if (active !== current) {
        items.forEach((x) => x.a.classList.toggle(activeClass, x === active));
        current = active;
        if (onChange) onChange(active.a);
      }
    };
    global.addEventListener("scroll", update, { passive: true });
    global.addEventListener("resize", update);
    update();
  }

  /* -------------------------------------------------------- Form helpers */
  function setInvalid(input, message) {
    input.classList.add("is-invalid");
    let err = input.parentElement.querySelector(".error-text");
    if (!err) {
      err = el('<span class="error-text"></span>');
      input.parentElement.appendChild(err);
    }
    err.textContent = message;
  }

  function clearInvalid(input) {
    input.classList.remove("is-invalid");
    const err = input.parentElement.querySelector(".error-text");
    if (err) err.remove();
  }

  /** Read a File as a data URL. */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  /* ----------------------------------------------------------------- Boot */
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(() => {
    bindModals();
    initReveal();
  });

  global.UI = {
    qs,
    qsa,
    el,
    esc,
    debounce,
    prefersReducedMotion,
    fmtRM,
    fmtDate,
    fmtDateTime,
    fmtRange,
    fmtNumber,
    plural,
    toISO,
    parseISO,
    todayISO,
    addDays,
    diffDays,
    eachDay,
    weekday,
    monthLabel,
    toast,
    modalOpen,
    modalClose,
    confirm: confirmDialog,
    initReveal,
    countUp,
    scrollToId,
    scrollSpy,
    setInvalid,
    clearInvalid,
    readFile,
    ready,
    icons: ICONS
  };
})(window);
