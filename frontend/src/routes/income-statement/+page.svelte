<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import Table from "$lib/components/Table.svelte";
  import { toPeriodParam } from "$lib/period";
  import { formatInr } from "$lib/format";

  let period = "current_month";
  let startDate = "";
  let endDate = "";
  let showZero = false;
  let data = null;
  let error = "";
  let ready = false;

  function flatten(nodes) {
    const rows = [];
    nodes.forEach((node) => {
      rows.push({
        name: node.account.path || node.account.name,
        type: node.account.account_type,
        balance: node.balance,
        accountId: node.account.id
      });
      node.children?.forEach((child) => {
        rows.push({
          name: child.account.path || child.account.name,
          type: child.account.account_type,
          balance: child.balance,
          accountId: child.account.id
        });
        child.children?.forEach((gc) => {
          rows.push({
            name: gc.account.path || gc.account.name,
            type: gc.account.account_type,
            balance: gc.balance,
            accountId: gc.account.id
          });
        });
      });
    });
    return rows;
  }

  async function load() {
    try {
      error = "";
      const p = toPeriodParam(period, startDate, endDate);
      data = await apiGet(`/reports/income-statement?period=${p}&show_zero=${showZero ? "1" : "0"}`);
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
    showZero;
    load();
  }

  const columns = [
    {
      header: "Account",
      render: (row) => `<a href="/journal-entries?account_id=${row.accountId}&period=${toPeriodParam(
        period,
        startDate,
        endDate
      )}">${row.name}</a>`
    },
    { header: "Type", render: (row) => row.type },
    { header: "Balance", render: (row) => formatInr(row.balance), align: "right" }
  ];
</script>

<h1 class="page-title">Income Statement</h1>
<p class="page-subtitle">Income and expense performance for the selected period.</p>

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
  <label>
    <input type="checkbox" bind:checked={showZero} />
    &nbsp;Show Zero Balances
  </label>
  <span class="meta">Net Income: {data ? formatInr(data.net_income) : "--"}</span>
</div>

<div class="panel">
  <div class="panel-row">
    <span class="panel-label">Net Income</span>
    <span class="panel-value">{data ? formatInr(data.net_income) : "--"}</span>
  </div>
  <div class="panel-row">
    <span class="panel-label">Income</span>
    <span class="panel-value">{data ? formatInr(data.total_income) : "--"}</span>
  </div>
  <div class="panel-row">
    <span class="panel-label">Expenses</span>
    <span class="panel-value">{data ? formatInr(data.total_expenses) : "--"}</span>
  </div>
</div>

<Table
  {columns}
  rows={data ? [
    ...flatten(data.income_accounts),
    ...flatten(data.expense_accounts)
  ] : []}
  allowHtml={true}
/>
