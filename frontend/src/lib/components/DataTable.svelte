<script>
  export let columns = [];
  export let rows = [];
  export let allowHtml = false;
</script>

<div class="card">
  <table class="table">
    <thead>
      <tr>
        {#each columns as col}
          <th>{col.header}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row, index}
        <tr>
          {#each columns as col}
            <td>
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
