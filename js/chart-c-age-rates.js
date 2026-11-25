/* File: js/chart-c-age-rates.js
 * Purpose: Chart C (Story 1, older people, RQ4) – pedestrian bed days or admissions per 100,000 people by age group,
 *          2021, with a reference line at the all-ages rate. Toggles switch the measure and the order (age order or
 *          highest first); the reader's age group (SPEC §3.0.4) is marked.
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

// Which column and label each measure uses
const MEASURES_C = {
  bedDays: {
    column: "ped_bed_days_per_100k",
    color: COLORS.bedDays,
    format: formatters.dec0,
    allAges: () => chartData.derived.allAgesBedDayRate,
    unit: "bed days per 100,000 people",
    subtitle: "Pedestrian bed days per 100,000 people, 2021",
  },
  admissions: {
    column: "ped_admissions_per_100k",
    color: COLORS.admissions,
    format: formatters.dec1,
    allAges: () => chartData.derived.allAgesAdmissionRate,
    unit: "admissions per 100,000 people",
    subtitle: "Pedestrian admissions per 100,000 people, 2021",
  },
};

const drawChartC = () => {
  const size = getChartSize("chart-c", "c");
  const mobile = isMobile();

  const { inner } = createChartSvg(
    "chart-c",
    size,
    "Bar chart of pedestrian bed days and admissions per 100,000 people by age group, 2021",
    `People aged 75 and over have the highest pedestrian bed-day rate: ${stats.bd_rate_75} per 100,000 people, ${stats.bd_rate_ratio_75} times the all-ages rate of ${stats.bd_rate_all}.`,
  );

  const x = d3.scaleBand().domain(AGE_ORDER).range([0, size.innerWidth]).paddingInner(0.3).paddingOuter(0.15);
  const y = d3.scaleLinear().range([size.innerHeight, 0]);
  chartScales.c = { x, y, size };

  // The reader's age-group band sits under the gridlines and bars (filled by updateChartC)
  inner.append("g").attr("class", "age-band");
  inner.append("g").attr("class", "axis y-axis axis--no-domain");
  const xAxis = inner
    .append("g")
    .attr("class", "axis x-axis axis--no-ticks")
    .attr("transform", `translate(0, ${size.innerHeight})`)
    .call(d3.axisBottom(x).tickFormat((age) => (mobile ? age : AGE_LABELS[age])).tickPadding(10));
  if (mobile) xAxis.append("text").attr("class", "axis-title").attr("x", size.innerWidth / 2).attr("y", 40).attr("text-anchor", "middle").text("Age group (years)");

  inner.append("g").attr("class", "bars");
  inner.append("g").attr("class", "value-labels");
  const ref = inner.append("g").attr("class", "reference");
  ref.append("line").attr("class", "ref-line").attr("x1", 0).attr("x2", size.innerWidth);
  ref.append("line").attr("class", "ref-line ref-sample"); // short line sample next to the label on phones
  ref.append("text").attr("class", "ref-label");
  inner.append("text").attr("class", "annotation annotation-75");
  inner.append("g").attr("class", "hits");

  if (revealed.c) {
    updateChartC(true);
  } else {
    updateChartC(true, true); // bars at the baseline until the chart is seen
    revealOnce("chart-c", () => {
      revealed.c = true;
      updateChartC(prefersReducedMotion());
    });
  }

  buildDataTable(
    "table-c",
    "Pedestrian admissions and bed days per 100,000 people by age group, 2021 (KNIME part 8; ABS population June 2021)",
    [
      { label: "Age group", value: (d) => AGE_LABELS[d["Age group"]] },
      { label: "Population", value: (d) => formatters.count(d.population), numeric: true },
      { label: "Pedestrian admissions", value: (d) => formatters.count(d.ped_admissions), numeric: true },
      { label: "Admissions per 100,000", value: (d) => formatters.dec1(d.ped_admissions_per_100k), numeric: true },
      { label: "Pedestrian bed days", value: (d) => formatters.count(d.ped_bed_days), numeric: true },
      { label: "Bed days per 100,000", value: (d) => formatters.dec1(d.ped_bed_days_per_100k), numeric: true },
      { label: "Bed days per admission", value: (d) => formatters.dec1(d.ped_bed_days_per_case), numeric: true },
    ],
    chartData.age,
  );
};

// Redraws bars, axis, reference line, labels and annotation for the measure in chartState.c
const updateChartC = (instant = false, atBaseline = false) => {
  const { x, y, size } = chartScales.c;
  const measure = MEASURES_C[chartState.c.measure];
  const rows = chartData.age;
  const inner = d3.select("#chart-c .inner-chart");
  const t = d3.transition().duration(instant ? 0 : duration()).ease(d3.easeCubicInOut);
  const allAges = measure.allAges();

  y.domain([0, d3.max(rows, (d) => d[measure.column]) * 1.1]).nice();
  inner
    .select(".y-axis")
    .transition(t)
    .call(d3.axisLeft(y).ticks(5).tickSize(-size.innerWidth).tickPadding(8).tickFormat(d3.format(",")));

  // Sort (SPEC §4.C, task 2.4): age order, or highest value of the current measure first. Bars, labels, the
  // age band and the axis labels all move to their new places in one keyed transition.
  const order =
    chartState.c.order === "value"
      ? [...rows].sort((a, b) => b[measure.column] - a[measure.column]).map((d) => d["Age group"])
      : AGE_ORDER.filter((age) => rows.some((d) => d["Age group"] === age));
  x.domain(order);
  inner
    .select(".x-axis")
    .transition(t)
    .call(d3.axisBottom(x).tickFormat((age) => (isMobile() ? age : AGE_LABELS[age])).tickPadding(10));

  const barAt = (d) => {
    const top = atBaseline ? size.innerHeight : y(d[measure.column]);
    return barPathVertical(x(d["Age group"]), top, Math.max(MIN_BAR_WIDTH, x.bandwidth()), size.innerHeight - top);
  };
  inner
    .select(".bars")
    .selectAll("path")
    .data(rows, (d) => d["Age group"])
    .join("path")
    .transition(t)
    .attr("d", barAt)
    .attr("fill", measure.color);

  inner
    .select(".value-labels")
    .selectAll("text")
    .data(atBaseline ? [] : rows, (d) => d["Age group"])
    .join((enter) => enter.append("text").attr("x", (d) => x(d["Age group"]) + x.bandwidth() / 2))
    .attr("class", "value-label")
    .attr("text-anchor", "middle")
    .transition(t)
    .attr("x", (d) => x(d["Age group"]) + x.bandwidth() / 2)
    .attr("y", (d) => y(d[measure.column]) - 6)
    .text((d) => measure.format(d[measure.column]));

  // Reference line. Wider screens: label just above the line, at the end of the chart whose bar is lower (left in
  // age order, right when sorted highest first), so it never sits on a tall bar. Phones: the label moves to the empty
  // strip above the plot with a short line sample, because there it collided with the value labels of the low bars
  // (the same fix as chart F).
  const mobile = isMobile();
  const sampleY = -12;
  const valueAt = (age) => rows.find((d) => d["Age group"] === age)[measure.column];
  const labelOnRight = !mobile && valueAt(order[order.length - 1]) < valueAt(order[0]);
  inner.select(".ref-line:not(.ref-sample)").transition(t).attr("y1", y(allAges)).attr("y2", y(allAges));
  inner
    .select(".ref-sample")
    .attr("x1", 0)
    .attr("x2", 16)
    .attr("y1", sampleY)
    .attr("y2", sampleY)
    .attr("display", mobile ? null : "none");
  inner
    .select(".ref-label")
    .attr("dy", mobile ? "0.35em" : "-0.45em")
    .attr("text-anchor", labelOnRight ? "end" : "start")
    .text(`All ages: ${measure.format(allAges)}`)
    .transition(t)
    .attr("x", mobile ? 22 : labelOnRight ? size.innerWidth : 0)
    .attr("y", mobile ? sampleY : y(allAges));

  // Annotation on the 75+ bar, computed from the data. It sits left of the bar when the bar is in the right half of
  // the chart and right of it otherwise, so it is never cut off when the bars are sorted.
  const oldest = rows.find((d) => d["Age group"] === "75+");
  const oldestOnRight = x("75+") + x.bandwidth() / 2 > size.innerWidth / 2;
  inner
    .select(".annotation-75")
    .attr("text-anchor", oldestOnRight ? "end" : "start")
    .text(atBaseline || !oldest ? "" : `${formatters.ratio1(oldest[measure.column] / allAges)}× the average`)
    .transition(t)
    .attr("x", oldestOnRight ? x("75+") - 6 : x("75+") + x.bandwidth() + 6)
    .attr("y", oldest ? y(oldest[measure.column]) + 12 : 0);

  // Reader's age group (SPEC §4.C, task 2.1): a light band behind its bar and a bold axis label
  const ageGroup = siteState.ageGroup;
  inner
    .select(".age-band")
    .selectAll("rect")
    .data(ageGroup ? [ageGroup] : [], (age) => age)
    .join((enter) =>
      enter
        .append("rect")
        .attr("x", (age) => x(age) - (x.step() - x.bandwidth()) / 2)
        .attr("y", 0)
        .attr("height", size.innerHeight)
        .attr("fill", COLORS.highlight),
    )
    .attr("width", x.step())
    .transition(t)
    .attr("x", (age) => x(age) - (x.step() - x.bandwidth()) / 2);
  inner
    .selectAll(".x-axis .tick text")
    .attr("font-weight", (age) => (age === ageGroup ? 700 : null))
    .style("fill", (age) => (age === ageGroup ? COLORS.ink : null));

  d3.select("#chart-c-subtitle").text(measure.subtitle);

  // Focusable hit areas (one per bar column) with tooltips for the current measure
  const hits = inner
    .select(".hits")
    .selectAll("rect")
    .data(rows, (d) => d["Age group"])
    .join("rect")
    .attr("class", "hit")
    .attr("x", (d) => x(d["Age group"]) - (x.step() - x.bandwidth()) / 2)
    .attr("width", x.step())
    .attr("y", 0)
    .attr("height", size.innerHeight);
  const lines = (d) => [
    { text: `${measure.format(d[measure.column])} ${measure.unit}`, color: measure.color },
    { text: `${formatters.count(d.ped_bed_days)} bed days · ${formatters.count(d.ped_admissions)} admissions` },
    { text: `Population ${formatters.count(d.population)}` },
  ];
  makeInteractive(hits, {
    htmlFor: (d) => tooltipHtml(AGE_LABELS[d["Age group"]], lines(d)),
    // A11Y: the label names the reader's own age group, because the band alone is only visual
    labelFor: (d) =>
      `${AGE_LABELS[d["Age group"]]}${d["Age group"] === siteState.ageGroup ? " (your age group)" : ""}: ${lines(d)
        .map((l) => l.text)
        .join(", ")}`,
  });
};
