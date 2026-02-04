<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import Table from "$lib/components/Table.svelte";
  import { toPeriodParam } from "$lib/period";
  import { page } from "$app/stores";

  let accounts = [];
  let accountId = "";
  let period = "ytd";
  let startDate = "";
  let endDate = "";
  let data = null;
  let error = "";
  let ready = false;

  async function loadAccounts() {
    const res = await apiGet("/transactions/accounts");
    accounts = res.accounts || [];
    if (!accountId && accounts.length > 0) {
      accountId = String(accounts[0].id);
    }
  }

  async function loadEntries() {
    if (!accountId) return;
    const p = toPeriodParam(period, startDate, endDate);
    data = await apiGet(`/reports/accounts/${accountId}/entries?period=${p}`);
  }

  onMount(async () => {
    ready = true;
    try {
      const qs = $page.url.searchParams;
      const qsAccount = qs.get("account_id");
      const qsPeriod = qs.get("period");
      if (qsAccount) accountId = qsAccount;
      if (qsPeriod) {
        if (qsPeriod.startsWith("custom_")) {
          period = "custom";
          const parts = qsPeriod.split("_");
          if (parts.length >= 3) {
            const s = parts[1];
            const e = parts[2];
            startDate = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
            endDate = `${e.slice(0, 4)}-${e.slice(4, 6)}-${e.slice(6, 8)}`;
          }
        } else {
          period = qsPeriod;
        }
      }
      await loadAccounts();
      await loadEntries();
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  });

  $: if (ready) {
    accountId;
    period;
    startDate;
    endDate;
    loadEntries().catch((err) => (error = err.message || "Failed to load."));
  }

  const columns = [
    { header: "ID", render: (row) => row.id },
    { header: "Date", render: (row) => row.entry_date },
    { header: "Description", render: (row) => row.description },
    { header: "Reference", render: (row) => row.reference || "-" }
  ];
</script>

<h1 class="page-title">Journal Entries</h1>
<p class="page-subtitle">Account-level drilldown.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="toolbar">
  <label>
    Account:&nbsp;
    <select bind:value={accountId}>
      {#each accounts as acc}
        <option value={acc.id}>{acc.path || acc.name}</option>
      {/each}
    </select>
  </label>
  <label>
    Period:&nbsp;
    <select bind:value={period}>
      <option value="ytd">Year to Date</option>
      <option value="current_month">Current Month</option>
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
  <span class="meta">Entries: {data ? data.entries.length : 0}</span>
</div>

<Table {columns} rows={data ? data.entries : []} />
