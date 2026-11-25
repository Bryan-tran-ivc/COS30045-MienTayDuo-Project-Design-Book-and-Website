# SPEC — "Few cases, long stays" website

COS30045 Data Visualisation · Team MienTayDuo · Tran Quang Huy (106212636), Chung Hien Thong (106212681)
Version 2.0 (Week 13, 26 November 2026): the single page becomes a site of eight pages. Version 1.0 (Week 12, 25 November 2026) was the single scrolling page, tagged `v0.1-single-page`. This file is the single source of truth for the website. Read it fully before writing code. When the spec and the code disagree, change the code, or change the spec first and say why.

**Who writes which part of this spec (task 0.5):** Thông: §1, §3 (except §3.7.1 and §3.8.1), §4.A–D, §6, §7, §9. Huy: §4.E, §4.F, §3.7.1 (beds-freed calculator), §3.8.1 (glossary). Shared: §2, §4.0, §5, §8.

---

## 1. What we are building

A small website of **eight pages** that tells one data story about pedestrian road injuries in Australia, with six D3 charts (A–F) and a small number of purposeful interactions. The story is still read in a fixed order (Home → big picture → four stories → what can be done), but each step is its own page, so every chart gets more room and more interaction depth. It is the team's deliverable for the COS30045 Project ("Design Book and Website"), hosted on the Swinburne Mercury server, code on GitHub.

**Why eight pages instead of one (v2.0):** one scrolling page allowed only one control per chart before it became crowded. Separate pages give each chart room for exploration (legend highlighting, year scrubbing, sorting, switching measures, a calculator) while the guided order stays: a "martini glass" in which each page first states its finding, then lets the reader explore, then points to the next page.

**Headline:** pedestrians are few of the people admitted to hospital after road crashes, but they stay a long time. In 2021 they were **5.9% of road-injury admissions but 11.4% of hospital bed days**: on an average day, **62 hospital beds** were filled by people injured while walking.

**Story logic:** bed days = number of cases × days per case. Part A explains why stays are long; Part B explains why there are many cases. Every story ends with a short "What can be done" box whose response comes from published research, not from our data.

**Audience:** (1) road-safety and public-health practitioners, who need a defensible comparison of where hospital burden falls; (2) journalists and the interested public, who need one clear headline and a reason to care. Plain English, no jargon without a definition, every number with its unit, group and year.

**Assessment the site must satisfy** (from the unit rubric):
- Website opens and works; charts are coded in **D3 v7** (no chart libraries built on D3, no Chart.js, no Plotly).
- Code is modular in the way taught in the unit labs (data loading, chart building, interactions, styling and constants in separate files), readable and consistently **commented**.
- Robust data handling (missing values, failed loads, unexpected columns).
- Accessibility features present and **marked in comments** (semantic HTML, ARIA, keyboard, readable text, reduced motion).
- Interactions are purposeful, not "filter every variable".

Out of scope: a dashboard with global filters, maps, user accounts, server code, build tools, frameworks (no React, no bundler, no TypeScript), and templating at build time. Plain HTML, CSS and JavaScript only. The one site-wide setting is the reader's age group (§3.0.4): it marks that group in the charts (and chart D opens on it), but it never removes data.

---

## 2. Data

All data files are CSV outputs of the team's KNIME workflow (`MienTayDuo_DataProcessing_Standup2`), copied unchanged into `data/`. **The website never recalculates what KNIME already calculated**, except simple sums and ratios listed below. Do not edit the CSV files by hand.

Sources: BITRE (2023) Hospitalised injury, national workbook (raw tab), Traffic rows only, calendar years 2011–2021; ABS (2026) Table 59, estimated resident population by single year of age, June 2021.

| File | KNIME part | Rows | Columns used (exact header text) | Used by |
|---|---|---|---|---|
| `pedestrian_share_by_year.csv` | 1 | 11 (2011–2021) | `Calendar year`, `Hospitalisations`, `Bed days`, `admission_share_pct`, `bed_day_share_pct`, `bed_day_share_excl_died_pct`, `bed_days_per_case` | Hero, KPI cards, chart A |
| `annual_totals.csv` | 1 | 11 | `Calendar year`, `Sum(Hospitalisations)`, `Sum(Bed days)` | KPI card (all road injuries days per case) |
| `age_story_2021.csv` | 8 | 7 age groups | `Age group`, `Hospitalisations`, `ped_admissions`, `ped_bed_days`, `ped_share_of_age_pct`, `ped_bed_days_per_case`, `population`, `ped_admissions_per_100k`, `ped_bed_days_per_100k` | Charts B, C, F |
| `vehicle_2016_2021.csv` | 7 | 8 counterparties | `Counterparty`, `Hospitalisations`, `Bed days`, `bed_days_per_case`, `case_share_pct`, `bed_day_share_pct` | Chart D (All ages) |
| `vehicle_by_age_2016_2021.csv` | 7 | age × counterparty | `Age group`, `Counterparty`, `Hospitalisations`, `Bed days`, `bed_days_per_case` | Chart D (age filter) |
| `season_2011_2019.csv` | 6 | 4 seasons | `season`, `Hospitalisations`, `ped_admissions`, `ped_share_pct`, `ped_index`, `all_index` | Chart E "Average" |
| `season_by_year.csv` | 6 | 44 (11 years × 4) | `Calendar year`, `season`, `Hospitalisations`, `ped_admissions`, `ped_share_pct` | Chart E "Year by year" |

### 2.1 Parsing rules (`load-data.js`)
- Load with `d3.csv(url, rowParser)`. Convert numeric columns with a helper that returns `null` (not `0`, not `NaN`) for empty strings or non-numeric text. **Blank never means zero** (the 2021 death fields are blank by design).
- Trim header names; KNIME may add extra columns (`join_key`, `keep_…`, `pop_…`) — ignore them.
- Validate each file: required columns present and at least one row. If a file fails (network error or missing columns), show a short message inside the affected figure(s) only, log the reason with `console.error`, and keep drawing every other chart. Use `Promise.allSettled`.
- If the page is opened from `file://`, `d3.csv` fails because browsers block local fetches. The message must say: "The data could not be loaded. Open the page through a web server (see README)."
- Drop rows where `Age group` is `Missing` or empty.

### 2.2 Values computed in the browser (and nowhere else)
| Value | Formula | 2021 value (for testing) |
|---|---|---|
| Beds filled per day by pedestrians | pedestrian `Bed days` 2021 / 365 | 62.3 → shown "62" |
| Beds freed by a 30% cut | beds per day × 0.30 | 18.7 → "about 19" |
| All road injuries days per case | `Sum(Bed days)` / `Sum(Hospitalisations)` for 2021 | 5.04 → "5.0" |
| Gap ratio per year | `bed_day_share_pct` / `admission_share_pct` | range 1.61–2.17 → "1.6 to 2.2 times" |
| All-ages pedestrian rate per 100,000 | Σ`ped_admissions` / Σ`population` × 100,000 (and same for bed days) | 9.1 and 88.5 |
| All-ages pedestrian share | Σ`ped_admissions` / Σ`Hospitalisations` × 100 | 5.9% |
| Share of pedestrian cases / bed days by age | `ped_admissions` / Σ`ped_admissions` (and bed days) | under 40: 51.2% / 34.1%; 65+: 22.2% / 36.2% |
| Vehicle share of cases / bed days within one age group (chart D, v2.0) | vehicle's `Hospitalisations` (or `Bed days`) / Σ over every counterparty of that age group in `vehicle_by_age_2016_2021.csv` × 100. All ages uses `case_share_pct` / `bed_day_share_pct` from KNIME | 75+, truck or bus: 3.2% of cases / 4.4% of bed days |

Rounding: percentages 1 decimal place; rates 1 decimal for admissions, 0 decimals for bed days per 100,000; days per case 1 decimal; counts with thousands separators (`d3.format(",")`). Use the `formatters` object in `shared-constants.js`; never format inline.

### 2.3 Small numbers rule
No mark is drawn for a cell with fewer than **20** admissions (`MIN_CELL = 20`). In chart D such a vehicle shows the text "Fewer than 20 cases" in place of its bar, and its tooltip/data-table row says the same; the exact count is not shown.

---

## 3. Pages and copy

Eight pages at the site root, each `lang="en-AU"`, in this reading order:

| # | File | `data-page` | Page title (`h1`) | Content | Owner |
|---|---|---|---|---|---|
| 1 | `index.html` | `home` | The hidden hospital burden of pedestrian injuries | Hero, 3 KPI cards, story map, age picker | Thông |
| 2 | `big-picture.html` | `big-picture` | The big picture | Chart A, then chart B (bridge) | Thông |
| 3 | `story-older.html` | `story-older` | Older pedestrians carry the heaviest burden | Story 1 text, chart C, response | Thông |
| 4 | `story-vehicles.html` | `story-vehicles` | The heavier the vehicle, the longer the stay | Story 2 text, chart D, response | Thông |
| 5 | `story-winter.html` | `story-winter` | Pedestrian admissions rise every winter | Story 3 text, chart E, response | Huy |
| 6 | `story-young.html` | `story-young` | For young children, one road injury in six happens on foot | Story 4 text, chart F, response | Huy |
| 7 | `what-can-be-done.html` | `what-can-be-done` | Count bed days, not just cases | Response cards, beds-freed calculator | Huy |
| 8 | `about.html` | `about` | About the data | Data, limitations, references, credits, glossary | Huy |

Every page: `<title>` is "{short page name} · Few cases, long stays" (Home: "Few cases, long stays · Pedestrian road injuries in Australia"); `<body data-page="…">`; landmarks `header` (brand + nav), `main id="main"`, `footer`. **One `h1` per page**, `h2` for each section (and for a chart title placed directly under the `h1`), `h3` inside a section; no skipped levels. Each section is a `<section>` with an `aria-labelledby` heading. Text marked `{…}` is filled from data at run time (§2.2) with `<span data-stat="key">`, so the text can never drift from the data. Every page ends with the shared `#tooltip` element (`helpers.js` expects it).

### 3.0 Shared shell (every page)

#### 3.0.1 Header and navigation (sticky; master copy in `_template.html`)
There is no build step, so the header and footer are plain HTML **copied into each page**. `_template.html` holds the master copy: change it there, then paste the change into all eight pages in the same PR (Thông owns the shell).
- Left: brand "Few cases, long stays", a link to `index.html`.
- Nav `<nav class="site-nav" aria-label="Main">`, in this order: **Home** · **Big picture** · **Part A · Longer stays ▾** (Story 1 · Older people, Story 2 · Heavier vehicles) · **Part B · More cases ▾** (Story 3 · Winter, Story 4 · Children and young people) · **What can be done** · **About the data**.
- The two parts are disclosure buttons (`<button aria-expanded aria-controls>`) that open a short list of their two stories. Wide screens: the list drops down under the button and closes on Escape (focus returns to the button), on a click outside, or when focus leaves the group. Only one part list is open at a time.
- Current page: its link carries `aria-current="page"` in that page's copy of the header (so it works without JavaScript), shown with an orange underline. On a story page, the part button that contains it is underlined as well (class `is-current`).
- Visible labels of the two part buttons: "A · Longer stays" and "B · More cases" (the same as the formula-card links); each part list has an `aria-label` with the full part question.
- Below **1024 px** (the full row of eight entries does not fit narrower), the whole nav sits behind a "Menu" button (`aria-expanded`, `aria-controls`); the part lists open inline inside it. Escape closes the open part list first, then the menu. The navigation works before the data has loaded.
- A "Skip to content" link is the first focusable element.
- No scroll-spy (v1.0 had one; each section is now a page).

#### 3.0.2 Footer
- "COS30045 Data Visualisation · Swinburne University of Technology Vietnam · Team MienTayDuo: Tran Quang Huy (106212636) and Chung Hien Thong (106212681) · 2026"
- "Data: BITRE (2023) hospitalised injury, 2011–2021; ABS (2026) population, June 2021. Sources and limits: About the data." (link to `about.html`)

#### 3.0.3 Breadcrumb and story pager (Huy, task 1.5)
Pages in the story order (big picture, the four stories, what can be done) carry two empty hooks that `js/site-components.js` fills: `<div class="breadcrumb" data-breadcrumb></div>` as the first child of `main`, and `<div class="story-pager" data-pager></div>` as the last. Breadcrumb e.g. "Part A · Longer stays"; pager "← Previous story · Story 2 of 4 · Next story →". Details are Huy's (task 1.5); a page without the script still reads correctly, because the hooks are empty.

#### 3.0.4 The reader's age group (task 2.1)
One site-wide setting: the reader's age group. It only **marks** a group in the charts; it never removes data.
- Chosen on Home (§3.1) with a select "Your age group" (first option "Not chosen", then the seven groups with `AGE_LABELS`) and a "Clear" button.
- Kept in the URL as `?age=<key>` (keys as in `AGE_ORDER`, URL-encoded, e.g. `?age=75%2B`) and in `localStorage` under `AGE_STORAGE_KEY`; every storage read and write is wrapped in `try/catch`, so the site works when storage is blocked. On load, a valid `?age=` wins over storage and is saved; an unknown value is ignored.
- While an age group is set, internal links to the other pages get `?age=` added, so the choice survives page changes even without storage.
- A change updates `siteState.ageGroup`, storage and the address bar (`history.replaceState`, no reload), then fires `document.dispatchEvent(new CustomEvent("agechange", { detail: { ageGroup } }))` (`ageGroup` is `null` when cleared). Charts listen for this event.
- Effects: chart B and chart C mark the group (§4.B, §4.C); chart D opens on that group in its select (§4.D); chart F (Huy, task 2.9).
- Pages with an age-aware chart show a status line under the page intro, hidden when no group is set: "Marking your age group: **65–74 yrs**" plus a "Clear" button (`<p class="age-status" data-age-status>`).
- A11Y: Home announces each change through an `aria-live="polite"` status ("Your age group is 65–74 yrs. Charts will mark it. Story 1 · Older pedestrians is about your group."). The suggested story is Story 1 for 40 and over and Story 4 for under 40 (`STORY_FOR_AGE`, the same rule as chart B, §4.B).

### 3.1 Home (`index.html`)
- Hero: eyebrow "Pedestrian road injuries in Australia, 2011–2021"; `h1` "The hidden hospital burden of pedestrian injuries"; big number `{beds_per_day}` (orange, very large) with the label "hospital beds filled by injured pedestrians on an average day in 2021"; lead "Pedestrians are only a small share of the people admitted to hospital after road crashes. But they stay much longer than most, and that is easy to miss if we only count cases."; call to action "Start with the big picture →" (`big-picture.html`).
- `h2` "2021 in three numbers": three KPI cards: `{ped_adm_share_2021}` "of road-injury admissions were pedestrians" (blue number); `{ped_bed_share_2021}` "of road-injury bed days were pedestrians'" (orange number); `{ped_bdpc_2021} vs {all_bdpc_2021}` "days per case, pedestrians vs all road injuries".
- Story map, `h2` "Where do the {beds_per_day} beds come from?": the formula card "Bed days = number of cases × days per case", then "Two things make the burden large: each stay is long, and there are many cases. Each story explains one of them." Then two columns (one below 768 px):
  - Part A, orange band "Part A · Why do stays last so long?": story cards 1 and 2.
  - Part B, blue band "Part B · Why are there so many cases?": story cards 3 and 4.
  - The part bands are `h3`. Each story card: kicker ("Story 1"), title as an `h4` containing the link to the page (the whole card is clickable through the link), and one teaser line with one number:
    1. Older pedestrians carry the heaviest burden — "People aged 75 and over: {bd_rate_ratio_75} times the all-ages bed-day rate."
    2. The heavier the vehicle, the longer the stay — "Hit by a truck or bus: {bdpc_truck} days in hospital per admission."
    3. Pedestrian admissions rise every winter — "Winter: {winter_up} more pedestrian admissions than an average season."
    4. For young children, one road injury in six happens on foot — "Children aged 0–7: {share_0_7} of their road-injury admissions were pedestrians."
- Age picker (§3.0.4), between the key figures and the story map, so the reader picks a group before choosing a story; `h2` "Find your age group": "Choose your age group and the charts will mark it as you read." Select, "Clear" button and the live status.

### 3.2 The big picture (`big-picture.html`)
- `h1`: "The big picture"
- Text: "In 2021, pedestrians were {ped_adm_share_2021} of road-injury admissions but {ped_bed_share_2021} of the days those patients spent in hospital. A pedestrian stayed {ped_bdpc_2021} days on average, against {all_bdpc_2021} days for all road injuries. The gap is not new: in every year from 2011 to 2021, the pedestrian share of bed days was {gap_min} to {gap_max} times their share of admissions."
- Age status line (§3.0.4).
- **Chart A** (§4.A, title `h2`) with its checkbox, legend buttons and year scrubbing.
- Note under chart A: "Dashed grey lines mark changes in how cases or bed days were counted; hover or focus a line to read about it."
- Section `h2` "Who makes the cases, and who fills the beds?": "Young people make most of the cases, while older people fill most of the beds. People under 40 were {under40_case_share} of pedestrian admissions in 2021 but only {under40_bed_share} of the bed days. People aged 65 and over were {over65_case_share} of admissions and {over65_bed_share} of bed days."
- **Chart B** (§4.B, title `h3`). Note under it: "Select an age group to open its story: 40 and over, Story 1 (older pedestrians); under 40, Story 4 (children and young people). On a touch screen, tap twice."
- Formula card as the hand-off to the stories: "Bed days = number of cases × days per case", with "A · Longer stays →" (`story-older.html`, orange outline) and "B · More cases →" (`story-winter.html`, blue outline).

### 3.3 Story 1 — Older people (`story-older.html`)
Kicker "Part A · Story 1 · Older people". Age status line under the text. Layout: text column and chart column (§5).
- `h1`: "Older pedestrians carry the heaviest burden"
- Text: "Counts alone would hide this, because age groups differ in size. Per 100,000 people, those aged 75 and over had the most pedestrian bed days in 2021: {bd_rate_75} against {bd_rate_all} for all ages, {bd_rate_ratio_75} times as many. Each of their admissions lasted {bdpc_75} days. Within every adult age group, pedestrians also stayed 1.7 to 2.7 times longer than car drivers of the same age, so this is not only an age effect."
- **Chart C** with its measure toggle and sort toggle (§4.C, title `h2`).
- What can be done (`aside`, `h2` "What can be done"): "Give slower walkers time to cross. Older adults walk about 0.77 m per second on average, well below the 1.2 m per second that most crossings assume (Western et al., 2025). Longer crossing times, pedestrian detection at signals, and awareness messages aimed at drivers and older people all target this group."

### 3.4 Story 2 — Heavier vehicles (`story-vehicles.html`)
Kicker "Part A · Story 2 · Heavier vehicles". Age status line under the text.
- `h1`: "The heavier the vehicle, the longer the stay"
- Text: "Between 2016 and 2021, a pedestrian hit by a car, ute or van stayed {bdpc_car} days per admission. One hit by a truck or bus stayed {bdpc_truck} days, and one hit by a train {bdpc_train}. Trucks and buses caused only {truck_case_share} of pedestrian admissions but {truck_bed_share} of their bed days. Choose an age group: the pattern holds in each one."
- **Chart D** with its age select and measure toggle (§4.D, title `h2`).
- What can be done (`aside`, `h2`): "Reduce crash energy. For trucks on city streets, that means blind-spot systems, side underrun protection and automatic emergency braking, which Australia's Safer Freight Vehicles package encourages (DITRDCA, 2023). For cars, which cause {car_case_share} of cases, it means lower speeds where people walk: the risk of death rises steeply with impact speed (Hussain et al., 2019)."

### 3.5 Story 3 — Winter (`story-winter.html`, Huy)
Kicker "Part B · Story 3 · Winter".
- `h1`: "Pedestrian admissions rise every winter"
- Text: "Averaged over 2011–2019, pedestrian admissions in winter were {winter_up} above an average season and summer admissions {summer_down} below, while road injuries overall were slightly below average in winter. Pedestrians' share of road-injury admissions rose from {share_summer} in summer to {share_winter} in winter, and winter was higher than summer in all {n_years} years from 2011 to 2021. Winter brings dark evenings, but also holidays and weather, so this is a pattern, not proof of a cause."
- **Chart E** with its controls (§4.E, title `h2`).
- What can be done (`aside`, `h2`): "Help drivers see people on foot. Street lighting can prevent road injuries, though the studies are of mixed quality (Beyer & Ker, 2009). Lighting at crossings and campaigns from autumn into winter, aimed at drivers and pedestrians, match the season when cases rise (RAA, 2025)."

### 3.6 Story 4 — Children and young people (`story-young.html`, Huy)
Kicker "Part B · Story 4 · Children and young people". Age status line under the text.
- `h1`: "For young children, one road injury in six happens on foot"
- Text: "People under 40 make up {under40_case_share} of pedestrian admissions. For children aged 0–7, {share_0_7} of all their road-injury admissions were pedestrians, three times the all-ages share of {share_all}. Their stays are short, so this story is about the number of cases, not bed days."
- **Chart F** with its controls (§4.F, title `h2`).
- What can be done (`aside`, `h2`): "Aim awareness at the right people. Texting while walking is linked to less looking before crossing (Simmons et al., 2020), so messages for young adults can focus on phones at crossings; for young children the audience is their parents. Campaigns work best alongside other measures: mass media alone have shown little effect on crashes (Phillips et al., 2011)."

### 3.7 What can be done (`what-can-be-done.html`, Huy)
- `h1`: "Count bed days, not just cases"
- Text: "Ranking road users by admissions alone under-ranks pedestrians. A 30% cut in pedestrian bed days, in line with the national target for serious injuries (Australian Government, 2021), would free about {beds_freed} hospital beds every day."
- Four cards (one per story): title, one-line response, link to the story page. Card order: Older people, Heavier vehicles, Winter, Children and young people. Task 2.12 (Huy) makes them expandable.
- Link: "↑ Back to the big picture" (`big-picture.html`).

#### 3.7.1 Beds-freed calculator (Huy, task 2.10)
*To be written by Huy (task 0.5).* Planner summary: a cut slider 0–50% (step 5, default 30%) and a group select (All pedestrians / 65 and over / Under 40) give "X beds freed every day" = the group's total `ped_bed_days` (`age_story_2021.csv`) / 365 × cut. The default must read "about 19". The result is announced with `aria-live` and formatted with `formatters`.

### 3.8 About the data (`about.html`, Huy)
- Data: BITRE (2023a) national workbook, Traffic rows, 2011–2021; ABS Table 59 for population (June 2021). Processing in KNIME (link to GitHub).
- Limitations (bullets): admissions count hospital separations, not people; three counting changes (Victoria 2012, bed-day rules July 2015, NSW 2017); 2021 death fields are blank, so the death check covers 2011–2020; remoteness is where the patient lives, not where the crash happened; the data show hospital use, not crash causes; responses come from the cited research.
- References in APA 7 (the 10 sources listed in §8).
- Credits: team members, unit, tutor, year.

#### 3.8.1 Glossary (Huy, task 2.11)
*To be written by Huy (task 0.5).* Planner summary: a small button next to "bed day", "admission", "per 100,000" and "index (100 = average)" opens a popover with the definition; Escape closes it and focus returns to the button; the full list is on this page. Definitions live in `shared-constants.js` (`GLOSSARY`).

---

## 4. Charts

### 4.0 Rules for every chart
- Each chart lives in a `<figure>` with: a title (a finding, not a label; `h2` when the figure sits directly under the page's `h1`, `h3` inside a section that has its own `h2`, see §3), a subtitle `<p class="chart-subtitle">` (measure · group · years), the control row (if any) above the plot, the plot container `<div class="chart" id="chart-x">`, an HTML legend when there are ≥2 series, and `<details class="data-table"><summary>Show data table</summary>…</details>` built from the same data.
- SVG: `role="group"` (not `role="img"`, which would hide the focusable marks inside it from screen readers), `aria-labelledby` pointing to a `<title>` and `aria-describedby` to a `<desc>` inside the SVG; the `<desc>` states the main finding in one sentence.
- **Width:** charts are drawn at the container's real width (no fixed `viewBox` scaling), so text never shrinks below 12 px. Redraw on window resize (debounced 200 ms) without animation. Height: fixed per chart, with a smaller value below 768 px.
- **Scales:** every bar starts at zero; the line chart's y-axis starts at zero. No dual axes. Gridlines light (`--grid`), axis text `--ink-2`, 12 px minimum.
- **Marks:** bars ≥ 8 px wide, rounded top corners (2 px), 2 px gap between neighbouring bars; lines 2 px; points 8 px diameter with a 1.5 px surface-coloured ring.
- **Colour (one rule for the whole site):** blue `#2a78d6` = admissions (how many cases); orange `#eb6834` = bed days (how long they stay); grey `#8c8b85` = comparison group (all road injuries, summer). Text never uses series colours.
- **Labels:** selective direct labels (line ends, bar values); one annotation per chart that states its finding in words.
- **Tooltips:** one shared tooltip element (`#tooltip`, `role="tooltip"`). Shown on `mouseenter`/`mousemove` and on keyboard `focus` of a mark; hidden on `mouseleave`, `blur` and Escape. Content: bold heading, value with unit, group/year, and number of admissions behind the mark. Positioned near the pointer (or the focused mark), kept inside the viewport.
- **Focusable marks:** each data mark has `tabindex="0"` and an `aria-label` that reads like the tooltip. Focus outline visible (2 px `--ink`).
- **Motion:** transitions 600 ms `d3.easeCubicInOut`; bars grow from the baseline the first time the chart scrolls into view (IntersectionObserver, once). If `prefers-reduced-motion: reduce`, all durations are 0.
- **Update pattern:** use `selection.join(enter, update, exit)` with key functions so marks animate between states.

### 4.A Big picture — `chart-a-big-picture.js` (RQ1, RQ3)
- Title: "Pedestrians use twice their share of hospital beds". Subtitle: "Pedestrian share of all road-injury bed days and admissions, Australia, 2011–2021".
- Data: `pedestrian_share_by_year.csv`.
- x: `scaleLinear` 2011–2021 (integer ticks; 6 ticks below 768 px). y: `scaleLinear` 0 to 16 (%), ticks every 4, labels "0%".
- Series: bed-day share (orange line + points), admission share (blue line + points). Direct labels at the 2021 end: "Bed days 11.4%", "Admissions 5.9%" (right margin wide enough; below 768 px put the labels below the last points, where neither line runs).
- Series breaks: three dashed vertical grey lines at 2012, 2015.5 and 2017, each with a short label ("Vic. counting change", "Bed-day rule change", "NSW counting change") and a transparent focusable hit area (`aria-label` = tooltip text). Tooltip text: 2012 "Victoria stopped counting emergency-only cases (from July 2012)."; 2015.5 "New bed-day rules for transfers and rehabilitation (from July 2015); bed days jump while admissions do not."; 2017 "NSW stopped counting emergency-only cases (from June 2017)."
- Control: checkbox "Remove bed days of patients who died (2011–2020)". On: adds a dashed orange line for `bed_day_share_excl_died_pct` (2011–2020 only; 2021 is blank and must not be drawn as 0) and a note "2021 is not shown: death fields are blank." Off: line removed with a fade.
- Point tooltip: "2021 · Bed days 11.4% · Admissions 5.9% · 9.7 days per case · 2,334 admissions".
- Annotation: none beyond direct labels (the KPI cards carry the finding).
- **Legend highlight (v2.0, task 2.2):** the legend entries "Share of bed days" and "Share of admissions" are `<button aria-pressed>`. Pressing one highlights that series: the other line, its points and its end label fade to 30% opacity (600 ms; 0 with reduced motion). Pressing the highlighted entry again shows both at full strength. One series at most is highlighted (`chartState.a.highlight`: `null` | `"bed"` | `"adm"`). The "without deaths" entry stays plain text.
- **Year scrubbing (v2.0, task 2.2):** one transparent layer over the plot replaces the eleven per-year hit areas. Moving the pointer selects the nearest year: a vertical guide line, larger points for that year, and the tooltip above. Keyboard: the layer is one tab stop with `role="slider"`, `aria-label="Year"`, `aria-valuemin` 2011, `aria-valuemax` 2021, `aria-valuenow` and an `aria-valuetext` that reads like the tooltip. Focus starts on the last year shown (2021 the first time); ← / → move one year, Home / End jump to the first / last year. The tooltip hides on pointer leave, blur and Escape. The three series-break hit areas stay focusable and sit above the layer.

### 4.B Bridge — `chart-b-bridge.js` (RQ4, RQ7)
- Title: "Young people make the cases; older people fill the beds". Subtitle: "Share of pedestrian admissions and bed days by age group, 2021".
- Data: `age_story_2021.csv`; compute shares (§2.2).
- x: `scaleBand` of age groups in fixed order `0-7, 8-16, 17-25, 26-39, 40-64, 65-74, 75+` (display "0–7 yrs" …), inner `scaleBand` for the two measures. y: 0 to max share, `nice()`, "%" ticks.
- Bars: blue = share of admissions, orange = share of bed days. Legend above plot.
- Hover/focus an age group (a transparent rect over the whole group): the other groups fade to 30% opacity; tooltip "65–74 yrs · 10.3% of pedestrian admissions · 16.7% of pedestrian bed days".
- Annotations (desktop only, hidden below 768 px): a bracket over the under-40 groups with "Under 40 / {under40_case_share} of cases · {under40_bed_share} of bed days" and one over 65–74 and 75+ with "65 and over / {over65_case_share} of cases · {over65_bed_share} of bed days". Text is centred over its bracket but moved inwards if it would be cut off at the SVG edge.
- **Open a story (v2.0, task 2.3):** clicking an age group, or pressing Enter on its focused hit area, opens its story page with the group in the URL: 40–64, 65–74 and 75+ → `story-older.html?age=…`; 0–7 to 26–39 → `story-young.html?age=…` (`STORY_FOR_AGE`). The hit areas get `role="link"`, a pointer cursor, and an `aria-label` ending "Opens Story 1 · Older pedestrians." (or Story 4). Hover and focus still fade the other groups. On a touch screen the first tap shows the tooltip and a second tap on the same group opens the story, so the numbers can be read first.
- **Reader's age group (v2.0, task 2.1):** when `siteState.ageGroup` is set, a light band (`COLORS.highlight`) is drawn behind that group's two bars, its x-axis label is bold, and its hit area's `aria-label` ends with "(your age group)". Redrawn on `agechange`.

### 4.C Story 1 — `chart-c-age-rates.js` (RQ4)
- Title: "People aged 75+ carry the heaviest burden". Subtitle changes with the toggle: "Pedestrian bed days per 100,000 people, 2021" / "Pedestrian admissions per 100,000 people, 2021".
- Data: `age_story_2021.csv`.
- Control: segmented toggle (two `<button>`s with `aria-pressed`): "Bed days" (default) | "Admissions".
- Bars: one per age group, orange for bed days, blue for admissions (colour transitions with the toggle). y: 0 to max of the current measure, `nice()`.
- Reference line: all-ages rate (§2.2), dark grey, label "All ages: 89" / "All ages: 9.1".
- Value labels on bar tops. Annotation on the 75+ bar: "{ratio}× the average" (bed days 2.7×, admissions 1.6×), computed.
- Tooltip: "75+ yrs · 235.6 bed days per 100,000 · 4,446 bed days · 278 admissions · population 1,886,917".
- **Sort (v2.0, task 2.4):** a second segmented toggle labelled "Order": "Age order" (default) | "Highest first" (`chartState.c.order`: `"age"` | `"value"`). Highest first sorts the bars by the current measure, largest on the left, and re-sorts when the measure changes. Bars, value labels, hit areas and x-axis labels move to their new places with a keyed transition (600 ms, `d3.easeCubicInOut`; 0 with reduced motion). The 75+ annotation follows its bar: it sits left of the bar when the bar is in the right half of the chart, and right of it otherwise, so it is never cut off.
- **Reader's age group (v2.0, task 2.1):** the same band, bold axis label and "(your age group)" label ending as chart B; it moves with its bar when sorted.

### 4.D Story 2 — `chart-d-vehicle.js` (RQ5)
- Title: "Trucks, buses and trains mean the longest stays". Subtitle: "Average bed days per pedestrian admission by the vehicle that hit them, 2016–2021 · {age label}".
- Data: `vehicle_2016_2021.csv` (All ages) and `vehicle_by_age_2016_2021.csv`.
- Vehicles shown, in fixed order lightest to heaviest (top to bottom), with display labels:
  `Pedal cycle` → "Bicycle"; `2- or 3- wheeled motor vehicle` → "Motorcycle"; `Car, pick-up truck or van` → "Car, ute or van"; `Heavy transport vehicle or bus` → "Truck or bus"; `Train` → "Train". (Match on trimmed text; other counterparties are not shown and a footnote says so: "Other and unspecified vehicles are not shown.")
- Control: `<select>` labelled "Age group": "All ages" (default) then the 7 age groups.
- Horizontal bars (orange). x: fixed domain 0 to the maximum `bed_days_per_case` over all valid cells (≥ 20 admissions) in both files, `nice()`, so bars stay comparable when the age changes. y: `scaleBand` of the five vehicles.
- Value label at bar end: "22.0 days (n = 594)". Cells with < 20 admissions: no bar; text "Fewer than 20 cases" in grey italic at the start of the row.
- Tooltip: "Truck or bus · 22.0 bed days per admission · 594 admissions · 13,046 bed days · 3.9% of pedestrian admissions, 8.0% of bed days" (shares only for All ages).
- Annotation: "{ratio}× as long as a car" (computed, e.g. 2.1×) in the gap under the truck bar, shown only when both the truck and car cells have ≥ 20 admissions. Band padding 0.5 so the note has room.
- **Switch measure (v2.0, task 2.5):** a segmented toggle labelled "Measure": "Days per case" (default) | "Share of cases vs bed days" (`chartState.d.measure`: `"perCase"` | `"share"`). The share view draws two thin bars per vehicle row: blue = share of pedestrian admissions, orange = share of pedestrian bed days (%), so a vehicle with few cases but long stays shows a longer orange bar than blue bar. All ages uses `case_share_pct` / `bed_day_share_pct`; one age group uses the within-group shares of §2.2. The x domain is fixed per measure: days per case as above; shares from 0 to the largest valid share over all ages and every age group, `nice()`. Value labels at the bar ends ("3.9%", "8.0%"; below 768 px the same). A legend (Share of pedestrian admissions, Share of pedestrian bed days) shows only in the share view. Annotation in the share view, under the truck row: "Bed-day share {ratio}× its share of cases" (computed; "{ratio}× its share of cases" below 768 px, where the long form does not fit), shown only when the truck cell has ≥ 20 admissions. Below 768 px the share axis has three ticks (0%, 50%, 100%). The small-numbers rule, the age select and the fixed vehicle order stay. Subtitle in the share view: "Share of pedestrian admissions and bed days by the vehicle that hit them, 2016–2021 · {age label}". Tooltip in the share view: "Truck or bus · 3.9% of pedestrian admissions (594) · 8.0% of pedestrian bed days (13,046)". The data table shows the current measure (cells "3.9% / 8.0%" in the share view).
- **Reader's age group (v2.0, task 2.1):** when `siteState.ageGroup` is set on load or by `agechange`, `chartState.d.ageGroup` takes it and the select shows it; the reader can still choose another group.

### 4.E Story 3 — `chart-e-season.js` (RQ6)
- Title: "Winter is the peak season for pedestrian admissions". Subtitle: "Admissions index, 100 = average season, 2011–2019" / "Pedestrian share of road-injury admissions, summer and winter, 2011–2021".
- Data: `season_2011_2019.csv`, `season_by_year.csv`. Season order: Summer (Dec–Feb), Autumn (Mar–May), Winter (Jun–Aug), Spring (Sep–Nov).
- Control: segmented toggle "Average" (default) | "Year by year".
- **Average view:** grouped bars per season: blue = pedestrians `ped_index`, grey = all road injuries `all_index`. y: 0 to 125. Reference line at 100, named in the HTML legend ("Average season = 100", line swatch) because an in-chart label collided with the bars at every width. Annotation "+12%" above the winter pedestrian bar (computed from `ped_index` − 100). Legend: Pedestrians, All road injuries, Average season = 100.
- **Year-by-year view:** dumbbell chart, one row per year (2011 top → 2021 bottom). x: `ped_share_pct`, from 1 point below the lowest value to 1 point above the highest (whole percentages). Grey dot = summer, blue dot = winter, light grey connector. Legend: Summer, Winter. Annotation: "Winter above summer in all 11 years" (computed count).
- Switching views cross-fades the two groups (600 ms; 0 with reduced motion).
- Tooltips: Average "Winter · Pedestrian admissions index 112.2 · all road injuries 95.3 · 6,756 pedestrian admissions"; Year "2016 · Winter 8.6% · Summer 6.2%".

### 4.F Story 4 — `chart-f-young.js` (RQ7)
- Title: "Walking is a large share of road injuries for young children". Subtitle: "Pedestrians as a share of each age group's road-injury admissions, 2021".
- Data: `age_story_2021.csv`.
- Bars (blue) per age group, y 0 to 20%. Reference line at the all-ages share ("All ages 5.9%"): label above the line over the 26–39 group on ≥ 768 px; below 768 px the label moves to the empty top-right corner with a short line sample, because it collided with the value labels. Value labels on bars.
- Tooltip: "0–7 yrs · 17.4% of road-injury admissions were pedestrians · 123 pedestrian admissions of 707".
- Annotation on 0–7: "3× the all-ages share" (computed, rounded to whole number).

---

## 5. Visual design tokens (`css/base.css` `:root`)

```
--surface: #fcfcfb;   --surface-2: #f3f2ee;  --card: #ffffff;
--ink: #0b0b0b;       --ink-2: #52514e;      --ink-3: #6b6a65;
--grid: #e7e6e2;      --border: #d9d8d3;
--blue: #2a78d6;      --blue-tint: #eaf2fc;
--orange: #eb6834;    --orange-tint: #fdefe9;
--grey: #8c8b85;
--focus: #0b0b0b;
font: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif
```
- Body 16 px / 1.6; `h1` 40 px (28 px mobile); `h2` 28 px; `h3` 20 px; chart text 12–13 px; KPI numbers 40 px bold; hero number 96 px (64 px mobile) orange.
- Content width max 1100 px, side padding 24 px (16 px mobile). Story layout: two columns (chart 60%, text 40%) on ≥ 1024 px, alternating sides between stories (Story 1 and 3: text left; Story 2 and 4: text right); one column below 1024 px.
- Reader's age-group band in charts (v2.0): `--grid` (`COLORS.highlight`) behind the marks, plus a bold axis label, so the marking never depends on the band's colour alone.
- Contrast (checked): body text on surface 19.2:1; `--ink-2` 7.7:1; blue 4.3:1, orange 3.1:1, grey 3.3:1 against `--surface` (graphical objects ≥ 3:1, WCAG 2.1 SC 1.4.11). Never put text in orange or grey on the surface; KPI numbers in blue/orange are large text (≥ 24 px bold) so 3:1 applies.

---

## 6. Code structure and conventions

Follow the structure used in the unit's lab exercises (`shared-constants.js`, `load-data.js`, one file per chart, `interactions.js`), with classic `<script>` tags (no ES modules, no bundler) at the end of `<body>`. Files:

```
index.html, big-picture.html, story-older.html, story-vehicles.html,
story-winter.html, story-young.html, what-can-be-done.html, about.html     the eight pages (§3)
_template.html                 master copy of the shared header, nav and footer (§3.0); not linked from the site
README.md                      how to run, deploy, page and file list
SPEC.md                        this spec
.github/pull_request_template.md   checklist for every pull request
css/base.css                   tokens, layout, typography, header/nav, page sections, cards, buttons, responsive rules
css/visualisation.css          chart styles: axes, marks, legends, tooltip, data tables, focus styles
data/*.csv                     KNIME outputs (see §2)
lib/d3.v7.min.js               local copy of D3 v7 (works offline and on Mercury)
js/shared-constants.js         colours, sizes, breakpoints, durations, MIN_CELL, fixed orders, display labels,
                               series-break notes, formatters, chartState (control values), siteState (age group),
                               AGE_STORAGE_KEY, STORY_FOR_AGE, PAGES
js/helpers.js                  shared chart helpers: getChartSize, prefersReducedMotion, duration(), tooltip
                               show/hide/position, makeInteractive, buildDataTable, revealOnce, showChartMessage,
                               fillStats (data-stat spans)
js/site-components.js          (Huy) breadcrumb, story pager, glossary popovers
js/chart-a-big-picture.js      drawChartA() / updateChartA()
js/chart-b-bridge.js           drawChartB() / highlightAgeB()
js/chart-c-age-rates.js        drawChartC() / updateChartC()
js/chart-d-vehicle.js          drawChartD() / updateChartD()
js/chart-e-season.js           drawChartE() / updateChartE()
js/chart-f-young.js            drawChartF()
js/interactions.js             initInteractions(): chart controls, nav menu and part lists, age picker and age status,
                               Escape, resize handler (redraws the charts on this page). Huy adds the chart E/F and
                               calculator controls in a separate block commented "Huy".
js/load-data.js                loads and validates only the CSVs this page needs, computes §2.2 values, fills
                               data-stat spans, draws the charts on this page, calls initInteractions(); runs last
```

**Scripts on each page.** Every page loads the same shared scripts, plus only its own chart files, in this order:

```
lib/d3.v7.min.js → js/shared-constants.js → js/helpers.js → js/site-components.js (once it exists)
  → this page's chart files → js/interactions.js → js/load-data.js
```

| Page | Chart files | CSVs loaded (by `load-data.js`) |
|---|---|---|
| `index.html` | none | shares, totals, age, vehicle, seasonAverage (for the KPI and story-card numbers) |
| `big-picture.html` | chart A, chart B | shares, totals, age |
| `story-older.html` | chart C | age |
| `story-vehicles.html` | chart D | vehicle, vehicleByAge |
| `story-winter.html` | chart E | seasonAverage, seasonByYear |
| `story-young.html` | chart F | age |
| `what-can-be-done.html` | none (calculator: Huy) | shares (+ age for the calculator) |
| `about.html` | none | none |

**Per-page loading (task 1.2).** `load-data.js` works out what to load from the page itself, so no page lists its files by hand:
- `CHARTS` maps each chart to its container id, data files and draw function. A chart counts only if its container (`#chart-x`) is on the page.
- `STAT_FILES` maps each `data-stat` key to the files needed to compute it (e.g. `beds_per_day` → shares; `bd_rate_ratio_75` → age; `n_years` → seasonByYear). The page's `[data-stat]` keys add their files.
- The union of those files is loaded with `Promise.allSettled`. A failed file shows the message (§2.1) only in the figures that need it; numbers that cannot be computed show "–".
- `document.body.dataset.page` names the page in console messages. A stat key missing from `STAT_FILES` is a coding error, logged with `console.error`.
- Other files can add their own needs: `EXTRA_FILES_FOR_PAGE` (in `shared-constants.js`) lists extra files per `data-page`, e.g. the calculator's `age` on what-can-be-done.

Conventions:
- `const` arrow functions as in the labs (`const drawChartA = (data) => { … }`); `camelCase` names that say what a thing is (`bedDayShare`, not `d2`).
- Each draw function: select container → clear → measure width → set scales → join marks → axes → labels/annotations → tooltip handlers → data table. Each `update…` function re-joins with transitions using the current `chartState`.
- No magic numbers in chart files: colours, margins, orders, durations and labels come from `shared-constants.js`.
- **Header comment in every JS and CSS file:**
  ```
  /* File: js/chart-d-vehicle.js
   * Purpose: Chart D (Story 2) – bed days per pedestrian admission by the vehicle that hit them.
   * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
   */
  ```
- Mark every accessibility feature with a comment starting `// A11Y:` (CSS: `/* A11Y: … */`) so markers can find them.
- Comment the *why* above each block (e.g. why the x domain is fixed in chart D), not every line.

---

## 7. Acceptance checklist (Definition of Done)

Every item applies to **all eight pages at 375, 768 and 1280 px**. `tests/check-site.mjs` (Huy, task 1.6) automates what it can.

Navigation (v2.0)
- [ ] Every nav link opens its page; that page's link has `aria-current="page"`, and on story pages the part button is marked as well.
- [ ] Part lists open and close with mouse and keyboard (Enter/Space on the button, Escape closes and returns focus); the menu button works the same way below 1024 px.
- [ ] Each page loads only the CSVs in the §6 table (check the browser's Network tab) and only its own chart files.
- [ ] The age group chosen on Home is marked on big-picture (chart B), story-older (chart C), story-vehicles (chart D's select) and story-young (chart F); it survives a reload and page changes, also with storage blocked (`?age=`); "Clear" removes it everywhere.

Functional
- [ ] Every page loads from a local server (`python -m http.server`) and from Mercury with no console errors.
- [ ] All six charts render with the values in §2.2 and §4. Spot-check, on the page that holds each number: 62 beds (Home, big picture), 5.9% and 11.4% (Home, big picture), 235.6 (story-older, chart C tooltip and table), 22.0 (story-vehicles), +12% (story-winter), 17.4% (story-young).
- [ ] Every control works with mouse and keyboard: chart A checkbox, legend buttons and year slider (←/→, Home/End); chart B click/Enter opens the right story; chart C measure and sort toggles; chart D select and measure toggle; chart E and F controls; the age picker; nav links, part buttons, menu button, formula-card links.
- [ ] Chart A never draws a 2021 point for the "without deaths" line.
- [ ] Chart D shows "Fewer than 20 cases" for every vehicle–age cell below 20 (e.g. Train for every single age group).
- [ ] Tooltips appear on hover and on keyboard focus, disappear on mouse leave, blur and Escape, and stay inside the viewport.
- [ ] Each "Show data table" lists the same numbers as the chart.
- [ ] Resizing from 1280 to 375 px redraws charts with no overlap or clipped labels; chart text ≥ 12 px.
- [ ] Data load failure shows the message in the figure (test by renaming one CSV) and the other charts still draw.

Accessibility
- [ ] axe-core scan: no serious or critical violations.
- [ ] Tab order follows reading order; focus is always visible; skip link works.
- [ ] `prefers-reduced-motion: reduce` turns off all transitions and smooth scrolling.
- [ ] No information is carried by colour alone (legends + direct labels + tables).

Code quality
- [ ] File structure as §6; header comment (File, Purpose, Project) in every JS/CSS file; `A11Y:` comments present.
- [ ] No hard-coded data values in chart files except the documented constants.

---

## 8. References used on the page (APA 7)

Australian Bureau of Statistics. (2026). *National, state and territory population: Table 59* [Data set].
Australian Government. (2021). *National road safety strategy 2021–30*.
Beyer, F. R., & Ker, K. (2009). Street lighting for preventing road traffic injuries. *Cochrane Database of Systematic Reviews*, (1), CD004728. https://doi.org/10.1002/14651858.CD004728.pub2
Bureau of Infrastructure and Transport Research Economics. (2023a). *Hospitalised injury* [Data set].
Department of Infrastructure, Transport, Regional Development, Communications and the Arts. (2023). *Guide to safer freight vehicles*.
Hussain, Q., Feng, H., Grzebieta, R., Brijs, T., & Olivier, J. (2019). The relationship between impact speed and the probability of pedestrian fatality during a vehicle-pedestrian crash. *Accident Analysis & Prevention, 129*, 241–249. https://doi.org/10.1016/j.aap.2019.05.033
Phillips, R. O., Ulleberg, P., & Vaa, T. (2011). Meta-analysis of the effect of road safety campaigns on accidents. *Accident Analysis & Prevention, 43*(3), 1204–1218. https://doi.org/10.1016/j.aap.2011.01.002
RAA. (2025, April 4). *Switch on your headlights as clocks switch back*.
Simmons, S. M., Caird, J. K., Ta, A., Sterzer, F., & Hagel, B. E. (2020). Plight of the distracted pedestrian. *Injury Prevention, 26*(2), 170–176. https://doi.org/10.1136/injuryprev-2019-043426
Western, M. J., Withall, J., Sheppard, R., Greaves, C., Hillsdon, M., & Stathi, A. (2025). Why didn't the senior citizen cross the road? *Age and Ageing*. https://doi.org/10.1093/ageing/afaf345

---

## 9. Deployment and releases
- **Git flow:** personal branches → pull request into `dev` (reviewed by the other person, merged with a merge commit, never squashed) → release pull request `dev` → `main`. Nobody commits to `dev` or `main` directly or force-pushes. Release tags: `v0.1-single-page` (baseline), `v0.9-multipage` (before 22:00 Sun 29 Nov, demo at Stand-up 3), `v1.0` (before 20:00 Thu 3 Dec); after that only blocker fixes (`v1.0.1`).
- **Mercury:** deploy only what is on `main` at a release tag. Upload the site files (the eight pages, `css/`, `js/`, `data/`, `lib/`; not `tests/`, `.github/` or `_template.html`) to the Mercury folder agreed at the team meeting (task 0.4), e.g. `http://mercury.swin.edu.au/cos30045/s<student id>/<project folder>/index.html`. Then open all eight pages on the live URL at 375, 768 and 1280 px and check the console. Links between pages are relative, so the folder name does not matter.
- **GitHub:** the README links to the Mercury URL. Post both links in the Canvas submission comment.
- When the KNIME workflow is re-run, copy its CSV outputs into `data/` unchanged and re-run the acceptance checklist on every page.
