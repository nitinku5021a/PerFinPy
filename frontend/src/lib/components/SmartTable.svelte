<script>
  /** @type {{ header: string, align?: string, render: (row: any) => string }[]} */
  export let columns = [];
  /** @type {any[]} */
  export let rows = [];
  export let title = "";
</script>

<section class="space-y-3">
  {#if title}
    <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
  {/if}
  <div class="overflow-x-auto rounded-2xl bg-white shadow-lg">
    <table class="min-w-full border-separate border-spacing-0">
      <thead class="bg-gray-50">
        <tr>
          {#each columns as col}
            <th
              class={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-500 ${
                col.align === "right" ? "text-right" : ""
              }`}
            >
              {col.header}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#if rows.length === 0}
          <tr>
            <td class="px-4 py-6 text-sm text-gray-400" colspan={columns.length}>No data</td>
          </tr>
        {:else}
          {#each rows as row, idx}
            <tr class={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
              {#each columns as col}
                <td
                  class={`px-4 py-3 text-sm text-gray-700 ${
                    col.align === "right" ? "text-right font-variant-numeric" : ""
                  }`}
                >
                  {@html col.render(row)}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</section>
