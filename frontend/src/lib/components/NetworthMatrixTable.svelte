<script>
  export let groups = [];
  export let months = [];
  export let formatValue = (val) => val ?? "";
  export let networthByMonth = null;
  export let networthLabel = "NETWORTH";
  export let drillMode = null; // "upto" or "month"

  function monthEnd(key) {
    const [y, m] = key.split("-");
    const endDay = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
    const mm = String(Number(m)).padStart(2, "0");
    const dd = String(endDay).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
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

  function toNumber(val) {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  }

  function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function barColorForGroupName(name) {
    const palette = [
      "var(--bar-a)",
      "var(--bar-b)",
      "var(--bar-c)",
      "var(--bar-d)",
      "var(--bar-e)",
      "var(--bar-f)"
    ];
    const key = (name || "group").toLowerCase();
    return palette[hashString(key) % palette.length];
  }

  $: parentBarMax = groups.map((g) => {
    return (g.parents || []).map((p) => {
      const maxByMonth = {};
      for (const m of months) {
        let max = 0;
        for (const acc of p.accounts || []) {
          const val = Math.abs(toNumber(acc.monthly_balances?.[m.key] ?? 0));
          if (val > max) max = val;
        }
        maxByMonth[m.key] = max;
      }
      return maxByMonth;
    });
  });

  function barPercent(groupIndex, parentIndex, monthKey, value) {
    const max = parentBarMax?.[groupIndex]?.[parentIndex]?.[monthKey] || 0;
    if (!max) return 0;
    const pct = Math.abs(toNumber(value)) / max;
    return Math.min(50, Math.round(pct * 50));
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
        {#each group.parents as parent, pi}
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
          {#each parent.accounts as acc, ai}
            <tr class={gi % 2 === 0 ? "group-alt-a" : "group-alt-b"}>
              <td class="sticky-col sticky-col-1 account-indent">
                {#if acc.account_id}
                  <a class="drill-link" href={`/journal-entries?account_id=${acc.account_id}`}>{acc.name}</a>
                {:else}
                  {acc.name}
                {/if}
              </td>
              {#each months as m}
                <td class="num data-cell" style={`--bar-color: ${barColorForGroupName(parent.name)}`}>
                  <div class="data-bar" style={`width: ${barPercent(gi, pi, m.key, acc.monthly_balances?.[m.key])}%`}></div>
                  {#if valueHref(acc.account_id, m.key)}
                    <a class="drill-link cell-value" href={valueHref(acc.account_id, m.key)}>
                      {formatValue(acc.monthly_balances?.[m.key])}
                    </a>
                  {:else}
                    <span class="cell-value">{formatValue(acc.monthly_balances?.[m.key])}</span>
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
