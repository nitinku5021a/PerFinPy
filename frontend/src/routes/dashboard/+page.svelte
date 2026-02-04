<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { formatInr } from "$lib/format";

  let networthMonthly = [];
  let savings = [];
  let error = "";

  function labelForMonth(key) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  }

  function linePoints(series, width, height, key) {
    if (!series.length) return "";
    const values = series.map((d) => Number(d[key]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return series
      .map((d, i) => {
        const x = (i / Math.max(series.length - 1, 1)) * width;
        const y = height - ((Number(d[key]) || 0) - min) / range * height;
        return `${x},${y}`;
      })
      .join(" ");
  }

  function barHeights(series, height, key) {
    if (!series.length) return [];
    const values = series.map((d) => Math.abs(Number(d[key]) || 0));
    const max = Math.max(...values, 1);
    return series.map((d) => {
      const v = Math.abs(Number(d[key]) || 0);
      return Math.max(2, (v / max) * height);
    });
  }

  function donutDash(pct) {
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    const dash = (pct / 100) * circumference;
    return `${dash} ${circumference - dash}`;
  }

  $: lastSavings = savings.length ? savings[savings.length - 1] : null;
  $: networthLatest = networthMonthly.length ? networthMonthly[networthMonthly.length - 1].networth : null;
  $: networthDelta = networthMonthly.length ? networthMonthly[networthMonthly.length - 1].delta : null;
  $: incomeLatest = lastSavings?.income || 0;
  $: expenseLatest = lastSavings?.expense || 0;
  $: netSavingsLatest = lastSavings?.net_savings || 0;
  $: netSavingsPct = lastSavings?.net_savings_pct || 0;

  onMount(async () => {
    try {
      const networthSeries = await apiGet("/reports/networth-monthly");
      const savingsSeries = await apiGet("/reports/net-savings-series");
      networthMonthly = networthSeries?.months || [];
      savings = savingsSeries?.months || [];
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  });
</script>

<h1 class="page-title">Dashboard</h1>
<p class="page-subtitle">Net worth, cash flow, spending, and investments.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="dash-grid">
  <section class="dash-card">
    <div class="dash-header">
      <div>
        <div class="dash-title">Net Worth</div>
        <div class="dash-value">{networthLatest ? formatInr(networthLatest) : "--"}</div>
      </div>
      <div class="dash-meta">
        {networthDelta !== null ? `${networthDelta >= 0 ? "+" : ""}${formatInr(networthDelta)}` : "--"}
      </div>
    </div>
    <div class="dash-mini">
      <svg viewBox="0 0 280 90" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="#1d4ed8"
          stroke-width="2"
          points={linePoints(networthMonthly.slice(-18), 280, 80, "networth")}
        />
      </svg>
    </div>
    <div class="dash-sub">{networthMonthly.length ? labelForMonth(networthMonthly[networthMonthly.length - 1].month) : ""}</div>
  </section>

  <section class="dash-card">
    <div class="dash-header">
      <div>
        <div class="dash-title">Cash Flow Visualization</div>
        <div class="dash-sub">Last month income vs expense</div>
      </div>
    </div>
    <div class="flow-bars">
      <div class="flow-row">
        <span>Income</span>
        <div class="flow-bar"><span style={`width:${incomeLatest && incomeLatest > 0 ? 100 : 0}%`}></span></div>
        <span class="num">{formatInr(incomeLatest)}</span>
      </div>
      <div class="flow-row">
        <span>Expense</span>
        <div class="flow-bar flow-expense"><span style={`width:${incomeLatest ? Math.min(100, (expenseLatest / incomeLatest) * 100) : 0}%`}></span></div>
        <span class="num">{formatInr(expenseLatest)}</span>
      </div>
      <div class="flow-row">
        <span>Net</span>
        <div class="flow-bar flow-net"><span style={`width:${incomeLatest ? Math.min(100, (Math.abs(netSavingsLatest) / incomeLatest) * 100) : 0}%`}></span></div>
        <span class="num">{formatInr(netSavingsLatest)}</span>
      </div>
    </div>
  </section>

  <section class="dash-card">
    <div class="dash-header">
      <div>
        <div class="dash-title">Net Spending</div>
        <div class="dash-sub">Spending as % of income</div>
      </div>
      <div class="dash-meta">{incomeLatest ? `${(100 - netSavingsPct).toFixed(1)}%` : "--"}</div>
    </div>
    <div class="donut-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="44" stroke="#e5e7eb" stroke-width="12" fill="none" />
        <circle
          cx="60"
          cy="60"
          r="44"
          stroke="#16a34a"
          stroke-width="12"
          fill="none"
          stroke-dasharray={donutDash(netSavingsPct)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div class="donut-label">
        <div class="donut-value">{incomeLatest ? `${netSavingsPct.toFixed(1)}%` : "--"}</div>
        <div class="donut-sub">Saved</div>
      </div>
    </div>
    <div class="dash-sub">Income: {formatInr(incomeLatest)} • Expense: {formatInr(expenseLatest)}</div>
  </section>

  <section class="dash-card">
    <div class="dash-header">
      <div>
        <div class="dash-title">Investment Performance</div>
        <div class="dash-sub">Net worth trend proxy</div>
      </div>
      <div class="dash-meta">{networthLatest ? formatInr(networthLatest) : "--"}</div>
    </div>
    <div class="dash-mini">
      <svg viewBox="0 0 280 90" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="#0f172a"
          stroke-width="2"
          points={linePoints(networthMonthly.slice(-18), 280, 80, "networth")}
        />
      </svg>
    </div>
    <div class="dash-sub">{networthMonthly.length ? labelForMonth(networthMonthly[networthMonthly.length - 1].month) : ""}</div>
  </section>
</div>
