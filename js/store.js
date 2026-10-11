/* ==========================================================================
   Woody Forest Homestay - store.js
   localStorage data layer shared by the landing page and the admin
   dashboard. Owns: settings, bookings, admin account + session, seed data,
   the pricing / availability engine, derived customers and statistics.
   Requires ui.js (date + format helpers). Exposes window.Store.
   ========================================================================== */
(function (global) {
  "use strict";

  const U = global.UI;

  const KEYS = {
    settings: "wf_settings",
    bookings: "wf_bookings",
    admin: "wf_admin",
    session: "wf_session",
    seed: "wf_seed_v"
  };
  const SEED_VERSION = 1;
  const SESSION_HOURS = 12;
  const STATUS = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"];
  const DEMO_ADMIN = { username: "owner", password: "woody123" };

  /* ---------------------------------------------------------- persistence */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      global.dispatchEvent(new CustomEvent("store:change", { detail: { key } }));
      return true;
    } catch (e) {
      // QuotaExceededError - most likely too many base64 images
      global.dispatchEvent(new CustomEvent("store:error", { detail: { key, error: e } }));
      return false;
    }
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  /* ------------------------------------------------------- default settings */
  const DEFAULT_SETTINGS = {
    name: "Woody Forest Homestay",
    tagline: "A timber cabin wrapped in rainforest",
    description:
      "Tucked into the green hills of Kelantan, Woody Forest is a private three-bedroom timber homestay built for slow mornings and starry nights. Wake to birdsong, take breakfast on the deck above the canopy, and let the forest do the rest.",
    address: "Lot 128, Kampung Hutan Kayu, Jeli, Kelantan",
    whatsapp: "60129876543",
    email: "stay@woodyforest.my",
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: [
      { icon: "wifi", label: "High-speed WiFi" },
      { icon: "car", label: "Free parking" },
      { icon: "bbq", label: "BBQ pit" },
      { icon: "kitchen", label: "Full kitchen" },
      { icon: "ac", label: "Air-conditioned rooms" },
      { icon: "deck", label: "Canopy deck" },
      { icon: "river", label: "River walk 5 min" },
      { icon: "pet", label: "Pet friendly" }
    ],
    pricing: {
      weekday: 250,
      weekend: 320,
      weekendNights: [5, 6],
      cleaningFee: 50,
      minNights: 1,
      peakRanges: [
        { id: "peak-raya", label: "Year-end holidays", from: "2026-12-18", to: "2027-01-03", price: 420 }
      ]
    },
    blockedDates: [{ id: "blk-1", from: "2026-11-20", to: "2026-11-22", reason: "Owner maintenance" }],
    bank: { bankName: "Maybank", accountNo: "5621 0432 7788", holder: "Woody Forest Homestay" },
    images: [
      { id: "img-hero", src: "assets/img/hero-exterior.jpg", caption: "The cabin at golden hour", isHero: true, order: 0 },
      { id: "img-deck", src: "assets/img/deck.jpg", caption: "Canopy deck and hammock", isHero: false, order: 1 },
      { id: "img-living", src: "assets/img/living-room.jpg", caption: "Open-plan living room", isHero: false, order: 2 },
      { id: "img-bed1", src: "assets/img/bedroom-main.jpg", caption: "Master bedroom", isHero: false, order: 3 },
      { id: "img-bed2", src: "assets/img/bedroom-second.jpg", caption: "Second bedroom", isHero: false, order: 4 },
      { id: "img-bath", src: "assets/img/bathroom.jpg", caption: "Stone and timber bathroom", isHero: false, order: 5 },
      { id: "img-breakfast", src: "assets/img/breakfast.jpg", caption: "Breakfast on the deck", isHero: false, order: 6 },
      { id: "img-night", src: "assets/img/exterior-night.jpg", caption: "Blue hour", isHero: false, order: 7 }
    ]
  };

  /* --------------------------------------------------------------- settings */
  function getSettings() {
    const saved = read(KEYS.settings, null);
    if (!saved) return structuredClone(DEFAULT_SETTINGS);
    return { ...structuredClone(DEFAULT_SETTINGS), ...saved, pricing: { ...DEFAULT_SETTINGS.pricing, ...(saved.pricing || {}) } };
  }

  function saveSettings(patch) {
    const next = { ...getSettings(), ...patch };
    return write(KEYS.settings, next) ? next : null;
  }

  function getImages() {
    return getSettings()
      .images.slice()
      .sort((a, b) => a.order - b.order);
  }

  /** Seeded photo paths are relative to the site root; pages in sub-folders set Store.assetBase = "../". */
  function imageUrl(src) {
    if (!src || /^(data:|https?:|\/)/.test(src)) return src;
    return (global.Store && global.Store.assetBase ? global.Store.assetBase : "") + src;
  }

  function getHeroImages() {
    const imgs = getImages();
    const hero = imgs.filter((i) => i.isHero);
    return hero.length ? hero.concat(imgs.filter((i) => !i.isHero)).slice(0, 4) : imgs.slice(0, 4);
  }

  /* ---------------------------------------------------------------- pricing */
  function nightPrice(iso, pricing = getSettings().pricing) {
    const peak = (pricing.peakRanges || []).find((r) => iso >= r.from && iso <= r.to);
    if (peak) return { price: Number(peak.price), kind: "peak", label: peak.label };
    const dow = U.weekday(iso);
    if ((pricing.weekendNights || []).includes(dow)) return { price: Number(pricing.weekend), kind: "weekend" };
    return { price: Number(pricing.weekday), kind: "weekday" };
  }

  /** Set of ISO nights that cannot be booked (pending/confirmed stays + blocked ranges). */
  function unavailableNights({ ignoreRef = null } = {}) {
    const set = new Set();
    getBookings().forEach((b) => {
      if (b.ref === ignoreRef) return;
      if (b.status === "PENDING" || b.status === "CONFIRMED" || b.status === "COMPLETED") {
        U.eachDay(b.checkIn, b.checkOut).forEach((d) => set.add(d));
      }
    });
    (getSettings().blockedDates || []).forEach((r) => {
      U.eachDay(r.from, U.addDays(r.to, 1)).forEach((d) => set.add(d));
    });
    return set;
  }

  function blockedNights() {
    const set = new Set();
    (getSettings().blockedDates || []).forEach((r) => {
      U.eachDay(r.from, U.addDays(r.to, 1)).forEach((d) => set.add(d));
    });
    return set;
  }

  /**
   * quote(checkIn, checkOut, guests) -> { ok, errors, nights[], subtotal, cleaningFee, total }
   * Pure calculation + validation; never writes.
   */
  function quote(checkIn, checkOut, guests, { ignoreRef = null } = {}) {
    const s = getSettings();
    const p = s.pricing;
    const errors = [];
    const today = U.todayISO();
    const nightsCount = U.diffDays(checkIn, checkOut);

    if (!checkIn || !checkOut) errors.push("Choose your check-in and check-out dates.");
    else {
      if (checkIn < today) errors.push("Check-in cannot be in the past.");
      if (nightsCount < 1) errors.push("Check-out must be after check-in.");
      else if (nightsCount < p.minNights) errors.push(`Minimum stay is ${U.plural(p.minNights, "night")}.`);
    }
    const g = Number(guests);
    if (!g || g < 1) errors.push("Tell us how many guests are coming.");
    else if (g > s.maxGuests) errors.push(`This homestay sleeps up to ${s.maxGuests} guests.`);

    let nights = [];
    if (checkIn && checkOut && nightsCount >= 1) {
      const taken = unavailableNights({ ignoreRef });
      nights = U.eachDay(checkIn, checkOut).map((date) => ({ date, ...nightPrice(date, p) }));
      const clash = nights.filter((n) => taken.has(n.date));
      if (clash.length) errors.push(`${U.fmtDate(clash[0].date, { year: false })} is already booked. Please pick other dates.`);
    }

    const subtotal = nights.reduce((sum, n) => sum + n.price, 0);
    const cleaningFee = nights.length ? Number(p.cleaningFee) || 0 : 0;
    return {
      ok: errors.length === 0,
      errors,
      nights,
      nightsCount: nights.length,
      subtotal,
      cleaningFee,
      total: subtotal + cleaningFee
    };
  }

  /* --------------------------------------------------------------- bookings */
  function withComputedStatus(b) {
    if (b.status === "CONFIRMED" && b.checkOut <= U.todayISO()) return { ...b, status: "COMPLETED" };
    return b;
  }

  function getBookings() {
    return read(KEYS.bookings, []).map(withComputedStatus);
  }

  function getBooking(ref) {
    return getBookings().find((b) => b.ref === String(ref).toUpperCase()) || null;
  }

  function nextRef() {
    const year = new Date().getFullYear();
    const prefix = `WF-${year}-`;
    const max = read(KEYS.bookings, [])
      .filter((b) => b.ref.startsWith(prefix))
      .reduce((m, b) => Math.max(m, Number(b.ref.slice(prefix.length)) || 0), 0);
    return `${prefix}${String(max + 1).padStart(4, "0")}`;
  }

  /**
   * createBooking({ name, phone, email, checkIn, checkOut, guests, receipt })
   * Re-validates through quote(); returns { ok, booking } or { ok:false, errors }.
   */
  function createBooking(data) {
    const q = quote(data.checkIn, data.checkOut, data.guests);
    const errors = q.errors.slice();
    if (!data.name || data.name.trim().length < 2) errors.push("Please enter your full name.");
    if (digitsOnly(data.phone).length < 9) errors.push("Please enter a valid phone number.");
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("That email address does not look right.");
    if (!data.receipt) errors.push("Please upload your bank transfer receipt.");
    if (errors.length) return { ok: false, errors };

    const now = new Date().toISOString();
    const booking = {
      ref: nextRef(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: (data.email || "").trim(),
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights: q.nightsCount,
      guests: Number(data.guests),
      breakdown: { nights: q.nights, cleaningFee: q.cleaningFee },
      total: q.total,
      receipt: data.receipt,
      status: "PENDING",
      note: "",
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, status: "PENDING", by: "guest" }]
    };
    const all = read(KEYS.bookings, []);
    all.push(booking);
    if (!write(KEYS.bookings, all)) return { ok: false, errors: ["Storage is full. Try a smaller receipt image."] };
    return { ok: true, booking };
  }

  function updateBooking(ref, patch) {
    const all = read(KEYS.bookings, []);
    const i = all.findIndex((b) => b.ref === ref);
    if (i === -1) return null;
    all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
    return write(KEYS.bookings, all) ? withComputedStatus(all[i]) : null;
  }

  function setBookingStatus(ref, status, note = "") {
    if (!STATUS.includes(status)) throw new Error(`Unknown status ${status}`);
    const b = read(KEYS.bookings, []).find((x) => x.ref === ref);
    if (!b) return null;
    const history = (b.history || []).concat([{ at: new Date().toISOString(), status, by: "owner", note }]);
    return updateBooking(ref, { status, note: note || b.note || "", history });
  }

  /** Guest tracker: ref + phone (last 4 digits must match). */
  function trackBooking(ref, phone) {
    const b = getBooking(String(ref).trim().toUpperCase());
    if (!b) return null;
    const a = digitsOnly(phone).slice(-4);
    const c = digitsOnly(b.phone).slice(-4);
    return a && a === c ? b : null;
  }

  /** Phone digits with the Malaysian country code and leading zero stripped, so 012..., 6012... and +6012... all match. */
  function phoneKey(phone) {
    let d = digitsOnly(phone);
    if (d.startsWith("60")) d = d.slice(2);
    if (d.startsWith("0")) d = d.slice(1);
    return d;
  }

  /** Guest tracker by phone only: every booking made with that number, newest check-in first. */
  function trackByPhone(phone) {
    const key = phoneKey(phone);
    if (key.length < 7) return [];
    return getBookings()
      .filter((b) => phoneKey(b.phone) === key)
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  }

  /* -------------------------------------------------------------- customers */
  function getCustomers() {
    const map = new Map();
    getBookings()
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .forEach((b) => {
        const key = digitsOnly(b.phone);
        const c = map.get(key) || {
          id: key,
          name: b.name,
          phone: b.phone,
          email: b.email,
          bookings: [],
          stays: 0,
          totalSpent: 0,
          lastStay: null,
          firstSeen: b.createdAt
        };
        c.name = b.name;
        c.phone = b.phone;
        if (b.email) c.email = b.email;
        c.bookings.push(b);
        if (b.status === "CONFIRMED" || b.status === "COMPLETED") {
          c.stays += 1;
          c.totalSpent += b.total;
          if (!c.lastStay || b.checkIn > c.lastStay) c.lastStay = b.checkIn;
        }
        map.set(key, c);
      });
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }

  /* -------------------------------------------------------------- statistics */
  function monthKey(iso) {
    return iso.slice(0, 7);
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  /** Last `n` months as [{ key:"2026-10", label:"Oct 2026", year, month }], oldest first. */
  function lastMonths(n = 6) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-MY", { month: "short", year: "2-digit" }),
        year: d.getFullYear(),
        month: d.getMonth()
      });
    }
    return out;
  }

  /** Per-month series for charts: bookings made, revenue (confirmed/completed by check-in month), occupancy %. */
  function monthlySeries(n = 6) {
    const months = lastMonths(n);
    const bookings = getBookings();
    return months.map((m) => {
      const made = bookings.filter((b) => monthKey(b.createdAt) === m.key).length;
      const stays = bookings.filter((b) => (b.status === "CONFIRMED" || b.status === "COMPLETED") && monthKey(b.checkIn) === m.key);
      const revenue = stays.reduce((s, b) => s + b.total, 0);
      const bookedNights = new Set();
      bookings.forEach((b) => {
        if (b.status !== "CONFIRMED" && b.status !== "COMPLETED") return;
        U.eachDay(b.checkIn, b.checkOut).forEach((d) => {
          if (monthKey(d) === m.key) bookedNights.add(d);
        });
      });
      const occupancy = Math.round((bookedNights.size / daysInMonth(m.year, m.month)) * 100);
      return { ...m, bookings: made, revenue, occupancy, nights: bookedNights.size };
    });
  }

  function statusSplit() {
    const split = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, REJECTED: 0, CANCELLED: 0 };
    getBookings().forEach((b) => {
      split[b.status] = (split[b.status] || 0) + 1;
    });
    return split;
  }

  function kpis() {
    const today = U.todayISO();
    const bookings = getBookings();
    const thisMonth = monthlySeries(1)[0];
    const in30 = U.addDays(today, 30);
    return {
      pending: bookings.filter((b) => b.status === "PENDING").length,
      checkInsToday: bookings.filter((b) => b.status === "CONFIRMED" && b.checkIn === today).length,
      stayingNow: bookings.filter((b) => b.status === "CONFIRMED" && b.checkIn <= today && b.checkOut > today).length,
      occupancy: thisMonth.occupancy,
      revenue: thisMonth.revenue,
      upcoming: bookings
        .filter((b) => b.status === "CONFIRMED" && b.checkIn >= today && b.checkIn <= in30)
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
      needsConfirmation: bookings
        .filter((b) => b.status === "PENDING")
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    };
  }

  /* ------------------------------------------------------------- admin auth */
  async function sha256(text) {
    if (global.crypto && global.crypto.subtle) {
      const buf = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    // Non-secure context fallback (FNV-1a) - keeps the demo working over plain file://
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return "fnv-" + h.toString(16);
  }

  async function ensureAdmin() {
    if (read(KEYS.admin, null)) return;
    write(KEYS.admin, { username: DEMO_ADMIN.username, passwordHash: await sha256(DEMO_ADMIN.password) });
  }

  async function login(username, password) {
    await ensureAdmin();
    const admin = read(KEYS.admin, null);
    if (!admin || String(username).trim().toLowerCase() !== admin.username.toLowerCase()) return false;
    if ((await sha256(password)) !== admin.passwordHash) return false;
    write(KEYS.session, { token: uid(), expiresAt: Date.now() + SESSION_HOURS * 3600000, username: admin.username });
    return true;
  }

  function logout() {
    localStorage.removeItem(KEYS.session);
  }

  function isAuthed() {
    const s = read(KEYS.session, null);
    if (!s || !s.token) return false;
    if (Date.now() > s.expiresAt) {
      logout();
      return false;
    }
    return true;
  }

  function currentUser() {
    const s = read(KEYS.session, null);
    return s ? s.username : null;
  }

  async function changePassword(currentPassword, nextPassword) {
    const admin = read(KEYS.admin, null);
    if (!admin) return { ok: false, error: "No owner account found." };
    if ((await sha256(currentPassword)) !== admin.passwordHash) return { ok: false, error: "Current password is incorrect." };
    if (!nextPassword || nextPassword.length < 6) return { ok: false, error: "New password needs at least 6 characters." };
    write(KEYS.admin, { ...admin, passwordHash: await sha256(nextPassword) });
    return { ok: true };
  }

  function changeUsername(username) {
    const admin = read(KEYS.admin, null);
    if (!admin) return false;
    const clean = String(username || "").trim();
    if (clean.length < 3) return false;
    write(KEYS.admin, { ...admin, username: clean });
    const s = read(KEYS.session, null);
    if (s) write(KEYS.session, { ...s, username: clean });
    return true;
  }

  /* ---------------------------------------------------------------- images */
  /**
   * resizeImage(file, { maxPx: 1200, quality: 0.82 }) -> Promise<dataURL>
   * Shrinks an uploaded image on a canvas so receipts and photos fit localStorage.
   */
  function resizeImage(file, { maxPx = 1200, quality = 0.82 } = {}) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("That image could not be read."));
      };
      img.src = url;
    });
  }

  /** Approximate bytes used by this site's keys (for the Setting > Images hint). */
  function storageUsage() {
    let bytes = 0;
    Object.values(KEYS).forEach((k) => {
      const v = localStorage.getItem(k);
      if (v) bytes += v.length * 2;
    });
    return bytes;
  }

  /* ------------------------------------------------------------------- seed */
  /** A clearly-labelled sample receipt drawn as SVG, so demo bookings have something to show. */
  function sampleReceipt(name, amount, dateISO, ref) {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <rect width="720" height="960" fill="#f4f1ea"/>
  <rect x="40" y="40" width="640" height="880" rx="24" fill="#ffffff" stroke="#d9d2c3"/>
  <text x="360" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1f4d35">SAMPLE TRANSFER RECEIPT</text>
  <text x="360" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#8a6236">Demo data - not a real bank document</text>
  <line x1="80" y1="200" x2="640" y2="200" stroke="#e5dfd2"/>
  <text x="80" y="260" font-family="Arial, sans-serif" font-size="18" fill="#6b7570">Status</text>
  <text x="640" y="260" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#2f7a52">Successful</text>
  <text x="80" y="320" font-family="Arial, sans-serif" font-size="18" fill="#6b7570">Amount</text>
  <text x="640" y="320" text-anchor="end" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#1b1f1c">RM ${amount}.00</text>
  <text x="80" y="390" font-family="Arial, sans-serif" font-size="18" fill="#6b7570">From</text>
  <text x="640" y="390" text-anchor="end" font-family="Arial, sans-serif" font-size="20" fill="#1b1f1c">${name}</text>
  <text x="80" y="440" font-family="Arial, sans-serif" font-size="18" fill="#6b7570">To</text>
  <text x="640" y="440" text-anchor="end" font-family="Arial, sans-serif" font-size="20" fill="#1b1f1c">Woody Forest Homestay</text>
  <text x="80" y="490" font-family="Arial, sans-serif" font-size="18" fill="#6b7570">Account</text>
  <text x="640" y="490" text-anchor="end" font-family="Arial, sans-serif" font-size="20" fill="#1b1f1c">5621 0432 7788</text>
  <text x="80" y="540" font-family="Arial, sans-serif" font-size="18" fill="#6b7570">Reference</text>
  <text x="640" y="540" text-anchor="end" font-family="Arial, sans-serif" font-size="20" fill="#1b1f1c">${ref}</text>
  <text x="80" y="590" font-family="Arial, sans-serif" font-size="18" fill="#6b7570">Date</text>
  <text x="640" y="590" text-anchor="end" font-family="Arial, sans-serif" font-size="20" fill="#1b1f1c">${dateISO}</text>
  <line x1="80" y1="640" x2="640" y2="640" stroke="#e5dfd2"/>
  <text x="360" y="860" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#9aa39e">Generated for the Woody Forest Homestay demo</text>
</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
  }

  const SEED_GUESTS = [
    { name: "Aisyah Rahman", phone: "012-345 6789", email: "aisyah.r@example.com" },
    { name: "Hafiz Ismail", phone: "013-987 6543", email: "hafiz.i@example.com" },
    { name: "Mei Lin Tan", phone: "016-222 8910", email: "meilin.tan@example.com" },
    { name: "Arjun Pillai", phone: "017-555 0192", email: "arjun.p@example.com" },
    { name: "Nurul Huda", phone: "019-808 1123", email: "nurul.h@example.com" },
    { name: "Daniel Wong", phone: "011-1200 4455", email: "daniel.w@example.com" },
    { name: "Farah Zulkifli", phone: "014-737 2201", email: "farah.z@example.com" }
  ];

  // [guestIndex, checkIn offset in days from today, nights, guests, status, createdAt offset]
  const SEED_PLAN = [
    [0, -95, 3, 2, "CONFIRMED", -110],
    [1, -80, 2, 4, "CONFIRMED", -92],
    [2, -62, 2, 2, "CONFIRMED", -70],
    [3, -50, 1, 3, "REJECTED", -58],
    [4, -38, 3, 5, "CONFIRMED", -49],
    [0, -24, 2, 2, "CONFIRMED", -31],
    [5, -10, 2, 2, "CANCELLED", -20],
    [6, -3, 4, 6, "CONFIRMED", -12],
    [2, 7, 2, 3, "CONFIRMED", -6],
    [0, 1, 3, 2, "PENDING", -2],
    [1, 9, 1, 2, "PENDING", -1],
    [3, 20, 3, 4, "PENDING", 0]
  ];

  function buildSeedBookings() {
    const today = U.todayISO();
    const settings = getSettings();
    const list = [];
    SEED_PLAN.forEach(([gi, offset, nights, guests, status, createdOffset], i) => {
      const g = SEED_GUESTS[gi];
      const checkIn = U.addDays(today, offset);
      const checkOut = U.addDays(checkIn, nights);
      const nightRows = U.eachDay(checkIn, checkOut).map((date) => ({ date, ...nightPrice(date, settings.pricing) }));
      const subtotal = nightRows.reduce((s, n) => s + n.price, 0);
      const total = subtotal + settings.pricing.cleaningFee;
      const createdDate = new Date(U.parseISO(U.addDays(today, createdOffset)));
      createdDate.setHours(9 + (i % 9), (i * 7) % 60, 0, 0);
      const createdAt = createdDate.toISOString();
      const year = createdDate.getFullYear();
      const ref = `WF-${year}-${String(i + 1).padStart(4, "0")}`;
      const history = [{ at: createdAt, status: "PENDING", by: "guest" }];
      let note = "";
      if (status !== "PENDING") {
        const decided = new Date(createdDate.getTime() + 5 * 3600000).toISOString();
        if (status === "REJECTED") note = "Transfer amount did not match the booking total.";
        if (status === "CANCELLED") note = "Guest requested cancellation by WhatsApp.";
        history.push({ at: decided, status, by: "owner", note });
      }
      list.push({
        ref,
        name: g.name,
        phone: g.phone,
        email: g.email,
        checkIn,
        checkOut,
        nights,
        guests,
        breakdown: { nights: nightRows, cleaningFee: settings.pricing.cleaningFee },
        total,
        receipt: sampleReceipt(g.name, total, createdAt.slice(0, 10), ref),
        status,
        note,
        createdAt,
        updatedAt: createdAt,
        history
      });
    });
    return list;
  }

  function seedIfNeeded() {
    if (read(KEYS.seed, 0) === SEED_VERSION && read(KEYS.bookings, null)) return false;
    write(KEYS.settings, structuredClone(DEFAULT_SETTINGS));
    write(KEYS.bookings, buildSeedBookings());
    write(KEYS.seed, SEED_VERSION);
    return true;
  }

  function resetAll() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    seedIfNeeded();
  }

  /* ------------------------------------------------------------------- init */
  async function init() {
    seedIfNeeded();
    await ensureAdmin();
    // another tab (e.g. the dashboard) wrote to our keys: re-render as if we changed it
    global.addEventListener("storage", (e) => {
      if (e.key && e.key.startsWith("wf_")) global.dispatchEvent(new CustomEvent("store:change", { detail: { key: e.key, remote: true } }));
    });
  }

  global.Store = {
    KEYS,
    STATUS,
    DEMO_ADMIN,
    init,
    seedIfNeeded,
    resetAll,
    // settings
    getSettings,
    saveSettings,
    getImages,
    getHeroImages,
    imageUrl,
    assetBase: "",
    // pricing + availability
    nightPrice,
    quote,
    unavailableNights,
    blockedNights,
    // bookings
    getBookings,
    getBooking,
    createBooking,
    updateBooking,
    setBookingStatus,
    trackBooking,
    trackByPhone,
    phoneKey,
    // derived
    getCustomers,
    monthlySeries,
    lastMonths,
    statusSplit,
    kpis,
    // auth
    login,
    logout,
    isAuthed,
    currentUser,
    changePassword,
    changeUsername,
    // media
    resizeImage,
    storageUsage,
    digitsOnly
  };
})(window);
