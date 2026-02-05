<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { formatInr } from "$lib/format";
  import ReportStatCard from "$lib/components/ReportStatCard.svelte";
  import SmartTable from "$lib/components/SmartTable.svelte";
  import { getMonthlyNetWorth, getMonthlySavings } from "$lib/financeMetrics";
  import {
    getInvestmentAccounts,
    getMonthlyPortfolioValues,
    getMonthlyInvestmentFlows,
    getMonthlyPerformance
  } from "$lib/investmentMetrics";

  let error = "";
  let loading = true;

  let networthSeries = [];
  let savingsSeries = [];
  let investmentReturnPct = null;

  let networthRows = [];
  let savingsRows = [];
  let investmentRows = [];

  let insightLines = [];

  function labelForMonth(key) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  }

  function pctLabel(value) {
    if (value === null || value === undefined) return "--";
    const sign = value >= 0 ? "↑" : "↓";
    return `${sign} ${Math.abs(value).toFixed(2)}%`;
  }

  function mergeBalances(target, groups, equityTotals) {
    for (const group of groups || []) {
      if (group.group === "Equity") {
        const monthly = group.monthly_balances || {};
        for (const key of Object.keys(monthly)) {
          equityTotals[key] = Number(monthly[key] || 0);
        }
      }
      for (const parent of group.parents || []) {
        if (parent.account_id) {
          const parentId = String(parent.account_id);
          if (!target[parentId]) target[parentId] = {};
          const parentMonthly = parent.monthly_balances || {};
          for (const key of Object.keys(parentMonthly)) {
            target[parentId][key] = Number(parentMonthly[key] || 0);
          }
        }
        for (const acc of parent.accounts || []) {
          const id = String(acc.account_id);
          if (!target[id]) target[id] = {};
          const monthly = acc.monthly_balances || {};
          for (const key of Object.keys(monthly)) {
            target[id][key] = Number(monthly[key] || 0);
          }
        }
      }
    }
  }

  onMount(async () => {
    loading = true;
    try {
      const [networthRes, savingsRes, accountsRes] = await Promise.all([
        apiGet("/reports/networth-monthly"),
        apiGet("/reports/net-savings-series"),
        apiGet("/transactions/accounts")
      ]);
      networthSeries = networthRes?.months || [];
      savingsSeries = savingsRes?.months || [];

      const networthMetrics = getMonthlyNetWorth(networthSeries, 13);
      const savingsMetrics = getMonthlySavings(savingsSeries);

      const networthLatest = networthMetrics.latest?.networth ?? null;
      const networthPrevYear =
        networthMetrics.series.length >= 13 ? networthMetrics.series[networthMetrics.series.length - 13].networth : null;
      const networthYoYPct =
        networthLatest !== null && networthPrevYear && Math.abs(networthPrevYear) > 0.00001
          ? ((networthLatest - networthPrevYear) / Math.abs(networthPrevYear)) * 100
          : null;

      const avgMonthlySaving = savingsMetrics.avgPrev12Saving;
      const savingsPct = savingsMetrics.savingPctOfIncome;

      const accounts = accountsRes?.accounts || [];
      const investmentAccounts = getInvestmentAccounts(accounts);
      const investmentLeaf = investmentAccounts.filter((acc) => acc.is_leaf);
      const investmentIds = investmentLeaf.map((acc) => acc.id);

      const matrixA = await apiGet("/reports/networth-matrix");
      const monthsA = matrixA?.months || [];
      const startPrev = monthsA.length > 1 ? monthsA[1] : null;
      const matrixB = startPrev ? await apiGet(`/reports/networth-matrix?start=${startPrev}`) : null;
      const monthsB = matrixB?.months || [];

      const allMonths = Array.from(new Set([...(monthsA || []), ...(monthsB || [])])).sort();
      const last13 = allMonths.slice(-13);

      const balancesByAccountId = {};
      const equityTotals = {};
      mergeBalances(balancesByAccountId, matrixA?.groups || [], equityTotals);
      mergeBalances(balancesByAccountId, matrixB?.groups || [], equityTotals);

      const flowsRes = await apiGet(`/reports/investment-flows?account_ids=${investmentIds.join(",")}`);
      const flowMonths = flowsRes?.months || [];

      const portfolioValues = getMonthlyPortfolioValues(last13, balancesByAccountId, investmentIds);
      const flows = getMonthlyInvestmentFlows(last13, flowMonths);
      const performance = getMonthlyPerformance(portfolioValues, flows);
      investmentReturnPct = performance.overall_return_pct;

      networthRows = networthMetrics.series
        .slice(-12)
        .slice()
        .reverse()
        .map((item) => ({
        month: item.month,
        networth: item.networth,
        delta: item.delta
      }));

      savingsRows = savingsSeries
        .slice(-12)
        .slice()
        .reverse()
        .map((item) => ({
        month: item.month,
        income: item.income,
        expense: item.expense,
        net: item.net_savings
      }));

      investmentRows = performance.rows
        .slice()
        .reverse()
        .map((row) => ({
          month: row.month,
          start: row.start_value,
          invested: row.net_invested,
          end: row.end_value,
          returnPct: row.return_pct
        }));

      insightLines = [
        `Over the last year, net worth moved ${networthYoYPct === null ? "sideways" : `by ${networthYoYPct.toFixed(2)}%`}.`,
        `Monthly savings averaged ${avgMonthlySaving === null ? "--" : `₹${formatInr(avgMonthlySaving)}`}.`,
        `Savings represented ${savingsPct === null ? "--" : `${savingsPct.toFixed(1)}%`} of monthly income.`,
        `Investment portfolio delivered ${investmentReturnPct === null ? "--" : `${investmentReturnPct.toFixed(2)}%`} value growth over the period.`,
        `Net worth is currently ${networthLatest === null ? "--" : `₹${formatInr(networthLatest)}`}.`
      ];
    } catch (err) {
      error = err && err.message ? err.message : "Failed to load.";
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-10">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold text-gray-900 sm:text-4xl">Wealth Report</h1>
    <p class="text-sm text-gray-500">An investor-letter style summary of your personal balance sheet.</p>
  </header>

  {#if error}
    <p class="text-sm font-semibold text-rose-600">{error}</p>
  {/if}

  {#if loading}
    <p class="text-sm text-gray-400">Preparing your report...</p>
  {:else}
    <section class="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <ReportStatCard
        label="Current Net Worth"
        value={networthSeries.length ? formatInr(networthSeries[networthSeries.length - 1].networth) : "--"}
        trend={pctLabel(getMonthlyNetWorth(networthSeries, 13).annualizedGrowthPct)}
        trendClass={getMonthlyNetWorth(networthSeries, 13).annualizedGrowthPct >= 0 ? "text-emerald-600" : "text-rose-600"}
      />
      <ReportStatCard
        label="1 Year Growth"
        value={pctLabel(
          networthSeries.length >= 13
            ? ((networthSeries[networthSeries.length - 1].networth -
                networthSeries[networthSeries.length - 13].networth) /
                Math.abs(networthSeries[networthSeries.length - 13].networth || 1)) *
                100
            : null
        )}
      />
      <ReportStatCard
        label="Avg Monthly Saving"
        value={getMonthlySavings(savingsSeries).avgPrev12Saving !== null
          ? formatInr(getMonthlySavings(savingsSeries).avgPrev12Saving)
          : "--"}
      />
      <ReportStatCard
        label="Portfolio Return"
        value={investmentReturnPct === null ? "--" : `${investmentReturnPct.toFixed(2)}%`}
        trend={investmentReturnPct === null ? "" : investmentReturnPct >= 0 ? "Positive" : "Negative"}
        trendClass={investmentReturnPct >= 0 ? "text-emerald-600" : "text-rose-600"}
      />
    </section>

    <section class="rounded-2xl bg-white p-8 shadow-lg">
      <h2 class="text-lg font-semibold text-gray-900">Executive Summary</h2>
      <div class="mt-4 space-y-2 text-sm leading-relaxed text-gray-600">
        {#each insightLines as line}
          <p>{line}</p>
        {/each}
      </div>
    </section>

    <section class="space-y-8">
      <SmartTable
        title="Month-wise Net Worth"
        columns={[
          { header: "Month", render: (row) => labelForMonth(row.month) },
          { header: "Net Worth", align: "right", render: (row) => formatInr(row.networth) },
          {
            header: "MoM Delta",
            align: "right",
            render: (row) => (row.delta === null || row.delta === undefined ? "--" : formatInr(row.delta))
          }
        ]}
        rows={networthRows}
      />

      <SmartTable
        title="Month-wise Savings"
        columns={[
          { header: "Month", render: (row) => labelForMonth(row.month) },
          { header: "Income", align: "right", render: (row) => formatInr(row.income) },
          { header: "Expense", align: "right", render: (row) => formatInr(row.expense) },
          { header: "Net Savings", align: "right", render: (row) => formatInr(row.net) }
        ]}
        rows={savingsRows}
      />

      <SmartTable
        title="Investment Performance"
        columns={[
          { header: "Month", render: (row) => labelForMonth(row.month) },
          { header: "Start", align: "right", render: (row) => formatInr(row.start) },
          { header: "Net Invested", align: "right", render: (row) => formatInr(row.invested) },
          { header: "End", align: "right", render: (row) => formatInr(row.end) },
          {
            header: "Return %",
            align: "right",
            render: (row) =>
              row.returnPct === null
                ? "--"
                : `<span class=\"${row.returnPct >= 0 ? "text-emerald-600" : "text-rose-600"}\">${row.returnPct.toFixed(
                    2
                  )}%</span>`
          }
        ]}
        rows={investmentRows}
      />
    </section>
  {/if}
</div>
