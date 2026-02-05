<script>
  import "../app.css";
  import Sidebar from "$lib/components/Sidebar.svelte";
</script>

<div class="shell">
  <Sidebar />
  <div class="main">
    <main class="content">
      <slot />
    </main>
  </div>
</div>
