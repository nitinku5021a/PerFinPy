<script>
  import { formatInr } from "$lib/format";

  const DEFAULT_BUCKETS = [
    { name: "Liquid Funds", allocation: 10, avgReturn: 4, volatility: 1 },
    { name: "Debt Funds", allocation: 40, avgReturn: 7, volatility: 2 },
    { name: "Commodities (Gold/Silver)", allocation: 10, avgReturn: 8, volatility: 5 },
    { name: "Equity Large Cap", allocation: 25, avgReturn: 12, volatility: 15 },
    { name: "Equity Small/Mid Cap", allocation: 15, avgReturn: 16, volatility: 25 }
  ];

  let tab = "inputs";

  let corpus = 200 * 100000;
  let firstYearExpenses = 3 * 100000;
  let inflation = 6;
  let modeManual = false;
  let buckets = DEFAULT_BUCKETS.map((b) => ({ ...b }));

  let balances = [];
  let history = [];
  let year = 0;
  let pendingYear = null;

  let transferFrom = 1;
  let transferTo = 0;
  let transferAmount = "";

  let inputValues = {
    corpus: "200",
    firstYearExpenses: "3",
    inflation: "6",
    allocations: ["10", "40", "10", "25", "15"],
    avgReturns: ["4", "7", "8", "12", "16"],
    volatilities: ["1", "2", "5", "15", "25"]
  };

  const chartColors = ["#2563eb", "#16a34a", "#eab308", "#9333ea", "#ec4899"];

  $: allocationSum = buckets.reduce((sum, b) => sum + Number(b.allocation || 0), 0);
  $: hasBalances = balances && balances.length > 0;
  $: hasHistory = history && history.length > 0;

  $: chartSeries = buckets.map((bucket, idx) => ({
    label: bucket.name,
    color: chartColors[idx % chartColors.length],
    values: history.map((row) => Number(row.endValues?.[idx] || 0))
  }));

  $: totalSeries = history.map((row) => Number(row.total || 0));
  $: allSeriesValues = [...totalSeries, ...chartSeries.flatMap((s) => s.values)];
  $: chartMin = allSeriesValues.length ? Math.min(...allSeriesValues) : 0;
  $: chartMax = allSeriesValues.length ? Math.max(...allSeriesValues) : 1;
  $: chartRange = chartMax - chartMin || 1;

  const chartWidth = 900;
  const chartHeight = 320;
  const chartPadding = { top: 16, right: 20, bottom: 36, left: 52 };

  function formatCurrency(value) {
    return `INR ${formatInr(value)}`;
  }

  function formatLakh(value) {
    return Math.max(0, Math.round(value / 100000)).toLocaleString("en-IN");
  }

  function startSimulation() {
    if (Math.round(allocationSum) !== 100) {
      window.alert("Allocation % across buckets must total exactly 100");
      return;
    }

    const initBalances = buckets.map((b) => corpus * (b.allocation / 100));
    balances = initBalances;
    history = [];
    year = 0;
    pendingYear = null;
    tab = "simulation";
  }

  function nextYear() {
    if (!hasBalances) {
      window.alert("Start simulation first (Start button in Inputs tab). ");
      return;
    }
    if (pendingYear) {
      window.alert("You have a pending transfer requirement. Fix transfers before advancing.");
      return;
    }

    const nextYearIndex = year + 1;
    const expenseThisYear = firstYearExpenses * Math.pow(1 + inflation / 100, year);

    const avgReturns = buckets.map((b) => b.avgReturn);
    const volatilities = buckets.map((b) => b.volatility);
    const returnsPct = correlatedReturns(avgReturns, volatilities, CORRELATION_MATRIX);

    let newBalances = balances.map((bal, i) => {
      const pct = returnsPct[i] / 100;
      const gain = bal * pct;
      return Math.max(0, bal + gain);
    });

    const returnAmounts = newBalances.map((newBal, i) => newBal - balances[i]);

    if (modeManual) {
      if (newBalances[0] >= expenseThisYear) {
        newBalances[0] -= expenseThisYear;
        pushHistoryRow(nextYearIndex, returnAmounts, newBalances);
        balances = newBalances;
        year = nextYearIndex;
        return;
      }

      const shortfall = expenseThisYear - newBalances[0];
      pendingYear = {
        year: nextYearIndex,
        returnAmounts,
        balancesBeforeWithdrawal: [...newBalances],
        expenseThisYear,
        shortfall
      };
      window.alert(
        "Liquid Funds cannot cover the current expense. Transfer funds to Liquid Funds before proceeding."
      );
      return;
    }

    let remainingExpense = expenseThisYear;
    let autoBalances = [...newBalances];
    for (let i = 0; i < autoBalances.length; i += 1) {
      const take = Math.min(autoBalances[i], remainingExpense);
      autoBalances[i] -= take;
      remainingExpense -= take;
      if (remainingExpense <= 0) break;
    }
    if (remainingExpense > 0) {
      autoBalances = autoBalances.map(() => 0);
    }
    pushHistoryRow(nextYearIndex, returnAmounts, autoBalances);
    balances = autoBalances;
    year = nextYearIndex;
  }

  function pushHistoryRow(yearIndex, returnAmounts, endBalances) {
    const total = endBalances.reduce((sum, v) => sum + v, 0);
    history = [
      ...history,
      {
        year: yearIndex,
        returnsAmt: returnAmounts.map((r) => Number(r)),
        endValues: endBalances.map((v) => Number(v)),
        total
      }
    ];
  }

  function transferFunds() {
    const from = Number(transferFrom);
    const to = Number(transferTo);
    const amountLakh = Number(transferAmount);
    const amount = amountLakh * 100000;

    if (from === to) {
      window.alert("Choose different source and destination buckets.");
      return;
    }
    if (!hasBalances) {
      window.alert("No balances available. Start simulation first.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Transfer amount must be > 0");
      return;
    }
    if (balances[from] < amount) {
      window.alert("Not enough balance in chosen source bucket.");
      return;
    }

    const newBalances = [...balances];
    newBalances[from] -= amount;
    newBalances[to] += amount;
    balances = newBalances;

    if (pendingYear) {
      const pb = [...pendingYear.balancesBeforeWithdrawal];
      pb[from] -= amount;
      pb[to] += amount;
      if (pb[0] >= pendingYear.expenseThisYear) {
        pb[0] -= pendingYear.expenseThisYear;
        history = [
          ...history.filter((row) => row.year !== pendingYear.year),
          {
            year: pendingYear.year,
            returnsAmt: pendingYear.returnAmounts
              ? pendingYear.returnAmounts.map((r) => Number(r))
              : pb.map(() => 0),
            endValues: pb.map((v) => Number(v)),
            total: pb.reduce((sum, v) => sum + v, 0)
          }
        ];
        balances = pb;
        year = pendingYear.year;
        pendingYear = null;
        transferAmount = "";
        return;
      }

      pendingYear = {
        ...pendingYear,
        balancesBeforeWithdrawal: pb,
        shortfall: pendingYear.expenseThisYear - pb[0]
      };
      transferAmount = "";
      return;
    }

    transferAmount = "";
  }

  function resetAll() {
    tab = "inputs";
    balances = [];
    history = [];
    year = 0;
    pendingYear = null;
    transferAmount = "";
    inputValues = {
      corpus: "200",
      firstYearExpenses: "3",
      inflation: "6",
      allocations: ["10", "40", "10", "25", "15"],
      avgReturns: ["4", "7", "8", "12", "16"],
      volatilities: ["1", "2", "5", "15", "25"]
    };
    corpus = 200 * 100000;
    firstYearExpenses = 3 * 100000;
    inflation = 6;
    modeManual = false;
    buckets = DEFAULT_BUCKETS.map((b) => ({ ...b }));
  }

  function handleInputValue(key, value) {
    inputValues = { ...inputValues, [key]: value };
    if (key === "corpus") {
      corpus = value === "" ? 0 : Number(value) * 100000;
    }
    if (key === "firstYearExpenses") {
      firstYearExpenses = value === "" ? 0 : Number(value) * 100000;
    }
    if (key === "inflation") {
      inflation = value === "" ? 0 : Number(value);
    }
  }

  function updateBucketField(index, field, value) {
    const nextBuckets = buckets.map((b, i) => {
      if (i !== index) return b;
      return { ...b, [field]: value === "" ? 0 : Number(value) };
    });
    buckets = nextBuckets;
  }

  function updateBucketInput(index, field, value) {
    const key = field === "allocation" ? "allocations" : field === "avgReturn" ? "avgReturns" : "volatilities";
    inputValues = {
      ...inputValues,
      [key]: inputValues[key].map((v, i) => (i === index ? value : v))
    };
    updateBucketField(index, field, value);
  }

  function pathFor(values) {
    if (!values.length) return "";
    const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
    const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
    const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;

    return values
      .map((value, idx) => {
        const x = chartPadding.left + idx * step;
        const ratio = (value - chartMin) / chartRange;
        const y = chartPadding.top + (1 - ratio) * innerHeight;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }

  function returnPercent(row, index) {
    const endValue = row.endValues?.[index] ?? 0;
    const ret = row.returnsAmt?.[index] ?? 0;
    const startValue = endValue - ret;
    if (!startValue) return "--";
    return `${((ret / startValue) * 100).toFixed(2)}%`;
  }

  function liquidFundsYears() {
    if (!hasBalances) return "--";
    const startingBucket = balances[0] || 0;
    const expense = firstYearExpenses * Math.pow(1 + inflation / 100, year);
    if (expense <= 0) return "--";
    return Math.floor(startingBucket / expense).toLocaleString("en-IN");
  }

  function currentExpense() {
    return firstYearExpenses * Math.pow(1 + inflation / 100, year);
  }

  function randn() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  const CORRELATION_MATRIX = [
    [1, 0.4, 0.05, 0.05, 0.05],
    [0.4, 1, 0.15, 0.2, 0.2],
    [0.05, 0.15, 1, -0.2, -0.2],
    [0.05, 0.2, -0.2, 1, 0.9],
    [0.05, 0.2, -0.2, 0.9, 1]
  ];

  function correlatedReturns(avgReturns, volatilities, correlationMatrix) {
    const n = avgReturns.length;
    function cholesky(matrix) {
      const L = Array(n)
        .fill(0)
        .map(() => Array(n).fill(0));
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j <= i; j += 1) {
          let sum = 0;
          for (let k = 0; k < j; k += 1) sum += L[i][k] * L[j][k];
          L[i][j] = i === j ? Math.sqrt(matrix[i][i] - sum) : (matrix[i][j] - sum) / L[j][j];
        }
      }
      return L;
    }

    const z = Array(n)
      .fill(0)
      .map(() => randn());
    const L = cholesky(correlationMatrix);
    const correlated = Array(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j <= i; j += 1) {
        correlated[i] += L[i][j] * z[j];
      }
    }
    return avgReturns.map((avg, i) => avg + correlated[i] * volatilities[i]);
  }
</script>

<h1 class="page-title">Retirement Bucket Simulator</h1>
<p class="page-subtitle">Simulate multi-bucket retirement withdrawals with inflation-aware expenses.</p>

<div class="sim-tabs">
  <button class:active={tab === "inputs"} on:click={() => (tab = "inputs")}>Inputs</button>
  <button class:active={tab === "simulation"} disabled={!hasBalances} on:click={() => (tab = "simulation")}>
    Simulation
  </button>
  <button class="danger" on:click={resetAll}>Reset</button>
</div>

{#if tab === "inputs"}
  <div class="sim-grid">
    <div class="sim-panel">
      <div class="sim-form">
        <label>
          Starting Corpus (Lakh)
          <input
            type="number"
            value={inputValues.corpus}
            on:input={(e) => handleInputValue("corpus", e.currentTarget.value)}
          />
        </label>
        <label>
          First-year Annual Expenses (Lakh)
          <input
            type="number"
            value={inputValues.firstYearExpenses}
            on:input={(e) => handleInputValue("firstYearExpenses", e.currentTarget.value)}
          />
        </label>
        <label>
          Inflation (%)
          <input
            type="number"
            value={inputValues.inflation}
            on:input={(e) => handleInputValue("inflation", e.currentTarget.value)}
          />
        </label>
        <label class="sim-checkbox">
          <input type="checkbox" bind:checked={modeManual} />
          Manual Transfer Mode
        </label>
      </div>

      <div class="sim-section">
        <div class="sim-section-title">Buckets (allocation must total 100%)</div>
        <div class="sim-bucket-table">
          <div class="sim-bucket-head">
            <div>Name</div>
            <div>Allocation %</div>
            <div>Avg Return %</div>
            <div>Volatility %</div>
          </div>
          {#each buckets as bucket, idx}
            <div class="sim-bucket-row">
              <div>{bucket.name}</div>
              <input
                type="number"
                value={inputValues.allocations[idx]}
                on:input={(e) => updateBucketInput(idx, "allocation", e.currentTarget.value)}
              />
              <input
                type="number"
                value={inputValues.avgReturns[idx]}
                on:input={(e) => updateBucketInput(idx, "avgReturn", e.currentTarget.value)}
              />
              <input
                type="number"
                value={inputValues.volatilities[idx]}
                on:input={(e) => updateBucketInput(idx, "volatility", e.currentTarget.value)}
              />
            </div>
          {/each}
        </div>
        <div class="sim-allocation">
          Total allocation:
          <span class:bad={Math.round(allocationSum) !== 100}>{allocationSum}%</span>
        </div>
        <button class="button" on:click={startSimulation}>
          {modeManual ? "Manual Simulation" : "Auto Simulation"}
        </button>
      </div>
    </div>

    <aside class="sim-panel sim-help">
      <h2>How to Use This</h2>
      <p>Configure your corpus, expenses, and bucket settings, then run year-by-year simulations.</p>
      <div class="sim-help-grid">
        <div>
          <div class="sim-help-title">Setup</div>
          <div class="sim-help-text">Enter corpus, expenses, inflation, and mode.</div>
        </div>
        <div>
          <div class="sim-help-title">Buckets</div>
          <div class="sim-help-text">Allocation, returns, and volatility can be tuned per bucket.</div>
        </div>
        <div>
          <div class="sim-help-title">Modes</div>
          <div class="sim-help-text">Auto withdraws across buckets. Manual pauses and requires transfers.</div>
        </div>
        <div>
          <div class="sim-help-title">Simulation</div>
          <div class="sim-help-text">Advance year-by-year and monitor balances and returns.</div>
        </div>
      </div>
      <div class="sim-tip">
        Tip: Start with Auto mode to validate allocations, then switch to Manual for control.
      </div>
    </aside>
  </div>
{:else}
  <div class="sim-panel sim-controls">
    <div class="sim-stat">
      <div class="label">Current Year</div>
      <div class="value">{year}</div>
    </div>
    <div class="sim-stat">
      <div class="label">Liquid Funds cover suggestion</div>
      <div class="value">{liquidFundsYears()} year(s)</div>
    </div>
    <button class="sim-next" on:click={nextYear}>Next Year</button>
  </div>

  <div class="sim-grid sim-grid-wide">
    <div class="sim-panel">
      <div class="sim-section-title">Compound / Annual Return Inputs</div>
      <div class="sim-returns">
        {#each buckets as bucket}
          <div>
            <div class="label">{bucket.name}</div>
            <div class="value">{bucket.avgReturn}%</div>
            <div class="meta">Vol {bucket.volatility}%</div>
          </div>
        {/each}
      </div>

      <div class="sim-transfer">
        <div class="sim-section-title">Manual Transfer</div>
        <div class="sim-transfer-row">
          <label>
            From
            <select bind:value={transferFrom} disabled={!hasBalances}>
              {#each buckets as bucket, idx}
                <option value={idx}>
                  {bucket.name} ({hasBalances ? `${formatLakh(balances[idx] || 0)} Lakh` : "0 Lakh"})
                </option>
              {/each}
            </select>
          </label>
          <label>
            To
            <select bind:value={transferTo} disabled={!hasBalances}>
              {#each buckets as bucket, idx}
                <option value={idx}>{bucket.name}</option>
              {/each}
            </select>
          </label>
          <label>
            Amount (Lakh)
            <input type="number" min="0" bind:value={transferAmount} />
          </label>
          <button class="button" on:click={transferFunds} disabled={!hasBalances}>Transfer</button>
        </div>
        {#if pendingYear}
          <div class="sim-pending">
            <div class="label">Pending Year {pendingYear.year}</div>
            <div class="value">Liquid Funds shortfall: {formatCurrency(pendingYear.shortfall)}</div>
            <div class="meta">Transfer to Liquid Funds to commit this year.</div>
          </div>
        {/if}
      </div>

      <div class="sim-section-title">Current Balances</div>
      <div class="sim-cards">
        <div class="sim-card">
          <div class="label">Current Expense</div>
          <div class="value">{formatLakh(currentExpense())} Lakh</div>
          <div class="meta">{formatCurrency(currentExpense())}</div>
        </div>
        {#each balances as bal, idx}
          <div class="sim-card" style={`border-top: 3px solid ${chartColors[idx % chartColors.length]};`}>
            <div class="label">{buckets[idx].name}</div>
            <div class="value">{formatLakh(bal)} Lakh</div>
            <div class="meta">{formatCurrency(bal)}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="sim-panel">
      <div class="sim-section-title">Bucket Balances Over Years</div>
      {#if hasHistory}
        <div class="sim-chart">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            <g>
              <line x1={chartPadding.left} y1={chartPadding.top} x2={chartPadding.left} y2={chartHeight - chartPadding.bottom} stroke="#e5e7eb" />
              <line x1={chartPadding.left} y1={chartHeight - chartPadding.bottom} x2={chartWidth - chartPadding.right} y2={chartHeight - chartPadding.bottom} stroke="#e5e7eb" />
              <text x={chartPadding.left} y={chartPadding.top - 4} class="axis-label">{formatLakh(chartMax)} Lakh</text>
              <text x={chartPadding.left} y={chartHeight - 8} class="axis-label">{formatLakh(chartMin)} Lakh</text>
            </g>
            <path d={pathFor(totalSeries)} class="total-line" />
            {#each chartSeries as series}
              <path d={pathFor(series.values)} stroke={series.color} class="bucket-line" />
            {/each}
          </svg>
          <div class="sim-legend">
            <span class="sim-legend-item"><span class="dot total"></span>Total Corpus</span>
            {#each chartSeries as series}
              <span class="sim-legend-item"><span class="dot" style={`background: ${series.color}`}></span>{series.label}</span>
            {/each}
          </div>
        </div>
      {:else}
        <div class="sim-empty">No data yet. Click Next Year to begin.</div>
      {/if}
    </div>
  </div>

  <div class="sim-panel">
    <div class="sim-section-title">Balances / Returns by Year</div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th rowspan="2">Year</th>
            <th colspan={buckets.length} class="center">Returns (%)</th>
            <th colspan={buckets.length} class="center">End Value (Lakh)</th>
            <th rowspan="2">Total (Lakh)</th>
          </tr>
          <tr>
            {#each buckets as bucket}
              <th class="center">{bucket.name}</th>
            {/each}
            {#each buckets as bucket}
              <th class="center">{bucket.name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#if !hasHistory}
            <tr>
              <td colspan={1 + buckets.length * 2 + 1} class="meta">No years yet. Click Next Year.</td>
            </tr>
          {/if}
          {#each [...history].reverse() as row}
            <tr>
              <td>{row.year}</td>
              {#each row.returnsAmt as ret, idx}
                <td class:negative={ret < 0}>{returnPercent(row, idx)}</td>
              {/each}
              {#each row.endValues as val}
                <td class:negative={val < 0}>{Math.round(val / 100000).toLocaleString("en-IN")}</td>
              {/each}
              <td>{Math.round(row.total / 100000).toLocaleString("en-IN")}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<style>
  .sim-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .sim-tabs button {
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 6px;
  }

  .sim-tabs button.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  .sim-tabs button.danger {
    color: #b42318;
  }

  .sim-grid {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 12px;
  }

  .sim-grid-wide {
    grid-template-columns: 1.4fr 1fr;
  }

  .sim-panel {
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 10px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .sim-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .sim-form label,
  .sim-transfer label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
  }

  .sim-form input,
  .sim-transfer input,
  .sim-transfer select,
  .sim-bucket-row input {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
  }

  .sim-checkbox {
    grid-column: span 2;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text);
  }

  .sim-section {
    margin-top: 12px;
    display: grid;
    gap: 10px;
  }

  .sim-section-title {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .sim-bucket-table {
    display: grid;
    gap: 6px;
  }

  .sim-bucket-head,
  .sim-bucket-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 8px;
    align-items: center;
  }

  .sim-bucket-head {
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .sim-allocation {
    font-size: 12px;
    color: var(--muted);
  }

  .sim-allocation span {
    margin-left: 4px;
    font-weight: 600;
    color: #16a34a;
  }

  .sim-allocation span.bad {
    color: #b42318;
  }

  .sim-help h2 {
    font-size: 14px;
    margin-bottom: 6px;
  }

  .sim-help-grid {
    display: grid;
    gap: 10px;
    margin: 10px 0;
  }

  .sim-help-title {
    font-weight: 600;
    font-size: 12px;
  }

  .sim-help-text {
    font-size: 12px;
    color: var(--muted);
  }

  .sim-tip {
    margin-top: 10px;
    padding: 8px;
    background: var(--panel-muted);
    border-radius: 6px;
    font-size: 12px;
  }

  .sim-controls {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 10px;
    align-items: center;
  }

  .sim-stat {
    background: var(--panel-muted);
    border-radius: 8px;
    padding: 10px;
  }

  .sim-stat .label {
    font-size: 11px;
    color: var(--muted);
  }

  .sim-stat .value {
    font-size: 16px;
    font-weight: 600;
  }

  .sim-next {
    border: none;
    background: var(--accent);
    color: white;
    padding: 16px 20px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 10px;
  }

  .sim-returns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    font-size: 12px;
  }

  .sim-returns .label {
    color: var(--muted);
  }

  .sim-returns .value {
    font-weight: 600;
  }

  .sim-transfer {
    margin-top: 10px;
    display: grid;
    gap: 8px;
  }

  .sim-transfer-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    gap: 8px;
    align-items: end;
  }

  .sim-pending {
    background: #fff1f2;
    border: 1px solid #fecdd3;
    padding: 8px;
    border-radius: 6px;
  }

  .sim-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
  }

  .sim-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    background: var(--panel-muted);
  }

  .sim-card .label {
    font-size: 11px;
    color: var(--muted);
  }

  .sim-card .value {
    font-size: 16px;
    font-weight: 600;
  }

  .sim-card .meta {
    font-size: 11px;
    color: var(--muted);
  }

  .sim-chart {
    display: grid;
    gap: 10px;
  }

  .sim-chart svg {
    width: 100%;
    height: 260px;
  }

  .bucket-line {
    fill: none;
    stroke-width: 2;
    opacity: 0.8;
  }

  .total-line {
    fill: none;
    stroke: #111827;
    stroke-width: 3;
  }

  .sim-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 11px;
    color: var(--muted);
  }

  .sim-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--accent);
  }

  .dot.total {
    background: #111827;
  }

  .axis-label {
    font-size: 10px;
    fill: var(--muted);
  }

  .sim-empty {
    padding: 12px;
    font-size: 12px;
    color: var(--muted);
  }

  .center {
    text-align: center;
  }

  @media (max-width: 900px) {
    .sim-grid,
    .sim-grid-wide,
    .sim-controls {
      grid-template-columns: 1fr;
    }

    .sim-transfer-row {
      grid-template-columns: 1fr;
    }
  }
</style>
