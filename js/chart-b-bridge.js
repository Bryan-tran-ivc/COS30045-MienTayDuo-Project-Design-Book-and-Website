/* File: js/chart-b-bridge.js
 * Purpose: Chart B (the bridge between Part A and Part B, RQ4 and RQ7) – each age group's share of pedestrian
 *          admissions next to its share of pedestrian bed days, 2021. Marks the reader's age group (SPEC §3.0.4);
 *          selecting a group opens the story about it.
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

// Tooltip lines and the matching aria-label for one age group
const tooltipLinesB = (d) => [
  { text: `${formatters.pct1(d.caseShare)} of pedestrian admissions (${formatters.count(d.cases)})`, color: COLORS.admissions },
  { text: `${formatters.pct1(d.bedShare)} of pedestrian bed days (${formatters.count(d.bedDays)})`, color: COLORS.bedDays },
];
// The story page about an age group, with the group in the URL so it is marked there (SPEC §4.B, task 2.3)
const storyForAgeB = (age) => STORIES[STORY_FOR_AGE[age]];
const storyUrlB = (age) => `${storyForAgeB(age).page}?${AGE_PARAM}=${encodeURIComponent(age)}`;

// A11Y: the label says when this is the reader's own age group (the band alone is only visual) and where it leads
const labelB = (d) =>
  `${AGE_LABELS[d.age]}${d.age === siteState.ageGroup ? " (your age group)" : ""}: ${tooltipLinesB(d)
    .map((l) => l.text)
    .join(", ")}. Opens ${storyForAgeB(d.age).label}.`;

// Marks the reader's age group (SPEC §4.B, task 2.1): a light band behind its two bars and a bold axis label.
// Called after drawing and on every "agechange" event (interactions.js).
const highlightAgeB = () => {
  const { x0, size } = chartScales.b;
  const inner = d3.select("#chart-b .inner-chart");
  const ageGroup = siteState.ageGroup;
  inner
    .select(".age-band")
    .selectAll("rect")
    .data(ageGroup ? [ageGroup] : [])
    .join("rect")
    .attr("x", (age) => x0(age) - (x0.step() - x0.bandwidth()) / 2)
    .attr("width", x0.step())
    .attr("y", 0)
    .attr("height", size.innerHeight)
    .attr("fill", COLORS.highlight);
  inner
    .selectAll(".x-axis .tick text")
    .attr("font-weight", (age) => (age === ageGroup ? 700 : null))
    .style("fill", (age) => (age === ageGroup ? COLORS.ink : null));
  inner.selectAll(".group-hits rect").attr("aria-label", labelB);
};

const drawChartB = () => {
  const size = getChartSize("chart-b", "b");
  const mobile = isMobile();
  const derived = chartData.derived;

  // Each age group's share of all pedestrian admissions and bed days in 2021
  const rows = chartData.age.map((row) => ({
    age: row["Age group"],
    caseShare: (row.ped_admissions / derived.pedCasesTotal) * 100,
    bedShare: (row.ped_bed_days / derived.pedBedDaysTotal) * 100,
    cases: row.ped_admissions,
    bedDays: row.ped_bed_days,
  }));
  chartData.bridge = rows;

  const { inner } = createChartSvg(
    "chart-b",
    size,
    "Grouped bar chart of each age group's share of pedestrian admissions and bed days, 2021",
    `People under 40 make most pedestrian admissions, while people aged 65 and over have a larger share of bed days (${stats.over65_bed_share}) than of admissions (${stats.over65_case_share}).`,
  );

  const x0 = d3.scaleBand().domain(AGE_ORDER).range([0, size.innerWidth]).paddingInner(0.22).paddingOuter(0.08);
  const measures = ["caseShare", "bedShare"];
  const x1 = d3.scaleBand().domain(measures).range([0, x0.bandwidth()]).paddingInner(0.08);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => Math.max(d.caseShare, d.bedShare)) * 1.12])
    .nice()
    .range([size.innerHeight, 0]);
  chartScales.b = { x0, x1, y, size };

  // The reader's age-group band sits under the gridlines and bars (filled by highlightAgeB)
  inner.append("g").attr("class", "age-band");
  drawYAxisWithGrid(inner, y, size.innerWidth, 5, (d) => `${d}%`);
  const xAxis = inner
    .append("g")
    .attr("class", "axis x-axis axis--no-ticks")
    .attr("transform", `translate(0, ${size.innerHeight})`)
    .call(d3.axisBottom(x0).tickFormat((age) => (mobile ? age : AGE_LABELS[age])).tickPadding(10));
  if (mobile) xAxis.append("text").attr("class", "axis-title").attr("x", size.innerWidth / 2).attr("y", 40).attr("text-anchor", "middle").text("Age group (years)");

  const colorFor = { caseShare: COLORS.admissions, bedShare: COLORS.bedDays };
  const groups = inner
    .append("g")
    .attr("class", "bar-groups")
    .selectAll("g")
    .data(rows)
    .join("g")
    .attr("class", "bar-group")
    .attr("transform", (d) => `translate(${x0(d.age)}, 0)`);

  const bars = groups
    .selectAll("path")
    .data((d) => measures.map((measure) => ({ measure, value: d[measure] })))
    .join("path")
    .attr("fill", (d) => colorFor[d.measure]);

  const barAt = (d, atBaseline) => {
    const width = Math.max(MIN_BAR_WIDTH / 2, x1.bandwidth());
    const top = atBaseline ? size.innerHeight : y(d.value);
    return barPathVertical(x1(d.measure), top, width, size.innerHeight - top);
  };

  // Annotations (desktop only): brackets over the under-40 and 65+ groups with both shares
  if (!mobile) {
    const annotate = (groupsInSpan, lines) => {
      const left = x0(groupsInSpan[0]);
      const right = x0(groupsInSpan[groupsInSpan.length - 1]) + x0.bandwidth();
      const top = d3.min(
        rows.filter((d) => groupsInSpan.includes(d.age)),
        (d) => y(Math.max(d.caseShare, d.bedShare)),
      );
      const bracketY = top - 12;
      const g = inner.append("g").attr("class", "annotation-group").attr("aria-hidden", "true");
      g.append("path").attr("class", "bracket").attr("d", `M${left},${bracketY + 5}V${bracketY}H${right}V${bracketY + 5}`);
      const text = g
        .append("text")
        .attr("class", "annotation")
        .attr("y", bracketY - 22)
        .attr("text-anchor", "middle");
      text
        .selectAll("tspan")
        .data(lines)
        .join("tspan")
        .attr("dy", (d, i) => (i === 0 ? 0 : "1.25em"))
        .text((d) => d);
      // Centre the text over the bracket, but move it inwards if it would be cut off at the SVG edge
      const half = text.node().getBBox().width / 2;
      const centre = Math.max(-size.margin.left + half + 2, Math.min((left + right) / 2, size.innerWidth + size.margin.right - half - 2));
      text.attr("x", centre).selectAll("tspan").attr("x", centre);
    };
    annotate(UNDER_40, ["Under 40", `${stats.under40_case_share} of cases · ${stats.under40_bed_share} of bed days`]);
    annotate(OVER_65, ["65 and over", `${stats.over65_case_share} of cases · ${stats.over65_bed_share} of bed days`]);
  }

  // Hover/focus a whole age group: the other groups fade so the two bars can be compared
  const hits = inner
    .append("g")
    .attr("class", "group-hits")
    .selectAll("rect")
    .data(rows)
    .join("rect")
    .attr("class", "hit")
    .attr("x", (d) => x0(d.age) - (x0.step() - x0.bandwidth()) / 2)
    .attr("width", x0.step())
    .attr("y", 0)
    .attr("height", size.innerHeight);

  makeInteractive(hits, {
    htmlFor: (d) => tooltipHtml(AGE_LABELS[d.age], tooltipLinesB(d)),
    labelFor: labelB,
    onEnter: (event, d) => groups.classed("is-dimmed", (g) => g.age !== d.age),
    onLeave: () => groups.classed("is-dimmed", false),
  });

  // Open the age group's story: click, or Enter on the focused group. On a touch screen the first tap shows the
  // tooltip (so the numbers can be read) and a second tap on the same group opens the story.
  // A11Y: each group is a link for screen readers; its label ends with the story it opens
  let tappedAge = null;
  hits
    .attr("role", "link")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      if (event.pointerType === "touch" && tappedAge !== d.age) {
        tappedAge = d.age;
        return;
      }
      window.location.href = storyUrlB(d.age);
    })
    .on("keydown", (event, d) => {
      if (event.key === "Enter") window.location.href = storyUrlB(d.age);
    });
  highlightAgeB();

  // Reveal: bars grow from the baseline
  const grow = (instant) =>
    bars
      .transition()
      .duration(instant ? 0 : duration())
      .ease(d3.easeCubicInOut)
      .attr("d", (d) => barAt(d, false));

  if (revealed.b) {
    bars.attr("d", (d) => barAt(d, false));
  } else {
    bars.attr("d", (d) => barAt(d, true));
    revealOnce("chart-b", () => {
      revealed.b = true;
      grow(prefersReducedMotion());
    });
  }

  buildDataTable(
    "table-b",
    "Share of pedestrian admissions and bed days by age group, 2021 (KNIME part 8)",
    [
      { label: "Age group", value: (d) => AGE_LABELS[d.age] },
      { label: "Pedestrian admissions", value: (d) => formatters.count(d.cases), numeric: true },
      { label: "Share of admissions", value: (d) => formatters.pct1(d.caseShare), numeric: true },
      { label: "Pedestrian bed days", value: (d) => formatters.count(d.bedDays), numeric: true },
      { label: "Share of bed days", value: (d) => formatters.pct1(d.bedShare), numeric: true },
    ],
    rows,
  );
};
