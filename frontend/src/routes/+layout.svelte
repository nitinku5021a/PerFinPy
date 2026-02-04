<script>
  import "../app.css";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import Header from "$lib/components/Header.svelte";
</script>

<div class="shell">
  <Sidebar />
  <div class="main">
    <Header />
    <main class="content">
      <slot />
    </main>
  </div>
</div>
