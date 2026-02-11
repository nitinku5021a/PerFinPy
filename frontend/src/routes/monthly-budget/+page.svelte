<script>
  import { onMount } from "svelte";
  import { apiGet, apiPost } from "$lib/api";
  import { formatInr } from "$lib/format";

  let loading = true;
  let error = "";
  let month = new Date().toISOString().slice(0, 7);
  let minMonth = null;
  let maxMonth = null;

  let budgetAmount = 0;
  let guchiOpening = 0;
  let gunuOpening = 0;
  let saveStatus = "";

  let summary = null;
  let entries = [];

  function addMonths(key, delta) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1 + delta, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }

  function canMoveTo(targetMonth) {
    if (minMonth && targetMonth < minMonth) return false;
    if (maxMonth && targetMonth > maxMonth) return false;
    return true;
  }

  function formatMoney(value) {
    const num = Number(value || 0);
    const prefix = num < 0 ? "-₹ " : "₹ ";
    return `${prefix}${formatInr(Math.abs(num))}`;
  }

  function isExpenseEntry(entry) {
    return Math.abs(Number(entry.expense_amount || 0)) > 0.00001;
  }

  async function load() {
    loading = true;
    error = "";
    saveStatus = "";
    try {
      const payload = await apiGet(`/budget/monthly?month=${month}`);
      month = payload?.month || month;
      minMonth = payload?.min_month || null;
      maxMonth = payload?.max_month || null;
      budgetAmount = Number(payload?.budget?.budget_amount || 0);
      guchiOpening = Number(payload?.budget?.guchi_opening_balance || 0);
      gunuOpening = Number(payload?.budget?.gunu_opening_balance || 0);
      summary = payload?.summary || null;
      entries = payload?.entries || [];
    } catch (err) {
      error = err?.message || "Failed to load monthly budget.";
    } finally {
      loading = false;
    }
  }

  async function saveSettings() {
    saveStatus = "";
    error = "";
    try {
      await apiPost("/budget/monthly/settings", {
        month,
        budget_amount: Number(budgetAmount || 0),
        guchi_opening_balance: Number(guchiOpening || 0),
        gunu_opening_balance: Number(gunuOpening || 0)
      });
      await load();
      saveStatus = "Settings saved.";
    } catch (err) {
      error = err?.message || "Failed to save settings.";
    }
  }

  async function updateOwner(entryId, owner) {
    error = "";
    try {
      await apiPost("/budget/monthly/assign-owner", {
        month,
        journal_entry_id: entryId,
        owner
      });
      await load();
    } catch (err) {
      error = err?.message || "Failed to update owner.";
    }
  }

  onMount(load);
</script>

<h1 class="page-title">Monthly Budget</h1>
<p class="page-subtitle">Assign each transaction line to Guchi, Gunu, or None for month-wise budget tracking.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="panel">
  <div class="toolbar">
    <button class="button" on:click={() => { const t = addMonths(month, -1); if (canMoveTo(t)) { month = t; load(); } }}>
      Prev Month
    </button>
    <input
      type="month"
      bind:value={month}
      min={minMonth || undefined}
      max={maxMonth || undefined}
      on:change={load}
    />
    <button class="button" on:click={() => { const t = addMonths(month, 1); if (canMoveTo(t)) { month = t; load(); } }}>
      Next Month
    </button>
  </div>
</div>

<div class="panel">
  <div class="toolbar">
    <label>
      Household Budget:&nbsp;
      <input type="number" step="0.01" bind:value={budgetAmount} />
    </label>
    <label>
      Guchi Opening:&nbsp;
      <input type="number" step="0.01" bind:value={guchiOpening} />
    </label>
    <label>
      Gunu Opening:&nbsp;
      <input type="number" step="0.01" bind:value={gunuOpening} />
    </label>
    <button class="button" on:click={saveSettings}>Save Settings</button>
    {#if saveStatus}
      <span class="meta">{saveStatus}</span>
    {/if}
  </div>
</div>

{#if loading}
  <p class="meta">Loading...</p>
{:else}
  <div class="panel">
    <div class="panel-row"><span class="panel-label">Total Expense (month)</span><span class="panel-value">{formatMoney(summary?.total_expense)}</span></div>
    <div class="panel-row"><span class="panel-label">Common Spent (None)</span><span class="panel-value">{formatMoney(summary?.common_spent)}</span></div>
    <div class="panel-row"><span class="panel-label">Guchi Expense</span><span class="panel-value">{formatMoney(summary?.guchi_expense)}</span></div>
    <div class="panel-row"><span class="panel-label">Gunu Expense</span><span class="panel-value">{formatMoney(summary?.gunu_expense)}</span></div>
    <div class="panel-row"><span class="panel-label">Remaining Budget</span><span class="panel-value">{formatMoney(summary?.remaining_budget)}</span></div>
    <div class="panel-row"><span class="panel-label">Discretionary Pool (Budget - Common)</span><span class="panel-value">{formatMoney(summary?.discretionary_pool)}</span></div>
    <div class="panel-row"><span class="panel-label">Shared Remaining</span><span class="panel-value">{formatMoney(summary?.remaining_shared)}</span></div>
    <div class="panel-row"><span class="panel-label">Guchi Remaining Power</span><span class="panel-value">{formatMoney(summary?.guchi_remaining_power)}</span></div>
    <div class="panel-row"><span class="panel-label">Gunu Remaining Power</span><span class="panel-value">{formatMoney(summary?.gunu_remaining_power)}</span></div>
    <div class="panel-row"><span class="panel-label">Guchi Final Available (after opening)</span><span class="panel-value">{formatMoney(summary?.guchi_final_available)}</span></div>
    <div class="panel-row"><span class="panel-label">Gunu Final Available (after opening)</span><span class="panel-value">{formatMoney(summary?.gunu_final_available)}</span></div>
  </div>

  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Debit Account</th>
          <th>Credit Account</th>
          <th class="num">Amount</th>
          <th class="num">Expense Amount</th>
          <th>Owner</th>
        </tr>
      </thead>
      <tbody>
        {#if entries.length === 0}
          <tr>
            <td colspan="7" class="meta">No transactions found for selected month.</td>
          </tr>
        {/if}
        {#each entries as entry}
          <tr>
            <td>{entry.date}</td>
            <td>{entry.description}</td>
            <td>{entry.debit_account}</td>
            <td>{entry.credit_account}</td>
            <td class="num">{formatMoney(entry.amount)}</td>
            <td class="num">{isExpenseEntry(entry) ? formatMoney(entry.expense_amount) : "--"}</td>
            <td>
              <select bind:value={entry.owner} on:change={(e) => updateOwner(entry.entry_id, e.currentTarget.value)}>
                <option value="None">None</option>
                <option value="Guchi">Guchi</option>
                <option value="Gunu">Gunu</option>
              </select>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
