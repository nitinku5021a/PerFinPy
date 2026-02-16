<script>
  import { formatInr } from "$lib/format";
  import { AreaChart, Circle, Line, LinearGradient, Tooltip } from "layerchart";
  import { curveMonotoneX } from "d3-shape";

  /** @type {import("$lib/financeMetrics").NetWorthMonthlyPoint[]} */
  export let series = [];
  /** @type {import("$lib/financeMetrics").SavingsMonthlyPoint[]} */
  export let savingsSeries = [];

  let target = 0;
  let targetInitialized = false;

  function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function sortByMonth(data) {
    return [...(data || [])].sort((a, b) => String(a.month).localeCompare(String(b.month)));
  }

  function addMonths(key, delta) {
    if (!key) return "";
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1 + delta, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }

  function yearFromMonth(key) {
    return String(key || "").slice(0, 4);
  }

  function monthLabel(key) {
    if (!key) return "";
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  }

  function weightedAverage(items) {
    if (!items.length) return null;
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    if (!totalWeight) return null;
    const total = items.reduce((sum, item) => sum + item.value * item.weight, 0);
    return total / totalWeight;
  }

  function trimOutliers(items) {
    if (items.length < 4) return items;
    const sorted = [...items].sort((a, b) => a.value - b.value);
    return sorted.slice(1, -1);
  }

  function computeWeightedCagr(monthly) {
    const sorted = sortByMonth(monthly);
    if (sorted.length < 13) return { cagr: null, recentYoY: null };
    const lastIndex = sorted.length - 1;
    const rates = [];
    for (let yearIndex = 0; yearIndex < 5; yearIndex += 1) {
      const endIndex = lastIndex - yearIndex * 12;
      const startIndex = endIndex - 12;
      if (startIndex < 0 || endIndex < 0) continue;
      const startValue = toNumber(sorted[startIndex].networth);
      const endValue = toNumber(sorted[endIndex].networth);
      if (Math.abs(startValue) < 0.00001) continue;
      const rate = endValue / startValue - 1;
      rates.push({ value: rate, weight: 5 - yearIndex });
    }
    if (!rates.length) return { cagr: null, recentYoY: null };
    const recentYoY = rates[0] ? rates[0].value : null;
    const filtered = trimOutliers(rates);
    const avg = weightedAverage(filtered);
    return { cagr: avg, recentYoY };
  }

  function computeWeightedContribution(savings) {
    const sorted = sortByMonth(savings);
    if (!sorted.length) return null;
    const byYear = new Map();
    for (const point of sorted) {
      const year = yearFromMonth(point.month);
      if (!year) continue;
      const current = byYear.get(year) || 0;
      const net = toNumber(point.income) - toNumber(point.expense);
      byYear.set(year, current + net);
    }
    const years = Array.from(byYear.keys()).sort();
    const recentYears = years.slice(-5);
    const items = recentYears.map((year, idx) => ({
      value: byYear.get(year) || 0,
      weight: idx + 1
    }));
    return weightedAverage(items);
  }

  function projectNetWorth(latestMonth, currentValue, annualGrowth, annualContribution, monthsAhead) {
    const results = [];
    if (!latestMonth) return results;
    const monthlyGrowth = annualGrowth === null ? 0 : Math.pow(1 + annualGrowth, 1 / 12) - 1;
    const monthlyContribution = annualContribution === null ? 0 : annualContribution / 12;
    let value = currentValue;
    for (let i = 1; i <= monthsAhead; i += 1) {
      value = value * (1 + monthlyGrowth) + monthlyContribution;
      results.push({
        month: addMonths(latestMonth, i),
        networth: value
      });
    }
    return results;
  }

  function findMonthsToTarget(projected, targetValue) {
    if (!projected.length) return null;
    const idx = projected.findIndex((point) => point.networth >= targetValue);
    return idx === -1 ? null : idx + 1;
  }

  function formatCrore(value) {
    const crore = value / 10000000;
    if (Math.abs(crore) < 0.05) return "0";
    const rounded = Math.round(crore * 10) / 10;
    return `${rounded} cr`;
  }

  function safeX(d) {
    return d && typeof d.index === "number" ? d.index : 0;
  }

  function safeY(d) {
    return d && typeof d.value === "number" ? d.value : 0;
  }

  $: orderedSeries = sortByMonth(series || []);
  $: latest = orderedSeries.length ? orderedSeries[orderedSeries.length - 1] : null;
  $: currentNetWorth = latest ? toNumber(latest.networth) : 0;

  $: if (!targetInitialized && currentNetWorth > 0) {
    target = Math.round(currentNetWorth * 1.5);
    targetInitialized = true;
  }

  $: cagrMetrics = computeWeightedCagr(orderedSeries);
  $: cagr = cagrMetrics.cagr;
  $: recentYoY = cagrMetrics.recentYoY;
  $: avgContribution = computeWeightedContribution(savingsSeries);
  $: projectionMonths = 120;
  $: projected = projectNetWorth(
    latest ? latest.month : "",
    currentNetWorth,
    cagr,
    avgContribution,
    projectionMonths
  );
  $: monthsToTarget = target > 0 ? findMonthsToTarget(projected, target) : null;
  $: targetReached = target > 0 && currentNetWorth >= target;

  $: projectedHorizon = (() => {
    if (targetReached) return 12;
    if (monthsToTarget) return Math.min(projectionMonths, Math.max(12, monthsToTarget));
    return projectionMonths;
  })();

  $: projectedVisible = projected.slice(0, projectedHorizon);
  $: historyVisible = orderedSeries.slice(-120);

  $: historyChart = historyVisible.map((point, index) => ({
    index,
    month: point.month,
    label: monthLabel(point.month),
    value: toNumber(point.networth),
    seriesKey: "history"
  }));

  $: projectionChart = projectedVisible.map((point, index) => ({
    index: historyChart.length + index,
    month: point.month,
    label: monthLabel(point.month),
    value: toNumber(point.networth),
    seriesKey: "projection"
  }));

  $: chartSeries = [...historyChart, ...projectionChart];
  $: hasChartData = chartSeries.length > 0;
  $: chartValues = chartSeries.map((d) => d.value).filter((v) => Number.isFinite(v));
  $: chartMinValue = chartValues.length ? Math.min(...chartValues) : 0;
  $: chartMaxValue = chartValues.length ? Math.max(...chartValues) : 0;
  $: chartRangeValue = chartMaxValue - chartMinValue;
  $: chartAbsMax = Math.max(Math.abs(chartMinValue), Math.abs(chartMaxValue));
  $: chartPad =
    chartAbsMax === 0
      ? 1
      : chartRangeValue < chartAbsMax * 0.08
        ? chartAbsMax * 0.08
        : chartRangeValue * 0.12;
  $: currentPoint = historyChart.length ? historyChart[historyChart.length - 1] : null;

  $: progressPct = target > 0 ? Math.min(100, Math.max(0, (currentNetWorth / target) * 100)) : 0;
  $: targetYear = (() => {
    if (targetReached) return "Reached";
    if (!monthsToTarget) return null;
    const monthKey = addMonths(latest ? latest.month : "", monthsToTarget);
    return monthKey ? monthKey.slice(0, 4) : null;
  })();

  $: trendLabel = (() => {
    if (recentYoY === null || cagr === null) return "Trend data unavailable.";
    const recentPct = recentYoY * 100;
    const longPct = cagr * 100;
    const diff = recentPct - longPct;
    const direction = diff >= 0 ? "above" : "below";
    return `Recent 12-month trend is ${Math.abs(diff).toFixed(1)}% ${direction} the long-term pace.`;
  })();

  $: targetEtaLabel = (() => {
    if (targetReached) return "Target already reached.";
    if (!target || target <= 0) return "Set a target to estimate timeline.";
    if (monthsToTarget) return `${monthsToTarget} months to target.`;
    if (cagr === null && avgContribution === null) return "Not enough data to estimate target.";
    if ((cagr || 0) <= 0 && (avgContribution || 0) <= 0) return "Target not reachable with current trend.";
    return "Target likely beyond 10 years.";
  })();

  $: xLabels = Array.from({ length: 6 }).map((_, i) => ({ label: `Year ${i}` }));
</script>

<section class="target-panel">
  <div class="target-panel__header">
    <div>
      <div class="target-panel__title">Net Worth Target Tracker</div>
      <div class="target-panel__subtitle">Goal projection driven by historical growth and contributions.</div>
    </div>
    <div class="target-panel__pill">Projection</div>
  </div>

  <div class="target-panel__body">
    <div class="target-panel__metrics">
      <div class="target-panel__value">{currentNetWorth ? formatInr(currentNetWorth) : "--"}</div>
      <div class="target-panel__label">Current Net Worth</div>

      <label class="target-panel__input-label">
        Target Net Worth
        <input
          class="target-panel__input"
          type="number"
          min="0"
          step="1000"
          bind:value={target}
        />
      </label>

      <div class="target-panel__progress">
        <div class="target-panel__progress-row">
          <span>Progress</span>
          <span>{target ? `${progressPct.toFixed(1)}%` : "--"}</span>
        </div>
        <div class="target-panel__progress-track">
          <div class="target-panel__progress-bar" style={`width: ${progressPct}%`}></div>
        </div>
      </div>

      <div class="target-panel__insights">
        <div>5Y weighted CAGR: {cagr === null ? "--" : `${(cagr * 100).toFixed(2)}%`}</div>
        <div>Avg annual contribution: {avgContribution === null ? "--" : formatInr(Math.round(avgContribution))}</div>
        <div>Estimated target year: {targetYear || "--"}</div>
        <div>{trendLabel}</div>
        <div>{targetEtaLabel}</div>
      </div>
    </div>

    <div class="target-panel__chart">
      <div class="target-panel__chart-header">
        <div>
          <div class="target-panel__chart-title">Net Worth Trajectory</div>
          <div class="target-panel__chart-subtitle">Historical vs projection (next 5 years)</div>
        </div>
        <div class="target-panel__legend">
          <span class="target-panel__legend-item"><span class="dot dot-history"></span>History</span>
          <span class="target-panel__legend-item"><span class="dot dot-projection"></span>Projection</span>
          <span class="target-panel__legend-item"><span class="dot dot-target"></span>Target</span>
        </div>
      </div>

      <div class="target-panel__chart-card">
        <AreaChart
          data={hasChartData ? chartSeries : [{ index: 0, value: 0, label: "", seriesKey: "history" }]}
          yDomain={chartValues.length ? [chartMinValue - chartPad, chartMaxValue + chartPad] : undefined}
          x={safeX}
          y={safeY}
          axis="y"
          grid={{ y: true, x: false, classes: { line: "target-grid-line" } }}
          rule={false}
          padding={{ top: 12, right: 24, bottom: 24, left: 56 }}
          props={{
            yAxis: {
              ticks: 4,
              tickLength: 0,
              format: (value) => formatCrore(value),
              tickLabelProps: { class: "target-axis-label" },
              classes: { rule: "hidden", tick: "hidden" }
            },
            area: {
              curve: curveMonotoneX,
              fillOpacity: 0.2,
              line: { curve: curveMonotoneX, strokeWidth: 2.5, draw: { duration: 600 } }
            },
            tooltip: {
              root: { class: "target-tooltip" },
              header: { class: "target-tooltip__title" },
              list: { class: "target-tooltip__list" },
              item: { class: "target-tooltip__item" },
              separator: { class: "target-tooltip__separator" }
            }
          }}
          series={[
            {
              key: "history",
              label: "History",
              data: historyChart,
              value: (d) => d.value,
              color: "var(--nw-history)",
              props: {
                fillOpacity: 0,
                line: { stroke: "var(--nw-history)", strokeWidth: 2.6, draw: { duration: 600 } }
              }
            },
            {
              key: "projection",
              label: "Projection",
              data: projectionChart,
              value: (d) => d.value,
              color: "url(#nw-projection-fill)",
              props: {
                fillOpacity: 0.35,
                line: {
                  stroke: "var(--nw-projection)",
                  strokeWidth: 2.2,
                  strokeDasharray: "6 6",
                  opacity: 0.9,
                  draw: { duration: 600 }
                }
              }
            }
          ]}
        >
          <svelte:fragment slot="belowMarks">
            <LinearGradient
              id="nw-projection-fill"
              vertical={true}
              stops={[
                ["0%", "rgba(99,102,241,0.35)"],
                ["70%", "rgba(99,102,241,0.08)"],
                ["100%", "rgba(99,102,241,0)" ]
              ]}
            />
          </svelte:fragment>

          <svelte:fragment slot="aboveMarks" let:xScale let:yScale let:width let:height>
            {#if target > 0}
              <Line
                x1={0}
                x2={width}
                y1={yScale(target)}
                y2={yScale(target)}
                stroke="var(--nw-target)"
                strokeWidth={1}
                strokeDasharray="5 6"
                class="target-line"
              />
            {/if}

            {#if currentPoint}
              <Circle
                cx={xScale(currentPoint.index)}
                cy={yScale(currentPoint.value)}
                r={5}
                fill="var(--nw-primary)"
                stroke="#ffffff"
                strokeWidth={2}
                class="target-current-point"
              />
            {/if}
          </svelte:fragment>

          <svelte:fragment slot="tooltip">
            <Tooltip.Root x="data" y="data" anchor="top" classes={{ container: "target-tooltip__container" }} let:data>
              <div class="target-tooltip__title">{data?.label || ""}</div>
              <div class="target-tooltip__value">{data ? formatInr(Math.round(data.value)) : "--"}</div>
              <div class="target-tooltip__meta">
                {data?.seriesKey === "projection" ? "Projection" : "Historical"}
              </div>
            </Tooltip.Root>
          </svelte:fragment>
        </AreaChart>
      </div>

      <div class="target-panel__xlabels">
        {#each xLabels as label}
          <span>{label.label}</span>
        {/each}
      </div>
    </div>
  </div>
</section>
