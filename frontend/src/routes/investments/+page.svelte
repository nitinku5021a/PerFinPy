<script>
  import { onMount } from "svelte";
  import { apiDelete, apiGet, apiPost, apiPut } from "$lib/api";
  import { formatInr } from "$lib/format";

  const CATEGORIES = ["Equity", "Mutual Funds", "Fixed Income", "Commodity"];

  let selectedCategory = "Equity";

  let loading = true;
  let error = "";
  let accounts = [];
  let combinedMappings = [];
  let bsAccounts = [];
  let uploading = false;

  let uploadFile = null;
  let uploadAccountName = "";

  let createAccountName = "";
  let createHeaders = "";

  let addRowOpenByAccountId = {};
  let draftRowByAccountId = {};

  let syncOpen = false;
  let syncLoading = false;
  let syncError = "";
  let syncPreview = null;
  let syncOffsetAccountId = "";
  let syncPostedEntryId = null;
  let syncCreateParentId = "";
  let syncPurchaseOffsetAccountId = "";

  function extractErrorMessage(err, fallback) {
    const raw = err?.message || "";
    try {
      const parsed = JSON.parse(raw);
      return parsed?.error || fallback;
    } catch {
      return raw || fallback;
    }
  }

  function accountsForCategory(category) {
    return (accounts || []).filter((a) => a.category === category);
  }

  async function load() {
    loading = true;
    error = "";
    try {
      const payload = await apiGet("/investments");
      accounts = payload?.accounts || [];
      combinedMappings = payload?.combined_mappings || [];
      const accountsRes = await apiGet("/transactions/accounts");
      bsAccounts = accountsRes?.accounts || [];
    } catch (err) {
      error = extractErrorMessage(err, "Failed to load investments.");
    } finally {
      loading = false;
    }
  }

  function assetLeafAccounts() {
    return (bsAccounts || []).filter((a) => a.is_leaf && a.account_type === "Asset");
  }

  function labelAccount(acc) {
    return acc?.path || acc?.name || "";
  }

  function parseNumber(v) {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if (!s) return null;
    const cleaned = s.replaceAll(",", "").replaceAll("₹", "").replaceAll("INR", "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function normHeader(h) {
    return String(h || "")
      .toLowerCase()
      .replaceAll(".", "")
      .replaceAll(" ", "")
      .replaceAll("_", "");
  }

  function isPercentHeader(h) {
    const n = normHeader(h);
    return n.includes("netchg") || n.includes("daychg") || n.includes("pct") || n.includes("percent");
  }

  function isPriceHeader(h) {
    const n = normHeader(h);
    return n === "avgcost" || n === "ltp";
  }

  function formatMaybePercent(h, n) {
    if (n == null) return "";
    if (isPercentHeader(h)) return `${Number(n).toFixed(2)}%`;
    if (isPriceHeader(h)) return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return formatInr(n);
  }

  function buildCombinedTable(category) {
    const accs = accountsForCategory(category) || [];
    if (accs.length === 0) return { headers: [], rows: [], totals: {} };

    const headerOrder = accs[0]?.headers || [];
    const keyByNorm = Object.fromEntries(headerOrder.map((h) => [normHeader(h), h]));
    const instrumentKey = keyByNorm["instrument"] || "Instrument";
    const qtyKey = keyByNorm["qty"] || keyByNorm["qty."] || keyByNorm["qty"] || "Qty.";
    const avgCostKey = keyByNorm["avgcost"] || "Avg. cost";
    const ltpKey = keyByNorm["ltp"] || "LTP";
    const investedKey = keyByNorm["invested"] || "Invested";
    const curValKey = keyByNorm["curval"] || keyByNorm["curval"] || "Cur. val";
    const pnlKey = keyByNorm["pl"] || keyByNorm["p&l"] || "P&L";
    const netChgKey = keyByNorm["netchg"] || "Net chg.";
    const dayChgKey = keyByNorm["daychg"] || "Day chg.";

    const combinedByInstrument = new Map();

    for (const acc of accs) {
      for (const r of acc.rows || []) {
        const data = r.data || {};
        const inst = String(data[instrumentKey] ?? data["Instrument"] ?? "").trim();
        if (!inst) continue;
        const existing =
          combinedByInstrument.get(inst) || {
            [instrumentKey]: inst,
            __qty: 0,
            __avgCostSum: 0,
            __avgCostCount: 0,
            __ltpSum: 0,
            __ltpCount: 0,
            __dayChgSum: 0,
            __dayChgCount: 0
          };

        const qty = parseNumber(data[qtyKey] ?? data["Qty."] ?? data["Qty"] ?? 0) ?? 0;
        existing.__qty += qty;

        const avgCost = parseNumber(data[avgCostKey] ?? data["Avg. cost"]);
        if (avgCost != null) {
          existing.__avgCostSum += avgCost;
          existing.__avgCostCount += 1;
        }

        const ltp = parseNumber(data[ltpKey] ?? data["LTP"]);
        if (ltp != null) {
          existing.__ltpSum += ltp;
          existing.__ltpCount += 1;
        }

        const dayChg = parseNumber(data[dayChgKey] ?? data["Day chg."] ?? data["Day chg"]);
        if (dayChg != null) {
          existing.__dayChgSum += dayChg;
          existing.__dayChgCount += 1;
        }

        combinedByInstrument.set(inst, existing);
      }
    }

    const rows = Array.from(combinedByInstrument.values())
      .map((r) => {
        const qty = r.__qty || 0;
        const avgCost = r.__avgCostCount ? r.__avgCostSum / r.__avgCostCount : 0;
        const ltp = r.__ltpCount ? r.__ltpSum / r.__ltpCount : 0;
        const invested = qty * avgCost;
        const curVal = qty * ltp;
        const pnl = curVal - invested;
        const netChg = invested !== 0 ? (pnl / invested) * 100 : null;
        const dayChg = r.__dayChgCount ? r.__dayChgSum / r.__dayChgCount : null;

        const out = { [instrumentKey]: r[instrumentKey] ?? r["Instrument"], mapping_account_id: null };
        for (const h of headerOrder) {
          if (h === instrumentKey || normHeader(h) === "instrument") {
            out[h] = out[instrumentKey];
          } else if (h === qtyKey || normHeader(h) === "qty") {
            out[h] = qty;
          } else if (h === avgCostKey || normHeader(h) === "avgcost") {
            out[h] = avgCost;
          } else if (h === ltpKey || normHeader(h) === "ltp") {
            out[h] = ltp;
          } else if (h === investedKey || normHeader(h) === "invested") {
            out[h] = invested;
          } else if (h === curValKey || normHeader(h) === "curval") {
            out[h] = curVal;
          } else if (h === pnlKey || normHeader(h) === "pl" || normHeader(h) === "p&l") {
            out[h] = pnl;
          } else if (h === netChgKey || normHeader(h) === "netchg") {
            out[h] = netChg;
          } else if (h === dayChgKey || normHeader(h) === "daychg") {
            out[h] = dayChg;
          } else {
            out[h] = "";
          }
        }
        return out;
      })
      .sort((a, b) =>
        String(a[instrumentKey] || "").toLowerCase().localeCompare(String(b[instrumentKey] || "").toLowerCase())
      );

    const mappingByInstrument = new Map(
      (combinedMappings || [])
        .filter((m) => m.category === category)
        .map((m) => [String(m.instrument || "").trim(), m.mapping_account_id ?? null])
    );
    for (const r of rows) {
      const inst = String(r[instrumentKey] || "").trim();
      if (mappingByInstrument.has(inst)) {
        r.mapping_account_id = mappingByInstrument.get(inst);
      }
    }

    const totals = {};
    const totalQty = rows.reduce((acc, r) => acc + (parseNumber(r[qtyKey]) ?? 0), 0);
    const totalInvested = rows.reduce((acc, r) => acc + (parseNumber(r[investedKey]) ?? 0), 0);
    const totalCurVal = rows.reduce((acc, r) => acc + (parseNumber(r[curValKey]) ?? 0), 0);
    const totalPnl = rows.reduce((acc, r) => acc + (parseNumber(r[pnlKey]) ?? 0), 0);
    const totalNetChg = totalInvested !== 0 ? (totalPnl / totalInvested) * 100 : null;

    for (const h of headerOrder) {
      const nh = normHeader(h);
      if (nh === "instrument") continue;
      if (nh === "qty") totals[h] = totalQty;
      else if (nh === "invested") totals[h] = totalInvested;
      else if (nh === "curval") totals[h] = totalCurVal;
      else if (nh === "pl" || nh === "p&l") totals[h] = totalPnl;
      else if (nh === "netchg") totals[h] = totalNetChg;
      else totals[h] = null;
    }

    return { headers: headerOrder, rows, totals };
  }

  function handleUploadFileChange(e) {
    uploadFile = e?.currentTarget?.files?.[0] || null;
    if (!uploadAccountName && uploadFile?.name) {
      uploadAccountName = uploadFile.name.replace(/\.[^/.]+$/, "");
    }
  }

  async function upload() {
    if (!uploadFile) {
      error = "Please choose a .xlsx or .csv file.";
      return;
    }
    uploading = true;
    error = "";
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("category", selectedCategory);
      if (uploadAccountName) fd.append("account_name", uploadAccountName);

      const res = await fetch(`/api/investments/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed: ${res.status}`);
      }
      await res.json();
      uploadFile = null;
      uploadAccountName = "";
      await load();
    } catch (err) {
      error = extractErrorMessage(err, "Upload failed.");
    } finally {
      uploading = false;
    }
  }

  async function createAccount() {
    error = "";
    try {
      const headers = (createHeaders || "")
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);
      await apiPost("/investments/accounts", {
        category: selectedCategory,
        name: createAccountName,
        headers
      });
      createAccountName = "";
      createHeaders = "";
      await load();
    } catch (err) {
      error = extractErrorMessage(err, "Failed to create account.");
    }
  }

  function toggleAddRow(account) {
    const id = String(account.id);
    addRowOpenByAccountId = { ...addRowOpenByAccountId, [id]: !addRowOpenByAccountId[id] };
    if (!draftRowByAccountId[id]) {
      const draft = Object.fromEntries((account.headers || []).map((h) => [h, ""]));
      draftRowByAccountId = { ...draftRowByAccountId, [id]: draft };
    }
  }

  async function addRow(account) {
    const id = String(account.id);
    error = "";
    try {
      await apiPost(`/investments/accounts/${id}/rows`, { data: draftRowByAccountId[id] || {} });
      addRowOpenByAccountId = { ...addRowOpenByAccountId, [id]: false };
      draftRowByAccountId = {
        ...draftRowByAccountId,
        [id]: Object.fromEntries((account.headers || []).map((h) => [h, ""]))
      };
      await load();
    } catch (err) {
      error = extractErrorMessage(err, "Failed to add row.");
    }
  }

  async function deleteRow(rowId) {
    error = "";
    try {
      await apiDelete(`/investments/rows/${rowId}`);
      await load();
    } catch (err) {
      error = extractErrorMessage(err, "Failed to delete row.");
    }
  }

  async function deleteAccount(accountId) {
    error = "";
    try {
      await apiDelete(`/investments/accounts/${accountId}`);
      await load();
    } catch (err) {
      error = extractErrorMessage(err, "Failed to delete account.");
    }
  }

  async function setCombinedMapping(category, instrument, mappingAccountId) {
    error = "";
    try {
      await apiPut(`/investments/combined/mapping`, {
        category,
        instrument,
        mapping_account_id: mappingAccountId || null
      });
      await load();
    } catch (err) {
      error = extractErrorMessage(err, "Failed to save mapping.");
    }
  }

  async function openSyncCombined(category, instrument) {
    syncOpen = true;
    syncLoading = true;
    syncError = "";
    syncPreview = null;
    syncOffsetAccountId = "";
    syncPostedEntryId = null;
    syncCreateParentId = "";
    syncPurchaseOffsetAccountId = "";
    try {
      const preview = await apiPost(`/investments/combined/sync/preview`, { category, instrument });
      syncPreview = preview;
      syncOffsetAccountId = String(preview?.default_offset_account_id || "");
    } catch (err) {
      syncError = extractErrorMessage(err, "Failed to build sync preview.");
    } finally {
      syncLoading = false;
    }
  }

  function closeSync() {
    syncOpen = false;
    syncError = "";
    syncPreview = null;
    syncOffsetAccountId = "";
    syncPostedEntryId = null;
    syncCreateParentId = "";
    syncPurchaseOffsetAccountId = "";
  }

  async function postSync() {
    if (!syncPreview) return;
    syncLoading = true;
    syncError = "";
    try {
      const res = await apiPost(`/investments/combined/sync/post`, {
        category: syncPreview.category,
        instrument: syncPreview.instrument,
        offset_account_id: syncOffsetAccountId,
        create_parent_id: syncPreview.mapping_missing ? syncCreateParentId : null,
        purchase_offset_account_id: syncPreview.mapping_missing ? syncPurchaseOffsetAccountId : null
      });
      const ids = res?.entry_ids || [];
      syncPostedEntryId = ids.length ? ids[ids.length - 1] : null;
      await load();
    } catch (err) {
      syncError = extractErrorMessage(err, "Failed to post sync transaction.");
    } finally {
      syncLoading = false;
    }
  }

  onMount(load);
</script>

<h1 class="page-title">Investments</h1>
<p class="page-subtitle">Equity, Mutual Funds, Fixed Income, and Commodity holdings by account.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

{#if loading}
  <p class="meta">Loading investments...</p>
{:else}
  <div class="tabs">
    {#each CATEGORIES as cat}
      <button
        class={`tab ${selectedCategory === cat ? "tab-active" : ""}`}
        on:click={() => (selectedCategory = cat)}
      >
        {cat}
      </button>
    {/each}
  </div>

  <div class="card">
    <h2 class="card-title">Upload</h2>
    <div class="form-grid">
      <label class="field">
        <span class="label">File (.xlsx / .csv)</span>
        <input type="file" accept=".xlsx,.xlsm,.csv" on:change={handleUploadFileChange} />
      </label>
      <label class="field">
        <span class="label">Account name (optional)</span>
        <input type="text" bind:value={uploadAccountName} placeholder="e.g., Zerodha" />
      </label>
      <div class="field actions">
        <button class="btn primary" disabled={uploading} on:click={upload}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
    <p class="meta">Uploaded filename becomes the account name by default.</p>
  </div>

  <div class="card">
    <h2 class="card-title">Create account (manual)</h2>
    <div class="form-grid">
      <label class="field">
        <span class="label">Account name</span>
        <input type="text" bind:value={createAccountName} placeholder="e.g., Bank FD" />
      </label>
      <label class="field">
        <span class="label">Headers (comma-separated)</span>
        <input type="text" bind:value={createHeaders} placeholder="Instrument, Qty, Avg cost, LTP" />
      </label>
      <div class="field actions">
        <button class="btn" on:click={createAccount}>Create</button>
      </div>
    </div>
  </div>

  {#if accountsForCategory(selectedCategory).length === 0}
    <p class="meta">No accounts in {selectedCategory} yet. Upload a file to get started.</p>
  {:else}
    {@const combined = buildCombinedTable(selectedCategory)}
    {#if combined.headers.length > 0 && combined.rows.length > 0}
      <details class="card" open>
        <summary class="summary">
          <div class="summary-title">Combined</div>
          <div class="summary-meta meta">
            {accountsForCategory(selectedCategory).length} accounts • {combined.rows.length} instruments
          </div>
          <div class="summary-actions"></div>
        </summary>

        <div class="table-wrap">
          <table class="matrix-table">
            <thead>
              <tr>
                {#each combined.headers as h}
                  <th>{h}</th>
                {/each}
                <th>Mapping</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each combined.rows as row (row.Instrument)}
                <tr>
                  {#each combined.headers as h}
                    {@const n = parseNumber(row?.[h])}
                    <td class={h === "Instrument" ? "" : "num"}>
                      {n == null ? row?.[h] ?? "" : formatMaybePercent(h, n)}
                    </td>
                  {/each}
                  <td>
                    <select
                      class="select"
                      value={row.mapping_account_id == null ? "" : String(row.mapping_account_id)}
                      on:change={(e) => setCombinedMapping(selectedCategory, row.Instrument, e.currentTarget.value)}
                    >
                      <option value="">-- Select Asset --</option>
                      {#each assetLeafAccounts() as a (a.id)}
                        <option value={String(a.id)}>{labelAccount(a)}</option>
                      {/each}
                    </select>
                  </td>
                  <td class="num">
                    <button class="btn tiny" on:click={() => openSyncCombined(selectedCategory, row.Instrument)}>Sync</button>
                  </td>
                </tr>
              {/each}
              <tr>
                {#each combined.headers as h}
                  {#if h === "Instrument"}
                    <td><b>Total</b></td>
                  {:else}
                    <td class="num">
                      {combined.totals?.[h] == null ? "" : formatMaybePercent(h, combined.totals[h])}
                    </td>
                  {/if}
                {/each}
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    {/if}

    {#each accountsForCategory(selectedCategory) as account (account.id)}
      <details class="card" open>
        <summary class="summary">
          <div class="summary-title">{account.name}</div>
          <div class="summary-meta meta">
            {account.headers?.length || 0} columns • {account.rows?.length || 0} rows
          </div>
          <div class="summary-actions">
            <button class="btn" on:click|preventDefault={() => toggleAddRow(account)}>Add row</button>
            <button class="btn danger" on:click|preventDefault={() => deleteAccount(account.id)}>Delete</button>
          </div>
        </summary>

        <div class="table-wrap">
          <table class="matrix-table">
            <thead>
              <tr>
                {#each account.headers as h}
                  <th>{h}</th>
                {/each}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each account.rows as row (row.id)}
                <tr>
                  {#each account.headers as h}
                    <td>{row.data?.[h] ?? ""}</td>
                  {/each}
                  <td class="num">
                    <button class="btn tiny danger" on:click={() => deleteRow(row.id)}>Delete</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if addRowOpenByAccountId[String(account.id)]}
          <div class="card-inner">
            <h3 class="card-subtitle">New row</h3>
            <div class="form-grid wide">
              {#each account.headers as h}
                <label class="field">
                  <span class="label">{h}</span>
                  <input
                    type="text"
                    value={draftRowByAccountId[String(account.id)]?.[h] ?? ""}
                    on:input={(e) => {
                      const id = String(account.id);
                      const draft = { ...(draftRowByAccountId[id] || {}) };
                      draft[h] = e.currentTarget.value;
                      draftRowByAccountId = { ...draftRowByAccountId, [id]: draft };
                    }}
                  />
                </label>
              {/each}
              <div class="field actions">
                <button class="btn primary" on:click={() => addRow(account)}>Save row</button>
              </div>
            </div>
          </div>
        {/if}
      </details>
    {/each}
  {/if}
{/if}

{#if syncOpen}
  <div class="modal-overlay" on:click={closeSync}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-head">
        <h2 class="card-title">Sync</h2>
        <button class="btn" on:click={closeSync}>Close</button>
      </div>

      {#if syncError}
        <p class="danger">{syncError}</p>
      {/if}

      {#if syncLoading}
        <p class="meta">Loading preview...</p>
      {:else if syncPreview}
        <div class="meta">
          <div><b>Instrument:</b> {syncPreview.instrument}</div>
          <div><b>Asset:</b> {syncPreview.mapping_missing ? "(will be created)" : syncPreview.asset?.path}</div>
          <div>
            <b>Investment (Cur. val):</b> {syncPreview.investment_value} • <b>Baseline:</b> {syncPreview.effective_asset_value} •
            <b>Diff:</b> {syncPreview.diff}
          </div>
        </div>

        {#if syncPreview.direction === "no_change"}
          <p class="meta">No difference to sync.</p>
        {:else}
          {#if syncPreview.mapping_missing}
            <label class="field" style="margin-top: 0.75rem;">
              <span class="label">Create Asset account under (parent)</span>
              <select class="select" bind:value={syncCreateParentId}>
                <option value="">-- Select parent (Asset group) --</option>
                {#each (bsAccounts || []).filter((a) => a.account_type === "Asset" && !a.is_leaf) as a (a.id)}
                  <option value={String(a.id)}>{labelAccount(a)}</option>
                {/each}
              </select>
            </label>
            <label class="field" style="margin-top: 0.75rem;">
              <span class="label">Purchase paid from (cash/bank/broker)</span>
              <select class="select" bind:value={syncPurchaseOffsetAccountId}>
                <option value="">-- Select cash/bank --</option>
                {#each assetLeafAccounts() as a (a.id)}
                  <option value={String(a.id)}>{labelAccount(a)}</option>
                {/each}
              </select>
            </label>
            <p class="meta">
              Will create Asset leaf account named exactly "{syncPreview.instrument}", post a buy entry at cost
              ({syncPreview.purchase?.amount ?? 0}), then sync to current value.
            </p>
          {/if}

          <label class="field" style="margin-top: 0.75rem;">
            <span class="label">Offset account (Equity/Debt Capital Gain)</span>
            <select class="select" bind:value={syncOffsetAccountId}>
              {#each syncPreview.offset_options as opt (opt.id)}
                <option value={String(opt.id)}>{labelAccount(opt)}</option>
              {/each}
            </select>
          </label>

          <div class="actions" style="margin-top: 1rem;">
            <button
              class="btn primary"
              disabled={
                syncLoading ||
                (syncPreview.mapping_missing && (!syncCreateParentId || !syncPurchaseOffsetAccountId))
              }
              on:click={postSync}
            >
              Post transaction
            </button>
          </div>

          {#if syncPostedEntryId}
            <p class="meta">Posted journal entry #{syncPostedEntryId}.</p>
          {/if}
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
    flex-wrap: wrap;
  }
  .tab {
    padding: 0.4rem 0.7rem;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 999px;
    background: white;
    font-size: 0.9rem;
  }
  .tab-active {
    border-color: #111827;
    background: #111827;
    color: white;
  }
  .card {
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 0.75rem;
    padding: 1rem;
    background: white;
    margin: 0.75rem 0;
  }
  .card-title {
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
  .card-subtitle {
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }
  .card-inner {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed var(--border, #e5e7eb);
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 0.75rem;
    align-items: end;
  }
  .form-grid.wide {
    grid-template-columns: repeat(3, minmax(220px, 1fr));
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .label {
    font-size: 0.8rem;
    color: #6b7280;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    align-items: end;
    justify-content: flex-end;
  }
  .btn {
    padding: 0.4rem 0.7rem;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 0.5rem;
    background: white;
  }
  .btn.primary {
    border-color: #111827;
    background: #111827;
    color: white;
  }
  .btn.danger {
    border-color: #ef4444;
    color: #ef4444;
    background: #fff;
  }
  .btn.tiny {
    padding: 0.2rem 0.5rem;
    border-radius: 0.4rem;
    font-size: 0.8rem;
  }
  .summary {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.75rem;
    align-items: center;
    cursor: pointer;
  }
  .summary-title {
    font-weight: 600;
  }
  .summary-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .table-wrap {
    overflow: auto;
    margin-top: 0.75rem;
  }
  .select {
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 0.5rem;
    background: white;
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 50;
  }
  .modal {
    width: min(900px, 100%);
    max-height: min(80vh, 900px);
    overflow: auto;
    background: white;
    border-radius: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--border, #e5e7eb);
  }
  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
</style>
