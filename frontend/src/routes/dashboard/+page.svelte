<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import NetWorthGrowthPanel from "$lib/components/NetWorthGrowthPanel.svelte";
  import MonthlySavingPanel from "$lib/components/MonthlySavingPanel.svelte";
  import CashFlowFlowDiagram from "$lib/components/CashFlowFlowDiagram.svelte";

  /** @type {import("$lib/financeMetrics").NetWorthMonthlyPoint[]} */
  let networthMonthly = [];
  /** @type {import("$lib/financeMetrics").SavingsMonthlyPoint[]} */
  let savingsMonthly = [];
  let error = "";

  onMount(async () => {
    try {
      const [networthSeries, savingsSeries] = await Promise.all([
        apiGet("/reports/networth-monthly"),
        apiGet("/reports/net-savings-series")
      ]);
      networthMonthly = networthSeries?.months || [];
      savingsMonthly = savingsSeries?.months || [];
    } catch (err) {
      error = err && err.message ? err.message : "Failed to load.";
    }
  });
</script>

<div class="space-y-8">
  <div class="space-y-2">
    <h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
    <p class="text-sm text-gray-500">Financial intelligence from your ledger activity.</p>
  </div>

  {#if error}
    <p class="text-sm font-semibold text-rose-600">{error}</p>
  {/if}

  <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
    <NetWorthGrowthPanel series={networthMonthly} />
    <MonthlySavingPanel series={savingsMonthly} />
    <div class="lg:col-span-2">
      <CashFlowFlowDiagram />
    </div>
  </div>
</div>
