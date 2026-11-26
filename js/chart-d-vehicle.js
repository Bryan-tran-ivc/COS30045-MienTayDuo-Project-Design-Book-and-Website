/* File: js/chart-d-vehicle.js
 * Purpose: Chart D (Story 2, heavier vehicles, RQ5) – average bed days per pedestrian admission by the vehicle that
 *          hit them, 2016–2021, for all ages or one age group chosen in a select menu. A toggle switches to the
 *          share of pedestrian admissions and of bed days caused by each vehicle (SPEC.md §4.D).
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

// The two measures (SPEC §4.D): days per case (one orange bar per vehicle) or shares (a blue and an orange bar)
const MEASURES_D = {
  perCase: {
    subtitle: "Average bed days per pedestrian admission by the vehicle that hit them, 2016–2021",
    axisTitle: "Average bed days per admission",
    tableCaption:
      "Average bed days per pedestrian admission (number of admissions) by vehicle and age group, 2016–2021 (KNIME part 7)",
  },
  share: {
    subtitle: "Share of pedestrian admissions and bed days by the vehicle that hit them, 2016–2021",
    axisTitle: "Share of pedestrian admissions or bed days (%)",
    tableCaption:
      "Share of pedestrian admissions / share of bed days by vehicle and age group, 2016–2021 (KNIME part 7; shares within each age group computed in the browser)",
  },
};
const BAR_GAP_D = 2; // px between the two bars of one vehicle in the share view (SPEC §4.0)

// Totals over every counterparty of one age group: the denominators of the within-group shares (SPEC §2.2)
const ageTotalsD = (ageGroup) => {
  const rows = chartData.vehicleByAge.filter((row) => row["Age group"] === ageGroup);
  return { cases: sumOf(rows, "Hospitalisations"), bedDays: sumOf(rows, "Bed days") };
};

// Rows for the chosen age group, in VEHICLES order; cells below MIN_CELL are marked as not shown.
// All ages uses KNIME's shares; one age group uses shares within that group.
const vehicleRowsFor = (ageGroup) => {
  const allAges = ageGroup === ALL_AGES;
  const totals = allAges ? null : ageTotalsD(ageGroup);
  return VEHICLES.map((vehicle) => {
    const source = allAges
      ? chartData.vehicle.find((row) => row.Counterparty === vehicle.key)
      : chartData.vehicleByAge.find((row) => row.Counterparty === vehicle.key && row["Age group"] === ageGroup);
    const cases = source ? source.Hospitalisations : null;
    const bedDays = source ? source["Bed days"] : null;
    const shareOf = (value, total) => (value !== null && total ? (value / total) * 100 : null);
    return {
      key: vehicle.key,
      label: vehicle.label,
      allAges,
      cases,
      bedDays,
      perCase: source ? source.bed_days_per_case : null,
      caseShare: allAges ? (source ? source.case_share_pct : null) : shareOf(cases, totals.cases),
      bedShare: allAges ? (source ? source.bed_day_share_pct : null) : shareOf(bedDays, totals.bedDays),
      shown: cases !== null && cases >= MIN_CELL,
    };
  });
};

// One sentence for the reading box above the chart: trucks and buses against cars for the chosen age group
const readingD = (share, ageText, truck, car) => {
  if (!truck || !truck.shown) return `${ageText}: fewer than 20 pedestrians hit by a truck or bus, so no comparison is shown.`;
  if (share) {
    return `${ageText}: trucks and buses caused ${formatters.pct1(truck.caseShare)} of pedestrian admissions but ${formatters.pct1(truck.bedShare)} of their bed days.`;
  }
  const days = `${ageText}: a pedestrian hit by a truck or bus stayed ${formatters.dec1(truck.perCase)} days per admission`;
  if (!car || !car.shown) return `${days}.`;
  return `${days}, ${formatters.ratio1(truck.perCase / car.perCase)} times as long as one hit by a car, ute or van (${formatters.dec1(car.perCase)}).`;
};

const drawChartD = () => {
  const size = getChartSize("chart-d", "d");
  const truck = vehicleRowsFor(ALL_AGES).find((d) => d.key === "Heavy transport vehicle or bus");
  const car = vehicleRowsFor(ALL_AGES).find((d) => d.key === "Car, pick-up truck or van");

  const { inner } = createChartSvg(
    "chart-d",
    size,
    "Horizontal bar chart of average bed days per pedestrian admission, or of shares of admissions and bed days, by the vehicle that hit them, 2016 to 2021",
    `Stays get longer as vehicles get heavier: ${car ? formatters.dec1(car.perCase) : "–"} days after being hit by a car, ute or van and ${truck ? formatters.dec1(truck.perCase) : "–"} days after a truck or bus.`,
  );

  // Fixed x domains, one per measure: the largest valid value over all ages and every age group, so bars can be
  // compared when the age group changes (a rescaling axis would make every age group look the same)
  const validRows = [ALL_AGES, ...AGE_ORDER].flatMap((age) => vehicleRowsFor(age).filter((d) => d.shown));
  const xPerCase = d3
    .scaleLinear()
    .domain([0, d3.max(validRows, (d) => d.perCase)])
    .nice()
    .range([0, size.innerWidth]);
  const xShare = d3
    .scaleLinear()
    .domain([0, d3.max(validRows, (d) => Math.max(d.caseShare, d.bedShare))])
    .nice()
    .range([0, size.innerWidth]);
  const y = d3
    .scaleBand()
    .domain(VEHICLES.map((v) => v.label))
    .range([0, size.innerHeight])
    .paddingInner(0.5)
    .paddingOuter(0.2);
  chartScales.d = { x: { perCase: xPerCase, share: xShare }, y, size };

  const xAxis = inner
    .append("g")
    .attr("class", "axis x-axis axis--no-domain")
    .attr("transform", `translate(0, ${size.innerHeight})`);
  xAxis
    .append("text")
    .attr("class", "axis-title")
    .attr("x", size.innerWidth / 2)
    .attr("y", 34)
    .attr("text-anchor", "middle");
  inner
    .append("g")
    .attr("class", "axis y-axis axis--no-ticks")
    .call(d3.axisLeft(y).tickPadding(10))
    .select(".domain")
    .attr("stroke", COLORS.ink2);

  inner.append("g").attr("class", "bars");
  inner.append("g").attr("class", "labels");
  inner.append("text").attr("class", "annotation annotation-truck");
  inner.append("g").attr("class", "hits");

  populateSelectD();

  if (revealed.d) {
    updateChartD(true);
  } else {
    updateChartD(true, true);
    revealOnce("chart-d", () => {
      revealed.d = true;
      updateChartD(prefersReducedMotion());
    });
  }
};

// Fills the age-group <select> once (All ages + seven age groups)
const populateSelectD = () => {
  const select = d3.select("#select-d");
  select
    .selectAll("option")
    .data([ALL_AGES, ...AGE_ORDER])
    .join("option")
    .attr("value", (d) => d)
    .property("selected", (d) => d === chartState.d.ageGroup)
    .text((d) => (d === ALL_AGES ? ALL_AGES : AGE_LABELS[d]));
};

// Redraws bars, axis, labels, annotation, tooltips and table for the age group and measure in chartState.d
const updateChartD = (instant = false, atBaseline = false) => {
  const { y, size } = chartScales.d;
  const measureKey = chartState.d.measure;
  const measure = MEASURES_D[measureKey];
  const x = chartScales.d.x[measureKey];
  const share = measureKey === "share";
  const ageGroup = chartState.d.ageGroup;
  const rows = vehicleRowsFor(ageGroup);
  const inner = d3.select("#chart-d .inner-chart");
  const t = d3.transition().duration(instant ? 0 : duration()).ease(d3.easeCubicInOut);
  const mobile = isMobile();
  const barHeight = y.bandwidth();
  const halfHeight = (barHeight - BAR_GAP_D) / 2;

  // Axis for the current measure (it changes only when the measure changes)
  const xAxis = inner.select(".x-axis");
  xAxis
    .transition(t)
    .call(
      d3
        .axisBottom(x)
        .ticks(mobile ? (share ? 2 : 4) : 7) // phones: 0%, 50%, 100% so the "%" labels do not touch
        .tickSize(-size.innerHeight)
        .tickPadding(8)
        .tickFormat(share ? (d) => `${d}%` : null),
    );
  xAxis.select(".axis-title").text(measure.axisTitle);

  // Two keyed bars per vehicle, so switching measure morphs one orange bar into a blue + orange pair.
  // Days per case: the orange bar is the whole row and the blue one is hidden. Shares: blue (admissions) on top,
  // orange (bed days) below. Cells under MIN_CELL get no bar.
  const barData = rows.flatMap((d) => [
    {
      id: `${d.key}|case`,
      color: COLORS.admissions,
      top: y(d.label),
      height: share ? halfHeight : barHeight,
      value: share && d.shown ? d.caseShare : 0,
    },
    {
      id: `${d.key}|bed`,
      color: COLORS.bedDays,
      top: share ? y(d.label) + halfHeight + BAR_GAP_D : y(d.label),
      height: share ? halfHeight : barHeight,
      value: d.shown ? (share ? d.bedShare : d.perCase) : 0,
    },
  ]);
  inner
    .select(".bars")
    .selectAll("path")
    .data(barData, (b) => b.id)
    .join("path")
    .attr("fill", (b) => b.color)
    .transition(t)
    .attr("d", (b) => barPathHorizontal(0, b.top, atBaseline ? 0 : x(b.value), b.height));

  // Value labels at the bar ends ("22.0 days (n = 594)" or "3.9%"), or the small-numbers note instead of a bar
  const labelData = atBaseline
    ? []
    : rows.flatMap((d) => {
        if (!d.shown) return [{ id: `${d.key}|main`, cls: "too-few", x: 4, y: y(d.label) + barHeight / 2, text: "Fewer than 20 cases" }];
        if (!share) {
          const text = mobile ? `${formatters.dec1(d.perCase)} days` : `${formatters.dec1(d.perCase)} days (n = ${formatters.count(d.cases)})`;
          return [{ id: `${d.key}|main`, cls: "value-label", x: x(d.perCase) + 6, y: y(d.label) + barHeight / 2, text }];
        }
        return [
          { id: `${d.key}|case`, cls: "value-label", x: x(d.caseShare) + 6, y: y(d.label) + halfHeight / 2, text: formatters.pct1(d.caseShare) },
          { id: `${d.key}|bed`, cls: "value-label", x: x(d.bedShare) + 6, y: y(d.label) + halfHeight + BAR_GAP_D + halfHeight / 2, text: formatters.pct1(d.bedShare) },
        ];
      });
  inner
    .select(".labels")
    .selectAll("text")
    .data(labelData, (l) => l.id)
    .join((enter) => enter.append("text").attr("x", (l) => l.x).attr("y", (l) => l.y))
    .attr("dy", "0.35em")
    .attr("class", (l) => l.cls)
    .text((l) => l.text)
    .transition(t)
    .attr("x", (l) => l.x)
    .attr("y", (l) => l.y);

  // Annotation under the truck bar, computed from the data. Days per case: how many times longer than a car (both
  // groups must be large enough). Shares: how many times its share of cases its share of bed days is.
  const truck = rows.find((d) => d.key === "Heavy transport vehicle or bus");
  const car = rows.find((d) => d.key === "Car, pick-up truck or van");
  let note = "";
  if (!atBaseline && truck && truck.shown) {
    if (!share && car && car.shown) note = `${formatters.ratio1(truck.perCase / car.perCase)}× as long as a car`;
    if (share && truck.caseShare) {
      const ratio = formatters.ratio1(truck.bedShare / truck.caseShare);
      note = mobile ? `${ratio}× its share of cases` : `Bed-day share ${ratio}× its share of cases`;
    }
  }
  inner
    .select(".annotation-truck")
    .attr("x", 0)
    .attr("y", y("Truck or bus") + barHeight + (y.step() - barHeight) / 2)
    .attr("dy", "0.35em")
    .text(note);

  const ageText = ageGroup === ALL_AGES ? ALL_AGES : AGE_LABELS[ageGroup];
  d3.select("#chart-d-subtitle").text(`${measure.subtitle} · ${ageText}`);
  d3.select("#legend-d").attr("hidden", share ? null : true); // the colours need a key only in the share view
  d3.select("#legend-d-days").attr("hidden", share ? true : null);
  d3.select("#reading-d").text(readingD(share, ageText, truck, car));

  // One focusable row per vehicle with a tooltip for the current measure
  const hits = inner
    .select(".hits")
    .selectAll("rect")
    .data(rows, (d) => d.key)
    .join("rect")
    .attr("class", "hit")
    .attr("x", -size.margin.left + 4)
    .attr("width", size.innerWidth + size.margin.left - 4)
    .attr("y", (d) => y(d.label) - (y.step() - barHeight) / 2)
    .attr("height", y.step());
  const lines = (d) => {
    if (!d.shown) return [{ text: "Fewer than 20 admissions: not shown" }];
    if (share) {
      return [
        { text: `${formatters.pct1(d.caseShare)} of pedestrian admissions (${formatters.count(d.cases)})`, color: COLORS.admissions },
        { text: `${formatters.pct1(d.bedShare)} of pedestrian bed days (${formatters.count(d.bedDays)})`, color: COLORS.bedDays },
      ];
    }
    const out = [
      { text: `${formatters.dec1(d.perCase)} bed days per admission`, color: COLORS.bedDays },
      { text: `${formatters.count(d.cases)} admissions · ${formatters.count(d.bedDays)} bed days` },
    ];
    if (d.allAges) {
      out.push({ text: `${formatters.pct1(d.caseShare)} of pedestrian admissions, ${formatters.pct1(d.bedShare)} of bed days` });
    }
    return out;
  };
  makeInteractive(hits, {
    htmlFor: (d) => tooltipHtml(d.label, lines(d)),
    labelFor: (d) => `${d.label}: ${lines(d).map((l) => l.text).join(", ")}`,
  });

  buildTableD();
};

// Data table: vehicles × age groups for the current measure, with small cells written as "Fewer than 20"
const buildTableD = () => {
  const share = chartState.d.measure === "share";
  const ages = [ALL_AGES, ...AGE_ORDER];
  const cells = Object.fromEntries(ages.map((age) => [age, vehicleRowsFor(age)]));
  buildDataTable(
    "table-d",
    MEASURES_D[chartState.d.measure].tableCaption,
    [
      { label: "Vehicle", value: (vehicle) => vehicle.label },
      ...ages.map((age) => ({
        label: age === ALL_AGES ? ALL_AGES : AGE_LABELS[age],
        numeric: true,
        value: (vehicle) => {
          const cell = cells[age].find((d) => d.key === vehicle.key);
          if (!cell || !cell.shown) return "Fewer than 20";
          return share
            ? `${formatters.pct1(cell.caseShare)} / ${formatters.pct1(cell.bedShare)}`
            : `${formatters.dec1(cell.perCase)} (${formatters.count(cell.cases)})`;
        },
      })),
    ],
    VEHICLES,
  );
};
