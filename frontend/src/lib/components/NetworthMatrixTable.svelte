<script>
  export let groups = [];
  export let months = [];
  export let formatValue = (val) => val ?? "";
  export let networthByMonth = null;
  export let networthLabel = "NETWORTH";
  export let drillMode = null; // "upto" or "month"

  function monthEnd(key) {
    const [y, m] = key.split("-");
    const end = new Date(Number(y), Number(m), 0);
    return end.toISOString().slice(0, 10);
  }

  function valueHref(accountId, monthKey) {
    if (!accountId || !drillMode) return null;
    if (drillMode === "month") {
      return `/journal-entries?account_id=${accountId}&mode=month&month=${monthKey}`;
    }
    if (drillMode === "upto") {
      return `/journal-entries?account_id=${accountId}&mode=upto&end=${monthEnd(monthKey)}`;
    }
    return null;
  }
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
            <td class="sticky-col sticky-col-1 parent-indent">
              {#if parent.account_id}
                <a class="drill-link" href={`/journal-entries?account_id=${parent.account_id}`}>{parent.name}</a>
              {:else}
                {parent.name}
              {/if}
            </td>
            {#each months as m}
              <td class="num">
                {#if valueHref(parent.account_id, m.key)}
                  <a class="drill-link" href={valueHref(parent.account_id, m.key)}>
                    {formatValue(parent.monthly_balances?.[m.key])}
                  </a>
                {:else}
                  {formatValue(parent.monthly_balances?.[m.key])}
                {/if}
              </td>
            {/each}
          </tr>
          {#each parent.accounts as acc}
            <tr class={gi % 2 === 0 ? "group-alt-a" : "group-alt-b"}>
              <td class="sticky-col sticky-col-1 account-indent">
                {#if acc.account_id}
                  <a class="drill-link" href={`/journal-entries?account_id=${acc.account_id}`}>{acc.name}</a>
                {:else}
                  {acc.name}
                {/if}
              </td>
              {#each months as m}
                <td class="num">
                  {#if valueHref(acc.account_id, m.key)}
                    <a class="drill-link" href={valueHref(acc.account_id, m.key)}>
                      {formatValue(acc.monthly_balances?.[m.key])}
                    </a>
                  {:else}
                    {formatValue(acc.monthly_balances?.[m.key])}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        {/each}
      {/each}
    </tbody>
  </table>
</div>
