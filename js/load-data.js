/* File: js/load-data.js
 * Purpose: Loads every KNIME output CSV, converts and validates it, computes the few values the browser calculates
 *          (SPEC.md §2.2), fills the numbers in the story text, then draws each chart whose data loaded and wires up
 *          the controls. Loaded last, after all chart files (SPEC.md §6).
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

// Which data files each chart needs, and the function that draws it
const CHARTS = {
  a: { containerId: "chart-a", files: ["shares", "totals"], draw: () => drawChartA() },
  b: { containerId: "chart-b", files: ["age"], draw: () => drawChartB() },
  c: { containerId: "chart-c", files: ["age"], draw: () => drawChartC() },
  d: { containerId: "chart-d", files: ["vehicle", "vehicleByAge"], draw: () => drawChartD() },
  e: { containerId: "chart-e", files: ["seasonAverage", "seasonByYear"], draw: () => drawChartE() },
  f: { containerId: "chart-f", files: ["age"], draw: () => drawChartF() },
};

// Charts that drew successfully (redrawn on resize by interactions.js)
const drawnCharts = new Set();

// Converts a CSV cell to a number. Blank or non-numeric text (e.g. BITRE's "n.p.") becomes null, never 0.
const toNumber = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim().replace(/,/g, "");
  if (text === "" || text.toLowerCase() === "n.p.") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

// Collapses repeated spaces so labels such as "2- or 3- wheeled motor vehicle" match reliably
const cleanText = (value) => (value === undefined || value === null ? "" : String(value).trim().replace(/\s+/g, " "));

// Loads one file, checks its columns and converts its rows
const loadFile = (key) => {
  const spec = DATA_FILES[key];
  return d3.csv(spec.path).then((rawRows) => {
    const headers = rawRows.columns.map((column) => column.trim());
    const missing = [...spec.numeric, ...spec.text].filter((column) => !headers.includes(column));
    if (missing.length > 0) {
      throw new Error(`${spec.path} is missing column(s): ${missing.join(", ")}`);
    }
    const rows = rawRows
      .map((raw) => {
        // KNIME may add extra columns (join keys, filter flags); only the listed columns are kept
        const trimmed = {};
        Object.keys(raw).forEach((column) => {
          trimmed[column.trim()] = raw[column];
        });
        const row = {};
        spec.numeric.forEach((column) => {
          row[column] = toNumber(trimmed[column]);
        });
        spec.text.forEach((column) => {
          row[column] = cleanText(trimmed[column]);
        });
        return row;
      })
      // Rows with an unknown age group are not shown in age charts
      .filter((row) => !("Age group" in row) || (row["Age group"] !== "" && row["Age group"] !== "Missing"));
    if (rows.length === 0) throw new Error(`${spec.path} has no data rows`);
    console.log(`Loaded ${spec.path}: ${rows.length} rows`);
    return rows;
  });
};

// Computes the values listed in SPEC §2.2 from whichever files loaded. Numbers are kept in chartData.derived;
// formatted text for the story is put in stats.
const computeDerivedValues = () => {
  const derived = {};

  if (chartData.shares) {
    const latest = chartData.shares.find((row) => row["Calendar year"] === LATEST_YEAR);
    if (latest) {
      derived.bedsPerDay = latest["Bed days"] / DAYS_IN_YEAR;
      stats.beds_per_day = formatters.dec0(derived.bedsPerDay);
      stats.beds_freed = formatters.dec0(derived.bedsPerDay * TARGET_CUT);
      stats.ped_adm_share_2021 = formatters.pct1(latest.admission_share_pct);
      stats.ped_bed_share_2021 = formatters.pct1(latest.bed_day_share_pct);
      stats.ped_bdpc_2021 = formatters.dec1(latest.bed_days_per_case);
    }
    const ratios = chartData.shares
      .filter((row) => row.admission_share_pct && row.bed_day_share_pct)
      .map((row) => row.bed_day_share_pct / row.admission_share_pct);
    stats.gap_min = formatters.ratio1(d3.min(ratios));
    stats.gap_max = formatters.ratio1(d3.max(ratios));
  }

  if (chartData.totals) {
    const latestTotal = chartData.totals.find((row) => row["Calendar year"] === LATEST_YEAR);
    if (latestTotal) {
      derived.allBedDaysPerCase = latestTotal["Sum(Bed days)"] / latestTotal["Sum(Hospitalisations)"];
      stats.all_bdpc_2021 = formatters.dec1(derived.allBedDaysPerCase);
    }
  }

  if (chartData.age) {
    const age = chartData.age;
    const pedCases = sumOf(age, "ped_admissions");
    const pedBedDays = sumOf(age, "ped_bed_days");
    const population = sumOf(age, "population");
    const sumFor = (groups, column) => sumOf(age.filter((row) => groups.includes(row["Age group"])), column);

    derived.pedCasesTotal = pedCases;
    derived.pedBedDaysTotal = pedBedDays;
    derived.allAgesAdmissionRate = (pedCases / population) * 100000;
    derived.allAgesBedDayRate = (pedBedDays / population) * 100000;
    derived.allAgesPedShare = (pedCases / sumOf(age, "Hospitalisations")) * 100;

    stats.under40_case_share = formatters.pct1((sumFor(UNDER_40, "ped_admissions") / pedCases) * 100);
    stats.under40_bed_share = formatters.pct1((sumFor(UNDER_40, "ped_bed_days") / pedBedDays) * 100);
    stats.over65_case_share = formatters.pct1((sumFor(OVER_65, "ped_admissions") / pedCases) * 100);
    stats.over65_bed_share = formatters.pct1((sumFor(OVER_65, "ped_bed_days") / pedBedDays) * 100);

    const oldest = age.find((row) => row["Age group"] === "75+");
    const youngest = age.find((row) => row["Age group"] === "0-7");
    stats.bd_rate_all = formatters.dec0(derived.allAgesBedDayRate);
    if (oldest) {
      stats.bd_rate_75 = formatters.dec0(oldest.ped_bed_days_per_100k);
      stats.bd_rate_ratio_75 = formatters.ratio1(oldest.ped_bed_days_per_100k / derived.allAgesBedDayRate);
      stats.bdpc_75 = formatters.dec1(oldest.ped_bed_days_per_case);
    }
    if (youngest) stats.share_0_7 = formatters.pct1(youngest.ped_share_of_age_pct);
    stats.share_all = formatters.pct1(derived.allAgesPedShare);
  }

  if (chartData.vehicle) {
    const find = (key) => chartData.vehicle.find((row) => row.Counterparty === key);
    const car = find("Car, pick-up truck or van");
    const truck = find("Heavy transport vehicle or bus");
    const train = find("Train");
    if (car) {
      stats.bdpc_car = formatters.dec1(car.bed_days_per_case);
      stats.car_case_share = formatters.pct1(car.case_share_pct);
    }
    if (truck) {
      stats.bdpc_truck = formatters.dec1(truck.bed_days_per_case);
      stats.truck_case_share = formatters.pct1(truck.case_share_pct);
      stats.truck_bed_share = formatters.pct1(truck.bed_day_share_pct);
    }
    if (train) stats.bdpc_train = formatters.dec1(train.bed_days_per_case);
  }

  if (chartData.seasonAverage) {
    const find = (season) => chartData.seasonAverage.find((row) => row.season === season);
    const winter = find("Winter");
    const summer = find("Summer");
    if (winter && summer) {
      stats.winter_up = formatters.pct0(winter.ped_index - 100);
      stats.summer_down = formatters.pct0(100 - summer.ped_index);
      stats.share_winter = formatters.pct1(winter.ped_share_pct);
      stats.share_summer = formatters.pct1(summer.ped_share_pct);
    }
  }

  if (chartData.seasonByYear) {
    const years = [...new Set(chartData.seasonByYear.map((row) => row["Calendar year"]))];
    const winterHigher = years.filter((year) => {
      const get = (season) =>
        chartData.seasonByYear.find((row) => row["Calendar year"] === year && row.season === season);
      const winter = get("Winter");
      const summer = get("Summer");
      return winter && summer && winter.ped_share_pct > summer.ped_share_pct;
    }).length;
    derived.yearsWinterHigher = winterHigher;
    derived.yearsTotal = years.length;
    stats.n_years = winterHigher === years.length ? String(years.length) : `${winterHigher} of ${years.length}`;
  }

  chartData.derived = derived;
};

// ---------- Start ----------
const fileKeys = Object.keys(DATA_FILES);

Promise.allSettled(fileKeys.map(loadFile)).then((results) => {
  const failed = new Set();
  results.forEach((result, index) => {
    const key = fileKeys[index];
    if (result.status === "fulfilled") {
      chartData[key] = result.value;
    } else {
      failed.add(key);
      console.error(`Could not load ${DATA_FILES[key].path}:`, result.reason);
    }
  });

  // Year-ordered and category-ordered copies, so every chart reads data in a fixed order
  if (chartData.shares) chartData.shares.sort((a, b) => a["Calendar year"] - b["Calendar year"]);
  if (chartData.age) chartData.age.sort((a, b) => AGE_ORDER.indexOf(a["Age group"]) - AGE_ORDER.indexOf(b["Age group"]));

  computeDerivedValues();
  fillStats(stats);

  const openedFromFile = window.location.protocol === "file:";
  Object.entries(CHARTS).forEach(([key, chart]) => {
    const missingFiles = chart.files.filter((file) => failed.has(file));
    if (missingFiles.length > 0) {
      // Error handling: this chart shows a message; the other charts still draw
      const reason = openedFromFile
        ? "The data could not be loaded. Open the page through a web server (see README)."
        : `The data for this chart could not be loaded (${missingFiles.map((f) => DATA_FILES[f].path).join(", ")}).`;
      showChartMessage(chart.containerId, reason);
      return;
    }
    try {
      chart.draw();
      drawnCharts.add(key);
    } catch (error) {
      console.error(`Chart ${key.toUpperCase()} could not be drawn:`, error);
      showChartMessage(chart.containerId, "This chart could not be drawn. Please reload the page.");
    }
  });

  initInteractions();
});
