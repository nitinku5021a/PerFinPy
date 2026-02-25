<script>
  import "../app.css";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  
  let sidebarOpen = false;
  let reminderNotice = null;

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function startOfDay(value) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  function formatDate(dateStr) {
    const parsed = parseDate(dateStr);
    if (!parsed) return "";
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function formatDueLabel(days) {
    if (days === 0) return "due today";
    if (days === 1) return "due in 1 day";
    return `due in ${days} days`;
  }

  async function loadReminderNotice() {
    try {
      const payload = await apiGet("/reminders/monthly");
      const reminders = payload?.reminders || [];
      const today = startOfDay(new Date());
      const mapped = reminders
        .filter((item) => item?.due_date && !item?.is_done && item?.is_active !== false)
        .map((item) => {
          const dueDate = parseDate(item.due_date);
          if (!dueDate) return null;
          const diffDays = Math.round((startOfDay(dueDate) - today) / 86400000);
          return { ...item, dueDate, diffDays };
        })
        .filter((item) => item);

      const overdue = mapped
        .filter((item) => item.diffDays < 0)
        .sort((a, b) => a.dueDate - b.dueDate);

      const dueSoon = mapped
        .filter((item) => item.diffDays >= 0 && item.diffDays <= 5)
        .sort((a, b) => a.dueDate - b.dueDate);

      if (overdue.length > 0 || dueSoon.length > 0) {
        const next = overdue[0] || dueSoon[0];
        reminderNotice = {
          overdueCount: overdue.length,
          count: dueSoon.length,
          title: next.title,
          dueDate: next.due_date,
          diffDays: next.diffDays
        };
      } else {
        reminderNotice = null;
      }
    } catch (err) {
      reminderNotice = null;
    }
  }

  // Close sidebar on navigation (using mount for simple listener)
  onMount(() => {
    loadReminderNotice();
    const handleClick = (e) => {
      if (sidebarOpen && e.target.closest('a')) {
        sidebarOpen = false;
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  });
</script>

<div class="shell" class:sidebar-open={sidebarOpen}>
  <header class="mobile-header">
    <button class="menu-btn" on:click={toggleSidebar}>
       ☰
    </button>
    <div class="brand">PerFinPy</div>
    <div style="width: 24px;"></div> <!-- Spacer -->
  </header>

  <div class="sidebar-overlay" on:click={() => sidebarOpen = false}></div>
  
  <Sidebar />
  
  <div class="main">
    {#if reminderNotice}
      <div class="global-notice" class:global-notice--warn={reminderNotice.overdueCount > 0}>
        <div class="global-notice__text">
          <strong>Reminder:</strong>
          {#if reminderNotice.overdueCount > 0}
            {reminderNotice.overdueCount}
            {reminderNotice.overdueCount === 1 ? " task is" : " tasks are"} overdue.
          {/if}
          {#if reminderNotice.overdueCount > 0 && reminderNotice.count > 0}
            Also,
          {/if}
          {#if reminderNotice.count > 0}
            {reminderNotice.count}
            {reminderNotice.count === 1 ? " task is" : " tasks are"} due within 5 days.
          {/if}
          Next: "{reminderNotice.title}" {formatDate(reminderNotice.dueDate)} ({formatDueLabel(reminderNotice.diffDays)}).
        </div>
        <a class="global-notice__link" href="/reminders">View reminders</a>
      </div>
    {/if}
    <main class="content">
      <slot />
    </main>
  </div>
</div>
