/* File: js/chart-f-young.js
 * Purpose: Chart F (Story 4, children and young people, RQ7) – pedestrians as a share of each age group's
 *          road-injury admissions, 2021, with a reference line at the all-ages share.
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

const drawChartF = () => {
  const size = getChartSize("chart-f", "f");
  const mobile = isMobile();
  const rows = chartData.age;
  const allAges = chartData.derived.allAgesPedShare;

  const { inner } = createChartSvg(
    "chart-f",
    size,
    "Bar chart of pedestrians as a share of each age group's road-injury admissions, 2021",
    `For children aged 0 to 7, ${stats.share_0_7} of road-injury admissions were pedestrians, against ${stats.share_all} for all ages.`,
  );

  const x = d3.scaleBand().domain(AGE_ORDER).range([0, size.innerWidth]).paddingInner(0.3).paddingOuter(0.15);
  const y = d3
    .scaleLinear()
    .domain([0, Math.max(20, d3.max(rows, (d) => d.ped_share_of_age_pct) * 1.1)])
    .nice()
    .range([size.innerHeight, 0]);
  chartScales.f = { x, y, size };

  drawYAxisWithGrid(inner, y, size.innerWidth, 4, (d) => `${d}%`);
  const xAxis = inner
    .append("g")
    .attr("class", "axis x-axis axis--no-ticks")
    .attr("transform", `translate(0, ${size.innerHeight})`)
    .call(d3.axisBottom(x).tickFormat((age) => (mobile ? age : AGE_LABELS[age])).tickPadding(10));
  if (mobile) xAxis.append("text").attr("class", "axis-title").attr("x", size.innerWidth / 2).attr("y", 40).attr("text-anchor", "middle").text("Age group (years)");

  const bars = inner
    .append("g")
    .attr("class", "bars")
    .selectAll("path")
    .data(rows)
    .join("path")
    .attr("fill", COLORS.admissions);
  const barAt = (d, atBaseline) => {
    const top = atBaseline ? size.innerHeight : y(d.ped_share_of_age_pct);
    return barPathVertical(x(d["Age group"]), top, Math.max(MIN_BAR_WIDTH, x.bandwidth()), size.innerHeight - top);
  };

  // Reference line at the all-ages share. Desktop: its label sits over the 26–39 group, whose bar is below the line.
  // Phones: the bars are too narrow for that, so the label goes in the empty top-right corner with a line sample.
  inner.append("line").attr("class", "ref-line").attr("x1", 0).attr("x2", size.innerWidth).attr("y1", y(allAges)).attr("y2", y(allAges));
  const refLabel = inner.append("text").attr("class", "ref-label").text(`All ages ${formatters.pct1(allAges)}`);
  if (mobile) {
    refLabel.attr("x", size.innerWidth).attr("y", 4).attr("dy", "0.35em").attr("text-anchor", "end");
    const labelStart = size.innerWidth - refLabel.node().getComputedTextLength();
    inner.append("line").attr("class", "ref-line").attr("x1", labelStart - 24).attr("x2", labelStart - 6).attr("y1", 4).attr("y2", 4);
  } else {
    refLabel.attr("x", x("26-39") + x.bandwidth() / 2).attr("y", y(allAges)).attr("dy", "-0.5em").attr("text-anchor", "middle");
  }

  const labels = inner
    .append("g")
    .attr("class", "value-labels")
    .selectAll("text")
    .data(rows)
    .join("text")
    .attr("class", "value-label")
    .attr("text-anchor", "middle")
    .attr("x", (d) => x(d["Age group"]) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.ped_share_of_age_pct) - 6)
    .text((d) => formatters.pct1(d.ped_share_of_age_pct));

  // Annotation on the 0–7 bar: ratio to the all-ages share, rounded to a whole number (SPEC §4.F)
  const youngest = rows.find((d) => d["Age group"] === "0-7");
  const note = inner
    .append("text")
    .attr("class", "annotation")
    .attr("x", x("0-7") + x.bandwidth() + 6)
    .attr("y", youngest ? y(youngest.ped_share_of_age_pct) + 14 : 0)
    .text(youngest ? `${formatters.dec0(youngest.ped_share_of_age_pct / allAges)}× the all-ages share` : "");

  const hits = inner
    .append("g")
    .selectAll("rect")
    .data(rows)
    .join("rect")
    .attr("class", "hit")
    .attr("x", (d) => x(d["Age group"]) - (x.step() - x.bandwidth()) / 2)
    .attr("width", x.step())
    .attr("y", 0)
    .attr("height", size.innerHeight);
  const lines = (d) => [
    { text: `${formatters.pct1(d.ped_share_of_age_pct)} of road-injury admissions were pedestrians`, color: COLORS.admissions },
    { text: `${formatters.count(d.ped_admissions)} pedestrian admissions of ${formatters.count(d.Hospitalisations)}` },
  ];
  makeInteractive(hits, {
    htmlFor: (d) => tooltipHtml(AGE_LABELS[d["Age group"]], lines(d)),
    labelFor: (d) => `${AGE_LABELS[d["Age group"]]}: ${lines(d).map((l) => l.text).join(", ")}`,
  });

  // Reveal: bars grow, then labels and the annotation fade in
  const grow = (instant) => {
    bars.transition().duration(instant ? 0 : duration()).ease(d3.easeCubicInOut).attr("d", (d) => barAt(d, false));
    labels.transition().delay(instant ? 0 : duration()).duration(instant ? 0 : duration(200)).attr("opacity", 1);
    note.transition().delay(instant ? 0 : duration()).duration(instant ? 0 : duration(200)).attr("opacity", 1);
  };
  if (revealed.f) {
    bars.attr("d", (d) => barAt(d, false));
  } else {
    bars.attr("d", (d) => barAt(d, true));
    labels.attr("opacity", 0);
    note.attr("opacity", 0);
    revealOnce("chart-f", () => {
      revealed.f = true;
      grow(prefersReducedMotion());
    });
  }

  buildDataTable(
    "table-f",
    "Pedestrians as a share of each age group's road-injury admissions, 2021 (KNIME part 8)",
    [
      { label: "Age group", value: (d) => AGE_LABELS[d["Age group"]] },
      { label: "All road-injury admissions", value: (d) => formatters.count(d.Hospitalisations), numeric: true },
      { label: "Pedestrian admissions", value: (d) => formatters.count(d.ped_admissions), numeric: true },
      { label: "Pedestrian share", value: (d) => formatters.pct1(d.ped_share_of_age_pct), numeric: true },
      { label: "Bed days per pedestrian admission", value: (d) => formatters.dec1(d.ped_bed_days_per_case), numeric: true },
    ],
    rows,
  );
};
