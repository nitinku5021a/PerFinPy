<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { formatInr } from "$lib/format";

  let loading = true;
  let error = "";
  let monthRows = [];
  let yearRows = [];
  let breakdownOptions = [];
  let selectedBreakdownKeys = [];
  let breakdownPickerOpen = false;
  let breakdownPickerEl;
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

  function defaultBreakdownKeys() {
    return [];
  }

  function breakdownPickerLabel(options, keys) {
    if (!keys.length) return "Select leaf heads";
    const selected = (options || []).filter((item) => keys.includes(item.key));
    if (selected.length <= 2) return selected.map((item) => item.short_label).join(", ");
    return `${selected.length} selected`;
  }

  function handleDocumentClick(event) {
    if (!breakdownPickerOpen || !breakdownPickerEl) return;
    const target = event.target;
    if (target instanceof Node && !breakdownPickerEl.contains(target)) {
      breakdownPickerOpen = false;
    }
  }

  onMount(async () => {
    loading = true;
    try {
      const payload = await apiGet("/reports/expense-income-asset");
      monthRows = payload?.months || [];
      yearRows = payload?.years || [];
      breakdownOptions = payload?.breakdown_options || [];
      selectedBreakdownKeys = defaultBreakdownKeys();
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

  $: selectedBreakdowns = (breakdownOptions || []).filter((item) =>
    selectedBreakdownKeys.includes(item.key)
  );
</script>

<svelte:document on:click={handleDocumentClick} />

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

{#if breakdownOptions.length}
  <div class="toolbar report-breakdown-toolbar">
    <label for="breakdown-picker">Breakdown Columns</label>
    <details
      id="breakdown-picker"
      class="report-breakdown-dropdown"
      bind:this={breakdownPickerEl}
      bind:open={breakdownPickerOpen}
    >
      <summary>{breakdownPickerLabel(breakdownOptions, selectedBreakdownKeys)}</summary>
      <div class="report-breakdown-menu">
        <div class="report-breakdown-actions">
          <button
            class="button"
            type="button"
            on:click={() => (selectedBreakdownKeys = defaultBreakdownKeys())}
          >
            Default
          </button>
          <button
            class="button"
            type="button"
            disabled={selectedBreakdownKeys.length === breakdownOptions.length}
            on:click={() => (selectedBreakdownKeys = breakdownOptions.map((item) => item.key))}
          >
            All
          </button>
          <button
            class="button"
            type="button"
            disabled={selectedBreakdownKeys.length === 0}
            on:click={() => (selectedBreakdownKeys = [])}
          >
            Clear
          </button>
        </div>
        <div class="report-breakdown-list">
          {#each breakdownOptions as option}
            <label class="report-breakdown-option">
              <input type="checkbox" bind:group={selectedBreakdownKeys} value={option.key} />
              <span>{option.label}</span>
            </label>
          {/each}
        </div>
      </div>
    </details>
  </div>
{/if}

<p class="meta" title="Color legend for change values">
  <span class="positive">Green = positive change</span> | <span class="negative">Red = negative change</span>
</p>

{#if loading}
  <p class="meta">Loading report...</p>
{:else}
  <div class="matrix-wrap report-table-wrap">
    <table class="table matrix-table report-table">
      <thead>
        <tr>
          <th class="sticky-col sticky-col-1">Row Labels</th>
          <th class="num">Sum of Income</th>
          <th class="num">Sum of Expense</th>
          {#each selectedBreakdowns as option}
            <th class="num report-breakdown-head" title={option.label}>
              <span class="report-breakdown-type">{option.type === "income" ? "Income" : "Expense"}</span>
              <span>{option.short_label}</span>
            </th>
          {/each}
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
            <td colspan={9 + selectedBreakdowns.length} class="meta">No report data available.</td>
          </tr>
        {/if}

        {#each grouped as yearGroup}
          <tr class="group-row report-year-row">
            <td class="sticky-col sticky-col-1">
              {#if viewMode === "year_month"}
                <button class="button" on:click={() => toggleYear(yearGroup.year)}>
                  {expandedYears.has(yearGroup.year) ? "[-]" : "[+]"} {yearGroup.year}
                </button>
              {:else}
                {yearGroup.year}
              {/if}
            </td>
            <td class="num">{formatMoney(yearGroup.summary?.sum_income || 0)}</td>
            <td class="num">{formatMoney(yearGroup.summary?.sum_expense || 0)}</td>
            {#each selectedBreakdowns as option}
              <td class="num">{formatMoney(yearGroup.summary?.breakdowns?.[option.key] || 0)}</td>
            {/each}
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
                <td class="sticky-col sticky-col-1" style="padding-left: 24px;">
                  {monthName(month.month_number)}
                </td>
                <td class="num">{formatMoney(month.sum_income)}</td>
                <td class="num">{formatMoney(month.sum_expense)}</td>
                {#each selectedBreakdowns as option}
                  <td class="num">{formatMoney(month.breakdowns?.[option.key] || 0)}</td>
                {/each}
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

<style>
  .report-breakdown-toolbar {
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .report-breakdown-dropdown {
    position: relative;
  }

  .report-breakdown-dropdown summary {
    list-style: none;
    cursor: pointer;
    min-width: 260px;
    max-width: 420px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    background: var(--panel);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text);
  }

  .report-breakdown-dropdown summary::-webkit-details-marker {
    display: none;
  }

  .report-breakdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    width: min(460px, 90vw);
    max-height: 320px;
    overflow: auto;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--panel);
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  }

  .report-breakdown-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .report-breakdown-list {
    display: grid;
    gap: 8px;
  }

  .report-breakdown-option {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    font-size: 12px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
  }

  .report-breakdown-head {
    min-width: 112px;
  }

  .report-breakdown-type {
    display: block;
    color: var(--muted);
    font-size: 10px;
    margin-bottom: 2px;
  }

  .report-table {
    width: max-content;
    min-width: 100%;
  }

  .report-table-wrap {
    max-height: calc(100vh - 220px);
  }
</style>
