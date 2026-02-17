<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { formatInr } from "$lib/format";
  import { getInvestmentAccounts } from "$lib/investmentMetrics";

  let error = "";
  let loading = true;
  let months = [];
  let rows = [];
  let equityGroupBalances = {};

  function labelForMonth(key) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  }

  function annualizedGrowthPct(current, prev) {
    if (!prev || Math.abs(prev) < 0.00001) return null;
    const monthlyGrowth = (current - prev) / prev;
    return (Math.pow(1 + monthlyGrowth, 12) - 1) * 100;
  }

  function mergeBalances(target, groups) {
    for (const group of groups || []) {
      if (group.group === "Equity") {
        const monthly = group.monthly_balances || {};
        for (const key of Object.keys(monthly)) {
          equityGroupBalances[key] = Number(monthly[key] || 0);
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
      const accountsRes = await apiGet("/transactions/accounts");
      const accounts = accountsRes?.accounts || [];
      const investmentAccounts = getInvestmentAccounts(accounts);
      const investmentIds = investmentAccounts.map((acc) => acc.id);
      const nameById = Object.fromEntries(
        investmentAccounts.map((acc) => [String(acc.id), acc.path || acc.name])
      );

      const matrixA = await apiGet("/reports/networth-matrix");
      const monthsA = matrixA?.months || [];
      const startPrev = monthsA.length > 1 ? monthsA[1] : null;
      const matrixB = startPrev ? await apiGet(`/reports/networth-matrix?start=${startPrev}`) : null;
      const monthsB = matrixB?.months || [];

      const allMonths = Array.from(new Set([...(monthsA || []), ...(monthsB || [])])).sort();
      const last13 = allMonths.slice(-13);
      const displayMonthsAsc = last13.slice(1);

      const balancesByAccountId = {};
      equityGroupBalances = {};
      mergeBalances(balancesByAccountId, matrixA?.groups || []);
      mergeBalances(balancesByAccountId, matrixB?.groups || []);

      const rowsData = investmentIds
        .map((id) => {
          const key = String(id);
          const balances = balancesByAccountId[key] || {};
          const series = last13.map((m) => Number(balances[m] || 0));
          const displayAsc = displayMonthsAsc.map((m, idx) => {
            const current = series[idx + 1];
            const prev = series[idx];
            return {
              month: m,
              value: current,
              growth: annualizedGrowthPct(current, prev)
            };
          });
          const display = displayAsc.slice().reverse();
          return {
            id: key,
            name: nameById[key] || `Account ${key}`,
            display
          };
        })
        .concat([
          {
            id: "group:Equity",
            name: "Equity (Group)",
            display: displayMonthsAsc
              .map((m, idx) => {
                const current = Number(equityGroupBalances[m] || 0);
                const prevMonth = idx === 0 ? last13[0] : displayMonthsAsc[idx - 1];
                const prev = Number(equityGroupBalances[prevMonth] || 0);
                return {
                  month: m,
                  value: current,
                  growth: annualizedGrowthPct(current, prev)
                };
              })
              .reverse()
          }
        ])
        .filter((row) => row.display.some((cell) => Math.abs(cell.value) > 0.00001))
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

      months = displayMonthsAsc.slice().reverse();
      rows = rowsData;
    } catch (err) {
      error = err && err.message ? err.message : "Failed to load.";
    } finally {
      loading = false;
    }
  });
</script>

<h1 class="page-title">Investments</h1>
<p class="page-subtitle">Monthly performance for Equity and Mutual Fund accounts (annualized).</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

{#if loading}
  <p class="meta">Loading investment performance...</p>
{:else}
  <div class="matrix-wrap">
    <table class="matrix-table">
      <thead>
        <tr>
          <th class="sticky-col sticky-col-1">Account</th>
          {#each months as month}
            <th class="num">{labelForMonth(month)}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr>
            <td class="sticky-col sticky-col-1">{row.name}</td>
            {#each row.display as cell}
              <td class="num">
                {formatInr(cell.value)}
                {#if cell.growth !== null}
                  <span class={`meta ${cell.growth >= 0 ? "positive" : "negative"}`}>
                    ({cell.growth >= 0 ? "↑" : "↓"} {Math.abs(cell.growth).toFixed(2)}%)
                  </span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
