<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import Table from "$lib/components/Table.svelte";
  import { toPeriodParam } from "$lib/period";
  import { formatInr } from "$lib/format";

  let period = "all";
  let startDate = "";
  let endDate = "";
  let data = null;
  let error = "";
  let ready = false;

  async function load() {
    try {
      error = "";
      const p = toPeriodParam(period, startDate, endDate);
      data = await apiGet(`/reports/trial-balance?period=${p}`);
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
</script>

<h1 class="page-title">Trial Balance</h1>
<p class="page-subtitle">Ledger validation view showing debits and credits.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="toolbar">
  <label>
    Period:&nbsp;
    <select bind:value={period}>
      <option value="all">All</option>
      <option value="ytd">Year to Date</option>
      <option value="current_month">Current Month</option>
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
  <span class="meta">
    Debits: {data ? formatInr(data.total_debits) : "--"} | Credits:{" "}
    {data ? formatInr(data.total_credits) : "--"}
  </span>
</div>

<div class="panel">
  <div class="panel-row">
    <span class="panel-label">Balance Check</span>
    <span class="panel-value">
      {data ? formatInr(data.total_debits - data.total_credits) : "--"}
    </span>
  </div>
  <div class="panel-row">
    <span class="panel-label">Note</span>
    <span class="panel-value">Click an account to see journal entries.</span>
  </div>
</div>

<Table {columns} rows={data ? data.account_balances : []} allowHtml={true} />
