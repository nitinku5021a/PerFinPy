<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { formatInr } from "$lib/format";

  let summary = null;
  let networth = null;
  let error = "";

  onMount(async () => {
    try {
      const [summaryData, networthData] = await Promise.all([
        apiGet("/dashboard"),
        apiGet("/reports/networth?period=all&show_zero=0")
      ]);
      summary = summaryData;
      networth = networthData;
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  });
</script>

<h1 class="page-title">Dashboard</h1>
<p class="page-subtitle">Snapshot of your financial position.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="panel">
  <div class="panel-row">
    <span class="panel-label">Total Entries</span>
    <span class="panel-value">{summary ? summary.total_entries : "--"}</span>
  </div>
  <div class="panel-row">
    <span class="panel-label">Total Accounts</span>
    <span class="panel-value">{summary ? summary.total_accounts : "--"}</span>
  </div>
  <div class="panel-row">
    <span class="panel-label">Net Income</span>
    <span class="panel-value">{networth ? formatInr(networth.net_income) : "--"}</span>
  </div>
</div>

<div class="panel">
  <div class="panel-row">
    <span class="panel-label">Assets</span>
    <span class="panel-value">{networth ? formatInr(networth.total_assets) : "--"}</span>
  </div>
  <div class="panel-row">
    <span class="panel-label">Liabilities</span>
    <span class="panel-value">{networth ? formatInr(networth.total_liabilities) : "--"}</span>
  </div>
  <div class="panel-row">
    <span class="panel-label">Equity</span>
    <span class="panel-value">{networth ? formatInr(networth.total_equity) : "--"}</span>
  </div>
</div>
