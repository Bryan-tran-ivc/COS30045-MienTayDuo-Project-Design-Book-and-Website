/* File: js/chart-d-vehicle.js
 * Purpose: Chart D (Story 2, heavier vehicles, RQ5) – average bed days per pedestrian admission by the vehicle that
 *          hit them, 2016–2021, for all ages or one age group chosen in a select menu.
 * Project: COS30045 · Team MienTayDuo · "Few cases, long stays"
 */

// Rows for the chosen age group, in VEHICLES order; cells below MIN_CELL are marked as not shown
const vehicleRowsFor = (ageGroup) =>
  VEHICLES.map((vehicle) => {
    const source =
      ageGroup === ALL_AGES
        ? chartData.vehicle.find((row) => row.Counterparty === vehicle.key)
        : chartData.vehicleByAge.find((row) => row.Counterparty === vehicle.key && row["Age group"] === ageGroup);
    const cases = source ? source.Hospitalisations : null;
    return {
      key: vehicle.key,
      label: vehicle.label,
      cases,
      bedDays: source ? source["Bed days"] : null,
      perCase: source ? source.bed_days_per_case : null,
      caseShare: ageGroup === ALL_AGES && source ? source.case_share_pct : null,
      bedShare: ageGroup === ALL_AGES && source ? source.bed_day_share_pct : null,
      shown: cases !== null && cases >= MIN_CELL,
    };
  });

const drawChartD = () => {
  const size = getChartSize("chart-d", "d");
  const truck = vehicleRowsFor(ALL_AGES).find((d) => d.key === "Heavy transport vehicle or bus");
  const car = vehicleRowsFor(ALL_AGES).find((d) => d.key === "Car, pick-up truck or van");

  const { inner } = createChartSvg(
    "chart-d",
    size,
    "Horizontal bar chart of average bed days per pedestrian admission by the vehicle that hit them, 2016 to 2021",
    `Stays get longer as vehicles get heavier: ${car ? formatters.dec1(car.perCase) : "–"} days after being hit by a car, ute or van and ${truck ? formatters.dec1(truck.perCase) : "–"} days after a truck or bus.`,
  );

  // Fixed x domain: the largest valid value over all ages and every age group, so bars can be compared when the
  // age group changes (a rescaling axis would make every age group look the same)
  const validValues = [ALL_AGES, ...AGE_ORDER].flatMap((age) =>
    vehicleRowsFor(age)
      .filter((d) => d.shown)
      .map((d) => d.perCase),
  );
  const x = d3.scaleLinear().domain([0, d3.max(validValues)]).nice().range([0, size.innerWidth]);
  const y = d3
    .scaleBand()
    .domain(VEHICLES.map((v) => v.label))
    .range([0, size.innerHeight])
    .paddingInner(0.5)
    .paddingOuter(0.2);
  chartScales.d = { x, y, size };

  inner
    .append("g")
    .attr("class", "axis x-axis axis--no-domain")
    .attr("transform", `translate(0, ${size.innerHeight})`)
    .call(d3.axisBottom(x).ticks(isMobile() ? 4 : 7).tickSize(-size.innerHeight).tickPadding(8))
    .append("text")
    .attr("class", "axis-title")
    .attr("x", size.innerWidth / 2)
    .attr("y", 34)
    .attr("text-anchor", "middle")
    .text("Average bed days per admission");
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

  buildTableD();
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

const updateChartD = (instant = false, atBaseline = false) => {
  const { x, y, size } = chartScales.d;
  const ageGroup = chartState.d.ageGroup;
  const rows = vehicleRowsFor(ageGroup);
  const inner = d3.select("#chart-d .inner-chart");
  const t = d3.transition().duration(instant ? 0 : duration()).ease(d3.easeCubicInOut);
  const mobile = isMobile();
  const barHeight = y.bandwidth();

  const widthFor = (d) => (atBaseline || !d.shown ? 0 : x(d.perCase));
  inner
    .select(".bars")
    .selectAll("path")
    .data(rows, (d) => d.key)
    .join("path")
    .attr("fill", COLORS.bedDays)
    .transition(t)
    .attr("d", (d) => barPathHorizontal(0, y(d.label), widthFor(d), barHeight));

  // Value label at the end of each bar, or the small-numbers note instead of a bar
  inner
    .select(".labels")
    .selectAll("text")
    .data(atBaseline ? [] : rows, (d) => d.key)
    .join("text")
    .attr("y", (d) => y(d.label) + barHeight / 2)
    .attr("dy", "0.35em")
    .attr("class", (d) => (d.shown ? "value-label" : "too-few"))
    .text((d) => {
      if (!d.shown) return "Fewer than 20 cases";
      return mobile ? `${formatters.dec1(d.perCase)} days` : `${formatters.dec1(d.perCase)} days (n = ${formatters.count(d.cases)})`;
    })
    .transition(t)
    .attr("x", (d) => (d.shown ? x(d.perCase) + 6 : 4));

  // Annotation under the truck bar: how many times longer than a car, if both groups are large enough
  const truck = rows.find((d) => d.key === "Heavy transport vehicle or bus");
  const car = rows.find((d) => d.key === "Car, pick-up truck or van");
  const showNote = !atBaseline && truck && car && truck.shown && car.shown;
  inner
    .select(".annotation-truck")
    .attr("x", 0)
    .attr("y", y("Truck or bus") + barHeight + (y.step() - barHeight) / 2)
    .attr("dy", "0.35em")
    .text(showNote ? `${formatters.ratio1(truck.perCase / car.perCase)}× as long as a car` : "");

  d3.select("#chart-d-subtitle").text(
    `Average bed days per pedestrian admission by the vehicle that hit them, 2016–2021 · ${ageGroup === ALL_AGES ? ALL_AGES : AGE_LABELS[ageGroup]}`,
  );

  // One focusable row per vehicle with a tooltip
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
    const out = [
      { text: `${formatters.dec1(d.perCase)} bed days per admission`, color: COLORS.bedDays },
      { text: `${formatters.count(d.cases)} admissions · ${formatters.count(d.bedDays)} bed days` },
    ];
    if (d.caseShare !== null) {
      out.push({ text: `${formatters.pct1(d.caseShare)} of pedestrian admissions, ${formatters.pct1(d.bedShare)} of bed days` });
    }
    return out;
  };
  makeInteractive(hits, {
    htmlFor: (d) => tooltipHtml(d.label, lines(d)),
    labelFor: (d) => `${d.label}: ${lines(d).map((l) => l.text).join(", ")}`,
  });
};

// Data table: vehicles × age groups, with small cells written as "Fewer than 20"
const buildTableD = () => {
  const ages = [ALL_AGES, ...AGE_ORDER];
  const cells = Object.fromEntries(ages.map((age) => [age, vehicleRowsFor(age)]));
  buildDataTable(
    "table-d",
    "Average bed days per pedestrian admission (number of admissions) by vehicle and age group, 2016–2021 (KNIME part 7)",
    [
      { label: "Vehicle", value: (vehicle) => vehicle.label },
      ...ages.map((age) => ({
        label: age === ALL_AGES ? ALL_AGES : AGE_LABELS[age],
        numeric: true,
        value: (vehicle) => {
          const cell = cells[age].find((d) => d.key === vehicle.key);
          return cell && cell.shown ? `${formatters.dec1(cell.perCase)} (${formatters.count(cell.cases)})` : "Fewer than 20";
        },
      })),
    ],
    VEHICLES,
  );
};
