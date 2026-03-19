<script>
  import { formatInr } from "$lib/format";

  let startingCorpus = 1000000;
  let monthlySaving = 0;
  let interestRate = 8;
  let years = 30;

  function formatIndianNumber(num) {
    if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
    return Number(num || 0).toLocaleString("en-IN");
  }

  function generateProjections() {
    const monthlyRate = interestRate / 12 / 100;
    let corpus = startingCorpus;
    const monthlyData = [];
    const yearlyData = [];

    const today = new Date();
    const yearStart = today.getFullYear();
    const monthStart = today.getMonth();

    for (let m = 0; m < years * 12; m += 1) {
      const interest = corpus * monthlyRate;
      corpus += interest + monthlySaving;

      monthlyData.push({
        month: new Date(yearStart, monthStart + m).toLocaleString("en-IN", {
          month: "short",
          year: "2-digit"
        }),
        corpus: Math.round(corpus),
        diff: Math.round(interest)
      });

      const currentMonth = (monthStart + m) % 12;
      if (currentMonth === 2) {
        const fyStart = yearStart + Math.floor((monthStart + m) / 12);
        yearlyData.push({
          year: `${fyStart}-${String(fyStart + 1).slice(-2)}`,
          corpus: Math.round(corpus)
        });
      }
    }

    return { monthlyData, yearlyData };
  }

  $: projections = generateProjections();
  $: monthlyData = projections.monthlyData;
  $: yearlyData = projections.yearlyData;
  $: chartMin = yearlyData.length ? Math.min(...yearlyData.map((d) => d.corpus)) : 0;
  $: chartMax = yearlyData.length ? Math.max(...yearlyData.map((d) => d.corpus)) : 1;

  const chartWidth = 520;
  const chartHeight = 260;
  const chartPadding = { top: 16, right: 18, bottom: 36, left: 46 };

  function linePath(data) {
    if (!data.length) return "";
    const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
    const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    const step = data.length > 1 ? innerWidth / (data.length - 1) : 0;
    const range = chartMax - chartMin || 1;

    return data
      .map((point, idx) => {
        const x = chartPadding.left + idx * step;
        const ratio = (point.corpus - chartMin) / range;
        const y = chartPadding.top + (1 - ratio) * innerHeight;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }
</script>

<h1 class="page-title">Corpus Projection Calculator</h1>
<p class="page-subtitle">Project long-term corpus growth with monthly contributions and compounding.</p>

<div class="projection-layout">
  <section class="panel projection-inputs">
    <div class="projection-control">
      <label>Starting Corpus (Lakh)</label>
      <div class="projection-value">INR {formatInr(startingCorpus)} ({(startingCorpus / 100000).toFixed(0)} Lakh)</div>
      <input
        type="range"
        min="10"
        max="3000"
        step="1"
        value={startingCorpus / 100000}
        on:input={(e) => (startingCorpus = Number(e.currentTarget.value) * 100000)}
      />
      <input
        type="number"
        min="10"
        max="3000"
        step="1"
        value={startingCorpus / 100000}
        on:input={(e) => (startingCorpus = Number(e.currentTarget.value || 0) * 100000)}
      />
    </div>

    <div class="projection-control">
      <label>Monthly Saving (INR)</label>
      <input
        type="number"
        value={monthlySaving}
        on:input={(e) => (monthlySaving = Number(e.currentTarget.value || 0))}
      />
    </div>

    <div class="projection-control">
      <label>Interest Rate: {interestRate}%</label>
      <input
        type="range"
        min="1"
        max="20"
        step="0.1"
        value={interestRate}
        on:input={(e) => (interestRate = Number(e.currentTarget.value || 0))}
      />
    </div>

    <div class="projection-control">
      <label>Years: {years}</label>
      <input
        type="range"
        min="1"
        max="50"
        step="1"
        value={years}
        on:input={(e) => (years = Number(e.currentTarget.value || 0))}
      />
    </div>
  </section>

  <section class="panel projection-chart">
    <div class="projection-title">Yearly Projection</div>
    {#if yearlyData.length}
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        <line
          x1={chartPadding.left}
          y1={chartPadding.top}
          x2={chartPadding.left}
          y2={chartHeight - chartPadding.bottom}
          stroke="#e5e7eb"
        />
        <line
          x1={chartPadding.left}
          y1={chartHeight - chartPadding.bottom}
          x2={chartWidth - chartPadding.right}
          y2={chartHeight - chartPadding.bottom}
          stroke="#e5e7eb"
        />
        <text x={chartPadding.left} y={chartPadding.top - 4} class="axis-label">
          {formatIndianNumber(chartMax)}
        </text>
        <text x={chartPadding.left} y={chartHeight - 8} class="axis-label">
          {formatIndianNumber(chartMin)}
        </text>
        <path d={linePath(yearlyData)} class="projection-line" />
      </svg>
    {:else}
      <div class="meta">No projection data yet.</div>
    {/if}
  </section>
</div>

<div class="projection-tables">
  <section class="panel">
    <h3>Monthly Projection</h3>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Month</th>
            <th class="num">Corpus</th>
            <th class="num">Difference</th>
          </tr>
        </thead>
        <tbody>
          {#each monthlyData as row}
            <tr>
              <td>{row.month}</td>
              <td class="num">INR {formatInr(row.corpus)}</td>
              <td class="num">INR {formatInr(row.diff)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h3>Yearly Projection</h3>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Year</th>
            <th class="num">Corpus</th>
          </tr>
        </thead>
        <tbody>
          {#each yearlyData as row}
            <tr>
              <td>{row.year}</td>
              <td class="num">INR {formatInr(row.corpus)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

<style>
  .projection-layout {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 12px;
    align-items: start;
  }

  .projection-inputs {
    display: grid;
    gap: 12px;
  }

  .projection-control {
    display: grid;
    gap: 6px;
    font-size: 12px;
    color: var(--muted);
  }

  .projection-control input[type="number"] {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 8px;
  }

  .projection-control input[type="range"] {
    width: 100%;
  }

  .projection-value {
    font-size: 12px;
    color: var(--text);
  }

  .projection-chart svg {
    width: 100%;
    height: 240px;
  }

  .projection-title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .projection-line {
    fill: none;
    stroke: #6366f1;
    stroke-width: 2.5;
  }

  .axis-label {
    font-size: 10px;
    fill: var(--muted);
  }

  .projection-tables {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  h3 {
    font-size: 12px;
    margin-bottom: 6px;
  }

  @media (max-width: 900px) {
    .projection-layout,
    .projection-tables {
      grid-template-columns: 1fr;
    }
  }
</style>
