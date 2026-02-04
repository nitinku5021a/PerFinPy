<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import NetworthMatrixTable from "$lib/components/NetworthMatrixTable.svelte";
  import { formatInr } from "$lib/format";

  let data = [];
  let months = [];
  let error = "";
  let showZero = false;
  let hasOlder = false;
  let hasNewer = false;
  let startMonth = "";
  let ready = false;

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

  async function load() {
    try {
      error = "";
      const qs = startMonth ? `?start=${startMonth}` : "";
      const payload = await apiGet(`/reports/income-matrix${qs}`);
      data = payload?.groups || [];
      months = (payload?.months || []).map((key) => ({ key, label: labelForMonth(key) }));
      hasOlder = !!payload?.has_older;
      hasNewer = !!payload?.has_newer;
      startMonth = payload?.start_month || startMonth;
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  }

  onMount(async () => {
    ready = true;
    await load();
  });

  $: if (ready) {
    startMonth;
    load();
  }

  $: filteredGroups =
    showZero
      ? data
      : data
          .map((g) => {
            const parents = (g.parents || [])
              .map((p) => {
                const accounts = (p.accounts || []).filter((a) => {
                  return months.some((mm) => {
                    const val = a.monthly_balances?.[mm.key] ?? 0;
                    return Math.abs(Number(val) || 0) > 0.005;
                  });
                });
                const keepParent = months.some((mm) => {
                  const val = p.monthly_balances?.[mm.key] ?? 0;
                  return Math.abs(Number(val) || 0) > 0.005;
                }) || accounts.length > 0;
                return keepParent ? { ...p, accounts } : null;
              })
              .filter(Boolean);
            return { ...g, parents };
          })
          .filter((g) => g.parents && g.parents.length > 0);
</script>

<h1 class="page-title">Income Statement</h1>
<p class="page-subtitle">Monthly income and expenses for the last 12 months.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="toolbar">
  <label>
    <input type="checkbox" bind:checked={showZero} />
    &nbsp;Show Zero Balances
  </label>
  <button
    class="button"
    disabled={!hasOlder}
    on:click={() => (startMonth = addMonths(startMonth || new Date().toISOString().slice(0, 7), -12))}
  >
    Prev 12
  </button>
  <button
    class="button"
    disabled={!hasNewer}
    on:click={() => (startMonth = addMonths(startMonth || new Date().toISOString().slice(0, 7), 12))}
  >
    Next 12
  </button>
</div>

<NetworthMatrixTable
  groups={filteredGroups}
  {months}
  formatValue={formatInr}
  networthLabel="NET SAVINGS"
  networthByMonth={(() => {
    const income = data?.find((g) => g.group === "Income");
    const expense = data?.find((g) => g.group === "Expense");
    if (!income || !expense) return null;
    return Object.fromEntries(
      months.map((m) => [
        m.key,
        (income.monthly_balances?.[m.key] || 0) - (expense.monthly_balances?.[m.key] || 0)
      ])
    );
  })()}
/>
