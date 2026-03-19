<script>
  import { onMount } from "svelte";
  import { apiDelete, apiGet, apiPost, apiPut } from "$lib/api";
  import { formatInr } from "$lib/format";

  let loading = true;
  let error = "";
  let saveStatus = "";

  let interestRate = 0;
  let goals = [];

  let newDescription = "";
  let newTargetCorpus = 0;
  let newTargetYear = new Date().getFullYear();
  let newCurrentCorpus = 0;

  $: totalTargetCorpus = goals.reduce((sum, goal) => sum + Number(goal?.target_corpus || 0), 0);
  $: totalCurrentCorpus = goals.reduce((sum, goal) => sum + Number(goal?.current_corpus || 0), 0);
  $: totalYearlyIncome = goals.reduce((sum, goal) => sum + Number(goal?.yearly_income || 0), 0);
  $: totalTargetYearlyIncome = goals.reduce(
    (sum, goal) => sum + Number(goal?.target_yearly_income || 0),
    0
  );
  function formatMoney(value) {
    const num = Number(value || 0);
    const prefix = num < 0 ? "-₹ " : "₹ ";
    return `${prefix}${formatInr(Math.abs(num))}`;
  }

  async function load() {
    loading = true;
    error = "";
    saveStatus = "";
    try {
      const payload = await apiGet("/goals");
      interestRate = Number(payload?.interest_rate || 0);
      goals = payload?.goals || [];
    } catch (err) {
      error = err?.message || "Failed to load goals.";
    } finally {
      loading = false;
    }
  }

  async function saveInterestRate() {
    error = "";
    saveStatus = "";
    try {
      await apiPost("/goals/settings", { interest_rate: Number(interestRate || 0) });
      saveStatus = "Interest rate saved.";
      await load();
    } catch (err) {
      error = err?.message || "Failed to save interest rate.";
    }
  }

  async function createGoal() {
    error = "";
    saveStatus = "";
    try {
      await apiPost("/goals", {
        description: newDescription,
        target_corpus: Number(newTargetCorpus || 0),
        target_year: Number(newTargetYear || 0),
        current_corpus: Number(newCurrentCorpus || 0)
      });
      newDescription = "";
      newTargetCorpus = 0;
      newTargetYear = new Date().getFullYear();
      newCurrentCorpus = 0;
      saveStatus = "Goal created.";
      await load();
    } catch (err) {
      error = err?.message || "Failed to create goal.";
    }
  }

  async function updateGoal(goal) {
    error = "";
    saveStatus = "";
    try {
      await apiPut(`/goals/${goal.id}`, {
        description: goal.description,
        target_corpus: Number(goal.target_corpus || 0),
        target_year: Number(goal.target_year || 0),
        current_corpus: Number(goal.current_corpus || 0)
      });
      saveStatus = "Goal updated.";
      await load();
    } catch (err) {
      error = err?.message || "Failed to update goal.";
    }
  }

  async function deleteGoal(goal) {
    error = "";
    const ok = window.confirm(`Delete goal "${goal.description}"?`);
    if (!ok) return;

    try {
      await apiDelete(`/goals/${goal.id}`);
      saveStatus = "Goal deleted.";
      await load();
    } catch (err) {
      error = err?.message || "Failed to delete goal.";
    }
  }

  onMount(load);
</script>

<h1 class="page-title">Goals</h1>
<p class="page-subtitle">
  Track savings goals and see yearly income from your current corpus based on the interest rate.
</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="panel">
  <div class="toolbar">
    <label>
      Interest rate (annual %):&nbsp;
      <input type="number" step="0.01" bind:value={interestRate} />
    </label>
    <button class="button" on:click={saveInterestRate}>Save Rate</button>
    {#if saveStatus}
      <span class="meta">{saveStatus}</span>
    {/if}
  </div>
</div>

<div class="panel">
  <div class="toolbar">
    <label>
      Description:&nbsp;
      <input type="text" bind:value={newDescription} placeholder="Home down payment" />
    </label>
    <label>
      Target Corpus:&nbsp;
      <input type="number" step="0.01" bind:value={newTargetCorpus} />
    </label>
    <label>
      Target Year:&nbsp;
      <input type="number" min="1900" max="3000" bind:value={newTargetYear} />
    </label>
    <label>
      Current Corpus:&nbsp;
      <input type="number" step="0.01" bind:value={newCurrentCorpus} />
    </label>
    <button class="button" on:click={createGoal}>Add Goal</button>
  </div>
</div>

{#if loading}
  <p class="meta">Loading...</p>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Target Corpus</th>
          <th class="num">Target Year</th>
          <th class="num">Current Corpus</th>
          <th class="num">Yearly Income</th>
          <th class="num">Target Yearly Income</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if goals.length === 0}
          <tr>
            <td colspan="7" class="meta">No goals yet.</td>
          </tr>
        {/if}
        {#each goals as goal}
          <tr>
            <td>
              <input type="text" bind:value={goal.description} />
            </td>
            <td class="num">
              <input type="number" step="0.01" bind:value={goal.target_corpus} />
            </td>
            <td class="num">
              <input type="number" min="1900" max="3000" bind:value={goal.target_year} />
            </td>
            <td class="num">
              <input type="number" step="0.01" bind:value={goal.current_corpus} />
            </td>
            <td class="num">{formatMoney(goal.yearly_income)}</td>
            <td class="num">{formatMoney(goal.target_yearly_income)}</td>
            <td>
              <div class="toolbar" style="margin-bottom: 0;">
                <button class="button" on:click={() => updateGoal(goal)}>Save</button>
                <button class="button" on:click={() => deleteGoal(goal)}>Delete</button>
              </div>
            </td>
          </tr>
        {/each}
        {#if goals.length > 0}
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td class="num">
              <strong>{formatMoney(totalTargetCorpus)}</strong>
            </td>
            <td class="num">
              <span class="meta">—</span>
            </td>
            <td class="num">
              <strong>{formatMoney(totalCurrentCorpus)}</strong>
            </td>
            <td class="num">
              <strong>{formatMoney(totalYearlyIncome)}</strong>
            </td>
            <td class="num">
              <strong>{formatMoney(totalTargetYearlyIncome)}</strong>
            </td>
            <td></td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
{/if}


