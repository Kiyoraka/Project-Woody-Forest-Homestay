/* ==========================================================================
   Woody Forest Homestay - admin/view-setting.js
   Registers its renderer on window.Admin (see admin/core.js). Requires
   ui.js, store.js and admin/core.js loaded first.
   ========================================================================== */
(function () {
  "use strict";

  const { qs, qsa, esc, el } = UI;
  const { renderers } = Admin;
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
})();
