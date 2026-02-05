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
  let initializing = true;

  function monthRangeFromKey(key) {
    const [yRaw, mRaw] = key.split("-");
    const y = Number(yRaw);
    const m = Number(mRaw);
    const mm = String(m).padStart(2, "0");
    const endDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const dd = String(endDay).padStart(2, "0");
    return {
      start: `${y}-${mm}-01`,
      end: `${y}-${mm}-${dd}`
    };
  }

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
      period = "custom";
      const range = monthRangeFromKey(monthParam);
      startDate = range.start;
      endDate = range.end;
      return;
    }
    period = "all";
    startDate = "";
    endDate = "";
  }

  function setPeriodFromParam(periodParam) {
    if (!periodParam) return false;
    if (periodParam.startsWith("custom_")) {
      const parts = periodParam.split("_");
      if (parts.length >= 3) {
        const start = parts[1];
        const end = parts[2];
        if (start && end) {
          period = "custom";
          startDate = `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`;
          endDate = `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`;
          return true;
        }
      }
    }
    return false;
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
    const qs = $page.url.searchParams;
    const qsAccount = qs.get("account_id");
    const qsMode = qs.get("mode");
    const qsEnd = qs.get("end");
    const qsMonth = qs.get("month");
    const qsPeriod = qs.get("period");

    if (qsAccount) {
      accountId = qsAccount;
    }
    const periodSet = setPeriodFromParam(qsPeriod);
    if (!periodSet) {
      if ((qsMode === "month" || (!qsMode && qsMonth)) && qsMonth) {
        setPeriodForMode("month", null, qsMonth);
      } else if ((qsMode === "upto" || (!qsMode && qsEnd)) && qsEnd) {
        setPeriodForMode("upto", qsEnd, null);
      } else {
        setPeriodForMode(qsMode, qsEnd, qsMonth);
      }
    }

    ready = true;
    initializing = false;
    await load(1);
  });

  $: if (ready && !initializing) {
    accountId;
    period;
    startDate;
    endDate;
    load(1);
  }

  $: pageTotalAmount = (data?.entries || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  $: netAllAmount = data?.account_net_total_all;
  $: netPageAmount = data?.account_net_total_page;
  $: filterLabel =
    period === "custom" && startDate && endDate
      ? `Filtered: ${startDate} → ${endDate}`
      : period === "current_month"
        ? "Filtered: Current Month"
        : period === "ytd"
          ? "Filtered: Year to Date"
          : period === "all"
            ? "Filtered: All"
            : "";
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
  {#if filterLabel}
    <span class="meta">{filterLabel}</span>
  {/if}
  {#if data?.account_id}
    <span class="meta">All Net (D-C): {formatInr(netAllAmount ?? 0)}</span>
    <span class="meta">Page Net (D-C): {formatInr(netPageAmount ?? 0)}</span>
  {:else}
    <span class="meta">All Amount: {formatInr(data?.total_amount ?? 0)}</span>
    <span class="meta">Page Amount: {formatInr(pageTotalAmount)}</span>
  {/if}
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
