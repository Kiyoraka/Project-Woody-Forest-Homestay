/* ==========================================================================
   Woody Forest Homestay - charts.js
   Analysis view for the owner dashboard: bookings, revenue and occupancy
   per month, booking status split and a top customers table.
   Depends on window.Chart (Chart.js 4.x, loaded before this file),
   window.Store and window.UI.
   Exposes a single global: window.Charts = { render, destroy }
   ========================================================================== */
(function (global) {
  "use strict";

  const RANGES = [3, 6, 12];
  const DEFAULT_MONTHS = 6;
  const TOP_CUSTOMERS = 5;

  const STATUS_ORDER = ["PENDING", "CONFIRMED", "COMPLETED", "REJECTED", "CANCELLED"];
  const STATUS_LABELS = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled"
  };
  // Palette key (see palette()) used for each status slice.
  const STATUS_COLORS = {
    PENDING: "warning",
    CONFIRMED: "success",
    COMPLETED: "info",
    REJECTED: "danger",
    CANCELLED: "muted"
  };

  // Hex fallbacks in case a design token is missing or empty.
  const FALLBACK = {
    "--forest-900": "#122a1d",
    "--forest-700": "#1f4d35",
    "--forest-500": "#2f7a52",
    "--wood": "#b8894f",
    "--wood-dark": "#8a6236",
    "--cream-dark": "#ece4d3",
    "--muted": "#6b7570",
    "--ink": "#1b1f1c",
    "--line": "rgba(27, 31, 28, 0.1)",
    "--white": "#ffffff",
    "--success": "#2f7a52",
    "--warning": "#c98a17",
    "--danger": "#b9402f",
    "--info": "#3b6fb5",
    "--font-body": '"Manrope", "Segoe UI", system-ui, sans-serif'
  };

  // Live Chart.js instances, cleared by destroy().
  let instances = [];

  /* ---------------------------------------------------------------- Tokens */
  function token(name) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || FALLBACK[name] || "";
  }

  /** Resolve every color / font the charts need from the CSS custom properties. */
  function palette() {
    return {
      forest900: token("--forest-900"),
      forest700: token("--forest-700"),
      forest500: token("--forest-500"),
      wood: token("--wood"),
      woodDark: token("--wood-dark"),
      creamDark: token("--cream-dark"),
      muted: token("--muted"),
      ink: token("--ink"),
      line: token("--line"),
      white: token("--white"),
      success: token("--success"),
      warning: token("--warning"),
      danger: token("--danger"),
      info: token("--info"),
      font: token("--font-body")
    };
  }

  /** "#2f7a52" + 0.15 -> "rgba(47, 122, 82, 0.15)". Non-hex input uses `fallbackHex`. */
  function withAlpha(color, alpha, fallbackHex) {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : fallbackHex;
    let h = hex.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  /* ---------------------------------------------------------------- Markup */
  function toolbarHTML(months) {
    const options = RANGES.map(
      (n) => `<option value="${n}"${n === months ? " selected" : ""}>${n} months</option>`
    ).join("");
    return `
      <div class="charts-toolbar">
        <div>
          <h2 class="h2">Analysis</h2>
          <p class="muted small">Bookings, revenue and occupancy over time.</p>
        </div>
        <label class="field charts-range">
          <span class="label">Range</span>
          <select class="select" data-range>${options}</select>
        </label>
      </div>`;
  }

  function chartCardHTML(key, title, ariaLabel, donut) {
    const canvasClass = donut ? "chart-card__canvas chart-card__canvas--donut" : "chart-card__canvas";
    return `
      <section class="card card--pad chart-card">
        <h3 class="chart-card__title">${title}</h3>
        <div class="${canvasClass}"><canvas data-chart="${key}" role="img" aria-label="${ariaLabel}"></canvas></div>
      </section>`;
  }

  function gridHTML() {
    return `
      <div class="charts-grid">
        ${chartCardHTML("bookings", "Bookings per month", "Bar chart of bookings per month")}
        ${chartCardHTML("revenue", "Revenue per month", "Line chart of revenue per month")}
        ${chartCardHTML("occupancy", "Occupancy per month", "Bar chart of occupancy percentage per month")}
        ${chartCardHTML("status", "Booking status", "Doughnut chart of bookings by status", true)}
      </div>`;
  }

  function customerRowHTML(c) {
    return `
      <tr>
        <td>
          <strong>${UI.esc(c.name)}</strong>
          <div class="muted small">${UI.esc(c.phone)}</div>
        </td>
        <td>${UI.esc(UI.fmtNumber(c.stays))}</td>
        <td class="num">${UI.esc(UI.fmtRM(c.totalSpent))}</td>
        <td>${UI.esc(UI.fmtDate(c.lastStay))}</td>
      </tr>`;
  }

  /** Top customers by total spent, only those with at least one stay. */
  function topCustomers() {
    return Store.getCustomers()
      .filter((c) => c.stays > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, TOP_CUSTOMERS);
  }

  function tableHTML(customers) {
    const rows = customers.length
      ? customers.map(customerRowHTML).join("")
      : '<tr><td colspan="4" class="muted">No completed stays yet.</td></tr>';
    return `
      <section class="card chart-card chart-card--table">
        <h3 class="chart-card__title">Top customers</h3>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Customer</th><th>Stays</th><th class="num">Total spent</th><th>Last stay</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  }

  /* --------------------------------------------------- Shared chart options */
  function fontSpec(p, extra) {
    return Object.assign({ family: p.font, size: 12 }, extra);
  }

  function tooltipOptions(p, label) {
    return {
      backgroundColor: p.forest900,
      titleColor: p.white,
      bodyColor: p.white,
      titleFont: fontSpec(p, { weight: "700" }),
      bodyFont: fontSpec(p),
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      callbacks: label ? { label } : {}
    };
  }

  /** Common options for every chart (legend hidden by default). */
  function baseOptions(p, tooltipLabel) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: UI.prefersReducedMotion() ? false : { duration: 700, easing: "easeOutCubic" },
      plugins: {
        legend: { display: false },
        tooltip: tooltipOptions(p, tooltipLabel)
      }
    };
  }

  /** Cartesian axes: horizontal grid lines only, muted ticks. `y` merges into the y axis. */
  function scaleOptions(p, y = {}) {
    const ticks = { color: p.muted, font: fontSpec(p), padding: 8 };
    return {
      x: { grid: { display: false }, border: { display: false }, ticks },
      y: Object.assign(
        { beginAtZero: true, grid: { color: p.line, drawTicks: false }, border: { display: false } },
        y,
        { ticks: Object.assign({}, ticks, y.ticks) }
      )
    };
  }

  /** Create a chart and remember it so destroy() can clean it up. */
  function make(canvas, config) {
    if (!canvas) return null;
    const chart = new global.Chart(canvas, config);
    instances.push(chart);
    return chart;
  }

  /* ---------------------------------------------------------------- Charts */
  function bookingsChart(canvas, series, p) {
    const options = baseOptions(p, (ctx) => UI.plural(ctx.parsed.y, "booking"));
    options.scales = scaleOptions(p, { ticks: { precision: 0 } });
    return make(canvas, {
      type: "bar",
      data: {
        labels: series.map((m) => m.label),
        datasets: [{
          label: "Bookings",
          data: series.map((m) => m.bookings),
          backgroundColor: p.forest500,
          hoverBackgroundColor: p.forest700,
          borderRadius: 8,
          maxBarThickness: 44
        }]
      },
      options
    });
  }

  function revenueChart(canvas, series, p) {
    const options = baseOptions(p, (ctx) => UI.fmtRM(ctx.parsed.y));
    options.scales = scaleOptions(p, { ticks: { maxTicksLimit: 5, callback: (v) => UI.fmtRM(v) } });
    return make(canvas, {
      type: "line",
      data: {
        labels: series.map((m) => m.label),
        datasets: [{
          label: "Revenue",
          data: series.map((m) => m.revenue),
          borderColor: p.forest700,
          borderWidth: 2.5,
          backgroundColor: withAlpha(p.forest500, 0.15, FALLBACK["--forest-500"]),
          fill: "origin",
          tension: 0.35,
          pointBackgroundColor: p.forest700,
          pointBorderColor: p.white,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options
    });
  }

  function occupancyChart(canvas, series, p) {
    const label = (ctx) => {
      const m = series[ctx.dataIndex];
      return `${m.occupancy}% (${UI.plural(m.nights, "night")})`;
    };
    const options = baseOptions(p, label);
    options.scales = scaleOptions(p, {
      min: 0,
      max: 100,
      ticks: { stepSize: 25, callback: (v) => `${v}%` }
    });
    return make(canvas, {
      type: "bar",
      data: {
        labels: series.map((m) => m.label),
        datasets: [{
          label: "Occupancy",
          data: series.map((m) => m.occupancy),
          backgroundColor: p.wood,
          hoverBackgroundColor: p.woodDark,
          borderRadius: 8,
          maxBarThickness: 44
        }]
      },
      options
    });
  }

  /** Inline plugin: draws the booking total in the hole of the doughnut. */
  function centerTextPlugin(text, caption, p) {
    return {
      id: "wfCenterText",
      afterDraw(chart) {
        const area = chart.chartArea;
        if (!area) return;
        const { ctx } = chart;
        const x = (area.left + area.right) / 2;
        const y = (area.top + area.bottom) / 2;
        const radius = Math.min(area.right - area.left, area.bottom - area.top) / 2;
        const size = Math.max(16, Math.min(34, Math.round(radius * 0.3)));
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = p.ink;
        ctx.font = `700 ${size}px ${p.font}`;
        ctx.fillText(text, x, y - size * 0.3);
        ctx.fillStyle = p.muted;
        ctx.font = `600 ${Math.max(11, Math.round(size * 0.38))}px ${p.font}`;
        ctx.fillText(caption, x, y + size * 0.55);
        ctx.restore();
      }
    };
  }

  function statusChart(canvas, split, p) {
    const keys = STATUS_ORDER.filter((k) => (split[k] || 0) > 0);
    const total = Object.values(split).reduce((s, n) => s + (Number(n) || 0), 0);
    const empty = keys.length === 0;
    const label = (ctx) => {
      const pct = total ? Math.round((ctx.parsed / total) * 100) : 0;
      return `${ctx.label}: ${UI.fmtNumber(ctx.parsed)} (${pct}%)`;
    };
    const options = baseOptions(p, label);
    options.cutout = "68%";
    options.plugins.tooltip.enabled = !empty;
    options.plugins.legend = {
      display: true,
      position: "bottom",
      labels: { color: p.muted, font: fontSpec(p), usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8, padding: 14 }
    };
    return make(canvas, {
      type: "doughnut",
      data: {
        // With no bookings at all, a single neutral ring keeps the card from looking broken.
        labels: empty ? ["No bookings yet"] : keys.map((k) => STATUS_LABELS[k]),
        datasets: [{
          data: empty ? [1] : keys.map((k) => split[k]),
          backgroundColor: empty ? [p.creamDark] : keys.map((k) => p[STATUS_COLORS[k]]),
          borderColor: p.white,
          borderWidth: 2,
          hoverOffset: empty ? 0 : 6
        }]
      },
      options,
      plugins: [centerTextPlugin(UI.fmtNumber(total), total === 1 ? "booking" : "bookings", p)]
    });
  }

  /* ---------------------------------------------------------------- Public */
  function destroy() {
    instances.forEach((chart) => {
      try {
        chart.destroy();
      } catch (e) {
        /* canvas already detached - nothing to clean */
      }
    });
    instances = [];
  }

  function normalizeMonths(value) {
    const n = Number(value);
    return RANGES.includes(n) ? n : DEFAULT_MONTHS;
  }

  /** Range select re-renders the whole view with the new month count. */
  function bindRange(rootEl, opts) {
    const select = UI.qs("[data-range]", rootEl);
    if (!select) return;
    select.addEventListener("change", () => {
      render(rootEl, Object.assign({}, opts, { months: Number(select.value) }));
      const fresh = UI.qs("[data-range]", rootEl);
      if (fresh) fresh.focus();
    });
  }

  function drawCharts(rootEl, months) {
    const p = palette();
    const series = Store.monthlySeries(months);
    const canvas = (key) => UI.qs(`canvas[data-chart="${key}"]`, rootEl);
    bookingsChart(canvas("bookings"), series, p);
    revenueChart(canvas("revenue"), series, p);
    occupancyChart(canvas("occupancy"), series, p);
    statusChart(canvas("status"), Store.statusSplit(), p);
  }

  /**
   * Build the Analysis view inside `rootEl` (replacing its contents).
   * opts.months: 3 | 6 | 12 (default 6). Safe to call repeatedly.
   */
  function render(rootEl, opts = {}) {
    if (!rootEl) return;
    destroy();
    const months = normalizeMonths(opts.months == null ? DEFAULT_MONTHS : opts.months);
    const settings = Object.assign({}, opts, { months });

    if (typeof global.Chart !== "function") {
      rootEl.innerHTML = toolbarHTML(months) + '<div class="empty">Charts could not load (Chart.js offline).</div>';
      bindRange(rootEl, settings);
      return;
    }

    rootEl.innerHTML = toolbarHTML(months) + gridHTML() + tableHTML(topCustomers());
    bindRange(rootEl, settings);
    drawCharts(rootEl, months);
  }

  global.Charts = { render, destroy };
})(window);
