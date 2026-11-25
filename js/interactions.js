/* File: js/interactions.js
 * Purpose: Connects the page's controls to the charts (chart A checkbox, chart C and E toggles, chart D select),
 *          runs the shared navigation (menu button below 1024 px, the Part A / Part B story lists), Escape to close
 *          the tooltip, a story list or the menu, and redraws the charts on this page when the window width changes
 *          (SPEC.md §3.0.1 and §4). It also keeps the reader's age group (SPEC §3.0.4): the Home picker, the status
 *          line on chart pages, ?age= in the URL and links, localStorage, and the "agechange" event.
 *          Every page loads this file; each part does nothing if its elements are absent.
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

// ---------- Chart controls ----------
const initChartControls = () => {
  // Chart A: remove bed days of patients who died
  d3.select("#toggle-deaths").on("change", function () {
    chartState.a.showWithoutDeaths = this.checked;
    if (drawnCharts.has("a")) updateChartA();
  });

  // Chart A: legend buttons highlight one series; pressing the highlighted one again shows both (task 2.2)
  // A11Y: real <button>s with aria-pressed (kept in step by highlightSeriesA)
  d3.selectAll("#legend-a .legend-button").on("click", function () {
    const series = this.dataset.series;
    chartState.a.highlight = chartState.a.highlight === series ? null : series;
    if (drawnCharts.has("a")) highlightSeriesA();
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
  // Chart C order: age order or highest first (task 2.4)
  wireToggle("toggle-c-order", (value) => {
    if (chartState.c.order === value) return;
    chartState.c.order = value;
    if (drawnCharts.has("c")) updateChartC();
  });
  // Chart D measure: days per case or share of cases vs bed days (task 2.5)
  wireToggle("toggle-d", (value) => {
    if (chartState.d.measure === value) return;
    chartState.d.measure = value;
    if (drawnCharts.has("d")) updateChartD();
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
    if (!open) closeGroups(); // a part list never stays "expanded" inside a closed menu
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

// ---------- Reader's age group (SPEC §3.0.4, task 2.1) ----------
// One site-wide setting. It is kept in the URL (?age=) and in localStorage, marks the group in charts B and C, and
// opens chart D on it. It never removes data.
const isAgeGroup = (value) => AGE_ORDER.includes(value);

// Storage can be blocked (private windows, browser settings), so every access is wrapped; the ?age= links still
// carry the choice from page to page when it is.
const readStoredAge = () => {
  try {
    return window.localStorage.getItem(AGE_STORAGE_KEY);
  } catch (error) {
    return null;
  }
};
const storeAge = (ageGroup) => {
  try {
    if (ageGroup) window.localStorage.setItem(AGE_STORAGE_KEY, ageGroup);
    else window.localStorage.removeItem(AGE_STORAGE_KEY);
  } catch (error) {
    // Nothing to do: the choice still travels in the links
  }
};

// "+" typed into an address arrives as a space ("?age=75+" → "75 ")
const ageFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get(AGE_PARAM);
  return value === null ? null : value.trim().replace(/ /g, "+");
};

// Adds (or removes) ?age= on a link to another page of the site, keeping any other parameters and the #hash
const withAgeParam = (href) => {
  const match = href.match(/^([\w-]+\.html)(\?[^#]*)?(#.*)?$/);
  if (!match) return href;
  const params = new URLSearchParams(match[2] || "");
  if (siteState.ageGroup) params.set(AGE_PARAM, siteState.ageGroup);
  else params.delete(AGE_PARAM);
  const query = params.toString();
  return `${match[1]}${query ? `?${query}` : ""}${match[3] || ""}`;
};

const updateInternalLinks = () => {
  document.querySelectorAll("a[href]").forEach((link) => link.setAttribute("href", withAgeParam(link.getAttribute("href"))));
};

// Keeps the address bar in step without reloading, so a reload or a shared link keeps the choice
const updateAddressBar = () => {
  if (!window.history || !window.history.replaceState) return;
  const url = new URL(window.location.href);
  if (siteState.ageGroup) url.searchParams.set(AGE_PARAM, siteState.ageGroup);
  else url.searchParams.delete(AGE_PARAM);
  window.history.replaceState(null, "", url);
};

const setAgeGroup = (ageGroup) => {
  const next = isAgeGroup(ageGroup) ? ageGroup : null;
  if (next === siteState.ageGroup) return;
  siteState.ageGroup = next;
  storeAge(next);
  updateAddressBar();
  updateInternalLinks();
  document.dispatchEvent(new CustomEvent("agechange", { detail: { ageGroup: next } }));
};

// Status line on pages with an age-aware chart: "Marking your age group: 65–74 yrs  [Clear]"
// A11Y: the line is a role="status" region; after Clear it says so, and focus moves to it (the button is gone)
const renderAgeStatus = (message = null) => {
  d3.selectAll("[data-age-status]").each(function () {
    const status = d3.select(this);
    status.selectAll("*").remove();
    status.text("");
    if (message) {
      status.attr("hidden", null).text(message);
      return;
    }
    if (!siteState.ageGroup) {
      status.attr("hidden", true);
      return;
    }
    status.attr("hidden", null);
    status.append("span").text("Marking your age group: ");
    status.append("strong").text(AGE_LABELS[siteState.ageGroup]);
    status.append("span").text(" ");
    status
      .append("button")
      .attr("type", "button")
      .attr("class", "link-button")
      .text("Clear")
      .on("click", () => {
        setAgeGroup(null);
        renderAgeStatus("Age group cleared: the charts show every group the same way.");
        status.attr("tabindex", -1).node().focus();
      });
  });
};

// Home: the picker's live message names the chosen group and the story about it
const renderAgeMessage = () => {
  const message = d3.select("#age-message");
  if (message.empty()) return;
  message.selectAll("*").remove();
  message.text("");
  if (!siteState.ageGroup) {
    message.text("No age group chosen: the charts show every group the same way.");
    return;
  }
  const story = STORIES[STORY_FOR_AGE[siteState.ageGroup]];
  message.append("span").text(`Your age group is ${AGE_LABELS[siteState.ageGroup]}. The charts will mark it. `);
  message.append("a").attr("href", withAgeParam(story.page)).text(story.label);
  message.append("span").text(" is about your group.");
};

const initAgePicker = () => {
  const select = d3.select("#age-select");
  if (select.empty()) return;
  // Options come from the shared age order and labels, so they always match the charts
  select
    .selectAll("option")
    .data(["", ...AGE_ORDER])
    .join("option")
    .attr("value", (d) => d)
    .text((d) => (d ? AGE_LABELS[d] : "Not chosen"))
    .property("selected", (d) => d === (siteState.ageGroup || ""));
  select.on("change", function () {
    setAgeGroup(this.value || null);
    renderAgeMessage();
  });
  d3.select("#age-clear").on("click", () => {
    setAgeGroup(null);
    select.property("value", "");
    renderAgeMessage();
  });
  renderAgeMessage();
};

// Runs before load-data.js draws anything, so the charts are drawn with the reader's group already set
const initAgeGroup = () => {
  const fromUrl = ageFromUrl();
  const stored = readStoredAge();
  if (isAgeGroup(fromUrl)) {
    siteState.ageGroup = fromUrl;
    storeAge(fromUrl);
  } else if (isAgeGroup(stored)) {
    siteState.ageGroup = stored;
  }
  if (siteState.ageGroup) chartState.d.ageGroup = siteState.ageGroup; // chart D opens on the reader's group
  updateInternalLinks();
  renderAgeStatus();
  initAgePicker();
};

// The charts on this page follow a change of age group (chart F listens in its own file, task 2.9)
document.addEventListener("agechange", (event) => {
  const ageGroup = event.detail.ageGroup;
  // A chart not yet scrolled into view stays at its baseline, so its grow-in reveal still plays later
  if (drawnCharts.has("b")) highlightAgeB();
  if (drawnCharts.has("c")) updateChartC(false, !revealed.c);
  if (drawnCharts.has("d")) {
    chartState.d.ageGroup = ageGroup || ALL_AGES;
    d3.select("#select-d").property("value", chartState.d.ageGroup);
    updateChartD(false, !revealed.d);
  }
});

// Called once by load-data.js after the charts on this page are drawn
const initInteractions = () => {
  initChartControls();
  initResize();
};

// The navigation, Escape key and age group work as soon as the page is parsed (scripts sit at the end of <body>),
// without waiting for the data, so a slow or failed CSV never blocks them.
initTooltipHandling(initNavigation());
initAgeGroup();
