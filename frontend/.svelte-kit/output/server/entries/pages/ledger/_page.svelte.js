import { c as create_ssr_component, g as escape, v as validate_component } from "../../../chunks/ssr.js";
import { t as toPeriodParam } from "../../../chunks/period.js";
import { f as formatInr } from "../../../chunks/format.js";
import { T as Table } from "../../../chunks/Table.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let period = "current_month";
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
  return `<h1 class="page-title" data-svelte-h="svelte-1u0p4b6">Ledger</h1> <p class="page-subtitle" data-svelte-h="svelte-3okzza">Trial balance and income statement summary.</p> ${``} <div class="toolbar"><label>Period: 
    <select><option value="current_month" data-svelte-h="svelte-ifagp3">Current Month</option><option value="ytd" data-svelte-h="svelte-ne2kh5">Year to Date</option><option value="all" data-svelte-h="svelte-421o1o">All</option><option value="custom" data-svelte-h="svelte-tc3t8p">Custom Range</option></select></label> ${``} <span class="meta">Net Income: ${escape("--")}</span></div> <div class="panel"><div class="panel-row"><span class="panel-label" data-svelte-h="svelte-19347y3">Trial Totals</span> <span class="panel-value">${escape("--")} / ${escape("--")}</span></div> <div class="panel-row"><span class="panel-label" data-svelte-h="svelte-utxhlq">Net Income</span> <span class="panel-value">${escape("--")}</span></div> <div class="panel-row"><span class="panel-label" data-svelte-h="svelte-u1fyl2">Income vs Expense</span> <span class="panel-value">${escape("--")} /${escape(" ")} ${escape("--")}</span></div></div> ${validate_component(Table, "Table").$$render(
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
