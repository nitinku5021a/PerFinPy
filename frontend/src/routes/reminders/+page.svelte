<script>
  import { onMount } from "svelte";
  import { apiDelete, apiGet, apiPost } from "$lib/api";

  let loading = true;
  let error = "";
  let saveStatus = "";
  let month = "";
  let reminders = [];

  let title = "";
  let notes = "";
  let dueDayOfMonth = 1;

  async function load() {
    loading = true;
    error = "";
    saveStatus = "";
    try {
      const payload = await apiGet("/reminders/monthly");
      month = payload?.month || "";
      reminders = payload?.reminders || [];
    } catch (err) {
      error = err?.message || "Failed to load reminders.";
    } finally {
      loading = false;
    }
  }

  async function createReminder() {
    error = "";
    saveStatus = "";
    try {
      await apiPost("/reminders/tasks", {
        title,
        notes,
        due_day_of_month: Number(dueDayOfMonth || 0)
      });
      title = "";
      notes = "";
      dueDayOfMonth = 1;
      saveStatus = "Reminder task created.";
      await load();
    } catch (err) {
      error = err?.message || "Failed to create reminder.";
    }
  }

  async function toggleDone(item, checked) {
    error = "";
    try {
      await apiPost(`/reminders/occurrences/${item.occurrence_id}/done`, { is_done: checked });
      item.is_done = checked;
    } catch (err) {
      item.is_done = !checked;
      error = err?.message || "Failed to update reminder.";
    }
  }

  async function removeThisMonth(item) {
    error = "";
    const ok = window.confirm(`Remove this month's reminder for \"${item.title}\"?`);
    if (!ok) return;

    try {
      await apiDelete(`/reminders/occurrences/${item.occurrence_id}`);
      await load();
    } catch (err) {
      error = err?.message || "Failed to remove this month reminder.";
    }
  }

  async function deleteRecurring(item) {
    error = "";
    const ok = window.confirm(
      `Delete recurring task \"${item.title}\" permanently? This removes all its reminders.`
    );
    if (!ok) return;

    try {
      await apiDelete(`/reminders/tasks/${item.task_id}`);
      await load();
    } catch (err) {
      error = err?.message || "Failed to delete recurring reminder.";
    }
  }

  onMount(load);
</script>

<h1 class="page-title">Reminders</h1>
<p class="page-subtitle">Create monthly task reminders, mark them done, or remove them.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="panel">
  <div class="toolbar">
    <label>
      Task:&nbsp;
      <input type="text" bind:value={title} placeholder="Electricity bill" />
    </label>
    <label>
      Due day:&nbsp;
      <input type="number" min="1" max="31" bind:value={dueDayOfMonth} />
    </label>
    <label>
      Notes:&nbsp;
      <input type="text" bind:value={notes} placeholder="Optional" />
    </label>
    <button class="button" on:click={createReminder}>Create</button>
    {#if saveStatus}
      <span class="meta">{saveStatus}</span>
    {/if}
  </div>
</div>

<div class="panel">
  <span class="meta">Current month: {month || "-"}</span>
</div>

{#if loading}
  <p class="meta">Loading...</p>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Done</th>
          <th>Task</th>
          <th>Due Date</th>
          <th>Notes</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if reminders.length === 0}
          <tr>
            <td colspan="5" class="meta">No reminders for current month.</td>
          </tr>
        {/if}

        {#each reminders as item}
          <tr>
            <td>
              <input
                type="checkbox"
                checked={item.is_done}
                on:change={(e) => toggleDone(item, e.currentTarget.checked)}
              />
            </td>
            <td>{item.title}</td>
            <td>{item.due_date}</td>
            <td>{item.notes || "--"}</td>
            <td>
              <div class="toolbar" style="margin-bottom: 0;">
                <button class="button" on:click={() => removeThisMonth(item)}>Remove This Month</button>
                <button class="button" on:click={() => deleteRecurring(item)}>Delete Recurring</button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
