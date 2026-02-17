<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import Table from "$lib/components/Table.svelte";
  import { formatInr } from "$lib/format";

  let accounts = [];
  let parentAccounts = [];
  let accountTypes = [];
  let filter = "all";
  let error = "";
  let showNew = false;
  let newName = "";
  let newType = "";
  let newParentId = "";
  let newOpening = "";
  let newDescription = "";
  let newError = "";
  let newStatus = "";

  async function loadAccounts() {
    try {
      const res = await apiGet("/transactions/accounts");
      accounts = res.accounts || [];
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  }

  async function loadFormData() {
    try {
      const res = await apiGet("/transactions/accounts/new");
      accountTypes = res.account_types || [];
      parentAccounts = res.parent_accounts || [];
      if (!newType && accountTypes.length) {
        newType = accountTypes[0];
      }
    } catch (err) {
      newError = err.message || "Failed to load form.";
    }
  }

  async function submitAccount() {
    newError = "";
    newStatus = "";
    if (!newName || !newType) {
      newError = "Name and type are required.";
      return;
    }
    try {
      const form = new URLSearchParams();
      form.set("name", newName.trim());
      form.set("account_type", newType);
      if (newParentId) form.set("parent_id", newParentId);
      if (newOpening) form.set("opening_balance", newOpening);
      if (newDescription) form.set("description", newDescription);
      const res = await fetch("/api/transactions/accounts/new", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString()
      });
      const rawText = await res.text();
      let payload = null;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        payload = null;
      }
      if (!res.ok) {
        const text = payload?.error || rawText;
        throw new Error(text || `Request failed: ${res.status}`);
      }
      if (payload?.error) {
        throw new Error(payload.error);
      }
      newStatus = "Account created.";
      newName = "";
      newParentId = "";
      newOpening = "";
      newDescription = "";
      await Promise.all([loadAccounts(), loadFormData()]);
    } catch (err) {
      newError = err.message || "Failed to create.";
    }
  }

  onMount(async () => {
    await Promise.all([loadAccounts(), loadFormData()]);
  });

  $: filtered =
    filter === "all" ? accounts : accounts.filter((acc) => acc.account_type === filter);

  $: eligibleParents = newType
    ? parentAccounts.filter((acc) => acc.account_type === newType)
    : parentAccounts;

  $: if (newParentId && !eligibleParents.some((acc) => String(acc.id) === String(newParentId))) {
    newParentId = "";
  }

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

<div class="panel">
  <div class="toolbar">
    <button class="button" on:click={() => (showNew = !showNew)}>
      {showNew ? "Hide" : "New Account"}
    </button>
    {#if newStatus}
      <span class="meta">{newStatus}</span>
    {/if}
    {#if newError}
      <span class="danger">{newError}</span>
    {/if}
  </div>
  {#if showNew}
    <div class="toolbar entry-form">
      <label>
        Name:&nbsp;
        <input type="text" bind:value={newName} placeholder="Account name" />
      </label>
      <label>
        Type:&nbsp;
        <select bind:value={newType}>
          {#each accountTypes as t}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </label>
      <label>
        Parent:&nbsp;
        <select bind:value={newParentId}>
          <option value="">None (root)</option>
          {#each eligibleParents as acc}
            <option value={acc.id}>{acc.path || acc.name}</option>
          {/each}
        </select>
      </label>
      <label>
        Opening:&nbsp;
        <input type="number" step="0.01" bind:value={newOpening} placeholder="0.00" />
      </label>
      <label>
        Desc:&nbsp;
        <input type="text" bind:value={newDescription} placeholder="Optional" />
      </label>
      <button class="button" on:click={submitAccount}>Create</button>
    </div>
  {/if}
</div>

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
