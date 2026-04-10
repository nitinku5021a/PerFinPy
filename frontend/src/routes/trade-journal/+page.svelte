<script>
  import { onMount } from "svelte";
  import { apiGet, apiPost } from "$lib/api";
  import { formatInr } from "$lib/format";

  function toLocalDate(value = new Date()) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }

  function toLocalMonth(value = new Date()) {
    return toLocalDate(value).slice(0, 7);
  }

  function addMonths(key, delta) {
    const [year, month] = key.split("-").map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }

  function extractErrorMessage(err, fallback) {
    const raw = err?.message || "";
    try {
      const parsed = JSON.parse(raw);
      return parsed?.error || fallback;
    } catch {
      return raw || fallback;
    }
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") return "--";
    const amount = Number(value || 0);
    const prefix = amount < 0 ? "-INR " : "INR ";
    return `${prefix}${formatInr(Math.abs(amount))}`;
  }

  let loading = true;
  let error = "";
  let setupStatus = "";
  let entryStatus = "";

  let month = toLocalMonth();
  let minMonth = null;
  let maxMonth = null;
  let summary = null;
  let setups = [];

  let newSetupName = "";
  let newSetupStartDate = toLocalDate();

  let entryDate = toLocalDate();
  let selectedSetupId = "";
  let capitalDeployed = "";
  let pnlAmount = "";
  let comment = "";

  function canMoveTo(targetMonth) {
    if (minMonth && targetMonth < minMonth) return false;
    if (maxMonth && targetMonth > maxMonth) return false;
    return true;
  }

  function setupLabel(setup) {
    if (!setup) return "";
    return `${setup.name} · Started ${setup.start_date}`;
  }

  function setSelectedSetup(nextId, preserveCapital = false) {
    selectedSetupId = nextId ? String(nextId) : "";
    const setup = setups.find((item) => String(item.id) === String(selectedSetupId));
    if (!setup) {
      if (!preserveCapital) capitalDeployed = "";
      return;
    }

    if (entryDate && setup.start_date && entryDate < setup.start_date) {
      entryDate = setup.start_date;
    }

    if (!preserveCapital || capitalDeployed === "") {
      capitalDeployed =
        setup.last_capital_deployed === null || setup.last_capital_deployed === undefined
          ? ""
          : String(setup.last_capital_deployed);
    }
  }

  async function load(preserveSelectedSetup = true) {
    loading = true;
    error = "";
    try {
      const payload = await apiGet(`/trade-journal/?month=${month}`);
      month = payload?.month || month;
      minMonth = payload?.min_month || null;
      maxMonth = payload?.max_month || null;
      summary = payload?.summary || null;
      setups = payload?.setups || [];

      if (!setups.length) {
        selectedSetupId = "";
        capitalDeployed = "";
        return;
      }

      const hasSelection = preserveSelectedSetup && setups.some((item) => String(item.id) === String(selectedSetupId));
      if (hasSelection) {
        setSelectedSetup(selectedSetupId, capitalDeployed !== "");
      } else {
        setSelectedSetup(setups[0].id, false);
      }
    } catch (err) {
      error = extractErrorMessage(err, "Failed to load trade journal.");
    } finally {
      loading = false;
    }
  }

  async function createSetup() {
    error = "";
    setupStatus = "";
    try {
      const payload = await apiPost("/trade-journal/setups", {
        name: newSetupName,
        start_date: newSetupStartDate
      });
      newSetupName = "";
      setupStatus = "Setup created.";
      await load(false);
      if (payload?.setup?.id) {
        setSelectedSetup(payload.setup.id, false);
      }
    } catch (err) {
      error = extractErrorMessage(err, "Failed to create setup.");
    }
  }

  async function saveEntry() {
    error = "";
    entryStatus = "";
    try {
      await apiPost("/trade-journal/entries", {
        setup_id: selectedSetupId,
        trade_date: entryDate,
        capital_deployed: capitalDeployed,
        pnl_amount: pnlAmount,
        comment
      });
      entryStatus = "Trade journal entry saved.";
      pnlAmount = "";
      comment = "";
      await load(true);
      setSelectedSetup(selectedSetupId, false);
    } catch (err) {
      error = extractErrorMessage(err, "Failed to save trade journal entry.");
    }
  }

  onMount(() => load(false));
</script>

<h1 class="page-title">Trade Journal</h1>
<p class="page-subtitle">
  Create setup names once, then log daily capital and PnL from a single form while reviewing each setup side by side.
</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="panel trade-panel">
  <div class="trade-panel__header">
    <div>
      <p class="trade-panel__eyebrow">Setup Library</p>
      <h2>Create Trade Setup</h2>
      <p class="trade-panel__copy">Add each setup once so it becomes available in the shared daily PnL form.</p>
    </div>
  </div>

  <div class="trade-form trade-form--setup">
    <label>
      <span>Setup Name</span>
      <input type="text" bind:value={newSetupName} placeholder="ORB, Positional, Scalping..." />
    </label>
    <label>
      <span>Start Date</span>
      <input type="date" bind:value={newSetupStartDate} />
    </label>
    <div class="trade-form__actions">
      <button class="button trade-button trade-button--primary" on:click={createSetup}>Create Setup</button>
      {#if setupStatus}
        <span class="meta">{setupStatus}</span>
      {/if}
    </div>
  </div>
</div>

<div class="panel">
  <div class="toolbar">
    <button class="button" on:click={() => { const next = addMonths(month, -1); if (canMoveTo(next)) { month = next; load(true); } }}>
      Prev Month
    </button>
    <input type="month" bind:value={month} min={minMonth || undefined} max={maxMonth || undefined} on:change={() => load(true)} />
    <button class="button" on:click={() => { const next = addMonths(month, 1); if (canMoveTo(next)) { month = next; load(true); } }}>
      Next Month
    </button>
    <span class="meta">Tables below show entries saved in {month}.</span>
  </div>
</div>

<div class="trade-summary">
  <div class="trade-summary__card">
    <span>Setups</span>
    <strong>{summary?.setup_count ?? 0}</strong>
  </div>
  <div class="trade-summary__card">
    <span>Entries This Month</span>
    <strong>{summary?.month_entry_count ?? 0}</strong>
  </div>
  <div class="trade-summary__card">
    <span>Month PnL</span>
    <strong class:positive={Number(summary?.month_total_pnl || 0) > 0} class:negative={Number(summary?.month_total_pnl || 0) < 0}>
      {formatMoney(summary?.month_total_pnl || 0)}
    </strong>
  </div>
  <div class="trade-summary__card">
    <span>All-Time PnL</span>
    <strong class:positive={Number(summary?.all_time_total_pnl || 0) > 0} class:negative={Number(summary?.all_time_total_pnl || 0) < 0}>
      {formatMoney(summary?.all_time_total_pnl || 0)}
    </strong>
  </div>
</div>

<div class="panel trade-panel">
  <div class="trade-panel__header">
    <div>
      <p class="trade-panel__eyebrow">Daily Entry</p>
      <h2>Log Daily PnL</h2>
      <p class="trade-panel__copy">Use one form, pick the setup from the dropdown, and the previous capital will auto-fill when available.</p>
    </div>
  </div>

  <div class="trade-form trade-form--entry">
    <label>
      <span>Date</span>
      <input type="date" bind:value={entryDate} />
    </label>
    <label>
      <span>Setup Name</span>
      <select bind:value={selectedSetupId} on:change={(e) => setSelectedSetup(e.currentTarget.value, false)}>
        <option value="" disabled>Select a setup</option>
        {#each setups as setup}
          <option value={setup.id}>{setupLabel(setup)}</option>
        {/each}
      </select>
    </label>
    <label>
      <span>Capital Deployed</span>
      <input type="number" min="0" step="0.01" bind:value={capitalDeployed} placeholder="Filled from previous entry" />
    </label>
    <label>
      <span>Profit or Loss Amount</span>
      <input type="number" step="0.01" bind:value={pnlAmount} placeholder="Use negative value for loss" />
    </label>
    <label class="trade-form__wide">
      <span>Comment / Note</span>
      <textarea rows="3" bind:value={comment} placeholder="Why the trade worked, failed, or what to watch next time"></textarea>
    </label>
    <div class="trade-form__actions trade-form__actions--entry">
      <button class="button trade-button trade-button--primary" on:click={saveEntry} disabled={!setups.length}>
        Save Trade Entry
      </button>
      {#if entryStatus}
        <span class="meta">{entryStatus}</span>
      {/if}
    </div>
  </div>
</div>

{#if loading}
  <p class="meta">Loading trade journal...</p>
{:else if setups.length === 0}
  <div class="trade-empty">
    <h3>No trade setups yet</h3>
    <p>Create your first setup above and this page will start grouping entries setup by setup.</p>
  </div>
{:else}
  <div class="setup-grid">
    {#each setups as setup}
      <section class="setup-card">
        <div class="setup-card__header">
          <div>
            <p class="setup-card__eyebrow">Setup</p>
            <h2>{setup.name}</h2>
            <p class="setup-card__meta">Started {setup.start_date}</p>
          </div>
          <div class="setup-card__totals">
            <div>
              <span>Last Capital</span>
              <strong>{formatMoney(setup.last_capital_deployed)}</strong>
            </div>
            <div>
              <span>Month PnL</span>
              <strong class:positive={Number(setup.month_total_pnl || 0) > 0} class:negative={Number(setup.month_total_pnl || 0) < 0}>
                {formatMoney(setup.month_total_pnl)}
              </strong>
            </div>
            <div>
              <span>All-Time PnL</span>
              <strong class:positive={Number(setup.all_time_total_pnl || 0) > 0} class:negative={Number(setup.all_time_total_pnl || 0) < 0}>
                {formatMoney(setup.all_time_total_pnl)}
              </strong>
            </div>
          </div>
        </div>

        <div class="setup-card__table-wrap">
          <table class="table setup-table">
            <thead>
              <tr>
                <th>Date</th>
                <th class="num">Capital</th>
                <th class="num">PnL</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {#if setup.entries.length === 0}
                <tr>
                  <td colspan="4" class="meta">No entries saved for this setup in {month}.</td>
                </tr>
              {/if}
              {#each setup.entries as entry}
                <tr>
                  <td>{entry.trade_date}</td>
                  <td class="num">{formatMoney(entry.capital_deployed)}</td>
                  <td class={`num ${Number(entry.pnl_amount || 0) > 0 ? "positive" : Number(entry.pnl_amount || 0) < 0 ? "negative" : ""}`}>
                    {formatMoney(entry.pnl_amount)}
                  </td>
                  <td>{entry.comment || "--"}</td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td>Total</td>
                <td class="num">--</td>
                <td class={`num ${Number(setup.month_total_pnl || 0) > 0 ? "positive" : Number(setup.month_total_pnl || 0) < 0 ? "negative" : ""}`}>
                  {formatMoney(setup.month_total_pnl)}
                </td>
                <td>{setup.entry_count} entries</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    {/each}
  </div>
{/if}

<style>
  .trade-panel {
    padding: 16px 18px;
    border-radius: 20px;
    background:
      radial-gradient(circle at top right, rgba(14, 165, 233, 0.14), transparent 28%),
      linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
  }

  .trade-panel__header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }

  .trade-panel__eyebrow,
  .setup-card__eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #0f766e;
  }

  .trade-panel h2,
  .setup-card h2 {
    margin-top: 6px;
    font-size: 22px;
    line-height: 1.2;
    color: #0f172a;
  }

  .trade-panel__copy,
  .setup-card__meta {
    margin-top: 6px;
    color: var(--muted);
    line-height: 1.5;
  }

  .trade-form {
    display: grid;
    gap: 12px;
  }

  .trade-form--setup {
    grid-template-columns: 1.7fr 1fr auto;
    align-items: end;
  }

  .trade-form--entry {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trade-form label {
    display: grid;
    gap: 6px;
    color: var(--muted);
    font-size: 12px;
  }

  .trade-form span {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #475569;
  }

  .trade-form input,
  .trade-form select,
  .trade-form textarea {
    width: 100%;
    min-height: 42px;
    border: 1px solid #dbe3ee;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.96);
    color: var(--text);
    padding: 10px 12px;
    font: inherit;
  }

  .trade-form textarea {
    min-height: 90px;
    resize: vertical;
  }

  .trade-form input:focus,
  .trade-form select:focus,
  .trade-form textarea:focus {
    outline: none;
    border-color: #0f766e;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
  }

  .trade-form__wide {
    grid-column: 1 / -1;
  }

  .trade-form__actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .trade-form__actions--entry {
    grid-column: 1 / -1;
  }

  .trade-button {
    min-height: 42px;
    padding: 9px 14px;
    border-radius: 999px;
  }

  .trade-button--primary {
    border-color: #99f6e4;
    background: #ecfeff;
    color: #0f766e;
    font-weight: 600;
  }

  .trade-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 10px;
  }

  .trade-summary__card {
    padding: 14px 16px;
    border-radius: 18px;
    border: 1px solid var(--border);
    background:
      linear-gradient(135deg, rgba(236, 253, 245, 0.95), rgba(255, 255, 255, 0.98)),
      #ffffff;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
  }

  .trade-summary__card span {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }

  .trade-summary__card strong {
    display: block;
    margin-top: 10px;
    font-size: 22px;
    line-height: 1.2;
  }

  .trade-empty {
    padding: 24px;
    border-radius: 20px;
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--muted);
  }

  .trade-empty h3 {
    color: var(--text);
    margin-bottom: 6px;
  }

  .setup-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 14px;
  }

  .setup-card {
    border-radius: 22px;
    border: 1px solid var(--border);
    background:
      radial-gradient(circle at top right, rgba(34, 197, 94, 0.08), transparent 30%),
      linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
    overflow: hidden;
  }

  .setup-card__header {
    padding: 18px 18px 14px 18px;
    border-bottom: 1px solid #e2e8f0;
  }

  .setup-card__totals {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
  }

  .setup-card__totals div {
    padding: 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid #e5eefb;
  }

  .setup-card__totals span {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #64748b;
  }

  .setup-card__totals strong {
    display: block;
    margin-top: 6px;
    font-size: 16px;
    line-height: 1.3;
  }

  .setup-card__table-wrap {
    padding: 0 0 6px 0;
    overflow-x: auto;
  }

  .setup-table {
    min-width: 100%;
  }

  .setup-table th {
    background: rgba(248, 250, 252, 0.98);
  }

  .setup-table td:last-child {
    min-width: 180px;
  }

  @media (max-width: 960px) {
    .trade-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .trade-form--setup {
      grid-template-columns: 1fr 1fr;
    }

    .trade-form--entry {
      grid-template-columns: 1fr;
    }

    .trade-form__actions,
    .trade-form__actions--entry {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 720px) {
    .trade-summary {
      grid-template-columns: 1fr;
    }

    .trade-form--setup {
      grid-template-columns: 1fr;
    }

    .setup-card__totals {
      grid-template-columns: 1fr;
    }
  }
</style>
