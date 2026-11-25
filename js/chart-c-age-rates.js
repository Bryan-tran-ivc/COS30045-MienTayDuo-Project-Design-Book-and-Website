/* File: js/chart-c-age-rates.js
 * Purpose: Chart C (Story 1, older people, RQ4) – pedestrian bed days or admissions per 100,000 people by age group,
 *          2021, with a reference line at the all-ages rate. A toggle switches the measure; the reader's age group
 *          (SPEC §3.0.4) is marked.
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
  ref.append("text").attr("class", "ref-label").attr("x", 0).attr("dy", "-0.45em");
  inner.append("text").attr("class", "annotation annotation-75").attr("text-anchor", "end");
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
    .join("text")
    .attr("class", "value-label")
    .attr("text-anchor", "middle")
    .attr("x", (d) => x(d["Age group"]) + x.bandwidth() / 2)
    .transition(t)
    .attr("y", (d) => y(d[measure.column]) - 6)
    .text((d) => measure.format(d[measure.column]));

  inner.select(".ref-line").transition(t).attr("y1", y(allAges)).attr("y2", y(allAges));
  inner
    .select(".ref-label")
    .transition(t)
    .attr("y", y(allAges))
    .text(`All ages: ${measure.format(allAges)}`);

  // Annotation on the 75+ bar, computed from the data
  const oldest = rows.find((d) => d["Age group"] === "75+");
  inner
    .select(".annotation-75")
    .attr("x", x("75+") - 6)
    .text(atBaseline || !oldest ? "" : `${formatters.ratio1(oldest[measure.column] / allAges)}× the average`)
    .transition(t)
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
