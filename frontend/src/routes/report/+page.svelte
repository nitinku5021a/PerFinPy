<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { formatInr } from "$lib/format";

  let loading = true;
  let error = "";
  let monthRows = [];
  let yearRows = [];
  let viewMode = "year_month";
  let expandedYears = new Set();

  function formatMoney(value) {
    const num = Number(value || 0);
    const prefix = num < 0 ? "-" : "";
    return `${prefix}${formatInr(Math.abs(num))}`;
  }

  function formatMoneyAbs(value) {
    const num = Number(value || 0);
    return `${formatInr(Math.abs(num))}`;
  }

  function monthName(monthNumber) {
    const dt = new Date(2000, Number(monthNumber) - 1, 1);
    return dt.toLocaleString("en-US", { month: "long" });
  }

  function formatPct(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
    return `${Number(value).toFixed(2)}%`;
  }

  function formatChange(amount, pct) {
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "--";
    if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return "--";
    return `${formatMoneyAbs(amount)} (${formatPct(Math.abs(pct))})`;
  }

  function changeClass(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "";
  }

  function toggleYear(year) {
    const next = new Set(expandedYears);
    if (next.has(year)) {
      next.delete(year);
    } else {
      next.add(year);
    }
    expandedYears = next;
  }

  onMount(async () => {
    loading = true;
    try {
      const payload = await apiGet("/reports/expense-income-asset");
      monthRows = payload?.months || [];
      yearRows = payload?.years || [];
      expandedYears = new Set((payload?.years || []).map((row) => row.year));
    } catch (err) {
      error = err?.message || "Failed to load report data.";
    } finally {
      loading = false;
    }
  });

  $: enrichedYearRows = (() => {
    const rows = (yearRows || []).map((row) => ({ ...row, asset_yoy_change: null }));
    const sortedAsc = [...rows].sort((a, b) => a.year - b.year);
    for (let i = 1; i < sortedAsc.length; i += 1) {
      const row = sortedAsc[i];
      const prev = sortedAsc[i - 1];
      row.asset_yoy_change = row.max_asset - prev.max_asset;
    }
    return rows;
  })();

  $: yearSummaryByYear = Object.fromEntries((enrichedYearRows || []).map((row) => [row.year, row]));

  $: enrichedMonthRows = (() => {
    const rows = (monthRows || []).map((row) => ({
      ...row,
      asset_mom_change: null,
      asset_yoy_change: null
    }));
    const byKey = new Map(
      rows.map((row) => [`${row.year}-${String(row.month_number).padStart(2, "0")}`, row])
    );
    const sortedAsc = [...rows].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month_number - b.month_number;
    });
    for (let i = 0; i < sortedAsc.length; i += 1) {
      const row = sortedAsc[i];
      if (i > 0) {
        const prev = sortedAsc[i - 1];
        row.asset_mom_change = row.max_asset - prev.max_asset;
      }
      const prevKey = `${row.year - 1}-${String(row.month_number).padStart(2, "0")}`;
      const prevYearRow = byKey.get(prevKey);
      if (prevYearRow) {
        row.asset_yoy_change = row.max_asset - prevYearRow.max_asset;
      }
    }
    return rows;
  })();

  $: grouped = (() => {
    const groupedMap = new Map();
    const sortedMonths = [...(enrichedMonthRows || [])].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month_number - a.month_number;
    });
    for (const row of sortedMonths) {
      if (!groupedMap.has(row.year)) {
        groupedMap.set(row.year, []);
      }
      groupedMap.get(row.year).push(row);
    }
    return [...groupedMap.entries()].map(([year, months]) => ({
      year,
      months,
      summary: yearSummaryByYear[year]
    }));
  })();
</script>

<h1 class="page-title">Report</h1>
<p class="page-subtitle">Month-wise and year-wise summary for Income, Expense and Asset.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="toolbar">
  <label for="view-mode">Grouping</label>
  <select id="view-mode" bind:value={viewMode}>
    <option value="year_month">Year + Month</option>
    <option value="year_only">Year Only</option>
  </select>
</div>

<p class="meta" title="Color legend for change values">
  <span class="positive">Green = positive change</span> · <span class="negative">Red = negative change</span>
</p>

{#if loading}
  <p class="meta">Loading report...</p>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Row Labels</th>
          <th class="num">Sum of Income</th>
          <th class="num">Sum of Expense</th>
          <th class="num">Max of Asset</th>
          <th class="num">Rolling Avg. Expense (12M)</th>
          <th class="num">Asset MoM Change (%)</th>
          <th class="num">Asset YoY (Same Month) Change (%)</th>
          <th class="num">Saving % of Income</th>
          <th class="num">Saving % of Expense</th>
        </tr>
      </thead>
      <tbody>
        {#if grouped.length === 0}
          <tr>
            <td colspan="9" class="meta">No report data available.</td>
          </tr>
        {/if}

        {#each grouped as yearGroup}
          <tr class="group-row report-year-row">
            <td>
              {#if viewMode === "year_month"}
                <button class="button" on:click={() => toggleYear(yearGroup.year)}>
                  {expandedYears.has(yearGroup.year) ? "▾" : "▸"} {yearGroup.year}
                </button>
              {:else}
                {yearGroup.year}
              {/if}
            </td>
            <td class="num">{formatMoney(yearGroup.summary?.sum_income || 0)}</td>
            <td class="num">{formatMoney(yearGroup.summary?.sum_expense || 0)}</td>
            <td class="num">{formatMoney(yearGroup.summary?.max_asset || 0)}</td>
            <td class="num">--</td>
            <td class="num">--</td>
            <td class={`num ${changeClass(yearGroup.summary?.asset_yoy_change)}`}>
              {formatChange(
                yearGroup.summary?.asset_yoy_change,
                yearGroup.summary?.asset_yoy_change_pct
              )}
            </td>
            <td class="num">{formatPct(yearGroup.summary?.savings_pct_income)}</td>
            <td class="num">{formatPct(yearGroup.summary?.savings_pct_expense)}</td>
          </tr>

          {#if viewMode === "year_month" && expandedYears.has(yearGroup.year)}
            {#each yearGroup.months as month}
              <tr>
                <td style="padding-left: 24px;">{monthName(month.month_number)}</td>
                <td class="num">{formatMoney(month.sum_income)}</td>
                <td class="num">{formatMoney(month.sum_expense)}</td>
                <td class="num">{formatMoney(month.max_asset)}</td>
                <td class="num">{formatMoney(month.rolling_avg_expense)}</td>
                <td class={`num ${changeClass(month.asset_mom_change)}`}>
                  {formatChange(month.asset_mom_change, month.asset_mom_change_pct)}
                </td>
                <td class={`num ${changeClass(month.asset_yoy_change)}`}>
                  {formatChange(month.asset_yoy_change, month.asset_yoy_change_pct)}
                </td>
                <td class="num">{formatPct(month.savings_pct_income)}</td>
                <td class="num">{formatPct(month.savings_pct_expense)}</td>
              </tr>
            {/each}
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
{/if}
