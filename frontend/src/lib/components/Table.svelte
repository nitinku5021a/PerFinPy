<script>
  export let columns = [];
  export let rows = [];
  export let allowHtml = false;
  export let rowClass = null;
</script>

<div class="table-wrap">
  <table class="table">
    <thead>
      <tr>
        {#each columns as col}
          <th class={col.align === "right" || col.numeric ? "num" : ""}>
            {col.header}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row, index}
        <tr class={rowClass ? rowClass(row, index) : ""}>
          {#each columns as col}
            <td class={col.align === "right" || col.numeric ? "num" : ""}>
              {#if allowHtml}
                {@html col.render(row, index)}
              {:else}
                {col.render(row, index)}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
