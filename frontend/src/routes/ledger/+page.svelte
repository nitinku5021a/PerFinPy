<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { toPeriodParam } from "$lib/period";
  import { formatInr } from "$lib/format";
  import Table from "$lib/components/Table.svelte";

  let period = "current_month";
  let startDate = "";
  let endDate = "";
  let trial = null;
  let income = null;
  let error = "";
  let ready = false;

  const columns = [
    {
      header: "Account",
      render: (row) => `<a href="/journal-entries?account_id=${row.account.id}&period=${toPeriodParam(
        period,
        startDate,
        endDate
      )}">${row.account.path || row.account.name}</a>`
    },
    { header: "Type", render: (row) => row.account.account_type },
    { header: "Debit/Credit", render: (row) => row.type },
    { header: "Balance", render: (row) => formatInr(row.balance), align: "right" }
  ];

  async function load() {
    try {
      error = "";
      const [trialData, incomeData] = await Promise.all([
        apiGet(`/reports/trial-balance?period=${toPeriodParam(period, startDate, endDate)}`),
        apiGet(`/reports/income-statement?period=${toPeriodParam(period, startDate, endDate)}`)
      ]);
      trial = trialData;
      income = incomeData;
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  }

  onMount(() => {
    ready = true;
  });
  $: if (ready) {
    period;
    startDate;
    endDate;
    load();
  }
</script>

<h1 class="page-title">Ledger</h1>
<p class="page-subtitle">Trial balance and income statement summary.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="toolbar">
  <label>
    Period:&nbsp;
    <select bind:value={period}>
      <option value="current_month">Current Month</option>
      <option value="ytd">Year to Date</option>
      <option value="all">All</option>
      <option value="custom">Custom Range</option>
    </select>
  </label>
  {#if period === "custom"}
    <label>
      Start:&nbsp;
      <input type="date" bind:value={startDate} />
    </label>
    <label>
      End:&nbsp;
      <input type="date" bind:value={endDate} />
    </label>
  {/if}
  <span class="meta">Net Income: {income ? formatInr(income.net_income) : "--"}</span>
</div>

<div class="panel">
  <div class="panel-row">
    <span class="panel-label">Trial Totals</span>
    <span class="panel-value">
      {trial ? formatInr(trial.total_debits) : "--"} / {trial ? formatInr(trial.total_credits) : "--"}
    </span>
  </div>
  <div class="panel-row">
    <span class="panel-label">Net Income</span>
    <span class="panel-value">{income ? formatInr(income.net_income) : "--"}</span>
  </div>
  <div class="panel-row">
    <span class="panel-label">Income vs Expense</span>
    <span class="panel-value">
      {income ? formatInr(income.total_income) : "--"} /{" "}
      {income ? formatInr(income.total_expenses) : "--"}
    </span>
  </div>
</div>

<Table {columns} rows={trial ? trial.account_balances : []} allowHtml={true} />
