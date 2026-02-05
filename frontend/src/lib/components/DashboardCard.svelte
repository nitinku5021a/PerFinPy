<script>
  export let title = "";
  export let iconBg = "bg-slate-100";
  export let iconColor = "text-slate-600";
  export let variant = "standard";
  export let valueClass = "text-4xl font-semibold text-gray-900 sm:text-5xl";
  export let bodyClass = "";
  export let sparklineClass = "h-20 w-52 sm:w-64";
</script>

<section class="rounded-2xl bg-white p-6 shadow-lg">
  {#if variant === "center"}
    <div class="flex items-start justify-between gap-4">
      <div class={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
        <slot name="icon" />
      </div>
      <div class="text-right">
        <div class="text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</div>
        <div class={`mt-2 ${valueClass}`}>
          <slot name="value" />
        </div>
        <div class={`mt-2 ${bodyClass}`}>
          <slot name="body" />
        </div>
      </div>
    </div>
    <div class={`mt-6 flex w-full justify-center ${sparklineClass}`}>
      <slot name="sparkline" />
    </div>
  {:else}
    <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-3">
        <div class="text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</div>
        <div class={valueClass}>
          <slot name="value" />
        </div>
        <div class={bodyClass}>
          <slot name="body" />
        </div>
      </div>
      <div class="flex flex-col items-end gap-4">
        <div class={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
          <slot name="icon" />
        </div>
        <div class={sparklineClass}>
          <slot name="sparkline" />
        </div>
      </div>
    </div>
  {/if}
</section>
