/* File: js/helpers.js
 * Purpose: Small helpers shared by all chart files: chart sizing, SVG creation with accessible title/description,
 *          motion settings, the shared tooltip, focusable marks, bar paths, axes, data tables, chart messages,
 *          reveal-on-scroll (revealOnce) and filling the data-driven numbers in the text.
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

// ---------- Motion ----------
// A11Y: honour the operating-system "reduce motion" setting, and the site's own "Reduce motion" reading setting
// (body.reduce-motion, set from the accessibility panel in the header), for every D3 transition
const prefersReducedMotion = () =>
  document.body.classList.contains("reduce-motion") ||
  (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const duration = (ms = TRANSITION_MS) => (prefersReducedMotion() ? 0 : ms);

const isMobile = () => window.innerWidth < BREAKPOINT_MOBILE;

// ---------- Sizing ----------
// Charts are drawn at the container's real width (not a scaled viewBox) so text stays at least 12 px on phones.
const getChartSize = (containerId, chartKey) => {
  const layout = CHART_LAYOUT[chartKey];
  const mode = isMobile() ? "mobile" : "desktop";
  const container = document.getElementById(containerId);
  const width = Math.max(280, Math.floor(container.getBoundingClientRect().width));
  const height = layout.height[mode];
  const margin = layout.margin[mode];
  return {
    width,
    height,
    margin,
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom,
  };
};

// Creates the SVG for a chart and returns { svg, inner }.
// A11Y: role="group" with a <title> and <desc> read by screen readers; the marks inside are focusable.
const createChartSvg = (containerId, size, titleText, descText) => {
  const container = d3.select(`#${containerId}`);
  container.selectAll("*").remove();

  const svg = container
    .append("svg")
    .attr("width", size.width)
    .attr("height", size.height)
    .attr("role", "group")
    .attr("aria-labelledby", `${containerId}-svg-title ${containerId}-svg-desc`);

  svg.append("title").attr("id", `${containerId}-svg-title`).text(titleText);
  svg.append("desc").attr("id", `${containerId}-svg-desc`).text(descText);

  const inner = svg
    .append("g")
    .attr("class", "inner-chart")
    .attr("transform", `translate(${size.margin.left}, ${size.margin.top})`);

  return { svg, inner };
};

// ---------- Shared tooltip ----------
const tooltip = () => d3.select("#tooltip");

// Escapes text before it is put into the tooltip's HTML
const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

// lines: [{ text, color? }]; the first entry is the bold heading
const tooltipHtml = (heading, lines) =>
  `<strong>${escapeHtml(heading)}</strong>` +
  lines
    .map((line) => {
      const swatch = line.color ? `<span class="tt-swatch" style="background:${line.color}"></span>` : "";
      return `<div>${swatch}${escapeHtml(line.text)}</div>`;
    })
    .join("");

// Positions the tooltip near the pointer, or near the focused element for keyboard users, inside the viewport
const positionTooltip = (event, element) => {
  const tip = document.getElementById("tooltip");
  const gap = 14;
  let x;
  let y;
  if (event && typeof event.clientX === "number" && event.type.startsWith("mouse")) {
    x = event.clientX + gap;
    y = event.clientY + gap;
  } else {
    const box = element.getBoundingClientRect();
    x = box.left + box.width / 2 + gap;
    y = box.top - gap;
  }
  const tipBox = tip.getBoundingClientRect();
  if (x + tipBox.width > window.innerWidth - 8) x = Math.max(8, x - tipBox.width - 2 * gap);
  if (y + tipBox.height > window.innerHeight - 8) y = Math.max(8, y - tipBox.height - 2 * gap);
  if (y < 8) y = 8;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
};

const showTooltip = (event, element, html) => {
  const tip = document.getElementById("tooltip");
  tip.innerHTML = html;
  tip.hidden = false;
  positionTooltip(event, element);
};

const hideTooltip = () => {
  document.getElementById("tooltip").hidden = true;
};

// Makes every element in a selection focusable and gives it hover + keyboard tooltips.
// htmlFor(d) returns tooltip HTML; labelFor(d) returns the aria-label; onEnter/onLeave are optional highlight hooks.
// A11Y: tabindex="0", role="img" and an aria-label that says the same as the tooltip; tooltip also on focus.
const makeInteractive = (selection, { htmlFor, labelFor, onEnter, onLeave }) => {
  selection
    .attr("tabindex", 0)
    .attr("role", "img")
    .attr("aria-label", labelFor)
    .on("mouseenter focus", function (event, d) {
      showTooltip(event, this, htmlFor(d));
      if (onEnter) onEnter(event, d, this);
    })
    .on("mousemove", function (event) {
      positionTooltip(event, this);
    })
    .on("mouseleave blur", function (event, d) {
      hideTooltip();
      if (onLeave) onLeave(event, d, this);
    });
};

// ---------- Marks ----------
// Path for a vertical bar with rounded top corners (SPEC §4.0). Height 0 gives a flat line at the baseline.
const barPathVertical = (x, y, width, height, radius = BAR_CORNER) => {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
};

// Path for a horizontal bar with rounded right corners
const barPathHorizontal = (x, y, width, height, radius = BAR_CORNER) => {
  const r = Math.max(0, Math.min(radius, height / 2, width));
  return `M${x},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height - r}Q${x + width},${y + height} ${x + width - r},${y + height}H${x}Z`;
};

// Horizontal gridlines + y axis without a domain line
const drawYAxisWithGrid = (inner, scale, innerWidth, tickCount, tickFormat) => {
  const axis = inner.selectAll("g.y-axis").data([null]).join("g").attr("class", "axis y-axis axis--no-domain");
  axis.call(d3.axisLeft(scale).ticks(tickCount).tickSize(-innerWidth).tickPadding(8).tickFormat(tickFormat));
  return axis;
};

// ---------- Data tables ----------
// columns: [{ label, value: (row) => string, numeric: true|false }]
// A11Y: a real <table> with a caption and column headers, inside a <details> under each chart
const buildDataTable = (containerId, caption, columns, rows) => {
  const wrap = d3.select(`#${containerId}`);
  wrap.selectAll("*").remove();
  const table = wrap.append("table");
  table.append("caption").text(caption);
  table
    .append("thead")
    .append("tr")
    .selectAll("th")
    .data(columns)
    .join("th")
    .attr("scope", "col")
    .attr("class", (c) => (c.numeric ? "num" : null))
    .text((c) => c.label);
  table
    .append("tbody")
    .selectAll("tr")
    .data(rows)
    .join("tr")
    .selectAll("td")
    .data((row) => columns.map((c) => ({ text: c.value(row), numeric: c.numeric })))
    .join("td")
    .attr("class", (cell) => (cell.numeric ? "num" : null))
    .text((cell) => cell.text);
};

// ---------- Messages ----------
// Shown inside a figure when its data could not be loaded (other charts keep working)
// A11Y: role="status" so screen readers announce it
const showChartMessage = (containerId, message) => {
  const container = d3.select(`#${containerId}`);
  container.selectAll("*").remove();
  container.append("p").attr("class", "chart-message").attr("role", "status").text(message);
};

// ---------- Reveal on scroll ----------
// Calls onReveal once, the first time the chart container is at least 25% visible. Runs at once if motion is
// reduced or IntersectionObserver is not available, so a chart is never left empty. Each container is observed
// only once, even if the chart is redrawn (for example after a resize) before it is revealed.
const observedForReveal = new Map();
const revealOnce = (elementId, onReveal) => {
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    onReveal();
    return;
  }
  // A redraw before the reveal replaces the callback, so the latest marks are the ones animated
  if (observedForReveal.has(elementId)) {
    observedForReveal.set(elementId, onReveal);
    return;
  }
  observedForReveal.set(elementId, onReveal);
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        observedForReveal.get(elementId)();
      }
    },
    { threshold: 0.25 },
  );
  observer.observe(document.getElementById(elementId));
};

// ---------- Numbers in the text ----------
// Fills every <span data-stat="key"> from the stats object, so the story text always matches the data.
const fillStats = (values) => {
  d3.selectAll("[data-stat]").each(function () {
    const key = this.dataset.stat;
    this.textContent = values[key] !== undefined && values[key] !== null ? values[key] : "–";
  });
};

// Sum of a numeric column, ignoring missing values
const sumOf = (rows, column) => d3.sum(rows, (row) => (row[column] === null ? 0 : row[column]));
