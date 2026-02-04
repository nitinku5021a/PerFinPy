<script>
  export let groups = [];
  export let months = [];
  export let formatValue = (val) => val ?? "";
  export let networthByMonth = null;
  export let networthLabel = "NETWORTH";
</script>

<div class="matrix-wrap">
  <table class="matrix-table">
    <thead>
      <tr>
        <th class="sticky-col sticky-col-1">Account</th>
        {#each months as m}
          <th class="num">{m.label}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if networthByMonth}
        <tr class="networth-row">
          <td class="sticky-col sticky-col-1 networth-label">{networthLabel}</td>
          {#each months as m}
            <td class="num networth-value">{formatValue(networthByMonth[m.key])}</td>
          {/each}
        </tr>
      {/if}
      {#each groups as group, gi}
        <tr class="group-row">
          <td class="sticky-col sticky-col-1 group-indent">{group.group}</td>
          {#each months as m}
            <td class="num">{formatValue(group.monthly_balances?.[m.key])}</td>
          {/each}
        </tr>
        {#each group.parents as parent}
          <tr class={`parent-row ${gi % 2 === 0 ? "group-alt-a" : "group-alt-b"}`}>
            <td class="sticky-col sticky-col-1 parent-indent">{parent.name}</td>
            {#each months as m}
              <td class="num">{formatValue(parent.monthly_balances?.[m.key])}</td>
            {/each}
          </tr>
          {#each parent.accounts as acc}
            <tr class={gi % 2 === 0 ? "group-alt-a" : "group-alt-b"}>
              <td class="sticky-col sticky-col-1 account-indent">{acc.name}</td>
              {#each months as m}
                <td class="num">{formatValue(acc.monthly_balances?.[m.key])}</td>
              {/each}
            </tr>
          {/each}
        {/each}
      {/each}
    </tbody>
  </table>
</div>
