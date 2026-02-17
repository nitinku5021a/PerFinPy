<script>
  export let label = "";
  export let value = "--";
  export let trend = "";
  export let trendClass = "text-gray-400";
</script>

<div class="rounded-2xl bg-white p-6 shadow-lg">
  <div class="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</div>
  <div class="mt-3 text-3xl font-semibold text-gray-900 sm:text-4xl">{value}</div>
  {#if trend}
    <div class={`mt-2 text-sm font-semibold ${trendClass}`}>{trend}</div>
  {/if}
</div>
