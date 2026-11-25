/* File: tests/check-site.mjs
 * Purpose: Automated checks for the website (SPEC.md §7): loads the page in headless Chrome at 375, 768 and 1280 px,
 *          and checks console errors, the key numbers in the text, minimum SVG text size, overlapping chart labels,
 *          every control, keyboard tooltips, reduced motion, a missing-data case and an axe-core accessibility scan.
 *          Writes full-page screenshots to tests/screenshots/.
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 * Run: cd tests && npm install && node check-site.mjs   (set CHROME_PATH if Chrome is not found)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(testsDir, "..");
const shotDir = path.join(testsDir, "screenshots");
fs.mkdirSync(shotDir, { recursive: true });

// Numbers that must appear in the text (from the KNIME outputs; see SPEC §2.2)
const EXPECTED_STATS = {
  beds_per_day: "62",
  ped_adm_share_2021: "5.9%",
  ped_bed_share_2021: "11.4%",
  bdpc_truck: "22.0",
  winter_up: "12%",
  share_0_7: "17.4%",
};
const WIDTHS = [375, 768, 1280];
const MIN_FONT_PX = 12;

// ---------- Tiny static server (the page needs http://, not file://) ----------
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".csv": "text/csv", ".txt": "text/plain", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.join(siteDir, urlPath === "/" ? "index.html" : urlPath);
  if (!file.startsWith(siteDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/`;

// ---------- Results ----------
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const findChrome = () =>
  [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(
    (p) => p && fs.existsSync(p),
  );
const browser = await chromium.launch({ executablePath: findChrome() });

// Opens the page, scrolls to the bottom so every chart is revealed, and waits for animations to finish
const openPage = async (width, options = {}) => {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: options.reducedMotion || "no-preference" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
  page.on("pageerror", (err) => errors.push(err.message));
  if (options.route) await page.route(options.route, (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#chart-a svg, #chart-a .chart-message", { timeout: 10000 });
  for (const id of ["chart-a", "chart-b", "chart-c", "chart-d", "chart-e", "chart-f"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(options.reducedMotion === "reduce" ? 50 : 350);
  }
  await page.waitForTimeout(options.reducedMotion === "reduce" ? 100 : 1500);
  return { context, page, errors };
};

// Pairs of label boxes in the same chart that overlap by more than 2 px
const findLabelOverlaps = (page) =>
  page.evaluate(() => {
    const overlaps = [];
    document.querySelectorAll(".chart svg").forEach((svg) => {
      const labels = [...svg.querySelectorAll(".chart-label, .value-label, .annotation, .ref-label, .break-label, .too-few")]
        .filter((el) => el.textContent.trim() !== "" && getComputedStyle(el).opacity !== "0" && !el.closest(".view--leaving"))
        .map((el) => ({ text: el.textContent.trim(), box: el.getBoundingClientRect() }));
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i].box;
          const b = labels[j].box;
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w > 2 && h > 2) overlaps.push(`${svg.parentElement.id}: "${labels[i].text}" × "${labels[j].text}"`);
        }
      }
      // Labels that run outside the SVG
      const svgBox = svg.getBoundingClientRect();
      labels.forEach((l) => {
        if (l.box.left < svgBox.left - 1 || l.box.right > svgBox.right + 1) overlaps.push(`${svg.parentElement.id}: "${l.text}" is cut off`);
      });
    });
    return overlaps;
  });

try {
  // ---------- 1. Each width: errors, numbers, text size, overlaps, screenshot, axe ----------
  for (const width of WIDTHS) {
    const { context, page, errors } = await openPage(width);
    check(`[${width}px] no console errors`, errors.length === 0, errors.join(" | "));

    const charts = await page.$$eval(".chart", (els) => els.map((el) => ({ id: el.id, svg: !!el.querySelector("svg"), message: !!el.querySelector(".chart-message") })));
    check(`[${width}px] all six charts drawn`, charts.length === 6 && charts.every((c) => c.svg && !c.message), JSON.stringify(charts.filter((c) => !c.svg || c.message)));

    const statText = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-stat]")].map((el) => [el.dataset.stat, el.textContent.trim()])));
    const wrong = Object.entries(EXPECTED_STATS).filter(([key, value]) => statText[key] !== value);
    check(`[${width}px] key numbers`, wrong.length === 0, wrong.map(([k, v]) => `${k}: "${statText[k]}" (expected "${v}")`).join(", "));
    const blanks = Object.entries(statText).filter(([, v]) => v === "" || v === "–" || v === "NaN" || v.includes("undefined"));
    check(`[${width}px] every number filled`, blanks.length === 0, blanks.map(([k, v]) => `${k}="${v}"`).join(", "));

    const smallText = await page.$$eval(".chart svg text", (els) =>
      els.filter((el) => el.textContent.trim() !== "" && parseFloat(getComputedStyle(el).fontSize) < 12).map((el) => `${el.textContent.trim()} (${getComputedStyle(el).fontSize})`),
    );
    check(`[${width}px] chart text ≥ ${MIN_FONT_PX}px`, smallText.length === 0, smallText.slice(0, 5).join(", "));

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`[${width}px] no sideways scrolling`, overflow <= 0, `${overflow}px wider than the window`);

    const overlaps = await findLabelOverlaps(page);
    check(`[${width}px] no overlapping or cut-off chart labels`, overlaps.length === 0, overlaps.slice(0, 6).join("; "));

    await page.screenshot({ path: path.join(shotDir, `page-${width}.png`), fullPage: true });

    await page.addScriptTag({ path: path.join(testsDir, "node_modules/axe-core/axe.min.js") });
    const axe = await page.evaluate(() => window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] }));
    const serious = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    check(`[${width}px] axe: no serious or critical issues`, serious.length === 0, serious.map((v) => `${v.id} (${v.nodes.length})`).join(", "));
    const minor = axe.violations.filter((v) => !["serious", "critical"].includes(v.impact));
    if (minor.length) console.log(`      axe minor/moderate: ${minor.map((v) => `${v.id} (${v.nodes.length})`).join(", ")}`);
    await context.close();
  }

  // ---------- 2. Controls and keyboard (desktop) ----------
  {
    const { context, page, errors } = await openPage(1280);

    await page.check("#toggle-deaths");
    await page.waitForTimeout(800);
    const dashed = await page.$$eval("#chart-a .without-deaths path", (p) => p.map((el) => el.getAttribute("d")));
    check("chart A: checkbox adds the dashed line, without a 2021 point", dashed.length === 1 && (dashed[0].match(/[ML]/g) || []).length === 10, `${dashed.length} path(s)`);
    check("chart A: note and legend item shown", await page.isVisible("#note-a-deaths") && (await page.isVisible(".legend-deaths")));
    await page.uncheck("#toggle-deaths");
    await page.waitForTimeout(700);
    check("chart A: unchecking removes the line", (await page.$$("#chart-a .without-deaths path")).length === 0);

    await page.click('#toggle-c button[data-value="admissions"]');
    await page.waitForTimeout(900);
    const subtitleC = await page.textContent("#chart-c-subtitle");
    const pressedC = await page.getAttribute('#toggle-c button[data-value="admissions"]', "aria-pressed");
    const fillC = await page.$eval("#chart-c .bars path", (p) => getComputedStyle(p).fill);
    check("chart C: toggle switches measure, colour and aria-pressed", subtitleC.includes("admissions per 100,000") && pressedC === "true" && fillC === "rgb(42, 120, 214)", `${subtitleC} / ${pressedC} / ${fillC}`);

    await page.selectOption("#select-d", "0-7");
    await page.waitForTimeout(900);
    const tooFew = await page.$$eval("#chart-d .too-few", (els) => els.map((e) => e.textContent));
    const subtitleD = await page.textContent("#chart-d-subtitle");
    check("chart D: age select updates subtitle and marks small cells", subtitleD.includes("0–7") && tooFew.length >= 1, `${subtitleD} / ${tooFew.length} small cell(s)`);

    await page.click('#toggle-e button[data-value="year"]');
    await page.waitForTimeout(1200);
    const dumbbells = await page.$$eval("#chart-e .dumbbells > g", (g) => g.length);
    const legendE = await page.$$eval("#legend-e li", (li) => li.map((l) => l.textContent.trim()));
    check("chart E: year view shows 11 dumbbells and Summer/Winter legend", dumbbells === 11 && legendE.join() === "Summer,Winter", `${dumbbells} rows / ${legendE}`);
    check("chart E: old view removed after the cross-fade", (await page.$$("#chart-e g.view")).length === 1);

    // Keyboard: Tab from the checkbox reaches the first year band of chart A and shows the tooltip
    await page.focus("#toggle-deaths");
    let reached = false;
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement && document.activeElement.closest && !!document.activeElement.closest("#chart-a") && document.activeElement.classList.contains("hit"));
    }
    const tipVisible = await page.isVisible("#tooltip");
    const label = await page.evaluate(() => document.activeElement.getAttribute("aria-label"));
    check("keyboard: chart marks are focusable with a tooltip and aria-label", reached && tipVisible && !!label, label || "");
    await page.keyboard.press("Escape");
    check("keyboard: Escape hides the tooltip", !(await page.isVisible("#tooltip")));

    // Scroll-spy: the bridge belongs to the big picture; story 3 belongs to Part B ("More cases")
    const currentLinkAt = async (selector) => {
      await page.$eval(selector, (el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
      await page.waitForTimeout(200);
      return page.$eval('.site-nav a[aria-current="true"]', (a) => a.textContent.trim()).catch(() => "none");
    };
    const atBridge = await currentLinkAt("#bridge");
    const atWinter = await currentLinkAt("#story-winter");
    const atBridgeAgain = await currentLinkAt("#bridge");
    check("scroll-spy: marks the part being read, also after jumping back", atBridge === "Big picture" && atWinter === "More cases" && atBridgeAgain === "Big picture", `${atBridge} / ${atWinter} / ${atBridgeAgain}`);

    // Resize: charts redraw at the new width without errors
    await page.setViewportSize({ width: 700, height: 900 });
    await page.waitForTimeout(800);
    const svgWidth = await page.$eval("#chart-c svg", (s) => s.getBoundingClientRect().width);
    const boxWidth = await page.$eval("#chart-c", (s) => s.getBoundingClientRect().width);
    check("resize: charts redraw to the container width", Math.abs(svgWidth - boxWidth) < 2, `${svgWidth} vs ${boxWidth}`);
    check("controls: no console errors", errors.length === 0, errors.join(" | "));
    await context.close();
  }

  // ---------- 3. Mobile menu ----------
  {
    const { context, page } = await openPage(375);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click(".menu-button");
    const expanded = await page.getAttribute(".menu-button", "aria-expanded");
    const linkVisible = await page.isVisible('.site-nav a[href="#part-b"]');
    await page.keyboard.press("Escape");
    const closed = await page.getAttribute(".menu-button", "aria-expanded");
    check("mobile menu: opens, shows links, closes with Escape", expanded === "true" && linkVisible && closed === "false");
    await context.close();
  }

  // ---------- 4. Reduced motion ----------
  {
    const { context, page, errors } = await openPage(1280, { reducedMotion: "reduce" });
    const barHeights = await page.$$eval("#chart-f .bars path", (p) => p.map((el) => el.getBBox().height));
    check("reduced motion: charts drawn at once, no errors", barHeights.every((h) => h > 1) && errors.length === 0, errors.join(" | "));
    await context.close();
  }

  // ---------- 5. Missing data file ----------
  {
    const { context, page } = await openPage(1280, { route: "**/season_by_year.csv" });
    const messageE = await page.$eval("#chart-e", (el) => el.textContent);
    const others = await page.$$eval("#chart-a svg, #chart-d svg", (s) => s.length);
    check("missing file: chart E shows a message, other charts still draw", messageE.includes("could not be loaded") && others === 2, messageE.trim().slice(0, 80));
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: tests/screenshots/`);
process.exit(failed.length ? 1 : 0);
