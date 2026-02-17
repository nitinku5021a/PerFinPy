<script>
  import { onMount } from "svelte";
  import { apiGet, apiPost } from "$lib/api";
  import FinancialFreedomClockPanel from "$lib/components/FinancialFreedomClockPanel.svelte";
  import NetWorthGrowthPanel from "$lib/components/NetWorthGrowthPanel.svelte";
  import NetWorthTargetPanel from "$lib/components/NetWorthTargetPanel.svelte";
  import MonthlySavingPanel from "$lib/components/MonthlySavingPanel.svelte";

  /** @type {import("$lib/financeMetrics").NetWorthMonthlyPoint[]} */
  let networthMonthly = [];
  /** @type {import("$lib/financeMetrics").SavingsMonthlyPoint[]} */
  let savingsMonthly = [];
  let freedomSnapshot = null;
  let refreshing = false;
  let refreshKey = 0;
  let error = "";

  function applyDashboardPayload(payload) {
    networthMonthly = payload?.networth_monthly?.months || [];
    savingsMonthly = payload?.net_savings_series?.months || [];
    freedomSnapshot = payload?.freedom_clock || null;
  }

  async function loadDashboard() {
    try {
      const payload = await apiGet("/reports/dashboard-panels");
      applyDashboardPayload(payload);
    } catch (err) {
      error = err && err.message ? err.message : "Failed to load.";
    }
  }

  async function refreshDashboard() {
    refreshing = true;
    error = "";
    try {
      const payload = await apiPost("/reports/dashboard-panels/refresh", {});
      applyDashboardPayload(payload);
      refreshKey += 1;
    } catch (err) {
      error = err && err.message ? err.message : "Failed to refresh.";
    } finally {
      refreshing = false;
    }
  }

  onMount(loadDashboard);
</script>

<div class="space-y-8">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p class="text-sm text-gray-500">Financial intelligence from your ledger activity.</p>
    </div>
    <button
      class="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
      on:click={refreshDashboard}
      disabled={refreshing}
    >
      {refreshing ? "Refreshing..." : "Refresh all"}
    </button>
  </div>

  {#if error}
    <p class="text-sm font-semibold text-rose-600">{error}</p>
  {/if}

  <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
    <div class="lg:col-span-2">
      <FinancialFreedomClockPanel snapshot={freedomSnapshot} loading={refreshing} refreshKey={refreshKey} />
    </div>
    <div class="lg:col-span-2">
      <NetWorthTargetPanel series={networthMonthly} savingsSeries={savingsMonthly} />
    </div>
    <NetWorthGrowthPanel series={networthMonthly} />
    <MonthlySavingPanel series={savingsMonthly} />
  </div>
</div>
