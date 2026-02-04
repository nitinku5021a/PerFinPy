<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { toPeriodParam } from "$lib/period";
  import Table from "$lib/components/Table.svelte";
  import { formatInr } from "$lib/format";

  let data = null;
  let period = "current_month";
  let startDate = "";
  let endDate = "";
  let accountId = "all";
  let error = "";
  let ready = false;
  let importStatus = "";
  let importError = "";
  let importProgress = 0;
  let fakeProgressTimer = null;
  let monthStart = "";
  let months = [];
  let activeMonth = "";

  const columns = [
    { header: "Date", render: (row) => row.entry_date },
    { header: "Debit Account", render: (row) => row.debit_account },
    { header: "Amount", render: (row) => formatInr(row.amount), align: "right" },
    { header: "Description", render: (row) => row.description },
    { header: "Credit Account", render: (row) => row.credit_account }
  ];

  $: sums = data?.period_sums || { Asset: [], Liability: [], Income: [], Expense: [] };
  $: totals = {
    Asset: Math.round(sums.Asset?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0),
    Liability: Math.round(sums.Liability?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0),
    Income: Math.round(sums.Income?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0),
    Expense: Math.round(sums.Expense?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0)
  };

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

  function buildMonths(startKey, minKey, maxKey) {
    const out = [];
    for (let i = 0; i < 12; i += 1) {
      const key = addMonths(startKey, -i);
      if (minKey && key < minKey) continue;
      if (maxKey && key > maxKey) continue;
      out.push({ key, label: labelForMonth(key) });
    }
    return out;
  }

  function setActiveMonth(key) {
    activeMonth = key;
    const [y, m] = key.split("-");
    const start = new Date(Number(y), Number(m) - 1, 1);
    const end = new Date(Number(y), Number(m), 0);
    startDate = start.toISOString().slice(0, 10);
    endDate = end.toISOString().slice(0, 10);
    period = "custom";
    load();
  }

  async function load() {
    try {
      error = "";
      const params = new URLSearchParams();
      params.set("period", toPeriodParam(period, startDate, endDate));
      if (accountId !== "all") params.set("account_id", accountId);
      data = await apiGet(`/transactions?${params.toString()}`);
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  }

  onMount(() => {
    ready = true;
  });

  $: if (ready) {
    period;
    startDate;
    endDate;
    accountId;
    if (period !== "custom" || (startDate && endDate)) {
      load();
    }
  }

  $: if (ready && data) {
    const maxKey = data?.max_entry_date ? data.max_entry_date.slice(0, 7) : new Date().toISOString().slice(0, 7);
    const minKey = data?.min_entry_date ? data.min_entry_date.slice(0, 7) : null;
    if (!monthStart) {
      monthStart = maxKey;
    }
    months = buildMonths(monthStart, minKey, maxKey);
    if (months.length && !activeMonth) {
      setActiveMonth(months[0].key);
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    importStatus = "Uploading...";
    importError = "";
    importProgress = 0;
    try {
      const payload = await new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/transactions/import");
        // Simulated progress to keep UI responsive when browser doesn't emit intermediate events
        fakeProgressTimer = setInterval(() => {
          if (importProgress < 95) {
            importProgress += 5;
            importStatus = `Uploading... ${importProgress}%`;
          }
        }, 300);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            importProgress = Math.round((e.loaded / e.total) * 100);
            importStatus = `Uploading... ${importProgress}%`;
          }
        };
        xhr.upload.onload = () => {
          importProgress = 100;
          importStatus = "Processing...";
        };
        xhr.onload = () => {
          if (fakeProgressTimer) {
            clearInterval(fakeProgressTimer);
            fakeProgressTimer = null;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({});
            }
          } else {
            reject(new Error(xhr.responseText || `Import failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Import failed."));
        xhr.send(formData);
      });
      importProgress = 100;
      importStatus = `Imported ${payload?.results?.success ?? 0} transactions.`;
      await load();
      setTimeout(() => {
        importStatus = "";
        importProgress = 0;
      }, 2000);
    } catch (err) {
      if (fakeProgressTimer) {
        clearInterval(fakeProgressTimer);
        fakeProgressTimer = null;
      }
      importStatus = "";
      importError = err.message || "Import failed.";
    }
  }
</script>

<h1 class="page-title">Transactions</h1>
<p class="page-subtitle">Journal entries and filters.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="panel">
  <div class="toolbar">
    <label>
      Import Excel:&nbsp;
      <input type="file" accept=".xlsx,.xls" on:change={handleImport} />
    </label>
    <button
      class="button"
      on:click={() => {
        const url = `/api/transactions/export?period=${toPeriodParam(period, startDate, endDate)}`;
        window.open(url, "_blank");
      }}
    >
      Export Excel
    </button>
    {#if importStatus}
      <span class="meta">{importStatus}</span>
    {/if}
    {#if importError}
      <span class="danger">{importError}</span>
    {/if}
  </div>
</div>

<div class="toolbar">
  <button class="button" on:click={() => {
    monthStart = addMonths(monthStart, -12);
    const maxKey = data?.max_entry_date ? data.max_entry_date.slice(0, 7) : null;
    const minKey = data?.min_entry_date ? data.min_entry_date.slice(0, 7) : null;
    months = buildMonths(monthStart, minKey, maxKey);
    if (months.length) setActiveMonth(months[0].key);
  }}>
    Prev 12
  </button>
  <button class="button" on:click={() => {
    monthStart = addMonths(monthStart, 12);
    const maxKey = data?.max_entry_date ? data.max_entry_date.slice(0, 7) : null;
    const minKey = data?.min_entry_date ? data.min_entry_date.slice(0, 7) : null;
    months = buildMonths(monthStart, minKey, maxKey);
    if (months.length) setActiveMonth(months[0].key);
  }}>
    Next 12
  </button>
  <label>
    Period:&nbsp;
    <select bind:value={period}>
      <option value="current_month">Current Month</option>
      <option value="ytd">Year to Date</option>
      <option value="all">All</option>
      <option value="custom">Custom Range</option>
    </select>
  </label>
  {#if period === "custom"}
    <label>
      Start:&nbsp;
      <input type="date" bind:value={startDate} />
    </label>
    <label>
      End:&nbsp;
      <input type="date" bind:value={endDate} />
    </label>
  {/if}
  <label>
    Account:&nbsp;
    <select bind:value={accountId}>
      <option value="all">All Accounts</option>
      {#if data?.accounts_for_select}
        {#each data.accounts_for_select as acc}
          <option value={acc.id}>{acc.path || acc.name}</option>
        {/each}
      {/if}
    </select>
  </label>
  <span class="meta">Total: {data?.pagination?.total ?? 0} entries</span>
</div>

<div class="tabs">
  {#each months as m}
    <button
      class={`tab ${activeMonth === m.key ? "active" : ""}`}
      on:click={() => setActiveMonth(m.key)}
    >
      {m.label}
    </button>
  {/each}
</div>

<div class="split">
  <div>
    <Table columns={columns} rows={data ? data.entries : []} />
    <div class="toolbar">
      <button class="button" disabled={!data?.pagination?.has_prev} on:click={() => {
        const params = new URLSearchParams();
        params.set("period", toPeriodParam(period, startDate, endDate));
        if (accountId !== "all") params.set("account_id", accountId);
        params.set("page", String((data?.pagination?.page || 1) - 1));
        apiGet(`/transactions?${params.toString()}`).then((res) => (data = res));
      }}>
        Prev Page
      </button>
      <span class="meta">Page {data?.pagination?.page ?? 1} / {data?.pagination?.pages ?? 1}</span>
      <button class="button" disabled={!data?.pagination?.has_next} on:click={() => {
        const params = new URLSearchParams();
        params.set("period", toPeriodParam(period, startDate, endDate));
        if (accountId !== "all") params.set("account_id", accountId);
        params.set("page", String((data?.pagination?.page || 1) + 1));
        apiGet(`/transactions?${params.toString()}`).then((res) => (data = res));
      }}>
        Next Page
      </button>
    </div>
  </div>
  <div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Asset <span class="meta">({formatInr(totals.Asset)})</span></th>
            <th>Liability <span class="meta">({formatInr(totals.Liability)})</span></th>
            <th>Income <span class="meta">({formatInr(totals.Income)})</span></th>
            <th>Expense <span class="meta">({formatInr(totals.Expense)})</span></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {#each data?.period_sums?.Asset || [] as item}
                <div class="list-row">
                  <span>{item.name}</span>
                  <span class="num">{formatInr(item.value)}</span>
                </div>
              {/each}
            </td>
            <td>
              {#each data?.period_sums?.Liability || [] as item}
                <div class="list-row">
                  <span>{item.name}</span>
                  <span class="num">{formatInr(item.value)}</span>
                </div>
              {/each}
            </td>
            <td>
              {#each data?.period_sums?.Income || [] as item}
                <div class="list-row">
                  <span>{item.name}</span>
                  <span class="num">{formatInr(item.value)}</span>
                </div>
              {/each}
            </td>
            <td>
              {#each data?.period_sums?.Expense || [] as item}
                <div class="list-row">
                  <span>{item.name}</span>
                  <span class="num">{formatInr(item.value)}</span>
                </div>
              {/each}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
