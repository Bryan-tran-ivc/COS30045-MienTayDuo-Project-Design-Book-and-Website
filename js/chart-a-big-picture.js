/* File: js/chart-a-big-picture.js
 * Purpose: Chart A (the big picture, RQ1 and RQ3) – pedestrian share of road-injury bed days and admissions,
 *          2011–2021, with the three series breaks marked and an optional line without bed days of patients who died.
 *          Legend buttons highlight one series; one slider layer lets the reader scrub through the years.
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

const drawChartA = () => {
  const rows = chartData.shares;
  const size = getChartSize("chart-a", "a");
  const latest = rows[rows.length - 1];
  const mobile = isMobile();

  const { inner } = createChartSvg(
    "chart-a",
    size,
    "Line chart of the pedestrian share of road-injury bed days and admissions, 2011 to 2021",
    `In every year the pedestrian share of bed days is well above their share of admissions. In ${latest["Calendar year"]} it was ${formatters.pct1(latest.bed_day_share_pct)} of bed days and ${formatters.pct1(latest.admission_share_pct)} of admissions.`,
  );

  // Scales: both start at zero (graphical integrity); the y maximum is at least 16% and rounded up to a multiple of 4
  const yMax = Math.max(16, Math.ceil(d3.max(rows, (d) => d.bed_day_share_pct) / 4) * 4);
  const x = d3.scaleLinear().domain(d3.extent(rows, (d) => d["Calendar year"])).range([0, size.innerWidth]);
  const y = d3.scaleLinear().domain([0, yMax]).range([size.innerHeight, 0]);
  chartScales.a = { x, y, size };

  drawYAxisWithGrid(inner, y, size.innerWidth, yMax / 4, (d) => `${d}%`);

  const years = rows.map((d) => d["Calendar year"]);
  inner
    .append("g")
    .attr("class", "axis x-axis axis--no-ticks")
    .attr("transform", `translate(0, ${size.innerHeight})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues(mobile ? years.filter((year) => (year - years[0]) % 2 === 0) : years)
        .tickFormat(formatters.year)
        .tickPadding(10),
    );

  // Series breaks: dashed lines with short labels (desktop) – the full note is in a focusable tooltip
  const breaks = inner.append("g").attr("class", "breaks");
  breaks
    .selectAll("line")
    .data(SERIES_BREAKS)
    .join("line")
    .attr("class", "break-line")
    .attr("x1", (d) => x(d.year))
    .attr("x2", (d) => x(d.year))
    .attr("y1", 0)
    .attr("y2", size.innerHeight);
  if (!mobile) {
    breaks
      .selectAll("text")
      .data(SERIES_BREAKS)
      .join("text")
      .attr("class", "break-label")
      .attr("x", (d) => x(d.year) + 5)
      .attr("y", y(3.4))
      .selectAll("tspan")
      .data((d) => d.label.map((line) => ({ line, year: d.year })))
      .join("tspan")
      .attr("x", (d) => x(d.year) + 5)
      .attr("dy", (d, i) => (i === 0 ? 0 : "1.2em"))
      .text((d) => d.line);
  }

  // Lines and points
  const lineFor = (column) =>
    d3
      .line()
      .defined((d) => d[column] !== null)
      .x((d) => x(d["Calendar year"]))
      .y((d) => y(d[column]));

  const series = [
    { key: "bed", column: "bed_day_share_pct", color: COLORS.bedDays, label: "Bed days" },
    { key: "adm", column: "admission_share_pct", color: COLORS.admissions, label: "Admissions" },
  ];

  inner.append("g").attr("class", "without-deaths series--bed"); // filled by updateChartA(); a bed-day measure

  const lines = inner
    .append("g")
    .attr("class", "series")
    .selectAll("path")
    .data(series)
    .join("path")
    .attr("class", (d) => `line line--${d.key} series--${d.key}`)
    .attr("stroke", (d) => d.color)
    .attr("d", (d) => lineFor(d.column)(rows));

  const points = inner
    .append("g")
    .attr("class", "points")
    .selectAll("g")
    .data(series)
    .join("g")
    .attr("class", (d) => `series-points series--${d.key}`)
    .selectAll("circle")
    .data((s) => rows.map((row) => ({ row, s })))
    .join("circle")
    .attr("class", (d) => `point point-${d.row["Calendar year"]}`)
    .attr("cx", (d) => x(d.row["Calendar year"]))
    .attr("cy", (d) => y(d.row[d.s.column]))
    .attr("r", POINT_RADIUS)
    .attr("fill", (d) => d.s.color);

  // Direct labels at the latest year (desktop: right of the line; mobile: above the last point)
  inner
    .append("g")
    .attr("class", "end-labels")
    .selectAll("text")
    .data(series)
    .join("text")
    .attr("class", (d) => `chart-label series--${d.key}`)
    .attr("x", mobile ? x(latest["Calendar year"]) : x(latest["Calendar year"]) + 10)
    // Phones: below the last point (both lines fall towards 2021, so the space under each end point is empty)
    .attr("y", (d) => (mobile ? y(latest[d.column]) + 22 : y(latest[d.column])))
    .attr("dy", mobile ? 0 : "0.35em")
    .attr("text-anchor", mobile ? "end" : "start")
    .text((d) => `${d.label} ${formatters.pct1(latest[d.column])}`);

  // Year scrubbing (SPEC §4.A, task 2.2): one layer over the plot. The pointer picks the nearest year; for the
  // keyboard the layer is a single slider (← / → one year, Home / End first / last year), not eleven tab stops.
  // Either way the year gets a guide line, larger points and a tooltip with every value.
  const guide = inner
    .append("line")
    .attr("class", "guide-line")
    .attr("y1", 0)
    .attr("y2", size.innerHeight)
    .attr("opacity", 0);

  const yearTooltip = (row) => {
    const lines = [
      { text: `Share of bed days ${formatters.pct1(row.bed_day_share_pct)}`, color: COLORS.bedDays },
      { text: `Share of admissions ${formatters.pct1(row.admission_share_pct)}`, color: COLORS.admissions },
    ];
    if (chartState.a.showWithoutDeaths) {
      lines.push({
        text:
          row.bed_day_share_excl_died_pct === null
            ? "Without patients who died: not available (blank)"
            : `Without patients who died ${formatters.pct1(row.bed_day_share_excl_died_pct)}`,
      });
    }
    lines.push({ text: `${formatters.dec1(row.bed_days_per_case)} bed days per pedestrian admission` });
    lines.push({ text: `${formatters.count(row.Hospitalisations)} pedestrian admissions` });
    return lines;
  };

  const yearText = (row) =>
    `${row["Calendar year"]}: ${yearTooltip(row)
      .map((line) => line.text)
      .join(", ")}`;
  const rowForYear = (year) => rows.find((row) => row["Calendar year"] === year);
  // The year whose x position is closest to a pointer position
  const nearestYear = (px) => years[d3.minIndex(years, (year) => Math.abs(x(year) - px))];

  // A11Y: role="slider" with the year as its value; aria-valuetext reads like the tooltip
  const scrub = inner
    .append("rect")
    .attr("class", "hit scrub")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", size.innerWidth)
    .attr("height", size.innerHeight)
    .attr("tabindex", 0)
    .attr("role", "slider")
    .attr("aria-label", "Year")
    .attr("aria-valuemin", years[0])
    .attr("aria-valuemax", years[years.length - 1]);

  // event: the pointer event, or null for the keyboard (then the tooltip sits by that year's bed-day point)
  const showYear = (year, event) => {
    const row = rowForYear(year);
    chartState.a.year = year;
    guide.attr("x1", x(year)).attr("x2", x(year)).attr("opacity", 1);
    points.attr("r", (d) => (d.row === row ? POINT_RADIUS + 2 : POINT_RADIUS));
    scrub.attr("aria-valuenow", year).attr("aria-valuetext", yearText(row));
    const anchor = points.filter((d) => d.row === row && d.s.key === "bed").node();
    showTooltip(event, anchor, tooltipHtml(String(year), yearTooltip(row)));
  };
  const hideYear = () => {
    guide.attr("opacity", 0);
    points.attr("r", POINT_RADIUS);
    hideTooltip();
  };
  const startYear = () => (years.includes(chartState.a.year) ? chartState.a.year : years[years.length - 1]);
  scrub.attr("aria-valuenow", startYear()).attr("aria-valuetext", yearText(rowForYear(startYear())));

  scrub
    .on("mousemove", (event) => showYear(nearestYear(d3.pointer(event, inner.node())[0]), event))
    // A tap on a touch screen arrives as a click: the tooltip then sits by the point, not under the finger
    .on("click", (event) =>
      showYear(nearestYear(d3.pointer(event, inner.node())[0]), event.pointerType === "touch" ? null : event),
    )
    .on("mouseleave", hideYear)
    .on("focus", () => showYear(startYear(), null))
    .on("blur", hideYear)
    .on("keydown", (event) => {
      const index = years.indexOf(startYear());
      const moves = { ArrowLeft: index - 1, ArrowDown: index - 1, ArrowRight: index + 1, ArrowUp: index + 1, Home: 0, End: years.length - 1 };
      if (event.key === "Escape") {
        hideYear();
        return;
      }
      if (!(event.key in moves)) return;
      event.preventDefault(); // the arrow keys move the year, not the page
      showYear(years[Math.max(0, Math.min(years.length - 1, moves[event.key]))], null);
    });

  // Break hit areas sit above the year bands, so hovering exactly on a dashed line explains it
  const breakHits = breaks
    .selectAll("rect")
    .data(SERIES_BREAKS)
    .join("rect")
    .attr("class", "hit")
    .attr("x", (d) => x(d.year) - 6)
    .attr("width", 12)
    .attr("y", 0)
    .attr("height", size.innerHeight);
  breaks.raise();
  makeInteractive(breakHits, {
    htmlFor: (d) => tooltipHtml("Counting change", [{ text: d.note }]),
    labelFor: (d) => `Counting change: ${d.note}`,
  });

  // Reveal: draw the lines in from left to right the first time the chart is seen
  const drawIn = (instant) => {
    lines.each(function () {
      const length = this.getTotalLength();
      d3.select(this)
        .attr("stroke-dasharray", `${length} ${length}`)
        .attr("stroke-dashoffset", instant ? 0 : length)
        .transition()
        .duration(instant ? 0 : duration(1200))
        .ease(d3.easeCubicInOut)
        .attr("stroke-dashoffset", 0)
        .on("end", function () {
          d3.select(this).attr("stroke-dasharray", null);
        });
    });
    points
      .attr("opacity", instant ? 1 : 0)
      .transition()
      .delay(instant ? 0 : duration(900))
      .duration(instant ? 0 : duration(300))
      .attr("opacity", 1);
  };

  if (revealed.a) {
    drawIn(true);
  } else {
    lines.attr("stroke-dasharray", "0 1"); // hidden until revealed
    points.attr("opacity", 0);
    revealOnce("chart-a", () => {
      revealed.a = true;
      drawIn(prefersReducedMotion());
    });
  }

  updateChartA(true);
  buildTableA();
};

// Adds or removes the dashed line without bed days of patients who died (checkbox in the figure)
const updateChartA = (instant = false) => {
  const { x, y } = chartScales.a;
  const rows = chartData.shares;
  const show = chartState.a.showWithoutDeaths;

  // Only years with a value: 2021 is blank and must not be drawn as zero
  const withValues = rows.filter((d) => d.bed_day_share_excl_died_pct !== null);
  const line = d3
    .line()
    .x((d) => x(d["Calendar year"]))
    .y((d) => y(d.bed_day_share_excl_died_pct));

  d3.select("#chart-a .without-deaths")
    .selectAll("path")
    .data(show ? [withValues] : [])
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "line line--dashed")
          .attr("stroke", COLORS.bedDays)
          .attr("d", line)
          .attr("opacity", 0)
          .call((path) =>
            path
              .transition()
              .duration(instant ? 0 : duration())
              .attr("opacity", 1),
          ),
      (update) => update.attr("d", line),
      (exit) =>
        exit.call((path) =>
          path
            .transition()
            .duration(instant ? 0 : duration(300))
            .attr("opacity", 0)
            .remove(),
        ),
    );

  d3.select(".legend-deaths").attr("hidden", show ? null : true);
  d3.select("#note-a-deaths").attr("hidden", show ? null : true);
  highlightSeriesA(instant);
};

// Legend highlight (SPEC §4.A, task 2.2): the series that is not chosen (line, points, end label) fades.
// The legend buttons' aria-pressed always matches chartState.a.highlight.
const highlightSeriesA = (instant = false) => {
  const chosen = chartState.a.highlight;
  ["bed", "adm"].forEach((key) => {
    d3.selectAll(`#chart-a .series--${key}`)
      .transition("highlight") // named, so it never cuts short the draw-in or fade transitions
      .duration(instant ? 0 : duration())
      .ease(d3.easeCubicInOut)
      .attr("opacity", chosen && chosen !== key ? DIMMED_OPACITY : 1);
  });
  d3.selectAll("#legend-a .legend-button").attr("aria-pressed", function () {
    return String(this.dataset.series === chosen);
  });
};

const buildTableA = () => {
  buildDataTable(
    "table-a",
    "Pedestrian share of road-injury admissions and bed days, Australia, 2011–2021 (KNIME part 1)",
    [
      { label: "Year", value: (d) => formatters.year(d["Calendar year"]) },
      { label: "Share of admissions", value: (d) => formatters.pct1(d.admission_share_pct), numeric: true },
      { label: "Share of bed days", value: (d) => formatters.pct1(d.bed_day_share_pct), numeric: true },
      {
        label: "Share of bed days without patients who died",
        value: (d) =>
          d.bed_day_share_excl_died_pct === null ? "Not available" : formatters.pct1(d.bed_day_share_excl_died_pct),
        numeric: true,
      },
      { label: "Bed days per admission", value: (d) => formatters.dec1(d.bed_days_per_case), numeric: true },
      { label: "Pedestrian admissions", value: (d) => formatters.count(d.Hospitalisations), numeric: true },
      { label: "Pedestrian bed days", value: (d) => formatters.count(d["Bed days"]), numeric: true },
    ],
    chartData.shares,
  );
};
