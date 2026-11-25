/* File: js/interactions.js
 * Purpose: Connects the page's controls to the charts (chart A checkbox, chart C and E toggles, chart D select),
 *          the mobile menu, scroll-spy for the navigation, Escape to close the tooltip/menu, and redrawing every
 *          chart when the window width changes (SPEC.md §3.0 and §4).
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

const initInteractions = () => {
  // ---------- Chart A: remove bed days of patients who died ----------
  d3.select("#toggle-deaths").on("change", function () {
    chartState.a.showWithoutDeaths = this.checked;
    if (drawnCharts.has("a")) updateChartA();
  });

  // ---------- Segmented toggles (charts C and E) ----------
  // A11Y: real <button>s; aria-pressed tells screen readers which option is on
  const wireToggle = (groupId, onChange) => {
    d3.selectAll(`#${groupId} button`).on("click", function () {
      const value = this.dataset.value;
      d3.selectAll(`#${groupId} button`).attr("aria-pressed", function () {
        return String(this.dataset.value === value);
      });
      onChange(value);
    });
  };
  wireToggle("toggle-c", (value) => {
    if (chartState.c.measure === value) return;
    chartState.c.measure = value;
    if (drawnCharts.has("c")) updateChartC();
  });
  wireToggle("toggle-e", (value) => {
    if (chartState.e.view === value) return;
    chartState.e.view = value;
    if (drawnCharts.has("e")) updateChartE();
  });

  // ---------- Chart D: age group ----------
  d3.select("#select-d").on("change", function () {
    chartState.d.ageGroup = this.value;
    if (drawnCharts.has("d")) updateChartD();
  });

  // ---------- Mobile menu ----------
  // A11Y: aria-expanded reflects the menu state; choosing a link or pressing Escape closes it
  const menuButton = document.querySelector(".menu-button");
  const nav = document.querySelector(".site-nav");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
  };
  menuButton.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));

  // A11Y: Escape hides the tooltip and closes the menu
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideTooltip();
      if (nav.classList.contains("is-open")) {
        setMenu(false);
        menuButton.focus();
      }
    }
  });

  // When the page scrolls, a mouse tooltip is hidden so it never floats over the wrong chart. A keyboard tooltip
  // stays and follows its mark, because moving focus to a mark can itself scroll the page.
  // A11Y: keyboard users keep the tooltip of the focused mark
  window.addEventListener(
    "scroll",
    () => {
      const focused = document.activeElement;
      const tip = document.getElementById("tooltip");
      if (!tip.hidden && focused && focused.closest && focused.closest(".chart") && focused.matches("[tabindex]")) {
        positionTooltip(null, focused);
      } else {
        hideTooltip();
      }
    },
    { passive: true },
  );

  // ---------- Scroll-spy: mark the nav link of the section being read ----------
  // The current section is the last one whose top has passed 45% of the window height. (An IntersectionObserver
  // version left the old link marked while the reader was in the bridge, which is not in the navigation.)
  // A11Y: aria-current tells screen-reader users which part of the story they are in
  const navLinks = [...document.querySelectorAll(".site-nav a")];
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
  let spyQueued = false;
  const updateScrollSpy = () => {
    spyQueued = false;
    const line = window.innerHeight * 0.45;
    let current = -1;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= line) current = index;
    });
    navLinks.forEach((link, index) => {
      if (index === current) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!spyQueued) {
        spyQueued = true;
        window.requestAnimationFrame(updateScrollSpy);
      }
    },
    { passive: true },
  );
  updateScrollSpy();

  // ---------- Resize: redraw at the new width (no animation) ----------
  // Only when the width changes: mobile browsers change the height while scrolling, which should not redraw.
  let lastWidth = window.innerWidth;
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      hideTooltip();
      drawnCharts.forEach((key) => {
        try {
          CHARTS[key].draw();
        } catch (error) {
          console.error(`Chart ${key.toUpperCase()} could not be redrawn:`, error);
        }
      });
    }, RESIZE_DEBOUNCE_MS);
  });
};
