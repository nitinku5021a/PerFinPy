<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import Table from "$lib/components/Table.svelte";
  import { formatInr } from "$lib/format";

  let accounts = [];
  let filter = "all";
  let error = "";

  onMount(async () => {
    try {
      const res = await apiGet("/transactions/accounts");
      accounts = res.accounts || [];
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  });

  $: filtered =
    filter === "all" ? accounts : accounts.filter((acc) => acc.account_type === filter);

  const columns = [
    {
      header: "Account",
      render: (row) => `<a href="/journal-entries?account_id=${row.id}&period=ytd">${row.path}</a>`
    },
    { header: "Type", render: (row) => row.account_type },
    { header: "Opening Balance", render: (row) => formatInr(row.opening_balance), align: "right" },
    { header: "Status", render: (row) => (row.is_active ? "Active" : "Inactive") }
  ];
</script>

<h1 class="page-title">Accounts</h1>
<p class="page-subtitle">Chart of accounts and structure.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="toolbar">
  <span class="meta">Total: {filtered.length}</span>
  <label>
    Type:&nbsp;
    <select bind:value={filter}>
      <option value="all">All</option>
      <option value="Asset">Asset</option>
      <option value="Liability">Liability</option>
      <option value="Equity">Equity</option>
      <option value="Income">Income</option>
      <option value="Expense">Expense</option>
    </select>
  </label>
</div>

<Table {columns} rows={filtered} allowHtml={true} />
