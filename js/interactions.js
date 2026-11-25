/* File: js/interactions.js
 * Purpose: Connects the page's controls to the charts (chart A checkbox, chart C and E toggles, chart D select),
 *          runs the shared navigation (menu button below 1024 px, the Part A / Part B story lists), Escape to close
 *          the tooltip, a story list or the menu, and redraws the charts on this page when the window width changes
 *          (SPEC.md §3.0.1 and §4). Every page loads this file; each part does nothing if its elements are absent.
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

// ---------- Chart controls ----------
const initChartControls = () => {
  // Chart A: remove bed days of patients who died
  d3.select("#toggle-deaths").on("change", function () {
    chartState.a.showWithoutDeaths = this.checked;
    if (drawnCharts.has("a")) updateChartA();
  });

  // Segmented toggles (charts C and E)
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

  // Chart D: age group
  d3.select("#select-d").on("change", function () {
    chartState.d.ageGroup = this.value;
    if (drawnCharts.has("d")) updateChartD();
  });
};

// ---------- Navigation: menu button and the two part lists (SPEC §3.0.1) ----------
// Returns a function that closes whatever is open (used by the Escape handler), or null if the page has no nav.
const initNavigation = () => {
  const menuButton = document.querySelector(".menu-button");
  const nav = document.querySelector(".site-nav");
  if (!menuButton || !nav) return null;

  // A11Y: aria-expanded on the menu button reflects whether the nav list is shown (below 1024 px)
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
  };
  menuButton.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));

  // A11Y: each part button is a disclosure button; aria-expanded says whether its list of stories is open.
  // Only one list is open at a time. A list closes when focus or a click goes somewhere outside its group.
  const groupButtons = [...nav.querySelectorAll(".nav-group-button")];
  const isOpen = (button) => button.getAttribute("aria-expanded") === "true";
  const setGroup = (button, open) => button.setAttribute("aria-expanded", String(open));
  const closeGroups = (except = null) => groupButtons.forEach((button) => button !== except && setGroup(button, false));

  groupButtons.forEach((button) => {
    const group = button.closest(".nav-group");
    button.addEventListener("click", () => {
      const open = !isOpen(button);
      closeGroups(button);
      setGroup(button, open);
    });
    group.addEventListener("focusout", (event) => {
      if (!group.contains(event.relatedTarget)) setGroup(button, false);
    });
  });
  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target) && event.target !== menuButton) closeGroups();
  });

  // Escape closes the innermost open thing first: a part list (focus back to its button), then the menu
  return () => {
    const openButton = groupButtons.find(isOpen);
    if (openButton) {
      setGroup(openButton, false);
      openButton.focus();
      return true;
    }
    if (nav.classList.contains("is-open")) {
      setMenu(false);
      menuButton.focus();
      return true;
    }
    return false;
  };
};

// ---------- Tooltip housekeeping ----------
const initTooltipHandling = (closeNavigation) => {
  // A11Y: Escape hides the tooltip, then closes an open story list or the menu
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    hideTooltip();
    if (closeNavigation) closeNavigation();
  });

  // When the page scrolls, a mouse tooltip is hidden so it never floats over the wrong chart. A keyboard tooltip
  // stays and follows its mark, because moving focus to a mark can itself scroll the page.
  // A11Y: keyboard users keep the tooltip of the focused mark
  window.addEventListener(
    "scroll",
    () => {
      const tip = document.getElementById("tooltip");
      if (!tip || tip.hidden) return;
      const focused = document.activeElement;
      if (focused && focused.closest && focused.closest(".chart") && focused.matches("[tabindex]")) {
        positionTooltip(null, focused);
      } else {
        hideTooltip();
      }
    },
    { passive: true },
  );
};

// ---------- Resize: redraw this page's charts at the new width (no animation) ----------
// Only when the width changes: mobile browsers change the height while scrolling, which should not redraw.
const initResize = () => {
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

// Called once by load-data.js after the charts on this page are drawn
const initInteractions = () => {
  initChartControls();
  initResize();
};

// The navigation and Escape key work as soon as the page is parsed (scripts sit at the end of <body>), without
// waiting for the data, so a slow or failed CSV never blocks the menu.
initTooltipHandling(initNavigation());
