# Few cases, long stays

**Pedestrian road injuries and the hidden hospital burden in Australia, 2011–2021**

COS30045 Data Visualisation · Team MienTayDuo · Tran Quang Huy (106212636), Chung Hien Thong (106212681) · Tutor: Dr. Chiem Tri Quang

A one-page scrolling data story built with HTML, CSS and D3 v7. It opens with the big picture (pedestrians are 5.9% of road-injury admissions but 11.4% of bed days, about 62 beds a day in 2021), then splits it with *bed days = cases × days per case* into four stories:

| Part | Story | Chart | Research question |
|---|---|---|---|
| Big picture | Pedestrians use twice their share of hospital beds | A – line chart, 2011–2021 | RQ1, RQ3 |
| Bridge | Young people make the cases; older people fill the beds | B – grouped bars by age | RQ4, RQ7 |
| A: longer stays | 1. Older people | C – rate per 100,000 by age, toggle | RQ4 |
| A: longer stays | 2. Heavier vehicles | D – days per case by vehicle, age select | RQ5 |
| B: more cases | 3. Winter | E – seasonal index / year-by-year dumbbell, toggle | RQ6 |
| B: more cases | 4. Children and young people | F – pedestrian share by age | RQ7 |

The full specification is in [`SPEC.md`](SPEC.md).

## Run it

The page loads CSV files with `d3.csv`, which browsers block when a page is opened straight from disk (`file://`). Run it through a local web server from this folder:

```bash
python -m http.server 8000
# then open http://localhost:8000/
```

(VS Code's *Live Server* extension also works.) If the page is opened from disk, each chart shows a message explaining this instead of failing silently.

## Deploy to Mercury

Upload the whole folder (keep the structure; `tests/` is not needed) to the unit's Mercury space, as in the labs:

```
http://mercury.swin.edu.au/cos30045/s106212681/<folder>/index.html
```

Check after uploading: all six charts draw, and the browser console shows no errors.

## Files

```
index.html                  page structure and all story text (numbers come from data-stat spans)
css/base.css                design tokens, layout, typography, controls, responsive rules
css/visualisation.css       chart styles: axes, marks, labels, tooltip, legends, data tables
js/shared-constants.js      colours, chart sizes, data file contract, labels, formatters, shared state
js/helpers.js               shared chart helpers: sizing, SVG setup, tooltip, focusable marks, tables, reveal
js/chart-a-big-picture.js   chart A
js/chart-b-bridge.js        chart B
js/chart-c-age-rates.js     chart C
js/chart-d-vehicle.js       chart D
js/chart-e-season.js        chart E
js/chart-f-young.js         chart F
js/interactions.js          controls, mobile menu, scroll-spy, Escape, resize
js/load-data.js             loads and checks the CSVs, computes derived values, draws the charts
lib/d3.v7.min.js            D3 v7.9.2 (ISC licence, see lib/D3-LICENSE.txt), kept locally so the page works offline
data/                       the seven CSV files (see below)
tests/                      automated checks (Playwright + axe-core)
```

Scripts are classic `<script>` tags in a fixed order (constants → helpers → charts → interactions → loader), following the unit's lab structure.

## Data

All data come from BITRE, *Hospitalised injury* data (2011–2021), plus ABS population estimates (June 2021) for the age rates. The CSV files are outputs of the team's KNIME workflow (`MienTayDuo_DataProcessing_*.knwf`):

| File | KNIME part | Used by |
|---|---|---|
| `pedestrian_share_by_year.csv` | 1 | A |
| `annual_totals.csv` | 1 | A (all-road-user days per case) |
| `season_2011_2019.csv`, `season_by_year.csv` | 6 | E |
| `vehicle_2016_2021.csv`, `vehicle_by_age_2016_2021.csv` | 7 | D |
| `age_story_2021.csv` | 8 | B, C, F |

> **To do before final submission:** the part 6–8 files in `data/` were produced by a script that repeats the KNIME steps, with the same column names. After running parts 6–8 in KNIME, replace these five files with the KNIME CSV Writer outputs and re-run the tests. The page does not need any code change.

Data rules applied in the code: blank or "n.p." cells are treated as missing (never as 0); the 2021 bed days of patients who died are blank, so the dashed line in chart A stops at 2020; cells with fewer than 20 admissions are not drawn in chart D.

## Accessibility

Accessibility code is marked with `// A11Y:` comments. In summary: skip link; landmarks and one `h1`; every chart has a `<title>` and `<desc>` stating its finding; every data mark can be reached with Tab and has an `aria-label` that matches its tooltip; Escape closes the tooltip and the menu; toggles use `aria-pressed`; every chart has a data table; text in charts is at least 12 px at every screen width; colour is never the only cue (legends, direct labels, tables); animation is turned off under `prefers-reduced-motion`.

Colour rule for the whole site: **blue = admissions (how many cases), orange = bed days (how long they stay), grey = comparison group**. Blue and orange stay distinct for colour-blind readers (ΔE 24.7 under simulated protanopia; target 8 or more). The grey is deliberately neutral (low chroma) because it marks context, not a third category; it still differs from the orange by ΔE 10.3 under protanopia.

## Tests

```bash
cd tests
npm install
node check-site.mjs        # set CHROME_PATH if Chrome is not found automatically
```

The script starts its own local server and checks, at 375, 768 and 1280 px: no console errors; all six charts drawn; the key numbers in the text (62, 5.9%, 11.4%, 22.0, 12%, 17.4%); no blank numbers; chart text ≥ 12 px; no sideways scrolling; no overlapping or cut-off chart labels; and no serious or critical axe-core issues. It also checks every control, keyboard access to chart marks, the mobile menu, reduced motion, and that a missing data file only affects its own chart. Full-page screenshots are saved in `tests/screenshots/`.

## References for the data

- Bureau of Infrastructure and Transport Research Economics. (2023a). *Hospitalised injury* [Data set].
- Australian Bureau of Statistics. (2026). *National, state and territory population: Table 59* [Data set].

The full reference list (including the sources for each "What can be done" response) is in the *About the data* section of the page.
