<script>
  import "../app.css";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { onMount } from "svelte";
  
  let sidebarOpen = false;

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  // Close sidebar on navigation (using mount for simple listener)
  onMount(() => {
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
    <main class="content">
      <slot />
    </main>
  </div>
</div>
