<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { toPeriodParam } from "$lib/period";
  import Table from "$lib/components/Table.svelte";
  import { page } from "$app/stores";
  import { formatInr } from "$lib/format";

  let data = null;
  let accountId = "";
  let period = "all";
  let startDate = "";
  let endDate = "";
  let error = "";
  let ready = false;

  const columns = [
    { header: "Date", render: (row) => row.entry_date },
    { header: "Debit Account", render: (row) => row.debit_account },
    { header: "Amount", render: (row) => formatInr(row.amount), align: "right" },
    { header: "Description", render: (row) => row.description },
    { header: "Credit Account", render: (row) => row.credit_account }
  ];

  function setPeriodForMode(mode, endParam, monthParam) {
    if (mode === "upto" && endParam) {
      period = "custom";
      startDate = "1900-01-01";
      endDate = endParam;
      return;
    }
    if (mode === "month" && monthParam) {
      const [y, m] = monthParam.split("-");
      const start = new Date(Number(y), Number(m) - 1, 1);
      const end = new Date(Number(y), Number(m), 0);
      period = "custom";
      startDate = start.toISOString().slice(0, 10);
      endDate = end.toISOString().slice(0, 10);
      return;
    }
    period = "all";
    startDate = "";
    endDate = "";
  }

  async function load(pageNum = 1) {
    try {
      error = "";
      const params = new URLSearchParams();
      params.set("period", toPeriodParam(period, startDate, endDate));
      if (accountId) params.set("account_id", accountId);
      params.set("page", String(pageNum));
      data = await apiGet(`/transactions?${params.toString()}`);
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  }

  onMount(async () => {
    ready = true;
    const qs = $page.url.searchParams;
    const qsAccount = qs.get("account_id");
    const qsMode = qs.get("mode");
    const qsEnd = qs.get("end");
    const qsMonth = qs.get("month");

    if (qsAccount) {
      accountId = qsAccount;
    }
    setPeriodForMode(qsMode, qsEnd, qsMonth);

    await load(1);
  });

  $: if (ready) {
    accountId;
    period;
    startDate;
    endDate;
    load(1);
  }
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
      {#if data?.accounts_for_select}
        {#each data.accounts_for_select as acc}
          <option value={acc.id}>{acc.path || acc.name}</option>
        {/each}
      {/if}
    </select>
  </label>
  <span class="meta">Total: {data?.pagination?.total ?? 0} entries</span>
</div>

<Table columns={columns} rows={data ? data.entries : []} />

<div class="toolbar">
  <button
    class="button"
    disabled={!data?.pagination?.has_prev}
    on:click={() => load((data?.pagination?.page || 1) - 1)}
  >
    Prev Page
  </button>
  <span class="meta">Page {data?.pagination?.page ?? 1} / {data?.pagination?.pages ?? 1}</span>
  <button
    class="button"
    disabled={!data?.pagination?.has_next}
    on:click={() => load((data?.pagination?.page || 1) + 1)}
  >
    Next Page
  </button>
</div>
