/* File: js/chart-e-season.js
 * Purpose: Chart E (Story 3, winter, RQ6) – two views behind one toggle: "Average" (admissions index by season,
 *          pedestrians vs all road injuries, 2011–2019) and "Year by year" (pedestrian share of admissions in summer
 *          and winter for each year, 2011–2021, as a dumbbell chart).
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

const VIEWS_E = {
  average: {
    subtitle: "Admissions index, 100 = average season, 2011–2019",
    legend: [
      { label: "Pedestrians", swatch: "swatch--blue" },
      { label: "All road injuries", swatch: "swatch--grey" },
      { label: "Average season = 100", swatch: "swatch--ref" },
    ],
  },
  year: {
    subtitle: "Pedestrian share of road-injury admissions, summer and winter, 2011–2021",
    legend: [
      { label: "Summer", swatch: "swatch--dot-grey" },
      { label: "Winter", swatch: "swatch--dot-blue" },
    ],
  },
};

const drawChartE = () => {
  const size = getChartSize("chart-e", "e");
  const winter = chartData.seasonAverage.find((d) => d.season === "Winter");

  createChartSvg(
    "chart-e",
    size,
    "Pedestrian admissions by season, as an index and year by year",
    `Pedestrian admissions are highest in winter: ${winter ? formatters.dec1(winter.ped_index) : "–"} against an average season of 100, while all road injuries are close to 100 in every season.`,
  );
  chartScales.e = { size };

  if (revealed.e) {
    updateChartE(true);
  } else {
    updateChartE(true, true);
    revealOnce("chart-e", () => {
      revealed.e = true;
      updateChartE(prefersReducedMotion(), false, true);
    });
  }
  buildTablesE();
};

// Draws the view in chartState.e. The old view fades out and is removed; the new one fades in.
// growOnly: used for the first reveal of the average view (bars grow instead of fading in)
const updateChartE = (instant = false, atBaseline = false, growOnly = false) => {
  const view = chartState.e.view;
  const inner = d3.select("#chart-e .inner-chart");
  const fade = instant ? 0 : duration(300);

  if (!growOnly) {
    inner
      .selectAll("g.view")
      .attr("class", "view view--leaving")
      .transition()
      .duration(fade)
      .attr("opacity", 0)
      .remove();
  }

  // HTML legend and subtitle for the current view
  d3.select("#legend-e")
    .selectAll("li")
    .data(VIEWS_E[view].legend, (d) => d.label)
    .join((enter) => {
      const li = enter.append("li");
      li.append("span").attr("class", (d) => `swatch ${d.swatch}`);
      li.append("span").text((d) => d.label);
      return li;
    });
  d3.select("#chart-e-subtitle").text(VIEWS_E[view].subtitle);

  if (growOnly) {
    growSeasonBars(inner.select("g.view--average"));
    return;
  }
  const group = inner.append("g").attr("class", `view view--${view}`).attr("opacity", 0);
  if (view === "average") {
    drawSeasonAverage(group, atBaseline);
  } else {
    drawSeasonByYear(group);
  }
  group
    .transition()
    .delay(fade)
    .duration(instant ? 0 : duration(400))
    .attr("opacity", 1);
};

// ---------- "Average" view: grouped bars of the seasonal index ----------
const drawSeasonAverage = (group, atBaseline) => {
  const { size } = chartScales.e;
  const rows = SEASON_ORDER.map((season) => chartData.seasonAverage.find((d) => d.season === season)).filter(Boolean);
  const series = [
    { key: "ped_index", label: "Pedestrians", color: COLORS.admissions },
    { key: "all_index", label: "All road injuries", color: COLORS.comparison },
  ];

  const x0 = d3.scaleBand().domain(rows.map((d) => d.season)).range([0, size.innerWidth]).paddingInner(0.3).paddingOuter(0.1);
  const x1 = d3.scaleBand().domain(series.map((s) => s.key)).range([0, x0.bandwidth()]).paddingInner(0.08);
  const yMax = Math.max(125, Math.ceil(d3.max(rows, (d) => Math.max(d.ped_index, d.all_index)) / 25) * 25);
  const y = d3.scaleLinear().domain([0, yMax]).range([size.innerHeight, 0]);
  chartScales.e.average = { x0, x1, y };

  drawYAxisWithGrid(group, y, size.innerWidth, 5, d3.format("d"));
  group
    .append("g")
    .attr("class", "axis x-axis axis--no-ticks")
    .attr("transform", `translate(0, ${size.innerHeight})`)
    .call(d3.axisBottom(x0).tickPadding(10));

  // Reference line: an average season (named in the HTML legend)
  group.append("line").attr("class", "ref-line").attr("x1", 0).attr("x2", size.innerWidth).attr("y1", y(100)).attr("y2", y(100));

  const cells = rows.flatMap((row) => series.map((s) => ({ row, s, value: row[s.key] })));
  group
    .append("g")
    .attr("class", "bars")
    .selectAll("path")
    .data(cells)
    .join("path")
    .attr("fill", (d) => d.s.color)
    .attr("d", (d) => seasonBarPath(d, atBaseline));

  // Annotation: the winter rise, computed from the data
  const winter = rows.find((d) => d.season === "Winter");
  if (winter) {
    const change = winter.ped_index - 100;
    group
      .append("text")
      .attr("class", "chart-annotation season-note")
      .attr("x", x0("Winter") + x1("ped_index") + x1.bandwidth() / 2)
      .attr("y", y(winter.ped_index) - 8)
      .attr("text-anchor", "middle")
      .attr("opacity", atBaseline ? 0 : 1)
      .text(`${change >= 0 ? "+" : ""}${formatters.pct0(change)}`);
  }

  // Focusable hit area per season with every value in the tooltip
  const hits = group
    .append("g")
    .selectAll("rect")
    .data(rows)
    .join("rect")
    .attr("class", "hit")
    .attr("x", (d) => x0(d.season) - (x0.step() - x0.bandwidth()) / 2)
    .attr("width", x0.step())
    .attr("y", 0)
    .attr("height", size.innerHeight);
  const lines = (d) => [
    { text: `Pedestrian admissions index ${formatters.dec1(d.ped_index)}`, color: COLORS.admissions },
    { text: `All road injuries index ${formatters.dec1(d.all_index)}`, color: COLORS.comparison },
    { text: `${formatters.count(d.ped_admissions)} pedestrian admissions, 2011–2019` },
    { text: `Pedestrians ${formatters.pct1(d.ped_share_pct)} of road-injury admissions` },
  ];
  makeInteractive(hits, {
    htmlFor: (d) => tooltipHtml(SEASON_LABELS[d.season], lines(d)),
    labelFor: (d) => `${SEASON_LABELS[d.season]}: ${lines(d).map((l) => l.text).join(", ")}`,
  });
};

const seasonBarPath = (d, atBaseline) => {
  const { x0, x1, y } = chartScales.e.average;
  const { size } = chartScales.e;
  const top = atBaseline ? size.innerHeight : y(d.value);
  return barPathVertical(x0(d.row.season) + x1(d.s.key), top, Math.max(MIN_BAR_WIDTH, x1.bandwidth()), size.innerHeight - top);
};

// First reveal: bars grow from the baseline, then the annotation appears
const growSeasonBars = (group) => {
  group
    .selectAll(".bars path")
    .transition()
    .duration(duration())
    .ease(d3.easeCubicInOut)
    .attr("d", (d) => seasonBarPath(d, false));
  group.select(".season-note").transition().delay(duration()).duration(duration(200)).attr("opacity", 1);
};

// ---------- "Year by year" view: dumbbell of summer and winter share ----------
const drawSeasonByYear = (group) => {
  const { size } = chartScales.e;
  const byYear = d3.group(chartData.seasonByYear, (d) => d["Calendar year"]);
  const rows = [...byYear.keys()]
    .sort(d3.ascending)
    .map((year) => {
      const get = (season) => (byYear.get(year).find((d) => d.season === season) || {}).ped_share_pct ?? null;
      return { year, summer: get("Summer"), winter: get("Winter") };
    })
    .filter((d) => d.summer !== null && d.winter !== null);

  const values = rows.flatMap((d) => [d.summer, d.winter]);
  const x = d3
    .scaleLinear()
    .domain([Math.floor(d3.min(values)) - 1, Math.ceil(d3.max(values)) + 1])
    .range([0, size.innerWidth]);
  const y = d3.scaleBand().domain(rows.map((d) => d.year)).range([0, size.innerHeight - 22]).padding(0.3);

  group
    .append("g")
    .attr("class", "axis x-axis axis--no-domain")
    .attr("transform", `translate(0, ${size.innerHeight - 22})`)
    .call(d3.axisBottom(x).ticks(isMobile() ? 4 : 6).tickSize(-(size.innerHeight - 22)).tickPadding(8).tickFormat((d) => `${d}%`));
  group
    .append("g")
    .attr("class", "axis y-axis axis--no-domain axis--no-ticks")
    .call(d3.axisLeft(y).tickFormat(formatters.year).tickPadding(8));

  const rowGroups = group
    .append("g")
    .attr("class", "dumbbells")
    .selectAll("g")
    .data(rows)
    .join("g")
    .attr("transform", (d) => `translate(0, ${y(d.year) + y.bandwidth() / 2})`);
  rowGroups
    .append("line")
    .attr("class", "connector")
    .attr("x1", (d) => x(Math.min(d.summer, d.winter)))
    .attr("x2", (d) => x(Math.max(d.summer, d.winter)));
  rowGroups.append("circle").attr("class", "point").attr("r", POINT_RADIUS + 1).attr("cx", (d) => x(d.summer)).attr("fill", COLORS.comparison);
  rowGroups.append("circle").attr("class", "point").attr("r", POINT_RADIUS + 1).attr("cx", (d) => x(d.winter)).attr("fill", COLORS.admissions);

  // Note computed from the data: in how many years winter is above summer
  const higher = rows.filter((d) => d.winter > d.summer).length;
  group
    .append("text")
    .attr("class", "chart-annotation")
    .attr("x", 0)
    .attr("y", size.innerHeight + 14)
    .text(higher === rows.length ? `Winter above summer in all ${rows.length} years` : `Winter above summer in ${higher} of ${rows.length} years`);

  const hits = group
    .append("g")
    .selectAll("rect")
    .data(rows)
    .join("rect")
    .attr("class", "hit")
    .attr("x", -size.margin.left + 4)
    .attr("width", size.innerWidth + size.margin.left - 4)
    .attr("y", (d) => y(d.year) - (y.step() - y.bandwidth()) / 2)
    .attr("height", y.step());
  const lines = (d) => [
    { text: `Winter ${formatters.pct1(d.winter)} of road-injury admissions`, color: COLORS.admissions },
    { text: `Summer ${formatters.pct1(d.summer)}`, color: COLORS.comparison },
  ];
  makeInteractive(hits, {
    htmlFor: (d) => tooltipHtml(String(d.year), lines(d)),
    labelFor: (d) => `${d.year}: ${lines(d).map((l) => l.text).join(", ")}`,
  });
};

const buildTablesE = () => {
  const wrap = d3.select("#table-e");
  wrap.selectAll("*").remove();
  wrap.append("div").attr("id", "table-e-average");
  wrap.append("div").attr("id", "table-e-year");
  buildDataTable(
    "table-e-average",
    "Admissions by season, 2011–2019; index 100 = average season (KNIME part 6)",
    [
      { label: "Season", value: (d) => SEASON_LABELS[d.season] },
      { label: "Pedestrian admissions", value: (d) => formatters.count(d.ped_admissions), numeric: true },
      { label: "Pedestrian index", value: (d) => formatters.dec1(d.ped_index), numeric: true },
      { label: "All road injuries index", value: (d) => formatters.dec1(d.all_index), numeric: true },
      { label: "Pedestrian share", value: (d) => formatters.pct1(d.ped_share_pct), numeric: true },
    ],
    SEASON_ORDER.map((season) => chartData.seasonAverage.find((d) => d.season === season)).filter(Boolean),
  );
  const years = [...new Set(chartData.seasonByYear.map((d) => d["Calendar year"]))].sort(d3.ascending);
  const shareFor = (year, season) => {
    const row = chartData.seasonByYear.find((d) => d["Calendar year"] === year && d.season === season);
    return row && row.ped_share_pct !== null ? formatters.pct1(row.ped_share_pct) : "–";
  };
  buildDataTable(
    "table-e-year",
    "Pedestrian share of road-injury admissions by season and year, 2011–2021 (KNIME part 6)",
    [
      { label: "Year", value: (year) => formatters.year(year) },
      ...SEASON_ORDER.map((season) => ({ label: season, value: (year) => shareFor(year, season), numeric: true })),
    ],
    years,
  );
};
