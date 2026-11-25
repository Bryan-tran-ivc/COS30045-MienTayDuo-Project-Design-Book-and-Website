/* File: js/shared-constants.js
 * Purpose: Every value the charts share – colours, sizes, breakpoints, durations, the small-numbers rule, fixed category
 *          orders, display labels, series-break notes, number formatters and the current state of each control.
 *          Chart files read from here so they contain no "magic numbers" (SPEC.md §6).
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

// ---------- Colour rule (SPEC §4.0): blue = admissions, orange = bed days, grey = comparison ----------
const COLORS = {
  admissions: "#2a78d6",
  bedDays: "#eb6834",
  comparison: "#8c8b85",
  ink: "#0b0b0b",
  ink2: "#52514e",
  grid: "#e7e6e2",
  card: "#ffffff",
  highlight: "#e7e6e2", // band behind the reader's age group (SPEC §5); always paired with a bold axis label
};

// ---------- Layout ----------
const BREAKPOINT_MOBILE = 768; // px; below this, charts use the mobile height and margins
const RESIZE_DEBOUNCE_MS = 200;
const TRANSITION_MS = 600; // SPEC §4.0; set to 0 when the user prefers reduced motion (see helpers.js)

// Height of the plot area container and margins around the inner chart, per chart, desktop and mobile
const CHART_LAYOUT = {
  a: {
    height: { desktop: 380, mobile: 300 },
    margin: {
      desktop: { top: 24, right: 128, bottom: 40, left: 48 },
      mobile: { top: 40, right: 12, bottom: 40, left: 40 },
    },
  },
  b: {
    height: { desktop: 360, mobile: 300 },
    margin: {
      desktop: { top: 20, right: 12, bottom: 40, left: 48 },
      mobile: { top: 16, right: 8, bottom: 52, left: 40 },
    },
  },
  c: {
    height: { desktop: 340, mobile: 300 },
    margin: {
      desktop: { top: 24, right: 12, bottom: 40, left: 48 },
      mobile: { top: 24, right: 8, bottom: 52, left: 40 },
    },
  },
  d: {
    height: { desktop: 340, mobile: 330 },
    margin: {
      desktop: { top: 8, right: 128, bottom: 40, left: 112 },
      mobile: { top: 8, right: 64, bottom: 40, left: 100 },
    },
  },
  e: {
    height: { desktop: 380, mobile: 380 },
    margin: {
      desktop: { top: 24, right: 16, bottom: 44, left: 52 },
      mobile: { top: 24, right: 12, bottom: 44, left: 44 },
    },
  },
  f: {
    height: { desktop: 320, mobile: 300 },
    margin: {
      desktop: { top: 24, right: 12, bottom: 40, left: 48 },
      mobile: { top: 24, right: 8, bottom: 52, left: 40 },
    },
  },
};

// Mark sizes (SPEC §4.0)
const POINT_RADIUS = 4; // 8 px diameter
const BAR_CORNER = 2;
const MIN_BAR_WIDTH = 8;
const DIMMED_OPACITY = 0.3; // series or groups that are not highlighted (SPEC §4.A, §4.B)
// Reference label placed in the strip above the plot on phones (chart C): line sample, then the label (px)
const REF_LABEL_TOP = { sampleY: -12, sampleLength: 16, labelX: 22 };

// ---------- Data rules ----------
const MIN_CELL = 20; // SPEC §2.3: no mark for fewer than 20 admissions
const DAYS_IN_YEAR = 365;
const TARGET_CUT = 0.3; // national serious-injury target used for the "beds freed" figure
const LATEST_YEAR = 2021;

// Data files and the columns each must contain (SPEC §2). Checked in load-data.js.
const DATA_FILES = {
  shares: {
    path: "data/pedestrian_share_by_year.csv",
    numeric: [
      "Calendar year",
      "Hospitalisations",
      "Bed days",
      "admission_share_pct",
      "bed_day_share_pct",
      "bed_day_share_excl_died_pct",
      "bed_days_per_case",
    ],
    text: [],
    charts: ["a"],
  },
  totals: {
    path: "data/annual_totals.csv",
    numeric: ["Calendar year", "Sum(Hospitalisations)", "Sum(Bed days)"],
    text: [],
    charts: ["a"],
  },
  age: {
    path: "data/age_story_2021.csv",
    numeric: [
      "Hospitalisations",
      "ped_admissions",
      "ped_bed_days",
      "ped_share_of_age_pct",
      "ped_bed_days_per_case",
      "population",
      "ped_admissions_per_100k",
      "ped_bed_days_per_100k",
    ],
    text: ["Age group"],
    charts: ["b", "c", "f"],
  },
  vehicle: {
    path: "data/vehicle_2016_2021.csv",
    numeric: ["Hospitalisations", "Bed days", "bed_days_per_case", "case_share_pct", "bed_day_share_pct"],
    text: ["Counterparty"],
    charts: ["d"],
  },
  vehicleByAge: {
    path: "data/vehicle_by_age_2016_2021.csv",
    numeric: ["Hospitalisations", "Bed days", "bed_days_per_case"],
    text: ["Age group", "Counterparty"],
    charts: ["d"],
  },
  seasonAverage: {
    path: "data/season_2011_2019.csv",
    numeric: ["Hospitalisations", "ped_admissions", "ped_share_pct", "ped_index", "all_index"],
    text: ["season"],
    charts: ["e"],
  },
  seasonByYear: {
    path: "data/season_by_year.csv",
    numeric: ["Calendar year", "Hospitalisations", "ped_admissions", "ped_share_pct"],
    text: ["season"],
    charts: ["e"],
  },
};

// Files a page needs beyond its charts and the numbers in its text, by <body data-page> (SPEC §6). load-data.js
// works out the rest from the page itself.
const EXTRA_FILES_FOR_PAGE = {
  "what-can-be-done": ["age"], // beds-freed calculator (Huy, task 2.10) uses each age group's bed days
};

// ---------- Fixed category orders and display labels ----------
const AGE_ORDER = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];
const AGE_LABELS = {
  "0-7": "0–7 yrs",
  "8-16": "8–16 yrs",
  "17-25": "17–25 yrs",
  "26-39": "26–39 yrs",
  "40-64": "40–64 yrs",
  "65-74": "65–74 yrs",
  "75+": "75+ yrs",
};
const UNDER_40 = ["0-7", "8-16", "17-25", "26-39"];
const OVER_65 = ["65-74", "75+"];

// ---------- Reader's age group (SPEC §3.0.4, task 2.1) ----------
const AGE_STORAGE_KEY = "mtd-age-group"; // localStorage key
const AGE_PARAM = "age"; // URL parameter, e.g. story-older.html?age=65-74
// The story page about each age group: 40 and over → Story 1, under 40 → Story 4 (also used by chart B, SPEC §4.B)
const STORIES = {
  older: { page: "story-older.html", label: "Story 1 · Older pedestrians" },
  young: { page: "story-young.html", label: "Story 4 · Children and young people" },
};
const STORY_FOR_AGE = {
  "0-7": "young",
  "8-16": "young",
  "17-25": "young",
  "26-39": "young",
  "40-64": "older",
  "65-74": "older",
  "75+": "older",
};

const SEASON_ORDER = ["Summer", "Autumn", "Winter", "Spring"];
const SEASON_LABELS = {
  Summer: "Summer (Dec–Feb)",
  Autumn: "Autumn (Mar–May)",
  Winter: "Winter (Jun–Aug)",
  Spring: "Spring (Sep–Nov)",
};

// Vehicles shown in chart D, lightest to heaviest (keys are BITRE counterparty names, matched after trimming
// and collapsing spaces, because BITRE writes "2- or 3- wheeled motor vehicle" with an extra space)
const VEHICLES = [
  { key: "Pedal cycle", label: "Bicycle" },
  { key: "2- or 3- wheeled motor vehicle", label: "Motorcycle" },
  { key: "Car, pick-up truck or van", label: "Car, ute or van" },
  { key: "Heavy transport vehicle or bus", label: "Truck or bus" },
  { key: "Train", label: "Train" },
];
const ALL_AGES = "All ages";

// ---------- Series breaks drawn on chart A (from the BITRE data dictionary) ----------
const SERIES_BREAKS = [
  {
    year: 2012,
    label: ["Vic. counting", "change"],
    note: "Victoria stopped counting emergency-only cases (from July 2012).",
  },
  {
    year: 2015.5,
    label: ["Bed-day rule", "change"],
    note: "New bed-day rules for transfers and rehabilitation (from July 2015): bed days jump while admissions do not.",
  },
  {
    year: 2017,
    label: ["NSW counting", "change"],
    note: "NSW stopped counting emergency-only cases (from June 2017).",
  },
];

// ---------- Number formatters (SPEC §2.2: never format inline) ----------
const formatters = {
  pct1: (value) => `${d3.format(".1f")(value)}%`,
  pct0: (value) => `${d3.format(".0f")(value)}%`,
  dec1: (value) => d3.format(".1f")(value),
  dec0: (value) => d3.format(".0f")(value),
  count: (value) => d3.format(",")(Math.round(value)),
  ratio1: (value) => d3.format(".1f")(value),
  year: (value) => d3.format("d")(value),
};

// ---------- Current state of each chart's control (changed by interactions.js) ----------
const chartState = {
  a: { showWithoutDeaths: false, highlight: null, year: null }, // highlight: null | "bed" | "adm"; year: last scrubbed
  c: { measure: "bedDays", order: "age" }, // measure: "bedDays" | "admissions"; order: "age" | "value"
  d: { ageGroup: ALL_AGES, measure: "perCase" }, // measure: "perCase" | "share"
  e: { view: "average" }, // "average" | "year"
};

// Site-wide setting: the reader's age group (an AGE_ORDER key, or null). Set by interactions.js from ?age= or
// localStorage before the charts are drawn; changes fire the "agechange" event on document.
const siteState = { ageGroup: null };

// Loaded data and derived values, filled by load-data.js and read by the chart files
const chartData = {};
const stats = {};

// Scales are kept here (as in the labs) so update functions can reuse them
const chartScales = { a: {}, b: {}, c: {}, d: {}, e: {}, f: {} };

// Whether each chart has been revealed (bars grown in) – set when it first scrolls into view
const revealed = { a: false, b: false, c: false, d: false, e: false, f: false };
