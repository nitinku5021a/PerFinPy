import { c as create_ssr_component, f as escape, v as validate_component } from "../../../chunks/ssr.js";
import { T as Table } from "../../../chunks/Table.js";
import { t as toPeriodParam } from "../../../chunks/period.js";
import { f as formatInr } from "../../../chunks/format.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let period = "all";
  const columns = [
    {
      header: "Account",
      render: (row) => `<a href="/journal-entries?account_id=${row.account.id}&period=${toPeriodParam(period)}">${row.account.path || row.account.name}</a>`
    },
    {
      header: "Type",
      render: (row) => row.account.account_type
    },
    {
      header: "Debit/Credit",
      render: (row) => row.type
    },
    {
      header: "Balance",
      render: (row) => formatInr(row.balance),
      align: "right"
    }
  ];
  return `<h1 class="page-title" data-svelte-h="svelte-1xfrag7">Trial Balance</h1> <p class="page-subtitle" data-svelte-h="svelte-1o6fnm7">Ledger validation view showing debits and credits.</p> ${``} <div class="toolbar"><label>Period: 
    <select><option value="all" data-svelte-h="svelte-421o1o">All</option><option value="ytd" data-svelte-h="svelte-ne2kh5">Year to Date</option><option value="current_month" data-svelte-h="svelte-ifagp3">Current Month</option><option value="custom" data-svelte-h="svelte-tc3t8p">Custom Range</option></select></label> ${``} <span class="meta">Debits: ${escape("--")} | Credits:${escape(" ")} ${escape("--")}</span></div> <div class="panel"><div class="panel-row"><span class="panel-label" data-svelte-h="svelte-1wurc9c">Balance Check</span> <span class="panel-value">${escape("--")}</span></div> <div class="panel-row" data-svelte-h="svelte-1y88rlm"><span class="panel-label">Note</span> <span class="panel-value">Click an account to see journal entries.</span></div></div> ${validate_component(Table, "Table").$$render(
    $$result,
    {
      columns,
      rows: [],
      allowHtml: true
    },
    {},
    {}
  )}`;
});
export {
  Page as default
};
