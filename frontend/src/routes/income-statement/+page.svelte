<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import NetworthMatrixTable from "$lib/components/NetworthMatrixTable.svelte";
  import { formatInr } from "$lib/format";

  let data = [];
  let months = [];
  let error = "";
  let loading = false;
  let showZero = false;
  let hasOlder = false;
  let hasNewer = false;
  let startMonth = "";
  let activeView = "snapshot";
  let selectedMonthIndex = 0;
  let expandedNodeKey = "";

  const views = [
    { id: "snapshot", label: "Snapshot" },
    { id: "matrix", label: "Matrix" }
  ];

  function labelForMonth(key) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  }

  function addMonths(key, delta) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1 + delta, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }

  function toNumber(val) {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  }

  function absValue(val) {
    return Math.abs(toNumber(val));
  }

  function formatMoney(value, signed = false) {
    const num = toNumber(value);
    const prefix = signed && num > 0 ? "+" : signed && num < 0 ? "-" : "";
    return `${prefix}Rs ${formatInr(Math.abs(num))}`;
  }

  function pctLabel(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "--";
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(1)}%`;
  }

  function groupNamed(name) {
    return data.find((g) => (g.group || "").toLowerCase() === name.toLowerCase());
  }

  function groupTotal(name, monthKey) {
    const group = groupNamed(name);
    return toNumber(group?.monthly_balances?.[monthKey]);
  }

  function netSavingsFor(monthKey) {
    const income = groupTotal("Income", monthKey);
    const expenses = Math.abs(groupTotal("Expense", monthKey));
    return income - expenses;
  }

  function isDisplayedNonZero(val) {
    return Math.round(toNumber(val)) !== 0;
  }

  function monthEnd(key) {
    const [y, m] = key.split("-");
    const endDay = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
    const dd = String(endDay).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function balanceHref(accountId, monthKey) {
    if (!accountId || !monthKey) return null;
    return `/journal-entries?account_id=${accountId}&mode=month&month=${monthKey}`;
  }

  function changeHref(accountId, monthKey) {
    // For income statement, we are already viewing monthly movements, so change is same as balance
    return balanceHref(accountId, monthKey);
  }

  function nodeKey(item) {
    return `${item?.type || "group"}:${item?.account_id || item?.name || ""}`;
  }

  function toggleExpanded(item) {
    const key = nodeKey(item);
    expandedNodeKey = expandedNodeKey === key ? "" : key;
  }

  function isExpanded(item, currentKey) {
    return currentKey === nodeKey(item);
  }

  function percentOfTotal(value, total) {
    if (!total) return 0;
    return Math.min(100, (Math.abs(toNumber(value)) / Math.abs(total)) * 100);
  }

  function collectParents(groupName, monthKey, prevMonthKey = null) {
    const group = groupNamed(groupName);
    return (group?.parents || [])
      .map((parent) => {
        const value = toNumber(parent.monthly_balances?.[monthKey]);
        const previous = prevMonthKey ? toNumber(parent.monthly_balances?.[prevMonthKey]) : 0;
        const accounts = (parent.accounts || [])
          .map((account) => {
            const accountValue = toNumber(account.monthly_balances?.[monthKey]);
            const accountPrevious = prevMonthKey ? toNumber(account.monthly_balances?.[prevMonthKey]) : 0;
            return {
              ...account,
              value: accountValue,
              absValue: absValue(accountValue),
              change: accountValue - accountPrevious
            };
          })
          .filter((account) => showZero || isDisplayedNonZero(account.value))
          .sort((a, b) => b.absValue - a.absValue);

        return {
          ...parent,
          type: groupName,
          value,
          absValue: absValue(value),
          change: value - previous,
          accounts
        };
      })
      .filter((parent) => showZero || isDisplayedNonZero(parent.value) || parent.accounts.length > 0)
      .sort((a, b) => b.absValue - a.absValue);
  }

  function collectMovers(monthKey, prevMonthKey) {
    if (!monthKey || !prevMonthKey) return [];
    const rows = [];
    for (const groupName of ["Income", "Expense"]) {
      const group = groupNamed(groupName);
      for (const parent of group?.parents || []) {
        for (const account of parent.accounts || []) {
          const value = toNumber(account.monthly_balances?.[monthKey]);
          const previous = toNumber(account.monthly_balances?.[prevMonthKey]);
          const change = value - previous;
          if (Math.abs(Math.round(change)) === 0) continue;
          rows.push({
            name: account.name,
            parent: parent.name,
            type: groupName,
            account_id: account.account_id,
            value,
            change,
            magnitude: Math.abs(change)
          });
        }
      }
    }
    return rows.sort((a, b) => b.magnitude - a.magnitude).slice(0, 6);
  }

  async function load(nextStart = startMonth) {
    try {
      loading = true;
      error = "";
      const qs = nextStart ? `?start=${nextStart}` : "";
      const payload = await apiGet(`/reports/income-matrix${qs}`);
      data = payload?.groups || [];
      months = (payload?.months || []).map((key) => ({ key, label: labelForMonth(key) }));
      hasOlder = !!payload?.has_older;
      hasNewer = !!payload?.has_newer;
      startMonth = payload?.start_month || nextStart || startMonth;
      selectedMonthIndex = 0;
      expandedNodeKey = "";
    } catch (err) {
      error = err.message || "Failed to load.";
    } finally {
      loading = false;
    }
  }

  function shiftWindow(delta) {
    const base = startMonth || new Date().toISOString().slice(0, 7);
    load(addMonths(base, delta));
  }

  function selectRelativeMonth(delta) {
    selectedMonthIndex = Math.max(0, Math.min(months.length - 1, selectedMonthIndex + delta));
    expandedNodeKey = "";
  }

  onMount(() => {
    load();
  });

  $: selectedMonth = months[selectedMonthIndex] || months[0] || null;
  $: selectedMonthKey = selectedMonth?.key || null;
  $: previousMonth = months[selectedMonthIndex + 1] || null;
  $: previousMonthKey = previousMonth?.key || null;
  
  $: incomeTotal = selectedMonthKey ? groupTotal("Income", selectedMonthKey) : 0;
  $: expenseRaw = selectedMonthKey ? groupTotal("Expense", selectedMonthKey) : 0;
  $: expensesTotal = Math.abs(expenseRaw);
  $: netSavings = selectedMonthKey ? netSavingsFor(selectedMonthKey) : 0;
  $: previousNetSavings = previousMonthKey ? netSavingsFor(previousMonthKey) : null;
  $: netSavingsChange = previousNetSavings === null ? null : netSavings - previousNetSavings;
  $: netSavingsChangePct =
    previousNetSavings === null || Math.abs(previousNetSavings) < 0.01
      ? null
      : (netSavingsChange / Math.abs(previousNetSavings)) * 100;
      
  $: incomeParents = collectParents("Income", selectedMonthKey, previousMonthKey);
  $: expenseParents = collectParents("Expense", selectedMonthKey, previousMonthKey);
  $: movers = collectMovers(selectedMonthKey, previousMonthKey);
  
  $: biggestExpense = expenseParents[0] || null;
  $: biggestIncome = incomeParents[0] || null;
  $: savingsRate = incomeTotal > 0 ? (netSavings / incomeTotal) * 100 : null;

  $: filteredGroups =
    showZero || !months.length
      ? data
      : data
          .map((g) => {
            const parents = (g.parents || [])
              .map((p) => {
                const accounts = (p.accounts || []).filter((a) => {
                  return months.some((mm) => isDisplayedNonZero(a.monthly_balances?.[mm.key] ?? 0));
                });
                const keepParent =
                  months.some((m) => isDisplayedNonZero(p.monthly_balances?.[m.key] ?? 0)) ||
                  accounts.length > 0;
                return keepParent ? { ...p, accounts } : null;
              })
              .filter(Boolean);
            return { ...g, parents };
          })
          .filter((g) => g.parents && g.parents.length > 0);
          
  $: netSavingsByMonth = Object.fromEntries(months.map((m) => [m.key, netSavingsFor(m.key)]));
</script>

<section class="bs-shell">
  <div class="bs-header">
    <div>
      <p class="bs-kicker">Monthly statement</p>
      <h1 class="bs-title">Income Statement Explorer</h1>
    </div>
    <div class="bs-tabs" role="tablist" aria-label="Income Statement Views">
      {#each views as view}
        <button
          class:active={activeView === view.id}
          class="bs-tab"
          type="button"
          role="tab"
          aria-selected={activeView === view.id}
          on:click={() => (activeView = view.id)}
        >
          {view.label}
        </button>
      {/each}
    </div>
  </div>

  {#if error}
    <p class="danger">{error}</p>
  {/if}

  <div class="bs-command">
    <button class="bs-icon-button" type="button" disabled={selectedMonthIndex >= months.length - 1} on:click={() => selectRelativeMonth(1)}>
      Older
    </button>
    <div class="bs-month-rail">
      <div class="bs-month-current">{selectedMonth?.label || "Loading"}</div>
      <input
        aria-label="Selected month"
        type="range"
        min="0"
        max={Math.max(months.length - 1, 0)}
        step="1"
        bind:value={selectedMonthIndex}
      />
      <div class="bs-month-chips">
        {#each months.slice(0, 12) as month, idx}
          <button class:active={idx === selectedMonthIndex} type="button" on:click={() => (selectedMonthIndex = idx)}>
            {month.label}
          </button>
        {/each}
      </div>
    </div>
    <button class="bs-icon-button" type="button" disabled={selectedMonthIndex <= 0} on:click={() => selectRelativeMonth(-1)}>
      Newer
    </button>
  </div>

  <div class="bs-toolbar">
    <label class="bs-check">
      <input type="checkbox" bind:checked={showZero} />
      Show zero balances
    </label>
    <button class="button" disabled={!hasOlder || loading} on:click={() => shiftWindow(-12)}>Older 12</button>
    <button class="button" disabled={!hasNewer || loading} on:click={() => shiftWindow(12)}>Newer 12</button>
  </div>

  {#if loading && !months.length}
    <div class="bs-loading">Loading income statement...</div>
  {:else if activeView === "snapshot"}
    <div class="bs-snapshot">
      <section class="bs-equation">
        <div class="bs-equation-card asset">
          <span>Income</span>
          <strong>{formatMoney(incomeTotal)}</strong>
        </div>
        <div class="bs-equation-symbol">-</div>
        <div class="bs-equation-card liability">
          <span>Expenses</span>
          <strong>{formatMoney(expensesTotal)}</strong>
        </div>
        <div class="bs-equation-symbol">=</div>
        <div class="bs-equation-card networth">
          <span>Net Savings</span>
          <strong>{formatMoney(netSavings)}</strong>
          <em class:down={netSavingsChange < 0}>{netSavingsChange === null ? "--" : `${formatMoney(netSavingsChange, true)} (${pctLabel(netSavingsChangePct)})`}</em>
        </div>
      </section>

      <section class="bs-weather">
        <div>
          <span>Trend</span>
          <strong class:down={netSavingsChange < 0}>{netSavingsChange === null ? "No comparison" : netSavingsChange >= 0 ? "Rising" : "Falling"}</strong>
        </div>
        <div>
          <span>Savings Rate</span>
          <strong>{savingsRate === null ? "--" : pctLabel(savingsRate)}</strong>
        </div>
        <div>
          <span>Largest Expense</span>
          <strong>{biggestExpense?.name || "--"}</strong>
        </div>
        <div>
          <span>Largest Income</span>
          <strong>{biggestIncome?.name || "--"}</strong>
        </div>
      </section>

      <div class="bs-grid">
        <section class="bs-stack">
          <div class="bs-section-head">
            <h2>Income</h2>
            <span>{formatMoney(incomeTotal)}</span>
          </div>
          {#each incomeParents as parent}
            <button class="bs-row" class:expanded={isExpanded(parent, expandedNodeKey)} type="button" on:click={() => toggleExpanded({ ...parent, tone: "asset" })}>
              <span class="bs-row-label">{parent.name}</span>
              <span class="bs-row-bar">
                <i style={`width: ${percentOfTotal(parent.value, incomeTotal)}%`}></i>
                <em>{pctLabel(percentOfTotal(parent.value, incomeTotal))}</em>
              </span>
              <strong>{formatMoney(parent.value)}</strong>
            </button>
            {#if isExpanded(parent, expandedNodeKey)}
              <div class="bs-leaf-list">
                {#each parent.accounts as account}
                  <a class="bs-leaf-row" href={balanceHref(account.account_id, selectedMonthKey)}>
                    <span class="bs-leaf-name">{account.name}</span>
                    <span class="bs-row-bar bs-row-bar--leaf">
                      <i style={`width: ${percentOfTotal(account.value, incomeTotal)}%`}></i>
                      <em>{pctLabel(percentOfTotal(account.value, incomeTotal))}</em>
                    </span>
                    <strong>{formatMoney(account.value)}</strong>
                  </a>
                {/each}
              </div>
            {/if}
          {/each}
          {#if incomeParents.length === 0}
            <p class="bs-muted">No income for this month.</p>
          {/if}
        </section>

        <section class="bs-stack">
          <div class="bs-section-head">
            <h2>Expenses</h2>
            <span>{formatMoney(expensesTotal)}</span>
          </div>
          {#each expenseParents as parent}
            <button class="bs-row liability" class:expanded={isExpanded(parent, expandedNodeKey)} type="button" on:click={() => toggleExpanded({ ...parent, tone: "liability" })}>
              <span class="bs-row-label">{parent.name}</span>
              <span class="bs-row-bar">
                <i style={`width: ${percentOfTotal(parent.value, expensesTotal)}%`}></i>
                <em>{pctLabel(percentOfTotal(parent.value, expensesTotal))}</em>
              </span>
              <strong>{formatMoney(parent.value)}</strong>
            </button>
            {#if isExpanded(parent, expandedNodeKey)}
              <div class="bs-leaf-list">
                {#each parent.accounts as account}
                  <a class="bs-leaf-row liability" href={balanceHref(account.account_id, selectedMonthKey)}>
                    <span class="bs-leaf-name">{account.name}</span>
                    <span class="bs-row-bar bs-row-bar--leaf">
                      <i style={`width: ${percentOfTotal(account.value, expensesTotal)}%`}></i>
                      <em>{pctLabel(percentOfTotal(account.value, expensesTotal))}</em>
                    </span>
                    <strong>{formatMoney(account.value)}</strong>
                  </a>
                {/each}
              </div>
            {/if}
          {/each}
          {#if expenseParents.length === 0}
            <p class="bs-muted">No expenses for this month.</p>
          {/if}
        </section>

        <aside class="bs-detective">
          <div class="bs-section-head">
            <h2>Change Detective</h2>
            <span>{previousMonth?.label || "--"}</span>
          </div>
          {#if movers.length}
            {#each movers as mover}
              <a class="bs-mover" href={changeHref(mover.account_id, selectedMonthKey)}>
                <span>
                  <strong>{mover.name}</strong>
                  <em>{mover.parent}</em>
                </span>
                <b class:down={mover.type === "Expense" ? mover.change > 0 : mover.change < 0}>{formatMoney(mover.change, true)}</b>
              </a>
            {/each}
          {:else}
            <p class="bs-muted">No material account movement.</p>
          {/if}
        </aside>
      </div>
    </div>
  {:else}
    <NetworthMatrixTable
      groups={filteredGroups}
      {months}
      formatValue={formatInr}
      drillMode="month"
      networthLabel="NET SAVINGS"
      networthByMonth={netSavingsByMonth}
    />
  {/if}
</section>

<style>
  .bs-shell {
    display: grid;
    gap: 10px;
  }

  .bs-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
  }

  .bs-kicker {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .bs-title {
    font-size: 22px;
    line-height: 1.12;
    font-weight: 700;
  }

  .bs-tabs {
    display: inline-flex;
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 3px;
    border-radius: 8px;
  }

  .bs-tab {
    border: 0;
    background: transparent;
    color: var(--muted);
    padding: 6px 10px;
    border-radius: 6px;
    font: inherit;
    cursor: pointer;
  }

  .bs-tab.active {
    background: #111827;
    color: #ffffff;
  }

  .bs-command {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 8px;
  }

  .bs-icon-button {
    border: 1px solid var(--border);
    background: var(--panel-muted);
    color: var(--text);
    border-radius: 6px;
    padding: 7px 10px;
    font: inherit;
    cursor: pointer;
  }

  .bs-icon-button:disabled,
  .button:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .bs-month-rail {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .bs-month-current {
    text-align: center;
    font-weight: 700;
    font-size: 14px;
  }

  .bs-month-rail input {
    width: 100%;
    accent-color: #111827;
  }

  .bs-month-chips {
    display: flex;
    gap: 5px;
    overflow-x: auto;
    padding-bottom: 1px;
  }

  .bs-month-chips button {
    flex: 0 0 auto;
    border: 1px solid var(--border);
    background: var(--panel);
    color: var(--muted);
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 11px;
  }

  .bs-month-chips button.active {
    color: #111827;
    border-color: #111827;
    background: #f9fafb;
  }

  .bs-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .bs-check {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    color: var(--muted);
    font-size: 12px;
  }

  .bs-loading {
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 18px;
    color: var(--muted);
  }

  .bs-snapshot {
    display: grid;
    gap: 10px;
  }

  .bs-equation {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1.25fr);
    align-items: stretch;
    gap: 8px;
  }

  .bs-equation-card {
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 14px;
    min-height: 104px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    border-top: 4px solid #2563eb;
  }

  .bs-equation-card.liability {
    border-top-color: #e11d48;
  }

  .bs-equation-card.networth {
    border-top-color: #111827;
  }

  .bs-equation-card span,
  .bs-weather span,
  .bs-section-head span,
  .bs-tile span {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .bs-equation-card strong {
    font-size: clamp(18px, 3vw, 30px);
    line-height: 1;
  }

  .bs-equation-card em,
  .bs-mover em,
  .bs-tile em {
    color: #047857;
    font-style: normal;
    font-size: 12px;
  }

  .down {
    color: #be123c !important;
  }

  .bs-equation-symbol {
    align-self: center;
    color: var(--muted);
    font-size: 22px;
    font-weight: 700;
  }

  .bs-weather {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .bs-weather div {
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 10px;
    display: grid;
    gap: 5px;
  }

  .bs-weather strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bs-grid {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) minmax(240px, 1fr) minmax(260px, 0.85fr);
    gap: 10px;
    align-items: start;
  }

  .bs-stack,
  .bs-detective {
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 10px;
  }

  .bs-section-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;
  }

  .bs-section-head h2 {
    font-size: 14px;
    font-weight: 700;
  }

  .bs-row {
    display: grid;
    grid-template-columns: minmax(110px, 1fr) minmax(80px, 0.8fr) auto;
    gap: 8px;
    align-items: center;
    width: 100%;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: transparent;
    padding: 8px 0;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .bs-row:hover {
    background: var(--panel-muted);
  }

  .bs-row.expanded {
    background: #f8fafc;
    border-bottom-color: transparent;
  }

  .bs-row-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bs-row-bar {
    position: relative;
    height: 16px;
    border-radius: 999px;
    background: #e5e7eb;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 6px;
  }

  .bs-row-bar i {
    display: block;
    position: absolute;
    left: 0;
    top: 3px;
    bottom: 3px;
    border-radius: inherit;
    background: #2563eb;
    z-index: 0;
  }

  .bs-row-bar em {
    position: relative;
    z-index: 1;
    color: #111827;
    font-size: 10.5px;
    font-style: normal;
    font-weight: 700;
    line-height: 1;
  }

  .bs-row.liability .bs-row-bar i {
    background: #e11d48;
  }

  .bs-leaf-list {
    display: grid;
    border-bottom: 1px solid var(--border);
    background: #fbfdff;
    padding: 2px 0 6px;
  }

  .bs-leaf-row {
    display: grid;
    grid-template-columns: minmax(110px, 1fr) minmax(80px, 0.8fr) auto;
    gap: 8px;
    align-items: center;
    color: var(--text);
    padding: 6px 0 6px 18px;
    font-size: 12px;
  }

  .bs-leaf-row:hover {
    background: #eef6ff;
    text-decoration: none;
  }

  .bs-leaf-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bs-row-bar--leaf {
    height: 14px;
  }

  .bs-leaf-row.liability .bs-row-bar i {
    background: #e11d48;
  }

  .bs-mover {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    color: var(--text);
  }

  .bs-mover span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .bs-mover strong,
  .bs-mover em {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bs-mover b {
    color: #047857;
    white-space: nowrap;
  }

  .bs-muted {
    color: var(--muted);
    font-size: 12px;
  }

  @media (max-width: 1024px) {
    .bs-equation {
      grid-template-columns: 1fr;
    }

    .bs-equation-symbol {
      display: none;
    }

    .bs-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .bs-header {
      align-items: stretch;
      flex-direction: column;
    }

    .bs-tabs {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
    }

    .bs-tab {
      min-height: 36px;
    }

    .bs-command {
      grid-template-columns: 1fr 1fr;
    }

    .bs-month-rail {
      grid-column: 1 / -1;
      grid-row: 1;
    }

    .bs-weather {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .bs-row {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .bs-leaf-row {
      grid-template-columns: minmax(0, 1fr) auto;
      padding-left: 14px;
    }

    .bs-row-bar,
    .bs-leaf-row .bs-row-bar {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }

  @media (max-width: 480px) {
    .bs-title {
      font-size: 19px;
    }

    .bs-weather {
      grid-template-columns: 1fr;
    }

    .bs-equation-card {
      min-height: 88px;
    }
  }
</style>
